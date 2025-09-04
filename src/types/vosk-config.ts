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
    otherPartyGain: number;        // Audio gain for system/other party audio (percentage, 100=normal)
  };
  
  // Transcription Mode Settings
  transcription: {
    mode: 'sentence' | 'phrase' | 'word' | 'hybrid'; // Output mode
    minPhraseWords: number;        // Min words for phrase detection (default: 3)
    enablePartials: boolean;       // Show partial results
    enableWordTimings: boolean;    // Include word timestamps
    setWords: boolean;             // Vosk SetWords parameter (affects accuracy)
    setPartialWords: boolean;      // Vosk SetPartialWords parameter (reduces fragmentation)
  };
  
  // Performance Settings
  performance: {
    debounceMs: number;            // Debounce rapid updates (default: 150)
    maxQueueSize: number;          // Max audio queue size (default: 100)
    cpuThrottling: boolean;        // Reduce CPU usage
    enableRecognizerReset: boolean; // Reset recognizer periodically (default: false)
    recognizerResetInterval: number; // Seconds between resets (default: 30)
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
    channels: 1,
    otherPartyGain: 100
  },
  transcription: {
    mode: 'sentence',
    minPhraseWords: 3,
    enablePartials: true,
    enableWordTimings: false,
    setWords: false,        // Matches your accurate test script
    setPartialWords: true   // Matches your accurate test script
  },
  performance: {
    debounceMs: 150,
    maxQueueSize: 100,
    cpuThrottling: false,
    enableRecognizerReset: false,
    recognizerResetInterval: 30
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
      audio: {
        sampleRate: 16000,
        chunkSize: 512,  // Small chunk for fast phrase detection
        channels: 1,
        otherPartyGain: 100
      },
      transcription: {
        mode: 'phrase' as const,
        minPhraseWords: 2,
        enablePartials: true,
        enableWordTimings: false,
        setWords: false,
        setPartialWords: true
      },
      performance: {
        debounceMs: 100,  // Faster debounce for quick phrases
        enableRecognizerReset: false
      }
    }
  },
  
  completeSentences: {
    name: 'Complete Sentences',
    description: 'Optimized for accuracy - matches test script settings',
    config: {
      silenceDetection: {
        partialTimeout: 2.0,
        sentenceGapThreshold: 0.5,
        minTrailingSilence: 0.5,
        aggressiveEndpointing: false
      },
      audio: {
        sampleRate: 16000,      // Matches test script
        chunkSize: 8000,        // Default chunk size for stability
        channels: 1,             // Mono, matches test script
        otherPartyGain: 100
      },
      transcription: {
        mode: 'sentence' as const,
        minPhraseWords: 3,
        enablePartials: false,   // Only show finals for cleanest output
        enableWordTimings: false, // Matches test script (SetWords=False)
        setWords: false,         // CRITICAL: Matches test script for accuracy
        setPartialWords: true    // CRITICAL: Matches test script to reduce fragmentation
      },
      performance: {
        debounceMs: 150,
        enableRecognizerReset: false,
        maxQueueSize: 100,
        cpuThrottling: false
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
      audio: {
        sampleRate: 16000,
        chunkSize: 256,  // Minimum chunk size for real-time
        channels: 1,
        otherPartyGain: 100
      },
      transcription: {
        mode: 'word' as const,
        minPhraseWords: 1,
        enablePartials: true,
        enableWordTimings: true,
        setWords: true,         // For real-time words, we want timing
        setPartialWords: true
      },
      performance: {
        debounceMs: 50,  // Minimal debounce for real-time
        enableRecognizerReset: false
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
      audio: {
        sampleRate: 16000,
        chunkSize: 2048,  // Balanced chunk size
        channels: 1,
        otherPartyGain: 100
      },
      transcription: {
        mode: 'hybrid' as const,
        minPhraseWords: 3,
        enablePartials: true,
        enableWordTimings: false,
        setWords: false,
        setPartialWords: true
      },
      performance: {
        debounceMs: 120,
        enableRecognizerReset: false
      }
    }
  },

  testScriptOptimized: {
    name: 'Test Script Optimized',
    description: 'Exact settings from your accurate test script',
    config: {
      silenceDetection: {
        partialTimeout: 2.0,
        sentenceGapThreshold: 0.5,
        minTrailingSilence: 0.5,
        aggressiveEndpointing: false
      },
      audio: {
        sampleRate: 16000,      // Exact match to test script
        chunkSize: 8000,        // Using default for stability
        channels: 1,             // Mono audio (explicit in test script)
        otherPartyGain: 100
      },
      transcription: {
        mode: 'sentence' as const,
        minPhraseWords: 3,
        enablePartials: false,   // Show only final results (cleanest)
        enableWordTimings: false, // Disabled in test script
        setWords: false,         // TEST SCRIPT: recognizer.SetWords(False)
        setPartialWords: true    // TEST SCRIPT: recognizer.SetPartialWords(True)
      },
      performance: {
        debounceMs: 150,
        enableRecognizerReset: false,
        maxQueueSize: 100,
        cpuThrottling: false
      }
    }
  }
};