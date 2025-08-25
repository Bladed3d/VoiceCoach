# Instructions for Integrating User Context into Document Analysis

## OVERVIEW
You will receive user-provided context alongside a document for analysis. This context ENHANCES but never replaces the universal extraction framework. You must extract ALL actionable content from the document while using the user context to intelligently prioritize, score, and tag the extracted knowledge.

## USER CONTEXT INPUTS

You will receive 5 user inputs:
1. **Document Type**: Process & Strategy | Product Information | Sales Scripts
2. **Learning Objective** (Q2): What they want their team to know
3. **Business Driver** (Q3): Why they want them to know it  
4. **Success Definition** (Q4): What success looks like after implementation
5. **Critical Concepts** (Q5): Optional must-know elements

## INTEGRATION METHODOLOGY

### Step 1: Psychological Analysis of User Intent
Before processing the document, analyze Q2, Q3, and Q4 to understand:

```json
{
  "intent_analysis": {
    "stated_need": "Direct interpretation of what user wants",
    "underlying_problem": "Root issue they're trying to solve",
    "behavioral_gap": "Current behavior vs. desired behavior",
    "emotional_drivers": "Fears, frustrations, aspirations",
    "success_metrics": "How they'll measure improvement",
    "coaching_moments": "When guidance will have maximum impact"
  }
}
```

### Step 2: Enhanced Extraction with Prioritization

While extracting ALL content per the universal framework, add these user-context layers:

#### A. Relevance Scoring (1-10 scale)
For each extracted concept, calculate:
- **Direct Relevance** (1-10): How directly does this address Q2 (learning objective)?
- **Problem Solving** (1-10): How well does this solve the problem in Q3?
- **Success Impact** (1-10): How much does this contribute to Q4 outcomes?
- **Overall Priority Score**: (Direct + Problem + Success) / 3

#### B. Urgency Classification
Tag each extraction with timing based on user context:
- **CRITICAL**: Directly addresses Q3 problems or Q5 must-knows
- **HIGH**: Strong contributor to Q4 success metrics
- **STANDARD**: Supports Q2 learning objectives
- **SUPPLEMENTAL**: Good to know but not primary focus

#### C. Success Alignment Tags
Map extractions to success outcomes from Q4:
```json
{
  "success_alignment": {
    "addresses_success_metric": "Which specific success criteria this helps achieve",
    "behavior_change_enabled": "What new behavior this enables",
    "problem_resolution": "Which stated problem this solves",
    "measurable_impact": "How this contributes to measurable outcomes"
  }
}
```

### Step 3: Context-Aware Organization

#### For Process & Strategy Documents:
- Prioritize techniques that directly solve Q3 problems
- Highlight frameworks that enable Q4 success metrics
- Flag prerequisite skills needed for critical concepts
- Sequence learning based on behavioral gap analysis

#### For Product Information Documents:
- Emphasize features that address Q3 pain points
- Prioritize benefits that align with Q4 outcomes
- Structure specifications by relevance to user objectives
- Highlight differentiators that support success metrics

#### For Sales Scripts Documents:
- Flag dialogues that handle Q3 problem situations
- Prioritize scripts that drive Q4 success behaviors
- Tag conversation flows by effectiveness for stated goals
- Emphasize language that addresses underlying emotional drivers

### Step 4: Smart Coaching Prioritization

Based on user context analysis, enhance each extraction with:

```json
{
  "coaching_metadata": {
    "trigger_priority": "CRITICAL|HIGH|STANDARD|SUPPLEMENTAL",
    "optimal_timing": "When to surface this coaching",
    "success_indicator": "How this moves toward Q4 success",
    "problem_addressed": "Which Q3 problem this solves",
    "learning_reinforced": "Which Q2 objective this supports",
    "confidence_level": "How certain we are this will help (0-100%)",
    "expected_impact": "Anticipated behavior change"
  }
}
```

### Step 5: Dynamic Filtering Rules

Create smart filters based on user context:

1. **Problem-Solution Matching**
   - If Q3 mentions "price objections" → Tag all price-handling content as CRITICAL
   - If Q3 mentions "long sales cycles" → Prioritize acceleration techniques

2. **Success Metric Alignment**
   - If Q4 mentions "close rate" → Emphasize closing techniques
   - If Q4 mentions "larger deals" → Prioritize value-building content

3. **Behavioral Gap Bridging**
   - Identify current state (from Q3) vs. desired state (from Q4)
   - Tag content that bridges this gap as HIGH priority

## OUTPUT ENHANCEMENT

Add this user context section to your standard JSON output:

```json
{
  "user_context_analysis": {
    "document_type": "From Q1",
    "primary_learning_objective": "From Q2",
    "core_problem_to_solve": "From Q3", 
    "success_definition": "From Q4",
    "critical_concepts": "From Q5",
    
    "intent_interpretation": {
      "what_they_really_need": "Deeper analysis of true requirements",
      "behavioral_changes_required": "Specific behavior modifications needed",
      "knowledge_gaps_identified": "What they don't know they need to know",
      "success_dependencies": "What must happen for success"
    },
    
    "prioritization_map": {
      "critical_items": ["Concepts directly solving stated problems"],
      "high_priority_items": ["Concepts driving success metrics"],
      "quick_wins": ["Easy-to-implement with immediate impact"],
      "foundation_items": ["Prerequisites for critical concepts"]
    },
    
    "coaching_strategy": {
      "primary_focus": "Main coaching emphasis based on user needs",
      "trigger_situations": "When to activate coaching",
      "reinforcement_schedule": "How often to remind",
      "success_checkpoints": "Milestones toward Q4 outcomes"
    }
  }
}
```

## CRITICAL RULES

1. **NEVER SKIP EXTRACTION**: User context adds priority layers but doesn't reduce extraction scope
2. **MAINTAIN OBJECTIVITY**: Extract what's actually in the document, not what user hopes is there
3. **TRANSPARENT GAPS**: If document doesn't address user's Q3 problems, explicitly note this
4. **SMART INFERENCE**: Connect document content to user needs even if not explicitly stated
5. **OUTCOME FOCUS**: Always trace back to Q4 success definition

## QUALITY CHECKS

Before finalizing, verify:
- ✓ Every Q3 problem has tagged solutions (or noted as missing)
- ✓ Every Q4 success metric has supporting content identified
- ✓ Q5 critical concepts are marked as CRITICAL priority
- ✓ Behavioral gaps have bridging content identified
- ✓ Coaching triggers align with user's actual workflow

## EXAMPLE APPLICATION

**User Context:**
- Q2: "Learn to handle objections without dropping price"
- Q3: "Reps panic and offer discounts at first resistance"
- Q4: "Maintain margins while increasing close rate"

**Enhancement Result:**
- All objection-handling content → CRITICAL priority
- Price-anchoring techniques → CRITICAL priority
- Confidence-building language → HIGH priority
- Value articulation methods → HIGH priority
- Generic rapport building → STANDARD priority

This ensures real-time coaching delivers exactly what's needed when the rep faces price resistance, rather than generic suggestions.

Remember: The user context is your compass for navigating the document, but you must still map the entire territory.