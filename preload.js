const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectMultipleFiles: () => ipcRenderer.invoke('select-multiple-files'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  
  // Document processing
  processDocument: (data) => ipcRenderer.invoke('process-document', data),
  
  // Storage operations
  saveInsights: (insights) => ipcRenderer.invoke('save-insights', insights),
  loadInsights: () => ipcRenderer.invoke('load-insights'),
  
  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // Utility
  platform: process.platform,
  versions: process.versions
});

// Global flag for environment detection
contextBridge.exposeInMainWorld('isElectron', true);

console.log('🔌 VoiceCoach V2: Preload script loaded - Electron API exposed');