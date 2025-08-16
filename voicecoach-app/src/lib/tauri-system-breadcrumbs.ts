/**
 * VoiceCoach Tauri System LED Breadcrumbs
 * 
 * Traces desktop window management, system tray operations, and Tauri runtime
 * initialization through numbered LED lights for instant error location.
 * 
 * LED Range: 600-699 (System Operations)
 */

import { BreadcrumbTrail } from './breadcrumb-system';

// Global system trail
let systemTrail: BreadcrumbTrail | null = null;

/**
 * Initialize system breadcrumb trail
 */
export function initializeSystemTrail(): BreadcrumbTrail {
  if (!systemTrail) {
    systemTrail = new BreadcrumbTrail('TauriSystem');
    
    // LED 600: Tauri system initialization
    systemTrail.light(600, { 
      operation: 'tauri_system_init',
      timestamp: Date.now(),
      platform: typeof window !== 'undefined' ? navigator.platform : 'unknown'
    });
  }
  
  return systemTrail;
}

/**
 * Get the system trail instance
 */
export function getSystemTrail(): BreadcrumbTrail {
  if (!systemTrail) {
    return initializeSystemTrail();
  }
  return systemTrail;
}

/**
 * Desktop window management breadcrumbs
 */
export const WindowBreadcrumbs = {
  created: (windowLabel: string, config: any) => {
    const trail = getSystemTrail();
    // LED 601: Window created
    trail.light(601, { 
      operation: 'window_created',
      windowLabel,
      config: {
        width: config.width,
        height: config.height,
        resizable: config.resizable,
        title: config.title
      }
    });
  },
  
  shown: (windowLabel: string) => {
    const trail = getSystemTrail();
    // LED 602: Window shown
    trail.light(602, { 
      operation: 'window_shown',
      windowLabel
    });
  },
  
  hidden: (windowLabel: string) => {
    const trail = getSystemTrail();
    // LED 603: Window hidden
    trail.light(603, { 
      operation: 'window_hidden',
      windowLabel
    });
  },
  
  focused: (windowLabel: string) => {
    const trail = getSystemTrail();
    // LED 604: Window focused
    trail.light(604, { 
      operation: 'window_focused',
      windowLabel
    });
  },
  
  resized: (windowLabel: string, newSize: { width: number; height: number }) => {
    const trail = getSystemTrail();
    // LED 605: Window resized
    trail.light(605, { 
      operation: 'window_resized',
      windowLabel,
      newSize
    });
  },
  
  moved: (windowLabel: string, newPosition: { x: number; y: number }) => {
    const trail = getSystemTrail();
    // LED 606: Window moved
    trail.light(606, { 
      operation: 'window_moved',
      windowLabel,
      newPosition
    });
  },
  
  minimized: (windowLabel: string) => {
    const trail = getSystemTrail();
    // LED 607: Window minimized
    trail.light(607, { 
      operation: 'window_minimized',
      windowLabel
    });
  },
  
  maximized: (windowLabel: string) => {
    const trail = getSystemTrail();
    // LED 608: Window maximized
    trail.light(608, { 
      operation: 'window_maximized',
      windowLabel
    });
  },
  
  closed: (windowLabel: string) => {
    const trail = getSystemTrail();
    // LED 609: Window closed
    trail.light(609, { 
      operation: 'window_closed',
      windowLabel
    });
  },
  
  error: (windowLabel: string, operation: string, error: Error) => {
    const trail = getSystemTrail();
    // LED 601-609: Window operation failed (based on operation)
    const ledMap: Record<string, number> = {
      'create': 601,
      'show': 602,
      'hide': 603,
      'focus': 604,
      'resize': 605,
      'move': 606,
      'minimize': 607,
      'maximize': 608,
      'close': 609
    };
    
    const ledId = ledMap[operation] || 609;
    trail.fail(ledId, new Error(`Window ${operation} failed for ${windowLabel}: ${error.message}`));
  }
};

/**
 * System tray breadcrumbs
 */
export const SystemTrayBreadcrumbs = {
  created: (iconPath: string) => {
    const trail = getSystemTrail();
    // LED 610: System tray created
    trail.light(610, { 
      operation: 'system_tray_created',
      iconPath
    });
  },
  
  leftClick: (position: { x: number; y: number }) => {
    const trail = getSystemTrail();
    // LED 611: System tray left clicked
    trail.light(611, { 
      operation: 'system_tray_left_click',
      position
    });
  },
  
  rightClick: (position: { x: number; y: number }) => {
    const trail = getSystemTrail();
    // LED 612: System tray right clicked
    trail.light(612, { 
      operation: 'system_tray_right_click',
      position
    });
  },
  
  doubleClick: (position: { x: number; y: number }) => {
    const trail = getSystemTrail();
    // LED 613: System tray double clicked
    trail.light(613, { 
      operation: 'system_tray_double_click',
      position
    });
  },
  
  menuItemClick: (itemId: string) => {
    const trail = getSystemTrail();
    // LED 614: System tray menu item clicked
    trail.light(614, { 
      operation: 'system_tray_menu_item_click',
      itemId
    });
  },
  
  iconUpdated: (newIconPath: string) => {
    const trail = getSystemTrail();
    // LED 615: System tray icon updated
    trail.light(615, { 
      operation: 'system_tray_icon_updated',
      newIconPath
    });
  },
  
  error: (operation: string, error: Error) => {
    const trail = getSystemTrail();
    // LED 616: System tray error
    trail.fail(616, new Error(`System tray ${operation} failed: ${error.message}`));
  }
};

/**
 * File system operations breadcrumbs
 */
export const FileSystemBreadcrumbs = {
  fileRead: (filePath: string, success: boolean, size?: number, error?: string) => {
    const trail = getSystemTrail();
    if (success) {
      // LED 620: File read success
      trail.light(620, { 
        operation: 'file_read_success',
        filePath,
        size
      });
    } else {
      // LED 620: File read failed
      trail.fail(620, new Error(`File read failed for ${filePath}: ${error}`));
    }
  },
  
  fileWrite: (filePath: string, success: boolean, size?: number, error?: string) => {
    const trail = getSystemTrail();
    if (success) {
      // LED 621: File write success
      trail.light(621, { 
        operation: 'file_write_success',
        filePath,
        size
      });
    } else {
      // LED 621: File write failed
      trail.fail(621, new Error(`File write failed for ${filePath}: ${error}`));
    }
  },
  
  directoryRead: (dirPath: string, fileCount: number, success: boolean, error?: string) => {
    const trail = getSystemTrail();
    if (success) {
      // LED 622: Directory read success
      trail.light(622, { 
        operation: 'directory_read_success',
        dirPath,
        fileCount
      });
    } else {
      // LED 622: Directory read failed
      trail.fail(622, new Error(`Directory read failed for ${dirPath}: ${error}`));
    }
  },
  
  fileExists: (filePath: string, exists: boolean) => {
    const trail = getSystemTrail();
    // LED 623: File existence check
    trail.light(623, { 
      operation: 'file_exists_check',
      filePath,
      exists
    });
  },
  
  pathResolution: (relativePath: string, absolutePath: string, success: boolean, error?: string) => {
    const trail = getSystemTrail();
    if (success) {
      // LED 624: Path resolution success
      trail.light(624, { 
        operation: 'path_resolution_success',
        relativePath,
        absolutePath
      });
    } else {
      // LED 624: Path resolution failed
      trail.fail(624, new Error(`Path resolution failed for ${relativePath}: ${error}`));
    }
  }
};

/**
 * Dialog operations breadcrumbs
 */
export const DialogBreadcrumbs = {
  fileDialog: (type: 'open' | 'save', filters: any[], result: string[] | null) => {
    const trail = getSystemTrail();
    // LED 630: File dialog operation
    trail.light(630, { 
      operation: 'file_dialog',
      type,
      filters,
      resultCount: result?.length || 0,
      cancelled: !result
    });
  },
  
  messageDialog: (title: string, message: string, type: 'info' | 'warning' | 'error') => {
    const trail = getSystemTrail();
    // LED 631: Message dialog shown
    trail.light(631, { 
      operation: 'message_dialog',
      title,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      type
    });
  },
  
  confirmDialog: (title: string, message: string, confirmed: boolean) => {
    const trail = getSystemTrail();
    // LED 632: Confirm dialog result
    trail.light(632, { 
      operation: 'confirm_dialog',
      title,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      confirmed
    });
  }
};

/**
 * Notification breadcrumbs
 */
export const NotificationBreadcrumbs = {
  sent: (title: string, body: string, icon?: string) => {
    const trail = getSystemTrail();
    // LED 640: Notification sent
    trail.light(640, { 
      operation: 'notification_sent',
      title,
      body: body.substring(0, 100) + (body.length > 100 ? '...' : ''),
      hasIcon: !!icon
    });
  },
  
  clicked: (notificationId: string) => {
    const trail = getSystemTrail();
    // LED 641: Notification clicked
    trail.light(641, { 
      operation: 'notification_clicked',
      notificationId
    });
  },
  
  dismissed: (notificationId: string) => {
    const trail = getSystemTrail();
    // LED 642: Notification dismissed
    trail.light(642, { 
      operation: 'notification_dismissed',
      notificationId
    });
  },
  
  error: (error: Error) => {
    const trail = getSystemTrail();
    // LED 643: Notification error
    trail.fail(643, new Error(`Notification error: ${error.message}`));
  }
};

/**
 * Application lifecycle breadcrumbs
 */
export const AppLifecycleBreadcrumbs = {
  startup: (args: string[]) => {
    const trail = getSystemTrail();
    // LED 650: Application startup
    trail.light(650, { 
      operation: 'app_startup',
      args,
      timestamp: Date.now()
    });
  },
  
  ready: () => {
    const trail = getSystemTrail();
    // LED 651: Application ready
    trail.light(651, { 
      operation: 'app_ready',
      timestamp: Date.now()
    });
  },
  
  beforeExit: (exitCode: number) => {
    const trail = getSystemTrail();
    // LED 652: Application before exit
    trail.light(652, { 
      operation: 'app_before_exit',
      exitCode,
      timestamp: Date.now()
    });
  },
  
  exit: (exitCode: number) => {
    const trail = getSystemTrail();
    // LED 653: Application exit
    trail.light(653, { 
      operation: 'app_exit',
      exitCode,
      timestamp: Date.now()
    });
  },
  
  error: (error: Error, context: string) => {
    const trail = getSystemTrail();
    // LED 654: Application error
    trail.fail(654, new Error(`Application error in ${context}: ${error.message}`));
  }
};

// Auto-initialize on import in browser context
if (typeof window !== 'undefined') {
  initializeSystemTrail();
  
  // Register system debug commands
  if ((window as any).debug) {
    (window as any).debug.system = () => getSystemTrail().getSequence();
    (window as any).debug.systemFailures = () => getSystemTrail().getFailures();
    (window as any).debug.systemSummary = () => {
      const trail = getSystemTrail();
      const sequence = trail.getSequence();
      const failures = trail.getFailures();
      
      return {
        totalOperations: sequence.length,
        failures: failures.length,
        successRate: ((sequence.length - failures.length) / sequence.length * 100).toFixed(1) + '%',
        categories: {
          windows: sequence.filter(b => b.id >= 601 && b.id <= 609).length,
          systemTray: sequence.filter(b => b.id >= 610 && b.id <= 619).length,
          fileSystem: sequence.filter(b => b.id >= 620 && b.id <= 629).length,
          dialogs: sequence.filter(b => b.id >= 630 && b.id <= 639).length,
          notifications: sequence.filter(b => b.id >= 640 && b.id <= 649).length,
          lifecycle: sequence.filter(b => b.id >= 650 && b.id <= 659).length
        }
      };
    };
  }
}

export default {
  initializeSystemTrail,
  getSystemTrail,
  WindowBreadcrumbs,
  SystemTrayBreadcrumbs,
  FileSystemBreadcrumbs,
  DialogBreadcrumbs,
  NotificationBreadcrumbs,
  AppLifecycleBreadcrumbs
};