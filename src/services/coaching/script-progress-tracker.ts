/**
 * VoiceCoach V2 - Script Progress Tracker
 * Analyzes conversation against sales script to detect current stage and adherence
 * Provides intelligent coaching based on script progress and deviations
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { SalesScript, ScriptStage, SalesScriptService } from './sales-script-service';

export interface ConversationEntry {
  speaker: 'user' | 'prospect';
  text: string;
  timestamp: string;
}

export interface StageDetectionResult {
  detectedStage: number;
  confidence: number;
  stageCompletion: number;
  evidence: string[];
  missedElements: string[];
  suggestedActions: string[];
  adherenceScore: number;
}

export interface ScriptDeviation {
  type: 'skipped_stage' | 'wrong_tool' | 'missed_transition' | 'off_script';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  suggestion: string;
  stage: number;
}

export class ScriptProgressTracker {
  private trail: BreadcrumbTrail;
  private scriptService: SalesScriptService;
  private conversationHistory: ConversationEntry[] = [];
  private lastDetectedStage: number = 1;
  private stageTransitionHistory: Array<{ stage: number; timestamp: number }> = [];

  constructor(scriptService: SalesScriptService) {
    this.trail = new BreadcrumbTrail('ScriptProgressTracker');
    this.scriptService = scriptService;

    this.trail.light(9500, {
      operation: 'script_progress_tracker_initialized',
      timestamp: Date.now()
    });
  }

  /**
   * Analyze conversation against current script to detect stage and progress
   */
  analyzeProgress(conversationHistory: ConversationEntry[]): StageDetectionResult {
    this.trail.light(9501, {
      operation: 'script_progress_analysis_start',
      conversationLength: conversationHistory.length
    });

    this.conversationHistory = conversationHistory;
    const currentScript = this.scriptService.getCurrentScript();

    if (!currentScript) {
      return this.createDefaultResult();
    }

    try {
      // Get recent user messages for analysis
      const userMessages = this.getUserMessages();
      const recentUserText = userMessages.slice(-3).map(msg => msg.text).join(' ').toLowerCase();

      // Detect current stage based on script markers
      const stageDetection = this.detectCurrentStage(currentScript, recentUserText);

      // Check for stage completion
      const completion = this.calculateStageCompletion(currentScript, stageDetection.stage, userMessages);

      // Identify missed elements and deviations
      const missedElements = this.identifyMissedElements(currentScript, stageDetection.stage, userMessages);

      // Generate suggested actions
      const suggestedActions = this.generateSuggestedActions(currentScript, stageDetection.stage, completion, missedElements);

      // Calculate adherence score
      const adherenceScore = this.calculateAdherenceScore(stageDetection.stage, completion, missedElements);

      const result: StageDetectionResult = {
        detectedStage: stageDetection.stage,
        confidence: stageDetection.confidence,
        stageCompletion: completion,
        evidence: stageDetection.evidence,
        missedElements,
        suggestedActions,
        adherenceScore
      };

      // Update tracking history
      this.updateTrackingHistory(stageDetection.stage);

      // Update script service progress
      this.scriptService.updateProgress(stageDetection.stage, completion, missedElements);

      this.trail.light(9502, {
        operation: 'script_progress_analysis_complete',
        detectedStage: stageDetection.stage,
        confidence: stageDetection.confidence,
        completion,
        adherenceScore
      });

      return result;

    } catch (error) {
      this.trail.fail(8501, error as Error);
      return this.createDefaultResult();
    }
  }

  /**
   * Detect current stage based on script detection phrases and conversation content
   */
  private detectCurrentStage(script: SalesScript, recentText: string): { stage: number; confidence: number; evidence: string[] } {
    let bestMatch = { stage: 1, confidence: 0, evidence: [] as string[] };

    // Check each stage for detection phrases
    for (const stage of script.stages) {
      let matches = 0;
      let evidence: string[] = [];

      // Check detection phrases
      for (const phrase of stage.detectionPhrases) {
        if (recentText.includes(phrase.toLowerCase())) {
          matches++;
          evidence.push(`Found: "${phrase}"`);
        }
      }

      // Check key phrases
      for (const phrase of stage.keyPhrases) {
        if (recentText.includes(phrase.toLowerCase())) {
          matches++;
          evidence.push(`Key phrase: "${phrase}"`);
        }
      }

      // Calculate confidence based on matches and stage progression logic
      const totalPhrases = stage.detectionPhrases.length + stage.keyPhrases.length;
      let confidence = totalPhrases > 0 ? (matches / totalPhrases) * 100 : 0;

      // Boost confidence for logical stage progression
      if (stage.number === this.lastDetectedStage + 1) {
        confidence *= 1.5; // 50% boost for next logical stage
      } else if (stage.number === this.lastDetectedStage) {
        confidence *= 1.2; // 20% boost for current stage
      } else if (stage.number < this.lastDetectedStage) {
        confidence *= 0.5; // Penalty for going backwards
      }

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          stage: stage.number,
          confidence: Math.min(100, confidence),
          evidence
        };
      }
    }

    // Fallback logic if no clear stage detected
    if (bestMatch.confidence < 30) {
      bestMatch = {
        stage: Math.min(this.lastDetectedStage + 1, script.stages.length),
        confidence: 20,
        evidence: ['Logical progression']
      };
    }

    return bestMatch;
  }

  /**
   * Calculate how complete the current stage is based on required elements
   */
  private calculateStageCompletion(script: SalesScript, stageNumber: number, userMessages: ConversationEntry[]): number {
    const stage = script.stages.find(s => s.number === stageNumber);
    if (!stage) return 0;

    const userText = userMessages.map(msg => msg.text).join(' ').toLowerCase();
    let completionElements = 0;
    let totalElements = 0;

    // Check for stage-specific completion markers
    switch (stage.name.toLowerCase()) {
      case 'rapport':
        totalElements = 4;
        if (userText.includes('tell me about') || userText.includes('your goals')) completionElements++;
        if (userText.includes('experience') || userText.includes('background')) completionElements++;
        if (userText.includes('we') && !userText.includes('i ')) completionElements++;
        if (userText.includes('align') || userText.includes('fit')) completionElements++;
        break;

      case 'problem intro':
        totalElements = 3;
        if (userText.includes('frustrated') || userText.includes('problem')) completionElements++;
        if (userText.includes('what brought you') || userText.includes('why')) completionElements++;
        if (userText.includes('mental') || userText.includes('emotional')) completionElements++;
        break;

      case 'solution intro':
        totalElements = 4;
        if (userText.includes('program') || userText.includes('package')) completionElements++;
        if (userText.includes('price') || userText.includes('cost') || userText.includes('$')) completionElements++;
        if (userText.includes('benefit') || userText.includes('help')) completionElements++;
        if (userText.includes('personalized') || userText.includes('tailored')) completionElements++;
        break;

      default:
        // Generic completion check based on key phrases
        totalElements = stage.keyPhrases.length;
        for (const phrase of stage.keyPhrases) {
          if (userText.includes(phrase.toLowerCase())) {
            completionElements++;
          }
        }
        break;
    }

    return totalElements > 0 ? Math.round((completionElements / totalElements) * 100) : 0;
  }

  /**
   * Identify elements that should have been covered but were missed
   */
  private identifyMissedElements(script: SalesScript, currentStage: number, userMessages: ConversationEntry[]): string[] {
    const missedElements: string[] = [];
    const userText = userMessages.map(msg => msg.text).join(' ').toLowerCase();

    // Check previous stages for missed elements
    for (let i = 1; i < currentStage; i++) {
      const stage = script.stages.find(s => s.number === i);
      if (!stage) continue;

      // Check for required elements based on stage rules
      const rules = stage.languageRules;

      if (rules.useWe && !userText.includes(' we ')) {
        missedElements.push(`Stage ${i}: Should use "WE" language`);
      }

      if (rules.buildTrust && !userText.includes('trust') && !userText.includes('experience')) {
        missedElements.push(`Stage ${i}: Should establish credibility`);
      }

      if (rules.focusOnPain && !userText.includes('frustrat') && !userText.includes('problem')) {
        missedElements.push(`Stage ${i}: Should focus on pain points`);
      }

      // Check for stage transitions
      if (stage.transition && !userText.includes(stage.transition.phrase.toLowerCase())) {
        missedElements.push(`Stage ${i}: Missed transition phrase`);
      }
    }

    // Check current stage for tool appropriateness
    const currentStageObj = script.stages.find(s => s.number === currentStage);
    if (currentStageObj) {
      const rules = currentStageObj.languageRules;

      if (rules.avoidPressure && (userText.includes('must') || userText.includes('need to'))) {
        missedElements.push(`Stage ${currentStage}: Avoid pressure language`);
      }

      if (rules.useWe && currentStage <= 4 && !userText.includes(' we ')) {
        missedElements.push(`Stage ${currentStage}: Use "WE" language in early stages`);
      }
    }

    return missedElements;
  }

  /**
   * Generate suggested actions based on current stage and progress
   */
  private generateSuggestedActions(script: SalesScript, currentStage: number, completion: number, missedElements: string[]): string[] {
    const suggestions: string[] = [];
    const stage = script.stages.find(s => s.number === currentStage);

    if (!stage) return suggestions;

    // Stage completion suggestions
    if (completion < 50) {
      suggestions.push(`Focus on ${stage.name}: ${stage.objective}`);
    }

    // Tool weight suggestions
    const toolWeights = stage.toolWeights;
    const topTools = Object.entries(toolWeights)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([tool]) => tool);

    if (topTools.length > 0) {
      suggestions.push(`Use ${topTools.join(' or ')} (${Math.round(toolWeights[topTools[0]] * 100)}% probability)`);
    }

    // Language rule suggestions
    const rules = stage.languageRules;
    if (rules.useWe) {
      suggestions.push('Use "WE" language to build alignment');
    }

    if (rules.avoidPressure) {
      suggestions.push('Avoid pressure - be consultative');
    }

    if (rules.beAssertive) {
      suggestions.push('Be more assertive - this is decision time');
    }

    // Transition suggestions
    if (completion > 70 && stage.transition) {
      suggestions.push(`Ready to transition: "${stage.transition.phrase}"`);
    }

    // Missed element corrections
    if (missedElements.length > 0) {
      suggestions.push(`Address: ${missedElements[0].split(': ')[1]}`);
    }

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }

  /**
   * Calculate adherence score based on script following
   */
  private calculateAdherenceScore(stage: number, completion: number, missedElements: string[]): number {
    let score = 100;

    // Penalty for low stage completion
    score -= (100 - completion) * 0.3;

    // Penalty for missed elements
    score -= missedElements.length * 10;

    // Penalty for stage progression issues
    const expectedStage = this.calculateExpectedStage();
    if (stage < expectedStage - 1) {
      score -= 20; // Behind expected progress
    } else if (stage > expectedStage + 1) {
      score -= 15; // Too far ahead
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Calculate expected stage based on conversation length and time
   */
  private calculateExpectedStage(): number {
    const messageCount = this.conversationHistory.length;

    // Rough heuristic: 10-15 messages per stage for typical conversation
    if (messageCount < 10) return 1;
    if (messageCount < 25) return 2;
    if (messageCount < 40) return 3;
    if (messageCount < 55) return 4;
    if (messageCount < 70) return 5;
    if (messageCount < 85) return 6;
    if (messageCount < 100) return 7;
    if (messageCount < 115) return 8;
    return 9;
  }

  /**
   * Get user messages from conversation history
   */
  private getUserMessages(): ConversationEntry[] {
    return this.conversationHistory.filter(msg => msg.speaker === 'user');
  }

  /**
   * Update tracking history
   */
  private updateTrackingHistory(stage: number): void {
    if (stage !== this.lastDetectedStage) {
      this.stageTransitionHistory.push({
        stage,
        timestamp: Date.now()
      });
      this.lastDetectedStage = stage;
    }
  }

  /**
   * Create default result when analysis fails
   */
  private createDefaultResult(): StageDetectionResult {
    return {
      detectedStage: this.lastDetectedStage,
      confidence: 0,
      stageCompletion: 0,
      evidence: ['Analysis failed - using last known stage'],
      missedElements: [],
      suggestedActions: ['Continue conversation naturally'],
      adherenceScore: 50
    };
  }

  /**
   * Detect script deviations and provide coaching
   */
  detectDeviations(): ScriptDeviation[] {
    const deviations: ScriptDeviation[] = [];
    const userMessages = this.getUserMessages();
    const recentText = userMessages.slice(-2).map(msg => msg.text).join(' ').toLowerCase();

    // Check for common deviations
    if (this.lastDetectedStage <= 4 && recentText.includes('take it or leave it')) {
      deviations.push({
        type: 'wrong_tool',
        severity: 'major',
        description: 'Using Take Away in early stage',
        suggestion: 'Use Mirroring or Calibrated Questions instead',
        stage: this.lastDetectedStage
      });
    }

    if (this.lastDetectedStage <= 3 && !recentText.includes(' we ')) {
      deviations.push({
        type: 'missed_transition',
        severity: 'moderate',
        description: 'Not using "WE" language in early stages',
        suggestion: 'Say "What can WE do..." instead of "What can I do..."',
        stage: this.lastDetectedStage
      });
    }

    if (this.lastDetectedStage >= 7 && recentText.includes(' we ') && recentText.includes('help you')) {
      deviations.push({
        type: 'wrong_tool',
        severity: 'minor',
        description: 'Too helpful in closing stages',
        suggestion: 'Be more assertive - "You need to decide..."',
        stage: this.lastDetectedStage
      });
    }

    return deviations;
  }

  /**
   * Reset tracker for new conversation
   */
  reset(): void {
    this.conversationHistory = [];
    this.lastDetectedStage = 1;
    this.stageTransitionHistory = [];

    this.trail.light(9503, {
      operation: 'script_progress_tracker_reset',
      timestamp: Date.now()
    });
  }

  /**
   * Get tracking statistics
   */
  getTrackingStats(): {
    currentStage: number;
    transitionCount: number;
    averageStageTime: number;
    progressVelocity: number;
  } {
    const transitionCount = this.stageTransitionHistory.length;
    const averageStageTime = transitionCount > 1
      ? (Date.now() - this.stageTransitionHistory[0].timestamp) / transitionCount
      : 0;

    const progressVelocity = this.conversationHistory.length > 0
      ? this.lastDetectedStage / this.conversationHistory.length
      : 0;

    return {
      currentStage: this.lastDetectedStage,
      transitionCount,
      averageStageTime,
      progressVelocity
    };
  }
}