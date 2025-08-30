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
  invokeSubagent: (data) => ipcRenderer.invoke('invoke-subagent', data),
  processWithOllama: (data) => ipcRenderer.invoke('process-with-ollama', data),
  
  // Storage operations
  saveInsights: (insights) => ipcRenderer.invoke('save-insights', insights),
  loadInsights: () => ipcRenderer.invoke('load-insights'),
  
  // Processed Documents Storage
  saveProcessedDocument: (document) => ipcRenderer.invoke('save-processed-document', document),
  loadProcessedDocuments: () => ipcRenderer.invoke('load-processed-documents'),
  deleteProcessedDocument: (documentId) => ipcRenderer.invoke('delete-processed-document', documentId),
  
  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // VoiceCoach Transcription
  startTranscription: () => ipcRenderer.invoke('start-transcription'),
  stopTranscription: () => ipcRenderer.invoke('stop-transcription'),
  getConversationHistory: () => ipcRenderer.invoke('get-conversation-history'),
  clearConversationHistory: () => ipcRenderer.invoke('clear-conversation-history'),
  
  // Enhanced Audio System Support
  requestMicrophoneAccess: () => ipcRenderer.invoke('request-microphone-access'),
  checkAudioDevices: () => ipcRenderer.invoke('check-audio-devices'),
  
  // Event listeners for transcription
  onTranscriptUpdate: (callback) => {
    ipcRenderer.on('transcript-update', (event, transcript, isFinal) => {
      callback(transcript, isFinal);
    });
  },
  onCoachingSuggestion: (callback) => {
    ipcRenderer.on('coaching-suggestion', (event, suggestion) => {
      callback(suggestion);
    });
  },
  removeTranscriptListeners: () => {
    ipcRenderer.removeAllListeners('transcript-update');
    ipcRenderer.removeAllListeners('coaching-suggestion');
  },
  
  // Utility
  platform: process.platform,
  versions: process.versions
});

// Global flag for environment detection
contextBridge.exposeInMainWorld('isElectron', true);

console.log('🔌 VoiceCoach V2: Preload script loaded - Electron API exposed');