/**
 * VoiceCoach Build System LED Breadcrumbs
 * 
 * Traces TypeScript compilation, Vite processing, and Tauri build operations
 * through numbered LED lights for instant error location.
 * 
 * LED Range: 700-799 (Build System Operations)
 */

import { BreadcrumbTrail } from './breadcrumb-system';

// Global build system trail
let buildTrail: BreadcrumbTrail | null = null;

/**
 * Initialize build system breadcrumb trail
 */
export function initializeBuildTrail(): BreadcrumbTrail {
  if (!buildTrail) {
    buildTrail = new BreadcrumbTrail('BuildSystem');
    
    // LED 700: Build system initialization
    buildTrail.light(700, { 
      operation: 'build_system_init',
      timestamp: Date.now(),
      node_env: process.env.NODE_ENV || 'development'
    });
  }
  
  return buildTrail;
}

/**
 * Get the build system trail instance
 */
export function getBuildTrail(): BreadcrumbTrail {
  if (!buildTrail) {
    return initializeBuildTrail();
  }
  return buildTrail;
}

/**
 * TypeScript compilation breadcrumbs
 */
export const TypeScriptBreadcrumbs = {
  compilationStart: () => {
    const trail = getBuildTrail();
    // LED 701: TypeScript compilation start
    trail.light(701, { 
      operation: 'typescript_compilation_start',
      timestamp: Date.now()
    });
  },
  
  fileProcessed: (fileName: string, success: boolean, error?: string) => {
    const trail = getBuildTrail();
    if (success) {
      // LED 702: TypeScript file compiled successfully
      trail.light(702, { 
        operation: 'typescript_file_compiled',
        fileName,
        success: true
      });
    } else {
      // LED 702: TypeScript file compilation failed
      trail.fail(702, new Error(`TypeScript compilation failed for ${fileName}: ${error}`));
    }
  },
  
  compilationComplete: (success: boolean, errors?: string[]) => {
    const trail = getBuildTrail();
    if (success) {
      // LED 703: TypeScript compilation complete
      trail.light(703, { 
        operation: 'typescript_compilation_complete',
        success: true
      });
    } else {
      // LED 703: TypeScript compilation failed
      trail.fail(703, new Error(`TypeScript compilation failed: ${errors?.join(', ')}`));
    }
  }
};

/**
 * Vite build system breadcrumbs
 */
export const ViteBreadcrumbs = {
  buildStart: () => {
    const trail = getBuildTrail();
    // LED 710: Vite build start
    trail.light(710, { 
      operation: 'vite_build_start',
      timestamp: Date.now()
    });
  },
  
  moduleProcessed: (moduleId: string, success: boolean, error?: string) => {
    const trail = getBuildTrail();
    if (success) {
      // LED 711: Vite module processed
      trail.light(711, { 
        operation: 'vite_module_processed',
        moduleId,
        success: true
      });
    } else {
      // LED 711: Vite module processing failed
      trail.fail(711, new Error(`Vite module processing failed for ${moduleId}: ${error}`));
    }
  },
  
  bundleGenerated: (chunkName: string, size: number) => {
    const trail = getBuildTrail();
    // LED 712: Vite bundle generated
    trail.light(712, { 
      operation: 'vite_bundle_generated',
      chunkName,
      size
    });
  },
  
  buildComplete: (success: boolean, errors?: string[]) => {
    const trail = getBuildTrail();
    if (success) {
      // LED 713: Vite build complete
      trail.light(713, { 
        operation: 'vite_build_complete',
        success: true
      });
    } else {
      // LED 713: Vite build failed
      trail.fail(713, new Error(`Vite build failed: ${errors?.join(', ')}`));
    }
  }
};

/**
 * Tauri build system breadcrumbs
 */
export const TauriBreadcrumbs = {
  buildStart: () => {
    const trail = getBuildTrail();
    // LED 720: Tauri build start
    trail.light(720, { 
      operation: 'tauri_build_start',
      timestamp: Date.now()
    });
  },
  
  rustCompilation: (success: boolean, target?: string, error?: string) => {
    const trail = getBuildTrail();
    if (success) {
      // LED 721: Rust compilation success
      trail.light(721, { 
        operation: 'rust_compilation_success',
        target
      });
    } else {
      // LED 721: Rust compilation failed
      trail.fail(721, new Error(`Rust compilation failed for ${target}: ${error}`));
    }
  },
  
  bundleGeneration: (success: boolean, platform?: string, error?: string) => {
    const trail = getBuildTrail();
    if (success) {
      // LED 722: Tauri bundle generated
      trail.light(722, { 
        operation: 'tauri_bundle_generated',
        platform
      });
    } else {
      // LED 722: Tauri bundle generation failed
      trail.fail(722, new Error(`Tauri bundle generation failed for ${platform}: ${error}`));
    }
  },
  
  buildComplete: (success: boolean, outputPath?: string, errors?: string[]) => {
    const trail = getBuildTrail();
    if (success) {
      // LED 723: Tauri build complete
      trail.light(723, { 
        operation: 'tauri_build_complete',
        success: true,
        outputPath
      });
    } else {
      // LED 723: Tauri build failed
      trail.fail(723, new Error(`Tauri build failed: ${errors?.join(', ')}`));
    }
  }
};

/**
 * Development server breadcrumbs
 */
export const DevServerBreadcrumbs = {
  start: (port: number) => {
    const trail = getBuildTrail();
    // LED 730: Development server start
    trail.light(730, { 
      operation: 'dev_server_start',
      port,
      timestamp: Date.now()
    });
  },
  
  ready: (port: number, url: string) => {
    const trail = getBuildTrail();
    // LED 731: Development server ready
    trail.light(731, { 
      operation: 'dev_server_ready',
      port,
      url
    });
  },
  
  fileChange: (fileName: string, changeType: 'added' | 'changed' | 'removed') => {
    const trail = getBuildTrail();
    // LED 732: File change detected
    trail.light(732, { 
      operation: 'dev_server_file_change',
      fileName,
      changeType
    });
  },
  
  hotReload: (success: boolean, fileName?: string, error?: string) => {
    const trail = getBuildTrail();
    if (success) {
      // LED 733: Hot reload success
      trail.light(733, { 
        operation: 'dev_server_hot_reload_success',
        fileName
      });
    } else {
      // LED 733: Hot reload failed
      trail.fail(733, new Error(`Hot reload failed for ${fileName}: ${error}`));
    }
  },
  
  stop: () => {
    const trail = getBuildTrail();
    // LED 734: Development server stop
    trail.light(734, { 
      operation: 'dev_server_stop',
      timestamp: Date.now()
    });
  }
};

/**
 * Asset processing breadcrumbs
 */
export const AssetBreadcrumbs = {
  cssProcessing: (fileName: string, success: boolean, error?: string) => {
    const trail = getBuildTrail();
    if (success) {
      // LED 740: CSS processing success
      trail.light(740, { 
        operation: 'css_processing_success',
        fileName
      });
    } else {
      // LED 740: CSS processing failed
      trail.fail(740, new Error(`CSS processing failed for ${fileName}: ${error}`));
    }
  },
  
  tailwindCompilation: (success: boolean, classes?: number, error?: string) => {
    const trail = getBuildTrail();
    if (success) {
      // LED 741: Tailwind CSS compilation success
      trail.light(741, { 
        operation: 'tailwind_compilation_success',
        classes
      });
    } else {
      // LED 741: Tailwind CSS compilation failed
      trail.fail(741, new Error(`Tailwind CSS compilation failed: ${error}`));
    }
  },
  
  imageOptimization: (fileName: string, originalSize: number, optimizedSize: number) => {
    const trail = getBuildTrail();
    // LED 742: Image optimization complete
    trail.light(742, { 
      operation: 'image_optimization_complete',
      fileName,
      originalSize,
      optimizedSize,
      compressionRatio: ((originalSize - optimizedSize) / originalSize * 100).toFixed(1) + '%'
    });
  }
};

/**
 * Error recovery breadcrumbs
 */
export const ErrorRecoveryBreadcrumbs = {
  errorDetected: (error: Error, context: string) => {
    const trail = getBuildTrail();
    // LED 750: Build error detected
    trail.fail(750, new Error(`Build error in ${context}: ${error.message}`));
  },
  
  recoveryAttempt: (strategy: string) => {
    const trail = getBuildTrail();
    // LED 751: Error recovery attempt
    trail.light(751, { 
      operation: 'error_recovery_attempt',
      strategy
    });
  },
  
  recoverySuccess: (strategy: string) => {
    const trail = getBuildTrail();
    // LED 752: Error recovery success
    trail.light(752, { 
      operation: 'error_recovery_success',
      strategy
    });
  },
  
  recoveryFailed: (strategy: string, error: Error) => {
    const trail = getBuildTrail();
    // LED 752: Error recovery failed
    trail.fail(752, new Error(`Error recovery failed with strategy '${strategy}': ${error.message}`));
  }
};

// Auto-initialize on import in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  initializeBuildTrail();
  
  // Register build system debug commands
  if ((window as any).debug) {
    (window as any).debug.build = () => getBuildTrail().getSequence();
    (window as any).debug.buildFailures = () => getBuildTrail().getFailures();
    (window as any).debug.buildSummary = () => {
      const trail = getBuildTrail();
      const sequence = trail.getSequence();
      const failures = trail.getFailures();
      
      return {
        totalOperations: sequence.length,
        failures: failures.length,
        successRate: ((sequence.length - failures.length) / sequence.length * 100).toFixed(1) + '%',
        categories: {
          typescript: sequence.filter(b => b.id >= 701 && b.id <= 709).length,
          vite: sequence.filter(b => b.id >= 710 && b.id <= 719).length,
          tauri: sequence.filter(b => b.id >= 720 && b.id <= 729).length,
          devServer: sequence.filter(b => b.id >= 730 && b.id <= 739).length,
          assets: sequence.filter(b => b.id >= 740 && b.id <= 749).length,
          errorRecovery: sequence.filter(b => b.id >= 750 && b.id <= 759).length
        }
      };
    };
  }
}

export default {
  initializeBuildTrail,
  getBuildTrail,
  TypeScriptBreadcrumbs,
  ViteBreadcrumbs,
  TauriBreadcrumbs,
  DevServerBreadcrumbs,
  AssetBreadcrumbs,
  ErrorRecoveryBreadcrumbs
};