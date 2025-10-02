# VoiceCoach V2 - AI Pivot Implementation Plan
**Phase 1: AI Tool Selection Focus**
**Date:** September 30, 2025
**Version:** 1.0

---

## Executive Summary

**Current State:** AI generates full prompt text (800-2000ms, inconsistent quality, JSON parsing failures)

**Target State:** AI selects best tool (1-13), templates fill variables (200-400ms, guaranteed quality, no parsing errors)

**Expected Improvement:**
- 3-5x faster prompt generation
- 85%+ tool selection accuracy
- 90% reduction in hallucinations
- Consistent methodology adherence

---

## Table of Contents
1. [Current System Assessment](#current-system-assessment)
2. [Migration Strategy](#migration-strategy)
3. [Implementation Steps](#implementation-steps)
4. [LED Breadcrumb Integration](#led-breadcrumb-integration)
5. [Testing & Validation](#testing--validation)
6. [Success Metrics](#success-metrics)

---

## Current System Assessment

### Existing Components (What We Keep)

#### ✅ **1. Sentiment Analysis Infrastructure**
**Location:** `src/services/coaching/`
- `sentiment-analyzer.ts` - Rich sentiment analysis (UNUSED but valuable)
- `enhanced-debounce.ts` - Fast keyword sentiment (CURRENTLY USED)

**Status:** Keep both, integrate sentiment-analyzer as primary
**Migration:** Wire sentiment-analyzer output to tool selection

#### ✅ **2. Tool Data (13 Tools RAG)**
**Location:** `rag/13ToolsRAG-01.json`, `docs/13-Tools.md`
- Complete tool definitions with triggers, examples, when_use
- Structured for pattern matching

**Status:** Perfect for new architecture
**Migration:** Extract triggers into pattern library

#### ✅ **3. Speaker Detection & Volume Monitoring**
**Location:** `src/services/audio/DualVolumeMonitoringService.ts`
- Accurate user vs prospect identification
- Volume-based speaker changes

**Status:** Critical for filtering prospect-only coaching
**Migration:** No changes needed, already integrated

#### ✅ **4. Session Management**
**Location:** `src/services/coaching/SessionManagerService.ts`
- Conversation history tracking
- Call outcome recording
- Stage management

**Status:** Foundation for learning system
**Migration:** Add tool usage tracking fields

#### ✅ **5. LED Breadcrumb System**
**Location:** `src/lib/breadcrumb-system.ts`
- Ranges 6000-6099 for live coaching
- Real-time debugging capability

**Status:** Expand for new tool selection flow
**Migration:** Add new LEDs for template engine

---

### Components to Replace/Refactor

#### ❌ **1. OllamaPromptService (HEAVY REFACTOR)**
**Location:** `src/services/coaching/OllamaPromptService.ts`
**Current Role:** Builds full prompt, calls Ollama for text generation
**New Role:** Extract variables only (minimal AI use)

**Changes:**
- Remove `buildPrompt()` method (full prompt generation)
- Add `extractVariables()` method (5-10 word extraction)
- Add `selectTool()` method (returns 1-13)
- Keep Ollama connection infrastructure

#### ❌ **2. SentimentToolSelector (MODERATE REFACTOR)**
**Location:** `src/services/coaching/sentiment-tool-selector.ts`
**Current Role:** Simple sentiment-based tool selection
**New Role:** Primary tool selector with pattern matching

**Changes:**
- Add pattern matching library (instant triggers)
- Integrate full sentiment-analyzer (not just enhanced-debounce)
- Add confidence scoring (high/medium/low)
- Add fallback strategies (Mirroring default)

#### ❌ **3. LiveCoachingService (MODERATE REFACTOR)**
**Location:** `src/services/coaching/live-coaching-service.ts`
**Current Role:** Orchestrates transcript → AI prompt generation
**New Role:** Orchestrates transcript → tool selection → template fill

**Changes:**
- Replace `performEnhancedRealTimeAnalysis()` with `selectToolAndFill()`
- Add template engine calls
- Add tool usage tracking
- Keep transcript processing pipeline

---

### Components to Create (New)

#### 🆕 **1. ToolTemplateEngine**
**Location:** `src/services/coaching/ToolTemplateEngine.ts` (NEW FILE)
**Purpose:** Manages 13 tool templates with variable substitution

**Responsibilities:**
- Load template definitions for all 13 tools
- Fill variables (OBJECTION, PAIN_POINT, etc.)
- Apply user style preferences (learned modifications)
- Return final prompt text

**LED Range:** 6550-6599

#### 🆕 **2. PatternMatchingLibrary**
**Location:** `src/services/coaching/PatternMatchingLibrary.ts` (NEW FILE)
**Purpose:** Instant tool selection via keyword/regex triggers

**Responsibilities:**
- Match transcript against trigger patterns
- Return tool ID instantly (0-10ms)
- Handle 60-70% of prompts without AI

**LED Range:** 6600-6649

#### 🆕 **3. ToolUsageTracker**
**Location:** `src/services/coaching/ToolUsageTracker.ts` (NEW FILE)
**Purpose:** Track tool shown vs used, build user preferences

**Responsibilities:**
- Log every tool shown/used/modified
- Calculate usage rates per user
- Identify winning sequences
- Export for learning system (Phase 2)

**LED Range:** 6650-6699

---

## Migration Strategy

### Phase Approach: Parallel Development

**Week 1: Build New, Don't Break Old**
- Create new ToolTemplateEngine alongside existing system
- Test template filling independently
- Validate pattern matching accuracy

**Week 2: Wire New System**
- Connect ToolTemplateEngine to LiveCoachingService
- Add feature flag: `USE_TEMPLATE_ENGINE` (default: false)
- A/B test old vs new approach

**Week 3: Cutover**
- Set `USE_TEMPLATE_ENGINE = true`
- Monitor LED breadcrumbs for failures
- Deprecate old prompt generation code

**Week 4: Cleanup**
- Remove dead code
- Optimize template engine
- Prepare for Phase 2 (learning system)

---

## Implementation Steps

### Step 1: Create ToolTemplateEngine (2-3 days)

**File:** `src/services/coaching/ToolTemplateEngine.ts`

**Template Structure:**
```typescript
interface ToolTemplate {
  id: number;
  name: string;
  type: 'proactive' | 'reactive';

  // Pattern matching (instant selection)
  triggers?: {
    keywords: string[];        // ["expensive", "cost", "budget"]
    regex?: RegExp;            // /not sure|maybe|think about it/i
    sentimentBias?: string;    // "negative" = prefer this tool
    stageBias?: number[];      // [7, 8, 9] = late stage
  };

  // Template variations (pick best for context)
  templates: {
    pattern: string;           // "You're right - if {{OBJECTION}} then..."
    variables: string[];       // ["OBJECTION", "CONCERN"]
    confidence: 'high' | 'medium' | 'low';
    when: string;              // "Late stage, objection present"
  }[];

  // Variable extraction hints for AI
  aiExtraction?: {
    prompt: string;            // "Extract the objection phrase (3-5 words)"
    maxTokens: number;         // 10
    variables: string[];       // ["OBJECTION"]
  };
}
```

**Implementation:**
```typescript
export class ToolTemplateEngine {
  private trail: BreadcrumbTrail;
  private tools: Map<number, ToolTemplate> = new Map();

  constructor() {
    this.trail = new BreadcrumbTrail('ToolTemplateEngine');
    this.loadToolTemplates();

    this.trail.light(6550, {
      operation: 'template_engine_initialized',
      toolCount: this.tools.size,
      timestamp: Date.now()
    });
  }

  /**
   * Load 13 tool templates from RAG + custom definitions
   */
  private async loadToolTemplates(): Promise<void> {
    // Load base data from 13ToolsRAG-01.json
    const ragData = await this.loadRagTools();

    // Enhance with template patterns
    this.tools.set(1, {
      id: 1,
      name: 'Mirroring',
      type: 'proactive',
      triggers: {
        keywords: ['elaborate', 'short response'],
        sentimentBias: 'neutral'
      },
      templates: [
        {
          pattern: '{{LAST_WORDS}}?',
          variables: ['LAST_WORDS'],
          confidence: 'high',
          when: 'Any context, need more info'
        }
      ]
    });

    this.tools.set(13, {
      id: 13,
      name: 'Take Away',
      type: 'reactive',
      triggers: {
        keywords: ['expensive', 'not sure', 'maybe', 'think about it'],
        regex: /not sure|think about|maybe later/i,
        sentimentBias: 'negative',
        stageBias: [7, 8, 9]
      },
      templates: [
        {
          pattern: "You're absolutely right - if {{OBJECTION}} then we shouldn't move forward at all. What specifically about {{CONCERN}} concerns you?",
          variables: ['OBJECTION', 'CONCERN'],
          confidence: 'high',
          when: 'Late stage objection'
        },
        {
          pattern: "I completely agree - if it's not obvious this will {{DELIVER_VALUE}}, don't do it. What makes you most uncertain?",
          variables: ['DELIVER_VALUE'],
          confidence: 'medium',
          when: 'Value uncertainty'
        }
      ],
      aiExtraction: {
        prompt: 'Extract: 1) The objection phrase, 2) The underlying concern. Return as JSON: {"objection": "...", "concern": "..."}',
        maxTokens: 20,
        variables: ['OBJECTION', 'CONCERN']
      }
    });

    // ... define all 13 tools

    this.trail.light(6551, {
      operation: 'tool_templates_loaded',
      toolCount: this.tools.size,
      totalTemplates: Array.from(this.tools.values())
        .reduce((sum, tool) => sum + tool.templates.length, 0)
    });
  }

  /**
   * Fill template with extracted variables
   */
  fillTemplate(
    toolId: number,
    templateIndex: number,
    variables: Record<string, string>
  ): string {
    this.trail.light(6552, {
      operation: 'template_fill_start',
      toolId,
      templateIndex,
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
      resultLength: result.length,
      processingTime: '<5ms'
    });

    return result;
  }

  /**
   * Get tool definition for pattern matching
   */
  getTool(id: number): ToolTemplate | undefined {
    return this.tools.get(id);
  }

  /**
   * Get all tools for AI prompt context
   */
  getAllTools(): ToolTemplate[] {
    return Array.from(this.tools.values());
  }
}
```

**LED Breadcrumbs:**
- 6550: Template engine initialized
- 6551: Tool templates loaded
- 6552: Template fill start
- 6553: Template filled successfully
- 8550: Template fill error

---

### Step 2: Create PatternMatchingLibrary (1-2 days)

**File:** `src/services/coaching/PatternMatchingLibrary.ts`

**Purpose:** Instant tool selection without AI (60-70% hit rate)

**Implementation:**
```typescript
export class PatternMatchingLibrary {
  private trail: BreadcrumbTrail;
  private templateEngine: ToolTemplateEngine;

  constructor(templateEngine: ToolTemplateEngine) {
    this.trail = new BreadcrumbTrail('PatternMatching');
    this.templateEngine = templateEngine;

    this.trail.light(6600, {
      operation: 'pattern_matching_initialized',
      timestamp: Date.now()
    });
  }

  /**
   * Attempt instant tool match via patterns
   * Returns null if no confident match (fallback to AI)
   */
  matchTool(context: {
    transcript: string;
    sentiment: string;
    stage: number;
    engagement: string;
  }): { toolId: number; confidence: 'high' | 'medium' } | null {

    this.trail.light(6601, {
      operation: 'pattern_match_start',
      transcriptLength: context.transcript.length,
      sentiment: context.sentiment,
      stage: context.stage
    });

    const lowerTranscript = context.transcript.toLowerCase();

    // Try each tool's triggers in priority order
    const allTools = this.templateEngine.getAllTools();

    for (const tool of allTools) {
      if (!tool.triggers) continue;

      // Check keyword matches
      if (tool.triggers.keywords) {
        const matchedKeywords = tool.triggers.keywords.filter(
          kw => lowerTranscript.includes(kw)
        );

        if (matchedKeywords.length > 0) {
          // Check sentiment bias
          const sentimentMatch = !tool.triggers.sentimentBias ||
                                 tool.triggers.sentimentBias === context.sentiment;

          // Check stage bias
          const stageMatch = !tool.triggers.stageBias ||
                            tool.triggers.stageBias.includes(context.stage);

          if (sentimentMatch && stageMatch) {
            this.trail.light(6602, {
              operation: 'pattern_matched',
              toolId: tool.id,
              toolName: tool.name,
              matchedKeywords,
              confidence: 'high'
            });

            return { toolId: tool.id, confidence: 'high' };
          }
        }
      }

      // Check regex matches
      if (tool.triggers.regex) {
        const regexMatch = tool.triggers.regex.test(lowerTranscript);

        if (regexMatch) {
          this.trail.light(6603, {
            operation: 'regex_matched',
            toolId: tool.id,
            toolName: tool.name,
            pattern: tool.triggers.regex.source,
            confidence: 'medium'
          });

          return { toolId: tool.id, confidence: 'medium' };
        }
      }
    }

    // No pattern match
    this.trail.light(6604, {
      operation: 'no_pattern_match',
      transcript: context.transcript.substring(0, 50),
      fallbackToAI: true
    });

    return null;
  }
}
```

**LED Breadcrumbs:**
- 6600: Pattern matching initialized
- 6601: Pattern match start
- 6602: Keyword pattern matched (high confidence)
- 6603: Regex pattern matched (medium confidence)
- 6604: No pattern match, fallback to AI

---

### Step 3: Refactor SentimentToolSelector (2 days)

**File:** `src/services/coaching/sentiment-tool-selector.ts`

**Changes:**
1. Integrate full `SentimentAnalyzer` (not just enhanced-debounce)
2. Add pattern matching as first pass
3. Add AI classification as fallback
4. Add confidence scoring

**New Flow:**
```typescript
export class SentimentToolSelector {
  private trail: BreadcrumbTrail;
  private templateEngine: ToolTemplateEngine;
  private patternMatcher: PatternMatchingLibrary;
  private sentimentAnalyzer: SentimentAnalyzer;

  async selectTool(context: SimplifiedContext): Promise<ToolSelection> {
    this.trail.light(6503, {
      operation: 'tool_selection_start',
      stage: context.stage,
      sentiment: context.sentiment.type,
      transcript_length: context.transcript.length
    });

    // TIER 1: Pattern Matching (instant, 60-70% hit rate)
    const patternMatch = this.patternMatcher.matchTool({
      transcript: context.transcript,
      sentiment: context.sentiment.type,
      stage: context.stage,
      engagement: context.engagement
    });

    if (patternMatch && patternMatch.confidence === 'high') {
      // Instant match, no AI needed
      this.trail.light(6504, {
        operation: 'instant_pattern_match',
        toolId: patternMatch.toolId,
        confidence: 'high',
        processingTime: '<10ms'
      });

      return {
        toolId: patternMatch.toolId,
        confidence: 'high',
        method: 'pattern_match',
        processingTime: 5
      };
    }

    // TIER 2: AI Classification (200-400ms)
    const aiSelection = await this.aiSelectTool(context);

    this.trail.light(6505, {
      operation: 'ai_tool_selected',
      toolId: aiSelection.toolId,
      confidence: aiSelection.confidence,
      processingTime: aiSelection.processingTime
    });

    return aiSelection;
  }

  private async aiSelectTool(context: SimplifiedContext): Promise<ToolSelection> {
    const startTime = Date.now();

    // Build minimal AI prompt (just need number 1-13)
    const prompt = `
PROSPECT: "${context.transcript}"
SENTIMENT: ${context.sentiment.type} (confidence: ${context.sentiment.confidence})
ENGAGEMENT: ${context.engagement}
STAGE: ${context.stage}/9
PAIN POINTS: ${context.painPoints.leadingPainPoint || 'none'}

SELECT TOOL (1-13):
1=Mirroring, 2=Empathy Response, 3=Empathy Questions, 4=Summarizing,
5=Labeling, 6=Calibrated Questions, 7=Negative Assumption, 8=Dynamic Silence,
9=Black Swan, 10=Buy-In, 11=DJ Voice, 12=No Means Yes, 13=Take Away

Return ONLY the number (1-13).
`;

    const result = await (window as any).electronAPI.ollamaGenerate({
      prompt,
      model: getSelectedModel(),
      temperature: 0.1,  // Low variance for consistency
      max_tokens: 5      // Just need "13"
    });

    const toolId = parseInt(result.response?.trim() || '1');
    const processingTime = Date.now() - startTime;

    return {
      toolId,
      confidence: processingTime < 300 ? 'high' : 'medium',
      method: 'ai_classification',
      processingTime
    };
  }
}
```

---

### Step 4: Integrate Full SentimentAnalyzer (1 day)

**Current:** `enhanced-debounce.ts` provides basic keyword sentiment
**New:** Wire up `sentiment-analyzer.ts` for rich analysis

**Changes in `live-coaching-service.ts`:**
```typescript
// OLD (simplified)
const sentiment = enhancedDebounce.getSentiment();  // basic

// NEW (comprehensive)
import { SentimentAnalyzer } from './sentiment-analyzer';

const sentimentAnalyzer = new SentimentAnalyzer();
const fullAnalysis = sentimentAnalyzer.analyzeResponse(transcript, 'prospect');

const context = {
  sentiment: fullAnalysis,  // Now includes trend, engagement, confidence
  stage: this.getCurrentStage(),
  transcript,
  painPoints: enhancedDebounce.getPainPoints(),
  engagement: fullAnalysis.engagement  // NEW
};
```

**LED Breadcrumbs:**
- 6210: Full sentiment analysis start
- 6211: Sentiment trend detected (improving/declining/stable)
- 6212: Engagement level determined (high/medium/low)
- 6213: Full sentiment analysis complete

---

### Step 5: Add Variable Extraction to OllamaPromptService (1-2 days)

**File:** `src/services/coaching/OllamaPromptService.ts`

**New Method:**
```typescript
/**
 * Extract variables for template filling (fast, 150-200ms)
 * Replaces full prompt generation for complex tools
 */
async extractVariables(
  toolId: number,
  transcript: string,
  context: any
): Promise<Record<string, string>> {

  this.trail.light(6420, {
    operation: 'variable_extraction_start',
    toolId,
    transcriptLength: transcript.length
  });

  const tool = this.templateEngine.getTool(toolId);

  if (!tool?.aiExtraction) {
    // Tool doesn't need AI extraction, use simple parsing
    return this.simpleExtraction(toolId, transcript);
  }

  // AI extracts specific variables only
  const result = await (window as any).electronAPI.ollamaGenerate({
    prompt: tool.aiExtraction.prompt.replace('{{TRANSCRIPT}}', transcript),
    model: getSelectedModel(),
    temperature: 0.1,
    max_tokens: tool.aiExtraction.maxTokens
  });

  try {
    const variables = JSON.parse(result.response || '{}');

    this.trail.light(6421, {
      operation: 'variables_extracted',
      toolId,
      variableCount: Object.keys(variables).length,
      variables: Object.keys(variables)
    });

    return variables;

  } catch (error) {
    this.trail.fail(8420, error as Error);
    return {}; // Fallback to empty variables
  }
}

/**
 * Simple variable extraction without AI (instant)
 */
private simpleExtraction(toolId: number, transcript: string): Record<string, string> {
  switch (toolId) {
    case 1: // Mirroring
      return {
        LAST_WORDS: this.extractLastWords(transcript, 3)
      };

    case 5: // Labeling
      const emotions = ['concerned', 'worried', 'frustrated', 'excited'];
      const detected = emotions.find(e => transcript.toLowerCase().includes(e));
      return {
        EMOTION: detected || 'uncertain'
      };

    // ... other simple extractions

    default:
      return {};
  }
}
```

**LED Breadcrumbs:**
- 6420: Variable extraction start
- 6421: Variables extracted successfully
- 8420: Variable extraction failed

---

### Step 6: Wire ToolTemplateEngine into LiveCoachingService (2-3 days)

**File:** `src/services/coaching/live-coaching-service.ts`

**New Flow:**
```typescript
private async performEnhancedRealTimeAnalysis(
  triggerTranscript: string,
  enhancedResult: EnhancedDebounceResult
): Promise<void> {

  if (this.isAnalyzing) return;
  this.isAnalyzing = true;

  try {
    const startTime = Date.now();

    // Step 1: Get full sentiment analysis
    const fullSentiment = this.sentimentAnalyzer.analyzeResponse(
      triggerTranscript,
      'prospect'
    );

    this.trail.light(6251, {
      operation: 'enhanced_analysis_start',
      sentiment: fullSentiment.direction,
      trend: fullSentiment.trend,
      engagement: fullSentiment.engagement,
      confidence: fullSentiment.confidence
    });

    // Step 2: Build context for tool selection
    const context = {
      transcript: triggerTranscript,
      sentiment: fullSentiment,
      engagement: fullSentiment.engagement,
      stage: this.getCurrentStage(),
      painPoints: enhancedResult.painPoints,
      conversationHistory: this.getRecentHistory(5)
    };

    // Step 3: Select tool (pattern match or AI)
    const toolSelection = await this.sentimentToolSelector.selectTool(context);

    this.trail.light(6252, {
      operation: 'tool_selected',
      toolId: toolSelection.toolId,
      method: toolSelection.method,
      confidence: toolSelection.confidence,
      processingTime: toolSelection.processingTime
    });

    // Step 4: Extract variables (if needed)
    let variables: Record<string, string> = {};

    if (toolSelection.needsVariables) {
      variables = await this.ollamaPromptService.extractVariables(
        toolSelection.toolId,
        triggerTranscript,
        context
      );

      this.trail.light(6253, {
        operation: 'variables_extracted',
        variableCount: Object.keys(variables).length
      });
    }

    // Step 5: Fill template
    const finalPrompt = this.templateEngine.fillTemplate(
      toolSelection.toolId,
      0, // Use first template variant (can add selection logic later)
      variables
    );

    const totalTime = Date.now() - startTime;

    this.trail.light(6254, {
      operation: 'prompt_generated_via_template',
      toolId: toolSelection.toolId,
      promptLength: finalPrompt.length,
      totalTime,
      performance: totalTime < 200 ? 'excellent' :
                   totalTime < 400 ? 'good' : 'acceptable'
    });

    // Step 6: Send to UI
    this.sessionManager?.notifyCoachingSuggestion({
      id: `template_${Date.now()}`,
      text: finalPrompt,
      timestamp: new Date().toISOString(),
      confidence: toolSelection.confidence === 'high' ? 0.9 : 0.7,
      reasoning: `Tool #${toolSelection.toolId} via ${toolSelection.method}`,
      metadata: {
        toolId: toolSelection.toolId,
        method: toolSelection.method,
        processingTime: totalTime
      }
    });

  } catch (error) {
    this.trail.fail(8251, error as Error);
  } finally {
    this.isAnalyzing = false;
  }
}
```

---

### Step 7: Add "Buying Time" with Mirroring Default (1 day)

**Fallback Strategy:**
```typescript
async selectToolWithFallback(context: SimplifiedContext): Promise<string> {
  const startTime = Date.now();

  // Start tool selection (may take 200-400ms)
  const selectionPromise = this.selectTool(context);

  // Wait max 150ms for result
  const timeoutPromise = new Promise(resolve =>
    setTimeout(() => resolve(null), 150)
  );

  const result = await Promise.race([selectionPromise, timeoutPromise]);

  if (!result) {
    // AI is slow, show Mirroring immediately
    this.trail.light(6260, {
      operation: 'fallback_to_mirroring',
      reason: 'ai_timeout',
      threshold: 150
    });

    const mirroringPrompt = this.generateMirroringPrompt(context.transcript);

    // Continue AI selection in background for next prompt
    selectionPromise.then(delayed => {
      this.cacheLearning(delayed);  // Use for next time
    });

    return mirroringPrompt;
  }

  // Got result in time
  return this.fillTemplate(result);
}
```

**LED Breadcrumbs:**
- 6260: Fallback to Mirroring (AI timeout)
- 6261: Mirroring prompt generated (instant)
- 6262: Background AI result cached for learning

---

## LED Breadcrumb Integration

### New LED Ranges

**6550-6599: ToolTemplateEngine**
- 6550: Engine initialized
- 6551: Templates loaded
- 6552: Template fill start
- 6553: Template filled successfully
- 6554: User style applied (learned modification)
- 8550: Template error

**6600-6649: PatternMatchingLibrary**
- 6600: Pattern matcher initialized
- 6601: Pattern match attempt
- 6602: Keyword match (high confidence)
- 6603: Regex match (medium confidence)
- 6604: No match, fallback to AI
- 8600: Pattern matching error

**6650-6699: ToolUsageTracker**
- 6650: Tracker initialized
- 6651: Tool shown logged
- 6652: Tool used logged
- 6653: Tool modified logged
- 6654: Usage pattern detected
- 6655: Winning sequence identified

**6200-6220: Enhanced Sentiment**
- 6210: Full sentiment analysis start
- 6211: Sentiment trend detected
- 6212: Engagement level determined
- 6213: Full analysis complete

**6250-6270: Tool Selection Flow**
- 6251: Enhanced analysis start (with full sentiment)
- 6252: Tool selected (pattern or AI)
- 6253: Variables extracted
- 6254: Prompt generated via template
- 6260: Fallback to Mirroring
- 6261: Mirroring generated
- 6262: Background AI cached

### LED Debugging Commands

**Add to `window.debug.breadcrumbs`:**
```typescript
getToolSelection() {
  return window.debug.breadcrumbs.getRange(6250, 6270);
}

getTemplateOperations() {
  return window.debug.breadcrumbs.getRange(6550, 6599);
}

getPatternMatches() {
  return window.debug.breadcrumbs.getRange(6600, 6649);
}

getToolSelectionPerformance() {
  const leds = this.getRange(6250, 6270);
  return leds
    .filter(led => led.data?.totalTime)
    .map(led => ({
      time: led.data.totalTime,
      method: led.data.method,
      toolId: led.data.toolId
    }));
}
```

---

## Testing & Validation

### Unit Tests

**Test 1: Template Filling**
```typescript
describe('ToolTemplateEngine', () => {
  it('should fill Mirroring template correctly', () => {
    const engine = new ToolTemplateEngine();
    const result = engine.fillTemplate(1, 0, {
      LAST_WORDS: 'expensive'
    });

    expect(result).toBe('Expensive?');
  });

  it('should fill Take Away with multiple variables', () => {
    const result = engine.fillTemplate(13, 0, {
      OBJECTION: 'not sure about ROI',
      CONCERN: 'the investment level'
    });

    expect(result).toContain('not sure about ROI');
    expect(result).toContain('the investment level');
  });
});
```

**Test 2: Pattern Matching**
```typescript
describe('PatternMatchingLibrary', () => {
  it('should match "expensive" to Tool #13', () => {
    const matcher = new PatternMatchingLibrary(engine);
    const result = matcher.matchTool({
      transcript: "That seems really expensive",
      sentiment: 'negative',
      stage: 8,
      engagement: 'medium'
    });

    expect(result?.toolId).toBe(13);
    expect(result?.confidence).toBe('high');
  });

  it('should return null for no match', () => {
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

**Test 3: Variable Extraction**
```typescript
describe('Variable Extraction', () => {
  it('should extract last 3 words for Mirroring', async () => {
    const service = new OllamaPromptService();
    const vars = await service.extractVariables(
      1,
      "I'm concerned about the budget",
      {}
    );

    expect(vars.LAST_WORDS).toBe('about the budget');
  });
});
```

### Integration Tests

**Test 4: End-to-End Flow**
```typescript
describe('Live Coaching Flow', () => {
  it('should generate prompt via pattern match', async () => {
    const service = new LiveCoachingService(config);
    await service.initialize();

    // Simulate prospect saying "too expensive"
    const transcript = "This is too expensive for our budget";

    // Should trigger Tool #13 via pattern match
    const result = await service.processTranscript(transcript, 'prospect');

    expect(result.toolId).toBe(13);
    expect(result.method).toBe('pattern_match');
    expect(result.processingTime).toBeLessThan(50);
    expect(result.prompt).toContain('expensive');
  });

  it('should fallback to AI when no pattern matches', async () => {
    const transcript = "I need to discuss this with my team first";

    const result = await service.processTranscript(transcript, 'prospect');

    expect(result.method).toBe('ai_classification');
    expect(result.processingTime).toBeLessThan(500);
  });

  it('should use Mirroring fallback when AI is slow', async () => {
    // Mock slow AI response
    jest.spyOn(window.electronAPI, 'ollamaGenerate')
      .mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve({ response: '6' }), 300)
      ));

    const transcript = "Complex scenario requiring AI";

    const result = await service.processTranscript(transcript, 'prospect');

    // Should get Mirroring immediately
    expect(result.toolId).toBe(1); // Mirroring
    expect(result.processingTime).toBeLessThan(100);
  });
});
```

### Performance Tests

**Test 5: Speed Benchmarks**
```typescript
describe('Performance', () => {
  it('should generate prompts in <50ms via pattern match', async () => {
    const iterations = 100;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await service.processTranscript("That's expensive", 'prospect');
      times.push(Date.now() - start);
    }

    const avgTime = times.reduce((a, b) => a + b) / times.length;
    expect(avgTime).toBeLessThan(50);
  });

  it('should complete AI classification in <400ms', async () => {
    const start = Date.now();
    await service.processTranscript("Unique complex scenario", 'prospect');
    const time = Date.now() - start;

    expect(time).toBeLessThan(400);
  });
});
```

### Manual Testing Checklist

**Scenario 1: Pattern Match Success**
- [ ] Prospect says "expensive" → Tool #13 selected
- [ ] LED 6602 shows keyword match
- [ ] LED 6254 shows <50ms total time
- [ ] Prompt contains "expensive" and proper Take Away structure

**Scenario 2: AI Fallback**
- [ ] Prospect says complex objection → AI classification used
- [ ] LED 6604 shows no pattern match
- [ ] LED 6252 shows AI method
- [ ] Response time 200-400ms
- [ ] Correct tool selected based on context

**Scenario 3: Mirroring Fallback**
- [ ] AI takes >150ms → Mirroring shown
- [ ] LED 6260 shows timeout fallback
- [ ] LED 6261 shows Mirroring generated
- [ ] User sees instant response
- [ ] Background AI result cached (LED 6262)

**Scenario 4: Full Sentiment Integration**
- [ ] Prospect shows declining sentiment → reactive tool selected
- [ ] LED 6211 shows trend detected
- [ ] LED 6212 shows low engagement
- [ ] Tool selection reflects emotional state

---

## Success Metrics

### Week 1 Targets

**Speed:**
- ✅ 70%+ prompts via pattern match (<50ms)
- ✅ 25% via AI classification (<400ms)
- ✅ 5% fallback to Mirroring (<100ms)
- ✅ Average prompt time: <200ms (vs 1200ms before)

**Quality:**
- ✅ 0% JSON parsing failures (templates guaranteed)
- ✅ 0% hallucinations (no AI text generation)
- ✅ 100% methodology adherence (templates from 13 tools)

**Accuracy:**
- ✅ 80%+ pattern match accuracy (user doesn't override)
- ✅ 85%+ AI classification accuracy
- ✅ 90%+ overall tool selection satisfaction

### Week 4 Targets

**Speed:**
- ✅ 80%+ prompts via pattern match (learning system improves triggers)
- ✅ Average prompt time: <150ms

**Quality:**
- ✅ 95%+ user adoption rate (actually use shown prompts)
- ✅ <5% prompt modifications (means templates are good)

**Accuracy:**
- ✅ 90%+ tool selection accuracy
- ✅ Pattern library expanded with learned triggers

---

## Rollback Plan

**If new system has issues:**

1. **Feature Flag Disable** (5 minutes)
   ```typescript
   localStorage.setItem('USE_TEMPLATE_ENGINE', 'false');
   // Refresh app → old system active
   ```

2. **Identify Issue via LEDs**
   ```typescript
   window.debug.breadcrumbs.getFailures();
   window.debug.breadcrumbs.getRange(6550, 6699);
   ```

3. **Targeted Fix or Full Rollback**
   - If template issue: Fix template definition
   - If pattern matching issue: Adjust triggers
   - If AI classification issue: Refine prompt
   - If systemic: Rollback to old code (via git)

---

## Phase 2 Preview: Learning System

**Not in this implementation, but prepared for:**

- ToolUsageTracker logs every shown/used/modified prompt
- Database schema ready for pattern detection
- Hooks for post-call surveys
- Winning sequence identification
- User preference learning

**Timeline:** Month 2 after Phase 1 stabilizes

---

## Conclusion

This implementation pivots AI from **text generator** to **tool selector**, achieving:

- **3-5x faster prompts** (200ms vs 1200ms)
- **Zero hallucinations** (templates, not generation)
- **Guaranteed quality** (methodology adherence)
- **Consistent format** (no JSON parsing)
- **Foundation for learning** (Phase 2 ready)

**Estimated Development Time:** 2-3 weeks
**Risk Level:** Low (parallel development, feature flag, rollback ready)
**Expected ROI:** Immediate speed improvement, quality increase, user satisfaction boost

---

**Next Action:** Review plan, approve implementation, begin Step 1 (ToolTemplateEngine creation)
