/**
 * VoiceCoach V2 - Worker Manager Adapter (CommonJS version)
 * Node.js adapter for WorkerManager integration
 * LED Range: 4280-4289
 */
const { BreadcrumbTrail } = require('../../lib/breadcrumb-system.js');
const WorkerManager = require('./worker-manager.js');

class WorkerAdapter {
  constructor() {
    this.trail = new BreadcrumbTrail('WorkerAdapter');
    this.workerManager = new WorkerManager();
    this.isInitialized = false;
    this.currentDocuments = [];
    
    // LED 4280: Adapter initialization
    this.trail.light(4280, {
      operation: 'worker_adapter_initialized',
      timestamp: Date.now()
    });
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.workerManager.on('documentLoaded', (data) => {
      this.trail.light(4281, {
        operation: 'document_loaded_event',
        mode: data.mode,
        documents: data.documents
      });
      
      this.currentDocuments = data.documents;
    });
    
    this.workerManager.on('workerError', (data) => {
      this.trail.fail(8280, new Error(`Worker error: ${data.error.message}`));
    });
  }
  
  async initializeWithDocument(documentPath) {
    try {
      this.trail.light(4282, {
        operation: 'initializing_with_document',
        documentPath
      });
      
      const workerType = this.getWorkerType(documentPath);
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
      this.trail.fail(8282, error);
      return false;
    }
  }
  
  async addDocument(documentPath) {
    try {
      this.trail.light(4284, {
        operation: 'adding_document',
        documentPath,
        currentMode: this.workerManager.mode
      });
      
      const workerType = this.getWorkerType(documentPath);
      
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
      this.trail.fail(8284, error);
      return false;
    }
  }
  
  async analyzeTranscript(transcript, context = {}) {
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
      
      return result;
      
    } catch (error) {
      this.trail.fail(8286, error);
      return null;
    }
  }
  
  async searchTechniques(query) {
    try {
      this.trail.light(4288, {
        operation: 'searching_techniques',
        query,
        documentCount: this.currentDocuments.length
      });
      
      const searchPromises = [];
      
      for (const [id, workerInfo] of this.workerManager.workers) {
        searchPromises.push(
          this.workerManager.sendMessage(workerInfo.worker, 'search', { query })
            .then((results) => ({
              source: id,
              results
            }))
        );
      }
      
      const allResults = await Promise.all(searchPromises);
      const techniques = allResults.flatMap(r => 
        r.results.map((tech) => ({
          ...tech,
          source: r.source
        }))
      );
      
      return techniques;
      
    } catch (error) {
      this.trail.fail(8288, error);
      return [];
    }
  }
  
  async getStatus() {
    return await this.workerManager.getStatus();
  }
  
  getWorkerType(documentPath) {
    const lower = documentPath.toLowerCase();
    
    if (lower.includes('neversplit') || lower.includes('voss')) {
      return 'neversplit';
    }
    
    // Add more specialized workers as they're created
    // if (lower.includes('hormozi')) return 'hormozi';
    // if (lower.includes('sandler')) return 'sandler';
    
    return 'base';
  }
  
  getMode() {
    return this.workerManager.mode;
  }
  
  getLoadedDocuments() {
    return this.currentDocuments;
  }
  
  async shutdown() {
    this.trail.light(4289, {
      operation: 'shutting_down_adapter'
    });
    
    await this.workerManager.shutdownAllWorkers();
    this.isInitialized = false;
    this.currentDocuments = [];
  }
}

// Export singleton instance
const workerAdapter = new WorkerAdapter();
module.exports = { workerAdapter, WorkerAdapter };