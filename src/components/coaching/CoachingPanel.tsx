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
  const [showAnimation, setShowAnimation] = React.useState(true);
  
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
        {/* Always show prompts underneath */}
        <div className="space-y-4">
          {coachingPrompts.slice().reverse().map((prompt, index) => (
              <div 
                key={prompt.id}
                className={`p-4 rounded-lg border-l-4 transition-all hover:shadow-lg ${
                  prompt.priority === 'critical' 
                    ? 'bg-error-500/10 border-error-500 hover:bg-error-500/15' 
                    : prompt.priority === 'high'
                    ? 'bg-warning-500/10 border-warning-500 hover:bg-warning-500/15'
                    : 'bg-info-500/10 border-info-500 hover:bg-info-500/15'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Numbered Circle */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    prompt.priority === 'critical' 
                      ? 'bg-error-500 text-white' 
                      : prompt.priority === 'high'
                      ? 'bg-warning-500 text-white'
                      : 'bg-info-500 text-white'
                  }`}>
                    {coachingPrompts.length - index}
                  </div>
                  
                  <div className="flex-1">
                    {/* Header with Priority Badge and Category */}
                    <div className="flex items-center space-x-2 mb-3">
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                        prompt.priority === 'critical' 
                          ? 'bg-error-500 text-white' 
                          : prompt.priority === 'high'
                          ? 'bg-warning-500 text-white'
                          : 'bg-info-500 text-white'
                      }`}>
                        {prompt.priority === 'critical' ? '🚨 CRITICAL' : 
                         prompt.priority === 'high' ? '⚠️ HIGH' : '💡 STANDARD'}
                      </span>
                      <span className="text-xs px-2 py-1 bg-neutral-700 text-neutral-300 rounded capitalize">
                        {prompt.category}
                      </span>
                    </div>
                    
                    {/* Main Prompt Text */}
                    <p className={`text-sm leading-relaxed mb-3 ${
                      prompt.priority === 'critical' ? 'text-error-100 font-medium' :
                      prompt.priority === 'high' ? 'text-warning-100' : 'text-neutral-200'
                    }`}>
                      {prompt.text}
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <button className="text-xs bg-success-600 hover:bg-success-700 text-white px-3 py-1 rounded transition-colors">
                        📋 Copy
                      </button>
                      <button className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded transition-colors">
                        ✅ Used
                      </button>
                      <button className="text-xs bg-neutral-600 hover:bg-neutral-700 text-neutral-200 px-3 py-1 rounded transition-colors">
                        ❌ Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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