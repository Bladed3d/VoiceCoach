# VoiceCoach V2 - Document Processing Instructions

## How to Process Sales Documents for Stage-Based Coaching

### Method 1: Using the Sub-Agent (RECOMMENDED)

```bash
# Tell Claude to use the Stage Coaching Processor agent:
"Use the Stage Coaching Processor agent to process the document at [path]"

# Or explicitly:
"@agent stage-coaching-processor - process the sales document at docs/sales-playbook.pdf"
```

The agent will return a JavaScript object ready to save as `coaching-system.json`.

### Method 2: Direct Instructions

If you need to process without the agent, use the instructions at:
- `D:\Projects\Ai\VoiceCoach-v2\rag\Claude-Rag.md`

Tell Claude explicitly:
```
"Follow the instructions EXACTLY in D:\Projects\Ai\VoiceCoach-v2\rag\Claude-Rag.md to process [document]"
```

### What You Get

Both methods produce the same JavaScript object:

```javascript
const coachingSystem = {
  stages: {
    opening: { /* bridges, keywords, etc */ },
    discovery: { /* bridges, keywords, etc */ },
    presentation: { /* bridges, keywords, etc */ },
    objection: { /* bridges, keywords, etc */ },
    closing: { /* bridges, keywords, etc */ }
  },
  progressions: { /* stage transition rules */ },
  universal: { /* recovery prompts */ },
  metadata: { /* document info */ }
}
```

### How to Save and Use

1. **Save the output** as `data/coaching-system.json`
2. **Remove** the `const coachingSystem =` part (just keep the object)
3. **Load in app** - The OllamaCoachingService will automatically detect and use stages

### Testing After Processing

```bash
# Test with the provided script
node test-stage-management.js
```

## Important Notes

- **Stage Coaching Processor agent** - Returns JavaScript object for stages
- **RAG Document Analyst2 agent** - Returns JSON analysis (different format!)
- **Don't mix them up** - They serve different purposes

## File Locations

- **Agent Definition**: `.claude/agents/stage-coaching-processor.md`
- **Direct Instructions**: `rag/Claude-Rag.md`
- **Sample Output**: `data/sample-coaching-system.json`
- **Test Script**: `test-stage-management.js`

## Troubleshooting

If Claude uses the wrong processor:
1. Be explicit: "Use the Stage Coaching Processor agent"
2. Or specify the file: "Follow rag/Claude-Rag.md exactly"
3. Check the output format - should be JavaScript object, not JSON analysis