# Session Save & Project Index Tool

## Purpose

This tool solves two critical problems:
1. **Preserves conversation context** when Claude chat context gets full
2. **Maintains accurate project index** without using Claude tokens

## How It Works

The `save-session.py` script:
- **Automatically finds** your most recent Claude session file
- Parses the JSONL format and converts to readable markdown
- Saves it to `Context/{date}/session-{timestamp}.md`
- Scans entire project structure
- Generates fresh `PROJECT_INDEX.md` with all files
- **Uses ZERO Claude tokens** (all processing done locally)

---

## Usage

### Step 1: Run the Script

When your Claude chat context is getting full (or anytime you want to save):

```bash
python save-session.py
```

**That's it!** No copy/paste needed.

### What Happens:

The script will automatically:
```
Finding most recent Claude session...
[OK] Found: eaede8b0-599a-4d89-bf33-6588d8ff063a.jsonl
     Size: 644,378 bytes
     Modified: 2025-10-01 12:29:21

Parsing session conversation...
[OK] Parsed conversation successfully

Saving session to Context folder...
[OK] Session saved to: Context\2025-10-01\session-12-29-22.md

Scanning project structure...
[OK] Found 452 files

Generating PROJECT_INDEX.md...
[OK] Index saved to: PROJECT_INDEX.md

[OK] Complete!
```

---

## What Gets Created

### 1. Chat Session File

**Location:** `Context/{date}/session-{timestamp}.md`

**Contains:** Your entire Claude conversation in readable markdown format:
- User messages
- Assistant responses
- Tool calls with parameters
- Command executions
- Full conversation flow

**Example:** `Context/2025-10-01/session-12-29-22.md` (92KB)

**Format:**
```markdown
# Claude Session - 2025-10-01 12:29:22

**Source:** `eaede8b0-599a-4d89-bf33-6588d8ff063a.jsonl`
**File Size:** 644,378 bytes

---

## User

I want to implement feature X...

## Assistant

I'll help you implement that. Let me start by...

### Tool: Read

```json
{
  "file_path": "src/App.tsx"
}
```
```

### 2. Project Index

**Location:** `PROJECT_INDEX.md` (at project root)

**Contains:**
- All entry points (main.cjs, App.tsx, preload.js)
- All components with line counts
- All services organized by category
- All hooks, types, utils
- Configuration files
- Project statistics (452 files, 163,479 lines)

**Example structure:**
```markdown
## Components

### coaching/
- CoachingPanel.tsx (186 lines) - VoiceCoach V2 - Coaching Panel Component
- CoachingCard.tsx (491 lines) - VoiceCoach V2 - Enhanced Coaching Card

## Services

### audio/
- AudioCaptureService.ts (267 lines) - Microphone capture service
- VolumeMonitor.ts (145 lines) - Audio volume monitoring

## Statistics
- Total Files: 452
- Total Lines: 163,479
- Components: 38
- Services: 55
```

---

## When to Use

### Ideal Times to Run:

1. **Before context fills up** (proactive save at 90-95%)
2. **After major implementation** (checkpoint progress)
3. **End of work session** (daily save)
4. **Before starting new topic** (clean slate)
5. **After important discussions** (preserve decisions)

### Benefits:

✅ **Fully automatic** - No copy/paste needed
✅ **Full conversation preserved** - Nothing lost
✅ **Accurate project map** - Fresh scan every time
✅ **Zero token cost** - All processing local
✅ **New sessions start informed** - Read index + context
✅ **Readable format** - Markdown, not JSONL

---

## For New Claude Sessions

When starting a new Claude chat:

1. **Read PROJECT_INDEX.md first**
   - Get instant overview of entire codebase
   - Find components, services, files quickly
   - No searching needed

2. **Check Context/INDEX.md**
   - Understand decision history
   - Review recent sessions
   - See major architectural choices

3. **Review latest session**
   - Read `Context/2025-10-01/session-12-29-22.md`
   - Understand what was discussed
   - Continue from where you left off

**Example prompt for new Claude session:**
```
Read PROJECT_INDEX.md and Context/2025-10-01/session-12-29-22.md
to understand the VoiceCoach V2 project and what we've been working on.
```

---

## How Session Files Are Found

The script automatically locates your Claude session files:

1. Looks in `~/.claude/projects/`
2. Finds folder matching your project name (e.g., `D--Projects-Ai-VoiceCoach-v2`)
3. Gets the most recent `.jsonl` file (by modification time)
4. Parses and converts to markdown

**Session file location:**
- Windows: `C:\Users\{username}\.claude\projects\{project}\*.jsonl`
- Mac/Linux: `~/.claude/projects/{project}/*.jsonl`

---

## What Gets Indexed

### Included Files:
- `.ts`, `.tsx`, `.js`, `.jsx`, `.cjs` (TypeScript/JavaScript)
- `.json` (Config files)
- `.md` (Documentation)
- `.html`, `.css` (Web files)
- `.py` (Python scripts)

### Excluded Folders:
- `node_modules/` (dependencies)
- `dist/`, `build/` (build output)
- `.git/` (version control)
- `chromadb_data/`, `data/` (data folders)
- `.taskmaster/`, `.claude/` (tool folders)
- `oldApp/` (archived code)

---

## Troubleshooting

### "No session file found"
**Problem:** Script can't find Claude session folder

**Solution:**
- Make sure you've had at least one Claude Code session in this project
- Check that `~/.claude/projects/` exists
- Verify project folder exists (matches project name)

### Script hangs or runs slow
**Problem:** Large project or session

**Solution:**
- Script handles large files fine (tested with 644KB session)
- May take 5-10 seconds for first run
- Subsequent runs are faster

### Markdown file is huge
**Problem:** Long conversation creates large file

**Solution:**
- This is normal (92KB for full session)
- Files are text, compress well
- Readable in any text editor

### Permission errors
**Problem:** Can't write to Context folder or project root

**Solution:**
- Make sure you have write permissions
- Run from project root directory
- Check folder isn't read-only

---

## Technical Details

- **Language:** Python 3.8+
- **Dependencies:** None (uses only standard library)
- **Performance:** Scans 452 files + parses 644KB session in ~3 seconds
- **Output encoding:** UTF-8
- **JSONL parsing:** Robust error handling for malformed entries

---

## Example Workflow

### Scenario: Context Getting Full

```
Claude: [You're at 95% context...]

You: python save-session.py

Script: [OK] Session saved to: Context/2025-10-01/session-12-29.md
        [OK] Index saved to: PROJECT_INDEX.md

You: [Start new Claude chat]
You: "Read PROJECT_INDEX.md and Context/2025-10-01/session-12-29.md
     to understand what we've been working on"

Claude: [Reads both files, understands full context, continues work]
```

### Scenario: Daily Save

```
End of day:
You: python save-session.py

Script saves everything automatically.

Next morning:
You: [New Claude session]
You: "Check Context/INDEX.md for recent work, then read yesterday's session"

Claude: [Fully caught up, ready to continue]
```

---

## Maintenance

This script requires **zero maintenance**:
- ✅ No configuration needed
- ✅ No dependencies to update
- ✅ No manual index editing
- ✅ Always generates accurate results
- ✅ Automatically finds sessions

Just run it whenever you want to save your session!

---

## Comparison: Manual vs Automated

### Old Way (Manual Copy/Paste):
1. Select all chat (Ctrl+A)
2. Copy (Ctrl+C)
3. Run script
4. Paste chat
5. Press Ctrl+Z + Enter
6. Wait for completion

**Time:** ~30 seconds, requires interaction

### New Way (Automated):
1. Run `python save-session.py`
2. Done!

**Time:** ~3 seconds, zero interaction

---

## Advanced: Session File Format

Claude Code stores sessions as JSONL (JSON Lines) files:
- Each line is a complete JSON object
- Contains user messages, assistant responses, tool calls
- Timestamps and metadata included
- Session continues across app restarts

The script parses this format and extracts:
- User messages (clean text)
- Assistant responses (formatted)
- Tool calls (with parameters)
- Skips noise (file snapshots, metadata)

**Result:** Clean, readable markdown conversation history.

---

## Future Enhancements

Potential additions:
- Filter by date range (save last N hours only)
- Search within saved sessions
- Export to PDF or HTML
- Compress old sessions
- Session summaries (AI-generated)

For now, the tool does exactly what's needed: **automatic, zero-token session preservation + accurate project indexing**.
