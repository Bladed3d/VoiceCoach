/**
 * VoiceCoach V2 - Coaching Session Hook
 * React hook for managing coaching session state
 */
import { useState, useEffect, useRef } from 'react';
import { SessionManagerService } from '../services/coaching/SessionManagerService';
import { SessionState } from '../types/coaching';

export const useCoachingSession = () => {
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ speaker: 'user' | 'prospect'; text: string; timestamp: string }>>([]);
  const sessionManager = useRef<SessionManagerService | null>(null);

  // Initialize session manager
  useEffect(() => {
    console.log('🔧 useCoachingSession: Initializing SessionManagerService...');
    sessionManager.current = new SessionManagerService();
    console.log('🔧 useCoachingSession: SessionManagerService created');
    
    // Subscribe to state changes
    sessionManager.current.onStateChange((state: SessionState) => {
      setSessionState(state);
      // Update conversation history when state changes
      setConversationHistory(sessionManager.current?.getConversationHistory() || []);
    });

    // Set initial state
    setSessionState(sessionManager.current.getState());
    setConversationHistory(sessionManager.current.getConversationHistory());
    setIsInitialized(true);
    console.log('🔧 useCoachingSession: Hook initialized successfully');

    // Cleanup on unmount
    return () => {
      if (sessionManager.current) {
        sessionManager.current.stopSession();
      }
    };
  }, []);

  const startSession = async (captureMode: 'microphone' | 'full-conversation' = 'microphone', selectedDocuments: string[] = []): Promise<boolean> => {
    if (!sessionManager.current) return false;

    // Clear all panels for fresh start
    console.log('🧹 Clearing all panels before starting new session...');
    clearConversationHistory();
    clearTranscriptions();
    clearCoachingPrompts();

    return await sessionManager.current.startSession(captureMode, selectedDocuments);
  };

  const stopSession = async (): Promise<boolean> => {
    if (!sessionManager.current) return false;
    return await sessionManager.current.stopSession();
  };

  const getWebSocketClient = () => {
    return sessionManager.current?.getWebSocketClient() || null;
  };

  const clearTranscriptions = () => {
    if (sessionManager.current) {
      sessionManager.current.clearTranscriptions();
    }
  };

  const clearCoachingPrompts = () => {
    if (sessionManager.current) {
      sessionManager.current.clearCoachingPrompts();
    }
  };

  const clearConversationHistory = () => {
    if (sessionManager.current) {
      sessionManager.current.clearConversationHistory();
      setConversationHistory([]);
      console.log('✅ Conversation history cleared');
    }
  };

  const getSessionManager = () => {
    return sessionManager.current;
  };

  const getConversationHistory = () => {
    return sessionManager.current?.getConversationHistory() || [];
  };

  const getRecentConversation = (count: number = 10) => {
    return sessionManager.current?.getRecentConversation(count) || [];
  };

  return {
    sessionState,
    isInitialized,
    conversationHistory,
    startSession,
    stopSession,
    getWebSocketClient,
    clearTranscriptions,
    clearCoachingPrompts,
    clearConversationHistory,
    getSessionManager,
    getConversationHistory,
    getRecentConversation
  };
};