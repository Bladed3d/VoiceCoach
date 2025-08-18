import { useState, useEffect } from "react";
import CoachingInterface from "./components/CoachingInterface";
import StatusBar from "./components/StatusBar";
import SettingsPanel from "./components/SettingsPanel";
import AudioDeviceSelector from "./components/AudioDeviceSelector";
import { KnowledgeBaseManager } from "./components/KnowledgeBaseManager";
import UserTestingFramework from "./components/UserTestingFramework";
import FeedbackCollectionSystem from "./components/FeedbackCollectionSystem";
import AnalyticsMonitoringDashboard from "./components/AnalyticsMonitoringDashboard";
import BetaTesterOnboardingSystem from "./components/BetaTesterOnboardingSystem";
import PerformanceValidationFramework from "./components/PerformanceValidationFramework";
import { useAudioProcessor } from "./hooks/useAudioProcessor";
import { BreadcrumbTrail } from "./lib/breadcrumb-system";

interface AppState {
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
}

function App() {
  // Initialize LED breadcrumb trail for App component
  const trail = new BreadcrumbTrail('App');
  
  // LED 400: App component initialization
  trail.light(400, { operation: 'app_component_init', timestamp: Date.now() });
  
  const [showSettings, setShowSettings] = useState(false);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [showUserTesting, setShowUserTesting] = useState(false);
  const [showFeedbackCollection, setShowFeedbackCollection] = useState(false);
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState(false);
  const [showBetaOnboarding, setShowBetaOnboarding] = useState(false);
  const [showPerformanceValidation, setShowPerformanceValidation] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentAudioMode, setCurrentAudioMode] = useState<string>('microphone_only');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('default');
  
  // LED 300: Initial state setup
  trail.light(300, { 
    state_init: 'complete',
    showSettings: false,
    currentTime: currentTime.toISOString()
  });
  
  // LED 301: Audio processor hook initialization
  trail.light(301, { operation: 'audio_processor_hook_init' });
  
  // Use real audio processing hook
  const {
    isRecording,
    isConnected,
    audioLevels,
    performanceMetrics,
    error: audioError,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    getStatusText,
    getStatusColor,
    getFormattedMetrics,
  } = useAudioProcessor();
  
  // LED 302: Audio processor hook data received
  trail.light(302, { 
    audio_hook_data: {
      isRecording,
      isConnected,
      hasError: !!audioError,
      audioLevels: { user: audioLevels.user, prospect: audioLevels.prospect }
    }
  });

  // LED 303: AppState conversion
  trail.light(303, { operation: 'appstate_conversion_start' });
  
  // Convert audio processor state to legacy AppState format for compatibility
  const appState: AppState = {
    isRecording,
    isConnected,
    currentCall: isRecording ? { 
      duration: Math.floor(audioLevels.timestamp / 1000), 
      participants: 2 
    } : null,
    audioLevels: {
      user: audioLevels.user,
      prospect: audioLevels.prospect,
    }
  };
  
  // LED 304: AppState conversion complete
  trail.light(304, { 
    appstate_data: {
      isRecording: appState.isRecording,
      isConnected: appState.isConnected,
      hasActiveCall: !!appState.currentCall,
      callDuration: appState.currentCall?.duration
    }
  });

  // Update time every second for live status
  useEffect(() => {
    // LED 305: Timer effect initialization
    trail.light(305, { operation: 'timer_effect_init' });
    
    const timer = setInterval(() => {
      // LED 306: Timer tick
      const newTime = new Date();
      trail.light(306, { 
        timer_tick: newTime.toISOString(),
        previous_time: currentTime.toISOString()
      });
      setCurrentTime(newTime);
    }, 1000);

    return () => {
      // LED 307: Timer cleanup
      trail.light(307, { operation: 'timer_cleanup' });
      clearInterval(timer);
    };
  }, []);

  // Show audio errors in console and UI
  useEffect(() => {
    // LED 308: Audio error effect monitoring
    trail.light(308, { 
      operation: 'audio_error_monitoring',
      hasError: !!audioError,
      errorMessage: audioError || null
    });
    
    if (audioError) {
      // LED 309: Audio error detected
      trail.fail(309, new Error(`Audio processing error: ${audioError}`));
      console.error("Audio processing error:", audioError);
    }
  }, [audioError]);

  const handleStartRecording = async () => {
    // LED 100: User interaction - Start recording button clicked
    trail.light(100, { 
      user_action: 'start_recording_clicked',
      timestamp: Date.now(),
      audio_mode: currentAudioMode,
      selected_device: selectedAudioDevice
    });
    
    try {
      console.log(`🎙️ User requested recording start with mode: ${currentAudioMode}`);
      
      // LED 200: API operation - Starting audio recording with enhanced parameters
      trail.light(200, { 
        api_operation: 'start_audio_recording_enhanced',
        audio_mode: currentAudioMode,
        device: selectedAudioDevice
      });
      
      // Pass audio mode and device to the recording function
      await startAudioRecording({
        audio_mode: currentAudioMode,
        selected_device: selectedAudioDevice
      });
      
      // LED 201: API operation complete
      trail.light(201, { 
        api_operation: 'start_audio_recording_complete',
        mode: currentAudioMode
      });
      
    } catch (error) {
      // LED 200: API operation failed
      trail.fail(200, error as Error);
    }
  };

  const handleStopRecording = async () => {
    // LED 101: User interaction - Stop recording button clicked
    trail.light(101, { 
      user_action: 'stop_recording_clicked',
      timestamp: Date.now()
    });
    
    try {
      console.log("🛑 User requested recording stop");
      
      // LED 202: API operation - Stopping audio recording
      trail.light(202, { api_operation: 'stop_audio_recording' });
      
      await stopAudioRecording();
      
      // LED 203: API operation complete
      trail.light(203, { api_operation: 'stop_audio_recording_complete' });
      
    } catch (error) {
      // LED 202: API operation failed
      trail.fail(202, error as Error);
    }
  };

  // LED 401: App render cycle start
  trail.light(401, { 
    operation: 'app_render_start',
    showSettings,
    hasAudioError: !!audioError
  });

  return (
    <div className="full-screen-app bg-slate-950 text-white">
      {/* Status Bar - Fixed at top */}
      <StatusBar 
        appState={appState}
        currentTime={currentTime}
        onSettingsClick={() => {
          // LED 102: User interaction - Settings button clicked
          trail.light(102, { 
            user_action: 'settings_clicked',
            previousState: showSettings
          });
          setShowSettings(true);
          // LED 310: State update - Settings panel opened
          trail.light(310, { 
            state_update: 'settings_panel_opened',
            showSettings: true
          });
        }}
        onKnowledgeBaseClick={() => {
          // LED 104: User interaction - Knowledge base button clicked
          trail.light(104, { 
            user_action: 'knowledge_base_clicked',
            previousState: showKnowledgeBase
          });
          setShowKnowledgeBase(true);
          // LED 312: State update - Knowledge base panel opened
          trail.light(312, { 
            state_update: 'knowledge_base_panel_opened',
            showKnowledgeBase: true
          });
        }}
        onBetaOnboardingClick={() => {
          trail.light(110, { user_action: 'beta_onboarding_clicked' });
          setShowBetaOnboarding(true);
        }}
        onUserTestingClick={() => {
          trail.light(111, { user_action: 'user_testing_clicked' });
          setShowUserTesting(true);
        }}
        onFeedbackClick={() => {
          trail.light(112, { user_action: 'feedback_clicked' });
          setShowFeedbackCollection(true);
        }}
        onAnalyticsClick={() => {
          trail.light(113, { user_action: 'analytics_clicked' });
          setShowAnalyticsDashboard(true);
        }}
        onPerformanceValidationClick={() => {
          trail.light(114, { user_action: 'performance_validation_clicked' });
          setShowPerformanceValidation(true);
        }}
      />

      {/* Main Coaching Interface */}
      <div className="flex-1 flex flex-col" style={{ height: 'calc(100vh - 60px)' }}>
        <CoachingInterface 
          appState={appState}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          audioDeviceSelector={
            <AudioDeviceSelector
              isRecording={appState.isRecording}
              onModeChange={(mode, device) => {
                setCurrentAudioMode(mode);
                setSelectedAudioDevice(device);
                trail.light(315, {
                  audio_config_change: { mode, device },
                  timestamp: Date.now()
                });
                console.log(`🔧 Audio configuration updated: ${mode} on ${device}`);
              }}
            />
          }
        />
      </div>

      {/* Settings Panel Overlay */}
      {showSettings && (
        <SettingsPanel 
          onClose={() => {
            // LED 103: User interaction - Settings panel closed
            trail.light(103, { 
              user_action: 'settings_closed',
              previousState: showSettings
            });
            setShowSettings(false);
            // LED 311: State update - Settings panel closed
            trail.light(311, { 
              state_update: 'settings_panel_closed',
              showSettings: false
            });
          }}
          appState={appState}
        />
      )}

      {/* Knowledge Base Panel Overlay */}
      {showKnowledgeBase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="w-full max-w-6xl max-h-[90vh] m-4">
            <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <h2 className="text-xl font-bold text-gray-800">🧠 Knowledge Base Manager</h2>
                <button
                  onClick={() => {
                    // LED 105: User interaction - Knowledge base panel closed
                    trail.light(105, { 
                      user_action: 'knowledge_base_closed',
                      previousState: showKnowledgeBase
                    });
                    setShowKnowledgeBase(false);
                    // LED 313: State update - Knowledge base panel closed
                    trail.light(313, { 
                      state_update: 'knowledge_base_panel_closed',
                      showKnowledgeBase: false
                    });
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <div className="max-h-[80vh] overflow-auto">
                <KnowledgeBaseManager />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Beta Tester Onboarding Panel */}
      {showBetaOnboarding && (
        <BetaTesterOnboardingSystem
          isVisible={showBetaOnboarding}
          onClose={() => setShowBetaOnboarding(false)}
          currentUserId="beta_user_001"
          adminMode={false}
        />
      )}

      {/* User Testing Framework Panel */}
      {showUserTesting && (
        <UserTestingFramework
          isVisible={showUserTesting}
          onClose={() => setShowUserTesting(false)}
          currentUserId="test_user_001"
          isRecording={appState.isRecording}
        />
      )}

      {/* Feedback Collection System Panel */}
      {showFeedbackCollection && (
        <FeedbackCollectionSystem
          isVisible={showFeedbackCollection}
          onClose={() => setShowFeedbackCollection(false)}
          currentUserId="feedback_user_001"
          currentSessionId={appState.currentCall ? `session_${Date.now()}` : undefined}
          triggerType="feature_feedback"
        />
      )}

      {/* Analytics Monitoring Dashboard Panel */}
      {showAnalyticsDashboard && (
        <AnalyticsMonitoringDashboard
          isVisible={showAnalyticsDashboard}
          onClose={() => setShowAnalyticsDashboard(false)}
          realTimeMode={true}
        />
      )}

      {/* Performance Validation Framework Panel */}
      {showPerformanceValidation && (
        <PerformanceValidationFramework
          isVisible={showPerformanceValidation}
          onClose={() => setShowPerformanceValidation(false)}
          currentUserId="validation_user_001"
          realTimeMode={true}
        />
      )}

      {/* Audio Error Display */}
      {audioError && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-900/90 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg shadow-lg max-w-md">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Audio Error:</span>
            </div>
            <p className="text-xs mt-1 text-red-300">{audioError}</p>
          </div>
        </div>
      )}

      {/* Development Info & Performance Metrics */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 right-2 space-y-2">
          {/* Live Status */}
          <div className="text-xs text-slate-400 bg-slate-900/80 px-2 py-1 rounded">
            Dev Mode | {currentTime.toLocaleTimeString()}
          </div>
          
          {/* Audio Status */}
          <div className={`text-xs px-2 py-1 rounded bg-slate-900/80 ${getStatusColor()}`}>
            Audio: {getStatusText()}
          </div>
          
          {/* Performance Metrics */}
          {performanceMetrics && getFormattedMetrics() && (
            <div className="text-xs text-slate-400 bg-slate-900/80 px-2 py-1 rounded space-y-1">
              <div>Latency: {getFormattedMetrics()?.averageLatency}</div>
              <div>Tokens: {getFormattedMetrics()?.tokens}</div>
              <div>Transcriptions: {getFormattedMetrics()?.transcriptions}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;