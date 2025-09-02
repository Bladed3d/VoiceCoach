/**
 * VoiceCoach V2 - Ollama Prompt Builder Service
 * Implements the comprehensive coaching instructions from Ollama-Instructions.md
 * This replicates the successful prompt engineering from the old VoiceCoach system
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import * as fs from 'fs';
import * as path from 'path';

export interface CoachingContext {
  // Core context (always required)
  salesStage: 'discovery' | 'demo' | 'objection_handling' | 'closing' | 'unknown';
  callDuration: number; // minutes
  topics: string[];
  objections: string[];
  currentTranscript: string;
  
  // Enhanced context (recommended)
  buyingSignals?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
  momentum?: 'advancing' | 'stalled' | 'declining';
  
  // Optional context (client-specific)
  companyInfo?: string;
  productFocus?: string;
  competitorMentioned?: string;
  decisionTimeline?: string;
  budgetRange?: string;
  
  // Knowledge base
  knowledge?: {
    techniques?: any[];
    objectionHandlers?: any[];
    frameworks?: any[];
  };
}

export interface CoachingResponse {
  primary_suggestion: string;
  confidence_score: number;
  prompt_type: 'objection_handling' | 'discovery' | 'demo' | 'closing' | 'rapport_building' | 'value_prop';
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  supporting_evidence: string[];
  next_best_actions: string[];
  exact_phrase: string;
  fallback_phrase: string;
  avoid_saying: string;
  estimated_impact: 'low' | 'medium' | 'high';
  implementation_difficulty: 'easy' | 'moderate' | 'challenging';
}

export class OllamaPromptBuilder {
  private trail: BreadcrumbTrail;
  private systemPromptTemplate: string;
  private instructionsPath: string;
  private methodologies = 'SPIN, MEDDIC, Challenger, Sandler, BANT';
  
  constructor() {
    this.trail = new BreadcrumbTrail('OllamaPromptBuilder');
    this.instructionsPath = path.join(
      process.cwd(), 
      'docs/AI-Instructions/Ollama-Instructions.md'
    );
    
    // Load the template on initialization
    this.loadSystemPromptTemplate();
    
    // LED 6150: Service initialized
    this.trail.light(6150, {
      service: 'OllamaPromptBuilder',
      template_loaded: !!this.systemPromptTemplate
    });
  }
  
  /**
   * Load the system prompt template from the instructions file
   */
  private loadSystemPromptTemplate(): void {
    try {
      // For now, use the embedded template
      // In production, this would read from the .md file
      this.systemPromptTemplate = `You are VoiceCoach, an expert AI sales coach providing real-time guidance during sales conversations.

CURRENT CONTEXT:
- Sales Stage: {SALES_STAGE}
- Call Duration: {DURATION} minutes
- Key Topics Discussed: {TOPICS}
- Detected Objections: {OBJECTIONS}
- Buying Signals Detected: {BUYING_SIGNALS}
- Participant Sentiment: {SENTIMENT}
- Conversation Momentum: {MOMENTUM}

COACHING OBJECTIVES:
1. Provide actionable, specific suggestions for the salesperson
2. Address objections and concerns with proven responses
3. Guide conversation toward successful close
4. Maintain rapport and trust with prospect
5. Optimize for sales methodology best practices ({METHODOLOGIES})

AVAILABLE KNOWLEDGE:
{KNOWLEDGE_BASE}

RESPONSE FORMAT:
Provide a JSON response with ALL of these required fields:
{
    "primary_suggestion": "Main coaching advice with exact words to use (1-2 sentences)",
    "confidence_score": 0.0-1.0,
    "prompt_type": "objection_handling|discovery|demo|closing|rapport_building|value_prop",
    "urgency_level": "low|medium|high|critical",
    "supporting_evidence": ["Statistical or logical reason 1", "Statistical or logical reason 2"],
    "next_best_actions": ["Specific action 1", "Specific action 2", "Specific action 3"],
    "exact_phrase": "Exact words to say right now",
    "fallback_phrase": "Alternative if first doesn't work",
    "avoid_saying": "What NOT to say in this situation",
    "estimated_impact": "low|medium|high",
    "implementation_difficulty": "easy|moderate|challenging"
}

COACHING PRINCIPLES:
- Be specific and actionable, not generic
- Focus on what the salesperson should do RIGHT NOW
- Consider the prospect's perspective and emotional state
- Suggest exact phrases or questions when helpful
- Prioritize relationship preservation over aggressive tactics
- Reference specific techniques from the knowledge base
- Adapt to the current sales stage and call duration`;
      
      this.trail.light(6151, {
        template_loaded: true,
        template_length: this.systemPromptTemplate.length
      });
      
    } catch (error) {
      this.trail.fail(8151, error as Error);
      // Fallback to basic template
      this.systemPromptTemplate = 'You are a sales coach. Provide coaching based on the conversation.';
    }
  }
  
  /**
   * Build a comprehensive system prompt with full context
   */
  buildSystemPrompt(context: CoachingContext): string {
    this.trail.light(6152, {
      operation: 'build_system_prompt',
      sales_stage: context.salesStage,
      call_duration: context.callDuration
    });
    
    // Detect buying signals from transcript if not provided
    const buyingSignals = context.buyingSignals || this.detectBuyingSignals(context.currentTranscript);
    
    // Detect sentiment if not provided
    const sentiment = context.sentiment || this.detectSentiment(context.currentTranscript);
    
    // Determine momentum based on context
    const momentum = context.momentum || this.determineMomentum(context);
    
    // Format knowledge base
    const knowledgeBase = this.formatKnowledgeBase(context.knowledge);
    
    // Replace all template variables
    const prompt = this.systemPromptTemplate
      .replace('{SALES_STAGE}', context.salesStage)
      .replace('{DURATION}', context.callDuration.toString())
      .replace('{TOPICS}', context.topics.join(', ') || 'none discussed yet')
      .replace('{OBJECTIONS}', context.objections.join(', ') || 'none raised')
      .replace('{BUYING_SIGNALS}', buyingSignals.join(', ') || 'none detected')
      .replace('{SENTIMENT}', sentiment)
      .replace('{MOMENTUM}', momentum)
      .replace('{METHODOLOGIES}', this.methodologies)
      .replace('{KNOWLEDGE_BASE}', knowledgeBase);
    
    this.trail.light(6153, {
      prompt_built: true,
      prompt_length: prompt.length,
      variables_replaced: 8
    });
    
    return prompt;
  }
  
  /**
   * Build a user prompt with the current conversation
   */
  buildUserPrompt(transcript: string, additionalContext?: string): string {
    const userPrompt = `CURRENT CONVERSATION SNIPPET:
"${transcript}"

${additionalContext ? `ADDITIONAL CONTEXT: ${additionalContext}\n` : ''}

Please analyze this conversation and provide coaching guidance following the exact response format specified. Focus on what the salesperson should do or say IMMEDIATELY to advance the sale.`;
    
    return userPrompt;
  }
  
  /**
   * Detect buying signals from transcript
   */
  private detectBuyingSignals(transcript: string): string[] {
    const signals: string[] = [];
    const transcriptLower = transcript.toLowerCase();
    
    const buyingPhrases = {
      high: [
        'how soon can we start',
        'what are the next steps',
        'send me a proposal',
        'when can you deliver',
        'how do we move forward'
      ],
      medium: [
        'this could help',
        'i like',
        'interesting',
        'tell me more',
        'how does it work'
      ]
    };
    
    buyingPhrases.high.forEach(phrase => {
      if (transcriptLower.includes(phrase)) {
        signals.push(`HIGH: "${phrase}"`);
      }
    });
    
    buyingPhrases.medium.forEach(phrase => {
      if (transcriptLower.includes(phrase)) {
        signals.push(`MEDIUM: "${phrase}"`);
      }
    });
    
    return signals;
  }
  
  /**
   * Detect sentiment from transcript
   */
  private detectSentiment(transcript: string): 'positive' | 'neutral' | 'negative' | 'mixed' {
    const transcriptLower = transcript.toLowerCase();
    
    const positiveWords = ['great', 'excellent', 'love', 'excited', 'impressive', 'amazing'];
    const negativeWords = ['expensive', 'concerned', 'worried', 'difficult', 'problem', 'issue'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (transcriptLower.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (transcriptLower.includes(word)) negativeCount++;
    });
    
    if (positiveCount > 0 && negativeCount > 0) return 'mixed';
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
  
  /**
   * Determine conversation momentum
   */
  private determineMomentum(context: CoachingContext): 'advancing' | 'stalled' | 'declining' {
    // Short calls are usually advancing
    if (context.callDuration < 5) return 'advancing';
    
    // Many objections without resolution = declining
    if (context.objections.length > 2 && context.callDuration > 20) return 'declining';
    
    // Buying signals = advancing
    if (context.buyingSignals && context.buyingSignals.length > 0) return 'advancing';
    
    // Long call without progress = stalled
    if (context.callDuration > 30 && context.salesStage === 'discovery') return 'stalled';
    
    return 'advancing';
  }
  
  /**
   * Format knowledge base for inclusion in prompt
   */
  private formatKnowledgeBase(knowledge?: any): string {
    if (!knowledge) return 'No specific knowledge base loaded';
    
    const sections: string[] = [];
    
    if (knowledge.techniques && knowledge.techniques.length > 0) {
      sections.push('TECHNIQUES AVAILABLE:');
      knowledge.techniques.slice(0, 5).forEach((t: any) => {
        sections.push(`- ${t.name || t.technique}: ${t.description || t.usage}`);
      });
    }
    
    if (knowledge.objectionHandlers && knowledge.objectionHandlers.length > 0) {
      sections.push('\nOBJECTION RESPONSES:');
      knowledge.objectionHandlers.slice(0, 3).forEach((o: any) => {
        sections.push(`- "${o.objection}": "${o.response}"`);
      });
    }
    
    if (knowledge.frameworks && knowledge.frameworks.length > 0) {
      sections.push('\nFRAMEWORKS:');
      knowledge.frameworks.slice(0, 3).forEach((f: any) => {
        sections.push(`- ${f.name}: ${f.description}`);
      });
    }
    
    return sections.join('\n');
  }
  
  /**
   * Determine urgency based on context
   */
  determineUrgency(context: CoachingContext): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: Closing stage or many objections
    if (context.salesStage === 'closing' || context.objections.length > 3) {
      return 'critical';
    }
    
    // High: Objection handling or long call
    if (context.salesStage === 'objection_handling' || context.callDuration > 25) {
      return 'high';
    }
    
    // Medium: Demo stage or medium duration
    if (context.salesStage === 'demo' || context.callDuration > 10) {
      return 'medium';
    }
    
    // Low: Early discovery
    return 'low';
  }
  
  /**
   * Parse and validate Ollama's response
   */
  parseCoachingResponse(ollamaResponse: string): CoachingResponse | null {
    try {
      // Extract JSON from response
      const jsonMatch = ollamaResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.trail.fail(8154, new Error('No JSON found in response'));
        return null;
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      const required = [
        'primary_suggestion',
        'confidence_score',
        'prompt_type',
        'urgency_level',
        'supporting_evidence',
        'next_best_actions',
        'exact_phrase'
      ];
      
      for (const field of required) {
        if (!(field in parsed)) {
          this.trail.fail(8155, new Error(`Missing required field: ${field}`));
          // Provide default value
          if (field === 'supporting_evidence' || field === 'next_best_actions') {
            parsed[field] = [];
          } else {
            parsed[field] = 'Not provided';
          }
        }
      }
      
      this.trail.light(6154, {
        response_parsed: true,
        confidence: parsed.confidence_score,
        urgency: parsed.urgency_level
      });
      
      return parsed as CoachingResponse;
      
    } catch (error) {
      this.trail.fail(8156, error as Error);
      return null;
    }
  }
  
  /**
   * Generate a fallback response when Ollama fails
   */
  generateFallbackResponse(context: CoachingContext): CoachingResponse {
    const stageResponses = {
      discovery: {
        suggestion: "Ask: 'What's your biggest challenge with your current solution?'",
        exact_phrase: "What's your biggest challenge with your current solution?"
      },
      demo: {
        suggestion: "Check understanding: 'Does this address your concern about efficiency?'",
        exact_phrase: "Does this address your concern about efficiency?"
      },
      objection_handling: {
        suggestion: "Say: 'I understand your concern. What specifically worries you about this?'",
        exact_phrase: "I understand your concern. What specifically worries you about this?"
      },
      closing: {
        suggestion: "Ask: 'What would need to happen for us to move forward together?'",
        exact_phrase: "What would need to happen for us to move forward together?"
      },
      unknown: {
        suggestion: "Listen actively and ask clarifying questions",
        exact_phrase: "Tell me more about that..."
      }
    };
    
    const response = stageResponses[context.salesStage];
    
    return {
      primary_suggestion: response.suggestion,
      confidence_score: 0.3,
      prompt_type: context.salesStage === 'unknown' ? 'discovery' : context.salesStage as any,
      urgency_level: this.determineUrgency(context),
      supporting_evidence: ['Based on current sales stage', 'Standard best practice'],
      next_best_actions: [
        'Listen for their response',
        'Take notes on key points',
        'Prepare follow-up questions'
      ],
      exact_phrase: response.exact_phrase,
      fallback_phrase: 'Can you help me understand your perspective?',
      avoid_saying: 'Don\'t be pushy or dismissive',
      estimated_impact: 'medium',
      implementation_difficulty: 'easy'
    };
  }
}

// Export singleton instance
export const ollamaPromptBuilder = new OllamaPromptBuilder();