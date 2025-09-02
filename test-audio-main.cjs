const { app, BrowserWindow, desktopCapturer, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // For testing only
    }
  });

  // Load the test HTML file
  mainWindow.loadFile('test-audio-capture.html');
  
  // Open DevTools automatically
  mainWindow.webContents.openDevTools();

  // Handle display media requests
  mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    console.log('Display media request received');
    
    desktopCapturer.getSources({ 
      types: ['screen', 'window'] 
    }).then(sources => {
      console.log(`Found ${sources.length} sources`);
      sources.forEach(s => console.log(`- ${s.name} (${s.id})`));
      
      // Try to find the primary screen
      const screen = sources.find(s => s.name === 'Entire Screen' || s.name.includes('Screen')) || sources[0];
      
      if (screen) {
        console.log(`Using source: ${screen.name}`);
        // Try different audio options
        callback({ 
          video: screen,
          audio: 'loopback' // or try 'loopbackWithMute'
        });
      } else {
        console.log('No sources found');
        callback({});
      }
    }).catch(error => {
      console.error('Error getting sources:', error);
      callback({});
    });
  });

  // Also grant all permissions
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log(`Permission requested: ${permission}`);
    callback(true); // Grant all permissions
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

console.log('Test audio capture app starting...');
console.log('Electron version:', process.versions.electron);
console.log('Chrome version:', process.versions.chrome);
console.log('Node version:', process.versions.node);