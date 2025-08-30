/**
 * VoiceCoach V2 - Ollama Integration Service
 * Real-time coaching using processed document insights via Ollama
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
}

export interface CoachingContext {
  originalDocument: string;
  processedInsights: any;
  conversationHistory: Array<{
    speaker: 'user' | 'prospect';
    text: string;
    timestamp: string;
  }>;
  currentTranscript: string;
}

export interface CoachingResponse {
  suggestion: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'objection_handling' | 'discovery' | 'closing' | 'value_prop';
  trigger: string;
  context: string;
  confidence: number;
}

export class OllamaCoachingService {
  private trail: BreadcrumbTrail;
  private config: OllamaConfig;
  private isConnected: boolean = false;

  constructor(config: OllamaConfig) {
    this.trail = new BreadcrumbTrail('OllamaService');
    this.config = config;
    
    this.trail.light(6100, {
      operation: 'ollama_service_initialization',
      baseUrl: config.baseUrl,
      model: config.model,
      timestamp: Date.now()
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      this.trail.light(6101, { operation: 'ollama_connection_test_start' });
      
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (response.ok) {
        const models = await response.json();
        this.isConnected = true;
        
        this.trail.light(6102, {
          operation: 'ollama_connection_success',
          availableModels: models.models?.length || 0,
          timestamp: Date.now()
        });
        
        return true;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      this.trail.fail(8101, error as Error);
      this.isConnected = false;
      return false;
    }
  }

  async generateCoachingSuggestion(context: CoachingContext): Promise<CoachingResponse | null> {
    if (!this.isConnected) {
      this.trail.fail(8102, new Error('Ollama not connected'));
      return null;
    }

    try {
      this.trail.light(6110, {
        operation: 'coaching_generation_start',
        transcriptLength: context.currentTranscript.length,
        hasInsights: !!context.processedInsights,
        conversationLength: context.conversationHistory.length
      });

      // Build context-aware prompt using processed document insights
      const prompt = this.buildCoachingPrompt(context);
      
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          options: {
            temperature: this.config.temperature,
            top_p: this.config.topP,
            num_predict: this.config.maxTokens
          },
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const result = await response.json();
      const suggestion = this.parseCoachingResponse(result.response, context);

      this.trail.light(6111, {
        operation: 'coaching_generation_complete',
        suggestionGenerated: !!suggestion,
        priority: suggestion?.priority,
        category: suggestion?.category,
        confidence: suggestion?.confidence
      });

      return suggestion;

    } catch (error) {
      this.trail.fail(8110, error as Error);
      return null;
    }
  }

  private buildCoachingPrompt(context: CoachingContext): string {
    const insights = context.processedInsights;
    const recentTranscript = context.currentTranscript.slice(-500); // Last 500 chars
    
    return `# Real-Time Sales Coaching Assistant

## Your Role
You are an AI sales coach providing real-time guidance during a live sales call. Analyze the conversation and provide ONE specific, actionable suggestion.

## Document Insights Available
${insights?.high_impact_techniques ? 
  insights.high_impact_techniques.slice(0, 3).map((t: any) => 
    `- ${t.technique}: ${t.example || t.description}`
  ).join('\n') : 'No specific techniques available'
}

## Objection Handlers Available  
${insights?.objection_handlers ?
  insights.objection_handlers.slice(0, 3).map((o: any) =>
    `- "${o.objection}" → "${o.response}"`
  ).join('\n') : 'No objection handlers available'
}

## Current Conversation Context
Recent transcript: "${recentTranscript}"

## Instructions
Respond with ONLY a JSON object in this exact format:
{
  "suggestion": "One specific actionable suggestion (max 100 words)",
  "priority": "HIGH|MEDIUM|LOW", 
  "category": "objection_handling|discovery|closing|value_prop",
  "trigger": "What triggered this suggestion",
  "context": "Brief context explanation",
  "confidence": 0.0-1.0
}

ONLY respond if you detect a clear coaching opportunity. If no coaching is needed, respond with: {"suggestion": null}`;
  }

  private parseCoachingResponse(ollamaResponse: string, context: CoachingContext): CoachingResponse | null {
    try {
      // Extract JSON from response (Ollama sometimes adds extra text)
      const jsonMatch = ollamaResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.suggestion || parsed.suggestion === null) {
        return null;
      }

      return {
        suggestion: parsed.suggestion,
        priority: parsed.priority || 'MEDIUM',
        category: parsed.category || 'discovery',
        trigger: parsed.trigger || 'conversation_analysis',
        context: parsed.context || 'real_time_analysis',
        confidence: parsed.confidence || 0.5
      };

    } catch (error) {
      this.trail.fail(8111, error as Error);
      return null;
    }
  }

  async processPhase1C(phase1AResults: any, phase1BResults: any): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Ollama not connected');
    }

    try {
      this.trail.light(6120, {
        operation: 'phase_1c_synthesis_start',
        hasPhase1A: !!phase1AResults,
        hasPhase1B: !!phase1BResults
      });

      const prompt = `# VoiceCoach V2 - Phase 1C Document Synthesis

## Your Role
Synthesize Phase 1A and Phase 1B document analysis into final coaching insights.

## Phase 1A Results (Pure Document Analysis)
${JSON.stringify(phase1AResults, null, 2)}

## Phase 1B Results (User-Prioritized Analysis)  
${JSON.stringify(phase1BResults, null, 2)}

## Instructions
Create a comprehensive synthesis that combines both analyses into actionable coaching insights. Return as JSON with:

{
  "coaching_prompts": [
    {
      "prompt": "Actionable coaching suggestion",
      "trigger": "When to use this",
      "priority": "HIGH|MEDIUM|LOW",
      "category": "objection_handling|discovery|closing|value_prop"
    }
  ],
  "objection_responses": [
    {
      "objection": "Common objection",
      "response": "Recommended response",
      "context": "When to use"
    }
  ],
  "conversation_starters": [
    {
      "scenario": "Meeting scenario",
      "opener": "Conversation starter",
      "purpose": "What this achieves"
    }
  ],
  "synthesis_summary": "Brief summary of combined insights"
}`;

      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          options: {
            temperature: 0.7,
            num_predict: 1000
          },
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama synthesis error: ${response.status}`);
      }

      const result = await response.json();
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const synthesized = JSON.parse(jsonMatch[0]);
        
        this.trail.light(6121, {
          operation: 'phase_1c_synthesis_complete',
          coachingPrompts: synthesized.coaching_prompts?.length || 0,
          objectionResponses: synthesized.objection_responses?.length || 0
        });

        return synthesized;
      }

      throw new Error('No valid JSON found in Ollama response');

    } catch (error) {
      this.trail.fail(8120, error as Error);
      throw error;
    }
  }

  updateConfig(config: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...config };
    this.isConnected = false; // Force reconnection test
    
    this.trail.light(6130, {
      operation: 'config_updated',
      newBaseUrl: config.baseUrl,
      newModel: config.model
    });
  }

  getStatus(): { connected: boolean; config: OllamaConfig; lastActivity?: string } {
    return {
      connected: this.isConnected,
      config: this.config,
      lastActivity: this.trail.sequence[this.trail.sequence.length - 1]?.timestamp?.toString()
    };
  }
}