The last Claude kept coding rocket ships instead of simple bicycles. Create simple solutions and collaborate with me. Think of me as another AI that can add value. I have ideas that sometimes are better.

**IMPORTANT**: NEVER CODE FALLBACK or default selections if the process or feature offers a user selection. Always FAIL LOUDLY during development so we can see what needs fixing!

# VoiceCoach V2 LED Breadcrumb System Monitoring Guide

## Overview
VoiceCoach V2 has an extensive LED breadcrumb system for debugging and monitoring. You CAN and SHOULD monitor this system directly when working on the project.

## How to Monitor LED Activity

### Method 1: Development Console Output (Primary)
The LED breadcrumbs log directly to the development server console output. To monitor:

```bash
# Check for running npm dev process
BashOutput tool with the active dev server bash_id
```

Look for LED output in this format:
- **Success**: `🎵 LED [number]: [name] - [data] [component]_[id]`
- **Failure**: `❌ LED [number] FAILED [component]: [name] [error]`

### Method 2: Use VoiceCoach V2 Tester Agent
Deploy the VoiceCoach V2 Tester agent to connect to the running Electron app:

```
Task tool with subagent_type: "VoiceCoach V2 Tester"
Description: "Monitor LED breadcrumb activity"
Prompt: "Connect to the running VoiceCoach V2 Electron app and monitor LED breadcrumb system activity. Check console output for LED breadcrumbs and use window.debug.breadcrumbs commands to get current status."
```

This agent can:
- Connect to localhost:5175 (Vite dev server)
- Access browser console with DevTools
- Run debug commands like `window.debug.breadcrumbs.getAll()`
- Monitor real-time LED activity

### Method 3: Direct Process Monitoring
Check for running Electron processes:

```bash
# Windows
tasklist | findstr "electron"

# Look for multiple electron.exe processes (typically 3-5 processes)
```

## LED Range Reference

The LED system uses specific ranges for different operations:

- **1000-1099**: APP_LIFECYCLE (startup, window management)
- **2000-2099**: DOCUMENT_OPERATIONS (file upload, validation)
- **3000-3099**: RAG_PHASE_1A (pure analysis)
- **4000-4099**: RAG_PHASE_1B (contextual analysis)
- **5000-5099**: RAG_PHASE_1C (synthesis)
- **6000-6099**: LIVE_COACHING (WebSocket, real-time features)
- **7000-7099**: UI_INTERACTIONS (user interface state)
- **8000-8099**: ERROR_HANDLING (failures, recovery)
- **9000-9099**: TESTING_VALIDATION (test operations)

## Debug Commands Available

Once connected to the Electron app console, use these commands:

```javascript
// Get all breadcrumbs
window.debug.breadcrumbs.getAll()

// Get specific range (e.g., APP_LIFECYCLE)
window.debug.breadcrumbs.getRange(1000, 1099)

// Get only failed LEDs
window.debug.breadcrumbs.getFailures()

// Get component-specific LEDs
window.debug.breadcrumbs.getComponent('SessionManager')

// Check range completeness
window.debug.breadcrumbs.checkRange(1000, 1099)

// Get quality score (success percentage)
window.debug.breadcrumbs.getQualityScore()

// Clear all breadcrumbs
window.debug.breadcrumbs.clear()
```

## Common LED Activity Patterns

### Healthy Startup Sequence
```
🎵 LED 1075: APP_LIFECYCLE - Single instance lock acquired
🎵 LED 1067: APP_LIFECYCLE - App ready, creating window
🎵 LED 1056: APP_LIFECYCLE - Creating desktop application window
🎵 LED 1000: APP_LIFECYCLE - Window created successfully
🎵 LED 1005: APP_LIFECYCLE - DevTools opened successfully
```

### Error Patterns to Watch For
```
❌ LED 8001 FAILED [ComponentName]: ERROR_HANDLING Some error message
❌ LED 6020 FAILED [WebSocket]: LIVE_COACHING Connection failed
```

## Key Monitoring Points

### Critical Success LEDs
- **LED 1000**: Window created successfully (app launched)
- **LED 1005**: DevTools opened (debugging available)
- **LED 6000**: WebSocket connection established
- **LED 7000**: UI state initialized

### Critical Failure LEDs
- **8000+ range**: Any LED in this range indicates system errors
- **Missing LED sequences**: Gaps in expected ranges indicate incomplete operations

## Troubleshooting LED Monitoring

### If You Can't See LEDs:
1. **Check if app is running**: Look for electron.exe processes
2. **Check dev server**: Ensure `npm run dev` is active
3. **Use BashOutput tool**: Monitor the active bash session
4. **Deploy Tester agent**: Use VoiceCoach V2 Tester for direct access

### If LEDs Aren't Logging:
1. Check that breadcrumb system is imported in components
2. Verify `console.log` isn't suppressed
3. Look for LED failures in 8000+ range
4. Use `window.debug.breadcrumbs.getAll()` to check if LEDs exist but aren't displaying

## Best Practices

1. **Always monitor LEDs** when working on VoiceCoach V2
2. **Check for failure patterns** in 8000+ range first
3. **Validate complete sequences** for complex operations
4. **Use quality score** to assess system health
5. **Clear breadcrumbs** between test sessions to avoid confusion

## Example Monitoring Session

```bash
# 1. Check if app is running
tasklist | findstr "electron"

# 2. Monitor dev console
BashOutput bash_id_here

# 3. Deploy tester agent for detailed analysis
Task tool -> VoiceCoach V2 Tester -> Monitor LED activity

# 4. Check specific ranges
window.debug.breadcrumbs.getRange(1000, 1099)  # App lifecycle
window.debug.breadcrumbs.getFailures()          # Any errors
```

The LED system provides comprehensive visibility into VoiceCoach V2's internal operations. Use this monitoring capability to debug issues, validate functionality, and ensure system health during development.