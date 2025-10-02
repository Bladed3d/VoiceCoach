"""
RAG (Retrieval-Augmented Generation) System for VoiceCoach
Combines vector database retrieval with contextual knowledge formatting
"""

import logging
import time
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from .chroma_client import vector_db
from .document_processor import document_processor


class CoachingContext(Enum):
    """Context types for coaching prompts."""
    OBJECTION_HANDLING = "objection_handling"
    PRODUCT_DEMO = "product_demo"
    PRICING_DISCUSSION = "pricing_discussion"
    CLOSING = "closing"
    DISCOVERY = "discovery"
    FOLLOW_UP = "follow_up"
    GENERAL = "general"


@dataclass
class KnowledgeSnippet:
    """Structured knowledge snippet for coaching prompts."""
    content: str
    source: str
    relevance_score: float
    metadata: Dict[str, Any]
    snippet_type: str
    
    def format_for_coaching(self) -> str:
        """Format snippet for display in coaching interface."""
        return f"💡 {self.content[:200]}..." if len(self.content) > 200 else f"💡 {self.content}"


class RAGSystem:
    """
    High-performance RAG system for VoiceCoach sales coaching.
    
    Features:
    - <100ms semantic search queries
    - Context-aware knowledge retrieval
    - Sales methodology integration
    - Real-time coaching prompt generation
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.vector_db = vector_db
        
        # Performance tracking
        self.retrieval_times = []
        
        # Default collections for sales materials
        self.collections = {
            "sales_materials": "General sales materials and scripts",
            "objection_handlers": "Objection handling responses and strategies", 
            "product_info": "Product features, benefits, and specifications",
            "case_studies": "Customer success stories and testimonials",
            "pricing_guides": "Pricing strategies and negotiation tactics",
            "methodologies": "Sales processes and proven frameworks"
        }
        
        # Initialize collections if they don't exist
        self._ensure_collections_exist()
        
        self.logger.info("RAG System initialized with ChromaDB backend")
    
    def ingest_documents(
        self, 
        directory_path: str,
        collection_mappings: Optional[Dict[str, str]] = None
    ) -> Dict[str, int]:
        """
        Ingest documents from directory into appropriate collections.
        
        Args:
            directory_path: Path to directory containing sales materials
            collection_mappings: Map file patterns to collections
                                 e.g., {"*objection*": "objection_handlers"}
        
        Returns:
            Dictionary with document counts per collection
        """
        start_time = time.time()
        
        # Process all documents in directory
        all_chunks = document_processor.process_directory(directory_path)
        
        if not all_chunks:
            self.logger.warning(f"No documents processed from {directory_path}")
            return {}
        
        # Default collection mapping based on content analysis
        if collection_mappings is None:
            collection_mappings = self._auto_detect_collections()
        
        # Organize chunks by collection
        collection_chunks = {name: [] for name in self.collections.keys()}
        
        for chunk in all_chunks:
            target_collection = self._determine_collection(chunk, collection_mappings)
            collection_chunks[target_collection].append(chunk)
        
        # Ingest into vector database
        ingestion_stats = {}
        
        for collection_name, chunks in collection_chunks.items():
            if chunks:
                documents = [chunk["text"] for chunk in chunks]
                metadatas = [chunk["metadata"] for chunk in chunks]
                
                self.vector_db.add_documents(
                    collection_name=collection_name,
                    documents=documents,
                    metadatas=metadatas
                )
                
                ingestion_stats[collection_name] = len(chunks)
        
        total_time = time.time() - start_time
        total_chunks = sum(ingestion_stats.values())
        
        self.logger.info(
            f"Ingested {total_chunks} chunks in {total_time:.2f}s "
            f"({total_chunks/total_time:.0f} chunks/sec)"
        )
        
        return ingestion_stats
    
    def retrieve_knowledge(
        self,
        query: str,
        context: CoachingContext = CoachingContext.GENERAL,
        max_snippets: int = 5,
        relevance_threshold: float = 0.7
    ) -> List[KnowledgeSnippet]:
        """
        Retrieve relevant knowledge snippets for coaching context.
        
        Args:
            query: User query or conversation context
            context: Type of coaching situation
            max_snippets: Maximum number of snippets to return
            relevance_threshold: Minimum relevance score (0-1)
        
        Returns:
            List of relevant knowledge snippets
        """
        start_time = time.time()
        
        # Determine target collections based on context
        target_collections = self._get_context_collections(context)
        
        all_snippets = []
        
        # Search across relevant collections
        for collection_name in target_collections:
            try:
                # Apply context-specific metadata filtering
                metadata_filter = self._get_context_filter(context)
                
                results = self.vector_db.search_knowledge(
                    collection_name=collection_name,
                    query=query,
                    n_results=max_snippets,
                    metadata_filter=metadata_filter
                )
                
                # Convert results to knowledge snippets
                for i, doc in enumerate(results.get("documents", [])):
                    if i < len(results.get("distances", [])):
                        # Convert distance to relevance score (0-1)
                        distance = results["distances"][i]
                        relevance = max(0, 1 - distance)
                        
                        if relevance >= relevance_threshold:
                            metadata = results["metadatas"][i] if i < len(results.get("metadatas", [])) else {}
                            
                            snippet = KnowledgeSnippet(
                                content=doc,
                                source=metadata.get("filename", "Unknown"),
                                relevance_score=relevance,
                                metadata=metadata,
                                snippet_type=context.value
                            )
                            all_snippets.append(snippet)
                            
            except Exception as e:
                self.logger.error(f"Failed to search collection '{collection_name}': {e}")
        
        # Sort by relevance and limit results
        all_snippets.sort(key=lambda x: x.relevance_score, reverse=True)
        top_snippets = all_snippets[:max_snippets]
        
        retrieval_time = (time.time() - start_time) * 1000
        self.retrieval_times.append(retrieval_time)
        
        self.logger.debug(
            f"Retrieved {len(top_snippets)} snippets in {retrieval_time:.1f}ms "
            f"for context: {context.value}"
        )
        
        return top_snippets
    
    def generate_coaching_prompts(
        self,
        conversation_snippet: str,
        context: CoachingContext = CoachingContext.GENERAL
    ) -> Dict[str, Any]:
        """
        Generate contextual coaching prompts based on conversation analysis.
        
        Args:
            conversation_snippet: Recent conversation context
            context: Type of coaching situation
        
        Returns:
            Structured coaching prompts with knowledge snippets
        """
        # Retrieve relevant knowledge
        knowledge_snippets = self.retrieve_knowledge(
            query=conversation_snippet,
            context=context,
            max_snippets=3
        )
        
        # Generate coaching prompts based on knowledge and context
        prompts = {
            "primary_prompt": self._generate_primary_prompt(conversation_snippet, knowledge_snippets, context),
            "knowledge_snippets": [snippet.format_for_coaching() for snippet in knowledge_snippets],
            "suggested_responses": self._generate_response_suggestions(knowledge_snippets, context),
            "next_best_actions": self._generate_next_actions(conversation_snippet, context),
            "context": context.value,
            "confidence_score": self._calculate_confidence(knowledge_snippets),
            "retrieval_time_ms": self.retrieval_times[-1] if self.retrieval_times else 0
        }
        
        return prompts
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get comprehensive system statistics."""
        stats = {
            "collections": {},
            "performance": {
                "avg_retrieval_time_ms": sum(self.retrieval_times) / len(self.retrieval_times) if self.retrieval_times else 0,
                "total_retrievals": len(self.retrieval_times),
                "performance_target": "< 100ms",
                "performance_status": "✅ OPTIMAL" if (sum(self.retrieval_times) / len(self.retrieval_times) if self.retrieval_times else 0) < 100 else "⚠️ NEEDS OPTIMIZATION"
            }
        }
        
        # Get stats for each collection
        for collection_name in self.collections.keys():
            try:
                collection_stats = self.vector_db.get_collection_stats(collection_name)
                stats["collections"][collection_name] = collection_stats
            except Exception as e:
                stats["collections"][collection_name] = {"error": str(e)}
        
        return stats
    
    def _ensure_collections_exist(self):
        """Ensure all required collections exist."""
        for name, description in self.collections.items():
            try:
                self.vector_db.create_collection(name, description)
            except Exception as e:
                self.logger.error(f"Failed to ensure collection '{name}' exists: {e}")
    
    def _auto_detect_collections(self) -> Dict[str, str]:
        """Auto-detect collection mappings based on filename patterns."""
        return {
            "*objection*": "objection_handlers",
            "*price*": "pricing_guides",
            "*product*": "product_info",
            "*case*": "case_studies",
            "*method*": "methodologies",
            "*process*": "methodologies"
        }
    
    def _determine_collection(self, chunk: Dict[str, Any], mappings: Dict[str, str]) -> str:
        """Determine target collection for a document chunk."""
        filename = chunk["metadata"].get("filename", "").lower()
        content_type = chunk["metadata"].get("content_type", "general")
        
        # Check filename patterns first
        for pattern, collection in mappings.items():
            pattern_clean = pattern.replace("*", "")
            if pattern_clean in filename:
                return collection
        
        # Check content type
        content_type_mapping = {
            "objection_handler": "objection_handlers",
            "pricing": "pricing_guides", 
            "case_study": "case_studies",
            "methodology": "methodologies"
        }
        
        if content_type in content_type_mapping:
            return content_type_mapping[content_type]
        
        # Default to general sales materials
        return "sales_materials"
    
    def _get_context_collections(self, context: CoachingContext) -> List[str]:
        """Get relevant collections for coaching context."""
        context_mappings = {
            CoachingContext.OBJECTION_HANDLING: ["objection_handlers", "case_studies"],
            CoachingContext.PRICING_DISCUSSION: ["pricing_guides", "objection_handlers"],
            CoachingContext.PRODUCT_DEMO: ["product_info", "case_studies"],
            CoachingContext.CLOSING: ["sales_materials", "case_studies"],
            CoachingContext.DISCOVERY: ["methodologies", "sales_materials"],
            CoachingContext.FOLLOW_UP: ["sales_materials", "case_studies"],
            CoachingContext.GENERAL: list(self.collections.keys())
        }
        
        return context_mappings.get(context, ["sales_materials"])
    
    def _get_context_filter(self, context: CoachingContext) -> Optional[Dict[str, Any]]:
        """Get metadata filter for coaching context."""
        context_filters = {
            CoachingContext.OBJECTION_HANDLING: {"content_type": "objection_handler"},
            CoachingContext.PRICING_DISCUSSION: None,  # No specific filter
            # Add more context-specific filters as needed
        }
        
        return context_filters.get(context)
    
    def _generate_primary_prompt(
        self, 
        conversation: str,
        knowledge_snippets: List[KnowledgeSnippet],
        context: CoachingContext
    ) -> str:
        """Generate primary coaching prompt."""
        if not knowledge_snippets:
            return f"Continue the conversation naturally in this {context.value} context."
        
        best_snippet = knowledge_snippets[0]
        
        prompt_templates = {
            CoachingContext.OBJECTION_HANDLING: f"Address this concern using: {best_snippet.content[:100]}...",
            CoachingContext.PRICING_DISCUSSION: f"Frame pricing value with: {best_snippet.content[:100]}...",
            CoachingContext.PRODUCT_DEMO: f"Highlight key features: {best_snippet.content[:100]}...",
            CoachingContext.CLOSING: f"Move to close using: {best_snippet.content[:100]}...",
            CoachingContext.GENERAL: f"Consider this insight: {best_snippet.content[:100]}..."
        }
        
        return prompt_templates.get(context, prompt_templates[CoachingContext.GENERAL])
    
    def _generate_response_suggestions(
        self,
        knowledge_snippets: List[KnowledgeSnippet],
        context: CoachingContext
    ) -> List[str]:
        """Generate suggested responses based on knowledge."""
        suggestions = []
        
        for snippet in knowledge_snippets[:2]:  # Top 2 snippets
            # Extract actionable content
            content = snippet.content
            if len(content) > 150:
                content = content[:147] + "..."
            
            suggestions.append(f"💬 {content}")
        
        return suggestions
    
    def _generate_next_actions(self, conversation: str, context: CoachingContext) -> List[str]:
        """Generate next best actions based on context."""
        action_templates = {
            CoachingContext.OBJECTION_HANDLING: [
                "Ask clarifying questions about their concern",
                "Provide social proof or case study",
                "Offer alternative solution"
            ],
            CoachingContext.PRICING_DISCUSSION: [
                "Emphasize ROI and value proposition", 
                "Discuss flexible payment options",
                "Present comparison with alternatives"
            ],
            CoachingContext.PRODUCT_DEMO: [
                "Ask which feature interests them most",
                "Show relevant use case",
                "Get agreement on value"
            ],
            CoachingContext.CLOSING: [
                "Ask for the sale directly",
                "Address any final concerns",
                "Discuss next steps"
            ],
            CoachingContext.GENERAL: [
                "Ask open-ended discovery questions",
                "Listen actively for buying signals", 
                "Build rapport and trust"
            ]
        }
        
        return action_templates.get(context, action_templates[CoachingContext.GENERAL])
    
    def _calculate_confidence(self, knowledge_snippets: List[KnowledgeSnippet]) -> float:
        """Calculate confidence score for coaching prompts."""
        if not knowledge_snippets:
            return 0.3
        
        avg_relevance = sum(s.relevance_score for s in knowledge_snippets) / len(knowledge_snippets)
        snippet_count_factor = min(len(knowledge_snippets) / 3, 1.0)  # Max confidence with 3+ snippets
        
        confidence = avg_relevance * 0.7 + snippet_count_factor * 0.3
        return round(confidence, 2)


# Global instance for VoiceCoach application
rag_system = RAGSystem()