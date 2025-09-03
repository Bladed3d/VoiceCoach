/**
 * Test script for Never Split the Difference integration
 * Run this to load your document and test coaching prompts
 */

const path = require('path');

// Import our services (you may need to compile TypeScript first)
// For now, let's create a simple test setup

async function testNeverSplitIntegration() {
  console.log('🚀 Testing Never Split the Difference Integration\n');
  console.log('=' . repeat(60));
  
  // IMPORTANT: Update this path to your Never Split document
  const NEVER_SPLIT_PATH = 'D:\\Projects\\Ai\\VoiceCoach-v2\\rag\\never-split.txt';
  
  console.log(`\n📄 Document Path: ${NEVER_SPLIT_PATH}`);
  console.log('\n⚠️  Please update NEVER_SPLIT_PATH in this script to point to your document!\n');
  
  // Test scenarios to validate coaching
  const testScenarios = [
    {
      name: 'Price Objection',
      transcript: "Your price is way too high compared to the competition. I can't justify this to my boss.",
      expectedTechniques: ['tactical empathy', 'calibrated questions', 'labeling']
    },
    {
      name: 'Authority Challenge',
      transcript: "I need to check with my manager before making any decisions.",
      expectedTechniques: ['calibrated questions', 'how am i supposed to']
    },
    {
      name: 'Trust Building',
      transcript: "I'm not sure I can trust a company I've never heard of before.",
      expectedTechniques: ['mirroring', 'tactical empathy', 'that\'s right']
    },
    {
      name: 'Closing Opportunity',
      transcript: "This looks interesting. What would be the next steps if we wanted to move forward?",
      expectedTechniques: ['calibrated questions', 'rule of three']
    },
    {
      name: 'Discovery Phase',
      transcript: "We're having issues with our current vendor but I'm not sure what we need.",
      expectedTechniques: ['calibrated questions', 'labeling', 'mirroring']
    }
  ];
  
  console.log('📋 Test Scenarios:\n');
  
  testScenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.name}:`);
    console.log(`   Transcript: "${scenario.transcript}"`);
    console.log(`   Expected: ${scenario.expectedTechniques.join(', ')}`);
    console.log('');
  });
  
  console.log('=' . repeat(60));
  console.log('\n✅ Integration test setup complete!');
  console.log('\nNext steps:');
  console.log('1. Update NEVER_SPLIT_PATH to point to your document');
  console.log('2. Run: npm run build (to compile TypeScript)');
  console.log('3. Run: node test-never-split-integration.js');
  console.log('\nThe system will:');
  console.log('- Process your Never Split document into chunks');
  console.log('- Test each scenario with relevant knowledge');
  console.log('- Show compressed prompts (under 3,800 chars)');
  console.log('- Display coaching suggestions');
}

// Helper function to display results
function displayResults(scenario, result) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎯 Scenario: ${scenario.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\n📝 Transcript: "${scenario.transcript}"`);
  console.log(`\n📊 Prompt Stats:`);
  console.log(`   - Length: ${result.promptStats.length} chars`);
  console.log(`   - Tokens: ~${result.promptStats.tokens}`);
  console.log(`   - Compression: ${(result.promptStats.compressionRatio * 100).toFixed(1)}%`);
  console.log(`   - Knowledge Used: ${result.promptStats.knowledgeUsed ? 'Yes' : 'No'}`);
  console.log(`\n💡 Coaching Suggestion:`);
  console.log(`   - Urgency: ${result.suggestion.urgency}`);
  console.log(`   - Suggestion: ${result.suggestion.suggestion}`);
  console.log(`   - Reasoning: ${result.suggestion.reasoning}`);
  console.log(`   - Next Action: "${result.suggestion.next_action}"`);
}

// Run the test
testNeverSplitIntegration().catch(console.error);