// VoiceCoach V2 Type Definitions

export interface DocumentFile {
  file: File;
  content: string;
  name: string;
  size: number;
  type: string;
}

export interface QuestionnaireData {
  documentType: string;
  learningObjective: string;
  businessChallenge: string;
  successMetrics: string;
  criticalConcepts: string[];
}

export interface CoachingPrompts {
  opening: string[];
  discovery: string[];
  objection_handling: string[];
  closing: string[];
}

export interface ProcessedInsights {
  success: boolean;
  qualityScore: number;
  totalTechniques: number;
  criticalInsights: number;
  quickWins: number;
  coachingPrompts: CoachingPrompts;
  processingTime?: number;
  timestamp?: number;
}

export interface ProcessingPhase {
  id: '1A' | '1B' | '1C';
  name: string;
  description: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  progress: number;
  startTime?: number;
  endTime?: number;
  error?: string;
}

export interface AppState {
  currentStep: 'upload' | 'questionnaire' | 'processing' | 'insights';
  uploadedDocument: DocumentFile | null;
  questionnaire: QuestionnaireData | null;
  processedInsights: ProcessedInsights | null;
  processingPhases: ProcessingPhase[];
  isProcessing: boolean;
  error: string | null;
}

// LED Breadcrumb Types
export interface Breadcrumb {
  id: number;
  name: string;
  component: string;
  timestamp: number;
  success: boolean;
  data?: any;
  error?: string;
  stack?: string;
}

export interface VerificationResult {
  expect: any;
  actual: any;
  validator?: (actual: any) => boolean;
}

// Processing Statistics
export interface ProcessingStats {
  documentSize: number;
  processingTime: number;
  qualityScore: number;
  techniquesExtracted: number;
  criticalInsights: number;
  ledCoverage: number;
  failedOperations: number;
}

export type DocumentType = 'strategy' | 'product' | 'scripts';
export type ProcessingStep = 'upload' | 'questionnaire' | 'processing' | 'insights' | 'split-view';
export type LEDRange = '1000-1999' | '2000-2999' | '3000-3999' | '4000-4999' | '5000-5999' | '6000-6999' | '7000-7999' | '8000-8999' | '9000-9999';

// Split View Interface Types
export interface CoachingPrompt {
  id: string;
  content: string;
  priority: 'urgent' | 'helpful' | 'background';
  category: 'opening' | 'discovery' | 'objection_handling' | 'closing';
  timestamp: number;
  used: boolean;
  dismissed: boolean;
}

export interface TranscriptionEntry {
  id: string;
  speaker: 'user' | 'client' | 'ai';
  content: string;
  timestamp: number;
  confidence?: number;
}

export interface SplitViewState {
  coachingPrompts: CoachingPrompt[];
  transcriptionEntries: TranscriptionEntry[];
  panelRatio: number; // 0.7 for 70/30 split
  isResizing: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  performanceMetrics: {
    lastUpdateTime: number;
    responseTime: number;
    updatesPerSecond: number;
  };
}

export interface CoachingPromptActions {
  onCopy: (prompt: CoachingPrompt) => void;
  onMarkUsed: (prompt: CoachingPrompt) => void;
  onDismiss: (prompt: CoachingPrompt) => void;
}

export interface PanelResizeState {
  isDragging: boolean;
  startX: number;
  startRatio: number;
  currentRatio: number;
}