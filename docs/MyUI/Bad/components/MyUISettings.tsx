/**
 * MyUISettings - Configuration Component
 * Manages API keys and MyUI interface settings
 */

import React, { useState, useCallback } from 'react';
import { MyUIConfig, AIModel } from '../types/myui.types';
import { breadcrumb } from '../../../src/lib/breadcrumbs';
import './MyUISettings.css';

interface MyUISettingsProps {
  config: MyUIConfig;
  models: AIModel[];
  onConfigUpdate: (config: Partial<MyUIConfig>) => void;
  onSaveApiKeys: (keys: Record<string, string>) => Promise<void>;
  onClose: () => void;
}

const MyUISettings: React.FC<MyUISettingsProps> = ({
  config,
  models,
  onConfigUpdate,
  onSaveApiKeys,
  onClose
}) => {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    anthropic: '',
    openai: '',
    deepseek: '',
    xai: '',
    google: '',
    mistral: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleApiKeyChange = useCallback((provider: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: value
    }));
  }, []);

  const handleSaveApiKeys = useCallback(async () => {
    breadcrumb(7300, 'Saving API keys from settings');
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // Filter out empty keys
      const keysToSave = Object.entries(apiKeys)
        .filter(([_, value]) => value.trim() !== '')
        .reduce((acc, [key, value]) => {
          acc[key] = value.trim();
          return acc;
        }, {} as Record<string, string>);

      await onSaveApiKeys(keysToSave);
      setSaveStatus('success');
      breadcrumb(7301, 'API keys saved successfully');

      // Clear the form after successful save
      setTimeout(() => {
        setApiKeys({
          anthropic: '',
          openai: '',
          deepseek: '',
          xai: '',
          google: '',
          mistral: ''
        });
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Failed to save API keys:', error);
      setSaveStatus('error');
      breadcrumb(7302, `Failed to save API keys: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [apiKeys, onSaveApiKeys]);

  const handleConfigChange = useCallback((key: keyof MyUIConfig, value: any) => {
    onConfigUpdate({ [key]: value });
  }, [onConfigUpdate]);

  const getProviderInfo = (provider: string) => {
    const info = {
      anthropic: {
        name: 'Anthropic (Claude)',
        placeholder: 'sk-ant-api03-...',
        url: 'https://console.anthropic.com/account/keys'
      },
      openai: {
        name: 'OpenAI (GPT)',
        placeholder: 'sk-...',
        url: 'https://platform.openai.com/api-keys'
      },
      deepseek: {
        name: 'DeepSeek',
        placeholder: 'sk-...',
        url: 'https://platform.deepseek.com/api_keys'
      },
      xai: {
        name: 'xAI (Grok)',
        placeholder: 'xai-...',
        url: 'https://console.x.ai'
      },
      google: {
        name: 'Google (Gemini)',
        placeholder: 'AI...',
        url: 'https://aistudio.google.com/app/apikey'
      },
      mistral: {
        name: 'Mistral',
        placeholder: '...',
        url: 'https://console.mistral.ai/api-keys'
      }
    };
    return info[provider as keyof typeof info];
  };

  return (
    <div className="myui-settings-overlay">
      <div className="myui-settings-modal">
        <div className="settings-header">
          <h2>⚙️ MyUI Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          
          {/* General Settings */}
          <div className="settings-section">
            <h3>General Settings</h3>
            
            <div className="setting-item">
              <label>Default Panel Count</label>
              <select
                value={config.panelCount}
                onChange={(e) => handleConfigChange('panelCount', parseInt(e.target.value))}
              >
                <option value={4}>4 Panels</option>
                <option value={6}>6 Panels</option>
              </select>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={config.autoSynthesize}
                  onChange={(e) => handleConfigChange('autoSynthesize', e.target.checked)}
                />
                Auto-synthesize responses
              </label>
              <div className="setting-description">
                Automatically generate synthesis after queries complete
              </div>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={config.contextRetention}
                  onChange={(e) => handleConfigChange('contextRetention', e.target.checked)}
                />
                Include project context in queries
              </label>
              <div className="setting-description">
                Include codebase summary and context in AI queries
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="settings-section">
            <h3>API Keys</h3>
            <div className="api-keys-note">
              <strong>🔒 Security Note:</strong> API keys are encrypted and stored locally. They never leave your device.
            </div>

            {Object.keys(apiKeys).map(provider => {
              const providerInfo = getProviderInfo(provider);
              if (!providerInfo) return null;

              return (
                <div key={provider} className="api-key-item">
                  <div className="api-key-header">
                    <label>{providerInfo.name}</label>
                    <a 
                      href={providerInfo.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="get-key-link"
                    >
                      Get API Key ↗
                    </a>
                  </div>
                  <input
                    type="password"
                    placeholder={providerInfo.placeholder}
                    value={apiKeys[provider]}
                    onChange={(e) => handleApiKeyChange(provider, e.target.value)}
                    className="api-key-input"
                  />
                </div>
              );
            })}

            <div className="api-keys-actions">
              <button
                onClick={handleSaveApiKeys}
                disabled={isSaving || Object.values(apiKeys).every(key => key.trim() === '')}
                className="save-keys-btn"
              >
                {isSaving ? (
                  <>
                    <div className="btn-spinner" />
                    Saving...
                  </>
                ) : (
                  '💾 Save API Keys'
                )}
              </button>

              {saveStatus === 'success' && (
                <div className="save-status success">
                  ✅ API keys saved successfully!
                </div>
              )}

              {saveStatus === 'error' && (
                <div className="save-status error">
                  ❌ Failed to save API keys
                </div>
              )}
            </div>
          </div>

          {/* Model Configuration */}
          <div className="settings-section">
            <h3>Model Configuration</h3>
            <div className="models-grid">
              {models.map(model => (
                <div key={model.id} className="model-config-item">
                  <div className="model-info">
                    <span className="model-name">{model.name}</span>
                    <span className={`model-cost ${model.cost}`}>{model.cost}</span>
                  </div>
                  <label className="model-toggle">
                    <input
                      type="checkbox"
                      checked={model.enabled}
                      onChange={(e) => {
                        // This would require a callback to update model state
                        // For now, just show the UI
                      }}
                      disabled
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Usage Guidelines */}
          <div className="settings-section">
            <h3>💡 Usage Tips</h3>
            <div className="usage-tips">
              <div className="tip">
                <strong>Cheap Models (DeepSeek):</strong> Great for initial exploration, code reviews, and simple questions. Very cost-effective.
              </div>
              <div className="tip">
                <strong>Premium Models (Claude):</strong> Best for complex analysis, architecture decisions, and synthesis. Use for final recommendations.
              </div>
              <div className="tip">
                <strong>Context Management:</strong> Update project context regularly to ensure AI models understand your codebase structure.
              </div>
              <div className="tip">
                <strong>Panel Layout:</strong> Use 4 panels for focused comparison, 6 panels for broader perspective on complex topics.
              </div>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button onClick={onClose} className="done-btn">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyUISettings;