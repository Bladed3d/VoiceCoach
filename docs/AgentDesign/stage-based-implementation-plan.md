# Stage-Based Predictive Prompts Implementation Plan

## Overview
Implement a stage-tracking system that generates predictive prompts to advance sales conversations through defined stages.

## Core Architecture

### 1. Document Processing (One-Time Claude Setup)

#### Claude Instructions for Initial Processing
```javascript
const CLAUDE_STAGE_INSTRUCTIONS = `
Analyze this sales document and create a STAGE-BASED coaching structure.

CRITICAL: For each technique/principle, identify:
1. PRIMARY STAGE where it's most effective
2. TRANSITION GOAL (what stage it helps reach)
3. BRIDGE QUESTIONS that advance the conversation
4. EXIT CRITERIA that indicate readiness for next stage

Required JSON Output Structure:
{
  "stage_progressions": {
    "opening_to_discovery": {
      "duration_target": "2-3 minutes",
      "exit_criteria": [
        "rapport established",
        "agenda confirmed",
        "permission to explore granted"
      ],
      "bridge_techniques": [
        {
          "technique_name": "Permission Question",
          "source_reference": "Page/Section from document",
          "trigger_keywords": ["hello", "thanks for", "appreciate", "time"],
          "bridge_question": "Before we dive in, can you help me understand your current [topic] situation?",
          "why_it_works": "Transitions from pleasantries to business discovery",
          "fallback_if_rejected": "I understand. What brought you to explore [solution category] today?"
        }
      ],
      "common_stalls": [
        {
          "stall_indicator": "excessive small talk",
          "recovery_prompt": "I appreciate getting to know you. With our time today, what's the biggest [topic] challenge you're facing?"
        }
      ]
    },
    "discovery_to_presentation": {
      "duration_target": "8-12 minutes",
      "exit_criteria": [
        "pain points identified",
        "impact quantified",
        "budget range discussed",
        "decision process understood"
      ],
      "bridge_techniques": [
        {
          "technique_name": "Pain-to-Solution Bridge",
          "trigger_keywords": ["struggling", "challenge", "problem", "difficult"],
          "bridge_question": "Based on what you've shared about [specific pain], would it be helpful if I showed you how others have solved this?",
          "why_it_works": "Natural transition from problem to solution"
        }
      ]
    },
    "presentation_to_objection": {
      "exit_criteria": ["solution presented", "value understood", "concerns surfacing"],
      "bridge_techniques": [...]
    },
    "objection_to_closing": {
      "exit_criteria": ["objections addressed", "value confirmed", "buying signals present"],
      "bridge_techniques": [...]
    }
  },
  "stage_indicators": {
    "opening": {
      "strong_indicators": ["hello", "hi", "thanks for taking", "appreciate your time"],
      "weak_indicators": ["introduction", "calling about", "reaching out"],
      "weight": 1.0
    },
    "discovery": {
      "strong_indicators": ["challenge", "problem", "struggling with", "issue", "difficult"],
      "weak_indicators": ["currently", "process", "situation", "wondering"],
      "weight": 1.2
    },
    "presentation": {
      "strong_indicators": ["solution", "product", "demo", "show you", "features"],
      "weak_indicators": ["might help", "could work", "option"],
      "weight": 1.1
    },
    "objection": {
      "strong_indicators": ["concern", "worried", "expensive", "not sure", "problem with"],
      "weak_indicators": ["question", "clarify", "understand"],
      "weight": 1.5
    },
    "closing": {
      "strong_indicators": ["decision", "move forward", "next steps", "agreement", "start"],
      "weak_indicators": ["timeline", "process", "approval"],
      "weight": 1.3
    }
  },
  "universal_recovery_prompts": [
    {
      "situation": "conversation_stalled",
      "prompt": "What's your biggest priority with [topic] right now?"
    },
    {
      "situation": "unclear_stage",
      "prompt": "Help me understand where you are in your evaluation process?"
    }
  ]
}
`;
```

### 2. Stage Detection System

```typescript
// src/services/coaching/stage-detection.service.ts
import { EventEmitter } from 'events';

export interface StageDetectionResult {
  currentStage: SalesStage;
  confidence: number;      // 0-1 confidence score
  stageProgress: number;   // 0-100% through current stage
  exitCriteriaMet: string[]; // Which criteria have been satisfied
  nextStageReady: boolean; // Ready to transition?
  suggestedBridges: BridgeTechnique[]; // Relevant bridges for context
}

export class StageDetectionService extends EventEmitter {
  private conversationHistory: ConversationEntry[] = [];
  private currentStage: SalesStage = 'opening';
  private stageStartTime: number = Date.now();
  private exitCriteriaTracker: Map<string, boolean> = new Map();
  
  constructor(
    private stageProgressions: StageProgressions,
    private stageIndicators: StageIndicators
  ) {
    super();
  }
  
  detectStage(transcript: string): StageDetectionResult {
    // Add to conversation history
    this.conversationHistory.push({
      text: transcript,
      timestamp: Date.now(),
      detectedStage: null // Will be set after detection
    });
    
    // Calculate weighted scores for each stage
    const stageScores = this.calculateStageScores(transcript);
    
    // Determine current stage with confidence
    const detection = this.determineStageWithConfidence(stageScores);
    
    // Check exit criteria for current stage
    const exitStatus = this.evaluateExitCriteria(detection.stage);
    
    // Calculate progress through current stage
    const progress = this.calculateStageProgress(detection.stage, exitStatus);
    
    // Get relevant bridge techniques
    const bridges = this.getRelevantBridges(detection.stage, transcript);
    
    // Emit stage change event if detected
    if (detection.stage !== this.currentStage) {
      this.emit('stageChanged', {
        from: this.currentStage,
        to: detection.stage,
        timestamp: Date.now()
      });
      this.currentStage = detection.stage;
      this.stageStartTime = Date.now();
      this.resetExitCriteria(detection.stage);
    }
    
    return {
      currentStage: detection.stage,
      confidence: detection.confidence,
      stageProgress: progress,
      exitCriteriaMet: exitStatus.met,
      nextStageReady: progress > 70 && exitStatus.percentage > 60,
      suggestedBridges: bridges
    };
  }
  
  private calculateStageScores(transcript: string): Map<SalesStage, number> {
    const scores = new Map<SalesStage, number>();
    const transcriptLower = transcript.toLowerCase();
    
    for (const [stage, indicators] of Object.entries(this.stageIndicators)) {
      let score = 0;
      
      // Strong indicators get more weight
      for (const indicator of indicators.strong_indicators) {
        if (transcriptLower.includes(indicator)) {
          score += 2.0 * indicators.weight;
        }
      }
      
      // Weak indicators get less weight
      for (const indicator of indicators.weak_indicators) {
        if (transcriptLower.includes(indicator)) {
          score += 0.5 * indicators.weight;
        }
      }
      
      // Boost score if recent history suggests this stage
      const recentContext = this.getRecentContext(3);
      if (recentContext.includes(stage)) {
        score += 1.0;
      }
      
      scores.set(stage as SalesStage, score);
    }
    
    return scores;
  }
  
  private evaluateExitCriteria(stage: SalesStage): {
    met: string[];
    percentage: number;
  } {
    const nextStage = this.getNextStage(stage);
    const progression = this.stageProgressions[`${stage}_to_${nextStage}`];
    
    if (!progression) {
      return { met: [], percentage: 0 };
    }
    
    const metCriteria = progression.exit_criteria.filter(criterion => {
      return this.checkCriterionMet(criterion, this.conversationHistory);
    });
    
    return {
      met: metCriteria,
      percentage: (metCriteria.length / progression.exit_criteria.length) * 100
    };
  }
  
  private getRelevantBridges(stage: SalesStage, transcript: string): BridgeTechnique[] {
    const nextStage = this.getNextStage(stage);
    const progression = this.stageProgressions[`${stage}_to_${nextStage}`];
    
    if (!progression) return [];
    
    return progression.bridge_techniques.filter(bridge => {
      return bridge.trigger_keywords.some(keyword => 
        transcript.toLowerCase().includes(keyword)
      );
    });
  }
}
```

### 3. Predictive Prompt Generator

```typescript
// src/services/coaching/predictive-prompt.service.ts
export class PredictivePromptService {
  private promptCache: Map<string, CachedPrompt> = new Map();
  
  constructor(
    private stageProgressions: StageProgressions,
    private ollamaService: OllamaStageService,
    private stageDetector: StageDetectionService
  ) {}
  
  async generatePredictivePrompt(
    detection: StageDetectionResult,
    transcript: string
  ): Promise<CoachingPrompt> {
    // Check cache first
    const cacheKey = this.generateCacheKey(detection.currentStage, transcript);
    const cached = this.promptCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) { // 30s cache
      console.log('📦 Using cached prompt for:', cacheKey);
      return cached.prompt;
    }
    
    // Determine prompt strategy based on stage progress
    const strategy = this.determineStrategy(detection);
    console.log(`🎯 Strategy: ${strategy} for stage ${detection.currentStage} (${detection.stageProgress}% complete)`);
    
    // Build Ollama prompt based on strategy
    const ollamaPrompt = this.buildStrategicPrompt(strategy, detection, transcript);
    
    if (!ollamaPrompt) {
      throw new Error(`FAILED TO BUILD PROMPT\nStrategy: ${strategy}\nDetection: ${JSON.stringify(detection)}`);
    }
    
    // Generate with Ollama - NO TRY/CATCH, LET IT FAIL LOUD
    const prompt = await this.ollamaService.generateStagePrompt(ollamaPrompt);
    
    // Validate the prompt structure
    if (!prompt.suggestion || prompt.suggestion.length === 0) {
      throw new Error(`INVALID PROMPT GENERATED\nNo suggestion provided\nPrompt: ${JSON.stringify(prompt)}`);
    }
    
    if (prompt.suggestion.split(' ').length > 30) {
      throw new Error(`PROMPT TOO LONG\nMax 30 words, got ${prompt.suggestion.split(' ').length}\nSuggestion: ${prompt.suggestion}`);
    }
    
    // Cache the result
    this.promptCache.set(cacheKey, {
      prompt,
      timestamp: Date.now()
    });
    
    // Clean old cache entries
    this.cleanCache();
    
    return prompt;
  }
  
  private determineStrategy(detection: StageDetectionResult): PromptStrategy {
    // High progress + exit criteria met = Push to next stage
    if (detection.stageProgress > 70 && detection.nextStageReady) {
      return 'advance_stage';
    }
    
    // Low progress = Deepen current stage
    if (detection.stageProgress < 30) {
      return 'deepen_discovery';
    }
    
    // Stalled = Recovery prompt
    if (this.isConversationStalled()) {
      return 'recovery';
    }
    
    // Default = Build toward next stage
    return 'build_momentum';
  }
  
  private buildStrategicPrompt(
    strategy: PromptStrategy,
    detection: StageDetectionResult,
    transcript: string
  ): string {
    const nextStage = this.getNextStage(detection.currentStage);
    
    switch (strategy) {
      case 'advance_stage':
        return `
          Current Stage: ${detection.currentStage} (ready to advance)
          Target Stage: ${nextStage}
          Exit Criteria Met: ${detection.exitCriteriaMet.join(', ')}
          
          Bridge Techniques Available:
          ${detection.suggestedBridges.map(b => 
            `- "${b.bridge_question}" (${b.technique_name})`
          ).join('\n')}
          
          Customer said: "${transcript}"
          
          Provide ONE bridge question that naturally transitions to ${nextStage}.
          Make it specific to what they just said.
          
          JSON Response:
          {
            "suggestion": "Specific bridge question (max 30 words)",
            "reasoning": "Advancing to ${nextStage} stage",
            "urgency": "high"
          }`;
          
      case 'deepen_discovery':
        return `
          Current Stage: ${detection.currentStage} (early stage)
          Missing Exit Criteria: ${this.getMissingCriteria(detection)}
          
          Customer said: "${transcript}"
          
          Provide ONE question that explores deeper into their ${detection.currentStage} needs.
          Focus on uncovering information needed for: ${this.getMissingCriteria(detection)[0]}
          
          JSON Response:
          {
            "suggestion": "Deepening question (max 30 words)",
            "reasoning": "Gathering ${this.getMissingCriteria(detection)[0]}",
            "urgency": "medium"
          }`;
          
      case 'recovery':
        return `
          Conversation appears stalled in ${detection.currentStage} stage.
          
          Customer said: "${transcript}"
          
          Provide ONE recovery question to re-engage and move forward.
          
          JSON Response:
          {
            "suggestion": "Re-engagement question (max 30 words)",
            "reasoning": "Re-engaging conversation",
            "urgency": "high"
          }`;
          
      default: // build_momentum
        return `
          Current Stage: ${detection.currentStage} (${detection.stageProgress}% complete)
          Building toward: ${nextStage}
          
          Customer said: "${transcript}"
          
          Provide ONE question that builds momentum toward ${nextStage}.
          
          JSON Response:
          {
            "suggestion": "Momentum-building question (max 30 words)",
            "reasoning": "Building toward ${nextStage}",
            "urgency": "medium"
          }`;
    }
  }
}
```

### 4. Ollama Integration (Optimized for qwen2.5:7b)

```typescript
// src/services/ollama/ollama-stage.service.ts
export class OllamaStageService {
  private readonly config = {
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:7b', // Smaller, faster model
    timeout: 3000,       // 3 second timeout
    maxTokens: 150       // Keep responses concise
  };
  
  async generateStagePrompt(prompt: string): Promise<CoachingPrompt> {
    const startTime = performance.now();
    
    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt: this.simplifyPromptForQwen(prompt),
        stream: false,
        options: {
          temperature: 0.3,  // Low for consistency
          top_p: 0.9,
          num_predict: this.config.maxTokens,
          stop: ['\n\n', '```'] // Stop at natural boundaries
        }
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });
    
    const duration = performance.now() - startTime;
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OLLAMA FAILED [${response.status}]: ${errorBody}\nModel: ${this.config.model}\nDuration: ${duration}ms`);
    }
    
    const data = await response.json();
    
    if (!data.response) {
      throw new Error(`OLLAMA RETURNED EMPTY RESPONSE\nModel: ${this.config.model}\nDuration: ${duration}ms\nData: ${JSON.stringify(data)}`);
    }
    
    console.log(`✅ Ollama response in ${duration}ms:`, data.response);
    
    const parsed = this.parseResponse(data.response);
    
    if (!parsed.suggestion || !parsed.reasoning || !parsed.urgency) {
      throw new Error(`OLLAMA RESPONSE MISSING REQUIRED FIELDS\nExpected: {suggestion, reasoning, urgency}\nGot: ${JSON.stringify(parsed)}\nRaw: ${data.response}`);
    }
    
    return parsed;
  }
  
  private simplifyPromptForQwen(prompt: string): string {
    // Qwen 7B works better with simplified prompts
    // Remove excessive context, focus on action
    const simplified = prompt
      .replace(/\n\s+/g, '\n') // Remove extra whitespace
      .replace(/Current Stage:/g, 'Stage:')
      .replace(/Customer said:/g, 'Said:')
      + '\n\nProvide JSON response only.';
    
    console.log('📝 Ollama prompt:', simplified);
    return simplified;
  }
  
  private parseResponse(response: string): any {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(`NO JSON FOUND IN RESPONSE: ${response}`);
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(`FAILED TO PARSE OLLAMA JSON\nError: ${error.message}\nResponse: ${response}`);
    }
  }
}
```

### 5. React Component Integration

```typescript
// src/components/coaching/StageBasedCoaching.tsx
import React, { useState, useEffect } from 'react';
import { StageDetectionService } from '@/services/coaching/stage-detection.service';
import { PredictivePromptService } from '@/services/coaching/predictive-prompt.service';

export function StageBasedCoaching({ transcript }: { transcript: string }) {
  const [currentStage, setCurrentStage] = useState<SalesStage>('opening');
  const [stageProgress, setStageProgress] = useState(0);
  const [prompt, setPrompt] = useState<CoachingPrompt | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  useEffect(() => {
    if (!transcript) return;
    
    const generatePrompt = async () => {
      setIsGenerating(true);
      
      // NO TRY/CATCH - Let errors bubble up to error boundary
      // Detect stage
      const detection = await stageDetector.detectStage(transcript);
      
      if (!detection) {
        throw new Error(`STAGE DETECTION FAILED\nTranscript: ${transcript}`);
      }
      
      console.log('🎯 Stage detected:', {
        stage: detection.currentStage,
        confidence: detection.confidence,
        progress: detection.stageProgress,
        exitCriteria: detection.exitCriteriaMet
      });
      
      setCurrentStage(detection.currentStage);
      setStageProgress(detection.stageProgress);
      
      // Generate predictive prompt
      const newPrompt = await promptGenerator.generatePredictivePrompt(
        detection,
        transcript
      );
      
      if (!newPrompt) {
        throw new Error(`PROMPT GENERATION FAILED\nDetection: ${JSON.stringify(detection)}\nTranscript: ${transcript}`);
      }
      
      setPrompt(newPrompt);
      setIsGenerating(false);
    };
    
    generatePrompt();
  }, [transcript]);
  
  return (
    <div className="stage-based-coaching">
      {/* Stage Progress Indicator */}
      <StageProgressBar 
        currentStage={currentStage}
        progress={stageProgress}
      />
      
      {/* Coaching Prompt */}
      {prompt && (
        <CoachingCard
          prompt={prompt}
          stage={currentStage}
          isGenerating={isGenerating}
        />
      )}
    </div>
  );
}
```

### 6. File Structure

```
src/
├── services/
│   ├── coaching/
│   │   ├── stage-detection.service.ts
│   │   ├── predictive-prompt.service.ts
│   │   ├── stage-progressions.types.ts
│   │   └── conversation-tracker.service.ts
│   └── ollama/
│       ├── ollama-stage.service.ts
│       └── ollama.config.ts
├── components/
│   └── coaching/
│       ├── StageBasedCoaching.tsx
│       ├── StageProgressBar.tsx
│       └── CoachingCard.tsx
└── data/
    ├── stage-progressions.json  # Generated by Claude
    └── stage-indicators.json    # Generated by Claude
```

## Implementation Steps

### Phase 1: Document Processing (Day 1)
1. Process sales documents with Claude using the stage-based instructions
2. Generate `stage-progressions.json` and `stage-indicators.json`
3. Validate the output structure

### Phase 2: Core Services (Day 2-3)
1. Implement `StageDetectionService`
2. Implement `PredictivePromptService`
3. Set up `OllamaStageService` with qwen2.5:7b

### Phase 3: Integration (Day 4)
1. Create React components
2. Wire up services
3. Test with sample transcripts

### Phase 4: Optimization (Day 5)
1. Tune stage detection weights
2. Optimize Ollama prompts for qwen2.5:7b
3. Add caching and performance monitoring

## Success Metrics

1. **Stage Detection Accuracy**: >85% correct stage identification
2. **Response Time**: <500ms for prompt generation
3. **Advancement Rate**: >60% of suggestions lead to stage progression
4. **Relevance Score**: >80% of prompts directly address current context

## Development Philosophy: FAIL LOUD

**NO FALLBACKS** - Every failure should be immediately visible:
- Console errors with full context
- Detailed error messages showing what was expected vs received
- Performance timing on every operation
- Raw data logged for debugging

**Why No Fallbacks:**
1. **Fallbacks hide real problems** - You think it's working when it's not
2. **Generic fallbacks are worse than failures** - Bad coaching is worse than no coaching
3. **Development needs clear signals** - Can't fix what you can't see
4. **Production can add recovery later** - But only after understanding failure patterns

## Key Advantages

1. **Predictable**: Based on proven sales stage progression
2. **Fast**: Lightweight qwen2.5:7b model with focused prompts
3. **Contextual**: Bridges matched to current conversation
4. **Actionable**: Specific questions, not generic advice
5. **Simple**: Stage tracking instead of complex AI reasoning