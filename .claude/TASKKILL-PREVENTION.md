# 🚨 TASKKILL PREVENTION FOR VOICECOACH V2

## CRITICAL RULE: NEVER KILL NODE PROCESSES BY NAME

This VoiceCoach V2 project runs in an Electron environment. Using `taskkill //F //IM node.exe` will instantly terminate the Claude Code chat session.

### ❌ FORBIDDEN COMMANDS:
- `taskkill //F //IM node.exe` 
- `taskkill //F //IM npm.exe`
- `taskkill //F //IM electron.exe`
- ANY taskkill using `//IM` with process names
- **CRITICAL:** This includes compound commands like `cd "path" && taskkill //F //IM node.exe`
- **NO EXCEPTIONS:** Even when embedded in longer command chains

### ✅ REQUIRED APPROACH:
1. Use `Get-Process` or `netstat` to identify specific PIDs
2. Target exact PID numbers: `taskkill //F //PID [number]`
3. When in doubt, ask user for the specific PID

### 🎯 VoiceCoach V2 Safe Process Management:
```bash
# Safe way to check what's running on port 5173
netstat -ano | findstr :5173

# Then kill by specific PID only
taskkill //F //PID [exact_number_from_netstat]
```

**This prevention exists because Claude has been killed 15+ times by this mistake.**

## ⚠️ RECENT INCIDENT PATTERN:
- **UI Designer agent** used forbidden command in compound statement
- **5+ crashes yesterday** from similar violations  
- **Compound commands bypass safety checks** - be extra careful
- **ALWAYS check full command chain** for hidden taskkill usage

## 📝 COMPOUND COMMAND WARNING:
Commands like these are FORBIDDEN:
```bash
cd "D:\Projects\Ai\VoiceCoach-v2" && taskkill //F //IM node.exe
some-setup-command; taskkill //F //IM electron.exe
```

**Remember: User's active development work is SACRED - never crash it!**