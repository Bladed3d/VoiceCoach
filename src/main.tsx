import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App'
import './index.css'

// Catch and log any React rendering errors
try {
  console.log('🚀 MAIN.TSX: Starting React root creation...');
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  console.log('🚀 MAIN.TSX: Root created, rendering App...');

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  console.log('✅ MAIN.TSX: App render complete');
} catch (error) {
  console.error('❌ MAIN.TSX: Fatal error during React initialization:', error);
  console.error('❌ Stack trace:', (error as Error).stack);

  // Display error in DOM
  document.body.innerHTML = `
    <div style="padding: 20px; color: red; font-family: monospace;">
      <h1>Fatal Error</h1>
      <pre>${(error as Error).message}</pre>
      <pre>${(error as Error).stack}</pre>
    </div>
  `;
}