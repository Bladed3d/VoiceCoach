# Stage Implementation - App Update Instructions

## ⚠️ IMPORTANT: Document Processing Instructions Have Moved

### For Processing Sales Documents into Stage-Based JSON:
**DO NOT use these instructions for document processing!**

Instead, use the Stage Coaching Processor agent:
```
@agent stage-coaching-processor
```

The agent will:
- Transform sales documents into stage-based JSON coaching objects
- Save to `/rag` folder with proper timestamp
- Create valid JSON that works with the VoiceCoach V2 stage system

### For App Code Implementation:
The instructions below are ONLY for implementing stage detection and coaching features in the VoiceCoach V2 application code.

## Overview
This document provides complete instructions for implementing stage-based predictive coaching in VoiceCoach V2. The implementation uses simple JavaScript objects in memory for maximum speed and simplicity.

## For Claude: Your Implementation Task

You are implementing a stage-based coaching system that:
1. Detects which sales stage the conversation is in
2. Pre-loads relevant bridge questions for that stage
3. Provides instant coaching suggestions via Ollama
4. Updates the UI to show current stage progress

## LED Breadcrumb Ranges

**CRITICAL**: All new code MUST include LED breadcrumbs for debugging. Use these ranges:

```typescript
// LED Range Allocations for Stage Implementation
const LED_RANGES = {
  // Stage Detection (4100-4199)
  STAGE_DETECTION_START: 4100,
  STAGE_KEYWORD_MATCH: 4101,
  STAGE_CHANGE_DETECTED: 4102,
  STAGE_DETECTION_ERROR: 4103,
  STAGE_BRIDGES_LOADED: 4104,
  
  // Coaching Manager (4200-4299)
  COACHING_MANAGER_INIT: 4200,
  COACHING_PROCESS_START: 4201,
  COACHING_OLLAMA_CALL: 4202,
  COACHING_RESPONSE_READY: 4203,
  COACHING_ERROR: 4204,
  
  // UI Updates (4300-4399)
  UI_STAGE_UPDATE: 4300,
  UI_PROGRESS_RENDER: 4301,
  UI_STAGE_TAB_UPDATE: 4302,
  UI_COACHING_DISPLAY: 4303
};
```

## File 1: Create Stage Detection Service

**Path**: `src/services/coaching/stage-detection.service.ts`

```typescript
import { breadcrumbService } from '@/lib/breadcrumb-system';

export type SalesStage = 'opening' | 'discovery' | 'presentation' | 'objection' | 'closing';

export interface StageDetectionResult {
  stage: SalesStage;
  confidence: number;
  matchedKeywords: string[];
  bridges: Array<{ text: string; priority: string }>;
}

export class StageDetectionService {
  private currentStage: SalesStage = 'opening';
  private coachingSystem: any;
  private conversationHistory: string[] = [];
  
  constructor(coachingData: any) {
    breadcrumbService.light(4100, { message: 'Initializing stage detection service' });
    
    if (!coachingData || !coachingData.stages) {
      breadcrumbService.fail(4103, new Error('Invalid coaching data structure'), { coachingData });
      throw new Error('STAGE DETECTION INIT FAILED: Missing stages in coaching data');
    }
    
    this.coachingSystem = coachingData;
    breadcrumbService.light(4100, { 
      message: 'Stage detection initialized',
      stagesLoaded: Object.keys(coachingData.stages) 
    });
  }
  
  detectStage(transcript: string): StageDetectionResult {
    const startTime = performance.now();
    breadcrumbService.light(4101, { transcript: transcript.substring(0, 100) });
    
    const words = transcript.toLowerCase();
    const matchedKeywords: string[] = [];
    let bestStage = this.currentStage;
    let bestScore = 0;
    
    // Check each stage for keyword matches
    for (const [stage, data] of Object.entries(this.coachingSystem.stages)) {
      const stageData = data as any;
      const keywords = stageData.keywords || [];
      
      const matches = keywords.filter((kw: string) => {
        if (words.includes(kw)) {
          matchedKeywords.push(kw);
          return true;
        }
        return false;
      });
      
      const score = matches.length;
      
      if (score > bestScore && score >= 2) { // Need at least 2 keyword matches
        bestScore = score;
        bestStage = stage as SalesStage;
      }
    }
    
    // Update stage if changed
    if (bestStage !== this.currentStage) {
      breadcrumbService.light(4102, {
        previousStage: this.currentStage,
        newStage: bestStage,
        confidence: bestScore,
        matchedKeywords
      });
      this.currentStage = bestStage;
    }
    
    // Add to conversation history
    this.conversationHistory.push(transcript);
    if (this.conversationHistory.length > 5) {
      this.conversationHistory.shift(); // Keep only last 5
    }
    
    // Get bridges for current stage
    const bridges = this.getBridges();
    breadcrumbService.light(4104, { 
      stage: this.currentStage,
      bridgeCount: bridges.length,
      duration: performance.now() - startTime
    });
    
    return {
      stage: this.currentStage,
      confidence: bestScore / 5, // Normalize to 0-1
      matchedKeywords,
      bridges
    };
  }
  
  getBridges(): Array<{ text: string; priority: string }> {
    const stageData = this.coachingSystem.stages[this.currentStage];
    if (!stageData || !stageData.bridges) {
      breadcrumbService.fail(4103, new Error('No bridges found for stage'), { 
        stage: this.currentStage 
      });
      return [];
    }
    
    // Handle both string arrays and object arrays
    return stageData.bridges.map((bridge: any) => {
      if (typeof bridge === 'string') {
        return { text: bridge, priority: 'STANDARD' };
      }
      return bridge;
    });
  }
  
  getCurrentStage(): SalesStage {
    return this.currentStage;
  }
  
  getStageGoal(): string {
    return this.coachingSystem.stages[this.currentStage]?.goal || '';
  }
  
  getExitCriteria(): string[] {
    return this.coachingSystem.stages[this.currentStage]?.exitCriteria || [];
  }
  
  getRecoveryPrompts(): string[] {
    return this.coachingSystem.stages[this.currentStage]?.recovery || [];
  }
}
```

## File 2: Create Coaching Manager Service

**Path**: `src/services/coaching/coaching-manager.service.ts`

```typescript
import { StageDetectionService, type SalesStage } from './stage-detection.service';
import { OllamaService } from '@/services/ollama/ollama.service';
import { breadcrumbService } from '@/lib/breadcrumb-system';

export interface CoachingResult {
  stage: SalesStage;
  stageGoal: string;
  prompt: {
    suggestion: string;
    urgency: 'high' | 'medium' | 'low';
    reasoning?: string;
  };
  exitCriteria: string[];
  confidence: number;
}

export class CoachingManagerService {
  private stageDetector: StageDetectionService;
  private ollamaService: OllamaService;
  private lastProcessTime: number = 0;
  
  constructor(coachingData: any) {
    breadcrumbService.light(4200, { message: 'Initializing coaching manager' });
    
    try {
      this.stageDetector = new StageDetectionService(coachingData);
      this.ollamaService = new OllamaService();
      
      breadcrumbService.light(4200, { 
        message: 'Coaching manager initialized',
        stagesAvailable: Object.keys(coachingData.stages)
      });
    } catch (error) {
      breadcrumbService.fail(4204, error as Error, { 
        message: 'Failed to initialize coaching manager' 
      });
      throw error;
    }
  }
  
  async processTranscript(transcript: string): Promise<CoachingResult> {
    const startTime = performance.now();
    breadcrumbService.light(4201, { 
      transcript: transcript.substring(0, 100),
      length: transcript.length 
    });
    
    try {
      // 1. Detect stage and get bridges (instant - <20ms)
      const detection = this.stageDetector.detectStage(transcript);
      
      if (!detection.bridges || detection.bridges.length === 0) {
        throw new Error(`NO BRIDGES AVAILABLE FOR STAGE: ${detection.stage}`);
      }
      
      // 2. Prepare Ollama prompt with bridges
      const ollamaPrompt = this.buildOllamaPrompt(transcript, detection.bridges);
      
      // 3. Get coaching from Ollama (150-200ms)
      breadcrumbService.light(4202, { 
        stage: detection.stage,
        bridgeCount: detection.bridges.length 
      });
      
      const ollamaResponse = await this.ollamaService.generateCoaching(ollamaPrompt);
      
      // 4. Parse and validate response
      const prompt = this.parseOllamaResponse(ollamaResponse);
      
      const duration = performance.now() - startTime;
      breadcrumbService.light(4203, { 
        stage: detection.stage,
        responseTime: duration,
        urgency: prompt.urgency
      });
      
      // Log performance warning if too slow
      if (duration > 200) {
        console.warn(`⚠️ SLOW COACHING RESPONSE: ${duration}ms (target: <200ms)`);
      }
      
      this.lastProcessTime = duration;
      
      return {
        stage: detection.stage,
        stageGoal: this.stageDetector.getStageGoal(),
        prompt,
        exitCriteria: this.stageDetector.getExitCriteria(),
        confidence: detection.confidence
      };
      
    } catch (error) {
      breadcrumbService.fail(4204, error as Error, { 
        transcript: transcript.substring(0, 100),
        stage: this.stageDetector.getCurrentStage()
      });
      throw error;
    }
  }
  
  private buildOllamaPrompt(transcript: string, bridges: Array<{ text: string; priority: string }>): string {
    // Sort bridges by priority
    const sortedBridges = [...bridges].sort((a, b) => {
      const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'STANDARD': 2 };
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });
    
    // Build focused prompt for Ollama
    return `
Customer said: "${transcript}"

Best responses for current stage (in priority order):
${sortedBridges.map((b, i) => `${i + 1}. [${b.priority}] ${b.text}`).join('\n')}

Pick the most relevant response or create a specific variation based on what they said.
The response should directly address their statement.

Respond with JSON only:
{"suggestion": "Your coaching suggestion (max 30 words)", "urgency": "high|medium|low", "reasoning": "Why this suggestion (max 20 words)"}`;
  }
  
  private parseOllamaResponse(response: any): CoachingResult['prompt'] {
    // Handle both string and object responses
    let parsed: any;
    
    if (typeof response === 'string') {
      try {
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in Ollama response');
        }
        parsed = JSON.parse(jsonMatch[0]);
      } catch (error) {
        breadcrumbService.fail(4204, error as Error, { 
          response: response.substring(0, 200) 
        });
        throw new Error(`FAILED TO PARSE OLLAMA RESPONSE: ${error.message}`);
      }
    } else {
      parsed = response;
    }
    
    // Validate required fields
    if (!parsed.suggestion) {
      throw new Error('OLLAMA RESPONSE MISSING SUGGESTION');
    }
    
    if (!parsed.urgency || !['high', 'medium', 'low'].includes(parsed.urgency)) {
      parsed.urgency = 'medium'; // Default if missing or invalid
    }
    
    // Validate word count
    const wordCount = parsed.suggestion.split(' ').length;
    if (wordCount > 30) {
      console.warn(`⚠️ SUGGESTION TOO LONG: ${wordCount} words (max: 30)`);
      // Truncate to 30 words
      parsed.suggestion = parsed.suggestion.split(' ').slice(0, 30).join(' ') + '...';
    }
    
    return {
      suggestion: parsed.suggestion,
      urgency: parsed.urgency,
      reasoning: parsed.reasoning
    };
  }
  
  getCurrentStage(): SalesStage {
    return this.stageDetector.getCurrentStage();
  }
  
  getLastProcessTime(): number {
    return this.lastProcessTime;
  }
  
  // Get recovery prompt if conversation is stalled
  getRecoveryPrompt(): string {
    const prompts = this.stageDetector.getRecoveryPrompts();
    if (prompts.length === 0) {
      return "What's your biggest priority right now?";
    }
    // Return random recovery prompt
    return prompts[Math.floor(Math.random() * prompts.length)];
  }
}
```

## File 3: Update Ollama Service

**Path**: `src/services/ollama/ollama.service.ts`

Add this method to your existing OllamaService:

```typescript
// ADD this method to your existing OllamaService class:

async generateCoaching(prompt: string): Promise<any> {
  const startTime = performance.now();
  
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:7b', // Using lightweight model for speed
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,  // Low for consistency
          top_p: 0.9,
          num_predict: 150,  // Limit tokens for speed
          stop: ['\n\n', '```']
        }
      }),
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OLLAMA ERROR [${response.status}]: ${errorText}`);
    }
    
    const data = await response.json();
    const duration = performance.now() - startTime;
    
    console.log(`✅ Ollama response in ${duration}ms`);
    
    if (!data.response) {
      throw new Error('OLLAMA RETURNED EMPTY RESPONSE');
    }
    
    return data.response;
    
  } catch (error) {
    console.error('❌ Ollama generation failed:', error);
    throw error;
  }
}
```

## File 4: Create Stage Progress Indicator Component

**Path**: `src/components/split-view/StageProgressIndicator.tsx`

```typescript
import React from 'react';
import { breadcrumbService } from '@/lib/breadcrumb-system';

interface StageProgressIndicatorProps {
  currentStage: string;
  stages: string[];
  confidence: number;
}

export function StageProgressIndicator({ 
  currentStage, 
  stages, 
  confidence 
}: StageProgressIndicatorProps) {
  const stageIndex = stages.indexOf(currentStage);
  
  React.useEffect(() => {
    breadcrumbService.light(4301, { 
      stage: currentStage, 
      index: stageIndex,
      confidence 
    });
  }, [currentStage, stageIndex, confidence]);
  
  return (
    <div className="p-3 bg-gray-900 rounded-lg">
      {/* Stage Progress Bar */}
      <div className="flex items-center space-x-2 mb-3">
        {stages.map((stage, index) => (
          <React.Fragment key={stage}>
            <div className="flex flex-col items-center">
              <div 
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  transition-all duration-300
                  ${index === stageIndex 
                    ? 'bg-blue-500 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900' 
                    : index < stageIndex 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-700 text-gray-400'
                  }
                `}
              >
                {index < stageIndex ? '✓' : index + 1}
              </div>
              <span className="text-xs text-gray-400 mt-1 capitalize">
                {stage.substring(0, 3)}
              </span>
            </div>
            
            {index < stages.length - 1 && (
              <div 
                className={`
                  flex-1 h-1 transition-all duration-300
                  ${index < stageIndex ? 'bg-green-600' : 'bg-gray-700'}
                `} 
              />
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Confidence Indicator */}
      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Stage Confidence</span>
          <span>{Math.round(confidence * 100)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              confidence > 0.7 ? 'bg-green-500' : 
              confidence > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

## File 5: Update Split View Component

**Path**: `src/components/split-view/SplitView.tsx`

Update the Stage Tracking tab in your existing SplitView component:

```typescript
// Add these imports
import { StageProgressIndicator } from './StageProgressIndicator';
import { CoachingManagerService } from '@/services/coaching/coaching-manager.service';
import { breadcrumbService } from '@/lib/breadcrumb-system';

// Add to your component state
const [currentStage, setCurrentStage] = useState<string>('opening');
const [stageConfidence, setStageConfidence] = useState<number>(0);
const [exitCriteria, setExitCriteria] = useState<string[]>([]);
const [stageGoal, setStageGoal] = useState<string>('');

// Initialize coaching manager (do this once, maybe in useEffect)
const [coachingManager] = useState(() => {
  try {
    // Load coaching data (this should come from your processed document)
    const coachingData = require('@/data/coaching-system.json');
    return new CoachingManagerService(coachingData);
  } catch (error) {
    console.error('Failed to initialize coaching manager:', error);
    return null;
  }
});

// Update your handleTranscript function
const handleTranscript = async (transcript: string) => {
  if (!coachingManager) {
    console.error('Coaching manager not initialized');
    return;
  }
  
  try {
    breadcrumbService.light(4300, { action: 'Processing transcript' });
    
    const result = await coachingManager.processTranscript(transcript);
    
    // Update stage UI
    setCurrentStage(result.stage);
    setStageConfidence(result.confidence);
    setExitCriteria(result.exitCriteria);
    setStageGoal(result.stageGoal);
    
    // Display coaching prompt
    displayCoachingPrompt(result.prompt);
    
    breadcrumbService.light(4302, { 
      stage: result.stage,
      promptUrgency: result.prompt.urgency
    });
    
  } catch (error) {
    console.error('Failed to process transcript:', error);
    breadcrumbService.fail(4303, error as Error);
  }
};

// Update the Stage Tracking tab content
<Tab key="stage" title="Stage Tracking">
  <div className="space-y-4">
    {/* Stage Progress */}
    <StageProgressIndicator 
      currentStage={currentStage}
      stages={['opening', 'discovery', 'presentation', 'objection', 'closing']}
      confidence={stageConfidence}
    />
    
    {/* Current Stage Details */}
    <div className="p-3 bg-gray-800 rounded-lg">
      <h4 className="text-sm font-semibold text-gray-300 mb-2">Current Stage</h4>
      <div className="space-y-2">
        <div>
          <p className="text-lg font-bold text-white capitalize">{currentStage}</p>
          <p className="text-xs text-gray-400">{stageGoal}</p>
        </div>
        
        {/* Exit Criteria */}
        {exitCriteria.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-400 mb-1">Exit Criteria:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              {exitCriteria.map((criteria, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-gray-600 mr-1">•</span>
                  <span>{criteria}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
    
    {/* Performance Metric */}
    {coachingManager && (
      <div className="p-2 bg-gray-800 rounded text-xs text-gray-400">
        Last response: {coachingManager.getLastProcessTime().toFixed(0)}ms
      </div>
    )}
  </div>
</Tab>
```

## File 6: Update Coaching Card Display

**Path**: `src/components/coaching/CoachingCard.tsx`

Add stage context to your existing coaching card:

```typescript
// Update your CoachingCard to show stage context

interface CoachingCardProps {
  prompt: {
    suggestion: string;
    urgency: 'high' | 'medium' | 'low';
    reasoning?: string;
  };
  currentStage?: string;
  nextStage?: string;
}

export function CoachingCard({ prompt, currentStage, nextStage }: CoachingCardProps) {
  // LED breadcrumb for UI display
  breadcrumbService.light(4303, { 
    urgency: prompt.urgency,
    stage: currentStage 
  });
  
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'border-red-500 bg-red-900/20';
      case 'medium': return 'border-yellow-500 bg-yellow-900/20';
      case 'low': return 'border-blue-500 bg-blue-900/20';
      default: return 'border-gray-500 bg-gray-900/20';
    }
  };
  
  return (
    <div className={`border-l-4 p-4 rounded-lg ${getUrgencyColor(prompt.urgency)}`}>
      {/* Urgency Badge */}
      <div className="flex items-center justify-between mb-2">
        <span className={`
          px-2 py-1 rounded text-xs font-semibold
          ${prompt.urgency === 'high' ? 'bg-red-600 text-white' :
            prompt.urgency === 'medium' ? 'bg-yellow-600 text-white' :
            'bg-blue-600 text-white'}
        `}>
          {prompt.urgency.toUpperCase()} PRIORITY
        </span>
        
        {/* Stage Context */}
        {currentStage && (
          <span className="text-xs text-gray-400">
            {currentStage} → {nextStage || 'next'}
          </span>
        )}
      </div>
      
      {/* Main Suggestion */}
      <p className="text-white font-medium mb-2">
        💡 {prompt.suggestion}
      </p>
      
      {/* Reasoning */}
      {prompt.reasoning && (
        <p className="text-xs text-gray-400 italic">
          {prompt.reasoning}
        </p>
      )}
    </div>
  );
}
```

## File 7: Create Coaching System Data File

**Path**: `src/data/coaching-system.json`

This file will be generated by Claude when processing your sales document. For now, create a placeholder:

```json
{
  "stages": {
    "opening": {
      "name": "Opening & Rapport",
      "keywords": ["hello", "hi", "thanks", "appreciate", "time"],
      "goal": "Build rapport and set agenda",
      "exitCriteria": ["rapport established", "agenda confirmed"],
      "bridges": [
        {
          "text": "What brings you to explore our solution today?",
          "priority": "HIGH"
        }
      ],
      "recovery": ["How can I best help you today?"]
    }
  }
}
```

## Implementation Checklist for Claude

When implementing these changes:

1. ✅ **Create all new files** with exact paths specified
2. ✅ **Add LED breadcrumbs** at every critical point (use ranges 4100-4399)
3. ✅ **Include error handling** with descriptive error messages
4. ✅ **Add performance logging** for operations over 200ms
5. ✅ **Validate all data structures** before using them
6. ✅ **Test stage detection** with sample transcripts
7. ✅ **Verify UI updates** when stage changes
8. ✅ **Check Ollama integration** returns valid JSON

## Testing the Implementation

```typescript
// Test script to verify everything works
async function testStageImplementation() {
  // Load coaching data
  const coachingData = require('./src/data/coaching-system.json');
  
  // Initialize manager
  const manager = new CoachingManagerService(coachingData);
  
  // Test transcripts
  const testCases = [
    "Hello, thanks for taking my call today",  // Should detect 'opening'
    "We're struggling with our sales process", // Should detect 'discovery'
    "Can you show me how your solution works?", // Should detect 'presentation'
    "I'm concerned about the price", // Should detect 'objection'
    "Let's move forward with this" // Should detect 'closing'
  ];
  
  for (const transcript of testCases) {
    console.log(`\nTesting: "${transcript}"`);
    const result = await manager.processTranscript(transcript);
    console.log(`Stage: ${result.stage}`);
    console.log(`Suggestion: ${result.prompt.suggestion}`);
    console.log(`Response time: ${manager.getLastProcessTime()}ms`);
  }
}
```

## Performance Requirements

- **Stage Detection**: < 20ms
- **Bridge Loading**: < 5ms  
- **Ollama Response**: < 200ms
- **Total Response**: < 250ms
- **UI Update**: < 50ms

## Error Handling Requirements

Every error MUST:
1. Include descriptive message
2. Log with LED breadcrumb
3. Show what was expected vs received
4. Include relevant context
5. Fail loudly in development

Example:
```typescript
throw new Error(`STAGE DETECTION FAILED
Expected: Valid stage from [opening, discovery, presentation, objection, closing]
Received: ${detectedStage}
Transcript: ${transcript.substring(0, 100)}
Matched Keywords: ${matchedKeywords.join(', ')}`);
```

## Final Notes

- **Keep it simple** - No complex architectures, just service classes
- **Memory only** - No databases, everything in JavaScript objects
- **Fail loud** - No silent failures or fallbacks
- **LED everywhere** - Every operation needs breadcrumbs
- **Speed matters** - Log warnings for any operation over 200ms

This implementation gives you stage-based predictive coaching with minimal complexity and maximum speed!