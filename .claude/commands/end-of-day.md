# End of Day Project Update Workflow

## Overview
Comprehensive workflow to update project context and documentation at the end of each development day, ensuring new Claude sessions have complete understanding of current project status.

## Command Usage
```bash
/end-of-day
```

## Workflow Steps

### Phase 1: Session Analysis & Data Collection
1. **Read Current Session Files**
   - Scan `.claude/sessions/` for today's session files
   - Identify session start times, goals, and completion status
   - Extract key accomplishments, technical changes, and learning outcomes

2. **Review Git Status**
   - Check recent commits (last 24 hours)
   - Analyze changed files and commit messages
   - Identify deployment status and production updates

3. **Analyze Code Changes**
   - Review modified components and new files
   - Assess feature completions and technical improvements
   - Document performance optimizations and bug fixes

### Phase 2: Context Update Generation
4. **Update CLAUDE-PROJECT-CONTEXT.md**
   - Revise "Current Phase" with today's progress
   - Update "Latest Deployment" section with recent commits
   - Add new completed features to the features list
   - Modify "Next Development Priorities" based on current direction
   - Update technical stack and key learnings sections

5. **Update Success Patterns**
   - Add any new working solutions discovered today
   - Document breakthrough techniques or debugging approaches
   - Update best practices based on successful implementations

6. **Update Mistakes Log (if applicable)**
   - Document any errors encountered and their solutions
   - Add prevention rules for future development
   - Update command learning database with new findings

### Phase 3: Interactive Clarification
7. **Ask Clarifying Questions**
   - **Project Direction**: "What should be the main focus for tomorrow's development?"
   - **Priority Assessment**: "Are there any features that should be prioritized or deprioritized?"
   - **Technical Decisions**: "Any specific technical approaches you want to explore next?"
   - **Deployment Plans**: "Should any of today's changes be deployed to production?"
   - **Documentation Gaps**: "Is there anything important I might have missed from today's work?"

### Phase 4: Final Documentation
8. **Generate Session Summary**
   - Create comprehensive summary of day's achievements
   - Document time spent on different aspects of development
   - List key technical breakthroughs and solutions discovered
   - Note any unfinished tasks or known issues

9. **Update Project Files**
   - Commit updated CLAUDE-PROJECT-CONTEXT.md
   - Update any relevant technical documentation
   - Ensure all learning files are current and cross-referenced

10. **Prepare Next Session Setup**
    - Create clear entry point for tomorrow's Claude session
    - Document immediate next steps and context needed
    - Ensure all critical files are updated and accessible

## Expected Outputs

### Updated Files
- `CLAUDE-PROJECT-CONTEXT.md` - Current project status and priorities
- `CLAUDE-SUCCESS-PATTERNS.md` - New working solutions
- `CLAUDE-MISTAKES-LOG.md` - Any errors and their solutions (if applicable)
- `COMMANDS-LEARNED.md` - New command findings (if applicable)

### Session Documentation
- Comprehensive daily summary in `.claude/sessions/[date]-end-of-day-summary.md`
- Updated next steps and priorities for tomorrow
- Clear technical status and deployment readiness

### Interactive Elements
- Clarifying questions about project direction
- Priority confirmation for next development phase
- Technical decision validation
- Deployment approval requests

## Success Criteria
- New Claude session can understand project status in < 2 minutes
- All major developments from the day are documented
- Next priorities are clear and actionable
- Technical context is complete and current
- No critical information is lost between sessions

## Example Interaction Flow
```
User: /end-of-day

Claude: Starting end-of-day project update workflow...

✅ Analyzed today's session files (3 sessions found)
✅ Reviewed git commits (2 new commits since yesterday)
✅ Assessed code changes (6 components modified)
✅ Updated CLAUDE-PROJECT-CONTEXT.md with daily-actions3 progress

Now I have some clarifying questions:

1. **Tomorrow's Focus**: Should we continue refining the daily-actions3 UI, or move toward backend integration?

2. **Deployment**: The UI improvements look stable - should I prepare these for production deployment?

3. **Technical Direction**: Are you satisfied with the current drag-and-drop system, or should we explore alternative approaches?

4. **Priority Check**: Any features that should be bumped up or down in priority for tomorrow?

Please let me know your thoughts, and I'll finalize the documentation updates.
```

## Integration Notes
- This command should be run manually at the end of each development day
- Requires user interaction for optimal context gathering
- Creates comprehensive handoff documentation for next session
- Maintains continuity across development cycles
- Prevents context loss and ensures efficient session startup