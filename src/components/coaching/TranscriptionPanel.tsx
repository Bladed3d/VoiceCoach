/**
 * VoiceCoach V2 - Transcription Panel Component
 * Displays live transcriptions and conversation history
 */
import React from 'react';
import { MessageSquare, X } from 'lucide-react';
import { TranscriptionItem } from '../../types/coaching';

interface TranscriptionPanelProps {
  transcriptions: TranscriptionItem[];
  liveTranscript: string;
  isRecording: boolean;
  onClear?: () => void;
  onCollapse?: () => void;
}

export const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({
  transcriptions,
  liveTranscript,
  isRecording,
  onClear,
  onCollapse
}) => {
  return (
    <div className="h-full glass-panel p-6 flex flex-col min-h-0 max-w-full">
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <MessageSquare className="w-4 h-4 text-primary-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold leading-tight">
              <span className="block">Live</span>
              <span className="block">Transcript</span>
            </h2>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">({transcriptions.length} messages)</span>
          <div className="flex items-center space-x-2">
            <button 
              className="text-sm text-slate-400 hover:text-white"
              onClick={onClear}
            >
              Clear
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
      </div>
      
      <div className="flex-1 space-y-3 overflow-y-auto">
        {!isRecording && transcriptions.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-sm text-slate-400">
              📝 Start recording to see live transcriptions
            </p>
            <p className="text-xs text-slate-500 mt-2">
              VoiceCoach will listen and provide real-time coaching suggestions
            </p>
          </div>
        ) : (
          <>
            {/* Live partial transcript - only show when recording */}
            {isRecording && liveTranscript && (
              <div className="text-sm p-3 rounded bg-yellow-900/20 text-yellow-300 border border-yellow-600/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">🎤 Live</span>
                  <span className="text-xs opacity-60">typing...</span>
                </div>
                <div className="break-words italic">{liveTranscript}</div>
              </div>
            )}
            
            {/* Final transcriptions */}
            {transcriptions.length === 0 && !liveTranscript && isRecording ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">
                  🎙️ Listening for speech...
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Speak to see transcription and get coaching suggestions
                </p>
              </div>
            ) : null}
            
            {/* Always show transcriptions if they exist */}
            {transcriptions.length > 0 && (
              <>
                {transcriptions.slice().reverse().map((t) => (
                  <div 
                    key={t.id} 
                    className={`text-sm p-3 rounded ${
                      t.speaker === 'user' 
                        ? 'bg-blue-900/20 text-blue-300' 
                        : 'bg-purple-900/20 text-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">
                        {t.speaker === 'user' ? '🎤 You' : '🎧 Speaker'}
                      </span>
                      <span className="text-xs opacity-60">
                        {new Date(t.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="break-words">{t.text}</div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};