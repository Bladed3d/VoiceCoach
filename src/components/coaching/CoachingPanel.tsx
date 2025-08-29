/**
 * VoiceCoach V2 - Coaching Panel Component
 * Displays AI coaching suggestions and prompts
 */
import React from 'react';
import { Brain } from 'lucide-react';
import { CoachingPrompt } from '../../types/coaching';
import { SimpleLiquidGrid } from '../common/SimpleLiquidGrid';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

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
  const trail = new BreadcrumbTrail('CoachingPanel');
  
  // Debug logging for animation state
  React.useEffect(() => {
    trail.light(7197, {
      event: 'COACHING_PANEL_MOUNT',
      isRecording,
      shouldShowAnimation: !isRecording,
      coachingPromptsCount: coachingPrompts.length
    });
    console.log('CoachingPanel - isRecording:', isRecording, 'should show animation:', !isRecording);
  }, [isRecording, coachingPrompts.length]);
  
  const handleAnimationClick = () => {
    trail.light(7196, { event: 'ANIMATION_CLICK_IN_PANEL' });
    console.log('Animation clicked in CoachingPanel');
  };
  return (
    <div className="h-full glass-panel p-6 flex flex-col min-h-0">
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
          <div className="relative h-full">
            {/* LIQUID GRID ANIMATION */}
            <SimpleLiquidGrid 
              className="absolute inset-0" 
              isActive={!isRecording}
            />
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