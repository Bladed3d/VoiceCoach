# Iteration 1 - Ollama Query & Response

**Date:** 2025-10-01
**Model:** qwen2.5:14b-instruct-q4_K_M
**Purpose:** Create improved instruction file with confidence-based tool selection

---

## Query Sent to Ollama

```
You are an expert in sales coaching AI systems. I need your help creating better instruction prompts for an AI sales coach.

CONTEXT:
- The AI coach analyzes sales conversations in real-time
- It has 13 specific coaching tools available (Mirroring, Empathy Response, Calibrated Questions, etc.)
- It must select the most appropriate tool based on what the prospect just said
- Current performance: Only 15.4% accuracy (6/39 scenarios correct)

PROBLEM IDENTIFIED:
The AI randomly picks tools #6 and #7 when uncertain, instead of using information-gathering tools first. It lacks a confidence-based selection strategy.

PROPOSED SOLUTION - Confidence-Based Tool Selection:

LOW CONFIDENCE (unclear context, early conversation):
→ Primary: Mirroring (#1) - Get them talking
→ Secondary: Empathy Response (#2) - Build rapport
→ Fallback: Empathy Questions (#3) - Explore desires

MEDIUM CONFIDENCE (some context, mid conversation):
→ Summarizing (#4) - Verify understanding
→ Labeling (#5) - Address emotions
→ Calibrated Questions (#6) - Guide discovery

HIGH CONFIDENCE (clear context, strong signal):
→ Advanced tools #7-13 (Negative Assumption, Black Swan, Take Away, etc.)

TASK:
Create a NEW instruction file for the AI coach that implements this confidence-based strategy. The instructions should:

1. Explain the confidence-based approach clearly
2. Define when to use each confidence level
3. Provide clear decision criteria
4. Include the JSON response format requirement
5. Be concise but complete

The AI must return JSON with: tool (or tool_id), confidence (high/medium/low), and reason/why fields.

Please create the instruction file content now:
```

---

## Ollama Response

**Response Time:** 12.5 seconds
**Tokens Generated:** 906

### Full Response:

Certainly! Below is a detailed instruction file for your AI sales coach that implements the proposed confidence-based strategy. This document will guide the AI in selecting the most appropriate coaching tools based on the context of the conversation.

---

**Instruction File for Confidence-Based Tool Selection**

**Purpose:** To enhance the accuracy and effectiveness of real-time coaching by implementing a confidence-based selection strategy for coaching tools.

### 1. Explanation of the Confidence-Based Approach

The AI will use a three-tiered confidence system to select the most appropriate coaching tool based on the clarity of context and conversation stage:

- **Low Confidence:** When the context is unclear or early in the conversation.
- **Medium Confidence:** When there's some understanding of the context but still room for exploration.
- **High Confidence:** When the context is clear, and a strong signal indicates which tool to use.

### 2. Definition of Each Confidence Level

#### Low Confidence
**When to Use:**
- Early stages of conversation where context is unclear or sparse.
- Uncertain about the prospect's needs or emotions.

**Primary Tool (Mirroring - #1):**
- **Use Case:** To encourage the prospect to elaborate and provide more information.
- **Decision Criteria:** When the AI lacks sufficient context to choose another tool effectively.

**Secondary Tool (Empathy Response - #2):**
- **Use Case:** To build rapport with the prospect by acknowledging their feelings or concerns.
- **Decision Criteria:** If the conversation shows signs of emotional content but lacks clear direction.

**Fallback Tool (Empathy Questions - #3):**
- **Use Case:** To explore deeper into the prospect's desires and needs through questions.
- **Decision Criteria:** When primary and secondary tools are not applicable, or when more information is needed to understand the context better.

#### Medium Confidence
**When to Use:**
- Mid-stage conversations where some context exists but further exploration is necessary.
- Clearer understanding of the conversation flow but still room for refinement.

**Primary Tool (Summarizing - #4):**
- **Use Case:** To verify that both parties have a mutual understanding of the discussion so far.
- **Decision Criteria:** When there's enough information to summarize key points, ensuring alignment before proceeding.

**Secondary Tool (Labeling - #5):**
- **Use Case:** To address any emotional or psychological aspects that may be influencing the conversation.
- **Decision Criteria:** If the context suggests underlying emotions are affecting the prospect's responses.

**Fallback Tool (Calibrated Questions - #6):**
- **Use Case:** To guide discovery and uncover deeper insights about the prospect's needs, challenges, or desires.
- **Decision Criteria:** When there is a need to probe further into specific areas of interest or concern.

#### High Confidence
**When to Use:**
- Late stages of conversation where context is clear and signals are strong.
- Clear understanding of the prospect's situation and needs.

**Primary Tools (#7-13):**
- **Use Case:** To apply advanced coaching techniques that require a high level of contextual clarity and confidence.
- **Decision Criteria:** When there's a clear signal or indication for using one of these tools based on the conversation context.

### 3. Clear Decision Criteria

The AI should evaluate the following factors to determine the appropriate confidence level:

- **Context Clarity:** How well-defined is the current situation?
- **Conversation Stage:** Early, mid, or late stage of the call.
- **Signal Strength:** Is there a clear indication for using an advanced tool?

### 4. JSON Response Format Requirement

The AI must return its decision in the following JSON format:

```json
{
    "tool": "<tool_name>",
    "confidence": "<high/medium/low>",
    "reason": "<brief explanation of why this tool was chosen>"
}
```

**Example:**
```json
{
    "tool": "Mirroring",
    "confidence": "low",
    "reason": "Early stage conversation with unclear context."
}
```

### 5. Concise but Complete Instructions

- **Start with Low Confidence:** Always begin by assessing the clarity of the context.
- **Progress to Medium Confidence:** As more information is gathered, transition to summarizing and labeling tools.
- **End with High Confidence:** Use advanced tools when there's a clear signal or strong understanding.

---

This instruction file aims to improve the AI coach's accuracy in selecting appropriate coaching tools by leveraging a confidence-based approach.

---

## Analysis of Ollama's Response

### Strengths:
✅ Clearly structured three-tier system
✅ Specific tool recommendations for each confidence level
✅ Decision criteria provided
✅ JSON format included with example
✅ Logical progression (low → medium → high)

### Potential Issues:
⚠️ May need actual tool definitions (13 tools with examples)
⚠️ Variable substitution placeholders missing ({{TOOLS_JSON}}, {{TRANSCRIPT}}, etc.)
⚠️ Could be more prescriptive about when exactly to use each level

### Next Step:
Adapt Ollama's response into proper instruction file format and test against 39 scenarios.
