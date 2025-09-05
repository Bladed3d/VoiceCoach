#!/usr/bin/env python3
"""Test Socket.IO connection to Vosk server"""
import socketio
import time

sio = socketio.Client()

@sio.event
def connect():
    print("✅ Connected to server!")
    # Test sending start_transcription
    sio.emit('start_transcription')
    print("Sent: start_transcription")

@sio.event
def disconnect():
    print("Disconnected from server")

@sio.on('status')
def on_status(data):
    print(f"Status: {data}")

@sio.on('transcription_status')
def on_transcription_status(data):
    print(f"Transcription status: {data}")

@sio.on('error')
def on_error(data):
    print(f"Error: {data}")

if __name__ == '__main__':
    print("Testing Socket.IO connection...")
    try:
        sio.connect('http://127.0.0.1:5000', transports=['polling'])
        print("Connection attempt made")
        
        # Wait for a bit
        time.sleep(3)
        
        # Stop transcription
        sio.emit('stop_transcription')
        print("Sent: stop_transcription")
        
        time.sleep(1)
        
        # Disconnect
        sio.disconnect()
        print("Test complete!")
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")