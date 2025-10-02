"""
VoiceCoach Document Processing Pipeline CLI
Command-line interface for managing sales knowledge ingestion
"""

import argparse
import sys
import logging
import json
from pathlib import Path
from typing import Dict, Any, Optional

from .batch_processor import BatchProcessor, BatchProcessingConfig
from .vector_storage import ChromaDBIntegration

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def setup_cli_parser() -> argparse.ArgumentParser:
    """Setup command-line argument parser"""
    
    parser = argparse.ArgumentParser(
        description="VoiceCoach Document Processing Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process all documents in a directory
  python -m document_processing.pipeline_cli process-directory ./sales_docs/

  # Process specific files
  python -m document_processing.pipeline_cli process-files file1.pdf file2.docx

  # Search knowledge base
  python -m document_processing.pipeline_cli search "how to handle price objections"

  # Get knowledge base statistics
  python -m document_processing.pipeline_cli stats

  # Reset knowledge base (careful!)
  python -m document_processing.pipeline_cli reset --confirm
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Process directory command
    process_dir_parser = subparsers.add_parser(
        'process-directory',
        help='Process all supported documents in a directory'
    )
    process_dir_parser.add_argument(
        'directory',
        help='Directory path containing sales documents'
    )
    process_dir_parser.add_argument(
        '--recursive', '-r',
        action='store_true',
        help='Process subdirectories recursively'
    )
    process_dir_parser.add_argument(
        '--pattern',
        action='append',
        help='File patterns to include (e.g., "*.pdf")'
    )
    
    # Process files command
    process_files_parser = subparsers.add_parser(
        'process-files',
        help='Process specific files'
    )
    process_files_parser.add_argument(
        'files',
        nargs='+',
        help='File paths to process'
    )
    
    # Search command
    search_parser = subparsers.add_parser(
        'search',
        help='Search the knowledge base'
    )
    search_parser.add_argument(
        'query',
        help='Search query text'
    )
    search_parser.add_argument(
        '--results', '-n',
        type=int,
        default=10,
        help='Number of results to return (default: 10)'
    )
    search_parser.add_argument(
        '--type',
        help='Filter by document type'
    )
    search_parser.add_argument(
        '--stage',
        help='Filter by sales stage'
    )
    
    # Statistics command
    stats_parser = subparsers.add_parser(
        'stats',
        help='Show knowledge base statistics'
    )
    
    # Validate command
    validate_parser = subparsers.add_parser(
        'validate',
        help='Validate knowledge base integrity'
    )
    
    # Reset command
    reset_parser = subparsers.add_parser(
        'reset',
        help='Reset the knowledge base (deletes all data)'
    )
    reset_parser.add_argument(
        '--confirm',
        action='store_true',
        help='Confirm the reset operation'
    )
    
    # Configuration options
    parser.add_argument(
        '--config',
        help='Configuration file path (JSON format)'
    )
    parser.add_argument(
        '--collection',
        default='voicecoach_sales_knowledge',
        help='ChromaDB collection name'
    )
    parser.add_argument(
        '--persist-dir',
        default='./chromadb_data',
        help='ChromaDB persistence directory'
    )
    parser.add_argument(
        '--workers',
        type=int,
        default=4,
        help='Number of parallel workers'
    )
    parser.add_argument(
        '--chunk-size',
        type=int,
        default=512,
        help='Chunk size in tokens'
    )
    parser.add_argument(
        '--chunking-strategy',
        choices=['semantic', 'fixed', 'semantic_large', 'fixed_small'],
        default='semantic',
        help='Chunking strategy to use'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    
    return parser

def load_config(config_path: Optional[str]) -> Dict[str, Any]:
    """Load configuration from JSON file"""
    
    if not config_path:
        return {}
    
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load config from {config_path}: {e}")
        return {}

def create_batch_processor(args: argparse.Namespace) -> BatchProcessor:
    """Create BatchProcessor with CLI arguments"""
    
    # Load configuration file if specified
    file_config = load_config(args.config)
    
    # Create configuration
    config = BatchProcessingConfig(
        max_workers=args.workers,
        chunk_size=args.chunk_size,
        chunking_strategy=args.chunking_strategy,
        collection_name=args.collection,
        persist_directory=args.persist_dir,
        enable_progress_tracking=True,
        save_processing_logs=True
    )
    
    # Override with file config
    for key, value in file_config.items():
        if hasattr(config, key):
            setattr(config, key, value)
    
    return BatchProcessor(config)

def progress_callback(progress: Dict[str, Any]):
    """Progress callback for batch processing"""
    percentage = progress.get('percentage', 0)
    current_file = Path(progress.get('current_file', '')).name
    status = "✅" if progress.get('success', False) else "❌"
    
    print(f"\r{status} Progress: {percentage:.1f}% ({progress['completed']}/{progress['total']}) - {current_file}", end='', flush=True)
    
    if progress['completed'] == progress['total']:
        print()  # New line when complete

def command_process_directory(args: argparse.Namespace) -> int:
    """Handle process-directory command"""
    
    try:
        processor = create_batch_processor(args)
        processor.set_progress_callback(progress_callback)
        
        print(f"Processing directory: {args.directory}")
        print(f"Recursive: {args.recursive}")
        print(f"Workers: {args.workers}")
        print(f"Chunking strategy: {args.chunking_strategy}")
        print()
        
        stats = processor.process_directory(
            args.directory,
            recursive=args.recursive,
            file_patterns=args.pattern
        )
        
        # Print results
        print(f"\n📊 Processing Results:")
        print(f"   Total files: {stats.total_files}")
        print(f"   Successful: {stats.successful_files}")
        print(f"   Failed: {stats.failed_files}")
        print(f"   Total chunks: {stats.total_chunks}")
        print(f"   Processing time: {stats.total_processing_time:.2f}s")
        print(f"   Average time per file: {stats.avg_processing_time:.2f}s")
        
        if stats.file_type_distribution:
            print(f"\n📄 File Types:")
            for file_type, count in stats.file_type_distribution.items():
                print(f"   {file_type}: {count}")
        
        if stats.category_distribution:
            print(f"\n🏷️  Training Categories:")
            for category, count in stats.category_distribution.items():
                print(f"   {category}: {count}")
        
        # Save detailed report
        # report_file = processor.save_processing_report(stats)
        # print(f"\n📋 Detailed report saved to: {report_file}")
        
        return 0 if stats.failed_files == 0 else 1
        
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        return 1

def command_process_files(args: argparse.Namespace) -> int:
    """Handle process-files command"""
    
    try:
        processor = create_batch_processor(args)
        processor.set_progress_callback(progress_callback)
        
        print(f"Processing {len(args.files)} files")
        print(f"Workers: {args.workers}")
        print(f"Chunking strategy: {args.chunking_strategy}")
        print()
        
        stats = processor.process_file_list(args.files)
        
        # Print results
        print(f"\n📊 Processing Results:")
        print(f"   Total files: {stats.total_files}")
        print(f"   Successful: {stats.successful_files}")
        print(f"   Failed: {stats.failed_files}")
        print(f"   Total chunks: {stats.total_chunks}")
        print(f"   Processing time: {stats.total_processing_time:.2f}s")
        
        return 0 if stats.failed_files == 0 else 1
        
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        return 1

def command_search(args: argparse.Namespace) -> int:
    """Handle search command"""
    
    try:
        # Create vector storage
        vector_storage = ChromaDBIntegration(
            collection_name=args.collection,
            persist_directory=args.persist_dir
        )
        
        # Build search filters
        filters = {}
        if args.type:
            filters['document_type'] = args.type
        if args.stage:
            filters['sales_stage'] = args.stage
        
        print(f"Searching for: '{args.query}'")
        if filters:
            print(f"Filters: {filters}")
        print()
        
        # Perform search
        results = vector_storage.search_knowledge(
            query=args.query,
            n_results=args.results,
            filters=filters
        )
        
        if not results:
            print("No results found.")
            return 0
        
        # Display results
        print(f"Found {len(results)} results:\n")
        
        for i, result in enumerate(results, 1):
            print(f"🔍 Result #{i} (Score: {result.similarity_score:.3f})")
            print(f"   Source: {result.document.metadata.get('source_document', 'Unknown')}")
            print(f"   Type: {result.document.metadata.get('document_type', 'Unknown')}")
            print(f"   Category: {result.document.metadata.get('training_category', 'Unknown')}")
            
            # Show content preview
            content_preview = result.document.content[:200] + "..." if len(result.document.content) > 200 else result.document.content
            print(f"   Content: {content_preview}")
            
            # Show sales context if available
            if result.chunk_context and result.chunk_context.get('sales_indicators'):
                indicators = result.chunk_context['sales_indicators']
                active_indicators = [k for k, v in indicators.items() if v and k.startswith('contains_')]
                if active_indicators:
                    print(f"   Sales Context: {', '.join(active_indicators)}")
            
            print()
        
        return 0
        
    except Exception as e:
        logger.error(f"Search failed: {e}")
        return 1

def command_stats(args: argparse.Namespace) -> int:
    """Handle stats command"""
    
    try:
        vector_storage = ChromaDBIntegration(
            collection_name=args.collection,
            persist_directory=args.persist_dir
        )
        
        stats = vector_storage.get_collection_stats()
        
        print("📊 Knowledge Base Statistics\n")
        print(f"Collection: {stats.get('collection_name', 'Unknown')}")
        print(f"Total Documents: {stats.get('total_documents', 0)}")
        print(f"Embedding Model: {stats.get('embedding_model', 'Unknown')}")
        print()
        
        # Document types
        doc_types = stats.get('document_types', {})
        if doc_types:
            print("📄 Document Types:")
            for doc_type, count in doc_types.items():
                print(f"   {doc_type}: {count}")
            print()
        
        # Training categories
        training_cats = stats.get('training_categories', {})
        if training_cats:
            print("🏷️  Training Categories:")
            for category, count in training_cats.items():
                print(f"   {category}: {count}")
            print()
        
        # Sales stages
        sales_stages = stats.get('sales_stages', {})
        if sales_stages:
            print("🎯 Sales Stages:")
            for stage, count in sales_stages.items():
                print(f"   {stage}: {count}")
            print()
        
        # Difficulty levels
        difficulty_levels = stats.get('difficulty_levels', {})
        if difficulty_levels:
            print("📈 Difficulty Levels:")
            for level, count in difficulty_levels.items():
                print(f"   {level}: {count}")
        
        return 0
        
    except Exception as e:
        logger.error(f"Stats retrieval failed: {e}")
        return 1

def command_validate(args: argparse.Namespace) -> int:
    """Handle validate command"""
    
    try:
        processor = create_batch_processor(args)
        validation_results = processor.validate_knowledge_base()
        
        print("🔍 Knowledge Base Validation\n")
        
        # Vector storage status
        if validation_results['vector_storage_available']:
            print("✅ Vector storage: Available")
        else:
            print("❌ Vector storage: Not available")
            return 1
        
        # Collection stats
        if validation_results['collection_stats']:
            stats = validation_results['collection_stats']
            total_docs = stats.get('total_documents', 0)
            print(f"📊 Total documents: {total_docs}")
            
            if total_docs == 0:
                print("⚠️  Knowledge base is empty")
        
        # Validation errors
        errors = validation_results.get('validation_errors', [])
        if errors:
            print("\n❌ Validation Errors:")
            for error in errors:
                print(f"   • {error}")
        
        # Recommendations
        recommendations = validation_results.get('recommendations', [])
        if recommendations:
            print("\n💡 Recommendations:")
            for rec in recommendations:
                print(f"   • {rec}")
        
        if not errors:
            print("\n✅ Validation passed!")
            return 0
        else:
            return 1
        
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        return 1

def command_reset(args: argparse.Namespace) -> int:
    """Handle reset command"""
    
    if not args.confirm:
        print("❌ Reset requires --confirm flag to prevent accidental data loss")
        print("   Use: python -m document_processing.pipeline_cli reset --confirm")
        return 1
    
    try:
        vector_storage = ChromaDBIntegration(
            collection_name=args.collection,
            persist_directory=args.persist_dir
        )
        
        print("⚠️  Resetting knowledge base...")
        print("   This will delete ALL documents and cannot be undone!")
        
        # Double confirmation
        response = input("Type 'RESET' to confirm: ")
        if response != 'RESET':
            print("Reset cancelled.")
            return 0
        
        success = vector_storage.reset_collection()
        
        if success:
            print("✅ Knowledge base reset successfully")
            return 0
        else:
            print("❌ Reset failed")
            return 1
        
    except Exception as e:
        logger.error(f"Reset failed: {e}")
        return 1

def main():
    """Main CLI entry point"""
    
    parser = setup_cli_parser()
    args = parser.parse_args()
    
    # Setup verbose logging if requested
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Handle commands
    if args.command == 'process-directory':
        return command_process_directory(args)
    elif args.command == 'process-files':
        return command_process_files(args)
    elif args.command == 'search':
        return command_search(args)
    elif args.command == 'stats':
        return command_stats(args)
    elif args.command == 'validate':
        return command_validate(args)
    elif args.command == 'reset':
        return command_reset(args)
    else:
        parser.print_help()
        return 1

if __name__ == '__main__':
    sys.exit(main())