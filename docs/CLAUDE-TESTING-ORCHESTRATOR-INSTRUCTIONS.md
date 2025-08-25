# Claude Testing Orchestrator Instructions for VoiceCoach App

## Overview
You will act as an automated testing orchestrator for the VoiceCoach desktop app, simulating user interactions and validating actual functionality. This approach replaces traditional automated testing with Claude-orchestrated functional validation.

---

## 🎯 Core Testing Principle
**Test ACTUAL functionality, not just UI mechanics**
- Validate that features produce correct, useful output
- Check quality of AI analysis and coaching results
- Ensure all user workflows complete successfully
- Never mark as "PRODUCTION READY" without testing real document processing

---

## 📋 Pre-Test Setup

### 1. Environment Verification
```bash
# Check app is running
netstat -ano | findstr :5173

# Verify Tauri backend
cd voicecoach-app
npm run build

# Confirm browser access
# Open: http://localhost:5173
```

### 2. Read Critical Files
- `D:\Projects\Ai\VoiceCoach\Fix-RAG.txt` - Current issues to test
- `D:\Projects\Ai\VoiceCoach\voicecoach-app\src\components\KnowledgeBaseManager.tsx` - Main component
- Check recent code changes in git status

---

## 🔗 LED Chain Validation System
**Complete functionality tracking through LED breadcrumbs**

### Critical LED Sequences for Document Processing
```
User Upload → Processing → Analysis → Display
LED 480-489 → LED 500-599 → LED 600-699 → LED 700+
```

### Key LED Checkpoints
- **LED 480**: Questionnaire UI rendered
- **LED 481**: Question 1 answered (Company/Role)
- **LED 482**: Question 2 answered (Products/Services)
- **LED 483**: Question 3 answered (Methodologies)
- **LED 484**: Question 4 answered (Success Metrics)
- **LED 485**: Question 5 answered (Common Challenges)
- **LED 486**: All questions complete
- **LED 487**: Processing started
- **LED 488**: Context integrated
- **LED 489**: Analysis complete

### Failure Detection Matrix
| Last LED | Missing LED | Problem | Action |
|----------|------------|---------|--------|
| 480 | 481-485 | Questions not answered | Check UI state |
| 486 | 487 | Processing not started | Check submit handler |
| 487 | 488 | Context not integrated | Check questionnaire data |
| 488 | 489 | Analysis failed | Check Claude communication |

## 🧪 Testing Protocol

### Phase 1: UI Navigation Testing
Use Playwright tools to interact with the app:

```markdown
1. Navigate to app:
   - Use: mcp__playwright__browser_navigate
   - URL: http://localhost:5173

2. Take initial snapshot:
   - Use: mcp__playwright__browser_snapshot
   - Document initial state
   - Capture console for LED validation

3. Locate Knowledge Base section:
   - Use: mcp__playwright__browser_snapshot
   - Find "Knowledge Base" or "RAG" section
   - Verify LED 480 appears (questionnaire rendered)
```

### Phase 2: Document Upload Testing

```markdown
1. Prepare test document:
   - Create: test-document.txt with known content
   - Content should test edge cases (quotes, special chars, etc.)

2. Upload document:
   - Use: mcp__playwright__browser_file_upload
   - Select file input element
   - Upload test-document.txt

3. Verify upload:
   - Use: mcp__playwright__browser_snapshot
   - Confirm document appears in list
   - Check for processing indicators
```

### Phase 3: Questionnaire Testing

```markdown
1. Complete 5-question form:
   Question 1 - Company/Role:
   - Use: mcp__playwright__browser_type
   - Enter: "TestCorp Sales Representative"
   
   Question 2 - Products/Services:
   - Enter: "Enterprise software solutions"
   
   Question 3 - Methodologies:
   - Enter: "SPIN Selling, Challenger Sale"
   
   Question 4 - Success Metrics:
   - Enter: "Close rate, deal velocity"
   
   Question 5 - Common Challenges:
   - Enter: "Long sales cycles, multiple stakeholders"

2. Submit questionnaire:
   - Use: mcp__playwright__browser_click
   - Click submit/process button

3. Monitor processing:
   - Use: mcp__playwright__browser_wait_for
   - Wait for processing completion
   - Capture any errors in console
```

### Phase 4: Analysis Validation

```markdown
1. Check analysis output:
   - Use: mcp__playwright__browser_snapshot
   - Capture the analysis results

2. Validate quality metrics:
   - ✅ Real insights (not regex patterns)
   - ✅ Coherent summaries
   - ✅ Relevant key points
   - ✅ Actionable recommendations
   - ❌ No "Local Analysis Fallback"
   - ❌ No placeholder text
   - ❌ No API error messages

3. Document results:
   - Use: mcp__playwright__browser_evaluate
   - Extract text content of analysis
   - Save to validation file
```

### Phase 5: Persistence Testing

```markdown
1. Test document deletion:
   - Click delete button on a document
   - Verify removal from UI
   - Refresh page (F5)
   - Confirm document stays deleted

2. Upload new document:
   - Upload second test file
   - Verify only new document appears
   - Check no resurrection of deleted docs

3. Test localStorage sync:
   - Use: mcp__playwright__browser_evaluate
   - Check: localStorage.getItem('voicecoach_knowledge_base')
   - Verify matches displayed documents
```

### Phase 6: Error Handling Testing

```markdown
1. Test with empty file:
   - Upload 0-byte file
   - Verify graceful error handling

2. Test with huge file:
   - Upload >10MB file
   - Check performance and limits

3. Test network interruption:
   - Start processing
   - Simulate network issue
   - Verify fallback behavior

4. Test incomplete questionnaire:
   - Leave questions blank
   - Attempt processing
   - Verify validation messages
```

### Phase 7: Quality Comparison Testing

```markdown
1. Load reference benchmark:
   - Reference: Browser app high-quality output
   - Benchmark file: Previous successful analysis

2. Process test document:
   - Upload same document as benchmark
   - Complete questionnaire identically
   - Process and capture output

3. Compare quality metrics:
   - Principle extraction depth (0-100%)
   - Example quality and relevance (0-100%)
   - Implementation detail completeness (0-100%)
   - Industry application coverage (0-100%)
   - Overall quality score must be ≥85%

4. Gap analysis if quality < 85%:
   - Identify missing principles
   - Find placeholder/generic content
   - Detect shallow analysis areas
   - Note missing practical examples

5. Document quality findings:
   - Current quality score
   - Critical gaps identified
   - Specific improvements needed
```

---

## 🔄 Autonomous Correction Loop

### When Tests Fail
If any test fails, Claude should attempt autonomous correction:

```markdown
1. Analyze failure pattern:
   - Check LED chain for last successful step
   - Identify component that failed
   - Determine if auto-fixable

2. Deploy targeted fix:
   - For UI issues: Check React state management
   - For processing issues: Verify questionnaire data
   - For analysis issues: Check Claude communication
   - For quality issues: Review prompting strategy

3. Re-test after fix:
   - Repeat failed test phase
   - Validate LED chain progression
   - Check quality improvement

4. Escalate if needed:
   - After 3 failed attempts
   - Document specific blockers
   - Request human intervention
```

### Maximum Iterations
- Functionality tests: 5 attempts
- Quality improvement: 10 iterations
- Each iteration should show measurable improvement

---

## 🔍 Quality Validation Checklist

### Document Processing Quality
- [ ] Analysis contains actual insights, not patterns
- [ ] Summary is coherent and useful
- [ ] Key points are relevant to content
- [ ] Recommendations are actionable
- [ ] Source attribution is correct
- [ ] Priority levels make sense

### User Experience
- [ ] Upload provides immediate feedback
- [ ] Processing shows progress indicators
- [ ] Errors display helpful messages
- [ ] UI remains responsive during processing
- [ ] All buttons/controls work as expected

### Data Integrity
- [ ] Documents persist correctly
- [ ] Deletions are permanent
- [ ] No duplicate documents appear
- [ ] localStorage syncs with UI state
- [ ] Questionnaire answers save properly

---

## 📊 Test Reporting Format

```markdown
## VoiceCoach Testing Report - [DATE]

### Test Environment
- Browser: [Chrome/Firefox/Safari]
- App Version: [from package.json]
- Test Duration: [time]

### Test Results Summary
- ✅ Passed: X/Y tests
- ❌ Failed: X/Y tests
- ⚠️ Warnings: [list any concerns]

### Critical Findings
1. [Issue description]
   - Expected: [what should happen]
   - Actual: [what happened]
   - Impact: [severity]
   - Screenshot/Evidence: [reference]

### Document Processing Quality
- Real Analysis: [YES/NO]
- Quality Score: [0-100%]
- Sample Output: [paste example]

### Recommendations
- [Specific fixes needed]
- [Priority order]

### Production Readiness
Status: [READY/NOT READY]
Blockers: [list any]
```

---

## 🚨 Red Flags to Watch For

**STOP testing and report immediately if you see:**
1. "Local Analysis Fallback" in output
2. API error messages
3. Regex pattern extraction instead of analysis
4. Documents resurrecting after deletion
5. Manual copy/paste instructions to user
6. References to OpenRouter or external APIs
7. Placeholder/mock data in production code

---

## 💡 Testing Tips

1. **Always test the full user journey** - from upload to final output
2. **Validate output quality** - not just that something appears
3. **Test edge cases** - empty files, special characters, large files
4. **Check browser console** - for errors and warnings
5. **Verify data persistence** - across page refreshes
6. **Document everything** - screenshots, exact errors, reproduction steps

---

## 🎯 Success Criteria

The app is considered properly tested when:
1. ✅ Real Claude analysis works (no fallbacks)
2. ✅ Documents persist correctly
3. ✅ Questionnaire integrates with analysis
4. ✅ No API calls or external dependencies
5. ✅ Quality output that helps users
6. ✅ Smooth user experience
7. ✅ Proper error handling
8. ✅ No manual intervention required

---

## 🛠️ Helper Functions for Testing

### Capture Console LEDs
```javascript
// Use mcp__playwright__browser_console_messages to get all console output
// Filter for LED patterns to track progress
async function captureConsoleLEDs() {
  const messages = await mcp__playwright__browser_console_messages();
  const ledPattern = /LED\s+(\d+):/;
  return messages
    .filter(msg => ledPattern.test(msg))
    .map(msg => {
      const match = msg.match(ledPattern);
      return { led: parseInt(match[1]), message: msg };
    });
}
```

### Validate LED Sequence
```javascript
// Check that expected LED sequence occurred
function validateLEDSequence(captured, expected) {
  const capturedLEDs = captured.map(item => item.led);
  for (const expectedLED of expected) {
    if (!capturedLEDs.includes(expectedLED)) {
      return {
        success: false,
        missing: expectedLED,
        lastSeen: capturedLEDs[capturedLEDs.length - 1]
      };
    }
  }
  return { success: true };
}
```

### Monitor Processing Progress
```javascript
// Watch for completion indicators
async function waitForProcessingComplete(timeout = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    // Check for completion LED
    const leds = await captureConsoleLEDs();
    if (leds.some(led => led.led === 489)) {
      return { success: true, duration: Date.now() - startTime };
    }
    
    // Check for error indicators
    const snapshot = await mcp__playwright__browser_snapshot();
    if (snapshot.includes("Local Analysis Fallback")) {
      return { success: false, error: "Fallback to fake analysis" };
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return { success: false, error: "Timeout waiting for processing" };
}
```

## Example Test Execution

```markdown
1. Start test session:
   "I'll now test the VoiceCoach app as an orchestrator"

2. Navigate and capture initial state:
   - Use Playwright to navigate to app
   - Take initial snapshot
   - Capture console messages for LED baseline

3. Upload test document:
   - Create test file with known content
   - Upload via Playwright
   - Verify appearance and LED 480

4. Complete questionnaire:
   - Fill all 5 questions
   - Monitor LEDs 481-485 for each answer
   - Submit for processing
   - Verify LED 486 (all questions complete)

5. Monitor processing:
   - Watch for LED 487 (processing started)
   - Check LED 488 (context integrated)
   - Wait for LED 489 (analysis complete)
   - Capture any error LEDs

6. Validate output:
   - Check for real analysis (no fallback)
   - Verify quality metrics ≥85%
   - Compare against benchmark if available
   - Document LED chain completion

7. Report results:
   - Create structured report with LED trace
   - Include quality scores
   - Document any correction attempts
   - Determine production readiness
```

---

## 🎯 Critical Validation Rules

1. **NEVER accept placeholder text** as valid analysis
2. **ALWAYS verify output is contextual** to the document content
3. **TEST complete user journey** - from upload to final output
4. **VALIDATE the complete LED chain** - not just UI events
5. **RUN quality comparison** against known good output
6. **AUTO-FIX when possible** - but know when to escalate
7. **REPORT comprehensively** - include LED traces and quality scores

## Final Testing Mantra

**The app is ONLY successful when:**
- ✅ Documents upload and persist correctly
- ✅ Questionnaire integrates with analysis
- ✅ Real Claude analysis occurs (NO "Local Analysis Fallback")
- ✅ Output quality ≥85% of benchmark
- ✅ Complete LED chain validates (480→489)
- ✅ No manual user intervention required
- ✅ Error handling works gracefully

**Remember**: You're testing ACTUAL functionality, not just clicking buttons. The goal is to ensure the app produces useful, high-quality output that helps real users, not just that it "technically works."