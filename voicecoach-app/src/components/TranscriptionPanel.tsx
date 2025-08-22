import React, { useState, useEffect, useCallback } from 'react';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

interface TranscriptionResult {
  text: string;
  confidence: number;
  timestamp: number;
  is_user: boolean;
  is_final: boolean;
  chunk_id?: number;
  session_id?: string;
}

interface TranscriptionPanelProps {
  isRecording: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  transcriptions?: any[]; // Accept transcriptions from parent (orchestrator)
}

export const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  transcriptions: propsTranscriptions
}) => {
  console.log('🎯 TranscriptionPanel MOUNTED with props:', { 
    isRecording, 
    hasPropsTranscriptions: !!propsTranscriptions,
    propsTranscriptionsLength: propsTranscriptions?.length 
  });
  
  // Initialize LED breadcrumb trail for TranscriptionPanel component
  const trail = new BreadcrumbTrail('TranscriptionPanel');
  
  // LED 7110: Task 3.2 - TranscriptionPanel UI component initialization
  trail.light(7110, {
    task: "3.2",
    operation: "transcription_panel_init",
    component: "TranscriptionPanel",
    initial_recording_state: isRecording
  });

  // Use transcriptions from props if provided (from orchestrator), otherwise use local state
  const [localTranscriptions, setLocalTranscriptions] = useState<TranscriptionResult[]>([]);
  const transcriptions = propsTranscriptions || localTranscriptions;
  
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalTranscriptions: 0,
    userMessages: 0,
    systemMessages: 0
  });

  // LED 7111: Task 3.2 - Event listener registration for transcription events
  // ONLY set up listener if transcriptions are NOT provided via props
  useEffect(() => {
    // Skip listener if we're getting transcriptions from parent (orchestrator)
    if (propsTranscriptions) {
      console.log('🔴 TranscriptionPanel: SKIPPING listener - using props from orchestrator');
      setIsConnected(true);
      return;
    }
    console.log('🟢 TranscriptionPanel: SETTING UP own listener - no props provided');
    
    trail.light(7111, {
      task: "3.2",
      operation: "event_listener_registration",
      event_target: "voice_transcription"
    });

    let unlistenFn: (() => void) | null = null;

    const setupListener = async () => {
      try {
        // Check if we're in a Tauri environment
        if (typeof window !== 'undefined' && ((window as any).__TAURI__ || (window as any).__TAURI_IPC__)) {
          const { listen } = await import('@tauri-apps/api/event');
          
          trail.light(7111, {
            operation: "tauri_event_listener_setup",
            event: "voice_transcription"
          });
          
          // Register event listener for transcription results from Tauri backend
          const unlisten = await listen('voice_transcription', (event: any) => {
            console.log('📝 Received transcription event:', event);
            
            // LED 7112: Task 3.2 - Transcription event reception
            trail.light(7112, {
              task: "3.2", 
              operation: "transcription_event_received",
              event_data: {
                text_length: event.payload?.text?.length || 0,
                is_final: event.payload?.is_final || false,
                is_user: event.payload?.is_user || false,
                confidence: event.payload?.confidence || 0
              }
            });

            const transcription: TranscriptionResult = {
              text: event.payload.text || '',
              confidence: event.payload.confidence || 0,
              timestamp: event.payload.timestamp || Date.now(),
              is_user: event.payload.is_user || false,
              is_final: event.payload.is_final || false,
              chunk_id: event.payload.chunk_id,
              session_id: event.payload.session_id
            };

            // LED 7113: Task 3.2 - UI state update with transcription data
            trail.light(7113, {
              task: "3.2",
              operation: "ui_state_update_transcription",
              transcription_final: transcription.is_final,
              user_speech: transcription.is_user,
              text_preview: transcription.text.substring(0, 50)
            });

            setLocalTranscriptions(prev => {
              const updated = [...prev, transcription];
              
              // Update statistics
              setStats({
                totalTranscriptions: updated.length,
                userMessages: updated.filter(t => t.is_user).length,
                systemMessages: updated.filter(t => !t.is_user).length
              });

              return updated;
            });

            setIsConnected(true);
            setError(null);
          });

          unlistenFn = unlisten;
          
          // LED 7115: Task 3.2 - Event listener cleanup registration
          trail.light(7115, {
            task: "3.2",
            operation: "event_listener_cleanup_registration"
          });
          
          console.log('✅ Tauri event listener registered for voice_transcription');
          setIsConnected(true);
        } else {
          // Not in Tauri environment - show warning
          setError('Running in browser mode - Tauri features not available');
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Failed to setup Tauri listener:', error);
        setError('Failed to setup event listener');
        setIsConnected(false);
      }
    };

    setupListener();

    return () => {
      trail.light(7116, {
        task: "3.2",
        operation: "event_listener_cleanup_executed"
      });
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [propsTranscriptions]);
  
  // Update stats when transcriptions change
  useEffect(() => {
    if (transcriptions) {
      setStats({
        totalTranscriptions: transcriptions.length,
        userMessages: transcriptions.filter((t: any) => t.is_user || t.speaker === 'user').length,
        systemMessages: transcriptions.filter((t: any) => !t.is_user && t.speaker !== 'user').length
      });
    }
  }, [transcriptions]);

  // LED 7117: Task 3.2 - UI interaction handlers
  const handleStartRecording = useCallback(() => {
    trail.light(7117, {
      task: "3.2",
      operation: "ui_start_recording_clicked",
      user_interaction: "start_button"
    });

    if (onStartRecording) {
      onStartRecording();
    }
  }, [onStartRecording]);

  const handleStopRecording = useCallback(() => {
    trail.light(7118, {
      task: "3.2", 
      operation: "ui_stop_recording_clicked",
      user_interaction: "stop_button"
    });

    if (onStopRecording) {
      onStopRecording();
    }
  }, [onStopRecording]);

  const clearTranscriptions = useCallback(() => {
    trail.light(7119, {
      task: "3.2",
      operation: "ui_clear_transcriptions",
      transcriptions_cleared: transcriptions.length
    });

    setLocalTranscriptions([]);
    setStats({
      totalTranscriptions: 0,
      userMessages: 0,
      systemMessages: 0
    });
  }, [transcriptions.length]);

  return (
    <div className="transcription-panel p-4 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">📝 Real-time Transcription</h2>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={handleStartRecording}
          disabled={isRecording}
          className={`px-4 py-2 rounded-lg font-medium ${
            isRecording 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          🎙️ Start Recording
        </button>
        
        <button
          onClick={handleStopRecording}
          disabled={!isRecording}
          className={`px-4 py-2 rounded-lg font-medium ${
            !isRecording
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          ⏹️ Stop Recording
        </button>

        <button
          onClick={clearTranscriptions}
          className="px-4 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600"
        >
          🗑️ Clear
        </button>

        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isRecording ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-gray-100 text-gray-600'
        }`}>
          {isRecording ? '🔴 Recording...' : '⏸️ Stopped'}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-lg font-bold text-blue-600">{stats.totalTranscriptions}</div>
          <div className="text-sm text-blue-500">Total Messages</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-lg font-bold text-green-600">{stats.userMessages}</div>
          <div className="text-sm text-green-500">User Messages</div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="text-lg font-bold text-purple-600">{stats.systemMessages}</div>
          <div className="text-sm text-purple-500">System Audio</div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Transcription Display */}
      <div className="transcription-display border rounded-lg bg-gray-50 max-h-96 overflow-y-auto">
        {transcriptions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-lg mb-2">🎧 Ready for Transcription</div>
            <div className="text-sm">Start recording to see real-time transcriptions appear here</div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {[...transcriptions].reverse().map((transcription: any, index) => {
              // Handle both formats: is_user field or speaker field
              const isUser = transcription.is_user || transcription.speaker === 'user';
              const text = transcription.text;
              const timestamp = transcription.timestamp;
              const ledNumber = transcription.led_number;
              const source = transcription.source;
              
              return (
                <div
                  key={transcription.id || index}
                  className={`p-3 rounded-lg ${
                    isUser 
                      ? 'bg-blue-100 border-l-4 border-blue-500 ml-8'
                      : 'bg-green-100 border-l-4 border-green-500 mr-8'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className={`font-medium text-sm mb-1 ${
                        isUser ? 'text-blue-700' : 'text-green-700'
                      }`}>
                        {isUser ? '👤 User' : '🔊 System Audio'}
                        {ledNumber && (
                          <span className="ml-2 px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded font-mono">
                            LED {ledNumber}
                          </span>
                        )}
                        {source && (
                          <span className="ml-1 px-2 py-0.5 bg-purple-200 text-purple-800 text-xs rounded">
                            {source}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-800">{text}</div>
                  </div>
                  <div className="flex flex-col items-end text-xs text-gray-500 ml-4">
                    <div>{new Date(timestamp).toLocaleTimeString()}</div>
                    <div className="flex items-center mt-1">
                      <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                        transcription.confidence > 0.8 ? 'bg-green-400' :
                        transcription.confidence > 0.6 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}></span>
                      <span>{Math.round((transcription.confidence || 0) * 100)}%</span>
                    </div>
                    {transcription.is_final && (
                      <div className="text-green-600 font-medium">✓ Final</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <div>Debug: LED tracking active for TranscriptionPanel component</div>
          <div>Task 3.2 - Frontend transcription panel operations and UI events</div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionPanel;