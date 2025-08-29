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
  TrendingUp
} from 'lucide-react';

// Modular imports
import { useCoachingSession } from '../hooks/useCoachingSession';
import { VolumeIndicator } from './common/VolumeIndicator';
import { CoachingPanel } from './coaching/CoachingPanel';
import { TranscriptionPanel } from './coaching/TranscriptionPanel';
import { KnowledgeBaseModal } from './modals/KnowledgeBaseModal';
import { QuestionnaireAnswers } from '../types/questionnaire';

interface SplitViewCoachingProps {
  onNewDocument?: () => void;
}

const SplitViewCoaching: React.FC<SplitViewCoachingProps> = () => {
  // Modular session management
  const { sessionState, isInitialized, startSession, stopSession, clearTranscriptions, clearCoachingPrompts } = useCoachingSession();
  
  // Local UI state only
  const [showKnowledgeBaseManager, setShowKnowledgeBaseManager] = useState(false);
  const [currentView, setCurrentView] = useState('Split View');
  const [selectedMicrophone, setSelectedMicrophone] = useState('System Default');
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [showMicrophoneDropdown, setShowMicrophoneDropdown] = useState(false);

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

  const handleKnowledgeBaseComplete = async (answers: QuestionnaireAnswers, files: string[]) => {
    console.log('✅ Knowledge base setup completed:', { answers, files });
    // TODO: Process knowledge base setup
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
              <button className="p-1 hover:bg-slate-700 rounded"><MessageSquare className="w-4 h-4" /></button>
              <button className="p-1 hover:bg-slate-700 rounded"><Users className="w-4 h-4" /></button>
              <button className="p-1 hover:bg-slate-700 rounded"><BarChart3 className="w-4 h-4" /></button>
              <button className="p-1 hover:bg-slate-700 rounded"><TrendingUp className="w-4 h-4" /></button>
              <button 
                className="p-1 hover:bg-slate-700 rounded"
                onClick={() => setShowKnowledgeBaseManager(true)}
                title="Knowledge Base Manager"
              >
                <Database className="w-4 h-4" />
              </button>
              <button className="p-1 hover:bg-slate-700 rounded"><Settings className="w-4 h-4" /></button>
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
                          setSelectedMicrophone(option);
                          setShowMicrophoneDropdown(false);
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
        <div className="grid grid-cols-6 gap-4">
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

      {/* Split View Content - Modular Components */}
      <div className="flex-1 flex gap-6 px-6 min-h-0">
        <CoachingPanel 
          coachingPrompts={coachingPrompts}
          isRecording={isRecording}
          onClearHistory={clearCoachingPrompts}
        />
        <TranscriptionPanel 
          transcriptions={transcriptions}
          liveTranscript={liveTranscript}
          isRecording={isRecording}
          onClear={clearTranscriptions}
        />
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

      {/* Knowledge Base Modal */}
      <KnowledgeBaseModal
        isOpen={showKnowledgeBaseManager}
        onClose={() => setShowKnowledgeBaseManager(false)}
        onComplete={handleKnowledgeBaseComplete}
      />
    </div>
  );
};

export default SplitViewCoaching;