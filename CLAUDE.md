# VoiceCoach V2 - Development Instructions

## 🚨 CRITICAL: THIS IS A DESKTOP ELECTRON APP - NOT A WEB APP! 🚨

### BEFORE WRITING ANY CODE, VERIFY:
1. **This is an ELECTRON DESKTOP APPLICATION** - We moved from web to desktop to overcome browser limitations
2. **Check the tech stack** - Look at package.json: We use Electron + React + TypeScript
3. **Renderer process limitations** - React components CANNOT import Node.js modules (`fs`, `path`, etc.)
4. **Use Electron IPC** - All file operations must go through `electronAPI` methods defined in preload.js

### Why Desktop, NOT Web:
- **WebRTC limitations** in browsers prevented proper audio capture
- **File system access** restricted in browsers
- **CORS issues** with local services
- **Full system integration** only possible with desktop

### Electron Architecture Rules:
- **Main process** (main.cjs) - Can use Node.js modules
- **Renderer process** (React app) - Browser environment, NO Node.js modules
- **Preload script** (preload.js) - Bridge between main and renderer
- **IPC communication** - Use `electronAPI` for file/system operations

## Project Mission
Build a clean, modern desktop sales coaching application that provides real-time AI guidance during sales calls.

## CRITICAL PROCESS MANAGEMENT RULES

❌ **ABSOLUTELY FORBIDDEN COMMANDS - NEVER USE:**
- `taskkill //F //IM node.exe` - WILL CRASH DEVELOPMENT WORK
- `taskkill //F //IM electron.exe` - WILL CRASH APPLICATION
- `taskkill` with ANY node or electron processes
- **THIS APPLIES TO ALL COMMANDS** - including compound commands with `&&` or `;`
- **NO EXCEPTIONS** - These commands destroy active development sessions

✅ **SAFE PROCESS MANAGEMENT:**
- Use `Get-Process` first to identify exact PIDs
- Use `taskkill //F //PID [specific_number]` with exact PID only
- Ask user for specific PID numbers if needed
- Always target specific PIDs, never process names

## Technical Standards & Stack

### Core Technology Stack:
- **Electron 32.2.2** - Desktop application framework
- **React 18.3.1** - UI in renderer process
- **TypeScript 5.6.2** - Type safety
- **Vite 5.4.19** - Build tool
- **Node.js** - Main process only

### Architecture Requirements:
- **NO BROWSER COMPATIBILITY** - This is desktop-only
- **Components < 400 lines** - Keep everything maintainable
- **LED Breadcrumbs** - Instrument all critical operations (ranges 1000-9099)
- **Quality first** - Robust, production-ready code only
- **Electron IPC for file ops** - Never use fs/path in React components

### Common Mistakes to AVOID:
❌ Creating "Browser" versions of services - THIS IS DESKTOP ONLY
❌ Importing Node.js modules in React components
❌ Using Web APIs when Electron APIs exist
❌ Assuming browser limitations apply
✅ Use Electron IPC through electronAPI
✅ Check preload.js for available methods
✅ Keep Node.js imports in main process only

## Core Workflow
1. User uploads sales document
2. User answers 5 contextual questions
3. 3-phase RAG processing extracts actionable insights
4. Knowledge available for real-time coaching during calls

## Memory Keeper MCP
This project uses Memory Keeper MCP for session continuity. See `.claude/memory-keeper-instructions.md` for complete configuration. Key behaviors:
- Automatically save technical decisions, bugs/solutions, and architectural choices
- Use memory categories: `voicecoach-v2-architecture`, `voicecoach-v2-rag-system`, `voicecoach-v2-ui-design`, etc.
- End important responses with: `[Saved to memory: topic]`
- Proactively check memories to maintain consistency across sessions

## Available Agents
- **rag-analyst**: Processes documents using 3-phase approach
- **"RAG Document Analyst2"**: Advanced document analyst extracting actionable sales techniques and frameworks
- **lead-developer**: Implements features with LED instrumentation  
- **ui-designer**: Creates world-class interfaces with Playwright validation
- **breadcrumbs-agent**: Adds LED infrastructure to functional code
- **tester**: Validates functionality and quality

## Modular Architecture Standards
**CRITICAL: All code must follow strict modularization to prevent bloat**

**File Size Limits (STRICTLY ENFORCED):**
- Components: < 400 lines maximum
- Services: < 300 lines maximum  
- Main app files: < 200 lines (orchestration only)
- Utilities: < 150 lines maximum

**Directory Structure:**
```
src/
├── components/
│   ├── common/           # Reusable UI < 100 lines
│   ├── coaching/         # Coaching UI < 400 lines  
│   └── modals/          # Modal components < 200 lines
├── services/
│   ├── audio/           # Audio capture, volume monitoring
│   ├── coaching/        # Session management, suggestions
│   ├── websocket/       # WebSocket client
│   └── storage/         # Data persistence
├── hooks/               # Custom React hooks < 100 lines
├── types/               # TypeScript definitions
└── lib/                 # Utilities and breadcrumb system
```

**Separation Rules:**
1. ONE RESPONSIBILITY per file
2. NO business logic in UI components  
3. Services handle data/state management
4. Components only handle presentation
5. Hooks bridge services and components
6. Communication: Service → Hook → Component

## ⚠️ CRITICAL: Content Security Policy (CSP)
**DEVELOPMENT MODE**: The CSP in `index.html` is completely relaxed to allow ALL connections during development. This prevents wasting hours debugging CSP issues.

**PRODUCTION MODE**: Before release, replace the CSP with the one in `csp-production.html`

**NEVER** add restrictive CSP during development. If you need to test CSP, do it in a separate branch or at the very end of development.

## Development Rules
✅ **Always do:**
- Add LED breadcrumbs to critical operations
- Use TypeScript for type safety
- Test thoroughly before claiming complete
- Build for maintainability
- **Follow modular architecture strictly**
- **Create separate services for each concern**

❌ **Never do:**
- Create components over 400 lines
- Skip error handling
- Compromise quality for speed
- Add legacy compatibility layers
- **Put business logic in UI components**
- **Create monolithic files**
- **Hard-code fake/mock data directly into application code**

## LED Breadcrumb Ranges
- 1000-1099: Application startup and initialization
- 2000-2099: Document upload and validation
- 3000-3099: RAG Phase 1A (pure analysis)
- 4000-4099: RAG Phase 1B (contextual analysis)  
- 5000-5099: RAG Phase 1C (synthesis)
- 6000-6099: Live coaching integration
- 7000-7099: UI interactions and state management
- 8000-8099: Error handling and recovery
- 9000-9099: Testing and validation

## Visual Development

### Design Principles
- S-tier design checklist in `docs/design/design-principles-example.md`
- UI Design PRD in `docs/UI-DESIGN-PRD.md`
- Follow VoiceCoach V2 Split View specifications (70/30 layout)

### Quick Visual Check
IMMEDIATELY after implementing any front-end change:
1. **Identify what changed** - Review the modified components/pages
2. **Navigate to affected pages** - Use Playwright MCP to visit localhost:5173
3. **Verify design compliance** - Compare against UI-DESIGN-PRD.md requirements
4. **Validate Split View performance** - Ensure <200ms response time
5. **Check acceptance criteria** - Review VoiceCoach V2 workflow requirements
6. **Capture evidence** - Take desktop screenshot at 1440px viewport
7. **Check for errors** - Review console for Electron/React issues

### Comprehensive Design Review
Invoke `@agent ui-designer` for thorough design validation when:
- Completing Split View interface features
- Before finalizing PRs with visual changes
- Needing comprehensive accessibility and desktop UX testing

## Data Policy
**CRITICAL: NO FAKE DATA IN APPLICATION CODE**

✅ **Acceptable for testing/development:**
- External test data files in `tests/fixtures/` or `docs/test-data/`
- Separate mock data services that can be easily disabled/removed
- User-supplied test data during development sessions
- Environment-based data loading (development vs production)

❌ **NEVER acceptable:**
- Hard-coded mock data directly in components or services
- Fake user data embedded in application logic
- Sample data that ships with production code
- Demo content that cannot be easily removed

**Rationale:** Hard-coded fake data creates maintenance debt, confuses users, and can accidentally ship to production. Always keep test data separate from application code.

## Success Criteria
- Upload document → Answer questions → Get coaching insights in <30 seconds
- Clean, maintainable codebase that any developer can understand
- Comprehensive LED breadcrumb coverage for debugging
- Production-ready with robust error handling
- Zero hard-coded fake data in production code