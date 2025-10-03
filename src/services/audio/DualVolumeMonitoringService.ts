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
  private speakerChangeCallback?: (speaker: 'user' | 'prospect', confidence: number) => void;
  
  // Real-time speaker detection state
  private currentSpeaker: 'user' | 'prospect' = 'user';
  private lastMicLevel = 0;
  private lastTabLevel = 0;
  private speakerChangeDebounce = 0;

  // Configurable settings (loaded from localStorage)
  private speakerDebounceFrames = 8; // Default: 8 frames (~133ms)
  private micSensitivityMultiplier = 1.0; // Default: 100%
  private tabAudioGainMultiplier = 1.0; // Default: 100%
  private micThreshold = 18; // Default threshold
  private tabThreshold = 12; // Default threshold
  private speakerBias = 6; // Default bias
  private dominanceGap = 12; // Default gap

  constructor() {
    this.trail = new BreadcrumbTrail('DualVolumeMonitoringService');

    // Load settings from localStorage
    this.loadSettings();

    // LED 7250: Dual volume service initialization
    this.trail.light(7250, {
      operation: 'dual_volume_service_init',
      settings: {
        micSensitivity: this.micSensitivityMultiplier,
        tabAudioGain: this.tabAudioGainMultiplier,
        debounceFrames: this.speakerDebounceFrames,
        micThreshold: this.micThreshold,
        tabThreshold: this.tabThreshold
      },
      timestamp: Date.now()
    });
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const settingsStr = localStorage.getItem('voicecoach-settings');
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);

        // Apply mic sensitivity (0-100 scale to 0.0-2.0 multiplier)
        if (typeof settings.micSensitivity === 'number') {
          this.micSensitivityMultiplier = settings.micSensitivity / 50; // 50% = 1.0x, 100% = 2.0x
        }

        // Apply other party audio gain (0-200 scale to 0.0-2.0 multiplier)
        if (typeof settings.otherPartyGain === 'number') {
          this.tabAudioGainMultiplier = settings.otherPartyGain / 100; // 100% = 1.0x, 200% = 2.0x
        }

        // Load speaker detection settings if present
        if (settings.speakerDetection) {
          if (typeof settings.speakerDetection.debounceFrames === 'number') {
            this.speakerDebounceFrames = settings.speakerDetection.debounceFrames;
          }
          if (typeof settings.speakerDetection.micThreshold === 'number') {
            this.micThreshold = settings.speakerDetection.micThreshold;
          }
          if (typeof settings.speakerDetection.tabThreshold === 'number') {
            this.tabThreshold = settings.speakerDetection.tabThreshold;
          }
          if (typeof settings.speakerDetection.speakerBias === 'number') {
            this.speakerBias = settings.speakerDetection.speakerBias;
          }
          if (typeof settings.speakerDetection.dominanceGap === 'number') {
            this.dominanceGap = settings.speakerDetection.dominanceGap;
          }
        }
      }
    } catch (error) {
      console.error('Error loading DualVolumeMonitoringService settings:', error);
    }
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

  onSpeakerChange(callback: (speaker: 'user' | 'prospect', confidence: number) => void): void {
    this.speakerChangeCallback = callback;
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
      let volumePercent = Math.round((average / 255) * 100);

      // Apply mic sensitivity multiplier
      volumePercent = Math.min(100, Math.round(volumePercent * this.micSensitivityMultiplier));

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
          sensitivity: this.micSensitivityMultiplier,
          timestamp: Date.now()
        });
      }

      this.notifyMicVolumeChange(volumeState);

      // Store for real-time speaker detection
      this.lastMicLevel = volumePercent;
      this.detectSpeakerRealTime();

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
      let volumePercent = Math.round((average / 255) * 100);

      // Apply tab audio gain multiplier
      volumePercent = Math.min(100, Math.round(volumePercent * this.tabAudioGainMultiplier));

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
          audioGain: this.tabAudioGainMultiplier,
          timestamp: Date.now()
        });
      }

      this.notifyTabVolumeChange(volumeState);

      // Store for real-time speaker detection
      this.lastTabLevel = volumePercent;
      this.detectSpeakerRealTime();

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
   * Real-time speaker detection using same volume data as audio meters
   * Runs at 60fps for immediate speaker context
   */
  private detectSpeakerRealTime(): void {
    // Only run if both monitoring sources are active
    if (!this.isMicMonitoring || !this.isTabMonitoring) {
      return;
    }

    const micLevel = this.lastMicLevel;
    const tabLevel = this.lastTabLevel;
    
    // LED 7261: Real-time speaker analysis (throttled)
    if (Math.random() < 0.01) { // ~1 in 100 frames
      this.trail.light(7261, {
        operation: 'realtime_speaker_analysis',
        micLevel,
        tabLevel,
        currentSpeaker: this.currentSpeaker,
        timestamp: Date.now()
      });
    }

    // Use configurable thresholds with speaker stickiness
    let detectedSpeaker: 'user' | 'prospect';
    let confidence: number;

    // Apply speaker bias - make it harder to switch away from current speaker
    const currentSpeakerBonus = this.currentSpeaker === 'prospect' ? this.speakerBias : 0;
    const effectiveTabLevel = tabLevel + currentSpeakerBonus;

    const currentUserBonus = this.currentSpeaker === 'user' ? this.speakerBias : 0;
    const effectiveMicLevel = micLevel + currentUserBonus;

    // Prioritize tab audio (prospect) with stickiness
    if (effectiveTabLevel >= this.tabThreshold && effectiveTabLevel > micLevel) {
      detectedSpeaker = 'prospect';
      confidence = Math.min(95, effectiveTabLevel + Math.max(0, effectiveTabLevel - micLevel));

      // LED 7262: Prospect detected in real-time
      this.trail.light(7262, {
        operation: 'realtime_prospect_detected',
        tabLevel,
        micLevel,
        effectiveTabLevel,
        confidence,
        timestamp: Date.now()
      });
    }
    // Clear microphone dominance (user speaking) with stickiness
    else if (effectiveMicLevel >= this.micThreshold && effectiveMicLevel > (tabLevel + this.dominanceGap)) {
      detectedSpeaker = 'user';
      confidence = Math.min(95, effectiveMicLevel + Math.max(0, effectiveMicLevel - tabLevel));

      // LED 7263: User detected in real-time
      this.trail.light(7263, {
        operation: 'realtime_user_detected',
        micLevel,
        tabLevel,
        effectiveMicLevel,
        confidence,
        timestamp: Date.now()
      });
    }
    // Insufficient confidence to change - keep current speaker
    else {
      detectedSpeaker = this.currentSpeaker; // Keep current with stickiness
      confidence = 50;
      return; // No change needed
    }

    // Debounce speaker changes to avoid rapid switching
    if (detectedSpeaker !== this.currentSpeaker) {
      this.speakerChangeDebounce++;

      if (this.speakerChangeDebounce >= this.speakerDebounceFrames) {
        // LED 7264: Speaker change confirmed
        this.trail.light(7264, {
          operation: 'realtime_speaker_change',
          fromSpeaker: this.currentSpeaker,
          toSpeaker: detectedSpeaker,
          confidence,
          debounceFrames: this.speakerChangeDebounce,
          timestamp: Date.now()
        });
        
        this.currentSpeaker = detectedSpeaker;
        this.speakerChangeDebounce = 0;
        
        // Notify callback with minimal console output
        if (this.speakerChangeCallback) {
          console.log(`🎯 ${detectedSpeaker.toUpperCase()} ${confidence}%`);
          this.speakerChangeCallback(detectedSpeaker, confidence);
        }
      }
    } else {
      // Reset debounce if speaker stays the same
      this.speakerChangeDebounce = 0;
    }
  }

  /**
   * Get current detected speaker
   */
  getCurrentSpeaker(): 'user' | 'prospect' {
    return this.currentSpeaker;
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