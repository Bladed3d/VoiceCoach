/**
 * VoiceCoach V2 - Vosk Optimization Panel
 * Settings panel for launching and managing Vosk parameter optimization
 */
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, FileText, Music, Play, Settings, 
  ChevronRight, CheckCircle, AlertCircle, 
  BarChart3, Upload, Save, RefreshCw, Activity 
} from 'lucide-react';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

interface OptimizationResult {
  timestamp: string;
  parameters: VoskParameters;
  metrics: {
    wordAccuracy: number;
    characterAccuracy: number;
    realTimeFactor: number;
    averageLatency: number;
  };
  improvement: number;
  systemProfile: {
    cpuModel: string;
    availableMemory: number;
    backgroundNoise: number;
  };
}

interface VoskParameters {
  sampleRate: number;
  chunkSize: number;
  beamSize: number;
  maxActive: number;
  silenceThreshold: number;
  partialWords: boolean;
  setWords: boolean;
  setPartialWords: boolean;
}

interface TestFiles {
  audioFile: string | null;
  textFile: string | null;
  duration?: number;
}

export const VoskOptimizationPanel: React.FC = () => {
  const trail = new BreadcrumbTrail('VoskOptimizationPanel');
  
  // State management
  const [testFiles, setTestFiles] = useState<TestFiles>({
    audioFile: null,
    textFile: null
  });
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [lastResult, setLastResult] = useState<OptimizationResult | null>(null);
  const [savedResults, setSavedResults] = useState<OptimizationResult[]>([]);
  const [currentParameters, setCurrentParameters] = useState<VoskParameters | null>(null);
  
  // Live progress tracking
  const [currentTest, setCurrentTest] = useState(0);
  const [totalTests, setTotalTests] = useState(0);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [currentTestParams, setCurrentTestParams] = useState<string>('');
  const testLogRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Load saved optimization results
    const saved = localStorage.getItem('vosk-optimization-results');
    if (saved) {
      setSavedResults(JSON.parse(saved));
      const results = JSON.parse(saved);
      if (results.length > 0) {
        setLastResult(results[0]);
      }
    }
    
    // Load current Vosk configuration from AudioSettings
    const voskConfigStr = localStorage.getItem('voicecoach-vosk-config');
    if (voskConfigStr) {
      try {
        const voskConfig = JSON.parse(voskConfigStr);
        // Extract relevant parameters for optimization
        setCurrentParameters({
          sampleRate: voskConfig.audio?.sampleRate || 16000,
          chunkSize: voskConfig.audio?.chunkSize || 8000,
          beamSize: voskConfig.recognition?.beamSize || 13,
          maxActive: voskConfig.recognition?.maxActive || 7000,
          silenceThreshold: voskConfig.silenceDetection?.silenceThreshold || 0.5,
          partialWords: voskConfig.transcription?.partialWords || false,
          setWords: voskConfig.transcription?.setWords || false,
          setPartialWords: voskConfig.transcription?.setPartialWords !== false // Default to true
        });
        
        console.log('Loaded current Vosk parameters:', voskConfig);
      } catch (error) {
        console.error('Error loading Vosk config:', error);
      }
    }
    
    // Old parameter loading (kept for backwards compatibility)
    const params = localStorage.getItem('vosk-current-parameters');
    if (params && !voskConfigStr) {
      setCurrentParameters(JSON.parse(params));
    }
    
    trail.light(7500, {
      operation: 'vosk_optimization_panel_initialized',
      has_saved_results: !!saved
    });
  }, []);

  const handleFileSelect = async (type: 'audio' | 'text') => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;
    
    const filters = type === 'audio' 
      ? [{ name: 'Audio Files', extensions: ['wav', 'mp3', 'm4a'] }]
      : [{ name: 'Text Files', extensions: ['txt', 'md'] }];
    
    const result = await electronAPI.openFileDialog({
      filters,
      properties: ['openFile']
    });
    
    if (result && result.filePaths && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      setTestFiles(prev => ({
        ...prev,
        [type === 'audio' ? 'audioFile' : 'textFile']: filePath
      }));
      
      trail.light(7501, {
        operation: 'test_file_selected',
        file_type: type,
        file_path: filePath
      });
    }
  };

  const launchOptimization = async () => {
    if (!testFiles.audioFile || !testFiles.textFile) {
      alert('Please select both audio and text files first');
      return;
    }
    
    setIsOptimizing(true);
    setOptimizationProgress(0);
    
    trail.light(7502, {
      operation: 'optimization_started',
      audio_file: testFiles.audioFile,
      text_file: testFiles.textFile
    });
    
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.launchVoskOptimizer) {
      console.error('Vosk optimizer API not available');
      setIsOptimizing(false);
      return;
    }
    
    // Set up progress listener
    if (electronAPI.onVoskOptimizationProgress) {
      electronAPI.onVoskOptimizationProgress((event: any, progress: any) => {
        if (progress.phase === 'baseline') {
          setOptimizationProgress(0);
          setCurrentTest(0);
          setTestLog([`📊 Testing your current settings as baseline...`]);
          console.log('Testing baseline configuration');
        } else if (progress.phase === 'starting') {
          setOptimizationProgress(5); // Baseline done, starting optimization
          setCurrentTest(0);
          setTotalTests(progress.totalTests);
          setTestLog(prev => [...prev, `🚀 Starting optimization with ${progress.totalTests} parameter combinations...`]);
          console.log(`Starting optimization with ${progress.totalTests} tests`);
        } else if (progress.phase === 'testing') {
          const percentComplete = Math.round((progress.currentTest / progress.totalTests) * 100);
          setOptimizationProgress(percentComplete);
          setCurrentTest(progress.currentTest);
          
          // Format current parameters for display
          const params = progress.currentParams;
          const paramString = `SR: ${params.sampleRate}Hz, Chunk: ${params.chunkSize}, Words: ${params.setWords ? 'Yes' : 'No'}, Partials: ${params.setPartialWords ? 'Yes' : 'No'}`;
          setCurrentTestParams(paramString);
          
          // Add to test log
          setTestLog(prev => [...prev, `Test ${progress.currentTest}/${progress.totalTests}: ${paramString}`].slice(-10));
          
          // Auto-scroll log to bottom
          if (testLogRef.current) {
            testLogRef.current.scrollTop = testLogRef.current.scrollHeight;
          }
          
          console.log(`Testing ${progress.currentTest}/${progress.totalTests}:`, progress.currentParams);
        } else if (progress.phase === 'complete') {
          setOptimizationProgress(100);
          setTestLog(prev => [...prev, '✅ Optimization complete! Processing results...']);
          console.log('Optimization complete');
        }
      });
    }
    
    // Launch the optimization utility with current settings as baseline
    const result = await electronAPI.launchVoskOptimizer({
      audioFile: testFiles.audioFile,
      textFile: testFiles.textFile,
      mode: 'quick', // Start with quick mode for testing
      targetMetric: 'balanced', // accuracy, speed, or balanced
      currentSettings: currentParameters || {
        sampleRate: 16000,
        chunkSize: 8000,
        setWords: false,
        setPartialWords: true
      }
    });
    
    if (result.success) {
      setLastResult(result.data);
      
      // Save to history
      const newResults = [result.data, ...savedResults].slice(0, 10);
      setSavedResults(newResults);
      localStorage.setItem('vosk-optimization-results', JSON.stringify(newResults));
      
      trail.light(7503, {
        operation: 'optimization_completed',
        improvement: result.data.improvement,
        word_accuracy: result.data.metrics?.wordAccuracy || 0
      });
    } else {
      alert(`Optimization failed: ${result.error}`);
    }
    
    // Clean up progress listener
    if (electronAPI.removeVoskOptimizationListener) {
      electronAPI.removeVoskOptimizationListener();
    }
    
    setIsOptimizing(false);
    // Reset progress tracking
    setCurrentTest(0);
    setTotalTests(0);
    setCurrentTestParams('');
    setTestLog([]);
  };

  const applyOptimalSettings = async () => {
    if (!lastResult) return;
    
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;
    
    // Apply the optimal parameters to Vosk
    await electronAPI.updateVoskConfig(lastResult.parameters);
    
    // Save as current parameters
    setCurrentParameters(lastResult.parameters);
    localStorage.setItem('vosk-current-parameters', JSON.stringify(lastResult.parameters));
    
    trail.light(7504, {
      operation: 'optimal_settings_applied',
      parameters: lastResult.parameters
    });
    
    // Show success message with details
    const message = `✅ Optimal Vosk settings applied!\n\n` +
      `Improvements:\n` +
      `• Word Accuracy: ${lastResult.metrics.wordAccuracy.toFixed(1)}%\n` +
      `• ${lastResult.improvement.toFixed(1)}% better than before\n\n` +
      `The new settings are now active for all transcriptions.`;
    
    alert(message);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Mic className="w-6 h-6 text-primary-400" />
          <h2 className="text-xl font-semibold text-white">
            Vosk Transcription Optimizer
          </h2>
        </div>
        {lastResult && (
          <div className="flex items-center space-x-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-slate-400">
              Last optimized: {new Date(lastResult.timestamp).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Test Files Selection */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Music className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-white">Audio File</span>
              </div>
              <button
                onClick={() => handleFileSelect('audio')}
                className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
              >
                Select
              </button>
            </div>
            <div className="text-xs text-slate-400 truncate">
              {testFiles.audioFile ? (
                testFiles.audioFile.split('\\').pop()
              ) : (
                'No file selected'
              )}
            </div>
          </div>

          <div className="bg-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-white">Reference Text</span>
              </div>
              <button
                onClick={() => handleFileSelect('text')}
                className="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded"
              >
                Select
              </button>
            </div>
            <div className="text-xs text-slate-400 truncate">
              {testFiles.textFile ? (
                testFiles.textFile.split('\\').pop()
              ) : (
                'No file selected'
              )}
            </div>
          </div>
        </div>

        {/* Optimization Controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={launchOptimization}
            disabled={!testFiles.audioFile || !testFiles.textFile || isOptimizing}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isOptimizing 
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Optimizing... {optimizationProgress}%</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Start Optimization</span>
              </>
            )}
          </button>

          {lastResult && (
            <button
              onClick={applyOptimalSettings}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium text-white transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Apply Optimal Settings</span>
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Live Progress Display */}
      {isOptimizing && (
        <div className="mb-6 space-y-4">
          {/* Overall Progress Bar with Percentage */}
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-primary-400 animate-pulse" />
                <span className="text-sm font-medium text-white">
                  Testing Configuration {currentTest} of {totalTests}
                </span>
              </div>
              <span className="text-lg font-bold text-primary-400">
                {optimizationProgress}%
              </span>
            </div>
            <div className="bg-slate-800 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-primary-500 to-primary-400 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${optimizationProgress}%` }}
              />
            </div>
            
            {/* Current Parameters Being Tested */}
            {currentTestParams && (
              <div className="mt-3 text-xs text-slate-300 bg-slate-800 rounded px-3 py-2 font-mono">
                Testing: {currentTestParams}
              </div>
            )}
          </div>
          
          {/* Live Test Log - Scrolling Text */}
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Live Test Log</span>
              <span className="text-xs text-slate-400">Last 10 tests</span>
            </div>
            <div 
              ref={testLogRef}
              className="bg-slate-800 rounded p-3 h-32 overflow-y-auto scrollbar-thin scrollbar-track-slate-700 scrollbar-thumb-slate-600"
            >
              {testLog.map((log, index) => (
                <div 
                  key={index} 
                  className="text-xs text-slate-300 font-mono mb-1 animate-fade-in"
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
          
          <p className="text-xs text-slate-400 text-center">
            This may take several minutes. Each configuration is tested with your audio file.
          </p>
        </div>
      )}

      {/* Results Display with Action Required */}
      {lastResult && !isOptimizing && (
        <div className="space-y-4">
          {/* Action Required Alert */}
          <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-400 mb-1">
                  Optimization Complete - Action Required
                </h3>
                <p className="text-xs text-slate-300 mb-3">
                  {lastResult.improvement > 0 ? (
                    <>
                      We found settings that improve accuracy from <span className="font-semibold text-amber-400">{lastResult.baselineAccuracy?.toFixed(1) || '0'}%</span> to{' '}
                      <span className="font-semibold text-green-400">{lastResult.optimalAccuracy?.toFixed(1) || '0'}%</span> ({`+${lastResult.improvement.toFixed(1)}%`} better).
                    </>
                  ) : (
                    'Your current settings are already optimal! No improvements found.'
                  )}
                  {' '}These settings are NOT applied automatically for safety. Review the results below and{' '}
                  {lastResult.improvement > 0 && 'click "Apply Optimal Settings" to use them.'}
                </p>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={applyOptimalSettings}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium text-white transition-colors text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Apply Optimal Settings Now</span>
                  </button>
                  <span className="text-xs text-slate-400">
                    or continue using current settings
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-primary-400" />
                <span>Optimization Results</span>
              </h3>
              <span className={`text-sm font-bold ${
                lastResult.improvement > 0 ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {lastResult.improvement > 0 ? '+' : ''}{lastResult.improvement.toFixed(1)}% improvement
              </span>
            </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-800 rounded p-3">
              <div className="text-xs text-slate-400 mb-1">Word Accuracy</div>
              <div className="text-lg font-bold text-white">
                {lastResult.metrics.wordAccuracy.toFixed(1)}%
              </div>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <div className="text-xs text-slate-400 mb-1">Character Accuracy</div>
              <div className="text-lg font-bold text-white">
                {lastResult.metrics.characterAccuracy.toFixed(1)}%
              </div>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <div className="text-xs text-slate-400 mb-1">Real-time Factor</div>
              <div className="text-lg font-bold text-white">
                {lastResult.metrics.realTimeFactor.toFixed(2)}x
              </div>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <div className="text-xs text-slate-400 mb-1">Avg Latency</div>
              <div className="text-lg font-bold text-white">
                {lastResult.metrics.averageLatency}ms
              </div>
            </div>
          </div>

            {/* Parameters Comparison */}
            <div className="bg-slate-800 rounded p-3">
              <div className="text-xs font-semibold text-slate-400 mb-2">
                Settings Comparison:
              </div>
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-3 gap-2 text-slate-500 font-semibold border-b border-slate-700 pb-1">
                  <div>Parameter</div>
                  <div>Current</div>
                  <div>Optimal</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-slate-400">Sample Rate</div>
                  <div className="text-slate-500">{currentParameters?.sampleRate || 16000}Hz</div>
                  <div className="text-green-400 font-semibold">{lastResult.parameters.sampleRate}Hz</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-slate-400">Chunk Size</div>
                  <div className="text-slate-500">{currentParameters?.chunkSize || 8000}</div>
                  <div className="text-green-400 font-semibold">{lastResult.parameters.chunkSize}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-slate-400">Set Words</div>
                  <div className="text-slate-500">{currentParameters?.setWords ? 'Yes' : 'No'}</div>
                  <div className="text-green-400 font-semibold">{lastResult.parameters.setWords ? 'Yes' : 'No'}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-slate-400">Partial Words</div>
                  <div className="text-slate-500">{currentParameters?.partialWords ? 'Yes' : 'No'}</div>
                  <div className="text-green-400 font-semibold">{lastResult.parameters.partialWords ? 'Yes' : 'No'}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-slate-400">Set Partial Words</div>
                  <div className="text-slate-500">{currentParameters?.setPartialWords ? 'Yes' : 'No'}</div>
                  <div className="text-green-400 font-semibold">{lastResult.parameters.setPartialWords ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {savedResults.length > 1 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-slate-400 mb-2">Previous Results</h3>
          <div className="space-y-2">
            {savedResults.slice(1, 4).map((result, idx) => (
              <div 
                key={idx}
                className="bg-slate-700 rounded p-2 flex items-center justify-between text-xs"
              >
                <span className="text-slate-400">
                  {new Date(result.timestamp).toLocaleDateString()}
                </span>
                <span className="text-white">
                  {result.metrics.wordAccuracy.toFixed(1)}% accuracy
                </span>
                <button
                  onClick={() => setLastResult(result)}
                  className="text-primary-400 hover:text-primary-300"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};