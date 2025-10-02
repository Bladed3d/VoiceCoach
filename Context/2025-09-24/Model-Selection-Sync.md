# VoiceCoach V2 - Model Selection Synchronization

## Overview
VoiceCoach V2 has two model selection interfaces that are kept in perfect sync:

1. **SplitView Dropdown** - Quick model switching during coaching sessions
2. **Settings Modal** - Detailed model configuration in AI Settings tab

## Synchronization System

### How It Works
Both interfaces use the same localStorage settings structure and dispatch/listen for `modelChanged` events:

```javascript
// Settings structure in localStorage
{
  ollama: {
    model: "qwen2.5:14b-instruct-q4_k_m",
    baseUrl: "http://localhost:11434",
    // other settings...
  }
}
```

### Event-Driven Sync
When a user changes the model in either location:

1. **SplitView → Settings:**
   - Updates localStorage settings
   - Dispatches `modelChanged` event with `source: 'splitview'`
   - Settings modal listens and updates its UI

2. **Settings → SplitView:**
   - Updates localStorage settings
   - Dispatches `modelChanged` event with `source: 'settings'`
   - SplitView listens and updates its dropdown

### Performance Integration
Both model changes automatically trigger:
- Performance tracking via `ModelPerformanceTracker`
- LED breadcrumb logging (LEDs 7122, 7123, 7094, 7095)
- Ollama service configuration updates

## Usage

### For Users:
- Change model in either location - both stay synced
- Performance comparison data is collected automatically
- View detailed performance analysis in Settings → Model Performance

### For Developers:
```typescript
// Both components listen for this event
window.addEventListener('modelChanged', (event: CustomEvent) => {
  const { model, source } = event.detail;
  // Handle model change based on source
});

// Dispatch model changes like this
window.dispatchEvent(new CustomEvent('modelChanged', {
  detail: { model: newModel, source: 'splitview' }
}));
```

## LED Breadcrumb Tracking

| LED | Description | Component |
|-----|-------------|-----------|
| 7122 | SplitView model change initiated | SplitView |
| 7123 | Settings → SplitView sync | SplitView |
| 7094 | Settings modal model change | Settings |
| 7095 | SplitView → Settings sync | Settings |

## Benefits

1. **Consistent UX** - Model selection always matches across UI
2. **Performance Tracking** - Automatic comparison data collection
3. **Real-time Sync** - No page refresh needed
4. **Debug Visibility** - LED breadcrumbs track all sync events
5. **Persistent State** - Settings survive app restarts

## Testing Model Performance

1. Open Settings → Model Performance panel
2. Change models in SplitView dropdown or Settings
3. Make coaching requests to generate performance data
4. Compare timing, tokens/second, and efficiency metrics
5. Export data for detailed analysis

The system automatically tracks performance without needing external `--verbose` flags or manual timing.