/**
 * Debug script to test model selection issue
 * Run this to verify which model is being used
 */

const { net } = require('electron');

// Test the Ollama API with different models
async function testOllamaModel(model) {
  console.log(`\n🔍 Testing with model: ${model}`);
  console.log('─'.repeat(60));

  const prompt = 'What is 2+2? Answer in exactly one word.';

  try {
    const requestData = JSON.stringify({
      model: model,
      prompt: prompt,
      options: {
        temperature: 0.1,
        num_predict: 10
      },
      stream: false
    });

    console.log('📤 Request data:', {
      model: model,
      promptLength: prompt.length,
      temperature: 0.1
    });

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const request = net.request({
        method: 'POST',
        protocol: 'http:',
        hostname: 'localhost',
        port: 11434,
        path: '/api/generate',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestData)
        }
      });

      let responseData = '';

      request.on('response', (response) => {
        console.log('📥 Response status:', response.statusCode);
        console.log('📥 Response headers:', response.headers);

        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });

        response.on('end', () => {
          const duration = Date.now() - startTime;
          console.log(`⏱️ Response time: ${duration}ms`);

          try {
            const parsed = JSON.parse(responseData);
            console.log('✅ Model used:', parsed.model);
            console.log('✅ Response:', parsed.response);

            if (parsed.model !== model) {
              console.error(`❌ MODEL MISMATCH! Requested: ${model}, Got: ${parsed.model}`);
            }

            resolve(parsed);
          } catch (error) {
            console.error('❌ Failed to parse response:', error.message);
            console.log('Raw response:', responseData.substring(0, 500));
            reject(error);
          }
        });
      });

      request.on('error', (error) => {
        console.error('❌ Request error:', error.message);
        reject(error);
      });

      request.write(requestData);
      request.end();
    });
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests with different models
async function runTests() {
  console.log('🚀 Starting Model Selection Debug Tests');
  console.log('═'.repeat(60));

  const modelsToTest = [
    'qwen2.5:14b-instruct-q4_K_M',  // What should be used
    'llama3.1:8b-instruct-q4_K_M',  // What's appearing instead
    'qwen2.5:14b'  // Simplified version
  ];

  for (const model of modelsToTest) {
    try {
      await testOllamaModel(model);
    } catch (error) {
      console.error(`Failed testing ${model}:`, error.message);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Tests complete');
}

// Check if running in Electron main process
if (require.main === module) {
  runTests().then(() => {
    console.log('Debug complete');
    process.exit(0);
  }).catch(error => {
    console.error('Debug failed:', error);
    process.exit(1);
  });
} else {
  module.exports = { testOllamaModel };
}