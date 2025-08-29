// Cleanup is now handled by pre-startup-cleanup.js before npm run dev

const { app, BrowserWindow, ipcMain, dialog, systemPreferences, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

// Keep a global reference of the window object
let mainWindow;
let pythonWebSocketServer;
let conversationHistory = [];
let coachingTriggers = null;

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
  
  // 🚨 CRITICAL: Desktop-First Configuration with Full System Permissions
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
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

  // Handle external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle window events with enhanced cleanup
  mainWindow.on('closed', () => {
    console.log('🎵 LED 1062: APP_LIFECYCLE - Main window closed, cleaning up');
    
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
  
  // LED Breadcrumb 1000: Load coaching triggers on startup
  loadCoachingTriggers();
};

// Load coaching triggers from processed document
async function loadCoachingTriggers() {
  try {
    // LED 1009: Coaching triggers file system access
    const userDataPath = app.getPath('userData');
    const triggersPath = path.join(userDataPath, 'coaching-insights.json');
    
    console.log('🎵 LED 1009: APP_LIFECYCLE - Attempting to load coaching triggers {"operation":"triggers_file_access","path":"' + triggersPath + '","timestamp":' + Date.now() + '} ElectronMain_1009');
    
    const content = await fs.readFile(triggersPath, 'utf-8');
    coachingTriggers = JSON.parse(content);
    
    // LED 1001: Enhanced coaching triggers validation
    const promptCount = coachingTriggers.coachingPrompts ? Object.keys(coachingTriggers.coachingPrompts).length : 0;
    const hasObjectionHandling = coachingTriggers.coachingPrompts?.objection_handling ? Object.keys(coachingTriggers.coachingPrompts.objection_handling).length : 0;
    const hasDiscovery = coachingTriggers.coachingPrompts?.discovery ? Object.keys(coachingTriggers.coachingPrompts.discovery).length : 0;
    
    console.log('🎵 LED 1001: APP_LIFECYCLE - Coaching triggers loaded successfully {"operation":"coaching_triggers_loaded","count":' + promptCount + ',"objection_triggers":' + hasObjectionHandling + ',"discovery_triggers":' + hasDiscovery + ',"timestamp":' + Date.now() + '} ElectronMain_1001');
  } catch (error) {
    console.log('❌ LED 8001 FAILED [ElectronMain]: ERROR_HANDLING Coaching triggers file read error: ' + error.message);
    console.log('🎵 LED 1002: APP_LIFECYCLE - Using default coaching triggers {"operation":"default_triggers_loaded","reason":"no_saved_file","timestamp":' + Date.now() + '} ElectronMain_1002');
    // Default coaching triggers
    coachingTriggers = {
      coachingPrompts: {
        objection_handling: {
          "price": "That's a valid concern. Let's discuss the value this brings...",
          "budget": "I understand budget is important. What budget range were you thinking?",
          "timing": "When would be a better time to revisit this?",
          "competition": "What other options are you considering? Let me show how we compare..."
        },
        discovery: {
          "challenge": "Tell me more about that challenge...",
          "goal": "What would success look like for you?",
          "process": "How are you handling this currently?",
          "decision": "Who else is involved in this decision?"
        }
      }
    };
  }
}

// Analyze transcript for coaching triggers
function triggerCoachingAnalysis(transcript) {
  const analysisStartTime = Date.now();
  
  try {
    // LED 1016: Coaching analysis initialization
    console.log('🎵 LED 1016: APP_LIFECYCLE - Coaching analysis initialization {"operation":"coaching_analysis_start","transcript_length":' + transcript.length + ',"has_triggers":' + (!!coachingTriggers) + ',"timestamp":' + analysisStartTime + '} ElectronMain_1016');
    
    // LED Breadcrumb 1004: Coaching analysis started
    if (!coachingTriggers || !coachingTriggers.coachingPrompts) {
      console.log('🎵 LED 1017: APP_LIFECYCLE - No coaching triggers available {"operation":"no_triggers","triggers_null":' + (!coachingTriggers) + ',"prompts_null":' + (!coachingTriggers?.coachingPrompts) + '} ElectronMain_1017');
      return;
    }
    
    const lowerTranscript = transcript.toLowerCase();
    
    // LED 1018: Transcript analysis metrics
    console.log('🎵 LED 1018: APP_LIFECYCLE - Transcript analysis metrics {"operation":"transcript_analysis","word_count":' + transcript.split(' ').length + ',"char_count":' + transcript.length + ',"has_keywords":' + (transcript.length > 0) + '} ElectronMain_1018');
    
    // Check for objection handling triggers
    const objectionTriggers = coachingTriggers.coachingPrompts.objection_handling || {};
    const objectionTriggerCount = Object.keys(objectionTriggers).length;
    
    // LED 1019: Objection trigger scanning
    console.log('🎵 LED 1019: APP_LIFECYCLE - Objection trigger scanning {"operation":"objection_scan","trigger_count":' + objectionTriggerCount + ',"transcript_words":' + lowerTranscript.split(' ').length + '} ElectronMain_1019');
    
    for (const [keyword, response] of Object.entries(objectionTriggers)) {
      if (lowerTranscript.includes(keyword)) {
        // LED 1020: Objection trigger match found
        console.log('🎵 LED 1020: APP_LIFECYCLE - Objection trigger match {"operation":"trigger_match","keyword":"' + keyword + '","category":"objection_handling","response_length":' + response.length + '} ElectronMain_1020');
        
        sendCoachingSuggestion({
          id: Date.now(),
          suggestion: response,
          trigger: keyword,
          priority: 'HIGH',
          category: 'objection_handling',
          context: transcript,
          timestamp: new Date().toISOString()
        });
        
        const analysisTime = Date.now() - analysisStartTime;
        console.log('🎵 LED 1021: APP_LIFECYCLE - Analysis complete {"operation":"analysis_complete","trigger_found":true,"analysis_time":' + analysisTime + ',"category":"objection"} ElectronMain_1021');
        
        return; // Send only one suggestion per transcript
      }
    }
    
    // Check for discovery triggers
    const discoveryTriggers = coachingTriggers.coachingPrompts.discovery || {};
    const discoveryTriggerCount = Object.keys(discoveryTriggers).length;
    
    // LED 1022: Discovery trigger scanning
    console.log('🎵 LED 1022: APP_LIFECYCLE - Discovery trigger scanning {"operation":"discovery_scan","trigger_count":' + discoveryTriggerCount + ',"transcript_processed":true} ElectronMain_1022');
    
    for (const [keyword, response] of Object.entries(discoveryTriggers)) {
      if (lowerTranscript.includes(keyword)) {
        // LED 1023: Discovery trigger match found
        console.log('🎵 LED 1023: APP_LIFECYCLE - Discovery trigger match {"operation":"trigger_match","keyword":"' + keyword + '","category":"discovery","response_length":' + response.length + '} ElectronMain_1023');
        
        sendCoachingSuggestion({
          id: Date.now(),
          suggestion: response,
          trigger: keyword,
          priority: 'MEDIUM',
          category: 'discovery',
          context: transcript,
          timestamp: new Date().toISOString()
        });
        
        const analysisTime = Date.now() - analysisStartTime;
        console.log('🎵 LED 1024: APP_LIFECYCLE - Analysis complete {"operation":"analysis_complete","trigger_found":true,"analysis_time":' + analysisTime + ',"category":"discovery"} ElectronMain_1024');
        
        return;
      }
    }
    
    // LED 1025: No triggers found
    const analysisTime = Date.now() - analysisStartTime;
    console.log('🎵 LED 1025: APP_LIFECYCLE - No triggers found {"operation":"analysis_complete","trigger_found":false,"analysis_time":' + analysisTime + ',"objection_checked":' + objectionTriggerCount + ',"discovery_checked":' + discoveryTriggerCount + '} ElectronMain_1025');
    
  } catch (error) {
    console.log('❌ LED 8002 FAILED [ElectronMain]: ERROR_HANDLING Coaching analysis error: ' + error.message);
    
    // LED 8003: Analysis failure recovery
    console.log('🎵 LED 8003: ERROR_HANDLING - Analysis failure recovery {"operation":"analysis_error_recovery","error_type":"' + error.name + '","transcript_length":' + transcript.length + ',"timestamp":' + Date.now() + '} ElectronMain_8003');
  }
}

// Send coaching suggestion to renderer
function sendCoachingSuggestion(suggestion) {
  if (mainWindow) {
    // LED 1026: Pre-send validation
    console.log('🎵 LED 1026: APP_LIFECYCLE - Pre-send validation {"operation":"suggestion_validation","has_suggestion":' + (!!suggestion.suggestion) + ',"has_trigger":' + (!!suggestion.trigger) + ',"suggestion_length":' + suggestion.suggestion.length + '} ElectronMain_1026');
    
    // LED Breadcrumb 1008: Send coaching suggestion
    try {
      mainWindow.webContents.send('coaching-suggestion', suggestion);
      
      console.log('🎵 LED 1008: APP_LIFECYCLE - Coaching suggestion sent {"category":"' + suggestion.category + '","trigger":"' + suggestion.trigger + '","priority":"' + suggestion.priority + '","operation":"coaching_suggestion_sent","timestamp":' + Date.now() + '} ElectronMain_1008');
      
      // LED 1027: Suggestion delivery confirmation
      console.log('🎵 LED 1027: APP_LIFECYCLE - Suggestion delivery confirmation {"operation":"ipc_send_success","suggestion_id":' + suggestion.id + ',"main_window_ready":' + (!mainWindow.isDestroyed()) + '} ElectronMain_1027');
      
    } catch (ipcError) {
      console.log('❌ LED 8004 FAILED [ElectronMain]: ERROR_HANDLING IPC send error: ' + ipcError.message);
    }
  } else {
    // LED 8005: Main window not available
    console.log('❌ LED 8005 FAILED [ElectronMain]: ERROR_HANDLING Main window not available for coaching suggestion');
  }
}

// 🚨 CRITICAL: Enhanced app lifecycle - cleanup already done in startApp()
app.whenReady().then(() => {
  console.log('🎵 LED 1067: APP_LIFECYCLE - App ready, creating window (cleanup handled by pre-startup script)');
  createWindow();
  
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
  
  // Kill our known server first
  if (pythonWebSocketServer) {
    console.log('🎵 LED 1073: APP_LIFECYCLE - Stopping Python server before quit');
    try {
      pythonWebSocketServer.kill('SIGINT');
      pythonWebSocketServer = null;
    } catch (error) {
      console.log('❌ LED 8054: ERROR_HANDLING - Server stop error on quit:', error.message);
    }
  }
  
  // Kill any stale processes on ports 5000 and 5175 to prevent future conflicts
  console.log('🎵 LED 1074: APP_LIFECYCLE - Final port cleanup on quit');
  try {
    // Clear both ports on quit
    [5000, 5175].forEach(port => {
      const killCmd = `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port} ^| findstr LISTENING') do taskkill /F /PID %a >nul 2>&1`;
      spawn('cmd', ['/c', killCmd], { shell: true, stdio: 'ignore' });
    });
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

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    
    return {
      content,
      size: stats.size,
      name: path.basename(filePath),
      path: filePath
    };
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
});

// Document processing (mock for now - will integrate with Claude API)
ipcMain.handle('process-document', async (event, { content, questionnaire }) => {
  console.log('🧠 Processing document with questionnaire:', {
    contentLength: content.length,
    questionnaire: Object.keys(questionnaire)
  });
  
  // Mock processing delay
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  // Mock response - replace with actual Claude/Ollama integration
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
    // For development, use Claude Code Task tool to invoke the subagent
    // This would be replaced with actual Claude API integration in production
    
    if (agentType === 'rag-document-analyst') {
      // Simulate the RAG document analyst processing
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Create different mock responses for Phase 1A vs 1B
      const isPhase1B = phase === '1B' && questionnaire;
      const mockAnalysis = isPhase1B ? {
        // Phase 1B: Contextual analysis focused on user priorities
        document_summary: {
          main_focus: "Sales techniques prioritized for user's specific challenges",
          value_for_sales: `Addresses user's goal: ${questionnaire.q2_learningObjective || 'general improvement'}`,
          total_techniques_found: "8",
          contextual_focus: "Prioritized based on user questionnaire responses"
        },
        high_impact_techniques: [
          {
            technique: "Enterprise objection handling for price resistance",
            situation: "When dealing with enterprise deals over $50K (user priority)",
            example: "I understand budget is critical for enterprise decisions. Let's examine the 18-month ROI...",
            priority: "CRITICAL",
            user_relevance: "Directly addresses user's enterprise sales challenge"
          },
          {
            technique: "Consultative questioning for value discovery",
            situation: "During discovery to justify premium pricing (user priority)",
            example: "What would a 25% reduction in your sales cycle be worth to your organization?",
            priority: "CRITICAL",
            user_relevance: "Aligns with user's goal to maintain premium pricing"
          }
        ],
        objection_handlers: [
          {
            objection: "We need to think about it",
            response: "I understand this is a significant decision. What specific concerns would help you make a confident choice?",
            source: "Section targeting user's closing rate improvement goal"
          }
        ],
        conversation_scripts: [
          {
            scenario: "Enterprise prospect expressing price concerns",
            script: "Many of our enterprise clients initially had similar concerns. When they calculated the impact of increasing their close rate from 65% to 80%, they realized...",
            purpose: "Addresses user's specific metrics and enterprise focus"
          }
        ],
        quick_wins: [
          "Focus discovery questions on quantifiable business impact",
          "Use consultative approach for premium pricing justification",
          "Address enterprise decision-making process explicitly"
        ],
        coaching_triggers: {
          if_customer_says: ["it's too expensive for our budget", "we need board approval", "this is a big investment"],
          then_coach: ["quantify ROI for enterprise scale", "identify all decision makers", "create urgency with competitive advantage"]
        }
      } : {
        document_summary: {
          main_focus: "Sales techniques and customer engagement strategies",
          value_for_sales: "Provides actionable techniques for improving conversion rates",
          total_techniques_found: "12"
        },
        high_impact_techniques: [
          {
            technique: "SPIN Selling Framework",
            situation: "During discovery phase with enterprise prospects",
            example: "What's your current process for [specific challenge]?",
            priority: "CRITICAL"
          },
          {
            technique: "Value-based objection handling",
            situation: "When prospect raises price concerns",
            example: "I understand cost is important. Let's look at the ROI...",
            priority: "HIGH"
          }
        ],
        objection_handlers: [
          {
            objection: "It's too expensive",
            response: "I understand price is a concern. What specific budget range were you considering?",
            source: "Page 3, Section 2"
          }
        ],
        conversation_scripts: [
          {
            scenario: "Opening call with new prospect",
            script: "Hi [Name], I'm calling because companies like yours are facing [specific challenge]. I'd like to share how we've helped similar organizations...",
            purpose: "Establishes credibility and relevance quickly"
          }
        ],
        quick_wins: [
          "Ask open-ended questions to understand pain points",
          "Use mirroring to build rapport",
          "Quantify benefits with specific numbers"
        ],
        coaching_triggers: {
          if_customer_says: ["it's too expensive", "we need to think about it", "we're happy with our current solution"],
          then_coach: ["redirect to value conversation", "create urgency with scarcity", "identify dissatisfaction areas"]
        }
      };
      
      console.log('🎵 LED 2021: RAG Processing - Subagent analysis complete:', {
        techniquesFound: mockAnalysis.high_impact_techniques.length,
        objectionHandlers: mockAnalysis.objection_handlers.length,
        coachingTriggers: mockAnalysis.coaching_triggers.if_customer_says.length
      });
      
      return mockAnalysis;
    }
    
    throw new Error(`Unknown agent type: ${agentType}`);
    
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
    // This would be replaced with actual Ollama API integration
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

// Storage operations
ipcMain.handle('save-insights', async (event, insights) => {
  try {
    const userDataPath = app.getPath('userData');
    const insightsPath = path.join(userDataPath, 'coaching-insights.json');
    
    await fs.writeFile(insightsPath, JSON.stringify(insights, null, 2));
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to save insights: ${error.message}`);
  }
});

ipcMain.handle('load-insights', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const insightsPath = path.join(userDataPath, 'coaching-insights.json');
    
    const content = await fs.readFile(insightsPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Return null if file doesn't exist
    return null;
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

// VoiceCoach WebSocket Transcription Service IPC Handlers  
ipcMain.handle('start-transcription', async () => {
  const serverStartTime = Date.now();
  
  try {
    // LED Breadcrumb 1010: Start Python WebSocket server
    console.log('🎵 LED 1010: APP_LIFECYCLE - Starting Python WebSocket server {"operation":"websocket_server_start","port":5000,"timestamp":' + serverStartTime + '} ElectronMain_1010');
    
    // LED 1027: Automatic port cleanup to prevent conflicts
    console.log('🎵 LED 1027: APP_LIFECYCLE - Port cleanup initiation {"operation":"port_cleanup_start","port":5000,"timestamp":' + Date.now() + '} ElectronMain_1027');
    
    try {
      // Find and kill any processes using port 5000
      const netstatResult = spawn('netstat', ['-ano'], { shell: true });
      let netstatOutput = '';
      
      netstatResult.stdout.on('data', (data) => {
        netstatOutput += data.toString();
      });
      
      await new Promise((resolve) => {
        netstatResult.on('close', () => {
          const lines = netstatOutput.split('\n');
          const port5000Lines = lines.filter(line => line.includes(':5000') && line.includes('LISTENING'));
          
          console.log('🎵 LED 1027.1: APP_LIFECYCLE - Port scan results {"operation":"port_scan","port5000_processes":' + port5000Lines.length + '} ElectronMain_1027.1');
          
          port5000Lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0' && !isNaN(pid)) {
              console.log('🎵 LED 1027.2: APP_LIFECYCLE - Killing port blocker {"operation":"kill_port_blocker","pid":' + pid + ',"port":5000} ElectronMain_1027.2');
              try {
                spawn('taskkill', ['/F', '/PID', pid], { shell: true });
              } catch (killError) {
                console.log('❌ LED 8027 FAILED [ElectronMain]: ERROR_HANDLING Port cleanup kill failed for PID ' + pid + ': ' + killError.message);
              }
            }
          });
          
          // Wait a moment for processes to be killed
          setTimeout(() => {
            console.log('🎵 LED 1027.3: APP_LIFECYCLE - Port cleanup complete {"operation":"port_cleanup_complete","wait_time":500} ElectronMain_1027.3');
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
    const pythonScript = path.join(app.getAppPath(), 'src', 'services', 'vosk-native-websocket-server.py');
    
    // Determine Python executable path - Windows cmd.exe wrapper approach
    let pythonCmd = 'python';
    let pythonArgs = [pythonScript];
    
    if (process.platform === 'win32') {
      // ✅ Windows Fix #2: Use cmd.exe wrapper for reliable execution
      pythonCmd = 'cmd.exe';
      pythonArgs = ['/c', 'python', pythonScript];
    } else {
      pythonCmd = 'python3';
    }
    
    console.log('🎵 LED 1032: APP_LIFECYCLE - Python server spawn preparation {"operation":"spawn_prep","script_path":"' + pythonScript + '","python_cmd":"' + pythonCmd + '","python_args":["' + pythonArgs.join('","') + '"],"platform":"' + process.platform + '","timestamp":' + Date.now() + '} ElectronMain_1032');
    
    // ✅ Windows Fix #1: Add shell: true + Windows Fix #2: cmd.exe wrapper
    pythonWebSocketServer = spawn(pythonCmd, pythonArgs, {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      cwd: __dirname,
      windowsHide: true,  // Hide terminal window on Windows
      shell: true  // ✅ Standard Windows spawn fix - enables proper process execution
    });
    
    // LED 1033: Server process created
    console.log('🎵 LED 1033: APP_LIFECYCLE - Server process created {"operation":"process_spawned","pid":' + (pythonWebSocketServer ? pythonWebSocketServer.pid : 'null') + ',"timestamp":' + Date.now() + '} ElectronMain_1033');
    
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
        const hasReadyIndicator = output.includes('[6099]') || output.includes('WebSocket Server running') || (output.includes('Running on') && output.includes('5000'));
        
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
        
        // LED 8038: Error categorization
        const isPortError = errorOutput.includes('Address already in use');
        const isModuleError = errorOutput.includes('ModuleNotFoundError');
        const isPermissionError = errorOutput.includes('Permission denied');
        const isNetworkError = errorOutput.includes('network') || errorOutput.includes('socket');
        const isCritical = isPortError || isModuleError || isPermissionError;
        
        console.log('❌ LED 8011 FAILED [ElectronMain]: ERROR_HANDLING Python WebSocket Server error: ' + errorOutput);
        
        console.log('🎵 LED 8038: ERROR_HANDLING - Error categorization {"operation":"error_analysis","is_port_error":' + isPortError + ',"is_module_error":' + isModuleError + ',"is_permission_error":' + isPermissionError + ',"is_network_error":' + isNetworkError + ',"is_critical":' + isCritical + '} ElectronMain_8038');
        
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
      console.log('🎵 LED 1042: APP_LIFECYCLE - Server stop signal sent {"operation":"stop_signal","signal":"SIGINT","pid":' + serverPid + ',"timestamp":' + Date.now() + '} ElectronMain_1042');
      
      if (pythonWebSocketServer) {
        pythonWebSocketServer.kill('SIGINT');
      }
      
      // Wait brief moment for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 500));
      
      pythonWebSocketServer = null;
      
      const stopTime = Date.now() - stopStartTime;
      
      // LED 1043: Server stop complete
      console.log('🎵 LED 1043: APP_LIFECYCLE - Server stop complete {"operation":"stop_complete","stop_time":' + stopTime + ',"graceful_shutdown":true,"server_nullified":true} ElectronMain_1043');
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