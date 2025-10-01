/**
 * VoiceCoach V2 - Coaching Panel Component
 * Displays AI coaching suggestions and prompts with rich interactive UI
 */
import React from 'react';
import { Brain, Lightbulb, Database } from 'lucide-react';
import { CoachingPrompt } from '../../types/coaching';
import { SimpleLiquidGrid } from '../common/SimpleLiquidGrid';
import { CoachingCard } from './CoachingCard';
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
  const [showAnimation, setShowAnimation] = React.useState(true);
  const [dismissedPrompts, setDismissedPrompts] = React.useState<Set<string>>(new Set());
  const [usedPrompts, setUsedPrompts] = React.useState<Set<string>>(new Set());
  
  // Filter out dismissed prompts
  const visiblePrompts = coachingPrompts.filter(p => !dismissedPrompts.has(String(p.id)));
  
  // Auto-disable animation after coaching session ends
  React.useEffect(() => {
    if (!isRecording && coachingPrompts.length > 0) {
      // Session just ended and we have prompts to show
      trail.light(7205, {
        event: 'SESSION_ENDED_AUTO_DISABLE_ANIMATION',
        promptCount: coachingPrompts.length,
        previousAnimationState: showAnimation
      });
      setShowAnimation(false);
    }
  }, [isRecording, coachingPrompts.length]);
  
  // Debug logging for animation state + cleanup
  React.useEffect(() => {
    trail.light(7197, {
      event: 'COACHING_PANEL_MOUNT',
      isRecording,
      shouldShowAnimation: !isRecording,
      coachingPromptsCount: coachingPrompts.length,
      animationEnabled: showAnimation
    });
    
    // Force cleanup of any stale animation elements when state changes
    if (!showAnimation) {
      // Clean up any leftover animation styles
      const staleStyles = document.querySelectorAll('style[id*="pinStreak_"]');
      staleStyles.forEach(style => {
        console.log('Removing stale animation style:', style.id);
        style.remove();
      });
    }
  }, [isRecording, coachingPrompts.length, showAnimation]);
  
  // Cleanup on component unmount
  React.useEffect(() => {
    return () => {
      // Clean up all animation styles when component unmounts
      const allAnimationStyles = document.querySelectorAll('style[id*="pinStreak_"]');
      allAnimationStyles.forEach(style => {
        console.log('Cleanup on unmount - removing:', style.id);
        style.remove();
      });
    };
  }, []);

  const handleAnimationClick = () => {
    trail.light(7196, { event: 'ANIMATION_CLICK_IN_PANEL' });
    console.log('Animation clicked in CoachingPanel');
  };
  
  const handlePromptUsed = (promptId: string) => {
    trail.light(7340, { operation: 'prompt_used', promptId });
    setUsedPrompts(prev => new Set(prev).add(promptId));
  };
  
  const handlePromptDismissed = (promptId: string) => {
    trail.light(7341, { operation: 'prompt_dismissed', promptId });
    setDismissedPrompts(prev => new Set(prev).add(promptId));
  };
  
  const handleCopy = (text: string) => {
    trail.light(7342, { operation: 'prompt_copied', textLength: text.length });
  };
  return (
    <div className="h-full glass-panel p-6 flex flex-col min-h-0 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">AI Coaching Assistant</h2>
        <div className="flex items-center space-x-3">
          {!isRecording && (
            <button 
              className={`text-xs px-2 py-1 rounded transition-colors ${
                showAnimation 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
              }`}
              onClick={() => {
                trail.light(7204, {
                  event: 'ANIMATION_TOGGLE',
                  previousState: showAnimation,
                  newState: !showAnimation
                });
                setShowAnimation(!showAnimation);
              }}
            >
              Animation {showAnimation ? 'ON' : 'OFF'}
            </button>
          )}
          <button 
            className="text-sm text-slate-400 hover:text-white"
            onClick={onClearHistory}
          >
            Clear History
          </button>
        </div>
      </div>
      
      <div className="flex-1 space-y-4 overflow-y-auto relative"
           style={{ isolation: 'isolate', position: 'relative' }}>
        {/* Show empty state when no prompts */}
        {visiblePrompts.length === 0 && (
          <div className="text-center text-slate-400 mt-12">
            {isRecording ? (
              <div>
                <div className="w-8 h-8 mx-auto mb-2 rounded-full border-2 border-primary-400 border-t-transparent animate-spin"></div>
                <p>AI analyzing conversation...</p>
                <p className="text-sm mt-1">Smart coaching prompts will appear here</p>
              </div>
            ) : (
              <div>
                <Lightbulb className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Start coaching session for AI insights</p>
                <p className="text-sm mt-1">Get real-time suggestions from knowledge base</p>
              </div>
            )}
          </div>
        )}
        
        {/* Display coaching prompts using enhanced CoachingCard */}
        <div className="space-y-4">
          {visiblePrompts.slice().reverse().map((prompt, index) => (
            <CoachingCard
              key={prompt.id}
              prompt={prompt}
              index={index}
              totalCount={visiblePrompts.length}
              onUsed={handlePromptUsed}
              onDismissed={handlePromptDismissed}
              onCopy={handleCopy}
              stageId={prompt.stageId}
            />
          ))}
        </div>
        
        {/* Show animation overlay when not recording and animation is enabled */}
        {!isRecording && showAnimation && (
          <div 
            className="absolute inset-0 overflow-hidden rounded-lg" 
            style={{
              zIndex: 5,
              isolation: 'isolate',
              contain: 'layout style paint',
              clipPath: 'inset(0px)'
            }}
          >
            <SimpleLiquidGrid 
              className="w-full h-full" 
              isActive={!isRecording && showAnimation}
            />
          </div>
        )}
        
      </div>
    </div>
  );
};