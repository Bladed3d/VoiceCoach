# Context System PRD - LED-Enhanced Persistent Intelligence
**Version 2.0 | Date: 2025-09-04**  
**Author: System Architecture Team**  
**Status: Updated with Enhanced Agent Architecture & Workflow**

## Executive Summary

The Context System solves Claude's fundamental limitation: catastrophic context loss during `/compact` operations and between sessions. By binding LED breadcrumbs to persistent filesystem documentation and employing focus-based specialist agents, we create an "institutional memory" that survives session boundaries and maintains decision rationale permanently.

Version 2.0 introduces the FAIL-LOUD development principle, Inversion Thinking methodology, and a 5-phase collaborative workflow that prevents unwanted code changes while optimizing for 10x token reduction and cost savings through KV-cache optimization.

## Problem Statement

### Current Pain Points

1. **Context Amnesia**
   - New Claude sessions start with zero project knowledge
   - `/compact` operations destroy 90% of conversation context
   - Critical decisions and rationale lost permanently
   - Same mistakes repeated across sessions

2. **Integration Failures**
   - Code written but never connected to intended UI elements
   - Functions implemented but not wired to buttons/events
   - Orphaned code with no clear purpose

3. **Token Exhaustion**
   - Reading large files consumes thousands of tokens
   - Context window fills rapidly with redundant information
   - Performance degrades as conversation grows
   - Finding code locations requires extensive searching (5,000-10,000 tokens)

4. **Decision Loss**
   - Why specific libraries were chosen becomes mystery
   - Test results proving code works get lost
   - Debugging patterns forgotten between sessions
   - Platform-specific solutions (Windows compatibility) repeatedly rediscovered

5. **Unwanted Code Changes** (NEW)
   - Claude immediately rewrites code when asked simple questions
   - No collaboration phase before implementation
   - Working code destroyed without understanding context

6. **Hidden Failures** (NEW)
   - Fallback/simulated data masks real problems
   - Silent failures make debugging impossible
   - Mock data creates false sense of functionality

### Impact Analysis

- **Development Velocity**: 40% time wasted re-explaining architecture
- **Error Rate**: Same errors repeated 5+ times (TaskKill incidents)
- **Frustration Level**: Critical (see saved frustration catalog)
- **Token Usage**: 10x higher than necessary due to re-reading files
- **Cost Impact**: Uncached tokens cost 10x more ($3.00 vs $0.30/MTok)
- **Code Stability**: Working code frequently destroyed by context-less changes

## Solution Overview

### Core Innovation

Combine five powerful concepts:
1. **LED Breadcrumbs**: Numbered trace points (1000-9099) as context anchors
2. **Focus-Based Agents**: Domain specialists that own specific knowledge areas
3. **Filesystem Persistence**: Markdown documents as permanent memory storage
4. **Inversion Thinking**: Systematic failure analysis before implementation
5. **FAIL-LOUD Policy**: No fake data or silent failures in development

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  5-Phase Workflow Controller              │
│        (Brainstorm → Research → Plan → Invert → Implement)│
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  LED Breadcrumb System                    │
│              (Context Triggers & Routing)                 │
└────────────────────────┬────────────────────────────────┘
                         │
           ┌─────────────┴─────────────┬─────────────┐
           ▼                           ▼              ▼
┌──────────────────┐       ┌──────────────────┐  ┌──────────────────┐
│ Domain Experts   │       │ Process Agents   │  │ Quality Agents   │
│ (WebSocket, Vosk)│       │ (Brainstorm, PM) │  │ (Inversion, Error)│
└──────────────────┘       └──────────────────┘  └──────────────────┘
           │                           │              │
           ▼                           ▼              ▼
┌─────────────────────────────────────────────────────────┐
│              Filesystem Context Documents                │
│                  (Persistent Memory)                     │
└─────────────────────────────────────────────────────────┘
```

## 5-Phase Collaborative Workflow

### Phase 1: BRAINSTORM (No Code)
**Trigger**: `@brainstorm [idea/question]`
- Explore multiple options
- Ask clarifying questions
- Generate approaches
- **NO IMPLEMENTATION**

### Phase 2: RESEARCH (No Code)
**Trigger**: After approach selection
- Domain experts investigate feasibility
- Check existing patterns
- Validate compatibility
- **NO IMPLEMENTATION**

### Phase 3: PLANNING (No Code)
**Trigger**: Project Manager synthesizes research
- Create detailed implementation plan
- Identify changes and impacts
- **NO IMPLEMENTATION**

### Phase 3.5: INVERSION (No Code) - NEW
**Trigger**: Automatic after planning
- Identify failure modes
- Find blind spots
- Create risk mitigations
- Apply Charlie Munger's "avoid stupidity" principle
- **NO IMPLEMENTATION**

### Phase 4: APPROVAL
**Trigger**: User reviews plan with risk analysis
- Explicit user consent required
- "Approved with safety nets"

### Phase 5: IMPLEMENTATION
**Trigger**: Only after approval
- Parent Claude implements
- Follows approved plan exactly
- No surprises or "improvements"

## Detailed Design

### 1. LED-Enhanced Breadcrumbs

#### Enhanced Implementation
```typescript
addBreadcrumb(6001, 'WebSocket connection started', {
  agent: 'websocket-expert',
  contextDoc: 'docs/context/6000-6099/6001-connection-init.md',
  decision: 'Using reconnecting-websocket for auto-recovery',
  research: 'docs/context/research/websocket-libraries-comparison.md',
  tests: 'docs/context/tests/6001-connection-tests.json',
  integration: {
    component: 'SplitViewCoaching.tsx',
    line: 412,
    function: 'initializeWebSocket'
  }
});
```

### 2. Comprehensive Agent Architecture

#### Domain Expert Agents

**WebSocket Expert (LED 6000-6099)**
- Responsibilities: WebSocket decisions, connection strategies, error recovery
- Knowledge Base: `docs/context/6000-6099-websocket/`
- Token Optimization: Returns 200-token summaries

**Vosk Expert (LED 5000-5099)**
- Responsibilities: Speech recognition, model optimization, accuracy tuning
- Knowledge Base: `docs/context/5000-5099-vosk/`
- Special Focus: Windows compatibility issues

**React Expert (LED 7000-7099)**
- Responsibilities: Component architecture, hooks, state management
- Knowledge Base: `docs/context/7000-7099-react/`

**Electron Bridge Agent (LED 1000-1099)**
- Responsibilities: Main/renderer process decisions, IPC patterns
- Prevents: Renderer/main process confusion

**RAG Document Analyst (LED 3000-5099)**
- Responsibilities: All three RAG phases
- Maintains: Knowledge base context

#### Process Management Agents

**Brainstorm Agent (LED 9800-9899)** - NEW
```typescript
interface BrainstormAgent {
  name: "brainstorm-collaborator",
  rules: [
    "NEVER write code",
    "ONLY explore ideas",
    "Generate multiple options",
    "Ask clarifying questions"
  ]
}
```

**Project Manager Agent (LED 9900-9999)** - NEW
- Reviews all research
- Creates implementation plans
- WAITS for user approval
- Delegates to Parent Claude

**Inversion Agent (LED 9850-9899)** - NEW
```typescript
interface InversionAgent {
  name: "devil's-advocate",
  philosophy: "Avoid stupidity rather than seek brilliance",
  systematic_questions: [
    "What would make this completely fail?",
    "What assumptions could be wrong?",
    "What existing code would this break?",
    "What are we NOT seeing?"
  ]
}
```

#### Quality Assurance Agents

**Error Visibility Agent (LED 8500-8599)** - NEW
- Mission: Make all failures impossible to ignore
- Enforces: FAIL-LOUD policy
- Prevents: Silent failures and fake data

**Integration Validator (Cross-boundary)**
- Verifies all connections between components
- Prevents orphaned code

**Code Discovery Agent (LED 9500-9599)** - NEW
- Maps code locations to LED numbers
- Answers "where is X?" instantly
- 90% token reduction for code search

**Context Librarian Agent (LED 9100-9199)** - NEW
- Manages context document lifecycle
- Performs compression and archival
- Maintains LED-INDEX.md

**Session Continuity Agent (LED 9700-9799)** - NEW
- Maintains coaching session state
- Prevents context drift in long sessions

**Test Validator Agent (LED 9000-9099)**
- Links tests to LED decisions
- Validates integration points

**Performance Monitor Agent (LED 9600-9699)** - NEW
- Tracks KV-cache hit rate
- Monitors token usage
- Measures compression effectiveness

### 3. FAIL-LOUD Development Policy - NEW

#### Core Principle
```typescript
interface FailLoudPolicy {
  ABSOLUTE_PROHIBITIONS: [
    "NEVER create fallback data in development",
    "NEVER simulate success when failing",
    "NEVER hide errors with fake responses",
    "NEVER return mock data without explicit flag",
    "NEVER catch errors without loud reporting"
  ],
  
  REQUIRED_BEHAVIORS: [
    "ALWAYS throw errors visibly",
    "ALWAYS show empty states clearly",
    "ALWAYS log failures with LED breadcrumbs",
    "ALWAYS make problems impossible to ignore",
    "ALWAYS prefer crash over silent failure"
  ]
}
```

#### Implementation Example
```typescript
// ❌ FORBIDDEN
catch (error) {
  return { transcript: "Sample text", tips: ["Tip 1"] }; // EVIL
}

// ✅ REQUIRED
catch (error) {
  addBreadcrumb(8001, '❌ DATA FETCH FAILED', error);
  throw new Error(`FAILED: ${error.message}`);
}
```

### 4. Context Document Structure with LED Naming

#### Directory Hierarchy
```
docs/context/
├── 1000-1099-startup/
│   ├── 1001-electron-init.md
│   ├── 1027-port-cleanup.md
│   └── archive/
├── 3000-3099-rag-phase1a/
│   ├── 3001-document-upload.md
│   ├── 3020-pure-analysis.md
│   └── 3020-pure-analysis-tests.json
├── 6000-6099-websocket/
│   ├── 6000-master-strategy.md
│   ├── 6001-connection-init.md
│   └── 6015-reconnect-patterns.md
├── 8500-8599-error-visibility/
│   ├── 8501-failure-patterns.md
│   └── 8502-error-ui-components.md
├── 9800-9899-brainstorm/
│   └── [timestamp]-[topic].md
├── 9850-9899-inversions/
│   ├── 6001-websocket-risks.md
│   └── catastrophic-risks.md
├── active/
│   ├── LED-INDEX.md
│   ├── CURRENT-CONTEXT.md
│   └── RECENT-DECISIONS.md
├── forbidden/
│   ├── NEVER-DO.md
│   └── NO-FAKE-DATA.md
└── session/
    ├── objectives.md
    ├── progress.jsonl
    └── errors.json
```

### 5. Token Optimization Strategy

#### KV-Cache Optimization (From Manus Research) - NEW
- Stable prompt prefix for 10x cost reduction
- Append-only context logs
- Explicit cache breakpoints
- Target: >80% cache hit rate

#### Code Discovery Optimization - NEW
**Without Context System**: ~6,500 tokens to find code
**With Context System**: ~700 tokens (90% reduction)

Example:
```
User: "Adjust Phase 1A process"
System: LED 3020 → phase1a-processor.ts:145 (instant)
```

### 6. Context Lifecycle Management

#### Enhanced Compression Strategy (From Manus) - NEW
1. **Level 1**: Full context (active session)
2. **Level 2**: Summary + restoration links (restorable)
3. **Level 3**: Key points + pointers (searchable)
4. **Level 4**: Hash + reference only (deep archive)

#### Attention Management - NEW
- Step-by-step objective files
- Attention anchors every 10 minutes
- Explicit progress tracking
- Session state checkpoints

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [x] Extend breadcrumbs.ts to support context metadata
- [ ] Create filesystem structure for context documents
- [ ] Build basic document read/write utilities
- [ ] Implement LED-INDEX.md generator
- [ ] Add FAIL-LOUD policy enforcement

### Phase 2: Agent Creation (Week 2)
- [ ] Create Brainstorm Agent
- [ ] Create Inversion Agent
- [ ] Create Project Manager Agent
- [ ] Create Error Visibility Agent
- [ ] Create Code Discovery Agent
- [ ] Create Context Librarian Agent
- [ ] Create domain expert agents (WebSocket, Vosk, React, Electron)
- [ ] Define agent knowledge boundaries and communication protocols

### Phase 3: Workflow Integration (Week 3)
- [ ] Implement 5-phase workflow controller
- [ ] Connect LED triggers to agent routing
- [ ] Build automatic Inversion Analysis after planning
- [ ] Create approval gates before implementation
- [ ] Implement research routing system

### Phase 4: Intelligence Features (Week 4)
- [ ] Implement KV-cache optimization
- [ ] Build restorable compression system
- [ ] Create code discovery index
- [ ] Add "keep the wrong stuff in" error learning
- [ ] Implement decision validation system

### Phase 5: Optimization (Week 5)
- [ ] Implement context pruning with 4-level compression
- [ ] Build archival system
- [ ] Create search capabilities
- [ ] Add performance monitoring
- [ ] Implement A/B testing framework

### Phase 6: Production Deployment (Week 6)
- [ ] Deploy on VoiceCoach V2
- [ ] Monitor KV-cache hit rates
- [ ] Measure token usage reduction
- [ ] Track error prevention metrics
- [ ] Document lessons learned

## Success Metrics

### Quantitative Metrics
- **Token Usage**: 90% reduction for code discovery, 80% overall reduction
- **KV-Cache Hit Rate**: >80% (10x cost savings)
- **Error Repetition**: 0 repeated mistakes after documentation
- **Development Speed**: 2x faster implementation after Phase 3
- **Context Retention**: 100% decision rationale preserved
- **Integration Success**: 100% of code connected to UI
- **Compression Ratio**: 10:1 without information loss
- **Failure Visibility**: 100% of errors shown loudly

### Qualitative Metrics
- **Developer Control**: No unwanted code changes
- **Collaboration Quality**: Ideas explored before implementation
- **Claude Intelligence**: Maintains context across sessions
- **Documentation Quality**: Self-documenting codebase
- **Debugging Speed**: Instant LED trace to decision rationale
- **Risk Prevention**: Problems caught in planning, not production

## Risk Mitigation

### Identified Risks

1. **Filesystem Bloat**
   - Risk: Thousands of context documents
   - Mitigation: LED-based naming, 4-level compression, automatic pruning

2. **Agent Confusion**
   - Risk: Agents making conflicting decisions
   - Mitigation: Clear LED range boundaries, integration validator

3. **Workflow Adoption**
   - Risk: Users bypass safety phases
   - Mitigation: Clear commands, obvious benefits, time savings

4. **Hidden Failures** (Addressed by FAIL-LOUD)
   - Risk: Fake data hiding real problems
   - Mitigation: Mandatory error visibility, no fallback data

## Security Considerations

### Data Protection
- No secrets/credentials in context documents
- Sanitize sensitive information before storage
- Git-ignore patterns for private contexts

### Access Control
- Read-only for archived contexts
- Write permissions only for active agents
- Audit trail for all modifications

## Maintenance Requirements

### Daily Operations
- Monitor active context size
- Verify LED coverage
- Check integration points
- Review error visibility

### Weekly Tasks
- Consolidate related decisions
- Archive old contexts
- Update LED-INDEX.md
- Review Inversion Analysis findings

### Monthly Reviews
- Prune cold storage
- Analyze token savings
- Review error patterns
- Update agent knowledge bases

## Critical System Rules

### Universal Agent Instructions
```markdown
1. NEVER implement without user approval
2. NEVER create fallback/fake data
3. ALWAYS fail loudly in development
4. ALWAYS document decisions in context files
5. ALWAYS respect the 5-phase workflow
```

### The Context System Mantras
- **"RESEARCH → PLAN → INVERT → APPROVE → IMPLEMENT"**
- **"Fail loud, fail fast, fail visibly"**
- **"Avoid stupidity rather than seek brilliance"**
- **"Every decision creates a document"**

## Future Enhancements

### Version 3.0 Possibilities
1. **Visual LED Browser**: Web interface to explore context relationships
2. **AI Context Search**: Natural language queries across all decisions
3. **Cross-Project Learning**: Share context patterns between projects
4. **Automated Testing**: Generate tests from LED specifications
5. **Real-time Collaboration**: Multiple agents working simultaneously
6. **State Space Models**: Eliminate context window limitations

## Conclusion

The Context System Version 2.0 transforms Claude from a powerful but forgetful and sometimes destructive tool into an intelligent, collaborative development partner with perfect institutional memory. By combining LED breadcrumbs, focus-based agents, filesystem persistence, Inversion Thinking, and the FAIL-LOUD policy, we solve the fundamental problems that have plagued AI-assisted development.

This system ensures:
- No unwanted code changes through mandatory collaboration phases
- No hidden failures through FAIL-LOUD policy
- No repeated mistakes through persistent context
- No wasted tokens through intelligent routing
- No missed risks through Inversion Analysis

Most importantly, it creates a development environment where every line of code has traceable rationale, proven test results, and identified risk mitigations.

## Appendix A: Agent Communication Protocol

### Standard Commands
```markdown
@brainstorm [idea]          # Start exploration
@research [approach]        # Validate feasibility
@plan                      # Create implementation plan
@invert                    # Analyze failure modes
@approve                   # User consent to proceed
@implement                 # Execute approved plan
@error [issue]             # Debug with visibility
@discover [component]      # Find code location
```

### Agent Delegation Flow
```
User Request → Brainstorm Agent → Research Agents → Project Manager → 
Inversion Agent → User Approval → Parent Claude Implementation
```

## Appendix B: FAIL-LOUD Examples

### WebSocket Connection Failure
```typescript
// ✅ CORRECT - Fail Loud
ws.onerror = (error) => {
  addBreadcrumb(6099, '❌ WEBSOCKET FAILED', error);
  setErrorBanner('WebSocket connection failed');
  throw new Error(`WebSocket failed: ${error}`);
};

// ❌ WRONG - Hidden Failure
ws.onerror = () => {
  setTranscript("Connected..."); // FAKE DATA
};
```

## Appendix C: Inversion Analysis Template

### Standard Risk Assessment
```markdown
## What Would Make This Fail?
1. [Failure Mode] - [Probability] × [Impact]
   MITIGATION: [Specific prevention]

## What Are We NOT Seeing?
- [Blind spot identification]

## What Would Break Existing Code?
- [Integration risk analysis]

## Anti-Goals (What NOT to Do)
- ❌ [Specific anti-pattern to avoid]
```

## Appendix D: Forbidden Patterns

### Never-Do List (docs/context/forbidden/NEVER-DO.md)
```markdown
# Critical Forbidden Patterns

## Process Management
❌ NEVER: `taskkill //F //IM node.exe`
✅ ALWAYS: Use specific PIDs

## Development Data
❌ NEVER: Create fallback/mock data in development
✅ ALWAYS: Show real empty states and errors

## Context Management
❌ NEVER: Implement without user approval
✅ ALWAYS: Follow 5-phase workflow

## Platform Libraries
❌ NEVER: vosk Node.js on Windows
✅ ALWAYS: Python subprocess for Vosk on Windows
```

---

**Document Version**: 2.0  
**Last Updated**: 2025-09-04  
**Major Changes from v1.0**:
- Added 5-phase collaborative workflow with Inversion Analysis
- Introduced FAIL-LOUD development policy
- Added 10+ new specialized agents
- Incorporated Manus research (KV-cache, compression)
- Added code discovery optimization (90% token reduction)
- Enhanced LED ranges for new agent responsibilities
- Added explicit anti-fallback data rules
- Introduced Charlie Munger's Inversion Thinking methodology

**Next Review**: 2025-10-04