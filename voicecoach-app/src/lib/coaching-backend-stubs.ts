/**
 * VoiceCoach Backend Integration - Real OpenRouter API Implementation
 * 
 * Production implementation using Tauri commands for OpenRouter integration
 * with fallback to stubs for development/offline mode.
 */

import { invoke } from '@tauri-apps/api/tauri';
import type { SalesStage } from '../hooks/useCoachingOrchestrator';

// Check if we're running in Tauri environment
const isTauriEnvironment = () => {
  return typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
};

// Real OpenRouter API integration via Tauri commands
export const backendStubs = {
  /**
   * Analyze conversation stage using OpenRouter API via Tauri
   */
  async analyzeConversationStage(params: {
    transcriptionText: string;
    speaker: 'user' | 'prospect';
    currentStage: SalesStage;
    conversationHistory: string;
  }) {
    if (isTauriEnvironment()) {
      try {
        const analysis = await invoke<any>('analyze_conversation_stage', {
          transcriptionText: params.transcriptionText,
          speaker: params.speaker,
          currentStage: params.currentStage,
          conversationHistory: params.conversationHistory
        });
        
        return {
          suggestedStage: analysis.current_stage as SalesStage,
          confidence: analysis.confidence,
          reasoning: `AI analysis with ${Math.round(analysis.confidence * 100)}% confidence`
        };
      } catch (error) {
        console.warn('Tauri conversation analysis failed, using fallback:', error);
      }
    }
    
    // Fallback to keyword-based analysis
    const text = params.transcriptionText.toLowerCase();
    
    if (text.includes('hi') || text.includes('hello') || text.includes('thanks for') || text.includes('nice to meet')) {
      return {
        suggestedStage: 'opening' as SalesStage,
        confidence: 0.8,
        reasoning: 'Greeting and introduction language detected'
      };
    } else if (text.includes('tell me about') || text.includes('what') || text.includes('how') || text.includes('challenge') || text.includes('process')) {
      return {
        suggestedStage: 'discovery' as SalesStage,
        confidence: 0.7,
        reasoning: 'Discovery questions and information gathering detected'
      };
    } else if (text.includes('solution') || text.includes('platform') || text.includes('feature') || text.includes('demo')) {
      return {
        suggestedStage: 'presentation' as SalesStage,
        confidence: 0.6,
        reasoning: 'Solution presentation language detected'
      };
    } else if (text.includes('but') || text.includes('concern') || text.includes('worry') || text.includes('cost') || text.includes('expensive')) {
      return {
        suggestedStage: 'objection_handling' as SalesStage,
        confidence: 0.9,
        reasoning: 'Objection language detected'
      };
    } else if (text.includes('interested') || text.includes('next steps') || text.includes('proposal') || text.includes('move forward')) {
      return {
        suggestedStage: 'closing' as SalesStage,
        confidence: 0.7,
        reasoning: 'Buying signals and next steps language detected'
      };
    }
    
    return {
      suggestedStage: params.currentStage,
      confidence: 0.5,
      reasoning: 'No clear stage transition indicators found'
    };
  },

  /**
   * Analyze conversation topics, sentiment, and opportunities
   */
  async analyzeConversationTopics(params: {
    transcriptionText: string;
    conversationHistory: string;
  }) {
    const text = params.transcriptionText.toLowerCase();
    const history = params.conversationHistory.toLowerCase();
    
    // Extract key topics using keyword matching
    const topicKeywords = {
      'lead qualification': ['lead', 'qualification', 'qualify', 'prospect'],
      'sales process': ['sales', 'process', 'pipeline', 'funnel'],
      'pricing': ['price', 'cost', 'expensive', 'budget', 'pricing'],
      'features': ['feature', 'functionality', 'capability', 'demo'],
      'integration': ['integrate', 'integration', 'connect', 'api'],
      'timeline': ['timeline', 'schedule', 'timeframe', 'when'],
      'decision making': ['decision', 'decide', 'stakeholder', 'approval'],
      'competition': ['competitor', 'alternative', 'compare', 'versus']
    };

    const keyTopics: string[] = [];
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword) || history.includes(keyword))) {
        keyTopics.push(topic);
      }
    });

    // Detect objections
    const objectionKeywords = ['but', 'however', 'concern', 'worried', 'problem', 'issue', 'expensive', 'costly'];
    const objections: string[] = [];
    objectionKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        objections.push(`${keyword} mentioned`);
      }
    });

    // Detect opportunities
    const opportunityKeywords = ['interested', 'like', 'sounds good', 'tell me more', 'how does', 'what about'];
    const opportunities: string[] = [];
    opportunityKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        opportunities.push(`positive engagement: ${keyword}`);
      }
    });

    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'interested', 'like', 'love', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'concerned', 'worried', 'expensive', 'difficult'];
    
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (positiveCount > negativeCount) {
      sentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
    }

    return {
      keyTopics,
      sentiment,
      objections,
      opportunities
    };
  },

  /**
   * Retrieve relevant knowledge using OpenRouter API via Tauri
   */
  async retrieveKnowledgeForCoaching(params: {
    query: string;
    stage: SalesStage;
    topics: string[];
    maxResults: number;
  }) {
    if (isTauriEnvironment()) {
      try {
        const knowledge = await invoke<any[]>('retrieve_coaching_knowledge', {
          query: params.query,
          stage: params.stage,
          topics: params.topics,
          maxResults: params.maxResults
        });
        
        return knowledge;
      } catch (error) {
        console.warn('Tauri knowledge retrieval failed, using fallback:', error);
      }
    }
    
    // Fallback to mock knowledge base
    const knowledgeBase = [
      {
        content: "Ask open-ended discovery questions to understand their current process and pain points. Use the SPIN selling methodology.",
        source: "Sales Methodology Guide",
        relevance: 0.9,
        type: "Discovery Technique"
      },
      {
        content: "When presenting features, always tie them back to the specific pain points mentioned by the prospect.",
        source: "Product Demo Best Practices",
        relevance: 0.8,
        type: "Presentation Tip"
      },
      {
        content: "Address objections with empathy first: 'I understand your concern about cost. Let me show you the ROI...'",
        source: "Objection Handling Scripts",
        relevance: 0.85,
        type: "Objection Response"
      },
      {
        content: "Use social proof: 'Companies similar to yours have seen 30% improvement in lead conversion rates.'",
        source: "Case Studies Database",
        relevance: 0.7,
        type: "Social Proof"
      }
    ];

    const stageRelevant = knowledgeBase.filter(item => {
      const query = params.query.toLowerCase();
      const content = item.content.toLowerCase();
      return content.includes(query) || params.topics.some(topic => content.includes(topic));
    });

    return stageRelevant.slice(0, params.maxResults);
  },

  /**
   * Generate AI coaching prompts using OpenRouter API via Tauri
   */
  async generateAICoachingPrompts(params: {
    transcriptionText: string;
    speaker: 'user' | 'prospect';
    conversationContext: any;
    activeTriggers: Array<{ type: string; priority: string }>;
    conversationHistory: string;
  }) {
    if (isTauriEnvironment()) {
      try {
        const promptResponse = await invoke<any>('generate_ai_coaching_prompt', {
          conversationSnippet: params.transcriptionText,
          salesStage: params.conversationContext.currentStage,
          callDurationMinutes: Math.floor(params.conversationContext.duration / (1000 * 60)),
          keyTopics: params.conversationContext.keyTopics || [],
          objections: params.conversationContext.objections || [],
          model: 'openai/gpt-4-turbo',
          priority: 'balanced'
        });
        
        // Convert the single prompt response to the expected array format
        return [{
          suggestion_type: promptResponse.prompt_type,
          confidence: promptResponse.confidence_score,
          content: promptResponse.primary_suggestion,
          priority: promptResponse.urgency_level,
          methodology: 'OpenRouter AI Analysis'
        }];
      } catch (error) {
        console.warn('Tauri AI coaching prompt generation failed, using fallback:', error);
      }
    }
    
    // Fallback to mock prompt generation
    const text = params.transcriptionText.toLowerCase();
    const prompts = [];

    if (params.speaker === 'prospect') {
      if (text.includes('challenge') || text.includes('problem')) {
        prompts.push({
          suggestion_type: 'discovery_opportunity',
          confidence: 0.9,
          content: `The prospect mentioned challenges. Ask: "Can you tell me more about how this impacts your team's daily workflow?"`,
          priority: 'high',
          methodology: 'SPIN Selling'
        });
      }

      if (text.includes('cost') || text.includes('expensive') || text.includes('budget')) {
        prompts.push({
          suggestion_type: 'objection_handling',
          confidence: 0.95,
          content: `Cost objection detected. Respond with: "I understand budget is a concern. Let's look at the ROI and how this pays for itself in 6 months."`,
          priority: 'critical',
          methodology: 'Value-Based Selling'
        });
      }

      if (text.includes('interested') || text.includes('sounds good')) {
        prompts.push({
          suggestion_type: 'closing_opportunity',
          confidence: 0.8,
          content: `Buying signal detected! Ask: "What would you need to see to move forward with this solution?"`,
          priority: 'high',
          methodology: 'Solution Selling'
        });
      }
    }

    if (params.conversationContext.talkTimeRatio.user > 70) {
      prompts.push({
        suggestion_type: 'talk_time_warning',
        confidence: 0.9,
        content: `You've been talking for ${params.conversationContext.talkTimeRatio.user}% of the time. Ask an open-ended question to engage the prospect.`,
        priority: 'medium',
        methodology: 'Active Listening'
      });
    }

    // Stage-specific prompts
    switch (params.conversationContext.currentStage) {
      case 'opening':
        prompts.push({
          suggestion_type: 'agenda_setting',
          confidence: 0.7,
          content: `Set the meeting agenda: "I'd like to understand your current challenges and show you how we can help. Sound good?"`,
          priority: 'medium',
          methodology: 'Consultative Selling'
        });
        break;
      case 'discovery':
        prompts.push({
          suggestion_type: 'discovery_deepening',
          confidence: 0.8,
          content: `Ask a follow-up question to quantify the impact: "How much time does your team spend on this process weekly?"`,
          priority: 'high',
          methodology: 'SPIN Selling'
        });
        break;
      case 'presentation':
        prompts.push({
          suggestion_type: 'benefit_focus',
          confidence: 0.75,
          content: `Connect features to benefits: "This means you'll save 5 hours per week that your team can focus on high-value activities."`,
          priority: 'high',
          methodology: 'Feature-Advantage-Benefit'
        });
        break;
    }

    return prompts;
  }
};

export default backendStubs;