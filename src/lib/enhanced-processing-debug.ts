/**
 * VoiceCoach V2 - Enhanced Processing Debug Interface
 * Console tools for monitoring enhanced debounce processing performance
 */

// Extend window debug interface for enhanced processing monitoring
declare global {
  interface Window {
    debug: {
      breadcrumbs: any;
      enhancedProcessing: {
        getReport(): any;
        getStatus(): any;
        reset(): void;
        toggle(): boolean;
        monitor(): void;
        stopMonitor(): void;
        testPerformance(): void;
        getLEDs(): any[];
        getTimings(): any;
      };
    };
  }
}

let monitorInterval: NodeJS.Timeout | null = null;

// Enhanced processing debug tools
export const enhancedProcessingDebug = {
  /**
   * Get full performance report
   */
  getReport(): any {
    try {
      // Get LiveCoachingService instance from SessionManager
      const sessionManager = (window as any).sessionManager;
      if (!sessionManager?.liveCoaching) {
        console.warn('⚠️ LiveCoachingService not available');
        return null;
      }

      const report = sessionManager.liveCoaching.getPerformanceReport();

      console.log('📊 Enhanced Processing Performance Report:');
      console.log(`⚡ Average Speed Improvement: ${report.averageSpeedImprovement}ms`);
      console.log(`✅ Processing Success Rate: ${report.processingSuccessRate}%`);
      console.log(`🎯 Average Context Richness: ${report.averageContextRichness}%`);
      console.log(`💡 Recommendation: ${report.recommendation}`);

      return report;
    } catch (error) {
      console.error('❌ Failed to get performance report:', error);
      return null;
    }
  },

  /**
   * Get current processing status
   */
  getStatus(): any {
    try {
      const sessionManager = (window as any).sessionManager;
      if (!sessionManager?.liveCoaching) {
        console.warn('⚠️ LiveCoachingService not available');
        return null;
      }

      const status = sessionManager.liveCoaching.getProcessingStatus();

      console.log('🔄 Enhanced Processing Status:');
      console.log(`⏳ Currently Processing: ${status.isProcessing ? 'Yes' : 'No'}`);
      console.log(`⏱️ Queued Processing: ${status.queuedProcessing ? 'Yes' : 'No'}`);
      console.log(`📈 Last Processing Time: ${status.lastProcessingTime}ms`);
      console.log(`📊 Average Processing Time: ${status.averageProcessingTime}ms`);

      return status;
    } catch (error) {
      console.error('❌ Failed to get processing status:', error);
      return null;
    }
  },

  /**
   * Reset performance tracking
   */
  reset(): void {
    try {
      const sessionManager = (window as any).sessionManager;
      if (!sessionManager?.liveCoaching) {
        console.warn('⚠️ LiveCoachingService not available');
        return;
      }

      sessionManager.liveCoaching.resetPerformanceTracking();
      console.log('🔄 Performance tracking reset');
    } catch (error) {
      console.error('❌ Failed to reset performance tracking:', error);
    }
  },

  /**
   * Toggle enhanced processing for A/B testing
   */
  toggle(): boolean {
    try {
      const sessionManager = (window as any).sessionManager;
      if (!sessionManager?.liveCoaching) {
        console.warn('⚠️ LiveCoachingService not available');
        return false;
      }

      const result = sessionManager.liveCoaching.toggleEnhancedProcessing();
      console.log(`🔀 Enhanced processing ${result ? 'enabled' : 'disabled'}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to toggle enhanced processing:', error);
      return false;
    }
  },

  /**
   * Start real-time monitoring
   */
  monitor(): void {
    if (monitorInterval) {
      console.log('📡 Monitor already running');
      return;
    }

    console.log('📡 Starting enhanced processing monitor...');
    console.log('Use window.debug.enhancedProcessing.stopMonitor() to stop');

    monitorInterval = setInterval(() => {
      const status = this.getStatus();
      if (status) {
        // Show compact status update
        const emoji = status.isProcessing ? '⚡' : status.queuedProcessing ? '⏳' : '💤';
        console.log(`${emoji} Processing: ${status.lastProcessingTime}ms | Avg: ${status.averageProcessingTime}ms`);
      }
    }, 2000);
  },

  /**
   * Stop real-time monitoring
   */
  stopMonitor(): void {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
      console.log('📡 Enhanced processing monitor stopped');
    } else {
      console.log('📡 No monitor running');
    }
  },

  /**
   * Run performance test
   */
  testPerformance(): void {
    console.log('🧪 Running enhanced processing performance test...');

    // Get baseline measurement
    const before = this.getReport();

    console.log('📊 Test will run for 30 seconds, monitoring performance...');
    console.log('💬 Generate some conversation activity to see enhanced processing in action');

    // Monitor for 30 seconds
    let testCount = 0;
    const testInterval = setInterval(() => {
      testCount++;
      console.log(`🔍 Test progress: ${testCount}/15 (${testCount * 2}s)`);

      if (testCount >= 15) {
        clearInterval(testInterval);

        const after = this.getReport();

        console.log('✅ Performance test complete!');
        console.log('📈 Results comparison:');

        if (before && after) {
          const speedDiff = after.averageSpeedImprovement - before.averageSpeedImprovement;
          const qualityDiff = after.averageContextRichness - before.averageContextRichness;

          console.log(`⚡ Speed change: ${speedDiff > 0 ? '+' : ''}${speedDiff}ms`);
          console.log(`🎯 Quality change: ${qualityDiff > 0 ? '+' : ''}${qualityDiff}%`);
        }
      }
    }, 2000);
  },

  /**
   * Get enhanced processing LEDs
   */
  getLEDs(): any[] {
    if (!window.debug?.breadcrumbs) {
      console.warn('⚠️ Breadcrumb system not available');
      return [];
    }

    // Get enhanced processing LED ranges
    const processingLEDs = window.debug.breadcrumbs.getRange(6400, 6499);

    console.log('🔍 Enhanced Processing LEDs (6400-6499):');
    processingLEDs.forEach((led: any) => {
      const status = led.success ? '✅' : '❌';
      console.log(`${status} LED ${led.number}: ${led.operation} (${led.duration || 0}ms)`);
    });

    return processingLEDs;
  },

  /**
   * Get processing timings breakdown
   */
  getTimings(): any {
    const leds = this.getLEDs();

    const timings = {
      conversationJSON: 0,
      backgroundAnalysis: 0,
      contextBuilding: 0,
      ollamaCall: 0,
      totalEnhanced: 0
    };

    leds.forEach((led: any) => {
      if (led.operation.includes('conversation_json')) {
        timings.conversationJSON = led.duration || 0;
      } else if (led.operation.includes('background_analysis')) {
        timings.backgroundAnalysis = led.duration || 0;
      } else if (led.operation.includes('enhanced_context')) {
        timings.contextBuilding = led.duration || 0;
      } else if (led.operation.includes('enhanced_processing_complete')) {
        timings.totalEnhanced = led.duration || 0;
      }
    });

    console.log('⏱️ Processing Timings Breakdown:');
    console.log(`📝 Conversation JSON: ${timings.conversationJSON}ms`);
    console.log(`🔍 Background Analysis: ${timings.backgroundAnalysis}ms`);
    console.log(`🎯 Context Building: ${timings.contextBuilding}ms`);
    console.log(`⚡ Total Enhanced: ${timings.totalEnhanced}ms`);

    return timings;
  }
};

// Install debug interface
export function installEnhancedProcessingDebug(): void {
  if (typeof window !== 'undefined') {
    if (!window.debug) {
      window.debug = {} as any;
    }

    window.debug.enhancedProcessing = enhancedProcessingDebug;

    console.log('🔧 Enhanced Processing Debug Interface installed!');
    console.log('📋 Available commands:');
    console.log('  window.debug.enhancedProcessing.getReport() - Performance report');
    console.log('  window.debug.enhancedProcessing.getStatus() - Current status');
    console.log('  window.debug.enhancedProcessing.reset() - Reset tracking');
    console.log('  window.debug.enhancedProcessing.toggle() - Enable/disable');
    console.log('  window.debug.enhancedProcessing.monitor() - Start monitoring');
    console.log('  window.debug.enhancedProcessing.stopMonitor() - Stop monitoring');
    console.log('  window.debug.enhancedProcessing.testPerformance() - Run performance test');
    console.log('  window.debug.enhancedProcessing.getLEDs() - Get LED breadcrumbs');
    console.log('  window.debug.enhancedProcessing.getTimings() - Get timing breakdown');
  }
}

// Auto-install in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  installEnhancedProcessingDebug();
}