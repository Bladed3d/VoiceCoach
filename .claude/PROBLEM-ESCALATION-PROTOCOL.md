# 🚨 **PROBLEM ESCALATION PROTOCOL**

## **PURPOSE**
Simple one-command escalation system where user reports problems to PM2, which then autonomously orchestrates appropriate agents to diagnose and resolve issues.

---

## **USER ESCALATION COMMAND**

### **Single Command Format:**
```
Task Agent: project-manager2
Prompt: "PROBLEM ESCALATION: [Brief description of what user is experiencing]

OBSERVED ISSUE: [What you're seeing - broken page, errors, missing features, etc.]
EXPECTED BEHAVIOR: [What should be happening instead]
CONTEXT: [Any relevant details - which page, what you were doing, etc.]

ESCALATION AUTHORITY GRANTED: Deploy any agents needed to resolve this completely."
```

### **Example Usage:**
```
Task Agent: project-manager2  
Prompt: "PROBLEM ESCALATION: Daily Actions 5 page shows loading screen instead of complete interface

OBSERVED ISSUE: Page stuck on 'Initializing mobile drag & drop system...' loading screen
EXPECTED BEHAVIOR: Should show Activity Inventory Grid, Timeline, Current Activity Panel, etc.
CONTEXT: http://localhost:3001/daily-actions5 - should match daily-actions4 functionality

ESCALATION AUTHORITY GRANTED: Deploy any agents needed to resolve this completely."
```

---

## **PM2 ESCALATION WORKFLOW**

### **Phase 1: IMMEDIATE DIAGNOSTIC (Deploy Debugging Agent)**
```yaml
DIAGNOSTIC DEPLOYMENT:
Agent: debugging-agent
Mission: "EMERGENCY DIAGNOSTIC of [reported problem]
- Analyze exact issue described by user
- Generate comprehensive diagnostic report
- Identify root cause and affected components
- Determine required corrective actions
- DELIVER: Complete diagnostic with recommended agent deployment strategy"

Authority: Full autonomous debugging with immediate fixes if possible
Timeframe: 15 minutes maximum
```

### **Phase 2: ANALYZE DIAGNOSTIC REPORT**
```yaml
PM2 ANALYSIS PROTOCOL:
1. Review debugging agent diagnostic report
2. Determine problem category:
   - CODE IMPLEMENTATION: Deploy Lead Programmer
   - RESEARCH NEEDED: Deploy Researcher with Context7
   - INTEGRATION ISSUES: Deploy multiple coordinated agents
   - ARCHITECTURAL PROBLEMS: Deploy UI Designer + Lead Programmer
   - UNKNOWN/COMPLEX: Deploy general-purpose agent
3. Select appropriate resolution strategy
4. Deploy selected agents with specific mission parameters
```

### **Phase 3: AGENT DEPLOYMENT MATRIX**

#### **Code Implementation Problems:**
```yaml
Deploy: Lead Programmer
Mission: "AUTONOMOUS CODE FIX based on debugging report
Problem: [from diagnostic]
Required Fix: [specific changes needed]
Success Criteria: [user sees working interface]
Authority: Full code editing/creation without approval"
```

#### **Research Required Problems:**
```yaml
Deploy: Researcher
Mission: "RESEARCH SOLUTION for [problem type]
Context7 Research: [specific technology/library]
Web Research: [implementation patterns, best practices]
Deliverable: Complete solution specification for Lead Programmer
Next Action: Auto-deploy Lead Programmer with research findings"
```

#### **Complex Integration Problems:**
```yaml
Deploy: UI Designer + Lead Programmer (Parallel)
UI Designer Mission: "DESIGN COMPLETE INTERFACE SPECIFICATION
Problem: [user interface incomplete]
Reference: daily-actions4 for feature parity
Deliverable: Complete component architecture"

Lead Programmer Mission: "IMPLEMENT UI DESIGNER SPECIFICATIONS
Input: UI Designer output
Authority: Full implementation without approval
Target: Complete working interface"
```

#### **Unknown/Multi-Factor Problems:**
```yaml
Deploy: general-purpose
Mission: "COMPREHENSIVE PROBLEM RESOLUTION
Issue: [complex/unknown problem]
Authority: Research + implement + test + iterate
Resources: Context7, Web Research, Code Implementation
Success: User sees complete working solution"
```

### **Phase 4: COMPLETION VALIDATION**
```yaml
FINAL VALIDATION PROTOCOL:
1. Re-deploy debugging-agent for final validation
2. Confirm user-reported issue completely resolved
3. Generate completion report with:
   - Problem summary
   - Resolution approach taken
   - Agents deployed and outcomes
   - Prevention measures implemented
4. Update success patterns and mistake logs
```

---

## **PM2 DECISION TREE**

### **Diagnostic Report Analysis:**
```
IF diagnostic shows: "Missing components/incomplete interface"
  → DEPLOY: Lead Programmer (implementation fix)

IF diagnostic shows: "Unknown technology/library issues" 
  → DEPLOY: Researcher → Lead Programmer (research then implement)

IF diagnostic shows: "UI/UX design problems"
  → DEPLOY: UI Designer → Lead Programmer (design then implement)

IF diagnostic shows: "Complex multi-system integration"
  → DEPLOY: Multiple agents in parallel/sequence

IF diagnostic shows: "Unclear/multiple root causes"
  → DEPLOY: general-purpose agent (comprehensive resolution)
```

### **Example Decision Logic:**
```
User Report: "Page shows loading screen instead of interface"
↓
Debugging Agent Diagnostic: "Page stuck in loading state, missing component integration"
↓
PM2 Analysis: "Code implementation problem - components exist but not integrated"
↓
Deploy: Lead Programmer with mission "Integrate all components into working interface"
↓
Final Validation: Debugging agent confirms complete interface working
```

---

## **SUCCESS CRITERIA FOR ESCALATION**

### **Escalation Complete When:**
- ✅ User-reported issue completely resolved
- ✅ Expected behavior fully restored
- ✅ No regression in other functionality
- ✅ Prevention measures documented
- ✅ User can continue with their intended work

### **Escalation Failed If:**
- ❌ Issue persists after all agent deployments
- ❌ New problems introduced during resolution
- ❌ User still cannot complete their intended task
- ❌ Solution temporary/unstable

---

## **IMPLEMENTATION INSTRUCTIONS FOR PM2**

### **When User Uses Escalation Command:**

1. **IMMEDIATE**: Deploy debugging-agent for diagnostic
2. **ANALYZE**: Review diagnostic report thoroughly  
3. **DECIDE**: Select appropriate agent deployment strategy
4. **DEPLOY**: Launch selected agents with specific missions
5. **VALIDATE**: Confirm complete resolution via final debugging check
6. **REPORT**: Provide user with resolution summary

### **PM2 Response Template:**
```
ESCALATION RECEIVED: [problem summary]
PHASE 1: Deploying debugging-agent for immediate diagnostic...
PHASE 2: [Based on diagnostic] Deploying [selected agents]...
PHASE 3: [Agents working] - [progress updates]...
PHASE 4: Final validation in progress...
RESOLUTION COMPLETE: [summary of fix applied]
STATUS: User can now [resume intended work]
```

---

## **INTEGRATION WITH EXISTING AGENTS**

### **All Agents Must Support:**
- **Mission-based deployment** (specific problem-solving objectives)
- **Autonomous authority** (no approval requests during escalation)
- **Diagnostic handoff** (accept debugging report as input)
- **Completion reporting** (clear success/failure status)

### **Required Agent Updates:**
- Update all agent instructions to recognize "ESCALATION" mode
- Add "Problem Resolution Mode" with enhanced autonomy
- Ensure agents can work from debugging reports
- Add handoff protocols between agents

---

**MOTTO**: "User reports problem → PM2 orchestrates solution → User gets working system. No intermediate steps, no approval requests, no partial fixes."