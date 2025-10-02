# VoiceCoach Document Processing Pipeline
# Automated knowledge ingestion system for sales coaching

__version__ = "1.0.0"
__author__ = "VoiceCoach AI Backend Engineer"

from .document_processor import DocumentProcessor
from .chunking_engine import ChunkingEngine  
from .metadata_extractor import MetadataExtractor
from .vector_storage import ChromaDBIntegration
from .batch_processor import BatchProcessor

__all__ = [
    "DocumentProcessor",
    "ChunkingEngine", 
    "MetadataExtractor",
    "ChromaDBIntegration",
    "BatchProcessor"
]