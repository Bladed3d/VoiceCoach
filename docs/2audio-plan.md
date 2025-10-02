# VoiceCoach V2 Audio Source Tagging Implementation Plan

## CRITICAL: DO NOT BREAK THE WORKING WEBSOCKET PIPELINE

### Problem Statement
Previous Claude sessions kept breaking the working WebSocket transcription by attempting complex dual-channel approaches. The current system works perfectly:
- ✅ Native WebSocket on port 8765 (stable)
- ✅ Vosk speech recognition (working)
- ✅ AudioWorklet processing (reliable)
- ✅ Transcription display (functional)

### Solution: Audio Source Tagging (NOT stream separation)
Instead of separating audio streams, TAG the source at capture time. This preserves the entire working pipeline while adding speaker identification.

## Implementation Approach: MINIMAL RISK

### Phase 1: AudioWorklet Enhancement (1 hour)
**File**: `public/vosk-audio-worklet.js`

Add source tagging capability:
```javascript
class VoskAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.currentSource = 'microphone'; // Default
    this.port.onmessage = this.handleMessage.bind(this);
  }
  
  handleMessage(event) {
    const { type, source } = event.data;
    if (type === 'SET_SOURCE') {
      this.currentSource = source;
    }
  }
  
  process(inputs, outputs, parameters) {
    // EXISTING CODE UNCHANGED
    // Your existing processing...
    
    if (this.hasEnoughSamples()) {
      const audioChunk = this.getProcessedChunk();
      
      // NEW: Enhanced message with source info
      this.port.postMessage({
        type: 'AUDIO_DATA',
        data: audioChunk,
        source: this.currentSource, // 'microphone' or 'mixed'
        sampleCount: audioChunk.length,
        timestamp: Date.now()
      });
    }
  }
}
```

### Phase 2: WebSocket Client Update (30 minutes)
**File**: `src/services/websocket/websocket-client.ts`

Modify the startAudioCapture method to set audio source:
```typescript
private async startAudioCapture(captureMode: 'microphone' | 'full-conversation'): Promise<void> {
  // ... existing code until audioWorkletNode creation ...
  
  // NEW: Set source based on capture mode
  const audioSource = captureMode === 'microphone' ? 'microphone' : 'mixed';
  this.audioWorkletNode.port.postMessage({
    type: 'SET_SOURCE',
    source: audioSource
  });
  
  // Enhanced message handler
  this.audioWorkletNode.port.onmessage = (event) => {
    const { type, data, source, sampleCount, chunkIndex } = event.data;
    
    if (type === 'AUDIO_DATA') {
      // Send with source metadata
      this.sendAudioChunkWithSource(data, source);
    }
  };
}

private sendAudioChunkWithSource(audioData: ArrayBuffer, source: string): boolean {
  if (!this.socket?.connected) return false;
  
  // Convert to base64 as before (EXISTING LOGIC)
  const bytes = new Uint8Array(audioData);
  const base64Data = btoa(String.fromCharCode.apply(null, Array.from(bytes)));
  
  // NEW: Send enhanced message with source
  this.socket.send(JSON.stringify({
    type: 'audio_chunk',
    audio: base64Data,
    source: source,
    timestamp: Date.now()
  }));
  
  return true;
}
```

### Phase 3: Vosk Server Update (45 minutes)
**File**: `src/services/simple-vosk-server.py`

Enhance to handle source metadata:
```python
async def handle_client(websocket, path):
    client_id = id(websocket)
    recognizers[client_id] = KaldiRecognizer(model, 16000)
    recognizers[client_id].SetWords(True)
    recognizers[client_id].SetPartialWords(True)
    
    try:
        async for message in websocket:
            try:
                # Try to parse as JSON with metadata
                data = json.loads(message)
                
                if data.get('type') == 'audio_chunk':
                    audio_data = base64.b64decode(data.get('audio', ''))
                    source = data.get('source', 'mixed')
                    
                    # Process with Vosk (EXISTING LOGIC)
                    if recognizers[client_id].AcceptWaveform(audio_data):
                        result = json.loads(recognizers[client_id].Result())
                        if result.get('text'):
                            # NEW: Enhanced result with speaker info
                            enhanced_result = {
                                'type': 'final_transcript',
                                'text': result['text'],
                                'speaker': 'user' if source == 'microphone' else 'customer',
                                'source': source,
                                'confidence': result.get('conf', 0.0),
                                'timestamp': time.time()
                            }
                            await websocket.send(json.dumps(enhanced_result))
                            
                    else:
                        # Partial results
                        partial = json.loads(recognizers[client_id].PartialResult())
                        if partial.get('partial'):
                            enhanced_partial = {
                                'type': 'partial_transcript',
                                'text': partial['partial'],
                                'speaker': 'user' if source == 'microphone' else 'customer',
                                'source': source,
                                'timestamp': time.time()
                            }
                            await websocket.send(json.dumps(enhanced_partial))
                            
            except json.JSONDecodeError:
                # FALLBACK: Existing binary processing for backward compatibility
                # Keep all existing code as fallback
                audio_data = message
                # ... existing processing ...
```

### Phase 4: Frontend Display Update (30 minutes)
**File**: `src/components/coaching/TranscriptionPanel.tsx`

Add speaker indicators:
```tsx
interface TranscriptionEntry {
  text: string;
  speaker: 'user' | 'customer' | 'unknown';
  type: 'final_transcript' | 'partial_transcript';
  timestamp: number;
  source?: string;
}

const TranscriptionEntry: React.FC<{ entry: TranscriptionEntry }> = ({ entry }) => (
  <div className={`
    transcript-entry 
    ${entry.speaker === 'user' ? 'bg-blue-900/20 text-blue-300' : 'bg-purple-900/20 text-purple-300'}
    ${entry.type === 'partial_transcript' ? 'opacity-60' : ''}
  `}>
    <div className="flex items-center justify-between mb-1">
      <span className="font-semibold flex items-center space-x-1">
        {entry.speaker === 'user' ? (
          <>🎤 <span>You</span></>
        ) : (
          <>💬 <span>Customer</span></>
        )}
      </span>
      <span className="text-xs opacity-60">
        {new Date(entry.timestamp * 1000).toLocaleTimeString()}
      </span>
    </div>
    <div className="break-words">{entry.text}</div>
  </div>
);
```

## Risk Mitigation Strategies

### 1. Feature Flag Implementation
Add toggle to disable new functionality:
```typescript
const ENABLE_SPEAKER_TAGGING = localStorage.getItem('voicecoach-speaker-tagging') === 'true';

if (ENABLE_SPEAKER_TAGGING) {
  // Use new speaker-aware processing
} else {
  // Use existing processing
}
```

### 2. Backward Compatibility
- Vosk server supports both old binary and new JSON message formats
- Frontend handles transcripts with and without speaker info
- AudioWorklet defaults to existing behavior if not configured

### 3. Rollback Plan
If issues arise:
1. Disable speaker tagging via localStorage flag
2. Restart Vosk server (falls back to existing binary processing)
3. Frontend reverts to existing display

## Why This Approach Works

### ✅ Preserves Working System
- No changes to core WebSocket connection logic
- No changes to audio capture fundamentals
- No changes to Vosk recognition core

### ✅ Minimal Risk
- Additive changes only
- Backward compatible
- Easy to disable/rollback

### ✅ Immediate Value
- Enables speaker identification
- Unlocks contextual coaching
- Foundation for advanced features

## Phase 5: Coaching Enhancement (Future)
Once speaker tagging is stable, enhance coaching:

```typescript
// Update intelligent-prompt-builder.ts
async buildContextAwarePrompt(transcriptionHistory: TranscriptionEntry[]): Promise<CoachingPrompt> {
  const lastCustomerStatement = transcriptionHistory
    .filter(t => t.speaker === 'customer' && t.type === 'final_transcript')
    .slice(-1)[0];
    
  if (lastCustomerStatement && this.detectsObjection(lastCustomerStatement.text)) {
    return this.generateObjectionResponse(lastCustomerStatement.text);
  }
  
  // More contextual coaching based on WHO said WHAT
}
```

## Success Metrics
- ✅ Existing WebSocket stability maintained (>99% uptime)
- ✅ Speaker identification working in basic scenarios
- ✅ Transcription latency remains <200ms
- ✅ Zero breaking changes to core transcription
- ✅ Coaching becomes contextually aware

## CRITICAL REMINDERS

1. **DO NOT MODIFY** the core WebSocket connection logic
2. **DO NOT CHANGE** the audio capture stream setup
3. **DO NOT BREAK** the existing Vosk processing pipeline
4. **DO ADD** source metadata as enhancement layer
5. **DO MAINTAIN** backward compatibility throughout

## Files to Modify (In Order)
1. `public/vosk-audio-worklet.js` - Add source tagging
2. `src/services/websocket/websocket-client.ts` - Pass source to server
3. `src/services/simple-vosk-server.py` - Handle source metadata
4. `src/components/coaching/TranscriptionPanel.tsx` - Display speakers
5. `src/types/coaching.ts` - Add speaker to TranscriptionItem interface

## Implementation Notes
- Start with Phase 1 (AudioWorklet) and test thoroughly
- Each phase can be tested independently
- Feature flag allows safe experimentation
- Previous attempts failed because they tried to replace instead of enhance

## What NOT to Do (Lessons from Previous Attempts)
- ❌ Don't create dual WebSocket connections
- ❌ Don't separate audio streams at capture level
- ❌ Don't modify core Vosk processing
- ❌ Don't break existing message formats
- ❌ Don't implement complex neural separation

## Expected Timeline
- Phase 1: 1 hour
- Phase 2: 30 minutes  
- Phase 3: 45 minutes
- Phase 4: 30 minutes
- Testing: 1 hour
- **Total: 3.25 hours for speaker-aware transcription**