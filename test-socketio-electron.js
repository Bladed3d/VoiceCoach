// Test Socket.IO connection from Node.js environment (like Electron)
const io = require('socket.io-client');

console.log('Testing Socket.IO connection from Node.js environment...');

const socket = io('http://localhost:5000', {
    transports: ['polling'],  // Force polling only - WebSocket upgrade failing
    reconnection: false,
    forceNew: true
});

socket.on('connect', () => {
    console.log('✅ SUCCESS: Connected to Vosk server!');
    console.log('Socket ID:', socket.id);
    
    // Test starting transcription
    socket.emit('start_transcription');
    console.log('Sent: start_transcription');
    
    // Wait for response then disconnect
    setTimeout(() => {
        socket.disconnect();
        process.exit(0);
    }, 2000);
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection failed:', error.message);
    console.error('Error type:', error.type);
    console.error('Full error:', error);
    process.exit(1);
});

socket.on('status', (data) => {
    console.log('Status received:', data);
});

socket.on('transcription_status', (data) => {
    console.log('Transcription status:', data);
});

setTimeout(() => {
    console.log('⏱️ Timeout - no connection after 5 seconds');
    process.exit(1);
}, 5000);