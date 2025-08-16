// Tauri API mock for browser mode fallback
// This allows the app to run in both Tauri desktop and browser modes

import { BreadcrumbTrail } from './breadcrumb-system';

const trail = new BreadcrumbTrail('TauriMock');

export interface MockAudioDevice {
  name: string;
  is_input: boolean;
  is_default: boolean;
  sample_rate: number;
  channels: number;
}

export interface MockPerformanceMetrics {
  average_latency_ms: number;
  uptime_seconds: number;
  total_transcriptions: number;
  status: string;
  target_latency_ms: number;
}

// Check if we're running in Tauri context
export const isTauriEnvironment = () => {
  return typeof window !== 'undefined' && window.__TAURI_IPC__ !== undefined;
};

// Mock Tauri invoke function for browser mode
export const mockInvoke = async (command: string, args?: any): Promise<any> => {
  trail.light(950, { 
    mock_api_call: command, 
    args: args ? Object.keys(args) : null,
    mode: 'browser_fallback'
  });
  
  console.log(`🔧 Mock Tauri API call: ${command}`, args);
  
  // Simulate realistic API delays
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  await delay(100 + Math.random() * 300);
  
  switch (command) {
    case 'initialize_voicecoach':
      trail.light(951, { mock_response: 'initialize_voicecoach_success' });
      return "VoiceCoach initialized successfully in browser mode (mock)";
      
    case 'get_audio_devices':
      const mockDevices: MockAudioDevice[] = [
        {
          name: "Default Microphone (Mock)",
          is_input: true,
          is_default: true,
          sample_rate: 44100,
          channels: 1
        },
        {
          name: "Desktop Audio (Mock)",
          is_input: false,
          is_default: true,
          sample_rate: 44100,
          channels: 2
        },
        {
          name: "Headset Microphone (Mock)",
          is_input: true,
          is_default: false,
          sample_rate: 48000,
          channels: 1
        }
      ];
      trail.light(952, { mock_response: 'audio_devices', device_count: mockDevices.length });
      return mockDevices;
      
    case 'start_recording':
      trail.light(953, { mock_response: 'start_recording_success', api: 'web_speech' });
      try {
        const result = await startWebSpeechRecording();
        console.log('🎤 Real voice recognition started!');
        return result;
      } catch (error) {
        console.warn('Web Speech API failed, using mock:', error);
        return "Mock recording started successfully";
      }
      
    case 'stop_recording':
      trail.light(954, { mock_response: 'stop_recording_success', api: 'web_speech' });
      if (webSpeechRecognition) {
        isWebSpeechActive = false; // Prevent auto-restart
        
        // Clear any pending restart timeout
        if (restartTimeout) {
          clearTimeout(restartTimeout);
          restartTimeout = null;
        }
        
        webSpeechRecognition.stop();
        webSpeechRecognition = null;
        console.log('🛑 Real voice recognition stopped!');
        return "Web Speech recording stopped successfully";
      }
      return "Mock recording stopped successfully";
      
    case 'get_audio_levels':
      // Return clean zero levels when not actually recording
      const mockLevels = {
        user: 0, // Clean zero levels 
        prospect: 0, // Clean zero levels
        timestamp: Date.now()
      };
      trail.light(955, { mock_response: 'audio_levels', levels: mockLevels });
      return mockLevels;
      
    case 'get_audio_status':
      // Return clean 'Stopped' status - no random mock errors
      const mockStatus = "Stopped";
      trail.light(956, { mock_response: 'audio_status', status: mockStatus });
      return mockStatus;
      
    case 'get_performance_metrics':
      const mockMetrics: MockPerformanceMetrics = {
        average_latency_ms: 50 + Math.random() * 100,
        uptime_seconds: Math.floor(Date.now() / 1000) % 3600, // Mock uptime
        total_transcriptions: Math.floor(Math.random() * 1000),
        status: "Mock Performance Tracking",
        target_latency_ms: 100
      };
      trail.light(957, { mock_response: 'performance_metrics', metrics: mockMetrics });
      return mockMetrics;
      
    case 'initialize_openrouter_api':
      trail.light(958, { mock_response: 'openrouter_init_success' });
      return "OpenRouter API initialized in mock mode";
      
    case 'generate_ai_coaching_prompt':
      const mockCoachingResponse = {
        primary_suggestion: "Focus on building rapport and understanding their specific challenges",
        confidence_score: 0.85,
        next_best_actions: [
          "Ask about their current pain points",
          "Listen for buying signals",
          "Identify decision-making criteria"
        ],
        context_analysis: {
          stage: "discovery",
          sentiment: "neutral_positive",
          engagement_level: "high"
        }
      };
      trail.light(959, { mock_response: 'coaching_prompt_generated', confidence: mockCoachingResponse.confidence_score });
      return mockCoachingResponse;
      
    case 'test_openrouter_connection':
      trail.light(960, { mock_response: 'openrouter_test_success' });
      return "OpenRouter connection test successful (mock)";
      
    default:
      trail.light(999, { mock_error: 'unknown_command', command });
      throw new Error(`Mock Tauri API: Unknown command '${command}'`);
  }
};

// Web Speech API for browser-based voice testing
let webSpeechRecognition: any = null;
let isWebSpeechActive = false;
let restartTimeout: NodeJS.Timeout | null = null;

const startWebSpeechRecording = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      reject('Web Speech API not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    // Clear any existing recognition
    if (webSpeechRecognition) {
      webSpeechRecognition.stop();
    }
    
    webSpeechRecognition = new SpeechRecognition();
    isWebSpeechActive = true;
    
    webSpeechRecognition.continuous = true;
    webSpeechRecognition.interimResults = true;
    webSpeechRecognition.lang = 'en-US';
    webSpeechRecognition.maxAlternatives = 1;
    
    webSpeechRecognition.onstart = () => {
      trail.light(920, { operation: 'web_speech_started', timestamp: Date.now() });
      console.log('🎤 Web Speech API started successfully');
    };
    
    webSpeechRecognition.onresult = (event: any) => {
      trail.light(921, { 
        operation: 'web_speech_result', 
        result_count: event.results.length,
        result_index: event.resultIndex 
      });
      
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Show interim results immediately (as you speak)
      if (interimTranscript) {
        console.log('🎤 Live transcription (interim):', interimTranscript);
        const interimEvent = new CustomEvent('voiceTranscription', {
          detail: { 
            text: interimTranscript, 
            timestamp: Date.now(), 
            isFinal: false,
            isInterim: true 
          }
        });
        window.dispatchEvent(interimEvent);
      }
      
      // Show final results when speech segment is complete
      if (finalTranscript) {
        console.log('🎤 Voice transcription (final):', finalTranscript);
        const finalEvent = new CustomEvent('voiceTranscription', {
          detail: { 
            text: finalTranscript, 
            timestamp: Date.now(), 
            isFinal: true,
            isInterim: false 
          }
        });
        window.dispatchEvent(finalEvent);
      }
    };
    
    webSpeechRecognition.onerror = (error: any) => {
      trail.fail(922, new Error(`Web Speech error: ${error.error}`));
      console.error('Speech recognition error:', error.error);
      
      // Auto-restart on certain errors (but not others like 'aborted')
      if (isWebSpeechActive && error.error !== 'aborted' && error.error !== 'not-allowed') {
        console.log('🔄 Auto-restarting speech recognition due to error:', error.error);
        restartWebSpeech();
      }
    };
    
    webSpeechRecognition.onend = () => {
      trail.light(923, { operation: 'web_speech_ended', is_active: isWebSpeechActive });
      console.log('🛑 Web Speech API ended');
      
      // Auto-restart if we're supposed to still be recording
      if (isWebSpeechActive) {
        console.log('🔄 Auto-restarting speech recognition after end event');
        restartWebSpeech();
      }
    };
    
    // Function to restart speech recognition
    const restartWebSpeech = () => {
      if (!isWebSpeechActive) return;
      
      // Clear any existing restart timeout
      if (restartTimeout) {
        clearTimeout(restartTimeout);
      }
      
      // Restart after a short delay
      restartTimeout = setTimeout(() => {
        if (isWebSpeechActive && webSpeechRecognition) {
          try {
            trail.light(924, { operation: 'web_speech_restart_attempt' });
            webSpeechRecognition.start();
          } catch (error) {
            console.warn('Failed to restart speech recognition:', error);
            // Try again after longer delay
            setTimeout(() => {
              if (isWebSpeechActive) {
                try {
                  webSpeechRecognition.start();
                } catch (retryError) {
                  console.error('Speech restart failed completely:', retryError);
                }
              }
            }, 2000);
          }
        }
      }, 500);
    };
    
    try {
      webSpeechRecognition.start();
      resolve('Web Speech recording started with auto-restart');
    } catch (error) {
      trail.fail(920, error as Error);
      reject(error);
    }
  });
};

// Smart Tauri invoke wrapper that detects environment
export const smartInvoke = async (command: string, args?: any): Promise<any> => {
  if (isTauriEnvironment()) {
    try {
      // Use real Tauri API
      const { invoke } = await import('@tauri-apps/api/tauri');
      trail.light(900, { 
        real_api_call: command, 
        mode: 'tauri_desktop',
        args: args ? Object.keys(args) : null
      });
      const result = await invoke(command, args);
      trail.light(901, { real_api_success: command, hasResult: !!result });
      return result;
    } catch (error) {
      trail.fail(902, error as Error);
      console.error(`Tauri API call failed for ${command}:`, error);
      // Fall back to mock on Tauri API errors
      console.warn(`Falling back to mock API for ${command}`);
      return mockInvoke(command, args);
    }
  } else {
    // Use mock API in browser mode
    trail.light(903, { fallback_to_mock: command, mode: 'browser' });
    return mockInvoke(command, args);
  }
};

// Environment info for debugging
export const getEnvironmentInfo = () => {
  const info = {
    isTauri: isTauriEnvironment(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    timestamp: new Date().toISOString(),
    windowFeatures: {
      hasTauriIPC: typeof window.__TAURI_IPC__ !== 'undefined',
      hasTauriAPI: typeof window.__TAURI__ !== 'undefined'
    }
  };
  
  trail.light(990, { environment_info: info });
  return info;
};

// Store uploaded knowledge base with persistence
let uploadedKnowledge: any[] = [];

// Load persisted knowledge base on startup
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem('voicecoach_knowledge_base');
    if (stored) {
      uploadedKnowledge = JSON.parse(stored);
      console.log(`📚 Loaded ${uploadedKnowledge.length} documents from storage`);
    }
  } catch (error) {
    console.warn('Failed to load stored knowledge base:', error);
  }
}

// Save knowledge base to localStorage
const saveKnowledgeBase = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('voicecoach_knowledge_base', JSON.stringify(uploadedKnowledge));
      console.log(`💾 Saved ${uploadedKnowledge.length} documents to storage`);
    } catch (error) {
      console.warn('Failed to save knowledge base:', error);
    }
  }
};

// Listen for document uploads
if (typeof window !== 'undefined') {
  window.addEventListener('documentUploaded', (event: CustomEvent) => {
    const { filename, content, chunks } = event.detail;
    
    // Check if document already exists (avoid duplicates)
    const existingIndex = uploadedKnowledge.findIndex(doc => doc.filename === filename);
    if (existingIndex >= 0) {
      // Update existing document
      uploadedKnowledge[existingIndex] = {
        filename,
        content,
        chunks,
        timestamp: Date.now()
      };
      console.log(`📚 Updated existing document: ${filename} (${chunks.length} chunks)`);
    } else {
      // Add new document
      uploadedKnowledge.push({
        filename,
        content,
        chunks,
        timestamp: Date.now()
      });
      console.log(`📚 Added new document: ${filename} (${chunks.length} chunks)`);
    }
    
    // Persist to localStorage
    saveKnowledgeBase();
  });
}

// Ollama local AI integration for real-time coaching
export const generateOllamaCoaching = async (transcriptionText: string): Promise<any> => {
  trail.light(970, { 
    ollama_request: 'coaching_prompt_generation',
    text_length: transcriptionText.length,
    model: 'qwen2.5:14b-instruct-q4_k_m',
    knowledge_docs: uploadedKnowledge.length
  });

  try {
    // Find relevant knowledge from uploaded documents
    let relevantKnowledge = '';
    if (uploadedKnowledge.length > 0) {
      const searchWords = transcriptionText.toLowerCase().split(' ');
      
      for (const doc of uploadedKnowledge) {
        for (const chunk of doc.chunks) {
          const chunkLower = chunk.toLowerCase();
          const relevanceScore = searchWords.filter(word => 
            word.length > 3 && chunkLower.includes(word)
          ).length;
          
          if (relevanceScore > 0) {
            relevantKnowledge += `\n[From ${doc.filename}]: ${chunk}\n`;
          }
        }
      }
    }

    const prompt = `You are an expert sales coach providing real-time guidance based on the user's specific methodology and documents.

UPLOADED KNOWLEDGE BASE:
${relevantKnowledge || 'No specific knowledge loaded - use general best practices'}

CURRENT CONVERSATION:
"${transcriptionText}"

Based on the uploaded documents and this conversation snippet, provide immediate coaching advice that follows the user's specific methodology.

Respond with JSON in this exact format:
{
  "urgency": "high|medium|low",
  "suggestion": "Brief, actionable coaching tip based on uploaded methodology (max 15 words)",
  "reasoning": "Why this matters according to your documents (max 25 words)",
  "next_action": "What to say or do next per your methodology (max 20 words)"
}

Focus on the user's specific approach from their documents. If no relevant knowledge is found, provide general coaching.`;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:14b-instruct-q4_k_m',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          max_tokens: 200
        }
      })
    });

    const data = await response.json();
    const aiResponse = data.response;
    
    // Parse JSON response from AI
    try {
      const coaching = JSON.parse(aiResponse);
      trail.light(971, { 
        ollama_success: 'coaching_generated',
        urgency: coaching.urgency,
        suggestion_length: coaching.suggestion?.length || 0
      });
      
      return {
        type: 'ollama_coaching',
        urgency: coaching.urgency,
        suggestion: coaching.suggestion,
        reasoning: coaching.reasoning,
        next_action: coaching.next_action,
        model: 'qwen2.5:14b',
        latency_ms: data.total_duration ? Math.round(data.total_duration / 1000000) : 0
      };
    } catch (parseError) {
      trail.light(972, { ollama_parse_error: aiResponse });
      // Fallback if JSON parsing fails
      return {
        type: 'ollama_coaching',
        urgency: 'medium',
        suggestion: aiResponse.split('\n')[0] || 'Continue the conversation',
        reasoning: 'AI coaching analysis',
        next_action: 'Listen actively and respond',
        model: 'qwen2.5:14b',
        latency_ms: data.total_duration ? Math.round(data.total_duration / 1000000) : 0
      };
    }
  } catch (error) {
    trail.fail(970, error as Error);
    console.error('Ollama coaching failed:', error);
    return null;
  }
};

// Export function to get stored knowledge base
export const getStoredKnowledgeBase = () => {
  return uploadedKnowledge;
};

// Export function to clear knowledge base
export const clearKnowledgeBase = () => {
  uploadedKnowledge = [];
  if (typeof window !== 'undefined') {
    localStorage.removeItem('voicecoach_knowledge_base');
    console.log('🗑️ Cleared knowledge base');
  }
};

// Add debug commands to window for testing
if (typeof window !== 'undefined') {
  (window as any).voicecoachDebug = {
    getEnvironmentInfo,
    isTauriEnvironment,
    testMockAPI: (command: string, args?: any) => mockInvoke(command, args),
    smartInvoke,
    generateOllamaCoaching, // Add Ollama testing function
    getStoredKnowledgeBase, // Debug: check stored docs
    clearKnowledgeBase // Debug: clear all docs
  };
}