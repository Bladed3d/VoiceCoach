/**
 * VoiceCoach V2 - Ollama Live Coaching Test
 * Complete end-to-end test: Document → Processing → Live Call → Coaching
 */

// Test configuration
const TEST_CONFIG = {
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:14b-instruct-q4_k_m',
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 300
  },
  websocket: {
    serverUrl: 'ws://127.0.0.1:5000'
  },
  coaching: {
    minTranscriptLength: 20, // minimum 20 characters before coaching
    maxHistoryLength: 10, // keep last 10 conversation items
    enableRealTimeAnalysis: true, // instant analysis on final transcripts
    debounceMs: 150 // debounce rapid-fire transcripts (150ms for responsiveness)
  },
  testDocument: {
    name: 'Sales Strategy Test Document',
    content: `
# Advanced Sales Techniques

## Objection Handling
When a prospect says "It's too expensive":
- Acknowledge their concern
- Redirect to value conversation  
- Ask about their budget parameters
- Present ROI calculations

## Discovery Questions
- What's your current process for [specific challenge]?
- How much time does your team spend on [problem]?
- What would a 25% improvement be worth to you?
- Who else would be involved in this decision?

## Closing Techniques
- Assumptive close: "When would you like to start implementation?"
- Alternative close: "Would you prefer the monthly or annual plan?"
- Urgency close: "This pricing is only available until Friday"
    `,
    // Mock processed insights (normally from RAG pipeline)
    phase1AResults: {
      high_impact_techniques: [
        {
          technique: "Value-based objection handling",
          situation: "When prospect raises price concerns",
          example: "I understand cost is important. Let's look at the ROI you'll see in the first 90 days...",
          priority: "HIGH"
        },
        {
          technique: "Discovery questioning framework", 
          situation: "Early in sales conversation",
          example: "What's your current process for handling [specific challenge]?",
          priority: "CRITICAL"
        }
      ],
      objection_handlers: [
        {
          objection: "It's too expensive",
          response: "I understand price is a concern. What specific budget range were you considering, and how do you typically calculate ROI on investments like this?",
          source: "Advanced objection handling section"
        },
        {
          objection: "We need to think about it",
          response: "That makes sense - this is an important decision. What specific aspects would you like to think through, and what information would help you make a confident choice?",
          source: "Closing techniques framework"
        }
      ]
    }
  }
};

async function testOllamaConnection() {
  console.log('\n🔥 Testing Ollama Connection...');
  
  try {
    const response = await fetch(`${TEST_CONFIG.ollama.baseUrl}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Ollama connected successfully');
      console.log(`📋 Available models: ${data.models?.map(m => m.name).join(', ')}`);
      
      // Check if our configured model exists
      const hasModel = data.models?.some(m => m.name === TEST_CONFIG.ollama.model);
      if (!hasModel) {
        console.log(`⚠️  Model ${TEST_CONFIG.ollama.model} not found. Available models:`);
        data.models?.forEach(m => console.log(`   - ${m.name}`));
        return false;
      }
      
      return true;
    }
    
    throw new Error(`HTTP ${response.status}`);
    
  } catch (error) {
    console.log(`❌ Ollama connection failed: ${error.message}`);
    console.log('💡 Make sure Ollama is running: ollama serve');
    console.log(`💡 Make sure model is installed: ollama pull ${TEST_CONFIG.ollama.model}`);
    return false;
  }
}

async function testWebSocketConnection() {
  console.log('\n🌐 Testing WebSocket Connection...');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(TEST_CONFIG.websocket.serverUrl);
    
    const timeout = setTimeout(() => {
      console.log('❌ WebSocket connection timeout');
      console.log('💡 Make sure Python server is running: python src/services/vosk-native-websocket-server.py');
      ws.close();
      resolve(false);
    }, 5000);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected successfully');
      clearTimeout(timeout);
      ws.close();
      resolve(true);
    };
    
    ws.onerror = (error) => {
      console.log('❌ WebSocket connection failed:', error.message || 'Connection refused');
      clearTimeout(timeout);
      resolve(false);
    };
  });
}

async function testDocumentProcessing() {
  console.log('\n📄 Testing Document Processing...');
  
  try {
    // Simulate document processing (normally done by electron main process)
    const processedDocument = {
      name: TEST_CONFIG.testDocument.name,
      originalContent: TEST_CONFIG.testDocument.content,
      phase1AResults: TEST_CONFIG.testDocument.phase1AResults,
      loadedTimestamp: new Date().toISOString()
    };
    
    console.log('✅ Document processed successfully');
    console.log(`📊 Techniques found: ${processedDocument.phase1AResults.high_impact_techniques.length}`);
    console.log(`🛡️  Objection handlers: ${processedDocument.phase1AResults.objection_handlers.length}`);
    
    return processedDocument;
    
  } catch (error) {
    console.log('❌ Document processing failed:', error.message);
    return null;
  }
}

async function testOllamaCoaching(processedDocument) {
  console.log('\n🧠 Testing Ollama Coaching Generation...');
  
  try {
    // Simulate real conversation context
    const mockContext = {
      originalDocument: processedDocument.originalContent,
      processedInsights: processedDocument.phase1AResults,
      conversationHistory: [
        { speaker: 'user', text: 'Hi, I wanted to discuss our pricing options', timestamp: new Date().toISOString() },
        { speaker: 'prospect', text: 'Thanks for calling. I have to say upfront that budget is tight this quarter.', timestamp: new Date().toISOString() }
      ],
      currentTranscript: 'Thanks for calling. I have to say upfront that budget is tight this quarter.'
    };
    
    // Build coaching prompt (simplified version)
    const prompt = `# Real-Time Sales Coaching Assistant

## Document Insights Available
${mockContext.processedInsights.high_impact_techniques.map(t => 
  `- ${t.technique}: ${t.example}`
).join('\n')}

## Objection Handlers Available  
${mockContext.processedInsights.objection_handlers.map(o =>
  `- "${o.objection}" → "${o.response}"`
).join('\n')}

## Current Conversation Context
Recent transcript: "${mockContext.currentTranscript}"

## Instructions
The prospect just mentioned budget concerns. Provide coaching guidance.
Respond with ONLY a JSON object in this exact format:
{
  "suggestion": "One specific actionable suggestion (max 100 words)",
  "priority": "HIGH|MEDIUM|LOW", 
  "category": "objection_handling|discovery|closing|value_prop",
  "trigger": "What triggered this suggestion",
  "context": "Brief context explanation",
  "confidence": 0.0-1.0
}`;

    console.log('🤖 Sending coaching request to Ollama...');
    
    const response = await fetch(`${TEST_CONFIG.ollama.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: TEST_CONFIG.ollama.model,
        prompt,
        options: {
          temperature: TEST_CONFIG.ollama.temperature,
          top_p: TEST_CONFIG.ollama.topP,
          num_predict: TEST_CONFIG.ollama.maxTokens
        },
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('\n📝 Raw Ollama Response:');
    console.log(result.response);
    
    // Parse JSON response
    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const coaching = JSON.parse(jsonMatch[0]);
      console.log('\n🎯 Parsed Coaching Suggestion:');
      console.log(`💡 Suggestion: ${coaching.suggestion}`);
      console.log(`🔥 Priority: ${coaching.priority}`);
      console.log(`📂 Category: ${coaching.category}`);
      console.log(`⚡ Trigger: ${coaching.trigger}`);
      console.log(`📊 Confidence: ${coaching.confidence}`);
      
      return coaching;
    } else {
      console.log('⚠️  Could not extract JSON from response');
      return null;
    }
    
  } catch (error) {
    console.log('❌ Ollama coaching test failed:', error.message);
    return null;
  }
}

async function simulateLiveCall() {
  console.log('\n📞 Simulating Live Call Scenario...');
  console.log('This would normally:');
  console.log('1. Connect to WebSocket server for real-time transcription');
  console.log('2. Capture audio from microphone');
  console.log('3. Send audio chunks to Vosk for transcription');
  console.log('4. IMMEDIATELY analyze each final transcript for coaching opportunities');
  console.log('5. Generate coaching suggestions using processed document insights (<200ms)');
  console.log('6. Display suggestions in the UI coaching panel INSTANTLY');
  
  console.log('\n🎯 Example Live Coaching Flow:');
  console.log('👤 Prospect: "Your solution sounds good but we have budget constraints"');
  console.log('🤖 Coaching: "HIGH priority - Use value-based objection handling. Ask about their budget parameters and present ROI calculations."');
}

async function runCompleteTest() {
  console.log('🚀 VoiceCoach V2 - Complete Ollama Integration Test');
  console.log('==================================================');
  
  // Test all components
  const ollamaOk = await testOllamaConnection();
  const websocketOk = await testWebSocketConnection(); 
  const processedDoc = await testDocumentProcessing();
  
  if (!ollamaOk) {
    console.log('\n❌ Cannot proceed without Ollama connection');
    return;
  }
  
  if (processedDoc && ollamaOk) {
    const coaching = await testOllamaCoaching(processedDoc);
    
    if (coaching) {
      console.log('\n✅ All components working! Ready for live coaching.');
      
      if (websocketOk) {
        console.log('✅ Complete setup ready - both Ollama and WebSocket operational');
      } else {
        console.log('⚠️  Ollama working but WebSocket server needs to be started');
      }
      
      await simulateLiveCall();
      
    } else {
      console.log('\n❌ Coaching generation failed');
    }
  }
  
  console.log('\n📋 Setup Instructions for Live Testing:');
  console.log('1. Install Ollama: https://ollama.ai/download');
  console.log(`2. Pull model: ollama pull ${TEST_CONFIG.ollama.model}`);
  console.log('3. Start Ollama: ollama serve');
  console.log('4. Install Python dependencies: pip install vosk websockets');
  console.log('5. Start WebSocket server: python src/services/vosk-native-websocket-server.py');
  console.log('6. Upload a document and process it through the app');
  console.log('7. Start recording and speak to test live coaching!');
}

// Global error handling for Node.js
if (typeof global !== 'undefined') {
  global.fetch = require('node-fetch');
  global.WebSocket = require('ws');
  runCompleteTest().catch(console.error);
} else {
  // Browser environment - just export for use
  window.VoiceCoachOllamaTest = { runCompleteTest };
}