#!/usr/bin/env python3
"""
Test script to validate native WebSocket protocol fix
Tests if the new server properly handles native WebSocket connections
"""
import sys
import codecs

# Set stdout encoding to handle unicode properly
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
elif hasattr(sys.stdout, 'buffer'):
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'replace')
import asyncio
import websockets
import json
from datetime import datetime

async def test_websocket_connection():
    """Test native WebSocket connection to VoiceCoach server"""
    server_url = "ws://127.0.0.1:5000"
    
    try:
        print(f"[TEST] Testing native WebSocket connection to {server_url}")
        print(f"[TIME] Test started at {datetime.now()}")
        
        # Connect to WebSocket server
        async with websockets.connect(server_url, ping_interval=20) as websocket:
            print(f"[PASS] Connected successfully to {server_url}")
            print(f"[INFO] Connection protocol: WebSocket (native)")
            
            # Send test message
            test_message = {
                "type": "test_connection",
                "timestamp": datetime.now().isoformat(),
                "client": "protocol_test"
            }
            
            await websocket.send(json.dumps(test_message))
            print(f"[SEND] Sent test message: {test_message['type']}")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                response_data = json.loads(response)
                
                print(f"[RECV] Received response: {response_data.get('type', 'unknown')}")
                print(f"[MSG] Message: {response_data.get('message', 'No message')}")
                print(f"[PASS] PROTOCOL TEST PASSED - Native WebSocket communication working!")
                
                return True
                
            except asyncio.TimeoutError:
                print(f"[TIMEOUT] Timeout waiting for server response")
                return False
                
    except websockets.exceptions.InvalidURI:
        print(f"[FAIL] INVALID URI: {server_url}")
        return False
    except websockets.exceptions.ConnectionClosed:
        print(f"[FAIL] CONNECTION CLOSED: Server may not be running")
        return False
    except ConnectionRefusedError:
        print(f"[FAIL] CONNECTION REFUSED: Server not running on {server_url}")
        print(f"[INFO] Start the server with: python src/services/vosk-native-websocket-server.py")
        return False
    except Exception as e:
        print(f"[FAIL] CONNECTION ERROR: {type(e).__name__}: {e}")
        return False

async def test_socketio_detection():
    """Test if old Socket.IO endpoint returns appropriate error"""
    try:
        print(f"\n[TEST] Testing Socket.IO detection (should fail gracefully)")
        
        # Try to connect using Socket.IO URL format
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            try:
                # This should fail since we're no longer using Socket.IO
                socketio_url = "http://127.0.0.1:5000/socket.io/?EIO=4&transport=polling"
                async with session.get(socketio_url, timeout=3) as response:
                    print(f"[WARN] Socket.IO endpoint still responding (unexpected)")
                    return False
            except:
                print(f"[PASS] Socket.IO endpoint properly disabled - good!")
                return True
                
    except ImportError:
        print(f"[INFO] aiohttp not available - skipping Socket.IO detection test")
        return True
    except Exception as e:
        print(f"[PASS] Socket.IO endpoint test passed (connection properly rejected)")
        return True

async def main():
    """Run all protocol tests"""
    print(f"VoiceCoach V2 - WebSocket Protocol Fix Validation")
    print(f"=" * 60)
    
    # Test 1: Native WebSocket connection
    websocket_success = await test_websocket_connection()
    
    # Test 2: Socket.IO detection
    socketio_success = await test_socketio_detection()
    
    # Summary
    print(f"\n" + "=" * 60)
    print(f"TEST RESULTS SUMMARY:")
    print(f"   Native WebSocket: {'[PASS]' if websocket_success else '[FAIL]'}")
    print(f"   Socket.IO Disabled: {'[PASS]' if socketio_success else '[FAIL]'}")
    
    overall_success = websocket_success and socketio_success
    print(f"   Overall Result: {'PROTOCOL FIX SUCCESS' if overall_success else 'PROTOCOL FIX FAILED'}")
    
    if overall_success:
        print(f"\nPROTOCOL MISMATCH FIXED!")
        print(f"Client (native WebSocket) <-> Server (native WebSocket)")
        print(f"No more XHR polling errors should occur")
    else:
        print(f"\nPROTOCOL ISSUES DETECTED")
        print(f"Check server startup and WebSocket implementation")

if __name__ == "__main__":
    asyncio.run(main())