/**
 * VoiceCoach V2 - Session Manager Service
 * Manages coaching session state and WebSocket integration
 * LED Range: 6300-6399
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { VoiceCoachWebSocketClient, TranscriptEvent, CoachingSuggestion } from '../websocket/websocket-client';
import { DualVolumeMonitoringService } from '../audio/DualVolumeMonitoringService';
// Temporarily disabled - ChromaDBService not needed since we use WebSocket-based ChromaDB
// import { ChromaDBService } from '../knowledge/ChromaDBService';
import { getSelectedModel } from '../../lib/model-utils';
import { 
  SessionState, 
  CoachingPrompt, 
  TranscriptionItem, 
  VolumeState 
} from '../../types/coaching';
// Simple file-based Ollama instruction loader (browser version for Electron)
import { ollamaInstructionLoader } from './OllamaInstructionLoader-Browser';
import { LiveCoachingManager } from './live-coaching-manager';

// Conversation analyzers for rich context detection
import { conversationAnalyzer } from './analyzers/ConversationAnalyzer';
import { SemanticSearchResult } from '../../types/chromadb';

export class SessionManagerService {
  private trail: BreadcrumbTrail;
  private wsClient: VoiceCoachWebSocketClient;
  private volumeService: DualVolumeMonitoringService;
  // private chromaDBService: ChromaDBService; // Disabled - using WebSocket-based ChromaDB
  private sessionState: SessionState;
  private stateCallback?: (state: SessionState) => void;
  private sessionTimer: NodeJS.Timeout | null = null;
  private ragDocument: any = null;
  private liveCoachingManager: LiveCoachingManager | null = null;
  private useSemanticSearch: boolean = false; // Disabled - ChromaDB not initialized
  private lastSearchResults: SemanticSearchResult[] = []; // Store results for priority mapping
  private callStartTime: Date | null = null; // Track call start for enhanced Ollama
  private conversationHistory: Array<{ speaker: 'user' | 'prospect'; text: string; timestamp: string }> = [];
  private transcriptIdCounter = 0; // Unique ID counter to prevent duplicate keys

  constructor() {
    console.log('🚀 SessionManagerService: Constructor starting...');
    this.trail = new BreadcrumbTrail('SessionManagerService');
    
    // Initialize services
    this.wsClient = new VoiceCoachWebSocketClient('ws://127.0.0.1:5000');
    this.volumeService = new DualVolumeMonitoringService();
    // Temporarily disabled - ChromaDBService not needed since we use WebSocket-based ChromaDB
    // this.chromaDBService = new ChromaDBService('universal_neversplit');
    
    // Initialize live coaching manager
    this.liveCoachingManager = new LiveCoachingManager();
    
    // Initialize session state
    this.sessionState = this.createInitialState();
    
    // LED 6300: Session manager initialization with Ollama
    this.trail.light(6300, {
      operation: 'session_manager_initialization',
      ollama_integration: true,
      timestamp: Date.now()
    });
    console.log('🎵 LED 6300: SessionManagerService initialized');

    this.setupWebSocketHandlers();
    this.setupVolumeHandler();
    
    // Initialize Ollama after a brief delay to ensure app is ready
    setTimeout(() => {
      console.log('🕒 Starting Ollama initialization...');
      this.initializeOllama();
    }, 1000);
    
    // Pre-warm ChromaDB if enabled (reduce startup delay)
    setTimeout(() => {
      this.preInitializeChromaDB();
    }, 2000);
    
    console.log('✅ SessionManagerService: Constructor complete');
  }

  /**
   * Pre-initialize ChromaDB in background to reduce startup delay
   */
  private async preInitializeChromaDB(): Promise<void> {
    try {
      // Check if ChromaDB is enabled
      const chromaDBEnabled = localStorage.getItem('voicecoach-chromadb-enabled') === 'true';
      
      if (!chromaDBEnabled) {
        console.log('⏭️ ChromaDB disabled, skipping pre-initialization');
        return;
      }
      
      console.log('🚀 Pre-warming ChromaDB engine...');
      
      // LED 6307: ChromaDB pre-initialization
      this.trail.light(6307, {
        operation: 'chromadb_pre_init_start',
        timestamp: Date.now()
      });
      
      // Start ChromaDB server in background
      if ((window as any).electronAPI?.chromadbStartServer) {
        const serverResult = await (window as any).electronAPI.chromadbStartServer();
        console.log('✅ ChromaDB server pre-started:', serverResult.success ? 'Success' : 'Failed');
        
        if (serverResult.success) {
          // Initialize connection
          if ((window as any).electronAPI?.chromadbInitialize) {
            const initResult = await (window as any).electronAPI.chromadbInitialize();
            console.log('✅ ChromaDB connection pre-established:', initResult.success ? 'Success' : 'Failed');
          }
          
          // Pre-load the most recent RAG document if available
          const lastUsedDoc = localStorage.getItem('voicecoach-last-used-document');
          if (lastUsedDoc) {
            const ragDir = 'D:\\Projects\\Ai\\VoiceCoach-v2\\rag';
            const docPath = `${ragDir}\\${lastUsedDoc}`;
            
            if ((window as any).electronAPI?.chromadbLoadDocument) {
              try {
                const loadResult = await (window as any).electronAPI.chromadbLoadDocument(docPath);
                console.log('✅ ChromaDB document pre-loaded:', docPath);
                
                this.trail.light(6308, {
                  operation: 'chromadb_pre_init_complete',
                  document_loaded: true,
                  timestamp: Date.now()
                });
              } catch (error) {
                console.log('⚠️ Could not pre-load document, will load on session start');
              }
            }
          }
        }
      }
      
      console.log('🎯 ChromaDB pre-warming complete - ready for instant start!');
      
    } catch (error) {
      // Silent fail - this is just optimization, not critical
      console.log('⚠️ ChromaDB pre-init failed (non-critical):', error);
      this.trail.light(6309, {
        operation: 'chromadb_pre_init_failed_non_critical',
        error: (error as Error).message
      });
    }
  }

  /**
   * Initialize Ollama integration (simplified approach from working version)
   */
  private async initializeOllama(): Promise<void> {
    // LED 6301: Ollama initialization start
    this.trail.light(6301, {
      operation: 'ollama_initialization_start',
      desktop_native: true,
      timestamp: Date.now()
    });
    console.log('🎵 LED 6301: Ollama initialization starting');

    this.updateSessionState({
      ollamaStatus: 'Initializing...'
    });

    try {
      console.log('🔍 Checking Ollama models from app startup cache...');
      
      // LED 6302: Checking cached models  
      this.trail.light(6302, {
        operation: 'ollama_cache_check',
        method: 'localStorage',
        timestamp: Date.now()
      });
      
      // Check if models were loaded at app startup and cached
      const cachedModels = localStorage.getItem('voicecoach-ollama-models');
      const hasModels = cachedModels && JSON.parse(cachedModels).length > 0;
      
      // LED 6303: Cache check result
      this.trail.light(6303, {
        operation: 'ollama_cache_result',
        success: hasModels,
        modelCount: hasModels ? JSON.parse(cachedModels!).length : 0,
        timestamp: Date.now()
      });
      
      if (hasModels) {
        console.log('✅ Ollama models available from startup cache, loading document...');
        
        // LED 6304: Document loading start
        this.trail.light(6304, {
          operation: 'rag_document_loading_start',
          document: 'NeverSplit',
          timestamp: Date.now()
        });
        
        // Skip auto-loading - documents will be selected manually in Split View
        // const documentLoaded = await this.loadRagDocument('NeverSplit');
        
        // Skip ChromaDB when turned off
        // const chromaDBReady = await this.initializeChromaDB();
        
        // Simple ready status - documents loaded from Split View
        let status = 'Ready (Llama 3.1 8B)';
        // this.useSemanticSearch = false; // Disabled when ChromaDB is off
        
        this.updateSessionState({
          ollamaStatus: status
        });

        // LED 6305: Initialization complete success
        this.trail.light(6305, {
          operation: 'ollama_initialization_success',
          document_loaded: false, // Documents will be loaded from Split View
          final_status: 'Ready',
          timestamp: Date.now()
        });
        console.log('🎵 LED 6305: Ollama initialization completed successfully');

        console.log('✅ Ollama models loaded successfully from cache');
        
        // Initialize LiveCoachingManager
        if (this.liveCoachingManager) {
          const liveCoachingInitialized = await this.liveCoachingManager.initialize();
          if (liveCoachingInitialized) {
            console.log('✅ LiveCoachingManager initialized successfully');
          } else {
            console.warn('⚠️ LiveCoachingManager initialization failed - coaching may not work');
          }
        }
      } else {
        throw new Error('No Ollama models found in cache - models should be loaded at app startup');
      }
    } catch (error) {
      console.error('❌ Full Ollama error details:', error);
      
      // LED 8301: Ollama initialization failure
      this.trail.fail(8301, error as Error);
      console.log('🚨 LED 8301: Ollama initialization failed -', error);
      
      this.updateSessionState({
        ollamaStatus: 'Disconnected'
      });
      console.error('❌ Ollama initialization failed:', error);
    }
  }

  /**
   * Load selected documents for coaching
   */
  private async loadSelectedDocuments(documentPaths: string[]): Promise<boolean> {
    try {
      this.trail.light(6319, {
        operation: 'loading_selected_documents',
        count: documentPaths.length,
        documents: documentPaths
      });

      const electronAPI = (window as any).electronAPI;
      if (!electronAPI) {
        throw new Error('Electron API not available');
      }

      // Load the first selected document (can be enhanced to merge multiple)
      if (documentPaths.length > 0) {
        const docPath = documentPaths[0];
        console.log(`📖 Loading document: ${docPath}`);
        
        // Read the document file
        const response = await electronAPI.readFile(`rag/${docPath}`);
        if (response && response.content) {
          const documentContent = JSON.parse(response.content);
          
          // Store the loaded document
          this.ragDocument = documentContent;
          
          // Pass to live coaching manager - use document directly, no phases
          if (this.liveCoachingManager) {
            const processedDoc = {
              name: docPath,
              originalContent: JSON.stringify(documentContent),
              documentContent: documentContent, // Direct document content
              techniques: documentContent.techniques || [],
              response_patterns: documentContent.response_patterns || {},
              loadedTimestamp: new Date().toISOString()
            };
            
            const loaded = this.liveCoachingManager.loadDocument(processedDoc);
            if (loaded) {
              console.log('✅ Document loaded into live coaching manager');
              console.log('📄 Document has', documentContent.techniques?.length || 0, 'techniques');
              
              // Load document into ChromaDB if enabled
              const chromaDBEnabled = localStorage.getItem('voicecoach-chromadb-enabled') === 'true';
              if (chromaDBEnabled) {
                console.log('🔍 Loading document into ChromaDB for semantic search...');
                try {
                  const chromaResult = await electronAPI.chromadbLoadDocument(`rag/${docPath}`);
                  if (chromaResult.success) {
                    console.log('✅ ChromaDB document loaded successfully:', chromaResult.message);
                    this.trail.light(7304, {
                      operation: 'chromadb_document_load_success',
                      document: docPath,
                      techniques_count: chromaResult.techniquesCount || 0
                    });
                  } else {
                    console.warn('⚠️ ChromaDB document load failed:', chromaResult.error);
                  }
                } catch (error) {
                  console.warn('⚠️ ChromaDB document load error:', error);
                }
              }
            }
          }
          
          this.trail.light(6320, {
            operation: 'document_loaded_successfully',
            document: docPath,
            has_techniques: !!documentContent.techniques,
            has_patterns: !!documentContent.response_patterns
          });
          
          console.log('✅ Document loaded successfully');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.trail.fail(8321, error as Error);
      console.error('❌ Failed to load selected documents:', error);
      return false;
    }
  }

  /**
   * Load RAG document for coaching (direct document loading without phases)
   */
  private async loadRagDocument(documentName: string): Promise<boolean> {
    try {
      this.trail.light(6320, {
        operation: 'rag_document_loading_start',
        document_name: documentName,
        timestamp: Date.now()
      });

      const electronAPI = (window as any).electronAPI;
      if (!electronAPI) {
        throw new Error('Electron API not available');
      }

      // Load the document directly (no phases)
      const documentResponse = await electronAPI.loadRagDocument(`${documentName}.json`);
      if (!documentResponse.success) {
        throw new Error(`Document file not found: ${documentResponse.error}`);
      }

      this.ragDocument = JSON.parse(documentResponse.content);

      this.trail.light(6321, {
        operation: 'rag_document_loaded_successfully',
        document_name: documentName,
        techniques_count: this.ragDocument?.techniques?.length || 0,
        has_conversation_paths: !!this.ragDocument?.techniques?.[0]?.conversation_paths
      });

      return true;
    } catch (error) {
      this.trail.fail(8320, error as Error);
      console.error('❌ Failed to load RAG document:', error);
      return false;
    }
  }

  /**
   * Initialize ChromaDB for semantic search
   * @deprecated - Using WebSocket-based ChromaDB instead
   */
  private async initializeChromaDB(): Promise<boolean> {
    // Temporarily disabled - ChromaDBService not needed since we use WebSocket-based ChromaDB
    return false;
    
    /* Original implementation commented out
    try {
      // LED 6350: ChromaDB initialization start
      this.trail.light(6350, {
        operation: 'chromadb_integration_start',
        collection: 'universal_neversplit',
        timestamp: Date.now()
      });

      // Initialize ChromaDB service
      const initialized = await this.chromaDBService.initialize();
      if (!initialized) {
        throw new Error('ChromaDB service initialization failed');
      }

      // Import NeverSplit processed document
      const imported = await this.chromaDBService.importDocument('NeverSplit_ChromaDB_Processed.json');
      
      // LED 6351: ChromaDB setup complete
      this.trail.light(6351, {
        operation: 'chromadb_integration_success',
        initialized,
        document_imported: imported,
        semantic_search_ready: initialized && imported,
        timestamp: Date.now()
      });

      console.log(`✅ ChromaDB: ${initialized ? 'Initialized' : 'Failed'}, Document: ${imported ? 'Imported' : 'Failed'}`);
      return initialized && imported;

    } catch (error) {
      // LED 8350: ChromaDB initialization failure  
      this.trail.fail(8350, error as Error);
      console.error('❌ ChromaDB initialization failed:', error);
      return false;
    }
    */
  }

  /**
   * Generate Ollama coaching suggestion (using file-based instructions)
   */
  private async generateOllamaCoaching(transcriptionText: string): Promise<void> {
    if (transcriptionText.length < 50) {
      return; // Skip short transcripts
    }

    // Check if we have any knowledge source available
    if (!this.useSemanticSearch && !this.ragDocument) {
      return; // Skip if no knowledge available
    }

    try {
      const selectedModel = getSelectedModel();
      
      this.trail.light(6330, {
        operation: 'ollama_coaching_generation_start',
        transcript_length: transcriptionText.length,
        model: selectedModel,
        knowledge_source: this.useSemanticSearch ? 'chromadb_semantic' : 'rag_document',
        uses_file_instructions: true,
        timestamp: Date.now()
      });

      const prompt = await this.buildCoachingPrompt(transcriptionText);
      
      // Use desktop-native IPC call for Ollama generation
      const result = await (window as any).electronAPI.ollamaGenerate({
        prompt: prompt,
        model: selectedModel
      });

      if (!result.success) {
        throw new Error(`Ollama generation failed: ${result.error}`);
      }

      const suggestion = result.response?.trim();

      if (suggestion && suggestion.length > 10) {
        // Try to parse as JSON first (if instructions return JSON)
        let coachingData: any = null;
        try {
          coachingData = JSON.parse(suggestion);
        } catch {
          // If not JSON, treat as plain text suggestion
          coachingData = { suggestion: suggestion };
        }
        
        // Extract priority from response or ChromaDB
        let promptPriority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        if (coachingData.priority) {
          promptPriority = coachingData.priority.toLowerCase() as any;
        } else if (this.useSemanticSearch && this.lastSearchResults && this.lastSearchResults.length > 0) {
          const topResult = this.lastSearchResults[0];
          promptPriority = topResult.priority === 'CRITICAL' ? 'critical' :
                          topResult.priority === 'HIGH' ? 'high' : 'medium';
        }

        const newPrompt: CoachingPrompt = {
          id: Date.now() * 1000 + this.transcriptIdCounter++, // Ensure unique ID
          priority: promptPriority,
          text: coachingData.suggestion || suggestion,
          category: coachingData.category || 'real_time_coaching',
          trigger: 'transcript_analysis',
          context: transcriptionText.slice(-200), // Last 200 chars for context
          timestamp: Date.now()
        };
        
        this.updateSessionState({
          coachingPrompts: [...this.sessionState.coachingPrompts, newPrompt],
          sessionData: {
            ...this.sessionState.sessionData,
            prompts: this.sessionState.sessionData.prompts + 1
          }
        });

        this.trail.light(6331, {
          operation: 'ollama_coaching_suggestion_generated',
          suggestion_length: suggestion.length,
          timestamp: Date.now()
        });

        console.log('🤖 Ollama Coaching:', suggestion);
      }
    } catch (error) {
      this.trail.fail(8330, error as Error);
      console.error('❌ Ollama coaching generation failed:', error);
    }
  }

  /**
   * Build coaching prompt with ChromaDB semantic search or RAG context
   */
  private async buildCoachingPrompt(transcriptionText: string): Promise<string> {
    let knowledgeContext = '';

    // ChromaDB disabled - using direct document knowledge
    if (false) { // this.useSemanticSearch && this.chromaDBService && this.chromaDBService.isReady()
      // LED 6360: Semantic search for relevant coaching content
      this.trail.light(6360, {
        operation: 'semantic_search_for_coaching',
        transcript_preview: transcriptionText.substring(0, 50),
        search_method: 'chromadb',
        timestamp: Date.now()
      });

      try {
        const searchResults: any[] = []; // await this.chromaDBService.semanticSearch(transcriptionText, 3);
        
        // Store results for priority mapping
        this.lastSearchResults = searchResults;
        
        // LED 6361: Search results obtained
        this.trail.light(6361, {
          operation: 'semantic_search_results',
          results_count: searchResults.length,
          top_similarity: searchResults[0]?.similarity_score || 0,
          content_types: searchResults.map(r => r.content_type),
          priorities: searchResults.map(r => r.priority),
          timestamp: Date.now()
        });

        // Format search results for prompt
        knowledgeContext = searchResults.map(result => 
          `${result.content_type.toUpperCase()}: ${result.content}`
        ).join('\n');

        console.log(`🔍 ChromaDB: Found ${searchResults.length} relevant coaching techniques with priorities: ${searchResults.map(r => r.priority).join(', ')}`);

      } catch (error) {
        // LED 8360: Semantic search failure, fallback to RAG
        this.trail.fail(8360, error as Error);
        console.warn('⚠️ ChromaDB search failed, falling back to RAG document');
        
        // Fallback to traditional RAG
        knowledgeContext = this.ragDocument ? JSON.stringify({
          techniques: this.ragDocument.high_impact_techniques?.slice(0, 3) || [],
          objections: this.ragDocument.objection_handlers?.slice(0, 2) || []
        }) : '';
      }
    } else {
      // Use traditional RAG document approach
      knowledgeContext = this.ragDocument ? JSON.stringify({
        techniques: this.ragDocument.high_impact_techniques?.slice(0, 5) || [],
        objections: this.ragDocument.objection_handlers?.slice(0, 3) || [],
        frameworks: this.ragDocument.frameworks?.slice(0, 3) || []
      }) : '';
    }

    // Run conversation analysis for rich context
    const analysis = conversationAnalyzer.analyze(transcriptionText, false);
    
    // Use the file-based instruction loader with rich context
    const prompt = ollamaInstructionLoader.buildPrompt({
      transcript: transcriptionText,
      knowledge: knowledgeContext,
      salesStage: analysis.salesStage, // Now using advanced detection
      callDuration: this.callStartTime ? 
        Math.round((Date.now() - this.callStartTime.getTime()) / 1000 / 60) : 0,
      objections: analysis.objections.map(o => o.type), // Rich objection detection
      topics: undefined, // Could extract from conversation
      sentiment: analysis.momentum // Using momentum as sentiment proxy
    });
    
    return prompt;
  }

  /**
   * Start coaching session
   */
  async startSession(captureMode: 'microphone' | 'full-conversation' = 'microphone', selectedDocuments: string[] = []): Promise<boolean> {
    console.log('🚀 STARTING SESSION WITH:', {
      captureMode,
      selectedDocuments,
      liveCoachingManager: !!this.liveCoachingManager,
      webSocketClient: !!this.wsClient
    });
    
    const sessionStartTime = Date.now();
    this.callStartTime = new Date(); // Track for call duration
    
    // Reset analyzers for new session
    conversationAnalyzer.reset();
    
    // Store capture mode in state
    this.updateSessionState({ captureMode });
    
    // Load selected documents if provided
    if (selectedDocuments && selectedDocuments.length > 0) {
      console.log('📄 Loading selected documents:', selectedDocuments);
      await this.loadSelectedDocuments(selectedDocuments);
      
      // Save the last used document for pre-loading next time
      if (selectedDocuments[0]) {
        // Try to find the actual RAG file for this document
        const ragFiles = ['NeverSplit_Predictive_2025-01-03_12-30-00.json']; // In production, would list directory
        const matchingFile = ragFiles.find(f => f.toLowerCase().includes(selectedDocuments[0].toLowerCase()));
        if (matchingFile) {
          localStorage.setItem('voicecoach-last-used-document', matchingFile);
          console.log('💾 Saved last used document for pre-loading:', matchingFile);
        }
      }
      
      // Initialize ChromaDB if enabled
      const chromaDBEnabled = localStorage.getItem('voicecoach-chromadb-enabled') === 'true';
      if (chromaDBEnabled) {
        console.log('🔍 ChromaDB enabled, checking if already initialized...');
        
        try {
          // Check if ChromaDB is already running (pre-warmed)
          let pingResult = false;
          if ((window as any).electronAPI?.chromadbPing) {
            pingResult = await (window as any).electronAPI.chromadbPing();
          }
          
          // pingResult can be: false, 'server-only', or true
          if (pingResult === true) {
            console.log('⚡ ChromaDB already pre-warmed and fully connected!');
          } else if (pingResult === 'server-only') {
            console.log('🚀 ChromaDB server running, establishing connection...');
            // Initialize ChromaDB connection since server is running
            if ((window as any).electronAPI?.chromadbInitialize) {
              const initResult = await (window as any).electronAPI.chromadbInitialize();
              console.log('🔗 ChromaDB initialization result:', initResult);
            }
          } else {
            // Start ChromaDB server
            if ((window as any).electronAPI?.chromadbStartServer) {
              const serverResult = await (window as any).electronAPI.chromadbStartServer();
              console.log('🎯 ChromaDB server start result:', serverResult);
            }
            
            // Initialize ChromaDB connection
            if ((window as any).electronAPI?.chromadbInitialize) {
              const initResult = await (window as any).electronAPI.chromadbInitialize();
              console.log('🔗 ChromaDB initialization result:', initResult);
            }
          }
          
          // Load the first selected document into ChromaDB
          if (selectedDocuments[0]) {
            const docPath = `D:\\Projects\\Ai\\VoiceCoach-v2\\rag\\${selectedDocuments[0]}_Predictive_*.json`;
            // Find the actual file path
            const ragDir = 'D:\\Projects\\Ai\\VoiceCoach-v2\\rag';
            if ((window as any).electronAPI?.chromadbLoadDocument) {
              // For now, use a hardcoded path - in production, we'd find the actual file
              const actualPath = `${ragDir}\\NeverSplit_Predictive_2025-01-03_12-30-00.json`;
              const loadResult = await (window as any).electronAPI.chromadbLoadDocument(actualPath);
              console.log('📚 ChromaDB document load result:', loadResult);
            }
          }
          
          this.trail.light(6306, {
            operation: 'chromadb_initialized_and_loaded',
            documents: selectedDocuments,
            timestamp: Date.now()
          });
          
        } catch (error) {
          console.error('❌ ChromaDB initialization failed:', error);
          this.trail.fail(8306, error as Error);
          // Continue without ChromaDB - fall back to keyword search
        }
      }
    }
    
    // LED 6301: Session start initiation
    this.trail.light(6301, {
      operation: 'session_start_initiation',
      captureMode: captureMode,
      timestamp: sessionStartTime
    });

    try {
      // Update status
      this.updateSessionState({
        wsStatus: 'Checking microphone permissions...'
      });

      // Check microphone permissions
      if ((window as any).electronAPI?.requestMicrophoneAccess) {
        const permissionResult = await (window as any).electronAPI.requestMicrophoneAccess();
        if (!permissionResult.success) {
          throw new Error(`Microphone permission denied: ${permissionResult.error}`);
        }
      }

      // Check audio devices
      this.updateSessionState({
        wsStatus: 'Validating audio devices...'
      });

      if ((window as any).electronAPI?.checkAudioDevices) {
        const audioCheckResult = await (window as any).electronAPI.checkAudioDevices();
        if (!audioCheckResult.success) {
          throw new Error(`Audio device check failed: ${audioCheckResult.error}`);
        }
      }

      // Start WebSocket server through Electron IPC
      this.updateSessionState({
        wsStatus: 'Connecting...'
      });

      // Load Vosk config from localStorage and pass to server
      console.log('🎵 LED 7303: VOSK_CONFIG - Loading config from localStorage');
      const voskConfigStr = localStorage.getItem('voicecoach-vosk-config');
      const voskConfig = voskConfigStr ? JSON.parse(voskConfigStr) : null;
      
      // Load general settings (including otherPartyGain)
      const generalSettingsStr = localStorage.getItem('voicecoach-settings');
      const generalSettings = generalSettingsStr ? JSON.parse(generalSettingsStr) : null;
      
      // Merge otherPartyGain from general settings into Vosk config
      if (voskConfig && generalSettings?.otherPartyGain !== undefined) {
        if (!voskConfig.audio) {
          voskConfig.audio = {};
        }
        voskConfig.audio.otherPartyGain = generalSettings.otherPartyGain;
        console.log('🎵 LED 7306: VOSK_CONFIG - Merged otherPartyGain:', generalSettings.otherPartyGain);
      }
      
      if (voskConfig) {
        console.log('🎵 LED 7304: VOSK_CONFIG - Config loaded successfully', {
          mode: voskConfig?.transcription?.mode,
          enablePartials: voskConfig?.transcription?.enablePartials,
          enableWordTimings: voskConfig?.transcription?.enableWordTimings,
          debounceMs: voskConfig?.performance?.debounceMs,
          enableRecognizerReset: voskConfig?.performance?.enableRecognizerReset,
          recognizerResetInterval: voskConfig?.performance?.recognizerResetInterval,
          chunkSize: voskConfig?.audio?.chunkSize,
          sampleRate: voskConfig?.audio?.sampleRate,
          otherPartyGain: voskConfig?.audio?.otherPartyGain
        });
      } else {
        console.log('🎵 LED 7305: VOSK_CONFIG - No saved config found, using defaults');
      }

      const serverResult = await (window as any).electronAPI?.startTranscription(voskConfig);
      if (!serverResult?.success) {
        throw new Error(`Server startup failed: ${serverResult?.error || 'Unknown server error'}`);
      }

      // Wait for server to be fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Connect WebSocket client
      await this.wsClient.connect();
      
      // Start transcription with capture mode
      if (await this.wsClient.startTranscription(captureMode)) {
        // Start live coaching if available
        if (this.liveCoachingManager) {
          const coachingStarted = await this.liveCoachingManager.startLiveCoaching();
          if (coachingStarted) {
            console.log('✅ Live coaching started successfully');
          } else {
            console.warn('⚠️ Live coaching failed to start');
          }
        }
        
        // Start session timer
        this.startSessionTimer();
        
        // Update session state
        this.updateSessionState({
          isRecording: true,
          sessionData: {
            ...this.sessionState.sessionData,
            duration: 0,
            prompts: 0
          }
        });

        const totalStartupTime = Date.now() - sessionStartTime;
        
        // LED 6302: Session start success
        this.trail.lightWithVerification(6302, 
          { 
            operation: 'session_start_success',
            totalStartupTime,
            timestamp: Date.now()
          },
          {
            expect: 'fast_startup',
            actual: totalStartupTime < 5000 ? 'fast_startup' : 'slow_startup'
          }
        );

        return true;
      } else {
        throw new Error('Failed to start WebSocket transcription');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // LED 8300: Session start failure
      this.trail.fail(8300, error as Error);
      
      this.updateSessionState({
        wsStatus: `Error: ${errorMessage}`
      });
      
      return false;
    }
  }

  /**
   * Stop coaching session
   */
  async stopSession(): Promise<boolean> {
    // LED 6303: Session stop initiation
    this.trail.light(6303, {
      operation: 'session_stop_initiation',
      sessionDuration: this.sessionState.sessionData.duration,
      timestamp: Date.now()
    });

    try {
      // Stop session timer
      this.stopSessionTimer();
      
      // Stop live coaching if active
      if (this.liveCoachingManager) {
        await this.liveCoachingManager.stopLiveCoaching();
        console.log('🛑 Live coaching stopped');
      }
      
      // Stop volume monitoring
      this.volumeService.stopMonitoring();
      
      // Stop WebSocket transcription
      this.wsClient.stopTranscription();
      
      // Give server time to process stop command
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Disconnect WebSocket
      this.wsClient.disconnect();
      
      // Stop Python server through Electron IPC
      try {
        const stopResult = await (window as any).electronAPI?.stopTranscription();
        if (!stopResult?.success) {
          console.warn('⚠️ Python server stop returned error:', stopResult?.error);
        }
      } catch (serverError) {
        console.warn('⚠️ Failed to stop Python server:', serverError);
      }

      // Reset session state (PRESERVE transcriptions and coaching prompts for review)
      this.updateSessionState({
        isRecording: false,
        wsStatus: 'Disconnected',
        liveTranscript: '', // Clear only the live/partial transcript
        sessionData: {
          ...this.sessionState.sessionData,
          duration: 0, // Reset timer for next session
          // KEEP prompts: this.sessionState.sessionData.prompts, // Preserve for review
          // KEEP transcriptions: this.sessionState.transcriptions, // Preserve for review
          stage: 'Session Complete' // Update stage to show completion
        }
      });

      // LED 6304: Session stop success
      this.trail.light(6304, {
        operation: 'session_stop_success',
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      // LED 8301: Session stop failure
      this.trail.fail(8301, error as Error);
      
      // Force cleanup
      this.forceCleanup();
      
      return false;
    }
  }

  /**
   * Get current session state
   */
  getState(): SessionState {
    return { ...this.sessionState };
  }

  /**
   * Clear transcription history (manual user action)
   */
  clearTranscriptions(): void {
    // LED 6306: Manual transcription clear
    this.trail.light(6306, {
      operation: 'manual_transcription_clear',
      transcriptionsCleared: this.sessionState.transcriptions.length,
      timestamp: Date.now()
    });

    this.updateSessionState({
      transcriptions: [],
      liveTranscript: ''
    });
  }

  /**
   * Clear coaching prompts history (manual user action)
   */
  clearCoachingPrompts(): void {
    // LED 6307: Manual coaching prompts clear
    this.trail.light(6307, {
      operation: 'manual_coaching_prompts_clear',
      promptsCleared: this.sessionState.coachingPrompts.length,
      timestamp: Date.now()
    });

    this.updateSessionState({
      coachingPrompts: [],
      sessionData: {
        ...this.sessionState.sessionData,
        prompts: 0
      }
    });
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: SessionState) => void): void {
    this.stateCallback = callback;
  }

  /**
   * Get WebSocket client for direct access
   */
  getWebSocketClient(): VoiceCoachWebSocketClient {
    return this.wsClient;
  }

  /**
   * Private: Create initial session state
   */
  private createInitialState(): SessionState {
    return {
      isRecording: false,
      wsStatus: 'Ready',
      ollamaStatus: 'Initializing...',
      sessionData: {
        duration: 0,
        stage: 'Opening',
        prompts: 0,
        talkRatio: { user: 50, prospect: 50 },
        responseTime: '0ms',
        effectiveness: 0
      },
      coachingPrompts: [],
      transcriptions: [],
      liveTranscript: '',
      volumeState: {
        level: 0,
        isMonitoring: false,
        status: 'silent'
      },
      micVolumeState: {
        level: 0,
        isMonitoring: false,
        status: 'silent'
      },
      tabVolumeState: {
        level: 0,
        isMonitoring: false,
        status: 'silent'
      },
      captureMode: 'microphone'
    };
  }

  /**
   * Private: Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    this.wsClient.onTranscript((transcript: TranscriptEvent) => {
      if (transcript.type === 'final_transcript') {
        const newTranscription: TranscriptionItem = {
          id: Date.now() + this.transcriptIdCounter++, // Ensure unique ID
          speaker: 'unknown',
          text: transcript.text,
          timestamp: Date.now()
        };
        
        this.updateSessionState({
          transcriptions: [...this.sessionState.transcriptions, newTranscription],
          liveTranscript: ''
        });

        // Generate Ollama coaching for final transcripts
        if (transcript.text.length > 50) {
          this.generateOllamaCoaching(transcript.text);
        }
      } else {
        this.updateSessionState({
          liveTranscript: transcript.text
        });
      }
    });

    this.wsClient.onCoaching((suggestion: CoachingSuggestion) => {
      const newPrompt: CoachingPrompt = {
        id: Date.now() * 1000 + this.transcriptIdCounter++, // Ensure unique ID
        priority: suggestion.priority.toLowerCase() as any,
        text: suggestion.suggestion,
        category: suggestion.category,
        trigger: suggestion.trigger,
        context: suggestion.context,
        timestamp: Date.parse(suggestion.timestamp)
      };
      
      this.updateSessionState({
        coachingPrompts: [...this.sessionState.coachingPrompts, newPrompt],
        sessionData: {
          ...this.sessionState.sessionData,
          prompts: this.sessionState.sessionData.prompts + 1
        }
      });
    });

    this.wsClient.onStatus((status: string) => {
      this.updateSessionState({ wsStatus: status });
    });

    this.wsClient.onError((error: string) => {
      this.updateSessionState({ wsStatus: `Error: ${error}` });
    });

    // Handle MediaStream for volume monitoring (legacy single stream)
    this.wsClient.onMediaStream((mediaStream: MediaStream) => {
      // LED 6305: MediaStream received for volume monitoring
      this.trail.light(6305, {
        operation: 'mediastream_received_for_volume',
        streamActive: mediaStream.active,
        timestamp: Date.now()
      });
      
      // For backward compatibility with single stream
      this.volumeService.startMicMonitoring(mediaStream);
    });
    
    // Handle dual streams for separate volume monitoring
    this.wsClient.onDualStreams((micStream: MediaStream | null, tabStream: MediaStream | null) => {
      // LED 6306: Dual streams received for volume monitoring
      this.trail.light(6306, {
        operation: 'dual_streams_received',
        hasMicStream: !!micStream,
        hasTabStream: !!tabStream,
        timestamp: Date.now()
      });
      
      if (micStream) {
        this.volumeService.startMicMonitoring(micStream);
      }
      
      if (tabStream) {
        this.volumeService.startTabMonitoring(tabStream);
      }
    });
  }

  /**
   * Private: Setup volume monitoring handler
   */
  private setupVolumeHandler(): void {
    // Microphone volume handler
    this.volumeService.onMicVolumeChange((volumeState: VolumeState) => {
      this.updateSessionState({ micVolumeState: volumeState });
    });
    
    // Tab/headphone volume handler  
    this.volumeService.onTabVolumeChange((volumeState: VolumeState) => {
      this.updateSessionState({ tabVolumeState: volumeState });
    });
  }

  /**
   * Private: Start session timer
   */
  private startSessionTimer(): void {
    this.sessionTimer = setInterval(() => {
      if (this.sessionState.isRecording) {
        const newDuration = this.sessionState.sessionData.duration + 1000;
        
        this.updateSessionState({
          sessionData: {
            ...this.sessionState.sessionData,
            duration: newDuration
          }
        });
      }
    }, 1000);
  }

  /**
   * Private: Stop session timer
   */
  private stopSessionTimer(): void {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  /**
   * Private: Update session state and notify callback
   */
  private updateSessionState(updates: Partial<SessionState>): void {
    this.sessionState = {
      ...this.sessionState,
      ...updates
    };
    
    if (this.stateCallback) {
      try {
        this.stateCallback(this.sessionState);
      } catch (error) {
        // LED 8302: State callback error
        this.trail.fail(8302, error as Error);
      }
    }
  }

  /**
   * Private: Force cleanup on error
   */
  private forceCleanup(): void {
    this.stopSessionTimer();
    this.volumeService.stopMonitoring();
    
    this.updateSessionState({
      isRecording: false,
      wsStatus: 'Error during disconnect',
      liveTranscript: ''
    });
  }
}