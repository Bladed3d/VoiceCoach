import React, { useState, useEffect } from 'react';
import { Mic, Monitor, Settings, Volume2, Headphones, Zap } from 'lucide-react';
import { smartInvoke } from '../lib/tauri-mock';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';
import type { MockAudioDevice } from '../lib/tauri-mock';

interface AudioDeviceSelectorProps {
  isRecording: boolean;
  onModeChange?: (mode: string, device: string) => void;
  className?: string;
}

const AudioDeviceSelector: React.FC<AudioDeviceSelectorProps> = ({
  isRecording,
  onModeChange,
  className = ''
}) => {
  const trail = new BreadcrumbTrail('AudioDeviceSelector');
  
  const [audioDevices, setAudioDevices] = useState<MockAudioDevice[]>([]);
  const [currentMode, setCurrentMode] = useState<string>('microphone_only');
  const [selectedDevice, setSelectedDevice] = useState<string>('default');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // LED 800: AudioDeviceSelector initialization
  useEffect(() => {
    trail.light(800, {
      component_init: 'audio_device_selector',
      isRecording,
      timestamp: Date.now()
    });

    loadAudioDevices();
    loadCurrentMode();
  }, []);

  const loadAudioDevices = async () => {
    try {
      const devices = await smartInvoke('get_audio_devices');
      setAudioDevices(devices);
      
      trail.light(801, {
        devices_loaded: 'success',
        device_count: devices.length,
        device_types: devices.map((d: MockAudioDevice) => d.device_type)
      });
    } catch (error) {
      console.error('Failed to load audio devices:', error);
      trail.fail(801, error as Error);
    }
  };

  const loadCurrentMode = async () => {
    try {
      const modeInfo = await smartInvoke('get_audio_mode');
      setCurrentMode(modeInfo.current_mode);
      
      trail.light(802, {
        current_mode_loaded: modeInfo.current_mode,
        system_audio_supported: modeInfo.system_audio_supported
      });
    } catch (error) {
      console.error('Failed to load current audio mode:', error);
      trail.fail(802, error as Error);
    }
  };

  const handleModeChange = async (newMode: string, device: string = 'default') => {
    if (isRecording) {
      console.warn('Cannot change audio mode while recording');
      return;
    }

    setIsLoading(true);
    
    try {
      // LED 150: Audio mode selection process starts
      trail.light(150, {
        audio_mode_selection_start: true,
        requested_mode: newMode,
        current_mode: currentMode,
        device: device,
        user_initiated: true
      });

      // LED 156: Audio mode validation starts
      trail.light(156, {
        audio_mode_validation_start: true,
        validating_mode: newMode,
        device_compatibility: device !== 'default'
      });

      // Check mode-specific requirements
      if (newMode === 'system_audio' || newMode === 'combined') {
        // LED 170: Video platform compatibility check
        trail.light(170, {
          video_platform_compatibility_check: true,
          mode: newMode,
          checking_permissions: true
        });
      }

      // LED 803: Legacy mode change request (backward compatibility)
      trail.light(803, {
        mode_change_request: newMode,
        device: device,
        previous_mode: currentMode
      });

      // LED 157: Audio mode validation complete
      trail.light(157, {
        audio_mode_validation_complete: true,
        mode: newMode,
        validation_passed: true
      });

      await smartInvoke('set_audio_mode', { mode: newMode, device });
      setCurrentMode(newMode);
      setSelectedDevice(device);
      
      // LED specific to mode type selected
      if (newMode === 'microphone_only') {
        trail.light(151, {
          audio_mode_microphone_selected: true,
          device: device
        });
      } else if (newMode === 'system_audio') {
        trail.light(152, {
          audio_mode_system_audio_selected: true,
          device: device,
          video_call_mode: true
        });
      } else if (newMode === 'combined') {
        trail.light(153, {
          audio_mode_combined_selected: true,
          device: device,
          enhanced_coaching: true
        });
      }
      
      if (onModeChange) {
        onModeChange(newMode, device);
      }

      // LED 158: Audio mode switch confirmation
      trail.light(158, {
        audio_mode_switch_confirmation: true,
        new_mode: newMode,
        previous_mode: currentMode,
        device: device
      });

      // LED 159: Audio mode settings saved
      trail.light(159, {
        audio_mode_settings_saved: true,
        active_mode: newMode,
        selected_device: device,
        timestamp: Date.now()
      });

      // LED 804: Legacy success tracking (backward compatibility)
      trail.light(804, {
        mode_change_success: newMode,
        device: device
      });

      console.log(`🔧 Audio mode changed to: ${newMode} on device: ${device}`);
      
    } catch (error) {
      console.error('Failed to change audio mode:', error);
      trail.fail(150, error as Error);
      trail.fail(803, error as Error); // Legacy error tracking
    } finally {
      setIsLoading(false);
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'system_audio':
        return <Monitor className="w-4 h-4" />;
      case 'combined':
        return <Zap className="w-4 h-4" />;
      default:
        return <Mic className="w-4 h-4" />;
    }
  };

  const getModeDescription = (mode: string) => {
    switch (mode) {
      case 'microphone_only':
        return 'Standard microphone recording for practice sessions';
      case 'system_audio':
        return 'Capture video call audio (Zoom, Teams, Meet) for real-time coaching';
      case 'combined':
        return 'Capture both your voice and video call audio for comprehensive coaching';
      default:
        return 'Unknown audio mode';
    }
  };

  const getModeTitle = (mode: string) => {
    switch (mode) {
      case 'microphone_only':
        return 'Microphone Only';
      case 'system_audio':
        return 'Video Call Audio';
      case 'combined':
        return 'Complete Audio Mix';
      default:
        return 'Unknown Mode';
    }
  };

  const getCompatibilityInfo = (deviceType: string) => {
    switch (deviceType) {
      case 'system_loopback':
        return 'Works with: Zoom, Teams, Meet, Messenger, Skype';
      case 'combined':
        return 'Best for: Live sales calls with real-time coaching';
      case 'microphone':
        return 'Best for: Practice sessions and role-playing';
      default:
        return '';
    }
  };

  return (
    <div className={`glass-panel ${className}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-5 h-5 text-primary-400" />
            <h3 className="font-semibold">Audio Capture Mode</h3>
          </div>
          
          <button
            onClick={() => {
              // LED 154: Audio device dropdown opened
              trail.light(154, {
                audio_device_dropdown_opened: !isExpanded,
                current_mode: currentMode,
                is_recording: isRecording
              });
              setIsExpanded(!isExpanded);
            }}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            disabled={isRecording}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Current Mode Display */}
        <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              currentMode === 'system_audio' ? 'bg-blue-900/50 text-blue-400' :
              currentMode === 'combined' ? 'bg-purple-900/50 text-purple-400' :
              'bg-green-900/50 text-green-400'
            }`}>
              {getModeIcon(currentMode)}
            </div>
            
            <div className="flex-1">
              <div className="font-medium">{getModeTitle(currentMode)}</div>
              <div className="text-sm text-slate-400">{getModeDescription(currentMode)}</div>
            </div>
            
            {isRecording && (
              <div className="flex items-center space-x-1 text-success-400">
                <div className="w-2 h-2 rounded-full bg-success-400 animate-pulse"></div>
                <span className="text-xs font-medium">ACTIVE</span>
              </div>
            )}
          </div>
        </div>

        {/* Expanded Device Selection */}
        {isExpanded && (
          <div className="space-y-3">
            <h4 className="font-medium text-slate-300 mb-3">Available Audio Modes</h4>
            
            {['microphone_only', 'system_audio', 'combined'].map((mode) => (
              <div key={mode} className="border border-slate-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => handleModeChange(mode)}
                  disabled={isRecording || isLoading}
                  className={`w-full p-4 text-left transition-all duration-200 hover:bg-slate-700/50 disabled:opacity-50 ${
                    currentMode === mode ? 'bg-primary-900/30 border-primary-500' : 'hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      mode === 'system_audio' ? 'bg-blue-900/50 text-blue-400' :
                      mode === 'combined' ? 'bg-purple-900/50 text-purple-400' :
                      'bg-green-900/50 text-green-400'
                    }`}>
                      {getModeIcon(mode)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium flex items-center space-x-2">
                        <span>{getModeTitle(mode)}</span>
                        {currentMode === mode && (
                          <span className="text-xs bg-primary-600 text-white px-2 py-1 rounded-full">CURRENT</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">{getModeDescription(mode)}</div>
                      
                      {/* Show compatible devices */}
                      {mode !== 'microphone_only' && (
                        <div className="text-xs text-slate-500 mt-2">
                          {getCompatibilityInfo(mode === 'system_audio' ? 'system_loopback' : 'combined')}
                        </div>
                      )}
                    </div>
                    
                    {isLoading && currentMode === mode && (
                      <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                </button>
              </div>
            ))}

            {/* Device-specific options */}
            {currentMode !== 'microphone_only' && audioDevices.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <h5 className="font-medium text-slate-300 mb-2">Available Devices</h5>
                <div className="space-y-2">
                  {audioDevices
                    .filter(device => device.device_type === 'system_loopback' || device.device_type === 'combined')
                    .map((device, index) => (
                      <div key={index} className="bg-slate-800/30 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <Headphones className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{device.name}</span>
                          {device.is_default && (
                            <span className="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded-full">DEFAULT</span>
                          )}
                        </div>
                        <div className="text-sm text-slate-400 mt-1">
                          {device.sample_rate}Hz • {device.channels} channels
                          {device.capabilities?.echo_cancellation && ' • Echo Cancellation'}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Quick Setup Guide */}
            {currentMode === 'system_audio' && (
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <h5 className="font-medium text-blue-300 mb-2">📞 Video Call Setup Guide</h5>
                <ol className="text-sm text-blue-200 space-y-1">
                  <li>1. Start your video call (Zoom, Teams, Meet)</li>
                  <li>2. Click "Start Coaching Session" in VoiceCoach</li>
                  <li>3. Allow screen/audio sharing when prompted</li>
                  <li>4. Receive real-time coaching during your call!</li>
                </ol>
              </div>
            )}

            {currentMode === 'combined' && (
              <div className="mt-4 p-3 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                <h5 className="font-medium text-purple-300 mb-2">🎯 Complete Coaching Setup</h5>
                <ol className="text-sm text-purple-200 space-y-1">
                  <li>1. Join your video call first</li>
                  <li>2. Enable VoiceCoach combined mode</li>
                  <li>3. Grant both microphone and screen audio permissions</li>
                  <li>4. Get coaching on both your responses and prospect reactions!</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {isRecording && (
          <div className="mt-4 text-center text-slate-400 text-sm">
            Audio mode locked during recording session
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioDeviceSelector;