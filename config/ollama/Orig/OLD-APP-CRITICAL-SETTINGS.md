# Critical Settings to Match Old VoiceCoach App

## 🚨 MOST IMPORTANT DISCOVERY
**Old App:** Max 25 words per suggestion, ONE prompt at a time
**New App Default:** Multiple verbose paragraphs

## Required Configuration Changes

### 1. Compression Settings (✅ Already Correct)
```json
{
  "maxTotalChars": 3800,    // Stay under Ollama's 4096 token limit
  "targetResponseWords": 25, // THIS IS CRITICAL - Old app's secret
  "maxTokenEstimate": 4096
}
```

### 2. Response Format (NEEDS UPDATE)
In `coaching-responses.md`, ALL responses must follow:
```json
{
  "urgency": "high",
  "suggestion": "Use tactical empathy",  // MAX 10 words
  "reasoning": "Builds trust fast",      // MAX 5 words  
  "next_action": "It sounds like price is a concern" // MAX 10 words
}
```

### 3. Prompt Template (CRITICAL)
The system prompt MUST include:
```
CRITICAL: Respond with ONLY these fields:
- urgency: (low/medium/high/critical)
- suggestion: (MAX 10 words)
- reasoning: (MAX 5 words)
- next_action: (What to say, MAX 10 words)

ONE suggestion only. No multiple options.
Total response must be under 25 words.
```

### 4. Never Split Techniques Priority
When Never Split content is detected, ALWAYS prioritize:
1. Tactical empathy
2. Mirroring
3. Labeling
4. Calibrated questions
5. "That's right" pursuit

### 5. Visual Presentation (Like Old App)
- **Critical (Red)**: Major objections, closing opportunities
- **High (Orange)**: Buying signals, price discussions
- **Medium (Yellow)**: Discovery, feature interest
- **Low (Green)**: Rapport building

## To Apply These Settings:

1. **Place your Never Split document** in the RAG folder:
   ```
   D:\Projects\Ai\VoiceCoach-v2\rag\never-split.txt
   ```

2. **Process the document**:
   ```bash
   npm run build
   node test-never-split-integration.js
   ```

3. **Settings are now configured** for 25-word responses
4. **Test with real scenarios** to verify brevity

## Verification Checklist:
- [ ] Prompts are 25 words or less
- [ ] ONE suggestion at a time (not 3-4)
- [ ] Chris Voss techniques prioritized
- [ ] Color-coded urgency levels
- [ ] Responses are actionable, not explanatory