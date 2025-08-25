# Lightwalker Project - Master Index

## 🚨 CRITICAL AGENT NAMING CLARIFICATION
**When using Task tool with custom agents**: Use the agent's **name** field from the .md file header, NOT the filename!
- Example: File `task-breakdown-agent.md` has `name: Task Breakdown Agent` 
- **USE**: `subagent_type: "Task Breakdown Agent"`
- **NOT**: `subagent_type: "task-breakdown-agent"`

## 🚨 MANDATORY SESSION START PROTOCOL

**EVERY conversation MUST begin by reading these files in order:**

1. **`CLAUDE-SOP-SYSTEM.md`** ← Complete Standard Operating Procedures
2. **`CLAUDE-CRITICAL-RULES.md`** ← Rules that MUST NEVER be violated  
3. **`CLAUDE-MISTAKES-LOG.md`** ← Every past failure documented with solutions
4. **`CLAUDE-SUCCESS-PATTERNS.md`** ← Proven approaches that work reliably
5. **`COMMANDS-LEARNED.md`** ← System-specific command database

**CORE PRINCIPLE**: "Mistakes or errors never happen twice if we resolve them after happening once."

**VALIDATION PROCESS**: Before executing ANY action:
- ✅ Check mistakes log for similar attempts
- ✅ Verify approach in success patterns  
- ✅ Confirm command in learned database
- ✅ If new/untested → ASK permission first
- ✅ Document outcome in appropriate file

---

## 🎯 CURRENT PROJECT FOCUS

**Lightwalker™**: AI personality companion system where users create ideal versions of themselves to copy behaviors from.

**Current Phase**: AI-Powered Character Creation ✅ LIVE IN PRODUCTION
**Main URL**: https://lightwalker-mvp.vercel.app/ai-character-creation-hybrid
**Status**: Web Research System Phase COMPLETED (July 30, 2025)

---

## 📁 DETAILED REFERENCE FILES

**VoiceCoach Project Information:**
- Documentation files are located in the `docs/` folder
- Agent specifications in `.claude/agents/` folder

**Operational Files** (Read during session startup):
- **`CLAUDE-SOP-SYSTEM.md`** - Complete procedures and protocols
- **`CLAUDE-CRITICAL-RULES.md`** - Commands/actions that must never be done
- **`CLAUDE-MISTAKES-LOG.md`** - Every documented failure with prevention rules
- **`CLAUDE-SUCCESS-PATTERNS.md`** - Proven working approaches
- **`COMMANDS-LEARNED.md`** - Windows-specific command database

---

## ⚡ QUICK REFERENCE

**Critical Commands** (Details in LIGHTWALKER-TECHNICAL-SPECS.md):
- `npm run build` ← ALWAYS use this (never `npm run dev`)
- Check `CLAUDE-CRITICAL-RULES.md` before ANY system command

**Deployment Rules** (Details in CLAUDE-CRITICAL-RULES.md):
- ALWAYS ask permission before git push or deployment
- Batch 3-5 changes together (Vercel 100/day limit)

**Development Stack**: Next.js 14, TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS

---

**IMPORTANT**: This master index provides entry points to detailed information. Read the specific reference files for complete context on any topic.

---

## 🔴 CRITICAL QUALITY PRINCIPLE - VOICECOACH PROJECT

**NEVER COMPROMISE QUALITY FOR SPEED**

The user has explicitly stated:
- "I never want to compromise quality for speed"
- "I want a great app that's working properly" 
- "Not at the expense of quality and proper robust design"
- "I am tired of Claude constantly suggesting short term fixes rather than robust and proper solutions"

**MANDATORY APPROACH FOR VOICECOACH:**
1. ✅ ALWAYS implement robust, production-ready solutions
2. ✅ ALWAYS think about error handling, edge cases, and sustainability
3. ✅ ALWAYS consider what happens when real users use the system
4. ✅ ALWAYS build with deployment and scale in mind
5. ❌ NEVER take shortcuts just to get something "working" quickly
6. ❌ NEVER implement quick fixes that will cause debugging problems later
7. ❌ NEVER use mock data or simulated functionality when real implementation is needed

**Example**: When implementing transcription:
- ❌ WRONG: "Let's just simulate transcription to test quickly"
- ✅ RIGHT: "Let's properly integrate a real transcription service (Whisper/AssemblyAI/Deepgram) with proper error handling, retry logic, and fallback mechanisms"

**The goal is a robust, sustainable app that works reliably for actual users, not a quick demo that appears to work but fails in production.**

---

## 🚀 STANDARD DEVELOPMENT WORKFLOW

**THREE-PHASE DEVELOPMENT PROTOCOL**

### Phase 1: Implementation (Lead Programmer)
When implementing new features or fixing bugs:
```
1. Deploy Lead Programmer agent for implementation
   - subagent_type: "Lead Programmer"
   - Task: Implement the feature/fix with production quality
```

### Phase 2: LED Integration (Breadcrumbs Agent)
After implementation is complete:
```
2. Deploy Breadcrumbs Agent to add debugging infrastructure
   - subagent_type: "Breadcrumbs Agent"  
   - Task: Add LED breadcrumb tracking to new code
```

### Phase 3: Testing (Claude Orchestration)
After LED integration:
```
3. Execute testing orchestration directly (NOT as agent)
   - Read: docs/CLAUDE-TESTING-ORCHESTRATION-PLAYBOOK.md
   - Follow the playbook steps using Playwright tools
   - Validate LED chain and functionality
```

---

## 🚨 MANDATORY TESTING & FIXING PROTOCOL - VOICECOACH PROJECT

**NEVER DECLARE "READY" WITHOUT TESTING AND FIXING ALL ISSUES**

### 🔄 Continuous Development Loop (MUST COMPLETE ALL)
```
1. Lead Programmer → Implements feature/fix
2. Breadcrumbs Agent → Adds LED tracking  
3. Claude Testing → Tests and finds issues
4. If issues found:
   a. Check CLAUDE-MISTAKES-LOG.md for known solutions
   b. Check CLAUDE-SUCCESS-PATTERNS.md for proven fixes
   c. If no solution found → Deploy Researcher agent
   d. Send findings to Lead Programmer
5. Lead Programmer → AUTOMATICALLY FIXES issues (no reporting without fixing!)
6. REPEAT steps 3-5 until ALL tests pass
7. ONLY THEN declare ready
```

### Critical Understanding for Testing
**Before ANY testing, Claude MUST understand:**
- VoiceCoach is transitioning from browser app to FULL TAURI DESKTOP APP
- All functionality must work in desktop mode, NOT browser mode
- Mock implementations are temporary and must be replaced with real Tauri APIs
- If unclear about ANY requirement → ASK FIRST, don't assume

### After ANY Code Changes
**MUST RUN IMMEDIATELY:**
```bash
npm run build  # Catch syntax errors
npm run lint   # Catch code issues  
npm run test   # Run test suite (if exists)
```

### Testing Orchestration Protocol
**Claude MUST:**
1. Read PRD and understand desktop app requirements
2. Execute testing per CLAUDE-TESTING-ORCHESTRATION-PLAYBOOK.md
3. When issues found → Deploy Lead Programmer IMMEDIATELY to fix
4. Re-test after each fix
5. Continue loop until ALL tests pass
6. Verify LED chain (480→489→500 for document processing)
7. Quality score must be ≥85%

### Testing Status Indicators
- ✅ **Tested**: All tests passed after latest changes
- ⚠️ **Changes Untested**: Code modified since last test run
- ❌ **Tests Failing**: Known failures requiring fixes

### Auto-Testing Triggers
**Automatically run tests when modifying:**
- `KnowledgeBaseManager.tsx`
- `useCoachingOrchestrator.ts`
- `useAudioProcessor.ts`
- Any Tauri backend files
- Any critical system components

### Testing Failure = Auto-Fix Required
**If ANY of these occur, AUTO-FIX PROTOCOL ACTIVATES:**
- Syntax errors preventing compilation
- Stage 1 not progressing to Stage 2
- LED chain incomplete or missing events
- "Local Analysis Fallback" appearing
- Quality score <85%
- Manual intervention required
- Timeout errors (unless false positive from testing)

**Auto-Fix Protocol:**
1. Check CLAUDE-MISTAKES-LOG.md for documented solution
2. If not found → Deploy Researcher agent for investigation
3. Deploy Lead Programmer with findings to implement fix
4. Re-test until issue resolved
5. Document solution in appropriate knowledge files

### Testing Documentation
**Every test run MUST produce:**
- Test report in `test-results/` folder
- LED trace log
- Quality metrics
- Pass/fail status for each phase
- Timestamp and duration

**REMEMBER**: Having a sophisticated testing system means nothing if it's not used. The Claude Tester Agent must be invoked BEFORE declaring any system ready.