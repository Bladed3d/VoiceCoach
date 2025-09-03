# Coaching Response Templates
<!-- Edit this file to customize coaching responses without changing code -->

## Response Priority Levels

### Critical (Red)
- Closing opportunity detected
- Major objection raised
- Customer showing exit signals
- Competitive threat mentioned

### High (Orange)
- Buying signal detected
- Important question asked
- Price/budget discussion
- Decision maker revealed

### Medium (Yellow)
- Discovery opportunity
- Feature interest shown
- Process questions
- Timeline discussed

### Low (Green)
- Rapport building needed
- General information sharing
- Routine questions
- Positive engagement

## Stage-Specific Response Templates

### Discovery Stage

#### When to Use
Customer is sharing problems, challenges, or current situation

#### Response Templates
```json
{
  "urgency": "medium",
  "suggestion": "Dig deeper into the impact of [problem]",
  "reasoning": "Quantifying pain increases urgency",
  "next_action": "How much is this costing you monthly?"
}
```

```json
{
  "urgency": "medium",
  "suggestion": "Explore the business impact",
  "reasoning": "Links problem to business metrics",
  "next_action": "How does this affect your team's productivity?"
}
```

### Demo/Presentation Stage

#### When to Use
Showing features, explaining solutions, demonstrating value

#### Response Templates
```json
{
  "urgency": "low",
  "suggestion": "Connect feature to their pain point",
  "reasoning": "Makes solution personally relevant",
  "next_action": "This directly addresses your concern about [X]"
}
```

```json
{
  "urgency": "medium",
  "suggestion": "Get confirmation of value",
  "reasoning": "Builds micro-commitments",
  "next_action": "Can you see how this would save time?"
}
```

### Objection Handling Stage

#### When to Use
Customer raises concerns, objections, or hesitations

#### Response Templates

##### Price Objection
```json
{
  "urgency": "high",
  "suggestion": "Reframe to value and ROI",
  "reasoning": "Shifts focus from cost to benefit",
  "next_action": "Let's calculate your ROI over 12 months"
}
```

##### Authority Objection
```json
{
  "urgency": "high",
  "suggestion": "Identify all decision makers",
  "reasoning": "Ensures buy-in from all stakeholders",
  "next_action": "Who else should we include in this discussion?"
}
```

##### Need Objection
```json
{
  "urgency": "high",
  "suggestion": "Uncover hidden pain points",
  "reasoning": "Current solution may have gaps",
  "next_action": "What's your biggest frustration with current solution?"
}
```

##### Timing Objection
```json
{
  "urgency": "medium",
  "suggestion": "Create urgency without pressure",
  "reasoning": "Shows cost of delay",
  "next_action": "What's the impact of waiting another quarter?"
}
```

### Closing Stage

#### When to Use
Moving toward decision, discussing next steps

#### Response Templates
```json
{
  "urgency": "critical",
  "suggestion": "Secure specific commitment",
  "reasoning": "Maintains momentum",
  "next_action": "Should we schedule implementation for next week?"
}
```

```json
{
  "urgency": "high",
  "suggestion": "Use assumptive close",
  "reasoning": "Assumes positive decision",
  "next_action": "I'll send the contract for Tuesday start date"
}
```

## Conversation Flow Templates

### Opening Questions
- "What brings you to explore [solution category] today?"
- "Tell me about your current process for [activity]"
- "What's your biggest challenge with [current situation]?"

### Discovery Questions
- "How long has this been a challenge?"
- "What have you tried to solve this?"
- "What happens if nothing changes?"
- "Who else is affected by this?"

### Value Questions
- "What would success look like for you?"
- "How would solving this impact your business?"
- "What's the cost of not addressing this?"

### Closing Questions
- "What questions can I answer to help you decide?"
- "What's your timeline for making a change?"
- "What would prevent you from moving forward?"

## Fallback Responses

### When Stage is Unknown
```json
{
  "urgency": "low",
  "suggestion": "Ask clarifying question",
  "reasoning": "Understand their perspective",
  "next_action": "Tell me more about your situation"
}
```

### When No Context Available
```json
{
  "urgency": "low",
  "suggestion": "Focus on discovery",
  "reasoning": "Build understanding first",
  "next_action": "What are you hoping to achieve?"
}
```

### Error Response
```json
{
  "urgency": "low",
  "suggestion": "Continue active listening",
  "reasoning": "Maintain conversation flow",
  "next_action": "That's interesting, please continue"
}
```