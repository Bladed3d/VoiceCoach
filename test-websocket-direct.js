// Direct WebSocket connection test
const WebSocket = require('ws');

console.log('Testing WebSocket connection to ws://127.0.0.1:5000...');

const ws = new WebSocket('ws://127.0.0.1:5000');

ws.on('open', function open() {
  console.log('✅ WebSocket connected successfully!');
  
  // Send test message
  ws.send(JSON.stringify({
    type: 'status',
    message: 'Test connection from Node.js'
  }));
});

ws.on('message', function incoming(data) {
  console.log('📨 Received:', data.toString());
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket connection closed');
});

// Keep alive for 5 seconds then close
setTimeout(() => {
  console.log('Closing test connection...');
  ws.close();
  process.exit(0);
}, 5000);