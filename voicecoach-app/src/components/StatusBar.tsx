import { Mic, MicOff, Settings, Wifi, WifiOff, Database, Users, BarChart3, MessageSquare, Target, GraduationCap } from "lucide-react";

interface StatusBarProps {
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
  currentTime: Date;
  onSettingsClick: () => void;
  onKnowledgeBaseClick?: () => void;
  onUserTestingClick?: () => void;
  onFeedbackClick?: () => void;
  onAnalyticsClick?: () => void;
  onBetaOnboardingClick?: () => void;
  onPerformanceValidationClick?: () => void;
}

function StatusBar({ 
  appState, 
  currentTime, 
  onSettingsClick, 
  onKnowledgeBaseClick,
  onUserTestingClick,
  onFeedbackClick,
  onAnalyticsClick,
  onBetaOnboardingClick,
  onPerformanceValidationClick
}: StatusBarProps) {
  const formatCallDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-15 bg-slate-900/90 backdrop-blur-sm border-b border-slate-700 flex items-center justify-between px-6 drag-region">
      {/* Left - Connection Status */}
      <div className="flex items-center space-x-4 no-drag">
        <div className="flex items-center space-x-2">
          {appState.isConnected ? (
            <Wifi className="w-4 h-4 text-success-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-danger-400" />
          )}
          <span className="text-sm">
            {appState.isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        
        {appState.currentCall && (
          <div className="flex items-center space-x-3 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-success-400 animate-pulse"></div>
              <span>Live Call</span>
            </div>
            <span className="text-slate-400">|</span>
            <span>{formatCallDuration(appState.currentCall.duration)}</span>
            <span className="text-slate-400">|</span>
            <span>{appState.currentCall.participants} participants</span>
          </div>
        )}
      </div>

      {/* Center - VoiceCoach Branding */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">VC</span>
          </div>
          <span className="font-semibold text-lg">VoiceCoach</span>
          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">BETA</span>
        </div>
      </div>

      {/* Right - Recording Status & Controls */}
      <div className="flex items-center space-x-4 no-drag">
        <div className="flex items-center space-x-2">
          {appState.isRecording ? (
            <>
              <Mic className="w-4 h-4 text-success-400 animate-pulse" />
              <span className="text-sm text-success-400">Recording</span>
            </>
          ) : (
            <>
              <MicOff className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Ready</span>
            </>
          )}
        </div>
        
        <div className="text-xs text-slate-400">
          {currentTime.toLocaleTimeString()}
        </div>
        
        {/* Beta Testing Infrastructure Controls */}
        {onBetaOnboardingClick && (
          <button
            onClick={onBetaOnboardingClick}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Beta Tester Onboarding"
          >
            <GraduationCap className="w-4 h-4" />
          </button>
        )}
        
        {onUserTestingClick && (
          <button
            onClick={onUserTestingClick}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            title="User Testing Framework"
          >
            <Users className="w-4 h-4" />
          </button>
        )}
        
        {onFeedbackClick && (
          <button
            onClick={onFeedbackClick}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Feedback Collection"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}
        
        {onAnalyticsClick && (
          <button
            onClick={onAnalyticsClick}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Analytics Dashboard"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        )}
        
        {onPerformanceValidationClick && (
          <button
            onClick={onPerformanceValidationClick}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Performance Validation"
          >
            <Target className="w-4 h-4" />
          </button>
        )}
        
        {onKnowledgeBaseClick && (
          <button
            onClick={onKnowledgeBaseClick}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Knowledge Base Manager"
          >
            <Database className="w-4 h-4" />
          </button>
        )}
        
        <button
          onClick={onSettingsClick}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default StatusBar;