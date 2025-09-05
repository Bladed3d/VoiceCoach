#!/usr/bin/env python3
"""
Diagnose Vosk accuracy issues - test different scenarios
"""
import os
import sys
import wave
import json
import numpy as np
from vosk import Model, KaldiRecognizer
import sounddevice as sd

# LED breadcrumbs
def log(led, message):
    print(f"[{led}] {message}")

def test_model_info():
    """Check what model is actually loaded"""
    model_path = r"C:\Users\Administrator\Downloads\LLM\vosk-model-en-us-0.22-lgraph\vosk-model-en-us-0.22-lgraph"
    
    log(5100, "Testing Vosk model configuration")
    
    if not os.path.exists(model_path):
        log(8100, f"Model not found at: {model_path}")
        return False
    
    # Check model size
    model_size = sum(os.path.getsize(os.path.join(dirpath, filename))
                    for dirpath, dirnames, filenames in os.walk(model_path)
                    for filename in filenames) / (1024**3)
    
    log(5101, f"Model size: {model_size:.2f} GB")
    
    # Load model and check configuration
    model = Model(model_path)
    
    # Test different recognizer configurations
    log(5102, "Testing recognizer configurations:")
    
    # Configuration 1: Current production settings
    rec1 = KaldiRecognizer(model, 16000)
    rec1.SetWords(True)
    rec1.SetPartialWords(True)
    log(5103, "Config 1: SetWords(True), SetPartialWords(True) - CURRENT")
    
    # Configuration 2: Try with vocabulary
    vocab = ['sales', 'customer', 'pricing', 'product', 'demo', 'meeting', 'call', 'objection', 'budget', 'decision']
    rec2 = KaldiRecognizer(model, 16000, json.dumps(vocab))
    rec2.SetWords(True)
    log(5104, f"Config 2: With limited vocabulary: {vocab[:5]}...")
    
    return True

def test_audio_format():
    """Test audio capture format"""
    log(5110, "Testing audio capture format")
    
    # Check default device
    try:
        device_info = sd.query_devices(kind='input')
        log(5111, f"Default input device: {device_info['name']}")
        log(5112, f"Default sample rate: {device_info['default_samplerate']} Hz")
        log(5113, f"Max input channels: {device_info['max_input_channels']}")
        
        # Test recording at different sample rates
        test_duration = 2.0
        
        log(5114, "Testing 16kHz recording (REQUIRED for Vosk)...")
        try:
            recording_16k = sd.rec(int(test_duration * 16000), 
                                 samplerate=16000, 
                                 channels=1, 
                                 dtype='int16')
            sd.wait()
            log(5115, f"✓ 16kHz recording successful, shape: {recording_16k.shape}")
        except Exception as e:
            log(8115, f"✗ 16kHz recording failed: {e}")
            
        log(5116, f"Testing {device_info['default_samplerate']}Hz (device default)...")
        try:
            recording_default = sd.rec(int(test_duration * device_info['default_samplerate']), 
                                     channels=1, 
                                     dtype='int16')
            sd.wait()
            log(5117, f"✓ Default rate recording successful")
        except Exception as e:
            log(8117, f"✗ Default rate recording failed: {e}")
            
    except Exception as e:
        log(8110, f"Audio device error: {e}")
        return False
    
    return True

def test_simple_transcription():
    """Test with a simple known phrase"""
    log(5120, "Testing simple transcription")
    
    model_path = r"C:\Users\Administrator\Downloads\LLM\vosk-model-en-us-0.22-lgraph\vosk-model-en-us-0.22-lgraph"
    model = Model(model_path)
    rec = KaldiRecognizer(model, 16000)
    rec.SetWords(True)
    rec.SetPartialWords(True)
    
    log(5121, "Please say clearly: 'Testing one two three'")
    log(5122, "Recording for 3 seconds...")
    
    # Record audio
    recording = sd.rec(int(3 * 16000), samplerate=16000, channels=1, dtype='int16')
    sd.wait()
    
    # Process with Vosk
    audio_bytes = recording.tobytes()
    
    # Process in chunks like the server does
    chunk_size = 4000
    results = []
    
    for i in range(0, len(audio_bytes), chunk_size):
        chunk = audio_bytes[i:i+chunk_size]
        if rec.AcceptWaveform(chunk):
            result = json.loads(rec.Result())
            if result.get('text'):
                results.append(result)
                log(5123, f"Final: {result.get('text')}")
                
                # Show word confidence if available
                if 'result' in result:
                    for word_info in result['result']:
                        word = word_info.get('word', '')
                        conf = word_info.get('conf', 0)
                        log(5124, f"  Word: '{word}' confidence: {conf:.2f}")
        else:
            partial = json.loads(rec.PartialResult())
            if partial.get('partial'):
                log(5125, f"Partial: {partial.get('partial')}")
    
    # Final result
    final = json.loads(rec.FinalResult())
    if final.get('text'):
        log(5126, f"Final result: {final.get('text')}")
        
        # Check if we got word-level results
        if 'result' in final:
            log(5127, "✓ Word-level confidence available")
        else:
            log(8127, "✗ Word-level confidence NOT available (SetWords might not be working)")
    else:
        log(8126, "No transcription result!")
    
    return True

def test_audio_levels():
    """Check if audio levels are adequate"""
    log(5130, "Testing audio levels")
    
    log(5131, "Recording 2 seconds of room noise...")
    noise = sd.rec(int(2 * 16000), samplerate=16000, channels=1, dtype='float32')
    sd.wait()
    
    noise_level = np.abs(noise).mean()
    log(5132, f"Background noise level: {noise_level:.6f}")
    
    log(5133, "Please speak normally for 3 seconds...")
    speech = sd.rec(int(3 * 16000), samplerate=16000, channels=1, dtype='float32')
    sd.wait()
    
    speech_level = np.abs(speech).mean()
    peak_level = np.abs(speech).max()
    
    log(5134, f"Speech average level: {speech_level:.6f}")
    log(5135, f"Speech peak level: {peak_level:.6f}")
    log(5136, f"Signal-to-noise ratio: {speech_level/noise_level:.1f}x")
    
    if speech_level < 0.001:
        log(8137, "✗ Audio level too low - check microphone gain")
    elif speech_level > 0.9:
        log(8138, "✗ Audio clipping - reduce microphone gain")
    elif speech_level / noise_level < 3:
        log(8139, "✗ Poor signal-to-noise ratio - reduce background noise")
    else:
        log(5137, "✓ Audio levels look good")
    
    return True

def main():
    print("=" * 60)
    print("VOSK ACCURACY DIAGNOSTIC")
    print("=" * 60)
    
    # Run all tests
    tests = [
        ("Model Information", test_model_info),
        ("Audio Format", test_audio_format),
        ("Audio Levels", test_audio_levels),
        ("Simple Transcription", test_simple_transcription)
    ]
    
    for test_name, test_func in tests:
        print(f"\n### {test_name} ###")
        try:
            test_func()
        except Exception as e:
            log(8000, f"Test failed: {e}")
        print("-" * 40)
    
    print("\n" + "=" * 60)
    print("DIAGNOSTIC COMPLETE")
    print("Look for ✗ markers above to identify problems")
    print("=" * 60)

if __name__ == "__main__":
    main()