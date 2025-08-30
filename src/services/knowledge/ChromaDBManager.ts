/**
 * VoiceCoach V2 - ChromaDB Collection Manager
 * Manages multiple ChromaDB collections for scalable client content
 * LED Range: 6500-6599
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { ChromaDBService } from './ChromaDBService';
import { 
  ChromaDBCollection, 
  MultiCollectionSearchResult, 
  SemanticSearchQuery,
  SemanticSearchResult 
} from '../../types/chromadb';

interface ClientContent {
  client_name: string;
  scripts?: string; // JSON file path
  products?: string; // JSON file path
  process?: string; // JSON file path
  objections?: string; // JSON file path
}

export class ChromaDBManager {
  private trail: BreadcrumbTrail;
  private collections: Map<string, ChromaDBService> = new Map();
  private universalCollection: ChromaDBService;
  private isInitialized: boolean = false;

  constructor() {
    this.trail = new BreadcrumbTrail('ChromaDBManager');
    
    // Always initialize the universal NeverSplit collection
    this.universalCollection = new ChromaDBService('universal_neversplit');
    this.collections.set('universal_neversplit', this.universalCollection);

    // LED 6500: ChromaDB Manager initialization
    this.trail.light(6500, {
      operation: 'chromadb_manager_initialization',
      universal_collection: 'universal_neversplit',
      timestamp: Date.now()
    });
    
    console.log('🎵 LED 6500: ChromaDB Manager initialized');
  }

  /**
   * Initialize all collections
   */
  async initialize(): Promise<boolean> {
    // LED 6501: Manager initialization start
    this.trail.light(6501, {
      operation: 'chromadb_manager_init_start',
      collections_count: this.collections.size,
      timestamp: Date.now()
    });

    try {
      // Initialize universal collection first
      const universalReady = await this.universalCollection.initialize();
      if (!universalReady) {
        throw new Error('Failed to initialize universal NeverSplit collection');
      }

      // Import NeverSplit processed document
      await this.universalCollection.importDocument('NeverSplit_ChromaDB_Processed.json');

      // LED 6502: Manager initialization success
      this.trail.light(6502, {
        operation: 'chromadb_manager_init_success',
        universal_ready: universalReady,
        total_collections: this.collections.size,
        timestamp: Date.now()
      });

      this.isInitialized = true;
      console.log('✅ ChromaDB Manager: Universal collection ready');
      return true;

    } catch (error) {
      // LED 8500: Manager initialization failure
      this.trail.fail(8500, error as Error);
      console.error('❌ ChromaDB Manager initialization failed:', error);
      return false;
    }
  }

  /**
   * Add client-specific content collections
   */
  async addClientContent(clientContent: ClientContent): Promise<boolean> {
    if (!this.isInitialized) {
      console.warn('⚠️ ChromaDB Manager not initialized');
      return false;
    }

    // LED 6510: Client content addition start
    this.trail.light(6510, {
      operation: 'client_content_addition_start',
      client_name: clientContent.client_name,
      content_types: Object.keys(clientContent).filter(k => k !== 'client_name'),
      timestamp: Date.now()
    });

    try {
      let collectionsAdded = 0;

      // Add each content type as a separate collection
      for (const [contentType, filePath] of Object.entries(clientContent)) {
        if (contentType === 'client_name' || !filePath) continue;

        const collectionName = `client_${clientContent.client_name}_${contentType}`;
        
        // LED 6511: Individual collection creation
        this.trail.light(6511, {
          operation: 'client_collection_creation',
          collection_name: collectionName,
          content_type: contentType,
          file_path: filePath,
          timestamp: Date.now()
        });

        // Create and initialize collection
        const clientCollection = new ChromaDBService(collectionName);
        const initialized = await clientCollection.initialize();
        
        if (initialized) {
          // Import client-specific document
          const imported = await clientCollection.importDocument(filePath);
          
          if (imported) {
            this.collections.set(collectionName, clientCollection);
            collectionsAdded++;
            
            console.log(`✅ ChromaDB: Added collection '${collectionName}'`);
          } else {
            console.warn(`⚠️ ChromaDB: Failed to import ${filePath} for ${collectionName}`);
          }
        } else {
          console.warn(`⚠️ ChromaDB: Failed to initialize collection ${collectionName}`);
        }
      }

      // LED 6512: Client content addition complete
      this.trail.light(6512, {
        operation: 'client_content_addition_complete',
        client_name: clientContent.client_name,
        collections_added: collectionsAdded,
        total_collections: this.collections.size,
        timestamp: Date.now()
      });

      console.log(`✅ ChromaDB: Added ${collectionsAdded} collections for client '${clientContent.client_name}'`);
      return collectionsAdded > 0;

    } catch (error) {
      // LED 8510: Client content addition failure
      this.trail.fail(8510, error as Error);
      console.error('❌ Failed to add client content:', error);
      return false;
    }
  }

  /**
   * Perform multi-collection semantic search
   */
  async multiCollectionSearch(query: SemanticSearchQuery): Promise<MultiCollectionSearchResult> {
    if (!this.isInitialized) {
      return this.createEmptySearchResult(query.query);
    }

    const startTime = Date.now();
    
    // LED 6520: Multi-collection search start
    this.trail.light(6520, {
      operation: 'multi_collection_search_start',
      query_preview: query.query.substring(0, 50),
      collections_to_search: query.collection_names?.length || this.collections.size,
      top_k: query.top_k || 5,
      timestamp: startTime
    });

    try {
      const allResults: SemanticSearchResult[] = [];
      const collectionBreakdown: { [key: string]: { count: number; top_similarity: number } } = {};
      const collectionsSearched: string[] = [];

      // Determine which collections to search
      const collectionsToSearch = query.collection_names || Array.from(this.collections.keys());
      
      // Search each collection
      for (const collectionName of collectionsToSearch) {
        const collection = this.collections.get(collectionName);
        if (!collection || !collection.isReady()) {
          continue;
        }

        try {
          const results = await collection.semanticSearch(
            query.query, 
            query.top_k || 3 // Smaller per-collection limit for multi-search
          );
          
          // Filter by similarity threshold if specified
          const filteredResults = query.similarity_threshold 
            ? results.filter(r => r.similarity_score >= query.similarity_threshold!)
            : results;

          // Filter by content types if specified
          const typeFilteredResults = query.content_types
            ? filteredResults.filter(r => query.content_types!.includes(r.content_type))
            : filteredResults;

          allResults.push(...typeFilteredResults);
          collectionsSearched.push(collectionName);
          
          // Track collection breakdown
          if (typeFilteredResults.length > 0) {
            collectionBreakdown[collectionName] = {
              count: typeFilteredResults.length,
              top_similarity: Math.max(...typeFilteredResults.map(r => r.similarity_score))
            };
          }

        } catch (error) {
          console.warn(`⚠️ Search failed for collection '${collectionName}':`, error);
        }
      }

      // Sort all results by similarity score and limit
      allResults.sort((a, b) => b.similarity_score - a.similarity_score);
      const finalResults = allResults.slice(0, query.top_k || 5);

      const searchTime = Date.now() - startTime;

      // LED 6521: Multi-collection search complete
      this.trail.light(6521, {
        operation: 'multi_collection_search_complete',
        total_results: finalResults.length,
        collections_searched: collectionsSearched.length,
        search_time_ms: searchTime,
        top_similarity: finalResults[0]?.similarity_score || 0,
        timestamp: Date.now()
      });

      const result: MultiCollectionSearchResult = {
        results: finalResults,
        collection_breakdown: collectionBreakdown,
        search_metadata: {
          query: query.query,
          total_results: finalResults.length,
          search_time_ms: searchTime,
          collections_searched: collectionsSearched
        }
      };

      console.log(`🔍 ChromaDB: Multi-search found ${finalResults.length} results across ${collectionsSearched.length} collections in ${searchTime}ms`);
      return result;

    } catch (error) {
      // LED 8520: Multi-collection search failure
      this.trail.fail(8520, error as Error);
      console.error('❌ Multi-collection search failed:', error);
      return this.createEmptySearchResult(query.query);
    }
  }

  /**
   * Get information about all collections
   */
  async getCollectionInfo(): Promise<ChromaDBCollection[]> {
    // LED 6530: Collection info request
    this.trail.light(6530, {
      operation: 'collection_info_request',
      total_collections: this.collections.size,
      timestamp: Date.now()
    });

    const collectionInfo: ChromaDBCollection[] = [];

    for (const [name, service] of this.collections.entries()) {
      try {
        const stats = await service.getCollectionStats();
        
        collectionInfo.push({
          name,
          type: name.startsWith('client_') ? 'client_specific' : 'universal',
          client_name: name.startsWith('client_') ? name.split('_')[1] : undefined,
          content_category: name.includes('_scripts') ? 'scripts' :
                          name.includes('_products') ? 'products' :
                          name.includes('_process') ? 'process' :
                          name.includes('_objections') ? 'objections' : undefined,
          chunk_count: stats.total_chunks || 0,
          last_updated: stats.last_updated || new Date().toISOString(),
          status: service.isReady() ? 'active' : 'inactive'
        });

      } catch (error) {
        console.warn(`⚠️ Failed to get stats for collection '${name}':`, error);
        collectionInfo.push({
          name,
          type: name.startsWith('client_') ? 'client_specific' : 'universal',
          chunk_count: 0,
          last_updated: new Date().toISOString(),
          status: 'error'
        });
      }
    }

    // LED 6531: Collection info retrieved
    this.trail.light(6531, {
      operation: 'collection_info_retrieved',
      total_collections: collectionInfo.length,
      active_collections: collectionInfo.filter(c => c.status === 'active').length,
      timestamp: Date.now()
    });

    return collectionInfo;
  }

  /**
   * Remove client collections
   */
  async removeClientCollections(clientName: string): Promise<boolean> {
    // LED 6540: Client collection removal
    this.trail.light(6540, {
      operation: 'client_collection_removal',
      client_name: clientName,
      timestamp: Date.now()
    });

    try {
      let removedCount = 0;
      const collectionsToRemove: string[] = [];

      // Find all collections for this client
      for (const collectionName of this.collections.keys()) {
        if (collectionName.startsWith(`client_${clientName}_`)) {
          collectionsToRemove.push(collectionName);
        }
      }

      // Remove each collection
      for (const collectionName of collectionsToRemove) {
        this.collections.delete(collectionName);
        removedCount++;
        console.log(`🗑️ ChromaDB: Removed collection '${collectionName}'`);
      }

      // LED 6541: Client collections removed
      this.trail.light(6541, {
        operation: 'client_collections_removed',
        client_name: clientName,
        collections_removed: removedCount,
        remaining_collections: this.collections.size,
        timestamp: Date.now()
      });

      console.log(`✅ ChromaDB: Removed ${removedCount} collections for client '${clientName}'`);
      return removedCount > 0;

    } catch (error) {
      // LED 8540: Client collection removal failure
      this.trail.fail(8540, error as Error);
      console.error('❌ Failed to remove client collections:', error);
      return false;
    }
  }

  /**
   * Get manager status
   */
  isReady(): boolean {
    return this.isInitialized && this.universalCollection.isReady();
  }

  /**
   * Get total collections count
   */
  getCollectionCount(): number {
    return this.collections.size;
  }

  /**
   * Private: Create empty search result
   */
  private createEmptySearchResult(query: string): MultiCollectionSearchResult {
    return {
      results: [],
      collection_breakdown: {},
      search_metadata: {
        query,
        total_results: 0,
        search_time_ms: 0,
        collections_searched: []
      }
    };
  }
}