# Quick Onboarding for New Claude Session

## Overview
Instant context loading for a new Claude to understand current project status and continue development seamlessly.

## Command Usage
```bash
/2ndclaude
```

## Workflow Steps

### 1. Find Latest Session File
Check `.claude/sessions/` folder for the most recent session file by date:
- Look for files with format `2025-MM-DD-HHMM-[name].md`
- Select the newest file by timestamp
- This contains the actual current project status

### 2. Read Latest Session
Read the complete latest session file to understand:
- **Current Goals**: What was being worked on
- **Progress Updates**: What was accomplished
- **Git Changes**: What code was modified
- **Key Achievements**: Major milestones reached
- **Current Status**: Where development stands now

### 3. Check Git Status
Run `git status` to see:
- Any uncommitted changes since last session
- Current branch position
- Files that may need attention

### 4. Review Recent Commits
Check `git log --oneline -5` to understand:
- Latest code changes
- Commit progression
- Development trajectory

### 5. Load Critical Rules (Only If Needed)
If planning to make changes, quickly scan:
- `CLAUDE-CRITICAL-RULES.md` - Commands that must never be run
- `CLAUDE-MISTAKES-LOG.md` - Previous failures to avoid

## Expected Result
Within 2-3 minutes, you'll have complete context of:
- ✅ Current project status and recent progress
- ✅ What was accomplished in the last session
- ✅ Current codebase state and any pending work
- ✅ Critical constraints and rules for safe development

## Example Flow
```
User: /2ndclaude

Claude: Loading latest project context...

✅ Found latest session: 2025-08-06-1455-session-start.md
✅ Read session progress (Timeline reschedule bug fixed, production deployed)
✅ Checked git status (clean, commit a1eb041)
✅ Loaded critical rules for safe development

📋 **Current Status Summary:**
- Last Session: Timeline reschedule bug successfully fixed
- Production Status: Deployed with commit a1eb041
- Major Achievement: Daily Actions4 Timeline System fully functional
- Current State: Ready for next development priorities

Ready to continue development! What would you like to work on next?
```

## Why This Works Better
- **Faster**: 1 file vs 6+ documentation files
- **Current**: Real progress vs static documentation
- **Actionable**: Specific achievements vs general guidelines
- **Context-Rich**: Actual project state vs theoretical information

## Integration
This command provides immediate context for development continuation without the overhead of reading extensive documentation that may not reflect current project state.