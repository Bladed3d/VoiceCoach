// Cleanup is now handled by pre-startup-cleanup.js before npm run dev

const { app, BrowserWindow, ipcMain, dialog, systemPreferences, shell, net, desktopCapturer, screen } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const fsSync = require('fs');
const { spawn } = require('child_process');

// Keep a global reference of the window object
let mainWindow;
let pythonWebSocketServer;
let chromaDBServer;
let conversationHistory = [];
// REMOVED: Obsolete coaching triggers system - replaced with Ollama-based coaching

// Window state persistence
let windowState = {
  width: 1400,
  height: 900,
  x: undefined,
  y: undefined,
  isMaximized: false
};

// Load saved window state from app data
const loadWindowState = () => {
  try {
    const userDataPath = app.getPath('userData');
    const stateFile = path.join(userDataPath, 'window-state.json');
    
    if (fsSync.existsSync(stateFile)) {
      const savedState = JSON.parse(fsSync.readFileSync(stateFile, 'utf8'));
      windowState = { ...windowState, ...savedState };
      console.log('🎵 LED 1076: APP_LIFECYCLE - Loaded saved window state:', windowState);
    } else {
      // Center window on first launch
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;
      windowState.x = Math.floor((width - windowState.width) / 2);
      windowState.y = Math.floor((height - windowState.height) / 2);
      console.log('🎵 LED 1077: APP_LIFECYCLE - Using default window state (first launch)');
    }
  } catch (error) {
    console.log('⚠️ LED 8076: ERROR_HANDLING - Failed to load window state:', error.message);
  }
};

// Save window state to app data
const saveWindowState = () => {
  try {
    if (!mainWindow) return;
    
    const bounds = mainWindow.getBounds();
    windowState = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: mainWindow.isMaximized()
    };
    
    const userDataPath = app.getPath('userData');
    const stateFile = path.join(userDataPath, 'window-state.json');
    
    fsSync.writeFileSync(stateFile, JSON.stringify(windowState, null, 2));
    console.log('🎵 LED 1078: APP_LIFECYCLE - Saved window state:', windowState);
  } catch (error) {
    console.log('⚠️ LED 8077: ERROR_HANDLING - Failed to save window state:', error.message);
  }
};

// 🚨 CRITICAL: Single Instance Lock (cleanup handled by pre-startup script)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('🚨 LED 8050: ERROR_HANDLING - Multiple instance detected');
  app.quit();
} else {
  console.log('🎵 LED 1075: APP_LIFECYCLE - Single instance lock acquired successfully');
}

// Handle second instance attempt - bring main window to front
app.on('second-instance', (event, commandLine, workingDirectory) => {
  console.log('🎵 LED 1055: APP_LIFECYCLE - Second instance blocked, focusing main window');
  console.log('📍 VoiceCoach V2 is already running - bringing to front');
  
  if (mainWindow) {
    // Comprehensive window restoration
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.show();
    mainWindow.moveTop();
    
    // Flash taskbar on Windows
    if (process.platform === 'win32') {
      mainWindow.flashFrame(true);
    }
    
    console.log('🎵 LED 1076: APP_LIFECYCLE - Main window brought to front successfully');
  }
});

const createWindow = () => {
  console.log('🎵 LED 1056: APP_LIFECYCLE - Creating desktop application window');
  
  // Load saved window state before creating window
  loadWindowState();
  
  // 🚨 CRITICAL: Desktop-First Configuration with Full System Permissions
  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    show: false, // Don't show until ready
    title: 'VoiceCoach V2 - AI Sales Coaching', // Critical for process identification
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      // 🚨 CRITICAL: Fixed WebSocket compatibility - Enable web security with native WebSocket support
      webSecurity: true,  // ✅ Enable web security for native WebSocket compatibility
      additionalArguments: [
        '--disable-web-security',  // Only for local development
        '--allow-file-access-from-files'
      ],
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      // Enable media permissions
      mediaPermissions: true,
      permissions: {
        media: true,
        microphone: true,
        camera: false, // Only microphone needed
        geolocation: false,
        notifications: true
      }
    },
    // Desktop app configuration - removed duplicate webSecurity setting
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'default',
    autoHideMenuBar: false,
    // Professional desktop app appearance
    backgroundColor: '#1a1a1a',
    titleBarOverlay: false,
    frame: true,
    resizable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    // Window state management
    center: true,
    skipTaskbar: false
  });

  // 🚨 CRITICAL: Enhanced window ready state management
  mainWindow.once('ready-to-show', () => {
    console.log('🎵 LED 1057: APP_LIFECYCLE - Window ready to show, displaying application');
    
    // Restore maximized state if it was maximized
    if (windowState.isMaximized) {
      mainWindow.maximize();
    }
    
    mainWindow.show();
    
    // Focus and bring to front
    mainWindow.focus();
    if (process.platform === 'darwin') {
      app.dock.show();
    }
  });
  
  // Handle failed page loads
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('❌ LED 8051: ERROR_HANDLING - Page failed to load:', errorDescription);
    // Retry loading after brief delay
    setTimeout(() => {
      if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5175');
      } else {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
      }
    }, 2000);
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    console.log('🎵 LED 1058: APP_LIFECYCLE - Loading development server');
    mainWindow.loadURL('http://localhost:5175');
    
    // ✅ Enhanced DevTools opening with crash recovery and retry logic
    mainWindow.webContents.once('did-finish-load', () => {
      let devToolsRetryCount = 0;
      const maxRetries = 3;
      
      const openDevTools = () => {
        try {
          // Check if renderer is responsive before opening DevTools
          if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
            mainWindow.webContents.openDevTools();
            console.log('🎵 LED 1005: APP_LIFECYCLE - DevTools opened successfully {"operation":"devtools_opened","timestamp":' + Date.now() + ',"retry":' + devToolsRetryCount + '} ElectronMain_1005');
          }
        } catch (error) {
          console.log('❌ LED 8005 FAILED [ElectronMain]: ERROR_HANDLING DevTools opening error: ' + error.message + ', retry: ' + devToolsRetryCount);
          
          // Retry logic for DevTools opening
          if (devToolsRetryCount < maxRetries) {
            devToolsRetryCount++;
            setTimeout(openDevTools, 2000 * devToolsRetryCount); // Exponential backoff
          } else {
            console.log('❌ LED 8006 FAILED [ElectronMain]: ERROR_HANDLING DevTools opening failed after ' + maxRetries + ' attempts');
          }
        }
      };
      
      // Delayed opening with 1.5 second delay to ensure renderer is fully stable
      setTimeout(openDevTools, 1500);
    });
    
    // ✅ Enhanced crash recovery for renderer process
    mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.log('❌ LED 8007 FAILED [ElectronMain]: ERROR_HANDLING Renderer process crashed: ' + JSON.stringify(details));
      
      if (details.reason === 'crashed' || details.reason === 'killed') {
        console.log('🎵 LED 1006: APP_LIFECYCLE - Attempting renderer recovery {"operation":"renderer_recovery","reason":"' + details.reason + '","timestamp":' + Date.now() + '} ElectronMain_1006');
        
        // Clean shutdown of any running servers before recovery
        if (pythonWebSocketServer) {
          try {
            if (pythonWebSocketServer) {
              pythonWebSocketServer.kill('SIGINT');
            }
            pythonWebSocketServer = null;
            console.log('🎵 LED 1007: APP_LIFECYCLE - Cleanup WebSocket server before recovery {"operation":"pre_recovery_cleanup"} ElectronMain_1007');
          } catch (error) {
            console.log('❌ LED 8008 FAILED [ElectronMain]: ERROR_HANDLING WebSocket cleanup error: ' + error.message);
          }
        }
        
        // Recovery with exponential delay
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.reload();
            console.log('🎵 LED 1008: APP_LIFECYCLE - Renderer recovery initiated {"operation":"renderer_reload_complete"} ElectronMain_1008');
          }
        }, 1500); // 1.5s delay for stability
      }
    });

    // ✅ Monitor for unresponsive renderer
    mainWindow.webContents.on('unresponsive', () => {
      console.log('❌ LED 8007 FAILED [ElectronMain]: ERROR_HANDLING Renderer became unresponsive');
    });

    mainWindow.webContents.on('responsive', () => {
      console.log('🎵 LED 1007: APP_LIFECYCLE - Renderer became responsive again {"operation":"renderer_responsive"} ElectronMain_1007');
    });

  } else {
    console.log('🎵 LED 1059: APP_LIFECYCLE - Loading production build');
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // 🚨 CRITICAL: Enhanced microphone permission setup
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('🎵 LED 1060: APP_LIFECYCLE - Permission request:', permission);
    
    // Grant microphone and media permissions automatically
    if (permission === 'microphone' || permission === 'media') {
      console.log('🎵 LED 1061: APP_LIFECYCLE - Granting media permission for sales coaching');
      callback(true);
    } else {
      callback(false);
    }
  });

  // Handle display media requests (screen/audio capture)
  mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    console.log('🎵 LED 1054: APP_LIFECYCLE - Display media request for screen/audio capture');
    
    // Get available sources for screen capture
    desktopCapturer.getSources({ 
      types: ['screen', 'window'],
      fetchWindowIcons: true 
    }).then(sources => {
      console.log('🎵 LED 1055: APP_LIFECYCLE - Available sources for capture:', sources.length);
      
      // Use the primary screen source with audio
      const primaryScreen = sources.find(source => source.name === 'Entire Screen' || source.name.includes('Screen'));
      
      if (primaryScreen) {
        console.log('🎵 LED 1056: APP_LIFECYCLE - Using source:', primaryScreen.name);
        callback({ 
          video: primaryScreen,
          audio: 'loopback' // This enables system audio capture
        });
      } else if (sources.length > 0) {
        // Fallback to first available source
        console.log('🎵 LED 1056: APP_LIFECYCLE - Using fallback source:', sources[0].name);
        callback({ 
          video: sources[0],
          audio: 'loopback'
        });
      } else {
        console.log('❌ LED 8055: ERROR_HANDLING - No sources available for capture');
        callback({});
      }
    }).catch(error => {
      console.log('❌ LED 8056: ERROR_HANDLING - Failed to get desktop sources:', error);
      callback({});
    });
  });

  // Handle external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  
  // Track window state changes
  let saveStateTimer;
  
  // Save state when window is resized (debounced)
  mainWindow.on('resize', () => {
    clearTimeout(saveStateTimer);
    saveStateTimer = setTimeout(() => {
      if (!mainWindow.isMaximized()) {
        saveWindowState();
      }
    }, 500); // Debounce for 500ms
  });
  
  // Save state when window is moved (debounced)
  mainWindow.on('move', () => {
    clearTimeout(saveStateTimer);
    saveStateTimer = setTimeout(() => {
      if (!mainWindow.isMaximized()) {
        saveWindowState();
      }
    }, 500); // Debounce for 500ms
  });
  
  // Track maximize state changes
  mainWindow.on('maximize', () => {
    windowState.isMaximized = true;
    saveWindowState();
  });
  
  mainWindow.on('unmaximize', () => {
    windowState.isMaximized = false;
    saveWindowState();
  });

  // Handle window events with enhanced cleanup
  mainWindow.on('closed', () => {
    console.log('🎵 LED 1062: APP_LIFECYCLE - Main window closed, cleaning up');
    
    // Save final window state before closing
    saveWindowState();
    
    // Clean shutdown of Python WebSocket server
    if (pythonWebSocketServer) {
      try {
        pythonWebSocketServer.kill('SIGINT');
        pythonWebSocketServer = null;
        console.log('🎵 LED 1063: APP_LIFECYCLE - Python server cleaned up on window close');
      } catch (error) {
        console.log('❌ LED 8052: ERROR_HANDLING - Server cleanup error:', error.message);
      }
    }
    
    mainWindow = null;
  });

  // Window lifecycle events
  mainWindow.on('minimize', () => {
    console.log('🎵 LED 1064: APP_LIFECYCLE - Window minimized');
  });

  mainWindow.on('restore', () => {
    console.log('🎵 LED 1065: APP_LIFECYCLE - Window restored');
  });

  mainWindow.on('focus', () => {
    console.log('🎵 LED 1066: APP_LIFECYCLE - Window focused');
  });

  console.log('🎯 VoiceCoach V2: Main window created successfully');
  console.log('🎵 LED 1000: APP_LIFECYCLE - Window created successfully {"operation":"window_created","timestamp":' + Date.now() + '} ElectronMain_1000');
  
  // LED Breadcrumb 1000: App startup complete (obsolete coaching triggers system removed)
};

// REMOVED: Obsolete loadCoachingTriggers() function
// This has been replaced with Ollama-based contextual coaching
// which provides superior real-time analysis without hardcoded fallbacks

// REMOVED: Obsolete triggerCoachingAnalysis() function
// This keyword-based system interfered with Ollama's contextual analysis
// Coaching is now handled entirely through Ollama services in the React app

// REMOVED: Obsolete sendCoachingSuggestion() function
// Coaching suggestions are now handled directly by React components
// through Ollama services, providing better real-time contextual analysis

// Initialize Ollama models at app startup (once only)
const initializeOllamaModels = async () => {
  try {
    console.log('🔧 STARTUP: Initializing Ollama models at app startup...');
    
    const request = net.request('http://localhost:11434/api/tags');
    
    return new Promise((resolve) => {
      request.on('response', (response) => {
        console.log(`🔧 STARTUP: Ollama init response - Status: ${response.statusCode}`);
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          if (response.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              const models = parsed.models?.map(model => ({
                name: model.name,
                size: model.size,
                modified_at: model.modified_at,
                displayName: model.name.split(':')[0] + (model.name.includes(':') ? ':' + model.name.split(':')[1] : '')
              })) || [];
              
              // Send to renderer process via webContents when window is ready
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.executeJavaScript(`
                  localStorage.setItem('voicecoach-ollama-models', '${JSON.stringify(models).replace(/'/g, "\\'")}');
                  console.log('🔧 STARTUP: Ollama models cached at startup:', ${models.length});
                `);
              }
              
              console.log('✅ STARTUP: Ollama models initialized successfully:', models.length);
              resolve();
            } catch (parseError) {
              console.log('❌ STARTUP: Failed to parse Ollama models at startup');
              resolve();
            }
          } else {
            console.log('❌ STARTUP: Ollama not available at startup, will use fallback');
            resolve();
          }
        });
      });

      request.on('error', (error) => {
        console.log('❌ STARTUP: Ollama init error at startup:', error.message);
        resolve();
      });

      // Shorter timeout for startup - don't delay app launch
      setTimeout(() => {
        request.abort();
        console.log('⏰ STARTUP: Ollama init timeout at startup (non-blocking)');
        resolve();
      }, 2000);

      request.end();
    });
  } catch (error) {
    console.log('❌ STARTUP: Exception in Ollama initialization:', error.message);
  }
};

// 🚨 CRITICAL: Enhanced app lifecycle - cleanup already done in startApp()
app.whenReady().then(() => {
  console.log('🎵 LED 1067: APP_LIFECYCLE - App ready, creating window (cleanup handled by pre-startup script)');
  createWindow();
  
  // Initialize Ollama models after window is ready
  mainWindow.webContents.once('dom-ready', () => {
    console.log('🔧 STARTUP: DOM ready, initializing Ollama models...');
    initializeOllamaModels();
  });
  
  app.on('activate', () => {
    console.log('🎵 LED 1069: APP_LIFECYCLE - App activation requested');
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      // Bring existing window to front
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('🎵 LED 1070: APP_LIFECYCLE - All windows closed');
  
  // Enhanced cleanup before quit
  if (pythonWebSocketServer) {
    try {
      pythonWebSocketServer.kill('SIGINT');
      pythonWebSocketServer = null;
      console.log('🎵 LED 1071: APP_LIFECYCLE - Server cleanup on app close');
    } catch (error) {
      console.log('❌ LED 8053: ERROR_HANDLING - Server cleanup error on close:', error.message);
    }
  }
  
  // Quit on all platforms (desktop app behavior)
  app.quit();
});

// 🚨 CRITICAL: Enhanced app quit handling
app.on('before-quit', (event) => {
  console.log('🎵 LED 1072: APP_LIFECYCLE - App before quit, cleaning up resources');
  
  // Kill our known servers first
  if (pythonWebSocketServer) {
    console.log('🎵 LED 1073: APP_LIFECYCLE - Stopping Python server before quit');
    try {
      pythonWebSocketServer.kill('SIGINT');
      pythonWebSocketServer = null;
    } catch (error) {
      console.log('❌ LED 8054: ERROR_HANDLING - Server stop error on quit:', error.message);
    }
  }
  
  // Stop ChromaDB server
  if (chromaDBServer) {
    console.log('🎵 LED 6507: CHROMADB - Stopping ChromaDB server before quit');
    try {
      chromaDBServer.kill('SIGINT');
      chromaDBServer = null;
    } catch (error) {
      console.log('❌ LED 8507: CHROMADB - ChromaDB stop error on quit:', error.message);
    }
  }
  
  // Kill any stale processes on ports 5000, 8767, and 5175 to prevent future conflicts
  console.log('🎵 LED 1074: APP_LIFECYCLE - Final port cleanup on quit (Vosk: 5000, ChromaDB: 8767, Vite: 5175)');
  try {
    // Clear all three ports on quit
    [5000, 8767, 5175].forEach(port => {
      const killCmd = `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port} ^| findstr LISTENING') do taskkill /F /PID %a >nul 2>&1`;
      spawn('cmd', ['/c', killCmd], { shell: true, stdio: 'ignore' });
    });
    console.log('🎵 LED 6510: CHROMADB - Ensured port 8767 is cleared for next startup');
  } catch (error) {
    console.log('❌ LED 8055: ERROR_HANDLING - Final port cleanup error:', error.message);
  }
});

// IPC Handlers for VoiceCoach functionality

// File operations
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-multiple-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths;
  }
  return [];
});

// Handle file dialog for Vosk Optimizer
ipcMain.handle('openFileDialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    // Resolve relative paths from the app directory
    let resolvedPath = filePath;
    if (!path.isAbsolute(filePath)) {
      resolvedPath = path.join(__dirname, filePath);
      console.log(`📁 Resolving relative path: ${filePath} -> ${resolvedPath}`);
    }
    
    const content = await fs.readFile(resolvedPath, 'utf-8');
    const stats = await fs.stat(resolvedPath);
    
    return {
      content,
      size: stats.size,
      name: path.basename(resolvedPath),
      path: resolvedPath
    };
  } catch (error) {
    console.error(`❌ Failed to read file: ${filePath}`, error);
    throw new Error(`Failed to read file: ${error.message}`);
  }
});

// REMOVED DUPLICATE HANDLERS - Using phase-based versions at lines 1264+ instead

// Calculate file hash for change detection
ipcMain.handle('calculate-file-hash', async (event, filePath) => {
  try {
    const crypto = require('crypto');
    const content = await fs.readFile(filePath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    
    return {
      success: true,
      hash
    };
  } catch (error) {
    return {
      success: false,
      hash: '',
      error: error.message
    };
  }
});

// Document processing (mock for now - will integrate with subagents and Ollama)
ipcMain.handle('process-document', async (event, { content, questionnaire }) => {
  console.log('🧠 Processing document with questionnaire:', {
    contentLength: content.length,
    questionnaire: Object.keys(questionnaire)
  });
  
  // Mock processing delay
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  // Mock response - replace with actual subagent and Ollama integration
  return {
    success: true,
    qualityScore: 92,
    totalTechniques: 24,
    criticalInsights: 8,
    quickWins: 12,
    coachingPrompts: {
      opening: [
        'Use mirroring technique to build rapport',
        'Ask about their current challenges first'
      ],
      discovery: [
        'What\'s the biggest obstacle to reaching your goals?',
        'How are you currently handling this process?'
      ],
      objection_handling: [
        'I understand your concern about price. Let\'s look at the value...',
        'That\'s a great question. Many clients initially think that...'
      ],
      closing: [
        'Based on what you\'ve told me, it sounds like this would solve your main challenge. Should we move forward?',
        'What questions do you have before we finalize this?'
      ]
    }
  };
});

// Subagent invocation for RAG processing phases
ipcMain.handle('invoke-subagent', async (event, { agentType, prompt, document, questionnaire, phase }) => {
  console.log('🎵 LED 2020: RAG Processing - Subagent invocation start:', {
    agentType,
    documentName: document?.name,
    promptLength: prompt?.length,
    phase: phase || '1A',
    hasQuestionnaire: !!questionnaire
  });
  
  try {
    // Use Task tool to invoke the rag-document-analyst2 subagent
    
    if (agentType === 'rag-document-analyst2') {
      console.log('🎵 LED 3002: RAG Processing - Starting real document analysis with rag-document-analyst2');
      
      // Read the document content from file path
      let documentContent = '';
      if (document.path) {
        try {
          documentContent = await fs.readFile(document.path, 'utf-8');
          console.log('🎵 LED 3003: RAG Processing - Document loaded:', {
            path: document.path,
            contentLength: documentContent.length
          });
        } catch (error) {
          console.log('🔴 LED 3004: RAG Processing - Failed to read document:', error.message);
          documentContent = document.content || 'Document content unavailable';
        }
      } else {
        documentContent = document.content || 'Document content unavailable';
      }

      // Build the analysis prompt based on the rag-document-analyst2.md instructions
      let analysisPrompt;
      
      if (phase === '1B' && questionnaire) {
        // Phase 1B: Contextual analysis with questionnaire context
        analysisPrompt = `Please follow the instructions in "D:\\Projects\\Ai\\VoiceCoach-v2\\.claude\\agents\\rag-document-analyst2.md" to analyze this document.

**PHASE 1B - CONTEXTUAL ANALYSIS**
Re-analyze this document for actionable techniques and insights, with special emphasis on the user's specific priorities:

**USER'S LEARNING OBJECTIVES:** ${questionnaire.q2_learningObjective || 'Not specified'}
**USER'S BUSINESS CHALLENGES:** ${questionnaire.q3_businessChallenge || 'Not specified'}  
**USER'S SUCCESS METRICS:** ${questionnaire.q4_successMetrics || 'Not specified'}
**CRITICAL CONCEPTS:** ${questionnaire.q5_criticalConcepts?.join(', ') || 'Not specified'}

Focus your extraction on techniques that directly address these user priorities while still capturing other valuable content.

**DOCUMENT TO ANALYZE:**
${documentContent}

Please return the analysis in the exact JSON format specified in the rag-document-analyst2.md agent instructions.`;

      } else {
        // Phase 1A: Pure document analysis
        analysisPrompt = `Please follow the instructions in "D:\\Projects\\Ai\\VoiceCoach-v2\\.claude\\agents\\rag-document-analyst2.md" to analyze this document.

**PHASE 1A - PURE DOCUMENT ANALYSIS**
Analyze this document for actionable techniques, strategic frameworks, audience types, behavioral indicators, and practical insights following the comprehensive analysis structure defined in the agent instructions.

**DOCUMENT TO ANALYZE:**
${documentContent}

Please return the analysis in the exact JSON format specified in the rag-document-analyst2.md agent instructions.`;
      }

      // Invoke the RAG Document Analyst2 agent via Claude Code Task tool
      console.log('🎵 LED 3005: RAG Processing - Invoking RAG Document Analyst2 agent');
      
      try {
        // Call the actual RAG Document Analyst2 agent using Claude Code Task tool
        console.log('🎵 LED 3006: RAG Processing - Invoking RAG Document Analyst2 agent for real AI analysis');
        
        // Create the analysis prompt for the RAG Document Analyst2 agent
        const taskPrompt = `${analysisPrompt}`;
        
        // NOTE: This is where we need to implement the actual Task tool call
        // The challenge is that Electron apps can't directly call Claude Code MCP tools
        // We need to either:
        // 1. Set up IPC communication with Claude Code
        // 2. Use a bridge service 
        // 3. Call the RAG Document Analyst2 agent through an API
        
        console.log('🎵 LED 3006B: RAG Processing - Document content prepared for analysis:', {
          contentLength: documentContent.length,
          promptLength: taskPrompt.length,
          phase: phase || '1A'
        });
        
        // **SOLUTION: File-based communication with Claude Code**
        // Save the analysis request to a file that Claude Code can process
        const analysisRequestPath = path.join(__dirname, 'temp', `analysis_request_${Date.now()}.json`);
        const analysisRequest = {
          task: 'RAG_DOCUMENT_ANALYSIS',
          agent: 'RAG Document Analyst2',
          phase: phase || '1A',
          document: {
            name: document.name,
            content: documentContent,
            path: document.path
          },
          prompt: taskPrompt,
          timestamp: new Date().toISOString()
        };
        
        try {
          // Ensure temp directory exists
          const tempDir = path.join(__dirname, 'temp');
          if (!fsSync.existsSync(tempDir)) {
            fsSync.mkdirSync(tempDir, { recursive: true });
          }
          
          // Save analysis request
          fsSync.writeFileSync(analysisRequestPath, JSON.stringify(analysisRequest, null, 2));
          console.log('🎵 LED 3006C: RAG Processing - Analysis request saved for Claude Code processing:', analysisRequestPath);
          
          // For now, return a structured response indicating the request is ready for processing
          const analysisResult = {
            status: 'request_prepared', 
            phase: phase || '1A',
            agent: 'RAG Document Analyst2',
            document: {
              name: document.name,
              type: document.type || 'sales_document', 
              size: documentContent.length,
              path: document.path
            },
            analysis: {
              actionable_techniques: [
                {
                  id: 'analysis_request_prepared',
                  title: 'Analysis Request Ready for RAG Document Analyst2',
                  priority: 'HIGH',
                  description: 'Document analysis request prepared and saved for Claude Code processing',
                  implementation: `Request saved to: ${analysisRequestPath}`,
                  context: 'Phase 1A document analysis',
                  effectiveness: 'ready'
                }
              ],
              strategic_frameworks: [],
              audience_types: [],
              behavioral_indicators: [],
              coaching_insights: [
                {
                  category: 'integration_status',
                  insight: 'Analysis request prepared - waiting for Claude Code to process via RAG Document Analyst2',
                  priority: 'HIGH', 
                  trigger_scenarios: ['Phase 1A processing']
                }
              ],
              success_metrics: [],
              integration_points: []
            },
            metadata: {
              processing_time: new Date().toISOString(),
              breadcrumb_range: '3000-3099',
              confidence: 'request_ready',
              analysis_request_path: analysisRequestPath,
              document_analyzed: false,
              awaiting_claude_processing: true
            }
          };
          
          return analysisResult;
          
        } catch (fileError) {
          console.log('🔴 LED 3006D: RAG Processing - Failed to save analysis request:', fileError.message);
          throw new Error(`Failed to prepare analysis request: ${fileError.message}`);
        }
        
      } catch (error) {
        console.log('🔴 LED 3009: RAG Processing - Document analysis error:', error.message);
        throw new Error(`RAG Document Analyst2 analysis failed: ${error.message}`);
      }
    }
    
    throw new Error(`Unknown agent type: ${agentType}. Expected: rag-document-analyst2`);
    
  } catch (error) {
    console.log('❌ LED 2099: RAG Processing - Subagent invocation failed:', error.message);
    throw error;
  }
});

// Ollama processing for Phase 1C synthesis
ipcMain.handle('process-with-ollama', async (event, { combinedAnalysis, task, model }) => {
  console.log('🎵 LED 5020: RAG Processing - Ollama synthesis start:', {
    task,
    model: model || 'llama3.1',
    hasPhase1A: !!combinedAnalysis?.phase1A,
    hasPhase1B: !!combinedAnalysis?.phase1B,
    phase1ATechniques: combinedAnalysis?.phase1A?.high_impact_techniques?.length || 0,
    phase1BTechniques: combinedAnalysis?.phase1B?.high_impact_techniques?.length || 0
  });
  
  try {
    // For development, simulate Ollama processing
    // This would be replaced with actual Ollama integration
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Mock Ollama synthesis that combines Phase 1A + 1B insights
    const synthesizedResults = {
      quality_score: 94,
      synthesis_method: 'ollama_llama3.1',
      processing_time: '3.2s',
      combined_insights: {
        comprehensive_techniques: combinedAnalysis?.phase1A?.high_impact_techniques?.length || 0,
        user_prioritized_techniques: combinedAnalysis?.phase1B?.high_impact_techniques?.length || 0,
        total_merged: (combinedAnalysis?.phase1A?.high_impact_techniques?.length || 0) + (combinedAnalysis?.phase1B?.high_impact_techniques?.length || 0)
      },
      coaching_prompts: [
        {
          trigger: "Customer says 'it's too expensive'",
          response: "Based on your specific goals to increase close rates from 65% to 80%, let's examine the ROI impact...",
          source: "Synthesized from Phase 1A + 1B analysis",
          priority: "CRITICAL"
        },
        {
          trigger: "Customer asks about implementation time",
          response: "Most of our enterprise clients see initial results within the first quarter, which aligns with your goal to reduce sales cycles by 25%...",
          source: "Contextual synthesis based on user priorities",
          priority: "HIGH"
        }
      ],
      objection_responses: [
        {
          objection: "We're happy with our current solution",
          response: "I understand. What would have to happen for you to consider a change? Many clients tell us they're satisfied until they see what 90% premium pricing retention looks like...",
          effectiveness_score: 88,
          user_context: "Tailored to user's premium pricing goal"
        }
      ],
      conversation_starters: [
        {
          scenario: "Opening call with enterprise prospect",
          script: "Hi [Name], I noticed your company is in [industry]. Many organizations like yours are working to improve their enterprise sales performance. I'd like to share how companies similar to yours have increased their close rates from the mid-60s to over 80%...",
          purpose: "Leverages both comprehensive techniques and user-specific metrics"
        }
      ],
      live_coaching_triggers: {
        high_priority: [
          "If customer mentions budget constraints → Guide toward ROI conversation",
          "If customer asks for discount → Redirect to value quantification",
          "If customer says 'we need to think about it' → Identify specific concerns"
        ],
        user_specific: [
          "Focus on enterprise decision-making process",
          "Emphasize premium pricing justification techniques",
          "Use consultative approach for deals over $50K"
        ]
      }
    };
    
    console.log('🎵 LED 5021: RAG Processing - Ollama synthesis complete:', {
      qualityScore: synthesizedResults.quality_score,
      coachingPrompts: synthesizedResults.coaching_prompts.length,
      objectionResponses: synthesizedResults.objection_responses.length,
      totalInsights: synthesizedResults.combined_insights.total_merged
    });
    
    return synthesizedResults;
    
  } catch (error) {
    console.log('❌ LED 5099: RAG Processing - Ollama synthesis failed:', error.message);
    throw error;
  }
});

// Desktop-native Ollama API calls using Electron's net module
// Generate Ollama coaching for More Info and Ask features
ipcMain.handle('generate-ollama-coaching', async (event, { prompt, context }) => {
  try {
    console.log('🎯 LED 1095: Generating Ollama coaching response...');
    
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        model: 'qwen2.5:14b-instruct-q4_K_M',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: 500
        }
      });

      const request = net.request({
        method: 'POST',
        url: 'http://localhost:11434/api/generate',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      });

      let responseData = '';

      request.on('response', (response) => {
        console.log(`🎯 LED 1096: Ollama response status: ${response.statusCode}`);
        
        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });

        response.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            
            // Parse response for coaching content
            const responseText = parsed.response || '';
            
            // Extract definition and steps if available
            const definitionMatch = responseText.match(/definition[:\s]+(.*?)(?=\n\n|\n##|$)/is);
            const stepsMatch = responseText.match(/steps?[:\s]+(.*?)(?=\n\n|$)/is);
            
            resolve({
              success: true,
              definition: definitionMatch ? definitionMatch[1].trim() : responseText.substring(0, 200),
              steps: stepsMatch ? stepsMatch[1].trim() : '1. Apply the technique\n2. Listen for response\n3. Follow up',
              answer: responseText,
              raw: parsed
            });
          } catch (error) {
            console.error('🔴 LED 8096: Failed to parse Ollama response:', error);
            reject(error);
          }
        });
      });

      request.on('error', (error) => {
        console.error('🔴 LED 8097: Ollama request error:', error);
        reject(error);
      });

      request.write(postData);
      request.end();
    });
  } catch (error) {
    console.error('🔴 LED 8098: Ollama coaching generation error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ollama-test-connection', async () => {
  try {
    console.log('🔍 IPC Handler: Testing Ollama connection using Electron net module...');
    
    return new Promise((resolve, reject) => {
      const request = net.request('http://localhost:11434/api/tags');
      
      request.on('response', (response) => {
        console.log(`🔍 IPC Handler: Ollama response - Status: ${response.statusCode}`);
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          if (response.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              console.log('✅ IPC Handler: Ollama connection successful');
              resolve({ success: true, data: parsed });
            } catch (parseError) {
              console.log('❌ IPC Handler: Failed to parse Ollama response');
              resolve({ success: false, error: 'Failed to parse response' });
            }
          } else {
            resolve({ success: false, error: `HTTP ${response.statusCode}` });
          }
        });
      });

      request.on('error', (error) => {
        console.log('❌ IPC Handler: Ollama connection error:', error.message);
        resolve({ success: false, error: error.message });
      });

      // Set timeout
      setTimeout(() => {
        request.abort();
        console.log('⏰ IPC Handler: Ollama connection timeout');
        resolve({ success: false, error: 'Connection timeout' });
      }, 5000);

      request.end();
    });
  } catch (error) {
    console.log('❌ IPC Handler: Exception in ollama-test-connection:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ollama-generate', async (event, { prompt, model = 'qwen2.5:14b-instruct-q4_K_M' }) => {
  const startTime = Date.now();
  try {
    console.log('🔍 IPC Handler: Generating Ollama response using Electron net module...');
    console.error('🚨 CRITICAL MODEL DEBUG: ollama-generate IPC handler called!');
    console.error('🚨 MODEL RECEIVED:', model);
    console.error('🚨 MODEL TYPE:', typeof model);
    console.error('🚨 MODEL DEFAULT WOULD BE:', 'qwen2.5:14b-instruct-q4_K_M');
    console.error('🚨 PROMPT LENGTH:', prompt?.length || 0);
    console.error('🚨 FULL PARAMS:', JSON.stringify({ model, promptLength: prompt?.length }, null, 2));
    console.error('⏱️ TIMING: IPC handler started at', startTime);

    const requestPrepStart = Date.now();
    return new Promise((resolve, reject) => {
      // CRITICAL DEBUG: Log the exact model being sent to Ollama
      console.error('🔴 CRITICAL: About to send to Ollama API:');
      console.error('🔴 MODEL TO BE SENT:', model);
      console.error('🔴 IS MODEL UNDEFINED?', model === undefined);
      console.error('🔴 IS MODEL NULL?', model === null);
      console.error('🔴 IS MODEL EMPTY STRING?', model === '');

      const postData = JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: 800
        }
      });

      // CRITICAL DEBUG: Log the actual JSON being sent
      const postDataParsed = JSON.parse(postData);
      console.error('🔴 ACTUAL JSON MODEL FIELD:', postDataParsed.model);
      console.error('🔴 POST DATA (first 200 chars):', postData.substring(0, 200));

      const requestPrepEnd = Date.now();
      console.error('⏱️ TIMING: Request prep took', requestPrepEnd - requestPrepStart, 'ms');

      const request = net.request({
        method: 'POST',
        url: 'http://localhost:11434/api/generate',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const requestSentTime = Date.now();
      console.error('⏱️ TIMING: Request object created, about to send at', requestSentTime);

      request.on('response', (response) => {
        const responseReceivedTime = Date.now();
        console.log(`🔍 IPC Handler: Ollama generate response - Status: ${response.statusCode}`);
        console.error('⏱️ TIMING: Response received after', responseReceivedTime - requestSentTime, 'ms');
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          const dataCompleteTime = Date.now();
          console.error('⏱️ TIMING: Data complete after', dataCompleteTime - responseReceivedTime, 'ms');

          if (response.statusCode === 200) {
            try {
              const parseStartTime = Date.now();
              const result = JSON.parse(data);
              console.log('✅ IPC Handler: Ollama generation successful');

              // CRITICAL DEBUG: Check what model Ollama actually used
              console.error('🔴 OLLAMA RESPONSE - MODEL FIELD:', result.model);
              console.error('🔴 OLLAMA RESPONSE - EXPECTED MODEL:', model);
              if (result.model !== model) {
                console.error('❌❌❌ MODEL MISMATCH DETECTED!');
                console.error('❌ REQUESTED:', model);
                console.error('❌ OLLAMA USED:', result.model);
              }

              console.error('⏱️ TIMING: JSON parse took', Date.now() - parseStartTime, 'ms');

              // Enhanced parsing logic moved from renderer process
              const rawResponse = result.response;
              console.log('🔍 RAW OLLAMA RESPONSE:', rawResponse);

              let suggestion = rawResponse;

              // Try to parse JSON response for rich coaching data
              if (rawResponse && typeof rawResponse === 'string') {
                try {
                  const parsed = JSON.parse(rawResponse.trim());

                  // Handle predictive format with rich coaching data
                  if (parsed.say_now) {
                    console.log('✅ PREDICTIVE FORMAT DETECTED - Extracting rich coaching data');
                    suggestion = `Say now: ${parsed.say_now}`;

                    if (parsed.next_move) {
                      suggestion += `\n\n➡️ Next: ${parsed.next_move}`;
                    }
                    if (parsed.path_goal) {
                      suggestion += `\n\n🎯 Goal: ${parsed.path_goal}`;
                    }
                    if (parsed.predicted_response) {
                      suggestion += `\n\n💭 They'll likely say: "${parsed.predicted_response}"`;
                    }
                    if (parsed.alternative) {
                      suggestion += `\n\n🔄 Alternative: ${parsed.alternative}`;
                    }

                    console.log('🎯 Enhanced suggestion created:', suggestion.substring(0, 100) + '...');
                  }
                  // Handle standard format
                  else if (parsed.suggestion) {
                    suggestion = parsed.suggestion;
                  }
                } catch (parseError) {
                  console.log('📝 Non-JSON response, using as plain text');
                  // Keep original response if not valid JSON
                }
              }

              const totalDuration = Date.now() - startTime;
              console.error('⏱️ TIMING: TOTAL IPC HANDLER DURATION:', totalDuration, 'ms');
              console.error('⏱️ TIMING: Performance rating:', totalDuration < 1000 ? 'EXCELLENT' : totalDuration < 2000 ? 'GOOD' : totalDuration < 3000 ? 'ACCEPTABLE' : 'NEEDS OPTIMIZATION');
              resolve({ success: true, response: suggestion });
            } catch (parseError) {
              console.log('❌ IPC Handler: Failed to parse Ollama generation response');
              resolve({ success: false, error: 'Failed to parse response' });
            }
          } else {
            resolve({ success: false, error: `HTTP ${response.statusCode}` });
          }
        });
      });

      request.on('error', (error) => {
        console.log('❌ IPC Handler: Ollama generation error:', error.message);
        resolve({ success: false, error: error.message });
      });

      // COMMENTED OUT: 60-second timeout was too aggressive for qwen2.5:14b
      // Set timeout for generation (60 seconds to handle complex prompts)
      // setTimeout(() => {
      //   request.abort();
      //   console.log('⏰ IPC Handler: Ollama generation timeout after 60 seconds');
      //   resolve({ success: false, error: 'Generation timeout after 60 seconds' });
      // }, 60000);

      console.error('⏱️ TIMING: About to write and send request at', Date.now());
      request.write(postData);
      request.end();
      console.error('⏱️ TIMING: Request sent, waiting for response...');
    });
  } catch (error) {
    console.log('❌ IPC Handler: Exception in ollama-generate:', error.message);
    return { success: false, error: error.message };
  }
});

// Get available Ollama models for dropdown selection
ipcMain.handle('ollama-list-models', async () => {
  try {
    console.log('🔍 IPC Handler: Fetching available Ollama models...');
    
    return new Promise((resolve, reject) => {
      const request = net.request('http://localhost:11434/api/tags');
      
      request.on('response', (response) => {
        console.log(`🔍 IPC Handler: Ollama models response - Status: ${response.statusCode}`);
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          if (response.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              // Extract model names from the response
              const models = parsed.models?.map(model => ({
                name: model.name,
                size: model.size,
                modified_at: model.modified_at,
                displayName: model.name.split(':')[0] + (model.name.includes(':') ? ':' + model.name.split(':')[1] : '')
              })) || [];
              
              console.log('✅ IPC Handler: Ollama models fetched successfully:', models.length);
              resolve({ success: true, models });
            } catch (parseError) {
              console.log('❌ IPC Handler: Failed to parse Ollama models response');
              resolve({ success: false, error: 'Failed to parse response' });
            }
          } else {
            resolve({ success: false, error: `HTTP ${response.statusCode}` });
          }
        });
      });

      request.on('error', (error) => {
        console.log('❌ IPC Handler: Ollama models fetch error:', error.message);
        resolve({ success: false, error: error.message });
      });

      // Set timeout
      setTimeout(() => {
        request.abort();
        console.log('⏰ IPC Handler: Ollama models fetch timeout');
        resolve({ success: false, error: 'Connection timeout' });
      }, 5000);

      request.end();
    });
  } catch (error) {
    console.log('❌ IPC Handler: Exception in ollama-list-models:', error.message);
    return { success: false, error: error.message };
  }
});

// REMOVED: Obsolete save/load insights IPC handlers
// These handled the old 5-step questionnaire system
// Document processing is now handled by RAG services
// which store processed documents in the proper data structures

// List all Ollama instruction files
ipcMain.handle('list-instruction-files', async () => {
  try {
    // Use __dirname for better path resolution in both dev and production
    const instructionDir = path.join(__dirname, 'ollama-prompts');
    
    console.log('🎵 LED 2080: INSTRUCTION_FILES_LISTING - Directory:', instructionDir);
    
    const files = [];
    
    if (fs.existsSync(instructionDir)) {
      const allFiles = fs.readdirSync(instructionDir);
      
      // Get all markdown files
      const mdFiles = allFiles.filter(file => file.endsWith('.md'));
      
      console.log('🎵 LED 2081: INSTRUCTION_FILES_FOUND - Count:', mdFiles.length);
      
      for (const file of mdFiles) {
        files.push({
          filename: file,
          displayName: file  // Use the full filename including .md
        });
      }
      
      // Sort files alphabetically
      files.sort((a, b) => a.filename.localeCompare(b.filename));
    } else {
      console.log('⚠️ LED 2083: INSTRUCTION_FILES_DIR_NOT_FOUND - Directory does not exist:', instructionDir);
    }
    
    console.log('🎵 LED 2082: INSTRUCTION_FILES_LISTED - Files:', files.map(f => f.filename));
    return files;
    
  } catch (error) {
    console.error('❌ LED 8080: Failed to list instruction files:', error);
    return [];
  }
});

// List all RAG documents
ipcMain.handle('list-rag-documents', async () => {
  try {
    // Use app.getAppPath() for correct project root
    const projectRoot = app.getAppPath();
    console.log('🎵 LED 2070: DOCUMENT_LISTING - Project root:', projectRoot);
    
    // Only check the main rag folder, not subfolders
    const ragDir = path.join(projectRoot, 'rag');
    
    console.log('🎵 LED 2071: DOCUMENT_LISTING - Checking directory:', ragDir);
    
    const documents = [];
    
    console.log('🎵 LED 2072: DOCUMENT_LISTING - Directory exists:', fs.existsSync(ragDir));
    
    if (fs.existsSync(ragDir)) {
      const files = fs.readdirSync(ragDir);
      console.log('🎵 LED 2073: DOCUMENT_LISTING - Found items in rag folder:', files);
      
      for (const file of files) {
        const filePath = path.join(ragDir, file);
        const stats = fs.statSync(filePath);
        
        // Only include files, skip directories
        if (stats.isFile()) {
          const ext = path.extname(file).toLowerCase();
          let type = 'other';
          
          if (file.includes('original')) type = 'original';
          else if (file.includes('Processed') || file.includes('processed') || file.includes('ChromaDB')) type = 'processed';
          else if (ext === '.json') type = 'json';
          else if (ext === '.txt') type = 'original';
          
          const doc = {
            name: file,
            path: path.relative(projectRoot, filePath).replace(/\\/g, '/'),
            type,
            size: stats.size
          };
          
          documents.push(doc);
          console.log('🎵 LED 2074: DOCUMENT_LISTING - Added document:', doc.name, 'Type:', doc.type);
        }
      }
    }
    
    console.log('🎵 LED 2075: DOCUMENT_LISTING - Total documents found:', documents.length);
    return documents;
  } catch (error) {
    console.error('🎵 LED 8070: DOCUMENT_LISTING_ERROR:', error);
    return [];
  }
});

// List all Sales scripts
ipcMain.handle('list-sales-scripts', async () => {
  try {
    const projectRoot = app.getAppPath();
    const salesDir = path.join(projectRoot, 'Sales');
    console.log('🎵 LED 2090: SALES_SCRIPTS_LISTING - Checking directory:', salesDir);

    const scripts = [];

    if (fs.existsSync(salesDir)) {
      const files = fs.readdirSync(salesDir);
      console.log('🎵 LED 2091: SALES_SCRIPTS_LISTING - Found items:', files);

      for (const file of files) {
        const filePath = path.join(salesDir, file);
        const stats = fs.statSync(filePath);

        // Only include .json files
        if (stats.isFile() && path.extname(file).toLowerCase() === '.json') {
          const script = {
            name: file,
            path: `/Sales/${file}` // Relative path for fetch
          };

          scripts.push(script);
          console.log('🎵 LED 2092: SALES_SCRIPTS_LISTING - Added script:', script.name);
        }
      }
    }

    console.log('🎵 LED 2093: SALES_SCRIPTS_LISTING - Total scripts found:', scripts.length);
    return scripts;
  } catch (error) {
    console.error('🎵 LED 8090: SALES_SCRIPTS_LISTING_ERROR:', error);
    return [];
  }
});

// Load RAG document by filename
ipcMain.handle('load-rag-document', async (event, filename) => {
  try {
    const projectRoot = app.getAppPath();
    const ragDir = path.join(projectRoot, 'rag');
    console.log('🎵 LED 2076: LOAD_DOCUMENT - Loading:', filename, 'from:', ragDir);
    
    // Check if exact filename exists
    let filePath = path.join(ragDir, filename);
    if (!fs.existsSync(filePath)) {
      // Try glob pattern for wildcard matches (e.g., *original.txt)
      const files = fs.readdirSync(ragDir);
      const matchingFiles = files.filter(file => {
        if (filename.includes('*')) {
          const pattern = filename.replace(/\*/g, '.*');
          const regex = new RegExp(pattern);
          return regex.test(file);
        }
        return file === filename;
      });
      
      if (matchingFiles.length === 0) {
        return { success: false, error: `File not found: ${filename}` };
      }
      
      // Use first matching file
      filePath = path.join(ragDir, matchingFiles[0]);
    }
    
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Processed Documents Storage - Phase-based saving
ipcMain.handle('save-processed-document', async (event, document) => {
  try {
    const projectRoot = path.join(__dirname);
    const documentsDir = path.join(projectRoot, 'rag');
    
    // Create directory if it doesn't exist
    await fs.mkdir(documentsDir, { recursive: true });
    
    // Extract original filename without path and extension
    const originalName = path.basename(document.name, path.extname(document.name));
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '_');
    
    const savedFiles = [];
    
    // Copy original document to rag folder for Ollama access
    if (document.path && await fs.access(document.path).then(() => true).catch(() => false)) {
      const originalExtension = path.extname(document.name);
      const originalFilename = `${originalName}_${timestamp}_original${originalExtension}`;
      const originalFilePath = path.join(documentsDir, originalFilename);
      
      try {
        await fs.copyFile(document.path, originalFilePath);
        savedFiles.push(originalFilePath);
        console.log('🎵 LED 2060: DOCUMENT_OPERATIONS - Original file copied:', {
          source: document.path,
          destination: originalFilePath,
          filename: originalFilename
        });
      } catch (error) {
        console.log('🎵 LED 2061: DOCUMENT_OPERATIONS - Failed to copy original file:', {
          source: document.path,
          error: error.message
        });
      }
    }
    
    // Save separate files for each completed phase
    if (document.phases?.phase1A?.status === 'completed') {
      const phase1AData = {
        documentName: document.name,
        phase: '1A',
        status: document.phases.phase1A.status,
        insights: document.phases.phase1A.insights,
        data: document.phases.phase1A.data,
        timestamp: document.completedDate || new Date().toISOString()
      };
      
      const filename1A = `${originalName}_${timestamp}_phase1A.json`;
      const filePath1A = path.join(documentsDir, filename1A);
      await fs.writeFile(filePath1A, JSON.stringify(phase1AData, null, 2));
      savedFiles.push(filePath1A);
    }
    
    if (document.phases?.phase1B?.status === 'completed') {
      const phase1BData = {
        documentName: document.name,
        phase: '1B',
        status: document.phases.phase1B.status,
        insights: document.phases.phase1B.insights,
        data: document.phases.phase1B.data,
        timestamp: document.completedDate || new Date().toISOString()
      };
      
      const filename1B = `${originalName}_${timestamp}_phase1B.json`;
      const filePath1B = path.join(documentsDir, filename1B);
      await fs.writeFile(filePath1B, JSON.stringify(phase1BData, null, 2));
      savedFiles.push(filePath1B);
    }
    
    if (document.phases?.phase1C?.status === 'completed') {
      const phase1CData = {
        documentName: document.name,
        phase: '1C',
        status: document.phases.phase1C.status,
        insights: document.phases.phase1C.insights,
        data: document.phases.phase1C.data,
        timestamp: document.completedDate || new Date().toISOString()
      };
      
      const filename1C = `${originalName}_${timestamp}_phase1C.json`;
      const filePath1C = path.join(documentsDir, filename1C);
      await fs.writeFile(filePath1C, JSON.stringify(phase1CData, null, 2));
      savedFiles.push(filePath1C);
    }
    
    return { success: true, savedFiles, count: savedFiles.length };
  } catch (error) {
    throw new Error(`Failed to save processed document: ${error.message}`);
  }
});

ipcMain.handle('load-processed-documents', async () => {
  try {
    const projectRoot = path.join(__dirname);
    const documentsDir = path.join(projectRoot, 'rag');
    
    console.log('🎵 LED 2050: DOCUMENT_OPERATIONS - Loading documents from:', documentsDir);
    
    try {
      const files = await fs.readdir(documentsDir);
      console.log('🎵 LED 2051: DOCUMENT_OPERATIONS - Files found:', files);
      const phaseFiles = [];
      
      // Load each phase file as individual entry
      for (const file of files) {
        console.log('🎵 LED 2052: DOCUMENT_OPERATIONS - Processing file:', file);
        const filePath = path.join(documentsDir, file);
        
        if (file.endsWith('.json')) {
          const content = await fs.readFile(filePath, 'utf-8');
          const phaseData = JSON.parse(content);
          
          console.log('🎵 LED 2053: DOCUMENT_OPERATIONS - File data:', {
            hasPhase: !!phaseData.phase,
            phase: phaseData.phase,
            documentName: phaseData.documentName
          });
          
          if (phaseData.phase) {
            // New format: individual phase files
            // Extract just the filename from the full path
            const fullPath = phaseData.documentName || '';
            const originalName = path.basename(fullPath, path.extname(fullPath));
            
            console.log('🎵 LED 2054: DOCUMENT_OPERATIONS - Extracted names:', {
              fullPath,
              originalName
            });
            
            const phaseFile = {
              id: `${originalName}_${phaseData.phase}_${phaseData.timestamp}`,
              fileName: file,
              name: `${originalName} - Phase ${phaseData.phase}`,
              originalDocument: fullPath,
              phase: phaseData.phase,
              status: phaseData.status,
              insights: phaseData.insights,
              data: phaseData.data,
              timestamp: phaseData.timestamp,
              size: JSON.stringify(phaseData).length,
              type: 'json'
            };
            
            phaseFiles.push(phaseFile);
            console.log('🎵 LED 2055: DOCUMENT_OPERATIONS - Added phase file:', phaseFile.name);
          } else {
            // Legacy format: convert to individual entries
            const legacyDoc = phaseData;
            ['1A', '1B', '1C'].forEach(phase => {
              const phaseKey = `phase${phase}`;
              if (legacyDoc.phases && legacyDoc.phases[phaseKey]) {
                phaseFiles.push({
                  id: `${legacyDoc.id}_${phase}`,
                  fileName: file,
                  name: `${legacyDoc.name} - Phase ${phase}`,
                  originalDocument: legacyDoc.name,
                  phase: phase,
                  status: legacyDoc.phases[phaseKey].status,
                  insights: legacyDoc.phases[phaseKey].insights,
                  data: legacyDoc.phases[phaseKey].data,
                  timestamp: legacyDoc.completedDate || legacyDoc.uploadDate,
                  size: JSON.stringify(legacyDoc).length,
                  type: 'json'
                });
              }
            });
          }
        } else if (file.includes('_original.')) {
          // Handle original document files (non-JSON)
          const originalName = file.split('_')[0]; // Extract base name before timestamp
          const fileStats = await fs.stat(filePath);
          const timestamp = fileStats.mtime.toISOString();
          
          const originalFile = {
            id: `${originalName}_original_${timestamp}`,
            fileName: file,
            name: `${originalName} - Original Document`,
            originalDocument: file,
            phase: 'ORIGINAL',
            status: 'completed',
            insights: 'Source document for Ollama processing',
            data: { note: 'Original document file for reference and Ollama access' },
            timestamp: timestamp,
            size: fileStats.size,
            type: path.extname(file).substring(1) // Remove the dot
          };
          
          phaseFiles.push(originalFile);
          console.log('🎵 LED 2057: DOCUMENT_OPERATIONS - Added original file:', originalFile.name);
        }
      }
      
      // Sort by timestamp (newest first)
      phaseFiles.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      console.log('🎵 LED 2056: DOCUMENT_OPERATIONS - Final phase files to return:', {
        count: phaseFiles.length,
        files: phaseFiles.map(f => ({ name: f.name, phase: f.phase, id: f.id }))
      });
      
      return phaseFiles;
    } catch (error) {
      // Return empty array if directory doesn't exist or is empty
      return [];
    }
  } catch (error) {
    throw new Error(`Failed to load processed documents: ${error.message}`);
  }
});

// Version Management IPC Handlers
// LED Range: 3300-3399 (Version management)

// Save version manifest for processed documents
ipcMain.handle('save-version-manifest', async (event, documentName, manifestContent) => {
  try {
    console.log('🎵 LED 3310: VERSION_MANAGEMENT - Saving manifest for:', documentName);
    
    const ragPath = path.join(__dirname, 'rag', 'processed', 'manifests');
    await fs.ensureDir(ragPath);
    
    const manifestFile = path.join(ragPath, `${documentName}_manifest.json`);
    await fs.writeFile(manifestFile, manifestContent, 'utf-8');
    
    console.log('🎵 LED 3311: VERSION_MANAGEMENT - Manifest saved:', manifestFile);
    
    return {
      success: true,
      path: manifestFile
    };
  } catch (error) {
    console.error('🎵 LED 8310: VERSION_MANAGEMENT - Failed to save manifest:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Load version manifest for a document
ipcMain.handle('load-version-manifest', async (event, documentName) => {
  try {
    console.log('🎵 LED 3320: VERSION_MANAGEMENT - Loading manifest for:', documentName);
    
    const manifestFile = path.join(__dirname, 'rag', 'processed', 'manifests', `${documentName}_manifest.json`);
    
    if (await fs.pathExists(manifestFile)) {
      const content = await fs.readFile(manifestFile, 'utf-8');
      const manifest = JSON.parse(content);
      
      console.log('🎵 LED 3321: VERSION_MANAGEMENT - Manifest loaded, versions:', manifest.versions.length);
      
      return {
        success: true,
        manifest
      };
    } else {
      console.log('🎵 LED 3322: VERSION_MANAGEMENT - No manifest found for:', documentName);
      
      return {
        success: false,
        manifest: null
      };
    }
  } catch (error) {
    console.error('🎵 LED 8320: VERSION_MANAGEMENT - Failed to load manifest:', error);
    return {
      success: false,
      error: error.message,
      manifest: null
    };
  }
});

// Save processed document with version info
ipcMain.handle('save-processed-version', async (event, versionData) => {
  try {
    console.log('🎵 LED 3330: VERSION_MANAGEMENT - Saving processed version:', {
      document: versionData.documentName,
      version: versionData.versionName
    });
    
    const ragPath = path.join(__dirname, 'rag', 'processed');
    await fs.ensureDir(ragPath);
    
    // Generate filename with version info
    const timestamp = Date.now();
    const fileName = `${versionData.documentName}_${versionData.versionName}_${timestamp}.json`;
    const filePath = path.join(ragPath, fileName);
    
    // Save the processed document
    await fs.writeFile(filePath, JSON.stringify(versionData, null, 2), 'utf-8');
    
    console.log('🎵 LED 3331: VERSION_MANAGEMENT - Version saved:', fileName);
    
    return {
      success: true,
      fileName,
      path: filePath
    };
  } catch (error) {
    console.error('🎵 LED 8330: VERSION_MANAGEMENT - Failed to save version:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('delete-processed-document', async (event, phaseFileId) => {
  try {
    const projectRoot = path.join(__dirname);
    const documentsDir = path.join(projectRoot, 'rag');
    
    // Extract filename from the phase file ID (contains filename in the ID)
    const files = await fs.readdir(documentsDir);
    let deletedFile = null;
    
    // Find the specific file to delete
    for (const file of files) {
      const filePath = path.join(documentsDir, file);
      
      if (file.endsWith('.json')) {
        // Handle JSON phase files
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        // Check if this matches the phase file ID
        if (data.phase) {
          const originalName = path.basename(data.documentName, path.extname(data.documentName));
          const fileId = `${originalName}_${data.phase}_${data.timestamp}`;
          if (fileId === phaseFileId) {
            await fs.unlink(filePath);
            deletedFile = file;
            console.log('🎵 LED 2062: DOCUMENT_OPERATIONS - Deleted JSON phase file:', file);
            break;
          }
        }
      } else if (file.includes('_original.')) {
        // Handle original document files
        const originalName = file.split('_')[0]; // Extract base name before timestamp
        const fileStats = await fs.stat(filePath);
        const timestamp = fileStats.mtime.toISOString();
        const fileId = `${originalName}_original_${timestamp}`;
        
        if (fileId === phaseFileId) {
          await fs.unlink(filePath);
          deletedFile = file;
          console.log('🎵 LED 2063: DOCUMENT_OPERATIONS - Deleted original file:', file);
          break;
        }
      }
    }
    
    if (deletedFile) {
      return { success: true, deleted: deletedFile };
    } else {
      throw new Error('Phase file not found');
    }
  } catch (error) {
    throw new Error(`Failed to delete processed document: ${error.message}`);
  }
});

// Save call recording
ipcMain.handle('save-call-recording', async (event, { folderPath, fileName, data }) => {
  try {
    // LED 6530: Save call recording (main process)
    console.log(`💾 Saving call recording: ${folderPath}/${fileName}`);

    // Create full path
    const fullFolderPath = path.join(__dirname, folderPath);
    const fullFilePath = path.join(fullFolderPath, fileName);

    // Create directories if they don't exist
    fs.mkdirSync(fullFolderPath, { recursive: true });

    // Write file
    fs.writeFileSync(fullFilePath, data, 'utf8');

    // Get file size
    const stats = fs.statSync(fullFilePath);

    // LED 6531: Save successful (main process)
    console.log(`✅ Call recording saved: ${fullFilePath} (${stats.size} bytes)`);

    return {
      success: true,
      filePath: fullFilePath,
      fileSize: stats.size
    };

  } catch (error) {
    // LED 8530: Save failed (main process)
    console.error('❌ Failed to save call recording:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// System info
ipcMain.handle('get-system-info', async () => {
  return {
    platform: process.platform,
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node
  };
});

// Enhanced microphone permission handling
ipcMain.handle('request-microphone-access', async () => {
  try {
    // LED 1046: Microphone permission request start
    console.log('🎵 LED 1046: APP_LIFECYCLE - Microphone permission request start {"operation":"permission_request_start","timestamp":' + Date.now() + '} ElectronMain_1046');
    
    // Check if we're on macOS and need to request permission
    if (process.platform === 'darwin') {
      const microphoneAccess = systemPreferences.getMediaAccessStatus('microphone');
      
      console.log('🎵 LED 1047: APP_LIFECYCLE - macOS microphone status {"operation":"macos_permission_check","status":"' + microphoneAccess + '","timestamp":' + Date.now() + '} ElectronMain_1047');
      
      if (microphoneAccess !== 'granted') {
        const granted = await systemPreferences.askForMediaAccess('microphone');
        
        if (granted) {
          console.log('🎵 LED 1048: APP_LIFECYCLE - Microphone permission granted {"operation":"permission_granted","platform":"macOS","timestamp":' + Date.now() + '} ElectronMain_1048');
          return { success: true, status: 'granted', platform: 'macOS' };
        } else {
          console.log('❌ LED 8047 FAILED [ElectronMain]: ERROR_HANDLING Microphone permission denied on macOS');
          return { success: false, error: 'Microphone permission denied', status: 'denied', platform: 'macOS' };
        }
      } else {
        console.log('🎵 LED 1049: APP_LIFECYCLE - Microphone already granted {"operation":"permission_already_granted","platform":"macOS","timestamp":' + Date.now() + '} ElectronMain_1049');
        return { success: true, status: 'already_granted', platform: 'macOS' };
      }
    } else {
      // For Windows and Linux, permissions are typically handled by the browser/system
      console.log('🎵 LED 1050: APP_LIFECYCLE - Non-macOS permission handling {"operation":"non_macos_permission","platform":"' + process.platform + '","timestamp":' + Date.now() + '} ElectronMain_1050');
      return { success: true, status: 'platform_handled', platform: process.platform };
    }
  } catch (error) {
    console.log('❌ LED 8048 FAILED [ElectronMain]: ERROR_HANDLING Microphone permission error: ' + error.message);
    return { success: false, error: error.message };
  }
});

// Audio device enumeration and validation
ipcMain.handle('check-audio-devices', async () => {
  try {
    console.log('🎵 LED 1051: APP_LIFECYCLE - Audio device check start {"operation":"audio_device_check_start","timestamp":' + Date.now() + '} ElectronMain_1051');
    
    // This will be handled by the Python server, but we can do basic checks here
    return { success: true, message: 'Audio device check delegated to Python server' };
  } catch (error) {
    console.log('❌ LED 8049 FAILED [ElectronMain]: ERROR_HANDLING Audio device check error: ' + error.message);
    return { success: false, error: error.message };
  }
});

// Get desktop audio sources for system audio capture
ipcMain.handle('get-desktop-sources', async () => {
  try {
    console.log('🎵 LED 1052: APP_LIFECYCLE - Getting desktop sources for audio capture {"operation":"get_desktop_sources_start","timestamp":' + Date.now() + '} ElectronMain_1052');
    
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      fetchWindowIcons: false
    });
    
    // Find sources with audio capability
    const audioSources = sources.map(source => ({
      id: source.id,
      name: source.name,
      hasAudio: true // All desktop sources can potentially have audio
    }));
    
    console.log('🎵 LED 1053: APP_LIFECYCLE - Desktop sources retrieved {"operation":"desktop_sources_retrieved","count":' + audioSources.length + ',"timestamp":' + Date.now() + '} ElectronMain_1053');
    console.log('🎧 Available audio sources:', audioSources);
    
    return audioSources;
  } catch (error) {
    console.log('❌ LED 8050 FAILED [ElectronMain]: ERROR_HANDLING Desktop sources error: ' + error.message);
    return [];
  }
});

// Load Vosk Configuration from localStorage on startup
ipcMain.handle('load-vosk-config', async () => {
  try {
    // This will be called by the renderer process to load saved config
    // The renderer will pass the config from localStorage
    console.log('🎵 LED 1008: VOSK_CONFIG - Loading saved Vosk configuration');
    return { success: true };
  } catch (error) {
    console.log('❌ LED 8008: VOSK_CONFIG - Failed to load config:', error.message);
    return { success: false, error: error.message };
  }
});

// Vosk Configuration Update Handler
ipcMain.handle('update-vosk-config', async (event, config) => {
  try {
    console.log('🎵 LED 1009: VOSK_CONFIG - Updating Vosk configuration', {
      mode: config?.transcription?.mode,
      partialTimeout: config?.silenceDetection?.partialTimeout,
      timestamp: Date.now()
    });
    
    // If server is running, send config update via WebSocket
    if (pythonWebSocketServer) {
      // Store config for server restart
      global.voskConfig = config;
      
      // TODO: Send config update to running server via WebSocket
      // For now, we'll need to restart the server with new config
      console.log('⚠️ Vosk config updated - restart transcription to apply changes');
      
      return { 
        success: true, 
        message: 'Config saved - restart transcription to apply',
        requiresRestart: true 
      };
    } else {
      // Store config for next server start
      global.voskConfig = config;
      return { 
        success: true, 
        message: 'Config saved for next session' 
      };
    }
  } catch (error) {
    console.log('❌ LED 8009: VOSK_CONFIG - Failed to update config:', error.message);
    return { success: false, error: error.message };
  }
});

// VoiceCoach WebSocket Transcription Service IPC Handlers  
ipcMain.handle('start-transcription', async (event, voskConfigFromRenderer) => {
  const serverStartTime = Date.now();
  
  try {
    // Load Vosk config from renderer if provided (from localStorage)
    if (voskConfigFromRenderer) {
      global.voskConfig = voskConfigFromRenderer;
      console.log('🎵 LED 7306: VOSK_CONFIG - Received config from renderer process', {
        mode: voskConfigFromRenderer?.transcription?.mode,
        enablePartials: voskConfigFromRenderer?.transcription?.enablePartials,
        enableWordTimings: voskConfigFromRenderer?.transcription?.enableWordTimings,
        debounceMs: voskConfigFromRenderer?.performance?.debounceMs,
        enableRecognizerReset: voskConfigFromRenderer?.performance?.enableRecognizerReset,
        recognizerResetInterval: voskConfigFromRenderer?.performance?.recognizerResetInterval,
        partialTimeout: voskConfigFromRenderer?.silenceDetection?.partialTimeout,
        chunkSize: voskConfigFromRenderer?.audio?.chunkSize,
        sampleRate: voskConfigFromRenderer?.audio?.sampleRate
      });
    } else if (!global.voskConfig) {
      console.log('🎵 LED 7307: VOSK_CONFIG - No config received from renderer, will use defaults');
    }
    
    // LED Breadcrumb 1010: Start Python WebSocket server
    console.log('🎵 LED 1010: APP_LIFECYCLE - Starting Python WebSocket server {"operation":"websocket_server_start","port":5000,"timestamp":' + serverStartTime + '} ElectronMain_1010');
    
    // Kill any existing Python server first (ensure clean state)
    if (pythonWebSocketServer) {
      console.log('🎵 LED 1026: APP_LIFECYCLE - Killing existing server before starting new one {"pid":' + pythonWebSocketServer.pid + '}');
      try {
        if (process.platform === 'win32' && pythonWebSocketServer.pid) {
          const { execSync } = require('child_process');
          execSync(`taskkill /F /PID ${pythonWebSocketServer.pid}`, { stdio: 'ignore' });
        } else {
          pythonWebSocketServer.kill('SIGKILL');
        }
      } catch (e) {
        // Ignore errors, process might already be dead
      }
      pythonWebSocketServer = null;
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for cleanup
    }
    
    // LED 1027: Automatic port cleanup to prevent conflicts (Vosk and ChromaDB)
    console.log('🎵 LED 1027: APP_LIFECYCLE - Port cleanup initiation {"operation":"port_cleanup_start","ports":[5000,8767],"timestamp":' + Date.now() + '} ElectronMain_1027');
    
    try {
      // Find and kill any processes using ports 5000 (Vosk) and 8767 (ChromaDB)
      const netstatResult = spawn('netstat', ['-ano'], { shell: true });
      let netstatOutput = '';
      
      netstatResult.stdout.on('data', (data) => {
        netstatOutput += data.toString();
      });
      
      await new Promise((resolve) => {
        netstatResult.on('close', () => {
          const lines = netstatOutput.split('\n');
          const port5000Lines = lines.filter(line => line.includes(':5000') && line.includes('LISTENING'));
          const port8767Lines = lines.filter(line => line.includes(':8767') && line.includes('LISTENING'));
          
          console.log('🎵 LED 1027.1: APP_LIFECYCLE - Port scan results {"operation":"port_scan","port5000_processes":' + port5000Lines.length + ',"port8767_processes":' + port8767Lines.length + '} ElectronMain_1027.1');
          
          if (port5000Lines.length > 0) {
            console.log('⚠️ LED 1027.2: APP_LIFECYCLE - Found orphaned processes on port 5000 (Vosk), cleaning up...');
          }
          if (port8767Lines.length > 0) {
            console.log('⚠️ LED 6508: CHROMADB - Found orphaned processes on port 8767 (ChromaDB), cleaning up...');
          }
          
          // Clean up port 5000 (Vosk)
          port5000Lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0' && !isNaN(pid)) {
              console.log('🎵 LED 1027.3: APP_LIFECYCLE - Killing Vosk port blocker {"operation":"kill_port_blocker","pid":' + pid + ',"port":5000} ElectronMain_1027.3');
              try {
                spawn('taskkill', ['/F', '/PID', pid], { shell: true });
              } catch (killError) {
                console.log('❌ LED 8027 FAILED [ElectronMain]: ERROR_HANDLING Port 5000 cleanup kill failed for PID ' + pid + ': ' + killError.message);
              }
            }
          });
          
          // Clean up port 8767 (ChromaDB)
          port8767Lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0' && !isNaN(pid)) {
              console.log('🎵 LED 6509: CHROMADB - Killing ChromaDB port blocker {"operation":"kill_chromadb_blocker","pid":' + pid + ',"port":8767}');
              try {
                spawn('taskkill', ['/F', '/PID', pid], { shell: true });
              } catch (killError) {
                console.log('❌ LED 8509: CHROMADB - Port 8767 cleanup kill failed for PID ' + pid + ': ' + killError.message);
              }
            }
          });
          
          // Wait a moment for processes to be killed
          setTimeout(() => {
            console.log('🎵 LED 1027.4: APP_LIFECYCLE - Port cleanup complete {"operation":"port_cleanup_complete","ports_cleared":[5000,8767],"wait_time":500} ElectronMain_1027.4');
            resolve();
          }, 500);
        });
      });
      
    } catch (portCleanupError) {
      console.log('❌ LED 8027 FAILED [ElectronMain]: ERROR_HANDLING Port cleanup error: ' + portCleanupError.message);
    }
    
    // LED 1028: Pre-startup system checks
    console.log('🎵 LED 1028: APP_LIFECYCLE - Pre-startup system checks {"operation":"system_checks","existing_server":' + (!!pythonWebSocketServer) + ',"main_process_ready":true,"timestamp":' + Date.now() + '} ElectronMain_1028');
    
    // Clean shutdown of existing server
    if (pythonWebSocketServer) {
      try {
        // LED 1029: Existing server cleanup initiation
        console.log('🎵 LED 1029: APP_LIFECYCLE - Existing server cleanup initiation {"operation":"cleanup_start","server_pid":' + (pythonWebSocketServer ? pythonWebSocketServer.pid : 'null') + ',"timestamp":' + Date.now() + '} ElectronMain_1029');
        
        if (pythonWebSocketServer) {
          pythonWebSocketServer.kill('SIGINT');
        }
        console.log('🎵 LED 1011: APP_LIFECYCLE - Existing server terminated {"operation":"server_cleanup","cleanup_method":"SIGINT","timestamp":' + Date.now() + '} ElectronMain_1011');
        
        // LED 1030: Cleanup wait period
        console.log('🎵 LED 1030: APP_LIFECYCLE - Cleanup wait period {"operation":"cleanup_wait","wait_duration":1000,"timestamp":' + Date.now() + '} ElectronMain_1030');
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for cleanup
        
        // LED 1031: Cleanup verification
        console.log('🎵 LED 1031: APP_LIFECYCLE - Cleanup verification {"operation":"cleanup_complete","server_nullified":' + (!pythonWebSocketServer || (pythonWebSocketServer && pythonWebSocketServer.killed)) + '} ElectronMain_1031');
        
      } catch (error) {
        console.log('❌ LED 8009 FAILED [ElectronMain]: ERROR_HANDLING Server cleanup error: ' + error.message);
        
        // LED 8037: Cleanup failure recovery
        console.log('🎵 LED 8037: ERROR_HANDLING - Cleanup failure recovery {"operation":"cleanup_recovery","error_type":"' + error.name + '","force_kill_required":true} ElectronMain_8037');
      }
    }
    
    // LED 1032: Python server spawn preparation - Use absolute path with app.getAppPath()
    // Using Socket.IO version for dual audio capture compatibility
    const pythonScript = path.join(app.getAppPath(), 'src', 'services', 'vosk-websocket-server.py');
    
    // Prepare Vosk config arguments if available
    const voskConfigArgs = [];
    if (global.voskConfig) {
      const config = global.voskConfig;
      
      console.log('🎵 LED 7308: VOSK_CONFIG - Preparing config arguments for Python server', {
        hasConfig: true,
        configKeys: Object.keys(config)
      });
      
      // Pass key configuration parameters as command-line arguments
      voskConfigArgs.push(
        '--partial-timeout', String(config.silenceDetection?.partialTimeout || 2.0),
        '--sentence-gap', String(config.silenceDetection?.sentenceGapThreshold || 0.5),
        '--min-silence', String(config.silenceDetection?.minTrailingSilence || 0.5),
        '--sample-rate', String(config.audio?.sampleRate || 16000),
        '--chunk-size', String(config.audio?.chunkSize || 8000),
        '--mode', config.transcription?.mode || 'sentence',
        '--min-phrase-words', String(config.transcription?.minPhraseWords || 3)
      );
      
      if (config.silenceDetection?.aggressiveEndpointing) {
        voskConfigArgs.push('--aggressive');
      }
      if (config.transcription?.enablePartials) {
        voskConfigArgs.push('--enable-partials');
      }
      if (config.transcription?.enableWordTimings) {
        voskConfigArgs.push('--enable-word-timings');
      }
      if (config.transcription?.setWords !== undefined) {
        voskConfigArgs.push('--set-words', String(config.transcription.setWords));
      }
      if (config.transcription?.setPartialWords !== undefined) {
        voskConfigArgs.push('--set-partial-words', String(config.transcription.setPartialWords));
      }
      
      // Add audio processing settings
      if (config.audio?.otherPartyGain !== undefined) {
        voskConfigArgs.push('--other-party-gain', String(config.audio.otherPartyGain));
      }
      
      // Add performance settings
      if (config.performance?.enableRecognizerReset) {
        voskConfigArgs.push('--enable-recognizer-reset');
      }
      if (config.performance?.recognizerResetInterval) {
        voskConfigArgs.push('--recognizer-reset-interval', String(config.performance.recognizerResetInterval));
      }
      
      console.log('🎵 LED 7309: VOSK_CONFIG - Config arguments prepared', {
        argCount: voskConfigArgs.length,
        args: voskConfigArgs.join(' ')
      });
    } else {
      console.log('🎵 LED 7310: VOSK_CONFIG - No config available, Python server will use defaults');
    }
    
    // Determine Python executable path - Windows cmd.exe wrapper approach
    let pythonCmd = 'python';
    let pythonArgs = [pythonScript, ...voskConfigArgs];
    
    if (process.platform === 'win32') {
      // Use python directly on Windows without cmd.exe wrapper
      pythonCmd = 'python';
      pythonArgs = [pythonScript, ...voskConfigArgs];
    } else {
      pythonCmd = 'python3';
      pythonArgs = [pythonScript, ...voskConfigArgs];
    }
    
    console.log('🎵 LED 1032: APP_LIFECYCLE - Python server spawn preparation {"operation":"spawn_prep","script_path":"' + pythonScript + '","python_cmd":"' + pythonCmd + '","python_args":["' + pythonArgs.join('","') + '"],"platform":"' + process.platform + '","timestamp":' + Date.now() + '} ElectronMain_1032');
    
    // Spawn Python server directly
    pythonWebSocketServer = spawn(pythonCmd, pythonArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      cwd: __dirname,
      windowsHide: true,  // Hide terminal window on Windows
      shell: false  // Don't use shell to avoid cmd.exe opening an interactive window
    });
    
    // LED 1033: Server process created
    console.log('🎵 LED 1033: APP_LIFECYCLE - Server process created {"operation":"process_spawned","pid":' + (pythonWebSocketServer ? pythonWebSocketServer.pid : 'null') + ',"timestamp":' + Date.now() + '} ElectronMain_1033');
    
    // LED 6500: Check if ChromaDB should be started (respecting config setting)
    let shouldStartChromaDB = false;
    try {
      const liveCoachingConfigPath = path.join(__dirname, 'src', 'config', 'live-coaching-config.ts');
      if (fs.existsSync(liveCoachingConfigPath)) {
        // Read the config file to check useChromaDB setting
        const configContent = fs.readFileSync(liveCoachingConfigPath, 'utf-8');
        shouldStartChromaDB = configContent.includes('useChromaDB: true');
        console.log('🎵 LED 6500: CHROMADB - Config check result: useChromaDB=' + shouldStartChromaDB);
      } else {
        // Default to false if config not found
        console.log('🎵 LED 6500: CHROMADB - Config file not found, defaulting to disabled');
      }
    } catch (configError) {
      console.log('🎵 LED 6500: CHROMADB - Config read error, defaulting to disabled:', configError.message);
    }

    if (!shouldStartChromaDB) {
      console.log('🎵 LED 6500: CHROMADB - ChromaDB disabled in config (useChromaDB: false), skipping startup');
    } else {
      console.log('🎵 LED 6500: CHROMADB - Starting ChromaDB semantic search server {"operation":"chromadb_server_start","port":8767,"timestamp":' + Date.now() + '}');

    try {
      const chromaDBScript = path.join(__dirname, 'src', 'services', 'chromadb-server.py');
      
      // Check if ChromaDB script exists
      if (!fs.existsSync(chromaDBScript)) {
        console.log('⚠️ LED 6501: CHROMADB - ChromaDB server script not found at:', chromaDBScript);
      } else {
        // Kill any existing ChromaDB server
        if (chromaDBServer) {
          try {
            if (process.platform === 'win32' && chromaDBServer.pid) {
              const { execSync } = require('child_process');
              execSync(`taskkill /F /PID ${chromaDBServer.pid}`, { stdio: 'ignore' });
            } else {
              chromaDBServer.kill('SIGKILL');
            }
          } catch (e) {
            // Process might already be dead
          }
          chromaDBServer = null;
        }
        
        // Start ChromaDB server on port 8767
        const chromaDBArgs = [chromaDBScript, '8767'];
        
        chromaDBServer = spawn(pythonCmd, chromaDBArgs, {
          stdio: ['inherit', 'pipe', 'pipe'],
          env: { ...process.env, PYTHONUNBUFFERED: '1' },
          cwd: __dirname,
          windowsHide: true,
          shell: true
        });
        
        console.log('🎵 LED 6502: CHROMADB - ChromaDB server process created {"pid":' + (chromaDBServer ? chromaDBServer.pid : 'null') + '}');
        
        // Handle ChromaDB server output
        chromaDBServer.stdout.on('data', (data) => {
          const output = data.toString().trim();
          if (output) {
            console.log('📊 ChromaDB:', output);
          }
        });
        
        chromaDBServer.stderr.on('data', (data) => {
          const output = data.toString().trim();
          if (output && !output.includes('Using cache')) {
            console.error('❌ ChromaDB Error:', output);
          }
        });
        
        chromaDBServer.on('error', (error) => {
          console.error('❌ LED 8500: CHROMADB - Failed to start ChromaDB server:', error);
        });
        
        chromaDBServer.on('exit', (code, signal) => {
          console.log('🎵 LED 6503: CHROMADB - ChromaDB server exited {"code":' + code + ',"signal":"' + signal + '"}');
          chromaDBServer = null;
        });
      }
    } catch (chromaError) {
      console.error('❌ LED 8501: CHROMADB - Error starting ChromaDB server:', chromaError);
      // Continue without ChromaDB - will fall back to keyword search
    }
    } // End of ChromaDB startup conditional block
    
    // Handle spawn errors immediately
    pythonWebSocketServer.on('error', (error) => {
      console.log('❌ LED 8044 FAILED [ElectronMain]: ERROR_HANDLING Python spawn error: ' + error.message);
      console.log('🎵 LED 8044: ERROR_HANDLING - Spawn error details {"operation":"spawn_error","error_code":"' + error.code + '","error_type":"' + error.name + '","python_cmd":"' + pythonCmd + '","script_path":"' + pythonScript + '"} ElectronMain_8044');
    });
    
    // Enhanced server startup monitoring
    let serverStarted = false;
    let startupTimeout;
    
    // Promise for server health check
    const serverHealthCheck = new Promise((resolve, reject) => {
      // Success detection
      if (pythonWebSocketServer && pythonWebSocketServer.stdout) {
        pythonWebSocketServer.stdout.on('data', (data) => {
        const output = data.toString();
        
        // LED 1034: Server output analysis - Fixed patterns to match actual server output
        const hasRunningIndicator = output.includes('Running on') || output.includes('running on');
        const hasPortIndicator = output.includes('5000') || output.includes(':5000') || output.includes('localhost:5000');
        const hasReadyIndicator = output.includes('[6099') || output.includes('WebSocket server started') || output.includes('WebSocket Server running') || (output.includes('Running on') && output.includes('5000'));
        
        console.log('🎵 LED 1012: APP_LIFECYCLE - Python server output {"operation":"server_output","length":' + output.length + ',"has_running":' + hasRunningIndicator + ',"has_port":' + hasPortIndicator + ',"has_ready":' + hasReadyIndicator + '} ElectronMain_1012');
        
        // Check if server is ready
        if (hasRunningIndicator || hasPortIndicator || hasReadyIndicator) {
          if (!serverStarted) {
            serverStarted = true;
            
            const startupTime = Date.now() - serverStartTime;
            
            console.log('🎵 LED 1013: APP_LIFECYCLE - WebSocket server ready {"operation":"server_ready","startup_time":' + startupTime + ',"ready_indicators":{"running":' + hasRunningIndicator + ',"port":' + hasPortIndicator + ',"ready":' + hasReadyIndicator + '},"timestamp":' + Date.now() + '} ElectronMain_1013');
            
            // LED 1035: Server startup performance metrics
            console.log('🎵 LED 1035: APP_LIFECYCLE - Server startup performance {"operation":"startup_metrics","startup_time":' + startupTime + ',"performance":"' + (startupTime < 3000 ? 'fast' : startupTime < 8000 ? 'normal' : 'slow') + '","pid":' + (pythonWebSocketServer ? pythonWebSocketServer.pid : 'null') + '} ElectronMain_1035');
            
            clearTimeout(startupTimeout);
            resolve(true);
          }
        }
        });
      }
      
      // Error detection
      if (pythonWebSocketServer && pythonWebSocketServer.stderr) {
        pythonWebSocketServer.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        
        // Check if this is actually a success message in stderr (Python often outputs to stderr)
        const hasRunningIndicator = errorOutput.includes('Running on') || errorOutput.includes('running on');
        const hasPortIndicator = errorOutput.includes('5000') || errorOutput.includes(':5000') || errorOutput.includes('localhost:5000');
        const hasReadyIndicator = errorOutput.includes('[6099') || errorOutput.includes('WebSocket server started') || errorOutput.includes('WebSocket Server running');
        
        // If this is actually a success message, handle it as success
        if (hasRunningIndicator || hasPortIndicator || hasReadyIndicator) {
          console.log('🎵 LED 1012: APP_LIFECYCLE - Python server stderr (success): ' + errorOutput.trim());
          
          if (!serverStarted) {
            serverStarted = true;
            const startupTime = Date.now() - serverStartTime;
            
            console.log('🎵 LED 1013: APP_LIFECYCLE - WebSocket server ready from stderr {"operation":"server_ready","startup_time":' + startupTime + ',"timestamp":' + Date.now() + '} ElectronMain_1013');
            
            clearTimeout(startupTimeout);
            resolve({ success: true, serverUrl: 'ws://127.0.0.1:5000' });
          }
          return;
        }
        
        // LED 8038: Error categorization
        const isPortError = errorOutput.includes('Address already in use');
        const isModuleError = errorOutput.includes('ModuleNotFoundError');
        const isPermissionError = errorOutput.includes('Permission denied');
        const isNetworkError = errorOutput.includes('network') || errorOutput.includes('socket');
        const isCritical = isPortError || isModuleError || isPermissionError;

        // Check if this is actually a normal operational message, not an error
        const isNormalOperation = errorOutput.includes('Sending packet MESSAGE') ||
                                errorOutput.includes('transcription') ||
                                errorOutput.includes('audio_chunk') ||
                                errorOutput.includes('POST /socket.io/') ||
                                errorOutput.includes('200 -') ||
                                errorOutput.includes('breadcrumb');

        if (isNormalOperation) {
          // This is normal WebSocket communication, not an error
          console.log('🎵 LED 6031: VOSK_OPERATION - Normal transcription activity: ' + errorOutput.substring(0, 100) + '...');
        } else {
          // This is an actual error
          console.log('❌ LED 8011 FAILED [ElectronMain]: ERROR_HANDLING Python WebSocket Server error: ' + errorOutput);

          // LED 8038: Error categorization (ONLY FOR ACTUAL ERRORS)
          console.log('🎵 LED 8038: ERROR_HANDLING - Error categorization {"operation":"error_analysis","is_port_error":' + isPortError + ',"is_module_error":' + isModuleError + ',"is_permission_error":' + isPermissionError + ',"is_network_error":' + isNetworkError + ',"is_critical":' + isCritical + '} ElectronMain_8038');
        }
        
        // Critical errors that prevent startup
        if (isCritical) {
          // LED 8039: Critical error handling
          console.log('🎵 LED 8039: ERROR_HANDLING - Critical error detected {"operation":"critical_error","error_type":"' + (isPortError ? 'port_conflict' : isModuleError ? 'missing_module' : 'permission_denied') + '","startup_failed":true} ElectronMain_8039');
          
          clearTimeout(startupTimeout);
          reject(new Error('Server startup failed: ' + errorOutput.trim()));
        }
        });
      }
      
      // Exit monitoring
      if (pythonWebSocketServer) {
        pythonWebSocketServer.on('exit', (code) => {
        const exitTime = Date.now() - serverStartTime;
        const exitReason = code === 0 ? 'normal_exit' : code === 1 ? 'general_error' : code === 2 ? 'misuse' : 'unknown_error';
        
        console.log('🎵 LED 1014: APP_LIFECYCLE - Python server exit {"operation":"server_exit","code":' + code + ',"exit_time":' + exitTime + ',"exit_reason":"' + exitReason + '","was_started":' + serverStarted + '} ElectronMain_1014');
        
        // LED 1036: Exit analysis
        console.log('🎵 LED 1036: APP_LIFECYCLE - Server exit analysis {"operation":"exit_analysis","unexpected_exit":' + (!serverStarted) + ',"exit_code_normal":' + (code === 0) + ',"runtime":' + exitTime + '} ElectronMain_1036');
        
        pythonWebSocketServer = null;
        
        if (!serverStarted) {
          // LED 8040: Premature exit error
          console.log('❌ LED 8040 FAILED [ElectronMain]: ERROR_HANDLING Server exited prematurely with code: ' + code + ', runtime: ' + exitTime + 'ms');
          
          clearTimeout(startupTimeout);
          reject(new Error('Server exited before startup completed with code: ' + code));
        }
        });
      }
      
      // Startup timeout (15 seconds)
      startupTimeout = setTimeout(() => {
        if (!serverStarted) {
          const timeoutTime = Date.now() - serverStartTime;
          
          console.log('❌ LED 8012 FAILED [ElectronMain]: ERROR_HANDLING Server startup timeout after ' + (timeoutTime/1000) + ' seconds');
          
          // LED 8041: Timeout analysis
          console.log('🎵 LED 8041: ERROR_HANDLING - Startup timeout analysis {"operation":"timeout_analysis","timeout_duration":' + timeoutTime + ',"server_responsive":false,"process_exists":' + (!!pythonWebSocketServer) + ',"pid":' + (pythonWebSocketServer?.pid || 'null') + '} ElectronMain_8041');
          
          reject(new Error('Server startup timeout after 15 seconds'));
        }
      }, 15000);
    });
    
    // Wait for server to be ready or timeout
    await serverHealthCheck;
    
    // LED 1037: Post-startup stability verification
    console.log('🎵 LED 1037: APP_LIFECYCLE - Post-startup stability verification {"operation":"stability_check","server_running":true,"timestamp":' + Date.now() + '} ElectronMain_1037');
    
    // Additional stability wait
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const totalStartupTime = Date.now() - serverStartTime;
    
    console.log('🎵 LED 1015: APP_LIFECYCLE - WebSocket server startup complete {"operation":"server_startup_success","total_time":' + totalStartupTime + ',"performance":"' + (totalStartupTime < 5000 ? 'excellent' : totalStartupTime < 10000 ? 'good' : 'slow') + '","timestamp":' + Date.now() + '} ElectronMain_1015');
    
    // LED 1038: Startup success metrics
    console.log('🎵 LED 1038: APP_LIFECYCLE - Startup success metrics {"operation":"startup_metrics","total_startup_time":' + totalStartupTime + ',"server_pid":' + (pythonWebSocketServer ? pythonWebSocketServer.pid : 'null') + ',"server_ready":true,"url":"ws://127.0.0.1:5000"} ElectronMain_1038');
    
    return { success: true, serverUrl: 'ws://127.0.0.1:5000' };
    
  } catch (error) {
    const failureTime = Date.now() - serverStartTime;
    
    console.log('❌ LED 8013 FAILED [ElectronMain]: ERROR_HANDLING Failed to start WebSocket server: ' + error.message);
    
    // LED 8042: Startup failure analysis
    console.log('🎵 LED 8042: ERROR_HANDLING - Startup failure analysis {"operation":"startup_failure","error_message":"' + error.message + '","failure_time":' + failureTime + ',"cleanup_required":' + (!!pythonWebSocketServer) + '} ElectronMain_8042');
    
    // Cleanup failed server
    if (pythonWebSocketServer) {
      try {
        // LED 1039: Emergency cleanup
        console.log('🎵 LED 1039: APP_LIFECYCLE - Emergency server cleanup {"operation":"emergency_cleanup","cleanup_method":"SIGKILL","pid":' + (pythonWebSocketServer ? pythonWebSocketServer.pid : 'null') + '} ElectronMain_1039');
        
        if (pythonWebSocketServer) {
          pythonWebSocketServer.kill('SIGKILL');
        }
        pythonWebSocketServer = null;
        
        // LED 1040: Emergency cleanup complete
        console.log('🎵 LED 1040: APP_LIFECYCLE - Emergency cleanup complete {"operation":"emergency_cleanup_complete","server_nullified":true,"timestamp":' + Date.now() + '} ElectronMain_1040');
        
      } catch (cleanupError) {
        console.log('❌ LED 8014 FAILED [ElectronMain]: ERROR_HANDLING Server cleanup failed: ' + cleanupError.message);
        
        // LED 8043: Cleanup failure - system may need manual intervention
        console.log('🎵 LED 8043: ERROR_HANDLING - Cleanup failure critical {"operation":"cleanup_failure_critical","manual_intervention_required":true,"error":"' + cleanupError.message + '"} ElectronMain_8043');
      }
    }
    
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-transcription', async () => {
  const stopStartTime = Date.now();
  
  try {
    // LED 1041: Stop transcription initiation
    console.log('🎵 LED 1041: APP_LIFECYCLE - Stop transcription initiation {"operation":"stop_transcription_start","has_server":' + (!!pythonWebSocketServer) + ',"timestamp":' + stopStartTime + '} ElectronMain_1041');
    
    // LED Breadcrumb 1007: Stop Python WebSocket server
    if (pythonWebSocketServer) {
      const serverPid = pythonWebSocketServer ? pythonWebSocketServer.pid : null;
      
      // LED 1042: Server stop signal sent
      console.log('🎵 LED 1042: APP_LIFECYCLE - Server stop signal sent {"operation":"stop_signal","signal":"SIGTERM","pid":' + serverPid + ',"timestamp":' + Date.now() + '} ElectronMain_1042');
      
      // On Windows, use taskkill for reliable termination
      if (process.platform === 'win32' && serverPid) {
        try {
          // Use taskkill to ensure the process is terminated
          const { exec } = require('child_process');
          exec(`taskkill /F /PID ${serverPid}`, (error, stdout, stderr) => {
            if (error) {
              console.log('🎵 LED 8046: ERROR_HANDLING - Taskkill error (may be already stopped): ' + error.message);
            } else {
              console.log('🎵 LED 1042.1: APP_LIFECYCLE - Server terminated via taskkill {"pid":' + serverPid + '}');
            }
          });
        } catch (killError) {
          console.log('🎵 LED 8047: ERROR_HANDLING - Failed to use taskkill: ' + killError.message);
        }
      } else if (pythonWebSocketServer) {
        // For non-Windows, use SIGTERM then SIGKILL
        pythonWebSocketServer.kill('SIGTERM');
      }
      
      // Remove all event listeners to prevent processing buffered output from dead process
      if (pythonWebSocketServer && pythonWebSocketServer.stdout) {
        pythonWebSocketServer.stdout.removeAllListeners();
      }
      if (pythonWebSocketServer && pythonWebSocketServer.stderr) {
        pythonWebSocketServer.stderr.removeAllListeners();
      }
      if (pythonWebSocketServer) {
        pythonWebSocketServer.removeAllListeners();
      }

      // Wait brief moment for termination
      await new Promise(resolve => setTimeout(resolve, 500));

      pythonWebSocketServer = null;
      
      // LED 6504: Stop ChromaDB server
      if (chromaDBServer) {
        const chromaPid = chromaDBServer.pid;
        console.log('🎵 LED 6504: CHROMADB - Stopping ChromaDB server {"pid":' + chromaPid + '}');
        
        try {
          if (process.platform === 'win32' && chromaPid) {
            const { exec } = require('child_process');
            exec(`taskkill /F /PID ${chromaPid}`, (error) => {
              if (error) {
                console.log('⚠️ LED 6505: CHROMADB - Error stopping ChromaDB:', error.message);
              }
            });
          } else {
            chromaDBServer.kill('SIGTERM');
          }
        } catch (e) {
          console.log('⚠️ LED 6506: CHROMADB - Exception stopping ChromaDB:', e.message);
        }
        chromaDBServer = null;
      }
      
      const stopTime = Date.now() - stopStartTime;
      
      // LED 1043: Servers stop complete
      console.log('🎵 LED 1043: APP_LIFECYCLE - Servers stop complete {"operation":"stop_complete","stop_time":' + stopTime + ',"graceful_shutdown":true,"servers_nullified":true} ElectronMain_1043');
    } else {
      // LED 1044: No server to stop
      console.log('🎵 LED 1044: APP_LIFECYCLE - No server to stop {"operation":"stop_no_server","server_already_null":true,"timestamp":' + Date.now() + '} ElectronMain_1044');
    }
    
    return { success: true };
  } catch (error) {
    console.log('❌ LED 8044 FAILED [ElectronMain]: ERROR_HANDLING Failed to stop WebSocket server: ' + error.message);
    
    // LED 8045: Stop failure recovery
    console.log('🎵 LED 8045: ERROR_HANDLING - Stop failure recovery {"operation":"stop_failure","error_message":"' + error.message + '","force_cleanup":true} ElectronMain_8045');
    
    // Force cleanup
    try {
      if (pythonWebSocketServer) {
        if (pythonWebSocketServer) {
          pythonWebSocketServer.kill('SIGKILL');
        }
        pythonWebSocketServer = null;
        console.log('🎵 LED 1045: APP_LIFECYCLE - Force stop complete {"operation":"force_stop","method":"SIGKILL"} ElectronMain_1045');
      }
    } catch (forceError) {
      console.log('❌ LED 8046 FAILED [ElectronMain]: ERROR_HANDLING Force stop failed: ' + forceError.message);
    }
    
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-conversation-history', async () => {
  try {
    return { success: true, history: conversationHistory };
  } catch (error) {
    console.error('[8006] Failed to get conversation history:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-conversation-history', async () => {
  try {
    conversationHistory = [];
    return { success: true };
  } catch (error) {
    console.error('[8007] Failed to clear conversation history:', error);
    return { success: false, error: error.message };
  }
});

// ChromaDB IPC Handlers
// LED Range: 6450-6499 for ChromaDB IPC operations
let chromaDBWebSocketClient = null;
let chromaDBStarting = false; // Flag to prevent duplicate startup

ipcMain.handle('chromadb-start-server', async () => {
  try {
    // Check if already starting or started
    if (chromaDBStarting || chromaDBServer) {
      console.log('🎵 LED 6449: CHROMADB - Server already starting or started, skipping duplicate request');
      return { success: true, message: 'ChromaDB server already starting/started' };
    }
    
    chromaDBStarting = true;
    
    // LED 6450: ChromaDB server startup
    console.log('🎵 LED 6450: CHROMADB - Starting ChromaDB server {"operation":"server_startup_initiate","timestamp":' + Date.now() + '}');
    
    // Clean up port 8767 like we do for Vosk
    const { exec } = require('child_process');
    
    // Kill any existing ChromaDB processes on port 8767
    await new Promise((resolve) => {
      exec('netstat -ano | findstr :8767', (error, stdout) => {
        if (stdout) {
          const lines = stdout.split('\n');
          const port8767Lines = lines.filter(line => line.includes(':8767') && line.includes('LISTENING'));
          
          port8767Lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0') {
              exec(`taskkill /F /PID ${pid}`, (killError) => {
                if (!killError) {
                  console.log('🎵 LED 6451: CHROMADB - Cleared existing ChromaDB process on port 8767');
                }
              });
            }
          });
        }
        setTimeout(resolve, 500); // Wait for port cleanup
      });
    });
    
    // Start ChromaDB Python server
    const chromaDBScriptPath = path.join(__dirname, 'src', 'services', 'chromadb-server.py');
    
    chromaDBServer = spawn('python', [chromaDBScriptPath], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32'
    });
    
    chromaDBServer.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('[6500]')) {
        console.log('🎵 LED 6452: CHROMADB - Server output:', output.trim());
      }
    });
    
    chromaDBServer.stderr.on('data', (data) => {
      console.error('❌ LED 8650: CHROMADB - Server error:', data.toString());
    });
    
    chromaDBServer.on('close', (code) => {
      console.log('🎵 LED 6453: CHROMADB - Server closed with code:', code);
      chromaDBServer = null;
      chromaDBStarting = false; // Reset flag
    });
    
    // Wait for server to be ready by checking if port is listening
    let serverReady = false;
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const isListening = await new Promise((resolve) => {
        exec('netstat -ano | findstr :8767 | findstr LISTENING', (error, stdout) => {
          resolve(!!stdout && stdout.trim().length > 0);
        });
      });
      
      if (isListening) {
        serverReady = true;
        console.log('🎵 LED 6453: CHROMADB - Server is listening on port 8767');
        break;
      }
    }
    
    if (!serverReady) {
      throw new Error('ChromaDB server failed to start listening on port 8767');
    }
    
    chromaDBStarting = false; // Reset flag after successful start
    console.log('🎵 LED 6454: CHROMADB - Server started successfully');
    return { success: true, message: 'ChromaDB server started' };
    
  } catch (error) {
    chromaDBStarting = false; // Reset flag on error
    console.error('❌ LED 8651: CHROMADB - Failed to start server:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('chromadb-stop-server', async () => {
  try {
    chromaDBStarting = false; // Reset flag
    if (chromaDBServer) {
      chromaDBServer.kill();
      chromaDBServer = null;
    }
    
    // Also cleanup any orphaned ChromaDB processes
    const { exec } = require('child_process');
    exec('taskkill /F /IM python.exe /FI "WINDOWTITLE eq *chromadb-server*"', () => {
      console.log('🎵 LED 6455: CHROMADB - Server stopped');
    });
    
    return { success: true };
  } catch (error) {
    console.error('❌ LED 8652: CHROMADB - Failed to stop server:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('chromadb-initialize', async () => {
  try {
    // Check if already connected
    if (chromaDBWebSocketClient && chromaDBWebSocketClient.readyState === 1) {
      console.log('🎵 LED 6458: CHROMADB - Already connected, skipping initialization');
      return { success: true, message: 'ChromaDB already connected' };
    }
    
    // Clean up any existing connection
    if (chromaDBWebSocketClient) {
      try {
        chromaDBWebSocketClient.close();
      } catch (e) {
        // Ignore cleanup errors
      }
      chromaDBWebSocketClient = null;
    }
    
    // Initialize ChromaDB client connection
    const WebSocket = require('ws');
    chromaDBWebSocketClient = new WebSocket('ws://127.0.0.1:8767');
    
    // Set up event handlers before waiting
    chromaDBWebSocketClient.on('error', (error) => {
      console.error('❌ LED 8653: CHROMADB - WebSocket error:', error.message);
    });
    
    chromaDBWebSocketClient.on('close', () => {
      console.log('🎵 LED 6459: CHROMADB - WebSocket connection closed');
      chromaDBWebSocketClient = null;
    });
    
    // Wait for connection
    await new Promise((resolve, reject) => {
      chromaDBWebSocketClient.once('open', () => {
        console.log('🎵 LED 6456: CHROMADB - WebSocket client connected');
        resolve();
      });
      
      chromaDBWebSocketClient.once('error', (error) => {
        reject(error);
      });
      
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
    
    // Send initialize command and wait for response
    chromaDBWebSocketClient.send(JSON.stringify({ command: 'initialize' }));
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Initialize response timeout'));
      }, 2000);
      
      chromaDBWebSocketClient.once('message', (data) => {
        clearTimeout(timeout);
        try {
          const response = JSON.parse(data.toString());
          console.log('🎵 LED 6457: CHROMADB - Initialization response:', response.message || response.status || 'ready');
          if (response.status === 'success' || response.message) {
            resolve();
          } else {
            reject(new Error('Invalid initialization response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    
    // Verify connection is still open
    if (chromaDBWebSocketClient.readyState !== 1) {
      throw new Error('Connection lost after initialization');
    }
    
    console.log('🎵 LED 6460: CHROMADB - Initialization complete and verified');
    return { success: true, message: 'ChromaDB initialized and ready' };
    
  } catch (error) {
    console.error('❌ LED 8654: CHROMADB - Failed to initialize:', error.message);
    // Clean up on error
    if (chromaDBWebSocketClient) {
      try {
        chromaDBWebSocketClient.close();
      } catch (e) {
        // Ignore
      }
      chromaDBWebSocketClient = null;
    }
    return { success: false, error: error.message };
  }
});

ipcMain.handle('chromadb-load-document', async (event, documentPath) => {
  try {
    if (!chromaDBWebSocketClient || chromaDBWebSocketClient.readyState !== 1) {
      throw new Error('ChromaDB not connected');
    }
    
    // Send load document command
    const message = JSON.stringify({ 
      command: 'load_document',
      path: documentPath
    });
    
    chromaDBWebSocketClient.send(message);
    
    // Wait for response
    const response = await new Promise((resolve) => {
      chromaDBWebSocketClient.once('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });
    
    console.log('🎵 LED 6457: CHROMADB - Document loaded:', documentPath);
    return response;
  } catch (error) {
    console.error('❌ LED 8655: CHROMADB - Failed to load document:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('chromadb-search', async (event, query, nResults = 3) => {
  try {
    if (!chromaDBWebSocketClient || chromaDBWebSocketClient.readyState !== 1) {
      throw new Error('ChromaDB not connected');
    }
    
    // Send search command
    const message = JSON.stringify({ 
      command: 'search',
      query: query,
      n_results: nResults
    });
    
    chromaDBWebSocketClient.send(message);
    
    // Wait for response
    const response = await new Promise((resolve) => {
      chromaDBWebSocketClient.once('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });
    
    console.log('🎵 LED 6458: CHROMADB - Search complete, found', response.results?.length || 0, 'results');
    return response;
  } catch (error) {
    console.error('❌ LED 8656: CHROMADB - Search failed:', error);
    return { success: false, error: error.message, results: [] };
  }
});

ipcMain.handle('chromadb-get-stats', async () => {
  try {
    if (!chromaDBWebSocketClient || chromaDBWebSocketClient.readyState !== 1) {
      return { status: 'disconnected' };
    }
    
    const message = JSON.stringify({ command: 'get_stats' });
    chromaDBWebSocketClient.send(message);
    
    const response = await new Promise((resolve) => {
      chromaDBWebSocketClient.once('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });
    
    return response.stats || { status: 'error' };
  } catch (error) {
    console.error('❌ LED 8657: CHROMADB - Failed to get stats:', error);
    return { status: 'error', error: error.message };
  }
});

ipcMain.handle('chromadb-ping', async () => {
  try {
    // First check if the WebSocket client exists and is connected
    if (!chromaDBWebSocketClient || chromaDBWebSocketClient.readyState !== 1) {
      // Try to check if the server is running by checking the port
      const { exec } = require('child_process');
      const isServerRunning = await new Promise((resolve) => {
        exec('netstat -ano | findstr :8767 | findstr LISTENING', (error, stdout) => {
          resolve(!!stdout && stdout.trim().length > 0);
        });
      });
      
      if (!isServerRunning) {
        return false; // Server not running
      }
      
      // Server is running but we don't have a WebSocket connection yet
      // This is OK during pre-warming phase
      return 'server-only';
    }
    
    // We have a WebSocket connection, send a ping
    const message = JSON.stringify({ command: 'ping' });
    chromaDBWebSocketClient.send(message);
    
    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 2000);
      
      chromaDBWebSocketClient.once('message', (data) => {
        clearTimeout(timeout);
        resolve(JSON.parse(data.toString()));
      });
    });
    
    return response.status === 'success';
  } catch (error) {
    console.log('🎵 LED 6458: CHROMADB - Ping failed:', error.message);
    return false;
  }
});

// Vosk Optimizer IPC Handlers
ipcMain.handle('launch-vosk-optimizer', async (event, config) => {
  console.log('🎵 LED 7700: VOSK_OPTIMIZER - Launching Vosk optimization', config);
  
  const WebSocket = require('ws');
  
  try {
    // Ensure Vosk server is running for optimization
    console.log('🎵 LED 7699: VOSK_OPTIMIZER - Checking Vosk server availability');
    
    // First, try to connect to see if server is already running
    // Use 127.0.0.1 instead of localhost to avoid IPv6 issues
    const serverRunning = await new Promise((resolve) => {
      const testWs = new WebSocket('ws://127.0.0.1:5000');
      
      testWs.on('open', () => {
        console.log('🎵 LED 7695: VOSK_OPTIMIZER - Vosk server already running and accessible');
        testWs.close();
        resolve(true);
      });
      
      testWs.on('error', () => {
        console.log('🎵 LED 7698: VOSK_OPTIMIZER - Vosk server not accessible, will start it');
        resolve(false);
      });
      
      // Timeout after 1 second
      setTimeout(() => {
        testWs.close();
        resolve(false);
      }, 1000);
    });
    
    // If server is not running, start it
    if (!serverRunning) {
      console.log('🎵 LED 7694: VOSK_OPTIMIZER - Starting Vosk server for optimization');
      
      // Start the server
      const { spawn } = require('child_process');
      const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
      const pythonScript = path.join(__dirname, 'src/services/vosk-websocket-server.py');
      
      if (!fs.existsSync(pythonScript)) {
        throw new Error('Vosk server script not found: ' + pythonScript);
      }
      
      // Store in a local variable to avoid conflicts
      const optimizerServer = spawn(pythonPath, [pythonScript], {
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });
      
      // Store it globally if main server isn't running
      if (!pythonWebSocketServer) {
        pythonWebSocketServer = optimizerServer;
      }
      
      // Wait for server to be ready (look for actual output messages)
      await new Promise((resolve, reject) => {
        let serverReady = false;
        const timeout = setTimeout(() => {
          if (!serverReady) {
            console.log('🎵 LED 7690: VOSK_OPTIMIZER - Server startup timeout, checking if it started anyway');
            // Try connecting one more time - use 127.0.0.1 to avoid IPv6 issues
            const finalTest = new WebSocket('ws://127.0.0.1:5000');
            finalTest.on('open', () => {
              finalTest.close();
              resolve();
            });
            finalTest.on('error', () => {
              reject(new Error('Vosk server failed to start after timeout'));
            });
          }
        }, 20000); // 20 second timeout
        
        optimizerServer.stdout.on('data', (data) => {
          const output = data.toString();
          console.log('🎵 LED 7692: VOSK_OPTIMIZER - Server stdout:', output.substring(0, 200));
          
          // Check for actual server start messages
          if (!serverReady && (
              output.includes('[6099]') ||  // Starting VoiceCoach V2 Native WebSocket Server
              output.includes('[6099.5]') || // Waiting for client connections
              output.includes('Native WebSocket') ||
              output.includes('Model loaded') ||
              output.includes('server') ||
              output.includes('5000'))) {
            serverReady = true;
            clearTimeout(timeout);
            console.log('🎵 LED 7697: VOSK_OPTIMIZER - Vosk server started (stdout)');
            setTimeout(resolve, 3000); // Give it 3 seconds to fully stabilize
          }
        });
        
        optimizerServer.stderr.on('data', (data) => {
          const output = data.toString();
          // Only log first part to avoid spam
          if (output.length > 200) {
            console.log('🎵 LED 7691: VOSK_OPTIMIZER - Server stderr (truncated):', output.substring(0, 200));
          } else {
            console.log('🎵 LED 7691: VOSK_OPTIMIZER - Server stderr:', output);
          }
          
          // Vosk model loading messages often go to stderr
          if (!serverReady && (
              output.includes('Model loaded') ||
              output.includes('LOG (VoskAPI') ||
              output.includes('ivector') ||
              output.includes('Ready') ||
              output.includes('[6099]'))) {
            // Don't mark as ready on first LOG message, wait for more
            // But if we see the server message, mark as ready
            if (output.includes('[6099]') || output.includes('Native WebSocket')) {
              serverReady = true;
              clearTimeout(timeout);
              console.log('🎵 LED 7697: VOSK_OPTIMIZER - Vosk server started (stderr)');
              setTimeout(resolve, 3000);
            }
          }
        });
        
        optimizerServer.on('error', (error) => {
          clearTimeout(timeout);
          console.error('🎵 LED 7689: VOSK_OPTIMIZER - Server spawn error:', error);
          reject(new Error(`Failed to start Vosk server: ${error.message}`));
        });
      });
      
      console.log('🎵 LED 7688: VOSK_OPTIMIZER - Vosk server ready for optimization');
    }
    
    // Read the reference text
    const referenceText = fs.readFileSync(config.textFile, 'utf-8').trim().toLowerCase();
    console.log('🎵 LED 7701: VOSK_OPTIMIZER - Loaded reference text', { length: referenceText.length });
    
    // Read the WAV file
    const audioBuffer = fs.readFileSync(config.audioFile);
    console.log('🎵 LED 7702: VOSK_OPTIMIZER - Loaded audio file', { size: audioBuffer.length });
    
    // For actual audio processing, we need to send the raw audio to Vosk
    // Since Vosk expects 16kHz mono PCM, we'll send the buffer directly
    
    // First, test current settings as baseline
    const currentSettings = config.currentSettings || {
      sampleRate: 16000,
      chunkSize: 8000,
      setWords: false,
      setPartialWords: true
    };
    
    console.log('🎵 LED 7703: VOSK_OPTIMIZER - Testing baseline with current settings', currentSettings);
    
    // Send baseline test progress
    if (mainWindow) {
      mainWindow.webContents.send('vosk-optimization-progress', {
        phase: 'baseline',
        message: 'Testing your current settings as baseline...'
      });
    }
    
    // Test baseline configuration
    console.log('🎵 LED 7703.5: VOSK_OPTIMIZER - Starting baseline test');
    
    const baselineResult = await testVoskConfiguration(
      audioBuffer,
      referenceText,
      currentSettings
    ).catch(error => {
      console.error('🎵 LED 7694: VOSK_OPTIMIZER - Baseline test failed', error);
      throw new Error(`Failed to establish baseline: ${error.message}`);
    });
    
    if (!baselineResult) {
      throw new Error('Failed to establish baseline with current settings. The Vosk server may not be responding correctly.');
    }
    
    console.log('🎵 LED 7704: VOSK_OPTIMIZER - Baseline established', {
      wordAccuracy: baselineResult.metrics.wordAccuracy,
      processingTime: baselineResult.metrics.processingTime
    });
    
    // Parameter combinations to test based on mode
    const parameterSets = generateVoskParameterSets(config.mode);
    const results = [baselineResult]; // Include baseline in results
    let bestResult = baselineResult; // Start with baseline as best
    let bestScore = calculateOptimizationScore(baselineResult.metrics, config.targetMetric);
    
    console.log('🎵 LED 7705: VOSK_OPTIMIZER - Starting optimization tests', { totalTests: parameterSets.length });
    
    // Test each parameter combination
    for (let i = 0; i < parameterSets.length; i++) {
      const params = parameterSets[i];
      
      // Send progress update to renderer
      if (mainWindow) {
        mainWindow.webContents.send('vosk-optimization-progress', {
          phase: 'testing',
          totalTests: parameterSets.length,
          currentTest: i + 1,
          currentParams: params
        });
      }
      
      console.log(`🎵 LED 7706: VOSK_OPTIMIZER - Testing parameter set ${i + 1}/${parameterSets.length}`, params);
      
      // Connect to Vosk WebSocket with these parameters
      const testResult = await testVoskConfiguration(
        audioBuffer,
        referenceText,
        params
      );
      
      if (testResult) {
        results.push(testResult);
        
        // Calculate overall score based on target metric
        const score = calculateOptimizationScore(testResult.metrics, config.targetMetric);
        
        if (score > bestScore) {
          bestScore = score;
          bestResult = testResult;
        }
      }
    }
    
    // Calculate improvement over actual baseline (first result)
    const actualBaseline = results[0]; // This is the user's current settings
    
    const improvement = bestResult && actualBaseline ? {
      accuracyGain: bestResult.metrics.wordAccuracy - actualBaseline.metrics.wordAccuracy,
      speedGain: ((actualBaseline.metrics.processingTime - bestResult.metrics.processingTime) / 
                  actualBaseline.metrics.processingTime * 100),
      baselineAccuracy: actualBaseline.metrics.wordAccuracy,
      optimalAccuracy: bestResult.metrics.wordAccuracy
    } : { accuracyGain: 0, speedGain: 0, baselineAccuracy: 0, optimalAccuracy: 0 };
    
    console.log('🎵 LED 7707: VOSK_OPTIMIZER - Optimization complete', {
      testsRun: results.length,
      bestAccuracy: bestResult?.metrics.wordAccuracy
    });
    
    // Save results to file
    const resultsPath = path.join(__dirname, 'vosk-optimization', 'results', 
      `optimization-${Date.now()}.json`);
    
    // Ensure results directory exists
    const resultsDir = path.dirname(resultsPath);
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      config: config,
      bestSettings: bestResult?.params,
      metrics: bestResult?.metrics,
      improvement: improvement,
      allResults: results,
      systemProfile: {
        cpuModel: require('os').cpus()[0].model,
        availableMemory: Math.round(require('os').freemem() / (1024 * 1024 * 1024))
      }
    }, null, 2));
    
    return {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        parameters: bestResult?.params || null,
        metrics: bestResult?.metrics || null,
        improvement: improvement.accuracyGain,
        systemProfile: {
          cpuModel: require('os').cpus()[0].model,
          availableMemory: Math.round(require('os').freemem() / (1024 * 1024 * 1024)),
          backgroundNoise: 0.2
        }
      }
    };
    
  } catch (error) {
    console.log('❌ LED 7799: VOSK_OPTIMIZER - Optimization failed', { error: error.message });
    return { success: false, error: error.message };
  }
});

// Test a specific Vosk configuration - MATCHES ACTUAL SERVER PROTOCOL
async function testVoskConfiguration(audioBuffer, referenceText, params) {
  const WebSocket = require('ws');
  
  console.log('🎵 LED 7705: VOSK_OPTIMIZER - Starting test with params:', params);
  
  return new Promise((resolve, reject) => {
    // Create a fresh WebSocket connection for this test
    const ws = new WebSocket('ws://127.0.0.1:5000');
    let transcript = '';
    let partialTranscript = '';
    const startTime = Date.now();
    let messageCount = 0;
    let transcriptionStarted = false;
    
    // Timeout for the entire test
    const timeout = setTimeout(() => {
      console.log('🎵 LED 7712: VOSK_OPTIMIZER - Test timeout after 30 seconds');
      ws.close();
      
      // Return what we got
      const processingTime = Date.now() - startTime;
      const finalTranscript = transcript || partialTranscript || "";
      resolve({
        params: params,
        transcript: finalTranscript,
        metrics: {
          wordAccuracy: calculateWER(referenceText, finalTranscript),
          characterAccuracy: calculateCER(referenceText, finalTranscript),
          processingTime: processingTime,
          realTimeFactor: processingTime / 10000,
          partialCount: messageCount
        }
      });
    }, 30000);
    
    ws.on('open', () => {
      console.log('🎵 LED 7706: VOSK_OPTIMIZER - WebSocket connected, sending start_transcription');
      
      // Send start_transcription message like the actual client does
      ws.send(JSON.stringify({
        type: 'start_transcription'
      }));
    });
    
    ws.on('message', (data) => {
      messageCount++;
      
      try {
        const message = JSON.parse(data.toString());
        console.log(`🎵 LED 7708.${messageCount}: VOSK_OPTIMIZER - Message type: ${message.type}`);
        
        if (message.type === 'transcription_started') {
          console.log('🎵 LED 7706.1: VOSK_OPTIMIZER - Server ready, sending audio');
          transcriptionStarted = true;
          
          // Now send the audio in chunks
          const chunkSize = params.chunkSize || 8000;
          let offset = 0;
          
          const sendInterval = setInterval(() => {
            if (offset < audioBuffer.length && ws.readyState === WebSocket.OPEN) {
              const chunk = audioBuffer.slice(offset, Math.min(offset + chunkSize, audioBuffer.length));
              ws.send(chunk); // Send as binary
              
              const progress = Math.round((offset / audioBuffer.length) * 100);
              if (progress % 25 === 0) {
                console.log(`🎵 LED 7707.${progress}: VOSK_OPTIMIZER - Audio progress: ${progress}%`);
              }
              
              offset += chunkSize;
            } else {
              clearInterval(sendInterval);
              if (offset >= audioBuffer.length) {
                console.log('🎵 LED 7715: VOSK_OPTIMIZER - All audio sent');
                
                // Give server time to process, then stop
                setTimeout(() => {
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'stop_transcription' }));
                    // Close after a delay to receive final results
                    setTimeout(() => {
                      if (ws.readyState === WebSocket.OPEN) {
                        ws.close();
                      }
                    }, 2000);
                  }
                }, 1000);
              }
            }
          }, 50); // 50ms between chunks
          
        } else if (message.type === 'transcription') {
          // Handle transcription messages
          const text = message.text || message.transcript || '';
          const transcriptionType = message.transcriptionType || 'unknown';
          
          if (transcriptionType === 'final' && text) {
            transcript = (transcript ? transcript + ' ' : '') + text;
            console.log(`🎵 LED 7709: VOSK_OPTIMIZER - Final: "${text}"`);
          } else if (transcriptionType === 'partial' && text) {
            partialTranscript = text;
            console.log(`🎵 LED 7710: VOSK_OPTIMIZER - Partial: "${text.substring(0, 50)}..."`);
          }
        } else if (message.type === 'error') {
          console.error(`🎵 LED 8709: VOSK_OPTIMIZER - Server error: ${message.message}`);
        }
      } catch (e) {
        console.log('🎵 LED 7711: VOSK_OPTIMIZER - Parse error:', e.message);
      }
    });
    
    ws.on('error', (error) => {
      console.error('🎵 LED 8708: VOSK_OPTIMIZER - WebSocket error:', {
        message: error.message,
        code: error.code
      });
      clearTimeout(timeout);
      
      if (error.code === 'ECONNREFUSED') {
        reject(new Error('Cannot connect to Vosk server. Please ensure it is running on port 5000.'));
      } else {
        reject(error);
      }
    });
    
    ws.on('close', () => {
      console.log('🎵 LED 7713: VOSK_OPTIMIZER - WebSocket closed');
      clearTimeout(timeout);
      
      // Return results
      const finalTranscript = transcript || partialTranscript || "";
      const processingTime = Date.now() - startTime;
      
      console.log(`🎵 LED 7714: VOSK_OPTIMIZER - Complete. Length: ${finalTranscript.length}, Time: ${processingTime}ms`);
      
      resolve({
        params: params,
        transcript: finalTranscript,
        metrics: {
          wordAccuracy: calculateWER(referenceText, finalTranscript),
          characterAccuracy: calculateCER(referenceText, finalTranscript),
          processingTime: processingTime,
          realTimeFactor: processingTime / 10000,
          partialCount: messageCount
        }
      });
    });
  });
}

// Generate parameter sets for Vosk optimization
function generateVoskParameterSets(mode) {
  const sets = [];
  
  if (mode === 'quick') {
    // Quick mode: Test 8 key combinations
    const configs = [
      { sampleRate: 16000, chunkSize: 8000, setWords: false, setPartialWords: true },
      { sampleRate: 16000, chunkSize: 8000, setWords: true, setPartialWords: false },
      { sampleRate: 16000, chunkSize: 4000, setWords: false, setPartialWords: true },
      { sampleRate: 16000, chunkSize: 4000, setWords: true, setPartialWords: true },
      { sampleRate: 8000, chunkSize: 4000, setWords: false, setPartialWords: true },
      { sampleRate: 8000, chunkSize: 8000, setWords: true, setPartialWords: false },
      { sampleRate: 16000, chunkSize: 16000, setWords: false, setPartialWords: true },
      { sampleRate: 16000, chunkSize: 2000, setWords: true, setPartialWords: true }
    ];
    
    return configs;
  } else if (mode === 'comprehensive') {
    // Comprehensive: Test many combinations
    const sampleRates = [8000, 16000];
    const chunkSizes = [2000, 4000, 8000, 16000];
    const setWords = [true, false];
    const setPartialWords = [true, false];
    
    for (const sr of sampleRates) {
      for (const cs of chunkSizes) {
        for (const sw of setWords) {
          for (const spw of setPartialWords) {
            sets.push({
              sampleRate: sr,
              chunkSize: cs,
              setWords: sw,
              setPartialWords: spw
            });
          }
        }
      }
    }
  }
  
  return sets.length > 0 ? sets : generateVoskParameterSets('quick');
}

// Calculate Word Error Rate (WER)
function calculateWER(reference, hypothesis) {
  const refWords = reference.split(/\s+/).filter(w => w.length > 0);
  const hypWords = hypothesis.split(/\s+/).filter(w => w.length > 0);
  
  if (refWords.length === 0) return 100;
  if (hypWords.length === 0) return 100;
  
  // Simple word matching for now
  let errors = 0;
  const maxLen = Math.max(refWords.length, hypWords.length);
  
  for (let i = 0; i < maxLen; i++) {
    if (i >= refWords.length || i >= hypWords.length || refWords[i] !== hypWords[i]) {
      errors++;
    }
  }
  
  return (errors / refWords.length) * 100;
}

// Calculate Character Error Rate (CER)
function calculateCER(reference, hypothesis) {
  // Remove spaces for character comparison
  const refChars = reference.replace(/\s/g, '');
  const hypChars = hypothesis.replace(/\s/g, '');
  
  if (refChars.length === 0) return 100;
  if (hypChars.length === 0) return 100;
  
  // Simple character matching
  let errors = 0;
  const maxLen = Math.max(refChars.length, hypChars.length);
  
  for (let i = 0; i < maxLen; i++) {
    if (i >= refChars.length || i >= hypChars.length || refChars[i] !== hypChars[i]) {
      errors++;
    }
  }
  
  return (errors / refChars.length) * 100;
}

// Calculate optimization score
function calculateOptimizationScore(metrics, targetMetric) {
  if (targetMetric === 'accuracy') {
    return metrics.wordAccuracy * 0.7 + metrics.characterAccuracy * 0.3;
  } else if (targetMetric === 'speed') {
    return (1000 / metrics.processingTime) * 100; // Inverse of processing time
  } else {
    // Balanced: Consider both accuracy and speed
    const accuracyScore = metrics.wordAccuracy * 0.5 + metrics.characterAccuracy * 0.2;
    const speedScore = (1000 / metrics.processingTime) * 30;
    return accuracyScore + speedScore;
  }
}

// Note: update-vosk-config handler already exists at line 1972

// Additional cleanup handlers
app.on('will-quit', (event) => {
  console.log('🎵 LED 1074: APP_LIFECYCLE - App will quit, final cleanup');
});

// Handle app crashes gracefully
process.on('uncaughtException', (error) => {
  console.log('❌ LED 8055: ERROR_HANDLING - Uncaught exception:', error.message);
  // Attempt cleanup
  if (pythonWebSocketServer) {
    try {
      pythonWebSocketServer.kill('SIGKILL');
    } catch (e) {
      // Ignore cleanup errors in crash scenario
    }
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('❌ LED 8056: ERROR_HANDLING - Unhandled promise rejection:', reason);
});

console.log('🚀 VoiceCoach V2: Electron main process initialized');