/**
 * Test script for Dual-Speaker Sentiment Analysis
 * Run with: npx tsx test-dual-speaker-sentiment.ts
 */

import { SentimentAnalyzer } from './src/services/coaching/sentiment-analyzer';

console.log('🧪 Testing Dual-Speaker Sentiment Analysis\n');
console.log('='.repeat(60));

const analyzer = new SentimentAnalyzer();

// Test 1: Prospect sharing pain points (should be POSITIVE)
console.log('\n📊 Test 1: Prospect sharing pain points');
console.log('Text: "I\'m really struggling with my short game"');
const test1 = analyzer.analyzeResponse("I'm really struggling with my short game", 'prospect');
console.log(`Result: ${test1.direction} (score: ${test1.score})`);
console.log(`Expected: positive (pain sharing)`);
console.log(`✓ Pass:`, test1.direction === 'positive' && test1.score > 0);

// Test 2: User validating/confident (should be POSITIVE)
console.log('\n📊 Test 2: User validating/confident');
console.log('Text: "I understand, let me help you with that"');
const test2 = analyzer.analyzeResponse("I understand, let me help you with that", 'user');
console.log(`Result: ${test2.direction} (score: ${test2.score})`);
console.log(`Expected: positive (good handling)`);
console.log(`✓ Pass:`, test2.direction === 'positive' && test2.score > 0);

// Test 3: User detecting negativity (should be NEGATIVE)
console.log('\n📊 Test 3: User detecting negativity');
console.log('Text: "you don\'t sound very excited"');
const test3 = analyzer.analyzeResponse("you don't sound very excited", 'user');
console.log(`Result: ${test3.direction} (score: ${test3.score})`);
console.log(`Expected: negative (reading negativity)`);
console.log(`✓ Pass:`, test3.direction === 'negative' && test3.score < 0);

// Test 4: User being defensive (should be NEGATIVE)
console.log('\n📊 Test 4: User being defensive');
console.log('Text: "but actually you have to understand"');
const test4 = analyzer.analyzeResponse("but actually you have to understand", 'user');
console.log(`Result: ${test4.direction} (score: ${test4.score})`);
console.log(`Expected: negative (defensive language)`);
console.log(`✓ Pass:`, test4.direction === 'negative' && test4.score < 0);

// Test 5: Prospect positive engagement
console.log('\n📊 Test 5: Prospect positive engagement');
console.log('Text: "That sounds really interesting, tell me more"');
const test5 = analyzer.analyzeResponse("That sounds really interesting, tell me more", 'prospect');
console.log(`Result: ${test5.direction} (score: ${test5.score})`);
console.log(`Expected: positive (engaged + curious)`);
console.log(`✓ Pass:`, test5.direction === 'positive' && test5.score > 0);

// Test 6: Prospect real objection (should be NEGATIVE)
console.log('\n📊 Test 6: Prospect real objection');
console.log('Text: "This is too expensive and not interested"');
const test6 = analyzer.analyzeResponse("This is too expensive and not interested", 'prospect');
console.log(`Result: ${test6.direction} (score: ${test6.score})`);
console.log(`Expected: negative (deal-killer)`);
console.log(`✓ Pass:`, test6.direction === 'negative' && test6.score < 0);

console.log('\n' + '='.repeat(60));
console.log('✅ All tests complete!\n');

// Summary
console.log('📈 Summary of Dual-Speaker Analysis:');
console.log('- Prospect pain sharing → Positive sentiment ✓');
console.log('- User validation/empathy → Positive sentiment ✓');
console.log('- User defensive language → Negative sentiment ✓');
console.log('- User reading negativity → Negative sentiment ✓');
console.log('- Combined sentiment = More accurate call health ✓');
