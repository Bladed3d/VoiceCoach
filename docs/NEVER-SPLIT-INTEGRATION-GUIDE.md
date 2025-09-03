# Never Split the Difference Integration Guide

## Quick Start

To integrate your Never Split the Difference document and get the same great coaching prompts as the old app:

### 1. Prepare Your Document

Place your Never Split the Difference document in the RAG folder:
```
D:\Projects\Ai\VoiceCoach-v2\rag\never-split.txt
```

Supported formats:
- `.txt` - Plain text (recommended)
- `.md` - Markdown
- `.pdf` - PDF (requires additional parsing)

### 2. Update Configuration

The system is already configured to recognize Chris Voss techniques. Key techniques it looks for:
- Tactical empathy
- Mirroring
- Labeling
- Calibrated questions
- Accusation audit
- "That's right" moments
- Late night FM DJ voice
- Rule of three

### 3. Load the Document

```typescript
import { knowledgeIntegration } from './services/coaching/KnowledgeIntegration';

// Initialize with your document
await knowledgeIntegration.initializeWithNeverSplit(
  'path/to/never-split-the-difference.txt'
);

// Check what was loaded
const stats = knowledgeIntegration.getKnowledgeStats();
console.log(`Loaded ${stats.totalChunks} knowledge chunks`);
console.log(`Found techniques: ${stats.techniques.join(', ')}`);
```

### 4. Use in Real-Time Coaching

```typescript
// When you get a transcript from the conversation
const transcriptText = "The price is too high for our budget";

// Get coaching suggestion with Never Split knowledge
const coaching = await knowledgeIntegration.getCoachingSuggestion(
  transcriptText,
  conversationHistory // optional
);

// Display the coaching
console.log(coaching.suggestion);
// Output: {
//   urgency: "high",
//   suggestion: "Use tactical empathy to acknowledge concern",
//   reasoning: "Builds trust before addressing price",
//   next_action: "It sounds like price is a real concern"
// }
```

## How It Works

### Document Processing Pipeline

1. **Reading**: Document is read and cleaned
2. **Sectioning**: Split into logical sections by headers/topics
3. **Chunking**: Create 512-token chunks with 50-token overlap
4. **Classification**: Each chunk is classified:
   - Type: technique, principle, example, framework
   - Keywords: Chris Voss techniques detected
   - Sales stage: discovery, demo, objection, closing
   - Methodology: Automatically tagged as "Chris Voss"

### Knowledge Retrieval

When coaching is needed:
1. **Query Analysis**: Current transcript is analyzed
2. **Chunk Scoring**: All chunks scored by relevance
3. **Selection**: Top 3 most relevant chunks selected
4. **Compression**: Knowledge compressed to fit prompt limits

### Prompt Building

The system follows the old app's successful strategy:
1. **Total limit**: 3,800 characters (stays under Ollama's 4,096 tokens)
2. **Knowledge allocation**: 800 characters max
3. **Chris Voss priority**: Techniques get scoring boost
4. **Stage awareness**: Knowledge filtered by detected sales stage

## Configuration Adjustments

### To Prioritize Specific Techniques

Edit `config/ollama/stage-detection.json`:
```json
{
  "stages": {
    "objection_handling": {
      "keywords": [
        "tactical empathy",  // Add Chris Voss keywords
        "labeling",
        "calibrated questions"
      ]
    }
  }
}
```

### To Adjust Knowledge Compression

Edit `config/ollama/compression-settings.json`:
```json
{
  "components": {
    "knowledgeBase": {
      "maxChars": 800,  // Increase if needed
      "prioritizeByStage": true,
      "boostMethodology": "Chris Voss"  // Add this
    }
  }
}
```

### To Customize Responses

Edit `config/ollama/coaching-responses.md` to add Chris Voss specific templates:
```json
{
  "urgency": "high",
  "suggestion": "Apply tactical empathy",
  "reasoning": "Chris Voss technique for objections",
  "next_action": "It seems like you have concerns about..."
}
```

## Testing Your Integration

Run the test script:
```bash
# Update the path in test-never-split-integration.js
node test-never-split-integration.js
```

This will:
1. Load your Never Split document
2. Process it into chunks
3. Test various sales scenarios
4. Show you the compressed prompts
5. Display coaching suggestions

## Expected Results

With Never Split properly integrated, you should see:

### For Price Objections:
- Tactical empathy suggestions
- Calibrated questions like "How am I supposed to do that?"
- Labeling techniques

### For Authority Challenges:
- Calibrated questions to uncover real decision maker
- Techniques to get them to advocate for you

### For Trust Building:
- Mirroring techniques
- Getting to "That's right" moments
- Late night FM DJ voice suggestions

## Troubleshooting

### Document Not Loading
- Check file path is correct
- Ensure file is readable
- Try .txt format if other formats fail

### Techniques Not Found
- Check document contains Chris Voss terminology
- Verify text isn't corrupted or encoded incorrectly
- Look at console logs for what was extracted

### Prompts Too Long
- Adjust compression settings
- Reduce number of knowledge chunks (default is 3)
- Check `compression-settings.json` limits

### Coaching Not Relevant
- Verify stage detection is working
- Check keyword matching in chunks
- Ensure Chris Voss content is properly formatted

## Files Involved

```
src/services/
├── knowledge/
│   └── DocumentProcessor.ts      # Processes Never Split document
├── coaching/
│   ├── KnowledgeIntegration.ts  # Connects knowledge to coaching
│   ├── ConfigurablePromptBuilder.ts  # Builds compressed prompts
│   └── ConfigurationLoader.ts   # Loads all configs

config/
├── ollama/
│   ├── compression-settings.json  # Controls prompt size
│   ├── stage-detection.json      # Sales stage keywords
│   └── core-principles.json      # Can add Chris Voss principles

test-never-split-integration.js   # Test your integration
```

## Next Steps

1. **Load your document**: Update the path and run the test
2. **Verify chunks**: Check that Chris Voss techniques were found
3. **Test scenarios**: Run different objection types
4. **Fine-tune**: Adjust configs based on results
5. **Integrate with UI**: Connect to your coaching interface

The system is designed to replicate the old app's success while being fully configurable through external files.