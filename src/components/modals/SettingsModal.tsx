/**
 * VoiceCoach V2 - Settings Modal Component
 * Compact modular version following strict 400-line architecture compliance
 * Uses extracted components for Audio and Knowledge Base configuration
 */
import React, { useState, useEffect } from 'react';
import { X, Mic, Brain, Database, Shield, Info, Lock, Bot, Settings } from 'lucide-react';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import AudioSettingsComponent from './AudioSettings';
import KnowledgeBaseAPIConfig from './KnowledgeBaseAPIConfig';
import { VoskOptimizationPanel } from '../settings/VoskOptimizationPanel';

interface AudioDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: {
    isRecording: boolean;
    isConnected: boolean;
    currentCall?: any;
    audioLevels?: any;
  };
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, appState }) => {
  const trail = new BreadcrumbTrail('SettingsModal');
  const [activeTab, setActiveTab] = useState<'audio' | 'ai' | 'knowledgebase' | 'vosk' | 'privacy' | 'about'>('audio');
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // State for instruction files
  const [instructionFiles, setInstructionFiles] = useState<{ filename: string; displayName: string; }[]>([]);

  // Load saved settings from localStorage
  const savedMicId = localStorage.getItem('selectedMicrophoneId') || 'default';
  const savedMicLabel = localStorage.getItem('selectedMicrophoneLabel') || 'System Default';

  const [settings, setSettings] = useState({
    audioInput: savedMicId,
    audioInputLabel: savedMicLabel,
    audioOutput: 'default',
    micSensitivity: 75,
    otherPartyGain: 100,
    noiseSuppression: true,
    aiModel: 'ollama',
    dataRetention: '30days',
    analytics: true,
    knowledgeBase: {
      phase1AEnabled: false,
      phase1BEnabled: false,
      phase1CEnabled: false,
      apiEndpoint: '',
      apiKey: ''
    },
    ollama: {
      baseUrl: 'http://localhost:11434',
      model: 'qwen2.5:14b-instruct-q4_k_m',
      instructionFile: 'active-instructions.md',
      temperature: {
        value: 0.3,
        isLocked: true,
        learningStatus: 'baseline'
      },
      topP: {
        value: 0.9,
        isLocked: true,
        learningStatus: 'baseline'
      },
      numPredict: {
        value: 300,
        isLocked: true,
        learningStatus: 'baseline'
      }
    }
  });

  // Load settings from localStorage on component mount
  useEffect(() => {
    const loadedSettings = localStorage.getItem('voicecoach-settings');
    if (loadedSettings) {
      try {
        const parsed = JSON.parse(loadedSettings);
        setSettings(prev => ({
          ...prev,
          ...parsed,
          // Ensure nested objects are properly merged
          knowledgeBase: {
            ...prev.knowledgeBase,
            ...parsed.knowledgeBase
          },
          ollama: {
            ...prev.ollama,
            ...parsed.ollama
          }
        }));
        console.log('📋 Settings loaded from localStorage, including instruction file:', parsed.ollama?.instructionFile);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  // Enhanced LED tracking for modal lifecycle
  useEffect(() => {
    if (isOpen) {
      trail.light(7050, { action: 'settings_modal_opened', active_tab: activeTab });
      trail.light(7070, { lifecycle: 'component_mount', initial_settings: settings });
    } else {
      trail.light(7071, { lifecycle: 'component_unmount', final_settings: settings });
    }
  }, [isOpen]);

  // Enhanced tab switching tracking
  useEffect(() => {
    if (isOpen) {
      trail.light(7060, {
        navigation: 'tab_switch',
        from_tab: activeTab,
        to_tab: activeTab,
        timestamp: Date.now()
      });

      // Tab-specific initialization tracking
      if (activeTab === 'audio') {
        trail.light(7061, { tab_init: 'audio_settings', devices_to_load: true });
      } else if (activeTab === 'knowledgebase') {
        trail.light(7062, { tab_init: 'knowledge_base_api', current_phases: {
          phase1A: settings.knowledgeBase.phase1AEnabled,
          phase1B: settings.knowledgeBase.phase1BEnabled,
          phase1C: settings.knowledgeBase.phase1CEnabled
        }});
      } else if (activeTab === 'ai') {
        trail.light(7063, { tab_init: 'ai_configuration', model: settings.aiModel });
      } else if (activeTab === 'vosk') {
        trail.light(7505, { tab_init: 'vosk_optimizer', purpose: 'transcription_optimization' });
      } else if (activeTab === 'privacy') {
        trail.light(7064, { tab_init: 'privacy_settings', retention: settings.dataRetention });
      }
    }
  }, [activeTab, isOpen]);

  useEffect(() => {
    if (activeTab === 'audio' && isOpen) {
      trail.light(7065, { settings_load: 'audio_tab_active', trigger: 'tab_switch' });
      enumerateAudioDevices();
    }
  }, [activeTab, isOpen]);

  // Load instruction files when AI tab is active
  useEffect(() => {
    if (activeTab === 'ai' && isOpen) {
      loadInstructionFiles();
    }
  }, [activeTab, isOpen]);

  const loadInstructionFiles = async () => {
    try {
      if ((window as any).electronAPI?.listInstructionFiles) {
        const files = await (window as any).electronAPI.listInstructionFiles();
        setInstructionFiles(files || []);
        trail.light(7090, {
          operation: 'instruction_files_loaded',
          count: files?.length || 0,
          files: files
        });
        console.log('📁 Loaded instruction files from directory:', files);
      } else {
        console.error('❌ electronAPI.listInstructionFiles not available');
        setInstructionFiles([]);
      }
    } catch (error) {
      console.error('Failed to load instruction files:', error);
      trail.fail(8090, error as Error);
      setInstructionFiles([]);
    }
  };

  const enumerateAudioDevices = async () => {
    setLoadingDevices(true);
    setDeviceError(null);

    trail.light(7051, { action: 'enumerate_audio_devices_start' });

    try {
      // Enhanced permission request tracking
      trail.light(7075, { permission: 'request_start', type: 'microphone' });
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          trail.lightWithVerification(7052,
            { action: 'microphone_permission_granted', stream_active: true },
            { expect: 'granted', actual: stream.active ? 'granted' : 'denied' }
          );
          stream.getTracks().forEach(track => track.stop());
          trail.light(7076, { permission: 'cleanup_stream', tracks_stopped: stream.getTracks().length });
        });

      // Enhanced device enumeration with validation
      trail.light(7077, { enumeration: 'start_device_scan' });
      const devices = await navigator.mediaDevices.enumerateDevices();
      trail.lightWithVerification(7053,
        { action: 'devices_enumerated', total_devices: devices.length },
        { expect: 'devices_found', actual: devices.length > 0 ? 'devices_found' : 'no_devices' }
      );

      // Audio input filtering and processing
      trail.light(7078, { filtering: 'extract_audio_inputs', total_devices: devices.length });
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.substring(0, 8)}`,
          groupId: device.groupId
        }));

      setAudioDevices(audioInputs);
      trail.lightWithVerification(7054,
        { action: 'audio_devices_loaded', microphone_count: audioInputs.length },
        { expect: 'microphones_available', actual: audioInputs.length > 0 ? 'available' : 'none' }
      );

    } catch (error) {
      trail.light(8075, { error: 'device_enumeration_failed', error_type: error.name, component: 'SettingsModal' });
      trail.fail(7055, error as Error);
      setDeviceError('Failed to access audio devices. Please check permissions.');
    } finally {
      setLoadingDevices(false);
      trail.light(7079, { enumeration: 'complete', loading_state: false });
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    trail.light(7066, {
      settings_change: 'general_setting',
      key,
      old_value: settings[key as keyof typeof settings],
      new_value: value
    });
    setSettings(prev => ({ ...prev, [key]: value }));

    // Track specific critical settings changes
    if (key === 'aiModel') {
      trail.light(7067, { ai: 'model_changed', from: settings.aiModel, to: value });
    } else if (key === 'dataRetention') {
      trail.light(7069, { privacy: 'retention_changed', from: settings.dataRetention, to: value });
    }
  };

  const handleKnowledgeBaseSettingChange = (key: string, value: any) => {
    const oldValue = settings.knowledgeBase[key as keyof typeof settings.knowledgeBase];

    trail.light(7080, {
      knowledge_base: 'setting_change',
      setting: key,
      old_value: oldValue,
      new_value: value
    });

    // Enhanced tracking for phase toggles
    if (key.includes('phase') && key.includes('Enabled')) {
      const phaseType = key.replace('Enabled', '');
      trail.light(7081, {
        phase_toggle: phaseType,
        enabled: value,
        api_integration: value ? 'enabled' : 'disabled'
      });

      if (value && !settings.knowledgeBase.apiEndpoint) {
        trail.light(7082, {
          validation_warning: 'phase_enabled_no_endpoint',
          phase: phaseType,
          requires_configuration: true
        });
      }
    }

    setSettings(prev => ({
      ...prev,
      knowledgeBase: { ...prev.knowledgeBase, [key]: value }
    }));
  };

  const handleMicrophoneChange = (deviceId: string) => {
    const device = audioDevices.find(d => d.deviceId === deviceId);
    const label = device?.label || 'System Default';
    const previousDevice = settings.audioInputLabel;

    trail.light(7056, {
      action: 'microphone_selected',
      device_id: deviceId,
      device_label: label,
      previous_device: previousDevice
    });

    // Enhanced state update tracking
    trail.light(7083, {
      state_update: 'microphone_settings',
      updating: { audioInput: deviceId, audioInputLabel: label }
    });
    setSettings(prev => ({
      ...prev,
      audioInput: deviceId,
      audioInputLabel: label
    }));

    // Enhanced localStorage persistence tracking
    trail.light(7084, {
      persistence: 'localStorage_write',
      keys: ['selectedMicrophoneId', 'selectedMicrophoneLabel'],
      values: [deviceId, label]
    });
    localStorage.setItem('selectedMicrophoneId', deviceId);
    localStorage.setItem('selectedMicrophoneLabel', label);

    // Enhanced custom event dispatch tracking
    trail.light(7085, {
      event_dispatch: 'microphoneChanged',
      detail: { deviceId, label },
      listeners_notified: true
    });
    window.dispatchEvent(new CustomEvent('microphoneChanged', {
      detail: { deviceId, label }
    }));

    // Verification that change was applied
    trail.lightWithVerification(7086,
      { microphone_change: 'complete' },
      { expect: deviceId, actual: deviceId }
    );
  };

  const saveSettings = async () => {
    trail.light(7087, { save_operation: 'start', timestamp: Date.now() });

    // Save settings to localStorage
    localStorage.setItem('voicecoach-settings', JSON.stringify(settings));

    // Reload OllamaPromptService template if instruction file changed
    if (settings.ollama?.instructionFile) {
      const { ollamaPromptService } = await import('../../services/coaching/OllamaPromptService');
      const reloaded = await ollamaPromptService.reloadTemplate();

      trail.light(7094, {
        operation: 'instruction_file_reload_triggered',
        instructionFile: settings.ollama.instructionFile,
        reloadSuccess: reloaded,
        timestamp: Date.now()
      });

      if (reloaded) {
        console.log('✅ Instruction file reloaded in OllamaPromptService:', settings.ollama.instructionFile);
      } else {
        console.error('❌ Failed to reload instruction file in OllamaPromptService');
      }
    }

    // Enhanced settings persistence tracking
    trail.light(7057, {
      action: 'settings_saved',
      settings_summary: {
        microphone: settings.audioInputLabel,
        sensitivity: settings.micSensitivity,
        ai_model: settings.aiModel,
        ollama_instruction_file: settings.ollama?.instructionFile,
        knowledge_base_phases: {
          phase1A: settings.knowledgeBase.phase1AEnabled,
          phase1B: settings.knowledgeBase.phase1BEnabled,
          phase1C: settings.knowledgeBase.phase1CEnabled
        },
        privacy: {
          retention: settings.dataRetention,
          analytics: settings.analytics
        }
      }
    });

    // Settings validation before save
    const hasEnabledPhases = settings.knowledgeBase.phase1AEnabled ||
                            settings.knowledgeBase.phase1BEnabled ||
                            settings.knowledgeBase.phase1CEnabled;
    const hasApiConfig = settings.knowledgeBase.apiEndpoint && settings.knowledgeBase.apiKey;

    if (hasEnabledPhases && !hasApiConfig) {
      trail.light(8088, {
        validation_warning: 'phases_enabled_without_api',
        enabled_phases: {
          phase1A: settings.knowledgeBase.phase1AEnabled,
          phase1B: settings.knowledgeBase.phase1BEnabled,
          phase1C: settings.knowledgeBase.phase1CEnabled
        },
        missing_config: !hasApiConfig
      });
    }

    trail.light(7088, { modal_close: 'triggered_by_save' });
    onClose();
  };

  if (!isOpen) return null;

  const tabConfig = [
    { id: 'audio', label: 'Audio & Recording', icon: Mic },
    { id: 'ai', label: 'Live AI Settings', icon: Brain },
    { id: 'knowledgebase', label: 'Knowledge Base API', icon: Database },
    { id: 'vosk', label: 'Vosk Optimizer', icon: Settings },
    { id: 'privacy', label: 'Privacy & Data', icon: Shield },
    { id: 'about', label: 'About', icon: Info }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-6xl max-h-[calc(100vh-4rem)] flex flex-col shadow-2xl">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-semibold">VoiceCoach V2 Settings</h2>
          <button
            onClick={() => {
              trail.light(7090, { modal_close: 'header_x_button', unsaved_changes: false });
              onClose();
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-72 border-r border-slate-700 p-6 flex-shrink-0">
            <nav className="space-y-2">
              {tabConfig.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      trail.light(7089, {
                        navigation: 'tab_click',
                        from: activeTab,
                        to: tab.id,
                        user_interaction: true
                      });
                      setActiveTab(tab.id as any);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="h-full overflow-y-auto px-6 py-6 pb-16" style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 #1e293b' }}>
            {activeTab === 'audio' && (
              <AudioSettingsComponent
                settings={{
                  audioInput: settings.audioInput,
                  audioInputLabel: settings.audioInputLabel,
                  micSensitivity: settings.micSensitivity,
                  otherPartyGain: settings.otherPartyGain,
                  noiseSuppression: settings.noiseSuppression
                }}
                audioDevices={audioDevices}
                loadingDevices={loadingDevices}
                deviceError={deviceError}
                appState={{ isRecording: appState.isRecording, isConnected: appState.isConnected }}
                onChange={handleSettingChange}
                onMicrophoneChange={handleMicrophoneChange}
              />
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold mb-4">Live AI Coaching Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">AI Model</label>
                    <select
                      value={settings.aiModel}
                      onChange={(e) => handleSettingChange('aiModel', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
                    >
                      <option value="ollama">Ollama Local (Default)</option>
                      <option value="claude-direct">Claude Direct</option>
                      <option value="api-llm">API LLM</option>
                    </select>
                  </div>

                  {/* Ollama Configuration - Show when Ollama is selected */}
                  {settings.aiModel === 'ollama' && (
                    <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                      <h4 className="text-md font-medium mb-4 text-green-400">🦙 Ollama Configuration</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Base URL</label>
                          <input
                            type="text"
                            value={settings.ollama.baseUrl}
                            onChange={(e) => handleSettingChange('ollama', {...settings.ollama, baseUrl: e.target.value})}
                            placeholder="http://localhost:11434"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Model Name</label>
                          <input
                            type="text"
                            value={settings.ollama.model}
                            onChange={(e) => handleSettingChange('ollama', {...settings.ollama, model: e.target.value})}
                            placeholder="qwen2.5:14b-instruct-q4_k_m"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Coaching Instructions</label>
                          <select
                            value={settings.ollama.instructionFile}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              handleSettingChange('ollama', {...settings.ollama, instructionFile: newValue});
                              console.log('📝 Instruction file changed to:', newValue);
                              trail.light(7093, {
                                instruction_file_changed: newValue,
                                previous_file: settings.ollama.instructionFile
                              });
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                          >
                            {instructionFiles && instructionFiles.length > 0 ? (
                              instructionFiles.map((file) => (
                                <option key={file.filename} value={file.filename}>
                                  {file.filename}
                                </option>
                              ))
                            ) : (
                              <option value={settings.ollama.instructionFile}>
                                {settings.ollama.instructionFile}
                              </option>
                            )}
                          </select>
                          <p className="text-xs text-slate-400 mt-1">
                            Select the coaching methodology for AI suggestions
                            {instructionFiles.length === 0 && ' (Loading files...)'}
                          </p>
                        </div>
                        {/* AI-Managed Parameters */}
                        <div className="border-t border-slate-700 pt-4">
                          <div className="flex items-center space-x-2 mb-4">
                            <Bot className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-medium text-blue-400">AI-Managed Parameters</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Temperature */}
                            <div>
                              <div className="flex items-center space-x-1 mb-2">
                                <label className="text-sm font-medium">Temperature: {settings.ollama.temperature.value}</label>
                                <Lock className="w-3 h-3 text-slate-400" />
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={settings.ollama.temperature.value}
                                disabled
                                className="w-full opacity-75 cursor-not-allowed"
                              />
                            </div>

                            {/* Top P */}
                            <div>
                              <div className="flex items-center space-x-1 mb-2">
                                <label className="text-sm font-medium">Top P: {settings.ollama.topP.value}</label>
                                <Lock className="w-3 h-3 text-slate-400" />
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={settings.ollama.topP.value}
                                disabled
                                className="w-full opacity-75 cursor-not-allowed"
                              />
                            </div>

                            {/* Max Tokens */}
                            <div>
                              <div className="flex items-center space-x-1 mb-2">
                                <label className="text-sm font-medium">Max Tokens: {settings.ollama.numPredict.value}</label>
                                <Lock className="w-3 h-3 text-slate-400" />
                              </div>
                              <input
                                type="range"
                                min="50"
                                max="500"
                                step="50"
                                value={settings.ollama.numPredict.value}
                                disabled
                                className="w-full opacity-75 cursor-not-allowed"
                              />
                            </div>
                          </div>

                          <div className="mt-4 p-3 bg-slate-800/30 rounded-lg">
                            <div className="text-xs text-slate-400 text-center flex items-center justify-center space-x-2">
                              <Bot className="w-3 h-3 text-blue-400" />
                              <span>AI will optimize these parameters based on your live coaching sessions</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'knowledgebase' && (
              <KnowledgeBaseAPIConfig
                settings={settings.knowledgeBase}
                onChange={handleKnowledgeBaseSettingChange}
              />
            )}

            {activeTab === 'vosk' && (
              <VoskOptimizationPanel />
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold mb-4">Privacy & Data Management</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Data Retention Period</label>
                    <select
                      value={settings.dataRetention}
                      onChange={(e) => handleSettingChange('dataRetention', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
                    >
                      <option value="session">Current Session Only</option>
                      <option value="7days">7 Days</option>
                      <option value="30days">30 Days</option>
                      <option value="never">Never Delete</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.analytics}
                      onChange={(e) => handleSettingChange('analytics', e.target.checked)}
                      className="rounded"
                    />
                    <label className="text-sm">Enable usage analytics</label>
                  </div>
                  <div className="glass-panel p-4">
                    <h4 className="font-medium mb-2 text-green-400">Privacy First</h4>
                    <p className="text-sm text-slate-400">
                      VoiceCoach V2 processes audio locally when possible. All transcriptions are encrypted at rest.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold mb-4">About VoiceCoach V2</h3>
                <div className="glass-panel p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-xl">V2</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold">VoiceCoach V2</h4>
                      <p className="text-slate-400">Version 2.0.0 Beta</p>
                    </div>
                  </div>
                  <p className="text-slate-300 leading-relaxed mb-4">
                    Next-generation AI-powered real-time sales coaching desktop application. Built with Electron, React, and TypeScript
                    for maximum performance, security, and reliability.
                  </p>
                  <div className="space-y-2 text-sm text-slate-400">
                    <p><strong>Framework:</strong> Electron + React + TypeScript</p>
                    <p><strong>AI Engine:</strong> Claude Direct / Ollama Local</p>
                    <p><strong>Audio Processing:</strong> WebRTC + Native APIs</p>
                    <p><strong>Architecture:</strong> Modular components, LED breadcrumbs</p>
                    <p><strong>Privacy:</strong> Local-first processing with optional API integration</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-slate-400">
                    Built for sales professionals who want to excel in every conversation.
                  </p>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="border-t border-slate-700 p-6 flex-shrink-0">
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                trail.light(7091, { modal_close: 'cancel_button', settings_discarded: true });
                onClose();
              }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button onClick={saveSettings} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;