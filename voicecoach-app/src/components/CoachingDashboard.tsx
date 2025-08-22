/**
 * VoiceCoach Coaching Dashboard
 * 
 * Comprehensive real-time coaching dashboard that displays:
 * - Live conversation flow and performance metrics
 * - Intelligent coaching triggers and prompts
 * - Sales stage progression and effectiveness tracking
 * - System performance and response time monitoring
 */

import { useState } from "react";
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Clock, 
  MessageSquare, 
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Activity,
  Users,
  Zap,
  BarChart3,
  Timer,
  Award
} from "lucide-react";
import { BreadcrumbTrail } from "../lib/breadcrumb-system";
import type { 
  ConversationContext, 
  CoachingPrompt, 
  PerformanceMetrics, 
  CoachingTrigger,
  SalesStage 
} from "../hooks/useCoachingOrchestrator";

interface CoachingDashboardProps {
  conversationContext: ConversationContext;
  coachingPrompts: CoachingPrompt[];
  performanceMetrics: PerformanceMetrics;
  activeTriggers: CoachingTrigger[];
  isProcessing: boolean;
  isRecording: boolean;
  onPromptUsed: (promptId: string) => void;
  onPromptDismissed: (promptId: string) => void;
  averageResponseTime: number;
  coachingEffectiveness: number;
}

function CoachingDashboard({
  conversationContext,
  coachingPrompts,
  performanceMetrics,
  activeTriggers,
  isProcessing,
  isRecording,
  onPromptUsed,
  onPromptDismissed,
  averageResponseTime,
  coachingEffectiveness
}: CoachingDashboardProps) {
  const trail = new BreadcrumbTrail('CoachingDashboard');
  
  // LED 700: Dashboard initialization
  trail.light(700, { 
    operation: 'coaching_dashboard_init',
    isRecording,
    currentStage: conversationContext.currentStage,
    promptsCount: coachingPrompts.length
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'prompts' | 'analytics' | 'performance'>('overview');
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  // Sort prompts by priority and timestamp
  const sortedPrompts = coachingPrompts
    .sort((a, b) => {
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

  // Get priority prompts
  const criticalPrompts = sortedPrompts.filter(p => p.priority === 'critical');

  // Stage progression visualization
  const stageOrder: SalesStage[] = ['opening', 'discovery', 'presentation', 'objection_handling', 'closing', 'follow_up'];
  const currentStageIndex = stageOrder.indexOf(conversationContext.currentStage);

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

  const getStageColor = (stage: SalesStage, isCurrent: boolean) => {
    if (isCurrent) return 'bg-primary-500 text-white';
    const completed = stageOrder.indexOf(stage) < currentStageIndex;
    return completed ? 'bg-success-500 text-white' : 'bg-slate-600 text-slate-300';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-900/20 text-red-300';
      case 'high': return 'border-orange-500 bg-orange-900/20 text-orange-300';
      case 'medium': return 'border-yellow-500 bg-yellow-900/20 text-yellow-300';
      case 'low': return 'border-blue-500 bg-blue-900/20 text-blue-300';
      default: return 'border-slate-500 bg-slate-900/20 text-slate-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <Target className="w-4 h-4" />;
      case 'medium': return <Lightbulb className="w-4 h-4" />;
      case 'low': return <MessageSquare className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  // LED 701: Dashboard render cycle
  trail.light(701, { 
    operation: 'dashboard_render',
    activeTab,
    promptsCount: coachingPrompts.length,
    isProcessing
  });

  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* Header Stats Bar */}
      <div className="grid grid-cols-6 gap-4">
        {/* Session Duration */}
        <div className="glass-panel p-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-primary-400" />
            <div>
              <div className="text-xs text-slate-400">Session</div>
              <div className="text-sm font-semibold">
                {formatDuration(conversationContext.duration)}
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
                {criticalPrompts.length > 0 && (
                  <span className="ml-1 text-red-400">({criticalPrompts.length}!)</span>
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
                {averageResponseTime.toFixed(0)}ms
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
                {coachingEffectiveness.toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'prompts', label: 'Live Prompts', icon: Brain },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          { id: 'performance', label: 'Performance', icon: Activity }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              // LED 702: Tab change
              trail.light(702, { 
                user_action: 'tab_change',
                previousTab: activeTab,
                newTab: tab.id
              });
              setActiveTab(tab.id as any);
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
              activeTab === tab.id 
                ? 'bg-primary-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Sales Stage Progression */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Target className="w-5 h-5 text-primary-400" />
                <span>Sales Stage Progression</span>
              </h3>
              
              <div className="space-y-3">
                {stageOrder.map((stage, index) => (
                  <div key={stage} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${getStageColor(stage, stage === conversationContext.currentStage)}`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="capitalize font-medium">
                        {stage.replace('_', ' ')}
                      </div>
                      {stage === conversationContext.currentStage && (
                        <div className="text-xs text-primary-400">Current Stage</div>
                      )}
                    </div>
                    {stage === conversationContext.currentStage && (
                      <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity & Triggers */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Activity className="w-5 h-5 text-success-400" />
                <span>Recent Activity</span>
              </h3>

              <div className="space-y-3">
                {/* Active Triggers */}
                {activeTriggers.slice(0, 3).map(trigger => (
                  <div key={trigger.id} className="flex items-start space-x-3 p-3 bg-slate-800/50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      trigger.priority === 'critical' ? 'bg-red-400' :
                      trigger.priority === 'high' ? 'bg-orange-400' :
                      'bg-yellow-400'
                    }`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium capitalize">
                        {trigger.type.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {trigger.suggestedAction}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {trigger.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Key Topics */}
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">Key Topics Discussed</div>
                  <div className="flex flex-wrap gap-2">
                    {conversationContext.keyTopics.slice(0, 6).map(topic => (
                      <span key={topic} className="px-2 py-1 bg-primary-900/30 text-primary-300 text-xs rounded-full">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'prompts' && (
          <div className="glass-panel p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Brain className="w-5 h-5 text-primary-400" />
                <span>Live Coaching Prompts</span>
              </h3>
              {isProcessing && (
                <div className="flex items-center space-x-2 text-yellow-400">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-sm">Processing...</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {sortedPrompts.length === 0 && !isRecording && (
                <div className="text-center text-slate-400 mt-12">
                  <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No coaching prompts yet</p>
                  <p className="text-sm mt-1">Start recording to receive AI coaching suggestions</p>
                </div>
              )}

              {sortedPrompts.length === 0 && isRecording && (
                <div className="text-center text-slate-400 mt-12">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
                  <p>Analyzing conversation...</p>
                  <p className="text-sm mt-1">AI coaching prompts will appear here</p>
                </div>
              )}

              {sortedPrompts.map(prompt => (
                <div 
                  key={prompt.id} 
                  className={`border-l-4 p-4 rounded-lg cursor-pointer transition-all duration-200 ${getPriorityColor(prompt.priority)} ${
                    selectedPrompt === prompt.id ? 'ring-2 ring-primary-500/50' : ''
                  }`}
                  onClick={() => {
                    // LED 703: Prompt selected
                    trail.light(703, { 
                      user_action: 'prompt_selected',
                      promptId: prompt.id,
                      promptType: prompt.type,
                      priority: prompt.priority
                    });
                    setSelectedPrompt(prompt.id === selectedPrompt ? null : prompt.id);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getPriorityIcon(prompt.priority)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">{prompt.title}</span>
                          <span className="px-2 py-1 bg-slate-700 text-xs rounded-full">
                            {prompt.source.replace('_', ' ')}
                          </span>
                          {prompt.confidence && (
                            <span className="text-xs text-slate-400">
                              {Math.round(prompt.confidence * 100)}%
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-300">{prompt.content}</p>
                        <div className="text-xs text-slate-500 mt-2">
                          {prompt.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // LED 704: Prompt used
                          trail.light(704, { 
                            user_action: 'prompt_used',
                            promptId: prompt.id,
                            promptType: prompt.type
                          });
                          onPromptUsed(prompt.id);
                        }}
                        className="p-1 text-success-400 hover:text-success-300 transition-colors"
                        title="Mark as used"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // LED 705: Prompt dismissed
                          trail.light(705, { 
                            user_action: 'prompt_dismissed',
                            promptId: prompt.id,
                            promptType: prompt.type
                          });
                          onPromptDismissed(prompt.id);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-300 transition-colors"
                        title="Dismiss"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Conversation Analytics */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-primary-400" />
                <span>Conversation Analytics</span>
              </h3>

              <div className="space-y-4">
                {/* Talk Time Ratio */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Talk Time Distribution</span>
                    <span>{conversationContext.talkTimeRatio.user}% / {conversationContext.talkTimeRatio.prospect}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-slate-700 rounded-full h-3">
                      <div 
                        className="bg-primary-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${conversationContext.talkTimeRatio.user}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>You</span>
                    <span>Prospect</span>
                  </div>
                </div>

                {/* Sentiment Analysis */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Conversation Sentiment</span>
                  </div>
                  <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-full text-sm ${
                    conversationContext.sentiment === 'positive' ? 'bg-success-900/50 text-success-400' :
                    conversationContext.sentiment === 'negative' ? 'bg-danger-900/50 text-danger-400' :
                    'bg-warning-900/50 text-warning-400'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      conversationContext.sentiment === 'positive' ? 'bg-success-400' :
                      conversationContext.sentiment === 'negative' ? 'bg-danger-400' :
                      'bg-warning-400'
                    }`} />
                    <span className="capitalize">{conversationContext.sentiment}</span>
                  </div>
                </div>

                {/* Objections & Opportunities */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium mb-2">Objections ({conversationContext.objections.length})</div>
                    <div className="space-y-1">
                      {conversationContext.objections.slice(0, 3).map((objection, index) => (
                        <div key={index} className="text-xs bg-red-900/20 text-red-300 px-2 py-1 rounded">
                          {objection}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Opportunities ({conversationContext.opportunities.length})</div>
                    <div className="space-y-1">
                      {conversationContext.opportunities.slice(0, 3).map((opportunity, index) => (
                        <div key={index} className="text-xs bg-green-900/20 text-green-300 px-2 py-1 rounded">
                          {opportunity}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coaching Effectiveness */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Award className="w-5 h-5 text-purple-400" />
                <span>Coaching Effectiveness</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Prompt Usage Rate</span>
                    <span>{coachingEffectiveness.toFixed(1)}%</span>
                  </div>
                  <div className="bg-slate-700 rounded-full h-3">
                    <div 
                      className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(coachingEffectiveness, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-primary-400">{performanceMetrics.promptsDelivered}</div>
                    <div className="text-xs text-slate-400">Prompts Delivered</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-success-400">{performanceMetrics.promptsUsed}</div>
                    <div className="text-xs text-slate-400">Prompts Used</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Next Suggested Actions</div>
                  <div className="space-y-2">
                    {conversationContext.nextActions.slice(0, 3).map((action, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
                        <span className="text-sm">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* System Performance */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Timer className="w-5 h-5 text-yellow-400" />
                <span>System Performance</span>
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center bg-slate-800/50 rounded-lg p-3">
                    <div className="text-xl font-bold text-yellow-400">
                      {averageResponseTime.toFixed(0)}ms
                    </div>
                    <div className="text-xs text-slate-400">Avg Response Time</div>
                    <div className={`text-xs mt-1 ${averageResponseTime < 2000 ? 'text-success-400' : 'text-warning-400'}`}>
                      Target: &lt;2000ms
                    </div>
                  </div>
                  <div className="text-center bg-slate-800/50 rounded-lg p-3">
                    <div className="text-xl font-bold text-blue-400">
                      {(performanceMetrics.transcriptionLatency || 0).toFixed(0)}ms
                    </div>
                    <div className="text-xs text-slate-400">Transcription</div>
                    <div className={`text-xs mt-1 ${performanceMetrics.transcriptionLatency < 500 ? 'text-success-400' : 'text-warning-400'}`}>
                      Target: &lt;500ms
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center bg-slate-800/50 rounded-lg p-3">
                    <div className="text-xl font-bold text-green-400">
                      {(performanceMetrics.aiProcessingLatency || 0).toFixed(0)}ms
                    </div>
                    <div className="text-xs text-slate-400">AI Processing</div>
                    <div className={`text-xs mt-1 ${performanceMetrics.aiProcessingLatency < 500 ? 'text-success-400' : 'text-warning-400'}`}>
                      Target: &lt;500ms
                    </div>
                  </div>
                  <div className="text-center bg-slate-800/50 rounded-lg p-3">
                    <div className="text-xl font-bold text-purple-400">
                      {(performanceMetrics.knowledgeRetrievalLatency || 0).toFixed(0)}ms
                    </div>
                    <div className="text-xs text-slate-400">Knowledge Retrieval</div>
                    <div className={`text-xs mt-1 ${performanceMetrics.knowledgeRetrievalLatency < 100 ? 'text-success-400' : 'text-warning-400'}`}>
                      Target: &lt;100ms
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Performance Status</div>
                  <div className="space-y-2">
                    {[
                      { label: 'Audio Capture', status: 'Operational', color: 'text-success-400' },
                      { label: 'Real-time Transcription', status: 'Operational', color: 'text-success-400' },
                      { label: 'AI Analysis', status: isProcessing ? 'Processing' : 'Operational', color: isProcessing ? 'text-yellow-400' : 'text-success-400' },
                      { label: 'Knowledge Base', status: 'Operational', color: 'text-success-400' }
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center">
                        <span className="text-sm">{item.label}</span>
                        <span className={`text-sm ${item.color}`}>{item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Session Statistics */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <span>Session Statistics</span>
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center bg-slate-800/50 rounded-lg p-3">
                    <div className="text-xl font-bold text-blue-400">
                      {performanceMetrics.opportunitiesIdentified}
                    </div>
                    <div className="text-xs text-slate-400">Opportunities ID'd</div>
                  </div>
                  <div className="text-center bg-slate-800/50 rounded-lg p-3">
                    <div className="text-xl font-bold text-orange-400">
                      {performanceMetrics.objectionsHandled}
                    </div>
                    <div className="text-xs text-slate-400">Objections Handled</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center bg-slate-800/50 rounded-lg p-3">
                    <div className="text-xl font-bold text-purple-400">
                      {performanceMetrics.silenceGaps}
                    </div>
                    <div className="text-xs text-slate-400">Silence Gaps</div>
                  </div>
                  <div className="text-center bg-slate-800/50 rounded-lg p-3">
                    <div className="text-xl font-bold text-green-400">
                      {performanceMetrics.stageProgression.length}
                    </div>
                    <div className="text-xs text-slate-400">Stages Completed</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Stage Progression Timeline</div>
                  <div className="space-y-2">
                    {performanceMetrics.stageProgression.map((stage, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${index === performanceMetrics.stageProgression.length - 1 ? 'bg-primary-400' : 'bg-success-400'}`} />
                        <span className="text-sm capitalize">{stage.replace('_', ' ')}</span>
                        {index === performanceMetrics.stageProgression.length - 1 && (
                          <span className="text-xs text-primary-400">(Current)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CoachingDashboard;