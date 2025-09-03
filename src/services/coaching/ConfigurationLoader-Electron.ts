/**
 * Configuration Loader Service - Electron Renderer Process Version
 * Loads and manages all coaching configuration for Electron desktop app
 * Uses Electron IPC instead of direct file system access
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

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
  compression?: {
    maxTotalChars: number;
    maxTokenEstimate: number;
    components: Record<string, any>;
  };
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
}

class ConfigurationLoaderElectron {
  private trail: BreadcrumbTrail;
  private configCache: Map<string, any> = new Map();
  private isInitialized: boolean = false;
  
  constructor() {
    this.trail = new BreadcrumbTrail('ConfigurationLoaderElectron');
  }
  
  /**
   * Initialize configuration loader
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // In Electron, we'll use default configurations stored in memory
      // These can be overridden via Electron IPC if needed
      this.loadDefaultConfigurations();
      this.isInitialized = true;
      
      this.trail.light(7100, {
        operation: 'config_loader_initialized',
        mode: 'electron_defaults'
      });
      
    } catch (error) {
      this.trail.fail(8100, error as Error);
      throw error;
    }
  }
  
  /**
   * Load default configurations into memory
   */
  private loadDefaultConfigurations(): void {
    // Default prompt template
    this.configCache.set('prompt-template', {
      systemPrompt: `You are an AI sales coach providing real-time guidance during calls.

CRITICAL CONSTRAINTS:
- ONE suggestion only (no alternatives)
- Total response under 25 words
- Be extremely concise and actionable
- Focus on what to say or do RIGHT NOW

Current transcript: {{transcript}}
Relevant knowledge: {{knowledge}}
Sales stage: {{salesStage}}`,
      responseFormat: {
        type: "object",
        properties: {
          suggestion: { type: "string", maxLength: 100 },
          technique: { type: "string" },
          confidence: { type: "number" }
        }
      },
      compressionTargets: {
        minimal: 500,
        standard: 1000,
        full: 2000
      },
      fallbackTemplates: {
        minimal: "Suggest: {{technique}} based on {{stage}}",
        noKnowledge: "Active listening. Ask open questions."
      }
    });
    
    // Default compression settings
    this.configCache.set('compression-settings', {
      enabled: true,
      maxTotalChars: 3800,
      maxTokenEstimate: 4096,
      compression: {
        maxTotalChars: 3800,
        maxTokenEstimate: 4096,
        components: {
          systemPrompt: { maxChars: 500 },
          transcript: { maxChars: 1000 },
          knowledge: { maxChars: 800 },
          history: { maxChars: 500 }
        }
      },
      components: {
        systemPrompt: { maxChars: 500 },
        transcript: { maxChars: 1000 },
        knowledge: { maxChars: 800 },
        history: { maxChars: 500 }
      },
      emergencyFallback: {
        template: "Brief: {{action}}",
        maxChars: 50
      }
    });
    
    // Default stage detection
    this.configCache.set('stage-detection', {
      stages: {
        discovery: {
          keywords: ["understand", "challenge", "problem", "need", "situation"],
          confidence: 0.7
        },
        presentation: {
          keywords: ["demo", "show", "feature", "benefit", "solution"],
          confidence: 0.7
        },
        objection: {
          keywords: ["concern", "worry", "expensive", "think about it", "not sure"],
          confidence: 0.8
        },
        closing: {
          keywords: ["decision", "ready", "start", "contract", "agreement"],
          confidence: 0.8
        }
      },
      detection: {
        windowSize: 100,
        defaultStage: "discovery"
      },
      stageTransitions: {
        discovery: ["presentation"],
        presentation: ["objection", "closing"],
        objection: ["presentation", "closing"],
        closing: ["objection"]
      }
    });
    
    // Default core principles
    this.configCache.set('core-principles', {
      always: [
        "Be concise (under 25 words)",
        "Give ONE actionable suggestion",
        "Use Chris Voss techniques when applicable"
      ],
      never: [
        "Provide multiple options",
        "Use complex explanations",
        "Exceed word limit"
      ],
      compressed: {
        essential: "Concise. Actionable. Chris Voss.",
        extended: "Brief coaching. One suggestion. Use mirroring, labeling, calibrated questions.",
        full: "Provide one brief, actionable suggestion under 25 words. Apply Chris Voss techniques."
      },
      methodologies: {
        "Chris Voss": {
          priority: 1,
          techniques: ["mirroring", "labeling", "calibrated questions", "tactical empathy"]
        }
      },
      conversation_rules: {
        response_time: "immediate",
        format: "suggestion_only",
        tone: "confident_supportive"
      }
    });
    
    // Default UI configuration
    this.configCache.set('coaching-ui', {
      display: {
        card_style: "gradient",
        animation: "fade-in",
        position: "top-right"
      },
      cards: {
        colors: {
          discovery: "#6366f1",
          presentation: "#06b6d4",
          objection: "#f59e0b",
          closing: "#10b981"
        }
      },
      urgency: {
        high: { pulse: true, sound: false },
        medium: { pulse: false, sound: false },
        low: { pulse: false, sound: false }
      }
    });
  }
  
  /**
   * Load prompt template configuration
   */
  async loadPromptTemplate(): Promise<PromptTemplate> {
    if (!this.isInitialized) await this.initialize();
    return this.configCache.get('prompt-template') as PromptTemplate;
  }
  
  /**
   * Load compression settings
   */
  async loadCompressionSettings(): Promise<CompressionSettings> {
    if (!this.isInitialized) await this.initialize();
    return this.configCache.get('compression-settings') as CompressionSettings;
  }
  
  /**
   * Load stage detection configuration
   */
  async loadStageDetection(): Promise<StageDetectionConfig> {
    if (!this.isInitialized) await this.initialize();
    return this.configCache.get('stage-detection') as StageDetectionConfig;
  }
  
  /**
   * Load core principles
   */
  async loadCorePrinciples(): Promise<CorePrinciples> {
    if (!this.isInitialized) await this.initialize();
    return this.configCache.get('core-principles') as CorePrinciples;
  }
  
  /**
   * Load UI configuration
   */
  async loadUIConfig(): Promise<CoachingUIConfig> {
    if (!this.isInitialized) await this.initialize();
    return this.configCache.get('coaching-ui') as CoachingUIConfig;
  }
  
  /**
   * Reload all configurations
   */
  async reloadAll(): Promise<void> {
    this.configCache.clear();
    this.isInitialized = false;
    await this.initialize();
  }
}

// Export singleton instance
export const configLoader = new ConfigurationLoaderElectron();