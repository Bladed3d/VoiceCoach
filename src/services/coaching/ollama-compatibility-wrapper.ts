/**
 * VoiceCoach V2 - Ollama Compatibility Wrapper
 * Provides safe transition between old and enhanced Ollama systems
 * Allows parallel testing without breaking existing functionality
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { OllamaCoachingService, CoachingResponse as OldResponse } from './ollama-service';
import { EnhancedOllamaService, EnhancedCoachingContext } from './ollama-service-enhanced';
import { CoachingResponse as EnhancedResponse } from './OllamaPromptBuilder';

export interface UnifiedCoachingContext {
  // Common fields that both systems use
  currentTranscript: string;
  processedInsights?: any;
  
  // Enhanced fields (optional for backward compatibility)
  conversationHistory?: Array<{
    speaker: 'user' | 'prospect';
    text: string;
    timestamp: string;
  }>;
  callStartTime?: Date;
  callDuration?: number;
}

export interface UnifiedCoachingResponse {
  // Current app expected fields
  suggestion: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'objection_handling' | 'discovery' | 'closing' | 'value_prop';
  trigger: string;
  context: string;
  confidence: number;
  
  // Enhanced fields (optional for new UI features)
  nextActions?: string[];
  fallbackPhrase?: string;
  avoidSaying?: string;
  supportingEvidence?: string[];
  urgencyLevel?: 'critical' | 'high' | 'medium' | 'low';
}

export class OllamaCompatibilityWrapper {
  private trail: BreadcrumbTrail;
  private oldService: OllamaCoachingService;
  private enhancedService: EnhancedOllamaService;
  private useEnhanced: boolean;
  private performanceMetrics: {
    oldSystemCalls: number;
    enhancedSystemCalls: number;
    oldSystemResponseTime: number[];
    enhancedSystemResponseTime: number[];
    oldSystemSuccesses: number;
    enhancedSystemSuccesses: number;
  };
  
  constructor() {
    this.trail = new BreadcrumbTrail('OllamaWrapper');
    
    // Initialize both services
    const config = {
      baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama2',
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 500
    };
    
    this.oldService = new OllamaCoachingService(config);
    this.enhancedService = new EnhancedOllamaService(config);
    
    // Check feature flag from environment or localStorage
    this.useEnhanced = this.checkFeatureFlag();
    
    // Initialize metrics
    this.performanceMetrics = {
      oldSystemCalls: 0,
      enhancedSystemCalls: 0,
      oldSystemResponseTime: [],
      enhancedSystemResponseTime: [],
      oldSystemSuccesses: 0,
      enhancedSystemSuccesses: 0
    };
    
    this.trail.light(6250, {
      wrapper_initialized: true,
      use_enhanced: this.useEnhanced,
      feature_flag_source: this.getFeatureFlagSource()
    });
  }
  
  /**
   * Check if enhanced system should be used
   */
  private checkFeatureFlag(): boolean {
    // Priority order for feature flag:
    // 1. Environment variable
    if (process.env.USE_ENHANCED_OLLAMA) {
      return process.env.USE_ENHANCED_OLLAMA === 'true';
    }
    
    // 2. LocalStorage (for runtime toggling)
    if (typeof window !== 'undefined' && window.localStorage) {
      const flag = localStorage.getItem('voicecoach_use_enhanced_ollama');
      if (flag !== null) {
        return flag === 'true';
      }
    }
    
    // 3. Default to false (use old system)
    return false;
  }
  
  /**
   * Get source of feature flag for debugging
   */
  private getFeatureFlagSource(): string {
    if (process.env.USE_ENHANCED_OLLAMA) return 'environment';
    if (typeof window !== 'undefined' && window.localStorage?.getItem('voicecoach_use_enhanced_ollama')) {
      return 'localStorage';
    }
    return 'default';
  }
  
  /**
   * Toggle between old and enhanced system at runtime
   */
  toggleSystem(useEnhanced?: boolean): void {
    if (useEnhanced !== undefined) {
      this.useEnhanced = useEnhanced;
    } else {
      this.useEnhanced = !this.useEnhanced;
    }
    
    // Save preference
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('voicecoach_use_enhanced_ollama', this.useEnhanced.toString());
    }
    
    this.trail.light(6251, {
      system_toggled: true,
      now_using: this.useEnhanced ? 'enhanced' : 'old',
      timestamp: Date.now()
    });
    
    console.log(`🔄 Ollama system switched to: ${this.useEnhanced ? 'ENHANCED' : 'ORIGINAL'}`);
  }
  
  /**
   * Connect to Ollama (both systems)
   */
  async connect(): Promise<boolean> {
    try {
      const oldConnected = await this.oldService.connect();
      const enhancedConnected = await this.enhancedService.connect();
      
      this.trail.light(6252, {
        old_system_connected: oldConnected,
        enhanced_system_connected: enhancedConnected
      });
      
      return oldConnected || enhancedConnected;
      
    } catch (error) {
      this.trail.fail(8250, error as Error);
      return false;
    }
  }
  
  /**
   * Get coaching suggestion - routes to appropriate system
   */
  async getCoachingSuggestion(context: UnifiedCoachingContext): Promise<UnifiedCoachingResponse | null> {
    const startTime = Date.now();
    
    try {
      if (this.useEnhanced) {
        return await this.getEnhancedSuggestion(context, startTime);
      } else {
        return await this.getOldSuggestion(context, startTime);
      }
      
    } catch (error) {
      this.trail.fail(8251, error as Error);
      
      // If enhanced fails, fall back to old
      if (this.useEnhanced) {
        console.warn('⚠️ Enhanced system failed, falling back to original');
        this.useEnhanced = false;
        return await this.getOldSuggestion(context, startTime);
      }
      
      return null;
    }
  }
  
  /**
   * Get suggestion from old system
   */
  private async getOldSuggestion(
    context: UnifiedCoachingContext, 
    startTime: number
  ): Promise<UnifiedCoachingResponse | null> {
    
    this.trail.light(6253, {
      using_system: 'old',
      transcript_length: context.currentTranscript.length
    });
    
    // Convert to old context format
    const oldContext = {
      originalDocument: '',
      processedInsights: context.processedInsights,
      conversationHistory: context.conversationHistory || [],
      currentTranscript: context.currentTranscript
    };
    
    const response = await this.oldService.getCoachingSuggestion(oldContext);
    
    if (response) {
      // Track metrics
      const responseTime = Date.now() - startTime;
      this.performanceMetrics.oldSystemCalls++;
      this.performanceMetrics.oldSystemResponseTime.push(responseTime);
      this.performanceMetrics.oldSystemSuccesses++;
      
      this.trail.light(6254, {
        old_system_success: true,
        response_time_ms: responseTime
      });
      
      // Return in unified format (already matches)
      return {
        suggestion: response.suggestion,
        priority: response.priority,
        category: response.category,
        trigger: response.trigger,
        context: response.context,
        confidence: response.confidence
      };
    }
    
    return null;
  }
  
  /**
   * Get suggestion from enhanced system
   */
  private async getEnhancedSuggestion(
    context: UnifiedCoachingContext,
    startTime: number
  ): Promise<UnifiedCoachingResponse | null> {
    
    this.trail.light(6255, {
      using_system: 'enhanced',
      transcript_length: context.currentTranscript.length,
      has_call_time: !!context.callStartTime
    });
    
    // Convert to enhanced context format
    const enhancedContext: EnhancedCoachingContext = {
      currentTranscript: context.currentTranscript,
      conversationHistory: context.conversationHistory || [],
      callStartTime: context.callStartTime,
      callDuration: context.callDuration,
      processedInsights: context.processedInsights
    };
    
    const response = await this.enhancedService.getCoachingSuggestion(enhancedContext);
    
    if (response) {
      // Track metrics
      const responseTime = Date.now() - startTime;
      this.performanceMetrics.enhancedSystemCalls++;
      this.performanceMetrics.enhancedSystemResponseTime.push(responseTime);
      this.performanceMetrics.enhancedSystemSuccesses++;
      
      this.trail.light(6256, {
        enhanced_system_success: true,
        response_time_ms: responseTime,
        urgency_level: response.urgency_level,
        confidence: response.confidence_score
      });
      
      // Convert to unified format with backward compatibility
      return this.convertEnhancedToUnified(response);
    }
    
    return null;
  }
  
  /**
   * Convert enhanced response to unified format
   */
  private convertEnhancedToUnified(enhanced: EnhancedResponse): UnifiedCoachingResponse {
    // Map urgency levels to old priority system
    const priorityMap = {
      'critical': 'HIGH' as const,
      'high': 'HIGH' as const,
      'medium': 'MEDIUM' as const,
      'low': 'LOW' as const
    };
    
    // Map prompt types to categories
    const categoryMap = {
      'objection_handling': 'objection_handling' as const,
      'discovery': 'discovery' as const,
      'demo': 'value_prop' as const,
      'closing': 'closing' as const,
      'rapport_building': 'discovery' as const,
      'value_prop': 'value_prop' as const
    };
    
    return {
      // Required fields for backward compatibility
      suggestion: enhanced.primary_suggestion,
      priority: priorityMap[enhanced.urgency_level],
      category: categoryMap[enhanced.prompt_type] || 'discovery',
      trigger: enhanced.exact_phrase || enhanced.primary_suggestion.substring(0, 50),
      context: enhanced.supporting_evidence.join('. '),
      confidence: enhanced.confidence_score,
      
      // Enhanced fields for new features
      nextActions: enhanced.next_best_actions,
      fallbackPhrase: enhanced.fallback_phrase,
      avoidSaying: enhanced.avoid_saying,
      supportingEvidence: enhanced.supporting_evidence,
      urgencyLevel: enhanced.urgency_level
    };
  }
  
  /**
   * Get performance comparison metrics
   */
  getPerformanceMetrics(): any {
    const avgOldTime = this.performanceMetrics.oldSystemResponseTime.length > 0
      ? this.performanceMetrics.oldSystemResponseTime.reduce((a, b) => a + b, 0) / this.performanceMetrics.oldSystemResponseTime.length
      : 0;
      
    const avgEnhancedTime = this.performanceMetrics.enhancedSystemResponseTime.length > 0
      ? this.performanceMetrics.enhancedSystemResponseTime.reduce((a, b) => a + b, 0) / this.performanceMetrics.enhancedSystemResponseTime.length
      : 0;
    
    return {
      currentSystem: this.useEnhanced ? 'enhanced' : 'old',
      metrics: {
        old: {
          calls: this.performanceMetrics.oldSystemCalls,
          successes: this.performanceMetrics.oldSystemSuccesses,
          successRate: this.performanceMetrics.oldSystemCalls > 0 
            ? (this.performanceMetrics.oldSystemSuccesses / this.performanceMetrics.oldSystemCalls * 100).toFixed(1) + '%'
            : 'N/A',
          avgResponseTime: avgOldTime.toFixed(0) + 'ms'
        },
        enhanced: {
          calls: this.performanceMetrics.enhancedSystemCalls,
          successes: this.performanceMetrics.enhancedSystemSuccesses,
          successRate: this.performanceMetrics.enhancedSystemCalls > 0
            ? (this.performanceMetrics.enhancedSystemSuccesses / this.performanceMetrics.enhancedSystemCalls * 100).toFixed(1) + '%'
            : 'N/A',
          avgResponseTime: avgEnhancedTime.toFixed(0) + 'ms'
        },
        comparison: {
          speedImprovement: avgOldTime > 0 && avgEnhancedTime > 0
            ? ((avgOldTime - avgEnhancedTime) / avgOldTime * 100).toFixed(1) + '%'
            : 'N/A'
        }
      }
    };
  }
  
  /**
   * Run parallel test to compare both systems
   */
  async runParallelTest(context: UnifiedCoachingContext): Promise<{
    old: UnifiedCoachingResponse | null;
    enhanced: UnifiedCoachingResponse | null;
    comparison: any;
  }> {
    console.log('🧪 Running parallel Ollama system test...');
    
    // Run both systems in parallel
    const [oldResult, enhancedResult] = await Promise.all([
      this.getOldSuggestion(context, Date.now()),
      this.getEnhancedSuggestion(context, Date.now())
    ]);
    
    // Compare results
    const comparison = {
      bothResponded: !!(oldResult && enhancedResult),
      sameSuggestion: oldResult?.suggestion === enhancedResult?.suggestion,
      confidenceDiff: enhancedResult && oldResult 
        ? (enhancedResult.confidence - oldResult.confidence).toFixed(2)
        : 'N/A',
      enhancedHasMore: !!(enhancedResult?.nextActions && enhancedResult?.supportingEvidence)
    };
    
    console.log('📊 Parallel test results:', comparison);
    
    return {
      old: oldResult,
      enhanced: enhancedResult,
      comparison
    };
  }
}

// Export singleton instance
export const ollamaWrapper = new OllamaCompatibilityWrapper();

// Export convenience function for runtime toggling
export function toggleOllamaSystem(useEnhanced?: boolean): void {
  ollamaWrapper.toggleSystem(useEnhanced);
}

// Export function to check current system
export function getCurrentOllamaSystem(): 'enhanced' | 'old' {
  return ollamaWrapper.getPerformanceMetrics().currentSystem;
}