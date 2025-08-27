# VoiceCoach V2 - Clean Architecture

## Overview
Modern desktop sales coaching application with AI-powered document analysis for real-time prompting during sales calls.

## Architecture
- **Frontend**: React 18 + TypeScript
- **Desktop**: Electron (desktop-only, no browser compatibility)
- **AI Processing**: 3-phase RAG system with Claude subagents
- **Debugging**: LED Breadcrumb System for full traceability

## Core Features
1. **Document Upload & Analysis**: Upload sales documents and extract actionable insights
2. **Contextual Questionnaire**: 5-question system to prioritize coaching based on business needs
3. **3-Phase RAG Processing**: 
   - Phase 1A: Pure document analysis
   - Phase 1B: Context-aware analysis with user priorities
   - Phase 1C: Synthesis and preparation for live coaching
4. **Real-Time Coaching**: AI-powered prompts during live sales calls

## Development Philosophy
- Clean, maintainable components (<400 lines each)
- LED breadcrumb instrumentation for debugging
- Production-ready code with comprehensive testing
- Quality over speed - robust solutions only

## Quick Start
```bash
npm install
npm run dev  # Launches Electron app with DevTools
```

## Project Structure
- `src/` - React application source
- `docs/` - V2-specific documentation  
- `.claude/` - Claude AI agent configurations
- `test-documents/` - Sample files for testing

## Built From Scratch
This is a clean V2 implementation. No legacy code dependencies.