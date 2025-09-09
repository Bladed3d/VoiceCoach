/**
 * VoiceCoach V2 - Live Coaching Integration Service
 * Coordinates real-time transcription with document-based coaching via Ollama
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { SimpleWebSocketClient, TranscriptEvent } from '../websocket/simple-websocket-client';
import { CoachingSuggestion } from '../websocket/websocket-client';
import { OllamaCoachingService, OllamaConfig, CoachingContext, CoachingResponse } from './ollama-service';

export interface LiveCoachingConfig {
  ollama: OllamaConfig;
  websocket: {
    serverUrl: string;
  };
  coaching: {
    minTranscriptLength: number; // min chars before coaching
    maxHistoryLength: number; // max conversation history items
    enableRealTimeAnalysis: boolean; // instant analysis on final transcripts
    debounceMs: number; // debounce rapid-fire transcripts (100-200ms)
  };
}

export interface ProcessedDocument {
  name: string;
  originalContent: string;
  documentContent?: any;
  techniques?: any[];
  response_patterns?: any;
  loadedTimestamp: string;
}

export class LiveCoachingService {
  private trail: BreadcrumbTrail;
  private config: LiveCoachingConfig;
  private webSocketClient: SimpleWebSocketClient;
  private ollamaService: OllamaCoachingService;
  private currentDocument: ProcessedDocument | null = null;
  private conversationHistory: Array<{ speaker: 'user' | 'prospect'; text: string; timestamp: string }> = [];
  private pendingTranscript: string = '';
  private isAnalyzing: boolean = false;
  private debounceTimer?: NodeJS.Timeout;

  // Event callbacks
  private onCoachingSuggestionCallback?: (suggestion: CoachingSuggestion) => void;
  private onTranscriptCallback?: (transcript: TranscriptEvent) => void;
  private onStatusCallback?: (status: string) => void;
  private onErrorCallback?: (error: string) => void;

  constructor(config: LiveCoachingConfig) {
    this.trail = new BreadcrumbTrail('LiveCoaching');
    this.config = config;
    
    // Initialize services - Use SimpleWebSocketClient for native WebSocket on port 8765
    this.webSocketClient = new SimpleWebSocketClient('ws://127.0.0.1:8765');
    this.ollamaService = new OllamaCoachingService(config.ollama);

    this.trail.light(6200, {
      operation: 'live_coaching_service_initialization',
      websocketUrl: config.websocket.serverUrl,
      ollamaModel: config.ollama.model,
      timestamp: Date.now()
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Handle transcription events
    this.webSocketClient.onTranscript((transcript: TranscriptEvent) => {
      this.trail.light(6210, {
        operation: 'transcript_received',
        type: transcript.type,
        length: transcript.text.length,
        timestamp: transcript.timestamp
      });

      // Forward to external callback
      this.onTranscriptCallback?.(transcript);

      // Add to conversation history and trigger real-time analysis
      if (transcript.type === 'final_transcript' && transcript.text.trim()) {
        console.log('📝 FINAL TRANSCRIPT RECEIVED:', transcript.text);
        this.addToConversationHistory('prospect', transcript.text, transcript.timestamp);
        
        // CRITICAL DEBUG: Track accumulation
        const beforeLength = this.pendingTranscript?.length || 0;
        this.pendingTranscript += transcript.text + ' ';
        
        // MEMORY SAFETY: Keep only last 2000 chars to prevent unbounded growth
        if (this.pendingTranscript.length > 2000) {
          this.pendingTranscript = this.pendingTranscript.slice(-1500); // Keep last 1500 chars
          console.log('🔄 Trimmed pending transcript to prevent memory leak');
        }
        
        const afterLength = this.pendingTranscript.length;
        
        console.log('🔴 TRANSCRIPT ACCUMULATION:', {
          receivedText: transcript.text,
          receivedLength: transcript.text.length,
          beforeAccumulation: beforeLength,
          afterAccumulation: afterLength,
          pendingContent: this.pendingTranscript,
          minRequired: this.config.coaching.minTranscriptLength
        });
        
        console.log('📊 PENDING TRANSCRIPT LENGTH:', this.pendingTranscript.length, 'MIN REQUIRED:', this.config.coaching.minTranscriptLength);
        
        // Trigger IMMEDIATE coaching analysis for live coaching
        if (this.config.coaching.enableRealTimeAnalysis && this.pendingTranscript.length >= this.config.coaching.minTranscriptLength) {
          console.log('🎯 TRIGGERING REAL-TIME ANALYSIS!');
          this.triggerRealTimeAnalysis(transcript.text);
        } else {
          console.log('⏳ NOT ENOUGH TEXT YET OR ANALYSIS DISABLED');
        }
      }
    });

    // Handle WebSocket status
    this.webSocketClient.onStatus((status: string) => {
      this.trail.light(6211, {
        operation: 'websocket_status_update',
        status: status,
        timestamp: Date.now()
      });
      
      this.onStatusCallback?.(`Transcription: ${status}`);
    });

    // Handle WebSocket errors  
    this.webSocketClient.onError((error: string) => {
      this.trail.fail(8211, new Error(`WebSocket error: ${error}`));
      this.onErrorCallback?.(`Transcription error: ${error}`);
    });
  }

  async initialize(): Promise<boolean> {
    try {
      this.trail.light(6201, { operation: 'live_coaching_initialization_start' });

      // Test Ollama connection
      console.log('🔌 Testing Ollama connection...');
      const ollamaConnected = await this.ollamaService.testConnection();
      if (!ollamaConnected) {
        console.error('❌ Ollama connection failed');
        throw new Error('Failed to connect to Ollama service');
      }
      console.log('✅ Ollama connected');

      // REMOVED WebSocket connection here - it will connect when coaching starts
      // WebSocket should only connect when user presses Start button, not during initialization
      console.log('📝 WebSocket will connect when coaching session starts (not during init)');

      this.trail.light(6202, {
        operation: 'live_coaching_initialization_complete',
        ollamaConnected,
        websocketDelayed: true, // WebSocket connection delayed until start
        timestamp: Date.now()
      });

      this.onStatusCallback?.('Live coaching initialized successfully');
      return true;

    } catch (error) {
      this.trail.fail(8201, error as Error);
      this.onErrorCallback?.(`Initialization failed: ${(error as Error).message}`);
      return false;
    }
  }

  async loadProcessedDocument(document: any): Promise<boolean> {
    try {
      this.trail.light(6220, {
        operation: 'document_loading',
        documentName: document.name,
        hasTechniques: !!document.techniques || !!document.documentContent?.techniques,
        hasPatterns: !!document.response_patterns || !!document.documentContent?.response_patterns
      });

      // Store the document - support both old and new formats
      const docContent = document.documentContent || document;
      
      // Check if this is the new stage-based format
      if (docContent.stages) {
        // New stage-based format
        this.currentDocument = {
          name: document.name,
          originalContent: document.originalContent,
          documentContent: docContent,
          stages: docContent.stages,
          progressions: docContent.progressions,
          universal: docContent.universal,
          customerTypes: docContent.customerTypes,
          frameworks: docContent.frameworks,
          // For backward compatibility, extract techniques from stages
          techniques: this.extractTechniquesFromStages(docContent),
          response_patterns: this.extractResponsePatternsFromStages(docContent)
        };
      } else {
        // Old format
        this.currentDocument = {
          name: document.name,
          originalContent: document.originalContent,
          documentContent: docContent,
          techniques: docContent.techniques || docContent.predictive_techniques,
          response_patterns: docContent.response_patterns
        };
      }
      
      // NEW: Index the document for intelligent prompt building
      const indexSuccess = await this.ollamaService.loadAndIndexDocument(
        document.documentContent || document
      );
      
      if (indexSuccess) {
        console.log('✅ Document indexed for intelligent prompt building');
        this.trail.light(6221, {
          operation: 'document_indexed_for_coaching',
          intelligent_indexing: true
        });
      } else {
        console.log('⚠️ Using full document mode (indexing failed)');
      }
      
      this.conversationHistory = []; // Reset conversation when loading new document
      this.pendingTranscript = '';

      this.onStatusCallback?.(`Document loaded: ${document.name}`);
      
      this.trail.light(6222, {
        operation: 'document_loaded_successfully',
        techniqueCount: this.currentDocument.techniques?.length || 0
      });

      return true;

    } catch (error) {
      this.trail.fail(8220, error as Error);
      this.onErrorCallback?.(`Failed to load document: ${(error as Error).message}`);
      return false;
    }
  }

  async startLiveCoaching(): Promise<boolean> {
    try {
      this.trail.light(6230, {
        operation: 'live_coaching_start',
        hasDocument: !!this.currentDocument,
        timestamp: Date.now()
      });

      if (!this.currentDocument) {
        throw new Error('No document loaded for coaching');
      }

      // Connect WebSocket first (delayed from initialization to actual start)
      console.log('🔌 Connecting to WebSocket transcription service...');
      const websocketConnected = await this.webSocketClient.connect();
      if (!websocketConnected) {
        console.error('❌ WebSocket connection failed');
        throw new Error('Failed to connect to transcription service');
      }
      console.log('✅ WebSocket connected');

      // Start transcription
      const transcriptionStarted = await this.webSocketClient.startTranscription();
      if (!transcriptionStarted) {
        throw new Error('Failed to start transcription');
      }

      this.onStatusCallback?.('Live coaching session started');
      
      this.trail.light(6231, {
        operation: 'live_coaching_session_active',
        documentName: this.currentDocument.name,
        timestamp: Date.now()
      });

      return true;

    } catch (error) {
      this.trail.fail(8230, error as Error);
      this.onErrorCallback?.(`Failed to start coaching: ${(error as Error).message}`);
      return false;
    }
  }

  stopLiveCoaching(): boolean {
    try {
      this.trail.light(6240, { operation: 'live_coaching_stop' });

      // Stop transcription
      this.webSocketClient.stopTranscription();

      // Clear debounce timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = undefined;
      }

      this.onStatusCallback?.('Live coaching session stopped');
      
      this.trail.light(6241, {
        operation: 'live_coaching_session_stopped',
        totalConversationItems: this.conversationHistory.length,
        timestamp: Date.now()
      });

      return true;

    } catch (error) {
      this.trail.fail(8240, error as Error);
      this.onErrorCallback?.(`Error stopping coaching: ${(error as Error).message}`);
      return false;
    }
  }

  private triggerRealTimeAnalysis(finalTranscript: string): void {
    // Don't analyze if already analyzing or no document loaded
    if (this.isAnalyzing || !this.currentDocument) {
      return;
    }

    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce rapid-fire transcripts to prevent spam (100-200ms delay)
    this.debounceTimer = setTimeout(() => {
      this.performRealTimeAnalysis(finalTranscript);
    }, this.config.coaching.debounceMs);

    this.trail.light(6250, {
      operation: 'real_time_analysis_triggered',
      transcriptLength: finalTranscript.length,
      pendingLength: this.pendingTranscript.length,
      debounceMs: this.config.coaching.debounceMs
    });
  }

  private async performRealTimeAnalysis(triggerTranscript: string): Promise<void> {
    if (this.isAnalyzing || !this.currentDocument) {
      return;
    }

    this.isAnalyzing = true;

    try {
      this.trail.light(6251, {
        operation: 'real_time_analysis_start',
        triggerTranscript: triggerTranscript,
        triggerLength: triggerTranscript.length,
        totalPendingLength: this.pendingTranscript.length,
        historyLength: this.conversationHistory.length
      });

      // Build coaching context - use document directly, no phases
      if (!this.currentDocument) {
        console.log('❌❌❌ NO DOCUMENT LOADED IN LIVE COACHING SERVICE!');
        return;
      }
      
      // CRITICAL DEBUG: What's in pendingTranscript?
      console.log('🔴🔴🔴 PENDING TRANSCRIPT CHECK:', {
        pendingTranscriptLength: this.pendingTranscript?.length || 0,
        pendingTranscriptContent: this.pendingTranscript || '[EMPTY]',
        pendingTranscriptFirst100: this.pendingTranscript?.substring(0, 100) || '[EMPTY]',
        pendingTranscriptTrimmed: this.pendingTranscript?.trim() || '[EMPTY AFTER TRIM]'
      });
      
      const context: CoachingContext = {
        originalDocument: this.currentDocument.originalContent,
        processedInsights: this.currentDocument.documentContent || this.currentDocument,
        conversationHistory: this.conversationHistory.slice(-this.config.coaching.maxHistoryLength),
        currentTranscript: this.pendingTranscript
      };
      
      console.log('📊 Context being sent:', {
        hasDocument: !!this.currentDocument,
        documentName: this.currentDocument.name,
        hasTechniques: !!(this.currentDocument.techniques || this.currentDocument.documentContent?.techniques || this.currentDocument.documentContent?.predictive_techniques),
        transcriptLength: this.pendingTranscript.length,
        contextTranscriptLength: context.currentTranscript?.length || 0,
        contextTranscriptContent: context.currentTranscript?.substring(0, 100) || '[EMPTY IN CONTEXT]'
      });

      // Get coaching suggestion from Ollama
      const suggestion = await this.ollamaService.generateCoachingSuggestion(context);

      if (suggestion) {
        // Convert to WebSocket format and emit
        const coachingSuggestion: CoachingSuggestion = {
          type: 'coaching_suggestion',
          suggestion: suggestion.suggestion,
          trigger: suggestion.trigger,
          priority: suggestion.priority,
          category: suggestion.category as any,
          context: suggestion.context,
          timestamp: new Date().toISOString(),
          breadcrumb: 6252
        };

        this.trail.light(6252, {
          operation: 'real_time_coaching_suggestion_generated',
          priority: suggestion.priority,
          category: suggestion.category,
          confidence: suggestion.confidence,
          responseTimeMs: Date.now() - new Date().getTime() // Approximate response time
        });

        // Emit coaching suggestion
        this.onCoachingSuggestionCallback?.(coachingSuggestion);

        // Clear pending transcript after analysis
        this.pendingTranscript = '';
      }

    } catch (error) {
      this.trail.fail(8251, error as Error);
      this.onErrorCallback?.(`Coaching analysis error: ${(error as Error).message}`);
    } finally {
      this.isAnalyzing = false;
    }
  }

  private addToConversationHistory(speaker: 'user' | 'prospect', text: string, timestamp: string): void {
    this.conversationHistory.push({ speaker, text, timestamp });
    
    // Trim history if too long
    if (this.conversationHistory.length > this.config.coaching.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.config.coaching.maxHistoryLength);
    }

    this.trail.light(6260, {
      operation: 'conversation_history_updated',
      speaker,
      textLength: text.length,
      totalHistoryItems: this.conversationHistory.length
    });
  }

  // Event listeners
  onCoachingSuggestion(callback: (suggestion: CoachingSuggestion) => void): void {
    this.onCoachingSuggestionCallback = callback;
  }

  onTranscript(callback: (transcript: TranscriptEvent) => void): void {
    this.onTranscriptCallback = callback;
  }

  onStatus(callback: (status: string) => void): void {
    this.onStatusCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  // Status and debugging
  getStatus(): {
    websocketConnected: boolean;
    ollamaConnected: boolean;
    documentLoaded: boolean;
    conversationLength: number;
    isAnalyzing: boolean;
  } {
    return {
      websocketConnected: this.webSocketClient.isConnected,
      ollamaConnected: this.ollamaService.getStatus().connected,
      documentLoaded: !!this.currentDocument,
      conversationLength: this.conversationHistory.length,
      isAnalyzing: this.isAnalyzing
    };
  }

  getCurrentDocument(): ProcessedDocument | null {
    return this.currentDocument;
  }

  getConversationHistory(): Array<{ speaker: 'user' | 'prospect'; text: string; timestamp: string }> {
    return [...this.conversationHistory];
  }

  /**
   * Extract techniques from stage-based document for backward compatibility
   */
  private extractTechniquesFromStages(document: any): any[] {
    const techniques: any[] = [];
    
    if (!document.stages) return techniques;
    
    // Extract from each stage
    for (const [stageName, stage] of Object.entries(document.stages)) {
      const stageData = stage as any;
      
      // Convert bridges to techniques
      if (stageData.bridges) {
        stageData.bridges.forEach((bridge: any, index: number) => {
          techniques.push({
            technique_name: `${stageData.name} - Bridge ${index + 1}`,
            stage: stageName,
            priority: bridge.priority,
            conversation_paths: [{
              trigger: stageData.keywords?.join(' ') || stageName,
              immediate_response: {
                exact_words: bridge.text,
                strategy: `${stageName} stage, priority: ${bridge.priority}`
              }
            }]
          });
        });
      }
      
      // Convert recovery patterns to techniques
      if (stageData.recovery) {
        stageData.recovery.forEach((recovery: string, index: number) => {
          techniques.push({
            technique_name: `${stageData.name} - Recovery ${index + 1}`,
            stage: stageName,
            conversation_paths: [{
              trigger: 'conversation stalled',
              immediate_response: {
                exact_words: recovery,
                strategy: `Recovery for ${stageName} stage`
              }
            }]
          });
        });
      }
      
      // Include actual techniques if present
      if (stageData.techniques) {
        stageData.techniques.forEach((technique: any) => {
          techniques.push({
            technique_name: technique.name,
            stage: stageName,
            description: technique.description,
            conversation_paths: [{
              trigger: technique.timing || stageName,
              immediate_response: {
                exact_words: technique.example,
                strategy: technique.name
              }
            }]
          });
        });
      }
    }
    
    // Add universal techniques
    if (document.universal) {
      // Add mirroring
      if (document.universal.mirroring) {
        techniques.push({
          technique_name: 'Universal - Mirroring',
          stage: 'all',
          conversation_paths: [{
            trigger: 'any',
            immediate_response: {
              exact_words: 'Repeat last 1-3 words',
              strategy: 'mirroring'
            }
          }]
        });
      }
      
      // Add labeling
      if (document.universal.labeling) {
        techniques.push({
          technique_name: 'Universal - Labeling',
          stage: 'all',
          conversation_paths: [{
            trigger: 'emotional response',
            immediate_response: {
              exact_words: 'It sounds like you\'re [emotion]',
              strategy: 'labeling'
            }
          }]
        });
      }
    }
    
    return techniques;
  }
  
  /**
   * Extract response patterns from stage-based document
   */
  private extractResponsePatternsFromStages(document: any): any {
    const patterns: any = {};
    
    if (!document.stages) return patterns;
    
    // Extract objection patterns
    if (document.stages.objection) {
      const objectionStage = document.stages.objection as any;
      
      if (objectionStage.objection_patterns) {
        patterns.objection_responses = {};
        objectionStage.objection_patterns.forEach((pattern: any) => {
          patterns.objection_responses[pattern.objection] = {
            real_concern: pattern.real_concern,
            response: pattern.response
          };
        });
      }
    }
    
    // Extract recovery patterns
    patterns.recovery_patterns = {};
    for (const [stageName, stage] of Object.entries(document.stages)) {
      const stageData = stage as any;
      if (stageData.recovery) {
        patterns.recovery_patterns[stageName] = stageData.recovery;
      }
    }
    
    return patterns;
  }

  disconnect(): void {
    this.trail.light(6270, { operation: 'live_coaching_disconnect' });
    
    this.stopLiveCoaching();
    this.webSocketClient.disconnect();

    this.trail.light(6271, { operation: 'live_coaching_disconnected_cleanly' });
  }
}