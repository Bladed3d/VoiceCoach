/**
 * LED Light Trail Debugging Infrastructure for VoiceCoach Document Processing
 * 
 * This module provides comprehensive breadcrumb trail debugging for React + Tauri + Python
 * integration across the complete document processing pipeline.
 * 
 * LED numbering system:
 * - 100-199: User Interactions (drag, click, input, selection)
 * - 200-299: API Operations (fetch, post, put, delete, validation)
 * - 300-399: State Management (setState, store updates, context changes)
 * - 400-499: UI Operations (render, modal, navigation, display)
 * - 500-599: Validation & Processing (form validation, data transformation)
 */

interface Breadcrumb {
  id: number;
  name: string;
  component: string;
  timestamp: number;
  duration: number;
  data?: any;
  success: boolean;
  error?: string;
  stack?: string;
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
      }
    };
  }
}

export class BreadcrumbTrail {
  private sequence: Breadcrumb[] = [];
  private startTime: number = Date.now();
  
  constructor(private componentName: string) {
    if (typeof window !== 'undefined') {
      if (!window.breadcrumbs) window.breadcrumbs = new Map();
      window.breadcrumbs.set(componentName, this);
      if (!window.globalBreadcrumbTrail) window.globalBreadcrumbTrail = [];
      this._registerDebugCommands();
    }
  }
  
  light(ledId: number, data?: any): void {
    const ledName = this.getLEDName(ledId);
    
    const breadcrumb: Breadcrumb = {
      id: ledId,
      name: ledName,
      component: this.componentName,
      timestamp: Date.now(),
      duration: Date.now() - this.startTime,
      data,
      success: true
    };
    
    this.sequence.push(breadcrumb);
    
    // Console output with VoiceCoach-specific formatting
    let icon = '💡';
    if (100 <= ledId && ledId <= 199) icon = '🔵'; // User interactions
    else if (200 <= ledId && ledId <= 299) icon = '🟢'; // API operations
    else if (300 <= ledId && ledId <= 399) icon = '🟡'; // State management
    else if (400 <= ledId && ledId <= 499) icon = '🟣'; // UI operations
    else if (500 <= ledId && ledId <= 599) icon = '🔴'; // Validation & processing
    
    console.log(
      `${icon} ${String(ledId).padStart(3, '0')} ✅ ${ledName} [${this.componentName}]`,
      data || ''
    );
    
    // Update global trail
    if (typeof window !== 'undefined') {
      window.globalBreadcrumbTrail!.push(breadcrumb);
      this.limitTrail();
    }
  }
  
  fail(ledId: number, error: Error): void {
    const ledName = this.getLEDName(ledId);
    
    const breadcrumb: Breadcrumb = {
      id: ledId,
      name: ledName,
      component: this.componentName,
      timestamp: Date.now(),
      duration: Date.now() - this.startTime,
      success: false,
      error: error.message,
      stack: error.stack
    };
    
    this.sequence.push(breadcrumb);
    
    // Error output with component context
    console.error(
      `💡 ${String(ledId).padStart(3, '0')} ❌ ${ledName} [${this.componentName}]`,
      error
    );
    
    // Store for error detection
    if (typeof window !== 'undefined') {
      if (!window.breadcrumbFailures) window.breadcrumbFailures = [];
      window.breadcrumbFailures.push(breadcrumb);
      window.globalBreadcrumbTrail!.push(breadcrumb);
    }
  }
  
  /**
   * Record performance checkpoint for document processing operations
   */
  performanceCheckpoint(ledId: number, operation: string, durationMs: number, metadata: Record<string, any> = {}): void {
    const perfData = {
      operation,
      duration_ms: durationMs,
      metadata,
      ...this._getPerformanceWarnings(operation, durationMs)
    };
    
    this.light(ledId, perfData);
  }
  
  private _getPerformanceWarnings(operation: string, durationMs: number): { warning?: string } {
    const thresholds = {
      'tauri_invoke': 1000,
      'document_processing': 5000,
      'knowledge_search': 2000,
      'file_selection': 500,
      'ui_render': 100
    };
    
    const threshold = thresholds[operation as keyof typeof thresholds];
    if (threshold && durationMs > threshold) {
      return { warning: `${operation} exceeded ${threshold}ms target: ${durationMs.toFixed(1)}ms` };
    }
    
    return {};
  }
  
  private getLEDName(ledId: number): string {
    // User Interactions (100-199)
    if (ledId >= 100 && ledId <= 199) {
      const ledMap: Record<number, string> = {
        100: 'USER_INTERACTION_START',
        101: 'DIRECTORY_SELECT_CLICK',
        102: 'PROCESS_DOCUMENTS_CLICK',
        103: 'SEARCH_INPUT_CHANGE',
        104: 'SEARCH_BUTTON_CLICK',
        105: 'VALIDATE_BUTTON_CLICK',
        106: 'REFRESH_STATS_CLICK',
        107: 'FILE_DIALOG_OPEN',
        108: 'FILE_DIALOG_CONFIRM',
        109: 'SEARCH_ENTER_KEY',
        110: 'MODAL_OPEN',
        111: 'MODAL_CLOSE',
        120: 'DRAG_START',
        121: 'DRAG_END',
        122: 'DROP_TARGET_ENTER',
        123: 'DROP_TARGET_LEAVE',
        130: 'FORM_SUBMIT',
        131: 'FORM_VALIDATION',
        140: 'TAB_CHANGE',
        141: 'ACCORDION_TOGGLE'
      };
      return ledMap[ledId] || `USER_INTERACTION_${ledId}`;
    }
    
    // API Operations (200-299)
    else if (ledId >= 200 && ledId <= 299) {
      const ledMap: Record<number, string> = {
        200: 'API_OPERATION_START',
        201: 'TAURI_INVOKE_START',
        202: 'TAURI_INVOKE_COMPLETE',
        203: 'PROCESS_DOCUMENTS_API_START',
        204: 'PROCESS_DOCUMENTS_API_COMPLETE',
        205: 'SEARCH_KNOWLEDGE_API_START',
        206: 'SEARCH_KNOWLEDGE_API_COMPLETE',
        207: 'GET_STATS_API_START',
        208: 'GET_STATS_API_COMPLETE',
        209: 'VALIDATE_KB_API_START',
        210: 'VALIDATE_KB_API_COMPLETE',
        211: 'GET_COACHING_API_START',
        212: 'GET_COACHING_API_COMPLETE',
        220: 'PYTHON_SCRIPT_EXECUTE_START',
        221: 'PYTHON_SCRIPT_EXECUTE_COMPLETE',
        222: 'CHROMADB_OPERATION_START',
        223: 'CHROMADB_OPERATION_COMPLETE',
        230: 'FILE_SYSTEM_ACCESS_START',
        231: 'FILE_SYSTEM_ACCESS_COMPLETE',
        240: 'ERROR_HANDLING_START',
        241: 'ERROR_HANDLING_COMPLETE',
        250: 'RETRY_MECHANISM_START',
        251: 'RETRY_MECHANISM_COMPLETE'
      };
      return ledMap[ledId] || `API_OPERATION_${ledId}`;
    }
    
    // State Management (300-399)
    else if (ledId >= 300 && ledId <= 399) {
      const ledMap: Record<number, string> = {
        300: 'STATE_UPDATE_START',
        301: 'PROCESSING_STATS_UPDATE',
        302: 'KNOWLEDGE_STATS_UPDATE',
        303: 'SEARCH_RESULTS_UPDATE',
        304: 'SEARCH_QUERY_UPDATE',
        305: 'SELECTED_DIRECTORY_UPDATE',
        306: 'IS_PROCESSING_UPDATE',
        307: 'IS_SEARCHING_UPDATE',
        308: 'ERROR_STATE_UPDATE',
        309: 'LOADING_STATE_UPDATE',
        310: 'FORM_STATE_UPDATE',
        320: 'CONTEXT_UPDATE_START',
        321: 'CONTEXT_UPDATE_COMPLETE',
        330: 'STORE_DISPATCH_START',
        331: 'STORE_DISPATCH_COMPLETE',
        340: 'LOCAL_STORAGE_UPDATE',
        341: 'SESSION_STORAGE_UPDATE',
        350: 'CACHE_UPDATE_START',
        351: 'CACHE_UPDATE_COMPLETE'
      };
      return ledMap[ledId] || `STATE_UPDATE_${ledId}`;
    }
    
    // UI Operations (400-499)
    else if (ledId >= 400 && ledId <= 499) {
      const ledMap: Record<number, string> = {
        400: 'UI_OPERATION_START',
        401: 'COMPONENT_RENDER_START',
        402: 'COMPONENT_RENDER_COMPLETE',
        403: 'STATS_DISPLAY_UPDATE',
        404: 'SEARCH_RESULTS_DISPLAY',
        405: 'PROGRESS_INDICATOR_UPDATE',
        406: 'ERROR_MESSAGE_DISPLAY',
        407: 'SUCCESS_MESSAGE_DISPLAY',
        408: 'LOADING_SPINNER_SHOW',
        409: 'LOADING_SPINNER_HIDE',
        410: 'MODAL_RENDER_START',
        411: 'MODAL_RENDER_COMPLETE',
        420: 'FORM_RENDER_START',
        421: 'FORM_RENDER_COMPLETE',
        430: 'LIST_RENDER_START',
        431: 'LIST_RENDER_COMPLETE',
        440: 'NAVIGATION_UPDATE',
        441: 'BREADCRUMB_UPDATE',
        450: 'TOOLTIP_SHOW',
        451: 'TOOLTIP_HIDE',
        460: 'NOTIFICATION_SHOW',
        461: 'NOTIFICATION_HIDE'
      };
      return ledMap[ledId] || `UI_OPERATION_${ledId}`;
    }
    
    // Validation & Processing (500-599)
    else if (ledId >= 500 && ledId <= 599) {
      const ledMap: Record<number, string> = {
        500: 'VALIDATION_START',
        501: 'FORM_VALIDATION_START',
        502: 'FORM_VALIDATION_COMPLETE',
        503: 'INPUT_VALIDATION_START',
        504: 'INPUT_VALIDATION_COMPLETE',
        505: 'FILE_VALIDATION_START',
        506: 'FILE_VALIDATION_COMPLETE',
        507: 'DIRECTORY_VALIDATION_START',
        508: 'DIRECTORY_VALIDATION_COMPLETE',
        510: 'DATA_PROCESSING_START',
        511: 'DATA_PROCESSING_COMPLETE',
        512: 'DATA_TRANSFORMATION_START',
        513: 'DATA_TRANSFORMATION_COMPLETE',
        520: 'DOCUMENT_PARSING_START',
        521: 'DOCUMENT_PARSING_COMPLETE',
        522: 'CHUNKING_STRATEGY_START',
        523: 'CHUNKING_STRATEGY_COMPLETE',
        530: 'EMBEDDING_GENERATION_START',
        531: 'EMBEDDING_GENERATION_COMPLETE',
        540: 'SIMILARITY_CALCULATION_START',
        541: 'SIMILARITY_CALCULATION_COMPLETE',
        550: 'PERFORMANCE_MEASUREMENT_START',
        551: 'PERFORMANCE_MEASUREMENT_COMPLETE',
        560: 'HEALTH_CHECK_START',
        561: 'HEALTH_CHECK_COMPLETE'
      };
      return ledMap[ledId] || `VALIDATION_PROCESSING_${ledId}`;
    }
    
    return `OPERATION_${ledId}`;
  }
  
  private limitTrail(): void {
    if (typeof window !== 'undefined' && window.globalBreadcrumbTrail && window.globalBreadcrumbTrail.length > 1000) {
      window.globalBreadcrumbTrail = window.globalBreadcrumbTrail.slice(-500);
    }
  }
  
  private _registerDebugCommands(): void {
    if (typeof window !== 'undefined') {
      if (!window.debug) {
        window.debug = {
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
            getKnowledgeSearchStats: () => ({})
          }
        };
      }
      
      window.debug.breadcrumbs = {
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
            successful_operations: processingOps.filter(bc => bc.success).length,
            failed_operations: processingOps.filter(bc => !bc.success).length,
            average_duration: processingOps.length > 0 
              ? processingOps.reduce((sum, bc) => sum + bc.duration, 0) / processingOps.length 
              : 0,
            operations: processingOps
          };
        },
        
        getTauriOperationStats: () => {
          const trail = window.globalBreadcrumbTrail || [];
          const tauriOps = trail.filter(bc => 
            bc.name.includes('TAURI') || bc.name.includes('API')
          );
          
          const stats: Record<string, any> = {};
          tauriOps.forEach(bc => {
            const operation = bc.name;
            if (!stats[operation]) {
              stats[operation] = { count: 0, total_duration: 0, failures: 0 };
            }
            stats[operation].count++;
            stats[operation].total_duration += bc.duration;
            if (!bc.success) stats[operation].failures++;
          });
          
          // Calculate averages
          Object.keys(stats).forEach(op => {
            stats[op].avg_duration = stats[op].total_duration / stats[op].count;
            stats[op].success_rate = (stats[op].count - stats[op].failures) / stats[op].count;
          });
          
          return stats;
        },
        
        getKnowledgeSearchStats: () => {
          const trail = window.globalBreadcrumbTrail || [];
          const searchOps = trail.filter(bc => 
            bc.name.includes('SEARCH') && bc.component === 'KnowledgeBaseManager'
          );
          
          return {
            total_searches: searchOps.length,
            successful_searches: searchOps.filter(bc => bc.success).length,
            average_search_time: searchOps.length > 0 
              ? searchOps.reduce((sum, bc) => sum + bc.duration, 0) / searchOps.length 
              : 0,
            recent_searches: searchOps.slice(-10),
            search_performance: searchOps.map(bc => ({
              query: bc.data?.query || 'Unknown',
              duration: bc.duration,
              results_count: bc.data?.results_count || 0,
              success: bc.success
            }))
          };
        }
      };
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