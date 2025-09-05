/**
 * VoiceCoach V2 - Vosk-Optimized AudioWorklet Processor
 * Direct 16kHz PCM streaming with minimal overhead for maximum performance
 */

class VoskAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (e) => {
      if (e.data === 'START_RECORDING') {
        this.isRecording = true;
        this.port.postMessage({ type: 'RECORDING_STARTED' });
      } else if (e.data === 'STOP_RECORDING') {
        this.isRecording = false;
        this.port.postMessage({ type: 'RECORDING_STOPPED' });
      }
    };
    
    this.isRecording = false;
    this.sampleCount = 0;
    this.processedChunks = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // Only process if recording and have input data
    if (this.isRecording && input && input[0] && input[0].length > 0) {
      const inputChannel = input[0]; // Get first (mono) channel
      
      // Convert Float32Array to Int16Array PCM for Vosk
      const pcmData = this.convertToPCM16(inputChannel);
      
      // Send binary PCM data to main thread
      this.port.postMessage({
        type: 'AUDIO_DATA',
        data: pcmData.buffer,
        sampleCount: inputChannel.length,
        sampleRate: 16000, // Fixed: Hardcode to 16kHz for now
        chunkIndex: this.processedChunks++
      }, [pcmData.buffer]); // Transfer ownership for performance
      
      this.sampleCount += inputChannel.length;
    }
    
    return true; // Keep processor alive
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