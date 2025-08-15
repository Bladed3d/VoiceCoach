# Quick Recovery - Chat Termination Recovery Protocol

## Overview
Rapid recovery workflow for when a Claude chat session gets terminated mid-day, designed to restore full project context and resume work with minimal downtime.

## Command Usage
```bash
/quick-recovery
```

## Recovery Process

### Phase 1: Immediate Context Restoration
1. **Execute Start-of-Day Protocol**
   - Run complete `/start-of-day` workflow automatically
   - Load all critical project files (SOP, rules, mistakes, patterns)
   - Find and load active session from `.current-session`
   - Assess git status and recent commits

2. **Load Session Context**
   - Read current session file for latest progress entries
   - Review all session-update entries from today
   - Identify last completed tasks and current objectives
   - Parse git changes since session start

3. **System Status Check**
   - Verify development environment is functional
   - Check for any uncommitted changes
   - Assess deployment status and pending work
   - Validate build system and dependencies

### Phase 2: Context Gap Analysis
4. **Identify Recovery Point**
   - Parse latest session-update timestamp
   - Compare with current time to identify gap duration
   - Review git diff for any changes since last update
   - Check for any unsaved work or lost context

5. **Present Current State**
   - Display active session name and objectives
   - Show latest progress entries with timestamps
   - List current git status and pending changes
   - Highlight any potential context gaps

### Phase 3: Interactive Recovery Confirmation
6. **Recovery Questions**
   - **Current Task**: "What specific task were you working on when the chat terminated?"
   - **Progress Status**: "What was the last thing you completed successfully?"
   - **Immediate Next Step**: "What should I work on first to resume progress?"
   - **Blockers/Issues**: "Were there any errors, problems, or blockers when the chat ended?"
   - **Urgency**: "Is there anything time-sensitive that needs immediate attention?"

7. **Validate Recovery**
   - Confirm understanding of current work context
   - Verify next steps are clear and actionable
   - Ensure all critical information has been recovered
   - Check for any missing context or confusion

### Phase 4: Resume Development
8. **Initialize Todo List**
   - Create todo list based on session objectives and user input
   - Prioritize immediate recovery tasks
   - Include any bug fixes or issues that caused termination
   - Set clear success criteria for resumed work

9. **Begin Work**
   - Start with highest priority recovery task
   - Apply all loaded patterns and avoid documented mistakes
   - Maintain continuous session documentation
   - Update session file with recovery context

## Expected Outputs

### Rapid Context Loading
- Complete project understanding restored in < 3 minutes
- Active session context fully loaded
- Current git state and pending work identified
- Development environment validated and ready

### Recovery Assessment
- Clear identification of work interruption point
- Understanding of progress gap and lost context
- Immediate next steps confirmed with user
- Any critical issues or blockers identified

### Seamless Resume
- Active todo list with recovery priorities
- Session file updated with recovery information
- Ready to continue development work immediately
- No duplicate effort or lost progress

## Success Criteria
- Zero critical context loss from chat termination
- Full project understanding restored in under 3 minutes
- Clear actionable next steps confirmed with user
- Development work resumes seamlessly
- Session continuity maintained despite interruption

## Example Interaction Flow
```
User: /quick-recovery

Claude: 🚨 RAPID RECOVERY INITIATED - Chat termination detected

✅ Executed start-of-day protocol (6 files loaded)
✅ Found active session: "timeline-backend-integration" 
✅ Loaded session progress (4 updates today, last at 14:23)
✅ Git status: 3 modified files, no commits since 13:45
✅ Build system verified functional

📊 **Recovery Analysis:**
- Session Duration: 3.5 hours (started 10:45)
- Last Progress: Implementing ActivityService.ts database methods
- Gap Period: ~47 minutes since last update
- Git Changes: Modified components/Timeline.tsx, services/ActivityService.ts

🔍 **Recovery Questions:**
1. **Current Task**: What were you working on when the chat terminated?
2. **Progress Status**: Did you complete the ActivityService database methods?
3. **Next Step**: Should I continue with the database integration or address any errors?
4. **Issues**: Were there any TypeScript errors or build problems when it ended?

Please provide context and I'll resume exactly where we left off!
```

## Integration Notes
- Designed for immediate use after unexpected chat termination
- Combines start-of-day workflow with recovery-specific analysis
- Requires user input to close context gaps
- Updates session file with recovery information
- Creates seamless development continuity
- Can be used multiple times per day if needed

## Relationship to Other Commands
- **Built on**: `/start-of-day` (uses full context loading)
- **Enhanced with**: Recovery gap analysis and user confirmation
- **Updates**: Current session file with recovery context
- **Prepares for**: Immediate development work continuation
- **Complements**: Regular session management workflow

## Natural Language Triggers
- "recover from chat termination"
- "restore session context"  
- "quick recovery protocol"
- "resume interrupted work"
- "chat got disconnected"