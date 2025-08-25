# WAV File Testing for VoiceCoach

## Overview
Since automated testing agents can't speak into microphones, we use WAV file playback to test the audio pipeline.

## Two Testing Options

### Option 1: Use Your Own WAV File
1. **Create or obtain a WAV file** with speech (sales call, conversation, etc.)
2. **Place it in**: `voicecoach-app/public/test-audio/sales-call-sample.wav`
3. **Start the app** with test mode: 
   ```bash
   npm run tauri dev
   ```
4. **Enable WAV test mode** in browser console:
   ```javascript
   // Load your WAV file
   await wavTestMode.loadTestAudio('/test-audio/sales-call-sample.wav');
   
   // Start playback to test recording
   wavTestMode.startTestPlayback((audioData) => {
     console.log('Audio chunk:', audioData.length);
   });
   ```

### Option 2: Use Generated Test Tone
If you don't have a WAV file, the system can generate a test tone:

1. **Start the app** with wavtest parameter:
   ```
   http://localhost:1420/?wavtest=true
   ```

2. **In console**:
   ```javascript
   // Generate synthetic test audio
   wavTestMode.generateTestWav();
   
   // Start playback
   wavTestMode.startTestPlayback();
   ```

## How It Works

The WAV test mode:
1. Loads audio from a file or generates a test tone
2. Plays it through Web Audio API
3. Captures audio chunks like a microphone would
4. Feeds data to the recording system
5. Allows full pipeline testing without physical microphone

## Testing with Enhanced User Testing Agent

Once WAV test mode is set up, the Enhanced User Testing Agent can:
1. Load the test audio
2. Click "Start Coaching"
3. Verify audio is being processed (LED 4500)
4. Check transcriptions appear
5. Run sustained 30-second tests
6. Validate the complete LED chain

## Creating a Test WAV File

If you want to create a realistic test file:

### Windows Voice Recorder:
1. Open Voice Recorder app
2. Record a sample sales conversation (30-60 seconds)
3. Save as WAV format
4. Copy to `voicecoach-app/public/test-audio/`

### Audacity (Free):
1. Download Audacity
2. Record or import audio
3. Export as WAV (44.1kHz, 16-bit)
4. Place in test folder

### Online Tools:
- https://online-voice-recorder.com/
- Save as WAV format
- Download and place in test folder

## LED Monitoring

When using WAV test mode, watch for these LEDs:
- **LED 4500**: Audio chunk processed from WAV
- **LED 4501**: Test audio playback completed
- **LED 4200**: Recording system receiving audio
- **LED 5000+**: Transcription happening

## Recommended Test Audio Content

For realistic testing, your WAV file should contain:
- Clear speech (not music)
- Sales conversation phrases
- Multiple speakers if testing speaker detection
- 30-60 seconds duration
- No background music (interferes with transcription)

Example script to record:
```
"Hello, thanks for taking my call today. I wanted to discuss our new software solution that could help streamline your sales process. I understand you're currently using a manual system. What challenges are you facing with tracking customer interactions? Our platform can reduce data entry time by fifty percent..."
```

## Integration with Test Audio Simulator

The WAV test mode can work alongside the text-based simulator:
- WAV test mode: Tests actual audio processing pipeline
- Text simulator: Tests UI and transcription display

Both can run simultaneously for comprehensive testing.