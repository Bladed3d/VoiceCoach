# SALES COACHING DOCUMENT ANALYZER INSTRUCTIONS - ENHANCED FORMAT

You are analyzing a sales methodology document to extract comprehensive coaching guidance with rich examples and implementation details. Your output will be used by Ollama (llama3.1:8b) to provide high-quality, actionable coaching.

## YOUR TASK:
Analyze the provided document and create a structured JSON output with rich metadata, dialogue examples, and implementation guides that match what Ollama expects for optimal coaching results.

## STEP 1: IDENTIFY KEY PRINCIPLES
Extract 8-12 core sales techniques/principles from the document (especially Chris Voss's 8 strategies if applicable):
1. Mirroring
2. Labeling  
3. Tactical Empathy
4. Calibrated Questions
5. Accusation Audit
6. Late-Night FM DJ Voice
7. No-Oriented Questions
8. 7-38-55 Rule

## STEP 2: FOR EACH PRINCIPLE CREATE THIS RICH STRUCTURE:

```json
{
  "name": "Mirroring",
  "description": "Mirroring is the practice of repeating the last 1-3 critical words someone just said to encourage them to elaborate further without feeling interrogated.",
  "when_to_use": "When you want the prospect to continue talking and reveal more information, especially when they mention concerns, objections, or important details",
  "why_it_works": "Creates a subconscious connection and makes the speaker feel heard, triggering them to naturally expand on their thoughts without defensive reactions",
  "sales_application": "Use mirroring to get prospects to elaborate on pain points, budget constraints, decision criteria, or any concern they briefly mention",
  "specific_examples": [
    {
      "scenario": "A SaaS prospect mentions they're concerned about implementation time",
      "dialogue_example": "Prospect: 'We're worried the implementation will take too long and disrupt our team.'\nSalesperson: 'Disrupt your team?'\nProspect: 'Yes, last time we implemented a new system, it took 3 months and our productivity dropped 40%.'"
    },
    {
      "scenario": "An insurance client discusses coverage concerns",
      "dialogue_example": "Prospect: 'The deductible seems quite high for our situation.'\nSalesperson: 'High for your situation?'\nProspect: 'Well, we have multiple properties and if we had claims on several, it would be expensive.'"
    },
    {
      "scenario": "A real estate buyer mentions location issues",
      "dialogue_example": "Prospect: 'The location might not work for our employees.'\nSalesperson: 'Not work for your employees?'\nProspect: 'Most of them live on the other side of town, adding 30 minutes to their commute.'"
    }
  ],
  "real_world_scenarios": [
    {
      "industry": "SaaS",
      "scenario": "During a demo when the prospect expresses concern about features or integration"
    },
    {
      "industry": "Real Estate",
      "scenario": "When a buyer mentions issues with property price, location, or condition"
    },
    {
      "industry": "Insurance",
      "scenario": "When discussing coverage limits, deductibles, or premium costs"
    }
  ],
  "implementation_guide": [
    "Listen actively and identify the 1-3 most critical words in their statement",
    "Repeat those words with an upward inflection, making it a question",
    "Remain silent and maintain eye contact (or pause on phone), allowing them to elaborate",
    "Take notes on the additional information they provide",
    "Use the new information to ask deeper calibrated questions"
  ],
  "common_mistakes_to_avoid": [
    "Mirroring too frequently - it becomes obvious and annoying",
    "Repeating entire sentences instead of just key words",
    "Using a mocking or sarcastic tone instead of genuine curiosity",
    "Breaking the silence too quickly after mirroring"
  ],
  "coaching_prompts": [
    {
      "trigger": "worried about|concerned about|problem with",
      "coach_prompt": "💡 Mirror their concern to get more details",
      "salesperson_says": "[Repeat their last 2-3 words as a question]",
      "priority": "HIGH"
    },
    {
      "trigger": "too expensive|over budget|can't afford",
      "coach_prompt": "💡 Mirror the price objection",
      "salesperson_says": "Too expensive?",
      "priority": "HIGH"
    },
    {
      "trigger": "not sure|don't know|maybe",
      "coach_prompt": "💡 Mirror their uncertainty",
      "salesperson_says": "Not sure?",
      "priority": "MEDIUM"
    }
  ]
}
```

## STEP 3: CREATE STAGE-SPECIFIC GUIDANCE

For each sales stage, provide instant coaching:

```json
{
  "discovery": {
    "focus": "Uncover pain points",
    "top_techniques": ["Calibrated Questions", "Mirroring"],
    "quick_prompts": [
      "Ask: 'What's your biggest challenge?'",
      "Say: 'Tell me more about that'",
      "Mirror their concern"
    ]
  },
  "objection_handling": {
    "focus": "Address concerns without defensiveness",
    "top_techniques": ["Labeling", "Accusation Audit"],
    "quick_prompts": [
      "Say: 'It seems like price is a concern'",
      "Ask: 'What specifically worries you?'",
      "Label: 'You're concerned about ROI'"
    ]
  }
}
```

## STEP 4: CREATE RESPONSE PATTERNS

Add pattern-based responses for common objection categories:

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
    "responses": [
      "Label: 'You're skeptical, I get it'",
      "Audit: 'You think I'm overselling'",
      "Ask: 'What would convince you?'",
      "Say: 'Fair enough. What concerns you?'"
    ]
  },
  "timing_delays": {
    "triggers": ["not now", "next quarter", "need time", "too soon"],
    "responses": [
      "Ask: 'What changes next quarter?'",
      "Mirror: 'Next quarter?'",
      "Ask: 'What needs to happen first?'",
      "Label: 'Timing feels rushed'"
    ]
  },
  "authority_issues": {
    "triggers": ["check with boss", "not my decision", "need approval", "committee decides"],
    "responses": [
      "Ask: 'Who else should we include?'",
      "Ask: 'How does approval work?'",
      "Say: 'What would they want to know?'",
      "Ask: 'When do they meet?'"
    ]
  }
}
```

## STEP 5: ADD ADVANCED COMBINATIONS

Include multi-step technique sequences:

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

## STEP 6: INCLUDE COACHING RULES

Add implementation guidelines:

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

## CRITICAL CONSTRAINTS:
1. **MAXIMUM 25 WORDS** per coaching suggestion
2. **ONE technique** per suggestion (never multiple options)
3. **ACTIONABLE ONLY** - what to say right now, not theory
4. **NO EXPLANATIONS** in prompts - just the words to say
5. **DIALOGUE FORMAT** must be realistic for phone calls
6. **TRIGGERS should be common phrases** - not overly specific

## FINAL OUTPUT FORMAT:

Your final JSON must include ALL these sections with the enhanced structure:

```json
{
  "document_metadata": {
    "title": "Document title",
    "methodology": "Sales methodology name (e.g., 'Chris Voss - Never Split the Difference')",
    "processed_date": "ISO date string",
    "total_principles": 8
  },
  "key_principles": [
    // Array of principle objects with FULL structure from Step 2
    // Each principle MUST have ALL fields:
    // - name, description, when_to_use, why_it_works
    // - sales_application, specific_examples (3+ each)
    // - real_world_scenarios (3+ industries)
    // - implementation_guide (3-5 steps)
    // - common_mistakes_to_avoid (2-3 items)
    // - coaching_prompts (3+ triggers)
  ],
  "conversation_starters": [
    {
      "scenario": "Cold call opening",
      "opener": "Hi [Name], I know you weren't expecting my call. Do you have 27 seconds for me to tell you why I'm calling?",
      "purpose": "Gets permission and sets time expectation",
      "follow_up": "If yes: brief value prop. If no: 'When would be a better time?'"
    },
    {
      "scenario": "Discovery call opening",
      "opener": "Thanks for taking the time. Before we dive in, what's your biggest challenge with [relevant area] right now?",
      "purpose": "Immediately focuses on their pain points",
      "follow_up": "Mirror or label their response to go deeper"
    }
  ],
  "objection_handlers": [
    {
      "objection": "It's too expensive",
      "response": "It seems like budget is a real concern for you. Help me understand - too expensive compared to what?",
      "technique_used": "Labeling + Calibrated Question",
      "example_dialogue": "Prospect: 'Your solution is too expensive.'\nSalesperson: 'Too expensive? (pause) It seems like budget is tight right now. What would need to change for this to make sense financially?'\nProspect: 'Well, if we could see ROI within 6 months...'"
    }
  ],
  "closing_techniques": [
    {
      "name": "The Calibrated Close",
      "when_to_use": "When they've expressed interest but haven't committed",
      "exact_words": "How do we move forward together on this?",
      "fallback": "What would need to happen for you to feel comfortable moving forward?"
    }
  ],
  "stage_guidance": {
    // Stage-specific coaching as shown in Step 3
  },
  "response_patterns": {
    // Pattern-based responses from Step 4
  },
  "advanced_combinations": {
    // Multi-step sequences from Step 5
  },
  "coaching_rules": {
    // Implementation guidelines from Step 6
  }
}
```

## VERIFICATION CHECKLIST:
- [ ] Each principle has COMPLETE structure with all required fields
- [ ] Every principle includes 3+ specific_examples with full dialogue
- [ ] Real-world scenarios cover at least 3 industries per principle
- [ ] Implementation guides have 3-5 actionable steps each
- [ ] Common mistakes listed for each principle (2-3 per)
- [ ] Coaching prompts include emoji prefixes (💡) for visual scanning
- [ ] Dialogue examples use "Prospect:" and "Salesperson:" format
- [ ] Every prompt is under 25 words for quick comprehension
- [ ] Conversation starters and objection handlers included
- [ ] Response patterns section has 4+ categories
- [ ] Advanced combinations has 3+ sequences
- [ ] Priority levels (HIGH/MEDIUM/LOW) assigned appropriately

## FINAL STEPS - SAVE:

After completing the analysis, save the resulting JSON file with this exact format:
- Filename: `[DocumentName]_Processed_[YYYY-MM-DD]_[HH-MM-SS].json`
- Example: `NeverSplit_Processed_2025-01-02_14-30-45.json`
- Location: Save to `D:\Projects\Ai\VoiceCoach-v2\rag\`

## EXPECTED RESULT:
A structured JSON file saved to the RAG folder that:
- Contains ALL 8 required sections
- Identifies all sales techniques in the document
- Provides real-time coaching prompts for each technique
- Includes response patterns for objection categories
- Has advanced combination sequences
- Maintains the 25-word limit for all suggestions
- Can be directly selected in VoiceCoach V2's document selector
- Will be used by Ollama for live coaching