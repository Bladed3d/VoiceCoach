/**
 * VoiceCoach V2 - Customization Chat Component
 * Claude-powered conversational interface for sales team customization
 * LED Range: 7500-7550 (UI Customization)
 */

import React, { useState, useEffect, useRef } from 'react';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { customizationService } from '../../services/customization/CustomizationService-Browser';
import './CustomizationChat.css';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

interface CustomizationChatProps {
  onComplete?: () => void;
  onClose?: () => void;
}

export const CustomizationChat: React.FC<CustomizationChatProps> = ({ 
  onComplete, 
  onClose 
}) => {
  const trail = new BreadcrumbTrail('CustomizationChat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // LED 7500: Customization chat initialized
    trail.light(7500, {
      operation: 'customization_chat_init',
      timestamp: Date.now()
    });

    // Start with Claude's greeting
    const greeting: Message = {
      role: 'assistant',
      content: "Hi! I'll help customize VoiceCoach for your sales team. This takes about 10-15 minutes. Let's start with the basics - what product or service does your team sell?",
      timestamp: new Date()
    };
    setMessages([greeting]);

    return () => {
      // LED 7501: Customization chat closed
      trail.light(7501, {
        operation: 'customization_chat_closed',
        progress_completed: progress,
        timestamp: Date.now()
      });
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing) return;

    // LED 7502: User message sent
    trail.light(7502, {
      operation: 'user_customization_input',
      message_length: inputValue.length,
      timestamp: Date.now()
    });

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      // LED 7503: Processing customization request
      trail.light(7503, {
        operation: 'processing_customization',
        timestamp: Date.now()
      });

      // Send to customization service
      const response = await customizationService.handleUserResponse(inputValue);
      
      // LED 7504: Configuration updated
      trail.light(7504, {
        operation: 'configuration_updated',
        updates_made: response.configUpdates?.length || 0,
        progress: response.progress,
        timestamp: Date.now()
      });

      // Add Claude's response
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setProgress(response.progress);

      // Check if customization is complete
      if (response.isComplete) {
        // LED 7505: Customization completed
        trail.light(7505, {
          operation: 'customization_complete',
          total_messages: messages.length + 2,
          timestamp: Date.now()
        });

        setTimeout(() => {
          onComplete?.();
        }, 2000);
      }

    } catch (error) {
      // LED 8750: Customization error
      trail.fail(8750, error as Error);
      
      const errorMessage: Message = {
        role: 'assistant',
        content: "I encountered an issue with that. Let's try a different approach. Could you rephrase that or provide more details?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="customization-chat">
      <div className="chat-header">
        <h3>🎯 Customize VoiceCoach for Your Team</h3>
        {onClose && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      </div>

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`message ${msg.role}`}
          >
            <div className="message-header">
              <span className="role">
                {msg.role === 'assistant' ? '🤖 Claude' : '👤 You'}
              </span>
              <span className="timestamp">
                {formatTime(msg.timestamp)}
              </span>
            </div>
            <div className="message-content">
              {msg.content}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="message assistant processing">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your answer..."
          disabled={isProcessing}
          rows={2}
        />
        <button 
          onClick={handleSend} 
          disabled={!inputValue.trim() || isProcessing}
          className="send-btn"
        >
          {isProcessing ? '⏳' : '➤'} Send
        </button>
      </div>

      <div className="progress-bar">
        <div className="progress-label">
          Configuration Progress: {Math.round(progress)}%
        </div>
        <div className="progress-track">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {progress === 100 && (
        <div className="completion-message">
          ✅ Customization complete! Your coaching system is now configured for your team.
        </div>
      )}
    </div>
  );
};