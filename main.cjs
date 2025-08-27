const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// Keep a global reference of the window object
let mainWindow;

const createWindow = () => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // Add app icon
    titleBarStyle: 'default',
    autoHideMenuBar: false
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5175');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Handle window events
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('🎯 VoiceCoach V2: Main window created successfully');
};

// App event handlers
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
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

// System info
ipcMain.handle('get-system-info', async () => {
  return {
    platform: process.platform,
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node
  };
});

console.log('🚀 VoiceCoach V2: Electron main process initialized');