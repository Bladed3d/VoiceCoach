/**
 * VoiceCoach V2 - Ollama System Toggle Component
 * Allows runtime switching between old and enhanced Ollama systems
 */
import React, { useState, useEffect } from 'react';
import { Settings2, Sparkles, AlertCircle } from 'lucide-react';

interface OllamaSystemToggleProps {
  className?: string;
}

export const OllamaSystemToggle: React.FC<OllamaSystemToggleProps> = ({ className = '' }) => {
  const [useEnhanced, setUseEnhanced] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  useEffect(() => {
    // Check current system from localStorage
    const savedPreference = localStorage.getItem('voicecoach_use_enhanced_ollama');
    setUseEnhanced(savedPreference === 'true');
  }, []);
  
  const handleToggle = () => {
    const newValue = !useEnhanced;
    setUseEnhanced(newValue);
    
    // Save to localStorage
    localStorage.setItem('voicecoach_use_enhanced_ollama', newValue.toString());
    
    // Show notification
    const message = newValue 
      ? '✨ Enhanced Ollama system activated (Rich context + 11 response fields)'
      : '📦 Original Ollama system activated (Basic context + 6 response fields)';
    
    console.log(message);
    
    // You could also show a toast notification here
    if (window.electronAPI?.showNotification) {
      window.electronAPI.showNotification({
        title: 'Ollama System Changed',
        body: message
      });
    }
  };
  
  return (
    <div className={`ollama-system-toggle ${className}`}>
      <div className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-lg">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <Settings2 className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-200">
              Ollama Coaching System
            </span>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="ml-2 text-slate-500 hover:text-slate-300"
            >
              <AlertCircle className="w-3 h-3" />
            </button>
          </div>
          
          <div className="mt-1 text-xs text-slate-400">
            {useEnhanced ? (
              <span className="flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                <span>Enhanced (Old VoiceCoach Quality)</span>
              </span>
            ) : (
              <span>Original (Current V2)</span>
            )}
          </div>
        </div>
        
        <button
          onClick={handleToggle}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${useEnhanced ? 'bg-primary-600' : 'bg-slate-600'}
          `}
        >
          <span className="sr-only">Toggle Ollama system</span>
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${useEnhanced ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
      
      {showInfo && (
        <div className="mt-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
          <div className="text-xs space-y-2">
            <div>
              <strong className="text-primary-400">Enhanced System:</strong>
              <ul className="mt-1 ml-4 space-y-1 text-slate-400">
                <li>• Sales stage detection (discovery/demo/closing)</li>
                <li>• Call duration tracking</li>
                <li>• Buying signal detection</li>
                <li>• 11 comprehensive response fields</li>
                <li>• Next actions & fallback options</li>
              </ul>
            </div>
            
            <div className="mt-3">
              <strong className="text-slate-400">Original System:</strong>
              <ul className="mt-1 ml-4 space-y-1 text-slate-500">
                <li>• Basic transcript analysis</li>
                <li>• 6 response fields</li>
                <li>• Single suggestion only</li>
              </ul>
            </div>
            
            <div className="mt-3 pt-2 border-t border-slate-700">
              <p className="text-slate-400">
                💡 Try both systems to compare effectiveness. 
                The enhanced system replicates the successful patterns from the old VoiceCoach.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OllamaSystemToggle;