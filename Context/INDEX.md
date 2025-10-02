# VoiceCoach V2 - Context Index

**Last Updated:** 2025-10-01

---

## 🚀 Quick Start for New Sessions

### Current Project Status
- **Latest Session:** [2025-09-30](2025-09-30/session.md) - Live coaching system analysis
- **Latest Implementation:** [2025-09-28](2025-09-28/IMPLEMENTATION_COMPLETE.md) - Ollama prompt generation fix
- **Architecture:** See [CLAUDE.md](../CLAUDE.md) at project root

### Critical Context
- **Platform:** Electron Desktop App (NOT web browser)
- **Tech Stack:** Electron 32.2.2 + React 18.3.1 + TypeScript 5.6.2
- **Architecture:** Main process (Node.js) + Renderer (React) + IPC bridge
- **LED Breadcrumbs:** 1000-9099 range system for debugging

---

## 📁 Key Topics (Cross-Cutting Concerns)

### Ollama & AI Prompts
- **[ollama-prompts.md](topics/ollama-prompts.md)** - Tool selection, prompt design strategies
- **[ollama-better-prd.md](topics/ollama-better-prd.md)** - Improved PRD for Ollama integration
- **[ollama-performance-testing.md](topics/ollama-performance-testing.md)** - Performance benchmarks
- **[ollama-prompt-new-design.md](topics/ollama-prompt-new-design.md)** - Latest design iteration

### RAG Processing
- **[rag-processing-grok.txt](topics/rag-processing-grok.txt)** - RAG v2 with Grok analysis
- **13ToolsRAG-01.json** - Core 13 sales coaching tools document

---

## 📅 Recent Sessions (Chronological)

### September 2025

#### Week of Sept 30
- **[2025-09-30](2025-09-30/)** - Live coaching system analysis
  - Critical findings on sentiment tracking
  - Tool selection optimization strategies
  - Template vs AI generation debate
  - **Key Decision:** Pivot to AI tool selection + template filling approach

#### Week of Sept 23-28
- **[2025-09-28](2025-09-28/)** - Implementation completion
  - **[IMPLEMENTATION_COMPLETE.md](2025-09-28/IMPLEMENTATION_COMPLETE.md)** - Ollama prompt fix
  - **[LED-monitor.md](2025-09-28/LED-monitor.md)** - LED breadcrumb monitoring
  - **[OllamaProb.md](2025-09-28/OllamaProb.md)** - Ollama issues & solutions

- **[2025-09-27](2025-09-27/)** - Major design thinking
  - **[session.md](2025-09-27/session.md)** - Daily progress
  - **[The genius of simplicity.md](2025-09-27/The%20genius%20of%20simplicity.md)** - Architecture philosophy

- **[2025-09-26](2025-09-26/)** - Session work
  - **[session.md](2025-09-26/session.md)** - Daily progress

- **[2025-09-25](2025-09-25/)** - Sales coaching examples
  - **[session.md](2025-09-25/session.md)** - Daily progress
  - **[Generic Sales Outline Template.md](2025-09-25/Generic%20Sales%20Outline%20Template.md)**
  - **[Sales Outline for Golf Coaching.md](2025-09-25/Sales%20Outline%20for%20Golf%20Coaching.md)**
  - **[NewPromptDesign-Golf-Coaching.md](2025-09-25/NewPromptDesign-Golf-Coaching.md)**

- **[2025-09-24](2025-09-24/)** - Technical fixes
  - **[Model-Selection-Sync.md](2025-09-24/Model-Selection-Sync.md)** - Model selection synchronization
  - **[Speaker-Identification-Fix.md](2025-09-24/Speaker-Identification-Fix.md)** - Speaker ID issues

- **[2025-09-23](2025-09-23/)** - Two sessions
  - **[session.md](2025-09-23/session.md)**
  - **[session-b.md](2025-09-23/session-b.md)**

#### Week of Sept 17-23
- **[2025-09-17](2025-09-17/)** - Session work
  - **[session.md](2025-09-17/session.md)**

#### Week of Sept 10-13
- **[2025-09-13](2025-09-13/)** - Session work
  - **[session.md](2025-09-13/session.md)**

- **[2025-09-12](2025-09-12/)** - UI and early work
  - **[session.md](2025-09-12/session.md)**
  - **[myui-images.md](2025-09-12/myui-images.md)** - UI design screenshots
  - **[context091135.json](2025-09-12/context091135.json)** - Early context data

- **[2025-09-10](2025-09-10/)** - Project initiation
  - **[Context-PRD01.md](2025-09-10/Context-PRD01.md)** - Initial PRD

---

## 🎯 Major Decisions & Pivots

### AI Architecture Decision (Sept 30, 2025)
**Location:** [2025-09-30/session.md](2025-09-30/session.md)

**Context:** Discovered sentiment tracking issues and prompt generation delays.

**Decision:** Pivot from "AI generates coaching text" to "AI selects tool + template fills text"

**Rationale:**
- 4-10x faster (200ms vs 800-2000ms)
- More reliable (no JSON parsing failures)
- Higher quality (proven templates vs AI creativity)
- No hallucination risk

**Implementation Strategy:**
1. Primary: Template + variables (90% of prompts, 50ms)
2. AI classification: Complex situations (9% of prompts, 200ms)
3. AI generation: Edge cases only (1% of prompts, 1000ms)
4. Fallback: Mirroring default when uncertain (10ms)

---

## 🏗️ Architecture Highlights

### Key Components
- **Main Process:** `main.cjs` (Electron, Node.js modules)
- **Preload Bridge:** `preload.js` (IPC bridge for file operations)
- **React App:** `src/App.tsx` (Renderer process)
- **Services:**
  - Coaching: `src/services/coaching/`
  - Audio: `src/services/audio/`
  - WebSocket: `src/services/websocket/`

### File Size Limits (Strictly Enforced)
- Components: < 400 lines
- Services: < 300 lines
- Main app files: < 200 lines
- Utilities: < 150 lines

---

## 🔧 Common Issues & Solutions

### Ollama Prompt Generation Issues
**Problem:** Returned instruction text instead of coaching
**Solution:** Switched to `direct-coaching-prompt.md` with variable substitution
**Reference:** [2025-09-28/IMPLEMENTATION_COMPLETE.md](2025-09-28/IMPLEMENTATION_COMPLETE.md)

### Speaker Identification
**Problem:** Speaker separation issues
**Solution:** Volume-based detection improvements
**Reference:** [2025-09-24/Speaker-Identification-Fix.md](2025-09-24/Speaker-Identification-Fix.md)

---

## 📊 Performance Targets

- **Prompt Generation:** < 200ms (target), currently 800-2000ms
- **UI Response:** < 200ms for Split View
- **LED Breadcrumb Coverage:** All critical operations
- **Component Size:** < 400 lines (enforced)

---

## 🗺️ Navigation Tips

### For Implementation Details
1. Check most recent session in [2025-09-30](2025-09-30/)
2. Review [CLAUDE.md](../CLAUDE.md) for architecture rules
3. Check topics folder for cross-cutting concerns

### For Architecture Questions
1. Start with [CLAUDE.md](../CLAUDE.md)
2. Review [2025-09-27/The genius of simplicity.md](2025-09-27/The%20genius%20of%20simplicity.md)
3. Check session files for implementation decisions

### For Recent Changes
1. Always check [2025-09-30](2025-09-30/) first
2. Review [2025-09-28/IMPLEMENTATION_COMPLETE.md](2025-09-28/IMPLEMENTATION_COMPLETE.md)
3. Check git status for uncommitted work

---

## ✅ Success Criteria

- Upload doc → Questions → Coaching insights in < 30 seconds
- Clean, maintainable codebase
- Comprehensive LED breadcrumb coverage
- Production-ready error handling
- Zero hard-coded fake data in production

---

**Note:** This index is manually maintained. Update after significant sessions or architectural changes.
