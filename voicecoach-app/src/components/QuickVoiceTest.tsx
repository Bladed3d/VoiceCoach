import React from 'react';
import { Mic, MicOff, Trash2 } from 'lucide-react';
import { useWebSpeechRecognition } from '../hooks/useWebSpeechRecognition';

export function QuickVoiceTest() {
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    clearTranscript,
    fullTranscript
  } = useWebSpeechRecognition();

  return (
    <div className="bg-slate-800 rounded-lg p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-white mb-4">
        🎤 Quick Voice Test - Using Web Speech API
      </h2>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            isListening 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isListening ? (
            <>
              <MicOff className="w-5 h-5" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Start Recording
            </>
          )}
        </button>

        <button
          onClick={clearTranscript}
          className="flex items-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
        >
          <Trash2 className="w-5 h-5" />
          Clear
        </button>
      </div>

      {isListening && (
        <div className="mb-4 flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-red-400 font-medium">Recording... Speak now!</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2">Live Transcription:</h3>
          <div className="bg-slate-900 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
            <p className="text-white whitespace-pre-wrap">
              {fullTranscript || (
                <span className="text-slate-500 italic">
                  Click "Start Recording" and speak into your microphone...
                </span>
              )}
            </p>
            {interimTranscript && (
              <span className="text-slate-400 italic">{interimTranscript}</span>
            )}
          </div>
        </div>

        {transcript && (
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">Word Count:</h3>
            <p className="text-white">
              {transcript.split(' ').filter(word => word.length > 0).length} words
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-blue-900/30 rounded-lg border border-blue-700">
        <p className="text-blue-300 text-sm">
          ℹ️ This uses the built-in Web Speech API for instant transcription. 
          Works in Chrome/Edge/Electron. No external services needed!
        </p>
      </div>
    </div>
  );
}