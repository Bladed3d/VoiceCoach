/**
 * VoiceCoach V2 - MEFS Alignment Indicators
 * Displays Mental, Emotional, Financial, Schedule alignment scores
 * Simple visual indicators above the AI Coaching Assistant
 */
import React from 'react';
import { Brain, Heart, DollarSign, Clock } from 'lucide-react';

export interface MEFSScores {
  Mental: number;
  Emotional: number;
  Financial: number;
  Schedule: number;
}

export interface MEFSIndicatorsProps {
  scores: MEFSScores;
  stage: string;
  sentiment: string;
  isActive?: boolean;
}

const MEFSIndicators: React.FC<MEFSIndicatorsProps> = ({
  scores,
  stage,
  sentiment,
  isActive = false
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-green-400/20';
    if (score >= 50) return 'bg-yellow-400/20';
    return 'bg-red-400/20';
  };

  const dimensions = [
    { key: 'Mental', icon: Brain, score: scores.Mental },
    { key: 'Emotional', icon: Heart, score: scores.Emotional },
    { key: 'Financial', icon: DollarSign, score: scores.Financial },
    { key: 'Schedule', icon: Clock, score: scores.Schedule }
  ];

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">MEFS Alignment</h3>
        <div className="flex items-center space-x-4 text-xs">
          <span className="text-slate-400">Stage: <span className="text-white">{stage}</span></span>
          <span className="text-slate-400">Sentiment: <span className="text-white">{sentiment}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {dimensions.map(({ key, icon: Icon, score }) => (
          <div
            key={key}
            className={`
              flex flex-col items-center p-3 rounded-md border transition-all
              ${isActive ? getScoreBg(score) + ' border-current' : 'bg-slate-900 border-slate-700'}
            `}
          >
            <Icon className={`w-4 h-4 mb-1 ${getScoreColor(score)}`} />
            <div className="text-xs text-slate-400 mb-1">{key}</div>
            <div className={`text-lg font-semibold ${getScoreColor(score)}`}>
              {score}%
            </div>
          </div>
        ))}
      </div>

      {/* Progress bars for visual feedback */}
      <div className="grid grid-cols-4 gap-3 mt-2">
        {dimensions.map(({ key, score }) => (
          <div key={`${key}-bar`} className="w-full bg-slate-700 rounded-full h-1">
            <div
              className={`h-1 rounded-full transition-all duration-300 ${
                score >= 70 ? 'bg-green-400' :
                score >= 50 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MEFSIndicators;