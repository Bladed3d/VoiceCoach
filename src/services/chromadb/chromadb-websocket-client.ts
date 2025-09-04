/**
 * VoiceCoach V2 - ChromaDB WebSocket Client
 * Communicates with Python ChromaDB server for semantic search
 * LED Range: 6550-6599
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

export interface ChromaDBSearchResult {
  id: string;
  confidence: number;
  technique_name: string;
  trigger: string;
  immediate_response: string;
  tone?: string;
  next_move?: string;
  next_strategy?: string;
  third_move?: string;
  expected_outcome?: string;
  current_situation?: string;
  path_type: 'main' | 'alternative';
}

export interface ChromaDBStats {
  status: string;
  collection_name?: string;
  document_count?: number;
  embedding_model?: string;
  persist_directory?: string;
}

export class ChromaDBWebSocketClient {
  private trail: BreadcrumbTrail;
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  private messageQueue: Array<{ resolve: Function; reject: Function; message: any }> = [];
  private currentDocumentPath: string | null = null;

  constructor(serverUrl: string = 'ws://127.0.0.1:8767') {
    this.trail = new BreadcrumbTrail('ChromaDBClient');
    this.serverUrl = serverUrl;
    
    // LED 6550: Client initialization
    this.trail.light(6550, {
      operation: 'chromadb_client_init',
      server_url: serverUrl,
      timestamp: Date.now()
    });
  }

  /**
   * Connect to ChromaDB WebSocket server
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // LED 6551: Attempting connection
        this.trail.light(6551, {
          operation: 'connecting_to_chromadb',
          url: this.serverUrl,
          attempt: this.reconnectAttempts + 1
        });

        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          // LED 6552: Connection established
          this.trail.light(6552, {
            operation: 'chromadb_connected',
            reconnect_attempts: this.reconnectAttempts
          });
          
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Initialize ChromaDB on server
          this.sendMessage({ command: 'initialize' });
          
          // Process queued messages
          this.processMessageQueue();
          
          resolve(true);
        };

        this.ws.onerror = (error) => {
          // LED 8551: Connection error
          this.trail.fail(8551, new Error(`WebSocket error: ${error}`));
          this.isConnected = false;
          resolve(false);
        };

        this.ws.onclose = () => {
          // LED 6553: Connection closed
          this.trail.light(6553, {
            operation: 'chromadb_disconnected',
            will_reconnect: this.reconnectAttempts < this.maxReconnectAttempts
          });
          
          this.isConnected = false;
          
          // Attempt reconnection
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++;
              this.connect();
            }, this.reconnectDelay);
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const response = JSON.parse(event.data);
            
            // LED 6554: Message received
            this.trail.light(6554, {
              operation: 'message_received',
              status: response.status,
              led: response.led
            });
            
            // Handle the response (would need to match with pending requests)
            this.handleResponse(response);
            
          } catch (error) {
            this.trail.fail(8552, error as Error);
          }
        };

      } catch (error) {
        this.trail.fail(8553, error as Error);
        resolve(false);
      }
    });
  }

  /**
   * Load a RAG document into ChromaDB
   */
  async loadDocument(documentPath: string): Promise<boolean> {
    try {
      // LED 6560: Loading document
      this.trail.light(6560, {
        operation: 'loading_rag_document',
        path: documentPath
      });

      const response = await this.sendMessage({
        command: 'load_document',
        path: documentPath
      });

      if (response.status === 'success') {
        this.currentDocumentPath = documentPath;
        
        // LED 6561: Document loaded successfully
        this.trail.light(6561, {
          operation: 'document_loaded',
          path: documentPath
        });
        
        return true;
      }

      return false;
    } catch (error) {
      this.trail.fail(8560, error as Error);
      return false;
    }
  }

  /**
   * Search for relevant coaching techniques
   */
  async search(query: string, nResults: number = 3): Promise<ChromaDBSearchResult[]> {
    try {
      // LED 6570: Performing search
      const startTime = Date.now();
      this.trail.light(6570, {
        operation: 'searching',
        query_length: query.length,
        n_results: nResults
      });

      const response = await this.sendMessage({
        command: 'search',
        query: query,
        n_results: nResults
      });

      if (response.status === 'success' && response.results) {
        // LED 6571: Search complete
        this.trail.light(6571, {
          operation: 'search_complete',
          results_count: response.results.length,
          search_time_ms: Date.now() - startTime
        });
        
        return response.results;
      }

      return [];
    } catch (error) {
      this.trail.fail(8570, error as Error);
      return [];
    }
  }

  /**
   * Get ChromaDB statistics
   */
  async getStats(): Promise<ChromaDBStats> {
    try {
      const response = await this.sendMessage({
        command: 'get_stats'
      });

      if (response.status === 'success' && response.stats) {
        return response.stats;
      }

      return { status: 'error' };
    } catch (error) {
      this.trail.fail(8571, error as Error);
      return { status: 'error', collection_name: 'Error retrieving stats' };
    }
  }

  /**
   * Ping the server for health check
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.sendMessage({
        command: 'ping'
      });

      return response.status === 'success';
    } catch (error) {
      return false;
    }
  }

  /**
   * Send a message to the WebSocket server
   */
  private sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
        // Queue the message if not connected
        this.messageQueue.push({ resolve, reject, message });
        
        // Try to connect if not already
        if (!this.isConnected) {
          this.connect();
        }
        return;
      }

      // Create a unique ID for this message
      const messageId = Date.now() + Math.random();
      const fullMessage = { ...message, id: messageId };

      // Store the resolver for this message
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000); // 10 second timeout

      // Set up one-time response handler
      const messageHandler = (event: MessageEvent) => {
        try {
          const response = JSON.parse(event.data);
          if (response.id === messageId || !response.id) {
            clearTimeout(timeout);
            this.ws?.removeEventListener('message', messageHandler);
            resolve(response);
          }
        } catch (error) {
          // Not our message, ignore
        }
      };

      this.ws.addEventListener('message', messageHandler);
      
      // Send the message
      this.ws.send(JSON.stringify(fullMessage));
      
      // LED 6580: Message sent
      this.trail.light(6580, {
        operation: 'message_sent',
        command: message.command
      });
    });
  }

  /**
   * Process queued messages after connection
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const { resolve, reject, message } = this.messageQueue.shift()!;
      this.sendMessage(message).then(resolve).catch(reject);
    }
  }

  /**
   * Handle incoming responses
   */
  private handleResponse(response: any): void {
    // LED breadcrumbs for different response types
    if (response.led) {
      this.trail.light(response.led, {
        operation: 'server_response',
        status: response.status
      });
    }
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    // LED 6590: Disconnecting
    this.trail.light(6590, {
      operation: 'disconnecting_chromadb'
    });

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.messageQueue = [];
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Get current document path
   */
  get documentPath(): string | null {
    return this.currentDocumentPath;
  }
}

// Export singleton instance - lazily created
let _chromaDBClient: ChromaDBWebSocketClient | null = null;

export const getChromaDBClient = (): ChromaDBWebSocketClient => {
  if (!_chromaDBClient) {
    _chromaDBClient = new ChromaDBWebSocketClient();
  }
  return _chromaDBClient;
};

// For backward compatibility - but use getChromaDBClient() instead
export const chromaDBClient = {
  get connected() {
    return getChromaDBClient().connected;
  },
  connect: () => getChromaDBClient().connect(),
  loadDocument: (path: string) => getChromaDBClient().loadDocument(path),
  search: (query: string, nResults?: number) => getChromaDBClient().search(query, nResults),
  getStats: () => getChromaDBClient().getStats(),
  ping: () => getChromaDBClient().ping(),
  disconnect: () => getChromaDBClient().disconnect(),
  get documentPath() {
    return getChromaDBClient().documentPath;
  }
};