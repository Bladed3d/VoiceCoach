/**
 * VoiceCoach V2 - ChromaDB Type Definitions
 * Types for semantic search and vector storage
 */

export interface ChromaDBChunk {
  id: string;
  content: string;
  content_type: 'technique' | 'principle' | 'strategy' | 'framework' | 'example' | 'script';
  char_count: number;
  search_keywords: string[];
}

export interface ProcessedDocument {
  document_info: {
    source: string;
    total_chunks: number;
    processed_date: string;
    purpose: string;
    processing_status?: string;
    chunk_types?: {
      techniques: number;
      principles: number;
      strategies: number;
      frameworks: number;
    };
    optimization?: string;
  };
  chunks: ChromaDBChunk[];
}

export interface SemanticSearchResult {
  id: string;
  content: string;
  content_type: string;
  similarity_score: number;
  search_keywords: string[];
  metadata?: {
    char_count: number;
    collection_source: string;
    retrieved_at: number;
  };
}

export interface ChromaDBConfig {
  collection_name: string;
  embedding_model: string;
  similarity_threshold: number;
  max_results: number;
  performance_target_ms?: number;
}

export interface ChromaDBCollection {
  name: string;
  type: 'universal' | 'client_specific';
  client_name?: string;
  content_category?: 'scripts' | 'products' | 'process' | 'objections';
  chunk_count: number;
  last_updated: string;
  status: 'active' | 'inactive' | 'importing' | 'error';
}

export interface ChromaDBStats {
  collection_name: string;
  total_chunks: number;
  embedding_model: string;
  last_updated: string;
  status: 'ready' | 'initializing' | 'error';
  performance_metrics?: {
    avg_search_time_ms: number;
    total_searches: number;
    cache_hit_rate: number;
  };
}

export interface SemanticSearchQuery {
  query: string;
  collection_names?: string[];
  top_k?: number;
  similarity_threshold?: number;
  content_types?: string[];
  boost_keywords?: string[];
}

export interface MultiCollectionSearchResult {
  results: SemanticSearchResult[];
  collection_breakdown: {
    [collection_name: string]: {
      count: number;
      top_similarity: number;
    };
  };
  search_metadata: {
    query: string;
    total_results: number;
    search_time_ms: number;
    collections_searched: string[];
  };
}