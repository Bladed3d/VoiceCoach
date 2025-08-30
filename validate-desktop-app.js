// VoiceCoach V2 Desktop App Validation Script
// This script validates that we have a proper Electron desktop app running

console.log('🔍 VoiceCoach V2 Desktop App Validation');
console.log('==========================================');

// Test 1: Check if we're in an Electron environment
const isElectronEnvironment = typeof window !== 'undefined' && window.electronAPI;
console.log(`✅ Test 1 - Electron Environment: ${isElectronEnvironment ? 'DESKTOP APP' : 'BROWSER'}`);

if (isElectronEnvironment) {
    console.log('🎯 DESKTOP MODE DETECTED');
    console.log('Available Electron APIs:');
    console.log('- File Operations:', !!window.electronAPI.selectFile);
    console.log('- WebSocket Transcription:', !!window.electronAPI.startTranscription);
    console.log('- Microphone Access:', !!window.electronAPI.requestMicrophoneAccess);
    console.log('- System Info:', !!window.electronAPI.getSystemInfo);
    
    // Test desktop-specific functionality
    if (window.electronAPI.getSystemInfo) {
        window.electronAPI.getSystemInfo().then(info => {
            console.log('🖥️ System Information:', info);
        }).catch(err => {
            console.log('❌ System info error:', err);
        });
    }
    
    console.log('🎵 LED 9000: TESTING - Desktop app validation successful');
    
} else {
    console.log('🌐 BROWSER MODE DETECTED');
    console.log('❌ This is running in a browser, not as a desktop app');
    console.log('❌ Limited functionality available:');
    console.log('- No file system access');
    console.log('- No desktop-level microphone control');  
    console.log('- No WebSocket server management');
    
    console.log('❌ LED 8090: TESTING - Browser mode detected, should be desktop app');
}

// Test 2: Check user agent
console.log(`🔎 User Agent: ${navigator.userAgent}`);
const electronInUserAgent = navigator.userAgent.includes('Electron');
console.log(`✅ Test 2 - Electron in User Agent: ${electronInUserAgent}`);

// Test 3: Check window location 
console.log(`🔎 Window Location: ${window.location.href}`);
const isLocalhost5175 = window.location.href.includes('localhost:5175');
console.log(`✅ Test 3 - Expected Port: ${isLocalhost5175}`);

// Summary
console.log('==========================================');
if (isElectronEnvironment && electronInUserAgent) {
    console.log('🎯 VERDICT: PROPER DESKTOP APPLICATION');
    console.log('✅ This instance has full desktop app capabilities');
    console.log('✅ WebSocket transcription will work with full permissions');
    console.log('✅ Microphone access available at system level');
} else {
    console.log('⚠️ VERDICT: BROWSER INSTANCE DETECTED');
    console.log('❌ This instance lacks desktop app capabilities');
    console.log('❌ WebSocket transcription may have permission limitations');
    console.log('❌ Microphone access subject to browser restrictions');
}

console.log('🎵 LED 9001: TESTING - Desktop validation complete');