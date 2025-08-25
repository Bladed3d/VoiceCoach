# VoiceCoach Component Specifications
## Immersive Sales Coaching Interface Design System

### Design Philosophy
The VoiceCoach interface transforms sales calls into guided, confident conversations through:
- **Contextual Intelligence**: Information appears only when valuable
- **Game-like Engagement**: Progress tracking and achievement feedback
- **Non-intrusive Design**: Enhances rather than distracts from calls
- **Real-time Adaptability**: Responds to conversation flow

---

## Core Components

### 1. Header Component (`vc-header`)
**Purpose**: Call status and branding
**Behavior**: Fixed position, always visible
**Elements**:
- VoiceCoach logo with gradient text effect
- Live call status indicator with pulsing animation
- Real-time call timer (MM:SS format)
- Connection status badge

**Implementation Notes**:
```css
.vc-header {
  grid-area: header;
  background: var(--vc-bg-secondary);
  border: 1px solid var(--vc-surface);
  border-radius: var(--vc-radius-lg);
}
```

**Interactive States**:
- Call active: Green pulsing indicator
- Call on hold: Amber steady indicator  
- Call ended: Red indicator with "Call Ended" text

---

### 2. Live Transcription Component (`vc-transcription`)
**Purpose**: Dual-channel speech display with auto-scroll
**Behavior**: Real-time updates, contextual highlighting

**Key Features**:
- **Dual Speaker Channels**: Distinct styling for "You" vs "Prospect"
- **Auto-scroll Toggle**: User can disable/enable automatic scrolling
- **Timestamp Display**: Each message shows time (HH:MM format)
- **Typing Indicators**: Shows when prospect is speaking (live)

**Speaker Line Styling**:
```css
.vc-speaker-line.you {
  background: rgba(37, 99, 235, 0.1);
  border-left-color: var(--vc-primary);
}

.vc-speaker-line.client {
  background: rgba(139, 92, 246, 0.1);
  border-left-color: var(--vc-accent-coaching);
}
```

**Animation Specifications**:
- New messages: `vc-fade-in` animation (0.5s ease-in)
- Auto-scroll: Smooth scrolling with `scroll-behavior: smooth`
- Message spacing: 1rem margin-bottom between messages

---

### 3. Coaching Prompts Panel (`vc-coaching`)
**Purpose**: Contextual AI-powered coaching suggestions
**Behavior**: Dynamic card system with intelligent triggering

**Card Types & Triggers**:
1. **Objection Handling** - Triggered by: budget, cost, ROI concerns
2. **Discovery Questions** - Triggered by: vague responses, surface-level answers
3. **Closing Signals** - Triggered by: buying signals, specific metrics mentioned
4. **Rapport Building** - Triggered by: conversation gaps, tension detection
5. **Value Proposition** - Triggered by: feature discussions, benefit opportunities

**Card Animation System**:
```css
.vc-coaching-card {
  transform: translateY(10px);
  opacity: 0;
  animation: slideInCoaching 0.5s ease-out forwards;
}

@keyframes slideInCoaching {
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

**Interactive Elements**:
- **Primary Action Button**: Main suggested action (purple gradient)
- **Secondary Action Button**: Alternative or dismiss (transparent with border)
- **Hover Effects**: Card lifts 2px with shadow enhancement

**Card Management Logic**:
- Maximum 3 cards visible at once
- Oldest card auto-removes when 4th card appears
- Cards auto-dismiss after 2 minutes if no interaction
- Staggered entrance animations (0.1s, 0.2s, 0.3s delays)

---

### 4. Knowledge Panel (`vc-knowledge`)
**Purpose**: Company intelligence and quick reference
**Behavior**: Tabbed interface with contextual information

**Tab Categories**:
1. **Company**: Business info, recent news, tech stack
2. **Contact**: Decision maker profiles, communication preferences  
3. **Scripts**: Pre-approved responses and objection handlers

**Tab Switching Animation**:
- Content fades out (0.15s) then new content fades in (0.3s)
- Active tab gets background color and white text
- Smooth transition with `var(--vc-transition-fast)`

**Knowledge Item Structure**:
```html
<div class="vc-knowledge-item">
  <div class="vc-knowledge-item-title">Title</div>
  <div class="vc-knowledge-item-content">Content</div>
</div>
```

**Visual Design**:
- Cyan accent color throughout (`var(--vc-accent-knowledge)`)
- Left border accent on knowledge items
- Semi-transparent background highlighting

---

### 5. Progress Footer (`vc-footer`)
**Purpose**: Real-time performance tracking and coaching score
**Behavior**: Live updates based on conversation analysis

**Progress Metrics**:
1. **Call Progress**: Overall call completion (0-100%)
2. **Discovery**: Pain point identification progress
3. **Rapport**: Connection quality measurement  
4. **Closing**: Advancement toward next steps

**Progress Bar Specifications**:
```css
.vc-progress-bar {
  width: 100px;
  height: 6px;
  background: var(--vc-surface);
  border-radius: 3px;
}

.vc-progress-fill {
  background: var(--vc-gradient-success);
  transition: width var(--vc-transition-normal);
}
```

**Coaching Score Display**:
- Large, prominent display (1.25rem font size)
- Green accent color
- Pulse animation on score increases
- Scale: 0-10 with one decimal precision

---

### 6. Achievement System (`vc-achievement`)
**Purpose**: Gamified feedback for coaching effectiveness
**Behavior**: Slide-in notifications for milestone achievements

**Achievement Types**:
- **Discovery Master**: 3+ pain points identified quickly
- **Objection Handler**: Successfully addressed concerns
- **Closing Expert**: Perfect trial close timing
- **Rapport Builder**: Strong connection established

**Animation Specifications**:
```css
.vc-achievement {
  transform: translateX(100%);
  transition: transform var(--vc-transition-normal);
}

.vc-achievement.show {
  transform: translateX(0);
}
```

**Timing**: 4-second display duration with auto-hide

---

## Responsive Breakpoints

### Desktop (1400px+)
- Full 3-column layout
- All components visible simultaneously
- Optimal coaching card size (400px width)

### Laptop (1200px - 1399px)
- Reduced coaching panel width (350px)
- Compressed knowledge panel (300px)
- Maintained readability

### Tablet (768px - 1199px)
- 2-column layout with stacked knowledge panel
- Transcription + coaching side-by-side
- Knowledge panel full-width below

### Mobile (< 768px)
- Single-column stacked layout
- Reduced padding and spacing
- Simplified header layout
- Touch-optimized button sizes (44px minimum)

---

## Animation Specifications

### Entrance Animations
- **Slide In Coaching**: `slideInCoaching` - 0.5s ease-out
- **Fade In**: `fadeIn` - 0.5s ease-in
- **Slide Up**: `slideUp` - 0.3s ease-out

### Exit Animations  
- **Fade Out**: `fadeOut` - 0.3s ease-in
- **Slide Out**: `slideOut` - 0.3s ease-in

### Interactive Animations
- **Button Press**: Scale to 0.95 for 150ms
- **Card Hover**: Transform translateY(-2px)
- **Progress Update**: Width transition over 300ms
- **Achievement Pulse**: 2s infinite pulse cycle

### Performance Considerations
- Use `transform` and `opacity` for animations (GPU accelerated)
- Avoid animating layout properties (`width`, `height`, `margin`)
- Maximum 60fps target for all animations
- Reduced motion support via `prefers-reduced-motion` media query

---

## Accessibility Features

### Keyboard Navigation
- Tab order: Header → Transcription → Coaching → Knowledge → Footer
- Keyboard shortcuts:
  - `Ctrl/Cmd + 1`: Trigger objection prompt
  - `Ctrl/Cmd + 2`: Trigger discovery prompt  
  - `Ctrl/Cmd + 3`: Trigger closing prompt

### Screen Reader Support
- ARIA labels for all interactive elements
- Live regions for dynamic content updates
- Semantic HTML structure throughout

### Visual Accessibility
- High contrast color scheme (WCAG AA compliant)
- Minimum 16px font sizes for body text
- Focus indicators on all interactive elements
- Color is not the only method of conveying information

---

## Performance Optimization

### JavaScript Efficiency
- Event delegation for coaching card interactions
- Throttled scroll events for transcription auto-scroll
- Debounced progress updates (max 10 updates/second)
- Lazy loading for knowledge panel content

### CSS Optimization
- CSS custom properties for theme consistency
- Minimal DOM reflows through transform animations
- Efficient selectors (avoid universal selectors)
- Critical CSS inlined for initial render

### Memory Management
- Cleanup event listeners on component destruction
- Limit transcription buffer to last 100 messages
- Remove coaching cards from DOM after exit animation
- Garbage collection friendly object references

---

## Integration Points

### AI Coaching Engine
- Real-time conversation analysis webhook
- Coaching prompt generation API
- Progress tracking metrics endpoint
- Achievement trigger system

### CRM Integration  
- Contact data population
- Company intelligence updates
- Call logging and metrics storage
- Follow-up task creation

### Communication Platform
- Live transcription stream
- Call status updates
- Recording start/stop triggers
- Participant management

This specification provides the complete framework for implementing the VoiceCoach immersive coaching interface with all components, animations, and interactive elements precisely defined.