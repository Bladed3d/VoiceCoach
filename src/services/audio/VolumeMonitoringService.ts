/**
 * VoiceCoach V2 - Volume Monitoring Service
 * Handles real-time audio volume analysis for visual feedback
 * LED Range: 7200-7299
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { VolumeState } from '../../types/coaching';

export class VolumeMonitoringService {
  private trail: BreadcrumbTrail;
  private audioAnalyser: AnalyserNode | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private volumeAnimationFrame: number | null = null;
  private isMonitoring = false;
  private volumeCallback?: (volumeState: VolumeState) => void;

  constructor() {
    this.trail = new BreadcrumbTrail('VolumeMonitoringService');
    
    // LED 7200: Volume service initialization
    this.trail.light(7200, {
      operation: 'volume_service_initialization',
      timestamp: Date.now()
    });
  }

  /**
   * Start monitoring volume from MediaStream
   */
  async startMonitoring(mediaStream: MediaStream): Promise<boolean> {
    // LED 7201: Volume monitoring start
    this.trail.light(7201, {
      operation: 'volume_monitoring_start',
      hasMediaStream: !!mediaStream,
      streamActive: mediaStream?.active,
      trackCount: mediaStream?.getTracks().length,
      timestamp: Date.now()
    });

    try {
      if (!mediaStream || !mediaStream.active) {
        throw new Error('Invalid or inactive MediaStream');
      }

      // Create AudioContext for volume analysis
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.source = this.audioContext.createMediaStreamSource(mediaStream);
      this.audioAnalyser = this.audioContext.createAnalyser();
      
      // Configure analyser for optimal volume detection
      this.audioAnalyser.fftSize = 256;
      this.audioAnalyser.smoothingTimeConstant = 0.8;
      
      // Connect audio graph: source -> analyser (no destination to avoid feedback)
      this.source.connect(this.audioAnalyser);
      
      this.isMonitoring = true;
      
      // LED 7202: Volume monitoring setup complete
      this.trail.light(7202, {
        operation: 'volume_monitoring_setup_complete',
        analyserCreated: !!this.audioAnalyser,
        audioContextState: this.audioContext.state,
        fftSize: this.audioAnalyser.fftSize,
        timestamp: Date.now()
      });

      // Start volume update loop
      this.updateVolumeLevel();
      
      return true;
    } catch (error) {
      // LED 8270: Volume monitoring setup failure
      this.trail.fail(8270, error as Error);
      return false;
    }
  }

  /**
   * Stop volume monitoring and cleanup resources
   */
  stopMonitoring(): void {
    // LED 7203: Volume monitoring stop
    this.trail.light(7203, {
      operation: 'volume_monitoring_stop',
      wasMonitoring: this.isMonitoring,
      timestamp: Date.now()
    });

    this.isMonitoring = false;

    // Cancel animation frame
    if (this.volumeAnimationFrame) {
      cancelAnimationFrame(this.volumeAnimationFrame);
      this.volumeAnimationFrame = null;
    }

    // Disconnect audio nodes
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioAnalyser) {
      this.audioAnalyser.disconnect();
      this.audioAnalyser = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Send final volume state
    this.notifyVolumeChange({
      level: 0,
      isMonitoring: false,
      status: 'silent'
    });

    // LED 7204: Volume monitoring cleanup complete
    this.trail.light(7204, {
      operation: 'volume_monitoring_cleanup_complete',
      resourcesCleared: true,
      timestamp: Date.now()
    });
  }

  /**
   * Set callback for volume updates
   */
  onVolumeChange(callback: (volumeState: VolumeState) => void): void {
    this.volumeCallback = callback;
  }

  /**
   * Get current monitoring state
   */
  getState(): VolumeState {
    return {
      level: 0, // Will be updated in real-time
      isMonitoring: this.isMonitoring,
      status: 'silent'
    };
  }

  /**
   * Internal method to update volume level in animation loop
   */
  private updateVolumeLevel(): void {
    if (!this.audioAnalyser || !this.isMonitoring) {
      return;
    }

    try {
      const dataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
      this.audioAnalyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const volumePercent = Math.round((average / 255) * 100);
      
      // Determine status based on volume level
      const status: VolumeState['status'] = 
        volumePercent > 20 ? 'good' : 
        volumePercent > 5 ? 'low' : 
        'silent';

      const volumeState: VolumeState = {
        level: volumePercent,
        isMonitoring: this.isMonitoring,
        status
      };

      // LED 7205: Volume level update (throttled logging)
      if (Math.random() < 0.02) { // ~1 in 50 chance to avoid spam
        this.trail.light(7205, {
          operation: 'volume_level_update',
          volumePercent,
          status,
          rawAverage: Math.round(average),
          timestamp: Date.now()
        });
      }

      // Notify callback with current state
      this.notifyVolumeChange(volumeState);

      // Continue monitoring
      this.volumeAnimationFrame = requestAnimationFrame(() => this.updateVolumeLevel());

    } catch (error) {
      // LED 8271: Volume calculation error
      this.trail.fail(8271, error as Error);
      
      // Continue monitoring despite error
      this.volumeAnimationFrame = requestAnimationFrame(() => this.updateVolumeLevel());
    }
  }

  /**
   * Notify callback about volume changes
   */
  private notifyVolumeChange(volumeState: VolumeState): void {
    if (this.volumeCallback) {
      try {
        this.volumeCallback(volumeState);
      } catch (error) {
        // LED 8272: Volume callback error
        this.trail.fail(8272, error as Error);
      }
    }
  }

  /**
   * Get service diagnostics for debugging
   */
  getDebugInfo() {
    return {
      isMonitoring: this.isMonitoring,
      hasAudioContext: !!this.audioContext,
      hasAnalyser: !!this.audioAnalyser,
      hasSource: !!this.source,
      audioContextState: this.audioContext?.state,
      breadcrumbCount: this.trail.sequence.length
    };
  }
}