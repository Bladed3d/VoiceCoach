import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Monitor,
  Zap,
  Activity,
  Download,
  RefreshCw,
  Filter
} from 'lucide-react';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

interface AnalyticsData {
  // User Behavior Metrics
  userEngagement: {
    totalUsers: number;
    activeUsers: number;
    averageSessionDuration: number;
    sessionRetentionRate: number;
    featureAdoptionRates: Record<string, number>;
    userJourneyMetrics: {
      onboardingCompletionRate: number;
      timeToFirstValue: number;
      averageTasksPerSession: number;
    };
  };

  // Coaching Effectiveness Metrics
  coachingMetrics: {
    totalCoachingSessions: number;
    averagePromptsPerSession: number;
    promptEffectivenessRate: number;
    userSatisfactionScore: number;
    callSuccessImprovement: number;
    averageResponseTime: number;
    mostUsefulPrompts: Array<{ prompt: string; usage: number; effectiveness: number }>;
    coachingROI: {
      dealsInfluenced: number;
      revenueImpact: number;
      timeToClose: number;
    };
  };

  // Technical Performance Metrics
  technicalMetrics: {
    systemUptime: number;
    averageLatency: number;
    errorRate: number;
    crashRate: number;
    transcriptionAccuracy: number;
    memoryUsage: number;
    cpuUsage: number;
    networkLatency: number;
    buildHealthScore: number;
  };

  // Real-world Usage Analytics
  realWorldUsage: {
    callsMonitored: number;
    successfulSessions: number;
    averageCallDuration: number;
    industrySegments: Record<string, number>;
    geographicDistribution: Record<string, number>;
    deviceUsage: Record<string, number>;
    timeOfDayUsage: Record<string, number>;
  };

  // Performance Validation Metrics
  performanceValidation: {
    beforeAfterMetrics: {
      callSuccessRate: { before: number; after: number; improvement: number };
      averageDealSize: { before: number; after: number; improvement: number };
      callConfidence: { before: number; after: number; improvement: number };
      objectionHandling: { before: number; after: number; improvement: number };
    };
    abtestResults: Array<{
      testName: string;
      variantA: number;
      variantB: number;
      significance: number;
      winner: 'A' | 'B' | 'tie';
    }>;
  };

  // Feedback Analytics
  feedbackAnalytics: {
    totalFeedbacks: number;
    averageRating: number;
    npsScore: number;
    commonThemes: Array<{ theme: string; sentiment: 'positive' | 'negative' | 'neutral'; frequency: number }>;
    featureRequests: Array<{ feature: string; votes: number; complexity: 'low' | 'medium' | 'high' }>;
    bugReports: Array<{ category: string; frequency: number; severity: 'low' | 'medium' | 'high' | 'critical' }>;
  };
}

interface AlertConfig {
  id: string;
  metric: string;
  condition: 'above' | 'below' | 'equals';
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
}

interface AnalyticsMonitoringDashboardProps {
  isVisible: boolean;
  onClose: () => void;
  realTimeMode?: boolean;
}

const AnalyticsMonitoringDashboard: React.FC<AnalyticsMonitoringDashboardProps> = ({
  isVisible,
  onClose,
  realTimeMode = true
}) => {
  const trail = new BreadcrumbTrail('AnalyticsMonitoringDashboard');
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    userEngagement: {
      totalUsers: 0,
      activeUsers: 0,
      averageSessionDuration: 0,
      sessionRetentionRate: 0,
      featureAdoptionRates: {},
      userJourneyMetrics: {
        onboardingCompletionRate: 0,
        timeToFirstValue: 0,
        averageTasksPerSession: 0
      }
    },
    coachingMetrics: {
      totalCoachingSessions: 0,
      averagePromptsPerSession: 0,
      promptEffectivenessRate: 0,
      userSatisfactionScore: 0,
      callSuccessImprovement: 0,
      averageResponseTime: 0,
      mostUsefulPrompts: [],
      coachingROI: {
        dealsInfluenced: 0,
        revenueImpact: 0,
        timeToClose: 0
      }
    },
    technicalMetrics: {
      systemUptime: 0,
      averageLatency: 0,
      errorRate: 0,
      crashRate: 0,
      transcriptionAccuracy: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      networkLatency: 0,
      buildHealthScore: 0
    },
    realWorldUsage: {
      callsMonitored: 0,
      successfulSessions: 0,
      averageCallDuration: 0,
      industrySegments: {},
      geographicDistribution: {},
      deviceUsage: {},
      timeOfDayUsage: {}
    },
    performanceValidation: {
      beforeAfterMetrics: {
        callSuccessRate: { before: 0, after: 0, improvement: 0 },
        averageDealSize: { before: 0, after: 0, improvement: 0 },
        callConfidence: { before: 0, after: 0, improvement: 0 },
        objectionHandling: { before: 0, after: 0, improvement: 0 }
      },
      abtestResults: []
    },
    feedbackAnalytics: {
      totalFeedbacks: 0,
      averageRating: 0,
      npsScore: 0,
      commonThemes: [],
      featureRequests: [],
      bugReports: []
    }
  });

  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '24h' | '7d' | '30d' | '90d'>('24h');
  const [selectedMetricCategory, setSelectedMetricCategory] = useState<'overview' | 'coaching' | 'technical' | 'usage' | 'validation' | 'feedback'>('overview');
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Initialize analytics dashboard
  useEffect(() => {
    trail.light(700, { operation: 'analytics_dashboard_init', realTimeMode });
    
    // Load existing analytics data
    loadAnalyticsData();
    
    // Setup real-time monitoring if enabled
    if (realTimeMode) {
      const interval = setInterval(() => {
        updateRealTimeMetrics();
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [realTimeMode]);

  const loadAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    trail.light(701, { operation: 'load_analytics_data', timeframe: selectedTimeframe });

    try {
      // Simulate loading analytics data
      // In production, this would fetch from analytics service
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate mock analytics data
      const mockData: AnalyticsData = {
        userEngagement: {
          totalUsers: 127,
          activeUsers: 89,
          averageSessionDuration: 1845000, // 30.75 minutes
          sessionRetentionRate: 0.73,
          featureAdoptionRates: {
            'ai_coaching': 0.89,
            'transcription': 0.95,
            'call_analytics': 0.67,
            'knowledge_base': 0.34,
            'performance_dashboard': 0.56
          },
          userJourneyMetrics: {
            onboardingCompletionRate: 0.84,
            timeToFirstValue: 420000, // 7 minutes
            averageTasksPerSession: 8.3
          }
        },
        coachingMetrics: {
          totalCoachingSessions: 1247,
          averagePromptsPerSession: 12.4,
          promptEffectivenessRate: 0.76,
          userSatisfactionScore: 4.2,
          callSuccessImprovement: 0.34,
          averageResponseTime: 1.8,
          mostUsefulPrompts: [
            { prompt: "Ask about their budget constraints", usage: 234, effectiveness: 0.89 },
            { prompt: "Summarize the key benefits discussed", usage: 198, effectiveness: 0.82 },
            { prompt: "Address the pricing objection directly", usage: 176, effectiveness: 0.78 }
          ],
          coachingROI: {
            dealsInfluenced: 89,
            revenueImpact: 450000,
            timeToClose: -12.5
          }
        },
        technicalMetrics: {
          systemUptime: 0.998,
          averageLatency: 145,
          errorRate: 0.023,
          crashRate: 0.001,
          transcriptionAccuracy: 0.94,
          memoryUsage: 67.3,
          cpuUsage: 34.7,
          networkLatency: 89,
          buildHealthScore: 0.92
        },
        realWorldUsage: {
          callsMonitored: 2847,
          successfulSessions: 2398,
          averageCallDuration: 1680000, // 28 minutes
          industrySegments: {
            'Technology': 34,
            'Healthcare': 23,
            'Finance': 19,
            'Manufacturing': 15,
            'Other': 9
          },
          geographicDistribution: {
            'North America': 67,
            'Europe': 23,
            'Asia Pacific': 8,
            'Other': 2
          },
          deviceUsage: {
            'Desktop': 89,
            'Laptop': 11
          },
          timeOfDayUsage: {
            'Morning (9-12)': 45,
            'Afternoon (12-17)': 39,
            'Evening (17-20)': 16
          }
        },
        performanceValidation: {
          beforeAfterMetrics: {
            callSuccessRate: { before: 0.23, after: 0.31, improvement: 0.35 },
            averageDealSize: { before: 15000, after: 18500, improvement: 0.23 },
            callConfidence: { before: 3.2, after: 4.1, improvement: 0.28 },
            objectionHandling: { before: 2.8, after: 3.9, improvement: 0.39 }
          },
          abtestResults: [
            { testName: 'Prompt Timing', variantA: 0.76, variantB: 0.82, significance: 0.95, winner: 'B' },
            { testName: 'UI Layout', variantA: 0.68, variantB: 0.71, significance: 0.88, winner: 'B' }
          ]
        },
        feedbackAnalytics: {
          totalFeedbacks: 256,
          averageRating: 4.1,
          npsScore: 67,
          commonThemes: [
            { theme: 'Helpful coaching prompts', sentiment: 'positive', frequency: 89 },
            { theme: 'Interface responsiveness', sentiment: 'negative', frequency: 34 },
            { theme: 'Transcription accuracy', sentiment: 'positive', frequency: 67 }
          ],
          featureRequests: [
            { feature: 'Industry-specific coaching', votes: 45, complexity: 'high' },
            { feature: 'Mobile companion app', votes: 38, complexity: 'high' },
            { feature: 'CRM integration', votes: 29, complexity: 'medium' }
          ],
          bugReports: [
            { category: 'Audio processing', frequency: 12, severity: 'medium' },
            { category: 'UI responsiveness', frequency: 8, severity: 'low' },
            { category: 'Data synchronization', frequency: 5, severity: 'high' }
          ]
        }
      };

      setAnalyticsData(mockData);
      setLastUpdate(new Date());

    } catch (error) {
      trail.fail(701, error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTimeframe]);

  const updateRealTimeMetrics = useCallback(() => {
    trail.light(702, { operation: 'update_realtime_metrics' });
    
    // Simulate real-time updates
    setAnalyticsData(prev => ({
      ...prev,
      userEngagement: {
        ...prev.userEngagement,
        activeUsers: prev.userEngagement.activeUsers + Math.floor(Math.random() * 5) - 2
      },
      technicalMetrics: {
        ...prev.technicalMetrics,
        averageLatency: prev.technicalMetrics.averageLatency + (Math.random() - 0.5) * 20,
        memoryUsage: Math.max(0, Math.min(100, prev.technicalMetrics.memoryUsage + (Math.random() - 0.5) * 10)),
        cpuUsage: Math.max(0, Math.min(100, prev.technicalMetrics.cpuUsage + (Math.random() - 0.5) * 15))
      }
    }));
    
    setLastUpdate(new Date());
  }, []);

  const exportAnalyticsData = useCallback(() => {
    trail.light(703, { operation: 'export_analytics_data' });
    
    const exportData = {
      analyticsData,
      timeframe: selectedTimeframe,
      exportTime: new Date().toISOString(),
      metadata: {
        dashboardVersion: '1.0.0',
        dataSourceVersion: '1.0.0'
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voicecoach_analytics_${selectedTimeframe}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [analyticsData, selectedTimeframe]);

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    change?: number;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon: React.ComponentType<{ className?: string }>;
    color?: string;
  }> = ({ title, value, change, changeType, icon: Icon, color = 'blue' }) => (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-sm">{title}</span>
        <Icon className={`w-4 h-4 text-${color}-400`} />
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      {change !== undefined && (
        <div className={`flex items-center space-x-1 text-xs ${
          changeType === 'positive' ? 'text-green-400' :
          changeType === 'negative' ? 'text-red-400' : 'text-slate-400'
        }`}>
          {changeType === 'positive' ? <TrendingUp className="w-3 h-3" /> :
           changeType === 'negative' ? <TrendingDown className="w-3 h-3" /> : null}
          <span>{change > 0 ? '+' : ''}{change}%</span>
        </div>
      )}
    </div>
  );

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-full max-w-7xl max-h-[95vh] m-4 bg-slate-900 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Analytics & Monitoring Dashboard</h2>
            {realTimeMode && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-900/50 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-300 text-sm font-medium">Live</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
            <button
              onClick={loadAnalyticsData}
              disabled={isLoading}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-white ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={exportAnalyticsData}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex h-[85vh]">
          {/* Left Sidebar - Controls */}
          <div className="w-64 border-r border-slate-700 bg-slate-850 p-4 overflow-y-auto">
            {/* Timeframe Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Timeframe</h3>
              <div className="space-y-2">
                {[
                  { value: '1h', label: 'Last Hour' },
                  { value: '24h', label: 'Last 24 Hours' },
                  { value: '7d', label: 'Last 7 Days' },
                  { value: '30d', label: 'Last 30 Days' },
                  { value: '90d', label: 'Last 90 Days' }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedTimeframe(value as any)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedTimeframe === value
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Metric Categories */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Categories</h3>
              <div className="space-y-2">
                {[
                  { value: 'overview', label: 'Overview', icon: BarChart3 },
                  { value: 'coaching', label: 'Coaching', icon: Target },
                  { value: 'technical', label: 'Technical', icon: Monitor },
                  { value: 'usage', label: 'Usage', icon: Users },
                  { value: 'validation', label: 'Validation', icon: CheckCircle },
                  { value: 'feedback', label: 'Feedback', icon: Activity }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedMetricCategory(value as any)}
                    className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedMetricCategory === value
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-slate-800 rounded-lg p-3">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Quick Stats</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">System Health</span>
                  <span className="text-green-400">98.7%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Sessions</span>
                  <span className="text-blue-400">{analyticsData.userEngagement.activeUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Avg Response</span>
                  <span className="text-yellow-400">{analyticsData.coachingMetrics.averageResponseTime}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Error Rate</span>
                  <span className={analyticsData.technicalMetrics.errorRate < 0.05 ? 'text-green-400' : 'text-red-400'}>
                    {(analyticsData.technicalMetrics.errorRate * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Overview Dashboard */}
            {selectedMetricCategory === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">System Overview</h3>
                
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    title="Active Users"
                    value={analyticsData.userEngagement.activeUsers}
                    change={12}
                    changeType="positive"
                    icon={Users}
                    color="blue"
                  />
                  <MetricCard
                    title="System Uptime"
                    value={`${(analyticsData.technicalMetrics.systemUptime * 100).toFixed(1)}%`}
                    change={0.2}
                    changeType="positive"
                    icon={Monitor}
                    color="green"
                  />
                  <MetricCard
                    title="Avg Latency"
                    value={`${analyticsData.technicalMetrics.averageLatency}ms`}
                    change={-8}
                    changeType="positive"
                    icon={Zap}
                    color="yellow"
                  />
                  <MetricCard
                    title="User Satisfaction"
                    value={`${analyticsData.coachingMetrics.userSatisfactionScore}/5`}
                    change={5}
                    changeType="positive"
                    icon={Target}
                    color="purple"
                  />
                </div>

                {/* Real-time Performance Chart */}
                <div className="bg-slate-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-white mb-4">Real-time Performance</h4>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <div className="text-sm text-slate-400 mb-2">Memory Usage</div>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${analyticsData.technicalMetrics.memoryUsage}%` }}
                          />
                        </div>
                        <span className="text-sm text-white">{analyticsData.technicalMetrics.memoryUsage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400 mb-2">CPU Usage</div>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${analyticsData.technicalMetrics.cpuUsage}%` }}
                          />
                        </div>
                        <span className="text-sm text-white">{analyticsData.technicalMetrics.cpuUsage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400 mb-2">Network Latency</div>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 bg-slate-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              analyticsData.technicalMetrics.networkLatency < 100 ? 'bg-green-500' :
                              analyticsData.technicalMetrics.networkLatency < 200 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(analyticsData.technicalMetrics.networkLatency / 300 * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-white">{analyticsData.technicalMetrics.networkLatency.toFixed(0)}ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Coaching Effectiveness Dashboard */}
            {selectedMetricCategory === 'coaching' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Coaching Effectiveness</h3>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    title="Total Sessions"
                    value={analyticsData.coachingMetrics.totalCoachingSessions}
                    change={23}
                    changeType="positive"
                    icon={Activity}
                  />
                  <MetricCard
                    title="Avg Prompts/Session"
                    value={analyticsData.coachingMetrics.averagePromptsPerSession.toFixed(1)}
                    change={-5}
                    changeType="neutral"
                    icon={Target}
                  />
                  <MetricCard
                    title="Effectiveness Rate"
                    value={`${(analyticsData.coachingMetrics.promptEffectivenessRate * 100).toFixed(1)}%`}
                    change={8}
                    changeType="positive"
                    icon={CheckCircle}
                  />
                  <MetricCard
                    title="Success Improvement"
                    value={`+${(analyticsData.coachingMetrics.callSuccessImprovement * 100).toFixed(1)}%`}
                    change={12}
                    changeType="positive"
                    icon={TrendingUp}
                  />
                </div>

                {/* Most Useful Prompts */}
                <div className="bg-slate-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-white mb-4">Most Effective Prompts</h4>
                  <div className="space-y-3">
                    {analyticsData.coachingMetrics.mostUsefulPrompts.map((prompt, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-700 rounded">
                        <div className="flex-1">
                          <div className="text-white font-medium">{prompt.prompt}</div>
                          <div className="text-xs text-slate-400">Used {prompt.usage} times</div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-medium">{(prompt.effectiveness * 100).toFixed(1)}%</div>
                          <div className="text-xs text-slate-400">effectiveness</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Performance Validation Dashboard */}
            {selectedMetricCategory === 'validation' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Performance Validation</h3>
                
                {/* Before/After Metrics */}
                <div className="grid grid-cols-2 gap-6">
                  {Object.entries(analyticsData.performanceValidation.beforeAfterMetrics).map(([metric, data]) => (
                    <div key={metric} className="bg-slate-800 rounded-lg p-4">
                      <h4 className="font-medium text-white mb-3 capitalize">{metric.replace(/([A-Z])/g, ' $1')}</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Before VoiceCoach</span>
                          <span className="text-white">{typeof data.before === 'number' && data.before < 10 ? data.before.toFixed(1) : data.before}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">After VoiceCoach</span>
                          <span className="text-white">{typeof data.after === 'number' && data.after < 10 ? data.after.toFixed(1) : data.after}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-400 font-medium">Improvement</span>
                          <span className="text-green-400 font-medium">+{(data.improvement * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* A/B Test Results */}
                <div className="bg-slate-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-white mb-4">A/B Test Results</h4>
                  <div className="space-y-3">
                    {analyticsData.performanceValidation.abtestResults.map((test, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-700 rounded">
                        <div>
                          <div className="text-white font-medium">{test.testName}</div>
                          <div className="text-xs text-slate-400">Significance: {(test.significance * 100).toFixed(1)}%</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white">A: {(test.variantA * 100).toFixed(1)}% | B: {(test.variantB * 100).toFixed(1)}%</div>
                          <div className={`text-xs font-medium ${
                            test.winner === 'A' ? 'text-blue-400' :
                            test.winner === 'B' ? 'text-green-400' : 'text-yellow-400'
                          }`}>
                            Winner: {test.winner === 'tie' ? 'Tie' : `Variant ${test.winner}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Add other metric category views here */}
            {selectedMetricCategory === 'technical' && (
              <div className="text-center text-slate-400 py-12">
                <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Technical metrics dashboard coming soon...</p>
              </div>
            )}

            {selectedMetricCategory === 'usage' && (
              <div className="text-center text-slate-400 py-12">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Usage analytics dashboard coming soon...</p>
              </div>
            )}

            {selectedMetricCategory === 'feedback' && (
              <div className="text-center text-slate-400 py-12">
                <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Feedback analytics dashboard coming soon...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsMonitoringDashboard;