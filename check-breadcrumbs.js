/**
 * Quick script to check LED breadcrumbs in the running Electron app
 * Run with: node check-breadcrumbs.js
 */

const http = require('http');

// Function to inject JavaScript and get results via Chrome DevTools Protocol
async function checkBreadcrumbs() {
  console.log('🔍 Checking VoiceCoach V2 LED breadcrumbs...\n');

  console.log('⚠️  This script requires manual console inspection.');
  console.log('📋 Please open the Electron DevTools and run these commands:\n');

  console.log('1. Check instruction file selection LEDs (6441-6448):');
  console.log('   window.debug.breadcrumbs.getRange(6441, 6448)\n');

  console.log('2. Check prompt building LED (6420-6421):');
  console.log('   window.debug.breadcrumbs.getRange(6420, 6425)\n');

  console.log('3. Check template loading LED (6440):');
  console.log('   window.debug.breadcrumbs.getRange(6440, 6450)\n');

  console.log('4. Check for any failures in the 8440-8450 range:');
  console.log('   window.debug.breadcrumbs.getFailures()\n');

  console.log('5. Get the most recent instruction file used:');
  console.log('   window.debug.breadcrumbs.getRange(6400, 6499).filter(b => b.operation.includes("instruction"))\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('To open DevTools in Electron app, press: Ctrl+Shift+I');
  console.log('Or add to your app: mainWindow.webContents.openDevTools()');
}

checkBreadcrumbs();
