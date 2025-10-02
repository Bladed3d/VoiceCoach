# Speaker Separation Implementation Guide for VoiceCoach V2

## Priority: CRITICAL - Must implement before any other features

## Problem Statement
Currently, all transcription appears as a single stream without identifying who is speaking. This makes intelligent coaching nearly impossible because the system cannot understand conversation dynamics, detect objections, or provide contextual guidance.

## Solution Overview
Implement speaker separation by routing:
- **Microphone input** → "User" (salesperson)
- **System audio** → "Customer" (other party)

## Expected Outcome
Transform coaching from generic suggestions to precise, contextual guidance based on WHO said WHAT and WHEN.

## Architecture Changes Required

### 1. Audio Capture Separation (Electron Main Process)
**File**: `main.cjs`

Current state: Single audio stream mixing mic + system audio
Required: Separate streams with speaker identification

```javascript
// In audio configuration
const audioConfig = {
  microphone: {
    source: 'microphone',
    speaker: 'user',
    deviceId: selectedMicDevice
  },
  systemAudio: {
    source: 'system',
    speaker: 'customer',
    enabled: captureSystemAudio
  }
};
```

### 2. WebSocket Message Format Update
**File**: `vosk_server.py`

Current format:
```json
{
  "partial": "transcribed text",
  "text": "final transcribed text"
}
```

Required format:
```json
{
  "speaker": "user" | "customer",
  "partial": "transcribed text",
  "text": "final transcribed text",
  "timestamp": 1234567890,
  "confidence": 0.95
}
```

### 3. AudioWorklet Processor Changes
**File**: `src/workers/audio-processor.js`

The AudioWorklet needs to:
1. Maintain separate buffers for mic and system audio
2. Tag audio chunks with speaker information
3. Send speaker metadata with each chunk

```javascript
// In process method
processAudio(inputs, outputs) {
  const micInput = inputs[0];     // Microphone
  const systemInput = inputs[1];  // System audio
  
  if (micInput[0]?.length) {
    this.processChannel(micInput[0], 'user');
  }
  
  if (systemInput[0]?.length) {
    this.processChannel(systemInput[0], 'customer');
  }
}

processChannel(audioData, speaker) {
  // Process and send with speaker tag
  this.port.postMessage({
    type: 'audio',
    speaker: speaker,
    data: audioData,
    timestamp: Date.now()
  });
}
```

### 4. Vosk Server Modifications
**File**: `vosk_server.py`

The server needs to:
1. Accept speaker metadata with audio chunks
2. Maintain separate recognition contexts per speaker
3. Include speaker in transcription results

```python
# Maintain separate recognizers
recognizers = {
    'user': KaldiRecognizer(model, SAMPLE_RATE),
    'customer': KaldiRecognizer(model, SAMPLE_RATE)
}

async def process_audio(websocket, path):
    async for message in websocket:
        data = json.loads(message)
        speaker = data.get('speaker', 'unknown')
        audio_chunk = data.get('audio')
        
        if speaker in recognizers:
            rec = recognizers[speaker]
            if rec.AcceptWaveform(audio_chunk):
                result = json.loads(rec.Result())
                result['speaker'] = speaker
                result['timestamp'] = time.time()
                await websocket.send(json.dumps(result))
```

### 5. Frontend Components Update
**File**: `src/components/LiveTalk.tsx`

Update to display speaker-separated transcription:

```typescript
interface TranscriptionEntry {
  speaker: 'user' | 'customer';
  text: string;
  timestamp: number;
  isPartial?: boolean;
}

// Display with speaker identification
<div className={`transcript-entry ${entry.speaker}`}>
  <span className="speaker-label">
    {entry.speaker === 'user' ? '👤 You' : '👥 Customer'}:
  </span>
  <span className="text">{entry.text}</span>
</div>
```

### 6. Coaching Service Enhancement
**File**: `src/services/coaching/intelligent-prompt-builder.ts`

Leverage speaker separation for intelligent coaching:

```typescript
async buildContextAwarePrompt(
  userLastStatement: string,
  customerLastStatement: string,
  fullTranscript: TranscriptionEntry[],
  currentStage: SalesStage
): Promise<CoachingPrompt> {
  
  // Detect customer state
  const customerState = this.analyzeCustomerStatement(customerLastStatement);
  
  if (customerState.hasObjection) {
    return this.generateObjectionHandling(
      customerLastStatement,
      currentStage,
      this.getRelevantTechniques('objection')
    );
  }
  
  if (customerState.showsConfusion) {
    return this.generateClarification(
      customerLastStatement,
      userLastStatement,
      currentStage
    );
  }
  
  // Generate stage-appropriate coaching
  return this.generateStageCoaching(
    userLastStatement,
    customerLastStatement,
    currentStage,
    customerState
  );
}
```

### 7. Sales Stage Detector Enhancement
**File**: `src/services/coaching/SalesStageDetector.ts`

Use speaker separation for accurate stage detection:

```typescript
detectStage(transcript: TranscriptionEntry[]): SalesStage {
  const lastCustomerStatements = transcript
    .filter(e => e.speaker === 'customer')
    .slice(-5);
  
  const lastUserStatements = transcript
    .filter(e => e.speaker === 'user')
    .slice(-5);
  
  // Analyze customer responses for stage indicators
  if (this.hasObjections(lastCustomerStatements)) {
    return 'objection';
  }
  
  if (this.asksImplementationQuestions(lastCustomerStatements)) {
    return 'closing';
  }
  
  if (this.sharesPainPoints(lastCustomerStatements)) {
    return 'discovery';
  }
  
  // More sophisticated stage detection...
}
```

## Implementation Steps

### Phase 1: Backend Foundation (2-3 hours)
1. ✅ Modify `vosk_server.py` to accept and process speaker metadata
2. ✅ Update WebSocket message format to include speaker information
3. ✅ Test with mock speaker-tagged audio data

### Phase 2: Audio Capture Separation (3-4 hours)
1. ✅ Update Electron main process audio configuration
2. ✅ Modify AudioWorklet to maintain separate channels
3. ✅ Implement speaker tagging in audio chunks
4. ✅ Test mic vs system audio separation

### Phase 3: Frontend Integration (2-3 hours)
1. ✅ Update LiveTalk component for speaker display
2. ✅ Modify transcript storage to include speaker
3. ✅ Update UI to show conversation flow clearly
4. ✅ Add visual indicators for speakers

### Phase 4: Coaching Intelligence (3-4 hours)
1. ✅ Enhance prompt builder with speaker context
2. ✅ Update stage detector to use speaker separation
3. ✅ Implement customer state analysis
4. ✅ Create contextual coaching responses

### Phase 5: Testing & Refinement (2 hours)
1. ✅ Test with real conversations
2. ✅ Verify objection detection accuracy
3. ✅ Validate stage progression logic
4. ✅ Fine-tune coaching responses

## Testing Scenarios

### Scenario 1: Objection Detection
```
Customer: "That seems really expensive"
System should: Detect price objection, suggest value stacking
```

### Scenario 2: Confusion Detection
```
Customer: "I don't understand how that works"
System should: Suggest clarification, offer to re-explain
```

### Scenario 3: Buying Signal Detection
```
Customer: "How quickly can we get started?"
System should: Detect closing readiness, suggest commitment questions
```

## Success Metrics
- ✅ Speakers clearly identified in transcript
- ✅ Objections detected within 2 seconds
- ✅ Stage transitions accurate 90%+ of time
- ✅ Coaching prompts contextually relevant
- ✅ User can see who said what in real-time

## Critical Files to Modify
1. `main.cjs` - Audio source configuration
2. `vosk_server.py` - Speaker-aware transcription
3. `src/workers/audio-processor.js` - Channel separation
4. `src/components/LiveTalk.tsx` - UI display
5. `src/services/coaching/intelligent-prompt-builder.ts` - Contextual coaching
6. `src/services/coaching/SalesStageDetector.ts` - Stage detection
7. `src/services/websocket/websocket-client.ts` - Message handling

## Common Pitfalls to Avoid
- Don't mix audio streams before processing
- Ensure speaker tags persist through entire pipeline
- Handle cases where only one speaker is active
- Maintain backward compatibility with existing transcripts
- Test with various audio input configurations

## Notes for Next Session
- This is THE most critical feature for coaching effectiveness
- Without speaker separation, the AI cannot understand conversation context
- This enables all advanced coaching features (objection handling, stage progression, etc.)
- Must be implemented before visual timeline or other enhancements

## Related Documentation
- See `visual-stage-timeline-implementation.md` for next priority feature
- Reference `docs/RAG-PROCESSING-INSTRUCTIONS.md` for document processing
- Check LED breadcrumb ranges 6000-6099 for live coaching integration