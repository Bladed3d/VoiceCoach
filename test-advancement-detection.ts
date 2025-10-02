/**
 * Test Advancement Language Detection
 * Run with: npx tsx test-advancement-detection.ts
 */

import { SentimentAnalyzer } from './src/services/coaching/sentiment-analyzer';

console.log('🧪 Testing Advancement Language Detection\n');
console.log('='.repeat(80));

const analyzer = new SentimentAnalyzer();

// Test 1: User confirming prospect interest (the reported issue)
console.log('\n📊 Test 1: User Confirming Prospect Interest (SHOULD BE POSITIVE)');
console.log('Text: "and you\'re thinking about focusing specifically on your short game with our coaches"');
const test1 = analyzer.analyzeResponse(
  "and you're thinking about focusing specifically on your short game with our coaches",
  'user'
);
console.log(`Result: ${test1.direction} (score: ${test1.score})`);
console.log(`Expected: positive (ADVANCEMENT)`);
console.log(`✓ Pass:`, test1.score > 30); // Should be base (15) + thinking about (20) + focusing on (20) + with our (20)

// Test 2: User summarizing prospect's interest
console.log('\n📊 Test 2: User Summarizing Interest (SHOULD BE POSITIVE)');
console.log('Text: "so you\'re interested in working with our coaches"');
const test2 = analyzer.analyzeResponse(
  "so you're interested in working with our coaches",
  'user'
);
console.log(`Result: ${test2.direction} (score: ${test2.score})`);
console.log(`Expected: positive (ADVANCEMENT)`);
console.log(`✓ Pass:`, test2.score > 30);

// Test 3: User confirming next steps
console.log('\n📊 Test 3: User Confirming Next Steps (SHOULD BE POSITIVE)');
console.log('Text: "great so you\'re ready to get started with our service"');
const test3 = analyzer.analyzeResponse(
  "great so you're ready to get started with our service",
  'user'
);
console.log(`Result: ${test3.direction} (score: ${test3.score})`);
console.log(`Expected: positive (ADVANCEMENT)`);
console.log(`✓ Pass:`, test3.score > 30);

// Test 4: User neutral statement (should be low)
console.log('\n📊 Test 4: User Neutral Statement (SHOULD BE LOW)');
console.log('Text: "okay I see what you mean"');
const test4 = analyzer.analyzeResponse(
  "okay I see what you mean",
  'user'
);
console.log(`Result: ${test4.direction} (score: ${test4.score})`);
console.log(`Expected: neutral or low positive`);
console.log(`✓ Pass:`, test4.score < 20);

// Test 5: Full conversation context
console.log('\n📊 Test 5: Full Conversation Context');
console.log('Prospect: "yeah i\'ve heard a lot about your high level coaches so i\'m interested"');
const prospect = analyzer.analyzeResponse(
  "yeah i've heard a lot about your high level coaches so i'm interested in seeing what that could do for me",
  'prospect'
);
console.log(`Prospect sentiment: ${prospect.direction} (score: ${prospect.score})`);

console.log('User: "and you\'re thinking about focusing specifically on your short game with our coaches"');
const user = analyzer.analyzeResponse(
  "and you're thinking about focusing specifically on your short game with our coaches",
  'user'
);
console.log(`User sentiment: ${user.direction} (score: ${user.score})`);
console.log(`✓ Both should be positive:`, prospect.score > 0 && user.score > 0);

console.log('\n' + '='.repeat(80));
console.log('✅ Advancement Detection Tests Complete!\n');
