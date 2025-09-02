/**
 * VoiceCoach V2 - Buying Signals Detector
 * Detects positive buying signals in conversation
 * Lightweight pattern matching - no AI calls needed
 */

import { BreadcrumbTrail } from '../../../lib/breadcrumb-system';

export type BuyingSignalType = 
  | 'interest' 
  | 'timeline' 
  | 'budget' 
  | 'decision' 
  | 'urgency'
  | 'implementation'
  | 'commitment';

interface SignalPatterns {
  [type: string]: string[];
}

export interface DetectedSignal {
  type: BuyingSignalType;
  strength: number; // 0.0 to 1.0
  matchedPattern: string;
  timestamp: Date;
}

export class BuyingSignalsDetector {
  private trail: BreadcrumbTrail;
  private detectedSignals: DetectedSignal[] = [];
  private signalCount: Map<BuyingSignalType, number> = new Map();
  
  // Buying signal patterns
  private signalPatterns: SignalPatterns = {
    interest: [
      'tell me more', 'how does', 'what if', 'can you',
      'interested in', 'sounds good', "that's helpful", 'like that',
      'impressive', 'exciting', 'love to learn', 'curious about'
    ],
    timeline: [
      'when can we', 'how long', 'timeline', 'start date',
      'implementation', 'go live', 'launch', 'roll out',
      'how soon', 'timeframe', 'schedule', 'availability'
    ],
    budget: [
      "what's the cost", 'pricing', 'investment', 'budget approved',
      'financial', 'roi', 'payback', 'cost savings',
      'afford', 'payment terms', 'financing', 'price structure'
    ],
    decision: [
      "let's do it", 'sounds like a plan', 'next steps',
      'move forward', 'get started', 'makes sense', 'ready to',
      'want to proceed', 'yes', 'absolutely', 'definitely'
    ],
    urgency: [
      'need this soon', 'urgent', 'asap', 'quickly',
      'immediately', 'right away', 'time sensitive', 'critical',
      'high priority', 'fast track', 'expedite'
    ],
    implementation: [
      'onboarding', 'training', 'integration', 'deployment',
      'setup', 'configuration', 'migration', 'transition',
      'installation', 'customization', 'support'
    ],
    commitment: [
      'commitment', 'dedicate', 'resources', 'team',
      'stakeholder', 'champion', 'sponsor', 'buy-in',
      'align', 'prioritize', 'focus'
    ]
  };
  
  constructor() {
    this.trail = new BreadcrumbTrail('BuyingSignalsDetector');
    this.trail.light(3520, { service: 'BuyingSignalsDetector', initialized: true });
  }
  
  /**
   * Detect buying signals in transcript
   * @param transcript Current conversation text
   * @param returnAll Whether to return all matches or just new ones
   */
  detect(transcript: string, returnAll: boolean = false): DetectedSignal[] {
    const transcriptLower = transcript.toLowerCase();
    const newSignals: DetectedSignal[] = [];
    
    // Check each signal type
    Object.entries(this.signalPatterns).forEach(([type, patterns]) => {
      patterns.forEach(pattern => {
        if (transcriptLower.includes(pattern)) {
          const signal: DetectedSignal = {
            type: type as BuyingSignalType,
            strength: this.calculateStrength(type as BuyingSignalType, pattern),
            matchedPattern: pattern,
            timestamp: new Date()
          };
          
          newSignals.push(signal);
          
          // Update count
          const currentCount = this.signalCount.get(type as BuyingSignalType) || 0;
          this.signalCount.set(type as BuyingSignalType, currentCount + 1);
          
          this.trail.light(3521, {
            signal_detected: type,
            pattern: pattern,
            strength: signal.strength,
            total_count: currentCount + 1
          });
        }
      });
    });
    
    // Add to history
    this.detectedSignals.push(...newSignals);
    
    return returnAll ? this.detectedSignals : newSignals;
  }
  
  /**
   * Calculate signal strength based on type and pattern
   */
  private calculateStrength(type: BuyingSignalType, pattern: string): number {
    // Very strong buying signals
    const veryStrong = [
      "let's do it", 'ready to', 'want to proceed', 
      'need this soon', 'urgent', 'budget approved'
    ];
    
    if (veryStrong.includes(pattern)) {
      return 0.95;
    }
    
    // Strong signals
    if (type === 'decision' || type === 'urgency') {
      return 0.85;
    }
    
    // Timeline and budget discussions are positive
    if (type === 'timeline' || type === 'budget') {
      return 0.75;
    }
    
    // Interest signals are good but early stage
    if (type === 'interest') {
      return 0.6;
    }
    
    // Default strength
    return 0.7;
  }
  
  /**
   * Get overall buying readiness score (0.0 to 1.0)
   */
  getReadinessScore(): number {
    if (this.detectedSignals.length === 0) return 0;
    
    let score = 0;
    
    // Decision signals are strongest indicator
    if (this.signalCount.get('decision')) {
      score += 0.4;
    }
    
    // Timeline and budget discussions show serious interest
    if (this.signalCount.get('timeline')) {
      score += 0.2;
    }
    if (this.signalCount.get('budget')) {
      score += 0.2;
    }
    
    // Urgency adds to score
    if (this.signalCount.get('urgency')) {
      score += 0.15;
    }
    
    // Interest is baseline
    if (this.signalCount.get('interest')) {
      score += 0.05;
    }
    
    // Cap at 1.0
    return Math.min(score, 1.0);
  }
  
  /**
   * Get count of each signal type
   */
  getSignalCounts(): Map<BuyingSignalType, number> {
    return new Map(this.signalCount);
  }
  
  /**
   * Check if ready to close based on signals
   */
  isReadyToClose(): boolean {
    const readiness = this.getReadinessScore();
    const hasDecisionSignal = this.signalCount.has('decision');
    const hasMultipleSignals = this.detectedSignals.length >= 3;
    
    return readiness >= 0.7 || (hasDecisionSignal && hasMultipleSignals);
  }
  
  /**
   * Get most recent signal
   */
  getMostRecent(): DetectedSignal | null {
    return this.detectedSignals[this.detectedSignals.length - 1] || null;
  }
  
  /**
   * Get all detected signals
   */
  getHistory(): DetectedSignal[] {
    return [...this.detectedSignals];
  }
  
  /**
   * Reset detector state
   */
  reset(): void {
    this.detectedSignals = [];
    this.signalCount.clear();
    this.trail.light(3522, { action: 'detector_reset' });
  }
}

// Export singleton instance
export const buyingSignalsDetector = new BuyingSignalsDetector();