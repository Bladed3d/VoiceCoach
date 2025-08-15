List all development sessions with details.

## Session List Process

### Step 1: Check Sessions Directory
Check if `.claude/sessions/` directory exists and contains session files.

### Step 2: Get Current Session
Read `.claude/sessions/.current-session` file to identify which session is currently active.

### Step 3: List All Sessions
For each session file in `.claude/sessions/*.md`:
- Extract session name from filename
- Read session title from first line
- Extract start time from session file
- Get first goal from Goals section
- Mark current session as ACTIVE

### Step 4: Display Session List
Show organized list with:
- Session filename (with ACTIVE marker)
- Session title/name
- Start time
- Primary goal (if available)

## Execute List Display:

Based on checking `.claude/sessions/` directory:

📚 **Development Sessions:**

🟢 `2025-08-02-1357-New-Activity.md` (ACTIVE)
   📝 Title: New-Activity
   ⏰ Started: 2025-08-02 13:57
   🎯 Goal: Design how activities are added to timeline

📄 `[other-session-files].md`
   📝 Title: [extracted from file]
   ⏰ Started: [extracted from file]
   🎯 Goal: [extracted from file]

💡 **Available Commands:**
- View current: `/project:session-current`
- Update active: `/project:session-update [notes]`
- Start new: `/project:session-start [name]`
- End current: `/project:session-end`

## Natural Language Triggers:
- "list sessions"
- "show all sessions"
- "what sessions exist"
- "session history"