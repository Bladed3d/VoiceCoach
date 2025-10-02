# MyUI Usage Examples

Real-world examples of how to use MyUI for different coding scenarios.

## 🎯 Example Prompts & Workflows

### 1. Code Review & Optimization

**Prompt:**
```
Review this React component for performance issues and suggest optimizations:

[Include your component code here]

Please analyze:
1. Re-rendering issues
2. Memory leaks
3. Bundle size impact
4. Accessibility concerns
5. Best practices violations

Provide specific code examples for improvements.
```

**Recommended Models:** Claude 3.5 Sonnet, GPT-4o, DeepSeek Chat
**Expected Results:** Multiple perspectives on optimization strategies

---

### 2. Architecture Design

**Prompt:**
```
Design a scalable microservices architecture for a VoiceCoach application that handles:

- Real-time audio transcription via WebSocket
- AI coaching suggestions with RAG processing
- User session management
- File upload and processing
- Desktop Electron app as client

Consider:
- Scalability to 10k concurrent users
- High availability requirements
- Security best practices
- Cost optimization
- Technology stack recommendations

Provide architectural diagrams and implementation details.
```

**Recommended Models:** Claude 3.5 Sonnet, GPT-4o, Gemini Pro
**Synthesis Model:** Claude 3.5 Sonnet
**Expected Results:** Comprehensive architectural analysis with trade-offs

---

### 3. Bug Investigation

**Prompt:**
```
I have a bug where my Electron app randomly crashes with this error:

[Error message here]

The crash happens in this component:
[Component code here]

Help me:
1. Identify the root cause
2. Explain why it's intermittent
3. Provide a fix with error handling
4. Suggest testing strategies to prevent similar issues
5. Add appropriate logging/debugging

Context: This is a desktop app using Electron + React + TypeScript
```

**Recommended Models:** Claude 3.5 Sonnet, GPT-4o-mini, DeepSeek Chat, Grok
**Expected Results:** Multiple debugging approaches and solutions

---

### 4. API Integration Planning

**Prompt:**
```
Plan integration with these AI APIs for a multi-AI interface:

APIs to integrate:
- OpenAI GPT-4o
- Anthropic Claude
- Google Gemini
- DeepSeek
- xAI Grok

Requirements:
- Parallel requests to 4-6 models simultaneously
- Error handling and fallbacks
- Rate limiting and cost management
- Response comparison and synthesis
- Secure API key storage

Provide:
1. Service architecture design
2. TypeScript interfaces
3. Error handling strategies
4. Cost optimization techniques
5. Security considerations
```

**Recommended Models:** Claude 3.5 Sonnet, GPT-4o, Mistral Large
**Expected Results:** Implementation plan with code examples

---

### 5. Performance Optimization

**Prompt:**
```
My Electron app is slow to start and has high memory usage:

Current stats:
- Startup time: 8-12 seconds
- Memory usage: 400MB idle
- Bundle size: 45MB
- Using: React 18, TypeScript, Electron 32

Analyze these areas:
1. Bundle analysis and code splitting opportunities
2. Electron process optimization
3. React component optimization
4. Memory leak detection
5. Startup sequence optimization

Provide specific optimization techniques with code examples.
```

**Recommended Models:** GPT-4o, Claude 3.5 Sonnet, DeepSeek Chat
**Expected Results:** Actionable performance improvements

---

### 6. Security Audit

**Prompt:**
```
Perform a security audit on this Electron application:

Key concerns:
- Stores user API keys
- Handles file system access
- Makes external API calls
- Uses IPC between main/renderer processes

Code to review:
[Include relevant code sections]

Check for:
1. API key storage security
2. IPC vulnerability prevention
3. File system access restrictions
4. Network request security
5. Input validation and sanitization
6. Electron security best practices

Provide specific remediation steps.
```

**Recommended Models:** Claude 3.5 Sonnet, GPT-4o, Mistral Large
**Synthesis Model:** Claude 3.5 Sonnet
**Expected Results:** Comprehensive security assessment

---

## 🔧 Advanced Configuration Examples

### Cost-Optimized Setup (Cheap Models First)

```typescript
// Example configuration for budget-conscious development
const costOptimizedConfig = {
  selectedModels: [
    'deepseek-chat',        // $0.14/M tokens - primary
    'gpt-4o-mini',          // $0.15/M tokens - backup
    'claude-3.5-sonnet',    // $3.00/M tokens - synthesis only
  ],
  panelCount: 3,
  autoSynthesize: false,  // Manual synthesis for cost control
  contextRetention: true
};
```

### Quality-First Setup (Premium Models)

```typescript
// Example configuration for high-quality analysis
const qualityFirstConfig = {
  selectedModels: [
    'claude-3.5-sonnet',
    'gpt-4o',
    'gemini-pro',
    'mistral-large'
  ],
  panelCount: 4,
  autoSynthesize: true,   // Auto-synthesis with premium model
  contextRetention: true
};
```

### Exploration Setup (Maximum Diversity)

```typescript
// Example configuration for exploring different perspectives
const diversityConfig = {
  selectedModels: [
    'deepseek-chat',
    'claude-3.5-sonnet', 
    'gpt-4o-mini',
    'grok-beta',
    'gemini-pro',
    'mistral-large'
  ],
  panelCount: 6,
  autoSynthesize: true,
  contextRetention: true
};
```

---

## 🎨 Prompt Engineering Tips

### 1. Structure Your Prompts

```
**Context:** Brief description of the situation
**Problem:** Specific issue you're facing  
**Requirements:** What you need the solution to accomplish
**Constraints:** Technical limitations or preferences
**Output Format:** How you want the response structured
```

### 2. Include Relevant Context

```
**Project Context:**
- Framework: React 18 + TypeScript + Electron 32
- Architecture: Desktop app with main/renderer processes
- User Base: Individual developers and small teams
- Performance Requirements: <2s startup, <200MB memory

**Current Implementation:**
[Include relevant code snippets]

**Question:** [Your specific question here]
```

### 3. Ask for Comparisons

```
Compare these three approaches for [problem]:

Approach A: [Description]
Approach B: [Description]  
Approach C: [Description]

For each approach, analyze:
1. Implementation complexity
2. Performance implications
3. Maintenance overhead
4. Scalability considerations
5. Security implications

Recommend the best approach with reasoning.
```

---

## 📊 Interpreting Results

### Reading Multi-Model Responses

1. **Look for Consensus:** What do most models agree on?
2. **Identify Unique Insights:** What does only one model suggest?
3. **Compare Implementation Details:** Which approach is most practical?
4. **Consider Trade-offs:** Balance different priorities (speed vs quality)
5. **Use Synthesis:** Let the synthesis model weigh all perspectives

### Making Decisions

1. **Start with Synthesis:** Read the comprehensive analysis first
2. **Drill into Details:** Check specific models for implementation details
3. **Verify with Cheap Models:** Use DeepSeek for quick validation
4. **Get Premium Confirmation:** Use Claude/GPT for final verification

---

## 🚀 Productivity Workflows

### Daily Development Routine

1. **Morning Architecture Review:** Ask broad questions about your work plan
2. **Implementation Guidance:** Get step-by-step implementation help
3. **Code Review:** Review your work before committing
4. **Problem Solving:** Debug issues as they arise
5. **Learning:** Explore new techniques and best practices

### Team Workflows

1. **Design Reviews:** Get multiple perspectives on architectural decisions
2. **Code Standards:** Establish consistent patterns across the team
3. **Onboarding:** Help new team members understand the codebase
4. **Documentation:** Generate comprehensive technical documentation

---

These examples show how MyUI can transform your development workflow by giving you access to multiple AI perspectives simultaneously. The key is to experiment with different prompt styles and model combinations to find what works best for your specific use cases.