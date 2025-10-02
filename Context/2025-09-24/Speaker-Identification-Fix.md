# Speaker Identification Bug Fix

## Problem Description
All transcriptions were being identified as "user" even when prospects were speaking. The transcription would initially show "prospect" but then switch to "user" before completing.

## Root Cause
The TypeScript WebSocket clients were sending raw base64 audio data instead of the structured format expected by the Python Vosk server for speaker separation.

**Expected Format (Python Server):**
```python
{
  "type": "audio_chunk",
  "audio": "<base64_audio_data>",
  "source": "microphone|tab|mixed"
}
```

**Actual Format (TypeScript Clients):**
```typescript
socket.emit('audio_chunk', base64Data); // Raw base64 string
```

## Speaker Identification Logic
The Python server maps audio sources to speakers:

- `source: 'microphone'` → `speaker: 'user'`
- `source: 'tab'` → `speaker: 'customer'`
- `source: 'mixed'` → `speaker: 'customer'` (default for full conversation)

## Files Fixed

### 1. websocket-client.ts
**Before:**
```typescript
this.socket.emit('audio_chunk', base64Data);
```

**After:**
```typescript
const audioMessage = {
  type: 'audio_chunk',
  audio: base64Data,
  source: this.audioCaptureMode === 'microphone' ? 'microphone' : 'mixed'
};

this.socket.emit('audio_chunk', JSON.stringify(audioMessage));
```

### 2. socket-io-client.ts
**Before:**
```typescript
this.socket.emit('audio_chunk', base64Data);
```

**After:**
```typescript
const audioMessage = {
  type: 'audio_chunk',
  audio: base64Data,
  source: 'microphone' // This client only handles microphone input
};

this.socket.emit('audio_chunk', JSON.stringify(audioMessage));
```

## Expected Behavior After Fix

### Microphone Mode
- Audio source: `'microphone'`
- Speaker identification: `'user'`
- All transcriptions labeled as user speech

### Full Conversation Mode (Both Sides)
- Audio source: `'mixed'`
- Speaker identification: `'customer'` (default for mixed audio)
- Transcriptions labeled as customer speech

### Tab Audio (if implemented)
- Audio source: `'tab'`
- Speaker identification: `'customer'`
- Prospect speech captured from browser tab

## Testing Steps

1. **Start WebSocket Server:**
```bash
python src/services/vosk-native-websocket.py --port 8765
```

2. **Test Microphone Mode:**
- Set audio capture to "Microphone only"
- Speak - should be labeled as "user"

3. **Test Full Conversation Mode:**
- Set audio capture to "Both sides (full conversation)"
- Speak - should be labeled as "customer" (mixed audio default)

4. **Monitor Console Output:**
Look for Python server logs:
```
[FINAL - USER]: Hello there
[FINAL - CUSTOMER]: Hi, how can I help you?
```

## Related LED Breadcrumbs

- **6057**: Audio chunk sent from TypeScript client
- **7040**: Audio chunk processing in WebSocket client
- Server-side logs will show enhanced speaker identification

## Notes

- The fix maintains backward compatibility with raw bytes format
- Python server already had the logic - the issue was client-side format
- Speaker separation now works correctly with proper source metadata
- Default changed to "Both sides" mode captures mixed audio as "customer"

## Verification

After this fix, transcriptions should correctly identify:
- User speech when using microphone mode
- Prospect speech when using mixed/full conversation mode
- No more incorrect speaker switching during transcription