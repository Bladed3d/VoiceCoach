#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test transcription flow with VoiceCoach V2 Vosk server
Simulates client connection and transcription start commands
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

async def test_transcription_flow():
    uri = "ws://127.0.0.1:5000"
    print(f"Testing transcription flow with {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("[SUCCESS] WebSocket connected!")
            
            # Wait for welcome message
            welcome_msg = await websocket.recv()
            print(f"[WELCOME] {welcome_msg}")
            
            # Send start_transcription command
            start_cmd = {"type": "start_transcription"}
            await websocket.send(json.dumps(start_cmd))
            print(f"[SENT] {start_cmd}")
            
            # Wait for response
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            print(f"[RESPONSE] {response}")
            
            # Listen for transcriptions for 10 seconds
            print("[LISTENING] Waiting for transcriptions (10 seconds)...")
            try:
                while True:
                    message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                    print(f"[TRANSCRIPT] {message}")
            except asyncio.TimeoutError:
                print("[TIMEOUT] No transcriptions received in 10 seconds")
            
            # Send stop command
            stop_cmd = {"type": "stop_transcription"}
            await websocket.send(json.dumps(stop_cmd))
            print(f"[SENT] {stop_cmd}")
            
            # Final response
            try:
                final_response = await asyncio.wait_for(websocket.recv(), timeout=3.0)
                print(f"[STOP_RESPONSE] {final_response}")
            except asyncio.TimeoutError:
                print("[INFO] No stop response received")
            
    except Exception as e:
        print(f"[ERROR] {e}")

if __name__ == "__main__":
    asyncio.run(test_transcription_flow())