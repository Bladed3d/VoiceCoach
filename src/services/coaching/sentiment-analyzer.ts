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

    // Negative indicators (sales context)
    negative: {
      high: ['hate', 'terrible', 'awful', 'never', 'impossible', 'ridiculous', 'stupid'],
      medium: ['expensive', 'concerned', 'worried', 'problem', 'difficult', 'complicated', 'not sure'],
      low: ['but', 'however', 'maybe', 'perhaps', 'might', 'could be', 'not really']
    },

    // Engagement indicators
    curiosity: ['how', 'what', 'when', 'where', 'why', 'tell me more', 'explain', 'show me'],
    commitment: ['definitely', 'absolutely', 'for sure', 'without a doubt', 'yes'],
    hesitation: ['um', 'uh', 'well', 'i don\'t know', 'not sure', 'maybe', 'i guess'],

    // Disengagement signals
    short_responses: ['ok', 'yes', 'no', 'fine', 'sure', 'whatever', 'k'],
    exit_language: ['think about it', 'get back to you', 'discuss with', 'not ready', 'maybe later']
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

    // Only analyze prospect responses for sentiment
    if (speaker !== 'prospect') {
      return this.createNeutralAnalysis(text, 'User speech not analyzed for sentiment');
    }

    const cleanText = text.toLowerCase().trim();
    const wordCount = cleanText.split(' ').filter(word => word.length > 0).length;

    // Calculate base sentiment score
    const sentimentScore = this.calculateSentimentScore(cleanText);

    // Calculate engagement level
    const engagement = this.calculateEngagement(cleanText, wordCount);

    // Adjust sentiment based on engagement (short responses are negative signals)
    const adjustedScore = this.adjustScoreForEngagement(sentimentScore, engagement, wordCount);

    // Determine sentiment direction and confidence
    const direction = this.getSentimentDirection(adjustedScore);
    const confidence = this.calculateConfidence(adjustedScore, wordCount, cleanText);

    // Add to history and calculate trend
    this.addToHistory(adjustedScore, text, wordCount);
    const trend = this.calculateTrend();

    // Get indicators that influenced this analysis
    const indicators = this.getIndicators(cleanText, adjustedScore, engagement);

    // Get suggested response strategy
    const suggestedResponse = this.getSuggestedResponse(direction, engagement, adjustedScore);

    const analysis: SentimentAnalysis = {
      score: adjustedScore,
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
      score: adjustedScore,
      direction,
      engagement,
      confidence
    });

    return analysis;
  }

  /**
   * Calculate raw sentiment score from word analysis
   */
  private calculateSentimentScore(text: string): number {
    let score = 0;
    const words = text.split(' ');

    // Positive word scoring
    Object.entries(this.sentimentWords.positive).forEach(([intensity, wordList]) => {
      const weight = intensity === 'high' ? 15 : intensity === 'medium' ? 8 : 3;
      wordList.forEach(word => {
        if (text.includes(word)) {
          score += weight;
        }
      });
    });

    // Negative word scoring
    Object.entries(this.sentimentWords.negative).forEach(([intensity, wordList]) => {
      const weight = intensity === 'high' ? -15 : intensity === 'medium' ? -8 : -3;
      wordList.forEach(word => {
        if (text.includes(word)) {
          score += weight;
        }
      });
    });

    // Curiosity is positive (shows engagement)
    this.sentimentWords.curiosity.forEach(word => {
      if (text.includes(word)) {
        score += 5;
      }
    });

    // Hesitation is negative
    this.sentimentWords.hesitation.forEach(word => {
      if (text.includes(word)) {
        score -= 5;
      }
    });

    // Exit language is very negative
    this.sentimentWords.exit_language.forEach(phrase => {
      if (text.includes(phrase)) {
        score -= 20;
      }
    });

    return Math.max(-100, Math.min(100, score));
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