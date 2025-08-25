# VoiceCoach Testing Instructions - COMPLETE FUNCTIONALITY VALIDATION

## 🚨 CRITICAL TESTING FOCUS
**NOT JUST CRASH PREVENTION - FULL FEATURE VALIDATION REQUIRED**

The app must do MORE than just not crash. It must:
1. **Process actual transcriptions from the WAV file audio**
2. **Display transcriptions in the RIGHT panel (Live Transcription)**
3. **Generate AI coaching prompts based on the transcription context**
4. **Display AI prompts in the LEFT panel (AI Coaching Assistant)**

**Previous Issue**: Testing only checked for crashes. The app didn't crash but also didn't transcribe or coach - making it useless.

## IMMEDIATE SETUP

### 1. Auto-Open DevTools Console
Add this to the Tauri window configuration to auto-open console on startup:

**File**: `voicecoach-app/src-tauri/src/main.rs`
```rust
.on_window_event(|event| {
    if let tauri::WindowEvent::Focused(true) = event.event() {
        // Auto-open DevTools on focus for debugging
        #[cfg(debug_assertions)]
        event.window().open_devtools();
    }
})
```

OR add to the window builder:
```rust
.initialization_script(r#"
    // Auto-open DevTools in development
    if (window.location.hostname === 'localhost' || window.location.hostname === 'tauri.localhost') {
        setTimeout(() => {
            console.log('🔧 Auto-opening DevTools for debugging...');
            // This will show errors automatically
        }, 1000);
    }
"#)
```

### 2. Start the App
```bash
cd D:\Projects\Ai\VoiceCoach\voicecoach-app
npm run tauri dev
```

## PRIMARY TESTING MISSION

### Use the VoiceCoach Testing Agent
**IMPORTANT**: The specialized VoiceCoach testing agent is at:
`D:\Projects\Ai\VoiceCoach\.claude\agents\voicecoach-testing.md`

This agent uses LED chain validation to test ACTUAL functionality:
- It monitors the complete LED sequence from button click to backend execution
- It runs sustained 30-second tests to catch delayed crashes
- It reports the EXACT LED number where failures occur

### Enable Test Mode for Automated Testing

Since testing agents can't speak into a microphone, we have TWO testing options:

#### Option 1: WAV File Testing (RECOMMENDED - Most Realistic)
**A test WAV file is already available at: `public/test-audio/sales-call-sample.wav`**

```javascript
// In DevTools console, load and play the test WAV file:
await wavTestMode.loadTestAudio('/test-audio/sales-call-sample.wav');

// Start playback (this simulates microphone input)
wavTestMode.startTestPlayback((audioData) => {
  console.log('Audio chunk:', audioData.length);
});

// The WAV file will play through the audio pipeline just like real microphone input
// Watch for LED 4500 (audio chunks) and LED 4501 (playback complete)
```

#### Option 2: Text Simulation (Quick UI Testing)
```javascript
// In DevTools console, enable text-based simulation:
window.testAudioSimulator.startSimulation((text) => {
  console.log('Simulated:', text);
  // This generates fake transcriptions every 3 seconds
});
```

#### Option 3: Generated Test Tone
```javascript
// If no WAV file available, generate a test tone:
wavTestMode.generateTestWav();
wavTestMode.startTestPlayback();
```

### Execute These Specific Tests

#### Test 1: Basic Initialization
```
1. App loads → Check console for LED sequence
2. Expected: LED 210 → 3000 → 3450-3455 → 211 → 503
3. Button should be ENABLED after LED 503
4. If button stays disabled, check which LED failed
```

#### Test 2: CRITICAL FUNCTIONALITY TEST - WAV File Transcription
```
1. Ensure in split-view (now default)
2. Load the test WAV file (sales-call-sample.wav contains actual sales conversation)
3. Click "Start Coaching Session"
4. Monitor for these REQUIRED outcomes:

   WITHIN 5 SECONDS:
   ✅ LED 5000+ (Transcription events) must appear
   ✅ RIGHT panel must show actual words from the sales call
   ✅ Transcription should include phrases like:
      - "Hi, I'm calling about..."
      - "interested in learning more"
      - Product/service mentions
   
   WITHIN 10 SECONDS:
   ✅ LEFT panel must show AI coaching prompts like:
      - "Ask about their current solution"
      - "Probe for pain points"
      - "Mention ROI benefits"
   ✅ AI prompts must be CONTEXTUAL to the transcription
   
   FAILURE CONDITIONS:
   ❌ No transcription text after 10 seconds = FAIL
   ❌ Generic/placeholder text only = FAIL  
   ❌ AI prompts not related to conversation = FAIL
   ❌ Panels remain empty = FAIL
```

#### Test 3: Transcription Pipeline Validation
```
1. Check these LED sequences for transcription:
   - LED 4500: Audio chunks received
   - LED 5000: Transcription started
   - LED 5001: Transcription text received
   - LED 5002: Transcription displayed in UI
   
2. Verify Python bridge:
   - Check terminal for Python process spawn
   - Look for "Whisper model loaded" or similar
   - Monitor for transcription confidence scores
   
3. Verify AI coaching:
   - LED 6000: AI prompt generation started
   - LED 6001: Ollama/LLM query sent
   - LED 6002: AI response received
   - LED 6003: AI prompt displayed in UI
```

## CRASH DIAGNOSIS CHECKLIST

When a crash occurs, capture:

### From Console (F12):
- Last LED number before crash
- Error message (exact text)
- Stack trace
- Whether it's JavaScript or Rust panic

### From Terminal:
- Check for "thread 'tokio-runtime-worker' panicked"
- Look for "ERROR" lines with LED numbers
- Note any "Failed to run Python" messages

### From UI:
- Does button become disabled?
- Do panels freeze?
- Does audio visualizer stop?

## KNOWN ISSUES TO VERIFY

1. **Python Missing**: Should see "Python not available" but NOT crash
2. **Ollama Missing**: Should show "AI coaching unavailable" but NOT crash  
3. **Web Speech API**: Should be disabled in Tauri (was causing "aborted" errors)
4. **Runtime Panic**: Should be fixed (was "Cannot start runtime from within runtime")

## LED FAILURE MAPPING

| LED Range | Component | Common Issues |
|-----------|-----------|---------------|
| 100-199 | Frontend UI | Event handler errors |
| 200-299 | Frontend API calls | Tauri invoke failures |
| 300-399 | Frontend state | React state update errors |
| 3000-3999 | Rust backend | Runtime panics, init failures |
| 4000-4999 | Audio processing | Stream failures, device errors |
| 5000-5999 | Transcription | Python missing, format errors |

## AUTOMATED TESTING COMMAND - FULL FUNCTIONALITY VALIDATION

Use the Task tool with the VoiceCoach Testing Agent for COMPLETE testing:
```
Task: "VoiceCoach Testing Agent"
Prompt: "Perform COMPLETE functionality testing on VoiceCoach:
1. Start the app with 'npm run tauri dev'
2. Load the WAV file at public/test-audio/sales-call-sample.wav
3. Click Start Coaching Session
4. VALIDATE within 5 seconds: Actual transcription text appears in RIGHT panel
5. VALIDATE within 10 seconds: Contextual AI coaching prompts appear in LEFT panel
6. Monitor for full 103-second WAV duration
7. FAIL the test if:
   - No transcription appears
   - Only placeholder text shows
   - AI prompts are generic/not contextual
   - Any panel remains empty
8. After testing, if functionality is broken, identify the exact failure point and implement fixes until BOTH transcription AND AI coaching work properly."
```

### Automated Validation Script
```javascript
// Add this validation function to the test suite
async function validateFunctionality() {
  const startTime = Date.now();
  let transcriptionFound = false;
  let aiPromptsFound = false;
  
  const checkInterval = setInterval(() => {
    // Check RIGHT panel for transcription
    const transcriptionPanel = document.querySelector('.split-view-right .transcription-text');
    if (transcriptionPanel && transcriptionPanel.textContent.length > 50) {
      console.log('✅ LED 5003: Transcription detected:', transcriptionPanel.textContent.substring(0, 100));
      transcriptionFound = true;
    }
    
    // Check LEFT panel for AI prompts
    const aiPanel = document.querySelector('.split-view-left .coaching-prompt');
    if (aiPanel && aiPanel.textContent.length > 20) {
      console.log('✅ LED 6003: AI prompt detected:', aiPanel.textContent.substring(0, 100));
      aiPromptsFound = true;
    }
    
    // Check timing requirements
    const elapsed = Date.now() - startTime;
    if (elapsed > 5000 && !transcriptionFound) {
      console.error('❌ FAIL: No transcription after 5 seconds');
    }
    if (elapsed > 10000 && !aiPromptsFound) {
      console.error('❌ FAIL: No AI prompts after 10 seconds');
    }
    
    // Success condition
    if (transcriptionFound && aiPromptsFound) {
      clearInterval(checkInterval);
      console.log('🎉 SUCCESS: Full functionality validated!');
    }
    
    // Timeout failure
    if (elapsed > 30000) {
      clearInterval(checkInterval);
      console.error('❌ TOTAL FAILURE: No functional output after 30 seconds');
    }
  }, 1000);
}
```

## SUCCESS CRITERIA - FULL FUNCTIONALITY REQUIRED

The app is ONLY considered working when ALL of these are true:

### Minimum Viable Product (MVP):
- ✅ Initialization completes (LED 503)
- ✅ Start button enables
- ✅ Recording starts without crash (LED 4200)
- ✅ **ACTUAL TRANSCRIPTIONS appear in RIGHT panel within 5 seconds**
- ✅ **Transcriptions match the WAV file content (sales conversation)**
- ✅ **AI COACHING PROMPTS appear in LEFT panel within 10 seconds**
- ✅ **AI prompts are CONTEXTUALLY RELEVANT to the transcription**
- ✅ Runs for full WAV duration (103 seconds) without issues

### NOT ACCEPTABLE:
- ❌ App runs but panels stay empty
- ❌ Only placeholder text like "Listening for conversation..."
- ❌ Generic AI prompts not related to actual conversation
- ❌ Transcription shows but AI coaching doesn't work
- ❌ Any "Python not found" errors without fallback transcription

### Required Functionality Chain:
```
WAV Audio → Audio Processing → Transcription Engine → Text Display → AI Analysis → Coaching Prompts
   LED 4500      LED 4501         LED 5000-5002       LED 5003      LED 6000-6002   LED 6003
```

**IF ANY LINK IN THIS CHAIN IS BROKEN, THE TEST FAILS**

## CRITICAL FILES TO CHECK

If crashes persist, check these files:
1. `src-tauri/src/main.rs` - Tauri commands, async runtime
2. `src-tauri/src/audio_processing.rs` - Audio capture logic
3. `src/lib/tauri-mock.ts` - Frontend-backend bridge
4. `src/components/TranscriptionPanel.tsx` - Transcription display
5. `src/hooks/useAudioProcessor.ts` - Audio state management

## TESTING AGENT DELEGATION PROTOCOL

When testing reveals broken functionality, the VoiceCoach Testing Agent should:

1. **DETECT** the exact failure point using LED chain validation
2. **DELEGATE** to VoiceCoach Diagnostic Agent for diagnosis
3. **DELEGATE** to VoiceCoach Correction Agent for fixes
4. **RE-TEST** after fixes are applied

The VoiceCoach Testing Agent should NEVER attempt repairs directly. Instead:
- Report the exact LED failure point
- Identify the component that failed
- Pass this information to specialized agents

### Delegation Examples:
```javascript
// When transcription fails (LED 5000-5002 missing):
await deployAgent('VoiceCoach Diagnostic Agent', {
  task: 'Diagnose transcription failure',
  failedLED: 5000,
  symptoms: 'No transcription after 5 seconds'
});

// When AI coaching fails (LED 6000-6002 missing):
await deployAgent('VoiceCoach Diagnostic Agent', {
  task: 'Diagnose AI coaching failure', 
  failedLED: 6000,
  symptoms: 'No coaching prompts after 10 seconds'
});

// After diagnosis, deploy correction:
await deployAgent('VoiceCoach Correction Agent', {
  task: 'Fix identified issue',
  diagnosis: detectionResult,
  ledContext: failurePoint
});
```

### Complete Agent Loop for VoiceCoach Testing:
```
VoiceCoach Testing Agent → Tests functionality, detects failures
    ↓
VoiceCoach Diagnostic Agent → Analyzes system dependencies
    ↓
VoiceCoach Correction Agent → Applies targeted fixes
    ↓
VoiceCoach Testing Agent → Re-tests to validate fixes
```

## FINAL NOTES

- The app now defaults to **split-view** for better visibility
- **IMPORTANT**: In split-view:
  - **LEFT panel** = AI Coaching Prompts (MUST show contextual coaching)
  - **RIGHT panel** = Live Transcription (MUST show actual words)
- LED breadcrumbs are logged to console for critical operations
- **The app is USELESS if it only prevents crashes but doesn't transcribe or coach**
- **BOTH transcription AND AI coaching must work for the app to be considered functional**

**Remember**: A pretty UI that doesn't transcribe or coach = COMPLETE FAILURE.
**Success**: Real-time transcription of WAV audio + Contextual AI coaching based on that transcription.