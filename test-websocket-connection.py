#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple WebSocket connection test for VoiceCoach V2
Tests direct connection to native WebSocket server
"""
import asyncio
import websockets
import json
import sys

# Fix Windows encoding
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

async def test_websocket_connection():
    uri = "ws://127.0.0.1:5000"
    print(f"Testing WebSocket connection to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("[SUCCESS] WebSocket connected successfully!")
            
            # Wait for welcome message
            try:
                welcome_msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"[RECEIVED] Welcome message: {welcome_msg}")
            except asyncio.TimeoutError:
                print("[WARNING] No welcome message received (timeout)")
            
            # Send test message
            test_message = {
                "type": "status",
                "message": "Test connection from Python client"
            }
            await websocket.send(json.dumps(test_message))
            print(f"[SENT] Test message: {test_message}")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"[RECEIVED] Server response: {response}")
            except asyncio.TimeoutError:
                print("[WARNING] No response received (timeout)")
            
            print("[SUCCESS] Test completed - connection working!")
            
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        print("[TROUBLESHOOTING]")
        print("   1. Check if Python server is running on port 5000")
        print("   2. Verify server is using native WebSocket (not Socket.IO)")
        print("   3. Check Windows Firewall settings")

if __name__ == "__main__":
    asyncio.run(test_websocket_connection())