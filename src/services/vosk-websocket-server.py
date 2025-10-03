#!/usr/bin/env python3
"""
VoiceCoach V2 - WebSocket Vosk Transcription Server
High-performance real-time transcription with <1ms latency
"""
# Use gevent for proper WebSocket support
from gevent import monkey
monkey.patch_all()

import asyncio
import json
import os
import sys
import argparse
from datetime import datetime
from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from vosk import Model, KaldiRecognizer
import sounddevice as sd
import numpy as np
from threading import Thread
import queue
import time

# LED Breadcrumb range: 6000-6099
print(f"[6000] VoiceCoach V2 WebSocket Transcription Server starting at {datetime.now()}")

class VoskWebSocketServer:
    def __init__(self, model_path=None, port=5000, vosk_config=None):
        # LED Breadcrumb 6001: Initialize WebSocket server
        print(f"[6001] Initializing WebSocket server on port {port}")

        # Set default model path
        if model_path is None:
            model_path = r"C:\Users\Administrator\Downloads\LLM\vosk-model-en-us-0.22-lgraph\vosk-model-en-us-0.22-lgraph"

        self.model_path = model_path
        self.port = port
        self.audio_queue = queue.Queue()
        self.is_recording = False
        self.audio_device_validated = False
        self.default_device_info = None

        # Store Vosk configuration (from command-line args)
        self.vosk_config = vosk_config or {}

        # Transcription buffering to prevent overwrites during brief pauses
        self.last_partial_text = ""
        self.last_partial_time = 0
        self.partial_timeout = self.vosk_config.get('partial_timeout', 2.0)
        
        # Initialize Flask app with SocketIO
        self.app = Flask(__name__)
        self.app.config['SECRET_KEY'] = 'voicecoach-v2-secret'
        
        # Enable CORS for all origins
        CORS(self.app, resources={r"/*": {"origins": "*"}})
        
        # ✅ Enhanced CORS configuration for Electron compatibility
        self.socketio = SocketIO(
            self.app, 
            cors_allowed_origins="*",  # Allow all origins for Electron app
            cors_credentials=False,  # Changed to False - can't use True with origin "*"
            async_mode='threading',
            logger=True,
            engineio_logger=True,
            transports=['polling', 'websocket'],  # Explicitly enable both transports
            ping_timeout=60,  # Increase timeout
            ping_interval=25,  # Keep-alive ping
            max_http_buffer_size=1e6,  # 1MB max buffer
            allow_upgrades=True,  # Allow transport upgrades
            compression_threshold=1024  # Enable compression
        )
        
        # LED Breadcrumb 6002: Initialize Vosk
        self._initialize_vosk()
        
        # LED Breadcrumb 6002.5: Validate audio devices before setting up handlers
        self._validate_audio_devices()
        
        # LED Breadcrumb 6003: Setup SocketIO handlers
        self._setup_socket_handlers()
        
    def _validate_audio_devices(self):
        """Validate audio devices and check microphone availability"""
        try:
            print(f"[6002.5] Starting audio device validation")
            
            # Get list of available audio devices
            devices = sd.query_devices()
            print(f"[6002.6] Found {len(devices)} audio devices")
            
            # Find default input device
            try:
                default_input = sd.query_devices(kind='input')
                self.default_device_info = default_input
                
                print(f"[6002.7] Default input device: {default_input['name']} (ID: {default_input.get('index', 'unknown')})")
                print(f"[6002.8] Device channels: {default_input['max_input_channels']}, Sample rate: {default_input['default_samplerate']}")
                
                if default_input['max_input_channels'] == 0:
                    print(f"[8002.1] Warning: Default input device has no input channels")
                    self.audio_device_validated = False
                else:
                    # Test microphone access with a brief recording test
                    self._test_microphone_access()
                    
            except Exception as device_error:
                print(f"[8002.2] No suitable input device found: {device_error}")
                print(f"[8002.3] Available devices: {[d['name'] for d in devices]}")
                self.audio_device_validated = False
                return
                
        except Exception as e:
            print(f"[8002.4] Audio device validation failed: {e}")
            self.audio_device_validated = False
    
    def _test_microphone_access(self):
        """Test microphone access with a brief recording"""
        try:
            print(f"[6002.9] Testing microphone access...")
            
            # Brief test recording (100ms)
            test_duration = 0.1  # 100ms
            sample_rate = self.vosk_config.get('sample_rate', 16000)

            with sd.InputStream(
                samplerate=sample_rate,
                channels=1,
                dtype=np.float32,
                device=None  # Use default input device
            ) as stream:
                # Read a small amount of data to test access
                data, overflowed = stream.read(int(sample_rate * test_duration))
                
                if overflowed:
                    print(f"[8002.5] Warning: Audio buffer overflow during test")
                
                # Check if we got actual audio data
                if len(data) > 0:
                    print(f"[6002.10] Microphone access test successful - captured {len(data)} samples")
                    self.audio_device_validated = True
                else:
                    print(f"[8002.6] Microphone access test failed - no audio data captured")
                    self.audio_device_validated = False
                    
        except Exception as test_error:
            print(f"[8002.7] Microphone access test failed: {test_error}")
            self.audio_device_validated = False
            
            # Provide specific guidance based on error type
            error_str = str(test_error).lower()
            if "device" in error_str and "-1" in error_str:
                print(f"[8002.8] Error querying device -1: This typically means no default microphone is configured")
                print(f"[8002.9] Please check: 1) Microphone is connected 2) Set as default device 3) Privacy permissions granted")
            elif "permission" in error_str:
                print(f"[8002.10] Permission error: Microphone access may be blocked by system privacy settings")
            elif "busy" in error_str or "use" in error_str:
                print(f"[8002.11] Device busy error: Microphone may be in use by another application")

    def _initialize_vosk(self):
        """Initialize Vosk model and recognizer"""
        try:
            if not os.path.exists(self.model_path):
                print(f"[8001] Vosk model not found at: {self.model_path}")
                sys.exit(1)
            
            print(f"[6002] Loading Vosk model from: {self.model_path}")
            self.model = Model(self.model_path)

            # Initialize recognizer with configured sample rate
            sample_rate = self.vosk_config.get('sample_rate', 16000)
            self.recognizer = KaldiRecognizer(self.model, sample_rate)

            # Apply Vosk configuration from UI settings
            set_words = self.vosk_config.get('set_words', True)
            set_partial_words = self.vosk_config.get('set_partial_words', True)

            self.recognizer.SetWords(set_words)
            self.recognizer.SetPartialWords(set_partial_words)

            print(f"[6002] Vosk model loaded successfully (sample_rate={sample_rate}, SetWords={set_words}, SetPartialWords={set_partial_words})")
            
        except Exception as e:
            print(f"[8002] Vosk initialization error: {e}")
            sys.exit(1)
    
    def _setup_socket_handlers(self):
        """Setup SocketIO event handlers"""
        
        @self.socketio.on('connect')
        def handle_connect():
            # LED Breadcrumb 6010: Client connected
            from flask import request
            print(f"[6010] Client connected: {datetime.now()}")
            print(f"[6010.1] Connection from: {request.remote_addr}")
            print(f"[6010.2] Headers: {dict(request.headers)}")
            emit('status', {'message': 'Connected to VoiceCoach V2 Transcription Server'})
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            # LED Breadcrumb 6011: Client disconnected
            print(f"[6011] Client disconnected: {datetime.now()}")
            self.is_recording = False
        
        @self.socketio.on('start_transcription')
        def handle_start_transcription():
            # LED Breadcrumb 6020: Start transcription requested
            print(f"[6020] Start transcription requested from client")
            
            # Simply set recording flag - audio will come from client via audio_chunk events
            self.is_recording = True
            
            # Don't start microphone capture - wait for audio chunks from client!
            # The client is capturing audio and will send it via 'audio_chunk' events
            
            emit('transcription_status', {'status': 'started'})
        
        @self.socketio.on('stop_transcription')
        def handle_stop_transcription():
            # LED Breadcrumb 6021: Stop transcription requested
            print(f"[6021] Stop transcription requested")
            self.is_recording = False
            emit('transcription_status', {'status': 'stopped'})
        
        # 🔧 CRITICAL FIX: Add missing WebSocket event handlers for coaching
        @self.socketio.on('process_transcript')
        def handle_process_transcript(data):
            # LED Breadcrumb 6050: External transcript received for coaching
            print(f"[6050] External transcript received for coaching")
            text = data.get('text', '')
            if text.strip():
                self._trigger_coaching_analysis(text)
        
        @self.socketio.on('transcription')
        def handle_transcription(data):
            # LED Breadcrumb 6051: Transcription event received for coaching
            print(f"[6051] Transcription event received for coaching")
            text = data.get('text', '')
            if text.strip():
                self._trigger_coaching_analysis(text)

        @self.socketio.on('audio_chunk')
        def handle_audio_chunk(data):
            # LED Breadcrumb 6030: Process audio chunk
            print(f"[6030] Audio chunk received, size: {len(data) if data else 0}")
            try:
                # Convert received audio data to bytes if needed
                if isinstance(data, str):
                    # If base64 encoded
                    import base64
                    audio_bytes = base64.b64decode(data)
                else:
                    audio_bytes = data
                
                # Process with Vosk
                if self.recognizer.AcceptWaveform(audio_bytes):
                    # LED Breadcrumb 6031: Final transcript ready
                    result = self.recognizer.Result()
                    result_dict = json.loads(result)
                    final_text = result_dict.get("text", "")
                    
                    if final_text.strip():
                        # Clear partial buffer since we have a final result
                        self.last_partial_text = ""
                        self.last_partial_time = 0
                        
                        response = {
                            "type": "final_transcript",
                            "text": final_text,
                            "timestamp": datetime.now().isoformat(),
                            "breadcrumb": 6031
                        }
                        emit('transcription', response)
                        
                        # Trigger coaching analysis
                        self._trigger_coaching_analysis(final_text)
                else:
                    # LED Breadcrumb 6032: Partial transcript with improved timing
                    partial_result = self.recognizer.PartialResult()
                    partial_dict = json.loads(partial_result)
                    partial_text = partial_dict.get("partial", "")
                    current_time = time.time()
                    
                    if partial_text.strip():
                        # Check if this is a new partial or continuation
                        if (partial_text != self.last_partial_text and 
                            (current_time - self.last_partial_time) > 0.5):  # 500ms gap = new sentence
                            
                            # Auto-finalize previous partial if timeout reached
                            if (self.last_partial_text and 
                                (current_time - self.last_partial_time) > self.partial_timeout):
                                
                                # Emit previous partial as final
                                final_response = {
                                    "type": "final_transcript",
                                    "text": self.last_partial_text,
                                    "timestamp": datetime.now().isoformat(),
                                    "breadcrumb": 6031,
                                    "source": "partial_timeout"
                                }
                                emit('transcription', final_response)
                                self._trigger_coaching_analysis(self.last_partial_text)
                        
                        # Update tracking variables
                        self.last_partial_text = partial_text
                        self.last_partial_time = current_time
                        
                        response = {
                            "type": "partial_transcript",
                            "text": partial_text,
                            "timestamp": datetime.now().isoformat(),
                            "breadcrumb": 6032
                        }
                        emit('transcription', response)
                        
            except Exception as e:
                print(f"[8030] Audio processing error: {e}")
                emit('error', {'message': f'Audio processing error: {str(e)}'})
    
    def _capture_microphone(self):
        """Capture microphone audio and send to Vosk"""
        try:
            # LED Breadcrumb 6040: Start microphone capture
            print(f"[6040] Starting microphone capture")
            
            # Pre-flight audio system check
            if not self.audio_device_validated:
                print(f"[8040.1] Microphone capture aborted: Audio device not validated")
                self.socketio.emit('error', {
                    'message': 'Cannot start microphone capture: Audio device validation failed'
                })
                return
            
            def audio_callback(indata, frames, time, status):
                if status:
                    print(f"[8040] Audio callback status: {status}")
                    # Emit detailed status for client debugging
                    self.socketio.emit('audio_status', {
                        'status': str(status),
                        'frames': frames,
                        'timestamp': datetime.now().isoformat()
                    })
                
                if self.is_recording:
                    # Convert to int16 and queue for processing
                    # 🔧 CRITICAL FIX: Convert cffi buffer to numpy array first
                    audio_data = (np.asarray(indata) * 32767).astype(np.int16)
                    self.audio_queue.put(audio_data.tobytes())
            
            # Start audio stream with enhanced error handling
            sample_rate = self.vosk_config.get('sample_rate', 16000)
            try:
                with sd.RawInputStream(
                    samplerate=sample_rate,
                    channels=1,
                    dtype=np.float32,
                    callback=audio_callback,
                    device=None  # Use default input device
                ):
                    print(f"[6040.1] Audio stream started successfully")
                    self.socketio.emit('audio_status', {
                        'status': 'stream_started',
                        'device': self.default_device_info['name'] if self.default_device_info else 'Unknown',
                        'timestamp': datetime.now().isoformat()
                    })
            except Exception as stream_error:
                print(f"[8040.2] Failed to start audio stream: {stream_error}")
                error_message = f"Audio stream initialization failed: {stream_error}"
                
                # Provide specific troubleshooting based on error
                error_str = str(stream_error).lower()
                troubleshooting = []
                if "device" in error_str:
                    troubleshooting.extend([
                        "Check that microphone is properly connected",
                        "Verify microphone is set as default recording device",
                        "Ensure no other applications are using the microphone"
                    ])
                if "permission" in error_str:
                    troubleshooting.extend([
                        "Grant microphone permissions in Windows Privacy Settings",
                        "Check antivirus software microphone blocking"
                    ])
                
                self.socketio.emit('error', {
                    'message': error_message,
                    'troubleshooting': troubleshooting
                })
                return
                # Process audio queue
                while self.is_recording:
                    try:
                        # Get audio data from queue
                        audio_bytes = self.audio_queue.get(timeout=0.1)
                        
                        # Process with Vosk recognizer
                        if self.recognizer.AcceptWaveform(audio_bytes):
                            # Final transcript
                            result = self.recognizer.Result()
                            result_dict = json.loads(result)
                            final_text = result_dict.get("text", "")
                            
                            if final_text.strip():
                                # Clear partial buffer since we have a final result
                                self.last_partial_text = ""
                                self.last_partial_time = 0
                                
                                response = {
                                    "type": "final_transcript",
                                    "text": final_text,
                                    "timestamp": datetime.now().isoformat(),
                                    "breadcrumb": 6041
                                }
                                self.socketio.emit('transcription', response)
                                self._trigger_coaching_analysis(final_text)
                        else:
                            # Partial transcript with improved timing logic
                            partial_result = self.recognizer.PartialResult()
                            partial_dict = json.loads(partial_result)
                            partial_text = partial_dict.get("partial", "")
                            current_time = time.time()
                            
                            if partial_text.strip():
                                # Check if this is a new partial or continuation
                                if (partial_text != self.last_partial_text and 
                                    (current_time - self.last_partial_time) > 0.5):  # 500ms gap = new sentence
                                    
                                    # Auto-finalize previous partial if timeout reached
                                    if (self.last_partial_text and 
                                        (current_time - self.last_partial_time) > self.partial_timeout):
                                        
                                        # Emit previous partial as final
                                        final_response = {
                                            "type": "final_transcript",
                                            "text": self.last_partial_text,
                                            "timestamp": datetime.now().isoformat(),
                                            "breadcrumb": 6041,
                                            "source": "partial_timeout"
                                        }
                                        self.socketio.emit('transcription', final_response)
                                        self._trigger_coaching_analysis(self.last_partial_text)
                                
                                # Update tracking variables
                                self.last_partial_text = partial_text
                                self.last_partial_time = current_time
                                
                                response = {
                                    "type": "partial_transcript", 
                                    "text": partial_text,
                                    "timestamp": datetime.now().isoformat(),
                                    "breadcrumb": 6042
                                }
                                self.socketio.emit('transcription', response)
                                
                    except queue.Empty:
                        continue
                    except Exception as e:
                        print(f"[8041] Audio processing error: {e}")
                        
            print(f"[6043] Microphone capture stopped")
            
        except Exception as e:
            print(f"[8043] Microphone capture error: {e}")
            
            # Enhanced error reporting with troubleshooting guidance
            error_details = {
                'message': f'Microphone capture error: {str(e)}',
                'error_type': type(e).__name__,
                'device_info': self.default_device_info,
                'troubleshooting_steps': [
                    '1. Check microphone connection and power',
                    '2. Verify microphone is set as default recording device',
                    '3. Check Windows Privacy Settings > Microphone permissions',
                    '4. Close other applications that might be using the microphone',
                    '5. Try unplugging and reconnecting the microphone',
                    '6. Restart the application'
                ],
                'timestamp': datetime.now().isoformat()
            }
            
            self.socketio.emit('error', error_details)
    
    def _trigger_coaching_analysis(self, transcript):
        """Analyze transcript for coaching triggers"""
        # LED Breadcrumb 6050: Coaching analysis
        try:
            # Simple keyword-based coaching triggers
            coaching_triggers = {
                "price": "That's a valid concern. Let's discuss the value this brings...",
                "budget": "I understand budget is important. What budget range were you thinking?",
                "expensive": "I hear your concern about cost. Let me show you the ROI...",
                "timing": "When would be a better time to revisit this?",
                "think about it": "What specific concerns do you have that we should address?",
                "challenge": "Tell me more about that challenge...",
                "goal": "What would success look like for you?",
                "problem": "How is this problem impacting your business?",
                "decision": "Who else is involved in this decision?"
            }
            
            transcript_lower = transcript.lower()
            
            for keyword, suggestion in coaching_triggers.items():
                if keyword in transcript_lower:
                    coaching_response = {
                        "type": "coaching_suggestion",
                        "suggestion": suggestion,
                        "trigger": keyword,
                        "priority": "HIGH" if keyword in ["price", "budget", "expensive"] else "MEDIUM",
                        "category": "objection_handling" if keyword in ["price", "budget", "expensive", "timing"] else "discovery",
                        "context": transcript,
                        "timestamp": datetime.now().isoformat(),
                        "breadcrumb": 6050
                    }
                    self.socketio.emit('coaching_suggestion', coaching_response)
                    break  # Only send one suggestion per transcript
                    
        except Exception as e:
            print(f"[8050] Coaching analysis error: {e}")
    
    def run(self):
        """Start the WebSocket server"""
        # Final audio validation before starting server
        if not self.audio_device_validated:
            print(f"[8099.1] WARNING: Audio device validation failed - server will start but transcription may not work")
            print(f"[8099.2] Recommended actions: Check microphone configuration before attempting transcription")
        else:
            print(f"[6099.1] Audio device validation passed - ready for transcription")
        
        print(f"[6099] VoiceCoach V2 WebSocket Server running on http://localhost:{self.port}")
        print(f"[6099.3] Audio device status: {'[OK] Validated' if self.audio_device_validated else '[FAIL] Not validated'}")
        
        self.socketio.run(
            self.app, 
            host='0.0.0.0', 
            port=self.port,
            debug=False
        )

def main():
    """Main entry point"""
    # Parse command-line arguments from Electron
    parser = argparse.ArgumentParser(description='VoiceCoach V2 Vosk Transcription Server')
    parser.add_argument('--partial-timeout', type=float, default=2.0, help='Partial to final timeout (seconds)')
    parser.add_argument('--sentence-gap', type=float, default=0.5, help='Sentence gap threshold (seconds)')
    parser.add_argument('--min-silence', type=float, default=0.5, help='Minimum trailing silence (seconds)')
    parser.add_argument('--sample-rate', type=int, default=16000, help='Audio sample rate (Hz)')
    parser.add_argument('--chunk-size', type=int, default=8000, help='Audio chunk size')
    parser.add_argument('--mode', type=str, default='sentence', help='Transcription mode')
    parser.add_argument('--min-phrase-words', type=int, default=3, help='Minimum phrase words')
    parser.add_argument('--aggressive', action='store_true', help='Aggressive endpointing')
    parser.add_argument('--enable-partials', action='store_true', help='Enable partial transcripts')
    parser.add_argument('--enable-word-timings', action='store_true', help='Enable word timings')
    parser.add_argument('--set-words', type=str, default='True', help='Vosk SetWords setting')
    parser.add_argument('--set-partial-words', type=str, default='True', help='Vosk SetPartialWords setting')
    parser.add_argument('--other-party-gain', type=int, default=100, help='Audio gain for other party (percentage)')

    args = parser.parse_args()

    # Convert string booleans to actual booleans
    set_words = args.set_words.lower() in ('true', '1', 'yes')
    set_partial_words = args.set_partial_words.lower() in ('true', '1', 'yes')

    # Build config dictionary from parsed arguments
    vosk_config = {
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
        'set_words': set_words,
        'set_partial_words': set_partial_words
    }

    print(f"[6000.1] Vosk configuration loaded from command-line arguments:")
    print(f"[6000.2]   Sample Rate: {vosk_config['sample_rate']}Hz")
    print(f"[6000.3]   SetWords: {vosk_config['set_words']}")
    print(f"[6000.4]   SetPartialWords: {vosk_config['set_partial_words']}")
    print(f"[6000.5]   Partial Timeout: {vosk_config['partial_timeout']}s")
    print(f"[6000.6]   Chunk Size: {vosk_config['chunk_size']}")

    server = VoskWebSocketServer(vosk_config=vosk_config)
    server.run()

if __name__ == "__main__":
    main()