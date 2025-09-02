/**
 * VoiceCoach V2 - Vosk Settings Modal
 * Real-time configuration for transcription optimization
 */
import React, { useState, useEffect } from 'react';
import { X, Mic, Zap, Clock, Cpu, RotateCcw, Save } from 'lucide-react';
import { VoskConfig, defaultVoskConfig, voskPresets } from '../../types/vosk-config';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

interface VoskSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: VoskConfig) => void;
  currentConfig?: VoskConfig;
}

export const VoskSettingsModal: React.FC<VoskSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentConfig = defaultVoskConfig
}) => {
  const trail = new BreadcrumbTrail('VoskSettingsModal');
  const [config, setConfig] = useState<VoskConfig>(currentConfig);
  const [activeTab, setActiveTab] = useState<'silence' | 'audio' | 'transcription' | 'performance'>('silence');
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  useEffect(() => {
    setConfig(currentConfig);
  }, [currentConfig]);

  if (!isOpen) return null;

  const handlePresetSelect = (presetKey: string) => {
    const preset = voskPresets[presetKey as keyof typeof voskPresets];
    if (preset) {
      trail.light(7300, {
        operation: 'preset_selected',
        preset: presetKey
      });
      
      setConfig({
        ...config,
        ...preset.config
      });
      setSelectedPreset(presetKey);
    }
  };

  const handleSave = () => {
    trail.light(7301, {
      operation: 'vosk_config_saved',
      config
    });
    
    // Save to localStorage for persistence
    localStorage.setItem('voicecoach-vosk-config', JSON.stringify(config));
    
    onSave(config);
    onClose();
  };

  const handleReset = () => {
    trail.light(7302, {
      operation: 'vosk_config_reset'
    });
    setConfig(defaultVoskConfig);
    setSelectedPreset('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg w-[800px] max-h-[600px] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <Mic className="w-6 h-6 text-primary-500" />
            <h2 className="text-xl font-semibold">Vosk Transcription Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets Bar */}
        <div className="px-6 py-3 bg-slate-800/50 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-400">Presets:</span>
            {Object.entries(voskPresets).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handlePresetSelect(key)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  selectedPreset === key
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('silence')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'silence'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Silence Detection
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'audio'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4 inline mr-2" />
            Audio Processing
          </button>
          <button
            onClick={() => setActiveTab('transcription')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'transcription'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Transcription Mode
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'performance'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4 inline mr-2" />
            Performance
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[320px]">
          {/* Silence Detection Tab */}
          {activeTab === 'silence' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Partial to Final Timeout
                  <span className="text-xs text-slate-400 ml-2">
                    ({config.silenceDetection.partialTimeout}s)
                  </span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={config.silenceDetection.partialTimeout}
                  onChange={(e) => setConfig({
                    ...config,
                    silenceDetection: {
                      ...config.silenceDetection,
                      partialTimeout: parseFloat(e.target.value)
                    }
                  })}
                  className="w-full"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Time before partial transcripts become final (lower = faster commits)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Sentence Gap Threshold
                  <span className="text-xs text-slate-400 ml-2">
                    ({config.silenceDetection.sentenceGapThreshold}s)
                  </span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={config.silenceDetection.sentenceGapThreshold}
                  onChange={(e) => setConfig({
                    ...config,
                    silenceDetection: {
                      ...config.silenceDetection,
                      sentenceGapThreshold: parseFloat(e.target.value)
                    }
                  })}
                  className="w-full"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Silence duration to detect sentence boundaries
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Minimum Trailing Silence
                  <span className="text-xs text-slate-400 ml-2">
                    ({config.silenceDetection.minTrailingSilence}s)
                  </span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={config.silenceDetection.minTrailingSilence}
                  onChange={(e) => setConfig({
                    ...config,
                    silenceDetection: {
                      ...config.silenceDetection,
                      minTrailingSilence: parseFloat(e.target.value)
                    }
                  })}
                  className="w-full"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Minimum silence before triggering final transcript
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="aggressive"
                  checked={config.silenceDetection.aggressiveEndpointing}
                  onChange={(e) => setConfig({
                    ...config,
                    silenceDetection: {
                      ...config.silenceDetection,
                      aggressiveEndpointing: e.target.checked
                    }
                  })}
                  className="rounded"
                />
                <label htmlFor="aggressive" className="text-sm">
                  Aggressive Endpointing
                  <span className="text-xs text-slate-400 block">
                    Faster detection but may cut off speech
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Audio Processing Tab */}
          {activeTab === 'audio' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Sample Rate (Hz)
                </label>
                <select
                  value={config.audio.sampleRate}
                  onChange={(e) => setConfig({
                    ...config,
                    audio: {
                      ...config.audio,
                      sampleRate: parseInt(e.target.value)
                    }
                  })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                >
                  <option value="8000">8000 Hz (Phone quality)</option>
                  <option value="16000">16000 Hz (Standard)</option>
                  <option value="22050">22050 Hz (High quality)</option>
                  <option value="44100">44100 Hz (CD quality)</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Higher rates = better quality but more CPU
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Chunk Size (samples)
                  <span className="text-xs text-slate-400 ml-2">
                    ({config.audio.chunkSize})
                  </span>
                </label>
                <input
                  type="range"
                  min="2000"
                  max="16000"
                  step="1000"
                  value={config.audio.chunkSize}
                  onChange={(e) => setConfig({
                    ...config,
                    audio: {
                      ...config.audio,
                      chunkSize: parseInt(e.target.value)
                    }
                  })}
                  className="w-full"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Smaller chunks = lower latency, higher CPU
                </p>
              </div>
            </div>
          )}

          {/* Transcription Mode Tab */}
          {activeTab === 'transcription' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Transcription Mode
                </label>
                <select
                  value={config.transcription.mode}
                  onChange={(e) => setConfig({
                    ...config,
                    transcription: {
                      ...config.transcription,
                      mode: e.target.value as any
                    }
                  })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                >
                  <option value="word">Word-by-word (Fastest)</option>
                  <option value="phrase">Phrase detection (Balanced)</option>
                  <option value="sentence">Complete sentences (Cleanest)</option>
                  <option value="hybrid">Hybrid (Adaptive)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Minimum Phrase Words
                  <span className="text-xs text-slate-400 ml-2">
                    ({config.transcription.minPhraseWords})
                  </span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={config.transcription.minPhraseWords}
                  onChange={(e) => setConfig({
                    ...config,
                    transcription: {
                      ...config.transcription,
                      minPhraseWords: parseInt(e.target.value)
                    }
                  })}
                  className="w-full"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Minimum words before treating as a phrase
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="partials"
                    checked={config.transcription.enablePartials}
                    onChange={(e) => setConfig({
                      ...config,
                      transcription: {
                        ...config.transcription,
                        enablePartials: e.target.checked
                      }
                    })}
                    className="rounded"
                  />
                  <label htmlFor="partials" className="text-sm">
                    Show Partial Results
                    <span className="text-xs text-slate-400 block">
                      Display incremental transcription updates
                    </span>
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="timings"
                    checked={config.transcription.enableWordTimings}
                    onChange={(e) => setConfig({
                      ...config,
                      transcription: {
                        ...config.transcription,
                        enableWordTimings: e.target.checked
                      }
                    })}
                    className="rounded"
                  />
                  <label htmlFor="timings" className="text-sm">
                    Enable Word Timings
                    <span className="text-xs text-slate-400 block">
                      Include timestamps for each word
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Debounce Delay
                  <span className="text-xs text-slate-400 ml-2">
                    ({config.performance.debounceMs}ms)
                  </span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={config.performance.debounceMs}
                  onChange={(e) => setConfig({
                    ...config,
                    performance: {
                      ...config.performance,
                      debounceMs: parseInt(e.target.value)
                    }
                  })}
                  className="w-full"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Delay before processing rapid updates
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Queue Size
                  <span className="text-xs text-slate-400 ml-2">
                    ({config.performance.maxQueueSize})
                  </span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={config.performance.maxQueueSize}
                  onChange={(e) => setConfig({
                    ...config,
                    performance: {
                      ...config.performance,
                      maxQueueSize: parseInt(e.target.value)
                    }
                  })}
                  className="w-full"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Maximum audio chunks in processing queue
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="throttle"
                  checked={config.performance.cpuThrottling}
                  onChange={(e) => setConfig({
                    ...config,
                    performance: {
                      ...config.performance,
                      cpuThrottling: e.target.checked
                    }
                  })}
                  className="rounded"
                />
                <label htmlFor="throttle" className="text-sm">
                  CPU Throttling
                  <span className="text-xs text-slate-400 block">
                    Reduce CPU usage at the cost of latency
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Defaults</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};