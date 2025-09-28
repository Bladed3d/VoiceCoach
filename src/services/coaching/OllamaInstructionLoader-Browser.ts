/**
 * VoiceCoach V2 - Ollama Instruction Loader (Browser/Electron Version)
 * This version works in the browser context using IPC to read files
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

export class OllamaInstructionLoaderBrowser {
  private trail: BreadcrumbTrail;
  private instructionTemplate: string = '';
  private instructionFilePath: string = ''; // NO DEFAULT - FAIL LOUDLY IF NOT SELECTED
  private ragTools: any[] = []; // Cache for RAG tools

  constructor() {
    this.trail = new BreadcrumbTrail('OllamaInstructionLoader');

    // FORCE CACHE CLEAR to ensure settings are respected
    localStorage.removeItem('ollama_instructions_cache');

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
      console.error('🚨 LOCALSTORAGE CHECK: voicecoach-settings =', savedSettings);

      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        console.error('🚨 PARSED SETTINGS:', JSON.stringify(settings, null, 2));

        if (settings.ollama?.instructionFile) {
          const oldPath = this.instructionFilePath;
          this.instructionFilePath = `ollama-prompts/${settings.ollama.instructionFile}`;
          console.error('🚨 INSTRUCTION FILE OVERRIDE:', oldPath, '->', this.instructionFilePath);
          console.log('📂 Using saved instruction file:', this.instructionFilePath);
          
          this.trail.light(6408, {
            operation: 'instruction_file_preference_loaded',
            old_file: oldPath,
            new_file: this.instructionFilePath,
            source: 'localStorage'
          });
        }
      }
    } catch (error) {
      alert('🚨 CRITICAL ERROR: Failed to load instruction file preference!\n\nDevelopment halted - fix this issue before continuing.');
      this.trail.fail(8408, error as Error);
      throw new Error(`Instruction file preference loading failed: ${error}`);
    }
  }
  
  /**
   * Load instructions - for browser/Electron environment
   */
  private async loadInstructions(): Promise<boolean> {
    try {
      // If already loaded in memory, use it (no expiration!)
      if (this.instructionTemplate && this.instructionTemplate.length > 0) {
        console.log('📋 Using in-memory Ollama instructions (no expiration)');
        console.log('📂 Current instruction file:', this.instructionFilePath);
        // LED 6401: Using loaded instructions
        this.trail.light(6401, {
          operation: 'instruction_memory_hit',
          template_length: this.instructionTemplate.length,
          loaded_once: true,
          current_file: this.instructionFilePath
        });
        return true;
      }
      
      // Try to load from localStorage (permanent cache)
      const cachedInstructions = localStorage.getItem('ollama_instructions_cache');
      if (cachedInstructions) {
        const cached = JSON.parse(cachedInstructions);
        this.instructionTemplate = cached.template;
        
        const cacheAge = Date.now() - cached.timestamp;
        const cacheAgeMinutes = Math.floor(cacheAge / 60000);
        const cacheAgeHours = Math.floor(cacheAgeMinutes / 60);
        
        console.log(`📋 Loaded instructions from permanent cache (${cacheAgeHours}h ${cacheAgeMinutes % 60}m old)`);
        
        // LED 6401: Cache loaded (no expiration check!)
        this.trail.light(6401, {
          operation: 'instruction_cache_loaded',
          cache_age_hours: cacheAgeHours,
          cache_age_minutes: cacheAgeMinutes % 60,
          permanent: true
        });
        return true;
      }
      
      // If we have electronAPI, try to read the file
      if ((window as any).electronAPI?.readFile) {
        console.log(`📂 Attempting to read instruction file: ${this.instructionFilePath}`);
        
        // LED 6402: File read attempt
        this.trail.light(6402, {
          operation: 'instruction_file_read_attempt',
          file_path: this.instructionFilePath,
          timestamp: Date.now()
        });
        
        const fileData = await (window as any).electronAPI.readFile(this.instructionFilePath);
        
        if (fileData && fileData.content) {
          // Access the content property of the returned object
          const fileContent = fileData.content;
          console.log(`✅ File read successful, content length: ${fileContent.length}`);
          
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
          
          // LED 6403: File load success
          this.trail.light(6403, {
            operation: 'instruction_file_loaded',
            template_length: this.instructionTemplate.length,
            cached: true
          });
          
          console.log('✅ Ollama instructions loaded from file and cached');
          return true;
        } else {
          // LED 8404: File read returned null/empty
          this.trail.fail(8404, new Error(`File read failed or returned empty: ${this.instructionFilePath}`));
          console.error('❌ File read returned null or empty data:', fileData);
        }
      } else {
        // LED 8405: ElectronAPI not available
        this.trail.fail(8405, new Error('ElectronAPI.readFile not available - cannot read instruction files'));
        console.error('❌ ElectronAPI not available for file reading');
      }
      
      // NO SILENT FALLBACK - Make it visible!
      console.error('❌ INSTRUCTION LOADING FAILED: No Ollama instructions file found!');
      console.error('   Expected file at:', this.instructionFilePath);
      console.error('   This means AI coaching prompts are NOT configured properly!');
      
      // NO FALLBACK - CRASH LOUDLY
      const errorMsg = `🚨 INSTRUCTION FILE NOT FOUND: ${this.instructionFilePath}\n\nYou selected this file but it doesn't exist!\nFix the file selection or create the file.\n\nAPP WILL NOT WORK WITHOUT PROPER INSTRUCTION FILE!`;
      alert(errorMsg);
      throw new Error(`Selected instruction file not found: ${this.instructionFilePath}`);
      
    } catch (error) {
      this.trail.fail(8401, error as Error);
      console.error('❌ CRITICAL ERROR loading instructions:', error);

      // NO FALLBACK - CRASH LOUDLY
      const errorMsg = `🚨 CRITICAL INSTRUCTION LOADING ERROR!\n\nFile: ${this.instructionFilePath}\nError: ${error}\n\nAPP CANNOT FUNCTION - FIX THIS IMMEDIATELY!`;
      alert(errorMsg);
      throw new Error(`Critical instruction loading error: ${error}`);
      
      return false;
    }
  }
  
  /**
   * Load tools from RAG document
   */
  private async loadToolsFromRAG(): Promise<any[]> {
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
          const errorMsg = '🚨 CRITICAL RAG FILE ERROR!\n\nNO RAG FILE CONFIGURED IN SETTINGS!\n\nThe user must select a RAG file in the dropdown.\nApp cannot function without proper RAG file selection.\n\nFIX THIS IMMEDIATELY!';
          console.error(errorMsg);
          alert(errorMsg);
          throw new Error('RAG file not configured - user must select in settings');
        }

        console.log('📁 Using configured RAG file:', ragPath);
        const fileData = await (window as any).electronAPI.readFile(ragPath);

        if (fileData && fileData.content) {
          this.ragTools = JSON.parse(fileData.content);

          this.trail.light(6420, {
            operation: 'rag_tools_loaded',
            toolCount: this.ragTools.length,
            ragPath
          });

          return this.ragTools;
        }
      }

      throw new Error('Could not load RAG tools from file');

    } catch (error) {
      this.trail.fail(8420, error as Error);
      console.error('❌ Failed to load RAG tools:', error);
      return []; // Return empty array as fallback
    }
  }

  /**
   * Build the final prompt with variables replaced
   */
  async buildPrompt(context: {
    transcript: string;
    knowledge?: string;
    salesStage?: string;
    callDuration?: number;
    objections?: string[];
    topics?: string[];
    sentiment?: string;
    tools?: any[]; // Accept tools directly from context
  }): Promise<string> {
    
    // DEBUG: Log what we received and which file we're using
    console.log('🔧 INSTRUCTION LOADER - buildPrompt() called with:', {
      instructionFile: this.instructionFilePath,
      templateLength: this.instructionTemplate.length,
      transcriptLength: context.transcript?.length || 0,
      hasTools: !!context.tools,
      toolCount: context.tools?.length || 0
    });
    
    // If template is empty, load it
    if (!this.instructionTemplate) {
      // NO FALLBACK - CRASH LOUDLY
      const errorMsg = `🚨 NO INSTRUCTION TEMPLATE LOADED!\n\nYou must select an instruction file in Settings.\nCannot generate prompts without instructions.\n\nAPP WILL NOT WORK!`;
      alert(errorMsg);
      throw new Error('No instruction template loaded - select instruction file in Settings');
    }
    
    // Start with the template
    let prompt = this.instructionTemplate;

    // Get tools - either from context or load from RAG
    const tools = context.tools || await this.loadToolsFromRAG();

    // Replace ALL placeholders with actual values
    prompt = prompt
      .replace(/{{TOOLS_JSON}}/g, JSON.stringify(tools, null, 2))
      .replace(/{{TRANSCRIPT}}/g, context.transcript || '[NO TRANSCRIPT AVAILABLE]')
      .replace(/{{STAGE}}/g, context.salesStage || this.detectSalesStage(context.transcript))
      .replace(/{{SENTIMENT}}/g, context.sentiment || 'neutral')
      .replace(/{{TOPICS}}/g, context.topics?.join(', ') || 'none detected')
      .replace(/{{OBJECTIONS}}/g, context.objections?.join(', ') || 'none detected')
      // Legacy placeholders for backward compatibility
      .replace(/{TRANSCRIPT}/g, context.transcript || '[NO TRANSCRIPT AVAILABLE]')
      .replace(/{KNOWLEDGE_BASE}/g, context.knowledge || 'Knowledge loaded via tools')
      .replace(/{SALES_STAGE}/g, context.salesStage || this.detectSalesStage(context.transcript))
      .replace(/{DURATION}/g, (context.callDuration || 0).toString())
      .replace(/{OBJECTIONS}/g, context.objections?.join(', ') || this.detectObjections(context.transcript).join(', '))
      .replace(/{TOPICS}/g, context.topics?.join(', ') || 'General discussion')
      .replace(/{SENTIMENT}/g, context.sentiment || 'neutral')
      .replace(/{TIMESTAMP}/g, new Date().toISOString());

    console.log('✅ PROMPT BUILT:', {
      finalLength: prompt.length,
      toolsEmbedded: tools.length,
      hasTranscript: !!context.transcript
    });
    
    this.trail.light(6403, {
      prompt_built: true,
      variables_replaced: 8,
      final_length: prompt.length,
      transcript_was_empty: !context.transcript || context.transcript.trim().length === 0,
      instruction_file_used: this.instructionFilePath,
      template_length: this.instructionTemplate.length
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
  
  // REMOVED getDefaultInstructions() - NO MORE FALLBACKS!
  
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
    
    // Clear cache and memory template to force reload
    localStorage.removeItem('ollama_instructions_cache');
    this.instructionTemplate = ''; // Clear memory cache to force reload
    
    console.log('🧹 Cleared caches, forcing reload...');
    await this.loadInstructions();
    
    // LED tracking for instruction file change
    this.trail.light(6405, {
      operation: 'instruction_file_changed',
      new_file: fileName,
      path: this.instructionFilePath,
      template_loaded: this.instructionTemplate.length > 0
    });
    
    console.log('✅ Instruction file change complete. Template length:', this.instructionTemplate.length);
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