/**
 * VoiceCoach V2 - Sales Stage Detector
 * Detects current sales stage from conversation transcript
 * Lightweight pattern matching - no AI calls needed
 */

import { BreadcrumbTrail } from '../../../lib/breadcrumb-system';

export type SalesStage = 
  | 'opening'      // New stage name (was prospecting)
  | 'discovery' 
  | 'presentation' // New stage name (was demo/proposal)
  | 'objection'    // Simplified name (was objection_handling)
  | 'closing'
  | 'unknown';

interface StageKeywords {
  [stage: string]: string[];
}

export class SalesStageDetector {
  private trail: BreadcrumbTrail;
  private lastDetectedStage: SalesStage = 'opening';  // Changed default
  private stageHistory: SalesStage[] = [];
  
  // Keyword patterns for each stage - aligned with new JSON structure
  private stageKeywords: StageKeywords = {
    opening: [
      // From new JSON keywords
      'rapport', 'trust', 'empathy', 'similarity', 'tone', 'mirror', 'reflect',
      // Original prospecting keywords
      'cold call', 'introduction', 'referred by', 'mutual connection',
      'research', 'company background', 'initial contact', 'reaching out',
      'heard about', 'came across', 'greeting', 'appreciate', 'thank you'
    ],
    discovery: [
      // From new JSON keywords
      'pain', 'challenge', 'frustration', 'problem', 'need', 'want', 'fear', 'desire',
      // Original discovery keywords
      'pain point', 'current situation', 'goals', 'objectives', 'ideal solution', 
      'budget', 'timeline', 'decision maker', 'process', 'criteria', 'needs', 
      'requirements', 'struggling with', 'looking for', 'help us'
    ],
    presentation: [
      // From new JSON keywords
      'solution', 'benefit', 'value', 'outcome', 'result', 'improvement', 'advantage',
      // Combined demo/proposal keywords
      'demonstration', 'show you', 'walk through', 'features', 'capabilities', 
      'how it works', 'screen share', 'example', 'let me show', 'see how', 
      'functionality', 'platform', 'proposal', 'quote', 'pricing', 'package', 
      'options', 'recommendation', 'solution design', 'implementation'
    ],
    objection: [
      // From new JSON keywords
      'but', 'however', 'concern', 'worry', 'problem', 'issue', 'expensive', 'budget',
      // Original objection_handling keywords
      'worried', 'not sure', 'hesitant', 'doubt', 'problem with', 
      'think about it', 'need to consider', 'talk to my', 'too expensive',
      'not convinced', 'skeptical'
    ],
    closing: [
      // From new JSON keywords
      'next', 'move forward', 'implement', 'start', 'commitment', 'agree', 'decision',
      // Original closing keywords
      'get started', 'sign', 'next steps', 'onboarding', 'when can we start', 
      'ready to proceed', 'seal the deal', 'timeline', 'process'
    ]
  };
  
  constructor() {
    this.trail = new BreadcrumbTrail('SalesStageDetector');
    this.trail.light(3500, { service: 'SalesStageDetector', initialized: true });
  }
  
  /**
   * Detect sales stage from transcript
   * @param transcript Current conversation text
   * @param boostObjections Whether to boost objection_handling stage when objections detected
   * @param boostClosing Whether to boost closing stage when buying signals detected
   */
  detect(
    transcript: string, 
    boostObjections: boolean = false,
    boostClosing: boolean = false
  ): SalesStage {
    const transcriptLower = transcript.toLowerCase();
    const stageScores: { [key: string]: number } = {};
    
    // Score each stage based on keyword matches
    Object.entries(this.stageKeywords).forEach(([stage, keywords]) => {
      let score = 0;
      keywords.forEach(keyword => {
        if (transcriptLower.includes(keyword)) {
          score += 1;
        }
      });
      
      if (score > 0) {
        stageScores[stage] = score;
      }
    });
    
    // Apply boosts based on context
    if (boostObjections && stageScores['objection_handling'] !== undefined) {
      stageScores['objection_handling'] += 3;
    }
    
    if (boostClosing && stageScores['closing'] !== undefined) {
      stageScores['closing'] += 3;
    }
    
    // Find stage with highest score
    let detectedStage: SalesStage = 'unknown';
    let highestScore = 0;
    
    Object.entries(stageScores).forEach(([stage, score]) => {
      if (score > highestScore) {
        highestScore = score;
        detectedStage = stage as SalesStage;
      }
    });
    
    // If no clear stage detected, use last known stage
    if (detectedStage === 'unknown' && this.lastDetectedStage !== 'unknown') {
      detectedStage = this.lastDetectedStage;
    }
    
    // Update history
    if (detectedStage !== 'unknown' && detectedStage !== this.lastDetectedStage) {
      this.lastDetectedStage = detectedStage;
      this.stageHistory.push(detectedStage);
      
      this.trail.light(3501, { 
        stage_detected: detectedStage,
        score: highestScore,
        history_length: this.stageHistory.length
      });
    }
    
    return detectedStage;
  }
  
  /**
   * Get stage progression history
   */
  getHistory(): SalesStage[] {
    return [...this.stageHistory];
  }
  
  /**
   * Check if conversation is progressing forward
   */
  isProgressing(): boolean {
    if (this.stageHistory.length < 2) return false;
    
    const stageOrder = [
      'prospecting', 'discovery', 'demo', 'proposal', 
      'objection_handling', 'negotiation', 'closing'
    ];
    
    const recent = this.stageHistory.slice(-2);
    const fromIndex = stageOrder.indexOf(recent[0]);
    const toIndex = stageOrder.indexOf(recent[1]);
    
    // objection_handling can happen at any stage, so don't count as regression
    if (recent[1] === 'objection_handling') return true;
    
    return toIndex > fromIndex;
  }
  
  /**
   * Reset detector state
   */
  reset(): void {
    this.lastDetectedStage = 'discovery';
    this.stageHistory = [];
    this.trail.light(3502, { action: 'detector_reset' });
  }
}

// Export singleton instance
export const salesStageDetector = new SalesStageDetector();