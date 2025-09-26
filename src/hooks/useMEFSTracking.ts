/**
 * VoiceCoach V2 - MEFS Tracking Hook
 * Integrates MEFS orchestrator with React state management
 * Provides real-time MEFS scores and coaching context
 */
import { useState, useEffect, useCallback } from 'react';
import { MEFSCoachingOrchestrator, MEFSCoachingResult, ConversationEntry } from '../services/coaching/mefs-coaching-orchestrator';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

export interface MEFSTrackingState {
  scores: { Mental: number; Emotional: number; Financial: number; Schedule: number };
  stage: string;
  sentiment: string;
  isTracking: boolean;
  lastUpdate: number;
  confidence: number;
  coachingResult: MEFSCoachingResult | null;
}

export const useMEFSTracking = () => {
  const [orchestrator] = useState(() => new MEFSCoachingOrchestrator());
  const [trail] = useState(() => new BreadcrumbTrail('useMEFSTracking'));

  const [state, setState] = useState<MEFSTrackingState>({
    scores: { Mental: 50, Emotional: 50, Financial: 50, Schedule: 50 },
    stage: 'Unknown',
    sentiment: 'Neutral',
    isTracking: false,
    lastUpdate: 0,
    confidence: 0,
    coachingResult: null
  });

  // Process new conversation entry
  const processConversationEntry = useCallback(async (
    speaker: 'user' | 'prospect',
    text: string,
    conversationHistory: ConversationEntry[] = []
  ) => {
    if (!text.trim()) return;

    trail.light(7300, {
      operation: 'mefs_processing_start',
      speaker,
      textLength: text.length,
      historyLength: conversationHistory.length
    });

    try {
      // Build conversation context
      const context = {
        conversationHistory,
        currentTranscript: text,
        processedDocument: null // Will be populated when RAG integration is added
      };

      // Generate coaching suggestion using MEFS analysis
      const result = await orchestrator.generateCoachingSuggestion(context);

      // Update state with new scores and context
      setState(prev => ({
        ...prev,
        scores: {
          Mental: result.displayInfo.mefsScores.Mental,
          Emotional: result.displayInfo.mefsScores.Emotional,
          Financial: result.displayInfo.mefsScores.Financial,
          Schedule: result.displayInfo.mefsScores.Schedule
        },
        stage: result.displayInfo.stageDisplay,
        sentiment: result.displayInfo.sentimentDisplay,
        confidence: result.confidence,
        lastUpdate: Date.now(),
        coachingResult: result
      }));

      trail.light(7301, {
        operation: 'mefs_processing_complete',
        stage: result.context.stage,
        sentiment: result.context.sentiment.direction,
        toolSelected: result.tool_to_use,
        confidence: result.confidence
      });

      return result;

    } catch (error) {
      trail.fail(8300, error as Error);
      console.error('MEFS processing failed:', error);
      return null;
    }
  }, [orchestrator, trail]);

  // Start MEFS tracking
  const startTracking = useCallback(() => {
    setState(prev => ({ ...prev, isTracking: true }));
    orchestrator.reset();

    trail.light(7302, {
      operation: 'mefs_tracking_started',
      timestamp: Date.now()
    });
  }, [orchestrator, trail]);

  // Stop MEFS tracking
  const stopTracking = useCallback(() => {
    setState(prev => ({ ...prev, isTracking: false }));

    trail.light(7303, {
      operation: 'mefs_tracking_stopped',
      timestamp: Date.now()
    });
  }, [trail]);

  // Reset MEFS state
  const resetTracking = useCallback(() => {
    orchestrator.reset();
    setState({
      scores: { Mental: 50, Emotional: 50, Financial: 50, Schedule: 50 },
      stage: 'Unknown',
      sentiment: 'Neutral',
      isTracking: false,
      lastUpdate: 0,
      confidence: 0,
      coachingResult: null
    });

    trail.light(7304, {
      operation: 'mefs_tracking_reset',
      timestamp: Date.now()
    });
  }, [orchestrator, trail]);

  // Get current orchestrator state for debugging
  const getCurrentState = useCallback(() => {
    return orchestrator.getCurrentState();
  }, [orchestrator]);

  // Generate Ollama prompt with MEFS context
  const generateOllamaPrompt = useCallback((knowledgeBase: string = '') => {
    if (!state.coachingResult) return '';

    return orchestrator.buildOllamaPrompt(state.coachingResult, knowledgeBase);
  }, [orchestrator, state.coachingResult]);

  return {
    // State
    ...state,

    // Actions
    processConversationEntry,
    startTracking,
    stopTracking,
    resetTracking,
    getCurrentState,
    generateOllamaPrompt,

    // Helper
    isActive: state.isTracking && state.lastUpdate > 0
  };
};