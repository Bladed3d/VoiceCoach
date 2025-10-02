"""
VoiceCoach Intelligent Chunking Engine
Optimized chunking strategies for sales content preservation
"""

import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from abc import ABC, abstractmethod
import tiktoken

logger = logging.getLogger(__name__)

@dataclass
class ContentChunk:
    """Data structure for processed content chunks"""
    content: str
    chunk_id: str
    source_document: str
    start_position: int
    end_position: int
    token_count: int
    word_count: int
    metadata: Dict[str, Any]
    sales_context: Dict[str, Any]

class ChunkingStrategy(ABC):
    """Abstract base class for chunking strategies"""
    
    @abstractmethod
    def chunk_content(self, content: str, metadata: Dict[str, Any]) -> List[ContentChunk]:
        """Abstract method for content chunking"""
        pass

class SemanticChunker(ChunkingStrategy):
    """
    Semantic-aware chunking strategy that preserves sales context.
    Ideal for sales scripts, objection handling, and methodology documents.
    """
    
    def __init__(self, max_tokens: int = 512, overlap_tokens: int = 50):
        self.max_tokens = max_tokens
        self.overlap_tokens = overlap_tokens
        try:
            self.encoding = tiktoken.get_encoding("cl100k_base")
        except:
            self.encoding = None
    
    def chunk_content(self, content: str, metadata: Dict[str, Any]) -> List[ContentChunk]:
        """Chunk content preserving semantic boundaries"""
        
        # Split into semantic units (paragraphs, sections)
        semantic_units = self._identify_semantic_boundaries(content)
        
        chunks = []
        current_chunk = ""
        current_tokens = 0
        start_pos = 0
        
        for i, unit in enumerate(semantic_units):
            unit_tokens = self._count_tokens(unit)
            
            # If single unit exceeds max tokens, split it further
            if unit_tokens > self.max_tokens:
                # Process current chunk if exists
                if current_chunk:
                    chunks.append(self._create_chunk(
                        current_chunk, metadata, start_pos, 
                        start_pos + len(current_chunk), len(chunks)
                    ))
                    current_chunk = ""
                    current_tokens = 0
                
                # Split large unit
                sub_chunks = self._split_large_unit(unit, metadata, len(chunks))
                chunks.extend(sub_chunks)
                start_pos = start_pos + len(unit)
                continue
            
            # Check if adding unit would exceed limit
            if current_tokens + unit_tokens > self.max_tokens and current_chunk:
                # Create chunk with overlap
                chunks.append(self._create_chunk(
                    current_chunk, metadata, start_pos,
                    start_pos + len(current_chunk), len(chunks)
                ))
                
                # Start new chunk with overlap
                overlap_content = self._get_overlap_content(current_chunk)
                current_chunk = overlap_content + unit
                current_tokens = self._count_tokens(current_chunk)
                start_pos = start_pos + len(current_chunk) - len(overlap_content)
            else:
                # Add unit to current chunk
                if current_chunk:
                    current_chunk += "\n\n" + unit
                else:
                    current_chunk = unit
                current_tokens += unit_tokens
        
        # Add final chunk
        if current_chunk:
            chunks.append(self._create_chunk(
                current_chunk, metadata, start_pos,
                start_pos + len(current_chunk), len(chunks)
            ))
        
        return chunks
    
    def _identify_semantic_boundaries(self, content: str) -> List[str]:
        """Identify semantic boundaries in sales content"""
        
        # Sales-specific boundary patterns
        boundary_patterns = [
            r'\n\s*#{1,6}\s+.*?\n',  # Markdown headers
            r'\n\s*\d+\.\s+.*?\n',   # Numbered lists
            r'\n\s*[-•*]\s+.*?\n',   # Bullet points
            r'\n\s*[A-Z][^.\n]*:\s*\n',  # Section labels
            r'\n\s*(?:Step|Phase|Chapter|Section)\s+\d+.*?\n',  # Structured sections
            r'\n\s*(?:Objection|Question|Response|Script).*?\n',  # Sales-specific sections
        ]
        
        # Split by double newlines first (paragraphs)
        paragraphs = re.split(r'\n\s*\n', content)
        
        units = []
        for paragraph in paragraphs:
            if not paragraph.strip():
                continue
                
            # Check for sales-specific structures
            if self._is_sales_structure(paragraph):
                units.append(paragraph.strip())
            else:
                # Split long paragraphs by sentences for sales content
                sentences = self._split_sentences(paragraph)
                if len(sentences) > 3:  # Long paragraph
                    current_unit = ""
                    for sentence in sentences:
                        if len(current_unit + sentence) > 200:  # Rough word limit
                            if current_unit:
                                units.append(current_unit.strip())
                            current_unit = sentence
                        else:
                            current_unit += " " + sentence if current_unit else sentence
                    if current_unit:
                        units.append(current_unit.strip())
                else:
                    units.append(paragraph.strip())
        
        return [unit for unit in units if unit.strip()]
    
    def _is_sales_structure(self, text: str) -> bool:
        """Check if text contains sales-specific structures"""
        sales_indicators = [
            r'objection.*?response',
            r'question.*?answer',
            r'script.*?dialogue',
            r'step.*?\d+',
            r'phase.*?\d+',
            r'scenario.*?outcome',
            r'example.*?result'
        ]
        
        text_lower = text.lower()
        return any(re.search(pattern, text_lower) for pattern in sales_indicators)
    
    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences preserving sales context"""
        # Sales-aware sentence splitting
        sentence_endings = r'[.!?]+(?=\s+[A-Z]|\s*$)'
        sentences = re.split(sentence_endings, text)
        
        # Clean and filter
        cleaned_sentences = []
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence and len(sentence) > 10:  # Minimum sentence length
                cleaned_sentences.append(sentence)
        
        return cleaned_sentences
    
    def _get_overlap_content(self, content: str) -> str:
        """Get overlap content to maintain context between chunks"""
        words = content.split()
        overlap_words = min(self.overlap_tokens, len(words), 30)  # Limit overlap
        return " ".join(words[-overlap_words:]) + "\n\n"
    
    def _create_chunk(self, content: str, metadata: Dict[str, Any], 
                     start_pos: int, end_pos: int, chunk_index: int) -> ContentChunk:
        """Create a ContentChunk with sales-specific metadata"""
        
        return ContentChunk(
            content=content,
            chunk_id=f"{metadata.get('filename', 'unknown')}_{chunk_index:03d}",
            source_document=metadata.get('filename', 'unknown'),
            start_position=start_pos,
            end_position=end_pos,
            token_count=self._count_tokens(content),
            word_count=len(content.split()),
            metadata=metadata,
            sales_context=self._extract_sales_context(content)
        )
    
    def _extract_sales_context(self, content: str) -> Dict[str, Any]:
        """Extract sales-specific context from chunk content"""
        content_lower = content.lower()
        
        # Sales context indicators
        context = {
            'contains_objection': any(word in content_lower for word in 
                                    ['objection', 'concern', 'pushback', 'hesitation']),
            'contains_script': any(word in content_lower for word in 
                                 ['script', 'dialogue', 'conversation', 'say']),
            'contains_process': any(word in content_lower for word in 
                                  ['step', 'process', 'methodology', 'framework']),
            'contains_pricing': any(word in content_lower for word in 
                                  ['price', 'cost', 'budget', 'investment', '$']),
            'contains_closing': any(word in content_lower for word in 
                                  ['close', 'closing', 'decision', 'next steps']),
            'question_count': content.count('?'),
            'has_dialogue': '"' in content or "'" in content,
            'has_numbers': any(char.isdigit() for char in content),
            'urgency_indicators': content_lower.count('urgent') + content_lower.count('deadline') + 
                                content_lower.count('limited time')
        }
        
        return context
    
    def _split_large_unit(self, unit: str, metadata: Dict[str, Any], 
                         chunk_index_start: int) -> List[ContentChunk]:
        """Split units that are too large into smaller chunks"""
        chunks = []
        words = unit.split()
        
        # Calculate words per chunk based on token limit
        words_per_chunk = int(self.max_tokens * 0.75)  # Conservative estimate
        
        for i in range(0, len(words), words_per_chunk):
            chunk_words = words[i:i + words_per_chunk]
            chunk_content = " ".join(chunk_words)
            
            chunks.append(ContentChunk(
                content=chunk_content,
                chunk_id=f"{metadata.get('filename', 'unknown')}_{chunk_index_start + len(chunks):03d}",
                source_document=metadata.get('filename', 'unknown'),
                start_position=i,
                end_position=i + len(chunk_words),
                token_count=self._count_tokens(chunk_content),
                word_count=len(chunk_words),
                metadata=metadata,
                sales_context=self._extract_sales_context(chunk_content)
            ))
        
        return chunks
    
    def _count_tokens(self, text: str) -> int:
        """Count tokens using tiktoken encoding"""
        if self.encoding is None:
            return int(len(text.split()) * 1.3)  # Fallback estimation
        
        try:
            return len(self.encoding.encode(text))
        except:
            return int(len(text.split()) * 1.3)

class FixedSizeChunker(ChunkingStrategy):
    """
    Fixed-size chunking strategy for consistent token distribution.
    Good for general sales content and knowledge base articles.
    """
    
    def __init__(self, chunk_size: int = 512, overlap: int = 50):
        self.chunk_size = chunk_size
        self.overlap = overlap
        try:
            self.encoding = tiktoken.get_encoding("cl100k_base")
        except:
            self.encoding = None
    
    def chunk_content(self, content: str, metadata: Dict[str, Any]) -> List[ContentChunk]:
        """Create fixed-size chunks with overlap"""
        chunks = []
        words = content.split()
        
        # Estimate words per chunk
        words_per_chunk = int(self.chunk_size * 0.75)
        overlap_words = int(self.overlap * 0.75)
        
        for i in range(0, len(words), words_per_chunk - overlap_words):
            chunk_words = words[i:i + words_per_chunk]
            chunk_content = " ".join(chunk_words)
            
            chunk = ContentChunk(
                content=chunk_content,
                chunk_id=f"{metadata.get('filename', 'unknown')}_{len(chunks):03d}",
                source_document=metadata.get('filename', 'unknown'),
                start_position=i,
                end_position=i + len(chunk_words),
                token_count=self._count_tokens(chunk_content),
                word_count=len(chunk_words),
                metadata=metadata,
                sales_context={}
            )
            
            chunks.append(chunk)
            
            # Break if we've covered all words
            if i + words_per_chunk >= len(words):
                break
        
        return chunks
    
    def _count_tokens(self, text: str) -> int:
        """Count tokens using tiktoken encoding"""
        if self.encoding is None:
            return int(len(text.split()) * 1.3)
        
        try:
            return len(self.encoding.encode(text))
        except:
            return int(len(text.split()) * 1.3)

class ChunkingEngine:
    """
    Main chunking engine that selects optimal strategy based on content type.
    Integrates multiple chunking strategies for different sales content types.
    """
    
    def __init__(self, default_strategy: str = "semantic"):
        self.strategies = {
            "semantic": SemanticChunker(),
            "fixed": FixedSizeChunker(),
            "semantic_large": SemanticChunker(max_tokens=1024, overlap_tokens=100),
            "fixed_small": FixedSizeChunker(chunk_size=256, overlap=25)
        }
        self.default_strategy = default_strategy
    
    def chunk_document(self, content: str, metadata: Dict[str, Any], 
                      strategy: Optional[str] = None) -> List[ContentChunk]:
        """
        Chunk document content using optimal strategy.
        
        Args:
            content: Document text content
            metadata: Document metadata for context
            strategy: Specific strategy to use (optional)
            
        Returns:
            List of ContentChunk objects
        """
        
        # Auto-select strategy if not specified
        if strategy is None:
            strategy = self._select_optimal_strategy(content, metadata)
        
        if strategy not in self.strategies:
            logger.warning(f"Unknown strategy '{strategy}', using default")
            strategy = self.default_strategy
        
        chunker = self.strategies[strategy]
        
        try:
            chunks = chunker.chunk_content(content, metadata)
            
            # Post-process chunks
            chunks = self._post_process_chunks(chunks)
            
            logger.info(f"Created {len(chunks)} chunks using {strategy} strategy")
            return chunks
            
        except Exception as e:
            logger.error(f"Chunking failed with {strategy} strategy: {e}")
            # Fallback to fixed chunking
            if strategy != "fixed":
                return self.chunk_document(content, metadata, "fixed")
            raise
    
    def _select_optimal_strategy(self, content: str, metadata: Dict[str, Any]) -> str:
        """Auto-select optimal chunking strategy based on content analysis"""
        
        content_lower = content.lower()
        primary_category = metadata.get('primary_category', 'general_sales')
        word_count = len(content.split())
        
        # Strategy selection logic
        if primary_category == 'methodology' or 'process' in content_lower:
            return "semantic"  # Preserve logical flow
        
        elif primary_category == 'objection_handling':
            return "semantic"  # Preserve Q&A pairs
        
        elif word_count > 2000:
            return "semantic_large"  # Larger chunks for long documents
        
        elif primary_category == 'product_knowledge':
            return "fixed"  # Consistent chunks for specifications
        
        elif word_count < 500:
            return "fixed_small"  # Smaller chunks for short content
        
        else:
            return self.default_strategy
    
    def _post_process_chunks(self, chunks: List[ContentChunk]) -> List[ContentChunk]:
        """Post-process chunks for quality and consistency"""
        
        processed_chunks = []
        
        for chunk in chunks:
            # Skip very small chunks (less than 20 words)
            if chunk.word_count < 20:
                continue
            
            # Clean chunk content
            cleaned_content = self._clean_chunk_content(chunk.content)
            
            # Update chunk with cleaned content
            chunk.content = cleaned_content
            chunk.word_count = len(cleaned_content.split())
            
            processed_chunks.append(chunk)
        
        return processed_chunks
    
    def _clean_chunk_content(self, content: str) -> str:
        """Clean and normalize chunk content"""
        
        # Remove excessive whitespace
        content = re.sub(r'\s+', ' ', content)
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        # Ensure proper sentence endings
        content = content.strip()
        if content and not content.endswith(('.', '!', '?', ':')):
            content += '.'
        
        return content
    
    def get_chunking_stats(self, chunks: List[ContentChunk]) -> Dict[str, Any]:
        """Generate statistics for chunking analysis"""
        
        if not chunks:
            return {}
        
        token_counts = [chunk.token_count for chunk in chunks]
        word_counts = [chunk.word_count for chunk in chunks]
        
        # Sales context analysis
        sales_contexts = [chunk.sales_context for chunk in chunks if chunk.sales_context]
        
        objection_chunks = sum(1 for ctx in sales_contexts if ctx.get('contains_objection', False))
        script_chunks = sum(1 for ctx in sales_contexts if ctx.get('contains_script', False))
        process_chunks = sum(1 for ctx in sales_contexts if ctx.get('contains_process', False))
        
        return {
            'total_chunks': len(chunks),
            'avg_tokens_per_chunk': round(sum(token_counts) / len(token_counts), 2),
            'avg_words_per_chunk': round(sum(word_counts) / len(word_counts), 2),
            'min_tokens': min(token_counts),
            'max_tokens': max(token_counts),
            'min_words': min(word_counts),
            'max_words': max(word_counts),
            'objection_chunks': objection_chunks,
            'script_chunks': script_chunks,
            'process_chunks': process_chunks,
            'sales_context_coverage': round(len(sales_contexts) / len(chunks) * 100, 1)
        }