Start a new development session with optional name.

## Session Start Process

### Step 1: Check for Existing Active Session
Check if `.claude/sessions/.current-session` file exists and contains an active session.

### Step 2: Generate Session Information
Create session details:
- Generate timestamp: `YYYY-MM-DD-HHMM` format
- Clean session name (replace spaces with hyphens)
- Create filename: `{timestamp}-{clean-name}.md`

### Step 3: Create Session Directory
Ensure `.claude/sessions/` directory exists.

### Step 4: Create Session File
Create new session file with:
- Session title and start time
- Session overview for Lightwalker project
- Goals section (placeholder)
- Progress section (empty)

### Step 5: Set as Current Session
Update `.claude/sessions/.current-session` with new session filename.

## Execute Session Start:

For user provided session name, create:

✅ **Session started successfully!**
📂 **Session file**: `.claude/sessions/2025-08-03-HHMM-{session-name}.md`
🎯 **Session name**: {provided session name}

**Session File Template Created**:
```markdown
# Session: {session-name}
**Start Time**: 2025-08-03 HH:MM

## Session Overview
Started new development session for Lightwalker project.

## Goals
- [Add your goals here or update with /project:session-update]

## Progress

---
*Session created at 2025-08-03 HH:MM*
```

💡 **Next steps:**
- Add progress: `/project:session-update [notes]`
- End session: `/project:session-end`
- Check status: `/project:session-current`

## Natural Language Triggers:
- "start new session [name]"
- "begin session [name]"
- "create session [name]"
- "new development session"