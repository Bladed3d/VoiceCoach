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
  Mic,
  Clock, 
  Target, 
  Brain, 
  Users, 
  Zap, 
  Award,
  ChevronDown,
  Settings,
  Database,
  MessageSquare,
  BarChart3,
  TrendingUp,
  FileText
} from 'lucide-react';

// Modular imports
import { useCoachingSession } from '../hooks/useCoachingSession';
import { useResizablePanels } from '../hooks/useResizablePanels';
import { useSalesScript } from '../hooks/useSalesScript';
import { VolumeIndicator } from './common/VolumeIndicator';
import { CoachingPanel } from './coaching/CoachingPanel';
import { SalesScriptPanel } from './coaching/SalesScriptPanel';
import { TranscriptionPanel } from './coaching/TranscriptionPanel';
import { CollapsedPanel } from './common/CollapsedPanel';
import { KnowledgeBaseHub } from './KnowledgeBaseHub';
import SettingsModal from './modals/SettingsModal';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

interface SplitViewCoachingProps {
  onNewDocument?: () => void;
  insights?: any;
}

const SplitViewCoaching: React.FC<SplitViewCoachingProps> = () => {
  const trail = new BreadcrumbTrail('SplitViewCoaching');
  
  // Modular session management
  const { sessionState, isInitialized, startSession, stopSession, clearTranscriptions, clearCoachingPrompts } = useCoachingSession();
  
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
  
  // Local UI state only
  const [showKnowledgeBaseHub, setShowKnowledgeBaseHub] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentView, setCurrentView] = useState('Split View');
  const [selectedMicrophone, setSelectedMicrophone] = useState('System Default');
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [showMicrophoneDropdown, setShowMicrophoneDropdown] = useState(false);
  
  // Component lifecycle and microphone change event tracking
  React.useEffect(() => {
    trail.light(7107, {
      component_mount: 'SplitViewCoaching',
      initial_state: {
        view: currentView,
        microphone: selectedMicrophone,
        modals_closed: true
      }
    });
    
    // Enhanced microphone change event listener
    const handleMicrophoneChange = (event: CustomEvent) => {
      const { deviceId, label } = event.detail;
      trail.light(7108, {
        microphone_event: 'external_change_detected',
        from_device: selectedMicrophone,
        to_device: label,
        device_id: deviceId,
        source: 'settings_modal'
      });
      
      setSelectedMicrophone(label);
      
      trail.light(7109, {
        microphone_update: 'ui_synchronized',
        new_display_name: label,
        device_id: deviceId
      });
    };
    
    window.addEventListener('microphoneChanged', handleMicrophoneChange as EventListener);
    
    return () => {
      trail.light(7110, { component_unmount: 'SplitViewCoaching' });
      window.removeEventListener('microphoneChanged', handleMicrophoneChange as EventListener);
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

  const { isRecording, wsStatus, sessionData, coachingPrompts, transcriptions, liveTranscript, volumeState } = sessionState;

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };


  const viewOptions = ['Split View', 'Coaching Dashboard', 'Live Transcription', 'AI Coaching', 'Call Insights'];
  const microphoneOptions = ['System Default', 'Microphone (CURRENT)', 'Video Call Audio', 'Complete Audio Mix'];

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

      {/* Main Navigation Bar */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left Side - Connection Status */}
          <div className="flex items-center space-x-4">
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

          {/* Center - VoiceCoach Brand */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">VC</span>
            </div>
            <span className="text-lg font-semibold">VoiceCoach</span>
            <span className="text-sm text-slate-400">BETA</span>
          </div>

          {/* Right Side - Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <button className="p-1 hover:bg-slate-700 rounded"><Users className="w-4 h-4" /></button>
              <button className="p-1 hover:bg-slate-700 rounded"><BarChart3 className="w-4 h-4" /></button>
              <button className="p-1 hover:bg-slate-700 rounded"><TrendingUp className="w-4 h-4" /></button>
              <button 
                className="p-1 hover:bg-slate-700 rounded"
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
                      current_microphone: selectedMicrophone
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
              {/* Microphone Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowMicrophoneDropdown(!showMicrophoneDropdown)}
                  className="flex items-center space-x-2 text-sm hover:bg-slate-700 px-3 py-2 rounded transition-colors"
                >
                  <Mic className="w-4 h-4 text-primary-400" />
                  <span>{selectedMicrophone}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {showMicrophoneDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50 min-w-[200px]">
                    {microphoneOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          trail.light(7117, {
                            microphone_selection: 'dropdown_change',
                            from_option: selectedMicrophone,
                            to_option: option,
                            interaction_type: 'dropdown_menu'
                          });
                          setSelectedMicrophone(option);
                          setShowMicrophoneDropdown(false);
                          trail.light(7118, {
                            microphone_change: 'completed_via_dropdown',
                            new_selection: option
                          });
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-700 ${
                          option === selectedMicrophone ? 'bg-primary-600 text-white' : 'text-slate-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {!isRecording ? (
                <button
                  onClick={startSession}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Coaching Session</span>
                </button>
              ) : (
                <button
                  onClick={stopSession}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop Session</span>
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
            <p className="text-slate-400 text-sm">Ready to coach your next call</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-green-400">RAG: Ready for coaching session</span>
            </div>
          </div>
        </div>
        
        {/* Volume Meter Component */}
        {isRecording && (
          <div className="mt-4">
            <VolumeIndicator volumeState={volumeState} />
          </div>
        )}
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
        
        {/* Panel Control Buttons */}
        <div className="mt-4 flex justify-center">
          <div className="panel-controls">
            <span className="text-xs text-slate-400">View Panels:</span>
            <button 
              className={`p-2 rounded transition-colors ${
                scriptPanel.isHidden 
                  ? 'hover:bg-slate-700 text-slate-500 bg-slate-800' 
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
              onClick={toggleScriptVisibility}
              title={scriptPanel.isHidden ? 'Show Sales Script Panel' : 'Hide Sales Script Panel'}
            >
              <FileText className="w-4 h-4" />
            </button>
            <button 
              className={`p-2 rounded transition-colors ${
                transcriptionPanel.isHidden 
                  ? 'hover:bg-slate-700 text-slate-500 bg-slate-800' 
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
              onClick={toggleTranscriptionVisibility}
              title={transcriptionPanel.isHidden ? 'Show Transcription Panel' : 'Hide Transcription Panel'}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Adaptive 3-Panel Split View Content */}
      <div className="flex-1 flex px-6 min-h-0 gap-0 three-panel-layout">
        {/* Left Panel: AI Coaching Assistant (Auto-width) */}
        <div 
          className="flex-1 mr-3 h-full panel-responsive"
          style={{ minWidth: '300px' }}
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
              style={{ width: `${getScriptWidth()}px` }}
            >
              {/* Invisible resize handle on left edge */}
              <div 
                className="absolute top-0 left-0 w-2 h-full cursor-col-resize bg-transparent hover:bg-primary-500/20 transition-colors z-10"
                onMouseDown={(e) => startResize('script', e.clientX)}
                title="Drag to resize panel"
              />
              <SalesScriptPanel 
                scriptItems={scriptItems}
                isRecording={isRecording}
                onMarkUsed={markItemUsed}
                onClearUsed={clearUsedItems}
                onCollapse={toggleScriptPanel}
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
              style={{ width: `${getTranscriptionWidth()}px` }}
            >
              {/* Invisible resize handle on left edge */}
              <div 
                className="absolute top-0 left-0 w-2 h-full cursor-col-resize bg-transparent hover:bg-primary-500/20 transition-colors z-10"
                onMouseDown={(e) => startResize('transcription', e.clientX)}
                title="Drag to resize panel"
              />
              <TranscriptionPanel 
                transcriptions={transcriptions}
                liveTranscript={liveTranscript}
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
      {showMicrophoneDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMicrophoneDropdown(false)}
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
            final_microphone: selectedMicrophone
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
    </div>
  );
};

export default SplitViewCoaching;