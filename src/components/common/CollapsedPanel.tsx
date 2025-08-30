/**
 * VoiceCoach V2 - Collapsed Panel Component
 * Shows collapsed panel with expand button
 */
import React from 'react';
import { ChevronRight, FileText, MessageSquare } from 'lucide-react';

interface CollapsedPanelProps {
  type: 'script' | 'transcription';
  onClick: () => void;
  className?: string;
}

export const CollapsedPanel: React.FC<CollapsedPanelProps> = ({
  type,
  onClick,
  className = ''
}) => {
  const isScript = type === 'script';
  const Icon = isScript ? FileText : MessageSquare;
  const title = isScript ? 'Sales Script' : 'Live Transcription';
  const subtitle = isScript ? 'Expand for talking points' : 'Expand for transcript';
  
  return (
    <div className={`
      glass-panel flex flex-col items-center justify-start pt-6 pb-4 px-2
      cursor-pointer hover:bg-slate-800/50 transition-all group
      ${className}
    `}
    onClick={onClick}
    >
      {/* Expand button */}
      <button className="
        w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 
        flex items-center justify-center mb-3 transition-colors
        group-hover:bg-primary-600 group-hover:scale-110
      ">
        <ChevronRight className="w-4 h-4 text-white" />
      </button>
      
      {/* Icon */}
      <Icon className={`
        w-5 h-5 mb-3 transition-colors
        ${isScript ? 'text-blue-400' : 'text-purple-400'}
        group-hover:text-primary-400
      `} />
      
      {/* Vertical text */}
      <div className="flex flex-col items-center space-y-1 text-center">
        <div 
          className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors"
          style={{ 
            writingMode: 'vertical-lr', 
            textOrientation: 'mixed',
            height: '80px',
            overflow: 'hidden'
          }}
        >
          {title}
        </div>
        <div 
          className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors"
          style={{ 
            writingMode: 'vertical-lr', 
            textOrientation: 'mixed',
            height: '60px',
            overflow: 'hidden'
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
};