# Audio Capture LED Breadcrumb Testing Guide

## LED Breadcrumb Ranges for Audio Capture

### WebSocket Audio Capture (7028-7099)
Testing guide for full conversation and microphone-only modes.

## Microphone-Only Mode LEDs

When testing microphone-only mode, you should see these LEDs in sequence:

1. **7028** - `capture_mode_selected` - Logs the mode selection
2. **7029** - `audio_mode_set` - Confirms mode is set
3. **7072** - `audio_capture_init` - Initialization starts
4. **7073** - `requesting_microphone_access` - Requesting mic permission
5. **7074** - `microphone_captured` - Mic stream acquired with track details
6. **7079** - `microphone_only_mode` - Confirms single-sided capture
7. **7084** - `microphone_only_fallback` - Fallback to mic only
8. **7085** - `single_audio_ready` - Single audio stream ready
9. **7086** - `final_stream_configured` - Stream configuration complete
10. **7087** - `volume_monitoring_callback` - Volume monitoring setup
11. **7088-7091** - AudioContext and AudioWorklet setup

## Full Conversation Mode LEDs

When testing full conversation mode, you should see these LEDs:

1. **7028** - `capture_mode_selected` - Mode selection (full-conversation)
2. **7029** - `audio_mode_set` - Mode confirmed
3. **7072** - `audio_capture_init` - Initialization with browser info
4. **7073** - `requesting_microphone_access` - Mic permission request
5. **7074** - `microphone_captured` - Mic stream details
6. **7075** - `full_conversation_mode_start` - Full mode initiated
7. **7076** - `requesting_display_media` - Tab audio request
8. **7077** - `tab_audio_captured` - Tab stream acquired (SUCCESS)
   - OR **8077** - Tab capture failure + **8078** - Fallback to mic only
9. **7080** - `audio_mixing_start` - Mixing streams begins
10. **7081** - `audio_sources_created` - Audio sources ready
11. **7082** - `streams_mixed` - Streams successfully mixed
12. **7083** - `full_conversation_ready` - Both sides ready
13. **7086** - `final_stream_configured` - Final configuration
14. **7087-7091** - Volume monitoring and AudioContext setup

## Cleanup LEDs (Stop Recording)

When stopping either mode:

1. **7092** - `audio_capture_stop_initiated` - Stop initiated with current state
2. **7093** - `audioworklet_stop_command` - AudioWorklet stop
3. **7094** - `audioworklet_disconnected` - AudioWorklet cleanup
4. **7095** - `stopping_all_streams` - Stream cleanup starting
5. **7096** - `combined_stream_track_stopped` - Combined tracks stopped
6. **7097** - `mic_track_stopped` - Mic tracks stopped
7. **7098** - `tab_audio_track_stopped` - Tab tracks stopped (if applicable)
8. **7099** - `audio_cleanup_complete` - All resources cleaned

## Error LEDs (8000 range)

Common error scenarios:

- **8077** - Tab audio capture failure (full conversation mode)
- **8078** - Tab audio fallback notification
- **8095** - Audio cleanup error
- **8096** - Audio cleanup error details

## Testing Commands

To test breadcrumbs in the browser console:

```javascript
// View all audio-related breadcrumbs
window.breadcrumbs.getRange(7028, 7099)

// View only errors
window.breadcrumbs.getRange(8077, 8096)

// Check specific operation
window.breadcrumbs.getAll().filter(b => b.data.operation === 'full_conversation_ready')

// Get quality score
window.breadcrumbs.getQualityScore()
```

## Expected Differences Between Modes

### Microphone-Only Mode
- Will NOT have LEDs: 7075, 7076, 7077, 7080, 7081, 7082, 7083
- Will have LED 7079 confirming microphone-only
- Will have LED 7085 for single audio ready

### Full Conversation Mode (Success)
- Will have ALL mixing LEDs: 7080, 7081, 7082, 7083
- Will NOT have fallback LEDs: 7084, 7085
- Will have tab stream cleanup LED 7098 when stopping

### Full Conversation Mode (Fallback)
- Will have error LEDs: 8077, 8078
- Will then follow microphone-only path
- Tab audio permissions may be denied by user

## Debugging Tips

1. **Missing Tab Audio**: Check LED 8077 for error details
2. **No Audio**: Check LED 7074 for microphone capture success
3. **Mixing Issues**: Check LEDs 7080-7082 for mixing pipeline
4. **Cleanup Issues**: Check LED 8095 for cleanup errors
5. **Permission Issues**: Check LEDs 7073-7074 for permission flow

## Performance Monitoring

Key LEDs for performance:
- **7086** - Shows final stream configuration and settings
- **7089** - Audio context latency information
- **7091** - AudioWorklet loading confirmation