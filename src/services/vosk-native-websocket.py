#!/usr/bin/env python3
"""
Native WebSocket Server for Vosk with full configuration support
Combines the best of both: native WebSocket + all your tuned settings
"""

import json
import os
import sys
import asyncio
import pathlib
import websockets
import concurrent.futures
import logging
import time
import argparse
import base64
from vosk import Model, SpkModel, KaldiRecognizer

# Use the lgraph model that loads quickly
MODEL_PATH = r"C:\Users\Administrator\Downloads\LLM\vosk-model-en-us-0.22-lgraph\vosk-model-en-us-0.22-lgraph"

def process_chunk(rec, message):
    """Process audio chunk with Vosk recognizer"""
    if message == '{"eof" : 1}':
        return rec.FinalResult(), True
    if message == '{"reset" : 1}':
        return rec.FinalResult(), False
    elif rec.AcceptWaveform(message):
        return rec.Result(), False
    else:
        return rec.PartialResult(), False

async def recognize(websocket, path):
    """Handle WebSocket connection and audio processing"""
    global model
    global spk_model
    global args
    global pool

    loop = asyncio.get_running_loop()
    rec = None
    phrase_list = None
    sample_rate = args.sample_rate
    show_words = args.show_words
    max_alternatives = args.max_alternatives
    set_partial_words = args.set_partial_words
    last_message_time = time.time()
    partial_sent = False
    
    # For speaker separation
    audio_source = 'mixed'  # Default source

    logging.info('[OK] Client connected: %s', websocket.remote_address)

    async def partial_timer():
        """Send partial results after timeout"""
        nonlocal last_message_time, partial_sent
        while True:
            await asyncio.sleep(0.1)
            if time.time() - last_message_time > args.partial_timeout and rec and not partial_sent:
                response = rec.PartialResult()
                if response and response != '{"partial": ""}':
                    # Add speaker info to partial result
                    result = json.loads(response)
                    if result.get('partial'):
                        # Map source to speaker: microphone -> user, tab -> customer
                        if audio_source == 'microphone':
                            speaker = 'user'
                        elif audio_source == 'tab':
                            speaker = 'customer'
                        else:  # mixed or other
                            speaker = 'customer'
                            
                        enhanced_result = {
                            'type': 'partial_transcript',
                            'text': result['partial'],
                            'speaker': speaker,
                            'source': audio_source,
                            'timestamp': time.time()
                        }
                        await websocket.send(json.dumps(enhanced_result))
                        partial_sent = True

    timer_task = asyncio.create_task(partial_timer())

    try:
        while True:
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=args.partial_timeout)
                last_message_time = time.time()
                partial_sent = False

                # Handle JSON messages
                if isinstance(message, str):
                    try:
                        data = json.loads(message)
                        
                        # Handle different message types
                        if data.get('type') == 'start_transcription':
                            logging.info("[INFO] Starting transcription")
                            await websocket.send(json.dumps({
                                'type': 'status',
                                'message': 'Transcription started'
                            }))
                            continue
                            
                        elif data.get('type') == 'stop_transcription':
                            logging.info("[STOP] Stopping transcription")
                            await websocket.send(json.dumps({
                                'type': 'status',
                                'message': 'Transcription stopped'
                            }))
                            continue
                            
                        elif data.get('type') == 'audio_chunk':
                            # Enhanced audio chunk with source metadata for speaker separation
                            audio_bytes = base64.b64decode(data.get('audio', ''))
                            audio_source = data.get('source', 'mixed')
                            message = audio_bytes  # Use the decoded audio for processing
                            
                        elif 'config' in data:
                            # Load configuration if provided
                            jobj = data['config']
                            logging.info("Config %s", jobj)
                            if 'phrase_list' in jobj:
                                phrase_list = jobj['phrase_list']
                            if 'sample_rate' in jobj:
                                sample_rate = float(jobj['sample_rate'])
                            continue
                            
                    except json.JSONDecodeError:
                        # Not JSON, treat as raw audio bytes
                        pass
                
                # Handle raw bytes (legacy format)
                elif isinstance(message, bytes):
                    audio_source = 'mixed'  # Default for legacy format

                # Create the recognizer if needed
                if not rec:
                    if phrase_list:
                        rec = KaldiRecognizer(model, sample_rate, phrase_list)
                    else:
                        rec = KaldiRecognizer(model, sample_rate)
                    
                    # Apply your tuned settings
                    if args.set_words:
                        rec.SetWords(True)
                    if set_partial_words:
                        rec.SetPartialWords(True)
                    if max_alternatives > 0:
                        rec.SetMaxAlternatives(max_alternatives)
                    if spk_model:
                        rec.SetSpkModel(spk_model)

                # Process audio chunk
                response, stop = await loop.run_in_executor(pool, process_chunk, rec, message)
                
                # Parse and enhance response with speaker info
                if response:
                    result = json.loads(response)
                    
                    # Handle final results
                    if result.get('text'):
                        # Map source to speaker: microphone -> user, tab/mixed -> customer
                        if audio_source == 'microphone':
                            speaker = 'user'
                        elif audio_source == 'tab':
                            speaker = 'customer'
                        else:  # mixed or other
                            speaker = 'customer'
                            
                        enhanced_result = {
                            'type': 'final_transcript',
                            'text': result['text'],
                            'speaker': speaker,
                            'source': audio_source,
                            'confidence': result.get('conf', 0.0) if 'conf' in result else None,
                            'timestamp': time.time()
                        }
                        logging.info(f"[FINAL - {speaker.upper()}]: {result['text']}")
                        await websocket.send(json.dumps(enhanced_result))
                    
                    # Handle partial results
                    elif result.get('partial'):
                        # Map source to speaker: microphone -> user, tab/mixed -> customer  
                        if audio_source == 'microphone':
                            speaker = 'user'
                        elif audio_source == 'tab':
                            speaker = 'customer'
                        else:  # mixed or other
                            speaker = 'customer'
                            
                        enhanced_result = {
                            'type': 'partial_transcript',
                            'text': result['partial'],
                            'speaker': speaker,
                            'source': audio_source,
                            'timestamp': time.time()
                        }
                        await websocket.send(json.dumps(enhanced_result))
                
                if stop:
                    break
                    
            except asyncio.TimeoutError:
                if rec:
                    response = rec.PartialResult()
                    if response and response != '{"partial": ""}':
                        result = json.loads(response)
                        if result.get('partial'):
                            speaker = 'user' if audio_source == 'microphone' else 'customer'
                            enhanced_result = {
                                'type': 'partial_transcript',
                                'text': result['partial'],
                                'speaker': speaker,
                                'source': audio_source,
                                'timestamp': time.time()
                            }
                            await websocket.send(json.dumps(enhanced_result))
                            
    except websockets.exceptions.ConnectionClosed:
        logging.info('[DISCONNECT] Client disconnected: %s', websocket.remote_address)
    except Exception as e:
        logging.error('[ERROR] Error handling client: %s', e)
    finally:
        timer_task.cancel()
        logging.info('[CLEANUP] Cleaned up client: %s', websocket.remote_address)

async def main():
    """Start the WebSocket server"""
    print("=" * 50)
    print("[VOSK NATIVE WEBSOCKET SERVER]")
    print("=" * 50)
    print(f"Starting on ws://127.0.0.1:{args.port}")
    print("Native WebSocket with full configuration support")
    print("=" * 50)
    
    async with websockets.serve(recognize, args.interface, args.port):
        print(f"[OK] Server is running on port {args.port}!")
        print("[WAITING] Waiting for connections...")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(description="Vosk Native WebSocket Server with Configuration Support")
    parser.add_argument("--model", default=MODEL_PATH, help="Path to the model")
    parser.add_argument("--spk-model", help="Path to the speaker model")
    parser.add_argument("--interface", default="127.0.0.1", help="Bind interface")
    parser.add_argument("--port", type=int, default=8765, help="Server port")
    parser.add_argument("--sample-rate", type=float, default=16000.0, help="Sampling rate")
    parser.add_argument("--max-alternatives", type=int, default=0, help="Maximum alternatives to return")
    parser.add_argument("--show-words", action="store_true", help="Show words in results (deprecated, use --set-words)")
    parser.add_argument("--partial-timeout", type=float, default=0.8, help="Partial result timeout in seconds")
    parser.add_argument("--sentence-gap", type=float, default=0.5, help="Sentence gap threshold in seconds")
    parser.add_argument("--min-silence", type=float, default=0.5, help="Minimum trailing silence in seconds")
    parser.add_argument("--chunk-size", type=int, default=3072, help="Chunk size")
    parser.add_argument("--mode", choices=['word', 'sentence'], default='word', help="Recognition mode")
    parser.add_argument("--min-phrase-words", type=int, default=3, help="Minimum words in phrase")
    parser.add_argument("--aggressive", action="store_true", help="Aggressive endpointing")
    parser.add_argument("--enable-partials", action="store_true", help="Enable partial results")
    parser.add_argument("--enable-word-timings", action="store_true", help="Enable word timings")
    parser.add_argument("--set-words", type=lambda x: x.lower() == 'true', default=True, help="Set words in results")
    parser.add_argument("--set-partial-words", type=lambda x: x.lower() == 'true', default=True, help="Set partial words")
    parser.add_argument("--other-party-gain", type=int, default=171, help="Other party audio gain")
    parser.add_argument("--enable-recognizer-reset", action="store_true", help="Enable recognizer reset")
    parser.add_argument("--recognizer-reset-interval", type=int, help="Recognizer reset interval")

    args = parser.parse_args()

    # Handle legacy and mode settings
    if args.show_words:
        args.set_words = True

    if args.mode == 'word':
        args.set_partial_words = True
    
    if args.enable_partials:
        args.set_partial_words = True

    # Load model
    print(f"Loading Vosk model from: {args.model}")
    if not os.path.exists(args.model):
        print(f"ERROR: Model not found at {args.model}")
        sys.exit(1)
    
    model = Model(args.model)
    spk_model = SpkModel(args.spk_model) if args.spk_model else None

    # Create thread pool for processing
    pool = concurrent.futures.ThreadPoolExecutor((os.cpu_count() or 1))

    # Start server
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[SHUTDOWN] Server shutting down...")