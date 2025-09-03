/**
 * Browser-compatible Customization Service for VoiceCoach V2
 * Manages sales methodology customization without Node.js dependencies
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

interface CustomizationConfig {
  methodology: string;
  responseStyle: string;
  maxWords: number;
  priorityTechniques: string[];
  industryContext: string;
  customRules: string[];
}

class CustomizationServiceBrowser {
  private trail: BreadcrumbTrail;
  private config: CustomizationConfig;
  
  constructor() {
    this.trail = new BreadcrumbTrail('CustomizationServiceBrowser');
    
    // Default configuration
    this.config = {
      methodology: 'Chris Voss',
      responseStyle: 'concise',
      maxWords: 25,
      priorityTechniques: ['mirroring', 'labeling', 'calibrated questions'],
      industryContext: 'general',
      customRules: []
    };
    
    this.loadConfig();
  }
  
  /**
   * Load configuration from localStorage (browser-safe)
   */
  private loadConfig(): void {
    try {
      const saved = localStorage.getItem('voicecoach_customization');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
        console.log('✅ Loaded customization from localStorage');
      }
    } catch (error) {
      console.warn('Could not load customization:', error);
    }
  }
  
  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem('voicecoach_customization', JSON.stringify(this.config));
      console.log('✅ Saved customization to localStorage');
    } catch (error) {
      console.error('Failed to save customization:', error);
    }
  }
  
  /**
   * Process a customization request from sales manager
   */
  async processCustomizationRequest(request: string): Promise<string> {
    this.trail.light(7200, {
      operation: 'customization_request',
      request_length: request.length
    });
    
    // Parse the request and update configuration
    const lowerRequest = request.toLowerCase();
    
    // Detect methodology preferences
    if (lowerRequest.includes('chris voss') || lowerRequest.includes('never split')) {
      this.config.methodology = 'Chris Voss';
    } else if (lowerRequest.includes('spin')) {
      this.config.methodology = 'SPIN';
    } else if (lowerRequest.includes('challenger')) {
      this.config.methodology = 'Challenger';
    }
    
    // Detect response style preferences
    if (lowerRequest.includes('short') || lowerRequest.includes('brief') || lowerRequest.includes('concise')) {
      this.config.responseStyle = 'concise';
      this.config.maxWords = 25;
    } else if (lowerRequest.includes('detailed') || lowerRequest.includes('comprehensive')) {
      this.config.responseStyle = 'detailed';
      this.config.maxWords = 50;
    }
    
    // Detect technique preferences
    if (lowerRequest.includes('mirror')) {
      if (!this.config.priorityTechniques.includes('mirroring')) {
        this.config.priorityTechniques.push('mirroring');
      }
    }
    if (lowerRequest.includes('label')) {
      if (!this.config.priorityTechniques.includes('labeling')) {
        this.config.priorityTechniques.push('labeling');
      }
    }
    if (lowerRequest.includes('calibrated question')) {
      if (!this.config.priorityTechniques.includes('calibrated questions')) {
        this.config.priorityTechniques.push('calibrated questions');
      }
    }
    
    // Save the updated configuration
    this.saveConfig();
    
    this.trail.light(7201, {
      operation: 'customization_applied',
      methodology: this.config.methodology,
      maxWords: this.config.maxWords
    });
    
    return `Configuration updated:
- Methodology: ${this.config.methodology}
- Response style: ${this.config.responseStyle} (max ${this.config.maxWords} words)
- Priority techniques: ${this.config.priorityTechniques.join(', ')}`;
  }
  
  /**
   * Apply a template configuration
   */
  async applyTemplate(templateName: string): Promise<string> {
    const templates: Record<string, Partial<CustomizationConfig>> = {
      'aggressive': {
        methodology: 'Challenger',
        responseStyle: 'assertive',
        maxWords: 30,
        priorityTechniques: ['challenge', 'reframe', 'insight']
      },
      'consultative': {
        methodology: 'SPIN',
        responseStyle: 'detailed',
        maxWords: 40,
        priorityTechniques: ['situation', 'problem', 'implication', 'need']
      },
      'tactical': {
        methodology: 'Chris Voss',
        responseStyle: 'concise',
        maxWords: 25,
        priorityTechniques: ['mirroring', 'labeling', 'calibrated questions']
      }
    };
    
    const template = templates[templateName.toLowerCase()];
    if (template) {
      this.config = { ...this.config, ...template };
      this.saveConfig();
      
      return `Applied "${templateName}" template successfully`;
    }
    
    return `Template "${templateName}" not found. Available: aggressive, consultative, tactical`;
  }
  
  /**
   * Get current configuration
   */
  getConfiguration(): CustomizationConfig {
    return { ...this.config };
  }
  
  /**
   * Reset to defaults
   */
  resetToDefaults(): void {
    this.config = {
      methodology: 'Chris Voss',
      responseStyle: 'concise',
      maxWords: 25,
      priorityTechniques: ['mirroring', 'labeling', 'calibrated questions'],
      industryContext: 'general',
      customRules: []
    };
    this.saveConfig();
  }
}

// Export singleton instance
export const customizationService = new CustomizationServiceBrowser();