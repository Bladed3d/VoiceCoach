# Vosk Expert Knowledge: Accuracy Optimization Guide

## Top 10 Ways to Improve Vosk Accuracy (Ranked by Impact)

### 1. **Audio Format Compliance (HIGH IMPACT)**
- Use PCM 16kHz 16-bit mono format exclusively
- Convert with ffmpeg: `ffmpeg -i input.wav -ar 16000 -ac 1 -acodec pcm_s16le output.wav`
- Sample rate MUST match model (16kHz for most models, 8kHz for telephony)

### 2. **Model Selection (HIGH IMPACT)**
- Big models: ~20% accuracy improvement over small models
- Small models (50MB): 300MB RAM, mobile/desktop use
- Big models: Up to 16GB RAM, server use, highest accuracy
- Use language-specific models for your target language

### 3. **Proper Audio Quality (HIGH IMPACT)**
- Record in quiet environment with quality microphone
- Enable noise suppression and echo cancellation
- Avoid frame drops and audio artifacts
- Test file transcription vs live microphone to isolate quality issues

### 4. **SetWords/SetPartialWords Configuration (MEDIUM IMPACT)**
```javascript
// Node.js example
const rec = new vosk.Recognizer(model, 16000);
rec.setWords(true);  // Enables word-level timestamps & confidence
// SetPartialWords is handled via 'partialresult' events
```

### 5. **Dynamic Vocabulary Configuration (MEDIUM IMPACT)**
- Most small models allow runtime vocabulary reconfiguration
- Adapt vocabulary to domain-specific terminology
- Reduces Out-of-Vocabulary (OOV) rate significantly

### 6. **Custom Language Models (MEDIUM IMPACT)**
- Domain-specific models reduce word error rates
- Especially effective for technical terminology
- Helps with varied accents and background noise

### 7. **Microphone Configuration (MEDIUM IMPACT)**
```javascript
// Browser example with optimal settings
const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
        sampleRate: 16000
    }
});
```

### 8. **Streaming vs Batch Processing (LOW-MEDIUM IMPACT)**
- Use streaming API for real-time (<500ms latency)
- Batch processing for highest accuracy on recorded files
- Streaming provides continuous large vocabulary transcription

### 9. **Audio Preprocessing (LOW IMPACT)**
- Use ffmpeg for format conversion when needed
- Ensure consistent audio levels
- Remove silence gaps if possible

### 10. **Confidence Scoring (LOW IMPACT)**
- Monitor word confidence scores (0-1 range)
- Filter low-confidence results
- Use for quality assurance in transcription pipeline

## Common Problems and Solutions

### Windows-Specific Issues

#### **Problem: test_microphone.js Doesn't Work**
**Cause:** `mic` package calls sox.exe with `-p` parameter (32-bit format) but Vosk expects 16-bit data

**Solution:**
```javascript
// Modify mic.js file line 50:
// Replace: '-p'
// With: '-t', 'raw', '-'
```

**Alternative:** Use `node-portaudio` package instead of `mic`

#### **Problem: PyAudio Installation Issues**
**Cause:** pip install fails on Windows with Python 3.7+

**Solution:**
- Find `pyaudio.py` in `myenv\Lib\site-packages`
- Set `exception_on_overflow=False` in read function

### Audio Format Issues

#### **Problem: Poor Real-time Accuracy vs File Accuracy**
**Symptoms:** 90-95% accuracy with files, 10% with microphone

**Diagnosis:**
1. Check audio format compliance
2. Verify sample rate matching
3. Test microphone quality independently

**Solution:**
```javascript
// Ensure proper format in Node.js
const audioFormat = {
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16
};
```

#### **Problem: Sample Rate Mismatches**
**Cause:** Recording at 8kHz but model expects 16kHz

**Solution:**
```javascript
// Match recognizer to audio format
const rec = new vosk.Recognizer(model, audioSampleRate);
```

### Implementation Gotchas

#### **Node.js Constructor Issues**
```javascript
// ✅ Correct
const rec = new vosk.Recognizer(model, 16000);

// ❌ Wrong (causes constructor errors)
const rec = new vosk.KaldiRecognizer(model, 16000);
```

#### **Browser vs Node.js Differences**
- Browser: Use `vosk-browser` with WebWorker
- Node.js: Use official `vosk` npm package
- Different API patterns for each environment

## Debugging Workflow

### 1. Audio Quality Check
- Listen to audio samples manually
- Check for background noise, distortion
- Verify recording conditions

### 2. Technical Validation
```bash
# Check audio format
ffprobe input.wav

# Convert to proper format
ffmpeg -i input.wav -ar 16000 -ac 1 -acodec pcm_s16le output.wav
```

### 3. Model Testing
- Test with known good audio file first
- Compare batch vs streaming results
- Calculate OOV rate for vocabulary mismatch

### 4. Hardware Verification
- Test different microphones
- Check system audio settings
- Verify Windows audio drivers

## Performance Optimization

### Memory Usage
- Small models: ~300MB RAM
- Large models: Up to 16GB RAM
- Choose based on accuracy vs resource constraints

### Latency Targets
- Real-time streaming: <500ms
- Zero-latency response with proper configuration
- Batch processing: Higher accuracy, slower response

### Processing Trade-offs
- Small models: ~150 seconds processing time
- Large models: ~750 seconds processing time
- 5x speed difference for accuracy improvement

## Production Implementation Checklist

- [ ] Audio format: PCM 16kHz 16-bit mono
- [ ] Model size appropriate for hardware
- [ ] SetWords enabled for detailed results
- [ ] Proper error handling for recognition failures
- [ ] Vocabulary configured for domain
- [ ] Windows mic package issues resolved
- [ ] Confidence scoring implemented
- [ ] Performance monitoring in place
- [ ] Fallback strategy for low accuracy

## Resources

- **Models:** https://alphacephei.com/vosk/models
- **API Docs:** https://github.com/alphacep/vosk-api
- **Browser Version:** https://www.npmjs.com/package/vosk-browser
- **Node.js Version:** https://www.npmjs.com/package/vosk
- **Accuracy Debugging:** https://alphacephei.com/vosk/accuracy