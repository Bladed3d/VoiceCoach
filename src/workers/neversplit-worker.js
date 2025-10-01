/**
 * VoiceCoach V2 - NeverSplit Document Worker
 * Specialized worker for Chris Voss Never Split the Difference techniques
 * LED Range: 4240-4249 for NeverSplit-specific operations
 */
const { parentPort } = require('worker_threads');
const BaseDocumentWorker = require('./base-document-worker');

class NeverSplitWorker extends BaseDocumentWorker {
  constructor() {
    super('NeverSplitWorker');
    
    // NeverSplit-specific configurations
    this.mirroringPatterns = new Map();
    this.labelingTemplates = [];
    this.calibratedQuestions = [];
    
    // LED 4240: NeverSplit worker initialized
    this.trail.light(4240, {
      operation: 'neversplit_worker_initialized',
      timestamp: Date.now()
    });
  }
  
  /**
   * Override to add NeverSplit-specific processing
   */
  processDocumentStructure() {
    super.processDocumentStructure();
    
    this.trail.light(4241, {
      operation: 'processing_neversplit_specifics'
    });
    
    // Extract techniques from stages (since the structure doesn't have universal.mirroring etc)
    if (this.document.stages) {
      Object.values(this.document.stages).forEach(stage => {
        // Extract from bridges
        if (stage.bridges && Array.isArray(stage.bridges)) {
          stage.bridges.forEach(bridge => {
            if (bridge.technique === 'mirroring') {
              this.mirroringPatterns.set(bridge.phrase, bridge);
            }
            if (bridge.technique === 'labeling') {
              this.labelingTemplates.push(bridge);
            }
            if (bridge.technique === 'calibrated_questions') {
              this.calibratedQuestions.push(bridge);
            }
          });
        }
        
        // Extract from recovery
        if (stage.recovery && Array.isArray(stage.recovery)) {
          stage.recovery.forEach(recovery => {
            if (recovery.technique === 'labeling') {
              this.labelingTemplates.push(recovery);
            }
            if (recovery.technique === 'calibrated_questions') {
              this.calibratedQuestions.push(recovery);
            }
          });
        }
      });
    }
    
    // Also check universal section for emotional_calibration
    if (this.document.universal?.emotional_calibration) {
      Object.values(this.document.universal.emotional_calibration).forEach(emotion => {
        if (emotion.technique?.includes('labeling')) {
          this.labelingTemplates.push(emotion);
        }
        if (emotion.technique?.includes('calibrated_questions')) {
          this.calibratedQuestions.push(emotion);
        }
      });
    }
    
    this.trail.light(4242, {
      operation: 'neversplit_specifics_processed',
      mirroringPatterns: this.mirroringPatterns.size,
      labelingTemplates: this.labelingTemplates.length,
      calibratedQuestions: this.calibratedQuestions.length
    });
  }
  
  /**
   * Enhanced NeverSplit-specific transcript analysis
   */
  async analyzeTranscript(transcript, context = {}) {
    // Get base analysis
    const baseResult = await super.analyzeTranscript(transcript, context);
    
    this.trail.light(4243, {
      operation: 'neversplit_enhanced_analysis_start'
    });
    
    // Check for mirroring opportunities
    const mirroringOption = this.checkMirroringOpportunity(transcript);
    
    // Check for labeling opportunities
    const labelingOption = this.checkLabelingOpportunity(transcript);
    
    // Check for calibrated question opportunities
    const calibratedOption = this.checkCalibratedQuestionOpportunity(transcript, context);
    
    // Debug logging
    if (process.env.DEBUG_LED) {
      console.log('NeverSplit Options:', {
        mirroring: !!mirroringOption,
        labeling: !!labelingOption,
        calibrated: !!calibratedOption
      });
    }
    
    // Merge NeverSplit-specific options with base results
    const enhancedOptions = [];
    
    if (mirroringOption) {
      enhancedOptions.push({
        ...mirroringOption,
        score: mirroringOption.confidence * 0.95, // High priority for mirroring
        technique: 'Mirroring',
        source: 'neversplit_specific'
      });
    }
    
    if (labelingOption) {
      enhancedOptions.push({
        ...labelingOption,
        score: labelingOption.confidence * 0.9,
        technique: 'Labeling',
        source: 'neversplit_specific'
      });
    }
    
    if (calibratedOption) {
      enhancedOptions.push({
        ...calibratedOption,
        score: calibratedOption.confidence * 0.85,
        technique: 'Calibrated Question',
        source: 'neversplit_specific'
      });
    }
    
    // Combine and re-sort all options
    const allOptions = [...enhancedOptions];
    if (baseResult.response) {
      allOptions.push(baseResult.response);
    }
    
    allOptions.sort((a, b) => b.score - a.score);
    
    this.trail.light(4244, {
      operation: 'neversplit_enhanced_analysis_complete',
      enhancedOptionsAdded: enhancedOptions.length,
      topTechnique: allOptions[0]?.technique
    });
    
    return {
      ...baseResult,
      response: allOptions[0] || baseResult.response,
      metadata: {
        ...baseResult.metadata,
        neverSplitEnhanced: true,
        techniquesConsidered: {
          mirroring: !!mirroringOption,
          labeling: !!labelingOption,
          calibratedQuestion: !!calibratedOption
        }
      }
    };
  }
  
  /**
   * Check for mirroring opportunity
   * LED: 4245
   */
  checkMirroringOpportunity(transcript) {
    this.trail.light(4245, {
      operation: 'checking_mirroring_opportunity'
    });
    
    // Extract last meaningful statement
    const sentences = transcript.split(/[.!?]/).filter(s => s.trim().length > 10);
    if (sentences.length === 0) return null;
    
    const lastStatement = sentences[sentences.length - 1].trim();
    
    // Check for emotional or important words to mirror
    const keywords = this.extractKeywords(lastStatement);
    if (keywords.length === 0) return null;
    
    // Find the most impactful word/phrase to mirror
    const mirrorTarget = keywords[0]; // Will be enhanced with better selection
    
    return {
      response: `${mirrorTarget}?`,
      confidence: 0.8,
      explanation: 'Mirror the key word to encourage elaboration',
      trigger: lastStatement
    };
  }
  
  /**
   * Check for labeling opportunity
   * LED: 4246
   */
  checkLabelingOpportunity(transcript) {
    this.trail.light(4246, {
      operation: 'checking_labeling_opportunity',
      templatesAvailable: this.labelingTemplates.length
    });
    
    const lower = transcript.toLowerCase();
    
    // First, check our extracted labeling templates for matches
    if (this.labelingTemplates.length > 0) {
      for (const template of this.labelingTemplates) {
        // Check if the situation matches
        if (template.situation) {
          const situationWords = template.situation.toLowerCase().split(/\s+/);
          const matchCount = situationWords.filter(word => 
            word.length > 3 && lower.includes(word)
          ).length;
          
          if (matchCount >= 2 || (matchCount === 1 && situationWords.length <= 3)) {
            return {
              response: template.phrase,
              confidence: 0.85,
              explanation: 'NeverSplit labeling technique',
              trigger: template.situation,
              priority: template.priority || 'HIGH'
            };
          }
        }
      }
    }
    
    // Fallback: Detect emotions or concerns to label
    const emotionIndicators = {
      'expensive': 'It sounds like you\'re concerned about the price',
      'worried': 'It sounds like you\'re concerned about',
      'frustrated': 'It seems like you\'re frustrated with',
      'confused': 'It sounds like this is confusing',
      'difficult': 'It seems like this is challenging for you',
      'hesitant': 'It sounds like you have some reservations',
      'unsure': 'It seems like you\'re uncertain'
    };
    
    for (const [indicator, label] of Object.entries(emotionIndicators)) {
      if (lower.includes(indicator)) {
        return {
          response: label,
          confidence: 0.75,
          explanation: 'Label their emotion to show understanding',
          trigger: indicator
        };
      }
    }
    
    // Check for situation labeling
    if (lower.includes('problem') || lower.includes('issue')) {
      return {
        response: 'It sounds like you\'re dealing with a challenging situation',
        confidence: 0.7,
        explanation: 'Acknowledge their situation',
        trigger: 'problem/issue mentioned'
      };
    }
    
    return null;
  }
  
  /**
   * Check for calibrated question opportunity
   * LED: 4247
   */
  checkCalibratedQuestionOpportunity(transcript, context) {
    this.trail.light(4247, {
      operation: 'checking_calibrated_question_opportunity',
      stage: context.currentStage
    });
    
    const lower = transcript.toLowerCase();
    
    // Stage-specific calibrated questions
    const stageQuestions = {
      discovery: [
        'What\'s the biggest challenge you face?',
        'How does this problem affect your business?',
        'What happens if nothing changes?'
      ],
      objection: [
        'What about this doesn\'t work for you?',
        'How can we solve this problem together?',
        'What would need to change for this to work?'
      ],
      closing: [
        'What are the next steps from your perspective?',
        'How do you want to move forward?',
        'What would make this a win for you?'
      ]
    };
    
    const questions = stageQuestions[context.currentStage || 'discovery'] || [];
    
    // Check if situation calls for a calibrated question
    if (lower.includes('but') || lower.includes('however') || lower.includes('problem')) {
      return {
        response: questions[0] || 'How do you see this situation?',
        confidence: 0.7,
        explanation: 'Use calibrated question to gather information',
        trigger: 'objection or problem detected'
      };
    }
    
    return null;
  }
  
  /**
   * Extract keywords for mirroring
   */
  extractKeywords(text) {
    // Remove common words
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was', 'were', 'been', 'be'];
    
    const words = text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word));
    
    // Prioritize emotional or important words
    const importantWords = words.filter(word => 
      word.includes('concern') ||
      word.includes('worry') ||
      word.includes('important') ||
      word.includes('critical') ||
      word.includes('expensive') ||
      word.includes('difficult')
    );
    
    return importantWords.length > 0 ? importantWords : words.slice(-3);
  }
}

// Create and start the worker
const worker = new NeverSplitWorker();

// LED 4249: Worker ready
worker.trail.light(4249, {
  operation: 'neversplit_worker_ready',
  timestamp: Date.now()
});

module.exports = NeverSplitWorker;