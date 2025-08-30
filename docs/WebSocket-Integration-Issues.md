# VoiceCoach V2 - WebSocket Integration Issues & Solutions

**Status**: In Progress  
**Priority**: Critical  
**Assigned**: Claude Code  
**Date**: 2025-08-28

## Problem Summary

VoiceCoach V2's core transcription functionality is broken due to WebSocket integration issues between the Electron frontend and Python Flask-SocketIO backend. Users cannot start transcription sessions, and debugging is hampered by DevTools failures.

## Current Problems

### 1. **WebSocket Connection Failures** (Critical)
- **Issue**: Start button fails to connect to transcription service
- **Symptoms**: 
  - No live transcription appearing in UI
  - Connection timeouts in console
  - LED 8011 error breadcrumb triggered
- **Root Cause**: Socket.IO client configured with `transports: ['websocket']` only, blocking polling fallback
- **Files Affected**: `src/services/websocket-client.ts:47`, `src/components/SplitViewCoaching.tsx:175`
- **Impact**: Complete transcription functionality failure

### 2. **DevTools White Screen** (High)
- **Issue**: Electron DevTools show white screen, preventing debugging
- **Symptoms**: 
  - Cannot see console errors
  - JavaScript debugging impossible
  - V8 context appears crashed
- **Root Cause**: V8 context crashes during renderer process initialization
- **Files Affected**: `main.cjs:34` (DevTools opening logic)
- **Impact**: No error visibility, making troubleshooting nearly impossible

### 3. **Live Transcription Pipeline Broken** (Critical)
- **Issue**: Audio capture → transcription → UI display chain failing
- **Symptoms**: 
  - Microphone permissions unclear
  - No real-time updates in transcription panel
  - Python server starts but no data flow
- **Root Cause**: Multiple failure points in audio pipeline without proper error handling
- **Files Affected**: `src/services/vosk-websocket-server.py`, `src/components/SplitViewCoaching.tsx`
- **Impact**: Core product functionality completely non-functional

## Research Analysis Results

**Research Agent Used**: VoiceCoach V2 Research Specialist  
**Research File**: `.claude/agents/researcher.md`

**Key Findings**:
- Socket.IO + Electron + Flask-SocketIO is a proven, well-documented pattern
- Current implementation has configuration issues, not architectural problems
- Technology stack is sound, requires specific fixes not replacement
- All identified issues have validated solutions from production examples

## Solution Deployment Plan

### **Phase 1: Critical Connection Fix** (Priority 1)
**Timeline**: 2-4 hours  
**Target**: Establish working WebSocket connection between Electron and Python server

**Implementation Changes**:

```typescript
// src/services/websocket-client.ts - Line 46-49
// BEFORE:
this.socket = io(this.serverUrl, {
  transports: ['websocket'],  // ❌ Blocks polling fallback
  timeout: 5000
});

// AFTER:
this.socket = io(this.serverUrl, {
  transports: ['polling', 'websocket'], // ✅ Add polling fallback
  timeout: 10000,                       // ✅ Increase timeout
  reconnection: true,                   // ✅ Enable auto-reconnection
  reconnectionAttempts: 5,              // ✅ Limit attempts
  reconnectionDelay: 1000               // ✅ Delay between attempts
});
```

**Expected Result**: WebSocket client connects successfully to Python server, establishes bidirectional communication

### **Phase 2: DevTools Recovery** (Priority 2)
**Timeline**: 1-2 hours  
**Target**: Restore debugging capability and error visibility

**Implementation Changes**:

```javascript
// main.cjs - Line 34-37
// BEFORE:
if (process.env.NODE_ENV === 'development') {
  mainWindow.loadURL('http://localhost:5175');
  mainWindow.webContents.openDevTools(); // ❌ Immediate opening causes crashes
}

// AFTER:
if (process.env.NODE_ENV === 'development') {
  mainWindow.loadURL('http://localhost:5175');
  
  // ✅ Delayed DevTools opening with crash recovery
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      mainWindow.webContents.openDevTools();
    }, 1000);
  });
  
  // ✅ Add crash recovery
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process crashed:', details);
    if (details.reason === 'crashed') {
      mainWindow.reload();
    }
  });
}
```

**Expected Result**: DevTools open successfully, console errors visible for debugging

### **Phase 3: Audio Pipeline Robustness** (Priority 3)
**Timeline**: 3-4 hours  
**Target**: Reliable microphone → transcription → UI data flow

**Implementation Changes**:
- Add microphone permission handlers in Electron main process
- Implement connection health monitoring in WebSocket client
- Add error boundaries in React components for graceful failure handling
- Enable graceful degradation on connection/audio failures

**Expected Result**: Live transcription appears in UI in real-time with <200ms latency

## Success Metrics

1. **Connection Success**: WebSocket client connects to server within 5 seconds
2. **DevTools Functional**: Console errors visible, JavaScript debugging possible  
3. **Transcription Flow**: Audio input → Python processing → UI display working end-to-end
4. **Error Recovery**: System recovers gracefully from connection drops or audio issues
5. **LED Breadcrumbs**: All success breadcrumbs (6000-6099 range) lighting up correctly

## Risk Assessment

- **Implementation Risk**: Low - Research identified proven solutions
- **Compatibility Risk**: Low - Socket.IO + Electron is well-documented pattern
- **Timeline Risk**: Medium - 6-8 hours total implementation time
- **Testing Risk**: Low - Can verify each phase incrementally

## Testing Plan

### Phase 1 Testing
1. Start Python WebSocket server manually
2. Open Electron app and click start transcription
3. Verify WebSocket connection established (LED 7011 should light)
4. Confirm no connection timeout errors

### Phase 2 Testing  
1. Open Electron app in development mode
2. Verify DevTools open without white screen
3. Check console for error messages visibility
4. Test JavaScript debugging functionality

### Phase 3 Testing
1. Complete end-to-end transcription flow
2. Speak into microphone and verify live transcription appears
3. Test connection recovery after network interruption
4. Validate coaching suggestions trigger correctly

## Dependencies

- **Python WebSocket Server**: Must be running on localhost:5000
- **Microphone Permissions**: System-level audio access required
- **Electron Development Environment**: Node.js and npm dependencies installed

## Files to Modify

1. `src/services/websocket-client.ts` - Connection configuration fixes
2. `main.cjs` - DevTools opening and crash recovery
3. `src/components/SplitViewCoaching.tsx` - Error handling improvements
4. `src/services/vosk-websocket-server.py` - Health monitoring additions

## Next Steps

1. ✅ **Documentation Complete** - This file created
2. ⏳ **Phase 1 Implementation** - Socket.IO connection fixes
3. ⏳ **Phase 2 Implementation** - DevTools recovery
4. ⏳ **Phase 3 Implementation** - Audio pipeline robustness
5. ⏳ **Integration Testing** - End-to-end functionality validation

---

**Note**: This analysis follows the research methodology defined in `.claude/agents/researcher.md` and implements the technology validation framework to ensure all solutions are based on proven, production-ready patterns.