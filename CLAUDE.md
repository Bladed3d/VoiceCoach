# VoiceCoach V2 - Development Instructions

## Project Mission
Build a clean, modern desktop sales coaching application that provides real-time AI guidance during sales calls.

## Technical Standards
- **React 18** + TypeScript for type safety
- **Electron only** - No browser compatibility needed
- **Components < 400 lines** - Keep everything maintainable
- **LED Breadcrumbs** - Instrument all critical operations
- **Quality first** - Robust, production-ready code only

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
- **lead-developer**: Implements features with LED instrumentation  
- **ui-designer**: Creates world-class interfaces with Playwright validation
- **breadcrumbs-agent**: Adds LED infrastructure to functional code
- **tester**: Validates functionality and quality

## Development Rules
✅ **Always do:**
- Add LED breadcrumbs to critical operations
- Use TypeScript for type safety
- Test thoroughly before claiming complete
- Build for maintainability

❌ **Never do:**
- Create components over 400 lines
- Skip error handling
- Compromise quality for speed
- Add legacy compatibility layers

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

## Success Criteria
- Upload document → Answer questions → Get coaching insights in <30 seconds
- Clean, maintainable codebase that any developer can understand
- Comprehensive LED breadcrumb coverage for debugging
- Production-ready with robust error handling