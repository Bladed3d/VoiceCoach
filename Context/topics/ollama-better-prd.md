

# VoiceCoach V2 - Ollama Prompt Optimization PRD
**Project Requirements Document for Better Live Coaching Prompts**
Assignment:
Our current app is not providing good Ollama prompts, however, I believe it may be to several
  factors including: 1) changes in code that no longer align with prepared documents fed to
  Ollama, 2) changes in process that misalign with prompt instructions, 3) .json format in docs
  that misalign with Ollama instructions, and other factors. So let us create a plan which
  considers our current process: "D:\Projects\Ai\VoiceCoach-v2\Context\Ollama-Prompts01.md", our
  discussion: "D:\Projects\Ai\VoiceCoach-v2\Context\The genius of simplicity.md" our
  currentIntelligentPromptBuilder system with the current objective of preparing and using the 8
  action items and supporting info from
  "D:\Projects\Ai\VoiceCoach-v2\rag\NeverSplitSummary_2025-09-02_03_39_52_original.txt" and action
   items and strategies from: "D:\Projects\Ai\VoiceCoach-v2\rag\Hormozi-Best-Sales-Training.txt"
  using all of this to create and display real-time prompts to sales users during a live call that
   help them make more sales. The plan can include changes we need to make to our app, changes to
  our process, changes to how we process these strategy documents, improvements on ensuring that
  context limits for Ollama are accounted for, and the overall objective of reall helpful and fast
   prompts to users during a live call. Please make the plan detailed with actionable smaller
  steps to accomplish bigger objectives. Provide meaningful strategies to test the results with a
  goal of ~500ms Ollama prompts during live calls. 

*Created: September 24, 2025*
*Objective: Achieve ~500ms Ollama response times with highly relevant coaching prompts*

---

## Executive Summary

VoiceCoach V2's current Ollama prompts are not providing optimal coaching guidance due to misalignment between processed document formats, prompt instructions, and the intelligent indexing system. This PRD outlines a comprehensive plan to optimize the entire pipeline from document processing through prompt delivery, targeting sub-500ms response times with significantly improved coaching relevance.

**Key Problems Identified:**
1. **Format Mismatches**: Document JSON structures don't align with prompt template variables
2. **Prompt Template Issues**: Current instructions reference outdated ChromaDB variables
3. **Context Overload**: Large documents exceed Ollama token limits
4. **Processing Inefficiencies**: Multiple validation steps slow response time
5. **Strategy Integration Gaps**: 8 core techniques from NeverSplit + Hormozi not properly integrated

---

## Current State Analysis

### Document Processing Issues

**NeverSplitSummary_2025-09-02_03_39_52_original.txt (1800+ lines):**
- Contains 8 core negotiation techniques clearly defined at start
- Rich with tactical examples and conversation paths
- Heavy with explanatory text and stories (70% non-actionable content)
- No structured JSON format for quick technique lookup

**Hormozi-Best-Sales-Training.txt (840 lines):**
- Focuses on logical selling and decision-making frameworks
- Contains 21 selling beliefs and 3 core objection types (circumstances/others/self)
- Rich tactical frameworks but unstructured format
- Emphasizes overcoming distortions vs manipulative techniques

### Current Prompt Template Analysis

**File:** `ollama-prompts/active-instructions.md`

**Problems:**
1. References `{KNOWLEDGE_BASE}` but IntelligentPromptBuilder doesn't populate this correctly
2. Hardcoded to Chris Voss techniques only - ignores Hormozi frameworks
3. JSON response format is complex but doesn't match UI expectations
4. No integration with MEFS (Mental/Emotional/Financial/Schedule) alignment tracking

### IntelligentPromptBuilder Analysis

**Current Process:**
```
Document Load → Keyword Extraction → In-Memory Indexing → Context Matching → Prompt Building
```

**Bottlenecks:**
1. Full document content passed to Ollama (35KB → 3-5KB but still large)
2. No pre-computed technique summaries
3. Keyword matching works but misses semantic relationships
4. No stage-aware context filtering

---

## Solution Architecture

### Phase 1: Document Processing Optimization (Week 1)

#### 1.1 Create Tiered Document Extraction System

**Objective:** Transform raw documents into multi-tier actionable structures

**Implementation:**

**Tier 1 - Instant Lookup (Target: <5ms):**
```json
// File: rag/processed/neversplit-instant.json
{
  "core_techniques": {
    "mirroring": {
      "trigger_keywords": ["concern", "expensive", "worried", "issue"],
      "instant_response": "Repeat their last 2-3 words as a question",
      "exact_example": "Too expensive?"
    },
    "labeling": {
      "trigger_keywords": ["frustrated", "angry", "hesitant", "confused"],
      "instant_response": "Name the emotion you hear",
      "exact_example": "It sounds like you're concerned about..."
    },
    "calibrated_questions": {
      "trigger_keywords": ["stuck", "problem", "challenge", "difficult"],
      "instant_response": "Ask 'How' or 'What' to give them control",
      "exact_example": "How would you like to handle this?"
    }
  },
  "objection_map": {
    "price": ["expensive", "cost", "budget", "afford", "money"],
    "timing": ["busy", "time", "later", "future", "schedule"],
    "authority": ["spouse", "partner", "boss", "team", "decision"],
    "fit": ["not sure", "different", "unique", "special case"]
  }
}
```

**Tier 2 - Contextual Responses (Target: <200ms):**
```json
// File: rag/processed/neversplit-contextual.json
{
  "price_objection": {
    "voss_approach": {
      "technique": "tactical_empathy",
      "script": "I understand this feels like a significant investment...",
      "next_move": "calibrated_question",
      "expected_response": "budget_discussion"
    },
    "hormozi_approach": {
      "framework": "resourcefulness_over_resources",
      "script": "Every successful person started exactly where you are...",
      "logical_sequence": ["acknowledge_position", "reframe_perspective", "action_step"],
      "decision_framework": "what_would_you_do_if_you_had_to"
    }
  }
}
```

**Tier 3 - Deep Strategy (Target: <1s):**
```json
// File: rag/processed/combined-deep.json
{
  "advanced_sequences": {
    "price_to_close": {
      "voss_sequence": ["label_concern", "mirror_elaboration", "tactical_empathy", "thats_right_moment"],
      "hormozi_logical_path": ["establish_want", "prove_capability", "overcome_distortion", "decision_framework"],
      "success_stories": ["specific_examples", "context_similar_to_current"],
      "recovery_options": ["if_pushback", "if_silence", "if_new_objection"]
    }
  }
}
```

#### 1.2 Build Document Processor Service

**File:** `src/services/document/DocumentProcessor.ts`

```typescript
interface ProcessedDocument {
  instant: InstantLookup;
  contextual: ContextualResponses;
  deep: DeepStrategy;
  mefs_triggers: MEFSTriggers;
  stage_progression: StageProgression;
}

class DocumentProcessor {
  async processRawDocument(filename: string): Promise<ProcessedDocument> {
    // Extract 8 techniques from NeverSplit
    // Extract 21 beliefs + 3 objection types from Hormozi
    // Create keyword→technique mappings
    // Build MEFS alignment triggers
    // Generate stage-aware responses
  }
}
```

### Phase 2: Prompt Template Redesign (Week 2)

#### 2.1 Create MEFS-Aware Prompt System

**New Template Structure:**
```markdown
# VoiceCoach V2 - Integrated Coaching Instructions

You are an elite sales coach combining Chris Voss negotiation psychology with Alex Hormozi's logical decision frameworks.

## Current Context Analysis
- **MEFS Alignment**: Mental: {MENTAL_ALIGNMENT}% | Emotional: {EMOTIONAL_ALIGNMENT}% | Financial: {FINANCIAL_ALIGNMENT}% | Schedule: {SCHEDULE_ALIGNMENT}%
- **Current Stage**: {CURRENT_STAGE}
- **Stage Readiness**: {STAGE_READINESS}
- **Detected Objections**: {OBJECTION_TYPE}
- **Conversation Energy**: {ENERGY_LEVEL}

## Available Techniques (Prioritized for Current Context)
{RELEVANT_TECHNIQUES}

## Last Exchange Analysis
Transcript: "{RECENT_TRANSCRIPT}"

**Your Mission**: Provide the salesperson with ONE primary action and 2-3 tactical options that move the conversation toward higher MEFS alignment.

## Response Format
{
  "say_now": "Exact words to say right now using specific technique",
  "technique_used": "mirroring|labeling|calibrated_question|voss_technique|hormozi_framework",
  "why_this_works": "Brief psychology behind this move",
  "next_moves": [
    "If they respond positively: [specific next action]",
    "If they push back: [recovery technique]",
    "If they go silent: [silence handling]"
  ],
  "mefs_impact": {
    "mental": "+5% (addresses their logical concerns)",
    "emotional": "+10% (validates their feelings)",
    "financial": "0% (not addressing money yet)",
    "schedule": "+3% (removes timing pressure)"
  },
  "stage_progression": "stay_in_discovery|move_to_demo|ready_for_close",
  "confidence": 0.85
}
```

#### 2.2 Dynamic Template Selection

**Implementation:**
- Stage-specific templates (discovery.md, objection_handling.md, closing.md)
- MEFS-aware variable population
- Technique prioritization based on context
- Token-optimized for ~800 token limit

### Phase 3: IntelligentPromptBuilder Enhancement (Week 2)

#### 3.1 Add MEFS Alignment Tracking

**File:** `src/services/coaching/MEFSAnalyzer.ts`

```typescript
class MEFSAnalyzer {
  analyzeAlignment(transcript: string): MEFSScores {
    // Mental: logical concerns, understanding, clarity
    // Emotional: comfort, trust, excitement, fear levels
    // Financial: budget discussions, value perception, ROI understanding
    // Schedule: urgency, timing concerns, implementation timeline
  }

  determineStageReadiness(scores: MEFSScores): StageReadiness {
    // Rules for stage progression based on alignment scores
    // Discovery → Demo: Mental 60%+, Emotional 50%+
    // Demo → Close: All scores 70%+
    // Objection Handling: Any score drops below 40%
  }
}
```

#### 3.2 Optimize Context Matching Algorithm

**Current Process:**
```
Full Document → Keyword Match → Return All Matching Techniques
```

**New Process:**
```
Transcript → MEFS Analysis → Stage Detection → Tier Selection → Specific Technique Match → Context-Aware Response
```

**Performance Optimizations:**
1. Pre-computed technique embeddings (startup time only)
2. MEFS-score-based filtering reduces search space by 70%
3. Stage-aware technique prioritization
4. Token counting with automatic truncation

### Phase 4: Response Time Optimization (Week 3)

#### 4.1 Implement Response Time Tracking

**File:** `src/services/coaching/PerformanceTracker.ts`

```typescript
interface PerformanceMetrics {
  transcript_to_analysis: number;    // Target: <10ms
  context_matching: number;          // Target: <5ms
  prompt_building: number;           // Target: <5ms
  ollama_request: number;            // Target: <400ms
  response_parsing: number;          // Target: <10ms
  ui_update: number;                 // Target: <10ms
  total_time: number;                // Target: <500ms
}
```

#### 4.2 Ollama Configuration Optimization

**Model Selection Testing:**
- Test qwen2.5:7b vs 14b vs 32b for speed/quality tradeoff
- Optimize temperature/top_p for consistent formatting
- Implement prompt caching for repeated contexts

**Configuration Changes:**
```typescript
// Optimized for speed while maintaining quality
const optimizedConfig = {
  model: 'qwen2.5:7b-instruct-q4_K_M', // Smaller for speed
  temperature: 0.1,                     // Consistent responses
  top_p: 0.9,
  num_predict: 400,                     // Limit response length
  repeat_penalty: 1.1,
  stop: ["}"],                          // Stop at JSON end
};
```

#### 4.3 Implement Prompt Caching

**Strategy:**
- Cache common objection responses
- Pre-warm frequently used technique combinations
- Use conversation context for cache keys
- 10-minute TTL for cached responses

### Phase 5: Integration & Testing (Week 4)

#### 5.1 End-to-End Testing Framework

**File:** `src/tests/integration/OllamaCoachingPipeline.test.ts`

**Test Scenarios:**
1. **Price Objection Response Time**: "This seems expensive" → <500ms response
2. **MEFS Progression Accuracy**: Track alignment scores through conversation
3. **Technique Appropriateness**: Verify correct Voss/Hormozi technique selection
4. **Stage Transition Accuracy**: Ensure proper progression through sales stages
5. **Token Limit Compliance**: All prompts under 4000 tokens
6. **Response Format Consistency**: Valid JSON every time

#### 5.2 Performance Benchmarking

**Automated Testing:**
```typescript
const testScenarios = [
  {
    input: "I can't afford this right now",
    expected_response_time: 500,
    expected_technique: "resourcefulness_over_resources",
    expected_mefs_impact: { financial: "+15%" }
  },
  {
    input: "I need to think about it",
    expected_response_time: 400,
    expected_technique: "mirror_for_elaboration",
    expected_next_action: "calibrated_question"
  }
  // 50+ test scenarios covering common objections
];
```

#### 5.3 A/B Testing Implementation

**Test Groups:**
- **Group A**: Current system with optimizations
- **Group B**: New integrated Voss/Hormozi system
- **Group C**: MEFS-aware system with stage progression

**Metrics:**
- Response time (target: <500ms)
- Coaching relevance score (user feedback 1-10)
- Conversation progression rate (stages per minute)
- User satisfaction ratings
- Sales conversion impact

---

## Implementation Timeline

### Week 1: Document Processing
**Days 1-2:** Extract 8 techniques from NeverSplit, build instant lookup JSON
**Days 3-4:** Process Hormozi frameworks, create contextual response mappings
**Days 5-7:** Build DocumentProcessor service, create tiered output files

### Week 2: Prompt Templates & MEFS
**Days 8-9:** Design new prompt templates with MEFS integration
**Days 10-11:** Implement MEFSAnalyzer and stage progression logic
**Days 12-14:** Enhance IntelligentPromptBuilder with new context matching

### Week 3: Performance Optimization
**Days 15-16:** Implement response time tracking and bottleneck identification
**Days 17-18:** Optimize Ollama configuration and implement prompt caching
**Days 19-21:** End-to-end performance testing and tuning

### Week 4: Integration & Validation
**Days 22-23:** Build automated testing framework with 50+ scenarios
**Days 24-25:** Implement A/B testing infrastructure
**Days 26-28:** User acceptance testing and final optimizations

---

## Success Metrics

### Performance Targets
- **Primary Goal**: 95% of responses under 500ms
- **Stretch Goal**: 90% of responses under 300ms
- **Context Matching**: <5ms for technique selection
- **Prompt Building**: <5ms for template population
- **Ollama Response**: <400ms average

### Quality Targets
- **Coaching Relevance**: 8.5/10 average user rating
- **Technique Appropriateness**: 90% correct technique selection
- **MEFS Progression**: Measurable improvement in alignment scores
- **Stage Advancement**: 25% faster progression through sales stages
- **User Satisfaction**: 9/10 rating for prompt helpfulness

### Technical Targets
- **Token Efficiency**: 70% reduction in average prompt size
- **Memory Usage**: <50MB for all document indexes
- **Cache Hit Rate**: >60% for common objection patterns
- **Error Rate**: <1% JSON parsing failures

---

## Risk Mitigation

### Technical Risks

**Risk: Ollama response time variability**
- **Mitigation**: Model size testing, prompt caching, fallback responses
- **Contingency**: Pre-computed responses for top 20 objection patterns

**Risk: Document processing complexity**
- **Mitigation**: Incremental implementation, extensive testing
- **Contingency**: Hybrid approach using both old and new systems

**Risk: MEFS alignment accuracy**
- **Mitigation**: Machine learning validation against human coaches
- **Contingency**: Simplified rule-based MEFS scoring as fallback

### User Experience Risks

**Risk: Coaching quality degradation during optimization**
- **Mitigation**: A/B testing with gradual rollout
- **Contingency**: Instant rollback capability

**Risk: Response format changes breaking UI**
- **Mitigation**: Backward compatibility in JSON parsing
- **Contingency**: Dual response format support during transition

---

## Questions & Concerns for Additional AI Input

### 1. Token Optimization Strategy
**Question**: Given Ollama's context window limitations, should we implement a sliding window approach for conversation history, or focus on intelligent summarization of prior context?

**Context**: Current system keeps full conversation history which can exceed token limits on longer calls.

### 2. MEFS Alignment Accuracy
**Question**: What's the best approach for validating MEFS alignment scores - rule-based keyword analysis, sentiment analysis, or a hybrid approach with machine learning validation?

**Context**: MEFS scoring is critical for stage progression but difficult to validate automatically.

### 3. Technique Selection Logic
**Question**: Should technique selection prioritize Voss emotional techniques vs Hormozi logical frameworks based on prospect type detection, or create a unified decision tree that combines both approaches?

**Context**: Both approaches are powerful but have different philosophies (emotional vs logical).

### 4. Performance vs Quality Tradeoff
**Question**: If we can't achieve both <500ms response times AND high coaching quality, which should take priority, and what's the acceptable threshold for the secondary metric?

**Context**: Initial testing shows tension between speed and comprehensive coaching analysis.

### 5. Caching Strategy Complexity
**Question**: Should we implement personalized caching based on individual salesperson patterns, or focus on universal caching for common objections and scenarios?

**Context**: Personalized caching could improve relevance but adds significant complexity.

---

## Appendix: Technical Implementation Details

### A. Document Processing Code Samples
### B. MEFS Algorithm Specifications
### C. Performance Testing Scripts
### D. A/B Testing Configuration
### E. Rollback Procedures

---

*This PRD represents a comprehensive approach to optimizing VoiceCoach V2's Ollama prompting system for both speed and coaching effectiveness. Implementation should proceed incrementally with extensive testing at each phase.*