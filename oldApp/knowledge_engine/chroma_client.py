"""
ChromaDB Vector Database Client for VoiceCoach
Optimized for <100ms query response time
"""

import os
import uuid
import logging
from typing import List, Dict, Any, Optional, Union
from pathlib import Path
import time

import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
from sentence_transformers import SentenceTransformer


class ChromaVectorDB:
    """
    High-performance ChromaDB client for VoiceCoach sales knowledge retrieval.
    
    Designed for:
    - <100ms similarity search queries
    - 100K+ document chunks capacity
    - Local-first vector storage
    - Real-time coaching prompt generation
    """
    
    def __init__(self, persist_directory: str = "data/vector_db"):
        self.logger = logging.getLogger(__name__)
        self.persist_directory = Path(persist_directory)
        self.persist_directory.mkdir(parents=True, exist_ok=True)
        
        # Initialize ChromaDB with persistent storage
        self.client = chromadb.PersistentClient(
            path=str(self.persist_directory)
        )
        
        # Use sentence-transformers/all-MiniLM-L6-v2 for business context
        # 384-dimensional embeddings, 22MB model, 14,200 sentence pairs/sec
        self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            normalize_embeddings=True  # Enable fast dot-product similarity
        )
        
        # Performance tracking
        self.query_times = []
        
        self.logger.info(f"ChromaVectorDB initialized with storage: {self.persist_directory}")
        
    def create_collection(self, name: str, description: str = "") -> None:
        """
        Create a new document collection with optimized settings.
        
        Args:
            name: Collection name (e.g., "sales_materials", "objection_handlers")
            description: Collection description for documentation
        """
        try:
            collection = self.client.create_collection(
                name=name,
                embedding_function=self.embedding_function,
                metadata={"description": description, "created_at": time.time()}
            )
            self.logger.info(f"Created collection '{name}' with description: {description}")
            return collection
        except Exception as e:
            if "already exists" in str(e):
                self.logger.info(f"Collection '{name}' already exists, using existing")
                return self.client.get_collection(name, embedding_function=self.embedding_function)
            else:
                self.logger.error(f"Failed to create collection '{name}': {e}")
                raise
    
    def get_collection(self, name: str):
        """Get existing collection by name."""
        try:
            return self.client.get_collection(name, embedding_function=self.embedding_function)
        except Exception as e:
            self.logger.error(f"Failed to get collection '{name}': {e}")
            raise
    
    def add_documents(
        self, 
        collection_name: str, 
        documents: List[str],
        metadatas: List[Dict[str, Any]],
        ids: Optional[List[str]] = None
    ) -> None:
        """
        Add document chunks to a collection with metadata tagging.
        
        Args:
            collection_name: Target collection
            documents: List of document chunks (512-token chunks recommended)
            metadatas: Metadata for each chunk (topic, methodology, objection-type, etc.)
            ids: Optional custom IDs, auto-generated if None
        """
        start_time = time.time()
        
        collection = self.get_collection(collection_name)
        
        if ids is None:
            ids = [str(uuid.uuid4()) for _ in documents]
        
        # Batch processing for better performance
        batch_size = 100
        for i in range(0, len(documents), batch_size):
            batch_docs = documents[i:i + batch_size]
            batch_metadatas = metadatas[i:i + batch_size]
            batch_ids = ids[i:i + batch_size]
            
            collection.add(
                documents=batch_docs,
                metadatas=batch_metadatas,
                ids=batch_ids
            )
        
        processing_time = time.time() - start_time
        self.logger.info(
            f"Added {len(documents)} documents to '{collection_name}' "
            f"in {processing_time:.2f}s ({len(documents)/processing_time:.0f} docs/sec)"
        )
    
    def search_knowledge(
        self,
        collection_name: str,
        query: str,
        n_results: int = 5,
        metadata_filter: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Semantic similarity search optimized for <100ms response time.
        
        Args:
            collection_name: Collection to search
            query: Search query (conversation context, objection, topic)
            n_results: Number of results to return (5-10 recommended for performance)
            metadata_filter: Filter by metadata (e.g., {"topic": "pricing"})
        
        Returns:
            Search results with documents, distances, and metadata
        """
        start_time = time.time()
        
        try:
            collection = self.get_collection(collection_name)
            
            # Perform similarity search with optional metadata filtering
            results = collection.query(
                query_texts=[query],
                n_results=n_results,
                where=metadata_filter
            )
            
            query_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            self.query_times.append(query_time)
            
            self.logger.debug(f"Search completed in {query_time:.1f}ms for query: '{query[:50]}...'")
            
            # Format results for coaching engine
            formatted_results = {
                "query": query,
                "documents": results["documents"][0] if results["documents"] else [],
                "metadatas": results["metadatas"][0] if results["metadatas"] else [],
                "distances": results["distances"][0] if results["distances"] else [],
                "query_time_ms": query_time,
                "collection": collection_name
            }
            
            return formatted_results
            
        except Exception as e:
            self.logger.error(f"Search failed for query '{query}': {e}")
            return {
                "query": query,
                "documents": [],
                "metadatas": [],
                "distances": [],
                "query_time_ms": 0,
                "error": str(e)
            }
    
    def get_collection_stats(self, collection_name: str) -> Dict[str, Any]:
        """Get collection statistics and performance metrics."""
        collection = self.get_collection(collection_name)
        count = collection.count()
        
        # Calculate average query time
        avg_query_time = sum(self.query_times) / len(self.query_times) if self.query_times else 0
        
        return {
            "collection_name": collection_name,
            "document_count": count,
            "avg_query_time_ms": round(avg_query_time, 2),
            "total_queries": len(self.query_times),
            "performance_target": "< 100ms",
            "performance_status": "✅ OPTIMAL" if avg_query_time < 100 else "⚠️ NEEDS OPTIMIZATION"
        }
    
    def list_collections(self) -> List[Dict[str, Any]]:
        """List all collections with metadata."""
        collections = self.client.list_collections()
        return [
            {
                "name": col.name,
                "count": col.count(),
                "metadata": col.metadata
            }
            for col in collections
        ]
    
    def delete_collection(self, name: str) -> None:
        """Delete a collection (use with caution)."""
        self.client.delete_collection(name)
        self.logger.info(f"Deleted collection '{name}'")
    
    def reset_performance_metrics(self) -> None:
        """Reset query time tracking for fresh performance measurement."""
        self.query_times = []
        self.logger.info("Performance metrics reset")


# Global instance for VoiceCoach application
vector_db = ChromaVectorDB()