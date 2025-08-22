import { useState, useEffect } from "react";
import { 
  Play, 
  Square, 
  MessageSquare, 
  Brain, 
  Target, 
  TrendingUp, 
  BarChart3, 
  Layout, 
  Mic,
  Clock, 
  Users, 
  Zap, 
  Award 
} from "lucide-react";
import TranscriptionPanel from "./TranscriptionPanel";
import CoachingPrompts from "./CoachingPrompts";
import CoachingDashboard from "./CoachingDashboard";
import AudioVisualizer from "./AudioVisualizer";
import AudioDeviceSelector from "./AudioDeviceSelector";
import { BreadcrumbTrail } from "../lib/breadcrumb-system";
import { useCoachingOrchestrator } from "../hooks/useCoachingOrchestrator";

interface CoachingInterfaceProps {
  appState: {
    isRecording: boolean;
    isConnected: boolean;
    currentCall: {
      duration: number;
      participants: number;
    } | null;
    audioLevels: {
      user: number;
      prospect: number;
    };
  };
  onStartRecording: () => void;
  onStopRecording: () => void;
  audioDeviceSelector?: React.ReactNode;
}

function CoachingInterface({ appState, onStartRecording, onStopRecording, audioDeviceSelector }: CoachingInterfaceProps) {
  // Initialize LED breadcrumb trail for CoachingInterface
  const trail = new BreadcrumbTrail('CoachingInterface');
  
  // Default to split-view during development for better testing visibility
  // Split-view shows both transcription and AI prompts clearly
  const [activeTab, setActiveTab] = useState<'transcription' | 'prompts' | 'dashboard' | 'insights' | 'split-view'>('split-view');
  const [ragStatus, setRagStatus] = useState<{
    connected: boolean;
    status: string;
    color: string;
    message: string;
  }>({
    connected: false,
    status: 'checking',
    color: 'bg-slate-400',
    message: 'Checking RAG connection...'
  });
  
  // Microphone selection state with LED tracking
  const [selectedMicrophone, setSelectedMicrophone] = useState<{ id: string; label: string }>(() => {
    // LED 350: Loading saved microphone selection
    trail.light(350, {
      action: 'load_saved_microphone',
      from_localStorage: true
    });
    
    const savedId = localStorage.getItem('selectedMicrophoneId') || 'default';
    const savedLabel = localStorage.getItem('selectedMicrophoneLabel') || 'System Default';
    
    // LED 351: Microphone selection loaded
    trail.light(351, {
      action: 'microphone_loaded',
      device_id: savedId,
      device_label: savedLabel
    });
    
    return { id: savedId, label: savedLabel };
  });
  
  // Real-time coaching orchestration engine
  const {
    transcriptions,
    conversationContext,
    activeTriggers,
    coachingPrompts,
    performanceMetrics,
    isProcessing,
    markPromptAsUsed,
    dismissPrompt,
    getAverageResponseTime,
    getCoachingEffectiveness,
    clearSession
  } = useCoachingOrchestrator(appState.isRecording);

  // BALANCED: RAG status checking - once per session start to maintain performance
  // Check Ollama connection when recording starts, then assume available during session
  useEffect(() => {
    const checkOllamaHealth = async () => {
      if (appState.isRecording) {
        // Only check when recording starts, not continuously
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          
          const response = await fetch('http://localhost:11434/api/tags', {
            method: 'GET',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            setRagStatus({
              connected: true,
              status: 'connected',
              color: 'bg-success-400',
              message: 'RAG: Connected to Ollama'
            });
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          console.warn('Ollama health check failed:', error);
          setRagStatus({
            connected: false,
            status: 'failed',
            color: 'bg-warning-400',
            message: 'RAG: Ollama connection failed'
          });
        }
      } else {
        // When not recording, show ready status
        setRagStatus({
          connected: true,
          status: 'ready',
          color: 'bg-slate-400',
          message: 'RAG: Ready for coaching session'
        });
      }
    };
    
    checkOllamaHealth();
  }, [appState.isRecording]); // Only check when recording state changes

  // Listen for microphone changes from Settings panel
  useEffect(() => {
    const handleMicrophoneChange = (event: CustomEvent) => {
      const { deviceId, label } = event.detail;
      
      // LED 352: Microphone change detected in CoachingInterface
      trail.light(352, {
        action: 'microphone_change_detected',
        new_device_id: deviceId,
        new_device_label: label,
        previous_id: selectedMicrophone.id,
        previous_label: selectedMicrophone.label
      });
      
      setSelectedMicrophone({ id: deviceId, label });
      
      // LED 353: Microphone state updated in CoachingInterface
      trail.light(353, {
        action: 'microphone_state_updated',
        device_id: deviceId,
        device_label: label
      });
    };

    window.addEventListener('microphoneChanged', handleMicrophoneChange as EventListener);
    
    return () => {
      window.removeEventListener('microphoneChanged', handleMicrophoneChange as EventListener);
    };
  }, [selectedMicrophone]);

  // Breadcrumb event listener for debugging visibility
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;

    const setupBreadcrumbListener = async () => {
      try {
        // Check if we're in a Tauri environment
        if (typeof window !== 'undefined' && ((window as any).__TAURI__ || (window as any).__TAURI_IPC__)) {
          const { listen } = await import('@tauri-apps/api/event');
          
          // Register event listener for breadcrumb events from Rust backend
          const unlisten = await listen('breadcrumb_event', (event: any) => {
            console.log('🔍 LED Breadcrumb:', {
              id: event.payload.id,
              name: event.payload.name,
              component: event.payload.component,
              success: event.payload.success,
              data: event.payload.data,
              duration_ms: event.payload.duration_ms
            });
            
            // Also log to a special breadcrumb console group for easy filtering
            console.groupCollapsed(`💡 LED ${event.payload.id} - ${event.payload.name} [${event.payload.component}]`);
            console.log('Status:', event.payload.success ? '✅ Success' : '❌ Failed');
            console.log('Duration:', `${event.payload.duration_ms}ms`);
            if (event.payload.data) {
              console.log('Data:', event.payload.data);
            }
            if (event.payload.error) {
              console.error('Error:', event.payload.error);
            }
            console.groupEnd();
          });

          unlistenFn = unlisten;
          console.log('✅ Breadcrumb event listener registered for debugging');
        }
      } catch (error) {
        console.error('Failed to setup breadcrumb listener:', error);
      }
    };

    setupBreadcrumbListener();

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, []); // Only setup once

  // LED logging after all hooks
  // LED 402: CoachingInterface component initialization
  trail.light(402, { 
    operation: 'coaching_interface_init',
    appState: {
      isRecording: appState.isRecording,
      isConnected: appState.isConnected,
      hasActiveCall: !!appState.currentCall
    }
  });
  
  // LED 312: Initial component state setup  
  trail.light(312, { 
    state_init: {
      activeTab: 'split-view', // Changed to split-view for development
      orchestratorEnabled: true,
      coachingPromptsCount: coachingPrompts.length,
      currentStage: conversationContext.currentStage
    }
  });

  // LED 403: CoachingInterface render cycle start
  trail.light(403, { 
    operation: 'coaching_interface_render',
    activeTab,
    isRecording: appState.isRecording,
    isConnected: appState.isConnected
  });

  // Helper function for formatting duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 space-y-4">
      {/* Main Control Panel */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">AI Sales Coach</h2>
            
            {/* RAG System Status Indicator */}
            <div className="flex items-center space-x-2">
              {appState.currentCall ? (
                <div className="flex items-center space-x-2 text-success-400">
                  <div className="w-2 h-2 rounded-full bg-success-400 animate-pulse"></div>
                  <span className="text-sm font-medium">Active Call Session</span>
                </div>
              ) : (
                <span className="text-slate-400 text-sm">Ready to coach your next call</span>
              )}
              
              {/* Knowledge Base Status and Microphone */}
              <div className="flex flex-col space-y-1">
                <div className="flex items-center space-x-1 text-xs">
                  <div className={`w-2 h-2 rounded-full ${ragStatus.color} ${ragStatus.status === 'checking' ? 'animate-pulse' : ''}`}></div>
                  <span className={`${ragStatus.connected ? 'text-success-400' : ragStatus.status === 'failed' ? 'text-danger-400' : 'text-warning-400'}`}>
                    {ragStatus.message}
                  </span>
                </div>
                
                {/* Microphone Display */}
                <div className="flex items-center space-x-1 text-xs">
                  <Mic className="w-3 h-3 text-primary-400" />
                  <span className="text-slate-400">
                    Mic: <span className="text-primary-400 font-medium">{selectedMicrophone.label}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Audio Device Selector - Compact dropdown */}
            {audioDeviceSelector && (
              <div className="flex-shrink-0">
                {audioDeviceSelector}
              </div>
            )}
            
            {!appState.isRecording ? (
              <button
                onClick={() => {
                  // LED 104: User interaction - Start coaching button clicked
                  trail.light(104, { 
                    user_action: 'start_coaching_clicked',
                    isConnected: appState.isConnected
                  });
                  onStartRecording();
                }}
                disabled={!appState.isConnected}
                className="flex items-center space-x-2 bg-success-600 hover:bg-success-700 disabled:bg-slate-700 disabled:text-slate-400 px-6 py-3 rounded-lg font-medium transition-all duration-200 pulse-glow"
                title={!appState.isConnected ? "Please check connection and microphone access" : "Begin coaching session with microphone recording"}
              >
                <Play className="w-5 h-5" />
                <span>Start Coaching Session</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  // LED 105: User interaction - Stop coaching button clicked
                  trail.light(105, { 
                    user_action: 'stop_coaching_clicked',
                    currentCallDuration: appState.currentCall?.duration
                  });
                  onStopRecording();
                }}
                className="flex items-center space-x-2 bg-danger-600 hover:bg-danger-700 px-6 py-3 rounded-lg font-medium transition-all duration-200"
              >
                <Square className="w-5 h-5" />
                <span>Stop Session</span>
              </button>
            )}
          </div>
        </div>

        {/* Audio Visualizer */}
        <div className="mt-6">
          <AudioVisualizer 
            audioLevels={{
              user: appState.audioLevels.user,
              prospect: appState.audioLevels.prospect,
              timestamp: appState.currentCall?.duration ? appState.currentCall.duration * 1000 : 0
            }} 
            isRecording={appState.isRecording} 
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
        <button
          onClick={() => {
            // LED 106: User interaction - Dashboard tab clicked
            trail.light(106, { 
              user_action: 'tab_change',
              previousTab: activeTab,
              newTab: 'dashboard'
            });
            setActiveTab('dashboard');
            // LED 317: State update - Active tab changed
            trail.light(317, { 
              state_update: 'active_tab_changed',
              activeTab: 'dashboard'
            });
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
            activeTab === 'dashboard' 
              ? 'bg-primary-600 text-white shadow-lg' 
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Coaching Dashboard</span>
          {coachingPrompts.filter(p => p.priority === 'critical').length > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
              {coachingPrompts.filter(p => p.priority === 'critical').length}
            </span>
          )}
        </button>
        
        <button
          onClick={() => {
            // LED 107: User interaction - Transcription tab clicked
            trail.light(107, { 
              user_action: 'tab_change',
              previousTab: activeTab,
              newTab: 'transcription'
            });
            setActiveTab('transcription');
            // LED 318: State update - Active tab changed
            trail.light(318, { 
              state_update: 'active_tab_changed',
              activeTab: 'transcription'
            });
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
            activeTab === 'transcription' 
              ? 'bg-primary-600 text-white shadow-lg' 
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Live Transcription</span>
        </button>
        
        <button
          onClick={() => {
            // LED 108: User interaction - AI Coaching tab clicked
            trail.light(108, { 
              user_action: 'tab_change',
              previousTab: activeTab,
              newTab: 'prompts'
            });
            setActiveTab('prompts');
            // LED 319: State update - Active tab changed
            trail.light(319, { 
              state_update: 'active_tab_changed',
              activeTab: 'prompts'
            });
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
            activeTab === 'prompts' 
              ? 'bg-primary-600 text-white shadow-lg' 
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Brain className="w-4 h-4" />
          <span>AI Coaching</span>
          {coachingPrompts.filter(p => p.priority === 'high' || p.priority === 'critical').length > 0 && (
            <span className="bg-orange-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
              {coachingPrompts.filter(p => p.priority === 'high' || p.priority === 'critical').length}
            </span>
          )}
        </button>
        
        <button
          onClick={() => {
            // LED 109: User interaction - Call Insights tab clicked
            trail.light(109, { 
              user_action: 'tab_change',
              previousTab: activeTab,
              newTab: 'insights'
            });
            setActiveTab('insights');
            // LED 320: State update - Active tab changed
            trail.light(320, { 
              state_update: 'active_tab_changed',
              activeTab: 'insights'
            });
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
            activeTab === 'insights' 
              ? 'bg-primary-600 text-white shadow-lg' 
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Call Insights</span>
        </button>
        
        <button
          onClick={() => {
            // LED 110: User interaction - Split View tab clicked
            trail.light(110, { 
              user_action: 'tab_change',
              previousTab: activeTab,
              newTab: 'split-view'
            });
            setActiveTab('split-view');
            // LED 321: State update - Active tab changed
            trail.light(321, { 
              state_update: 'active_tab_changed',
              activeTab: 'split-view'
            });
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
            activeTab === 'split-view' 
              ? 'bg-primary-600 text-white shadow-lg' 
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>Split View</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0">
        {activeTab === 'dashboard' && (
          <>
            {/* LED 404: UI operation - CoachingDashboard render */}
            {(() => {
              trail.light(404, { 
                ui_operation: 'coaching_dashboard_render',
                isRecording: appState.isRecording,
                promptsCount: coachingPrompts.length,
                currentStage: conversationContext.currentStage
              });
              return null;
            })()}
            <CoachingDashboard
              conversationContext={conversationContext}
              coachingPrompts={coachingPrompts}
              performanceMetrics={performanceMetrics}
              activeTriggers={activeTriggers}
              isProcessing={isProcessing}
              isRecording={appState.isRecording}
              onPromptUsed={markPromptAsUsed}
              onPromptDismissed={dismissPrompt}
              averageResponseTime={getAverageResponseTime()}
              coachingEffectiveness={getCoachingEffectiveness()}
            />
          </>
        )}
        
        {activeTab === 'transcription' && (
          <>
            {/* LED 405: UI operation - TranscriptionPanel render */}
            {(() => {
              trail.light(405, { 
                ui_operation: 'transcription_panel_render',
                isRecording: appState.isRecording,
                transcriptionsCount: transcriptions.length
              });
              return null;
            })()}
            <TranscriptionPanel 
              isRecording={appState.isRecording}
              onStartRecording={onStartRecording}
              onStopRecording={onStopRecording}
              transcriptions={transcriptions}
            />
          </>
        )}
        
        {activeTab === 'prompts' && (
          <>
            {/* LED 406: UI operation - CoachingPrompts render */}
            {(() => {
              trail.light(406, { 
                ui_operation: 'coaching_prompts_render',
                isRecording: appState.isRecording,
                promptsCount: coachingPrompts.length
              });
              return null;
            })()}
            <CoachingPrompts 
              isRecording={appState.isRecording}
              prompts={coachingPrompts}
              conversationContext={conversationContext}
              onPromptUsed={markPromptAsUsed}
              onPromptDismissed={dismissPrompt}
            />
          </>
        )}
        
        {activeTab === 'insights' && (
          <div className="glass-panel p-6 h-full">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Target className="w-5 h-5 text-primary-400" />
              <span>Real-time Call Analytics</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Talk Time Ratio</h4>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-slate-700 rounded-full h-3">
                    <div 
                      className="bg-primary-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${conversationContext.talkTimeRatio.user}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-slate-400">{conversationContext.talkTimeRatio.user}% you</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Conversation Sentiment</h4>
                <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                  conversationContext.sentiment === 'positive' ? 'bg-success-900/50 text-success-400' :
                  conversationContext.sentiment === 'negative' ? 'bg-danger-900/50 text-danger-400' :
                  'bg-warning-900/50 text-warning-400'
                }`}>
                  <span className="capitalize">{conversationContext.sentiment}</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-3">Current Sales Stage</h4>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-primary-500 rounded-full" />
                  <span className="capitalize font-medium">{conversationContext.currentStage.replace('_', ' ')}</span>
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  Duration: {Math.floor(conversationContext.duration / 60000)}m {Math.floor((conversationContext.duration % 60000) / 1000)}s
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-3">Key Topics ({conversationContext.keyTopics.length})</h4>
              <div className="flex flex-wrap gap-2">
                {conversationContext.keyTopics.slice(0, 8).map(topic => (
                  <span key={topic} className="px-2 py-1 bg-primary-900/30 text-primary-300 text-sm rounded-full">
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            {!appState.isRecording && (
              <div className="mt-8 text-center text-slate-400">
                <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Start a coaching session to see real-time analytics</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'split-view' && (
          <>
            {/* LED 407: UI operation - Split View render */}
            {(() => {
              trail.light(407, { 
                ui_operation: 'split_view_render',
                isRecording: appState.isRecording,
                transcriptionsCount: transcriptions.length,
                promptsCount: coachingPrompts.length
              });
              return null;
            })()}
            <div className="h-full flex flex-col space-y-4">
              {/* Stats Bar at Top of Split View */}
              <div className="grid grid-cols-6 gap-4">
                {/* Session Duration */}
                <div className="glass-panel p-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-primary-400" />
                    <div>
                      <div className="text-xs text-slate-400">Session</div>
                      <div className="text-sm font-semibold">
                        {formatDuration(conversationContext.duration)}
                        {/* Debug: show raw duration */}
                        {process.env.NODE_ENV === 'development' && (
                          <span className="text-xs text-slate-500 ml-1">({conversationContext.duration}ms)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Stage */}
                <div className="glass-panel p-3">
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-success-400" />
                    <div>
                      <div className="text-xs text-slate-400">Stage</div>
                      <div className="text-sm font-semibold capitalize">
                        {conversationContext.currentStage.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Prompts */}
                <div className="glass-panel p-3">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-4 h-4 text-warning-400" />
                    <div>
                      <div className="text-xs text-slate-400">Prompts</div>
                      <div className="text-sm font-semibold">
                        {coachingPrompts.length}
                        {coachingPrompts.filter(p => p.priority === 'critical').length > 0 && (
                          <span className="ml-1 text-red-400">({coachingPrompts.filter(p => p.priority === 'critical').length}!)</span>
                        )}
                        {/* Debug: show transcription count */}
                        {process.env.NODE_ENV === 'development' && (
                          <span className="text-xs text-slate-500 ml-1">(T:{transcriptions.length})</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Talk Ratio */}
                <div className="glass-panel p-3">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="text-xs text-slate-400">Talk Ratio</div>
                      <div className="text-sm font-semibold">
                        {conversationContext.talkTimeRatio.user}% / {conversationContext.talkTimeRatio.prospect}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Response Time */}
                <div className="glass-panel p-3">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <div>
                      <div className="text-xs text-slate-400">Response</div>
                      <div className="text-sm font-semibold">
                        {getAverageResponseTime().toFixed(0)}ms
                        {isProcessing && (
                          <span className="ml-1 animate-pulse text-yellow-400">⚡</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Effectiveness */}
                <div className="glass-panel p-3">
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-xs text-slate-400">Effectiveness</div>
                      <div className="text-sm font-semibold">
                        {getCoachingEffectiveness().toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Split View Content */}
              <div className="flex-1 flex gap-4" style={{ maxHeight: '550px', height: '550px' }}>
                {/* AI Coaching - Left 2/3 */}
                <div className="flex-[2] min-h-0" style={{ maxHeight: '550px' }}>
                  <CoachingPrompts 
                    isRecording={appState.isRecording}
                    prompts={coachingPrompts}
                    conversationContext={conversationContext}
                    onPromptUsed={markPromptAsUsed}
                    onPromptDismissed={dismissPrompt}
                  />
                </div>
                
                {/* Live Transcription - Right 1/3 */}
                <div className="flex-1 min-h-0" style={{ maxHeight: '550px' }}>
                  <div className="glass-panel h-full overflow-hidden flex flex-col">
                    {/* Header with title and clear button */}
                    <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-primary-400" />
                        <h3 className="text-sm font-semibold">Live Transcription</h3>
                        <span className="text-xs text-slate-400">
                          ({transcriptions.length} messages)
                        </span>
                      </div>
                      <button
                        onClick={() => clearSession()}
                        className="px-3 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                        title="Clear all transcriptions"
                      >
                        Clear
                      </button>
                    </div>
                    
                    {/* Transcription content */}
                    <div className="flex-1 overflow-y-auto p-4">
                      {transcriptions.length === 0 ? (
                        <div className="text-xs text-slate-400 text-center mt-8">
                          {appState.isRecording ? 
                            "🎙️ Listening for speech..." : 
                            "📝 Start recording to see transcriptions"
                          }
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {transcriptions.slice(-10).reverse().map((t, i) => (
                            <div key={`trans-${t.id || i}`} className={`text-xs p-2 rounded ${
                              t.speaker === 'user' ? 'bg-blue-900/20 text-blue-300' : 'bg-purple-900/20 text-purple-300'
                            }`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold">
                                  {t.speaker === 'user' ? '🎤 You' : '🎧 Prospect'}
                                </span>
                                <span className="text-[10px] opacity-60">
                                  {new Date(t.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="break-words">{t.text}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CoachingInterface;