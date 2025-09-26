/**
 * VoiceCoach V2 - Smart Tool Selector
 * Selects optimal coaching tool based on sales stage + sentiment + MEFS gaps
 * Implements the dual-axis tracking approach: Stage (X) + Sentiment (Y) = Perfect Tool
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { SalesStage } from './sales-stage-tracker';
import { SentimentDirection, EngagementLevel } from './sentiment-analyzer';
import { MEFSDimension, MEFSState } from './mefs-tracker';
import { SalesScriptService, ScriptStage } from './sales-script-service';

export interface ToolDefinition {
  name: string;
  description: string;
  when_to_use: string;
  example_phrase: string;
  detailed_explanation: string;
  primary_mefs: MEFSDimension[];     // Which MEFS dimensions this tool helps with
  appropriate_stages: SalesStage[];  // Which stages this tool works in
  sentiment_preference: SentimentDirection[]; // When this tool works best
  engagement_requirement: EngagementLevel[];  // Required engagement level
  effectiveness_score: number;      // 0-100 base effectiveness
}

export interface ToolSelection {
  tool: ToolDefinition;
  confidence: number;               // 0-100% confidence this is right tool
  reasoning: string;                // Why this tool was selected
  exact_words: string;             // Specific phrase to use
  fallback_tool?: ToolDefinition;  // Alternative if primary doesn't work
  urgency: 'low' | 'medium' | 'high' | 'critical';
  script_context?: {               // Script-aware context
    current_stage: number;
    stage_name: string;
    script_weight: number;         // How much the script favors this tool
    language_rules: Record<string, boolean>;
    adherence_score: number;
  };
}

export class SmartToolSelector {
  private trail: BreadcrumbTrail;
  private scriptService?: SalesScriptService;

  // The 13 tools mapped to our selection criteria
  private readonly tools: Record<string, ToolDefinition> = {
    'Mirroring': {
      name: 'Mirroring',
      description: 'Repeat last 1-3 words to build rapport and encourage elaboration',
      when_to_use: 'When you want to know more or dig deeper into their view',
      example_phrase: '"Too complicated?" (if they said "This is too complicated")',
      detailed_explanation: 'Mirroring creates instant rapport and makes them feel heard. Repeat their exact words with a questioning tone to get them to elaborate.',
      primary_mefs: ['mental', 'emotional'],
      appropriate_stages: ['rapport', 'discovery'],
      sentiment_preference: ['neutral', 'negative'],
      engagement_requirement: ['medium', 'high'],
      effectiveness_score: 85
    },

    'Proactive Validation': {
      name: 'Proactive Validation',
      description: 'Understand and articulate emotions to influence outcomes',
      when_to_use: 'When you want to create emotional bonding or when emotions rise',
      example_phrase: '"It must be challenging dealing with rising costs right now"',
      detailed_explanation: 'Acknowledge their pressures and emotions to create emotional connection and soften resistance.',
      primary_mefs: ['emotional'],
      appropriate_stages: ['rapport', 'discovery', 'objection_handling'],
      sentiment_preference: ['negative', 'neutral'],
      engagement_requirement: ['low', 'medium', 'high'],
      effectiveness_score: 90
    },

    'Emotional Response Validation': {
      name: 'Emotional Response Validation',
      description: 'Name emotions to diffuse tension and validate feelings',
      when_to_use: 'When detecting any emotional state (positive or negative)',
      example_phrase: '"It seems like you\'re concerned about the implementation timeline"',
      detailed_explanation: 'Label the emotions you observe to diffuse tension and make them feel understood.',
      primary_mefs: ['emotional'],
      appropriate_stages: ['discovery', 'objection_handling'],
      sentiment_preference: ['negative'],
      engagement_requirement: ['medium', 'high'],
      effectiveness_score: 85
    },

    'Calibrated Questions': {
      name: 'Calibrated Questions',
      description: 'Ask open-ended "how" or "what" questions for control',
      when_to_use: 'When facing objections, need guidance, or want them to solve problems',
      example_phrase: '"What would make this investment feel worthwhile to you?"',
      detailed_explanation: 'Use "how" and "what" questions to shift control and get them to solve your problems.',
      primary_mefs: ['mental', 'financial', 'schedule'],
      appropriate_stages: ['discovery', 'solution', 'objection_handling'],
      sentiment_preference: ['neutral', 'negative'],
      engagement_requirement: ['medium', 'high'],
      effectiveness_score: 90
    },

    'Accusation Audit': {
      name: 'Accusation Audit',
      description: 'Address potential objections upfront to disarm them',
      when_to_use: 'At beginning of conversations or when sensing hidden resistance',
      example_phrase: '"You probably think this is just another sales pitch from someone who doesn\'t understand your business"',
      detailed_explanation: 'Preemptively address negative perceptions to disarm them and build trust.',
      primary_mefs: ['emotional', 'mental'],
      appropriate_stages: ['solution', 'objection_handling'],
      sentiment_preference: ['negative'],
      engagement_requirement: ['low', 'medium'],
      effectiveness_score: 80
    },

    'Dynamic Silence': {
      name: 'Dynamic Silence',
      description: 'Use pauses to encourage more information',
      when_to_use: 'After calibrated questions or emotional labels',
      example_phrase: 'Ask question, then wait 5-7 seconds without speaking',
      detailed_explanation: 'Strategic pauses after questions encourage them to fill silence with valuable information.',
      primary_mefs: ['mental', 'emotional'],
      appropriate_stages: ['discovery', 'solution', 'objection_handling'],
      sentiment_preference: ['neutral'],
      engagement_requirement: ['medium', 'high'],
      effectiveness_score: 75
    },

    'Black Swan': {
      name: 'Black Swan',
      description: 'Uncover hidden fears, concerns & needs',
      when_to_use: 'When you sense there\'s something they\'re not telling you',
      example_phrase: '"What haven\'t we addressed that would help you more?"',
      detailed_explanation: 'Probe for hidden issues and motivations that could be game-changers.',
      primary_mefs: ['mental', 'emotional', 'financial', 'schedule'],
      appropriate_stages: ['discovery', 'solution'],
      sentiment_preference: ['neutral', 'negative'],
      engagement_requirement: ['high'],
      effectiveness_score: 70
    },

    'Buy-In': {
      name: 'Buy-In',
      description: 'Ask permission before engaging to make them teachable',
      when_to_use: 'When you want their focus or them to be open to new ideas',
      example_phrase: '"Is it OK if I outline the 3 most popular ways our clients use this?"',
      detailed_explanation: 'Get permission before presenting to make them more receptive to your message.',
      primary_mefs: ['mental'],
      appropriate_stages: ['solution', 'closing'],
      sentiment_preference: ['positive', 'neutral'],
      engagement_requirement: ['medium', 'high'],
      effectiveness_score: 85
    },

    'DJ Voice': {
      name: 'DJ Voice',
      description: 'Deep, calm & slow voice when emotions rise',
      when_to_use: 'When emotions rise, concerns escalate, or their volume increases',
      example_phrase: 'Respond with deeper, slower, calmer tone',
      detailed_explanation: 'Counter emotional escalation with calm, deep voice to de-escalate tension.',
      primary_mefs: ['emotional'],
      appropriate_stages: ['objection_handling', 'closing'],
      sentiment_preference: ['negative'],
      engagement_requirement: ['low', 'medium'],
      effectiveness_score: 80
    },

    'We not I': {
      name: 'We not I',
      description: 'Position yourself on same side of table with them',
      when_to_use: 'Throughout discussion to work together to solve their problem',
      example_phrase: '"If WE cannot identify a great ROI, then WE won\'t do it"',
      detailed_explanation: 'Use "we" language to position yourself as their ally rather than adversary.',
      primary_mefs: ['emotional', 'mental'],
      appropriate_stages: ['rapport', 'discovery', 'solution'],
      sentiment_preference: ['neutral', 'negative'],
      engagement_requirement: ['medium', 'high'],
      effectiveness_score: 75
    },

    'No Means Yes': {
      name: 'No Means Yes',
      description: 'Ask questions where "No" is the good answer',
      when_to_use: 'To get truthful answers and head-off likely concerns',
      example_phrase: '"Would spending $6k be a financial strain to your bank account?"',
      detailed_explanation: 'Structure questions so "no" answers put you in good position and feel comfortable for them.',
      primary_mefs: ['financial', 'emotional'],
      appropriate_stages: ['closing', 'objection_handling'],
      sentiment_preference: ['neutral', 'negative'],
      engagement_requirement: ['medium', 'high'],
      effectiveness_score: 85
    },

    'Take Away': {
      name: 'Take Away',
      description: 'Agree with objections, push them to extreme',
      when_to_use: 'When objections arise - remove pressure by agreeing',
      example_phrase: '"If it isn\'t completely obvious this will deliver everything we discussed, you shouldn\'t do it!"',
      detailed_explanation: 'Agree with their objection and amplify it to remove pressure and make them feel in control.',
      primary_mefs: ['emotional', 'mental'],
      appropriate_stages: ['objection_handling', 'closing'],
      sentiment_preference: ['negative'],
      engagement_requirement: ['low', 'medium'],
      effectiveness_score: 90
    },

    'Bargaining Techniques': {
      name: 'Bargaining Techniques',
      description: 'Use precise, non-round numbers in offers',
      when_to_use: 'During price negotiations to signal careful calculation',
      example_phrase: 'Counter with $8,725 instead of $8,500',
      detailed_explanation: 'Precise numbers imply detailed research and discourage easy rounding up.',
      primary_mefs: ['financial'],
      appropriate_stages: ['closing'],
      sentiment_preference: ['neutral', 'negative'],
      engagement_requirement: ['medium', 'high'],
      effectiveness_score: 70
    }
  };

  constructor(scriptService?: SalesScriptService) {
    this.trail = new BreadcrumbTrail('SmartToolSelector');
    this.scriptService = scriptService;

    this.trail.light(9030, {
      operation: 'smart_tool_selector_initialized',
      tools_loaded: Object.keys(this.tools).length,
      script_aware: !!scriptService,
      timestamp: Date.now()
    });
  }

  /**
   * Select optimal tool based on current context
   */
  selectTool(context: {
    stage: SalesStage;
    sentiment: SentimentDirection;
    engagement: EngagementLevel;
    mefsState: MEFSState;
    recentTranscript: string;
    scriptStage?: number;  // Optional script stage override
  }): ToolSelection {
    this.trail.light(9031, {
      operation: 'tool_selection_start',
      stage: context.stage,
      sentiment: context.sentiment,
      engagement: context.engagement,
      primary_gap: context.mefsState.primaryGap,
      script_stage: context.scriptStage,
      script_aware: !!this.scriptService
    });

    // Score all tools for this context (script-aware if available)
    const toolScores = this.scoreAllTools(context);

    // Sort by score and select best
    const sortedTools = Object.entries(toolScores)
      .map(([name, score]) => ({ name, score, tool: this.tools[name] }))
      .sort((a, b) => b.score - a.score);

    const selectedTool = sortedTools[0];
    const fallbackTool = sortedTools[1];

    if (!selectedTool) {
      return this.getDefaultTool(context);
    }

    // Calculate confidence based on score difference
    const confidence = Math.min(100, selectedTool.score);

    // Generate reasoning
    const reasoning = this.generateReasoning(selectedTool.tool, context);

    // Generate exact words based on context
    const exactWords = this.generateExactWords(selectedTool.tool, context);

    // Determine urgency
    const urgency = this.determineUrgency(context);

    const selection: ToolSelection = {
      tool: selectedTool.tool,
      confidence,
      reasoning,
      exact_words: exactWords,
      fallback_tool: fallbackTool?.tool,
      urgency
    };

    this.trail.light(9032, {
      operation: 'tool_selection_complete',
      selected_tool: selectedTool.name,
      confidence,
      urgency
    });

    return selection;
  }

  /**
   * Score all tools against current context
   */
  private scoreAllTools(context: {
    stage: SalesStage;
    sentiment: SentimentDirection;
    engagement: EngagementLevel;
    mefsState: MEFSState;
    recentTranscript?: string;
    scriptStage?: number;
  }): Record<string, number> {
    const scores: Record<string, number> = {};

    Object.entries(this.tools).forEach(([name, tool]) => {
      let score = tool.effectiveness_score; // Base score

      // Stage appropriateness (40% weight)
      if (tool.appropriate_stages.includes(context.stage)) {
        score += 40;
      } else {
        score -= 30; // Penalty for inappropriate stage
      }

      // Sentiment alignment (30% weight)
      if (tool.sentiment_preference.includes(context.sentiment)) {
        score += 30;
      } else {
        score -= 15;
      }

      // Engagement requirement (20% weight)
      if (tool.engagement_requirement.includes(context.engagement)) {
        score += 20;
      } else {
        score -= 10;
      }

      // MEFS gap targeting (10% weight)
      if (context.mefsState.primaryGap && tool.primary_mefs.includes(context.mefsState.primaryGap)) {
        score += 20; // Bonus for addressing primary gap
      }

      // Script-aware scoring (50% weight when available)
      if (this.scriptService && context.scriptStage) {
        score += this.getScriptAwareScore(name, context.scriptStage, context.recentTranscript);
      }

      // Special bonuses for context
      score += this.getContextualBonuses(tool, context);

      scores[name] = Math.max(0, score);
    });

    return scores;
  }

  /**
   * Apply contextual bonuses based on specific situations
   */
  private getContextualBonuses(tool: ToolDefinition, context: {
    stage: SalesStage;
    sentiment: SentimentDirection;
    engagement: EngagementLevel;
    mefsState: MEFSState;
  }): number {
    let bonus = 0;

    // Critical situations get priority tools
    if (context.sentiment === 'negative' && context.engagement === 'low') {
      if (['Take Away', 'Proactive Validation', 'DJ Voice'].includes(tool.name)) {
        bonus += 25; // High priority for damage control
      }
    }

    // Positive momentum situations
    if (context.sentiment === 'positive' && context.engagement === 'high') {
      if (['Buy-In', 'Calibrated Questions', 'No Means Yes'].includes(tool.name)) {
        bonus += 15; // Advance the conversation
      }
    }

    // Stage-specific bonuses
    if (context.stage === 'closing') {
      if (['No Means Yes', 'Take Away', 'DJ Voice'].includes(tool.name)) {
        bonus += 20; // Closing-optimized tools
      }
    }

    if (context.stage === 'discovery') {
      if (['Mirroring', 'Calibrated Questions', 'Black Swan'].includes(tool.name)) {
        bonus += 15; // Discovery-optimized tools
      }
    }

    return bonus;
  }

  /**
   * Apply script-aware scoring based on script stage tool weights and language rules
   */
  private getScriptAwareScore(toolName: string, scriptStage: number, recentTranscript?: string): number {
    if (!this.scriptService) return 0;

    let scriptScore = 0;

    // Get tool weights from current script stage
    const toolWeights = this.scriptService.getCurrentStageToolWeights();
    const normalizedToolName = this.normalizeToolName(toolName);
    const scriptWeight = toolWeights[normalizedToolName] || 0;

    // Major bonus for tools favored by the script (up to 50 points)
    scriptScore += scriptWeight * 50;

    // Get language rules from current script stage
    const languageRules = this.scriptService.getCurrentStageLanguageRules();

    // Apply language rule bonuses/penalties
    if (languageRules.avoidTakeAway && toolName === 'Take Away') {
      scriptScore -= 30; // Strong penalty for inappropriate tools
    }

    if (languageRules.alwaysUseWe && ['Buy-In', 'Proactive Validation'].includes(toolName)) {
      scriptScore += 15; // Bonus for "WE" language tools
    }

    if (languageRules.allowTakeAway && ['Take Away', 'DJ Voice'].includes(toolName)) {
      scriptScore += 20; // Bonus for assertive tools in late stages
    }

    if (languageRules.buildTrust && ['Mirroring', 'Proactive Validation'].includes(toolName)) {
      scriptScore += 15; // Bonus for trust-building tools
    }

    if (languageRules.beAssertive && ['Take Away', 'No Means Yes', 'DJ Voice'].includes(toolName)) {
      scriptScore += 25; // Strong bonus for assertive tools when appropriate
    }

    if (languageRules.focusOnPain && ['Mirroring', 'Emotional Response Validation'].includes(toolName)) {
      scriptScore += 15; // Bonus for pain-focused tools
    }

    // Check tool appropriateness according to script
    if (!this.scriptService.isToolAppropriate(normalizedToolName)) {
      scriptScore -= 20; // Penalty for inappropriate tools
    }

    // Context-specific bonuses based on recent transcript
    if (recentTranscript && scriptWeight > 0) {
      scriptScore += this.getTranscriptContextBonus(toolName, recentTranscript, scriptStage);
    }

    return Math.max(-30, Math.min(50, scriptScore)); // Cap between -30 and +50
  }

  /**
   * Normalize tool names for script matching
   */
  private normalizeToolName(toolName: string): string {
    const normalizations: Record<string, string> = {
      'Mirroring': 'mirroring',
      'Calibrated Questions': 'calibratedQuestions',
      'Proactive Validation': 'proactiveValidation',
      'Take Away': 'takeAway',
      'No Means Yes': 'noMeansYes',
      'Buy-In': 'buyIn',
      'DJ Voice': 'djVoice',
      'Emotional Response Validation': 'emotionalResponseValidation',
      'Accusation Audit': 'accusationAudit',
      'Black Swan': 'blackSwan',
      'On Ones': 'onOnes',
      'Fair Warning': 'fairWarning',
      'Precise Numbers': 'preciseNumbers'
    };

    return normalizations[toolName] || toolName.toLowerCase().replace(/\s+/g, '');
  }

  /**
   * Get context bonuses based on recent transcript and script stage
   */
  private getTranscriptContextBonus(toolName: string, transcript: string, scriptStage: number): number {
    let bonus = 0;
    const lowerTranscript = transcript.toLowerCase();

    // Early stages (1-4): Focus on rapport and discovery
    if (scriptStage <= 4) {
      if (toolName === 'Mirroring' && lowerTranscript.includes('?')) {
        bonus += 10; // Good for reflecting questions
      }
      if (toolName === 'Proactive Validation' && (lowerTranscript.includes('frustrat') || lowerTranscript.includes('problem'))) {
        bonus += 10; // Good for validating pain
      }
      if (toolName === 'Take Away' || toolName === 'No Means Yes') {
        bonus -= 15; // Discourage aggressive tools early
      }
    }

    // Late stages (7-9): Focus on closing
    if (scriptStage >= 7) {
      if (toolName === 'Take Away' && lowerTranscript.includes('not sure')) {
        bonus += 15; // Good for hesitation
      }
      if (toolName === 'No Means Yes' && lowerTranscript.includes('think about')) {
        bonus += 15; // Good for stalling
      }
      if (toolName === 'Mirroring' && !lowerTranscript.includes('?')) {
        bonus -= 10; // Less useful in closing without questions
      }
    }

    // Look for script transition phrases
    const currentScript = this.scriptService?.getCurrentScript();
    if (currentScript && currentScript.transitions) {
      const transitionKey = `${scriptStage}to${scriptStage + 1}`;
      const expectedTransition = currentScript.transitions[transitionKey];
      if (expectedTransition && lowerTranscript.includes(expectedTransition.toLowerCase())) {
        bonus += 20; // Strong bonus for following script transitions
      }
    }

    return bonus;
  }

  /**
   * Generate reasoning for tool selection
   */
  private generateReasoning(tool: ToolDefinition, context: {
    stage: SalesStage;
    sentiment: SentimentDirection;
    engagement: EngagementLevel;
    mefsState: MEFSState;
  }): string {
    const reasons = [];

    reasons.push(`Stage: ${context.stage}`);
    reasons.push(`Sentiment: ${context.sentiment}`);
    reasons.push(`Engagement: ${context.engagement}`);

    if (context.mefsState.primaryGap) {
      reasons.push(`Primary gap: ${context.mefsState.primaryGap}`);
    }

    const situational = this.getSituationalReasoning(tool, context);
    if (situational) {
      reasons.push(situational);
    }

    return reasons.join(' • ');
  }

  /**
   * Get situational reasoning for tool choice
   */
  private getSituationalReasoning(tool: ToolDefinition, context: {
    sentiment: SentimentDirection;
    engagement: EngagementLevel;
    mefsState: MEFSState;
  }): string {
    if (context.sentiment === 'negative' && tool.name === 'Take Away') {
      return 'Negative sentiment → Remove pressure';
    }

    if (context.engagement === 'low' && tool.name === 'Mirroring') {
      return 'Low engagement → Build rapport';
    }

    if (context.mefsState.primaryGap === 'financial' && tool.name === 'Calibrated Questions') {
      return 'Financial gap → Explore budget concerns';
    }

    if (context.sentiment === 'positive' && tool.name === 'Buy-In') {
      return 'Positive sentiment → Advance conversation';
    }

    return '';
  }

  /**
   * Generate specific words to use for this tool in this context
   */
  private generateExactWords(tool: ToolDefinition, context: {
    stage: SalesStage;
    sentiment: SentimentDirection;
    mefsState: MEFSState;
    recentTranscript: string;
  }): string {
    const transcript = context.recentTranscript.toLowerCase();

    // Context-specific word generation
    switch (tool.name) {
      case 'Mirroring':
        // Extract last few words for mirroring
        const words = transcript.trim().split(' ');
        const lastWords = words.slice(-3).join(' ');
        return lastWords ? `"${lastWords}?"` : '"What you just said?"';

      case 'Calibrated Questions':
        if (context.mefsState.primaryGap === 'financial') {
          return '"What would make this investment feel worthwhile to you?"';
        }
        if (context.mefsState.primaryGap === 'schedule') {
          return '"How would the ideal timeline look for your team?"';
        }
        return '"What would need to happen for this to feel right?"';

      case 'Take Away':
        return '"If it isn\'t completely obvious this is exactly what you need, then don\'t do it!"';

      case 'Proactive Validation':
        if (context.sentiment === 'negative') {
          return '"It sounds like you\'re concerned about making the right decision"';
        }
        return '"I can see this is important to get right"';

      case 'No Means Yes':
        if (context.stage === 'closing') {
          return '"Would moving forward feel like too much pressure right now?"';
        }
        return '"Is this completely unreasonable?"';

      default:
        return tool.example_phrase;
    }
  }

  /**
   * Determine urgency of tool usage
   */
  private determineUrgency(context: {
    sentiment: SentimentDirection;
    engagement: EngagementLevel;
    mefsState: MEFSState;
  }): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: Negative sentiment + low engagement
    if (context.sentiment === 'negative' && context.engagement === 'low') {
      return 'critical';
    }

    // High: Strong negative sentiment or very low MEFS scores
    if (context.sentiment === 'negative' || context.mefsState.overallAlignment < 30) {
      return 'high';
    }

    // Medium: Mixed signals or moderate alignment
    if (context.sentiment === 'neutral' || context.mefsState.overallAlignment < 60) {
      return 'medium';
    }

    // Low: Positive sentiment and good alignment
    return 'low';
  }

  /**
   * Get default tool when selection fails
   */
  private getDefaultTool(context: {
    stage: SalesStage;
    sentiment: SentimentDirection;
    engagement: EngagementLevel;
  }): ToolSelection {
    const defaultTool = this.tools['Calibrated Questions']; // Safe default

    return {
      tool: defaultTool,
      confidence: 30,
      reasoning: 'Default selection - no clear match found',
      exact_words: '"Tell me more about that..."',
      urgency: 'medium'
    };
  }

  /**
   * Get all available tools for UI display
   */
  getAllTools(): ToolDefinition[] {
    return Object.values(this.tools);
  }

  /**
   * Get tool by name
   */
  getToolByName(name: string): ToolDefinition | null {
    return this.tools[name] || null;
  }

  /**
   * Get tools appropriate for current stage
   */
  getToolsForStage(stage: SalesStage): ToolDefinition[] {
    return Object.values(this.tools).filter(tool =>
      tool.appropriate_stages.includes(stage)
    );
  }
}