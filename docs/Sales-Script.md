# Sales Script Implementation Guide for VoiceCoach V2

## Overview
This document outlines the implementation of a sales script-driven coaching system that provides predictive guidance through a defined sales process while using proven sales techniques as coaching tools.

## Concept Distinction

### Sales Script = The WHAT (Content Flow/Agenda)
The sales script defines the **business process** and **conversation flow**:
- Introduction → Discovery → Past Attempts → Present Services → Value/Price → Prestige → Objections → Close
- This is the **predictable progression path** that every sales conversation should follow
- Enables **predictive coaching** - always know what step comes next

### Sales Techniques = The HOW (Execution Strategies)  
Sales techniques are **tools** to execute each script step effectively:
- Mirroring, Labeling, Tactical Empathy, Calibrated Questions, Anchoring
- These are **coaching prompts** Ollama uses to help the user execute each script step
- Applied contextually based on prospect responses and conversation dynamics

## Architecture Overview

### 1. Sales Script Data Structure
```typescript
interface SalesScript {
  id: string;
  name: string; // "Golf Coaching Sales Process"
  industry: string; // "Sports/Coaching"
  steps: ScriptStep[];
  techniques: SalesTechnique[];
  recoveryPaths: RecoveryPath[];
}

interface ScriptStep {
  id: number;
  name: string; // "Discovery - Past Attempts"
  objective: string; // "Understand what they've tried before"
  userPrompts: string[]; // Example questions/statements to use
  expectedDuration: { min: number; max: number }; // Minutes
  completionCriteria: string[]; // How to know this step is done
  nextStepId: number; // Normal progression
  alternativeNextSteps: { condition: string; stepId: number }[]; // For jumps/skips
}

interface SalesTechnique {
  id: string;
  name: string; // "Labeling"
  description: string; // "Acknowledge their emotions"
  examples: string[]; // "It sounds like...", "It seems like..."
  whenToUse: string[]; // Triggers for this technique
  stepCompatibility: number[]; // Which script steps this works with
}
```

### 2. Script Progress Tracking Service
**File**: `src/services/coaching/ScriptProgressTracker.ts`

```typescript
export class ScriptProgressTracker {
  private currentStepId: number = 1;
  private salesScript: SalesScript;
  private stepStartTime: Date = new Date();
  private stepProgress: Map<number, StepProgress> = new Map();
  private trail: BreadcrumbTrail;
  
  constructor(script: SalesScript) {
    this.salesScript = script;
    this.trail = new BreadcrumbTrail('ScriptProgressTracker');
  }
  
  /**
   * Get current step information for Ollama coaching context
   */
  getCurrentStepContext(): ScriptStepContext {
    const currentStep = this.salesScript.steps.find(s => s.id === this.currentStepId);
    const nextStep = this.salesScript.steps.find(s => s.id === currentStep?.nextStepId);
    const progress = this.getStepCompletionProgress(this.currentStepId);
    
    return {
      currentStep,
      nextStep,
      timeInStep: Date.now() - this.stepStartTime.getTime(),
      completionProgress: progress,
      readyToAdvance: progress >= 80,
      scriptName: this.salesScript.name
    };
  }
  
  /**
   * Check if user should advance to next step based on conversation
   */
  evaluateStepProgression(
    userSpeech: string, 
    prospectSpeech: string
  ): StepProgressionResult {
    const currentStep = this.salesScript.steps.find(s => s.id === this.currentStepId);
    if (!currentStep) return { shouldAdvance: false, reason: 'Invalid step' };
    
    // Check completion criteria
    const completionMet = this.checkCompletionCriteria(currentStep, userSpeech, prospectSpeech);
    const timeSpent = Date.now() - this.stepStartTime.getTime();
    const minTimeReached = timeSpent >= (currentStep.expectedDuration.min * 60 * 1000);
    
    return {
      shouldAdvance: completionMet && minTimeReached,
      reason: !completionMet ? 'Criteria not met' : !minTimeReached ? 'Too early' : 'Ready',
      nextStepId: currentStep.nextStepId,
      suggestedTechniques: this.getSuggestedTechniques(currentStep.id, prospectSpeech)
    };
  }
  
  /**
   * Advance to next step in script
   */
  advanceToNextStep(stepId: number): void {
    const previousStepId = this.currentStepId;
    this.currentStepId = stepId;
    this.stepStartTime = new Date();
    
    this.trail.light(7400, {
      operation: 'script_step_advanced',
      from_step: previousStepId,
      to_step: stepId,
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle off-script situations (prospect jumps ahead, objections, etc.)
   */
  handleOffScriptSituation(
    situation: 'jumped_ahead' | 'objection' | 'confusion' | 'resistance',
    context: string
  ): RecoveryGuidance {
    const recoveryPath = this.salesScript.recoveryPaths
      .find(path => path.situation === situation);
    
    if (!recoveryPath) {
      return {
        action: 'continue',
        guidance: 'No specific recovery path - continue with current step'
      };
    }
    
    return {
      action: recoveryPath.recommendedAction,
      guidance: recoveryPath.guidance,
      temporaryStepId: recoveryPath.temporaryStepId,
      returnToStepId: this.currentStepId
    };
  }
}
```

### 3. Script-Aware Ollama Prompt Builder
**Enhancement to**: `src/services/coaching/SessionManagerService.ts`

```typescript
/**
 * Build script-aware coaching context for Ollama prompts
 */
private buildScriptAwareContext(): string {
  if (!this.scriptProgressTracker) {
    return ''; // No script loaded
  }
  
  const stepContext = this.scriptProgressTracker.getCurrentStepContext();
  const speakerTranscript = this.buildSpeakerAwareTranscript();
  
  const scriptContext = `
SALES SCRIPT CONTEXT:
Methodology: ${stepContext.scriptName}
Current Step: ${stepContext.currentStep?.name} (${stepContext.completionProgress}% complete)
Objective: ${stepContext.currentStep?.objective}
Time in Step: ${Math.floor(stepContext.timeInStep / 60000)} minutes

SCRIPT PROGRESSION:
${this.buildProgressionStatus()}

CURRENT CONVERSATION:
${speakerTranscript}

SCRIPT GUIDANCE:
${stepContext.readyToAdvance ? 
  `✅ Ready to advance to: ${stepContext.nextStep?.name}` :
  `🔄 Continue working on: ${stepContext.currentStep?.name}`
}

Expected USER actions for this step:
${stepContext.currentStep?.userPrompts.slice(0, 2).join('\n')}

COACHING INSTRUCTIONS:
Provide specific guidance to help USER ${stepContext.readyToAdvance ? 'transition to next step' : 'complete current step'} using appropriate sales techniques.
`;

  return scriptContext;
}
```

### 4. Script Document Processing
**File**: `src/services/knowledge/ScriptProcessor.ts`

```typescript
export class SalesScriptProcessor {
  /**
   * Process uploaded document to extract sales script structure
   */
  async processScriptDocument(documentContent: string): Promise<SalesScript> {
    // Parse document for:
    // 1. Script steps (numbered lists, headers)
    // 2. Objectives for each step  
    // 3. Example prompts/questions
    // 4. Transition criteria
    
    // Example extraction logic:
    const steps = this.extractScriptSteps(documentContent);
    const techniques = this.extractSalesTechniques(documentContent);
    
    return {
      id: `script_${Date.now()}`,
      name: this.extractScriptName(documentContent),
      industry: this.extractIndustry(documentContent),
      steps,
      techniques,
      recoveryPaths: this.extractRecoveryPaths(documentContent)
    };
  }
  
  private extractScriptSteps(content: string): ScriptStep[] {
    // Look for numbered lists, step indicators
    // Parse objectives, questions, expected responses
    // Build step progression flow
  }
}
```

## Implementation Phases

### Phase 1: Core Script Engine (Week 1)
1. **Create ScriptProgressTracker service**
   - Step progression logic
   - Completion criteria evaluation
   - LED breadcrumb tracking (7400-7499 range)

2. **Build script data structures**
   - TypeScript interfaces
   - JSON schema for script storage
   - Validation logic

3. **Integrate with SessionManagerService** 
   - Replace stage detection with script progression
   - Update Ollama prompt building
   - Add script context to coaching calls

### Phase 2: Document Processing (Week 2)
1. **Create SalesScriptProcessor service**
   - Parse uploaded documents for script structure
   - Extract steps, objectives, prompts
   - Build technique libraries

2. **Enhance document upload flow**
   - Detect script vs. technique documents
   - Process and store script data
   - Link scripts to coaching sessions

### Phase 3: Advanced Features (Week 3)
1. **Recovery path handling**
   - Off-script situation detection
   - Recovery guidance system
   - Return-to-script logic

2. **Multiple script support**
   - Script selection UI
   - Script switching mid-conversation
   - Custom script creation

### Phase 4: UI Integration (Week 4)
1. **Script progress visualization**
   - Step completion indicators
   - Progress timeline
   - Next step preview

2. **Script compliance coaching**
   - Real-time step guidance
   - Technique suggestions
   - Progress analytics

## Example Script Structure (Golf Coaching)

```json
{
  "name": "Golf Coaching Sales Process",
  "industry": "Sports/Coaching", 
  "steps": [
    {
      "id": 1,
      "name": "Introduction",
      "objective": "Build rapport and establish credibility",
      "userPrompts": [
        "Hi [Name], I'm excited to help you improve your golf game",
        "I've helped over 200 golfers lower their handicap significantly"
      ],
      "expectedDuration": { "min": 2, "max": 5 },
      "completionCriteria": ["Prospect shows interest", "Basic rapport established"],
      "nextStepId": 2
    },
    {
      "id": 2, 
      "name": "Discovery - Current Game",
      "objective": "Understand what they want to improve",
      "userPrompts": [
        "What specific part of your game would you most like to improve?",
        "What's your current handicap, and where would you like it to be?"
      ],
      "expectedDuration": { "min": 5, "max": 10 },
      "completionCriteria": ["Identified specific improvement goals", "Established current skill level"],
      "nextStepId": 3
    },
    {
      "id": 3,
      "name": "Discovery - Past Attempts", 
      "objective": "Learn what they've tried before",
      "userPrompts": [
        "What have you tried in the past to improve your [specific area]?",
        "What worked well, and what didn't give you the results you wanted?"
      ],
      "expectedDuration": { "min": 5, "max": 8 },
      "completionCriteria": ["Understand past failures", "Identify gaps in previous approaches"],
      "nextStepId": 4
    }
    // Continue for all 9 steps...
  ],
  "techniques": [
    {
      "id": "labeling",
      "name": "Labeling", 
      "description": "Acknowledge their emotions or situation",
      "examples": [
        "It sounds like you've been frustrated with your progress",
        "It seems like you're really committed to improving"
      ],
      "whenToUse": ["Prospect shows emotion", "Need to build empathy"],
      "stepCompatibility": [2, 3, 7, 8]
    }
  ]
}
```

## Enhanced Ollama Instruction Template

```prompt
You are a sales coach helping a USER follow a proven sales script while using effective sales techniques.

SALES SCRIPT CONTEXT:
{SCRIPT_CONTEXT}

AVAILABLE TECHNIQUES:
{TECHNIQUE_LIBRARY}

CONVERSATION FLOW:
{SPEAKER_AWARE_TRANSCRIPT}

COACHING INSTRUCTIONS:
1. Help USER complete current script step before advancing
2. Suggest appropriate sales techniques based on PROSPECT responses
3. Provide specific words/questions for USER to say
4. If PROSPECT jumps ahead or objects, guide USER back to script flow
5. Use predictive coaching - prepare USER for likely next responses

Response format:
{
  "current_step_guidance": "How to complete current step",
  "suggested_technique": "Which sales technique to use right now", 
  "exact_words": "Specific phrase for USER to say",
  "next_step_prep": "What to expect/prepare for next",
  "script_compliance": "on_track|needs_redirection|ready_to_advance"
}
```

## Success Metrics
- Script step completion rates
- Time spent per step vs. expected duration  
- Successful step progression without backtracking
- Objection handling effectiveness
- Overall script compliance percentage

## File Structure
```
src/
├── services/
│   ├── coaching/
│   │   ├── ScriptProgressTracker.ts
│   │   └── SessionManagerService.ts (enhanced)
│   └── knowledge/
│       └── SalesScriptProcessor.ts
├── types/
│   └── script.ts (new interfaces)
└── components/
    └── coaching/
        └── ScriptProgressTimeline.tsx (future)
```

## Integration Points
- **Document Upload**: Process script documents alongside technique documents
- **Session Management**: Initialize script tracker with selected script
- **Ollama Prompts**: Replace stage context with script context
- **UI Display**: Show current step and progress
- **LED Breadcrumbs**: Track script progression (7400-7499 range)

This approach provides **predictable sales progression** while leveraging **proven sales techniques** for execution - exactly what makes sales coaching effective!