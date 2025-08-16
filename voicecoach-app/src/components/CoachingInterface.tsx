import { useState } from "react";
import { Play, Square, MessageSquare, Brain, Target, TrendingUp, BarChart3 } from "lucide-react";
import TranscriptionPanel from "./TranscriptionPanel";
import CoachingPrompts from "./CoachingPrompts";
import CoachingDashboard from "./CoachingDashboard";
import AudioVisualizer from "./AudioVisualizer";
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
}

function CoachingInterface({ appState, onStartRecording, onStopRecording }: CoachingInterfaceProps) {
  // Initialize LED breadcrumb trail for CoachingInterface
  const trail = new BreadcrumbTrail('CoachingInterface');
  
  // LED 402: CoachingInterface component initialization
  trail.light(402, { 
    operation: 'coaching_interface_init',
    appState: {
      isRecording: appState.isRecording,
      isConnected: appState.isConnected,
      hasActiveCall: !!appState.currentCall
    }
  });
  
  const [activeTab, setActiveTab] = useState<'transcription' | 'prompts' | 'dashboard' | 'insights'>('dashboard');
  
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
    getCoachingEffectiveness
  } = useCoachingOrchestrator(appState.isRecording);
  
  // LED 312: Initial component state setup  
  trail.light(312, { 
    state_init: {
      activeTab: 'dashboard',
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

  return (
    <div className="flex-1 flex flex-col p-4 space-y-4">
      {/* Main Control Panel */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">AI Sales Coach</h2>
            {appState.currentCall ? (
              <div className="flex items-center space-x-2 text-success-400">
                <div className="w-2 h-2 rounded-full bg-success-400 animate-pulse"></div>
                <span className="text-sm font-medium">Active Call Session</span>
              </div>
            ) : (
              <span className="text-slate-400 text-sm">Ready to coach your next call</span>
            )}
          </div>

          <div className="flex items-center space-x-3">
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
      </div>
    </div>
  );
}

export default CoachingInterface;