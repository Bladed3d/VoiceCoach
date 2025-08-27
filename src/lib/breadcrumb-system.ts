// VoiceCoach V2 LED Breadcrumb System
// Clean, focused debugging and monitoring system

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

export interface VerificationResult {
  expect: any;
  actual: any;
  validator?: (actual: any) => boolean;
}

declare global {
  interface Window {
    breadcrumbs?: Map<string, BreadcrumbTrail>;
    globalBreadcrumbTrail?: Breadcrumb[];
    breadcrumbFailures?: Breadcrumb[];
    debug?: {
      breadcrumbs: {
        getAll: () => Breadcrumb[];
        getRange: (start: number, end: number) => Breadcrumb[];
        getFailures: () => Breadcrumb[];
        getComponent: (name: string) => Breadcrumb[] | undefined;
        clear: () => void;
        checkRange: (start: number, end: number) => { passed: boolean; missing: number[]; failed: number[] };
        getQualityScore: () => number;
      }
    };
  }
}

export class BreadcrumbTrail {
  public sequence: Breadcrumb[] = [];
  private componentName: string;
  private assertions: Array<{ ledId: number; passed: boolean; expect: any; actual: any; timestamp: number }> = [];

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
    
    // Console output with emoji
    console.log(`🎵 LED ${ledId}: ${breadcrumb.name} - ${JSON.stringify(data || {})} ${this.componentName}_${ledId}`);
  }

  lightWithVerification(
    ledId: number, 
    data: any,
    verification?: VerificationResult
  ): boolean {
    // Standard LED lighting
    this.light(ledId, data);
    
    // Verification step
    if (verification) {
      const passed = verification.validator 
        ? verification.validator(verification.actual)
        : JSON.stringify(verification.expect) === JSON.stringify(verification.actual);
      
      if (!passed) {
        this.fail(ledId, new Error(
          `Verification failed: Expected ${JSON.stringify(verification.expect)}, ` +
          `got ${JSON.stringify(verification.actual)}`
        ));
        return false;
      }
      
      this.assertions.push({
        ledId,
        passed,
        expect: verification.expect,
        actual: verification.actual,
        timestamp: Date.now()
      });
    }
    
    return true;
  }

  checkpoint(
    ledId: number,
    checkpointName: string,
    validationFn: () => boolean,
    data?: any
  ): boolean {
    const passed = validationFn();
    
    if (passed) {
      this.light(ledId, { 
        checkpoint: checkpointName, 
        status: 'PASSED',
        ...data 
      });
    } else {
      this.fail(ledId, new Error(`Checkpoint failed: ${checkpointName}`));
    }
    
    return passed;
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
    
    // Console error output
    console.error(`❌ LED ${ledId} FAILED [${this.componentName}]: ${breadcrumb.name} ${error.message}`);
  }

  getVerificationSummary() {
    const failures = this.sequence.filter(led => !led.success);
    const assertions = this.assertions;
    
    return {
      totalLEDs: this.sequence.length,
      failures: failures.length,
      assertionsPassed: assertions.filter(a => a.passed).length,
      assertionsFailed: assertions.filter(a => !a.passed).length,
      failureRate: failures.length / Math.max(this.sequence.length, 1),
      criticalFailures: failures.filter(f => f.id >= 8000 && f.id < 9000),
      verificationPassed: failures.length === 0 && assertions.every(a => a.passed)
    };
  }

  private _getLedName(ledId: number): string {
    // V2 LED naming based on ranges
    if (ledId >= 1000 && ledId < 2000) return 'APP_LIFECYCLE';
    if (ledId >= 2000 && ledId < 3000) return 'DOCUMENT_OPERATIONS';
    if (ledId >= 3000 && ledId < 4000) return 'RAG_PHASE_1A';
    if (ledId >= 4000 && ledId < 5000) return 'RAG_PHASE_1B';
    if (ledId >= 5000 && ledId < 6000) return 'RAG_PHASE_1C';
    if (ledId >= 6000 && ledId < 7000) return 'LIVE_COACHING';
    if (ledId >= 7000 && ledId < 8000) return 'UI_INTERACTIONS';
    if (ledId >= 8000 && ledId < 9000) return 'ERROR_HANDLING';
    if (ledId >= 9000 && ledId < 10000) return 'TESTING_VALIDATION';
    
    return `LED_${ledId}`;
  }

  private _registerDebugCommands(): void {
    if (typeof window !== 'undefined' && !window.debug) {
      window.debug = {
        breadcrumbs: {
          getAll: () => window.globalBreadcrumbTrail || [],
          getRange: (start: number, end: number) => 
            (window.globalBreadcrumbTrail || []).filter(b => b.id >= start && b.id <= end),
          getFailures: () => window.breadcrumbFailures || [],
          getComponent: (name: string) => window.breadcrumbs?.get(name)?.sequence,
          clear: () => {
            window.globalBreadcrumbTrail = [];
            window.breadcrumbFailures = [];
            window.breadcrumbs?.forEach(trail => trail.sequence = []);
          },
          checkRange: (start: number, end: number) => {
            const leds = (window.globalBreadcrumbTrail || []).filter(b => b.id >= start && b.id <= end);
            const failed = leds.filter(b => !b.success).map(b => b.id);
            const existing = leds.map(b => b.id);
            const expected = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            const missing = expected.filter(id => !existing.includes(id));
            
            return {
              passed: failed.length === 0 && missing.length === 0,
              missing,
              failed
            };
          },
          getQualityScore: () => {
            const total = window.globalBreadcrumbTrail?.length || 0;
            const failures = window.breadcrumbFailures?.length || 0;
            if (total === 0) return 0;
            return Math.round(((total - failures) / total) * 100);
          }
        }
      };
    }
  }
}