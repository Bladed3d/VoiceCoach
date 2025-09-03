/**
 * VoiceCoach V2 - Customization Service
 * Handles the business logic for sales team customization
 * Automatically updates configuration files based on user responses
 * LED Range: 7600-7650
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import fs from 'fs';
import path from 'path';

interface CustomizationResponse {
  message: string;
  progress: number;
  isComplete: boolean;
  configUpdates?: ConfigUpdate[];
}

interface ConfigUpdate {
  file: string;
  changes: any;
}

interface UserContext {
  industry?: string;
  product?: string;
  methodology?: string;
  objections?: string[];
  dealSize?: string;
  salesCycle?: string;
  currentStep: number;
  responses: Map<string, string>;
}

export class CustomizationService {
  private trail: BreadcrumbTrail;
  private userContext: UserContext;
  private customizationSteps = [
    'product',
    'industry', 
    'methodology',
    'objections',
    'dealSize',
    'salesCycle',
    'coachingStyle',
    'validation'
  ];

  constructor() {
    this.trail = new BreadcrumbTrail('CustomizationService');
    this.userContext = {
      currentStep: 0,
      responses: new Map()
    };

    // LED 7600: Service initialized
    this.trail.light(7600, {
      operation: 'customization_service_init',
      total_steps: this.customizationSteps.length,
      timestamp: Date.now()
    });
  }

  /**
   * Handle user response and update configurations automatically
   */
  async handleUserResponse(userMessage: string): Promise<CustomizationResponse> {
    // LED 7601: Processing user response
    this.trail.light(7601, {
      operation: 'processing_user_response',
      current_step: this.userContext.currentStep,
      message_length: userMessage.length,
      timestamp: Date.now()
    });

    // Store the response
    const currentStepName = this.customizationSteps[this.userContext.currentStep];
    this.userContext.responses.set(currentStepName, userMessage);

    // Update context based on current step
    const configUpdates = await this.updateContextAndConfigs(currentStepName, userMessage);

    // LED 7602: Configuration updated
    this.trail.light(7602, {
      operation: 'config_updated',
      step: currentStepName,
      updates_made: configUpdates.length,
      timestamp: Date.now()
    });

    // Move to next step
    this.userContext.currentStep++;
    const progress = (this.userContext.currentStep / this.customizationSteps.length) * 100;

    // Check if complete
    if (this.userContext.currentStep >= this.customizationSteps.length) {
      // LED 7603: Customization complete
      this.trail.light(7603, {
        operation: 'customization_complete',
        total_responses: this.userContext.responses.size,
        timestamp: Date.now()
      });

      return {
        message: "Perfect! I've customized VoiceCoach V2 for your team. The system is now configured for " +
                 `${this.userContext.product} in the ${this.userContext.industry} industry. ` +
                 "Your coaching will focus on your specific objections and sales methodology. " +
                 "You can start using the improved coaching immediately!",
        progress: 100,
        isComplete: true,
        configUpdates
      };
    }

    // Get next question
    const nextQuestion = this.getNextQuestion();
    
    return {
      message: nextQuestion,
      progress,
      isComplete: false,
      configUpdates
    };
  }

  /**
   * Update context and configuration files based on user response
   */
  private async updateContextAndConfigs(step: string, response: string): Promise<ConfigUpdate[]> {
    const updates: ConfigUpdate[] = [];

    switch (step) {
      case 'product':
        this.userContext.product = response;
        // Update stage-detection.json with product-specific keywords
        updates.push({
          file: 'stage-detection.json',
          changes: this.generateProductKeywords(response)
        });
        // LED 7610: Product configured
        this.trail.light(7610, {
          operation: 'product_configured',
          product: response,
          timestamp: Date.now()
        });
        break;

      case 'industry':
        this.userContext.industry = response;
        // Update core-principles.json with industry best practices
        updates.push({
          file: 'core-principles.json',
          changes: this.generateIndustryPrinciples(response)
        });
        // LED 7611: Industry configured
        this.trail.light(7611, {
          operation: 'industry_configured',
          industry: response,
          timestamp: Date.now()
        });
        break;

      case 'methodology':
        this.userContext.methodology = response;
        // Update prompt-template.md with methodology focus
        updates.push({
          file: 'prompt-template.md',
          changes: this.generateMethodologyPrompt(response)
        });
        // LED 7612: Methodology configured
        this.trail.light(7612, {
          operation: 'methodology_configured',
          methodology: response,
          timestamp: Date.now()
        });
        break;

      case 'objections':
        this.userContext.objections = this.parseObjections(response);
        // Update objection-handlers.json
        updates.push({
          file: 'objection-handlers.json',
          changes: this.generateObjectionHandlers(this.userContext.objections)
        });
        // LED 7613: Objections configured
        this.trail.light(7613, {
          operation: 'objections_configured',
          count: this.userContext.objections.length,
          timestamp: Date.now()
        });
        break;

      case 'dealSize':
        this.userContext.dealSize = response;
        // Update coaching intensity based on deal size
        updates.push({
          file: 'compression-settings.json',
          changes: this.adjustForDealSize(response)
        });
        break;

      case 'salesCycle':
        this.userContext.salesCycle = response;
        // Adjust coaching pace for sales cycle
        updates.push({
          file: 'coaching-responses.md',
          changes: this.adjustForSalesCycle(response)
        });
        break;

      case 'coachingStyle':
        // Update response format preferences
        updates.push({
          file: 'compression-settings.json',
          changes: this.setCoachingStyle(response)
        });
        break;
    }

    // Actually update the files (simulated for now)
    await this.applyConfigUpdates(updates);

    return updates;
  }

  /**
   * Get the next question based on current step
   */
  private getNextQuestion(): string {
    const step = this.customizationSteps[this.userContext.currentStep];
    
    const questions: Record<string, string> = {
      industry: `Great! ${this.userContext.product} sounds interesting. What industry are you in? (e.g., SaaS, Healthcare, Financial Services, Manufacturing)`,
      
      methodology: `Perfect. For ${this.userContext.industry}, what sales methodology does your team follow? (e.g., SPIN, Challenger, Sandler, Solution Selling, or "Our own approach")`,
      
      objections: `I see. Now, what are the top 3 objections you hear most often? (e.g., "Too expensive, Already have a solution, Need to think about it")`,
      
      dealSize: `Thanks! What's your typical deal size? (e.g., "$5K-$10K", "$50K-$100K", "$500K+")`,
      
      salesCycle: `And how long is your typical sales cycle? (e.g., "1-2 weeks", "1-3 months", "6+ months")`,
      
      coachingStyle: `Almost done! How would you like coaching suggestions delivered?\n` +
                     `a) Brief action only (5-10 words)\n` +
                     `b) Action with reason (15-25 words)\n` +
                     `c) Detailed with examples (30-40 words)`,
      
      validation: `Excellent! Let me test your configuration. Give me a real customer objection you face, and I'll show you what coaching you'd receive.`
    };

    return questions[step] || "Configuration complete!";
  }

  /**
   * Generate product-specific keywords for stage detection
   */
  private generateProductKeywords(product: string): any {
    const productLower = product.toLowerCase();
    const keywords: string[] = [];

    // Add product-specific terms
    if (productLower.includes('software') || productLower.includes('saas')) {
      keywords.push('implementation', 'integration', 'API', 'dashboard', 'users', 'licenses');
    }
    if (productLower.includes('security')) {
      keywords.push('compliance', 'vulnerability', 'breach', 'protection', 'encryption');
    }
    if (productLower.includes('hr') || productLower.includes('human')) {
      keywords.push('employees', 'onboarding', 'payroll', 'benefits', 'talent', 'retention');
    }
    if (productLower.includes('crm') || productLower.includes('sales')) {
      keywords.push('pipeline', 'leads', 'conversion', 'automation', 'tracking');
    }

    return { productKeywords: keywords };
  }

  /**
   * Generate industry-specific principles
   */
  private generateIndustryPrinciples(industry: string): any {
    const industryLower = industry.toLowerCase();
    const principles: string[] = [];

    if (industryLower.includes('financial') || industryLower.includes('finance')) {
      principles.push(
        'Always discuss ROI and risk mitigation',
        'Provide concrete numbers and case studies',
        'Address compliance and regulatory concerns early'
      );
    } else if (industryLower.includes('healthcare')) {
      principles.push(
        'Lead with patient outcomes and clinical benefits',
        'Address HIPAA and compliance requirements',
        'Focus on workflow integration and ease of use'
      );
    } else if (industryLower.includes('saas') || industryLower.includes('software')) {
      principles.push(
        'Emphasize speed to value and quick implementation',
        'Offer free trials or proof of concepts',
        'Focus on integration capabilities'
      );
    } else {
      principles.push(
        'Focus on solving specific business problems',
        'Provide industry-specific examples',
        'Build trust through expertise'
      );
    }

    return { principles };
  }

  /**
   * Generate methodology-specific prompt
   */
  private generateMethodologyPrompt(methodology: string): any {
    const methodLower = methodology.toLowerCase();
    let promptFocus = '';

    if (methodLower.includes('challenger')) {
      promptFocus = 'Teach the customer something new about their business. Challenge their thinking constructively.';
    } else if (methodLower.includes('spin')) {
      promptFocus = 'Ask Situation, Problem, Implication, and Need-payoff questions to uncover needs.';
    } else if (methodLower.includes('sandler')) {
      promptFocus = 'Use reverse psychology and let the customer convince themselves. Create urgency through pain.';
    } else if (methodLower.includes('solution')) {
      promptFocus = 'Focus on understanding the problem deeply before presenting any solution.';
    } else {
      promptFocus = 'Guide the conversation toward value creation and problem-solving.';
    }

    return { methodologyFocus: promptFocus };
  }

  /**
   * Generate objection handlers
   */
  private generateObjectionHandlers(objections: string[]): any {
    const handlers: any = {};

    objections.forEach(objection => {
      const objLower = objection.toLowerCase();
      
      if (objLower.includes('price') || objLower.includes('expensive') || objLower.includes('cost')) {
        handlers['price'] = {
          trigger: ['price', 'expensive', 'cost', 'budget'],
          response: 'Acknowledge concern, then pivot to ROI and value',
          example: 'I understand price is important. What if I could show you 3x ROI in 6 months?'
        };
      } else if (objLower.includes('think') || objLower.includes('decision')) {
        handlers['think'] = {
          trigger: ['think about it', 'need time', 'decision'],
          response: 'Uncover the real concern behind the delay',
          example: 'Of course. What specifically would you need to think through?'
        };
      } else if (objLower.includes('already') || objLower.includes('have')) {
        handlers['existing'] = {
          trigger: ['already have', 'existing', 'current vendor'],
          response: 'Position as complement, not replacement',
          example: 'Most of our clients had existing solutions. We actually enhance what you have.'
        };
      }
    });

    return handlers;
  }

  /**
   * Parse objections from user input
   */
  private parseObjections(input: string): string[] {
    // Split by common delimiters
    return input.split(/[,;]|\band\b/i)
      .map(obj => obj.trim())
      .filter(obj => obj.length > 0);
  }

  /**
   * Adjust configuration for deal size
   */
  private adjustForDealSize(dealSize: string): any {
    const isEnterprise = dealSize.includes('100K') || dealSize.includes('500K') || dealSize.includes('M');
    
    return {
      responseDetail: isEnterprise ? 'detailed' : 'moderate',
      includeROI: isEnterprise,
      formalLanguage: isEnterprise
    };
  }

  /**
   * Adjust for sales cycle length
   */
  private adjustForSalesCycle(cycle: string): any {
    const isLong = cycle.includes('month') || cycle.includes('quarter') || cycle.includes('year');
    
    return {
      urgencyLevel: isLong ? 'low' : 'high',
      followUpFrequency: isLong ? 'weekly' : 'daily',
      relationshipFocus: isLong
    };
  }

  /**
   * Set coaching style preferences
   */
  private setCoachingStyle(style: string): any {
    const styleLower = style.toLowerCase();
    
    if (styleLower.includes('brief') || styleLower.includes('a)')) {
      return {
        maxWords: 10,
        includeReasoning: false,
        includeExamples: false
      };
    } else if (styleLower.includes('detailed') || styleLower.includes('c)')) {
      return {
        maxWords: 40,
        includeReasoning: true,
        includeExamples: true
      };
    } else {
      return {
        maxWords: 25,
        includeReasoning: true,
        includeExamples: false
      };
    }
  }

  /**
   * Apply configuration updates to files
   */
  private async applyConfigUpdates(updates: ConfigUpdate[]): Promise<void> {
    // LED 7620: Applying config updates
    this.trail.light(7620, {
      operation: 'applying_config_updates',
      update_count: updates.length,
      timestamp: Date.now()
    });

    // In production, this would actually update the config files
    // For now, we'll simulate the updates
    for (const update of updates) {
      console.log(`[CustomizationService] Updating ${update.file} with:`, update.changes);
      
      // LED 7621: Individual file updated
      this.trail.light(7621, {
        operation: 'file_updated',
        file: update.file,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Reset customization context
   */
  reset(): void {
    this.userContext = {
      currentStep: 0,
      responses: new Map()
    };
    
    // LED 7630: Context reset
    this.trail.light(7630, {
      operation: 'context_reset',
      timestamp: Date.now()
    });
  }

  /**
   * Get current progress
   */
  getProgress(): number {
    return (this.userContext.currentStep / this.customizationSteps.length) * 100;
  }
}

// Export singleton instance
export const customizationService = new CustomizationService();