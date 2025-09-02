/**
 * VoiceCoach V2 - Objection Detector
 * Detects sales objections in conversation
 * Lightweight pattern matching - no AI calls needed
 */

import { BreadcrumbTrail } from '../../../lib/breadcrumb-system';

export type ObjectionType = 
  | 'price' 
  | 'timing' 
  | 'authority' 
  | 'need' 
  | 'trust'
  | 'competition'
  | 'features';

interface ObjectionPatterns {
  [type: string]: string[];
}

export interface DetectedObjection {
  type: ObjectionType;
  confidence: number; // 0.0 to 1.0
  matchedPattern: string;
  timestamp: Date;
}

export class ObjectionDetector {
  private trail: BreadcrumbTrail;
  private detectedObjections: DetectedObjection[] = [];
  private recentObjectionTypes: Set<ObjectionType> = new Set();
  
  // Objection patterns
  private objectionPatterns: ObjectionPatterns = {
    price: [
      'too expensive', 'cost too much', 'budget', "can't afford",
      'price is high', 'over budget', 'cheaper option', 'too much money',
      'financial', 'costly', 'price point', 'investment level'
    ],
    timing: [
      'not the right time', 'maybe later', 'too busy', 'bad timing',
      'revisit next', 'not ready', 'wait until', 'come back',
      'down the road', 'next quarter', 'next year', 'not now'
    ],
    authority: [
      'need to check with', 'talk to my', 'boss decides',
      'not my decision', 'committee', 'board approval', 'my team',
      'get approval', 'run it by', 'supervisor', 'manager says'
    ],
    need: [
      "don't need", 'working fine', 'happy with current',
      'not a priority', "don't see the value", 'already have',
      'no problem', 'doing okay', "doesn't apply", 'not relevant'
    ],
    trust: [
      'never heard of', 'not sure about', 'concerned about',
      'worried about', 'risky', 'proven track record', 'references',
      'testimonials', 'guarantee', 'what if it fails', 'skeptical'
    ],
    competition: [
      'competitor', 'alternative', 'other options', 'shopping around',
      'comparing', 'vendor', 'already using', 'switched from',
      'better solution', 'xyz company'
    ],
    features: [
      "doesn't have", 'missing', 'need it to', 'wish it could',
      'limitation', "can't do", 'lacking', 'feature request',
      'functionality', 'capability'
    ]
  };
  
  constructor() {
    this.trail = new BreadcrumbTrail('ObjectionDetector');
    this.trail.light(3510, { service: 'ObjectionDetector', initialized: true });
  }
  
  /**
   * Detect objections in transcript
   * @param transcript Current conversation text
   * @param includeHistory Whether to include previously detected objections
   */
  detect(transcript: string, includeHistory: boolean = false): DetectedObjection[] {
    const transcriptLower = transcript.toLowerCase();
    const newObjections: DetectedObjection[] = [];
    
    // Check each objection type
    Object.entries(this.objectionPatterns).forEach(([type, patterns]) => {
      // Skip if we've already detected this type recently (unless includeHistory is true)
      if (!includeHistory && this.recentObjectionTypes.has(type as ObjectionType)) {
        return;
      }
      
      // Check each pattern
      patterns.forEach(pattern => {
        if (transcriptLower.includes(pattern)) {
          const objection: DetectedObjection = {
            type: type as ObjectionType,
            confidence: this.calculateConfidence(pattern, transcriptLower),
            matchedPattern: pattern,
            timestamp: new Date()
          };
          
          newObjections.push(objection);
          this.recentObjectionTypes.add(type as ObjectionType);
          
          this.trail.light(3511, {
            objection_detected: type,
            pattern: pattern,
            confidence: objection.confidence
          });
          
          // Stop after first match for this type
          return;
        }
      });
    });
    
    // Add to history
    this.detectedObjections.push(...newObjections);
    
    return includeHistory ? this.detectedObjections : newObjections;
  }
  
  /**
   * Calculate confidence based on pattern strength
   */
  private calculateConfidence(pattern: string, transcript: string): number {
    // Strong indicators get higher confidence
    const strongIndicators = [
      'too expensive', "can't afford", 'not my decision', 
      "don't need", 'never heard of', 'competitor'
    ];
    
    if (strongIndicators.includes(pattern)) {
      return 0.9;
    }
    
    // Medium indicators
    const mediumIndicators = [
      'budget', 'maybe later', 'talk to my', 'happy with current',
      'concerned about', 'other options'
    ];
    
    if (mediumIndicators.includes(pattern)) {
      return 0.7;
    }
    
    // Default confidence
    return 0.5;
  }
  
  /**
   * Get all detected objections
   */
  getHistory(): DetectedObjection[] {
    return [...this.detectedObjections];
  }
  
  /**
   * Get unique objection types detected
   */
  getUniqueTypes(): ObjectionType[] {
    return Array.from(this.recentObjectionTypes);
  }
  
  /**
   * Check if specific objection type was detected
   */
  hasObjection(type: ObjectionType): boolean {
    return this.recentObjectionTypes.has(type);
  }
  
  /**
   * Get most recent objection
   */
  getMostRecent(): DetectedObjection | null {
    return this.detectedObjections[this.detectedObjections.length - 1] || null;
  }
  
  /**
   * Reset detector state
   */
  reset(): void {
    this.detectedObjections = [];
    this.recentObjectionTypes.clear();
    this.trail.light(3512, { action: 'detector_reset' });
  }
}

// Export singleton instance
export const objectionDetector = new ObjectionDetector();