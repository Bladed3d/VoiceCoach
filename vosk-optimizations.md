# Vosk Performance Optimizations for VoiceCoach V2

## Current Optimizations (Already Implemented)
✅ SetWords(False) - Disabled word timings
✅ SetPartialWords(False) - Disabled partial word processing  
✅ 16kHz mono audio capture - Native Vosk format
✅ AudioWorklet buffering - Reduces chunk frequency
✅ Direct PCM transmission - No encoding overhead
✅ Disabled recognizer reset - Prevents context loss

## Additional Optimizations Available

### 1. Python Server Process Priority (HIGH IMPACT)
Add to vosk-native-websocket-server.py startup:
```python
import os
import sys

if sys.platform == 'win32':
    import psutil
    # Set process to high priority
    p = psutil.Process(os.getpid())
    p.nice(psutil.HIGH_PRIORITY_CLASS)
    # Pin to specific CPU cores (optional)
    p.cpu_affinity([0, 1])  # Use first 2 cores
```

### 2. Model Warmup (MEDIUM IMPACT)
Add after model initialization:
```python
# Warm up the model with dummy audio
dummy_audio = bytes(16000 * 2)  # 1 second of silence
warmup_rec = KaldiRecognizer(self.model, 16000)
warmup_rec.AcceptWaveform(dummy_audio)
del warmup_rec
print("[6002.3] Model warmed up")
```

### 3. Grammar-Based Recognition (HIGH IMPACT for limited vocabulary)
If you know common sales phrases, use grammar:
```python
# For limited vocabulary scenarios
grammar = '["price", "budget", "decision", "timeline", "competitor", ...]'
self.recognizer = KaldiRecognizer(self.model, self.sample_rate, grammar)
```

### 4. Disable Vosk Logging (LOW IMPACT)
```python
from vosk import SetLogLevel
SetLogLevel(-1)  # Disable all Vosk internal logging
```

### 5. Audio Buffer Fine-Tuning
Test these buffer sizes for your use case:
- 400 samples (25ms) - Most responsive, higher CPU
- 800 samples (50ms) - Current, balanced
- 1200 samples (75ms) - Less CPU, slight delay
- 1600 samples (100ms) - Minimum CPU, noticeable delay

### 6. Binary Result Format (MEDIUM IMPACT)
Skip JSON parsing overhead:
```python
# Instead of json.loads(self.recognizer.Result())
# Use direct binary access if Vosk supports it in future versions
```

### 7. Recognizer Pool (COMPLEX, HIGH IMPACT)
For parallel processing:
```python
# Create pool of recognizers
self.recognizer_pool = [
    KaldiRecognizer(self.model, self.sample_rate) 
    for _ in range(3)
]
# Round-robin or load-balanced usage
```

### 8. System-Level Optimizations

#### Windows Specific:
```batch
# Disable Windows Defender real-time scanning for model directory
Add-MpPreference -ExclusionPath "C:\Users\Administrator\Downloads\LLM\vosk-model-en-us-0.22-lgraph"

# Set Python process affinity
start /affinity 3 /high python vosk-native-websocket-server.py
```

#### Network Optimizations:
```python
# Increase WebSocket buffer sizes
websocket.max_size = 2**23  # 8MB
websocket.ping_interval = None  # Disable pings
websocket.ping_timeout = None
```

### 9. Model Loading Optimization
Use memory-mapped loading if available:
```python
# Check if model supports mmap loading
model = Model(model_path, mmap=True)  # If supported
```

### 10. Chunk Processing Pipeline
Implement async pipeline:
```python
async def process_audio_pipeline(self, audio_bytes):
    # Process in background while receiving next chunk
    asyncio.create_task(self.process_audio(audio_bytes))
```

## Recommended Implementation Priority

1. **Process Priority** - Easy, high impact
2. **Model Warmup** - Easy, prevents first-transcription delay
3. **Disable Logging** - Easy, small improvement
4. **Grammar Mode** - If applicable to your domain
5. **Buffer Tuning** - Requires testing for your setup

## Performance Expectations

With all optimizations:
- Latency: < 100ms from speech to transcription
- CPU Usage: 5-15% on modern processors
- Memory: ~500MB for model, stable during operation
- Throughput: Real-time factor of 0.1-0.3 (10-30% of real-time)

## Testing Recommendations

1. Use the test script at D:\Projects\Ai\vosk\test_live_vosk.py as baseline
2. Measure with Windows Performance Monitor
3. Test with actual sales conversations, not just test audio
4. Monitor Python server console for timing breadcrumbs