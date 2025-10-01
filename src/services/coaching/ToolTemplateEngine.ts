/**
 * VoiceCoach V2 - Tool Template Engine
 * Config-driven template system for 13 sales coaching tools
 * Replaces AI prompt generation with instant pattern matching + variable substitution
 * LED Breadcrumbs: 6550-6599
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

/**
 * Variable extraction configuration
 */
export interface VariableExtraction {
  method: 'keyword' | 'ai' | 'regex';
  prompt?: string; // AI extraction prompt (if method === 'ai')
  maxTokens?: number; // Token limit for AI extraction
  regex?: string; // Regex pattern (if method === 'regex')
  fallback?: string; // Fallback value if extraction fails
}

/**
 * Template pattern with variable placeholders
 */
export interface TemplatePattern {
  pattern: string; // Template with {{VARIABLE}} placeholders
  variables: string[]; // List of variable names
  confidence: 'high' | 'medium' | 'low'; // Pattern confidence level
  context?: string; // Optional context hint for when to use this pattern
}

/**
 * Pattern matching triggers for instant tool selection
 */
export interface ToolTriggers {
  keywords: string[]; // Instant trigger keywords
  regex?: string; // Regex pattern for complex matching
  sentimentBias?: 'positive' | 'negative' | 'neutral'; // Sentiment preference
  stageBias?: number[]; // Preferred conversation stages (1-9)
}

/**
 * Complete tool definition
 */
export interface ToolTemplate {
  id: number;
  name: string;
  description: string;
  when_use: string;
  templates: TemplatePattern[];
  triggers: ToolTriggers;
  variableExtraction: Record<string, VariableExtraction>;
}

/**
 * Template engine configuration
 */
export interface TemplateEngineConfig {
  configFile: string; // Path to JSON config file
  enableCache?: boolean; // Enable template result caching
  enableDebug?: boolean; // Enable debug logging
}

/**
 * Template filling result
 */
export interface TemplateResult {
  toolId: number;
  toolName: string;
  filledPrompt: string;
  variables: Record<string, string>;
  patternIndex: number;
  confidence: 'high' | 'medium' | 'low';
  processingTime: number;
}

/**
 * Tool Template Engine
 * Manages 13 coaching tool templates with instant pattern matching and variable substitution
 */
export class ToolTemplateEngine {
  private trail: BreadcrumbTrail;
  private tools: Map<number, ToolTemplate>;
  private config: TemplateEngineConfig;
  private cache: Map<string, TemplateResult>;

  constructor(configFile: string = 'rag/13ToolsRAG-01-templates.json') {
    this.trail = new BreadcrumbTrail('ToolTemplateEngine');
    this.tools = new Map();
    this.cache = new Map();

    this.config = {
      configFile,
      enableCache: true,
      enableDebug: false
    };

    this.trail.light(6550, {
      operation: 'tool_template_engine_initialized',
      configFile,
      timestamp: Date.now()
    });
  }

  /**
   * Load tool templates from config file
   */
  async loadConfig(customPath?: string): Promise<void> {
    const configPath = customPath || this.config.configFile;

    try {
      console.log(`🔍🔍🔍 TOOL TEMPLATE ENGINE: loadConfig() called with path: ${configPath}`);
      this.trail.light(6551, {
        operation: 'config_loading_start',
        configPath
      });

      // Use Electron IPC for file access (this is a desktop-only app)
      if (!window.electronAPI) {
        throw new Error('ToolTemplateEngine requires Electron environment (window.electronAPI not available)');
      }

      const fileResponse = await window.electronAPI.readFile(configPath);

      this.trail.light(6553, {
        operation: 'file_response_received',
        responseType: typeof fileResponse,
        isArray: Array.isArray(fileResponse),
        isString: typeof fileResponse === 'string',
        keys: typeof fileResponse === 'object' ? Object.keys(fileResponse) : [],
        hasContent: typeof fileResponse === 'object' && 'content' in fileResponse
      });

      // Extract actual content from Electron API response
      let fileContent: any;
      if (typeof fileResponse === 'object' && fileResponse !== null && 'content' in fileResponse) {
        // Electron API returns {content, size, name, path}
        fileContent = (fileResponse as any).content;
        this.trail.light(6554, {
          operation: 'extracted_content_from_response',
          contentType: typeof fileContent,
          size: (fileResponse as any).size
        });
      } else {
        // Direct content (legacy format)
        fileContent = fileResponse;
      }

      // Handle both string and already-parsed JSON
      let toolsData: ToolTemplate[];
      if (typeof fileContent === 'string') {
        toolsData = JSON.parse(fileContent);
      } else if (Array.isArray(fileContent)) {
        // Already parsed by Electron API and is an array
        toolsData = fileContent as ToolTemplate[];
      } else if (typeof fileContent === 'object' && fileContent !== null) {
        // Check if it's wrapped in a property
        const keys = Object.keys(fileContent);
        this.trail.light(6555, {
          operation: 'object_wrapper_detected',
          keys: keys,
          firstKey: keys[0]
        });

        // Try common wrapper properties
        if ('data' in fileContent) {
          toolsData = (fileContent as any).data;
        } else if ('tools' in fileContent) {
          toolsData = (fileContent as any).tools;
        } else {
          throw new Error(`Unexpected content structure - keys: ${keys.join(', ')}`);
        }
      } else {
        throw new Error(`Invalid file format - expected array or string, got ${typeof fileContent}`);
      }

      // Validate and load tools
      this.tools.clear();
      for (const tool of toolsData) {
        this.validateToolTemplate(tool);
        this.tools.set(tool.id, tool);
      }

      this.trail.light(6552, {
        operation: 'config_loaded_successfully',
        toolCount: this.tools.size,
        configPath
      });

      // Write success to window title for debugging (visible without DevTools)
      if (typeof document !== 'undefined') {
        const originalTitle = document.title;
        document.title = `✅ Templates:${this.tools.size} | ${originalTitle}`;
      }

    } catch (error) {
      this.trail.fail(8550, error as Error, {
        configPath,
        operation: 'config_loading_failed'
      });
      throw error;
    }
  }

  /**
   * Validate tool template structure
   */
  private validateToolTemplate(tool: ToolTemplate): void {
    if (!tool.id || !tool.name || !tool.templates || !tool.triggers) {
      throw new Error(`Invalid tool template: ${JSON.stringify(tool)}`);
    }

    // Validate templates
    for (const template of tool.templates) {
      if (!template.pattern || !template.variables || !template.confidence) {
        throw new Error(`Invalid template pattern in tool ${tool.id}: ${JSON.stringify(template)}`);
      }
    }

    // Validate triggers
    if (!tool.triggers.keywords || !Array.isArray(tool.triggers.keywords)) {
      throw new Error(`Invalid triggers in tool ${tool.id}: keywords must be an array`);
    }
  }

  /**
   * Fill template with variable values
   */
  fillTemplate(
    toolId: number,
    variables: Record<string, string>,
    patternIndex: number = 0
  ): TemplateResult {
    const startTime = performance.now();

    try {
      const tool = this.tools.get(toolId);
      if (!tool) {
        throw new Error(`Tool ${toolId} not found`);
      }

      if (patternIndex >= tool.templates.length) {
        throw new Error(`Pattern index ${patternIndex} out of range for tool ${toolId}`);
      }

      const template = tool.templates[patternIndex];
      let filledPrompt = template.pattern;

      // Replace all {{VARIABLE}} placeholders
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        filledPrompt = filledPrompt.replace(new RegExp(placeholder, 'g'), value);
      }

      // Check for unreplaced variables
      const unreplacedMatch = filledPrompt.match(/\{\{([A-Z_]+)\}\}/);
      if (unreplacedMatch) {
        this.trail.light(6554, {
          operation: 'template_variable_missing',
          toolId,
          missingVariable: unreplacedMatch[1],
          pattern: template.pattern
        });
      }

      const processingTime = performance.now() - startTime;

      const result: TemplateResult = {
        toolId,
        toolName: tool.name,
        filledPrompt,
        variables,
        patternIndex,
        confidence: template.confidence,
        processingTime
      };

      this.trail.light(6553, {
        operation: 'template_filled_successfully',
        toolId,
        toolName: tool.name,
        confidence: template.confidence,
        processingTime
      });

      // Cache result if enabled
      if (this.config.enableCache) {
        const cacheKey = this.buildCacheKey(toolId, variables, patternIndex);
        this.cache.set(cacheKey, result);
      }

      return result;

    } catch (error) {
      this.trail.fail(8551, error as Error, {
        toolId,
        variables,
        patternIndex
      });
      throw error;
    }
  }

  /**
   * Extract simple variables from transcript using keyword/regex methods
   * Returns immediately for tools 1, 5, 13 (no AI needed)
   */
  extractSimpleVariables(
    toolId: number,
    transcript: string
  ): Record<string, string> | null {
    try {
      const tool = this.tools.get(toolId);
      if (!tool) {
        throw new Error(`Tool ${toolId} not found`);
      }

      const variables: Record<string, string> = {};
      let hasSimpleExtraction = false;

      // Only process variables with 'keyword' or 'regex' methods
      for (const [varName, extraction] of Object.entries(tool.variableExtraction)) {
        if (extraction.method === 'keyword') {
          hasSimpleExtraction = true;
          variables[varName] = this.extractByKeyword(transcript, extraction);
        } else if (extraction.method === 'regex' && extraction.regex) {
          hasSimpleExtraction = true;
          variables[varName] = this.extractByRegex(transcript, extraction);
        }
      }

      if (!hasSimpleExtraction) {
        return null; // Tool requires AI extraction
      }

      this.trail.light(6555, {
        operation: 'simple_variables_extracted',
        toolId,
        variableCount: Object.keys(variables).length,
        method: 'instant'
      });

      return variables;

    } catch (error) {
      this.trail.fail(8552, error as Error, {
        toolId,
        transcriptLength: transcript.length
      });
      return null;
    }
  }

  /**
   * Extract variable using keyword method
   */
  private extractByKeyword(transcript: string, extraction: VariableExtraction): string {
    // For keyword extraction, use last 1-5 words from transcript
    const words = transcript.trim().split(/\s+/);
    const lastWords = words.slice(-3).join(' '); // Default: last 3 words

    return lastWords || extraction.fallback || '';
  }

  /**
   * Extract variable using regex method
   */
  private extractByRegex(transcript: string, extraction: VariableExtraction): string {
    if (!extraction.regex) {
      return extraction.fallback || '';
    }

    try {
      const regex = new RegExp(extraction.regex, 'i');
      const match = transcript.match(regex);

      return match ? match[0] : (extraction.fallback || '');
    } catch (error) {
      this.trail.light(8553, {
        operation: 'regex_extraction_failed',
        regex: extraction.regex,
        error: (error as Error).message
      });
      return extraction.fallback || '';
    }
  }

  /**
   * Get tool by ID
   */
  getTool(toolId: number): ToolTemplate | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Get all tools
   */
  getAllTools(): ToolTemplate[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools count
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.cache.clear();
    this.trail.light(6556, {
      operation: 'cache_cleared',
      timestamp: Date.now()
    });
  }

  /**
   * Build cache key for template results
   */
  private buildCacheKey(toolId: number, variables: Record<string, string>, patternIndex: number): string {
    const varKey = JSON.stringify(variables);
    return `${toolId}-${patternIndex}-${varKey}`;
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    toolCount: number;
    cacheSize: number;
    configFile: string;
  } {
    return {
      toolCount: this.tools.size,
      cacheSize: this.cache.size,
      configFile: this.config.configFile
    };
  }
}
