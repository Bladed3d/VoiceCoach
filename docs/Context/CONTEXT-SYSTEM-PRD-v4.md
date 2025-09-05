# Context System PRD - LED-Enhanced Persistent Intelligence
**Version 4.0 | Date: 2025-09-04**  
**Author: System Architecture Team**  
**Status: Enhanced with Agent Creation Protocol**

## Executive Summary

The Context System solves Claude's fundamental limitation: catastrophic context loss during `/compact` operations and between sessions. Version 4.0 introduces the **Agent Creation Protocol** - a systematic process for building deeply knowledgeable specialist agents through research, compilation, and KV-cache optimization.

Key addition: Specialist agents aren't just named - they're built through a 5-phase knowledge gathering and distillation process that transforms 50,000 tokens of research into 5,000 tokens of focused expertise.

## Problem Statement

### Current Pain Points

1. **Context Amnesia**
   - New Claude sessions start with zero project knowledge
   - `/compact` operations destroy 90% of conversation context
   - Same mistakes repeated across sessions

2. **Manual Debugging Burden**
   - Developer spends hours debugging issues Claude created
   - No automatic validation of implementations
   - Problems discovered through manual testing

3. **Shallow Agent Knowledge** (NEW)
   - Agents lack deep domain expertise
   - No systematic knowledge loading process
   - Generic responses instead of specialized insights
   - Platform-specific knowledge missing

4. **Token Exhaustion**
   - Finding code locations requires extensive searching (5,000-10,000 tokens)
   - Generic agents read files repeatedly
   - No knowledge persistence between sessions

5. **Hidden Failures**
   - Fallback/simulated data masks real problems
   - Silent failures make debugging impossible

### Impact Analysis

- **Debugging Time**: 60% of development time on manual debugging
- **Token Usage**: 10x higher due to shallow knowledge
- **Specialist Effectiveness**: Generic agents provide generic solutions
- **Knowledge Loss**: Research redone every session

## Solution Overview

### Core Innovation

**Agent Creation Protocol**: Systematic process for building specialist agents with deep, persistent knowledge.

**Knowledge Pipeline**: Research → Compilation → Optimization → Validation → Deployment

### Key Principles

1. **Deep Knowledge Through Research**: Each agent built from comprehensive research
2. **Knowledge Distillation**: 50K tokens compressed to 5K focused instructions
3. **KV-Cache Optimization**: Structured for 10x cost reduction
4. **Automated Testing**: Every implementation validated automatically
5. **FAIL-LOUD Policy**: No fake data or silent failures

## Agent Creation Protocol

### Overview
Creating a specialist agent is a systematic process that transforms vast research into focused expertise.

### Phase 1: Knowledge Gathering

#### 1.1 Research Deployment
```yaml
target_agent: [Specialist Name]
research_tasks:
  primary_sources:
    - Official documentation via Context7
    - API references and guides
    - Best practices documentation
  
  code_sources:
    - GitHub implementations
    - Working examples
    - Production patterns
  
  problem_sources:
    - Known issues databases
    - Platform-specific quirks
    - Common error patterns
  
  optimization_sources:
    - Performance guides
    - Benchmark results
    - Optimization techniques
```

#### 1.2 Local Knowledge Mining
```typescript
interface LocalKnowledgeExtraction {
  project_specific: [
    "Existing working implementations",
    "User's proven patterns",
    "Failed approaches to avoid",
    "Project-specific requirements"
  ],
  
  sources: [
    "docs/[domain]/*",
    "Previous LED decisions",
    "Test results",
    "Error logs"
  ]
}
```

#### 1.3 Context7 Integration
```bash
# Systematic documentation retrieval
@context7 resolve-library-id "[package]"
@context7 get-library-docs "/[provider]/[package]" {
  topics: [specific, relevant, topics],
  tokens: 10000,
  focus: "production patterns"
}
```

### Phase 2: Knowledge Compilation

#### 2.1 Knowledge Base Structure
```
docs/agents/[specialist-name]/
├── core-knowledge.md          # Essential concepts (2000 tokens)
├── decision-trees.md          # When to use what (1000 tokens)
├── platform-specific.md       # OS-specific requirements
├── optimization-patterns.md   # Performance improvements
├── error-solutions.md         # Issue → Solution mapping
├── example-code/              # Working implementations
│   ├── basic-setup.ts
│   ├── advanced-patterns.ts
│   └── edge-cases.ts
├── forbidden.md               # Anti-patterns to avoid
└── test-scenarios.md          # Validation cases
```

#### 2.2 Knowledge Distillation Process
```typescript
class KnowledgeDistiller {
  distill(rawKnowledge: ResearchData): AgentKnowledge {
    return {
      // Core competencies (30% of instruction space)
      coreKnowledge: extractEssentials(rawKnowledge),
      
      // Decision logic (25% of instruction space)
      decisionFramework: buildDecisionTrees(rawKnowledge),
      
      // Problem solutions (25% of instruction space)
      problemPatterns: mapProblemsToSolutions(rawKnowledge),
      
      // Platform specific (10% of instruction space)
      platformNotes: extractPlatformSpecifics(rawKnowledge),
      
      // References (10% of instruction space)
      quickReference: createCheatSheet(rawKnowledge)
    };
  }
  
  compressionRatio: "10:1", // 50K research → 5K instructions
  preservePriority: ["critical_patterns", "common_errors", "proven_solutions"]
}
```

### Phase 3: Instruction Generation

#### 3.1 Agent System Prompt Template
```markdown
# [AGENT_NAME] Specialist Agent

## Identity & Expertise
You are a deep specialist in [DOMAIN] with comprehensive knowledge of:
[CORE_COMPETENCIES - 2000 tokens max]

## Decision Framework
When analyzing [DOMAIN] issues:

### Pattern Recognition Priority
1. Check for these patterns first:
   [COMMON_PATTERNS - ordered by frequency]

2. Platform-specific checks:
   - Windows: [WINDOWS_SPECIFIC]
   - macOS: [MAC_SPECIFIC]
   - Linux: [LINUX_SPECIFIC]

3. Optimization opportunities:
   [PERFORMANCE_PATTERNS]

## Proven Solutions Database
[PROBLEM → SOLUTION mappings - 1500 tokens]

## Anti-Patterns & Forbidden Approaches
NEVER suggest:
[FORBIDDEN_LIST with explanations]

## Knowledge Resources
- Primary KB: docs/agents/[name]/
- Context7 access: [PACKAGE_LIST]
- Tools: [SPECIFIC_TOOLS]
- LED Range: [START-END]

## Output Protocol
1. Research only - no implementation
2. Write findings to: docs/context/[LED_RANGE]/
3. Return summary: 200 tokens maximum
4. Include confidence: High/Medium/Low
5. Cite sources: Always reference documentation

## Example Responses
[3-5 example Q&A patterns showing ideal responses]
```

#### 3.2 KV-Cache Optimization Structure
```yaml
instruction_structure:
  stable_prefix: # Cached section - never changes
    - Agent identity (500 tokens)
    - Core knowledge (2000 tokens)
    - Decision trees (1000 tokens)
    - Universal rules (500 tokens)
    total: 4000 tokens
    cache_cost: $0.30/MTok
  
  variable_suffix: # Non-cached - task specific
    - Current context (500 tokens)
    - User query (200 tokens)
    - Recent findings (300 tokens)
    total: 1000 tokens
    cache_cost: $3.00/MTok
  
  savings: "80% cost reduction through stable prefix"
```

### Phase 4: Agent Validation

#### 4.1 Knowledge Test Suite
```typescript
interface AgentValidation {
  testScenarios: [
    {
      category: "Core Knowledge",
      question: "How to optimize [specific feature]?",
      mustInclude: ["technique1", "technique2", "measurement"],
      mustAvoid: ["antipattern1", "deprecated_method"]
    },
    {
      category: "Platform Specific",
      question: "Best approach on Windows?",
      expectedResponse: "Specific Windows solution with reasoning"
    },
    {
      category: "Error Handling",
      question: "How to debug [common error]?",
      mustReference: ["error_cause", "solution_steps", "prevention"]
    }
  ],
  
  passingCriteria: {
    knowledgeAccuracy: ">90%",
    responseSpecificity: "High",
    sourceCitation: "Always",
    tokenEfficiency: "<200 per response"
  }
}
```

#### 4.2 Validation Checklist
```markdown
## Pre-Deployment Validation

### Knowledge Coverage
□ Core concepts understood
□ Platform differences recognized
□ Common errors addressed
□ Optimization patterns included
□ Anti-patterns documented

### Response Quality
□ Specific not generic
□ Sources cited
□ Confidence levels included
□ Token limit respected
□ Actionable insights provided

### Integration Testing
□ LED range assigned
□ Trigger keywords working
□ Knowledge base accessible
□ Tools properly configured
□ Output directory writable
```

### Phase 5: Agent Deployment

#### 5.1 Agent Registry Configuration
```json
{
  "agent-registry": {
    "vosk-specialist": {
      "version": "1.0",
      "led_range": [5000, 5099],
      "created": "2025-09-04",
      "knowledge_base": {
        "path": "docs/agents/vosk-specialist/",
        "size": "5000 tokens",
        "last_updated": "2025-09-04"
      },
      "triggers": {
        "keywords": ["vosk", "transcription", "speech", "accuracy"],
        "error_patterns": ["AudioContext", "model", "recognition"],
        "led_activation": [5000, 5099]
      },
      "tools": [
        "context7:vosk",
        "performance-profiler",
        "audio-analyzer"
      ],
      "cache_config": {
        "stable_prefix": 4000,
        "ttl": 86400,
        "priority": "high"
      },
      "validation": {
        "test_coverage": "95%",
        "accuracy_score": "92%",
        "last_validated": "2025-09-04"
      }
    }
  }
}
```

#### 5.2 Activation Protocol
```typescript
class AgentActivation {
  async deploy(agent: SpecialistAgent): Promise<void> {
    // 1. Load knowledge base
    await loadKnowledgeBase(agent.knowledge_path);
    
    // 2. Configure KV-cache
    await optimizeCache(agent.cache_config);
    
    // 3. Register triggers
    await registerKeywords(agent.triggers);
    
    // 4. Validate activation
    await runSmokeTests(agent.test_suite);
    
    // 5. Enable in production
    await enableAgent(agent.id);
    
    console.log(`✅ ${agent.name} deployed successfully`);
  }
}
```

## Example: Complete Vosk Specialist Creation

### Step 1: Research Gathering (8 hours)
```bash
# Research command
@research create-vosk-specialist {
  sources: [
    "vosk-api.org documentation",
    "GitHub: alphacep/vosk-api",
    "Context7: /pypi/vosk",
    "Local: D:/Projects/Ai/VoiceCoach/docs/vosk/*",
    "Stack Overflow: vosk accuracy issues"
  ],
  focus: [
    "Real-time transcription",
    "Accuracy optimization",
    "Windows compatibility",
    "Model selection"
  ]
}

# Output: 50,000 tokens of research material
```

### Step 2: Knowledge Compilation (2 hours)
```markdown
# Distilled Core Knowledge (5,000 tokens)

## Proven Patterns
1. Python implementation on Windows (NOT Node.js - ffi-napi issues)
2. SetWords/SetPartialWords for 40% accuracy improvement
3. Model selection: vosk-model-en-us-0.22 for accuracy vs speed
4. Chunk size 4000 for optimal real-time performance
5. 16kHz sampling rate required

## Critical Platform Notes
- Windows: Python subprocess required
- Memory: ~2GB for large models
- CPU: Benefits from AVX2 instructions

## Common Issues → Solutions
- "Model not found" → Check model path uses forward slashes
- "Accuracy poor" → Implement SetWords with domain vocabulary
- "Latency high" → Reduce chunk size, use smaller model
```

### Step 3: Instruction Generation
```markdown
# Generated Agent Instructions (see template above)
- Identity established
- Knowledge embedded
- Decision trees created
- Output protocol defined
```

### Step 4: Validation
```typescript
// Test execution
const results = await validateAgent('vosk-specialist', [
  { test: "Windows compatibility", result: "PASS ✓" },
  { test: "Accuracy optimization", result: "PASS ✓" },
  { test: "Error solutions", result: "PASS ✓" },
  { test: "Token efficiency", result: "PASS ✓ (avg 180)" }
]);
// All tests passed
```

### Step 5: Deployment
```bash
@deploy vosk-specialist
✅ Knowledge base loaded: 5000 tokens
✅ KV-cache optimized: 80% cost reduction
✅ Triggers registered: 4 keywords
✅ Validation passed: 95% coverage
✅ Agent active: LED 5000-5099
```

## Agent Creation Metrics

### Time Investment
- Research Phase: 4-8 hours
- Compilation Phase: 1-2 hours
- Instruction Generation: 1 hour
- Validation: 1 hour
- **Total: 7-12 hours per specialist**

### Return on Investment
- Token Reduction: 90% for domain-specific queries
- Error Prevention: 95% accuracy on known patterns
- Speed Improvement: 10x faster than generic search
- Knowledge Retention: Permanent across sessions

## Integration with Existing Systems

### 6-Phase Development Workflow (Updated)

1. **INTENT CAPTURE** → Identifies needed specialists
2. **BRAINSTORM** → Explores approaches
3. **SPECIALIST RESEARCH** → Deep domain knowledge applied
4. **RISK ANALYSIS** → Inversion thinking
5. **IMPLEMENTATION** → Execution with context
6. **AUTOMATED TESTING** → Validation and fixes

### Specialist Selection Logic
```typescript
function selectSpecialists(request: string): Agent[] {
  const specialists = [];
  
  // Match keywords to specialists
  for (const [agent, config] of agentRegistry) {
    if (matchesKeywords(request, config.triggers.keywords)) {
      specialists.push(loadAgent(agent));
    }
  }
  
  // Usually 2-4 specialists per request
  return specialists;
}
```

## Success Metrics

### Agent Quality Metrics
- **Knowledge Coverage**: >90% of domain patterns documented
- **Response Specificity**: Platform-specific answers always
- **Token Efficiency**: <200 tokens per specialist response
- **Cache Hit Rate**: >80% through KV optimization

### System Impact Metrics
- **Manual Debugging**: 80% reduction
- **Token Usage**: 90% reduction for specialist domains
- **Error Resolution**: 70% fixes on first attempt
- **Session Continuity**: 100% knowledge retained

## FAIL-LOUD Policy Integration

All agents inherit universal rules:
```typescript
// Embedded in every specialist instruction
const UNIVERSAL_RULES = `
CRITICAL: FAIL-LOUD Policy
- NEVER create fallback/mock data
- ALWAYS throw errors visibly
- ALWAYS log with LED breadcrumbs
- NEVER hide failures
`;
```

## Implementation Roadmap

### Phase 1: Protocol Development (Week 1)
- [ ] Create agent creation templates
- [ ] Build knowledge distillation tools
- [ ] Set up validation framework
- [ ] Design KV-cache optimization

### Phase 2: Core Specialists (Weeks 2-3)
- [ ] Create Vosk Specialist (12 hours)
- [ ] Create WebSocket Specialist (10 hours)
- [ ] Create ChromaDB Specialist (8 hours)
- [ ] Create React Specialist (10 hours)
- [ ] Create Electron Specialist (8 hours)

### Phase 3: Quality Agents (Week 4)
- [ ] Create Playwright Testing Agent
- [ ] Create Error Visibility Agent
- [ ] Create Code Discovery Agent

### Phase 4: Process Agents (Week 5)
- [ ] Create Brainstorm Agent
- [ ] Create Inversion Agent
- [ ] Create Project Manager

### Phase 5: Integration & Testing (Week 6)
- [ ] Deploy all specialists
- [ ] Validate knowledge coverage
- [ ] Optimize cache performance
- [ ] Measure token reduction

## Critical Files for Agent Creation

### Required Documentation
```
docs/Context/
├── AGENT-CREATION-PROTOCOL.md    # This process
├── AGENT-TEMPLATE.md              # Instruction template
├── KNOWLEDGE-DISTILLATION.md     # Compression guide
├── VALIDATION-SUITE.md           # Test scenarios
└── agents/                        # Agent knowledge bases
    ├── vosk-specialist/
    ├── websocket-specialist/
    └── [other-specialists]/
```

## The Bottom Line

**Version 4.0 Philosophy**: 
- **Specialists aren't just named, they're BUILT**
- **Deep knowledge through systematic research**
- **50K tokens → 5K focused expertise**
- **KV-cache optimization for 10x cost savings**
- **Permanent knowledge across all sessions**

**Developer Experience**:
1. Request triggers specialist (not generic agent)
2. Specialist has deep, researched knowledge
3. Provides specific, actionable insights
4. Knowledge persists forever
5. Costs 90% less in tokens

**No more generic responses from shallow agents.**

---

**Document Version**: 4.0  
**Last Updated**: 2025-09-04  
**Major Changes from v3.0**:
- Added complete Agent Creation Protocol (5 phases)
- Introduced knowledge distillation process (10:1 compression)
- Added KV-cache optimization structure
- Created validation framework for agents
- Defined agent registry system
- Included example Vosk Specialist creation
- Added knowledge base file structure
- Specified time investment and ROI metrics

**Next Review**: 2025-10-04