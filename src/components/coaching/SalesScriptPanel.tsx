/**
 * VoiceCoach V2 - Sales Script Panel Component
 * Displays script-aware coaching with progress tracking and stage guidance
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Book, CheckCircle, X, Target, AlertTriangle, TrendingUp, Lightbulb, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { SalesScriptService, SalesScript, ScriptProgress } from '../../services/coaching/sales-script-service';
import { StageDetectionResult, ConversationEntry } from '../../services/coaching/script-progress-tracker';
import { keywordStageDetector } from '../../services/coaching/KeywordStageDetector';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { SentimentData } from '../../types/coaching';
import { ManualSentimentButtons } from './ManualSentimentButtons';

interface SalesScriptPanelProps {
  scriptItems: any[];
  isRecording: boolean;
  conversationHistory?: Array<{ speaker: 'user' | 'prospect'; text: string; timestamp: string }>;
  currentSentiment?: SentimentData;
  currentStage?: number; // Automatic stage from SessionManager
  onMarkUsed: (itemId: string) => void;
  onClearUsed: () => void;
  onCollapse?: () => void;
  onStageSelected?: (stageNumber: number) => void;
  onManualSentiment?: (score: -50 | -25 | 0 | 25 | 50, emoji: string) => void;
  manualSentiments?: Array<{ timestamp: number; score: number; transcriptIndex: number; emoji: string }>;
  onScriptsLoaded?: (scripts: SalesScript[]) => void;
  selectedScriptId?: string;
  onScriptChange?: (scriptId: string) => void;
}

export const SalesScriptPanel: React.FC<SalesScriptPanelProps> = ({
  scriptItems: _scriptItems,
  isRecording,
  conversationHistory: rawConversationHistory = [],
  currentSentiment,
  currentStage,
  onMarkUsed: _onMarkUsed,
  onClearUsed: _onClearUsed,
  onCollapse,
  onStageSelected,
  onManualSentiment,
  manualSentiments = [],
  onScriptsLoaded,
  selectedScriptId,
  onScriptChange
}) => {
  // Convert conversation history format for script tracking
  const conversationHistory: ConversationEntry[] = rawConversationHistory.map(entry => ({
    speaker: entry.speaker,
    text: entry.text,
    timestamp: entry.timestamp
  }));
  const [trail] = useState(() => new BreadcrumbTrail('SalesScriptPanel'));
  const [scriptService] = useState(() => new SalesScriptService());
  // Use singleton keywordStageDetector (imported above) instead of creating a new instance
  const [availableScripts, setAvailableScripts] = useState<SalesScript[]>([]);
  const [currentScript, setCurrentScript] = useState<SalesScript | null>(null);
  const [_progress, setProgress] = useState<ScriptProgress | null>(null);
  const [stageAnalysis, setStageAnalysis] = useState<StageDetectionResult | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedStage, setSelectedStage] = useState<number>(1);
  const [sentimentData, setSentimentData] = useState<Array<{timestamp: number, value: number}>>([]);
  const [lastProcessedIndex, setLastProcessedIndex] = useState<number>(-1);
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set([1])); // Auto-expand stage 1 initially
  const [showFullScript, setShowFullScript] = useState<boolean>(false); // Toggle between sentiment and full script

  // Refs for scrolling stages into view
  const stageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const stageContainerRef = useRef<HTMLDivElement>(null);

  // Component mount LED
  useEffect(() => {
    trail.light(7200, {
      operation: 'sales_script_panel_mount',
      timestamp: Date.now(),
      codeVersion: '2025-10-04-v2' // Force cache bust
    });
  }, [trail]);

  // Auto-update selected stage when SessionManager advances via keywords
  // ONLY respond to currentStage changes (not selectedStage) to avoid interfering with manual clicks
  useEffect(() => {
    if (currentStage && currentStage !== selectedStage) {
      console.log(`🎯 SalesScriptPanel: Auto-advancing to stage ${currentStage} (from ${selectedStage})`);
      setSelectedStage(currentStage);

      // Auto-expand the new stage FIRST
      setExpandedStages(prev => new Set([...prev, currentStage]));

      // Scroll AFTER expansion completes (wait for DOM to update)
      setTimeout(() => {
        const stageElement = stageRefs.current.get(currentStage);
        const container = stageContainerRef.current;

        if (stageElement && container) {
          // Calculate where the stage currently is relative to container's viewport
          const containerRect = container.getBoundingClientRect();
          const stageRect = stageElement.getBoundingClientRect();
          const relativePosition = stageRect.top - containerRect.top;

          // Scroll by that amount to bring stage top to container viewport top
          container.scrollTop = container.scrollTop + relativePosition;

          trail.light(7253, {
            operation: 'auto_scroll_executed',
            stage: currentStage,
            relativePosition,
            newScrollTop: container.scrollTop
          });
        } else {
          trail.light(7254, {
            operation: 'auto_scroll_failed',
            stage: currentStage,
            reason: !stageElement ? 'no_element' : 'no_container'
          });
        }
      }, 50); // Wait 50ms for expansion to render

      trail.light(7251, {
        operation: 'automatic_stage_advancement',
        fromStage: selectedStage,
        toStage: currentStage,
        timestamp: Date.now()
      });
    }
  }, [currentStage, trail]); // Removed selectedStage from deps to allow manual clicks

  // Handle stage number click for instant selection
  const handleStageNumberClick = (e: React.MouseEvent, stageNumber: number) => {
    e.stopPropagation(); // Prevent triggering the expand/collapse

    setSelectedStage(stageNumber);
    onStageSelected?.(stageNumber);

    // LED 7250: Stage number clicked for instant selection
    trail.light(7250, {
      operation: 'stage_number_clicked',
      stageNumber,
      previousStage: selectedStage
    });

    // Check if stage is already expanded
    const wasExpanded = expandedStages.has(stageNumber);

    // Expand the clicked stage first
    setExpandedStages(prev => new Set([...prev, stageNumber]));

    // If already expanded, scroll immediately. If not, wait for expansion to complete
    const scrollDelay = wasExpanded ? 0 : 50;

    setTimeout(() => {
      const stageElement = stageRefs.current.get(stageNumber);
      const container = stageContainerRef.current;

      if (stageElement && container) {
        // Calculate where the stage currently is relative to container's viewport
        const containerRect = container.getBoundingClientRect();
        const stageRect = stageElement.getBoundingClientRect();
        const relativePosition = stageRect.top - containerRect.top;

        // Scroll by that amount to bring stage top to container viewport top
        container.scrollTop = container.scrollTop + relativePosition;

        trail.light(7256, {
          operation: 'manual_scroll_executed',
          stage: stageNumber,
          wasExpanded,
          scrollDelay,
          relativePosition,
          newScrollTop: container.scrollTop
        });
      } else {
        trail.light(7257, {
          operation: 'manual_scroll_failed',
          stage: stageNumber,
          reason: !stageElement ? 'no_element' : 'no_container'
        });
      }
    }, scrollDelay);
  };

  // Initialize script service
  useEffect(() => {
    const initializeService = async () => {
      try {
        trail.light(7201, {
          operation: 'script_service_initialization_start'
        });

        const success = await scriptService.initialize();
        if (success) {
          const scripts = scriptService.getAvailableScripts();
          setAvailableScripts(scripts);
          setIsInitialized(true);

          // Notify parent of available scripts
          onScriptsLoaded?.(scripts);

          // Auto-select first script if available and not controlled
          if (scripts.length > 0 && !selectedScriptId) {
            const firstScriptId = scripts[0].id;
            scriptService.setActiveScript(firstScriptId);
            const script = scriptService.getCurrentScript();
            setCurrentScript(script);
            setProgress(scriptService.getProgress());

            // Load keywords
            if (script) {
              await keywordStageDetector.loadFromScript(script);
            }

            // Notify parent
            onScriptChange?.(firstScriptId);

            trail.light(7202, {
              operation: 'script_service_initialized',
              scriptsAvailable: scripts.length,
              activeScript: firstScriptId
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

  // Process new transcripts through keyword detector
  useEffect(() => {
    trail.light(7210, {
      operation: 'conversation_history_update',
      historyLength: conversationHistory.length,
      hasCurrentScript: !!currentScript,
      lastProcessed: lastProcessedIndex
    });

    if (currentScript && conversationHistory.length > lastProcessedIndex + 1) {
      // Process only new transcripts
      for (let i = lastProcessedIndex + 1; i < conversationHistory.length; i++) {
        const entry = conversationHistory[i];
        const confidence = keywordStageDetector.processTranscript(entry.text, true);

        if (confidence) {
          // Convert to StageDetectionResult format
          const currentStage = keywordStageDetector.getCurrentStage();
          const adherence = keywordStageDetector.calculateAdherence(currentStage);
          const progressHistory = keywordStageDetector.getProgressionHistory();

          const analysis: StageDetectionResult = {
            detectedStage: confidence.stage,
            confidence: confidence.confidence,
            stageCompletion: 0, // Not tracked in keyword detector
            evidence: confidence.matchedKeywords.map(kw => `"${kw}"`),
            missedElements: adherence.missedElements,
            suggestedActions: [
              ...adherence.recommendations,
              ...progressHistory.slice(-1).map(p => p.recommendation).filter(Boolean) as string[]
            ],
            adherenceScore: adherence.adherenceScore
          };

          setStageAnalysis(analysis);
          setSelectedStage(confidence.stage);
        }
      }

      setLastProcessedIndex(conversationHistory.length - 1);
      setProgress(scriptService.getProgress());
    }
  }, [conversationHistory, currentScript, scriptService, trail, lastProcessedIndex]);

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

  const handleScriptChange = useCallback(async (scriptId: string) => {
    trail.light(7251, {
      operation: 'handle_script_change_start',
      scriptId
    });

    const success = scriptService.setActiveScript(scriptId);
    if (success) {
      const script = scriptService.getCurrentScript();
      setCurrentScript(script);
      setProgress(scriptService.getProgress());

      trail.light(7252, {
        operation: 'script_retrieved',
        hasScript: !!script,
        scriptId: script?.id,
        scriptName: script?.name
      });

      // Reset detector state before loading new script
      keywordStageDetector.reset();
      setStageAnalysis(null);
      setLastProcessedIndex(-1);

      // Load keywords from the selected script
      if (script) {
        trail.light(7253, {
          operation: 'before_load_from_script',
          scriptId: script.id,
          stageCount: script.stages?.length
        });

        await keywordStageDetector.loadFromScript(script);

        trail.light(7254, {
          operation: 'after_load_from_script_success',
          scriptId: script.id
        });
      } else {
        trail.light(7255, {
          operation: 'script_is_null_cannot_load_keywords'
        });
      }

      // Notify parent
      onScriptChange?.(scriptId);
    } else {
      trail.fail(8255, new Error(`Failed to set active script: ${scriptId}`));
    }
  }, [scriptService, trail, onScriptChange]);

  // Respond to controlled selectedScriptId changes from parent
  useEffect(() => {
    trail.light(7248, {
      operation: 'script_change_useEffect_triggered',
      selectedScriptId,
      currentScriptId: currentScript?.id,
      isInitialized,
      willChange: !!(selectedScriptId && currentScript?.id !== selectedScriptId && isInitialized)
    });

    // Only change script if scripts are loaded (isInitialized)
    if (selectedScriptId && currentScript?.id !== selectedScriptId && isInitialized) {
      // Async wrapper to properly await the script change
      const changeScript = async () => {
        await handleScriptChange(selectedScriptId);
      };
      changeScript();
    }
  }, [selectedScriptId, currentScript?.id, handleScriptChange, trail, isInitialized]);

  // Auto-expand current stage when it changes
  useEffect(() => {
    if (selectedStage) {
      setExpandedStages(prev => {
        const newExpanded = new Set(prev);
        newExpanded.add(selectedStage);
        trail.light(7220, {
          operation: 'stage_auto_expanded',
          stageNumber: selectedStage,
          expandedCount: newExpanded.size
        });
        return newExpanded;
      });
    }
  }, [selectedStage, trail]);

  // Toggle stage expansion with LED breadcrumbs
  const toggleStageExpansion = (stageNumber: number) => {
    setExpandedStages(prev => {
      const newExpanded = new Set(prev);
      const isExpanding = !newExpanded.has(stageNumber);

      if (isExpanding) {
        newExpanded.add(stageNumber);
        trail.light(7221, {
          operation: 'stage_manually_expanded',
          stageNumber,
          expandedCount: newExpanded.size
        });
      } else {
        newExpanded.delete(stageNumber);
        trail.light(7222, {
          operation: 'stage_collapsed',
          stageNumber,
          expandedCount: newExpanded.size
        });
      }

      return newExpanded;
    });
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
            {currentScript && (
              <>
                {/* Sales Stage Guide - Expandable Vertical View - MOVED TO TOP */}
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4 text-primary-400" />
                      <h3 className="text-sm font-semibold text-slate-300">Sales Stage Guide</h3>
                    </div>
                    <div className="text-xs text-slate-400">
                      {currentScript.stages.length} stages
                    </div>
                  </div>

                  {/* Scrollable stage list */}
                  <div ref={stageContainerRef} className="space-y-2 max-h-96 overflow-y-auto pr-2 pb-80">
                    {currentScript.stages.map((stage) => {
                      const isExpanded = expandedStages.has(stage.number);
                      const isCurrent = selectedStage === stage.number;

                      return (
                        <div
                          key={stage.number}
                          ref={(el) => {
                            if (el) {
                              stageRefs.current.set(stage.number, el);
                            }
                          }}
                          className={`rounded border transition-all duration-200 ${
                            isCurrent
                              ? 'bg-primary-600/20 border-primary-500 shadow-lg'
                              : 'bg-slate-800/50 border-slate-600/50'
                          }`}
                        >
                          {/* Stage header - clickable to expand/collapse */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStageExpansion(stage.number);
                            }}
                            className="w-full p-2 flex items-center justify-between hover:bg-slate-700/30 rounded-t transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              {/* Clickable stage number for instant selection */}
                              <span
                                onClick={(e) => handleStageNumberClick(e, stage.number)}
                                className={`font-bold text-sm cursor-pointer hover:underline ${
                                  isCurrent ? 'text-primary-400 hover:text-primary-300' : 'text-slate-300 hover:text-primary-300'
                                }`}
                                title="Click to select this stage"
                              >
                                {stage.number}.
                              </span>
                              <span className={`font-bold text-sm ${
                                isCurrent ? 'text-primary-400' : 'text-slate-300'
                              }`}>
                                {stage.name}
                              </span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </button>

                          {/* Expanded content */}
                          {isExpanded && (
                            <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-700/50">
                              {/* Objective - concise summary */}
                              {stage.objective && (
                                <div>
                                  <div className="text-xs font-medium text-slate-400 mb-1">🎯 This Stage:</div>
                                  <div className="text-xs text-slate-300">{stage.objective}</div>
                                </div>
                              )}

                              {/* Detection phrases - keywords to advance to NEXT stage */}
                              {stage.detectionPhrases && stage.detectionPhrases.length > 0 && (
                                <div>
                                  <div className="text-xs font-medium text-slate-400 mb-1">➡️ Say This to Advance:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {stage.detectionPhrases.map((phrase, idx) => (
                                      <span
                                        key={idx}
                                        className="text-xs bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-700/50"
                                      >
                                        "{phrase}"
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Click to set as active stage */}
                              {!isCurrent && (
                                <button
                                  onClick={() => {
                                    setSelectedStage(stage.number);
                                    onStageSelected?.(stage.number);
                                    trail.light(7223, {
                                      operation: 'stage_manually_selected',
                                      stageNumber: stage.number
                                    });
                                  }}
                                  className="w-full text-xs text-primary-400 hover:text-primary-300 mt-2 py-1 border-t border-slate-700/50 pt-2"
                                >
                                  Set as active stage →
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 text-xs text-slate-500 text-center border-t border-slate-700 pt-2">
                    Click chevron to expand • Current stage auto-expands
                  </div>
                </div>

                {/* Current Sentiment / Full Script Toggle Panel */}
                <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-600/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-green-400" />
                      <h3 className="text-sm font-semibold text-slate-300">
                        {showFullScript ? 'Full Script' : 'Current Sentiment'}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs text-slate-400">
                        Stage {selectedStage}: {currentScript.stages.find(s => s.number === selectedStage)?.name}
                      </div>
                      <button
                        onClick={() => {
                          setShowFullScript(!showFullScript);
                          trail.light(7230, {
                            operation: 'sentiment_fullscript_toggle',
                            showingFullScript: !showFullScript
                          });
                        }}
                        className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
                      >
                        {showFullScript ? 'Sentiment' : 'Full Script'}
                      </button>
                    </div>
                  </div>

                  {!showFullScript ? (
                    <>
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
                    </>
                  ) : (
                    /* Full Script Display - Scrollable */
                    <div className="bg-slate-800/50 rounded border border-slate-600 p-4 max-h-64 overflow-y-auto">
                      {currentScript.stages.find(s => s.number === selectedStage)?.fullScript ? (
                        <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {currentScript.stages.find(s => s.number === selectedStage)?.fullScript}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic text-center py-8">
                          No full script available for this stage
                        </div>
                      )}
                    </div>
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
              </>
            )}
          </>
        )}
      </div>

    </div>
  );
};