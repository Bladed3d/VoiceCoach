/**
 * VoiceCoach V2 - Worker Thread Manager
 * Orchestrates document workers for parallel processing
 * LED Range: 4250-4279 for manager operations
 */
const { Worker } = require('worker_threads');
const path = require('path');
const { BreadcrumbTrail } = require('../../lib/breadcrumb-system');
const EventEmitter = require('events');

class WorkerManager extends EventEmitter {
  constructor() {
    super();
    this.trail = new BreadcrumbTrail('WorkerManager');
    this.workers = new Map();
    this.messageIdCounter = 0;
    this.pendingMessages = new Map();
    this.mode = 'single'; // 'single', 'dual', 'multi'
    
    // LED 4250: Manager initialized
    this.trail.light(4250, {
      operation: 'worker_manager_initialized',
      timestamp: Date.now()
    });
  }
  
  /**
   * Load a single document (Phase 1 baseline)
   * LED Range: 4251-4253
   */
  async loadSingleDocument(documentPath, workerType = 'neversplit') {
    try {
      this.trail.light(4251, {
        operation: 'loading_single_document',
        documentPath,
        workerType
      });
      
      // Shutdown any existing workers
      await this.shutdownAllWorkers();
      
      // Create appropriate worker
      const worker = await this.createWorker(workerType, 'primary');
      
      // Load document into worker
      const result = await this.sendMessage(worker, 'load', {
        documentPath
      });
      
      this.mode = 'single';
      
      this.trail.light(4252, {
        operation: 'single_document_loaded',
        documentName: result.documentName,
        stats: result.stats
      });
      
      this.emit('documentLoaded', {
        mode: 'single',
        documents: [result.documentName]
      });
      
      return result;
      
    } catch (error) {
      this.trail.fail(8251, error);
      throw error;
    }
  }
  
  /**
   * Add second document for parallel processing (Phase 2)
   * LED Range: 4254-4256
   */
  async addSecondDocument(documentPath, workerType = 'base') {
    try {
      if (this.mode !== 'single') {
        throw new Error('Must be in single mode to add second document');
      }
      
      this.trail.light(4254, {
        operation: 'adding_second_document',
        documentPath,
        workerType
      });
      
      // Create second worker
      const worker = await this.createWorker(workerType, 'secondary');
      
      // Load document
      const result = await this.sendMessage(worker, 'load', {
        documentPath
      });
      
      this.mode = 'dual';
      
      this.trail.light(4255, {
        operation: 'second_document_added',
        documentName: result.documentName,
        stats: result.stats,
        totalWorkers: this.workers.size
      });
      
      this.emit('documentLoaded', {
        mode: 'dual',
        documents: this.getLoadedDocuments()
      });
      
      return result;
      
    } catch (error) {
      this.trail.fail(8254, error);
      throw error;
    }
  }
  
  /**
   * Add third document to existing worker (Phase 3)
   * LED Range: 4257-4259
   */
  async addThirdDocument(documentPath) {
    try {
      if (this.mode !== 'dual') {
        throw new Error('Must be in dual mode to add third document');
      }
      
      this.trail.light(4257, {
        operation: 'adding_third_document',
        documentPath
      });
      
      // Add to secondary worker (merge strategy)
      const secondaryWorker = this.workers.get('secondary');
      if (!secondaryWorker) {
        throw new Error('Secondary worker not found');
      }
      
      // For now, we'll create a third worker
      // Later we can optimize by merging into secondary
      const worker = await this.createWorker('base', 'tertiary');
      
      const result = await this.sendMessage(worker, 'load', {
        documentPath
      });
      
      this.mode = 'multi';
      
      this.trail.light(4258, {
        operation: 'third_document_added',
        documentName: result.documentName,
        totalWorkers: this.workers.size
      });
      
      return result;
      
    } catch (error) {
      this.trail.fail(8257, error);
      throw error;
    }
  }
  
  /**
   * Create a worker thread
   * LED Range: 4260-4261
   */
  async createWorker(workerType, workerId) {
    this.trail.light(4260, {
      operation: 'creating_worker',
      workerType,
      workerId
    });
    
    // Determine worker script path
    const workerScript = workerType === 'neversplit' 
      ? 'neversplit-worker.js'
      : 'base-document-worker.js';
    
    const workerPath = path.join(__dirname, '..', '..', 'workers', workerScript);
    
    // Create worker
    const worker = new Worker(workerPath);
    
    // Setup message handling
    worker.on('message', (message) => {
      this.handleWorkerMessage(workerId, message);
    });
    
    worker.on('error', (error) => {
      this.trail.fail(8260, error);
      this.emit('workerError', { workerId, error });
    });
    
    worker.on('exit', (code) => {
      if (code !== 0) {
        this.trail.fail(8261, new Error(`Worker ${workerId} exited with code ${code}`));
      }
      this.workers.delete(workerId);
    });
    
    // Store worker
    this.workers.set(workerId, {
      worker,
      type: workerType,
      id: workerId,
      ready: false
    });
    
    this.trail.light(4261, {
      operation: 'worker_created',
      workerId,
      workerType
    });
    
    return worker;
  }
  
  /**
   * Send message to worker and await response
   * LED Range: 4262-4263
   */
  async sendMessage(worker, action, payload) {
    const messageId = ++this.messageIdCounter;
    
    this.trail.light(4262, {
      operation: 'sending_message_to_worker',
      action,
      messageId
    });
    
    return new Promise((resolve, reject) => {
      // Store promise handlers
      this.pendingMessages.set(messageId, { resolve, reject });
      
      // Send message
      worker.postMessage({
        action,
        payload,
        messageId
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingMessages.has(messageId)) {
          this.pendingMessages.delete(messageId);
          reject(new Error(`Worker message timeout: ${action}`));
        }
      }, 30000);
    });
  }
  
  /**
   * Handle message from worker
   */
  handleWorkerMessage(workerId, message) {
    const { messageId, success, result, error } = message;
    
    this.trail.light(4263, {
      operation: 'worker_message_received',
      workerId,
      messageId,
      success
    });
    
    // Resolve pending message
    const pending = this.pendingMessages.get(messageId);
    if (pending) {
      this.pendingMessages.delete(messageId);
      if (success) {
        pending.resolve(result);
      } else {
        pending.reject(new Error(error));
      }
    }
  }
  
  /**
   * Analyze transcript using current mode
   * LED Range: 4270-4275
   */
  async analyzeTranscript(transcript, context = {}) {
    const startTime = Date.now();
    
    this.trail.light(4270, {
      operation: 'analyze_transcript_start',
      mode: this.mode,
      transcriptLength: transcript.length,
      workerCount: this.workers.size
    });
    
    try {
      switch (this.mode) {
        case 'single':
          return await this.analyzeSingle(transcript, context);
          
        case 'dual':
          return await this.analyzeDual(transcript, context);
          
        case 'multi':
          return await this.analyzeMulti(transcript, context);
          
        default:
          throw new Error(`Unknown mode: ${this.mode}`);
      }
    } finally {
      const analysisTime = Date.now() - startTime;
      
      this.trail.light(4271, {
        operation: 'analyze_transcript_complete',
        analysisTime,
        mode: this.mode
      });
    }
  }
  
  /**
   * Single document analysis
   * LED: 4272
   */
  async analyzeSingle(transcript, context) {
    this.trail.light(4272, {
      operation: 'single_document_analysis'
    });
    
    const primaryWorker = this.workers.get('primary');
    if (!primaryWorker) {
      throw new Error('Primary worker not found');
    }
    
    return await this.sendMessage(primaryWorker.worker, 'analyze', {
      transcript,
      context
    });
  }
  
  /**
   * Dual document parallel analysis
   * LED: 4273
   */
  async analyzeDual(transcript, context) {
    this.trail.light(4273, {
      operation: 'dual_document_analysis'
    });
    
    const primaryWorker = this.workers.get('primary');
    const secondaryWorker = this.workers.get('secondary');
    
    if (!primaryWorker || !secondaryWorker) {
      throw new Error('Workers not ready for dual analysis');
    }
    
    // Analyze in parallel
    const [primaryResult, secondaryResult] = await Promise.all([
      this.sendMessage(primaryWorker.worker, 'analyze', { transcript, context }),
      this.sendMessage(secondaryWorker.worker, 'analyze', { transcript, context })
    ]);
    
    // Select best result
    return this.selectBestResult(primaryResult, secondaryResult);
  }
  
  /**
   * Multi-document analysis
   * LED: 4274
   */
  async analyzeMulti(transcript, context) {
    this.trail.light(4274, {
      operation: 'multi_document_analysis',
      workerCount: this.workers.size
    });
    
    // Get all workers
    const workerPromises = [];
    
    for (const [id, workerInfo] of this.workers) {
      workerPromises.push(
        this.sendMessage(workerInfo.worker, 'analyze', { transcript, context })
          .then(result => ({ ...result, workerId: id }))
      );
    }
    
    // Wait for all results
    const results = await Promise.all(workerPromises);
    
    // Merge and select best
    return this.mergeResults(results);
  }
  
  /**
   * Select best result from multiple workers
   * LED: 4275
   */
  selectBestResult(...results) {
    this.trail.light(4275, {
      operation: 'selecting_best_result',
      resultCount: results.length
    });
    
    // Filter out null results
    const validResults = results.filter(r => r?.response);
    
    if (validResults.length === 0) {
      return null;
    }
    
    // Sort by score
    validResults.sort((a, b) => {
      const scoreA = a.response?.score || 0;
      const scoreB = b.response?.score || 0;
      return scoreB - scoreA;
    });
    
    // Return best with metadata about alternatives
    const best = validResults[0];
    best.metadata = {
      ...best.metadata,
      alternativeResults: validResults.slice(1).map(r => ({
        source: r.metadata?.documentSource,
        score: r.response?.score || 0,
        technique: r.response?.technique
      }))
    };
    
    return best;
  }
  
  /**
   * Merge results from multiple workers
   * LED: 4276
   */
  mergeResults(results) {
    this.trail.light(4276, {
      operation: 'merging_results',
      resultCount: results.length
    });
    
    // Collect all options from all workers
    const allOptions = [];
    
    results.forEach(result => {
      if (result?.response) {
        allOptions.push({
          ...result.response,
          source: result.workerId,
          documentSource: result.metadata?.documentSource
        });
      }
    });
    
    // Sort by score
    allOptions.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    // Build merged result
    return {
      response: allOptions[0] || null,
      metadata: {
        mode: 'multi',
        sourcesConsulted: results.length,
        topOptions: allOptions.slice(0, 5),
        analysisTime: Math.max(...results.map(r => r.metadata?.analysisTime || 0))
      }
    };
  }
  
  /**
   * Get status of all workers
   * LED: 4277
   */
  async getStatus() {
    this.trail.light(4277, {
      operation: 'getting_worker_status'
    });
    
    const statuses = {};
    
    for (const [id, workerInfo] of this.workers) {
      try {
        const status = await this.sendMessage(workerInfo.worker, 'getStatus', {});
        statuses[id] = status;
      } catch (error) {
        statuses[id] = { error: error.message };
      }
    }
    
    return {
      mode: this.mode,
      workerCount: this.workers.size,
      workers: statuses
    };
  }
  
  /**
   * Get loaded document names
   */
  getLoadedDocuments() {
    const documents = [];
    
    for (const [id, workerInfo] of this.workers) {
      if (workerInfo.documentName) {
        documents.push(workerInfo.documentName);
      }
    }
    
    return documents;
  }
  
  /**
   * Shutdown all workers
   * LED Range: 4278-4279
   */
  async shutdownAllWorkers() {
    this.trail.light(4278, {
      operation: 'shutting_down_all_workers',
      workerCount: this.workers.size
    });
    
    const shutdownPromises = [];
    
    for (const [id, workerInfo] of this.workers) {
      shutdownPromises.push(
        this.sendMessage(workerInfo.worker, 'shutdown', {})
          .then(() => workerInfo.worker.terminate())
          .catch(err => console.error(`Error shutting down worker ${id}:`, err))
      );
    }
    
    await Promise.all(shutdownPromises);
    
    this.workers.clear();
    this.mode = 'single';
    
    this.trail.light(4279, {
      operation: 'all_workers_shutdown'
    });
  }
}

module.exports = WorkerManager;