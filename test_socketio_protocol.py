#!/usr/bin/env python3
"""
VoiceCoach V2 Socket.IO Protocol Test
Tests the actual Socket.IO protocol used by the server
"""

import socketio
import time
import asyncio
from datetime import datetime

class VoiceCoachSocketIOTester:
    def __init__(self):
        self.sio = socketio.Client()
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
    
    def setup_handlers(self):
        """Setup Socket.IO event handlers"""
        
        @self.sio.event
        def connect():
            self.log_led(7011, "Socket.IO connected successfully", "success")
            self.connected = True
        
        @self.sio.event
        def disconnect():
            self.log_led(7012, "Socket.IO disconnected", "info")
            self.connected = False
        
        @self.sio.on('status')
        def on_status(data):
            self.log_led(7022, f"Status: {data.get('message', '')}", "success")
            self.responses.append(('status', data))
        
        @self.sio.on('transcription_status')
        def on_transcription_status(data):
            self.log_led(7023, f"Transcription status: {data.get('status', '')}", "success")
            self.responses.append(('transcription_status', data))
        
        @self.sio.on('transcription')
        def on_transcription(data):
            transcript_text = data.get('text', '')
            self.log_led(7020, f"Transcript: '{transcript_text}'", "success")
            self.responses.append(('transcription', data))
        
        @self.sio.on('coaching_suggestion')
        def on_coaching_suggestion(data):
            suggestion = data.get('suggestion', '')
            self.log_led(7021, f"Coaching: {suggestion}", "success")
            self.responses.append(('coaching_suggestion', data))
        
        @self.sio.on('error')
        def on_error(data):
            error_msg = data.get('message', '') if isinstance(data, dict) else str(data)
            self.log_led(8022, f"Server error: {error_msg}", "error")
            self.responses.append(('error', data))
        
        @self.sio.on('audio_status')
        def on_audio_status(data):
            audio_status = data.get('status', '')
            self.log_led(7025, f"Audio status: {audio_status}", "info")
            self.responses.append(('audio_status', data))
    
    def connect_to_server(self):
        """Connect to Socket.IO server"""
        self.log_led(7010, "Socket.IO connect start", "info")
        
        try:
            # Connect to Socket.IO server
            self.sio.connect('http://127.0.0.1:5000')
            return True
        except Exception as e:
            self.log_led(8011, f"Connection failed: {e}", "error")
            return False
    
    def test_transcription_flow(self):
        """Test the complete transcription flow"""
        if not self.connected:
            self.log_led(8030, "Cannot test: not connected", "error")
            return False
        
        # Start transcription
        self.log_led(7030, "Emitting start_transcription event", "info")
        self.sio.emit('start_transcription')
        
        # Wait for responses
        self.log_led(7020, "Waiting for server responses...", "info")
        time.sleep(3)  # Give server time to respond
        
        # Stop transcription
        self.log_led(7031, "Emitting stop_transcription event", "info")
        self.sio.emit('stop_transcription')
        
        # Final wait
        time.sleep(1)
        
        return len(self.responses) > 0
    
    def analyze_results(self):
        """Analyze test results"""
        print("\n" + "=" * 60)
        print("SOCKET.IO PROTOCOL TEST RESULTS")
        print("=" * 60)
        
        # LED analysis
        total_leds = len(self.led_sequence)
        success_leds = len([led for led in self.led_sequence if led['status'] == 'success'])
        error_leds = len([led for led in self.led_sequence if led['status'] == 'error'])
        
        print(f"Total LEDs fired: {total_leds}")
        print(f"Successful operations: {success_leds}")
        print(f"Failed operations: {error_leds}")
        
        # Response analysis
        print(f"\nServer responses received: {len(self.responses)}")
        response_types = {}
        for resp_type, data in self.responses:
            response_types[resp_type] = response_types.get(resp_type, 0) + 1
        
        print("Response breakdown:")
        for resp_type, count in response_types.items():
            print(f"  {resp_type}: {count}")
            
        # Show actual responses
        print("\nDetailed responses:")
        for i, (resp_type, data) in enumerate(self.responses[:10]):  # Show first 10
            print(f"  {i+1}. {resp_type}: {data}")
        
        # Critical path validation
        led_numbers = [led['led'] for led in self.led_sequence]
        critical_leds = [7010, 7011, 7030]  # Connect start, connected, start command
        critical_success = all(led in led_numbers for led in critical_leds)
        
        print(f"\nCritical Socket.IO flow: {'PASSED' if critical_success else 'FAILED'}")
        print(f"LED sequence: {led_numbers}")
        
        # Protocol compatibility check
        has_transcription_status = any(resp_type == 'transcription_status' for resp_type, _ in self.responses)
        has_status_message = any(resp_type == 'status' for resp_type, _ in self.responses)
        
        print(f"\nProtocol compatibility:")
        print(f"  Status messages: {'YES' if has_status_message else 'NO'}")
        print(f"  Transcription status: {'YES' if has_transcription_status else 'NO'}")
        print(f"  Error handling: {'YES' if error_leds == 0 else 'ERRORS DETECTED'}")
        
        # Overall assessment
        print("\n" + "=" * 60)
        if critical_success and len(self.responses) >= 2 and error_leds == 0:
            print("OVERALL RESULT: SOCKET.IO PROTOCOL WORKING")
            print("The server is using Socket.IO, not native WebSocket")
            print("Client needs to use Socket.IO library, not WebSocket API")
        else:
            print("OVERALL RESULT: SOCKET.IO PROTOCOL ISSUES DETECTED")
            if not critical_success:
                print("- Connection flow incomplete")
            if len(self.responses) < 2:
                print("- Insufficient server responses")
            if error_leds > 0:
                print("- Errors detected in communication")
        
        print("=" * 60)
        
        return critical_success and len(self.responses) >= 2
    
    def disconnect(self):
        """Disconnect from server"""
        if self.connected:
            self.log_led(7050, "Socket.IO disconnect start", "info")
            self.sio.disconnect()

def run_socketio_test():
    """Run Socket.IO protocol test"""
    print("VOICECOACH V2 SOCKET.IO PROTOCOL TEST")
    print("=" * 60)
    print("Testing actual protocol used by Python server")
    print("=" * 60)
    
    tester = VoiceCoachSocketIOTester()
    
    try:
        # Setup handlers
        tester.setup_handlers()
        
        # Connect
        print("\nPhase 1: Connection Test")
        if not tester.connect_to_server():
            print("CRITICAL: Cannot connect to Socket.IO server")
            return False
        
        # Test transcription flow
        print("\nPhase 2: Transcription Flow Test")
        success = tester.test_transcription_flow()
        
        # Analyze results
        print("\nPhase 3: Results Analysis")
        result = tester.analyze_results()
        
        return result
        
    except KeyboardInterrupt:
        print("\nTest interrupted")
        return False
    except Exception as e:
        print(f"\nTest failed: {e}")
        return False
    finally:
        tester.disconnect()

if __name__ == "__main__":
    # Check server availability
    import socket
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            if s.connect_ex(('127.0.0.1', 5000)) != 0:
                print("ERROR: Server not running on port 5000")
                exit(1)
    except Exception as e:
        print(f"Server check failed: {e}")
        exit(1)
    
    print("Server is available, testing Socket.IO protocol...")
    
    success = run_socketio_test()
    
    if success:
        print("\nFINAL RESULT: Socket.IO protocol is working correctly")
        print("IMPORTANT: Client must use Socket.IO, not native WebSocket!")
    else:
        print("\nFINAL RESULT: Socket.IO protocol test failed")
        print("Check server configuration and try again")