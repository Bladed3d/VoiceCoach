# 🚨 **ESCALATION ASSISTANT - Interactive Problem Reporting**

## **TRIGGER COMMAND**
When user says: **"escalate"** → Claude initiates guided escalation form

---

## **CLAUDE ESCALATION FORM WORKFLOW**

### **Step 1: Initialize Escalation**
**Claude Response:**
```
🚨 ESCALATION ASSISTANT ACTIVATED

I'll walk you through a quick form to ensure we capture all the details needed for PM2 to resolve this completely.

ESCALATION FORM:
Task Agent: project-manager2
Prompt: "PROBLEM ESCALATION: [Will be filled as we go]

---

STEP 1/4: What are you currently seeing?
Please describe what's on your screen OR paste a screenshot.
(Screenshots are preferred - they give the debugging agent visual confirmation)
```

### **Step 2: Capture Expected Behavior**
**Claude Response After User Provides Issue:**
```
✅ ISSUE CAPTURED: [User's description/screenshot]

---

STEP 2/4: What did you expect to see instead?
Please describe the expected behavior. **IMPORTANT**: For interface design, provide a SCREENSHOT rather than a URL to prevent agents from copying old deprecated code.

**PREFERRED:**
- Screenshot of the interface you want to match
- "Should display Activity Grid with draggable items" 
- Visual description of expected layout

**AVOID URLs** (agents may copy old code instead of building fresh):
- ❌ "Should show timeline like https://daily-actions4" (agent copies React Beautiful DnD)
- ✅ "Should match this interface: [screenshot]" (agent builds with DnD Kit)
```

### **Step 3: Add Context (Optional)**
**Claude Response After User Provides Expected Behavior:**
```
✅ EXPECTED BEHAVIOR CAPTURED: [User's expectation]

---

STEP 3/4: Any additional context? (Optional)
Examples:
- What were you trying to do when this happened?
- Did this work before? When did it break?
- Any specific errors you noticed?
- Which browser/device are you using?

Type "none" to skip this step.
```

### **Step 4: Deploy Confirmation**
**Claude Response After Context (or Skip):**
```
✅ CONTEXT CAPTURED: [User's context or "none"]

---

ESCALATION SUMMARY:
OBSERVED ISSUE: [User's description/screenshot]
EXPECTED BEHAVIOR: [User's expectation]
CONTEXT: [User's context or "Minimal context provided"]

STEP 4/4: Deploy Escalation?
Y - Deploy PM2 with full authority to resolve this
N - Cancel escalation
C - Add comments/modifications before deploying

Your choice: Y/N/C
```

### **Step 5A: Deploy (If Y)**
**Claude Response:**
```
✅ ESCALATION DEPLOYED

**CORRECTED ESCALATION PROTOCOL:**
I will now function as the Project Manager and follow the instructions in .claude\project-manager2.md

Let me read the project manager instructions and execute the escalation protocol as PM2:

[Claude reads D:\Projects\Ai\Apps\Life-Designer\sub-projects\Lightwalker\.claude\project-manager2.md]
[Claude functions as Project Manager following that file's Problem Escalation Protocol]

🎯 PM2 escalation protocol is now executing. You'll receive updates as agents are deployed and the issue is resolved.
```

### **Step 5B: Comments (If C)**
**Claude Response:**
```
Please provide your additional comments or modifications:
(After you provide them, I'll ask again: Deploy Escalation? Y/N)
```

### **Step 5C: Cancel (If N)**
**Claude Response:**
```
❌ Escalation cancelled. 

If you change your mind, just say "escalate" again to restart the form.
```

---

## **CLAUDE IMPLEMENTATION INSTRUCTIONS**

### **When User Says "escalate":**

1. **START FORM**: Show Step 1 template
2. **COLLECT ISSUE**: Wait for user response, then show Step 2
3. **COLLECT EXPECTATION**: Wait for user response, then show Step 3  
4. **COLLECT CONTEXT**: Wait for user response, then show Step 4
5. **CONFIRM DEPLOYMENT**: Show summary and Y/N/C options
6. **EXECUTE**: Based on user choice, deploy, modify, or cancel

### **Form Validation:**
- ✅ **Issue Required**: Must have description or screenshot
- ✅ **Expectation Required**: Must describe what should happen instead
- ⚠️ **Context Optional**: Can be skipped
- ⚠️ **Comments Optional**: Only if user chooses "C"

### **Quality Assurance:**
- Ensure each step is clearly marked (STEP X/4)
- Use checkmarks (✅) to confirm captured information
- Show complete summary before deployment
- Give user control with Y/N/C options

---

## **EXAMPLE COMPLETE INTERACTION**

### **User:** "escalate"

### **Claude:** 
```
🚨 ESCALATION ASSISTANT ACTIVATED

STEP 1/4: What are you currently seeing?
Please describe what's on your screen OR paste a screenshot.
```

### **User:** [Pastes screenshot of minimal test interface]

### **Claude:**
```
✅ ISSUE CAPTURED: Screenshot showing "MINIMAL TEST SUCCESS" interface instead of complete application

STEP 2/4: What did you expect to see instead?
Please describe the expected behavior and include any reference URLs if available.
```

### **User:** "Should show timeline like https://lightwalker-mvp.vercel.app/daily-actions4"

### **Claude:**
```
✅ EXPECTED BEHAVIOR CAPTURED: Should show timeline like daily-actions4

STEP 3/4: Any additional context? (Optional)
Type "none" to skip this step.
```

### **User:** "none"

### **Claude:**
```
✅ CONTEXT CAPTURED: Minimal context provided

ESCALATION SUMMARY:
OBSERVED ISSUE: Screenshot showing "MINIMAL TEST SUCCESS" interface instead of complete application  
EXPECTED BEHAVIOR: Should show timeline like https://lightwalker-mvp.vercel.app/daily-actions4
CONTEXT: Minimal context provided

STEP 4/4: Deploy Escalation? Y/N/C
```

### **User:** "Y"

### **Claude:**
```
✅ ESCALATION DEPLOYED

Task Agent: project-manager2
Prompt: "PROBLEM ESCALATION: Interface showing minimal test instead of complete application

OBSERVED ISSUE: Screenshot showing "MINIMAL TEST SUCCESS" interface instead of complete application
EXPECTED BEHAVIOR: Should show timeline like https://lightwalker-mvp.vercel.app/daily-actions4  
CONTEXT: Minimal context provided

ESCALATION AUTHORITY GRANTED: Deploy any agents needed to resolve this completely."

🎯 PM2 is now working on your problem.
```

---

## **BENEFITS OF THIS SYSTEM**

### **For User:**
- ✅ **Guided Process**: No need to remember escalation format
- ✅ **Complete Coverage**: Form ensures all necessary info captured
- ✅ **Control**: Y/N/C options give final approval control
- ✅ **Consistent**: Same format every time

### **For PM2:**  
- ✅ **Structured Input**: Always receives well-formatted problem reports
- ✅ **Visual Evidence**: Encourages screenshot inclusion
- ✅ **Clear References**: Expected behavior with URLs when possible
- ✅ **Ready to Deploy**: Complete context for immediate agent deployment

### **For Resolution:**
- ✅ **Faster Diagnosis**: Better input = faster agent deployment
- ✅ **Fewer Questions**: Complete info prevents back-and-forth
- ✅ **Higher Success Rate**: Clear expectations improve resolution quality

---

**MOTTO**: "Just say 'escalate' and I'll guide you through capturing everything PM2 needs to fix the problem completely."