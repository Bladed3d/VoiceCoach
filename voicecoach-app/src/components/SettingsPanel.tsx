import { useState } from "react";
import { X, Mic, Volume2, Brain, Database, Shield } from "lucide-react";

interface SettingsPanelProps {
  onClose: () => void;
  appState: {
    isRecording: boolean;
    isConnected: boolean;
    currentCall: any;
    audioLevels: any;
  };
}

function SettingsPanel({ onClose, appState }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'audio' | 'ai' | 'privacy' | 'about'>('audio');
  const [settings, setSettings] = useState({
    audioInput: 'default',
    audioOutput: 'default',
    micSensitivity: 75,
    noiseSuppression: true,
    aiModel: 'gpt-4',
    responseSpeed: 'balanced',
    coachingStyle: 'supportive',
    dataRetention: '30days',
    analytics: true,
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold">VoiceCoach Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1">
          {/* Sidebar Navigation */}
          <div className="w-64 border-r border-slate-700 p-6">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('audio')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === 'audio' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Mic className="w-5 h-5" />
                <span>Audio & Recording</span>
              </button>

              <button
                onClick={() => setActiveTab('ai')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === 'ai' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Brain className="w-5 h-5" />
                <span>AI Configuration</span>
              </button>

              <button
                onClick={() => setActiveTab('privacy')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === 'privacy' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Shield className="w-5 h-5" />
                <span>Privacy & Data</span>
              </button>

              <button
                onClick={() => setActiveTab('about')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === 'about' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Database className="w-5 h-5" />
                <span>About</span>
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'audio' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Audio Configuration</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Microphone Input</label>
                      <select
                        value={settings.audioInput}
                        onChange={(e) => handleSettingChange('audioInput', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="default">System Default</option>
                        <option value="usb">USB Headset</option>
                        <option value="bluetooth">Bluetooth Device</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Microphone Sensitivity: {settings.micSensitivity}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.micSensitivity}
                        onChange={(e) => handleSettingChange('micSensitivity', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.noiseSuppression}
                        onChange={(e) => handleSettingChange('noiseSuppression', e.target.checked)}
                        className="rounded"
                      />
                      <label className="text-sm">Enable noise suppression</label>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-4">
                  <h4 className="font-medium mb-2 flex items-center space-x-2">
                    <Volume2 className="w-4 h-4" />
                    <span>Current Audio Status</span>
                  </h4>
                  <div className="text-sm text-slate-400">
                    <p>Connection: {appState.isConnected ? 'Connected' : 'Disconnected'}</p>
                    <p>Recording: {appState.isRecording ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">AI Assistant Configuration</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">AI Model</label>
                      <select
                        value={settings.aiModel}
                        onChange={(e) => handleSettingChange('aiModel', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
                      >
                        <option value="gpt-4">GPT-4 (Recommended)</option>
                        <option value="gpt-3.5">GPT-3.5 Turbo (Faster)</option>
                        <option value="claude">Claude-3 Sonnet</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Response Speed</label>
                      <select
                        value={settings.responseSpeed}
                        onChange={(e) => handleSettingChange('responseSpeed', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
                      >
                        <option value="fast">Fast (1-2 seconds)</option>
                        <option value="balanced">Balanced (2-3 seconds)</option>
                        <option value="thorough">Thorough (3-5 seconds)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Coaching Style</label>
                      <select
                        value={settings.coachingStyle}
                        onChange={(e) => handleSettingChange('coachingStyle', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
                      >
                        <option value="supportive">Supportive & Encouraging</option>
                        <option value="direct">Direct & Action-Oriented</option>
                        <option value="analytical">Analytical & Data-Driven</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Privacy & Data Management</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Data Retention Period</label>
                      <select
                        value={settings.dataRetention}
                        onChange={(e) => handleSettingChange('dataRetention', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
                      >
                        <option value="session">Current Session Only</option>
                        <option value="7days">7 Days</option>
                        <option value="30days">30 Days</option>
                        <option value="never">Never Delete</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.analytics}
                        onChange={(e) => handleSettingChange('analytics', e.target.checked)}
                        className="rounded"
                      />
                      <label className="text-sm">Enable usage analytics (helps improve the product)</label>
                    </div>

                    <div className="glass-panel p-4">
                      <h4 className="font-medium mb-2 text-success-400">Privacy First</h4>
                      <p className="text-sm text-slate-400">
                        VoiceCoach processes audio locally when possible. No call recordings are sent to external services 
                        without your explicit consent. All transcriptions are encrypted at rest.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">About VoiceCoach</h3>
                  
                  <div className="space-y-4">
                    <div className="glass-panel p-6">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold text-xl">VC</span>
                        </div>
                        <div>
                          <h4 className="text-xl font-semibold">VoiceCoach</h4>
                          <p className="text-slate-400">Version 0.1.0 Beta</p>
                        </div>
                      </div>
                      
                      <p className="text-slate-300 leading-relaxed mb-4">
                        AI-powered real-time sales coaching desktop application. Built with Tauri, React, and TypeScript 
                        for maximum performance and security.
                      </p>

                      <div className="space-y-2 text-sm text-slate-400">
                        <p><strong>Framework:</strong> Tauri + React + TypeScript</p>
                        <p><strong>AI Engine:</strong> OpenAI GPT-4 / Anthropic Claude</p>
                        <p><strong>Audio Processing:</strong> WebRTC + Native APIs</p>
                        <p><strong>Privacy:</strong> Local-first processing</p>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-slate-400">
                        Built with ❤️ for sales professionals who want to excel in every conversation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-6">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;