"""
VoiceCoach Document Processing Pipeline - Sample Usage Examples
Demonstrates key functionality for sales knowledge ingestion
"""

import os
import sys
from pathlib import Path

# Add document_processing to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from document_processing import (
    DocumentProcessor, 
    ChunkingEngine, 
    MetadataExtractor,
    ChromaDBIntegration,
    BatchProcessor,
    BatchProcessingConfig
)

def example_single_document_processing():
    """Example: Process a single sales document"""
    
    print("🔄 Example 1: Single Document Processing")
    print("=" * 50)
    
    # Initialize components
    processor = DocumentProcessor()
    metadata_extractor = MetadataExtractor()
    chunker = ChunkingEngine(default_strategy="semantic")
    
    # Sample document path (you would use real files)
    sample_doc_path = "sample_sales_playbook.pdf"
    
    # Check if sample file exists (create dummy content for demo)
    if not os.path.exists(sample_doc_path):
        print(f"📄 Creating sample document: {sample_doc_path}")
        create_sample_document(sample_doc_path)
    
    try:
        # Step 1: Process document
        print(f"📖 Processing: {sample_doc_path}")
        processed_doc = processor.process_document(sample_doc_path)
        
        print(f"   ✅ Extracted {processed_doc.word_count} words, {processed_doc.token_count} tokens")
        print(f"   ⏱️  Processing time: {processed_doc.processing_time:.2f}s")
        
        # Step 2: Extract metadata
        print("🔍 Extracting sales metadata...")
        metadata = metadata_extractor.extract_metadata(processed_doc.content, processed_doc.metadata)
        
        print(f"   📋 Document type: {metadata.document_type}")
        print(f"   🎯 Sales methodology: {metadata.sales_methodology}")
        print(f"   👥 Target audience: {', '.join(metadata.target_audience)}")
        print(f"   🏷️  Training category: {metadata.training_category}")
        print(f"   📊 Confidence score: {metadata.confidence_score:.2f}")
        
        if metadata.objection_types:
            print(f"   🛡️  Objection types: {', '.join(metadata.objection_types)}")
        
        # Step 3: Create chunks
        print("✂️  Creating knowledge chunks...")
        chunks = chunker.chunk_document(processed_doc.content, processed_doc.metadata)
        
        print(f"   📦 Created {len(chunks)} chunks")
        print(f"   📏 Average chunk size: {sum(c.token_count for c in chunks) / len(chunks):.0f} tokens")
        
        # Show sample chunk
        if chunks:
            sample_chunk = chunks[0]
            print(f"   📝 Sample chunk preview: {sample_chunk.content[:150]}...")
            
            # Show sales context
            if sample_chunk.sales_context:
                context_flags = [k for k, v in sample_chunk.sales_context.items() if v and k.startswith('contains_')]
                if context_flags:
                    print(f"   🎯 Sales context: {', '.join(context_flags)}")
        
        print("✅ Single document processing completed!\n")
        return processed_doc, metadata, chunks
        
    except Exception as e:
        print(f"❌ Error processing document: {e}")
        return None, None, None

def example_batch_processing():
    """Example: Batch process multiple sales documents"""
    
    print("🔄 Example 2: Batch Document Processing")
    print("=" * 50)
    
    # Create sample directory with multiple documents
    sample_dir = "sample_sales_docs"
    create_sample_directory(sample_dir)
    
    # Configure batch processing
    config = BatchProcessingConfig(
        max_workers=2,  # Reduced for demo
        chunk_size=512,
        chunking_strategy="semantic",
        enable_progress_tracking=True,
        save_processing_logs=True
    )
    
    # Initialize batch processor
    processor = BatchProcessor(config)
    
    # Set up progress tracking
    def progress_callback(progress):
        percentage = progress.get('percentage', 0)
        current_file = Path(progress.get('current_file', '')).name
        status = "✅" if progress.get('success', False) else "❌"
        print(f"   {status} Progress: {percentage:.1f}% - {current_file}")
    
    processor.set_progress_callback(progress_callback)
    
    try:
        print(f"📂 Processing directory: {sample_dir}")
        print("📊 Progress tracking enabled...")
        
        # Process all documents in directory
        stats = processor.process_directory(sample_dir, recursive=True)
        
        # Display results
        print(f"\n📈 Batch Processing Results:")
        print(f"   📄 Total files: {stats.total_files}")
        print(f"   ✅ Successful: {stats.successful_files}")
        print(f"   ❌ Failed: {stats.failed_files}")
        print(f"   📦 Total chunks: {stats.total_chunks}")
        print(f"   ⏱️  Total time: {stats.total_processing_time:.2f}s")
        print(f"   📊 Average per file: {stats.avg_processing_time:.2f}s")
        
        if stats.file_type_distribution:
            print(f"\n📋 File Types Processed:")
            for file_type, count in stats.file_type_distribution.items():
                print(f"   {file_type}: {count} files")
        
        if stats.category_distribution:
            print(f"\n🏷️  Training Categories:")
            for category, count in stats.category_distribution.items():
                print(f"   {category}: {count} documents")
        
        print("✅ Batch processing completed!\n")
        return stats
        
    except Exception as e:
        print(f"❌ Error in batch processing: {e}")
        return None

def example_vector_storage_integration():
    """Example: Vector storage and search integration"""
    
    print("🔄 Example 3: Vector Storage Integration")
    print("=" * 50)
    
    try:
        # Initialize vector storage
        print("🗄️  Initializing ChromaDB vector storage...")
        vector_storage = ChromaDBIntegration(
            collection_name="voicecoach_demo",
            persist_directory="./demo_chromadb",
            embedding_model="sentence-transformers/all-MiniLM-L6-v2"
        )
        
        # Get collection statistics
        stats = vector_storage.get_collection_stats()
        print(f"   📊 Collection stats: {stats.get('total_documents', 0)} documents")
        
        # Demo search queries
        demo_queries = [
            "how to handle price objections",
            "SPIN selling methodology",
            "closing techniques for enterprise sales",
            "competitor comparison strategies"
        ]
        
        print(f"\n🔍 Testing search functionality...")
        
        for query in demo_queries:
            print(f"\n   Query: '{query}'")
            
            # Perform search
            results = vector_storage.search_knowledge(
                query=query,
                n_results=3
            )
            
            if results:
                print(f"   📋 Found {len(results)} results:")
                for i, result in enumerate(results, 1):
                    score = result.similarity_score
                    source = result.document.metadata.get('source_document', 'Unknown')
                    doc_type = result.document.metadata.get('document_type', 'Unknown')
                    
                    print(f"      {i}. Score: {score:.3f} | Source: {source} | Type: {doc_type}")
                    
                    # Show content preview
                    content_preview = result.document.content[:100] + "..."
                    print(f"         Preview: {content_preview}")
            else:
                print("   📭 No results found")
        
        # Demo sales-context search
        print(f"\n🎯 Testing sales-context aware search...")
        
        sales_scenario = "Customer says our price is too high compared to competitors"
        context = {
            'stage': 'handling_objections',
            'difficulty': 'intermediate',
            'max_results': 5
        }
        
        print(f"   Scenario: {sales_scenario}")
        print(f"   Context: {context}")
        
        results = vector_storage.search_by_sales_context(sales_scenario, context)
        
        if results:
            print(f"   🎯 Context-aware results: {len(results)} found")
            for result in results[:2]:  # Show top 2
                sales_indicators = result.chunk_context.get('sales_indicators', {})
                active_indicators = [k for k, v in sales_indicators.items() if v]
                
                print(f"      Score: {result.similarity_score:.3f}")
                print(f"      Sales context: {', '.join(active_indicators)}")
                print(f"      Content: {result.document.content[:80]}...")
        else:
            print("   📭 No context-aware results found")
        
        print("✅ Vector storage integration completed!\n")
        return vector_storage
        
    except ImportError:
        print("⚠️  ChromaDB not available. Skipping vector storage example.")
        print("   Install with: pip install chromadb")
        return None
    except Exception as e:
        print(f"❌ Error in vector storage integration: {e}")
        return None

def example_real_time_coaching_simulation():
    """Example: Simulate real-time coaching scenario"""
    
    print("🔄 Example 4: Real-Time Coaching Simulation")
    print("=" * 50)
    
    # Simulate a sales call scenario
    scenarios = [
        {
            'conversation': "Customer: 'I need to think about it and discuss with my team.'",
            'context': {'stage': 'closing', 'objection_type': 'timing'},
            'query': 'handling think it over objection closing techniques'
        },
        {
            'conversation': "Customer: 'Your solution seems too complex for our small team.'",
            'context': {'stage': 'presentation', 'objection_type': 'feature'},
            'query': 'simplifying complex solutions small business objections'
        },
        {
            'conversation': "Customer: 'We're happy with our current vendor.'",
            'context': {'stage': 'discovery', 'objection_type': 'need'},
            'query': 'switching from competitor status quo objection'
        }
    ]
    
    try:
        # Initialize vector storage for coaching
        vector_storage = ChromaDBIntegration(
            collection_name="voicecoach_demo",
            persist_directory="./demo_chromadb"
        )
        
        print("🎭 Simulating real-time sales coaching scenarios...\n")
        
        for i, scenario in enumerate(scenarios, 1):
            print(f"📞 Scenario {i}:")
            print(f"   💬 {scenario['conversation']}")
            print(f"   🎯 Context: {scenario['context']}")
            
            # Search for relevant coaching content
            results = vector_storage.search_knowledge(
                query=scenario['query'],
                n_results=2,
                sales_context={
                    'sales_stage': scenario['context']['stage'],
                    'need_objection_handling': True
                }
            )
            
            if results:
                print(f"   💡 AI Coaching Suggestions:")
                for j, result in enumerate(results, 1):
                    confidence = result.similarity_score
                    suggestion = result.document.content[:200] + "..."
                    
                    print(f"      {j}. Confidence: {confidence:.2f}")
                    print(f"         💭 {suggestion}")
                    
                    # Show coaching context
                    if result.chunk_context:
                        doc_info = result.chunk_context.get('document_info', {})
                        methodology = doc_info.get('sales_methodology')
                        if methodology:
                            print(f"         📚 From: {methodology} methodology")
            else:
                print(f"   📭 No coaching suggestions found")
            
            print()
        
        print("✅ Real-time coaching simulation completed!\n")
        
    except Exception as e:
        print(f"❌ Error in coaching simulation: {e}")

def create_sample_document(file_path: str):
    """Create a sample sales document for testing"""
    
    sample_content = """
    # Sales Objection Handling Guide
    
    ## Price Objections
    
    When customers say "your price is too high", use the SPIN methodology:
    
    1. **Situation Questions**: "What budget range were you considering?"
    2. **Problem Questions**: "What happens if you don't solve this problem?"
    3. **Implication Questions**: "How much is this costing you monthly?"
    4. **Need-Payoff Questions**: "What would achieving this mean for your team?"
    
    ### Common Price Objection Responses
    
    **Objection**: "You're 20% more expensive than the competition."
    
    **Response Script**: 
    "I understand price is important. Can you help me understand what criteria you're using to evaluate solutions beyond price? Many of our clients initially had similar concerns, but found that our solution actually reduced their total cost by 35% within the first year."
    
    ## Authority Objections
    
    When prospects say "I need to check with my boss":
    
    - Acknowledge their process
    - Ask about decision criteria
    - Request to include decision makers
    - Provide supporting materials
    
    ### Process Questions
    
    - "What information would be most helpful for your boss?"
    - "When do you typically make these decisions together?"
    - "Would it be helpful if I prepared a summary for them?"
    
    ## Closing Techniques
    
    1. **Assumptive Close**: "When would you like to get started?"
    2. **Alternative Close**: "Would you prefer the monthly or annual plan?"
    3. **Urgency Close**: "This price is valid until Friday."
    
    Remember: Always listen first, acknowledge their concern, then respond with value.
    """
    
    # Write sample content to file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(sample_content)

def create_sample_directory(directory_path: str):
    """Create a sample directory with multiple sales documents"""
    
    os.makedirs(directory_path, exist_ok=True)
    
    # Create various sample documents
    documents = {
        "objection_handling_guide.txt": """
        # Objection Handling Mastery
        
        ## Price Objections
        - "Too expensive" -> Focus on ROI and value
        - "Budget constraints" -> Explore payment options
        - "Competitor is cheaper" -> Differentiate on quality
        
        ## Authority Objections  
        - "Need approval" -> Involve decision makers
        - "Not my decision" -> Identify real buyer
        
        ## Timing Objections
        - "Need to think" -> Create urgency
        - "Maybe next quarter" -> Explore current pain
        """,
        
        "spin_methodology.md": """
        # SPIN Selling Methodology
        
        ## Four Types of Questions
        
        ### Situation Questions
        - Current state analysis
        - Fact-finding questions
        - Background information
        
        ### Problem Questions  
        - Identify pain points
        - Uncover dissatisfaction
        - Explore difficulties
        
        ### Implication Questions
        - Consequences of problems
        - Cost of inaction
        - Impact on business
        
        ### Need-Payoff Questions
        - Value of solution
        - Benefits realization
        - Positive outcomes
        """,
        
        "competitor_battle_cards.txt": """
        # Competitor Battle Cards
        
        ## vs. Competitor A
        **Their Strengths**: Lower price, established brand
        **Their Weaknesses**: Limited features, poor support
        **Our Advantage**: Superior technology, better ROI
        
        ## vs. Competitor B  
        **Their Strengths**: Market leader, wide adoption
        **Their Weaknesses**: Complex implementation, high maintenance
        **Our Advantage**: Ease of use, faster deployment
        
        ## Competitive Responses
        - Focus on total cost of ownership
        - Highlight unique differentiators
        - Share relevant case studies
        """
    }
    
    for filename, content in documents.items():
        file_path = os.path.join(directory_path, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

def cleanup_demo_files():
    """Clean up demo files created during examples"""
    
    import shutil
    
    cleanup_items = [
        "sample_sales_playbook.pdf",
        "sample_sales_docs",
        "demo_chromadb",
        "processing_logs"
    ]
    
    print("🧹 Cleaning up demo files...")
    
    for item in cleanup_items:
        if os.path.exists(item):
            if os.path.isfile(item):
                os.remove(item)
                print(f"   🗑️  Removed file: {item}")
            elif os.path.isdir(item):
                shutil.rmtree(item)
                print(f"   🗑️  Removed directory: {item}")

def main():
    """Run all usage examples"""
    
    print("🚀 VoiceCoach Document Processing Pipeline Examples")
    print("=" * 60)
    print("This demo shows key functionality for sales knowledge ingestion.\n")
    
    try:
        # Run examples
        example_single_document_processing()
        example_batch_processing() 
        example_vector_storage_integration()
        example_real_time_coaching_simulation()
        
        print("🎉 All examples completed successfully!")
        print("\n💡 Next Steps:")
        print("   1. Install ChromaDB: pip install chromadb")
        print("   2. Process your sales documents: python -m document_processing.pipeline_cli process-directory ./your_docs/")
        print("   3. Search knowledge base: python -m document_processing.pipeline_cli search 'your query'")
        print("   4. Integrate with VoiceCoach RAG system")
        
    except Exception as e:
        print(f"❌ Error running examples: {e}")
    
    finally:
        # Ask user if they want to clean up demo files
        try:
            response = input("\n🧹 Clean up demo files? (y/n): ").lower().strip()
            if response in ['y', 'yes']:
                cleanup_demo_files()
                print("✅ Demo files cleaned up!")
            else:
                print("📁 Demo files preserved for further exploration.")
        except (EOFError, KeyboardInterrupt):
            print("\n📁 Demo files preserved.")

if __name__ == "__main__":
    main()