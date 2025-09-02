# Implementation Guide: Enhanced Ollama Coaching System

## Quick Integration Steps

### Step 1: Update SessionManagerService.ts

Replace the current Ollama integration with the enhanced version:

```typescript
// In src/services/coaching/SessionManagerService.ts

// Import the enhanced service instead of the basic one
import { enhancedOllamaService, EnhancedCoachingContext } from './ollama-service-enhanced';

// In your class, track call start time
private callStartTime: Date | null = null;

// In startSession() method, record start time:
async startSession(): Promise<boolean> {
  this.callStartTime = new Date();
  // ... rest of your code
}

// Replace the processTranscriptionWithOllama method:
private async processTranscriptionWithOllama(transcriptionText: string): Promise<void> {
  try {
    // Build enhanced context with all available information
    const enhancedContext: EnhancedCoachingContext = {
      currentTranscript: transcriptionText,
      conversationHistory: this.conversationHistory || [],
      callStartTime: this.callStartTime,
      processedInsights: this.ragDocument || this.chromaResults,
      // These will be auto-detected if not provided
      currentSalesStage: undefined, // Let system detect
      detectedObjections: undefined, // Let system detect
      detectedTopics: undefined, // Let system detect
    };
    
    // Get coaching with full context
    const coachingResponse = await enhancedOllamaService.getCoachingSuggestion(enhancedContext);
    
    if (coachingResponse) {
      // Use the comprehensive response
      this.broadcastCoachingSuggestion({
        suggestion: coachingResponse.primary_suggestion,
        priority: coachingResponse.urgency_level.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW',
        category: coachingResponse.prompt_type as any,
        trigger: coachingResponse.exact_phrase,
        context: coachingResponse.supporting_evidence.join('. '),
        confidence: coachingResponse.confidence_score,
        // New fields available
        nextActions: coachingResponse.next_best_actions,
        fallback: coachingResponse.fallback_phrase,
        avoid: coachingResponse.avoid_saying
      });
    }
  } catch (error) {
    console.error('Enhanced Ollama processing failed:', error);
  }
}
```

### Step 2: Update the WebSocket Message Structure

Enhance the coaching message to include new fields:

```typescript
// In broadcastCoachingSuggestion method
private broadcastCoachingSuggestion(response: any): void {
  const message = {
    type: 'coaching_suggestion',
    suggestion: response.suggestion,
    priority: response.priority,
    category: response.category,
    trigger: response.trigger,
    context: response.context,
    confidence: response.confidence,
    // New comprehensive fields
    nextActions: response.nextActions || [],
    fallbackOption: response.fallback || '',
    avoidSaying: response.avoid || '',
    timestamp: new Date().toISOString()
  };
  
  this.websocketService?.send(message);
}
```

### Step 3: Update UI Components to Display Rich Coaching

In your React components that display coaching:

```typescript
// In src/components/coaching/CoachingPanel.tsx

interface CoachingSuggestion {
  suggestion: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  confidence: number;
  nextActions?: string[];
  fallbackOption?: string;
  avoidSaying?: string;
}

// Display the enhanced information
const CoachingDisplay: React.FC<{suggestion: CoachingSuggestion}> = ({ suggestion }) => {
  return (
    <div className="coaching-card">
      {/* Primary suggestion with urgency coloring */}
      <div className={`primary-suggestion urgency-${suggestion.priority.toLowerCase()}`}>
        <h3>Do This Now:</h3>
        <p>{suggestion.suggestion}</p>
        <span className="confidence">Confidence: {(suggestion.confidence * 100).toFixed(0)}%</span>
      </div>
      
      {/* Next actions */}
      {suggestion.nextActions && suggestion.nextActions.length > 0 && (
        <div className="next-actions">
          <h4>Then:</h4>
          <ol>
            {suggestion.nextActions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ol>
        </div>
      )}
      
      {/* Fallback option */}
      {suggestion.fallbackOption && (
        <div className="fallback">
          <h4>If that doesn't work:</h4>
          <p>{suggestion.fallbackOption}</p>
        </div>
      )}
      
      {/* What to avoid */}
      {suggestion.avoidSaying && (
        <div className="warning">
          <h4>⚠️ Avoid saying:</h4>
          <p>{suggestion.avoidSaying}</p>
        </div>
      )}
    </div>
  );
};
```

### Step 4: Add Sales Stage Detection Display

Show the detected sales stage in your UI:

```typescript
// Add to your coaching panel
const [salesStage, setSalesStage] = useState<string>('discovery');

// Listen for stage updates
useEffect(() => {
  websocket.on('sales_stage_update', (data) => {
    setSalesStage(data.stage);
  });
}, []);

// Display it
<div className="sales-stage-indicator">
  <span>Current Stage: </span>
  <strong className={`stage-${salesStage}`}>{salesStage.toUpperCase()}</strong>
</div>
```

### Step 5: Configure Ollama Connection

Update your Ollama configuration:

```typescript
// In main.cjs or your config file
const ollamaConfig = {
  baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'llama2', // or 'mixtral', 'codellama'
  temperature: 0.7, // Creativity level
  topP: 0.9, // Diversity of responses
  maxTokens: 500 // Response length limit
};
```

## Testing the Implementation

### 1. Test Price Objection Handling
```javascript
// Simulate transcript
const testTranscript = "This looks good but $5000 per month seems really expensive for our budget right now.";

// Expected enhanced response:
{
  primary_suggestion: "Say: 'I understand price is important. If we could show this pays for itself in 90 days through efficiency gains, would that change your perspective?'",
  urgency_level: "high",
  supporting_evidence: [
    "Price objection detected - critical moment",
    "Use value isolation technique from Never Split the Difference"
  ],
  next_best_actions: [
    "Calculate specific ROI based on their use case",
    "Offer flexible payment terms",
    "Share case study of similar company's ROI"
  ],
  exact_phrase: "If we could show this pays for itself in 90 days, would that change your perspective?",
  fallback_phrase: "What budget range would work better for you?",
  avoid_saying: "Don't immediately offer a discount"
}
```

### 2. Test Buying Signal Detection
```javascript
const testTranscript = "This could really help our team. How quickly could we get started?";

// Expected response:
{
  primary_suggestion: "Move to close: 'Great! We can have you up and running by next Monday. Should we schedule the onboarding for Tuesday or Wednesday?'",
  urgency_level: "critical",
  prompt_type: "closing",
  supporting_evidence: [
    "Strong buying signal detected",
    "Prospect asking about timeline indicates high interest"
  ]
}
```

### 3. Test Sales Stage Progression
```javascript
// Early call (2 minutes)
context.callDuration = 2;
// Expected: Low urgency, focus on discovery

// Mid call (15 minutes)  
context.callDuration = 15;
// Expected: Medium urgency, move toward demo/value

// Long call (30+ minutes)
context.callDuration = 30;
// Expected: High urgency, push for close or next steps
```

## Monitoring & Optimization

### Track Coaching Effectiveness
```typescript
// Add to your analytics
const trackCoachingMetrics = {
  suggestionAccepted: boolean, // Did salesperson use it?
  suggestionEffective: boolean, // Did it advance the sale?
  confidenceAccuracy: number, // Was confidence score accurate?
  stageDetectionAccuracy: boolean, // Was stage correctly identified?
};
```

### Performance Monitoring
```typescript
// Log response times
console.log('Ollama response time:', responseTime);
// Target: < 2 seconds

// Track context richness
console.log('Context variables provided:', {
  hasStage: !!context.salesStage,
  hasDuration: !!context.callDuration,
  hasObjections: context.objections.length > 0,
  hasBuyingSignals: context.buyingSignals.length > 0
});
```

## Troubleshooting

### Issue: Ollama not responding
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve

# Pull required model
ollama pull llama2
```

### Issue: Slow responses
- Reduce maxTokens in config
- Use smaller model (codellama instead of llama2)
- Ensure Ollama has GPU access

### Issue: Generic suggestions
- Check that context is being passed correctly
- Verify knowledge base is loaded
- Ensure sales stage detection is working

## Benefits You'll See

1. **Contextual Coaching** - Suggestions match the exact sales situation
2. **Urgency Awareness** - Critical moments get critical responses
3. **Multiple Options** - Primary suggestion + fallbacks + next actions
4. **Evidence-Based** - Every suggestion includes WHY it matters
5. **Stage-Appropriate** - Discovery gets different coaching than closing
6. **Emotional Intelligence** - Detects and responds to sentiment

## Next Steps

1. ✅ Implement the enhanced service
2. ✅ Update UI to show rich coaching
3. ✅ Test with real sales conversations
4. ✅ Monitor effectiveness metrics
5. ✅ Iterate based on results

This implementation brings your V2 app up to the same coaching quality that made the old VoiceCoach so effective!