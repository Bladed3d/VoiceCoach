/**
 * VoiceCoach V2 - Base Document Worker
 * Modular worker thread for document analysis
 * LED Range: 4200-4299 for worker operations
 */
const { parentPort, workerData } = require('worker_threads');
const { BreadcrumbTrail } = require('../lib/breadcrumb-system');

class BaseDocumentWorker {
  constructor(workerName = 'BaseWorker') {
    this.trail = new BreadcrumbTrail(workerName);
    this.workerName = workerName;
    this.document = null;
    this.documentName = null;
    this.techniques = [];
    this.stageBridges = new Map();
    this.responsePatterns = {};
    this.isReady = false;
    
    // LED 4200: Worker initialization
    this.trail.light(4200, {
      operation: 'worker_initialized',
      workerName: this.workerName,
      timestamp: Date.now()
    });
    
    this.setupMessageHandlers();
  }
  
  /**
   * Setup IPC message handlers
   */
  setupMessageHandlers() {
    if (!parentPort) {
      console.error('Worker not running in worker thread context');
      return;
    }
    
    parentPort.on('message', async (message) => {
      const { action, payload, messageId } = message;
      
      // LED 4201: Message received
      this.trail.light(4201, {
        operation: 'message_received',
        action,
        messageId,
        hasPayload: !!payload
      });
      
      try {
        let result;
        
        switch (action) {
          case 'load':
            result = await this.loadDocument(payload.documentPath);
            break;
            
          case 'analyze':
            result = await this.analyzeTranscript(payload.transcript, payload.context);
            break;
            
          case 'search':
            result = await this.searchTechniques(payload.query);
            break;
            
          case 'getStatus':
            result = this.getStatus();
            break;
            
          case 'shutdown':
            result = await this.shutdown();
            break;
            
          default:
            throw new Error(`Unknown action: ${action}`);
        }
        
        // LED 4202: Successful response
        this.trail.light(4202, {
          operation: 'response_sent',
          action,
          messageId,
          success: true
        });
        
        parentPort.postMessage({
          messageId,
          success: true,
          result
        });
        
      } catch (error) {
        // LED 8200: Worker error
        this.trail.fail(8200, error);
        
        parentPort.postMessage({
          messageId,
          success: false,
          error: error.message
        });
      }
    });
  }
  
  /**
   * Load document into memory
   * LED Range: 4210-4219
   */
  async loadDocument(documentPath) {
    try {
      this.trail.light(4210, {
        operation: 'document_load_start',
        documentPath,
        timestamp: Date.now()
      });
      
      // Load document content (will be passed from main thread)
      const fs = require('fs');
      const path = require('path');
      
      // Resolve path relative to project root
      const fullPath = path.join(process.cwd(), documentPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      this.document = JSON.parse(content);
      
      // Extract document name
      this.documentName = path.basename(documentPath, '.json');
      
      // Process document structure
      this.processDocumentStructure();
      
      this.isReady = true;
      
      this.trail.light(4211, {
        operation: 'document_loaded',
        documentName: this.documentName,
        techniqueCount: this.techniques.length,
        stageCount: this.stageBridges.size
      });
      
      return {
        loaded: true,
        documentName: this.documentName,
        stats: {
          techniques: this.techniques.length,
          stages: this.stageBridges.size,
          patterns: Object.keys(this.responsePatterns).length
        }
      };
      
    } catch (error) {
      this.trail.fail(8210, error);
      throw error;
    }
  }
  
  /**
   * Process document structure for fast access
   * LED Range: 4212-4214
   */
  processDocumentStructure() {
    this.trail.light(4212, {
      operation: 'processing_document_structure',
      hasStages: !!this.document.stages,
      hasTechniques: !!this.document.techniques || !!this.document.predictive_techniques
    });
    
    // Extract stages and bridges
    if (this.document.stages) {
      Object.entries(this.document.stages).forEach(([stageName, stageData]) => {
        if (stageData.bridges && Array.isArray(stageData.bridges)) {
          this.stageBridges.set(stageName, stageData.bridges);
        }
      });
    }
    
    // Extract techniques
    this.techniques = this.document.techniques || 
                     this.document.predictive_techniques || 
                     [];
    
    // Extract response patterns
    this.responsePatterns = this.document.response_patterns || 
                           this.document.frameworks || 
                           {};
    
    this.trail.light(4213, {
      operation: 'document_structure_processed',
      stagesExtracted: this.stageBridges.size,
      techniquesExtracted: this.techniques.length,
      patternsExtracted: Object.keys(this.responsePatterns).length
    });
  }
  
  /**
   * Analyze transcript and find best coaching response
   * LED Range: 4220-4229
   */
  async analyzeTranscript(transcript, context = {}) {
    if (!this.isReady) {
      throw new Error('Document not loaded');
    }
    
    const startTime = Date.now();
    
    this.trail.light(4220, {
      operation: 'transcript_analysis_start',
      transcriptLength: transcript.length,
      currentStage: context.currentStage,
      documentName: this.documentName
    });
    
    // Detect stage and context
    const stage = context.currentStage || this.detectStage(transcript);
    const topics = this.detectTopics(transcript);
    const objections = this.detectObjections(transcript);
    
    // Find relevant techniques
    const relevantTechniques = this.findRelevantTechniques(transcript, stage);
    
    // Get stage-specific bridges
    const stageBridges = this.stageBridges.get(stage) || [];
    
    // Score and rank all options
    const scoredOptions = this.scoreOptions({
      techniques: relevantTechniques,
      bridges: stageBridges,
      transcript,
      stage,
      topics,
      objections
    });
    
    // Select best response
    const bestResponse = scoredOptions[0] || null;
    
    const analysisTime = Date.now() - startTime;
    
    this.trail.light(4221, {
      operation: 'transcript_analysis_complete',
      analysisTime,
      stage,
      topicsFound: topics.length,
      objectionsFound: objections.length,
      optionsScored: scoredOptions.length,
      bestScore: bestResponse?.score || 0
    });
    
    return {
      response: bestResponse,
      metadata: {
        stage,
        topics,
        objections,
        documentSource: this.documentName,
        analysisTime,
        alternativeCount: scoredOptions.length - 1
      }
    };
  }
  
  /**
   * Detect sales stage from transcript
   */
  detectStage(transcript) {
    const lower = transcript.toLowerCase();
    
    if (lower.includes('how are you') || lower.includes('nice to meet')) {
      return 'opening';
    }
    if (lower.includes('tell me about') || lower.includes('what brings you')) {
      return 'discovery';
    }
    if (lower.includes('how it works') || lower.includes('features')) {
      return 'presentation';
    }
    if (lower.includes('expensive') || lower.includes('not sure') || lower.includes('think about')) {
      return 'objection';
    }
    if (lower.includes('next steps') || lower.includes('get started')) {
      return 'closing';
    }
    
    return 'discovery'; // Default
  }
  
  /**
   * Detect topics in transcript
   */
  detectTopics(transcript) {
    const topics = [];
    const lower = transcript.toLowerCase();
    
    if (lower.includes('price') || lower.includes('cost')) topics.push('pricing');
    if (lower.includes('feature') || lower.includes('capability')) topics.push('features');
    if (lower.includes('support') || lower.includes('help')) topics.push('support');
    if (lower.includes('time') || lower.includes('how long')) topics.push('timeline');
    
    return topics;
  }
  
  /**
   * Detect objections in transcript
   */
  detectObjections(transcript) {
    const objections = [];
    const lower = transcript.toLowerCase();
    
    if (lower.includes('expensive') || lower.includes('cost too much')) objections.push('price');
    if (lower.includes('boss') || lower.includes('approval')) objections.push('authority');
    if (lower.includes('not sure') || lower.includes('hesitant')) objections.push('hesitation');
    if (lower.includes('competitor') || lower.includes('alternative')) objections.push('competition');
    
    return objections;
  }
  
  /**
   * Find relevant techniques based on transcript
   * LED Range: 4222-4223
   */
  findRelevantTechniques(transcript, stage) {
    this.trail.light(4222, {
      operation: 'finding_relevant_techniques',
      techniqueCount: this.techniques.length,
      stage
    });
    
    const relevant = [];
    const transcriptLower = transcript.toLowerCase();
    
    this.techniques.forEach(technique => {
      // Check conversation paths for matches
      const paths = technique.conversation_paths || technique.when_to_use || [];
      
      paths.forEach(path => {
        const trigger = (path.trigger || path.prospect_says || '').toLowerCase();
        
        // Simple keyword matching (will be enhanced with embeddings later)
        if (trigger && this.fuzzyMatch(transcriptLower, trigger)) {
          relevant.push({
            technique: technique.technique_name,
            trigger,
            response: path.immediate_response?.exact_words || 
                     path.salesperson_says || 
                     path.coach_prompt,
            confidence: this.calculateConfidence(transcriptLower, trigger),
            source: 'technique'
          });
        }
      });
    });
    
    this.trail.light(4223, {
      operation: 'relevant_techniques_found',
      count: relevant.length
    });
    
    return relevant;
  }
  
  /**
   * Simple fuzzy matching (will be enhanced later)
   */
  fuzzyMatch(text, pattern) {
    // Extract key words from pattern
    const keywords = pattern.split(/\s+/).filter(word => word.length > 3);
    
    // Check if any keywords appear in text
    return keywords.some(keyword => text.includes(keyword));
  }
  
  /**
   * Calculate confidence score for a match
   */
  calculateConfidence(transcript, trigger) {
    // Simple word overlap percentage (will be enhanced with embeddings)
    const transcriptWords = transcript.split(/\s+/);
    const triggerWords = trigger.split(/\s+/);
    
    const matches = triggerWords.filter(word => 
      transcriptWords.some(tWord => tWord.includes(word))
    );
    
    return matches.length / triggerWords.length;
  }
  
  /**
   * Score and rank all coaching options
   * LED Range: 4224-4225
   */
  scoreOptions({ techniques, bridges, transcript, stage, topics, objections }) {
    this.trail.light(4224, {
      operation: 'scoring_options',
      techniqueCount: techniques.length,
      bridgeCount: bridges.length
    });
    
    const allOptions = [];
    
    // Add techniques with scores
    techniques.forEach(tech => {
      allOptions.push({
        ...tech,
        score: tech.confidence * 0.8, // Base technique score
        type: 'technique'
      });
    });
    
    // Add bridges with scores
    bridges.forEach(bridge => {
      const priority = bridge.priority || 'STANDARD';
      const priorityScore = priority === 'CRITICAL' ? 1.0 : 
                          priority === 'HIGH' ? 0.8 : 0.6;
      
      allOptions.push({
        response: bridge.text || bridge.phrase,
        score: priorityScore * 0.9, // Bridges slightly preferred
        type: 'bridge',
        priority,
        source: 'stage_bridge'
      });
    });
    
    // Sort by score
    allOptions.sort((a, b) => b.score - a.score);
    
    this.trail.light(4225, {
      operation: 'options_scored',
      totalOptions: allOptions.length,
      topScore: allOptions[0]?.score || 0
    });
    
    return allOptions;
  }
  
  /**
   * Search techniques by query
   * LED Range: 4230-4231
   */
  async searchTechniques(query) {
    this.trail.light(4230, {
      operation: 'technique_search',
      query,
      documentName: this.documentName
    });
    
    const results = [];
    const queryLower = query.toLowerCase();
    
    this.techniques.forEach(technique => {
      const name = technique.technique_name || '';
      const description = technique.description || '';
      
      if (name.toLowerCase().includes(queryLower) || 
          description.toLowerCase().includes(queryLower)) {
        results.push({
          name: technique.technique_name,
          description: technique.description,
          examples: technique.conversation_paths?.slice(0, 3) || []
        });
      }
    });
    
    this.trail.light(4231, {
      operation: 'technique_search_complete',
      resultsFound: results.length
    });
    
    return results;
  }
  
  /**
   * Get worker status
   */
  getStatus() {
    return {
      ready: this.isReady,
      documentName: this.documentName,
      workerName: this.workerName,
      stats: {
        techniques: this.techniques.length,
        stages: this.stageBridges.size,
        patterns: Object.keys(this.responsePatterns).length
      }
    };
  }
  
  /**
   * Shutdown worker cleanly
   * LED Range: 4290-4291
   */
  async shutdown() {
    this.trail.light(4290, {
      operation: 'worker_shutdown_start',
      workerName: this.workerName
    });
    
    // Clear memory
    this.document = null;
    this.techniques = [];
    this.stageBridges.clear();
    this.responsePatterns = {};
    
    this.trail.light(4291, {
      operation: 'worker_shutdown_complete'
    });
    
    return { shutdown: true };
  }
}

module.exports = BaseDocumentWorker;