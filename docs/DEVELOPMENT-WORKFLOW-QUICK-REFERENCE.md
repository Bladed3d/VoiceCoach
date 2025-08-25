# 🚀 VoiceCoach Development Workflow - Quick Reference

## 🔄 Comprehensive Development Loop Protocol

### 🔨 Phase 1: Implementation
```bash
# Deploy Lead Programmer for feature development
Task: subagent_type: "Lead Programmer"
Purpose: Build robust, production-ready solution
```

### 🔍 Phase 2: LED Integration
```bash
# Deploy Breadcrumbs Agent for debugging infrastructure  
Task: subagent_type: "Breadcrumbs Agent"
Purpose: Add LED tracking to new code
```

### ✅ Phase 3: Testing
```bash
# Execute testing orchestration directly (NOT as agent)
1. Read: docs/CLAUDE-TESTING-ORCHESTRATION-PLAYBOOK.md
2. Execute steps using Playwright tools
3. Validate LED chain 480→489→500
```

### 🔧 Phase 4: Error Resolution (If Issues Found)

#### Step 4A: Document Review
```bash
1. Check CLAUDE-MISTAKES-LOG.md for similar issues
2. Check CLAUDE-SUCCESS-PATTERNS.md for solutions
3. If solution found → Apply and return to Phase 3
```

#### Step 4B: Research Agent (If No Solution)
```bash
# Deploy Researcher for complex problem investigation
Task: subagent_type: "Researcher"
Purpose: Deep investigation and solution research
Output: Actionable findings for Lead Programmer
```

#### Step 4C: Fix Implementation
```bash
# Deploy Lead Programmer with research findings
Task: subagent_type: "Lead Programmer"
Input: Researcher findings + error context
Purpose: Implement robust fix based on research
```

#### Step 4D: Loop Restart
```bash
# Return to Phase 3 (Testing)
# Continue until ALL tests pass
# No manual intervention needed
```

---

## Quick Commands

### Build & Validate
```bash
npm run build     # Check for syntax errors
npm run lint      # Check code quality
npm run test      # Run test suite (if exists)
```

### Start App for Testing
```bash
cd voicecoach-app
npm run tauri:dev  # Starts on http://localhost:1420
```

### Check Port Status
```bash
netstat -ano | findstr :1420
```

---

## LED Chain Reference

### Document Processing Chain
```
480 → Questionnaire initialized
481 → Question 1 answered
482 → Question 2 answered  
483 → Question 3 answered
484 → Question 4 answered
485 → Question 5 answered
486 → All questions complete
487 → Processing started
488 → Context integrated
489 → Phase 1 complete
500 → Phase 2 started
```

---

## Testing Checklist

- [ ] App running on port 1420
- [ ] Knowledge Base accessible
- [ ] Questionnaire completes
- [ ] Document uploads
- [ ] Processing starts
- [ ] LED chain validates
- [ ] Output quality ≥85%
- [ ] No "Local Analysis Fallback"

---

## When Things Go Wrong

1. **Check LED chain** - Find last successful LED
2. **Read error messages** - Console and UI
3. **Consult CLAUDE-MISTAKES-LOG.md** - Known issues
4. **Try CLAUDE-SUCCESS-PATTERNS.md** - Proven fixes
5. **If new issue** - Document and escalate

---

## Remember

✅ **Quality over speed** - No shortcuts  
✅ **Test everything** - Before declaring ready  
✅ **Document issues** - Help future sessions  
✅ **Use orchestration** - Not agent deployment for testing