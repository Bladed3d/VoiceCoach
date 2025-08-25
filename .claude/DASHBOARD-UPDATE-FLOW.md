# Dashboard Update Flow - Automated Pipeline Reporting

## Overview
Dashboard updates are now distributed across 3 key agents, removing burden from Project Manager and ensuring real-time visibility.

## Update Responsibility Matrix

### Project Manager
- **Creates** initial project entry
- **Deploys** agents (Lead Programmer → Breadcrumbs → Claude Tester)
- **Watches** dashboard for updates (no manual updates needed)
- **Moves** to next phase when Claude Tester reports success

### Lead Programmer
- **Updates** when implementation complete
- **Reports**: "Implemented [feature] - [X] tasks complete"
- **Progress**: Adds task value to overall progress

### Breadcrumbs Agent
- **Updates** when LED tracking added
- **Reports**: "LED tracking added to [X] files - debugging ready"
- **Progress**: Adds 5% for instrumentation

### Claude Tester Agent (8 Update Points)
1. **Start Testing**: "Starting automated testing - LED monitoring active"
2. **Test Run**: "Running Playwright tests - [X/Y] passed"
3. **Failure Detection**: "Test failed at LED [XXX] - analyzing error"
4. **Error Detection Deploy**: "Deployed Error Detection Agent - diagnosing"
5. **Fix Deploy**: "Deployed [Agent] - fixing: [issue]"
6. **Retesting**: "Fix applied - retesting (attempt [X/5])"
7. **Success**: "✅ ALL TESTS PASSING - Phase [X] verified"
8. **Failure**: "❌ MANUAL INTERVENTION NEEDED - [error]"

## Complete Flow Example

```
PM: Creates project → "Project initialized"
    ↓
PM: Deploys Lead Programmer
    ↓
Lead Programmer: "Implementing audio capture..." 
                 "Audio capture implemented - 5 tasks complete" (+20%)
    ↓
PM: Deploys Breadcrumbs Agent
    ↓
Breadcrumbs: "Adding LED tracking..."
             "LED tracking added to 8 files" (+5%)
    ↓
PM: Deploys Claude Tester Agent
    ↓
Claude Tester: "Starting automated testing"
               "Running Playwright tests - 3/5 passed"
               "Test failed at LED 505 - Permission denied"
               "Deployed Error Detection Agent"
               "Deployed Error Correction - fixing permission handler"
               "Fix applied - retesting (attempt 1/5)"
               "Running Playwright tests - 5/5 passed"
               "✅ ALL TESTS PASSING - Phase 2 verified" (+5%)
    ↓
PM: Sees success, moves to Phase 3
```

## Key Benefits

1. **Real-time Visibility**: Dashboard updates at every significant step
2. **No PM Overhead**: PM just watches, doesn't update
3. **Error Transparency**: Failed tests immediately visible with LED context
4. **Progress Tracking**: Automatic progress calculation
5. **Attention Flags**: `needsAttention: true` for failures

## Implementation Notes

- Each agent includes project ID from PM's initial prompt
- Progress increments are cumulative (current + task value)
- Claude Tester Agent provides most granular updates (8 points)
- All updates use same API endpoint: `POST http://localhost:3000/api/pipelines`

## Dashboard Fields Used

```javascript
{
  "id": "[project-id]",              // From PM prompt
  "assignedTo": "[Agent Name]",       // Who's working
  "currentTask": "[Description]",     // What's happening
  "progress": [0-100],                // Overall progress
  "status": "active|blocked",         // Project state
  "needsAttention": true|false        // Alert flag
}
```

## Critical Rule

**EVERY agent completion MUST update dashboard** - no exceptions. This ensures PM and user have complete visibility without manual tracking.