# How Sentiment Impacts Prompt Creation

**Last Updated:** 2025-10-01

---

## TL;DR

**Sentiment currently has LIMITED impact on prompt generation.**

- ✅ Sentiment is analyzed in real-time during calls
- ✅ Sentiment is passed to Ollama as a `{{SENTIMENT}}` placeholder
- ❌ But most instruction templates don't actually use sentiment for tool selection
- ⚠️ There's a `SentimentToolSelector` class that SHOULD use sentiment but appears to be unused

---

## Current Flow: Sentiment → Prompt

### Step 1: Sentiment Analysis (Real-time)
```
SessionManagerService.ts:1167
  ↓
SentimentAnalyzer.analyzeResponse(transcript, speaker)
  ↓
Returns: SentimentAnalysis {
  score: -100 to +100,
  direction: 'positive' | 'negative' | 'neutral',
  engagement: 'high' | 'medium' | 'low',
  trend: 'improving' | 'declining' | 'stable'
}
  ↓
Stored in sessionState.currentSentiment
```

### Step 2: Prompt Generation Triggered
```
SessionManagerService.ts:1254
  ↓
generateOllamaCoaching(transcript)
  ↓
buildCoachingPrompt(transcript)
  ↓
conversationAnalyzer.analyze(transcript)  // Gets "momentum"
  ↓
ollamaPromptService.generateCoaching({
  transcript,
  salesStage,
  sentiment: analysis.momentum,  // ⚠️ Uses "momentum" not actual sentiment!
  objections,
  callDuration
})
```

### Step 3: Prompt Template Substitution
```
OllamaPromptService.ts:235
  ↓
prompt.replace(/{{SENTIMENT}}/g, context.sentiment || 'neutral')
  ↓
Final prompt sent to Ollama with sentiment embedded
```

---

## The Problem: Sentiment is Underutilized

### What SHOULD Happen:
```
Sentiment Analysis → Tool Selection → Coaching Prompt
     ↓                    ↓                ↓
  "Negative"         "Empathy          "You seem
   Score: -40"        Response"         frustrated..."
```

### What ACTUALLY Happens:
```
Sentiment Analysis → Generic Template → Coaching Prompt
     ↓                      ↓                 ↓
  "Negative"          {{SENTIMENT}}      Ollama decides
   Score: -40"        = "negative"       (inconsistent)
```

---

## Unused Code: SentimentToolSelector

There's a **sophisticated tool selector** that uses sentiment but appears disconnected:

### File: `sentiment-tool-selector.ts`

**What it does:**
```typescript
selectTool(
  transcript,
  sentiment,
  stage,
  enhancedContext: {
    sentimentScore,
    engagement,
    trend,
    responseLength
  }
)
  ↓
1. Try pattern matching (instant)
2. Fall back to AI classification
3. Return specific tool ID (1-13)
```

**The AI Classification Logic (lines 192-230):**
```
0. ENGAGEMENT LEVEL FIRST (Most Important):
   - LOW engagement → Mirroring (1) or Empathy Questions (3)
   - HIGH engagement + positive → Buy-In (10) or Calibrated Questions (6)
   - HIGH engagement + negative → Labeling (5) or Empathy Response (2)

1. SENTIMENT TREND (Critical):
   - DECLINING + negative → Take Away (13) or DJ Voice (11)
   - IMPROVING + negative → Empathy (2) or Labeling (5) - NOT Take Away!
   - IMPROVING + positive → Buy-In (10)

2. BUYING SIGNALS:
   - "I see value BUT..." → Mirroring (1) or Calibrated Questions (6)
   - DON'T use Take Away - they want to buy!

3. EMOTION INTENSITY:
   - STRONG emotions → Labeling (5)
   - MODERATE emotions → Empathy Response (2)
```

**Problem:** This class is instantiated but the `selectTool()` method doesn't appear to be called from SessionManagerService!

---

## Recommendation: Connect Sentiment to Tool Selection

### Current Architecture:
```
┌────────────────────────────────────────────┐
│ SessionManagerService                      │
│                                            │
│ 1. Analyze sentiment ✅                    │
│ 2. Store in state ✅                       │
│ 3. Pass to Ollama template ✅              │
│ 4. Ollama decides tool ⚠️ (inconsistent)  │
└────────────────────────────────────────────┘
```

### Proposed Architecture:
```
┌────────────────────────────────────────────┐
│ SessionManagerService                      │
│                                            │
│ 1. Analyze sentiment ✅                    │
│ 2. Call SentimentToolSelector ✨ NEW       │
│    └─> Returns tool ID (1-13)             │
│ 3. Get tool template from ToolEngine ✨    │
│ 4. Pass to Ollama with pre-selected tool  │
└────────────────────────────────────────────┘
```

---

## Implementation Plan

### Option A: Use SentimentToolSelector (Recommended)

**Add to SessionManagerService.generateOllamaCoaching():**

```typescript
// After line 598: Run conversation analysis
const analysis = conversationAnalyzer.analyze(transcriptionText, false);

// NEW: Select tool based on sentiment
const enhancedContext = {
  sentiment: this.currentSentiment?.direction || 'neutral',
  sentimentScore: this.currentSentiment?.score,
  engagement: this.currentSentiment?.engagement,
  trend: this.currentSentiment?.trend,
  responseLength: transcriptionText.split(' ').length
};

const toolSelection = await this.sentimentToolSelector.selectTool(
  transcriptionText,
  enhancedContext.sentiment,
  this.currentStage,
  enhancedContext
);

console.log(`🎯 Tool selected: ${toolSelection.toolName} (${toolSelection.confidence})`);

// Pass tool selection to prompt builder
const context = {
  transcript: transcriptionText,
  salesStage: analysis.salesStage,
  sentiment: enhancedContext.sentiment,
  selectedTool: toolSelection.toolName, // NEW
  toolId: toolSelection.toolId,         // NEW
  objections: analysis.objections.map(o => o.type),
  callDuration: this.callStartTime ? ... : 0
};
```

**Update instruction template to use selected tool:**
```
You selected tool: {{SELECTED_TOOL}}
Tool ID: {{TOOL_ID}}

Use this tool's framework to coach the user.
```

---

### Option B: Enhance Prompt Template (Quick Fix)

**Update instruction template with sentiment-aware rules:**
```
SENTIMENT ANALYSIS:
Current sentiment: {{SENTIMENT}}
Engagement: {{ENGAGEMENT}}
Trend: {{TREND}}
Score: {{SENTIMENT_SCORE}}

TOOL SELECTION RULES:
- If sentiment is NEGATIVE + trend DECLINING:
  → Use Empathy Response (Tool 2) or Labeling (Tool 5)

- If engagement is LOW (short responses):
  → Use Mirroring (Tool 1) ONLY

- If sentiment is POSITIVE + engagement HIGH:
  → Use Buy-In (Tool 10) or Calibrated Questions (Tool 6)

- If sentiment is NEUTRAL + stuck:
  → Use Negative Assumption (Tool 7) to reset
```

**Then update OllamaPromptService to pass these variables:**
```typescript
prompt = prompt
  .replace(/{{SENTIMENT}}/g, context.sentiment || 'neutral')
  .replace(/{{ENGAGEMENT}}/g, context.engagement || 'medium')  // NEW
  .replace(/{{TREND}}/g, context.trend || 'stable')            // NEW
  .replace(/{{SENTIMENT_SCORE}}/g, context.sentimentScore?.toString() || '0') // NEW
```

---

## Current vs Ideal Sentiment Usage

### Current (Limited):
```
Sentiment: "negative"
   ↓
Template: "Sentiment is {{SENTIMENT}}"
   ↓
Ollama: [reads "negative" and tries to understand]
   ↓
Result: Inconsistent tool selection
```

### Ideal (Structured):
```
Sentiment: {
  direction: "negative",
  score: -40,
  engagement: "low",
  trend: "declining"
}
   ↓
SentimentToolSelector: "This is LOW engagement + DECLINING trend"
   ↓
Tool Selected: Empathy Response (Tool 2)
   ↓
Template Engine: Gets Tool 2 framework + examples
   ↓
Ollama: [receives pre-selected tool with context]
   ↓
Result: Consistent, sentiment-appropriate coaching
```

---

## Manual Sentiment Integration

### Now that we have manual sentiment controls:

**We should prioritize manual sentiment over automated:**

```typescript
// In buildCoachingPrompt()
const sentiment = this.getBlendedSentiment(); // Manual overrides automated

const enhancedContext = {
  sentiment: sentiment > 0 ? 'positive' : sentiment < 0 ? 'negative' : 'neutral',
  sentimentScore: sentiment,  // Use blended score
  engagement: this.currentSentiment?.engagement || 'medium',
  trend: this.currentSentiment?.trend || 'stable',
  responseLength: transcriptionText.split(' ').length,
  isManualInput: this.sessionState.currentManualSentiment !== undefined  // Flag manual
};
```

**Why this matters:**
- User's manual sentiment is GROUND TRUTH
- Should take precedence over pattern matching
- Informs better tool selection immediately

---

## Testing Sentiment Impact

### Current System Test:
```
1. Start coaching session
2. Prospect says: "I'm frustrated with current solution"
3. Check sentiment: Negative (-30)
4. Check coaching prompt: "{{SENTIMENT}} = negative"
5. Check Ollama output: ???
```

### Enhanced System Test:
```
1. Start coaching session
2. Prospect says: "I'm frustrated with current solution"
3. Check sentiment: Negative (-30), HIGH engagement, STABLE trend
4. Check tool selection: Labeling (Tool 5)
5. Check coaching prompt: Uses Labeling framework
6. Check Ollama output: "It sounds like you're frustrated..."
```

---

## Conclusion

### Current State:
- ✅ Sentiment is analyzed accurately
- ✅ Sentiment is stored in state
- ✅ Sentiment is passed to Ollama template
- ❌ Sentiment doesn't drive tool selection
- ❌ SentimentToolSelector exists but is unused
- ❌ Ollama decides tools inconsistently

### Recommendation:
**Connect sentiment analysis to tool selection using the existing `SentimentToolSelector` class.**

This would:
1. Make sentiment actionable (not just informational)
2. Improve coaching consistency
3. Use existing sophisticated logic
4. Leverage manual sentiment inputs for better accuracy

**Estimated effort:** 2-3 hours to wire up SentimentToolSelector

---

## Next Steps

1. **Quick Win:** Add engagement/trend/score to prompt template (30 min)
2. **Full Fix:** Wire up SentimentToolSelector to generateOllamaCoaching (2-3 hours)
3. **Testing:** Verify tool selection matches sentiment appropriately
4. **Manual Integration:** Prioritize manual sentiment in tool selection

**Priority:** Medium-High (improves coaching relevance significantly)
