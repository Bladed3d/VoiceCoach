# VoiceCoach V2 - Current RAG Process Analysis

## Summary of the Problem
The V2 system is sending **ENTIRE RAG documents** (42KB+, 1000+ lines) to Ollama on **EVERY transcript event**, causing:
- Ollama timeouts (>30 seconds)
- Python server crashes
- Coaching system failures
- "FAILED: Coaching system offline" errors

## Current Process Flow (What's Actually Happening)

### 1. Document Loading Phase
**When:** User selects a document from Knowledge Base Hub
**File:** `src/components/KnowledgeBaseHub.tsx`

1. User clicks on a processed RAG document
2. System loads ENTIRE JSON file (42KB+, 1000+ lines):
   - Contains 8+ techniques
   - 156+ conversation paths
   - 87+ predictive sequences
   - Each path has triggers, responses, alternatives, confidence scores
3. Entire document passed to `LiveCoachingManager.loadSelectedDocument()`

### 2. Document Storage in Memory
**File:** `src/services/coaching/live-coaching-service.ts:162-197`

```typescript
loadProcessedDocument(document: any): boolean {
  this.currentDocument = {
    name: document.name,
    originalContent: document.originalContent,
    documentContent: document.documentContent || document,
    techniques: document.techniques || document.documentContent?.techniques,
    response_patterns: document.response_patterns
  };
}
```

**Problem:** Stores ENTIRE document structure in memory, no filtering or selection.

### 3. Real-Time Coaching Trigger
**When:** Every final transcript from Vosk (multiple times per second)
**File:** `src/services/coaching/live-coaching-service.ts:80-107`

```typescript
if (transcript.type === 'final_transcript' && transcript.text.trim()) {
  this.addToConversationHistory('prospect', transcript.text);
  this.pendingTranscript += transcript.text + ' ';
  
  if (this.pendingTranscript.length >= minTranscriptLength) {
    this.triggerRealTimeAnalysis(transcript.text); // TRIGGERED ON EVERY TRANSCRIPT!
  }
}
```

### 4. Context Building (THE PROBLEM)
**File:** `src/services/coaching/ollama-service.ts:210-263`

The system builds a MASSIVE prompt by:

1. **Extracting ALL techniques** from the document:
```typescript
if (actualInsights?.predictive_techniques) {
  actualInsights.predictive_techniques.forEach((technique: any) => {
    knowledgeBase += `\n${technique.technique_name}:\n`;
    knowledgeBase += `${technique.description}\n`;
    
    // Adds ALL conversation paths for EVERY technique
    if (technique.conversation_paths) {
      technique.conversation_paths.forEach((path: any) => {
        knowledgeBase += `- Trigger: "${path.trigger}"\n`;
        knowledgeBase += `  Response: "${path.immediate_response?.exact_words}"\n`;
        // Plus alternative paths, predicted paths, etc.
      });
    }
  });
}
```

2. **Adding ALL response patterns**:
```typescript
if (actualInsights?.response_patterns) {
  Object.entries(actualInsights.response_patterns).forEach(([type, pattern]) => {
    knowledgeBase += `${type}:\n`;
    // Adds triggers and responses for each pattern
  });
}
```

3. **Result:** Knowledge base string becomes 30,000+ characters!

### 5. Prompt Assembly
**File:** `src/services/coaching/OllamaInstructionLoader-Browser.ts:128-201`

The final prompt includes:
- Instruction template (~2000 chars)
- ENTIRE knowledge base (30,000+ chars)  
- Current transcript (500+ chars)
- Sales stage, objections, topics

**Total prompt size: 35,000+ characters sent to Ollama!**

### 6. Ollama Processing
**File:** `src/services/coaching/ollama-service.ts:150-180`

```typescript
const response = await fetch(`${this.config.host}/api/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: this.config.model,
    prompt: finalPrompt, // 35,000+ chars!
    temperature: 0.3,
    stream: false
  })
});
```

**Problem:** Ollama must process 35KB+ of context for EVERY coaching request!

## What Data is Sent to Ollama

### On Every Transcript Event:
1. **Instruction Template** (from `ollama-prompts/active-instructions-predictive-concise.md`):
   - Base instructions: ~2000 chars
   - Pattern recognition rules
   - Response format specification

2. **Complete Knowledge Base**:
   - ALL 8+ techniques with full descriptions
   - ALL 156+ conversation paths
   - ALL 87+ predictive sequences
   - ALL alternative paths and outcomes
   - **Total: ~30,000+ characters**

3. **Current Context**:
   - Last 500 chars of transcript
   - Sales stage detection
   - Objection detection
   - Topic extraction

### Frequency of Calls:
- Triggered on EVERY final_transcript from Vosk
- Can be multiple times per second during active conversation
- No caching or optimization
- No selection of relevant techniques

## Why Timeouts Occur

1. **Massive Context Window**: 35KB+ per request
2. **Processing Time**: Ollama needs to:
   - Parse entire knowledge base
   - Find relevant patterns
   - Generate response
   - Format as JSON
3. **Model Limitations**: Even fast models struggle with 35KB context in <30 seconds
4. **No Optimization**: Same full context sent even for simple responses

## What V1 Did Differently (Based on User Feedback)

User stated: "I asked Claude to duplicate what worked so well in our old document and this is NOT the correct process"

V1 likely:
- Selected ONLY relevant techniques based on conversation stage
- Cached processed knowledge
- Used smaller, focused prompts
- Didn't send entire document on every request

## Critical Issues

1. **Inefficiency**: Sending 35KB when 2KB would suffice
2. **Latency**: Real-time coaching impossible with 30+ second response times
3. **Resource Waste**: Ollama processing unnecessary data
4. **Fragility**: System crashes under load

## Recommendations

1. **Implement Smart Selection**:
   - Detect conversation stage FIRST
   - Select only 2-3 relevant techniques
   - Send focused, small prompts

2. **Cache Processed Knowledge**:
   - Pre-process techniques into categories
   - Index by triggers and stages
   - Quick lookup instead of full scan

3. **Optimize Prompt Size**:
   - Target <5KB total prompt
   - Include only what's immediately relevant
   - Add context progressively

4. **Rate Limiting**:
   - Don't process every transcript
   - Batch updates every 2-3 seconds
   - Skip redundant processing

## Next Steps

To fix this properly, we need to:
1. Analyze how V1 handled knowledge filtering
2. Implement technique selection based on context
3. Reduce prompt size by 90%
4. Add caching and optimization
5. Test with realistic conversation loads