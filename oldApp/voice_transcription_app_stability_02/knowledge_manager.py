"""
Knowledge Base Manager with LED Debugging Infrastructure

This module manages the knowledge base for the voice coaching RAG system, including:
- Document chunking and preprocessing
- Sales-context classification and metadata extraction
- Knowledge base updates and maintenance
- Performance monitoring and caching
- Integration with ChromaDB RAG system

LED Ranges:
- 300-399: Knowledge Processing Operations
- 500-599: Performance and Quality Monitoring
"""

import os
import re
import json
import time
import hashlib
import traceback
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
import logging

try:
    import nltk
    from nltk.tokenize import sent_tokenize, word_tokenize
    from nltk.corpus import stopwords
    
    # Download required NLTK data
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt')
    
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords')
        
except ImportError:
    print("NLTK not installed. Install with: pip install nltk")
    # Provide fallback implementations
    def sent_tokenize(text):
        return re.split(r'[.!?]+', text)
    
    def word_tokenize(text):
        return re.findall(r'\b\w+\b', text.lower())

from breadcrumb_system import BreadcrumbTrail


@dataclass
class DocumentChunk:
    """Processed document chunk with metadata"""
    content: str
    chunk_id: str
    source_document: str
    chunk_index: int
    metadata: Dict[str, Any]
    coaching_context: str
    sales_category: str
    quality_score: float


@dataclass
class ProcessingStats:
    """Statistics from document processing"""
    total_documents: int
    total_chunks: int
    processing_time_ms: float
    avg_chunk_size: int
    quality_scores: List[float]
    sales_categories: Dict[str, int]


class KnowledgeManager:
    """
    Manages knowledge base documents with chunking, classification, and quality assessment.
    Provides LED debugging for all knowledge processing operations.
    """
    
    def __init__(self, 
                 chunk_size: int = 512,
                 chunk_overlap: int = 50,
                 min_chunk_size: int = 100,
                 quality_threshold: float = 0.6):
        """
        Initialize the Knowledge Manager.
        
        Args:
            chunk_size: Target size for document chunks (in characters)
            chunk_overlap: Overlap between chunks (in characters)
            min_chunk_size: Minimum chunk size to keep
            quality_threshold: Minimum quality score for chunks
        """
        self.trail = BreadcrumbTrail("KnowledgeManager")
        self.trail.light(300, {"action": "knowledge_manager_init"})
        
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.min_chunk_size = min_chunk_size
        self.quality_threshold = quality_threshold
        
        # Sales context patterns for classification
        self.sales_patterns = {
            "objection_handling": [
                r"objection", r"concern", r"hesitant", r"worried", r"doubt",
                r"price.*high", r"too expensive", r"can't afford", r"budget",
                r"think about it", r"need to consider", r"discuss.*team"
            ],
            "closing_techniques": [
                r"close", r"closing", r"decision", r"commitment", r"sign",
                r"contract", r"agreement", r"proceed", r"move forward",
                r"assumptive", r"trial close", r"urgency"
            ],
            "relationship_building": [
                r"rapport", r"trust", r"relationship", r"connection",
                r"listening", r"empathy", r"understand", r"common ground",
                r"small talk", r"personal", r"follow up"
            ],
            "qualification": [
                r"qualify", r"qualification", r"bant", r"budget", r"authority",
                r"need", r"timeline", r"decision maker", r"stakeholder",
                r"requirements", r"criteria", r"evaluation"
            ],
            "presentation": [
                r"presentation", r"demo", r"feature", r"benefit", r"value",
                r"roi", r"return on investment", r"advantage", r"solution",
                r"capability", r"functionality"
            ],
            "negotiation": [
                r"negotiat", r"compromise", r"concession", r"terms",
                r"pricing", r"discount", r"package", r"deal",
                r"agreement", r"counter", r"proposal"
            ]
        }
        
        # Quality indicators
        self.quality_indicators = {
            "positive": [
                r"technique", r"strategy", r"approach", r"method",
                r"best practice", r"effective", r"successful", r"proven",
                r"example", r"case study", r"tip", r"advice"
            ],
            "negative": [
                r"avoid", r"don't", r"never", r"mistake", r"error",
                r"wrong", r"bad", r"ineffective", r"poor"
            ]
        }
        
        self.trail.light(301, {
            "status": "knowledge_manager_ready",
            "chunk_size": chunk_size,
            "sales_categories": len(self.sales_patterns),
            "quality_indicators": sum(len(v) for v in self.quality_indicators.values())
        })
    
    def process_documents(self, documents: List[Dict[str, Any]]) -> Tuple[List[DocumentChunk], ProcessingStats]:
        """
        Process a batch of documents into classified chunks.
        
        Args:
            documents: List of documents with 'content', 'title', and optional metadata
            
        Returns:
            Tuple of (processed_chunks, processing_statistics)
        """
        self.trail.light(302, {
            "action": "document_processing_start",
            "document_count": len(documents)
        })
        
        start_time = time.time()
        all_chunks = []
        stats = ProcessingStats(
            total_documents=len(documents),
            total_chunks=0,
            processing_time_ms=0,
            avg_chunk_size=0,
            quality_scores=[],
            sales_categories={}
        )
        
        try:
            for doc_idx, document in enumerate(documents):
                self.trail.light(310, {
                    "action": "document_processing",
                    "doc_index": doc_idx,
                    "title": document.get("title", "untitled")[:50]
                })
                
                # Extract content and metadata
                content = document.get("content", "")
                title = document.get("title", f"document_{doc_idx}")
                source_metadata = document.get("metadata", {})
                
                if len(content) < self.min_chunk_size:
                    self.trail.light(311, {
                        "status": "document_skipped_too_short",
                        "length": len(content)
                    })
                    continue
                
                # Chunk the document
                self.trail.light(312, {"action": "document_chunking_start"})
                chunks = self._chunk_document(content, title)
                
                # Process each chunk
                for chunk_idx, chunk_content in enumerate(chunks):
                    chunk_start_time = time.time()
                    
                    # Generate chunk ID
                    chunk_id = self._generate_chunk_id(title, chunk_idx, chunk_content)
                    
                    # Classify sales context
                    self.trail.light(320, {"action": "sales_classification"})
                    sales_category = self._classify_sales_context(chunk_content)
                    coaching_context = self._determine_coaching_context(chunk_content, sales_category)
                    
                    # Assess quality
                    self.trail.light(322, {"action": "quality_assessment"})
                    quality_score = self._assess_chunk_quality(chunk_content)
                    
                    # Skip low-quality chunks
                    if quality_score < self.quality_threshold:
                        self.trail.light(323, {
                            "status": "chunk_rejected_low_quality",
                            "quality_score": quality_score,
                            "threshold": self.quality_threshold
                        })
                        continue
                    
                    # Create processed chunk
                    chunk_metadata = {
                        **source_metadata,
                        "chunk_index": chunk_idx,
                        "total_chunks": len(chunks),
                        "quality_score": quality_score,
                        "processing_timestamp": time.time(),
                        "source_document_title": title
                    }
                    
                    processed_chunk = DocumentChunk(
                        content=chunk_content,
                        chunk_id=chunk_id,
                        source_document=title,
                        chunk_index=chunk_idx,
                        metadata=chunk_metadata,
                        coaching_context=coaching_context,
                        sales_category=sales_category,
                        quality_score=quality_score
                    )
                    
                    all_chunks.append(processed_chunk)
                    
                    # Update statistics
                    stats.quality_scores.append(quality_score)
                    stats.sales_categories[sales_category] = stats.sales_categories.get(sales_category, 0) + 1
                    
                    chunk_duration = (time.time() - chunk_start_time) * 1000
                    self.trail.performance_checkpoint(520, "chunk_processing", chunk_duration, {
                        "chunk_size": len(chunk_content),
                        "sales_category": sales_category,
                        "quality_score": quality_score
                    })
                
                self.trail.light(313, {
                    "status": "document_processed",
                    "chunks_created": len([c for c in all_chunks if c.source_document == title]),
                    "doc_index": doc_idx
                })
            
            # Finalize statistics
            total_duration = (time.time() - start_time) * 1000
            stats.processing_time_ms = total_duration
            stats.total_chunks = len(all_chunks)
            stats.avg_chunk_size = int(sum(len(c.content) for c in all_chunks) / len(all_chunks)) if all_chunks else 0
            
            self.trail.performance_checkpoint(521, "document_batch_processing", total_duration, {
                "documents_processed": len(documents),
                "chunks_created": len(all_chunks),
                "avg_quality": sum(stats.quality_scores) / len(stats.quality_scores) if stats.quality_scores else 0
            })
            
            self.trail.light(303, {
                "status": "document_processing_complete",
                "total_documents": stats.total_documents,
                "total_chunks": stats.total_chunks,
                "avg_chunk_size": stats.avg_chunk_size,
                "processing_time_ms": total_duration
            })
            
            return all_chunks, stats
            
        except Exception as e:
            self.trail.fail(302, e, traceback.format_exc())
            raise
    
    def _chunk_document(self, content: str, title: str) -> List[str]:
        """
        Split document content into overlapping chunks.
        
        Args:
            content: Document content to chunk
            title: Document title for context
            
        Returns:
            List of content chunks
        """
        self.trail.light(330, {"action": "chunking_start", "content_length": len(content)})
        
        try:
            # Split into sentences first
            sentences = sent_tokenize(content)
            chunks = []
            current_chunk = ""
            
            for sentence in sentences:
                # Check if adding this sentence would exceed chunk size
                potential_chunk = current_chunk + " " + sentence if current_chunk else sentence
                
                if len(potential_chunk) <= self.chunk_size:
                    current_chunk = potential_chunk
                else:
                    # Save current chunk if it meets minimum size
                    if len(current_chunk) >= self.min_chunk_size:
                        chunks.append(current_chunk.strip())
                    
                    # Start new chunk with overlap
                    if self.chunk_overlap > 0 and current_chunk:
                        overlap_words = current_chunk.split()[-self.chunk_overlap:]
                        overlap_text = " ".join(overlap_words)
                        current_chunk = overlap_text + " " + sentence
                    else:
                        current_chunk = sentence
            
            # Add the last chunk
            if current_chunk and len(current_chunk) >= self.min_chunk_size:
                chunks.append(current_chunk.strip())
            
            self.trail.light(331, {
                "status": "chunking_complete",
                "chunks_created": len(chunks),
                "avg_chunk_size": sum(len(c) for c in chunks) / len(chunks) if chunks else 0
            })
            
            return chunks
            
        except Exception as e:
            self.trail.fail(330, e, traceback.format_exc())
            return [content]  # Fallback to single chunk
    
    def _classify_sales_context(self, content: str) -> str:
        """
        Classify content into sales context category.
        
        Args:
            content: Text content to classify
            
        Returns:
            Sales category string
        """
        content_lower = content.lower()
        category_scores = {}
        
        for category, patterns in self.sales_patterns.items():
            score = 0
            for pattern in patterns:
                matches = len(re.findall(pattern, content_lower))
                score += matches
            
            if score > 0:
                category_scores[category] = score
        
        if category_scores:
            best_category = max(category_scores, key=category_scores.get)
            confidence = category_scores[best_category] / sum(category_scores.values())
            
            self.trail.light(321, {
                "status": "sales_classification_complete",
                "category": best_category,
                "confidence": confidence,
                "all_scores": category_scores
            })
            
            return best_category
        else:
            self.trail.light(321, {"status": "no_sales_context_detected"})
            return "general"
    
    def _determine_coaching_context(self, content: str, sales_category: str) -> str:
        """
        Determine specific coaching context based on content and sales category.
        
        Args:
            content: Text content
            sales_category: Classified sales category
            
        Returns:
            Coaching context string
        """
        # Map sales categories to coaching contexts
        context_mapping = {
            "objection_handling": "objection_response",
            "closing_techniques": "sales_closing",
            "relationship_building": "rapport_building",
            "qualification": "lead_qualification",
            "presentation": "value_presentation",
            "negotiation": "deal_negotiation",
            "general": "general_coaching"
        }
        
        return context_mapping.get(sales_category, "general_coaching")
    
    def _assess_chunk_quality(self, content: str) -> float:
        """
        Assess the quality of a content chunk for coaching purposes.
        
        Args:
            content: Text content to assess
            
        Returns:
            Quality score between 0.0 and 1.0
        """
        content_lower = content.lower()
        score = 0.5  # Base score
        
        # Positive indicators
        positive_count = 0
        for pattern in self.quality_indicators["positive"]:
            positive_count += len(re.findall(pattern, content_lower))
        
        # Negative indicators (things to avoid)
        negative_count = 0
        for pattern in self.quality_indicators["negative"]:
            negative_count += len(re.findall(pattern, content_lower))
        
        # Content length factor
        length_factor = min(len(content) / self.chunk_size, 1.0)
        
        # Word diversity factor
        words = word_tokenize(content_lower)
        unique_words = set(words)
        diversity_factor = len(unique_words) / len(words) if words else 0
        
        # Calculate final score
        score += positive_count * 0.1  # Positive indicators boost score
        score -= negative_count * 0.05  # Negative indicators reduce score
        score += length_factor * 0.2  # Good length boosts score
        score += diversity_factor * 0.2  # Word diversity boosts score
        
        # Ensure score is within bounds
        final_score = max(0.0, min(1.0, score))
        
        self.trail.light(323, {
            "status": "quality_assessment_complete",
            "quality_score": final_score,
            "positive_indicators": positive_count,
            "negative_indicators": negative_count,
            "length_factor": length_factor,
            "diversity_factor": diversity_factor
        })
        
        return final_score
    
    def _generate_chunk_id(self, document_title: str, chunk_index: int, content: str) -> str:
        """Generate unique ID for a document chunk."""
        content_hash = hashlib.md5(content.encode()).hexdigest()[:8]
        return f"{document_title}_{chunk_index}_{content_hash}"
    
    def export_chunks_for_rag(self, chunks: List[DocumentChunk]) -> List[Dict[str, Any]]:
        """
        Export processed chunks in format suitable for ChromaDB RAG system.
        
        Args:
            chunks: List of processed document chunks
            
        Returns:
            List of documents ready for RAG system ingestion
        """
        self.trail.light(340, {
            "action": "export_preparation_start",
            "chunk_count": len(chunks)
        })
        
        try:
            exported_docs = []
            
            for chunk in chunks:
                doc = {
                    "content": chunk.content,
                    "metadata": {
                        **chunk.metadata,
                        "source": chunk.source_document,
                        "coaching_context": chunk.coaching_context,
                        "sales_category": chunk.sales_category,
                        "quality_score": chunk.quality_score,
                        "chunk_id": chunk.chunk_id
                    },
                    "id": chunk.chunk_id
                }
                exported_docs.append(doc)
            
            self.trail.light(341, {
                "status": "export_complete",
                "exported_count": len(exported_docs),
                "categories": list(set(c.sales_category for c in chunks))
            })
            
            return exported_docs
            
        except Exception as e:
            self.trail.fail(340, e, traceback.format_exc())
            raise
    
    def get_processing_statistics(self, chunks: List[DocumentChunk]) -> Dict[str, Any]:
        """Get detailed statistics about processed chunks."""
        self.trail.light(350, {"action": "statistics_calculation"})
        
        try:
            stats = {
                "total_chunks": len(chunks),
                "avg_chunk_size": sum(len(c.content) for c in chunks) / len(chunks) if chunks else 0,
                "avg_quality_score": sum(c.quality_score for c in chunks) / len(chunks) if chunks else 0,
                "sales_categories": {},
                "coaching_contexts": {},
                "quality_distribution": {
                    "high_quality": 0,  # > 0.8
                    "medium_quality": 0,  # 0.6 - 0.8
                    "low_quality": 0  # < 0.6
                }
            }
            
            for chunk in chunks:
                # Count categories
                stats["sales_categories"][chunk.sales_category] = stats["sales_categories"].get(chunk.sales_category, 0) + 1
                stats["coaching_contexts"][chunk.coaching_context] = stats["coaching_contexts"].get(chunk.coaching_context, 0) + 1
                
                # Quality distribution
                if chunk.quality_score > 0.8:
                    stats["quality_distribution"]["high_quality"] += 1
                elif chunk.quality_score > 0.6:
                    stats["quality_distribution"]["medium_quality"] += 1
                else:
                    stats["quality_distribution"]["low_quality"] += 1
            
            self.trail.light(351, {"status": "statistics_complete", "stats": stats})
            
            return stats
            
        except Exception as e:
            self.trail.fail(350, e, traceback.format_exc())
            return {}


# Sample knowledge documents for testing
SAMPLE_KNOWLEDGE_DOCUMENTS = [
    {
        "title": "Sales Objection Handling Guide",
        "content": """
        Handling sales objections is a critical skill for any sales professional. When a prospect raises an objection, 
        it's often a sign that they're engaged and considering your proposal. The key is to listen actively and 
        understand the real concern behind the objection.
        
        Common objections include price concerns, timing issues, and authority questions. For price objections, 
        never immediately offer a discount. Instead, ask clarifying questions to understand what specific aspect 
        of the value proposition wasn't clear. Use phrases like "Help me understand what part of the value we 
        discussed didn't resonate with you?"
        
        When someone says "I need to think about it," this usually means they have unaddressed concerns. 
        Ask them "What specific aspect would you like to think about?" to uncover the real objection.
        
        Remember, objections are opportunities to provide more value and demonstrate your expertise.
        """,
        "metadata": {
            "source": "sales_training_manual",
            "author": "Sales Expert",
            "category": "objection_handling"
        }
    },
    {
        "title": "Effective Closing Techniques",
        "content": """
        Closing a sale is about creating the right moment and using appropriate techniques based on the situation. 
        The assumptive close is powerful when buying signals are strong. Instead of asking "Would you like to proceed?" 
        ask "When would you like to get started?"
        
        The trial close helps gauge readiness: "How does this solution sound so far?" or "What are your thoughts 
        on what we've discussed?"
        
        Create urgency ethically by highlighting limited-time offers or consequences of delay. Never use false urgency.
        
        The alternative close gives prospects control: "Would you prefer the monthly or annual payment plan?"
        
        Watch for buying signals: leaning forward, asking detailed questions about implementation, discussing budget specifics.
        
        Remember, closing isn't manipulation—it's helping the prospect make a decision that benefits them.
        """,
        "metadata": {
            "source": "sales_training_manual",
            "author": "Sales Expert",
            "category": "closing_techniques"
        }
    },
    {
        "title": "Building Rapport and Trust",
        "content": """
        Building rapport is the foundation of successful sales relationships. Start with genuine interest in the prospect as a person. 
        Find common ground through shared experiences, interests, or mutual connections.
        
        Active listening is crucial. Reflect back what you hear: "So what I'm hearing is..." This shows you're paying attention 
        and ensures understanding.
        
        Mirror their communication style. If they're direct and to-the-point, match that energy. If they're more relationship-focused, 
        take time for small talk.
        
        Be authentic. People can sense when you're being genuine versus when you're using techniques. Share appropriate personal 
        stories that relate to their situation.
        
        Follow up consistently. Touch base even when you're not selling. Provide value through industry insights, relevant articles, 
        or introductions to useful contacts.
        
        Trust is built through competence, reliability, and integrity. Always do what you say you'll do.
        """,
        "metadata": {
            "source": "relationship_building_guide",
            "author": "Communications Expert",
            "category": "relationship_building"
        }
    }
]


# Integration with ChromaDB RAG System
def setup_knowledge_base(rag_system, knowledge_documents: List[Dict[str, Any]] = None):
    """
    Set up knowledge base in ChromaDB RAG system using processed chunks.
    
    Args:
        rag_system: ChromaDBRAGSystem instance
        knowledge_documents: Optional list of documents to process
    """
    trail = BreadcrumbTrail("KnowledgeBaseSetup")
    trail.light(360, {"action": "knowledge_base_setup_start"})
    
    try:
        # Use sample documents if none provided
        if knowledge_documents is None:
            knowledge_documents = SAMPLE_KNOWLEDGE_DOCUMENTS
        
        # Initialize knowledge manager
        knowledge_manager = KnowledgeManager()
        
        # Process documents
        trail.light(361, {"action": "document_processing_start"})
        chunks, stats = knowledge_manager.process_documents(knowledge_documents)
        
        # Export for RAG system
        trail.light(362, {"action": "export_for_rag"})
        rag_documents = knowledge_manager.export_chunks_for_rag(chunks)
        
        # Add to RAG system
        trail.light(363, {"action": "adding_to_rag_system"})
        rag_system.add_knowledge_documents(rag_documents)
        
        trail.light(364, {
            "status": "knowledge_base_setup_complete",
            "documents_processed": stats.total_documents,
            "chunks_created": stats.total_chunks,
            "avg_quality": sum(stats.quality_scores) / len(stats.quality_scores) if stats.quality_scores else 0
        })
        
        return {
            "chunks": chunks,
            "stats": stats,
            "rag_documents": rag_documents
        }
        
    except Exception as e:
        trail.fail(360, e, traceback.format_exc())
        raise


# Example usage and testing
if __name__ == "__main__":
    print("🟢 Initializing Knowledge Manager with LED Debugging...")
    
    try:
        # Initialize knowledge manager
        knowledge_manager = KnowledgeManager(
            chunk_size=400,
            chunk_overlap=50,
            quality_threshold=0.6
        )
        
        print("📚 Processing sample knowledge documents...")
        chunks, stats = knowledge_manager.process_documents(SAMPLE_KNOWLEDGE_DOCUMENTS)
        
        print(f"✅ Processed {stats.total_documents} documents into {stats.total_chunks} chunks")
        print(f"📊 Average chunk size: {stats.avg_chunk_size} characters")
        print(f"🎯 Average quality score: {sum(stats.quality_scores) / len(stats.quality_scores):.3f}")
        
        print("\n📈 Sales categories distribution:")
        for category, count in stats.sales_categories.items():
            print(f"  {category}: {count} chunks")
        
        print("\n🔍 Exporting chunks for RAG system...")
        exported_docs = knowledge_manager.export_chunks_for_rag(chunks)
        
        print(f"✅ Exported {len(exported_docs)} documents for RAG system")
        
        print("\n📋 Sample exported document:")
        if exported_docs:
            sample_doc = exported_docs[0]
            print(f"  Content: {sample_doc['content'][:100]}...")
            print(f"  Category: {sample_doc['metadata']['sales_category']}")
            print(f"  Quality: {sample_doc['metadata']['quality_score']:.3f}")
        
        print("\n📊 Getting processing statistics...")
        detailed_stats = knowledge_manager.get_processing_statistics(chunks)
        print(f"Quality distribution:")
        for quality_level, count in detailed_stats["quality_distribution"].items():
            print(f"  {quality_level}: {count} chunks")
        
        print("✅ Knowledge Manager test completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        traceback.print_exc()