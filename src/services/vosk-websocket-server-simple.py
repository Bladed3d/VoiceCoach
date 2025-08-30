#!/usr/bin/env python3
"""
VoiceCoach V2 - Simple WebSocket Vosk Server
Receives audio data from client and returns transcription
"""
import asyncio
import json
import websockets
import sys
from datetime import datetime
from vosk import Model, KaldiRecognizer

# Fix Windows encoding
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

class SimpleVoskServer:
    def __init__(self, model_path=None, host='127.0.0.1', port=5000):
        self.host = host
        self.port = port
        self.connected_clients = set()
        
        # Load Vosk model
        if model_path is None:
            model_path = r"C:\Users\Administrator\Downloads\LLM\vosk-model-en-us-0.22-lgraph\vosk-model-en-us-0.22-lgraph"
        
        print(f"[6000] Loading Vosk model from: {model_path}")
        self.model = Model(model_path)
        print(f"[6001] Model loaded successfully")
        
        # Create recognizer for 16kHz audio (matches client AudioWorklet)
        self.recognizer = KaldiRecognizer(self.model, 16000)
        print(f"[6002] Recognizer ready for 16kHz audio")

    async def handle_client(self, websocket, path):
        """Handle client connection and messages"""
        client_addr = websocket.remote_address
        print(f"[6010] Client connected: {client_addr}")
        
        self.connected_clients.add(websocket)
        
        try:
            # Send welcome message
            welcome = {
                "type": "server_ready",
                "message": "VoiceCoach V2 WebSocket server ready",
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send(json.dumps(welcome))
            print(f"[6011] Welcome sent to {client_addr}")
            
            # Handle messages
            async for message in websocket:
                await self.process_message(websocket, message)
                
        except websockets.exceptions.ConnectionClosed:
            print(f"[6020] Client disconnected: {client_addr}")
        except Exception as e:
            print(f"[8010] Client error: {e}")
        finally:
            self.connected_clients.discard(websocket)

    async def process_message(self, websocket, message):
        """Process incoming message from client"""
        try:
            # Check if binary audio data
            if isinstance(message, bytes):
                await self.process_audio(message)
                return
            
            # Try JSON message
            try:
                data = json.loads(message)
                msg_type = data.get('type', 'unknown')
                print(f"[6030] Message type: {msg_type}")
                
                if msg_type == 'start_transcription':
                    await self.send_response(websocket, 'transcription_started', 'Ready for audio')
                elif msg_type == 'stop_transcription':
                    await self.send_response(websocket, 'transcription_stopped', 'Transcription stopped')
                    
            except json.JSONDecodeError:
                print(f"[8030] Invalid JSON: {message[:50]}")
                
        except Exception as e:
            print(f"[8031] Process message error: {e}")

    async def process_audio(self, audio_bytes):
        """Process audio data with Vosk"""
        try:
            # Reset recognizer for new audio stream if needed
            if not hasattr(self, '_last_reset') or (datetime.now() - self._last_reset).seconds > 30:
                self.recognizer = KaldiRecognizer(self.model, 16000)
                self._last_reset = datetime.now()
            
            print(f"[6040] Processing {len(audio_bytes)} bytes audio")
            
            # Process with Vosk (expects 16-bit PCM at 16kHz)
            if self.recognizer.AcceptWaveform(audio_bytes):
                # Final result
                result = json.loads(self.recognizer.Result())
                text = result.get('text', '').strip()
                if text:
                    print(f"[6041] Final: '{text}'")
                    await self.broadcast_transcript('final', text)
            else:
                # Partial result
                partial = json.loads(self.recognizer.PartialResult())
                text = partial.get('partial', '').strip()
                if text:
                    print(f"[6042] Partial: '{text}'")
                    await self.broadcast_transcript('partial', text)
                    
        except Exception as e:
            print(f"[8040] Audio processing error: {e}")

    async def broadcast_transcript(self, transcript_type, text):
        """Send transcript to all clients"""
        message = {
            "type": f"{transcript_type}_transcript",
            "text": text,
            "timestamp": datetime.now().isoformat()
        }
        
        # Broadcast to all clients
        if self.connected_clients:
            await asyncio.gather(
                *[client.send(json.dumps(message)) for client in self.connected_clients],
                return_exceptions=True
            )

    async def send_response(self, websocket, response_type, message):
        """Send response to specific client"""
        response = {
            "type": response_type,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        await websocket.send(json.dumps(response))

    async def start_server(self):
        """Start the WebSocket server"""
        print(f"[6099] Starting server on {self.host}:{self.port}")
        
        async with websockets.serve(self.handle_client, self.host, self.port):
            print(f"[6100] Server running - waiting for connections...")
            await asyncio.Future()  # Run forever

if __name__ == "__main__":
    server = SimpleVoskServer()
    asyncio.run(server.start_server())