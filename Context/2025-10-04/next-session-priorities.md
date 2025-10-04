# Next Session Priorities - 2025-10-04

## High Priority Features

### 1. **Call Notes Feature**
- Add ability for user to make notes during/after calls
- Notes should be:
  - Timestamped
  - Associated with specific call recordings
  - Easily accessible for review
  - Saveable with call data

**Suggested location:**
- Could be a panel in Split View
- Or a button in metrics dashboard
- Should integrate with CallRecordingService

---

### 2. **Test "More" Button on Prompts**
- Verify the "More" button functionality in coaching prompts
- Should display expanded information about the prompt
- Check UI/UX for displaying detailed prompt information
- Ensure it works smoothly during live calls

**Location:** Coaching prompt cards

---

### 3. **Restore "Ask" Button in Prompts**
- Feature previously existed - needs restoration
- Allow user to ask AI questions about:
  - Specific prompts
  - The sales script
  - Call strategy
  - General coaching questions
- Should be contextual to current stage/prompt

**Implementation notes:**
- Integrate with OllamaPromptService
- Needs quick response time (<2s)
- Should not interrupt call flow
- Consider modal or side panel for AI responses

---

## Technical Considerations

### Notes Feature
- Storage: Add to CallRecordingService
- UI: New component `CallNotesPanel.tsx` or inline in metrics
- Data structure: `{ timestamp, text, callId, stageNumber? }`
- LED range: 7500-7549 (UI_INTERACTIONS)

### Ask Button
- Existing service: OllamaPromptService can handle this
- Context needed: current stage, prompt text, script data
- Response display: Modal or expandable card
- LED range: 6100-6149 (LIVE_COACHING)

---

## Session Goals
1. Implement Call Notes feature (full CRUD)
2. Test and fix "More" button if broken
3. Restore "Ask" button with AI integration
4. Ensure all features work during live calls without disrupting flow
