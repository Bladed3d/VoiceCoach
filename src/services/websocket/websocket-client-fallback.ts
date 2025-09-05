/**
 * Fallback WebSocket client using dynamic import for Socket.IO
 * Works around bundling issues in Electron
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

export class WebSocketClientFallback {
  private socket: any = null;
  private io: any = null;
  private trail: BreadcrumbTrail;
  private serverUrl: string;
  
  constructor(serverUrl: string = 'http://127.0.0.1:5000') {
    this.trail = new BreadcrumbTrail('WebSocketFallback');
    this.serverUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
  }
  
  async connect(): Promise<boolean> {
    try {
      console.log('[WebSocketFallback] Attempting to load Socket.IO client...');
      
      // Try dynamic import first
      try {
        const module = await import('socket.io-client');
        this.io = module.io || module.default;
        console.log('[WebSocketFallback] Socket.IO loaded via import');
      } catch (importErr) {
        console.warn('[WebSocketFallback] Import failed, trying require...');
        
        // Fallback to require for Electron
        try {
          // @ts-ignore
          this.io = require('socket.io-client').io;
          console.log('[WebSocketFallback] Socket.IO loaded via require');
        } catch (requireErr) {
          // Last resort - use window global if available
          // @ts-ignore
          if (typeof window !== 'undefined' && window.io) {
            // @ts-ignore
            this.io = window.io;
            console.log('[WebSocketFallback] Socket.IO loaded from window');
          } else {
            throw new Error('Socket.IO client not available');
          }
        }
      }
      
      console.log('[WebSocketFallback] Creating connection to:', this.serverUrl);
      
      this.socket = this.io(this.serverUrl, {
        transports: ['polling', 'websocket'], // Try polling first
        reconnection: true,
        reconnectionAttempts: 3,
        timeout: 10000
      });
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('[WebSocketFallback] Connection timeout');
          reject(new Error('Connection timeout after 10 seconds'));
        }, 10000);
        
        this.socket.on('connect', () => {
          clearTimeout(timeout);
          console.log('[WebSocketFallback] ✅ Connected! ID:', this.socket.id);
          this.trail.light(7100, { connected: true, socketId: this.socket.id });
          resolve(true);
        });
        
        this.socket.on('connect_error', (error: any) => {
          clearTimeout(timeout);
          console.error('[WebSocketFallback] ❌ Connection error:', error.message);
          console.error('[WebSocketFallback] Error type:', error.type);
          console.error('[WebSocketFallback] Full error:', error);
          this.trail.fail(8100, error);
          reject(error);
        });
        
        this.socket.on('status', (data: any) => {
          console.log('[WebSocketFallback] Status:', data);
        });
      });
      
    } catch (error) {
      console.error('[WebSocketFallback] Fatal error:', error);
      this.trail.fail(8101, error as Error);
      throw error;
    }
  }
  
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  emit(event: string, data?: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }
  
  on(event: string, callback: Function): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }
  
  get connected(): boolean {
    return this.socket?.connected || false;
  }
}

// Test function to verify Socket.IO availability
export async function testSocketIOAvailability(): Promise<string> {
  const results: string[] = [];
  
  // Test 1: Check if module can be imported
  try {
    await import('socket.io-client');
    results.push('✅ Socket.IO can be imported');
  } catch (e) {
    results.push('❌ Socket.IO import failed: ' + (e as Error).message);
  }
  
  // Test 2: Check if require works (Node/Electron)
  try {
    // @ts-ignore
    require('socket.io-client');
    results.push('✅ Socket.IO can be required');
  } catch (e) {
    results.push('❌ Socket.IO require failed: ' + (e as Error).message);
  }
  
  // Test 3: Check window.io
  // @ts-ignore
  if (typeof window !== 'undefined' && window.io) {
    results.push('✅ Socket.IO available on window');
  } else {
    results.push('❌ Socket.IO not on window object');
  }
  
  // Test 4: Try to create a connection
  try {
    const client = new WebSocketClientFallback();
    await client.connect();
    client.disconnect();
    results.push('✅ Successfully connected to server');
  } catch (e) {
    results.push('❌ Connection test failed: ' + (e as Error).message);
  }
  
  return results.join('\n');
}