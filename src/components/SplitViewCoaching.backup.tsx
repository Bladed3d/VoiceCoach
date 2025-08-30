import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  MessageSquare, 
  Brain, 
  Target, 
  TrendingUp, 
  BarChart3, 
  Layout, 
  Mic,
  Clock, 
  Users, 
  Zap, 
  Award,
  ChevronDown,
  Settings,
  Database
} from 'lucide-react';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';
import { VoiceCoachWebSocketClient, TranscriptEvent, CoachingSuggestion } from '../services/websocket-client';

interface SplitViewCoachingProps {
  onNewDocument?: () => void;
}

const SplitViewCoaching: React.FC<SplitViewCoachingProps> = () => {
  const trail = new BreadcrumbTrail('SplitViewCoaching');
  const [isRecording, setIsRecording] = useState(false);
  const wsClient = useRef<VoiceCoachWebSocketClient | null>(null);
  const [wsStatus, setWsStatus] = useState('Disconnected');
  const [currentView, setCurrentView] = useState('Split View');
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [showMicrophoneDropdown, setShowMicrophoneDropdown] = useState(false);
  const [selectedMicrophone, setSelectedMicrophone] = useState('System Default');
  const [showKnowledgeBaseManager, setShowKnowledgeBaseManager] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [questionAnswers, setQuestionAnswers] = useState({
    q1_docType: 'Strategy or Process Document',
    q2_learningObjective: '',
    q3_businessChallenge: '',
    q4_successMetrics: '',
    q5_criticalConcepts: ['', '', '']
  });

  // Load saved answers on component mount
  useEffect(() => {
    const loadSavedAnswers = async () => {
      try {
        const savedData = await window.electronAPI?.loadInsights();
        if (savedData && savedData.questionnaire) {
          setQuestionAnswers(savedData.questionnaire);
          if (savedData.documents) {
            setSelectedFiles(savedData.documents);
          }
          trail.light(6005, { operation: 'loaded_saved_answers', hasData: true });
        } else {
          trail.light(6006, { operation: 'loaded_saved_answers', hasData: false });
        }
      } catch (error) {
        console.warn('Failed to load saved answers:', error);
      }
    };
    
    loadSavedAnswers();
  }, []);

  // Live transcription and coaching state
  const [sessionData, setSessionData] = useState({
    duration: 0,
    stage: 'Opening',
    prompts: 0,
    talkRatio: { user: 50, prospect: 50 },
    responseTime: '0ms',
    effectiveness: 0
  });

  const [coachingPrompts, setCoachingPrompts] = useState<any[]>([]);
  const [transcriptions, setTranscriptions] = useState<any[]>([]);
  const [liveTranscript, setLiveTranscript] = useState('');
  
  // Volume meter state
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isMonitoringVolume, setIsMonitoringVolume] = useState(false);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const volumeAnimationRef = useRef<number | null>(null);

  useEffect(() => {
    // LED 6001: Split View initialized with WebSocket
    trail.light(6001, { 
      operation: 'split_view_init_websocket',
      timestamp: Date.now()
    });
    
    // LED 6002: Component lifecycle and state initialization
    trail.light(6002, {
      operation: 'component_lifecycle_init',
      initialState: {
        recording: isRecording,
        wsStatus: wsStatus,
        currentView: currentView,
        sessionDuration: sessionData.duration,
        totalPrompts: sessionData.prompts
      },
      timestamp: Date.now()
    });

    // Initialize WebSocket client with explicit server URL (native WebSocket protocol)
    wsClient.current = new VoiceCoachWebSocketClient('ws://127.0.0.1:5000');

    // Set up WebSocket event handlers
    
    // Handle audio status messages through standard WebSocket status callback
    // Note: Native WebSocket doesn't support .on() - use status callback instead
    
    wsClient.current.onTranscript((transcript: TranscriptEvent) => {
      const processingStartTime = Date.now();
      
      if (transcript.type === 'final_transcript') {
        // LED 6049: Final transcript processing start
        trail.light(6049, {
          operation: 'final_transcript_processing_start',
          textLength: transcript.text.length,
          wordCount: transcript.text.split(' ').length,
          timestamp: processingStartTime
        });
        
        // Add final transcript to history
        const newTranscription = {
          id: Date.now(),
          speaker: 'unknown',
          text: transcript.text,
          timestamp: Date.now()
        };
        setTranscriptions(prev => [...prev, newTranscription]);
        setLiveTranscript('');
        
        const processingTime = Date.now() - processingStartTime;
        trail.lightWithVerification(6050, 
          { operation: 'final_transcript', text: transcript.text, processingTime },
          { 
            expect: 'fast_processing', 
            actual: processingTime < 50 ? 'fast_processing' : 'slow_processing'
          }
        );
        
        // LED 6051: Transcript storage verification
        trail.checkpoint(6051, 'transcript_storage_verification',
          () => newTranscription.text === transcript.text,
          { 
            storedCorrectly: true,
            transcriptId: newTranscription.id,
            timestamp: Date.now()
          }
        );
        
      } else {
        // LED 6052: Live transcript update
        trail.light(6052, {
          operation: 'live_transcript_update',
          partialTextLength: transcript.text.length,
          isRealTime: true,
          timestamp: Date.now()
        });
        
        // Update live transcript
        setLiveTranscript(transcript.text);
      }
    });

    wsClient.current.onCoaching((suggestion: CoachingSuggestion) => {
      const coachingProcessingStart = Date.now();
      
      // LED 6053: Coaching suggestion processing start
      trail.light(6053, {
        operation: 'coaching_suggestion_processing_start',
        category: suggestion.category,
        priority: suggestion.priority,
        triggerKeyword: suggestion.trigger,
        suggestionLength: suggestion.suggestion.length,
        timestamp: coachingProcessingStart
      });
      
      const newPrompt = {
        id: Date.now(),
        priority: suggestion.priority.toLowerCase(),
        text: suggestion.suggestion,
        category: suggestion.category,
        trigger: suggestion.trigger,
        context: suggestion.context,
        timestamp: suggestion.timestamp
      };
      
      setCoachingPrompts(prev => [...prev, newPrompt]);
      setSessionData(prev => ({ ...prev, prompts: prev.prompts + 1 }));
      
      const processingTime = Date.now() - coachingProcessingStart;
      trail.lightWithVerification(6054, 
        { 
          operation: 'coaching_suggestion_processed', 
          trigger: suggestion.trigger,
          category: suggestion.category,
          processingTime: processingTime
        },
        {
          expect: 'fast_coaching_response',
          actual: processingTime < 100 ? 'fast_coaching_response' : 'slow_coaching_response'
        }
      );
      
      // LED 6055: Coaching prompt analytics
      trail.light(6055, {
        operation: 'coaching_prompt_analytics',
        totalPrompts: sessionData.prompts + 1,
        promptEffectiveness: suggestion.priority === 'HIGH' ? 'high_impact' : 'standard_impact',
        contextRelevance: suggestion.context ? suggestion.context.length : 0,
        timestamp: Date.now()
      });
    });

    wsClient.current.onStatus((status: string) => {
      // LED 6056: WebSocket status update tracking
      trail.light(6056, {
        operation: 'websocket_status_update',
        previousStatus: wsStatus,
        newStatus: status,
        statusChange: wsStatus !== status,
        timestamp: Date.now()
      });
      
      setWsStatus(status);
      
      // LED 6057: Status change impact analysis
      trail.light(6057, {
        operation: 'status_change_impact_analysis',
        isPositiveChange: ['Connected', 'Ready', 'Active'].includes(status),
        requiresUserAction: ['Error', 'Disconnected', 'Failed'].includes(status.split(':')[0]),
        timestamp: Date.now()
      });
    });

    wsClient.current.onError((error: string) => {
      // LED 8024: WebSocket error handling in UI
      trail.fail(8024, new Error(`WebSocket UI error: ${error}`));
      
      // LED 8025: Error impact assessment
      trail.light(8025, {
        operation: 'error_impact_assessment',
        errorMessage: error,
        errorSeverity: error.toLowerCase().includes('critical') ? 'critical' : 'standard',
        sessionImpact: isRecording ? 'session_interrupted' : 'pre_session_error',
        timestamp: Date.now()
      });
      
      console.error('WebSocket error:', error);
      setWsStatus(`Error: ${error}`);
    });

    // Media stream callback for volume monitoring
    wsClient.current.onMediaStream((mediaStream: MediaStream) => {
      // LED 7081: Media stream received for volume monitoring (UI component)
      trail.light(7081, {
        operation: 'media_stream_received_for_volume_monitoring',
        streamActive: mediaStream.active,
        trackCount: mediaStream.getTracks().length,
        timestamp: Date.now()
      });
      
      startVolumeMonitoring(mediaStream);
    });

    // Session timer with enhanced tracking
    const timer = setInterval(() => {
      if (isRecording) {
        // LED 6058: Session timer update
        const newDuration = sessionData.duration + 1000;
        trail.light(6058, {
          operation: 'session_timer_update',
          currentDuration: newDuration,
          sessionMinutes: Math.floor(newDuration / 60000),
          isLongSession: newDuration > 600000, // >10 minutes
          timestamp: Date.now()
        });
        
        setSessionData(prev => ({
          ...prev,
          duration: prev.duration + 1000
        }));
        
        // LED 6059: Session health monitoring
        if (newDuration % 30000 === 0) { // Every 30 seconds
          trail.checkpoint(6059, 'session_health_check',
            () => wsClient.current?.isConnected === true,
            {
              sessionActive: true,
              connectionHealthy: wsClient.current?.isConnected,
              duration: newDuration,
              timestamp: Date.now()
            }
          );
        }
      }
    }, 1000);

    return () => {
      // LED 6060: Component cleanup start
      trail.light(6060, {
        operation: 'component_cleanup_start',
        hasTimer: !!timer,
        hasWebSocket: !!wsClient.current,
        wasRecording: isRecording,
        timestamp: Date.now()
      });
      
      clearInterval(timer);
      
      // Cleanup WebSocket connection
      if (wsClient.current) {
        // LED 6061: WebSocket cleanup
        trail.light(6061, {
          operation: 'websocket_cleanup',
          connectionState: wsClient.current.isConnected,
          timestamp: Date.now()
        });
        
        wsClient.current.disconnect();
      }
      
      // LED 6062: Component cleanup complete
      trail.light(6062, {
        operation: 'component_cleanup_complete',
        cleanupSuccessful: true,
        timestamp: Date.now()
      });
    };
  }, [isRecording]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  // Volume monitoring functions
  const startVolumeMonitoring = (mediaStream: MediaStream) => {
    // LED 7077: Volume monitoring function called
    trail.light(7077, {
      operation: 'volume_monitoring_function_called',
      hasMediaStream: !!mediaStream,
      streamActive: mediaStream?.active,
      trackCount: mediaStream?.getTracks().length,
      timestamp: Date.now()
    });
    
    try {
      // LED 7074: Volume monitoring initialization
      trail.light(7074, {
        operation: 'volume_monitoring_start',
        hasMediaStream: !!mediaStream,
        timestamp: Date.now()
      });

      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(mediaStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioAnalyserRef.current = analyser;
      setIsMonitoringVolume(true);
      
      // LED 7078: Volume monitoring setup complete
      trail.light(7078, {
        operation: 'volume_monitoring_setup_complete',
        analyserCreated: !!analyser,
        audioContextState: audioContext.state,
        isMonitoringVolume: true,
        timestamp: Date.now()
      });
      
      // Start volume update loop
      updateVolumeLevel();
      
    } catch (error) {
      trail.fail(8074, new Error(`Volume monitoring failed: ${error}`));
    }
  };

  const updateVolumeLevel = () => {
    if (!audioAnalyserRef.current || !isMonitoringVolume) {
      // LED 7079: Volume update skipped
      trail.light(7079, {
        operation: 'volume_update_skipped',
        hasAnalyser: !!audioAnalyserRef.current,
        isMonitoring: isMonitoringVolume,
        timestamp: Date.now()
      });
      return;
    }
    
    const dataArray = new Uint8Array(audioAnalyserRef.current.frequencyBinCount);
    audioAnalyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    const volumePercent = Math.round((average / 255) * 100);
    
    // LED 7080: Volume level calculated (only log every 30 frames to avoid spam)
    if (Math.random() < 0.03) { // ~1 in 30 chance
      trail.light(7080, {
        operation: 'volume_level_calculated',
        volumePercent: volumePercent,
        rawAverage: Math.round(average),
        dataArrayLength: dataArray.length,
        timestamp: Date.now()
      });
    }
    
    setVolumeLevel(volumePercent);
    
    // Continue monitoring
    volumeAnimationRef.current = requestAnimationFrame(updateVolumeLevel);
  };

  const stopVolumeMonitoring = () => {
    setIsMonitoringVolume(false);
    setVolumeLevel(0);
    
    if (volumeAnimationRef.current) {
      cancelAnimationFrame(volumeAnimationRef.current);
      volumeAnimationRef.current = null;
    }
    
    audioAnalyserRef.current = null;
    
    // LED 7075: Volume monitoring stopped
    trail.light(7075, {
      operation: 'volume_monitoring_stopped',
      timestamp: Date.now()
    });
  };

  const handleStartSession = async () => {
    const sessionStartTime = Date.now();
    trail.light(6010, { operation: 'session_start_websocket', timestamp: sessionStartTime });
    
    // LED 6003: Session start prerequisites validation
    trail.checkpoint(6003, 'session_start_prerequisites',
      () => wsClient.current !== null,
      {
        hasWebSocketClient: !!wsClient.current,
        currentStatus: wsStatus,
        timestamp: sessionStartTime
      }
    );
    
    try {
      // Step 1: Check microphone permissions (especially important for macOS)
      setWsStatus('Checking microphone permissions...');
      trail.light(6081, {
        operation: 'microphone_permission_check',
        platform: navigator.platform,
        timestamp: Date.now()
      });
      
      if ((window as any).electronAPI?.requestMicrophoneAccess) {
        const permissionResult = await (window as any).electronAPI.requestMicrophoneAccess();
        if (!permissionResult.success) {
          trail.fail(8082, new Error(`Microphone permission denied: ${permissionResult.error}`));
          setWsStatus(`Permission Error: ${permissionResult.error}`);
          
          alert(`🎤 Microphone Permission Required\n\n${permissionResult.error}\n\n🔧 Please grant microphone access and try again.`);
          return;
        }
        
        trail.light(6082, {
          operation: 'microphone_permission_granted',
          status: permissionResult.status,
          platform: permissionResult.platform,
          timestamp: Date.now()
        });
      }
      
      // Step 2: Check audio devices availability
      setWsStatus('Validating audio devices...');
      trail.light(6083, {
        operation: 'audio_device_validation',
        timestamp: Date.now()
      });
      
      if ((window as any).electronAPI?.checkAudioDevices) {
        const audioCheckResult = await (window as any).electronAPI.checkAudioDevices();
        if (!audioCheckResult.success) {
          trail.fail(8083, new Error(`Audio device check failed: ${audioCheckResult.error}`));
          setWsStatus(`Audio Error: ${audioCheckResult.error}`);
          
          alert(`🔊 Audio Device Issue\n\n${audioCheckResult.error}\n\n🔧 Please check microphone configuration and try again.`);
          return;
        }
      }
      
      // Enhanced connection with retry logic
      if (wsClient.current) {
        setWsStatus('Connecting...');
        
        // LED 6004: Connection sequence initiation
        trail.light(6004, {
          operation: 'connection_sequence_initiation',
          previousStatus: wsStatus,
          targetStatus: 'Connected',
          timestamp: Date.now()
        });
        
        trail.light(6012, { operation: 'connection_attempt_start', timestamp: Date.now() });
        
        // First, ensure Python server is started through Electron IPC
        // LED 6063: IPC server start request
        trail.light(6063, {
          operation: 'ipc_server_start_request',
          electronAPIAvailable: !!window.electronAPI,
          timestamp: Date.now()
        });
        
        const serverResult = await (window as any).electronAPI?.startTranscription();
        if (!serverResult?.success) {
          // LED 8026: Server startup failure
          trail.fail(8026, new Error(`Server startup failed: ${serverResult?.error || 'Unknown server error'}`));
          throw new Error(`Server startup failed: ${serverResult?.error || 'Unknown server error'}`);
        }
        
        trail.lightWithVerification(6016, 
          { operation: 'python_server_confirmed_ready', timestamp: Date.now() },
          { expect: 'server_ready', actual: serverResult.success ? 'server_ready' : 'server_failed' }
        );
        
        // Wait additional time for server to be fully ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // LED 6064: WebSocket connection attempt
        trail.light(6064, {
          operation: 'websocket_connection_attempt',
          serverReady: true,
          timestamp: Date.now()
        });
        
        // Connect with enhanced error handling
        await wsClient.current.connect();
        
        // LED 6065: Connection success verification
        trail.checkpoint(6065, 'connection_success_verification',
          () => wsClient.current?.isConnected === true,
          {
            connected: wsClient.current?.isConnected,
            timestamp: Date.now()
          }
        );
        
        // Wait for stable connection before starting transcription
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Start transcription through WebSocket
        // LED 6066: Transcription start attempt
        trail.light(6066, {
          operation: 'transcription_start_attempt',
          connectionReady: wsClient.current?.isConnected,
          timestamp: Date.now()
        });
        
        if (await wsClient.current.startTranscription()) {
          setIsRecording(true);
          setSessionData(prev => ({ 
            ...prev, 
            prompts: 0,
            duration: 0 // Reset session timer
          }));
          
          const sessionStartComplete = Date.now();
          const totalStartupTime = sessionStartComplete - sessionStartTime;
          
          trail.lightWithVerification(6013, 
            { 
              operation: 'transcription_started_successfully',
              totalStartupTime: totalStartupTime,
              timestamp: sessionStartComplete
            },
            {
              expect: 'fast_startup',
              actual: totalStartupTime < 5000 ? 'fast_startup' : 'slow_startup'
            }
          );
          
          // LED 6067: Session state transition confirmation
          trail.light(6067, {
            operation: 'session_state_transition',
            fromState: 'idle',
            toState: 'recording',
            sessionReset: true,
            timestamp: sessionStartComplete
          });
          
          console.log('✅ WebSocket transcription started with server health confirmed');
        } else {
          // LED 8027: Transcription start failure
          trail.fail(8027, new Error('Failed to start WebSocket transcription - not connected'));
          throw new Error('Failed to start WebSocket transcription - not connected');
        }
      } else {
        // LED 8028: WebSocket client missing
        trail.fail(8028, new Error('WebSocket client not initialized'));
        throw new Error('WebSocket client not initialized');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const sessionFailureTime = Date.now() - sessionStartTime;
      
      trail.fail(8020, new Error(`Session start failed: ${errorMessage}`));
      
      // LED 8029: Session start failure analysis
      trail.light(8029, {
        operation: 'session_start_failure_analysis',
        errorMessage: errorMessage,
        failureTime: sessionFailureTime,
        failureStage: errorMessage.includes('server') ? 'server_startup' : 
                      errorMessage.includes('connection') ? 'websocket_connection' : 
                      errorMessage.includes('transcription') ? 'transcription_start' : 'unknown',
        timestamp: Date.now()
      });
      
      console.error('❌ Error starting WebSocket transcription:', error);
      
      // Enhanced error message for users with actionable troubleshooting
      setWsStatus(`Error: ${errorMessage}`);
      
      // User-friendly error dialog
      const troubleshootingSteps = [
        '1. Check if Python is installed and accessible',
        '2. Ensure Python WebSocket server dependencies are installed',
        '3. Verify port 5000 is available (not used by other applications)',
        '4. Check firewall settings for localhost connections',
        '5. Try restarting the application'
      ];
      
      alert(`❌ Connection Failed\n\n${errorMessage}\n\n🔧 Troubleshooting Steps:\n${troubleshootingSteps.join('\n')}\n\n📝 Check DevTools Console for detailed logs`);
    }
  };

  const handleStopSession = async () => {
    const sessionStopTime = Date.now();
    trail.light(6011, { operation: 'session_stop_websocket', timestamp: sessionStopTime });
    
    // LED 6068: Session stop prerequisites
    trail.checkpoint(6068, 'session_stop_prerequisites',
      () => isRecording && wsClient.current !== null,
      {
        wasRecording: isRecording,
        hasWebSocketClient: !!wsClient.current,
        sessionDuration: sessionData.duration,
        timestamp: sessionStopTime
      }
    );
    
    try {
      // Stop volume monitoring first
      stopVolumeMonitoring();
      
      // Enhanced stop with comprehensive cleanup
      if (wsClient.current) {
        setWsStatus('Stopping...');
        
        // LED 6069: Stop sequence initiation
        trail.light(6069, {
          operation: 'stop_sequence_initiation',
          sessionDuration: sessionData.duration,
          totalPrompts: sessionData.prompts,
          transcriptionCount: transcriptions.length,
          timestamp: Date.now()
        });
        
        // Stop transcription first
        wsClient.current.stopTranscription();
        trail.light(6014, { operation: 'transcription_stopped', timestamp: Date.now() });
        
        // Give server time to process stop command
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Clean disconnect
        wsClient.current.disconnect();
        
        trail.lightWithVerification(6015, 
          { operation: 'websocket_disconnected_cleanly', timestamp: Date.now() },
          { expect: 'clean_disconnect', actual: 'clean_disconnect' }
        );
      }
      
      // Stop Python server through Electron IPC
      try {
        // LED 6070: IPC server stop request
        trail.light(6070, {
          operation: 'ipc_server_stop_request',
          timestamp: Date.now()
        });
        
        const stopResult = await (window as any).electronAPI?.stopTranscription();
        if (stopResult?.success) {
          trail.lightWithVerification(6017, 
            { operation: 'python_server_stopped', timestamp: Date.now() },
            { expect: 'server_stopped', actual: 'server_stopped' }
          );
        } else {
          // LED 8030: Server stop warning
          trail.light(8030, {
            operation: 'python_server_stop_warning',
            error: stopResult?.error,
            timestamp: Date.now()
          });
          console.warn('⚠️ Python server stop returned error:', stopResult?.error);
        }
      } catch (serverError) {
        console.warn('⚠️ Failed to stop Python server:', serverError);
        trail.light(8022, { operation: 'python_server_stop_warning', error: serverError });
      }
      
      setIsRecording(false);
      setWsStatus('Disconnected');
      
      // LED 6071: Session data reset
      trail.light(6071, {
        operation: 'session_data_reset',
        finalDuration: sessionData.duration,
        finalPrompts: sessionData.prompts,
        transcriptionsCleared: transcriptions.length,
        timestamp: Date.now()
      });
      
      // Reset session data
      setSessionData(prev => ({
        ...prev,
        duration: 0,
        prompts: 0,
        stage: 'Opening'
      }));
      
      // Clear transcription data
      setLiveTranscript('');
      
      const totalStopTime = Date.now() - sessionStopTime;
      
      console.log('✅ WebSocket transcription stopped and all resources cleaned up');
      trail.lightWithVerification(6018, 
        { 
          operation: 'session_cleanup_complete',
          totalStopTime: totalStopTime,
          timestamp: Date.now()
        },
        {
          expect: 'fast_cleanup',
          actual: totalStopTime < 2000 ? 'fast_cleanup' : 'slow_cleanup'
        }
      );
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stopFailureTime = Date.now() - sessionStopTime;
      
      trail.fail(8021, new Error(`Session stop failed: ${errorMessage}`));
      
      // LED 8031: Session stop failure analysis
      trail.light(8031, {
        operation: 'session_stop_failure_analysis',
        errorMessage: errorMessage,
        stopFailureTime: stopFailureTime,
        forceCleanupRequired: true,
        timestamp: Date.now()
      });
      
      console.error('❌ Error stopping WebSocket transcription:', error);
      
      // Force cleanup even on error
      setIsRecording(false);
      setWsStatus('Error during disconnect');
      setLiveTranscript('');
      
      // LED 6072: Force cleanup completion
      trail.light(6072, {
        operation: 'force_cleanup_complete',
        cleanupRequired: true,
        timestamp: Date.now()
      });
    }
  };

  const handleFileSelection = async () => {
    // LED 6073: File selection initiation
    trail.light(6073, {
      operation: 'file_selection_initiation',
      electronAPIAvailable: !!window.electronAPI,
      currentFileCount: selectedFiles.length,
      timestamp: Date.now()
    });
    
    if (!window.electronAPI) {
      // LED 8032: Electron API unavailable
      trail.fail(8032, new Error('Electron API not available'));
      alert('Electron API not available');
      return;
    }
    
    try {
      const filePaths = await (window as any).electronAPI.selectMultipleFiles();
      if (filePaths && filePaths.length > 0) {
        setSelectedFiles(filePaths);
        
        trail.lightWithVerification(6020, 
          { operation: 'files_selected', count: filePaths.length, timestamp: Date.now() },
          { expect: 'files_selected', actual: filePaths.length > 0 ? 'files_selected' : 'no_files' }
        );
        
        // LED 6074: File selection analytics
        trail.light(6074, {
          operation: 'file_selection_analytics',
          filesSelected: filePaths.length,
          fileTypes: filePaths.map(path => path.split('.').pop()).filter(Boolean),
          totalFiles: filePaths.length,
          timestamp: Date.now()
        });
      } else {
        // LED 6075: No files selected
        trail.light(6075, {
          operation: 'file_selection_cancelled',
          userCancelled: true,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error selecting files:', error);
      trail.fail(8033, error as Error);
    }
  };

  const handleQuestionNavigation = (questionNumber: number) => {
    // LED 6076: Question navigation tracking
    trail.light(6076, {
      operation: 'question_navigation_start',
      fromQuestion: currentQuestion,
      toQuestion: questionNumber,
      direction: questionNumber > currentQuestion ? 'forward' : 'backward',
      timestamp: Date.now()
    });
    
    setCurrentQuestion(questionNumber);
    
    trail.lightWithVerification(6030, 
      { operation: 'question_navigation', question: questionNumber, timestamp: Date.now() },
      { expect: questionNumber, actual: questionNumber }
    );
  };

  const handleAnswerChange = async (field: string, value: string | string[]) => {
    const answerChangeStart = Date.now();
    
    // LED 6077: Answer change tracking
    trail.light(6077, {
      operation: 'answer_change_start',
      field: field,
      valueType: Array.isArray(value) ? 'array' : typeof value,
      valueLength: Array.isArray(value) ? value.join('').length : value.length,
      currentQuestion: currentQuestion,
      timestamp: answerChangeStart
    });
    
    const updatedAnswers = {
      ...questionAnswers,
      [field as keyof typeof questionAnswers]: value
    };
    
    setQuestionAnswers(updatedAnswers);
    
    // Auto-save answers as user types
    try {
      await window.electronAPI?.saveInsights({
        questionnaire: updatedAnswers,
        timestamp: new Date().toISOString(),
        documents: selectedFiles,
        autoSave: true
      });
      
      const autoSaveTime = Date.now() - answerChangeStart;
      
      trail.lightWithVerification(6035, 
        { operation: 'auto_save', field, autoSaveTime, timestamp: Date.now() },
        { expect: 'fast_save', actual: autoSaveTime < 500 ? 'fast_save' : 'slow_save' }
      );
      
      // LED 6078: Answer persistence verification
      trail.checkpoint(6078, 'answer_persistence_verification',
        () => (updatedAnswers as any)[field] === value,
        {
          fieldSaved: field,
          dataPersisted: true,
          timestamp: Date.now()
        }
      );
      
    } catch (error) {
      console.warn('Auto-save failed:', error);
      
      // LED 8034: Auto-save failure
      trail.fail(8034, error as Error);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < 5) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const getQuestionStatus = (questionNumber: number) => {
    if (questionNumber === currentQuestion) return 'current';
    if (questionNumber < currentQuestion) return 'completed';
    return 'pending';
  };

  const viewOptions = [
    'Split View',
    'Coaching Dashboard', 
    'Live Transcription',
    'AI Coaching',
    'Call Insights'
  ];

  const microphoneOptions = [
    'System Default',
    'Microphone (CURRENT)',
    'Video Call Audio',
    'Complete Audio Mix'
  ];

  return (
    <div className="full-screen-app bg-slate-950 text-white font-sans flex flex-col">
      {/* Green Environment Bar */}
      <div className="bg-green-600 text-white px-4 py-1 flex justify-between items-center text-sm">
        <div className="flex items-center space-x-4">
          <span>Env: ✓ Electron</span>
          <span>IPC: Connected</span>
        </div>
        <span>Desktop: Enabled</span>
      </div>

      {/* Main Navigation Bar */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left Side - Connection Status and View Dropdown */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                wsStatus === 'Connected' ? 'bg-green-400 animate-pulse' : 
                wsStatus === 'Connecting...' ? 'bg-yellow-400 animate-pulse' :
                wsStatus === 'Stopping...' ? 'bg-orange-400 animate-pulse' :
                wsStatus.startsWith('Error') ? 'bg-red-400 animate-pulse' :
                'bg-red-400'
              }`}></div>
              <span className={`text-sm font-medium ${
                wsStatus.startsWith('Error') ? 'text-red-400' :
                wsStatus === 'Connected' ? 'text-green-400' :
                wsStatus === 'Connecting...' || wsStatus === 'Stopping...' ? 'text-yellow-400' :
                'text-slate-300'
              }`}>
                {wsStatus}
              </span>
              {wsStatus.startsWith('Error') && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      // Show detailed error information
                      if (wsClient.current) {
                        const debugInfo = wsClient.current.getDebugStatus();
                        console.log('🔍 WebSocket Debug Info:', debugInfo);
                        alert(`🔍 Debug Information:\n\nConnection Status: ${debugInfo.connected}\nServer URL: ${debugInfo.serverUrl}\nSocket ID: ${debugInfo.socketId}\n\n💡 Check DevTools Console for full debug info`);
                      }
                    }}
                    className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white"
                    title="Show debug information"
                  >
                    Debug
                  </button>
                  {(wsStatus.toLowerCase().includes('audio') || wsStatus.toLowerCase().includes('microphone') || wsStatus.toLowerCase().includes('device')) ? (
                    <button
                      onClick={() => {
                        const microphoneGuide = [
                          '🎤 MICROPHONE SETUP GUIDE',
                          '',
                          '✅ QUICK CHECKS:',
                          '1. Microphone is connected and powered on',
                          '2. Set as default recording device:',
                          '   • Right-click speaker icon in taskbar',
                          '   • Select "Open Sound settings"',
                          '   • Choose correct microphone under "Input"',
                          '',
                          '✅ PRIVACY SETTINGS:',
                          '3. Grant microphone permissions:',
                          '   • Windows Settings > Privacy & security > Microphone',
                          '   • Enable "Microphone access" and "Desktop apps"',
                          '',
                          '✅ APP CONFLICTS:',
                          '4. Close other applications using microphone:',
                          '   • Zoom, Teams, Discord, Skype, OBS, etc.',
                          '',
                          '✅ HARDWARE RESET:',
                          '5. Unplug and reconnect microphone',
                          '6. Restart VoiceCoach application',
                          '',
                          '🔧 Still having issues? Click Debug for technical details.'
                        ].join('\n');
                        alert(microphoneGuide);
                      }}
                      className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white"
                      title="Show microphone setup guide"
                    >
                      🎤 Setup Guide
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const connectionGuide = [
                          '🔌 CONNECTION TROUBLESHOOTING',
                          '',
                          '✅ BASIC CHECKS:',
                          '1. Ensure Python is installed',
                          '2. Check Windows firewall isn\'t blocking localhost',
                          '3. Verify port 5000 is available',
                          '',
                          '✅ RESTART SEQUENCE:',
                          '4. Close VoiceCoach completely',
                          '5. Wait 10 seconds',
                          '6. Restart application',
                          '',
                          '🔧 Click Debug for technical details.'
                        ].join('\n');
                        alert(connectionGuide);
                      }}
                      className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white"
                      title="Show connection guide"
                    >
                      🔌 Fix Guide
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* View Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowViewDropdown(!showViewDropdown)}
                className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700 transition-colors"
              >
                <Layout className="w-4 h-4" />
                <span>{currentView}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showViewDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50 min-w-[160px]">
                  {viewOptions.map((view) => (
                    <button
                      key={view}
                      onClick={() => {
                        setCurrentView(view);
                        setShowViewDropdown(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-700 ${
                        view === currentView ? 'bg-primary-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      {view}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center - VoiceCoach Brand */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">VC</span>
            </div>
            <span className="text-lg font-semibold">VoiceCoach</span>
            <span className="text-sm text-slate-400">BETA</span>
          </div>

          {/* Right Side - Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-slate-300">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span>Ready</span>
              <span className="text-slate-400">2:12:05 AM</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <button className="p-1 hover:bg-slate-700 rounded">
                <MessageSquare className="w-4 h-4" />
              </button>
              <button className="p-1 hover:bg-slate-700 rounded">
                <Users className="w-4 h-4" />
              </button>
              <button className="p-1 hover:bg-slate-700 rounded">
                <BarChart3 className="w-4 h-4" />
              </button>
              <button className="p-1 hover:bg-slate-700 rounded">
                <TrendingUp className="w-4 h-4" />
              </button>
              <button 
                className="p-1 hover:bg-slate-700 rounded"
                onClick={() => setShowKnowledgeBaseManager(true)}
                title="Knowledge Base Manager"
              >
                <Database className="w-4 h-4" />
              </button>
              <button className="p-1 hover:bg-slate-700 rounded">
                <Settings className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Microphone Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowMicrophoneDropdown(!showMicrophoneDropdown)}
                  className="flex items-center space-x-2 text-sm hover:bg-slate-700 px-3 py-2 rounded transition-colors"
                >
                  <Mic className="w-4 h-4 text-primary-400" />
                  <span>{selectedMicrophone}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {showMicrophoneDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50 min-w-[200px]">
                    <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-700">
                      Audio Capture Modes
                    </div>
                    {microphoneOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          setSelectedMicrophone(option);
                          setShowMicrophoneDropdown(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-700 ${
                          option === selectedMicrophone ? 'bg-primary-600 text-white' : 'text-slate-300'
                        }`}
                      >
                        {option.includes('CURRENT') && (
                          <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                        )}
                        {option.includes('Video Call') && (
                          <span className="inline-block w-4 h-4 mr-2">📹</span>
                        )}
                        {option.includes('Complete') && (
                          <span className="inline-block w-4 h-4 mr-2">⚡</span>
                        )}
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {!isRecording ? (
                <button
                  onClick={handleStartSession}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Coaching Session</span>
                </button>
              ) : (
                <button
                  onClick={handleStopSession}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop Session</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Coaching Title */}
      <div className="bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">AI Sales Coach</h1>
            <p className="text-slate-400 text-sm">Ready to coach your next call</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-green-400">RAG: Ready for coaching session</span>
            </div>
            <div className="text-sm text-slate-400">
              <span>Mic: System Default</span>
            </div>
          </div>
        </div>
        
        {/* Volume Meter - Visual Microphone Feedback */}
        {isRecording && (
          <div className="mt-4 px-1">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Mic className="w-4 h-4 text-primary-400" />
                <span className="text-xs text-slate-400">Voice Level:</span>
              </div>
              
              {/* Volume Bar */}
              <div className="flex-1 max-w-xs">
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div 
                    className={`h-full transition-all duration-100 ${
                      volumeLevel > 20 ? 'bg-green-400' : 
                      volumeLevel > 5 ? 'bg-yellow-400' : 
                      'bg-red-400'
                    }`}
                    style={{ width: `${Math.min(volumeLevel, 100)}%` }}
                  />
                </div>
              </div>
              
              {/* Volume Percentage */}
              <div className="text-xs font-mono text-slate-300 min-w-[3rem]">
                {volumeLevel}%
              </div>
              
              {/* Status Indicator */}
              <div className="flex items-center space-x-1">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  volumeLevel > 20 ? 'bg-green-400 animate-pulse' : 
                  volumeLevel > 5 ? 'bg-yellow-400' : 
                  'bg-slate-600'
                }`} />
                <span className="text-xs text-slate-400">
                  {volumeLevel > 20 ? 'Good' : volumeLevel > 5 ? 'Low' : 'Silent'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Dashboard */}
      <div className="bg-slate-900 px-6 pb-4">
        <div className="grid grid-cols-6 gap-4">
          {/* Session Duration */}
          <div className="glass-panel p-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-primary-400" />
              <div>
                <div className="text-xs text-slate-400">Session</div>
                <div className="text-sm font-semibold">
                  {formatDuration(sessionData.duration)}
                </div>
              </div>
            </div>
          </div>

          {/* Current Stage */}
          <div className="glass-panel p-3">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-green-400" />
              <div>
                <div className="text-xs text-slate-400">Stage</div>
                <div className="text-sm font-semibold">{sessionData.stage}</div>
              </div>
            </div>
          </div>

          {/* Active Prompts */}
          <div className="glass-panel p-3">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-yellow-400" />
              <div>
                <div className="text-xs text-slate-400">Prompts</div>
                <div className="text-sm font-semibold">{sessionData.prompts}</div>
              </div>
            </div>
          </div>

          {/* Talk Ratio */}
          <div className="glass-panel p-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-xs text-slate-400">Talk Ratio</div>
                <div className="text-sm font-semibold">
                  {sessionData.talkRatio.user}% / {sessionData.talkRatio.prospect}%
                </div>
              </div>
            </div>
          </div>

          {/* Response Time */}
          <div className="glass-panel p-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <div>
                <div className="text-xs text-slate-400">Response</div>
                <div className="text-sm font-semibold">{sessionData.responseTime}</div>
              </div>
            </div>
          </div>

          {/* Effectiveness */}
          <div className="glass-panel p-3">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-xs text-slate-400">Effectiveness</div>
                <div className="text-sm font-semibold">{sessionData.effectiveness}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Split View Content */}
      <div className="flex-1 flex gap-6 px-6 min-h-0">
        {/* AI Coaching Assistant - Left Panel (2/3) */}
        <div className="flex-[2] glass-panel p-6 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">AI Coaching Assistant</h2>
            <button className="text-sm text-slate-400 hover:text-white">
              Clear History
            </button>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto">
            {!isRecording ? (
              <div className="text-center py-12">
                <Brain className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-400 mb-2">
                  Start coaching session for AI insights
                </h3>
                <p className="text-sm text-slate-500">
                  Get real-time suggestions from knowledge base
                </p>
              </div>
            ) : (
              <>
                {coachingPrompts.map((prompt) => (
                  <div 
                    key={prompt.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      prompt.priority === 'critical' 
                        ? 'bg-red-900/20 border-red-500' 
                        : 'bg-blue-900/20 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            prompt.priority === 'critical' 
                              ? 'bg-red-600 text-white' 
                              : 'bg-blue-600 text-white'
                          }`}>
                            {prompt.priority.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400 capitalize">
                            {prompt.category}
                          </span>
                        </div>
                        <p className="text-sm">{prompt.text}</p>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">
                          Copy
                        </button>
                        <button className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">
                          Used
                        </button>
                        <button className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Live Transcription - Right Panel (1/3) */}
        <div className="flex-1 glass-panel p-6 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-primary-400" />
              <h2 className="text-lg font-semibold">Live Transcription</h2>
              <span className="text-xs text-slate-400">({transcriptions.length} messages)</span>
            </div>
            <button className="text-sm text-slate-400 hover:text-white">Clear</button>
          </div>
          
          <div className="flex-1 space-y-3 overflow-y-auto">
            {!isRecording ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-sm text-slate-400">
                  📝 Start recording to see live transcriptions
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  VoiceCoach will listen and provide real-time coaching suggestions
                </p>
              </div>
            ) : (
              <>
                {/* Live partial transcript */}
                {liveTranscript && (
                  <div className="text-sm p-3 rounded bg-yellow-900/20 text-yellow-300 border border-yellow-600/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">🎤 Live</span>
                      <span className="text-xs opacity-60">typing...</span>
                    </div>
                    <div className="break-words italic">{liveTranscript}</div>
                  </div>
                )}
                
                {/* Final transcriptions */}
                {transcriptions.length === 0 && !liveTranscript ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-400">
                      🎙️ Listening for speech...
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Speak to see transcription and get coaching suggestions
                    </p>
                  </div>
                ) : (
                  <>
                    {transcriptions.map((t) => (
                      <div 
                        key={t.id} 
                        className={`text-sm p-3 rounded ${
                          t.speaker === 'user' 
                            ? 'bg-blue-900/20 text-blue-300' 
                            : 'bg-purple-900/20 text-purple-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">
                            {t.speaker === 'user' ? '🎤 You' : '🎧 Speaker'}
                          </span>
                          <span className="text-xs opacity-60">
                            {new Date(t.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="break-words">{t.text}</div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Click outside handler for dropdowns */}
      {showViewDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowViewDropdown(false)}
        />
      )}
      {showMicrophoneDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMicrophoneDropdown(false)}
        />
      )}

      {/* Knowledge Base Manager Modal */}
      {showKnowledgeBaseManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[90%] max-w-4xl h-[90%] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-pink-500 rounded-md flex items-center justify-center">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Knowledge Base Manager</h2>
              </div>
              <button 
                onClick={() => setShowKnowledgeBaseManager(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-6 overflow-y-auto text-gray-900">
              <div className="text-center py-4">
                <p className="text-lg text-gray-600 mb-6">Loading statistics...</p>
                
                {/* Action Buttons - Less prominent */}
                <div className="flex justify-center space-x-2 mb-8">
                  <button className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                    📊 Refresh Stats
                  </button>
                  <button className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                    ✓ Validate Knowledge Base
                  </button>
                  <button className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600">
                    🧠 Research Document
                  </button>
                  <button className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600">
                    📋 Create Use Case Examples
                  </button>
                </div>

                {/* Main Content Area */}
                <div className="max-w-4xl mx-auto">
                  {/* Brain Icon and Reset Default */}
                  <div className="flex justify-center items-center mb-6">
                    <div className="w-8 h-8 bg-pink-500 rounded-md flex items-center justify-center mr-4">
                      <Database className="w-5 h-5 text-white" />
                    </div>
                    <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                      Reset Default
                    </button>
                  </div>

                  {/* Document Analysis Focus Section */}
                  <div className="mb-6">
                    <h3 className="text-left font-semibold mb-2">📄 Document Analysis Focus (Extraction priorities for this document type):</h3>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <button className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                          💾 Save
                        </button>
                        <button className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                          📂 Load
                        </button>
                        <button className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
                          ❌
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 5 Question Progress Circles */}
                  <div className="flex justify-center items-center space-x-4 mb-6">
                    <div className="flex items-center">
                      <span className="text-sm mr-2">Question {currentQuestion} of 5</span>
                      <div className="flex space-x-2">
                        {[1, 2, 3, 4, 5].map((questionNum, index) => (
                          <React.Fragment key={questionNum}>
                            <button
                              onClick={() => handleQuestionNavigation(questionNum)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold cursor-pointer hover:scale-110 transition-transform ${
                                getQuestionStatus(questionNum) === 'completed' 
                                  ? 'bg-green-500 text-white' 
                                  : getQuestionStatus(questionNum) === 'current'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-300 text-gray-600'
                              }`}
                            >
                              {getQuestionStatus(questionNum) === 'completed' ? '✓' : questionNum}
                            </button>
                            {index < 4 && <div className={`w-2 h-2 rounded-full mt-3 ${
                              getQuestionStatus(questionNum) === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                            }`}></div>}
                          </React.Fragment>
                        ))}
                      </div>
                      <span className="text-sm ml-4 text-green-600">
                        {Object.values(questionAnswers).some(answer => 
                          Array.isArray(answer) ? answer.some(a => a) : answer
                        ) ? '✓ Using saved answers' : 'No saved answers'}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button className="bg-gray-500 text-white px-3 py-1 rounded text-sm">Reset</button>
                      <button className="bg-red-500 text-white px-3 py-1 rounded text-sm">Clear Saved</button>
                    </div>
                  </div>

                  {/* Current Question */}
                  <div className="bg-gray-50 p-6 rounded-lg mb-6 text-left">
                    {currentQuestion === 1 && (
                      <>
                        <h3 className="text-lg font-semibold mb-4">What type of document are you uploading?</h3>
                        <div className="space-y-3">
                          <label className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-white cursor-pointer">
                            <input 
                              type="radio" 
                              name="docType" 
                              className="mt-1" 
                              checked={questionAnswers.q1_docType === 'Strategy or Process Document'}
                              onChange={() => handleAnswerChange('q1_docType', 'Strategy or Process Document')}
                            />
                            <div>
                              <div className="font-medium">Strategy or Process Document</div>
                              <div className="text-sm text-gray-600">methodologies, frameworks, best practices</div>
                            </div>
                          </label>
                          
                          <label className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-white cursor-pointer">
                            <input 
                              type="radio" 
                              name="docType" 
                              className="mt-1" 
                              checked={questionAnswers.q1_docType === 'Product or Service Knowledge'}
                              onChange={() => handleAnswerChange('q1_docType', 'Product or Service Knowledge')}
                            />
                            <div>
                              <div className="font-medium">Product or Service Knowledge</div>
                              <div className="text-sm text-gray-600">features, specifications, benefits</div>
                            </div>
                          </label>
                          
                          <label className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-white cursor-pointer">
                            <input 
                              type="radio" 
                              name="docType" 
                              className="mt-1" 
                              checked={questionAnswers.q1_docType === 'Sales Scripts'}
                              onChange={() => handleAnswerChange('q1_docType', 'Sales Scripts')}
                            />
                            <div>
                              <div className="font-medium">Sales Scripts</div>
                              <div className="text-sm text-gray-600">call flows, talk tracks, dialogues</div>
                            </div>
                          </label>
                        </div>
                      </>
                    )}

                    {currentQuestion === 2 && (
                      <>
                        <h3 className="text-lg font-semibold mb-4">What do you want your team to learn from this document?</h3>
                        <p className="text-gray-600 mb-4">Be specific - what knowledge or skills should they gain?</p>
                        <textarea
                          className="w-full h-32 p-3 border rounded-lg resize-none"
                          placeholder="Example: I want them to understand how to use mirroring and labeling techniques to build rapport and handle objections without seeming pushy"
                          value={questionAnswers.q2_learningObjective}
                          onChange={(e) => handleAnswerChange('q2_learningObjective', e.target.value)}
                        />
                      </>
                    )}

                    {currentQuestion === 3 && (
                      <>
                        <h3 className="text-lg font-semibold mb-4">Why do you want them to know this?</h3>
                        <p className="text-gray-600 mb-4">What problems will this solve or what outcomes will this achieve?</p>
                        <textarea
                          className="w-full h-32 p-3 border rounded-lg resize-none"
                          placeholder="Example: Our team struggles with price objections and often drops price too quickly. This document teaches how to redirect the conversation to value instead"
                          value={questionAnswers.q3_businessChallenge}
                          onChange={(e) => handleAnswerChange('q3_businessChallenge', e.target.value)}
                        />
                      </>
                    )}

                    {currentQuestion === 4 && (
                      <>
                        <h3 className="text-lg font-semibold mb-4">What does success look like?</h3>
                        <p className="text-gray-600 mb-4">What does success look like for your team after adding this document to the app?</p>
                        <textarea
                          className="w-full h-32 p-3 border rounded-lg resize-none"
                          placeholder="Example: Reps confidently handle price objections without immediately offering discounts, they keep prospects engaged longer in discovery calls, and they close 20% more deals at full price"
                          value={questionAnswers.q4_successMetrics}
                          onChange={(e) => handleAnswerChange('q4_successMetrics', e.target.value)}
                        />
                      </>
                    )}

                    {currentQuestion === 5 && (
                      <>
                        <h3 className="text-lg font-semibold mb-4">Must-Know Concepts (Optional)</h3>
                        <p className="text-gray-600 mb-4">Are there specific techniques or concepts that are absolutely critical? List 2-3 if applicable</p>
                        <div className="space-y-3">
                          <input
                            type="text"
                            className="w-full p-3 border rounded-lg"
                            placeholder="1. Enter critical concept (optional)"
                            value={questionAnswers.q5_criticalConcepts[0]}
                            onChange={(e) => {
                              const newConcepts = [...questionAnswers.q5_criticalConcepts];
                              newConcepts[0] = e.target.value;
                              handleAnswerChange('q5_criticalConcepts', newConcepts);
                            }}
                          />
                          <input
                            type="text"
                            className="w-full p-3 border rounded-lg"
                            placeholder="2. Enter critical concept (optional)"
                            value={questionAnswers.q5_criticalConcepts[1]}
                            onChange={(e) => {
                              const newConcepts = [...questionAnswers.q5_criticalConcepts];
                              newConcepts[1] = e.target.value;
                              handleAnswerChange('q5_criticalConcepts', newConcepts);
                            }}
                          />
                          <input
                            type="text"
                            className="w-full p-3 border rounded-lg"
                            placeholder="3. Enter critical concept (optional)"
                            value={questionAnswers.q5_criticalConcepts[2]}
                            onChange={(e) => {
                              const newConcepts = [...questionAnswers.q5_criticalConcepts];
                              newConcepts[2] = e.target.value;
                              handleAnswerChange('q5_criticalConcepts', newConcepts);
                            }}
                          />
                        </div>
                      </>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-6">
                      <button 
                        onClick={handlePreviousQuestion}
                        disabled={currentQuestion === 1}
                        className={`px-4 py-2 rounded ${
                          currentQuestion === 1 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-gray-500 text-white hover:bg-gray-600'
                        }`}
                      >
                        Back
                      </button>
                      
                      {currentQuestion === 5 ? (
                        <button 
                          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold"
                          onClick={async () => {
                            try {
                              // Save answers to Electron storage
                              await window.electronAPI?.saveInsights({
                                questionnaire: questionAnswers,
                                timestamp: new Date().toISOString(),
                                documents: selectedFiles
                              });
                              
                              // LED 6079: AI processing launch preparation
                              trail.light(6079, {
                                operation: 'ai_processing_launch_prep',
                                questionnaireComplete: true,
                                answersProvided: Object.keys(questionAnswers).length,
                                documentsSelected: selectedFiles.length,
                                timestamp: Date.now()
                              });
                              
                              // Launch AI processing
                              trail.lightWithVerification(6040, 
                                { operation: 'ai_processing_started', answers: questionAnswers, timestamp: Date.now() },
                                { expect: 'processing_started', actual: 'processing_started' }
                              );
                              
                              console.log('✅ Questionnaire saved and AI processing started');
                              
                              // LED 6080: Knowledge base setup completion
                              trail.light(6080, {
                                operation: 'knowledge_base_setup_completion',
                                questionnaireComplete: true,
                                documentsReady: selectedFiles.length > 0,
                                aiProcessingStarted: true,
                                timestamp: Date.now()
                              });
                              
                              // Close the modal
                              setShowKnowledgeBaseManager(false);
                              
                              // TODO: Navigate to processing view or show processing indicator
                              
                            } catch (error) {
                              console.error('❌ Failed to save questionnaire:', error);
                              
                              // LED 8035: Questionnaire save failure
                              trail.fail(8035, error as Error);
                              
                              // LED 8036: Questionnaire failure recovery
                              trail.light(8036, {
                                operation: 'questionnaire_save_failure_recovery',
                                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                                recoverySuggestion: 'retry_save_or_manual_backup',
                                timestamp: Date.now()
                              });
                              
                              // TODO: Show error message to user
                            }
                          }}
                        >
                          Complete Setup
                        </button>
                      ) : (
                        <button 
                          onClick={handleNextQuestion}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          Next
                        </button>
                      )}
                    </div>

                  </div>

                  {/* File Upload Section - Lower priority */}
                  <div className="border-t pt-6">
                    <h4 className="text-left font-semibold mb-4">Select Directory with Sales Documents</h4>
                    <button className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 mb-4">
                      📁 Select Directory
                    </button>
                    
                    <div className="mb-6">
                      <h4 className="text-left font-semibold mb-2">Or Upload Individual Files (PDF, TXT, MD)</h4>
                      <button 
                        onClick={handleFileSelection}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mr-3"
                      >
                        Choose Files
                      </button>
                      <span className="text-gray-500">
                        {selectedFiles.length > 0 
                          ? `${selectedFiles.length} file(s) selected` 
                          : 'No file chosen'
                        }
                      </span>
                      {selectedFiles.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                          {selectedFiles.map((file: string, index) => {
                            const fileName = file.split(/[/\\]/).pop();
                            return (
                              <div key={index} className="truncate">📄 {fileName}</div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Knowledge Base Documents */}
                    <div className="bg-blue-50 p-4 rounded-lg mb-6">
                      <h4 className="text-left font-semibold mb-2 text-blue-800">Knowledge Base Documents:</h4>
                      <div className="flex items-center mb-2">
                        <input type="checkbox" checked className="mr-2" />
                        <span className="text-sm text-blue-700">Check files to use for live coaching suggestions</span>
                      </div>
                      <div className="flex items-center justify-between bg-white p-2 rounded">
                        <div className="flex items-center">
                          <input type="checkbox" checked className="mr-2" />
                          <span>📄 NeverSplitSummary.txt</span>
                          <span className="ml-2 text-orange-600">⚠️ Awaiting analysis</span>
                          <span className="ml-2 bg-yellow-200 px-2 py-1 rounded text-xs">New Upload</span>
                        </div>
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:underline text-sm">📥 Download</button>
                          <button className="text-red-600 hover:underline text-sm">🗑️ Remove</button>
                        </div>
                      </div>
                    </div>

                    {/* Search Section */}
                    <div className="border-t pt-6">
                      <div className="flex">
                        <input 
                          type="text" 
                          placeholder="Search for sales knowledge, objection handling, product info..."
                          className="flex-1 px-4 py-2 border rounded-l-md"
                        />
                        <button className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700">
                          🔍 Search
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SplitViewCoaching;