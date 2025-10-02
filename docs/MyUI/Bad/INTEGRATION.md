# MyUI Integration Guide

This guide shows how to integrate MyUI into the main VoiceCoach V2 application.

## 🔧 Integration Steps

### 1. Add MyUI Route to Main App

Edit `src/App.tsx`:

```tsx
import React, { useState } from 'react';
import { MyUI } from '../docs/MyUI';
// ... other imports

function App() {
  const [currentView, setCurrentView] = useState<'coaching' | 'myui' | 'settings'>('coaching');

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="app-nav">
        <button 
          onClick={() => setCurrentView('coaching')}
          className={currentView === 'coaching' ? 'active' : ''}
        >
          🎤 Voice Coaching
        </button>
        <button 
          onClick={() => setCurrentView('myui')}
          className={currentView === 'myui' ? 'active' : ''}
        >
          🤖 MyUI Multi-AI
        </button>
        <button 
          onClick={() => setCurrentView('settings')}
          className={currentView === 'settings' ? 'active' : ''}
        >
          ⚙️ Settings
        </button>
      </nav>

      {/* Main Content */}
      <main className="app-main">
        {currentView === 'coaching' && <VoiceCoachingInterface />}
        {currentView === 'myui' && <MyUI />}
        {currentView === 'settings' && <SettingsInterface />}
      </main>
    </div>
  );
}
```

### 2. Update Electron Main Process

Edit `main.cjs` to add required IPC handlers:

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');

// Add MyUI IPC handlers
ipcMain.handle('scan-directory', async (event, rootPath) => {
  try {
    const files = [];
    
    async function scanDir(dirPath) {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules, .git, etc.
          if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
            await scanDir(fullPath);
          }
        } else {
          files.push(fullPath);
        }
      }
    }
    
    await scanDir(rootPath);
    return files;
  } catch (error) {
    console.error('Directory scan failed:', error);
    return [];
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.error('File read failed:', error);
    return null;
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('File write failed:', error);
    return false;
  }
});

// Secure config storage for API keys
const Store = require('electron-store');
const secureStore = new Store({ 
  encryptionKey: 'your-encryption-key-here',
  name: 'secure-config'
});

ipcMain.handle('get-secure-config', async (event, key) => {
  return secureStore.get(key);
});

ipcMain.handle('set-secure-config', async (event, key, value) => {
  secureStore.set(key, value);
  return true;
});
```

### 3. Update Preload Script

Edit `preload.js`:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Existing APIs...
  
  // MyUI APIs
  scanDirectory: (rootPath) => ipcRenderer.invoke('scan-directory', rootPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  getSecureConfig: (key) => ipcRenderer.invoke('get-secure-config', key),
  setSecureConfig: (key, value) => ipcRenderer.invoke('set-secure-config', key, value)
});
```

### 4. Add Dependencies

Install required packages:

```bash
npm install electron-store
```

Update `package.json`:

```json
{
  "dependencies": {
    "electron-store": "^8.1.0"
  }
}
```

### 5. Add Navigation Styles

Add to your main CSS file:

```css
.app-nav {
  display: flex;
  background: #2a2a2a;
  border-bottom: 1px solid #333;
  padding: 0;
}

.app-nav button {
  background: none;
  border: none;
  color: #ccc;
  padding: 12px 20px;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s ease;
  border-bottom: 3px solid transparent;
}

.app-nav button:hover {
  background: #333;
  color: #fff;
}

.app-nav button.active {
  color: #00d4ff;
  border-bottom-color: #00d4ff;
  background: #1a1a1a;
}

.app-main {
  flex: 1;
  overflow: hidden;
}
```

### 6. Configure TypeScript (if needed)

Update `tsconfig.json` to include MyUI files:

```json
{
  "compilerOptions": {
    // ... existing options
  },
  "include": [
    "src/**/*",
    "docs/MyUI/**/*"
  ]
}
```

## 🎯 Testing Integration

1. **Start the app**: `npm run dev`
2. **Navigate to MyUI**: Click the "🤖 MyUI Multi-AI" tab
3. **Configure API keys**: Open settings and add at least one API key
4. **Test project context**: Click "Update Context" button
5. **Try a query**: Enter a prompt and click "Query AIs"

## 🔍 Troubleshooting Integration

### Common Issues

1. **TypeScript Errors**
   - Ensure `docs/MyUI` is included in `tsconfig.json`
   - Add missing type declarations if needed

2. **Electron IPC Errors**
   - Verify all IPC handlers are registered in `main.cjs`
   - Check preload script exposes required APIs

3. **File System Permissions**
   - Ensure Electron has permission to read project files
   - Test with a simple file in the project root first

4. **API Key Storage**
   - Install `electron-store` package
   - Set a secure encryption key in main process

### Development Tips

1. **Hot Reload**: MyUI components support hot reload during development
2. **Debug Mode**: Check console for LED breadcrumb messages
3. **Network Issues**: Verify internet connectivity for API calls
4. **Context Loading**: Test with small projects first

## 📋 Validation Checklist

- [ ] MyUI tab appears in navigation
- [ ] Settings modal opens and closes properly
- [ ] API key inputs work and save securely
- [ ] Project context scan completes without errors
- [ ] At least one AI model responds to test queries
- [ ] Response panels display content correctly
- [ ] Synthesis feature generates analysis
- [ ] LED breadcrumbs appear in console (7000-7399 range)

## 🚀 Ready to Use

Once integration is complete, MyUI will be fully functional within your VoiceCoach V2 app. Users can:

- Switch between Voice Coaching and Multi-AI interfaces
- Configure API keys for multiple AI providers
- Send prompts to multiple models simultaneously
- Compare responses and get synthesized analysis
- Include project context in queries for better results

The MyUI system is now part of your desktop application and ready for productive use!