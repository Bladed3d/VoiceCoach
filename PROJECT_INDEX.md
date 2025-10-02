# VoiceCoach V2 - Project Index

**Last Updated:** 2025-10-02 17:07:23
**Auto-generated** by `save-session.py`

---

## 📋 Quick Navigation

- [Entry Points](#entry-points) - Main application entry files
- [Components](#components) - React UI components
- [Services](#services) - Business logic and integrations
- [Hooks](#hooks) - Custom React hooks
- [Types](#types) - TypeScript type definitions
- [Utils](#utils) - Helper functions and utilities
- [Configuration](#configuration) - Config files
- [Documentation](#documentation) - Project docs

---

## Entry Points

- **index.html** (44 lines) - * wss://* http://* https://*;">
- **main.cjs** (3462 lines) - Cleanup is now handled by pre-startup-cleanup.js before npm run dev
- **preload.js** (104 lines) - Expose protected methods that allow the renderer process to use

---

## Components

**Location:** `src/components/`


### App.tsx/
- **App.tsx** (62 lines)

### CoachingInsights.tsx/
- **CoachingInsights.tsx** (174 lines)

### ContextualQuestionnaire.tsx/
- **ContextualQuestionnaire.tsx** (391 lines)

### DocumentUploader.tsx/
- **DocumentUploader.tsx** (152 lines)

### KnowledgeBaseHub.tsx/
- **KnowledgeBaseHub.tsx** (496 lines) - VoiceCoach V2 - Knowledge Base Hub Component

### ProcessingStatus.tsx/
- **ProcessingStatus.tsx** (535 lines)

### SplitViewCoaching.backup.tsx/
- **SplitViewCoaching.backup.tsx** (1909 lines)

### SplitViewCoaching.tsx/
- **SplitViewCoaching.tsx** (1020 lines) - VoiceCoach V2 - Split View Coaching Component (Modular)

### coaching/
- **AudioCaptureSelector.tsx** (67 lines) - VoiceCoach V2 - Audio Capture Selector
- **CoachingCard.tsx** (491 lines) - VoiceCoach V2 - Enhanced Coaching Card Component
- **CoachingPanel.tsx** (186 lines) - VoiceCoach V2 - Coaching Panel Component
- **MEFSIndicators.tsx** (94 lines) - VoiceCoach V2 - MEFS Alignment Indicators
- **ManualSentimentButtons.tsx** (61 lines) - VoiceCoach V2 - Manual Sentiment Buttons Component
- **SalesScriptPanel.tsx** (461 lines) - VoiceCoach V2 - Sales Script Panel Component
- **TranscriptionPanel.tsx** (150 lines) - VoiceCoach V2 - Transcription Panel Component

### common/
- **CollapsedPanel.tsx** (75 lines) - VoiceCoach V2 - Collapsed Panel Component
- **DualVolumeIndicator.tsx** (119 lines) - VoiceCoach V2 - Dual Volume Indicator Component
- **LiquidGridAnimation.tsx** (626 lines) - VoiceCoach V2 - Liquid Grid Animation Component
- **OllamaSystemToggle.tsx** (127 lines) - VoiceCoach V2 - Ollama System Toggle Component
- **ResizeHandle.tsx** (52 lines) - VoiceCoach V2 - Resize Handle Component
- **SimpleLiquidGrid.tsx** (324 lines) - VoiceCoach V2 - Simplified Liquid Grid Animation
- **VolumeIndicator.tsx** (65 lines) - VoiceCoach V2 - Volume Indicator Component

### customization/
- **CustomizationChat.css** (286 lines) - VoiceCoach V2 - Customization Chat Styles
- **CustomizationChat.tsx** (231 lines) - VoiceCoach V2 - Customization Chat Component

### modals/
- **AudioSettings.tsx** (358 lines) - VoiceCoach V2 - Audio Settings Component
- **DocumentSelectorModal.tsx** (248 lines) - VoiceCoach V2 - Document Selector Modal
- **KnowledgeBaseAPIConfig.tsx** (249 lines) - VoiceCoach V2 - Knowledge Base API Configuration Component
- **KnowledgeBaseModal.tsx** (598 lines) - VoiceCoach V2 - Knowledge Base Modal Component
- **PhaseDetailsModal.tsx** (406 lines) - VoiceCoach V2 - Phase Details Modal Component
- **SettingsModal.tsx** (737 lines) - VoiceCoach V2 - Settings Modal Component
- **VoskSettingsModal.tsx** (838 lines) - VoiceCoach V2 - Vosk Settings Modal

### settings/
- **VoskOptimizationPanel.tsx** (590 lines) - VoiceCoach V2 - Vosk Optimization Panel

### ui/
- **Badge.tsx** (69 lines)
- **Button.tsx** (52 lines) - Base button styles (from design system CSS classes)
- **Card.tsx** (78 lines)
- **Input.tsx** (73 lines)
- **Progress.tsx** (48 lines)
- **Textarea.tsx** (72 lines)
- **index.ts** (20 lines) - VoiceCoach V2 UI Component Library

---

## Services

**Location:** `src/services/`


### audio/
- **DualVolumeMonitoringService.ts** (541 lines) - VoiceCoach V2 - Dual Volume Monitoring Service
- **VolumeMonitoringService.ts** (234 lines) - VoiceCoach V2 - Volume Monitoring Service

### chromadb/
- **chromadb-websocket-client.ts** (379 lines) - VoiceCoach V2 - ChromaDB WebSocket Client

### chromadb-server.py/
- **chromadb-server.py** (512 lines)

### coaching/
- **BuyingSignalsDetector.ts** (231 lines) - VoiceCoach V2 - Buying Signals Detector
- **ConfigurablePromptBuilder.ts** (513 lines) - Configurable Prompt Builder for VoiceCoach V2
- **ConfigurationLoader-Electron.ts** (287 lines) - Configuration Loader Service - Electron Renderer Process Version
- **ConfigurationLoader.ts** (517 lines) - Configuration Loader Service
- **ConversationAnalyzer.ts** (251 lines) - VoiceCoach V2 - Conversation Analyzer
- **KnowledgeIntegration.ts** (274 lines) - Knowledge Integration Service
- **ObjectionDetector.ts** (192 lines) - VoiceCoach V2 - Objection Detector
- **OllamaInstructionLoader-Browser.ts** (395 lines) - VoiceCoach V2 - Ollama Instruction Loader (Browser/Electron Version)
- **OllamaInstructionLoader.ts** (310 lines) - VoiceCoach V2 - Ollama Instruction Loader
- **OllamaPromptBuilder.ts** (438 lines) - VoiceCoach V2 - Ollama Prompt Builder Service
- **OllamaPromptService.ts** (480 lines) - VoiceCoach V2 - Centralized Ollama Prompt Service
- **PatternMatchingLibrary.ts** (411 lines) - VoiceCoach V2 - Pattern Matching Library
- **SalesStageDetector.ts** (182 lines) - VoiceCoach V2 - Sales Stage Detector
- **SessionManagerService.ts** (1513 lines) - VoiceCoach V2 - Session Manager Service
- **ToolTemplateEngine.ts** (448 lines) - VoiceCoach V2 - Tool Template Engine
- **ToolUsageTracker.ts** (468 lines) - VoiceCoach V2 - Tool Usage Tracker
- **coaching-search-adapter.ts** (458 lines) - Coaching Search Adapter
- **intelligent-prompt-builder.ts** (626 lines) - Intelligent Prompt Builder
- **live-coaching-manager.ts** (275 lines) - VoiceCoach V2 - Live Coaching Manager
- **live-coaching-service.ts** (747 lines) - VoiceCoach V2 - Live Coaching Integration Service (Template System)
- **ollama-compatibility-wrapper.ts** (420 lines) - VoiceCoach V2 - Ollama Compatibility Wrapper
- **ollama-service-enhanced.ts** (520 lines) - VoiceCoach V2 - Enhanced Ollama Integration Service
- **ollama-service.ts** (678 lines) - VoiceCoach V2 - Ollama Integration Service
- **sales-script-service.ts** (449 lines) - VoiceCoach V2 - Sales Script Service
- **sales-stage-tracker.ts** (403 lines) - VoiceCoach V2 - Sales Stage Tracker
- **script-progress-tracker.ts** (488 lines) - VoiceCoach V2 - Script Progress Tracker
- **sentiment-analyzer - backup.ts** (504 lines) - VoiceCoach V2 - Sentiment Analyzer
- **sentiment-analyzer.ts** (597 lines) - VoiceCoach V2 - Sentiment Analyzer
- **sentiment-tool-selector.ts** (267 lines) - VoiceCoach V2 - Simplified Tool Selector

### customization/
- **CustomizationService-Browser.ts** (186 lines) - Browser-compatible Customization Service for VoiceCoach V2
- **CustomizationService.ts** (482 lines) - VoiceCoach V2 - Customization Service

### document/
- **AutomatedDocumentProcessor.ts** (424 lines) - VoiceCoach V2 - Automated Document Processing Pipeline
- **ProcessedDocumentPersistence.ts** (170 lines) - Processed Document Persistence Service
- **ProcessedDocumentVersionManager.ts** (280 lines) - Processed Document Version Manager

### knowledge/
- **ChromaDBManager.ts** (398 lines) - VoiceCoach V2 - ChromaDB Collection Manager
- **ChromaDBService.ts** (506 lines) - VoiceCoach V2 - ChromaDB Service
- **DocumentProcessor-Browser.ts** (474 lines) - Document Processor for VoiceCoach V2 - Browser Version
- **DocumentProcessor.ts** (495 lines) - Document Processor for VoiceCoach V2

### simple-vosk-server.py/
- **simple-vosk-server.py** (136 lines)

### vosk-audio-worklet.js/
- **vosk-audio-worklet.js** (62 lines) - VoiceCoach V2 - Vosk-Optimized AudioWorklet Processor

### vosk-config-service.ts/
- **vosk-config-service.ts** (255 lines) - VoiceCoach V2 - Vosk Configuration Service

### vosk-native-websocket-server.py/
- **vosk-native-websocket-server.py** (523 lines)

### vosk-native-websocket.py/
- **vosk-native-websocket.py** (299 lines)

### vosk-websocket-server-simple.py/
- **vosk-websocket-server-simple.py** (153 lines)

### vosk-websocket-server.py/
- **vosk-websocket-server.py** (536 lines)

### websocket/
- **simple-websocket-client.ts** (240 lines) - SIMPLE Native WebSocket Client - No Socket.IO bullshit
- **socket-io-client.ts** (252 lines) - Socket.IO Client for Vosk WebSocket Server
- **websocket-client-fallback.ts** (155 lines) - Fallback WebSocket client using dynamic import for Socket.IO
- **websocket-client.ts** (1704 lines) - VoiceCoach V2 - Socket.IO WebSocket Client Service

### workers/
- **worker-adapter.js** (215 lines) - VoiceCoach V2 - Worker Manager Adapter (CommonJS version)
- **worker-adapter.ts** (303 lines) - VoiceCoach V2 - Worker Manager Adapter
- **worker-manager.js** (537 lines) - VoiceCoach V2 - Worker Thread Manager

---

## Hooks

**Location:** `src/hooks/`

- **useCoachingSession.ts** (109 lines) - VoiceCoach V2 - Coaching Session Hook
- **useLiveCoaching.ts** (249 lines) - VoiceCoach V2 - Live Coaching Hook
- **useResizablePanels.ts** (379 lines) - VoiceCoach V2 - Resizable Panels Hook
- **useSalesScript.ts** (50 lines) - VoiceCoach V2 - Sales Script Hook

---

## Types

**Location:** `src/types/`

- **chromadb.ts** (102 lines) - VoiceCoach V2 - ChromaDB Type Definitions
- **coaching.ts** (93 lines) - VoiceCoach V2 - Core Coaching Types
- **electron.d.ts** (67 lines) - Type definitions for Electron API
- **index.ts** (138 lines) - VoiceCoach V2 Type Definitions
- **questionnaire.ts** (35 lines) - VoiceCoach V2 - Questionnaire Types
- **vosk-config.ts** (233 lines) - VoiceCoach V2 - Vosk Configuration Types

---

## Utils

**Location:** `src/lib/` and `src/utils/`

- **breadcrumb-system.ts** (240 lines) - VoiceCoach V2 LED Breadcrumb System
- **enhanced-processing-debug.ts** (276 lines) - VoiceCoach V2 - Enhanced Processing Debug Interface
- **model-utils.ts** (69 lines) - VoiceCoach V2 - Model Selection Utilities
- **utils.ts** (5 lines)

---

## Configuration

- **package-lock.json** (9005 lines)
- **package.json** (73 lines)
- **vite.config.ts** (26 lines)

---

## 📊 Project Statistics

- **Total Files Indexed:** 535
- **Total Lines of Code:** 207,266
- **Components:** 39
- **Services:** 56
- **Hooks:** 4

---

## 🔄 How to Update This Index

Run the following command anytime:

```bash
python save-session.py
```

The script will automatically:
1. Find your most recent Claude session
2. Save it to Context/{date}/session-{time}.md
3. Regenerate this complete project index

---

**Note:** This index is automatically generated by scanning the project structure. For decision history and context, see [Context/INDEX.md](Context/INDEX.md).
