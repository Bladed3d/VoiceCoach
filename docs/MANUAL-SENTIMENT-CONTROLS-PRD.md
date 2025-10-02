# Manual Sentiment Controls - Product Requirements Document

**Created:** 2025-10-01
**Status:** Proposed
**Priority:** High

---

## Problem Statement

Automated sentiment analysis using pattern matching struggles with:
- Context-dependent phrases
- Tone and sarcasm
- Subtle sentiment shifts
- Ever-expanding edge cases

**Reality:** The user knows EXACTLY how the call is going. Let them tell us.

---

## Solution: Quick Sentiment Buttons

Add 5-button sentiment control directly in the Script Progress panel (or floating overlay).

### UI Design

```
┌────────────────────────────────────────────┐
│  📊 Current Sentiment: +15                 │
│                                            │
│  [Sentiment Graph]                         │
│                                            │
│  🎯 How's the call going?                  │
│  ┌───────┬───────┬───────┬───────┬───────┐│
│  │  😤   │  😐   │  😶   │  😊   │  🎉   ││
│  │  --   │   -   │   ○   │   +   │  ++   ││
│  └───────┴───────┴───────┴───────┴───────┘│
│   Poor   Weak   Neutral  Good  Excellent  │
└────────────────────────────────────────────┘
```

### Scoring System

| Button | Icon | Score | Meaning |
|--------|------|-------|---------|
| `--` | 😤 | -50 | Strong objection, call going badly |
| `-`  | 😐 | -25 | Pushback, hesitation, concerns |
| `○`  | 😶 | 0   | Neutral, information gathering |
| `+`  | 😊 | +25 | Positive engagement, interest shown |
| `++` | 🎉 | +50 | Strong buying signals, ready to advance |

### Keyboard Shortcuts
- `Ctrl+1` : --
- `Ctrl+2` : -
- `Ctrl+3` : ○
- `Ctrl+4` : +
- `Ctrl+5` : ++

---

## Blended Scoring Strategy

### Option A: Full Override (Recommended)
```typescript
if (manualSentimentExists) {
  finalScore = manualScore; // User input is truth
} else {
  finalScore = automatedScore; // Fallback to automated
}
```

### Option B: Weighted Blend
```typescript
finalScore = (automatedScore * 0.3) + (manualScore * 0.7);
```

### Option C: Divergence Tracking
```typescript
// Show both scores, highlight when they disagree
if (Math.abs(automatedScore - manualScore) > 30) {
  highlightDivergence = true; // Learn from disagreements
}
```

**Recommendation:** Start with Option A (full override). User knows best.

---

## User Experience

### During Call:
1. User focuses on conversation (primary task)
2. **Optional:** Tap sentiment button when something significant happens
3. No cognitive load if ignored - automated baseline still works
4. Quick keyboard shortcut for power users

### After Call:
1. Review sentiment graph with manual inputs highlighted
2. See correlation between manual sentiment and outcomes
3. Learn patterns: "When I felt +, prospect closed"

---

## Technical Implementation

### 1. Add Manual Sentiment State
```typescript
interface ManualSentiment {
  timestamp: number;
  score: -50 | -25 | 0 | 25 | 50;
  transcriptIndex: number; // Link to specific transcript
}
```

### 2. Store in Session State
```typescript
sessionState: {
  // ... existing
  manualSentiments: ManualSentiment[];
  currentManualSentiment?: number;
}
```

### 3. Update Sentiment Display Component
```typescript
// In SalesScriptPanel.tsx or new SentimentControlPanel.tsx
const handleManualSentiment = (score: number) => {
  const manualSentiment: ManualSentiment = {
    timestamp: Date.now(),
    score,
    transcriptIndex: transcriptions.length
  };

  // Update session state
  sessionManager.addManualSentiment(manualSentiment);

  // LED breadcrumb for debugging
  trail.light(7100, { operation: 'manual_sentiment_input', score });
};
```

### 4. Blend with Automated Score
```typescript
// In SessionManagerService.ts
getBlendedSentiment(): number {
  const automated = this.currentSentiment.score;
  const manual = this.getCurrentManualSentiment();

  // Full override if manual exists
  return manual !== undefined ? manual : automated;
}
```

### 5. Visualize on Graph
```typescript
// Different colors for automated vs manual
automatedSentiment: green line
manualSentiment: blue dots/markers overlaid
```

---

## Success Metrics

### User Adoption
- % of calls with at least 1 manual sentiment input
- Average manual inputs per call
- Time from call start to first manual input

### Accuracy Improvement
- Correlation between manual sentiment and deal outcomes
- Divergence rate: automated vs manual
- User confidence in sentiment tracking

### Workflow Integration
- Does manual input disrupt conversation flow?
- Keyboard shortcut usage rate
- User feedback: "This helped" vs "This was distracting"

---

## Implementation Phases

### Phase 1: MVP (1-2 hours)
- ✅ 5 buttons in existing panel
- ✅ Basic scoring storage
- ✅ Display manual score on graph (dots)
- ✅ Full override mode

### Phase 2: Polish (2-3 hours)
- ✅ Keyboard shortcuts
- ✅ Visual divergence indicators
- ✅ Hover tooltips showing manual vs automated
- ✅ Post-call sentiment report

### Phase 3: Intelligence (Future)
- 🔮 ML learning from manual corrections
- 🔮 Predict when manual input would disagree
- 🔮 Auto-suggest: "Seems positive, confirm?"

---

## Open Questions

1. **Placement:** Floating overlay or embedded in panel?
2. **Persistence:** Should last manual score "stick" until changed?
3. **Visual feedback:** Flash/animation when button pressed?
4. **Export:** Include manual sentiments in session export?

---

## Recommendation

**Build Phase 1 MVP now.**

Reasons:
1. Quick to implement (1-2 hours)
2. Immediately useful
3. Low risk (doesn't break existing features)
4. Validates hypothesis before investing in ML

If users love it → expand
If users ignore it → automated is good enough
If users use it occasionally → hybrid approach is perfect

---

## Alternative: Voice Commands (Future)

Instead of buttons, use voice:
- User: "Positive" → +25
- User: "Negative" → -25
- User: "Very positive" → +50

**Pros:** Zero cognitive load, no button pressing
**Cons:** Prospect might hear you, could be confusing

Consider for Phase 3.

---

## Conclusion

**Sentiment analysis is hard. Let the expert (you) provide the ground truth.**

Automated sentiment provides a useful baseline, but manual input from the person on the call is gold. The hybrid approach gives us:
- Best of both worlds
- Training data for future ML improvements
- Immediate accuracy boost

**Next step:** Build Phase 1 MVP and test with real calls.
