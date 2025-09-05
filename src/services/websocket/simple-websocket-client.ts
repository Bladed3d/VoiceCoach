/**
 * SIMPLE Native WebSocket Client - No Socket.IO bullshit
 * Just reliable, straightforward WebSocket communication
 */

export interface TranscriptEvent {
  type: 'final_transcript' | 'partial_transcript';
  text: string;
  timestamp: string;
}

export class SimpleWebSocketClient {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private isRecording = false;
  private audioContext: AudioContext | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  
  // Callbacks
  private onTranscriptCallback?: (transcript: TranscriptEvent) => void;
  private onStatusCallback?: (status: string) => void;
  private onErrorCallback?: (error: string) => void;

  constructor(serverUrl: string = 'ws://127.0.0.1:8765') {
    this.serverUrl = serverUrl;
    console.log('🚀 SimpleWebSocketClient initialized:', serverUrl);
  }

  connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 Connecting to WebSocket:', this.serverUrl);
        this.ws = new WebSocket(this.serverUrl);
        this.ws.binaryType = 'arraybuffer'; // Handle binary data directly
        
        this.ws.onopen = () => {
          console.log('✅ WebSocket connected!');
          this.onStatusCallback?.('Connected');
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'final_transcript' && data.text) {
              console.log('📝 Final transcript:', data.text);
              this.onTranscriptCallback?.({
                type: 'final_transcript',
                text: data.text,
                timestamp: new Date().toISOString()
              });
            } else if (data.type === 'partial_transcript' && data.text) {
              console.log('💭 Partial:', data.text);
              this.onTranscriptCallback?.({
                type: 'partial_transcript',
                text: data.text,
                timestamp: new Date().toISOString()
              });
            } else if (data.type === 'status') {
              console.log('📊 Status:', data.message);
              this.onStatusCallback?.(data.message);
            }
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.onErrorCallback?.('Connection error');
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('🔴 WebSocket disconnected');
          this.onStatusCallback?.('Disconnected');
          
          // Auto-reconnect after 2 seconds
          if (this.isRecording) {
            console.log('🔄 Reconnecting in 2 seconds...');
            setTimeout(() => this.connect(), 2000);
          }
        };

      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  async startTranscription(): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('🔌 Not connected, connecting first...');
      await this.connect();
    }

    try {
      // Send start command
      this.ws?.send(JSON.stringify({ type: 'start_transcription' }));
      
      // Start audio capture
      await this.startAudioCapture();
      
      this.isRecording = true;
      console.log('🎤 Transcription started');
      return true;
    } catch (error) {
      console.error('❌ Failed to start transcription:', error);
      this.onErrorCallback?.(`Failed to start: ${(error as Error).message}`);
      return false;
    }
  }

  private async startAudioCapture(): Promise<void> {
    // Get user's microphone
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        sampleSize: 16,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    console.log('🎤 Microphone captured');

    // Create audio context at 16kHz
    this.audioContext = new AudioContext({ sampleRate: 16000 });

    // Load AudioWorklet
    await this.audioContext.audioWorklet.addModule('/vosk-audio-worklet.js');
    console.log('📦 AudioWorklet loaded');

    // Create AudioWorklet node
    this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'vosk-audio-processor');
    
    // Configure with buffer size from settings
    const voskConfig = JSON.parse(localStorage.getItem('voicecoach-vosk-config') || '{}');
    const bufferSize = voskConfig?.audio?.chunkSize || 8192; // Default to 8192 for 512ms chunks
    const sampleRate = voskConfig?.audio?.sampleRate || 16000;
    
    console.log('🎛️ Vosk Settings Applied:', {
      bufferSize,
      bufferDurationMs: Math.round(bufferSize / sampleRate * 1000),
      sampleRate,
      enablePartials: voskConfig?.transcription?.enablePartials ?? true,
      mode: voskConfig?.transcription?.mode || 'hybrid'
    });
    
    this.audioWorkletNode.port.postMessage({
      type: 'CONFIGURE',
      bufferSize: bufferSize
    });

    // Handle audio data from worklet
    this.audioWorkletNode.port.onmessage = (event) => {
      const { type, data, sampleCount, chunkIndex } = event.data;
      
      if (type === 'AUDIO_DATA' && this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send raw binary audio directly to server
        this.ws.send(data);
        
        if (chunkIndex % 10 === 0) {
          console.log(`📤 Sent chunk #${chunkIndex} (${sampleCount} samples)`);
        }
      }
    };

    // Connect audio graph
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.source.connect(this.audioWorkletNode);
    
    // Start recording
    this.audioWorkletNode.port.postMessage('START_RECORDING');
    console.log('🔴 Recording started');
  }

  stopTranscription(): boolean {
    this.isRecording = false;
    
    // Stop AudioWorklet
    if (this.audioWorkletNode) {
      this.audioWorkletNode.port.postMessage('STOP_RECORDING');
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }

    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Send stop command
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'stop_transcription' }));
    }

    console.log('⏹️ Transcription stopped');
    return true;
  }

  disconnect(): void {
    this.stopTranscription();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    console.log('👋 Disconnected');
  }

  // Event listeners
  onTranscript(callback: (transcript: TranscriptEvent) => void): void {
    this.onTranscriptCallback = callback;
  }

  onStatus(callback: (status: string) => void): void {
    this.onStatusCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}