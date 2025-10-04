# Session 2025-10-04 14:52 - Sales Stage Scroll Fix

## Issue
Stage activation via phrase detection was not scrolling stages to the top of the Sales Stage Guide window. Stage 2 would be highlighted but remain in the middle of the viewport instead of snapping to the top like Stage 1 does on load.

## Root Cause (Initial Analysis)
The scroll logic was using `getBoundingClientRect()` to calculate relative positions and then adding to `scrollTop`:

```typescript
const relativeTop = elementRect.top - containerRect.top;
container.scrollTo({
  top: container.scrollTop + relativeTop,  // ❌ Keeps element at current position
  behavior: 'smooth'
});
```

This calculation determined where the element **currently is** and scrolled to maintain that position - it didn't move it to the top!

## Solution Attempt 1: offsetTop (FAILED)
Replaced the complex calculation with simple `offsetTop`:

```typescript
container.scrollTo({
  top: stageElement.offsetTop,  // ❌ Doesn't account for spacing
  behavior: 'smooth'
});
```

**Problem:** The container uses `space-y-2` (Tailwind class that adds margin-top to child elements), and `offsetTop` doesn't properly account for accumulated spacing. Result: "Every stage change scrolls up less and less"

## Solution Attempt 2: scrollIntoView (FAILED)
Using browser's built-in `scrollIntoView` with `block: 'start'`:

```typescript
stageElement.scrollIntoView({
  behavior: 'smooth',
  block: 'start',      // ❌ Still scrolls before expansion
  inline: 'nearest'
});
```

**Problem:** Still scrolling BEFORE stage expansion, so position is wrong. User reported: "Every stage change scrolls up less and less"

## ROOT CAUSE (ACTUAL)
**The timing was wrong!** Code was scrolling BEFORE the stage expanded:

```typescript
// Scroll IMMEDIATELY (before expansion for speed) ❌ THIS WAS THE BUG
const stageElement = stageRefs.current.get(currentStage);
// ... scroll code ...

// Auto-expand the new stage (let animation happen after scroll)
setExpandedStages(prev => new Set([...prev, currentStage]));
```

**What happened:**
1. Try to scroll to Stage 2 (while it's collapsed)
2. Calculate offsetTop for collapsed Stage 2
3. Scroll to that position
4. Stage 2 expands (height increases)
5. Everything shifts down
6. Stage 2 is no longer at the top!

## Solution Attempt 3: offsetTop after expansion (FAILED)
Using `offsetTop` after waiting for expansion:

```typescript
container.scrollTop = stageElement.offsetTop;
```

**Problem:** User reported "scrolls too much and stage 2 bottom 1/3 is only visible" - `offsetTop` includes distances we shouldn't include (parent padding, nested containers).

## Solution Attempt 4: Relative viewport positioning (CURRENT - CORRECT)

**User's insight:** "The stage scroll position should be determined by the top of the scroll window and the top of the stage information. We know where the top of the scroll window is, so make the top of the stage info go there!"

```typescript
// 1. Expand the stage FIRST
setExpandedStages(prev => new Set([...prev, currentStage]));

// 2. Wait for DOM to render expansion
setTimeout(() => {
  // 3. Get current positions using getBoundingClientRect
  const containerRect = container.getBoundingClientRect();
  const stageRect = stageElement.getBoundingClientRect();

  // 4. Calculate where stage is NOW relative to container viewport top
  const relativePosition = stageRect.top - containerRect.top;

  // 5. Scroll by that amount to bring stage top to container top
  container.scrollTop = container.scrollTop + relativePosition;
}, 50);
```

**Why this works:**
- `getBoundingClientRect()` gives exact pixel positions on screen
- `stageRect.top - containerRect.top` = how far below container top the stage currently is
- Adding that to `scrollTop` scrolls exactly that distance
- Stage top aligns perfectly with container viewport top
- Works regardless of padding, margins, or nested containers!

## Files Changed
- `src/components/coaching/SalesScriptPanel.tsx`
  - Automatic scroll (lines 87-120): Expand stage, wait 50ms, then scroll
  - Manual scroll (lines 145-175): Wait 50ms after selection, then scroll

## Locations Fixed
1. **Automatic phrase detection scrolling** (lines 87-120) - Expand stage, wait 50ms, scroll with offsetTop
2. **Manual stage number click scrolling** (lines 145-175) - Wait 50ms after click, scroll with offsetTop

## Additional Issue: Layout Pushes Sales Stage Guide Down
During testing, discovered that the Sales Stage Guide was being pushed down when the call starts due to expanding sections above it (Current Sentiment, Tool Recommendations, etc.), making it less visible.

## Layout Fix (2025-10-04)
**Solution:** Moved Sales Stage Guide to the TOP of Script Progress panel

**Order changed from:**
1. Current Sentiment
2. Tool Recommendations
3. Adherence Score
4. Stage Evidence
5. Sales Stage Guide ← at bottom

**To:**
1. Sales Stage Guide ← NOW AT TOP
2. Current Sentiment
3. Tool Recommendations
4. Adherence Score
5. Stage Evidence

**Benefits:**
- Sales Stage Guide always visible at top
- Not pushed down by expanding sections
- Consistent visibility during calls
- Most important coaching info (stage guide) prioritized

## LED Breadcrumbs Added for Scroll Debugging

**Added breadcrumbs to capture scroll behavior:**

**Automatic scroll (phrase detection):**
- LED 7252: `auto_scroll_attempt` - Logs stage, element state, container state, offsetTop value
- LED 7253: `auto_scroll_executed` - Confirms scroll executed with target position
- LED 7254: `auto_scroll_failed` - Logs failure reason (no element or no container)

**Manual scroll (stage number click):**
- LED 7255: `manual_scroll_attempt` - Logs stage, element state, container state, offsetTop value
- LED 7256: `manual_scroll_executed` - Confirms scroll executed with target position
- LED 7257: `manual_scroll_failed` - Logs failure reason (no element or no container)

## How to Monitor LEDs (Windows)

**Option 1: PowerShell (Real-time monitoring)**
```powershell
Get-Content -Path "D:\Projects\Ai\VoiceCoach-v2\.logs\breadcrumbs.log" -Wait -Tail 50 | Select-String "725[2-7]"
```

**Option 2: Find specific LED**
```powershell
Select-String -Path "D:\Projects\Ai\VoiceCoach-v2\.logs\breadcrumbs.log" -Pattern "7252|7253|7254|7255|7256|7257" | Select-Object -Last 20
```

**Option 3: Browser Console**
Open DevTools (F12) and filter console for "LED 725" to see scroll-related breadcrumbs.

## Testing Required
- [x] Verify Sales Stage Guide is at top of Script Progress panel
- [x] Verify Sales Stage Guide remains visible when call starts
- [ ] Start coaching session with Golf Coaching script
- [ ] Monitor LED breadcrumbs (7252-7257) during testing
- [ ] Say "what would you change" to trigger Stage 1 → Stage 2 transition
- [ ] Check LED 7252/7253 output - verify offsetTop value and scroll execution
- [ ] Manually click stage number "3" to test manual scroll
- [ ] Check LED 7255/7256 output - verify offsetTop value and scroll execution
- [ ] Compare offsetTop values between stages to understand scroll positions

## Layout Shift Issue - Root Cause Found

**Problem:** Audio volume indicators appearing/disappearing when call starts/stops was causing layout shifts that broke scroll position calculations.

**Solution:** Prevent layout shifts by making UI consistent before/during/after calls

### Changes Made (2025-10-04)

**1. Made Audio Indicators Always Visible**
- **File:** `SplitViewCoaching.tsx`
- **Change:** Removed `{isRecording && ...}` condition from DualVolumeIndicator
- **Result:** Volume bars now always visible (show 0% when not recording)

**2. Fixed DualVolumeIndicator to Always Render**
- **File:** `DualVolumeIndicator.tsx`
- **Change:** Removed `return null` when not monitoring
- **Result:** Component reserves space even when inactive (prevents layout shifts)

**3. Removed Redundant Stage Metric**
- **File:** `SplitViewCoaching.tsx`
- **Change:** Removed "Stage" metric from metrics dashboard
- **Reason:** Stage already displayed in Sales Stage Guide panel (duplication)

**First Metrics Dashboard Order (with Stage removed):**
1. Session (duration timer)
2. Prompts (coaching prompt count)
3. Talk Ratio (user/prospect split)
4. Response (response time)
5. Effectiveness (effectiveness score)

**Final Metrics Dashboard Order (enhanced audio + compact metrics):**
1. **Audio (Mic/Speaker) - SPANS 2 COLUMNS** ← Full volume bars, percentages, status indicators
2. **Session (compact)** ← Vertically stacked, 50% narrower
3. **Prompts (compact)** ← Vertically stacked, 50% narrower
4. Talk Ratio (user/prospect split)
5. Response (response time)

**4. Made Audio Indicators Inline with Metrics (Initial)**
- **Files:** `SplitViewCoaching.tsx` (imports + metrics grid)
- **Change:** Moved audio indicators from standalone section into metrics grid as first item
- **Removed:** Effectiveness metric to make room
- **Design:** Compact 2-line display showing "Mic: X%" and "Spk: Y%" (speaker only shown in full-conversation mode)
- **Icons:** Added Mic and Headphones imports from lucide-react

**5. Enhanced Audio Indicators with Full Volume Bars and Status**
- **Files:** `SplitViewCoaching.tsx`
- **Change:** Expanded inline audio to include volume bars, percentage, and status (Silent/No Signal/etc)
- **Layout:** Audio spans 2 columns in 6-column grid
- **Features:**
  - Microphone: Icon + "Your Mic:" + volume bar + percentage + status
  - Other Party: Icon + "Other Party:" + volume bar + percentage + status (only in full-conversation mode)
  - Color-coded bars (green >20%, yellow >5%, red <5% for mic; cyan/blue for speaker)
  - Status indicators match original DualVolumeIndicator

**6. Compacted Session and Prompts Metrics**
- **Files:** `SplitViewCoaching.tsx`
- **Change:** Made Session and Prompts 50% narrower by stacking content vertically
- **Design:** Icon + label on top row, value on bottom row (centered)
- **Padding:** Reduced from p-3 to p-2
- **Icons:** Reduced from w-4/h-4 to w-3/h-3

### Benefits
- **No layout shifts** when call starts/stops - audio always inline
- **Consistent scroll positions** in Sales Stage Guide - panels don't move
- **Cleaner UI** - removed duplicate stage indicator AND effectiveness metric
- **Always visible audio levels** - full volume bars, percentages, and status before/during/after calls
- **Inline metrics** - audio levels integrated with other metrics (not floating above)
- **Compact design** - Session and Prompts 50% narrower, more space for audio indicators
- **Full feature parity** - inline audio has same features as original DualVolumeIndicator (bars, %, status)

## Manual Stage Selection Issue (FINAL FIX)

### Problem
Automatic phrase detection worked perfectly for all stages (1-9), but manual selection by clicking stage numbers had progressive failure:
- **Stages 1-4:** Perfect alignment at top ✅
- **Stages 5-9:** Progressively lower in viewport, with stage 8-9 stuck in middle ❌

### Root Cause
**Insufficient scrollable space below later stages.** The scroll calculation would say "scroll down 200px to bring stage 8 to top" but the container would hit bottom at 100px, stopping short of the target position.

### User Discovery
"If I click on 8, it is bad. If I click on 6 it shows correctly. Then if I click on 7 it shows correctly, then 8 messes up. But if I click on 7 it shows correctly, then click 8 it shows correctly."

This revealed that the issue wasn't timing or calculation - it was **scrollable space availability**. When stage 7 was selected, it scrolled down, creating more space below. This allowed stage 8 to then scroll correctly.

### Solution
**Added `pb-80` (320px bottom padding) to stage container:**

```typescript
<div ref={stageContainerRef} className="space-y-2 max-h-96 overflow-y-auto pr-2 pb-80">
```

**File:** `src/components/coaching/SalesScriptPanel.tsx` line 482

**Why it works:**
- Creates artificial scrollable space below all stages
- Even stage 9 (the last stage) now has 320px of space below it
- All stages can scroll to top of viewport regardless of position in list
- No timing changes needed - same scroll logic works for all stages

### Smart Delay Implementation
Also implemented conditional delay for manual selection:

```typescript
const wasExpanded = expandedStages.has(stageNumber);
const scrollDelay = wasExpanded ? 0 : 50;

setTimeout(() => {
  // ... scroll logic ...
}, scrollDelay);
```

**Benefits:**
- 0ms delay if stage already expanded (instant scroll)
- 50ms delay if stage needs expansion (wait for DOM update)
- No artificial delays during live calls

## Expected Behavior ✅ ALL WORKING
1. **Layout:** Sales Stage Guide is first section in Script Progress panel ✅
2. **Layout:** Audio indicators always visible (no shift when call starts) ✅
3. **Automatic scroll:** Phrase detection scrolls selected stage to top of viewport ✅
4. **Manual scroll:** Clicking stage numbers 1-9 all scroll to exact top position ✅
5. **Smart delay:** Already-expanded stages scroll instantly, collapsed stages wait 50ms ✅
6. **LEDs:** Breadcrumbs 7252→7253 (auto) and 7255→7256 (manual) track scroll operations ✅

## Final Testing Results
- [x] Verify Sales Stage Guide is at top of Script Progress panel
- [x] Verify Sales Stage Guide remains visible when call starts
- [x] Verify automatic phrase detection scrolls all stages to top
- [x] Verify manual clicking stages 1-4 scrolls to top
- [x] Verify manual clicking stages 5-9 scrolls to top (FIXED with pb-80)
- [x] Verify no artificial delays for already-expanded stages
- [x] Verify 50ms delay only for collapsed stages
