# Product Requirements Document: Vosk Real-Time Transcription Integration
**VoiceCoach Desktop Application**  
**Version**: 1.0  
**Date**: January 20, 2025  
**Status**: Ready for Implementation

---

## 1. Executive Summary

### 1.1 Problem Statement
The VoiceCoach application successfully migrated from web to Tauri desktop architecture, but lost transcription functionality in the process. The web version relied on browser-native `webkitSpeechRecognition` API, which is unavailable in Tauri's WebView environment. Currently:
- ❌ No transcriptions appear in the right panel
- ❌ TranscriptionManager exists but all methods are TODOs
- ❌ Event emission from Rust to frontend is unimplemented
- ✅ Audio capture works
- ✅ Ollama AI coaching works (left panel)

### 1.2 Solution Overview
Implement Vosk, an offline open-source speech recognition library, directly in the Rust backend. This provides:
- Real-time streaming transcription with partial results
- Complete offline operation (no API costs)
- Cross-platform compatibility
- Direct integration with existing audio pipeline

### 1.3 Expected Outcomes
- Transcriptions appear in right panel within 500ms of speech
- Continuous partial results as user speaks
- Zero external dependencies or API costs
- Seamless integration with existing Ollama coaching pipeline

---

## 2. Technical Requirements

### 2.1 Core Dependencies
```toml
# src-tauri/Cargo.toml additions
[dependencies]
vosk = "0.3.1"
tokio = { version = "1", features = ["full"] }
crossbeam-channel = "0.5"  # Already present
cpal = "0.15.3"  # Already present
bytemuck = "1.14"  # For audio format conversion
```

### 2.2 Vosk Model Requirements
- **Initial Model**: vosk-model-small-en-us-0.15 (40MB)
- **Production Model**: vosk-model-en-us-0.22 (1.8GB for higher accuracy)
- **Storage Location**: `src-tauri/models/`
- **Loading Strategy**: Lazy load on first transcription request

### 2.3 Audio Processing Requirements
- **Sample Rate**: 16kHz (Vosk optimal)
- **Format**: 16-bit PCM mono
- **Buffer Size**: 1024 samples (64ms chunks)
- **Latency Target**: <200ms for partial, <500ms for final

### 2.4 Event System Requirements
- **Event Name**: `voice_transcription` (matches frontend expectations)
- **Payload Structure**:
```rust
#[derive(Clone, Serialize)]
struct TranscriptionEvent {
    text: String,
    is_final: bool,
    confidence: f32,
    timestamp: u64,
    is_user: bool,  // true for user, false for prospect
}
```

---

## 3. Technical Architecture

### 3.1 Data Flow
```
Microphone Input → CPAL Audio Capture → Audio Buffer
                                            ↓
                                    Format Conversion (f32→i16)
                                            ↓
                                      Vosk Recognizer
                                            ↓
                                    Transcription Results
                                            ↓
                                      Tauri Event Emit
                                            ↓
                                    Frontend Display (Right Panel)
                                            ↓
                                    Ollama Coaching (Left Panel)
```

### 3.2 Component Integration

#### 3.2.1 Modify `src-tauri/src/transcription_service.rs`
Replace TODO implementations with:
```rust
pub struct TranscriptionManager {
    config: TranscriptionConfig,
    audio_buffer: Arc<Mutex<AudioBuffer>>,
    is_active: Arc<Mutex<bool>>,
    vosk_model: Arc<Model>,
    recognizer: Arc<Mutex<Recognizer>>,
    app_handle: AppHandle,  // ADD THIS
    // ... existing fields
}

impl TranscriptionManager {
    pub fn new(config: TranscriptionConfig, app_handle: AppHandle) -> Result<Self> {
        let model_path = "models/vosk-model-small-en-us-0.15";
        let model = Model::new(model_path)?;
        let mut recognizer = Recognizer::new(&model, 16000.0)?;
        recognizer.set_partial_words(true);
        recognizer.set_words(true);
        
        // ... initialization
    }
    
    fn emit_transcription_event(&self, result: TranscriptionResult) -> Result<()> {
        let event = TranscriptionEvent {
            text: result.text,
            is_final: true,
            confidence: result.confidence,
            timestamp: result.timestamp,
            is_user: result.is_user,
        };
        
        self.app_handle.emit_all("voice_transcription", event)?;
        Ok(())
    }
}
```

#### 3.2.2 Modify `src-tauri/src/audio_processing.rs`
Connect audio stream to transcription:
```rust
// In process_audio_chunk method
fn process_audio_chunk(&mut self, audio_data: Vec<f32>) -> Result<()> {
    // Convert f32 to i16 for Vosk
    let i16_data: Vec<i16> = audio_data.iter()
        .map(|&sample| (sample * i16::MAX as f32) as i16)
        .collect();
    
    // Send to transcription manager
    if let Some(ref transcription_manager) = self.transcription_manager {
        transcription_manager.process_audio(&i16_data)?;
    }
    
    // ... existing processing
}
```

#### 3.2.3 Frontend Integration
The frontend already listens for events, but needs Tauri event handling:
```typescript
// src/components/TranscriptionPanel.tsx
import { listen } from '@tauri-apps/api/event';

useEffect(() => {
    const unlisten = listen('voice_transcription', (event) => {
        const { text, is_final, confidence, timestamp, is_user } = event.payload;
        
        if (is_final) {
            addTranscription({
                id: Date.now().toString(),
                text,
                timestamp,
                isUser: is_user,
                confidence
            });
        } else {
            setCurrentInterimText(text);
        }
    });
    
    return () => {
        unlisten.then(fn => fn());
    };
}, []);
```

---

## 4. Implementation Phases

### Phase 1: Core Vosk Integration (3-4 days)
**Objective**: Get Vosk working in isolation

**Tasks**:
1. Add Vosk dependencies to Cargo.toml
2. Download and integrate Vosk model
3. Create standalone Vosk test module
4. Implement audio format conversion (f32→i16)
5. Test transcription with WAV file

**Success Criteria**:
- Vosk loads model successfully
- Test WAV file transcribes correctly
- Memory usage acceptable (<150MB)

**Files to Modify**:
- `src-tauri/Cargo.toml`
- `src-tauri/src/transcription_service.rs`
- `src-tauri/build.rs` (for Vosk library linking)

---

### Phase 2: Event System Connection (2-3 days)
**Objective**: Connect Vosk to Tauri event system

**Tasks**:
1. Add AppHandle to TranscriptionManager
2. Implement emit_transcription_event method
3. Wire up transcription manager in main.rs
4. Test event emission with mock data
5. Verify frontend receives events

**Success Criteria**:
- Events emit from Rust to frontend
- Frontend console shows received events
- LED breadcrumbs track event flow

**Files to Modify**:
- `src-tauri/src/main.rs`
- `src-tauri/src/transcription_service.rs`
- `src/components/TranscriptionPanel.tsx`

---

### Phase 3: Audio Pipeline Integration (2-3 days)
**Objective**: Connect live audio to transcription

**Tasks**:
1. Integrate with existing CPAL audio capture
2. Implement audio buffering strategy
3. Handle continuous streaming
4. Add partial result support
5. Coordinate with Ollama pipeline

**Success Criteria**:
- Live microphone audio transcribes
- Partial results appear immediately
- Final results within 500ms
- No audio dropout or stuttering

**Files to Modify**:
- `src-tauri/src/audio_processing.rs`
- `src-tauri/src/audio_thread.rs`

---

### Phase 4: Testing & Optimization (2-3 days)
**Objective**: Ensure production readiness

**Tasks**:
1. Test with test-audio/sales-call-sample.wav
2. Performance profiling and optimization
3. Memory leak detection
4. Cross-platform testing (Windows focus)
5. Error recovery testing

**Success Criteria**:
- All TESTING-INSTRUCTIONS.md criteria pass
- CPU usage <15% during transcription
- No memory leaks over 1-hour sessions
- Graceful handling of audio interruptions

---

## 5. Agent Assignments

### 5.1 Lead Programmer Agent
**Responsibility**: Core Vosk integration and Rust implementation

**Tasks**:
1. Implement Vosk integration in transcription_service.rs
2. Create audio format conversion utilities
3. Set up model loading and management
4. Implement event emission system

**Deliverables**:
- Working Vosk transcription module
- Audio format conversion utilities
- Event emission implementation
- Unit tests for transcription service

**CRITICAL**: Must add debug breadcrumbs BEFORE starting any implementation

---

### 5.2 Backend Engineer Agent
**Responsibility**: Audio pipeline and system integration

**Tasks**:
1. Connect CPAL audio stream to Vosk
2. Implement buffering strategy
3. Handle threading and async operations
4. Optimize performance

**Deliverables**:
- Audio pipeline integration
- Thread-safe audio processing
- Performance optimization
- System resource monitoring

---

### 5.3 Error Correction Agent
**Responsibility**: Testing and debugging

**Tasks**:
1. Execute TESTING-INSTRUCTIONS.md protocol
2. Monitor LED breadcrumbs for failures
3. Fix identified issues
4. Validate fixes with regression tests

**Deliverables**:
- Test execution reports
- Bug fixes
- Performance benchmarks
- Validation results

---

## 6. API Interfaces

### 6.1 Rust Commands
```rust
#[tauri::command]
async fn start_transcription(app: AppHandle) -> Result<String, String>

#[tauri::command]
async fn stop_transcription() -> Result<String, String>

#[tauri::command]
async fn get_transcription_status() -> Result<TranscriptionStatus, String>
```

### 6.2 Frontend Events
```typescript
// Listening for transcriptions
listen('voice_transcription', (event: {
    payload: {
        text: string;
        is_final: boolean;
        confidence: number;
        timestamp: number;
        is_user: boolean;
    }
}) => void)

// Error events
listen('transcription_error', (event: {
    payload: {
        error: string;
        code: number;
    }
}) => void)
```

---

## 7. Success Criteria

### 7.1 Functional Requirements
- ✅ Transcriptions appear in right panel
- ✅ Partial results show as user speaks
- ✅ Final results within 500ms of speech end
- ✅ Integration with existing Ollama coaching
- ✅ Works offline without internet

### 7.2 Performance Requirements
- Transcription accuracy: >85% on clean audio
- Partial result latency: <200ms
- Final result latency: <500ms
- CPU usage: <15% during active transcription
- Memory usage: <150MB additional RAM
- Model load time: <3 seconds

### 7.3 Quality Requirements
- No crashes during 1-hour sessions
- Graceful degradation on poor audio
- Clear error messages for users
- Automatic recovery from audio interruptions
- Consistent performance across platforms

---

## 8. Risk Mitigation

### 8.1 Model Size and Loading
**Risk**: 40MB model increases app size
**Mitigation**: 
- Download model on first use
- Provide progress indicator
- Cache model locally
- Option for smaller/larger models

### 8.2 Platform Audio Differences
**Risk**: CPAL behavior varies by OS
**Mitigation**:
- Test on Windows primarily
- Implement platform-specific fallbacks
- Use conservative audio settings
- Provide manual device selection

### 8.3 Performance Impact
**Risk**: Vosk uses significant CPU
**Mitigation**:
- Use separate thread for transcription
- Implement audio buffering
- Throttle recognition frequency
- Provide quality/performance slider

### 8.4 Integration Complexity
**Risk**: Complex integration with existing systems
**Mitigation**:
- Implement in isolated module first
- Extensive LED breadcrumb debugging
- Incremental integration phases
- Maintain fallback to non-transcription mode

---

## 9. Testing Requirements

### 9.1 Unit Tests
```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_vosk_model_loading() { }
    
    #[test]
    fn test_audio_format_conversion() { }
    
    #[test]
    fn test_event_emission() { }
    
    #[test]
    fn test_partial_results() { }
}
```

### 9.2 Integration Tests
1. Test with sales-call-sample.wav
2. Live microphone test (5 minutes)
3. Extended session test (30 minutes)
4. Ollama coordination test
5. Frontend display test

### 9.3 Performance Benchmarks
- Model load time
- Transcription latency (partial and final)
- CPU usage during transcription
- Memory usage over time
- Event emission frequency

### 9.4 Platform Testing
- Windows 11 (primary)
- Windows 10
- macOS (if available)
- Linux (if available)

---

## 10. Documentation Requirements

### 10.1 Technical Documentation
- Vosk integration architecture
- Audio pipeline flow diagram
- Event system documentation
- API reference
- Troubleshooting guide

### 10.2 User Documentation
- Microphone setup guide
- Language model selection
- Performance tuning options
- Common issues and solutions

---

## 11. Timeline

**Total Duration**: 10-12 days

**Week 1**:
- Days 1-3: Phase 1 - Core Vosk Integration
- Days 4-5: Phase 2 - Event System Connection

**Week 2**:
- Days 6-7: Phase 3 - Audio Pipeline Integration
- Days 8-9: Phase 4 - Testing & Optimization
- Days 10-12: Buffer for issues and polish

---

## 12. Definition of Done

The Vosk transcription integration is complete when:

1. ✅ All unit tests pass
2. ✅ Integration tests show >85% accuracy
3. ✅ Performance meets all criteria
4. ✅ TESTING-INSTRUCTIONS.md validation passes
5. ✅ Documentation is complete
6. ✅ Code review completed
7. ✅ No critical bugs in 1-hour test session
8. ✅ Transcriptions appear reliably in right panel
9. ✅ Ollama coaching continues to work
10. ✅ User can have natural conversation with real-time transcription

---

## Appendix A: File Structure

```
voicecoach-app/
├── src-tauri/
│   ├── Cargo.toml (ADD: vosk dependency)
│   ├── build.rs (ADD: Vosk library linking)
│   ├── models/
│   │   └── vosk-model-small-en-us-0.15/ (NEW)
│   ├── src/
│   │   ├── main.rs (MODIFY: Wire up transcription)
│   │   ├── transcription_service.rs (MODIFY: Implement Vosk)
│   │   ├── audio_processing.rs (MODIFY: Connect to Vosk)
│   │   └── audio_thread.rs (MODIFY: Stream to transcription)
│   └── target/
├── src/
│   ├── components/
│   │   └── TranscriptionPanel.tsx (MODIFY: Tauri events)
│   └── hooks/
│       └── useCoachingOrchestrator.ts (MODIFY: Handle transcriptions)
└── public/
    └── test-audio/
        └── sales-call-sample.wav (TEST WITH THIS)
```

---

## Appendix B: LED Breadcrumb Ranges

Allocate LED range 7000-7999 for Vosk transcription:
- 7000-7099: Model loading and initialization
- 7100-7199: Audio format conversion
- 7200-7299: Vosk recognition processing
- 7300-7399: Event emission
- 7400-7499: Frontend reception
- 7500-7599: Error handling
- 7900-7999: Performance monitoring

---

**END OF PRD**

*This PRD provides a complete roadmap for implementing Vosk-based transcription in VoiceCoach, focusing on robust, production-ready implementation rather than quick fixes.*