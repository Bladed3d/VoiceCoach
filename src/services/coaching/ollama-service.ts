/**
 * VoiceCoach V2 - Ollama Integration Service
 * Real-time coaching using processed document insights via Ollama
 *
 * @deprecated This service has been superseded by OllamaPromptService.ts
 * All new prompt generation should use the centralized OllamaPromptService
 * which consolidates all prompt building logic into a single service.
 *
 * This file is kept for backward compatibility only.
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
  private ragTools: any[] = []; // Cache for RAG tools

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
        : await this.buildCoachingPrompt(context);

      console.log('🚀 Sending to Ollama:', {
        url: `${this.config.baseUrl}/api/generate`,
        model: this.config.model,
        promptLength: prompt.length,
        temperature: this.config.temperature
      });

      // CRITICAL DEBUG: Log the exact model being sent to Ollama
      console.log('🔍 CRITICAL DEBUG - Model being sent to Ollama API:', this.config.model);

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

  /**
   * Load tools from RAG document (13ToolsRAG-01.json)
   */
  private async loadRAGTools(): Promise<any[]> {
    if (this.ragTools.length > 0) {
      return this.ragTools; // Use cached tools
    }

    try {
      if ((window as any).electronAPI?.readFile) {
        // Get RAG file from settings - FAIL LOUDLY if not configured
        const savedSettings = localStorage.getItem('voicecoach-settings');
        let ragPath = '';

        if (savedSettings) {
          try {
            const settings = JSON.parse(savedSettings);
            if (settings.coaching?.ragFile) {
              ragPath = settings.coaching.ragFile;
            }
          } catch (e) {
            console.error('Failed to parse settings for RAG file');
          }
        }

        if (!ragPath || ragPath.trim().length === 0) {
          const errorMsg = '🚨 CRITICAL RAG FILE ERROR IN OLLAMA-SERVICE!\n\nNO RAG FILE CONFIGURED IN SETTINGS!\n\nThe user must select a RAG file in the dropdown.\nApp cannot function without proper RAG file selection.\n\nFIX THIS IMMEDIATELY!';
          console.error(errorMsg);
          alert(errorMsg);
          throw new Error('RAG file not configured in ollama-service - user must select in settings');
        }

        console.log('📁 OllamaService using configured RAG file:', ragPath);
        const fileData = await (window as any).electronAPI.readFile(ragPath);

        if (fileData && fileData.content) {
          this.ragTools = JSON.parse(fileData.content);

          this.trail.light(6120, {
            operation: 'rag_tools_loaded',
            toolCount: this.ragTools.length,
            ragPath
          });

          console.log('✅ RAG tools loaded:', this.ragTools.length, 'tools');
          return this.ragTools;
        }
      }

      throw new Error('Could not load RAG tools from file');

    } catch (error) {
      this.trail.fail(8120, error as Error);
      console.error('❌ Failed to load RAG tools:', error);
      return []; // Return empty array as fallback
    }
  }

  /**
   * Analyze sentiment from conversation context
   */
  private analyzeSentiment(context: CoachingContext): string {
    const transcript = context.currentTranscript.toLowerCase();

    // Simple sentiment analysis
    if (transcript.includes('excited') || transcript.includes('great') || transcript.includes('perfect')) {
      return 'positive';
    }
    if (transcript.includes('concerned') || transcript.includes('worried') || transcript.includes('expensive')) {
      return 'negative';
    }
    return 'neutral';
  }

  private async buildCoachingPrompt(context: CoachingContext): Promise<string> {
    this.promptCount++;
    console.log(`\n🔢 PROMPT #${this.promptCount} - NEW DIRECT APPROACH`);

    // Load tools from the RAG document
    const ragTools = await this.loadRAGTools();

    // Build context with ACTUAL values
    const promptContext = {
      transcript: context.currentTranscript,
      tools: ragTools, // Pass the actual tools
      salesStage: this.detectSalesStage(context.currentTranscript),
      sentiment: this.analyzeSentiment(context),
      objections: this.detectObjections(context.currentTranscript),
      topics: this.detectTopics(context.currentTranscript)
    };

    console.log('🎯 DIRECT PROMPT CONTEXT:', {
      transcriptLength: promptContext.transcript?.length || 0,
      toolsCount: Array.isArray(ragTools) ? ragTools.length : 0,
      salesStage: promptContext.salesStage,
      sentiment: promptContext.sentiment,
      objections: promptContext.objections,
      topics: promptContext.topics
    });

    // Let the instruction loader build the final prompt
    const finalPrompt = await ollamaInstructionLoader.buildPrompt(promptContext);

    console.log('🚀 DIRECT PROMPT BUILT:', {
      finalLength: finalPrompt.length,
      containsTools: finalPrompt.includes('"id"'),
      containsTranscript: finalPrompt.includes(context.currentTranscript.substring(0, 50))
    });

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
      console.log('🔵 RAW OLLAMA RESPONSE (FULL):', ollamaResponse);
      console.log('🔍 RESPONSE LENGTH:', ollamaResponse.length);

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

      // Handle predictive format with rich coaching data
      if (parsed.say_now) {
        console.log('✅ PREDICTIVE FORMAT DETECTED - Extracting rich coaching data');

        // Build enhanced suggestion with clear "Say now:" prefix
        let suggestion = `Say now: ${parsed.say_now}`;

        // Add strategic follow-up information
        if (parsed.next_move) {
          suggestion += `\n\n➡️ Next: ${parsed.next_move}`;
        }

        // Add strategic goal context
        if (parsed.path_goal) {
          suggestion += `\n\n🎯 Goal: ${parsed.path_goal}`;
        }

        // Add predicted response for preparation
        if (parsed.predicted_response) {
          suggestion += `\n\n💭 They'll likely say: "${parsed.predicted_response}"`;
        }

        // Add alternative strategy if available
        if (parsed.alternative) {
          suggestion += `\n\n🔄 Alternative: ${parsed.alternative}`;
        }

        console.log('📋 Enhanced suggestion built:', {
          sayNow: parsed.say_now,
          hasNextMove: !!parsed.next_move,
          hasGoal: !!parsed.path_goal,
          hasPrediction: !!parsed.predicted_response,
          hasAlternative: !!parsed.alternative
        });

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
    console.log('🔧 OLLAMA CONFIG UPDATE:', {
      old_model: this.config.model,
      new_model: config.model,
      full_config: config
    });

    this.config = { ...this.config, ...config };
    this.isConnected = false; // Force reconnection test

    console.log('✅ OLLAMA CONFIG UPDATED TO:', this.config.model);

    this.trail.light(6130, {
      operation: 'config_updated',
      newBaseUrl: config.baseUrl,
      newModel: config.model,
      old_model: this.config.model,
      config_object: this.config
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

  /**
   * Generate raw response from Ollama for MEFS-enhanced prompts
   */
  async generateRawResponse(prompt: string): Promise<string | null> {
    if (!this.isConnected) {
      throw new Error('Ollama not connected');
    }

    try {
      this.trail.light(6130, {
        operation: 'raw_response_generation_start',
        promptLength: prompt.length
      });

      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        throw new Error(`Ollama error: ${response.status}`);
      }

      const result = await response.json();

      this.trail.light(6131, {
        operation: 'raw_response_generation_complete',
        responseLength: result.response?.length || 0
      });

      return result.response || null;

    } catch (error) {
      this.trail.fail(8130, error as Error);
      console.error('❌ Raw response generation failed:', error);
      return null;
    }
  }
}