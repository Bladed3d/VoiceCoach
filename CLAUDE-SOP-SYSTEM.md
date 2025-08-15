# Claude Standard Operating Procedures (SOP) System
## Core Principle: "Mistakes or errors never happen twice if we resolve them after happening once."

---

## 🚨 MANDATORY SESSION START PROTOCOL

**EVERY conversation MUST begin with:**

1. **Read `CLAUDE-CRITICAL-RULES.md`** - Never violate these rules
2. **Read `CLAUDE-MISTAKES-LOG.md`** - Check what failed before
3. **Read `CLAUDE-SUCCESS-PATTERNS.md`** - Use proven approaches
4. **Read `COMMANDS-LEARNED.md`** - Verify system-specific commands

**COLLABORATIVE PLANNING PROTOCOL**:
  - When a user mentions a new development goal or feature request, ALWAYS start by asking clarifying questions before beginning implementation
  - Discuss scope, approach options, and user preferences before creating todos or starting work
  - First ask: "Do you have a plan for your goal that you would like to share or shall I ask questions to get us started?"
  - If "ask questions", then example questions: "Do you have reference images, a website, or specific elements I should review?", "How should this integrate with the existing system?", "What's the priority - visual fidelity or functionality?"
  - Only begin implementation after the user confirms the approach

**VALIDATION**: Before doing ANYTHING, confirm understanding of all current rules and learned patterns.

---

## 📝 MISTAKE CAPTURE PROTOCOL

**When ANY error/failure occurs:**

### Immediate Actions (Within Same Message):
1. **STOP** the failing approach immediately
2. **DOCUMENT** the failure in `CLAUDE-MISTAKES-LOG.md`
3. **ANALYZE** root cause 
4. **IMPLEMENT** working solution
5. **UPDATE** success patterns in `CLAUDE-SUCCESS-PATTERNS.md`

### Documentation Format:
```markdown
## [DATE] - [ERROR TYPE]: [Brief Description]
**What Failed**: Exact command/approach that didn't work
**Why It Failed**: Root cause analysis
**What Works**: Proven alternative solution
**Prevention Rule**: How to avoid this in future
**System Context**: Windows/Mac, project-specific details
```

---

## 🎯 ERROR PREVENTION PROTOCOL

**Before executing ANY action:**

### Pre-Action Checklist:
- [ ] Check `CLAUDE-MISTAKES-LOG.md` for similar attempts
- [ ] Verify command in `COMMANDS-LEARNED.md` 
- [ ] Confirm approach in `CLAUDE-SUCCESS-PATTERNS.md`
- [ ] If approach is new/untested → ASK permission first

### Decision Tree:
```
Is this action in SUCCESS-PATTERNS? 
├─ YES → Execute confidently
├─ NO → Is it in MISTAKES-LOG?
   ├─ YES → Use documented alternative
   ├─ NO → ASK "I want to try [X]. This is new. Should I proceed?"
```

---

## 🔄 LEARNING LOOP PROTOCOL

**After EVERY successful action:**

1. **UPDATE** `CLAUDE-SUCCESS-PATTERNS.md` with working approach
2. **CROSS-REFERENCE** against any previous failures
3. **REFINE** existing patterns with new insights
4. **CONSOLIDATE** similar patterns to avoid bloat

**After EVERY failed action:**

1. **DOCUMENT** in `CLAUDE-MISTAKES-LOG.md` immediately
2. **FIND** working alternative 
3. **UPDATE** `CLAUDE-SUCCESS-PATTERNS.md` with solution
4. **CREATE** prevention rule for future

---

## 🛠️ AUTOMATIC ERROR DETECTION & SELF-LEARNING PROTOCOL

**When ANY tool call fails, Claude MUST automatically:**

### Immediate Self-Learning Response (Same Message):
1. **DETECT**: Recognize the tool failure from error message
2. **ACKNOWLEDGE**: "Tool `[tool]` failed with error: [error]"
3. **ANALYZE**: Identify root cause (missing Read step, wrong command, etc.)
4. **CONSULT**: Check existing knowledge files for solution
5. **FIND ALTERNATIVE**: Use documented working approach OR ask for guidance
6. **EXECUTE**: Try the working alternative immediately
7. **DOCUMENT**: Add failure + solution to mistakes log automatically
8. **UPDATE**: Add prevention rule to appropriate SOP files

### Common Tool Failure Patterns to Auto-Detect:
- **Edit Tool**: "String to replace not found" → Missing Read step
- **Bash Tool**: Command not found/failed → Check COMMANDS-LEARNED.md
- **File Tools**: Permission denied → Windows-specific workaround needed
- **API Calls**: Rate limit/timeout → Document and retry with backoff

### Automatic Documentation Template:
```markdown
## [DATE] - AUTO-DETECTED: [Tool] [Error Type]
**What Failed**: [exact tool call and error]
**Auto-Analysis**: [Claude's analysis of root cause]
**What Works**: [working alternative Claude found/used]
**Prevention Rule**: [auto-generated rule for future]
**Learning**: Auto-detected and resolved without user intervention
```

### Documentation Requirements:
```markdown
## [DATE] - COMMAND FAILURE: [Failed Command]
**What Failed**: `exact command that didn't work`
**Error**: Exact error message received
**Why It Failed**: Root cause analysis
**What Works**: `working alternative command`
**Prevention Rule**: Check COMMANDS-LEARNED.md before using [command type]
**System Context**: Windows/environment details
```

### Update Commands Database:
- Add failed command to "VERIFIED BROKEN COMMANDS" section
- Add working alternative to "VERIFIED WORKING COMMANDS" section
- Include error details and workaround instructions

### Example Recovery Flow:
```
User: "Run the tests"
Claude: Tries `npm test` → FAILS
Claude: "Command `npm test` failed. Checking COMMANDS-LEARNED.md..."
Claude: "Found alternative: `npm run build` for testing. Executing now..."
Claude: Documents failure in CLAUDE-MISTAKES-LOG.md
Claude: Updates COMMANDS-LEARNED.md with npm test → npm run build mapping
Claude: Executes `npm run build` successfully
```

---

## 📚 KNOWLEDGE FILE SYSTEM

### Core Files (Must exist):
- `CLAUDE-CRITICAL-RULES.md` - Immutable rules that never change
- `CLAUDE-MISTAKES-LOG.md` - Every failure documented with solutions
- `CLAUDE-SUCCESS-PATTERNS.md` - Proven approaches that work
- `COMMANDS-LEARNED.md` - System-specific command database

### File Maintenance Rules:
- **Update immediately** when patterns emerge
- **Keep concise** - remove obsolete entries
- **Cross-reference** between files for consistency
- **Version control** all learning files

---

## 🧠 PATTERN RECOGNITION PROTOCOL

**Watch for these recurring mistake types:**

### Command Failures:
- Same command failing repeatedly
- Platform-specific incompatibilities  
- Tool vs bash command confusion

### Logic Errors:
- Similar code bugs in different files
- Repeated architectural mistakes
- Misunderstanding of user requirements

### Process Violations:
- Skipping validation steps
- Not asking permission for major changes
- Forgetting to batch changes before deployment

**TRIGGER**: If same mistake type occurs 2+ times → CREATE PREVENTION RULE

---

  ## 🤝 COLLABORATIVE PLANNING PROTOCOL

  **When user mentions new development goals:**

  ### Mandatory Discussion Phase:
  - [ ] Ask clarifying questions about scope and priorities
  - [ ] Discuss approach options and alternatives
  - [ ] Understand user preferences and constraints
  - [ ] Confirm integration points with existing system
  - [ ] Get explicit approval before starting implementation

  ### Example Clarifying Questions:
  - "What specific elements of [technology/system] appeal to you most?"
  - "How do you envision this integrating with our current system?"
  - "What's the priority - visual fidelity, functionality, or performance?"
  - "Do you want to modify existing components or create new ones?"
  - "What's your timeline and scope preference for this feature?"

  ### Implementation Gate:
  - **NEVER begin coding** until user confirms the planned approach
  - **CREATE todos** only after discussion phase is complete
  - **START with smallest viable scope** that demonstrates the concept

  ---
  

## 🚀 EFFICIENCY OPTIMIZATION PROTOCOL

**Track these metrics per session:**
- Commands tried vs commands that worked on first attempt
- New mistakes discovered vs repeated mistakes  
- Time spent on trial/error vs time spent on solutions
- Knowledge files updated vs knowledge files consulted

**Goal**: Increase "first-attempt success rate" over time

---

## 🎯 SUCCESS VALIDATION PROTOCOL

**Measure success by:**
- Zero repeated mistakes within same session
- Zero repeated mistakes across sessions  
- Faster problem resolution over time
- Growing knowledge base without growing error rate

**Session End Checklist:**
- [ ] All new mistakes documented with solutions
- [ ] All successful patterns recorded
- [ ] All files updated and cross-referenced
- [ ] No unresolved errors carried forward

---

## 🔧 EMERGENCY PROTOCOL

**If Claude violates core principle:**

1. **IMMEDIATE STOP** - Halt all current actions
2. **ANALYZE FAILURE** - Why did prevention system fail?
3. **STRENGTHEN SYSTEM** - Update SOPs to prevent repeat
4. **TEST PREVENTION** - Verify new rules work
5. **RESUME WORK** - Continue with strengthened system

**Remember**: Every SOP failure is an opportunity to make the system bulletproof!

---

## 📈 CONTINUOUS IMPROVEMENT PROTOCOL

**Weekly Reviews** (User-initiated):
- Analyze most common mistake types
- Identify patterns not yet captured
- Optimize file organization for faster access
- Merge/consolidate similar rules

**Monthly Evolution** (User-initiated):  
- Compare error rates across months
- Identify systematic blind spots
- Upgrade SOP system based on learnings
- Document major breakthrough patterns

---

---

## 🤖 SELF-LEARNING VALIDATION PROTOCOL

**After every tool failure, Claude MUST:**

### Self-Assessment Questions:
1. Did I detect this failure automatically?
2. Did I analyze the root cause correctly?
3. Did I find and execute a working alternative?
4. Did I document the failure and solution immediately?
5. Did I update the appropriate SOP files with prevention rules?

### If ANY answer is "NO":
- **STOP** and complete the missing step immediately
- **UPGRADE** the SOP system to catch this pattern next time
- **COMMIT** to never requiring user intervention for this failure type again

### Success Criteria:
- **Zero user-reported recurring failures**
- **Automatic resolution** of all documented failure patterns
- **Proactive prevention** through mandatory pre-action checks
- **Continuous improvement** of detection and resolution capabilities

---

**CORE COMMITMENT**: This system MUST prevent any mistake from happening twice AND automatically learn from failures without user intervention. If Claude requires user help for a documented failure pattern, the system needs immediate upgrading!