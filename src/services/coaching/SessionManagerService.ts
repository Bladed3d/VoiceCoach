/**
 * VoiceCoach V2 - Session Manager Service
 * Manages coaching session state and WebSocket integration
 * LED Range: 6300-6399
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { VoiceCoachWebSocketClient, TranscriptEvent, CoachingSuggestion } from '../websocket/websocket-client';
import { VolumeMonitoringService } from '../audio/VolumeMonitoringService';
import { ChromaDBService } from '../knowledge/ChromaDBService';
import { 
  SessionState, 
  CoachingPrompt, 
  TranscriptionItem, 
  VolumeState 
} from '../../types/coaching';
import { SemanticSearchResult } from '../../types/chromadb';

export class SessionManagerService {
  private trail: BreadcrumbTrail;
  private wsClient: VoiceCoachWebSocketClient;
  private volumeService: VolumeMonitoringService;
  private chromaDBService: ChromaDBService;
  private sessionState: SessionState;
  private stateCallback?: (state: SessionState) => void;
  private sessionTimer: NodeJS.Timeout | null = null;
  private ragDocument: any = null;
  private useSemanticSearch: boolean = false;

  constructor() {
    console.log('🚀 SessionManagerService: Constructor starting...');
    this.trail = new BreadcrumbTrail('SessionManagerService');
    
    // Initialize services
    this.wsClient = new VoiceCoachWebSocketClient('ws://127.0.0.1:5000');
    this.volumeService = new VolumeMonitoringService();
    this.chromaDBService = new ChromaDBService('universal_neversplit');
    
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
    
    console.log('✅ SessionManagerService: Constructor complete');
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
      console.log('🔍 Testing Ollama connection via desktop IPC...');
      
      // LED 6302: Testing connection
      this.trail.light(6302, {
        operation: 'ollama_connection_test',
        method: 'desktop_ipc',
        timestamp: Date.now()
      });
      
      // Test Ollama connection using desktop-native IPC call
      const result = await (window as any).electronAPI.ollamaTestConnection();
      console.log('🔍 Ollama connection result:', result);
      
      // LED 6303: Connection test result
      this.trail.light(6303, {
        operation: 'ollama_connection_result',
        success: result.success,
        error: result.error || null,
        timestamp: Date.now()
      });
      
      if (result.success) {
        console.log('✅ Ollama API accessible, loading document...');
        
        // LED 6304: Document loading start
        this.trail.light(6304, {
          operation: 'rag_document_loading_start',
          document: 'NeverSplit',
          timestamp: Date.now()
        });
        
        // Try to load the NeverSplit document automatically
        const documentLoaded = await this.loadRagDocument('NeverSplit');
        
        // Initialize ChromaDB in parallel
        const chromaDBReady = await this.initializeChromaDB();
        
        // Determine final status based on both RAG and ChromaDB
        let status = 'Ready (Llama 3.1 8B)';
        if (documentLoaded && chromaDBReady) {
          status = 'Ready (Llama 3.1 8B + ChromaDB)';
          this.useSemanticSearch = true;
        } else if (documentLoaded) {
          status = 'Ready (Llama 3.1 8B + Document)';
        }
        
        this.updateSessionState({
          ollamaStatus: status
        });

        // LED 6305: Initialization complete success
        this.trail.light(6305, {
          operation: 'ollama_initialization_success',
          document_loaded: documentLoaded,
          final_status: documentLoaded ? 'Ready (Document Loaded)' : 'Ready',
          timestamp: Date.now()
        });
        console.log('🎵 LED 6305: Ollama initialization completed successfully');

        console.log('✅ Ollama connected successfully');
        if (documentLoaded) {
          console.log('✅ NeverSplit document loaded for coaching');
        }
      } else {
        throw new Error(`Ollama connection failed: ${result.error}`);
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
   * Load RAG document for coaching
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

      // Load Phase 1A results
      const phase1AResponse = await electronAPI.loadRagDocument(`${documentName}-phase1a.json`);
      if (!phase1AResponse.success) {
        throw new Error(`Phase 1A file not found: ${phase1AResponse.error}`);
      }

      this.ragDocument = JSON.parse(phase1AResponse.content);

      this.trail.light(6321, {
        operation: 'rag_document_loaded_successfully',
        document_name: documentName,
        techniques_count: this.ragDocument?.high_impact_techniques?.length || 0,
        objection_handlers_count: this.ragDocument?.objection_handlers?.length || 0
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
   */
  private async initializeChromaDB(): Promise<boolean> {
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
  }

  /**
   * Generate Ollama coaching suggestion (direct API call from working version)
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
      this.trail.light(6330, {
        operation: 'ollama_coaching_generation_start',
        transcript_length: transcriptionText.length,
        model: 'llama3.1:8b-instruct-q4_K_M',
        knowledge_source: this.useSemanticSearch ? 'chromadb_semantic' : 'rag_document',
        optimization: 'superior_rag_performance',
        benchmark: '2.5s_vs_4.4s_improvement',
        timestamp: Date.now()
      });

      const prompt = await this.buildCoachingPrompt(transcriptionText);
      
      // Use desktop-native IPC call for Ollama generation
      const result = await (window as any).electronAPI.ollamaGenerate({
        prompt: prompt,
        model: 'llama3.1:8b-instruct-q4_K_M'
      });

      if (!result.success) {
        throw new Error(`Ollama generation failed: ${result.error}`);
      }

      const suggestion = result.response?.trim();

      if (suggestion && suggestion.length > 10) {
        const newPrompt: CoachingPrompt = {
          id: Date.now(),
          priority: 'medium',
          text: suggestion,
          category: 'real_time_coaching',
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

    if (this.useSemanticSearch && this.chromaDBService.isReady()) {
      // LED 6360: Semantic search for relevant coaching content
      this.trail.light(6360, {
        operation: 'semantic_search_for_coaching',
        transcript_preview: transcriptionText.substring(0, 50),
        search_method: 'chromadb',
        timestamp: Date.now()
      });

      try {
        const searchResults = await this.chromaDBService.semanticSearch(transcriptionText, 3);
        
        // LED 6361: Search results obtained
        this.trail.light(6361, {
          operation: 'semantic_search_results',
          results_count: searchResults.length,
          top_similarity: searchResults[0]?.similarity_score || 0,
          content_types: searchResults.map(r => r.content_type),
          timestamp: Date.now()
        });

        // Format search results for prompt
        knowledgeContext = searchResults.map(result => 
          `${result.content_type.toUpperCase()}: ${result.content}`
        ).join('\n');

        console.log(`🔍 ChromaDB: Found ${searchResults.length} relevant coaching techniques`);

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

    return `You are a real-time sales coach. Provide ONE specific action for the salesperson based on this conversation.

Knowledge Base: ${knowledgeContext}

Conversation: "${transcriptionText}"

Rules:
- Maximum 20 words
- ONE specific action only
- Use present tense ("Ask:", "Say:", "Try:")
- Be immediately actionable

Action:`;
  }

  /**
   * Start coaching session
   */
  async startSession(): Promise<boolean> {
    const sessionStartTime = Date.now();
    
    // LED 6301: Session start initiation
    this.trail.light(6301, {
      operation: 'session_start_initiation',
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

      const serverResult = await (window as any).electronAPI?.startTranscription();
      if (!serverResult?.success) {
        throw new Error(`Server startup failed: ${serverResult?.error || 'Unknown server error'}`);
      }

      // Wait for server to be fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Connect WebSocket client
      await this.wsClient.connect();
      
      // Start transcription
      if (await this.wsClient.startTranscription()) {
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
      }
    };
  }

  /**
   * Private: Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    this.wsClient.onTranscript((transcript: TranscriptEvent) => {
      if (transcript.type === 'final_transcript') {
        const newTranscription: TranscriptionItem = {
          id: Date.now(),
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
        id: Date.now(),
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

    // Handle MediaStream for volume monitoring
    this.wsClient.onMediaStream((mediaStream: MediaStream) => {
      // LED 6305: MediaStream received for volume monitoring
      this.trail.light(6305, {
        operation: 'mediastream_received_for_volume',
        streamActive: mediaStream.active,
        timestamp: Date.now()
      });
      
      this.volumeService.startMonitoring(mediaStream);
    });
  }

  /**
   * Private: Setup volume monitoring handler
   */
  private setupVolumeHandler(): void {
    this.volumeService.onVolumeChange((volumeState: VolumeState) => {
      this.updateSessionState({ volumeState });
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