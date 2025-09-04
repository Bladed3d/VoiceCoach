/**
 * VoiceCoach V2 - Audio Settings Component
 * Extracted from SettingsModal for modular architecture compliance
 */
import React, { useEffect, useState } from 'react';
import { Volume2, AlertCircle, Mic, Settings } from 'lucide-react';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { VoskSettingsModal } from './VoskSettingsModal';
import { VoskConfig, defaultVoskConfig } from '../../types/vosk-config';

interface AudioDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

interface AudioSettings {
  audioInput: string;
  audioInputLabel: string;
  micSensitivity: number;
  otherPartyGain: number;
  noiseSuppression: boolean;
}

interface AppState {
  isRecording: boolean;
  isConnected: boolean;
}

interface AudioSettingsProps {
  settings: AudioSettings;
  audioDevices: AudioDevice[];
  loadingDevices: boolean;
  deviceError: string | null;
  appState: AppState;
  onChange: (key: string, value: any) => void;
  onMicrophoneChange: (deviceId: string) => void;
}

const AudioSettingsComponent: React.FC<AudioSettingsProps> = ({
  settings,
  audioDevices,
  loadingDevices,
  deviceError,
  appState,
  onChange,
  onMicrophoneChange
}) => {
  const trail = new BreadcrumbTrail('AudioSettings');
  const [showVoskSettings, setShowVoskSettings] = useState(false);
  const [voskConfig, setVoskConfig] = useState<VoskConfig>(() => {
    // Load saved config from localStorage
    const saved = localStorage.getItem('voicecoach-vosk-config');
    return saved ? JSON.parse(saved) : defaultVoskConfig;
  });
  
  // Component lifecycle tracking
  useEffect(() => {
    trail.light(7092, {
      component_mount: 'AudioSettings',
      initial_state: {
        selected_device: settings.audioInputLabel,
        sensitivity: settings.micSensitivity,
        noise_suppression: settings.noiseSuppression,
        available_devices: audioDevices.length,
        app_recording: appState.isRecording
      }
    });
    
    return () => {
      trail.light(7093, { component_unmount: 'AudioSettings' });
    };
  }, []);
  
  // Device state change tracking
  useEffect(() => {
    if (audioDevices.length > 0) {
      trail.light(7094, {
        devices_updated: 'audio_devices_list_changed',
        device_count: audioDevices.length,
        devices: audioDevices.map(d => ({ id: d.deviceId, label: d.label }))
      });
    }
  }, [audioDevices]);
  
  // Error state tracking
  useEffect(() => {
    if (deviceError) {
      trail.light(8094, {
        error: 'device_error_displayed',
        error_message: deviceError,
        component: 'AudioSettings'
      });
    }
  }, [deviceError]);
  
  // Loading state tracking
  useEffect(() => {
    trail.light(7095, {
      loading_state: loadingDevices ? 'loading' : 'idle',
      timestamp: Date.now()
    });
  }, [loadingDevices]);
  
  // Enhanced microphone change handler
  const handleMicrophoneSelect = (deviceId: string) => {
    const selectedDevice = audioDevices.find(d => d.deviceId === deviceId);
    trail.light(7096, {
      microphone_selection: 'user_changed_device',
      from_device: settings.audioInput,
      to_device: deviceId,
      device_label: selectedDevice?.label || 'Unknown',
      recording_blocked: appState.isRecording
    });
    
    if (appState.isRecording) {
      trail.light(8095, {
        blocked_action: 'microphone_change_while_recording',
        attempted_device: deviceId,
        current_state: 'recording_active'
      });
      return;
    }
    
    onMicrophoneChange(deviceId);
    trail.light(7097, { microphone_change: 'completed', new_device: deviceId });
  };
  
  // Enhanced sensitivity change handler
  const handleSensitivityChange = (newValue: number) => {
    trail.light(7098, {
      sensitivity_adjustment: 'user_changed_sensitivity',
      from_value: settings.micSensitivity,
      to_value: newValue,
      change_delta: newValue - settings.micSensitivity
    });
    
    onChange('micSensitivity', newValue);
  };
  
  // Enhanced noise suppression handler
  const handleNoiseSuppressionToggle = (enabled: boolean) => {
    trail.light(7099, {
      noise_suppression: 'user_toggled',
      from_state: settings.noiseSuppression,
      to_state: enabled,
      audio_processing_change: enabled ? 'enabled' : 'disabled'
    });
    
    onChange('noiseSuppression', enabled);
  };
  
  // Other Party Audio Gain handler
  const handleOtherPartyGainChange = (newValue: number) => {
    trail.light(7100, {
      other_party_gain_adjustment: 'user_changed_gain',
      from_value: settings.otherPartyGain,
      to_value: newValue,
      change_delta: newValue - settings.otherPartyGain
    });
    
    onChange('otherPartyGain', newValue);
  };
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-6">Audio Configuration</h3>
        
        <div className="space-y-6">
          <div className="bg-slate-800/30 rounded-lg p-4">
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
              onChange={(e) => handleMicrophoneSelect(e.target.value)}
              disabled={loadingDevices || appState.isRecording}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
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
            
            <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
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

          <div className="bg-slate-800/30 rounded-lg p-4">
            <label className="block text-sm font-medium mb-3">
              Microphone Sensitivity: <span className="text-primary-400 font-semibold">{settings.micSensitivity}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.micSensitivity}
              onChange={(e) => handleSensitivityChange(parseInt(e.target.value))}
              className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer hover:bg-slate-600 transition-colors"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-lg p-4">
            <label className="block text-sm font-medium mb-3">
              Other Party Audio Gain: <span className="text-primary-400 font-semibold">{settings.otherPartyGain}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={settings.otherPartyGain}
              onChange={(e) => handleOtherPartyGainChange(parseInt(e.target.value))}
              className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer hover:bg-slate-600 transition-colors"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>0%</span>
              <span>100%</span>
              <span>200%</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Boost system audio volume for clearer transcription</p>
          </div>

          <div className="bg-slate-800/30 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.noiseSuppression}
                onChange={(e) => handleNoiseSuppressionToggle(e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-slate-700 border-slate-600 rounded focus:ring-primary-500 focus:ring-2"
              />
              <label className="text-sm font-medium">Enable noise suppression</label>
            </div>
            <p className="text-xs text-slate-400 mt-2 ml-7">Reduces background noise during recording</p>
          </div>
          
          {/* Vosk Transcription Settings Button */}
          <div className="bg-slate-800/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium flex items-center space-x-2">
                  <Mic className="w-4 h-4 text-primary-400" />
                  <span>Vosk Transcription Settings</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Configure real-time transcription speed and accuracy
                </p>
              </div>
              <button
                onClick={() => setShowVoskSettings(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
              >
                <Settings className="w-4 h-4" />
                <span>Configure</span>
              </button>
            </div>
            {voskConfig && (
              <div className="mt-3 text-xs text-slate-400 space-y-1">
                <div>Mode: <span className="text-slate-300">{voskConfig.transcription.mode}</span></div>
                <div>Silence timeout: <span className="text-slate-300">{voskConfig.silenceDetection.partialTimeout}s</span></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-5">
        <h4 className="font-medium mb-4 flex items-center space-x-2">
          <Volume2 className="w-5 h-5 text-primary-400" />
          <span>Current Audio Status</span>
        </h4>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Connection:</span>
            <span className={`font-medium px-2 py-1 rounded text-xs ${
              appState.isConnected 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {appState.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Recording:</span>
            <span className={`font-medium px-2 py-1 rounded text-xs ${
              appState.isRecording 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
            }`}>
              {appState.isRecording ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Vosk Settings Modal */}
      <VoskSettingsModal
        isOpen={showVoskSettings}
        onClose={() => setShowVoskSettings(false)}
        onSave={async (config) => {
          setVoskConfig(config);
          trail.light(7303, {
            operation: 'vosk_config_applied',
            config
          });
          
          // Send config to Python server via IPC
          try {
            const result = await (window as any).electronAPI.updateVoskConfig(config);
            if (result.success) {
              console.log('✅ Vosk config updated:', result.message);
              if (result.requiresRestart && appState.isRecording) {
                alert('Vosk configuration saved. Please restart the transcription session to apply changes.');
              }
            } else {
              console.error('❌ Failed to update Vosk config:', result.error);
            }
          } catch (error) {
            console.error('❌ Error updating Vosk config:', error);
          }
        }}
        currentConfig={voskConfig}
      />
    </div>
  );
};

export default AudioSettingsComponent;