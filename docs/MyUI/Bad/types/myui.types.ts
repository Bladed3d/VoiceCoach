/**
 * MyUI - Multi-AI Interface Types
 * Custom coding interface for parallel AI model querying
 */

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  apiEndpoint: string;
  cost: 'cheap' | 'medium' | 'premium';
  enabled: boolean;
}

export interface AIModelResponse {
  modelId: string;
  modelName: string;
  response: string;
  error?: string;
  timestamp: number;
  latency: number;
}

export interface PromptQuery {
  id: string;
  prompt: string;
  context?: string;
  timestamp: number;
  responses: AIModelResponse[];
  synthesis?: string;
}

export interface ProjectContext {
  summary: string;
  lastUpdated: number;
  codebaseIndex?: CodebaseIndex;
}

export interface CodebaseIndex {
  files: FileEntry[];
  summary: string;
  keyComponents: string[];
  lastScanned: number;
}

export interface FileEntry {
  path: string;
  type: 'component' | 'service' | 'type' | 'config' | 'other';
  summary: string;
  keyFunctions: string[];
}

export interface MyUIConfig {
  selectedModels: string[];
  panelCount: number;
  autoSynthesize: boolean;
  contextRetention: boolean;
  apiKeys: Record<string, string>;
}

export interface PanelLayout {
  id: string;
  modelId: string;
  position: number;
  width: number;
  height: number;
}

export interface SynthesisRequest {
  responses: AIModelResponse[];
  prompt: string;
  context?: string;
  synthesisModel: string;
}