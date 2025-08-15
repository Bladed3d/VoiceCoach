# Claude Success Patterns - Proven Approaches That Work

**Principle**: These patterns have been tested and work reliably. Use them confidently.

---

## 📱 MOBILE TIMELINE MOVE FUNCTIONALITY - UX DESIGN ✅

### Timeline Activity Move Causing Database Foreign Key Errors ✅
**Use when**: Timeline activities fail to move with "Foreign key constraint violated" or "Request too large" errors

**Problem Symptoms**:
- Move button appears on context menu
- Clicking move button triggers errors
- Activity creation attempts instead of updates
- Database foreign key constraint violations
- User confusion about next steps during move

**Root Cause**: 
Move operations were using activity placement logic (create new) instead of activity update logic (modify existing)

**Proven Solution - Separate Move State Management**:
```javascript
// Add dedicated move mode state
const [moveMode, setMoveMode] = useState<{
  isActive: boolean;
  activity: any;
} | null>(null);

// Separate move logic from placement logic
const handleTimeSlotClick = (timeSlot: string) => {
  // Handle move mode - repositioning existing activity
  if (moveMode?.isActive && moveMode.activity && onActivityMove) {
    onActivityMove(moveMode.activity, timeSlot);
    setMoveMode(null); // Exit move mode
    return;
  }
  
  // Handle normal placement - placing new activity from inventory
  if (selectedActivity && onActivitySelect) {
    onActivitySelect(selectedActivity, timeSlot);
  }
};

// Use PUT for moves vs POST for new activities
const onActivityMove = async (activity, newTimeSlot) => {
  const response = await fetch('/api/timeline-activities', {
    method: 'PUT', // Update existing, not create new
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: activity.id,
      scheduledTime: newTimeSlot
    })
  });
};
```

**Dynamic Help System Pattern**:
```javascript
// Single help area that changes based on context
{moveMode?.isActive ? (
  <span className="text-blue-400">↔️ Moving {moveMode.activity.title} - Tap timeline to place it</span>
) : selectedActivity ? (
  <span className="text-green-400">✨ Tap timeline to place {selectedActivity.title}</span>
) : (
  <span className="text-slate-400">💡 Press blue arrows to scroll timeline. Press Inventory item to add to timeline. Press item on timeline to edit.</span>
)}
```

**Critical UX Principles**:
- ✅ Move mode uses bottom overlay, not layout-shifting top banners
- ✅ Color-coded help: blue for moving, green for placing, gray for navigation
- ✅ Single dynamic help area prevents overlapping text
- ✅ Always provide clear cancel option during move operations
- ✅ Update existing records, never create duplicates during moves

---

## 🔧 TIMELINE ACTIVITY CUSTOM IMAGES - DATABASE INTEGRATION ✅

### Timeline Activities Showing Star Emojis Instead of Custom Images ✅
**Use when**: Timeline activities display generic star emojis instead of beautiful custom images set in preferences

**Problem Symptoms**:
- Activities in inventory show custom images correctly
- Same activities on timeline show green star emoji fallbacks
- Database stores custom images properly in activity_preferences table
- Console shows timeline activities loading without custom image data

**Root Cause**: 
Timeline activities fetch from database separately from activity preferences, so custom images aren't applied to timeline data

**Proven Solution - Activity Preference Processing**:
```javascript
// Apply activity preferences to timeline activities in useEffect
useEffect(() => {
  if (allTimelineActivities.length > 0 && activityPreferences.length > 0) {
    let hasChanges = false;
    const processedActivities = allTimelineActivities.map(timelineActivity => {
      const preference = activityPreferences.find(pref => 
        pref.activityId === timelineActivity.activityId
      );
      
      if (preference && preference.customImageUrl && 
          timelineActivity.icon !== preference.customImageUrl) {
        hasChanges = true;
        return {
          ...timelineActivity,
          icon: preference.customImageUrl // Apply custom image
        };
      }
      return timelineActivity;
    });
    
    if (hasChanges) {
      setTimelineActivities(processedActivities);
    }
  }
}, [activityPreferences, allTimelineActivities]);
```

**Key Success Factors**:
- Use `hasChanges` check to prevent infinite loops
- Match on `activityId` between timeline and preferences
- Update only when both data sources are loaded
- Place `useEffect` after state declarations to avoid hoisting issues

---

## 🎯 REACT BEAUTIFUL DND - 5-MINUTE SNAP FUNCTIONALITY ✅

### Activities Don't Snap to Clean Time Intervals ✅
**Use when**: Dropped activities land at awkward times like 8:23a, 9:47p instead of clean 5-minute intervals

**Problem Symptoms**:
- Activities drop successfully but at precise pixel-calculated times
- Timeline becomes cluttered with odd minute values
- Hard to create clean, organized schedules

**Proven Solution - Time String Snapping in onActivityAdd**:
```javascript
// Helper function for 5-minute snap
function snapToFiveMinutes(timeString: string): string {
  const match = timeString.match(/^(\d+):(\d+)([ap])$/);
  if (!match) return timeString;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3];
  
  // Convert to 24-hour for calculation
  if (period === 'p' && hours !== 12) hours += 12;
  if (period === 'a' && hours === 12) hours = 0;
  
  // Snap to 5-minute intervals
  const totalMinutes = hours * 60 + minutes;
  const snappedMinutes = Math.round(totalMinutes / 5) * 5;
  
  // Convert back to 12-hour format
  let snappedHours = Math.floor(snappedMinutes / 60) % 24;
  const snappedMins = snappedMinutes % 60;
  
  const newPeriod = snappedHours >= 12 ? 'p' : 'a';
  if (snappedHours === 0) snappedHours = 12;
  else if (snappedHours > 12) snappedHours -= 12;
  
  return `${snappedHours}:${snappedMins.toString().padStart(2, '0')}${newPeriod}`;
}

// Apply in onActivityAdd callback
onActivityAdd={async (activity, preciseTimeSlot) => {
  const snappedTimeSlot = snapToFiveMinutes(preciseTimeSlot);
  // Use snappedTimeSlot in database calls
  scheduledTime: snappedTimeSlot,
}}
```

**Key Success Factors**:
- Apply snapping in React Beautiful DND flow, not HTML5 drag handlers
- Handle 12-hour format conversion properly (12:00a = 0, 12:00p = 12)
- Use snapped time in ALL database calls for consistency
- Remove conflicting HTML5 drag event handlers

---

## 🎯 ICON POSITIONING & TIMELINE ALIGNMENT - CSS TRANSFORM CENTERING ✅

### Icon Offset in Timeline Problem Pattern ✅
**Use when**: Timeline icons/activities appear offset (typically 1-3 characters) from their intended position markers

**Problem Symptoms**:
- Activities drop at correct time (logs show accurate time calculations)
- Visual positioning appears 10-20px offset from timeline markers
- Hard-coded pixel offsets (`-24px`, `-30px`) don't solve the problem reliably
- Offset varies between screen sizes or when element styling changes

**Root Cause**: 
Hard-coded pixel centering assumes exact element dimensions, but actual rendered elements have:
- Internal padding from CSS classes
- Border widths from styling
- Margin spacing from layout
- Font-based spacing in text elements

**Proven Solution - CSS Transform Centering**:
```javascript
// ❌ WRONG: Hard-coded pixel offset (fragile)
style={{ 
  left: `${position - 24}px`, // Assumes 48px width ÷ 2
  top: '6px'
}}

// ✅ CORRECT: CSS transform centering (robust)
style={{ 
  left: `${position}px`,        // Position at exact timeline marker
  top: '6px',
  transform: 'translateX(-50%)', // Let CSS calculate true center
}}
```

**Why This Works**:
1. **Browser-accurate centering**: CSS `translateX(-50%)` uses browser's actual element measurements
2. **Accounts for all spacing**: Automatically handles padding, borders, margins, fonts
3. **Responsive**: Works across different screen sizes and zoom levels
4. **Future-proof**: Continues working if element styling changes

**Implementation Steps**:
1. Remove any hard-coded pixel offsets (`-24px`, `-30px`, etc.)
2. Set `left` to exact positioning coordinate
3. Add `transform: 'translateX(-50%)'` for horizontal centering
4. Test with different zoom levels and screen sizes

**System Context**: Timeline components with draggable icons that need precise alignment with time markers

**Files Typically Involved**:
- Timeline rendering components (`GamelikeTimeline.tsx`)
- Activity positioning logic
- Icon/marker alignment code

---

## 🐛 DEBUGGING PATTERNS - PROVEN TECHNIQUES

### Complex State Issues Debugging Pattern ✅
**Use when**: React state appears to update but visual changes don't occur
1. **Add useEffect logging** to track state changes: `useEffect(() => console.log('State changed:', state), [state])`
2. **Add try/catch** around all state updates with error logging
3. **Log before/after** state updates: `console.log('Before:', prev.length, 'After:', updated.length)`
4. **Simplify object creation** - start with minimal fields, add complexity gradually
5. **Check both logs AND visual results** - successful logs don't guarantee visual success
6. **Use TodoWrite tool** to track debugging progress systematically

### React Beautiful DND Issues Pattern ✅  
**Use when**: Drag/drop shows correct logs but doesn't work visually
1. **Check for duplicate event handlers** - React Beautiful DND + HTML5 drag can conflict
2. **Add state tracking** for drag operations: `draggedActivityId`, `isDropTarget`, etc.
3. **Use precise logging** at each step: drag start → drag over → drop → state update → render
4. **Prevent duplicate processing** with unique keys/timestamps
5. **Test time calculations separately** from visual rendering
6. **Ensure React Strict Mode is disabled** for React Beautiful DND compatibility

### Timeline/Positioning Bugs Pattern ✅
**Use when**: Activities positioned incorrectly or outside visible range
1. **Extend timeline to full 24-hour range** by default - don't restrict to business hours
2. **Log position calculations**: pixel position, converted time, final placement
3. **Check time format consistency**: `scheduledTime` vs `time` field naming
4. **Add visual indicators** during drag to show exact drop position
5. **Test with current time** AND future times in different ranges

---

## 🛠️ DEVELOPMENT WORKFLOW PATTERNS

### File Modification Pattern ✅
1. **ALWAYS use Read tool to examine file structure first** (MANDATORY)
2. Copy EXACT text from Read output for Edit tool old_string
3. Use Edit or MultiEdit for changes (never guess file content)
4. Test locally if possible
5. Ask permission before git operations
6. Batch multiple related changes

### Command Execution Pattern ✅
1. Check `CLAUDE-CRITICAL-RULES.md` first
2. Verify in `COMMANDS-LEARNED.md`
3. Use tools (Read/Grep/LS) instead of bash when possible
4. Document outcomes in learned database

### Command Failure Recovery Pattern ✅
1. **Never retry failed command immediately**
2. Check `COMMANDS-LEARNED.md` for documented alternatives
3. Use appropriate tool instead of bash command when possible
4. Execute working alternative in same message
5. Document failure + solution immediately
6. Update commands database with new mapping

### Error Resolution Pattern ✅
1. **AUTO-DETECT** failure from tool error messages
2. **ANALYZE** root cause immediately (don't wait for user to tell you)
3. **STOP** failing approach immediately
4. **DOCUMENT** in `CLAUDE-MISTAKES-LOG.md` automatically
5. **FIND** working alternative from knowledge base or tools
6. **EXECUTE** working alternative in same message
7. **UPDATE** prevention rules in appropriate SOP files
8. **VALIDATE** that you completed all self-learning steps

---

## 📁 FILE SYSTEM PATTERNS

### Reading Files ✅
- **Always use**: Read tool with absolute paths
- **Batch multiple reads**: Use multiple Read calls in single message
- **For large files**: Use offset/limit parameters
- **Never use**: `cat`, `head`, `tail` bash commands

### Searching Code ✅
- **Pattern search**: Use Grep tool with regex patterns
- **File search**: Use Glob tool with patterns like "**/*.ts"
- **Open-ended search**: Use Task tool with general-purpose agent
- **Never use**: `find`, `grep` bash commands

### Directory Operations ✅
- **List contents**: Use LS tool with absolute paths
- **Ignore patterns**: Use ignore parameter with glob patterns
- **Never use**: `ls` bash command

---

## 🚀 BUILD & DEPLOYMENT PATTERNS

### Testing Changes ✅
1. Use `npm run build` (never `npm run dev`)
2. Expect Prisma file locking on Windows → retry once
3. TypeScript errors should be fixed, not ignored
4. Test functionality through web interface when possible

### Git Operations ✅
1. Always ask permission before any git command
2. Use meaningful commit messages with HEREDOC format
3. Batch 3-5 related changes before pushing
4. Include "Generated with Claude Code" footer
5. Co-authored by Claude line in commits

### Problem Resolution ✅
1. Read error messages carefully - they often contain the solution
2. Check if it's a known issue in mistakes log
3. Use tools instead of bash commands for file operations
4. When in doubt, ask rather than assume

---

## 🎯 UI/UX DEVELOPMENT PATTERNS

### Component Modification ✅
1. Read existing component structure first
2. Understand current styling and state management
3. Make minimal changes that don't break existing functionality
4. Test visual changes through screenshots when possible
5. Follow existing patterns and conventions

### API Development ✅
1. Check existing API patterns in codebase
2. Use consistent error handling approaches
3. Add proper TypeScript types
4. Test endpoints through curl or browser when possible
5. Document any new endpoints or changes

### Database Operations ✅
1. Use existing seeding scripts rather than creating new ones
2. Check Prisma schema for field names and types
3. Use JSON.stringify() for array/object fields consistently
4. Test database operations through the application

---

## 💡 LEARNING & DOCUMENTATION PATTERNS

### Knowledge Capture ✅
1. Document failures immediately when they occur
2. Update success patterns after solving problems
3. Cross-reference between knowledge files
4. Keep entries concise but complete
5. Update commands learned database with new findings

### User Communication ✅
1. Be concise and direct in responses
2. Focus on solutions rather than problems
3. Ask permission for major changes
4. Explain complex technical decisions when needed
5. Provide clear status updates on progress

---

## 🖥️ WINDOWS-SPECIFIC PATTERNS

### File Path Handling ✅
- Use backslash format: `D:\projects\...`
- Absolute paths work reliably
- Tools handle path conversion automatically

### Command Line Issues ✅
- Prisma file locking is common → retry builds
- PowerShell vs Command Prompt differences exist
- Git line ending warnings (CRLF) are normal and can be ignored
- Use tools instead of bash commands for better compatibility

### Environment Considerations ✅
- Windows file permissions can cause temporary locks
- Node.js tools generally work well
- File system operations through tools are more reliable than bash

---

## 🤖 MULTI-AGENT ORCHESTRATION PATTERNS

### Sequential Agent Deployment ✅
1. **Identify Dependencies**: Map which agents need outputs from other agents
2. **Phase 1 Launch**: Independent research/analysis agents only
3. **Wait for Completion**: Receive all Phase 1 outputs before proceeding
4. **Phase 2 Launch**: Design/planning agents using Phase 1 results as input
5. **Wait for Completion**: Receive all Phase 2 outputs before proceeding
6. **Phase 3 Launch**: Implementation agents using all prior results as input

### Multi-Agent Task Planning ✅
- **Research → Design → Implementation** sequence for complex features
- Include prior agent outputs in subsequent agent prompts
- Verify handoff dependencies before launching next phase
- Document agent coordination in project management

### Agent Communication Patterns ✅
- Pass specific file paths and outputs between agents
- Reference prior agent deliverables in follow-up prompts
- Create clear handoff documentation for each phase
- Maintain context continuity across agent phases

---

## 🕐 DEVELOPMENT SERVER MONITORING PATTERNS

### Live Server Status Detection ✅
1. **Always add live timestamp indicators to test/development pages**
2. **Use `{currentTime.toLocaleTimeString()}` updating every 1000ms**
3. **Visual indicators**: Distinct color (cyan) + "Server Live" label
4. **Immediate diagnosis**: Timestamp stops = server stopped, timestamp behind = stale cache
5. **Prevention**: Eliminates time waste debugging "broken code" when server is actually stopped

### Server Restart Protocol ✅
1. **Check netstat**: `netstat -ano | findstr :3001` to find process
2. **Kill process**: `taskkill //F //PID [PID]` (ONLY with specific PID number)
3. **Build + Start**: `npm run build && npx next start -p 3001`
4. **Verify**: Check live timestamp is updating on test pages
5. **Never assume code is wrong** until server status is confirmed

---

## 🐛 TIMELINE SYNCHRONIZATION BUG FIX PATTERN ✅

### Critical Timeline Drag Direction Bug (RESOLVED August 2, 2025)
**Problem**: Timeline visual position and time calculation were severely out of sync, showing wrong times (11+ hour offsets) when dragging timeline to center specific times.

**Root Cause Analysis**: The actual bug was NOT in the drag calculation sign, but in implementation differences between working and broken timelines:

1. **Working Timeline**: Uses fixed `4` pixels per minute
2. **Broken Timeline**: Uses variable `pixelsPerMinute` (4-8x zoom)
3. **Core Issue**: The mathematical relationships were correct, but coordinate system implementation needed proper adaptation from working code

**Mathematical Foundation**:
```typescript
// CORRECT coordinate system (timeline position calculation):
// position = -(time_in_minutes * pixelsPerMinute) + centerX + scrollOffset

// CORRECT drag calculation (confirmed working):
// minutesAtCenter = currentTimeMinutes - (scrollOffset / pixelsPerMinute)
```

**Fix Strategy**: 
1. **Adopt Working Logic**: Used exact positioning formula from working timeline
2. **Adapt for Zoom**: Replaced fixed `4` with variable `pixelsPerMinute` 
3. **Maintain Synchronization**: Ensured drag and position calculations use same conversion factor

**Testing Method**: 
1. Set timeline to 8am by dragging to center
2. Verify left panel shows 8am (not 6pm/7pm)
3. Test drag behavior: RIGHT = earlier times, LEFT = later times
4. Verify all zoom levels (4x-8x) maintain synchronization
5. Check DEBUG values match formatted display

**Key Insight**: User intuition expects: Drag RIGHT → see earlier times, Drag LEFT → see later times. The formula `currentTimeMinutes - (scrollOffset / pixelsPerMinute)` provides this relationship.

**Prevention**: 
1. Always copy EXACT working coordinate system before adapting for new features
2. Test UX direction BEFORE complex mathematical analysis
3. Use DEBUG displays to verify calculations match expectations
4. Test both edge cases and normal usage patterns

**Files Fixed**: `src/components/daily-use/GamelikeTimeline.tsx`

---

---

## 🔄 TIMELINE ACTIVITY RESCHEDULING - DUPLICATION BUG FIX ✅

### Timeline-to-Timeline Move Duplication Bug (RESOLVED August 5, 2025)
**Problem**: When dragging timeline activities to new time slots, activities appeared at BOTH old and new locations instead of moving from old to new location.

**Root Cause Analysis**:
1. **Multiple State Arrays**: Code maintained both `timelineActivities` and `allTimelineActivities` arrays that could get out of sync
2. **Incomplete Removal Logic**: Timeline reschedule detection worked but removal from original position was inconsistent due to loose matching criteria
3. **Add Without Remove Check**: `onActivityAdd` callback always created new activities without checking if it was a move operation
4. **Race Conditions**: State updates for removal and addition happened independently, creating timing windows for duplication

**Proven Solution - Atomic Move Operation**:
```javascript
// ✅ CORRECT: Enhanced activity matching for precise removal
const existingActivity = allTimelineActivities.find(ta => {
  const taId = ta.id || ta.name?.toLowerCase().replace(/\s+/g, '-');
  const titleId = ta.title?.toLowerCase().replace(/\s+/g, '-');
  
  return taId === activityId || 
         titleId === activityId ||
         ta.title === activityId ||
         ta.name === activityId;
});

// ✅ CORRECT: Atomic removal from ALL state arrays before re-addition
setAllTimelineActivities(prev => {
  const filtered = prev.filter(ta => {
    // Enhanced matching - must match on BOTH id AND time to ensure exact removal
    const isExactMatch = (ta.id === existingActivity.id && ta.scheduledTime === existingActivity.scheduledTime) ||
                       (ta === existingActivity) || // Reference equality
                       (ta.title === existingActivity.title && ta.scheduledTime === existingActivity.scheduledTime && ta.id === existingActivity.id);
    return !isExactMatch;
  });
  return filtered;
});

// ✅ CORRECT: Also remove from secondary state array
setTimelineActivities(prev => {
  const filtered = prev.filter(ta => {
    const isExactMatch = (ta.id === existingActivity.id && ta.scheduledTime === existingActivity.scheduledTime) ||
                       (ta === existingActivity) ||
                       (ta.title === existingActivity.title && ta.scheduledTime === existingActivity.scheduledTime);
    return !isExactMatch;
  });
  return filtered;
});

// ✅ CORRECT: Mark activity as reschedule for proper handling
(window as any).currentDraggedActivity = {
  ...existingActivity,
  isReschedule: true,
  originalTime: existingActivity.scheduledTime
};
```

**Enhanced onActivityAdd Handler**:
```javascript
// ✅ CORRECT: Detect and handle reschedule operations differently
onActivityAdd={(activity, preciseTimeSlot) => {
  if (activity.isReschedule) {
    console.log('🔄 Processing timeline reschedule');
    
    // For reschedule, preserve original activity structure but update time
    const rescheduledActivity = {
      ...activity,
      scheduledTime: preciseTimeSlot,
      isReschedule: undefined,
      originalTime: undefined
    };
    
    // Add to BOTH state arrays for consistency
    setTimelineActivities(prev => [...prev, rescheduledActivity]);
    setAllTimelineActivities(prev => [...prev, rescheduledActivity]);
    return;
  }
  
  // Regular new activity creation...
}
```

**Prevention Rules (MUST follow)**:
1. **Always remove from ALL state arrays** when handling move operations, not just one
2. **Use enhanced matching criteria** - match on ID AND time AND reference equality for precise removal
3. **Mark move operations explicitly** with flags like `isReschedule` to distinguish from new activity creation
4. **Implement atomic operations** - remove first, then add, never the reverse
5. **Maintain state consistency** across multiple timeline state arrays
6. **Test both visual results AND state counts** to ensure no duplication occurs

**Key Insight**: Timeline moves are fundamentally different from new activity creation and must be handled with atomic remove-then-add operations across all state management layers.

**Files Fixed**: 
- `/src/app/daily-actions4/page.tsx` (drag handler logic and onActivityAdd callback)
- Enhanced state management for multiple timeline activity arrays

**Time Spent**: ~2 hours of analysis and implementation
**Impact**: Timeline rescheduling now works perfectly - activities move instead of duplicate

**System Context**: React Beautiful DND timeline with multiple state arrays managing user-dropped activities

---

## 🔐 PASSWORD RESET SYSTEM IMPLEMENTATION - SECURE API DEVELOPMENT ✅

### Complete Password Reset Flow with Email Token Validation ✅
**Use when**: Implementing secure password reset functionality for user authentication systems

**Implementation Pattern**:
```javascript
// 1. Secure Token Generation
const crypto = require('crypto');
const resetToken = crypto.randomBytes(32).toString('hex');
const tokenExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

// 2. Rate Limiting Implementation  
const resetAttempts = new Map<string, { count: number; lastAttempt: number; emailAttempts: Map<string, number> }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_ATTEMPTS_PER_IP = 3;
const MAX_ATTEMPTS_PER_EMAIL = 3;

// 3. Email Masking for Security
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart[0]}${localPart.slice(1, -1).replace(/./g, '*')}${localPart.slice(-1)}@${domain}`;
}

// 4. Database Transaction Pattern
const result = await prisma.$transaction(async (tx) => {
  const updatedUser = await tx.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      passwordResetToken: null, // Clear reset token
      passwordResetExpiry: null, // Clear expiry
      emailVerified: true, // Mark email as verified
    }
  });
  
  // Invalidate all existing sessions (security measure)
  await tx.userSession.updateMany({
    where: { userId: user.id, isActive: true },
    data: { isActive: false }
  });
  
  return updatedUser;
});
```

**Security Best Practices Implemented**:
- ✅ **No user enumeration**: Same response for existing/non-existing emails
- ✅ **Rate limiting**: Multiple layers (IP-based and email-based)
- ✅ **Cryptographically secure tokens**: 32-byte random hex strings
- ✅ **Token expiration**: 2-hour maximum validity with cleanup
- ✅ **One-time use tokens**: Cleared after successful reset
- ✅ **Session invalidation**: All existing sessions terminated after password reset
- ✅ **Password reuse prevention**: Compare against current password hash
- ✅ **Email masking**: Prevent information leakage in responses
- ✅ **Auto-login after reset**: New JWT tokens generated automatically

**API Endpoint Structure Pattern**:
```javascript
// Forgot Password Endpoint
POST /api/auth/forgot-password
{
  "email": "user@example.com"
}
// Always returns 200 with generic message (security)

// Token Validation Endpoint  
GET /api/auth/validate-reset-token?token=abc123
// Returns token validity and masked email

// Password Reset Completion
POST /api/auth/reset-password
{
  "token": "reset-token",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
// Returns new JWT tokens for automatic login
```

**Development vs Production Patterns**:
```javascript
// Development Mode: Enhanced logging and token access
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 DEVELOPMENT MODE - Password Reset Info:');
  console.log(`🔑 Token: ${resetToken}`);
  console.log(`🔗 Reset Link: ${resetLink}`);
  
  return NextResponse.json({
    ...genericResponse,
    dev_info: { resetToken, resetLink, expiresAt: tokenExpiry }
  });
}

// Production Mode: Secure responses only
return NextResponse.json(genericResponse);
```

**Email Template System Pattern**:
```javascript
// Structured email template with game theming
const template = {
  subject: '🔐 Lightwalker™ Password Reset Request',
  html: gameThemedHTMLTemplate,
  text: plainTextFallback
};

// Development: Console logging instead of sending
if (process.env.NODE_ENV === 'development') {
  logEmailTemplate(email);
  return true;
}
```

**Testing Pattern for Complete Flow**:
```javascript
// 1. Create test user → 2. Login verification → 3. Request reset → 
// 4. Validate token → 5. Reset password → 6. Verify old password blocked → 
// 7. Verify new password works → 8. Verify auto-login

const testFlow = async () => {
  const userCreated = await createTestUser();
  const resetToken = await requestPasswordReset();  
  const tokenValid = await validateResetToken(resetToken);
  const resetSuccess = await resetPassword(resetToken);
  const oldPasswordBlocked = await testPasswordLogin(oldPassword, false);
  const newPasswordWorks = await testPasswordLogin(newPassword, true);
};
```

**Key Success Factors**:
- Database transactions prevent partial updates during errors
- Generic responses prevent user enumeration attacks  
- Multiple rate limiting layers (IP + email based)
- Development mode token logging enables easy testing
- Atomic session invalidation ensures security
- Auto-login after reset improves user experience
- Email masking prevents information leakage

**Integration with Existing Auth System**:
- Uses existing JWT token generation functions
- Integrates with existing UserSession table
- Respects existing user roles and subscription systems
- Compatible with existing rate limiting patterns

---

**IMPORTANT**: Add new successful patterns here immediately after they work. This is our knowledge base for efficient development!