/**
 * VoiceCoach V2 - MEFS Evidence Tracker
 * Tracks Mental, Emotional, Financial, Schedule alignment through evidence-based approach
 * Focus: M+E in early stages (0-70%), add F+S in late stages (70-100%)
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { SalesStage } from './sales-stage-tracker';

export type MEFSDimension = 'mental' | 'emotional' | 'financial' | 'schedule';

export interface MEFSEvidence {
  dimension: MEFSDimension;
  evidence: string;            // What was said that provides this evidence
  timestamp: number;
  confidence: number;          // 0-100% confidence in this evidence
  impact: 'positive' | 'negative' | 'neutral'; // Does this help or hurt alignment?
}

export interface MEFSScore {
  score: number;               // 0-100% alignment in this dimension
  evidence: MEFSEvidence[];    // All evidence contributing to this score
  gaps: string[];              // What information is still missing
  isActive: boolean;           // Should we focus on this dimension at current stage?
}

export interface MEFSState {
  mental: MEFSScore;
  emotional: MEFSScore;
  financial: MEFSScore;
  schedule: MEFSScore;
  overallAlignment: number;    // Weighted average of active dimensions
  primaryGap: MEFSDimension | null; // Dimension needing most attention
  recommendedFocus: MEFSDimension[];  // Which dimensions to focus on now
}

export class MEFSTracker {
  private trail: BreadcrumbTrail;
  private evidenceHistory: MEFSEvidence[] = [];
  private readonly maxEvidenceHistory = 50;

  // Stage-based dimension activation (based on your insights)
  private readonly stageActivation = {
    rapport: ['mental', 'emotional'],           // Focus on M+E only
    discovery: ['mental', 'emotional'],         // Still M+E focus
    solution: ['mental', 'emotional'],          // Still M+E primarily
    objection_handling: ['mental', 'emotional', 'financial', 'schedule'], // All dimensions
    closing: ['mental', 'emotional', 'financial', 'schedule'] // All dimensions critical
  };

  // Evidence detection patterns
  private readonly evidencePatterns = {
    mental: {
      positive: [
        'i understand', 'makes sense', 'i see', 'got it',
        'clear', 'that helps', 'explains', 'good point'
      ],
      negative: [
        'confused', 'don\'t understand', 'not clear', 'what do you mean',
        'how does that work', 'i don\'t get it', 'confusing'
      ],
      questions: [
        'how does', 'what happens', 'can you explain', 'tell me more',
        'what about', 'how would', 'what if'
      ]
    },

    emotional: {
      positive: [
        'excited', 'interested', 'sounds good', 'like it',
        'that\'s great', 'perfect', 'exactly', 'love it'
      ],
      negative: [
        'worried', 'concerned', 'nervous', 'scared',
        'not sure', 'hesitant', 'uncomfortable', 'skeptical'
      ],
      frustration: [
        'frustrated', 'tired of', 'fed up', 'hate',
        'annoying', 'ridiculous', 'stupid'
      ]
    },

    financial: {
      positive: [
        'worth it', 'good value', 'reasonable', 'fair price',
        'roi', 'save money', 'cost effective', 'budget approved'
      ],
      negative: [
        'expensive', 'too much', 'can\'t afford', 'over budget',
        'costs too much', 'price is high', 'out of range'
      ],
      mentions: [
        'budget', 'cost', 'price', 'investment', '$',
        'funding', 'approval', 'finance team'
      ]
    },

    schedule: {
      positive: [
        'ready now', 'asap', 'soon', 'right away',
        'urgent', 'immediately', 'next week', 'this month'
      ],
      negative: [
        'later', 'maybe next year', 'not ready', 'think about it',
        'discuss with team', 'need time', 'not urgent'
      ],
      mentions: [
        'timeline', 'when', 'how long', 'deadline',
        'schedule', 'timing', 'implementation', 'rollout'
      ]
    }
  };

  constructor() {
    this.trail = new BreadcrumbTrail('MEFSTracker');
    this.trail.light(9020, {
      operation: 'mefs_tracker_initialized',
      timestamp: Date.now()
    });
  }

  /**
   * Analyze prospect response for MEFS evidence
   */
  analyzeResponse(text: string, speaker: 'user' | 'prospect', currentStage: SalesStage): MEFSState {
    this.trail.light(9021, {
      operation: 'mefs_analysis_start',
      textLength: text.length,
      speaker,
      currentStage
    });

    // Only analyze prospect responses
    if (speaker !== 'prospect') {
      return this.getCurrentState(currentStage);
    }

    const cleanText = text.toLowerCase().trim();

    // Extract evidence from the response
    const newEvidence = this.extractEvidence(cleanText);

    // Add new evidence to history
    newEvidence.forEach(evidence => this.addEvidence(evidence));

    // Calculate current MEFS state
    const state = this.getCurrentState(currentStage);

    this.trail.light(9022, {
      operation: 'mefs_analysis_complete',
      evidenceFound: newEvidence.length,
      overallAlignment: state.overallAlignment,
      primaryGap: state.primaryGap
    });

    return state;
  }

  /**
   * Extract MEFS evidence from prospect response
   */
  private extractEvidence(text: string): MEFSEvidence[] {
    const evidence: MEFSEvidence[] = [];
    const timestamp = Date.now();

    Object.entries(this.evidencePatterns).forEach(([dimension, patterns]) => {
      const dim = dimension as MEFSDimension;

      // Check positive indicators
      patterns.positive?.forEach(phrase => {
        if (text.includes(phrase)) {
          evidence.push({
            dimension: dim,
            evidence: `Positive ${dim}: "${phrase}"`,
            timestamp,
            confidence: 80,
            impact: 'positive'
          });
        }
      });

      // Check negative indicators
      patterns.negative?.forEach(phrase => {
        if (text.includes(phrase)) {
          evidence.push({
            dimension: dim,
            evidence: `Negative ${dim}: "${phrase}"`,
            timestamp,
            confidence: 85,
            impact: 'negative'
          });
        }
      });

      // Check questions/mentions (neutral but informative) - only for mental dimension
      if (dim === 'mental' && (patterns as any).questions) {
        (patterns as any).questions.forEach((phrase: string) => {
          if (text.includes(phrase)) {
            evidence.push({
              dimension: dim,
              evidence: `${dim} question: "${phrase}"`,
              timestamp,
              confidence: 70,
              impact: 'neutral'
            });
          }
        });
      }

      // Check mentions for F and S dimensions
      if ((dim === 'financial' || dim === 'schedule') && (patterns as any).mentions) {
        (patterns as any).mentions.forEach((phrase: string) => {
          if (text.includes(phrase)) {
            evidence.push({
              dimension: dim,
              evidence: `${dim} mentioned: "${phrase}"`,
              timestamp,
              confidence: 60,
              impact: 'neutral'
            });
          }
        });
      }

      // Special patterns for emotional frustration
      if (dim === 'emotional' && (patterns as any).frustration) {
        (patterns as any).frustration.forEach((phrase: string) => {
          if (text.includes(phrase)) {
            evidence.push({
              dimension: dim,
              evidence: `Frustration indicator: "${phrase}"`,
              timestamp,
              confidence: 90,
              impact: 'negative'
            });
          }
        });
      }
    });

    return evidence;
  }

  /**
   * Add evidence to tracking history
   */
  private addEvidence(evidence: MEFSEvidence): void {
    this.evidenceHistory.push(evidence);

    // Keep history manageable
    if (this.evidenceHistory.length > this.maxEvidenceHistory) {
      this.evidenceHistory = this.evidenceHistory.slice(-this.maxEvidenceHistory);
    }

    this.trail.light(9023, {
      operation: 'evidence_added',
      dimension: evidence.dimension,
      impact: evidence.impact,
      confidence: evidence.confidence
    });
  }

  /**
   * Calculate current MEFS state based on accumulated evidence
   */
  getCurrentState(currentStage: SalesStage): MEFSState {
    const activeDimensions = this.getActiveDimensions(currentStage);

    const scores: Record<MEFSDimension, MEFSScore> = {
      mental: this.calculateDimensionScore('mental', activeDimensions.includes('mental')),
      emotional: this.calculateDimensionScore('emotional', activeDimensions.includes('emotional')),
      financial: this.calculateDimensionScore('financial', activeDimensions.includes('financial')),
      schedule: this.calculateDimensionScore('schedule', activeDimensions.includes('schedule'))
    };

    // Calculate overall alignment (weighted average of active dimensions)
    const activeScores = activeDimensions.map(dim => scores[dim as MEFSDimension].score);
    const overallAlignment = activeScores.length > 0
      ? activeScores.reduce((sum, score) => sum + score, 0) / activeScores.length
      : 0;

    // Find primary gap (lowest scoring active dimension)
    const primaryGap = this.findPrimaryGap(scores, activeDimensions);

    // Recommend focus areas (active dimensions with scores < 60)
    const recommendedFocus = activeDimensions.filter(dim =>
      scores[dim as MEFSDimension].score < 60
    ) as MEFSDimension[];

    return {
      mental: scores.mental,
      emotional: scores.emotional,
      financial: scores.financial,
      schedule: scores.schedule,
      overallAlignment,
      primaryGap,
      recommendedFocus
    };
  }

  /**
   * Get active dimensions based on sales stage
   */
  private getActiveDimensions(stage: SalesStage): string[] {
    return this.stageActivation[stage] || ['mental', 'emotional'];
  }

  /**
   * Calculate score for a specific MEFS dimension
   */
  private calculateDimensionScore(dimension: MEFSDimension, isActive: boolean): MEFSScore {
    const dimensionEvidence = this.evidenceHistory.filter(e => e.dimension === dimension);

    if (dimensionEvidence.length === 0) {
      return {
        score: isActive ? 20 : 50, // Lower score for active dimensions with no evidence
        evidence: [],
        gaps: this.getGapsForDimension(dimension, isActive),
        isActive
      };
    }

    // Calculate weighted score based on evidence
    let totalWeight = 0;
    let weightedScore = 0;

    dimensionEvidence.forEach(evidence => {
      const weight = evidence.confidence / 100;
      const scoreContribution = evidence.impact === 'positive' ? 80 :
                               evidence.impact === 'negative' ? 20 : 50;

      weightedScore += scoreContribution * weight;
      totalWeight += weight;
    });

    const finalScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50;

    return {
      score: Math.max(0, Math.min(100, finalScore)),
      evidence: dimensionEvidence,
      gaps: this.getGapsForDimension(dimension, isActive, dimensionEvidence),
      isActive
    };
  }

  /**
   * Identify information gaps for a dimension
   */
  private getGapsForDimension(dimension: MEFSDimension, isActive: boolean, evidence: MEFSEvidence[] = []): string[] {
    if (!isActive) return [];

    const gaps: string[] = [];
    const hasPositive = evidence.some(e => e.impact === 'positive');
    const hasNegative = evidence.some(e => e.impact === 'negative');

    switch (dimension) {
      case 'mental':
        if (!hasPositive && !hasNegative) {
          gaps.push('Understanding level unclear');
        }
        if (!evidence.some(e => e.evidence.includes('question'))) {
          gaps.push('No clarifying questions asked');
        }
        break;

      case 'emotional':
        if (!hasPositive && !hasNegative) {
          gaps.push('Emotional state unknown');
        }
        if (!evidence.some(e => e.evidence.includes('frustration') || e.evidence.includes('excited'))) {
          gaps.push('Emotional intensity unclear');
        }
        break;

      case 'financial':
        if (!evidence.some(e => e.evidence.includes('budget') || e.evidence.includes('cost'))) {
          gaps.push('Budget information missing');
        }
        if (!hasPositive && !hasNegative) {
          gaps.push('Price perception unknown');
        }
        break;

      case 'schedule':
        if (!evidence.some(e => e.evidence.includes('timeline') || e.evidence.includes('when'))) {
          gaps.push('Timeline requirements unclear');
        }
        if (!evidence.some(e => e.evidence.includes('urgent') || e.evidence.includes('later'))) {
          gaps.push('Urgency level unknown');
        }
        break;
    }

    return gaps;
  }

  /**
   * Find the dimension needing most attention
   */
  private findPrimaryGap(scores: Record<MEFSDimension, MEFSScore>, activeDimensions: string[]): MEFSDimension | null {
    let lowestScore = 100;
    let primaryGap: MEFSDimension | null = null;

    activeDimensions.forEach(dim => {
      const dimension = dim as MEFSDimension;
      const score = scores[dimension];
      if (score.isActive && score.score < lowestScore) {
        lowestScore = score.score;
        primaryGap = dimension;
      }
    });

    return primaryGap;
  }

  /**
   * Get information gaps that need to be addressed
   */
  getInformationGaps(currentStage: SalesStage): string[] {
    const state = this.getCurrentState(currentStage);
    const allGaps: string[] = [];

    state.recommendedFocus.forEach(dimension => {
      allGaps.push(...state[dimension].gaps);
    });

    return allGaps;
  }

  /**
   * Check if enough information has been gathered for a stage transition
   */
  isReadyForStageTransition(fromStage: SalesStage, toStage: SalesStage): boolean {
    const currentState = this.getCurrentState(fromStage);

    // Early stages need M+E alignment
    if (toStage === 'solution') {
      return currentState.mental.score > 60 && currentState.emotional.score > 60;
    }

    // Closing stage needs all dimensions
    if (toStage === 'closing') {
      return currentState.overallAlignment > 70;
    }

    return true; // Other transitions allowed
  }

  /**
   * Get evidence for display purposes
   */
  getEvidenceForDimension(dimension: MEFSDimension): MEFSEvidence[] {
    return this.evidenceHistory.filter(e => e.dimension === dimension);
  }

  /**
   * Reset tracker for new conversation
   */
  reset(): void {
    this.evidenceHistory = [];

    this.trail.light(9024, {
      operation: 'mefs_tracker_reset',
      timestamp: Date.now()
    });
  }

  /**
   * Get quick summary for UI display
   */
  getQuickSummary(currentStage: SalesStage): { [key in MEFSDimension]: number } {
    const state = this.getCurrentState(currentStage);
    return {
      mental: state.mental.score,
      emotional: state.emotional.score,
      financial: state.financial.score,
      schedule: state.schedule.score
    };
  }

  /**
   * Get recommended next action based on MEFS analysis
   */
  getRecommendedAction(currentStage: SalesStage): string {
    const state = this.getCurrentState(currentStage);

    if (state.primaryGap) {
      const gapDimension = state.primaryGap;
      const score = state[gapDimension].score;

      if (score < 30) {
        return `Critical gap in ${gapDimension} alignment - use Calibrated Questions or Emotional Response Validation`;
      } else if (score < 60) {
        return `Address ${gapDimension} concerns with appropriate tool selection`;
      }
    }

    if (state.overallAlignment > 80) {
      return 'Strong alignment - consider advancing to closing';
    } else if (state.overallAlignment > 60) {
      return 'Good alignment - continue building rapport and addressing gaps';
    } else {
      return 'Focus on understanding and rapport building';
    }
  }
}