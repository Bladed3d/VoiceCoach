# PREDICTIVE SALES COACHING DOCUMENT ANALYZER - V4
## Real-Time Conversation Path Prediction System

You are analyzing sales methodology documents to create a **PREDICTIVE COACHING SYSTEM** that guides conversations forward, not just reacts to what was said.

## CRITICAL DIFFERENCE - PREDICTIVE VS REACTIVE:
- ❌ **OLD (Reactive)**: "They mentioned price, so use mirroring"
- ✅ **NEW (Predictive)**: "They said 'expensive' → Say 'Really expensive?' → They'll explain budget → Then say 'It sounds like budget is tight' → Ask 'What range works for you?'"

## THE 4-STEP PREDICTIVE FLOW:
1. **DETECT TRIGGER** - Exact words prospect says
2. **MATCH STRATEGY** - Which technique applies
3. **PROVIDE DIALOGUE** - Exact words to say NOW
4. **PREDICT PATH** - What happens next, 2-3 steps ahead

## OUTPUT STRUCTURE:

```json
{
  "document_analysis": {
    "techniques_found": 8,
    "conversation_paths_mapped": 100+,
    "sales_stages_covered": 4,
    "predictive_sequences": 50+
  },
  "predictive_techniques": [
    {
      "technique_name": "Mirroring",
      "description": "Repeat last 1-3 words as question",
      "conversation_paths": [
        {
          "trigger": "This seems really expensive",
          "current_situation": "Price objection detected",
          "immediate_response": {
            "strategy": "Mirror to get elaboration",
            "exact_words": "Really expensive?",
            "tone": "curious, not defensive"
          },
          "predicted_path": {
            "likely_prospect_response": "Yes, it's more than we budgeted for this quarter",
            "next_move": {
              "strategy": "Label their concern",
              "exact_words": "It sounds like the budget timing is the real challenge here",
              "why": "Shifts from price to timing"
            },
            "third_move": {
              "strategy": "Calibrated question",
              "exact_words": "What would need to happen to make this work within your budget cycle?",
              "expected_outcome": "They reveal budget process or timeline"
            }
          },
          "alternative_paths": [
            {
              "if_they_say": "We don't have that kind of money",
              "then_say": "Help me understand what you were expecting to invest",
              "leads_to": "Budget discovery"
            },
            {
              "if_they_say": "The competitor is half the price",
              "then_say": "Half the price... How do they structure that?",
              "leads_to": "Competitor comparison"
            }
          ],
          "confidence_score": 0.85
        },
        // 5-7 more conversation paths per technique
      ]
    }
  ],
  "conversation_flowcharts": {
    "price_objection_tree": {
      "root": "expensive/cost/budget mentioned",
      "branches": [
        {
          "path_name": "Mirror → Label → Calibrated Question",
          "steps": [
            {"say": "Really expensive?", "expect": "elaboration"},
            {"say": "Sounds like budget is tight", "expect": "confirmation"},
            {"say": "What would work for you?", "expect": "number or range"}
          ],
          "success_rate": 0.78
        },
        {
          "path_name": "Accusation Audit → Tactical Empathy → Reframe",
          "steps": [
            {"say": "You probably think I'm asking for too much", "expect": "defense drops"},
            {"say": "I understand budget is precious right now", "expect": "agreement"},
            {"say": "How do we structure this to work for both of us?", "expect": "collaboration"}
          ],
          "success_rate": 0.82
        }
      ]
    },
    "trust_objection_tree": {
      "root": "skeptical/don't believe/prove it",
      "branches": [
        {
          "path_name": "Label → Evidence → Calibrated Question",
          "steps": [
            {"say": "You're skeptical, and that's smart", "expect": "Opens up"},
            {"say": "Let me show you how Client X got results", "expect": "Interest"},
            {"say": "What metrics matter most to you?", "expect": "Reveals KPIs"}
          ]
        }
      ]
    }
  },
  "pattern_matching_rules": {
    "price_patterns": {
      "triggers": ["expensive", "cost", "budget", "afford", "price", "investment", "cheaper"],
      "immediate_strategies": [
        {
          "trigger_phrase": "too expensive",
          "exact_response": "Too expensive?",
          "next_step": "Wait for elaboration, then label",
          "path_confidence": 0.9
        },
        {
          "trigger_phrase": "over budget",
          "exact_response": "Help me understand your budget range",
          "next_step": "Listen for number, then provide options",
          "path_confidence": 0.85
        }
      ]
    },
    "stall_patterns": {
      "triggers": ["think about it", "need time", "not sure", "maybe later"],
      "immediate_strategies": [
        {
          "trigger_phrase": "need to think about it",
          "exact_response": "Of course. What specifically do you need to think through?",
          "next_step": "They'll reveal true objection",
          "follow_up": "Address the real concern they mention",
          "path_confidence": 0.88
        }
      ]
    }
  },
  "live_coaching_engine": {
    "detection_rules": [
      {
        "if_transcript_contains": ["expensive", "cost too much", "over budget"],
        "then_suggest": {
          "immediate": "Mirror: '[their last words about price]?'",
          "after_they_respond": "Label: 'Sounds like budget is the main concern'",
          "to_close": "Ask: 'What would need to change to make this work?'"
        }
      },
      {
        "if_transcript_contains": ["not sure", "don't know", "maybe"],
        "then_suggest": {
          "immediate": "Ask: 'What's causing the hesitation?'",
          "after_they_respond": "Mirror their concern",
          "to_close": "Ask: 'What would you need to see to feel confident?'"
        }
      }
    ],
    "response_timing": {
      "immediate": "0-2 seconds after trigger",
      "follow_up": "After prospect responds",
      "closing": "When moving to commitment"
    }
  },
  "stage_specific_paths": {
    "discovery": {
      "goal": "Uncover 3+ pain points",
      "conversation_starters": [
        {
          "open_with": "What brought you to look at solutions like this?",
          "if_vague": "Tell me more about that",
          "if_specific": "How is that impacting your team?",
          "target": "Get emotional investment"
        }
      ],
      "path_progression": [
        "Surface problem → Explore impact → Quantify pain → Vision of solution"
      ]
    },
    "objection_handling": {
      "goal": "Transform objection into collaboration",
      "common_paths": [
        {
          "objection_type": "price",
          "sequence": "Mirror → Label → Reframe as investment → Calibrated question"
        },
        {
          "objection_type": "authority",
          "sequence": "Acknowledge → Ask about process → Offer to help → Include stakeholders"
        }
      ]
    },
    "closing": {
      "goal": "Natural commitment without pressure",
      "closing_paths": [
        {
          "buying_signals": ["how does this work", "what's next", "when can we start"],
          "response_sequence": [
            "Mirror excitement: 'Ready to get started?'",
            "Outline simple next steps",
            "Ask: 'Which option works better for you?'"
          ]
        }
      ]
    }
  },
  "advanced_predictive_patterns": {
    "multi_turn_sequences": [
      {
        "name": "Price to Value Journey",
        "turns": [
          {"prospect": "expensive", "you": "Really expensive?"},
          {"prospect": "yes, more than expected", "you": "What were you expecting?"},
          {"prospect": "[number]", "you": "If we could get close to that, what else would you need?"},
          {"prospect": "[reveals needs]", "you": "So if we solve [need] within [budget], we move forward?"},
          {"outcome": "Conditional close achieved"}
        ]
      },
      {
        "name": "Trust Building Sequence",
        "turns": [
          {"prospect": "How do I know this works?", "you": "That's the right question to ask"},
          {"prospect": "[elaborates concern]", "you": "You're concerned about [specific risk]"},
          {"prospect": "Yes, exactly", "you": "What would convince you we can deliver?"},
          {"prospect": "[evidence needed]", "you": "Let me show you exactly that..."},
          {"outcome": "Trust established through evidence"}
        ]
      }
    ]
  },
  "real_time_coaching_format": {
    "display_structure": {
      "line_1": "🎯 Trigger: [what they just said]",
      "line_2": "💬 Say Now: [exact words, max 25]",
      "line_3": "➡️ They'll Likely: [predicted response]",
      "line_4": "📋 Then Say: [next move]",
      "line_5": "🎪 Goal: [where this leads]"
    },
    "example_output": {
      "line_1": "🎯 Trigger: 'This seems really expensive'",
      "line_2": "💬 Say Now: 'Really expensive?'",
      "line_3": "➡️ They'll Likely: Explain budget constraints",
      "line_4": "📋 Then Say: 'What range would work?'",
      "line_5": "🎪 Goal: Get to specific numbers"
    }
  },
  "quality_metrics": {
    "predictive_accuracy": "Track if predicted responses match actual",
    "path_completion_rate": "How often full sequences complete",
    "conversion_impact": "Which paths lead to closes",
    "timing_precision": "Response delivered within 2 seconds"
  }
}
```

## EXTRACTION REQUIREMENTS:

### For Each Technique (8 Required):
1. **7-10 Conversation Paths** with full prediction sequences
2. **Alternative Branches** for different prospect responses  
3. **Exact Dialogue** at each step (not descriptions)
4. **Confidence Scores** based on pattern strength

### For Each Conversation Path:
1. **Trigger** - Exact phrase that starts this path
2. **Immediate Response** - What to say within 2 seconds
3. **Predicted Response** - What prospect will likely say
4. **Next 2-3 Moves** - Complete the conversation arc
5. **Alternative Paths** - If prospect responds differently

## CHRIS VOSS TECHNIQUES TO MAP:
1. **Mirroring** - Paths for getting elaboration
2. **Tactical Empathy** - Paths for building trust
3. **Labeling** - Paths for emotional diffusion
4. **Calibrated Questions** - Paths for control
5. **Accusation Audit** - Paths for disarming
6. **Late-Night FM DJ Voice** - When/how to slow down
7. **No-Oriented Questions** - Paths to productive "No"
8. **Black Swan Discovery** - Paths to hidden information

## PREDICTIVE QUALITY CHECKLIST:
✅ Each technique has 7+ complete conversation paths
✅ Every path predicts 2-3 moves ahead
✅ Alternative branches for different responses
✅ Exact words provided (max 25 per response)
✅ Timing specified (immediate/follow-up/closing)
✅ 100+ total conversation paths mapped
✅ Confidence scores for each path

## WHAT MAKES THIS PREDICTIVE:
✅ **Shows what happens NEXT**, not just now
✅ **Multiple paths** from each trigger point
✅ **Exact dialogue** for entire sequences
✅ **If/Then branches** for variations
✅ **Success rates** from pattern analysis
✅ **Complete conversation arcs**, not fragments

## AVOID:
❌ Single-response suggestions without follow-up
❌ Generic advice without exact words
❌ Reactive coaching that doesn't predict
❌ Theory without practical application
❌ Descriptions instead of dialogue

## INTEGRATION WITH OLLAMA:

When Ollama receives this processed document, it can:
1. **Match current transcript** to a trigger
2. **Select the best path** based on context
3. **Provide immediate response** with exact words
4. **Show predicted outcome** to guide strategy
5. **Offer next steps** to maintain momentum

## FILENAME:
Save as: `[DocumentName]_Predictive_[YYYY-MM-DD]_[HH-MM-SS].json`
Location: `D:\Projects\Ai\VoiceCoach-v2\rag
## SUCCESS METRIC:
The salesperson should feel like they have a **GPS for the conversation** - always knowing:
- Where they are
- What to say next
- Where it's leading
- Alternative routes available

This creates the "one step ahead" feeling that made the old app so effective!