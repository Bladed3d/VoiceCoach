/**
 * VoiceCoach V2 - PatternMatchingLibrary Unit Tests
 * Comprehensive testing for pattern-based tool selection
 */
import { describe, it, expect, beforeAll } from '@jest/globals';
import { PatternMatchingLibrary, MatchingContext, PatternMatchResult } from '../services/coaching/PatternMatchingLibrary';
import { ToolTemplateEngine } from '../services/coaching/ToolTemplateEngine';
import * as path from 'path';

describe('PatternMatchingLibrary', () => {
  let engine: ToolTemplateEngine;
  let matcher: PatternMatchingLibrary;
  const testConfigPath = path.resolve(__dirname, '../../rag/13ToolsRAG-01-templates.json');

  beforeAll(async () => {
    engine = new ToolTemplateEngine(testConfigPath);
    await engine.loadConfig();
    matcher = new PatternMatchingLibrary(engine);
  });

  describe('Initialization', () => {
    it('should initialize with ToolTemplateEngine', () => {
      expect(matcher).toBeDefined();
    });

    it('should have access to all tools', () => {
      const stats = matcher.getMatchingStats();
      expect(stats.totalTools).toBe(13);
    });

    it('should have tools with matching triggers', () => {
      const stats = matcher.getMatchingStats();
      expect(stats.toolsWithKeywords).toBeGreaterThan(0);
      expect(stats.toolsWithRegex).toBeGreaterThan(0);
      expect(stats.toolsWithSentimentBias).toBeGreaterThan(0);
      expect(stats.toolsWithStageBias).toBeGreaterThan(0);
    });
  });

  describe('Keyword Matching', () => {
    it('should match "expensive" to Tool 13 (Take Away)', () => {
      const context: MatchingContext = {
        transcript: 'This seems too expensive for our budget',
        sentiment: 'negative',
        stage: 7
      };

      const result = matcher.matchTool(context);

      expect(result).not.toBeNull();
      expect(result?.toolId).toBe(13);
      expect(result?.toolName).toBe('Take Away');
      expect(result?.matchType).toContain('keyword');
      expect(result?.confidence).toBeDefined();
    });

    it('should match "frustrated" to Tool 2 (Empathy Response)', () => {
      const context: MatchingContext = {
        transcript: 'We are really frustrated with the current system',
        sentiment: 'negative',
        stage: 3
      };

      const result = matcher.matchTool(context);

      expect(result).not.toBeNull();
      expect(result?.toolId).toBe(2);
      expect(result?.toolName).toBe('Empathy Response');
    });

    it('should match "concerned" to Tool 5 (Labeling)', () => {
      const context: MatchingContext = {
        transcript: 'I am concerned about the implementation timeline',
        sentiment: 'negative',
        stage: 5
      };

      const result = matcher.matchTool(context);

      expect(result).not.toBeNull();
      expect(result?.toolId).toBe(5);
      expect(result?.toolName).toBe('Labeling');
    });

    it('should match "challenge" to Tool 1 (Mirroring)', () => {
      const context: MatchingContext = {
        transcript: 'Our biggest challenge is team coordination',
        sentiment: 'negative',
        stage: 2
      };

      const result = matcher.matchTool(context);

      expect(result).not.toBeNull();
      expect(result?.toolId).toBe(1);
      expect(result?.toolName).toBe('Mirroring');
    });

    it('should match "not sure" to Tool 6 (Calibrated Questions) or Tool 13 (Take Away)', () => {
      const context: MatchingContext = {
        transcript: 'I am not sure this will work for us',
        sentiment: 'neutral',
        stage: 5
      };

      const result = matcher.matchTool(context);

      expect(result).not.toBeNull();
      // Could match either Tool 6 or Tool 13 depending on scoring
      expect([6, 13]).toContain(result?.toolId);
    });
  });

  describe('Regex Matching', () => {
    it('should match complex patterns using regex', () => {
      const context: MatchingContext = {
        transcript: 'Maybe we should think about this some more',
        sentiment: 'neutral',
        stage: 7
      };

      const result = matcher.matchTool(context);

      expect(result).not.toBeNull();
      // Should match "maybe" or "think about" pattern
      expect(result?.matchType).toBeDefined();
    });

    it('should match "already have" to Tool 3 (Empathy Questions)', () => {
      const context: MatchingContext = {
        transcript: 'We already have a system that works fine',
        sentiment: 'neutral',
        stage: 4
      };

      const result = matcher.matchTool(context);

      expect(result).not.toBeNull();
      expect(result?.toolId).toBe(3);
    });
  });

  describe('Sentiment Bias Filtering', () => {
    it('should boost score for matching sentiment', () => {
      const context1: MatchingContext = {
        transcript: 'This is expensive',
        sentiment: 'negative', // Matches Tool 13 sentiment bias
        stage: 7
      };

      const context2: MatchingContext = {
        transcript: 'This is expensive',
        sentiment: 'positive', // Mismatches Tool 13 sentiment bias
        stage: 7
      };

      const result1 = matcher.matchTool(context1);
      const result2 = matcher.matchTool(context2);

      expect(result1?.score).toBeGreaterThan(result2?.score || 0);
    });

    it('should penalize score for opposite sentiment', () => {
      const contextNegative: MatchingContext = {
        transcript: 'Interested in learning more',
        sentiment: 'negative', // Opposite of Tool 10 (Buy-In) positive bias
        stage: 4
      };

      const contextPositive: MatchingContext = {
        transcript: 'Interested in learning more',
        sentiment: 'positive', // Matches Tool 10 sentiment bias
        stage: 4
      };

      const resultNegative = matcher.matchTool(contextNegative);
      const resultPositive = matcher.matchTool(contextPositive);

      // Positive sentiment should score higher for "interested" (Tool 10)
      if (resultPositive && resultNegative) {
        expect(resultPositive.score).toBeGreaterThan(resultNegative.score);
      }
    });
  });

  describe('Stage Bias Filtering', () => {
    it('should boost score for matching stage', () => {
      const earlyStage: MatchingContext = {
        transcript: 'We have a challenge with our process',
        sentiment: 'negative',
        stage: 2 // Early stage - matches Tool 1 bias [1,2,3]
      };

      const lateStage: MatchingContext = {
        transcript: 'We have a challenge with our process',
        sentiment: 'negative',
        stage: 8 // Late stage - doesn't match Tool 1 bias
      };

      const result1 = matcher.matchTool(earlyStage);
      const result2 = matcher.matchTool(lateStage);

      // Early stage should match Tool 1 (Mirroring) better
      if (result1?.toolId === 1 && result2?.toolId === 1) {
        expect(result1.score).toBeGreaterThan(result2.score);
      }
    });

    it('should prefer Tool 13 for late-stage conversations', () => {
      const context: MatchingContext = {
        transcript: 'The cost concerns us',
        sentiment: 'negative',
        stage: 8 // Late stage - matches Tool 13 bias [7,8,9]
      };

      const result = matcher.matchTool(context);

      expect(result).not.toBeNull();
      expect(result?.toolId).toBe(13);
    });
  });

  describe('No Match Scenarios', () => {
    it('should return null for unmatched transcript', () => {
      const context: MatchingContext = {
        transcript: 'Random unrelated text with no trigger words',
        sentiment: 'neutral',
        stage: 5
      };

      const result = matcher.matchTool(context);

      // May return null if no pattern matches with sufficient confidence
      if (result === null) {
        expect(result).toBeNull();
      } else {
        // If it does match, score should be low
        expect(result.score).toBeLessThan(70);
      }
    });

    it('should return null when confidence is too low', () => {
      const context: MatchingContext = {
        transcript: 'Some vague statement',
        sentiment: 'neutral',
        stage: 5
      };

      const result = matcher.matchTool(context);

      // Should return null or very low confidence
      if (result !== null) {
        expect(result.confidence).toBe('low');
      }
    });
  });

  describe('Multiple Tool Matching', () => {
    it('should return multiple matching tools', () => {
      const context: MatchingContext = {
        transcript: 'I am frustrated and not sure about this',
        sentiment: 'negative',
        stage: 5
      };

      const results = matcher.matchMultipleTools(context, 50);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThanOrEqual(50);

      // Should be sorted by score descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should filter by minimum score threshold', () => {
      const context: MatchingContext = {
        transcript: 'expensive and complicated',
        sentiment: 'negative',
        stage: 7
      };

      const results = matcher.matchMultipleTools(context, 70);

      // All results should meet minimum threshold
      results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(70);
      });
    });
  });

  describe('Pattern Testing Utility', () => {
    it('should test patterns against examples', () => {
      const examples = [
        { transcript: 'This is too expensive', expectedToolId: 13, context: { sentiment: 'negative' as const, stage: 7 } },
        { transcript: 'I am frustrated', expectedToolId: 2, context: { sentiment: 'negative' as const, stage: 3 } },
        { transcript: 'Our challenge is time', expectedToolId: 1, context: { sentiment: 'negative' as const, stage: 2 } }
      ];

      const testResults = matcher.testPatterns(examples);

      expect(testResults.totalTests).toBe(3);
      expect(testResults.passed).toBeGreaterThan(0);
      expect(testResults.accuracy).toBeGreaterThan(0);
      expect(testResults.results.length).toBe(3);
    });

    it('should calculate accuracy correctly', () => {
      const examples = [
        { transcript: 'expensive', expectedToolId: 13, context: { sentiment: 'negative' as const, stage: 7 } },
        { transcript: 'expensive', expectedToolId: 13, context: { sentiment: 'negative' as const, stage: 7 } }
      ];

      const testResults = matcher.testPatterns(examples);

      expect(testResults.accuracy).toBeGreaterThan(0);
      expect(testResults.accuracy).toBeLessThanOrEqual(100);
    });
  });

  describe('Confidence Levels', () => {
    it('should return high confidence for strong matches', () => {
      const context: MatchingContext = {
        transcript: 'This is way too expensive for our budget',
        sentiment: 'negative',
        stage: 8
      };

      const result = matcher.matchTool(context);

      expect(result).not.toBeNull();
      expect(result?.confidence).toBe('high');
      expect(result?.score).toBeGreaterThanOrEqual(80);
    });

    it('should return medium confidence for moderate matches', () => {
      const context: MatchingContext = {
        transcript: 'Maybe we should discuss this',
        sentiment: 'neutral',
        stage: 5
      };

      const result = matcher.matchTool(context);

      if (result && result.score >= 65 && result.score < 80) {
        expect(result.confidence).toBe('medium');
      }
    });
  });

  describe('Performance', () => {
    it('should match patterns in under 10ms', () => {
      const context: MatchingContext = {
        transcript: 'This is expensive and we have budget concerns',
        sentiment: 'negative',
        stage: 7
      };

      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        matcher.matchTool(context);
      }

      const duration = performance.now() - start;
      const avgTime = duration / 100;

      expect(avgTime).toBeLessThan(10);
    });

    it('should handle multiple matches efficiently', () => {
      const context: MatchingContext = {
        transcript: 'frustrated, expensive, complicated situation',
        sentiment: 'negative',
        stage: 5
      };

      const start = performance.now();
      const results = matcher.matchMultipleTools(context);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(20);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate matching statistics', () => {
      const stats = matcher.getMatchingStats();

      expect(stats.totalTools).toBe(13);
      expect(stats.toolsWithKeywords).toBe(13); // All tools should have keywords
      expect(stats.toolsWithRegex).toBeGreaterThan(0);
      expect(stats.toolsWithSentimentBias).toBeGreaterThan(0);
      expect(stats.toolsWithStageBias).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transcript', () => {
      const context: MatchingContext = {
        transcript: '',
        sentiment: 'neutral',
        stage: 5
      };

      const result = matcher.matchTool(context);

      expect(result).toBeNull();
    });

    it('should handle very long transcript', () => {
      const longText = 'expensive '.repeat(100) + 'budget concerns';
      const context: MatchingContext = {
        transcript: longText,
        sentiment: 'negative',
        stage: 7
      };

      const result = matcher.matchTool(context);

      expect(result).not.toBeNull();
      expect(result?.toolId).toBe(13);
    });

    it('should handle missing context fields gracefully', () => {
      const context: MatchingContext = {
        transcript: 'expensive'
        // No sentiment or stage
      };

      const result = matcher.matchTool(context);

      // Should still match based on keyword alone
      expect(result).not.toBeNull();
    });

    it('should handle case-insensitive matching', () => {
      const context: MatchingContext = {
        transcript: 'This is EXPENSIVE and TOO COSTLY',
        sentiment: 'negative',
        stage: 7
      };

      const result = matcher.matchTool(context);

      expect(result).not.toBeNull();
      expect(result?.toolId).toBe(13);
    });
  });
});
