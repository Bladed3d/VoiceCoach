/**
 * VoiceCoach V2 - Vosk-Optimized AudioWorklet Processor
 * Direct 16kHz PCM streaming with minimal overhead for maximum performance
 */

class VoskAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // No default - must be configured before use
    this.bufferSize = null;
    this.buffer = null;
    this.bufferIndex = 0;
    this.isConfigured = false;
    
    console.warn('⚠️ AudioWorklet initialized but NOT configured - waiting for buffer size configuration');
    
    this.port.onmessage = (e) => {
      if (e.data === 'START_RECORDING') {
        this.isRecording = true;
        this.port.postMessage({ type: 'RECORDING_STARTED' });
      } else if (e.data === 'STOP_RECORDING') {
        this.isRecording = false;
        // Send any remaining buffered data
        if (this.bufferIndex > 0) {
          this.sendBufferedData();
        }
        this.port.postMessage({ type: 'RECORDING_STOPPED' });
      } else if (e.data.type === 'CONFIGURE') {
        // Update buffer size from config
        if (e.data.bufferSize && e.data.bufferSize > 0) {
          const previousSize = this.bufferSize;
          this.bufferSize = e.data.bufferSize;
          this.buffer = new Float32Array(this.bufferSize);
          this.bufferIndex = 0;
          this.isConfigured = true;
          console.log('✅ LED 7312: AudioWorklet properly configured', {
            previousBufferSize: previousSize,
            newBufferSize: this.bufferSize,
            bufferDurationMs: Math.round(this.bufferSize / 16),
            timestamp: Date.now()
          });
        } else {
          console.error('❌ CONFIGURATION ERROR: Invalid or missing bufferSize:', e.data.bufferSize);
        }
      }
    };
    
    this.isRecording = false;
    this.sampleCount = 0;
    this.processedChunks = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // Check if configured
    if (!this.isConfigured) {
      console.error('❌ AudioWorklet NOT CONFIGURED - cannot process audio! Waiting for buffer size configuration...');
      return true; // Keep alive but don't process
    }
    
    // Only process if recording and have input data
    if (this.isRecording && input && input[0] && input[0].length > 0) {
      const inputChannel = input[0]; // Get first (mono) channel
      
      // Debug log every 100th process call
      if (this.sampleCount % (100 * 128) < 128) {
        console.log('🎙️ AudioWorklet processing:', {
          isRecording: this.isRecording,
          inputLength: inputChannel.length,
          bufferIndex: this.bufferIndex,
          bufferSize: this.bufferSize,
          totalSamples: this.sampleCount,
          chunksProcessed: this.processedChunks
        });
      }
      
      // Add samples to buffer
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex++] = inputChannel[i];
        
        // When buffer is full, send it
        if (this.bufferIndex >= this.bufferSize) {
          console.log('📤 AudioWorklet sending chunk #', this.processedChunks, 'size:', this.bufferSize);
          this.sendBufferedData();
        }
      }
      
      this.sampleCount += inputChannel.length;
    }
    
    return true; // Keep processor alive
  }
  
  sendBufferedData() {
    // Create a copy of the buffered data
    const dataToSend = this.buffer.slice(0, this.bufferIndex);
    
    // Convert Float32Array to Int16Array PCM for Vosk
    const pcmData = this.convertToPCM16(dataToSend);
    
    // Send binary PCM data to main thread
    this.port.postMessage({
      type: 'AUDIO_DATA',
      data: pcmData.buffer,
      sampleCount: this.bufferIndex,
      sampleRate: 16000, // Fixed at 16kHz for Vosk
      chunkIndex: this.processedChunks++
    }, [pcmData.buffer]); // Transfer ownership for performance
    
    // Reset buffer
    this.bufferIndex = 0;
  }
  
  convertToPCM16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] range and convert to 16-bit PCM
      const clampedValue = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = clampedValue * 32767; // Scale to Int16 range
    }
    
    return int16Array;
  }
}

registerProcessor('vosk-audio-processor', VoskAudioProcessor);