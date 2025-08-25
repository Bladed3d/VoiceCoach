# Claude Testing Orchestration Playbook for VoiceCoach

## 🎯 Core Concept
This is an **orchestration playbook** for Claude to test, identify issues, and AUTOMATICALLY FIX them by deploying the Lead Programmer agent. Testing without fixing is incomplete.

## 🚨 CRITICAL: Understand Project Context FIRST
**BEFORE testing, Claude MUST:**
1. Read all PRD documents to understand the current development goal
2. Understand we are transitioning from browser app to FULL DESKTOP APP (Tauri)
3. Ask clarifying questions if ANY uncertainty exists about:
   - Expected functionality
   - Success criteria  
   - Technology stack requirements
   - Desktop vs browser behavior

**NO testing should begin until Claude fully understands what "working correctly" means.**

---

## 📋 Pre-Test Checklist

### Step 1: Verify Environment
Execute these commands to ensure the app is running:
```
Tool: Bash
Command: netstat -ano | findstr :1420
Expected: Port 1420 is LISTENING
```

### Step 2: Review Current State
Read these files to understand what needs testing:
```
Tool: Read
Files:
- D:\Projects\Ai\VoiceCoach\CLAUDE-MISTAKES-LOG.md (check for known issues)
- D:\Projects\Ai\VoiceCoach\voicecoach-app\src\components\KnowledgeBaseManager.tsx (main component)
```

---

## 🔗 LED Chain Validation Map

### Document Processing LED Chain
```
480 → 481 → 482 → 483 → 484 → 485 → 486 → 487 → 488 → 489 → 500+
```

| LED | Event | Validation Point |
|-----|-------|------------------|
| 480 | Questionnaire initialized | Component mounted, UI ready |
| 481-485 | Questions 1-5 answered | Each question completed |
| 486 | All questions complete | Ready for processing |
| 487 | Processing started | Phase 1 begins |
| 488 | Context integrated | Questionnaire data merged |
| 489 | Analysis complete | Phase 1 → Phase 2 transition |
| 500 | Phase 2 start | Ollama enhancement begins |

---

## 🧪 Test Execution Steps

### PHASE 1: Navigate to Application

#### Step 1.1: Open App
```
Tool: mcp__playwright__browser_navigate
Parameters:
  url: "http://localhost:1420"
```

#### Step 1.2: Capture Initial State
```
Tool: mcp__playwright__browser_snapshot
Purpose: Document initial UI state
```

#### Step 1.3: Check Console
```
Tool: mcp__playwright__browser_console_messages
Purpose: Capture baseline LEDs and any errors
```

---

### PHASE 2: Access Knowledge Base

#### Step 2.1: Take Snapshot to Find Elements
```
Tool: mcp__playwright__browser_snapshot
Purpose: Identify Knowledge Base button location
```

#### Step 2.2: Click Knowledge Base Button
```
Tool: mcp__playwright__browser_click
Parameters:
  element: "Database icon in StatusBar"
  ref: [Use ref from snapshot]
```

#### Step 2.3: Verify LED 480
```
Tool: mcp__playwright__browser_console_messages
Expected: Console shows "🎯 LED 480: Questionnaire initialization triggered"
```

---

### PHASE 3: Complete Questionnaire

#### Step 3.1: Answer Question 1 (Document Type)
```
Tool: mcp__playwright__browser_click
Parameters:
  element: "Process & Strategy radio button"
  ref: [From snapshot]
```
Verify: LED 481 fires

#### Step 3.2: Answer Question 2 (Learning Objective)
```
Tool: mcp__playwright__browser_type
Parameters:
  element: "Learning objective textarea"
  ref: [From snapshot]
  text: "I want my team to master consultative selling techniques and build stronger customer relationships"
```
Click Next button, verify LED 482

#### Step 3.3: Answer Question 3 (Business Challenge)
```
Tool: mcp__playwright__browser_type
Parameters:
  element: "Business challenge textarea"
  ref: [From snapshot]
  text: "Our team struggles with price objections and tends to discount too quickly instead of demonstrating value"
```
Click Next button, verify LED 483

#### Step 3.4: Answer Question 4 (Success Metrics)
```
Tool: mcp__playwright__browser_type
Parameters:
  element: "Success metrics textarea"
  ref: [From snapshot]
  text: "Higher close rates, increased deal sizes, shorter sales cycles, better customer satisfaction scores"
```
Click Next button, verify LED 484

#### Step 3.5: Answer Question 5 (Critical Concepts)
```
Tool: mcp__playwright__browser_type
Parameters:
  element: "Critical concept input 1"
  ref: [From snapshot]
  text: "Value-based selling"
```
Click Complete Setup button, verify LEDs 485 and 486

---

### PHASE 4: Upload and Process Document

#### Step 4.1: Create Test Document
```
Tool: Write
Parameters:
  file_path: "D:\\Projects\\Ai\\VoiceCoach\\test-document.txt"
  content: "This is a test document about sales methodologies including SPIN selling, solution selling, and consultative approaches. Key principles include: 1) Ask probing questions, 2) Listen actively, 3) Focus on value not price, 4) Build trust before pitching."
```

#### Step 4.2: Upload Document
```
Tool: mcp__playwright__browser_file_upload
Parameters:
  paths: ["D:\\Projects\\Ai\\VoiceCoach\\test-document.txt"]
```

#### Step 4.3: Click Process Button
```
Tool: mcp__playwright__browser_click
Parameters:
  element: "Process Documents button"
  ref: [From snapshot]
```

#### Step 4.4: Monitor Processing LEDs
```
Tool: mcp__playwright__browser_console_messages
Expected sequence:
- LED 487: Processing started
- LED 488: Context integrated
- LED 489: Analysis complete (Phase 1 done)
- LED 500: Phase 2 start
```

#### Step 4.5: Wait for Completion
```
Tool: mcp__playwright__browser_wait_for
Parameters:
  text: "Analysis complete"
  OR
  time: 30 (seconds)
```

---

### PHASE 5: Validate Output Quality

#### Step 5.1: Capture Final State
```
Tool: mcp__playwright__browser_snapshot
Purpose: Document analysis results
```

#### Step 5.2: Extract Analysis Text
```
Tool: mcp__playwright__browser_evaluate
Parameters:
  function: () => {
    const analysis = document.querySelector('.analysis-results');
    return analysis ? analysis.textContent : 'No analysis found';
  }
```

#### Step 5.3: Quality Checks
Verify the output contains:
- ✅ Actual insights related to the document content
- ✅ No "Local Analysis Fallback" text
- ✅ No placeholder/generic content
- ✅ Contextual recommendations based on questionnaire answers

---

## 🔄 AUTOMATIC Fix Protocol (Not Just Error Reporting!)

### When ANY Test Fails, Claude MUST:

1. **IDENTIFY** the specific failure
2. **DEPLOY** Lead Programmer agent immediately with:
   ```
   Task tool with subagent_type: "Lead Programmer"
   Prompt: "Fix [specific issue found]. The app must run as a full Tauri desktop app, not browser mode. [Include error details and expected behavior]"
   ```
3. **WAIT** for Lead Programmer to complete fixes
4. **RE-TEST** the same scenario
5. **REPEAT** until test passes (max 3 iterations)
6. **ONLY THEN** mark test as complete

### Common Issues and AUTOMATIC Fix Protocol

| Issue Found | Resolution Steps |
|-------------|-----------------|
| App running in browser mode | 1. Check CLAUDE-MISTAKES-LOG.md<br>2. If no solution → Deploy Researcher<br>3. Deploy Lead Programmer with findings |
| API calls timing out | 1. Check for "Direct Claude processing" in SUCCESS-PATTERNS<br>2. Apply documented fix OR deploy Researcher |
| Phase 1 not progressing to Phase 2 | 1. Review MISTAKES-LOG for Phase transition issues<br>2. Deploy Researcher if new problem<br>3. Lead Programmer implements research findings |
| LEDs not firing | 1. Check SUCCESS-PATTERNS for LED implementation<br>2. Deploy Lead Programmer to fix |
| Mock data being used | 1. Deploy Lead Programmer: "Replace ALL mocks with Tauri functionality" |
| Rust compilation errors | 1. Check MISTAKES-LOG (has MSYS2/MinGW solution)<br>2. Apply documented fix |

### Error Resolution Protocol

When ANY issue is found:

#### Step 1: Document Review
```
1. Check CLAUDE-MISTAKES-LOG.md for similar issues
2. Check CLAUDE-SUCCESS-PATTERNS.md for solutions
3. If solution found → Apply and re-test
```

#### Step 2: Research Agent (If No Known Solution)
```
Deploy: Task tool with subagent_type: "Researcher"
Prompt: "Investigate [specific issue] in VoiceCoach. Find root cause and best solution."
Output: Detailed findings and recommendations
```

#### Step 3: Lead Programmer Fix
```
Deploy: Task tool with subagent_type: "Lead Programmer"  
Prompt: "Fix [issue] based on these findings: [researcher output]"
Output: Implemented fix
```

#### Step 4: Re-test
```
Return to test execution steps
Verify issue is resolved
Continue until ALL tests pass
```

---

## 📊 Test Report Template

### Report Structure
```markdown
## VoiceCoach Test Report - [TIMESTAMP]

### Environment
- Port: 1420
- Tauri App Version: [from package.json]

### LED Chain Validation
- [ ] LED 480: Questionnaire initialized
- [ ] LED 481-485: Questions answered
- [ ] LED 486: Questionnaire complete
- [ ] LED 487: Processing started
- [ ] LED 488: Context integrated
- [ ] LED 489: Phase 1 complete
- [ ] LED 500: Phase 2 started

### Functional Tests
- [ ] Document upload works
- [ ] Questionnaire saves answers
- [ ] Processing completes
- [ ] Analysis displays

### Quality Validation
- [ ] Output is contextual to document
- [ ] No fallback text present
- [ ] Questionnaire context integrated
- [ ] Quality score: [X]%

### Issues Found
[List any problems]

### Status: [PASS/FAIL]
```

---

## 🎯 Success Criteria

The test is successful when:
1. ✅ Complete LED chain fires (480→489→500)
2. ✅ Document processes without errors
3. ✅ Analysis output is contextual and relevant
4. ✅ No "Local Analysis Fallback" appears
5. ✅ Questionnaire data influences the analysis
6. ✅ Phase 1 → Phase 2 progression works

---

## 💡 Orchestration Notes

### For Claude (the Orchestrator):
1. **You execute these steps directly** - don't deploy agents
2. **Use the actual tool names** provided, not JavaScript code
3. **Wait for each step to complete** before proceeding
4. **Document what you observe** at each step
5. **If a step fails**, try the diagnostic protocol
6. **Report results** using the template

### Tool Usage Pattern:
```
1. Call tool with parameters
2. Check result
3. Verify expected outcome
4. Document observation
5. Proceed to next step
```

---

## 🚀 Quick Test Command

To start testing immediately:
```
"I will now orchestrate testing of the VoiceCoach app following the playbook:
1. Navigate to http://localhost:1420
2. Access Knowledge Base
3. Complete questionnaire
4. Upload test document
5. Monitor LED chain
6. Validate output quality
7. Report results"
```

---

**Remember**: This is an orchestration playbook, not an agent. Claude reads these instructions and executes them directly using the available tools.