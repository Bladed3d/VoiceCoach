# Claude RAG Instructions for Stage-Based Predictive Coaching

## Your Task
Transform this sales document into a STAGE-BASED coaching system optimized for real-time predictive prompts. Create JavaScript memory objects that can deliver coaching suggestions in <200ms during live sales calls.

## Critical Requirement
**SIMPLICITY IS GENIUS** - Create the simplest possible structure that still delivers predictive, contextual coaching. No complex hierarchies, no unnecessary nesting, just clean objects that work.

## Output Format

You must produce a SINGLE JavaScript object that can be directly used in memory for instant coaching. Structure it EXACTLY as follows:

```javascript
const coachingSystem = {
  // STAGE DEFINITIONS with progression logic
  stages: {
    opening: {
      name: "Opening & Rapport",
      keywords: ["hello", "hi", "thanks for", "appreciate", "time", "calling about", "reaching out"],
      duration: "1-2 minutes",
      goal: "Build rapport and set agenda",
      
      // EXIT CRITERIA - what must happen to move forward
      exitCriteria: [
        "rapport established",
        "agenda confirmed",
        "permission to explore granted"
      ],
      
      // BRIDGE QUESTIONS to advance to discovery
      bridges: [
        {
          text: "Before we dive in, can you help me understand your current [topic] situation?",
          priority: "HIGH" // CRITICAL/HIGH/STANDARD
        },
        {
          text: "What brought you to explore [solution category] at this time?",
          priority: "CRITICAL"
        },
        {
          text: "I appreciate your time today. What's the biggest [topic] priority for you right now?",
          priority: "HIGH"
        }
      ],
      
      // RECOVERY PROMPTS if conversation stalls
      recovery: [
        "How can I best use our time together today?",
        "What would make this conversation valuable for you?"
      ]
    },
    
    discovery: {
      name: "Discovery & Pain Points",
      keywords: ["challenge", "problem", "struggling", "difficult", "issue", "concern", "frustrated", "pain point"],
      duration: "5-8 minutes",
      goal: "Uncover pain points and quantify impact",
      
      exitCriteria: [
        "primary pain identified",
        "impact quantified",
        "urgency established"
      ],
      
      // BRIDGES to advance to presentation
      bridges: [
        "Based on what you've shared about [specific pain], would it be helpful if I showed you how others have solved this?",
        "You mentioned [problem] is costing you [impact]. Can I show you our approach to fixing that?",
        "It sounds like [pain point] is urgent. Should we explore potential solutions?"
      ],
      
      // DEEPENING QUESTIONS to explore current stage
      deepening: [
        "How long has [problem] been affecting your team?",
        "What happens if this doesn't get resolved in the next [timeframe]?",
        "On a scale of 1-10, how critical is solving [problem] right now?",
        "What's the impact of [problem] on your [revenue/operations/team]?",
        "Have you budgeted for solving this problem?"
      ],
      
      recovery: [
        "What's your biggest priority with [topic] right now?",
        "If you could wave a magic wand and fix one thing, what would it be?"
      ]
    },
    
    presentation: {
      name: "Solution Presentation",
      keywords: ["show me", "how does", "demo", "see it", "solution", "features", "capabilities", "pricing"],
      duration: "8-12 minutes",
      goal: "Present solution connected to their pain",
      
      exitCriteria: [
        "solution presented",
        "value understood",
        "fit confirmed"
      ],
      
      // BRIDGES to advance to objection handling or closing
      bridges: [
        "How do you see this fitting into your current process?",
        "Based on what you've seen, what questions do you have?",
        "Does this address the [specific pain] you mentioned?",
        "What would need to be true for this to work for you?"
      ],
      
      // CONNECTION PHRASES to tie back to their pain
      connections: [
        "You mentioned [pain] earlier - here's exactly how we solve that...",
        "This directly addresses your concern about [specific issue]...",
        "Remember when you said [problem]? This feature specifically handles that..."
      ],
      
      recovery: [
        "What part would be most valuable for your team?",
        "Which aspect addresses your biggest concern?"
      ]
    },
    
    objection: {
      name: "Objection Handling",
      keywords: ["concerned", "worried", "expensive", "not sure", "problem with", "but", "however", "budget", "timing"],
      duration: "3-5 minutes per objection",
      goal: "Address concerns and rebuild value",
      
      exitCriteria: [
        "objection acknowledged",
        "concern addressed",
        "value reestablished"
      ],
      
      // BRIDGES to advance to closing
      bridges: [
        "I appreciate you sharing that concern. Given what we've discussed, what would you need to see to move forward?",
        "That's a valid point. If we could address [objection], would you be ready to proceed?",
        "I understand. Let's figure out how to make this work for you. What would that look like?"
      ],
      
      // OBJECTION RESPONSES by type
      responses: {
        price: [
          "I understand price is important. What would doing nothing cost you over the next year?",
          "Let's look at the ROI. You said [problem] costs you [amount] monthly...",
          "What budget did you have in mind for solving [problem]?"
        ],
        timing: [
          "When would be the ideal time to implement this?",
          "What needs to happen first before you can move forward?",
          "You mentioned [urgent problem] - how does waiting affect that?"
        ],
        authority: [
          "Who else needs to be involved in this decision?",
          "What would [decision maker] need to know to approve this?",
          "Should we schedule a follow-up with your team?"
        ]
      },
      
      recovery: [
        "What's your biggest concern about moving forward?",
        "Help me understand what's holding you back?"
      ]
    },
    
    closing: {
      name: "Closing & Next Steps",
      keywords: ["ready", "move forward", "next steps", "agreement", "start", "begin", "implement", "decision"],
      duration: "2-3 minutes",
      goal: "Secure commitment and define next steps",
      
      exitCriteria: [
        "commitment secured",
        "next steps defined",
        "timeline agreed"
      ],
      
      // CLOSING QUESTIONS
      bridges: [
        "Based on everything we've discussed, are you ready to move forward?",
        "What questions do you have before we get started?",
        "Should we go ahead and schedule implementation for [date]?",
        "How does [start date] work for your team?"
      ],
      
      // ASSUMPTIVE CLOSES
      assumptive: [
        "I'll send over the agreement right after this call. Which email should I use?",
        "For implementation, would Tuesday or Thursday work better?",
        "Will you be the main contact, or should I include someone else?"
      ],
      
      recovery: [
        "What would need to happen for you to move forward today?",
        "Is there anything preventing us from getting started?"
      ]
    }
  },
  
  // STAGE PROGRESSION RULES
  progressions: {
    "opening->discovery": {
      triggers: ["understand", "situation", "help me", "tell me about"],
      minDuration: 60, // seconds
      requiredCriteria: 1 // need at least 1 exit criterion met
    },
    "discovery->presentation": {
      triggers: ["show me", "how do you", "what does", "solution"],
      minDuration: 180,
      requiredCriteria: 2
    },
    "presentation->objection": {
      triggers: ["concern", "but", "however", "worried", "expensive"],
      minDuration: 300,
      requiredCriteria: 2
    },
    "presentation->closing": {
      triggers: ["ready", "let's do it", "sounds good", "move forward"],
      minDuration: 300,
      requiredCriteria: 3
    },
    "objection->closing": {
      triggers: ["makes sense", "okay", "I see", "that works"],
      minDuration: 60,
      requiredCriteria: 2
    }
  },
  
  // CUSTOMER TYPES AND PERSONAS (if document describes different customer types)
  customerTypes: {
    // Extract any customer classifications from the document
    // Example structure:
    /*
    "analytical": {
      characteristics: ["needs data", "asks detailed questions", "slow decisions"],
      approach: "Provide evidence, ROI calculations, detailed specs",
      avoid: "Pushing for quick decisions, emotional appeals",
      bridges: [
        "I have the data you're looking for. What metrics matter most to you?",
        "Let me show you the ROI calculation for your specific situation"
      ]
    }
    */
  },
  
  // PSYCHOLOGICAL INDICATORS (behavioral cues to watch for)
  psychologicalIndicators: {
    // Extract any behavioral patterns mentioned
    // Example structure:
    /*
    "repeated_objections": {
      pattern: "Same concern raised multiple ways",
      meaning: "Hidden fear or unaddressed concern",
      response: "Stop selling and ask: 'What's really concerning you about this?'"
    }
    */
  },
  
  // STRATEGIC FRAMEWORKS (systematic approaches from document)
  frameworks: {
    // Extract any multi-step processes or methodologies
    // Example structure:
    /*
    "objection_handling_framework": {
      name: "3-Step Objection Process",
      steps: ["Acknowledge", "Explore", "Reframe"],
      application: "Use for any customer concern",
      example: "Price objection: 'I hear you on price (acknowledge). Help me understand your budget constraints (explore). Let's look at the ROI rather than just cost (reframe).'"
    }
    */
  },
  
  // PRE-CALL PREPARATION (if document includes preparation strategies)
  preCall: {
    research: [], // What to research before calls
    preparation: [], // How to prepare
    frameworks: [] // Any preparation methodologies
  },
  
  // UNIVERSAL PATTERNS that work across all stages
  universal: {
    // CHRIS VOSS TECHNIQUES (if mentioned in document)
    mirroring: {
      pattern: "Repeat last 1-3 words as a question",
      example: "Customer: 'The price is too high.' You: 'Too high?'",
      when: "When you need them to elaborate"
    },
    labeling: {
      pattern: "It seems like/sounds like/looks like...",
      example: "It sounds like you're concerned about implementation time?",
      when: "To acknowledge emotions and concerns"
    },
    calibrated_questions: {
      pattern: "How/What questions that give them control",
      examples: [
        "How can we make this work for you?",
        "What would you need to see to move forward?",
        "How do you want to proceed?"
      ],
      when: "To maintain control while seeming to give it"
    },
    
    // CONVERSATION STALLERS
    stalled_indicators: [
      "silence for 5+ seconds",
      "short one-word answers",
      "repeated 'I don't know'",
      "off-topic tangents"
    ],
    
    stall_recovery: [
      "What's your biggest priority with [topic] right now?",
      "If we could solve one problem today, what would it be?",
      "What brought you to explore [solution] in the first place?"
    ]
  },
  
  // METADATA for the system
  metadata: {
    source_document: "[Document filename]",
    processing_date: new Date().toISOString(),
    total_techniques: 0, // Count of all techniques extracted
    industries_covered: [], // List of industries mentioned
    specific_products: [], // Any specific products/services mentioned
  }
};
```

## Processing Instructions

### STEP 1: Identify Sales Methodology
First, identify which sales methodology the document teaches (Chris Voss, SPIN, Challenger, Sandler, etc.). This determines how you structure the techniques within each stage.

### STEP 2: Extract Stage-Specific Content
For EACH sales stage (opening → discovery → presentation → objection → closing):

1. **Find ALL techniques** that apply to this stage
2. **Convert to BRIDGE QUESTIONS** - actual words salespeople can say
3. **Identify EXIT CRITERIA** - what indicates readiness for next stage
4. **Extract RECOVERY PROMPTS** - what to say when stuck

### STEP 3: Create Predictive Patterns
For each technique or principle in the document:
- WHERE in the sales cycle is it used?
- WHAT triggers its use? (keywords, situations)
- HOW does it advance the conversation?
- WHAT'S the next logical step after using it?

### STEP 4: Simplify Ruthlessly
- NO nested objects beyond 2 levels
- NO complex data structures
- NO redundant information
- ONLY actionable, speakable phrases

## Critical Extraction Rules

### Rule 1: Everything Must Be SPEAKABLE
❌ BAD: "Utilize tactical empathy to understand their position"
✅ GOOD: "It sounds like you're frustrated with your current solution?"

### Rule 2: Context Triggers Are Essential
For every coaching suggestion, identify:
- WHEN to use it (keywords that trigger it)
- WHY it works (brief explanation)
- WHAT comes next (the bridge to next stage)
- PRIORITY level (CRITICAL/HIGH/STANDARD)

### Rule 3: Maintain Document Authenticity
- Use the EXACT terminology from the document
- Preserve specific examples and scripts
- Keep industry-specific variations
- Don't add generic sales advice not in the document

### Rule 4: Optimize for Speed
- Short, punchy phrases (max 30 words)
- Clear trigger keywords (for instant matching)
- No complex decision trees
- Direct progression paths

## Validation Checklist

Before returning your JSON, verify:

✅ **Every stage has:**
- At least 5 trigger keywords
- At least 3 bridge questions
- At least 2 recovery prompts
- Clear exit criteria
- Goal and duration

✅ **Every bridge question:**
- Is under 30 words
- Is a complete, speakable sentence
- Includes [bracketed] placeholders for customization
- Advances toward the next stage

✅ **The structure:**
- Can be loaded directly into JavaScript memory
- Has no circular references
- Uses simple strings and arrays
- Follows the exact format provided

✅ **Coverage:**
- All major techniques from document are included
- Document's methodology is clearly represented
- Industry-specific examples are preserved
- Special terminology is maintained

## Example Extraction

If the document says:
> "When a prospect mentions budget concerns, acknowledge their fiscal responsibility while shifting focus to ROI. For example, say something like 'I appreciate that you're being thoughtful about the investment. Let me ask - what's the cost of not solving this problem?'"

You extract:
```javascript
objection: {
  responses: {
    price: [
      "I appreciate that you're being thoughtful about the investment. What's the cost of not solving this problem?"
    ]
  }
}
```

## Final Note

Remember: The goal is PREDICTIVE COACHING. Every element should help predict what to say next based on where we are in the conversation. The simpler the structure, the faster the coaching.

**Output only the JavaScript object. No explanation, no commentary, just the coachingSystem object.**