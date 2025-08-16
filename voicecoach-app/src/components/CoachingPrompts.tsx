import { useState, useEffect } from "react";
import { smartInvoke } from '../lib/tauri-mock';
import { Lightbulb, AlertCircle, CheckCircle2, Clock, ArrowRight, Database } from "lucide-react";
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

interface CoachingPrompt {
  id: string;
  type: 'suggestion' | 'objection' | 'opportunity' | 'warning' | 'milestone';
  title: string;
  content: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  timestamp: Date;
  actionable: boolean;
  source?: string;
  confidence?: number;
}

interface AICoachingSuggestion {
  suggestion_type: string;
  confidence: number;
  content: string;
  source_document: string;
  methodology?: string;
}

interface CoachingPromptsProps {
  isRecording: boolean;
  conversationContext?: any;
  salesStage?: string;
  prompts?: CoachingPrompt[];
  onPromptUsed?: (promptId: string) => void;
  onPromptDismissed?: (promptId: string) => void;
}

function CoachingPrompts({ 
  isRecording, 
  conversationContext = '', 
  salesStage = 'discovery',
  prompts: externalPrompts,
  onPromptUsed,
  onPromptDismissed
}: CoachingPromptsProps) {
  const trail = new BreadcrumbTrail('CoachingPrompts');
  const [prompts, setPrompts] = useState<CoachingPrompt[]>([]);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AICoachingSuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Fetch AI coaching suggestions from knowledge base
  const fetchAICoachingSuggestions = async () => {
    if (!conversationContext.trim()) return;
    
    setIsLoadingAI(true);
    try {
      const suggestions = await smartInvoke('get_ai_coaching_suggestions', {
        conversationContext,
        salesStage
      });
      
      setAiSuggestions(suggestions);
      
      // Convert AI suggestions to coaching prompts
      const aiPrompts: CoachingPrompt[] = suggestions.map((suggestion: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        type: suggestion.suggestion_type.includes('objection') ? 'objection' : 
              suggestion.suggestion_type.includes('opportunity') ? 'opportunity' : 'suggestion',
        title: `AI Knowledge: ${suggestion.suggestion_type}`,
        content: suggestion.content,
        priority: suggestion.confidence > 0.8 ? 'high' : suggestion.confidence > 0.6 ? 'medium' : 'low',
        timestamp: new Date(),
        actionable: true,
        source: suggestion.source_document,
        confidence: suggestion.confidence
      }));
      
      setPrompts(prev => [...prev, ...aiPrompts]);
    } catch (error) {
      console.error('Failed to fetch AI coaching suggestions:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Listen for real Ollama coaching events from voice transcription
  useEffect(() => {
    const handleOllamaCoaching = (event: CustomEvent) => {
      const { coaching, sourceText, isLive, timestamp } = event.detail;
      
      // LED 701: Ollama coaching event received
      trail.light(701, { 
        operation: 'ollama_coaching_event_received',
        coaching_type: coaching?.type,
        urgency: coaching?.urgency,
        source_text_preview: sourceText?.substring(0, 30),
        timestamp
      });
      
      if (coaching && coaching.type === 'ollama_coaching') {
        // Check for duplicate prompts based on content similarity
        const isDuplicate = prompts.some(existing => 
          existing.content.toLowerCase().includes(coaching.suggestion.toLowerCase().substring(0, 20)) ||
          coaching.suggestion.toLowerCase().includes(existing.content.toLowerCase().substring(0, 20))
        );
        
        // LED 702: Duplicate check
        trail.light(702, { 
          operation: 'duplicate_prompt_check',
          is_duplicate: isDuplicate,
          existing_prompts_count: prompts.length,
          new_suggestion_preview: coaching.suggestion.substring(0, 30)
        });
        
        if (!isDuplicate) {
          const newPrompt: CoachingPrompt = {
            id: `ollama-${timestamp}-${Math.random()}`,
            type: coaching.urgency === 'high' ? 'opportunity' : 
                  coaching.urgency === 'low' ? 'suggestion' : 'objection',
            title: `Ollama AI: ${coaching.urgency.toUpperCase()} Priority`,
            content: coaching.suggestion,
            priority: coaching.urgency === 'high' ? 'high' : 
                     coaching.urgency === 'low' ? 'low' : 'medium',
            timestamp: new Date(timestamp),
            actionable: true,
            source: `AI Analysis (${coaching.model})`,
            confidence: 0.9 // Ollama confidence
          };
          
          // LED 703: Adding new prompt
          trail.light(703, { 
            operation: 'adding_new_ollama_prompt',
            prompt_id: newPrompt.id,
            priority: newPrompt.priority,
            content_preview: newPrompt.content.substring(0, 50)
          });
          
          console.log('📋 Adding Ollama coaching prompt:', newPrompt);
          setPrompts(prev => [newPrompt, ...prev]); // Add to top for latest first
        } else {
          // LED 704: Skipping duplicate
          trail.light(704, { 
            operation: 'skipping_duplicate_prompt',
            suggestion_preview: coaching.suggestion.substring(0, 30),
            reason: 'content_similarity_detected'
          });
          console.log('🚫 Skipping duplicate Ollama prompt:', coaching.suggestion.substring(0, 50));
        }
      }
    };

    // Listen for Ollama coaching events
    window.addEventListener('newCoachingPrompt', handleOllamaCoaching as EventListener);
    
    return () => {
      window.removeEventListener('newCoachingPrompt', handleOllamaCoaching as EventListener);
    };
  }, []);

  // Use external prompts or generate prompts during recording
  useEffect(() => {
    if (externalPrompts && externalPrompts.length > 0) {
      // Use real prompts from orchestrator
      setPrompts(externalPrompts);
      return;
    }

    if (!isRecording) {
      // Don't clear prompts immediately - keep them visible for review
      // setPrompts([]);
      setAiSuggestions([]);
      return;
    }

    // Fetch AI suggestions if conversation context is available
    if (conversationContext && typeof conversationContext === 'string' && conversationContext.trim()) {
      fetchAICoachingSuggestions();
    }

    // Real Ollama coaching will be added via event listener
    // No more mock prompts - only show real AI insights
  }, [isRecording, conversationContext, salesStage, externalPrompts]);

  const getPromptIcon = (type: CoachingPrompt['type']) => {
    switch (type) {
      case 'suggestion':
        return <Lightbulb className="w-5 h-5 text-primary-400" />;
      case 'objection':
        return <AlertCircle className="w-5 h-5 text-warning-400" />;
      case 'opportunity':
        return <CheckCircle2 className="w-5 h-5 text-success-400" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-danger-400" />;
      case 'milestone':
        return <ArrowRight className="w-5 h-5 text-purple-400" />;
    }
  };

  const getPriorityColor = (priority: CoachingPrompt['priority']) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-400 bg-red-900/20';
      case 'high':
        return 'border-l-danger-400 bg-danger-900/20';
      case 'medium':
        return 'border-l-warning-400 bg-warning-900/20';
      case 'low':
        return 'border-l-primary-400 bg-primary-900/20';
    }
  };

  return (
    <div className="glass-panel h-full flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">AI Coaching Assistant</h3>
          {isRecording && prompts.length > 0 && (
            <div className="text-sm text-slate-400">
              {prompts.filter(p => p.actionable).length} actionable insights
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {prompts.length === 0 && (
          <div className="text-center text-slate-400 mt-12">
            {isRecording ? (
              <div>
                {isLoadingAI ? (
                  <>
                    <Database className="w-8 h-8 mx-auto mb-2 animate-pulse text-blue-400" />
                    <p>Loading AI knowledge base...</p>
                    <p className="text-sm mt-1">Searching for relevant coaching insights</p>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 mx-auto mb-2 rounded-full border-2 border-primary-400 border-t-transparent animate-spin"></div>
                    <p>AI analyzing conversation...</p>
                    <p className="text-sm mt-1">Smart coaching prompts will appear here</p>
                  </>
                )}
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

        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className={`border-l-4 rounded-lg p-4 cursor-pointer transition-all duration-200 animate-slide-up ${
              getPriorityColor(prompt.priority)
            } ${activePrompt === prompt.id ? 'ring-2 ring-primary-400' : ''}`}
            onClick={() => setActivePrompt(activePrompt === prompt.id ? null : prompt.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                {getPromptIcon(prompt.type)}
                <div>
                  <h4 className="font-medium text-white">{prompt.title}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    prompt.priority === 'critical' ? 'bg-red-600 text-white' :
                    prompt.priority === 'high' ? 'bg-danger-600 text-white' :
                    prompt.priority === 'medium' ? 'bg-warning-600 text-white' :
                    'bg-slate-600 text-slate-300'
                  }`}>
                    {prompt.priority} priority
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">
                  {prompt.timestamp.toLocaleTimeString()}
                </span>
                {prompt.actionable && (
                  <ArrowRight className="w-4 h-4 text-primary-400" />
                )}
              </div>
            </div>

            <div className="mt-3">
              <p className="text-slate-200 leading-relaxed">{prompt.content}</p>
              
              {/* Show source and confidence for AI-generated suggestions */}
              {prompt.source && (
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-1">
                    <Database className="w-3 h-3" />
                    <span>Source: {prompt.source}</span>
                  </div>
                  {prompt.confidence && (
                    <span className="bg-blue-600 text-white px-2 py-1 rounded">
                      {Math.round(prompt.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
              )}
            </div>

            {prompt.actionable && activePrompt === prompt.id && (
              <div className="mt-4 pt-4 border-t border-slate-600 flex space-x-3">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onPromptUsed?.(prompt.id);
                    setActivePrompt(null);
                  }}
                  className="bg-success-600 hover:bg-success-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Use This Suggestion</span>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onPromptDismissed?.(prompt.id);
                    setActivePrompt(null);
                  }}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        ))}

        {isRecording && prompts.length > 0 && (
          <div className="mt-6 p-4 glass-panel">
            <h4 className="font-medium mb-2">Next Best Actions</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-success-400" />
                <span>Ask discovery question about lead qualification</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-success-400" />
                <span>Present automated lead scoring demo</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default CoachingPrompts;