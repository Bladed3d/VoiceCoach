/**
 * MyUI - Multi-AI Interface Component
 * Custom coding interface for parallel AI model querying
 */

import React, { useState, useCallback } from 'react';
import { useMultiAI } from '../hooks/useMultiAI';
import { AIModelResponse } from '../types/myui.types';
import { breadcrumb } from '../../../src/lib/breadcrumbs';
import './MyUI.css';

const MyUI: React.FC = () => {
  const {
    models,
    currentQuery,
    isQuerying,
    isSynthesizing,
    projectContext,
    config,
    error,
    queryMultipleModels,
    synthesizeResponses,
    updateProjectContext,
    updateConfig,
    clearError,
    clearCurrentQuery
  } = useMultiAI();

  const [prompt, setPrompt] = useState('');
  const [panelCount, setPanelCount] = useState(config.panelCount);
  const [synthesisModel, setSynthesisModel] = useState('claude-3.5-sonnet');

  const handleQuerySubmit = useCallback(async () => {
    if (!prompt.trim()) return;
    
    breadcrumb(7200, 'Submitting multi-AI query from UI');
    await queryMultipleModels(prompt, panelCount);
  }, [prompt, panelCount, queryMultipleModels]);

  const handleSynthesize = useCallback(async () => {
    if (!currentQuery) return;
    
    breadcrumb(7201, 'Triggering response synthesis from UI');
    await synthesizeResponses(synthesisModel);
  }, [currentQuery, synthesisModel, synthesizeResponses]);

  const handleUpdateContext = useCallback(async () => {
    breadcrumb(7202, 'Updating project context from UI');
    await updateProjectContext();
  }, [updateProjectContext]);

  const handlePanelCountChange = useCallback((newCount: number) => {
    setPanelCount(newCount);
    updateConfig({ panelCount: newCount });
  }, [updateConfig]);

  const formatLatency = (latency: number): string => {
    return `${Math.round(latency)}ms`;
  };

  const getModelStatusColor = (response: AIModelResponse): string => {
    if (response.error) return '#ff4444';
    if (response.latency > 5000) return '#ffaa00';
    return '#44ff44';
  };

  return (
    <div className="myui-container">
      {/* Header */}
      <div className="myui-header">
        <h1>MyUI - Multi-AI Coding Interface</h1>
        <div className="myui-status">
          {isQuerying && <span className="status-indicator querying">Querying...</span>}
          {isSynthesizing && <span className="status-indicator synthesizing">Synthesizing...</span>}
          {error && (
            <div className="error-banner">
              <span>{error}</span>
              <button onClick={clearError} className="error-close">×</button>
            </div>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="myui-main-layout">
        
        {/* Left Content Area - AI Response Panels */}
        <div className="myui-content-area">
          
          {/* Control Bar */}
          <div className="myui-controls">
            <div className="control-group">
              <label>Panels:</label>
              <select 
                value={panelCount} 
                onChange={(e) => handlePanelCountChange(parseInt(e.target.value))}
                disabled={isQuerying}
              >
                <option value={4}>4 Panels</option>
                <option value={6}>6 Panels</option>
              </select>
            </div>

            <div className="control-group">
              <label>Synthesis Model:</label>
              <select 
                value={synthesisModel} 
                onChange={(e) => setSynthesisModel(e.target.value)}
                disabled={isSynthesizing}
              >
                <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="deepseek-chat">DeepSeek Chat</option>
              </select>
            </div>

            <button 
              onClick={handleUpdateContext}
              className="context-update-btn"
              title="Scan project and update context"
            >
              🔄 Update Context
            </button>

            {currentQuery && (
              <button 
                onClick={clearCurrentQuery}
                className="clear-btn"
                title="Clear current results"
              >
                🗑️ Clear
              </button>
            )}
          </div>

          {/* AI Response Panels Grid */}
          <div className={`myui-panels-grid panels-${panelCount}`}>
            {currentQuery?.responses.map((response, index) => (
              <div key={index} className="ai-response-panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <span className="panel-number">#{index + 1}</span>
                    <span className="model-name">{response.modelName}</span>
                  </div>
                  <div className="panel-meta">
                    <span 
                      className="status-dot" 
                      style={{ backgroundColor: getModelStatusColor(response) }}
                    />
                    <span className="latency">{formatLatency(response.latency)}</span>
                  </div>
                </div>
                
                <div className="panel-content">
                  {response.error ? (
                    <div className="error-content">
                      <div className="error-icon">⚠️</div>
                      <div className="error-message">{response.error}</div>
                    </div>
                  ) : (
                    <pre className="response-text">{response.response}</pre>
                  )}
                </div>
              </div>
            ))}

            {/* Empty panels when no query */}
            {!currentQuery && Array.from({ length: panelCount }).map((_, index) => (
              <div key={index} className="ai-response-panel empty">
                <div className="panel-header">
                  <div className="panel-title">
                    <span className="panel-number">#{index + 1}</span>
                    <span className="model-name">Ready</span>
                  </div>
                </div>
                <div className="panel-content empty-content">
                  <div className="empty-message">
                    Enter a prompt and click "Query AIs" to see responses here
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Synthesis Section - Bottom Window */}
          {currentQuery && (
            <div className="myui-synthesis-section">
              <div className="synthesis-header">
                <h3>🔬 Synthesis & Comparison</h3>
                <button 
                  onClick={handleSynthesize}
                  disabled={isSynthesizing}
                  className="synthesize-btn"
                >
                  {isSynthesizing ? 'Synthesizing...' : 'Re-synthesize'}
                </button>
              </div>
              
              <div className="synthesis-content">
                {currentQuery.synthesis ? (
                  <pre className="synthesis-text">{currentQuery.synthesis}</pre>
                ) : isSynthesizing ? (
                  <div className="synthesis-loading">
                    <div className="loading-spinner" />
                    <span>Analyzing responses and generating synthesis...</span>
                  </div>
                ) : (
                  <div className="synthesis-placeholder">
                    Click "Re-synthesize" to generate a comprehensive analysis of all responses
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Prompt Input */}
        <div className="myui-prompt-sidebar">
          <div className="prompt-section">
            <div className="prompt-header">
              <h3>💭 Prompt Input</h3>
              {projectContext && (
                <div className="context-info">
                  <span className="context-indicator">📁 Context Active</span>
                  <span className="context-date">
                    {new Date(projectContext.lastUpdated).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <textarea
              className="prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your coding question, PRD, or objective here...

Examples:
- Implement user authentication with JWT
- Optimize this React component for performance  
- Design a database schema for e-commerce
- Review this code for security vulnerabilities
- Create a deployment pipeline for this app"
              disabled={isQuerying}
            />

            <button
              className="query-btn"
              onClick={handleQuerySubmit}
              disabled={isQuerying || !prompt.trim()}
            >
              {isQuerying ? (
                <>
                  <div className="btn-spinner" />
                  Querying {panelCount} AIs...
                </>
              ) : (
                <>
                  🚀 Query {panelCount} AIs
                </>
              )}
            </button>

            {/* Query History */}
            {currentQuery && (
              <div className="query-info">
                <div className="query-timestamp">
                  Last query: {new Date(currentQuery.timestamp).toLocaleTimeString()}
                </div>
                <div className="query-preview">
                  "{currentQuery.prompt.substring(0, 60)}..."
                </div>
              </div>
            )}
          </div>

          {/* Project Context Display */}
          {projectContext && (
            <div className="context-section">
              <h4>📋 Project Context</h4>
              <div className="context-summary">
                <div className="context-item">
                  <strong>Files:</strong> {projectContext.codebaseIndex?.files.length || 0}
                </div>
                <div className="context-item">
                  <strong>Components:</strong> {projectContext.codebaseIndex?.keyComponents.slice(0, 3).join(', ')}
                  {(projectContext.codebaseIndex?.keyComponents.length || 0) > 3 && '...'}
                </div>
              </div>
            </div>
          )}

          {/* Model Status */}
          <div className="models-section">
            <h4>🤖 Available Models</h4>
            <div className="models-list">
              {models.slice(0, panelCount).map((model, index) => (
                <div key={model.id} className="model-item">
                  <span className="model-name">{model.name}</span>
                  <span className={`model-cost ${model.cost}`}>{model.cost}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyUI;