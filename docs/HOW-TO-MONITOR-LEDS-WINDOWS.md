# 🪟 LED Monitoring Instructions for Claude (WINDOWS SYSTEM)

**⚠️ CRITICAL: This is a WINDOWS machine. Use Windows path format and Git Bash commands.**

## Windows Path Format Rules:
- ✅ Use forward slashes OR escaped backslashes: `D:/Projects/` or `D:\\Projects\\`
- ✅ Quote all paths with spaces: `"D:\Projects\Ai\VoiceCoach-v2"`
- ❌ NEVER use Linux paths like `/mnt/d/` or `/d/`
- ❌ NEVER use PowerShell cmdlets (Get-Process, Where-Object, etc.) in Bash tool

## Step 1: Restart App with Console Logging

```bash
# Git Bash command (Windows compatible):
cd "D:/Projects/Ai/VoiceCoach-v2" && npm run dev > console.log 2>&1 &
```

**Alternative using backslashes:**
```bash
cd "D:\\Projects\\Ai\\VoiceCoach-v2" && npm run dev > console.log 2>&1 &
```

**What this does:**
- `> console.log 2>&1` captures ALL console output (stdout + stderr) to the file
- The `&` runs it in background so you can continue monitoring
- This file will contain ALL LED breadcrumb activity

## Step 2: Monitor LED Activity in Real-Time

```bash
# Git Bash monitoring (works on Windows):
tail -f console.log | grep --line-buffered -E "LED|🎵|❌" &
```

**This command:**
- `tail -f` follows the file as it grows (live monitoring)
- `grep --line-buffered` filters only LED-related lines and outputs immediately
- `&` runs in background so you can continue working
- **Returns bash_id like:** `abc123`

## Step 3: Check LED Output

```bash
# Use BashOutput tool with the bash_id from Step 2
BashOutput bash_id="abc123"
```

## Windows-Specific Process Checking:

```bash
# Check if Electron is running (Windows):
tasklist | findstr /I "electron.exe"

# Check specific port (Windows):
netstat -ano | findstr ":5175"

# Find process by PID (Windows):
wmic process where "ProcessId=12345" get Caption,ProcessId,CommandLine
```

## ⚠️ Common Windows Mistakes to Avoid:

❌ **DON'T USE:** `Get-Process` (PowerShell only)
✅ **USE:** `tasklist | findstr "electron"`

❌ **DON'T USE:** `Test-Path` (PowerShell only)
✅ **USE:** `ls "D:/Projects/Ai/VoiceCoach-v2/console.log"`

❌ **DON'T USE:** `/mnt/d/Projects/` (WSL paths)
✅ **USE:** `D:/Projects/` or `"D:\\Projects\\"`

❌ **DON'T USE:** `tasklist //FI` (wrong slash direction)
✅ **USE:** `tasklist | findstr "pattern"`

## Complete Windows LED Monitoring Workflow:

```bash
# 1. Navigate to project (Windows path with forward slashes):
cd "D:/Projects/Ai/VoiceCoach-v2"

# 2. Start app with console logging:
npm run dev > console.log 2>&1 &

# 3. Monitor LED breadcrumbs:
tail -f console.log | grep --line-buffered -E "LED|🎵|❌" &
# Returns: bash_id (e.g., "f0c8e7")

# 4. Check LED output:
# Use BashOutput tool with bash_id

# 5. Monitor specific ranges (e.g., Session Manager 6300-6399):
tail -f console.log | grep --line-buffered -E "LED 63[0-9]{2}" &

# 6. Check running processes:
tasklist | findstr /I "electron node"
```

## LED Range Reference for Monitoring:

- **1000-1099**: APP_LIFECYCLE (startup, window management)
- **2000-2099**: DOCUMENT_OPERATIONS (file upload, validation)
- **3000-3099**: RAG_PHASE_1A (pure analysis)
- **4000-4099**: RAG_PHASE_1B (contextual analysis)
- **5000-5099**: RAG_PHASE_1C (synthesis)
- **6000-6099**: LIVE_COACHING (WebSocket, real-time features)
- **6300-6399**: SESSION_MANAGER (startSession, stopSession)
- **6400-6499**: OLLAMA_PROMPT_SERVICE (instruction file loading)
- **7000-7099**: UI_INTERACTIONS (user interface state)
- **7250-7299**: DUAL_VOLUME_MONITORING (audio monitoring)
- **8000-8099**: ERROR_HANDLING (failures, recovery)
- **9000-9099**: TESTING_VALIDATION (test operations)

## LED Output Format:

**Success breadcrumb:**
```
🎵 LED 6300: SESSION_MANAGER - Session started {"operation":"session_start","timestamp":1234567890}
```

**Failure breadcrumb:**
```
❌ LED 8301 FAILED [SessionManager]: Session stop failure Error: Connection lost
```

## Troubleshooting on Windows:

### Error: "No such file or directory"
- Check you're using Windows paths: `D:/` not `/d/`
- Quote paths with spaces: `"D:\Program Files\"`

### Error: "command not found" for Windows commands
- You're in Git Bash - use `tasklist`, NOT `ps`
- Use `findstr`, NOT `grep` for Windows native commands
- Use forward slashes or escaped backslashes in paths

### console.log shows old/stale data:
- App wasn't started with `> console.log 2>&1`
- Kill old app and restart using Step 1

### No LEDs appearing in output:
- Wait 5-10 seconds for app initialization
- Trigger an action in the app (start call, upload document)
- Check if console.log file exists and is growing: `ls -lh console.log`

## Example Debugging Session:

```bash
# Scenario: Debug high CPU usage after call ends

# 1. Start fresh app with logging
npm run dev > console.log 2>&1 &

# 2. Monitor session-related LEDs
tail -f console.log | grep --line-buffered -E "LED 6[3-4][0-9]{2}|LED 7[0-2][0-9]{2}" &
# bash_id: xyz123

# 3. Capture baseline (before call)
BashOutput bash_id="xyz123"
# Note which LEDs fire when idle

# 4. Start a call in the app
# Monitor LED activity during call

# 5. End the call
# Check which LEDs continue firing after stopSession

# 6. Compare LED sequences
# Identify processes that should stop but continue running
```

## 🪟 WINDOWS SYSTEM REMINDER

**This project runs on WINDOWS. Always use:**
- Windows paths: `D:/Projects/` or `"D:\\Projects\\"`
- Git Bash commands: `tail`, `grep`, `cd`, `ls`
- Windows process tools: `tasklist`, `netstat`, `wmic`
- NEVER use PowerShell cmdlets in Bash tool
- NEVER use WSL/Linux paths like `/mnt/d/`
