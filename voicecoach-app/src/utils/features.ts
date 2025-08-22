/**
 * Feature Detection System for VoiceCoach
 * Detects desktop vs browser capabilities and provides feature flags
 */

import { getPlatformInfo, getPlatformConfig } from './platform'
import { BreadcrumbTrail } from '../lib/breadcrumb-system'

const featuresTrail = new BreadcrumbTrail('FeatureDetection');

export interface FeatureFlags {
  // Audio features
  systemAudioCapture: boolean
  microphoneAccess: boolean
  audioProcessing: boolean
  realTimeAnalysis: boolean
  
  // File system features
  fileSystemAccess: boolean
  downloadAccess: boolean
  uploadAccess: boolean
  
  // System integration features
  systemTray: boolean
  notifications: boolean
  windowManagement: boolean
  alwaysOnTop: boolean
  menuBar: boolean
  
  // Advanced features
  backgroundProcessing: boolean
  globalShortcuts: boolean
  autoStart: boolean
  
  // UI features
  customTitleBar: boolean
  platformMenus: boolean
  dragAndDrop: boolean
}

export interface RuntimeEnvironment {
  isDesktop: boolean
  isBrowser: boolean
  isTauri: boolean
  isDevelopment: boolean
  isProduction: boolean
  platform: string
  features: FeatureFlags
}

/**
 * Detect if we're running in desktop mode (Tauri)
 */
export function isDesktopMode(): boolean {
  featuresTrail.light(950, { action: 'detect_desktop_mode' });
  
  const isDesktop = typeof window !== 'undefined' && 
         '__TAURI__' in window;
         
  featuresTrail.light(951, { 
    is_desktop: isDesktop,
    window_available: typeof window !== 'undefined',
    tauri_available: '__TAURI__' in window
  });
  
  return isDesktop;
}

/**
 * Detect if we're running in browser mode
 */
export function isBrowserMode(): boolean {
  return !isDesktopMode()
}

/**
 * Check if Tauri APIs are available
 */
export function hasTauriAPI(): boolean {
  return typeof window !== 'undefined' && 
         '__TAURI__' in window
}

/**
 * Get comprehensive feature detection
 */
export async function detectFeatures(): Promise<FeatureFlags> {
  featuresTrail.light(960, { action: 'detect_features_start' });
  
  const isDesktop = isDesktopMode()
  const config = getPlatformConfig()
  
  featuresTrail.light(961, { 
    is_desktop: isDesktop,
    config: config 
  });
  
  // Desktop feature flags
  if (isDesktop) {
    const desktopFeatures = {
      // Audio features - Desktop has full capabilities
      systemAudioCapture: true,
      microphoneAccess: true,
      audioProcessing: true,
      realTimeAnalysis: true,
      
      // File system features - Desktop has full access
      fileSystemAccess: true,
      downloadAccess: true,
      uploadAccess: true,
      
      // System integration - Desktop specific
      systemTray: config.supportsTray,
      notifications: config.supportsNotifications,
      windowManagement: true,
      alwaysOnTop: config.supportsAlwaysOnTop,
      menuBar: true,
      
      // Advanced features - Desktop only
      backgroundProcessing: true,
      globalShortcuts: true,
      autoStart: true,
      
      // UI features - Desktop specific
      customTitleBar: true,
      platformMenus: true,
      dragAndDrop: true
    };
    
    featuresTrail.light(962, { 
      feature_set: 'desktop',
      features: desktopFeatures 
    });
    
    return desktopFeatures;
  }
  
  // Browser feature flags (limited capabilities)
  const browserFeatures = {
    // Audio features - Limited to microphone only
    systemAudioCapture: false,
    microphoneAccess: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    audioProcessing: 'AudioContext' in window || 'webkitAudioContext' in window,
    realTimeAnalysis: true,
    
    // File system features - Limited browser APIs
    fileSystemAccess: 'showOpenFilePicker' in window,
    downloadAccess: true,
    uploadAccess: true,
    
    // System integration - Not available in browser
    systemTray: false,
    notifications: 'Notification' in window,
    windowManagement: false,
    alwaysOnTop: false,
    menuBar: false,
    
    // Advanced features - Not available in browser
    backgroundProcessing: 'serviceWorker' in navigator,
    globalShortcuts: false,
    autoStart: false,
    
    // UI features - Basic browser support
    customTitleBar: false,
    platformMenus: false,
    dragAndDrop: 'DataTransfer' in window
  };
  
  featuresTrail.light(963, { 
    feature_set: 'browser',
    features: browserFeatures 
  });
  
  return browserFeatures;
}

/**
 * Get complete runtime environment information
 */
export async function getRuntimeEnvironment(): Promise<RuntimeEnvironment> {
  const isDesktop = isDesktopMode()
  const isBrowser = isBrowserMode()
  const isTauri = hasTauriAPI()
  const isDevelopment = import.meta.env.DEV === true
  const isProduction = import.meta.env.PROD === true
  
  const platformInfo = getPlatformInfo()
  const features = await detectFeatures()
  
  return {
    isDesktop,
    isBrowser,
    isTauri,
    isDevelopment,
    isProduction,
    platform: platformInfo.platform,
    features
  }
}

/**
 * Check if a specific feature is available
 */
export async function hasFeature(featureName: keyof FeatureFlags): Promise<boolean> {
  const features = await detectFeatures()
  return features[featureName]
}

/**
 * Get available audio input methods
 */
export async function getAudioInputMethods() {
  const features = await detectFeatures()
  
  const methods = []
  
  if (features.microphoneAccess) {
    methods.push({
      id: 'microphone',
      name: 'Microphone Only',
      description: 'Capture audio from your microphone',
      available: true,
      primary: !features.systemAudioCapture
    })
  }
  
  if (features.systemAudioCapture) {
    methods.push({
      id: 'system_audio',
      name: 'System Audio',
      description: 'Capture all system audio (YouTube, meetings, etc.)',
      available: true,
      primary: true
    })
    
    methods.push({
      id: 'combined',
      name: 'Microphone + System Audio',
      description: 'Capture both your voice and system audio',
      available: true,
      primary: false
    })
  }
  
  return methods
}

/**
 * Get available notification methods
 */
export async function getNotificationMethods() {
  const features = await detectFeatures()
  
  const methods = []
  
  if (features.notifications) {
    methods.push({
      id: 'browser_notifications',
      name: 'Browser Notifications',
      available: true
    })
  }
  
  if (features.systemTray) {
    methods.push({
      id: 'tray_notifications',
      name: 'System Tray Notifications',
      available: true
    })
  }
  
  return methods
}

/**
 * Feature-based component rendering helper
 */
export function whenFeature<T>(
  featureName: keyof FeatureFlags, 
  desktopComponent: T, 
  browserComponent?: T
): Promise<T | null> {
  return hasFeature(featureName).then(available => {
    if (available) {
      return desktopComponent
    } else if (browserComponent !== undefined) {
      return browserComponent
    }
    return null
  })
}

/**
 * Platform-specific feature recommendations
 */
export async function getFeatureRecommendations() {
  const runtime = await getRuntimeEnvironment()
  const recommendations = []
  
  if (runtime.isBrowser) {
    recommendations.push({
      type: 'upgrade',
      title: 'Enhanced Audio Capture',
      description: 'Download the desktop app to capture system audio from YouTube, meetings, and other applications.',
      action: 'Download Desktop App',
      priority: 'high'
    })
    
    if (!runtime.features.notifications) {
      recommendations.push({
        type: 'permission',
        title: 'Enable Notifications',
        description: 'Allow notifications to get real-time coaching feedback.',
        action: 'Enable Notifications',
        priority: 'medium'
      })
    }
  }
  
  if (runtime.isDesktop && runtime.isDevelopment) {
    recommendations.push({
      type: 'info',
      title: 'Development Mode',
      description: 'You\'re running in development mode with full desktop features.',
      priority: 'low'
    })
  }
  
  return recommendations
}

/**
 * Graceful feature degradation helper
 */
export async function withFeatureFallback<T>(
  featureName: keyof FeatureFlags,
  desktopImplementation: () => Promise<T>,
  browserFallback: () => Promise<T>
): Promise<T> {
  const hasFeatureFlag = await hasFeature(featureName)
  
  if (hasFeatureFlag) {
    try {
      return await desktopImplementation()
    } catch (error) {
      console.warn(`Desktop feature ${featureName} failed, falling back to browser:`, error)
      return await browserFallback()
    }
  } else {
    return await browserFallback()
  }
}