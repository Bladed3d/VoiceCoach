/**
 * Test script for stage-based coaching management
 * Run with: node test-stage-management.js
 */

// Mock coaching system document with stages
const mockCoachingSystem = {
  stages: {
    opening: {
      name: "Opening & Rapport",
      goal: "Build rapport and set agenda",
      keywords: ["hello", "hi", "thanks", "appreciate"],
      bridges: [
        { text: "What brings you to explore our solution today?", priority: "CRITICAL" },
        { text: "How can I best help you?", priority: "HIGH" },
        { text: "What's your biggest priority right now?", priority: "STANDARD" }
      ],
      recovery: ["How can I help you today?"]
    },
    discovery: {
      name: "Discovery & Pain Points",
      goal: "Uncover pain points and quantify impact",
      keywords: ["challenge", "problem", "struggling", "difficult"],
      bridges: [
        { text: "How long has this been affecting your team?", priority: "CRITICAL" },
        { text: "What's the impact on your business?", priority: "HIGH" },
        { text: "Have you tried other solutions?", priority: "STANDARD" }
      ]
    },
    demo: {
      name: "Solution Presentation",
      goal: "Present solution connected to their pain",
      keywords: ["show me", "how does", "features", "demo"],
      bridges: [
        { text: "Let me show you how this addresses your specific challenge", priority: "CRITICAL" },
        { text: "This feature directly solves the problem you mentioned", priority: "HIGH" }
      ]
    },
    objection_handling: {
      name: "Objection Handling",
      goal: "Address concerns and rebuild value",
      keywords: ["expensive", "concern", "worried", "not sure"],
      bridges: [
        { text: "I understand your concern. What specifically worries you?", priority: "CRITICAL" },
        { text: "Let's look at the ROI based on what you've told me", priority: "HIGH" },
        { text: "What would need to be true for this to work for you?", priority: "STANDARD" }
      ]
    },
    closing: {
      name: "Closing & Next Steps",
      goal: "Secure commitment and define next steps",
      keywords: ["ready", "next steps", "get started", "move forward"],
      bridges: [
        { text: "Based on everything we've discussed, are you ready to move forward?", priority: "CRITICAL" },
        { text: "What questions do you have before we get started?", priority: "HIGH" },
        { text: "Should we schedule implementation for next week?", priority: "STANDARD" }
      ]
    }
  },
  metadata: {
    source: "test_document.pdf",
    processing_date: new Date().toISOString()
  }
};

// Test transcripts that should trigger different stages
const testTranscripts = [
  {
    text: "Hi, thanks for taking my call today. I appreciate your time.",
    expectedStage: "discovery", // After opening, should move to discovery
    description: "Opening greeting"
  },
  {
    text: "We're really struggling with our sales process. It's been a problem for months.",
    expectedStage: "discovery",
    description: "Discovery - pain point identification"
  },
  {
    text: "Can you show me how your solution handles objections?",
    expectedStage: "demo",
    description: "Demo request"
  },
  {
    text: "I'm concerned about the price. It seems expensive for our budget.",
    expectedStage: "objection_handling",
    description: "Price objection"
  },
  {
    text: "Okay, I think we're ready to move forward. What are the next steps?",
    expectedStage: "closing",
    description: "Closing signal"
  }
];

async function testStageManagement() {
  console.log('🧪 TESTING STAGE-BASED COACHING MANAGEMENT\n');
  console.log('=' .repeat(60));
  
  // Check if Ollama is running
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      console.error('❌ Ollama is not running. Please start Ollama first.');
      console.log('   Run: ollama serve');
      return;
    }
    console.log('✅ Ollama is running\n');
  } catch (error) {
    console.error('❌ Cannot connect to Ollama:', error.message);
    console.log('   Make sure Ollama is running: ollama serve');
    return;
  }
  
  // Import the service
  const { OllamaCoachingService } = await import('./src/services/coaching/ollama-service.ts');
  
  // Initialize service
  const service = new OllamaCoachingService({
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:7b',
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 150
  });
  
  // Test connection
  const connected = await service.testConnection();
  if (!connected) {
    console.error('❌ Failed to connect to Ollama');
    return;
  }
  
  // Load the mock coaching system
  console.log('\n📚 Loading coaching system with stages...');
  const loaded = await service.loadAndIndexDocument(mockCoachingSystem);
  if (!loaded) {
    console.error('❌ Failed to load coaching system');
    return;
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 TESTING STAGE TRANSITIONS\n');
  
  // Test each transcript
  for (let i = 0; i < testTranscripts.length; i++) {
    const test = testTranscripts[i];
    console.log(`\nTest ${i + 1}: ${test.description}`);
    console.log(`Transcript: "${test.text}"`);
    
    // Create context
    const context = {
      currentTranscript: test.text,
      processedInsights: mockCoachingSystem,
      conversationHistory: [],
      originalDocument: 'test_document.pdf'
    };
    
    // Generate coaching suggestion (this will trigger stage detection)
    const suggestion = await service.generateCoachingSuggestion(context);
    
    // Get stage info
    const stageInfo = service.getStageInfo();
    
    console.log(`\n📊 Stage Detection Results:`);
    console.log(`   Current Stage: ${stageInfo.currentStage}`);
    console.log(`   Expected Stage: ${test.expectedStage}`);
    console.log(`   ✅ Match: ${stageInfo.currentStage === test.expectedStage ? 'YES' : 'NO'}`);
    console.log(`   Available Bridges: ${stageInfo.availableBridges}`);
    if (stageInfo.stageGoal) {
      console.log(`   Stage Goal: ${stageInfo.stageGoal}`);
    }
    console.log(`   Stage History: ${stageInfo.stageHistory.join(' → ')}`);
    
    if (suggestion) {
      console.log(`\n💡 Coaching Suggestion:`);
      console.log(`   ${suggestion.suggestion}`);
      console.log(`   Priority: ${suggestion.priority}`);
      console.log(`   Category: ${suggestion.category}`);
    }
    
    console.log('\n' + '-'.repeat(60));
  }
  
  // Final summary
  const finalStageInfo = service.getStageInfo();
  console.log('\n📈 FINAL SUMMARY');
  console.log(`   Total Stage Transitions: ${finalStageInfo.transitionCount}`);
  console.log(`   Complete Journey: ${finalStageInfo.stageHistory.join(' → ')}`);
  console.log(`   Final Stage: ${finalStageInfo.currentStage}`);
  
  // Test reset
  console.log('\n🔄 Testing stage reset...');
  service.resetStageTracking();
  const resetInfo = service.getStageInfo();
  console.log(`   Stage after reset: ${resetInfo.currentStage}`);
  console.log(`   History cleared: ${resetInfo.stageHistory.length === 1 ? 'YES' : 'NO'}`);
  
  console.log('\n✅ Stage management test complete!');
}

// Run the test
testStageManagement().catch(console.error);