The last Claude kept coding rocket ships instead of simple bicycles. Create simple solutions and collaborate with me. Think of me as another AI that can add value. I have ideas that sometimes are better.

**IMPORTANT**: NEVER CODE FALLBACK or default selections if the process or feature offers a user selection. Always FAIL LOUDLY during development so we can see what needs fixing!

# VoiceCoach V2 LED Breadcrumb System Monitoring Guide

## Overview
VoiceCoach V2 has an extensive LED breadcrumb system for debugging and monitoring. You CAN and SHOULD monitor this system directly when working on the project.

## You (Claude) can see the activity of any LED
You can grep for any LED Yeah to instantly see the activity and how that LED is being used during any live call!

## How to Monitor LED Activity

### Method 1: Start App with Console Logging (PRIMARY METHOD - DO THIS FIRST!)

**This is what "smart Claude" does - it's simple and works every time:**

```bash
# Step 1: Start the app with console output redirected to a file
cd "D:\Projects\Ai\VoiceCoach-v2" && npm run dev > console.log 2>&1 &

# Step 2: Monitor the console.log file for LED breadcrumbs
tail -f console.log | grep --line-buffered -E "LED|6[4-5][0-9]{2}|instruction" &

# Step 3: Check the output using BashOutput tool
# Use the bash_id returned from Step 2
```

**Why this works:**
- `> console.log 2>&1` redirects ALL output (stdout + stderr) to a file
- The file captures EVERYTHING the Electron app logs
- You can grep for specific LED ranges or keywords
- `tail -f` follows the file in real-time as it grows
- `--line-buffered` ensures grep output appears immediately

**LED output format:**
- **Success**: `🎵 LED [number]: [name] - [data] [component]_[id]`
- **Failure**: `❌ LED [number] FAILED [component]: [name] [error]`

### Method 2: Development Console Output (Alternative)

If the primary method (console.log capture) doesn't work, check running processes:

### Method 3: Direct Process Monitoring (Fallback)
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
- **6400-6499**: OLLAMA_PROMPT_SERVICE (instruction file loading, prompt building)
- **7000-7099**: UI_INTERACTIONS (user interface state)
- **8000-8099**: ERROR_HANDLING (failures, recovery)
- **9000-9099**: TESTING_VALIDATION (test operations)

### Critical LED Ranges for Instruction File Debugging

**6440-6450: Instruction File Loading**
- **6441**: Instruction file selection start (checking localStorage)
- **6442**: User instruction file selected (shows filename from settings)
- **6443**: No instruction file in settings (using default)
- **6444**: Settings parse failed (using default)
- **6445**: No settings found (using default)
- **6446**: Loading instruction file (shows full path being loaded)
- **6447**: Extracted prompt from markdown code block
- **6440**: Template loaded SUCCESS (shows template length and file used)
- **6449**: Template reload requested (triggered by settings change)
- **6450**: Template reload complete (shows new template length)
- **8440**: Template loading FAILED (error occurred)
- **8441**: File read returned no content (file is empty or missing)

**6420-6421: Prompt Building**
- **6420**: Prompt building start (shows which instruction file is being used)
- **6421**: Prompt built complete (confirms final prompt and file used)

**7090-7094: Settings Changes**
- **7093**: Instruction file changed in UI dropdown
- **7094**: Instruction file reload triggered after Save Settings

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