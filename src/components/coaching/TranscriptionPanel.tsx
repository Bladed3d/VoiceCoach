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
  liveTranscriptSpeaker?: 'user' | 'prospect';
  isRecording: boolean;
  onClear?: () => void;
  onCollapse?: () => void;
}

export const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({
  transcriptions,
  liveTranscript,
  liveTranscriptSpeaker = 'user',
  isRecording,
  onClear,
  onCollapse
}) => {
  return (
    <div className="h-full glass-panel p-6 flex flex-col min-h-0 max-w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-primary-400" />
          <h2 className="text-lg font-semibold">Live Talk</h2>
          <span className="text-xs text-slate-400">
            ({transcriptions.length} count)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            className="text-sm text-slate-400 hover:text-white px-2 py-1 border border-slate-600 rounded"
            onClick={onClear}
          >
            Clear
          </button>
          <button 
            className="text-slate-400 hover:text-red-400 p-1 border border-slate-600 rounded"
            onClick={onCollapse}
            title="Collapse to vertical"
          >
            <X className="w-4 h-4" />
          </button>
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
              <div className={`text-sm p-3 rounded border ${
                liveTranscriptSpeaker === 'user' 
                  ? 'bg-blue-900/20 text-blue-300 border-blue-600/30' 
                  : 'bg-green-900/20 text-green-300 border-green-600/30'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold flex items-center space-x-2">
                    {liveTranscriptSpeaker === 'user' ? (
                      <>
                        <span className="text-blue-400">🎤</span>
                        <span>You (Live)</span>
                      </>
                    ) : (
                      <>
                        <span className="text-green-400">👤</span>
                        <span>Prospect (Live)</span>
                      </>
                    )}
                  </span>
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
                        ? 'bg-blue-900/20 text-blue-300 border-l-4 border-blue-400'
                        : 'bg-green-900/20 text-green-300 border-l-4 border-green-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold flex items-center space-x-2">
                        {t.speaker === 'user' ? (
                          <>
                            <span className="text-blue-400">🎤</span>
                            <span>You</span>
                          </>
                        ) : (
                          <>
                            <span className="text-green-400">👤</span>
                            <span>Prospect</span>
                          </>
                        )}
                        {t.stageId && (
                          <span className="text-xs font-mono text-slate-400 ml-2">
                            {t.stageId}
                          </span>
                        )}
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