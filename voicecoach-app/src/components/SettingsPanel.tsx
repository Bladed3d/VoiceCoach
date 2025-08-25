import { useState, useEffect } from "react";
import { X, Mic, Volume2, Brain, Database, Shield, AlertCircle } from "lucide-react";
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

interface AudioDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

interface SettingsPanelProps {
  onClose: () => void;
  appState: {
    isRecording: boolean;
    isConnected: boolean;
    currentCall: any;
    audioLevels: any;
  };
}

function SettingsPanel({ onClose, appState }: SettingsPanelProps) {
  const trail = new BreadcrumbTrail('SettingsPanel');
  const [activeTab, setActiveTab] = useState<'audio' | 'ai' | 'privacy' | 'about'>('audio');
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  
  // Load saved microphone selection from localStorage or use default
  const savedMicId = localStorage.getItem('selectedMicrophoneId') || 'default';
  const savedMicLabel = localStorage.getItem('selectedMicrophoneLabel') || 'System Default';
  
  const [settings, setSettings] = useState({
    audioInput: savedMicId,
    audioInputLabel: savedMicLabel,
    audioOutput: 'default',
    micSensitivity: 75,
    noiseSuppression: true,
    aiModel: 'gpt-4',
    responseSpeed: 'balanced',
    coachingStyle: 'supportive',
    dataRetention: '30days',
    analytics: true,
  });

  // Enumerate audio devices when component mounts or audio tab is selected
  useEffect(() => {
    if (activeTab === 'audio') {
      enumerateAudioDevices();
    }
  }, [activeTab]);

  const enumerateAudioDevices = async () => {
    setLoadingDevices(true);
    setDeviceError(null);
    
    // LED 150: Starting audio device enumeration
    trail.light(150, {
      action: 'enumerate_audio_devices_start',
      timestamp: Date.now()
    });

    try {
      // Request microphone permission first if needed
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          // LED 151: Microphone permission granted
          trail.light(151, {
            action: 'microphone_permission_granted',
            stream_active: true
          });
          // Stop the stream immediately - we just needed permission
          stream.getTracks().forEach(track => track.stop());
        });

      // Enumerate all devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // LED 152: Devices enumerated successfully
      trail.light(152, {
        action: 'devices_enumerated',
        total_devices: devices.length
      });

      // Filter for audio input devices
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.substring(0, 8)}`,
          groupId: device.groupId
        }));

      // LED 153: Audio input devices filtered
      trail.light(153, {
        action: 'audio_inputs_filtered',
        microphone_count: audioInputs.length,
        devices: audioInputs.map(d => ({ id: d.deviceId, label: d.label }))
      });

      setAudioDevices(audioInputs);
      
      // Log devices to console for debugging
      console.log('🎤 Available microphones:', audioInputs);
      
    } catch (error) {
      // LED 154: Device enumeration failed
      trail.fail(154, error as Error);
      console.error('Failed to enumerate audio devices:', error);
      setDeviceError('Failed to access audio devices. Please check permissions.');
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleMicrophoneChange = (deviceId: string) => {
    const device = audioDevices.find(d => d.deviceId === deviceId);
    const label = device?.label || 'System Default';
    
    // LED 155: Microphone selection changed
    trail.light(155, {
      action: 'microphone_selected',
      device_id: deviceId,
      device_label: label,
      previous_id: settings.audioInput,
      previous_label: settings.audioInputLabel
    });

    // Update settings
    setSettings(prev => ({ 
      ...prev, 
      audioInput: deviceId,
      audioInputLabel: label 
    }));

    // Save to localStorage for persistence
    localStorage.setItem('selectedMicrophoneId', deviceId);
    localStorage.setItem('selectedMicrophoneLabel', label);

    // LED 156: Microphone selection saved
    trail.light(156, {
      action: 'microphone_selection_saved',
      saved_to_localStorage: true,
      device_id: deviceId,
      device_label: label
    });

    console.log(`🎤 Microphone selected: ${label} (${deviceId})`);
    
    // Notify the app about the microphone change
    window.dispatchEvent(new CustomEvent('microphoneChanged', {
      detail: { deviceId, label }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold">VoiceCoach Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1">
          {/* Sidebar Navigation */}
          <div className="w-64 border-r border-slate-700 p-6">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('audio')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === 'audio' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Mic className="w-5 h-5" />
                <span>Audio & Recording</span>
              </button>

              <button
                onClick={() => setActiveTab('ai')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === 'ai' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Brain className="w-5 h-5" />
                <span>AI Configuration</span>
              </button>

              <button
                onClick={() => setActiveTab('privacy')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === 'privacy' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Shield className="w-5 h-5" />
                <span>Privacy & Data</span>
              </button>

              <button
                onClick={() => setActiveTab('about')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === 'about' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Database className="w-5 h-5" />
                <span>About</span>
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'audio' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Audio Configuration</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Microphone Input
                        {loadingDevices && <span className="ml-2 text-slate-400">(Loading...)</span>}
                      </label>
                      
                      {deviceError && (
                        <div className="mb-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <span className="text-sm text-red-400">{deviceError}</span>
                        </div>
                      )}
                      
                      <select
                        value={settings.audioInput}
                        onChange={(e) => handleMicrophoneChange(e.target.value)}
                        disabled={loadingDevices || appState.isRecording}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="default">System Default</option>
                        {audioDevices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label}
                          </option>
                        ))}
                      </select>
                      
                      {appState.isRecording && (
                        <p className="mt-1 text-xs text-yellow-400">
                          Cannot change microphone while recording
                        </p>
                      )}
                      
                      <div className="mt-2 p-2 bg-slate-800/50 rounded-lg">
                        <p className="text-xs text-slate-400">
                          Currently selected: <span className="text-primary-400 font-medium">{settings.audioInputLabel}</span>
                        </p>
                        {audioDevices.length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            Found {audioDevices.length} microphone{audioDevices.length !== 1 ? 's' : ''} on your system
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Microphone Sensitivity: {settings.micSensitivity}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.micSensitivity}
                        onChange={(e) => handleSettingChange('micSensitivity', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.noiseSuppression}
                        onChange={(e) => handleSettingChange('noiseSuppression', e.target.checked)}
                        className="rounded"
                      />
                      <label className="text-sm">Enable noise suppression</label>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-4">
                  <h4 className="font-medium mb-2 flex items-center space-x-2">
                    <Volume2 className="w-4 h-4" />
                    <span>Current Audio Status</span>
                  </h4>
                  <div className="text-sm text-slate-400">
                    <p>Connection: {appState.isConnected ? 'Connected' : 'Disconnected'}</p>
                    <p>Recording: {appState.isRecording ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">AI Assistant Configuration</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">AI Model</label>
                      <select
                        value={settings.aiModel}
                        onChange={(e) => handleSettingChange('aiModel', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
                      >
                        <option value="claude-direct">Claude Direct (Self-Contained)</option>
                        <option value="ollama">Ollama Local (Phase 2)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Response Speed</label>
                      <select
                        value={settings.responseSpeed}
                        onChange={(e) => handleSettingChange('responseSpeed', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
                      >
                        <option value="fast">Fast (1-2 seconds)</option>
                        <option value="balanced">Balanced (2-3 seconds)</option>
                        <option value="thorough">Thorough (3-5 seconds)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Coaching Style</label>
                      <select
                        value={settings.coachingStyle}
                        onChange={(e) => handleSettingChange('coachingStyle', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
                      >
                        <option value="supportive">Supportive & Encouraging</option>
                        <option value="direct">Direct & Action-Oriented</option>
                        <option value="analytical">Analytical & Data-Driven</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
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
                      <label className="text-sm">Enable usage analytics (helps improve the product)</label>
                    </div>

                    <div className="glass-panel p-4">
                      <h4 className="font-medium mb-2 text-success-400">Privacy First</h4>
                      <p className="text-sm text-slate-400">
                        VoiceCoach processes audio locally when possible. No call recordings are sent to external services 
                        without your explicit consent. All transcriptions are encrypted at rest.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">About VoiceCoach</h3>
                  
                  <div className="space-y-4">
                    <div className="glass-panel p-6">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold text-xl">VC</span>
                        </div>
                        <div>
                          <h4 className="text-xl font-semibold">VoiceCoach</h4>
                          <p className="text-slate-400">Version 0.1.0 Beta</p>
                        </div>
                      </div>
                      
                      <p className="text-slate-300 leading-relaxed mb-4">
                        AI-powered real-time sales coaching desktop application. Built with Tauri, React, and TypeScript 
                        for maximum performance and security.
                      </p>

                      <div className="space-y-2 text-sm text-slate-400">
                        <p><strong>Framework:</strong> Tauri + React + TypeScript</p>
                        <p><strong>AI Engine:</strong> OpenAI GPT-4 / Anthropic Claude</p>
                        <p><strong>Audio Processing:</strong> WebRTC + Native APIs</p>
                        <p><strong>Privacy:</strong> Local-first processing</p>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-slate-400">
                        Built with ❤️ for sales professionals who want to excel in every conversation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-6">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;