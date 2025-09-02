/**
 * VoiceCoach V2 - Ollama Instruction Loader
 * Loads Ollama instructions from an MD file for easy updates without code changes
 */

import * as fs from 'fs';
import * as path from 'path';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

export class OllamaInstructionLoader {
  private trail: BreadcrumbTrail;
  private instructionTemplate: string = '';
  private instructionFilePath: string;
  private lastModified: Date | null = null;
  private fileWatcher: fs.FSWatcher | null = null;
  
  constructor() {
    this.trail = new BreadcrumbTrail('OllamaInstructionLoader');
    
    // Default path - you can place your MD file here
    this.instructionFilePath = path.join(
      process.cwd(),
      'ollama-prompts',
      'active-instructions.md'
    );
    
    // Load instructions on initialization
    this.loadInstructions();
    
    // Watch for file changes (auto-reload when you edit the MD file)
    this.watchForChanges();
    
    this.trail.light(6400, {
      service: 'OllamaInstructionLoader',
      instruction_file: this.instructionFilePath,
      loaded: !!this.instructionTemplate
    });
  }
  
  /**
   * Load instructions from MD file
   */
  private loadInstructions(): boolean {
    try {
      // Check if file exists
      if (!fs.existsSync(this.instructionFilePath)) {
        // Create directory if it doesn't exist
        const dir = path.dirname(this.instructionFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Create default instruction file
        this.createDefaultInstructionFile();
        console.log(`📝 Created default instruction file at: ${this.instructionFilePath}`);
      }
      
      // Read the instruction file
      const fileContent = fs.readFileSync(this.instructionFilePath, 'utf-8');
      
      // Extract the system prompt section (between ```prompt markers)
      const promptMatch = fileContent.match(/```prompt\s*([\s\S]*?)\s*```/);
      if (promptMatch) {
        this.instructionTemplate = promptMatch[1].trim();
      } else {
        // If no prompt markers, use the entire file
        this.instructionTemplate = fileContent.trim();
      }
      
      // Track file modification time
      const stats = fs.statSync(this.instructionFilePath);
      this.lastModified = stats.mtime;
      
      this.trail.light(6401, {
        instructions_loaded: true,
        template_length: this.instructionTemplate.length,
        last_modified: this.lastModified
      });
      
      console.log(`✅ Ollama instructions loaded from: ${this.instructionFilePath}`);
      return true;
      
    } catch (error) {
      this.trail.fail(8401, error as Error);
      console.error(`❌ Failed to load instructions from ${this.instructionFilePath}:`, error);
      
      // Use fallback instructions
      this.instructionTemplate = this.getFallbackInstructions();
      return false;
    }
  }
  
  /**
   * Watch for file changes and auto-reload
   */
  private watchForChanges(): void {
    try {
      this.fileWatcher = fs.watch(this.instructionFilePath, (eventType) => {
        if (eventType === 'change') {
          console.log('🔄 Instruction file changed, reloading...');
          this.loadInstructions();
        }
      });
      
      this.trail.light(6402, {
        file_watching: true,
        path: this.instructionFilePath
      });
      
    } catch (error) {
      console.warn('⚠️ Could not set up file watcher:', error);
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
   * Create default instruction file with Never Split the Difference focus
   */
  private createDefaultInstructionFile(): void {
    const defaultContent = `# Ollama Coaching Instructions
## VoiceCoach V2 - Never Split the Difference Focus

Place your custom instructions here. The system will use everything between the prompt markers.

\`\`\`prompt
You are VoiceCoach, an expert sales coach specializing in Chris Voss's Never Split the Difference techniques.

CURRENT CONTEXT:
- Sales Stage: {SALES_STAGE}
- Call Duration: {DURATION} minutes
- Detected Objections: {OBJECTIONS}
- Topics Discussed: {TOPICS}
- Sentiment: {SENTIMENT}

AVAILABLE KNOWLEDGE:
{KNOWLEDGE_BASE}

CURRENT CONVERSATION:
"{TRANSCRIPT}"

COACHING OBJECTIVES:
1. Apply Never Split the Difference techniques when appropriate
2. Provide specific, actionable suggestions with exact wording
3. Address objections using tactical empathy
4. Guide toward successful outcome while maintaining rapport

RESPONSE FORMAT (JSON):
{
  "suggestion": "Exact words to say right now (be specific)",
  "priority": "HIGH|MEDIUM|LOW",
  "category": "objection_handling|discovery|closing|value_prop",
  "technique": "Which Never Split technique you're using",
  "reasoning": "Why this approach will work",
  "next_actions": ["Follow-up action 1", "Follow-up action 2"],
  "confidence": 0.0-1.0
}

KEY TECHNIQUES TO APPLY:
- Mirroring: Repeat last 3 words when they express concern
- Labeling: "It sounds like..." to acknowledge emotions
- Calibrated Questions: "How am I supposed to...?" for control
- Accusation Audit: Address negatives upfront
- Tactical Empathy: Understand and articulate their emotions

Focus on what the salesperson should say RIGHT NOW to advance the conversation.
\`\`\`

## Variables Available:
- {TRANSCRIPT} - Current conversation text
- {KNOWLEDGE_BASE} - ChromaDB results
- {SALES_STAGE} - Current detected stage
- {DURATION} - Call duration in minutes
- {OBJECTIONS} - Detected objections
- {TOPICS} - Topics discussed
- {SENTIMENT} - Emotional tone
- {TIMESTAMP} - Current time

## How to Customize:
1. Edit this file anytime - changes are loaded automatically
2. Keep the \`\`\`prompt markers around your instructions
3. Use {VARIABLES} which will be replaced with actual values
4. Save the file and the system will use your new instructions immediately
`;
    
    fs.writeFileSync(this.instructionFilePath, defaultContent);
  }
  
  /**
   * Get fallback instructions if file can't be loaded
   */
  private getFallbackInstructions(): string {
    return `You are a sales coach. Analyze this conversation and provide ONE specific suggestion.

Conversation: "{TRANSCRIPT}"
Knowledge: {KNOWLEDGE_BASE}

Respond with a JSON object containing:
- suggestion: What to say next
- priority: HIGH/MEDIUM/LOW
- category: objection_handling/discovery/closing/value_prop
- confidence: 0.0-1.0`;
  }
  
  /**
   * Get the path to the instruction file
   */
  getInstructionFilePath(): string {
    return this.instructionFilePath;
  }
  
  /**
   * Set a custom instruction file path
   */
  setInstructionFilePath(filePath: string): void {
    this.instructionFilePath = filePath;
    this.loadInstructions();
    
    // Update file watcher
    if (this.fileWatcher) {
      this.fileWatcher.close();
    }
    this.watchForChanges();
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
  }
}

// Export singleton instance
export const ollamaInstructionLoader = new OllamaInstructionLoader();