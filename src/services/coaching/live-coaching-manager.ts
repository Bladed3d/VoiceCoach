/**
 * VoiceCoach V2 - Live Coaching Manager
 * Manages LiveCoachingService initialization and document loading
 * Based on working backup implementation from 08/22/25
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { LiveCoachingService, ProcessedDocument } from './live-coaching-service';
import { defaultLiveCoachingConfig } from '../../config/live-coaching-config';

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
    this.liveCoachingService = new LiveCoachingService(defaultLiveCoachingConfig);
    
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

      const success = await this.liveCoachingService.initialize();
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

      // Load Phase 1A results
      const phase1AResponse = await electronAPI.loadRagDocument(`${documentName}-phase1a.json`);
      if (!phase1AResponse.success) {
        throw new Error(`Phase 1A file not found: ${phase1AResponse.error}`);
      }

      const phase1AResults = JSON.parse(phase1AResponse.content);

      // Try to load original document (optional)
      let originalContent = '';
      const originalResponse = await electronAPI.loadRagDocument(`${documentName}Summary_*_original.txt`);
      if (originalResponse.success) {
        originalContent = originalResponse.content;
      }

      // Create ProcessedDocument object
      const processedDoc: ProcessedDocument = {
        name: documentName,
        originalContent: originalContent,
        phase1AResults: phase1AResults,
        loadedTimestamp: new Date().toISOString()
      };

      // Load into service
      const success = this.liveCoachingService.loadProcessedDocument(processedDoc);
      
      if (success) {
        this.currentDocumentName = documentName;
        
        this.trail.light(6421, {
          operation: 'rag_document_loaded_successfully',
          document_name: documentName,
          has_phase1a: !!phase1AResults,
          has_original: !!originalContent,
          techniques_count: phase1AResults?.high_impact_techniques?.length || 0,
          objection_handlers_count: phase1AResults?.objection_handlers?.length || 0
        });

        console.log(`✅ Document loaded: ${documentName} (${phase1AResults?.high_impact_techniques?.length || 0} techniques)`);
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