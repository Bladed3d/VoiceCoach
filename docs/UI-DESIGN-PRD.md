# VoiceCoach V2 - UI Design PRD

## Mission Statement
Create award-winning UI for VoiceCoach V2 that focuses on the **Split View live coaching interface** - enabling seamless AI-powered real-time guidance during sales calls while maintaining world-class design standards.

## Design Philosophy

### Core Principles
- **Users First**: Prioritize call effectiveness and minimal cognitive load during live conversations
- **Speed & Performance**: Sub-200ms response times for real-time coaching prompts
- **Focus & Efficiency**: Single-purpose interface optimized for live call scenarios
- **Accessibility**: WCAG AA+ compliance for inclusive professional use
- **Consistency**: Unified design language across all screens

## Key User Journey

### Primary Workflow (30-second target)
1. **Upload Document** → AI extracts sales context
2. **Answer 5 Questions** → Contextual analysis for personalization  
3. **3-Phase Processing** → RAG system generates coaching knowledge
4. **Split View Interface** → Real-time AI coaching during live calls

### Critical Success Metric
**From document upload to active coaching in under 30 seconds**

## Screen Architecture

### 1. Document Upload Screen
**Purpose**: Effortless document ingestion with immediate feedback

**Design Requirements**:
- Large drag-and-drop zone (minimum 300px height)
- Support multiple file formats (.pdf, .docx, .txt)
- Progress indication with LED breadcrumb system (2000-2099 range)
- Clear error states with actionable guidance

**UI Components**:
- Prominent upload area with visual file preview
- File validation feedback with specific requirements
- Processing status with estimated time remaining

### 2. Contextual Questionnaire Screen  
**Purpose**: 5-question form to personalize coaching insights

**Design Requirements**:
- Single-question-per-screen approach for focus
- Progress indicator (1/5, 2/5, etc.)
- Smart form validation with helpful error messages
- Previous/Next navigation with keyboard shortcuts

**UI Components**:
- Large, readable question text (minimum 18px font)
- Appropriate input types (text, select, textarea)
- Progress bar with clear completion percentage

### 3. Processing Status Screen
**Purpose**: Transparent 3-phase RAG processing with engaging feedback

**Design Requirements**:
- Real-time phase indicators (1A: Analysis, 1B: Context, 1C: Synthesis)
- LED breadcrumb visualization (3000-5099 ranges)
- Estimated completion times per phase
- Error recovery with clear user options

**UI Components**:
- Animated processing indicators (subtle, professional)
- Phase breakdown with descriptive labels
- Quality score display as processing completes

### 4. Split View Live Coaching Interface ⭐ **PRIMARY FOCUS**
**Purpose**: Real-time AI guidance during active sales calls

**Design Requirements**:
- **Left Panel**: AI coaching prompts and suggestions
- **Right Panel**: Live call transcription (AI-narrated, no user typing)
- **Minimal UI chrome**: Focus on content, not interface
- **Instant response**: <200ms for real-time coaching updates
- **Distraction-free**: No unnecessary animations or visual noise

**Critical UI Components**:
- Resizable split panels (70/30 default, user adjustable)
- AI coaching prompt cards with hierarchical importance (urgent/helpful/background)
- Live transcription area with smooth auto-scrolling
- Quick action buttons on prompts (copy, mark as used, dismiss)
- Minimal status indicators (connection, processing, ready)

### Coaching Prompt Visual Hierarchy
- **URGENT**: Red border (#e53e3e), bold text, 18px font, prominent top placement
- **HELPFUL**: Blue accent (#3182ce), medium weight, 16px font, secondary placement  
- **BACKGROUND**: Gray styling (#718096), regular weight, 14px font, bottom placement
- **Card Spacing**: 12px between cards, 16px internal padding
- **Actions**: Copy/Used/Dismiss buttons - 32px height, consistent styling

**Split View Layout Details**:
```
┌─────────────────────────────────────────────────────┐
│ [VoiceCoach] [Connection: ●] [Settings] [Minimize] │
├───────────────────────────────┬─────────────────────┤
│                               │                     │
│    AI COACHING PROMPTS        │  LIVE TRANSCRIPTION │
│    (Left Panel)               │  (Right Panel)      │
│                               │                     │
│  ┌─ URGENT ─────────────────┐ │ [AI narrates call   │
│  │ "Ask about their budget  │ │  conversation in    │
│  │  constraints - they      │ │  real-time here]    │
│  │  mentioned cost concerns │ │                     │
│  │  3 times"                │ │ "Client: We're      │
│  └─────────────────────────┘ │  looking at budget   │
│                               │  options..."         │
│  ┌─ HELPFUL ───────────────┐ │                     │
│  │ "Reference the ROI case  │ │ "You: Based on our  │
│  │  study from the document"│ │  analysis..."       │
│  └─────────────────────────┘ │                     │
│                               │                     │
└───────────────────────────────┴─────────────────────┘
```

## Design System Foundation

### Color Palette
- **Primary Brand**: Deep blue (#1a365d) for trust and professionalism
- **Neutrals**: 7-step gray scale for text/backgrounds (#f7fafc to #1a202c)
- **Semantic Colors**: 
  - Success: Green (#38a169) for completed phases
  - Error: Red (#e53e3e) for failures and blockers
  - Warning: Amber (#d69e2e) for attention needed
  - Info: Blue (#3182ce) for helpful guidance

### Typography
- **Primary Font**: Inter (system fallback: system-ui, sans-serif)
- **Scale**: H1(32px), H2(24px), H3(18px), Body(16px), Small(14px), Caption(12px)
- **Weights**: Regular(400), Medium(500), SemiBold(600)
- **Line Height**: 1.6 for body text, 1.4 for headings

### Spacing System
- **Base Unit**: 8px
- **Scale**: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
- **Component Padding**: 12px minimum for touch targets
- **Section Spacing**: 32px between major UI sections

### Interactive Components
- **Buttons**: Primary, Secondary, Ghost, Destructive variants
- **Input Fields**: Text, Select, Textarea with clear labels/validation
- **Cards**: Consistent 12px border radius, subtle shadows
- **Navigation**: Minimal chrome, clear hierarchy
- **Modals**: For confirmations and detailed settings only

## Technical Integration Requirements

### Enhanced Agentic Design Process
**Core Methodology**: Research-driven design process that validates technical feasibility and visual excellence through systematic agent coordination.

#### Phase 0: Research & Validation (NEW - MANDATORY)
**Agent: VoiceCoach V2 Research Specialist**
1. **PRD Analysis**: Comprehensive requirements review and research planning
2. **Technology Stack Validation**: Verify all tech components work together (TailwindCSS + Electron, etc.)
3. **Visual Design Research**: Find exemplary UI/UX designs for Split View interfaces and sales coaching
4. **Industry Research**: Locate best practices for live prompting and real-time guidance interfaces

**Deliverables:**
- Technology Stack Validation Report (with working examples)
- Visual Design Reference Collection (screenshots and analysis)
- Implementation Risk Assessment
- Design Pattern Recommendations

#### The Orchestration Framework  
1. **Research Foundation**: PRD analysis, tech validation, and visual references complete
2. **Context**: Design principles, style guide, user requirements, and research findings loaded as session memory
3. **Tools**: Playwright MCP for live environment interaction and validation  
4. **Validation**: Fixed specs (UI mockups, design checklist, research benchmarks) as success criteria

#### The Enhanced Iterative Process
```
┌─ Phase 0: Research Foundation (MANDATORY) ──────────────────┐
│                                                              │
│ 1. PRD Analysis → 2. Tech Stack Validation → 3. Visual Research │
│                                                              │
│ Output: Research Report + Visual References + Tech Validation │
└──────────────────────┬───────────────────────────────────────┘
                       ↓
┌─ Design Agent Cycle (30+ minutes autonomous) ──────────────┐
│                                                            │
│ 1. Read Research + Spec → 2. Implement → 3. Screenshot    │
│        ↑                                         ↓        │
│ 8. Assess vs Research ← 7. Compare to Refs ← 6. Navigate  │
│        ↑                                         ↓        │
│ 9. Self-Correct → 10. Next Iteration → 4. Analyze Visual │
│                                         ↓                 │
│                        5. Check Console Errors ←─────────┘
│                                                            │
│ CONTINUES until: Matches Research Benchmarks              │
└────────────────────────────────────────────────────────────┘
```

#### Fixed Spec/Validator Framework
- **UI Mockups**: Visual targets for each screen state
- **Design Principles Checklist**: S-tier standards validation
- **Acceptance Criteria**: User-defined success requirements
- **Performance Benchmarks**: <200ms interaction targets
- **Accessibility Standards**: WCAG AA+ compliance verification

#### Visual Intelligence Integration
**Unlock Model's Multimodal Training**: Playwright screenshots tap into Claude's visual design circuits (not just coding knowledge)

- **Before**: Code-only analysis limited to technical best practices
- **After**: Full visual assessment of layout, hierarchy, spacing, color relationships

### Playwright MCP Integration (Electron Desktop App)
- **Local Development Connection**: Targets `localhost:5173` Electron renderer process
- **Real Desktop UI Testing**: Interacts with actual Electron interface, not browser simulation  
- **Automated Design Reviews**: 7-phase validation process with screenshot evidence
- **Visual Regression Prevention**: Compares current vs target UI states
- **Cross-Viewport Validation**: Desktop primary (1440px), tablet/mobile secondary

### LED Breadcrumb System Integration
- **UI State Tracking**: 7000-7099 range for interface interactions
- **Performance Monitoring**: Response time tracking for Split View
- **Error Boundary Monitoring**: 8000-8099 range for UI error recovery

### Desktop-First Design Strategy
- **Primary Target**: Desktop/laptop (1440px minimum) for professional sales environments
- **Window Management**: Minimum 1200x800px for Split View functionality
- **Resizing Behavior**: Maintain 70/30 split ratio across all desktop sizes
- **Split View**: Desktop-only experience optimized for sales coaching effectiveness

## Real-Time Performance Requirements

### Split View Response Targets
- **Coaching Prompt Generation**: <150ms from trigger to display
- **Transcription Updates**: <50ms for new text appending  
- **UI State Changes**: <100ms for user interactions (copy, dismiss)
- **Connection Status**: Real-time indicators with <1s latency detection

### Performance Monitoring
- LED breadcrumb tracking for all timing measurements
- Performance degradation alerts at >150ms
- Automatic fallback modes for network issues

## Desktop Application UX Patterns

### Window Management
- **Minimum Window Size**: 1200x800px for Split View functionality
- **Resizing Behavior**: Maintain 70/30 split ratio across all sizes
- **Always on Top**: Optional toggle for call overlay mode
- **Multi-Monitor**: Smart positioning and scaling

### Desktop Integration  
- **File Drag-Drop**: System-native file handling for document upload
- **Keyboard Shortcuts**: Cmd/Ctrl+C for prompt copying, Esc for modal dismissal
- **System Notifications**: Connection status and error alerts
- **Menu Bar**: Native app menu with preferences and help

## Error State Design Specifications

### Connection Errors
- **Visual Indicator**: Red connection dot with tooltip explanation
- **Fallback Mode**: Cached coaching prompts with clear offline indicator
- **Recovery Actions**: Prominent "Retry Connection" button

### Processing Errors
- **RAG Phase Failures**: Clear phase indicator with retry option
- **Partial Results**: Show available insights with warning about incomplete analysis

### Split View Errors  
- **Transcription Failures**: "Transcription unavailable" with manual input option
- **Coaching Engine Errors**: Graceful degradation with basic prompt suggestions

## Accessibility Implementation Details

### Split View Accessibility
- **Screen Reader**: Coaching prompts announced as "Urgent coaching suggestion" 
- **Keyboard Navigation**: Tab order through prompt cards, Enter to copy
- **Focus Management**: Clear focus indicators on all interactive elements
- **High Contrast**: Alternative color scheme for coaching prompt hierarchy

### Professional Use Considerations  
- **Audio Feedback**: Optional prompt reading during calls
- **Visual Alternatives**: Text-based alternatives for all audio cues
- **Motor Accessibility**: Large click targets (44px minimum for desktop)

## Quality Gates

### Design Review Process
1. **Quick Visual Check** (after each change):
   - Navigate to affected screens via Playwright
   - Verify design principle compliance
   - Capture desktop screenshots (1440px)
   - Check console for errors

2. **Comprehensive Review** (major changes):
   - Invoke `@agent design-review` for full 7-phase analysis
   - Accessibility audit (WCAG AA+ compliance)
   - Performance validation (<200ms interactions)
   - Desktop UX pattern compliance

### Success Metrics
- **Performance**: Split View response time <150ms
- **Usability**: Document to coaching workflow <30 seconds
- **Quality Score**: LED system reports ≥85% success rate
- **Accessibility**: 100% keyboard navigable, screen reader compatible
- **Design Compliance**: Pass all design principle checklist items

### User Experience Metrics
- **First-Time Setup**: Complete document upload to Split View in <2 minutes
- **Coaching Effectiveness**: Users act on urgent prompts within 10 seconds
- **Error Recovery**: Users successfully recover from connection issues <30 seconds
- **Professional Readiness**: Interface ready for client-facing calls without training

## Implementation Strategy

### Phase 1: Foundation (Week 1)
- Implement design system tokens (colors, typography, spacing)
- Create core component library (buttons, inputs, cards)
- Set up Playwright MCP integration for design reviews

### Phase 2: Core Screens (Week 2)
- Build Document Upload screen with validation
- Create Contextual Questionnaire with smooth flow
- Implement Processing Status with LED visualization

### Phase 3: Split View Interface (Week 3)
- **PRIMARY FOCUS**: Split View live coaching interface
- Real-time prompt system integration
- Performance optimization for <200ms response
- Extensive user testing and refinement

### Phase 4: Polish & Testing (Week 4)  
- Comprehensive design review via agent system
- Accessibility audit and fixes
- Performance optimization
- Final validation against all quality gates

## Design Review Automation

### CLAUDE.md Integration
```markdown
## Visual Development

### Design Principles
- S-tier design checklist in `/design/design-principles-example.md`
- UI Design PRD in `/docs/UI-DESIGN-PRD.md`

### Quick Visual Check
IMMEDIATELY after implementing any front-end change:
1. Navigate to affected screens via Playwright MCP
2. Verify compliance with design principles  
3. Capture evidence with desktop screenshots
4. Check for console errors
5. Validate Split View performance if applicable
```

### Agent Integration
- **@agent design-review**: Comprehensive 7-phase design validation
- **Slash command**: `/design-review` for instant PR analysis
- **Automated triggers**: Design review on Split View interface changes

## Success Definition

### Primary KPI
**Split View Interface Effectiveness**: Users achieve successful sales call outcomes with AI guidance within first session

### Secondary KPIs  
- Design system compliance: 100% components follow established patterns
- Performance benchmarks: All interactions <150ms
- Accessibility score: WCAG AA+ certification
- Desktop UX excellence: Native Electron app experience
- Error resilience: Graceful degradation in all failure scenarios

**The Split View live coaching interface is the heart of VoiceCoach V2 - every design decision should optimize for real-time sales call effectiveness.**

[Saved to memory: voicecoach-v2-ui-design-prd]