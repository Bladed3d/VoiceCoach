/**
 * Coaching Search Adapter
 * Switches between ChromaDB semantic search and keyword matching
 * Based on user preference toggle
 * LED Range: 6200-6209 for search operations
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

export interface CoachingMatch {
  technique: string;
  coach_prompt: string;
  salesperson_says: string;
  confidence: number;
  matchType: 'semantic' | 'keyword' | 'exact';
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
   * Keyword-based search (current method)
   */
  private keywordSearch(transcript: string): CoachingMatch | null {
    const lowerTranscript = transcript.toLowerCase();
    
    for (const technique of this.documentData.techniques) {
      for (const scenario of technique.when_to_use) {
        // Check for exact phrase match
        if (lowerTranscript.includes(scenario.trigger.toLowerCase())) {
          return {
            technique: technique.technique_name,
            coach_prompt: scenario.coach_prompt,
            salesperson_says: scenario.salesperson_says,
            confidence: 1.0,
            matchType: 'exact'
          };
        }
        
        // Check for keyword overlap
        const triggerWords = scenario.trigger.toLowerCase().split(' ');
        const transcriptWords = lowerTranscript.split(' ');
        
        const matchingWords = triggerWords.filter(word => 
          word.length > 3 && transcriptWords.includes(word)
        );
        
        if (matchingWords.length > 0) {
          return {
            technique: technique.technique_name,
            coach_prompt: scenario.coach_prompt,
            salesperson_says: scenario.salesperson_says,
            confidence: matchingWords.length / triggerWords.length,
            matchType: 'keyword'
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * ChromaDB semantic search (improved method)
   */
  private async semanticSearch(transcript: string): Promise<CoachingMatch | null> {
    try {
      // Query ChromaDB collection
      const results = await this.chromaCollection.query({
        queryTexts: [transcript],
        nResults: 1
      });
      
      if (results.metadatas[0] && results.metadatas[0].length > 0) {
        const match = results.metadatas[0][0];
        const distance = results.distances[0][0];
        
        // Convert distance to confidence (0 = perfect match, 1 = no match)
        const confidence = Math.max(0, 1 - distance);
        
        // Only return if confidence is high enough
        if (confidence > 0.3) {
          return {
            technique: match.technique,
            coach_prompt: match.coach_prompt,
            salesperson_says: match.salesperson_says,
            confidence: confidence,
            matchType: 'semantic'
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
   * Prepare ChromaDB collection with document embeddings
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
          name: "voicecoach_live",
          metadata: { "hnsw:space": "cosine" }
        });
      } catch (e) {
        // Collection exists, get it
        this.chromaCollection = await client.getCollection({
          name: "voicecoach_live"
        });
      }
      
      // Prepare documents and metadata
      const documents: string[] = [];
      const metadatas: any[] = [];
      const ids: string[] = [];
      
      let idCounter = 0;
      for (const technique of this.documentData.techniques) {
        for (const scenario of technique.when_to_use) {
          // Combine trigger and context for better semantic understanding
          const document = `${scenario.trigger}. ${scenario.prospect_says || ''}. ${scenario.expected_result || ''}`;
          
          documents.push(document);
          metadatas.push({
            technique: technique.technique_name,
            coach_prompt: scenario.coach_prompt,
            salesperson_says: scenario.salesperson_says,
            trigger: scenario.trigger
          });
          ids.push(`tech_${idCounter++}`);
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
          documents_loaded: documents.length
        });
      }
      
    } catch (error) {
      this.trail.fail(8202, error as Error);
      this.useChromaDB = false;
    }
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