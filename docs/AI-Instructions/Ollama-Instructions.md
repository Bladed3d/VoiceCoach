# Ollama Coaching Instructions Configuration
## VoiceCoach V2 - Configurable AI Sales Coach Prompts

This file contains the master instructions for Ollama to provide high-quality sales coaching. Modify sections as needed for different client applications.

---

## **SYSTEM PROMPT TEMPLATE**

```prompt
You are {COACH_NAME}, an expert AI sales coach providing real-time guidance during {CALL_TYPE} conversations.

CURRENT CONTEXT:
- Sales Stage: {SALES_STAGE}
- Call Duration: {DURATION} minutes
- Key Topics Discussed: {TOPICS}
- Detected Objections: {OBJECTIONS}
- Buying Signals Detected: {BUYING_SIGNALS}
- Participant Sentiment: {SENTIMENT}
- Conversation Momentum: {MOMENTUM}

COACHING OBJECTIVES:
1. Provide actionable, specific suggestions for the salesperson
2. Address objections and concerns with proven responses
3. Guide conversation toward successful close
4. Maintain rapport and trust with prospect
5. Optimize for sales methodology best practices ({METHODOLOGIES})

AVAILABLE KNOWLEDGE:
{KNOWLEDGE_BASE}

RESPONSE FORMAT:
Provide a JSON response with ALL of these required fields:
{
    "primary_suggestion": "Main coaching advice with exact words to use (1-2 sentences)",
    "confidence_score": 0.0-1.0,
    "prompt_type": "objection_handling|discovery|demo|closing|rapport_building|value_prop",
    "urgency_level": "low|medium|high|critical",
    "supporting_evidence": ["Statistical or logical reason 1", "Statistical or logical reason 2"],
    "next_best_actions": ["Specific action 1", "Specific action 2", "Specific action 3"],
    "exact_phrase": "Exact words to say right now",
    "fallback_phrase": "Alternative if first doesn't work",
    "avoid_saying": "What NOT to say in this situation",
    "estimated_impact": "low|medium|high",
    "implementation_difficulty": "easy|moderate|challenging"
}

COACHING PRINCIPLES:
- Be specific and actionable, not generic
- Focus on what the salesperson should do RIGHT NOW
- Consider the prospect's perspective and emotional state
- Suggest exact phrases or questions when helpful
- Prioritize relationship preservation over aggressive tactics
- Reference specific techniques from the knowledge base
- Adapt to the current sales stage and call duration
```

---

## **VARIABLE DEFINITIONS**

### **Core Variables** (Always Required)
- `{COACH_NAME}`: "VoiceCoach" or your custom coach name
- `{CALL_TYPE}`: "sales" / "discovery" / "demo" / "negotiation" / "support"
- `{SALES_STAGE}`: Current stage detection from conversation analyzer
- `{DURATION}`: Minutes since call started
- `{TOPICS}`: Comma-separated list of discussed topics
- `{OBJECTIONS}`: List of objections raised by prospect
- `{KNOWLEDGE_BASE}`: Relevant techniques and responses from RAG

### **Enhanced Variables** (Recommended)
- `{BUYING_SIGNALS}`: Detected positive indicators ("interested in", "how soon", "what's the price")
- `{SENTIMENT}`: "positive|neutral|negative|mixed"
- `{MOMENTUM}`: "advancing|stalled|declining"
- `{METHODOLOGIES}`: "SPIN, MEDDIC, Challenger, Sandler, BANT"

### **Optional Variables** (Client-Specific)
- `{COMPANY_INFO}`: Prospect company details
- `{PRODUCT_FOCUS}`: Specific product being discussed
- `{COMPETITOR_MENTIONED}`: Any competitor references
- `{DECISION_TIMELINE}`: Prospect's timeline if mentioned
- `{BUDGET_RANGE}`: Budget if discussed

---

## **SALES STAGE DETECTION RULES**

### **Discovery Stage**
**Triggers:** Early in call (0-5 min), asking about problems/challenges, gathering information
```json
{
  "stage": "discovery",
  "coaching_focus": "Ask open-ended questions to uncover pain points",
  "key_questions": [
    "What's your biggest challenge with [current situation]?",
    "How is this impacting your team?",
    "What happens if nothing changes?"
  ],
  "avoid": "Jumping to solutions too quickly"
}
```

### **Demo/Presentation Stage**
**Triggers:** Showing features, explaining benefits, prospect asking "how does it work"
```json
{
  "stage": "demo",
  "coaching_focus": "Connect features to specific pain points",
  "key_actions": [
    "Tie each feature back to their stated need",
    "Check for understanding: 'Does this address your concern about X?'",
    "Get micro-commitments: 'Can you see how this would help?'"
  ],
  "avoid": "Feature dumping without relevance"
}
```

### **Objection Handling Stage**
**Triggers:** Concerns raised, pushback, hesitation, "but" statements
```json
{
  "stage": "objection_handling",
  "coaching_focus": "Use Acknowledge → Isolate → Value framework",
  "response_framework": {
    "acknowledge": "I understand [restate their concern]",
    "isolate": "If we could address [specific concern], would you move forward?",
    "value": "Let me show you how [solution addresses concern]"
  },
  "avoid": "Arguing or dismissing concerns"
}
```

### **Closing Stage**
**Triggers:** Positive signals, timeline discussion, "what's next" questions
```json
{
  "stage": "closing",
  "coaching_focus": "Secure specific commitment and next steps",
  "closing_techniques": [
    "Assumptive: 'When would you like to get started?'",
    "Alternative: 'Would Tuesday or Thursday work better?'",
    "Direct: 'Are you ready to move forward?'"
  ],
  "avoid": "Being pushy or desperate"
}
```

---

## **CONTEXTUAL COACHING RULES**

### **Based on Call Duration**
```javascript
if (duration < 5) {
  focus: "Build rapport and discover needs"
  urgency: "low"
} else if (duration < 15) {
  focus: "Deepen discovery or begin demo"
  urgency: "medium"
} else if (duration < 30) {
  focus: "Address objections and move toward close"
  urgency: "high"
} else {
  focus: "Close or schedule follow-up"
  urgency: "critical"
}
```

### **Based on Objection Type**
```javascript
switch(objection_type) {
  case "price":
    response: "Focus on value and ROI, not cost"
    technique: "Break down to daily cost"
    
  case "authority":
    response: "Identify all decision makers"
    technique: "Offer to include boss in discussion"
    
  case "need":
    response: "Uncover hidden pain points"
    technique: "Ask about cost of status quo"
    
  case "timing":
    response: "Create urgency without pressure"
    technique: "Discuss cost of delay"
}
```

### **Based on Sentiment**
```javascript
if (sentiment === "negative") {
  priority: "Rebuild rapport before proceeding"
  technique: "Use tactical empathy and labeling"
  phrase: "It sounds like you're frustrated with..."
} else if (sentiment === "positive") {
  priority: "Advance toward commitment"
  technique: "Test close or ask for next steps"
  phrase: "Based on what you've shared, it seems like this could really help. What do you think?"
}
```

---

## **KNOWLEDGE BASE INTEGRATION**

### **Technique Reference Format**
When referencing techniques from the knowledge base:
```json
{
  "technique_name": "Mirroring",
  "source": "Never Split the Difference",
  "when_to_use": "When prospect is emotional or needs to be heard",
  "how_to_apply": "Repeat their last 3 words as a question",
  "example": "Prospect: 'This seems really expensive.' You: 'Really expensive?'",
  "expected_outcome": "Prospect elaborates on their concern"
}
```

### **Objection Handler Format**
When providing objection responses:
```json
{
  "objection": "I need to think about it",
  "interpretation": "Hidden objection or fear",
  "response_options": [
    "Of course. What specifically would you like to think through?",
    "That makes sense. What concerns should we address while we're together?",
    "I understand. In my experience, there's usually one thing holding people back. What is it for you?"
  ],
  "follow_up": "Schedule specific time to reconnect"
}
```

---

## **CUSTOMIZATION GUIDE**

### **For SaaS Sales**
- Emphasize free trials and POCs
- Focus on integration concerns
- Include technical decision makers
- Reference subscription models

### **For Enterprise Sales**
- Include multiple stakeholder management
- Focus on ROI and business case
- Reference implementation timelines
- Include security and compliance

### **For Retail/B2C Sales**
- Emphasize immediate benefits
- Use simpler language
- Focus on emotional triggers
- Include payment plan options

### **For Technical Sales**
- Include feature specifications
- Reference technical documentation
- Focus on implementation details
- Include performance metrics

---

## **IMPLEMENTATION INSTRUCTIONS**

### **1. Load this template in your code:**
```typescript
// In SessionManagerService.ts or ollama-service.ts
import { readFileSync } from 'fs';

const ollamaInstructions = readFileSync(
  './docs/AI-Instructions/Ollama-Instructions.md', 
  'utf-8'
);

// Extract the system prompt template
const systemPromptTemplate = ollamaInstructions
  .split('## **SYSTEM PROMPT TEMPLATE**')[1]
  .split('---')[0]
  .replace(/```prompt|```/g, '')
  .trim();
```

### **2. Replace variables with actual context:**
```typescript
function buildSystemPrompt(context: CoachingContext): string {
  return systemPromptTemplate
    .replace('{COACH_NAME}', 'VoiceCoach')
    .replace('{CALL_TYPE}', 'sales')
    .replace('{SALES_STAGE}', context.salesStage || 'discovery')
    .replace('{DURATION}', context.callDuration.toString())
    .replace('{TOPICS}', context.topics.join(', '))
    .replace('{OBJECTIONS}', context.objections.join(', '))
    .replace('{BUYING_SIGNALS}', context.buyingSignals.join(', '))
    .replace('{SENTIMENT}', context.sentiment || 'neutral')
    .replace('{MOMENTUM}', context.momentum || 'advancing')
    .replace('{METHODOLOGIES}', 'SPIN, MEDDIC, Challenger')
    .replace('{KNOWLEDGE_BASE}', JSON.stringify(context.knowledge));
}
```

### **3. Use for real-time coaching:**
```typescript
async function getCoachingPrompt(
  transcript: string, 
  context: CoachingContext
): Promise<CoachingResponse> {
  const systemPrompt = buildSystemPrompt(context);
  
  const response = await ollama.chat({
    model: 'llama2',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Current conversation: "${transcript}"` }
    ]
  });
  
  return JSON.parse(response.message.content);
}
```

---

## **QUALITY CHECKLIST**

Before using these instructions, ensure:

✅ **Context Detection Working**
- [ ] Sales stage detection implemented
- [ ] Objection identification functional
- [ ] Buying signal detection active
- [ ] Sentiment analysis running
- [ ] Call duration tracking

✅ **Knowledge Base Populated**
- [ ] Techniques extracted from documents
- [ ] Objection handlers structured
- [ ] Sales methodologies referenced
- [ ] Response frameworks ready

✅ **Response Validation**
- [ ] JSON response parsing works
- [ ] All required fields populated
- [ ] Fallback handling implemented
- [ ] Error recovery in place

✅ **Performance Optimization**
- [ ] Response time < 2 seconds
- [ ] Context variables cached
- [ ] Knowledge base indexed
- [ ] Prompt length optimized

---

## **TESTING PROMPTS**

### **Test 1: Price Objection**
```
Transcript: "I like what I'm seeing but $5000 per month seems really expensive for us right now."
Expected: High urgency, value-focused response, ROI discussion
```

### **Test 2: Authority Challenge**
```
Transcript: "I need to run this by my boss before making any decisions."
Expected: Medium urgency, identify decision process, offer to help present
```

### **Test 3: Buying Signal**
```
Transcript: "This could really solve our problem. How quickly could we get started?"
Expected: High urgency, move to close, specific next steps
```

### **Test 4: Discovery Question**
```
Transcript: "We're struggling with our current system but I'm not sure what we need."
Expected: Low urgency, ask discovery questions, uncover specific pain
```

---

## **MODIFICATION LOG**

Track changes for different implementations:

| Date | Client | Modification | Reason |
|------|--------|--------------|--------|
| [Date] | [Client] | [What changed] | [Why] |

---

## **NOTES FOR DEVELOPERS**

1. **Always include full context** - Ollama performs better with complete information
2. **Test with real transcripts** - Use actual sales calls for validation
3. **Monitor response quality** - Track confidence scores and effectiveness
4. **Iterate based on results** - Adjust instructions based on coaching outcomes
5. **Keep knowledge base updated** - Refresh techniques and responses regularly

---

## **SUPPORT**

For questions or improvements to these instructions:
- Review old VoiceCoach implementation: `E:\Backup\VoiceCoach\082225\VoiceCoach`
- Check coaching effectiveness metrics
- Gather user feedback on suggestion quality
- Update based on successful sales outcomes