#!/usr/bin/env python3
"""
Simple WebSocket server that just works
No Vosk, no audio - just connection test
"""
import asyncio
import websockets
import json
from datetime import datetime

print("Starting simple WebSocket test server...")

connected_clients = set()

async def handle_client(websocket, path):
    print(f"Client connected: {websocket.remote_address}")
    connected_clients.add(websocket)
    
    try:
        # Send welcome message
        welcome = {
            "type": "status",
            "message": "Connected to Simple Test Server",
            "server_ready": True,
            "timestamp": datetime.now().isoformat()
        }
        await websocket.send(json.dumps(welcome))
        
        # Handle messages
        async for message in websocket:
            try:
                data = json.loads(message)
                print(f"Received: {data}")
                
                if data.get("type") == "start_transcription":
                    response = {
                        "type": "transcription_status",
                        "status": "started",
                        "message": "Test transcription started",
                        "timestamp": datetime.now().isoformat()
                    }
                    await websocket.send(json.dumps(response))
                    
                    # Send test transcript
                    test_transcript = {
                        "type": "final_transcript",
                        "text": "This is a test transcription from the simple server",
                        "timestamp": datetime.now().isoformat()
                    }
                    await websocket.send(json.dumps(test_transcript))
                    
            except json.JSONDecodeError:
                print("Invalid JSON received")
                
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected normally")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        connected_clients.discard(websocket)
        print(f"Client {websocket.remote_address} disconnected")

async def start_server():
    print("Server starting on ws://127.0.0.1:5000")
    server = await websockets.serve(handle_client, "127.0.0.1", 5000)
    print("SUCCESS: Simple server running successfully!")
    print("Waiting for connections...")
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(start_server())