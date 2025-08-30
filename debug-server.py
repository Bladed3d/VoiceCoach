#!/usr/bin/env python3
"""
Debug version of Vosk server - helps identify startup issues
"""
import sys
import os
import traceback
from datetime import datetime

def debug_log(message):
    print(f"[DEBUG {datetime.now()}] {message}", flush=True)

try:
    debug_log("=== VOSK SERVER DEBUG START ===")
    debug_log(f"Python executable: {sys.executable}")
    debug_log(f"Python version: {sys.version}")
    debug_log(f"Current working directory: {os.getcwd()}")
    debug_log(f"Script location: {__file__}")
    
    # Check imports one by one
    debug_log("Checking imports...")
    
    try:
        import asyncio
        debug_log("✅ asyncio imported")
    except Exception as e:
        debug_log(f"❌ asyncio failed: {e}")
        
    try:
        import json
        debug_log("✅ json imported")
    except Exception as e:
        debug_log(f"❌ json failed: {e}")
        
    try:
        import websockets
        debug_log("✅ websockets imported")
    except Exception as e:
        debug_log(f"❌ websockets failed: {e}")
        
    try:
        from vosk import Model, KaldiRecognizer
        debug_log("✅ vosk imported")
    except Exception as e:
        debug_log(f"❌ vosk failed: {e}")
        
    try:
        import sounddevice as sd
        debug_log("✅ sounddevice imported")
    except Exception as e:
        debug_log(f"❌ sounddevice failed: {e}")
        
    try:
        import numpy as np
        debug_log("✅ numpy imported")
    except Exception as e:
        debug_log(f"❌ numpy failed: {e}")
    
    # Check model path
    model_path = r"C:\Users\Administrator\Downloads\LLM\vosk-model-en-us-0.22-lgraph\vosk-model-en-us-0.22-lgraph"
    debug_log(f"Checking model path: {model_path}")
    
    if os.path.exists(model_path):
        debug_log("✅ Model path exists")
        try:
            model = Model(model_path)
            debug_log("✅ Model loaded successfully")
        except Exception as e:
            debug_log(f"❌ Model loading failed: {e}")
            debug_log(f"Traceback: {traceback.format_exc()}")
    else:
        debug_log("❌ Model path does not exist")
    
    # Check audio system
    debug_log("Checking audio system...")
    try:
        devices = sd.query_devices()
        debug_log(f"✅ Audio system working, found {len(devices)} devices")
    except Exception as e:
        debug_log(f"❌ Audio system failed: {e}")
    
    # Try to start simple WebSocket server
    debug_log("Attempting to start WebSocket server...")
    
    async def hello(websocket, path):
        debug_log(f"Client connected: {websocket.remote_address}")
        await websocket.send("Hello from debug server!")
    
    async def start_server():
        debug_log("Starting server on ws://127.0.0.1:5000")
        server = await websockets.serve(hello, "127.0.0.1", 5000)
        debug_log("✅ Server started successfully!")
        await server.wait_closed()
    
    # Run the server
    asyncio.run(start_server())
    
except Exception as e:
    debug_log(f"❌ FATAL ERROR: {e}")
    debug_log(f"Traceback: {traceback.format_exc()}")
    sys.exit(1)