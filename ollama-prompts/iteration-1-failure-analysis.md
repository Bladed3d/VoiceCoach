# Iteration 1 - Failure Analysis

**Date:** 2025-10-02
**Result:** NO IMPROVEMENT (15.4% → 15.4%)

---

## The Problem: Confidence Strategy Backfired

### What We Expected:
- LOW confidence → Mirroring (#1), Empathy (#2), Empathy Questions (#3)
- MEDIUM confidence → Summarizing (#4), Labeling (#5), Calibrated Q (#6)
- HIGH confidence → Advanced tools (#7-13)

### What Actually Happened:
**Ollama interpreted EVERYTHING as "LOW confidence"**

Looking at actual responses:
- Scenario 4: "I'm frustrated..." → Got Mirroring (expected Empathy Response)
  - Reason: "Early conversation, unclear context"
  - **Problem:** Clear emotion signal ("frustrated") ignored

- Scenario 5: "discuss with broader team" → Got Mirroring (expected Empathy Response)
  - Reason: "Unclear context, early stage"
  - **Problem:** Stall tactic not recognized

---

## Root Cause Analysis

### Issue 1: No Context Indicators Provided
The instructions say "assess context clarity" but give Ollama NO DATA about:
- ❌ What conversation stage we're in (early/mid/late)
- ❌ How much prior context exists
- ❌ What the conversation history looks like

**Result:** Ollama defaults to "unclear context" every time

### Issue 2: Stage Variable Ignored
We provide `{{STAGE}}` but instructions don't explicitly say:
> "If STAGE is 1-3, use LOW confidence. If 4-6, use MEDIUM. If 7-9, use HIGH."

**Result:** Ollama doesn't use the stage data

### Issue 3: Emotion Signals Not Defined
Instructions say Empathy Response (#2) is for "emotional content" but don't define:
- What counts as emotional? (frustrated, concerned, worried, anxious)
- How to detect it? (keywords, tone indicators)

**Result:** Ollama misses clear emotion signals

### Issue 4: Advanced Tool Triggers Too Vague
Instructions say HIGH confidence tools need "clear signal" but don't specify:
- What is a "clear signal" for Take Away? (price objection + late stage)
- What triggers Dynamic Silence? (buying signal words: "like", "makes sense")
- When to use Black Swan? (stall + vague stakeholder mention)

**Result:** Advanced tools never selected (still 0% usage)

---

## Why Baseline Had Same Performance

### Baseline Failures:
- Overused tools #6, #7 when uncertain
- Never used tools #8-13
- No systematic approach

### Iteration 1 Failures:
- Overused tool #1 when uncertain
- **STILL** never used tools #8-13
- Too vague systematic approach

**Lesson:** Vague rules don't help. Need EXPLICIT, DATA-DRIVEN triggers.

---

## What Ollama Needs (But Didn't Get)

### 1. Explicit Stage Mapping
```
IF {{STAGE}} = 1-3 → Use LOW confidence tools
IF {{STAGE}} = 4-6 → Use MEDIUM confidence tools
IF {{STAGE}} = 7-9 → Use HIGH confidence tools
```

### 2. Emotion Detection Keywords
```
IF transcript contains: frustrated|concerned|worried|anxious|hesitant
  → Use Empathy Response (#2) or Labeling (#5)
```

### 3. Specific Tool Triggers
```
Dynamic Silence (#8):
IF transcript contains: "I like"|"makes sense"|"I see the value"
  → Use Dynamic Silence

Take Away (#13):
IF transcript contains: "expensive"|"can't justify" AND stage >= 7
  → Use Take Away

Black Swan (#9):
IF transcript contains: "stakeholders"|"something holding me back"
  → Use Black Swan
```

### 4. Signal Strength Metrics
```
LOW: No keywords matched, stage < 4
MEDIUM: 1-2 keywords matched, stage 4-6
HIGH: 3+ keywords matched OR stage >= 7 with clear trigger
```

---

## Critical Insight: Pattern Matching vs. Judgment

**The Fundamental Problem:**
We're asking Ollama to make JUDGMENT CALLS ("is context clear?") without giving it OBJECTIVE DATA POINTS.

**Better Approach:**
Give Ollama PATTERN MATCHING RULES:
- "If you see X keywords → Use tool Y"
- "If stage = Z → Use confidence level Q"
- "If emotion words present → Use empathy tools"

This is what our app's pattern-matching system does (85% success rate with instant regex).

---

## Next Iteration Strategy

### Option 1: Hybrid Approach
1. Pattern match for common scenarios (tools #1-6)
2. Only use Ollama judgment for edge cases
3. Provide explicit keyword triggers for ALL tools

### Option 2: Keyword-Driven Instructions
Completely revise to:
- List keywords for EACH tool
- Remove vague "confidence" language
- Make it deterministic: "IF keywords X → tool Y"

### Option 3: Stage-First Strategy
Always start with stage, then apply rules:
```
STAGE 1-3: Only tools #1-3
STAGE 4-6: Tools #4-6 + special cases
STAGE 7-9: Tools #7-13 if trigger words present
```

---

## Recommendation for Iteration 2

**Use Option 2: Keyword-Driven Instructions**

Why:
- Ollama is good at pattern matching, bad at abstract judgment
- Removes ambiguity ("clear signal" → specific keywords)
- Testable and debuggable
- Aligns with what actually works (app's pattern matcher)

Create instructions that say:
```
Tool #1 (Mirroring):
WHEN: No strong keywords detected, early stage (1-3)
KEYWORDS: None required

Tool #2 (Empathy Response):
WHEN: Emotion keywords present
KEYWORDS: frustrated, concerned, worried, anxious, hesitant

Tool #8 (Dynamic Silence):
WHEN: Buying signal keywords + positive sentiment
KEYWORDS: like, makes sense, see the value, compelling, reasonable

...etc for all 13 tools
```

This removes judgment, adds precision.
