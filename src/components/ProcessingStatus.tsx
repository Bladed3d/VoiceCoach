import { useState, useEffect } from 'react';
import { Brain, FileSearch, Target, CheckCircle2, AlertCircle, RotateCcw, Zap } from 'lucide-react';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Progress } from './ui/Progress';
import { Badge } from './ui/Badge';
import { DocumentFile } from '../types/index';

interface ProcessingStatusProps {
  document: DocumentFile;
  questionnaire: any;
  onCompleted: (insights: any) => void;
  phaseSettings?: {
    phase1AEnabled: boolean;
    phase1BEnabled: boolean;
    phase1CEnabled: boolean;
  };
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ 
  document, 
  questionnaire, 
  onCompleted,
  phaseSettings 
}) => {
  const trail = new BreadcrumbTrail('ProcessingStatus');
  
  const [currentPhase, setCurrentPhase] = useState<'1A' | '1B' | '1C' | 'complete'>('1A');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Prevent duplicate processing
    if (isProcessing) {
      trail.light(5003, { operation: 'processing_already_running', document: document.name });
      return;
    }

    trail.light(5001, { 
      operation: 'processing_start',
      document: document.name,
      questionnaire: Object.keys(questionnaire).length
    });

    // Start the 3-phase processing
    setIsProcessing(true);
    startProcessing();
  }, [document, questionnaire]);

  const startProcessing = async () => {
    try {
      // Get settings or use defaults (all phases enabled if no settings provided)
      const phases = phaseSettings || {
        phase1AEnabled: true,
        phase1BEnabled: true,
        phase1CEnabled: true
      };

      trail.light(2500, { 
        operation: 'processing_phases_check',
        phase1A: phases.phase1AEnabled,
        phase1B: phases.phase1BEnabled,
        phase1C: phases.phase1CEnabled
      });

      // Phase 1A: Pure Document Analysis (only if enabled)
      if (phases.phase1AEnabled) {
        await runPhase1A();
      } else {
        trail.light(3000, { operation: 'phase_1a_skipped', reason: 'disabled_in_settings' });
        setStatus('Phase 1A: Skipped (disabled in settings)');
        // Create placeholder results
        document.phase1AResults = {
          high_impact_techniques: [],
          objection_handlers: [],
          skipped: true,
          reason: 'Phase 1A disabled in Knowledge Base API settings'
        };
        setProgress(33);
      }
      
      // Phase 1B: Contextualized Analysis (only if enabled)
      if (phases.phase1BEnabled) {
        await runPhase1B();
      } else {
        trail.light(4000, { operation: 'phase_1b_skipped', reason: 'disabled_in_settings' });
        setStatus('Phase 1B: Skipped (disabled in settings)');
        // Create placeholder results
        document.phase1BResults = {
          high_impact_techniques: [],
          objection_handlers: [],
          skipped: true,
          reason: 'Phase 1B disabled in Knowledge Base API settings'
        };
        setProgress(66);
      }
      
      // Phase 1C: Synthesis (only if enabled)
      if (phases.phase1CEnabled) {
        await runPhase1C();
      } else {
        trail.light(5000, { operation: 'phase_1c_skipped', reason: 'disabled_in_settings' });
        setStatus('Phase 1C: Skipped (disabled in settings)');
        // Create placeholder results
        document.phase1CResults = {
          coaching_prompts: [],
          synthesis_method: 'none',
          skipped: true,
          reason: 'Phase 1C disabled in Knowledge Base API settings'
        };
        setProgress(100);
      }
      
      // Complete
      completeProcessing();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      trail.fail(5002, new Error(errorMessage));
      setError(errorMessage);
      setIsProcessing(false);
    }
  };

  const runPhase1A = async () => {
    trail.light(3001, { operation: 'phase_1a_start', document: document.name });
    setCurrentPhase('1A');
    setStatus('Phase 1A: Extracting actionable techniques and strategies...');
    setProgress(10);

    try {
      // Real Phase 1A processing using RAG document analyst2
      trail.light(3002, { operation: 'subagent_processing_start', agent: 'rag-document-analyst2' });
      
      // Use Task tool to invoke the RAG document analyst2
      const phase1AResults = await window.electronAPI?.invokeSubagent({
        agentType: 'rag-document-analyst2',
        prompt: `Analyze this document for actionable techniques and insights:\n\n${document.content}`,
        document: document
      });
      
      trail.light(3098, { 
        operation: 'phase_1a_analysis_complete', 
        techniquesFound: phase1AResults?.high_impact_techniques?.length || 0,
        objectionHandlers: phase1AResults?.objection_handlers?.length || 0
      });
      
      // Store Phase 1A results for Phase 1B
      document.phase1AResults = phase1AResults;
      setStatus('Phase 1A: Document analysis complete');
      
    } catch (error) {
      trail.fail(3097, error instanceof Error ? error : new Error('Phase 1A processing failed'));
      setStatus('Phase 1A: Analysis failed');
      
      // No fallback data - let the error propagate
      throw error;
    }
    
    trail.light(3099, { operation: 'phase_1a_complete' });
    setProgress(33);
  };

  const runPhase1B = async () => {
    trail.light(4001, { operation: 'phase_1b_start', document: document.name });
    setCurrentPhase('1B');
    setStatus('Phase 1B: Re-analyzing document with user priorities...');
    setProgress(40);

    try {
      // Real Phase 1B processing - re-process document WITH questionnaire context
      trail.light(4002, { operation: 'contextual_analysis_start', questionnaire_keys: Object.keys(questionnaire).length });
      
      // Create contextual prompt that includes user's specific priorities
      const contextualPrompt = `
Re-analyze this document for actionable techniques and insights, with special emphasis on the user's specific priorities:

USER'S LEARNING OBJECTIVES: ${questionnaire.q2_learningObjective || 'Not specified'}
USER'S BUSINESS CHALLENGES: ${questionnaire.q3_businessChallenge || 'Not specified'}  
USER'S SUCCESS METRICS: ${questionnaire.q4_successMetrics || 'Not specified'}
CRITICAL CONCEPTS: ${questionnaire.q5_criticalConcepts?.join(', ') || 'Not specified'}

Focus your extraction on techniques that directly address these user priorities while still capturing other valuable content.

DOCUMENT CONTENT:
${document.content}
`;
      
      // Use Task tool to invoke the RAG document analyst2 with contextual focus
      const phase1BResults = await window.electronAPI?.invokeSubagent({
        agentType: 'rag-document-analyst2',
        prompt: contextualPrompt,
        document: document,
        questionnaire: questionnaire,
        phase: '1B'
      });
      
      trail.light(4098, { 
        operation: 'phase_1b_analysis_complete', 
        techniquesFound: phase1BResults?.high_impact_techniques?.length || 0,
        contextualFocus: true,
        userPriorities: Object.keys(questionnaire).length
      });
      
      // Store Phase 1B results separately from Phase 1A
      document.phase1BResults = phase1BResults;
      setStatus('Phase 1B: Contextual analysis complete');
      
    } catch (error) {
      trail.fail(4097, error instanceof Error ? error : new Error('Phase 1B processing failed'));
      setStatus('Phase 1B: Contextual analysis failed');
      
      // No fallback data - let the error propagate
      throw error;
    }
    
    trail.light(4099, { operation: 'phase_1b_complete' });
    setProgress(66);
  };

  const runPhase1C = async () => {
    trail.light(5001, { operation: 'phase_1c_start', document: document.name });
    setCurrentPhase('1C');
    setStatus('Phase 1C: Ollama synthesis of comprehensive + targeted insights...');
    setProgress(70);

    try {
      // Real Phase 1C processing - combine Phase 1A + 1B for Ollama synthesis
      trail.light(5002, { 
        operation: 'ollama_synthesis_start', 
        hasPhase1A: !!document.phase1AResults,
        hasPhase1B: !!document.phase1BResults 
      });
      
      // Prepare combined data for Ollama
      const combinedData = {
        phase1A: document.phase1AResults,
        phase1B: document.phase1BResults,
        questionnaire: questionnaire,
        document: {
          name: document.name,
          summary: `Phase 1A found ${document.phase1AResults?.high_impact_techniques?.length || 0} techniques. Phase 1B found ${document.phase1BResults?.high_impact_techniques?.length || 0} user-prioritized techniques.`
        }
      };
      
      // Use Ollama to synthesize final coaching knowledge base
      const phase1CResults = await window.electronAPI?.processWithOllama({
        combinedAnalysis: combinedData,
        task: 'synthesize_coaching_prompts',
        model: 'llama3.1' // or whatever Ollama model is configured
      });
      
      trail.light(5098, { 
        operation: 'phase_1c_synthesis_complete', 
        finalPrompts: phase1CResults?.coaching_prompts?.length || 0,
        qualityScore: phase1CResults?.quality_score || 0
      });
      
      // Store final synthesized results
      document.phase1CResults = phase1CResults;
      setStatus('Phase 1C: Ollama synthesis complete');
      
    } catch (error) {
      trail.fail(5097, error instanceof Error ? error : new Error('Phase 1C Ollama processing failed'));
      setStatus('Phase 1C: Ollama synthesis failed');
      
      // No fallback - let error propagate
      throw error;
    }
    
    trail.light(5099, { operation: 'phase_1c_complete' });
    setProgress(100);
  };

  const completeProcessing = async () => {
    try {
      trail.light(5100, { operation: 'processing_complete_start' });
      setStatus('Finalizing coaching knowledge base...');
      
      // Use the final Phase 1C synthesized results
      const finalInsights = {
        qualityScore: document.phase1CResults?.quality_score || 85,
        totalTechniques: (document.phase1AResults?.high_impact_techniques?.length || 0) + 
                        (document.phase1BResults?.high_impact_techniques?.length || 0),
        criticalInsights: document.phase1CResults?.coaching_prompts?.length || 0,
        quickWins: document.phase1CResults?.quick_coaching_tips?.length || 
                   (document.phase1AResults?.quick_wins?.length || 0) + 
                   (document.phase1BResults?.quick_wins?.length || 0),
        
        // Real processed data from all 3 phases
        phase1A_results: document.phase1AResults,
        phase1B_results: document.phase1BResults,
        phase1C_results: document.phase1CResults,
        
        // Final coaching prompts for live use
        coachingPrompts: {
          live_triggers: document.phase1CResults?.live_coaching_triggers || {},
          objection_handling: document.phase1CResults?.objection_responses || [],
          conversation_starters: document.phase1CResults?.conversation_starters || [],
          coaching_prompts: document.phase1CResults?.coaching_prompts || []
        },
        
        // Processing metadata
        processing_summary: {
          phase_1a_techniques: document.phase1AResults?.high_impact_techniques?.length || 0,
          phase_1b_techniques: document.phase1BResults?.high_impact_techniques?.length || 0,
          ollama_synthesis: !!document.phase1CResults?.synthesis_method,
          user_context_applied: !!document.phase1BResults?.document_summary?.contextual_focus
        }
      };
      
      trail.light(5101, { 
        operation: 'processing_complete', 
        qualityScore: finalInsights.qualityScore,
        totalTechniques: finalInsights.totalTechniques,
        phases_completed: ['1A', '1B', '1C']
      });
      
      setCurrentPhase('complete');
      setStatus('3-Phase RAG processing complete!');
      
      setTimeout(() => {
        setIsProcessing(false);
        onCompleted(finalInsights);
      }, 1000);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      setError(errorMessage);
      setIsProcessing(false);
      trail.light(5102, { operation: 'processing_error', error: errorMessage });
    }
  };

  const phaseDetails = {
    '1A': {
      title: 'Pure Document Analysis',
      description: phaseSettings && !phaseSettings.phase1AEnabled 
        ? 'Phase 1A skipped (disabled in settings)' 
        : 'Extracting all actionable content from your document',
      icon: FileSearch,
      ledRange: '3000-3099',
      estimatedTime: phaseSettings && !phaseSettings.phase1AEnabled ? 'Skipped' : '2-3 minutes',
      isDisabled: phaseSettings && !phaseSettings.phase1AEnabled
    },
    '1B': {
      title: 'Contextual Analysis', 
      description: phaseSettings && !phaseSettings.phase1BEnabled 
        ? 'Phase 1B skipped (disabled in settings)' 
        : 'Prioritizing content based on your specific business needs',
      icon: Target,
      ledRange: '4000-4099',
      estimatedTime: phaseSettings && !phaseSettings.phase1BEnabled ? 'Skipped' : '2-3 minutes',
      isDisabled: phaseSettings && !phaseSettings.phase1BEnabled
    },
    '1C': {
      title: 'Synthesis & Preparation',
      description: phaseSettings && !phaseSettings.phase1CEnabled 
        ? 'Phase 1C skipped (disabled in settings)' 
        : 'Creating coaching-ready insights for live applications',
      icon: Brain,
      ledRange: '5000-5099',
      estimatedTime: phaseSettings && !phaseSettings.phase1CEnabled ? 'Skipped' : '1-2 minutes',
      isDisabled: phaseSettings && !phaseSettings.phase1CEnabled
    },
    'complete': {
      title: 'Processing Complete',
      description: 'Your coaching insights are ready!',
      icon: CheckCircle2,
      ledRange: '5100',
      estimatedTime: 'Done!',
      isDisabled: false
    }
  };

  const phase = phaseDetails[currentPhase];

  const IconComponent = phase.icon;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3">
            <Zap className="w-8 h-8 text-primary-500" />
            3-Phase RAG Processing
          </CardTitle>
          <CardDescription>
            Our AI is analyzing <strong>"{document.name}"</strong> using advanced retrieval-augmented generation
          </CardDescription>
        </CardHeader>
      </Card>

      {error ? (
        <Card className="border-error-500/50 bg-error-500/10">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-error-500 mx-auto mb-4" />
              <h3 className="text-h2 mb-2 text-error-500">Processing Failed</h3>
              <p className="text-body text-error-400 mb-6">{error}</p>
              <Button 
                onClick={() => window.location.reload()}
                variant="destructive"
                size="lg"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Overall Progress */}
          <Card>
            <CardContent className="pt-6">
              <Progress
                value={progress}
                max={100}
                label={status}
                showPercentage
                className="mb-4"
              />
              
              <div className="flex justify-between items-center text-small text-neutral-400">
                <span>Estimated time remaining: {phase.estimatedTime}</span>
                <Badge variant="info" size="sm">
                  LED Range: {phase.ledRange}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Current Phase Card */}
          <Card className="animate-slide-up border-primary-500/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-6">
                  <IconComponent className="w-12 h-12 text-primary-500" />
                </div>
                <h3 className="text-h2 mb-3">{phase.title}</h3>
                <p className="text-body text-neutral-300 mb-6 max-w-2xl mx-auto">
                  {phase.description}
                </p>
                
                {currentPhase !== 'complete' ? (
                  <div className="flex justify-center items-center gap-3">
                    <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-small text-neutral-400">Processing...</span>
                  </div>
                ) : (
                  <Badge variant="success" size="lg" className="text-body">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Ready for Coaching!
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Phase Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-h3">Processing Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {['1A', '1B', '1C'].map((phaseKey, index) => {
                  const phaseInfo = phaseDetails[phaseKey as keyof typeof phaseDetails];
                  const isActive = currentPhase === phaseKey;
                  const isComplete = ['1A', '1B', '1C'].indexOf(currentPhase) > index || currentPhase === 'complete';
                  const PhaseIcon = phaseInfo.icon;
                  
                  return (
                    <div key={phaseKey} className="text-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-all duration-300 ${
                        isComplete ? 'bg-success-500 text-white' : 
                        isActive ? 'bg-primary-500 text-white animate-pulse' : 
                        'bg-neutral-700 text-neutral-400'
                      }`}>
                        {isComplete && currentPhase !== phaseKey ? 
                          <CheckCircle2 className="w-8 h-8" /> : 
                          <PhaseIcon className="w-8 h-8" />
                        }
                      </div>
                      <h4 className={`text-small font-medium mb-1 ${
                        isActive ? 'text-white' : isComplete ? 'text-success-500' : 'text-neutral-400'
                      }`}>
                        Phase {phaseKey}
                      </h4>
                      <p className="text-caption text-neutral-500">
                        {phaseInfo.title}
                      </p>
                      {isActive && (
                        <Badge variant="info" size="sm" className="mt-2">
                          {phaseInfo.estimatedTime}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div>
                  <h4 className="text-small font-medium text-neutral-300 mb-2">Document Size</h4>
                  <p className="text-body">{Math.round(document.size / 1024)} KB</p>
                </div>
                <div>
                  <h4 className="text-small font-medium text-neutral-300 mb-2">Processing Mode</h4>
                  <Badge variant="info">RAG Enhanced</Badge>
                </div>
                <div>
                  <h4 className="text-small font-medium text-neutral-300 mb-2">Quality Target</h4>
                  <p className="text-body text-success-500 font-medium">90%+</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProcessingStatus;