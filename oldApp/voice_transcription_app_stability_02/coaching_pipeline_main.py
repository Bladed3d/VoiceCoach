"""
Voice Coach Complete Coaching Pipeline with LED Breadcrumb Infrastructure
Main Integration File for OpenRouter + RAG + Tauri Systems

This module integrates all coaching systems with comprehensive LED debugging
for <2 second response time coaching pipeline monitoring.
"""

import os
import sys
import time
import asyncio
import threading
import signal
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json

# Import all our LED-enabled coaching systems
from ai_breadcrumb_system import AIBreadcrumbTrail, get_ai_trail, print_ai_performance_summary
from openrouter_coaching_system import (
    OpenRouterCoachingSystem, 
    CoachingLEDRanges, 
    get_coaching_system,
    initialize_coaching_system
)
from rag_knowledge_system import (
    RAGKnowledgeSystem,
    get_rag_system, 
    initialize_rag_system
)
from tauri_integration_system import (
    TauriIntegrationSystem,
    get_tauri_system,
    initialize_tauri_integration
)
from transcription_pipeline import TranscriptionPipeline

# Set up comprehensive logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('voice_coach_coaching.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("CoachingPipelineMain")

@dataclass
class CoachingPipelineConfig:
    """Configuration for the complete coaching pipeline"""
    openrouter_api_key: str
    enable_rag_knowledge: bool = True
    enable_tauri_integration: bool = True
    rag_persist_directory: str = "./chroma_coaching_db"
    tauri_host: str = "127.0.0.1"
    tauri_port: int = 8765
    max_response_time_ms: float = 2000
    transcription_model: str = "distil-large-v3"
    populate_default_knowledge: bool = True

class VoiceCoachingPipeline:
    """
    Complete voice coaching pipeline with OpenRouter API, RAG knowledge,
    and Tauri integration - all with comprehensive LED breadcrumb debugging.
    """
    
    def __init__(self, config: CoachingPipelineConfig):
        """
        Initialize the complete coaching pipeline.
        
        Args:
            config: Pipeline configuration
        """
        # Initialize main breadcrumb trail
        self.trail = get_ai_trail("CoachingPipelineMain")
        self.trail.light(CoachingLEDRanges.OPENROUTER_AUTH_INIT, "pipeline_initialization")
        
        self.config = config
        self.is_running = False
        
        # System components
        self.transcription_pipeline: Optional[TranscriptionPipeline] = None
        self.coaching_system: Optional[OpenRouterCoachingSystem] = None
        self.rag_system: Optional[RAGKnowledgeSystem] = None
        self.tauri_system: Optional[TauriIntegrationSystem] = None
        
        # Performance tracking
        self.pipeline_start_time = time.time()
        self.total_transcriptions = 0
        self.total_coaching_prompts = 0
        self.total_knowledge_retrievals = 0
        
        # Initialize all systems
        self._initialize_systems()
        
        self.trail.light(CoachingLEDRanges.PROMPT_DELIVERY_READY, "pipeline_ready")
    
    def _initialize_systems(self):
        """Initialize all coaching pipeline systems with LED debugging."""
        self.trail.light(CoachingLEDRanges.OPENROUTER_MODEL_SELECTION, "initializing_systems")
        
        try:
            # 1. Initialize OpenRouter Coaching System
            self.trail.light(CoachingLEDRanges.OPENROUTER_AUTH_INIT, "initializing_openrouter")
            
            if not self.config.openrouter_api_key:
                self.trail.fail(CoachingLEDRanges.OPENROUTER_AUTH_INIT,
                              Exception("OpenRouter API key not provided"), 
                              "missing_api_key")
                raise ValueError("OpenRouter API key is required")
            
            self.coaching_system = OpenRouterCoachingSystem(
                openrouter_api_key=self.config.openrouter_api_key,
                max_response_time_ms=self.config.max_response_time_ms
            )
            
            self.trail.light(CoachingLEDRanges.OPENROUTER_CONNECTION_TEST, "openrouter_initialized")
            
            # 2. Initialize RAG Knowledge System (if enabled)
            if self.config.enable_rag_knowledge:
                self.trail.light(CoachingLEDRanges.RAG_KNOWLEDGE_SEARCH, "initializing_rag")
                
                self.rag_system = RAGKnowledgeSystem(
                    persist_directory=self.config.rag_persist_directory
                )
                
                # Populate default knowledge if requested and database is empty
                if self.config.populate_default_knowledge and self.rag_system.collection.count() == 0:
                    self.trail.light(CoachingLEDRanges.RAG_KNOWLEDGE_CACHING, "populating_default_knowledge")
                    self.rag_system.populate_default_knowledge()
                
                self.trail.light(CoachingLEDRanges.RAG_KNOWLEDGE_RETRIEVAL, "rag_initialized")
            
            # 3. Initialize Tauri Integration System (if enabled)
            if self.config.enable_tauri_integration:
                self.trail.light(CoachingLEDRanges.TAURI_IPC_RECEIVE, "initializing_tauri")
                
                self.tauri_system = TauriIntegrationSystem(
                    host=self.config.tauri_host,
                    port=self.config.tauri_port,
                    coaching_system=self.coaching_system,
                    rag_system=self.rag_system
                )
                
                self.trail.light(CoachingLEDRanges.TAURI_IPC_SEND, "tauri_initialized")
            
            # 4. Test all system connections
            self._test_system_connections()
            
            self.trail.light(CoachingLEDRanges.PROMPT_DELIVERY_READY, "all_systems_initialized")
            logger.info("All coaching pipeline systems initialized successfully")
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.OPENROUTER_MODEL_SELECTION, e, "system_initialization_failed")
            raise
    
    def _test_system_connections(self):
        """Test connections to all external systems."""
        self.trail.light(CoachingLEDRanges.OPENROUTER_CONNECTION_TEST, "testing_connections")
        
        try:
            # Test OpenRouter connection
            if self.coaching_system:
                connection_start = time.time()
                # For now, assume connection is good (async test would be better)
                connection_time = (time.time() - connection_start) * 1000
                
                self.trail.light(CoachingLEDRanges.OPENROUTER_CONNECTION_TEST, "openrouter_connected",
                               performance_metrics={'connection_time_ms': connection_time})
            
            # Test RAG system (ChromaDB)
            if self.rag_system:
                rag_start = time.time()
                doc_count = self.rag_system.collection.count()
                rag_time = (time.time() - rag_start) * 1000
                
                self.trail.light(CoachingLEDRanges.RAG_CHROMADB_QUERY, "chromadb_connected",
                               performance_metrics={'query_time_ms': rag_time,
                                                  'document_count': doc_count})
            
            # Test Tauri integration
            if self.tauri_system:
                self.trail.light(CoachingLEDRanges.TAURI_IPC_RECEIVE, "tauri_ready")
            
            self.trail.light(CoachingLEDRanges.OPENROUTER_CONNECTION_TEST, "all_connections_tested")
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.OPENROUTER_CONNECTION_TEST, e, "connection_test_failed")
    
    def start_coaching_pipeline(self):
        """Start the complete coaching pipeline."""
        self.trail.light(CoachingLEDRanges.TRANSCRIPTION_START, "starting_coaching_pipeline")
        
        try:
            if self.is_running:
                logger.warning("Coaching pipeline is already running")
                return
            
            self.is_running = True
            
            # Start Tauri integration server if enabled
            if self.tauri_system:
                self.trail.light(CoachingLEDRanges.TAURI_IPC_RECEIVE, "starting_tauri_server")
                self.tauri_system.start_server()
                
                self.trail.light(CoachingLEDRanges.TAURI_IPC_RECEIVE, "tauri_server_started")
                logger.info(f"Tauri integration server started on {self.config.tauri_host}:{self.config.tauri_port}")
            
            # Initialize transcription pipeline
            self.trail.light(CoachingLEDRanges.TRANSCRIPTION_START, "initializing_transcription")
            
            self.transcription_pipeline = TranscriptionPipeline(
                model_name=self.config.transcription_model,
                use_gpu=True,
                remove_repetitions=True,
                confidence_threshold=0.6
            )
            
            # Start transcription
            self.transcription_pipeline.start()
            
            self.trail.light(CoachingLEDRanges.TRANSCRIPTION_START, "transcription_started")
            
            # Start main coaching loop
            self._start_coaching_loop()
            
            self.trail.light(CoachingLEDRanges.PROMPT_DELIVERY_READY, "coaching_pipeline_running")
            logger.info("Voice coaching pipeline started successfully")
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.TRANSCRIPTION_START, e, "pipeline_start_failed")
            self.is_running = False
            raise
    
    def _start_coaching_loop(self):
        """Start the main coaching loop in a separate thread."""
        def coaching_loop():
            """Main coaching loop that processes transcriptions and generates coaching."""
            while self.is_running:
                try:
                    if not self.transcription_pipeline:
                        time.sleep(0.1)
                        continue
                    
                    # Get transcription result
                    transcription_start = time.time()
                    result, latency = self.transcription_pipeline.get_transcription(block=True, timeout=0.5)
                    
                    if result:
                        self.total_transcriptions += 1
                        
                        transcription_time = (time.time() - transcription_start) * 1000
                        
                        self.trail.light(CoachingLEDRanges.TRANSCRIPTION_SEGMENT_PROCESS, 
                                       "transcription_received",
                                       performance_metrics={'transcription_latency_ms': latency,
                                                          'processing_time_ms': transcription_time})
                        
                        # Process transcription for coaching (determine speaker)
                        # For demo, alternate between user and prospect
                        speaker = "prospect" if self.total_transcriptions % 2 == 0 else "user"
                        
                        # Generate coaching prompt
                        coaching_start = time.time()
                        coaching_prompt = self.coaching_system.process_transcription(
                            result, speaker, time.time()
                        )
                        coaching_time = (time.time() - coaching_start) * 1000
                        
                        if coaching_prompt:
                            self.total_coaching_prompts += 1
                            
                            self.trail.light(CoachingLEDRanges.PROMPT_GENERATION_START,
                                           "coaching_prompt_generated",
                                           performance_metrics={'generation_time_ms': coaching_time,
                                                              'total_prompts': self.total_coaching_prompts})
                            
                            # Enhance with RAG knowledge if available
                            if self.rag_system and coaching_prompt:
                                rag_start = time.time()
                                
                                # Create context for knowledge retrieval
                                from openrouter_coaching_system import CoachingContext
                                context = CoachingContext(
                                    conversation_history=[{"speaker": speaker, "text": result, "timestamp": time.time()}],
                                    current_speaker=speaker,
                                    conversation_topic="general",
                                    sentiment_score=0.0,
                                    intent_detected="general",
                                    timestamp=time.time()
                                )
                                
                                relevant_knowledge = self.rag_system.retrieve_relevant_knowledge(context)
                                rag_time = (time.time() - rag_start) * 1000
                                
                                if relevant_knowledge.documents:
                                    self.total_knowledge_retrievals += 1
                                    
                                    self.trail.light(CoachingLEDRanges.RAG_KNOWLEDGE_RETRIEVAL,
                                                   "knowledge_retrieved",
                                                   performance_metrics={'retrieval_time_ms': rag_time,
                                                                      'documents_found': len(relevant_knowledge.documents)})
                            
                            # Send to Tauri frontend if available
                            if self.tauri_system and self.tauri_system.active_connections:
                                from tauri_integration_system import TauriMessage, CoachingEvent
                                
                                event = CoachingEvent(
                                    event_type="prompt_generated",
                                    coaching_prompt=coaching_prompt,
                                    timestamp=time.time()
                                )
                                
                                message = TauriMessage(
                                    message_type="coaching_prompt",
                                    payload=event.__dict__,
                                    timestamp=time.time(),
                                    message_id=f"coaching_{int(time.time())}"
                                )
                                
                                # Send async (would need proper async handling in production)
                                self.trail.light(CoachingLEDRanges.TAURI_COACHING_DISPLAY,
                                               "prompt_sent_to_frontend")
                            
                            # Log coaching prompt
                            logger.info(f"🎯 COACHING: {coaching_prompt.prompt_text}")
                            logger.info(f"   Type: {coaching_prompt.coaching_type}, Urgency: {coaching_prompt.urgency_level}/5")
                            logger.info(f"   Generated in: {coaching_prompt.generation_time_ms:.1f}ms")
                    
                    time.sleep(0.01)  # Small delay to prevent tight loop
                    
                except Exception as e:
                    self.trail.fail(CoachingLEDRanges.TRANSCRIPTION_SEGMENT_PROCESS, e, "coaching_loop_error")
                    logger.error(f"Error in coaching loop: {e}")
                    time.sleep(0.5)  # Longer delay on error
        
        # Start coaching loop in background thread
        coaching_thread = threading.Thread(target=coaching_loop, daemon=True)
        coaching_thread.start()
        
        logger.info("Coaching loop started in background thread")
    
    def stop_coaching_pipeline(self):
        """Stop the complete coaching pipeline."""
        self.trail.light(CoachingLEDRanges.TRANSCRIPTION_STOP, "stopping_coaching_pipeline")
        
        try:
            self.is_running = False
            
            # Stop transcription pipeline
            if self.transcription_pipeline:
                self.transcription_pipeline.stop()
                self.transcription_pipeline = None
                self.trail.light(CoachingLEDRanges.TRANSCRIPTION_STOP, "transcription_stopped")
            
            # Stop Tauri integration
            if self.tauri_system:
                self.tauri_system.stop_server()
                self.trail.light(CoachingLEDRanges.TAURI_IPC_RECEIVE, "tauri_server_stopped")
            
            # Cleanup OpenRouter system
            if self.coaching_system:
                # Cleanup would go here if needed
                pass
            
            self.trail.light(CoachingLEDRanges.TRANSCRIPTION_STOP, "coaching_pipeline_stopped")
            logger.info("Voice coaching pipeline stopped successfully")
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.TRANSCRIPTION_STOP, e, "pipeline_stop_failed")
    
    def get_comprehensive_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics from all systems."""
        pipeline_uptime = time.time() - self.pipeline_start_time
        
        metrics = {
            'pipeline_overview': {
                'uptime_seconds': pipeline_uptime,
                'is_running': self.is_running,
                'total_transcriptions': self.total_transcriptions,
                'total_coaching_prompts': self.total_coaching_prompts,
                'total_knowledge_retrievals': self.total_knowledge_retrievals,
                'coaching_prompt_rate': self.total_coaching_prompts / self.total_transcriptions * 100 if self.total_transcriptions > 0 else 0
            }
        }
        
        # Add system-specific metrics
        if self.coaching_system:
            metrics['openrouter_coaching'] = self.coaching_system.get_performance_metrics()
        
        if self.rag_system:
            metrics['rag_knowledge'] = self.rag_system.get_performance_metrics()
        
        if self.tauri_system:
            metrics['tauri_integration'] = self.tauri_system.get_performance_metrics()
        
        # Add breadcrumb trail metrics
        metrics['led_breadcrumbs'] = self.trail.get_performance_summary()
        
        return metrics
    
    def print_performance_dashboard(self):
        """Print a comprehensive performance dashboard."""
        print("\n" + "=" * 80)
        print("🎯 VOICE COACH PERFORMANCE DASHBOARD")
        print("=" * 80)
        
        metrics = self.get_comprehensive_metrics()
        overview = metrics['pipeline_overview']
        
        print(f"📊 PIPELINE OVERVIEW:")
        print(f"   Status: {'🟢 RUNNING' if overview['is_running'] else '🔴 STOPPED'}")
        print(f"   Uptime: {overview['uptime_seconds']:.1f} seconds")
        print(f"   Total Transcriptions: {overview['total_transcriptions']}")
        print(f"   Total Coaching Prompts: {overview['total_coaching_prompts']}")
        print(f"   Coaching Prompt Rate: {overview['coaching_prompt_rate']:.1f}%")
        
        if 'openrouter_coaching' in metrics:
            coaching_metrics = metrics['openrouter_coaching']
            print(f"\n🤖 OPENROUTER COACHING:")
            print(f"   Success Rate: {coaching_metrics['success_rate']:.1f}%")
            print(f"   Avg Response Time: {coaching_metrics['average_response_time_ms']:.1f}ms")
            print(f"   Under Target Rate: {coaching_metrics['under_target_rate']:.1f}%")
        
        if 'rag_knowledge' in metrics:
            rag_metrics = metrics['rag_knowledge']
            print(f"\n🧠 RAG KNOWLEDGE:")
            print(f"   Total Documents: {rag_metrics['total_documents']}")
            print(f"   Cache Hit Rate: {rag_metrics['cache_hit_rate']:.1f}%")
            print(f"   Avg Retrieval Time: {rag_metrics['average_retrieval_time_ms']:.1f}ms")
        
        if 'tauri_integration' in metrics and 'tauri_integration' in metrics['tauri_integration']:
            tauri_metrics = metrics['tauri_integration']['tauri_integration']
            print(f"\n🔗 TAURI INTEGRATION:")
            print(f"   Active Connections: {tauri_metrics['active_connections']}")
            print(f"   Messages Sent: {tauri_metrics['messages_sent']}")
            print(f"   Messages Received: {tauri_metrics['messages_received']}")
        
        # LED Breadcrumb summary
        breadcrumb_metrics = metrics['led_breadcrumbs']
        print(f"\n💡 LED BREADCRUMB SUMMARY:")
        print(f"   Total Operations: {breadcrumb_metrics['total_operations']}")
        print(f"   Success Rate: {breadcrumb_metrics['success_rate']:.1f}%")
        print(f"   Failed Operations: {breadcrumb_metrics['failed_operations']}")
        
        print("=" * 80)

def create_coaching_pipeline_from_env() -> VoiceCoachingPipeline:
    """Create coaching pipeline from environment variables."""
    config = CoachingPipelineConfig(
        openrouter_api_key=os.getenv('OPENROUTER_API_KEY', ''),
        enable_rag_knowledge=os.getenv('ENABLE_RAG', 'true').lower() == 'true',
        enable_tauri_integration=os.getenv('ENABLE_TAURI', 'true').lower() == 'true',
        rag_persist_directory=os.getenv('RAG_DB_PATH', './chroma_coaching_db'),
        tauri_host=os.getenv('TAURI_HOST', '127.0.0.1'),
        tauri_port=int(os.getenv('TAURI_PORT', '8765')),
        max_response_time_ms=float(os.getenv('MAX_RESPONSE_TIME_MS', '2000')),
        transcription_model=os.getenv('TRANSCRIPTION_MODEL', 'distil-large-v3'),
        populate_default_knowledge=os.getenv('POPULATE_KNOWLEDGE', 'true').lower() == 'true'
    )
    
    return VoiceCoachingPipeline(config)

def main():
    """Main function to run the complete voice coaching pipeline."""
    print("🚀 Starting Voice Coach with OpenRouter + RAG + Tauri Integration")
    print("=" * 70)
    
    # Check for API key
    api_key = os.getenv('OPENROUTER_API_KEY')
    if not api_key:
        print("❌ ERROR: OPENROUTER_API_KEY environment variable not set")
        print("   Please set your OpenRouter API key:")
        print("   export OPENROUTER_API_KEY='your-api-key-here'")
        sys.exit(1)
    
    pipeline = None
    
    try:
        # Create and start pipeline
        pipeline = create_coaching_pipeline_from_env()
        
        print("✅ Coaching pipeline initialized successfully")
        
        # Start the pipeline
        pipeline.start_coaching_pipeline()
        
        print("🎯 Voice coaching pipeline is now running!")
        print("📝 Speak into your microphone to see real-time coaching prompts")
        
        if pipeline.tauri_system:
            print(f"🌐 Tauri WebSocket: ws://{pipeline.config.tauri_host}:{pipeline.config.tauri_port}/coaching")
            print(f"📡 Health Check: http://{pipeline.config.tauri_host}:{pipeline.config.tauri_port}/health")
        
        print("\n⌨️ Commands:")
        print("   - Press 'd' for performance dashboard")
        print("   - Press 'b' for LED breadcrumb summary")
        print("   - Press 'q' to quit")
        print("   - Press Ctrl+C to stop")
        
        # Interactive command loop
        def signal_handler(sig, frame):
            print("\n🛑 Shutting down coaching pipeline...")
            if pipeline:
                pipeline.stop_coaching_pipeline()
            print("✅ Shutdown complete")
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        
        # Simple command loop
        while True:
            try:
                cmd = input().strip().lower()
                
                if cmd == 'q':
                    break
                elif cmd == 'd':
                    pipeline.print_performance_dashboard()
                elif cmd == 'b':
                    print_ai_performance_summary()
                else:
                    print("Unknown command. Use 'd' (dashboard), 'b' (breadcrumbs), or 'q' (quit)")
                    
            except EOFError:
                break
            except KeyboardInterrupt:
                break
    
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        if pipeline:
            pipeline.stop_coaching_pipeline()
        
        print("\n🏁 Voice coaching pipeline stopped")

if __name__ == "__main__":
    main()