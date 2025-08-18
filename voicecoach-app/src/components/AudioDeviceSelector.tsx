import React, { useState, useEffect } from 'react';
import { Mic, Monitor, Zap, ChevronDown } from 'lucide-react';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

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
  
  const [currentMode, setCurrentMode] = useState<string>('microphone_only');
  const [selectedDevice, setSelectedDevice] = useState<string>('default');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // LED 800: AudioDeviceSelector initialization
  useEffect(() => {
    trail.light(800, {
      component_init: 'audio_device_selector_compact',
      isRecording,
      timestamp: Date.now()
    });
  }, []);

  const handleModeChange = async (newMode: string, device: string = 'default') => {
    if (isLoading || isRecording) return;
    
    setIsLoading(true);
    
    try {
      // LED 150: Audio mode selection start
      trail.light(150, {
        audio_mode_selection_start: true,
        requested_mode: newMode,
        current_mode: currentMode,
        device: device,
        user_initiated: true
      });

      setCurrentMode(newMode);
      setSelectedDevice(device);
      setIsDropdownOpen(false);
      
      if (onModeChange) {
        onModeChange(newMode, device);
      }

      // LED 151: Audio mode changed successfully
      trail.light(151, {
        audio_mode_change_success: true,
        new_mode: newMode,
        device: device
      });

      console.log(`🔧 Audio mode changed to: ${newMode} on device: ${device}`);
      
    } catch (error) {
      console.error('Failed to change audio mode:', error);
      trail.fail(150, error as Error);
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

  const getModeTitle = (mode: string) => {
    switch (mode) {
      case 'microphone_only':
        return 'Microphone';
      case 'system_audio':
        return 'Video Call Audio';
      case 'combined':
        return 'Complete Audio Mix';
      default:
        return 'Unknown Mode';
    }
  };

  const getModeDescription = (mode: string) => {
    switch (mode) {
      case 'microphone_only':
        return 'Record me only';
      case 'system_audio':
        return 'Record them only';
      case 'combined':
        return 'Record both';
      default:
        return 'Unknown audio mode';
    }
  };

  const modes = ['microphone_only', 'system_audio', 'combined'];

  return (
    <div className={`relative ${className}`}>
      {/* Compact Dropdown Button */}
      <button
        onClick={() => {
          if (!isRecording) {
            setIsDropdownOpen(!isDropdownOpen);
            trail.light(154, {
              audio_device_dropdown_toggle: !isDropdownOpen,
              current_mode: currentMode,
              is_recording: isRecording
            });
          }
        }}
        disabled={isRecording}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 border ${
          isRecording 
            ? 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed' 
            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 hover:border-slate-500'
        } ${isDropdownOpen ? 'ring-2 ring-primary-500' : ''}`}
        style={{ minWidth: '140px' }}
        title={isRecording ? "Audio mode locked during recording session" : "Select audio capture mode"}
      >
        <div className="flex items-center space-x-2">
          {getModeIcon(currentMode)}
          <span className="text-xs">{getModeTitle(currentMode)}</span>
        </div>
        
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
          isDropdownOpen ? 'rotate-180' : ''
        }`} />
        
        {isLoading && (
          <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin ml-1"></div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && !isRecording && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 rounded-lg shadow-2xl border border-slate-600 z-50">
          <div className="p-2">
            <div className="text-xs font-medium text-slate-400 mb-2 px-2">Audio Capture Modes</div>
            {modes.map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                disabled={isLoading}
                className={`w-full text-left p-2 rounded-lg transition-all duration-200 hover:bg-slate-700 disabled:opacity-50 ${
                  currentMode === mode ? 'bg-primary-900/30 border border-primary-500' : 'border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`p-1 rounded-lg ${
                    mode === 'system_audio' ? 'bg-blue-900/50 text-blue-400' :
                    mode === 'combined' ? 'bg-purple-900/50 text-purple-400' :
                    'bg-green-900/50 text-green-400'
                  }`}>
                    {getModeIcon(mode)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-xs font-medium flex items-center space-x-2">
                      <span>{getModeTitle(mode)}</span>
                      {currentMode === mode && (
                        <span className="text-xs bg-primary-600 text-white px-1 py-0.5 rounded-full">CURRENT</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{getModeDescription(mode)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recording Lock Indicator */}
      {isRecording && (
        <div className="absolute top-full left-0 mt-1 text-xs text-slate-400">
          Audio mode locked during recording
        </div>
      )}
    </div>
  );
};

export default AudioDeviceSelector;