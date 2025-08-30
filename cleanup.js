// cleanup.js - Enhanced Windows port management for VoiceCoach V2
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function killProcessesOnPorts(ports) {
  console.log('🎵 LED 1000: CLEANUP - Starting port cleanup for ports:', ports);
  
  const commands = [];
  
  for (const port of ports) {
    // Use multiple methods for robustness
    commands.push(
      `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port} ^| findstr LISTENING') do taskkill /F /PID %a >nul 2>&1`,
      `powershell -Command "try { Get-NetTCPConnection -LocalPort ${port} -ErrorAction Stop | Where-Object State -eq 'Listen' | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop } } catch { }"`
    );
  }

  for (const cmd of commands) {
    try {
      await execPromise(cmd, { windowsHide: true });
    } catch (error) {
      // Expected errors when no processes found - ignore them
      if (!error.message.includes('no tasks') && !error.message.includes('not found') && !error.message.includes('Cannot find')) {
        console.log(`🎵 LED 1001: CLEANUP - Cleanup attempt: ${error.message.substring(0, 100)}`);
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Verify ports are free
async function verifyPortsAvailable(ports, maxRetries = 3) {
  console.log('🎵 LED 1002: CLEANUP - Verifying ports are available:', ports);
  
  for (let i = 0; i < maxRetries; i++) {
    const busyPorts = [];
    
    for (const port of ports) {
      try {
        const { stdout } = await execPromise(
          `netstat -ano | findstr ":${port}" | findstr "LISTENING"`,
          { windowsHide: true }
        );
        if (stdout.trim()) {
          busyPorts.push(port);
        }
      } catch (error) {
        // No output means port is free
      }
    }

    if (busyPorts.length === 0) {
      console.log('🎵 LED 1003: CLEANUP - All ports verified as available');
      return true;
    }

    console.log('🎵 LED 1004: CLEANUP - Busy ports found, retrying cleanup:', busyPorts);
    if (i < maxRetries - 1) {
      await killProcessesOnPorts(busyPorts);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('❌ LED 8001: CLEANUP - FAILED - Could not clear all ports after retries');
  return false;
}

// Main cleanup function for VoiceCoach V2
async function ensurePortsAvailable(ports = [5000, 5175]) {
  try {
    console.log('🎵 LED 1005: CLEANUP - Starting comprehensive port cleanup');
    
    // Aggressive cleanup
    await killProcessesOnPorts(ports);
    
    // Verify with retries
    const portsAvailable = await verifyPortsAvailable(ports, 3);
    
    if (portsAvailable) {
      console.log('🎵 LED 1006: CLEANUP - SUCCESS - All required ports are now available');
      return true;
    } else {
      console.log('❌ LED 8002: CLEANUP - FAILED - Ports still occupied after cleanup attempts');
      return false;
    }
  } catch (error) {
    console.log('❌ LED 8003: CLEANUP - ERROR -', error.message);
    return false;
  }
}

module.exports = {
  killProcessesOnPorts,
  verifyPortsAvailable,
  ensurePortsAvailable
};