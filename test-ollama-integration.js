/**
 * VoiceCoach V2 - Ollama Integration Test
 * Test the complete live coaching pipeline with Phase 1A document loading
 * Based on working backup implementation from 08/22/25
 */

const fs = require('fs');
const path = require('path');

// Test configuration based on working backup
const OLLAMA_CONFIG = {
  baseUrl: 'http://localhost:11434',
  model: 'qwen2.5:14b-instruct-q4_k_m',
  temperature: 0.3,
  topP: 0.9,
  maxTokens: 300
};

const WEBSOCKET_CONFIG = {
  serverUrl: 'ws://127.0.0.1:5000'
};

const COACHING_CONFIG = {
  minTranscriptLength: 50,
  enableRealTimeAnalysis: true,
  debounceMs: 150
};

console.log('🧪 VoiceCoach V2 - Ollama Integration Test Starting...\n');

// Test 1: Check Ollama Server Connection
async function testOllamaConnection() {
  console.log('1️⃣ Testing Ollama Server Connection...');
  
  try {
    const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/tags`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const models = data.models || [];
    const targetModel = models.find(m => m.name === OLLAMA_CONFIG.model);
    
    console.log(`   ✅ Ollama server connected (${models.length} models available)`);
    
    if (targetModel) {
      console.log(`   ✅ Target model '${OLLAMA_CONFIG.model}' found`);
      console.log(`      Size: ${(targetModel.size / 1024 / 1024 / 1024).toFixed(1)}GB`);
      return true;
    } else {
      console.log(`   ❌ Target model '${OLLAMA_CONFIG.model}' NOT found`);
      console.log(`   Available models: ${models.map(m => m.name).join(', ')}`);
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Ollama connection failed: ${error.message}`);
    console.log(`   💡 Make sure Ollama is running: ollama serve`);
    console.log(`   💡 Make sure model is installed: ollama pull ${OLLAMA_CONFIG.model}`);
    return false;
  }
}

// Test 2: Check WebSocket Server
async function testWebSocketServer() {
  console.log('\n2️⃣ Testing WebSocket Server...');
  
  return new Promise((resolve) => {
    try {
      const ws = new (require('ws'))(WEBSOCKET_CONFIG.serverUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        console.log(`   ❌ WebSocket connection timeout`);
        console.log(`   💡 Make sure WebSocket server is running:`);
        console.log(`      python src/services/vosk-native-websocket-server.py`);
        resolve(false);
      }, 5000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        console.log(`   ✅ WebSocket server connected: ${WEBSOCKET_CONFIG.serverUrl}`);
        ws.close();
        resolve(true);
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        console.log(`   ❌ WebSocket error: ${error.message}`);
        console.log(`   💡 Make sure WebSocket server is running:`);
        console.log(`      python src/services/vosk-native-websocket-server.py`);
        resolve(false);
      });
      
    } catch (error) {
      console.log(`   ❌ WebSocket test failed: ${error.message}`);
      resolve(false);
    }
  });
}

// Test 3: Check RAG Documents
async function testRagDocuments() {
  console.log('\n3️⃣ Testing RAG Documents...');
  
  const ragPath = path.join(process.cwd(), 'rag');
  
  if (!fs.existsSync(ragPath)) {
    console.log(`   ❌ RAG folder not found: ${ragPath}`);
    return false;
  }
  
  const files = fs.readdirSync(ragPath);
  const phase1aFiles = files.filter(f => f.endsWith('_phase1a.json') || f.endsWith('-phase1a.json'));
  const originalFiles = files.filter(f => f.includes('original'));
  
  console.log(`   📁 RAG folder found: ${files.length} files`);
  console.log(`   📄 Phase 1A files: ${phase1aFiles.length}`);
  console.log(`   📄 Original files: ${originalFiles.length}`);
  
  if (phase1aFiles.length === 0) {
    console.log(`   ❌ No Phase 1A files found`);
    console.log(`   💡 Expected format: documentname_phase1a.json`);
    return false;
  }
  
  // Test loading first Phase 1A file
  const testFile = phase1aFiles[0];
  const testPath = path.join(ragPath, testFile);
  
  try {
    const content = fs.readFileSync(testPath, 'utf-8');
    const data = JSON.parse(content);
    
    const techniques = data.high_impact_techniques?.length || 0;
    const objections = data.objection_handlers?.length || 0;
    const summary = data.document_summary?.total_techniques_found || 'N/A';
    
    console.log(`   ✅ Phase 1A loaded: ${testFile}`);
    console.log(`      Techniques: ${techniques}, Objections: ${objections}, Total: ${summary}`);
    
    return { fileName: testFile.replace('_phase1a.json', '').replace('-phase1a.json', ''), data };
    
  } catch (error) {
    console.log(`   ❌ Failed to load Phase 1A file: ${error.message}`);
    return false;
  }
}

// Test 4: Test Ollama Coaching Generation
async function testOllamaCoaching(ragDocument) {
  console.log('\n4️⃣ Testing Ollama Coaching Generation...');
  
  if (!ragDocument) {
    console.log('   ⏭️  Skipped (no document available)');
    return false;
  }
  
  const testTranscript = "I'm not sure if this solution is right for us. It seems complicated.";
  
  // Build coaching prompt similar to working backup
  const techniques = ragDocument.data.high_impact_techniques?.slice(0, 3) || [];
  const objections = ragDocument.data.objection_handlers?.slice(0, 3) || [];
  
  const prompt = `# Real-Time Sales Coaching Assistant

## Your Role
You are an AI sales coach providing real-time guidance during a live sales call. Analyze the conversation and provide ONE specific, actionable suggestion.

## Document Insights Available
${techniques.map(t => `- ${t.technique}: ${t.example || t.description}`).join('\\n')}

## Objection Handlers Available  
${objections.map(o => `- "${o.objection}" → "${o.response}"`).join('\\n')}

## Current Conversation Context
Recent transcript: "${testTranscript}"

## Instructions
Respond with ONLY a JSON object in this exact format:
{
  "suggestion": "One specific actionable suggestion (max 100 words)",
  "priority": "HIGH|MEDIUM|LOW", 
  "category": "objection_handling|discovery|closing|value_prop",
  "trigger": "What triggered this suggestion",
  "context": "Brief context explanation",
  "confidence": 0.0-1.0
}

ONLY respond if you detect a clear coaching opportunity. If no coaching is needed, respond with: {"suggestion": null}`;

  try {
    console.log(`   🤖 Sending test prompt to Ollama (${prompt.length} chars)...`);
    
    const startTime = Date.now();
    
    const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_CONFIG.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: OLLAMA_CONFIG.temperature,
          top_p: OLLAMA_CONFIG.topP,
          num_predict: OLLAMA_CONFIG.maxTokens
        }
      })
    });
    
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const aiResponse = data.response;
    
    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\\{[\\s\\S]*\\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const suggestion = JSON.parse(jsonMatch[0]);
    
    console.log(`   ✅ Coaching response received (${responseTime}ms)`);
    console.log(`      Suggestion: ${suggestion.suggestion?.substring(0, 60)}...`);
    console.log(`      Priority: ${suggestion.priority}, Category: ${suggestion.category}`);
    console.log(`      Confidence: ${suggestion.confidence}`);
    
    return responseTime < 2000; // Success if under 2 seconds
    
  } catch (error) {
    console.log(`   ❌ Ollama coaching test failed: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🔍 Configuration:');
  console.log(`   Ollama: ${OLLAMA_CONFIG.baseUrl} (${OLLAMA_CONFIG.model})`);
  console.log(`   WebSocket: ${WEBSOCKET_CONFIG.serverUrl}`);
  console.log(`   Real-time Analysis: ${COACHING_CONFIG.enableRealTimeAnalysis}`);
  console.log(`   Min Transcript Length: ${COACHING_CONFIG.minTranscriptLength} chars`);
  console.log(`   Debounce: ${COACHING_CONFIG.debounceMs}ms`);
  
  const results = {
    ollama: await testOllamaConnection(),
    websocket: await testWebSocketServer(),
    ragDocuments: await testRagDocuments(),
    coaching: false
  };
  
  if (results.ollama && results.ragDocuments) {
    results.coaching = await testOllamaCoaching(results.ragDocuments);
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log(`   Ollama Connection: ${results.ollama ? '✅' : '❌'}`);
  console.log(`   WebSocket Server: ${results.websocket ? '✅' : '❌'}`);
  console.log(`   RAG Documents: ${results.ragDocuments ? '✅' : '❌'}`);
  console.log(`   Coaching Generation: ${results.coaching ? '✅' : '❌'}`);
  
  const allPassed = Object.values(results).every(r => r);
  
  console.log(`\\n🎯 Overall Status: ${allPassed ? '✅ READY FOR LIVE COACHING' : '❌ ISSUES FOUND'}`);
  
  if (allPassed) {
    console.log('\\n🚀 Next Steps:');
    console.log('   1. Start VoiceCoach V2 app');
    console.log('   2. Load document using useLiveCoaching hook');
    console.log('   3. Start recording session');
    console.log('   4. Watch for coaching suggestions in left panel');
  }
  
  return allPassed;
}

// Run the tests
runAllTests().catch(console.error);