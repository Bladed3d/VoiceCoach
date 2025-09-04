/**
 * Coaching Search Adapter
 * Switches between ChromaDB semantic search and keyword matching
 * Based on user preference toggle
 * LED Range: 6200-6209 for search operations
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

export interface CoachingMatch {
  technique: string;
  trigger: string;
  immediate_response: string;
  next_move?: string;
  path_goal?: string;
  confidence: number;
  matchType: 'semantic' | 'keyword' | 'exact';
  alternativePaths?: Array<{
    if_they_say: string;
    then_say: string;
    leads_to: string;
  }>;
}

export class CoachingSearchAdapter {
  private trail: BreadcrumbTrail;
  private useChromaDB: boolean = false;
  private documentData: any = null;
  private chromaCollection: any = null;
  
  constructor() {
    this.trail = new BreadcrumbTrail('CoachingSearchAdapter');
    
    // Load preference
    this.useChromaDB = localStorage.getItem('voicecoach-use-chromadb') === 'true';
    
    // Listen for toggle changes
    window.addEventListener('chromaDBToggled', (event: any) => {
      this.useChromaDB = event.detail.enabled;
      this.trail.light(6200, {
        operation: 'search_mode_changed',
        mode: this.useChromaDB ? 'semantic' : 'keyword'
      });
    });
  }
  
  /**
   * Load document for searching
   */
  async loadDocument(documentPath: string): Promise<void> {
    try {
      this.trail.light(6201, {
        operation: 'loading_document',
        path: documentPath
      });
      
      // Load through Electron API
      const response = await window.electronAPI.loadRagDocument(documentPath);
      if (response.success) {
        this.documentData = JSON.parse(response.content);
        
        // If ChromaDB is enabled, prepare embeddings
        if (this.useChromaDB) {
          await this.prepareChromaDB();
        }
        
        this.trail.light(6202, {
          operation: 'document_loaded',
          techniques: this.documentData.techniques?.length || 0
        });
      }
    } catch (error) {
      this.trail.fail(8201, error as Error);
    }
  }
  
  /**
   * Search for coaching suggestion based on transcript
   */
  async findCoachingSuggestion(transcript: string): Promise<CoachingMatch | null> {
    if (!this.documentData) {
      this.trail.light(6203, { error: 'no_document_loaded' });
      return null;
    }
    
    const startTime = Date.now();
    let result: CoachingMatch | null = null;
    
    if (this.useChromaDB && this.chromaCollection) {
      // Use ChromaDB semantic search
      result = await this.semanticSearch(transcript);
      this.trail.light(6204, {
        operation: 'semantic_search_complete',
        found: !!result,
        time: Date.now() - startTime
      });
    } else {
      // Use keyword matching
      result = this.keywordSearch(transcript);
      this.trail.light(6205, {
        operation: 'keyword_search_complete',
        found: !!result,
        time: Date.now() - startTime
      });
    }
    
    return result;
  }
  
  /**
   * Keyword-based search (updated for predictive RAG format)
   */
  private keywordSearch(transcript: string): CoachingMatch | null {
    const lowerTranscript = transcript.toLowerCase();
    
    // Handle both old and new RAG formats
    if (this.documentData.predictive_techniques) {
      // New predictive format
      for (const technique of this.documentData.predictive_techniques) {
        for (const path of technique.conversation_paths || []) {
          // Check for exact phrase match
          if (lowerTranscript.includes(path.trigger.toLowerCase())) {
            return {
              technique: technique.technique_name,
              trigger: path.trigger,
              immediate_response: path.immediate_response?.exact_words || '',
              next_move: path.predicted_path?.next_move?.exact_words,
              path_goal: path.predicted_path?.third_move?.expected_outcome,
              confidence: path.confidence_score || 1.0,
              matchType: 'exact',
              alternativePaths: path.alternative_paths
            };
          }
          
          // Check for keyword overlap
          const triggerWords = path.trigger.toLowerCase().split(' ');
          const transcriptWords = lowerTranscript.split(' ');
          
          const matchingWords = triggerWords.filter(word => 
            word.length > 3 && transcriptWords.includes(word)
          );
          
          if (matchingWords.length >= 2) { // Need at least 2 matching words
            return {
              technique: technique.technique_name,
              trigger: path.trigger,
              immediate_response: path.immediate_response?.exact_words || '',
              next_move: path.predicted_path?.next_move?.exact_words,
              path_goal: path.predicted_path?.third_move?.expected_outcome,
              confidence: (matchingWords.length / triggerWords.length) * (path.confidence_score || 0.7),
              matchType: 'keyword',
              alternativePaths: path.alternative_paths
            };
          }
        }
      }
    } else if (this.documentData.techniques) {
      // Fall back to old format if needed
      for (const technique of this.documentData.techniques) {
        for (const scenario of technique.when_to_use || []) {
          if (lowerTranscript.includes(scenario.trigger.toLowerCase())) {
            return {
              technique: technique.technique_name,
              trigger: scenario.trigger,
              immediate_response: scenario.salesperson_says,
              next_move: scenario.coach_prompt,
              confidence: 1.0,
              matchType: 'exact'
            };
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * ChromaDB semantic search (updated for predictive format)
   */
  private async semanticSearch(transcript: string): Promise<CoachingMatch | null> {
    try {
      // Query ChromaDB collection for top 3 matches
      const results = await this.chromaCollection.query({
        queryTexts: [transcript],
        nResults: 3
      });
      
      if (results.metadatas[0] && results.metadatas[0].length > 0) {
        const match = results.metadatas[0][0];
        const distance = results.distances[0][0];
        
        // Convert distance to confidence (0 = perfect match, 1 = no match)
        const confidence = Math.max(0, 1 - distance);
        
        // Only return if confidence is high enough
        if (confidence > 0.3) {
          return {
            technique: match.technique_name,
            trigger: match.trigger,
            immediate_response: match.immediate_response,
            next_move: match.next_move,
            path_goal: match.path_goal,
            confidence: confidence * (match.original_confidence || 1.0),
            matchType: 'semantic',
            alternativePaths: match.alternative_paths
          };
        }
      }
    } catch (error) {
      this.trail.light(6206, {
        operation: 'semantic_search_error',
        error: (error as Error).message
      });
      // Fall back to keyword search
      return this.keywordSearch(transcript);
    }
    
    return null;
  }
  
  /**
   * Prepare ChromaDB collection with document embeddings (updated for predictive format)
   */
  private async prepareChromaDB(): Promise<void> {
    try {
      // Check if ChromaDB is available
      const { ChromaClient } = await import('chromadb').catch(() => {
        this.trail.light(6207, { 
          warning: 'ChromaDB not available, falling back to keyword search' 
        });
        return { ChromaClient: null };
      });
      
      if (!ChromaClient) {
        this.useChromaDB = false;
        return;
      }
      
      this.trail.light(6208, { operation: 'preparing_chromadb' });
      
      const client = new ChromaClient();
      
      // Create or get collection
      try {
        this.chromaCollection = await client.createCollection({
          name: "voicecoach_predictive",
          metadata: { "hnsw:space": "cosine" }
        });
      } catch (e) {
        // Collection exists, get it
        this.chromaCollection = await client.getCollection({
          name: "voicecoach_predictive"
        });
      }
      
      // Prepare documents and metadata
      const documents: string[] = [];
      const metadatas: any[] = [];
      const ids: string[] = [];
      
      let idCounter = 0;
      
      // Handle new predictive format
      if (this.documentData.predictive_techniques) {
        for (const technique of this.documentData.predictive_techniques) {
          for (const path of technique.conversation_paths || []) {
            // Create rich embedding document combining all context
            const embeddingText = [
              path.trigger,
              path.current_situation,
              path.immediate_response?.strategy,
              path.predicted_path?.likely_prospect_response,
              path.predicted_path?.next_move?.why
            ].filter(Boolean).join('. ');
            
            documents.push(embeddingText);
            metadatas.push({
              technique_name: technique.technique_name,
              trigger: path.trigger,
              immediate_response: path.immediate_response?.exact_words,
              next_move: path.predicted_path?.next_move?.exact_words,
              path_goal: path.predicted_path?.third_move?.expected_outcome,
              original_confidence: path.confidence_score,
              alternative_paths: path.alternative_paths,
              current_situation: path.current_situation,
              tone: path.immediate_response?.tone
            });
            ids.push(`path_${idCounter++}`);
            
            // Also index alternative paths as separate entries for better coverage
            if (path.alternative_paths) {
              for (const altPath of path.alternative_paths) {
                const altEmbedding = `${altPath.if_they_say}. ${altPath.leads_to}`;
                documents.push(altEmbedding);
                metadatas.push({
                  technique_name: technique.technique_name,
                  trigger: altPath.if_they_say,
                  immediate_response: altPath.then_say,
                  path_goal: altPath.leads_to,
                  original_confidence: path.confidence_score || 0.7,
                  is_alternative: true
                });
                ids.push(`alt_${idCounter++}`);
              }
            }
          }
        }
      } else if (this.documentData.techniques) {
        // Fall back to old format if needed
        for (const technique of this.documentData.techniques) {
          for (const scenario of technique.when_to_use || []) {
            const document = `${scenario.trigger}. ${scenario.prospect_says || ''}. ${scenario.expected_result || ''}`;
            documents.push(document);
            metadatas.push({
              technique_name: technique.technique_name,
              trigger: scenario.trigger,
              immediate_response: scenario.salesperson_says,
              next_move: scenario.coach_prompt
            });
            ids.push(`tech_${idCounter++}`);
          }
        }
      }
      
      // Add to ChromaDB
      if (documents.length > 0) {
        await this.chromaCollection.add({
          documents: documents,
          metadatas: metadatas,
          ids: ids
        });
        
        this.trail.light(6209, {
          operation: 'chromadb_ready',
          documents_loaded: documents.length,
          collection_name: 'voicecoach_predictive'
        });
        
        console.log(`✅ ChromaDB indexed ${documents.length} conversation paths`);
      }
      
    } catch (error) {
      this.trail.fail(8202, error as Error);
      this.useChromaDB = false;
    }
  }
  
  /**
   * Find multiple relevant coaching suggestions for building context
   * This is the key method for reducing prompt size - returns only relevant techniques
   */
  async findRelevantTechniques(transcript: string, maxResults: number = 3): Promise<CoachingMatch[]> {
    const results: CoachingMatch[] = [];
    
    if (!this.documentData) {
      this.trail.light(6210, { error: 'no_document_loaded' });
      return results;
    }
    
    if (this.useChromaDB && this.chromaCollection) {
      // Use ChromaDB to get top N relevant techniques
      try {
        const queryResults = await this.chromaCollection.query({
          queryTexts: [transcript],
          nResults: maxResults
        });
        
        if (queryResults.metadatas[0]) {
          for (let i = 0; i < queryResults.metadatas[0].length; i++) {
            const match = queryResults.metadatas[0][i];
            const distance = queryResults.distances[0][i];
            const confidence = Math.max(0, 1 - distance);
            
            if (confidence > 0.2) { // Lower threshold for multiple results
              results.push({
                technique: match.technique_name,
                trigger: match.trigger,
                immediate_response: match.immediate_response,
                next_move: match.next_move,
                path_goal: match.path_goal,
                confidence: confidence * (match.original_confidence || 1.0),
                matchType: 'semantic',
                alternativePaths: match.alternative_paths
              });
            }
          }
        }
        
        this.trail.light(6211, {
          operation: 'find_relevant_techniques_chromadb',
          found: results.length,
          requested: maxResults
        });
      } catch (error) {
        this.trail.light(6212, { 
          error: 'chromadb_query_failed',
          fallback: 'keyword_search'
        });
      }
    }
    
    // If ChromaDB didn't return enough results, supplement with keyword search
    if (results.length < maxResults) {
      const lowerTranscript = transcript.toLowerCase();
      const keywordMatches: Array<{match: CoachingMatch, score: number}> = [];
      
      if (this.documentData.predictive_techniques) {
        for (const technique of this.documentData.predictive_techniques) {
          for (const path of technique.conversation_paths || []) {
            const triggerWords = path.trigger.toLowerCase().split(' ');
            const transcriptWords = lowerTranscript.split(' ');
            
            const matchingWords = triggerWords.filter(word => 
              word.length > 3 && transcriptWords.includes(word)
            );
            
            if (matchingWords.length > 0) {
              const score = matchingWords.length / triggerWords.length;
              keywordMatches.push({
                score,
                match: {
                  technique: technique.technique_name,
                  trigger: path.trigger,
                  immediate_response: path.immediate_response?.exact_words || '',
                  next_move: path.predicted_path?.next_move?.exact_words,
                  path_goal: path.predicted_path?.third_move?.expected_outcome,
                  confidence: score * (path.confidence_score || 0.7),
                  matchType: 'keyword',
                  alternativePaths: path.alternative_paths
                }
              });
            }
          }
        }
      }
      
      // Sort by score and add top matches
      keywordMatches.sort((a, b) => b.score - a.score);
      const needed = maxResults - results.length;
      for (let i = 0; i < Math.min(needed, keywordMatches.length); i++) {
        results.push(keywordMatches[i].match);
      }
    }
    
    return results;
  }
  
  /**
   * Get current search mode
   */
  getSearchMode(): 'semantic' | 'keyword' {
    return this.useChromaDB ? 'semantic' : 'keyword';
  }
}

// Export singleton instance
export const coachingSearchAdapter = new CoachingSearchAdapter();