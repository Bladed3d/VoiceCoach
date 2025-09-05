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
  
  constructor() {
    this.trail = new BreadcrumbTrail('IntelligentPromptBuilder');
  }
  
  /**
   * Pre-process document into optimized index (run once at startup)
   */
  async indexDocument(ragDocument: any): Promise<void> {
    const startTime = Date.now();
    
    this.trail.light(6500, {
      operation: 'indexing_start',
      techniques_count: ragDocument.predictive_techniques?.length || 0
    });
    
    // Extract and index all techniques
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
   * Build optimized prompt with only relevant content
   */
  buildContextAwarePrompt(transcript: string, knowledgeDoc?: any): string {
    const matches = this.getRelevantTechniques(transcript, 3);
    
    if (matches.length === 0) {
      // Fallback to most common techniques
      console.log('⚠️ No matches found, using fallback techniques');
      return this.buildFallbackPrompt(transcript);
    }
    
    let prompt = 'You are a sales coach providing INSTANT coaching.\n\n';
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
    
    prompt += `\n\nCURRENT CONVERSATION:\n${transcript.slice(-300)}\n\n`;
    prompt += 'Provide ONE actionable suggestion in JSON format.';
    
    // Track prompt size
    const promptSize = prompt.length;
    console.log(`📊 Prompt size: ${(promptSize / 1024).toFixed(2)}KB with ${matches.length} techniques`);
    
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