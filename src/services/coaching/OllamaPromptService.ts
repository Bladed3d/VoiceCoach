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
   * Reload the prompt template (e.g., when user changes instruction file in settings)
   */
  async reloadTemplate(): Promise<boolean> {
    try {
      this.trail.light(6449, {
        operation: 'prompt_template_reload_requested',
        reason: 'settings_changed',
        timestamp: Date.now()
      });

      console.log('🔄 Reloading instruction file from settings...');

      // Reload the prompt template from current settings
      await this.loadPromptTemplate();

      this.trail.light(6450, {
        operation: 'prompt_template_reload_complete',
        hasTemplate: this.promptTemplate.length > 0,
        templateLength: this.promptTemplate.length,
        timestamp: Date.now()
      });

      console.log('✅ Instruction file reloaded successfully, template length:', this.promptTemplate.length);
      return this.promptTemplate.length > 0;
    } catch (error) {
      this.trail.fail(8450, error as Error);
      console.error('❌ Failed to reload prompt template:', error);
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
    // Get the instruction file info for breadcrumb tracking
    const savedSettings = localStorage.getItem('voicecoach-settings');
    let instructionFile = 'active-instructions.md';
    try {
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.ollama?.instructionFile) {
          instructionFile = settings.ollama.instructionFile;
        }
      }
    } catch (e) {
      // Silent fallback
    }

    this.trail.light(6420, {
      operation: 'prompt_building_start',
      templateLength: this.promptTemplate.length,
      toolCount: this.ragTools.length,
      instructionFileUsed: instructionFile,
      templatePath: `ollama-prompts/${instructionFile}`,
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
      instructionFileUsed: instructionFile,
      topicsDetected: context.topics,
      objectionsDetected: context.objections,
      timestamp: Date.now()
    });

    console.log('🔍 LED 6421: CONTEXT SENT TO OLLAMA:', {
      instructionFile,
      transcript: context.transcript?.substring(0, 100),
      topics: context.topics,
      objections: context.objections,
      sentiment: context.sentiment,
      stage: context.salesStage
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
   * Load the prompt template from user-selected instruction file
   */
  private async loadPromptTemplate(): Promise<void> {
    try {
      // Get user-selected instruction file from settings
      const savedSettings = localStorage.getItem('voicecoach-settings');
      let instructionFile = 'active-instructions.md'; // Default fallback
      let settingsFound = false;

      this.trail.light(6441, {
        operation: 'instruction_file_selection_start',
        hasStoredSettings: !!savedSettings,
        timestamp: Date.now()
      });

      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          if (settings.ollama?.instructionFile) {
            instructionFile = settings.ollama.instructionFile;
            settingsFound = true;

            this.trail.light(6442, {
              operation: 'user_instruction_file_selected',
              instructionFile,
              source: 'localStorage_settings',
              timestamp: Date.now()
            });

            console.log('📂 LED 6442: Using user-selected instruction file:', instructionFile);
          } else {
            this.trail.light(6443, {
              operation: 'no_instruction_file_in_settings',
              usingDefault: instructionFile,
              timestamp: Date.now()
            });
          }
        } catch (e) {
          this.trail.light(6444, {
            operation: 'settings_parse_failed',
            usingDefault: instructionFile,
            error: e instanceof Error ? e.message : 'Unknown error',
            timestamp: Date.now()
          });
          console.warn('⚠️ LED 6444: Failed to parse settings for instruction file, using default');
        }
      } else {
        this.trail.light(6445, {
          operation: 'no_settings_found',
          usingDefault: instructionFile,
          timestamp: Date.now()
        });
      }

      const templatePath = `ollama-prompts/${instructionFile}`;

      this.trail.light(6446, {
        operation: 'loading_instruction_file',
        templatePath,
        instructionFile,
        isUserSelected: settingsFound,
        timestamp: Date.now()
      });

      const fileData = await (window as any).electronAPI.readFile(templatePath);

      if (fileData && fileData.content) {
        // Extract content between ```prompt markers if they exist
        const promptMatch = fileData.content.match(/```prompt\s*([\s\S]*?)\s*```/);
        let extractionMethod = 'full_file';

        if (promptMatch) {
          this.promptTemplate = promptMatch[1].trim();
          extractionMethod = 'code_block';
          console.log('✅ LED 6447: Extracted prompt from markdown code block');
        } else {
          // If no markers, use entire file content
          this.promptTemplate = fileData.content.trim();
        }

        this.trail.light(6440, {
          operation: 'prompt_template_loaded_SUCCESS',
          templateLength: this.promptTemplate.length,
          templatePath,
          instructionFile,
          userSelected: settingsFound,
          extractionMethod,
          hasPromptMarkers: !!promptMatch,
          timestamp: Date.now()
        });

        console.log('✅ LED 6440: User-selected coaching template loaded:', this.promptTemplate.length, 'characters from', templatePath);
      } else {
        this.trail.fail(8441, new Error(`File read returned no content: ${templatePath}`));
        throw new Error('Failed to read prompt template file');
      }
    } catch (error) {
      this.trail.fail(8440, error as Error);
      console.error('❌ LED 8440: Failed to load prompt template:', error);

      this.trail.light(6448, {
        operation: 'using_fallback_template',
        reason: 'file_load_failed',
        timestamp: Date.now()
      });

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