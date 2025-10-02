/**
 * Test Validation Mirroring vs Reading Negativity Detection
 * Run with: npx tsx test-validation-mirroring.ts
 */

import { SentimentAnalyzer } from './src/services/coaching/sentiment-analyzer';

console.log('🧪 Testing Validation Mirroring Detection\n');
console.log('='.repeat(80));

const analyzer = new SentimentAnalyzer();

// Test 1: GOOD - User validating prospect's concern (the reported issue)
console.log('\n📊 Test 1: User Validating Prospect Concern (SHOULD BE POSITIVE)');
console.log('Text: "yeah it\'s frustrating when you don\'t seem to connect with the coach and you don\'t feel like they\'re very qualified"');
const test1 = analyzer.analyzeResponse(
  "yeah it's frustrating when you don't seem to connect with the coach and you don't feel like they're very qualified",
  'user'
);
console.log(`Result: ${test1.direction} (score: ${test1.score})`);
console.log(`Expected: positive or neutral (VALIDATION/EMPATHY)`);
console.log(`✓ Pass:`, test1.score >= 0);

// Test 2: BAD - User reading prospect negativity (actual concern)
console.log('\n📊 Test 2: User Reading Negativity (SHOULD BE NEGATIVE)');
console.log('Text: "you don\'t seem very excited about this offer"');
const test2 = analyzer.analyzeResponse(
  "you don't seem very excited about this offer",
  'user'
);
console.log(`Result: ${test2.direction} (score: ${test2.score})`);
console.log(`Expected: negative (READING NEGATIVITY)`);
console.log(`✓ Pass:`, test2.score < 0);

// Test 3: GOOD - User mirroring prospect's words
console.log('\n📊 Test 3: User Mirroring Prospect Words (SHOULD BE POSITIVE)');
console.log('Text: "I understand it can be frustrating when things don\'t sync up"');
const test3 = analyzer.analyzeResponse(
  "I understand it can be frustrating when things don't sync up",
  'user'
);
console.log(`Result: ${test3.direction} (score: ${test3.score})`);
console.log(`Expected: positive (VALIDATION)`);
console.log(`✓ Pass:`, test3.score > 0);

// Test 4: BAD - User detecting hesitation
console.log('\n📊 Test 4: User Detecting Hesitation (SHOULD BE NEGATIVE)');
console.log('Text: "you seem hesitant about moving forward"');
const test4 = analyzer.analyzeResponse(
  "you seem hesitant about moving forward",
  'user'
);
console.log(`Result: ${test4.direction} (score: ${test4.score})`);
console.log(`Expected: negative (READING NEGATIVITY)`);
console.log(`✓ Pass:`, test4.score < 0);

// Test 5: GOOD - User empathizing with stated concern
console.log('\n📊 Test 5: User Empathizing (SHOULD BE POSITIVE)');
console.log('Text: "I hear you, it sounds like the timing wasn\'t right"');
const test5 = analyzer.analyzeResponse(
  "I hear you, it sounds like the timing wasn't right",
  'user'
);
console.log(`Result: ${test5.direction} (score: ${test5.score})`);
console.log(`Expected: positive (EMPATHY)`);
console.log(`✓ Pass:`, test5.score > 0);

console.log('\n' + '='.repeat(80));
console.log('✅ Validation Mirroring Tests Complete!\n');
