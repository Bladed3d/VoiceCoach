# VoiceCoach V2 - AI Pivot Implementation Plan (SIMPLIFIED)
**Phase 1: Direct Replacement - AI Tool Selection Focus**
**Date:** September 30, 2025
**Version:** 1.0 (Simplified)

---

## Executive Summary

**Approach:** Direct replacement - delete old AI generation code, implement new template system
**Backup:** System backed up, can restore if needed
**Timeline:** 1 week implementation
**Risk:** Low (backup available, clean slate implementation)

**Expected Improvement:**
- 3-5x faster prompt generation (200ms vs 1200ms)
- 85%+ tool selection accuracy
- 0% JSON parsing failures
- 0% hallucinations

---

## Implementation Strategy

### Direct Replacement (No Parallel Development)

**Day 1-2:** Build new components
**Day 3-4:** Delete old code, wire new system
**Day 5-6:** Test and validate
**Day 7:** Deploy or rollback to backup

**No feature flags, no parallel code, no bloat.**

---

## Files to DELETE

### Remove Completely (Old AI Generation System)

```
❌ src/services/coaching/OllamaPromptService.ts
   - Full prompt generation (800-2000ms)
   - Replaced by: ToolTemplateEngine + simple variable extraction

❌ src/services/coaching/OllamaPromptBuilder.ts
   - Complex prompt construction
   - No longer needed

❌ src/services/coaching/OllamaInstructionLoader.ts
   - Loads full instruction templates
   - Replaced by: Simple tool templates

❌ src/services/coaching/OllamaInstructionLoader-Browser.ts
   - Browser version of above
   - No longer needed

❌ src/services/coaching/ollama-service-enhanced.ts
   - Enhanced Ollama wrapper
   - Replaced by: Minimal Ollama calls for tool selection only

❌ src/services/coaching/ollama-compatibility-wrapper.ts
   - Compatibility layer
   - No longer needed with simpler approach

❌ src/services/coaching/mefs-coaching-orchestrator.ts (already deleted)
❌ src/services/coaching/mefs-tracker.ts (already deleted)
❌ src/services/coaching/smart-tool-selector.ts (already deleted)
```

### Keep (Will Modify)

```
✅ src/services/coaching/live-coaching-service.ts
   - Core orchestration (MODIFY: replace AI generation calls)

✅ src/services/coaching/sentiment-tool-selector.ts
   - Tool selection logic (MODIFY: add pattern matching)

✅ src/services/coaching/sentiment-analyzer.ts
   - Full sentiment analysis (INTEGRATE: make primary)

✅ src/services/coaching/enhanced-debounce.ts
   - Pain point tracking (KEEP: works well)

✅ src/services/coaching/SessionManagerService.ts
   - Session tracking (ADD: tool usage logging)

✅ src/services/coaching/ollama-service.ts
   - Basic Ollama connection (KEEP: for minimal AI calls)
```

---

## Files to CREATE

### New Components (Clean Implementation)

```
🆕 src/services/coaching/ToolTemplateEngine.ts
   - Manages 13 tool templates
   - Variable substitution
   - LED range: 6550-6599

🆕 src/services/coaching/PatternMatchingLibrary.ts
   - Instant tool selection via keywords
   - 60-70% hit rate without AI
   - LED range: 6600-6649

🆕 src/services/coaching/ToolUsageTracker.ts
   - Log tool shown/used/modified
   - Foundation for Phase 2 learning
   - LED range: 6650-6699

🆕 src/config/tool-templates.ts
   - Template definitions for 13 tools
   - Variable specifications
   - Pattern trigger definitions
```

---

## Implementation Steps (1 Week)

### Day 1: Create ToolTemplateEngine

**File:** `src/services/coaching/ToolTemplateEngine.ts`

**Full Implementation:**
```typescript
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

export interface ToolTemplate {
  id: number;
  name: string;
  type: 'proactive' | 'reactive';

  // Templates with variables
  templates: {
    pattern: string;              // "{{LAST_WORDS}}?"
    variables: string[];          // ["LAST_WORDS"]
    confidence: 'high' | 'medium' | 'low';
  }[];

  // Pattern triggers for instant selection
  triggers?: {
    keywords: string[];           // ["expensive", "cost"]
    regex?: RegExp;
    sentimentBias?: 'positive' | 'negative' | 'neutral';
    stageBias?: number[];         // [7, 8, 9]
  };
}

export class ToolTemplateEngine {
  private trail: BreadcrumbTrail;
  private tools: Map<number, ToolTemplate>;

  constructor() {
    this.trail = new BreadcrumbTrail('ToolTemplateEngine');
    this.tools = this.loadToolDefinitions();

    this.trail.light(6550, {
      operation: 'template_engine_initialized',
      toolCount: this.tools.size,
      timestamp: Date.now()
    });
  }

  /**
   * Load all 13 tool definitions
   */
  private loadToolDefinitions(): Map<number, ToolTemplate> {
    const tools = new Map<number, ToolTemplate>();

    // Tool 1: Mirroring (instant, no AI)
    tools.set(1, {
      id: 1,
      name: 'Mirroring',
      type: 'proactive',
      templates: [{
        pattern: '{{LAST_WORDS}}?',
        variables: ['LAST_WORDS'],
        confidence: 'high'
      }],
      triggers: {
        keywords: ['elaborate', 'more info'],
        sentimentBias: 'neutral'
      }
    });

    // Tool 13: Take Away (keyword trigger)
    tools.set(13, {
      id: 13,
      name: 'Take Away',
      type: 'reactive',
      templates: [
        {
          pattern: "You're absolutely right - if {{OBJECTION}} then we shouldn't move forward at all. What specifically about {{CONCERN}} concerns you?",
          variables: ['OBJECTION', 'CONCERN'],
          confidence: 'high'
        },
        {
          pattern: "I completely agree - if it's not obvious this will {{BENEFIT}}, don't do it. What makes you most uncertain?",
          variables: ['BENEFIT'],
          confidence: 'medium'
        }
      ],
      triggers: {
        keywords: ['expensive', 'not sure', 'maybe', 'think about it'],
        regex: /not sure|think about|maybe later/i,
        sentimentBias: 'negative',
        stageBias: [7, 8, 9]
      }
    });

    // Tool 2: Empathy Response
    tools.set(2, {
      id: 2,
      name: 'Empathy Response',
      type: 'reactive',
      templates: [{
        pattern: "It must be {{EMOTION}} dealing with {{SITUATION}}.",
        variables: ['EMOTION', 'SITUATION'],
        confidence: 'high'
      }],
      triggers: {
        keywords: ['frustrated', 'challenging', 'difficult', 'hard'],
        sentimentBias: 'negative',
        stageBias: [2, 3, 4, 5]
      }
    });

    // Tool 5: Labeling
    tools.set(5, {
      id: 5,
      name: 'Labeling',
      type: 'reactive',
      templates: [{
        pattern: "It seems like you're {{EMOTION}} about {{TOPIC}}.",
        variables: ['EMOTION', 'TOPIC'],
        confidence: 'high'
      }],
      triggers: {
        keywords: ['concerned', 'worried', 'skeptical'],
        sentimentBias: 'negative'
      }
    });

    // Tool 6: Calibrated Questions
    tools.set(6, {
      id: 6,
      name: 'Calibrated Questions',
      type: 'proactive',
      templates: [
        {
          pattern: "What would make {{TOPIC}} work for you?",
          variables: ['TOPIC'],
          confidence: 'high'
        },
        {
          pattern: "How do you see us addressing {{CONCERN}}?",
          variables: ['CONCERN'],
          confidence: 'medium'
        }
      ],
      triggers: {
        sentimentBias: 'neutral',
        stageBias: [4, 5, 6]
      }
    });

    // ... Define remaining 8 tools similarly
    // Tool 3: Empathy Questions
    // Tool 4: Summarizing
    // Tool 7: Negative Assumption
    // Tool 8: Dynamic Silence
    // Tool 9: Black Swan
    // Tool 10: Buy-In
    // Tool 11: DJ Voice
    // Tool 12: No Means Yes

    return tools;
  }

  /**
   * Fill template with variables (instant)
   */
  fillTemplate(
    toolId: number,
    variables: Record<string, string>,
    templateIndex: number = 0
  ): string {
    this.trail.light(6552, {
      operation: 'template_fill_start',
      toolId,
      variableCount: Object.keys(variables).length
    });

    const tool = this.tools.get(toolId);
    if (!tool) {
      this.trail.fail(8550, new Error(`Tool ${toolId} not found`));
      return "Tell me more about that."; // Fallback
    }

    const template = tool.templates[templateIndex];
    let result = template.pattern;

    // Replace all variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }

    this.trail.light(6553, {
      operation: 'template_filled',
      toolId,
      resultLength: result.length
    });

    return result;
  }

  /**
   * Extract simple variables without AI (instant)
   */
  extractSimpleVariables(toolId: number, transcript: string): Record<string, string> {
    const lower = transcript.toLowerCase();

    switch (toolId) {
      case 1: // Mirroring - last 1-3 words
        const words = transcript.trim().split(/\s+/);
        const lastWords = words.slice(-3).join(' ');
        return { LAST_WORDS: lastWords };

      case 5: // Labeling - detect emotion
        const emotions = ['concerned', 'worried', 'frustrated', 'excited', 'uncertain'];
        const detected = emotions.find(e => lower.includes(e)) || 'uncertain';

        // Extract topic (words after emotion word)
        const emotionIndex = lower.indexOf(detected);
        const afterEmotion = transcript.substring(emotionIndex + detected.length).trim();
        const topic = afterEmotion.split(' ').slice(0, 5).join(' ') || 'this';

        return { EMOTION: detected, TOPIC: topic };

      case 13: // Take Away - extract objection
        // Simple extraction: get phrase after trigger word
        if (lower.includes('expensive')) {
          return {
            OBJECTION: 'the cost is high',
            CONCERN: 'the budget'
          };
        }
        if (lower.includes('not sure')) {
          return {
            OBJECTION: "you're not certain",
            CONCERN: 'moving forward'
          };
        }
        return {
          OBJECTION: 'this concerns you',
          CONCERN: 'the decision'
        };

      default:
        return {};
    }
  }

  getTool(id: number): ToolTemplate | undefined {
    return this.tools.get(id);
  }

  getAllTools(): ToolTemplate[] {
    return Array.from(this.tools.values());
  }
}
```

**LEDs:**
- 6550: Engine initialized
- 6552: Template fill start
- 6553: Template filled
- 8550: Error

---

### Day 2: Create PatternMatchingLibrary

**File:** `src/services/coaching/PatternMatchingLibrary.ts`

```typescript
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { ToolTemplateEngine } from './ToolTemplateEngine';

export class PatternMatchingLibrary {
  private trail: BreadcrumbTrail;
  private templateEngine: ToolTemplateEngine;

  constructor(templateEngine: ToolTemplateEngine) {
    this.trail = new BreadcrumbTrail('PatternMatching');
    this.templateEngine = templateEngine;

    this.trail.light(6600, {
      operation: 'pattern_matcher_initialized',
      timestamp: Date.now()
    });
  }

  /**
   * Try instant pattern match (0-10ms)
   * Returns null if no confident match
   */
  matchTool(context: {
    transcript: string;
    sentiment: string;
    stage: number;
    engagement: string;
  }): { toolId: number; confidence: 'high' | 'medium' } | null {

    this.trail.light(6601, {
      operation: 'pattern_match_attempt',
      transcriptLength: context.transcript.length,
      sentiment: context.sentiment,
      stage: context.stage
    });

    const lower = context.transcript.toLowerCase();
    const tools = this.templateEngine.getAllTools();

    // Try each tool's triggers
    for (const tool of tools) {
      if (!tool.triggers) continue;

      // Keyword match
      if (tool.triggers.keywords) {
        const matched = tool.triggers.keywords.some(kw => lower.includes(kw));

        if (matched) {
          // Check sentiment bias
          const sentimentOk = !tool.triggers.sentimentBias ||
                             tool.triggers.sentimentBias === context.sentiment;

          // Check stage bias
          const stageOk = !tool.triggers.stageBias ||
                         tool.triggers.stageBias.includes(context.stage);

          if (sentimentOk && stageOk) {
            this.trail.light(6602, {
              operation: 'keyword_match',
              toolId: tool.id,
              toolName: tool.name,
              confidence: 'high'
            });

            return { toolId: tool.id, confidence: 'high' };
          }
        }
      }

      // Regex match
      if (tool.triggers.regex && tool.triggers.regex.test(lower)) {
        this.trail.light(6603, {
          operation: 'regex_match',
          toolId: tool.id,
          toolName: tool.name,
          confidence: 'medium'
        });

        return { toolId: tool.id, confidence: 'medium' };
      }
    }

    this.trail.light(6604, {
      operation: 'no_pattern_match',
      fallbackToAI: true
    });

    return null;
  }
}
```

**LEDs:**
- 6600: Matcher initialized
- 6601: Match attempt
- 6602: Keyword match (high confidence)
- 6603: Regex match (medium confidence)
- 6604: No match, need AI

---

### Day 3: Replace live-coaching-service.ts Core Logic

**File:** `src/services/coaching/live-coaching-service.ts`

**DELETE these methods:**
- `performEnhancedRealTimeAnalysis()` (calls old AI generation)
- All OllamaPromptService instantiation
- Complex prompt building logic

**REPLACE with:**
```typescript
import { ToolTemplateEngine } from './ToolTemplateEngine';
import { PatternMatchingLibrary } from './PatternMatchingLibrary';
import { SentimentAnalyzer } from './sentiment-analyzer';

export class LiveCoachingService {
  private templateEngine: ToolTemplateEngine;
  private patternMatcher: PatternMatchingLibrary;
  private sentimentAnalyzer: SentimentAnalyzer;
  // ... other existing properties

  constructor(config: LiveCoachingConfig) {
    // ... existing setup

    // NEW: Initialize template system
    this.templateEngine = new ToolTemplateEngine();
    this.patternMatcher = new PatternMatchingLibrary(this.templateEngine);
    this.sentimentAnalyzer = new SentimentAnalyzer();

    this.trail.light(6200, {
      operation: 'live_coaching_initialized_with_templates',
      timestamp: Date.now()
    });
  }

  /**
   * NEW: Generate prompt via template system
   */
  private async generatePromptViaTemplates(
    transcript: string,
    enhancedResult: any
  ): Promise<void> {

    if (this.isAnalyzing) return;
    this.isAnalyzing = true;

    try {
      const startTime = Date.now();

      // Step 1: Full sentiment analysis
      const sentiment = this.sentimentAnalyzer.analyzeResponse(transcript, 'prospect');

      this.trail.light(6251, {
        operation: 'sentiment_analyzed',
        type: sentiment.direction,
        trend: sentiment.trend,
        engagement: sentiment.engagement,
        confidence: sentiment.confidence
      });

      // Step 2: Build context
      const context = {
        transcript,
        sentiment: sentiment.direction,
        engagement: sentiment.engagement,
        stage: this.getCurrentStage(),
        painPoints: enhancedResult.painPoints
      };

      // Step 3: Try pattern match first (instant)
      const patternMatch = this.patternMatcher.matchTool(context);

      if (patternMatch && patternMatch.confidence === 'high') {
        // Got instant match!
        const variables = this.templateEngine.extractSimpleVariables(
          patternMatch.toolId,
          transcript
        );

        const prompt = this.templateEngine.fillTemplate(
          patternMatch.toolId,
          variables
        );

        const totalTime = Date.now() - startTime;

        this.trail.light(6252, {
          operation: 'prompt_via_pattern_match',
          toolId: patternMatch.toolId,
          totalTime,
          method: 'instant_pattern'
        });

        this.sendPromptToUI(prompt, patternMatch.toolId, totalTime);
        return;
      }

      // Step 4: Fallback to AI tool selection
      const aiToolId = await this.selectToolViaAI(context);

      const variables = this.templateEngine.extractSimpleVariables(
        aiToolId,
        transcript
      );

      const prompt = this.templateEngine.fillTemplate(aiToolId, variables);

      const totalTime = Date.now() - startTime;

      this.trail.light(6253, {
        operation: 'prompt_via_ai_selection',
        toolId: aiToolId,
        totalTime,
        method: 'ai_classification'
      });

      this.sendPromptToUI(prompt, aiToolId, totalTime);

    } catch (error) {
      this.trail.fail(8250, error as Error);
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * AI selects tool number only (fast, 200-400ms)
   */
  private async selectToolViaAI(context: any): Promise<number> {
    const prompt = `
PROSPECT: "${context.transcript}"
SENTIMENT: ${context.sentiment}
ENGAGEMENT: ${context.engagement}
STAGE: ${context.stage}/9

SELECT TOOL (1-13):
1=Mirroring, 2=Empathy Response, 3=Empathy Questions, 4=Summarizing,
5=Labeling, 6=Calibrated Questions, 7=Negative Assumption, 8=Dynamic Silence,
9=Black Swan, 10=Buy-In, 11=DJ Voice, 12=No Means Yes, 13=Take Away

Return ONLY the number.
`;

    const result = await (window as any).electronAPI.ollamaGenerate({
      prompt,
      model: getSelectedModel(),
      temperature: 0.1,
      max_tokens: 5
    });

    return parseInt(result.response?.trim() || '1');
  }

  /**
   * Send prompt to UI
   */
  private sendPromptToUI(prompt: string, toolId: number, processingTime: number): void {
    this.sessionManager?.notifyCoachingSuggestion({
      id: `tool_${toolId}_${Date.now()}`,
      text: prompt,
      timestamp: new Date().toISOString(),
      confidence: processingTime < 200 ? 0.95 : 0.85,
      reasoning: `Tool #${toolId} (${processingTime}ms)`,
      metadata: {
        toolId,
        processingTime,
        method: processingTime < 50 ? 'pattern' : 'ai'
      }
    });
  }
}
```

**LEDs:**
- 6251: Sentiment analyzed
- 6252: Prompt via pattern match
- 6253: Prompt via AI selection
- 8250: Error

---

### Day 4: Update sentiment-tool-selector.ts

**File:** `src/services/coaching/sentiment-tool-selector.ts`

**REPLACE entire file:**
```typescript
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { ToolTemplateEngine } from './ToolTemplateEngine';
import { PatternMatchingLibrary } from './PatternMatchingLibrary';
import { getSelectedModel } from '../../lib/model-utils';

export interface ToolSelection {
  toolId: number;
  confidence: 'high' | 'medium' | 'low';
  method: 'pattern_match' | 'ai_classification' | 'fallback';
  processingTime: number;
}

export class SentimentToolSelector {
  private trail: BreadcrumbTrail;
  private templateEngine: ToolTemplateEngine;
  private patternMatcher: PatternMatchingLibrary;

  constructor() {
    this.trail = new BreadcrumbTrail('ToolSelector');
    this.templateEngine = new ToolTemplateEngine();
    this.patternMatcher = new PatternMatchingLibrary(this.templateEngine);

    this.trail.light(6500, {
      operation: 'tool_selector_initialized',
      timestamp: Date.now()
    });
  }

  /**
   * Main entry point: select tool
   */
  async selectTool(context: {
    transcript: string;
    sentiment: string;
    engagement: string;
    stage: number;
  }): Promise<ToolSelection> {

    const startTime = Date.now();

    // Try pattern match first
    const patternMatch = this.patternMatcher.matchTool(context);

    if (patternMatch && patternMatch.confidence === 'high') {
      return {
        toolId: patternMatch.toolId,
        confidence: 'high',
        method: 'pattern_match',
        processingTime: Date.now() - startTime
      };
    }

    // Fallback to AI
    const aiToolId = await this.aiSelectTool(context);

    return {
      toolId: aiToolId,
      confidence: 'medium',
      method: 'ai_classification',
      processingTime: Date.now() - startTime
    };
  }

  /**
   * AI classification (200-400ms)
   */
  private async aiSelectTool(context: any): Promise<number> {
    const prompt = `
PROSPECT: "${context.transcript}"
SENTIMENT: ${context.sentiment}
ENGAGEMENT: ${context.engagement}
STAGE: ${context.stage}/9

SELECT TOOL (1-13):
1=Mirroring, 2=Empathy Response, 3=Empathy Questions, 4=Summarizing,
5=Labeling, 6=Calibrated Questions, 7=Negative Assumption, 8=Dynamic Silence,
9=Black Swan, 10=Buy-In, 11=DJ Voice, 12=No Means Yes, 13=Take Away

Return ONLY the number.
`;

    const result = await (window as any).electronAPI.ollamaGenerate({
      prompt,
      model: getSelectedModel(),
      temperature: 0.1,
      max_tokens: 5
    });

    return parseInt(result.response?.trim() || '1');
  }

  getTemplateEngine(): ToolTemplateEngine {
    return this.templateEngine;
  }
}
```

---

### Day 5-6: Testing

**Test File:** `src/tests/template-system.test.ts`

```typescript
import { ToolTemplateEngine } from '../services/coaching/ToolTemplateEngine';
import { PatternMatchingLibrary } from '../services/coaching/PatternMatchingLibrary';

describe('ToolTemplateEngine', () => {
  let engine: ToolTemplateEngine;

  beforeEach(() => {
    engine = new ToolTemplateEngine();
  });

  test('Mirroring fills correctly', () => {
    const result = engine.fillTemplate(1, { LAST_WORDS: 'expensive' });
    expect(result).toBe('expensive?');
  });

  test('Take Away fills with objection', () => {
    const result = engine.fillTemplate(13, {
      OBJECTION: 'the cost is too high',
      CONCERN: 'the budget'
    });

    expect(result).toContain('the cost is too high');
    expect(result).toContain("shouldn't move forward");
  });
});

describe('PatternMatchingLibrary', () => {
  let engine: ToolTemplateEngine;
  let matcher: PatternMatchingLibrary;

  beforeEach(() => {
    engine = new ToolTemplateEngine();
    matcher = new PatternMatchingLibrary(engine);
  });

  test('Matches "expensive" to Tool #13', () => {
    const result = matcher.matchTool({
      transcript: "That's too expensive",
      sentiment: 'negative',
      stage: 8,
      engagement: 'medium'
    });

    expect(result?.toolId).toBe(13);
    expect(result?.confidence).toBe('high');
  });

  test('Returns null for no match', () => {
    const result = matcher.matchTool({
      transcript: "Tell me about your product",
      sentiment: 'neutral',
      stage: 2,
      engagement: 'high'
    });

    expect(result).toBeNull();
  });
});
```

**Manual Testing:**
1. Start app, load RAG document
2. Start recording, say "expensive" → Should show Tool #13 in <50ms
3. Say complex objection → Should show appropriate tool in <400ms
4. Check LED breadcrumbs: `window.debug.breadcrumbs.getRange(6550, 6699)`
5. Verify no JSON parsing errors
6. Verify prompts match 13-tool methodology

---

### Day 7: Deploy or Rollback

**Success Criteria:**
- ✅ Prompts generate in <400ms average
- ✅ No JSON parsing errors
- ✅ Pattern matching works for common triggers
- ✅ LED breadcrumbs show clean flow

**If successful:** Commit and deploy
**If issues:** Restore backup, analyze LEDs, fix and retry

---

## LED Breadcrumb Ranges

**6550-6599: ToolTemplateEngine**
- 6550: Initialized
- 6552: Template fill start
- 6553: Template filled
- 8550: Error

**6600-6649: PatternMatchingLibrary**
- 6600: Initialized
- 6601: Match attempt
- 6602: Keyword match
- 6603: Regex match
- 6604: No match

**6200-6270: Live Coaching Flow**
- 6251: Sentiment analyzed
- 6252: Prompt via pattern
- 6253: Prompt via AI
- 8250: Error

---

## Success Metrics

**Week 1 Targets:**
- ✅ 70%+ prompts via pattern match (<50ms)
- ✅ 30% via AI classification (<400ms)
- ✅ 0% JSON parsing failures
- ✅ 0% hallucinations
- ✅ Average time: <200ms

---

## Rollback Plan

**If system fails:**
1. Restore backup (5 minutes)
2. Check LED failures: `window.debug.breadcrumbs.getFailures()`
3. Review specific LED ranges for issues
4. Fix identified problems
5. Redeploy

---

## Timeline

**1 Week Total:**
- Day 1: ToolTemplateEngine
- Day 2: PatternMatchingLibrary
- Day 3: Replace live-coaching-service.ts
- Day 4: Update sentiment-tool-selector.ts
- Day 5-6: Test and validate
- Day 7: Deploy or rollback

**Clean, simple, no bloat.**
