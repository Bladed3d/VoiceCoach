/**
 * VoiceCoach V2 - Volume Indicator Component
 * Visual microphone feedback component
 */
import React from 'react';
import { Mic } from 'lucide-react';
import { VolumeState } from '../../types/coaching';

interface VolumeIndicatorProps {
  volumeState: VolumeState;
  className?: string;
}

export const VolumeIndicator: React.FC<VolumeIndicatorProps> = ({ 
  volumeState, 
  className = "" 
}) => {
  const { level, isMonitoring, status } = volumeState;

  if (!isMonitoring) {
    return null;
  }

  return (
    <div className={`px-1 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <Mic className="w-4 h-4 text-primary-400" />
          <span className="text-xs text-slate-400">Voice Level:</span>
        </div>
        
        {/* Volume Bar */}
        <div className="flex-1 max-w-xs">
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div 
              className={`h-full transition-all duration-100 ${
                level > 20 ? 'bg-green-400' : 
                level > 5 ? 'bg-yellow-400' : 
                'bg-red-400'
              }`}
              style={{ width: `${Math.min(level, 100)}%` }}
            />
          </div>
        </div>
        
        {/* Volume Percentage */}
        <div className="text-xs font-mono text-slate-300 min-w-[3rem]">
          {level}%
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center space-x-1">
          <div className={`w-1.5 h-1.5 rounded-full ${
            level > 20 ? 'bg-green-400 animate-pulse' : 
            level > 5 ? 'bg-yellow-400' : 
            'bg-slate-600'
          }`} />
          <span className="text-xs text-slate-400 capitalize">
            {status}
          </span>
        </div>
      </div>
    </div>
  );
};