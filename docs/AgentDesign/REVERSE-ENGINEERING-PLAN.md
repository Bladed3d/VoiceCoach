# VoiceCoach V2 - Reverse Engineering Plan for Old App Success

## Overview
The old VoiceCoach app achieved excellent coaching results through:
1. Specific document structure with rich metadata
2. Concise, color-coded UI presentation
3. Pattern-based detection matching Ollama's expectations

## 1. Document Structure Transformation

### Old App Format (What Worked)
```json
{
  "key_principles": [
    {
      "name": "Mirroring",
      "description": "Repeating the last 1-3 words...",
      "when_to_use": "When you want someone to continue talking",
      "why_it_works": "Creates psychological connection",
      "sales_application": "Get prospects to elaborate on pain points",
      "specific_examples": [
        {
          "scenario": "Prospect mentions cost concern",
          "dialogue_example": "Prospect: 'The cost is high'\nSales: 'High?'"
        }
      ],
      "real_world_scenarios": [
        {
          "industry": "SaaS",
          "scenario": "Customer expresses pricing concern"
        }
      ],
      "implementation_guide": [
        "Listen actively and wait for pauses",
        "Repeat key words without judgment"
      ],
      "common_mistakes_to_avoid": [
        "Parroting exactly what was said"
      ]
    }
  ]
}
```

### Current App Format (Needs Transformation)
```json
{
  "techniques": [
    {
      "technique_name": "Mirroring",
      "when_to_use": [
        {
          "trigger": "cost concern",
          "coach_prompt": "Mirror their words",
          "salesperson_says": "High?"
        }
      ]
    }
  ]
}
```

### Transformation Required
- Expand flat `techniques` → Rich `key_principles` with nested metadata
- Add missing fields: description, why_it_works, sales_application
- Include dialogue examples and industry scenarios
- Add implementation guides and common mistakes

## 2. UI Presentation Improvements

### Old App's Successful UI Elements

#### A. Color Coding System
```typescript
// Priority Colors (Background + Border)
'critical': 'border-l-red-400 bg-red-900/20'
'high': 'border-l-danger-400 bg-danger-900/20'  
'medium': 'border-l-warning-400 bg-warning-900/20'
'low': 'border-l-primary-400 bg-primary-900/20'

// Priority Badges
'critical': 'bg-red-600 text-white'
'high': 'bg-danger-600 text-white'
'medium': 'bg-warning-600 text-white'
'low': 'bg-slate-600 text-slate-300'
```

#### B. Visual Icons
```typescript
// Type Icons
'suggestion': <Lightbulb className="text-primary-400" />
'objection': <AlertCircle className="text-warning-400" />
'opportunity': <CheckCircle2 className="text-success-400" />
'warning': <Clock className="text-danger-400" />
'milestone': <ArrowRight className="text-purple-400" />
```

#### C. Concise Text Formatting
```typescript
// Truncate long content with emoji prefix
format_for_coaching(): string {
  return f"💡 {content[:200]}..." if len(content) > 200 else f"💡 {content}"
}
```

#### D. Progressive Disclosure
- Main prompt shows truncated content
- "More Info" button → Expanded coaching guide
- "Ask" button → Interactive Q&A with AI
- Contextual actions shown in green boxes
- AI reasoning shown in subtle italic text

#### E. Visual Hierarchy
1. **Title + Priority Badge** (most prominent)
2. **Content** (200 char preview)
3. **Source** (small, with database icon)
4. **Next Action** (green box if critical)
5. **Reasoning** (subtle italic)

## 3. Processing Pipeline

### Old App Pipeline
1. **Document Upload** → Parse into rich `key_principles` structure
2. **ChromaDB Indexing** → Semantic embeddings of full context
3. **Real-time Matching** → Pattern detection against transcript
4. **UI Rendering** → Color-coded cards with progressive disclosure

### New App Pipeline (To Build)
1. **Document Processing Service**
   - Convert our JSON to old app's `key_principles` format
   - Enrich with missing metadata fields
   - Generate dialogue examples if missing

2. **Ollama Integration Service**
   - Format prompts using enriched structure
   - Include specific_examples in context
   - Reference implementation_guide for suggestions

3. **UI Components**
   - Implement color-coded priority system
   - Add visual icons for quick scanning
   - Truncate content at 200 chars
   - Progressive disclosure buttons

## 4. Implementation Steps

### Phase 1: Document Transformer Service
```typescript
// src/services/document/document-transformer.ts
class DocumentTransformer {
  // Convert current format to old app's rich format
  transformToLegacyFormat(currentDoc: CurrentFormat): LegacyFormat {
    return {
      key_principles: currentDoc.techniques.map(tech => ({
        name: tech.technique_name,
        description: this.generateDescription(tech),
        specific_examples: this.expandExamples(tech.when_to_use),
        real_world_scenarios: this.generateScenarios(tech),
        implementation_guide: this.generateGuide(tech)
      }))
    }
  }
}
```

### Phase 2: Ollama Service Updates
```typescript
// Update buildCoachingPrompt to use rich structure
buildCoachingPrompt(context: CoachingContext): string {
  const principles = context.processedInsights.key_principles;
  
  return `
  ## Available Sales Techniques
  ${principles.map(p => `
    ### ${p.name}
    Description: ${p.description}
    When to use: ${p.when_to_use}
    Example: ${p.specific_examples[0]?.dialogue_example}
  `).join('\n')}
  
  Current transcript: "${context.currentTranscript}"
  Suggest ONE specific technique with example dialogue.
  `;
}
```

### Phase 3: UI Component Updates
```typescript
// src/components/coaching/CoachingCard.tsx
export function CoachingCard({ prompt }: { prompt: CoachingPrompt }) {
  return (
    <div className={`border-l-4 rounded-lg p-4 ${getPriorityColor(prompt.priority)}`}>
      <div className="flex items-center gap-2 mb-2">
        {getIcon(prompt.type)}
        <span className={`px-2 py-1 rounded-full text-xs ${getPriorityBadge(prompt.priority)}`}>
          {prompt.priority} priority
        </span>
      </div>
      
      <p className="text-slate-200">
        💡 {prompt.content.slice(0, 200)}{prompt.content.length > 200 && '...'}
      </p>
      
      {prompt.next_action && (
        <div className="mt-3 p-2 bg-green-900/20 border border-green-600/30 rounded">
          <ArrowRight className="w-3 h-3 text-green-400 inline mr-1" />
          <span className="text-sm text-green-200">"{prompt.next_action}"</span>
        </div>
      )}
    </div>
  )
}
```

## 5. Success Metrics

### Document Quality
- ✅ All 8 Chris Voss principles present
- ✅ Each principle has 3+ specific examples
- ✅ Dialogue examples for each scenario
- ✅ Implementation guides included

### UI Effectiveness  
- ✅ <200ms response time
- ✅ Color coding for instant priority recognition
- ✅ 200-char previews for quick scanning
- ✅ Progressive disclosure for details
- ✅ Emoji prefixes for visual scanning

### Coaching Results
- ✅ Relevant suggestions within 2 seconds
- ✅ Actionable dialogue examples provided
- ✅ Context-aware prioritization
- ✅ No duplicate suggestions in 2-minute window

## 6. Testing Plan

1. **Document Transformation Test**
   - Input: Current format JSON
   - Output: Old app format with all fields
   - Verify: No data loss, enrichment successful

2. **Ollama Integration Test**
   - Input: Sample transcript
   - Output: Coaching suggestion with dialogue
   - Verify: Uses specific_examples from document

3. **UI Rendering Test**
   - Display 10 prompts of varying priorities
   - Verify: Colors, icons, truncation working
   - Test: Progressive disclosure buttons

## 7. Migration Path

1. **Keep existing system working** while building new pipeline
2. **Add feature flag** to switch between old/new processing
3. **Test with both formats** side-by-side
4. **Gradually migrate** once new format proves superior
5. **Deprecate old format** after validation

## Summary

The old app's success came from:
1. **Rich document structure** with dialogue examples and implementation guides
2. **Concise UI** with color coding and 200-char previews
3. **Pattern matching** aligned with what Ollama expects

By reverse-engineering these elements, we can achieve the same high-quality coaching results in VoiceCoach V2.