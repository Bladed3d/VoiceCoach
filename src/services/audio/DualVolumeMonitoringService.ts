/**
 * VoiceCoach V2 - Dual Volume Monitoring Service
 * Monitors both microphone and tab/headphone audio separately
 * LED Range: 7250-7299
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { VolumeState } from '../../types/coaching';

export class DualVolumeMonitoringService {
  private trail: BreadcrumbTrail;
  
  // Microphone monitoring
  private micAnalyser: AnalyserNode | null = null;
  private micContext: AudioContext | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  
  // Tab/headphone monitoring
  private tabAnalyser: AnalyserNode | null = null;
  private tabContext: AudioContext | null = null;
  private tabSource: MediaStreamAudioSourceNode | null = null;
  
  // Animation frames
  private micAnimationFrame: number | null = null;
  private tabAnimationFrame: number | null = null;
  
  // States
  private isMicMonitoring = false;
  private isTabMonitoring = false;
  
  // Callbacks
  private micVolumeCallback?: (volumeState: VolumeState) => void;
  private tabVolumeCallback?: (volumeState: VolumeState) => void;

  constructor() {
    this.trail = new BreadcrumbTrail('DualVolumeMonitoringService');
    
    // LED 7250: Dual volume service initialization
    this.trail.light(7250, {
      operation: 'dual_volume_service_init',
      timestamp: Date.now()
    });
  }

  /**
   * Start monitoring microphone volume
   */
  async startMicMonitoring(micStream: MediaStream): Promise<boolean> {
    // LED 7251: Mic monitoring start
    this.trail.light(7251, {
      operation: 'mic_monitoring_start',
      hasStream: !!micStream,
      streamActive: micStream?.active,
      trackCount: micStream?.getTracks().length,
      timestamp: Date.now()
    });

    try {
      if (!micStream || !micStream.active) {
        throw new Error('Invalid or inactive microphone stream');
      }

      // Create AudioContext for mic volume analysis
      this.micContext = new AudioContext({ sampleRate: 16000 });
      this.micSource = this.micContext.createMediaStreamSource(micStream);
      this.micAnalyser = this.micContext.createAnalyser();
      
      // Configure analyser
      this.micAnalyser.fftSize = 256;
      this.micAnalyser.smoothingTimeConstant = 0.8;
      
      // Connect audio graph
      this.micSource.connect(this.micAnalyser);
      
      this.isMicMonitoring = true;
      
      // LED 7252: Mic monitoring ready
      this.trail.light(7252, {
        operation: 'mic_monitoring_ready',
        contextState: this.micContext.state,
        fftSize: this.micAnalyser.fftSize,
        timestamp: Date.now()
      });

      // Start volume update loop
      this.updateMicVolumeLevel();
      
      return true;
    } catch (error) {
      // LED 8251: Mic monitoring failure
      this.trail.fail(8251, error as Error);
      return false;
    }
  }

  /**
   * Start monitoring tab/headphone volume
   */
  async startTabMonitoring(tabStream: MediaStream): Promise<boolean> {
    // LED 7253: Tab monitoring start
    this.trail.light(7253, {
      operation: 'tab_monitoring_start',
      hasStream: !!tabStream,
      streamActive: tabStream?.active,
      trackCount: tabStream?.getTracks().length,
      timestamp: Date.now()
    });

    try {
      if (!tabStream || !tabStream.active) {
        throw new Error('Invalid or inactive tab audio stream');
      }

      // Create separate AudioContext for tab volume analysis
      this.tabContext = new AudioContext({ sampleRate: 16000 });
      this.tabSource = this.tabContext.createMediaStreamSource(tabStream);
      this.tabAnalyser = this.tabContext.createAnalyser();
      
      // Configure analyser
      this.tabAnalyser.fftSize = 256;
      this.tabAnalyser.smoothingTimeConstant = 0.8;
      
      // Connect audio graph
      this.tabSource.connect(this.tabAnalyser);
      
      this.isTabMonitoring = true;
      
      // LED 7254: Tab monitoring ready
      this.trail.light(7254, {
        operation: 'tab_monitoring_ready',
        contextState: this.tabContext.state,
        fftSize: this.tabAnalyser.fftSize,
        timestamp: Date.now()
      });

      // Start volume update loop
      this.updateTabVolumeLevel();
      
      return true;
    } catch (error) {
      // LED 8253: Tab monitoring failure
      this.trail.fail(8253, error as Error);
      this.trail.light(8254, {
        operation: 'tab_monitoring_fallback',
        error: (error as Error).message,
        timestamp: Date.now()
      });
      return false;
    }
  }

  /**
   * Stop all monitoring
   */
  stopMonitoring(): void {
    // LED 7255: Dual monitoring stop
    this.trail.light(7255, {
      operation: 'dual_monitoring_stop',
      wasMicMonitoring: this.isMicMonitoring,
      wasTabMonitoring: this.isTabMonitoring,
      timestamp: Date.now()
    });

    this.stopMicMonitoring();
    this.stopTabMonitoring();
    
    // LED 7256: Dual monitoring cleanup complete
    this.trail.light(7256, {
      operation: 'dual_monitoring_cleanup_complete',
      timestamp: Date.now()
    });
  }

  /**
   * Stop microphone monitoring
   */
  private stopMicMonitoring(): void {
    this.isMicMonitoring = false;

    if (this.micAnimationFrame) {
      cancelAnimationFrame(this.micAnimationFrame);
      this.micAnimationFrame = null;
    }

    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }

    if (this.micAnalyser) {
      this.micAnalyser.disconnect();
      this.micAnalyser = null;
    }

    if (this.micContext && this.micContext.state !== 'closed') {
      this.micContext.close();
      this.micContext = null;
    }

    // Send final state
    this.notifyMicVolumeChange({
      level: 0,
      isMonitoring: false,
      status: 'silent'
    });
  }

  /**
   * Stop tab/headphone monitoring
   */
  private stopTabMonitoring(): void {
    this.isTabMonitoring = false;

    if (this.tabAnimationFrame) {
      cancelAnimationFrame(this.tabAnimationFrame);
      this.tabAnimationFrame = null;
    }

    if (this.tabSource) {
      this.tabSource.disconnect();
      this.tabSource = null;
    }

    if (this.tabAnalyser) {
      this.tabAnalyser.disconnect();
      this.tabAnalyser = null;
    }

    if (this.tabContext && this.tabContext.state !== 'closed') {
      this.tabContext.close();
      this.tabContext = null;
    }

    // Send final state
    this.notifyTabVolumeChange({
      level: 0,
      isMonitoring: false,
      status: 'silent'
    });
  }

  /**
   * Set callbacks for volume updates
   */
  onMicVolumeChange(callback: (volumeState: VolumeState) => void): void {
    this.micVolumeCallback = callback;
  }

  onTabVolumeChange(callback: (volumeState: VolumeState) => void): void {
    this.tabVolumeCallback = callback;
  }

  /**
   * Update microphone volume level
   */
  private updateMicVolumeLevel(): void {
    if (!this.micAnalyser || !this.isMicMonitoring) {
      return;
    }

    try {
      const dataArray = new Uint8Array(this.micAnalyser.frequencyBinCount);
      this.micAnalyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const volumePercent = Math.round((average / 255) * 100);
      
      // Determine status
      const status: VolumeState['status'] = 
        volumePercent > 20 ? 'good' : 
        volumePercent > 5 ? 'low' : 
        'silent';

      const volumeState: VolumeState = {
        level: volumePercent,
        isMonitoring: this.isMicMonitoring,
        status
      };

      // LED 7257: Mic volume update (throttled)
      if (Math.random() < 0.02) { // ~1 in 50 chance
        this.trail.light(7257, {
          operation: 'mic_volume_update',
          volumePercent,
          status,
          timestamp: Date.now()
        });
      }

      this.notifyMicVolumeChange(volumeState);

      // Continue monitoring
      this.micAnimationFrame = requestAnimationFrame(() => this.updateMicVolumeLevel());

    } catch (error) {
      // LED 8257: Mic volume calculation error
      this.trail.fail(8257, error as Error);
      this.micAnimationFrame = requestAnimationFrame(() => this.updateMicVolumeLevel());
    }
  }

  /**
   * Update tab/headphone volume level
   */
  private updateTabVolumeLevel(): void {
    if (!this.tabAnalyser || !this.isTabMonitoring) {
      return;
    }

    try {
      const dataArray = new Uint8Array(this.tabAnalyser.frequencyBinCount);
      this.tabAnalyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const volumePercent = Math.round((average / 255) * 100);
      
      // Determine status
      const status: VolumeState['status'] = 
        volumePercent > 20 ? 'good' : 
        volumePercent > 5 ? 'low' : 
        'silent';

      const volumeState: VolumeState = {
        level: volumePercent,
        isMonitoring: this.isTabMonitoring,
        status
      };

      // LED 7258: Tab volume update (throttled)
      if (Math.random() < 0.02) { // ~1 in 50 chance
        this.trail.light(7258, {
          operation: 'tab_volume_update',
          volumePercent,
          status,
          timestamp: Date.now()
        });
      }

      this.notifyTabVolumeChange(volumeState);

      // Continue monitoring
      this.tabAnimationFrame = requestAnimationFrame(() => this.updateTabVolumeLevel());

    } catch (error) {
      // LED 8258: Tab volume calculation error
      this.trail.fail(8258, error as Error);
      this.tabAnimationFrame = requestAnimationFrame(() => this.updateTabVolumeLevel());
    }
  }

  /**
   * Notify callbacks about volume changes
   */
  private notifyMicVolumeChange(volumeState: VolumeState): void {
    if (this.micVolumeCallback) {
      try {
        this.micVolumeCallback(volumeState);
      } catch (error) {
        // LED 8259: Mic callback error
        this.trail.fail(8259, error as Error);
      }
    }
  }

  private notifyTabVolumeChange(volumeState: VolumeState): void {
    if (this.tabVolumeCallback) {
      try {
        this.tabVolumeCallback(volumeState);
      } catch (error) {
        // LED 8260: Tab callback error
        this.trail.fail(8260, error as Error);
      }
    }
  }

  /**
   * Get service diagnostics
   */
  getDebugInfo() {
    return {
      mic: {
        isMonitoring: this.isMicMonitoring,
        hasContext: !!this.micContext,
        hasAnalyser: !!this.micAnalyser,
        hasSource: !!this.micSource,
        contextState: this.micContext?.state
      },
      tab: {
        isMonitoring: this.isTabMonitoring,
        hasContext: !!this.tabContext,
        hasAnalyser: !!this.tabAnalyser,
        hasSource: !!this.tabSource,
        contextState: this.tabContext?.state
      },
      breadcrumbCount: this.trail.sequence.length
    };
  }
}