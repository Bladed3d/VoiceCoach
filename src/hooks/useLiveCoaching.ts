/**
 * VoiceCoach V2 - Live Coaching Hook
 * React hook for managing live coaching service integration
 * Based on working backup implementation from 08/22/25
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { LiveCoachingManager, CoachingManagerStatus } from '../services/coaching/live-coaching-manager';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

export interface CoachingSuggestion {
  type: 'coaching_suggestion';
  suggestion: string;
  trigger: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  context: string;
  timestamp: string;
}

export interface TranscriptEvent {
  type: 'final_transcript' | 'partial_transcript';
  text: string;
  timestamp: string;
}

export interface UseLiveCoachingReturn {
  // Status
  status: CoachingManagerStatus;
  isReady: boolean;
  
  // Actions
  initialize: () => Promise<boolean>;
  loadDocument: (documentName: string) => Promise<boolean>;
  startCoaching: () => Promise<boolean>;
  stopCoaching: () => void;
  
  // Data
  coachingSuggestions: CoachingSuggestion[];
  transcripts: TranscriptEvent[];
  
  // Utilities
  clearSuggestions: () => void;
  clearTranscripts: () => void;
}

export const useLiveCoaching = (): UseLiveCoachingReturn => {
  const [status, setStatus] = useState<CoachingManagerStatus>({
    initialized: false,
    ollamaConnected: false,
    websocketConnected: false,
    documentLoaded: false,
    serviceReady: false
  });
  
  const [coachingSuggestions, setCoachingSuggestions] = useState<CoachingSuggestion[]>([]);
  const [transcripts, setTranscripts] = useState<TranscriptEvent[]>([]);
  
  const managerRef = useRef<LiveCoachingManager | null>(null);
  const trailRef = useRef<BreadcrumbTrail>(new BreadcrumbTrail('useLiveCoaching'));

  // Initialize manager on first use
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new LiveCoachingManager();
      
      trailRef.current.light(7300, {
        operation: 'use_live_coaching_hook_initialized',
        manager_created: true,
        timestamp: Date.now()
      });
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current = null;
      }
    };
  }, []);

  // Setup event listeners for coaching suggestions and transcripts
  useEffect(() => {
    const handleCoachingSuggestion = (event: CustomEvent<CoachingSuggestion>) => {
      const suggestion = event.detail;
      
      trailRef.current.light(7310, {
        operation: 'coaching_suggestion_received',
        priority: suggestion.priority,
        category: suggestion.category,
        suggestion_preview: suggestion.suggestion.substring(0, 50) + '...'
      });

      setCoachingSuggestions(prev => [...prev, suggestion]);
    };

    const handleTranscriptReceived = (event: CustomEvent<TranscriptEvent>) => {
      const transcript = event.detail;
      
      trailRef.current.light(7311, {
        operation: 'transcript_received',
        type: transcript.type,
        text_length: transcript.text.length,
        timestamp: transcript.timestamp
      });

      setTranscripts(prev => [...prev, transcript]);
    };

    window.addEventListener('coachingSuggestion', handleCoachingSuggestion as EventListener);
    window.addEventListener('transcriptReceived', handleTranscriptReceived as EventListener);

    return () => {
      window.removeEventListener('coachingSuggestion', handleCoachingSuggestion as EventListener);
      window.removeEventListener('transcriptReceived', handleTranscriptReceived as EventListener);
    };
  }, []);

  // Periodically update status
  useEffect(() => {
    const updateStatus = () => {
      if (managerRef.current) {
        const newStatus = managerRef.current.getStatus();
        setStatus(newStatus);
      }
    };

    const interval = setInterval(updateStatus, 2000); // Update every 2 seconds
    updateStatus(); // Initial update

    return () => clearInterval(interval);
  }, []);

  const initialize = useCallback(async (): Promise<boolean> => {
    if (!managerRef.current) return false;

    trailRef.current.light(7320, {
      operation: 'initialize_live_coaching_start',
      timestamp: Date.now()
    });

    const success = await managerRef.current.initialize();
    
    if (success) {
      trailRef.current.light(7321, {
        operation: 'initialize_live_coaching_success',
        timestamp: Date.now()
      });
    } else {
      trailRef.current.fail(8320, new Error('Failed to initialize live coaching'));
    }

    return success;
  }, []);

  const loadDocument = useCallback(async (documentName: string): Promise<boolean> => {
    if (!managerRef.current) return false;

    trailRef.current.light(7330, {
      operation: 'load_document_start',
      document_name: documentName,
      timestamp: Date.now()
    });

    const success = await managerRef.current.loadDocumentFromRag(documentName);
    
    if (success) {
      trailRef.current.light(7331, {
        operation: 'load_document_success',
        document_name: documentName,
        timestamp: Date.now()
      });
    } else {
      trailRef.current.fail(8330, new Error(`Failed to load document: ${documentName}`));
    }

    return success;
  }, []);

  const startCoaching = useCallback(async (): Promise<boolean> => {
    if (!managerRef.current) return false;

    trailRef.current.light(7340, {
      operation: 'start_coaching_session',
      timestamp: Date.now()
    });

    const success = await managerRef.current.startLiveCoaching();
    
    if (success) {
      trailRef.current.light(7341, {
        operation: 'coaching_session_started',
        timestamp: Date.now()
      });
    } else {
      trailRef.current.fail(8340, new Error('Failed to start coaching session'));
    }

    return success;
  }, []);

  const stopCoaching = useCallback((): void => {
    if (!managerRef.current) return;

    trailRef.current.light(7350, {
      operation: 'stop_coaching_session',
      timestamp: Date.now()
    });

    managerRef.current.stopLiveCoaching();
    
    trailRef.current.light(7351, {
      operation: 'coaching_session_stopped',
      timestamp: Date.now()
    });
  }, []);

  const clearSuggestions = useCallback((): void => {
    setCoachingSuggestions([]);
    
    trailRef.current.light(7360, {
      operation: 'coaching_suggestions_cleared',
      timestamp: Date.now()
    });
  }, []);

  const clearTranscripts = useCallback((): void => {
    setTranscripts([]);
    
    trailRef.current.light(7361, {
      operation: 'transcripts_cleared',
      timestamp: Date.now()
    });
  }, []);

  const isReady = status.serviceReady && status.documentLoaded;

  return {
    status,
    isReady,
    initialize,
    loadDocument,
    startCoaching,
    stopCoaching,
    coachingSuggestions,
    transcripts,
    clearSuggestions,
    clearTranscripts
  };
};