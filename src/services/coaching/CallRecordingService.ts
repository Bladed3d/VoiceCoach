/**
 * VoiceCoach V2 - Call Recording Service
 * Captures complete call records for analysis, training, and compliance
 * LED Range: 6500-6599
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import type { TranscriptionItem } from '../../types/coaching';

interface CallEvent {
  type: 'transcript' | 'ollama_generation' | 'stage_change' | 'user_action';
  stageId: string;
  timestamp: string;
  data: any;
  ledTrace?: LEDEntry[];
}

interface LEDEntry {
  led: number;
  time: string;
  component: string;
  operation: string;
  data?: any;
}

interface CallRecording {
  session: {
    id: string;
    startTime: string;
    endTime?: string;
    duration: number;
    configuration: SessionConfiguration;
  };
  events: CallEvent[];
  ledSummary?: {
    totalLEDs: number;
    errors: LEDEntry[];
    performance: PerformanceMetrics;
  };
}

interface SessionConfiguration {
  captureMode: 'microphone' | 'full-conversation';
  documentsSelected: string[];
  instructionFile: string;
  ragFile: string;
  ollamaModel: string;
  voskSettings: any;
}

interface PerformanceMetrics {
  avgPromptPipeline: number;
  slowestPrompt: { stageId: string; time: number } | null;
  fastestPrompt: { stageId: string; time: number } | null;
}

export class CallRecordingService {
  private trail: BreadcrumbTrail;
  private sessionId: string = '';
  private startTime: Date | null = null;
  private eventBuffer: CallEvent[] = [];
  private sessionConfig: SessionConfiguration | null = null;
  private saveTimer: NodeJS.Timeout | null = null;
  private recordAllLEDs: boolean = false; // Default: filtered recording

  constructor() {
    this.trail = new BreadcrumbTrail('CallRecordingService');

    // LED 6500: Service initialized
    this.trail.light(6500, {
      operation: 'call_recording_service_init',
      timestamp: Date.now()
    });
  }

  /**
   * Set LED recording mode (filtered vs full)
   */
  setRecordAllLEDs(enabled: boolean): void {
    this.recordAllLEDs = enabled;

    // LED 6505: Recording mode changed
    this.trail.light(6505, {
      operation: 'led_recording_mode_changed',
      recordAllLEDs: enabled,
      mode: enabled ? 'full' : 'filtered',
      timestamp: Date.now()
    });

    console.log(`🎬 LED Recording Mode: ${enabled ? 'FULL (all LEDs)' : 'FILTERED (optimized)'}`);
  }

  /**
   * Start recording a new call session
   */
  startRecording(config: SessionConfiguration): void {
    this.sessionId = this.generateSessionId();
    this.startTime = new Date();
    this.sessionConfig = config;
    this.eventBuffer = [];

    // LED 6510: Recording started
    this.trail.light(6510, {
      operation: 'recording_started',
      sessionId: this.sessionId,
      captureMode: config.captureMode,
      timestamp: Date.now()
    });

    console.log(`📹 Call recording started: ${this.sessionId}`);
  }

  /**
   * Capture transcript event
   */
  captureTranscript(transcript: TranscriptionItem, ledRange?: [number, number]): void {
    const event: CallEvent = {
      type: 'transcript',
      stageId: transcript.stageId || '[unknown]',
      timestamp: new Date(transcript.timestamp).toISOString(),
      data: {
        speaker: transcript.speaker,
        text: transcript.text
      }
    };

    // Capture relevant LED trace
    if (ledRange) {
      event.ledTrace = this.extractLEDTrace(ledRange[0], ledRange[1]);
    }

    this.eventBuffer.push(event);

    // LED 6511: Transcript captured
    this.trail.light(6511, {
      operation: 'transcript_captured',
      stageId: transcript.stageId,
      speaker: transcript.speaker,
      textLength: transcript.text.length,
      ledCount: event.ledTrace?.length || 0,
      timestamp: Date.now()
    });
  }

  /**
   * Capture Ollama generation event
   */
  captureOllamaGeneration(
    stageId: string,
    input: any,
    output: any,
    ledRange?: [number, number]
  ): void {
    const event: CallEvent = {
      type: 'ollama_generation',
      stageId,
      timestamp: new Date().toISOString(),
      data: {
        input,
        output
      }
    };

    // Capture relevant LED trace
    if (ledRange) {
      event.ledTrace = this.extractLEDTrace(ledRange[0], ledRange[1]);

      // Calculate timing from LED trace
      const timing = this.calculateTimingFromLEDs(event.ledTrace);
      if (timing) {
        event.data.timing = timing;
      }
    }

    this.eventBuffer.push(event);

    // LED 6512: Ollama generation captured
    this.trail.light(6512, {
      operation: 'ollama_generation_captured',
      stageId,
      responseTime: output.responseTime,
      ledCount: event.ledTrace?.length || 0,
      timestamp: Date.now()
    });
  }

  /**
   * Capture stage change event
   */
  captureStageChange(stageNumber: number): void {
    const event: CallEvent = {
      type: 'stage_change',
      stageId: `[${stageNumber}]`,
      timestamp: new Date().toISOString(),
      data: {
        stageNumber
      }
    };

    this.eventBuffer.push(event);

    // LED 6513: Stage change captured
    this.trail.light(6513, {
      operation: 'stage_change_captured',
      stageNumber,
      timestamp: Date.now()
    });
  }

  /**
   * Stop recording and save to disk
   */
  async stopRecording(): Promise<boolean> {
    if (!this.startTime || !this.sessionConfig) {
      console.warn('⚠️ No active recording to stop');
      return false;
    }

    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();

    // Build complete call recording
    const recording: CallRecording = {
      session: {
        id: this.sessionId,
        startTime: this.startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration,
        configuration: this.sessionConfig
      },
      events: this.eventBuffer,
      ledSummary: this.buildLEDSummary()
    };

    // LED 6530: Save initiated
    this.trail.light(6530, {
      operation: 'save_call_recording_initiated',
      sessionId: this.sessionId,
      eventCount: this.eventBuffer.length,
      duration,
      timestamp: Date.now()
    });

    try {
      // Save via Electron IPC (async, non-blocking)
      const result = await this.saveToFile(recording);

      if (result) {
        // LED 6531: Save successful
        this.trail.light(6531, {
          operation: 'save_call_recording_success',
          sessionId: this.sessionId,
          filePath: result.filePath,
          fileSize: result.fileSize,
          timestamp: Date.now()
        });

        console.log(`✅ Call recording saved: ${result.filePath}`);

        // Clear buffer
        this.eventBuffer = [];
        this.sessionConfig = null;
        this.startTime = null;

        return true;
      }

      return false;

    } catch (error) {
      // LED 8530: Save failed
      this.trail.fail(8530, error as Error);
      console.error('❌ Failed to save call recording:', error);
      return false;
    }
  }

  /**
   * Extract LED trace from breadcrumb system
   */
  private extractLEDTrace(startLED: number, endLED: number): LEDEntry[] {
    // LED 6520: LED extraction started
    this.trail.light(6520, {
      operation: 'led_trace_extraction_started',
      range: `${startLED}-${endLED}`,
      timestamp: Date.now()
    });

    try {
      // Access breadcrumb system
      const breadcrumbs = (window as any).debug?.breadcrumbs;
      if (!breadcrumbs) {
        console.warn('⚠️ Breadcrumb system not available');
        return [];
      }

      // Get LEDs in range
      const allLEDs = breadcrumbs.getRange(startLED, endLED);

      const ledEntries: LEDEntry[] = allLEDs.map((led: any) => ({
        led: led.id,
        time: new Date(led.timestamp).toISOString(),
        component: led.component,
        operation: led.data?.operation || led.name,
        data: led.data
      }));

      // LED 6521: LED extraction complete
      this.trail.light(6521, {
        operation: 'led_trace_extraction_complete',
        ledCount: ledEntries.length,
        timestamp: Date.now()
      });

      return ledEntries;

    } catch (error) {
      // LED 8510: LED extraction failed
      this.trail.fail(8510, error as Error);
      return [];
    }
  }

  /**
   * Calculate timing breakdown from LED trace
   */
  private calculateTimingFromLEDs(ledTrace: LEDEntry[]): any {
    if (ledTrace.length < 2) return null;

    const timings: any = {};
    let totalTime = 0;

    for (let i = 1; i < ledTrace.length; i++) {
      const prevTime = new Date(ledTrace[i - 1].time).getTime();
      const currTime = new Date(ledTrace[i].time).getTime();
      const duration = currTime - prevTime;

      const operation = ledTrace[i].operation;
      timings[operation] = duration;
      totalTime += duration;
    }

    timings.total = totalTime;
    return timings;
  }

  /**
   * Build LED summary for analysis
   */
  private buildLEDSummary(): any {
    const breadcrumbs = (window as any).debug?.breadcrumbs;
    if (!breadcrumbs) return null;

    const allLEDs = breadcrumbs.getAll();
    const errors = breadcrumbs.getFailures();

    // Calculate performance metrics
    const ollamaEvents = this.eventBuffer.filter(e => e.type === 'ollama_generation');
    const timings = ollamaEvents
      .map(e => e.data.timing?.total || e.data.output?.responseTime || 0)
      .filter(t => t > 0);

    const avgTime = timings.length > 0
      ? timings.reduce((a, b) => a + b, 0) / timings.length
      : 0;

    let slowest = { stageId: '', time: 0 };
    let fastest = { stageId: '', time: Infinity };

    ollamaEvents.forEach(e => {
      const time = e.data.timing?.total || e.data.output?.responseTime || 0;
      if (time > slowest.time) {
        slowest = { stageId: e.stageId, time };
      }
      if (time < fastest.time && time > 0) {
        fastest = { stageId: e.stageId, time };
      }
    });

    // LED Blacklist: High-frequency LEDs that create noise in recordings
    const LED_BLACKLIST = [
      7020,  // WebSocket partial transcripts (fires on every partial)
      9501,  // OLD ScriptProgressTracker analysis start (fires on partials)
      9502,  // OLD ScriptProgressTracker analysis complete
      7257,  // Mic volume update (high frequency)
      7258,  // Tab volume update (high frequency)
      7261,  // Real-time speaker analysis (high frequency)
    ];

    // LED Range Blacklist: Entire ranges of high-frequency UI LEDs
    const LED_RANGE_BLACKLIST = [
      { start: 7200, end: 7264 },  // SalesScriptPanel/Service UI updates (156K LEDs)
    ];

    // Helper function to check if LED is in blacklisted range
    const isInBlacklistedRange = (ledId: number): boolean => {
      return LED_RANGE_BLACKLIST.some(range =>
        ledId >= range.start && ledId <= range.end
      );
    };

    // Build LED list based on recording mode
    let completeLEDList;
    if (this.recordAllLEDs) {
      // FULL MODE: Record everything (development debugging)
      completeLEDList = allLEDs.map((led: any) => ({
        led: led.id,
        time: new Date(led.timestamp).toISOString(),
        component: led.component,
        operation: led.data?.operation || led.name,
        data: led.data
      }));
    } else {
      // FILTERED MODE: Exclude blacklisted LEDs and ranges (production)
      completeLEDList = allLEDs
        .filter((led: any) =>
          !LED_BLACKLIST.includes(led.id) && !isInBlacklistedRange(led.id)
        )
        .map((led: any) => ({
          led: led.id,
          time: new Date(led.timestamp).toISOString(),
          component: led.component,
          operation: led.data?.operation || led.name,
          data: led.data
        }));
    }

    // Group LEDs by component for easier analysis
    const ledsByComponent: { [key: string]: number } = {};
    allLEDs.forEach((led: any) => {
      const component = led.component || 'unknown';
      ledsByComponent[component] = (ledsByComponent[component] || 0) + 1;
    });

    return {
      totalLEDs: allLEDs.length,
      recordedLEDs: completeLEDList.length,
      recordingMode: this.recordAllLEDs ? 'full' : 'filtered',
      completeLEDTrace: completeLEDList,
      ledsByComponent,
      errors: errors.map((e: any) => ({
        led: e.id,
        time: new Date(e.timestamp).toISOString(),
        component: e.component,
        operation: e.data?.operation || e.name,
        error: e.error
      })),
      performance: {
        avgPromptPipeline: Math.round(avgTime),
        slowestPrompt: slowest.time > 0 ? slowest : null,
        fastestPrompt: fastest.time < Infinity ? fastest : null
      }
    };
  }

  /**
   * Save call recording to file via Electron IPC
   */
  private async saveToFile(recording: CallRecording): Promise<any> {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      throw new Error('Electron API not available');
    }

    // Generate file path
    const date = new Date(recording.session.startTime);
    const dateFolder = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
    const fileName = `call-${timeStr}`;
    const folderPath = `Calls/${dateFolder}/${fileName}`;

    // Save via Electron IPC
    const result = await electronAPI.saveCallRecording({
      folderPath,
      fileName: 'call-recording.json',
      data: JSON.stringify(recording, null, 2)
    });

    return result;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    return `${date}_${time}`;
  }
}

// Singleton instance
export const callRecordingService = new CallRecordingService();