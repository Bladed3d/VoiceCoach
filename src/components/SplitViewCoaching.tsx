/**
 * VoiceCoach V2 - Split View Coaching Component (Modular)
 * Main UI orchestrator following strict modular architecture
 * < 200 lines (orchestration only, no business logic)
 */
import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  Layout, 
  Clock, 
  Target, 
  Brain, 
  Users, 
  Zap, 
  Award,
  ChevronDown,
  Settings,
  Database,
  BarChart3,
  TrendingUp
} from 'lucide-react';

// Modular imports
import { useCoachingSession } from '../hooks/useCoachingSession';
import { useResizablePanels } from '../hooks/useResizablePanels';
import { useSalesScript } from '../hooks/useSalesScript';
// import { useMEFSTracking } from '../hooks/useMEFSTracking';
import { DualVolumeIndicator } from './common/DualVolumeIndicator';
import { CoachingPanel } from './coaching/CoachingPanel';
import { SalesScriptPanel } from './coaching/SalesScriptPanel';
import { TranscriptionPanel } from './coaching/TranscriptionPanel';
import { CollapsedPanel } from './common/CollapsedPanel';
import { KnowledgeBaseHub } from './KnowledgeBaseHub';
import SettingsModal from './modals/SettingsModal';
import DocumentSelectorModal from './modals/DocumentSelectorModal';
// import MEFSIndicators from './coaching/MEFSIndicators';
import { AudioCaptureSelector, AudioCaptureMode } from './coaching/AudioCaptureSelector';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

interface SplitViewCoachingProps {
  onNewDocument?: () => void;
  insights?: any;
}

const SplitViewCoaching: React.FC<SplitViewCoachingProps> = () => {
  const trail = new BreadcrumbTrail('SplitViewCoaching');
  
  // Modular session management
  const { sessionState, isInitialized, conversationHistory, startSession, stopSession, clearTranscriptions, clearCoachingPrompts, getSessionManager } = useCoachingSession();
  
  // Resizable panels management
  const {
    scriptPanel,
    transcriptionPanel,
    isDragging,
    toggleScriptPanel,
    toggleTranscriptionPanel,
    toggleScriptVisibility,
    toggleTranscriptionVisibility,
    startResize,
    getScriptWidth,
    getTranscriptionWidth
  } = useResizablePanels();
  
  // Sales script management
  const { scriptItems, markItemUsed, clearUsedItems } = useSalesScript();

  // MEFS tracking for real-time sentiment analysis (disabled for cleanup)
  // const mefsTracking = useMEFSTracking();
  
  // Local UI state only
  const [showKnowledgeBaseHub, setShowKnowledgeBaseHub] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [useChromaDB, setUseChromaDB] = useState(() => {
    // Load saved preference
    return localStorage.getItem('voicecoach-use-chromadb') === 'true';
  });
  const [currentView, setCurrentView] = useState('Split View');
  const [audioCaptureMode, setAudioCaptureMode] = useState<AudioCaptureMode>('full-conversation');
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [currentScriptStage, setCurrentScriptStage] = useState<number>(1);
  
  // Model selection state - synchronized with Settings
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState(() => {
    // Load model from settings first, same as Settings modal
    const savedSettings = localStorage.getItem('voicecoach-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        return settings.ollama?.model || 'qwen2.5:14b-instruct-q4_k_m';
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
    return 'qwen2.5:14b-instruct-q4_k_m'; // Same default as Settings modal
  });
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  
  // MEFS tracking integration - process conversation updates (disabled - causing crashes)
  // React.useEffect(() => {
  //   try {
  //     if (conversationHistory?.length > 0 && isRecording && mefsTracking && typeof mefsTracking.processConversationEntry === 'function') {
  //       const latestEntry = conversationHistory[conversationHistory.length - 1];
  //       if (latestEntry?.speaker && latestEntry?.text) {
  //         // Process the latest conversation entry through MEFS analysis
  //         mefsTracking.processConversationEntry(latestEntry.speaker, latestEntry.text, conversationHistory);
  //       }
  //     }
  //   } catch (error) {
  //     console.error('MEFS processing error:', error);
  //   }
  // }, [conversationHistory, isRecording, mefsTracking]);

  // Start/stop MEFS tracking with recording (disabled for debugging)
  // React.useEffect(() => {
  //   try {
  //     if (mefsTracking && typeof mefsTracking.startTracking === 'function') {
  //       if (isRecording) {
  //         mefsTracking.startTracking();
  //       } else if (typeof mefsTracking.stopTracking === 'function') {
  //         mefsTracking.stopTracking();
  //       }
  //     }
  //   } catch (error) {
  //     console.error('MEFS tracking control error:', error);
  //   }
  // }, [isRecording, mefsTracking]);

  // Component lifecycle and microphone change event tracking
  React.useEffect(() => {
    trail.light(7107, {
      component_mount: 'SplitViewCoaching',
      initial_state: {
        view: currentView,
        audio_mode: audioCaptureMode,
        modals_closed: true
      }
    });
    
    // Enhanced audio mode change event listener
    const handleAudioModeChange = (event: CustomEvent) => {
      const { mode } = event.detail;
      trail.light(7108, {
        audio_mode_event: 'external_change_detected',
        from_mode: audioCaptureMode,
        to_mode: mode,
        source: 'settings_modal'
      });
      
      setAudioCaptureMode(mode === 'full-conversation' ? 'full-conversation' : 'microphone');
      
      trail.light(7109, {
        audio_mode_update: 'ui_synchronized',
        new_mode: mode
      });
    };
    
    // Handle model changes from Settings modal
    const handleModelChangeEvent = (event: CustomEvent) => {
      const { model, source } = event.detail;
      if (source === 'settings' && model !== selectedModel) {
        trail.light(7123, {
          model_sync: 'settings_to_splitview',
          old_model: selectedModel,
          new_model: model
        });
        setSelectedModel(model);
        console.log('🔄 Model synchronized from Settings to SplitView:', model);
      }
    };

    window.addEventListener('audioModeChanged', handleAudioModeChange as EventListener);
    window.addEventListener('modelChanged', handleModelChangeEvent as EventListener);

    return () => {
      trail.light(7110, { component_unmount: 'SplitViewCoaching' });
      window.removeEventListener('audioModeChanged', handleAudioModeChange as EventListener);
      window.removeEventListener('modelChanged', handleModelChangeEvent as EventListener);
    };
  }, []);
  
  // Settings modal state tracking
  React.useEffect(() => {
    if (showSettingsModal) {
      trail.light(7111, {
        modal_state: 'settings_opened',
        trigger: 'user_interaction',
        app_state: {
          recording: sessionState?.isRecording || false,
          connected: sessionState?.wsStatus === 'Connected'
        }
      });
    } else {
      trail.light(7112, { modal_state: 'settings_closed' });
    }
  }, [showSettingsModal]);
  
  // Knowledge Base Hub state tracking  
  React.useEffect(() => {
    if (showKnowledgeBaseHub) {
      trail.light(7113, { modal_state: 'knowledge_base_opened' });
    } else {
      trail.light(7114, { modal_state: 'knowledge_base_closed' });
    }
  }, [showKnowledgeBaseHub]);
  
  // Load persisted document selection
  React.useEffect(() => {
    const savedDocs = localStorage.getItem('voicecoach-selected-documents');
    if (savedDocs) {
      try {
        const docs = JSON.parse(savedDocs);
        // Filter out any invalid or duplicate entries
        const validDocs = Array.from(new Set(docs.filter((doc: string) => doc && doc.length > 0)));
        setSelectedDocuments(validDocs);
        
        // Update localStorage if we cleaned up the data
        if (validDocs.length !== docs.length) {
          localStorage.setItem('voicecoach-selected-documents', JSON.stringify(validDocs));
          console.log(`🧹 Cleaned up document selection: ${docs.length} -> ${validDocs.length} documents`);
        }
        
        trail.light(7208, {
          operation: 'loaded_saved_documents',
          original_count: docs.length,
          cleaned_count: validDocs.length,
          documents: validDocs
        });
      } catch (error) {
        console.error('Failed to load saved documents:', error);
        // Clear invalid data
        localStorage.removeItem('voicecoach-selected-documents');
        setSelectedDocuments([]);
      }
    }
  }, []);

  // Track conversationHistory updates for debugging sentiment graph
  React.useEffect(() => {
    trail.light(7240, {
      operation: 'conversation_history_updated',
      historyLength: conversationHistory.length,
      isRecording: sessionState?.isRecording || false,
      latestSpeaker: conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1]?.speaker : 'none',
      latestTextLength: conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1]?.text?.length : 0
    });
  }, [conversationHistory]);

  // Load models from app startup cache on component mount
  React.useEffect(() => {
    const loadCachedModels = () => {
      try {
        // Load from localStorage cache populated at app startup
        const cachedModels = localStorage.getItem('voicecoach-ollama-models');
        
        if (cachedModels) {
          const models = JSON.parse(cachedModels);
          setAvailableModels(models);
          
          trail.light(7120, {
            model_load: 'from_cache',
            models_count: models.length
          });
          
          // The model is already set from settings in the state initialization
          // Just verify it exists in available models
          if (!models.some((m: any) => m.name === selectedModel) && models.length > 0) {
            // If selected model doesn't exist, update to first available
            const firstModel = models[0].name;
            setSelectedModel(firstModel);
            
            // Also update settings to keep in sync
            handleModelChange(firstModel);
          }
        } else {
          trail.light(7121, {
            model_load: 'no_cache_found',
            note: 'Models should be loaded at app startup'
          });
        }
      } catch (error) {
        console.error('Error loading cached models:', error);
        trail.fail(8120, error as Error);
      }
    };
    
    loadCachedModels();
  }, []);
  
  // Handle model selection changes - sync with Settings
  const handleModelChange = async (modelName: string) => {
    trail.light(7122, {
      model_change: 'user_selection',
      from_model: selectedModel,
      to_model: modelName
    });
    
    setSelectedModel(modelName);
    setShowModelDropdown(false);
    
    // Update the settings structure to sync with Settings modal
    const savedSettings = localStorage.getItem('voicecoach-settings');
    let settings = {};
    if (savedSettings) {
      try {
        settings = JSON.parse(savedSettings);
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
    
    // Update the Ollama model in settings
    const updatedSettings = {
      ...settings,
      ollama: {
        ...(settings as any).ollama,
        model: modelName
      }
    };
    
    localStorage.setItem('voicecoach-settings', JSON.stringify(updatedSettings));
    console.log('✅ Model synchronized with Settings:', modelName);

    // Dispatch event to notify Settings modal (if it's open)
    window.dispatchEvent(new CustomEvent('modelChanged', {
      detail: { model: modelName, source: 'splitview' }
    }));
    
    // Update the Ollama service configuration with the new model
    try {
      // Access the LiveCoachingManager through SessionManager
      const liveCoachingManager = sessionManager?.getLiveCoachingManager();
      if (liveCoachingManager) {
        // Get the LiveCoachingService
        const liveCoachingService = liveCoachingManager.getService();
        if (liveCoachingService) {
          // Access the OllamaService through the LiveCoachingService
          const ollamaService = (liveCoachingService as any).ollamaService;
          if (ollamaService && ollamaService.updateConfig) {
            ollamaService.updateConfig({ model: modelName });
            
            trail.light(7124, {
              ollama_config_updated: modelName,
              service_updated: true,
              timestamp: Date.now()
            });
            
            console.log(`✅ Ollama service updated to use model: ${modelName}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to update Ollama service configuration:', error);
      trail.fail(8122, error as Error);
    }
    
    // Pull the model if not already present
    try {
      const response = await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });
      
      if (response.ok) {
        trail.light(7125, {
          model_pull_started: modelName,
          timestamp: Date.now()
        });
        console.log(`📥 Pulling model: ${modelName}`);
      }
    } catch (error) {
      console.error('Failed to pull model:', error);
    }
    
    // Preload model into memory for faster coaching responses
    try {
      console.log(`🔥 Preloading model into memory: ${modelName}`);
      trail.light(7126, {
        model_preload_started: modelName,
        timestamp: Date.now()
      });

      const preloadResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: 'ready',
          options: {
            num_predict: 1,  // Minimal response
            temperature: 0.1
          },
          stream: false,
          keep_alive: '5m'  // Keep model loaded for 5 minutes
        })
      });

      if (preloadResponse.ok) {
        const result = await preloadResponse.json();
        trail.light(7127, {
          model_preload_complete: modelName,
          load_duration_ms: result.load_duration ? Math.round(result.load_duration / 1000000) : 0,
          total_duration_ms: result.total_duration ? Math.round(result.total_duration / 1000000) : 0,
          timestamp: Date.now()
        });
        console.log(`✅ Model preloaded successfully: ${modelName} (${result.load_duration ? Math.round(result.load_duration / 1000000) : 0}ms load time)`);
      } else {
        throw new Error(`Preload failed: ${preloadResponse.status}`);
      }
    } catch (error) {
      console.error(`❌ Failed to preload model ${modelName}:`, error);
      trail.fail(8126, error as Error);
    }

    trail.light(7123, {
      model_change: 'completed',
      new_model: modelName,
      persisted: true
    });

    console.log(`🎵 Model changed to: ${modelName}`);
  };

  // Early return if not initialized
  if (!isInitialized || !sessionState) {
    return (
      <div className="full-screen-app bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Initializing VoiceCoach...</p>
        </div>
      </div>
    );
  }

  const { isRecording, wsStatus, ollamaStatus, sessionData, coachingPrompts, transcriptions, liveTranscript, volumeState, micVolumeState, tabVolumeState, captureMode } = sessionState || {};

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  // Handle stage selection from SalesScriptPanel
  const handleStageSelected = (stageNumber: number) => {
    console.log(`🔥 SplitView: handleStageSelected called with stage ${stageNumber}`);
    setCurrentScriptStage(stageNumber);

    // Update SessionManagerService with new stage
    const sessionManager = getSessionManager();
    if (sessionManager) {
      console.log(`🔥 SplitView: Calling sessionManager.setCurrentStage(${stageNumber})`);
      sessionManager.setCurrentStage(stageNumber);
    } else {
      console.log(`❌ SplitView: No sessionManager found!`);
    }

    console.log(`STAGE ${stageNumber} SELECTED`);

    trail.light(7250, {
      operation: 'script_stage_selected',
      stageNumber: stageNumber,
      timestamp: Date.now()
    });
  };


  const viewOptions = ['Split View', 'Coaching Dashboard', 'Live Transcription', 'AI Coaching', 'Call Insights'];

  return (
    <div className="full-screen-app bg-slate-950 text-white font-sans flex flex-col">
      {/* Green Environment Bar */}
      <div className="bg-green-600 text-white px-4 py-1 flex justify-between items-center text-sm">
        <div className="flex items-center space-x-4">
          <span>Env: ✓ Electron</span>
          <span>IPC: Connected</span>
        </div>
        <span>Desktop: Enabled</span>
      </div>

      {/* Main Navigation Bar - Responsive */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="flex flex-wrap items-center justify-between px-4 py-3 gap-3">
          {/* Left Side - Connection Status */}
          <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
            {/* WebSocket Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                wsStatus === 'Connected' ? 'bg-green-400 animate-pulse' : 
                wsStatus.includes('Connecting') || wsStatus.includes('Stopping') ? 'bg-yellow-400 animate-pulse' :
                wsStatus.startsWith('Error') ? 'bg-red-400 animate-pulse' :
                'bg-red-400'
              }`}></div>
              <span className={`text-sm font-medium ${
                wsStatus.startsWith('Error') ? 'text-red-400' :
                wsStatus === 'Connected' ? 'text-green-400' :
                'text-slate-300'
              }`}>
                {wsStatus}
              </span>
            </div>
            
            {/* Ollama Status with Model Dropdown */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                ollamaStatus?.includes('Ready') || ollamaStatus === 'Connected' ? 'bg-green-400 animate-pulse' : 
                ollamaStatus?.includes('Initializing') ? 'bg-yellow-400 animate-pulse' :
                ollamaStatus === 'Disconnected' || !ollamaStatus ? 'bg-red-400' :
                'bg-yellow-400'
              }`}></div>
              
              {/* Model Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="flex items-center space-x-2 text-sm hover:bg-slate-700 px-2 py-1 rounded transition-colors"
                  disabled={modelLoading || availableModels.length === 0}
                >
                  <span className={`font-medium ${
                    ollamaStatus?.includes('Ready') || ollamaStatus === 'Connected' ? 'text-green-400' :
                    ollamaStatus?.includes('Initializing') ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    Ollama:
                  </span>
                  <span className="text-slate-300 max-w-[140px] truncate">
                    {modelLoading ? 'Loading...' : 
                     availableModels.length === 0 ? 'No models' :
                     availableModels.find(m => m.name === selectedModel)?.displayName || selectedModel.split(':')[0]}
                  </span>
                  {availableModels.length > 0 && !modelLoading && (
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  )}
                </button>
                
                {showModelDropdown && availableModels.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50 min-w-[220px] max-h-60 overflow-y-auto">
                    <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-700">
                      Select Ollama Model ({availableModels.length} available)
                    </div>
                    {availableModels.map((model) => (
                      <button
                        key={model.name}
                        onClick={() => handleModelChange(model.name)}
                        className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-700 ${
                          model.name === selectedModel ? 'bg-primary-600 text-white' : 'text-slate-300'
                        }`}
                        title={`${model.name} (${(model.size / 1024 / 1024 / 1024).toFixed(1)}GB)`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="truncate">{model.displayName}</span>
                          <span className="text-xs text-slate-400 ml-2">
                            {(model.size / 1024 / 1024 / 1024).toFixed(1)}GB
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* View Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowViewDropdown(!showViewDropdown)}
                className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700 transition-colors"
              >
                <Layout className="w-4 h-4" />
                <span>{currentView}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showViewDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50 min-w-[160px]">
                  {viewOptions.map((view) => (
                    <button
                      key={view}
                      onClick={() => {
                        setCurrentView(view);
                        setShowViewDropdown(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-700 ${
                        view === currentView ? 'bg-primary-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      {view}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center - VoiceCoach Brand - Hidden on small screens */}
          <div className="hidden lg:flex items-center space-x-2 flex-shrink-0">
            <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">VC</span>
            </div>
            <span className="text-lg font-semibold">VoiceCoach</span>
            <span className="text-sm text-slate-400">BETA</span>
          </div>

          {/* Right Side - Controls - Responsive */}
          <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
            {/* Icon buttons - Hidden on small screens except Settings */}
            <div className="flex items-center space-x-1">
              <button className="hidden md:block p-1 hover:bg-slate-700 rounded"><Users className="w-4 h-4" /></button>
              <button className="hidden md:block p-1 hover:bg-slate-700 rounded"><BarChart3 className="w-4 h-4" /></button>
              <button className="hidden md:block p-1 hover:bg-slate-700 rounded"><TrendingUp className="w-4 h-4" /></button>
              <button 
                className="hidden md:block p-1 hover:bg-slate-700 rounded"
                onClick={() => {
                  trail.light(7115, {
                    user_interaction: 'knowledge_base_button_clicked',
                    current_state: 'closed',
                    action: 'open_hub'
                  });
                  setShowKnowledgeBaseHub(true);
                }}
                title="Knowledge Base Manager"
              >
                <Database className="w-4 h-4" />
              </button>
              <button 
                className="p-1 hover:bg-slate-700 rounded"
                onClick={() => {
                  trail.light(7116, {
                    user_interaction: 'settings_button_clicked',
                    current_state: 'closed',
                    app_context: {
                      recording: sessionState?.isRecording || false,
                      ws_status: sessionState?.wsStatus || 'Unknown',
                      current_audio_mode: audioCaptureMode
                    },
                    action: 'open_settings'
                  });
                  setShowSettingsModal(true);
                }}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Audio Capture Mode Selector */}
              <AudioCaptureSelector
                mode={audioCaptureMode}
                onModeChange={setAudioCaptureMode}
                disabled={false}
                isRecording={isRecording}
              />
              
              {!isRecording ? (
                <button
                  onClick={() => startSession(audioCaptureMode, selectedDocuments)}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-3 md:px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Play className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Start Coaching Session</span>
                  <span className="sm:hidden">Start</span>
                </button>
              ) : (
                <button
                  onClick={stopSession}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 px-3 md:px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Square className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Stop Session</span>
                  <span className="sm:hidden">Stop</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Coaching Title & Volume Indicator */}
      <div className="bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">AI Sales Coach</h1>
            <p className="text-slate-400 text-sm">
              {sessionState?.ollamaStatus === 'Connected' || sessionState?.ollamaStatus === 'Ready'
                ? 'Ready to coach your next call'
                : sessionState?.ollamaStatus === 'Disconnected'
                  ? '⚠️ Ollama disconnected - Check AI service'
                  : sessionState?.ollamaStatus === 'Initializing...'
                    ? 'Initializing AI services...'
                    : 'Checking AI services...'
              }
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                sessionState?.ollamaStatus === 'Connected' || sessionState?.ollamaStatus === 'Ready'
                  ? 'bg-green-400'
                  : sessionState?.ollamaStatus === 'Disconnected'
                    ? 'bg-red-400'
                    : 'bg-yellow-400'
              }`}></div>
              <span className={`${
                sessionState?.ollamaStatus === 'Connected' || sessionState?.ollamaStatus === 'Ready'
                  ? 'text-green-400'
                  : sessionState?.ollamaStatus === 'Disconnected'
                    ? 'text-red-400'
                    : 'text-yellow-400'
              }`}>
                Ollama: {sessionState?.ollamaStatus || 'Unknown'}
              </span>
            </div>
            <button
              onClick={() => {
                trail.light(7206, {
                  operation: 'document_selector_opened',
                  current_selection_count: selectedDocuments.length
                });
                setShowDocumentSelector(true);
              }}
              className="flex items-center space-x-1 text-sm hover:text-primary-400 transition-colors cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span className="underline">
                Documents ({selectedDocuments.length})
              </span>
            </button>
            
            {/* ChromaDB Toggle */}
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-slate-400">ChromaDB:</span>
              <button
                onClick={() => {
                  const newValue = !useChromaDB;
                  setUseChromaDB(newValue);
                  // Save to both keys for compatibility
                  localStorage.setItem('voicecoach-use-chromadb', String(newValue));
                  localStorage.setItem('voicecoach-chromadb-enabled', String(newValue));
                  trail.light(7209, {
                    operation: 'chromadb_toggle',
                    enabled: newValue
                  });
                  
                  console.log(`🔍 ChromaDB ${newValue ? 'enabled' : 'disabled'} - will take effect on next coaching session`);
                  
                  // Emit event for services to react
                  window.dispatchEvent(new CustomEvent('chromaDBToggled', { 
                    detail: { enabled: newValue } 
                  }));
                }}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${useChromaDB ? 'bg-primary-600' : 'bg-slate-600'}
                `}
              >
                <span className="sr-only">Use ChromaDB semantic search</span>
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${useChromaDB ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
              <span className={`text-xs ${useChromaDB ? 'text-primary-400' : 'text-slate-500'}`}>
                {useChromaDB ? 'Semantic' : 'Keyword'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Volume Meter Component */}
        {isRecording && (
          <div className="mt-4">
            <DualVolumeIndicator
              micVolumeState={micVolumeState || volumeState || { level: 0, isMonitoring: false, status: 'silent' }}
              tabVolumeState={tabVolumeState || { level: 0, isMonitoring: false, status: 'silent' }}
              captureMode={audioCaptureMode}
            />
          </div>
        )}

        {/* MEFS Alignment Indicators - Temporarily Disabled for Cleanup */}
        {/* <div className="mt-4">
          <MEFSIndicators
            scores={mefsTracking?.scores || { Mental: 50, Emotional: 50, Financial: 50, Schedule: 50 }}
            stage={mefsTracking?.stage || (isRecording ? 'Analyzing...' : 'Ready')}
            sentiment={mefsTracking?.sentiment || 'Neutral'}
            isActive={isRecording && !!mefsTracking?.isActive}
          />
        </div> */}
      </div>

      {/* Metrics Dashboard */}
      <div className="bg-slate-900 px-6 pb-4">
        <div className="metrics-grid">
          <div className="glass-panel p-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-primary-400" />
              <div>
                <div className="text-xs text-slate-400">Session</div>
                <div className="text-sm font-semibold">{formatDuration(sessionData.duration)}</div>
              </div>
            </div>
          </div>
          <div className="glass-panel p-3">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-green-400" />
              <div>
                <div className="text-xs text-slate-400">Stage</div>
                <div className="text-sm font-semibold">{sessionData.stage}</div>
              </div>
            </div>
          </div>
          <div className="glass-panel p-3">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-yellow-400" />
              <div>
                <div className="text-xs text-slate-400">Prompts</div>
                <div className="text-sm font-semibold">{sessionData.prompts}</div>
              </div>
            </div>
          </div>
          <div className="glass-panel p-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-xs text-slate-400">Talk Ratio</div>
                <div className="text-sm font-semibold">{sessionData.talkRatio.user}% / {sessionData.talkRatio.prospect}%</div>
              </div>
            </div>
          </div>
          <div className="glass-panel p-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <div>
                <div className="text-xs text-slate-400">Response</div>
                <div className="text-sm font-semibold">{sessionData.responseTime}</div>
              </div>
            </div>
          </div>
          <div className="glass-panel p-3">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-xs text-slate-400">Effectiveness</div>
                <div className="text-sm font-semibold">{sessionData.effectiveness}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Adaptive 3-Panel Split View Content */}
      <div className="flex-1 flex px-6 min-h-0 gap-0 three-panel-layout">
        {/* Left Panel: AI Coaching Assistant (Auto-width) */}
        <div 
          className="flex-1 mr-3 h-full panel-responsive overflow-hidden"
          style={{ 
            minWidth: '300px',
            // Force separate compositing layer to prevent bleeding
            transform: 'translateZ(0)',
            isolation: 'isolate'
          }}
        >
          <CoachingPanel
            coachingPrompts={coachingPrompts}
            isRecording={isRecording}
            onClearHistory={clearCoachingPrompts}
          />
        </div>
        
        {/* Middle Panel: Sales Script (Hidden/Collapsible/Expanded) */}
        {!scriptPanel.isHidden && (
          scriptPanel.isCollapsed ? (
            <CollapsedPanel 
              type="script"
              onClick={toggleScriptPanel}
              className="mr-3"
            />
          ) : (
            <div 
              className="mr-3 relative group h-full"
              style={{ 
                width: `${getScriptWidth()}px`,
                // Force separate compositing layer
                transform: 'translateZ(0)',
                isolation: 'isolate'
              }}
            >
              {/* Invisible resize handle on left edge */}
              <div 
                className="absolute top-0 left-0 w-2 h-full cursor-col-resize bg-transparent hover:bg-blue-500/20 z-10"
                onMouseDown={(e) => startResize('script', e.clientX)}
                title="Drag to resize panel"
              />
              <SalesScriptPanel
                scriptItems={scriptItems}
                isRecording={isRecording}
                conversationHistory={conversationHistory}
                currentSentiment={sessionState?.currentSentiment}
                onMarkUsed={markItemUsed}
                onClearUsed={clearUsedItems}
                onCollapse={toggleScriptPanel}
                onStageSelected={handleStageSelected}
              />
            </div>
          )
        )}
        
        {/* Right Panel: Live Transcription (Hidden/Collapsible/Expanded) */}
        {!transcriptionPanel.isHidden && (
          transcriptionPanel.isCollapsed ? (
            <CollapsedPanel 
              type="transcription"
              onClick={toggleTranscriptionPanel}
            />
          ) : (
            <div 
              className="relative group h-full"
              style={{ 
                width: `${getTranscriptionWidth()}px`,
                // Force separate compositing layer
                transform: 'translateZ(0)',
                isolation: 'isolate'
              }}
            >
              {/* Invisible resize handle on left edge */}
              <div 
                className="absolute top-0 left-0 w-2 h-full cursor-col-resize bg-transparent hover:bg-blue-500/20 z-10"
                onMouseDown={(e) => startResize('transcription', e.clientX)}
                title="Drag to resize panel"
              />
              <TranscriptionPanel
                transcriptions={transcriptions}
                liveTranscript={liveTranscript}
                liveTranscriptSpeaker={sessionState?.liveTranscriptSpeaker}
                isRecording={isRecording}
                onClear={clearTranscriptions}
                onCollapse={toggleTranscriptionPanel}
              />
            </div>
          )
        )}
      </div>

      {/* Dropdown Close Handlers */}
      {showViewDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowViewDropdown(false)}
        />
      )}
      {showModelDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowModelDropdown(false)}
        />
      )}

      {/* Knowledge Base Hub */}
      <KnowledgeBaseHub
        isOpen={showKnowledgeBaseHub}
        onClose={() => setShowKnowledgeBaseHub(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => {
          trail.light(7119, {
            settings_modal: 'close_requested',
            close_method: 'parent_close_handler',
            final_audio_mode: audioCaptureMode
          });
          setShowSettingsModal(false);
        }}
        appState={{
          isRecording,
          isConnected: wsStatus === 'Connected',
          currentCall: null,
          audioLevels: volumeState
        }}
      />

      {/* Document Selector Modal */}
      <DocumentSelectorModal
        isOpen={showDocumentSelector}
        onClose={() => setShowDocumentSelector(false)}
        onSelectionChange={(docs) => {
          setSelectedDocuments(docs);
          trail.light(7207, {
            operation: 'documents_selected',
            count: docs.length,
            documents: docs
          });
          // Store selection in localStorage for persistence
          localStorage.setItem('voicecoach-selected-documents', JSON.stringify(docs));
        }}
        currentSelection={selectedDocuments}
      />
    </div>
  );
};

export default SplitViewCoaching;