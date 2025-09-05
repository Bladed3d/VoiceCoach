#!/usr/bin/env python3
"""
Test Vosk accuracy with a WAV file directly (no speaker/microphone loop)
"""
import os
import sys
import wave
import json
from vosk import Model, KaldiRecognizer

def test_wav_file(wav_path):
    """Test Vosk accuracy with a WAV file"""
    
    print(f"[5200] Testing Vosk with WAV file: {wav_path}")
    
    # Check file exists
    if not os.path.exists(wav_path):
        print(f"[8200] WAV file not found: {wav_path}")
        print("Please provide a valid WAV file path as argument")
        return
    
    # Open WAV file
    wf = wave.open(wav_path, 'rb')
    
    # Check WAV format
    print(f"[5201] WAV file format:")
    print(f"  Channels: {wf.getnchannels()}")
    print(f"  Sample width: {wf.getsampwidth()} bytes")
    print(f"  Frame rate: {wf.getframerate()} Hz")
    print(f"  Total frames: {wf.getnframes()}")
    print(f"  Duration: {wf.getnframes() / wf.getframerate():.2f} seconds")
    
    # Check if format is compatible
    if wf.getframerate() != 16000:
        print(f"[8202] WARNING: Sample rate is {wf.getframerate()}Hz, Vosk expects 16000Hz")
        print(f"[8203] This WILL reduce accuracy! Convert with:")
        print(f"  ffmpeg -i {wav_path} -ar 16000 -ac 1 output_16k.wav")
    
    if wf.getnchannels() != 1:
        print(f"[8204] WARNING: File has {wf.getnchannels()} channels, Vosk expects mono")
        print(f"[8205] Convert with: ffmpeg -i {wav_path} -ar 16000 -ac 1 output_16k.wav")
        
        # For stereo, just use first channel
        print(f"[5206] Using only first channel for testing")
    
    # Load Vosk model
    model_path = r"C:\Users\Administrator\Downloads\LLM\vosk-model-en-us-0.22-lgraph\vosk-model-en-us-0.22-lgraph"
    
    if not os.path.exists(model_path):
        print(f"[8207] Model not found at: {model_path}")
        return
    
    print(f"[5208] Loading Vosk model...")
    model = Model(model_path)
    
    # Test different configurations
    configs = [
        {
            "name": "Standard (SetWords=True)",
            "setup": lambda m: create_recognizer_standard(m, wf.getframerate())
        },
        {
            "name": "With Grammar (sales vocabulary)",
            "setup": lambda m: create_recognizer_with_grammar(m, wf.getframerate())
        }
    ]
    
    for config in configs:
        print(f"\n[5210] Testing configuration: {config['name']}")
        wf.rewind()  # Reset file to beginning
        
        rec = config["setup"](model)
        
        results = []
        all_text = []
        
        # Process audio in chunks
        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            
            if rec.AcceptWaveform(data):
                result = json.loads(rec.Result())
                text = result.get('text', '')
                if text:
                    all_text.append(text)
                    print(f"[5211] Final: {text}")
                    
                    # Check for word confidence
                    if 'result' in result:
                        print(f"[5212] Word confidence available:")
                        for word in result['result'][:5]:  # Show first 5 words
                            print(f"    '{word['word']}': {word['conf']:.2f}")
                    else:
                        print(f"[8212] No word confidence (SetWords not working?)")
            else:
                partial = json.loads(rec.PartialResult())
                if partial.get('partial'):
                    print(f"[5213] Partial: {partial['partial'][:50]}...")
        
        # Get final result
        final_result = json.loads(rec.FinalResult())
        if final_result.get('text'):
            all_text.append(final_result['text'])
        
        # Show complete transcription
        full_transcript = ' '.join(all_text)
        print(f"\n[5214] Complete transcription:")
        print(f"  {full_transcript}")
        
        if not full_transcript:
            print(f"[8214] NO TRANSCRIPTION PRODUCED!")
    
    wf.close()
    print(f"\n[5220] Test complete")
    
def create_recognizer_standard(model, sample_rate):
    """Create standard recognizer with SetWords enabled"""
    rec = KaldiRecognizer(model, sample_rate)
    rec.SetWords(True)
    rec.SetPartialWords(True)
    return rec

def create_recognizer_with_grammar(model, sample_rate):
    """Create recognizer with limited vocabulary for sales calls"""
    # Common sales call vocabulary
    grammar = [
        "yes", "no", "maybe", "sure", "okay", "right",
        "price", "pricing", "cost", "budget", "expensive", "cheap", "affordable",
        "product", "service", "solution", "feature", "benefit",
        "customer", "client", "user", "team", "company",
        "sales", "deal", "discount", "offer", "contract",
        "meeting", "call", "demo", "presentation", "follow up",
        "decision", "think", "consider", "review", "discuss",
        "problem", "issue", "challenge", "pain point", "solution",
        "interested", "not interested", "need", "want",
        "question", "concern", "objection",
        "today", "tomorrow", "next week", "this month",
        "thank you", "thanks", "appreciate", "understand"
    ]
    
    rec = KaldiRecognizer(model, sample_rate, json.dumps(grammar))
    rec.SetWords(True)
    rec.SetPartialWords(True)
    print(f"[5209] Using limited vocabulary: {len(grammar)} words")
    return rec

def convert_wav_format(input_path, output_path):
    """Show ffmpeg command to convert WAV to proper format"""
    print(f"\n[5230] To convert your WAV file to optimal format:")
    print(f"  ffmpeg -i \"{input_path}\" -ar 16000 -ac 1 -c:a pcm_s16le \"{output_path}\"")
    print(f"\nThis ensures:")
    print(f"  - 16kHz sample rate (required for model)")
    print(f"  - Mono audio (1 channel)")
    print(f"  - 16-bit PCM format")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test-vosk-with-wav.py <path-to-wav-file>")
        print("\nExample:")
        print("  python test-vosk-with-wav.py \"C:\\test\\sales-call.wav\"")
        sys.exit(1)
    
    wav_file = sys.argv[1]
    test_wav_file(wav_file)
    
    # Show conversion command
    output_name = os.path.splitext(wav_file)[0] + "_16k.wav"
    convert_wav_format(wav_file, output_name)