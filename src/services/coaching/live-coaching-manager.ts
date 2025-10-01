/**
 * VoiceCoach V2 - Live Coaching Manager
 * Manages LiveCoachingService initialization and document loading
 * Based on working backup implementation from 08/22/25
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { LiveCoachingService, ProcessedDocument } from './live-coaching-service';
import { defaultLiveCoachingConfig } from '../../config/live-coaching-config';
import { getSelectedModel } from '../../lib/model-utils';

export interface CoachingManagerStatus {
  initialized: boolean;
  ollamaConnected: boolean;
  websocketConnected: boolean;
  documentLoaded: boolean;
  currentDocument?: string;
  serviceReady: boolean;
}

export class LiveCoachingManager {
  private trail: BreadcrumbTrail;
  private liveCoachingService: LiveCoachingService;
  private isInitialized: boolean = false;
  private currentDocumentName: string | null = null;

  constructor() {
    this.trail = new BreadcrumbTrail('LiveCoachingManager');

    // Use the proper model selection function that checks both localStorage keys
    const selectedModel = getSelectedModel();
    const chromaDBEnabled = localStorage.getItem('voicecoach-chromadb-enabled') === 'true';
    const config = { ...defaultLiveCoachingConfig };

    // Always use the selected model from the centralized function
    config.ollama.model = selectedModel;
    console.log(`🎯 LiveCoachingManager using model: ${selectedModel} (from getSelectedModel())`)
    
    // Enable ChromaDB if user has toggled it on
    if (chromaDBEnabled) {
      config.coaching.useChromaDB = true;
      console.log('🔍 ChromaDB semantic search enabled');
    }
    
    this.liveCoachingService = new LiveCoachingService(config);
    
    this.trail.light(6400, {
      operation: 'live_coaching_manager_created',
      config: {
        ollama_url: defaultLiveCoachingConfig.ollama.baseUrl,
        ollama_model: defaultLiveCoachingConfig.ollama.model,
        websocket_url: defaultLiveCoachingConfig.websocket.serverUrl,
        real_time_analysis: defaultLiveCoachingConfig.coaching.enableRealTimeAnalysis
      },
      timestamp: Date.now()
    });
  }

  async initialize(): Promise<boolean> {
    try {
      this.trail.light(6401, {
        operation: 'live_coaching_manager_initialization_start',
        timestamp: Date.now()
      });

      console.log('🔍 LiveCoachingManager: Calling liveCoachingService.initialize()...');
      const success = await this.liveCoachingService.initialize();
      console.log(`🔍 LiveCoachingManager: liveCoachingService.initialize() returned ${success}`);

      this.isInitialized = success;

      if (success) {
        this.setupEventHandlers();

        this.trail.light(6402, {
          operation: 'live_coaching_manager_initialized_successfully',
          services_ready: true,
          timestamp: Date.now()
        });
      } else {
        this.trail.fail(8401, new Error('LiveCoachingService initialization failed'));
      }

      return success;

    } catch (error) {
      this.trail.fail(8401, error as Error);
      console.error('❌ LiveCoachingManager initialization error:', error);
      return false;
    }
  }

  private setupEventHandlers(): void {
    // Forward coaching suggestions to UI
    this.liveCoachingService.onCoachingSuggestion((suggestion) => {
      this.trail.light(6410, {
        operation: 'coaching_suggestion_forwarded',
        priority: suggestion.priority,
        category: suggestion.category,
        timestamp: suggestion.timestamp
      });

      // Dispatch to UI via custom event
      const event = new CustomEvent('coachingSuggestion', { detail: suggestion });
      window.dispatchEvent(event);
    });

    // Forward transcript events
    this.liveCoachingService.onTranscript((transcript) => {
      this.trail.light(6411, {
        operation: 'transcript_forwarded',
        type: transcript.type,
        length: transcript.text.length,
        timestamp: transcript.timestamp
      });

      // Dispatch to UI via custom event
      const event = new CustomEvent('transcriptReceived', { detail: transcript });
      window.dispatchEvent(event);
    });

    // Handle status updates
    this.liveCoachingService.onStatus((status) => {
      console.log('🔄 Live Coaching Status:', status);
    });

    // Handle errors
    this.liveCoachingService.onError((error) => {
      console.error('❌ Live Coaching Error:', error);
      this.trail.fail(8410, new Error(error));
    });
  }

  /**
   * Load a pre-processed document directly (no phases)
   */
  async loadDocument(processedDoc: any): Promise<boolean> {
    try {
      // Create a simplified document structure without phases
      const simplifiedDoc = {
        name: processedDoc.name,
        originalContent: processedDoc.originalContent,
        documentContent: processedDoc.documentContent || processedDoc,
        techniques: processedDoc.techniques,
        response_patterns: processedDoc.response_patterns,
        loadedTimestamp: processedDoc.loadedTimestamp || new Date().toISOString()
      };
      
      const success = this.liveCoachingService.loadProcessedDocument(simplifiedDoc);
      if (success) {
        this.currentDocumentName = processedDoc.name;
        this.trail.light(6419, {
          operation: 'document_loaded_directly',
          document_name: processedDoc.name,
          has_techniques: !!processedDoc.techniques,
          technique_count: processedDoc.techniques?.length || 0
        });
        console.log('✅ Document loaded directly:', processedDoc.name);
      }
      return success;
    } catch (error) {
      this.trail.fail(8419, error as Error);
      return false;
    }
  }

  async loadDocumentFromRag(documentName: string): Promise<boolean> {
    try {
      this.trail.light(6420, {
        operation: 'rag_document_loading_start',
        document_name: documentName,
        timestamp: Date.now()
      });

      // Use Electron API to load files from /rag folder
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI) {
        throw new Error('Electron API not available');
      }

      // Load the document directly (no phases)
      const documentResponse = await electronAPI.loadRagDocument(`${documentName}.json`);
      if (!documentResponse.success) {
        throw new Error(`Document file not found: ${documentResponse.error}`);
      }

      const documentData = JSON.parse(documentResponse.content);

      // Try to load original document (optional)
      let originalContent = '';
      const originalResponse = await electronAPI.loadRagDocument(`${documentName}Summary_*_original.txt`);
      if (originalResponse.success) {
        originalContent = originalResponse.content;
      }

      // Create ProcessedDocument object with direct document structure
      const processedDoc: ProcessedDocument = {
        name: documentName,
        originalContent: originalContent || '',
        documentContent: documentData,
        techniques: documentData.techniques,
        response_patterns: documentData.response_patterns,
        loadedTimestamp: new Date().toISOString()
      };

      // Load into service
      const success = this.liveCoachingService.loadProcessedDocument(processedDoc);
      
      if (success) {
        this.currentDocumentName = documentName;
        
        this.trail.light(6421, {
          operation: 'rag_document_loaded_successfully',
          document_name: documentName,
          has_techniques: !!documentData?.techniques,
          has_conversation_paths: !!documentData?.techniques?.[0]?.conversation_paths,
          techniques_count: documentData?.techniques?.length || 0,
          response_patterns_count: Object.keys(documentData?.response_patterns || {}).length
        });

        console.log(`✅ Document loaded: ${documentName} (${documentData?.techniques?.length || 0} techniques)`);
      }

      return success;

    } catch (error) {
      this.trail.fail(8420, error as Error);
      console.error('❌ Failed to load document from RAG:', error);
      return false;
    }
  }

  async startLiveCoaching(): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('❌ LiveCoachingManager not initialized');
      return false;
    }

    return await this.liveCoachingService.startLiveCoaching();
  }

  stopLiveCoaching(): boolean {
    if (!this.isInitialized) return false;
    return this.liveCoachingService.stopLiveCoaching();
  }

  getStatus(): CoachingManagerStatus {
    const serviceStatus = this.liveCoachingService.getStatus();
    
    return {
      initialized: this.isInitialized,
      ollamaConnected: serviceStatus.ollamaConnected,
      websocketConnected: serviceStatus.websocketConnected,
      documentLoaded: serviceStatus.documentLoaded,
      currentDocument: this.currentDocumentName || undefined,
      serviceReady: this.isInitialized && serviceStatus.ollamaConnected && serviceStatus.websocketConnected
    };
  }

  // Get the underlying service for advanced operations
  getService(): LiveCoachingService {
    return this.liveCoachingService;
  }

  disconnect(): void {
    this.trail.light(6430, { operation: 'live_coaching_manager_disconnect' });
    
    if (this.isInitialized) {
      this.liveCoachingService.disconnect();
      this.isInitialized = false;
      this.currentDocumentName = null;
    }

    this.trail.light(6431, { operation: 'live_coaching_manager_disconnected' });
  }
}