/**
 * Intelligent Prompt Builder
 * Achieves ChromaDB-like context matching without external dependencies
 * All processing happens in-memory for <5ms response times
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

interface ConversationPath {
  trigger: string;
  immediate_response: {
    exact_words: string;
    strategy?: string;
  };
  predicted_path?: {
    likely_prospect_response: string;
    next_move?: {
      exact_words: string;
      strategy?: string;
    };
  };
  confidence_score?: number;
}

interface IndexedTechnique {
  technique_name: string;
  triggers: string[];  // Normalized triggers
  keywords: Set<string>;  // Key terms for matching
  priority: number;  // 0-1, based on doc frequency
  paths: ConversationPath[];
  embeddings?: number[]; // Optional: pre-computed embeddings
}

interface TechniqueMatch {
  technique: IndexedTechnique;
  relevance: number;
  matchedTriggers: string[];
  bestPaths: ConversationPath[];
}

export class IntelligentPromptBuilder {
  private trail: BreadcrumbTrail;
  private techniqueIndex: Map<string, IndexedTechnique> = new Map();
  private triggerMap: Map<string, Set<string>> = new Map(); // keyword -> technique IDs
  private commonObjections: Set<string> = new Set();
  private isIndexed: boolean = false;
  private totalPaths: number = 0;
  
  // Stage-based tracking for new format
  private stageData: any = null;
  private currentStage: string = 'opening';
  private stageProgressions: any = null;
  
  constructor() {
    this.trail = new BreadcrumbTrail('IntelligentPromptBuilder');
  }
  
  /**
   * Pre-process document into optimized index (run once at startup)
   * Supports both old format (predictive_techniques) and new stage-based format
   */
  async indexDocument(ragDocument: any): Promise<void> {
    const startTime = Date.now();
    
    // Check if this is the new stage-based format
    if (ragDocument.stages) {
      this.trail.light(6500, {
        operation: 'indexing_start_stage_based',
        stages_count: Object.keys(ragDocument.stages).length,
        has_progressions: !!ragDocument.progressions
      });
      
      // Index stage-based document
      await this.indexStageBasedDocument(ragDocument);
    } else {
      // Fall back to old format
      this.trail.light(6500, {
        operation: 'indexing_start_legacy',
        techniques_count: ragDocument.predictive_techniques?.length || 0
      });
      
      // Extract and index all techniques (old format)
      const techniques = ragDocument.predictive_techniques || ragDocument.techniques || [];
      
      for (const technique of techniques) {
        const techniqueId = this.normalizeName(technique.technique_name);
        const keywords = new Set<string>();
        const triggers: string[] = [];
        
        // Extract all triggers and keywords from paths
        const paths = technique.conversation_paths || technique.when_to_use || [];
        this.totalPaths += paths.length;
        
        for (const path of paths) {
          if (path.trigger) {
            const normalizedTrigger = path.trigger.toLowerCase();
            triggers.push(normalizedTrigger);
            
            // Extract keywords from trigger
            const words = this.extractKeywords(normalizedTrigger);
            words.forEach(word => {
              keywords.add(word);
              // Build reverse index
              if (!this.triggerMap.has(word)) {
                this.triggerMap.set(word, new Set());
              }
              this.triggerMap.get(word)!.add(techniqueId);
            });
            
            // Track common objections
            if (normalizedTrigger.includes('expensive') || 
                normalizedTrigger.includes('cost') ||
                normalizedTrigger.includes('price')) {
              this.commonObjections.add('price');
            }
            if (normalizedTrigger.includes('think about') ||
                normalizedTrigger.includes('not sure')) {
              this.commonObjections.add('hesitation');
            }
          }
        }
        
        // Calculate priority based on number of paths
        const priority = Math.min(paths.length / 20, 1); // Normalize to 0-1
        
        // Store indexed technique
        this.techniqueIndex.set(techniqueId, {
          technique_name: technique.technique_name,
          triggers,
          keywords,
          priority,
          paths: paths.slice(0, 10) // Keep top 10 paths per technique
        });
      }
    }
    
    this.isIndexed = true;
    const indexTime = Date.now() - startTime;
    
    this.trail.light(6501, {
      operation: 'indexing_complete',
      index_time_ms: indexTime,
      techniques_indexed: this.techniqueIndex.size,
      total_keywords: this.triggerMap.size,
      total_paths: this.totalPaths,
      common_objections: Array.from(this.commonObjections)
    });
    
    console.log(`✅ Document indexed in ${indexTime}ms: ${this.techniqueIndex.size} techniques, ${this.totalPaths} paths`);
  }
  
  /**
   * Get relevant techniques based on conversation context (FAST: <5ms)
   */
  getRelevantTechniques(transcript: string, maxTechniques: number = 3): TechniqueMatch[] {
    if (!this.isIndexed) {
      console.warn('⚠️ Document not indexed yet!');
      return [];
    }
    
    const startTime = performance.now();
    const transcriptLower = transcript.toLowerCase();
    const words = this.extractKeywords(transcriptLower);
    
    // Score each technique
    const scores = new Map<string, number>();
    const matchedTriggers = new Map<string, Set<string>>();
    
    // Check each word in transcript
    for (const word of words) {
      const techniques = this.triggerMap.get(word);
      if (techniques) {
        techniques.forEach(techniqueId => {
          scores.set(techniqueId, (scores.get(techniqueId) || 0) + 1);
          if (!matchedTriggers.has(techniqueId)) {
            matchedTriggers.set(techniqueId, new Set());
          }
          matchedTriggers.get(techniqueId)!.add(word);
        });
      }
    }
    
    // Boost scores for exact trigger matches
    this.techniqueIndex.forEach((technique, techniqueId) => {
      for (const trigger of technique.triggers) {
        if (transcriptLower.includes(trigger)) {
          scores.set(techniqueId, (scores.get(techniqueId) || 0) + 5);
        }
      }
    });
    
    // Sort by relevance and get top techniques
    const topTechniques = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTechniques)
      .map(([techniqueId, score]) => {
        const technique = this.techniqueIndex.get(techniqueId)!;
        
        // Select best matching paths
        const bestPaths = this.selectBestPaths(technique, transcriptLower);
        
        return {
          technique,
          relevance: score,
          matchedTriggers: Array.from(matchedTriggers.get(techniqueId) || []),
          bestPaths
        };
      });
    
    const searchTime = performance.now() - startTime;
    
    this.trail.light(6502, {
      operation: 'context_search_complete',
      search_time_ms: searchTime.toFixed(2),
      techniques_found: topTechniques.length,
      top_relevance: topTechniques[0]?.relevance || 0
    });
    
    console.log(`⚡ Found ${topTechniques.length} relevant techniques in ${searchTime.toFixed(2)}ms`);
    
    return topTechniques;
  }
  
  /**
   * Build optimized prompt with stage awareness and progression
   */
  buildContextAwarePrompt(transcript: string, knowledgeDoc?: any): string {
    const matches = this.getRelevantTechniques(transcript, 3);
    
    // Detect current stage
    const currentStage = this.getCurrentStage(transcript);
    const nextStage = this.getNextStagePrediction();
    
    if (matches.length === 0 && !this.stageData) {
      // Fallback to most common techniques
      console.log('⚠️ No matches found, using fallback techniques');
      return this.buildFallbackPrompt(transcript);
    }
    
    let prompt = 'You are a sales coach providing INSTANT coaching.\n\n';
    
    // Add stage context
    if (this.stageData && currentStage) {
      const stage = this.stageData[currentStage];
      prompt += `CURRENT STAGE: ${stage?.name || currentStage}\n`;
      prompt += `STAGE GOAL: ${stage?.goal || 'Move conversation forward'}\n`;
      
      if (nextStage && this.stageData[nextStage]) {
        const next = this.stageData[nextStage];
        prompt += `NEXT STAGE: ${next.name} (prepare for transition)\n`;
      }
      
      // Add exit criteria for current stage
      if (stage?.exitCriteria && stage.exitCriteria.length > 0) {
        prompt += `WATCH FOR: ${stage.exitCriteria.slice(0, 2).join(', ')}\n`;
      }
      
      prompt += '\n';
    }
    
    // Add relevant techniques
    if (matches.length > 0) {
      prompt += 'RELEVANT TECHNIQUES:\n';
      
      matches.forEach((match, index) => {
        prompt += `\n${index + 1}. ${match.technique.technique_name} (relevance: ${match.relevance})\n`;
        
        // Include only the best matching paths
        match.bestPaths.slice(0, 2).forEach(path => {
          prompt += `   When: "${path.trigger}"\n`;
          prompt += `   Say: "${path.immediate_response.exact_words}"\n`;
          if (path.predicted_path?.next_move?.exact_words) {
            prompt += `   Next: "${path.predicted_path.next_move.exact_words}"\n`;
          }
        });
      });
    }
    
    // Add stage-specific bridges if available
    if (this.stageData && currentStage && this.stageData[currentStage]?.bridges) {
      const bridges = this.stageData[currentStage].bridges
        .filter((b: any) => b.priority === 'CRITICAL')
        .slice(0, 2);
      
      if (bridges.length > 0) {
        prompt += '\nSTAGE-SPECIFIC RESPONSES:\n';
        bridges.forEach((bridge: any) => {
          prompt += `• ${bridge.text}\n`;
        });
      }
    }
    
    prompt += `\n\nCURRENT CONVERSATION:\n${transcript.slice(-300)}\n\n`;
    prompt += 'Provide ONE actionable suggestion in JSON format with urgency level and stage transition advice.';
    
    // Track prompt size
    const promptSize = prompt.length;
    console.log(`📊 Stage-aware prompt: ${(promptSize / 1024).toFixed(2)}KB | Stage: ${currentStage} → ${nextStage || '?'}`);
    
    return prompt;
  }
  
  /**
   * Select best matching paths from a technique
   */
  private selectBestPaths(technique: IndexedTechnique, transcript: string): ConversationPath[] {
    return technique.paths
      .filter(path => {
        const trigger = path.trigger?.toLowerCase() || '';
        // Score based on similarity to transcript
        const words = this.extractKeywords(trigger);
        const transcriptWords = new Set(this.extractKeywords(transcript));
        const overlap = words.filter(w => transcriptWords.has(w)).length;
        return overlap > 0;
      })
      .sort((a, b) => {
        // Sort by confidence if available
        const scoreA = a.confidence_score || 0.5;
        const scoreB = b.confidence_score || 0.5;
        return scoreB - scoreA;
      })
      .slice(0, 3);
  }
  
  /**
   * Index stage-based document (new format)
   */
  private async indexStageBasedDocument(ragDocument: any): Promise<void> {
    // Store the full stage data for reference
    this.stageData = ragDocument.stages;
    this.stageProgressions = ragDocument.progressions;
    
    // Process each stage
    for (const [stageName, stageInfo] of Object.entries(ragDocument.stages)) {
      const stage = stageInfo as any;
      
      // Create technique entries for each stage's content
      // Process bridges as conversation paths
      if (stage.bridges && Array.isArray(stage.bridges)) {
        for (const bridge of stage.bridges) {
          const techniqueId = `${stageName}_bridge_${bridge.priority}`;
          const keywords = new Set<string>();
          const triggers: string[] = [];
          
          // Extract keywords from the bridge text
          const words = this.extractKeywords(bridge.text);
          words.forEach(word => {
            keywords.add(word);
            if (!this.triggerMap.has(word)) {
              this.triggerMap.set(word, new Set());
            }
            this.triggerMap.get(word)!.add(techniqueId);
          });
          
          // Add stage keywords
          if (stage.keywords) {
            stage.keywords.forEach((keyword: string) => {
              const normalizedKeyword = keyword.toLowerCase();
              keywords.add(normalizedKeyword);
              triggers.push(normalizedKeyword);
              if (!this.triggerMap.has(normalizedKeyword)) {
                this.triggerMap.set(normalizedKeyword, new Set());
              }
              this.triggerMap.get(normalizedKeyword)!.add(techniqueId);
            });
          }
          
          // Create conversation path from bridge
          const path: ConversationPath = {
            trigger: stage.keywords?.join(' ') || stageName,
            immediate_response: {
              exact_words: bridge.text,
              strategy: `Stage: ${stageName}, Priority: ${bridge.priority}`
            },
            confidence_score: bridge.priority === 'CRITICAL' ? 0.9 : bridge.priority === 'HIGH' ? 0.7 : 0.5
          };
          
          // Store as indexed technique
          this.techniqueIndex.set(techniqueId, {
            technique_name: `${stage.name} - ${bridge.priority}`,
            triggers,
            keywords,
            priority: bridge.priority === 'CRITICAL' ? 1 : bridge.priority === 'HIGH' ? 0.7 : 0.5,
            paths: [path]
          });
          
          this.totalPaths++;
        }
      }
      
      // Process recovery patterns
      if (stage.recovery && Array.isArray(stage.recovery)) {
        stage.recovery.forEach((recovery: string, index: number) => {
          const techniqueId = `${stageName}_recovery_${index}`;
          const keywords = new Set<string>();
          
          // Extract keywords from recovery text
          const words = this.extractKeywords(recovery);
          words.forEach(word => {
            keywords.add(word);
            if (!this.triggerMap.has(word)) {
              this.triggerMap.set(word, new Set());
            }
            this.triggerMap.get(word)!.add(techniqueId);
          });
          
          const path: ConversationPath = {
            trigger: 'conversation stalled',
            immediate_response: {
              exact_words: recovery,
              strategy: `Recovery for ${stageName} stage`
            },
            confidence_score: 0.8
          };
          
          this.techniqueIndex.set(techniqueId, {
            technique_name: `${stage.name} - Recovery`,
            triggers: ['stalled', 'silence', 'stuck'],
            keywords,
            priority: 0.8,
            paths: [path]
          });
          
          this.totalPaths++;
        });
      }
      
      // Process techniques within stages (if present)
      if (stage.techniques && Array.isArray(stage.techniques)) {
        for (const technique of stage.techniques) {
          const techniqueId = `${stageName}_${technique.name}`;
          const keywords = new Set<string>();
          
          // Add technique as a searchable item
          const words = this.extractKeywords(technique.description || technique.example || '');
          words.forEach(word => {
            keywords.add(word);
            if (!this.triggerMap.has(word)) {
              this.triggerMap.set(word, new Set());
            }
            this.triggerMap.get(word)!.add(techniqueId);
          });
          
          const path: ConversationPath = {
            trigger: technique.timing || stageName,
            immediate_response: {
              exact_words: technique.example || technique.description,
              strategy: technique.name
            }
          };
          
          this.techniqueIndex.set(techniqueId, {
            technique_name: technique.name,
            triggers: [technique.timing || stageName],
            keywords,
            priority: 0.6,
            paths: [path]
          });
          
          this.totalPaths++;
        }
      }
    }
    
    // Process universal techniques
    if (ragDocument.universal) {
      // Process mirroring
      if (ragDocument.universal.mirroring) {
        this.addUniversalTechnique('mirroring', ragDocument.universal.mirroring);
      }
      
      // Process labeling
      if (ragDocument.universal.labeling) {
        this.addUniversalTechnique('labeling', ragDocument.universal.labeling);
      }
      
      // Process calibrated questions
      if (ragDocument.universal.calibrated_questions) {
        this.addUniversalTechnique('calibrated_questions', ragDocument.universal.calibrated_questions);
      }
    }
    
    console.log(`✅ Indexed stage-based document: ${this.techniqueIndex.size} techniques from ${Object.keys(ragDocument.stages).length} stages`);
  }
  
  /**
   * Add universal technique to index
   */
  private addUniversalTechnique(techniqueName: string, techniqueData: any): void {
    const techniqueId = `universal_${techniqueName}`;
    const keywords = new Set<string>([techniqueName]);
    const paths: ConversationPath[] = [];
    
    // Process different data structures
    if (typeof techniqueData === 'object') {
      Object.entries(techniqueData).forEach(([key, value]) => {
        if (typeof value === 'string') {
          paths.push({
            trigger: key,
            immediate_response: {
              exact_words: value,
              strategy: techniqueName
            }
          });
        }
      });
    }
    
    if (paths.length > 0) {
      this.techniqueIndex.set(techniqueId, {
        technique_name: `Universal - ${techniqueName}`,
        triggers: [techniqueName],
        keywords,
        priority: 0.9, // Universal techniques have high priority
        paths
      });
      
      this.totalPaths += paths.length;
    }
  }
  
  /**
   * Get current stage based on transcript analysis
   */
  getCurrentStage(transcript: string): string {
    if (!this.stageData) return 'opening';
    
    const transcriptLower = transcript.toLowerCase();
    let bestMatch = 'opening';
    let bestScore = 0;
    
    // Check each stage's keywords
    for (const [stageName, stageInfo] of Object.entries(this.stageData)) {
      const stage = stageInfo as any;
      let score = 0;
      
      if (stage.keywords && Array.isArray(stage.keywords)) {
        for (const keyword of stage.keywords) {
          if (transcriptLower.includes(keyword.toLowerCase())) {
            score++;
          }
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = stageName;
      }
    }
    
    // Update current stage
    if (bestMatch !== this.currentStage) {
      console.log(`📍 Stage transition: ${this.currentStage} → ${bestMatch}`);
      this.currentStage = bestMatch;
    }
    
    return bestMatch;
  }
  
  /**
   * Get next stage prediction based on progressions
   */
  getNextStagePrediction(): string | null {
    if (!this.stageProgressions) return null;
    
    // Look for progression from current stage
    const progressionKey = Object.keys(this.stageProgressions).find(key => 
      key.startsWith(`${this.currentStage}->`)
    );
    
    if (progressionKey) {
      const nextStage = progressionKey.split('->')[1];
      return nextStage;
    }
    
    return null;
  }
  
  /**
   * Extract meaningful keywords (ignore stop words)
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'is', 'it', 'to', 'a', 'and', 'of', 'in', 'that', 'this', 'for', 'with', 'on', 'at']);
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }
  
  private normalizeName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_');
  }
  
  private buildFallbackPrompt(transcript: string): string {
    // Return a minimal prompt with general coaching
    return `You are a sales coach. Based on this conversation:
${transcript.slice(-300)}

Provide ONE actionable suggestion in JSON format.`;
  }
  
  /**
   * Get index statistics
   */
  getIndexStats(): any {
    return {
      indexed: this.isIndexed,
      techniques: this.techniqueIndex.size,
      keywords: this.triggerMap.size,
      totalPaths: this.totalPaths,
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  
  private estimateMemoryUsage(): string {
    // Rough estimate of memory usage
    const techniqueSize = this.techniqueIndex.size * 1000; // ~1KB per technique
    const indexSize = this.triggerMap.size * 50; // ~50 bytes per keyword
    const total = (techniqueSize + indexSize) / 1024;
    return `${total.toFixed(2)}KB`;
  }
}

// Singleton instance
export const intelligentPromptBuilder = new IntelligentPromptBuilder();