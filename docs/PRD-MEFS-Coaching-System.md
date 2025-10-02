# PRD: MEFS-Based Live Coaching System
**Version:** 1.0
**Date:** 2025-09-25
**Status:** Draft

## Executive Summary

Transform VoiceCoach V2's live prompting system from basic keyword matching to intelligent MEFS (Mental, Emotional, Financial, Schedule) alignment tracking. The new system will systematically use the 13 proven negotiation tools to uncover specific information, then generate contextually appropriate coaching prompts based on actual conversation gaps rather than generic pattern matching.

## Current State Analysis

### Existing Prompt Generation Flow
```
Live Transcript → keyword matching → template filling → generic prompt
```

### Problems with Current System
1. **Context-Free Prompting**: Hardcoded trigger phrases miss conversational nuance
2. **No Speaker Differentiation**: All speech treated as prospect speech
3. **Pattern Matching Limitations**: "expensive" triggers price objection handling regardless of context
4. **No Learning Mechanism**: System doesn't improve from conversation outcomes
5. **Generic Templates**: Same prompts regardless of sales stage or conversation history

## Product Vision

### Target State
```
Live Transcript → MEFS Analysis → Tool Selection → Evidence-Based Prompting → Learning Loop
```

### Value Propositions
- **For Sales Teams**: Higher close rates through systematic information gathering
- **For Managers**: Data-driven insights into conversation effectiveness
- **For Coaches**: Evidence-based feedback on sales technique usage

## User Stories

### Epic 1: MEFS Evidence Tracking
**As a** sales representative
**I want** the system to track what information has been gathered in each MEFS dimension
**So that** I receive prompts that address actual conversation gaps rather than random suggestions

**Acceptance Criteria:**
- System maintains evidence log for each MEFS dimension
- Prompts are generated based on information gaps, not keywords
- MEFS scores update based on actual responses, not tool usage

### Epic 2: Intelligent Tool Selection
**As a** sales representative
**I want** the system to suggest the most appropriate tool for my current conversation situation
**So that** I can systematically uncover the information needed to close the deal

**Acceptance Criteria:**
- Tool selection considers current sales stage
- System prevents inappropriate tool suggestions (e.g., Accusation Audit during closing)
- Tools map to specific MEFS dimensions they help uncover

### Epic 3: Stage-Aware Coaching
**As a** sales representative
**I want** coaching prompts that align with my current sales stage and conversation flow
**So that** suggestions feel natural and contextually appropriate

**Acceptance Criteria:**
- Prompts adapt to detected sales stage (rapport, discovery, demo, etc.)
- System tracks stage transitions based on conversation content
- Non-linear stage progression supported based on MEFS alignment

### Epic 4: Learning & Optimization
**As a** sales manager
**I want** the system to learn from successful conversations and improve over time
**So that** coaching quality continuously improves and adapts to our sales process

**Acceptance Criteria:**
- Tool effectiveness tracked by situation and outcome
- System identifies patterns in successful conversations
- Prompt selection improves based on historical performance

## Technical Architecture

### Core Components

#### 1. PracticalMEFSTracker
```typescript
class PracticalMEFSTracker {
  // Evidence-based tracking
  private knownInfo: MEFSInformation;
  private toolHistory: ToolUsageHistory;
  private conversationGaps: InformationGaps;

  // Core methods
  updateEvidence(dimension: MEFSDimension, evidence: string, impact: number): void;
  findInformationGaps(): MEFSDimension[];
  getNextPrompt(transcript: string, stage: SalesStage): CoachingPrompt;
}
```

#### 2. Tool-to-MEFS Mapping System
```typescript
interface ToolDefinition {
  name: string;
  primaryMEFS: MEFSDimension;
  secondaryMEFS?: MEFSDimension;
  appropriateStages: SalesStage[];
  effectivenessScore: number;
  triggerConditions: string[];
}
```

#### 3. Evidence-Based Scoring
```typescript
interface MEFSEvidence {
  mental: {
    understanding: string[];    // "Asked clarifying question about implementation"
    confusion: string[];        // "Said 'I don't get how this works'"
    engagement: string[];       // "Asked 3 follow-up questions"
  };
  emotional: {
    expressions: string[];      // "Expressed frustration with current solution"
    reactions: string[];        // "Laughed when mentioned competitor pricing"
    concerns: string[];         // "Worried about team adoption"
  };
  financial: {
    mentions: string[];         // "Mentioned budget range of $5-10k"
    objections: string[];       // "Said it's expensive"
    confirmations: string[];    // "Agreed ROI makes sense"
  };
  schedule: {
    constraints: string[];      // "Can't do implementation until Q2"
    availability: string[];     // "Available for November session"
    urgency: string[];          // "Need solution by end of year"
  };
}
```

### Integration Points

#### Current System Integration
- **live-coaching-service.ts**: Add MEFS tracker integration
- **SessionManagerService.ts**: Leverage existing speaker detection
- **ollama-service.ts**: Replace generic prompt building with MEFS-based selection
- **intelligent-prompt-builder.ts**: Enhance with tool-to-MEFS mapping

#### New Components
- **mefs-tracker.ts**: Core MEFS evidence tracking
- **tool-selector.ts**: Stage-aware tool selection engine
- **evidence-analyzer.ts**: Natural language processing for evidence extraction
- **coaching-prompt-generator.ts**: Context-aware prompt generation

## Performance Requirements

### Response Time Targets
- **MEFS Analysis**: <50ms per transcript update
- **Tool Selection**: <25ms for prompt generation
- **Evidence Update**: <10ms for real-time scoring
- **Overall Coaching Response**: <200ms from transcript to prompt

### Accuracy Targets
- **Tool Selection Appropriateness**: >85% (validated by sales experts)
- **MEFS Evidence Extraction**: >75% (compared to manual analysis)
- **Stage Detection**: >80% (validated against sales script framework)
- **Speaker Identification**: >90% (using existing audio meter system)

## User Interface Requirements

### MEFS Tracking Display
```
┌─ MEFS Alignment ─────────────────────────┐
│ Mental:    ████░░░░░░  40% (3 gaps)      │
│ Emotional: ██████░░░░  60% (2 concerns)  │
│ Financial: ████████░░  80% (budget ok)   │
│ Schedule:  ██░░░░░░░░  20% (unclear)     │
└──────────────────────────────────────────┘
```

### Tool Usage History
```
┌─ Tools Used This Call ──────────────────┐
│ ✓ Mirroring (3x) - clarified pricing    │
│ ✓ Calibrated Q - uncovered timeline     │
│ ○ Accusation Audit - suggested          │
│ ○ Take Away - available if needed        │
└──────────────────────────────────────────┘
```

### Smart Prompting Panel
```
┌─ Coaching Suggestion ───────────────────┐
│ Gap: Schedule alignment low (20%)        │
│ Tool: Calibrated Question                │
│ Say: "What would ideal timing look       │
│      like for your team?"                │
│                                          │
│ Why: Uncovers schedule constraints       │
│ Expected: Timeline concerns or urgency   │
└──────────────────────────────────────────┘
```

## Success Metrics

### Primary KPIs
1. **Prompt Relevance Score**: User ratings of prompt helpfulness (target: >4.2/5.0)
2. **Close Rate Improvement**: Sales conversion increase (target: +15% vs baseline)
3. **Stage Progression Speed**: Faster movement through sales stages (target: -20% avg call time)
4. **Tool Usage Effectiveness**: Successful information gathering per tool (target: >70% success rate)

### Secondary KPIs
1. **System Performance**: Response time consistency (target: <200ms 95th percentile)
2. **User Adoption**: Percentage of generated prompts actually used (target: >60%)
3. **Learning Effectiveness**: Prompt quality improvement over time (target: +10% monthly)
4. **Error Rate**: False positive/negative in MEFS scoring (target: <15%)

## Risk Assessment

### High Risk
- **Performance Impact**: MEFS tracking could slow response times
  - *Mitigation*: Implement async processing and caching
- **Complexity Overhead**: More complex than current keyword matching
  - *Mitigation*: Phased rollout with fallback to current system

### Medium Risk
- **Tool Selection Errors**: Wrong tool for situation could harm sales
  - *Mitigation*: Extensive testing with sales experts, manual override option
- **MEFS Scoring Inaccuracy**: False confidence in alignment status
  - *Mitigation*: Evidence-based scoring with uncertainty indicators

### Low Risk
- **User Interface Complexity**: Too much information could overwhelm users
  - *Mitigation*: Progressive disclosure, customizable views
- **Integration Challenges**: Conflicts with existing coaching services
  - *Mitigation*: Careful integration testing, backward compatibility

## Implementation Strategy

### Phase 1: Foundation (Weeks 1-2)
- Create MEFS tracker with evidence-based scoring
- Implement tool-to-MEFS mapping system
- Build basic prompt generation engine

### Phase 2: Integration (Weeks 3-4)
- Integrate with existing live coaching service
- Connect to speaker detection system
- Add real-time MEFS updates

### Phase 3: Enhancement (Weeks 5-6)
- Implement learning system
- Add performance monitoring
- Create management dashboards

### Phase 4: Optimization (Weeks 7-8)
- Fine-tune based on user feedback
- Optimize performance bottlenecks
- Add advanced features

### Rollback Strategy
- **Immediate Rollback**: Feature flag to disable MEFS system, revert to keyword matching
- **Partial Rollback**: Disable specific components (e.g., tool selection) while keeping others
- **Data Preservation**: All MEFS data stored separately, no impact on existing functionality

## Dependencies

### Technical Dependencies
- Existing speaker detection system (DualVolumeMonitoringService)
- Current live coaching architecture
- Ollama integration for prompt processing
- TypeScript 5.6+ for advanced type definitions

### Business Dependencies
- Sales team validation of tool effectiveness
- Management approval for A/B testing
- Training materials for new interface elements
- Performance benchmarking against current system

## Success Criteria

### MVP Success
- MEFS tracker accurately identifies information gaps
- Tool selection improves prompt relevance by 30%
- System maintains <200ms response time
- Zero regressions in existing functionality

### Full Success
- Close rate improvement of 15% or higher
- User adoption rate >60% for generated prompts
- MEFS alignment correlation with successful closes
- Self-improving system through learning loops

### Failure Criteria (Triggers Rollback)
- Response time degradation >50% vs current system
- User adoption <30% after 4 weeks
- Close rate decrease or no improvement after 8 weeks
- More than 2 critical bugs in production

## Appendix

### Technical Specifications
- See `Context/Ollama-prompt-new-design.md` for detailed architecture
- See `Context/092525.md` for current system analysis
- See `rag/13-Actions-01.md` for tool definitions
- See `Context/NewPromptDesign-Golf-Coaching.md` for sales script integration

### Validation Plan
- A/B testing framework with 50/50 traffic split
- Sales expert review of tool selection logic
- Performance benchmarking suite
- User experience testing with real sales conversations