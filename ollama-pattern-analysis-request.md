# Pattern Analysis Request for Ollama

You are an expert in sales psychology and conversation pattern recognition. Analyze these consistently failing scenarios and create UNIVERSAL PATTERN RULES that work across different wordings.

## THE PROBLEM
Current keyword-based instructions fail on these 12 scenarios regardless of approach (phrase matching, trajectory, vector context). We need pattern-based rules that identify WHEN to use each tool based on conversation dynamics, not specific words.

## CONSISTENT FAILURES

### Pattern 1: Empathy Questions (#3) vs Mirroring (#1)

**Scenario 8:**
- Statement: "We currently use spreadsheets for tracking. It's manual but we know how it works."
- Should be: Empathy Questions (magic wand to reveal hidden pain)
- Gets: Mirroring (generic default)

**Scenario 9:**
- Statement: "Our weekly meetings help us stay aligned. The team is used to this rhythm."
- Should be: Empathy Questions (explore hidden desires)
- Gets: Mirroring (generic default)

**QUESTION: What PATTERN distinguishes "defending status quo" (needs Empathy Questions) from "neutral statement" (use Mirroring)?**

---

### Pattern 2: Labeling (#5) vs Take Away (#13) vs Mirroring

**Scenario 13:**
- Statement: "Every solution we've tried has fallen short. The team is tired of false promises. I don't have the energy to go through another failed implementation."
- Should be: Labeling (validate strong emotions to build trust)
- Gets: Take Away (sees "failed" and treats as objection)

**Scenario 14:**
- Statement: "I'm hesitant because we got burned last time. The vendor overpromised and underdelivered."
- Should be: Labeling (diffuse tension from past failure)
- Gets: Take Away (amplifies the objection instead)

**Scenario 15:**
- Statement: "Let me take this back to the team and see what they think. We'll circle back once we've had a chance to digest everything."
- Should be: Labeling (call out hidden objection)
- Gets: Mirroring (doesn't recognize the stall)

**QUESTION: What PATTERN distinguishes "emotions needing validation" (Labeling) from "objections needing amplification" (Take Away)?**

---

### Pattern 3: Calibrated Questions (#6) vs Mirroring

**Scenario 17:**
- Statement: "I want to move forward but the timing feels off. We're stretched thin."
- Should be: Calibrated Questions (reframe workload concern while preserving buying signal)
- Gets: Mirroring (doesn't recognize buying signal + concern)

**Scenario 18:**
- Statement: "This looks good, but I need to get executive approval given our budget constraints."
- Should be: Calibrated Questions (reframe budget as ROI question)
- Gets: Take Away (treats as price objection)

**QUESTION: What PATTERN distinguishes "buying signal + solvable concern" (Calibrated Questions) from "just a concern" (Mirroring)?**

---

### Pattern 4: Buy-In (#10) vs Dynamic Silence (#8)

**Scenario 29:**
- Statement: "I like what I'm hearing. Can you tell me more about the integration process?"
- Should be: Buy-In (prospect actively requesting information = ready to commit)
- Gets: Dynamic Silence (sees positive words, misses the active request)

**QUESTION: What PATTERN distinguishes "active engagement request" (Buy-In) from "passive agreement" (Dynamic Silence)?**

---

### Pattern 5: Black Swan (#9) Recognition

**Scenario 25:**
- Statement: "Everything looks good on paper. I just need to make sure all the stakeholders are aligned."
- Should be: Black Swan (vague stakeholder concern hides political issue)
- Gets: Summarizing (treats as information organization)

**QUESTION: What PATTERN identifies "vague concern hiding deeper issue" (Black Swan) vs "genuine information need"?**

---

## YOUR TASK

For each pattern failure above, provide:

1. **UNIVERSAL PATTERN DESCRIPTION** - What conversation dynamic signals this tool need? (No keywords, describe the pattern)

2. **DISTINGUISHING FEATURES** - How is this pattern different from similar situations?

3. **INSTRUCTION LANGUAGE** - Write the exact instruction an AI would follow to recognize this pattern

4. **CONTEXT CLUES** - If conversation history is available, what past patterns reinforce this tool choice?

## FORMAT YOUR RESPONSE AS:

```
## PATTERN RULE: [Tool Name]

**When to Use:**
[Universal pattern description - no specific keywords]

**Distinguished From:**
[How this differs from similar tools]

**Instruction:**
[Exact language for AI to follow]

**Context Reinforcement:**
[What conversation history signals this need]

**Example Recognition:**
"If prospect is [pattern description] then use [tool] because [reasoning]"
```

## CRITICAL REQUIREMENTS

- NO keyword lists (they fail on new conversations)
- Focus on conversation DYNAMICS not specific words
- Rules must work across different phrasings
- Consider emotional state, engagement level, stage, and intent
- Use conversation context/trajectory when available

Analyze all 5 pattern failures and provide universal pattern rules.