/**
 * VoiceCoach V2 - Manual Sentiment Buttons Component
 * Five emoji buttons for user to manually indicate call sentiment
 */

import React from 'react';

interface ManualSentimentButtonsProps {
  onSentimentClick: (score: -50 | -25 | 0 | 25 | 50, emoji: string) => void;
  disabled?: boolean;
}

export const ManualSentimentButtons: React.FC<ManualSentimentButtonsProps> = ({
  onSentimentClick,
  disabled = false
}) => {
  const sentiments = [
    { score: -50 as const, emoji: '😤', label: 'Poor', color: 'from-red-600 to-red-700' },
    { score: -25 as const, emoji: '😐', label: 'Weak', color: 'from-orange-600 to-orange-700' },
    { score: 0 as const, emoji: '😶', label: 'Neutral', color: 'from-gray-600 to-gray-700' },
    { score: 25 as const, emoji: '😊', label: 'Good', color: 'from-green-600 to-green-700' },
    { score: 50 as const, emoji: '🎉', label: 'Excellent', color: 'from-emerald-600 to-emerald-700' }
  ];

  return (
    <div className="mt-3 pt-3 border-t border-gray-700">
      <div className="text-xs text-gray-400 mb-2 font-medium">
        🎯 How's the call going?
      </div>
      <div className="grid grid-cols-5 gap-2">
        {sentiments.map(({ score, emoji, label, color }) => (
          <button
            key={score}
            onClick={() => onSentimentClick(score, emoji)}
            disabled={disabled}
            className={`
              relative group
              bg-gradient-to-br ${color}
              hover:scale-105 active:scale-95
              disabled:opacity-30 disabled:cursor-not-allowed
              rounded-lg p-2
              transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-blue-500
            `}
            title={`${label} (${score > 0 ? '+' : ''}${score})`}
          >
            <div className="text-2xl mb-1">{emoji}</div>
            <div className="text-[10px] font-medium text-white/90">
              {label}
            </div>
            {/* Ripple effect on click */}
            <div className="absolute inset-0 rounded-lg bg-white/20 opacity-0 group-active:opacity-100 transition-opacity duration-100" />
          </button>
        ))}
      </div>
      <div className="text-[10px] text-gray-500 mt-2 text-center">
        Click to record your read on sentiment at this moment
      </div>
    </div>
  );
};
