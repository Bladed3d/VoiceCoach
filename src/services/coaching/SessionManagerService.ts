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
// Centralized Ollama prompt service - SINGLE SOURCE OF TRUTH for prompts
import { ollamaPromptService } from './OllamaPromptService';
import { LiveCoachingManager } from './live-coaching-manager';

// Conversation analyzers for rich context detection
import { conversationAnalyzer } from './analyzers/ConversationAnalyzer';
import { SemanticSearchResult } from '../../types/chromadb';
import { SentimentAnalyzer, SentimentAnalysis } from './sentiment-analyzer';

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
  private isGeneratingOllama: boolean = false; // Prevent rapid-fire Ollama calls
  private lastSearchResults: SemanticSearchResult[] = []; // Store results for priority mapping
  private callStartTime: Date | null = null; // Track call start for enhanced Ollama
  private conversationHistory: Array<{ speaker: 'user' | 'prospect'; text: string; timestamp: string }> = [];
  private transcriptIdCounter = 0; // Unique ID counter to prevent duplicate keys
  private onTranscriptProcessedCallback?: (transcript: TranscriptEvent, speaker: 'user' | 'prospect') => void;
  // Simple counters for numbering
  private currentStage = 1;
  private promptCounter = 0;
  private currentPromptNumber = 0; // Track the prompt number that transcripts should inherit
  private transcriptCounter = 0;
  // Sentiment analysis
  private sentimentAnalyzer: SentimentAnalyzer;
  private currentSentiment: SentimentAnalysis | null = null;

  constructor() {
    console.log('🚀 SessionManagerService: Constructor starting...');
    this.trail = new BreadcrumbTrail('SessionManagerService');
    
    // Initialize services
    this.wsClient = new VoiceCoachWebSocketClient('ws://127.0.0.1:5000');
    this.volumeService = new DualVolumeMonitoringService();
    this.sentimentAnalyzer = new SentimentAnalyzer();
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
    
    // Initialize centralized Ollama prompt service and legacy Ollama system
    setTimeout(() => {
      console.log('🕒 Starting centralized Ollama prompt service...');
      this.initializeOllamaPromptService();
      console.log('🕒 Starting legacy Ollama initialization...');
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
   * Initialize centralized Ollama prompt service
   */
  private async initializeOllamaPromptService(): Promise<void> {
    try {
      this.trail.light(6295, {
        operation: 'centralized_prompt_service_init_start',
        timestamp: Date.now()
      });

      const initialized = await ollamaPromptService.initialize();

      if (initialized) {
        console.log('✅ Centralized Ollama prompt service initialized successfully');
        this.trail.light(6296, {
          operation: 'centralized_prompt_service_init_success',
          status: ollamaPromptService.getStatus(),
          timestamp: Date.now()
        });
      } else {
        throw new Error('Failed to initialize centralized prompt service');
      }
    } catch (error) {
      this.trail.fail(8296, error as Error);
      console.error('❌ Failed to initialize centralized prompt service:', error);
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
        
        // Dynamic status - should reflect actual Ollama connection
        let status = 'Connected';
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

            // Connect LiveCoachingService to SessionManagerService for transcript processing
            const liveCoachingService = this.liveCoachingManager.getService();
            liveCoachingService.setSessionManager(this);

            // LiveCoachingService has already registered its transcript processor via setSessionManager above
            // No additional registration needed - the callback is already set

            console.log('🎯 LiveCoachingService connected to SessionManager for unified transcript processing');

            // LED 6309: Unified transcript processing integration
            this.trail.light(6309, {
              operation: 'unified_transcript_processing_complete',
              timestamp: Date.now()
            });
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
            
            const loaded = await this.liveCoachingManager.loadDocument(processedDoc);
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
      this.trail.fail(8350, new Error('No RAG document selected - coaching will be severely limited'), {
        operation: 'coaching_no_document_selected',
        useSemanticSearch: this.useSemanticSearch,
        hasRagDocument: !!this.ragDocument,
        transcriptLength: transcriptionText.length,
        timestamp: Date.now()
      });
      // Continue anyway - better basic prompts than no prompts
    }

    // Set flag to prevent concurrent calls
    this.isGeneratingOllama = true;

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

      // PERFORMANCE: Measure total coaching generation duration
      const coachingStartTime = Date.now();

      // Use centralized coaching generation - this handles everything internally
      const suggestion = await this.buildCoachingPrompt(transcriptionText);

      const totalDuration = Date.now() - coachingStartTime;

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

        this.promptCounter++;
        this.currentPromptNumber = this.promptCounter; // Update current prompt number for transcripts
        const newPrompt: CoachingPrompt = {
          id: Date.now() * 1000 + this.transcriptIdCounter++, // Ensure unique ID
          priority: promptPriority,
          text: coachingData.suggestion || suggestion,
          category: coachingData.category || 'real_time_coaching',
          trigger: 'transcript_analysis',
          context: transcriptionText.slice(-200), // Last 200 chars for context
          timestamp: Date.now(),
          stageId: `[${this.currentStage}.${this.promptCounter}]`
        };
        
        this.updateSessionState({
          coachingPrompts: [...this.sessionState.coachingPrompts, newPrompt],
          sessionData: {
            ...this.sessionState.sessionData,
            prompts: this.sessionState.sessionData.prompts + 1
          }
        });

        this.trail.light(6331, {
          operation: 'centralized_coaching_suggestion_generated',
          suggestion_length: suggestion.length,
          total_duration_ms: totalDuration,
          performance: totalDuration < 1000 ? 'fast' :
                      totalDuration < 3000 ? 'acceptable' : 'slow',
          centralized_service: true,
          timestamp: Date.now()
        });

        console.log(`🤖 Centralized Coaching (${totalDuration}ms):`, suggestion);
      }
    } catch (error) {
      this.trail.fail(8330, error as Error);
      console.error('❌ Ollama coaching generation failed:', error);
    } finally {
      // Always clear the flag to allow future calls
      this.isGeneratingOllama = false;
    }
  }

  /**
   * Build coaching prompt using centralized service - SIMPLIFIED AND UNIFIED
   */
  private async buildCoachingPrompt(transcriptionText: string): Promise<string> {
    this.trail.light(6360, {
      operation: 'centralized_prompt_building_start',
      transcript_length: transcriptionText.length,
      timestamp: Date.now()
    });

    // Run conversation analysis for rich context
    const analysis = conversationAnalyzer.analyze(transcriptionText, false);

    // Build context for centralized service
    const context = {
      transcript: transcriptionText,
      salesStage: analysis.salesStage,
      sentiment: analysis.momentum, // Using momentum as sentiment proxy
      objections: analysis.objections.map(o => o.type),
      topics: this.detectTopics(transcriptionText), // Enhanced topic detection
      callDuration: this.callStartTime ?
        Math.round((Date.now() - this.callStartTime.getTime()) / 1000 / 60) : 0
    };

    // Use centralized prompt service to generate the entire response
    const result = await ollamaPromptService.generateCoaching(context);

    if (result.success && result.response) {
      this.trail.light(6361, {
        operation: 'centralized_prompt_building_success',
        response_length: result.response.length,
        timestamp: Date.now()
      });

      // Return the response directly since centralized service handles everything
      return result.response;
    } else {
      this.trail.fail(8360, new Error(`Centralized prompt service failed: ${result.error}`));
      throw new Error(`Coaching generation failed: ${result.error}`);
    }
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
      
      // LED 8300: Session start failure with enhanced diagnostics
      this.trail.fail(8300, error as Error);
      this.trail.light(8301, {
        operation: 'session_start_failure_diagnostics',
        error_message: errorMessage,
        error_name: error instanceof Error ? error.name : 'Unknown',
        error_stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join(' | ') : null,
        capture_mode: captureMode,
        selected_documents: selectedDocuments,
        ws_client_connected: this.wsClient?.isConnected(),
        session_duration_before_error: Date.now() - sessionStartTime,
        timestamp: Date.now()
      });
      
      // Stop any partially started services
      try {
        this.volumeService?.stopMonitoring();
        this.wsClient?.disconnect();
        if (this.liveCoachingManager) {
          await this.liveCoachingManager.stopLiveCoaching();
        }
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
      
      this.updateSessionState({
        wsStatus: `Error: ${errorMessage}`,
        isRecording: false
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
   * Add manual sentiment input from user
   * LED: 7100 - Manual sentiment input
   */
  addManualSentiment(score: -50 | -25 | 0 | 25 | 50, emoji: string): void {
    this.trail.light(7100, {
      operation: 'manual_sentiment_input',
      score,
      emoji,
      transcriptIndex: this.sessionState.transcriptions.length,
      timestamp: Date.now()
    });

    const manualSentiment: import('../types/coaching').ManualSentiment = {
      timestamp: Date.now(),
      score,
      transcriptIndex: this.sessionState.transcriptions.length,
      emoji
    };

    // Add to history and update current
    this.updateSessionState({
      manualSentiments: [...(this.sessionState.manualSentiments || []), manualSentiment],
      currentManualSentiment: score
    });

    console.log(`📊 Manual sentiment recorded: ${emoji} (${score > 0 ? '+' : ''}${score})`);
  }

  /**
   * Get blended sentiment (manual overrides automated)
   */
  getBlendedSentiment(): number {
    const automated = this.currentSentiment?.score || 0;
    const manual = this.sessionState.currentManualSentiment;

    // Manual input is ground truth - full override
    return manual !== undefined ? manual : automated;
  }

  /**
   * Get conversation history for script progress tracking
   * LED Range: 7500-7509
   */
  getConversationHistory(): Array<{ speaker: 'user' | 'prospect'; text: string; timestamp: string }> {
    this.trail.light(7500, {
      operation: 'conversation_history_accessed',
      historyLength: this.conversationHistory.length,
      timestamp: Date.now()
    });

    return [...this.conversationHistory];
  }

  /**
   * Get recent conversation entries for context analysis
   */
  getRecentConversation(count: number = 10): Array<{ speaker: 'user' | 'prospect'; text: string; timestamp: string }> {
    this.trail.light(7501, {
      operation: 'recent_conversation_accessed',
      requestedCount: count,
      availableCount: this.conversationHistory.length,
      timestamp: Date.now()
    });

    return this.conversationHistory.slice(-count);
  }

  /**
   * Register callback for transcript processing events
   */
  onTranscriptProcessed(callback: (transcript: TranscriptEvent, speaker: 'user' | 'prospect') => void): void {
    this.onTranscriptProcessedCallback = callback;

    this.trail.light(6310, {
      operation: 'transcript_callback_registered',
      timestamp: Date.now()
    });
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
   * Clear conversation history (for Script Progress panel reset)
   */
  clearConversationHistory(): void {
    // LED 6308: Manual conversation history clear
    this.trail.light(6308, {
      operation: 'manual_conversation_history_clear',
      entriesCleared: this.conversationHistory.length,
      timestamp: Date.now()
    });

    this.conversationHistory = [];

    // Reset sentiment analyzer (clears sentiment history/graph)
    this.sentimentAnalyzer.reset();
    this.currentSentiment = null;

    console.log('✅ Conversation history and sentiment cleared in SessionManagerService');
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
      liveTranscriptSpeaker: 'user', // Initialize with user as default
      manualSentiments: [], // Manual sentiment inputs from user
      currentManualSentiment: undefined, // Most recent manual sentiment
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
        // Use current speaker from volume service or fallback based on capture mode
        // FIXED: Proper speaker identification logic
        let currentSpeaker: 'user' | 'prospect';

        if (this.sessionState.captureMode === 'microphone') {
          // Microphone only = user speaking
          currentSpeaker = 'user';
        } else {
          // Full conversation mode - use volume service with conservative default
          const volumeBasedSpeaker = this.volumeService.getCurrentSpeaker();
          // CONSERVATIVE: Default to 'user' to prevent false Ollama triggers during testing
          currentSpeaker = volumeBasedSpeaker || 'user';
        }

        this.transcriptCounter++;
        const newTranscription: TranscriptionItem = {
          id: Date.now() + this.transcriptIdCounter++, // Ensure unique ID
          speaker: currentSpeaker,
          text: transcript.text,
          timestamp: Date.now(),
          stageId: `[${this.currentStage}.${this.currentPromptNumber}.${this.transcriptCounter}]`
        };

        // LED 6309: Final transcript with speaker identification
        this.trail.light(6309, {
          operation: 'final_transcript_created',
          speaker: currentSpeaker,
          textLength: transcript.text.length,
          captureMode: this.sessionState.captureMode,
          timestamp: Date.now()
        });

        this.updateSessionState({
          transcriptions: [...this.sessionState.transcriptions, newTranscription],
          liveTranscript: ''
        });

        // Analyze sentiment for BOTH speakers (prospect + user handling)
        this.currentSentiment = this.sentimentAnalyzer.analyzeResponse(transcript.text, currentSpeaker);

        this.trail.light(6312, {
          operation: 'sentiment_analyzed',
          speaker: currentSpeaker,
          score: this.currentSentiment.score,
          direction: this.currentSentiment.direction,
          engagement: this.currentSentiment.engagement,
          trend: this.currentSentiment.trend
        });

        // Update session state with sentiment data
        this.updateSessionState({
          currentSentiment: {
            score: this.currentSentiment.score,
            direction: this.currentSentiment.direction,
            confidence: this.currentSentiment.confidence,
            engagement: this.currentSentiment.engagement,
            trend: this.currentSentiment.trend,
            timestamp: Date.now()
          }
        });

        // Generate Ollama coaching ONLY for prospect speech with simple debouncing
        if (transcript.text.length > 50 && currentSpeaker === 'prospect') {
          // LED: Transcript received for coaching analysis
          this.trail.light(6351, {
            operation: 'transcript_received_for_coaching',
            speaker: currentSpeaker,
            textLength: transcript.text.length,
            isGenerating: this.isGeneratingOllama,
            hasRagDocument: !!this.ragDocument,
            useSemanticSearch: this.useSemanticSearch,
            timestamp: Date.now()
          });

          // Simple debouncing: only if not currently generating
          if (!this.isGeneratingOllama) {
            this.trail.light(6352, {
              operation: 'coaching_generation_starting',
              ragDocumentStatus: !!this.ragDocument ? 'loaded' : 'not_loaded',
              semanticSearchStatus: this.useSemanticSearch ? 'enabled' : 'disabled',
              timestamp: Date.now()
            });
            this.generateOllamaCoaching(transcript.text);
          } else {
            this.trail.light(6353, {
              operation: 'coaching_generation_blocked',
              reason: 'already_generating',
              timestamp: Date.now()
            });
          }
        } else {
          this.trail.light(6354, {
            operation: 'coaching_generation_skipped',
            speaker: currentSpeaker,
            textLength: transcript.text.length,
            reason: transcript.text.length <= 50 ? 'text_too_short' : 'wrong_speaker',
            requiresProspectSpeech: true,
            minLength: 50,
            timestamp: Date.now()
          });
        }

        // Notify LiveCoachingService about the processed transcript with speaker info
        if (this.onTranscriptProcessedCallback) {
          this.onTranscriptProcessedCallback(transcript, currentSpeaker);

          this.trail.light(6311, {
            operation: 'transcript_forwarded_to_coaching',
            speaker: currentSpeaker,
            textLength: transcript.text.length,
            timestamp: Date.now()
          });
        }
      } else {
        this.updateSessionState({
          liveTranscript: transcript.text
        });
      }
    });

    this.wsClient.onCoaching((suggestion: CoachingSuggestion) => {
      this.promptCounter++;
      this.currentPromptNumber = this.promptCounter; // Update current prompt number for transcripts
      const newPrompt: CoachingPrompt = {
        id: Date.now() * 1000 + this.transcriptIdCounter++, // Ensure unique ID
        priority: suggestion.priority.toLowerCase() as any,
        text: suggestion.suggestion,
        category: suggestion.category,
        trigger: suggestion.trigger,
        context: suggestion.context,
        timestamp: Date.parse(suggestion.timestamp),
        stageId: `[${this.currentStage}.${this.promptCounter}]`
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
    
    // Speaker change handler - updates live transcript speaker context
    this.volumeService.onSpeakerChange((speaker: 'user' | 'prospect', confidence: number) => {
      // LED 6308: Speaker change detected
      this.trail.light(6308, {
        operation: 'speaker_change_detected',
        speaker,
        confidence,
        timestamp: Date.now()
      });
      
      this.updateSessionState({ 
        liveTranscriptSpeaker: speaker 
      });
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

  /**
   * Private: Detect conversation topics from transcript text
   * Matches keywords to identify discussion themes
   */
  private detectTopics(text: string): string[] {
    const topics: string[] = [];
    const lower = text.toLowerCase();

    // Pricing/cost topics
    if (lower.includes('price') || lower.includes('cost') || lower.includes('budget') ||
        lower.includes('expensive') || lower.includes('afford')) {
      topics.push('pricing');
    }

    // Feature/capability topics
    if (lower.includes('feature') || lower.includes('capability') || lower.includes('function') ||
        lower.includes('can it') || lower.includes('does it')) {
      topics.push('features');
    }

    // Support/help topics
    if (lower.includes('support') || lower.includes('help') || lower.includes('training') ||
        lower.includes('onboarding') || lower.includes('documentation')) {
      topics.push('support');
    }

    // Implementation/setup topics
    if (lower.includes('implement') || lower.includes('setup') || lower.includes('install') ||
        lower.includes('configure') || lower.includes('deploy')) {
      topics.push('implementation');
    }

    // Timeline/schedule topics
    if (lower.includes('timeline') || lower.includes('when') || lower.includes('schedule') ||
        lower.includes('how long') || lower.includes('duration')) {
      topics.push('timeline');
    }

    // Integration topics
    if (lower.includes('integrate') || lower.includes('connect') || lower.includes('api') ||
        lower.includes('sync') || lower.includes('import')) {
      topics.push('integration');
    }

    // Security/compliance topics
    if (lower.includes('security') || lower.includes('compliance') || lower.includes('gdpr') ||
        lower.includes('hipaa') || lower.includes('encrypt')) {
      topics.push('security');
    }

    // ROI/value topics
    if (lower.includes('roi') || lower.includes('return') || lower.includes('value') ||
        lower.includes('benefit') || lower.includes('save')) {
      topics.push('roi');
    }

    return topics;
  }

  public setCurrentStage(stageNumber: number): void {
    console.log(`🎯 SessionManager: Setting stage to ${stageNumber}, resetting prompt counter`);
    this.currentStage = stageNumber;
    this.promptCounter = 0; // Reset prompt counter when stage changes
    this.currentPromptNumber = 0; // Reset current prompt number for transcripts
  }

}