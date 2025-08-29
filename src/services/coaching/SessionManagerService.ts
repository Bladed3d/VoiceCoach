/**
 * VoiceCoach V2 - Session Manager Service
 * Manages coaching session state and WebSocket integration
 * LED Range: 6300-6399
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { VoiceCoachWebSocketClient, TranscriptEvent, CoachingSuggestion } from '../websocket/websocket-client';
import { VolumeMonitoringService } from '../audio/VolumeMonitoringService';
import { 
  SessionState, 
  SessionData, 
  CoachingPrompt, 
  TranscriptionItem, 
  VolumeState 
} from '../../types/coaching';

export class SessionManagerService {
  private trail: BreadcrumbTrail;
  private wsClient: VoiceCoachWebSocketClient;
  private volumeService: VolumeMonitoringService;
  private sessionState: SessionState;
  private stateCallback?: (state: SessionState) => void;
  private sessionTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.trail = new BreadcrumbTrail('SessionManagerService');
    
    // Initialize services
    this.wsClient = new VoiceCoachWebSocketClient('ws://127.0.0.1:5000');
    this.volumeService = new VolumeMonitoringService();
    
    // Initialize session state
    this.sessionState = this.createInitialState();
    
    // LED 6300: Session manager initialization
    this.trail.light(6300, {
      operation: 'session_manager_initialization',
      timestamp: Date.now()
    });

    this.setupWebSocketHandlers();
    this.setupVolumeHandler();
  }

  /**
   * Start coaching session
   */
  async startSession(): Promise<boolean> {
    const sessionStartTime = Date.now();
    
    // LED 6301: Session start initiation
    this.trail.light(6301, {
      operation: 'session_start_initiation',
      timestamp: sessionStartTime
    });

    try {
      // Update status
      this.updateSessionState({
        wsStatus: 'Checking microphone permissions...'
      });

      // Check microphone permissions
      if ((window as any).electronAPI?.requestMicrophoneAccess) {
        const permissionResult = await (window as any).electronAPI.requestMicrophoneAccess();
        if (!permissionResult.success) {
          throw new Error(`Microphone permission denied: ${permissionResult.error}`);
        }
      }

      // Check audio devices
      this.updateSessionState({
        wsStatus: 'Validating audio devices...'
      });

      if ((window as any).electronAPI?.checkAudioDevices) {
        const audioCheckResult = await (window as any).electronAPI.checkAudioDevices();
        if (!audioCheckResult.success) {
          throw new Error(`Audio device check failed: ${audioCheckResult.error}`);
        }
      }

      // Start WebSocket server through Electron IPC
      this.updateSessionState({
        wsStatus: 'Connecting...'
      });

      const serverResult = await (window as any).electronAPI?.startTranscription();
      if (!serverResult?.success) {
        throw new Error(`Server startup failed: ${serverResult?.error || 'Unknown server error'}`);
      }

      // Wait for server to be fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Connect WebSocket client
      await this.wsClient.connect();
      
      // Start transcription
      if (await this.wsClient.startTranscription()) {
        // Start session timer
        this.startSessionTimer();
        
        // Update session state
        this.updateSessionState({
          isRecording: true,
          sessionData: {
            ...this.sessionState.sessionData,
            duration: 0,
            prompts: 0
          }
        });

        const totalStartupTime = Date.now() - sessionStartTime;
        
        // LED 6302: Session start success
        this.trail.lightWithVerification(6302, 
          { 
            operation: 'session_start_success',
            totalStartupTime,
            timestamp: Date.now()
          },
          {
            expect: 'fast_startup',
            actual: totalStartupTime < 5000 ? 'fast_startup' : 'slow_startup'
          }
        );

        return true;
      } else {
        throw new Error('Failed to start WebSocket transcription');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // LED 8300: Session start failure
      this.trail.fail(8300, error as Error);
      
      this.updateSessionState({
        wsStatus: `Error: ${errorMessage}`
      });
      
      return false;
    }
  }

  /**
   * Stop coaching session
   */
  async stopSession(): Promise<boolean> {
    // LED 6303: Session stop initiation
    this.trail.light(6303, {
      operation: 'session_stop_initiation',
      sessionDuration: this.sessionState.sessionData.duration,
      timestamp: Date.now()
    });

    try {
      // Stop session timer
      this.stopSessionTimer();
      
      // Stop volume monitoring
      this.volumeService.stopMonitoring();
      
      // Stop WebSocket transcription
      this.wsClient.stopTranscription();
      
      // Give server time to process stop command
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Disconnect WebSocket
      this.wsClient.disconnect();
      
      // Stop Python server through Electron IPC
      try {
        const stopResult = await (window as any).electronAPI?.stopTranscription();
        if (!stopResult?.success) {
          console.warn('⚠️ Python server stop returned error:', stopResult?.error);
        }
      } catch (serverError) {
        console.warn('⚠️ Failed to stop Python server:', serverError);
      }

      // Reset session state (PRESERVE transcriptions and coaching prompts for review)
      this.updateSessionState({
        isRecording: false,
        wsStatus: 'Disconnected',
        liveTranscript: '', // Clear only the live/partial transcript
        sessionData: {
          ...this.sessionState.sessionData,
          duration: 0, // Reset timer for next session
          // KEEP prompts: this.sessionState.sessionData.prompts, // Preserve for review
          // KEEP transcriptions: this.sessionState.transcriptions, // Preserve for review
          stage: 'Session Complete' // Update stage to show completion
        }
      });

      // LED 6304: Session stop success
      this.trail.light(6304, {
        operation: 'session_stop_success',
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      // LED 8301: Session stop failure
      this.trail.fail(8301, error as Error);
      
      // Force cleanup
      this.forceCleanup();
      
      return false;
    }
  }

  /**
   * Get current session state
   */
  getState(): SessionState {
    return { ...this.sessionState };
  }

  /**
   * Clear transcription history (manual user action)
   */
  clearTranscriptions(): void {
    // LED 6306: Manual transcription clear
    this.trail.light(6306, {
      operation: 'manual_transcription_clear',
      transcriptionsCleared: this.sessionState.transcriptions.length,
      timestamp: Date.now()
    });

    this.updateSessionState({
      transcriptions: [],
      liveTranscript: ''
    });
  }

  /**
   * Clear coaching prompts history (manual user action)
   */
  clearCoachingPrompts(): void {
    // LED 6307: Manual coaching prompts clear
    this.trail.light(6307, {
      operation: 'manual_coaching_prompts_clear',
      promptsCleared: this.sessionState.coachingPrompts.length,
      timestamp: Date.now()
    });

    this.updateSessionState({
      coachingPrompts: [],
      sessionData: {
        ...this.sessionState.sessionData,
        prompts: 0
      }
    });
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: SessionState) => void): void {
    this.stateCallback = callback;
  }

  /**
   * Get WebSocket client for direct access
   */
  getWebSocketClient(): VoiceCoachWebSocketClient {
    return this.wsClient;
  }

  /**
   * Private: Create initial session state
   */
  private createInitialState(): SessionState {
    return {
      isRecording: false,
      wsStatus: 'Disconnected',
      sessionData: {
        duration: 0,
        stage: 'Opening',
        prompts: 0,
        talkRatio: { user: 50, prospect: 50 },
        responseTime: '0ms',
        effectiveness: 0
      },
      coachingPrompts: [],
      transcriptions: [],
      liveTranscript: '',
      volumeState: {
        level: 0,
        isMonitoring: false,
        status: 'silent'
      }
    };
  }

  /**
   * Private: Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    this.wsClient.onTranscript((transcript: TranscriptEvent) => {
      if (transcript.type === 'final_transcript') {
        const newTranscription: TranscriptionItem = {
          id: Date.now(),
          speaker: 'unknown',
          text: transcript.text,
          timestamp: Date.now()
        };
        
        this.updateSessionState({
          transcriptions: [...this.sessionState.transcriptions, newTranscription],
          liveTranscript: ''
        });
      } else {
        this.updateSessionState({
          liveTranscript: transcript.text
        });
      }
    });

    this.wsClient.onCoaching((suggestion: CoachingSuggestion) => {
      const newPrompt: CoachingPrompt = {
        id: Date.now(),
        priority: suggestion.priority.toLowerCase() as any,
        text: suggestion.suggestion,
        category: suggestion.category,
        trigger: suggestion.trigger,
        context: suggestion.context,
        timestamp: Date.parse(suggestion.timestamp)
      };
      
      this.updateSessionState({
        coachingPrompts: [...this.sessionState.coachingPrompts, newPrompt],
        sessionData: {
          ...this.sessionState.sessionData,
          prompts: this.sessionState.sessionData.prompts + 1
        }
      });
    });

    this.wsClient.onStatus((status: string) => {
      this.updateSessionState({ wsStatus: status });
    });

    this.wsClient.onError((error: string) => {
      this.updateSessionState({ wsStatus: `Error: ${error}` });
    });

    // Handle MediaStream for volume monitoring
    this.wsClient.onMediaStream((mediaStream: MediaStream) => {
      // LED 6305: MediaStream received for volume monitoring
      this.trail.light(6305, {
        operation: 'mediastream_received_for_volume',
        streamActive: mediaStream.active,
        timestamp: Date.now()
      });
      
      this.volumeService.startMonitoring(mediaStream);
    });
  }

  /**
   * Private: Setup volume monitoring handler
   */
  private setupVolumeHandler(): void {
    this.volumeService.onVolumeChange((volumeState: VolumeState) => {
      this.updateSessionState({ volumeState });
    });
  }

  /**
   * Private: Start session timer
   */
  private startSessionTimer(): void {
    this.sessionTimer = setInterval(() => {
      if (this.sessionState.isRecording) {
        const newDuration = this.sessionState.sessionData.duration + 1000;
        
        this.updateSessionState({
          sessionData: {
            ...this.sessionState.sessionData,
            duration: newDuration
          }
        });
      }
    }, 1000);
  }

  /**
   * Private: Stop session timer
   */
  private stopSessionTimer(): void {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  /**
   * Private: Update session state and notify callback
   */
  private updateSessionState(updates: Partial<SessionState>): void {
    this.sessionState = {
      ...this.sessionState,
      ...updates
    };
    
    if (this.stateCallback) {
      try {
        this.stateCallback(this.sessionState);
      } catch (error) {
        // LED 8302: State callback error
        this.trail.fail(8302, error as Error);
      }
    }
  }

  /**
   * Private: Force cleanup on error
   */
  private forceCleanup(): void {
    this.stopSessionTimer();
    this.volumeService.stopMonitoring();
    
    this.updateSessionState({
      isRecording: false,
      wsStatus: 'Error during disconnect',
      liveTranscript: ''
    });
  }
}