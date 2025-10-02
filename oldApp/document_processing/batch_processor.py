"""
VoiceCoach Batch Document Processing System
High-performance batch processing for sales knowledge libraries
"""

import os
import logging
import asyncio
import time
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable, Tuple
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from datetime import datetime

from .document_processor import DocumentProcessor, ProcessedDocument
from .chunking_engine import ChunkingEngine, ContentChunk
from .metadata_extractor import MetadataExtractor, ExtractedMetadata
from .vector_storage import ChromaDBIntegration

logger = logging.getLogger(__name__)

@dataclass
class BatchProcessingConfig:
    """Configuration for batch processing operations"""
    max_workers: int = 4
    chunk_size: int = 512
    chunk_overlap: int = 50
    chunking_strategy: str = "semantic"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    collection_name: str = "voicecoach_sales_knowledge"
    persist_directory: str = "./chromadb_data"
    enable_progress_tracking: bool = True
    save_processing_logs: bool = True
    log_directory: str = "./processing_logs"

@dataclass
class ProcessingResult:
    """Result structure for batch processing operations"""
    success: bool
    file_path: str
    processing_time: float
    chunks_created: int
    vector_ids: List[str]
    errors: List[str]
    metadata_summary: Dict[str, Any]

@dataclass
class BatchProcessingStats:
    """Statistics for batch processing session"""
    total_files: int
    successful_files: int
    failed_files: int
    total_chunks: int
    total_processing_time: float
    avg_processing_time: float
    total_errors: int
    file_type_distribution: Dict[str, int]
    category_distribution: Dict[str, int]
    start_time: str
    end_time: str

class BatchProcessor:
    """
    High-performance batch processing system for VoiceCoach sales knowledge ingestion.
    
    Features:
    - Parallel document processing with configurable workers
    - Intelligent chunking and metadata extraction
    - Direct integration with ChromaDB vector storage
    - Comprehensive error handling and recovery
    - Progress tracking and detailed logging
    - Batch optimization for large knowledge libraries
    """
    
    def __init__(self, config: Optional[BatchProcessingConfig] = None):
        """Initialize batch processor with configuration"""
        
        self.config = config or BatchProcessingConfig()
        
        # Initialize processing components
        self.document_processor = DocumentProcessor()
        self.chunking_engine = ChunkingEngine(default_strategy=self.config.chunking_strategy)
        self.metadata_extractor = MetadataExtractor()
        
        # Initialize vector storage if available
        try:
            self.vector_storage = ChromaDBIntegration(
                collection_name=self.config.collection_name,
                persist_directory=self.config.persist_directory,
                embedding_model=self.config.embedding_model
            )
            self.vector_storage_available = True
        except ImportError:
            logger.warning("ChromaDB not available. Vector storage disabled.")
            self.vector_storage = None
            self.vector_storage_available = False
        
        # Setup logging
        self._setup_logging()
        
        # Progress tracking
        self.progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None
        
        logger.info("BatchProcessor initialized successfully")
    
    def _setup_logging(self):
        """Setup detailed logging for batch processing"""
        
        if self.config.save_processing_logs:
            os.makedirs(self.config.log_directory, exist_ok=True)
            
            # Create timestamped log file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_file = os.path.join(self.config.log_directory, f"batch_processing_{timestamp}.log")
            
            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(logging.INFO)
            
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            file_handler.setFormatter(formatter)
            
            # Add handler to logger
            batch_logger = logging.getLogger('voicecoach.batch_processing')
            batch_logger.addHandler(file_handler)
            batch_logger.setLevel(logging.INFO)
    
    def set_progress_callback(self, callback: Callable[[Dict[str, Any]], None]):
        """Set callback function for progress updates"""
        self.progress_callback = callback
    
    def process_directory(self, directory_path: str, 
                         recursive: bool = True,
                         file_patterns: Optional[List[str]] = None) -> BatchProcessingStats:
        """
        Process all supported documents in a directory.
        
        Args:
            directory_path: Path to directory containing documents
            recursive: Whether to process subdirectories
            file_patterns: Optional list of file patterns to filter
            
        Returns:
            BatchProcessingStats with processing results
        """
        
        start_time = datetime.now()
        logger.info(f"Starting batch processing of directory: {directory_path}")
        
        # Find all supported files
        files_to_process = self._find_supported_files(directory_path, recursive, file_patterns)
        
        if not files_to_process:
            logger.warning(f"No supported files found in: {directory_path}")
            return BatchProcessingStats(
                total_files=0,
                successful_files=0,
                failed_files=0,
                total_chunks=0,
                total_processing_time=0,
                avg_processing_time=0,
                total_errors=0,
                file_type_distribution={},
                category_distribution={},
                start_time=start_time.isoformat(),
                end_time=datetime.now().isoformat()
            )
        
        # Process files in parallel
        processing_results = self._process_files_parallel(files_to_process)
        
        # Generate statistics
        end_time = datetime.now()
        stats = self._generate_batch_stats(processing_results, start_time, end_time)
        
        logger.info(f"Batch processing completed. Processed {stats.successful_files}/{stats.total_files} files")
        
        return stats
    
    def process_file_list(self, file_paths: List[str]) -> BatchProcessingStats:
        """
        Process a specific list of files.
        
        Args:
            file_paths: List of file paths to process
            
        Returns:
            BatchProcessingStats with processing results
        """
        
        start_time = datetime.now()
        logger.info(f"Starting batch processing of {len(file_paths)} files")
        
        # Filter for supported files
        supported_files = [f for f in file_paths if self.document_processor.is_supported_format(f)]
        
        if len(supported_files) != len(file_paths):
            unsupported_count = len(file_paths) - len(supported_files)
            logger.warning(f"Skipping {unsupported_count} unsupported files")
        
        # Process files in parallel
        processing_results = self._process_files_parallel(supported_files)
        
        # Generate statistics
        end_time = datetime.now()
        stats = self._generate_batch_stats(processing_results, start_time, end_time)
        
        logger.info(f"File list processing completed. Processed {stats.successful_files}/{stats.total_files} files")
        
        return stats
    
    def _find_supported_files(self, directory_path: str, recursive: bool, 
                             file_patterns: Optional[List[str]]) -> List[str]:
        """Find all supported files in directory"""
        
        directory = Path(directory_path)
        
        if not directory.exists():
            raise FileNotFoundError(f"Directory not found: {directory_path}")
        
        supported_extensions = set(self.document_processor.SUPPORTED_FORMATS.keys())
        files = []
        
        # Use glob patterns if specified
        if file_patterns:
            for pattern in file_patterns:
                if recursive:
                    files.extend(directory.rglob(pattern))
                else:
                    files.extend(directory.glob(pattern))
        else:
            # Find all files with supported extensions
            if recursive:
                all_files = directory.rglob("*")
            else:
                all_files = directory.glob("*")
            
            files = [f for f in all_files if f.is_file() and f.suffix.lower() in supported_extensions]
        
        # Convert to string paths and filter for supported formats
        file_paths = [str(f) for f in files if self.document_processor.is_supported_format(str(f))]
        
        logger.info(f"Found {len(file_paths)} supported files")
        return file_paths
    
    def _process_files_parallel(self, file_paths: List[str]) -> List[ProcessingResult]:
        """Process files in parallel using ThreadPoolExecutor"""
        
        processing_results = []
        completed_count = 0
        
        with ThreadPoolExecutor(max_workers=self.config.max_workers) as executor:
            # Submit all processing tasks
            future_to_file = {
                executor.submit(self._process_single_file, file_path): file_path
                for file_path in file_paths
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_file):
                file_path = future_to_file[future]
                completed_count += 1
                
                try:
                    result = future.result()
                    processing_results.append(result)
                    
                    # Update progress
                    if self.config.enable_progress_tracking and self.progress_callback:
                        progress = {
                            'completed': completed_count,
                            'total': len(file_paths),
                            'current_file': file_path,
                            'success': result.success,
                            'percentage': (completed_count / len(file_paths)) * 100
                        }
                        self.progress_callback(progress)
                        
                except Exception as e:
                    logger.error(f"Unexpected error processing {file_path}: {e}")
                    processing_results.append(ProcessingResult(
                        success=False,
                        file_path=file_path,
                        processing_time=0,
                        chunks_created=0,
                        vector_ids=[],
                        errors=[str(e)],
                        metadata_summary={}
                    ))
        
        return processing_results
    
    def _process_single_file(self, file_path: str) -> ProcessingResult:
        """Process a single file through the complete pipeline"""
        
        start_time = time.time()
        errors = []
        vector_ids = []
        chunks_created = 0
        metadata_summary = {}
        
        try:
            logger.info(f"Processing file: {file_path}")
            
            # Step 1: Document processing
            processed_doc = self.document_processor.process_document(file_path)
            
            # Step 2: Metadata extraction
            extracted_metadata = self.metadata_extractor.extract_metadata(
                processed_doc.content, 
                processed_doc.metadata
            )
            
            # Step 3: Content chunking
            chunks = self.chunking_engine.chunk_document(
                processed_doc.content,
                processed_doc.metadata,
                strategy=self.config.chunking_strategy
            )
            
            chunks_created = len(chunks)
            
            # Step 4: Vector storage (if available)
            if self.vector_storage_available and self.vector_storage:
                vector_ids = self.vector_storage.add_document_chunks(chunks, extracted_metadata)
            
            # Generate metadata summary
            metadata_summary = self.metadata_extractor.get_metadata_summary(extracted_metadata)
            
            processing_time = time.time() - start_time
            
            logger.info(f"Successfully processed {file_path}: {chunks_created} chunks in {processing_time:.2f}s")
            
            return ProcessingResult(
                success=True,
                file_path=file_path,
                processing_time=processing_time,
                chunks_created=chunks_created,
                vector_ids=vector_ids,
                errors=errors,
                metadata_summary=metadata_summary
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            error_msg = str(e)
            errors.append(error_msg)
            
            logger.error(f"Failed to process {file_path}: {error_msg}")
            
            return ProcessingResult(
                success=False,
                file_path=file_path,
                processing_time=processing_time,
                chunks_created=chunks_created,
                vector_ids=vector_ids,
                errors=errors,
                metadata_summary=metadata_summary
            )
    
    def _generate_batch_stats(self, results: List[ProcessingResult], 
                             start_time: datetime, end_time: datetime) -> BatchProcessingStats:
        """Generate comprehensive statistics for batch processing"""
        
        successful_results = [r for r in results if r.success]
        failed_results = [r for r in results if not r.success]
        
        total_chunks = sum(r.chunks_created for r in successful_results)
        total_processing_time = sum(r.processing_time for r in results)
        total_errors = sum(len(r.errors) for r in results)
        
        # File type distribution
        file_type_distribution = {}
        for result in results:
            file_ext = Path(result.file_path).suffix.lower()
            file_type_distribution[file_ext] = file_type_distribution.get(file_ext, 0) + 1
        
        # Category distribution
        category_distribution = {}
        for result in successful_results:
            category = result.metadata_summary.get('training_category', 'unknown')
            category_distribution[category] = category_distribution.get(category, 0) + 1
        
        return BatchProcessingStats(
            total_files=len(results),
            successful_files=len(successful_results),
            failed_files=len(failed_results),
            total_chunks=total_chunks,
            total_processing_time=total_processing_time,
            avg_processing_time=total_processing_time / len(results) if results else 0,
            total_errors=total_errors,
            file_type_distribution=file_type_distribution,
            category_distribution=category_distribution,
            start_time=start_time.isoformat(),
            end_time=end_time.isoformat()
        )
    
    def save_processing_report(self, stats: BatchProcessingStats, 
                              results: Optional[List[ProcessingResult]] = None,
                              output_file: Optional[str] = None) -> str:
        """Save detailed processing report to JSON file"""
        
        if output_file is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join(self.config.log_directory, f"processing_report_{timestamp}.json")
        
        # Prepare report data
        report_data = {
            'batch_stats': asdict(stats),
            'config': asdict(self.config),
            'processing_results': [asdict(r) for r in results] if results else [],
            'generated_at': datetime.now().isoformat()
        }
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        # Save report
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Processing report saved to: {output_file}")
        return output_file
    
    def get_vector_storage_stats(self) -> Optional[Dict[str, Any]]:
        """Get statistics from vector storage"""
        
        if self.vector_storage_available and self.vector_storage:
            return self.vector_storage.get_collection_stats()
        else:
            return None
    
    def cleanup_failed_documents(self, results: List[ProcessingResult]) -> int:
        """Clean up any partially processed documents from vector storage"""
        
        if not self.vector_storage_available or not self.vector_storage:
            return 0
        
        cleanup_count = 0
        failed_results = [r for r in results if not r.success and r.vector_ids]
        
        for result in failed_results:
            for vector_id in result.vector_ids:
                if self.vector_storage.delete_document(vector_id):
                    cleanup_count += 1
        
        if cleanup_count > 0:
            logger.info(f"Cleaned up {cleanup_count} partially processed documents")
        
        return cleanup_count
    
    def update_existing_document(self, file_path: str) -> ProcessingResult:
        """Update an existing document in the knowledge base"""
        
        if not self.vector_storage_available or not self.vector_storage:
            raise RuntimeError("Vector storage not available for document updates")
        
        # Delete existing chunks for this document
        source_document = Path(file_path).name
        deleted_count = self.vector_storage.delete_documents_by_source(source_document)
        
        if deleted_count > 0:
            logger.info(f"Deleted {deleted_count} existing chunks for: {source_document}")
        
        # Process document with new content
        return self._process_single_file(file_path)
    
    def validate_knowledge_base(self) -> Dict[str, Any]:
        """Validate the integrity of the knowledge base"""
        
        validation_results = {
            'vector_storage_available': self.vector_storage_available,
            'collection_stats': None,
            'validation_errors': [],
            'recommendations': []
        }
        
        if self.vector_storage_available and self.vector_storage:
            try:
                validation_results['collection_stats'] = self.vector_storage.get_collection_stats()
                
                # Check for common issues
                stats = validation_results['collection_stats']
                
                if stats.get('total_documents', 0) == 0:
                    validation_results['validation_errors'].append("Knowledge base is empty")
                    validation_results['recommendations'].append("Process sales documents to populate knowledge base")
                
                # Check document type distribution
                doc_types = stats.get('document_types', {})
                if len(doc_types) < 3:
                    validation_results['recommendations'].append(
                        "Consider adding more diverse document types for comprehensive coverage"
                    )
                
                # Check for missing critical categories
                training_categories = stats.get('training_categories', {})
                critical_categories = ['objection_handling', 'sales_methodology', 'product_training']
                missing_categories = [cat for cat in critical_categories if cat not in training_categories]
                
                if missing_categories:
                    validation_results['recommendations'].append(
                        f"Consider adding documents for: {', '.join(missing_categories)}"
                    )
                
            except Exception as e:
                validation_results['validation_errors'].append(f"Vector storage validation failed: {e}")
        
        return validation_results