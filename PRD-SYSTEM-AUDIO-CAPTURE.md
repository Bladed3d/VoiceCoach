# Product Requirements Document: System Audio Capture for VoiceCoach

## 1. Executive Summary

VoiceCoach needs to capture system audio from YouTube videos, Google Meet, Zoom, and other sources for real-time transcription and AI coaching. This must work reliably for thousands of users across Windows, macOS, and Linux without complex setup.

## 2. Problem Statement

Users need to capture and transcribe audio from:
- YouTube educational videos
- Google Meet/Zoom conference calls  
- Any browser tab or application audio
- Must work without installing virtual audio cables
- Must be simple for non-technical users

## 3. Technical Requirements

### 3.1 Core Requirements
- Capture system audio on Windows, macOS, Linux
- Real-time streaming to transcription service
- Low latency (<100ms)
- No user configuration required
- Fallback options for unsupported systems

### 3.2 Implementation Approach (from AI analysis)

Based on the provided analysis, the correct approach is:

#### Primary: Tauri with cpal Rust crate
```rust
// Use cpal crate for cross-platform audio
// Windows: WASAPI loopback
// macOS: ScreenCaptureKit  
// Linux: PulseAudio monitor
```

**Advantages:**
- Native performance
- Small bundle size (Tauri advantage)
- Direct integration with Rust audio processing
- Can feed directly to Whisper-rs for transcription

#### Fallback: Virtual Audio Device
For systems without native loopback:
1. Auto-detect available devices
2. Guide user to enable Stereo Mix (Windows)
3. Suggest VB-Cable installation if needed

## 4. Implementation Plan

### Phase 1: Fix Rust Toolchain (Immediate)
**Problem:** Current build fails with `can't find crate for std`
**Solution:** 
```bash
rustup default stable-msvc
rustup target add x86_64-pc-windows-msvc
```

### Phase 2: Implement cpal Integration (Based on AI Guidance)

#### File: `src-tauri/src/audio_capture.rs`
```rust
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use tauri::command;
use crossbeam_channel::{bounded, Sender};

pub struct AudioCapture {
    tx: Sender<Vec<f32>>,
}

impl AudioCapture {
    pub fn new() -> Self {
        let (tx, rx) = bounded(100);
        // Process audio in separate thread
        std::thread::spawn(move || {
            while let Ok(samples) = rx.recv() {
                // Send to transcription
                process_audio_chunk(samples);
            }
        });
        Self { tx }
    }

    pub fn start_system_capture(&self) -> Result<(), String> {
        let host = cpal::default_host();
        
        // Windows: Look for loopback device
        #[cfg(target_os = "windows")]
        let device = self.find_loopback_device(&host)?;
        
        // macOS: Use default input or virtual device
        #[cfg(target_os = "macos")]
        let device = self.find_system_audio_device(&host)?;
        
        let config = device.default_input_config()
            .map_err(|e| e.to_string())?;
            
        let tx = self.tx.clone();
        let stream = device.build_input_stream(
            &config.into(),
            move |data: &[f32], _| {
                tx.send(data.to_vec()).ok();
            },
            |err| eprintln!("Audio error: {}", err),
            None
        ).map_err(|e| e.to_string())?;
        
        stream.play().map_err(|e| e.to_string())?;
        Ok(())
    }
    
    #[cfg(target_os = "windows")]
    fn find_loopback_device(&self, host: &cpal::Host) -> Result<cpal::Device, String> {
        // Look for Stereo Mix, WASAPI Loopback, etc.
        host.input_devices()
            .map_err(|e| e.to_string())?
            .find(|d| {
                d.name().unwrap_or_default().to_lowercase()
                    .contains_any(&["stereo mix", "loopback", "what u hear"])
            })
            .ok_or("No loopback device found. Please enable Stereo Mix.".into())
    }
}

#[command]
pub fn start_audio_capture(mode: String) -> Result<String, String> {
    // Implementation based on mode
    Ok("Started".into())
}
```

### Phase 3: Frontend Integration

#### Clean API for Frontend:
```typescript
// In React component
import { invoke } from '@tauri-apps/api/tauri';

async function startSystemAudioCapture() {
  try {
    // Start capture
    await invoke('start_audio_capture', { mode: 'system' });
    
    // Listen for transcription results
    listen('transcription', (event) => {
      console.log('Transcribed:', event.payload);
    });
  } catch (error) {
    // Handle error - show user instructions
    showSetupGuide();
  }
}
```

### Phase 4: User Experience Flow

1. **First Run Detection:**
   - Check for available audio devices
   - Test system audio capture capability
   - Store results in user preferences

2. **Automatic Configuration:**
   - If loopback available → Use directly
   - If not → Guide through setup:
     - Windows: Enable Stereo Mix
     - macOS: Install BlackHole
     - Linux: Configure PulseAudio

3. **Fallback Chain:**
   ```
   Try native loopback → 
   Try virtual device → 
   Prompt for manual setup →
   Use microphone only mode
   ```

## 5. Testing Requirements

- Windows 10/11 with and without Stereo Mix
- macOS with and without virtual audio
- Chrome, Edge, Firefox compatibility
- YouTube, Google Meet, Zoom web
- CPU usage < 5%
- Memory usage < 100MB

## 6. Success Metrics

- 90% of users can capture system audio within 30 seconds
- Zero configuration for 50% of users
- <3 clicks to start capture
- Works with top 10 video/meeting platforms

## 7. Timeline

- Day 1: Fix Rust toolchain, implement basic cpal
- Day 2: Windows WASAPI loopback working
- Day 3: macOS/Linux support
- Day 4: Frontend integration
- Day 5: Testing and edge cases

## 8. Decision Points

**Why Tauri over Electron:**
- Smaller bundle (10MB vs 150MB)
- Native Rust audio processing
- Better performance for real-time audio
- Direct integration with transcription

**Why cpal over other solutions:**
- Proven cross-platform support
- Active maintenance
- Used in production audio apps
- Native OS API access

## 9. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Rust compilation issues | Provide pre-built binaries |
| No loopback on user system | Virtual audio guide + fallback |
| Browser security restrictions | Use native Tauri, not web APIs |
| Performance issues | Implement chunked processing |

## 10. References

- cpal documentation: https://docs.rs/cpal
- Tauri audio examples: GitHub examples
- WASAPI loopback: Microsoft docs
- The AI analysis provided by user (integrated above)