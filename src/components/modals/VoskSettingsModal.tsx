/**
 * VoiceCoach V2 - Vosk Settings Modal
 * Real-time configuration for transcription optimization
 */
import React, { useState, useEffect } from 'react';
import { X, Mic, Zap, Clock, Cpu, RotateCcw, Save, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { VoskConfig, defaultVoskConfig, voskPresets } from '../../types/vosk-config';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { voskConfigService } from '../../services/vosk-config-service';

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
  const [lastAppliedPreset, setLastAppliedPreset] = useState<string>('');
  const [isModified, setIsModified] = useState<boolean>(false);
  const [showSaveNotification, setShowSaveNotification] = useState<boolean>(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [savingToPreset, setSavingToPreset] = useState<string>('');
  const [showPresetSaveNotification, setShowPresetSaveNotification] = useState<boolean>(false);

  // Helper function to check if config matches a preset
  const checkPresetMatch = (config: VoskConfig): string => {
    for (const [key, preset] of Object.entries(voskPresets)) {
      const presetConfig = preset.config;
      // Check key settings that define each preset
      if (
        config.transcription?.mode === presetConfig.transcription?.mode &&
        config.transcription?.enablePartials === presetConfig.transcription?.enablePartials &&
        config.audio?.chunkSize === presetConfig.audio?.chunkSize &&
        config.silenceDetection?.partialTimeout === presetConfig.silenceDetection?.partialTimeout &&
        config.performance?.debounceMs === presetConfig.performance?.debounceMs
      ) {
        return key;
      }
    }
    return '';
  };

  // Check if current config is modified from the selected preset
  const checkIfModified = () => {
    if (!selectedPreset || !voskPresets[selectedPreset as keyof typeof voskPresets]) {
      return false;
    }
    const presetConfig = voskPresets[selectedPreset as keyof typeof voskPresets].config;
    return JSON.stringify(config) !== JSON.stringify({ ...config, ...presetConfig });
  };

  useEffect(() => {
    setConfig(currentConfig);
    // Load last applied preset from localStorage
    const savedPreset = localStorage.getItem('voicecoach-vosk-last-preset');
    if (savedPreset) {
      setLastAppliedPreset(savedPreset);
    }
    // Check which preset matches on load
    const matchingPreset = checkPresetMatch(currentConfig);
    if (matchingPreset) {
      setSelectedPreset(matchingPreset);
      if (!savedPreset) {
        setLastAppliedPreset(matchingPreset);
      }
    }
  }, [currentConfig]);

  useEffect(() => {
    // Check if config has been modified whenever it changes
    setIsModified(checkIfModified());
  }, [config, selectedPreset]);

  if (!isOpen) return null;

  const handlePresetSelect = (presetKey: string) => {
    // First check for custom saved preset
    const customPresets = JSON.parse(localStorage.getItem('voicecoach-custom-presets') || '{}');
    if (customPresets[presetKey]) {
      trail.light(7300, {
        operation: 'custom_preset_selected',
        preset: presetKey
      });
      
      const customConfig = customPresets[presetKey];
      delete customConfig.timestamp; // Remove timestamp before applying
      setConfig({
        ...config,
        ...customConfig
      });
      setSelectedPreset(presetKey);
      setLastAppliedPreset(presetKey);
      setIsModified(false);
      localStorage.setItem('voicecoach-vosk-last-preset', presetKey);
      return;
    }
    
    // Otherwise use default preset
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
      setLastAppliedPreset(presetKey);
      setIsModified(false);
      localStorage.setItem('voicecoach-vosk-last-preset', presetKey);
    }
  };

  const handlePresetMouseDown = (presetKey: string) => {
    // Start timer for long press (2 seconds)
    const timer = setTimeout(() => {
      handleSaveToPreset(presetKey);
    }, 2000);
    setPressTimer(timer);
    setSavingToPreset(presetKey);
  };

  const handlePresetMouseUp = () => {
    // Clear timer if released before 2 seconds
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
      setSavingToPreset('');
    }
  };

  const handleSaveToPreset = (presetKey: string) => {
    trail.light(7305, {
      operation: 'save_current_settings_to_preset',
      preset: presetKey
    });

    // Save current config to the preset in localStorage
    const customPresets = JSON.parse(localStorage.getItem('voicecoach-custom-presets') || '{}');
    customPresets[presetKey] = {
      ...config,
      timestamp: Date.now()
    };
    localStorage.setItem('voicecoach-custom-presets', JSON.stringify(customPresets));

    // Show notification
    setShowPresetSaveNotification(true);
    setSavingToPreset('');
    setPressTimer(null);
    
    setTimeout(() => {
      setShowPresetSaveNotification(false);
    }, 3000);

    // Mark as selected
    setSelectedPreset(presetKey);
    setLastAppliedPreset(presetKey);
    setIsModified(false);
  };

  const handleSave = async () => {
    trail.light(7301, {
      operation: 'vosk_config_save_initiated',
      mode: config.transcription?.mode,
      enablePartials: config.transcription?.enablePartials,
      enableWordTimings: config.transcription?.enableWordTimings,
      debounceMs: config.performance?.debounceMs,
      enableRecognizerReset: config.performance?.enableRecognizerReset,
      recognizerResetInterval: config.performance?.recognizerResetInterval,
      partialTimeout: config.silenceDetection?.partialTimeout,
      sampleRate: config.audio?.sampleRate,
      chunkSize: config.audio?.chunkSize
    });
    
    // Use the config service to save and apply settings
    const success = await voskConfigService.updateConfig(config);
    
    if (success) {
      trail.light(7302, {
        operation: 'vosk_config_saved_successfully',
        timestamp: Date.now()
      });
      
      // Show notification briefly
      setShowSaveNotification(true);
      setTimeout(() => {
        setShowSaveNotification(false);
        onSave(config);
        onClose();
      }, 2000);
    } else {
      trail.fail(8302, new Error('Failed to save Vosk configuration'));
    }
  };

  const handleReset = () => {
    trail.light(7302, {
      operation: 'vosk_config_reset'
    });
    setConfig(defaultVoskConfig);
    setSelectedPreset('');
    setLastAppliedPreset('');
    setIsModified(false);
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-400">Presets:</span>
              {Object.entries(voskPresets).map(([key, preset]) => {
                const customPresets = JSON.parse(localStorage.getItem('voicecoach-custom-presets') || '{}');
                const hasCustomSettings = !!customPresets[key];
                
                return (
                  <button
                    key={key}
                    onClick={() => handlePresetSelect(key)}
                    onMouseDown={() => handlePresetMouseDown(key)}
                    onMouseUp={handlePresetMouseUp}
                    onMouseLeave={handlePresetMouseUp}
                    onTouchStart={() => handlePresetMouseDown(key)}
                    onTouchEnd={handlePresetMouseUp}
                    className={`px-3 py-1 text-xs rounded-lg transition-all relative ${
                      savingToPreset === key
                        ? 'bg-yellow-600 text-white animate-pulse'
                        : selectedPreset === key
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    } ${hasCustomSettings ? 'ring-1 ring-green-500/50' : ''}`}
                    title={`${preset.description}${hasCustomSettings ? ' (Custom settings saved)' : ''}\n\nHold for 2 seconds to save current settings to this preset`}
                  >
                    {preset.name}
                    {hasCustomSettings && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Active Preset Indicator */}
            <div className="flex items-center space-x-2">
              {lastAppliedPreset && (
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-slate-500">Active:</span>
                  <span className="text-primary-400 font-medium">
                    {voskPresets[lastAppliedPreset as keyof typeof voskPresets]?.name || 'Custom'}
                  </span>
                  {isModified && (
                    <span className="flex items-center text-yellow-400" title="Settings have been modified from preset">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      <span className="text-xs">Modified</span>
                    </span>
                  )}
                  {!isModified && selectedPreset && (
                    <CheckCircle className="w-4 h-4 text-green-400" title="Using preset defaults" />
                  )}
                </div>
              )}
              {!lastAppliedPreset && (
                <span className="text-sm text-slate-500 italic">No preset selected</span>
              )}
            </div>
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
        <div className="p-6 pb-12 overflow-y-auto max-h-[320px]">
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
                    ({config.audio.chunkSize} samples = {Math.round(config.audio.chunkSize / config.audio.sampleRate * 1000)}ms)
                  </span>
                </label>
                <input
                  type="range"
                  min="256"
                  max="8192"
                  step="256"
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
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>256 (16ms)</span>
                  <span>Smaller = lower latency</span>
                  <span>8192 (512ms)</span>
                </div>
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

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="setWords"
                    checked={config.transcription.setWords}
                    onChange={(e) => setConfig({
                      ...config,
                      transcription: {
                        ...config.transcription,
                        setWords: e.target.checked
                      }
                    })}
                    className="rounded"
                  />
                  <label htmlFor="setWords" className="text-sm">
                    Vosk SetWords
                    <span className="text-xs text-slate-400 block">
                      Enable word-level processing (affects accuracy)
                    </span>
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="setPartialWords"
                    checked={config.transcription.setPartialWords}
                    onChange={(e) => setConfig({
                      ...config,
                      transcription: {
                        ...config.transcription,
                        setPartialWords: e.target.checked
                      }
                    })}
                    className="rounded"
                  />
                  <label htmlFor="setPartialWords" className="text-sm">
                    Vosk SetPartialWords
                    <span className="text-xs text-slate-400 block">
                      Reduce word fragmentation in partial results (recommended)
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
                  min="0"
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
                  Delay before processing rapid updates (0 = disabled)
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="recognizerReset"
                    checked={config.performance.enableRecognizerReset}
                    onChange={(e) => setConfig({
                      ...config,
                      performance: {
                        ...config.performance,
                        enableRecognizerReset: e.target.checked
                      }
                    })}
                    className="rounded"
                  />
                  <label htmlFor="recognizerReset" className="text-sm">
                    Enable Recognizer Reset
                    <span className="text-xs text-slate-400 block">
                      Periodically reset recognizer (NOT recommended - causes delays)
                    </span>
                  </label>
                </div>

                {config.performance.enableRecognizerReset && (
                  <div className="ml-6">
                    <label className="block text-sm font-medium mb-2">
                      Reset Interval
                      <span className="text-xs text-slate-400 ml-2">
                        ({config.performance.recognizerResetInterval}s)
                      </span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="120"
                      step="10"
                      value={config.performance.recognizerResetInterval}
                      onChange={(e) => setConfig({
                        ...config,
                        performance: {
                          ...config.performance,
                          recognizerResetInterval: parseInt(e.target.value)
                        }
                      })}
                      className="w-full"
                    />
                  </div>
                )}

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
            </div>
          )}
        </div>

        {/* Notifications and Info - Below tab content */}
        <div className="px-6 py-4 space-y-3">
          {/* Preset Save Notification */}
          {showPresetSaveNotification && (
            <div className="p-3 bg-purple-900/50 border border-purple-700 rounded-lg flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-purple-400 mt-0.5" />
              <div>
                <p className="text-sm text-purple-300 font-medium">Settings Saved to Preset</p>
                <p className="text-xs text-purple-400 mt-1">
                  Your current settings have been saved to the selected preset
                </p>
              </div>
            </div>
          )}

          {/* Save Notification */}
          {showSaveNotification && (
            <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <p className="text-sm text-green-300 font-medium">Settings Saved Successfully</p>
                <p className="text-xs text-green-400 mt-1">
                  Settings will take effect on the next coaching session
                </p>
              </div>
            </div>
          )}

          {/* Info Notice */}
          <div className="p-3 bg-blue-900/30 border border-blue-800 rounded-lg flex items-start space-x-2">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-300">
              <p className="font-medium mb-1">Tips:</p>
              <ul className="space-y-0.5 ml-3">
                <li>• Hold any preset button for 2 seconds to save current settings to it</li>
                <li>• Settings require restarting the coaching session to take effect</li>
                <li>• Buffer size directly affects latency vs. accuracy tradeoff</li>
              </ul>
            </div>
          </div>
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
              disabled={showSaveNotification}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={showSaveNotification}
            >
              <Save className="w-4 h-4" />
              <span>{showSaveNotification ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};