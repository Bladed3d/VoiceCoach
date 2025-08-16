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
  window.addEventListener('documentUploaded', (event: Event) => {
    const customEvent = event as CustomEvent;
    const { filename, content, chunks } = customEvent.detail;
    
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

// Load core principles for filtering inappropriate suggestions
const loadCorePrinciples = async (): Promise<string> => {
  try {
    const response = await fetch('/docs/Core-Principles.md');
    if (response.ok) {
      return await response.text();
    }
  } catch (error) {
    console.warn('Could not load Core-Principles.md, using default filtering');
  }
  
  // Default fallback principles
  return `
PROHIBITED: Never suggest ending calls, hanging up, wrapping up conversations, or giving up on objections.
FOCUS: Keep conversations going, handle objections constructively, build value and trust, advance the sale.
BLOCK: end the call, hang up, wrap up, say goodbye, conclude, finish the call, close the conversation, terminate, disconnect
  `;
};

// Filter coaching suggestions against core principles
const filterCoachingSuggestion = (suggestion: string, _principles: string): { allowed: boolean; replacement?: string } => {
  const suggestionLower = suggestion.toLowerCase();
  // const principlesLower = principles.toLowerCase(); // Not used in this implementation
  
  // Check for prohibited phrases
  const blockedPhrases = [
    'end the call', 'hang up', 'wrap up', 'say goodbye', 'conclude the conversation',
    'finish the call', 'close the conversation', 'terminate', 'disconnect',
    'end on a high note', 'close positively'
  ];
  
  for (const phrase of blockedPhrases) {
    if (suggestionLower.includes(phrase)) {
      return {
        allowed: false,
        replacement: 'Ask deeper discovery questions to understand their specific needs and concerns'
      };
    }
  }
  
  return { allowed: true };
};

// Conversation context tracking for better coaching
let conversationHistory: string[] = [];
const MAX_CONTEXT_MESSAGES = 5; // Keep last 5 messages for context

// Add message to conversation context
const addToConversationContext = (text: string) => {
  conversationHistory.push(text);
  if (conversationHistory.length > MAX_CONTEXT_MESSAGES) {
    conversationHistory = conversationHistory.slice(-MAX_CONTEXT_MESSAGES);
  }
};

// Get conversation context for AI
const getConversationContext = () => {
  return conversationHistory.join(' ... ');
};

// Intelligent prompt compression to prevent Ollama truncation
interface PromptData {
  corePrinciples: string;
  relevantKnowledge: string;
  contextualExamples: string;
  conversationContextForPrompt: string;
  transcriptionText: string;
  detectedStage: string;
}

const buildOptimizedPrompt = (data: PromptData): string => {
  const OLLAMA_MAX_CHARS = 3800; // Leave buffer for 4096 token limit
  
  // Compress core principles to essential points only
  const compressedPrinciples = `NEVER suggest: ending calls, hanging up, wrapping up, giving up on objections.
ALWAYS: keep conversations going, handle objections constructively, advance the sale.`;

  // Stage-specific knowledge filtering for proactive coaching
  const stageGuidance = getStageSpecificGuidance(data.detectedStage, data.relevantKnowledge);
  
  // Smart knowledge compression - prioritize most relevant chunks
  const compressedKnowledge = compressKnowledgeBase(data.relevantKnowledge, 800);
  
  // Prioritize recent conversation context (last 2 messages instead of 5)
  const recentContext = getRecentContext(data.conversationContextForPrompt, 2);
  
  // Build stage-aware contextual examples
  const relevantExamples = getStageExamples(data.detectedStage, data.contextualExamples);
  
  const basePrompt = `Expert sales coach providing proactive guidance for ${data.detectedStage || 'ongoing'} stage conversation.

PRINCIPLES: ${compressedPrinciples}

STAGE GUIDANCE: ${stageGuidance}

KNOWLEDGE: ${compressedKnowledge || 'Use Chris Voss negotiation techniques'}

EXAMPLES: ${relevantExamples}

CONTEXT: ${recentContext}

LATEST: "${data.transcriptionText}"

Provide PROACTIVE next-step coaching (not reactive commentary). Focus on where to guide the conversation next.

JSON format:
{
  "urgency": "high|medium|low",
  "suggestion": "Proactive next step guidance (max 25 words)",
  "reasoning": "Why this advances the conversation (max 20 words)",
  "next_action": "Specific question or statement to say next (max 25 words)"
}`;

  // Ensure prompt fits within limit
  if (basePrompt.length > OLLAMA_MAX_CHARS) {
    return buildMinimalPrompt(data);
  }
  
  return basePrompt;
};

// Stage-specific guidance for proactive coaching
const getStageSpecificGuidance = (stage: string, _knowledge: string): string => {
  const stageGuides = {
    discovery: "Ask deeper questions to uncover needs, pain points, and decision criteria.",
    presentation: "Position solutions to specific needs mentioned. Build value and urgency.",
    objection: "Explore concerns deeper. Use 'That's exactly why...' technique.",
    closing: "Guide toward commitment. Ask for next steps or decision timeline.",
    unknown: "Identify current conversation stage through strategic questions."
  };
  
  return stageGuides[stage as keyof typeof stageGuides] || stageGuides.unknown;
};

// Compress knowledge base while preserving key techniques
const compressKnowledgeBase = (knowledge: string, maxChars: number): string => {
  if (!knowledge || knowledge.length <= maxChars) return knowledge;
  
  // Prioritize Chris Voss techniques and specific examples
  const keyPhrases = [
    "That's exactly why",
    "How am I supposed to",
    "What would need to happen",
    "calibrated question",
    "tactical empathy",
    "mirroring",
    "labeling"
  ];
  
  const sentences = knowledge.split('. ');
  const prioritized = sentences.filter(sentence => 
    keyPhrases.some(phrase => sentence.toLowerCase().includes(phrase.toLowerCase()))
  );
  
  const compressed = prioritized.slice(0, 3).join('. ');
  return compressed.length > maxChars ? compressed.substring(0, maxChars) + '...' : compressed;
};

// Get recent context (last N messages)
const getRecentContext = (fullContext: string, messageCount: number): string => {
  const messages = fullContext.split(' ... ');
  const recent = messages.slice(-messageCount);
  return recent.join(' ... ');
};

// Get stage-appropriate examples
const getStageExamples = (stage: string, examples: string): string => {
  if (!examples) return "";
  
  const stageKeywords = {
    discovery: ['understand', 'explore', 'tell me'],
    presentation: ['solution', 'recommend', 'offer'],
    objection: ['concern', 'but', 'however'],
    closing: ['ready', 'next steps', 'move forward']
  };
  
  const keywords = stageKeywords[stage as keyof typeof stageKeywords] || [];
  if (keywords.length === 0) return examples.substring(0, 200);
  
  // Find examples relevant to current stage
  const relevant = examples.split('\n').filter(line => 
    keywords.some(keyword => line.toLowerCase().includes(keyword))
  );
  
  return relevant.slice(0, 2).join('\n') || examples.substring(0, 200);
};

// Minimal prompt if compression fails
const buildMinimalPrompt = (data: PromptData): string => {
  return `Sales coach for ${data.detectedStage || 'conversation'}.

RULES: Never suggest ending calls. Always advance the sale.

LATEST: "${data.transcriptionText}"

Provide proactive next step:
{
  "urgency": "high|medium|low",
  "suggestion": "Next step guidance (max 20 words)",
  "reasoning": "Why this helps (max 15 words)",
  "next_action": "What to say next (max 20 words)"
}`;
};

// Ollama local AI integration for real-time coaching
export const generateOllamaCoaching = async (transcriptionText: string): Promise<any> => {
  // Start LED 100: Audio Input Processing
  const startTime = Date.now();
  trail.light(100, { 
    audio_input: 'transcription_received',
    text_length: transcriptionText.length,
    timestamp: new Date().toISOString(),
    is_empty: transcriptionText.trim().length === 0
  });

  // Add current message to context
  addToConversationContext(transcriptionText);
  
  // LED 200: Context Building Start
  const contextStart = Date.now();
  const conversationContext = getConversationContext();
  trail.light(200, { 
    context_building: 'conversation_history_assembly',
    context_length: conversationContext.length,
    model: 'qwen2.5:14b-instruct-q4_k_m',
    knowledge_docs_available: uploadedKnowledge.length
  });

  try {
    // LED 201: Core Principles Loading
    const corePrinciples = await loadCorePrinciples();
    trail.light(201, {
      core_principles: 'loaded',
      principles_length: corePrinciples.length
    });

    // LED 300: Knowledge Retrieval Start
    trail.light(300, {
      knowledge_retrieval: 'starting',
      total_docs: uploadedKnowledge.length,
      search_terms: transcriptionText.toLowerCase().split(' ').length
    });

    // Find relevant knowledge from uploaded documents with enhanced contextual matching
    let relevantKnowledge = '';
    let contextualExamples = '';
    let relevantChunksCount = 0;
    let enabledDocsCount = 0;
    let totalRelevanceScore = 0;
    
    if (uploadedKnowledge.length > 0) {
      const searchWords = transcriptionText.toLowerCase().split(' ');
      const conversationContextLower = conversationContext.toLowerCase();
      
      // LED 301: Document Filtering
      const enabledDocs = uploadedKnowledge.filter((_doc, index) => {
        const checkbox = document.querySelector(`#use-file-${index}`) as HTMLInputElement;
        return checkbox ? checkbox.checked : true; // Default to enabled if checkbox not found
      });
      enabledDocsCount = enabledDocs.length;
      
      trail.light(301, {
        document_filtering: 'complete',
        enabled_docs: enabledDocsCount,
        total_docs: uploadedKnowledge.length,
        filter_ratio: enabledDocsCount / uploadedKnowledge.length
      });
      
      console.log(`📚 Using ${enabledDocsCount} of ${uploadedKnowledge.length} documents for coaching`);
      
      // LED 302: Knowledge Processing Start
      trail.light(302, {
        knowledge_processing: 'chunk_analysis_start',
        enabled_docs: enabledDocsCount
      });

      for (const doc of enabledDocs) {
        // Look for contextual examples in the document
        if (doc.content.includes('contextual_examples')) {
          try {
            const docContent = JSON.parse(doc.content);
            if (docContent.contextual_examples) {
              // Find matching contextual examples based on conversation keywords
              for (const [topic, example] of Object.entries(docContent.contextual_examples)) {
                if (conversationContextLower.includes(topic.replace('_', ' ')) || 
                    transcriptionText.toLowerCase().includes(topic.replace('_', ' '))) {
                  contextualExamples += `\nCONTEXTUAL SUGGESTION for "${topic}": ${example}\n`;
                }
              }
            }
          } catch (e) {
            // Not JSON, continue with regular processing
            trail.light(303, {
              contextual_parsing: 'json_parse_failed',
              document: doc.filename,
              error: e instanceof Error ? e.message : 'Unknown error'
            });
          }
        }
        
        // Regular chunk processing for relevance
        for (const chunk of doc.chunks) {
          const chunkLower = chunk.toLowerCase();
          const relevanceScore = searchWords.filter(word => 
            word.length > 3 && chunkLower.includes(word)
          ).length;
          
          if (relevanceScore > 0) {
            relevantKnowledge += `\n[From ${doc.filename}]: ${chunk}\n`;
            relevantChunksCount++;
            totalRelevanceScore += relevanceScore;
          }
        }
      }

      // LED 304: Knowledge Processing Complete
      trail.light(304, {
        knowledge_processing: 'complete',
        relevant_chunks: relevantChunksCount,
        contextual_examples: contextualExamples.length,
        total_relevance_score: totalRelevanceScore,
        avg_relevance: relevantChunksCount > 0 ? totalRelevanceScore / relevantChunksCount : 0
      });
    } else {
      // LED 305: No Knowledge Base Available
      trail.light(305, {
        knowledge_processing: 'no_knowledge_base',
        fallback_mode: 'general_best_practices'
      });
    }

    // LED 402: Conversation Stage Detection (moved before prompt construction)
    const conversationContextForPrompt = getConversationContext();
    const stageKeywords = {
      discovery: ['tell me', 'explain', 'understand', 'how does', 'what is', 'help me understand'],
      presentation: ['solution', 'proposal', 'recommend', 'suggest', 'here\'s how', 'what we offer'],
      objection: ['but', 'however', 'concern', 'worried', 'not sure', 'problem with'],
      closing: ['ready', 'move forward', 'next steps', 'start', 'begin', 'sign up']
    };
    
    const detectedStage = Object.entries(stageKeywords).find(([_stage, keywords]) => 
      keywords.some(keyword => transcriptionText.toLowerCase().includes(keyword) || 
                             conversationContextForPrompt.toLowerCase().includes(keyword))
    )?.[0] || 'unknown';
    
    trail.light(402, {
      conversation_stage: 'detected',
      stage: detectedStage,
      context_analysis: 'complete',
      proactive_opportunity: detectedStage !== 'unknown' ? `stage_${detectedStage}_detected` : 'stage_unclear'
    });

    // LED 400: Prompt Construction Start
    const promptStart = Date.now();
    
    // Smart prompt compression to prevent Ollama truncation
    const compressedPrompt = buildOptimizedPrompt({
      corePrinciples,
      relevantKnowledge,
      contextualExamples,
      conversationContextForPrompt,
      transcriptionText,
      detectedStage
    });
    
    const prompt = compressedPrompt;

    // LED 401: Prompt Size Analysis (CRITICAL for truncation detection)
    const promptSizeBytes = new TextEncoder().encode(prompt).length;
    const promptSizeChars = prompt.length;
    const ollamaMaxTokens = 4096; // Typical Ollama context limit
    const estimatedTokens = Math.ceil(promptSizeChars / 4); // Rough token estimation
    
    // Calculate compression effectiveness
    const originalEstimate = Math.ceil((corePrinciples.length + relevantKnowledge.length + contextualExamples.length + conversationContextForPrompt.length + transcriptionText.length + 2000) / 4);
    const compressionRatio = originalEstimate > 0 ? (estimatedTokens / originalEstimate) : 1;
    const compressionEffective = estimatedTokens <= ollamaMaxTokens;
    
    trail.light(401, {
      prompt_construction: 'complete',
      prompt_size_chars: promptSizeChars,
      prompt_size_bytes: promptSizeBytes,
      estimated_tokens: estimatedTokens,
      original_estimated_tokens: originalEstimate,
      compression_ratio: compressionRatio,
      compression_effective: compressionEffective,
      ollama_max_tokens: ollamaMaxTokens,
      size_warning: estimatedTokens > ollamaMaxTokens ? 'PROMPT_TOO_LARGE' : 'COMPRESSION_SUCCESS',
      truncation_risk: estimatedTokens > ollamaMaxTokens,
      proactive_coaching_enabled: detectedStage !== 'unknown',
      stage_detected: detectedStage,
      construction_time_ms: Date.now() - promptStart
    });


    // LED 500: Ollama Request Start
    const requestStart = Date.now();
    trail.light(500, {
      ollama_request: 'starting',
      endpoint: 'http://localhost:11434/api/generate',
      model: 'qwen2.5:14b-instruct-q4_k_m',
      stream_mode: false,
      temperature: 0.3,
      max_tokens: 300
    });

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
          num_predict: 300 // Increased for contextual suggestions
        }
      })
    });

    // LED 501: Ollama Response Timing
    const requestEndTime = Date.now();
    const requestDuration = requestEndTime - requestStart;
    
    if (!response.ok) {
      trail.fail(500, new Error(`Ollama request failed: ${response.status} ${response.statusText}`));
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.response;
    
    trail.light(501, {
      ollama_response: 'received',
      request_duration_ms: requestDuration,
      response_length: aiResponse?.length || 0,
      total_duration_ns: data.total_duration,
      load_duration_ns: data.load_duration,
      prompt_eval_count: data.prompt_eval_count,
      prompt_eval_duration_ns: data.prompt_eval_duration,
      eval_count: data.eval_count,
      eval_duration_ns: data.eval_duration,
      performance_warning: requestDuration > 5000 ? 'SLOW_RESPONSE' : 'normal_speed'
    });
    
    // LED 502: Response Processing Start
    // const processingStart = Date.now(); // Not used in current implementation
    trail.light(502, {
      response_processing: 'starting',
      raw_response_length: aiResponse?.length || 0,
      response_preview: aiResponse?.substring(0, 100) || 'empty_response'
    });

    // Parse JSON response from AI
    try {
      // LED 503: JSON Parsing
      const coaching = JSON.parse(aiResponse);
      trail.light(503, {
        json_parsing: 'success',
        coaching_fields: Object.keys(coaching),
        urgency: coaching.urgency,
        suggestion_preview: coaching.suggestion?.substring(0, 50) || 'no_suggestion'
      });
      
      // LED 504: Suggestion Quality Analysis
      const suggestionQuality = {
        has_specific_action: coaching.next_action?.length > 10,
        has_context: coaching.suggestion?.includes(transcriptionText.split(' ')[0]) || false,
        is_proactive: !coaching.suggestion?.toLowerCase().includes('continue') && 
                     !coaching.suggestion?.toLowerCase().includes('listen'),
        word_count: coaching.suggestion?.split(' ').length || 0
      };
      
      trail.light(504, {
        suggestion_quality: 'analyzed',
        quality_metrics: suggestionQuality,
        is_proactive: suggestionQuality.is_proactive,
        quality_score: Object.values(suggestionQuality).filter(Boolean).length / 4
      });

      // LED 505: Core Principles Filtering
      const filterStart = Date.now();
      const filterResult = filterCoachingSuggestion(coaching.suggestion, corePrinciples);
      
      trail.light(505, {
        core_principles_filter: 'complete',
        filter_allowed: filterResult.allowed,
        filter_duration_ms: Date.now() - filterStart,
        original_suggestion_length: coaching.suggestion?.length || 0
      });
      
      if (!filterResult.allowed) {
        // LED 506: Suggestion Replacement
        coaching.suggestion = filterResult.replacement || 'Ask discovery questions to understand their needs better';
        coaching.reasoning = 'Filtered inappropriate suggestion - keeping conversation focused on sales objectives';
        trail.light(506, { 
          suggestion_replacement: 'applied',
          original_suggestion: coaching.suggestion,
          replacement: filterResult.replacement,
          reason: 'core_principles_violation'
        });
      }

      // LED 600: Final Coaching Output
      const totalDuration = Date.now() - startTime;
      const finalCoaching = {
        type: 'ollama_coaching',
        urgency: coaching.urgency,
        suggestion: coaching.suggestion,
        reasoning: coaching.reasoning,
        next_action: coaching.next_action,
        model: 'qwen2.5:14b',
        latency_ms: data.total_duration ? Math.round(data.total_duration / 1000000) : 0
      };
      
      trail.light(600, { 
        coaching_generation: 'complete',
        urgency: coaching.urgency,
        suggestion_length: coaching.suggestion?.length || 0,
        filtered: !filterResult.allowed,
        total_pipeline_duration_ms: totalDuration,
        context_building_time: contextStart ? Date.now() - contextStart : 0,
        knowledge_chunks_used: relevantChunksCount,
        suggestion_type: suggestionQuality.is_proactive ? 'proactive' : 'reactive',
        stage_detected: detectedStage,
        final_output: 'ready_for_ui'
      });
      
      return finalCoaching;
      
    } catch (parseError) {
      // LED 507: JSON Parse Failure
      trail.light(507, { 
        json_parse_error: 'failed',
        raw_response: aiResponse?.substring(0, 200) || 'no_response',
        error_message: parseError instanceof Error ? parseError.message : 'unknown_parse_error',
        fallback_mode: 'plain_text_processing'
      });
      
      // LED 508: Fallback Processing
      const fallbackSuggestion = aiResponse?.split('\n')[0] || 'Continue the conversation';
      trail.light(508, {
        fallback_processing: 'complete',
        fallback_suggestion: fallbackSuggestion.substring(0, 50),
        total_duration_ms: Date.now() - startTime
      });
      
      return {
        type: 'ollama_coaching',
        urgency: 'medium',
        suggestion: fallbackSuggestion,
        reasoning: 'AI coaching analysis (fallback mode)',
        next_action: 'Listen actively and respond',
        model: 'qwen2.5:14b',
        latency_ms: data.total_duration ? Math.round(data.total_duration / 1000000) : 0
      };
    }
  } catch (error) {
    // LED 100 failure: Complete Pipeline Failure
    const errorDetails = {
      error_type: error instanceof Error ? error.constructor.name : 'unknown',
      error_message: error instanceof Error ? error.message : 'unknown_error',
      error_stack: error instanceof Error ? error.stack?.substring(0, 200) : 'no_stack',
      pipeline_stage: 'unknown',
      total_duration_ms: Date.now() - startTime
    };
    
    trail.fail(100, error as Error);
    console.error('Ollama coaching pipeline failed:', errorDetails);
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