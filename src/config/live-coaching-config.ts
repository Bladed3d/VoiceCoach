/**
 * VoiceCoach V2 - Live Coaching Configuration
 * Based on working backup implementation from 08/22/25
 */
import { LiveCoachingConfig } from '../services/coaching/live-coaching-service';

export const defaultLiveCoachingConfig: LiveCoachingConfig = {
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:14b-instruct-q4_K_M',  // Default only - user selects in UI
    temperature: 0.3,
    topP: 0.9,
    maxTokens: 300
  },
  websocket: {
    serverUrl: 'ws://127.0.0.1:5000'
  },
  coaching: {
    minTranscriptLength: 50,           // Min chars before coaching triggers
    maxHistoryLength: 20,              // Max conversation history items
    enableRealTimeAnalysis: true,      // 🚨 CRITICAL - Enable instant analysis
    debounceMs: 150,                   // Debounce rapid transcripts (150ms)
    useChromaDB: false                 // Enable ChromaDB semantic search (reduces 35KB to 3-5KB prompts)
  }
};

// Export individual configs for testing/debugging
export const ollamaConfig = defaultLiveCoachingConfig.ollama;
export const websocketConfig = defaultLiveCoachingConfig.websocket; 
export const coachingConfig = defaultLiveCoachingConfig.coaching;