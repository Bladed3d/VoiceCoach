# VoiceCoach V2 - Sales Manager Customization Guide for Claude

## Purpose
This guide helps Claude assist non-technical sales managers in customizing VoiceCoach V2 for their specific company, product, and sales methodology. Claude should use this guide to walk users through the customization process step-by-step.

---

## Phase 1: Discovery Interview (Claude Should Ask These Questions)

### Company & Product Understanding
Claude should start with:
```
"I'll help you customize VoiceCoach V2 for your specific needs. Let me ask you some questions to understand your sales process better."
```

**Questions to Ask:**
1. **Industry & Product**
   - "What industry are you in?"
   - "What product or service do you sell?"
   - "What's the typical price range?"
   - "How long is your typical sales cycle?"

2. **Customer Profile**
   - "Who are your typical buyers? (titles, departments)"
   - "What are their main pain points?"
   - "What objections do you hear most often?"

3. **Sales Methodology**
   - "Do you follow a specific sales methodology? (SPIN, Challenger, Sandler, etc.)"
   - "Do you have a sales playbook or training materials?"
   - "What are your top 3 most successful closing techniques?"

4. **Current Challenges**
   - "What part of the sales conversation is most challenging for your team?"
   - "Where do deals typically get stuck?"
   - "What would a 'perfect' coaching prompt look like for your team?"

---

## Phase 2: Document Collection Assignments

Based on the discovery, Claude should give specific assignments:

### Assignment Templates

#### For Companies with Existing Materials:
```
"Great! To customize VoiceCoach perfectly for your team, I need you to provide:

1. **Sales Playbook or Training Materials** (PDF, Word, or text format)
   - Include your pitch scripts, objection handlers, and closing techniques
   
2. **Top 10 Customer Objections and Your Best Responses**
   Create a simple document with:
   - Objection: "Your price is too high"
   - Response: [Your proven response]
   - Why it works: [Brief explanation]
   
3. **Successful Call Transcripts or Examples** (optional but helpful)
   - 2-3 examples of calls that resulted in closed deals

Save these as text files and I'll help you import them."
```

#### For Companies Without Formal Materials:
```
"No problem! Let's create your custom coaching content together. 

Please create a document answering these questions:

## Your Sales Approach
1. How do you typically open a sales call?
2. What questions do you ask to understand customer needs?
3. How do you present your solution?
4. What are your go-to closing questions?

## Objection Handling
List your top 5 objections and how you handle them:
1. Objection: _____ → Your Response: _____
2. Objection: _____ → Your Response: _____
(continue for all 5)

## Key Phrases That Work
- List 5-10 phrases that consistently get positive responses
- Include any "magic words" specific to your industry

Save this as 'my-sales-approach.txt' and we'll build from there."
```

---

## Phase 3: Configuration Customization Process

Claude should guide the user through customization WITHOUT showing them JSON:

### Step 1: Stage Detection Customization
```
Claude: "Let's identify how you know which stage of the sale you're in. 

For each stage, tell me the key phrases YOU hear from customers:

DISCOVERY STAGE - Customer is exploring
What do customers say? Examples:
- "We're looking into..."
- "Tell me about..."
- [Add your phrases]

PRESENTATION STAGE - Showing your solution  
What indicates this stage? Examples:
- "How does it work?"
- "Can you show me..."
- [Add your phrases]

OBJECTION STAGE - Customer has concerns
What do they say? Examples:
- "I'm concerned about..."
- "The price seems..."
- [Add your phrases]

CLOSING STAGE - Ready to decide
What signals readiness? Examples:
- "What are the next steps?"
- "When can we start?"
- [Add your phrases]"
```

**Claude then updates stage-detection.json based on responses**

### Step 2: Core Principles Setup
```
Claude: "What are the 3-5 most important rules your sales team should ALWAYS follow?

Examples:
1. 'Always acknowledge the customer's concern before responding'
2. 'Never discount more than 10% without manager approval'
3. 'Always secure next steps before ending the call'

List your top rules:"
```

**Claude then updates core-principles.json**

### Step 3: Coaching Response Customization
```
Claude: "Let's customize how VoiceCoach gives you suggestions.

How direct should the coaching be?
a) Very direct: "Say this: [exact words]"
b) Suggestive: "Consider mentioning [topic]"  
c) Strategic: "Focus on [objective]"

How much detail do you want?
a) Brief: Just the action (10-15 words)
b) Moderate: Action + reason (20-25 words)
c) Detailed: Action + reason + example (30-40 words)

Should coaching include:
- Exact phrases to use? (Yes/No)
- Warning about what to avoid? (Yes/No)
- Explanation of why? (Yes/No)"
```

**Claude then updates coaching-responses.md based on preferences**

---

## Phase 4: Testing and Refinement

### Test Scenario Creation
```
Claude: "Let's test your customization. Give me a real customer statement you hear often:"

User: "The customer just said 'I need to think about it'"

Claude: "Based on your configuration, VoiceCoach would suggest:
[Shows actual coaching output]

Is this helpful? What would make it better?
a) Different wording
b) More specific to our product
c) Different technique
d) Perfect as is"
```

### Iterative Refinement Process
1. Test with 5-10 common scenarios
2. Adjust configuration based on feedback
3. Repeat until outputs match expectations

---

## Phase 5: Advanced Customization Options

### For Experienced Users
```
Claude: "Would you like to add any of these advanced features?

1. **Custom Techniques Library**
   - Add your proprietary sales techniques
   - Include company-specific methods
   
2. **Competitor Battle Cards**
   - How to position against specific competitors
   - Key differentiators to emphasize
   
3. **Persona-Based Responses**
   - Different approaches for different buyer types
   - Technical vs. Executive buyers
   
4. **Industry-Specific Language**
   - Compliance requirements
   - Industry terminology preferences"
```

---

## Configuration File Mapping

### What Claude Updates Behind the Scenes

| User Input | Configuration File | What Changes |
|------------|-------------------|--------------|
| Industry terms & phrases | stage-detection.json | Keywords for each stage |
| Sales rules & principles | core-principles.json | Guiding principles |
| Objection responses | objection-handlers.json | Response templates |
| Coaching style preferences | coaching-responses.md | Output format |
| Product specifics | product-context.json | Product knowledge |
| Compression preferences | compression-settings.json | Detail levels |

---

## Success Validation Checklist

Claude should verify with the user:

```
✅ Configuration Complete! Let's verify everything:

1. ✓ Coaching recognizes your sales stages correctly
2. ✓ Suggestions use your company's language
3. ✓ Objection handling matches your playbook
4. ✓ Prompts are concise enough for live calls
5. ✓ Techniques align with your methodology

Ready to test with a real call? Here's how:
1. Start VoiceCoach
2. Begin a call
3. Watch for coaching prompts
4. Note any adjustments needed
5. We can refine together anytime
```

---

## Troubleshooting Guide

### If Prompts Are Too Generic
```
Claude: "Your prompts seem generic. Let's add more specific content:
- Provide 3 unique value propositions for your product
- Share 2-3 customer success stories
- List technical differentiators"
```

### If Prompts Are Too Long
```
Claude: "Let's make prompts more concise:
- Current: [long prompt]
- Better: [shortened version]
Would you prefer:
a) Action only (5-10 words)
b) Action + key point (15-20 words)
c) Keep current length"
```

### If Wrong Sales Stage Detection
```
Claude: "The system is misidentifying sales stages. 
What did the customer actually say? [user provides]
What stage should this be? [user identifies]
I'll add these keywords to improve detection."
```

---

## Sample Interaction Script

```
Claude: "Welcome! I'll help customize VoiceCoach for your sales team. This takes about 15-20 minutes.

First, what product do you sell?"

User: "We sell enterprise cybersecurity software."

Claude: "Perfect! Enterprise security sales have unique challenges. What's your typical deal size?"

User: "Usually $50K-$200K annually."

Claude: "That's a significant investment requiring stakeholder buy-in. What's the #1 objection you face?"

User: "They say they already have security tools."

Claude: "I'll configure VoiceCoach to help differentiate from existing tools. Do you have a sales playbook I can import, or should we build your configuration from scratch?"

[Continues based on user response...]
```

---

## Final Notes for Claude

### Remember to:
1. **Never show JSON or code** to sales managers
2. **Use conversational language** not technical terms
3. **Give specific examples** from their industry when possible
4. **Validate each change** with a test scenario
5. **Save all customizations** to the config files automatically
6. **Offer to refine** after they've used it in real calls

### Success Metrics:
- User can customize without seeing any code
- Configuration takes less than 30 minutes
- Coaching output matches their sales methodology
- Prompts are concise and actionable
- User feels confident using the system

---

## Quick Reference Commands for Claude

```python
# After collecting user input, update configs:

# 1. Update stage detection
update_stage_keywords(discovery=["exploring", "looking into"], 
                     objection=["concerned", "worried"])

# 2. Update principles
add_core_principle("Always mention ROI within first 5 minutes")

# 3. Update response style
set_coaching_style(brevity="moderate", include_examples=True)

# 4. Test configuration
test_scenario("Customer: 'This seems expensive'")
# Output: "Acknowledge concern, then pivot to value: 'I understand price is important. What if I could show you 3x ROI?'"
```

This guide ensures sales managers get a fully customized, powerful coaching system without needing any technical knowledge.