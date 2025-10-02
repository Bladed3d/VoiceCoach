"""
Tauri Backend Integration for Real-time Coaching
LED Breadcrumb-Enabled IPC Communication System

This module handles communication between the Python coaching backend and 
the Tauri frontend with comprehensive LED debugging infrastructure.
"""

import json
import time
import asyncio
import threading
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
from enum import IntEnum
import logging
import queue
import websockets
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ai_breadcrumb_system import AIBreadcrumbTrail, get_ai_trail
from openrouter_coaching_system import CoachingLEDRanges, OpenRouterCoachingSystem, CoachingPrompt
from rag_knowledge_system import RAGKnowledgeSystem, RelevantKnowledge

# Set up logging for Tauri integration
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("TauriIntegration")

@dataclass
class TauriMessage:
    """Message structure for Tauri communication"""
    message_type: str  # 'transcription', 'coaching_prompt', 'performance_metrics', 'error'
    payload: Dict[str, Any]
    timestamp: float
    message_id: str

@dataclass
class CoachingEvent:
    """Coaching event for frontend display"""
    event_type: str  # 'prompt_generated', 'knowledge_retrieved', 'performance_update'
    coaching_prompt: Optional[CoachingPrompt] = None
    relevant_knowledge: Optional[RelevantKnowledge] = None
    performance_metrics: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    timestamp: float = None

class TauriIntegrationSystem:
    """
    Tauri integration system for real-time coaching communication.
    Provides WebSocket-based IPC with LED debugging infrastructure.
    """
    
    def __init__(self, host: str = "127.0.0.1", port: int = 8765, 
                 coaching_system: Optional[OpenRouterCoachingSystem] = None,
                 rag_system: Optional[RAGKnowledgeSystem] = None):
        """
        Initialize Tauri integration system.
        
        Args:
            host: WebSocket server host
            port: WebSocket server port
            coaching_system: OpenRouter coaching system instance
            rag_system: RAG knowledge system instance
        """
        # Initialize Tauri breadcrumb trail
        self.trail = get_ai_trail("TauriIntegration")
        self.trail.light(CoachingLEDRanges.TAURI_IPC_SEND, "tauri_system_init")
        
        self.host = host
        self.port = port
        
        # System references
        self.coaching_system = coaching_system
        self.rag_system = rag_system
        
        # WebSocket connections
        self.active_connections: List[WebSocket] = []
        self.connection_count = 0
        
        # Message queues
        self.outbound_queue = queue.Queue()
        self.inbound_queue = queue.Queue()
        
        # Performance tracking
        self.messages_sent = 0
        self.messages_received = 0
        self.connection_errors = 0
        self.last_performance_update = time.time()
        
        # FastAPI app for WebSocket server
        self.app = self._create_fastapi_app()
        
        # Event loop for async operations
        self.event_loop = None
        self.server_task = None
        
        self.trail.light(CoachingLEDRanges.TAURI_IPC_RECEIVE, "tauri_system_ready")
    
    def _create_fastapi_app(self) -> FastAPI:
        """Create FastAPI application with WebSocket endpoints."""
        app = FastAPI(title="Voice Coach Tauri Backend", version="1.0.0")
        
        # CORS middleware for frontend communication
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["tauri://localhost", "http://localhost:3000", "http://127.0.0.1:3000"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        @app.websocket("/coaching")
        async def coaching_websocket(websocket: WebSocket):
            """WebSocket endpoint for real-time coaching communication."""
            await self._handle_websocket_connection(websocket)
        
        @app.get("/health")
        async def health_check():
            """Health check endpoint."""
            return {
                "status": "healthy",
                "active_connections": len(self.active_connections),
                "messages_sent": self.messages_sent,
                "messages_received": self.messages_received
            }
        
        @app.get("/performance")
        async def get_performance_metrics():
            """Get comprehensive performance metrics."""
            return self.get_performance_metrics()
        
        return app
    
    async def _handle_websocket_connection(self, websocket: WebSocket):
        """Handle new WebSocket connection from Tauri frontend."""
        self.trail.light(CoachingLEDRanges.TAURI_IPC_RECEIVE, "websocket_connection_attempt")
        
        try:
            await websocket.accept()
            self.active_connections.append(websocket)
            self.connection_count += 1
            
            connection_id = f"conn_{self.connection_count}"
            
            self.trail.light(CoachingLEDRanges.TAURI_IPC_RECEIVE, "websocket_connected",
                           {'connection_id': connection_id, 
                            'total_connections': len(self.active_connections)})
            
            # Send welcome message
            welcome_message = TauriMessage(
                message_type="connection_established",
                payload={"connection_id": connection_id, "server_time": time.time()},
                timestamp=time.time(),
                message_id=f"welcome_{int(time.time())}"
            )
            
            await self._send_message_to_connection(websocket, welcome_message)
            
            # Handle incoming messages
            while True:
                try:
                    # Receive message from frontend
                    data = await websocket.receive_text()
                    await self._process_incoming_message(websocket, data, connection_id)
                    
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    self.trail.fail(CoachingLEDRanges.TAURI_ERROR_NOTIFICATION, e, 
                                  f"websocket_error_{connection_id}")
                    break
        
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.TAURI_IPC_RECEIVE, e, "websocket_connection_failed")
        finally:
            # Clean up connection
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
            
            self.trail.light(CoachingLEDRanges.TAURI_IPC_RECEIVE, "websocket_disconnected",
                           {'total_connections': len(self.active_connections)})
    
    async def _process_incoming_message(self, websocket: WebSocket, data: str, connection_id: str):
        """Process incoming message from Tauri frontend."""
        self.trail.light(CoachingLEDRanges.TAURI_IPC_RECEIVE, "processing_incoming_message")
        
        try:
            message_data = json.loads(data)
            self.messages_received += 1
            
            message_type = message_data.get('type', 'unknown')
            payload = message_data.get('payload', {})
            
            processing_start = time.time()
            
            # Handle different message types
            if message_type == 'transcription_update':
                await self._handle_transcription_update(websocket, payload, connection_id)
            
            elif message_type == 'request_coaching_prompt':
                await self._handle_coaching_prompt_request(websocket, payload, connection_id)
            
            elif message_type == 'request_knowledge':
                await self._handle_knowledge_request(websocket, payload, connection_id)
            
            elif message_type == 'performance_metrics_request':
                await self._handle_performance_request(websocket, connection_id)
            
            elif message_type == 'ping':
                await self._handle_ping(websocket, connection_id)
            
            else:
                self.trail.light(CoachingLEDRanges.TAURI_ERROR_NOTIFICATION, "unknown_message_type",
                               {'message_type': message_type})
            
            processing_time = (time.time() - processing_start) * 1000
            
            performance_metrics = {
                'processing_time_ms': processing_time,
                'message_type': message_type,
                'payload_size': len(data)
            }
            
            self.trail.light(CoachingLEDRanges.TAURI_IPC_RECEIVE, "message_processed",
                           performance_metrics=performance_metrics)
            
        except json.JSONDecodeError as e:
            self.trail.fail(CoachingLEDRanges.TAURI_ERROR_NOTIFICATION, e, "json_decode_error")
            await self._send_error_message(websocket, "Invalid JSON format", connection_id)
        
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.TAURI_IPC_RECEIVE, e, f"message_processing_error_{connection_id}")
            await self._send_error_message(websocket, str(e), connection_id)
    
    async def _handle_transcription_update(self, websocket: WebSocket, payload: Dict[str, Any], connection_id: str):
        """Handle transcription update from frontend."""
        self.trail.light(CoachingLEDRanges.TAURI_UI_UPDATE, "handling_transcription_update")
        
        try:
            transcription_text = payload.get('text', '')
            speaker = payload.get('speaker', 'unknown')
            timestamp = payload.get('timestamp', time.time())
            
            if not self.coaching_system:
                self.trail.light(CoachingLEDRanges.TAURI_ERROR_NOTIFICATION, "no_coaching_system")
                return
            
            # Process transcription for coaching
            coaching_start = time.time()
            coaching_prompt = self.coaching_system.process_transcription(
                transcription_text, speaker, timestamp
            )
            coaching_time = (time.time() - coaching_start) * 1000
            
            # If coaching prompt generated, send to frontend
            if coaching_prompt:
                event = CoachingEvent(
                    event_type="prompt_generated",
                    coaching_prompt=coaching_prompt,
                    timestamp=time.time()
                )
                
                response_message = TauriMessage(
                    message_type="coaching_prompt",
                    payload=asdict(event),
                    timestamp=time.time(),
                    message_id=f"coaching_{int(time.time())}"
                )
                
                await self._send_message_to_connection(websocket, response_message)
                
                self.trail.light(CoachingLEDRanges.TAURI_COACHING_DISPLAY, "coaching_prompt_sent",
                               {'coaching_time_ms': coaching_time,
                                'prompt_type': coaching_prompt.coaching_type})
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.TAURI_UI_UPDATE, e, "transcription_handling_failed")
    
    async def _handle_coaching_prompt_request(self, websocket: WebSocket, payload: Dict[str, Any], connection_id: str):
        """Handle explicit coaching prompt request."""
        self.trail.light(CoachingLEDRanges.TAURI_COACHING_DISPLAY, "handling_coaching_request")
        
        try:
            # Extract context from payload
            conversation_history = payload.get('conversation_history', [])
            current_speaker = payload.get('current_speaker', 'unknown')
            topic = payload.get('topic', 'general')
            
            if not self.coaching_system:
                await self._send_error_message(websocket, "Coaching system not available", connection_id)
                return
            
            # Create context and generate prompt
            from openrouter_coaching_system import CoachingContext
            context = CoachingContext(
                conversation_history=conversation_history,
                current_speaker=current_speaker,
                conversation_topic=topic,
                sentiment_score=payload.get('sentiment', 0.0),
                intent_detected=payload.get('intent', 'general'),
                timestamp=time.time()
            )
            
            # Generate coaching prompt (this would need to be implemented as async)
            # For now, create a mock response
            mock_prompt = CoachingPrompt(
                prompt_text="Consider asking an open-ended question to better understand their needs.",
                confidence=0.85,
                model_used="gpt-4-turbo",
                generation_time_ms=150.0,
                rag_sources=["objection_handling", "discovery_questions"],
                coaching_type="question_guidance",
                urgency_level=2,
                timestamp=time.time()
            )
            
            event = CoachingEvent(
                event_type="prompt_generated",
                coaching_prompt=mock_prompt,
                timestamp=time.time()
            )
            
            response_message = TauriMessage(
                message_type="coaching_prompt",
                payload=asdict(event),
                timestamp=time.time(),
                message_id=f"coaching_req_{int(time.time())}"
            )
            
            await self._send_message_to_connection(websocket, response_message)
            
            self.trail.light(CoachingLEDRanges.TAURI_COACHING_DISPLAY, "coaching_prompt_generated")
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.TAURI_COACHING_DISPLAY, e, "coaching_request_failed")
    
    async def _handle_knowledge_request(self, websocket: WebSocket, payload: Dict[str, Any], connection_id: str):
        """Handle knowledge retrieval request."""
        self.trail.light(CoachingLEDRanges.TAURI_UI_UPDATE, "handling_knowledge_request")
        
        try:
            query = payload.get('query', '')
            max_results = payload.get('max_results', 3)
            
            if not self.rag_system:
                await self._send_error_message(websocket, "RAG system not available", connection_id)
                return
            
            # Create mock context for knowledge retrieval
            from openrouter_coaching_system import CoachingContext
            context = CoachingContext(
                conversation_history=[{"speaker": "user", "text": query, "timestamp": time.time()}],
                current_speaker="user",
                conversation_topic=payload.get('topic', 'general'),
                sentiment_score=0.0,
                intent_detected='knowledge_search',
                timestamp=time.time()
            )
            
            # Retrieve knowledge
            knowledge_start = time.time()
            relevant_knowledge = self.rag_system.retrieve_relevant_knowledge(context, max_results)
            knowledge_time = (time.time() - knowledge_start) * 1000
            
            event = CoachingEvent(
                event_type="knowledge_retrieved",
                relevant_knowledge=relevant_knowledge,
                timestamp=time.time()
            )
            
            response_message = TauriMessage(
                message_type="knowledge_results",
                payload=asdict(event),
                timestamp=time.time(),
                message_id=f"knowledge_{int(time.time())}"
            )
            
            await self._send_message_to_connection(websocket, response_message)
            
            self.trail.light(CoachingLEDRanges.TAURI_UI_UPDATE, "knowledge_results_sent",
                           {'knowledge_time_ms': knowledge_time,
                            'documents_found': len(relevant_knowledge.documents)})
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.TAURI_UI_UPDATE, e, "knowledge_request_failed")
    
    async def _handle_performance_request(self, websocket: WebSocket, connection_id: str):
        """Handle performance metrics request."""
        self.trail.light(CoachingLEDRanges.TAURI_PERFORMANCE_METRICS, "handling_performance_request")
        
        try:
            metrics = self.get_performance_metrics()
            
            event = CoachingEvent(
                event_type="performance_update",
                performance_metrics=metrics,
                timestamp=time.time()
            )
            
            response_message = TauriMessage(
                message_type="performance_metrics",
                payload=asdict(event),
                timestamp=time.time(),
                message_id=f"metrics_{int(time.time())}"
            )
            
            await self._send_message_to_connection(websocket, response_message)
            
            self.trail.light(CoachingLEDRanges.TAURI_PERFORMANCE_METRICS, "performance_metrics_sent")
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.TAURI_PERFORMANCE_METRICS, e, "performance_request_failed")
    
    async def _handle_ping(self, websocket: WebSocket, connection_id: str):
        """Handle ping message for connection health check."""
        pong_message = TauriMessage(
            message_type="pong",
            payload={"server_time": time.time()},
            timestamp=time.time(),
            message_id=f"pong_{int(time.time())}"
        )
        
        await self._send_message_to_connection(websocket, pong_message)
    
    async def _send_message_to_connection(self, websocket: WebSocket, message: TauriMessage):
        """Send message to specific WebSocket connection."""
        self.trail.light(CoachingLEDRanges.TAURI_IPC_SEND, "sending_message")
        
        try:
            message_json = json.dumps(asdict(message))
            await websocket.send_text(message_json)
            self.messages_sent += 1
            
            performance_metrics = {
                'message_size': len(message_json),
                'message_type': message.message_type
            }
            
            self.trail.light(CoachingLEDRanges.TAURI_IPC_SEND, "message_sent",
                           performance_metrics=performance_metrics)
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.TAURI_IPC_SEND, e, "message_send_failed")
            self.connection_errors += 1
    
    async def _send_error_message(self, websocket: WebSocket, error_text: str, connection_id: str):
        """Send error message to frontend."""
        error_message = TauriMessage(
            message_type="error",
            payload={"error": error_text, "connection_id": connection_id},
            timestamp=time.time(),
            message_id=f"error_{int(time.time())}"
        )
        
        await self._send_message_to_connection(websocket, error_message)
        
        self.trail.light(CoachingLEDRanges.TAURI_ERROR_NOTIFICATION, "error_sent",
                        {'error': error_text})
    
    async def broadcast_message(self, message: TauriMessage):
        """Broadcast message to all connected clients."""
        self.trail.light(CoachingLEDRanges.TAURI_IPC_SEND, "broadcasting_message",
                        {'active_connections': len(self.active_connections)})
        
        if not self.active_connections:
            self.trail.light(CoachingLEDRanges.TAURI_IPC_SEND, "no_active_connections")
            return
        
        # Send to all connections
        for websocket in self.active_connections.copy():  # Copy to avoid modification during iteration
            try:
                await self._send_message_to_connection(websocket, message)
            except Exception as e:
                # Remove failed connection
                if websocket in self.active_connections:
                    self.active_connections.remove(websocket)
                self.trail.fail(CoachingLEDRanges.TAURI_IPC_SEND, e, "broadcast_connection_failed")
    
    def start_server(self):
        """Start the Tauri integration server."""
        self.trail.light(CoachingLEDRanges.TAURI_IPC_RECEIVE, "starting_server")
        
        try:
            # Create event loop if not running in one
            try:
                self.event_loop = asyncio.get_event_loop()
            except RuntimeError:
                self.event_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(self.event_loop)
            
            # Start server
            config = uvicorn.Config(
                self.app,
                host=self.host,
                port=self.port,
                log_level="info",
                access_log=False
            )
            
            server = uvicorn.Server(config)
            
            def run_server():
                self.event_loop.run_until_complete(server.serve())
            
            # Start server in background thread
            server_thread = threading.Thread(target=run_server, daemon=True)
            server_thread.start()
            
            self.trail.light(CoachingLEDRanges.TAURI_IPC_RECEIVE, "server_started",
                           {'host': self.host, 'port': self.port})
            
            logger.info(f"Tauri integration server started on {self.host}:{self.port}")
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.TAURI_IPC_RECEIVE, e, "server_start_failed")
            raise
    
    def stop_server(self):
        """Stop the Tauri integration server."""
        self.trail.light(CoachingLEDRanges.TAURI_IPC_RECEIVE, "stopping_server")
        
        try:
            # Close all active connections
            for websocket in self.active_connections:
                asyncio.create_task(websocket.close())
            
            self.active_connections.clear()
            
            self.trail.light(CoachingLEDRanges.TAURI_IPC_RECEIVE, "server_stopped")
            
        except Exception as e:
            self.trail.fail(CoachingLEDRanges.TAURI_IPC_RECEIVE, e, "server_stop_failed")
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics."""
        current_time = time.time()
        uptime = current_time - (current_time - 300)  # Placeholder uptime
        
        metrics = {
            'tauri_integration': {
                'active_connections': len(self.active_connections),
                'messages_sent': self.messages_sent,
                'messages_received': self.messages_received,
                'connection_errors': self.connection_errors,
                'uptime_seconds': uptime,
                'host': self.host,
                'port': self.port
            }
        }
        
        # Add coaching system metrics if available
        if self.coaching_system:
            metrics['coaching_system'] = self.coaching_system.get_performance_metrics()
        
        # Add RAG system metrics if available
        if self.rag_system:
            metrics['rag_system'] = self.rag_system.get_performance_metrics()
        
        # Add breadcrumb trail metrics
        trail_summary = self.trail.get_performance_summary()
        metrics['led_breadcrumbs'] = trail_summary
        
        return metrics

# Global Tauri integration instance
tauri_system: Optional[TauriIntegrationSystem] = None

def get_tauri_system(host: str = "127.0.0.1", port: int = 8765) -> TauriIntegrationSystem:
    """Get or create global Tauri integration system."""
    global tauri_system
    if tauri_system is None:
        tauri_system = TauriIntegrationSystem(host, port)
    return tauri_system

def initialize_tauri_integration(coaching_system: Optional[OpenRouterCoachingSystem] = None,
                                rag_system: Optional[RAGKnowledgeSystem] = None,
                                host: str = "127.0.0.1", port: int = 8765) -> bool:
    """Initialize Tauri integration system with connected systems."""
    try:
        system = get_tauri_system(host, port)
        system.coaching_system = coaching_system
        system.rag_system = rag_system
        system.start_server()
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Tauri integration: {e}")
        return False

if __name__ == "__main__":
    # Example usage and testing
    print("🔗 Testing Tauri Integration System with LED Breadcrumbs")
    print("=" * 60)
    
    # Initialize systems
    from openrouter_coaching_system import OpenRouterCoachingSystem
    from rag_knowledge_system import RAGKnowledgeSystem
    
    # Mock systems for testing
    coaching_system = None  # Would be initialized with API key
    rag_system = RAGKnowledgeSystem()
    
    # Initialize Tauri integration
    tauri_system = TauriIntegrationSystem(
        host="127.0.0.1",
        port=8765,
        coaching_system=coaching_system,
        rag_system=rag_system
    )
    
    print(f"✅ Tauri integration system initialized")
    print(f"   Host: {tauri_system.host}")
    print(f"   Port: {tauri_system.port}")
    
    # Start server
    try:
        tauri_system.start_server()
        print(f"🚀 Server started successfully")
        
        # Print performance metrics
        metrics = tauri_system.get_performance_metrics()
        print(f"\n📊 Performance Metrics:")
        print(f"   Active Connections: {metrics['tauri_integration']['active_connections']}")
        print(f"   Messages Sent: {metrics['tauri_integration']['messages_sent']}")
        print(f"   Messages Received: {metrics['tauri_integration']['messages_received']}")
        
        print(f"\n🔍 LED Breadcrumb Summary:")
        breadcrumb_metrics = metrics['led_breadcrumbs']
        print(f"   Total Operations: {breadcrumb_metrics['total_operations']}")
        print(f"   Success Rate: {breadcrumb_metrics['success_rate']:.1f}%")
        
        print(f"\n✅ Tauri integration test completed")
        print(f"🌐 WebSocket server running at ws://{tauri_system.host}:{tauri_system.port}/coaching")
        print(f"📡 Health check at http://{tauri_system.host}:{tauri_system.port}/health")
        
        # Keep server running for testing
        print(f"\n⏳ Server running... Press Ctrl+C to stop")
        
        try:
            import time
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print(f"\n🛑 Stopping server...")
            tauri_system.stop_server()
            print(f"✅ Server stopped")
            
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        import traceback
        traceback.print_exc()