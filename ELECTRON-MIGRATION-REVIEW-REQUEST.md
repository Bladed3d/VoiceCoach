# VoiceCoach Desktop App - Architecture Review Request

## Current Situation Summary

### The Problem
We've been blocked for **2+ weeks** trying to build VoiceCoach as a Tauri desktop application due to a Rust compiler Internal Compiler Error (ICE) that we cannot resolve.

### Technical Blocking Issue
- **Error**: Rust compiler ICE with windows-sys crate
- **Symptom**: "scalar size mismatch: expected 8590430929 bytes but got 8 bytes"
- **Attempts**: Tried multiple Rust versions (1.75, 1.80, 1.82, 1.89) and windows-sys versions (0.48, 0.52, 0.59, 0.60)
- **Status**: No working combination found despite extensive research

### Core Requirements
VoiceCoach is an AI-powered sales coaching app that MUST:
1. **Capture system audio** from YouTube videos, Google Meet, Zoom calls, etc.
2. **Process audio in real-time** with transcription and AI coaching
3. **Work as both desktop app AND browser app** from same codebase
4. **Use Claude directly** for Phase 1 analysis (no external APIs)
5. **Use local Ollama** for Phase 2 enhancement

### Why This Matters
- **Browser limitations**: Web apps can only access microphone, NOT system audio
- **Use case**: Sales teams need to record training videos, practice calls, and get real-time coaching
- **Desktop required**: System audio capture is impossible from browser

### Discovery from August 2025
We found that Tauri requires **500+ lines of complex Rust code** to capture system audio (Windows WASAPI implementation), while Electron does it in **10 lines**:

```javascript
// Electron - Complete system audio capture
const { desktopCapturer } = require('electron')
const sources = await desktopCapturer.getSources({ 
  types: ['screen'], 
  audio: true 
})
```

## The Electron Migration PRD

Below is the complete PRD that was created but not yet implemented. We need your review on whether this is the right approach given our 2-week blocking issue with Tauri.

---

# VoiceCoach Desktop Migration PRD
**Product Requirements Document**  
**Version**: 1.0  
**Date**: January 19, 2025  
**Status**: VALIDATED & READY FOR IMPLEMENTATION

---

## Executive Summary

This PRD defines the migration of VoiceCoach from a browser-only application to a cross-platform desktop application using Electron, enabling system audio capture from YouTube, Google Meet, and other sources while preserving all existing browser functionality.

**Key Achievement**: Enable recording of ANY audio playing on the user's computer, not just microphone input.

---

## 🎯 Product Goals

### Primary Objectives
1. **Capture System Audio**: Record audio from YouTube videos, Google Meet calls, Zoom meetings, and any application
2. **Maintain Browser App**: Keep existing browser version fully functional at current URL
3. **Cross-Platform Support**: Work identically on Windows and Mac desktops
4. **Single Codebase**: One codebase serving both browser and desktop versions

### Success Metrics
- ✅ System audio capture working on Windows 10+ 
- ✅ System audio capture working on macOS 11+ (with virtual audio driver)
- ✅ Zero degradation of browser app functionality
- ✅ <1 week implementation time
- ✅ <100MB installer size

---

## 🔧 Technical Architecture

### Technology Stack
```
Desktop Framework: Electron 28.x
Frontend: React 18 + Vite (existing)
Audio Processing: Web Audio API + desktopCapturer
RAG System: Existing Ollama + qwen2.5 (unchanged)
Deployment: electron-builder for desktop, Vercel for web
```

### Architecture Overview
```
┌─────────────────────────────────────────────────────┐
│              VoiceCoach Application                  │
├─────────────────────────────────────────────────────┤
│                 React Frontend                       │
│         (Shared between Browser & Desktop)           │
├─────────────────────────────────────────────────────┤
│              Platform Detection Layer                │
│    if (window.electron) { /* desktop */ }           │
│    else { /* browser */ }                           │
├─────────────────────────────────────────────────────┤
│   Browser Runtime    │    Electron Runtime          │
│   - Microphone only  │    - Microphone              │
│   - Web APIs         │    - System Audio            │
│   - Vercel hosting   │    - desktopCapturer API     │
└─────────────────────────────────────────────────────┘
```

---

## 📋 Functional Requirements

### FR1: System Audio Capture
**Priority**: P0 - Critical

**Desktop Mode**:
- MUST capture all system audio output
- MUST capture specific application audio (YouTube browser tab, Google Meet)
- MUST mix microphone + system audio streams
- MUST work without user selecting audio sources manually

**Implementation**:
```javascript
// Main process
const { desktopCapturer } = require('electron')

async function getSystemAudio() {
  const sources = await desktopCapturer.getSources({ 
    types: ['screen'], 
    audio: true 
  })
  return sources[0] // Primary display with audio
}
```

### FR2: Feature Detection
**Priority**: P0 - Critical

**Requirements**:
- MUST detect if running in Electron vs browser
- MUST enable/disable features based on platform
- MUST provide clear UI indicators of available features

**Implementation**:
```javascript
// Renderer process
const isDesktop = window.electron !== undefined
const canCaptureSystem = isDesktop

if (isDesktop) {
  // Show system audio options
} else {
  // Show microphone-only options
}
```

### FR3: Existing Feature Preservation
**Priority**: P0 - Critical

All current features MUST work identically:
- Real-time transcription
- AI coaching analysis
- Knowledge base integration
- Document processing
- Coaching metrics
- User authentication

---

## 🏗️ Implementation Plan

### Phase 1: Electron Shell (Day 1-2)
1. Initialize Electron project structure
2. Create main process with BrowserWindow
3. Load existing React app
4. Implement preload script for IPC
5. Test basic desktop window

### Phase 2: Audio Integration (Day 3-4)
1. Implement desktopCapturer in main process
2. Create IPC channels for audio streams
3. Add audio source selector UI
4. Test system audio capture
5. Mix microphone + system streams

### Phase 3: Platform Detection (Day 5)
1. Add window.electron detection
2. Conditional UI rendering
3. Feature flags for desktop-only features
4. Update coaching components

### Phase 4: Packaging & Distribution (Day 6-7)
1. Configure electron-builder
2. Create Windows installer (.exe)
3. Create macOS installer (.dmg)
4. Auto-update configuration
5. Code signing setup

---

## 🚀 Migration Strategy

### Step 1: Parallel Development
- Keep existing browser app running
- Develop Electron wrapper separately
- No changes to core React components initially

### Step 2: Integration
- Add platform detection to React app
- Implement conditional audio sources
- Test both modes thoroughly

### Step 3: Deployment
- Deploy browser version to Vercel (unchanged)
- Release desktop installers via GitHub Releases
- Maintain both versions from single codebase

---

## ⚠️ Risk Assessment

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Audio latency | Medium | Use native audio APIs, optimize buffer sizes |
| App size | Low | Use electron-builder optimization |
| Cross-platform audio | Medium | Test on multiple OS versions |
| IPC performance | Low | Use efficient serialization |

### Business Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| User adoption | Medium | Clear value prop for desktop features |
| Support burden | Medium | Comprehensive documentation |
| Update management | Low | Auto-updater implementation |

---

## 📊 Success Criteria

### Week 1 (Implementation)
- [ ] Electron app launches with existing UI
- [ ] System audio capture working
- [ ] Platform detection functioning
- [ ] Both browser and desktop modes work

### Week 2 (Polish & Release)
- [ ] Installers created for Windows/Mac
- [ ] Auto-updater configured
- [ ] Documentation complete
- [ ] Beta testing with 5 users

### Month 1 (Post-Launch)
- [ ] 100+ desktop app downloads
- [ ] <5 critical bugs
- [ ] 80% user satisfaction
- [ ] System audio used by 50% of desktop users

---

## 🔄 Alternative Considered: Tauri

**Why Not Tauri**:
- No built-in system audio capture
- Requires 500+ lines of Rust code for Windows WASAPI
- Complex cross-platform audio handling
- 6-8 weeks development vs 1 week for Electron
- Current blocking issue: Rust compiler ICE preventing builds

**Tauri Advantages Lost**:
- Smaller bundle size (10MB vs 80MB)
- Better performance (negligible for our use case)
- Native OS integration (not needed for VoiceCoach)

**Decision**: Electron's proven audio capabilities and 10x faster implementation outweigh Tauri's performance benefits.

---

## Questions for Review

1. **Architecture Decision**: Given the 2-week Rust/Tauri blocking issue, should we proceed with Electron migration?

2. **Timeline**: Is 1 week realistic for the Electron migration, or should we plan for 2 weeks?

3. **Alternative Solutions**: Are there any other approaches we haven't considered that could:
   - Fix the Rust compiler ICE issue?
   - Enable system audio capture without Electron?
   - Work around the current limitations?

4. **Risk Assessment**: Are there any risks we haven't identified with the Electron approach?

5. **Feature Scope**: Should we implement all features in week 1, or start with MVP (just system audio) and iterate?

6. **Testing Strategy**: What testing approach would you recommend for ensuring both browser and desktop modes work correctly?

## Additional Context

- **Frontend Status**: React app works perfectly, builds successfully
- **Current Block**: Only the Tauri/Rust backend compilation is failing
- **User Need**: Sales teams urgently need system audio capture for coaching on recorded calls
- **Time Pressure**: Already 2 weeks delayed due to Rust issues

Please provide your assessment of this migration plan and any recommendations for moving forward.