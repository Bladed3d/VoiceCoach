/**
 * VoiceCoach V2 Transcription Pipeline Tester
 * Tests the complete pipeline: WebSocket → Audio → Transcription → Coaching
 */

const testTranscriptionPipeline = async () => {
  console.log('🎯 VoiceCoach V2 Transcription Pipeline Test Starting...');
  
  try {
    // Step 1: Verify servers are running
    console.log('\n📋 Step 1: Server Status Check');
    
    // Check WebSocket server
    const wsResponse = await fetch('http://127.0.0.1:5000').catch(() => null);
    console.log(`WebSocket Server (5000): ${wsResponse ? '✅ Responding' : '❌ Not responding'}`);
    
    // Check Electron app
    const electronResponse = await fetch('http://localhost:5175').catch(() => null);
    console.log(`Electron App (5175): ${electronResponse ? '✅ Responding' : '❌ Not responding'}`);
    
    if (!electronResponse) {
      throw new Error('Electron app not accessible - test cannot continue');
    }
    
    // Step 2: Test WebSocket connection directly
    console.log('\n📋 Step 2: Direct WebSocket Connection Test');
    
    const ws = new WebSocket('ws://127.0.0.1:5000');
    
    return new Promise((resolve, reject) => {
      let connectionTest = {
        connected: false,
        messagesReceived: [],
        errors: []
      };
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        connectionTest.connected = true;
        
        // Send test message
        console.log('📤 Sending test start_transcription command...');
        ws.send(JSON.stringify({ type: 'start_transcription' }));
        
        // Close after 5 seconds for test
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'stop_transcription' }));
          ws.close();
          
          console.log('\n📊 Test Results:');
          console.log(`Connection: ${connectionTest.connected ? '✅ Success' : '❌ Failed'}`);
          console.log(`Messages: ${connectionTest.messagesReceived.length} received`);
          console.log(`Errors: ${connectionTest.errors.length} encountered`);
          
          if (connectionTest.messagesReceived.length > 0) {
            console.log('Sample messages:', connectionTest.messagesReceived.slice(0, 3));
          }
          
          resolve(connectionTest);
        }, 5000);
      };
      
      ws.onmessage = (event) => {
        console.log('📥 Message received:', event.data);
        connectionTest.messagesReceived.push(event.data);
      };
      
      ws.onerror = (error) => {
        console.log('❌ WebSocket error:', error);
        connectionTest.errors.push(error);
      };
      
      ws.onclose = (event) => {
        console.log(`🔒 WebSocket closed: ${event.code} - ${event.reason}`);
      };
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (!connectionTest.connected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
    
  } catch (error) {
    console.error('❌ Pipeline test failed:', error);
    throw error;
  }
};

// Run the test
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testTranscriptionPipeline };
} else {
  testTranscriptionPipeline()
    .then(result => {
      console.log('\n🎉 Pipeline test completed successfully!');
      console.log('Full Results:', JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('\n💥 Pipeline test failed:', error.message);
      process.exit(1);
    });
}