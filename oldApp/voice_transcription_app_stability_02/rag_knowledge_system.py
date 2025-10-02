"""
RAG Knowledge Integration for OpenRouter Coaching
ChromaDB Vector Database with LED Breadcrumb Infrastructure

This module provides RAG (Retrieval-Augmented Generation) capabilities for enhancing
coaching prompts with relevant knowledge from a vector database.
"""

import os
import json
import time
import uuid
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import logging
import numpy as np
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from ai_breadcrumb_system import AIBreadcrumbTrail, get_ai_trail
from openrouter_coaching_system import CoachingLEDRanges, CoachingContext

# Set up logging for RAG system
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("RAGKnowledgeSystem")

@dataclass
class KnowledgeDocument:
    """Knowledge document with metadata"""
    id: str
    content: str
    title: str
    category: str  # 'objection_handling', 'product_info', 'pricing', 'competition'
    confidence_score: float
    tags: List[str]
    created_at: float
    last_accessed: float

@dataclass
class RelevantKnowledge:
    """Retrieved relevant knowledge with similarity scores"""
    documents: List[KnowledgeDocument]
    similarity_scores: List[float]
    total_documents: int
    retrieval_time_ms: float
    query_embedding: List[float]

class RAGKnowledgeSystem:
    """
    RAG knowledge system using ChromaDB for vector storage and retrieval.
    Provides coaching-relevant knowledge retrieval with LED debugging.
    """
    
    def __init__(self, persist_directory: str = "./chroma_coaching_db", 
                 embedding_model: str = "all-MiniLM-L6-v2"):
        """
        Initialize RAG knowledge system with ChromaDB and embedding model.
        
        Args:
            persist_directory: Directory to persist ChromaDB data
            embedding_model: Sentence transformer model for embeddings
        """
        # Initialize RAG breadcrumb trail
        self.trail = get_ai_trail("RAGKnowledgeSystem")
        self.trail.light(CoachingLEDRanges.RAG_KNOWLEDGE_SEARCH, "rag_system_init")
        
        self.persist_directory = persist_directory
        self.embedding_model_name = embedding_model
        
        # Initialize ChromaDB
        self._init_chromadb()
        
        # Initialize embedding model
        self._init_embedding_model()
        
        # Knowledge cache for performance
        self.knowledge_cache = {}
        self.embedding_cache = {}
        
        # Performance tracking
        self.retrieval_times = []
        self.cache_hits = 0
        self.cache_misses = 0
        
        self.trail.light(CoachingLEDRanges.RAG_KNOWLEDGE_RETRIEVAL, "rag_system_ready")
    
    def _init_chromadb(self):
        """Initialize ChromaDB client and collection."""
        try:
            self.trail.light(CoachingLEDRanges.RAG_CHROMADB_QUERY, "initializing_chromadb")
            
            # Create persist directory if it doesn't exist
            os.makedirs(self.persist_directory, exist_ok=True)
            
            # Initialize ChromaDB client with persistence
            self.chroma_client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Get or create collection for coaching knowledge
            self.collection = self.chroma_client.get_or_create_collection(
                name="coaching_knowledge",
                metadata={"description": "Sales coaching knowledge base"}
            )
            
            # Check existing document count
            collection_count = self.collection.count()
            
            self.trail.light(CoachingLEDRanges.RAG_CHROMADB_QUERY, "chromadb_initialized",
                           {'existing_documents': collection_count})
            
            logger.info(f"ChromaDB initialized with {collection_count} existing documents")
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.RAG_CHROMADB_QUERY, e, "chromadb_init_failed")
            raise
    
    def _init_embedding_model(self):
        """Initialize sentence transformer model for embeddings."""
        try:
            self.trail.light(CoachingLEDRanges.RAG_EMBEDDING_UPDATE, "loading_embedding_model")
            
            embedding_start = time.time()
            self.embedding_model = SentenceTransformer(self.embedding_model_name)
            embedding_load_time = (time.time() - embedding_start) * 1000
            
            # Test embedding generation
            test_embedding = self.embedding_model.encode("test sentence")
            embedding_dim = len(test_embedding)
            
            performance_metrics = {
                'model_load_time_ms': embedding_load_time,
                'embedding_dimension': embedding_dim,
                'model_name': self.embedding_model_name
            }
            
            self.trail.light(CoachingLEDRanges.RAG_EMBEDDING_UPDATE, "embedding_model_ready",
                           performance_metrics=performance_metrics)
            
            logger.info(f"Embedding model '{self.embedding_model_name}' loaded in {embedding_load_time:.1f}ms")
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.RAG_EMBEDDING_UPDATE, e, "embedding_model_failed")
            raise
    
    def add_knowledge_document(self, content: str, title: str, category: str, 
                             tags: List[str] = None) -> str:
        """
        Add knowledge document to the vector database.
        
        Args:
            content: Document content
            title: Document title
            category: Category (objection_handling, product_info, etc.)
            tags: Optional tags for the document
            
        Returns:
            Document ID
        """
        self.trail.light(CoachingLEDRanges.RAG_KNOWLEDGE_CACHING, "adding_knowledge_document")
        
        try:
            # Generate document ID
            doc_id = str(uuid.uuid4())
            
            # Generate embedding for content
            embedding_start = time.time()
            content_embedding = self.embedding_model.encode(content).tolist()
            embedding_time = (time.time() - embedding_start) * 1000
            
            # Prepare metadata
            metadata = {
                "title": title,
                "category": category,
                "tags": json.dumps(tags or []),
                "created_at": time.time(),
                "last_accessed": time.time(),
                "confidence_score": 1.0  # Default high confidence for manually added docs
            }
            
            # Add to ChromaDB
            self.collection.add(
                ids=[doc_id],
                embeddings=[content_embedding],
                documents=[content],
                metadatas=[metadata]
            )
            
            performance_metrics = {
                'embedding_time_ms': embedding_time,
                'document_length': len(content),
                'embedding_dimension': len(content_embedding)
            }
            
            self.trail.light(CoachingLEDRanges.RAG_KNOWLEDGE_CACHING, "document_added",
                           performance_metrics=performance_metrics)
            
            logger.info(f"Added knowledge document: '{title}' ({len(content)} chars)")
            return doc_id
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.RAG_KNOWLEDGE_CACHING, e, "document_add_failed")
            raise
    
    def retrieve_relevant_knowledge(self, context: CoachingContext, 
                                  max_results: int = 3) -> RelevantKnowledge:
        """
        Retrieve relevant knowledge based on coaching context.
        
        Args:
            context: Current coaching context
            max_results: Maximum number of results to return
            
        Returns:
            RelevantKnowledge with documents and similarity scores
        """
        self.trail.light(CoachingLEDRanges.RAG_VECTOR_SIMILARITY, "retrieving_knowledge")
        
        retrieval_start = time.time()
        
        try:
            # Build query from context
            query_text = self._build_knowledge_query(context)
            
            # Check cache first
            cache_key = self._generate_retrieval_cache_key(query_text, max_results)
            if cache_key in self.knowledge_cache:
                self.cache_hits += 1
                self.trail.light(CoachingLEDRanges.RAG_KNOWLEDGE_CACHING, "cache_hit")
                return self.knowledge_cache[cache_key]
            
            self.cache_misses += 1
            self.trail.light(CoachingLEDRanges.RAG_KNOWLEDGE_CACHING, "cache_miss")
            
            # Generate query embedding
            embedding_start = time.time()
            query_embedding = self.embedding_model.encode(query_text).tolist()
            embedding_time = (time.time() - embedding_start) * 1000
            
            # Search ChromaDB
            search_start = time.time()
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=max_results,
                include=["documents", "metadatas", "distances"]
            )
            search_time = (time.time() - search_start) * 1000
            
            # Process results
            documents = []
            similarity_scores = []
            
            if results['documents'] and len(results['documents']) > 0:
                for i, (doc_content, metadata, distance) in enumerate(zip(
                    results['documents'][0],
                    results['metadatas'][0],
                    results['distances'][0]
                )):
                    # Convert distance to similarity score (ChromaDB uses cosine distance)
                    similarity_score = 1.0 - distance
                    
                    # Create knowledge document
                    knowledge_doc = KnowledgeDocument(
                        id=results['ids'][0][i],
                        content=doc_content,
                        title=metadata.get('title', 'Unknown'),
                        category=metadata.get('category', 'general'),
                        confidence_score=metadata.get('confidence_score', 0.8),
                        tags=json.loads(metadata.get('tags', '[]')),
                        created_at=metadata.get('created_at', 0),
                        last_accessed=time.time()
                    )
                    
                    documents.append(knowledge_doc)
                    similarity_scores.append(similarity_score)
                    
                    # Update last accessed time
                    self._update_document_access_time(results['ids'][0][i])
            
            retrieval_time = (time.time() - retrieval_start) * 1000
            
            # Create relevant knowledge result
            relevant_knowledge = RelevantKnowledge(
                documents=documents,
                similarity_scores=similarity_scores,
                total_documents=len(documents),
                retrieval_time_ms=retrieval_time,
                query_embedding=query_embedding
            )
            
            # Cache the result
            self.knowledge_cache[cache_key] = relevant_knowledge
            
            # Limit cache size
            if len(self.knowledge_cache) > 100:
                # Remove oldest cache entries
                oldest_keys = list(self.knowledge_cache.keys())[:20]
                for key in oldest_keys:
                    del self.knowledge_cache[key]
            
            # Track retrieval time
            self.retrieval_times.append(retrieval_time)
            
            performance_metrics = {
                'retrieval_time_ms': retrieval_time,
                'embedding_time_ms': embedding_time,
                'search_time_ms': search_time,
                'documents_found': len(documents),
                'avg_similarity': sum(similarity_scores) / len(similarity_scores) if similarity_scores else 0
            }
            
            self.trail.light(CoachingLEDRanges.RAG_KNOWLEDGE_RETRIEVAL, "knowledge_retrieved",
                           performance_metrics=performance_metrics)
            
            return relevant_knowledge
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.RAG_KNOWLEDGE_RETRIEVAL, e, "retrieval_failed")
            return RelevantKnowledge([], [], 0, 0, [])
    
    def filter_relevant_knowledge(self, relevant_knowledge: RelevantKnowledge,
                                 context: CoachingContext,
                                 min_similarity: float = 0.7) -> RelevantKnowledge:
        """
        Filter retrieved knowledge based on relevance criteria.
        
        Args:
            relevant_knowledge: Retrieved knowledge
            context: Coaching context
            min_similarity: Minimum similarity threshold
            
        Returns:
            Filtered relevant knowledge
        """
        self.trail.light(CoachingLEDRanges.RAG_RELEVANCE_FILTERING, "filtering_knowledge")
        
        try:
            filtered_docs = []
            filtered_scores = []
            
            for doc, score in zip(relevant_knowledge.documents, relevant_knowledge.similarity_scores):
                # Check similarity threshold
                if score < min_similarity:
                    continue
                
                # Check category relevance
                if self._is_category_relevant(doc.category, context):
                    filtered_docs.append(doc)
                    filtered_scores.append(score)
            
            filtered_knowledge = RelevantKnowledge(
                documents=filtered_docs,
                similarity_scores=filtered_scores,
                total_documents=len(filtered_docs),
                retrieval_time_ms=relevant_knowledge.retrieval_time_ms,
                query_embedding=relevant_knowledge.query_embedding
            )
            
            self.trail.light(CoachingLEDRanges.RAG_RELEVANCE_FILTERING, "knowledge_filtered",
                           {'original_count': len(relevant_knowledge.documents),
                            'filtered_count': len(filtered_docs)})
            
            return filtered_knowledge
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.RAG_RELEVANCE_FILTERING, e, "filtering_failed")
            return relevant_knowledge
    
    def enhance_coaching_prompt(self, base_prompt: str, relevant_knowledge: RelevantKnowledge) -> str:
        """
        Enhance coaching prompt with relevant knowledge.
        
        Args:
            base_prompt: Original coaching prompt
            relevant_knowledge: Retrieved relevant knowledge
            
        Returns:
            Enhanced prompt with knowledge context
        """
        self.trail.light(CoachingLEDRanges.RAG_RESPONSE_AUGMENTATION, "enhancing_prompt")
        
        try:
            if not relevant_knowledge.documents:
                return base_prompt
            
            # Build knowledge context
            knowledge_context = "\n\nRELEVANT KNOWLEDGE:\n"
            
            for i, (doc, score) in enumerate(zip(relevant_knowledge.documents, 
                                               relevant_knowledge.similarity_scores)):
                knowledge_context += f"{i+1}. {doc.title} (relevance: {score:.2f})\n"
                knowledge_context += f"   {doc.content[:200]}...\n\n"
            
            # Combine base prompt with knowledge
            enhanced_prompt = f"""{base_prompt}

{knowledge_context}

Consider this relevant knowledge when providing your coaching guidance."""
            
            self.trail.light(CoachingLEDRanges.RAG_RESPONSE_AUGMENTATION, "prompt_enhanced",
                           {'knowledge_docs_used': len(relevant_knowledge.documents),
                            'enhanced_prompt_length': len(enhanced_prompt)})
            
            return enhanced_prompt
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.RAG_RESPONSE_AUGMENTATION, e, "enhancement_failed")
            return base_prompt
    
    def _build_knowledge_query(self, context: CoachingContext) -> str:
        """Build search query from coaching context."""
        query_parts = []
        
        # Add conversation topic
        if context.conversation_topic:
            query_parts.append(context.conversation_topic)
        
        # Add detected intent
        if context.intent_detected:
            query_parts.append(context.intent_detected)
        
        # Add recent conversation context
        if context.conversation_history:
            recent_text = " ".join([msg['text'] for msg in context.conversation_history[-2:]])
            query_parts.append(recent_text)
        
        return " ".join(query_parts)
    
    def _is_category_relevant(self, doc_category: str, context: CoachingContext) -> bool:
        """Check if document category is relevant to current context."""
        intent = context.intent_detected.lower()
        
        relevance_map = {
            'objection_handling': ['objection', 'concern', 'no', 'but'],
            'product_info': ['feature', 'product', 'functionality', 'benefit'],
            'pricing': ['price', 'cost', 'expensive', 'budget'],
            'competition': ['competitor', 'alternative', 'compare'],
            'closing': ['close', 'sign', 'agreement', 'ready']
        }
        
        if doc_category in relevance_map:
            return any(keyword in intent for keyword in relevance_map[doc_category])
        
        return True  # General documents are always relevant
    
    def _generate_retrieval_cache_key(self, query: str, max_results: int) -> str:
        """Generate cache key for retrieval query."""
        return f"{hash(query)}_{max_results}"
    
    def _update_document_access_time(self, doc_id: str):
        """Update last accessed time for a document."""
        try:
            # Note: ChromaDB doesn't support direct metadata updates
            # This is a placeholder for tracking access patterns
            pass
        except Exception:
            pass
    
    def populate_default_knowledge(self):
        """Populate database with default coaching knowledge."""
        self.trail.light(CoachingLEDRanges.RAG_KNOWLEDGE_CACHING, "populating_default_knowledge")
        
        default_knowledge = [
            {
                "title": "Price Objection - Value Demonstration",
                "content": "When prospects mention price concerns, immediately pivot to value demonstration. Ask: 'What specific ROI are you looking to achieve?' Then tie your solution's benefits directly to their desired outcomes. Use concrete numbers and case studies.",
                "category": "objection_handling",
                "tags": ["pricing", "value", "roi"]
            },
            {
                "title": "Competition Comparison Framework",
                "content": "When comparing to competitors, use the 'Acknowledge, Differentiate, Redirect' framework. Acknowledge their research, highlight unique differentiators, then redirect to their specific needs and challenges.",
                "category": "competition",
                "tags": ["competitors", "differentiation", "comparison"]
            },
            {
                "title": "Question Handling - Discovery Opportunity",
                "content": "Every prospect question is a discovery opportunity. Answer the question, then ask: 'What prompted that question?' or 'How important is this aspect to your decision?' This reveals underlying concerns and priorities.",
                "category": "objection_handling",
                "tags": ["questions", "discovery", "concerns"]
            },
            {
                "title": "Closing - Trial Close Techniques",
                "content": "Use trial closes throughout the conversation: 'How does this sound so far?' or 'What would need to happen for this to work for you?' These gauge readiness and surface final objections before the actual close.",
                "category": "closing",
                "tags": ["trial_close", "closing", "readiness"]
            },
            {
                "title": "Rapport Building - Mirroring Technique",
                "content": "Mirror the prospect's communication style, pace, and energy level. If they speak quickly and are direct, match that energy. If they're more methodical, slow down and be more detailed in your responses.",
                "category": "product_info",
                "tags": ["rapport", "mirroring", "communication"]
            }
        ]
        
        added_count = 0
        for knowledge in default_knowledge:
            try:
                self.add_knowledge_document(
                    content=knowledge["content"],
                    title=knowledge["title"],
                    category=knowledge["category"],
                    tags=knowledge["tags"]
                )
                added_count += 1
            except Exception as e:
                logger.error(f"Failed to add knowledge document '{knowledge['title']}': {e}")
        
        self.trail.light(CoachingLEDRanges.RAG_KNOWLEDGE_CACHING, "default_knowledge_populated",
                        {'documents_added': added_count})
        
        logger.info(f"Populated {added_count} default knowledge documents")
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics for the RAG system."""
        avg_retrieval_time = sum(self.retrieval_times) / len(self.retrieval_times) if self.retrieval_times else 0
        total_requests = self.cache_hits + self.cache_misses
        cache_hit_rate = self.cache_hits / total_requests * 100 if total_requests > 0 else 0
        
        return {
            'total_documents': self.collection.count(),
            'average_retrieval_time_ms': avg_retrieval_time,
            'cache_hit_rate': cache_hit_rate,
            'cache_size': len(self.knowledge_cache),
            'total_retrievals': len(self.retrieval_times),
            'embedding_model': self.embedding_model_name
        }

# Global RAG system instance
rag_system: Optional[RAGKnowledgeSystem] = None

def get_rag_system(persist_directory: str = "./chroma_coaching_db") -> RAGKnowledgeSystem:
    """Get or create global RAG system instance."""
    global rag_system
    if rag_system is None:
        rag_system = RAGKnowledgeSystem(persist_directory)
    return rag_system

def initialize_rag_system(populate_defaults: bool = True) -> bool:
    """Initialize RAG system and optionally populate with default knowledge."""
    try:
        system = get_rag_system()
        
        if populate_defaults and system.collection.count() == 0:
            system.populate_default_knowledge()
        
        return True
    except Exception as e:
        logger.error(f"Failed to initialize RAG system: {e}")
        return False

if __name__ == "__main__":
    # Example usage and testing
    print("🧠 Testing RAG Knowledge System with LED Breadcrumbs")
    print("=" * 60)
    
    # Initialize system
    rag_system = RAGKnowledgeSystem()
    
    # Populate with default knowledge if empty
    if rag_system.collection.count() == 0:
        print("📚 Populating with default knowledge...")
        rag_system.populate_default_knowledge()
    
    # Test knowledge retrieval
    from openrouter_coaching_system import CoachingContext
    
    test_context = CoachingContext(
        conversation_history=[
            {"speaker": "prospect", "text": "Your solution seems expensive compared to others.", "timestamp": time.time()}
        ],
        current_speaker="prospect",
        conversation_topic="pricing",
        sentiment_score=-0.3,
        intent_detected="objection"
    )
    
    print(f"\n🔍 Testing knowledge retrieval for pricing objection...")
    
    # Retrieve relevant knowledge
    start_time = time.time()
    relevant_knowledge = rag_system.retrieve_relevant_knowledge(test_context, max_results=3)
    retrieval_time = (time.time() - start_time) * 1000
    
    print(f"✅ Retrieved {len(relevant_knowledge.documents)} documents in {retrieval_time:.1f}ms")
    
    for i, (doc, score) in enumerate(zip(relevant_knowledge.documents, relevant_knowledge.similarity_scores)):
        print(f"   {i+1}. {doc.title} (similarity: {score:.3f})")
        print(f"      Category: {doc.category}")
        print(f"      Content: {doc.content[:100]}...")
        print()
    
    # Test prompt enhancement
    base_prompt = "The prospect is concerned about pricing. How should I respond?"
    enhanced_prompt = rag_system.enhance_coaching_prompt(base_prompt, relevant_knowledge)
    
    print(f"💡 Enhanced Prompt Length: {len(enhanced_prompt)} characters")
    print(f"🏃 Original Length: {len(base_prompt)} characters")
    
    # Print performance metrics
    metrics = rag_system.get_performance_metrics()
    print(f"\n📊 RAG Performance Metrics:")
    print(f"   Total Documents: {metrics['total_documents']}")
    print(f"   Avg Retrieval Time: {metrics['average_retrieval_time_ms']:.1f}ms")
    print(f"   Cache Hit Rate: {metrics['cache_hit_rate']:.1f}%")
    print(f"   Embedding Model: {metrics['embedding_model']}")
    
    print(f"\n✅ RAG system test completed")