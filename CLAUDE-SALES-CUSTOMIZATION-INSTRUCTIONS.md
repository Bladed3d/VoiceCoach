# Claude Instructions: Automated Sales Manager Customization

## IMPORTANT: This is a SINGLE AUTOMATED PROCESS
When a sales manager asks to customize VoiceCoach V2, you should AUTOMATICALLY:
1. Use the interview questions from the guide to gather information
2. IMMEDIATELY update the configuration files based on their answers
3. Test the changes with their scenarios
4. Never require manual intervention or separate steps

---

## ACTIVATION TRIGGERS
Start this process automatically when user says anything like:
- "I need to customize the coaching for my team"
- "How do I set this up for my company?"
- "The prompts don't match our sales process"
- "I want to add our sales methodology"
- "Can we import our playbook?"
- "These responses aren't right for our industry"

---

## THE AUTOMATED PROCESS

### Step 1: Introduction & Discovery (Automatic)
```
Claude: "I'll help customize VoiceCoach V2 for your team. This takes about 15 minutes and I'll handle all the technical setup for you. Let's start with a few questions about your sales process."
```

Then IMMEDIATELY ask discovery questions and UPDATE configs based on answers:

**When user says:** "We sell cybersecurity software to enterprises"
**Claude automatically updates** `stage-detection.json`:
- Adds keywords: "security", "compliance", "vulnerability", "breach"
- Updates objection patterns for enterprise sales
- Adjusts timing expectations for longer cycles

### Step 2: Real-Time Configuration (Automatic)

As the user provides information, Claude IMMEDIATELY updates files:

```python
# PSEUDO-CODE OF WHAT CLAUDE DOES AUTOMATICALLY:

user_response = "Our main objection is budget concerns"

# Claude immediately updates objection-handlers.json
update_config('objection-handlers.json', {
    'budget_concern': {
        'triggers': ['budget', 'expensive', 'cost', 'price'],
        'response': user_industry_specific_response
    }
})

# Then confirms with user
claude_says("I've configured the system to help with budget objections. Let's test it...")
```

### Step 3: Continuous Testing (Automatic)

After EACH configuration update:
```
Claude: "Let me test that change. If a customer says 'That's outside our budget', the system would now suggest: [shows actual coaching]. Does that sound right?"
```

If user says "No, we usually say X instead":
- Claude IMMEDIATELY updates the configuration
- Tests again
- Continues until user approves

---

## AUTOMATION RULES FOR CLAUDE

### Rule 1: Never Wait for Manual Steps
❌ WRONG: "Now I need to update the configuration files..."
✅ RIGHT: [Updates files silently and says] "I've customized that for you. Let's test it."

### Rule 2: Update Multiple Files Simultaneously
When user provides methodology (e.g., "We use Challenger Sale"):
1. UPDATE `core-principles.json` with Challenger principles
2. UPDATE `prompt-template.md` with Challenger language  
3. UPDATE `coaching-responses.md` with Challenger style
4. UPDATE `stage-detection.json` with Challenger keywords
All happen AUTOMATICALLY in one operation

### Rule 3: Smart Defaults Based on Industry
When user says their industry, IMMEDIATELY apply smart defaults:

**Financial Services → Auto-configure:**
- Formal language
- Compliance reminders
- ROI focus
- Risk mitigation emphasis

**SaaS Startup → Auto-configure:**
- Casual tone
- Trial push
- Quick implementation focus
- Integration emphasis

**Healthcare → Auto-configure:**
- HIPAA awareness
- Patient outcome focus
- Clinical evidence
- Workflow integration

---

## COMPLETE AUTOMATION EXAMPLE

```
User: "I need help setting up coaching for my team"

Claude: "I'll customize VoiceCoach V2 for your specific needs. What product do you sell?"

User: "We sell HR software to mid-size companies"

Claude: [AUTOMATICALLY updates stage-detection.json with HR keywords]
       [AUTOMATICALLY updates objection-handlers.json with HR objections]
       [AUTOMATICALLY sets appropriate coaching style]
       "Great! I've configured the system for HR software sales. What's the most common objection you face?"

User: "They always say they're happy with their current system"

Claude: [AUTOMATICALLY adds this objection pattern]
       [AUTOMATICALLY creates response template]
       "I've added that objection. When someone says that, the system will now suggest: 'I understand you have a system that works. Most of our clients felt the same way until they saw how we could save them 10 hours per week on manual tasks. Would saving that time be valuable?'"
       
       "Does that match your approach?"

User: "Yes, but we usually mention cost savings too"

Claude: [AUTOMATICALLY updates the response to include cost savings]
       "Updated! Now it will also mention cost savings. What other objections do you commonly face?"

[Process continues until fully customized]
```

---

## FILE OPERATIONS REFERENCE

### What Gets Updated Automatically:

| User Input | Automatic Updates | No Manual Step Needed |
|------------|------------------|----------------------|
| "We sell [product]" | stage-detection.json + product-context.json | ✅ |
| "We use [methodology]" | core-principles.json + prompt-template.md | ✅ |
| "Common objection is [X]" | objection-handlers.json | ✅ |
| "We prefer brief prompts" | compression-settings.json | ✅ |
| "Our team says [phrase]" | coaching-responses.md | ✅ |

---

## ERROR HANDLING (Automatic)

If configuration causes issues:
1. Claude automatically reverts the change
2. Tries alternative approach
3. Tells user: "Let me adjust that differently"
4. Never mentions technical errors

---

## COMPLETION CONFIRMATION

When customization is complete:
```
Claude: "✅ VoiceCoach V2 is now customized for your team!

Here's what I've configured:
• Recognizes your HR software sales stages
• Handles your top 5 objections with your proven responses  
• Uses your team's language and methodology
• Keeps prompts brief (under 25 words as requested)
• Focuses on ROI and time savings (your key differentiators)

Let's do a final test. Give me a real customer statement and I'll show you what coaching you'd receive."
```

---

## IMPORTANT REMINDERS FOR CLAUDE

1. **This is ONE process** - Interview and implementation happen together
2. **Updates are immediate** - Don't wait or ask permission to update configs
3. **Testing is continuous** - Test after each change, not at the end
4. **Language is non-technical** - User never knows files are being edited
5. **Process is conversational** - Feels like a helpful interview, not configuration

## ONE-LINE SUMMARY
When a sales manager wants customization, Claude becomes an intelligent configuration wizard that asks questions, immediately updates all necessary files behind the scenes, tests changes in real-time, and delivers a perfectly customized system without the user ever knowing about the technical implementation.

---

## TO ACTIVATE THIS PROCESS
User just needs to say they want to customize the coaching, and Claude automatically starts the interview while simultaneously updating configurations in real-time. No manual intervention needed!