# VoiceCoach V2 - Phase Processing Pipeline PRD

**Document Version:** 1.0  
**Date:** August 27, 2025  
**Status:** Active Development

---

## Executive Summary

VoiceCoach V2 implements a multi-phase RAG (Retrieval-Augmented Generation) processing pipeline that transforms sales documents into actionable coaching insights. The system features parallel processing, multi-layered response architecture, self-optimizing AI prompts, and sub-200ms live coaching response times with edge computing capabilities.

## Architecture Overview

### Processing Flow
```
Document Upload → Questionnaire → Multi-Phase RAG Processing → Multi-Layered Live Coaching

Phase 0: AI Prompt Optimization (Self-instructing system)
                       ↓
Phase 1A (Analysis)    ┐
                       ├─ Parallel Execution  
Phase 1B (Contextual) ┘
                       ↓
Phase 1C (Synthesis) → Phase 1D (Historical Analysis) → Knowledge Base
                                                             ↓
Multi-Layered Live Coaching:
├─ Tier 1: Instant Response (<50ms) - Edge/Local processing
├─ Tier 2: Context Analysis (5-15s) - Background processing  
└─ Tier 3: Strategic Coaching (30s+) - Deep analysis
```

### Multi-Layered Response Architecture

**Tier 1: Immediate Response Layer (<50ms)**
- Pre-computed prompt library for instant guidance
- Local keyword/phrase matching for script adherence
- Edge-cached common scenarios and objections
- Offline fallback capabilities

**Tier 2: Short-Term Context Analysis (5-15s background)**
- Real-time conversation flow tracking
- Prospect mental/technical/financial state assessment  
- Dynamic strategy adaptation based on responses
- Sentiment analysis and engagement scoring

**Tier 3: Long-Term Strategic Analysis (30s+ background)**
- Overall prospect alignment assessment
- Hidden concern detection through conversation patterns
- Escalation recommendations based on complexity
- Predictive coaching based on historical patterns

## Phase Definitions

### Phase 0: AI Prompt Optimization (Self-Instructing System)
**Purpose:** Query target AI platforms to determine optimal prompt structures and templates for maximum effectiveness.

**Processing Focus:**
- Ask target AI (Gemini 1.5 Flash, GPT-4o-mini) how it wants to receive coaching prompts
- Generate platform-specific prompt templates and formats
- Create adaptive prompt structures based on AI capabilities
- Optimize token efficiency for each AI platform
- Build cost-performance profiles for different prompt strategies

**LED Breadcrumb Range:** 2000-2099  
**Target Duration:** <10 seconds  
**Frequency:** Run once per AI model or when models are updated
**Output:** Platform-optimized prompt templates and configuration

**Benefits:**
- **AI-Optimized Prompts:** Each AI gets prompts in its preferred format
- **Performance Boost:** 15-25% improvement in response quality
- **Cost Efficiency:** Optimized token usage reduces API costs
- **Future-Proof:** Automatically adapts to new AI models

### Phase 1A: Document Analysis
**Purpose:** Pure document analysis and extraction of sales techniques, strategies, and key insights.

**Processing Focus:**
- Sales methodology identification
- Technique extraction and categorization
- Strategy pattern recognition
- Key concept isolation

**LED Breadcrumb Range:** 3000-3099  
**Target Duration:** <25 seconds  
**Parallel Execution:** Yes (with Phase 1B)

### Phase 1B: Contextual Analysis  
**Purpose:** Contextual analysis incorporating questionnaire responses and business-specific factors.

**Processing Focus:**
- Questionnaire-guided analysis
- Business challenge alignment
- Success metrics integration
- Critical concept prioritization

**LED Breadcrumb Range:** 4000-4099  
**Target Duration:** <25 seconds  
**Parallel Execution:** Yes (with Phase 1A)

### Phase 1C: Synthesis
**Purpose:** Combine Phase 1A and 1B results into comprehensive coaching knowledge.

**Processing Focus:**
- Result synthesis and integration
- Coaching prompt generation
- Knowledge base optimization
- Real-time query preparation

**LED Breadcrumb Range:** 5000-5099  
**Target Duration:** <5 seconds  
**Dependencies:** Requires Phase 1A + 1B completion

### Phase 1D: Historical Call Analysis (Optional Enhancement)
**Purpose:** Analyze historical sales call transcripts to create company-specific coaching intelligence.

**Processing Focus:**
- Pattern recognition in successful vs unsuccessful calls
- Company-specific objection identification and mapping
- Predictive coaching based on conversation trajectories
- Success correlation analysis for coaching effectiveness
- Custom prompt generation based on historical performance data

**LED Breadcrumb Range:** 5100-5199  
**Target Duration:** <60 seconds (batch processing)  
**Dependencies:** Requires historical call transcript data (10-50 calls minimum)  
**Trigger:** Optional - activated when client provides historical call data

**Benefits:**
- **Hyper-Personalization:** Company-specific objections, concerns, and success patterns
- **Predictive Coaching:** Early identification of conversation trajectories based on historical data
- **Continuous Learning:** Coaching effectiveness improves with more call data
- **Success Optimization:** Correlate coaching suggestions with actual deal outcomes

## Technical Architecture

### File Structure
```
src/rag-pipeline/
├── orchestrator/
│   ├── PipelineOrchestrator.ts      // Main coordination logic
│   ├── PhaseRunner.ts               // Individual phase execution
│   └── ConfigManager.ts             // Configuration management
├── phases/
│   ├── Phase0_PromptOptimization.ts  // AI prompt optimization (self-instructing)
│   ├── Phase1A_Analysis.ts          // Document analysis agent
│   ├── Phase1B_Contextual.ts        // Contextual analysis agent
│   ├── Phase1C_Synthesis.ts         // Results synthesis agent
│   └── Phase1D_HistoricalAnalysis.ts // Historical call analysis (optional)
├── agents/
│   ├── BaseAgent.ts                 // Abstract base agent
│   ├── PromptOptimizationAgent.ts   // Phase 0 implementation
│   ├── AnalysisAgent.ts             // Phase 1A implementation
│   ├── ContextualAgent.ts           // Phase 1B implementation
│   ├── SynthesisAgent.ts            // Phase 1C implementation
│   └── HistoricalAnalysisAgent.ts   // Phase 1D implementation
├── config/
│   ├── pipeline-config.json         // Pipeline configuration
│   ├── agent-instructions/
│   │   ├── phase0-instructions.md   // 0 prompt optimization instructions
│   │   ├── phase1a-instructions.md  // 1A agent instructions
│   │   ├── phase1b-instructions.md  // 1B agent instructions
│   │   ├── phase1c-instructions.md  // 1C agent instructions
│   │   └── phase1d-instructions.md  // 1D historical analysis instructions
│   └── schemas/
│       └── config-schema.json       // TypeScript interfaces
├── live-coaching/
│   ├── EdgeProcessor.ts             // Tier 1: Instant response processing
│   ├── ContextAnalyzer.ts           // Tier 2: Short-term context analysis
│   ├── StrategyAnalyzer.ts          // Tier 3: Long-term strategic analysis
│   └── ResponseOrchestrator.ts      // Multi-tier response coordination
└── utils/
    ├── BreadcrumbLogger.ts          // LED instrumentation
    ├── PerformanceMonitor.ts        // Performance tracking
    ├── CacheManager.ts              // Result caching
    ├── HyDEOptimizer.ts             // Query enhancement (+20% accuracy)
    └── EdgeCacheManager.ts          // Local/edge caching system
```

### Core Components

#### PipelineOrchestrator
**Responsibilities:**
- Coordinate multi-phase execution (Phase 0 + 1A-1D)
- Manage parallel processing (1A + 1B)
- Orchestrate multi-layered live coaching responses
- Handle error recovery and retries
- Performance monitoring and logging
- Edge computing coordination

**Key Methods:**
```typescript
async executeFullPipeline(document: Document, context: Context): Promise<RAGResult>
async optimizeAIPrompts(): Promise<PromptTemplates>
async runParallelPhases(document: Document, context: Context): Promise<[Phase1AResult, Phase1BResult]>
async runSynthesis(phase1Results: ParallelResults): Promise<Phase1CResult>
async processLiveCoaching(transcript: string, tier: 1|2|3): Promise<CoachingResponse>
```

#### BaseAgent
**Responsibilities:**
- Abstract agent interface
- Instruction loading and management
- LED breadcrumb instrumentation
- Error handling and retry logic

#### ConfigManager  
**Responsibilities:**
- Load and validate configuration
- Hot-reload capabilities
- Schema validation
- Environment-specific settings

## Configuration System

### Pipeline Configuration
```json
{
  "phases": {
    "phase0": {
      "name": "AI Prompt Optimization",
      "instructionsFile": "phase0-instructions.md",
      "timeout": 10000,
      "retryAttempts": 2,
      "breadcrumbRange": [2000, 2099],
      "frequency": "once_per_model_update",
      "aiPlatforms": ["gemini-1.5-flash", "gpt-4o-mini", "deepseek-v3"]
    },
    "phase1a": {
      "name": "Document Analysis",
      "instructionsFile": "phase1a-instructions.md",
      "timeout": 30000,
      "retryAttempts": 3,
      "breadcrumbRange": [3000, 3099],
      "parallel": true,
      "parallelWith": ["phase1b"]
    },
    "phase1b": {
      "name": "Contextual Analysis",
      "instructionsFile": "phase1b-instructions.md", 
      "timeout": 30000,
      "retryAttempts": 3,
      "breadcrumbRange": [4000, 4099],
      "parallel": true,
      "parallelWith": ["phase1a"]
    },
    "phase1c": {
      "name": "Synthesis",
      "instructionsFile": "phase1c-instructions.md",
      "timeout": 15000,
      "retryAttempts": 2,
      "breadcrumbRange": [5000, 5099],
      "dependencies": ["phase1a", "phase1b"]
    },
    "phase1d": {
      "name": "Historical Call Analysis",
      "instructionsFile": "phase1d-instructions.md",
      "timeout": 60000,
      "retryAttempts": 2,
      "breadcrumbRange": [5100, 5199],
      "dependencies": ["phase1c"],
      "optional": true,
      "triggerCondition": "historicalCallData.length >= 10"
    }
  },
  "liveCoaching": {
    "tier1": {
      "targetLatency": 50,
      "processingType": "edge_local",
      "cacheHitTarget": 80,
      "fallbackEnabled": true
    },
    "tier2": {
      "targetLatency": 15000,
      "processingType": "background_cloud",
      "contextWindow": 5000,
      "updateFrequency": "5s"
    },
    "tier3": {
      "targetLatency": 30000,
      "processingType": "deep_analysis",
      "contextWindow": 50000,
      "updateFrequency": "30s"
    }
  },
  "performance": {
    "targetLatency": 200,
    "cacheTTL": 3600000,
    "streamingEnabled": true,
    "maxMemoryUsage": "500MB",
    "edgeComputing": true,
    "hydeOptimization": true,
    "costOptimization": "aggressive"
  }
}
```

### Agent Instructions
Each phase uses markdown files for AI agent instructions:
- **phase0-instructions.md**: AI prompt optimization and self-instruction generation
- **phase1a-instructions.md**: Pure document analysis directives
- **phase1b-instructions.md**: Context-aware analysis directives  
- **phase1c-instructions.md**: Synthesis and optimization directives
- **phase1d-instructions.md**: Historical call pattern analysis and predictive coaching directives

**Benefits:**
- Easy to modify without code changes
- Version controllable
- Human-readable
- Hot-reloadable

## Performance Requirements

### Primary Metrics
- **Phase 1A + 1B (Parallel):** <25 seconds each
- **Phase 1C (Synthesis):** <5 seconds
- **Total Processing Time:** <30 seconds
- **Live Coaching Query Response:** <200ms
- **Memory Usage:** <500MB during processing
- **Configuration Reload:** <100ms

### Advanced Optimization Strategies

#### Core Processing Optimizations
1. **Parallel Execution:** Phase 1A + 1B run simultaneously
2. **Self-Optimizing Prompts:** Phase 0 generates AI-specific prompt templates
3. **Multi-Layered Caching:** Edge + cloud + persistent storage
4. **HyDE Query Enhancement:** +20% accuracy through query optimization
5. **Connection Pooling:** Reuse AI service connections across requests

#### Edge Computing Integration
6. **Local Processing:** Tier 1 responses processed on user's device
7. **Offline Capabilities:** Cached scenarios work without internet
8. **Edge Cache Warmup:** Pre-load common coaching scenarios
9. **Progressive Enhancement:** Graceful degradation from cloud to edge to offline

#### Cost Optimization
10. **Dynamic Model Routing:** Route to cheapest/fastest AI per query type
11. **Token Compression:** 20-30% reduction through optimized templates
12. **Batch Processing:** Group multiple coaching requests
13. **Intelligent Caching:** 40-50% cache hit rate reduces API calls

#### Performance Monitoring
14. **RAGAS Evaluation:** Automated quality metrics (precision >0.9)
15. **A/B Prompt Testing:** Compare effectiveness of different prompt strategies
16. **Real-time Analytics:** Track response times and coaching effectiveness
17. **Predictive Scaling:** Anticipate load and pre-warm systems

## Error Handling & Recovery

### Retry Strategy
- **Exponential Backoff:** 2^attempt * 1000ms delay
- **Maximum Retries:** Configurable per phase (default: 3)
- **Timeout Handling:** Configurable timeouts per phase
- **Graceful Degradation:** Partial results if phase fails

### LED Breadcrumb Logging
```typescript
// Enhanced breadcrumb ranges
2000: Phase 0 (Prompt Optimization) started
2099: Phase 0 completed

3000: Phase 1A (Analysis) started
3099: Phase 1A completed

4000: Phase 1B (Contextual) started  
4099: Phase 1B completed

5000: Phase 1C (Synthesis) started
5099: Phase 1C completed

5100: Phase 1D (Historical Analysis) started
5199: Phase 1D completed

// Live coaching tiers
6000: Tier 1 (Instant) processing
6100: Tier 2 (Context) processing
6200: Tier 3 (Strategic) processing

// Performance tracking
7000: Edge cache operations
7100: HyDE query optimization
7200: Cost optimization events

// Error logging  
8000+: Error conditions with context
```

## Integration Points

### SplitViewCoaching Integration
- **Trigger:** "Complete Setup" button after 5-question workflow
- **Input:** Document content + questionnaire answers
- **Output:** Processed coaching knowledge for live sessions

### Knowledge Base Storage
- **Format:** Structured JSON with coaching prompts
- **Storage:** Electron persistent storage
- **Retrieval:** Fast lookup for live coaching queries

## User Experience Flow

1. **User uploads document** → Document validation
2. **User answers 5 questions** → Context gathering
3. **User clicks "Complete Setup"** → Pipeline execution starts
4. **Processing indicator shown** → Real-time progress updates
5. **Phase 1A + 1B execute in parallel** → ~25 seconds
6. **Phase 1C synthesis** → ~5 seconds  
7. **Results stored in knowledge base** → Ready for live coaching
8. **Return to Split View** → Live coaching enabled

## Success Criteria

### Functional Requirements
- ✅ 3-phase processing pipeline operational
- ✅ Parallel execution of Phase 1A + 1B
- ✅ Configuration system with hot-reload
- ✅ LED breadcrumb instrumentation
- ✅ Error handling and recovery

### Performance Requirements  
- ✅ Total processing time <30 seconds
- ✅ Live coaching response <200ms
- ✅ Memory usage <500MB
- ✅ Configuration changes <100ms

### Quality Requirements
- ✅ TypeScript type safety
- ✅ Comprehensive error handling
- ✅ Maintainable modular design
- ✅ Thorough testing coverage

## Implementation Timeline

### Phase 1: Core Infrastructure (Week 1)
- PipelineOrchestrator implementation  
- BaseAgent abstract class
- Basic configuration system
- LED breadcrumb integration

### Phase 2: Agent Implementation (Week 2)
- Phase 1A Analysis agent
- Phase 1B Contextual agent  
- Phase 1C Synthesis agent
- Basic parallel execution

### Phase 3: Configuration & Optimization (Week 3)
- Hot-reload configuration system
- Agent instruction file management
- Performance optimization
- Memory management

### Phase 4: Integration & Testing (Week 4)
- SplitViewCoaching integration
- End-to-end testing
- Performance validation
- Error scenario testing

## Risk Mitigation

### Technical Risks
- **Memory Usage:** Implement cleanup after each phase
- **Performance:** Start simple, add optimizations incrementally  
- **Error Handling:** Comprehensive retry and recovery mechanisms
- **Configuration Complexity:** Schema validation and testing

### Operational Risks
- **Agent Instruction Quality:** Version control and testing procedures
- **Configuration Changes:** Validation and rollback capabilities
- **Performance Regression:** Continuous monitoring and alerting

## Future Enhancements

### Phase 2 Performance & Scalability Upgrades

#### Worker Thread Architecture
- **AI Worker Threads:** Dedicated worker threads for AI processing to prevent main thread blocking
  ```typescript
  // src/workers/aiWorker.ts
  const { Worker } = require('worker_threads');
  const aiWorker = new Worker('./aiProcessingWorker.js');
  ```
- **Parallel Worker Pool:** Multiple workers for concurrent AI API calls
- **Thread Communication:** Efficient message passing between main process and workers
- **Resource Management:** Automatic worker cleanup and resource monitoring

#### Enhanced Caching System
- **Input Hashing:** Cache results based on document + questionnaire hash
  ```typescript
  const cacheKey = crypto.createHash('sha256')
    .update(JSON.stringify({ document, questionnaire }))
    .digest('hex');
  ```
- **Multi-Level Caching:** 
  - L1: In-memory cache for immediate results
  - L2: Redis/persistent cache for cross-session reuse
  - L3: Pre-computed results for common scenarios
- **Intelligent Invalidation:** Smart cache expiry based on content changes
- **Cache Warming:** Pre-process common document types and scenarios

#### JSON Configuration Enhancement
- **Dynamic Model Selection:** Hot-swappable AI models without restart
  ```json
  {
    "phases": {
      "phase1a": {
        "model": "gpt-4o",
        "fallbackModel": "gpt-3.5-turbo",
        "temperature": 0.7,
        "maxTokens": 4000
      }
    }
  }
  ```
- **A/B Testing Config:** Compare different instruction sets
- **Environment-Specific Settings:** Dev/staging/prod configurations
- **Runtime Parameter Adjustment:** Change settings without app restart

#### Performance Monitoring Integration
- **Real-Time Metrics Dashboard:**
  - Processing time per phase
  - Memory usage tracking
  - API response times
  - Cache hit/miss ratios
- **Performance Profiling Tools:**
  - Electron DevTools integration
  - clinic.js performance analysis
  - Custom LED breadcrumb analytics
- **Automated Performance Alerts:** Threshold-based notifications for degradation

#### Live Coaching Optimizations
- **Query Batching:** Group multiple coaching queries for efficient processing
- **Prefetching Engine:** Anticipate likely coaching scenarios
- **Hardware Acceleration:** WebGL integration for local AI model inference
- **Connection Pooling:** Reuse HTTP connections to AI services
- **Response Streaming:** Token-by-token responses for real-time feedback

#### Advanced Error Handling
- **Circuit Breaker Pattern:** Prevent cascade failures during AI service outages
- **Graceful Degradation:** Fallback to cached/simplified responses
- **Retry Strategy Enhancement:**
  ```typescript
  async function withAdvancedRetry(operation: () => Promise<T>, config: RetryConfig): Promise<T> {
    // Exponential backoff with jitter
    // Circuit breaker logic
    // Alternative model fallback
  }
  ```
- **Health Check System:** Proactive monitoring of all AI services

### Phase 3 Advanced Features  
- **A/B Testing Framework:** Compare different agent instruction versions
- **Machine Learning Optimization:** Automatically tune processing parameters based on success metrics
- **Advanced Error Recovery:** Smart retry with alternative strategies and model switching
- **Multi-Document Processing:** Batch processing capabilities for enterprise scenarios
- **Distributed Processing:** Scale across multiple machines/cloud instances
- **Custom Model Fine-tuning:** Train specialized models based on coaching effectiveness data

---

**Document Owner:** VoiceCoach V2 Development Team  
**Review Cycle:** Weekly during active development  
**Next Review:** September 3, 2025