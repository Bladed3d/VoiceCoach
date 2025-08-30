#!/usr/bin/env python3
"""Test the simple WebSocket server directly"""
import asyncio
import websockets
import json

async def test_connection():
    try:
        print("Connecting to ws://127.0.0.1:5000...")
        async with websockets.connect("ws://127.0.0.1:5000") as websocket:
            print("Connected successfully!")
            
            # Wait for welcome message
            welcome = await websocket.recv()
            print(f"Welcome message: {welcome}")
            
            # Send start transcription
            start_msg = {"type": "start_transcription"}
            await websocket.send(json.dumps(start_msg))
            print("Sent start_transcription")
            
            # Wait for response
            response = await websocket.recv()
            print(f"Response: {response}")
            
            print("Simple WebSocket server is working!")
            
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())