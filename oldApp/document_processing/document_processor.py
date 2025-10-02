"""
VoiceCoach Document Processing Engine
Handles automated ingestion of sales documents (PDF, DOCX, TXT, MD)
"""

import os
import logging
import mimetypes
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from datetime import datetime

# Document processing libraries
import PyPDF2
from docx import Document as DocxDocument
import markdown
import tiktoken

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ProcessedDocument:
    """Processed document data structure"""
    content: str
    metadata: Dict[str, Any]
    file_path: str
    file_type: str
    word_count: int
    token_count: int
    processing_time: float
    errors: List[str]

class DocumentProcessor:
    """
    Core document processing engine for VoiceCoach sales knowledge ingestion.
    
    Supports:
    - PDF extraction with text cleaning
    - DOCX processing with formatting preservation
    - TXT/MD processing with encoding detection
    - Token counting for chunking optimization
    - Metadata extraction for classification
    """
    
    SUPPORTED_FORMATS = {
        '.pdf': 'PDF Document',
        '.docx': 'Word Document', 
        '.txt': 'Text Document',
        '.md': 'Markdown Document',
        '.markdown': 'Markdown Document'
    }
    
    SALES_KEYWORDS = {
        'objection_handling': [
            'objection', 'pushback', 'concern', 'hesitation', 'resistance',
            'not interested', 'too expensive', 'think about it', 'budget'
        ],
        'closing_techniques': [
            'close', 'closing', 'trial close', 'assumptive close',
            'urgency', 'scarcity', 'next steps', 'decision'
        ],
        'prospecting': [
            'prospect', 'lead', 'cold call', 'warm call', 'outreach',
            'qualification', 'discovery', 'needs analysis'
        ],
        'product_knowledge': [
            'features', 'benefits', 'specifications', 'pricing',
            'competitor', 'advantage', 'value proposition'
        ],
        'methodology': [
            'BANT', 'MEDDIC', 'SPIN', 'Challenger', 'Sandler',
            'process', 'framework', 'methodology', 'approach'
        ]
    }
    
    def __init__(self, encoding_model: str = "cl100k_base"):
        """Initialize document processor with token encoding"""
        try:
            self.encoding = tiktoken.get_encoding(encoding_model)
        except Exception as e:
            logger.warning(f"Failed to load encoding {encoding_model}: {e}")
            self.encoding = None
            
    def is_supported_format(self, file_path: str) -> bool:
        """Check if file format is supported"""
        extension = Path(file_path).suffix.lower()
        return extension in self.SUPPORTED_FORMATS
    
    def process_document(self, file_path: str) -> ProcessedDocument:
        """
        Process a single document and extract content with metadata.
        
        Args:
            file_path: Path to document file
            
        Returns:
            ProcessedDocument with content, metadata, and processing stats
        """
        start_time = datetime.now()
        errors = []
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Document not found: {file_path}")
            
        if not self.is_supported_format(file_path):
            extension = Path(file_path).suffix.lower()
            raise ValueError(f"Unsupported format: {extension}")
        
        try:
            # Extract content based on file type
            content = self._extract_content(file_path)
            
            # Clean and normalize content
            content = self._clean_content(content)
            
            # Generate metadata
            metadata = self._extract_metadata(file_path, content)
            
            # Calculate statistics
            word_count = len(content.split())
            token_count = self._count_tokens(content)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return ProcessedDocument(
                content=content,
                metadata=metadata,
                file_path=file_path,
                file_type=self._get_file_type(file_path),
                word_count=word_count,
                token_count=token_count,
                processing_time=processing_time,
                errors=errors
            )
            
        except Exception as e:
            logger.error(f"Error processing {file_path}: {e}")
            errors.append(str(e))
            raise
    
    def _extract_content(self, file_path: str) -> str:
        """Extract text content from document based on file type"""
        extension = Path(file_path).suffix.lower()
        
        if extension == '.pdf':
            return self._extract_pdf_content(file_path)
        elif extension == '.docx':
            return self._extract_docx_content(file_path)
        elif extension in ['.txt', '.md', '.markdown']:
            return self._extract_text_content(file_path)
        else:
            raise ValueError(f"Unsupported file type: {extension}")
    
    def _extract_pdf_content(self, file_path: str) -> str:
        """Extract text from PDF using PyPDF2"""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                content = []
                
                for page_num, page in enumerate(pdf_reader.pages):
                    try:
                        text = page.extract_text()
                        if text.strip():
                            content.append(text)
                    except Exception as e:
                        logger.warning(f"Error extracting page {page_num + 1} from {file_path}: {e}")
                
                return '\n\n'.join(content)
                
        except Exception as e:
            logger.error(f"PDF extraction failed for {file_path}: {e}")
            raise
    
    def _extract_docx_content(self, file_path: str) -> str:
        """Extract text from DOCX using python-docx"""
        try:
            doc = DocxDocument(file_path)
            content = []
            
            # Extract paragraphs
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    content.append(paragraph.text)
            
            # Extract tables
            for table in doc.tables:
                for row in table.rows:
                    row_text = []
                    for cell in row.cells:
                        if cell.text.strip():
                            row_text.append(cell.text.strip())
                    if row_text:
                        content.append(' | '.join(row_text))
            
            return '\n\n'.join(content)
            
        except Exception as e:
            logger.error(f"DOCX extraction failed for {file_path}: {e}")
            raise
    
    def _extract_text_content(self, file_path: str) -> str:
        """Extract text from TXT/MD files with encoding detection"""
        encodings = ['utf-8', 'utf-16', 'latin-1', 'cp1252']
        
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as file:
                    content = file.read()
                
                # Convert markdown to text if needed
                if Path(file_path).suffix.lower() in ['.md', '.markdown']:
                    # Basic markdown to text conversion
                    content = markdown.markdown(content)
                    # Remove HTML tags (simple approach)
                    import re
                    content = re.sub(r'<[^>]+>', '', content)
                
                return content
                
            except UnicodeDecodeError:
                continue
        
        raise ValueError(f"Could not decode text file: {file_path}")
    
    def _clean_content(self, content: str) -> str:
        """Clean and normalize extracted content"""
        import re
        
        # Remove excessive whitespace
        content = re.sub(r'\n{3,}', '\n\n', content)
        content = re.sub(r' {2,}', ' ', content)
        
        # Remove special characters but preserve structure
        content = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\xff]', '', content)
        
        # Normalize line endings
        content = content.replace('\r\n', '\n').replace('\r', '\n')
        
        return content.strip()
    
    def _extract_metadata(self, file_path: str, content: str) -> Dict[str, Any]:
        """Extract metadata for document classification"""
        path_obj = Path(file_path)
        
        # Basic file metadata
        metadata = {
            'filename': path_obj.name,
            'file_size': os.path.getsize(file_path),
            'file_extension': path_obj.suffix.lower(),
            'modified_date': datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat(),
            'processed_date': datetime.now().isoformat()
        }
        
        # Content analysis
        metadata.update(self._analyze_sales_content(content))
        
        return metadata
    
    def _analyze_sales_content(self, content: str) -> Dict[str, Any]:
        """Analyze content to identify sales-specific themes and topics"""
        content_lower = content.lower()
        
        # Count keyword matches for each category
        category_scores = {}
        topic_matches = {}
        
        for category, keywords in self.SALES_KEYWORDS.items():
            matches = []
            score = 0
            
            for keyword in keywords:
                count = content_lower.count(keyword.lower())
                if count > 0:
                    matches.append(keyword)
                    score += count
            
            category_scores[category] = score
            topic_matches[f"{category}_keywords"] = matches
        
        # Determine primary classification
        primary_category = max(category_scores.items(), key=lambda x: x[1])[0] if any(category_scores.values()) else 'general_sales'
        
        # Additional analysis
        sentences = content.split('.')
        avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences) if sentences else 0
        
        return {
            'primary_category': primary_category,
            'category_scores': category_scores,
            'total_sales_keywords': sum(category_scores.values()),
            'avg_sentence_length': round(avg_sentence_length, 2),
            'contains_questions': '?' in content,
            'contains_numbers': any(char.isdigit() for char in content),
            **topic_matches
        }
    
    def _count_tokens(self, text: str) -> int:
        """Count tokens using tiktoken encoding"""
        if self.encoding is None:
            # Fallback: rough estimation
            return len(text.split()) * 1.3
        
        try:
            return len(self.encoding.encode(text))
        except Exception:
            return len(text.split()) * 1.3
    
    def _get_file_type(self, file_path: str) -> str:
        """Get human-readable file type"""
        extension = Path(file_path).suffix.lower()
        return self.SUPPORTED_FORMATS.get(extension, 'Unknown')
    
    def get_processing_stats(self, processed_docs: List[ProcessedDocument]) -> Dict[str, Any]:
        """Generate processing statistics for batch operations"""
        if not processed_docs:
            return {}
        
        total_docs = len(processed_docs)
        total_words = sum(doc.word_count for doc in processed_docs)
        total_tokens = sum(doc.token_count for doc in processed_docs)
        total_time = sum(doc.processing_time for doc in processed_docs)
        total_errors = sum(len(doc.errors) for doc in processed_docs)
        
        # File type distribution
        file_types = {}
        for doc in processed_docs:
            file_types[doc.file_type] = file_types.get(doc.file_type, 0) + 1
        
        # Category distribution
        categories = {}
        for doc in processed_docs:
            category = doc.metadata.get('primary_category', 'unknown')
            categories[category] = categories.get(category, 0) + 1
        
        return {
            'total_documents': total_docs,
            'total_words': total_words,
            'total_tokens': total_tokens,
            'total_processing_time': round(total_time, 2),
            'avg_processing_time': round(total_time / total_docs, 2),
            'total_errors': total_errors,
            'file_type_distribution': file_types,
            'category_distribution': categories,
            'avg_words_per_doc': round(total_words / total_docs),
            'avg_tokens_per_doc': round(total_tokens / total_docs)
        }