/**
 * Configuration Loader Service
 * Loads and manages all coaching configuration from external files
 * This allows customization without code changes
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import fs from 'fs';
import path from 'path';

export interface PromptTemplate {
  systemPrompt: string;
  responseFormat: any;
  compressionTargets: Record<string, number>;
  fallbackTemplates: {
    minimal: string;
    noKnowledge: string;
  };
}

export interface CompressionSettings {
  enabled: boolean;
  maxTotalChars: number;
  maxTokenEstimate: number;
  components: Record<string, any>;
  emergencyFallback: any;
}

export interface StageDetectionConfig {
  stages: Record<string, any>;
  detection: any;
  stageTransitions: Record<string, string[]>;
}

export interface CorePrinciples {
  always: string[];
  never: string[];
  compressed: {
    essential: string;
    extended: string;
    full: string;
  };
  methodologies: any;
  conversation_rules: any;
}

export interface CoachingUIConfig {
  display: any;
  cards: any;
  urgency: any;
  animations: any;
}

export class ConfigurationLoader {
  private trail: BreadcrumbTrail;
  private configPath: string;
  private cache: Map<string, any> = new Map();
  private fileWatchers: Map<string, fs.FSWatcher> = new Map();
  
  constructor() {
    this.trail = new BreadcrumbTrail('ConfigurationLoader');
    // In Electron, we'll use app.getPath('userData') in production
    // For now, use relative path from project root
    this.configPath = path.join(process.cwd(), 'config');
    
    this.trail.light(6300, {
      operation: 'config_loader_initialized',
      configPath: this.configPath
    });
  }
  
  /**
   * Load prompt template from markdown file
   */
  async loadPromptTemplate(): Promise<PromptTemplate> {
    try {
      if (this.cache.has('promptTemplate')) {
        return this.cache.get('promptTemplate');
      }
      
      const filePath = path.join(this.configPath, 'ollama', 'prompt-template.md');
      const content = await this.readFile(filePath);
      
      // Parse markdown to extract templates
      const template = this.parsePromptTemplate(content);
      this.cache.set('promptTemplate', template);
      
      // Watch for changes
      this.watchFile(filePath, 'promptTemplate');
      
      this.trail.light(6301, {
        operation: 'prompt_template_loaded',
        path: filePath
      });
      
      return template;
    } catch (error) {
      this.trail.fail(8301, error as Error);
      return this.getDefaultPromptTemplate();
    }
  }
  
  /**
   * Load compression settings
   */
  async loadCompressionSettings(): Promise<CompressionSettings> {
    try {
      if (this.cache.has('compressionSettings')) {
        return this.cache.get('compressionSettings');
      }
      
      const filePath = path.join(this.configPath, 'ollama', 'compression-settings.json');
      const settings = await this.readJSON<CompressionSettings>(filePath);
      
      this.cache.set('compressionSettings', settings);
      this.watchFile(filePath, 'compressionSettings');
      
      this.trail.light(6302, {
        operation: 'compression_settings_loaded',
        maxChars: settings.compression.maxTotalChars
      });
      
      return settings;
    } catch (error) {
      this.trail.fail(8302, error as Error);
      return this.getDefaultCompressionSettings();
    }
  }
  
  /**
   * Load stage detection configuration
   */
  async loadStageDetection(): Promise<StageDetectionConfig> {
    try {
      if (this.cache.has('stageDetection')) {
        return this.cache.get('stageDetection');
      }
      
      const filePath = path.join(this.configPath, 'ollama', 'stage-detection.json');
      const config = await this.readJSON<StageDetectionConfig>(filePath);
      
      this.cache.set('stageDetection', config);
      this.watchFile(filePath, 'stageDetection');
      
      this.trail.light(6303, {
        operation: 'stage_detection_loaded',
        stages: Object.keys(config.stages)
      });
      
      return config;
    } catch (error) {
      this.trail.fail(8303, error as Error);
      return this.getDefaultStageDetection();
    }
  }
  
  /**
   * Load core principles
   */
  async loadCorePrinciples(): Promise<CorePrinciples> {
    try {
      if (this.cache.has('corePrinciples')) {
        return this.cache.get('corePrinciples');
      }
      
      const filePath = path.join(this.configPath, 'ollama', 'core-principles.json');
      const principles = await this.readJSON<any>(filePath);
      
      this.cache.set('corePrinciples', principles.principles);
      this.watchFile(filePath, 'corePrinciples');
      
      this.trail.light(6304, {
        operation: 'core_principles_loaded',
        compressed_length: principles.principles.compressed.essential.length
      });
      
      return principles.principles;
    } catch (error) {
      this.trail.fail(8304, error as Error);
      return this.getDefaultCorePrinciples();
    }
  }
  
  /**
   * Load coaching UI configuration
   */
  async loadUIConfig(): Promise<CoachingUIConfig> {
    try {
      if (this.cache.has('uiConfig')) {
        return this.cache.get('uiConfig');
      }
      
      const filePath = path.join(this.configPath, 'coaching-ui.json');
      const config = await this.readJSON<CoachingUIConfig>(filePath);
      
      this.cache.set('uiConfig', config);
      this.watchFile(filePath, 'uiConfig');
      
      this.trail.light(6305, {
        operation: 'ui_config_loaded',
        maxPrompts: config.display.maxPromptsVisible
      });
      
      return config;
    } catch (error) {
      this.trail.fail(8305, error as Error);
      return this.getDefaultUIConfig();
    }
  }
  
  /**
   * Load coaching response templates
   */
  async loadResponseTemplates(): Promise<any> {
    try {
      if (this.cache.has('responseTemplates')) {
        return this.cache.get('responseTemplates');
      }
      
      const filePath = path.join(this.configPath, 'ollama', 'coaching-responses.md');
      const content = await this.readFile(filePath);
      
      const templates = this.parseResponseTemplates(content);
      this.cache.set('responseTemplates', templates);
      this.watchFile(filePath, 'responseTemplates');
      
      this.trail.light(6306, {
        operation: 'response_templates_loaded',
        templateCount: Object.keys(templates).length
      });
      
      return templates;
    } catch (error) {
      this.trail.fail(8306, error as Error);
      return {};
    }
  }
  
  /**
   * Load all configurations
   */
  async loadAll(): Promise<{
    promptTemplate: PromptTemplate;
    compression: CompressionSettings;
    stageDetection: StageDetectionConfig;
    principles: CorePrinciples;
    ui: CoachingUIConfig;
    responseTemplates: any;
  }> {
    const [promptTemplate, compression, stageDetection, principles, ui, responseTemplates] = 
      await Promise.all([
        this.loadPromptTemplate(),
        this.loadCompressionSettings(),
        this.loadStageDetection(),
        this.loadCorePrinciples(),
        this.loadUIConfig(),
        this.loadResponseTemplates()
      ]);
    
    this.trail.light(6307, {
      operation: 'all_configs_loaded',
      cacheSize: this.cache.size
    });
    
    return {
      promptTemplate,
      compression,
      stageDetection,
      principles,
      ui,
      responseTemplates
    };
  }
  
  /**
   * Clear cache and reload specific config
   */
  async reload(configName: string): Promise<any> {
    this.cache.delete(configName);
    
    const loaders: Record<string, () => Promise<any>> = {
      promptTemplate: () => this.loadPromptTemplate(),
      compressionSettings: () => this.loadCompressionSettings(),
      stageDetection: () => this.loadStageDetection(),
      corePrinciples: () => this.loadCorePrinciples(),
      uiConfig: () => this.loadUIConfig(),
      responseTemplates: () => this.loadResponseTemplates()
    };
    
    if (loaders[configName]) {
      return await loaders[configName]();
    }
    
    throw new Error(`Unknown config: ${configName}`);
  }
  
  /**
   * Watch file for changes and auto-reload
   */
  private watchFile(filePath: string, cacheKey: string): void {
    if (this.fileWatchers.has(filePath)) {
      return;
    }
    
    try {
      const watcher = fs.watch(filePath, async (eventType) => {
        if (eventType === 'change') {
          this.trail.light(6308, {
            operation: 'config_file_changed',
            file: filePath,
            cacheKey
          });
          
          // Clear cache and notify listeners
          this.cache.delete(cacheKey);
          
          // Emit event for components to reload
          const event = new CustomEvent('configChanged', {
            detail: { configName: cacheKey }
          });
          window.dispatchEvent(event);
        }
      });
      
      this.fileWatchers.set(filePath, watcher);
    } catch (error) {
      // File watching not available (browser environment)
      console.warn('File watching not available:', error);
    }
  }
  
  /**
   * Read file helper
   */
  private async readFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }
  
  /**
   * Read JSON file helper
   */
  private async readJSON<T>(filePath: string): Promise<T> {
    const content = await this.readFile(filePath);
    return JSON.parse(content);
  }
  
  /**
   * Parse prompt template from markdown
   */
  private parsePromptTemplate(markdown: string): PromptTemplate {
    // Extract sections using regex
    const systemPromptMatch = markdown.match(/```template\n([\s\S]*?)```/);
    const responseFormatMatch = markdown.match(/```json\n(\{[\s\S]*?\})\n```/);
    const compressionMatch = markdown.match(/\| Component \| Max Characters \|[\s\S]*?\n\n/);
    
    const systemPrompt = systemPromptMatch ? systemPromptMatch[1].trim() : '';
    const responseFormat = responseFormatMatch ? 
      JSON.parse(responseFormatMatch[1]) : {};
    
    // Parse compression targets from table
    const compressionTargets: Record<string, number> = {};
    if (compressionMatch) {
      const lines = compressionMatch[0].split('\n');
      lines.forEach(line => {
        const match = line.match(/\| ([^|]+) \| (\d+) \|/);
        if (match) {
          compressionTargets[match[1].trim()] = parseInt(match[2]);
        }
      });
    }
    
    // Extract fallback templates
    const minimalMatch = markdown.match(/### Minimal Prompt.*?```template\n([\s\S]*?)```/);
    const noKnowledgeMatch = markdown.match(/### No Knowledge Base.*?```template\n([\s\S]*?)```/);
    
    return {
      systemPrompt,
      responseFormat,
      compressionTargets,
      fallbackTemplates: {
        minimal: minimalMatch ? minimalMatch[1].trim() : '',
        noKnowledge: noKnowledgeMatch ? noKnowledgeMatch[1].trim() : ''
      }
    };
  }
  
  /**
   * Parse response templates from markdown
   */
  private parseResponseTemplates(markdown: string): any {
    const templates: any = {};
    
    // Extract JSON blocks
    const jsonBlocks = markdown.match(/```json\n([\s\S]*?)```/g);
    
    if (jsonBlocks) {
      jsonBlocks.forEach((block, index) => {
        const json = block.replace(/```json\n|```/g, '');
        try {
          const parsed = JSON.parse(json);
          templates[`template_${index}`] = parsed;
        } catch (e) {
          console.warn('Failed to parse template:', e);
        }
      });
    }
    
    return templates;
  }
  
  // Default configurations (fallbacks)
  private getDefaultPromptTemplate(): PromptTemplate {
    return {
      systemPrompt: 'You are a sales coach. Provide concise guidance.',
      responseFormat: {
        urgency: 'high|medium|low',
        suggestion: 'max 25 words',
        reasoning: 'max 20 words',
        next_action: 'max 25 words'
      },
      compressionTargets: {
        'Total Prompt': 3800,
        'Core Principles': 150,
        'Knowledge Base': 800,
        'Context': 500
      },
      fallbackTemplates: {
        minimal: 'Sales coach. Latest: "{text}". Suggest next action.',
        noKnowledge: 'Sales coach. Stage: {stage}. Suggest next action.'
      }
    };
  }
  
  private getDefaultCompressionSettings(): CompressionSettings {
    return {
      enabled: true,
      maxTotalChars: 3800,
      maxTokenEstimate: 4096,
      components: {
        principles: { maxChars: 150 },
        knowledgeBase: { maxChars: 800 },
        context: { maxChars: 500 }
      },
      emergencyFallback: {
        enabled: true,
        maxChars: 500
      }
    };
  }
  
  private getDefaultStageDetection(): StageDetectionConfig {
    return {
      stages: {
        discovery: { keywords: ['tell me', 'challenge', 'problem'] },
        demo: { keywords: ['show me', 'features', 'how does'] },
        objection_handling: { keywords: ['expensive', 'concern', 'but'] },
        closing: { keywords: ['next steps', 'get started', 'move forward'] },
        unknown: { keywords: [] }
      },
      detection: {
        strategy: 'keyword-matching',
        caseSensitive: false
      },
      stageTransitions: {}
    };
  }
  
  private getDefaultCorePrinciples(): CorePrinciples {
    return {
      always: ['Keep conversations going', 'Advance the sale'],
      never: ['End calls', 'Give up'],
      compressed: {
        essential: 'NEVER end calls. ALWAYS advance sale.',
        extended: 'Keep conversations going. Handle objections.',
        full: 'Maintain momentum. Transform objections. Build value.'
      },
      methodologies: {},
      conversation_rules: {}
    };
  }
  
  private getDefaultUIConfig(): CoachingUIConfig {
    return {
      display: {
        maxPromptsVisible: 1,
        position: 'right'
      },
      cards: {
        types: {}
      },
      urgency: {},
      animations: {}
    };
  }
  
  /**
   * Cleanup resources
   */
  dispose(): void {
    // Close all file watchers
    this.fileWatchers.forEach(watcher => watcher.close());
    this.fileWatchers.clear();
    this.cache.clear();
    
    this.trail.light(6309, {
      operation: 'config_loader_disposed'
    });
  }
}

// Export singleton instance
export const configLoader = new ConfigurationLoader();