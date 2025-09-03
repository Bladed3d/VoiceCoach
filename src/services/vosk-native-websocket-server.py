#!/usr/bin/env python3
"""
VoiceCoach V2 - Native WebSocket Vosk Server (Working Version)
Receives audio data from client and returns transcription - FIXED asyncio threading issues
Now with configurable parameters from command line and HIGH PRIORITY for better performance
"""
import asyncio
import json
import websockets
import sys
import os
import argparse
from datetime import datetime
from vosk import Model, KaldiRecognizer

# Fix Windows encoding
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())
    
    # Set process priority to HIGH on Windows for better transcription performance
    priority_set = False
    
    # Method 1: Try Windows ctypes first (most reliable on Windows)
    try:
        import ctypes
        from ctypes import wintypes
        
        # Windows priority class constants
        ABOVE_NORMAL_PRIORITY_CLASS = 0x00008000
        HIGH_PRIORITY_CLASS = 0x00000080
        
        kernel32 = ctypes.windll.kernel32
        # Use OpenProcess instead of GetCurrentProcess for better control
        PROCESS_SET_INFORMATION = 0x0200
        handle = kernel32.OpenProcess(PROCESS_SET_INFORMATION, False, os.getpid())
        
        if handle:
            # Try HIGH priority first
            if kernel32.SetPriorityClass(handle, HIGH_PRIORITY_CLASS):
                print("[7320] 🚀 LED PERFORMANCE: Process priority set to HIGH_PRIORITY_CLASS")
                priority_set = True
            else:
                # Fall back to ABOVE_NORMAL if HIGH fails (doesn't require admin)
                if kernel32.SetPriorityClass(handle, ABOVE_NORMAL_PRIORITY_CLASS):
                    print("[7320] 🚀 LED PERFORMANCE: Process priority set to ABOVE_NORMAL_PRIORITY_CLASS")
                    priority_set = True
                else:
                    print("[7321] ⚠️ LED WARNING: Could not set priority via Windows API")
            kernel32.CloseHandle(handle)
    except Exception as e:
        print(f"[7321] ⚠️ LED WARNING: Windows priority setting failed: {e}")
    
    # Method 2: Try psutil if ctypes failed
    if not priority_set:
        try:
            import psutil
            p = psutil.Process(os.getpid())
            # Try HIGH first
            try:
                p.nice(psutil.HIGH_PRIORITY_CLASS)
                print("[7320] 🚀 LED PERFORMANCE: Process priority set to HIGH (psutil)")
                priority_set = True
            except:
                # Try ABOVE_NORMAL as fallback
                try:
                    p.nice(psutil.ABOVE_NORMAL_PRIORITY_CLASS)
                    print("[7320] 🚀 LED PERFORMANCE: Process priority set to ABOVE_NORMAL (psutil)")
                    priority_set = True
                except Exception as e:
                    print(f"[7321] ⚠️ LED WARNING: Could not set priority via psutil: {e}")
        except ImportError:
            print("[7321] ℹ️ LED INFO: Install psutil for additional performance options: pip install psutil")
    
    if priority_set:
        print("[7322] ✅ LED SUCCESS: Vosk server running with elevated priority for faster transcription")
else:
    # Unix/Linux process priority
    try:
        # Set nice value to -5 (higher priority, requires permissions)
        os.nice(-5)
        print("[7320] 🚀 LED PERFORMANCE: Process nice value decreased for better performance")
    except PermissionError:
        print("[7321] ⚠️ LED WARNING: Cannot set process priority (requires elevated permissions)")
    except Exception:
        pass  # Not critical if it fails

class VoskNativeWebSocketServer:
    def __init__(self, model_path=None, host='127.0.0.1', port=5000, config=None):
        self.host = host
        self.port = port
        self.connected_clients = set()
        
        # Store configuration
        self.config = config or {}
        self.partial_timeout = float(self.config.get('partial_timeout', 2.0))
        self.sentence_gap = float(self.config.get('sentence_gap', 0.5))
        self.min_silence = float(self.config.get('min_silence', 0.5))
        self.sample_rate = int(self.config.get('sample_rate', 16000))
        
        # CRITICAL: chunk_size must be provided - no silent fallback!
        if 'chunk_size' not in self.config:
            print("❌ CONFIGURATION ERROR: No chunk_size provided in configuration!")
            print("   Please configure chunk size in Vosk settings before starting.")
            raise ValueError("chunk_size is required in configuration")
        
        self.chunk_size = int(self.config['chunk_size'])
        self.mode = self.config.get('mode', 'sentence')
        self.min_phrase_words = int(self.config.get('min_phrase_words', 3))
        self.aggressive = self.config.get('aggressive', False)
        self.enable_partials = self.config.get('enable_partials', True)
        self.enable_word_timings = self.config.get('enable_word_timings', False)
        self.set_words = self.config.get('set_words', False)
        self.set_partial_words = self.config.get('set_partial_words', True)
        
        # Load Vosk model
        if model_path is None:
            model_path = r"C:\Users\Administrator\Downloads\LLM\vosk-model-en-us-0.22-lgraph\vosk-model-en-us-0.22-lgraph"
        
        print(f"[6000] VoiceCoach V2 Native WebSocket Transcription Server starting at {datetime.now()}")
        print(f"[7313] 🎵 LED VOSK_CONFIG - Received configuration from command line:")
        print(f"  - Transcription mode: {self.mode}")
        print(f"  - Enable partials: {self.enable_partials}")
        print(f"  - Enable word timings: {self.enable_word_timings}")
        print(f"  - SetWords: {self.set_words}")
        print(f"  - SetPartialWords: {self.set_partial_words}")
        print(f"  - Partial timeout: {self.partial_timeout}s")
        print(f"  - Sentence gap: {self.sentence_gap}s")
        print(f"  - Min silence: {self.min_silence}s")
        print(f"  - Sample rate: {self.sample_rate}Hz")
        print(f"  - Chunk size: {self.chunk_size} samples")
        print(f"  - Min phrase words: {self.min_phrase_words}")
        print(f"  - Aggressive endpointing: {self.aggressive}")
        print(f"  - Enable recognizer reset: {config.get('enable_recognizer_reset', False)}")
        print(f"  - Recognizer reset interval: {config.get('recognizer_reset_interval', 30)}s")
        print(f"[6002] Loading Vosk model from: {model_path}")
        self.model = Model(model_path)
        print(f"[6002.1] Vosk model loaded successfully")
        
        # Create recognizer with configured sample rate
        self.recognizer = KaldiRecognizer(self.model, self.sample_rate)
        
        # Configure recognizer based on settings
        print(f"[7314] 🎵 LED VOSK_CONFIG - Applying recognizer settings:")
        
        # Use the explicit SetWords setting from UI
        self.recognizer.SetWords(self.set_words)
        print(f"  - SetWords: {self.set_words} (from UI settings)")
        
        # Use the explicit SetPartialWords setting from UI
        self.recognizer.SetPartialWords(self.set_partial_words)
        print(f"  - SetPartialWords: {self.set_partial_words} (from UI settings)")
            
        print(f"[6002.2] Recognizer initialized for {self.sample_rate}Hz audio, mode={self.mode}")
        
        # Set CPU affinity to use high-performance cores if available
        self._optimize_cpu_affinity()

    async def handle_client(self, websocket, path):
        """Handle client connection and messages"""
        client_addr = websocket.remote_address
        print(f"[6010] Client connected from {client_addr}")
        
        self.connected_clients.add(websocket)
        print(f"[6010.1] Total connected clients: {len(self.connected_clients)}")
        
        try:
            # Send welcome message
            welcome = {
                "type": "server_ready",
                "message": "VoiceCoach V2 native WebSocket server connected",
                "timestamp": datetime.now().isoformat(),
                "model": "vosk-en-us-0.22-lgraph",
                "sample_rate": 16000
            }
            await websocket.send(json.dumps(welcome))
            print(f"[6010.2] Welcome message sent to client")
            
            # Handle messages
            async for message in websocket:
                await self.process_message(websocket, message)
                
        except websockets.exceptions.ConnectionClosed:
            print(f"[6011] Client disconnected from {client_addr}")
            print(f"[6011.1] Remaining connected clients: {len(self.connected_clients) - 1}")
        except Exception as e:
            print(f"[8011] WebSocket connection error: {e}")
        finally:
            self.connected_clients.discard(websocket)

    async def process_message(self, websocket, message):
        """Process incoming message from client"""
        try:
            # Check if binary audio data
            if isinstance(message, bytes):
                print(f"[6021] Received binary audio data: {len(message)} bytes")
                await self.process_audio(message)
                return
            
            # Try JSON message
            try:
                data = json.loads(message)
                msg_type = data.get('type', 'unknown')
                print(f"[6020] Received message type: {msg_type}")
                
                if msg_type == 'start_transcription':
                    await self.start_transcription(websocket)
                elif msg_type == 'stop_transcription':
                    await self.stop_transcription(websocket)
                else:
                    print(f"[6020.1] Unknown message type: {msg_type}")
                    
            except json.JSONDecodeError:
                print(f"[8020.1] Failed to parse message as JSON: {message[:100]}")
                
        except Exception as e:
            print(f"[8020] Error handling client message: {e}")
            error_response = {
                "type": "error", 
                "message": f"Failed to process message: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send(json.dumps(error_response))

    async def process_audio(self, audio_bytes):
        """Process incoming audio data from client"""
        try:
            # Check if recognizer reset is enabled in config
            enable_reset = self.config.get('enable_recognizer_reset', False)
            reset_interval = int(self.config.get('recognizer_reset_interval', 30))
            
            if enable_reset:
                # Only reset if enabled and interval has passed
                if not hasattr(self, '_last_reset') or (datetime.now() - self._last_reset).seconds > reset_interval:
                    self.recognizer = KaldiRecognizer(self.model, self.sample_rate)
                    self._last_reset = datetime.now()
                    print(f"[6022.0] Recognizer reset after {reset_interval}s interval")
            
            # Only log larger chunks to reduce console spam
            if len(audio_bytes) > 1000:
                print(f"[6022] Processing {len(audio_bytes)} bytes of audio data")
            
            # Process with Vosk (audio is already in 16-bit PCM format from client)
            if self.recognizer.AcceptWaveform(audio_bytes):
                # Final result (triggered by silence detection)
                result = json.loads(self.recognizer.Result())
                if result.get('text', '').strip():
                    print(f"[6022.1] Final transcript: '{result['text']}'")
                    await self.broadcast_transcript('final', result['text'])
            else:
                # Only send partial results if enabled in config
                if self.enable_partials:
                    partial = json.loads(self.recognizer.PartialResult())
                    if partial.get('partial', '').strip():
                        print(f"[6022.2] Partial transcript: '{partial['partial']}'")
                        await self.broadcast_transcript('partial', partial['partial'])
                    
        except Exception as e:
            print(f"[8022] Error processing audio data: {e}")

    async def start_transcription(self, websocket):
        """Start transcription for a client"""
        try:
            print(f"[6030] Starting transcription for client {websocket.remote_address}")
            
            response = {
                "type": "transcription_started",
                "message": "Ready to receive audio data",
                "timestamp": datetime.now().isoformat()
            }
            
            print(f"[6030.1] Transcription started for client")
            await websocket.send(json.dumps(response))
            
        except Exception as e:
            print(f"[8030] Error starting transcription: {e}")
            error_response = {
                "type": "error",
                "message": f"Failed to start transcription: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send(json.dumps(error_response))

    async def stop_transcription(self, websocket):
        """Stop transcription for a client"""
        try:
            print(f"[6031] Stopping transcription for client {websocket.remote_address}")
            
            response = {
                "type": "transcription_stopped",
                "message": "Transcription stopped",
                "timestamp": datetime.now().isoformat()
            }
            
            await websocket.send(json.dumps(response))
            print(f"[6031.1] Transcription stopped for client")
            
        except Exception as e:
            print(f"[8031] Error stopping transcription: {e}")
            error_response = {
                "type": "error",
                "message": f"Failed to stop transcription: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send(json.dumps(error_response))

    def _optimize_cpu_affinity(self):
        """Optimize CPU affinity for better performance"""
        try:
            import psutil
            p = psutil.Process()
            
            # Get available CPU count
            cpu_count = psutil.cpu_count(logical=True)
            physical_count = psutil.cpu_count(logical=False)
            
            print(f"[7323] ℹ️ LED INFO: System has {physical_count} physical cores, {cpu_count} logical cores")
            
            # Intelligent core selection based on system configuration
            if cpu_count >= 8:
                # On systems with 8+ cores, use the last half (often P-cores on Intel 12th gen+)
                # Skip the first core (0) which handles interrupts
                high_perf_cores = list(range(max(1, cpu_count // 2), cpu_count))
                p.cpu_affinity(high_perf_cores)
                print(f"[7324] 🚀 LED PERFORMANCE: CPU affinity set to cores {high_perf_cores} (high-performance cores)")
            elif cpu_count >= 4:
                # On 4-6 core systems, use cores 2 and up (avoid 0 and 1 for system tasks)
                selected_cores = list(range(2, cpu_count))
                if selected_cores:
                    p.cpu_affinity(selected_cores)
                    print(f"[7324] 🚀 LED PERFORMANCE: CPU affinity set to cores {selected_cores} (avoiding system cores)")
                else:
                    print(f"[7323] ℹ️ LED INFO: Using all available cores")
            else:
                # On dual-core or less, use all available
                print(f"[7323] ℹ️ LED INFO: System has {cpu_count} cores, using all available")
                
            # Set thread priority within the process
            try:
                import threading
                # Increase main thread priority (Windows-specific)
                if hasattr(threading, 'current_thread'):
                    thread = threading.current_thread()
                    if hasattr(thread, 'native_id'):
                        print(f"[7325] ℹ️ LED INFO: Main thread ID: {thread.native_id}")
            except:
                pass  # Thread priority is optional
                
        except ImportError:
            print("[7326] ℹ️ LED INFO: psutil not available for CPU affinity optimization")
            print("      Install with: pip install psutil")
        except AttributeError as e:
            print(f"[7327] ⚠️ LED WARNING: CPU affinity not supported on this system: {e}")
        except Exception as e:
            print(f"[7328] ⚠️ LED WARNING: Could not set CPU affinity: {e}")

    async def broadcast_transcript(self, transcript_type, text):
        """Send transcript to all clients"""
        message = {
            "type": f"{transcript_type}_transcript",
            "text": text,
            "timestamp": datetime.now().isoformat()
        }
        
        # Broadcast to all clients
        if self.connected_clients:
            await asyncio.gather(
                *[client.send(json.dumps(message)) for client in self.connected_clients],
                return_exceptions=True
            )
            
        # Trigger coaching analysis for final transcripts
        if transcript_type == 'final':
            await self.analyze_for_coaching(text)

    async def analyze_for_coaching(self, transcript):
        """Analyze transcript for coaching opportunities"""
        try:
            print(f"[6050] Analyzing transcript for coaching: '{transcript[:50]}...'")
            
            # FAILED STATE - No real coaching available
            coaching_triggers = {
                "price": "FAILED: Coaching system offline - cannot provide price objection handling",
                "budget": "FAILED: Coaching system offline - cannot provide budget guidance",
                "expensive": "FAILED: Coaching system offline - cannot provide ROI guidance",
                "timing": "FAILED: Coaching system offline - cannot provide timing guidance",
                "think about it": "FAILED: Coaching system offline - cannot provide decision guidance",
                "challenge": "FAILED: Coaching system offline - cannot provide challenge exploration",
                "goal": "FAILED: Coaching system offline - cannot provide goal exploration",
                "problem": "FAILED: Coaching system offline - cannot provide problem analysis",
                "decision": "FAILED: Coaching system offline - cannot provide decision mapping"
            }
            
            transcript_lower = transcript.lower()
            for trigger, suggestion in coaching_triggers.items():
                if trigger in transcript_lower:
                    coaching_message = {
                        "type": "coaching_suggestion",
                        "suggestion": suggestion,
                        "trigger": trigger,
                        "priority": "HIGH",
                        "category": "objection_handling",
                        "context": transcript,
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    # Send coaching suggestion to all clients
                    if self.connected_clients:
                        await asyncio.gather(
                            *[client.send(json.dumps(coaching_message)) for client in self.connected_clients],
                            return_exceptions=True
                        )
                    
                    print(f"[6051] Coaching suggestion sent: {trigger} -> {suggestion[:30]}...")
                    break
                    
        except Exception as e:
            print(f"[8050] Error analyzing transcript for coaching: {e}")

    async def start_server(self):
        """Start the WebSocket server"""
        print(f"[6099] Starting VoiceCoach V2 Native WebSocket Server")
        print(f"[6099.1] Server address: ws://{self.host}:{self.port}")
        print(f"[6099.4] Native WebSocket server started successfully")
        print(f"[6099.5] Waiting for client connections...")
        
        async with websockets.serve(self.handle_client, self.host, self.port):
            await asyncio.Future()  # Run forever

if __name__ == "__main__":
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='VoiceCoach V2 Vosk WebSocket Server')
    parser.add_argument('--partial-timeout', type=float, default=2.0,
                        help='Timeout for partial to final conversion (seconds)')
    parser.add_argument('--sentence-gap', type=float, default=0.5,
                        help='Gap threshold for sentence detection (seconds)')
    parser.add_argument('--min-silence', type=float, default=0.5,
                        help='Minimum trailing silence for finals (seconds)')
    parser.add_argument('--sample-rate', type=int, default=16000,
                        help='Audio sample rate (Hz)')
    parser.add_argument('--chunk-size', type=int, default=8000,
                        help='Audio chunk size (samples)')
    parser.add_argument('--mode', choices=['word', 'phrase', 'sentence', 'hybrid'],
                        default='sentence', help='Transcription mode')
    parser.add_argument('--min-phrase-words', type=int, default=3,
                        help='Minimum words for phrase detection')
    parser.add_argument('--aggressive', action='store_true',
                        help='Use aggressive endpointing')
    parser.add_argument('--enable-partials', action='store_true', default=False,
                        help='Enable partial results (default: disabled for cleaner output)')
    parser.add_argument('--enable-word-timings', action='store_true', default=False,
                        help='Enable word-level timestamps (default: disabled)')
    parser.add_argument('--set-words', type=lambda x: x.lower() == 'true', default=False,
                        help='Vosk SetWords parameter (affects accuracy)')
    parser.add_argument('--set-partial-words', type=lambda x: x.lower() == 'true', default=True,
                        help='Vosk SetPartialWords parameter (reduces fragmentation)')
    parser.add_argument('--enable-recognizer-reset', action='store_true', default=False,
                        help='Enable periodic recognizer reset (default: disabled)')
    parser.add_argument('--recognizer-reset-interval', type=int, default=30,
                        help='Seconds between recognizer resets (default: 30)')
    parser.add_argument('--model-path', type=str, default=None,
                        help='Path to Vosk model')
    parser.add_argument('--host', type=str, default='127.0.0.1',
                        help='WebSocket server host')
    parser.add_argument('--port', type=int, default=5000,
                        help='WebSocket server port')
    
    args = parser.parse_args()
    
    # Convert args to config dict
    config = {
        'partial_timeout': args.partial_timeout,
        'sentence_gap': args.sentence_gap,
        'min_silence': args.min_silence,
        'sample_rate': args.sample_rate,
        'chunk_size': args.chunk_size,
        'mode': args.mode,
        'min_phrase_words': args.min_phrase_words,
        'aggressive': args.aggressive,
        'enable_partials': args.enable_partials,
        'enable_word_timings': args.enable_word_timings,
        'set_words': args.set_words,
        'set_partial_words': args.set_partial_words,
        'enable_recognizer_reset': args.enable_recognizer_reset,
        'recognizer_reset_interval': args.recognizer_reset_interval
    }
    
    print(f"[6000.1] Starting with configuration: {config}")
    
    server = VoskNativeWebSocketServer(
        model_path=args.model_path,
        host=args.host,
        port=args.port,
        config=config
    )
    asyncio.run(server.start_server())