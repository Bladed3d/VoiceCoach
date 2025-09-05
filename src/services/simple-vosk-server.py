#!/usr/bin/env python3
"""
SIMPLE, RELIABLE Native WebSocket Server for Vosk
No Socket.IO, no complexity - just raw WebSocket that works
"""

import asyncio
import websockets
import json
import base64
from vosk import Model, KaldiRecognizer
import sys
import os
import numpy as np

# Use the faster model that loads in < 5 seconds (non-lgraph version)
model_path = r"C:\Users\Administrator\Downloads\LLM\vosk-model-en-us-0.22"

print(f"Loading Vosk model from: {model_path}")
if not os.path.exists(model_path):
    print(f"ERROR: Model not found at {model_path}")
    sys.exit(1)
    
model = Model(model_path)

# Store recognizers per connection
recognizers = {}

async def handle_client(websocket, path):
    """Handle a single WebSocket client connection"""
    client_id = id(websocket)
    print(f"[OK] Client connected: {client_id}")
    
    # Create recognizer for this client
    recognizers[client_id] = KaldiRecognizer(model, 16000)
    recognizers[client_id].SetWords(True)
    recognizers[client_id].SetPartialWords(True)
    
    try:
        async for message in websocket:
            # Handle different message types
            if isinstance(message, bytes):
                # Raw audio bytes
                audio_data = message
            else:
                # Could be JSON command or base64 audio
                try:
                    data = json.loads(message)
                    
                    # Handle commands
                    if data.get('type') == 'start_transcription':
                        print("[INFO] Starting transcription")
                        await websocket.send(json.dumps({
                            'type': 'status',
                            'message': 'Transcription started'
                        }))
                        continue
                    elif data.get('type') == 'stop_transcription':
                        print("[STOP] Stopping transcription")
                        await websocket.send(json.dumps({
                            'type': 'status', 
                            'message': 'Transcription stopped'
                        }))
                        continue
                        
                except json.JSONDecodeError:
                    # Not JSON, assume it's base64 audio
                    try:
                        audio_data = base64.b64decode(message)
                    except:
                        print(f"[WARN] Unknown message format, skipping")
                        continue
            
            # Process audio with Vosk
            if recognizers[client_id].AcceptWaveform(audio_data):
                # Final result
                result = json.loads(recognizers[client_id].Result())
                if result.get('text'):
                    print(f"[FINAL]: {result['text']}")
                    await websocket.send(json.dumps({
                        'type': 'final_transcript',
                        'text': result['text']
                    }))
            else:
                # Partial result
                partial = json.loads(recognizers[client_id].PartialResult())
                if partial.get('partial'):
                    print(f"[PARTIAL]: {partial['partial']}")
                    await websocket.send(json.dumps({
                        'type': 'partial_transcript',
                        'text': partial['partial']
                    }))
                    
    except websockets.exceptions.ConnectionClosed:
        print(f"[DISCONNECT] Client disconnected: {client_id}")
    except Exception as e:
        print(f"[ERROR] Error handling client {client_id}: {e}")
    finally:
        # Clean up recognizer
        if client_id in recognizers:
            del recognizers[client_id]
        print(f"[CLEANUP] Cleaned up client: {client_id}")

async def main():
    """Start the WebSocket server"""
    print("=" * 50)
    print("[SIMPLE VOSK WEBSOCKET SERVER]")
    print("=" * 50)
    print("Starting on ws://127.0.0.1:8765")
    print("Native WebSocket - no Socket.IO complexity")
    print("=" * 50)
    
    async with websockets.serve(handle_client, "127.0.0.1", 8765):
        print("[OK] Server is running!")
        print("[WAITING] Waiting for connections...")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[SHUTDOWN] Server shutting down...")