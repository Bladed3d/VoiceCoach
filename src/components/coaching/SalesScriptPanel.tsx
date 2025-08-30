/**
 * VoiceCoach V2 - Sales Script Panel Component
 * Displays sales scripts, outlines, and talking points
 */
import React from 'react';
import { FileText, Book, CheckCircle, X } from 'lucide-react';
import { SalesScriptItem } from '../../types/coaching';

interface SalesScriptPanelProps {
  scriptItems: SalesScriptItem[];
  isRecording: boolean;
  onMarkUsed?: (id: string) => void;
  onClearUsed?: () => void;
  onCollapse?: () => void;
}

export const SalesScriptPanel: React.FC<SalesScriptPanelProps> = ({
  scriptItems,
  isRecording: _isRecording,
  onMarkUsed,
  onClearUsed,
  onCollapse
}) => {
  const usedCount = scriptItems.filter(item => item.used).length;
  
  return (
    <div className="glass-panel p-6 flex flex-col min-h-0 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-primary-400" />
          <h2 className="text-lg font-semibold">Sales Script</h2>
          <span className="text-xs text-slate-400">
            ({usedCount}/{scriptItems.length} used)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            className="text-sm text-slate-400 hover:text-white"
            onClick={onClearUsed}
          >
            Reset Used
          </button>
          <button 
            className="text-slate-400 hover:text-red-400 p-1 rounded"
            onClick={onCollapse}
            title="Collapse panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 space-y-3 overflow-y-auto">
        {scriptItems.length === 0 ? (
          <div className="text-center py-12">
            <Book className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-sm text-slate-400">
              📋 No sales scripts loaded
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Upload documents to generate talking points and scripts
            </p>
          </div>
        ) : (
          <>
            {scriptItems.map((item) => (
              <div 
                key={item.id}
                className={`p-4 rounded-lg border transition-all ${
                  item.used 
                    ? 'bg-green-900/10 border-green-600/30 opacity-60' 
                    : item.category === 'opening'
                      ? 'bg-blue-900/20 border-blue-600/50'
                      : item.category === 'objection'
                        ? 'bg-red-900/20 border-red-600/50'
                        : item.category === 'closing'
                          ? 'bg-purple-900/20 border-purple-600/50'
                          : 'bg-slate-900/20 border-slate-600/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        item.category === 'opening' 
                          ? 'bg-blue-600 text-white'
                          : item.category === 'objection'
                            ? 'bg-red-600 text-white'
                            : item.category === 'closing'
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-600 text-white'
                      }`}>
                        {item.category.toUpperCase()}
                      </span>
                      {item.used && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    <h4 className="text-sm font-medium mb-2">{item.title}</h4>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">
                      {item.content}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-slate-400 mt-2 italic">
                        💡 {item.notes}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <button 
                      className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded"
                      onClick={() => navigator.clipboard.writeText(item.content)}
                    >
                      Copy
                    </button>
                    {!item.used && (
                      <button 
                        className="text-xs bg-green-700 hover:bg-green-600 px-2 py-1 rounded"
                        onClick={() => onMarkUsed?.(item.id)}
                      >
                        Mark Used
                      </button>
                    )}
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