"""
ChromaDB Vector Database RAG System with LED Debugging Infrastructure

This module implements a complete RAG (Retrieval-Augmented Generation) system using ChromaDB
for vector storage and semantic search, specifically designed for voice coaching applications.

Features:
- ChromaDB vector database initialization and management
- Document embedding with sentence-transformers
- Semantic search with <100ms query performance
- Knowledge snippet retrieval for coaching prompts
- Sales-context classification and metadata extraction
- Real-time coaching integration with Tauri backend
- Comprehensive LED debugging trails for performance monitoring

LED Ranges:
- 200-299: Vector Database Operations
- 300-399: Knowledge Retrieval Operations  
- 400-499: Coaching Prompt Generation
- 500-599: Performance Monitoring
"""

import os
import time
import json
import hashlib
import traceback
import threading
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path

try:
    import chromadb
    from chromadb.config import Settings
    from chromadb.utils import embedding_functions
    import numpy as np
    from sentence_transformers import SentenceTransformer
except ImportError as e:
    print(f"ChromaDB dependencies not installed: {e}")
    print("Install with: pip install chromadb sentence-transformers")
    raise

from breadcrumb_system import BreadcrumbTrail


@dataclass
class KnowledgeSnippet:
    """Knowledge snippet retrieved from vector database"""
    content: str
    metadata: Dict[str, Any]
    similarity_score: float
    source: str
    coaching_context: str


@dataclass
class CoachingPrompt:
    """Generated coaching prompt with context"""
    prompt: str
    context_snippets: List[KnowledgeSnippet]
    personalization_data: Dict[str, Any]
    prompt_type: str
    generated_at: float


class ChromaDBRAGSystem:
    """
    ChromaDB-based RAG system for voice coaching applications.
    Provides semantic search, knowledge retrieval, and coaching prompt generation
    with comprehensive LED debugging infrastructure.
    """
    
    def __init__(self, 
                 db_path: str = "./chroma_db",
                 collection_name: str = "coaching_knowledge",
                 embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
                 max_results: int = 5,
                 similarity_threshold: float = 0.7):
        """
        Initialize the ChromaDB RAG system.
        
        Args:
            db_path: Path to ChromaDB database directory
            collection_name: Name of the ChromaDB collection
            embedding_model: Sentence transformer model for embeddings
            max_results: Maximum number of search results to return
            similarity_threshold: Minimum similarity score for results
        """
        self.trail = BreadcrumbTrail("ChromaDBRAGSystem")
        self.trail.light(200, {"action": "system_initialization_start"})
        
        self.db_path = Path(db_path)
        self.collection_name = collection_name
        self.embedding_model_name = embedding_model
        self.max_results = max_results
        self.similarity_threshold = similarity_threshold
        
        # Initialize components
        self.client = None
        self.collection = None
        self.embedding_model = None
        self.embedding_cache = {}
        self._lock = threading.Lock()
        
        # Coaching templates
        self.coaching_templates = {
            "sales_objection": """
Based on the conversation context: "{transcription}"

Relevant knowledge:
{knowledge_context}

Provide a brief, actionable coaching suggestion for handling this sales objection:
""",
            "sales_technique": """
Current sales conversation: "{transcription}"

Best practices from knowledge base:
{knowledge_context}

Suggest the next best sales technique or approach:
""",
            "real_time_feedback": """
Live conversation analysis: "{transcription}"

Coaching insights:
{knowledge_context}

Provide immediate feedback and next step recommendation:
"""
        }
        
        try:
            self._initialize_chromadb()
            self._load_embedding_model()
            self.trail.light(201, {"status": "system_initialization_complete"})
        except Exception as e:
            self.trail.fail(200, e, traceback.format_exc())
            raise
    
    def _initialize_chromadb(self) -> None:
        """Initialize ChromaDB client and collection."""
        self.trail.light(202, {"action": "chromadb_client_init"})
        
        try:
            # Create database directory if it doesn't exist
            self.db_path.mkdir(parents=True, exist_ok=True)
            
            # Initialize ChromaDB client with persistent storage
            self.client = chromadb.PersistentClient(
                path=str(self.db_path),
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            self.trail.light(203, {"client_type": "persistent", "db_path": str(self.db_path)})
            
            # Create or get collection
            self.trail.light(204, {"action": "collection_access", "name": self.collection_name})
            
            try:
                self.collection = self.client.get_collection(name=self.collection_name)
                self.trail.light(205, {"status": "collection_found", "count": self.collection.count()})
            except Exception as e:
                # Collection doesn't exist, create it (catch all exceptions, not just ValueError)
                self.trail.light(204, {"info": f"Collection not found, creating: {e}"})
                self.collection = self.client.create_collection(
                    name=self.collection_name,
                    metadata={"description": "Voice coaching knowledge base"}
                )
                self.trail.light(205, {"status": "collection_created", "name": self.collection_name})
            
            self.trail.light(206, {"chromadb_status": "ready", "collection_count": self.collection.count()})
            
        except Exception as e:
            self.trail.fail(202, e, traceback.format_exc())
            raise
    
    def _load_embedding_model(self) -> None:
        """Load sentence transformer model for embeddings."""
        self.trail.light(207, {"action": "embedding_model_load", "model": self.embedding_model_name})
        
        start_time = time.time()
        try:
            self.embedding_model = SentenceTransformer(self.embedding_model_name)
            
            load_duration = (time.time() - start_time) * 1000
            self.trail.performance_checkpoint(502, "embedding_model_load", load_duration, {
                "model": self.embedding_model_name,
                "device": str(self.embedding_model.device)
            })
            
            self.trail.light(208, {
                "status": "embedding_model_ready",
                "model": self.embedding_model_name,
                "device": str(self.embedding_model.device),
                "load_time_ms": load_duration
            })
            
        except Exception as e:
            self.trail.fail(207, e, traceback.format_exc())
            raise
    
    def add_knowledge_documents(self, documents: List[Dict[str, Any]]) -> None:
        """
        Add knowledge documents to the vector database.
        
        Args:
            documents: List of documents with 'content', 'metadata', and 'id' fields
        """
        self.trail.light(210, {"action": "document_batch_add", "count": len(documents)})
        
        if not documents:
            self.trail.light(211, {"status": "no_documents_to_add"})
            return
        
        try:
            # Prepare documents for embedding
            contents = []
            metadatas = []
            ids = []
            
            for doc in documents:
                contents.append(doc["content"])
                metadatas.append(doc.get("metadata", {}))
                ids.append(doc.get("id", self._generate_doc_id(doc["content"])))
            
            self.trail.light(212, {"action": "embedding_generation_start", "documents": len(contents)})
            
            # Generate embeddings
            start_time = time.time()
            embeddings = self._generate_embeddings(contents)
            embedding_duration = (time.time() - start_time) * 1000
            
            self.trail.performance_checkpoint(511, "embedding_generation", embedding_duration, {
                "batch_size": len(contents),
                "avg_doc_length": sum(len(c) for c in contents) / len(contents)
            })
            
            # Add to ChromaDB collection
            self.trail.light(230, {"action": "chromadb_storage_start"})
            start_time = time.time()
            
            self.collection.add(
                embeddings=embeddings,
                documents=contents,
                metadatas=metadatas,
                ids=ids
            )
            
            storage_duration = (time.time() - start_time) * 1000
            self.trail.performance_checkpoint(512, "document_storage", storage_duration, {
                "documents_stored": len(contents),
                "total_collection_size": self.collection.count()
            })
            
            self.trail.light(231, {
                "status": "documents_added",
                "count": len(documents),
                "total_collection_size": self.collection.count()
            })
            
        except Exception as e:
            self.trail.fail(210, e, traceback.format_exc())
            raise
    
    def semantic_search(self, query: str, max_results: Optional[int] = None) -> List[KnowledgeSnippet]:
        """
        Perform semantic search for relevant knowledge snippets.
        
        Args:
            query: Search query string
            max_results: Maximum number of results (defaults to instance max_results)
            
        Returns:
            List of KnowledgeSnippet objects with relevant content
        """
        self.trail.light(220, {"action": "semantic_search_start", "query": query[:100]})
        
        if max_results is None:
            max_results = self.max_results
        
        try:
            # Generate query embedding
            start_time = time.time()
            query_embedding = self._generate_embeddings([query])[0]
            embedding_duration = (time.time() - start_time) * 1000
            
            self.trail.performance_checkpoint(511, "query_embedding", embedding_duration, {
                "query_length": len(query)
            })
            
            # Perform vector search
            self.trail.light(222, {"action": "vector_search_execute"})
            start_time = time.time()
            
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=max_results,
                include=["documents", "metadatas", "distances"]
            )
            
            search_duration = (time.time() - start_time) * 1000
            self.trail.performance_checkpoint(510, "semantic_search", search_duration, {
                "results_found": len(results["documents"][0]) if results["documents"] else 0,
                "query_length": len(query)
            })
            
            # Process results into KnowledgeSnippet objects
            snippets = []
            if results["documents"] and results["documents"][0]:
                for i, (doc, metadata, distance) in enumerate(zip(
                    results["documents"][0],
                    results["metadatas"][0],
                    results["distances"][0]
                )):
                    # Convert distance to similarity score (ChromaDB uses cosine distance)
                    similarity_score = 1 - distance
                    
                    if similarity_score >= self.similarity_threshold:
                        snippet = KnowledgeSnippet(
                            content=doc,
                            metadata=metadata or {},
                            similarity_score=similarity_score,
                            source=metadata.get("source", "unknown") if metadata else "unknown",
                            coaching_context=metadata.get("coaching_context", "general") if metadata else "general"
                        )
                        snippets.append(snippet)
            
            self.trail.light(223, {
                "status": "semantic_search_complete",
                "query": query[:100],
                "results_found": len(results["documents"][0]) if results["documents"] else 0,
                "filtered_results": len(snippets),
                "top_similarity": snippets[0].similarity_score if snippets else 0
            })
            
            # Log performance warning if search was slow
            if search_duration > 100:
                self.trail.light(560, {
                    "warning": f"Semantic search exceeded 100ms target: {search_duration:.1f}ms",
                    "query": query[:100]
                })
            
            return snippets
            
        except Exception as e:
            self.trail.fail(220, e, traceback.format_exc())
            raise
    
    def generate_coaching_prompt(self, 
                                transcription: str, 
                                prompt_type: str = "real_time_feedback",
                                personalization_data: Optional[Dict[str, Any]] = None) -> CoachingPrompt:
        """
        Generate a coaching prompt based on voice transcription and relevant knowledge.
        
        Args:
            transcription: Voice transcription text
            prompt_type: Type of coaching prompt to generate
            personalization_data: Additional personalization context
            
        Returns:
            CoachingPrompt object with generated prompt and context
        """
        self.trail.light(400, {
            "action": "coaching_prompt_generation_start",
            "prompt_type": prompt_type,
            "transcription_length": len(transcription)
        })
        
        try:
            # Retrieve relevant knowledge
            self.trail.light(300, {"action": "knowledge_retrieval_start"})
            snippets = self.semantic_search(transcription)
            self.trail.light(301, {
                "status": "knowledge_retrieved",
                "snippets_found": len(snippets)
            })
            
            # Format knowledge context
            self.trail.light(402, {"action": "context_formatting_start"})
            knowledge_context = self._format_knowledge_context(snippets)
            
            # Generate prompt using template
            self.trail.light(410, {"action": "prompt_template_processing"})
            
            if prompt_type not in self.coaching_templates:
                prompt_type = "real_time_feedback"  # Default fallback
            
            template = self.coaching_templates[prompt_type]
            prompt = template.format(
                transcription=transcription,
                knowledge_context=knowledge_context
            )
            
            # Apply personalization if provided
            if personalization_data:
                self.trail.light(412, {"action": "prompt_personalization"})
                prompt = self._personalize_prompt(prompt, personalization_data)
                self.trail.light(413, {"status": "personalization_applied"})
            
            coaching_prompt = CoachingPrompt(
                prompt=prompt,
                context_snippets=snippets,
                personalization_data=personalization_data or {},
                prompt_type=prompt_type,
                generated_at=time.time()
            )
            
            self.trail.light(401, {
                "status": "coaching_prompt_complete",
                "prompt_type": prompt_type,
                "prompt_length": len(prompt),
                "context_snippets": len(snippets),
                "personalized": bool(personalization_data)
            })
            
            return coaching_prompt
            
        except Exception as e:
            self.trail.fail(400, e, traceback.format_exc())
            raise
    
    def _generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts with caching."""
        embeddings = []
        cache_hits = 0
        cache_misses = 0
        
        for text in texts:
            # Check cache first
            text_hash = hashlib.md5(text.encode()).hexdigest()
            
            with self._lock:
                if text_hash in self.embedding_cache:
                    embeddings.append(self.embedding_cache[text_hash])
                    cache_hits += 1
                    self.trail.light(251, {"cache_hit": text_hash[:8]})
                else:
                    # Generate new embedding
                    embedding = self.embedding_model.encode([text])[0].tolist()
                    self.embedding_cache[text_hash] = embedding
                    embeddings.append(embedding)
                    cache_misses += 1
                    self.trail.light(252, {"cache_miss": text_hash[:8]})
        
        # Log cache performance
        if cache_hits + cache_misses > 0:
            cache_hit_rate = cache_hits / (cache_hits + cache_misses)
            self.trail.performance_checkpoint(530, "embedding_cache_performance", 0, {
                "cache_hits": cache_hits,
                "cache_misses": cache_misses,
                "hit_rate": cache_hit_rate
            })
        
        return embeddings
    
    def _format_knowledge_context(self, snippets: List[KnowledgeSnippet]) -> str:
        """Format knowledge snippets into context string."""
        if not snippets:
            return "No relevant knowledge found."
        
        context_parts = []
        for i, snippet in enumerate(snippets[:3], 1):  # Limit to top 3 snippets
            context_parts.append(f"{i}. {snippet.content} (Similarity: {snippet.similarity_score:.2f})")
        
        return "\n".join(context_parts)
    
    def _personalize_prompt(self, prompt: str, personalization_data: Dict[str, Any]) -> str:
        """Apply personalization to the coaching prompt."""
        # Simple personalization based on user context
        if "user_name" in personalization_data:
            prompt = f"For {personalization_data['user_name']}: " + prompt
        
        if "experience_level" in personalization_data:
            level = personalization_data["experience_level"]
            if level == "beginner":
                prompt += "\n\nNote: Provide basic, step-by-step guidance."
            elif level == "advanced":
                prompt += "\n\nNote: Focus on advanced techniques and nuanced strategies."
        
        return prompt
    
    def _generate_doc_id(self, content: str) -> str:
        """Generate a unique document ID based on content hash."""
        return hashlib.md5(content.encode()).hexdigest()[:16]
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get system health metrics and status."""
        self.trail.light(560, {"action": "system_health_check"})
        
        try:
            health_data = {
                "chromadb_status": "connected" if self.client else "disconnected",
                "collection_size": self.collection.count() if self.collection else 0,
                "embedding_model_loaded": self.embedding_model is not None,
                "cache_size": len(self.embedding_cache),
                "last_check": time.time()
            }
            
            # Get performance metrics from breadcrumb trail
            perf_summary = self._get_performance_summary()
            health_data["performance_metrics"] = perf_summary
            
            self.trail.light(561, {"status": "health_check_complete", "metrics": health_data})
            
            return health_data
            
        except Exception as e:
            self.trail.fail(560, e, traceback.format_exc())
            return {"status": "error", "error": str(e)}
    
    def _get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary from breadcrumb trail."""
        from breadcrumb_system import debug
        return debug.get_performance_summary()
    
    def reset_system(self) -> None:
        """Reset the RAG system and clear all data."""
        self.trail.light(250, {"action": "system_reset_start"})
        
        try:
            if self.collection:
                self.client.delete_collection(self.collection_name)
            
            # Clear cache
            with self._lock:
                self.embedding_cache.clear()
            
            # Reinitialize
            self._initialize_chromadb()
            
            self.trail.light(251, {"status": "system_reset_complete"})
            
        except Exception as e:
            self.trail.fail(250, e, traceback.format_exc())
            raise


# Example coaching knowledge base for testing
SAMPLE_COACHING_KNOWLEDGE = [
    {
        "content": "When a prospect says 'I need to think about it', this often means they have unaddressed objections. Ask: 'What specific aspect would you like to think about?' to uncover the real concern.",
        "metadata": {
            "source": "sales_objection_handling",
            "coaching_context": "objection_handling",
            "technique": "clarifying_questions"
        },
        "id": "objection_think_about_it"
    },
    {
        "content": "Use the BANT qualification framework: Budget, Authority, Need, Timeline. Ensure all four criteria are met before moving to closing.",
        "metadata": {
            "source": "sales_qualification",
            "coaching_context": "lead_qualification",
            "technique": "bant_framework"
        },
        "id": "bant_qualification"
    },
    {
        "content": "Active listening involves reflecting back what you hear: 'So what I'm hearing is...' This builds rapport and ensures understanding.",
        "metadata": {
            "source": "communication_skills",
            "coaching_context": "relationship_building",
            "technique": "active_listening"
        },
        "id": "active_listening_technique"
    },
    {
        "content": "Price objections often indicate value wasn't clearly communicated. Respond with: 'Help me understand what aspect of the value proposition wasn't clear.'",
        "metadata": {
            "source": "sales_objection_handling",
            "coaching_context": "price_objections",
            "technique": "value_clarification"
        },
        "id": "price_objection_response"
    },
    {
        "content": "Use the assumptive close when buying signals are strong: 'When would you like to get started?' instead of 'Would you like to proceed?'",
        "metadata": {
            "source": "closing_techniques",
            "coaching_context": "sales_closing",
            "technique": "assumptive_close"
        },
        "id": "assumptive_closing"
    }
]


# Integration with Tauri backend
class TauriRAGIntegration:
    """Integration layer for Tauri backend real-time coaching."""
    
    def __init__(self, rag_system: ChromaDBRAGSystem):
        self.rag_system = rag_system
        self.trail = BreadcrumbTrail("TauriRAGIntegration")
    
    def process_real_time_transcription(self, transcription: str) -> Dict[str, Any]:
        """Process real-time transcription and return coaching guidance."""
        self.trail.light(540, {"action": "real_time_processing_start"})
        
        try:
            start_time = time.time()
            
            # Generate coaching prompt
            coaching_prompt = self.rag_system.generate_coaching_prompt(
                transcription=transcription,
                prompt_type="real_time_feedback"
            )
            
            processing_duration = (time.time() - start_time) * 1000
            self.trail.performance_checkpoint(512, "real_time_coaching", processing_duration, {
                "transcription_length": len(transcription),
                "context_snippets": len(coaching_prompt.context_snippets)
            })
            
            response = {
                "coaching_prompt": coaching_prompt.prompt,
                "confidence_score": coaching_prompt.context_snippets[0].similarity_score if coaching_prompt.context_snippets else 0,
                "relevant_techniques": [snippet.metadata.get("technique", "unknown") for snippet in coaching_prompt.context_snippets],
                "processing_time_ms": processing_duration,
                "timestamp": time.time()
            }
            
            self.trail.light(541, {"status": "real_time_processing_complete", "response_size": len(response["coaching_prompt"])})
            
            return response
            
        except Exception as e:
            self.trail.fail(540, e, traceback.format_exc())
            return {"error": str(e), "timestamp": time.time()}


# Example usage and testing
if __name__ == "__main__":
    print("🔵 Initializing ChromaDB RAG System with LED Debugging...")
    
    try:
        # Initialize RAG system
        rag_system = ChromaDBRAGSystem(
            db_path="./test_chroma_db",
            collection_name="test_coaching_knowledge"
        )
        
        print("🟢 Loading sample coaching knowledge...")
        rag_system.add_knowledge_documents(SAMPLE_COACHING_KNOWLEDGE)
        
        print("🟡 Testing semantic search...")
        query = "How should I handle price objections?"
        snippets = rag_system.semantic_search(query)
        
        print(f"Found {len(snippets)} relevant snippets:")
        for snippet in snippets:
            print(f"  - {snippet.content[:100]}... (Score: {snippet.similarity_score:.3f})")
        
        print("🟣 Testing coaching prompt generation...")
        transcription = "The customer just said the price is too high and they need to think about it."
        coaching_prompt = rag_system.generate_coaching_prompt(transcription)
        
        print(f"Generated coaching prompt:\n{coaching_prompt.prompt}")
        
        print("⚡ Testing Tauri integration...")
        tauri_integration = TauriRAGIntegration(rag_system)
        response = tauri_integration.process_real_time_transcription(transcription)
        
        print(f"Real-time coaching response: {response}")
        
        print("📊 System health check...")
        health = rag_system.get_system_health()
        print(f"System health: {health}")
        
        print("🔍 Performance summary...")
        from breadcrumb_system import debug
        performance = debug.get_performance_summary()
        print("Performance metrics:")
        for operation, stats in performance.items():
            print(f"  {operation}: {stats.get('avg_duration', 0):.1f}ms avg ({stats.get('count', 0)} samples)")
        
        print("✅ ChromaDB RAG System test completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        traceback.print_exc()