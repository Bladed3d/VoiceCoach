import React, { useState, useEffect } from 'react';
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
  Award,
  ChevronDown,
  Settings,
  Database
} from 'lucide-react';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

interface SplitViewCoachingProps {
  onNewDocument: () => void;
}

const SplitViewCoaching: React.FC<SplitViewCoachingProps> = ({ onNewDocument }) => {
  const trail = new BreadcrumbTrail('SplitViewCoaching');
  const [isRecording, setIsRecording] = useState(false);
  const [currentView, setCurrentView] = useState('Split View');
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [showMicrophoneDropdown, setShowMicrophoneDropdown] = useState(false);
  const [selectedMicrophone, setSelectedMicrophone] = useState('System Default');
  const [showKnowledgeBaseManager, setShowKnowledgeBaseManager] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [questionAnswers, setQuestionAnswers] = useState({
    q1_docType: 'Strategy or Process Document',
    q2_learningObjective: '',
    q3_businessChallenge: '',
    q4_successMetrics: '',
    q5_criticalConcepts: ['', '', '']
  });

  // Mock data for demonstration
  const [sessionData, setSessionData] = useState({
    duration: 0,
    stage: 'Opening',
    prompts: 0,
    talkRatio: { user: 50, prospect: 50 },
    responseTime: '0ms',
    effectiveness: 0
  });

  const [coachingPrompts] = useState([
    {
      id: 1,
      priority: 'critical',
      text: 'Ask about their budget constraints - they mentioned cost concerns 3 times',
      category: 'discovery'
    },
    {
      id: 2,
      priority: 'helpful',
      text: 'Reference the ROI case study from the document',
      category: 'value'
    }
  ]);

  const [transcriptions] = useState([
    {
      id: 1,
      speaker: 'prospect',
      text: 'We\'re looking at budget options...',
      timestamp: Date.now() - 30000
    },
    {
      id: 2,
      speaker: 'user',
      text: 'Based on our analysis...',
      timestamp: Date.now() - 15000
    }
  ]);

  useEffect(() => {
    // LED 6001: Split View initialized
    trail.light(6001, { 
      operation: 'split_view_init',
      timestamp: Date.now()
    });

    // Simulate session timer
    const timer = setInterval(() => {
      if (isRecording) {
        setSessionData(prev => ({
          ...prev,
          duration: prev.duration + 1000
        }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isRecording]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const handleStartSession = () => {
    trail.light(6010, { operation: 'session_start' });
    setIsRecording(true);
    setSessionData(prev => ({ ...prev, prompts: coachingPrompts.length }));
  };

  const handleStopSession = () => {
    trail.light(6011, { operation: 'session_stop' });
    setIsRecording(false);
  };

  const handleFileSelection = async () => {
    if (!window.electronAPI) {
      alert('Electron API not available');
      return;
    }
    
    try {
      const filePaths = await window.electronAPI.selectMultipleFiles();
      if (filePaths && filePaths.length > 0) {
        setSelectedFiles(filePaths);
        trail.light(6020, { operation: 'files_selected', count: filePaths.length });
      }
    } catch (error) {
      console.error('Error selecting files:', error);
      trail.light(8020, { operation: 'file_selection_error', error: error });
    }
  };

  const handleQuestionNavigation = (questionNumber: number) => {
    setCurrentQuestion(questionNumber);
    trail.light(6030, { operation: 'question_navigation', question: questionNumber });
  };

  const handleAnswerChange = (field: string, value: string | string[]) => {
    setQuestionAnswers(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestion < 5) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const getQuestionStatus = (questionNumber: number) => {
    if (questionNumber === currentQuestion) return 'current';
    if (questionNumber < currentQuestion) return 'completed';
    return 'pending';
  };

  const viewOptions = [
    'Split View',
    'Coaching Dashboard', 
    'Live Transcription',
    'AI Coaching',
    'Call Insights'
  ];

  const microphoneOptions = [
    'System Default',
    'Microphone (CURRENT)',
    'Video Call Audio',
    'Complete Audio Mix'
  ];

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
          {/* Left Side - Connection Status and View Dropdown */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-sm font-medium">Connected</span>
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
            <div className="flex items-center space-x-2 text-sm text-slate-300">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span>Ready</span>
              <span className="text-slate-400">2:12:05 AM</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <button className="p-1 hover:bg-slate-700 rounded">
                <MessageSquare className="w-4 h-4" />
              </button>
              <button className="p-1 hover:bg-slate-700 rounded">
                <Users className="w-4 h-4" />
              </button>
              <button className="p-1 hover:bg-slate-700 rounded">
                <BarChart3 className="w-4 h-4" />
              </button>
              <button className="p-1 hover:bg-slate-700 rounded">
                <TrendingUp className="w-4 h-4" />
              </button>
              <button 
                className="p-1 hover:bg-slate-700 rounded"
                onClick={() => setShowKnowledgeBaseManager(true)}
                title="Knowledge Base Manager"
              >
                <Database className="w-4 h-4" />
              </button>
              <button className="p-1 hover:bg-slate-700 rounded">
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
                    <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-700">
                      Audio Capture Modes
                    </div>
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
                        {option.includes('CURRENT') && (
                          <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                        )}
                        {option.includes('Video Call') && (
                          <span className="inline-block w-4 h-4 mr-2">📹</span>
                        )}
                        {option.includes('Complete') && (
                          <span className="inline-block w-4 h-4 mr-2">⚡</span>
                        )}
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {!isRecording ? (
                <button
                  onClick={handleStartSession}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Coaching Session</span>
                </button>
              ) : (
                <button
                  onClick={handleStopSession}
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

      {/* Main Coaching Title */}
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
            <div className="text-sm text-slate-400">
              <span>Mic: System Default</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="bg-slate-900 px-6 pb-4">
        <div className="grid grid-cols-6 gap-4">
          {/* Session Duration */}
          <div className="glass-panel p-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-primary-400" />
              <div>
                <div className="text-xs text-slate-400">Session</div>
                <div className="text-sm font-semibold">
                  {formatDuration(sessionData.duration)}
                </div>
              </div>
            </div>
          </div>

          {/* Current Stage */}
          <div className="glass-panel p-3">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-green-400" />
              <div>
                <div className="text-xs text-slate-400">Stage</div>
                <div className="text-sm font-semibold">{sessionData.stage}</div>
              </div>
            </div>
          </div>

          {/* Active Prompts */}
          <div className="glass-panel p-3">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-yellow-400" />
              <div>
                <div className="text-xs text-slate-400">Prompts</div>
                <div className="text-sm font-semibold">{sessionData.prompts}</div>
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
                  {sessionData.talkRatio.user}% / {sessionData.talkRatio.prospect}%
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
                <div className="text-sm font-semibold">{sessionData.responseTime}</div>
              </div>
            </div>
          </div>

          {/* Effectiveness */}
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

      {/* Split View Content */}
      <div className="flex-1 flex gap-6 px-6 min-h-0">
        {/* AI Coaching Assistant - Left Panel (2/3) */}
        <div className="flex-[2] glass-panel p-6 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">AI Coaching Assistant</h2>
            <button className="text-sm text-slate-400 hover:text-white">
              Clear History
            </button>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto">
            {!isRecording ? (
              <div className="text-center py-12">
                <Brain className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-400 mb-2">
                  Start coaching session for AI insights
                </h3>
                <p className="text-sm text-slate-500">
                  Get real-time suggestions from knowledge base
                </p>
              </div>
            ) : (
              <>
                {coachingPrompts.map((prompt) => (
                  <div 
                    key={prompt.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      prompt.priority === 'critical' 
                        ? 'bg-red-900/20 border-red-500' 
                        : 'bg-blue-900/20 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            prompt.priority === 'critical' 
                              ? 'bg-red-600 text-white' 
                              : 'bg-blue-600 text-white'
                          }`}>
                            {prompt.priority.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400 capitalize">
                            {prompt.category}
                          </span>
                        </div>
                        <p className="text-sm">{prompt.text}</p>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">
                          Copy
                        </button>
                        <button className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">
                          Used
                        </button>
                        <button className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Live Transcription - Right Panel (1/3) */}
        <div className="flex-1 glass-panel p-6 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-primary-400" />
              <h2 className="text-lg font-semibold">Live Transcription</h2>
              <span className="text-xs text-slate-400">({transcriptions.length} messages)</span>
            </div>
            <button className="text-sm text-slate-400 hover:text-white">Clear</button>
          </div>
          
          <div className="flex-1 space-y-3 overflow-y-auto">
            {!isRecording ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-sm text-slate-400">
                  📝 Start recording to see transcriptions
                </p>
              </div>
            ) : transcriptions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">
                  🎙️ Listening for speech...
                </p>
              </div>
            ) : (
              <>
                {transcriptions.map((t) => (
                  <div 
                    key={t.id} 
                    className={`text-sm p-3 rounded ${
                      t.speaker === 'user' 
                        ? 'bg-blue-900/20 text-blue-300' 
                        : 'bg-purple-900/20 text-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">
                        {t.speaker === 'user' ? '🎤 You' : '🎧 Prospect'}
                      </span>
                      <span className="text-xs opacity-60">
                        {new Date(t.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="break-words">{t.text}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Click outside handler for dropdowns */}
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

      {/* Knowledge Base Manager Modal */}
      {showKnowledgeBaseManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[90%] max-w-4xl h-[90%] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-pink-500 rounded-md flex items-center justify-center">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Knowledge Base Manager</h2>
              </div>
              <button 
                onClick={() => setShowKnowledgeBaseManager(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-6 overflow-y-auto text-gray-900">
              <div className="text-center py-4">
                <p className="text-lg text-gray-600 mb-6">Loading statistics...</p>
                
                {/* Action Buttons - Less prominent */}
                <div className="flex justify-center space-x-2 mb-8">
                  <button className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                    📊 Refresh Stats
                  </button>
                  <button className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                    ✓ Validate Knowledge Base
                  </button>
                  <button className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600">
                    🧠 Research Document
                  </button>
                  <button className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600">
                    📋 Create Use Case Examples
                  </button>
                </div>

                {/* Main Content Area */}
                <div className="max-w-4xl mx-auto">
                  {/* Brain Icon and Reset Default */}
                  <div className="flex justify-center items-center mb-6">
                    <div className="w-8 h-8 bg-pink-500 rounded-md flex items-center justify-center mr-4">
                      <Database className="w-5 h-5 text-white" />
                    </div>
                    <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                      Reset Default
                    </button>
                  </div>

                  {/* Document Analysis Focus Section */}
                  <div className="mb-6">
                    <h3 className="text-left font-semibold mb-2">📄 Document Analysis Focus (Extraction priorities for this document type):</h3>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <button className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                          💾 Save
                        </button>
                        <button className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                          📂 Load
                        </button>
                        <button className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
                          ❌
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 5 Question Progress Circles */}
                  <div className="flex justify-center items-center space-x-4 mb-6">
                    <div className="flex items-center">
                      <span className="text-sm mr-2">Question {currentQuestion} of 5</span>
                      <div className="flex space-x-2">
                        {[1, 2, 3, 4, 5].map((questionNum, index) => (
                          <React.Fragment key={questionNum}>
                            <button
                              onClick={() => handleQuestionNavigation(questionNum)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold cursor-pointer hover:scale-110 transition-transform ${
                                getQuestionStatus(questionNum) === 'completed' 
                                  ? 'bg-green-500 text-white' 
                                  : getQuestionStatus(questionNum) === 'current'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-300 text-gray-600'
                              }`}
                            >
                              {getQuestionStatus(questionNum) === 'completed' ? '✓' : questionNum}
                            </button>
                            {index < 4 && <div className={`w-2 h-2 rounded-full mt-3 ${
                              getQuestionStatus(questionNum) === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                            }`}></div>}
                          </React.Fragment>
                        ))}
                      </div>
                      <span className="text-sm ml-4 text-green-600">
                        {Object.values(questionAnswers).some(answer => 
                          Array.isArray(answer) ? answer.some(a => a) : answer
                        ) ? '✓ Using saved answers' : 'No saved answers'}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button className="bg-gray-500 text-white px-3 py-1 rounded text-sm">Reset</button>
                      <button className="bg-red-500 text-white px-3 py-1 rounded text-sm">Clear Saved</button>
                    </div>
                  </div>

                  {/* Current Question */}
                  <div className="bg-gray-50 p-6 rounded-lg mb-6 text-left">
                    {currentQuestion === 1 && (
                      <>
                        <h3 className="text-lg font-semibold mb-4">What type of document are you uploading?</h3>
                        <div className="space-y-3">
                          <label className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-white cursor-pointer">
                            <input 
                              type="radio" 
                              name="docType" 
                              className="mt-1" 
                              checked={questionAnswers.q1_docType === 'Strategy or Process Document'}
                              onChange={() => handleAnswerChange('q1_docType', 'Strategy or Process Document')}
                            />
                            <div>
                              <div className="font-medium">Strategy or Process Document</div>
                              <div className="text-sm text-gray-600">methodologies, frameworks, best practices</div>
                            </div>
                          </label>
                          
                          <label className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-white cursor-pointer">
                            <input 
                              type="radio" 
                              name="docType" 
                              className="mt-1" 
                              checked={questionAnswers.q1_docType === 'Product or Service Knowledge'}
                              onChange={() => handleAnswerChange('q1_docType', 'Product or Service Knowledge')}
                            />
                            <div>
                              <div className="font-medium">Product or Service Knowledge</div>
                              <div className="text-sm text-gray-600">features, specifications, benefits</div>
                            </div>
                          </label>
                          
                          <label className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-white cursor-pointer">
                            <input 
                              type="radio" 
                              name="docType" 
                              className="mt-1" 
                              checked={questionAnswers.q1_docType === 'Sales Scripts'}
                              onChange={() => handleAnswerChange('q1_docType', 'Sales Scripts')}
                            />
                            <div>
                              <div className="font-medium">Sales Scripts</div>
                              <div className="text-sm text-gray-600">call flows, talk tracks, dialogues</div>
                            </div>
                          </label>
                        </div>
                      </>
                    )}

                    {currentQuestion === 2 && (
                      <>
                        <h3 className="text-lg font-semibold mb-4">What do you want your team to learn from this document?</h3>
                        <p className="text-gray-600 mb-4">Be specific - what knowledge or skills should they gain?</p>
                        <textarea
                          className="w-full h-32 p-3 border rounded-lg resize-none"
                          placeholder="Example: I want them to understand how to use mirroring and labeling techniques to build rapport and handle objections without seeming pushy"
                          value={questionAnswers.q2_learningObjective}
                          onChange={(e) => handleAnswerChange('q2_learningObjective', e.target.value)}
                        />
                      </>
                    )}

                    {currentQuestion === 3 && (
                      <>
                        <h3 className="text-lg font-semibold mb-4">Why do you want them to know this?</h3>
                        <p className="text-gray-600 mb-4">What problems will this solve or what outcomes will this achieve?</p>
                        <textarea
                          className="w-full h-32 p-3 border rounded-lg resize-none"
                          placeholder="Example: Our team struggles with price objections and often drops price too quickly. This document teaches how to redirect the conversation to value instead"
                          value={questionAnswers.q3_businessChallenge}
                          onChange={(e) => handleAnswerChange('q3_businessChallenge', e.target.value)}
                        />
                      </>
                    )}

                    {currentQuestion === 4 && (
                      <>
                        <h3 className="text-lg font-semibold mb-4">What does success look like?</h3>
                        <p className="text-gray-600 mb-4">What does success look like for your team after adding this document to the app?</p>
                        <textarea
                          className="w-full h-32 p-3 border rounded-lg resize-none"
                          placeholder="Example: Reps confidently handle price objections without immediately offering discounts, they keep prospects engaged longer in discovery calls, and they close 20% more deals at full price"
                          value={questionAnswers.q4_successMetrics}
                          onChange={(e) => handleAnswerChange('q4_successMetrics', e.target.value)}
                        />
                      </>
                    )}

                    {currentQuestion === 5 && (
                      <>
                        <h3 className="text-lg font-semibold mb-4">Must-Know Concepts (Optional)</h3>
                        <p className="text-gray-600 mb-4">Are there specific techniques or concepts that are absolutely critical? List 2-3 if applicable</p>
                        <div className="space-y-3">
                          <input
                            type="text"
                            className="w-full p-3 border rounded-lg"
                            placeholder="1. Enter critical concept (optional)"
                            value={questionAnswers.q5_criticalConcepts[0]}
                            onChange={(e) => {
                              const newConcepts = [...questionAnswers.q5_criticalConcepts];
                              newConcepts[0] = e.target.value;
                              handleAnswerChange('q5_criticalConcepts', newConcepts);
                            }}
                          />
                          <input
                            type="text"
                            className="w-full p-3 border rounded-lg"
                            placeholder="2. Enter critical concept (optional)"
                            value={questionAnswers.q5_criticalConcepts[1]}
                            onChange={(e) => {
                              const newConcepts = [...questionAnswers.q5_criticalConcepts];
                              newConcepts[1] = e.target.value;
                              handleAnswerChange('q5_criticalConcepts', newConcepts);
                            }}
                          />
                          <input
                            type="text"
                            className="w-full p-3 border rounded-lg"
                            placeholder="3. Enter critical concept (optional)"
                            value={questionAnswers.q5_criticalConcepts[2]}
                            onChange={(e) => {
                              const newConcepts = [...questionAnswers.q5_criticalConcepts];
                              newConcepts[2] = e.target.value;
                              handleAnswerChange('q5_criticalConcepts', newConcepts);
                            }}
                          />
                        </div>
                      </>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-6">
                      <button 
                        onClick={handlePreviousQuestion}
                        disabled={currentQuestion === 1}
                        className={`px-4 py-2 rounded ${
                          currentQuestion === 1 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-gray-500 text-white hover:bg-gray-600'
                        }`}
                      >
                        Back
                      </button>
                      
                      {currentQuestion === 5 ? (
                        <button 
                          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold"
                          onClick={() => {
                            // Launch AI processing
                            trail.light(6040, { operation: 'ai_processing_started', answers: questionAnswers });
                            // Process the documents with the questionnaire answers
                            console.log('🚀 Starting AI processing with:', questionAnswers);
                          }}
                        >
                          Complete Setup
                        </button>
                      ) : (
                        <button 
                          onClick={handleNextQuestion}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          Next
                        </button>
                      )}
                    </div>

                  </div>

                  {/* File Upload Section - Lower priority */}
                  <div className="border-t pt-6">
                    <h4 className="text-left font-semibold mb-4">Select Directory with Sales Documents</h4>
                    <button className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 mb-4">
                      📁 Select Directory
                    </button>
                    
                    <div className="mb-6">
                      <h4 className="text-left font-semibold mb-2">Or Upload Individual Files (PDF, TXT, MD)</h4>
                      <button 
                        onClick={handleFileSelection}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mr-3"
                      >
                        Choose Files
                      </button>
                      <span className="text-gray-500">
                        {selectedFiles.length > 0 
                          ? `${selectedFiles.length} file(s) selected` 
                          : 'No file chosen'
                        }
                      </span>
                      {selectedFiles.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="truncate">📄 {file.split(/[/\\]/).pop()}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Knowledge Base Documents */}
                    <div className="bg-blue-50 p-4 rounded-lg mb-6">
                      <h4 className="text-left font-semibold mb-2 text-blue-800">Knowledge Base Documents:</h4>
                      <div className="flex items-center mb-2">
                        <input type="checkbox" checked className="mr-2" />
                        <span className="text-sm text-blue-700">Check files to use for live coaching suggestions</span>
                      </div>
                      <div className="flex items-center justify-between bg-white p-2 rounded">
                        <div className="flex items-center">
                          <input type="checkbox" checked className="mr-2" />
                          <span>📄 NeverSplitSummary.txt</span>
                          <span className="ml-2 text-orange-600">⚠️ Awaiting analysis</span>
                          <span className="ml-2 bg-yellow-200 px-2 py-1 rounded text-xs">New Upload</span>
                        </div>
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:underline text-sm">📥 Download</button>
                          <button className="text-red-600 hover:underline text-sm">🗑️ Remove</button>
                        </div>
                      </div>
                    </div>

                    {/* Search Section */}
                    <div className="border-t pt-6">
                      <div className="flex">
                        <input 
                          type="text" 
                          placeholder="Search for sales knowledge, objection handling, product info..."
                          className="flex-1 px-4 py-2 border rounded-l-md"
                        />
                        <button className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700">
                          🔍 Search
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SplitViewCoaching;