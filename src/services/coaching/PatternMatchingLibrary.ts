/**
 * VoiceCoach V2 - Pattern Matching Library
 * Instant tool selection without AI using keyword/regex/sentiment/stage matching
 * Target: 60-70% hit rate for common patterns
 * LED Breadcrumbs: 6600-6649
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { ToolTemplateEngine, ToolTemplate } from './ToolTemplateEngine';

/**
 * Matching context for tool selection
 */
export interface MatchingContext {
  transcript: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  stage?: number; // 1-9 conversation stage
  conversationHistory?: Array<{ speaker: string; text: string }>;
}

/**
 * Pattern match result
 */
export interface PatternMatchResult {
  toolId: number;
  toolName: string;
  matchType: 'keyword' | 'regex' | 'combined';
  matchedPattern: string;
  score: number; // 0-100 match strength (for debugging/logging only)
}

/**
 * Pattern Matching Library
 * Fast tool selection using triggers from ToolTemplateEngine
 */
export class PatternMatchingLibrary {
  private trail: BreadcrumbTrail;
  private templateEngine: ToolTemplateEngine;

  constructor(templateEngine: ToolTemplateEngine) {
    this.trail = new BreadcrumbTrail('PatternMatchingLibrary');
    this.templateEngine = templateEngine;

    this.trail.light(6600, {
      operation: 'pattern_matching_library_initialized',
      timestamp: Date.now()
    });
  }

  /**
   * Get tools (lazy-loaded from template engine)
   */
  private get tools(): ToolTemplate[] {
    return this.templateEngine.getAllTools();
  }

  /**
   * Match transcript to best tool using pattern matching
   * Returns null if no confident match found (requires AI fallback)
   */
  matchTool(context: MatchingContext): PatternMatchResult | null {
    const startTime = performance.now();

    try {
      this.trail.light(6601, {
        operation: 'pattern_matching_start',
        transcriptLength: context.transcript.length,
        sentiment: context.sentiment,
        stage: context.stage,
        availableTools: this.tools.length
      });

      const transcript = context.transcript.toLowerCase();
      const matchScores: Array<{ tool: ToolTemplate; score: number; matchType: string; pattern: string }> = [];

      // Try matching against all tools
      for (const tool of this.tools) {
        const match = this.matchSingleTool(tool, transcript, context);
        if (match) {
          matchScores.push(match);

          this.trail.light(6611, {
            operation: 'tool_scored',
            toolId: tool.id,
            toolName: tool.name,
            score: match.score,
            matchType: match.matchType
          });
        }
      }

      this.trail.light(6612, {
        operation: 'all_tools_evaluated',
        totalCandidates: matchScores.length,
        topScore: matchScores[0]?.score || 0
      });

      // Sort by score descending
      matchScores.sort((a, b) => b.score - a.score);

      // Return best match if score is sufficient
      if (matchScores.length > 0) {
        const bestMatch = matchScores[0];

        // Only return if score is above threshold (60+)
        if (bestMatch.score >= 60) {
          const processingTime = performance.now() - startTime;

          const result: PatternMatchResult = {
            toolId: bestMatch.tool.id,
            toolName: bestMatch.tool.name,
            matchType: bestMatch.matchType as 'keyword' | 'regex' | 'combined',
            matchedPattern: bestMatch.pattern,
            score: bestMatch.score
          };

          this.trail.light(6602, {
            operation: 'pattern_match_found',
            toolId: result.toolId,
            toolName: result.toolName,
            matchType: result.matchType,
            score: result.score,
            processingTime
          });

          return result;
        }
      }

      // No confident match found
      this.trail.light(6604, {
        operation: 'no_pattern_match',
        candidateCount: matchScores.length,
        topScore: matchScores[0]?.score || 0,
        processingTime: performance.now() - startTime
      });

      return null;

    } catch (error) {
      this.trail.fail(8600, error as Error, {
        transcriptLength: context.transcript.length
      });
      return null;
    }
  }

  /**
   * Match transcript against a single tool's triggers
   */
  private matchSingleTool(
    tool: ToolTemplate,
    transcript: string,
    context: MatchingContext
  ): { tool: ToolTemplate; score: number; matchType: string; pattern: string } | null {
    let score = 0;
    let matchType = '';
    let matchedPattern = '';

    // 1. Keyword matching (most common, fastest)
    const keywordMatch = this.matchKeywords(tool.triggers.keywords, transcript);
    if (keywordMatch.matched) {
      score += 40; // Base score for keyword match
      matchType = 'keyword';
      matchedPattern = keywordMatch.pattern;

      this.trail.light(6610, {
        operation: 'keyword_match_found',
        toolId: tool.id,
        toolName: tool.name,
        matchedKeyword: keywordMatch.pattern,
        initialScore: score
      });
    }

    // 2. Regex matching (fallback for complex patterns)
    if (tool.triggers.regex && !keywordMatch.matched) {
      const regexMatch = this.matchRegex(tool.triggers.regex, transcript);
      if (regexMatch.matched) {
        score += 35; // Slightly lower than keyword
        matchType = 'regex';
        matchedPattern = regexMatch.pattern;
      }
    }

    // If no keyword or regex match, return null
    if (score === 0) {
      return null;
    }

    // 3. Sentiment bias boost/penalty
    if (context.sentiment && tool.triggers.sentimentBias) {
      if (context.sentiment === tool.triggers.sentimentBias) {
        score += 20; // Strong sentiment match
        matchType = matchType ? 'combined' : 'sentiment';
      } else if (
        (context.sentiment === 'negative' && tool.triggers.sentimentBias === 'positive') ||
        (context.sentiment === 'positive' && tool.triggers.sentimentBias === 'negative')
      ) {
        score -= 15; // Sentiment mismatch penalty
      }
    }

    // 4. Stage bias boost with progressive bonuses
    if (context.stage && tool.triggers.stageBias) {
      if (tool.triggers.stageBias.includes(context.stage)) {
        // Progressive stage bonuses based on tool type
        let stageBonus = 15; // Base bonus

        // Tool 1 (Mirroring) - strong boost for early stages (1-3)
        if (tool.id === 1 && context.stage <= 3) {
          stageBonus = 25;
        }

        // Tool 13 (Take Away) - strong boost for late stages (7-9)
        if (tool.id === 13 && context.stage >= 7) {
          stageBonus = 30;
        }

        // Tool 10 (Buy-In) - strong boost for mid-late stages with positive sentiment
        if (tool.id === 10 && context.stage >= 5 && context.sentiment === 'positive') {
          stageBonus = 25;
        }

        score += stageBonus;
        matchType = matchType === 'combined' ? 'combined' : matchType;
      } else {
        // Progressive penalty for stage mismatch
        let stagePenalty = -5; // Base penalty

        // Tool 13 (Take Away) - heavy penalty for early stages (1-5)
        if (tool.id === 13 && context.stage && context.stage < 6) {
          stagePenalty = -25;
        }

        // Tool 1 (Mirroring) - minor penalty for late stages (just less preferred)
        if (tool.id === 1 && context.stage && context.stage >= 8) {
          stagePenalty = -10;
        }

        score += stagePenalty;
      }
    }

    // Ensure score stays in 0-100 range
    score = Math.max(0, Math.min(100, score));

    return { tool, score, matchType, pattern: matchedPattern };
  }

  /**
   * Match keywords against transcript
   */
  private matchKeywords(
    keywords: string[],
    transcript: string
  ): { matched: boolean; pattern: string } {
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      if (transcript.includes(keywordLower)) {
        return { matched: true, pattern: keyword };
      }
    }
    return { matched: false, pattern: '' };
  }

  /**
   * Match regex pattern against transcript
   */
  private matchRegex(
    regexPattern: string,
    transcript: string
  ): { matched: boolean; pattern: string } {
    try {
      const regex = new RegExp(regexPattern, 'i');
      const match = transcript.match(regex);

      if (match) {
        this.trail.light(6603, {
          operation: 'regex_match_found',
          pattern: regexPattern,
          matchedText: match[0]
        });
        return { matched: true, pattern: match[0] };
      }

      return { matched: false, pattern: '' };

    } catch (error) {
      this.trail.light(8601, {
        operation: 'regex_match_failed',
        pattern: regexPattern,
        error: (error as Error).message
      });
      return { matched: false, pattern: '' };
    }
  }

  /**
   * Removed: scoreToConfidence - confidence levels removed from system
   * Pattern either matches (score >= 60) or doesn't match (score < 60)
   */

  /**
   * Get all tools that match with any confidence
   * Useful for showing multiple suggestions
   */
  matchMultipleTools(
    context: MatchingContext,
    minScore: number = 50
  ): PatternMatchResult[] {
    const transcript = context.transcript.toLowerCase();
    const results: PatternMatchResult[] = [];

    for (const tool of this.tools) {
      const match = this.matchSingleTool(tool, transcript, context);
      if (match && match.score >= minScore) {
        results.push({
          toolId: match.tool.id,
          toolName: match.tool.name,
          matchType: match.matchType as 'keyword' | 'regex' | 'combined',
          matchedPattern: match.pattern,
          score: match.score
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    this.trail.light(6605, {
      operation: 'multiple_tools_matched',
      matchCount: results.length,
      minScore,
      topScores: results.slice(0, 3).map(r => ({ toolId: r.toolId, score: r.score }))
    });

    return results;
  }

  /**
   * Get statistics about pattern matching performance
   */
  getMatchingStats(): {
    totalTools: number;
    toolsWithKeywords: number;
    toolsWithRegex: number;
    toolsWithSentimentBias: number;
    toolsWithStageBias: number;
  } {
    return {
      totalTools: this.tools.length,
      toolsWithKeywords: this.tools.filter(t => t.triggers.keywords.length > 0).length,
      toolsWithRegex: this.tools.filter(t => t.triggers.regex).length,
      toolsWithSentimentBias: this.tools.filter(t => t.triggers.sentimentBias).length,
      toolsWithStageBias: this.tools.filter(t => t.triggers.stageBias).length
    };
  }

  /**
   * Test pattern matching against a set of example transcripts
   * Useful for debugging and optimization
   */
  testPatterns(
    examples: Array<{ transcript: string; expectedToolId: number; context?: Partial<MatchingContext> }>
  ): {
    totalTests: number;
    passed: number;
    failed: number;
    accuracy: number;
    results: Array<{ transcript: string; expected: number; actual: number | null; passed: boolean }>;
  } {
    const results = examples.map(example => {
      const context: MatchingContext = {
        transcript: example.transcript,
        sentiment: example.context?.sentiment,
        stage: example.context?.stage
      };

      const match = this.matchTool(context);
      const actual = match?.toolId || null;
      const passed = actual === example.expectedToolId;

      return {
        transcript: example.transcript,
        expected: example.expectedToolId,
        actual,
        passed
      };
    });

    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;
    const accuracy = results.length > 0 ? (passed / results.length) * 100 : 0;

    this.trail.light(6606, {
      operation: 'pattern_testing_complete',
      totalTests: results.length,
      passed,
      failed,
      accuracy: accuracy.toFixed(1)
    });

    return {
      totalTests: results.length,
      passed,
      failed,
      accuracy,
      results
    };
  }
}
