/**
 * VoiceCoach V2 - Sales Script Panel Component
 * Displays script-aware coaching with progress tracking and stage guidance
 */
import React, { useState, useEffect } from 'react';
import { Book, CheckCircle, X, Target, AlertTriangle, TrendingUp, Lightbulb, Activity } from 'lucide-react';
import { SalesScriptService, SalesScript, ScriptProgress } from '../../services/coaching/sales-script-service';
import { ScriptProgressTracker, StageDetectionResult, ConversationEntry } from '../../services/coaching/script-progress-tracker';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { SentimentData } from '../../types/coaching';
import { ManualSentimentButtons } from './ManualSentimentButtons';

interface SalesScriptPanelProps {
  scriptItems: any[];
  isRecording: boolean;
  conversationHistory?: Array<{ speaker: 'user' | 'prospect'; text: string; timestamp: string }>;
  currentSentiment?: SentimentData;
  onMarkUsed: (itemId: string) => void;
  onClearUsed: () => void;
  onCollapse?: () => void;
  onStageSelected?: (stageNumber: number) => void;
  onManualSentiment?: (score: -50 | -25 | 0 | 25 | 50, emoji: string) => void;
  manualSentiments?: Array<{ timestamp: number; score: number; transcriptIndex: number; emoji: string }>;
}

export const SalesScriptPanel: React.FC<SalesScriptPanelProps> = ({
  scriptItems: _scriptItems,
  isRecording,
  conversationHistory: rawConversationHistory = [],
  currentSentiment,
  onMarkUsed: _onMarkUsed,
  onClearUsed: _onClearUsed,
  onCollapse,
  onStageSelected,
  onManualSentiment,
  manualSentiments = []
}) => {
  // Convert conversation history format for script tracking
  const conversationHistory: ConversationEntry[] = rawConversationHistory.map(entry => ({
    speaker: entry.speaker,
    text: entry.text,
    timestamp: entry.timestamp
  }));
  const [trail] = useState(() => new BreadcrumbTrail('SalesScriptPanel'));
  const [scriptService] = useState(() => new SalesScriptService());
  const [progressTracker] = useState(() => new ScriptProgressTracker(scriptService));
  const [availableScripts, setAvailableScripts] = useState<SalesScript[]>([]);
  const [currentScript, setCurrentScript] = useState<SalesScript | null>(null);
  const [_progress, setProgress] = useState<ScriptProgress | null>(null);
  const [stageAnalysis, setStageAnalysis] = useState<StageDetectionResult | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedStage, setSelectedStage] = useState<number>(1);
  const [sentimentData, setSentimentData] = useState<Array<{timestamp: number, value: number}>>([]);

  // Component mount LED
  useEffect(() => {
    trail.light(7200, {
      operation: 'sales_script_panel_mount',
      timestamp: Date.now()
    });
  }, [trail]);

  // Initialize script service
  useEffect(() => {
    const initializeService = async () => {
      try {
        trail.light(7201, {
          operation: 'script_service_initialization_start'
        });

        const success = await scriptService.initialize();
        if (success) {
          setAvailableScripts(scriptService.getAvailableScripts());
          setIsInitialized(true);

          // Auto-select first script if available
          const scripts = scriptService.getAvailableScripts();
          if (scripts.length > 0) {
            scriptService.setActiveScript(scripts[0].id);
            setCurrentScript(scriptService.getCurrentScript());
            setProgress(scriptService.getProgress());

            trail.light(7202, {
              operation: 'script_service_initialized',
              scriptsAvailable: scripts.length,
              activeScript: scripts[0].id
            });
          } else {
            trail.light(7203, {
              operation: 'script_service_no_scripts_found'
            });
          }
        } else {
          trail.fail(8201, new Error('Script service initialization failed'));
        }
      } catch (error) {
        trail.fail(8202, error as Error);
      }
    };

    initializeService();
  }, [scriptService, trail]);

  // Analyze conversation progress when history changes
  useEffect(() => {
    trail.light(7210, {
      operation: 'conversation_history_update',
      historyLength: conversationHistory.length,
      hasCurrentScript: !!currentScript
    });

    if (currentScript && conversationHistory.length > 0) {
      const analysis = progressTracker.analyzeProgress(conversationHistory);
      setStageAnalysis(analysis);
      setProgress(scriptService.getProgress());
    }
  }, [conversationHistory, currentScript, progressTracker, scriptService, trail]);

  // Update sentiment graph when sentiment changes
  useEffect(() => {
    if (currentSentiment) {
      trail.light(7214, {
        operation: 'sentiment_received',
        score: currentSentiment.score,
        direction: currentSentiment.direction,
        engagement: currentSentiment.engagement
      });

      setSentimentData(prev => {
        // Convert -100..100 scale to -10..10 scale for graph display
        const graphValue = currentSentiment.score / 10;

        const newData = [...prev, {
          timestamp: currentSentiment.timestamp,
          value: graphValue
        }];

        trail.light(7215, {
          operation: 'sentiment_graph_updated',
          dataPoints: newData.length,
          latestValue: graphValue
        });

        // Keep last 20 data points for smooth graph
        return newData.slice(-20);
      });
    }
  }, [currentSentiment, trail]);

  const handleScriptChange = (scriptId: string) => {
    const success = scriptService.setActiveScript(scriptId);
    if (success) {
      setCurrentScript(scriptService.getCurrentScript());
      setProgress(scriptService.getProgress());
      progressTracker.reset();
      setStageAnalysis(null);
    }
  };

  const getStageProgressColor = (completion: number) => {
    if (completion >= 80) return 'text-green-400';
    if (completion >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getAdherenceColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="glass-panel p-6 flex flex-col min-h-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4 text-primary-400" />
          <h2 className="text-lg font-semibold">Script Progress</h2>
          {currentScript && (
            <span className="text-xs text-slate-400">
              ({currentScript.name})
            </span>
          )}
        </div>
        <button
          className="text-slate-400 hover:text-red-400 p-1 border border-slate-600 rounded"
          onClick={onCollapse}
          title="Collapse to vertical"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {!isInitialized ? (
          <div className="text-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-slate-400">Loading scripts...</p>
          </div>
        ) : availableScripts.length === 0 ? (
          <div className="text-center py-12">
            <Book className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-sm text-slate-400">📋 No sales scripts available</p>
            <p className="text-xs text-slate-500 mt-2">Add script files to Sales/ folder</p>
          </div>
        ) : (
          <>
            {/* Script Selection */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">Active Script</label>
              <select
                value={currentScript?.id || ''}
                onChange={(e) => handleScriptChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm"
              >
                {availableScripts.map(script => (
                  <option key={script.id} value={script.id}>
                    {script.name}
                  </option>
                ))}
              </select>
            </div>

            {currentScript && (
              <>
                {/* Current Sentiment */}
                <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-600/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-green-400" />
                      <h3 className="text-sm font-semibold text-slate-300">Current Sentiment</h3>
                    </div>
                    <div className="text-xs text-slate-400">
                      Stage {selectedStage}: {currentScript.stages.find(s => s.number === selectedStage)?.name}
                    </div>
                  </div>

                  {/* Sentiment Graph Area */}
                  <div className="h-32 bg-slate-800/50 rounded border border-slate-600 p-3 relative">
                    {/* Y-axis labels */}
                    <div className="absolute left-1 top-0 bottom-0 flex flex-col justify-between text-[10px] text-slate-500 py-3">
                      <div>+10</div>
                      <div>0</div>
                      <div>-10</div>
                    </div>

                    {/* Graph area */}
                    <div className="h-full ml-6 relative">
                      {/* Zero line */}
                      <div className="absolute left-0 right-0 top-1/2 border-t border-slate-600 border-dashed"></div>

                      {sentimentData.length > 0 ? (
                        <svg className="w-full h-full" preserveAspectRatio="none">
                          {/* Positive zone background */}
                          <rect x="0" y="0" width="100%" height="50%" fill="rgba(34, 197, 94, 0.05)" />
                          {/* Negative zone background */}
                          <rect x="0" y="50%" width="100%" height="50%" fill="rgba(239, 68, 68, 0.05)" />

                          {/* Sentiment line - EKG style scrolling (fixed position grid) */}
                          <polyline
                            points={sentimentData.map((point, index) => {
                              // Each point occupies 1/20th of the width (5% each)
                              // When we have < 20 points, they fill from left to right
                              // When we have 20 points, oldest drops off left as new ones add on right
                              const x = (index / 20) * 100; // 0%, 5%, 10%, ... 95%
                              const y = 50 - (point.value / 10 * 50); // Map -10..10 to 100%..0%
                              return `${x},${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke={sentimentData[sentimentData.length - 1]?.value >= 0 ? '#22c55e' : '#ef4444'}
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                          />

                          {/* Current value dot (at the position of the last data point) */}
                          {sentimentData.length > 0 && (
                            <circle
                              cx={(Math.min(sentimentData.length - 1, 19) / 20) * 100}
                              cy={50 - (sentimentData[sentimentData.length - 1].value / 10 * 50)}
                              r="3"
                              fill={sentimentData[sentimentData.length - 1].value >= 0 ? '#22c55e' : '#ef4444'}
                              vectorEffect="non-scaling-stroke"
                            />
                          )}

                          {/* Manual sentiment markers (blue dots) */}
                          {manualSentiments.map((manual, index) => {
                            // Find position based on transcript index
                            const relativeIndex = Math.min(manual.transcriptIndex, sentimentData.length - 1);
                            const displayIndex = Math.min(relativeIndex, 19);
                            const x = (displayIndex / 20) * 100;
                            // Map manual score (-50 to +50) to graph coordinates
                            const normalizedValue = (manual.score / 50) * 10; // Convert to -10..10 range
                            const y = 50 - (normalizedValue / 10 * 50);

                            return (
                              <g key={`${manual.timestamp}-${index}`}>
                                {/* Blue outer ring */}
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="5"
                                  fill="none"
                                  stroke="#3b82f6"
                                  strokeWidth="2"
                                  vectorEffect="non-scaling-stroke"
                                />
                                {/* Blue center dot */}
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="3"
                                  fill="#3b82f6"
                                  vectorEffect="non-scaling-stroke"
                                />
                              </g>
                            );
                          })}
                        </svg>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                          {isRecording ? 'Monitoring sentiment...' : 'Start recording to track sentiment'}
                        </div>
                      )}

                      {/* Current value display */}
                      {sentimentData.length > 0 && (
                        <div className="absolute top-1 right-1 bg-slate-900/80 rounded px-2 py-1 text-xs font-bold">
                          <span className={sentimentData[sentimentData.length - 1]?.value >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {sentimentData[sentimentData.length - 1]?.value > 0 ? '+' : ''}
                            {sentimentData[sentimentData.length - 1]?.value.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Manual Sentiment Buttons */}
                  {onManualSentiment && (
                    <ManualSentimentButtons
                      onSentimentClick={onManualSentiment}
                      disabled={!isRecording}
                    />
                  )}
                </div>

                {/* Tool Recommendations */}
                {stageAnalysis && (
                  <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-600/30">
                    <div className="flex items-center space-x-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-semibold text-blue-300">Recommended Actions</h3>
                    </div>
                    <div className="space-y-2">
                      {stageAnalysis.suggestedActions.map((action, index) => (
                        <div key={index} className="text-xs text-slate-300 flex items-start space-x-2">
                          <span className="text-blue-400 mt-0.5">•</span>
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Adherence Score */}
                {stageAnalysis && (
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-semibold text-slate-300">Script Adherence</h3>
                      </div>
                      <span className={`text-sm font-bold ${getAdherenceColor(stageAnalysis.adherenceScore)}`}>
                        {stageAnalysis.adherenceScore}/100
                      </span>
                    </div>

                    <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          stageAnalysis.adherenceScore >= 80 ? 'bg-green-500' :
                          stageAnalysis.adherenceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${stageAnalysis.adherenceScore}%` }}
                      />
                    </div>

                    {stageAnalysis.missedElements.length > 0 && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-medium text-slate-400">Areas to Address:</h4>
                        {stageAnalysis.missedElements.slice(0, 3).map((element, index) => (
                          <div key={index} className="text-xs text-red-300 flex items-start space-x-2">
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{element}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Stage Evidence */}
                {stageAnalysis && stageAnalysis.evidence.length > 0 && (
                  <div className="bg-green-900/20 rounded-lg p-4 border border-green-600/30">
                    <h3 className="text-sm font-semibold text-green-300 mb-2">Detection Evidence</h3>
                    <div className="space-y-1">
                      {stageAnalysis.evidence.slice(0, 3).map((evidence, index) => (
                        <div key={index} className="text-xs text-green-200 flex items-start space-x-2">
                          <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{evidence}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Script Overview - Clickable Stage Buttons */}
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4 text-primary-400" />
                      <h3 className="text-sm font-semibold text-slate-300">Script Overview</h3>
                    </div>
                    <div className="text-xs text-slate-400">
                      {currentScript.stages.length} stages
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {currentScript.stages.map((stage) => (
                      <button
                        key={stage.number}
                        onClick={() => {
                          setSelectedStage(stage.number);
                          onStageSelected?.(stage.number);
                          console.log(`[STAGE ${stage.number} SELECTED] ${stage.name}`);
                        }}
                        className={`p-2 rounded text-center transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                          selectedStage === stage.number
                            ? 'bg-primary-600 text-white shadow-lg ring-2 ring-primary-400'
                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'
                        }`}
                        title={`Select Stage ${stage.number}: ${stage.name}`}
                      >
                        <div className="font-medium">{stage.number}</div>
                        <div className="text-xs truncate">{stage.name}</div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-slate-500 text-center">
                    Click stage buttons to guide coaching prompts
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};