# Enhanced ChromaDB Processing Instructions
*Incorporating Phase 1A RAG Document Analyst2 methodology for comprehensive coaching content*

## Core Objective
Transform sales/communication documents into semantic search-optimized chunks that provide real-time coaching guidance during live customer interactions.

## Processing Methodology

### Step 1: Document Scan and Content Identification
Analyze document to identify:
- Sales techniques and specific methods
- Objection handling approaches with exact responses
- Communication strategies and frameworks
- Real conversation examples and scripts
- Strategic frameworks and systematic approaches
- Customer/prospect type classifications
- Psychological indicators and behavioral patterns
- Advanced questioning formulations
- Implementation and follow-through strategies

### Step 2: Extract Multi-Layered Content
For each valuable piece, create focused chunks following these patterns:

#### A. Technique Chunks (200-400 chars)
```
[TECHNIQUE]: [Name] - [Exact method/script]. [Context/when to use]. [Expected outcome/why it works].
Keywords: [5-7 semantic terms]
Priority: CRITICAL/HIGH/STANDARD
```

#### B. Framework Chunks (300-400 chars) 
```
[FRAMEWORK]: [Name] - [Description of systematic approach]. Components: [Key elements]. Application: [How to use in practice]. Indicators: [When this applies].
Keywords: [framework terms, application contexts]
Priority: HIGH/STANDARD
```

#### C. Objection Handler Chunks (250-400 chars)
```
OBJECTION: "[Customer concern]" → RESPONSE: "[Exact script/approach]" → FOLLOW-UP: "[Next steps]". [Context/timing notes].
Keywords: [objection terms, response approach]
Priority: CRITICAL
```

#### D. Advanced Question Chunks (200-350 chars)
```
QUESTION: "[Exact question formulation]" → PURPOSE: [What it accomplishes] → TIMING: [When to use] → FOLLOW-UP: [Response handling].
Keywords: [question type, purpose, timing]
Priority: HIGH/CRITICAL
```

#### E. Customer Type Chunks (300-400 chars)
```
CUSTOMER TYPE: [Name] - [Key characteristics and behaviors]. APPROACH: [Adaptation strategy]. AVOID: [What not to do]. INDICATORS: [Recognition signs].
Keywords: [type descriptors, behavioral terms]
Priority: HIGH
```

#### F. Psychological Indicator Chunks (250-400 chars)
```
INDICATOR: [Verbal/non-verbal cue] → MEANING: [Customer state/intent] → RESPONSE: [Adaptation strategy]. RELIABILITY: [Dependability level].
Keywords: [behavioral cues, psychological states]
Priority: HIGH
```

### Step 3: Real-Time Use Case Organization
Tag each chunk with conversation phase:
- **PRE_CALL**: Research, preparation, prospect classification
- **OPENING**: Rapport building, credibility, first impressions  
- **DISCOVERY**: Questions, pain points, buying signals
- **OBJECTION**: Resistance handling, reframing, proof points
- **CLOSING**: Commitment, urgency, next steps
- **RELATIONSHIP**: Trust building, value communication
- **ADVANCED**: Power dynamics, complex scenarios

### Step 4: Priority and Context Assignment
Mark each chunk with:
- **CRITICAL**: Handles common sales blockers directly
- **HIGH**: Significantly improves conversion rates
- **STANDARD**: General improvement technique
- **REFERENCE**: Background knowledge

### Step 5: Semantic Search Optimization
For each chunk:
1. **Natural Language Matching**: Include exact phrases customers might use
2. **Situation Keywords**: Add contextual terms (pressure, deadline, budget, etc.)
3. **Emotional Keywords**: Include feeling words (frustrated, confused, excited)
4. **Action Keywords**: Include behavioral descriptors (hesitant, aggressive, analytical)
5. **Outcome Keywords**: Include result terms (closing, objection, rapport)

## ChromaDB Chunk Structure

```json
{
  "id": "chunk_XXX",
  "content": "[Formatted technique/framework/handler as above]",
  "content_type": "technique|framework|objection_handler|advanced_question|customer_type|psychological_indicator",
  "conversation_phase": "PRE_CALL|OPENING|DISCOVERY|OBJECTION|CLOSING|RELATIONSHIP|ADVANCED",
  "priority": "CRITICAL|HIGH|STANDARD|REFERENCE",
  "char_count": 999,
  "search_keywords": ["semantic", "search", "terms", "customer", "phrases", "situational", "contextual"],
  "coaching_trigger": "When customer says X or shows Y behavior",
  "expected_outcome": "What this technique/approach achieves"
}
```

## Advanced Extraction Rules

1. **Preserve Exact Scripts**: Keep conversation examples word-for-word
2. **Capture Implementation Details**: Include follow-through steps and commitment strategies
3. **Extract Systematic Approaches**: Identify multi-step processes and frameworks
4. **Note Psychological Principles**: Include behavioral science elements
5. **Maintain Context**: Always specify when/where to use each technique
6. **Include Preparation Elements**: Extract pre-call strategies and research methods
7. **Focus on Coaching Triggers**: Identify specific customer phrases/behaviors that trigger advice
8. **Prioritize by Sales Impact**: Weight content by conversion effectiveness

## Quality Standards

Each chunk must:
- Be 200-400 characters for optimal semantic search
- Contain actionable information usable in real conversations
- Include specific context for when to apply
- Use natural language that matches customer communication
- Be self-contained and immediately understandable
- Focus on practical application over theoretical concepts

## Expected Outcomes

This enhanced processing should generate:
- **50-100+ technique chunks** (vs 25 basic chunks)
- **15-30 framework chunks** for systematic approaches
- **20-40 objection handlers** with exact scripts
- **10-25 advanced questions** with strategic purposes
- **5-15 customer types** with behavioral patterns
- **10-20 psychological indicators** with response strategies

**Total: 110-230 actionable coaching chunks optimized for real-time semantic search**

This methodology transforms any sales document into a comprehensive coaching knowledge base that can provide the right guidance at the right moment during live customer interactions.