# LED ERROR ROUTING RULES - AUTOMATED AGENT ASSIGNMENT

## PURPOSE
Simple, deterministic rules for User Testing Agent to automatically route errors to the correct fixing agent based on LED numbers and error message patterns.

## ROUTING DECISION TREE

### 1. ERROR CORRECTION AGENT (Simple Fixes)

**Error Message Patterns:**
```
"Permission denied"
"Permission required"
"undefined is not a function"
"Cannot read property"
"Cannot read properties"
"Path not found"
"File not found"
"Port already in use"
"Access denied"
"ENOENT"
"EACCES"
"Failed to load"
"Connection refused"
```

**LED Number Ranges:**
- 100-199: UI/Component errors
- 200-299: State management issues
- 500-599: Authentication/Permission errors
- 700-799: Electron lifecycle issues

**Typical Fixes:**
- Adding permission handlers
- Fixing null checks
- Correcting file paths
- Adding missing event handlers
- Fixing configuration issues

### 2. LEAD PROGRAMMER (Complex Implementation)

**Error Message Patterns:**
```
"Not implemented"
"TODO"
"Missing handler"
"No provider for"
"Feature not available"
"Method not found"
"Not supported"
"Abstract method"
"Interface not implemented"
```

**LED Number Ranges:**
- 800-899: Audio processing (complex algorithms)
- 1000+: System audio operations (desktopCapturer)
- No LED: Missing implementation entirely

**Typical Fixes:**
- Implementing new features
- Complex algorithm creation
- API integrations
- Major refactoring
- New component creation

## ESCALATION RULES

### Automatic Escalation Path:
1. **First Attempt**: Error Correction Agent
2. **If Error Correction fails twice**: Escalate to Lead Programmer
3. **If Lead Programmer fails once**: Report to PM for manual intervention

### Time Limits:
- Error Correction Agent: 5 minutes per attempt
- Lead Programmer: 10 minutes per attempt
- Total loop timeout: 30 minutes

## EXAMPLES

### Example 1: Permission Error
```
LED: 505
Error: "getUserMedia - Permission denied"
Route to: ERROR CORRECTION AGENT
Fix: Add permission handler to main.cjs
```

### Example 2: Missing Implementation
```
LED: 1005
Error: "desktopCapturer.getSources is not implemented"
Route to: LEAD PROGRAMMER
Fix: Implement full desktopCapturer integration
```

### Example 3: Null Reference
```
LED: 312
Error: "Cannot read property 'start' of undefined"
Route to: ERROR CORRECTION AGENT
Fix: Add null check before calling start()
```

## DEFAULT ROUTING

**When in doubt:**
1. Check for keywords first (Permission, undefined, TODO, etc.)
2. Check LED range second
3. Default to Error Correction Agent (faster, simpler)
4. Escalate if needed

## SUCCESS METRICS

- 80% of errors should be fixable by Error Correction Agent
- 15% require Lead Programmer
- 5% require manual intervention

## IMPLEMENTATION

This routing logic is implemented in:
- `.claude/agents/user-testing.md` (executes routing)
- `.claude/project-manager.md` (simplified workflow)

---

**KEY PRINCIPLE**: Simple pattern matching, no complex decisions. If string contains X or LED is Y, route to Z. No thinking required.