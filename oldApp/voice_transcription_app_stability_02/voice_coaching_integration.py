"""
Voice Coaching Integration with ChromaDB RAG System and LED Debugging

This module integrates the voice transcription system with the ChromaDB RAG system
to provide real-time sales coaching based on conversation analysis.

Features:
- Real-time transcription analysis and coaching prompt generation
- Context-aware coaching suggestions based on conversation flow
- Performance monitoring for <100ms response times
- Tauri backend integration for desktop application
- Comprehensive LED debugging for integration points

LED Ranges:
- 400-499: Real-time Coaching Operations
- 500-599: Performance and Integration Monitoring
"""

import time
import json
import threading
import traceback
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, asdict
from queue import Queue, Empty
import logging

from breadcrumb_system import BreadcrumbTrail
from chroma_rag_system import ChromaDBRAGSystem, CoachingPrompt
from knowledge_manager import KnowledgeManager, setup_knowledge_base
from transcription_pipeline import TranscriptionPipeline


@dataclass
class CoachingContext:
    """Context information for coaching session"""
    session_id: str
    user_id: str
    conversation_history: List[str]
    coaching_preferences: Dict[str, Any]
    performance_metrics: Dict[str, float]
    started_at: float


@dataclass
class RealTimeCoachingResponse:
    """Real-time coaching response with context"""
    coaching_prompt: str
    confidence_score: float
    relevant_techniques: List[str]
    context_snippets: List[str]
    processing_time_ms: float
    response_type: str
    session_id: str
    timestamp: float


class VoiceCoachingIntegrator:
    """
    Integrates voice transcription with ChromaDB RAG system for real-time coaching.
    Provides LED debugging for all integration operations.
    """
    
    def __init__(self, 
                 rag_system: ChromaDBRAGSystem,
                 transcription_pipeline: Optional[TranscriptionPipeline] = None,
                 response_timeout_ms: int = 100,
                 context_window_size: int = 5):
        """
        Initialize the voice coaching integrator.
        
        Args:
            rag_system: ChromaDB RAG system instance
            transcription_pipeline: Voice transcription pipeline
            response_timeout_ms: Maximum response time for coaching prompts
            context_window_size: Number of recent transcriptions to keep in context
        """
        self.trail = BreadcrumbTrail("VoiceCoachingIntegrator")
        self.trail.light(400, {"action": "integrator_initialization_start"})
        
        self.rag_system = rag_system
        self.transcription_pipeline = transcription_pipeline
        self.response_timeout_ms = response_timeout_ms
        self.context_window_size = context_window_size
        
        # Active coaching sessions
        self.active_sessions: Dict[str, CoachingContext] = {}
        self.response_queue = Queue()
        self.processing_lock = threading.Lock()
        
        # Coaching triggers and patterns
        self.coaching_triggers = {
            "objection_detected": [
                r"too expensive", r"can't afford", r"need to think",
                r"not sure", r"maybe later", r"budget", r"price"
            ],
            "closing_opportunity": [
                r"sounds good", r"interested", r"how do we",
                r"next steps", r"when can", r"let's do"
            ],
            "relationship_building": [
                r"tell me about", r"how long", r"experience",
                r"other clients", r"references", r"similar"
            ],
            "qualification_needed": [
                r"decision maker", r"team", r"process",
                r"timeline", r"budget", r"requirements"
            ]
        }
        
        # Performance metrics tracking
        self.performance_metrics = {
            "response_times": [],
            "coaching_accuracy": [],
            "session_count": 0,
            "total_transcriptions": 0
        }
        
        self.trail.light(401, {
            "status": "integrator_ready",
            "response_timeout_ms": response_timeout_ms,
            "context_window_size": context_window_size,
            "trigger_categories": len(self.coaching_triggers)
        })
    
    def start_coaching_session(self, session_id: str, user_id: str, 
                              coaching_preferences: Dict[str, Any] = None) -> CoachingContext:
        """
        Start a new coaching session.
        
        Args:
            session_id: Unique session identifier
            user_id: User identifier
            coaching_preferences: User coaching preferences and settings
            
        Returns:
            CoachingContext for the session
        """
        self.trail.light(410, {
            "action": "coaching_session_start",
            "session_id": session_id,
            "user_id": user_id
        })
        
        try:
            coaching_context = CoachingContext(
                session_id=session_id,
                user_id=user_id,
                conversation_history=[],
                coaching_preferences=coaching_preferences or {},
                performance_metrics={},
                started_at=time.time()
            )
            
            with self.processing_lock:
                self.active_sessions[session_id] = coaching_context
                self.performance_metrics["session_count"] += 1
            
            self.trail.light(411, {
                "status": "coaching_session_created",
                "session_id": session_id,
                "total_active_sessions": len(self.active_sessions)
            })
            
            return coaching_context
            
        except Exception as e:
            self.trail.fail(410, e, traceback.format_exc())
            raise
    
    def process_transcription(self, session_id: str, transcription: str) -> Optional[RealTimeCoachingResponse]:
        """
        Process new transcription and generate coaching response if needed.
        
        Args:
            session_id: Active coaching session ID
            transcription: New transcription text
            
        Returns:
            RealTimeCoachingResponse if coaching is needed, None otherwise
        """
        self.trail.light(420, {
            "action": "transcription_processing_start",
            "session_id": session_id,
            "transcription_length": len(transcription)
        })
        
        start_time = time.time()
        
        try:
            # Get session context
            if session_id not in self.active_sessions:
                self.trail.fail(420, ValueError(f"Session {session_id} not found"), None)
                return None
            
            session_context = self.active_sessions[session_id]
            
            # Update conversation history
            self.trail.light(421, {"action": "context_update"})
            session_context.conversation_history.append(transcription)
            
            # Maintain context window
            if len(session_context.conversation_history) > self.context_window_size:
                session_context.conversation_history = session_context.conversation_history[-self.context_window_size:]
            
            # Analyze if coaching is needed
            self.trail.light(422, {"action": "coaching_trigger_analysis"})
            trigger_type = self._analyze_coaching_triggers(transcription)
            
            if not trigger_type:
                self.trail.light(423, {"status": "no_coaching_needed"})
                self.performance_metrics["total_transcriptions"] += 1
                return None
            
            # Generate coaching response
            self.trail.light(430, {
                "action": "coaching_generation_start",
                "trigger_type": trigger_type
            })
            
            coaching_response = self._generate_coaching_response(
                session_context, transcription, trigger_type
            )
            
            processing_duration = (time.time() - start_time) * 1000
            coaching_response.processing_time_ms = processing_duration
            
            # Track performance metrics
            self.trail.performance_checkpoint(510, "real_time_coaching", processing_duration, {
                "trigger_type": trigger_type,
                "session_id": session_id,
                "transcription_length": len(transcription)
            })
            
            self.performance_metrics["response_times"].append(processing_duration)
            self.performance_metrics["total_transcriptions"] += 1
            
            # Check performance against target
            if processing_duration > self.response_timeout_ms:
                self.trail.light(560, {
                    "warning": f"Coaching response exceeded {self.response_timeout_ms}ms target",
                    "actual_time": processing_duration,
                    "session_id": session_id
                })
            
            self.trail.light(431, {
                "status": "coaching_response_generated",
                "response_type": coaching_response.response_type,
                "confidence": coaching_response.confidence_score,
                "processing_time_ms": processing_duration
            })
            
            return coaching_response
            
        except Exception as e:
            self.trail.fail(420, e, traceback.format_exc())
            return None
    
    def _analyze_coaching_triggers(self, transcription: str) -> Optional[str]:
        """
        Analyze transcription for coaching triggers.
        
        Args:
            transcription: Transcription text to analyze
            
        Returns:
            Trigger type if found, None otherwise
        """
        transcription_lower = transcription.lower()
        
        trigger_scores = {}
        for trigger_type, patterns in self.coaching_triggers.items():
            score = 0
            for pattern in patterns:
                import re
                matches = len(re.findall(pattern, transcription_lower))
                score += matches
            
            if score > 0:
                trigger_scores[trigger_type] = score
        
        if trigger_scores:
            best_trigger = max(trigger_scores, key=trigger_scores.get)
            self.trail.light(424, {
                "status": "coaching_trigger_detected",
                "trigger_type": best_trigger,
                "score": trigger_scores[best_trigger],
                "all_scores": trigger_scores
            })
            return best_trigger
        
        return None
    
    def _generate_coaching_response(self, session_context: CoachingContext, 
                                   transcription: str, trigger_type: str) -> RealTimeCoachingResponse:
        """
        Generate coaching response using RAG system.
        
        Args:
            session_context: Current session context
            transcription: Latest transcription
            trigger_type: Type of coaching trigger detected
            
        Returns:
            RealTimeCoachingResponse with coaching guidance
        """
        self.trail.light(440, {
            "action": "rag_coaching_generation",
            "trigger_type": trigger_type
        })
        
        try:
            # Prepare context for RAG system
            conversation_context = " ".join(session_context.conversation_history[-3:])  # Last 3 exchanges
            full_context = f"{conversation_context} {transcription}"
            
            # Map trigger to prompt type
            prompt_type_mapping = {
                "objection_detected": "sales_objection",
                "closing_opportunity": "sales_technique",
                "relationship_building": "sales_technique",
                "qualification_needed": "sales_technique"
            }
            
            prompt_type = prompt_type_mapping.get(trigger_type, "real_time_feedback")
            
            # Generate coaching prompt
            self.trail.light(441, {"action": "rag_prompt_generation", "prompt_type": prompt_type})
            coaching_prompt_obj = self.rag_system.generate_coaching_prompt(
                transcription=full_context,
                prompt_type=prompt_type,
                personalization_data=session_context.coaching_preferences
            )
            
            # Extract relevant techniques
            relevant_techniques = [
                snippet.metadata.get("technique", "unknown") 
                for snippet in coaching_prompt_obj.context_snippets
            ]
            
            # Extract context snippets for reference
            context_snippets = [
                snippet.content[:100] + "..." if len(snippet.content) > 100 else snippet.content
                for snippet in coaching_prompt_obj.context_snippets
            ]
            
            # Calculate confidence score based on snippet relevance
            confidence_score = (
                coaching_prompt_obj.context_snippets[0].similarity_score 
                if coaching_prompt_obj.context_snippets else 0.5
            )
            
            response = RealTimeCoachingResponse(
                coaching_prompt=coaching_prompt_obj.prompt,
                confidence_score=confidence_score,
                relevant_techniques=relevant_techniques,
                context_snippets=context_snippets,
                processing_time_ms=0,  # Will be set by caller
                response_type=trigger_type,
                session_id=session_context.session_id,
                timestamp=time.time()
            )
            
            self.trail.light(442, {
                "status": "rag_response_complete",
                "confidence": confidence_score,
                "techniques_found": len(relevant_techniques),
                "context_snippets": len(context_snippets)
            })
            
            return response
            
        except Exception as e:
            self.trail.fail(440, e, traceback.format_exc())
            raise
    
    def end_coaching_session(self, session_id: str) -> Dict[str, Any]:
        """
        End a coaching session and return session metrics.
        
        Args:
            session_id: Session ID to end
            
        Returns:
            Session summary and metrics
        """
        self.trail.light(450, {"action": "session_end", "session_id": session_id})
        
        try:
            if session_id not in self.active_sessions:
                self.trail.light(451, {"status": "session_not_found", "session_id": session_id})
                return {"error": "Session not found"}
            
            session_context = self.active_sessions[session_id]
            session_duration = time.time() - session_context.started_at
            
            # Calculate session metrics
            session_summary = {
                "session_id": session_id,
                "duration_seconds": session_duration,
                "conversation_exchanges": len(session_context.conversation_history),
                "coaching_interactions": session_context.performance_metrics.get("coaching_count", 0),
                "avg_response_time": session_context.performance_metrics.get("avg_response_time", 0),
                "ended_at": time.time()
            }
            
            # Remove from active sessions
            with self.processing_lock:
                del self.active_sessions[session_id]
            
            self.trail.light(451, {
                "status": "session_ended",
                "duration_seconds": session_duration,
                "total_exchanges": len(session_context.conversation_history)
            })
            
            return session_summary
            
        except Exception as e:
            self.trail.fail(450, e, traceback.format_exc())
            return {"error": str(e)}
    
    def get_system_performance(self) -> Dict[str, Any]:
        """Get comprehensive system performance metrics."""
        self.trail.light(500, {"action": "performance_metrics_collection"})
        
        try:
            response_times = self.performance_metrics["response_times"]
            
            performance_data = {
                "active_sessions": len(self.active_sessions),
                "total_sessions": self.performance_metrics["session_count"],
                "total_transcriptions": self.performance_metrics["total_transcriptions"],
                "response_time_stats": {
                    "avg_ms": sum(response_times) / len(response_times) if response_times else 0,
                    "min_ms": min(response_times) if response_times else 0,
                    "max_ms": max(response_times) if response_times else 0,
                    "target_ms": self.response_timeout_ms,
                    "within_target_pct": (
                        len([t for t in response_times if t <= self.response_timeout_ms]) / len(response_times) * 100
                        if response_times else 0
                    )
                },
                "rag_system_health": self.rag_system.get_system_health(),
                "last_updated": time.time()
            }
            
            self.trail.light(501, {"status": "performance_metrics_complete", "metrics": performance_data})
            
            return performance_data
            
        except Exception as e:
            self.trail.fail(500, e, traceback.format_exc())
            return {"error": str(e)}


class TauriIntegrationLayer:
    """
    Integration layer for Tauri desktop application backend.
    Provides simplified API for frontend communication.
    """
    
    def __init__(self, voice_integrator: VoiceCoachingIntegrator):
        self.voice_integrator = voice_integrator
        self.trail = BreadcrumbTrail("TauriIntegration")
        self.trail.light(540, {"action": "tauri_integration_init"})
    
    def handle_coaching_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle coaching request from Tauri frontend.
        
        Args:
            request_data: Request data from frontend
            
        Returns:
            Response data for frontend
        """
        self.trail.light(541, {
            "action": "tauri_request_handling",
            "request_type": request_data.get("type", "unknown")
        })
        
        try:
            request_type = request_data.get("type")
            
            if request_type == "start_session":
                context = self.voice_integrator.start_coaching_session(
                    session_id=request_data["session_id"],
                    user_id=request_data["user_id"],
                    coaching_preferences=request_data.get("preferences", {})
                )
                return {"status": "success", "context": asdict(context)}
            
            elif request_type == "process_transcription":
                response = self.voice_integrator.process_transcription(
                    session_id=request_data["session_id"],
                    transcription=request_data["transcription"]
                )
                
                if response:
                    return {"status": "coaching_available", "response": asdict(response)}
                else:
                    return {"status": "no_coaching_needed"}
            
            elif request_type == "end_session":
                summary = self.voice_integrator.end_coaching_session(
                    session_id=request_data["session_id"]
                )
                return {"status": "success", "summary": summary}
            
            elif request_type == "get_performance":
                performance = self.voice_integrator.get_system_performance()
                return {"status": "success", "performance": performance}
            
            else:
                self.trail.light(542, {"status": "unknown_request_type", "type": request_type})
                return {"status": "error", "message": f"Unknown request type: {request_type}"}
            
        except Exception as e:
            self.trail.fail(541, e, traceback.format_exc())
            return {"status": "error", "message": str(e)}


# Complete system initialization function
def initialize_voice_coaching_system(db_path: str = "./coaching_chroma_db") -> Dict[str, Any]:
    """
    Initialize the complete voice coaching system with all components.
    
    Args:
        db_path: Path for ChromaDB database
        
    Returns:
        Dictionary with all system components
    """
    trail = BreadcrumbTrail("SystemInitialization")
    trail.light(570, {"action": "full_system_init_start"})
    
    try:
        # Initialize ChromaDB RAG system
        trail.light(571, {"action": "rag_system_init"})
        rag_system = ChromaDBRAGSystem(db_path=db_path)
        
        # Set up knowledge base
        trail.light(572, {"action": "knowledge_base_setup"})
        knowledge_setup = setup_knowledge_base(rag_system)
        
        # Initialize voice coaching integrator
        trail.light(573, {"action": "voice_integrator_init"})
        voice_integrator = VoiceCoachingIntegrator(rag_system)
        
        # Initialize Tauri integration layer
        trail.light(574, {"action": "tauri_integration_init"})
        tauri_integration = TauriIntegrationLayer(voice_integrator)
        
        system_components = {
            "rag_system": rag_system,
            "voice_integrator": voice_integrator,
            "tauri_integration": tauri_integration,
            "knowledge_setup": knowledge_setup
        }
        
        trail.light(575, {
            "status": "full_system_ready",
            "components_initialized": len(system_components),
            "knowledge_chunks": knowledge_setup["stats"].total_chunks
        })
        
        return system_components
        
    except Exception as e:
        trail.fail(570, e, traceback.format_exc())
        raise


# Example usage and testing
if __name__ == "__main__":
    print("🎤 Initializing Voice Coaching Integration System...")
    
    try:
        # Initialize complete system
        system = initialize_voice_coaching_system("./test_coaching_db")
        
        voice_integrator = system["voice_integrator"]
        tauri_integration = system["tauri_integration"]
        
        print("✅ System initialized successfully!")
        
        # Test coaching session
        print("\n🎯 Testing coaching session...")
        session_id = "test_session_001"
        user_id = "test_user"
        
        # Start session
        context = voice_integrator.start_coaching_session(session_id, user_id, {
            "experience_level": "intermediate",
            "coaching_style": "direct"
        })
        print(f"📝 Session started: {context.session_id}")
        
        # Test transcription with objection
        transcription1 = "The customer just said this is too expensive and they need to think about it."
        response1 = voice_integrator.process_transcription(session_id, transcription1)
        
        if response1:
            print(f"🤖 Coaching response generated:")
            print(f"   Type: {response1.response_type}")
            print(f"   Confidence: {response1.confidence_score:.3f}")
            print(f"   Response time: {response1.processing_time_ms:.1f}ms")
            print(f"   Techniques: {response1.relevant_techniques}")
        
        # Test transcription without coaching need
        transcription2 = "Yes, I understand. That makes sense."
        response2 = voice_integrator.process_transcription(session_id, transcription2)
        
        if response2:
            print(f"🤖 Second coaching response: {response2.response_type}")
        else:
            print("✅ No coaching needed for second transcription")
        
        # Test Tauri integration
        print("\n⚡ Testing Tauri integration...")
        tauri_request = {
            "type": "process_transcription",
            "session_id": session_id,
            "transcription": "They're interested but want to know about pricing options."
        }
        
        tauri_response = tauri_integration.handle_coaching_request(tauri_request)
        print(f"📱 Tauri response status: {tauri_response['status']}")
        
        # Get performance metrics
        print("\n📊 Performance metrics...")
        performance = voice_integrator.get_system_performance()
        print(f"Active sessions: {performance['active_sessions']}")
        print(f"Average response time: {performance['response_time_stats']['avg_ms']:.1f}ms")
        print(f"Within target rate: {performance['response_time_stats']['within_target_pct']:.1f}%")
        
        # End session
        summary = voice_integrator.end_coaching_session(session_id)
        print(f"\n📋 Session ended. Duration: {summary['duration_seconds']:.1f}s")
        
        print("\n✅ Voice Coaching Integration test completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        traceback.print_exc()