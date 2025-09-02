/**
 * VoiceCoach V2 - Vosk Configuration Types
 * Configurable parameters for real-time transcription optimization
 */

export interface VoskConfig {
  // Silence Detection Settings
  silenceDetection: {
    partialTimeout: number;        // Seconds before partial -> final conversion (default: 2.0)
    sentenceGapThreshold: number;  // Seconds to detect new sentence (default: 0.5)
    minTrailingSilence: number;    // Minimum trailing silence for finals (default: 0.5)
    aggressiveEndpointing: boolean; // Use shorter silence thresholds
  };
  
  // Audio Processing Settings
  audio: {
    sampleRate: number;            // Audio sample rate in Hz (default: 16000)
    chunkSize: number;             // Audio chunk size in samples (default: 8000)
    channels: number;              // Number of channels (default: 1)
  };
  
  // Transcription Mode Settings
  transcription: {
    mode: 'sentence' | 'phrase' | 'word' | 'hybrid'; // Output mode
    minPhraseWords: number;        // Min words for phrase detection (default: 3)
    enablePartials: boolean;       // Show partial results
    enableWordTimings: boolean;    // Include word timestamps
  };
  
  // Performance Settings
  performance: {
    debounceMs: number;            // Debounce rapid updates (default: 150)
    maxQueueSize: number;          // Max audio queue size (default: 100)
    cpuThrottling: boolean;        // Reduce CPU usage
  };
}

export const defaultVoskConfig: VoskConfig = {
  silenceDetection: {
    partialTimeout: 2.0,
    sentenceGapThreshold: 0.5,
    minTrailingSilence: 0.5,
    aggressiveEndpointing: false
  },
  audio: {
    sampleRate: 16000,
    chunkSize: 8000,
    channels: 1
  },
  transcription: {
    mode: 'sentence',
    minPhraseWords: 3,
    enablePartials: true,
    enableWordTimings: false
  },
  performance: {
    debounceMs: 150,
    maxQueueSize: 100,
    cpuThrottling: false
  }
};

// Presets for common use cases
export const voskPresets = {
  fastPhrases: {
    name: 'Fast Phrase Detection',
    description: 'Optimized for quick detection of key phrases like "I\'m concerned" or "too expensive"',
    config: {
      silenceDetection: {
        partialTimeout: 0.8,
        sentenceGapThreshold: 0.3,
        minTrailingSilence: 0.2,
        aggressiveEndpointing: true
      },
      transcription: {
        mode: 'phrase' as const,
        minPhraseWords: 2,
        enablePartials: true,
        enableWordTimings: false
      }
    }
  },
  
  completeSentences: {
    name: 'Complete Sentences',
    description: 'Wait for full sentences with proper punctuation',
    config: {
      silenceDetection: {
        partialTimeout: 2.0,
        sentenceGapThreshold: 0.5,
        minTrailingSilence: 0.5,
        aggressiveEndpointing: false
      },
      transcription: {
        mode: 'sentence' as const,
        minPhraseWords: 5,
        enablePartials: false,
        enableWordTimings: false
      }
    }
  },
  
  realTimeWords: {
    name: 'Real-Time Words',
    description: 'Show words as they are spoken with minimal delay',
    config: {
      silenceDetection: {
        partialTimeout: 0.5,
        sentenceGapThreshold: 0.2,
        minTrailingSilence: 0.1,
        aggressiveEndpointing: true
      },
      transcription: {
        mode: 'word' as const,
        minPhraseWords: 1,
        enablePartials: true,
        enableWordTimings: true
      }
    }
  },
  
  balanced: {
    name: 'Balanced',
    description: 'Good balance between speed and accuracy',
    config: {
      silenceDetection: {
        partialTimeout: 1.2,
        sentenceGapThreshold: 0.4,
        minTrailingSilence: 0.3,
        aggressiveEndpointing: false
      },
      transcription: {
        mode: 'hybrid' as const,
        minPhraseWords: 3,
        enablePartials: true,
        enableWordTimings: false
      }
    }
  }
};