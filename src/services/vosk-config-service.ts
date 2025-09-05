/**
 * VoiceCoach V2 - Vosk Configuration Service
 * Manages real-time configuration updates for Vosk transcription
 */

import { VoskConfig, defaultVoskConfig } from '../types/vosk-config';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

export interface VoskConfigChangeEvent {
  type: 'config_update';
  config: VoskConfig;
  changes: string[];
}

export class VoskConfigService {
  private trail: BreadcrumbTrail;
  private currentConfig: VoskConfig;
  private listeners: Array<(event: VoskConfigChangeEvent) => void> = [];
  private ws: WebSocket | null = null;

  constructor() {
    this.trail = new BreadcrumbTrail('VoskConfigService');
    this.currentConfig = this.loadConfig();
    
    this.trail.light(7400, {
      operation: 'vosk_config_service_initialized',
      hasStoredConfig: !!localStorage.getItem('voicecoach-vosk-config')
    });

    // Listen for storage events (changes from other tabs/windows)
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  private loadConfig(): VoskConfig {
    try {
      const stored = localStorage.getItem('voicecoach-vosk-config');
      if (stored) {
        const config = JSON.parse(stored);
        this.trail.light(7401, {
          operation: 'config_loaded_from_storage',
          chunkSize: config.audio?.chunkSize,
          mode: config.transcription?.mode
        });
        return config;
      }
    } catch (error) {
      this.trail.fail(8401, error as Error);
    }
    return defaultVoskConfig;
  }

  getConfig(): VoskConfig {
    return { ...this.currentConfig };
  }

  async updateConfig(newConfig: VoskConfig): Promise<boolean> {
    try {
      const changes = this.detectChanges(this.currentConfig, newConfig);
      
      if (changes.length === 0) {
        this.trail.light(7402, { operation: 'no_config_changes' });
        return true;
      }

      this.trail.light(7403, {
        operation: 'config_update_started',
        changes,
        oldChunkSize: this.currentConfig.audio?.chunkSize,
        newChunkSize: newConfig.audio?.chunkSize
      });

      // Save to localStorage
      localStorage.setItem('voicecoach-vosk-config', JSON.stringify(newConfig));
      this.currentConfig = newConfig;

      // Apply runtime updates
      await this.applyRuntimeUpdates(changes, newConfig);

      // Notify listeners
      const event: VoskConfigChangeEvent = {
        type: 'config_update',
        config: newConfig,
        changes
      };
      
      this.listeners.forEach(listener => listener(event));

      this.trail.light(7404, {
        operation: 'config_update_completed',
        changesApplied: changes
      });

      return true;
    } catch (error) {
      this.trail.fail(8403, error as Error);
      return false;
    }
  }

  private detectChanges(oldConfig: VoskConfig, newConfig: VoskConfig): string[] {
    const changes: string[] = [];

    // Audio changes
    if (oldConfig.audio?.chunkSize !== newConfig.audio?.chunkSize) {
      changes.push('audio.chunkSize');
    }
    if (oldConfig.audio?.sampleRate !== newConfig.audio?.sampleRate) {
      changes.push('audio.sampleRate');
    }

    // Transcription changes  
    if (oldConfig.transcription?.mode !== newConfig.transcription?.mode) {
      changes.push('transcription.mode');
    }
    if (oldConfig.transcription?.enablePartials !== newConfig.transcription?.enablePartials) {
      changes.push('transcription.enablePartials');
    }
    if (oldConfig.transcription?.setWords !== newConfig.transcription?.setWords) {
      changes.push('transcription.setWords');
    }
    if (oldConfig.transcription?.setPartialWords !== newConfig.transcription?.setPartialWords) {
      changes.push('transcription.setPartialWords');
    }

    // Performance changes
    if (oldConfig.performance?.debounceMs !== newConfig.performance?.debounceMs) {
      changes.push('performance.debounceMs');
    }

    return changes;
  }

  private async applyRuntimeUpdates(changes: string[], config: VoskConfig): Promise<void> {
    // Critical changes that need AudioWorklet restart
    const criticalChanges = ['audio.chunkSize', 'audio.sampleRate'];
    const needsRestart = changes.some(change => criticalChanges.includes(change));

    if (needsRestart) {
      this.trail.light(7405, {
        operation: 'critical_config_change_detected',
        changes: changes.filter(c => criticalChanges.includes(c))
      });

      // Send config update to Python server if connected
      await this.sendConfigToServer(config);
      
      // Trigger AudioWorklet reconfiguration via event
      window.dispatchEvent(new CustomEvent('vosk-config-critical-change', {
        detail: { config, changes }
      }));
    } else {
      // Non-critical changes can be applied without restart
      this.trail.light(7406, {
        operation: 'non_critical_config_update',
        changes
      });

      // Send config to server
      await this.sendConfigToServer(config);
    }
  }

  private async sendConfigToServer(config: VoskConfig): Promise<void> {
    try {
      // Connect to WebSocket server if not connected
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.ws = new WebSocket('ws://127.0.0.1:8765');
        await new Promise((resolve, reject) => {
          this.ws!.onopen = resolve;
          this.ws!.onerror = reject;
          setTimeout(() => reject(new Error('WebSocket connection timeout')), 3000);
        }).catch(error => {
          this.trail.light(7407, {
            operation: 'server_not_available_for_config',
            error: (error as Error).message
          });
          return;
        });
      }

      // Send configuration update
      const configMessage = {
        type: 'config_update',
        config: {
          setWords: config.transcription?.setWords ?? true,
          setPartialWords: config.transcription?.setPartialWords ?? true,
          enablePartials: config.transcription?.enablePartials ?? true
        }
      };

      this.ws.send(JSON.stringify(configMessage));
      
      this.trail.light(7408, {
        operation: 'config_sent_to_server',
        setWords: configMessage.config.setWords,
        setPartialWords: configMessage.config.setPartialWords
      });
    } catch (error) {
      this.trail.fail(8408, error as Error);
    }
  }

  private handleStorageChange(event: StorageEvent): void {
    if (event.key === 'voicecoach-vosk-config' && event.newValue) {
      try {
        const newConfig = JSON.parse(event.newValue);
        this.currentConfig = newConfig;
        
        this.trail.light(7409, {
          operation: 'config_changed_from_other_window'
        });

        // Notify listeners
        const changes = this.detectChanges(this.currentConfig, newConfig);
        const configEvent: VoskConfigChangeEvent = {
          type: 'config_update',
          config: newConfig,
          changes
        };
        
        this.listeners.forEach(listener => listener(configEvent));
      } catch (error) {
        this.trail.fail(8409, error as Error);
      }
    }
  }

  onConfigChange(callback: (event: VoskConfigChangeEvent) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    window.removeEventListener('storage', this.handleStorageChange.bind(this));
    this.listeners = [];
    
    this.trail.light(7410, {
      operation: 'config_service_disconnected'
    });
  }
}

// Export singleton instance
export const voskConfigService = new VoskConfigService();