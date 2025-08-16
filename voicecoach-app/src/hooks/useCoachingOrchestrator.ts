/**
 * VoiceCoach Real-Time Coaching Orchestration Engine
 * 
 * Central intelligence system that coordinates all VoiceCoach AI systems
 * for live sales guidance with <2 second end-to-end response pipeline.
 * 
 * Key Features:
 * - Real-time conversation flow analysis
 * - Intelligent coaching trigger system
 * - Performance tracking and optimization
 * - Context-aware coaching prompt delivery
 * - Conversation state and milestone detection
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';
import { backendStubs } from '../lib/coaching-backend-stubs';

// Core Types for Coaching Orchestration
export interface TranscriptionEntry {
  id: string;
  speaker: 'user' | 'prospect';
  text: string;
  timestamp: Date;
  confidence: number;
  processed?: boolean;
}

export interface ConversationContext {
  currentStage: SalesStage;
  duration: number;
  talkTimeRatio: { user: number; prospect: number };
  keyTopics: string[];
  objections: string[];
  opportunities: string[];
  nextActions: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  lastActivity: Date;
}

export interface CoachingTrigger {
  id: string;
  type: 'stage_transition' | 'objection_detected' | 'opportunity_missed' | 'silence_gap' | 'topic_shift';
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  triggerText?: string;
  suggestedAction: string;
  timestamp: Date;
  processed: boolean;
}

export interface CoachingPrompt {
  id: string;
  type: 'suggestion' | 'objection' | 'opportunity' | 'warning' | 'milestone';
  title: string;
  content: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  timestamp: Date;
  actionable: boolean;
  source: 'ai_analysis' | 'knowledge_base' | 'flow_analysis' | 'trigger_system';
  confidence?: number;
  triggerId?: string;
  effectiveness?: number;
}

export interface PerformanceMetrics {
  sessionDuration: number;
  promptsDelivered: number;
  promptsUsed: number;
  averageResponseTime: number;
  transcriptionLatency: number;
  aiProcessingLatency: number;
  knowledgeRetrievalLatency: number;
  stageProgression: SalesStage[];
  talkTimeBalance: number;
  silenceGaps: number;
  opportunitiesIdentified: number;
  objectionsHandled: number;
}

export type SalesStage = 
  | 'opening' 
  | 'discovery' 
  | 'presentation' 
  | 'objection_handling' 
  | 'closing' 
  | 'follow_up';

// Coaching Orchestrator Hook
export const useCoachingOrchestrator = (isRecording: boolean) => {
  const trail = new BreadcrumbTrail('CoachingOrchestrator');
  
  // LED 600: Coaching orchestrator initialization
  trail.light(600, { operation: 'coaching_orchestrator_init', isRecording });

  // Core State Management
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    currentStage: 'opening',
    duration: 0,
    talkTimeRatio: { user: 50, prospect: 50 },
    keyTopics: [],
    objections: [],
    opportunities: [],
    nextActions: [],
    sentiment: 'neutral',
    lastActivity: new Date()
  });
  const [activeTriggers, setActiveTriggers] = useState<CoachingTrigger[]>([]);
  const [coachingPrompts, setCoachingPrompts] = useState<CoachingPrompt[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    sessionDuration: 0,
    promptsDelivered: 0,
    promptsUsed: 0,
    averageResponseTime: 0,
    transcriptionLatency: 0,
    aiProcessingLatency: 0,
    knowledgeRetrievalLatency: 0,
    stageProgression: ['opening'],
    talkTimeBalance: 50,
    silenceGaps: 0,
    opportunitiesIdentified: 0,
    objectionsHandled: 0
  });

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Performance Tracking
  const sessionStartTime = useRef<Date | null>(null);
  const processingQueue = useRef<TranscriptionEntry[]>([]);
  const responseTimeTracker = useRef<number[]>([]);

  // LED 601: State initialization complete
  trail.light(601, { 
    operation: 'state_init_complete',
    currentStage: conversationContext.currentStage,
    isRecording
  });

  /**
   * CORE ORCHESTRATION PIPELINE
   * Real-time processing of transcription → analysis → coaching
   */

  // 1. Real-time Transcription Processing
  const processNewTranscription = useCallback(async (transcription: TranscriptionEntry) => {
    const startTime = performance.now();
    
    // LED 610: New transcription processing start
    trail.light(610, { 
      operation: 'transcription_processing_start',
      speaker: transcription.speaker,
      textLength: transcription.text.length,
      confidence: transcription.confidence
    });

    try {
      // Add to processing queue
      processingQueue.current.push(transcription);
      setTranscriptions(prev => [...prev, transcription]);

      // Trigger analysis pipeline
      await triggerAnalysisPipeline(transcription);

      const processingTime = performance.now() - startTime;
      responseTimeTracker.current.push(processingTime);

      // LED 611: Transcription processing complete
      trail.light(611, { 
        operation: 'transcription_processing_complete',
        processingTimeMs: processingTime,
        queueLength: processingQueue.current.length
      });

    } catch (error) {
      // LED 610: Transcription processing failed
      trail.fail(610, error as Error);
      console.error('Failed to process transcription:', error);
    }
  }, []);

  // 2. Conversation Analysis Pipeline
  const triggerAnalysisPipeline = useCallback(async (transcription: TranscriptionEntry) => {
    if (isProcessing) return; // Prevent duplicate processing
    
    setIsProcessing(true);
    const pipelineStart = performance.now();

    // LED 620: Analysis pipeline start
    trail.light(620, { 
      operation: 'analysis_pipeline_start',
      transcriptionId: transcription.id,
      currentStage: conversationContext.currentStage
    });

    try {
      // Step 1: Context Analysis (<100ms target)
      const contextStart = performance.now();
      const updatedContext = await analyzeConversationContext(transcription);
      const contextTime = performance.now() - contextStart;

      // LED 621: Context analysis complete
      trail.light(621, { 
        operation: 'context_analysis_complete',
        processingTimeMs: contextTime,
        stageChanged: updatedContext.currentStage !== conversationContext.currentStage
      });

      // Step 2: Trigger Detection (<50ms target)
      const triggerStart = performance.now();
      const newTriggers = await detectCoachingTriggers(transcription, updatedContext);
      const triggerTime = performance.now() - triggerStart;

      // LED 622: Trigger detection complete
      trail.light(622, { 
        operation: 'trigger_detection_complete',
        processingTimeMs: triggerTime,
        triggersFound: newTriggers.length
      });

      // Step 3: Knowledge Retrieval (<100ms target)
      const knowledgeStart = performance.now();
      const knowledgePrompts = await retrieveRelevantKnowledge(transcription.text, updatedContext);
      const knowledgeTime = performance.now() - knowledgeStart;

      // LED 623: Knowledge retrieval complete
      trail.light(623, { 
        operation: 'knowledge_retrieval_complete',
        processingTimeMs: knowledgeTime,
        promptsGenerated: knowledgePrompts.length
      });

      // Step 4: AI Prompt Generation (<500ms target)
      const aiStart = performance.now();
      const aiPrompts = await generateAICoachingPrompts(transcription, updatedContext, newTriggers);
      const aiTime = performance.now() - aiStart;

      // LED 624: AI prompt generation complete
      trail.light(624, { 
        operation: 'ai_prompt_generation_complete',
        processingTimeMs: aiTime,
        promptsGenerated: aiPrompts.length
      });

      // Step 5: Update State
      setConversationContext(updatedContext);
      setActiveTriggers(prev => [...prev, ...newTriggers]);
      
      const newPrompts = [...knowledgePrompts, ...aiPrompts];
      setCoachingPrompts(prev => [...prev, ...newPrompts]);

      // Update performance metrics
      const totalPipelineTime = performance.now() - pipelineStart;
      updatePerformanceMetrics({
        transcriptionLatency: 0, // Set by transcription system
        aiProcessingLatency: aiTime,
        knowledgeRetrievalLatency: knowledgeTime,
        averageResponseTime: totalPipelineTime,
        promptsDelivered: newPrompts.length
      });

      // LED 625: Pipeline complete - SUCCESS
      trail.light(625, { 
        operation: 'analysis_pipeline_complete',
        totalTimeMs: totalPipelineTime,
        targetMet: totalPipelineTime < 2000, // <2s target
        contextStage: updatedContext.currentStage,
        promptsDelivered: newPrompts.length
      });

    } catch (error) {
      // LED 620: Analysis pipeline failed
      trail.fail(620, error as Error);
      console.error('Analysis pipeline failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, conversationContext]);

  // 3. Conversation Context Analysis
  const analyzeConversationContext = useCallback(async (transcription: TranscriptionEntry): Promise<ConversationContext> => {
    // LED 630: Context analysis start
    trail.light(630, { 
      operation: 'context_analysis_start',
      speaker: transcription.speaker,
      currentStage: conversationContext.currentStage
    });

    try {
      // Analyze conversation for stage detection
      const stageAnalysis = await backendStubs.analyzeConversationStage({
        transcriptionText: transcription.text,
        speaker: transcription.speaker,
        currentStage: conversationContext.currentStage,
        conversationHistory: transcriptions.slice(-5).map(t => `${t.speaker}: ${t.text}`).join('\n')
      });

      // Calculate talk time ratios
      const recentTranscriptions = transcriptions.slice(-10);
      const userWords = recentTranscriptions
        .filter(t => t.speaker === 'user')
        .reduce((acc, t) => acc + t.text.split(' ').length, 0);
      const prospectWords = recentTranscriptions
        .filter(t => t.speaker === 'prospect')
        .reduce((acc, t) => acc + t.text.split(' ').length, 0);
      
      const totalWords = userWords + prospectWords;
      const talkTimeRatio = totalWords > 0 ? {
        user: Math.round((userWords / totalWords) * 100),
        prospect: Math.round((prospectWords / totalWords) * 100)
      } : conversationContext.talkTimeRatio;

      // Extract key topics and sentiment
      const topicAnalysis = await backendStubs.analyzeConversationTopics({
        transcriptionText: transcription.text,
        conversationHistory: transcriptions.slice(-5).map(t => t.text).join(' ')
      });

      const updatedContext: ConversationContext = {
        currentStage: stageAnalysis.confidence > 0.7 ? stageAnalysis.suggestedStage : conversationContext.currentStage,
        duration: sessionStartTime.current ? Date.now() - sessionStartTime.current.getTime() : 0,
        talkTimeRatio,
        keyTopics: [...new Set([...conversationContext.keyTopics, ...topicAnalysis.keyTopics])],
        objections: [...new Set([...conversationContext.objections, ...topicAnalysis.objections])],
        opportunities: [...new Set([...conversationContext.opportunities, ...topicAnalysis.opportunities])],
        nextActions: await generateNextActions(stageAnalysis.suggestedStage, topicAnalysis),
        sentiment: topicAnalysis.sentiment,
        lastActivity: new Date()
      };

      // LED 631: Context analysis complete
      trail.light(631, { 
        operation: 'context_analysis_complete',
        stageTransition: updatedContext.currentStage !== conversationContext.currentStage,
        newStage: updatedContext.currentStage,
        sentiment: updatedContext.sentiment,
        talkRatio: updatedContext.talkTimeRatio
      });

      return updatedContext;

    } catch (error) {
      // LED 630: Context analysis failed
      trail.fail(630, error as Error);
      console.error('Context analysis failed:', error);
      return conversationContext; // Return current context on failure
    }
  }, [transcriptions, conversationContext, sessionStartTime]);

  // 4. Coaching Trigger Detection
  const detectCoachingTriggers = useCallback(async (
    transcription: TranscriptionEntry, 
    context: ConversationContext
  ): Promise<CoachingTrigger[]> => {
    
    // LED 640: Trigger detection start
    trail.light(640, { 
      operation: 'trigger_detection_start',
      transcriptionText: transcription.text.substring(0, 50) + '...',
      currentStage: context.currentStage
    });

    const triggers: CoachingTrigger[] = [];

    try {
      // 1. Stage Transition Triggers
      if (context.currentStage !== conversationContext.currentStage) {
        triggers.push({
          id: `stage-${Date.now()}`,
          type: 'stage_transition',
          priority: 'high',
          confidence: 0.9,
          suggestedAction: `Transition to ${context.currentStage} stage techniques`,
          timestamp: new Date(),
          processed: false
        });
      }

      // 2. Objection Detection
      const objectionKeywords = ['but', 'however', 'concern', 'worry', 'problem', 'issue', 'expensive', 'cost'];
      if (transcription.speaker === 'prospect' && 
          objectionKeywords.some(keyword => transcription.text.toLowerCase().includes(keyword))) {
        triggers.push({
          id: `objection-${Date.now()}`,
          type: 'objection_detected',
          priority: 'critical',
          confidence: 0.8,
          triggerText: transcription.text,
          suggestedAction: 'Address objection with empathy and evidence',
          timestamp: new Date(),
          processed: false
        });
      }

      // 3. Opportunity Detection
      const opportunityKeywords = ['interested', 'like', 'sounds good', 'tell me more', 'how does'];
      if (transcription.speaker === 'prospect' && 
          opportunityKeywords.some(keyword => transcription.text.toLowerCase().includes(keyword))) {
        triggers.push({
          id: `opportunity-${Date.now()}`,
          type: 'opportunity_missed',
          priority: 'high',
          confidence: 0.7,
          triggerText: transcription.text,
          suggestedAction: 'Capitalize on interest - provide specific benefits',
          timestamp: new Date(),
          processed: false
        });
      }

      // 4. Silence Gap Detection
      const timeSinceLastActivity = Date.now() - context.lastActivity.getTime();
      if (timeSinceLastActivity > 10000) { // 10 seconds of silence
        triggers.push({
          id: `silence-${Date.now()}`,
          type: 'silence_gap',
          priority: 'medium',
          confidence: 0.9,
          suggestedAction: 'Break silence with engaging question or summary',
          timestamp: new Date(),
          processed: false
        });
      }

      // LED 641: Trigger detection complete
      trail.light(641, { 
        operation: 'trigger_detection_complete',
        triggersFound: triggers.length,
        triggerTypes: triggers.map(t => t.type)
      });

      return triggers;

    } catch (error) {
      // LED 640: Trigger detection failed
      trail.fail(640, error as Error);
      console.error('Trigger detection failed:', error);
      return [];
    }
  }, [conversationContext]);

  // 5. Knowledge Base Retrieval
  const retrieveRelevantKnowledge = useCallback(async (
    text: string, 
    context: ConversationContext
  ): Promise<CoachingPrompt[]> => {
    
    // LED 650: Knowledge retrieval start
    trail.light(650, { 
      operation: 'knowledge_retrieval_start',
      textLength: text.length,
      currentStage: context.currentStage
    });

    try {
      const knowledgeResults = await backendStubs.retrieveKnowledgeForCoaching({
        query: text,
        stage: context.currentStage,
        topics: context.keyTopics,
        maxResults: 3
      });

      const prompts: CoachingPrompt[] = knowledgeResults.map((result, index) => ({
        id: `knowledge-${Date.now()}-${index}`,
        type: 'suggestion',
        title: `Knowledge Base: ${result.type}`,
        content: result.content,
        priority: result.relevance > 0.8 ? 'high' : result.relevance > 0.6 ? 'medium' : 'low',
        timestamp: new Date(),
        actionable: true,
        source: 'knowledge_base',
        confidence: result.relevance
      }));

      // LED 651: Knowledge retrieval complete
      trail.light(651, { 
        operation: 'knowledge_retrieval_complete',
        resultsFound: knowledgeResults.length,
        promptsGenerated: prompts.length
      });

      return prompts;

    } catch (error) {
      // LED 650: Knowledge retrieval failed
      trail.fail(650, error as Error);
      console.error('Knowledge retrieval failed:', error);
      return [];
    }
  }, []);

  // 6. AI Coaching Prompt Generation
  const generateAICoachingPrompts = useCallback(async (
    transcription: TranscriptionEntry,
    context: ConversationContext,
    triggers: CoachingTrigger[]
  ): Promise<CoachingPrompt[]> => {
    
    // LED 660: AI prompt generation start
    trail.light(660, { 
      operation: 'ai_prompt_generation_start',
      triggersCount: triggers.length,
      currentStage: context.currentStage
    });

    try {
      const aiPrompts = await backendStubs.generateAICoachingPrompts({
        transcriptionText: transcription.text,
        speaker: transcription.speaker,
        conversationContext: context,
        activeTriggers: triggers.map(t => ({ type: t.type, priority: t.priority })),
        conversationHistory: transcriptions.slice(-3).map(t => `${t.speaker}: ${t.text}`).join('\n')
      });

      const prompts: CoachingPrompt[] = aiPrompts.map((aiPrompt, index) => ({
        id: `ai-${Date.now()}-${index}`,
        type: aiPrompt.suggestion_type.includes('objection') ? 'objection' : 
              aiPrompt.suggestion_type.includes('opportunity') ? 'opportunity' : 
              aiPrompt.suggestion_type.includes('warning') ? 'warning' : 'suggestion',
        title: `AI Coach: ${aiPrompt.suggestion_type}`,
        content: aiPrompt.content,
        priority: aiPrompt.priority as 'critical' | 'high' | 'medium' | 'low',
        timestamp: new Date(),
        actionable: true,
        source: 'ai_analysis',
        confidence: aiPrompt.confidence
      }));

      // LED 661: AI prompt generation complete
      trail.light(661, { 
        operation: 'ai_prompt_generation_complete',
        promptsGenerated: prompts.length,
        highPriorityCount: prompts.filter(p => p.priority === 'high' || p.priority === 'critical').length
      });

      return prompts;

    } catch (error) {
      // LED 660: AI prompt generation failed
      trail.fail(660, error as Error);
      console.error('AI prompt generation failed:', error);
      return [];
    }
  }, [transcriptions]);

  // Helper Functions
  const generateNextActions = async (stage: SalesStage, _topicAnalysis: any): Promise<string[]> => {
    const stageActions: Record<SalesStage, string[]> = {
      opening: ['Build rapport', 'Understand their role', 'Set meeting agenda'],
      discovery: ['Ask open-ended questions', 'Identify pain points', 'Quantify impact'],
      presentation: ['Tailor solution to needs', 'Show relevant features', 'Provide social proof'],
      objection_handling: ['Listen actively', 'Acknowledge concerns', 'Provide evidence'],
      closing: ['Summarize benefits', 'Ask for commitment', 'Discuss next steps'],
      follow_up: ['Send proposal', 'Schedule follow-up', 'Connect stakeholders']
    };

    return stageActions[stage] || ['Continue conversation'];
  };

  const updatePerformanceMetrics = (updates: Partial<PerformanceMetrics>) => {
    setPerformanceMetrics(prev => ({
      ...prev,
      ...updates,
      sessionDuration: sessionStartTime.current ? Date.now() - sessionStartTime.current.getTime() : 0
    }));
  };

  // Session Management
  useEffect(() => {
    if (isRecording && !sessionStartTime.current) {
      sessionStartTime.current = new Date();
      
      // LED 602: Session started
      trail.light(602, { 
        operation: 'coaching_session_start',
        sessionStartTime: sessionStartTime.current.toISOString()
      });

      // Reset state for new session
      setTranscriptions([]);
      setCoachingPrompts([]);
      setActiveTriggers([]);
      setConversationContext({
        currentStage: 'opening',
        duration: 0,
        talkTimeRatio: { user: 50, prospect: 50 },
        keyTopics: [],
        objections: [],
        opportunities: [],
        nextActions: ['Build rapport', 'Understand their role', 'Set meeting agenda'],
        sentiment: 'neutral',
        lastActivity: new Date()
      });
    } else if (!isRecording && sessionStartTime.current) {
      // LED 603: Session ended
      trail.light(603, { 
        operation: 'coaching_session_end',
        sessionDuration: Date.now() - sessionStartTime.current.getTime(),
        promptsDelivered: performanceMetrics.promptsDelivered
      });

      sessionStartTime.current = null;
    }
  }, [isRecording, performanceMetrics.promptsDelivered]);

  // DISABLED: Mock transcription simulation 
  // This was causing auto-start behavior and unwanted demo data
  // Mock data is COMPLETELY DISABLED to ensure clean user experience
  useEffect(() => {
    // No mock data will be generated - user must explicitly start recording
    // This prevents privacy violations and ensures proper user control
    return;
  }, [isRecording, processNewTranscription]);

  // Public API
  return {
    // State
    transcriptions,
    conversationContext,
    activeTriggers,
    coachingPrompts,
    performanceMetrics,
    isProcessing,

    // Actions
    processNewTranscription,
    markPromptAsUsed: (promptId: string) => {
      setCoachingPrompts(prev => prev.map(p => 
        p.id === promptId ? { ...p, effectiveness: (p.effectiveness || 0) + 1 } : p
      ));
      updatePerformanceMetrics({ promptsUsed: performanceMetrics.promptsUsed + 1 });
    },
    dismissPrompt: (promptId: string) => {
      setCoachingPrompts(prev => prev.filter(p => p.id !== promptId));
    },
    clearSession: () => {
      setTranscriptions([]);
      setCoachingPrompts([]);
      setActiveTriggers([]);
      sessionStartTime.current = null;
    },

    // Analytics
    getAverageResponseTime: () => {
      const times = responseTimeTracker.current;
      return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    },
    getCoachingEffectiveness: () => {
      const delivered = performanceMetrics.promptsDelivered;
      const used = performanceMetrics.promptsUsed;
      return delivered > 0 ? (used / delivered) * 100 : 0;
    }
  };
};

export default useCoachingOrchestrator;