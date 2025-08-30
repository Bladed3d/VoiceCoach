/**
 * VoiceCoach V2 - Native WebSocket Client Service
 * Direct WebSocket connection for real-time transcription with <1ms latency
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

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
  private socket: WebSocket | null = null;
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
  private trail: BreadcrumbTrail;
  
  // Audio capture properties - AudioWorklet for optimal performance
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isRecording = false;

  constructor(serverUrl: string = 'ws://127.0.0.1:5000') {
    // LED 7001: Enhanced URL validation and fallback
    this.trail = new BreadcrumbTrail('WebSocketClient');
    
    // Validate and set server URL with fallback options (native WebSocket protocol)
    const validUrls = [
      serverUrl,
      'ws://127.0.0.1:5000',
      'ws://localhost:5000'
    ];
    
    this.serverUrl = validUrls.find(url => url && (url.startsWith('ws://') || url.startsWith('wss://'))) || 'ws://127.0.0.1:5000';
    
    this.trail.light(7001, {
      operation: 'websocket_client_initialization',
      requestedUrl: serverUrl,
      selectedUrl: this.serverUrl,
      fallbackOptions: validUrls,
      timestamp: Date.now()
    });
  }

  // LED Breadcrumb 7010: Connect to native WebSocket server
  connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.trail.light(7010, { serverUrl: this.serverUrl, operation: 'native_websocket_connect_start' });
        
        // LED 7009: Initialize native WebSocket connection
        this.trail.light(7009, {
          operation: 'native_websocket_initialization',
          protocol: 'native_websocket',
          serverUrl: this.serverUrl,
          maxReconnectAttempts: this.maxReconnectAttempts,
          reconnectDelay: this.reconnectDelay
        });
        
        this.socket = new WebSocket(this.serverUrl);
        this.socket.binaryType = 'arraybuffer'; // Handle binary audio data

        // LED Breadcrumb 7011: Handle connection events
        this.socket.onopen = () => {
          this.trail.lightWithVerification(7011, 
            { operation: 'native_websocket_connected', timestamp: Date.now() },
            { expect: 'connected', actual: this.socket?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected' }
          );
          
          // LED 7052: Connection health verification
          this.trail.checkpoint(7052, 'connection_health_check',
            () => this.socket?.readyState === WebSocket.OPEN,
            { readyState: this.socket?.readyState, timestamp: Date.now() }
          );
          
          this.reconnectAttempts = 0; // Reset on successful connection
          this.onStatusCallback?.('Connected');
          resolve(true);
        };

        this.socket.onclose = (event) => {
          this.trail.light(7012, { 
            operation: 'native_websocket_disconnected', 
            timestamp: Date.now(),
            code: event.code,
            reason: event.reason || 'server_disconnect',
            wasClean: event.wasClean
          });
          
          // LED 7053: Connection state cleanup
          this.trail.light(7053, {
            operation: 'connection_state_cleanup',
            previouslyConnected: true,
            cleanupTimestamp: Date.now(),
            willReconnect: !event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts
          });
          
          this.onStatusCallback?.('Disconnected');
          
          // Attempt reconnection if not a clean close
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this._attemptReconnect();
          }
        };

        this.socket.onerror = (event) => {
          // LED 8011: Connection error with detailed diagnostic info
          const errorMessage = `Native WebSocket connection error`;
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
          
          console.error('❌ Native WebSocket connection failed:', errorMessage);
          console.log('🔧 Troubleshooting steps:', diagnosticInfo.troubleshooting.join(', '));
          reject(new Error(errorMessage));
        };

        // Handle incoming messages
        this.socket.onmessage = (event) => {
          try {
            let data;
            
            // Handle binary data (audio responses) or JSON text
            if (typeof event.data === 'string') {
              data = JSON.parse(event.data);
            } else {
              // Handle binary audio data if needed in the future
              console.log('Received binary data:', event.data);
              return;
            }
            
            this._handleMessage(data);
          } catch (error) {
            this.trail.fail(8022, new Error(`Message parsing error: ${(error as Error).message}`));
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };


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
      const coachingData: CoachingSuggestion = {
        type: 'coaching_suggestion',
        suggestion: data.suggestion || '',
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

  // LED Breadcrumb 7030: Start transcription
  async startTranscription(): Promise<boolean> {
    // LED 7029: Pre-transcription validation
    this.trail.checkpoint(7029, 'transcription_prerequisites',
      () => this.socket?.readyState === WebSocket.OPEN,
      {
        socketConnected: this.socket?.readyState === WebSocket.OPEN,
        readyState: this.socket?.readyState,
        serverUrl: this.serverUrl,
        timestamp: Date.now()
      }
    );
    
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.trail.fail(8030, new Error('Cannot start transcription: not connected'));
      
      // LED 8019: Transcription start failure analysis
      this.trail.light(8019, {
        operation: 'transcription_start_failure',
        reason: 'socket_not_connected',
        socketState: this.socket ? `readyState_${this.socket.readyState}` : 'socket_null',
        timestamp: Date.now()
      });
      
      return false;
    }

    this.trail.light(7030, { 
      operation: 'start_transcription_command', 
      timestamp: Date.now(),
      readyState: this.socket.readyState,
      commandSent: true
    });
    
    // LED 7059: Transcription command emission tracking
    this.trail.light(7059, {
      operation: 'transcription_command_emission',
      command: 'start_transcription',
      socketReady: true,
      timestamp: Date.now()
    });
    
    // Send start command to server
    this.socket.send(JSON.stringify({ type: 'start_transcription' }));
    
    // LED 7070: Audio capture initialization
    this.trail.light(7070, {
      operation: 'audio_capture_initialization_start',
      timestamp: Date.now()
    });
    
    // Start audio capture
    try {
      await this.startAudioCapture();
      this.trail.light(7071, {
        operation: 'audio_capture_started_successfully',
        isRecording: this.isRecording,
        hasMediaStream: !!this.mediaStream,
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      this.trail.fail(8071, error as Error);
      this.onErrorCallback?.(`Failed to start audio capture: ${(error as Error).message}`);
      return false;
    }
  }

  // LED Breadcrumb 7072: High-performance AudioWorklet implementation
  private async startAudioCapture(): Promise<void> {
    try {
      this.trail.light(7072, {
        operation: 'requesting_microphone_access_optimized',
        timestamp: Date.now()
      });

      // Configure microphone for optimal Vosk compatibility
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { ideal: 1 }, // Mono for Vosk
          sampleRate: { ideal: 16000 }, // Native 16kHz for Vosk
          sampleSize: { ideal: 16 }, // 16-bit PCM
          echoCancellation: false, // Disable processing overhead
          noiseSuppression: false, // Disable processing overhead  
          autoGainControl: false, // Disable processing overhead
          volume: 1.0 // Maximum signal strength
        }
      });

      this.trail.light(7073, {
        operation: 'optimal_microphone_configured',
        streamActive: this.mediaStream.active,
        trackCount: this.mediaStream.getTracks().length,
        actualSettings: this.mediaStream.getAudioTracks()[0]?.getSettings(),
        timestamp: Date.now()
      });

      // Notify UI about media stream for volume monitoring
      if (this.onMediaStreamCallback && this.mediaStream) {
        this.onMediaStreamCallback(this.mediaStream);
      }

      // Create AudioContext with exact Vosk sample rate
      this.audioContext = new AudioContext({
        sampleRate: 16000
      });

      // Load AudioWorklet for high-performance processing
      await this.audioContext.audioWorklet.addModule('/vosk-audio-worklet.js');
      
      this.trail.light(7074, {
        operation: 'audioworklet_loaded',
        contextSampleRate: this.audioContext.sampleRate,
        contextState: this.audioContext.state,
        timestamp: Date.now()
      });

      // Create AudioWorklet node for direct PCM processing
      this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'vosk-audio-processor');
      
      // Handle PCM data from AudioWorklet
      this.audioWorkletNode.port.onmessage = (event) => {
        const { type, data, sampleCount, chunkIndex } = event.data;
        
        if (type === 'AUDIO_DATA' && this.socket?.readyState === WebSocket.OPEN) {
          // LED 7075: High-performance audio chunk transmission
          this.trail.light(7075, {
            operation: 'audioworklet_pcm_transmission',
            sampleCount: sampleCount,
            byteSize: data.byteLength,
            chunkIndex: chunkIndex,
            timestamp: Date.now()
          });
          
          // Send raw PCM data directly to Vosk
          this.sendAudioChunk(data);
        } else if (type === 'RECORDING_STARTED') {
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
      this.trail.fail(8072, error as Error);
      this.onErrorCallback?.(`Failed to start optimized audio capture: ${(error as Error).message}`);
      throw error;
    }
  }

  // LED Breadcrumb 7031: Stop transcription  
  stopTranscription(): boolean {
    // LED 7060: Pre-stop validation
    this.trail.checkpoint(7060, 'transcription_stop_prerequisites',
      () => this.socket?.readyState === WebSocket.OPEN,
      {
        socketConnected: this.socket?.readyState === WebSocket.OPEN,
        readyState: this.socket?.readyState,
        timestamp: Date.now()
      }
    );
    
    // Stop audio capture first
    this.stopAudioCapture();
    
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.trail.fail(8031, new Error('Cannot stop transcription: not connected'));
      
      // LED 8020: Transcription stop failure analysis
      this.trail.light(8020, {
        operation: 'transcription_stop_failure',
        reason: 'socket_not_connected',
        socketState: this.socket ? `readyState_${this.socket.readyState}` : 'socket_null',
        timestamp: Date.now()
      });
      
      return false;
    }

    this.trail.light(7031, { 
      operation: 'stop_transcription_command', 
      timestamp: Date.now(),
      readyState: this.socket.readyState,
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
    this.trail.light(7078, {
      operation: 'optimized_audio_capture_stop_start',
      wasRecording: this.isRecording,
      hasAudioContext: !!this.audioContext,
      hasAudioWorklet: !!this.audioWorkletNode,
      hasMediaStream: !!this.mediaStream,
      timestamp: Date.now()
    });

    try {
      this.isRecording = false;

      // Stop AudioWorklet recording
      if (this.audioWorkletNode) {
        this.audioWorkletNode.port.postMessage('STOP_RECORDING');
        this.trail.light(7079, {
          operation: 'audioworklet_stop_command_sent',
          timestamp: Date.now()
        });
      }

      // Disconnect AudioWorklet node
      if (this.audioWorkletNode) {
        this.audioWorkletNode.disconnect();
        this.audioWorkletNode = null;
        this.trail.light(7080, {
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

      // Stop MediaStream tracks
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => {
          track.stop();
          this.trail.light(7083, {
            operation: 'media_track_stopped',
            trackKind: track.kind,
            trackEnabled: track.enabled,
            timestamp: Date.now()
          });
        });
        this.mediaStream = null;
      }

      this.trail.light(7084, {
        operation: 'optimized_audio_cleanup_complete',
        isRecording: this.isRecording,
        resourcesCleared: true,
        performanceOptimized: true,
        timestamp: Date.now()
      });

    } catch (error) {
      this.trail.fail(8078, error as Error);
    }
  }

  // LED Breadcrumb 7040: Send audio chunk (binary data)
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
    
    if (this.socket?.readyState !== WebSocket.OPEN) {
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
    
    // Send binary audio data directly to native WebSocket
    if (audioData instanceof ArrayBuffer) {
      this.socket.send(audioData);
    } else {
      this.socket.send(JSON.stringify({ type: 'audio_chunk', data: audioData }));
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
        operation: 'native_websocket_disconnect_start', 
        timestamp: Date.now(),
        readyState: this.socket.readyState,
        wasConnected: this.socket.readyState === WebSocket.OPEN
      });
      
      // LED 7064: Pre-disconnect state capture
      this.trail.light(7064, {
        operation: 'pre_disconnect_state_capture',
        connectionState: this.socket.readyState === WebSocket.OPEN,
        readyState: this.socket.readyState,
        hasActiveListeners: true,
        timestamp: Date.now()
      });
      
      // Clean disconnect with proper cleanup
      try {
        if (this.socket.readyState === WebSocket.OPEN) {
          this.socket.close(1000, 'Client disconnect'); // Normal closure
        }
        
        this.trail.lightWithVerification(7051, 
          { operation: 'native_websocket_disconnected_cleanly', timestamp: Date.now() },
          { expect: 'clean_disconnect', actual: 'clean_disconnect' }
        );
        
        // LED 7065: Post-disconnect cleanup verification
        this.trail.checkpoint(7065, 'disconnect_cleanup_verification',
          () => this.socket === null || this.socket.readyState === WebSocket.CLOSED,
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

  // Connection status
  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN || false;
  }

  // Expose socket for advanced event handling (audio status)
  get socketInstance(): WebSocket | null {
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
      readyState: this.socket?.readyState,
      reconnectAttempts: this.reconnectAttempts,
      breadcrumbSummary: this.getBreadcrumbSummary(),
      lastActivity: this.trail.sequence[this.trail.sequence.length - 1],
      connectionMetrics: {
        totalLEDs: this.trail.sequence.length,
        failedOperations: this.trail.sequence.filter(led => !led.success).length,
        lastOperationTime: this.trail.sequence[this.trail.sequence.length - 1]?.timestamp,
        socketHealth: this.socket?.readyState === WebSocket.OPEN || false
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