#!/usr/bin/env node
// pre-startup-cleanup.js - Runs BEFORE npm dev to clear all ports
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function killProcessesOnPorts(ports) {
  console.log('🎵 PRE_STARTUP: Clearing ports:', ports.join(', '));
  
  for (const port of ports) {
    try {
      // Windows command to find and kill processes using specific ports
      const killCmd = `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port} ^| findstr LISTENING') do taskkill /F /PID %a >nul 2>&1`;
      await execPromise(killCmd, { windowsHide: true });
      console.log(`🎵 PRE_STARTUP: Port ${port} cleared`);
    } catch (error) {
      // Expected when no processes found
      console.log(`🎵 PRE_STARTUP: Port ${port} already free`);
    }
    
    // Small delay between port operations
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function verifyPortsAvailable(ports) {
  console.log('🎵 PRE_STARTUP: Verifying ports are available...');
  
  for (const port of ports) {
    try {
      const { stdout } = await execPromise(
        `netstat -ano | findstr ":${port}" | findstr "LISTENING"`,
        { windowsHide: true }
      );
      if (stdout.trim()) {
        console.log(`❌ PRE_STARTUP: Port ${port} still in use after cleanup`);
        return false;
      }
    } catch (error) {
      // No output means port is free - this is good
    }
  }
  
  console.log('✅ PRE_STARTUP: All ports verified as available');
  return true;
}

async function main() {
  console.log('🚀 VoiceCoach V2: Pre-startup port cleanup');
  console.log('');
  
  const requiredPorts = [5000, 5175];
  
  try {
    // Kill any existing VoiceCoach instances first
    console.log('🎵 PRE_STARTUP: Killing existing VoiceCoach instances...');
    try {
      await execPromise('taskkill /F /IM electron.exe /FI "WINDOWTITLE eq VoiceCoach*" >nul 2>&1');
      console.log('🎵 PRE_STARTUP: Existing instances terminated');
    } catch (error) {
      console.log('🎵 PRE_STARTUP: No existing instances found');
    }
    
    // Clear required ports
    await killProcessesOnPorts(requiredPorts);
    
    // Verify cleanup was successful
    const success = await verifyPortsAvailable(requiredPorts);
    
    if (success) {
      console.log('');
      console.log('✅ VoiceCoach V2: All ports cleared successfully!');
      console.log('⏳ Waiting 2 seconds to ensure complete cleanup...');
      
      // Wait to ensure ports are completely released
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('🚀 Starting development environment...');
      console.log('');
      process.exit(0);
    } else {
      console.log('');
      console.log('❌ VoiceCoach V2: Port cleanup failed!');
      console.log('Please close applications using ports 5000 or 5175');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ PRE_STARTUP: Cleanup error:', error.message);
    process.exit(1);
  }
}

main();