#!/usr/bin/env python3
"""
Test WebSocket audio reception to see what's actually arriving at the server
"""
import asyncio
import json
import numpy as np
from flask import Flask
from flask_socketio import SocketIO, emit
import base64

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

audio_chunks_received = []
chunk_count = 0

@socketio.on('connect')
def handle_connect():
    print("[TEST] Client connected")
    emit('status', {'message': 'Test server connected'})

@socketio.on('audio_chunk')
def handle_audio_chunk(data):
    global chunk_count, audio_chunks_received
    chunk_count += 1
    
    # Analyze what we're receiving
    print(f"\n[CHUNK {chunk_count}] Received audio data")
    
    # Check data type
    if isinstance(data, str):
        print(f"  Data type: Base64 string (length: {len(data)})")
        try:
            audio_bytes = base64.b64decode(data)
            print(f"  Decoded to: {len(audio_bytes)} bytes")
        except:
            print("  ERROR: Failed to decode base64")
            return
    elif isinstance(data, bytes):
        print(f"  Data type: Raw bytes (length: {len(data)})")
        audio_bytes = data
    elif isinstance(data, dict):
        print(f"  Data type: Dictionary with keys: {data.keys()}")
        if 'data' in data:
            audio_bytes = data['data']
        else:
            print("  ERROR: No 'data' field in dictionary")
            return
    else:
        print(f"  ERROR: Unknown data type: {type(data)}")
        return
    
    # Convert to numpy array
    try:
        # Assuming 16-bit PCM
        audio_array = np.frombuffer(audio_bytes, dtype=np.int16)
        print(f"  Audio samples: {len(audio_array)}")
        print(f"  Duration: {len(audio_array) / 16000:.3f} seconds")
        
        # Check audio levels
        if len(audio_array) > 0:
            avg_level = np.abs(audio_array).mean()
            max_level = np.abs(audio_array).max()
            
            print(f"  Average level: {avg_level:.1f} (out of 32767)")
            print(f"  Peak level: {max_level} (out of 32767)")
            print(f"  Level percentage: {(avg_level/32767)*100:.2f}%")
            
            # Check if audio is present
            if avg_level < 10:
                print("  ⚠️ WARNING: Audio is nearly silent!")
            elif avg_level < 100:
                print("  ⚠️ WARNING: Audio level very low")
            elif avg_level > 30000:
                print("  ⚠️ WARNING: Audio may be clipping")
            else:
                print("  ✓ Audio levels look reasonable")
            
            # Store for later analysis
            audio_chunks_received.append(audio_array)
            
            # Every 10 chunks, do a deeper analysis
            if chunk_count % 10 == 0:
                print("\n[ANALYSIS] After 10 chunks:")
                all_audio = np.concatenate(audio_chunks_received[-10:])
                print(f"  Total samples: {len(all_audio)}")
                print(f"  Total duration: {len(all_audio) / 16000:.2f} seconds")
                print(f"  Overall average: {np.abs(all_audio).mean():.1f}")
                
                # Check for patterns that indicate problems
                # Check if all zeros (no audio)
                if np.all(all_audio == 0):
                    print("  ❌ ERROR: All samples are zero!")
                
                # Check if constant value (stuck)
                if np.all(all_audio == all_audio[0]):
                    print("  ❌ ERROR: All samples have same value!")
                
                # Check for proper variation
                std_dev = np.std(all_audio)
                print(f"  Standard deviation: {std_dev:.1f}")
                if std_dev < 10:
                    print("  ⚠️ WARNING: Very little variation in audio")
                
    except Exception as e:
        print(f"  ERROR processing audio: {e}")

@socketio.on('start_transcription')
def handle_start():
    global chunk_count, audio_chunks_received
    chunk_count = 0
    audio_chunks_received = []
    print("\n[TEST] Transcription started - analyzing incoming audio...")
    emit('transcription_status', {'status': 'started'})

@socketio.on('stop_transcription')
def handle_stop():
    print(f"\n[TEST] Transcription stopped")
    print(f"Total chunks received: {chunk_count}")
    
    if audio_chunks_received:
        all_audio = np.concatenate(audio_chunks_received)
        print(f"Total audio received: {len(all_audio) / 16000:.2f} seconds")
        
        # Save a sample for analysis
        sample_file = "received_audio_sample.raw"
        sample = all_audio[:16000 * 3]  # First 3 seconds
        sample.tofile(sample_file)
        print(f"Saved first 3 seconds to {sample_file}")
        print("Convert to WAV with: ffmpeg -f s16le -ar 16000 -ac 1 -i received_audio_sample.raw test_output.wav")
    
    emit('transcription_status', {'status': 'stopped'})

if __name__ == '__main__':
    print("=" * 60)
    print("WEBSOCKET AUDIO TEST SERVER")
    print("This server analyzes incoming audio without Vosk")
    print("=" * 60)
    print("\nListening on http://localhost:5000")
    print("Connect your app and start transcription...")
    print("")
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)