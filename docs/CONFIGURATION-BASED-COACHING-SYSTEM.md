# Configuration-Based Coaching System

## Overview
VoiceCoach V2 now uses a fully configuration-based coaching system that allows customization without code changes. All coaching behavior, prompts, and UI can be modified through configuration files.

## Configuration Files

### 1. **Prompt Template** (`config/ollama/prompt-template.md`)
- System prompt template with variable placeholders
- Response format definition
- Compression targets for each component
- Fallback templates for emergency situations

**Key Variables:**
- `{STAGE}` - Current sales stage
- `{PRINCIPLES}` - Core coaching principles
- `{KNOWLEDGE_BASE}` - Relevant knowledge
- `{CONTEXT}` - Conversation history
- `{CURRENT_TEXT}` - Latest transcript

### 2. **Compression Settings** (`config/ollama/compression-settings.json`)
Controls how prompts are compressed to fit within Ollama's token limits:
- Max total characters: 3,800
- Component-specific limits
- Compression strategies
- Emergency fallback triggers

### 3. **Stage Detection** (`config/ollama/stage-detection.json`)
Defines how sales stages are detected:
- Keywords for each stage
- Stage-specific guidance
- Transition triggers
- Priority order for detection

**Stages:**
- Discovery
- Demo/Presentation
- Objection Handling
- Closing
- Unknown

### 4. **Core Principles** (`config/ollama/core-principles.json`)
Fundamental coaching rules:
- Always/Never lists
- Compressed versions for different space constraints
- Sales methodologies (SPIN, Challenger, etc.)
- Conversation rules per stage

### 5. **Coaching Responses** (`config/ollama/coaching-responses.md`)
Template responses for different scenarios:
- Stage-specific templates
- Objection type responses
- Urgency levels
- Fallback responses

### 6. **UI Configuration** (`config/coaching-ui.json`)
Visual presentation settings:
- Card types and colors
- Display settings
- Animations
- Urgency indicators

## Key Features

### Aggressive Prompt Compression
Based on the old VoiceCoach success:
- **Target**: 3,800 characters (under 4,096 token limit)
- **Achievement**: 27-40% of limit usage
- **Strategy**: Smart content prioritization

### One Prompt at a Time
- Single focused coaching suggestion
- Maximum 25 words per suggestion
- Clear urgency levels
- Specific next actions

### Stage-Aware Coaching
Automatic detection and adaptation to:
- Discovery phase
- Demo/presentation
- Objection handling
- Closing

### Visual Hierarchy
Color-coded prompt types:
- 🔴 **OBJECTION DETECTED** (Critical)
- 🟠 **CLOSING OPPORTUNITY** (High)
- 🔵 **DISCOVERY** (Medium)
- 🟢 **RAPPORT** (Low)

## Configuration Services

### ConfigurationLoader
- Loads all configuration files
- Watches for changes
- Provides fallback defaults
- Caches configurations

### ConfigurablePromptBuilder
- Uses configurations to build prompts
- Implements compression strategies
- Handles stage detection
- Manages fallbacks

## Modifying the System

### To Change Coaching Behavior:
1. Edit the relevant configuration file
2. Save the file
3. System auto-reloads (if file watching enabled)
4. No code changes or restart required

### To Add New Sales Methodology:
1. Edit `core-principles.json`
2. Add methodology to `methodologies` section
3. Add techniques and frameworks
4. Update stage detection keywords if needed

### To Adjust Prompt Length:
1. Edit `compression-settings.json`
2. Modify `maxTotalChars` and component limits
3. System automatically adjusts compression

### To Customize UI:
1. Edit `coaching-ui.json`
2. Modify colors, animations, layout
3. Changes apply immediately

## Testing Configuration Changes

```typescript
import { configurablePromptBuilder } from './services/coaching/ConfigurablePromptBuilder';

// Test with sample context
const context = {
  currentText: "The price seems too high for our budget",
  detectedStage: "objection_handling",
  relevantKnowledge: "Focus on ROI and value..."
};

const prompt = await configurablePromptBuilder.buildPrompt(context);
console.log('Compressed prompt:', prompt.prompt);
console.log('Token estimate:', prompt.tokenEstimate);
console.log('Compression ratio:', prompt.compressionRatio);
```

## Benefits

1. **No Code Changes Required** - Business users can modify coaching behavior
2. **Instant Updates** - Changes apply without recompilation
3. **Version Control Friendly** - Configuration files can be tracked separately
4. **Client Customization** - Easy to create client-specific configurations
5. **A/B Testing** - Swap configurations to test different approaches

## Migration from Old System

The new configuration-based system replicates the successful patterns from the old VoiceCoach:
- Aggressive compression (77% reduction achieved)
- One prompt at a time
- Stage-aware coaching
- Concise suggestions (25 words max)
- Visual hierarchy with colored badges

## Next Steps

1. Test with real transcriptions
2. Fine-tune compression settings
3. Add client-specific configurations
4. Implement configuration UI for business users
5. Add configuration validation

## Files Created

```
config/
├── ollama/
│   ├── prompt-template.md
│   ├── compression-settings.json
│   ├── stage-detection.json
│   ├── core-principles.json
│   └── coaching-responses.md
└── coaching-ui.json

src/services/coaching/
├── ConfigurationLoader.ts
└── ConfigurablePromptBuilder.ts
```

## LED Breadcrumb Ranges

- 6300-6309: Configuration loading
- 6400-6407: Prompt building
- 8300-8306: Configuration errors
- 8400-8401: Prompt building errors