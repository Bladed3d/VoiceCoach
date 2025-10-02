# Visual Stage Timeline Implementation Guide for VoiceCoach V2

## Priority: HIGH - Implement after speaker separation

## Problem Statement
Users cannot see their progression through the sales conversation. The stage indicator shows "Session Complete" instead of real-time updates. Users need visual guidance on when to advance, when to dig deeper, and when to circle back.

## Solution Overview
Create an interactive horizontal timeline showing:
- Current position in sales process
- Progress through each stage
- Transition zones between stages
- Smart coaching indicators for advancement/regression

## Visual Design Mockup

### Standard View:
```
┌─────────────────────────────────────────────────────────────────┐
│ [Opening] ════●════ [Discovery] ────◐──── [Presentation] ────○──── │
│     ✓         ↑         70%           ↑           0%         0%    │
│         You are here          Transitioning                        │
└─────────────────────────────────────────────────────────────────┘
```

### With Coaching Alerts:
```
┌─────────────────────────────────────────────────────────────────┐
│ [Opening] ════●════ [Discovery] ────◐──── [Presentation]         │
│                ↑                     ↑                            │
│         Current: 4:32         Ready to advance                    │
│                              "2 of 3 criteria met"                │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Core Timeline Component
**File**: `src/components/coaching/SalesStageTimeline.tsx`

```typescript
interface StageTimelineProps {
  currentStage: SalesStage;
  stageProgress: StageProgress[];
  sessionDuration: number;
  transitionHints: TransitionHint[];
}

interface StageProgress {
  stage: SalesStage;
  percentComplete: number;
  timeSpent: number;
  criteriaMetCount: number;
  totalCriteria: number;
  status: 'completed' | 'active' | 'transitioning' | 'pending';
}

interface TransitionHint {
  type: 'advance' | 'dig_deeper' | 'circle_back';
  message: string;
  urgency: 'low' | 'medium' | 'high';
  targetStage?: SalesStage;
}

const SalesStageTimeline: React.FC<StageTimelineProps> = ({
  currentStage,
  stageProgress,
  sessionDuration,
  transitionHints
}) => {
  return (
    <div className="stage-timeline-container">
      <div className="timeline-track">
        {stageProgress.map((stage, index) => (
          <StageSegment
            key={stage.stage}
            stage={stage}
            isActive={stage.stage === currentStage}
            showTransition={stage.status === 'transitioning'}
          />
        ))}
      </div>
      <TransitionIndicators hints={transitionHints} />
      <ProgressMetrics progress={stageProgress} />
    </div>
  );
};
```

### 2. Stage Progress Tracker Service
**File**: `src/services/coaching/StageProgressTracker.ts`

```typescript
export class StageProgressTracker {
  private currentStage: SalesStage = 'opening';
  private stageStartTimes: Map<SalesStage, number> = new Map();
  private stageCriteriaMet: Map<SalesStage, Set<string>> = new Map();
  private transitionZones: Map<string, TransitionZone> = new Map();
  
  // Stage progression configuration from JSON documents
  private stageConfig = {
    opening: {
      typicalDuration: 180, // 3 minutes
      minDuration: 60,
      maxDuration: 300,
      exitCriteria: [
        'rapport_established',
        'trust_indicators_present',
        'initial_engagement_confirmed'
      ],
      keywords: ['understand', 'appreciate', 'help', 'goal']
    },
    discovery: {
      typicalDuration: 480, // 8 minutes
      minDuration: 300,
      maxDuration: 900,
      exitCriteria: [
        'pain_points_identified',
        'budget_discussed',
        'decision_criteria_understood',
        'timeline_established'
      ],
      keywords: ['challenge', 'problem', 'frustrating', 'difficult']
    },
    // ... other stages
  };

  updateProgress(transcript: TranscriptionEntry[]): StageProgress[] {
    const progress: StageProgress[] = [];
    
    for (const [stage, config] of Object.entries(this.stageConfig)) {
      const timeSpent = this.getTimeInStage(stage as SalesStage);
      const criteriaMet = this.evaluateCriteria(stage as SalesStage, transcript);
      const percentComplete = this.calculateCompletion(timeSpent, criteriaMet, config);
      
      progress.push({
        stage: stage as SalesStage,
        percentComplete,
        timeSpent,
        criteriaMetCount: criteriaMet.size,
        totalCriteria: config.exitCriteria.length,
        status: this.determineStatus(stage as SalesStage, percentComplete)
      });
    }
    
    return progress;
  }

  private calculateCompletion(
    timeSpent: number,
    criteriaMet: Set<string>,
    config: any
  ): number {
    const timeProgress = Math.min(timeSpent / config.typicalDuration, 1) * 50;
    const criteriaProgress = (criteriaMet.size / config.exitCriteria.length) * 50;
    return Math.round(timeProgress + criteriaProgress);
  }

  detectTransitionOpportunity(
    currentStage: SalesStage,
    transcript: TranscriptionEntry[]
  ): TransitionHint[] {
    const hints: TransitionHint[] = [];
    const progress = this.updateProgress(transcript);
    const current = progress.find(p => p.stage === currentStage);
    
    if (!current) return hints;

    // Check if ready to advance
    if (current.percentComplete >= 80) {
      hints.push({
        type: 'advance',
        message: `Ready to move to ${this.getNextStage(currentStage)}`,
        urgency: 'medium',
        targetStage: this.getNextStage(currentStage)
      });
    }

    // Check if should dig deeper
    if (current.timeSpent > 60 && current.criteriaMetCount < 2) {
      hints.push({
        type: 'dig_deeper',
        message: 'Ask more discovery questions',
        urgency: 'high'
      });
    }

    // Check for regression needs
    if (this.detectConfusion(transcript)) {
      hints.push({
        type: 'circle_back',
        message: 'Customer seems confused - clarify previous points',
        urgency: 'high',
        targetStage: this.getPreviousStage(currentStage)
      });
    }

    return hints;
  }

  private detectConfusion(transcript: TranscriptionEntry[]): boolean {
    const confusionIndicators = [
      'I don\'t understand',
      'what do you mean',
      'can you explain',
      'I\'m confused',
      'not sure I follow'
    ];
    
    const recentCustomerStatements = transcript
      .filter(e => e.speaker === 'customer')
      .slice(-5)
      .map(e => e.text.toLowerCase());
    
    return confusionIndicators.some(indicator =>
      recentCustomerStatements.some(statement =>
        statement.includes(indicator.toLowerCase())
      )
    );
  }
}
```

### 3. Visual Timeline Styles
**File**: `src/styles/stage-timeline.css`

```css
.stage-timeline-container {
  position: relative;
  width: 100%;
  padding: 20px;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.timeline-track {
  display: flex;
  align-items: center;
  position: relative;
  height: 60px;
}

.stage-segment {
  flex: 1;
  position: relative;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.stage-segment.active {
  height: 12px;
  background: linear-gradient(90deg, #4ade80 0%, #22c55e 100%);
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.5);
}

.stage-segment.transitioning {
  background: linear-gradient(90deg, #22c55e 0%, #fbbf24 50%, transparent 100%);
  animation: pulse 2s infinite;
}

.stage-segment.completed {
  background: #4ade80;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.stage-marker {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.transition-indicator {
  position: absolute;
  bottom: -30px;
  padding: 6px 10px;
  background: #fbbf24;
  color: #000;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.progress-percentage {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  font-weight: bold;
  color: white;
}

/* Coaching hint bubbles */
.coaching-hint {
  position: absolute;
  top: -60px;
  padding: 8px 12px;
  background: white;
  color: #1e3c72;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  font-size: 12px;
  z-index: 10;
}

.coaching-hint::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 12px;
  background: white;
  transform: rotate(45deg);
}

.coaching-hint.urgent {
  background: #ef4444;
  color: white;
  animation: urgentPulse 1s infinite;
}

@keyframes urgentPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

### 4. Integration with Session Manager
**File**: `src/services/coaching/SessionManagerService.ts` (updates)

```typescript
// Add to SessionManagerService
private stageProgressTracker: StageProgressTracker;

constructor() {
  // ... existing code
  this.stageProgressTracker = new StageProgressTracker();
}

// Update the progress tracking
private updateStageProgress(transcript: TranscriptionEntry[]): void {
  const progress = this.stageProgressTracker.updateProgress(transcript);
  const hints = this.stageProgressTracker.detectTransitionOpportunity(
    this.currentStage,
    transcript
  );
  
  // Emit progress update event
  this.emit('stageProgressUpdate', {
    progress,
    hints,
    currentStage: this.currentStage
  });
  
  // Auto-advance stage if criteria met
  if (this.shouldAutoAdvance(progress, this.currentStage)) {
    this.transitionToNextStage();
  }
}

private shouldAutoAdvance(
  progress: StageProgress[],
  currentStage: SalesStage
): boolean {
  const current = progress.find(p => p.stage === currentStage);
  return current?.percentComplete >= 90 && 
         current?.criteriaMetCount >= current?.totalCriteria * 0.75;
}
```

### 5. React Hook for Timeline Data
**File**: `src/hooks/useStageProgress.ts`

```typescript
export function useStageProgress() {
  const [progress, setProgress] = useState<StageProgress[]>([]);
  const [hints, setHints] = useState<TransitionHint[]>([]);
  const [currentStage, setCurrentStage] = useState<SalesStage>('opening');
  
  useEffect(() => {
    const handleProgressUpdate = (event: CustomEvent) => {
      const { progress, hints, currentStage } = event.detail;
      setProgress(progress);
      setHints(hints);
      setCurrentStage(currentStage);
    };
    
    window.addEventListener('stageProgressUpdate', handleProgressUpdate);
    
    return () => {
      window.removeEventListener('stageProgressUpdate', handleProgressUpdate);
    };
  }, []);
  
  return {
    progress,
    hints,
    currentStage,
    isTransitioning: hints.some(h => h.type === 'advance'),
    needsAttention: hints.some(h => h.urgency === 'high')
  };
}
```

## Implementation Steps

### Phase 1: Fix Current Stage Detection (2 hours)
1. ✅ Debug why stage shows "Session Complete"
2. ✅ Ensure real-time stage updates work
3. ✅ Verify stage detection logic with transcripts
4. ✅ Add LED breadcrumbs for stage transitions

### Phase 2: Build Progress Tracker (3 hours)
1. ✅ Create StageProgressTracker service
2. ✅ Implement criteria evaluation logic
3. ✅ Add time-based progress calculation
4. ✅ Create transition detection algorithms

### Phase 3: Create Timeline Component (4 hours)
1. ✅ Build SalesStageTimeline React component
2. ✅ Implement progress bar visualization
3. ✅ Add transition zone indicators
4. ✅ Create coaching hint bubbles
5. ✅ Style with animations and gradients

### Phase 4: Integration (2 hours)
1. ✅ Connect to SessionManagerService
2. ✅ Create useStageProgress hook
3. ✅ Update UI to show timeline
4. ✅ Test with real conversations

### Phase 5: Smart Coaching Logic (3 hours)
1. ✅ Implement confusion detection
2. ✅ Add regression suggestions
3. ✅ Create advancement prompts
4. ✅ Build stall recovery hints

## Configuration from RAG Documents

The timeline should pull stage configurations from loaded JSON documents:

```typescript
// From loaded document (e.g., Hormozi or Voss JSON)
const stageConfig = {
  opening: {
    duration: "2-5 minutes",
    exitCriteria: ["rapport established", "trust built"],
    bridges: [...],
    keywords: [...]
  },
  // ... other stages
};
```

## Visual States and Behaviors

### 1. Normal Progression
- Smooth fill animation as user progresses
- Percentage displayed within active segment
- Time counter showing duration in stage

### 2. Transition Zone (80-90% complete)
- Pulsing yellow gradient
- "Ready to advance" message
- Suggested bridge to next stage

### 3. Stalled Conversation
- Red highlight after 30s without progress
- Recovery prompt suggestion
- "Try asking: [specific question]"

### 4. Regression Needed
- Orange arrow pointing backward
- "Circle back" indicator
- Specific clarification suggestion

## Testing Scenarios

### Scenario 1: Natural Progression
```
Timeline shows: Opening (100%) → Discovery (45%)
Behavior: Smooth transition, no alerts
```

### Scenario 2: Quick Advancement
```
Customer says: "Just tell me the price"
Timeline: Flash forward to Presentation
Alert: "Customer wants to skip discovery - proceed carefully"
```

### Scenario 3: Confusion Detection
```
Customer says: "I don't understand what you mean"
Timeline: Highlights previous stage
Alert: "Clarification needed - review [specific topic]"
```

## Success Metrics
- ✅ Stage progression visible in real-time
- ✅ Transition hints appear at 80% completion
- ✅ Regression detection within 5 seconds
- ✅ Visual feedback smooth and responsive
- ✅ Coaching hints contextually relevant

## Dependencies
- **REQUIRES**: Speaker separation implementation (see `speaker-separation-implementation.md`)
- **REQUIRES**: Fixed stage detection in SessionManagerService
- **USES**: Stage configuration from loaded JSON documents

## Notes for Next Session
- This feature dramatically improves user navigation through sales conversations
- Visual feedback helps users understand when to push forward vs dig deeper
- Must integrate with speaker-separated transcripts for accuracy
- Consider adding haptic feedback for desktop app (system notifications)

## Related Files to Update
1. `src/components/coaching/CoachingPanel.tsx` - Add timeline component
2. `src/services/coaching/SessionManagerService.ts` - Progress tracking
3. `src/services/coaching/SalesStageDetector.ts` - Fix detection logic
4. `src/types/coaching.ts` - Add progress interfaces
5. `src/hooks/useStageProgress.ts` - New hook for timeline data

## UI Placement
The timeline should appear:
- Above the AI Coaching Assistant panel
- Below the main stats bar
- Always visible during active sessions
- 100% width of coaching panel
- Height: ~100px including hints

## Future Enhancements
- Click on stage to see requirements
- Drag to manually adjust stage
- Historical progression replay
- Success rate per stage analytics
- Custom stage configurations per industry