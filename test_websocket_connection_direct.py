#!/usr/bin/env python3
"""
Direct WebSocket Connection Test for VoiceCoach V2
Tests the complete WebSocket pipeline with LED breadcrumb tracking
"""
import asyncio
import websockets
import json
import time
from datetime import datetime

class VoiceCoachPipelineTester:
    def __init__(self):
        self.server_url = "ws://127.0.0.1:5000"
        self.results = {
            'connection_successful': False,
            'messages_received': [],
            'led_breadcrumbs': [],
            'latency_ms': [],
            'errors': []
        }
    
    def led_light(self, led_number, operation, **kwargs):
        """Simulate VoiceCoach V2 LED breadcrumb system"""
        breadcrumb = {
            'led': led_number,
            'operation': operation,
            'timestamp': datetime.now().isoformat(),
            **kwargs
        }
        self.results['led_breadcrumbs'].append(breadcrumb)
        print(f"LED {led_number}: {operation}")
        return breadcrumb
    
    async def test_complete_pipeline(self):
        """Test the complete WebSocket transcription pipeline"""
        print("VoiceCoach V2 Pipeline Test Starting...")
        
        # LED 7010: WebSocket connect start
        self.led_light(7010, 'websocket_connect_start', server_url=self.server_url)
        
        try:
            start_time = time.time()
            
            # Connect to WebSocket server
            async with websockets.connect(self.server_url) as websocket:
                connection_time = (time.time() - start_time) * 1000
                
                # LED 7011: WebSocket connected
                self.led_light(7011, 'websocket_connected', 
                             connection_time_ms=connection_time)
                self.results['connection_successful'] = True
                self.results['latency_ms'].append(connection_time)
                
                print(f"Connected to {self.server_url} in {connection_time:.2f}ms")
                
                # Wait for welcome message
                welcome_msg = await websocket.recv()
                welcome_data = json.loads(welcome_msg)
                self.results['messages_received'].append(welcome_data)
                
                # LED 7022: Status message received
                self.led_light(7022, 'status_received', 
                             message=welcome_data.get('message', ''),
                             server_ready=welcome_data.get('server_ready', False))
                
                print(f"Welcome: {welcome_data['message']}")
                
                # LED 7030: Start transcription command
                self.led_light(7030, 'start_transcription_command')
                start_cmd_time = time.time()
                
                # Send start transcription command
                start_command = {"type": "start_transcription"}
                await websocket.send(json.dumps(start_command))
                print("Sent start_transcription command")
                
                # Wait for transcription status response
                status_response = await websocket.recv()
                status_data = json.loads(status_response)
                status_latency = (time.time() - start_cmd_time) * 1000
                
                self.results['messages_received'].append(status_data)
                self.results['latency_ms'].append(status_latency)
                
                # LED 7023: Transcription status received
                self.led_light(7023, 'transcription_status_received',
                             status=status_data.get('status', ''),
                             response_time_ms=status_latency)
                
                print(f"Status: {status_data.get('message', '')} ({status_latency:.2f}ms)")
                
                # Wait for test transcript
                transcript_response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                transcript_data = json.loads(transcript_response)
                transcript_latency = (time.time() - start_cmd_time) * 1000
                
                self.results['messages_received'].append(transcript_data)
                self.results['latency_ms'].append(transcript_latency)
                
                # LED 7020: Transcript received
                self.led_light(7020, 'transcript_received',
                             transcript_type=transcript_data.get('type', ''),
                             text_length=len(transcript_data.get('text', '')),
                             response_time_ms=transcript_latency)
                
                print(f"Transcript: {transcript_data.get('text', '')} ({transcript_latency:.2f}ms)")
                
                # LED 7031: Stop transcription command
                self.led_light(7031, 'stop_transcription_command')
                
                # Send stop command
                stop_command = {"type": "stop_transcription"}
                await websocket.send(json.dumps(stop_command))
                print("Sent stop_transcription command")
                
                # LED 7050: WebSocket disconnect start
                self.led_light(7050, 'websocket_disconnect_start')
                
        except websockets.exceptions.ConnectionRefused:
            # LED 8011: Connection error
            self.led_light(8011, 'websocket_connection_error', 
                         error='connection_refused')
            self.results['errors'].append("Connection refused - server not running?")
            print("Connection refused - is the WebSocket server running on port 5000?")
            
        except asyncio.TimeoutError:
            # LED 8012: Timeout error
            self.led_light(8012, 'websocket_timeout_error')
            self.results['errors'].append("Timeout waiting for server response")
            print("Timeout waiting for server response")
            
        except Exception as e:
            # LED 8010: General error
            self.led_light(8010, 'websocket_general_error', error=str(e))
            self.results['errors'].append(f"Unexpected error: {str(e)}")
            print(f"Unexpected error: {e}")
        
        finally:
            # LED 7012: WebSocket disconnected
            self.led_light(7012, 'websocket_disconnected')
    
    def print_results(self):
        """Print comprehensive test results"""
        print("\n" + "="*60)
        print("VoiceCoach V2 Pipeline Test Results")
        print("="*60)
        
        # Connection Status
        print(f"\n📡 Connection Status:")
        print(f"  ✅ Connected: {self.results['connection_successful']}")
        print(f"  📨 Messages Received: {len(self.results['messages_received'])}")
        print(f"  ❌ Errors: {len(self.results['errors'])}")
        
        # Performance Metrics
        if self.results['latency_ms']:
            avg_latency = sum(self.results['latency_ms']) / len(self.results['latency_ms'])
            max_latency = max(self.results['latency_ms'])
            print(f"\n⚡ Performance Metrics:")
            print(f"  📊 Average Latency: {avg_latency:.2f}ms")
            print(f"  📈 Max Latency: {max_latency:.2f}ms")
            print(f"  🎯 VoiceCoach V2 Requirement (<200ms): {'✅ PASS' if max_latency < 200 else '❌ FAIL'}")
        
        # LED Breadcrumb Analysis
        print(f"\n🎵 LED Breadcrumb Analysis:")
        print(f"  📊 Total LEDs: {len(self.results['led_breadcrumbs'])}")
        
        success_leds = [led for led in self.results['led_breadcrumbs'] if not led['led'] >= 8000]
        error_leds = [led for led in self.results['led_breadcrumbs'] if led['led'] >= 8000]
        
        print(f"  ✅ Success LEDs: {len(success_leds)}")
        print(f"  ❌ Error LEDs: {len(error_leds)}")
        
        # Expected LED sequence for successful pipeline
        expected_sequence = [7010, 7011, 7022, 7030, 7023, 7020, 7031, 7050, 7012]
        actual_sequence = [led['led'] for led in self.results['led_breadcrumbs']]
        
        print(f"\n🔗 LED Chain Validation:")
        print(f"  Expected: {expected_sequence}")
        print(f"  Actual:   {actual_sequence}")
        
        sequence_match = all(led in actual_sequence for led in expected_sequence)
        print(f"  🎯 Chain Complete: {'✅ PASS' if sequence_match else '❌ FAIL'}")
        
        # Error Details
        if self.results['errors']:
            print(f"\n❌ Errors Encountered:")
            for i, error in enumerate(self.results['errors'], 1):
                print(f"  {i}. {error}")
        
        # Message Details
        if self.results['messages_received']:
            print(f"\n📨 Messages Received:")
            for i, msg in enumerate(self.results['messages_received'], 1):
                print(f"  {i}. {msg.get('type', 'unknown')}: {msg.get('message', msg.get('text', ''))}")
        
        # Final Assessment
        print(f"\n🏆 FINAL ASSESSMENT:")
        pipeline_working = (
            self.results['connection_successful'] and
            len(self.results['messages_received']) >= 3 and
            len(self.results['errors']) == 0 and
            sequence_match
        )
        
        print(f"  🎯 Pipeline Status: {'✅ FULLY OPERATIONAL' if pipeline_working else '❌ NEEDS ATTENTION'}")
        
        if pipeline_working:
            print("  🎉 VoiceCoach V2 WebSocket pipeline is ready for production!")
        else:
            print("  🔧 Issues found - see details above for troubleshooting")
        
        return pipeline_working

async def main():
    """Run the complete pipeline test"""
    tester = VoiceCoachPipelineTester()
    await tester.test_complete_pipeline()
    success = tester.print_results()
    
    # Exit with appropriate code
    exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())