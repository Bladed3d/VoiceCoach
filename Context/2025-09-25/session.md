# VoiceCoach V2 Live Prompting System Analysis
Date: 2025-09-25

## How the Live Prompting Works

### Overview
The VoiceCoach V2 system creates real-time coaching prompts during sales calls by combining:
1. **Instruction Template** - Defines HOW Ollama should respond
2. **Knowledge Base** - The RAG-processed document with sales techniques
3. **Live Transcript** - Current conversation being analyzed

### Key Components

## 1. The Instruction File (`active-instructions-predictive-v2.md`)
This file contains a prompt template that tells Ollama to:
- Act as an expert sales coach
- Provide predictive guidance (looking 2-3 moves ahead)
- Return JSON-only responses with specific fields
- Use pattern matching for common triggers (price objections, hesitation, etc.)

**Key Template Variables:**
- `{KNOWLEDGE_BASE}` - Placeholder for injected document knowledge
- `{TRANSCRIPT}` - Placeholder for current conversation

## 2. The Knowledge Base (`NeverSplit-phase1a.json`)
This is a RAG-processed document containing:
- **High-impact techniques** from "Never Split the Difference" FBI negotiation methods
- **Conversation paths** with trigger phrases and responses
- **Strategic frameworks** for handling various sales situations
- Techniques like Tactical Empathy, Mirroring, Labeling, Calibrated Questions

## 3. The Prompt Building Process

### Step 1: Knowledge Injection
The system (`ollama-service.ts`) processes the RAG document and builds a knowledge string:
```
TECHNIQUES WITH CONVERSATION PATHS:
Mirroring:
- Trigger: "This is too complicated"
  Say Now: "Too complicated?"
  They'll Say: "Yes, we need something simpler"
  Then Say: "What would simple look like for you?"
```

### Step 2: Template Population
The `OllamaInstructionLoader-Browser.ts` service:
1. Loads the instruction template
2. Replaces `{KNOWLEDGE_BASE}` with the processed techniques
3. Replaces `{TRANSCRIPT}` with the last 500 characters of conversation
4. Adds detected context (sales stage, objections, topics)

### Step 3: Final Prompt Structure
The final prompt sent to Ollama looks like:
```
Expert sales coach. Provide predictive guidance using conversation paths.

KNOWLEDGE: [Inserted techniques and frameworks from RAG document]
TRANSCRIPT: "[Last 500 chars of live conversation]"

ANALYSIS:
1. DETECT trigger in transcript
2. MATCH conversation path
3. PROVIDE exact words NOW
4. PREDICT next 2 moves

[Pattern matching rules and JSON output format]
```

## Why It's Not Working Well

### Current Issues Identified:

1. **Limited Context Window**
   - Only uses last 500 characters of transcript
   - May miss important context from earlier in conversation

2. **Rigid Pattern Matching**
   - Relies on exact trigger phrases ("expensive", "not sure", etc.)
   - May not catch variations or nuanced objections

3. **Knowledge Base Format Mismatch**
   - The RAG document has complex nested structure
   - Not all techniques have clear conversation paths
   - Some predictive paths may be too generic

4. **JSON-Only Output Constraint**
   - Forces structured response that may limit natural coaching
   - Ollama may struggle with consistent JSON formatting

5. **Lack of Conversation History**
   - Doesn't track what suggestions were already given
   - Can't learn from what worked/didn't work earlier in call

## Improvement Opportunities

### Short-term Fixes:
1. **Expand transcript context** - Use more conversation history
2. **Simplify knowledge format** - Extract clearer trigger→response pairs
3. **Add fallback responses** - Handle cases when no pattern matches
4. **Improve trigger detection** - Use semantic matching not just keywords

### Long-term Improvements:
1. **Conversation state tracking** - Remember what's been discussed
2. **Dynamic knowledge selection** - Only inject relevant techniques for current stage
3. **Feedback loop** - Learn which suggestions are actually used
4. **Multi-turn planning** - Better predictive modeling of conversation flow
5. **Context-aware prompting** - Adjust instruction style based on call progress

## Technical Flow Summary

1. **Live transcript** arrives from WebSocket
2. **ollama-service.ts** builds prompt by:
   - Extracting techniques from RAG document
   - Detecting sales stage/objections
   - Formatting knowledge base string
3. **OllamaInstructionLoader** combines:
   - Instruction template
   - Knowledge base
   - Current transcript
4. **Ollama API** receives complete prompt and returns JSON response
5. **Response parser** extracts coaching suggestion for UI display

The `{KNOWLEDGE_BASE}` placeholder is the key injection point where document-specific sales techniques get inserted into the generic coaching instructions, allowing the same template to work with different sales methodologies.