/**
 * VoiceCoach V2 - Simplified Tool Selector
 * Uses pattern matching first, AI classification as fallback
 * Replaces complex sentiment logic with simple two-step approach
 * LED Breadcrumbs: 6500-6505
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { PatternMatchingLibrary, MatchingContext } from './PatternMatchingLibrary';
import { ToolTemplateEngine } from './ToolTemplateEngine';
import { OllamaCoachingService } from './ollama-service';
import type { EngagementLevel, SentimentTrend } from './sentiment-analyzer';

export interface ToolSelection {
  toolId: number;
  toolName: string;
  confidence: 'high' | 'medium' | 'low';
  method: 'pattern' | 'ai';
  processingTime: number;
  matchedPattern?: string;
}

export interface EnhancedSentimentContext {
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;        // -100 to +100
  engagement?: EngagementLevel;   // 'high' | 'medium' | 'low'
  trend?: SentimentTrend;         // 'improving' | 'declining' | 'stable'
  responseLength?: number;        // Word count
}

/**
 * Simplified Tool Selector
 * Step 1: Try pattern matching (instant, 60-70% hit rate)
 * Step 2: Fall back to AI classification if needed
 */
export class SentimentToolSelector {
  private trail: BreadcrumbTrail;
  private patternMatcher: PatternMatchingLibrary;
  private templateEngine: ToolTemplateEngine;
  private ollamaService: OllamaCoachingService;

  constructor(
    templateEngine: ToolTemplateEngine,
    ollamaService: OllamaCoachingService
  ) {
    this.trail = new BreadcrumbTrail('SentimentToolSelector');
    this.templateEngine = templateEngine;
    this.patternMatcher = new PatternMatchingLibrary(templateEngine);
    this.ollamaService = ollamaService;

    this.trail.light(6500, {
      operation: 'simplified_tool_selector_initialized',
      approach: 'pattern_first_ai_fallback',
      timestamp: Date.now()
    });
  }

  /**
   * Select tool using pattern matching first, AI fallback second
   * Now supports enhanced sentiment context (engagement, trend, score)
   */
  async selectTool(
    transcript: string,
    sentiment?: 'positive' | 'negative' | 'neutral',
    stage?: number,
    enhancedContext?: EnhancedSentimentContext
  ): Promise<ToolSelection> {
    const startTime = performance.now();

    this.trail.light(6501, {
      operation: 'tool_selection_start',
      transcriptLength: transcript.length,
      sentiment: enhancedContext?.sentiment || sentiment,
      stage,
      engagement: enhancedContext?.engagement,
      trend: enhancedContext?.trend,
      sentimentScore: enhancedContext?.sentimentScore
    });

    // Step 1: Try pattern matching (instant)
    const matchingContext: MatchingContext = {
      transcript,
      sentiment,
      stage
    };

    const patternMatch = this.patternMatcher.matchTool(matchingContext);

    if (patternMatch && patternMatch.confidence === 'high') {
      // High confidence pattern match - use immediately
      const processingTime = performance.now() - startTime;

      this.trail.light(6502, {
        operation: 'pattern_match_success',
        toolId: patternMatch.toolId,
        toolName: patternMatch.toolName,
        confidence: patternMatch.confidence,
        processingTime
      });

      return {
        toolId: patternMatch.toolId,
        toolName: patternMatch.toolName,
        confidence: patternMatch.confidence,
        method: 'pattern',
        processingTime,
        matchedPattern: patternMatch.matchedPattern
      };
    }

    // Step 2: Pattern match failed or low confidence - use AI classification
    this.trail.light(6503, {
      operation: 'pattern_match_insufficient',
      patternScore: patternMatch?.score || 0,
      fallingBackToAI: true
    });

    const aiToolId = await this.aiSelectTool(
      transcript,
      enhancedContext?.sentiment || sentiment,
      stage,
      enhancedContext
    );
    const processingTime = performance.now() - startTime;

    if (aiToolId) {
      const tool = this.templateEngine.getTool(aiToolId);

      this.trail.light(6504, {
        operation: 'ai_selection_success',
        toolId: aiToolId,
        toolName: tool?.name,
        processingTime
      });

      return {
        toolId: aiToolId,
        toolName: tool?.name || `Tool ${aiToolId}`,
        confidence: 'medium',
        method: 'ai',
        processingTime
      };
    }

    // Fallback to default tool (Mirroring)
    this.trail.light(6505, {
      operation: 'fallback_to_default',
      defaultTool: 1,
      processingTime
    });

    return {
      toolId: 1,
      toolName: 'Mirroring',
      confidence: 'low',
      method: 'ai',
      processingTime
    };
  }

  /**
   * AI-based tool classification (fallback method)
   * Returns tool ID (1-13) or null if classification fails
   * Now uses enhanced sentiment context for better accuracy
   */
  private async aiSelectTool(
    transcript: string,
    sentiment?: string,
    stage?: number,
    enhancedContext?: EnhancedSentimentContext
  ): Promise<number | null> {
    try {
      const tools = this.templateEngine.getAllTools();
      const toolList = tools.map(t => `${t.id}. ${t.name} - ${t.when_use}`).join('\n');

      // Build enhanced context string
      const engagement = enhancedContext?.engagement || 'unknown';
      const trend = enhancedContext?.trend || 'unknown';
      const score = enhancedContext?.sentimentScore !== undefined ? enhancedContext.sentimentScore : 'unknown';
      const responseLength = enhancedContext?.responseLength || 'unknown';

      const prompt = `You are an expert sales coach. Select the best coaching tool (1-13).

SITUATION:
Transcript: "${transcript}"
Sentiment: ${sentiment || 'unknown'} (score: ${score}/100, trend: ${trend})
Engagement: ${engagement} (response length: ${responseLength} words)
Stage: ${stage || 'unknown'}/9

CRITICAL DECISION RULES:

0. **ENGAGEMENT LEVEL FIRST** (Most Important):
   - LOW engagement (1-3 word responses) → MUST use Mirroring (1) or Empathy Questions (3) to re-engage
   - LOW engagement → NEVER use complex tools like Calibrated Questions (6), Buy-In (10), or Summarizing (4)
   - HIGH engagement (>10 words) + positive → Buy-In (10) or Calibrated Questions (6) to advance
   - HIGH engagement + negative → Labeling (5) or Empathy Response (2) to address emotions

1. **SENTIMENT TREND** (Critical Context):
   - DECLINING trend + negative score → Take Away (13) or DJ Voice (11) - prospect pulling away
   - DECLINING trend + any stage → Address immediately with defusal tools
   - IMPROVING trend + negative → Empathy Response (2) or Labeling (5) - DON'T use Take Away, they're coming around
   - IMPROVING trend + positive → Buy-In (10) to capitalize on momentum
   - STABLE + stuck (neutral, mid-conversation) → Negative Assumption (7) or Mirroring (1) to reset

2. BUYING SIGNALS (they WANT to buy, just need help):
   - "I see value BUT timing/budget/team" → Mirroring (1) or Calibrated Questions (6)
   - "Execs want it BUT middle management" → Mirroring (1), Calibrated Questions (6), or Negative Assumption (7)
   - DON'T use Take Away (13) - they want to buy!

3. EMOTION INTENSITY:
   - STRONG emotions (exhausted, fed up, tired, overwhelmed, no energy) → Labeling (5)
   - MODERATE emotions (concerned, worried, hesitant) → Empathy Response (2)
   - NO clear emotion → Mirroring (1) or Empathy Questions (3)

4. STAGE + OBJECTION TYPE:
   - Stage 4-6 + strong negative emotions → Labeling (5)
   - Stage 7-9 + strong skepticism ("bad experiences", "not convinced") → Take Away (13)
   - Late stage + "take it back to team" → Labeling (5) to uncover real issue

5. VAGUE vs SPECIFIC:
   - Vague concerns (no details given) → Mirroring (1) or Empathy Questions (3)
   - Specific objections → Address with Labeling (5), Negative Assumption (7), or Take Away (13)

6. QUALIFICATION:
   - "Need approval" at late stage → Calibrated Questions (6) to reframe budget/value
   - Not talking to decision maker → Use Calibrated Questions (6)

7. GOING IN CIRCLES:
   - Frustration with stuck progress → Negative Assumption (7) + Calibrated Questions (6)
   - NOT DJ Voice (11) - that's for hostile escalation only

AVAILABLE TOOLS:
${toolList}

Respond with ONLY the tool number (1-13).`;

      const response = await this.ollamaService.generateRawResponse(prompt);
      const toolIdMatch = response?.match(/\d+/);

      if (toolIdMatch) {
        const toolId = parseInt(toolIdMatch[0], 10);
        if (toolId >= 1 && toolId <= 13) {
          return toolId;
        }
      }

      return null;

    } catch (error) {
      this.trail.fail(8500, error as Error);
      return null;
    }
  }

  /**
   * Get statistics about tool selector performance
   */
  getStats(): Record<string, any> {
    const matchingStats = this.patternMatcher.getMatchingStats();

    return {
      approach: 'pattern_first_ai_fallback',
      pattern_matching: matchingStats,
      breadcrumb_range: '6500-6505'
    };
  }
}
