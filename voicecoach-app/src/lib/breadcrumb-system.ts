// VoiceCoach LED Breadcrumb System
// Provides real-time debugging and monitoring for VoiceCoach operations

export interface Breadcrumb {
  id: number;
  name: string;
  component: string;
  timestamp: number;
  success: boolean;
  data?: any;
  error?: string;
  stack?: string;
}

export interface BreadcrumbTrailInterface {
  name: string;
  sequence: Breadcrumb[];
}

declare global {
  interface Window {
    breadcrumbs?: Map<string, BreadcrumbTrail>;
    globalBreadcrumbTrail?: Breadcrumb[];
    breadcrumbFailures?: Breadcrumb[];
    debug?: {
      breadcrumbs: {
        getAllTrails: () => Array<[string, BreadcrumbTrail]>;
        getGlobalTrail: () => Breadcrumb[];
        getFailures: () => Breadcrumb[];
        getComponent: (name: string) => Breadcrumb[] | undefined;
        clearAll: () => void;
        getDocumentProcessingStats: () => any;
        getTauriOperationStats: () => any;
        getKnowledgeSearchStats: () => any;
        getCoachingPipelineStats: () => any;
        getPromptTruncationAnalysis: () => any;
        getCoachingQualityMetrics: () => any;
        getEnhancedAudioStats: () => any;
        getAudioModeTransitionAnalysis: () => any;
        getVideoCallCoachingMetrics: () => any;
      }
    };
  }
}

export class BreadcrumbTrail {
  private sequence: Breadcrumb[] = [];
  private componentName: string;

  constructor(componentName: string) {
    this.componentName = componentName;
    
    // Initialize global breadcrumb infrastructure
    if (typeof window !== 'undefined') {
      if (!window.breadcrumbs) {
        window.breadcrumbs = new Map();
      }
      
      if (!window.globalBreadcrumbTrail) {
        window.globalBreadcrumbTrail = [];
      }
      
      if (!window.breadcrumbFailures) {
        window.breadcrumbFailures = [];
      }
      
      // Register this trail
      window.breadcrumbs.set(componentName, this);
      
      // Register debug commands
      this._registerDebugCommands();
    }
  }

  light(ledId: number, data?: any): void {
    const breadcrumb: Breadcrumb = {
      id: ledId,
      name: this._getLedName(ledId),
      component: this.componentName,
      timestamp: Date.now(),
      success: true,
      data: data
    };
    
    this.sequence.push(breadcrumb);
    
    // Add to global trail
    if (typeof window !== 'undefined' && window.globalBreadcrumbTrail) {
      window.globalBreadcrumbTrail.push(breadcrumb);
    }
    
    this._cleanup();
  }

  fail(ledId: number, error: Error): void {
    const breadcrumb: Breadcrumb = {
      id: ledId,
      name: this._getLedName(ledId),
      component: this.componentName,
      timestamp: Date.now(),
      success: false,
      error: error.message,
      stack: error.stack
    };
    
    this.sequence.push(breadcrumb);
    
    // Add to global trail and failures
    if (typeof window !== 'undefined') {
      if (window.globalBreadcrumbTrail) {
        window.globalBreadcrumbTrail.push(breadcrumb);
      }
      
      if (window.breadcrumbFailures) {
        window.breadcrumbFailures.push(breadcrumb);
      }
    }
    
    this._cleanup();
  }

  private _getLedName(ledId: number): string {
    // User Interactions (100-199)
    if (ledId >= 100 && ledId <= 199) {
      const ledMap: Record<number, string> = {
        100: 'START_RECORDING_CLICKED',
        101: 'STOP_RECORDING_CLICKED',
        102: 'SETTINGS_CLICKED',
        103: 'SETTINGS_CLOSED',
        104: 'START_COACHING_CLICKED',
        105: 'STOP_COACHING_CLICKED',
        106: 'DASHBOARD_TAB_CLICKED',
        107: 'TRANSCRIPTION_TAB_CLICKED',
        108: 'AI_COACHING_TAB_CLICKED',
        109: 'CALL_INSIGHTS_TAB_CLICKED',
        110: 'SPLIT_VIEW_TAB_CLICKED',
        111: 'USER_TESTING_CLICKED',
        112: 'FEEDBACK_CLICKED',
        113: 'ANALYTICS_CLICKED',
        114: 'PERFORMANCE_VALIDATION_CLICKED',
        
        // Enhanced Audio 2-Way Processing - Audio Mode Selection (150-159)
        150: 'AUDIO_MODE_SELECTION_START',
        151: 'AUDIO_MODE_MICROPHONE_SELECTED',
        152: 'AUDIO_MODE_SYSTEM_AUDIO_SELECTED',
        153: 'AUDIO_MODE_COMBINED_SELECTED',
        154: 'AUDIO_DEVICE_DROPDOWN_OPENED',
        155: 'AUDIO_DEVICE_SELECTED',
        156: 'AUDIO_MODE_VALIDATION_START',
        157: 'AUDIO_MODE_VALIDATION_COMPLETE',
        158: 'AUDIO_MODE_SWITCH_CONFIRMATION',
        159: 'AUDIO_MODE_SETTINGS_SAVED',
        
        // Enhanced Audio 2-Way Processing - System Audio Capture (160-169)
        160: 'SYSTEM_AUDIO_CAPTURE_INIT',
        161: 'SYSTEM_AUDIO_PERMISSIONS_REQUEST',
        162: 'SYSTEM_AUDIO_PERMISSIONS_GRANTED',
        163: 'SYSTEM_AUDIO_PERMISSIONS_DENIED',
        164: 'DISPLAY_MEDIA_API_CALL',
        165: 'DISPLAY_MEDIA_STREAM_ACQUIRED',
        166: 'SYSTEM_AUDIO_STREAM_SETUP',
        167: 'SYSTEM_AUDIO_RECORDER_INITIALIZED',
        168: 'SYSTEM_AUDIO_RECORDING_STARTED',
        169: 'SYSTEM_AUDIO_CAPTURE_COMPLETE',
        
        // Enhanced Audio 2-Way Processing - Video Platform Integration (170-179)
        170: 'VIDEO_PLATFORM_COMPATIBILITY_CHECK',
        171: 'ZOOM_INTEGRATION_DETECTED',
        172: 'TEAMS_INTEGRATION_DETECTED',
        173: 'MEET_INTEGRATION_DETECTED',
        174: 'VIDEO_CALL_AUDIO_STREAM_DETECTED',
        175: 'VIDEO_PLATFORM_PERMISSIONS_VERIFIED',
        176: 'VIDEO_CALL_COACHING_ACTIVATED',
        177: 'VIDEO_PLATFORM_AUDIO_QUALITY_CHECK',
        178: 'VIDEO_CALL_TRANSCRIPTION_START',
        179: 'VIDEO_PLATFORM_INTEGRATION_COMPLETE',
        
        // Enhanced Audio 2-Way Processing - Combined Audio Stream Processing (180-189)
        180: 'COMBINED_AUDIO_STREAM_INIT',
        181: 'MICROPHONE_STREAM_ACQUIRED',
        182: 'SYSTEM_AUDIO_STREAM_ACQUIRED',
        183: 'AUDIO_CONTEXT_CREATED',
        184: 'AUDIO_SOURCES_CONNECTED',
        185: 'COMBINED_STREAM_MIXING',
        186: 'AUDIO_QUALITY_MONITORING',
        187: 'STREAM_SYNCHRONIZATION_CHECK',
        188: 'COMBINED_AUDIO_PROCESSING_ACTIVE',
        189: 'COMBINED_STREAM_QUALITY_VALIDATED',
        
        // Enhanced Audio 2-Way Processing - Enhanced Coaching Pipeline (190-199)
        190: 'ENHANCED_COACHING_PIPELINE_START',
        191: 'SYSTEM_AUDIO_TRANSCRIPTION_RECEIVED',
        192: 'VIDEO_CALL_CONTEXT_ANALYSIS',
        193: 'REAL_TIME_COACHING_TRIGGER',
        194: 'ENHANCED_PROMPT_GENERATION',
        195: 'VIDEO_CALL_SENTIMENT_ANALYSIS',
        196: 'PROSPECT_AUDIO_ANALYSIS',
        197: 'ENHANCED_COACHING_DELIVERY',
        198: 'VIDEO_CALL_METRICS_UPDATE',
        199: 'ENHANCED_COACHING_PIPELINE_COMPLETE'
      };
      return ledMap[ledId] || `USER_INTERACTION_${ledId}`;
    }
    
    // API Operations (200-299)
    else if (ledId >= 200 && ledId <= 299) {
      const ledMap: Record<number, string> = {
        200: 'API_OPERATION_START',
        201: 'TAURI_INVOKE_START',
        202: 'TAURI_INVOKE_COMPLETE',
        203: 'TAURI_INVOKE_ERROR',
        210: 'INITIALIZE_VOICECOACH',
        211: 'INITIALIZE_VOICECOACH_SUCCESS',
        212: 'REFRESH_AUDIO_DEVICES',
        213: 'GET_AUDIO_LEVELS',
        220: 'START_RECORDING',
        221: 'START_RECORDING_SUCCESS',
        222: 'STOP_RECORDING',
        223: 'STOP_RECORDING_SUCCESS',
        224: 'GET_AUDIO_DEVICES',
        225: 'GET_AUDIO_DEVICES_SUCCESS'
      };
      return ledMap[ledId] || `API_OPERATION_${ledId}`;
    }
    
    // State Management (300-399)
    else if (ledId >= 300 && ledId <= 399) {
      const ledMap: Record<number, string> = {
        300: 'INITIAL_STATE_SETUP',
        301: 'AUDIO_PROCESSOR_HOOK_INIT',
        302: 'AUDIO_PROCESSOR_DATA_RECEIVED',
        303: 'APPSTATE_CONVERSION_START',
        304: 'APPSTATE_CONVERSION_COMPLETE',
        305: 'TIMER_EFFECT_INIT',
        306: 'TIMER_TICK',
        307: 'TIMER_CLEANUP',
        308: 'AUDIO_ERROR_MONITORING',
        309: 'AUDIO_ERROR_DETECTED',
        310: 'SETTINGS_PANEL_OPENED',
        311: 'SETTINGS_PANEL_CLOSED',
        312: 'INITIAL_COMPONENT_STATE_SETUP',
        313: 'KNOWLEDGE_BASE_PANEL_CLOSED',
        314: 'CALL_METRICS_INTERVAL_START',
        315: 'CALL_METRICS_UPDATE',
        316: 'CALL_METRICS_INTERVAL_CLEANUP',
        317: 'ACTIVE_TAB_CHANGED_DASHBOARD',
        318: 'ACTIVE_TAB_CHANGED_TRANSCRIPTION',
        319: 'ACTIVE_TAB_CHANGED_PROMPTS',
        320: 'ACTIVE_TAB_CHANGED_INSIGHTS',
        321: 'ACTIVE_TAB_CHANGED_SPLIT'
      };
      return ledMap[ledId] || `STATE_MANAGEMENT_${ledId}`;
    }
    
    // UI Operations (400-499)
    else if (ledId >= 400 && ledId <= 499) {
      const ledMap: Record<number, string> = {
        400: 'APP_COMPONENT_INIT',
        401: 'APP_RENDER_START',
        402: 'COACHING_INTERFACE_INIT',
        403: 'COACHING_INTERFACE_RENDER',
        404: 'COACHING_DASHBOARD_RENDER',
        405: 'TRANSCRIPTION_PANEL_RENDER',
        406: 'COACHING_PROMPTS_RENDER',
        407: 'SPLIT_VIEW_RENDER'
      };
      return ledMap[ledId] || `UI_OPERATION_${ledId}`;
    }
    
    // Audio Processing (500-599)
    else if (ledId >= 500 && ledId <= 599) {
      const ledMap: Record<number, string> = {
        500: 'AUDIO_PROCESSOR_HOOK_INIT',
        501: 'INITIAL_AUDIO_STATE_SETUP',
        502: 'AUDIO_PROCESSOR_INIT_EFFECT',
        503: 'AUDIO_CONNECTION_STATE_UPDATE',
        504: 'STATUS_POLLING_INIT',
        505: 'AUDIO_PROCESSOR_CLEANUP',
        506: 'AUDIO_LEVELS_POLLING_START',
        507: 'AUDIO_LEVELS_RECEIVED',
        508: 'AUDIO_LEVELS_POLLING_STOP',
        509: 'START_RECORDING_OPERATION',
        510: 'RECORDING_STARTED_SUCCESS',
        511: 'RECORDING_START_FAILED',
        512: 'STOP_RECORDING_OPERATION',
        513: 'RECORDING_STOPPED_SUCCESS',
        514: 'RECORDING_STOP_FAILED',
        515: 'REFRESH_AUDIO_DEVICES_OPERATION',
        516: 'AUDIO_DEVICES_REFRESHED_SUCCESS',
        517: 'REFRESH_AUDIO_DEVICES_FAILED'
      };
      return ledMap[ledId] || `AUDIO_PROCESSING_${ledId}`;
    }
    
    // System Operations (600-699)
    else if (ledId >= 600 && ledId <= 699) {
      const ledMap: Record<number, string> = {
        600: 'TAURI_SYSTEM_INIT',
        601: 'WINDOW_CREATED',
        602: 'WINDOW_SHOWN',
        603: 'WINDOW_HIDDEN',
        604: 'WINDOW_FOCUSED',
        605: 'WINDOW_RESIZED',
        606: 'WINDOW_MOVED',
        607: 'WINDOW_MINIMIZED',
        608: 'WINDOW_MAXIMIZED',
        609: 'WINDOW_CLOSED'
      };
      return ledMap[ledId] || `SYSTEM_OPERATION_${ledId}`;
    }
    
    // Build System (700-799)
    else if (ledId >= 700 && ledId <= 799) {
      const ledMap: Record<number, string> = {
        700: 'BUILD_SYSTEM_INIT',
        701: 'TYPESCRIPT_COMPILATION_START',
        702: 'TYPESCRIPT_FILE_COMPILED',
        703: 'TYPESCRIPT_COMPILATION_COMPLETE',
        710: 'VITE_BUILD_START',
        711: 'VITE_MODULE_PROCESSED',
        712: 'VITE_BUNDLE_GENERATED',
        713: 'VITE_BUILD_COMPLETE'
      };
      return ledMap[ledId] || `BUILD_OPERATION_${ledId}`;
    }
    
    // AudioDeviceSelector Component (800-899)
    else if (ledId >= 800 && ledId <= 899) {
      const ledMap: Record<number, string> = {
        800: 'AUDIO_DEVICE_SELECTOR_INIT',
        801: 'DEVICES_LOADED',
        802: 'CURRENT_MODE_LOADED',
        803: 'MODE_CHANGE_REQUEST',
        804: 'MODE_CHANGE_SUCCESS'
      };
      return ledMap[ledId] || `AUDIO_DEVICE_SELECTOR_${ledId}`;
    }
    
    // Default fallback
    return `LED_${ledId}`;
  }

  private _cleanup(): void {
    // Keep only last 100 breadcrumbs per component
    if (this.sequence.length > 100) {
      this.sequence = this.sequence.slice(-50);
    }
    
    // Keep only last 1000 global breadcrumbs
    if (typeof window !== 'undefined' && window.globalBreadcrumbTrail && window.globalBreadcrumbTrail.length > 1000) {
      window.globalBreadcrumbTrail = window.globalBreadcrumbTrail.slice(-500);
    }
  }
  
  private _registerDebugCommands(): void {
    if (typeof window !== 'undefined') {
      if (!window.debug) {
        (window as any).debug = {
          breadcrumbs: {
            getAllTrails: () => Array.from(window.breadcrumbs?.entries() || []),
            getGlobalTrail: () => window.globalBreadcrumbTrail || [],
            getFailures: () => window.breadcrumbFailures || [],
            getComponent: (name: string) => window.breadcrumbs?.get(name)?.getSequence(),
            clearAll: () => {
              window.breadcrumbs?.clear();
              window.globalBreadcrumbTrail = [];
              window.breadcrumbFailures = [];
            },
            getDocumentProcessingStats: () => ({}),
            getTauriOperationStats: () => ({}),
            getKnowledgeSearchStats: () => ({}),
            getCoachingPipelineStats: () => ({}),
            getPromptTruncationAnalysis: () => ({}),
            getCoachingQualityMetrics: () => ({}),
            getEnhancedAudioStats: () => ({}),
            getAudioModeTransitionAnalysis: () => ({}),
            getVideoCallCoachingMetrics: () => ({})
          }
        };
      }
      
      if ((window as any).debug) {
        (window as any).debug.breadcrumbs = {
        getAllTrails: () => Array.from(window.breadcrumbs?.entries() || []),
        getGlobalTrail: () => window.globalBreadcrumbTrail || [],
        getFailures: () => window.breadcrumbFailures || [],
        getComponent: (name: string) => window.breadcrumbs?.get(name)?.getSequence(),
        clearAll: () => {
          window.breadcrumbs?.clear();
          window.globalBreadcrumbTrail = [];
          window.breadcrumbFailures = [];
        },
        
        // VoiceCoach-specific debug commands
        getDocumentProcessingStats: () => {
          const trail = window.globalBreadcrumbTrail || [];
          const processingOps = trail.filter(bc => 
            (bc.id >= 200 && bc.id <= 212) && bc.component === 'KnowledgeBaseManager'
          );
          return {
            total_operations: processingOps.length,
            successful: processingOps.filter(bc => bc.success).length,
            failed: processingOps.filter(bc => !bc.success).length,
            average_duration: processingOps.length > 1 
              ? (Math.max(...processingOps.map(bc => bc.timestamp)) - Math.min(...processingOps.map(bc => bc.timestamp))) / processingOps.length
              : 0
          };
        },
        
        getTauriOperationStats: () => {
          const trail = window.globalBreadcrumbTrail || [];
          const tauriOps = trail.filter(bc => 
            bc.id >= 200 && bc.id <= 299 && bc.component === 'TauriMock'
          );
          return {
            total_tauri_operations: tauriOps.length,
            successful: tauriOps.filter(bc => bc.success).length,
            failed: tauriOps.filter(bc => !bc.success).length,
            initialize_operations: tauriOps.filter(bc => bc.id === 210).length,
            recording_operations: tauriOps.filter(bc => bc.id >= 220 && bc.id <= 225).length
          };
        },
        
        getKnowledgeSearchStats: () => {
          const trail = window.globalBreadcrumbTrail || [];
          const searchOps = trail.filter(bc => 
            bc.name.includes('SEARCH') || bc.name.includes('QUERY') || bc.name.includes('EMBEDDING')
          );
          return {
            total_searches: searchOps.length,
            successful: searchOps.filter(bc => bc.success).length,
            failed: searchOps.filter(bc => !bc.success).length,
            recent_searches: searchOps.slice(-10).map(bc => ({
              timestamp: new Date(bc.timestamp).toISOString(),
              success: bc.success,
              query: bc.data?.query || 'unknown'
            }))
          };
        },

        getCoachingPipelineStats: () => {
          const trail = window.globalBreadcrumbTrail || [];
          const coachingOps = trail.filter(bc => 
            bc.component === 'useCoachingOrchestrator' || 
            bc.component === 'CoachingPrompts' ||
            bc.name.includes('COACHING') || 
            bc.name.includes('PROMPT')
          );
          
          const promptOps = coachingOps.filter(bc => bc.name.includes('PROMPT'));
          const transcriptionOps = coachingOps.filter(bc => bc.name.includes('TRANSCRIPTION'));
          const responseOps = coachingOps.filter(bc => bc.name.includes('RESPONSE'));
          
          return {
            total_coaching_operations: coachingOps.length,
            successful: coachingOps.filter(bc => bc.success).length,
            failed: coachingOps.filter(bc => !bc.success).length,
            prompts_generated: promptOps.length,
            transcriptions_processed: transcriptionOps.length,
            responses_delivered: responseOps.length,
            average_response_time: coachingOps.length > 1 
              ? (Math.max(...coachingOps.map(bc => bc.timestamp)) - Math.min(...coachingOps.map(bc => bc.timestamp))) / coachingOps.length
              : 0
          };
        },

        getPromptTruncationAnalysis: () => {
          const trail = window.globalBreadcrumbTrail || [];
          const truncationOps = trail.filter(bc => 
            bc.data && (bc.data.truncated || bc.data.compressed || bc.data.originalLength)
          );
          
          return {
            total_truncations: truncationOps.length,
            compression_events: truncationOps.filter(bc => bc.data.compressed).length,
            average_compression_ratio: truncationOps
              .filter(bc => bc.data.originalLength && bc.data.finalLength)
              .reduce((acc, bc) => acc + (bc.data.finalLength / bc.data.originalLength), 0) / 
              Math.max(1, truncationOps.filter(bc => bc.data.originalLength && bc.data.finalLength).length),
            techniques_used: [...new Set(truncationOps.map(bc => bc.data.technique).filter(Boolean))]
          };
        },

        getCoachingQualityMetrics: () => {
          const trail = window.globalBreadcrumbTrail || [];
          const qualityOps = trail.filter(bc => 
            bc.data && (bc.data.quality_score !== undefined || bc.data.relevance_score || bc.data.confidence)
          );
          
          return {
            total_quality_assessments: qualityOps.length,
            average_quality_score: qualityOps
              .filter(bc => bc.data.quality_score !== undefined)
              .reduce((acc, bc) => acc + bc.data.quality_score, 0) / 
              Math.max(1, qualityOps.filter(bc => bc.data.quality_score !== undefined).length),
            quality_distribution: {
              high: qualityOps.filter(bc => bc.data.quality_score > 0.8).length,
              medium: qualityOps.filter(bc => bc.data.quality_score > 0.5 && bc.data.quality_score <= 0.8).length,
              low: qualityOps.filter(bc => bc.data.quality_score < 0.5).length
            },
            proactive_suggestions: qualityOps.filter(bc => bc.data.is_proactive).length,
            contextual_suggestions: qualityOps.filter(bc => bc.data.quality_metrics?.has_context).length
          };
        },

        // Enhanced Audio 2-Way Processing Debug Functions
        getEnhancedAudioStats: () => {
          const trail = window.globalBreadcrumbTrail || [];
          const audioOps = trail.filter(bc => 
            bc.id >= 150 && bc.id <= 199 && 
            (bc.component === 'AudioDeviceSelector' || bc.component === 'useAudioProcessor' || bc.component === 'TauriMock')
          );
          
          const audioModeOps = audioOps.filter(bc => bc.id >= 150 && bc.id <= 159);
          const systemAudioOps = audioOps.filter(bc => bc.id >= 160 && bc.id <= 169);
          const videoPlatformOps = audioOps.filter(bc => bc.id >= 170 && bc.id <= 179);
          const combinedStreamOps = audioOps.filter(bc => bc.id >= 180 && bc.id <= 189);
          const enhancedCoachingOps = audioOps.filter(bc => bc.id >= 190 && bc.id <= 199);
          
          return {
            total_enhanced_audio_operations: audioOps.length,
            audio_mode_selections: {
              total: audioModeOps.length,
              successful: audioModeOps.filter(bc => bc.success).length,
              failed: audioModeOps.filter(bc => !bc.success).length,
              modes_selected: {
                microphone: audioModeOps.filter(bc => bc.data?.mode === 'microphone_only' || bc.data?.audio_mode === 'microphone_only').length,
                system_audio: audioModeOps.filter(bc => bc.data?.mode === 'system_audio' || bc.data?.audio_mode === 'system_audio').length,
                combined: audioModeOps.filter(bc => bc.data?.mode === 'combined' || bc.data?.audio_mode === 'combined').length
              }
            },
            system_audio_capture: {
              total: systemAudioOps.length,
              successful: systemAudioOps.filter(bc => bc.success).length,
              failed: systemAudioOps.filter(bc => !bc.success).length,
              permission_grants: systemAudioOps.filter(bc => bc.id === 162).length,
              permission_denials: systemAudioOps.filter(bc => bc.id === 163).length,
              streams_acquired: systemAudioOps.filter(bc => bc.id === 165).length
            },
            video_platform_integration: {
              total: videoPlatformOps.length,
              successful: videoPlatformOps.filter(bc => bc.success).length,
              failed: videoPlatformOps.filter(bc => !bc.success).length,
              platforms_detected: {
                zoom: videoPlatformOps.filter(bc => bc.id === 171).length,
                teams: videoPlatformOps.filter(bc => bc.id === 172).length,
                meet: videoPlatformOps.filter(bc => bc.id === 173).length
              },
              coaching_activations: videoPlatformOps.filter(bc => bc.id === 176).length
            },
            combined_stream_processing: {
              total: combinedStreamOps.length,
              successful: combinedStreamOps.filter(bc => bc.success).length,
              failed: combinedStreamOps.filter(bc => !bc.success).length,
              sync_checks: combinedStreamOps.filter(bc => bc.id === 187).length,
              quality_validations: combinedStreamOps.filter(bc => bc.id === 189).length
            },
            enhanced_coaching_pipeline: {
              total: enhancedCoachingOps.length,
              successful: enhancedCoachingOps.filter(bc => bc.success).length,
              failed: enhancedCoachingOps.filter(bc => !bc.success).length,
              coaching_deliveries: enhancedCoachingOps.filter(bc => bc.id === 197).length,
              sentiment_analyses: enhancedCoachingOps.filter(bc => bc.id === 195).length
            }
          };
        },

        getAudioModeTransitionAnalysis: () => {
          const trail = window.globalBreadcrumbTrail || [];
          const modeOps = trail.filter(bc => 
            bc.id >= 150 && bc.id <= 159 && bc.component === 'AudioDeviceSelector'
          );
          
          const transitions = [];
          for (let i = 1; i < modeOps.length; i++) {
            if (modeOps[i].id === 150 && modeOps[i-1].id >= 151 && modeOps[i-1].id <= 153) {
              transitions.push({
                from: modeOps[i-1].data?.mode || 'unknown',
                to: modeOps[i].data?.requested_mode || 'unknown',
                timestamp: modeOps[i].timestamp,
                success: modeOps[i].success
              });
            }
          }
          
          return {
            total_transitions: transitions.length,
            successful_transitions: transitions.filter(t => t.success).length,
            failed_transitions: transitions.filter(t => !t.success).length,
            common_patterns: transitions.reduce((acc, t) => {
              const pattern = `${t.from} → ${t.to}`;
              acc[pattern] = (acc[pattern] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            recent_transitions: transitions.slice(-5)
          };
        },

        getVideoCallCoachingMetrics: () => {
          const trail = window.globalBreadcrumbTrail || [];
          const videoOps = trail.filter(bc => 
            bc.id >= 170 && bc.id <= 179 && bc.name.includes('VIDEO')
          );
          const coachingOps = trail.filter(bc => 
            bc.id >= 190 && bc.id <= 199 && bc.name.includes('COACHING')
          );
          
          return {
            video_call_sessions: {
              total: videoOps.filter(bc => bc.id === 176).length,
              active: videoOps.filter(bc => bc.id === 176 && bc.success).length,
              quality_checks: videoOps.filter(bc => bc.id === 177).length
            },
            coaching_effectiveness: {
              total_deliveries: coachingOps.filter(bc => bc.id === 197).length,
              successful_deliveries: coachingOps.filter(bc => bc.id === 197 && bc.success).length,
              average_response_time: coachingOps.length > 1 
                ? (Math.max(...coachingOps.map(bc => bc.timestamp)) - Math.min(...coachingOps.map(bc => bc.timestamp))) / coachingOps.length
                : 0,
              sentiment_accuracy: coachingOps.filter(bc => bc.id === 195 && bc.data?.confidence > 0.8).length
            },
            platform_performance: {
              zoom_sessions: videoOps.filter(bc => bc.id === 171).length,
              teams_sessions: videoOps.filter(bc => bc.id === 172).length,
              meet_sessions: videoOps.filter(bc => bc.id === 173).length,
              integration_success_rate: videoOps.filter(bc => bc.id === 179).length / Math.max(1, videoOps.filter(bc => bc.id === 170).length)
            }
          };
        }
        };
      }
    }
  }
  
  getSequence(): Breadcrumb[] {
    return [...this.sequence];
  }
  
  getFailures(): Breadcrumb[] {
    return this.sequence.filter(bc => !bc.success);
  }
}

// Auto-register enhanced debug commands for VoiceCoach
if (typeof window !== 'undefined') {
  // Initialize breadcrumb system on load
  window.addEventListener('load', () => {
    console.log('🔧 VoiceCoach LED Breadcrumb System Initialized');
    console.log('📊 Debug commands available at: window.debug.breadcrumbs');
    console.log('🚨 Use window.debug.breadcrumbs.getFailures() to see all errors');
  });
}