/**
 * VoiceCoach V2 - Sentiment Analyzer
 * Tracks positive/negative sentiment and engagement levels for prospect responses
 * Enables sentiment-driven tool selection (negative → rapport building, positive → advance)
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

export type SentimentDirection = 'positive' | 'negative' | 'neutral';
export type EngagementLevel = 'high' | 'medium' | 'low';
export type SentimentTrend = 'improving' | 'declining' | 'stable';

export interface SentimentAnalysis {
  score: number;              // -100 to +100 (-100 = very negative, +100 = very positive)
  direction: SentimentDirection;
  confidence: number;         // 0-100% confidence in analysis
  engagement: EngagementLevel;
  trend: SentimentTrend;      // Based on last 3-5 responses
  indicators: string[];       // What words/patterns triggered this analysis
  responseLength: number;     // Word count of analyzed response
  suggestedResponse: string;  // How to respond to this sentiment
}

export interface SentimentHistory {
  timestamp: number;
  score: number;
  text: string;
  wordCount: number;
}

export class SentimentAnalyzer {
  private trail: BreadcrumbTrail;
  private sentimentHistory: SentimentHistory[] = [];
  private readonly maxHistoryLength = 20; // Keep last 20 responses for trend analysis

  // Sentiment word mappings with different weights
  private readonly sentimentWords = {
    // Positive indicators (sales context)
    positive: {
      high: ['excited', 'amazing', 'perfect', 'exactly', 'love', 'fantastic', 'excellent'],
      medium: ['good', 'interesting', 'helpful', 'nice', 'like', 'sounds', 'great'],
      low: ['okay', 'fine', 'sure', 'yes', 'right', 'understand', 'see']
    },

    // SALES-SPECIFIC: Pain points & challenges = POSITIVE engagement when prospect is sharing
    painPointSharing: {
      // These words indicate prospect is opening up about challenges (GOOD in sales!)
      words: ['problem', 'challenge', 'struggle', 'difficult', 'hard', 'frustrated', 'concerned', 'worried',
              'issue', 'pain', 'trouble', 'complicated', 'stuck', 'overwhelmed', 'bottleneck'],
      // Context clues that indicate they're SHARING vs OBJECTING
      sharingContext: ['we have', 'our team', 'currently', 'right now', 'been dealing', 'facing',
                       'experiencing', 'trying to', 'need to', 'looking for', 'hoping to']
    },

    // Negative indicators (sales context) - TRUE objections and resistance
    negative: {
      high: ['hate', 'terrible', 'awful', 'never', 'impossible', 'ridiculous', 'stupid', 'waste of time',
             'not interested', 'don\'t call again'],
      medium: ['too expensive', 'can\'t afford', 'not in budget', 'not now', 'wrong time', 'not priority'],
      low: ['but', 'however', 'maybe', 'perhaps', 'might', 'could be', 'not really']
    },

    // Engagement indicators
    curiosity: ['how', 'what', 'when', 'where', 'why', 'tell me more', 'explain', 'show me', 'walk me through'],
    commitment: ['definitely', 'absolutely', 'for sure', 'without a doubt', 'yes', 'let\'s do it', 'sounds good'],
    hesitation: ['um', 'uh', 'well', 'i don\'t know', 'maybe', 'i guess'],

    // Disengagement signals
    short_responses: ['ok', 'yes', 'no', 'fine', 'sure', 'whatever', 'k'],
    exit_language: ['think about it', 'get back to you', 'discuss with', 'not ready', 'maybe later',
                    'call me back', 'send me info'],

    // USER-SPECIFIC: How well is the user handling the conversation?
    userHandling: {
      // Positive handling words (validation, empathy, confidence)
      positive: ['understand', 'hear you', 'makes sense', 'exactly', 'absolutely', 'perfect',
                 'great question', 'love that', 'excited to', 'definitely can help'],

      // Advancement language (confirming interest, moving forward)
      advancement: ['thinking about', 'focusing on', 'interested in', 'looking at',
                    'considering', 'ready to', 'want to', 'planning to',
                    'with our', 'our coaches', 'our service', 'we can help'],

      // Negative signals (defensive, pushy, reading negativity)
      defensive: ['but actually', 'well technically', 'you have to', 'you need to'],

      // Reading prospect negativity (user detecting negative sentiment)
      readingNegative: ['don\'t sound', 'don\'t seem', 'seem hesitant', 'sound concerned',
                        'not sure about', 'worried about', 'sound nervous', 'seem nervous']
    }
  };

  constructor() {
    this.trail = new BreadcrumbTrail('SentimentAnalyzer');
    this.trail.light(9010, {
      operation: 'sentiment_analyzer_initialized',
      timestamp: Date.now()
    });
  }

  /**
   * Analyze sentiment of a prospect's response
   */
  analyzeResponse(text: string, speaker: 'user' | 'prospect' = 'prospect'): SentimentAnalysis {
    this.trail.light(9011, {
      operation: 'sentiment_analysis_start',
      textLength: text.length,
      speaker
    });

    // Analyze both prospect AND user sentiment for overall call health
    // (Different logic for each speaker type)

    const cleanText = text.toLowerCase().trim();
    const wordCount = cleanText.split(' ').filter(word => word.length > 0).length;

    // Calculate sentiment score (already includes length/engagement logic)
    const sentimentScore = this.calculateSentimentScore(cleanText, speaker);

    // Calculate engagement level for display/indicators only
    const engagement = this.calculateEngagement(cleanText, wordCount);

    // Determine sentiment direction and confidence
    const direction = this.getSentimentDirection(sentimentScore);
    const confidence = this.calculateConfidence(sentimentScore, wordCount, cleanText);

    // Add to history and calculate trend
    this.addToHistory(sentimentScore, text, wordCount);
    const trend = this.calculateTrend();

    // Get indicators that influenced this analysis
    const indicators = this.getIndicators(cleanText, sentimentScore, engagement);

    // Get suggested response strategy
    const suggestedResponse = this.getSuggestedResponse(direction, engagement, sentimentScore);

    const analysis: SentimentAnalysis = {
      score: sentimentScore,
      direction,
      confidence,
      engagement,
      trend,
      indicators,
      responseLength: wordCount,
      suggestedResponse
    };

    this.trail.light(9012, {
      operation: 'sentiment_analysis_complete',
      score: sentimentScore,
      direction,
      engagement,
      confidence
    });

    return analysis;
  }

  /**
   * Calculate raw sentiment score from word analysis
   * SALES RULE: Detailed responses = POSITIVE engagement (they're talking!)
   */
  private calculateSentimentScore(text: string, speaker: 'user' | 'prospect'): number {
    const wordCount = text.split(' ').filter(w => w.length > 0).length;

    // USER sentiment uses different logic than PROSPECT sentiment
    if (speaker === 'user') {
      return this.calculateUserSentiment(text, wordCount);
    }

    // Rest of existing PROSPECT sentiment logic below...

    // CRITICAL: In sales, length = engagement = POSITIVE
    // Any response over 10 words is good engagement, start with positive base
    let score = wordCount > 10 ? 30 : wordCount > 5 ? 15 : 0;

    // ONLY check for TRUE DEAL-KILLERS (not soft words like "not", "wasn't", etc.)
    const hasDealKiller = this.sentimentWords.negative.high.some(word => text.includes(word));
    if (hasDealKiller) {
      score -= 40; // Actual rejection language
      console.log('⚠️ SALES ALERT: Deal-killer language detected');
      return score; // Short-circuit - this is real negativity
    }

    // Check for exit/stalling language
    const hasExitLanguage = this.sentimentWords.exit_language.some(phrase => text.includes(phrase));
    if (hasExitLanguage) {
      score -= 25;
      console.log('⏸️ SALES ALERT: Stalling language detected');
    }

    // Medium objections (price, timing) - but NOT deal-killers
    const hasMediumObjection = this.sentimentWords.negative.medium.some(word => text.includes(word));
    if (hasMediumObjection) {
      score -= 10; // Just a concern, not a deal-killer
    }

    // SALES-POSITIVE: Pain point sharing (challenges, problems, etc.)
    const isPainPointSharing = this.detectPainPointSharing(text);
    if (isPainPointSharing) {
      score += 25; // This is GOLD in sales!
      console.log('🎯 SALES INSIGHT: Prospect sharing pain points (POSITIVE engagement)');
    }

    // Positive word scoring
    Object.entries(this.sentimentWords.positive).forEach(([intensity, wordList]) => {
      const weight = intensity === 'high' ? 15 : intensity === 'medium' ? 8 : 3;
      wordList.forEach(word => {
        if (text.includes(word)) {
          score += weight;
        }
      });
    });

    // Curiosity = engagement = positive
    const hasCuriosity = this.sentimentWords.curiosity.some(word => text.includes(word));
    if (hasCuriosity) {
      score += 10;
    }

    return Math.max(-100, Math.min(100, score));
  }

  /**
   * Calculate sentiment from USER'S words (how well they're handling the call)
   */
  private calculateUserSentiment(text: string, wordCount: number): number {
    let score = 0;

    // Base score: talking = engagement (but less weight than prospect)
    score = wordCount > 10 ? 15 : wordCount > 5 ? 10 : 5;

    // Positive handling words
    this.sentimentWords.userHandling.positive.forEach(phrase => {
      if (text.includes(phrase)) {
        score += 15; // Strong positive for good handling
      }
    });

    // Advancement language (confirming interest, moving forward)
    this.sentimentWords.userHandling.advancement.forEach(phrase => {
      if (text.includes(phrase)) {
        score += 20; // Very positive - advancing the sale
        console.log('✅ ADVANCEMENT: User confirming prospect interest/moving forward');
      }
    });

    // Defensive language = negative
    this.sentimentWords.userHandling.defensive.forEach(phrase => {
      if (text.includes(phrase)) {
        score -= 20; // User getting defensive = bad sign
      }
    });

    // User reading prospect negativity = call going poorly
    // BUT: Exclude validation phrases (mirroring prospect's concerns = GOOD)
    const isValidationPhrase = this.isValidationMirroring(text);

    if (!isValidationPhrase) {
      this.sentimentWords.userHandling.readingNegative.forEach(phrase => {
        if (text.includes(phrase)) {
          score -= 25; // User sensing negativity = very bad
          console.log('⚠️ USER DETECTED: User reading negative sentiment from prospect');
        }
      });
    }

    return Math.max(-100, Math.min(100, score));
  }

  /**
   * Detect if user is VALIDATING/MIRRORING prospect concerns (GOOD empathy)
   * vs READING negative sentiment (BAD - user detecting prospect pulling away)
   *
   * Key insight: "You don't seem to connect with the coach" = VALIDATION (GOOD)
   *              "You don't seem very excited about this" = READING NEGATIVITY (BAD)
   */
  private isValidationMirroring(text: string): boolean {
    // Validation indicators - user is mirroring/acknowledging prospect's stated concerns
    const validationWords = [
      'frustrating', 'understand', 'hear you', 'makes sense',
      'can see', 'i get', 'that must', 'sounds like',
      'you mentioned', 'you said', 'you\'re saying'
    ];

    // Check if the user is validating/empathizing with prospect's concern
    const hasValidation = validationWords.some(word => text.includes(word));

    // Also check if user is referencing prospect's words (mirroring)
    const isMirroringProspectConcern =
      (text.includes('you don\'t') || text.includes('you didn\'t')) &&
      (text.includes('frustrating') || text.includes('understand') || text.includes('makes sense'));

    return hasValidation || isMirroringProspectConcern;
  }

  /**
   * Detect if prospect is SHARING pain points (positive) vs OBJECTING (negative)
   * Key insight: "We have problems with X" = GOOD, "Your solution is problematic" = BAD
   */
  private detectPainPointSharing(text: string): boolean {
    // Check if any pain point words are present
    const hasPainWords = this.sentimentWords.painPointSharing.words.some(word =>
      text.includes(word)
    );

    if (!hasPainWords) return false;

    // Check for sharing context indicators
    const hasSharingContext = this.sentimentWords.painPointSharing.sharingContext.some(phrase =>
      text.includes(phrase)
    );

    // Also positive if response is detailed (>15 words) with pain words
    const wordCount = text.split(' ').filter(w => w.length > 0).length;
    const isDetailedResponse = wordCount > 15;

    // Pain point sharing = pain words + (sharing context OR detailed explanation)
    return hasPainWords && (hasSharingContext || isDetailedResponse);
  }

  /**
   * Calculate engagement level based on response characteristics
   */
  private calculateEngagement(text: string, wordCount: number): EngagementLevel {
    // Very short responses indicate low engagement
    if (wordCount <= 3) {
      // Check if it's just a short positive response
      const isPositiveShort = this.sentimentWords.positive.low.some(word => text.includes(word));
      return isPositiveShort ? 'medium' : 'low';
    }

    // Medium length responses
    if (wordCount <= 10) {
      return 'medium';
    }

    // Long responses indicate high engagement
    if (wordCount > 10) {
      return 'high';
    }

    return 'medium';
  }

  /**
   * Adjust sentiment score based on engagement level
   */
  private adjustScoreForEngagement(score: number, engagement: EngagementLevel, wordCount: number): number {
    let adjustment = 0;

    // Short responses are generally negative signals in sales
    if (wordCount <= 3) {
      adjustment = -15;
    } else if (wordCount <= 5) {
      adjustment = -8;
    } else if (wordCount > 15) {
      // Long responses show engagement
      adjustment = +5;
    }

    // Apply engagement-based adjustment
    switch (engagement) {
      case 'high':
        adjustment += 5;
        break;
      case 'low':
        adjustment -= 10;
        break;
      default:
        // No adjustment for medium engagement
        break;
    }

    return Math.max(-100, Math.min(100, score + adjustment));
  }

  /**
   * Determine sentiment direction from score
   */
  private getSentimentDirection(score: number): SentimentDirection {
    if (score > 10) return 'positive';
    if (score < -10) return 'negative';
    return 'neutral';
  }

  /**
   * Calculate confidence in sentiment analysis
   */
  private calculateConfidence(score: number, wordCount: number, text: string): number {
    let confidence = 50; // Base confidence

    // Higher confidence for stronger sentiment scores
    confidence += Math.abs(score) * 0.5;

    // Higher confidence for longer responses (more data)
    if (wordCount > 10) confidence += 15;
    if (wordCount > 20) confidence += 10;

    // Lower confidence for very short responses
    if (wordCount <= 3) confidence -= 20;

    // Higher confidence if clear sentiment words are present
    const hasClearSentiment =
      Object.values(this.sentimentWords.positive.high).some(word => text.includes(word)) ||
      Object.values(this.sentimentWords.negative.high).some(word => text.includes(word));

    if (hasClearSentiment) confidence += 20;

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Add response to sentiment history
   */
  private addToHistory(score: number, text: string, wordCount: number): void {
    this.sentimentHistory.push({
      timestamp: Date.now(),
      score,
      text,
      wordCount
    });

    // Keep only recent history
    if (this.sentimentHistory.length > this.maxHistoryLength) {
      this.sentimentHistory = this.sentimentHistory.slice(-this.maxHistoryLength);
    }
  }

  /**
   * Calculate sentiment trend based on recent history
   */
  private calculateTrend(): SentimentTrend {
    if (this.sentimentHistory.length < 3) return 'stable';

    const recent = this.sentimentHistory.slice(-5); // Last 5 responses
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));

    const firstAvg = firstHalf.reduce((sum, h) => sum + h.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, h) => sum + h.score, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;

    if (difference > 10) return 'improving';
    if (difference < -10) return 'declining';
    return 'stable';
  }

  /**
   * Get indicators that influenced the sentiment analysis
   */
  private getIndicators(text: string, score: number, engagement: EngagementLevel): string[] {
    const indicators: string[] = [];

    // SALES-SPECIFIC: Pain point sharing detection
    const isPainPointSharing = this.detectPainPointSharing(text);
    if (isPainPointSharing) {
      indicators.push('🎯 Pain Point Sharing: Prospect opening up about challenges (POSITIVE!)');
    }

    // Word-based indicators
    Object.entries(this.sentimentWords.positive).forEach(([intensity, words]) => {
      words.forEach(word => {
        if (text.includes(word)) {
          indicators.push(`Positive (${intensity}): "${word}"`);
        }
      });
    });

    Object.entries(this.sentimentWords.negative).forEach(([intensity, words]) => {
      words.forEach(word => {
        if (text.includes(word)) {
          indicators.push(`Negative (${intensity}): "${word}"`);
        }
      });
    });

    // Engagement indicators
    if (engagement === 'low') {
      indicators.push('Low engagement: Short response');
    } else if (engagement === 'high') {
      indicators.push('High engagement: Detailed response');
    }

    // Trend indicators
    const trend = this.calculateTrend();
    if (trend !== 'stable') {
      indicators.push(`Sentiment trend: ${trend}`);
    }

    return indicators;
  }

  /**
   * Get suggested response strategy based on sentiment
   */
  private getSuggestedResponse(direction: SentimentDirection, engagement: EngagementLevel, score: number): string {
    if (direction === 'positive' && engagement === 'high') {
      return 'Advance conversation with Buy-In or Calibrated Questions';
    }

    if (direction === 'positive' && engagement === 'medium') {
      return 'Build on positive sentiment with solution presentation';
    }

    if (direction === 'negative' && engagement === 'low') {
      return 'Use Proactive Validation or Take Away to address resistance';
    }

    if (direction === 'negative') {
      return 'Use Emotional Response Validation or Accusation Audit';
    }

    if (engagement === 'low') {
      return 'Use Mirroring or Calibrated Questions to increase engagement';
    }

    if (direction === 'neutral' && engagement === 'high') {
      return 'Good engagement - continue with discovery or solution';
    }

    return 'Continue current approach while monitoring sentiment';
  }

  /**
   * Create neutral analysis for non-prospect speech
   */
  private createNeutralAnalysis(text: string, reason: string): SentimentAnalysis {
    return {
      score: 0,
      direction: 'neutral',
      confidence: 0,
      engagement: 'medium',
      trend: 'stable',
      indicators: [reason],
      responseLength: text.split(' ').length,
      suggestedResponse: 'N/A - User speech'
    };
  }

  /**
   * Get current sentiment trend
   */
  getCurrentTrend(): SentimentTrend {
    return this.calculateTrend();
  }

  /**
   * Get average sentiment over recent responses
   */
  getRecentAverageScore(count: number = 5): number {
    if (this.sentimentHistory.length === 0) return 0;

    const recent = this.sentimentHistory.slice(-count);
    return recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
  }

  /**
   * Check if sentiment suggests prospect is pulling away
   */
  isProspectPullingAway(): boolean {
    const trend = this.calculateTrend();
    const recentAverage = this.getRecentAverageScore(3);

    return trend === 'declining' && recentAverage < -20;
  }

  /**
   * Check if sentiment suggests prospect is engaged and positive
   */
  isProspectEngaged(): boolean {
    const trend = this.calculateTrend();
    const recentAverage = this.getRecentAverageScore(3);

    return (trend === 'improving' || trend === 'stable') && recentAverage > 10;
  }

  /**
   * Reset analyzer for new conversation
   */
  reset(): void {
    this.sentimentHistory = [];

    this.trail.light(9013, {
      operation: 'sentiment_analyzer_reset',
      timestamp: Date.now()
    });
  }

  /**
   * Get sentiment history for analysis
   */
  getHistory(): SentimentHistory[] {
    return [...this.sentimentHistory];
  }
}