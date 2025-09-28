/**
 * VoiceCoach V2 - Centralized Ollama Prompt Service
 *
 * SINGLE SOURCE OF TRUTH for all Ollama prompt generation in the application.
 * This is the ONLY service that should build prompts - all other code paths should use this.
 *
 * LED Range: 6400-6499
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { getSelectedModel } from '../../lib/model-utils';

interface PromptContext {
  transcript: string;
  salesStage?: string;
  sentiment?: string;
  topics?: string[];
  objections?: string[];
  callDuration?: number;
}

interface OllamaResponse {
  success: boolean;
  response?: string;
  error?: string;
}

export class OllamaPromptService {
  private trail: BreadcrumbTrail;
  private ragTools: any[] = [];
  private promptTemplate: string = '';

  constructor() {
    this.trail = new BreadcrumbTrail('OllamaPromptService');
    this.trail.light(6400, {
      operation: 'centralized_prompt_service_initialized',
      timestamp: Date.now()
    });
  }

  /**
   * Initialize the service by loading RAG tools and prompt template
   */
  async initialize(): Promise<boolean> {
    try {
      this.trail.light(6401, {
        operation: 'prompt_service_initialization_start',
        timestamp: Date.now()
      });

      // Load RAG tools from the JSON file
      await this.loadRAGTools();

      // Load the direct coaching prompt template
      await this.loadPromptTemplate();

      this.trail.light(6402, {
        operation: 'prompt_service_initialization_complete',
        hasTools: this.ragTools.length > 0,
        hasTemplate: this.promptTemplate.length > 0,
        toolCount: this.ragTools.length,
        timestamp: Date.now()
      });

      return this.ragTools.length > 0 && this.promptTemplate.length > 0;
    } catch (error) {
      this.trail.fail(8401, error as Error);
      console.error('❌ Failed to initialize OllamaPromptService:', error);
      return false;
    }
  }

  /**
   * Generate coaching suggestion - THE SINGLE METHOD for all coaching
   */
  async generateCoaching(context: PromptContext): Promise<OllamaResponse> {
    this.trail.light(6410, {
      operation: 'coaching_generation_start',
      transcriptLength: context.transcript.length,
      hasStage: !!context.salesStage,
      hasSentiment: !!context.sentiment,
      serviceInitialized: this.ragTools.length > 0 && this.promptTemplate.length > 0,
      timestamp: Date.now()
    });

    console.log('🔥 CENTRALIZED SERVICE CALLED!', {
      contextReceived: context,
      serviceStatus: this.getStatus(),
      callerStack: new Error().stack?.split('\n').slice(1, 5)
    });

    try {
      // Check if service is initialized
      if (this.ragTools.length === 0 || this.promptTemplate.length === 0) {
        this.trail.light(6413, {
          operation: 'service_not_initialized_auto_init',
          toolCount: this.ragTools.length,
          hasTemplate: this.promptTemplate.length > 0,
          timestamp: Date.now()
        });

        console.log('⚠️ Service not initialized, auto-initializing...');
        await this.initialize();
      }

      // Build the prompt using our centralized logic
      const prompt = this.buildPrompt(context);

      // Make the Ollama call
      const selectedModel = getSelectedModel();

      this.trail.light(6411, {
        operation: 'ollama_call_start',
        model: selectedModel,
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 200),
        timestamp: Date.now()
      });

      console.log('🚀 MAKING OLLAMA CALL WITH CENTRALIZED PROMPT:', {
        model: selectedModel,
        promptLength: prompt.length,
        promptStart: prompt.substring(0, 300)
      });

      // CRITICAL DEBUG: Log exactly what we're sending
      console.error('🔴 OllamaPromptService SENDING MODEL:', selectedModel);
      console.error('🔴 OllamaPromptService TYPEOF MODEL:', typeof selectedModel);

      const requestPayload = {
        prompt: prompt,
        model: selectedModel
      };
      console.error('🔴 OllamaPromptService FULL PAYLOAD:', JSON.stringify({ model: requestPayload.model, promptLength: requestPayload.prompt.length }));

      const result = await (window as any).electronAPI.ollamaGenerate(requestPayload);

      if (result.success) {
        this.trail.light(6412, {
          operation: 'ollama_call_success',
          responseLength: result.response?.length || 0,
          responsePreview: result.response?.substring(0, 100),
          timestamp: Date.now()
        });

        console.log('✅ CENTRALIZED OLLAMA RESPONSE:', {
          success: result.success,
          responseLength: result.response?.length,
          responseStart: result.response?.substring(0, 200)
        });
      } else {
        this.trail.fail(8412, new Error(`Ollama call failed: ${result.error}`));
        console.log('❌ CENTRALIZED OLLAMA FAILED:', result.error);
      }

      return result;

    } catch (error) {
      this.trail.fail(8410, error as Error);
      console.error('❌ Coaching generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Build the final prompt with all variables substituted
   */
  private buildPrompt(context: PromptContext): string {
    this.trail.light(6420, {
      operation: 'prompt_building_start',
      templateLength: this.promptTemplate.length,
      toolCount: this.ragTools.length,
      timestamp: Date.now()
    });

    // Start with our direct coaching template
    let prompt = this.promptTemplate;

    // Replace all placeholders with actual values
    prompt = prompt
      .replace(/{{TOOLS_JSON}}/g, JSON.stringify(this.ragTools, null, 2))
      .replace(/{{TRANSCRIPT}}/g, context.transcript || '[NO TRANSCRIPT AVAILABLE]')
      .replace(/{{STAGE}}/g, context.salesStage || this.detectSalesStage(context.transcript))
      .replace(/{{SENTIMENT}}/g, context.sentiment || 'neutral')
      .replace(/{{TOPICS}}/g, context.topics?.join(', ') || 'none detected')
      .replace(/{{OBJECTIONS}}/g, context.objections?.join(', ') || 'none detected');

    this.trail.light(6421, {
      operation: 'prompt_building_complete',
      finalLength: prompt.length,
      variablesReplaced: 6,
      timestamp: Date.now()
    });

    console.log('✅ CENTRALIZED PROMPT BUILT:', {
      finalLength: prompt.length,
      toolsEmbedded: this.ragTools.length,
      hasTranscript: !!context.transcript
    });

    return prompt;
  }

  /**
   * Load RAG tools from the JSON file
   */
  private async loadRAGTools(): Promise<void> {
    if (this.ragTools.length > 0) {
      return; // Already loaded
    }

    try {
      // Get RAG file from settings or use condensed version by default
      const savedSettings = localStorage.getItem('voicecoach-settings');
      let ragPath = 'rag/13ToolsRAG-01-condensed.json'; // Default to condensed version

      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          if (settings.coaching?.ragFile) {
            ragPath = settings.coaching.ragFile;
          }
        } catch (e) {
          console.warn('Failed to parse settings for RAG file, using default');
        }
      }

      const fileData = await (window as any).electronAPI.readFile(ragPath);

      if (fileData && fileData.content) {
        this.ragTools = JSON.parse(fileData.content);

        this.trail.light(6430, {
          operation: 'rag_tools_loaded',
          toolCount: this.ragTools.length,
          ragPath,
          timestamp: Date.now()
        });

        console.log('✅ RAG tools loaded:', this.ragTools.length, 'tools');
      } else {
        throw new Error('Failed to read RAG tools file');
      }
    } catch (error) {
      this.trail.fail(8430, error as Error);
      console.error('❌ Failed to load RAG tools:', error);
      this.ragTools = []; // Fallback to empty array
    }
  }

  /**
   * Load the direct coaching prompt template
   */
  private async loadPromptTemplate(): Promise<void> {
    try {
      const templatePath = 'ollama-prompts/direct-coaching-prompt.md';
      const fileData = await (window as any).electronAPI.readFile(templatePath);

      if (fileData && fileData.content) {
        this.promptTemplate = fileData.content.trim();

        this.trail.light(6440, {
          operation: 'prompt_template_loaded',
          templateLength: this.promptTemplate.length,
          templatePath,
          timestamp: Date.now()
        });

        console.log('✅ Direct coaching template loaded:', this.promptTemplate.length, 'characters');
      } else {
        throw new Error('Failed to read prompt template file');
      }
    } catch (error) {
      this.trail.fail(8440, error as Error);
      console.error('❌ Failed to load prompt template:', error);
      // Use fallback template if file fails
      this.promptTemplate = this.getFallbackTemplate();
    }
  }

  /**
   * Simple sales stage detection
   */
  private detectSalesStage(transcript: string): string {
    const lower = transcript.toLowerCase();

    if (lower.includes('next steps') || lower.includes('get started') || lower.includes('contract')) {
      return 'closing';
    }
    if (lower.includes('expensive') || lower.includes('concern') || lower.includes('not sure')) {
      return 'objection_handling';
    }
    if (lower.includes('how does') || lower.includes('show me') || lower.includes('features')) {
      return 'demo';
    }
    return 'discovery';
  }

  /**
   * Fallback template if file loading fails
   */
  private getFallbackTemplate(): string {
    return `You are a professional sales coach. Analyze the conversation and provide immediate, actionable coaching.

AVAILABLE COACHING TOOLS:
{{TOOLS_JSON}}

CURRENT CONVERSATION:
{{TRANSCRIPT}}

CONVERSATION CONTEXT:
- Sales Stage: {{STAGE}}
- Sentiment: {{SENTIMENT}}
- Key Topics: {{TOPICS}}
- Detected Objections: {{OBJECTIONS}}

Based on the prospect's last statement, select the most appropriate tool from the available tools and generate a coaching suggestion.

Return ONLY a JSON object in this exact format:
{
  "tool": "[selected tool name]",
  "say_this": "[exact words to say]",
  "why": "[brief explanation]",
  "confidence": "high|medium|low"
}`;
  }

  /**
   * Get service status for debugging
   */
  getStatus(): { initialized: boolean; toolCount: number; hasTemplate: boolean } {
    return {
      initialized: this.ragTools.length > 0 && this.promptTemplate.length > 0,
      toolCount: this.ragTools.length,
      hasTemplate: this.promptTemplate.length > 0
    };
  }
}

// Export singleton instance
export const ollamaPromptService = new OllamaPromptService();