/**
 * VoiceCoach V2 - Dual Volume Indicator Component
 * Shows both microphone and tab/headphone audio levels
 * LED Range: 7250-7299
 */
import React from 'react';
import { Mic, Headphones } from 'lucide-react';
import { VolumeState } from '../../types/coaching';

interface DualVolumeIndicatorProps {
  micVolumeState: VolumeState;
  tabVolumeState: VolumeState;
  captureMode: 'microphone' | 'full-conversation';
  className?: string;
}

export const DualVolumeIndicator: React.FC<DualVolumeIndicatorProps> = ({ 
  micVolumeState, 
  tabVolumeState,
  captureMode,
  className = "" 
}) => {
  const { level: micLevel, isMonitoring: micMonitoring, status: micStatus } = micVolumeState;
  const { level: tabLevel, isMonitoring: tabMonitoring, status: tabStatus } = tabVolumeState;

  if (!micMonitoring && !tabMonitoring) {
    return null;
  }

  return (
    <div className={`px-1 ${className}`}>
      <div className="flex flex-col space-y-2">
        {/* Microphone Volume */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 min-w-[140px]">
            <Mic className="w-4 h-4 text-primary-400" />
            <span className="text-xs text-slate-400">Your Mic:</span>
          </div>
          
          {/* Volume Bar */}
          <div className="flex-1 max-w-xs">
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div 
                className={`h-full transition-all duration-100 ${
                  micLevel > 20 ? 'bg-green-400' : 
                  micLevel > 5 ? 'bg-yellow-400' : 
                  'bg-red-400'
                }`}
                style={{ width: `${Math.min(micLevel, 100)}%` }}
              />
            </div>
          </div>
          
          {/* Volume Percentage */}
          <div className="text-xs font-mono text-slate-300 min-w-[3rem]">
            {micLevel}%
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center space-x-1">
            <div className={`w-1.5 h-1.5 rounded-full ${
              micLevel > 20 ? 'bg-green-400 animate-pulse' : 
              micLevel > 5 ? 'bg-yellow-400' : 
              'bg-slate-600'
            }`} />
            <span className="text-xs text-slate-400 capitalize">
              {micStatus}
            </span>
          </div>
        </div>

        {/* Tab/Headphone Volume - Only show in full conversation mode */}
        {captureMode === 'full-conversation' && (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 min-w-[140px]">
              <Headphones className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-400">Other Party:</span>
            </div>
            
            {/* Volume Bar */}
            <div className="flex-1 max-w-xs">
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div 
                  className={`h-full transition-all duration-100 ${
                    tabMonitoring ? (
                      tabLevel > 20 ? 'bg-cyan-400' : 
                      tabLevel > 5 ? 'bg-blue-400' : 
                      'bg-slate-600'
                    ) : 'bg-slate-700'
                  }`}
                  style={{ width: tabMonitoring ? `${Math.min(tabLevel, 100)}%` : '0%' }}
                />
              </div>
            </div>
            
            {/* Volume Percentage */}
            <div className="text-xs font-mono text-slate-300 min-w-[3rem]">
              {tabMonitoring ? `${tabLevel}%` : 'N/A'}
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center space-x-1">
              <div className={`w-1.5 h-1.5 rounded-full ${
                tabMonitoring ? (
                  tabLevel > 20 ? 'bg-cyan-400 animate-pulse' : 
                  tabLevel > 5 ? 'bg-blue-400' : 
                  'bg-slate-600'
                ) : 'bg-red-600'
              }`} />
              <span className="text-xs text-slate-400 capitalize">
                {tabMonitoring ? tabStatus : 'no signal'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};