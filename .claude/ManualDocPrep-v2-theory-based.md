# SALES COACHING DOCUMENT ANALYZER - PATTERN-BASED APPROACH
**Version 2.0 - Based on Successful Processing Theory**

You are analyzing a sales methodology document using a pattern-based extraction system. Your output will be structured JSON for real-time coaching via Ollama (llama3.1:8b).

## PROCESSING THEORY
This approach uses predefined pattern libraries to ensure consistent, high-quality extraction:
- Pattern matching for sales methodologies
- Classification of objection types
- Sales stage mapping
- Metadata-driven tagging

## PHASE 1: PATTERN DETECTION & CLASSIFICATION

### Detect Sales Methodologies
Search for these methodology patterns in the document:
- **SPIN**: situation questions, problem questions, implication questions, need payoff
- **MEDDIC**: metrics, economic buyer, decision criteria, decision process
- **Challenger**: challenge customer, teach insight, tailor message, take control
- **Sandler**: pain funnel, up front contract, negative reverse selling
- **Chris Voss**: mirroring, tactical empathy, labeling, calibrated questions, accusation audit, dynamic silence, black swan, bargaining

### Classify Objection Types
Identify and categorize objections:
- **Price**: "too expensive", "can't afford", "over budget", "too much"
- **Authority**: "need to check", "not my decision", "boss decides", "need approval"
- **Need**: "not interested", "no need", "happy with current", "already have"
- **Timing**: "not ready", "maybe later", "next quarter", "think about it"
- **Trust**: "never heard of", "references", "proof", "credibility"
- **Feature**: "missing feature", "doesn't do", "limitation", "requirement"

### Map Sales Stages
Identify which sales stages are covered:
- **Prospecting**: cold call, outreach, lead generation, qualifying
- **Discovery**: needs analysis, pain points, current situation, challenges
- **Presentation**: demo, proposal, solution, pitch, showcase
- **Objection Handling**: addressing concerns, overcoming resistance
- **Closing**: commitment, next steps, agreement, contract

## PHASE 2: STRUCTURED EXTRACTION

For EACH technique found, create this EXACT structure:

```json
{
  "technique_name": "[Name of technique]",
  "description": "[Brief 10-word description]",
  "when_to_use": [
    {
      "trigger": "[Common phrase customer says]",
      "prospect_says": "[Full customer statement]",
      "coach_prompt": "[What coach displays: 15 words max]",
      "salesperson_says": "[Exact words to say]",
      "expected_result": "[What should happen next]"
    }
  ],
  "implementation": {
    "max_words": [number],
    "action": "[Specific action to take]",
    "timing": "[When to use it]"
  },
  "common_mistakes": [
    "[Mistake 1]",
    "[Mistake 2]"
  ],
  "urgency_level": "[critical/high/medium/low]"
}
```

**CRITICAL**: Include AT LEAST 3 scenarios per technique for comprehensive coverage.

## PHASE 3: CREATE PATTERN-BASED RESPONSES

### Response Patterns Structure
Group responses by objection category:

```json
"response_patterns": {
  "[objection_type]": {
    "triggers": ["phrase1", "phrase2", "phrase3"],
    "responses": [
      "[Response option 1]",
      "[Response option 2]",
      "[Response option 3]",
      "[Response option 4]"
    ]
  }
}
```

Include patterns for:
- price_objections
- trust_issues
- timing_delays
- authority_issues
- need_objections
- feature_objections

### Advanced Combinations
Create multi-step sequences:

```json
"advanced_combinations": {
  "discovery_to_pain": [
    "Step 1 action",
    "Step 2 action",
    "Step 3 action"
  ],
  "objection_to_solution": [
    "Step 1 action",
    "Step 2 action",
    "Step 3 action"
  ],
  "stall_to_close": [
    "Step 1 action",
    "Step 2 action",
    "Step 3 action"
  ]
}
```

## PHASE 4: METADATA & RULES

### Document Analysis Metadata
```json
"document_analysis": {
  "techniques_found": [number],
  "actionable_prompts_created": [total count],
  "sales_stages_covered": [count],
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

## PHASE 5: QUALITY VALIDATION

Before finalizing, verify:
- [ ] Minimum 45 actionable prompts across all techniques
- [ ] Each technique has 3+ specific scenarios
- [ ] Triggers use common, recognizable phrases
- [ ] All 8 required sections present
- [ ] Response patterns cover 6 objection types
- [ ] Advanced combinations include 3+ sequences
- [ ] Coaching rules properly defined

## REQUIRED OUTPUT STRUCTURE

Your JSON must contain ALL these sections in this order:

```json
{
  "document_analysis": {},
  "techniques": [],
  "stage_guidance": {},
  "quick_reference": {},
  "urgency_triggers": {},
  "response_patterns": {},
  "advanced_combinations": {},
  "coaching_rules": {}
}
```

## PROCESSING CHECKLIST
1. ✓ Detect all sales methodologies present
2. ✓ Classify all objection types found
3. ✓ Map content to sales stages
4. ✓ Extract 45+ actionable prompts
5. ✓ Create response patterns for 6 objection types
6. ✓ Define 3+ advanced combinations
7. ✓ Include all 8 required sections
8. ✓ Validate trigger phrases are common/flexible

## SAVE INSTRUCTIONS
Filename: `[DocumentName]_Processed_[YYYY-MM-DD]_[HH-MM-SS].json`
Location: `D:\Projects\Ai\VoiceCoach-v2\rag\`

The output will be used directly by VoiceCoach V2 for real-time sales coaching during live calls.