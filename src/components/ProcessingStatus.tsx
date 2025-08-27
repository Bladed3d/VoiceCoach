import { useState, useEffect } from 'react';
import { Brain, FileSearch, Target, CheckCircle2, AlertCircle, RotateCcw, Zap } from 'lucide-react';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Progress } from './ui/Progress';
import { Badge } from './ui/Badge';

interface DocumentFile {
  name: string;
  size: number;
  content: string;
  path: string;
}

interface ProcessingStatusProps {
  document: DocumentFile;
  questionnaire: any;
  onCompleted: (insights: any) => void;
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ 
  document, 
  questionnaire, 
  onCompleted 
}) => {
  const trail = new BreadcrumbTrail('ProcessingStatus');
  
  const [currentPhase, setCurrentPhase] = useState<'1A' | '1B' | '1C' | 'complete'>('1A');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trail.light(5001, { 
      operation: 'processing_start',
      document: document.name,
      questionnaire: Object.keys(questionnaire).length
    });

    // Start the 3-phase processing
    startProcessing();
  }, [document, questionnaire]);

  const startProcessing = async () => {
    try {
      // Phase 1A: Pure Document Analysis
      await runPhase1A();
      
      // Phase 1B: Contextualized Analysis
      await runPhase1B();
      
      // Phase 1C: Synthesis
      await runPhase1C();
      
      // Complete
      completeProcessing();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      trail.fail(5002, new Error(errorMessage));
      setError(errorMessage);
    }
  };

  const runPhase1A = async () => {
    trail.light(3001, { operation: 'phase_1a_start' });
    setCurrentPhase('1A');
    setStatus('Phase 1A: Analyzing document content...');
    setProgress(10);

    // Simulate Phase 1A processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    trail.light(3099, { operation: 'phase_1a_complete' });
    setProgress(33);
  };

  const runPhase1B = async () => {
    trail.light(4001, { operation: 'phase_1b_start' });
    setCurrentPhase('1B');
    setStatus('Phase 1B: Applying contextual priorities...');
    setProgress(40);

    // Simulate Phase 1B processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    trail.light(4099, { operation: 'phase_1b_complete' });
    setProgress(66);
  };

  const runPhase1C = async () => {
    trail.light(5001, { operation: 'phase_1c_start' });
    setCurrentPhase('1C');
    setStatus('Phase 1C: Synthesizing coaching insights...');
    setProgress(70);

    // Simulate Phase 1C processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    trail.light(5099, { operation: 'phase_1c_complete' });
    setProgress(100);
  };

  const completeProcessing = async () => {
    try {
      trail.light(5100, { operation: 'processing_complete_start' });
      setStatus('Finalizing insights...');
      
      // Use Electron API to process document
      if (window.electronAPI) {
        const insights = await window.electronAPI.processDocument({
          content: document.content,
          questionnaire
        });
        
        trail.light(5101, { operation: 'processing_complete', qualityScore: insights.qualityScore });
        setCurrentPhase('complete');
        setStatus('Processing complete!');
        
        setTimeout(() => {
          onCompleted(insights);
        }, 1000);
      } else {
        // Fallback for development
        const insights = {
          qualityScore: 92,
          totalTechniques: 24,
          criticalInsights: 8,
          quickWins: 12,
          coachingPrompts: {
            opening: ['Technique 1', 'Technique 2'],
            discovery: ['Question 1', 'Question 2'],
            objection_handling: ['Response 1', 'Response 2'],
            closing: ['Close 1', 'Close 2']
          }
        };
        
        setTimeout(() => {
          onCompleted(insights);
        }, 1000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      setError(errorMessage);
      trail.light(5102, { operation: 'processing_error', error: errorMessage });
    }
  };

  const phaseDetails = {
    '1A': {
      title: 'Pure Document Analysis',
      description: 'Extracting all actionable sales content from your document',
      icon: FileSearch,
      ledRange: '3000-3099',
      estimatedTime: '2-3 minutes'
    },
    '1B': {
      title: 'Contextual Analysis', 
      description: 'Prioritizing content based on your specific business needs',
      icon: Target,
      ledRange: '4000-4099',
      estimatedTime: '2-3 minutes'
    },
    '1C': {
      title: 'Synthesis & Preparation',
      description: 'Creating coaching-ready insights for live sales calls',
      icon: Brain,
      ledRange: '5000-5099',
      estimatedTime: '1-2 minutes'
    },
    'complete': {
      title: 'Processing Complete',
      description: 'Your coaching insights are ready!',
      icon: CheckCircle2,
      ledRange: '5100',
      estimatedTime: 'Done!'
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