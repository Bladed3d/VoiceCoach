/**
 * VoiceCoach V2 - Enhanced Ollama Integration Service
 * Implements the comprehensive coaching instructions system
 * This version replicates the successful patterns from old VoiceCoach
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { OllamaPromptBuilder, CoachingContext as PromptContext, CoachingResponse as StructuredResponse } from './OllamaPromptBuilder';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
}

// Enhanced context with all the fields needed for rich coaching
export interface EnhancedCoachingContext {
  // Core conversation data
  currentTranscript: string;
  conversationHistory: Array<{
    speaker: 'user' | 'prospect';
    text: string;
    timestamp: string;
  }>;
  
  // Sales context (what old app had)
  callStartTime?: Date;
  callDuration?: number; // calculated from callStartTime
  
  // Document insights
  processedInsights?: any;
  
  // Detection flags (will be auto-detected if not provided)
  detectedObjections?: string[];
  detectedTopics?: string[];
  detectedBuyingSignals?: string[];
  currentSalesStage?: 'discovery' | 'demo' | 'objection_handling' | 'closing' | 'unknown';
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
}

export class EnhancedOllamaService {
  private trail: BreadcrumbTrail;
  private config: OllamaConfig;
  private promptBuilder: OllamaPromptBuilder;
  private isConnected: boolean = false;
  
  // Track conversation state
  private conversationStartTime: Date | null = null;
  private lastSalesStage: string = 'discovery';
  private objectionHistory: string[] = [];
  private topicHistory: string[] = [];
  
  constructor(config: OllamaConfig) {
    this.trail = new BreadcrumbTrail('EnhancedOllamaService');
    this.config = config;
    this.promptBuilder = new OllamaPromptBuilder();
    
    this.trail.light(6200, {
      operation: 'enhanced_ollama_initialization',
      baseUrl: config.baseUrl,
      model: config.model,
      timestamp: Date.now()
    });
  }
  
  /**
   * Connect to Ollama server
   */
  async connect(): Promise<boolean> {
    try {
      this.trail.light(6201, { operation: 'ollama_connection_attempt' });
      
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        const hasModel = data.models?.some((m: any) => 
          m.name === this.config.model || m.name.includes(this.config.model)
        );
        
        if (hasModel) {
          this.isConnected = true;
          this.trail.light(6202, { 
            connection_successful: true, 
            model_available: this.config.model 
          });
          return true;
        }
      }
      
      throw new Error('Model not available');
      
    } catch (error) {
      this.trail.fail(8201, error as Error);
      return false;
    }
  }
  
  /**
   * Get real-time coaching suggestion with full context
   */
  async getCoachingSuggestion(context: EnhancedCoachingContext): Promise<StructuredResponse | null> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      this.trail.light(6203, {
        operation: 'coaching_request_start',
        transcript_length: context.currentTranscript.length,
        has_insights: !!context.processedInsights
      });
      
      // Track conversation start
      if (!this.conversationStartTime && context.callStartTime) {
        this.conversationStartTime = context.callStartTime;
      }
      
      // Build comprehensive context
      const promptContext = this.buildPromptContext(context);
      
      // Generate system and user prompts
      const systemPrompt = this.promptBuilder.buildSystemPrompt(promptContext);
      const userPrompt = this.promptBuilder.buildUserPrompt(
        context.currentTranscript,
        this.getAdditionalContext(context)
      );
      
      this.trail.light(6204, {
        system_prompt_length: systemPrompt.length,
        user_prompt_length: userPrompt.length,
        sales_stage: promptContext.salesStage,
        urgency: this.promptBuilder.determineUrgency(promptContext)
      });
      
      // Call Ollama with enhanced prompts
      const response = await this.callOllama(systemPrompt, userPrompt);
      
      if (!response) {
        // Use intelligent fallback
        return this.promptBuilder.generateFallbackResponse(promptContext);
      }
      
      // Parse structured response
      const coachingResponse = this.promptBuilder.parseCoachingResponse(response);
      
      if (coachingResponse) {
        // Track successful coaching
        this.trail.light(6205, {
          coaching_generated: true,
          confidence: coachingResponse.confidence_score,
          urgency: coachingResponse.urgency_level,
          suggestion_type: coachingResponse.prompt_type
        });
        
        // Update conversation state
        this.updateConversationState(promptContext, coachingResponse);
      }
      
      return coachingResponse;
      
    } catch (error) {
      this.trail.fail(8202, error as Error);
      // Return intelligent fallback based on context
      const promptContext = this.buildPromptContext(context);
      return this.promptBuilder.generateFallbackResponse(promptContext);
    }
  }
  
  /**
   * Build comprehensive prompt context from enhanced coaching context
   */
  private buildPromptContext(context: EnhancedCoachingContext): PromptContext {
    // Calculate call duration
    const callDuration = this.calculateCallDuration(context);
    
    // Detect sales stage if not provided
    const salesStage = context.currentSalesStage || this.detectSalesStage(context);
    
    // Detect objections if not provided
    const objections = context.detectedObjections || this.detectObjections(context.currentTranscript);
    
    // Detect topics if not provided
    const topics = context.detectedTopics || this.detectTopics(context);
    
    // Detect buying signals
    const buyingSignals = context.detectedBuyingSignals || this.detectBuyingSignals(context.currentTranscript);
    
    // Build knowledge base from insights
    const knowledge = this.buildKnowledgeBase(context.processedInsights);
    
    return {
      salesStage,
      callDuration,
      topics,
      objections,
      currentTranscript: context.currentTranscript,
      buyingSignals,
      sentiment: context.sentiment || this.detectSentiment(context.currentTranscript),
      momentum: this.detectMomentum(context, salesStage),
      knowledge
    };
  }
  
  /**
   * Calculate call duration in minutes
   */
  private calculateCallDuration(context: EnhancedCoachingContext): number {
    if (context.callDuration) return context.callDuration;
    
    if (context.callStartTime) {
      const now = new Date();
      const duration = (now.getTime() - context.callStartTime.getTime()) / 1000 / 60;
      return Math.round(duration);
    }
    
    // Estimate from conversation history
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      // Assume ~30 seconds per exchange
      return Math.round(context.conversationHistory.length * 0.5);
    }
    
    return 0;
  }
  
  /**
   * Detect current sales stage from conversation
   */
  private detectSalesStage(context: EnhancedCoachingContext): 'discovery' | 'demo' | 'objection_handling' | 'closing' | 'unknown' {
    const transcript = context.currentTranscript.toLowerCase();
    
    // Closing indicators
    if (transcript.includes('next steps') || 
        transcript.includes('move forward') ||
        transcript.includes('get started') ||
        transcript.includes('contract') ||
        transcript.includes('agreement')) {
      return 'closing';
    }
    
    // Objection indicators
    if (transcript.includes('expensive') ||
        transcript.includes('concern') ||
        transcript.includes('worried') ||
        transcript.includes('not sure') ||
        transcript.includes('think about it')) {
      return 'objection_handling';
    }
    
    // Demo indicators
    if (transcript.includes('how does') ||
        transcript.includes('show me') ||
        transcript.includes('features') ||
        transcript.includes('capabilities')) {
      return 'demo';
    }
    
    // Discovery indicators
    if (transcript.includes('tell me about') ||
        transcript.includes('what do you') ||
        transcript.includes('current') ||
        transcript.includes('challenge') ||
        transcript.includes('problem')) {
      return 'discovery';
    }
    
    return 'unknown';
  }
  
  /**
   * Detect objections in transcript
   */
  private detectObjections(transcript: string): string[] {
    const objections: string[] = [];
    const transcriptLower = transcript.toLowerCase();
    
    const objectionPatterns = {
      price: ['expensive', 'cost', 'budget', 'afford', 'price'],
      authority: ['boss', 'manager', 'approval', 'decision maker', 'team'],
      need: ['not sure we need', 'already have', 'working fine', 'not a priority'],
      timing: ['not now', 'later', 'next quarter', 'next year', 'bad timing'],
      trust: ['how do I know', 'guarantee', 'proof', 'references']
    };
    
    Object.entries(objectionPatterns).forEach(([type, patterns]) => {
      patterns.forEach(pattern => {
        if (transcriptLower.includes(pattern) && !this.objectionHistory.includes(type)) {
          objections.push(type);
          this.objectionHistory.push(type);
        }
      });
    });
    
    return objections;
  }
  
  /**
   * Detect topics discussed
   */
  private detectTopics(context: EnhancedCoachingContext): string[] {
    const topics = new Set<string>();
    const transcript = context.currentTranscript.toLowerCase();
    
    const topicKeywords = {
      pricing: ['price', 'cost', 'budget', 'investment'],
      features: ['feature', 'capability', 'function', 'tool'],
      implementation: ['setup', 'install', 'deploy', 'integrate'],
      support: ['support', 'help', 'training', 'onboarding'],
      timeline: ['when', 'timeline', 'schedule', 'deadline'],
      competition: ['competitor', 'alternative', 'other option', 'comparison']
    };
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      keywords.forEach(keyword => {
        if (transcript.includes(keyword)) {
          topics.add(topic);
        }
      });
    });
    
    // Add to history
    Array.from(topics).forEach(topic => {
      if (!this.topicHistory.includes(topic)) {
        this.topicHistory.push(topic);
      }
    });
    
    return Array.from(topics);
  }
  
  /**
   * Detect buying signals
   */
  private detectBuyingSignals(transcript: string): string[] {
    const signals: string[] = [];
    const transcriptLower = transcript.toLowerCase();
    
    const buyingPhrases = [
      'how soon',
      'next steps',
      'get started',
      'move forward',
      'send proposal',
      'this could help',
      'i like',
      'impressive',
      'exactly what we need'
    ];
    
    buyingPhrases.forEach(phrase => {
      if (transcriptLower.includes(phrase)) {
        signals.push(phrase);
      }
    });
    
    return signals;
  }
  
  /**
   * Detect sentiment
   */
  private detectSentiment(transcript: string): 'positive' | 'neutral' | 'negative' | 'mixed' {
    const transcriptLower = transcript.toLowerCase();
    
    const positive = ['great', 'excellent', 'love', 'excited', 'perfect', 'impressive'];
    const negative = ['concern', 'worried', 'expensive', 'difficult', 'problem', 'not sure'];
    
    let posCount = 0;
    let negCount = 0;
    
    positive.forEach(word => {
      if (transcriptLower.includes(word)) posCount++;
    });
    
    negative.forEach(word => {
      if (transcriptLower.includes(word)) negCount++;
    });
    
    if (posCount > 0 && negCount > 0) return 'mixed';
    if (posCount > negCount) return 'positive';
    if (negCount > posCount) return 'negative';
    return 'neutral';
  }
  
  /**
   * Detect conversation momentum
   */
  private detectMomentum(context: EnhancedCoachingContext, salesStage: string): 'advancing' | 'stalled' | 'declining' {
    // Stage progression indicates advancement
    if (salesStage === 'closing' && this.lastSalesStage !== 'closing') {
      return 'advancing';
    }
    
    // Many objections = declining
    if (this.objectionHistory.length > 3) {
      return 'declining';
    }
    
    // Long discovery = stalled
    const duration = this.calculateCallDuration(context);
    if (duration > 20 && salesStage === 'discovery') {
      return 'stalled';
    }
    
    return 'advancing';
  }
  
  /**
   * Build knowledge base from processed insights
   */
  private buildKnowledgeBase(insights?: any): any {
    if (!insights) return {};
    
    return {
      techniques: insights.high_impact_techniques || [],
      objectionHandlers: insights.objection_handlers || [],
      frameworks: insights.frameworks || insights.methodologies || []
    };
  }
  
  /**
   * Get additional context for user prompt
   */
  private getAdditionalContext(context: EnhancedCoachingContext): string {
    const parts: string[] = [];
    
    if (this.objectionHistory.length > 0) {
      parts.push(`Previous objections: ${this.objectionHistory.join(', ')}`);
    }
    
    if (this.topicHistory.length > 0) {
      parts.push(`Topics covered: ${this.topicHistory.join(', ')}`);
    }
    
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      parts.push(`Conversation turns: ${context.conversationHistory.length}`);
    }
    
    return parts.join('. ');
  }
  
  /**
   * Call Ollama API with enhanced prompts
   */
  private async callOllama(systemPrompt: string, userPrompt: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
          options: {
            temperature: this.config.temperature,
            top_p: this.config.topP,
            num_predict: this.config.maxTokens
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.message?.content || null;
      
    } catch (error) {
      this.trail.fail(8203, error as Error);
      return null;
    }
  }
  
  /**
   * Update conversation state after coaching
   */
  private updateConversationState(context: PromptContext, response: StructuredResponse): void {
    // Update last sales stage
    if (context.salesStage !== 'unknown') {
      this.lastSalesStage = context.salesStage;
    }
    
    // Track high-urgency situations
    if (response.urgency_level === 'critical' || response.urgency_level === 'high') {
      this.trail.light(6206, {
        high_urgency_coaching: true,
        stage: context.salesStage,
        suggestion: response.primary_suggestion
      });
    }
  }
  
  /**
   * Reset conversation state for new call
   */
  resetConversation(): void {
    this.conversationStartTime = null;
    this.lastSalesStage = 'discovery';
    this.objectionHistory = [];
    this.topicHistory = [];
    
    this.trail.light(6207, {
      conversation_reset: true,
      timestamp: Date.now()
    });
  }
}

// Export singleton instance with default config
export const enhancedOllamaService = new EnhancedOllamaService({
  baseUrl: 'http://localhost:11434',
  model: 'llama2',
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 500
});