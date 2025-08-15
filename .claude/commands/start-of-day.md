# Start of Day Project Initialization Workflow

## Overview
Comprehensive workflow to initialize a new Claude session with complete project context, ensuring immediate understanding of current status and smooth continuation of development work.

## Command Usage
```bash
/start-of-day
```

## Workflow Steps

### Phase 1: Session Infrastructure & Context Loading
1. **Check for Active Session**
   - Look for existing session file from session-start command
   - Check `.claude/sessions/.current-session` for active session reference
   - If session exists: prepare to populate with context and goals
   - If no session exists: recommend running `/session-start [name]` first for optimal workflow

2. **Read Essential Files (Sequential Order)**
   - `CLAUDE-SOP-SYSTEM.md` - Standard Operating Procedures
   - `CLAUDE-CRITICAL-RULES.md` - Mandatory rules and restrictions
   - `CLAUDE-MISTAKES-LOG.md` - Past failures and prevention strategies
   - `CLAUDE-SUCCESS-PATTERNS.md` - Proven working approaches
   - `COMMANDS-LEARNED.md` - System-specific command database
   - `CLAUDE-PROJECT-CONTEXT.md` - Current project status and priorities

3. **System Status Assessment**
   - Check git status for any uncommitted changes
   - Review recent commits (last 24-48 hours)
   - Verify current branch and deployment status
   - Check for any pending deployment requirements

4. **Development Environment Setup**
   - Confirm Node.js dependencies are current
   - Verify build system is functional (`npm run build`)
   - Check database connection status (if applicable)
   - Validate development server configuration

### Phase 2: Session Planning & Priority Setting
5. **Review Yesterday's Context**
   - Load latest end-of-day summary from `.claude/sessions/`
   - Identify unfinished tasks and their current status
   - Check for any urgent issues or blocking problems
   - Review technical decisions made in previous session

6. **Assess Current Priorities**
   - Parse "Next Development Priorities" from project context
   - Identify immediate actionable tasks for today
   - Check for any user-specified focus areas or deadlines
   - Validate technical requirements for planned work

7. **Resource & Constraint Check**
   - Review deployment limits (Vercel 100/day rule)
   - Check for any system constraints or limitations
   - Verify access to required tools and services
   - Assess estimated time requirements for planned tasks

### Phase 3: Interactive Session Initialization
8. **Confirm Today's Direction**
   - **Current Focus**: "Ready to continue with [current phase]. Should we proceed with the planned priorities?"
   - **Priority Adjustment**: "Are there any changes to today's development focus or any urgent items?"
   - **Technical Approach**: "Any specific technical approaches or constraints for today's work?"
   - **Deployment Plans**: "Any features ready for production deployment today?"
   - **New Requirements**: "Any new features or changes to incorporate into today's plan?"

### Phase 4: Session Setup Completion
9. **Initialize Working Context**
   - Set up todo list with today's primary tasks
   - Establish clear success criteria for the session
   - Document session start time and initial objectives
   - If existing session file: populate Goals section with real priorities
   - If no session file: create session tracking file in `.claude/sessions/[date]-session-log.md`

10. **Validate Readiness**
   - Confirm all critical files are accessible and current
   - Verify development environment is fully functional
   - Check that all necessary context has been loaded
   - Ensure no critical information is missing

11. **Begin Development Work**
    - Start with highest priority task from confirmed plan
    - Apply learned patterns and avoid documented mistakes
    - Follow established success patterns and procedures
    - Maintain continuous session documentation

## Expected Outputs

### Loaded Context
- Complete understanding of project current state
- Clear priority list for today's development work
- Full awareness of technical constraints and requirements
- Understanding of recent changes and their impact

### Session Initialization
- Active todo list with today's primary objectives
- Session log file tracking progress and decisions
- Validated development environment and tools
- Clear success criteria and completion metrics

### Interactive Confirmation
- Confirmed development priorities with user input
- Validated technical approaches and constraints
- Agreed-upon deployment plans and schedules
- Understanding of any new requirements or changes

## Success Criteria
- Complete project context loaded in < 3 minutes
- All critical rules and patterns are fresh in memory
- Today's priorities are clear and actionable
- Development environment is ready and functional
- No time wasted on context confusion or setup issues

## Example Interaction Flow
```
User: /start-of-day

Claude: Initializing development session...

✅ Found existing session: "backend-integration" (created via session-start)
✅ Loaded core documentation (6 files processed)
✅ Assessed git status (clean working directory, main branch)
✅ Reviewed recent progress (daily-actions3 UI completed yesterday)
✅ Verified build system (npm run build successful)
✅ Loaded session context from yesterday's end-of-day summary
✅ Populated session Goals with real priorities

📋 **Current Project Status:**
- Phase: AI-Powered Character Creation ✅ LIVE IN PRODUCTION
- Latest: Daily-actions3 UI enhancements completed
- Next Priority: Backend integration for activity timeline system

📝 **Today's Planned Focus:**
1. Implement timeline activity data persistence
2. Add activity preference synchronization
3. Optimize UI performance for large datasets

❓ **Confirmation needed:**
Should we proceed with the timeline backend work as planned, or do you have any priority adjustments for today?

Ready to begin development work once confirmed!
```

## Integration Notes
- Should be run at the start of each new development session
- Requires brief user interaction for optimal planning
- Creates clear session objectives and tracking
- Ensures no context loss from previous sessions
- Minimizes startup time and maximizes development efficiency
- Complements the end-of-day workflow for seamless continuity

## Relationship to End-of-Day Command
- **End-of-day**: Captures and documents progress, updates context files
- **Start-of-day**: Loads context, confirms priorities, initializes session
- **Together**: Create seamless handoff between development sessions
- **Result**: No context loss, efficient session starts, clear continuity