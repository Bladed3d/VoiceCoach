/**
 * Socket.IO Client for Vosk WebSocket Server
 * Replaces native WebSocket with Socket.IO protocol for proper communication
 */

import { io, Socket } from 'socket.io-client';
import { BreadcrumbTrail } from '../../lib/breadcrumb-trail';

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  partial?: boolean;
  timestamp?: number;
}

export class SocketIOVoskClient {
  private socket: Socket | null = null;
  private serverUrl: string;
  private isConnected: boolean = false;
  private trail: BreadcrumbTrail;
  private audioBuffer: Int16Array[] = [];
  private isTranscribing: boolean = false;

  constructor(serverUrl: string = 'ws://127.0.0.1:5000') {
    this.serverUrl = serverUrl.replace('ws://', 'http://'); // Socket.IO uses http://
    this.trail = BreadcrumbTrail.getInstance();
    
    // LED 6050: Initialize Socket.IO client
    this.trail.light(6050, {
      operation: 'socket_io_client_init',
      serverUrl: this.serverUrl
    });
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // LED 6051: Connecting to Socket.IO server
        this.trail.light(6051, {
          operation: 'socket_io_connect_start',
          url: this.serverUrl
        });

        // Create Socket.IO connection
        this.socket = io(this.serverUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
          // LED 6052: Socket.IO connection established
          this.trail.light(6052, {
            operation: 'socket_io_connected',
            socketId: this.socket?.id
          });
          
          this.isConnected = true;
          console.log('[SocketIO] Connected to Vosk server');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          // LED 8050: Socket.IO connection error
          this.trail.fail(8050, error);
          console.error('[SocketIO] Connection error:', error.message);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          // LED 6053: Socket.IO disconnected
          this.trail.light(6053, {
            operation: 'socket_io_disconnected',
            reason
          });
          
          this.isConnected = false;
          console.log('[SocketIO] Disconnected:', reason);
        });

        this.socket.on('status', (data) => {
          console.log('[SocketIO] Status:', data);
        });

        this.socket.on('transcription_result', (data: TranscriptionResult) => {
          // LED 6054: Transcription result received
          this.trail.light(6054, {
            operation: 'transcription_received',
            text: data.text,
            partial: data.partial,
            confidence: data.confidence
          });
          
          this.handleTranscriptionResult(data);
        });

        this.socket.on('transcription_status', (data) => {
          console.log('[SocketIO] Transcription status:', data);
        });

        this.socket.on('error', (error) => {
          // LED 8051: Socket.IO error
          this.trail.fail(8051, error);
          console.error('[SocketIO] Error:', error);
        });

      } catch (error) {
        // LED 8052: Socket.IO setup failure
        this.trail.fail(8052, error as Error);
        reject(error);
      }
    });
  }

  startTranscription(): void {
    if (!this.socket || !this.isConnected) {
      console.error('[SocketIO] Cannot start transcription: not connected');
      return;
    }

    // LED 6055: Start transcription
    this.trail.light(6055, {
      operation: 'start_transcription'
    });

    this.socket.emit('start_transcription');
    this.isTranscribing = true;
    console.log('[SocketIO] Started transcription');
  }

  stopTranscription(): void {
    if (!this.socket || !this.isConnected) {
      return;
    }

    // LED 6056: Stop transcription
    this.trail.light(6056, {
      operation: 'stop_transcription'
    });

    this.socket.emit('stop_transcription');
    this.isTranscribing = false;
    console.log('[SocketIO] Stopped transcription');
  }

  sendAudioChunk(audioData: ArrayBuffer | Int16Array): boolean {
    if (!this.socket || !this.isConnected || !this.isTranscribing) {
      return false;
    }

    try {
      let int16Data: Int16Array;
      
      // Convert ArrayBuffer to Int16Array if needed
      if (audioData instanceof ArrayBuffer) {
        int16Data = new Int16Array(audioData);
      } else {
        int16Data = audioData;
      }

      // Calculate audio level for debugging
      const avgLevel = Array.from(int16Data)
        .reduce((a, b) => a + Math.abs(b), 0) / int16Data.length;
      
      // LED 6057: Send audio chunk
      this.trail.light(6057, {
        operation: 'send_audio_chunk',
        samples: int16Data.length,
        avgLevel: avgLevel.toFixed(0),
        levelPercent: (avgLevel / 32767 * 100).toFixed(1)
      });

      // Convert to base64 for Socket.IO transmission
      const base64Data = this.arrayBufferToBase64(int16Data.buffer);
      
      // Send via Socket.IO
      this.socket.emit('audio_chunk', base64Data);
      
      // Log every 50th chunk for monitoring
      if (Math.random() < 0.02) { // ~2% of chunks
        console.log(`[SocketIO] Audio chunk sent: ${int16Data.length} samples, level: ${(avgLevel/32767*100).toFixed(1)}%`);
      }
      
      return true;
    } catch (error) {
      // LED 8053: Audio send failure
      this.trail.fail(8053, error as Error);
      console.error('[SocketIO] Failed to send audio:', error);
      return false;
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private handleTranscriptionResult(data: TranscriptionResult): void {
    // Emit custom event for the app to handle
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('vosk-transcription', {
        detail: data
      });
      window.dispatchEvent(event);
    }
    
    // Log significant transcriptions
    if (data.text && !data.partial) {
      console.log(`[Vosk] Final: "${data.text}"`);
    }
  }

  disconnect(): void {
    if (this.socket) {
      // LED 6058: Disconnect Socket.IO
      this.trail.light(6058, {
        operation: 'socket_io_disconnect'
      });
      
      this.stopTranscription();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('[SocketIO] Disconnected');
    }
  }

  isReady(): boolean {
    return this.isConnected && this.socket !== null;
  }
}

// Singleton instance
let voskClientInstance: SocketIOVoskClient | null = null;

export function getVoskClient(): SocketIOVoskClient {
  if (!voskClientInstance) {
    voskClientInstance = new SocketIOVoskClient();
  }
  return voskClientInstance;
}