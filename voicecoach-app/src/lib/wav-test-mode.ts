/**
 * WAV File Test Mode - Uses pre-recorded audio for automated testing
 * This allows testing the full audio pipeline without microphone input
 */

export class WavTestMode {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private isPlaying: boolean = false;
  
  /**
   * Load a WAV file for testing
   * @param wavFilePath Path to the WAV file (relative to public folder)
   */
  async loadTestAudio(wavFilePath: string = '/test-audio/sales-call-sample.wav') {
    console.log('🎵 Loading test WAV file:', wavFilePath);
    
    try {
      // Initialize audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Fetch the WAV file
      const response = await fetch(wavFilePath);
      if (!response.ok) {
        throw new Error(`Failed to load WAV file: ${response.statusText}`);
      }
      
      // Convert to array buffer
      const arrayBuffer = await response.arrayBuffer();
      
      // Decode audio data
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      console.log('✅ Test audio loaded:', {
        duration: this.audioBuffer.duration,
        sampleRate: this.audioBuffer.sampleRate,
        channels: this.audioBuffer.numberOfChannels
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to load test audio:', error);
      return false;
    }
  }
  
  /**
   * Play the test audio and pipe it to the recording system
   * This simulates microphone input for testing
   */
  async startTestPlayback(onDataCallback?: (audioData: Float32Array) => void) {
    if (!this.audioContext || !this.audioBuffer) {
      console.error('❌ No test audio loaded');
      return false;
    }
    
    console.log('🎵 Starting test audio playback');
    
    try {
      // Create source node
      this.source = this.audioContext.createBufferSource();
      this.source.buffer = this.audioBuffer;
      
      // Create script processor for capturing audio chunks
      const scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      scriptProcessor.onaudioprocess = (event) => {
        if (this.isPlaying && onDataCallback) {
          const inputData = event.inputBuffer.getChannelData(0);
          onDataCallback(new Float32Array(inputData));
          
          // Simulate LED for audio data flow
          console.log('🔦 LED 4500 [WavTestMode]: Audio chunk processed', {
            size: inputData.length,
            timestamp: Date.now()
          });
        }
      };
      
      // Connect nodes
      this.source.connect(scriptProcessor);
      scriptProcessor.connect(this.audioContext.destination);
      
      // Start playback
      this.source.start(0);
      this.isPlaying = true;
      
      // Handle playback end
      this.source.onended = () => {
        console.log('🎵 Test audio playback completed');
        this.isPlaying = false;
        scriptProcessor.disconnect();
        
        // Fire completion LED
        console.log('🔦 LED 4501 [WavTestMode]: Test audio completed');
      };
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start test playback:', error);
      return false;
    }
  }
  
  /**
   * Stop test playback
   */
  stopTestPlayback() {
    if (this.source && this.isPlaying) {
      console.log('🎵 Stopping test audio playback');
      this.source.stop();
      this.isPlaying = false;
    }
  }
  
  /**
   * Check if test mode is available
   */
  isTestModeAvailable() {
    return this.audioBuffer !== null;
  }
  
  /**
   * Generate a simple test WAV file programmatically
   * Creates a tone sweep for basic testing
   */
  generateTestWav() {
    const sampleRate = 44100;
    const duration = 10; // seconds
    const numSamples = sampleRate * duration;
    
    // Create audio buffer
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const channel = buffer.getChannelData(0);
    
    // Generate tone sweep
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const frequency = 220 + (880 - 220) * (t / duration); // Sweep from 220Hz to 880Hz
      channel[i] = Math.sin(2 * Math.PI * frequency * t) * 0.5;
    }
    
    this.audioBuffer = buffer;
    this.audioContext = audioContext;
    
    console.log('✅ Generated test tone sweep');
    return true;
  }
}

// Global instance for testing
export const wavTestMode = new WavTestMode();

// Auto-enable in test mode
if (typeof window !== 'undefined') {
  (window as any).wavTestMode = wavTestMode;
  
  // Check for test mode URL parameter
  if (window.location.search.includes('wavtest=true')) {
    console.log('🎵 WAV TEST MODE DETECTED - Loading test audio');
    
    // Try to load test WAV file, fall back to generated tone
    wavTestMode.loadTestAudio().then(success => {
      if (!success) {
        console.log('🎵 Generating synthetic test audio');
        wavTestMode.generateTestWav();
      }
    });
  }
}