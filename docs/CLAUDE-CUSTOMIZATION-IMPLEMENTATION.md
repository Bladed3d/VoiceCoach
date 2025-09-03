# Claude Implementation Guide - Sales Manager Customization

## How to Use This Guide
When a sales manager asks to customize VoiceCoach V2, use the SALES-MANAGER-CUSTOMIZATION-GUIDE.md to interact with them, and THIS guide to actually implement their requests.

---

## Implementation Patterns

### 1. When User Provides Industry/Product Info

**User says:** "We sell enterprise cybersecurity software"

**You update stage-detection.json:**
```json
{
  "stages": {
    "discovery": {
      "keywords": [
        "security concerns",
        "compliance requirements", 
        "data breach",
        "vulnerability assessment",
        "current security stack"
      ]
    }
  }
}
```

### 2. When User Provides Objections

**User says:** "Customers always say 'We already have security tools'"

**You create objection-handlers.json:**
```json
{
  "objections": {
    "existing_solution": {
      "triggers": ["already have", "using", "current vendor"],
      "response_template": "I understand you have security tools. Most of our clients did too. What they found was [specific gap]. Can I show you how we complement your existing stack?",
      "coaching_hint": "Bridge, don't replace"
    }
  }
}
```

### 3. When User Provides Sales Methodology

**User says:** "We use the Challenger Sale methodology"

**You update multiple files:**

**core-principles.json:**
```json
{
  "methodology": "Challenger",
  "principles": [
    "Teach customers something new about their business",
    "Tailor the message to the stakeholder",
    "Take control of the conversation",
    "Challenge customer thinking constructively"
  ]
}
```

**prompt-template.md:**
```markdown
You are a Challenger Sale coach. Focus on:
- Teaching insights the customer doesn't know
- Reframing their problem
- Leading to your unique solution
```

### 4. When User Wants Different Coaching Styles

**User says:** "I want very brief, action-only prompts"

**You update compression-settings.json:**
```json
{
  "response_style": {
    "format": "action_only",
    "max_words": 10,
    "include_reasoning": false,
    "include_example": false
  }
}
```

---

## File Update Recipes

### Recipe 1: Complete Customization Flow

```typescript
// 1. After discovery interview, create customer profile
const customerProfile = {
  industry: "cybersecurity",
  methodology: "Challenger",
  avgDealSize: "$50K-$200K",
  salesCycle: "3-6 months",
  mainObjections: ["price", "existing_tools", "integration"]
};

// 2. Update stage-detection.json
updateStageDetection({
  discovery: addIndustryKeywords(customerProfile.industry),
  objection: customerProfile.mainObjections
});

// 3. Update core-principles.json
updateCorePrinciples({
  methodology: customerProfile.methodology,
  rules: getMethodologyPrinciples(customerProfile.methodology)
});

// 4. Update compression based on preferences
updateCompression({
  maxWords: userPreference.wordCount,
  style: userPreference.coachingStyle
});
```

### Recipe 2: Document Import Flow

```typescript
// When user provides their playbook
async function importSalesPlaybook(documentPath: string) {
  // 1. Process with DocumentProcessor
  const processed = await documentProcessor.processDocument(documentPath);
  
  // 2. Extract techniques and responses
  const techniques = extractSalesTechniques(processed);
  const objectionHandlers = extractObjectionHandlers(processed);
  
  // 3. Update configurations
  updateConfigurations({
    techniques,
    objectionHandlers,
    coreMessages: extractKeyMessages(processed)
  });
  
  // 4. Test with user scenarios
  return testConfiguration(userScenarios);
}
```

---

## Common Customization Scenarios

### Scenario 1: Financial Services Company
```json
// stage-detection.json additions
"keywords": ["ROI", "risk assessment", "compliance", "portfolio"]

// core-principles.json
"principles": ["Always discuss risk mitigation", "Provide case studies with numbers"]

// coaching-responses.md
"format": "formal", "include_compliance_reminders": true
```

### Scenario 2: SaaS Startup
```json
// stage-detection.json additions  
"keywords": ["free trial", "implementation", "API", "integration"]

// core-principles.json
"principles": ["Push for trial commitment", "Focus on ease of setup"]

// coaching-responses.md
"format": "casual", "emphasize_speed_to_value": true
```

### Scenario 3: Healthcare Technology
```json
// stage-detection.json additions
"keywords": ["HIPAA", "patient outcomes", "clinical workflow", "EHR"]

// core-principles.json
"principles": ["Always mention compliance", "Lead with patient benefit"]

// coaching-responses.md
"format": "professional", "include_clinical_evidence": true
```

---

## Testing Patterns

### After Each Configuration Change:

```typescript
function testConfigChange(change: ConfigChange) {
  // 1. Create test scenario based on change
  const scenario = createTestScenario(change);
  
  // 2. Generate coaching prompt
  const prompt = generateCoachingPrompt(scenario);
  
  // 3. Show user the result
  showUser({
    scenario: scenario.customerStatement,
    coaching: prompt.suggestion,
    reasoning: prompt.reasoning
  });
  
  // 4. Get feedback
  const feedback = getUserFeedback();
  
  // 5. Refine if needed
  if (feedback.needsAdjustment) {
    refineConfiguration(feedback);
  }
}
```

---

## Validation Checklist Implementation

```typescript
async function validateCustomization() {
  const tests = [
    {
      name: "Stage Detection",
      test: () => testStageDetection(userExamples),
      fix: () => addMoreKeywords()
    },
    {
      name: "Objection Handling",
      test: () => testObjectionResponses(commonObjections),
      fix: () => refineObjectionHandlers()
    },
    {
      name: "Prompt Brevity",
      test: () => testPromptLength(targetLength),
      fix: () => adjustCompression()
    },
    {
      name: "Methodology Alignment",
      test: () => testMethodologyCompliance(methodology),
      fix: () => updatePrinciples()
    }
  ];
  
  for (const test of tests) {
    const result = await test.test();
    if (!result.passed) {
      await test.fix();
    }
  }
}
```

---

## Error Recovery Patterns

### When Configuration Causes Issues:

```typescript
function handleConfigurationError(error: Error) {
  // 1. Identify which config caused issue
  const problematicConfig = identifyProblematicConfig(error);
  
  // 2. Revert to last working version
  revertConfiguration(problematicConfig);
  
  // 3. Inform user simply
  tellUser("I noticed an issue with that setting. Let's try a different approach.");
  
  // 4. Try alternative configuration
  const alternative = suggestAlternative(problematicConfig);
  applyConfiguration(alternative);
}
```

---

## Quick Command Reference

```bash
# Check current configuration status
node check-config.js

# Test with user's scenario
node test-scenario.js "Customer says: I need to think about it"

# Import sales playbook
node import-playbook.js path/to/playbook.pdf

# Reset to defaults
node reset-config.js

# Export configuration for sharing
node export-config.js > my-company-config.json
```

---

## Important Notes

1. **Never expose these technical details to sales managers**
2. **Always translate technical changes into business language**
3. **Test every change with real scenarios before confirming**
4. **Keep backup of working configurations**
5. **Document what worked for each customer type**

## Success Metrics

- Configuration time: < 30 minutes
- User satisfaction: No technical confusion
- Coaching accuracy: > 90% relevant suggestions
- Performance: Prompts generated in < 200ms