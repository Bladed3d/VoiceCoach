import { useEffect, useState } from "react";
import { AudioLevels } from "../hooks/useAudioProcessor";

interface AudioVisualizerProps {
  audioLevels: AudioLevels;
  isRecording: boolean;
}

function AudioVisualizer({ audioLevels, isRecording }: AudioVisualizerProps) {
  const [visualData, setVisualData] = useState<number[]>(new Array(40).fill(0));

  // Generate real-time visualization data based on actual audio levels
  useEffect(() => {
    if (!isRecording) {
      // When not recording, gradually fade out visualization
      setVisualData(prev => prev.map(val => val * 0.9));
      return;
    }

    const interval = setInterval(() => {
      const userLevel = audioLevels.user;
      const prospectLevel = audioLevels.prospect;
      
      // Generate visualization bars based on real audio levels
      const newData = Array.from({ length: 40 }, (_, index) => {
        // First 20 bars for user, last 20 for prospect
        const isUserBar = index < 20;
        const baseLevel = isUserBar ? userLevel : prospectLevel;
        
        // Add some variation for visual interest while staying true to actual levels
        const variation = (Math.random() - 0.5) * 20; // ±10% variation
        const level = Math.max(0, Math.min(100, baseLevel + variation));
        
        // Add some frequency-based variation (higher frequencies for active speech)
        const freqMultiplier = isUserBar 
          ? 0.8 + (index / 20) * 0.4  // User: lower to higher frequencies
          : 0.4 + ((index - 20) / 20) * 0.8; // Prospect: different pattern
          
        return level * freqMultiplier;
      });
      
      setVisualData(newData);
    }, 50); // 20 FPS for smooth visualization

    return () => clearInterval(interval);
  }, [audioLevels, isRecording]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-6">
        {/* User Audio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-400">Your Voice</span>
            <span className="text-xs text-slate-400">{audioLevels.user}% volume</span>
          </div>
          <div className="flex items-center space-x-1 h-12 bg-slate-800 rounded-lg p-2">
            {visualData.slice(0, 20).map((height, index) => (
              <div
                key={`user-${index}`}
                className="flex-1 bg-gradient-to-t from-primary-600 to-primary-400 rounded-sm transition-all duration-100"
                style={{ height: `${Math.max(height * 0.8, 10)}%` }}
              />
            ))}
          </div>
        </div>

        {/* Prospect Audio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-success-400">Prospect Voice</span>
            <span className="text-xs text-slate-400">{audioLevels.prospect}% volume</span>
          </div>
          <div className="flex items-center space-x-1 h-12 bg-slate-800 rounded-lg p-2">
            {visualData.slice(20).map((height, index) => (
              <div
                key={`prospect-${index}`}
                className="flex-1 bg-gradient-to-t from-success-600 to-success-400 rounded-sm transition-all duration-100"
                style={{ height: `${Math.max(height * 0.6, 8)}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Speaking Indicator */}
      <div className="flex items-center justify-center space-x-6">
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
          audioLevels.user > 30 ? 'bg-primary-900/50 text-primary-400 border border-primary-500/30' : 'bg-slate-800 text-slate-400'
        }`}>
          <div className={`w-2 h-2 rounded-full transition-all duration-150 ${
            audioLevels.user > 30 ? 'bg-primary-400 animate-pulse shadow-lg shadow-primary-400/50' : 'bg-slate-500'
          }`} />
          <span className="text-sm font-medium">You</span>
          {isRecording && (
            <span className="text-xs text-primary-300 ml-1">
              {audioLevels.user.toFixed(0)}%
            </span>
          )}
        </div>

        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
          audioLevels.prospect > 30 ? 'bg-success-900/50 text-success-400 border border-success-500/30' : 'bg-slate-800 text-slate-400'
        }`}>
          <div className={`w-2 h-2 rounded-full transition-all duration-150 ${
            audioLevels.prospect > 30 ? 'bg-success-400 animate-pulse shadow-lg shadow-success-400/50' : 'bg-slate-500'
          }`} />
          <span className="text-sm font-medium">Prospect</span>
          {isRecording && (
            <span className="text-xs text-success-300 ml-1">
              {audioLevels.prospect.toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-2 px-4 py-2 bg-red-900/30 text-red-400 rounded-lg border border-red-500/30">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">LIVE RECORDING</span>
            <span className="text-xs text-red-300">
              {audioLevels.timestamp > 0 ? `${Math.floor(audioLevels.timestamp / 1000)}s` : '0s'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default AudioVisualizer;