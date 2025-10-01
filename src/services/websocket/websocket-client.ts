/**
 * VoiceCoach V2 - Socket.IO WebSocket Client Service
 * Socket.IO connection for real-time transcription with Vosk server compatibility
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { io, Socket } from 'socket.io-client';

export interface TranscriptEvent {
  type: 'final_transcript' | 'partial_transcript';
  text: string;
  timestamp: string;
  breadcrumb: number;
}

export interface CoachingSuggestion {
  type: 'coaching_suggestion';
  suggestion: string;
  trigger: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'objection_handling' | 'discovery';
  context: string;
  timestamp: string;
  breadcrumb: number;
}

export class VoiceCoachWebSocketClient {
  private socket: Socket | null = null;
  private nativeSocket: WebSocket | null = null; // Keep for compatibility
  private serverUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimeout?: NodeJS.Timeout;
  private onTranscriptCallback?: (transcript: TranscriptEvent) => void;
  private onCoachingCallback?: (suggestion: CoachingSuggestion) => void;
  private onStatusCallback?: (status: string) => void;
  private onErrorCallback?: (error: string) => void;
  private onMediaStreamCallback?: (mediaStream: MediaStream) => void;
  private onDualStreamsCallback?: (micStream: MediaStream | null, tabStream: MediaStream | null) => void;
  private trail: BreadcrumbTrail;
  
  // Audio capture properties - AudioWorklet for optimal performance
  private mediaStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;  // Store separately for cleanup
  private tabStream: MediaStream | null = null;   // Store separately for cleanup
  private audioContext: AudioContext | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isRecording = false;
  private audioCaptureMode: 'microphone' | 'full-conversation' = 'full-conversation';
  private chunkCount: number = 0;

  constructor(serverUrl: string = 'http://127.0.0.1:5000') {
    // LED 7001: Enhanced URL validation and fallback
    this.trail = new BreadcrumbTrail('WebSocketClient');
    
    // Socket.IO uses http:// not ws:// protocol
    const validUrls = [
      serverUrl.replace('ws://', 'http://').replace('wss://', 'https://'),
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5000'
    ];
    
    this.serverUrl = validUrls.find(url => url && (url.startsWith('http://') || url.startsWith('https://'))) || 'http://127.0.0.1:5000';
    
    this.trail.light(7001, {
      operation: 'websocket_client_initialization',
      requestedUrl: serverUrl,
      selectedUrl: this.serverUrl,
      fallbackOptions: validUrls,
      timestamp: Date.now()
    });
  }

  // LED Breadcrumb 7010: Connect to Socket.IO server
  connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.trail.light(7010, { serverUrl: this.serverUrl, operation: 'socket_io_connect_start' });
        
        // LED 7009: Initialize Socket.IO connection
        this.trail.light(7009, {
          operation: 'socket_io_initialization',
          protocol: 'socket_io',
          serverUrl: this.serverUrl,
          maxReconnectAttempts: this.maxReconnectAttempts,
          reconnectDelay: this.reconnectDelay
        });
        
        this.socket = io(this.serverUrl, {
          transports: ['polling', 'websocket'],  // Try both transports
          reconnection: true,
          reconnectionAttempts: Infinity,  // Keep trying forever
          reconnectionDelay: 500,  // Fast reconnect
          reconnectionDelayMax: 2000,  // Max 2 second delay
          timeout: 60000,  // Longer timeout for stability
          forceNew: false,  // Reuse connections when possible
          autoConnect: true  // Connect immediately
        });

        // LED Breadcrumb 7011: Handle connection events
        this.socket.on('connect', () => {
          this.trail.lightWithVerification(7011, 
            { operation: 'socket_io_connected', timestamp: Date.now() },
            { expect: 'connected', actual: this.socket?.connected ? 'connected' : 'disconnected' }
          );
          
          // LED 7052: Connection health verification
          this.trail.checkpoint(7052, 'connection_health_check',
            () => this.socket?.connected === true,
            { connected: this.socket?.connected, timestamp: Date.now() }
          );
          
          this.reconnectAttempts = 0; // Reset on successful connection
          this.onStatusCallback?.('Connected');
          resolve(true);
        });

        // Handle server status messages
        this.socket.on('status', (data: any) => {
          console.log('[WebSocket] Server status:', data);
          this.trail.light(7013, { status: data });
        });

        this.socket.on('disconnect', (reason) => {
          this.trail.light(7012, { 
            operation: 'socket_io_disconnected', 
            timestamp: Date.now(),
            reason: reason
          });
          
          // LED 7053: Connection state cleanup
          this.trail.light(7053, {
            operation: 'connection_state_cleanup',
            previouslyConnected: true,
            cleanupTimestamp: Date.now(),
            willReconnect: this.reconnectAttempts < this.maxReconnectAttempts
          });
          
          this.onStatusCallback?.('Disconnected');
        });

        this.socket.on('connect_error', (error) => {
          // LED 8011: Connection error with detailed diagnostic info
          const errorMessage = `Socket.IO connection error: ${error.message}`;
          this.trail.fail(8011, new Error(errorMessage));
          
          // LED 8010: Enhanced connection diagnostics with troubleshooting
          const diagnosticInfo = {
            operation: 'native_websocket_connection_error_diagnostics',
            errorType: 'websocket_error',
            errorMessage: errorMessage,
            serverUrl: this.serverUrl,
            timestamp: Date.now(),
            retryAttempt: this.reconnectAttempts,
            troubleshooting: this._generateTroubleshootingSteps(errorMessage),
            serverStatus: 'unknown'
          };
          
          this.trail.light(8010, diagnosticInfo);
          
          // Provide user-friendly error message with guidance
          const friendlyError = this._createFriendlyErrorMessage(errorMessage);
          this.onErrorCallback?.(friendlyError);
          
          console.error('❌ Socket.IO connection failed:', errorMessage);
          console.log('🔧 Troubleshooting steps:', diagnosticInfo.troubleshooting.join(', '));
          reject(new Error(errorMessage));
        });

        // Handle Socket.IO events - Server emits 'transcription' event
        this.socket.on('transcription', (data) => {
          console.log('[Socket.IO] Transcription received:', data);
          this._handleMessage(data);
        });

        this.socket.on('transcription_status', (data) => {
          console.log('[Socket.IO] Transcription status:', data);
        });
        
        // Handle coaching suggestions from server
        this.socket.on('coaching_suggestion', (data) => {
          console.log('[Socket.IO] Coaching suggestion:', data);
          if (this.onCoachingCallback) {
            this.onCoachingCallback(data);
          }
        });

        this.socket.on('status', (data) => {
          console.log('[Socket.IO] Status:', data);
          if (data.message) {
            this.onStatusCallback?.(data.message);
          }
        });

        this.socket.on('error', (error) => {
          this.trail.fail(8022, new Error(`Socket.IO error: ${error}`));
          console.error('❌ Socket.IO error:', error);
        });


      } catch (error) {
        // LED 8018: Critical connection setup failure
        this.trail.fail(8010, error as Error);
        
        this.trail.light(8018, {
          operation: 'connection_setup_failure',
          errorType: (error as Error).name,
          errorMessage: (error as Error).message,
          setupStage: 'socket_initialization',
          timestamp: Date.now()
        });
        
        reject(error);
      }
    });
  }

  // Private method to handle reconnection attempts
  private _attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.trail.fail(8013, new Error('WebSocket reconnection failed - max attempts reached'));
      
      // LED 8016: Final reconnection failure with recovery options
      this.trail.light(8016, {
        operation: 'reconnection_exhausted',
        totalAttempts: this.maxReconnectAttempts,
        timeElapsed: Date.now(),
        serverStatus: 'unreachable',
        recoveryOptions: ['manual_retry', 'server_restart', 'network_check']
      });
      
      console.error('❌ WebSocket reconnection failed after max attempts');
      this.onErrorCallback?.('Connection failed - unable to reconnect');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    this.trail.light(8015, {
      operation: 'reconnection_attempt',
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delay: delay,
      timestamp: Date.now()
    });

    this.reconnectTimeout = setTimeout(() => {
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.connect().catch(error => {
        console.error(`❌ Reconnection attempt ${this.reconnectAttempts} failed:`, error);
        this._attemptReconnect(); // Try again
      });
    }, delay);
  }

  // Private method to handle incoming WebSocket messages
  private _handleMessage(data: any): void {
    // LED Breadcrumb 7020: Handle transcription events
    if (data.type === 'transcription' || data.type === 'final_transcript' || data.type === 'partial_transcript') {
      const transcriptData: TranscriptEvent = {
        type: data.type === 'transcription' ? 'final_transcript' : data.type,
        text: data.text || data.transcript || '',
        timestamp: data.timestamp || new Date().toISOString(),
        breadcrumb: 7020
      };

      const responseTime = Date.now() - (transcriptData.timestamp ? new Date(transcriptData.timestamp).getTime() : Date.now());
      
      this.trail.lightWithVerification(7020, 
        { 
          type: transcriptData.type, 
          textLength: transcriptData.text.length, 
          operation: 'transcript_received',
          responseTime: responseTime
        },
        { 
          expect: 'fast_response', 
          actual: responseTime < 200 ? 'fast_response' : 'slow_response',
          validator: (actual) => actual === 'fast_response'
        }
      );
      
      // LED 7055: Transcription quality metrics
      this.trail.light(7055, {
        operation: 'transcription_quality_analysis',
        wordCount: transcriptData.text.split(' ').length,
        hasContent: transcriptData.text.length > 0,
        transcriptionLatency: responseTime,
        isRealTime: transcriptData.type === 'partial_transcript',
        isFinal: transcriptData.type === 'final_transcript'
      });
      
      this.onTranscriptCallback?.(transcriptData);
    }

    // LED Breadcrumb 7021: Handle coaching suggestions
    else if (data.type === 'coaching_suggestion') {
      // Clean up malformed JSON in coaching suggestions
      let cleanSuggestion = data.suggestion || '';

      // Try to extract say_this from JSON-like suggestions
      if (cleanSuggestion.includes('"say_this"')) {
        try {
          const parsed = JSON.parse(cleanSuggestion);
          if (parsed.say_this) {
            console.log('✅ Extracted say_this from JSON coaching:', parsed.say_this);
            cleanSuggestion = parsed.say_this;
          }
        } catch {
          // Regex fallback for malformed JSON
          const sayThisMatch = cleanSuggestion.match(/"say_this":\s*"([^"]+)"/);
          if (sayThisMatch) {
            console.log('✅ Extracted say_this from malformed JSON:', sayThisMatch[1]);
            cleanSuggestion = sayThisMatch[1];
          } else {
            console.log('⚠️ Could not extract say_this, using raw suggestion');
          }
        }
      }

      const coachingData: CoachingSuggestion = {
        type: 'coaching_suggestion',
        suggestion: cleanSuggestion,
        trigger: data.trigger || '',
        priority: data.priority || 'MEDIUM',
        category: data.category || 'discovery',
        context: data.context || '',
        timestamp: data.timestamp || new Date().toISOString(),
        breadcrumb: 7021
      };

      const responseTime = Date.now() - new Date(coachingData.timestamp).getTime();
      
      this.trail.lightWithVerification(7021, 
        { 
          category: coachingData.category, 
          trigger: coachingData.trigger, 
          priority: coachingData.priority,
          operation: 'coaching_received',
          responseTime: responseTime
        },
        {
          expect: 'actionable_suggestion',
          actual: coachingData.suggestion && coachingData.suggestion.length > 10 ? 'actionable_suggestion' : 'insufficient_suggestion'
        }
      );
      
      // LED 7056: Coaching suggestion analytics
      this.trail.light(7056, {
        operation: 'coaching_suggestion_analytics',
        suggestionLength: coachingData.suggestion.length,
        triggerKeyword: coachingData.trigger,
        contextRelevance: coachingData.context ? coachingData.context.length : 0,
        priorityLevel: coachingData.priority,
        coachingLatency: responseTime,
        isHighPriority: coachingData.priority === 'HIGH'
      });
      
      this.onCoachingCallback?.(coachingData);
    }

    // Handle status messages
    else if (data.type === 'status' && data.message) {
      this.trail.light(7022, { 
        message: data.message, 
        operation: 'status_received',
        messageType: this._categorizeStatusMessage(data.message),
        timestamp: Date.now()
      });
      
      // LED 7057: Server status tracking
      this.trail.light(7057, {
        operation: 'server_status_update',
        statusCategory: this._categorizeStatusMessage(data.message),
        serverHealthy: !data.message.toLowerCase().includes('error'),
        timestamp: Date.now()
      });
      
      this.onStatusCallback?.(data.message);
    }

    // Handle transcription status
    else if (data.type === 'transcription_status' && data.status) {
      this.trail.light(7023, { 
        status: data.status, 
        operation: 'transcription_status_received',
        isActive: data.status === 'active' || data.status === 'listening',
        timestamp: Date.now()
      });
      
      // LED 7058: Transcription service health monitoring
      this.trail.checkpoint(7058, 'transcription_service_health',
        () => data.status !== 'error' && data.status !== 'failed',
        { 
          serviceStatus: data.status,
          isOperational: !['error', 'failed', 'stopped'].includes(data.status),
          timestamp: Date.now()
        }
      );
      
      this.onStatusCallback?.(data.status);
    }

    // Handle server errors
    else if (data.type === 'error' && data.message) {
      this.trail.fail(8022, new Error(`Server error: ${data.message}`));
      
      // LED 8017: Server error analysis and recovery planning
      this.trail.light(8017, {
        operation: 'server_error_analysis',
        errorMessage: data.message,
        errorSeverity: this._categorizeErrorSeverity(data.message),
        recoveryAction: this._suggestRecoveryAction(data.message),
        timestamp: Date.now()
      });
      
      this.onErrorCallback?.(data.message);
    }

    // Handle Vosk recognition results (direct format)
    else if (data.text !== undefined && data.partial !== undefined) {
      // This handles direct Vosk WebSocket format: {"partial": "hello", "text": "hello world"}
      const transcriptData: TranscriptEvent = {
        type: data.partial ? 'partial_transcript' : 'final_transcript',
        text: data.partial || data.text || '',
        timestamp: new Date().toISOString(),
        breadcrumb: 7020
      };

      this.trail.light(7020, {
        type: transcriptData.type,
        textLength: transcriptData.text.length,
        operation: 'vosk_transcript_received',
        isPartial: !!data.partial,
        isFinal: !!data.text && !data.partial
      });

      this.onTranscriptCallback?.(transcriptData);
    }

    // Log unhandled message types for debugging
    else {
      console.log('🔍 Unhandled WebSocket message:', data);
      this.trail.light(7024, {
        operation: 'unhandled_message',
        messageType: data.type || 'unknown',
        messageKeys: Object.keys(data),
        timestamp: Date.now()
      });
    }
  }

  // Set audio capture mode (call before startTranscription)
  setAudioCaptureMode(mode: 'microphone' | 'full-conversation'): void {
    this.audioCaptureMode = mode;
    console.log(`📹 Audio capture mode set to: ${mode}`);
    this.trail.light(7029, {
      audio_mode_set: mode,
      timestamp: Date.now()
    });
  }
  
  // Get current audio capture mode
  getAudioCaptureMode(): 'microphone' | 'full-conversation' {
    return this.audioCaptureMode;
  }
  
  // LED Breadcrumb 7030: Start transcription
  async startTranscription(captureMode: 'microphone' | 'full-conversation' = 'microphone'): Promise<boolean> {
    // LED 7028: Log capture mode selection
    this.trail.light(7028, {
      operation: 'capture_mode_selected',
      mode: captureMode,
      previousMode: this.audioCaptureMode,
      timestamp: Date.now()
    });
    
    // Set the capture mode
    this.setAudioCaptureMode(captureMode);
    // LED 7029: Pre-transcription validation
    this.trail.checkpoint(7029, 'transcription_prerequisites',
      () => this.socket?.connected === true,
      {
        socketConnected: this.socket?.connected === true,
        connected: this.socket?.connected,
        serverUrl: this.serverUrl,
        timestamp: Date.now()
      }
    );
    
    if (!this.socket?.connected) {
      console.log('[WebSocket] Not connected, attempting to connect first...');
      this.trail.light(7069, {
        operation: 'auto_connect_before_transcription',
        timestamp: Date.now()
      });
      
      // Try to connect first
      const connected = await this.connect();
      if (!connected) {
        this.trail.fail(8030, new Error('Cannot start transcription: connection failed'));
        
        // LED 8019: Transcription start failure analysis
        this.trail.light(8019, {
          operation: 'transcription_start_failure',
          reason: 'socket_connection_failed',
          socketState: this.socket ? `connected_${this.socket.connected}` : 'socket_null',
          timestamp: Date.now()
        });
        
        return false;
      }
      console.log('[WebSocket] Successfully connected, continuing with transcription...');
    }

    this.trail.light(7030, { 
      operation: 'start_transcription_command', 
      timestamp: Date.now(),
      connected: this.socket.connected,
      commandSent: true
    });
    
    // LED 7059: Transcription command emission tracking
    this.trail.light(7059, {
      operation: 'transcription_command_emission',
      command: 'start_transcription',
      socketReady: true,
      timestamp: Date.now()
    });
    
    // Send start command to server using Socket.IO
    // Note: No longer sending this as the server listens for 'start_transcription' event
    // which is sent at line 1067 when audio starts
    
    // LED 7070: Audio capture initialization
    this.trail.light(7070, {
      operation: 'audio_capture_initialization_start',
      timestamp: Date.now()
    });
    
    // Start audio capture with configured mode
    try {
      await this.startAudioCapture(this.audioCaptureMode);
      this.trail.light(7071, {
        operation: 'audio_capture_started_successfully',
        isRecording: this.isRecording,
        hasMediaStream: !!this.mediaStream,
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      // LED 8071: Enhanced error diagnostics for audio capture initialization failure
      this.trail.fail(8071, error as Error);
      this.trail.light(8074, {
        operation: 'audio_capture_init_failure_diagnostics',
        error_message: (error as Error).message,
        error_name: (error as Error).name,
        capture_mode: this.audioCaptureMode,
        timestamp: Date.now()
      });
      
      this.onErrorCallback?.(`Failed to start audio capture: ${(error as Error).message}`);
      return false;
    }
  }

  // LED Breadcrumb 7072: High-performance AudioWorklet implementation
  private async startAudioCapture(captureMode: 'microphone' | 'full-conversation' = 'full-conversation'): Promise<void> {
    try {
      // LED 7072: Audio capture initialization with mode details
      this.trail.light(7072, {
        operation: 'audio_capture_init',
        captureMode: captureMode,
        browserInfo: navigator.userAgent,
        timestamp: Date.now()
      });
      
      // Get Vosk config to use user settings
      const voskConfigStr = localStorage.getItem('voicecoach-vosk-config');
      const voskConfig = voskConfigStr ? JSON.parse(voskConfigStr) : null;
      const audioConfig = voskConfig?.audio || { sampleRate: 16000, channels: 1 };
      
      // Get the selected microphone device from settings
      const settingsStr = localStorage.getItem('voicecoach-settings');
      const settings = settingsStr ? JSON.parse(settingsStr) : null;
      const selectedMicDeviceId = settings?.audioInput;
      
      // LED 7073: Microphone access request
      this.trail.light(7073, {
        operation: 'requesting_microphone_access',
        mode: captureMode,
        requestedSampleRate: audioConfig.sampleRate,
        requestedChannels: audioConfig.channels,
        configSource: voskConfig ? 'user_settings' : 'defaults',
        selectedDevice: settings?.audioInputLabel || 'System Default',
        deviceId: selectedMicDeviceId || 'default',
        timestamp: Date.now()
      });
      
      // Build audio constraints with selected device
      const audioConstraints: any = {
        channelCount: { ideal: audioConfig.channels }, // User configurable
        sampleRate: { ideal: audioConfig.sampleRate }, // User configurable
        sampleSize: { ideal: 16 }, // 16-bit PCM
        echoCancellation: false, // Disable processing overhead
        noiseSuppression: false, // Disable processing overhead  
        autoGainControl: false, // Disable processing overhead
        volume: 1.0 // Maximum signal strength
      };
      
      // Add deviceId if a specific microphone is selected
      if (selectedMicDeviceId && selectedMicDeviceId !== 'default') {
        audioConstraints.deviceId = { exact: selectedMicDeviceId };
        console.log('🎤 Using selected microphone:', selectedMicDeviceId, settings?.audioInputLabel);
      } else {
        console.log('🎤 Using default system microphone');
      }
      
      // Step 1: Capture microphone (user's side) for optimal Vosk compatibility
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });
      
      // LED 7074: Microphone capture success
      this.trail.light(7074, {
        operation: 'microphone_captured',
        streamId: this.micStream.id,
        trackCount: this.micStream.getTracks().length,
        audioTracks: this.micStream.getAudioTracks().map(t => ({
          id: t.id,
          label: t.label,
          enabled: t.enabled,
          muted: t.muted,
          connected: t.connected
        })),
        timestamp: Date.now()
      });
      
      console.log('✅ Microphone captured for user audio');
      
      // Step 2: Capture tab/system audio if in full-conversation mode
      if (captureMode === 'full-conversation') {
        // LED 7075: Attempting full conversation capture
        this.trail.light(7075, {
          operation: 'full_conversation_mode_start',
          micStreamReady: !!this.micStream,
          timestamp: Date.now()
        });
        
        try {
          // LED 7076: Requesting display media for tab audio
          this.trail.light(7076, {
            operation: 'requesting_display_media',
            purpose: 'tab_audio_capture',
            isElectron: !!(window as any).electronAPI,
            timestamp: Date.now()
          });
          
          // Try multiple approaches to capture system audio (like our test)
          const approaches = [
            // Approach 1: Simple with video (most compatible)
            {
              name: 'Simple with Video',
              options: {
                audio: true,
                video: true
              }
            },
            // Approach 2: Chrome Desktop Audio
            {
              name: 'Chrome Desktop Audio',
              options: {
                audio: {
                  // @ts-ignore
                  mandatory: {
                    chromeMediaSource: 'desktop'
                  }
                },
                video: {
                  // @ts-ignore
                  mandatory: {
                    chromeMediaSource: 'desktop'
                  }
                }
              }
            },
            // Approach 3: System audio flag
            {
              name: 'System Audio Flag',
              options: {
                audio: true,
                video: false,
                // @ts-ignore
                systemAudio: 'include'
              }
            },
            // Approach 4: Simple audio only
            {
              name: 'Audio Only',
              options: {
                audio: true,
                video: false
              }
            }
          ];

          let captured = false;
          let lastError: Error | null = null;

          for (const approach of approaches) {
            if (captured) break;
            
            try {
              this.trail.light(7076, {
                operation: 'trying_display_media_approach',
                approach: approach.name,
                timestamp: Date.now()
              });
              
              console.log(`Trying system audio capture: ${approach.name}`);
              
              // @ts-ignore - Various non-standard options
              const stream = await navigator.mediaDevices.getDisplayMedia(approach.options);
              
              const audioTracks = stream.getAudioTracks();
              const videoTracks = stream.getVideoTracks();
              
              this.trail.light(7076, {
                operation: 'display_media_received',
                approach: approach.name,
                audioTrackCount: audioTracks.length,
                videoTrackCount: videoTracks.length,
                timestamp: Date.now()
              });
              
              // Remove video tracks - we only want audio
              videoTracks.forEach(track => {
                track.stop();
                stream.removeTrack(track);
              });
              
              if (audioTracks.length > 0) {
                console.log(`✅ System audio captured with: ${approach.name}`, audioTracks[0].label);
                this.tabStream = stream;
                captured = true;
                
                this.trail.light(7077, {
                  operation: 'system_audio_capture_success',
                  approach: approach.name,
                  audioLabel: audioTracks[0].label,
                  timestamp: Date.now()
                });
              } else {
                console.warn(`No audio tracks with approach: ${approach.name}`);
                stream.getTracks().forEach(t => t.stop());
              }
              
            } catch (error) {
              lastError = error as Error;
              console.warn(`Approach ${approach.name} failed:`, error);
              this.trail.light(8076, {
                operation: 'display_media_approach_failed',
                approach: approach.name,
                error: (error as Error).message,
                timestamp: Date.now()
              });
            }
          }

          if (!captured) {
            throw lastError || new Error('All system audio capture approaches failed');
          }
          
          // LED 7077: Tab audio capture success
          this.trail.light(7077, {
            operation: 'tab_audio_captured',
            streamId: this.tabStream.id,
            trackCount: this.tabStream.getTracks().length,
            audioTracks: this.tabStream.getAudioTracks().map(t => ({
              id: t.id,
              label: t.label,
              enabled: t.enabled,
              muted: t.muted,
              connected: t.connected
            })),
            timestamp: Date.now()
          });
          
          
          console.log('✅ Tab/system audio captured for remote participant');
        } catch (error) {
          // LED 8077: Tab audio capture failure
          this.trail.fail(8077, error as Error);
          this.trail.light(8078, {
            operation: 'tab_audio_fallback',
            error: (error as Error).message,
            fallbackMode: 'microphone_only',
            timestamp: Date.now()
          });
          
          console.warn('⚠️ Could not capture tab audio - will use microphone only:', error);
          // Continue with just microphone if tab capture fails
        }
      } else {
        // LED 7079: Microphone-only mode confirmed
        this.trail.light(7079, {
          operation: 'microphone_only_mode',
          reason: 'user_selected',
          timestamp: Date.now()
        });
        
        console.log('ℹ️ Microphone-only mode selected');
      }
      
      // Step 3: Mix both streams into one combined stream
      if (this.tabStream) {
        // LED 7080: Starting audio mixing for full conversation
        this.trail.light(7080, {
          operation: 'audio_mixing_start',
          micStreamId: this.micStream.id,
          tabStreamId: this.tabStream.id,
          timestamp: Date.now()
        });
        
        // Create AudioContext for mixing
        const mixingContext = new AudioContext({ sampleRate: 16000 });
        const micSource = mixingContext.createMediaStreamSource(this.micStream);
        const tabSource = mixingContext.createMediaStreamSource(this.tabStream);
        const destination = mixingContext.createMediaStreamDestination();
        
        // LED 7081: Audio sources created for mixing
        this.trail.light(7081, {
          operation: 'audio_sources_created',
          mixingContextState: mixingContext.state,
          sampleRate: mixingContext.sampleRate,
          micSourceChannelCount: micSource.channelCount,
          tabSourceChannelCount: tabSource.channelCount,
          timestamp: Date.now()
        });
        
        // Connect both sources to destination
        micSource.connect(destination);
        tabSource.connect(destination);
        
        // LED 7082: Audio streams connected and mixed
        this.trail.light(7082, {
          operation: 'streams_mixed',
          destinationChannelCount: destination.channelCount,
          combinedStreamId: destination.stream.id,
          combinedTrackCount: destination.stream.getTracks().length,
          timestamp: Date.now()
        });
        
        // Use the combined stream
        this.mediaStream = destination.stream;
        console.log('✅ Audio streams mixed: capturing both sides of conversation');
        
        // LED 7083: Full conversation capture ready
        this.trail.light(7083, {
          operation: 'full_conversation_ready',
          captureMode: 'full-conversation',
          hasMicrophone: true,
          hasTabAudio: true,
          streamsMixed: true,
          finalStreamId: this.mediaStream.id,
          timestamp: Date.now()
        });
      } else {
        // LED 7084: Microphone-only fallback
        this.trail.light(7084, {
          operation: 'microphone_only_fallback',
          reason: this.tabStream ? 'unknown' : 'no_tab_stream',
          micStreamId: this.micStream.id,
          timestamp: Date.now()
        });
        
        // Fallback to microphone only
        this.mediaStream = this.micStream;
        console.log('ℹ️ Using microphone only (single-sided capture)');
        
        // LED 7085: Single audio capture confirmed
        this.trail.light(7085, {
          operation: 'single_audio_ready',
          captureMode: 'microphone',
          hasMicrophone: true,
          hasTabAudio: false,
          streamsMixed: false,
          finalStreamId: this.mediaStream.id,
          timestamp: Date.now()
        });
      }

      // LED 7086: Final stream configuration
      this.trail.light(7086, {
        operation: 'final_stream_configured',
        streamActive: this.mediaStream.active,
        trackCount: this.mediaStream.getTracks().length,
        audioTrackSettings: this.mediaStream.getAudioTracks()[0]?.getSettings(),
        captureMode: this.tabStream ? 'full-conversation' : 'microphone',
        timestamp: Date.now()
      });

      // LED 7087: Volume monitoring setup
      if (this.onMediaStreamCallback && this.mediaStream) {
        this.trail.light(7087, {
          operation: 'volume_monitoring_callback',
          hasCallback: true,
          streamProvided: true,
          timestamp: Date.now()
        });
        this.onMediaStreamCallback(this.mediaStream);
      } else {
        this.trail.light(7087, {
          operation: 'volume_monitoring_skipped',
          hasCallback: !!this.onMediaStreamCallback,
          hasStream: !!this.mediaStream,
          timestamp: Date.now()
        });
      }
      
      // LED 7260: Dual stream volume monitoring setup
      if (this.onDualStreamsCallback) {
        this.trail.light(7260, {
          operation: 'dual_stream_monitoring_setup',
          hasMicStream: !!this.micStream,
          hasTabStream: !!this.tabStream,
          timestamp: Date.now()
        });
        this.onDualStreamsCallback(this.micStream, this.tabStream);
      }

      // Re-load config for AudioContext (out of scope from earlier)
      const voskConfigStr2 = localStorage.getItem('voicecoach-vosk-config');
      const voskConfig2 = voskConfigStr2 ? JSON.parse(voskConfigStr2) : null;
      const sampleRate = voskConfig2?.audio?.sampleRate || 16000;
      
      // LED 7088: AudioContext creation for Vosk
      this.trail.light(7088, {
        operation: 'creating_audio_context',
        targetSampleRate: sampleRate,
        configSource: voskConfig2 ? 'user_settings' : 'defaults',
        timestamp: Date.now()
      });
      
      // Create AudioContext with user-configured sample rate
      this.audioContext = new AudioContext({
        sampleRate: sampleRate
      });
      
      // LED 7089: AudioContext created successfully
      this.trail.light(7089, {
        operation: 'audio_context_created',
        actualSampleRate: this.audioContext.sampleRate,
        contextState: this.audioContext.state,
        baseLatency: this.audioContext.baseLatency,
        outputLatency: this.audioContext.outputLatency,
        timestamp: Date.now()
      });

      // LED 7090: Loading AudioWorklet
      // For Vite dev server, files in public/ are served from root
      const workletPath = '/vosk-audio-worklet.js';
      
      this.trail.light(7090, {
        operation: 'loading_audioworklet',
        workletPath: workletPath,
        base_url: window.location.href,
        timestamp: Date.now()
      });
      
      // Load AudioWorklet for high-performance processing
      try {
        await this.audioContext.audioWorklet.addModule(workletPath);
      } catch (error) {
        // LED 8090: AudioWorklet load failure with detailed diagnostics
        this.trail.fail(8090, error as Error);
        this.trail.light(8091, {
          operation: 'audioworklet_load_error_details',
          error: (error as Error).message,
          path_attempted: workletPath,
          context_state: this.audioContext.state,
          base_url: window.location.href,
          timestamp: Date.now()
        });
        
        // For production or file:// protocol, try different paths
        const alternatePaths = [
          './vosk-audio-worklet.js',
          'vosk-audio-worklet.js', 
          '../public/vosk-audio-worklet.js'
        ];
        
        let loaded = false;
        for (const altPath of alternatePaths) {
          if (loaded) break;
          try {
            this.trail.light(7090, {
              operation: 'trying_alternate_worklet_path',
              workletPath: altPath,
              timestamp: Date.now()
            });
            await this.audioContext.audioWorklet.addModule(altPath);
            loaded = true;
            this.trail.light(7091, {
              operation: 'audioworklet_loaded_alternate',
              successful_path: altPath,
              timestamp: Date.now()
            });
          } catch (altError) {
            this.trail.light(8093, {
              operation: 'alternate_path_failed',
              path: altPath,
              error: (altError as Error).message,
              timestamp: Date.now()
            });
          }
        }
        
        if (!loaded) {
          this.trail.fail(8092, error as Error);
          throw new Error(`Failed to load AudioWorklet from any path. Original error: ${(error as Error).message}`);
        }
      }
      
      // LED 7091: AudioWorklet loaded successfully
      this.trail.light(7091, {
        operation: 'audioworklet_loaded',
        contextSampleRate: this.audioContext.sampleRate,
        contextState: this.audioContext.state,
        timestamp: Date.now()
      });

      // Create AudioWorklet node for direct PCM processing
      this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'vosk-audio-processor');
      
      // Get buffer size from Vosk config - FAIL if not configured
      const voskConfigStr3 = localStorage.getItem('voicecoach-vosk-config');
      const voskConfig3 = voskConfigStr3 ? JSON.parse(voskConfigStr3) : null;
      const bufferSize = voskConfig3?.audio?.chunkSize;
      
      if (!bufferSize) {
        const errorMsg = '❌ CONFIGURATION ERROR: No chunk size found in Vosk settings!';
        console.error(errorMsg);
        this.trail.fail(8500, new Error(errorMsg));
        this.onErrorCallback?.(errorMsg + ' Please configure audio settings.');
        
        // Show user-visible error
        alert('⚠️ Audio Configuration Missing!\n\nNo chunk size configured. Please go to Settings > Audio > Vosk Settings and configure the chunk size.');
        throw new Error('Cannot start audio capture without chunk size configuration');
      }
      
      // LED 7311: AudioWorklet buffer configuration
      this.trail.light(7311, {
        operation: 'audioworklet_buffer_config',
        bufferSize: bufferSize,
        bufferDurationMs: Math.round(bufferSize / 16), // Approximate ms at 16kHz
        configSource: 'user_config',
        timestamp: Date.now()
      });
      
      // CRITICAL: Actually SEND the configuration to AudioWorklet!
      console.log('🚀 Sending buffer configuration to AudioWorklet:', bufferSize);
      this.audioWorkletNode.port.postMessage({
        type: 'CONFIGURE',
        bufferSize: bufferSize
      });
      
      // Handle PCM data from AudioWorklet
      this.audioWorkletNode.port.onmessage = (event) => {
        const { type, data, sampleCount, chunkIndex } = event.data;
        
        console.log('🎤 AudioWorklet message received:', { type, hasData: !!data, sampleCount, chunkIndex });
        
        if (type === 'AUDIO_DATA') {
          // Check connection before sending
          if (this.socket?.connected === true) {
            // LED 7075: High-performance audio chunk transmission
            this.trail.light(7075, {
              operation: 'audioworklet_pcm_transmission',
              sampleCount: sampleCount,
              byteSize: data.byteLength,
              chunkIndex: chunkIndex,
              timestamp: Date.now()
            });
            
            console.log('🚀 Sending audio chunk to server:', { byteSize: data.byteLength, chunkIndex });
            
            // Send raw PCM data directly to Vosk
            this.sendAudioChunk(data);
          } else {
            // Socket not connected - try to reconnect
            console.warn('⚠️ Socket disconnected at chunk #' + chunkIndex + ', attempting reconnect...');
            
            // If socket exists but disconnected, try to reconnect
            if (this.socket && !this.socket.connected) {
              this.socket.connect();
            }
            
            // Log dropped chunk (we drop to avoid memory issues)
            console.error('❌ Dropping audio chunk #' + chunkIndex + ' - socket not connected');
          }
        } else if (type === 'RECORDING_STARTED') {
          console.log('✅ AudioWorklet confirmed recording started');
          this.trail.light(7076, {
            operation: 'audioworklet_recording_confirmed',
            timestamp: Date.now()
          });
        }
      };

      // Create source from MediaStream
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Connect optimized audio graph: source -> audioworklet (no destination to avoid feedback)
      this.source.connect(this.audioWorkletNode);
      
      // Start recording in AudioWorklet
      this.audioWorkletNode.port.postMessage('START_RECORDING');
      
      // Notify Socket.IO server to start transcription
      if (this.socket?.connected) {
        console.log('[WebSocket] Emitting start_transcription to server');
        this.socket.emit('start_transcription');
      } else {
        console.error('[WebSocket] Cannot emit start_transcription - not connected!');
      }
      this.isRecording = true;

      this.trail.light(7077, {
        operation: 'high_performance_audio_pipeline_started',
        contextState: this.audioContext.state,
        contextSampleRate: this.audioContext.sampleRate,
        workletConnected: true,
        isRecording: this.isRecording,
        timestamp: Date.now()
      });

    } catch (error) {
      // LED 8072: Enhanced error diagnostics for audio capture failure
      this.trail.fail(8072, error as Error);
      this.trail.light(8073, {
        operation: 'audio_capture_failure_diagnostics',
        error_message: (error as Error).message,
        error_name: (error as Error).name,
        error_stack: (error as Error).stack?.split('\n').slice(0, 3).join(' | '),
        audioContext_state: this.audioContext?.state,
        audioContext_sampleRate: this.audioContext?.sampleRate,
        mediaStream_active: this.mediaStream?.active,
        mediaStream_tracks: this.mediaStream?.getTracks().length,
        workletNode_exists: !!this.audioWorkletNode,
        timestamp: Date.now()
      });
      
      this.onErrorCallback?.(`Failed to start optimized audio capture: ${(error as Error).message}`);
      
      // Clean up any partially initialized resources
      if (this.audioWorkletNode) {
        this.audioWorkletNode.disconnect();
        this.audioWorkletNode = null;
      }
      if (this.source) {
        this.source.disconnect();
        this.source = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
        this.audioContext = null;
      }
      
      throw error;
    }
  }

  // LED Breadcrumb 7031: Stop transcription  
  stopTranscription(): boolean {
    // LED 7060: Pre-stop validation
    this.trail.checkpoint(7060, 'transcription_stop_prerequisites',
      () => this.socket?.connected === true,
      {
        socketConnected: this.socket?.connected === true,
        connected: this.socket?.connected,
        timestamp: Date.now()
      }
    );
    
    // Stop audio capture first
    this.stopAudioCapture();
    
    if (!this.socket?.connected) {
      this.trail.fail(8031, new Error('Cannot stop transcription: not connected'));
      
      // LED 8020: Transcription stop failure analysis
      this.trail.light(8020, {
        operation: 'transcription_stop_failure',
        reason: 'socket_not_connected',
        socketState: this.socket ? `connected_${this.socket.connected}` : 'socket_null',
        timestamp: Date.now()
      });
      
      return false;
    }

    this.trail.light(7031, { 
      operation: 'stop_transcription_command', 
      timestamp: Date.now(),
      connected: this.socket.connected,
      commandSent: true
    });
    
    // LED 7061: Stop command emission tracking
    this.trail.light(7061, {
      operation: 'stop_command_emission',
      command: 'stop_transcription',
      socketReady: true,
      timestamp: Date.now()
    });
    
    this.socket.send(JSON.stringify({ type: 'stop_transcription' }));
    return true;
  }

  // LED Breadcrumb 7078: Stop audio capture (AudioWorklet optimized)
  private stopAudioCapture(): void {
    // LED 7092: Audio capture stop initiated
    this.trail.light(7092, {
      operation: 'audio_capture_stop_initiated',
      wasRecording: this.isRecording,
      hasAudioContext: !!this.audioContext,
      hasAudioWorklet: !!this.audioWorkletNode,
      hasMediaStream: !!this.mediaStream,
      hasMicStream: !!this.micStream,
      hasTabStream: !!this.tabStream,
      captureMode: this.tabStream ? 'full-conversation' : 'microphone',
      timestamp: Date.now()
    });

    try {
      this.isRecording = false;

      // Stop AudioWorklet recording
      if (this.audioWorkletNode) {
        this.audioWorkletNode.port.postMessage('STOP_RECORDING');
        
        // Notify Socket.IO server to stop transcription
        if (this.socket?.connected) {
          this.socket.emit('stop_transcription');
        }
        // LED 7093: AudioWorklet stop command sent
        this.trail.light(7093, {
          operation: 'audioworklet_stop_command',
          timestamp: Date.now()
        });
      }

      // Disconnect AudioWorklet node
      if (this.audioWorkletNode) {
        this.audioWorkletNode.disconnect();
        this.audioWorkletNode = null;
        // LED 7094: AudioWorklet disconnected
        this.trail.light(7094, {
          operation: 'audioworklet_disconnected',
          timestamp: Date.now()
        });
      }

      // Disconnect MediaStream source
      if (this.source) {
        this.source.disconnect();
        this.source = null;
        this.trail.light(7081, {
          operation: 'media_source_disconnected',
          timestamp: Date.now()
        });
      }

      // Close AudioContext
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
        this.trail.light(7082, {
          operation: 'audio_context_closed',
          finalState: this.audioContext.state,
          timestamp: Date.now()
        });
        this.audioContext = null;
      }

      // LED 7095: Stopping all media streams
      this.trail.light(7095, {
        operation: 'stopping_all_streams',
        hasMediaStream: !!this.mediaStream,
        hasMicStream: !!this.micStream,
        hasTabStream: !!this.tabStream,
        timestamp: Date.now()
      });
      
      // Stop all MediaStream tracks (combined, mic, and tab)
      if (this.mediaStream) {
        const trackCount = this.mediaStream.getTracks().length;
        this.mediaStream.getTracks().forEach((track, index) => {
          track.stop();
          // LED 7096: Individual track stopped
          this.trail.light(7096, {
            operation: 'combined_stream_track_stopped',
            trackIndex: index,
            trackKind: track.kind,
            trackLabel: track.label,
            totalTracks: trackCount,
            timestamp: Date.now()
          });
        });
        this.mediaStream = null;
      }
      
      // Stop microphone stream
      if (this.micStream) {
        const micTrackCount = this.micStream.getTracks().length;
        this.micStream.getTracks().forEach((track, index) => {
          track.stop();
          // LED 7097: Microphone track stopped
          this.trail.light(7097, {
            operation: 'mic_track_stopped',
            trackIndex: index,
            trackLabel: track.label,
            totalTracks: micTrackCount,
            timestamp: Date.now()
          });
        });
        this.micStream = null;
        console.log('🛑 Microphone stream stopped');
      }
      
      // Stop tab/system audio stream
      if (this.tabStream) {
        const tabTrackCount = this.tabStream.getTracks().length;
        this.tabStream.getTracks().forEach((track, index) => {
          track.stop();
          // LED 7098: Tab audio track stopped
          this.trail.light(7098, {
            operation: 'tab_audio_track_stopped',
            trackIndex: index,
            trackLabel: track.label,
            totalTracks: tabTrackCount,
            timestamp: Date.now()
          });
        });
        this.tabStream = null;
        console.log('🛑 Tab audio stream stopped');
      }

      // LED 7099: Audio cleanup complete
      this.trail.light(7099, {
        operation: 'audio_cleanup_complete',
        isRecording: this.isRecording,
        allStreamsStopped: !this.mediaStream && !this.micStream && !this.tabStream,
        audioContextClosed: !this.audioContext,
        audioWorkletDisconnected: !this.audioWorkletNode,
        timestamp: Date.now()
      });

    } catch (error) {
      // LED 8095: Audio cleanup error
      this.trail.fail(8095, error as Error);
      this.trail.light(8096, {
        operation: 'audio_cleanup_error',
        error: (error as Error).message,
        partialCleanup: {
          mediaStreamCleaned: !this.mediaStream,
          micStreamCleaned: !this.micStream,
          tabStreamCleaned: !this.tabStream,
          audioContextCleaned: !this.audioContext
        },
        timestamp: Date.now()
      });
    }
  }

  // LED Breadcrumb 7040: Send audio chunk via Socket.IO
  sendAudioChunk(audioData: ArrayBuffer | string): boolean {
    // LED 7062: Audio data validation
    const dataSize = audioData instanceof ArrayBuffer ? audioData.byteLength : audioData.length;
    this.trail.checkpoint(7062, 'audio_data_validation',
      () => Boolean(audioData) && dataSize > 0,
      {
        hasData: !!audioData,
        dataSize: dataSize,
        dataType: typeof audioData
      }
    );
    
    if (!this.socket?.connected) {
      this.trail.fail(8040, new Error('Cannot send audio: not connected'));
      
      // LED 8021: Audio transmission failure
      this.trail.light(8021, {
        operation: 'audio_transmission_failure',
        reason: 'socket_not_connected',
        audioDataSize: dataSize,
        timestamp: Date.now()
      });
      
      return false;
    }

    this.trail.lightWithVerification(7040, 
      { 
        dataType: typeof audioData, 
        dataSize: dataSize,
        operation: 'audio_chunk_sent',
        timestamp: Date.now()
      },
      {
        expect: 'valid_audio_data',
        actual: dataSize > 0 ? 'valid_audio_data' : 'empty_audio_data'
      }
    );
    
    // LED 7063: Audio streaming metrics
    this.trail.light(7063, {
      operation: 'audio_streaming_metrics',
      chunkSize: dataSize,
      streamingActive: true,
      timestamp: Date.now()
    });
    
    // Convert to base64 for Socket.IO transmission (matching Python server expectations)
    let base64Data: string;
    if (audioData instanceof ArrayBuffer) {
      // Convert ArrayBuffer to base64 string
      const bytes = new Uint8Array(audioData);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64Data = btoa(binary);
    } else {
      // Already a string, assume it's base64
      base64Data = audioData;
    }
    
    // Send via Socket.IO with proper format for speaker separation
    const audioMessage = {
      type: 'audio_chunk',
      audio: base64Data,
      source: this.audioCaptureMode === 'microphone' ? 'microphone' : 'mixed'
    };

    this.socket.emit('audio_chunk', base64Data);
    
    // Track chunk count
    if (!this.chunkCount) this.chunkCount = 0;
    this.chunkCount++;
    
    // DEBUG: Log first 10 chunks and every 50th chunk for monitoring
    if (this.chunkCount <= 10 || this.chunkCount % 50 === 0) {
      console.log(`🎤 [AUDIO DEBUG] Sent chunk #${this.chunkCount}, size: ${base64Data.length} chars (base64), connected: ${this.socket?.connected}`);
      
      // Also check if we're getting transcription events
      if (this.chunkCount === 10) {
        console.log('📊 [DEBUG] After 10 chunks - checking for transcription events...');
      }
    }
    return true;
  }

  // LED Breadcrumb 7050: Disconnect with cleanup
  disconnect(): void {
    // Clear any pending reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
    
    if (this.socket) {
      this.trail.light(7050, { 
        operation: 'socket_io_disconnect_start', 
        timestamp: Date.now(),
        connected: this.socket.connected,
        wasConnected: this.socket.connected
      });
      
      // LED 7064: Pre-disconnect state capture
      this.trail.light(7064, {
        operation: 'pre_disconnect_state_capture',
        connectionState: this.socket.connected,
        connected: this.socket.connected,
        hasActiveListeners: true,
        timestamp: Date.now()
      });
      
      // Clean disconnect with proper cleanup
      try {
        if (this.socket.connected) {
          this.socket.disconnect();
        }
        
        this.trail.lightWithVerification(7051, 
          { operation: 'socket_io_disconnected_cleanly', timestamp: Date.now() },
          { expect: 'clean_disconnect', actual: 'clean_disconnect' }
        );
        
        // LED 7065: Post-disconnect cleanup verification
        this.trail.checkpoint(7065, 'disconnect_cleanup_verification',
          () => this.socket === null || !this.socket.connected,
          { cleanupComplete: true, timestamp: Date.now() }
        );
        
      } catch (error) {
        this.trail.fail(8051, error as Error);
        
        // LED 8023: Disconnect error analysis
        this.trail.light(8023, {
          operation: 'disconnect_error_analysis',
          errorType: (error as Error).name,
          errorMessage: (error as Error).message,
          forceCleanup: true,
          timestamp: Date.now()
        });
        
        console.error('❌ Error during native WebSocket disconnect:', error);
      } finally {
        // LED 7066: Final cleanup confirmation
        this.trail.light(7066, {
          operation: 'final_cleanup_confirmation',
          socketNullified: true,
          resourcesReleased: true,
          timestamp: Date.now()
        });
        
        this.socket = null;
      }
    } else {
      // LED 7067: Disconnect called on already disconnected socket
      this.trail.light(7067, {
        operation: 'disconnect_already_disconnected',
        socketState: 'already_null',
        timestamp: Date.now()
      });
    }
  }

  // Event listener setters
  onTranscript(callback: (transcript: TranscriptEvent) => void): void {
    this.onTranscriptCallback = callback;
  }

  onCoaching(callback: (suggestion: CoachingSuggestion) => void): void {
    this.onCoachingCallback = callback;
  }

  onStatus(callback: (status: string) => void): void {
    this.onStatusCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  onMediaStream(callback: (mediaStream: MediaStream) => void): void {
    this.onMediaStreamCallback = callback;
  }
  
  onDualStreams(callback: (micStream: MediaStream | null, tabStream: MediaStream | null) => void): void {
    this.onDualStreamsCallback = callback;
  }

  // Connection status
  get isConnected(): boolean {
    return this.socket?.connected === true || false;
  }

  // Expose socket for advanced event handling (audio status)
  get socketInstance(): WebSocket | null {
    // Return null as we're using Socket.IO now, not native WebSocket
    // For Socket.IO access, use getSocketIO() instead
    return this.nativeSocket;
  }
  
  // Get Socket.IO instance
  get socketIO(): Socket | null {
    return this.socket;
  }

  // Debugging support for Claude
  getBreadcrumbSummary() {
    const summary = this.trail.getVerificationSummary();
    return {
      ...summary,
      recentLEDs: this.trail.sequence.slice(-10), // Last 10 breadcrumbs
      component: 'WebSocketClient'
    };
  }

  // Get current status for debugging
  getDebugStatus() {
    // LED 7068: Debug status compilation
    this.trail.light(7068, {
      operation: 'debug_status_compilation',
      connectedState: this.isConnected,
      breadcrumbCount: this.trail.sequence.length,
      hasSocket: !!this.socket
    });
    
    return {
      connected: this.isConnected,
      serverUrl: this.serverUrl,
      socketConnected: this.socket?.connected,
      reconnectAttempts: this.reconnectAttempts,
      breadcrumbSummary: this.getBreadcrumbSummary(),
      lastActivity: this.trail.sequence[this.trail.sequence.length - 1],
      connectionMetrics: {
        totalLEDs: this.trail.sequence.length,
        failedOperations: this.trail.sequence.filter(led => !led.success).length,
        lastOperationTime: this.trail.sequence[this.trail.sequence.length - 1]?.timestamp,
        socketHealth: this.socket?.connected === true || false
      }
    };
  }
  
  // Helper methods for enhanced LED tracking
  private _categorizeStatusMessage(message: string): string {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('error')) return 'error';
    if (lowerMessage.includes('warning')) return 'warning';
    if (lowerMessage.includes('connected') || lowerMessage.includes('ready')) return 'success';
    if (lowerMessage.includes('starting') || lowerMessage.includes('initializing')) return 'progress';
    return 'info';
  }
  
  private _categorizeErrorSeverity(errorMessage: string): string {
    const lowerError = errorMessage.toLowerCase();
    if (lowerError.includes('fatal') || lowerError.includes('critical')) return 'critical';
    if (lowerError.includes('connection') || lowerError.includes('network')) return 'high';
    if (lowerError.includes('timeout') || lowerError.includes('retry')) return 'medium';
    return 'low';
  }
  
  private _suggestRecoveryAction(errorMessage: string): string {
    const lowerError = errorMessage.toLowerCase();
    if (lowerError.includes('connection')) return 'retry_connection';
    if (lowerError.includes('server')) return 'check_server_status';
    if (lowerError.includes('network')) return 'check_network_connectivity';
    if (lowerError.includes('timeout')) return 'increase_timeout';
    return 'manual_intervention';
  }
  
  private _generateTroubleshootingSteps(errorMessage: string): string[] {
    const lowerError = errorMessage.toLowerCase();
    const steps: string[] = [];
    
    if (lowerError.includes('connection') || lowerError.includes('refused')) {
      steps.push('Check if native WebSocket server is running on port 5000');
      steps.push('Verify server URL: ws://127.0.0.1:5000 (native WebSocket protocol)');
    }
    
    if (lowerError.includes('cors') || lowerError.includes('origin')) {
      steps.push('Verify CORS configuration allows your domain');
      steps.push('Check server allows the current origin');
    }
    
    if (lowerError.includes('timeout')) {
      steps.push('Check network connectivity');
      steps.push('Increase connection timeout');
    }
    
    if (lowerError.includes('network') || lowerError.includes('offline')) {
      steps.push('Check internet connection');
      steps.push('Verify firewall settings');
    }
    
    // Default troubleshooting steps
    if (steps.length === 0) {
      steps.push('Restart the WebSocket server');
      steps.push('Check server logs for errors');
      steps.push('Try refreshing the application');
    }
    
    return steps;
  }
  
  private _createFriendlyErrorMessage(technicalError: string): string {
    const lowerError = technicalError.toLowerCase();
    
    if (lowerError.includes('connection refused') || lowerError.includes('econnrefused') || lowerError.includes('websocket')) {
      return 'Cannot connect to the transcription service. Please ensure the native WebSocket server is running on ws://127.0.0.1:5000.';
    }
    
    if (lowerError.includes('timeout')) {
      return 'Connection timeout. The transcription service may be unavailable.';
    }
    
    if (lowerError.includes('cors')) {
      return 'Cross-origin request blocked. Server configuration may need updating.';
    }
    
    if (lowerError.includes('network')) {
      return 'Network error. Please check your internet connection.';
    }
    
    // Default friendly message
    return `Connection error: ${technicalError}. Please try again or contact support.`;
  }
}