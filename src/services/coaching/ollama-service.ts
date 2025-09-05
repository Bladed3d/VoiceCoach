/**
 * VoiceCoach V2 - Ollama Integration Service
 * Real-time coaching using processed document insights via Ollama
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { ollamaInstructionLoader } from './OllamaInstructionLoader-Browser';
import { intelligentPromptBuilder } from './intelligent-prompt-builder';

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
  private promptCount: number = 0;
  private useIntelligentIndexing: boolean = false;
  private documentIndexed: boolean = false;

  constructor(config: OllamaConfig) {
    this.trail = new BreadcrumbTrail('OllamaService');
    this.config = config;
    
    this.trail.light(6100, {
      operation: 'ollama_service_initialization',
      baseUrl: config.baseUrl,
      model: config.model,
      instruction_loader: 'initialized',
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

      // Build context-aware prompt using intelligent indexing or full document
      const prompt = this.useIntelligentIndexing 
        ? intelligentPromptBuilder.buildContextAwarePrompt(
            context.currentTranscript, 
            context.processedInsights
          )
        : this.buildCoachingPrompt(context);
      
      console.log('🚀 Sending to Ollama:', {
        url: `${this.config.baseUrl}/api/generate`,
        model: this.config.model,
        promptLength: prompt.length,
        temperature: this.config.temperature
      });

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
        const errorText = await response.text();
        console.error('❌ Ollama API error:', response.status, errorText);
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
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
      console.error('❌ OLLAMA GENERATION FAILED:', error);
      this.trail.fail(8110, error as Error);
      return null;
    }
  }

  private buildCoachingPrompt(context: CoachingContext): string {
    this.promptCount++;
    console.log(`\n🔢 PROMPT #${this.promptCount} BEING BUILT`);
    
    // DEBUG: Log exactly what we received
    console.log('🔴 CRITICAL DEBUG - RAW CONTEXT:', {
      currentTranscriptLength: context.currentTranscript?.length || 0,
      currentTranscriptFirst100: context.currentTranscript?.substring(0, 100) || '[EMPTY]',
      conversationHistoryLength: context.conversationHistory?.length || 0,
      lastHistoryItem: context.conversationHistory?.[context.conversationHistory.length - 1] || null
    });
    
    const insights = context.processedInsights;
    const recentTranscript = context.currentTranscript.slice(-500); // Last 500 chars
    
    // DEBUG: What transcript are we actually using?
    console.log('🎯 TRANSCRIPT DEBUG:', {
      originalLength: context.currentTranscript?.length || 0,
      slicedLength: recentTranscript?.length || 0,
      slicedContent: recentTranscript || '[EMPTY TRANSCRIPT]',
      isEmpty: !recentTranscript || recentTranscript.trim().length === 0
    });
    
    // CRITICAL: Log what we're passing to buildPrompt
    console.log('🔴🔴 CRITICAL - recentTranscript being passed to buildPrompt:', {
      length: recentTranscript?.length || 0,
      content: recentTranscript || '[EMPTY]',
      first50: recentTranscript?.substring(0, 50) || '[EMPTY]',
      last50: recentTranscript?.substring(recentTranscript.length - 50) || '[EMPTY]'
    });
    
    // Check for documentContent wrapper
    const actualInsights = insights?.documentContent || insights;
    
    // Handle both 'techniques' and 'predictive_techniques' field names
    const techniques = actualInsights?.techniques || actualInsights?.predictive_techniques || [];
    
    console.log('🔍 Building prompt with insights:', {
      hasInsights: !!actualInsights,
      hasTechniques: techniques.length > 0,
      techniqueCount: techniques.length,
      transcriptLength: recentTranscript.length,
      insightKeys: actualInsights ? Object.keys(actualInsights).slice(0, 5) : [],
      hasDocumentContent: !!insights?.documentContent,
      hasPredictiveTechniques: !!actualInsights?.predictive_techniques
    });
    
    // CRITICAL DEBUG - See what we actually have
    if (techniques[0]) {
      console.log('🎯 FIRST TECHNIQUE:', {
        name: techniques[0].technique_name,
        hasConversationPaths: !!techniques[0].conversation_paths,
        pathCount: techniques[0].conversation_paths?.length || 0,
        firstPath: techniques[0].conversation_paths?.[0]?.trigger
      });
    } else {
      console.log('❌ NO TECHNIQUES FOUND IN DOCUMENT!');
    }
    
    // Build knowledge base string from processed insights
    let knowledgeBase = '';
    
    // Add techniques with conversation paths if available
    if (techniques.length > 0) {
      knowledgeBase += 'TECHNIQUES WITH CONVERSATION PATHS:\n';
      techniques.forEach((t: any) => {
        if (t.conversation_paths || t.when_to_use) {
          knowledgeBase += `\n${t.technique_name}:\n`;
          const examples = t.conversation_paths || t.when_to_use || [];
          examples.slice(0, 5).forEach((path: any) => {
            // Handle predictive document structure
            knowledgeBase += `- Trigger: "${path.trigger || path.prospect_says}"\n`;
            
            // Get immediate response
            const immediateWords = path.immediate_response?.exact_words || 
                                 path.salesperson_says || 
                                 path.coach_prompt;
            if (immediateWords) {
              knowledgeBase += `  Say Now: "${immediateWords}"\n`;
            }
            
            // Get predicted response
            if (path.predicted_path?.likely_prospect_response) {
              knowledgeBase += `  They'll Say: "${path.predicted_path.likely_prospect_response}"\n`;
            }
            
            // Get next move
            if (path.predicted_path?.next_move?.exact_words) {
              knowledgeBase += `  Then Say: "${path.predicted_path.next_move.exact_words}"\n`;
            }
            
            // Get third move if available
            if (path.predicted_path?.third_move?.exact_words) {
              knowledgeBase += `  Finally: "${path.predicted_path.third_move.exact_words}"\n`;
            }
          });
        }
      });
    }
    
    // Add response patterns if available
    if (actualInsights?.response_patterns) {
      knowledgeBase += '\n\nRESPONSE PATTERNS:\n';
      Object.entries(actualInsights.response_patterns).forEach(([type, pattern]: [string, any]) => {
        knowledgeBase += `${type}:\n`;
        if (pattern.triggers) {
          knowledgeBase += `Triggers: ${pattern.triggers.join(', ')}\n`;
        }
        if (pattern.responses) {
          pattern.responses.slice(0, 3).forEach((r: string) => {
            knowledgeBase += `- ${r}\n`;
          });
        }
      });
    }
    
    // Use instruction loader to build the prompt with the knowledge base
    const promptContext = {
      transcript: recentTranscript,
      knowledge: knowledgeBase || (console.warn('⚠️ WARNING: No knowledge base loaded - coaching without document context!'), 'No specific knowledge loaded'),
      salesStage: this.detectSalesStage(recentTranscript),
      objections: this.detectObjections(recentTranscript),
      topics: this.detectTopics(recentTranscript)
    };
    
    console.log('📝 Knowledge base length:', knowledgeBase.length);
    if (knowledgeBase.length === 0) {
      console.log('❌❌❌ KNOWLEDGE BASE IS EMPTY - NO TECHNIQUES LOADED!');
    } else {
      console.log('📋 First 500 chars of knowledge:', knowledgeBase.substring(0, 500));
    }
    
    // LOG what we're about to send to buildPrompt
    console.log('🎨 ABOUT TO CALL buildPrompt with:', {
      transcriptLength: promptContext.transcript?.length || 0,
      transcriptContent: promptContext.transcript || '[EMPTY]',
      knowledgeLength: promptContext.knowledge?.length || 0
    });
    
    const finalPrompt = ollamaInstructionLoader.buildPrompt(promptContext);
    console.log('🚀 Final prompt length:', finalPrompt.length);
    
    // CRITICAL: Show what we're actually sending to Ollama
    console.log('🔴 ACTUAL PROMPT BEING SENT (first 1000 chars):');
    console.log(finalPrompt.substring(0, 1000));
    
    // Also show the part around "CURRENT CONVERSATION:"
    const conversationIndex = finalPrompt.indexOf('CURRENT CONVERSATION:');
    if (conversationIndex >= 0) {
      console.log('📍 CURRENT CONVERSATION section (200 chars after marker):');
      console.log(finalPrompt.substring(conversationIndex, conversationIndex + 200));
    } else {
      console.log('❌ NO "CURRENT CONVERSATION:" FOUND IN PROMPT!');
    }
    
    // Check if prompt contains predictive instructions
    if (!finalPrompt.includes('predictive') && !finalPrompt.includes('PREDICT') && !finalPrompt.includes('forward')) {
      console.log('⚠️⚠️⚠️ PROMPT DOES NOT CONTAIN PREDICTIVE INSTRUCTIONS!');
    }
    
    return finalPrompt;
  }
  
  private detectSalesStage(transcript: string): string {
    const lower = transcript.toLowerCase();
    if (lower.includes('next steps') || lower.includes('get started')) return 'closing';
    if (lower.includes('expensive') || lower.includes('concern')) return 'objection_handling';
    if (lower.includes('how does') || lower.includes('features')) return 'demo';
    return 'discovery';
  }
  
  private detectObjections(transcript: string): string[] {
    const objections: string[] = [];
    const lower = transcript.toLowerCase();
    if (lower.includes('expensive') || lower.includes('cost')) objections.push('price');
    if (lower.includes('boss') || lower.includes('approval')) objections.push('authority');
    if (lower.includes('not sure') || lower.includes('think about')) objections.push('hesitation');
    return objections;
  }
  
  private detectTopics(transcript: string): string[] {
    const topics: string[] = [];
    const lower = transcript.toLowerCase();
    if (lower.includes('price') || lower.includes('cost')) topics.push('pricing');
    if (lower.includes('feature') || lower.includes('capability')) topics.push('features');
    if (lower.includes('support') || lower.includes('help')) topics.push('support');
    return topics;
  }

  private parseCoachingResponse(ollamaResponse: string, context: CoachingContext): CoachingResponse | null {
    try {
      console.log('🔵 RAW OLLAMA RESPONSE (first 500 chars):', ollamaResponse.substring(0, 500));
      
      // Extract JSON from response (Ollama sometimes adds extra text)
      const jsonMatch = ollamaResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('❌❌❌ FAILED: NO JSON FOUND IN OLLAMA RESPONSE!');
        console.error('OLLAMA IS NOT FOLLOWING INSTRUCTIONS - RETURNING PLAIN TEXT INSTEAD OF JSON!');
        
        // Return FAILED state - NO FALLBACK!
        return {
          suggestion: 'FAILED: Ollama not returning JSON format. Check instruction template and model.',
          priority: 'HIGH',
          category: 'objection_handling',
          trigger: 'FAILED',
          context: 'JSON_PARSE_ERROR',
          confidence: 0.0
        };
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (jsonError) {
        console.error('❌❌❌ FAILED: INVALID JSON FROM OLLAMA!');
        console.error('JSON PARSE ERROR:', jsonError);
        console.error('Attempted to parse:', jsonMatch[0]);
        
        // Return FAILED state - NO FALLBACK!
        return {
          suggestion: 'FAILED: Ollama returned malformed JSON. Check model and instructions.',
          priority: 'HIGH',
          category: 'objection_handling',
          trigger: 'FAILED',
          context: 'JSON_MALFORMED',
          confidence: 0.0
        };
      }
      
      // Handle simple JSON format from old app
      if (parsed.urgency && parsed.suggestion && parsed.next_action) {
        const priorityMap: { [key: string]: 'HIGH' | 'MEDIUM' | 'LOW' } = {
          'high': 'HIGH',
          'medium': 'MEDIUM', 
          'low': 'LOW'
        };
        
        return {
          suggestion: `${parsed.suggestion}\n➡️ ${parsed.next_action}`,
          priority: priorityMap[parsed.urgency] || 'MEDIUM',
          category: 'discovery', // Default category
          trigger: parsed.reasoning || 'conversation_analysis',
          context: parsed.reasoning || 'contextual_guidance',
          confidence: parsed.urgency === 'high' ? 0.9 : parsed.urgency === 'medium' ? 0.7 : 0.5
        };
      }
      
      // Handle predictive format
      if (parsed.say_now) {
        // New predictive format
        const suggestion = `${parsed.say_now}${parsed.next_move ? `\n➡️ Next: ${parsed.next_move}` : ''}${parsed.path_goal ? `\n🎯 Goal: ${parsed.path_goal}` : ''}`;
        
        return {
          suggestion: suggestion,
          priority: this.determinePriority(parsed),
          category: this.determineCategory(parsed),
          trigger: parsed.current_trigger || parsed.trigger || 'conversation_analysis',
          context: parsed.conversation_path || parsed.context || 'predictive_guidance',
          confidence: parsed.confidence || 0.7
        };
      }
      
      // Handle legacy format
      if (!parsed.suggestion || parsed.suggestion === null) {
        console.error('❌❌❌ FAILED: JSON MISSING REQUIRED FIELDS!');
        console.error('Parsed JSON:', parsed);
        
        // Return FAILED state - NO FALLBACK!
        return {
          suggestion: 'FAILED: Ollama JSON missing required fields. Model not following instructions.',
          priority: 'HIGH',
          category: 'objection_handling',
          trigger: 'FAILED',
          context: 'MISSING_FIELDS',
          confidence: 0.0
        };
      }

      return {
        suggestion: parsed.suggestion || parsed.text || parsed.say_now,
        priority: parsed.priority || 'MEDIUM',
        category: parsed.category || 'discovery',
        trigger: parsed.trigger || parsed.current_trigger || 'conversation_analysis',
        context: parsed.context || 'real_time_analysis',
        confidence: parsed.confidence || 0.5
      };

    } catch (error) {
      this.trail.fail(8111, error as Error);
      console.error('❌❌❌ FAILED: PARSING ERROR IN parseCoachingResponse!');
      console.error('Error:', error);
      
      // Return FAILED state - NO FALLBACK!
      return {
        suggestion: `FAILED: ${(error as Error).message}`,
        priority: 'HIGH',
        category: 'objection_handling',
        trigger: 'FAILED',
        context: 'PARSE_EXCEPTION',
        confidence: 0.0
      };
    }
  }
  
  private determinePriority(parsed: any): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (parsed.priority) return parsed.priority;
    if (parsed.confidence > 0.8) return 'HIGH';
    if (parsed.confidence > 0.5) return 'MEDIUM';
    return 'LOW';
  }
  
  private determineCategory(parsed: any): 'objection_handling' | 'discovery' | 'closing' | 'value_prop' {
    if (parsed.category) return parsed.category;
    const path = (parsed.conversation_path || '').toLowerCase();
    if (path.includes('objection') || path.includes('concern')) return 'objection_handling';
    if (path.includes('closing') || path.includes('commitment')) return 'closing';
    if (path.includes('discovery') || path.includes('question')) return 'discovery';
    return 'value_prop';
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

  /**
   * Load and index a document for intelligent prompt building
   */
  async loadAndIndexDocument(ragDocument: any): Promise<boolean> {
    try {
      console.log('🔍 Loading document into intelligent indexer...');
      
      // Index the document for fast context matching
      await intelligentPromptBuilder.indexDocument(ragDocument);
      
      this.documentIndexed = true;
      this.useIntelligentIndexing = true;
      
      const stats = intelligentPromptBuilder.getIndexStats();
      console.log('✅ Document indexed successfully:', stats);
      
      this.trail.light(6104, {
        operation: 'document_indexed',
        techniques: stats.techniques,
        keywords: stats.keywords,
        paths: stats.totalPaths,
        memory: stats.memoryUsage
      });
      
      return true;
    } catch (error) {
      this.trail.fail(8106, error as Error);
      console.error('❌ Failed to index document:', error);
      this.useIntelligentIndexing = false;
      return false;
    }
  }

  /**
   * Toggle between intelligent indexing and full document mode
   */
  setIntelligentIndexing(enabled: boolean): void {
    this.useIntelligentIndexing = enabled && this.documentIndexed;
    console.log(`📊 Intelligent indexing: ${this.useIntelligentIndexing ? 'ENABLED' : 'DISABLED'}`);
  }
}