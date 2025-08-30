#!/usr/bin/env python3
"""
VoiceCoach V2 - Vosk Performance Test
Comparable test to Pipecat using user's original Vosk implementation approach

This mirrors the Pipecat test exactly for direct performance comparison.
Based on user's proven test_live_vosk-sentence.py design.
"""

import queue
import sounddevice as sd
import time
import json
from vosk import Model, KaldiRecognizer

# Test Configuration (matching Pipecat test)
TEST_DURATION = 30  # seconds
TARGET_SAMPLE_RATE = 16000  # Match Pipecat test

class VoiceCoachVoskTest:
    def __init__(self):
        self.start_time = None
        self.transcription_count = 0
        self.final_transcriptions = 0
        self.partial_transcriptions = 0
        self.total_processing_time = 0
        self.audio_chunks_processed = 0
        self.audio_queue = queue.Queue()
        
    def audio_callback(self, indata, frames, time, status):
        """Audio callback - same pattern as user's original"""
        if status:
            print(f"[AUDIO] Status: {status}")
        
        # Record processing start time
        process_start = time.time() if hasattr(time, 'time') else 0
        
        self.audio_queue.put(bytes(indata))
        self.audio_chunks_processed += 1
        
        # Calculate processing time for this chunk
        if hasattr(time, 'time'):
            chunk_time = (time.time() - process_start) * 1000  # ms
            self.total_processing_time += chunk_time
    
    def test_real_time_transcription(self):
        """Test Vosk real-time transcription - comparable to Pipecat test"""
        
        print(f"[MIC] VoiceCoach V2 - Vosk Performance Test")
        print(f"=" * 50)
        print(f"Duration: {TEST_DURATION} seconds")
        print(f"Using user's original Vosk approach")
        print()
        
        # Audio device setup (from user's original code)
        print("[SETUP] Checking audio devices...")
        device_info = sd.query_devices(sd.default.device[0], 'input')
        actual_samplerate = int(device_info['default_samplerate'])
        
        print(f"Default Device: {sd.default.device[0]} - {device_info['name']}")
        print(f"Sample Rate: {actual_samplerate} Hz")
        print()
        
        # Load Vosk model (user's path)
        print("[SETUP] Loading Vosk model...")
        model_path = r"C:\Users\Administrator\Downloads\LLM\vosk-model-en-us-0.22-lgraph\vosk-model-en-us-0.22-lgraph"
        
        try:
            model = Model(model_path)
            recognizer = KaldiRecognizer(model, actual_samplerate)
            recognizer.SetWords(False)  # Same as user's config
            recognizer.SetPartialWords(False)  # Same as user's config
            print("[OK] Vosk model loaded successfully")
        except Exception as e:
            print(f"[ERROR] Failed to load Vosk model: {e}")
            return
        
        print()
        print("[REC] Starting audio capture... Speak into microphone!")
        
        self.start_time = time.time()
        
        try:
            with sd.RawInputStream(
                dtype='int16',
                channels=1,
                samplerate=actual_samplerate,
                callback=self.audio_callback
            ):
                # Process audio for test duration
                while (time.time() - self.start_time) < TEST_DURATION:
                    if not self.audio_queue.empty():
                        # Get audio data
                        data = self.audio_queue.get()
                        process_start = time.time()
                        
                        # Process with Vosk (same as user's code)
                        if recognizer.AcceptWaveform(data):
                            result = recognizer.Result()
                            result_dict = json.loads(result)
                            text = result_dict.get("text", "")
                            
                            if text.strip():  # Only count non-empty transcriptions
                                self.final_transcriptions += 1
                                self.transcription_count += 1
                                print(f"[FINAL] {text}")
                        else:
                            # Partial result
                            partial = recognizer.PartialResult()
                            partial_dict = json.loads(partial)
                            partial_text = partial_dict.get("partial", "")
                            
                            if partial_text.strip():
                                self.partial_transcriptions += 1
                        
                        # Track processing time
                        processing_time = (time.time() - process_start) * 1000
                        self.total_processing_time += processing_time
                        
                        # Progress indicator (every 5 seconds)
                        elapsed = time.time() - self.start_time
                        if int(elapsed) % 5 == 0 and int(elapsed) != int(elapsed - 0.1):
                            print(f"[TIME] {elapsed:.0f}s elapsed, {self.transcription_count} transcriptions")
                    else:
                        # Brief sleep to prevent busy waiting
                        time.sleep(0.001)
                        
        except KeyboardInterrupt:
            print("[INFO] Test interrupted by user")
        except Exception as e:
            print(f"[ERROR] Error during test: {e}")
        
        # Report results
        self.report_performance(actual_samplerate)
    
    def report_performance(self, sample_rate):
        """Report performance metrics for comparison with Pipecat"""
        
        total_time = time.time() - self.start_time if self.start_time else 0
        avg_processing_time = self.total_processing_time / max(self.audio_chunks_processed, 1)
        chunks_per_second = self.audio_chunks_processed / max(total_time, 1)
        transcription_rate = self.transcription_count / max(total_time, 1)
        
        print()
        print(f"[RESULTS] VOSK PERFORMANCE RESULTS")
        print(f"=" * 50)
        print(f"Total Test Time: {total_time:.2f} seconds")
        print(f"Audio Chunks Processed: {self.audio_chunks_processed}")
        print(f"Processing Rate: {chunks_per_second:.1f} chunks/second")
        print(f"Average Processing Time: {avg_processing_time:.2f} ms per chunk")
        print(f"Final Transcriptions: {self.final_transcriptions}")
        print(f"Partial Transcriptions: {self.partial_transcriptions}")
        print(f"Total Transcriptions: {self.transcription_count}")
        print(f"Transcription Rate: {transcription_rate:.2f} transcriptions/second")
        print(f"Sample Rate: {sample_rate} Hz")
        print()
        
        # Comparison with Pipecat results
        print(f"[COMPARE] VOSK vs PIPECAT COMPARISON:")
        print(f"Pipecat Processing Rate: 15.6 chunks/second")
        print(f"Vosk Processing Rate: {chunks_per_second:.1f} chunks/second")
        
        performance_ratio = chunks_per_second / 15.6 if chunks_per_second > 0 else 0
        print(f"Vosk Performance Advantage: {performance_ratio:.1f}x faster")
        print()
        
        # Pass/Fail assessment (same criteria as Pipecat)
        print(f"[TARGET] PERFORMANCE TARGETS:")
        print(f"Real-time Requirement: >60 chunks/second")
        print(f"User Experience Goal: <100ms processing time")
        print(f"Transcription Quality: Actually producing text")
        print()
        
        if chunks_per_second > 60 and avg_processing_time < 100 and self.transcription_count > 0:
            print(f"[PASS] VOSK PERFORMANCE: EXCELLENT")
            print(f"Ready for production use")
        elif chunks_per_second > 30 and self.transcription_count > 0:
            print(f"[GOOD] VOSK PERFORMANCE: ACCEPTABLE")  
            print(f"Suitable for coaching application")
        else:
            print(f"[WARN] VOSK PERFORMANCE: NEEDS OPTIMIZATION")

def main():
    """Run Vosk performance test comparable to Pipecat"""
    
    print("[START] VoiceCoach V2 - Vosk Performance Test")
    print("=" * 50)
    print("Testing user's proven Vosk implementation")
    print("Direct comparison to Pipecat performance test")
    print()
    
    # Check Vosk availability
    try:
        import vosk
        print(f"[OK] Vosk available")
    except ImportError:
        print("[ERROR] Vosk not installed. Run: pip install vosk")
        return
    
    # Check sounddevice availability  
    try:
        import sounddevice as sd
        print(f"[OK] SoundDevice available")
    except ImportError:
        print("[ERROR] SoundDevice not installed. Run: pip install sounddevice")
        return
    
    print()
    
    # Run test
    test = VoiceCoachVoskTest()
    test.test_real_time_transcription()

if __name__ == "__main__":
    main()