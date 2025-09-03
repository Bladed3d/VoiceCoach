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
    
    // Check for saved instruction file preference
    this.loadInstructionFilePreference();
    
    // Load instructions on initialization
    this.loadInstructions();
    
    this.trail.light(6400, {
      service: 'OllamaInstructionLoader',
      instruction_file: this.instructionFilePath,
      browser_mode: true
    });
  }
  
  /**
   * Load instruction file preference from localStorage
   */
  private loadInstructionFilePreference(): void {
    try {
      const savedSettings = localStorage.getItem('voicecoach-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.ollama?.instructionFile) {
          this.instructionFilePath = `ollama-prompts/${settings.ollama.instructionFile}`;
          console.log('📂 Using saved instruction file:', this.instructionFilePath);
        }
      }
    } catch (error) {
      console.warn('Failed to load instruction file preference:', error);
    }
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
        const fileData = await (window as any).electronAPI.readFile(this.instructionFilePath);
        if (fileData && fileData.content) {
          // Access the content property of the returned object
          const fileContent = fileData.content;
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
      
      // NO SILENT FALLBACK - Make it visible!
      console.error('❌ INSTRUCTION LOADING FAILED: No Ollama instructions file found!');
      console.error('   Expected file at:', this.instructionFilePath);
      console.error('   This means AI coaching prompts are NOT configured properly!');
      
      // Set FAILED state instructions
      this.instructionTemplate = this.getDefaultInstructions();
      console.error('🔴 FAILED: System in FAILED state - cannot provide coaching!');
      
      // Show user-visible FAILED state
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          alert('🔴 AI COACHING FAILED!\n\nOllama instruction file not found.\nSystem is in FAILED state - cannot provide coaching.\n\nPlease check ollama-prompts/active-instructions.md');
        }, 2000);
      }
      
      return false; // Return false to indicate failure
      
    } catch (error) {
      this.trail.fail(8401, error as Error);
      console.error('❌ CRITICAL ERROR loading instructions:', error);
      console.error('🔴 FAILED: System in FAILED state - cannot provide coaching!');
      
      this.instructionTemplate = this.getDefaultInstructions();
      
      // Make the error visible to user
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          alert(`🔴 AI COACHING FAILED!\n\nFailed to load instructions: ${error}\n\nSystem is in FAILED state - cannot provide coaching.`);
        }, 2000);
      }
      
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
    
    // DEBUG: Log what we received
    console.log('🔧 INSTRUCTION LOADER - buildPrompt() called with:', {
      transcriptLength: context.transcript?.length || 0,
      transcriptContent: context.transcript || '[EMPTY]',
      hasKnowledge: !!context.knowledge,
      knowledgeLength: context.knowledge?.length || 0
    });
    
    // If template is empty, load it
    if (!this.instructionTemplate) {
      console.warn('⚠️ Template is empty, loading instructions...');
      this.loadInstructions();
      if (!this.instructionTemplate) {
        console.error('❌ Failed to load template, using default FAILED state');
        this.instructionTemplate = this.getDefaultInstructions();
      }
    }
    
    // Start with the template
    let prompt = this.instructionTemplate;
    
    // DEBUG: Check if template has the placeholder
    const hasTranscriptPlaceholder = prompt.includes('{TRANSCRIPT}');
    console.log('📝 TEMPLATE CHECK:', {
      hasTranscriptPlaceholder,
      templateLength: prompt.length,
      templatePreview: prompt.substring(0, 200)
    });
    
    // Replace variables with actual values
    const transcriptValue = context.transcript || '[NO TRANSCRIPT AVAILABLE]';
    const knowledgeValue = context.knowledge || 'No specific knowledge loaded';
    
    console.log('🔄 REPLACEMENT VALUES:', {
      transcript: transcriptValue.substring(0, 100),
      knowledge: knowledgeValue.substring(0, 100)
    });
    
    prompt = prompt
      .replace(/{TRANSCRIPT}/g, transcriptValue)
      .replace(/{KNOWLEDGE_BASE}/g, knowledgeValue)
      .replace(/{SALES_STAGE}/g, context.salesStage || this.detectSalesStage(context.transcript))
      .replace(/{DURATION}/g, (context.callDuration || 0).toString())
      .replace(/{OBJECTIONS}/g, context.objections?.join(', ') || this.detectObjections(context.transcript).join(', '))
      .replace(/{TOPICS}/g, context.topics?.join(', ') || 'General discussion')
      .replace(/{SENTIMENT}/g, context.sentiment || 'neutral')
      .replace(/{TIMESTAMP}/g, new Date().toISOString());
    
    // DEBUG: Check if replacement worked
    const stillHasPlaceholder = prompt.includes('{TRANSCRIPT}');
    console.log('✅ AFTER REPLACEMENT:', {
      stillHasPlaceholder,
      promptLength: prompt.length,
      promptPreview: prompt.substring(prompt.indexOf('CURRENT CONVERSATION:'), prompt.indexOf('CURRENT CONVERSATION:') + 200)
    });
    
    this.trail.light(6403, {
      prompt_built: true,
      variables_replaced: 8,
      final_length: prompt.length,
      transcript_was_empty: !context.transcript || context.transcript.trim().length === 0
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
   * Get default instructions - FAILURE STATE
   */
  private getDefaultInstructions(): string {
    return `FAILED: Ollama instruction loading failed.

CURRENT CONTEXT:
- Sales Stage: FAILED
- Call Duration: FAILED
- Objections: FAILED

KNOWLEDGE: FAILED - No knowledge base loaded

CONVERSATION: "{TRANSCRIPT}"

ERROR: Unable to load coaching instructions. Please check:
1. Ollama service is running
2. Instruction file exists at ollama-prompts/active-instructions.md
3. File permissions are correct

RESPONSE FORMAT (JSON):
{
  "suggestion": "FAILED: Cannot provide coaching - instruction loading failed",
  "priority": "HIGH",
  "category": "error",
  "technique": "FAILED",
  "confidence": 0.0
}

System is in FAILED state - cannot provide coaching suggestions.`;
  }
  
  /**
   * Reload instructions from file (call this when user clicks refresh)
   */
  async reloadInstructions(): Promise<void> {
    localStorage.removeItem('ollama_instructions_cache');
    await this.loadInstructions();
    console.log('🔄 Ollama instructions reloaded');
  }
  
  /**
   * Set a new instruction file and reload
   */
  async setInstructionFile(fileName: string): Promise<void> {
    this.instructionFilePath = `ollama-prompts/${fileName}`;
    console.log('🔀 Switching instruction file to:', this.instructionFilePath);
    
    // Clear cache and reload
    localStorage.removeItem('ollama_instructions_cache');
    await this.loadInstructions();
    
    // LED tracking for instruction file change
    this.trail.light(6405, {
      operation: 'instruction_file_changed',
      new_file: fileName,
      path: this.instructionFilePath
    });
  }
  
  /**
   * Get current instruction file name
   */
  getInstructionFileName(): string {
    return this.instructionFilePath.replace('ollama-prompts/', '');
  }
}

// Export singleton instance for browser use
export const ollamaInstructionLoader = new OllamaInstructionLoaderBrowser();