/**
 * VoiceCoach V2 - Worker Manager Adapter
 * TypeScript adapter for Node.js WorkerManager integration
 * LED Range: 4280-4289
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

// Import Node.js WorkerManager
const WorkerManager = require('./worker-manager.js');

export interface WorkerAnalysisResult {
  response: {
    response: string;
    score: number;
    technique?: string;
    source?: string;
    priority?: string;
  } | null;
  metadata: {
    stage: string;
    topics: string[];
    objections: string[];
    documentSource: string;
    analysisTime: number;
    alternativeCount?: number;
    alternativeResults?: Array<{
      source: string;
      score: number;
      technique?: string;
    }>;
    mode?: string;
    sourcesConsulted?: number;
    topOptions?: any[];
  };
}

export interface WorkerContext {
  currentStage?: string;
  conversationHistory?: Array<{
    speaker: 'user' | 'prospect';
    text: string;
    timestamp: string;
  }>;
  lastCoachingPrompt?: string;
}

export class WorkerAdapter {
  private trail: BreadcrumbTrail;
  private workerManager: any;
  private isInitialized: boolean = false;
  private currentDocuments: string[] = [];
  
  constructor() {
    this.trail = new BreadcrumbTrail('WorkerAdapter');
    
    // LED 4280: Adapter initialization
    this.trail.light(4280, {
      operation: 'worker_adapter_initialized',
      timestamp: Date.now()
    });
    
    // Create WorkerManager instance
    this.workerManager = new WorkerManager();
    
    // Setup event listeners
    this.setupEventListeners();
  }
  
  /**
   * Setup event listeners for WorkerManager
   */
  private setupEventListeners(): void {
    this.workerManager.on('documentLoaded', (data: any) => {
      this.trail.light(4281, {
        operation: 'document_loaded_event',
        mode: data.mode,
        documents: data.documents
      });
      
      this.currentDocuments = data.documents;
    });
    
    this.workerManager.on('workerError', (data: any) => {
      this.trail.fail(8280, new Error(`Worker error: ${data.error.message}`));
    });
  }
  
  /**
   * Initialize with single document (Phase 1)
   * LED: 4282
   */
  async initializeWithDocument(documentPath: string): Promise<boolean> {
    try {
      this.trail.light(4282, {
        operation: 'initializing_with_document',
        documentPath
      });
      
      // Determine worker type based on document name
      const workerType = this.getWorkerType(documentPath);
      
      // Load document into worker
      const result = await this.workerManager.loadSingleDocument(
        documentPath,
        workerType
      );
      
      this.isInitialized = true;
      
      this.trail.light(4283, {
        operation: 'initialization_complete',
        documentName: result.documentName,
        stats: result.stats
      });
      
      return true;
      
    } catch (error) {
      this.trail.fail(8282, error as Error);
      return false;
    }
  }
  
  /**
   * Add additional document (Phase 2/3)
   * LED: 4284
   */
  async addDocument(documentPath: string): Promise<boolean> {
    try {
      this.trail.light(4284, {
        operation: 'adding_document',
        documentPath,
        currentMode: this.workerManager.mode
      });
      
      const workerType = this.getWorkerType(documentPath);
      
      // Add based on current mode
      let result;
      if (this.workerManager.mode === 'single') {
        result = await this.workerManager.addSecondDocument(
          documentPath,
          workerType
        );
      } else if (this.workerManager.mode === 'dual') {
        result = await this.workerManager.addThirdDocument(documentPath);
      } else {
        throw new Error('Cannot add more than 3 documents');
      }
      
      this.trail.light(4285, {
        operation: 'document_added',
        documentName: result.documentName,
        totalDocuments: this.currentDocuments.length
      });
      
      return true;
      
    } catch (error) {
      this.trail.fail(8284, error as Error);
      return false;
    }
  }
  
  /**
   * Analyze transcript using workers
   * LED: 4286
   */
  async analyzeTranscript(
    transcript: string,
    context: WorkerContext = {}
  ): Promise<WorkerAnalysisResult | null> {
    if (!this.isInitialized) {
      console.error('WorkerAdapter not initialized');
      return null;
    }
    
    try {
      this.trail.light(4286, {
        operation: 'analyzing_transcript',
        transcriptLength: transcript.length,
        hasContext: !!context.currentStage,
        mode: this.workerManager.mode
      });
      
      const result = await this.workerManager.analyzeTranscript(
        transcript,
        context
      );
      
      this.trail.light(4287, {
        operation: 'analysis_complete',
        hasResponse: !!result?.response,
        score: result?.response?.score || 0,
        source: result?.metadata?.documentSource
      });
      
      return result as WorkerAnalysisResult;
      
    } catch (error) {
      this.trail.fail(8286, error as Error);
      return null;
    }
  }
  
  /**
   * Search techniques across all loaded documents
   * LED: 4288
   */
  async searchTechniques(query: string): Promise<any[]> {
    try {
      this.trail.light(4288, {
        operation: 'searching_techniques',
        query,
        documentCount: this.currentDocuments.length
      });
      
      // Search all workers in parallel
      const searchPromises = [];
      
      for (const [id, workerInfo] of this.workerManager.workers) {
        searchPromises.push(
          this.workerManager.sendMessage(workerInfo.worker, 'search', { query })
            .then((results: any) => ({
              source: id,
              results
            }))
        );
      }
      
      const allResults = await Promise.all(searchPromises);
      
      // Flatten and return
      const techniques = allResults.flatMap(r => 
        r.results.map((tech: any) => ({
          ...tech,
          source: r.source
        }))
      );
      
      return techniques;
      
    } catch (error) {
      this.trail.fail(8288, error as Error);
      return [];
    }
  }
  
  /**
   * Get worker status
   */
  async getStatus(): Promise<any> {
    return await this.workerManager.getStatus();
  }
  
  /**
   * Determine worker type based on document name
   */
  private getWorkerType(documentPath: string): string {
    const lower = documentPath.toLowerCase();
    
    if (lower.includes('neversplit') || lower.includes('voss')) {
      return 'neversplit';
    }
    
    // Add more specialized workers as they're created
    // if (lower.includes('hormozi')) return 'hormozi';
    // if (lower.includes('sandler')) return 'sandler';
    
    return 'base';
  }
  
  /**
   * Get current mode
   */
  getMode(): string {
    return this.workerManager.mode;
  }
  
  /**
   * Get loaded documents
   */
  getLoadedDocuments(): string[] {
    return this.currentDocuments;
  }
  
  /**
   * Shutdown all workers
   * LED: 4289
   */
  async shutdown(): Promise<void> {
    this.trail.light(4289, {
      operation: 'shutting_down_adapter'
    });
    
    await this.workerManager.shutdownAllWorkers();
    this.isInitialized = false;
    this.currentDocuments = [];
  }
}

// Export singleton instance
export const workerAdapter = new WorkerAdapter();