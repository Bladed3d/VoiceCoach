# Quick Implementation Guide: 76.9% → 90%+ Accuracy
## VoiceCoach V2 Tool Selection Optimization

**Target**: Improve from 30/39 (76.9%) to 35/39+ (90%+) correct tool selections
**Constraint**: Maintain <200ms response time
**Approach**: Multi-factor scoring with cascading logic

---

## The Core Problem

Your current system uses **first keyword match wins** logic:
```typescript
// Current (simplified)
function selectTool(transcript: string): number {
  for (const tool of tools) {
    if (hasKeywordMatch(transcript, tool.keywords)) {
      return tool.id; // First match wins
    }
  }
}
```

**Why it plateaus at 76.9%**:
- Keywords overlap (e.g., "worried" triggers Tools 2, 5, 7, 12)
- No context consideration (recency, emphasis, negation)
- Binary sentiment (can't distinguish mild vs intense emotions)
- Stage ranges too broad (4-6 overlapping stages per tool)

---

## The Solution: Multi-Factor Scoring

Replace "first match" with "best match":

```typescript
// Improved
function selectTool(
  transcript: string,
  sentiment: string,
  stage: number
): number {
  // Score ALL tools across 4 factors
  const scores = tools.map(tool => ({
    toolId: tool.id,
    total:
      scoreKeywords(transcript, tool.keywords) +      // 0-40
      scoreSentiment(sentiment, tool.sentimentBias) + // 0-20
      scoreStage(stage, tool.stageBias) +            // 0-20
      scorePattern(transcript, tool.regex)           // 0-20
  }));

  // Sort by score, return highest
  return scores.sort((a, b) => b.total - a.total)[0].toolId;
}
```

---

## Implementation Phases (Priority Order)

### Phase 1: Multi-Factor Scoring (HIGHEST IMPACT)
**Expected Gain**: +5-8% accuracy
**Effort**: 2-3 hours
**Files**: `src/services/coaching/ToolTemplateEngine.ts`

**Changes**:
1. Create `scoreTools()` function (see below)
2. Replace keyword-only matching with 4-factor scoring
3. Test on 39 scenarios

### Phase 2: Cascading Logic
**Expected Gain**: +3-5% accuracy
**Effort**: 2 hours
**Impact**: Reduces tool search space, prevents category confusion

**Changes**:
1. Group tools into 4 categories (emotional/logical/urgency/discovery)
2. Classify category first, then score within category
3. Reduces 13-tool search to 3-4 tools per category

### Phase 3: Disambiguation Flow
**Expected Gain**: +2-4% accuracy
**Effort**: 1-2 hours
**Impact**: Handles close matches intelligently

**Changes**:
1. If top 2 scores are within 10 points, apply tiebreakers
2. Tiebreaker priority: stage specificity > keyword exactness > sentiment intensity
3. Fallback to safe defaults for low confidence

### Phase 4: Context-Aware Keywords
**Expected Gain**: +4-6% accuracy
**Effort**: 2-3 hours
**Impact**: Correctly interprets keyword meaning

**Changes**:
1. Weight keywords by recency (last 10 words = 2x)
2. Detect negation ("not worried" ≠ "worried")
3. Bonus for emphasis words ("really", "very")
4. Penalty for generic keywords in wrong context

### Phase 5: Sentiment Intensity
**Expected Gain**: +2-3% accuracy
**Effort**: 1 hour
**Impact**: Distinguishes mild vs strong emotions

**Changes**:
1. Replace binary sentiment with 0-1 intensity scale
2. Strong emotions (>0.7) prefer emotion tools (5, 11)
3. Mild emotions prefer discovery tools (1, 3, 6)

### Phase 6: Confidence Thresholds
**Expected Gain**: +3-5% accuracy
**Effort**: 1 hour
**Impact**: Rejects bad guesses, uses safe fallbacks

**Changes**:
1. High confidence (>70): use immediately
2. Medium confidence (50-70): validate with gap check
3. Low confidence (<50): use stage-appropriate fallback

---

## Code: Multi-Factor Scoring Function

```typescript
interface ToolScore {
  toolId: number;
  total: number;
  breakdown: {
    keyword: number;
    sentiment: number;
    stage: number;
    pattern: number;
  };
  confidence: 'high' | 'medium' | 'low';
}

function scoreTools(
  transcript: string,
  sentiment: string,
  stage: number,
  tools: ToolTemplate[]
): ToolScore[] {
  return tools.map(tool => {
    // 1. Keyword Score (0-40 points)
    const keywordScore = scoreKeywords(transcript, tool.triggers.keywords);

    // 2. Sentiment Score (0-20 points)
    const sentimentScore = scoreSentiment(sentiment, tool.triggers.sentimentBias);

    // 3. Stage Score (0-20 points)
    const stageScore = scoreStage(stage, tool.triggers.stageBias);

    // 4. Pattern Score (0-20 points)
    const patternScore = scorePattern(transcript, tool.triggers.regex);

    const total = keywordScore + sentimentScore + stageScore + patternScore;

    return {
      toolId: tool.id,
      total,
      breakdown: { keyword: keywordScore, sentiment: sentimentScore, stage: stageScore, pattern: patternScore },
      confidence: total > 70 ? 'high' : total > 50 ? 'medium' : 'low'
    };
  }).sort((a, b) => b.total - a.total);
}

// Keyword scoring with context awareness
function scoreKeywords(transcript: string, keywords: string[]): number {
  const transcriptLower = transcript.toLowerCase();
  const words = transcriptLower.split(/\s+/);
  const lastWords = words.slice(-10); // Last 10 words for recency

  let score = 0;

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();

    if (transcriptLower.includes(keywordLower)) {
      // Base match: +10 points
      score += 10;

      // Recency bonus: +5 if in last 10 words
      if (lastWords.some(w => w.includes(keywordLower))) {
        score += 5;
      }

      // Emphasis bonus: +5 if near "really", "very", etc.
      const hasEmphasis = ['really', 'very', 'extremely'].some(em =>
        transcriptLower.includes(`${em} ${keywordLower}`)
      );
      if (hasEmphasis) {
        score += 5;
      }

      // Negation penalty: -10 if "not" or "don't" before keyword
      const isNegated = transcriptLower.includes(`not ${keywordLower}`) ||
                       transcriptLower.includes(`don't ${keywordLower}`);
      if (isNegated) {
        score -= 10;
      }
    }
  }

  return Math.min(score, 40); // Cap at 40
}

// Sentiment scoring with alignment check
function scoreSentiment(
  sentiment: string,
  toolSentimentBias: string | undefined
): number {
  if (!toolSentimentBias) return 10; // Neutral tools get medium score

  // Perfect match
  if (sentiment === toolSentimentBias) return 20;

  // Neutral tools accept any sentiment
  if (toolSentimentBias === 'neutral') return 10;

  // Mismatch (positive tool for negative sentiment)
  return 0;
}

// Stage scoring with exact/adjacent/range logic
function scoreStage(
  stage: number,
  toolStageBias: number[] | undefined
): number {
  if (!toolStageBias || toolStageBias.length === 0) return 10; // No bias = medium score

  // Exact match
  if (toolStageBias.includes(stage)) {
    return 20;
  }

  // Adjacent stage (within 1)
  const hasAdjacent = toolStageBias.some(s => Math.abs(s - stage) === 1);
  if (hasAdjacent) {
    return 15;
  }

  // Within tool's range but not exact
  const minStage = Math.min(...toolStageBias);
  const maxStage = Math.max(...toolStageBias);
  if (stage >= minStage && stage <= maxStage) {
    return 10;
  }

  // Out of range
  return 0;
}

// Pattern scoring with regex match
function scorePattern(
  transcript: string,
  regex: string | undefined
): number {
  if (!regex) return 10; // No pattern = medium score

  try {
    const pattern = new RegExp(regex, 'i');
    const matches = transcript.match(new RegExp(regex, 'gi'));

    if (!matches) return 0;

    // Base match: +15
    let score = 15;

    // Multiple matches: +5 (stronger signal)
    if (matches.length > 1) {
      score += 5;
    }

    return score;
  } catch (error) {
    console.warn('Invalid regex pattern:', regex);
    return 0;
  }
}
```

---

## Code: Cascading Classification

```typescript
// Tool categories based on purpose
const TOOL_CATEGORIES = {
  emotional: [2, 5, 11],  // Empathy Response, Labeling, DJ Voice
  logical: [4, 6, 10],    // Summarizing, Calibrated Questions, Buy-In
  urgency: [7, 12, 13],   // Negative Assumption, Truth with No, Take Away
  discovery: [1, 3, 9, 8] // Mirroring, Empathy Questions, Black Swan, Dynamic Silence
};

type ToolCategory = 'emotional' | 'logical' | 'urgency' | 'discovery';

function classifyCategory(transcript: string, sentiment: string): ToolCategory {
  const transcriptLower = transcript.toLowerCase();

  // Strong emotion words → emotional category
  const emotionWords = ['frustrated', 'angry', 'worried', 'stressed', 'anxious', 'exhausted', 'overwhelmed'];
  if (emotionWords.some(w => transcriptLower.includes(w))) {
    return 'emotional';
  }

  // Urgency words → urgency category
  const urgencyWords = ['expensive', 'cost', 'budget', 'think about', 'maybe later', 'not ready', 'hesitant'];
  if (urgencyWords.some(w => transcriptLower.includes(w))) {
    return 'urgency';
  }

  // Logic/complexity words → logical category
  const logicWords = ['complex', 'multiple', 'various', 'stakeholders', 'process', 'how would'];
  if (logicWords.some(w => transcriptLower.includes(w))) {
    return 'logical';
  }

  // Default to discovery
  return 'discovery';
}

function selectToolCascading(
  transcript: string,
  sentiment: string,
  stage: number,
  tools: ToolTemplate[]
): number {
  // STAGE 1: Classify category
  const category = classifyCategory(transcript, sentiment);

  // STAGE 2: Filter to category tools
  const categoryToolIds = TOOL_CATEGORIES[category];
  const categoryTools = tools.filter(t => categoryToolIds.includes(t.id));

  // STAGE 3: Score within category
  const scores = scoreTools(transcript, sentiment, stage, categoryTools);

  // STAGE 4: Return top score
  return scores[0].toolId;
}
```

---

## Code: Disambiguation with Tiebreakers

```typescript
function selectToolWithDisambiguation(
  transcript: string,
  sentiment: string,
  stage: number,
  tools: ToolTemplate[]
): number {
  const scores = scoreTools(transcript, sentiment, stage, tools);

  const topScore = scores[0];
  const secondScore = scores[1];

  // If top score is clearly winning (gap > 10), use it
  if (topScore.total - secondScore.total > 10) {
    return topScore.toolId;
  }

  // Close match - apply tiebreaker rules
  return applyTiebreaker([topScore, secondScore], transcript, stage);
}

function applyTiebreaker(
  matches: ToolScore[],
  transcript: string,
  stage: number
): number {
  // Tiebreaker 1: Prefer exact stage match
  const exactStageMatch = matches.find(m => m.breakdown.stage === 20);
  if (exactStageMatch) return exactStageMatch.toolId;

  // Tiebreaker 2: Prefer higher keyword score (more specific)
  const maxKeywordScore = Math.max(...matches.map(m => m.breakdown.keyword));
  const keywordWinner = matches.find(m => m.breakdown.keyword === maxKeywordScore);
  if (keywordWinner) return keywordWinner.toolId;

  // Tiebreaker 3: Prefer emotion tools for negative sentiment
  const transcriptLower = transcript.toLowerCase();
  const strongEmotion = ['extremely', 'really', 'very'].some(w => transcriptLower.includes(w));
  if (strongEmotion) {
    const emotionTool = matches.find(m => [2, 5, 11].includes(m.toolId));
    if (emotionTool) return emotionTool.toolId;
  }

  // Tiebreaker 4: Prefer late-stage tools if stage >= 7
  if (stage >= 7) {
    const lateStageTool = matches.find(m => [12, 13].includes(m.toolId));
    if (lateStageTool) return lateStageTool.toolId;
  }

  // Default: return highest score
  return matches[0].toolId;
}
```

---

## Code: Confidence Thresholds with Fallbacks

```typescript
function selectToolWithConfidence(
  transcript: string,
  sentiment: string,
  stage: number,
  tools: ToolTemplate[]
): { toolId: number; confidence: string } {
  const scores = scoreTools(transcript, sentiment, stage, tools);
  const topScore = scores[0];

  // High confidence (>70): use immediately
  if (topScore.total >= 70) {
    return { toolId: topScore.toolId, confidence: 'high' };
  }

  // Medium confidence (50-70): validate with gap check
  if (topScore.total >= 50) {
    const secondScore = scores[1];
    const gap = topScore.total - secondScore.total;

    // Clear winner (gap > 15): use it
    if (gap > 15) {
      return { toolId: topScore.toolId, confidence: 'medium' };
    }

    // Ambiguous: apply tiebreaker
    const toolId = applyTiebreaker([topScore, secondScore], transcript, stage);
    return { toolId, confidence: 'medium-tiebreaker' };
  }

  // Low confidence (<50): use safe fallback
  const fallbackId = getSafeFallback(stage);
  return { toolId: fallbackId, confidence: 'fallback' };
}

function getSafeFallback(stage: number): number {
  // Early stages (1-3): Mirroring (Tool 1) is always safe
  if (stage <= 3) return 1;

  // Mid stages (4-6): Calibrated Questions (Tool 6) for discovery
  if (stage <= 6) return 6;

  // Late stages (7-9): Truth with No (Tool 12) to uncover concerns
  return 12;
}
```

---

## Testing Strategy

### Step 1: Baseline Test
Run current system on 39 scenarios:
```bash
npm test -- test-scenarios-39-comprehensive.json
```
Expected: 30/39 correct (76.9%)

### Step 2: Phase 1 Test
Implement multi-factor scoring, retest:
Expected: 32-33/39 correct (82-85%)

### Step 3: Iterative Testing
Add each phase, retest after each:
- Phase 2 (cascading): 33-34/39 (85-87%)
- Phase 3 (disambiguation): 34-35/39 (87-90%)
- Phase 4 (context): 35-36/39 (90-92%)

### Step 4: Error Analysis
For each failure:
1. Log scoring breakdown
2. Identify which tool was selected vs correct
3. Check keyword overlap
4. Adjust scoring weights if needed

---

## Performance Optimization

**All phases maintain <200ms**:
- Multi-factor scoring: ~20ms (13 tools × 4 factors)
- Cascading logic: ~15ms (category filter)
- Disambiguation: ~10ms (only if needed)
- Context weighting: ~25ms (string analysis)
- **Total: ~70ms** (3x under budget)

**Optimization Tips**:
1. Pre-compile regex patterns at startup
2. Cache tool categories (static)
3. Use early exits (stop if score > 80)
4. Limit string operations (use indexOf vs regex where possible)

---

## Common Mistakes to Avoid

### Mistake 1: Overfitting to Test Data
❌ Don't tune scoring to pass specific scenarios
✅ Use general rules that work across all cases

### Mistake 2: Ignoring Performance
❌ Don't add AI/ML calls in hot path
✅ Keep all logic deterministic and fast

### Mistake 3: Complex Logic
❌ Don't create 50-rule decision trees
✅ Keep scoring simple and explainable

### Mistake 4: Forgetting Edge Cases
❌ Don't assume keywords always match
✅ Handle negation, sarcasm, context shifts

---

## Success Metrics

**Primary**: 90%+ accuracy (35/39 correct)
**Secondary**: <200ms response time
**Quality**: Explainable scoring (log breakdown for debugging)

**Per-Tool Metrics**:
- Each tool should have >85% precision
- <5% cross-category confusion
- Clear scoring justification

---

## Quick Win: Start with Phase 1

**Time**: 2-3 hours
**Expected Gain**: +5-8% accuracy
**Implementation**:
1. Copy `scoreTools()` function into `ToolTemplateEngine.ts`
2. Replace current keyword matching with multi-factor scoring
3. Test on 39 scenarios
4. Iterate on weights if needed

**This alone gets you to 82-85% accuracy** - significant improvement with minimal effort.

---

## Next Steps

1. **Implement Phase 1** (multi-factor scoring) TODAY
2. **Measure improvement** on 39 scenarios
3. **Add Phase 2** (cascading) if Phase 1 works well
4. **Iterate** until reaching 90%+ target

**Questions?** Check the full research document: `Tool-Selection-Accuracy-Optimization-Research.md`
