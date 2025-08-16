import { useState, useEffect, useRef } from "react";
import { User, Users } from "lucide-react";
import { generateOllamaCoaching } from "../lib/tauri-mock";
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

interface TranscriptionEntry {
  id: string;
  speaker: 'user' | 'prospect';
  text: string;
  timestamp: Date;
  confidence: number;
}

interface TranscriptionPanelProps {
  isRecording: boolean;
  transcriptions?: TranscriptionEntry[];
}

function TranscriptionPanel({ isRecording, transcriptions: externalTranscriptions }: TranscriptionPanelProps) {
  const trail = new BreadcrumbTrail('TranscriptionPanel');
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [currentInterimText, setCurrentInterimText] = useState<string>('');
  const [isLive, setIsLive] = useState(false);
  const [lastCoachingText, setLastCoachingText] = useState<string>(''); // Track last text sent to Ollama
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listen for real voice transcription events
  useEffect(() => {
    if (externalTranscriptions && externalTranscriptions.length > 0) {
      // Use real transcriptions from orchestrator
      setTranscriptions(externalTranscriptions);
      setIsLive(isRecording);
      return;
    }

    // Update live status based on recording state
    setIsLive(isRecording);
    
    // Clear interim text when not recording, but keep permanent transcriptions
    if (!isRecording) {
      setCurrentInterimText('');
    }
    
    // Always listen for voice transcription events (global voice recognition)
    const handleVoiceTranscription = (event: CustomEvent) => {
      const { text, timestamp, isFinal, isInterim } = event.detail;
      
      // LED 601: Voice transcription received
      trail.light(601, { 
        operation: 'voice_transcription_received',
        isFinal,
        isInterim,
        text_length: text.length,
        word_count: text.split(' ').length
      });
      
      if (isInterim) {
        // Show interim text as user speaks (real-time)
        setCurrentInterimText(text);
        
        // LED 602: Interim text processing
        trail.light(602, { 
          operation: 'interim_text_processing',
          text_preview: text.substring(0, 50),
          word_count: text.split(' ').length
        });
        
        // Don't call Ollama on interim text - wait for final results only
        // This prevents duplicate coaching prompts from live transcription
      } else if (isFinal) {
        // LED 608: Final transcription processing
        trail.light(608, { 
          operation: 'final_transcription_processing',
          text_preview: text.substring(0, 50),
          word_count: text.split(' ').length
        });
        
        // Add final transcription to permanent list
        const newTranscription: TranscriptionEntry = {
          id: `transcription-${Date.now()}-${Math.random()}`,
          speaker: 'user', // For now, assume user is speaking
          text: text,
          timestamp: new Date(timestamp),
          confidence: 0.9 // Web Speech API doesn't provide confidence, use default
        };
        
        setTranscriptions(prev => [...prev, newTranscription]);
        setCurrentInterimText(''); // Clear interim text
        
        // Only call Ollama on final text (prevents duplicates)
        if (text.split(' ').length >= 3) {
          // LED 609: Ollama coaching call on final text
          trail.light(609, { 
            operation: 'ollama_coaching_call_final',
            text_preview: text.substring(0, 50),
            word_count: text.split(' ').length
          });
          
          // Call Ollama for coaching analysis
          generateOllamaCoaching(text).then(coaching => {
            if (coaching) {
              // LED 610: Final coaching generated successfully
              trail.light(610, { 
                operation: 'final_coaching_generated_successfully',
                coaching_type: coaching.type,
                urgency: coaching.urgency,
                suggestion_length: coaching.suggestion?.length || 0
              });
              
              const coachingEvent = new CustomEvent('newCoachingPrompt', {
                detail: { 
                  coaching: coaching,
                  sourceText: text,
                  isLive: false, // Mark as final, not live interim
                  timestamp: Date.now() 
                }
              });
              window.dispatchEvent(coachingEvent);
            } else {
              // LED 611: No final coaching generated
              trail.light(611, { 
                operation: 'no_final_coaching_generated',
                reason: 'ollama_returned_null'
              });
            }
          }).catch(error => {
            // LED 609: Final Ollama coaching call failed
            trail.fail(609, error as Error);
            console.warn('Ollama coaching failed on final text:', error);
          });
        }
      }
    };

    window.addEventListener('voiceTranscription', handleVoiceTranscription as EventListener);
    
    return () => {
      window.removeEventListener('voiceTranscription', handleVoiceTranscription as EventListener);
    };
  }, [isRecording, externalTranscriptions]);

  // Auto-scroll to bottom when new transcriptions arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions]);

  const clearTranscriptionHistory = () => {
    trail.light(620, { operation: 'clear_transcription_history_clicked' });
    setTranscriptions([]);
    setCurrentInterimText('');
    console.log('🗑️ Transcription history cleared');
  };

  return (
    <div className="glass-panel h-full flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Live Conversation</h3>
          <div className="flex items-center space-x-3">
            {transcriptions.length > 0 && (
              <button
                onClick={clearTranscriptionHistory}
                className="text-xs px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-slate-300"
                title="Clear conversation history"
              >
                Clear History
              </button>
            )}
            {isLive && (
              <div className="flex items-center space-x-2 text-success-400">
                <div className="w-2 h-2 rounded-full bg-success-400 animate-pulse"></div>
                <span className="text-sm">Live transcription</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {transcriptions.length === 0 && (
          <div className="text-center text-slate-400 mt-12">
            {isRecording ? (
              <div>
                <div className="w-8 h-8 mx-auto mb-2 rounded-full border-2 border-primary-400 border-t-transparent animate-spin"></div>
                <p>Listening for conversation...</p>
                <p className="text-sm mt-2">Start speaking to see transcription</p>
              </div>
            ) : (
              <div>
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Click "Start Coaching Session" to begin voice transcription</p>
              </div>
            )}
          </div>
        )}

        {transcriptions.map((entry) => (
          <div
            key={entry.id}
            className={`flex space-x-3 p-3 rounded-lg ${
              entry.speaker === 'user' 
                ? 'bg-primary-900/30 ml-8' 
                : 'bg-slate-800/50 mr-8'
            }`}
          >
            <div className={`p-2 rounded-full ${
              entry.speaker === 'user'
                ? 'bg-primary-600'
                : 'bg-orange-600'
            }`}>
              {entry.speaker === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Users className="w-4 h-4 text-white" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium">
                  {entry.speaker === 'user' ? 'You' : 'Prospect'}
                </span>
                <span className="text-xs text-slate-400">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  entry.confidence > 0.8 
                    ? 'bg-success-900/50 text-success-400'
                    : entry.confidence > 0.6
                    ? 'bg-warning-900/50 text-warning-400'
                    : 'bg-danger-900/50 text-danger-400'
                }`}>
                  {Math.round(entry.confidence * 100)}% confidence
                </span>
              </div>
              <p className="text-sm leading-relaxed">{entry.text}</p>
            </div>
          </div>
        ))}

        {/* Show current interim speech in real-time */}
        {currentInterimText && (
          <div className="flex space-x-3 p-3 rounded-lg bg-primary-900/20 ml-8 border-2 border-primary-500/50 border-dashed">
            <div className="p-2 rounded-full bg-primary-600 animate-pulse">
              <User className="w-4 h-4 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium">You</span>
                <span className="text-xs text-primary-400 animate-pulse">Speaking...</span>
              </div>
              <p className="text-sm leading-relaxed text-primary-200 italic">{currentInterimText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TranscriptionPanel;