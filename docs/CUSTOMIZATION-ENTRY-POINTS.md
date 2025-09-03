# VoiceCoach V2 - Customization Entry Points

## WHERE Sales Managers Access Customization

### Option 1: First-Run Setup Wizard (RECOMMENDED)
**When:** First time launching VoiceCoach V2
**Where:** Modal overlay before main app loads

```
┌─────────────────────────────────────────────────┐
│          Welcome to VoiceCoach V2! 🎯           │
│                                                  │
│  Let's customize your AI coach for your team    │
│                                                  │
│  This takes about 10 minutes and will:          │
│  • Learn your sales methodology                 │
│  • Import your playbook                         │
│  • Configure coaching for your product          │
│                                                  │
│  [Start Customization]  [Skip for Now]          │
└─────────────────────────────────────────────────┘
```

**User clicks "Start Customization" → Claude-powered chat interface opens**

### Option 2: Settings Menu (For Later Adjustments)
**Where:** Top navigation bar in main app

```
┌──────────────────────────────────────────────────────┐
│ VoiceCoach V2  [📊 Dashboard] [⚙️ Settings] [👤 Profile] │
└──────────────────────────────────────────────────────┘
                            ↓
                    Click Settings
                            ↓
```

Settings Menu:
```
┌─────────────────────────────────────┐
│ Settings                            │
├─────────────────────────────────────┤
│ 🎯 Customize Coaching               │
│ 📚 Import Sales Playbook           │
│ 🎤 Audio Settings                   │
│ 🔔 Notifications                    │
│ 📊 Performance Tracking             │
└─────────────────────────────────────┘
```

### Option 3: Smart Prompt in Split View (Contextual)
**When:** System detects generic/poor coaching results
**Where:** Top of coaching panel in Split View

```
┌────────────────────────┬──────────────────────┐
│   Transcription        │   Coaching Panel     │
│                        ├──────────────────────┤
│                        │ 💡 Tip: Not getting  │
│                        │ relevant coaching?   │
│                        │ [Customize for your  │
│                        │  product]            │
│                        ├──────────────────────┤
│                        │ Current suggestions: │
│                        │ ...                  │
└────────────────────────┴──────────────────────┘
```

---

## The Customization Interface

### Embedded Chat Interface (Claude-Powered)
**Location:** Modal or side panel, depending on entry point

```
┌─────────────────────────────────────────────────┐
│  Customize VoiceCoach for Your Team 🎯         │
├─────────────────────────────────────────────────┤
│                                                  │
│  Claude: Hi! I'll help customize VoiceCoach     │
│  for your team. What product do you sell?       │
│                                                  │
│  You: We sell HR software to mid-size           │
│  companies                                       │
│                                                  │
│  Claude: Great! I'm configuring the system      │
│  for HR software sales. What's your typical     │
│  sales cycle length?                            │
│                                                  │
│  You: Usually 2-3 months                        │
│                                                  │
│  Claude: ✓ Updated. What's the #1 objection     │
│  you face?                                       │
│                                                  │
│ ┌──────────────────────────────────────────┐   │
│ │ Type your answer...                      │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│  [Send]                    Progress: 40% ████    │
└─────────────────────────────────────────────────┘
```

**Key Features:**
- Real-time progress indicator
- Conversational interface
- No technical jargon
- Instant configuration updates (behind scenes)

---

## Implementation Architecture

### 1. First-Run Detection
```typescript
// In main.ts or App.tsx
const isFirstRun = !localStorage.getItem('voicecoach_configured');

if (isFirstRun) {
  showCustomizationWizard();
}
```

### 2. Customization Service
```typescript
// src/services/customization/CustomizationService.ts
export class CustomizationService {
  private claudeChat: ClaudeCustomizationChat;
  
  async startCustomization() {
    // Opens the chat interface
    this.claudeChat.open();
    
    // Claude automatically starts the interview
    await this.claudeChat.startInterview();
  }
  
  async handleUserResponse(message: string) {
    // Send to Claude
    const claudeResponse = await this.processWithClaude(message);
    
    // Claude updates configs automatically
    await this.updateConfigurations(claudeResponse.configChanges);
    
    // Return Claude's next question
    return claudeResponse.nextQuestion;
  }
}
```

### 3. Integration Points

```typescript
// src/components/CustomizationChat.tsx
export const CustomizationChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConfiguring, setIsConfiguring] = useState(false);
  
  const handleSend = async (userMessage: string) => {
    // Add user message to chat
    setMessages([...messages, { role: 'user', content: userMessage }]);
    
    // Get Claude's response AND update configs
    setIsConfiguring(true);
    const response = await customizationService.handleUserResponse(userMessage);
    setIsConfiguring(false);
    
    // Add Claude's response to chat
    setMessages([...messages, { role: 'assistant', content: response }]);
  };
  
  return (
    <div className="customization-chat">
      <MessageList messages={messages} />
      <InputArea onSend={handleSend} disabled={isConfiguring} />
      <ProgressBar percentage={customizationProgress} />
    </div>
  );
};
```

---

## User Journey Flow

### New User Flow:
1. **Download & Install VoiceCoach V2**
2. **Launch Application**
3. **See Welcome Screen** with customization prompt
4. **Click "Start Customization"**
5. **Chat with Claude** (10-15 minutes)
6. **System configured automatically**
7. **Ready to use** with their specific settings

### Existing User Adjustment:
1. **Using app, coaching seems generic**
2. **Click Settings → Customize Coaching**
3. **Chat opens** "What would you like to adjust?"
4. **Quick refinement** (2-3 questions)
5. **Back to improved coaching**

### Power User Import:
1. **Has existing playbook/materials**
2. **Settings → Import Sales Playbook**
3. **Upload document**
4. **Claude processes and asks clarifying questions**
5. **Confirms configuration**
6. **System optimized for their methodology**

---

## Technical Implementation Priority

### Phase 1: MVP (Minimum Viable)
```
1. Add Settings button to main navigation
2. Create CustomizationChat component
3. Wire up to Claude (using existing prompt system)
4. Save configuration to localStorage
```

### Phase 2: Enhanced
```
1. Add first-run wizard
2. Create progress tracking
3. Add configuration export/import
4. Team sharing capabilities
```

### Phase 3: Advanced
```
1. Smart detection of poor coaching
2. Contextual customization prompts
3. A/B testing different configs
4. Analytics on what works
```

---

## File Structure

```
src/
├── components/
│   ├── customization/
│   │   ├── CustomizationChat.tsx      # Chat interface
│   │   ├── WelcomeWizard.tsx         # First-run experience
│   │   └── CustomizationProgress.tsx  # Progress indicator
│   └── settings/
│       └── SettingsMenu.tsx          # Settings dropdown
│
├── services/
│   └── customization/
│       ├── CustomizationService.ts    # Core logic
│       ├── ClaudeIntegration.ts      # Claude chat handling
│       └── ConfigUpdater.ts          # File updates
│
└── hooks/
    └── useCustomization.ts            # React hook for components
```

---

## Quick Start Implementation

### Step 1: Add Settings Button
```tsx
// In src/components/Header.tsx or Navigation.tsx
<button 
  onClick={() => openCustomization()}
  className="settings-btn"
>
  ⚙️ Customize Coaching
</button>
```

### Step 2: Create Basic Chat Modal
```tsx
// src/components/customization/CustomizationModal.tsx
export const CustomizationModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="customization-modal">
        <CustomizationChat />
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};
```

### Step 3: Connect to Configuration System
```typescript
// The chat component sends messages to Claude
// Claude updates the config files we already created
// User sees conversational responses
// System is customized in real-time
```

---

## Success Criteria

✅ Sales manager can find and start customization easily
✅ Process feels conversational, not technical
✅ Configuration happens automatically during chat
✅ Can return to adjust settings anytime
✅ First-run experience guides new users
✅ Takes less than 15 minutes total