/**
 * VoiceCoach V2 - Audio Capture Selector
 * Simple dropdown for choosing between microphone-only or full conversation capture
 */

import React from 'react';
import { Mic, Users } from 'lucide-react';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

export type AudioCaptureMode = 'microphone' | 'full-conversation';

interface AudioCaptureSelectorProps {
  mode: AudioCaptureMode;
  onModeChange: (mode: AudioCaptureMode) => void;
  disabled?: boolean;
  isRecording?: boolean;
}

export const AudioCaptureSelector: React.FC<AudioCaptureSelectorProps> = ({
  mode,
  onModeChange,
  disabled = false,
  isRecording = false
}) => {
  const trail = new BreadcrumbTrail('AudioCaptureSelector');
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value as AudioCaptureMode;
    
    trail.light(7095, {
      audio_mode_changed: true,
      from: mode,
      to: newMode,
      timestamp: Date.now()
    });
    
    onModeChange(newMode);
  };
  
  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm text-slate-400">Audio:</label>
      <select
        value={mode}
        onChange={handleChange}
        disabled={disabled || isRecording}
        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
        title={isRecording ? "Cannot change audio mode while recording" : ""}
      >
        <option value="microphone">
          🎤 My side only
        </option>
        <option value="full-conversation">
          👥 Both sides (full conversation)
        </option>
      </select>
      
      {isRecording && (
        <span className="text-xs text-yellow-400">
          Recording...
        </span>
      )}
    </div>
  );
};

export default AudioCaptureSelector;