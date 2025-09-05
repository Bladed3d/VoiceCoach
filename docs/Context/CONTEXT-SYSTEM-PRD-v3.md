# Context System PRD - LED-Enhanced Persistent Intelligence
**Version 3.0 | Date: 2025-09-04**  
**Author: System Architecture Team**  
**Status: Refined with Focused Specialists & Automated Testing**

## Executive Summary

The Context System solves Claude's fundamental limitation: catastrophic context loss during `/compact` operations and between sessions. Version 3.0 refines the architecture to emphasize **focused specialist agents** that are called on-demand, not as bureaucratic overhead, and introduces **automated testing as a core phase** to dramatically reduce manual debugging.

Key principle: Have many specialists available, use only what's needed. A typical development session uses 3-5 agents, not 15. Automated testing with Playwright catches and proposes fixes for issues before they reach the developer.

## Problem Statement

### Current Pain Points

1. **Context Amnesia**
   - New Claude sessions start with zero project knowledge
   - `/compact` operations destroy 90% of conversation context
   - Same mistakes repeated across sessions

2. **Manual Debugging Burden** (CRITICAL)
   - Developer spends hours debugging issues Claude created
   - No automatic validation of implementations
   - Problems discovered through manual testing
   - Fixes require multiple back-and-forth iterations

3. **Token Exhaustion**
   - Finding code locations requires extensive searching (5,000-10,000 tokens)
   - Reading files to understand codebase wastes tokens
   - Generic agents lack deep specialized knowledge

4. **Hidden Failures**
   - Fallback/simulated data masks real problems
   - Silent failures make debugging impossible

5. **Unwanted Code Changes**
   - Claude immediately rewrites code when asked simple questions
   - No collaboration phase before implementation

### Impact Analysis

- **Debugging Time**: 60% of development time spent on manual debugging
- **Token Usage**: 10x higher due to generalist approach
- **Cost Impact**: Uncached tokens cost 10x more ($3.00 vs $0.30/MTok)
- **Developer Frustration**: Critical - constant manual intervention required

## Solution Overview

### Core Innovation

**Focused Specialist Architecture**: Deep expertise agents called on-demand, not as process overhead.

**Automated Testing Pipeline**: Every implementation automatically tested, with AI-proposed fixes.

### Key Principles

1. **Specialists Over Generalists**: Each agent deeply knows ONE domain
2. **On-Demand Not Always-On**: Agents called only when relevant (3-5 per session)
3. **Test-First Validation**: Automated testing catches issues before developer sees them
4. **File-Based Memory**: Persistent context survives all sessions
5. **FAIL-LOUD Policy**: No fake data or silent failures

## 6-Phase Development Workflow

### Phase 1: INTENT CAPTURE
**Trigger**: User request
```
Simple: "@do fix button color" → Skip to Phase 5
Complex: "@brainstorm improve Vosk accuracy" → Full workflow
```

### Phase 2: BRAINSTORM (Optional)
**When**: Complex features or unclear requirements
- Explore multiple approaches
- No implementation

### Phase 3: SPECIALIST RESEARCH
**When**: Domain-specific knowledge needed
```
Vosk issue → Vosk Agent researches
WebSocket problem → WebSocket Agent investigates
UI change → React Agent validates
```

### Phase 4: RISK ANALYSIS (Optional)
**When**: Critical changes or new features
- Inversion Agent identifies failure modes
- Creates mitigation strategies

### Phase 5: IMPLEMENTATION
**When**: Always (after appropriate earlier phases)
- Parent Claude implements based on research
- Follows FAIL-LOUD policy

### Phase 6: AUTOMATED TESTING (NEW - CRITICAL)
**When**: ALWAYS after implementation
```typescript
// Automatic flow:
1. Playwright Agent tests implementation
2. Finds issues → Proposes fixes
3. Developer approves fixes
4. Fixes applied automatically
5. Tests run again until passing
```

**Result**: Developer sees working, tested code, not broken implementations.

## Focused Specialist Agent Architecture

### Tier 1: Process Controllers (Lightweight)

**Brainstorm Agent** (LED 9800-9849)
- Pure idea exploration
- Never implements

**Inversion Agent** (LED 9850-9899)
- Risk analysis using Charlie Munger methodology
- Called for critical changes

**Project Manager** (LED 9900-9999)
- Orchestrates multi-agent workflows
- Only for complex features

### Tier 2: Domain Specialists (Deep Knowledge)

**Vosk Specialist Agent** (LED 5000-5099)
```typescript
interface VoskAgent {
  expertise: [
    "Model optimization (small/large models)",
    "SetWords/SetPartialWords for accuracy",
    "Python implementation on Windows",
    "Real-time performance tuning",
    "Audio preprocessing for clarity"
  ],
  tools: ["context7:vosk", "performance-profiler"],
  knowledge_base: "docs/context/5000-5099-vosk/",
  triggers: ["transcription", "accuracy", "speech", "vosk"]
}
```

**WebSocket Specialist Agent** (LED 6000-6099)
```typescript
interface WebSocketAgent {
  expertise: [
    "Reconnection strategies",
    "Binary audio streaming",
    "State management",
    "Python server communication",
    "CSP and CORS issues"
  ],
  tools: ["websocket-debugger", "connection-monitor"],
  knowledge_base: "docs/context/6000-6099-websocket/",
  triggers: ["connection", "streaming", "real-time", "ws"]
}
```

**ChromaDB Specialist Agent** (LED 4500-4599)
```typescript
interface ChromaDBAgent {
  expertise: [
    "Vector embedding optimization",
    "Collection management",
    "Similarity search tuning",
    "RAG integration patterns",
    "Performance optimization"
  ],
  tools: ["vector-analyzer", "embedding-profiler"],
  knowledge_base: "docs/context/4500-4599-chromadb/",
  triggers: ["vectors", "embeddings", "chromadb", "similarity"]
}
```

**React UI Agent** (LED 7000-7099)
```typescript
interface ReactAgent {
  expertise: [
    "Component architecture",
    "Hook patterns",
    "Performance optimization",
    "Electron renderer constraints",
    "State management"
  ],
  tools: ["react-devtools", "component-analyzer"],
  knowledge_base: "docs/context/7000-7099-react/",
  triggers: ["component", "ui", "react", "hook", "state"]
}
```

**Electron Bridge Agent** (LED 1000-1099)
```typescript
interface ElectronAgent {
  expertise: [
    "Main/renderer process separation",
    "IPC communication patterns",
    "Preload script security",
    "File system access",
    "Native API integration"
  ],
  tools: ["ipc-monitor", "process-analyzer"],
  knowledge_base: "docs/context/1000-1099-electron/",
  triggers: ["main process", "renderer", "ipc", "electron"]
}
```

**RAG Pipeline Agent** (LED 3000-3999)
```typescript
interface RAGAgent {
  expertise: [
    "Three-phase processing",
    "Document analysis",
    "Context synthesis",
    "Coaching insight generation",
    "Knowledge extraction"
  ],
  tools: ["document-analyzer", "insight-generator"],
  knowledge_base: "docs/context/3000-3999-rag/",
  triggers: ["phase 1", "document", "rag", "knowledge", "insights"]
}
```

### Tier 3: Quality Assurance (Automatic)

**Playwright Testing Agent** (LED 9000-9099) - CRITICAL
```typescript
interface PlaywrightAgent {
  mission: "Eliminate manual debugging",
  automatic_triggers: [
    "After UI implementation",
    "After WebSocket changes",
    "After user interaction flow changes",
    "On-demand with @test"
  ],
  
  test_patterns: {
    ui_validation: "Visual regression + interaction",
    connection_test: "WebSocket state verification",
    transcription_test: "Audio capture validation",
    integration_test: "End-to-end user flows"
  },
  
  fix_proposal_flow: {
    1: "Run automated tests",
    2: "Identify failures with screenshots",
    3: "Propose specific fixes with code",
    4: "Wait for developer approval",
    5: "Apply fixes automatically",
    6: "Re-test until passing"
  },
  
  tools: ["mcp__playwright__*"],
  output: "test-results/ with screenshots and fix proposals"
}
```

**Error Visibility Agent** (LED 8500-8599)
```typescript
interface ErrorAgent {
  mission: "Make all failures impossible to ignore",
  automatic_triggers: [
    "Catch blocks detected",
    "Error states in code",
    "Failed test results"
  ],
  enforces: "FAIL-LOUD policy"
}
```

**Code Discovery Agent** (LED 9500-9599)
```typescript
interface DiscoveryAgent {
  mission: "Instant code location (90% token reduction)",
  automatic_triggers: [
    "Where is [component]?",
    "Find [function]",
    "Locate [feature]"
  ],
  maintains: "LED-to-code-location index"
}
```

## Automated Testing Pipeline (NEW CRITICAL SECTION)

### Why Automated Testing Changes Everything

**Current Reality**: Developer debugs for hours after Claude implements
**New Reality**: Tests catch issues, propose fixes, developer just approves

### Test-Driven Development Flow

```mermaid
Implementation → Automatic Tests → Issues Found → 
AI Proposes Fix → Developer Approves → Fix Applied → 
Tests Pass → Done
```

### Playwright Desktop Testing Strategy

```typescript
// Automatic test scenarios for VoiceCoach V2
const TEST_SCENARIOS = {
  voice_capture: {
    test: "Verify audio levels register during speech",
    fix_patterns: [
      "Check MediaStream connection",
      "Verify volume calculation",
      "Validate UI binding"
    ]
  },
  
  websocket_connection: {
    test: "Verify connection and reconnection",
    fix_patterns: [
      "Check port availability",
      "Verify Python server running",
      "Validate reconnection logic"
    ]
  },
  
  transcription_accuracy: {
    test: "Verify Vosk processes audio correctly",
    fix_patterns: [
      "Check model loading",
      "Verify audio format",
      "Validate word boundaries"
    ]
  },
  
  rag_processing: {
    test: "Verify document processing pipeline",
    fix_patterns: [
      "Check file upload handling",
      "Verify phase transitions",
      "Validate insight generation"
    ]
  }
};
```

### Automatic Fix Proposal System

When tests fail, Playwright Agent:

1. **Captures Evidence**
   - Screenshots of failure state
   - Console errors
   - Network requests
   - LED breadcrumb trail

2. **Analyzes Root Cause**
   - Matches error patterns
   - Checks against known issues
   - Reviews recent changes

3. **Proposes Specific Fix**
   ```typescript
   // Example proposal
   TEST FAILED: Voice level meter showing 0%
   EVIDENCE: MediaStream exists but analyser not connected
   
   PROPOSED FIX:
   In SplitViewCoaching.tsx line 412:
   - audioContext.createMediaStreamSource(stream)
   + const source = audioContext.createMediaStreamSource(stream)
   + source.connect(analyser)
   
   [APPROVE FIX] [MODIFY] [SKIP]
   ```

4. **Applies Approved Fix**
   - Makes code change
   - Runs test again
   - Confirms resolution

### Testing Integration Points

```yaml
# Automatic test triggers
ui_change: → Playwright visual regression
api_change: → Integration tests  
websocket_change: → Connection tests
vosk_change: → Transcription tests
rag_change: → Pipeline tests
```

## Smart Agent Selection System

### Automatic Agent Routing

```typescript
function selectAgents(userRequest: string): Agent[] {
  const agents = [];
  
  // Keywords trigger specialists
  if (contains(["vosk", "transcription", "accuracy"])) {
    agents.push(VoskAgent);
  }
  if (contains(["websocket", "connection", "streaming"])) {
    agents.push(WebSocketAgent);
  }
  if (contains(["test", "verify", "check"])) {
    agents.push(PlaywrightAgent);
  }
  
  // Critical paths trigger Inversion
  if (isCriticalPath(request)) {
    agents.push(InversionAgent);
  }
  
  return agents; // Usually 2-4 agents, not 15
}
```

### Session Examples

```markdown
"Fix Vosk accuracy issues"
→ Vosk Agent + Playwright Tester (2 agents)

"Improve WebSocket reconnection"
→ WebSocket Agent + Inversion Agent + Playwright Tester (3 agents)

"Add new UI component"
→ React Agent + Playwright Tester (2 agents)

"Redesign RAG pipeline"
→ Brainstorm + RAG Agent + ChromaDB Agent + Inversion + Playwright (5 agents)
```

## File-Based Context Architecture

### Focused Knowledge Bases

```
docs/context/
├── 5000-5099-vosk/
│   ├── 5001-model-optimization.md
│   ├── 5023-accuracy-tuning.md
│   ├── 5045-windows-python.md
│   └── test-results/
│       └── accuracy-benchmarks.json
├── 6000-6099-websocket/
│   ├── 6001-connection-strategy.md
│   ├── 6015-reconnect-patterns.md
│   └── test-results/
│       └── connection-stability.json
├── 9000-9099-testing/
│   ├── test-scenarios/
│   ├── fix-patterns/
│   └── automation-scripts/
└── active/
    ├── LED-INDEX.md
    └── CURRENT-CONTEXT.md
```

### Knowledge Inheritance

Each specialist agent:
1. Reads its specific knowledge base
2. Inherits from parent context
3. Writes findings to filesystem
4. Returns minimal summary (200 tokens)

## Token Optimization Through Specialization

### Generalist Approach (Old)
```
"Fix Vosk accuracy"
→ Read 10 files to understand (5000 tokens)
→ Try generic solutions (2000 tokens)
→ Debug failures (3000 tokens)
Total: ~10,000 tokens
```

### Specialist Approach (New)
```
"Fix Vosk accuracy"
→ Vosk Agent knows exactly where to look (200 tokens)
→ Applies specific Vosk optimizations (500 tokens)
→ Playwright validates automatically (300 tokens)
Total: ~1,000 tokens (90% reduction)
```

## FAIL-LOUD Policy

### Universal Rule for All Agents

```typescript
// ❌ FORBIDDEN - Never hide failures
catch (error) {
  return mockData; // ABSOLUTELY FORBIDDEN
}

// ✅ REQUIRED - Always fail visibly
catch (error) {
  addBreadcrumb(8001, '❌ FAILURE', error);
  throw new Error(`FAILED: ${error.message}`);
}
```

## Implementation Priorities

### Phase 1: Core Testing Infrastructure (Week 1) - CRITICAL
- [ ] Set up Playwright Testing Agent
- [ ] Create automated test scenarios
- [ ] Build fix proposal system
- [ ] Implement test-after-implementation flow

### Phase 2: Essential Specialists (Week 2)
- [ ] Create Vosk Specialist with deep knowledge
- [ ] Create WebSocket Specialist with connection expertise
- [ ] Create ChromaDB Specialist for vector operations
- [ ] Load each with specific documentation

### Phase 3: Process Controllers (Week 3)
- [ ] Implement smart agent selection
- [ ] Create Brainstorm Agent for exploration
- [ ] Add Inversion Agent for risk analysis
- [ ] Build workflow router

### Phase 4: Knowledge System (Week 4)
- [ ] Set up file-based context structure
- [ ] Implement LED-to-code mapping
- [ ] Create knowledge inheritance system
- [ ] Build context compression

### Phase 5: Optimization (Week 5)
- [ ] Implement KV-cache optimization
- [ ] Add performance monitoring
- [ ] Create A/B testing framework
- [ ] Measure token reduction

## Success Metrics

### Primary Metrics
- **Manual Debugging Reduction**: 80% less developer debugging time
- **Test Coverage**: 100% of implementations auto-tested
- **Token Usage**: 90% reduction through specialists
- **Fix Success Rate**: 70% of proposed fixes work first time
- **Agent Efficiency**: Average 3-5 agents per session, not 15

### Testing Metrics
- **Test Execution Time**: <30 seconds per implementation
- **Fix Proposal Accuracy**: >70% correct root cause identification
- **Regression Prevention**: 95% of bugs caught before commit

## Key Commands

### Simple Development Commands
```markdown
@do [simple task]           # Direct implementation
@test                      # Run Playwright tests
@fix                       # Apply proposed fixes
```

### Specialist Commands
```markdown
@vosk [accuracy issue]     # Vosk specialist helps
@websocket [connection]    # WebSocket expert
@chromadb [vector search]  # ChromaDB specialist
```

### Process Commands (When Needed)
```markdown
@brainstorm [complex idea] # Exploration mode
@invert [risky change]     # Risk analysis
```

## The Bottom Line

**Version 3.0 Philosophy**: 
- **Many specialists available, few used per session**
- **Automated testing eliminates manual debugging**
- **Deep expertise beats broad knowledge**
- **File-based memory survives everything**
- **FAIL-LOUD prevents hidden problems**

**Developer Experience**:
1. Request feature
2. Relevant specialists research (not all 15)
3. Implementation happens
4. Tests run automatically
5. See proposed fixes, just approve
6. Get working, tested code

**No more hours of debugging Claude's mistakes.**

---

**Document Version**: 3.0  
**Last Updated**: 2025-09-04  
**Major Changes from v2.0**:
- Refocused on specialist agents called on-demand (3-5 per session)
- Added automated testing as critical Phase 6
- Introduced Playwright fix proposal system
- Simplified workflow for simple tasks
- Added smart agent selection system
- Emphasized deep specialization over broad coverage
- Created test-driven development pipeline

**Next Review**: 2025-10-04