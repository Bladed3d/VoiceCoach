/**
 * MyUI - Multi-AI Interface Module
 * Export all components, hooks, services, and types
 */

// Components
export { default as MyUI } from './components/MyUI';
export { default as MyUISettings } from './components/MyUISettings';

// Hooks
export { useMultiAI } from './hooks/useMultiAI';

// Services
export { MultiAIService } from './services/MultiAIService';
export { ProjectIndexService } from './services/ProjectIndexService';

// Types
export type {
  AIModel,
  AIModelResponse,
  PromptQuery,
  ProjectContext,
  CodebaseIndex,
  FileEntry,
  MyUIConfig,
  PanelLayout,
  SynthesisRequest
} from './types/myui.types';