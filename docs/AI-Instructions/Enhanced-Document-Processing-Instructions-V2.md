# VoiceCoach V2: Enhanced AI Document Processing Instructions
## Based on Proven Old VoiceCoach Success Patterns

**Purpose:** Transform sales documents into structured coaching knowledge that enables Ollama to provide the same high-quality, contextual coaching that made the old VoiceCoach system so effective.

**Critical Success Factor:** The old VoiceCoach succeeded because it gave Ollama rich sales context (stage, objections, duration) + structured response requirements + comprehensive response frameworks. We must replicate this.

---

## **CRITICAL DIFFERENCE FROM V1 INSTRUCTIONS**

The old VoiceCoach's success came from:
1. **Sales Stage Context** - Always knowing WHERE in the sales process
2. **Structured JSON Responses** - Forcing specific, actionable output
3. **Response Frameworks** - Exact wording for every situation
4. **Urgency Levels** - Knowing WHEN to intervene
5. **Supporting Evidence** - WHY this suggestion matters now

---

## **PHASE 1: STRUCTURED KNOWLEDGE EXTRACTION**

### **1.1 Sales Stage Mapping (CRITICAL)**
Every technique MUST be mapped to specific sales stages:

```json
{
  "technique": "Mirroring last 3 words",
  "applicable_stages": {
    "discovery": { "effectiveness": 0.9, "priority": "HIGH" },
    "objection_handling": { "effectiveness": 0.8, "priority": "MEDIUM" },
    "closing": { "effectiveness": 0.4, "priority": "LOW" }
  },
  "stage_specific_usage": {
    "discovery": "Use to encourage prospect to elaborate on pain points",
    "objection_handling": "Mirror their concern to show understanding",
    "closing": "Less effective - be more direct at this stage"
  }
}
```

### **1.2 Objection Response Framework (MANDATORY)**
Extract EVERY objection with the EXACT 3-step framework:

```json
{
  "objection": "It's too expensive",
  "category": "pricing",
  "urgency": "HIGH",
  "response_framework": {
    "acknowledge": "I understand price is an important consideration.",
    "isolate": "If we could work out the investment to fit your budget, would you move forward?",
    "value": "Let's look at the ROI you'll see in the first 90 days..."
  },
  "follow_up_questions": [
    "What budget range were you thinking?",
    "What's the cost of not solving this problem?",
    "How does this compare to your current spend on [alternative]?"
  ],
  "supporting_data": {
    "roi_calculation": "Average customer sees 3.2x ROI in 90 days",
    "cost_breakdown": "$X per day - less than a cup of coffee",
    "comparison": "50% less than competitor solutions"
  }
}
```

### **1.3 Buying Signal Detection Patterns**
Extract phrases that indicate movement toward purchase:

```json
{
  "buying_signals": {
    "high_intent": [
      "How soon can we start?",
      "What are the next steps?",
      "Can you send me a proposal?"
    ],
    "medium_intent": [
      "This could help us with...",
      "I like the idea of...",
      "My team would benefit from..."
    ],
    "exploration": [
      "Tell me more about...",
      "How does this work exactly?",
      "What other companies use this?"
    ]
  },
  "coaching_response": {
    "high_intent": "Move to closing - ask for specific commitment",
    "medium_intent": "Deepen value discussion - connect to specific pain",
    "exploration": "Continue discovery - uncover decision criteria"
  }
}
```

### **1.4 Conversation Context Triggers**
Map EXACT phrases to coaching interventions:

```json
{
  "trigger_phrase": "I need to think about it",
  "detection_variations": [
    "Let me think about it",
    "I'll need to consider this",
    "Need time to think"
  ],
  "sales_stage": "closing",
  "urgency_level": "CRITICAL",
  "coaching_prompt": {
    "primary_suggestion": "Ask: 'What specifically would you like to think through? I'm happy to address any concerns now.'",
    "supporting_evidence": [
      "85% of 'think about it' responses are unaddressed objections",
      "Immediate clarification increases close rate by 40%"
    ],
    "next_best_actions": [
      "Identify the real objection hiding behind hesitation",
      "Schedule a specific follow-up time before ending call",
      "Offer to send summary of key points discussed"
    ]
  }
}
```

---

## **PHASE 2: COACHING INTELLIGENCE STRUCTURE**

### **2.1 Mandatory Response Format**
Every coaching element MUST include:

```json
{
  "primary_suggestion": "[Specific action in 1-2 sentences]",
  "confidence_score": 0.0-1.0,
  "prompt_type": "objection_handling|discovery|demo|closing|rapport",
  "urgency_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "supporting_evidence": [
    "Statistical or logical reason 1",
    "Statistical or logical reason 2"
  ],
  "next_best_actions": [
    "Specific action 1",
    "Specific action 2",
    "Specific action 3"
  ],
  "exact_phrases": {
    "option_1": "[Exact words to say]",
    "option_2": "[Alternative phrasing]"
  },
  "avoid_phrases": [
    "Don't say: [phrase that kills deals]"
  ]
}
```

### **2.2 Sales Methodology Integration**
Connect every technique to proven methodologies:

```json
{
  "technique": "Calibrated Questions",
  "methodology_source": "Chris Voss - Never Split the Difference",
  "sales_application": {
    "SPIN": "Use as Problem questions to uncover implications",
    "MEDDIC": "Identify Decision criteria and Decision process",
    "Challenger": "Take control while appearing collaborative",
    "Sandler": "Uncover pain without being aggressive"
  },
  "example_questions": {
    "discovery": "How does this challenge impact your team's productivity?",
    "objection": "What would need to happen for this to work for you?",
    "closing": "What's your timeline for solving this problem?"
  }
}
```

### **2.3 Sentiment and Emotional State Mapping**
Include emotional intelligence in coaching:

```json
{
  "emotional_indicators": {
    "frustration": ["This is ridiculous", "I don't have time", "Why is this so complicated"],
    "interest": ["Tell me more", "How does that work", "Interesting"],
    "skepticism": ["I doubt that", "Sounds too good", "How can you prove"],
    "urgency": ["We need this now", "ASAP", "Critical priority"]
  },
  "coaching_adjustments": {
    "frustration": {
      "tone": "Slow down, use calming voice",
      "action": "Acknowledge frustration explicitly",
      "phrase": "I can hear this has been frustrating. Let's simplify..."
    },
    "skepticism": {
      "tone": "Confident but not pushy",
      "action": "Provide proof immediately",
      "phrase": "I understand your skepticism. Let me share a case study..."
    }
  }
}
```

---

## **PHASE 3: REAL-TIME COACHING OPTIMIZATION**

### **3.1 Context Awareness Requirements**
Every coaching suggestion MUST consider:

```json
{
  "context_factors": {
    "sales_stage": "[Current stage in sales process]",
    "call_duration": "[Minutes into the call]",
    "objections_raised": ["List of objections mentioned"],
    "topics_discussed": ["Product features", "Pricing", "Timeline"],
    "participant_sentiment": {
      "prospect": "interested|neutral|resistant",
      "salesperson": "confident|struggling|passive"
    }
  },
  "coaching_adjustment": "Tailor suggestion based on context",
  "priority_override": "If call_duration > 30min and no progress, increase urgency"
}
```

### **3.2 Response Time Optimization**
Structure for <2 second Ollama response:

```json
{
  "quick_triggers": {
    "price_mentioned": {
      "instant_response": "Switch to value discussion",
      "backup_response": "Ask about budget process"
    },
    "competitor_mentioned": {
      "instant_response": "Acknowledge and differentiate",
      "backup_response": "Ask what they like about competitor"
    }
  },
  "pre_computed_responses": true,
  "max_analysis_depth": "shallow|deep based on urgency"
}
```

### **3.3 Progressive Disclosure Strategy**
Don't overwhelm - provide coaching in stages:

```json
{
  "coaching_progression": {
    "immediate": "Do this RIGHT NOW",
    "next_30_seconds": "Prepare to do this",
    "next_2_minutes": "Watch for opportunity to do this",
    "post_call": "Follow up with this"
  },
  "complexity_levels": {
    "beginner": "Simple, direct actions only",
    "intermediate": "Include tactical adjustments",
    "advanced": "Complex multi-step strategies"
  }
}
```

---

## **PHASE 4: NEVER SPLIT THE DIFFERENCE FRAMEWORK**

### **4.1 Core Techniques Extraction**
For the Never Split the Difference content specifically:

```json
{
  "voss_techniques": {
    "mirroring": {
      "definition": "Repeat last 1-3 words as question",
      "sales_application": "Build rapport in discovery phase",
      "example": "Prospect: 'We need better results.' You: 'Better results?'",
      "effectiveness_by_stage": {
        "discovery": 0.9,
        "objection": 0.7,
        "closing": 0.4
      }
    },
    "labeling": {
      "definition": "Name their emotion to diffuse it",
      "sales_application": "Handle emotional objections",
      "example": "It sounds like you're frustrated with your current solution",
      "trigger_emotions": ["frustration", "concern", "excitement", "hesitation"]
    },
    "calibrated_questions": {
      "definition": "Open-ended how/what questions for control",
      "sales_application": "Guide prospect to self-discovery",
      "power_questions": [
        "How am I supposed to do that?",
        "What's the biggest challenge you face?",
        "How does this fit your priorities?",
        "What happens if you do nothing?"
      ]
    },
    "accusation_audit": {
      "definition": "List negatives about yourself first",
      "sales_application": "Disarm price objections preemptively",
      "example": "You probably think I'm trying to sell you something expensive that you don't need...",
      "when_to_use": "Before presenting price or addressing skepticism"
    }
  }
}
```

### **4.2 Tactical Empathy Frameworks**
Structure empathy for sales success:

```json
{
  "tactical_empathy": {
    "formula": "Recognize + Articulate + Validate",
    "examples": {
      "price_concern": {
        "recognize": "I can see you're concerned about the investment",
        "articulate": "You're wondering if the value justifies the cost",
        "validate": "That's exactly the right question to be asking"
      },
      "authority_objection": {
        "recognize": "I understand you need buy-in from others",
        "articulate": "You want to make sure everyone's on board",
        "validate": "That's smart - big decisions need consensus"
      }
    }
  }
}
```

---

## **PHASE 5: OUTPUT STRUCTURE FOR OLLAMA**

### **5.1 Primary Coaching Database**
Create this exact structure for Ollama consumption:

```json
{
  "coaching_database": {
    "objection_handlers": {
      "[objection_key]": {
        "exact_response": "[Word-for-word response]",
        "follow_up": "[Next question]",
        "urgency": "CRITICAL",
        "success_rate": 0.75
      }
    },
    "stage_transitions": {
      "discovery_to_demo": {
        "trigger": "Prospect shows interest in specific feature",
        "action": "Offer to show how it works",
        "phrase": "Would it be helpful if I showed you exactly how this addresses [their pain]?"
      }
    },
    "buying_signals": {
      "[signal_phrase]": {
        "interpretation": "High purchase intent",
        "response": "Move to closing immediately",
        "closing_question": "What would need to happen for us to move forward?"
      }
    }
  }
}
```

### **5.2 System Prompt Template**
Generate this template for Ollama:

```
You are VoiceCoach, providing real-time sales coaching during live calls.

CURRENT CONTEXT:
- Sales Stage: {sales_stage}
- Call Duration: {duration} minutes
- Recent Objections: {objections}
- Detected Emotions: {emotions}
- Topics Discussed: {topics}

COACHING OBJECTIVES:
1. Provide ONE specific, actionable suggestion
2. Include exact words to say
3. Consider emotional state and timing
4. Focus on advancing the sale

AVAILABLE TECHNIQUES:
{relevant_techniques_for_stage}

RESPONSE FORMAT:
{
  "primary_suggestion": "Specific action with exact words",
  "urgency_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "confidence_score": 0.0-1.0,
  "supporting_evidence": ["Reason 1", "Reason 2"],
  "next_best_actions": ["Action 1", "Action 2", "Action 3"]
}

CRITICAL: Response must be under 100 words and actionable within 5 seconds.
```

---

## **VALIDATION CHECKLIST**

Before submitting processed output, verify:

✅ **Every objection has 3-part response framework (Acknowledge, Isolate, Value)**
✅ **All techniques mapped to specific sales stages with effectiveness scores**
✅ **Buying signals identified with exact phrases and responses**
✅ **Emotional indicators included with coaching adjustments**
✅ **System prompt template includes all context variables**
✅ **Response format enforces structure that made old VoiceCoach successful**
✅ **Chris Voss techniques properly adapted for sales context**
✅ **Urgency levels assigned to all coaching elements**
✅ **Exact phrases provided (not vague guidance)**
✅ **Supporting evidence included for credibility**

---

## **CRITICAL SUCCESS METRICS**

Your processing is successful if:
1. **Ollama receives same context richness as old VoiceCoach** (stage, duration, objections, emotions)
2. **Response structure forces specific, actionable output** (not generic advice)
3. **Every situation has exact response framework** (word-for-word phrases)
4. **Coaching matches sales stage and urgency** (right advice at right time)
5. **Supporting evidence builds trust** (statistics, logic, methodology)

---

## **REMEMBER**

The old VoiceCoach succeeded because it made Ollama smart about:
- **WHERE** they were (sales stage)
- **WHAT** was happening (objections, emotions)
- **HOW** to respond (exact frameworks)
- **WHEN** to act (urgency levels)
- **WHY** it matters (supporting evidence)

Your processing must provide ALL these elements for V2 to match the old system's effectiveness.