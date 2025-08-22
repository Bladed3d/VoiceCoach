// Deepgram Configuration for WebKit-quality transcription

export const DEEPGRAM_CONFIG = {
  // Get your FREE API key at: https://console.deepgram.com/signup
  // You get $200 in free credits (555+ hours of transcription!)
  apiKey: process.env.REACT_APP_DEEPGRAM_API_KEY || '',
  
  // Set this to true to use Deepgram instead of Vosk
  enabled: true,
  
  // Deepgram gives you:
  // - 99%+ accuracy (same as Google/WebKit)
  // - <300ms latency
  // - Punctuation and formatting
  // - Speaker diarization
  // - Much better than Vosk!
};

export const getTranscriptionMode = () => {
  if (DEEPGRAM_CONFIG.enabled && DEEPGRAM_CONFIG.apiKey) {
    return 'deepgram';
  }
  return 'vosk'; // Fallback to Vosk if no API key
};