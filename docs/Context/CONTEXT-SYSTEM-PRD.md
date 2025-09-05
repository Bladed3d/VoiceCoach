# Context System PRD - LED-Enhanced Persistent Intelligence
**Version 1.0 | Date: 2025-09-04**  
**Author: System Architecture Team**  
**Status: Draft**

## Executive Summary

The Context System solves Claude's fundamental limitation: catastrophic context loss during `/compact` operations and between sessions. By binding LED breadcrumbs to persistent filesystem documentation and employing focus-based specialist agents, we create an "institutional memory" that survives session boundaries and maintains decision rationale permanently.

This system transforms Claude from a forgetful assistant into an intelligent development partner with perfect project recall, eliminating repeated mistakes and lost architectural decisions.

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

4. **Decision Loss**
   - Why specific libraries were chosen becomes mystery
   - Test results proving code works get lost
   - Debugging patterns forgotten between sessions
   - Platform-specific solutions (Windows compatibility) repeatedly rediscovered

### Impact Analysis

- **Development Velocity**: 40% time wasted re-explaining architecture
- **Error Rate**: Same errors repeated 5+ times (TaskKill incidents)
- **Frustration Level**: Critical (see saved frustration catalog)
- **Token Usage**: 10x higher than necessary due to re-reading files

## Solution Overview

### Core Innovation

Combine three powerful concepts:
1. **LED Breadcrumbs**: Numbered trace points (1000-9099) as context anchors
2. **Focus-Based Agents**: Domain specialists that own specific knowledge areas
3. **Filesystem Persistence**: Markdown documents as permanent memory storage

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Claude Interface                      │
│                  (Conversation + Tokens)                  │
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
│ WebSocket Expert │       │   Vosk Expert    │  │   React Expert   │
│  (LED 6000-6099) │       │  (LED 5000-5099) │  │  (LED 7000-7099) │
└──────────────────┘       └──────────────────┘  └──────────────────┘
           │                           │              │
           ▼                           ▼              ▼
┌─────────────────────────────────────────────────────────┐
│              Filesystem Context Documents                │
│                  (Persistent Memory)                     │
└─────────────────────────────────────────────────────────┘
```

## Detailed Design

### 1. LED-Enhanced Breadcrumbs

#### Current Implementation
```typescript
addBreadcrumb(6001, 'WebSocket connection started');
```

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

### 2. Focus-Based Agent Architecture

#### Agent Specialization

**WebSocket Expert (LED 6000-6099)**
- **Responsibilities**: All WebSocket decisions, connection strategies, error recovery
- **Knowledge Base**: `docs/context/6000-6099-websocket/`
- **Persistent Memory**: Connection patterns, platform issues, proven solutions
- **Token Optimization**: Returns 200-token summaries instead of 10K token conversations

**Vosk Expert (LED 5000-5099)**
- **Responsibilities**: Speech recognition, model optimization, accuracy tuning
- **Knowledge Base**: `docs/context/5000-5099-vosk/`
- **Persistent Memory**: Windows compatibility, Python vs Node.js decisions
- **Token Optimization**: Maintains configuration history without re-explaining

**React Expert (LED 7000-7099)**
- **Responsibilities**: Component architecture, hooks, state management
- **Knowledge Base**: `docs/context/7000-7099-react/`
- **Persistent Memory**: UI patterns, performance optimizations, integration points
- **Token Optimization**: Component decisions documented once, referenced forever

**Integration Validator (Cross-boundary)**
- **Responsibilities**: Verify all connections between components
- **Knowledge Base**: `docs/context/integration/`
- **Persistent Memory**: Component-to-service mappings, orphaned code detection
- **Token Optimization**: Validates without re-reading entire codebase

### 3. Context Document Structure

#### Directory Hierarchy
```
docs/context/
├── 1000-1099-startup/
│   ├── 1001-electron-init.md
│   ├── 1027-port-cleanup.md
│   └── archive/
├── 2000-2099-upload/
│   ├── 2001-file-validation.md
│   └── 2045-size-limits.md
├── 5000-5099-vosk/
│   ├── 5001-model-load.md
│   ├── 5023-accuracy-config.md
│   └── 5045-windows-compatibility.md
├── 6000-6099-websocket/
│   ├── 6000-master-strategy.md
│   ├── 6001-connection-init.md
│   ├── 6015-reconnect-patterns.md
│   └── 6068-session-mgmt.md
├── 7000-7099-react/
│   ├── 7001-component-architecture.md
│   └── 7060-state-management.md
├── 8000-8099-errors/
│   ├── 8001-error-boundaries.md
│   └── 8050-recovery-strategies.md
├── active/
│   ├── LED-INDEX.md          # Master lookup table
│   ├── CURRENT-CONTEXT.md    # Active session state
│   └── RECENT-DECISIONS.md   # Last 20 decisions
├── research/
│   └── [timestamp]-[topic].md
└── forbidden/
    └── NEVER-DO.md           # Critical mistakes to avoid
```

#### Document Schema

Each LED context document follows this structure:

```markdown
# LED [NUMBER] - [TITLE]
**Created**: 2025-09-04  
**Agent**: websocket-expert  
**Status**: Active  

## Purpose
Why this code exists and what problem it solves.

## Decision
The specific implementation choice and rationale.

## Research
- Link: research/2025-09-04-websocket-libraries.md
- Tested libraries: socket.io, ws, reconnecting-websocket
- Winner: reconnecting-websocket (auto-recovery, smaller bundle)

## Implementation
```typescript
// Actual code implementation
```

## Integration Points
- Component: SplitViewCoaching.tsx:412
- Function: initializeWebSocket()
- Event Handler: onStartSession()

## Test Results
- Test file: tests/6001-websocket-connection.test.ts
- Status: PASSING
- Coverage: 95%
- Performance: <100ms connection time

## Dependencies
- Related LEDs: 6015 (reconnect), 6068 (session)
- Parent: 6000 (master strategy)

## Platform Notes
- Windows: No issues
- macOS: Requires security prompt
- Linux: Works out of the box

## Update History
- 2025-09-04: Initial implementation
- 2025-09-03: Added reconnect logic
```

### 4. Context Retrieval System

#### Automatic Loading
```typescript
export function addBreadcrumb(id: number, message: string, context?: ContextData) {
  console.log(`[LED ${id}] ${message}`);
  
  // Store in history
  breadcrumbHistory.push({ id, message, timestamp: Date.now(), context });
  
  // Auto-load relevant context
  if (context?.contextDoc) {
    const docs = loadContextDocuments(id);
    if (context.agent) {
      delegateToAgent(context.agent, docs);
    }
  }
}

function loadContextDocuments(ledId: number): ContextDocuments {
  const range = Math.floor(ledId / 100) * 100;
  const rangePath = `${range}-${range + 99}`;
  
  return {
    master: loadDoc(`${rangePath}/${range}.md`),
    specific: loadDoc(`${rangePath}/${ledId}*.md`),
    recent: loadRecentContext(),
    forbidden: loadDoc('forbidden/NEVER-DO.md')
  };
}
```

#### Smart Context Resolution
```typescript
// When encountering an LED in code
function resolveContext(ledId: number): QuickContext {
  // 1. Check active cache
  if (activeCache.has(ledId)) {
    return activeCache.get(ledId);
  }
  
  // 2. Load from filesystem
  const doc = loadLEDDocument(ledId);
  
  // 3. Extract minimal context (200 tokens max)
  return {
    purpose: doc.purpose,
    decision: doc.decision,
    integration: doc.integrationPoints,
    testStatus: doc.testResults.status
  };
}
```

### 5. Token Optimization Strategy

#### Research Routing Pattern
```
1. Parent Claude sees task requiring WebSocket research
2. Delegates to WebSocket Expert with task description
3. Expert reads 10+ documents (10,000 tokens)
4. Expert writes findings to filesystem
5. Expert returns 200-token summary to parent
6. Parent proceeds with implementation
```

#### Token Savings Analysis
- **Traditional**: 10,000 tokens in conversation
- **With Context System**: 200 tokens in conversation + filesystem storage
- **Savings**: 98% reduction in conversation tokens
- **Benefit**: No `/compact` needed, context never lost

### 6. Context Lifecycle Management

#### Three-Tier Retention
1. **Hot (Active)** - Last 7 days
   - Individual LED files
   - Immediate access
   - Full detail

2. **Warm (Archived)** - 7-30 days
   - Consolidated by topic
   - Indexed for search
   - Compressed detail

3. **Cold (Historical)** - 30+ days
   - Archived with timestamp
   - Searchable but not auto-loaded
   - Minimal storage

#### Pruning Strategy
```typescript
async function pruneContextDocuments() {
  const now = Date.now();
  const contexts = await getAllContextDocuments();
  
  for (const context of contexts) {
    const age = now - context.lastAccessed;
    
    if (age > 30 * 24 * 60 * 60 * 1000) { // 30 days
      await archiveContext(context);
    }
    
    if (age > 7 * 24 * 60 * 60 * 1000) { // 7 days
      await consolidateRelated(context);
    }
  }
}
```

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Extend breadcrumbs.ts to support context metadata
- [ ] Create filesystem structure for context documents
- [ ] Build basic document read/write utilities
- [ ] Implement LED-INDEX.md generator

### Phase 2: Agent Creation (Week 2)
- [ ] Create WebSocket Expert agent
- [ ] Create Vosk Expert agent
- [ ] Create React Expert agent
- [ ] Create Integration Validator agent
- [ ] Define agent knowledge boundaries

### Phase 3: Context Integration (Week 3)
- [ ] Connect LED triggers to agent routing
- [ ] Implement automatic context loading
- [ ] Build context document templates
- [ ] Create research routing system

### Phase 4: Intelligence Features (Week 4)
- [ ] Implement decision validation system
- [ ] Build integration verification
- [ ] Create test result linking
- [ ] Add platform-specific notes

### Phase 5: Optimization (Week 5)
- [ ] Implement context pruning
- [ ] Build archival system
- [ ] Create search capabilities
- [ ] Add performance monitoring

### Phase 6: Production Deployment (Week 6)
- [ ] Deploy on VoiceCoach V2
- [ ] Monitor token usage reduction
- [ ] Measure error prevention
- [ ] Document lessons learned

## Success Metrics

### Quantitative Metrics
- **Token Usage**: 80% reduction in conversation tokens
- **Error Repetition**: 0 repeated mistakes after documentation
- **Development Speed**: 2x faster implementation after Phase 3
- **Context Retention**: 100% decision rationale preserved
- **Integration Success**: 100% of code connected to UI

### Qualitative Metrics
- **Developer Satisfaction**: No more re-explaining architecture
- **Claude Intelligence**: Maintains context across sessions
- **Documentation Quality**: Self-documenting codebase
- **Debugging Speed**: Instant LED trace to decision rationale

## Risk Mitigation

### Identified Risks

1. **Filesystem Bloat**
   - **Risk**: Thousands of context documents
   - **Mitigation**: LED-based naming, automatic pruning, three-tier retention

2. **Agent Confusion**
   - **Risk**: Agents making conflicting decisions
   - **Mitigation**: Clear boundaries (LED ranges), integration validator

3. **Context Retrieval Speed**
   - **Risk**: Slow document loading
   - **Mitigation**: LED indexing, active cache, lazy loading

4. **Version Conflicts**
   - **Risk**: Outdated decisions persisting
   - **Mitigation**: Timestamp all decisions, update history tracking

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

### Weekly Tasks
- Consolidate related decisions
- Archive old contexts
- Update LED-INDEX.md

### Monthly Reviews
- Prune cold storage
- Analyze token savings
- Review error patterns

## Future Enhancements

### Version 2.0 Possibilities
1. **Visual LED Browser**: Web interface to explore context relationships
2. **AI Context Search**: Natural language queries across all decisions
3. **Cross-Project Learning**: Share context patterns between projects
4. **Automated Testing**: Generate tests from LED specifications
5. **Real-time Collaboration**: Multiple agents working simultaneously

## Conclusion

The Context System transforms Claude from a powerful but forgetful tool into an intelligent development partner with perfect institutional memory. By combining LED breadcrumbs, focus-based agents, and filesystem persistence, we solve the fundamental context problem that has plagued AI-assisted development.

This system will eliminate repeated errors, preserve architectural decisions, and maintain Claude's intelligence across sessions and compaction events. Most importantly, it creates a self-documenting codebase where every line of code has traceable rationale and proven test results.

## Appendix A: Example Context Documents

### Example: WebSocket Connection Decision
```markdown
# LED 6001 - WebSocket Connection Initialization
**Created**: 2025-09-04  
**Agent**: websocket-expert  

## Purpose
Establish reliable WebSocket connection for real-time transcription data flow between Python Vosk server and Electron renderer process.

## Decision
Chose `reconnecting-websocket` library over `ws` and `socket.io`:
- Auto-reconnection built-in (critical for long coaching sessions)
- 5KB vs 89KB bundle size
- No server-side changes needed

## Integration Points
- Component: SplitViewCoaching.tsx:412
- Connected to: Start Coaching Session button
- Cleanup: stopCoachingSession() at line 523
```

### Example: Platform Compatibility Note
```markdown
# LED 5045 - Vosk Windows Compatibility
**Created**: 2025-08-27  
**Agent**: vosk-expert  

## Critical Learning
**NEVER use vosk Node.js on Windows** - ffi-napi incompatibility causes 2+ hour debugging sessions.

## Solution
Python subprocess approach:
- Proven working implementation
- No compatibility issues
- User has tested code in D:\Projects\Ai\VoiceCoach\docs\vosk\
```

## Appendix B: Forbidden Patterns

### Never-Do List (docs/context/forbidden/NEVER-DO.md)
```markdown
# Critical Forbidden Patterns

## Process Management
❌ NEVER: `taskkill //F //IM node.exe`
✅ ALWAYS: Use specific PIDs

## Development CSP
❌ NEVER: Restrictive CSP during development
✅ ALWAYS: Permissive CSP, restrict only in production

## Platform Libraries
❌ NEVER: vosk Node.js on Windows
✅ ALWAYS: Python subprocess for Vosk on Windows
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-09-04  
**Next Review**: 2025-10-04