# Playwright MCP + Electron Integration Guide

## Overview
This guide provides the technical implementation for integrating Playwright MCP with VoiceCoach V2's Electron desktop application to enable automated UI design reviews and iterative design improvements.

## Key Concept: Electron = Chromium + Node.js
- Electron apps run Chromium browser engine under the hood
- Playwright can connect to Electron's renderer process during development
- Your React app serves on `localhost:5173` via Vite dev server
- Playwright treats this as a web application running locally

## Prerequisites

### 1. Install Playwright MCP
```bash
# Install Playwright MCP server
npm install -g @microsoft/playwright-mcp
```

### 2. Configure Claude Code MCP Settings
Add to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y", 
        "@microsoft/playwright-mcp"
      ],
      "env": {
        "PLAYWRIGHT_BROWSER": "chromium",
        "PLAYWRIGHT_HEADLESS": "false"
      }
    }
  }
}
```

### 3. Development Server Setup
Ensure your Electron app is running in development mode:

```bash
# Start VoiceCoach V2 development server
cd VoiceCoach-v2
npm run dev
```

This creates:
- Vite dev server: `http://localhost:5173`
- Electron app window displaying the React interface
- Hot reload enabled for development

## Playwright MCP Configuration for Electron

### Browser Configuration
```javascript
// Playwright connects to your local development server
const targetURL = "http://localhost:5173";

// Standard viewport sizes for testing
const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 }, 
  mobile: { width: 375, height: 667 }
};
```

### Connection Method
Playwright MCP will:
1. Launch a Chromium browser instance
2. Navigate to `localhost:5173` 
3. Interact with your Electron app's React interface
4. Capture screenshots and console logs
5. Execute user interactions (clicks, typing, navigation)

## Implementation Examples

### 1. Basic Navigation and Screenshot
```javascript
// Navigate to your Electron app
await mcp__playwright__browser_navigate("http://localhost:5173");

// Resize to desktop viewport  
await mcp__playwright__browser_resize(1440, 900);

// Take screenshot for visual review
await mcp__playwright__browser_take_screenshot({
  filename: "voicecoach-homepage-desktop.png",
  fullPage: true
});
```

### 2. Testing Split View Interface
```javascript
// Navigate to Split View screen
await mcp__playwright__browser_navigate("http://localhost:5173/split-view");

// Test left panel (call notes)
await mcp__playwright__browser_click({
  element: "call notes textarea",
  ref: "textarea[data-testid='call-notes']"
});

await mcp__playwright__browser_type({
  element: "call notes input",
  ref: "textarea[data-testid='call-notes']",
  text: "Customer mentioned budget constraints and timeline concerns"
});

// Verify AI prompts appear in right panel
await mcp__playwright__browser_wait_for({
  text: "Ask about their budget",
  time: 2
});

// Capture Split View state
await mcp__playwright__browser_take_screenshot({
  filename: "split-view-active-coaching.png"
});
```

### 3. Console Error Monitoring
```javascript
// Check for JavaScript errors during interaction
const consoleMessages = await mcp__playwright__browser_console_messages();

// Filter for errors and warnings
const errors = consoleMessages.filter(msg => 
  msg.type === 'error' || msg.type === 'warning'
);

if (errors.length > 0) {
  console.log("UI Issues Found:", errors);
}
```

### 4. Responsive Testing Workflow
```javascript
const testViewport = async (viewport, name) => {
  await mcp__playwright__browser_resize(viewport.width, viewport.height);
  await mcp__playwright__browser_wait_for({ time: 1 }); // Allow layout adjustment
  
  await mcp__playwright__browser_take_screenshot({
    filename: `voicecoach-${name}-${viewport.width}x${viewport.height}.png`
  });
  
  // Check for horizontal scroll (responsive failure)
  const hasHorizontalScroll = await mcp__playwright__browser_evaluate({
    function: "() => document.body.scrollWidth > document.body.clientWidth"
  });
  
  return { viewport: name, hasScrollIssue: hasHorizontalScroll };
};

// Test all viewports
const results = await Promise.all([
  testViewport({ width: 1440, height: 900 }, "desktop"),
  testViewport({ width: 768, height: 1024 }, "tablet"), 
  testViewport({ width: 375, height: 667 }, "mobile")
]);
```

## Iterative Design Loop Implementation

### 1. Fixed Spec Definition
Create visual targets for comparison:

```javascript
// Define target specifications for each screen
const designSpecs = {
  documentUpload: {
    targetScreenshot: "./design-targets/document-upload-target.png",
    requirements: [
      "Drag-and-drop zone minimum 300px height",
      "Clear file validation feedback", 
      "Progress indication with LED breadcrumbs"
    ]
  },
  splitView: {
    targetScreenshot: "./design-targets/split-view-target.png", 
    requirements: [
      "Resizable panels (30/70 default)",
      "AI prompts appear within 200ms",
      "No visual distraction during use"
    ]
  }
};
```

### 2. Automated Comparison Loop
```javascript
const designIterationCycle = async (screen, maxIterations = 10) => {
  let iteration = 0;
  let designGap = 100; // Percentage gap from target
  
  while (designGap > 5 && iteration < maxIterations) {
    iteration++;
    
    // 1. Navigate to screen
    await mcp__playwright__browser_navigate(`http://localhost:5173/${screen}`);
    
    // 2. Take current screenshot  
    const currentScreenshot = `./current/${screen}-iteration-${iteration}.png`;
    await mcp__playwright__browser_take_screenshot({
      filename: currentScreenshot
    });
    
    // 3. Visual comparison (conceptual - would use image diff library)
    designGap = await compareScreenshots(
      designSpecs[screen].targetScreenshot,
      currentScreenshot
    );
    
    // 4. Identify specific issues
    const issues = await identifyDesignGaps(designGap, designSpecs[screen].requirements);
    
    // 5. Make corrections based on issues
    if (issues.length > 0) {
      await implementDesignFixes(issues);
    }
    
    console.log(`Iteration ${iteration}: Design gap ${designGap}%`);
  }
  
  return { finalGap: designGap, iterations: iteration };
};
```

### 3. Integration with Design Review Agent
```javascript
// Trigger comprehensive review after iteration cycles
const runFullDesignReview = async () => {
  // Navigate through all screens
  const screens = ['document-upload', 'questionnaire', 'processing', 'split-view'];
  
  for (const screen of screens) {
    await mcp__playwright__browser_navigate(`http://localhost:5173/${screen}`);
    
    // Capture for design review agent
    await mcp__playwright__browser_take_screenshot({
      filename: `review-${screen}-final.png`,
      fullPage: true
    });
    
    // Check console health
    const errors = await mcp__playwright__browser_console_messages();
    console.log(`${screen} console status:`, errors.length === 0 ? "Clean" : `${errors.length} issues`);
  }
  
  // Invoke design review agent with screenshots
  console.log("Screenshots captured. Ready for @agent design-review");
};
```

## Troubleshooting

### Common Issues

**1. "Connection Refused" Error**
- Ensure `npm run dev` is running and serving on `localhost:5173`
- Check that Electron app is accessible via browser at that URL

**2. "Element Not Found" Errors**  
- Add `data-testid` attributes to key UI elements for reliable selection
- Use `mcp__playwright__browser_snapshot()` to see available elements

**3. Screenshot Issues**
- Verify viewport is set correctly before capturing
- Allow time for animations/loading before screenshot

**4. Console Errors Not Appearing**
- Ensure browser DevTools would show the same errors
- Check if errors are being caught by React error boundaries

### Development Tips

**1. Add Test IDs to Components**
```tsx
// Add to your React components for reliable Playwright selection
<textarea 
  data-testid="call-notes"
  className="call-notes-input"
  placeholder="Enter call context..."
/>

<div data-testid="ai-prompts-panel" className="ai-prompts">
  {/* AI coaching prompts */}
</div>
```

**2. LED Breadcrumb Integration**
```typescript
// Track Playwright interactions in your LED system
export const trackUIInteraction = (ledId: number, action: string, element: string) => {
  lightLED(ledId, {
    action,
    element,
    timestamp: Date.now(),
    source: 'playwright-automation'
  });
};
```

**3. Performance Monitoring**
```javascript
// Measure interaction response times
const measureSplitViewResponse = async () => {
  const startTime = Date.now();
  
  await mcp__playwright__browser_type({
    element: "call notes",
    ref: "[data-testid='call-notes']",
    text: "Customer objection about pricing"
  });
  
  await mcp__playwright__browser_wait_for({
    text: "Consider offering",
    time: 5
  });
  
  const responseTime = Date.now() - startTime;
  console.log(`Split View response time: ${responseTime}ms`);
  
  return responseTime < 200; // Pass if under 200ms target
};
```

## Integration with VoiceCoach V2 Workflow

### 1. Development Workflow
```bash
# Terminal 1: Start development server
npm run dev

# Terminal 2: Run Claude Code with Playwright MCP
# Use design review agent or slash commands
@agent design-review "Review the Split View interface"
```

### 2. Automated Testing Pipeline
- **After each UI change**: Quick visual check via Playwright
- **Before commits**: Full design review with 7-phase validation  
- **During iterations**: Continuous screenshot comparison loops
- **Performance validation**: Split View response time verification

### 3. Memory Integration
All Playwright findings integrate with Memory Keeper MCP:
```javascript
// Save design insights for future sessions
await mcp__memory-keeper__context_save({
  key: "split-view-design-validation",
  value: "Split View interface validated via Playwright. Response time: 150ms. No console errors. Responsive design confirmed across viewports.",
  category: "voicecoach-v2-ui-design",
  priority: "high"
});
```

This integration enables the autonomous 30+ minute design iteration cycles that will help create award-winning UI for VoiceCoach V2's Split View interface.