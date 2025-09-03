# SALES COACHING DOCUMENT ANALYZER - FINAL VERSION
**Version 3.0 - Production Ready**

Based on successful pattern-based theory that produced high-quality results.

You are analyzing a sales methodology document to extract real-time coaching prompts for salespeople during live calls. Your output will be used by Ollama (llama3.1:8b) to provide instant suggestions.

## PROVEN APPROACH
This method uses pattern detection and structured extraction to ensure consistent, high-quality results with:
- Minimum 48 actionable prompts
- All 8 required sections
- Pattern-based response categories
- Flexible trigger phrases

## PHASE 1: PATTERN DETECTION

### Identify Sales Methodologies
Search for methodology indicators:
- **Chris Voss/Never Split**: mirroring, tactical empathy, labeling, calibrated questions, accusation audit, dynamic silence, black swan, bargaining
- **SPIN**: situation, problem, implication, need-payoff questions
- **MEDDIC**: metrics, economic buyer, decision criteria, decision process
- **Challenger**: teach, tailor, take control, commercial insight
- **Sandler**: pain funnel, up-front contract, negative reverse
- **BANT**: budget, authority, need, timeline

### Classify Content Types
Categorize the document:
- Objection handling guide
- Sales scripts/talk tracks
- Methodology training
- Negotiation techniques
- Discovery questions
- Closing strategies

## PHASE 2: TECHNIQUE EXTRACTION

For EACH sales technique found, create this structure with AT LEAST 3 scenarios:

```json
{
  "technique_name": "[Technique name]",
  "description": "[10-word description of the technique]",
  "when_to_use": [
    {
      "trigger": "[Common phrase prospect says]",
      "prospect_says": "[Full prospect statement]",
      "coach_prompt": "[Coach display: 15 words max]",
      "salesperson_says": "[Exact response]",
      "expected_result": "[What happens next]"
    },
    // Minimum 3 scenarios per technique
  ],
  "implementation": {
    "max_words": [number],
    "action": "[Specific action]",
    "timing": "[When to use]"
  },
  "common_mistakes": [
    "[Common mistake 1]",
    "[Common mistake 2]"
  ],
  "urgency_level": "[critical/high/medium/low]"
}
```

## PHASE 3: STAGE-SPECIFIC GUIDANCE

Create guidance for each sales stage:

```json
"stage_guidance": {
  "discovery": {
    "focus": "[Main goal]",
    "top_techniques": ["[Tech 1]", "[Tech 2]"],
    "quick_prompts": [
      "Ask: '[Question]'",
      "Say: '[Statement]'",
      "Mirror: '[Response]'"
    ]
  },
  "objection_handling": { /* similar structure */ },
  "negotiation": { /* similar structure */ },
  "closing": { /* similar structure */ }
}
```

## PHASE 4: RESPONSE PATTERNS (REQUIRED)

Create pattern-based responses for AT LEAST 6 objection categories:

```json
"response_patterns": {
  "price_objections": {
    "triggers": ["too expensive", "can't afford", "over budget", "too much"],
    "responses": [
      "Label: 'Seems like budget is tight'",
      "Ask: 'What would work for you?'",
      "Mirror: 'Too expensive?'",
      "Ask: 'How far apart are we?'"
    ]
  },
  "trust_issues": {
    "triggers": ["don't believe", "skeptical", "prove it", "not convinced"],
    "responses": [/* 4 responses */]
  },
  "timing_delays": {
    "triggers": ["not now", "next quarter", "need time", "too soon"],
    "responses": [/* 4 responses */]
  },
  "authority_issues": {
    "triggers": ["check with boss", "not my decision", "need approval"],
    "responses": [/* 4 responses */]
  },
  "need_objections": {
    "triggers": ["not interested", "no need", "happy with current"],
    "responses": [/* 4 responses */]
  },
  "feature_objections": {
    "triggers": ["missing feature", "doesn't do", "limitation"],
    "responses": [/* 4 responses */]
  }
}
```

## PHASE 5: ADVANCED COMBINATIONS

Define multi-step technique sequences:

```json
"advanced_combinations": {
  "discovery_to_pain": [
    "Mirror to get elaboration",
    "Label the emotion",
    "Ask calibrated question to deepen"
  ],
  "objection_to_solution": [
    "Accusation audit first",
    "Use tactical empathy",
    "Offer precise alternative"
  ],
  "stall_to_close": [
    "Black swan discovery",
    "Dynamic silence",
    "Calibrated question to move forward"
  ]
}
```

## PHASE 6: METADATA & RULES

### Enhanced Document Analysis
```json
"document_analysis": {
  "techniques_found": [number],
  "actionable_prompts_created": [48+ required],
  "sales_stages_covered": [number],
  "confidence_score": [0.0-1.0],
  "primary_methodology": "[detected methodology]",
  "document_type": "[classification]"
}
```

### Coaching Rules
```json
"coaching_rules": {
  "max_prompt_length": 25,
  "response_time": "under_2_seconds",
  "clarity": "exact_words_to_say",
  "format": "conversational_phone_appropriate",
  "avoid": [
    "Complex explanations",
    "Multiple options",
    "Theory or background",
    "Long sentences",
    "Jargon or acronyms"
  ]
}
```

## REQUIRED OUTPUT STRUCTURE

ALL 8 sections must be present:

```json
{
  "document_analysis": {
    "techniques_found": 8,
    "actionable_prompts_created": 48,
    "sales_stages_covered": 4,
    "confidence_score": 0.95,
    "primary_methodology": "[methodology]",
    "document_type": "[type]"
  },
  "techniques": [/* array of techniques */],
  "stage_guidance": {/* 4 stages */},
  "quick_reference": {
    "most_useful_prompts": [/* 10 prompts */]
  },
  "urgency_triggers": {
    "critical": [/* triggers */],
    "high": [/* triggers */],
    "medium": [/* triggers */]
  },
  "response_patterns": {/* 6 categories minimum */},
  "advanced_combinations": {/* 3 sequences minimum */},
  "coaching_rules": {/* implementation rules */}
}
```

## QUALITY CHECKLIST
Before saving, verify:
- [ ] 48+ total actionable prompts
- [ ] All 8 sections present
- [ ] 6+ response pattern categories
- [ ] 3+ advanced combinations
- [ ] Flexible trigger phrases (not overly specific)
- [ ] Enhanced metadata in document_analysis
- [ ] Each technique has 3+ scenarios

## SAVE INSTRUCTIONS
- Filename: `[DocumentName]_Processed_[YYYY-MM-DD]_[HH-MM-SS].json`
- Location: `D:\Projects\Ai\VoiceCoach-v2\rag\`

This will produce consistent, high-quality coaching data for VoiceCoach V2.