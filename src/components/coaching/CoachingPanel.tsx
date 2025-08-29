/**
 * VoiceCoach V2 - Coaching Panel Component
 * Displays AI coaching suggestions and prompts
 */
import React from 'react';
import { Brain } from 'lucide-react';
import { CoachingPrompt } from '../../types/coaching';

interface CoachingPanelProps {
  coachingPrompts: CoachingPrompt[];
  isRecording: boolean;
  onClearHistory?: () => void;
}

export const CoachingPanel: React.FC<CoachingPanelProps> = ({
  coachingPrompts,
  isRecording,
  onClearHistory
}) => {
  return (
    <div className="flex-[2] glass-panel p-6 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">AI Coaching Assistant</h2>
        <button 
          className="text-sm text-slate-400 hover:text-white"
          onClick={onClearHistory}
        >
          Clear History
        </button>
      </div>
      
      <div className="flex-1 space-y-4 overflow-y-auto">
        {!isRecording ? (
          <div className="text-center py-12">
            <Brain className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-400 mb-2">
              Start coaching session for AI insights
            </h3>
            <p className="text-sm text-slate-500">
              Get real-time suggestions from knowledge base
            </p>
          </div>
        ) : (
          <>
            {coachingPrompts.slice().reverse().map((prompt) => (
              <div 
                key={prompt.id}
                className={`p-4 rounded-lg border-l-4 ${
                  prompt.priority === 'critical' 
                    ? 'bg-red-900/20 border-red-500' 
                    : 'bg-blue-900/20 border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        prompt.priority === 'critical' 
                          ? 'bg-red-600 text-white' 
                          : 'bg-blue-600 text-white'
                      }`}>
                        {prompt.priority.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-400 capitalize">
                        {prompt.category}
                      </span>
                    </div>
                    <p className="text-sm">{prompt.text}</p>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <button className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">
                      Copy
                    </button>
                    <button className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">
                      Used
                    </button>
                    <button className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};