import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Monitor, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Download,
  Play,
  Pause,
  Square,
  BarChart3,
  UserCheck
} from 'lucide-react';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

interface TestSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  sessionType: 'guided_test' | 'real_call' | 'feature_test';
  startTime: Date;
  endTime?: Date;
  duration?: number; // in milliseconds
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  
  // Performance Metrics
  callSuccessMetrics: {
    coachingPromptsUsed: number;
    effectivePrompts: number;
    averageResponseTime: number;
    userSatisfactionScore?: number;
    callOutcome?: 'closed' | 'follow_up' | 'rejected' | 'no_outcome';
  };
  
  // Technical Performance
  technicalMetrics: {
    averageLatency: number;
    transcriptionAccuracy: number;
    errorCount: number;
    crashCount: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  
  // User Behavior Analytics
  behaviorMetrics: {
    featuresUsed: string[];
    timeInTabs: Record<string, number>;
    clickHeatmap: Array<{ element: string; count: number; timestamp: number }>;
    scrollBehavior: Array<{ section: string; timeSpent: number }>;
    keyboardShortcutsUsed: number;
  };
  
  // Feedback Data
  feedbackCollected: {
    coachingQuality: number; // 1-5 scale
    userExperience: number; // 1-5 scale
    technicalPerformance: number; // 1-5 scale
    overallSatisfaction: number; // 1-5 scale
    comments: string;
    suggestedImprovements: string[];
    wouldRecommend: boolean;
  };
  
  // Session Recording Data
  sessionRecording: {
    screenRecordingPath?: string;
    audioRecordingPath?: string;
    interactionLog: Array<{
      timestamp: number;
      action: string;
      element: string;
      data: any;
    }>;
    errorLog: Array<{
      timestamp: number;
      error: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      stackTrace?: string;
    }>;
  };
}

interface UserTestingFrameworkProps {
  isVisible: boolean;
  onClose: () => void;
  currentUserId?: string;
  isRecording: boolean;
}

const UserTestingFramework: React.FC<UserTestingFrameworkProps> = ({
  isVisible,
  onClose,
  currentUserId = 'anonymous',
  isRecording
}) => {
  const trail = new BreadcrumbTrail('UserTestingFramework');
  
  const [currentSession, setCurrentSession] = useState<TestSession | null>(null);
  const [allSessions, setAllSessions] = useState<TestSession[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionMetrics, setSessionMetrics] = useState({
    totalSessions: 0,
    activeSessions: 0,
    averageSessionTime: 0,
    successRate: 0,
    userSatisfaction: 0
  });
  
  // Performance monitoring state
  const [performanceData, setPerformanceData] = useState({
    memoryUsage: 0,
    cpuUsage: 0,
    networkLatency: 0,
    errorRate: 0
  });
  
  // Real-time analytics tracking
  const [analyticsData, setAnalyticsData] = useState({
    clicksPerMinute: 0,
    featuresUsed: new Set<string>(),
    timeSpentInApp: 0,
    sessionStartTime: Date.now()
  });

  // Initialize testing framework
  useEffect(() => {
    trail.light(500, { operation: 'user_testing_framework_init' });
    
    // Load existing sessions from localStorage
    const savedSessions = localStorage.getItem('voicecoach_test_sessions');
    if (savedSessions) {
      try {
        const sessions = JSON.parse(savedSessions);
        setAllSessions(sessions);
        updateSessionMetrics(sessions);
      } catch (error) {
        trail.fail(500, error as Error);
      }
    }
    
    // Start performance monitoring
    startPerformanceMonitoring();
    
    return () => {
      stopPerformanceMonitoring();
    };
  }, []);

  // Performance monitoring functions
  const startPerformanceMonitoring = useCallback(() => {
    trail.light(501, { operation: 'performance_monitoring_start' });
    
    const interval = setInterval(() => {
      // Mock performance data collection
      // In real implementation, this would collect actual system metrics
      setPerformanceData(prev => ({
        memoryUsage: Math.random() * 100,
        cpuUsage: Math.random() * 50,
        networkLatency: 50 + Math.random() * 100,
        errorRate: Math.random() * 2
      }));
      
      // Update analytics
      setAnalyticsData(prev => ({
        ...prev,
        timeSpentInApp: Date.now() - prev.sessionStartTime,
        clicksPerMinute: prev.clicksPerMinute + Math.random() * 5
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const stopPerformanceMonitoring = useCallback(() => {
    trail.light(502, { operation: 'performance_monitoring_stop' });
  }, []);

  // Session management functions
  const startTestSession = useCallback((sessionType: TestSession['sessionType']) => {
    trail.light(503, { operation: 'test_session_start', sessionType });
    
    const newSession: TestSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: currentUserId,
      userName: `TestUser_${currentUserId}`,
      userEmail: `testuser${currentUserId}@example.com`,
      sessionType,
      startTime: new Date(),
      status: 'active',
      callSuccessMetrics: {
        coachingPromptsUsed: 0,
        effectivePrompts: 0,
        averageResponseTime: 0
      },
      technicalMetrics: {
        averageLatency: 0,
        transcriptionAccuracy: 0,
        errorCount: 0,
        crashCount: 0,
        memoryUsage: 0,
        cpuUsage: 0
      },
      behaviorMetrics: {
        featuresUsed: [],
        timeInTabs: {},
        clickHeatmap: [],
        scrollBehavior: [],
        keyboardShortcutsUsed: 0
      },
      feedbackCollected: {
        coachingQuality: 0,
        userExperience: 0,
        technicalPerformance: 0,
        overallSatisfaction: 0,
        comments: '',
        suggestedImprovements: [],
        wouldRecommend: false
      },
      sessionRecording: {
        interactionLog: [],
        errorLog: []
      }
    };
    
    setCurrentSession(newSession);
    setIsSessionActive(true);
    
    // Start session recording
    startSessionRecording(newSession.id);
  }, [currentUserId]);

  const endTestSession = useCallback(() => {
    if (!currentSession) return;
    
    trail.light(504, { operation: 'test_session_end', sessionId: currentSession.id });
    
    const updatedSession: TestSession = {
      ...currentSession,
      endTime: new Date(),
      duration: Date.now() - currentSession.startTime.getTime(),
      status: 'completed',
      technicalMetrics: {
        ...currentSession.technicalMetrics,
        averageLatency: performanceData.networkLatency,
        memoryUsage: performanceData.memoryUsage,
        cpuUsage: performanceData.cpuUsage
      }
    };
    
    const updatedSessions = [...allSessions, updatedSession];
    setAllSessions(updatedSessions);
    updateSessionMetrics(updatedSessions);
    
    // Save to localStorage
    localStorage.setItem('voicecoach_test_sessions', JSON.stringify(updatedSessions));
    
    setCurrentSession(null);
    setIsSessionActive(false);
    
    // Stop session recording
    stopSessionRecording();
  }, [currentSession, allSessions, performanceData]);

  const startSessionRecording = useCallback((sessionId: string) => {
    trail.light(505, { operation: 'session_recording_start', sessionId });
    // In real implementation, this would start screen/audio recording
    console.log(`📹 Started session recording for: ${sessionId}`);
  }, []);

  const stopSessionRecording = useCallback(() => {
    trail.light(506, { operation: 'session_recording_stop' });
    console.log('⏹️ Stopped session recording');
  }, []);

  const updateSessionMetrics = useCallback((sessions: TestSession[]) => {
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const activeSessions = sessions.filter(s => s.status === 'active');
    
    const averageTime = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length
      : 0;
    
    const successRate = completedSessions.length > 0
      ? (completedSessions.filter(s => s.callSuccessMetrics.callOutcome === 'closed').length / completedSessions.length) * 100
      : 0;
    
    const satisfaction = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + s.feedbackCollected.overallSatisfaction, 0) / completedSessions.length
      : 0;
    
    setSessionMetrics({
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      averageSessionTime: averageTime,
      successRate,
      userSatisfaction: satisfaction
    });
  }, []);

  // Track user interactions
  const trackUserInteraction = useCallback((action: string, element: string, data?: any) => {
    if (!currentSession) return;
    
    const interaction = {
      timestamp: Date.now(),
      action,
      element,
      data
    };
    
    setCurrentSession(prev => prev ? {
      ...prev,
      sessionRecording: {
        ...prev.sessionRecording,
        interactionLog: [...prev.sessionRecording.interactionLog, interaction]
      }
    } : null);
  }, [currentSession]);

  // Export session data
  const exportSessionData = useCallback(() => {
    trail.light(507, { operation: 'export_session_data' });
    
    const exportData = {
      sessions: allSessions,
      metrics: sessionMetrics,
      performanceData,
      analyticsData,
      exportTime: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voicecoach_test_data_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [allSessions, sessionMetrics, performanceData, analyticsData]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-full max-w-6xl max-h-[95vh] m-4 bg-slate-900 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">User Testing Framework</h2>
            {isSessionActive && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-red-900/50 rounded-full">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                <span className="text-red-300 text-sm font-medium">Recording Session</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex h-[80vh]">
          {/* Left Panel - Session Controls */}
          <div className="w-80 border-r border-slate-700 bg-slate-850 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Session Controls</h3>
            
            {/* Active Session Display */}
            {currentSession && (
              <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-blue-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-400 font-medium">Active Session</span>
                  <span className="text-green-400 text-sm">{currentSession.sessionType}</span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>ID: {currentSession.id.substring(0, 12)}...</div>
                  <div>Started: {currentSession.startTime.toLocaleTimeString()}</div>
                  <div>Duration: {Math.floor((Date.now() - currentSession.startTime.getTime()) / 1000)}s</div>
                </div>
              </div>
            )}
            
            {/* Session Type Selection */}
            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-medium text-slate-300">Start New Test Session</h4>
              
              <button
                onClick={() => startTestSession('guided_test')}
                disabled={isSessionActive}
                className="w-full flex items-center space-x-2 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-400 rounded-lg text-sm font-medium transition-colors"
              >
                <UserCheck className="w-4 h-4" />
                <span>Guided Test Session</span>
              </button>
              
              <button
                onClick={() => startTestSession('real_call')}
                disabled={isSessionActive}
                className="w-full flex items-center space-x-2 p-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-400 rounded-lg text-sm font-medium transition-colors"
              >
                <Monitor className="w-4 h-4" />
                <span>Real Call Testing</span>
              </button>
              
              <button
                onClick={() => startTestSession('feature_test')}
                disabled={isSessionActive}
                className="w-full flex items-center space-x-2 p-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-400 rounded-lg text-sm font-medium transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Feature Testing</span>
              </button>
              
              {isSessionActive && (
                <button
                  onClick={endTestSession}
                  className="w-full flex items-center space-x-2 p-3 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <Square className="w-4 h-4" />
                  <span>End Session</span>
                </button>
              )}
            </div>
            
            {/* Quick Metrics */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300">Session Metrics</h4>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-800 rounded">
                  <div className="text-slate-400">Total Sessions</div>
                  <div className="text-white font-medium">{sessionMetrics.totalSessions}</div>
                </div>
                <div className="p-2 bg-slate-800 rounded">
                  <div className="text-slate-400">Active</div>
                  <div className="text-green-400 font-medium">{sessionMetrics.activeSessions}</div>
                </div>
                <div className="p-2 bg-slate-800 rounded">
                  <div className="text-slate-400">Avg Time</div>
                  <div className="text-white font-medium">
                    {Math.floor(sessionMetrics.averageSessionTime / 60000)}m
                  </div>
                </div>
                <div className="p-2 bg-slate-800 rounded">
                  <div className="text-slate-400">Success Rate</div>
                  <div className="text-blue-400 font-medium">{sessionMetrics.successRate.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Analytics Dashboard */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Real-time Analytics</h3>
              <button
                onClick={exportSessionData}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Data</span>
              </button>
            </div>
            
            {/* Performance Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Memory Usage</span>
                  <Monitor className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-xl font-bold text-white">{performanceData.memoryUsage.toFixed(1)}%</div>
                <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(performanceData.memoryUsage, 100)}%` }}
                  />
                </div>
              </div>
              
              <div className="p-4 bg-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">CPU Usage</span>
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-xl font-bold text-white">{performanceData.cpuUsage.toFixed(1)}%</div>
                <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(performanceData.cpuUsage, 100)}%` }}
                  />
                </div>
              </div>
              
              <div className="p-4 bg-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Network Latency</span>
                  <Clock className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="text-xl font-bold text-white">{performanceData.networkLatency.toFixed(0)}ms</div>
                <div className={`text-xs mt-1 ${
                  performanceData.networkLatency < 100 ? 'text-green-400' :
                  performanceData.networkLatency < 200 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {performanceData.networkLatency < 100 ? 'Excellent' :
                   performanceData.networkLatency < 200 ? 'Good' : 'Poor'}
                </div>
              </div>
              
              <div className="p-4 bg-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Error Rate</span>
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-xl font-bold text-white">{performanceData.errorRate.toFixed(2)}%</div>
                <div className={`text-xs mt-1 ${
                  performanceData.errorRate < 1 ? 'text-green-400' :
                  performanceData.errorRate < 3 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {performanceData.errorRate < 1 ? 'Stable' :
                   performanceData.errorRate < 3 ? 'Moderate' : 'High'}
                </div>
              </div>
            </div>

            {/* Session History */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Recent Test Sessions</span>
              </h4>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {allSessions.slice(-5).reverse().map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-slate-700 rounded">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">{session.sessionType.replace('_', ' ')}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          session.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                          session.status === 'active' ? 'bg-blue-900/50 text-blue-400' :
                          session.status === 'failed' ? 'bg-red-900/50 text-red-400' :
                          'bg-gray-900/50 text-gray-400'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {session.startTime.toLocaleDateString()} {session.startTime.toLocaleTimeString()}
                        {session.duration && ` • ${Math.floor(session.duration / 60000)}m ${Math.floor((session.duration % 60000) / 1000)}s`}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>Prompts: {session.callSuccessMetrics.coachingPromptsUsed}</div>
                      {session.feedbackCollected.overallSatisfaction > 0 && (
                        <div>Rating: {session.feedbackCollected.overallSatisfaction}/5</div>
                      )}
                    </div>
                  </div>
                ))}
                
                {allSessions.length === 0 && (
                  <div className="text-center text-slate-400 py-8">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No test sessions recorded yet</p>
                    <p className="text-sm">Start a session to begin collecting data</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserTestingFramework;