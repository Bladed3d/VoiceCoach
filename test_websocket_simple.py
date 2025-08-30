#!/usr/bin/env python3
"""
VoiceCoach V2 WebSocket Connection Test - Simple Version
"""

import asyncio
import websockets
import json
import time
import sys
from datetime import datetime

async def test_websocket():
    print("VoiceCoach V2 WebSocket Connection Test")
    print("=" * 50)
    
    try:
        print("LED 7010: WebSocket connect start")
        uri = "ws://127.0.0.1:5000"
        print(f"Connecting to: {uri}")
        
        async with websockets.connect(uri, timeout=10) as websocket:
            print("LED 7011: WebSocket connected successfully")
            
            # Send start command
            print("LED 7030: Start transcription command sent")
            command = {"type": "start_transcription"}
            await websocket.send(json.dumps(command))
            print(f"Sent: {command}")
            
            # Listen for responses
            print("Listening for responses...")
            for i in range(5):  # Try to get 5 responses
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=3.0)
                    try:
                        data = json.loads(response)
                        print(f"Response {i+1}: {data}")
                        
                        if data.get('type') == 'status':
                            print("LED 7022: Status message received")
                        elif data.get('type') == 'transcription_status':  
                            print("LED 7023: Transcription status received")
                            
                    except json.JSONDecodeError:
                        print(f"Raw response {i+1}: {response}")
                        
                except asyncio.TimeoutError:
                    print("No response within timeout")
                    break
                    
            # Send stop command
            print("LED 7031: Stop transcription command sent")
            stop_command = {"type": "stop_transcription"}
            await websocket.send(json.dumps(stop_command))
            
            print("LED 7012: WebSocket disconnected cleanly")
            
        print("\nTEST RESULT: SUCCESS - WebSocket connection working")
        return True
        
    except websockets.exceptions.ConnectionRefusedError:
        print("LED 8011: Connection refused - server not running")
        print("ERROR: WebSocket server is not running on port 5000")
        return False
        
    except Exception as e:
        print(f"LED 8011: Connection error - {e}")
        return False

def check_server():
    import socket
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            result = s.connect_ex(('127.0.0.1', 5000))
            return result == 0
    except:
        return False

if __name__ == "__main__":
    print("Checking server availability...")
    if not check_server():
        print("ERROR: WebSocket server port 5000 is not open")
        print("Please start the Python WebSocket server first")
        sys.exit(1)
    
    print("Server is running, testing connection...")
    success = asyncio.run(test_websocket())
    
    if success:
        print("\nOVERALL: WebSocket connection test PASSED")
    else:
        print("\nOVERALL: WebSocket connection test FAILED")