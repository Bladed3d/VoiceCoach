# Context System PRD - Universal Intent Router & Task Management
**Version 8.0 | Date: 2025-09-04**  
**Author: System Architecture Team**  
**Status: Production-Ready with Universal Protection**

## Executive Summary

The Context System solves Claude's fundamental limitation: catastrophic context loss during `/compact` operations and between sessions. Version 8.0 introduces the **Universal Intent Router** - a mandatory entry point that PREVENTS Claude from destroying code without context - and **Task Management Agents** that handle the complete development lifecycle from PRD to deployment.

Key innovation: Every single interaction with Claude MUST go through cs-intent-router first, eliminating the "Claude rewrites everything without asking" problem permanently.

## Problem Statement

### Current Pain Points

1. **Claude's Destructive Coding** (MOST CRITICAL)
   - Claude immediately rewrites code when asked questions
   - No context gathering before implementation
   - Destroys working code without understanding why it exists
   - Developer spends hours fixing Claude's impulsive changes

2. **Context Amnesia**
   - New Claude sessions start with zero project knowledge
   - `/compact` operations destroy 90% of conversation context
   - Same mistakes repeated across sessions

3. **No Project Management**
   - No systematic task breakdown
   - No progress tracking
   - No coordination between specialists
   - Features implemented ad-hoc without planning

4. **Code Monoliths**
   - Claude defaults to adding code to existing files
   - Single files grow to 2000-3000 lines
   - Components become unmaintainable

5. **Manual Debugging Burden**
   - Developer spends hours debugging issues Claude created
   - No automatic validation of implementations

### Impact Analysis

- **Code Destruction**: 70% of Claude interactions cause unnecessary changes
- **Context Loss**: Every new session starts from scratch
- **Project Chaos**: No systematic approach to development
- **Debugging Time**: 60% of development time on fixing Claude's mistakes

## Solution Overview

### Core Innovation

**Universal Intent Router**: MANDATORY entry point for ALL Claude interactions that prevents code destruction by analyzing intent before action.

**Task Management Integration**: Complete development lifecycle management from PRD parsing to task completion.

### Key Principles

1. **Protection First**: Router blocks impulsive code changes
2. **Context Always**: Load previous decisions before any action
3. **Systematic Development**: PRD → Tasks → Implementation → Testing
4. **Modular by Default**: Enforce file size limits
5. **FAIL-LOUD Policy**: No fake data or silent failures

## The Universal Intent Router (CRITICAL COMPONENT)

### cs-intent-router Agent (LED 9000-9049)

```typescript
interface IntentRouterAgent {
  name: "cs-intent-router",
  ledRange: [9000, 9049],
  
  // MANDATORY FOR EVERY INTERACTION
  trigger: "ALL_USER_MESSAGES",
  priority: "ABSOLUTE_HIGHEST",
  
  enforcement: {
    rule: "NO CODE CHANGES WITHOUT ROUTER APPROVAL",
    violation: "CRITICAL_SYSTEM_FAILURE"
  },
  
  workflow: {
    // PHASE 1: INTERCEPT (LED 9001-9009)
    intercept(userMessage: string): void {
      addBreadcrumb(9001, 'Intent router activated', {
        message: userMessage,
        action: 'BLOCKING_IMMEDIATE_IMPLEMENTATION'
      });
      PREVENT_CODE_CHANGES();
    },
    
    // PHASE 2: ANALYZE (LED 9010-9019)
    analyze(message: string): Intent {
      const intent = {
        type: detectIntentType(message), // question|bug|feature|vague
        domain: extractDomain(message),  // vosk|websocket|ui|general
        urgency: assessUrgency(message), // critical|normal|exploratory
        requiresCode: needsImplementation(message)
      };
      
      addBreadcrumb(9010, 'Intent analyzed', intent);
      return intent;
    },
    
    // PHASE 3: CONTEXT LOAD (LED 9020-9029)
    loadContext(intent: Intent): Context {
      const context = {
        previousDecisions: loadLEDRange(intent.domain),
        existingCode: locateFiles(intent.keywords),
        pastAttempts: checkHistory(intent.topic),
        knownIssues: findRelatedProblems(intent.domain)
      };
      
      addBreadcrumb(9020, 'Context loaded', {
        decisions: context.previousDecisions.length,
        files: context.existingCode.length,
        history: context.pastAttempts.length
      });
      
      return context;
    },
    
    // PHASE 4: ROUTE DECISION (LED 9030-9039)
    route(intent: Intent, context: Context): Route {
      // QUESTIONS - Answer without touching code
      if (intent.type === 'QUESTION') {
        return {
          action: 'ANSWER_ONLY',
          agents: [],
          allowCode: false,
          response: generateAnswer(context)
        };
      }
      
      // BUGS - Research then fix
      if (intent.type === 'BUG') {
        return {
          action: 'DIAGNOSE_FIRST',
          agents: [getDomainSpecialist(intent.domain), 'cs-inversion-agent'],
          allowCode: false, // Until diagnosis complete
          workflow: 'research → propose → approve → implement'
        };
      }
      
      // FEATURES - Plan then build
      if (intent.type === 'FEATURE') {
        return {
          action: 'PLAN_FIRST',
          agents: ['cs-task-decomposer', 'cs-brainstorm-agent'],
          allowCode: false, // Until planning complete
          workflow: 'decompose → brainstorm → approve → implement'
        };
      }
      
      // VAGUE - Explore first
      if (intent.type === 'VAGUE') {
        return {
          action: 'CLARIFY',
          agents: ['cs-brainstorm-agent'],
          allowCode: false,
          response: 'Let me help clarify what you need...'
        };
      }
      
      addBreadcrumb(9030, 'Routing decision', route);
      return route;
    },
    
    // PHASE 5: EXECUTE (LED 9040-9049)
    execute(route: Route): Response {
      if (!route.allowCode) {
        MAINTAIN_CODE_BLOCK();
      }
      
      if (route.agents.length > 0) {
        return delegateToAgents(route.agents, route.workflow);
      }
      
      return {
        response: route.response,
        codeChanged: false,
        breadcrumb: 9040
      };
    }
  },
  
  // Protection mechanisms
  protection: {
    codeChangeBlock: {
      message: `
        ❌ CODE CHANGE BLOCKED
        
        Intent Router has blocked immediate code changes.
        Reason: Context must be loaded first
        Next step: Analyzing your request...
      `,
      override: "Only with explicit user approval after context review"
    },
    
    contextRequired: {
      before: "ANY code modification",
      must: "Load LED breadcrumbs and previous decisions",
      verify: "Existing implementation reasons"
    }
  }
}
```

### Enforcement Mechanisms

#### 1. Project Configuration (.claude/claude_project.md)
```markdown
# ⚠️ CRITICAL SYSTEM RULE #1 - MANDATORY ⚠️

## NEVER SKIP THIS RULE - IT OVERRIDES EVERYTHING

Before responding to ANY user message, you MUST:

1. **STOP** - Do not write or modify any code
2. **RUN** - Execute cs-intent-router workflow
3. **LOAD** - Retrieve context from LED breadcrumbs
4. **ANALYZE** - Determine appropriate response type
5. **ROUTE** - Follow router's decision

This applies to:
- New chat sessions
- Continued conversations  
- "Simple" questions
- Bug fixes
- Feature requests
- EVERYTHING

Violation = Critical system failure

The router will TELL you when code changes are allowed.
```

#### 2. Pre-Flight Check (Every Response)
```typescript
// REQUIRED: First lines of EVERY Claude response
console.log("═══════════════════════════════════════");
console.log("✅ Intent-Router Check: COMPLETE");
console.log("📍 Context Loaded: LED [range]");
console.log("🎯 Route Decision: [action/agents]");
console.log("🔒 Code Changes: [BLOCKED/ALLOWED]");
console.log("═══════════════════════════════════════");
```

#### 3. File System Reinforcement
```
project-root/
├── .claude/
│   ├── claude_project.md               # Rule #1 defined
│   ├── STOP-READ-FIRST.md             # Backup reminder
│   └── INTENT-ROUTER-MANDATORY.md     # Detailed workflow
├── docs/
│   └── context/
│       ├── 9000-INTENT-ROUTER.md      # Router documentation
│       └── 9001-ROUTER-EXAMPLES.md    # Usage examples
```

## Task Management Agents (NEW SUBSYSTEM)

### cs-task-decomposer Agent (LED 9200-9299)

```typescript
interface TaskDecomposerAgent {
  name: "cs-task-decomposer",
  ledRange: [9200, 9299],
  
  expertise: [
    "PRD parsing and analysis",
    "Task hierarchy generation",
    "Complexity estimation",
    "Dependency mapping",
    "Modular task structuring"
  ],
  
  capabilities: {
    parsePRD(document: string): TaskTree {
      // Extract all requirements
      const requirements = extractRequirements(document);
      
      // Generate task hierarchy
      const tasks = requirements.map(req => ({
        id: generateId(),
        title: req.title,
        complexity: estimateComplexity(req),
        dependencies: identifyDependencies(req),
        assignedSpecialist: matchSpecialist(req),
        estimatedLines: calculateSize(req),
        modules: planModularStructure(req)
      }));
      
      addBreadcrumb(9201, 'PRD parsed', {
        totalTasks: tasks.length,
        totalComplexity: sumComplexity(tasks),
        specialists: uniqueSpecialists(tasks)
      });
      
      return buildTaskTree(tasks);
    },
    
    decomposeTask(task: ComplexTask): SubTask[] {
      // Check modularization requirements
      if (task.estimatedLines > FILE_SIZE_LIMITS.components) {
        return splitIntoModules(task);
      }
      
      // Break into subtasks
      const subtasks = [
        createResearchTask(task),
        createImplementationTask(task),
        createTestingTask(task),
        createDocumentationTask(task)
      ];
      
      addBreadcrumb(9210, 'Task decomposed', {
        parent: task.id,
        subtasks: subtasks.map(s => s.id),
        totalEffort: sumEffort(subtasks)
      });
      
      return subtasks;
    },
    
    enforceModularization(task: Task): ModuleStructure {
      // Force modular approach for large tasks
      return {
        maxFileSize: FILE_SIZE_LIMITS[task.type],
        requiredModules: calculateRequiredModules(task),
        structure: generateModularStructure(task)
      };
    }
  },
  
  output: {
    location: "docs/context/9200-9299-tasks/",
    format: {
      taskTree: "9201-task-hierarchy.md",
      dependencies: "9210-dependencies.md",
      assignments: "9220-specialist-assignments.md"
    }
  }
}
```

### cs-project-orchestrator Agent (LED 9300-9399)

```typescript
interface ProjectOrchestratorAgent {
  name: "cs-project-orchestrator",
  ledRange: [9300, 9399],
  
  expertise: [
    "Workflow state management",
    "Task progression tracking",
    "Specialist coordination",
    "Milestone management",
    "Blocker resolution"
  ],
  
  state: {
    backlog: Task[],
    ready: Task[],      // Unblocked, ready to start
    inProgress: Task[],
    review: Task[],
    completed: Task[],
    blocked: Task[]
  },
  
  capabilities: {
    getNextTask(): Task {
      // Find highest priority unblocked task
      const ready = this.findReadyTasks();
      const priority = this.prioritizeByImpact(ready);
      
      addBreadcrumb(9301, 'Next task selected', {
        task: priority[0],
        reason: 'Highest impact, no blockers'
      });
      
      return priority[0];
    },
    
    assignToSpecialist(task: Task): Assignment {
      const specialist = this.matchTaskToSpecialist(task);
      const workload = this.checkSpecialistLoad(specialist);
      
      if (workload.available) {
        addBreadcrumb(9310, 'Task assigned', {
          task: task.id,
          specialist: specialist.name,
          estimatedCompletion: workload.eta
        });
        
        return {
          task,
          specialist,
          status: 'ASSIGNED'
        };
      }
      
      return this.queueTask(task);
    },
    
    trackProgress(): ProgressReport {
      return {
        completed: this.state.completed.length,
        inProgress: this.state.inProgress.length,
        blocked: this.state.blocked.length,
        velocity: this.calculateVelocity(),
        estimatedCompletion: this.projectCompletion(),
        blockers: this.identifyBlockers()
      };
    },
    
    resolveBlocker(task: Task): Resolution {
      const blocker = this.identifyBlocker(task);
      const resolution = this.findResolution(blocker);
      
      addBreadcrumb(9320, 'Blocker resolved', {
        task: task.id,
        blocker: blocker.type,
        resolution: resolution.method
      });
      
      return resolution;
    }
  },
  
  coordination: {
    dailyStandup(): StandupReport {
      return {
        yesterday: this.getCompletedSince(yesterday),
        today: this.state.inProgress,
        blockers: this.state.blocked,
        nextUp: this.getNextTasks(5)
      };
    }
  },
  
  output: {
    location: "docs/context/9300-9399-orchestration/",
    files: {
      state: "9301-current-state.md",
      progress: "9310-progress-report.md",
      blockers: "9320-blockers.md"
    }
  }
}
```

### cs-research-coordinator Agent (LED 9400-9499)

```typescript
interface ResearchCoordinatorAgent {
  name: "cs-research-coordinator",
  ledRange: [9400, 9499],
  
  expertise: [
    "Multi-source research aggregation",
    "Cross-specialist knowledge synthesis",
    "Conflict resolution",
    "Best practice identification",
    "Context-aware recommendations"
  ],
  
  capabilities: {
    multiSourceResearch(topic: string): Research {
      // Coordinate multiple specialists
      const specialists = this.identifyRelevantSpecialists(topic);
      
      const findings = await Promise.all(
        specialists.map(spec => spec.research(topic))
      );
      
      // Aggregate and resolve conflicts
      const synthesis = this.synthesizeFindings(findings);
      
      addBreadcrumb(9401, 'Multi-source research complete', {
        topic,
        sources: specialists.length,
        findings: findings.length,
        conflicts: synthesis.conflicts,
        consensus: synthesis.consensus
      });
      
      return {
        consensus: synthesis.consensus,
        alternatives: synthesis.alternatives,
        recommendations: synthesis.recommendations,
        confidence: synthesis.confidence
      };
    },
    
    resolveConflicts(findings: Finding[]): Resolution {
      // When specialists disagree
      const conflicts = this.identifyConflicts(findings);
      
      for (const conflict of conflicts) {
        const resolution = this.weighEvidence({
          authority: this.checkSourceAuthority(conflict),
          recency: this.checkDataRecency(conflict),
          projectFit: this.assessProjectRelevance(conflict),
          performance: this.comparePerformanceData(conflict)
        });
        
        addBreadcrumb(9410, 'Conflict resolved', {
          issue: conflict.topic,
          resolution: resolution.decision,
          reasoning: resolution.justification
        });
      }
      
      return resolution;
    },
    
    generateContextualRecommendations(): Recommendations {
      // Based on current project state
      const context = {
        codebaseAnalysis: this.analyzeCodebase(),
        taskProgress: this.getProjectProgress(),
        knownIssues: this.getOpenIssues(),
        techStack: this.identifyTechStack()
      };
      
      return {
        immediate: this.findQuickWins(context),
        shortTerm: this.identify1WeekGoals(context),
        longTerm: this.projectRoadmap(context),
        warnings: this.identifyRisks(context)
      };
    }
  },
  
  output: {
    location: "docs/context/9400-9499-research/",
    format: {
      synthesis: "9401-research-synthesis.md",
      conflicts: "9410-resolved-conflicts.md",
      recommendations: "9420-recommendations.md"
    }
  }
}
```

## Workflow Examples

### Example 1: Simple Question (No Code Changes)

```
User: "Why is Vosk accuracy low?"

═══════════════════════════════════════
✅ Intent-Router Check: COMPLETE
📍 Context Loaded: LED 5000-5099
🎯 Route Decision: ANSWER_ONLY
🔒 Code Changes: BLOCKED
═══════════════════════════════════════

Based on LED 5023, we're using Python subprocess for Vosk because:
1. Node.js ffi-napi has critical failures on Windows
2. SetWords/SetPartialWords improved accuracy by 40%
3. Model vosk-model-en-us-0.22 is optimized for real-time

[NO CODE MODIFIED - Question answered from context]
```

### Example 2: Bug Fix (Research Before Fix)

```
User: "WebSocket keeps disconnecting"

═══════════════════════════════════════
✅ Intent-Router Check: COMPLETE
📍 Context Loaded: LED 6000-6099
🎯 Route Decision: DIAGNOSE_FIRST
🔒 Code Changes: BLOCKED (pending diagnosis)
═══════════════════════════════════════

Routing to specialists:
→ cs-websocket-specialist: Researching issue
→ cs-inversion-agent: Analyzing failure modes

[Research Phase]
Found in LED 6015: Previous reconnection using exponential backoff
Checking current implementation... 

[Diagnosis Complete]
Root cause: CSP policy blocking WebSocket after 30 seconds
Proposed fix: Implement heartbeat ping every 20 seconds

Would you like me to implement this fix? [Y/N]
```

### Example 3: New Feature (PRD → Tasks → Implementation)

```
User: "Add document upload feature for RAG processing"

═══════════════════════════════════════
✅ Intent-Router Check: COMPLETE
📍 Context Loaded: LED 3000-3999
🎯 Route Decision: PLAN_FIRST
🔒 Code Changes: BLOCKED (planning required)
═══════════════════════════════════════

Routing to task management:
→ cs-task-decomposer: Breaking down feature
→ cs-project-orchestrator: Planning implementation

[Task Breakdown]
1. Create upload UI component (300 lines max)
2. Implement file validation service (250 lines max)  
3. Add document processing pipeline (300 lines max)
4. Create storage service (200 lines max)
5. Add progress indicators (150 lines max)

[Modular Structure Generated]
src/components/upload/
├── DocumentUpload.tsx (200 lines)
├── ProgressIndicator.tsx (150 lines)
└── FileValidator.tsx (100 lines)

src/services/
├── document-processor.ts (250 lines)
└── storage-service.ts (200 lines)

Shall I proceed with implementation? [Y/N]
```

## Implementation Roadmap

### Phase 1: Intent Router Core (Week 1) - CRITICAL
- [ ] Implement cs-intent-router agent
- [ ] Create interception mechanism
- [ ] Build context loading system
- [ ] Design routing logic
- [ ] Add protection mechanisms

### Phase 2: Task Management (Week 2)
- [ ] Build cs-task-decomposer
- [ ] Create cs-project-orchestrator
- [ ] Implement cs-research-coordinator
- [ ] Design task persistence

### Phase 3: Integration (Week 3)
- [ ] Connect router to all specialists
- [ ] Integrate task management with router
- [ ] Link to modularization enforcement
- [ ] Update workflow phases

### Phase 4: Enforcement (Week 4)
- [ ] Update .claude/claude_project.md
- [ ] Create enforcement documentation
- [ ] Build pre-flight checks
- [ ] Add validation systems

### Phase 5: Testing & Refinement (Week 5)
- [ ] Test router with various inputs
- [ ] Validate protection mechanisms
- [ ] Optimize routing decisions
- [ ] Document best practices

## Success Metrics

### Protection Metrics
- **Code Destruction Prevention**: 100% blocked without context
- **Context Loading**: 100% of decisions load previous context
- **Routing Accuracy**: 95% correct specialist selection
- **False Positives**: <5% unnecessary blocks

### Development Metrics
- **Task Completion**: 90% on-time delivery
- **Blocker Resolution**: <4 hours average
- **Specialist Utilization**: 70% optimal
- **Code Quality**: 100% modular compliance

## Migration Path

### From Current State to Protected State

1. **Day 1**: Deploy intent router
   - All new interactions protected
   - Code destruction stops immediately

2. **Week 1**: Add task management
   - PRDs automatically parsed
   - Tasks systematically tracked

3. **Week 2**: Full integration
   - All specialists connected
   - Complete workflow protection

4. **Week 3**: Optimization
   - Routing refined based on usage
   - Protection rules adjusted

## The Bottom Line

**Version 8.0 Philosophy**: 
- **Claude can NEVER destroy code without context**
- **Every interaction goes through protective router**
- **Complete development lifecycle management**
- **Natural conversation, intelligent routing**
- **Set once, protected forever**

**Developer Experience**:
1. Talk to Claude naturally
2. Router intercepts and protects
3. Context always loaded first
4. Appropriate specialists engaged
5. Code only changes when it should

**No more destroyed code. No more lost context. No more chaos.**

---

**Document Version**: 8.0  
**Last Updated**: 2025-09-04  
**Major Changes from v7.0**:
- Added Universal Intent Router as mandatory entry point
- Introduced complete task management subsystem
- Created protection mechanisms against code destruction
- Added enforcement through project configuration
- Integrated PRD parsing and task decomposition
- Added multi-source research coordination
- Created workflow examples for all interaction types
- Defined clear migration path from chaos to order

**Next Review**: 2025-10-04