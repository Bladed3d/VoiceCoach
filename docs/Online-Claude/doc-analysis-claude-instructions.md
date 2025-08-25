# Universal Claude Instructions for Real-Time Coaching Knowledge Base Extraction

## PRIMARY OBJECTIVE
Transform ANY document into an actionable knowledge base for real-time coaching during live sales conversations. Extract EVERY element that can provide immediate, practical guidance to sales professionals.

## UNIVERSAL ANALYSIS FRAMEWORK

### Phase 1: Document Classification & Deep Extraction

#### A. Document Type Detection
First, identify the document type and adapt extraction accordingly:
- **Methodology/Strategy Documents**: Extract techniques, principles, frameworks
- **Product/Service Documentation**: Extract features, benefits, specifications, use cases
- **Company/Policy Documents**: Extract rules, procedures, guidelines, standards
- **Case Studies/Examples**: Extract scenarios, outcomes, lessons learned
- **Technical Documentation**: Extract specifications, processes, troubleshooting steps
- **Training Materials**: Extract skills, competencies, best practices

#### B. Universal Extraction Requirements

For ANY document, extract ALL of the following that apply:

##### 1. Core Concepts/Principles
- **Concept Name**: Official term or principle name
- **Clear Definition**: 1-2 sentence explanation in plain language
- **Why It Matters**: The underlying reason/mechanism (psychological, technical, business)
- **When to Apply**: Specific triggers, situations, or conversation moments
- **How to Apply**: Step-by-step implementation
- **What to Say**: Exact phrases, questions, or statements (minimum 5-10 per concept)
- **What NOT to Do**: Common mistakes and why to avoid them
- **Success Metrics**: How to recognize when it's working

##### 2. Actionable Content Extraction
Extract EVERYTHING that can be used in real-time:
- **Specific Phrases**: Word-for-word language to use
- **Questions to Ask**: Both open-ended and closed-ended
- **Responses to Common Situations**: If/then scenarios
- **Objection Handlers**: Counter-arguments and rebuttals
- **Transition Statements**: How to move between topics
- **Examples and Analogies**: Stories or comparisons to clarify points
- **Data Points**: Statistics, metrics, proof points
- **Decision Criteria**: Factors to evaluate options

##### 3. Contextual Mapping
For each extracted element, identify:
- **Conversation Stage**: Discovery, Presentation, Objection Handling, Closing, Follow-up
- **Customer Type**: Technical buyer, Economic buyer, End user, Champion, Skeptic
- **Urgency Level**: Immediate response needed, Can wait, Proactive suggestion
- **Confidence Level**: Must use exactly as stated, Can be adapted, General guidance

##### 4. Relationship Connections
- **Prerequisites**: What must happen before using this
- **Dependencies**: Related concepts that work together
- **Contradictions**: When NOT to use this approach
- **Combinations**: How to layer multiple techniques

## OUTPUT STRUCTURE REQUIREMENTS

### Required JSON Schema
```json
{
  "document_metadata": {
    "source_file": "filename",
    "document_type": "detected category",
    "primary_domain": "sales/technical/product/strategy/other",
    "extraction_timestamp": "ISO timestamp",
    "content_scope": "brief description of what this document covers"
  },
  
  "extracted_knowledge": [
    {
      "concept_name": "Name of principle/feature/rule",
      "concept_type": "technique/product_feature/policy/framework",
      "definition": "Clear explanation",
      "importance_score": 1-10,
      "psychological_principle": "If applicable - why this works",
      "technical_principle": "If applicable - how this works",
      
      "implementation": {
        "when_to_use": ["trigger 1", "trigger 2"],
        "how_to_apply": ["step 1", "step 2"],
        "exact_phrases": [
          "Verbatim phrase 1",
          "Verbatim phrase 2"
        ],
        "questions_to_ask": [
          "Specific question 1",
          "Specific question 2"
        ],
        "voice_delivery": "tone/pace/emotion guidance if mentioned"
      },
      
      "conversation_mapping": {
        "stages": ["discovery", "presentation", "objection", "closing"],
        "customer_scenarios": ["scenario 1", "scenario 2"],
        "urgency": "immediate/standard/proactive"
      },
      
      "examples": [
        {
          "situation": "Specific scenario",
          "application": "How to apply in this situation",
          "sample_dialogue": {
            "customer_says": "Their statement/objection",
            "salesperson_responds": "Exact response using this technique",
            "expected_outcome": "What should happen next"
          }
        }
      ],
      
      "warnings": {
        "common_mistakes": ["mistake 1", "mistake 2"],
        "when_not_to_use": ["situation 1", "situation 2"],
        "prerequisites": ["required condition 1", "required condition 2"]
      },
      
      "success_indicators": [
        "Sign that technique is working 1",
        "Sign that technique is working 2"
      ],
      
      "related_concepts": ["related concept 1", "related concept 2"]
    }
  ],
  
  "actionable_frameworks": [
    {
      "framework_name": "Name of process/methodology",
      "purpose": "What this achieves",
      "steps": [
        {
          "step_number": 1,
          "action": "What to do",
          "verbal_execution": "Exactly what to say",
          "success_criteria": "How to know this step worked"
        }
      ],
      "complete_example": "Full scenario showing all steps"
    }
  ],
  
  "quick_reference": {
    "objection_handlers": [
      {
        "objection": "Common customer objection",
        "response_options": [
          "Response option 1 with exact wording",
          "Response option 2 with exact wording"
        ],
        "follow_up": "What to do after addressing"
      }
    ],
    
    "discovery_questions": [
      {
        "question": "Exact question to ask",
        "purpose": "What this uncovers",
        "follow_ups": ["Natural follow-up 1", "Natural follow-up 2"]
      }
    ],
    
    "closing_techniques": [
      {
        "technique": "Name",
        "setup": "How to prepare",
        "execution": "Exact words to use",
        "fallback": "If it doesn't work"
      }
    ],
    
    "value_propositions": [
      {
        "statement": "Exact value statement",
        "supporting_data": "Proof points",
        "best_for": "Type of customer this resonates with"
      }
    ]
  },
  
  "implementation_priorities": {
    "immediate_use": [
      "Items that can be used right away without preparation"
    ],
    "requires_practice": [
      "Items that need rehearsal before using"
    ],
    "advanced_techniques": [
      "Items for experienced users only"
    ]
  },
  
  "document_gaps": {
    "missing_information": [
      "Important topics not covered in detail"
    ],
    "ambiguous_areas": [
      "Concepts that need clarification"
    ],
    "assumed_knowledge": [
      "Prerequisites the document assumes reader knows"
    ]
  }
}
```

## EXTRACTION QUALITY STANDARDS

### Depth Requirements
- **NO SUMMARIES**: Extract actual content, not descriptions of content
- **VERBATIM PHRASES**: Include exact wording, not paraphrases
- **COMPLETE EXAMPLES**: Full scenarios, not partial illustrations
- **ALL VARIATIONS**: Every alternative approach mentioned
- **SPECIFIC NUMBERS**: Exact metrics, percentages, timeframes

### Completeness Checklist
✓ Have I extracted EVERY technique/principle/rule mentioned?
✓ Have I captured ALL specific phrases and exact wording?
✓ Have I included EVERY example and scenario provided?
✓ Have I identified ALL trigger points and use cases?
✓ Have I extracted ALL warnings and caveats?
✓ Have I found ALL success indicators and metrics?
✓ Have I mapped content to ALL relevant conversation stages?

### Actionability Test
For each extracted item, verify:
1. Can a salesperson use this IMMEDIATELY in a live call?
2. Is the guidance SPECIFIC enough to execute without interpretation?
3. Are there EXACT WORDS provided, not just concepts?
4. Is the TIMING clear (when to use this)?
5. Are SUCCESS CRITERIA defined (how to know it worked)?

## CRITICAL REMINDERS

1. **Extract, Don't Summarize**: Pull out actual usable content, not descriptions
2. **Preserve Exact Language**: Keep original phrasing for direct use
3. **Include All Details**: Even seemingly minor points may be crucial in practice
4. **Think Real-Time**: Focus on what can be used during a live conversation
5. **Maintain Structure**: Organize for quick retrieval during high-pressure moments
6. **Document Everything**: If it's in the source, it goes in the extraction

## ERROR HANDLING

If the document lacks specific actionable content:
- Note what IS available and extract it fully
- Identify gaps explicitly in the "document_gaps" section
- Generate logical inferences marked as "inferred" not "extracted"
- Suggest what additional information would be helpful

Remember: The goal is to create a comprehensive knowledge base that provides INSTANT, ACTIONABLE guidance during live sales conversations. Every extraction should answer: "What exactly should the salesperson DO or SAY right now?"