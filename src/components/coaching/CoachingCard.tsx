/**
 * VoiceCoach V2 - Enhanced Coaching Card Component
 * Replicates the old app's rich UI with all interactive features
 * LED Range: 7300-7399 for coaching card operations
 */
import React, { useState } from 'react';
import { 
  Lightbulb, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Info, 
  MessageCircle, 
  Send, 
  Loader,
  Database,
  Copy,
  Check,
  X
} from 'lucide-react';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { CoachingPrompt } from '../../types/coaching';

interface EnhancedCoachingPrompt extends CoachingPrompt {
  type?: 'suggestion' | 'objection' | 'opportunity' | 'warning' | 'milestone';
  source?: string;
  confidence?: number;
  next_action?: string;
  reasoning?: string;
  content?: string; // Full content (can be longer than text)
}

interface CoachingCardProps {
  prompt: EnhancedCoachingPrompt;
  index: number;
  totalCount: number;
  onUsed?: (promptId: string) => void;
  onDismissed?: (promptId: string) => void;
  onCopy?: (text: string) => void;
  stageId?: string;
}

// Coaching knowledge cache structure
interface CoachingKnowledge {
  definition: string;
  executionSteps: string;
  timestamp: number;
  searchTerms: string[];
}

export const CoachingCard: React.FC<CoachingCardProps> = ({
  prompt,
  index,
  totalCount,
  onUsed,
  onDismissed,
  onCopy,
  stageId
}) => {
  const trail = new BreadcrumbTrail('CoachingCard');
  const [expandedInfo, setExpandedInfo] = useState<{ content: string; loading: boolean } | null>(null);
  const [askMode, setAskMode] = useState<{ active: boolean; question: string; response: string; loading: boolean }>({
    active: false,
    question: '',
    response: '',
    loading: false
  });
  const [copied, setCopied] = useState(false);

  // Generate cache key for coaching concepts
  const generateCacheKey = (concept: string): string => {
    return concept.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  };

  // Load from cache
  const loadFromCache = (cacheKey: string): CoachingKnowledge | null => {
    try {
      const cached = localStorage.getItem(`coaching_cache_${cacheKey}`);
      if (cached) {
        return JSON.parse(cached);
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
      trail.light(7301, { operation: 'cache_saved', cacheKey });
    } catch (error) {
      trail.fail(8301, error as Error);
    }
  };

  // Get prompt icon based on type
  const getPromptIcon = () => {
    const type = prompt.type || 'suggestion';
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
      default:
        return <Lightbulb className="w-5 h-5 text-primary-400" />;
    }
  };

  // Get priority color for border and background
  const getPriorityColor = () => {
    switch (prompt.priority) {
      case 'critical':
        return 'border-l-red-400 bg-red-900/20';
      case 'high':
        return 'border-l-danger-400 bg-danger-900/20';
      case 'medium':
        return 'border-l-warning-400 bg-warning-900/20';
      case 'low':
        return 'border-l-primary-400 bg-primary-900/20';
      default:
        return 'border-l-primary-400 bg-primary-900/20';
    }
  };

  // Get priority badge color
  const getPriorityBadge = () => {
    switch (prompt.priority) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-danger-600 text-white';
      case 'medium':
        return 'bg-warning-600 text-white';
      case 'low':
        return 'bg-slate-600 text-slate-300';
      default:
        return 'bg-slate-600 text-slate-300';
    }
  };

  // Get short actionable title from prompt (like old app)
  const getShortTitle = (text: string): string => {
    // Extract action-oriented title
    if (text.toLowerCase().includes('mirror')) return 'Use Mirroring';
    if (text.toLowerCase().includes('label')) return 'Label The Emotion';
    if (text.toLowerCase().includes('ask')) return 'Ask Discovery Question';
    if (text.toLowerCase().includes('empathy')) return 'Show Empathy';
    if (text.toLowerCase().includes('budget')) return 'Address Budget Concern';
    if (text.toLowerCase().includes('trust')) return 'Build Trust';
    if (text.toLowerCase().includes('close')) return 'Move To Close';
    if (text.toLowerCase().includes('pain')) return 'Explore Pain Point';
    if (text.toLowerCase().includes('discovery')) return 'Discovery Question';
    if (text.toLowerCase().includes('objection')) return 'Handle Objection';
    
    // Default: extract verb phrase if possible
    const words = text.split(' ').slice(0, 3);
    return words.join(' ');
  };

  // Format content to be concise like old app
  const formatContent = (text: string): string => {
    const content = prompt.content || text;
    
    // For mirroring/labeling, format as concise instruction
    if (content.toLowerCase().includes('mirror')) {
      const match = content.match(/'([^']+)'/);
      if (match) return `Mirror: "${match[1]}?"`;
    }
    
    if (content.toLowerCase().includes('label')) {
      const match = content.match(/["']([^"']+)["']/);
      if (match) return `Label: "It sounds like you're ${match[1]}"`;
    }
    
    // For short prompts, return as-is
    if (content.length <= 80) {
      return content;
    }
    
    // For longer content, extract core instruction
    const sentences = content.split(/[.!?]/);
    return sentences[0].trim() + '.';
  };

  // Handle More Info button
  const handleMoreInfo = async () => {
    trail.light(7310, { operation: 'more_info_clicked', promptId: String(prompt.id) });
    
    const coreConceptMatch = prompt.text.match(/\b(open-ended questions?|calibrated questions?|mirroring|rapport building|discovery questions?|pain points?|objection handling|closing techniques?)/i);
    const coreConcept = coreConceptMatch ? coreConceptMatch[0] : prompt.text.split(' ').slice(0, 3).join(' ');
    const cacheKey = generateCacheKey(coreConcept);
    
    // Try cache first
    const cachedKnowledge = loadFromCache(cacheKey);
    
    if (cachedKnowledge) {
      trail.light(7311, { operation: 'loaded_from_cache', cacheKey });
      const formattedContent = `## 📖 Definition
${cachedKnowledge.definition}

## 🎯 How to Execute
${cachedKnowledge.executionSteps}`;
      
      setExpandedInfo({ content: formattedContent, loading: false });
      return;
    }
    
    // Not in cache - fetch from Ollama
    setExpandedInfo({ content: '', loading: true });
    
    try {
      // DISABLED: Remove all fallback Ollama calls to force proper pipeline usage
      throw new Error('FALLBACK DISABLED: CoachingCard Ollama calls removed - must use proper transcript pipeline');
    } catch (error) {
      trail.fail(8310, error as Error);
      setExpandedInfo({ 
        content: 'Failed to load detailed guidance. Please ensure Ollama is running and try again.', 
        loading: false 
      });
    }
  };

  // Handle Ask button
  const handleAskQuestion = async () => {
    if (!askMode.question.trim()) return;
    
    trail.light(7320, { operation: 'ask_question', promptId: String(prompt.id), question: askMode.question });
    
    setAskMode(prev => ({ ...prev, loading: true, response: '' }));
    
    try {
      // DISABLED: Remove all fallback Ollama calls to force proper pipeline usage
      throw new Error('FALLBACK DISABLED: CoachingCard Ask feature removed - must use proper transcript pipeline');
    } catch (error) {
      trail.fail(8320, error as Error);
      setAskMode(prev => ({ 
        ...prev, 
        response: 'Sorry, I couldn\'t process your question. Please ensure Ollama is running and try again.', 
        loading: false 
      }));
    }
  };

  // Handle copy
  const handleCopy = () => {
    const textToCopy = prompt.content || prompt.text;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.(textToCopy);
    trail.light(7330, { operation: 'text_copied', promptId: String(prompt.id) });
  };

  return (
    <div className={`border-l-4 rounded-lg p-4 transition-all duration-200 animate-slide-up ${getPriorityColor()}`}>
      {/* Header Section with inline buttons */}
      <div className="mb-3">
        {/* Top row: Icon, Title, and inline More Info/Ask buttons */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3 flex-1">
            {getPromptIcon()}
            <h4 className="font-medium text-white text-lg">
              {stageId && (
                <span className="text-xs font-mono text-primary-400 mr-2">
                  {stageId}
                </span>
              )}
              {getShortTitle(prompt.text)}
            </h4>
          </div>
          
          {/* More Info and Ask buttons inline with title */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleMoreInfo}
              className="text-xs px-3 py-1 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded transition-colors"
            >
              More Info
            </button>
            <button 
              onClick={() => setAskMode(prev => ({ ...prev, active: !prev.active }))}
              className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
            >
              Ask
            </button>
          </div>
        </div>
        
        {/* Second row: Priority badge and timestamp */}
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge()}`}>
            {prompt.priority === 'critical' ? '🚨 CRITICAL' : 
             prompt.priority === 'high' ? '⚠️ HIGH' : 
             prompt.priority === 'medium' ? '⚡ MEDIUM' :
             '💡 STANDARD'}
          </span>
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>#{totalCount - index}</span>
            <span>{new Date(prompt.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mb-3">
        <p className="text-slate-200 leading-relaxed">
          {formatContent(prompt.text)}
        </p>
        
        {/* Source if available */}
        {prompt.source && (
          <div className="mt-2 flex items-center text-xs text-slate-400">
            <Database className="w-3 h-3 mr-1" />
            <span>Source: {prompt.source}</span>
            {prompt.confidence && (
              <span className="ml-2">• Confidence: {Math.round(prompt.confidence * 100)}%</span>
            )}
          </div>
        )}

        {/* Contextual Next Action (Green Box) */}
        {prompt.next_action && (
          <div className="mt-3 p-2 bg-green-900/20 border border-green-600/30 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <ArrowRight className="w-3 h-3 text-green-400" />
              <span className="text-xs font-medium text-green-400">Contextual Action</span>
            </div>
            <p className="text-sm text-green-200 italic">"{prompt.next_action}"</p>
          </div>
        )}

        {/* AI Reasoning (Italic) */}
        {prompt.reasoning && (
          <div className="mt-2 text-xs text-slate-400 italic">
            💭 {prompt.reasoning}
          </div>
        )}
      </div>

      {/* Action Buttons - Copy, Used, Dismiss */}
      <div className="flex flex-wrap gap-2">
        <button 
          onClick={handleCopy}
          className="bg-success-600 hover:bg-success-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center space-x-1"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>

        <button 
          onClick={() => onUsed?.(String(prompt.id))}
          className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center space-x-1"
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>Used</span>
        </button>

        <button 
          onClick={() => onDismissed?.(String(prompt.id))}
          className="bg-neutral-600 hover:bg-neutral-700 text-neutral-200 px-3 py-2 rounded text-sm font-medium transition-colors flex items-center space-x-1"
        >
          <X className="w-3 h-3" />
          <span>Dismiss</span>
        </button>
      </div>

      {/* Expanded Info Section */}
      {expandedInfo && (
        <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <h5 className="font-medium text-blue-400">📚 Coaching Guide</h5>
              {(() => {
                const cacheKey = generateCacheKey(prompt.text);
                const cached = loadFromCache(cacheKey);
                return cached ? (
                  <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded-full">
                    ⚡ Cached
                  </span>
                ) : expandedInfo.loading ? (
                  <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-400 rounded-full">
                    🔍 Loading...
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-400 rounded-full">
                    🔍 Live Search
                  </span>
                );
              })()}
            </div>
            <button
              onClick={() => setExpandedInfo(null)}
              className="text-slate-400 hover:text-white text-sm"
            >
              ✕ Close
            </button>
          </div>
          
          {expandedInfo.loading ? (
            <div className="flex items-center space-x-2 text-slate-400">
              <Loader className="w-4 h-4 animate-spin" />
              <span>Building coaching knowledge base... (This will be cached for instant future access)</span>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto text-base text-slate-300 leading-relaxed whitespace-pre-wrap">
              {expandedInfo.content}
            </div>
          )}
        </div>
      )}

      {/* Interactive Ask Section */}
      {askMode.active && (
        <div className="mt-4 p-4 bg-yellow-900/20 rounded-lg border border-yellow-600/30">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-medium text-yellow-400 flex items-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <span>Ask AI About This Suggestion</span>
            </h5>
            <button
              onClick={() => setAskMode(prev => ({ ...prev, active: false }))}
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
                value={askMode.question}
                onChange={(e) => setAskMode(prev => ({ ...prev, question: e.target.value }))}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !askMode.loading) {
                    handleAskQuestion();
                  }
                }}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-yellow-500 focus:outline-none"
                disabled={askMode.loading}
              />
              <button
                onClick={handleAskQuestion}
                disabled={askMode.loading || !askMode.question.trim()}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg transition-colors flex items-center space-x-1"
              >
                {askMode.loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{askMode.loading ? 'Asking...' : 'Ask'}</span>
              </button>
            </div>

            {askMode.response && (
              <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm font-medium text-yellow-400">AI Coach Response</span>
                </div>
                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {askMode.response}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};