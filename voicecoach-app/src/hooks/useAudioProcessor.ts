import { useState, useEffect, useCallback, useRef } from 'react';
import { smartInvoke, getEnvironmentInfo, isTauriEnvironment } from '../lib/tauri-mock';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

// Types for audio processing data
export interface AudioLevels {
  user: number;      // 0-100 percentage
  prospect: number;  // 0-100 percentage
  timestamp: number; // milliseconds since start
}

export interface AudioDevice {
  name: string;
  is_input: boolean;
  is_default: boolean;
  sample_rate: number;
  channels: number;
}

export interface AudioConfig {
  sample_rate: number;
  channels: number;
  buffer_size: number;
  device_name?: string;
  enable_preprocessing: boolean;
  latency_target_ms: number;
}

export interface PerformanceMetrics {
  average_latency_ms: number;
  uptime_seconds: number;
  total_transcriptions: number;
  status: string;
  target_latency_ms: number;
}

export type AudioStatus = 'Stopped' | 'Starting' | 'Recording' | 'Processing' | { Error: string };

// Custom hook for real-time audio processing integration
export const useAudioProcessor = () => {
  // Initialize LED breadcrumb trail for audio processor
  const trail = new BreadcrumbTrail('useAudioProcessor');
  
  // LED 500: Audio processor hook initialization
  trail.light(500, { operation: 'audio_processor_hook_init' });
  
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [audioLevels, setAudioLevels] = useState<AudioLevels>({ user: 0, prospect: 0, timestamp: 0 });
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('Stopped');
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // LED 501: Initial state setup complete
  trail.light(501, { 
    initial_state: {
      isRecording: false,
      isConnected: false,
      audioStatus: 'Stopped'
    }
  });
  
  // Refs for cleanup and polling
  const levelsPollingRef = useRef<NodeJS.Timeout | null>(null);
  const statusPollingRef = useRef<NodeJS.Timeout | null>(null);
  const metricsPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio processor on mount
  useEffect(() => {
    // LED 502: Audio processor initialization effect
    trail.light(502, { operation: 'audio_init_effect_start' });
    
    const initializeAudioProcessor = async () => {
      try {
        // LED 210: Tauri API call - Initialize VoiceCoach
        trail.light(210, { api_call: 'initialize_voicecoach' });
        
        console.log('🎙️ Initializing VoiceCoach audio processor...');
        console.log('🔧 Environment info:', getEnvironmentInfo());
        const response = await smartInvoke('initialize_voicecoach');
        console.log('✅ Audio processor initialized:', response);
        
        // LED 211: Tauri API call successful
        trail.light(211, { 
          api_response: 'initialize_voicecoach_success',
          response: response 
        });
        
        // LED 503: State update - Connection established
        trail.light(503, { state_update: 'connection_established' });
        setIsConnected(true);
        setError(null);
        
        // Load initial audio devices
        // LED 212: Tauri API call - Refresh audio devices
        trail.light(212, { api_call: 'refresh_audio_devices' });
        await refreshAudioDevices();
        
        // Start polling for status
        // LED 504: Status polling initialization
        trail.light(504, { operation: 'status_polling_start' });
        startStatusPolling();
        
      } catch (err) {
        // LED 210: Tauri API call failed
        trail.fail(210, err as Error);
        
        console.error('❌ Failed to initialize audio processor:', err);
        setError(err as string);
        setIsConnected(false);
        
        // LED 503: State update - Connection failed
        trail.light(503, { 
          state_update: 'connection_failed',
          error: err as string
        });
      }
    };

    initializeAudioProcessor();

    // Cleanup on unmount
    return () => {
      // LED 505: Cleanup on unmount
      trail.light(505, { operation: 'audio_processor_cleanup' });
      stopAllPolling();
    };
  }, []);

  // Start real-time audio level polling when recording
  const startLevelsPolling = useCallback(() => {
    if (levelsPollingRef.current) return;
    
    // LED 506: Audio levels polling start
    trail.light(506, { operation: 'audio_levels_polling_start' });
    
    levelsPollingRef.current = setInterval(async () => {
      try {
        // LED 213: Tauri API call - Get audio levels (high frequency)
        const levels = await smartInvoke('get_audio_levels');
        
        // LED 507: Audio levels received and state updated
        trail.light(507, { 
          audio_levels: {
            user: levels.user,
            prospect: levels.prospect,
            timestamp: levels.timestamp
          }
        });
        
        setAudioLevels(levels);
      } catch (err) {
        // LED 213: Audio levels API call failed
        trail.fail(213, err as Error);
        console.warn('Failed to get audio levels:', err);
      }
    }, 16); // ~60 FPS for smooth visualization
  }, []);

  // Stop audio levels polling
  const stopLevelsPolling = useCallback(() => {
    if (levelsPollingRef.current) {
      // LED 508: Audio levels polling stop
      trail.light(508, { operation: 'audio_levels_polling_stop' });
      
      clearInterval(levelsPollingRef.current);
      levelsPollingRef.current = null;
    }
  }, []);

  // Start status polling
  const startStatusPolling = useCallback(() => {
    if (statusPollingRef.current) return;
    
    statusPollingRef.current = setInterval(async () => {
      try {
        const status = await smartInvoke('get_audio_status');
        setAudioStatus(status);
        
        // DO NOT automatically change recording state based on backend status
        // This was causing auto-start behavior - only user actions should control recording state
        // The recording state should only be set by explicit user start/stop actions
        
      } catch (err) {
        console.warn('Failed to get audio status:', err);
      }
    }, 500); // 2 FPS for status updates
  }, []);

  // Start performance metrics polling
  const startMetricsPolling = useCallback(() => {
    if (metricsPollingRef.current) return;
    
    metricsPollingRef.current = setInterval(async () => {
      try {
        const metrics = await smartInvoke('get_performance_metrics');
        setPerformanceMetrics(metrics);
      } catch (err) {
        console.warn('Failed to get performance metrics:', err);
      }
    }, 2000); // Every 2 seconds for metrics
  }, []);

  // Stop metrics polling
  const stopMetricsPolling = useCallback(() => {
    if (metricsPollingRef.current) {
      clearInterval(metricsPollingRef.current);
      metricsPollingRef.current = null;
    }
  }, []);

  // Stop all polling
  const stopAllPolling = useCallback(() => {
    stopLevelsPolling();
    if (statusPollingRef.current) {
      clearInterval(statusPollingRef.current);
      statusPollingRef.current = null;
    }
    stopMetricsPolling();
  }, [stopLevelsPolling, stopMetricsPolling]);

  // Start recording with explicit user consent and microphone permission
  const startRecording = useCallback(async () => {
    // LED 509: Start recording operation
    trail.light(509, { operation: 'start_recording_begin' });
    
    try {
      console.log('🎙️ User explicitly requested recording start...');
      setError(null);
      
      // Check if browser permissions are needed (web mode)
      if (!isTauriEnvironment()) {
        try {
          console.log('🔒 Requesting microphone permission...');
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('✅ Microphone permission granted');
          // Stop the test stream
          stream.getTracks().forEach(track => track.stop());
        } catch (permissionError) {
          console.error('❌ Microphone permission denied:', permissionError);
          setError('Microphone permission is required for VoiceCoach to function. Please allow microphone access and try again.');
          return;
        }
      }
      
      // LED 220: Tauri API call - Start recording
      trail.light(220, { api_call: 'start_recording' });
      
      const response = await smartInvoke('start_recording');
      console.log('✅ Recording started:', response);
      
      // LED 221: Start recording API success
      trail.light(221, { 
        api_response: 'start_recording_success',
        response: response
      });
      
      // LED 510: Recording started successfully
      trail.light(510, { operation: 'start_recording_complete' });
      
      // Explicitly set recording state and start polling
      setIsRecording(true);
      startLevelsPolling();
      startMetricsPolling();
      
    } catch (err) {
      // LED 220: Start recording API failed
      trail.fail(220, err as Error);
      
      console.error('❌ Failed to start recording:', err);
      setError(err as string);
      setIsRecording(false);
      
      // LED 511: Recording start failed
      trail.light(511, { 
        operation: 'start_recording_failed',
        error: err as string
      });
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(async () => {
    // LED 512: Stop recording operation
    trail.light(512, { operation: 'stop_recording_begin' });
    
    try {
      console.log('🛑 Stopping audio recording...');
      setError(null);
      
      // LED 222: Tauri API call - Stop recording
      trail.light(222, { api_call: 'stop_recording' });
      
      const response = await smartInvoke('stop_recording');
      console.log('✅ Recording stopped:', response);
      
      // LED 223: Stop recording API success
      trail.light(223, { 
        api_response: 'stop_recording_success',
        response: response
      });
      
      // LED 513: Recording stopped successfully
      trail.light(513, { operation: 'stop_recording_complete' });
      
      // Explicitly set recording state and stop polling
      setIsRecording(false);
      stopLevelsPolling();
      stopMetricsPolling();
      
    } catch (err) {
      // LED 222: Stop recording API failed
      trail.fail(222, err as Error);
      
      console.error('❌ Failed to stop recording:', err);
      setError(err as string);
      
      // LED 514: Recording stop failed
      trail.light(514, { 
        operation: 'stop_recording_failed',
        error: err as string
      });
    }
  }, []);

  // Refresh audio devices list
  const refreshAudioDevices = useCallback(async () => {
    // LED 515: Refresh audio devices operation
    trail.light(515, { operation: 'refresh_audio_devices_begin' });
    
    try {
      // LED 224: Tauri API call - Get audio devices
      trail.light(224, { api_call: 'get_audio_devices' });
      
      const devices = await smartInvoke('get_audio_devices');
      
      // LED 225: Get audio devices API success
      trail.light(225, { 
        api_response: 'get_audio_devices_success',
        device_count: devices.length
      });
      
      setAudioDevices(devices);
      console.log(`🎧 Found ${devices.length} audio devices`);
      
      // LED 516: Audio devices refreshed successfully
      trail.light(516, { 
        operation: 'refresh_audio_devices_complete',
        devices: devices.map((d: any) => ({ name: d.name, is_input: d.is_input, is_default: d.is_default }))
      });
      
    } catch (err) {
      // LED 224: Get audio devices API failed
      trail.fail(224, err as Error);
      
      console.error('❌ Failed to get audio devices:', err);
      setError(err as string);
      
      // LED 517: Refresh audio devices failed
      trail.light(517, { 
        operation: 'refresh_audio_devices_failed',
        error: err as string
      });
    }
  }, []);

  // Update audio configuration
  const updateAudioConfig = useCallback(async (config: AudioConfig) => {
    try {
      console.log('⚙️ Updating audio configuration:', config);
      const response = await smartInvoke('update_audio_config', { config });
      console.log('✅ Audio config updated:', response);
      setError(null);
    } catch (err) {
      console.error('❌ Failed to update audio config:', err);
      setError(err as string);
    }
  }, []);

  // Get coaching suggestions based on transcript
  const getCoachingSuggestions = useCallback(async (transcript: string): Promise<string[]> => {
    try {
      const suggestions = await smartInvoke('get_coaching_suggestions', { transcript });
      return suggestions;
    } catch (err) {
      console.error('❌ Failed to get coaching suggestions:', err);
      setError(err as string);
      return [];
    }
  }, []);

  // Calculate audio level percentages for visualization
  const getAudioLevelPercent = useCallback((level: number) => {
    return Math.min(Math.max(level, 0), 100);
  }, []);

  // Check if user is currently speaking (threshold-based)
  const isUserSpeaking = useCallback((threshold = 30) => {
    return audioLevels.user > threshold;
  }, [audioLevels.user]);

  // Check if prospect is currently speaking
  const isProspectSpeaking = useCallback((threshold = 30) => {
    return audioLevels.prospect > threshold;
  }, [audioLevels.prospect]);

  // Get status color for UI
  const getStatusColor = useCallback(() => {
    if (typeof audioStatus === 'object' && 'Error' in audioStatus) {
      return 'text-red-400';
    }
    switch (audioStatus) {
      case 'Recording':
        return 'text-green-400';
      case 'Starting':
      case 'Processing':
        return 'text-yellow-400';
      case 'Stopped':
        return 'text-slate-400';
      default:
        return 'text-slate-400';
    }
  }, [audioStatus]);

  // Get status text for display
  const getStatusText = useCallback(() => {
    if (typeof audioStatus === 'object' && 'Error' in audioStatus) {
      return `Error: ${audioStatus.Error}`;
    }
    return audioStatus;
  }, [audioStatus]);

  // Format performance metrics for display
  const getFormattedMetrics = useCallback(() => {
    if (!performanceMetrics) return null;
    
    return {
      averageLatency: `${performanceMetrics.average_latency_ms.toFixed(1)}ms`,
      uptime: formatUptime(performanceMetrics.uptime_seconds),
      transcriptions: performanceMetrics.total_transcriptions,
      targetLatency: `${performanceMetrics.target_latency_ms}ms`,
      status: performanceMetrics.status,
    };
  }, [performanceMetrics]);

  return {
    // State
    isRecording,
    isConnected,
    audioLevels,
    audioDevices,
    audioStatus,
    performanceMetrics,
    error,
    
    // Actions
    startRecording,
    stopRecording,
    refreshAudioDevices,
    updateAudioConfig,
    getCoachingSuggestions,
    
    // Utilities
    getAudioLevelPercent,
    isUserSpeaking,
    isProspectSpeaking,
    getStatusColor,
    getStatusText,
    getFormattedMetrics,
  };
};

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

export default useAudioProcessor;