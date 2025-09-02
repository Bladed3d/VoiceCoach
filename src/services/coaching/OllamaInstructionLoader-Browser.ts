/**
 * VoiceCoach V2 - Ollama Instruction Loader (Browser/Electron Version)
 * This version works in the browser context using IPC to read files
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

export class OllamaInstructionLoaderBrowser {
  private trail: BreadcrumbTrail;
  private instructionTemplate: string = '';
  private instructionFilePath: string = 'ollama-prompts/active-instructions.md';
  
  constructor() {
    this.trail = new BreadcrumbTrail('OllamaInstructionLoader');
    
    // Load instructions on initialization
    this.loadInstructions();
    
    this.trail.light(6400, {
      service: 'OllamaInstructionLoader',
      instruction_file: this.instructionFilePath,
      browser_mode: true
    });
  }
  
  /**
   * Load instructions - for browser/Electron environment
   */
  private async loadInstructions(): Promise<boolean> {
    try {
      // Try to load from localStorage first (for quick testing)
      const cachedInstructions = localStorage.getItem('ollama_instructions_cache');
      if (cachedInstructions) {
        const cached = JSON.parse(cachedInstructions);
        // Check if cache is less than 5 minutes old
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
          this.instructionTemplate = cached.template;
          console.log('📋 Using cached Ollama instructions');
          return true;
        }
      }
      
      // If we have electronAPI, try to read the file
      if ((window as any).electronAPI?.readFile) {
        const fileContent = await (window as any).electronAPI.readFile(this.instructionFilePath);
        if (fileContent) {
          // Extract the prompt section
          const promptMatch = fileContent.match(/```prompt\s*([\s\S]*?)\s*```/);
          if (promptMatch) {
            this.instructionTemplate = promptMatch[1].trim();
          } else {
            this.instructionTemplate = fileContent.trim();
          }
          
          // Cache it
          localStorage.setItem('ollama_instructions_cache', JSON.stringify({
            template: this.instructionTemplate,
            timestamp: Date.now()
          }));
          
          console.log('✅ Ollama instructions loaded from file');
          return true;
        }
      }
      
      // Fallback to default instructions
      this.instructionTemplate = this.getDefaultInstructions();
      console.log('📝 Using default Ollama instructions');
      return true;
      
    } catch (error) {
      this.trail.fail(8401, error as Error);
      console.error('❌ Failed to load instructions:', error);
      this.instructionTemplate = this.getDefaultInstructions();
      return false;
    }
  }
  
  /**
   * Build the final prompt with variables replaced
   */
  buildPrompt(context: {
    transcript: string;
    knowledge?: string;
    salesStage?: string;
    callDuration?: number;
    objections?: string[];
    topics?: string[];
    sentiment?: string;
  }): string {
    
    // If template is empty, load it
    if (!this.instructionTemplate) {
      this.loadInstructions();
      if (!this.instructionTemplate) {
        this.instructionTemplate = this.getDefaultInstructions();
      }
    }
    
    // Start with the template
    let prompt = this.instructionTemplate;
    
    // Replace variables with actual values
    prompt = prompt
      .replace(/{TRANSCRIPT}/g, context.transcript)
      .replace(/{KNOWLEDGE_BASE}/g, context.knowledge || 'No specific knowledge loaded')
      .replace(/{SALES_STAGE}/g, context.salesStage || this.detectSalesStage(context.transcript))
      .replace(/{DURATION}/g, (context.callDuration || 0).toString())
      .replace(/{OBJECTIONS}/g, context.objections?.join(', ') || this.detectObjections(context.transcript).join(', '))
      .replace(/{TOPICS}/g, context.topics?.join(', ') || 'General discussion')
      .replace(/{SENTIMENT}/g, context.sentiment || 'neutral')
      .replace(/{TIMESTAMP}/g, new Date().toISOString());
    
    this.trail.light(6403, {
      prompt_built: true,
      variables_replaced: 8,
      final_length: prompt.length
    });
    
    return prompt;
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
   * Simple objection detection
   */
  private detectObjections(transcript: string): string[] {
    const lower = transcript.toLowerCase();
    const objections: string[] = [];
    
    if (lower.includes('expensive') || lower.includes('cost') || lower.includes('budget')) {
      objections.push('price');
    }
    if (lower.includes('think about it') || lower.includes('not sure')) {
      objections.push('hesitation');
    }
    if (lower.includes('boss') || lower.includes('team') || lower.includes('approval')) {
      objections.push('authority');
    }
    
    return objections;
  }
  
  /**
   * Get default instructions with Never Split the Difference focus
   */
  private getDefaultInstructions(): string {
    return `You are VoiceCoach, an expert sales coach specializing in Chris Voss techniques.

CURRENT CONTEXT:
- Sales Stage: {SALES_STAGE}
- Call Duration: {DURATION} minutes
- Objections: {OBJECTIONS}

KNOWLEDGE: {KNOWLEDGE_BASE}

CONVERSATION: "{TRANSCRIPT}"

Apply Never Split the Difference techniques:
1. Mirroring - Repeat last 3 words for elaboration
2. Labeling - "It sounds like..." to acknowledge emotions
3. Calibrated Questions - "How/What" questions for control

RESPONSE FORMAT (JSON):
{
  "suggestion": "Exact words to say",
  "priority": "HIGH|MEDIUM|LOW",
  "category": "objection_handling|discovery|closing|value_prop",
  "technique": "Which Voss technique you're using",
  "confidence": 0.0-1.0
}

Provide ONE specific action the salesperson should take RIGHT NOW.`;
  }
  
  /**
   * Reload instructions from file (call this when user clicks refresh)
   */
  async reloadInstructions(): Promise<void> {
    localStorage.removeItem('ollama_instructions_cache');
    await this.loadInstructions();
    console.log('🔄 Ollama instructions reloaded');
  }
}

// Export singleton instance for browser use
export const ollamaInstructionLoader = new OllamaInstructionLoaderBrowser();