// Type definitions for Electron API
export interface ElectronAPI {
  // File operations
  selectFile: () => Promise<string | null>;
  readFile: (filePath: string) => Promise<{
    content: string;
    size: number;
    name: string;
    path: string;
  }>;

  // Document processing
  processDocument: (data: {
    content: string;
    questionnaire: any;
  }) => Promise<{
    success: boolean;
    qualityScore: number;
    totalTechniques: number;
    criticalInsights: number;
    quickWins: number;
    coachingPrompts: {
      opening: string[];
      discovery: string[];
      objection_handling: string[];
      closing: string[];
    };
  }>;
  
  // Subagent invocation
  invokeSubagent: (data: {
    agentType: string;
    prompt: string;
    document: any;
    questionnaire?: any;
    phase?: string;
  }) => Promise<any>;
  
  // Ollama processing
  processWithOllama: (data: {
    phase1AResults: any;
    phase1BResults: any;
  }) => Promise<any>;

  // Storage operations
  saveInsights: (insights: any) => Promise<{ success: boolean }>;
  loadInsights: () => Promise<any | null>;

  // RAG document operations
  listRagDocuments?: () => Promise<Array<{ name: string; path: string; type: string; size?: number }>>;
  loadRagDocument?: (filename: string) => Promise<any>;

  // Sales script operations
  listSalesScripts?: () => Promise<Array<{ name: string; path: string }>>;

  // System info
  getSystemInfo: () => Promise<{
    platform: string;
    version: string;
    electronVersion: string;
    nodeVersion: string;
  }>;

  // Utility
  platform: string;
  versions: any;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    isElectron: boolean;
  }
}