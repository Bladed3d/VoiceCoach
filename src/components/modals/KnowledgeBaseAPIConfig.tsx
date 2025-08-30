/**
 * VoiceCoach V2 - Knowledge Base API Configuration Component
 * Extracted from SettingsModal for modular architecture compliance
 * Manages Phase 1A/1B/1C API toggles and settings
 */
import React, { useEffect } from 'react';
import { Zap, Brain, Settings } from 'lucide-react';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

interface KnowledgeBaseSettings {
  phase1AEnabled: boolean;
  phase1BEnabled: boolean;
  phase1CEnabled: boolean;
  apiEndpoint: string;
  apiKey: string;
}

interface KnowledgeBaseAPIConfigProps {
  settings: KnowledgeBaseSettings;
  onChange: (key: string, value: any) => void;
}

const KnowledgeBaseAPIConfig: React.FC<KnowledgeBaseAPIConfigProps> = ({ settings, onChange }) => {
  const trail = new BreadcrumbTrail('KnowledgeBaseAPIConfig');
  
  // Component lifecycle and state tracking
  useEffect(() => {
    trail.light(7100, {
      component_mount: 'KnowledgeBaseAPIConfig',
      initial_phase_states: {
        phase1A: settings.phase1AEnabled,
        phase1B: settings.phase1BEnabled,
        phase1C: settings.phase1CEnabled
      },
      api_configuration: {
        endpoint_configured: !!settings.apiEndpoint,
        key_configured: !!settings.apiKey,
        endpoint_length: settings.apiEndpoint?.length || 0
      }
    });
    
    return () => {
      trail.light(7101, { component_unmount: 'KnowledgeBaseAPIConfig' });
    };
  }, []);
  
  // Phase state change monitoring
  useEffect(() => {
    const enabledPhases = [];
    if (settings.phase1AEnabled) enabledPhases.push('1A');
    if (settings.phase1BEnabled) enabledPhases.push('1B');
    if (settings.phase1CEnabled) enabledPhases.push('1C');
    
    trail.light(7102, {
      phase_states_updated: 'monitoring_phase_changes',
      enabled_phases: enabledPhases,
      total_enabled: enabledPhases.length,
      api_readiness: {
        has_endpoint: !!settings.apiEndpoint,
        has_key: !!settings.apiKey,
        phases_need_api: enabledPhases.length > 0
      }
    });
    
    // Alert if phases are enabled without proper API configuration
    if (enabledPhases.length > 0 && (!settings.apiEndpoint || !settings.apiKey)) {
      trail.light(8102, {
        configuration_warning: 'phases_enabled_incomplete_api',
        enabled_phases: enabledPhases,
        missing_config: {
          endpoint: !settings.apiEndpoint,
          key: !settings.apiKey
        }
      });
    }
  }, [settings.phase1AEnabled, settings.phase1BEnabled, settings.phase1CEnabled, settings.apiEndpoint, settings.apiKey]);
  
  // Enhanced phase toggle handler
  const handlePhaseToggle = (phaseKey: string, enabled: boolean, phaseName: string) => {
    trail.light(7103, {
      phase_toggle: 'user_interaction',
      phase: phaseName,
      action: enabled ? 'enabled' : 'disabled',
      previous_state: settings[phaseKey as keyof KnowledgeBaseSettings]
    });
    
    onChange(phaseKey, enabled);
    
    // Track potential configuration issues
    if (enabled && (!settings.apiEndpoint || !settings.apiKey)) {
      trail.light(8103, {
        configuration_issue: 'phase_enabled_without_api',
        phase: phaseName,
        needs_configuration: true,
        missing: {
          endpoint: !settings.apiEndpoint,
          key: !settings.apiKey
        }
      });
    }
    
    trail.light(7104, {
      phase_toggle_complete: phaseName,
      new_state: enabled,
      api_integration_active: enabled && settings.apiEndpoint && settings.apiKey
    });
  };
  
  // Enhanced API configuration handlers
  const handleEndpointChange = (endpoint: string) => {
    trail.light(7105, {
      api_config: 'endpoint_changed',
      from_length: settings.apiEndpoint?.length || 0,
      to_length: endpoint.length,
      is_valid_url: endpoint.startsWith('http')
    });
    
    onChange('apiEndpoint', endpoint);
    
    // Validate endpoint format
    if (endpoint && !endpoint.startsWith('http')) {
      trail.light(8104, {
        validation_warning: 'invalid_endpoint_format',
        endpoint: endpoint.substring(0, 50) + '...',
        expected_format: 'https://api.example.com'
      });
    }
  };
  
  const handleApiKeyChange = (apiKey: string) => {
    trail.light(7106, {
      api_config: 'key_changed',
      key_length: apiKey.length,
      has_content: apiKey.length > 0
    });
    
    onChange('apiKey', apiKey);
  };
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Knowledge Base API Configuration</h3>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <p className="text-blue-300 text-sm">
            Configure external API integration for RAG processing phases. All phases are disabled by default.
          </p>
        </div>
        
        <div className="space-y-6">
          {/* Phase 1A Controls */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-5 hover:bg-slate-800/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="font-medium">Phase 1A - Pure Analysis</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.phase1AEnabled}
                  onChange={(e) => handlePhaseToggle('phase1AEnabled', e.target.checked, 'Phase 1A')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            
            {!settings.phase1AEnabled && (
              <p className="text-slate-500 text-xs">Phase 1A API integration is disabled. Processing will use local methods.</p>
            )}
            
            {settings.phase1AEnabled && (
              <div className="space-y-4 mt-4 p-4 bg-slate-900/50 rounded-lg border-l-4 border-yellow-400">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-200">API Endpoint</label>
                  <input
                    type="text"
                    placeholder="https://api.example.com/phase1a"
                    value={settings.apiEndpoint}
                    onChange={(e) => handleEndpointChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-200">API Key</label>
                  <input
                    type="password"
                    placeholder="Enter API key"
                    value={settings.apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Phase 1B Controls */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-5 hover:bg-slate-800/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Brain className="w-5 h-5 text-blue-400" />
                <span className="font-medium">Phase 1B - Contextual Analysis</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.phase1BEnabled}
                  onChange={(e) => handlePhaseToggle('phase1BEnabled', e.target.checked, 'Phase 1B')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            
            {!settings.phase1BEnabled && (
              <p className="text-slate-500 text-xs">Phase 1B API integration is disabled. Processing will use local methods.</p>
            )}
          </div>

          {/* Phase 1C Controls */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-5 hover:bg-slate-800/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Settings className="w-5 h-5 text-purple-400" />
                <span className="font-medium">Phase 1C - Synthesis</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.phase1CEnabled}
                  onChange={(e) => handlePhaseToggle('phase1CEnabled', e.target.checked, 'Phase 1C')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            
            {!settings.phase1CEnabled && (
              <p className="text-slate-500 text-xs">Phase 1C API integration is disabled. Processing will use local methods.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseAPIConfig;