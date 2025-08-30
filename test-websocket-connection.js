#!/usr/bin/env node
/**
 * Simple WebSocket connection test
 * Tests if the current native WebSocket setup works
 */

const WebSocket = require('ws');

console.log('🧪 Testing native WebSocket connection...');

const ws = new WebSocket('ws://127.0.0.1:5000');

ws.on('open', () => {
    console.log('✅ Connected to WebSocket server!');
    
    // Test sending a start transcription command
    ws.send(JSON.stringify({ type: 'start_transcription' }));
    console.log('📤 Sent start_transcription command');
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data);
        console.log('📥 Received:', message);
        
        // If we get a welcome message, the connection is working!
        if (message.type === 'status' && message.server_ready) {
            console.log('🎉 SUCCESS: Native WebSocket connection is working!');
            setTimeout(() => {
                console.log('🔌 Closing connection...');
                ws.close();
            }, 2000);
        }
    } catch (e) {
        console.log('📥 Received (raw):', data.toString());
    }
});

ws.on('error', (error) => {
    console.log('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
    console.log(`🔌 Connection closed: ${code} ${reason}`);
    process.exit(code === 1000 ? 0 : 1);
});

// Timeout after 10 seconds
setTimeout(() => {
    console.log('⏰ Test timeout - closing connection');
    ws.close();
}, 10000);