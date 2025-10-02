"""
Command Line Interface for VoiceCoach Knowledge Engine
Provides easy management of document ingestion and testing
"""

import argparse
import logging
import sys
from pathlib import Path
from typing import Dict, Any

from .chroma_client import vector_db
from .document_processor import document_processor
from .rag_system import rag_system, CoachingContext
from .sample_data import create_sample_sales_materials


def setup_logging(level: str = "INFO"):
    """Setup logging configuration."""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('knowledge_engine.log')
        ]
    )


def ingest_documents_command(args):
    """Handle document ingestion command."""
    print(f"🔄 Starting document ingestion from: {args.directory}")
    
    try:
        stats = rag_system.ingest_documents(args.directory)
        
        print("\n✅ Ingestion completed successfully!")
        print("\n📊 Document Statistics:")
        for collection, count in stats.items():
            print(f"  • {collection}: {count} chunks")
        
        total_chunks = sum(stats.values())
        print(f"\n🎯 Total: {total_chunks} document chunks ingested")
        
    except Exception as e:
        print(f"❌ Ingestion failed: {e}")
        sys.exit(1)


def create_samples_command(args):
    """Handle sample data creation command."""
    print("🔄 Creating sample sales materials...")
    
    try:
        output_dir = create_sample_sales_materials(args.output)
        print(f"✅ Sample materials created in: {output_dir}")
        
        if args.ingest:
            print("🔄 Ingesting sample materials into vector database...")
            stats = rag_system.ingest_documents(output_dir)
            
            print("\n📊 Sample Data Ingestion Results:")
            for collection, count in stats.items():
                print(f"  • {collection}: {count} chunks")
                
            total_chunks = sum(stats.values())
            print(f"\n🎯 Total: {total_chunks} sample chunks ready for testing")
        
    except Exception as e:
        print(f"❌ Sample creation failed: {e}")
        sys.exit(1)


def test_query_command(args):
    """Handle test query command."""
    print(f"🔍 Testing query: '{args.query}'")
    print(f"🎯 Context: {args.context}")
    
    try:
        context = CoachingContext(args.context)
        results = rag_system.retrieve_knowledge(
            query=args.query,
            context=context,
            max_snippets=args.max_results
        )
        
        print(f"\n📋 Found {len(results)} relevant knowledge snippets:")
        
        for i, snippet in enumerate(results, 1):
            print(f"\n{i}. Relevance: {snippet.relevance_score:.2f}")
            print(f"   Source: {snippet.source}")
            print(f"   Content: {snippet.content[:200]}...")
            
            if snippet.metadata:
                print(f"   Metadata: {snippet.metadata.get('content_type', 'N/A')}")
        
        if not results:
            print("❌ No relevant knowledge found. Try different query or check if documents are ingested.")
            
    except Exception as e:
        print(f"❌ Query test failed: {e}")
        sys.exit(1)


def coaching_prompts_command(args):
    """Handle coaching prompts generation command."""
    print(f"🤖 Generating coaching prompts for conversation:")
    print(f"💬 '{args.conversation}'")
    print(f"🎯 Context: {args.context}")
    
    try:
        context = CoachingContext(args.context)
        prompts = rag_system.generate_coaching_prompts(
            conversation_snippet=args.conversation,
            context=context
        )
        
        print(f"\n🎯 Primary Coaching Prompt:")
        print(f"   {prompts['primary_prompt']}")
        
        print(f"\n💡 Knowledge Snippets ({len(prompts['knowledge_snippets'])}):")
        for snippet in prompts['knowledge_snippets']:
            print(f"   {snippet}")
        
        print(f"\n💬 Suggested Responses ({len(prompts['suggested_responses'])}):")
        for response in prompts['suggested_responses']:
            print(f"   {response}")
        
        print(f"\n🎯 Next Best Actions ({len(prompts['next_best_actions'])}):")
        for action in prompts['next_best_actions']:
            print(f"   • {action}")
        
        print(f"\n📊 Metrics:")
        print(f"   Confidence Score: {prompts['confidence_score']:.2f}")
        print(f"   Retrieval Time: {prompts['retrieval_time_ms']:.1f}ms")
        
    except Exception as e:
        print(f"❌ Coaching prompt generation failed: {e}")
        sys.exit(1)


def stats_command(args):
    """Handle system statistics command."""
    print("📊 VoiceCoach Knowledge Engine Statistics")
    print("=" * 50)
    
    try:
        stats = rag_system.get_system_stats()
        
        # Performance stats
        perf = stats['performance']
        print(f"\n⚡ Performance Metrics:")
        print(f"   Average Query Time: {perf['avg_retrieval_time_ms']:.1f}ms")
        print(f"   Total Queries: {perf['total_retrievals']}")
        print(f"   Performance Target: {perf['performance_target']}")
        print(f"   Status: {perf['performance_status']}")
        
        # Collection stats
        print(f"\n📚 Collections:")
        for name, collection_stats in stats['collections'].items():
            if 'error' in collection_stats:
                print(f"   ❌ {name}: {collection_stats['error']}")
            else:
                count = collection_stats.get('document_count', 0)
                print(f"   📖 {name}: {count} documents")
        
        # ChromaDB stats
        all_collections = vector_db.list_collections()
        print(f"\n🗄️ Database Collections ({len(all_collections)}):")
        for collection in all_collections:
            print(f"   • {collection['name']}: {collection['count']} chunks")
        
    except Exception as e:
        print(f"❌ Failed to get statistics: {e}")
        sys.exit(1)


def reset_command(args):
    """Handle database reset command."""
    if not args.confirm:
        response = input("⚠️ This will delete all vector data. Are you sure? (yes/no): ")
        if response.lower() != 'yes':
            print("❌ Reset cancelled.")
            return
    
    print("🔄 Resetting vector database...")
    
    try:
        # Delete all collections
        collections = vector_db.list_collections()
        for collection in collections:
            vector_db.delete_collection(collection['name'])
            print(f"   ✅ Deleted collection: {collection['name']}")
        
        # Reset performance metrics
        vector_db.reset_performance_metrics()
        rag_system.retrieval_times = []
        
        print("✅ Vector database reset completed!")
        print("💡 Use 'create-samples --ingest' to reload test data")
        
    except Exception as e:
        print(f"❌ Reset failed: {e}")
        sys.exit(1)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="VoiceCoach Knowledge Engine CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create and ingest sample data
  python -m knowledge_engine.cli create-samples --ingest
  
  # Ingest your sales materials
  python -m knowledge_engine.cli ingest /path/to/sales/docs
  
  # Test a query
  python -m knowledge_engine.cli test-query "How to handle price objections" --context objection_handling
  
  # Generate coaching prompts  
  python -m knowledge_engine.cli coaching-prompts "Customer says it's too expensive" --context pricing_discussion
  
  # View system statistics
  python -m knowledge_engine.cli stats
        """
    )
    
    parser.add_argument('--log-level', default='INFO', 
                       choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
                       help='Set logging level')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Ingest documents command
    ingest_parser = subparsers.add_parser('ingest', help='Ingest documents into vector database')
    ingest_parser.add_argument('directory', help='Directory containing documents to ingest')
    ingest_parser.set_defaults(func=ingest_documents_command)
    
    # Create samples command
    samples_parser = subparsers.add_parser('create-samples', help='Create sample sales materials')
    samples_parser.add_argument('--output', help='Output directory (default: temp directory)')
    samples_parser.add_argument('--ingest', action='store_true', 
                                help='Also ingest samples into vector database')
    samples_parser.set_defaults(func=create_samples_command)
    
    # Test query command
    query_parser = subparsers.add_parser('test-query', help='Test knowledge retrieval query')
    query_parser.add_argument('query', help='Query to search for')
    query_parser.add_argument('--context', default='general', 
                             choices=[ctx.value for ctx in CoachingContext],
                             help='Coaching context for query')
    query_parser.add_argument('--max-results', type=int, default=5,
                             help='Maximum number of results to return')
    query_parser.set_defaults(func=test_query_command)
    
    # Coaching prompts command  
    prompts_parser = subparsers.add_parser('coaching-prompts', 
                                          help='Generate coaching prompts from conversation')
    prompts_parser.add_argument('conversation', help='Conversation snippet to analyze')
    prompts_parser.add_argument('--context', default='general',
                               choices=[ctx.value for ctx in CoachingContext], 
                               help='Coaching context')
    prompts_parser.set_defaults(func=coaching_prompts_command)
    
    # Statistics command
    stats_parser = subparsers.add_parser('stats', help='Show system statistics')
    stats_parser.set_defaults(func=stats_command)
    
    # Reset command
    reset_parser = subparsers.add_parser('reset', help='Reset vector database (delete all data)')
    reset_parser.add_argument('--confirm', action='store_true',
                             help='Skip confirmation prompt')
    reset_parser.set_defaults(func=reset_command)
    
    # Parse arguments and execute
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Setup logging
    setup_logging(args.log_level)
    
    # Execute command
    args.func(args)


if __name__ == '__main__':
    main()