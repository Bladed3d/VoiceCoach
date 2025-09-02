/**
 * VoiceCoach V2 - Conversation Analyzer
 * Orchestrates all detection modules for comprehensive analysis
 * Lightweight coordination - no additional processing
 */

import { BreadcrumbTrail } from '../../../lib/breadcrumb-system';
import { salesStageDetector, SalesStage } from './SalesStageDetector';
import { objectionDetector, DetectedObjection } from './ObjectionDetector';
import { buyingSignalsDetector, DetectedSignal } from './BuyingSignalsDetector';

export interface ConversationAnalysis {
  // Current state
  salesStage: SalesStage;
  objections: DetectedObjection[];
  buyingSignals: DetectedSignal[];
  
  // Scores and metrics
  readinessScore: number; // 0.0 to 1.0
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  momentum: 'advancing' | 'stalled' | 'declining';
  
  // Context for Ollama
  hasObjections: boolean;
  hasBuyingSignals: boolean;
  isProgressing: boolean;
  isReadyToClose: boolean;
  
  // Formatted strings for prompt variables
  objectionsList: string; // Comma-separated for {OBJECTIONS}
  signalsList: string; // Comma-separated for context
  
  // Timestamp
  analyzedAt: Date;
}

export class ConversationAnalyzer {
  private trail: BreadcrumbTrail;
  private lastAnalysis: ConversationAnalysis | null = null;
  private analysisCount: number = 0;
  
  constructor() {
    this.trail = new BreadcrumbTrail('ConversationAnalyzer');
    this.trail.light(3530, { service: 'ConversationAnalyzer', initialized: true });
  }
  
  /**
   * Analyze conversation transcript
   * @param transcript Current conversation text
   * @param fullAnalysis Whether to include historical data
   */
  analyze(transcript: string, fullAnalysis: boolean = false): ConversationAnalysis {
    const startTime = Date.now();
    
    // Run all detectors in parallel (they're independent)
    const objections = objectionDetector.detect(transcript, fullAnalysis);
    const signals = buyingSignalsDetector.detect(transcript, fullAnalysis);
    
    // Sales stage detection considers objections and signals
    const salesStage = salesStageDetector.detect(
      transcript,
      objections.length > 0,  // boost objection_handling if objections found
      signals.length > 0       // boost closing if buying signals found
    );
    
    // Calculate metrics
    const readinessScore = buyingSignalsDetector.getReadinessScore();
    const urgencyLevel = this.calculateUrgency(objections, signals, salesStage);
    const momentum = this.calculateMomentum(salesStage, objections, signals);
    
    // Build analysis result
    const analysis: ConversationAnalysis = {
      salesStage,
      objections,
      buyingSignals: signals,
      
      readinessScore,
      urgencyLevel,
      momentum,
      
      hasObjections: objections.length > 0,
      hasBuyingSignals: signals.length > 0,
      isProgressing: salesStageDetector.isProgressing(),
      isReadyToClose: buyingSignalsDetector.isReadyToClose(),
      
      // Format for Ollama prompt variables
      objectionsList: objections.map(o => o.type).join(', ') || 'none',
      signalsList: signals.map(s => s.type).join(', ') || 'none',
      
      analyzedAt: new Date()
    };
    
    // Track performance
    const analysisTime = Date.now() - startTime;
    this.analysisCount++;
    
    this.trail.light(3531, {
      analysis_complete: true,
      stage: salesStage,
      objection_count: objections.length,
      signal_count: signals.length,
      readiness: readinessScore,
      urgency: urgencyLevel,
      momentum: momentum,
      analysis_time_ms: analysisTime,
      total_analyses: this.analysisCount
    });
    
    this.lastAnalysis = analysis;
    return analysis;
  }
  
  /**
   * Calculate urgency level based on conversation state
   */
  private calculateUrgency(
    objections: DetectedObjection[],
    signals: DetectedSignal[],
    stage: SalesStage
  ): 'critical' | 'high' | 'medium' | 'low' {
    
    // Critical: Multiple objections or deal at risk
    if (objections.length >= 3) {
      return 'critical';
    }
    
    // Critical: In closing but has objections
    if (stage === 'closing' && objections.length > 0) {
      return 'critical';
    }
    
    // High: Strong buying signals or urgency detected
    const hasUrgencySignal = signals.some(s => s.type === 'urgency');
    const hasDecisionSignal = signals.some(s => s.type === 'decision');
    if (hasUrgencySignal || hasDecisionSignal) {
      return 'high';
    }
    
    // High: In negotiation or closing stages
    if (stage === 'negotiation' || stage === 'closing') {
      return 'high';
    }
    
    // Medium: Has objections that need addressing
    if (objections.length > 0) {
      return 'medium';
    }
    
    // Medium: Good buying signals
    if (signals.length >= 2) {
      return 'medium';
    }
    
    // Low: Early stage, no urgency
    return 'low';
  }
  
  /**
   * Calculate conversation momentum
   */
  private calculateMomentum(
    stage: SalesStage,
    objections: DetectedObjection[],
    signals: DetectedSignal[]
  ): 'advancing' | 'stalled' | 'declining' {
    
    // Advancing: Moving forward in sales process
    if (salesStageDetector.isProgressing()) {
      return 'advancing';
    }
    
    // Advancing: Strong buying signals
    if (signals.length >= 3 && objections.length === 0) {
      return 'advancing';
    }
    
    // Declining: Multiple objections
    if (objections.length >= 2) {
      return 'declining';
    }
    
    // Declining: Trust or need objections are serious
    const hasSerious = objections.some(o => 
      o.type === 'trust' || o.type === 'need'
    );
    if (hasSerious) {
      return 'declining';
    }
    
    // Stalled: In discovery too long (would need time tracking)
    if (stage === 'discovery' && this.analysisCount > 10) {
      return 'stalled';
    }
    
    // Default: stalled if no clear direction
    return 'stalled';
  }
  
  /**
   * Get the last analysis result
   */
  getLastAnalysis(): ConversationAnalysis | null {
    return this.lastAnalysis;
  }
  
  /**
   * Reset all analyzers for new session
   */
  reset(): void {
    salesStageDetector.reset();
    objectionDetector.reset();
    buyingSignalsDetector.reset();
    
    this.lastAnalysis = null;
    this.analysisCount = 0;
    
    this.trail.light(3532, { action: 'analyzer_reset' });
  }
  
  /**
   * Get formatted context for Ollama prompt
   */
  getOllamaContext(): {
    salesStage: string;
    objections: string;
    buyingSignals: string;
    urgency: string;
    momentum: string;
  } {
    if (!this.lastAnalysis) {
      return {
        salesStage: 'discovery',
        objections: 'none',
        buyingSignals: 'none',
        urgency: 'low',
        momentum: 'stalled'
      };
    }
    
    return {
      salesStage: this.lastAnalysis.salesStage,
      objections: this.lastAnalysis.objectionsList,
      buyingSignals: this.lastAnalysis.signalsList,
      urgency: this.lastAnalysis.urgencyLevel,
      momentum: this.lastAnalysis.momentum
    };
  }
}

// Export singleton instance
export const conversationAnalyzer = new ConversationAnalyzer();