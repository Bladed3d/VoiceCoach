"""
VoiceCoach ChromaDB Vector Storage Integration
Optimized vector storage and retrieval for sales knowledge RAG system
"""

import logging
import uuid
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
import json
from datetime import datetime

try:
    import chromadb
    from chromadb.config import Settings
    from chromadb.utils import embedding_functions
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    logging.warning("ChromaDB not available. Install with: pip install chromadb")

from .chunking_engine import ContentChunk
from .metadata_extractor import ExtractedMetadata

logger = logging.getLogger(__name__)

@dataclass
class VectorDocument:
    """Document structure for vector storage"""
    id: str
    content: str
    metadata: Dict[str, Any]
    embedding: Optional[List[float]] = None
    chunk_index: Optional[int] = None
    source_document: Optional[str] = None

@dataclass
class SearchResult:
    """Search result structure"""
    document: VectorDocument
    similarity_score: float
    rank: int
    chunk_context: Optional[Dict[str, Any]] = None

class ChromaDBIntegration:
    """
    ChromaDB integration for VoiceCoach sales knowledge vector storage.
    
    Features:
    - Optimized embeddings for sales content
    - Sales-specific metadata filtering
    - Semantic search with context awareness
    - Real-time document updates and versioning
    - Batch operations for knowledge base setup
    """
    
    def __init__(self, 
                 collection_name: str = "voicecoach_sales_knowledge",
                 persist_directory: str = "./chromadb_data",
                 embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"):
        """
        Initialize ChromaDB client and collection.
        
        Args:
            collection_name: Name of the ChromaDB collection
            persist_directory: Directory to persist vector data
            embedding_model: Embedding model for semantic search
        """
        
        if not CHROMADB_AVAILABLE:
            raise ImportError("ChromaDB is required but not installed")
        
        self.collection_name = collection_name
        self.persist_directory = persist_directory
        self.embedding_model = embedding_model
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Initialize embedding function
        self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=embedding_model
        )
        
        # Get or create collection
        self.collection = self._get_or_create_collection()
        
        logger.info(f"ChromaDB initialized with collection: {collection_name}")
    
    def _get_or_create_collection(self):
        """Get existing collection or create new one"""
        try:
            return self.client.get_collection(
                name=self.collection_name,
                embedding_function=self.embedding_function
            )
        except Exception:
            return self.client.create_collection(
                name=self.collection_name,
                embedding_function=self.embedding_function,
                metadata={
                    "description": "VoiceCoach sales knowledge base",
                    "created_at": datetime.now().isoformat(),
                    "embedding_model": self.embedding_model
                }
            )
    
    def add_document_chunks(self, chunks: List[ContentChunk], 
                           document_metadata: ExtractedMetadata) -> List[str]:
        """
        Add document chunks to vector storage.
        
        Args:
            chunks: List of ContentChunk objects
            document_metadata: Extracted document metadata
            
        Returns:
            List of document IDs added to storage
        """
        
        if not chunks:
            logger.warning("No chunks provided for vector storage")
            return []
        
        try:
            # Prepare data for ChromaDB
            ids = []
            documents = []
            metadatas = []
            
            for chunk in chunks:
                # Generate unique ID
                doc_id = f"{chunk.source_document}_{chunk.chunk_id}_{uuid.uuid4().hex[:8]}"
                ids.append(doc_id)
                
                # Add chunk content
                documents.append(chunk.content)
                
                # Combine chunk metadata with document metadata
                combined_metadata = self._prepare_metadata(chunk, document_metadata)
                metadatas.append(combined_metadata)
            
            # Add to ChromaDB collection
            self.collection.add(
                ids=ids,
                documents=documents,
                metadatas=metadatas
            )
            
            logger.info(f"Added {len(chunks)} chunks to vector storage")
            return ids
            
        except Exception as e:
            logger.error(f"Failed to add chunks to vector storage: {e}")
            raise
    
    def _prepare_metadata(self, chunk: ContentChunk, 
                         document_metadata: ExtractedMetadata) -> Dict[str, Any]:
        """Prepare metadata for ChromaDB storage"""
        
        # Convert complex objects to JSON strings for ChromaDB compatibility
        metadata = {
            # Chunk-specific metadata
            'chunk_id': chunk.chunk_id,
            'source_document': chunk.source_document,
            'start_position': chunk.start_position,
            'end_position': chunk.end_position,
            'token_count': chunk.token_count,
            'word_count': chunk.word_count,
            'chunk_content_preview': chunk.content[:100] + '...' if len(chunk.content) > 100 else chunk.content,
            
            # Document-level metadata
            'document_type': document_metadata.document_type,
            'sales_methodology': document_metadata.sales_methodology or 'none',
            'sales_stage': document_metadata.sales_stage or 'general',
            'difficulty_level': document_metadata.difficulty_level,
            'training_category': document_metadata.training_category,
            'confidence_score': document_metadata.confidence_score,
            
            # Sales-specific metadata for filtering
            'target_audience': json.dumps(document_metadata.target_audience),
            'objection_types': json.dumps(document_metadata.objection_types),
            'key_topics': json.dumps(document_metadata.key_topics[:5]),  # Limit for storage
            'actionable_items': json.dumps(document_metadata.actionable_items[:3]),
            
            # Chunk sales context
            'contains_objection': chunk.sales_context.get('contains_objection', False),
            'contains_script': chunk.sales_context.get('contains_script', False),
            'contains_process': chunk.sales_context.get('contains_process', False),
            'contains_pricing': chunk.sales_context.get('contains_pricing', False),
            'contains_closing': chunk.sales_context.get('contains_closing', False),
            'question_count': chunk.sales_context.get('question_count', 0),
            'has_dialogue': chunk.sales_context.get('has_dialogue', False),
            'urgency_indicators': chunk.sales_context.get('urgency_indicators', 0),
            
            # System metadata
            'added_date': datetime.now().isoformat(),
            'version': '1.0'
        }
        
        return metadata
    
    def search_knowledge(self, query: str, 
                        n_results: int = 10,
                        filters: Optional[Dict[str, Any]] = None,
                        sales_context: Optional[Dict[str, Any]] = None) -> List[SearchResult]:
        """
        Search sales knowledge base with context-aware filtering.
        
        Args:
            query: Search query text
            n_results: Number of results to return
            filters: Additional metadata filters
            sales_context: Sales-specific context for filtering
            
        Returns:
            List of SearchResult objects ranked by relevance
        """
        
        try:
            # Build ChromaDB where clause from filters
            where_clause = self._build_where_clause(filters, sales_context)
            
            # Perform semantic search
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where_clause if where_clause else None,
                include=['documents', 'metadatas', 'distances']
            )
            
            # Convert to SearchResult objects
            search_results = []
            
            if results['ids'] and results['ids'][0]:
                for i, doc_id in enumerate(results['ids'][0]):
                    # Calculate similarity score (1 - distance)
                    distance = results['distances'][0][i] if results['distances'] else 0
                    similarity_score = max(0, 1 - distance)
                    
                    # Create VectorDocument
                    document = VectorDocument(
                        id=doc_id,
                        content=results['documents'][0][i],
                        metadata=results['metadatas'][0][i],
                    )
                    
                    # Extract chunk context
                    chunk_context = self._extract_chunk_context(results['metadatas'][0][i])
                    
                    search_result = SearchResult(
                        document=document,
                        similarity_score=similarity_score,
                        rank=i + 1,
                        chunk_context=chunk_context
                    )
                    
                    search_results.append(search_result)
            
            logger.info(f"Found {len(search_results)} results for query: {query[:50]}...")
            return search_results
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []
    
    def _build_where_clause(self, filters: Optional[Dict[str, Any]], 
                           sales_context: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Build ChromaDB where clause from filters and sales context"""
        
        conditions = []
        
        # Add basic filters
        if filters:
            for key, value in filters.items():
                if isinstance(value, list):
                    conditions.append({key: {"$in": value}})
                else:
                    conditions.append({key: {"$eq": value}})
        
        # Add sales context filters
        if sales_context:
            # Document type filtering
            if 'document_type' in sales_context:
                conditions.append({"document_type": {"$eq": sales_context['document_type']}})
            
            # Sales stage filtering
            if 'sales_stage' in sales_context:
                conditions.append({"sales_stage": {"$eq": sales_context['sales_stage']}})
            
            # Objection handling specific
            if sales_context.get('need_objection_handling'):
                conditions.append({"contains_objection": {"$eq": True}})
            
            # Script content specific
            if sales_context.get('need_script_content'):
                conditions.append({"contains_script": {"$eq": True}})
            
            # Pricing related
            if sales_context.get('need_pricing_info'):
                conditions.append({"contains_pricing": {"$eq": True}})
            
            # Closing techniques
            if sales_context.get('need_closing_help'):
                conditions.append({"contains_closing": {"$eq": True}})
            
            # Difficulty level filtering
            if 'difficulty_level' in sales_context:
                conditions.append({"difficulty_level": {"$eq": sales_context['difficulty_level']}})
        
        # Combine conditions with AND logic
        if len(conditions) == 0:
            return None
        elif len(conditions) == 1:
            return conditions[0]
        else:
            return {"$and": conditions}
    
    def _extract_chunk_context(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Extract relevant chunk context from metadata"""
        
        return {
            'sales_indicators': {
                'contains_objection': metadata.get('contains_objection', False),
                'contains_script': metadata.get('contains_script', False),
                'contains_process': metadata.get('contains_process', False),
                'contains_pricing': metadata.get('contains_pricing', False),
                'contains_closing': metadata.get('contains_closing', False),
                'has_dialogue': metadata.get('has_dialogue', False),
                'question_count': metadata.get('question_count', 0),
                'urgency_indicators': metadata.get('urgency_indicators', 0)
            },
            'document_info': {
                'document_type': metadata.get('document_type'),
                'sales_methodology': metadata.get('sales_methodology'),
                'sales_stage': metadata.get('sales_stage'),
                'training_category': metadata.get('training_category'),
                'difficulty_level': metadata.get('difficulty_level')
            },
            'chunk_info': {
                'token_count': metadata.get('token_count'),
                'word_count': metadata.get('word_count'),
                'source_document': metadata.get('source_document')
            }
        }
    
    def update_document(self, document_id: str, new_content: str, 
                       new_metadata: Dict[str, Any]) -> bool:
        """Update existing document in vector storage"""
        
        try:
            self.collection.update(
                ids=[document_id],
                documents=[new_content],
                metadatas=[new_metadata]
            )
            logger.info(f"Updated document: {document_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to update document {document_id}: {e}")
            return False
    
    def delete_document(self, document_id: str) -> bool:
        """Delete document from vector storage"""
        
        try:
            self.collection.delete(ids=[document_id])
            logger.info(f"Deleted document: {document_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete document {document_id}: {e}")
            return False
    
    def delete_documents_by_source(self, source_document: str) -> int:
        """Delete all chunks from a specific source document"""
        
        try:
            # Find all documents from this source
            results = self.collection.get(
                where={"source_document": {"$eq": source_document}},
                include=['ids']
            )
            
            if results['ids']:
                self.collection.delete(ids=results['ids'])
                deleted_count = len(results['ids'])
                logger.info(f"Deleted {deleted_count} chunks from source: {source_document}")
                return deleted_count
            else:
                logger.info(f"No chunks found for source: {source_document}")
                return 0
                
        except Exception as e:
            logger.error(f"Failed to delete chunks from source {source_document}: {e}")
            return 0
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector collection"""
        
        try:
            # Get all documents to analyze
            all_docs = self.collection.get(include=['metadatas'])
            
            if not all_docs['metadatas']:
                return {"total_documents": 0}
            
            total_docs = len(all_docs['metadatas'])
            
            # Analyze document types
            doc_types = {}
            training_categories = {}
            sales_stages = {}
            difficulty_levels = {}
            
            for metadata in all_docs['metadatas']:
                # Document types
                doc_type = metadata.get('document_type', 'unknown')
                doc_types[doc_type] = doc_types.get(doc_type, 0) + 1
                
                # Training categories
                training_cat = metadata.get('training_category', 'unknown')
                training_categories[training_cat] = training_categories.get(training_cat, 0) + 1
                
                # Sales stages
                sales_stage = metadata.get('sales_stage', 'unknown')
                sales_stages[sales_stage] = sales_stages.get(sales_stage, 0) + 1
                
                # Difficulty levels
                difficulty = metadata.get('difficulty_level', 'unknown')
                difficulty_levels[difficulty] = difficulty_levels.get(difficulty, 0) + 1
            
            return {
                'total_documents': total_docs,
                'document_types': doc_types,
                'training_categories': training_categories,
                'sales_stages': sales_stages,
                'difficulty_levels': difficulty_levels,
                'collection_name': self.collection_name,
                'embedding_model': self.embedding_model
            }
            
        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {"error": str(e)}
    
    def search_by_sales_context(self, sales_scenario: str, 
                               context: Dict[str, Any]) -> List[SearchResult]:
        """
        Search for relevant knowledge based on sales scenario and context.
        
        Args:
            sales_scenario: Description of current sales situation
            context: Sales context (stage, objections, methodology, etc.)
            
        Returns:
            Ranked list of relevant knowledge chunks
        """
        
        # Enhanced search with sales-specific context
        sales_context = {
            'sales_stage': context.get('stage'),
            'need_objection_handling': 'objection' in sales_scenario.lower(),
            'need_script_content': 'script' in sales_scenario.lower() or 'say' in sales_scenario.lower(),
            'need_pricing_info': any(word in sales_scenario.lower() for word in ['price', 'cost', 'budget']),
            'need_closing_help': any(word in sales_scenario.lower() for word in ['close', 'decision', 'next step']),
            'difficulty_level': context.get('difficulty', 'intermediate')
        }
        
        return self.search_knowledge(
            query=sales_scenario,
            n_results=context.get('max_results', 10),
            sales_context=sales_context
        )
    
    def reset_collection(self) -> bool:
        """Reset the entire collection (delete all documents)"""
        
        try:
            self.client.delete_collection(self.collection_name)
            self.collection = self._get_or_create_collection()
            logger.info(f"Reset collection: {self.collection_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to reset collection: {e}")
            return False