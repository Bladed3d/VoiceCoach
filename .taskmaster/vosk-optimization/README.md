# Vosk Optimization Test Files

## 📁 Folder Structure

```
.taskmaster/vosk-optimization/
├── test-files/           # Your audio and text files go here
│   ├── test-normal.wav   # Your 2-3 minute recording
│   ├── test-normal.txt   # Exact transcript of the recording
│   ├── test-quiet.wav    # Optional: quiet environment test
│   ├── test-quiet.txt    # Transcript for quiet test
│   └── test-noisy.wav    # Optional: noisy environment test
│       test-noisy.txt    # Transcript for noisy test
└── results/              # Optimization results stored here
    └── (auto-generated result files)
```

## 📝 How to Create Test Files

### 1. Create Your Text File First
Save as `.taskmaster/vosk-optimization/test-files/test-normal.txt`

Example content (2-3 minutes when spoken):
```
Good morning, this is a test recording for optimizing Vosk speech recognition.
Today is January fifteenth, twenty twenty four, and the time is three thirty PM.
Let me tell you about our solution and how it can help your business grow.

Our software as a service platform integrates seamlessly with Salesforce.
The return on investment typically exceeds three hundred percent within the first year.
We've helped over five thousand companies improve their sales processes.

What's your current solution costing you per month?
Have you considered the hidden costs of manual data entry?
Let me understand your requirements better before we discuss pricing.

[Continue for 2-3 minutes total...]
```

### 2. Record Your Audio File
- Use Windows Voice Recorder or Audacity
- Save as `.taskmaster/vosk-optimization/test-files/test-normal.wav`
- Read the text file naturally, as you would in a sales call
- Include natural pauses and speaking variations

### 3. File Naming Convention
- `test-normal.wav/txt` - Your primary test files
- `test-quiet.wav/txt` - Quiet environment (optional)
- `test-noisy.wav/txt` - Background noise (optional)
- `test-fast.wav/txt` - Fast speaking pace (optional)

## 🎯 Tips for Best Results

1. **Match your real environment**: Record where you actually make calls
2. **Use your actual equipment**: Same headset/microphone you use daily
3. **Natural speech**: Don't over-pronounce, speak naturally
4. **Include variety**: Mix statements, questions, numbers, and pauses

## 🚀 Running the Optimization

1. Open VoiceCoach V2
2. Go to Settings → Vosk Optimizer tab
3. Select your test files from this folder
4. Click "Start Optimization"
5. Results will be saved in the `results/` folder

## 📊 What Gets Optimized

The optimizer will test various parameters to find the best combination for YOUR voice:
- Sample rates (8kHz, 16kHz, 22kHz)
- Chunk sizes (2000-16000 bytes)
- Beam sizes (accuracy vs speed)
- Silence detection thresholds
- Partial word recognition
- And many more...

## Expected Improvements

Typical results after optimization:
- 10-25% better word accuracy
- 30-50% faster response times
- Better handling of your speech patterns
- Reduced false triggers

## Need Help?

If transcription accuracy is still low after optimization:
1. Check microphone quality and placement
2. Reduce background noise if possible
3. Consider a better quality headset
4. Ensure Windows audio settings are correct (16kHz, 16-bit)