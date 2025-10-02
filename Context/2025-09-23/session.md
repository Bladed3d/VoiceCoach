# VoiceCoach V2 JSON Format Analysis - September 23, 2025

## JSON Format Discrepancy Analysis

### Current Document Structure (NeverSplitSummary_2025-09-08_14-25-30.json)
**NEW STAGE-BASED FORMAT:**
```json
{
  "stages": {
    "opening": { "bridges": [{"text": "...", "priority": "CRITICAL"}] },
    "discovery": { "bridges": [{"text": "...", "priority": "HIGH"}] },
    "presentation": { "bridges": [{"text": "...", "priority": "CRITICAL"}] },
    "objection": { "bridges": [{"text": "...", "priority": "CRITICAL"}] },
    "closing": { "bridges": [{"text": "...", "priority": "CRITICAL"}] }
  },
  "progressions": { "opening->discovery": {...} },
  "customerTypes": {...},
  "frameworks": {...},
  "universal": {...}
}
```

### Code Expectations (Legacy Format)
**OLD PREDICTIVE FORMAT:**
```json
{
  "predictive_techniques": [
    {
      "technique_name": "...",
      "conversation_paths": [
        {
          "trigger": "...",
          "immediate_response": { "exact_words": "..." },
          "predicted_path": { "likely_prospect_response": "..." }
        }
      ]
    }
  ]
}
```

## Key Differences

### 1. **Structure Change**
- **OLD:** `predictive_techniques` array with `conversation_paths`
- **NEW:** `stages` object with stage-specific `bridges` arrays

### 2. **Field Mapping Issues**
- **OLD:** `technique.conversation_paths[].trigger`
- **NEW:** `stages.{stage}.keywords[]` (different location/format)

- **OLD:** `path.immediate_response.exact_words`
- **NEW:** `bridges[].text` (different field name)

- **OLD:** `path.predicted_path.next_move.exact_words`
- **NEW:** No direct equivalent (missing predictive chains)

### 3. **Code Adaptation Status**
✅ **IntelligentPromptBuilder** - UPDATED to handle both formats
- `indexDocument()` detects format via `ragDocument.stages`
- `indexStageBasedDocument()` processes new format
- Backward compatibility maintained

✅ **OllamaService** - PARTIALLY ADAPTED
- Still expects legacy `techniques` or `predictive_techniques`
- Falls back to checking for `documentContent` wrapper
- Handles both field names: `techniques` and `predictive_techniques`

❌ **Expected JSON Response Format** - MISMATCH
```json
// Code expects:
{
  "suggestion": "...",
  "priority": "HIGH|MEDIUM|LOW",
  "category": "objection_handling|discovery|closing|value_prop",
  "confidence": 0.7
}

// May also handle legacy:
{
  "urgency": "high|medium|low",
  "suggestion": "...",
  "next_action": "...",
  "reasoning": "..."
}
```

## Impact Analysis

### 1. **Working Components**
- Document indexing (intelligent-prompt-builder handles both formats)
- Stage detection and progression tracking
- Memory-based context matching

### 2. **Broken Components**
- Direct technique access in `ollama-service.ts` lines 192-214
- Knowledge base building (expects `conversation_paths`)
- Exact word extraction from paths

### 3. **Missing Features**
- Predictive conversation chains (3-move sequences)
- Path confidence scoring
- Prospect response prediction

## Recommendations

### Option A: Update Document Format (RECOMMENDED)
1. Regenerate JSON from original text with legacy structure
2. Maintain `predictive_techniques` array format
3. Add stage awareness as metadata

### Option B: Update Code Completely
1. Modify `ollama-service.ts` to use new stage format
2. Update all technique extraction logic
3. Build bridges-to-paths translation layer

### Option C: Hybrid Approach
1. Support both formats simultaneously
2. Convert stage format to legacy internally
3. Maintain backward compatibility

## Technical Details

### Critical Code Sections Affected:
- `ollama-service.ts:192-214` - technique extraction
- `ollama-service.ts:220-254` - knowledge base building
- `intelligent-prompt-builder.ts:83-134` - legacy indexing

### JSON Field Mapping:
```
OLD → NEW
predictive_techniques → stages.{stage}.bridges
conversation_paths → bridges (flattened)
trigger → keywords (array, not string)
immediate_response.exact_words → text
predicted_path → (missing - needs reconstruction)
```

## Immediate Action Required

The app expects legacy format but received stage-based format. To restore functionality:

1. **Convert new JSON back to legacy format**
2. **Regenerate from original source with predictive structure**
3. **Test coaching suggestions return to working state**

The intelligent prompt builder handles both, but ollama-service needs legacy format for proper knowledge extraction.

=====

# "Say Now" Content Creation Process - September 23, 2025

## Complete Data Flow for Coaching Suggestions

### 1. **Trigger: Transcript Processing**
**Location:** `src/services/coaching/live-coaching-service.ts`
- WebSocket receives transcript from Python Vosk service
- Filters for significant transcripts (≥50 characters)
- Checks both `partial_transcript` and `final_transcript` events
- Triggers coaching when transcript meets threshold

### 2. **Prompt Building Process**
**Location:** `src/services/coaching/ollama-service.ts` → `OllamaInstructionLoader.ts`

**Step 2A: Context Preparation**
```javascript
const promptContext = {
  transcript: recentTranscript,        // Current conversation
  knowledge: knowledgeBase,            // Extracted from RAG document
  salesStage: detectedStage,           // Opening/Discovery/Presentation/etc.
  callDuration: sessionDuration,
  objections: detectedObjections,
  topics: conversationTopics,
  sentiment: emotionalTone
};
```

**Step 2B: Template Loading**
- Loads instruction template from `ollama-prompts/active-instructions.md`
- Template contains Chris Voss "Never Split the Difference" techniques
- Auto-reloads when file changes (no restart needed)

**Step 2C: Variable Replacement**
`OllamaInstructionLoader.buildPrompt()` replaces:
- `{TRANSCRIPT}` → Recent conversation text
- `{KNOWLEDGE_BASE}` → RAG-extracted sales techniques
- `{SALES_STAGE}` → Detected conversation stage
- `{DURATION}` → Call duration in minutes
- `{OBJECTIONS}` → Detected objections list
- `{TOPICS}` → Topics being discussed
- `{SENTIMENT}` → Emotional tone analysis

### 3. **Instruction Template Structure**
**File:** `ollama-prompts/active-instructions.md`

**Core Instructions:**
- Chris Voss negotiation techniques (Mirroring, Labeling, Calibrated Questions, etc.)
- Objection response framework
- Specific word-for-word suggestions
- Tactical empathy approaches

**Expected Response Format:**
```json
{
  "primary_prompt": "The most important thing to say RIGHT NOW",
  "suggested_responses": [
    "Option 1: [Exact words using specific technique]",
    "Option 2: [Alternative approach]",
    "Option 3: [Backup option]"
  ],
  "next_best_actions": ["Specific follow-up steps"],
  "priority": "HIGH|MEDIUM|LOW",
  "category": "objection_handling|discovery|closing|value_prop",
  "technique": "mirroring|labeling|calibrated_question|etc.",
  "why_now": "Why this approach fits this moment",
  "expected_response": "What prospect will likely say",
  "confidence": 0.0-1.0
}
```

### 4. **Ollama Processing**
**Location:** Main process IPC handler in `main.cjs`
- Sends complete prompt to Ollama AI model
- Model analyzes conversation and applies Voss techniques
- Returns JSON response with coaching suggestion

### 5. **Response Enhancement (FIXED)**
**Location:** `main.cjs` IPC handler (moved from renderer process)
- Parses JSON response from Ollama
- **NEW Enhanced Formatting:**
  - `say_now` → "Say now: [text]"
  - `next_move` → "➡️ Next: [text]"
  - `path_goal` → "🎯 Goal: [text]"
  - `predicted_response` → "💭 They'll likely say: [text]"
  - `alternative` → "🔄 Alternative: [text]"

### 6. **UI Display**
**Location:** React coaching panel
- Receives formatted response from IPC
- Displays as actionable coaching suggestion
- User sees "Say now:" instead of raw JSON

## Key Discovery: Template-Driven Coaching

**The "say_now" content is NOT hard-coded.** Instead:

1. **Ollama receives detailed instructions** from `active-instructions.md`
2. **Instructions specify exact Voss techniques** to apply
3. **Model analyzes current transcript** against these techniques
4. **Model generates contextual suggestions** using the frameworks
5. **Response follows structured JSON format** for consistent parsing

## Available Rich Metadata

Beyond `say_now`, the system provides:
- **Technique identification** - Which Voss method is being applied
- **Strategic reasoning** - Why this approach fits the moment
- **Predictive insights** - What prospect will likely say next
- **Multi-option responses** - 3 different approaches to choose from
- **Next actions** - Specific follow-up steps
- **Confidence scoring** - AI's certainty about the suggestion

## Customization Points

1. **Edit `active-instructions.md`** - Change coaching style/techniques
2. **Modify response format** - Add/remove JSON fields
3. **Adjust variable context** - Include additional conversation data
4. **Enhance parsing logic** - Use more rich metadata in UI

The system is **fully template-driven and customizable** without code changes.