import { useState, useEffect } from "react";
import { smartInvoke, generateOllamaCoaching } from '../lib/tauri-mock';
import { Lightbulb, AlertCircle, CheckCircle2, Clock, ArrowRight, Database, Info, Loader, MessageCircle, Send } from "lucide-react";
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
  next_action?: string; // Contextual action to take
  reasoning?: string; // AI reasoning for the suggestion
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
  onClearPrompts?: () => void;
}

function CoachingPrompts({ 
  isRecording, 
  conversationContext = '', 
  salesStage = 'discovery',
  prompts: externalPrompts,
  onPromptUsed,
  onPromptDismissed,
  onClearPrompts
}: CoachingPromptsProps) {
  const trail = new BreadcrumbTrail('CoachingPrompts');
  const [prompts, setPrompts] = useState<CoachingPrompt[]>([]);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AICoachingSuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [expandedInfo, setExpandedInfo] = useState<{[key: string]: {content: string, loading: boolean}}>({});
  const [askMode, setAskMode] = useState<{[key: string]: {active: boolean, question: string, response: string, loading: boolean}}>({});
  
  // Coaching knowledge cache structure
  interface CoachingKnowledge {
    definition: string;
    executionSteps: string;
    timestamp: number;
    searchTerms: string[];
  }
  
  // Cache key generator for coaching concepts
  const generateCacheKey = (concept: string): string => {
    return concept.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special chars
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 50); // Limit length
  };
  
  // Load from cache or return null
  const loadFromCache = (cacheKey: string): CoachingKnowledge | null => {
    try {
      const cached = localStorage.getItem(`coaching_cache_${cacheKey}`);
      if (cached) {
        const data = JSON.parse(cached);
        // No expiration - coaching knowledge is permanent!
        // Once learned, concepts like "calibrated questions" don't change
        return data;
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }
    return null;
  };
  
  // Save to cache
  const saveToCache = (cacheKey: string, knowledge: Omit<CoachingKnowledge, 'timestamp'>) => {
    try {
      const cacheData: CoachingKnowledge = {
        ...knowledge,
        timestamp: Date.now()
      };
      localStorage.setItem(`coaching_cache_${cacheKey}`, JSON.stringify(cacheData));
      console.log('💾 Cached coaching knowledge:', cacheKey);
    } catch (error) {
      console.warn('Cache save error:', error);
    }
  };
  
  // Cache management utilities (for future development)
  const getCacheStats = (): { totalItems: number, totalSize: string } => {
    let totalItems = 0;
    let totalSize = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('coaching_cache_')) {
        totalItems++;
        totalSize += localStorage.getItem(key)?.length || 0;
      }
    }
    
    return {
      totalItems,
      totalSize: `${(totalSize / 1024).toFixed(1)}KB`
    };
  };
  
  const clearCorruptedCache = () => {
    // Only remove corrupted/invalid cache entries, not expired ones
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('coaching_cache_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          // Only remove if data is clearly corrupted (missing required fields)
          if (!data.definition || !data.executionSteps || !data.timestamp) {
            keysToRemove.push(key);
          }
        } catch (error) {
          keysToRemove.push(key); // Remove entries that can't be parsed
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🧹 Cleaned ${keysToRemove.length} corrupted cache entries`);
    return keysToRemove.length;
  };
  
  // Manual cache management - only clear if user explicitly wants to
  const clearAllCoachingCache = () => {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('coaching_cache_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🗑️ Manually cleared ${keysToRemove.length} coaching cache entries`);
    return keysToRemove.length;
  };
  
  const handleMoreInfo = async (prompt: CoachingPrompt) => {
    // Extract core concept for better caching (same regex as in definition prompt)
    const coreConceptMatch = prompt.content.match(/\b(open-ended questions?|calibrated questions?|mirroring|rapport building|discovery questions?|pain points?|objection handling|closing techniques?|follow-up questions?|qualifying questions?|probing questions?|leading questions?|active listening|empathy|rapport|trial close|assumptive close|scarcity|urgency|social proof|anchoring|reframing)\b/i);
    const coreConcept = coreConceptMatch ? coreConceptMatch[0] : prompt.content.split(' ').slice(0, 3).join(' ');
    const cacheKey = generateCacheKey(coreConcept);
    
    // Try to load from cache first
    const cachedKnowledge = loadFromCache(cacheKey);
    
    if (cachedKnowledge) {
      // Instant load from cache!
      console.log('⚡ Loading from cache:', cacheKey);
      const formattedContent = `## 📖 Definition
${cachedKnowledge.definition}

## 🎯 How to Execute
${cachedKnowledge.executionSteps}`;
      
      setExpandedInfo(prev => ({
        ...prev,
        [prompt.id]: { content: formattedContent, loading: false }
      }));
      return;
    }
    
    // Not in cache - do live AI search
    console.log('🔍 Live AI search for:', cacheKey);
    setExpandedInfo(prev => ({
      ...prev,
      [prompt.id]: { content: '', loading: true }
    }));
    
    try {
      // First get definition - extract the core concept and define it properly
      const coreConceptMatch = prompt.content.match(/\b(open-ended questions?|calibrated questions?|mirroring|rapport building|discovery questions?|pain points?|objection handling|closing techniques?|follow-up questions?|qualifying questions?|probing questions?|leading questions?|active listening|empathy|rapport|trial close|assumptive close|scarcity|urgency|social proof|anchoring|reframing)\b/i);
      const coreConcept = coreConceptMatch ? coreConceptMatch[0] : prompt.content.split(' ').slice(0, 3).join(' ');
      
      const definitionPrompt = `Define the sales concept "${coreConcept}" without using the words from this phrase: "${prompt.content}". 

What is "${coreConcept}"? Explain what it fundamentally IS as a concept or technique. Start with "${coreConcept} is..." or "${coreConcept} are...". 

Do NOT explain how to use it or why to use it - just explain what it IS. Focus on the basic definition and characteristics. Maximum 2-3 sentences.

Example format:
- "Open-ended questions are inquiries that cannot be answered with a simple yes or no response and require the respondent to provide detailed information or explanations."
- "Mirroring is a communication technique where one person subtly copies the body language, tone, or speech patterns of another person."`;

      
      const definitionResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5:14b-instruct-q4_k_m',
          prompt: definitionPrompt,
          stream: false,
          options: { temperature: 0.2, top_p: 0.8, num_predict: 200 }
        })
      });

      if (!definitionResponse.ok) {
        throw new Error(`Definition request failed: ${definitionResponse.status}`);
      }

      const definitionData = await definitionResponse.json();
      const definition = definitionData.response.trim();

      // Then get execution steps
      const stepsPrompt = `For "${prompt.content}", provide ONLY numbered actionable steps in this format:

1. **Step Name**: Brief description
2. **Step Name**: Brief description
3. **Step Name**: Brief description

No introduction, no explanation, just the steps.`;

      const stepsResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5:14b-instruct-q4_k_m',
          prompt: stepsPrompt,
          stream: false,
          options: { temperature: 0.3, top_p: 0.9, num_predict: 600 }
        })
      });

      if (!stepsResponse.ok) {
        throw new Error(`Steps request failed: ${stepsResponse.status}`);
      }

      const stepsData = await stepsResponse.json();
      const executionSteps = stepsData.response.trim();
      
      // Save to cache for future use
      saveToCache(cacheKey, {
        definition,
        executionSteps,
        searchTerms: [prompt.content.toLowerCase()]
      });
      
      // Format and display
      const formattedContent = `## 📖 Definition
${definition}

## 🎯 How to Execute
${executionSteps}`;
      
      setExpandedInfo(prev => ({
        ...prev,
        [prompt.id]: { content: formattedContent, loading: false }
      }));
      
    } catch (error) {
      console.error('More info research failed:', error);
      setExpandedInfo(prev => ({
        ...prev,
        [prompt.id]: { 
          content: 'Failed to load detailed guidance. Please ensure Ollama is running and try again.', 
          loading: false 
        }
      }));
    }
  };

  // Handle interactive Ask feature
  const handleAskQuestion = async (prompt: CoachingPrompt, question: string) => {
    if (!question.trim()) return;

    // Set loading state
    setAskMode(prev => ({
      ...prev,
      [prompt.id]: { ...prev[prompt.id], loading: true, response: '' }
    }));

    try {
      // Create context-aware prompt for AI
      const contextPrompt = `You are a sales coaching expert. The user is asking about this coaching suggestion: "${prompt.content}"

User's question: "${question}"

Please provide a helpful, practical answer that:
1. Directly addresses their question
2. Relates to the original coaching suggestion
3. Gives specific examples if requested
4. Keeps the focus on sales coaching and techniques
5. Is conversational and supportive

If they ask for examples, provide 2-3 concrete examples they can actually use.
If they need clarification, explain in simple terms.
Be encouraging and practical.`;

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5:14b-instruct-q4_k_m',
          prompt: contextPrompt,
          stream: false,
          options: {
            temperature: 0.4,
            top_p: 0.9,
            num_predict: 800
          }
        })
      });

      if (!response.ok) {
        throw new Error(`AI response failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Update with AI response
      setAskMode(prev => ({
        ...prev,
        [prompt.id]: { 
          ...prev[prompt.id], 
          response: data.response.trim(), 
          loading: false 
        }
      }));
      
    } catch (error) {
      console.error('Ask AI failed:', error);
      setAskMode(prev => ({
        ...prev,
        [prompt.id]: { 
          ...prev[prompt.id], 
          response: 'Sorry, I couldn\'t process your question. Please ensure Ollama is running and try again.', 
          loading: false 
        }
      }));
    }
  };

  // Toggle Ask mode
  const toggleAskMode = (promptId: string) => {
    setAskMode(prev => ({
      ...prev,
      [promptId]: {
        active: !prev[promptId]?.active,
        question: prev[promptId]?.question || '',
        response: prev[promptId]?.response || '',
        loading: false
      }
    }));
  };

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
        // Use functional state update to access current prompts
        setPrompts(currentPrompts => {
          // Improved duplicate detection - less restrictive, more intelligent
          const recentPrompts = currentPrompts.slice(-4); // Check only last 4 (reduced from 6)
          const newLower = coaching.suggestion.toLowerCase().trim();
          
          // Only filter recent suggestions (last 2 minutes) to allow concept repetition over time
          const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
          const recentTimestamp = recentPrompts.filter(p => 
            new Date(p.timestamp).getTime() > twoMinutesAgo
          );
          
          const isDuplicate = recentTimestamp.some(existing => {
            const existingLower = existing.content.toLowerCase().trim();
            
            // Only block if very similar (more restrictive checks)
            const exactMatch = existingLower === newLower;
            
            // Require longer substring match (50 chars instead of 30)
            const longSubstringMatch = (newLower.length > 50 && existingLower.length > 50) &&
              (existingLower.includes(newLower.substring(0, 50)) || 
               newLower.includes(existingLower.substring(0, 50)));
            
            // Require 2+ shared key phrases instead of 1 (more restrictive)
            const keyPhrases = [
              'calibrated question', 'pain points', 'late-night fm', 'discovery question', 
              'mirroring technique', 'open-ended question', 'empathize deeply', 
              'reflect back', 'encourage elaboration', 'uncover hidden needs',
              'ask about budget', 'timeline discussion', 'decision maker'
            ];
            const sharedPhrases = keyPhrases.filter(phrase => 
              existingLower.includes(phrase) && newLower.includes(phrase)
            ).length;
            
            const multiPhraseMatch = sharedPhrases >= 2; // Require 2+ shared phrases
            
            // Much more restrictive - only block if exact match or very similar
            return exactMatch || longSubstringMatch || multiPhraseMatch;
          });
          
          // LED 702: Session history duplicate check
          trail.light(702, { 
            operation: 'improved_duplicate_check',
            is_duplicate: isDuplicate,
            total_prompts_count: currentPrompts.length,
            recent_prompts_count: recentPrompts.length,
            recent_timestamp_filtered: recentTimestamp.length,
            new_suggestion_preview: coaching.suggestion.substring(0, 50),
            method: 'time_based_filtering_with_relaxed_rules'
          });
          
          // Debug logging for testing
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 AI Suggestion Analysis:', {
              suggestion: coaching.suggestion,
              isDuplicate,
              recentPromptsCount: recentPrompts.length,
              timeFilteredCount: recentTimestamp.length,
              urgency: coaching.urgency
            });
          }
          
          if (!isDuplicate) {
            const newPrompt: CoachingPrompt = {
              id: `ollama-${timestamp}-${Math.random()}`,
              type: coaching.urgency === 'high' ? 'opportunity' : 
                    coaching.urgency === 'low' ? 'suggestion' : 'objection',
              title: `Contextual AI Coach: ${coaching.urgency.toUpperCase()} Priority`,
              content: coaching.suggestion,
              priority: coaching.urgency === 'high' ? 'high' : 
                       coaching.urgency === 'low' ? 'low' : 'medium',
              timestamp: new Date(timestamp),
              actionable: true,
              source: `AI Analysis (${coaching.model})`,
              next_action: coaching.next_action, // Add contextual action
              reasoning: coaching.reasoning // Add AI reasoning
            };
            
            // LED 703: Adding new prompt
            trail.light(703, { 
              operation: 'adding_new_ollama_prompt',
              prompt_id: newPrompt.id,
              priority: newPrompt.priority,
              content_preview: newPrompt.content.substring(0, 50)
            });
            
            console.log('📋 Adding Ollama coaching prompt:', newPrompt);
            return [newPrompt, ...currentPrompts]; // Add to top for latest first
          } else {
            // LED 704: Skipping duplicate
            trail.light(704, { 
              operation: 'skipping_duplicate_prompt',
              suggestion_preview: coaching.suggestion.substring(0, 30),
              reason: 'session_history_duplicate_detected'
            });
            console.log('🚫 Skipping duplicate Ollama prompt:', coaching.suggestion.substring(0, 50));
            return currentPrompts; // No change if duplicate
          }
        });
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
    <div className="glass-panel-scrollable h-full">
      <div className="p-4 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">AI Coaching Assistant</h3>
          <div className="flex items-center space-x-3">
            {isRecording && prompts.length > 0 && (
              <div className="text-sm text-slate-400">
                {prompts.filter(p => p.actionable).length} actionable insights
              </div>
            )}
            {prompts.length > 0 && (
              <button
                onClick={() => {
                  setPrompts([]);
                  onClearPrompts?.();
                }}
                className="text-slate-400 hover:text-white text-sm px-3 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 scrollable-content force-scrollbar p-4 space-y-4 min-scroll-content">
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
            className={`border-l-4 rounded-lg p-4 transition-all duration-200 animate-slide-up ${
              getPriorityColor(prompt.priority)
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                {getPromptIcon(prompt.type)}
                <div className="flex items-center space-x-2">
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
                  {prompt.actionable && (
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoreInfo(prompt);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center space-x-1"
                      >
                        <Info className="w-3 h-3" />
                        <span>More Info</span>
                      </button>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAskMode(prompt.id);
                        }}
                        className={`px-3 py-2 rounded text-sm font-medium transition-colors flex items-center space-x-1 ${
                          askMode[prompt.id]?.active 
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                            : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                        }`}
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Ask</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">
                  {prompt.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-slate-200 leading-relaxed">{prompt.content}</p>
              
              {/* Show source for AI-generated suggestions */}
              {prompt.source && (
                <div className="mt-2 flex items-center text-xs text-slate-400">
                  <Database className="w-3 h-3 mr-1" />
                  <span>Source: {prompt.source}</span>
                </div>
              )}

              {/* Show contextual next action if available */}
              {(prompt as any).next_action && (
                <div className="mt-3 p-2 bg-green-900/20 border border-green-600/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <ArrowRight className="w-3 h-3 text-green-400" />
                    <span className="text-xs font-medium text-green-400">Contextual Action</span>
                  </div>
                  <p className="text-sm text-green-200 italic">"{(prompt as any).next_action}"</p>
                </div>
              )}

              {/* Show reasoning if available */}
              {(prompt as any).reasoning && (
                <div className="mt-2 text-xs text-slate-400 italic">
                  💡 {(prompt as any).reasoning}
                </div>
              )}
            </div>


            {/* Expanded Info Section */}
            {expandedInfo[prompt.id] && (
              <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-600">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <h5 className="font-medium text-blue-400">📚 Coaching Guide</h5>
                    {(() => {
                      const cacheKey = generateCacheKey(prompt.content);
                      const cached = loadFromCache(cacheKey);
                      return cached ? (
                        <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded-full">
                          ⚡ Cached
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-400 rounded-full">
                          🔍 Live Search
                        </span>
                      );
                    })()}
                  </div>
                  <button
                    onClick={() => setExpandedInfo(prev => {
                      const newState = { ...prev };
                      delete newState[prompt.id];
                      return newState;
                    })}
                    className="text-slate-400 hover:text-white text-sm"
                  >
                    ✕ Close
                  </button>
                </div>
                
                {expandedInfo[prompt.id].loading ? (
                  <div className="flex items-center space-x-2 text-slate-400">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Building coaching knowledge base... (This will be cached for instant future access)</span>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto text-base text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {expandedInfo[prompt.id].content}
                  </div>
                )}
              </div>
            )}

            {/* Interactive Ask Section */}
            {askMode[prompt.id]?.active && (
              <div className="mt-4 p-4 bg-yellow-900/20 rounded-lg border border-yellow-600/30">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-yellow-400 flex items-center space-x-2">
                    <MessageCircle className="w-4 h-4" />
                    <span>Ask AI About This Suggestion</span>
                  </h5>
                  <button
                    onClick={() => toggleAskMode(prompt.id)}
                    className="text-slate-400 hover:text-white text-sm"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="e.g., 'What is a calibrated question?' or 'Give me examples I can use'"
                      value={askMode[prompt.id]?.question || ''}
                      onChange={(e) => setAskMode(prev => ({
                        ...prev,
                        [prompt.id]: { ...prev[prompt.id], question: e.target.value }
                      }))}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !askMode[prompt.id]?.loading) {
                          handleAskQuestion(prompt, askMode[prompt.id]?.question || '');
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-yellow-500 focus:outline-none"
                      disabled={askMode[prompt.id]?.loading}
                    />
                    <button
                      onClick={() => handleAskQuestion(prompt, askMode[prompt.id]?.question || '')}
                      disabled={askMode[prompt.id]?.loading || !askMode[prompt.id]?.question?.trim()}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg transition-colors flex items-center space-x-1"
                    >
                      {askMode[prompt.id]?.loading ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>{askMode[prompt.id]?.loading ? 'Asking...' : 'Ask'}</span>
                    </button>
                  </div>

                  {askMode[prompt.id]?.response && (
                    <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center">
                          <MessageCircle className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-yellow-400">AI Coach Response</span>
                      </div>
                      <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {askMode[prompt.id]?.response}
                      </div>
                    </div>
                  )}
                </div>
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

        {/* Add dummy content to guarantee scrollbar visibility when testing */}
        {process.env.NODE_ENV === 'development' && prompts.length === 0 && (
          <div className="text-xs text-slate-600 space-y-2 mt-8">
            <div className="p-2 bg-slate-800/30 rounded">Debug: Dummy content for scrollbar testing</div>
            <div className="p-2 bg-slate-800/30 rounded">This content ensures scrollbar appears during development</div>
            <div className="p-2 bg-slate-800/30 rounded">Remove this section in production builds</div>
            <div className="p-2 bg-slate-800/30 rounded">Scrollbar should be visible on the right →</div>
            <div className="p-2 bg-slate-800/30 rounded">Content continues below...</div>
            <div className="p-2 bg-slate-800/30 rounded">More testing content for scroll verification</div>
            <div className="p-2 bg-slate-800/30 rounded">Additional test content</div>
            <div className="p-2 bg-slate-800/30 rounded">Even more content to trigger overflow</div>
            <div className="p-2 bg-slate-800/30 rounded">Additional scrolling test content line 1</div>
            <div className="p-2 bg-slate-800/30 rounded">Additional scrolling test content line 2</div>
            <div className="p-2 bg-slate-800/30 rounded">Additional scrolling test content line 3</div>
            <div className="p-2 bg-slate-800/30 rounded">Additional scrolling test content line 4</div>
            <div className="p-2 bg-slate-800/30 rounded">Additional scrolling test content line 5</div>
            <div className="p-2 bg-slate-800/30 rounded">Additional scrolling test content line 6</div>
            <div className="p-2 bg-slate-800/30 rounded">Additional scrolling test content line 7</div>
            <div className="p-2 bg-slate-800/30 rounded">Additional scrolling test content line 8</div>
            <div className="p-2 bg-slate-800/30 rounded">Additional scrolling test content line 9</div>
            <div className="p-2 bg-slate-800/30 rounded">Additional scrolling test content line 10</div>
            <div className="p-2 bg-slate-800/30 rounded">Additional scrolling test content line 11</div>
            <div className="p-2 bg-slate-800/30 rounded">Additional scrolling test content line 12</div>
            <div className="p-2 bg-slate-800/30 rounded">Final test content block - scrolling should work!</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CoachingPrompts;