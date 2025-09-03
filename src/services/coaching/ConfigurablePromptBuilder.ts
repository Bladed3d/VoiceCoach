/**
 * Configurable Prompt Builder for VoiceCoach V2
 * Uses external configuration files for all prompt generation
 * Based on the successful old VoiceCoach prompt compression strategy
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { 
  configLoader,
  PromptTemplate, 
  CompressionSettings,
  StageDetectionConfig,
  CorePrinciples
} from './ConfigurationLoader-Electron';

export interface PromptContext {
  // Current conversation
  currentText: string;
  conversationHistory?: string[];
  
  // Detected elements
  detectedStage?: string;
  detectedObjections?: string[];
  detectedBuyingSignals?: string[];
  
  // Knowledge base
  relevantKnowledge?: string;
  
  // Metadata
  callDuration?: number;
  sentiment?: string;
  momentum?: string;
}

export interface CompressedPrompt {
  prompt: string;
  tokenEstimate: number;
  compressionRatio: number;
  componentsUsed: Record<string, number>;
  fallbackUsed: boolean;
}

export class ConfigurablePromptBuilder {
  private trail: BreadcrumbTrail;
  private promptTemplate?: PromptTemplate;
  private compressionSettings?: CompressionSettings;
  private stageDetection?: StageDetectionConfig;
  private principles?: CorePrinciples;
  private initialized: boolean = false;
  
  constructor() {
    this.trail = new BreadcrumbTrail('ConfigurablePromptBuilder');
    this.initialize();
  }
  
  /**
   * Initialize by loading all configurations
   */
  private async initialize(): Promise<void> {
    try {
      this.trail.light(6400, { operation: 'initialization_start' });
      
      await configLoader.initialize();
      const configs = {
        promptTemplate: await configLoader.loadPromptTemplate(),
        compressionSettings: await configLoader.loadCompressionSettings(),
        stageDetection: await configLoader.loadStageDetection(),
        corePrinciples: await configLoader.loadCorePrinciples()
      };
      
      this.promptTemplate = configs.promptTemplate;
      this.compressionSettings = configs.compressionSettings;
      this.stageDetection = configs.stageDetection;
      this.principles = configs.corePrinciples;
      
      this.initialized = true;
      
      this.trail.light(6401, {
        operation: 'initialization_complete',
        configs_loaded: Object.keys(configs).length
      });
      
      // Listen for config changes
      window.addEventListener('configChanged', this.handleConfigChange.bind(this));
      
    } catch (error) {
      this.trail.fail(8400, error as Error);
      // Use defaults if config loading fails
      this.useDefaults();
    }
  }
  
  /**
   * Build optimized prompt with compression
   */
  async buildPrompt(context: PromptContext): Promise<CompressedPrompt> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    this.trail.light(6402, {
      operation: 'build_prompt_start',
      text_length: context.currentText.length,
      has_knowledge: !!context.relevantKnowledge
    });
    
    try {
      // Detect sales stage if not provided
      const stage = context.detectedStage || this.detectStage(context.currentText);
      
      // Get stage-specific guidance
      const stageGuidance = this.getStageGuidance(stage);
      
      // Compress components
      const compressed = this.compressComponents(context, stage, stageGuidance);
      
      // Build final prompt
      const prompt = this.assemblePrompt(compressed, stage);
      
      // Estimate tokens
      const tokenEstimate = this.estimateTokens(prompt);
      
      // Check if we need emergency fallback
      if (tokenEstimate > this.compressionSettings!.compression.maxTokenEstimate) {
        return this.buildFallbackPrompt(context, stage);
      }
      
      const result: CompressedPrompt = {
        prompt,
        tokenEstimate,
        compressionRatio: prompt.length / this.compressionSettings!.compression.maxTotalChars,
        componentsUsed: compressed.sizes,
        fallbackUsed: false
      };
      
      this.trail.light(6403, {
        operation: 'build_prompt_complete',
        prompt_length: prompt.length,
        token_estimate: tokenEstimate,
        compression_ratio: result.compressionRatio,
        stage_detected: stage
      });
      
      return result;
      
    } catch (error) {
      this.trail.fail(8401, error as Error);
      return this.buildFallbackPrompt(context, 'unknown');
    }
  }
  
  /**
   * Detect sales stage from text
   */
  private detectStage(text: string): string {
    if (!this.stageDetection) return 'unknown';
    
    const textLower = text.toLowerCase();
    const { stages, detection } = this.stageDetection;
    
    // Check each stage in priority order
    for (const stage of detection.priorityOrder || Object.keys(stages)) {
      const stageConfig = stages[stage];
      if (!stageConfig || !stageConfig.keywords) continue;
      
      // Count keyword matches
      const matches = stageConfig.keywords.filter((keyword: string) => 
        textLower.includes(keyword.toLowerCase())
      ).length;
      
      if (matches >= (detection.minKeywordMatches || 1)) {
        this.trail.light(6404, {
          stage_detected: stage,
          keyword_matches: matches
        });
        return stage;
      }
    }
    
    return 'unknown';
  }
  
  /**
   * Get stage-specific guidance
   */
  private getStageGuidance(stage: string): string {
    if (!this.stageDetection) return '';
    
    const stageConfig = this.stageDetection.stages[stage];
    if (!stageConfig) return '';
    
    return stageConfig.guidance || '';
  }
  
  /**
   * Compress all components according to settings
   */
  private compressComponents(
    context: PromptContext, 
    stage: string,
    stageGuidance: string
  ): {
    components: Record<string, string>;
    sizes: Record<string, number>;
  } {
    const settings = this.compressionSettings!.compression.components;
    const components: Record<string, string> = {};
    const sizes: Record<string, number> = {};
    
    // Compress principles
    const principlesConfig = settings.principles;
    components.principles = this.compressPrinciples(principlesConfig.maxChars);
    sizes.principles = components.principles.length;
    
    // Stage guidance
    components.stageGuidance = this.truncate(stageGuidance, settings.stageGuidance.maxChars);
    sizes.stageGuidance = components.stageGuidance.length;
    
    // Knowledge base
    if (context.relevantKnowledge) {
      components.knowledge = this.compressKnowledge(
        context.relevantKnowledge,
        settings.knowledgeBase.maxChars,
        stage
      );
      sizes.knowledge = components.knowledge.length;
    } else {
      components.knowledge = '';
      sizes.knowledge = 0;
    }
    
    // Context (conversation history)
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      const recentMessages = context.conversationHistory
        .slice(-settings.context.maxMessages)
        .join(' ... ');
      components.context = this.truncate(recentMessages, settings.context.maxChars);
      sizes.context = components.context.length;
    } else {
      components.context = '';
      sizes.context = 0;
    }
    
    // Current text
    components.currentText = this.truncate(
      context.currentText,
      settings.currentText.maxChars
    );
    sizes.currentText = components.currentText.length;
    
    return { components, sizes };
  }
  
  /**
   * Compress principles to essential points
   */
  private compressPrinciples(maxChars: number): string {
    if (!this.principles) return 'Keep conversations going. Handle objections.';
    
    // Use pre-compressed version based on available space
    if (maxChars < 100) {
      return this.principles.compressed.essential;
    } else if (maxChars < 200) {
      return this.principles.compressed.extended;
    } else {
      return this.principles.compressed.full;
    }
  }
  
  /**
   * Compress knowledge base with stage awareness
   */
  private compressKnowledge(knowledge: string, maxChars: number, stage: string): string {
    if (!knowledge || knowledge.length <= maxChars) {
      return knowledge;
    }
    
    // Split into sentences
    const sentences = knowledge.split(/[.!?]+/).filter(s => s.trim());
    
    // Score sentences by relevance to stage
    const stageKeywords = this.getStageKeywords(stage);
    const scored = sentences.map(sentence => {
      const score = stageKeywords.reduce((acc, keyword) => {
        return acc + (sentence.toLowerCase().includes(keyword) ? 1 : 0);
      }, 0);
      return { sentence: sentence.trim(), score };
    });
    
    // Sort by score and take top sentences
    scored.sort((a, b) => b.score - a.score);
    
    let result = '';
    for (const item of scored) {
      const potential = result + (result ? '. ' : '') + item.sentence;
      if (potential.length <= maxChars) {
        result = potential;
      } else {
        break;
      }
    }
    
    return result || knowledge.substring(0, maxChars - 3) + '...';
  }
  
  /**
   * Get keywords for a stage
   */
  private getStageKeywords(stage: string): string[] {
    if (!this.stageDetection) return [];
    
    const stageConfig = this.stageDetection.stages[stage];
    return stageConfig?.keywords || [];
  }
  
  /**
   * Assemble final prompt from components
   */
  private assemblePrompt(
    compressed: { components: Record<string, string> },
    stage: string
  ): string {
    if (!this.promptTemplate) {
      return this.buildDefaultPrompt(compressed.components, stage);
    }
    
    let prompt = this.promptTemplate.systemPrompt;
    
    // Replace variables
    const replacements: Record<string, string> = {
      '{STAGE}': stage,
      '{PRINCIPLES}': compressed.components.principles,
      '{STAGE_GUIDANCE}': compressed.components.stageGuidance,
      '{KNOWLEDGE_BASE}': compressed.components.knowledge,
      '{CONTEXT}': compressed.components.context,
      '{CURRENT_TEXT}': compressed.components.currentText,
      '{RESPONSE_FORMAT}': JSON.stringify(this.promptTemplate.responseFormat, null, 2)
    };
    
    for (const [key, value] of Object.entries(replacements)) {
      prompt = prompt.replace(new RegExp(key, 'g'), value);
    }
    
    return prompt;
  }
  
  /**
   * Build fallback prompt when over token limit
   */
  private buildFallbackPrompt(context: PromptContext, stage: string): CompressedPrompt {
    const settings = this.compressionSettings?.emergencyFallback;
    const maxChars = settings?.maxChars || 500;
    
    let prompt: string;
    
    if (this.promptTemplate?.fallbackTemplates.minimal) {
      prompt = this.promptTemplate.fallbackTemplates.minimal
        .replace('{STAGE}', stage)
        .replace('{CURRENT_TEXT}', this.truncate(context.currentText, 100));
    } else {
      prompt = `Sales coach for ${stage}. Latest: "${this.truncate(context.currentText, 100)}". 
Suggest next action (JSON): {"urgency":"level","suggestion":"action","reasoning":"why","next_action":"say"}`;
    }
    
    this.trail.light(6405, {
      operation: 'fallback_prompt_used',
      prompt_length: prompt.length,
      stage
    });
    
    return {
      prompt,
      tokenEstimate: this.estimateTokens(prompt),
      compressionRatio: prompt.length / maxChars,
      componentsUsed: { fallback: prompt.length },
      fallbackUsed: true
    };
  }
  
  /**
   * Build default prompt without template
   */
  private buildDefaultPrompt(components: Record<string, string>, stage: string): string {
    return `Expert sales coach for ${stage} conversation.

PRINCIPLES: ${components.principles}

GUIDANCE: ${components.stageGuidance}

KNOWLEDGE: ${components.knowledge || 'Apply best practices'}

CONTEXT: ${components.context || 'Start of conversation'}

LATEST: "${components.currentText}"

Provide ONE proactive coaching suggestion (JSON):
{
  "urgency": "high|medium|low",
  "suggestion": "Next step (max 25 words)",
  "reasoning": "Why (max 20 words)",
  "next_action": "Say this (max 25 words)"
}`;
  }
  
  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    const ratio = this.compressionSettings?.compression.tokenEstimationRatio || 4;
    return Math.ceil(text.length / ratio);
  }
  
  /**
   * Truncate text with ellipsis
   */
  private truncate(text: string, maxChars: number): string {
    if (!text || text.length <= maxChars) {
      return text;
    }
    
    const strategy = this.compressionSettings?.compression.components.currentText.truncationStrategy;
    
    if (strategy === 'end-ellipsis') {
      return text.substring(0, maxChars - 3) + '...';
    } else {
      // Middle truncation
      const halfLength = Math.floor((maxChars - 3) / 2);
      return text.substring(0, halfLength) + '...' + 
             text.substring(text.length - halfLength);
    }
  }
  
  /**
   * Handle configuration changes
   */
  private async handleConfigChange(event: Event): Promise<void> {
    const customEvent = event as CustomEvent;
    const configName = customEvent.detail.configName;
    
    this.trail.light(6406, {
      operation: 'config_change_detected',
      config: configName
    });
    
    // Reload specific configuration
    await configLoader.reload(configName);
    
    // Reinitialize
    await this.initialize();
  }
  
  /**
   * Use default configurations
   */
  private useDefaults(): void {
    // These would be the minimal defaults to function
    this.promptTemplate = {
      systemPrompt: 'Sales coach. Provide guidance.',
      responseFormat: {
        urgency: 'level',
        suggestion: 'action',
        reasoning: 'why',
        next_action: 'say'
      },
      compressionTargets: { 'Total': 3800 },
      fallbackTemplates: {
        minimal: 'Coach: {CURRENT_TEXT}',
        noKnowledge: 'Coach for {STAGE}'
      }
    };
    
    this.initialized = true;
  }
  
  /**
   * Parse coaching response from Ollama
   */
  parseResponse(response: string): any {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(response);
      
      // Validate required fields
      if (parsed.urgency && parsed.suggestion) {
        return parsed;
      }
      
      // Try to extract JSON from text
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
    } catch (error) {
      this.trail.light(6407, {
        operation: 'parse_response_failed',
        error: (error as Error).message
      });
    }
    
    // Return fallback response
    return {
      urgency: 'medium',
      suggestion: 'Continue the conversation',
      reasoning: 'Maintain engagement',
      next_action: 'Ask a follow-up question'
    };
  }
}

// Export singleton instance
export const configurablePromptBuilder = new ConfigurablePromptBuilder();