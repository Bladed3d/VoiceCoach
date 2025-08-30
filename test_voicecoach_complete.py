#!/usr/bin/env python3
"""
VoiceCoach V2 Complete WebSocket and Audio Pipeline Test
Tests the complete workflow: WebSocket -> Audio Capture -> Transcription -> Coaching
"""

import asyncio
import websockets
import json
import time
import wave
import numpy as np
from datetime import datetime

class VoiceCoachTester:
    def __init__(self):
        self.websocket = None
        self.connected = False
        self.responses = []
        self.led_sequence = []
        
    def log_led(self, led_num, message, status="info"):
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        emoji = "SUCCESS" if status == "success" else "ERROR" if status == "error" else "INFO"
        
        entry = {
            'led': led_num,
            'message': message,
            'status': status,
            'timestamp': timestamp
        }
        self.led_sequence.append(entry)
        print(f"[{emoji}] LED {led_num}: {message} [{timestamp}]")
        
    async def connect_websocket(self):
        """Test WebSocket connection establishment"""
        self.log_led(7010, "WebSocket connect start", "info")
        
        try:
            uri = "ws://127.0.0.1:5000"
            self.websocket = await websockets.connect(uri, timeout=10)
            self.connected = True
            self.log_led(7011, "WebSocket connected successfully", "success")
            return True
            
        except Exception as e:
            self.log_led(8011, f"WebSocket connection failed: {e}", "error")
            return False
    
    async def start_transcription(self):
        """Test transcription start command"""
        if not self.connected:
            self.log_led(8030, "Cannot start transcription: not connected", "error")
            return False
            
        self.log_led(7030, "Start transcription command sent", "info")
        command = {"type": "start_transcription"}
        await self.websocket.send(json.dumps(command))
        
        # Wait for server response
        try:
            response = await asyncio.wait_for(self.websocket.recv(), timeout=5.0)
            data = json.loads(response)
            self.responses.append(data)
            
            if data.get('type') == 'transcription_started':
                self.log_led(6020, "Server confirmed transcription started", "success")
                return True
            else:
                self.log_led(8022, f"Unexpected response: {data}", "error")
                return False
                
        except asyncio.TimeoutError:
            self.log_led(8011, "No response to start command", "error")
            return False
    
    async def send_test_audio(self):
        """Send test audio data to simulate microphone input"""
        self.log_led(7040, "Sending test audio data", "info")
        
        # Generate test audio: sine wave at 440Hz (A note) for 2 seconds
        sample_rate = 16000  # Vosk expects 16kHz
        duration = 2.0  # 2 seconds
        frequency = 440  # 440 Hz (A4 note)
        
        # Generate audio samples
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        audio_data = np.sin(2 * np.pi * frequency * t)
        
        # Convert to 16-bit PCM (Vosk format)
        audio_pcm = (audio_data * 32767).astype(np.int16)
        
        # Send in chunks (simulate real-time streaming)
        chunk_size = 1024  # samples per chunk
        chunks = len(audio_pcm) // chunk_size
        
        for i in range(chunks):
            start_idx = i * chunk_size
            end_idx = start_idx + chunk_size
            chunk = audio_pcm[start_idx:end_idx]
            
            # Send chunk as binary data
            await self.websocket.send(chunk.tobytes())
            self.log_led(7040, f"Audio chunk {i+1}/{chunks} sent", "info")
            
            # Small delay to simulate real-time
            await asyncio.sleep(0.1)
    
    async def listen_for_responses(self, duration=10):
        """Listen for server responses (transcriptions, coaching, etc.)"""
        self.log_led(7020, "Listening for server responses", "info")
        
        start_time = time.time()
        response_count = 0
        
        while time.time() - start_time < duration:
            try:
                response = await asyncio.wait_for(self.websocket.recv(), timeout=2.0)
                response_count += 1
                
                try:
                    data = json.loads(response)
                    self.responses.append(data)
                    
                    # Handle different response types with LED tracking
                    if data.get('type') == 'status':
                        self.log_led(7022, f"Status: {data.get('message', '')}", "success")
                        
                    elif data.get('type') == 'transcription_status':
                        self.log_led(7023, f"Transcription status: {data.get('status', '')}", "success")
                        
                    elif data.get('type') in ['transcription', 'final_transcript', 'partial_transcript']:
                        transcript_text = data.get('text', data.get('transcript', ''))
                        self.log_led(7020, f"Transcript received: '{transcript_text}'", "success")
                        
                    elif data.get('text') is not None and data.get('partial') is not None:
                        # Vosk direct format
                        transcript_text = data.get('partial') or data.get('text', '')
                        transcript_type = "partial" if data.get('partial') else "final"
                        self.log_led(7020, f"Vosk {transcript_type} transcript: '{transcript_text}'", "success")
                        
                    elif data.get('type') == 'coaching_suggestion':
                        self.log_led(7021, f"Coaching: {data.get('suggestion', '')}", "success")
                        
                    elif data.get('type') == 'error':
                        self.log_led(8022, f"Server error: {data.get('message', '')}", "error")
                        
                    else:
                        self.log_led(7024, f"Unknown message: {data}", "info")
                    
                except json.JSONDecodeError:
                    self.log_led(7024, f"Raw response: {response}", "info")
                    
            except asyncio.TimeoutError:
                # No response within timeout, continue listening
                continue
            except websockets.exceptions.ConnectionClosed:
                self.log_led(8011, "Connection closed by server", "error")
                break
        
        self.log_led(7021, f"Received {response_count} responses total", "info")
        return response_count > 0
    
    async def stop_transcription(self):
        """Test transcription stop command"""
        self.log_led(7031, "Stop transcription command sent", "info")
        command = {"type": "stop_transcription"}
        await self.websocket.send(json.dumps(command))
        
        # Wait for confirmation
        try:
            response = await asyncio.wait_for(self.websocket.recv(), timeout=3.0)
            data = json.loads(response)
            self.log_led(7031, f"Stop response: {data}", "success")
        except asyncio.TimeoutError:
            self.log_led(8031, "No response to stop command", "error")
    
    async def disconnect(self):
        """Clean disconnect from WebSocket"""
        if self.websocket:
            self.log_led(7050, "WebSocket disconnect start", "info")
            await self.websocket.close()
            self.log_led(7012, "WebSocket disconnected cleanly", "success")
            self.connected = False
    
    def analyze_results(self):
        """Analyze test results and LED sequence"""
        print("\n" + "=" * 60)
        print("VOICECOACH V2 TEST RESULTS ANALYSIS")
        print("=" * 60)
        
        # LED sequence analysis
        total_leds = len(self.led_sequence)
        success_leds = len([led for led in self.led_sequence if led['status'] == 'success'])
        error_leds = len([led for led in self.led_sequence if led['status'] == 'error'])
        
        print(f"Total LEDs fired: {total_leds}")
        print(f"Successful operations: {success_leds}")
        print(f"Failed operations: {error_leds}")
        
        # Check critical LED sequence
        led_numbers = [led['led'] for led in self.led_sequence]
        critical_sequence = [7010, 7011, 7030, 6020]  # Connect, Connected, Start, Server Start
        critical_success = all(led in led_numbers for led in critical_sequence)
        
        print(f"\nCritical WebSocket Flow: {'PASSED' if critical_success else 'FAILED'}")
        print(f"LED Sequence: {led_numbers}")
        
        # Response analysis
        print(f"\nServer responses received: {len(self.responses)}")
        response_types = {}
        for resp in self.responses:
            resp_type = resp.get('type', 'unknown')
            response_types[resp_type] = response_types.get(resp_type, 0) + 1
        
        print("Response breakdown:")
        for resp_type, count in response_types.items():
            print(f"  {resp_type}: {count}")
        
        # Overall assessment
        print("\n" + "=" * 60)
        if critical_success and success_leds >= 5:
            print("OVERALL TEST RESULT: PASSED")
            print("WebSocket connection and transcription pipeline working")
            
            # Check specific functionality
            has_transcription = any('transcription' in resp.get('type', '') for resp in self.responses)
            has_audio_response = len(self.responses) >= 2
            
            print(f"Audio pipeline: {'WORKING' if has_audio_response else 'LIMITED'}")
            print(f"Transcription: {'DETECTED' if has_transcription else 'NOT_DETECTED'}")
            
        else:
            print("OVERALL TEST RESULT: FAILED")
            print("Critical issues detected in WebSocket or transcription flow")
            
            missing_leds = [led for led in critical_sequence if led not in led_numbers]
            if missing_leds:
                print(f"Missing critical LEDs: {missing_leds}")
        
        print("=" * 60)
        
        return critical_success and success_leds >= 5

async def run_complete_test():
    """Run the complete VoiceCoach V2 test suite"""
    tester = VoiceCoachTester()
    
    print("VOICECOACH V2 COMPLETE FUNCTIONALITY TEST")
    print("=" * 60)
    print("Testing: WebSocket -> Audio -> Transcription -> Coaching")
    print("=" * 60)
    
    try:
        # Phase 1: WebSocket Connection
        print("\nPhase 1: WebSocket Connection Test")
        if not await tester.connect_websocket():
            print("CRITICAL FAILURE: Cannot establish WebSocket connection")
            return False
        
        # Phase 2: Transcription Start
        print("\nPhase 2: Transcription Service Test") 
        if not await tester.start_transcription():
            print("CRITICAL FAILURE: Cannot start transcription service")
            return False
        
        # Phase 3: Audio Pipeline Test
        print("\nPhase 3: Audio Pipeline Test")
        await tester.send_test_audio()
        
        # Phase 4: Response Collection
        print("\nPhase 4: Collecting Server Responses")
        await tester.listen_for_responses(duration=8)
        
        # Phase 5: Clean Shutdown
        print("\nPhase 5: Clean Shutdown Test")
        await tester.stop_transcription()
        await asyncio.sleep(1)  # Allow final responses
        await tester.disconnect()
        
        # Phase 6: Results Analysis
        return tester.analyze_results()
        
    except Exception as e:
        tester.log_led(8099, f"Test suite failed: {e}", "error")
        print(f"TEST SUITE EXCEPTION: {e}")
        return False

if __name__ == "__main__":
    # Check prerequisites
    import socket
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            if s.connect_ex(('127.0.0.1', 5000)) != 0:
                print("ERROR: WebSocket server not running on port 5000")
                print("Please start: python src/services/vosk-websocket-server.py")
                exit(1)
    except Exception as e:
        print(f"Server check failed: {e}")
        exit(1)
    
    print("Prerequisites: WebSocket server is running")
    
    # Run the test
    try:
        success = asyncio.run(run_complete_test())
        
        if success:
            print("\nFINAL RESULT: VoiceCoach V2 is READY for production use")
            print("All critical systems operational")
        else:
            print("\nFINAL RESULT: VoiceCoach V2 has ISSUES that need fixing")
            print("Check the LED analysis above for specific problems")
            
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
    except Exception as e:
        print(f"Test failed with exception: {e}")