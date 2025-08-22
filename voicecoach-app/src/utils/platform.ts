/**
 * Platform Detection Utilities for VoiceCoach Desktop
 * Handles OS detection and platform-specific configurations
 */

import { BreadcrumbTrail } from '../lib/breadcrumb-system';

const platformTrail = new BreadcrumbTrail('PlatformUtils');

export type PlatformType = 'windows' | 'macos' | 'linux' | 'unknown'

export interface PlatformInfo {
  platform: PlatformType
  isDesktop: boolean
  isBrowser: boolean
  arch?: string
  version?: string
}

export interface PlatformConfig {
  // Window configuration
  defaultWindowSize: { width: number; height: number }
  minWindowSize: { width: number; height: number }
  
  // Audio settings
  audioBufferSize: number
  sampleRate: number
  
  // File paths
  userDataPath?: string
  tempPath?: string
  
  // UI adjustments
  titleBarHeight: number
  scrollbarWidth: number
  
  // Keyboard shortcuts
  cmdKey: string
  
  // System integration
  supportsTray: boolean
  supportsNotifications: boolean
  supportsAlwaysOnTop: boolean
}

/**
 * Detect the current platform using browser user agent
 */
export function detectPlatform(): PlatformType {
  platformTrail.light(900, { action: 'detect_platform_start' });
  
  const userAgent = navigator.userAgent.toLowerCase()
  let detectedPlatform: PlatformType = 'unknown'
  
  if (userAgent.includes('win')) {
    detectedPlatform = 'windows'
  } else if (userAgent.includes('mac')) {
    detectedPlatform = 'macos'
  } else if (userAgent.includes('linux')) {
    detectedPlatform = 'linux'
  }
  
  platformTrail.light(902, { detected_platform: detectedPlatform });
  return detectedPlatform
}

/**
 * Get platform information
 */
export function getPlatformInfo(): PlatformInfo {
  platformTrail.light(905, { action: 'get_platform_info' });
  
  const platform = detectPlatform()
  
  const info: PlatformInfo = {
    platform,
    isDesktop: true, // Always true for Tauri apps
    isBrowser: false,
  }
  
  platformTrail.light(906, { platform_info: info });
  return info
}

/**
 * Get platform-specific configuration
 */
export function getPlatformConfig(): PlatformConfig {
  platformTrail.light(910, { action: 'get_platform_config' });
  
  const platform = detectPlatform()
  
  const baseConfig: PlatformConfig = {
    defaultWindowSize: { width: 1200, height: 800 },
    minWindowSize: { width: 800, height: 600 },
    audioBufferSize: 2048,
    sampleRate: 48000,
    titleBarHeight: 32,
    scrollbarWidth: 17,
    cmdKey: 'Ctrl',
    supportsTray: true,
    supportsNotifications: true,
    supportsAlwaysOnTop: true,
  }
  
  // Platform-specific overrides
  switch (platform) {
    case 'macos':
      baseConfig.cmdKey = 'Cmd'
      baseConfig.titleBarHeight = 28
      baseConfig.scrollbarWidth = 15
      break
      
    case 'windows':
      baseConfig.titleBarHeight = 32
      baseConfig.scrollbarWidth = 17
      break
      
    case 'linux':
      baseConfig.titleBarHeight = 30
      baseConfig.scrollbarWidth = 16
      break
  }
  
  platformTrail.light(911, { platform_config: baseConfig });
  return baseConfig
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV === true
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return import.meta.env.PROD === true
}

/**
 * Get keyboard modifier key for current platform
 */
export function getModifierKey(): string {
  const platform = detectPlatform()
  return platform === 'macos' ? 'Cmd' : 'Ctrl'
}

/**
 * Check if a feature is supported on current platform
 */
export function isFeatureSupported(feature: string): boolean {
  platformTrail.light(920, { action: 'check_feature_support', feature });
  
  const platform = detectPlatform()
  
  // All features are generally supported in Tauri
  const supported = true
  
  platformTrail.light(921, { feature, supported });
  return supported
}