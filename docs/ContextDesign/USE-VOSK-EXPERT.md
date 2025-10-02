# How to Use the Vosk Accuracy Expert

## Quick Start

1. **Invoke the agent:**
   ```
   @agent vosk-accuracy-expert "My transcription accuracy is shit"
   ```

2. **It will:**
   - Check your audio format (90% of problems)
   - Give you 1-3 lines to fix it
   - Tell you how to test it
   - Done

## Common Questions to Ask

### "Accuracy is terrible with microphone"
```javascript
// Agent will likely say:
// Check: Is your audio 16kHz, 16-bit, mono?
rec.setWords(true);  // Enable word confidence
rec.setPartialWords(true);  // Real-time feedback
```

### "Works in Python but not JavaScript"
```javascript
// Agent knows the Windows mic.js bug:
// Edit node_modules/mic/lib/mic.js line 50
// Change: '-p' 
// To: '-t', 'raw', '-'
```

### "How do I add business vocabulary?"
```javascript
// Simple domain words:
rec.setWords(['sales', 'customer', 'pricing', 'objection', 'close']);
```

## What NOT to Ask

❌ "Design a comprehensive accuracy optimization system"
❌ "Create an architecture for voice processing"
❌ "Build a complex audio pipeline"

## What TO Ask

✅ "Fix Vosk accuracy"
✅ "Why is transcription wrong?"
✅ "SetWords not working"
✅ "Windows mic broken"

## The Agent's Superpower

It knows:
- The Windows mic.js bug and exact fix
- Audio format is 90% of problems
- SetWords/SetPartialWords usage
- Model size trade-offs
- Common fixes that actually work

## Test Your Fix

After any fix:
```javascript
// Quick accuracy test
addBreadcrumb(5001, 'Testing Vosk fix', { 
  before: 'accuracy_before',
  after: 'accuracy_after' 
});

// Say: "Testing one two three sales customer pricing"
// Check: Did accuracy improve?
```

## Remember

This agent is a **bicycle mechanic**, not a jet engine designer:
- Quick fixes that work
- No complex systems
- 20 lines max per solution
- Always includes test method