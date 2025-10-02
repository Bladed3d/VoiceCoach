"""
Document Processing Pipeline for VoiceCoach Knowledge Engine
Handles document ingestion, chunking, and metadata extraction
"""

import os
import logging
import hashlib
import mimetypes
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime
import re

import PyPDF2
import docx
from bs4 import BeautifulSoup
import tiktoken


class DocumentProcessor:
    """
    High-performance document processing pipeline for sales materials.
    
    Features:
    - Document chunking (512-token chunks, 50-token overlap)
    - Metadata tagging (topic, methodology, objection-type)  
    - Support for PDF, DOCX, TXT, HTML, MD files
    - Automatic content type detection
    """
    
    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 50):
        self.logger = logging.getLogger(__name__)
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
        # Initialize tokenizer for accurate token counting
        try:
            self.tokenizer = tiktoken.encoding_for_model("gpt-3.5-turbo")
        except Exception:
            # Fallback to cl100k_base encoding
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        
        # Sales-specific content patterns for metadata extraction
        self.objection_patterns = {
            "pricing": [r"too expensive", r"price.*high", r"budget", r"cost", r"ROI"],
            "timing": [r"not ready", r"timing", r"later", r"delay", r"postpone"],
            "authority": [r"need to ask", r"decision maker", r"boss", r"manager"],
            "need": [r"don't need", r"not necessary", r"already have", r"satisfied"],
            "trust": [r"never heard", r"unknown", r"reputation", r"references"],
            "competition": [r"competitor", r"alternative", r"comparing", r"other option"]
        }
        
        self.topic_patterns = {
            "product_features": [r"features", r"capabilities", r"functionality", r"specs"],
            "pricing": [r"pricing", r"cost", r"price", r"investment", r"budget"],
            "implementation": [r"setup", r"install", r"deploy", r"implementation", r"onboarding"],
            "support": [r"support", r"help", r"assistance", r"training", r"documentation"],
            "integration": [r"integrate", r"API", r"connect", r"compatibility", r"workflow"],
            "security": [r"security", r"compliance", r"privacy", r"GDPR", r"encryption"],
            "case_studies": [r"case study", r"success story", r"customer story", r"testimonial"],
            "methodology": [r"process", r"methodology", r"approach", r"framework", r"strategy"]
        }
        
        self.logger.info(f"DocumentProcessor initialized with chunk_size={chunk_size}, overlap={chunk_overlap}")
    
    def process_file(self, file_path: str, custom_metadata: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Process a single file into document chunks with metadata.
        
        Args:
            file_path: Path to the document file
            custom_metadata: Additional metadata to attach to all chunks
        
        Returns:
            List of document chunks with metadata
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Extract text content based on file type
        text_content = self._extract_text(file_path)
        
        if not text_content.strip():
            self.logger.warning(f"No text content extracted from {file_path}")
            return []
        
        # Generate base metadata
        base_metadata = {
            "filename": file_path.name,
            "filepath": str(file_path),
            "file_size": file_path.stat().st_size,
            "processed_at": datetime.now().isoformat(),
            "file_hash": self._calculate_file_hash(file_path),
            "file_type": file_path.suffix.lower()
        }
        
        # Add custom metadata if provided
        if custom_metadata:
            base_metadata.update(custom_metadata)
        
        # Create document chunks
        chunks = self._create_chunks(text_content, base_metadata)
        
        self.logger.info(f"Processed {file_path.name}: {len(chunks)} chunks, {len(text_content)} chars")
        return chunks
    
    def process_directory(
        self, 
        directory_path: str,
        file_patterns: List[str] = None,
        recursive: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Process all documents in a directory.
        
        Args:
            directory_path: Directory containing documents
            file_patterns: File patterns to include (e.g., ["*.pdf", "*.docx"])
            recursive: Whether to search subdirectories
        
        Returns:
            List of all document chunks from directory
        """
        directory = Path(directory_path)
        
        if not directory.exists():
            raise FileNotFoundError(f"Directory not found: {directory}")
        
        # Default file patterns for sales materials
        if file_patterns is None:
            file_patterns = ["*.pdf", "*.docx", "*.txt", "*.md", "*.html"]
        
        all_chunks = []
        
        for pattern in file_patterns:
            if recursive:
                files = directory.rglob(pattern)
            else:
                files = directory.glob(pattern)
            
            for file_path in files:
                try:
                    chunks = self.process_file(str(file_path))
                    all_chunks.extend(chunks)
                except Exception as e:
                    self.logger.error(f"Failed to process {file_path}: {e}")
        
        self.logger.info(f"Processed directory {directory}: {len(all_chunks)} total chunks from multiple files")
        return all_chunks
    
    def _extract_text(self, file_path: Path) -> str:
        """Extract text content from various file formats."""
        mime_type = mimetypes.guess_type(str(file_path))[0]
        
        try:
            if file_path.suffix.lower() == '.pdf':
                return self._extract_pdf_text(file_path)
            elif file_path.suffix.lower() == '.docx':
                return self._extract_docx_text(file_path)
            elif file_path.suffix.lower() in ['.txt', '.md']:
                return self._extract_text_file(file_path)
            elif file_path.suffix.lower() == '.html':
                return self._extract_html_text(file_path)
            else:
                # Try to read as plain text
                return self._extract_text_file(file_path)
        except Exception as e:
            self.logger.error(f"Text extraction failed for {file_path}: {e}")
            return ""
    
    def _extract_pdf_text(self, file_path: Path) -> str:
        """Extract text from PDF files."""
        text = ""
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        return text
    
    def _extract_docx_text(self, file_path: Path) -> str:
        """Extract text from DOCX files."""
        doc = docx.Document(str(file_path))
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text
    
    def _extract_text_file(self, file_path: Path) -> str:
        """Extract text from plain text files."""
        encodings = ['utf-8', 'latin-1', 'cp1252']
        
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as file:
                    return file.read()
            except UnicodeDecodeError:
                continue
        
        raise UnicodeDecodeError(f"Could not decode file {file_path} with any encoding")
    
    def _extract_html_text(self, file_path: Path) -> str:
        """Extract text from HTML files."""
        with open(file_path, 'r', encoding='utf-8') as file:
            soup = BeautifulSoup(file.read(), 'html.parser')
            return soup.get_text(separator=' ', strip=True)
    
    def _create_chunks(self, text: str, base_metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Create overlapping chunks from text with semantic metadata.
        
        Args:
            text: Full document text
            base_metadata: Base metadata to apply to all chunks
        
        Returns:
            List of chunks with enhanced metadata
        """
        # Clean and prepare text
        text = self._clean_text(text)
        
        # Tokenize for accurate chunking
        tokens = self.tokenizer.encode(text)
        
        chunks = []
        start_idx = 0
        
        while start_idx < len(tokens):
            # Calculate chunk boundaries
            end_idx = min(start_idx + self.chunk_size, len(tokens))
            chunk_tokens = tokens[start_idx:end_idx]
            
            # Decode back to text
            chunk_text = self.tokenizer.decode(chunk_tokens)
            
            # Generate chunk metadata
            chunk_metadata = base_metadata.copy()
            chunk_metadata.update({
                "chunk_id": len(chunks),
                "start_token": start_idx,
                "end_token": end_idx,
                "token_count": len(chunk_tokens),
                "char_count": len(chunk_text),
                **self._extract_semantic_metadata(chunk_text)
            })
            
            chunks.append({
                "text": chunk_text,
                "metadata": chunk_metadata
            })
            
            # Move to next chunk with overlap
            start_idx = max(start_idx + self.chunk_size - self.chunk_overlap, start_idx + 1)
            
            # Prevent infinite loop
            if end_idx >= len(tokens):
                break
        
        return chunks
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text content."""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove non-printable characters
        text = ''.join(char for char in text if ord(char) >= 32 or char in '\n\t')
        
        return text.strip()
    
    def _extract_semantic_metadata(self, text: str) -> Dict[str, Any]:
        """
        Extract semantic metadata from text chunk for sales coaching.
        
        Returns metadata tags for filtering and context understanding.
        """
        text_lower = text.lower()
        metadata = {}
        
        # Detect objection types
        objections_found = []
        for objection_type, patterns in self.objection_patterns.items():
            if any(re.search(pattern, text_lower) for pattern in patterns):
                objections_found.append(objection_type)
        
        if objections_found:
            metadata["objection_types"] = objections_found
            metadata["content_type"] = "objection_handler"
        
        # Detect topic categories
        topics_found = []
        for topic, patterns in self.topic_patterns.items():
            if any(re.search(pattern, text_lower) for pattern in patterns):
                topics_found.append(topic)
        
        if topics_found:
            metadata["topics"] = topics_found
        
        # Content type classification
        if not metadata.get("content_type"):
            if any(keyword in text_lower for keyword in ["process", "step", "method", "approach"]):
                metadata["content_type"] = "methodology"
            elif any(keyword in text_lower for keyword in ["case study", "success", "customer", "testimonial"]):
                metadata["content_type"] = "case_study"
            elif any(keyword in text_lower for keyword in ["price", "cost", "investment", "budget"]):
                metadata["content_type"] = "pricing"
            else:
                metadata["content_type"] = "general"
        
        # Calculate content quality score (0-100)
        quality_score = self._calculate_content_quality(text)
        metadata["quality_score"] = quality_score
        
        return metadata
    
    def _calculate_content_quality(self, text: str) -> int:
        """Calculate content quality score based on various factors."""
        score = 50  # Base score
        
        # Length factor (optimal range: 100-800 characters)
        if 100 <= len(text) <= 800:
            score += 20
        elif len(text) < 50:
            score -= 30
        
        # Information density (keywords per 100 characters)
        keyword_count = sum(1 for pattern_list in self.objection_patterns.values() 
                           for pattern in pattern_list if re.search(pattern, text.lower()))
        keyword_count += sum(1 for pattern_list in self.topic_patterns.values() 
                            for pattern in pattern_list if re.search(pattern, text.lower()))
        
        density = (keyword_count / len(text)) * 100
        if density > 2:
            score += 15
        elif density > 1:
            score += 10
        
        # Structure factor (presence of sentences, punctuation)
        if '.' in text or '?' in text or '!' in text:
            score += 10
        
        return max(0, min(100, score))
    
    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate MD5 hash of file for deduplication."""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()


# Global instance for VoiceCoach application
document_processor = DocumentProcessor()