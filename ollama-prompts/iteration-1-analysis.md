# Ollama Instruction Optimization - Iteration 1 Analysis

**Date:** 2025-10-01
**Baseline File:** `direct-coaching-prompt.md`
**Test Scenarios:** 39 comprehensive sales situations

---

## Baseline Test Results

### Performance Metrics
- ✅ **Correct Tool Selection:** 6/39 (15.4%)
- 📝 **Valid JSON Responses:** 39/39 (100.0%)
- 📋 **Required Fields Present:** 39/39 (100.0%)
- ⏱️ **Average Response Time:** 930ms

### Key Finding: Tool Selection Bias

**Overused Tools (Wrong Context):**
- **Tool #6 (Calibrated Questions):** Selected 16 times, mostly incorrect
- **Tool #7 (Negative Assumption):** Selected 11 times, mostly incorrect

**Underused Tools (Never/Rarely Selected):**
- Tool #8 (Dynamic Silence): 0 correct selections
- Tool #9 (Black Swan): 1 correct selection
- Tool #10 (Buy-In): 0 correct selections
- Tool #11 (DJ Voice): 0 correct selections
- Tool #12 (Truth with No): 0 correct selections
- Tool #13 (Take Away): 0 correct selections

**Tools That Worked:**
- Tool #3 (Empathy Questions): 2/2 correct
- Tool #4 (Summarizing): 0/3 (but used reasonably)
- Tool #6 (Calibrated Questions): 2/4 correct when appropriate
- Tool #9 (Black Swan): 1/3 correct

---

## Root Cause Analysis

### Problem 1: No Confidence Strategy
The baseline instructions say:
> "Based on the prospect's last statement, select the most appropriate tool"

**Issue:** No guidance for LOW confidence situations
- When uncertain, Ollama defaults to safe-seeming tools (#6, #7)
- No concept of "gather more context first"
- Each response tries to be perfect, but lacks information

### Problem 2: No Tool Hierarchy
All 13 tools presented as equals, but they're not:
- **Information-gathering tools** (Mirroring, Empathy) → Build context
- **Understanding tools** (Summarizing, Calibrated Questions) → Verify comprehension
- **Advanced tactics** (Black Swan, Take Away, DJ Voice) → Require high confidence

### Problem 3: Microscopic View
App generates coaching after EVERY prospect sentence:
- Often lacks sufficient context
- Can't see conversation trajectory
- Forces premature tool selection

---

## Proposed Solution: Confidence-Based Tool Selection

### Strategy Overview

```
CONFIDENCE LEVEL → TOOL SELECTION STRATEGY

LOW CONFIDENCE (unclear context, early conversation):
├─ Primary: Mirroring (#1) - Get them talking
├─ Secondary: Empathy Response (#2) - Build rapport
└─ Fallback: Empathy Questions (#3) - Explore desires

MEDIUM CONFIDENCE (some context, mid conversation):
├─ Summarizing (#4) - Verify understanding
├─ Labeling (#5) - Address emotions
└─ Calibrated Questions (#6) - Guide discovery

HIGH CONFIDENCE (clear context, strong signal):
├─ Negative Assumption (#7) - Preempt objections
├─ Dynamic Silence (#8) - Let them sell themselves
├─ Black Swan (#9) - Uncover hidden issues
├─ Buy-In (#10) - Gain permission
├─ DJ Voice (#11) - Calm emotions
├─ Truth with No (#12) - Discover truth
└─ Take Away (#13) - Defuse objections
```

### Key Principles

1. **When in doubt, gather context**
   - Mirroring/Empathy are almost never wrong
   - They create MORE context for next response
   - Build toward better tool selection

2. **Conversation phase awareness**
   - Early → Information gathering (Tools #1-3)
   - Mid → Understanding & validation (Tools #4-6)
   - Late → Advanced tactics (Tools #7-13)

3. **Confidence threshold**
   - Low confidence? Don't guess - gather info
   - Medium confidence? Verify understanding
   - High confidence? Execute advanced tactics

---

## Expected Improvement

### If Confidence Strategy Implemented:

**Early Conversation (unclear context):**
- Scenario: "We have some challenges"
- Current: Picks #6 (wrong)
- Expected: Picks #1 Mirroring "Challenges?" (correct)

**Mid Conversation (building context):**
- Scenario: "Multiple stakeholders with different needs"
- Current: Picks #6 (wrong)
- Expected: Picks #4 Summarizing (correct)

**Late Conversation (clear signals):**
- Scenario: "I need to think about it" (stall tactic)
- Current: Picks #7 (wrong)
- Expected: Picks #13 Take Away (correct)

### Predicted Performance Gain:
- Current: 15.4% accuracy
- **Target: 60-80% accuracy** with confidence-based selection

---

## Next Steps

1. **Ask Ollama to create new instruction file** implementing confidence-based strategy
2. **Test new instructions** against same 39 scenarios
3. **Compare results** to baseline
4. **Iterate** based on new failure patterns

---

## Baseline Failure Examples

### Example 1: Should be Mirroring (#1)
**Prospect:** "We've been having some challenges with our current system."
- **Expected:** Mirroring (#1) - "Challenges?"
- **Got:** Calibrated Questions (#6)
- **Why wrong:** Not enough context, should gather more info first

### Example 2: Should be Summarizing (#4)
**Prospect:** "Multiple issues - data silos, manual processes, lack of real-time visibility, compliance concerns."
- **Expected:** Summarizing (#4) - Confirm understanding
- **Got:** Calibrated Questions (#6)
- **Why wrong:** Too many points mentioned, should summarize first

### Example 3: Should be Dynamic Silence (#8)
**Prospect:** "I really like what I'm hearing. The ROI makes sense."
- **Expected:** Dynamic Silence (#8) - Let them continue
- **Got:** Calibrated Questions (#6)
- **Why wrong:** Strong buying signal, don't interrupt with questions

### Example 4: Should be Take Away (#13)
**Prospect:** "This is more expensive than expected. Can't justify to CFO."
- **Expected:** Take Away (#13) - "Cost is valid reason not to proceed"
- **Got:** Negative Assumption (#7)
- **Why wrong:** Late-stage price objection needs defusal, not assumption

---

## Conclusion

The baseline instruction file lacks a **confidence-based selection strategy**. By implementing a tiered approach (gather → understand → execute), we can significantly improve tool selection accuracy and provide better coaching.

**Key Insight:** Not every tool is appropriate at every moment. Low confidence situations should default to information-gathering tools (Mirroring, Empathy) to build context for better future decisions.
