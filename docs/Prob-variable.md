# Problem Variable Extraction & Usage
## Capturing Customer Problems for Contextual Coaching

### Overview
The system needs to extract, store, and reference specific customer problems mentioned during calls to provide personalized coaching that addresses their exact pain points.

## Current Gap
**Missing Variables:**
- `{PROBLEM}` - Primary customer pain point
- `{CUSTOMER_NAME}` - Prospect's name for personalization
- `{PROBLEMS_LIST}` - Multiple issues mentioned
- `{BIGGEST_CONCERN}` - Most critical problem identified

**Why Critical:**
- Closing requires referencing specific problems discovered
- Personalized responses increase conversion rates
- Helps track conversation context across stages
- Enables targeted objection handling

## Implementation Plan

### Phase 1: Problem Detection & Extraction

#### 1. Conversation Analysis Enhancement
**File**: `src/services/coaching/analyzers/ConversationAnalyzer.ts`

Add problem extraction to existing analyzer:
```typescript
interface ExtractedProblems {
  primary: string;
  secondary: string[];
  emotional_impact: string;
  business_impact: string;
  timeline_pressure: string;
}

analyzeProblemStatements(transcript: string): ExtractedProblems {
  // Look for problem indicators:
  // - "The biggest challenge is..."
  // - "We're struggling with..."  
  // - "It's frustrating that..."
  // - "The issue is..."
  
  // Extract emotional language:
  // - "frustrated", "difficult", "impossible"
  // - "losing money", "wasting time"
  
  // Identify urgency signals:
  // - "need it by", "deadline", "ASAP"
}
```

#### 2. Real-Time Problem Tracking
**File**: `src/services/coaching/SessionManagerService.ts`

Add problem context tracking:
```typescript
private customerProblems: {
  primary: string;
  discovered: string[];
  acknowledged: boolean;
  stage_mentioned: string;
  timestamp: number;
}[] = [];

private customerName: string = '';
private companyName: string = '';

// Update when problems are mentioned
private trackProblemMention(transcript: string, stage: string) {
  const problems = conversationAnalyzer.analyzeProblemStatements(transcript);
  
  if (problems.primary) {
    this.customerProblems.push({
      primary: problems.primary,
      discovered: problems.secondary,
      acknowledged: false,
      stage_mentioned: stage,
      timestamp: Date.now()
    });
    
    // Update session state with problem context
    this.updateSessionState({
      problemContext: {
        mainProblem: problems.primary,
        allProblems: this.customerProblems,
        customerName: this.customerName,
        company: this.companyName
      }
    });
  }
}
```

#### 3. Name Extraction
**Enhancement**: Extract customer name from opening stage:
```typescript
extractCustomerDetails(transcript: string): { name: string; company: string } {
  // Patterns to match:
  // "Hi, I'm John Smith from ABC Corp"  
  // "This is Sarah from Marketing Solutions"
  // "My name is Michael and I work at..."
  
  const namePatterns = [
    /(?:I'm|This is|My name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /Hi\s+([A-Z][a-z]+)/i
  ];
  
  const companyPatterns = [
    /from\s+([A-Z][A-Za-z\s&]+(?:Corp|Inc|LLC|Ltd))/i,
    /at\s+([A-Z][A-Za-z\s&]+)/i
  ];
}
```

### Phase 2: UI Context Display

#### 1. Problem Context Panel
**File**: `src/components/coaching/ProblemContextPanel.tsx`

New component to display discovered problems:
```tsx
interface ProblemContextProps {
  customerName: string;
  company: string;
  problems: ExtractedProblems[];
  currentStage: string;
}

export const ProblemContextPanel: React.FC<ProblemContextProps> = ({
  customerName, company, problems, currentStage 
}) => {
  return (
    <div className="problem-context-panel">
      <h3>🎯 {customerName} - {company}</h3>
      
      <div className="main-problem">
        <strong>Primary Problem:</strong>
        <p>{problems[0]?.primary || 'Not yet identified'}</p>
      </div>
      
      <div className="discovered-issues">
        <strong>Other Issues:</strong>
        <ul>
          {problems.map(p => p.discovered.map(issue => 
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      </div>
      
      <div className="emotional-impact">
        <strong>Impact:</strong>
        <span className="badge">{problems[0]?.emotional_impact}</span>
      </div>
    </div>
  );
};
```

#### 2. Integration in Split View
**File**: `src/components/SplitViewCoaching.tsx`

Add problem context to coaching panel:
```tsx
// Add to existing panels
{showProblemContext && (
  <ProblemContextPanel
    customerName={sessionState?.problemContext?.customerName || ''}
    company={sessionState?.problemContext?.company || ''}
    problems={sessionState?.problemContext?.allProblems || []}
    currentStage={sessionState?.sessionData?.stage || 'opening'}
  />
)}
```

### Phase 3: Ollama Variable Integration

#### 1. Enhanced Prompt Building
**File**: `src/services/coaching/OllamaInstructionLoader-Browser.ts`

Extend prompt with problem variables:
```typescript
buildPrompt(context: {
  transcript: string;
  knowledge: string;
  salesStage: string;
  callDuration: number;
  problemContext?: {
    mainProblem: string;
    customerName: string;
    company: string;
    allProblems: string[];
  };
}): string {
  
  const prompt = instructions.replace('{TRANSCRIPT}', context.transcript)
    .replace('{KNOWLEDGE_BASE}', context.knowledge)
    .replace('{SALES_STAGE}', context.salesStage)
    .replace('{CALL_DURATION}', context.callDuration.toString())
    .replace('{CUSTOMER_NAME}', context.problemContext?.customerName || '')
    .replace('{PROBLEM}', context.problemContext?.mainProblem || '')
    .replace('{COMPANY}', context.problemContext?.company || '')
    .replace('{PROBLEMS_LIST}', context.problemContext?.allProblems?.join(', ') || '');
    
  return prompt;
}
```

#### 2. Updated Ollama Instructions Template
**File**: `ollama-prompts/active-instructions-problem-aware.md`

```prompt
You are an expert sales coach providing real-time guidance using customer context.

CUSTOMER CONTEXT:
Name: {CUSTOMER_NAME}
Company: {COMPANY}
Primary Problem: {PROBLEM}
All Problems: {PROBLEMS_LIST}

CURRENT CONVERSATION:
Stage: {SALES_STAGE} 
Duration: {CALL_DURATION} minutes
Last said: "{TRANSCRIPT}"

COACHING RULES:
1. Always reference {CUSTOMER_NAME} by name
2. Connect advice to their specific {PROBLEM}
3. In closing, remind them how solution solves {PROBLEM}
4. Use their company context when giving examples

RESPONSE FORMAT:
{
  "stage": "{SALES_STAGE}",
  "action": "Say: {CUSTOMER_NAME}, based on what you told me about {PROBLEM}, here's what I'd suggest...",
  "reasoning": "Personalizing response to their specific pain point",
  "next_move": "Listen for confirmation they see the connection"
}
```

### Phase 4: LED Breadcrumb Tracking

#### Problem Detection LEDs (7400-7499)
- **7401**: Customer name detected and extracted
- **7402**: Primary problem identified in discovery
- **7403**: Secondary problem discovered
- **7404**: Emotional impact language detected
- **7405**: Business impact quantified
- **7406**: Timeline pressure identified
- **7407**: Problem context updated in session state
- **7408**: Problem variable passed to Ollama

### Phase 5: Testing & Validation

#### Test Scenarios
1. **Discovery Stage**: "Hi John, I'm Sarah from TechCorp. Our biggest challenge is that our current system is too slow and frustrating our customers."
   - Should extract: Name=Sarah, Company=TechCorp, Problem="system too slow and frustrating customers"

2. **Closing Reference**: Ollama should suggest: "Say: Sarah, based on what you told me about your slow system frustrating customers, here's how our solution specifically addresses that..."

3. **Multi-Problem**: Track multiple issues and prioritize by emotional intensity

#### Success Metrics
- **95% name extraction accuracy** in opening stage
- **80% primary problem identification** in discovery stage  
- **Personalized coaching responses** that reference specific customer context
- **Improved closing rates** when problems are properly tracked and referenced

### Implementation Timeline
- **Week 1**: Problem detection in ConversationAnalyzer
- **Week 2**: UI components for problem context display
- **Week 3**: Ollama variable integration and prompt enhancement
- **Week 4**: LED breadcrumb tracking and testing

### Technical Notes
- Use conservative regex patterns to avoid false positives
- Store problems with timestamps for conversation flow tracking
- Consider confidence scores for extracted information
- Implement fallback when customer context is unclear

The {PROBLEM} variable becomes the bridge between discovery insights and closing effectiveness - making every coaching suggestion contextually relevant to the customer's specific pain points.