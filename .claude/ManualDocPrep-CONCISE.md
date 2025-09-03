# SALES COACHING DOCUMENT ANALYZER - CONCISE FORMAT

You are analyzing a sales methodology document to extract actionable coaching prompts. Create a CONCISE, PRACTICAL output that salespeople can use during live calls.

## CRITICAL: BE CONCISE!
- **Descriptions**: Maximum 10 words
- **Coach prompts**: Maximum 25 words  
- **Implementation**: Simple bullet points
- **No academic language** - practical only

## OUTPUT STRUCTURE:

```json
{
  "document_analysis": {
    "techniques_found": 8,
    "actionable_prompts_created": 50+,
    "sales_stages_covered": 4
  },
  "techniques": [
    {
      "technique_name": "Mirroring",
      "description": "Repeat last 1-3 words as a question",
      "when_to_use": [
        {
          "trigger": "This seems really expensive",
          "prospect_says": "This seems really expensive for our budget",
          "coach_prompt": "Mirror: 'Really expensive?'",
          "salesperson_says": "Really expensive?",
          "expected_result": "Prospect elaborates on budget concerns"
        },
        // At least 5-7 examples per technique
      ],
      "implementation": {
        "max_words": 5,
        "action": "Repeat their last 3 words with questioning tone",
        "timing": "Immediately after they finish speaking"
      },
      "common_mistakes": [
        "Mirroring too frequently",
        "Repeating entire sentences",
        "Using flat tone instead of questioning"
      ],
      "urgency_level": "medium"
    }
  ],
  "stage_guidance": {
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
    },
    "closing": {
      "focus": "Move to commitment",
      "top_techniques": ["Calibrated Questions", "Summary"],
      "quick_prompts": [
        "Ask: 'How do we move forward?'",
        "Say: 'What would you need to see?'",
        "Ask: 'What's the next step?'"
      ]
    },
    "follow_up": {
      "focus": "Re-engage and progress",
      "top_techniques": ["Tactical Empathy", "Calibrated Questions"],
      "quick_prompts": [
        "Say: 'Following up on our conversation'",
        "Ask: 'What's changed since we spoke?'",
        "Mirror: 'Still evaluating?'"
      ]
    }
  },
  "quick_reference": {
    "most_useful_prompts": [
      "Mirror: '[last 3 words]?'",
      "Label: 'It seems like...'",
      "Ask: 'How can we solve this together?'",
      "Say: 'Help me understand...'",
      "Ask: 'What's your biggest concern?'"
    ]
  },
  "urgency_triggers": {
    "critical": ["I need to think about it", "We're going with competitor"],
    "high": ["Price is too high", "Not sure about ROI"],
    "medium": ["Tell me more about features", "How does this work?"]
  },
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
      "triggers": ["check with boss", "not my decision", "need approval"],
      "responses": [
        "Ask: 'Who else should we include?'",
        "Ask: 'How does approval work?'",
        "Say: 'What would they want to know?'"
      ]
    }
  },
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
  },
  "coaching_rules": {
    "max_prompt_length": 25,
    "response_time": "under_2_seconds",
    "clarity": "exact_words_to_say",
    "format": "conversational_phone_appropriate"
  }
}
```

## TECHNIQUE REQUIREMENTS:

For each Chris Voss technique, create:
1. **5-7 specific triggers** with exact prospect phrases
2. **Coach prompts under 25 words**
3. **Exact salesperson response** (what they literally say)
4. **Expected result** in 5-10 words

## CHRIS VOSS 8 TECHNIQUES (MUST INCLUDE ALL):
1. **Mirroring** - Repeat last 1-3 words as question
2. **Tactical Empathy** - Understand and voice their perspective
3. **Labeling** - Name emotions to diffuse tension
4. **Calibrated Questions** - How/What questions for control
5. **Accusation Audit** - Call out negatives upfront
6. **Late-Night FM DJ Voice** - Calm, slow tone
7. **No-Oriented Questions** - Get them to say "No"
8. **7-38-55 Rule** - 7% words, 38% tone, 55% body language

## QUALITY CHECKLIST:
✅ Every technique has 5+ trigger examples
✅ All prompts under 25 words
✅ Exact words provided (not descriptions)
✅ Response patterns cover 4+ objection types
✅ Stage guidance covers all 4 stages
✅ Total of 50+ actionable prompts created

## WHAT TO AVOID:
❌ Long academic descriptions
❌ Theory or background explanations
❌ Nested complex structures
❌ Vague instructions like "be empathetic"
❌ Multiple paragraph explanations

## FILENAME:
Save as: `[DocumentName]_Processed_[YYYY-MM-DD]_[HH-MM-SS].json`
Location: `D:\Projects\Ai\VoiceCoach-v2\rag\`