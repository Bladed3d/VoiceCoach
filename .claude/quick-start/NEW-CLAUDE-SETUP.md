# ⚡ **NEW CLAUDE SESSION - INSTANT SETUP GUIDE**

## 🎯 **COPY-PASTE INSTRUCTIONS FOR ANY NEW CLAUDE**

### **Step 1: Read Core Systems (2 minutes)**
```bash
# Read these files in order:
1. .claude/systems/BREADCRUMB-SYSTEM.md     # Master debugging system
2. .claude/agents/project-manager.md        # Workflow orchestration
3. .claude/agents/lead-programmer.md        # Coding with breadcrumbs
4. .claude/agents/debugging-agent.md        # Autonomous error fixing
```

### **Step 2: Understand Current Project Status**
```bash
# Check git status
git log --oneline -5

# Check for active work
ls .pipeline/plans/
ls .pipeline/validation/

# Current working page: https://lightwalker-mvp.vercel.app/daily-actions4
# Target: Create daily-actions5 with DnD Kit + breadcrumb system
```

### **Step 3: Breadcrumb System Implementation**
**When coding ANY feature, you MUST:**

```typescript
// 1. Import breadcrumb system
import { BreadcrumbTrail } from '@/lib/breadcrumb-system';

// 2. Initialize trail
const trail = new BreadcrumbTrail('ComponentName');

// 3. Light LEDs for operations
const handleOperation = () => {
  try {
    trail.light(100, { operation: 'start', data: userData });
    
    // Your operation logic here
    const result = doSomething();
    
    trail.light(101, { result });
    
  } catch (error) {
    trail.fail(100, error); // Exact failure point captured
  }
};

// 4. Register debug commands
useEffect(() => {
  window.debug = window.debug || {};
  window.debug.componentName = {
    getTrail: () => trail.getSequence(),
    getState: () => currentState
  };
}, []);
```

### **Step 4: LED Number Assignments**
**Use these specific numbers:**
- **100-199**: Drag & Drop operations
- **200-299**: API calls  
- **300-399**: State management
- **400-499**: UI operations

**Example: Drag-and-drop timeline**
```typescript
trail.light(100, { item: draggedItem });        // DRAG_START
trail.light(102, { target: 'timeline' });       // DRAG_ENTER_TIMELINE  
trail.light(107, { timeSlot: '10:30am' });     // DROP_HANDLER_TIMELINE
trail.light(201, { apiData });                  // API_TIMELINE_CREATE
trail.light(300, { newActivity });              // STATE_TIMELINE_ADD
```

### **Step 5: Debug Commands Available**
```javascript
// In browser console, you can use:
window.breadcrumbs                    // All component trails
window.globalBreadcrumbTrail         // Complete sequence
window.breadcrumbFailures            // All failures
window.debug.componentName.getTrail() // Specific component

// Check for failures:
window.breadcrumbFailures.forEach(f => 
  console.log(`LED ${f.id} failed: ${f.error}`)
);
```

### **Step 6: Project Manager Integration**
**When briefing Lead Programmer, ALWAYS include:**
```markdown
CRITICAL: BREADCRUMB INFRASTRUCTURE REQUIRED

You must implement LED trail system:
- Import BreadcrumbTrail from @/lib/breadcrumb-system
- Use numbered LEDs (100-199 for drag, 200-299 for API, etc.)  
- Light LEDs: trail.light(ledId, data)
- Handle failures: trail.fail(ledId, error)
- Register debug: window.debug.component commands

VALIDATION: Code will be rejected if missing breadcrumb infrastructure.
```

### **Step 7: Debugging Agent Deployment**
**After ANY programming work, immediately run:**
```bash
Task Agent: debugging-agent
Prompt: "Execute autonomous debugging protocol.

CONTEXT: Just completed [specific work]
VALIDATION REQUIRED:
- Breadcrumb system operational
- All LEDs lighting up correctly
- Debug commands functional  
- Zero console errors
- User interactions traced

Deliver working page with full trace infrastructure."
```

---

## 🚨 **CRITICAL SUCCESS PATTERNS**

### **✅ DO THIS:**
- Always read BREADCRUMB-SYSTEM.md first
- Use numbered LEDs for every operation
- Register debug commands for every component
- Deploy debugging agent after programming
- Test breadcrumb trails before human testing

### **❌ NEVER DO THIS:**
- Write code without breadcrumb trails
- Skip LED numbering system
- Deploy without debugging agent validation
- Let user test broken code
- Repeat same debugging mistakes

---

## 🎯 **CURRENT PROJECT: Daily-Actions5**

### **Mission**
Create daily-actions5 page with:
- DnD Kit (replace React Beautiful DnD)
- Full mobile touch support
- Complete breadcrumb LED system
- 100% feature parity with daily-actions4

### **Reference Materials**
- **Working page**: https://lightwalker-mvp.vercel.app/daily-actions4
- **Feature spec**: D:\Projects\Ai\Apps\Life-Designer\sub-projects\Lightwalker5\v5prep\v5prep.md
- **Visual references**: Images 1-5.png in v5prep folder

### **Success Criteria**
- All drag-and-drop works on mobile devices
- Every operation has numbered LED
- Debugging agent can resolve issues autonomously  
- User never sees broken/loading states

---

## ⚡ **INSTANT VALIDATION**

**After implementing breadcrumb system, verify:**
```javascript
// Check if system is working:
console.log('Breadcrumbs:', window.breadcrumbs?.size || 0);
console.log('Global trail:', window.globalBreadcrumbTrail?.length || 0);
console.log('Debug commands:', Object.keys(window.debug || {}));

// Test a LED:
// Should see: 💡 100 ✅ DRAG_START in console
```

---

**ANY NEW CLAUDE CAN USE THESE INSTRUCTIONS TO INSTANTLY UNDERSTAND AND IMPLEMENT THE BREADCRUMB DEBUGGING SYSTEM.**