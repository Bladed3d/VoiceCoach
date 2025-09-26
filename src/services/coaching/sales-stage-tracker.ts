/**
 * VoiceCoach V2 - Sales Stage Tracker
 * Tracks conversation progression through sales stages based on keyword analysis
 * Maps to golf coaching script stages for contextual tool selection
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

export type SalesStage =
  | 'rapport'           // Building trust and connection (0-15%)
  | 'discovery'         // Understanding needs and challenges (15-40%)
  | 'solution'          // Presenting solution and benefits (40-70%)
  | 'objection_handling'// Addressing concerns and resistance (can happen anywhere)
  | 'closing'           // Confirming commitment and next steps (70-100%)
  | 'unknown';          // Cannot determine current stage

export interface StageDetectionResult {
  currentStage: SalesStage;
  confidence: number;          // 0-100% confidence in detection
  indicators: string[];       // What triggered this stage detection
  progression: number;        // 0-100% through overall sales process
  suggestedActions: string[]; // What should happen in this stage
}

export interface StageHistory {
  stage: SalesStage;
  timestamp: number;
  duration: number;           // Time spent in this stage (ms)
  indicators: string[];
}

export class SalesStageTracker {
  private trail: BreadcrumbTrail;
  private currentStage: SalesStage = 'unknown';
  private stageHistory: StageHistory[] = [];
  private conversationStartTime: number = Date.now();
  private lastStageChange: number = Date.now();

  // Stage detection patterns based on golf coaching script
  private stageMarkers = {
    rapport: {
      keywords: [
        // Introductory phrases
        'thanks for taking the time', 'thanks for chatting',
        'tell me about yourself', 'tell me about your',
        'how long have you', 'what got you into',
        'i\'m [name]', 'my role here is',
        // Golf-specific rapport
        'tell me about your golf game', 'how\'s your golf',
        'what\'s your handicap', 'where do you play'
      ],
      userPhrases: [
        'let me introduce', 'i\'m here to listen',
        'my expertise', 'my role is to',
        'tell me about'
      ],
      weight: 1.0
    },

    discovery: {
      keywords: [
        // Problem discovery
        'biggest challenge', 'what\'s frustrating',
        'current solution', 'tried before',
        'not working', 'having trouble',
        'wish you could', 'if you could change',
        // Golf-specific discovery
        'short game', 'putting problems', 'inconsistent',
        'worst score', 'friends joke', 'tired of'
      ],
      userPhrases: [
        'what specifically', 'tell me more about',
        'how does that make you feel', 'what would ideal'
      ],
      weight: 1.2
    },

    solution: {
      keywords: [
        // Solution presentation
        'our solution', 'this can help', 'we offer',
        'designed to', 'benefit is', 'advantage of',
        'other clients', 'results show',
        // Golf-specific solution
        'professional coaching', 'video analysis',
        'tiger woods level', 'world-renowned pro'
      ],
      userPhrases: [
        'let me show you', 'our program', 'this solution',
        'we help clients', 'for $', 'investment'
      ],
      weight: 1.3
    },

    objection_handling: {
      keywords: [
        // Common objections
        'expensive', 'too much', 'can\'t afford',
        'need to think', 'talk to my wife', 'discuss with team',
        'not sure', 'maybe', 'concerned about',
        'what if', 'but', 'however'
      ],
      userPhrases: [
        'i understand', 'that\'s a valid concern',
        'other clients felt', 'let me address'
      ],
      weight: 1.5  // Higher weight as objections are critical
    },

    closing: {
      keywords: [
        // Closing signals
        'next steps', 'get started', 'move forward',
        'when can we', 'how do we', 'ready to',
        'sounds good', 'let\'s do it', 'sign me up',
        'make sense', 'perfect fit'
      ],
      userPhrases: [
        'shall we get started', 'ready to move forward',
        'next step is', 'schedule you', 'enrollment'
      ],
      weight: 1.4
    }
  };

  constructor() {
    this.trail = new BreadcrumbTrail('SalesStageTracker');
    this.trail.light(9000, {
      operation: 'sales_stage_tracker_initialized',
      timestamp: Date.now()
    });
  }

  /**
   * Analyze conversation to detect current sales stage
   */
  analyzeConversation(conversationHistory: Array<{speaker: string, text: string, timestamp: string}>): StageDetectionResult {
    this.trail.light(9001, {
      operation: 'stage_analysis_start',
      conversationLength: conversationHistory.length
    });

    // Get recent conversation for analysis (last 10 entries or 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recentConversation = conversationHistory
      .filter(entry => new Date(entry.timestamp).getTime() > fiveMinutesAgo)
      .slice(-10);

    const stageScores = this.calculateStageScores(recentConversation);
    const detectedStage = this.selectStageFromScores(stageScores);
    const confidence = this.calculateConfidence(stageScores, detectedStage);
    const progression = this.calculateProgression(detectedStage, conversationHistory);

    // Update stage if it changed
    if (detectedStage !== this.currentStage) {
      this.updateStageHistory(detectedStage);
    }

    const result: StageDetectionResult = {
      currentStage: detectedStage,
      confidence,
      indicators: stageScores[detectedStage]?.indicators || [],
      progression,
      suggestedActions: this.getSuggestedActions(detectedStage, progression)
    };

    this.trail.light(9002, {
      operation: 'stage_analysis_complete',
      stage: detectedStage,
      confidence,
      progression
    });

    return result;
  }

  /**
   * Calculate score for each stage based on keyword presence
   */
  private calculateStageScores(conversation: Array<{speaker: string, text: string}>) {
    const scores: Record<SalesStage, {score: number, indicators: string[]}> = {
      rapport: { score: 0, indicators: [] },
      discovery: { score: 0, indicators: [] },
      solution: { score: 0, indicators: [] },
      objection_handling: { score: 0, indicators: [] },
      closing: { score: 0, indicators: [] },
      unknown: { score: 0, indicators: [] }
    };

    conversation.forEach(entry => {
      const text = entry.text.toLowerCase();
      const isUser = entry.speaker === 'user';

      Object.entries(this.stageMarkers).forEach(([stage, markers]) => {
        // Check appropriate keywords based on speaker
        const keywordsToCheck = isUser ? markers.userPhrases : markers.keywords;

        keywordsToCheck.forEach(keyword => {
          if (text.includes(keyword.toLowerCase())) {
            const stageKey = stage as SalesStage;
            scores[stageKey].score += markers.weight;
            scores[stageKey].indicators.push(`${isUser ? 'USER' : 'PROSPECT'}: "${keyword}"`);
          }
        });
      });
    });

    return scores;
  }

  /**
   * Select the stage with highest score
   */
  private selectStageFromScores(scores: Record<SalesStage, {score: number, indicators: string[]}>): SalesStage {
    let maxScore = 0;
    let selectedStage: SalesStage = 'unknown';

    Object.entries(scores).forEach(([stage, data]) => {
      if (data.score > maxScore && stage !== 'unknown') {
        maxScore = data.score;
        selectedStage = stage as SalesStage;
      }
    });

    return selectedStage;
  }

  /**
   * Calculate confidence in stage detection
   */
  private calculateConfidence(scores: Record<SalesStage, {score: number, indicators: string[]}>, selectedStage: SalesStage): number {
    const selectedScore = scores[selectedStage].score;
    const totalScore = Object.values(scores).reduce((sum, data) => sum + data.score, 0);

    if (totalScore === 0) return 0;

    const confidence = (selectedScore / totalScore) * 100;
    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Calculate progression through sales process (0-100%)
   */
  private calculateProgression(stage: SalesStage, conversationHistory: Array<{speaker: string, text: string}>): number {
    const stageProgression = {
      rapport: 10,
      discovery: 30,
      solution: 60,
      objection_handling: 50, // Can happen anywhere, doesn't indicate progression
      closing: 90,
      unknown: 0
    };

    // Base progression on stage
    let progression = stageProgression[stage];

    // Adjust based on conversation length (longer = more progress)
    const conversationLength = conversationHistory.length;
    if (conversationLength > 20) progression += 10;
    if (conversationLength > 50) progression += 10;

    // Adjust based on time spent (longer calls = more progress)
    const callDuration = (Date.now() - this.conversationStartTime) / (1000 * 60); // minutes
    if (callDuration > 15) progression += 5;
    if (callDuration > 30) progression += 10;

    return Math.min(100, Math.max(0, progression));
  }

  /**
   * Get suggested actions for current stage
   */
  private getSuggestedActions(stage: SalesStage, progression: number): string[] {
    const actions = {
      rapport: [
        'Build trust through mirroring and proactive validation',
        'Ask about their background and experience',
        'Share your expertise credibly',
        'Transition to discovery when rapport established'
      ],
      discovery: [
        'Use calibrated questions to understand needs',
        'Mirror their responses to get deeper insights',
        'Validate their frustrations emotionally',
        'Identify specific problems to solve'
      ],
      solution: [
        'Present solution aligned to discovered needs',
        'Use buy-in questions before explaining benefits',
        'Share relevant client success stories',
        'Address concerns proactively'
      ],
      objection_handling: [
        'Use accusation audit to address concerns',
        'Ask calibrated questions to understand objection',
        'Use emotional response validation',
        'Deploy take away if strong resistance'
      ],
      closing: [
        'Use "no means yes" to test commitment',
        'Apply DJ voice to calm emotions',
        'Get specific next steps confirmed',
        'Schedule follow-up immediately'
      ],
      unknown: [
        'Listen carefully to determine stage',
        'Ask clarifying questions',
        'Build rapport if early in conversation'
      ]
    };

    return actions[stage] || [];
  }

  /**
   * Update stage history when stage changes
   */
  private updateStageHistory(newStage: SalesStage): void {
    const now = Date.now();

    if (this.currentStage !== 'unknown') {
      // Record time spent in previous stage
      this.stageHistory.push({
        stage: this.currentStage,
        timestamp: this.lastStageChange,
        duration: now - this.lastStageChange,
        indicators: []
      });
    }

    this.currentStage = newStage;
    this.lastStageChange = now;

    this.trail.light(9003, {
      operation: 'stage_changed',
      previousStage: this.stageHistory[this.stageHistory.length - 1]?.stage || 'none',
      newStage,
      timestamp: now
    });
  }

  /**
   * Get current stage information
   */
  getCurrentStage(): SalesStage {
    return this.currentStage;
  }

  /**
   * Get complete stage history for this conversation
   */
  getStageHistory(): StageHistory[] {
    return [...this.stageHistory];
  }

  /**
   * Get time spent in current stage
   */
  getCurrentStageDuration(): number {
    return Date.now() - this.lastStageChange;
  }

  /**
   * Check if stage is appropriate for specific tools
   */
  isStageAppropriateForTool(toolName: string): boolean {
    const toolStageMapping = {
      // Early stage tools
      'Mirroring': ['rapport', 'discovery'],
      'Proactive Validation': ['rapport', 'discovery', 'objection_handling'],
      'Calibrated Questions': ['discovery', 'solution', 'objection_handling'],

      // Mid stage tools
      'Buy-In': ['solution', 'closing'],
      'Dynamic Silence': ['discovery', 'solution', 'objection_handling'],
      'Black Swan': ['discovery', 'solution'],

      // Late stage tools
      'No Means Yes': ['closing', 'objection_handling'],
      'Take Away': ['objection_handling', 'closing'],
      'DJ Voice': ['objection_handling', 'closing'],
      'Accusation Audit': ['solution', 'objection_handling']
    };

    const appropriateStages = toolStageMapping[toolName as keyof typeof toolStageMapping];
    return appropriateStages ? appropriateStages.includes(this.currentStage) : true;
  }

  /**
   * Reset tracker for new conversation
   */
  reset(): void {
    this.currentStage = 'unknown';
    this.stageHistory = [];
    this.conversationStartTime = Date.now();
    this.lastStageChange = Date.now();

    this.trail.light(9004, {
      operation: 'stage_tracker_reset',
      timestamp: Date.now()
    });
  }
}