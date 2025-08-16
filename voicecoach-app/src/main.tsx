import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import { BreadcrumbTrail } from "./lib/breadcrumb-system";
import { initializeSystemTrail, AppLifecycleBreadcrumbs } from "./lib/tauri-system-breadcrumbs";
import { initializeBuildTrail, DevServerBreadcrumbs } from "./lib/build-system-breadcrumbs";

// Initialize LED breadcrumb system for VoiceCoach
const appTrail = new BreadcrumbTrail('MainEntry');

// LED 600: VoiceCoach application main entry
appTrail.light(600, { 
  operation: 'voicecoach_main_entry',
  timestamp: Date.now(),
  node_env: import.meta.env.MODE,
  dev: import.meta.env.DEV
});

// Initialize system and build trails
initializeSystemTrail();
initializeBuildTrail();

// LED 601: System trails initialized
appTrail.light(601, { operation: 'system_trails_initialized' });

// LED 602: DOM mounting preparation
appTrail.light(602, { operation: 'dom_mounting_prep' });

// Check for root element
const rootElement = document.getElementById("root") as HTMLElement;
if (!rootElement) {
  // LED 603: Root element not found
  appTrail.fail(603, new Error("Root element not found - DOM structure issue"));
  throw new Error("Root element #root not found");
}

// LED 604: Root element found, creating React root
appTrail.light(604, { 
  operation: 'react_root_creation',
  rootElement: rootElement.tagName
});

// Application lifecycle tracking
AppLifecycleBreadcrumbs.startup(process.argv || []);

// Development server tracking (only in development)
if (import.meta.env.DEV) {
  // LED 605: Development mode detected
  appTrail.light(605, { 
    operation: 'development_mode_detected',
    hmr_enabled: true
  });
  
  DevServerBreadcrumbs.ready(5173, 'http://localhost:5173');
}

try {
  // LED 606: React rendering start
  appTrail.light(606, { operation: 'react_render_start' });
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  // LED 607: React rendering complete
  appTrail.light(607, { operation: 'react_render_complete' });
  
  AppLifecycleBreadcrumbs.ready();
  
} catch (error) {
  // LED 606: React rendering failed
  appTrail.fail(606, error as Error);
  AppLifecycleBreadcrumbs.error(error as Error, 'main_render');
  throw error;
}

// LED 608: VoiceCoach application fully initialized
appTrail.light(608, { 
  operation: 'voicecoach_fully_initialized',
  timestamp: Date.now()
});

console.log('🚀 VoiceCoach LED Breadcrumb System Active!');
console.log('📊 Debug Commands:');
console.log('  window.debug.breadcrumbs.getPerformanceSummary()');
console.log('  window.debug.breadcrumbs.getTimeline()');
console.log('  window.debug.app() - App component trail');
console.log('  window.debug.audio() - Audio processor trail');
console.log('  window.debug.system() - System operations trail');
console.log('  window.debug.build() - Build system trail');