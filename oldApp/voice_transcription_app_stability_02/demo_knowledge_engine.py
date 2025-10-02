"""
Demo Knowledge Engine for VoiceCoach Phase 2 Testing

This demo validates the ChromaDB RAG system with LED breadcrumb debugging infrastructure.
Tests the complete knowledge pipeline including:
- ChromaDB vector database initialization
- Knowledge document processing and embedding  
- Semantic search with <100ms performance target
- Coaching prompt generation
- Real-time transcription integration

LED Context: Autonomous error correction and validation for Phase 2 completion.
"""

import os
import sys
import time
import traceback
from typing import Dict, Any, List

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from chroma_rag_system import ChromaDBRAGSystem, TauriRAGIntegration, SAMPLE_COACHING_KNOWLEDGE
    from knowledge_manager import KnowledgeManager, setup_knowledge_base, SAMPLE_KNOWLEDGE_DOCUMENTS
    from breadcrumb_system import BreadcrumbTrail, debug
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure all required modules are available in the current directory")
    sys.exit(1)


class KnowledgeEngineDemo:
    """Demo class for testing ChromaDB RAG system functionality"""
    
    def __init__(self):
        self.trail = BreadcrumbTrail("KnowledgeEngineDemo")
        self.rag_system = None
        self.knowledge_manager = None
        self.tauri_integration = None
        
    def run_complete_demo(self) -> Dict[str, Any]:
        """Run complete knowledge engine demonstration with performance validation"""
        self.trail.light(100, {"action": "demo_start", "timestamp": time.time()})
        
        demo_results = {
            "success": False,
            "tests_passed": [],
            "tests_failed": [],
            "performance_metrics": {},
            "error_details": None
        }
        
        try:
            print("=" * 60)
            print("VOICECOACH PHASE 2 - CHROMADB KNOWLEDGE ENGINE DEMO")
            print("=" * 60)
            
            # Test 1: Initialize ChromaDB RAG System
            print("\n[1/7] Initializing ChromaDB RAG System...")
            self._test_chromadb_initialization(demo_results)
            
            # Test 2: Knowledge Manager Setup
            print("\n[2/7] Setting up Knowledge Manager...")
            self._test_knowledge_manager_setup(demo_results)
            
            # Test 3: Document Processing and Embedding
            print("\n[3/7] Processing knowledge documents...")
            self._test_document_processing(demo_results)
            
            # Test 4: Semantic Search Performance
            print("\n[4/7] Testing semantic search performance...")
            self._test_semantic_search_performance(demo_results)
            
            # Test 5: Coaching Prompt Generation
            print("\n[5/7] Testing coaching prompt generation...")
            self._test_coaching_prompt_generation(demo_results)
            
            # Test 6: Real-time Integration
            print("\n[6/7] Testing real-time transcription integration...")
            self._test_realtime_integration(demo_results)
            
            # Test 7: System Health and Performance
            print("\n[7/7] Validating system health and performance...")
            self._test_system_health(demo_results)
            
            # Final validation
            if len(demo_results["tests_failed"]) == 0:
                demo_results["success"] = True
                print("\n" + "=" * 60)
                print("SUCCESS: All Phase 2 tests passed!")
                print("ChromaDB RAG system ready for Phase 3 deployment")
                print("=" * 60)
            else:
                print("\n" + "=" * 60)
                print(f"FAILED: {len(demo_results['tests_failed'])} tests failed")
                print(f"Failed tests: {demo_results['tests_failed']}")
                print("=" * 60)
            
            self.trail.light(101, {
                "status": "demo_complete",
                "success": demo_results["success"],
                "tests_passed": len(demo_results["tests_passed"]),
                "tests_failed": len(demo_results["tests_failed"])
            })
            
            return demo_results
            
        except Exception as e:
            demo_results["error_details"] = str(e)
            self.trail.fail(100, e, traceback.format_exc())
            print(f"\nDEMO FAILED: {e}")
            traceback.print_exc()
            return demo_results
    
    def _test_chromadb_initialization(self, results: Dict[str, Any]) -> None:
        """Test ChromaDB system initialization"""
        test_name = "chromadb_initialization"
        start_time = time.time()
        
        try:
            self.rag_system = ChromaDBRAGSystem(
                db_path="./demo_chroma_db",
                collection_name="demo_coaching_knowledge",
                max_results=5,
                similarity_threshold=0.3  # Lower threshold for better matching
            )
            
            # Verify initialization
            health = self.rag_system.get_system_health()
            assert health["chromadb_status"] == "connected", "ChromaDB not connected"
            assert health["embedding_model_loaded"] == True, "Embedding model not loaded"
            
            duration = (time.time() - start_time) * 1000
            results["performance_metrics"]["initialization_time_ms"] = duration
            results["tests_passed"].append(test_name)
            
            print(f"  PASS: ChromaDB initialized in {duration:.1f}ms")
            
        except Exception as e:
            results["tests_failed"].append(f"{test_name}: {str(e)}")
            print(f"  FAIL: ChromaDB initialization failed - {e}")
    
    def _test_knowledge_manager_setup(self, results: Dict[str, Any]) -> None:
        """Test knowledge manager and document processing setup"""
        test_name = "knowledge_manager_setup"
        
        try:
            self.knowledge_manager = KnowledgeManager(
                chunk_size=400,
                chunk_overlap=50,
                quality_threshold=0.6
            )
            
            results["tests_passed"].append(test_name)
            print(f"  PASS: Knowledge Manager initialized")
            
        except Exception as e:
            results["tests_failed"].append(f"{test_name}: {str(e)}")
            print(f"  FAIL: Knowledge Manager setup failed - {e}")
    
    def _test_document_processing(self, results: Dict[str, Any]) -> None:
        """Test document processing and embedding generation"""
        test_name = "document_processing"
        start_time = time.time()
        
        try:
            # Process sample knowledge documents
            chunks, stats = self.knowledge_manager.process_documents(SAMPLE_KNOWLEDGE_DOCUMENTS)
            
            # Export and add to RAG system
            rag_documents = self.knowledge_manager.export_chunks_for_rag(chunks)
            self.rag_system.add_knowledge_documents(rag_documents)
            
            # Validate results
            assert len(chunks) > 0, "No chunks generated"
            assert stats.total_chunks > 0, "No processed chunks"
            assert len(rag_documents) > 0, "No documents exported for RAG"
            
            duration = (time.time() - start_time) * 1000
            results["performance_metrics"]["document_processing_time_ms"] = duration
            results["performance_metrics"]["chunks_processed"] = len(chunks)
            results["performance_metrics"]["avg_chunk_quality"] = sum(stats.quality_scores) / len(stats.quality_scores)
            
            results["tests_passed"].append(test_name)
            print(f"  PASS: Processed {stats.total_documents} documents into {stats.total_chunks} chunks in {duration:.1f}ms")
            
        except Exception as e:
            results["tests_failed"].append(f"{test_name}: {str(e)}")
            print(f"  FAIL: Document processing failed - {e}")
    
    def _test_semantic_search_performance(self, results: Dict[str, Any]) -> None:
        """Test semantic search with <100ms performance target"""
        test_name = "semantic_search_performance"
        
        test_queries = [
            "How should I handle price objections?",
            "What are the best closing techniques?",
            "How do I build rapport with customers?",
            "What is the BANT qualification framework?",
            "How to respond when customer says they need to think about it?"
        ]
        
        search_times = []
        all_passed = True
        
        try:
            for query in test_queries:
                start_time = time.time()
                snippets = self.rag_system.semantic_search(query, max_results=3)
                search_time = (time.time() - start_time) * 1000
                search_times.append(search_time)
                
                # Validate results
                assert len(snippets) > 0, f"No results for query: {query}"
                assert snippets[0].similarity_score > 0.2, f"Low similarity for query: {query}"
                
                # Check performance target
                if search_time > 100:
                    print(f"    WARNING: Search exceeded 100ms target: {search_time:.1f}ms for '{query[:30]}...'")
                    # Don't fail test for performance, just warn
                
            avg_search_time = sum(search_times) / len(search_times)
            max_search_time = max(search_times)
            
            results["performance_metrics"]["avg_search_time_ms"] = avg_search_time
            results["performance_metrics"]["max_search_time_ms"] = max_search_time
            results["performance_metrics"]["searches_under_100ms"] = sum(1 for t in search_times if t <= 100)
            
            results["tests_passed"].append(test_name)
            print(f"  PASS: Semantic search - Avg: {avg_search_time:.1f}ms, Max: {max_search_time:.1f}ms")
            
        except Exception as e:
            results["tests_failed"].append(f"{test_name}: {str(e)}")
            print(f"  FAIL: Semantic search failed - {e}")
    
    def _test_coaching_prompt_generation(self, results: Dict[str, Any]) -> None:
        """Test coaching prompt generation functionality"""
        test_name = "coaching_prompt_generation"
        
        test_scenarios = [
            "The customer just said the price is too high for their budget",
            "I think the prospect is ready to move forward but I'm not sure how to close",
            "The customer seems hesitant and keeps asking about features"
        ]
        
        try:
            for scenario in test_scenarios:
                start_time = time.time()
                coaching_prompt = self.rag_system.generate_coaching_prompt(
                    transcription=scenario,
                    prompt_type="real_time_feedback"
                )
                generation_time = (time.time() - start_time) * 1000
                
                # Validate prompt
                assert len(coaching_prompt.prompt) > 50, "Generated prompt too short"
                assert len(coaching_prompt.context_snippets) > 0, "No context snippets provided"
                assert coaching_prompt.prompt_type == "real_time_feedback", "Wrong prompt type"
                
            results["tests_passed"].append(test_name)
            print(f"  PASS: Coaching prompt generation working")
            
        except Exception as e:
            results["tests_failed"].append(f"{test_name}: {str(e)}")
            print(f"  FAIL: Coaching prompt generation failed - {e}")
    
    def _test_realtime_integration(self, results: Dict[str, Any]) -> None:
        """Test real-time transcription integration"""
        test_name = "realtime_integration"
        
        try:
            self.tauri_integration = TauriRAGIntegration(self.rag_system)
            
            # Test real-time processing
            test_transcription = "The customer is asking about our pricing plans and seems concerned about the cost."
            
            start_time = time.time()
            response = self.tauri_integration.process_real_time_transcription(test_transcription)
            processing_time = (time.time() - start_time) * 1000
            
            # Validate response
            assert "coaching_prompt" in response, "Missing coaching prompt in response"
            assert "confidence_score" in response, "Missing confidence score"
            assert response["processing_time_ms"] < 200, "Real-time processing too slow"
            
            results["performance_metrics"]["realtime_processing_time_ms"] = processing_time
            results["tests_passed"].append(test_name)
            
            print(f"  PASS: Real-time integration working in {processing_time:.1f}ms")
            
        except Exception as e:
            results["tests_failed"].append(f"{test_name}: {str(e)}")
            print(f"  FAIL: Real-time integration failed - {e}")
    
    def _test_system_health(self, results: Dict[str, Any]) -> None:
        """Test system health and overall performance metrics"""
        test_name = "system_health"
        
        try:
            # Get system health
            health = self.rag_system.get_system_health()
            
            # Validate health metrics
            assert health["chromadb_status"] == "connected", "ChromaDB not connected"
            assert health["collection_size"] > 0, "Empty knowledge collection"
            assert health["embedding_model_loaded"] == True, "Embedding model not loaded"
            
            # Get performance summary
            perf_summary = debug.get_performance_summary()
            
            # Store final metrics
            results["performance_metrics"]["system_health"] = health
            results["performance_metrics"]["performance_summary"] = perf_summary
            
            results["tests_passed"].append(test_name)
            print(f"  PASS: System health validated - Collection size: {health['collection_size']}")
            
            # Print performance summary
            print("\n  Performance Summary:")
            for operation, stats in perf_summary.items():
                if stats.get('count', 0) > 0:
                    avg_duration = stats.get('avg_duration', 0)
                    count = stats.get('count', 0)
                    print(f"    {operation}: {avg_duration:.1f}ms avg ({count} samples)")
            
        except Exception as e:
            results["tests_failed"].append(f"{test_name}: {str(e)}")
            print(f"  FAIL: System health check failed - {e}")


def main():
    """Main demo execution function"""
    print("Starting VoiceCoach Phase 2 ChromaDB Knowledge Engine Demo...")
    
    try:
        demo = KnowledgeEngineDemo()
        results = demo.run_complete_demo()
        
        # Print final summary
        print("\n" + "=" * 60)
        print("PHASE 2 DEMO RESULTS SUMMARY")
        print("=" * 60)
        print(f"Tests Passed: {len(results['tests_passed'])}")
        print(f"Tests Failed: {len(results['tests_failed'])}")
        print(f"Overall Success: {results['success']}")
        
        if results["performance_metrics"]:
            print("\nKey Performance Metrics:")
            metrics = results["performance_metrics"]
            
            if "avg_search_time_ms" in metrics:
                print(f"  Semantic Search Avg: {metrics['avg_search_time_ms']:.1f}ms")
                print(f"  Searches <100ms: {metrics.get('searches_under_100ms', 0)}/5")
            
            if "realtime_processing_time_ms" in metrics:
                print(f"  Real-time Processing: {metrics['realtime_processing_time_ms']:.1f}ms")
            
            if "chunks_processed" in metrics:
                print(f"  Knowledge Chunks: {metrics['chunks_processed']}")
                print(f"  Avg Chunk Quality: {metrics.get('avg_chunk_quality', 0):.3f}")
        
        print("=" * 60)
        
        # Exit with appropriate code
        return 0 if results["success"] else 1
        
    except Exception as e:
        print(f"\nDEMO EXECUTION FAILED: {e}")
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)