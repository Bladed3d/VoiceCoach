/**
 * VoiceCoach V2 - MEFS Coaching Orchestrator
 * Orchestrates all MEFS components to provide intelligent coaching suggestions
 * Replaces generic keyword matching with context-aware prompting
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { SalesStageTracker, SalesStage, StageDetectionResult } from './sales-stage-tracker';
import { SentimentAnalyzer, SentimentAnalysis } from './sentiment-analyzer';
import { MEFSTracker, MEFSState } from './mefs-tracker';
import { SmartToolSelector, ToolSelection } from './smart-tool-selector';

export interface ConversationEntry {
  speaker: 'user' | 'prospect';
  text: string;
  timestamp: string;
}

export interface MEFSCoachingContext {
  conversationHistory: ConversationEntry[];
  currentTranscript: string;
  processedDocument?: any; // RAG document with 13 tools
}

export interface MEFSCoachingResult {
  // Core coaching suggestion
  tool_to_use: string;
  exact_words: string;
  why_this_tool: string;
  expected_response: string;
  mefs_target: string;
  confidence: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  more_info: string;
  fallback: string;

  // Context that led to this suggestion
  context: {
    stage: SalesStage;
    stageConfidence: number;
    stageProgression: number;
    sentiment: SentimentAnalysis;
    mefsState: MEFSState;
    toolSelection: ToolSelection;
  };

  // For UI display
  displayInfo: {
    stageDisplay: string;
    mefsScores: { [key: string]: number };
    sentimentDisplay: string;
    urgencyReason: string;
  };
}

export class MEFSCoachingOrchestrator {
  private trail: BreadcrumbTrail;
  private stageTracker: SalesStageTracker;
  private sentimentAnalyzer: SentimentAnalyzer;
  private mefsTracker: MEFSTracker;
  private toolSelector: SmartToolSelector;

  constructor() {
    this.trail = new BreadcrumbTrail('MEFSOrchestrator');

    // Initialize all components
    this.stageTracker = new SalesStageTracker();
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.mefsTracker = new MEFSTracker();
    this.toolSelector = new SmartToolSelector();

    this.trail.light(9050, {
      operation: 'mefs_orchestrator_initialized',
      timestamp: Date.now()
    });
  }

  /**
   * Generate intelligent coaching suggestion based on MEFS analysis
   */
  async generateCoachingSuggestion(context: MEFSCoachingContext): Promise<MEFSCoachingResult> {
    this.trail.light(9051, {
      operation: 'mefs_coaching_generation_start',
      conversationLength: context.conversationHistory.length,
      transcriptLength: context.currentTranscript.length
    });

    try {
      // Step 1: Analyze current sales stage
      const stageResult = this.stageTracker.analyzeConversation(context.conversationHistory);

      // Step 2: Analyze sentiment of last prospect response
      const lastProspectResponse = this.getLastProspectResponse(context.conversationHistory);
      const sentimentAnalysis = this.sentimentAnalyzer.analyzeResponse(
        lastProspectResponse?.text || context.currentTranscript,
        'prospect'
      );

      // Step 3: Update MEFS tracking
      const mefsState = this.mefsTracker.analyzeResponse(
        lastProspectResponse?.text || context.currentTranscript,
        'prospect',
        stageResult.currentStage
      );

      // Step 4: Select optimal tool
      const toolSelection = this.toolSelector.selectTool({
        stage: stageResult.currentStage,
        sentiment: sentimentAnalysis.direction,
        engagement: sentimentAnalysis.engagement,
        mefsState,
        recentTranscript: context.currentTranscript
      });

      // Step 5: Build final coaching result
      const result = this.buildCoachingResult(
        stageResult,
        sentimentAnalysis,
        mefsState,
        toolSelection,
        context
      );

      this.trail.light(9052, {
        operation: 'mefs_coaching_generation_complete',
        tool_selected: toolSelection.tool.name,
        confidence: toolSelection.confidence,
        stage: stageResult.currentStage,
        sentiment: sentimentAnalysis.direction
      });

      return result;

    } catch (error) {
      this.trail.fail(8051, error as Error);
      return this.generateFallbackResult(context);
    }
  }

  /**
   * Get the last response from the prospect
   */
  private getLastProspectResponse(history: ConversationEntry[]): ConversationEntry | null {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].speaker === 'prospect') {
        return history[i];
      }
    }
    return null;
  }

  /**
   * Build complete coaching result from all analyses
   */
  private buildCoachingResult(
    stageResult: StageDetectionResult,
    sentimentAnalysis: SentimentAnalysis,
    mefsState: MEFSState,
    toolSelection: ToolSelection,
    context: MEFSCoachingContext
  ): MEFSCoachingResult {

    return {
      // Core coaching suggestion
      tool_to_use: toolSelection.tool.name,
      exact_words: toolSelection.exact_words,
      why_this_tool: toolSelection.reasoning,
      expected_response: this.generateExpectedResponse(toolSelection),
      mefs_target: mefsState.primaryGap || 'engagement',
      confidence: toolSelection.confidence,
      urgency: toolSelection.urgency,
      more_info: toolSelection.tool.detailed_explanation,
      fallback: toolSelection.fallback_tool?.example_phrase || 'Tell me more about that...',

      // Context information
      context: {
        stage: stageResult.currentStage,
        stageConfidence: stageResult.confidence,
        stageProgression: stageResult.progression,
        sentiment: sentimentAnalysis,
        mefsState,
        toolSelection
      },

      // UI display information
      displayInfo: {
        stageDisplay: this.formatStageDisplay(stageResult),
        mefsScores: {
          Mental: mefsState.mental.score,
          Emotional: mefsState.emotional.score,
          Financial: mefsState.financial.score,
          Schedule: mefsState.schedule.score
        },
        sentimentDisplay: this.formatSentimentDisplay(sentimentAnalysis),
        urgencyReason: this.getUrgencyReason(toolSelection.urgency, sentimentAnalysis, mefsState)
      }
    };
  }

  /**
   * Generate expected response based on tool selection
   */
  private generateExpectedResponse(toolSelection: ToolSelection): string {
    const tool = toolSelection.tool;

    switch (tool.name) {
      case 'Mirroring':
        return 'They will elaborate and provide more details about their statement';
      case 'Calibrated Questions':
        return 'They will explain their perspective and reveal underlying concerns';
      case 'Take Away':
        return 'They will often counter and express more interest';
      case 'Proactive Validation':
        return 'They will feel heard and become more open to discussion';
      case 'No Means Yes':
        return 'A "no" answer that reveals their true position';
      case 'Buy-In':
        return 'Permission to continue and increased attention';
      case 'DJ Voice':
        return 'Reduced emotional tension and calmer discussion';
      default:
        return 'More engagement and information sharing';
    }
  }

  /**
   * Format stage information for display
   */
  private formatStageDisplay(stageResult: StageDetectionResult): string {
    const stageNames = {
      rapport: 'Building Rapport',
      discovery: 'Discovery & Needs',
      solution: 'Solution Presentation',
      objection_handling: 'Handling Objections',
      closing: 'Closing & Commitment',
      unknown: 'Determining Stage'
    };

    return `${stageNames[stageResult.currentStage]} (${Math.round(stageResult.confidence)}% confidence)`;
  }

  /**
   * Format sentiment information for display
   */
  private formatSentimentDisplay(sentiment: SentimentAnalysis): string {
    const direction = sentiment.direction.charAt(0).toUpperCase() + sentiment.direction.slice(1);
    const engagement = sentiment.engagement.charAt(0).toUpperCase() + sentiment.engagement.slice(1);

    return `${direction} sentiment, ${engagement} engagement (${sentiment.score > 0 ? '+' : ''}${sentiment.score})`;
  }

  /**
   * Get reason for urgency level
   */
  private getUrgencyReason(urgency: string, sentiment: SentimentAnalysis, mefs: MEFSState): string {
    switch (urgency) {
      case 'critical':
        return 'Negative sentiment + low engagement requires immediate attention';
      case 'high':
        return 'Strong resistance or major alignment gaps detected';
      case 'medium':
        return 'Moderate concerns or alignment opportunities identified';
      case 'low':
        return 'Conversation flowing well, continue current approach';
      default:
        return 'Standard coaching guidance';
    }
  }

  /**
   * Generate fallback result when analysis fails
   */
  private generateFallbackResult(context: MEFSCoachingContext): MEFSCoachingResult {
    const lastEntry = context.conversationHistory[context.conversationHistory.length - 1];
    const isProspect = lastEntry?.speaker === 'prospect';

    return {
      tool_to_use: 'Calibrated Questions',
      exact_words: isProspect ? 'Tell me more about that...' : 'What questions do you have?',
      why_this_tool: 'Fallback - analysis failed, using safe default',
      expected_response: 'More information and engagement',
      mefs_target: 'mental',
      confidence: 30,
      urgency: 'medium',
      more_info: 'Open-ended questions are safe and help gather information when context is unclear.',
      fallback: 'How does that make you feel?',

      context: {
        stage: 'unknown' as SalesStage,
        stageConfidence: 0,
        stageProgression: 0,
        sentiment: {
          score: 0,
          direction: 'neutral' as const,
          confidence: 0,
          engagement: 'medium' as const,
          trend: 'stable' as const,
          indicators: ['Fallback mode'],
          responseLength: 0,
          suggestedResponse: 'Ask clarifying questions'
        },
        mefsState: {
          mental: { score: 50, evidence: [], gaps: [], isActive: true },
          emotional: { score: 50, evidence: [], gaps: [], isActive: true },
          financial: { score: 50, evidence: [], gaps: [], isActive: false },
          schedule: { score: 50, evidence: [], gaps: [], isActive: false },
          overallAlignment: 50,
          primaryGap: null,
          recommendedFocus: []
        },
        toolSelection: {
          tool: this.toolSelector.getToolByName('Calibrated Questions')!,
          confidence: 30,
          reasoning: 'Fallback mode',
          exact_words: 'Tell me more about that...',
          urgency: 'medium'
        }
      },

      displayInfo: {
        stageDisplay: 'Analyzing conversation...',
        mefsScores: { Mental: 50, Emotional: 50, Financial: 50, Schedule: 50 },
        sentimentDisplay: 'Neutral sentiment, Medium engagement',
        urgencyReason: 'Gathering context for better coaching'
      }
    };
  }

  /**
   * Reset all tracking for new conversation
   */
  reset(): void {
    this.stageTracker.reset();
    this.sentimentAnalyzer.reset();
    this.mefsTracker.reset();

    this.trail.light(9053, {
      operation: 'mefs_orchestrator_reset',
      timestamp: Date.now()
    });
  }

  /**
   * Get current state for debugging/monitoring
   */
  getCurrentState(): {
    stage: SalesStage;
    sentimentTrend: string;
    mefsAlignment: number;
  } {
    const currentStage = this.stageTracker.getCurrentStage();
    const sentimentTrend = this.sentimentAnalyzer.getCurrentTrend();
    const mefsState = this.mefsTracker.getCurrentState(currentStage);

    return {
      stage: currentStage,
      sentimentTrend,
      mefsAlignment: mefsState.overallAlignment
    };
  }

  /**
   * Generate formatted prompt for Ollama based on MEFS context
   */
  buildOllamaPrompt(result: MEFSCoachingResult, knowledgeBase: string): string {
    const ctx = result.context;

    // Read the MEFS instruction template
    const template = `You are an expert sales coach providing real-time guidance during live sales conversations.
Use the detailed context below to provide precise, actionable coaching.

## Current Context
SALES STAGE: ${ctx.stage} (${ctx.stageConfidence}% confidence, ${ctx.stageProgression}% through process)
SENTIMENT: ${ctx.sentiment.direction} (score: ${ctx.sentiment.score}, trend: ${ctx.sentiment.trend})
ENGAGEMENT: ${ctx.sentiment.engagement} (response length: ${ctx.sentiment.responseLength} words)

## MEFS Alignment Status
Mental Alignment: ${ctx.mefsState.mental.score}% (${ctx.mefsState.mental.isActive ? 'ACTIVE' : 'inactive'})
Emotional Alignment: ${ctx.mefsState.emotional.score}% (${ctx.mefsState.emotional.isActive ? 'ACTIVE' : 'inactive'})
Financial Alignment: ${ctx.mefsState.financial.score}% (${ctx.mefsState.financial.isActive ? 'ACTIVE' : 'inactive'})
Schedule Alignment: ${ctx.mefsState.schedule.score}% (${ctx.mefsState.schedule.isActive ? 'ACTIVE' : 'inactive'})
Overall Alignment: ${ctx.mefsState.overallAlignment}%

Primary Gap: ${ctx.mefsState.primaryGap || 'None'}
Recommended Focus: ${ctx.mefsState.recommendedFocus.join(', ') || 'Continue current approach'}

## Recommended Tool Analysis
Tool: ${ctx.toolSelection.tool.name}
Confidence: ${ctx.toolSelection.confidence}%
Why Selected: ${ctx.toolSelection.reasoning}
Urgency: ${ctx.toolSelection.urgency}

## Available Knowledge Base
${knowledgeBase}

Respond with ONLY the exact JSON structure requested in your instructions.`;

    return template;
  }
}