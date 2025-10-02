# Ollama Prompt Generation Issue Analysis

## Problem Statement
The Ollama model is displaying instructions about what it should do rather than executing those instructions and generating the actual coaching prompts.

## Root Cause Analysis

### Primary Issue: Instructions Being Embedded in System Prompt
The core issue is that the instruction file (`OllamaAppDirection-02.md`) contains a meta-template that describes what Ollama should do, rather than being a direct prompt template that Ollama should follow. The instructions are being passed to Ollama as part of the prompt, causing it to respond with the instructions themselves rather than executing them.

### Specific Problems Identified:

1. **Instruction File Format Mismatch**
   - The file `OllamaAppDirection-02.md` contains high-level instructions about how to build prompts
   - It includes placeholders like `[stage]`, `[transcript_chunk]`, `[keyword_results]` that are never replaced with actual values
   - The JSON output format specification is being passed as literal text to Ollama

2. **Missing Variable Substitution**
   - In `OllamaInstructionLoader-Browser.ts`, the `buildPrompt()` method receives context but doesn't properly substitute the instruction placeholders
   - The template contains `[stage]`, `[transcript_chunk]`, etc., but these are never replaced with actual values from the context
   - The RAG document (13ToolsRAG-01.json) is not being properly integrated into the prompt

3. **Prompt Structure Issue**
   - The prompt being sent to Ollama includes meta-instructions like "**Instructions:**" and "**Output Format:**"
   - These are instruction-writing instructions, not actual Ollama prompts
   - The model interprets these as content to explain rather than instructions to follow

4. **Missing Tool Knowledge Integration**
   - The instruction file references embedding "the full 13 tools JSON" but this is never actually done
   - The tools from `13ToolsRAG-01.json` are not being properly formatted and injected into the prompt
   - The knowledge base is built in `ollama-service.ts` but not properly integrated with the instruction template

## Solution Requirements

1. **Convert Instruction File to Actual Prompt Template**
   - Remove meta-instructions and convert to a direct prompt that Ollama can execute
   - Include the actual tool definitions from the RAG document
   - Use clear, imperative language that tells Ollama what to do, not what it should be able to do

2. **Implement Proper Variable Substitution**
   - Replace all placeholders (`[stage]`, `[transcript_chunk]`, etc.) with actual values
   - Inject the processed RAG document tools directly into the prompt
   - Ensure the enhanced-debounce processor's sentiment analysis is properly integrated

3. **Fix Prompt Generation Flow**
   - The `buildPrompt()` method should generate executable prompts, not instruction descriptions
   - Remove instruction-level language like "**Instructions:**" from the final prompt
   - Format the prompt as a direct request to generate a coaching suggestion

4. **Example of Correct Prompt Structure**
   Instead of:
   ```
   **Instructions:**
   1. Analyze Sentiment...
   2. Select Tool...
   ```

   Should be:
   ```
   You are a sales coach. Based on the conversation below, provide immediate coaching using one of these tools:
   [Actual tool definitions here]

   Current conversation: [actual transcript]
   Stage: [actual stage]

   Generate a JSON response with your coaching suggestion.
   ```

## Impact
This issue prevents the entire coaching system from functioning as intended. Instead of providing real-time coaching suggestions, it's simply echoing back the instruction template, making the system appear to be providing generic, non-personalized guidance.

## Implementation Instructions for Claude

### Task Overview
Fix the Ollama prompt generation system so it generates actual coaching suggestions instead of displaying instructions about what it should do.

### Step-by-Step Implementation

#### Step 1: Create a New Direct Prompt Template
1. Create a new file: `ollama-prompts/direct-coaching-prompt.md`
2. Structure it as an executable prompt template, NOT meta-instructions
3. Use this format:
```markdown
You are a professional sales coach. Analyze the conversation and provide immediate, actionable coaching.

AVAILABLE COACHING TOOLS:
{{TOOLS_JSON}}

CURRENT CONVERSATION:
{{TRANSCRIPT}}

CONVERSATION CONTEXT:
- Sales Stage: {{STAGE}}
- Sentiment: {{SENTIMENT}}
- Key Topics: {{TOPICS}}
- Detected Objections: {{OBJECTIONS}}

Based on the prospect's last statement, select the most appropriate tool from the available tools and generate a coaching suggestion.

Return ONLY a JSON object in this exact format:
{
  "tool": "[selected tool name]",
  "say_this": "[exact words to say]",
  "why": "[brief explanation]",
  "confidence": "high|medium|low"
}
```

#### Step 2: Modify OllamaInstructionLoader-Browser.ts
1. Update the `buildPrompt()` method to perform actual variable substitution
2. Replace placeholder variables with actual values from context
3. Key changes needed:

```typescript
buildPrompt(context: {...}): string {
  // Load the tools from RAG document
  const tools = this.loadToolsFromRAG(); // You'll need to implement this

  // Start with the template
  let prompt = this.instructionTemplate;

  // Replace ALL placeholders with actual values
  prompt = prompt.replace('{{TOOLS_JSON}}', JSON.stringify(tools, null, 2));
  prompt = prompt.replace('{{TRANSCRIPT}}', context.transcript || '');
  prompt = prompt.replace('{{STAGE}}', context.salesStage || 'discovery');
  prompt = prompt.replace('{{SENTIMENT}}', context.sentiment || 'neutral');
  prompt = prompt.replace('{{TOPICS}}', context.topics?.join(', ') || 'none detected');
  prompt = prompt.replace('{{OBJECTIONS}}', context.objections?.join(', ') || 'none detected');

  return prompt;
}
```

#### Step 3: Update ollama-service.ts
1. Modify `buildCoachingPrompt()` to stop building knowledge base inline
2. Instead, pass the RAG document tools directly to the instruction loader
3. Ensure the prompt context includes actual values, not placeholders
4. Remove all the debug logging that shows "Building prompt with insights"
5. Key changes:

```typescript
private buildCoachingPrompt(context: CoachingContext): string {
  // Load tools from the RAG document
  const ragTools = this.loadRAGTools(); // Load from 13ToolsRAG-01.json

  // Build context with ACTUAL values
  const promptContext = {
    transcript: context.currentTranscript,
    tools: ragTools, // Pass the actual tools
    salesStage: this.detectSalesStage(context.currentTranscript),
    sentiment: this.analyzeSentiment(context), // Implement sentiment analysis
    objections: this.detectObjections(context.currentTranscript),
    topics: this.detectTopics(context.currentTranscript)
  };

  // Let the instruction loader build the final prompt
  return ollamaInstructionLoader.buildPrompt(promptContext);
}
```

#### Step 4: Load and Inject RAG Tools
1. Create a method to load the RAG document (`13ToolsRAG-01.json`)
2. Format it properly for injection into the prompt
3. Implementation:

```typescript
private loadRAGTools(): any[] {
  // Read from 13ToolsRAG-01.json
  // This should be loaded once at initialization, not every prompt
  const ragPath = 'rag/13ToolsRAG-01.json';
  const tools = // load the file using electronAPI
  return tools;
}
```

#### Step 5: Test and Validate
1. After implementing, test with a sample transcript
2. Check that the prompt sent to Ollama contains:
   - Actual tool definitions (not placeholders)
   - Real transcript text (not `[transcript_chunk]`)
   - Actual stage name (not `[stage]`)
3. Verify Ollama returns JSON coaching suggestions, not instruction text

### Critical Points to Remember
1. **NO META-INSTRUCTIONS**: The prompt must tell Ollama what to do, not describe what it should be able to do
2. **ACTUAL VALUES**: All placeholders must be replaced with real data
3. **DIRECT LANGUAGE**: Use imperative commands ("Analyze this", "Select a tool") not descriptive language ("You should analyze")
4. **JSON TOOLS**: The 13 tools from the RAG document must be embedded as actual JSON, not referenced
5. **TEST IMMEDIATELY**: After each change, test with real transcript to ensure proper generation

### Files to Modify
1. Create: `ollama-prompts/direct-coaching-prompt.md`
2. Modify: `src/services/coaching/OllamaInstructionLoader-Browser.ts`
3. Modify: `src/services/coaching/ollama-service.ts`
4. Potentially create: A tool loading utility for the RAG document

### Success Criteria
- Ollama returns actual coaching suggestions like "Too expensive?" instead of "Mirror: 'Too expensive?'"
- The response is a clean JSON object with tool, say_this, why, and confidence
- No instruction text appears in the coaching output
- The coaching is contextually relevant to the actual conversation

