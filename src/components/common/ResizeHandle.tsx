/**
 * VoiceCoach V2 - Resize Handle Component
 * Provides professional drag-to-resize functionality between panels
 */
import React from 'react';

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  isDragging?: boolean;
  className?: string;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  onMouseDown,
  isDragging = false,
  className = ''
}) => {
  return (
    <div
      className={`
        flex items-center justify-center w-2 cursor-ew-resize 
        hover:bg-slate-600/50 transition-colors relative group
        ${isDragging ? 'bg-primary-600/50' : ''}
        ${className}
      `}
      onMouseDown={onMouseDown}
    >
      {/* Visual grip indicator */}
      <div className={`
        h-8 w-1 rounded-full transition-all
        ${isDragging 
          ? 'bg-primary-400 scale-110' 
          : 'bg-slate-500 group-hover:bg-slate-400'
        }
      `} />
      
      {/* Extended hit area for better usability */}
      <div className="absolute inset-y-0 -inset-x-2" />
      
      {/* Tooltip on hover */}
      <div className="
        absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
        bg-slate-800 text-white text-xs px-2 py-1 rounded
        opacity-0 group-hover:opacity-100 transition-opacity
        pointer-events-none whitespace-nowrap z-50
        translate-y-8
      ">
        Drag to resize
      </div>
    </div>
  );
};