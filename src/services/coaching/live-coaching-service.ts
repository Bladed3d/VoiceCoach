/**
 * VoiceCoach V2 - Live Coaching Integration Service (Template System)
 * Clean refactor using ToolTemplateEngine + PatternMatchingLibrary
 * Flow: Transcript → Pattern Match → (fallback) AI Tool Selection → Fill Template → Display
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { TranscriptEvent } from '../websocket/simple-websocket-client';
import { CoachingSuggestion } from '../websocket/websocket-client';
import { OllamaCoachingService, OllamaConfig, CoachingContext } from './ollama-service';
import { SessionManagerService } from './SessionManagerService';
import { ToolTemplateEngine, TemplateResult } from './ToolTemplateEngine';
import { PatternMatchingLibrary, MatchingContext } from './PatternMatchingLibrary';
import { ToolUsageTracker } from './ToolUsageTracker';
import { OllamaPromptService, ollamaPromptService } from './OllamaPromptService';

export interface LiveCoachingConfig {
  ollama: OllamaConfig;
  websocket: {
    serverUrl: string;
  };
  coaching: {
    minTranscriptLength: number;
    maxHistoryLength: number;
    enableRealTimeAnalysis: boolean;
    debounceMs: number;
  };
}

export interface ConversationEntry {
  speaker: 'user' | 'prospect';
  text: string;
  timestamp: string;
}

export interface ProcessedDocument {
  name: string;
  originalContent: string;
  documentContent?: any;
  loadedTimestamp?: string;
}

export class LiveCoachingService {
  private trail: BreadcrumbTrail;
  private config: LiveCoachingConfig;

  // Core services
  private ollamaService: OllamaCoachingService;
  private ollamaPromptService: OllamaPromptService;
  private templateEngine: ToolTemplateEngine;
  private patternMatcher: PatternMatchingLibrary;
  private usageTracker: ToolUsageTracker;

  // Session state
  private sessionManager: SessionManagerService | null = null;
  private currentDocument: ProcessedDocument | null = null;
  private conversationHistory: ConversationEntry[] = [];
  private pendingTranscript: string = '';
  private isAnalyzing: boolean = false;
  private debounceTimer?: NodeJS.Timeout;
  private lastSpeaker: 'user' | 'prospect' = 'user';
  private isConnectedToTranscripts: boolean = false;

  // Event callbacks
  private onCoachingSuggestionCallback?: (suggestion: CoachingSuggestion) => void;
  private onTranscriptCallback?: (transcript: TranscriptEvent) => void;
  private onStatusCallback?: (status: string) => void;
  private onErrorCallback?: (error: string) => void;

  constructor(config: LiveCoachingConfig) {
    this.trail = new BreadcrumbTrail('LiveCoaching');
    this.config = config;

    // Initialize core services
    this.ollamaService = new OllamaCoachingService(config.ollama);
    // Use singleton instance so Settings reload affects coaching
    this.ollamaPromptService = ollamaPromptService;
    // Get user-selected RAG file from localStorage (same as Documents selector)
    let ragFilePath = 'rag/13ToolsRAG-01-templates.json'; // Default fallback
    try {
      const selectedDocs = localStorage.getItem('voicecoach-selected-documents');
      if (selectedDocs) {
        const docs = JSON.parse(selectedDocs);
        // Use first selected document if it's a template file
        if (docs.length > 0 && docs[0].includes('template')) {
          ragFilePath = docs[0];

          // DEFENSIVE: Fix old localStorage data missing 'rag/' prefix
          if (!ragFilePath.includes('/') && !ragFilePath.startsWith('rag/')) {
            console.warn(`⚠️ Fixing RAG path missing 'rag/' prefix: ${ragFilePath}`);
            ragFilePath = `rag/${ragFilePath}`;
          }
        }
      }
    } catch (e) {
      console.warn('Could not load selected documents, using default:', e);
    }

    console.log('🔧 LiveCoachingService: Using RAG file:', ragFilePath);
    this.templateEngine = new ToolTemplateEngine(ragFilePath);
    this.patternMatcher = new PatternMatchingLibrary(this.templateEngine);
    this.usageTracker = new ToolUsageTracker();

    this.trail.light(6200, {
      operation: 'live_coaching_service_constructor_complete',
      ollamaModel: config.ollama.model,
      templateSystem: true,
      timestamp: Date.now()
    });

    console.log('✅ LiveCoachingService constructor complete - call initialize() to load templates');
  }

  async initialize(): Promise<boolean> {
    try {
      // CRITICAL: Load templates before using PatternMatchingLibrary!
      console.log('🔧 LiveCoachingService: Loading templates...');
      await this.templateEngine.loadConfig();
      console.log('✅ LiveCoachingService: Templates loaded successfully');
      this.trail.light(6201, { operation: 'live_coaching_initialization_start' });
      console.log('🔍 LiveCoachingService.initialize(): Starting initialization...');

      // Templates already loaded above
      console.log(`✅ Template engine loaded: ${this.templateEngine.getToolCount()} tools`);

      // Test Ollama connection (non-blocking - pattern matching works without Ollama)
      console.log('🔌 Testing Ollama connection...');
      const ollamaConnected = await this.ollamaService.testConnection();
      if (ollamaConnected) {
        console.log('✅ Ollama connected');
      } else {
        console.warn('⚠️ Ollama not connected - pattern matching will work, AI fallback may be limited');
      }

      this.trail.light(6202, {
        operation: 'live_coaching_initialization_complete',
        ollamaConnected,
        toolCount: this.templateEngine.getToolCount(),
        timestamp: Date.now()
      });

      this.onStatusCallback?.('Live coaching initialized with template system');
      return true; // Return true even if Ollama isn't connected - pattern matching works standalone

    } catch (error) {
      this.trail.fail(8201, error as Error);
      console.error('❌ LiveCoachingService.initialize() error:', error);
      this.onErrorCallback?.(`Initialization failed: ${(error as Error).message}`);
      return false;
    }
  }

  async loadProcessedDocument(document: any): Promise<boolean> {
    try {
      this.trail.light(6220, {
        operation: 'document_loading',
        documentName: document.name
      });

      this.currentDocument = {
        name: document.name,
        originalContent: document.originalContent,
        documentContent: document.documentContent || document,
        loadedTimestamp: new Date().toISOString()
      };

      // Index document for Ollama (for AI tool selection fallback)
      await this.ollamaService.loadAndIndexDocument(
        document.documentContent || document
      );

      this.conversationHistory = [];
      this.pendingTranscript = '';

      this.trail.light(6222, {
        operation: 'document_loaded_successfully',
        documentName: document.name
      });

      this.onStatusCallback?.(`Document loaded: ${document.name}`);
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

      this.conversationHistory = [];
      this.pendingTranscript = '';
      this.usageTracker.clearUsageData();

      console.log('🔌 Live coaching ready with Template System');

      this.trail.light(6231, {
        operation: 'live_coaching_session_active',
        documentName: this.currentDocument.name,
        timestamp: Date.now()
      });

      this.onStatusCallback?.('Live coaching session started');
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

      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = undefined;
      }

      this.isAnalyzing = false;
      this.pendingTranscript = '';

      // Export usage statistics
      const usageData = this.usageTracker.exportUsageData();
      console.log('📊 Session Statistics:', usageData.summary);

      this.trail.light(6241, {
        operation: 'live_coaching_session_stopped',
        totalConversationItems: this.conversationHistory.length,
        toolsShown: usageData.summary.totalToolsShown,
        toolsUsed: usageData.summary.totalToolsUsed,
        usageRate: usageData.summary.overallUsageRate,
        timestamp: Date.now()
      });

      this.onStatusCallback?.('Live coaching session stopped');
      return true;

    } catch (error) {
      this.trail.fail(8240, error as Error);
      this.onErrorCallback?.(`Error stopping coaching: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Main entry point: Process transcript with debouncing
   */
  private async triggerRealTimeAnalysis(finalTranscript: string): Promise<void> {
    if (this.isAnalyzing || !this.currentDocument) {
      return;
    }

    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce: wait for typing to settle
    this.debounceTimer = setTimeout(async () => {
      await this.generatePromptViaTemplates(finalTranscript);
    }, this.config.coaching.debounceMs);

    this.trail.light(6250, {
      operation: 'real_time_analysis_triggered',
      transcriptLength: finalTranscript.length,
      debounceMs: this.config.coaching.debounceMs
    });
  }

  /**
   * NEW: Generate coaching prompt using template system
   * Flow: Pattern Match → (fallback) AI Tool Selection → Fill Template → Display
   */
  private async generatePromptViaTemplates(transcript: string): Promise<void> {
    if (this.isAnalyzing) return;

    this.isAnalyzing = true;

    try {
      const startTime = performance.now();

      // Step 1: Analyze sentiment (simple, fast)
      const sentiment = this.analyzeSentiment(transcript);
      const stage = this.getCurrentStage();

      this.trail.light(6251, {
        operation: 'sentiment_analysis_complete',
        sentiment: sentiment,
        stage: stage,
        transcriptLength: transcript.length
      });

      // Step 2: Try pattern matching (instant, 60-70% hit rate)
      const matchingContext: MatchingContext = {
        transcript,
        sentiment: sentiment as 'positive' | 'negative' | 'neutral',
        stage,
        conversationHistory: this.conversationHistory
      };

      const patternMatch = this.patternMatcher.matchTool(matchingContext);

      let toolId: number;
      let toolName: string;
      let matchType: 'pattern' | 'ai';

      if (patternMatch) {
        // Pattern match successful!
        toolId = patternMatch.toolId;
        toolName = patternMatch.toolName;
        matchType = 'pattern';

        this.trail.light(6252, {
          operation: 'pattern_match_success',
          toolId,
          toolName,
          matchType: patternMatch.matchType,
          score: patternMatch.score,
          processingTime: performance.now() - startTime
        });

        console.log(`✅ Pattern Match: Tool ${toolId} (${toolName}) - Score: ${patternMatch.score}`);

        // Update window title to show pattern matching is working
        if (typeof document !== 'undefined') {
          const titleMatch = document.title.match(/PM:(\d+)/);
          const count = titleMatch ? parseInt(titleMatch[1]) + 1 : 1;
          document.title = document.title.replace(/PM:\d+/, `PM:${count}`).replace(/\| VoiceCoach/, `PM:${count} | VoiceCoach`);
          if (!document.title.includes('PM:')) {
            document.title = `PM:${count} | ${document.title}`;
          }
        }

      } else {
        // Pattern match failed, fall back to AI selection
        const aiToolId = await this.selectToolViaAI(transcript, sentiment, stage);

        if (!aiToolId) {
          // AI also failed, use default based on sentiment
          toolId = 1; // Default to Mirroring
          toolName = 'Mirroring';
          matchType = 'ai';
        } else {
          toolId = aiToolId;
          const tool = this.templateEngine.getTool(toolId);
          toolName = tool?.name || `Tool ${toolId}`;
          matchType = 'ai';

          this.trail.light(6253, {
            operation: 'ai_tool_selection_success',
            toolId,
            toolName,
            processingTime: performance.now() - startTime
          });

          console.log(`🤖 AI Selection: Tool ${toolId} (${toolName})`);
        }
      }

      // Step 3: Extract variables and fill template
      let variables: Record<string, string> = {};

      // Try simple extraction first (instant for tools 1, 5, 13)
      const simpleVars = this.templateEngine.extractSimpleVariables(toolId, transcript);

      if (simpleVars) {
        variables = simpleVars;
      } else {
        // Need AI for variable extraction
        variables = await this.extractVariablesViaAI(toolId, transcript);
      }

      // Fill template
      const templateResult = this.templateEngine.fillTemplate(toolId, variables);

      this.trail.light(6254, {
        operation: 'template_filled',
        toolId,
        toolName,
        variableCount: Object.keys(variables).length,
        promptLength: templateResult.filledPrompt.length,
        totalProcessingTime: performance.now() - startTime
      });

      // Step 4: Send to UI
      await this.sendPromptToUI(templateResult, matchType);

      // Step 5: Log usage for learning
      this.usageTracker.logToolShown(toolId, toolName, {
        transcript,
        sentiment,
        stage,
        matchType
      });

    } catch (error) {
      this.trail.fail(8251, error as Error);
      console.error('❌ Template generation failed:', error);
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * NEW: Select tool using AI (fallback when pattern matching fails)
   * Returns just the tool ID (1-13), not full text
   */
  private async selectToolViaAI(
    transcript: string,
    sentiment: string,
    stage: number
  ): Promise<number | null> {
    try {
      // Use OllamaPromptService.generateCoaching for proper instruction file usage
      const tools = this.templateEngine.getAllTools();

      const result = await this.ollamaPromptService.generateCoaching({
        transcript,
        sentiment,
        salesStage: stage.toString(),
        tools, // Pass tools from ToolTemplateEngine
        topics: [],
        objections: []
      });

      if (!result.success || !result.response) {
        return null;
      }

      const response = result.response;

      // Try to parse as JSON first (expert-patterns format)
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.tool_id && parsed.tool_id >= 1 && parsed.tool_id <= 13) {
            return parsed.tool_id;
          }
        }
      } catch {
        // Not JSON, try number extraction
      }

      // Fallback: Extract number from response
      const toolIdMatch = response.match(/\d+/);
      if (toolIdMatch) {
        const toolId = parseInt(toolIdMatch[0], 10);
        if (toolId >= 1 && toolId <= 13) {
          return toolId;
        }
      }

      return null;

    } catch (error) {
      this.trail.fail(8252, error as Error);
      return null;
    }
  }

  /**
   * Extract variables from transcript using AI
   */
  private async extractVariablesViaAI(
    toolId: number,
    transcript: string
  ): Promise<Record<string, string>> {
    try {
      const tool = this.templateEngine.getTool(toolId);
      if (!tool) return {};

      const variables: Record<string, string> = {};

      // Extract each variable using AI
      for (const [varName, extraction] of Object.entries(tool.variableExtraction)) {
        if (extraction.method === 'ai' && extraction.prompt) {
          const prompt = `${extraction.prompt}\n\nTranscript: "${transcript}"\n\nExtract and respond with just the extracted text, nothing else.`;

          const response = await this.ollamaService.generateRawResponse(prompt);
          variables[varName] = response?.trim() || extraction.fallback || '';
        } else if (extraction.fallback) {
          variables[varName] = extraction.fallback;
        }
      }

      return variables;

    } catch (error) {
      this.trail.fail(8253, error as Error);
      return {};
    }
  }

  /**
   * NEW: Send filled template to UI
   */
  private async sendPromptToUI(
    templateResult: TemplateResult,
    matchType: 'pattern' | 'ai'
  ): Promise<void> {
    const suggestionText = `Tool: ${templateResult.toolName}\n${templateResult.filledPrompt}`;

    const suggestion: CoachingSuggestion = {
      type: 'coaching_suggestion',
      suggestion: suggestionText,
      trigger: `${matchType === 'pattern' ? 'Pattern' : 'AI'}: ${templateResult.toolName}`,
      priority: matchType === 'pattern' ? 'HIGH' : 'MEDIUM',
      category: templateResult.toolName as any,
      context: JSON.stringify({
        toolId: templateResult.toolId,
        toolName: templateResult.toolName,
        confidence: templateResult.confidence,
        matchType,
        variables: templateResult.variables,
        processingTime: templateResult.processingTime
      }),
      timestamp: new Date().toISOString(),
      breadcrumb: 6255
    };

    this.trail.light(6255, {
      operation: 'coaching_suggestion_sent_to_ui',
      toolId: templateResult.toolId,
      toolName: templateResult.toolName,
      confidence,
      matchType,
      promptLength: templateResult.filledPrompt.length
    });

    // Note: SessionManager notification removed - handled via callback

    // Emit to callback
    this.onCoachingSuggestionCallback?.(suggestion);

    console.log('📤 Coaching Suggestion:', {
      tool: templateResult.toolName,
      prompt: templateResult.filledPrompt,
      confidence,
      matchType
    });
  }

  /**
   * Simple sentiment analysis (positive/negative/neutral)
   */
  private analyzeSentiment(text: string): string {
    const lowerText = text.toLowerCase();

    // Negative indicators
    const negativeWords = ['expensive', 'cost', 'worried', 'concerned', 'frustrated', 'problem',
                           'difficult', 'challenge', 'not sure', 'doubt', 'skeptical'];
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    // Positive indicators
    const positiveWords = ['interested', 'great', 'good', 'excellent', 'love', 'excited',
                           'helpful', 'perfect', 'yes', 'absolutely'];
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;

    if (negativeCount > positiveCount) return 'negative';
    if (positiveCount > negativeCount) return 'positive';
    return 'neutral';
  }

  /**
   * Get current sales stage (1-9)
   */
  private getCurrentStage(): number {
    // Simple heuristic based on conversation length
    const messageCount = this.conversationHistory.length;

    if (messageCount < 3) return 1; // Rapport
    if (messageCount < 6) return 2; // Discovery
    if (messageCount < 10) return 3; // Pain
    if (messageCount < 15) return 4; // Impact
    if (messageCount < 20) return 5; // Solution
    if (messageCount < 25) return 6; // Objection
    if (messageCount < 30) return 7; // Close
    return 8; // Follow-up
  }

  /**
   * Add message to conversation history
   */
  private addToConversationHistory(speaker: 'user' | 'prospect', text: string, timestamp: string): void {
    this.conversationHistory.push({ speaker, text, timestamp });

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

  /**
   * Handle transcript from SessionManager
   */
  private async handleTranscriptFromSessionManager(
    transcript: TranscriptEvent,
    speaker: 'user' | 'prospect'
  ): Promise<void> {
    this.trail.light(6275, {
      operation: 'transcript_received',
      type: transcript.type,
      speaker,
      length: transcript.text.length
    });

    this.onTranscriptCallback?.(transcript);

    const isSignificant = (
      transcript.type === 'final_transcript' ||
      (transcript.type === 'partial_transcript' && transcript.text.trim().length >= this.config.coaching.minTranscriptLength)
    );

    if (isSignificant && transcript.text.trim()) {
      // Track speaker changes
      if (speaker !== this.lastSpeaker) {
        console.log(`🎯 Speaker change: ${this.lastSpeaker} → ${speaker}`);
        this.lastSpeaker = speaker;
      }

      // Add to history
      this.addToConversationHistory(speaker, transcript.text, transcript.timestamp);

      // Only coach on PROSPECT speech
      if (speaker === 'prospect') {
        this.pendingTranscript += transcript.text + ' ';

        // Memory safety
        if (this.pendingTranscript.length > 2000) {
          this.pendingTranscript = this.pendingTranscript.slice(-1500);
        }

        // Trigger coaching
        if (this.config.coaching.enableRealTimeAnalysis &&
            this.pendingTranscript.length >= this.config.coaching.minTranscriptLength) {
          await this.triggerRealTimeAnalysis(transcript.text);
        }
      }
    }
  }

  /**
   * Connect to SessionManager
   */
  setSessionManager(sessionManager: SessionManagerService): void {
    this.sessionManager = sessionManager;
    this.subscribeToTranscripts();

    this.trail.light(6272, {
      operation: 'session_manager_connected',
      timestamp: Date.now()
    });
  }

  /**
   * Subscribe to transcripts
   */
  private subscribeToTranscripts(): void {
    if (!this.sessionManager || this.isConnectedToTranscripts) return;

    this.sessionManager.onTranscriptProcessed((transcript: TranscriptEvent, speaker: 'user' | 'prospect') => {
      this.handleTranscriptFromSessionManager(transcript, speaker);
    });

    this.isConnectedToTranscripts = true;

    this.trail.light(6274, {
      operation: 'transcript_subscription_established'
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

  // Status methods
  getStatus(): {
    websocketConnected: boolean;
    ollamaConnected: boolean;
    documentLoaded: boolean;
    conversationLength: number;
    isAnalyzing: boolean;
  } {
    return {
      websocketConnected: !!this.sessionManager,
      ollamaConnected: this.ollamaService.getStatus().connected,
      documentLoaded: !!this.currentDocument,
      conversationLength: this.conversationHistory.length,
      isAnalyzing: this.isAnalyzing
    };
  }

  getCurrentDocument(): ProcessedDocument | null {
    return this.currentDocument;
  }

  getConversationHistory(): ConversationEntry[] {
    return [...this.conversationHistory];
  }

  getUsageStatistics() {
    return this.usageTracker.exportUsageData();
  }

  disconnect(): void {
    this.trail.light(6270, { operation: 'live_coaching_disconnect' });

    this.stopLiveCoaching();
    this.isConnectedToTranscripts = false;
    this.sessionManager = null;

    this.trail.light(6271, { operation: 'live_coaching_disconnected' });
  }
}
