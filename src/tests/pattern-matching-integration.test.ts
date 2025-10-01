/**
 * VoiceCoach V2 - Pattern Matching Integration Tests
 * Verifies pattern matching achieves 60-70% hit rate for common triggers
 * Measures performance (<50ms target)
 */

import { PatternMatchingLibrary, MatchingContext } from '../services/coaching/PatternMatchingLibrary';
import { ToolTemplateEngine } from '../services/coaching/ToolTemplateEngine';
import * as path from 'path';

interface TestCase {
  transcript: string;
  expectedToolId: number;
  expectedToolName: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  stage?: number;
  description: string;
}

interface TestResult {
  testCase: TestCase;
  matched: boolean;
  actualToolId: number | null;
  actualToolName: string | null;
  confidence: string | null;
  processingTime: number;
  matchType: string | null;
  score: number | null;
}

/**
 * Integration test suite for pattern matching
 */
async function runPatternMatchingTests() {
  console.log('🧪 Pattern Matching Integration Tests\n');
  console.log('='.repeat(80));

  // Initialize engine and matcher
  const configPath = path.resolve(__dirname, '../../rag/13ToolsRAG-01-templates.json');
  const engine = new ToolTemplateEngine(configPath);
  await engine.loadConfig();
  const matcher = new PatternMatchingLibrary(engine);

  // Test cases covering all 13 tools
  const testCases: TestCase[] = [
    // Tool 1: Mirroring
    {
      transcript: "Our biggest challenge is coordinating the team effectively",
      expectedToolId: 1,
      expectedToolName: "Mirroring",
      sentiment: "negative",
      stage: 2,
      description: "Challenge mentioned - should trigger Mirroring"
    },
    {
      transcript: "The main problem we're facing is response time",
      expectedToolId: 1,
      expectedToolName: "Mirroring",
      sentiment: "negative",
      stage: 2,
      description: "Problem mentioned - should trigger Mirroring"
    },

    // Tool 2: Empathy Response
    {
      transcript: "I'm really frustrated with how slow this process is",
      expectedToolId: 2,
      expectedToolName: "Empathy Response",
      sentiment: "negative",
      stage: 3,
      description: "Frustrated - should trigger Empathy Response"
    },
    {
      transcript: "We're overwhelmed by the amount of manual work",
      expectedToolId: 2,
      expectedToolName: "Empathy Response",
      sentiment: "negative",
      stage: 3,
      description: "Overwhelmed - should trigger Empathy Response"
    },

    // Tool 5: Labeling
    {
      transcript: "I'm concerned about the implementation timeline",
      expectedToolId: 5,
      expectedToolName: "Labeling",
      sentiment: "negative",
      stage: 5,
      description: "Concerned - should trigger Labeling"
    },
    {
      transcript: "I'm worried this might not work for our use case",
      expectedToolId: 5,
      expectedToolName: "Labeling",
      sentiment: "negative",
      stage: 4,
      description: "Worried - should trigger Labeling"
    },

    // Tool 6: Calibrated Questions
    {
      transcript: "I'm not sure if this will solve our problem",
      expectedToolId: 6,
      expectedToolName: "Calibrated Questions - What or How",
      sentiment: "neutral",
      stage: 5,
      description: "Not sure - should trigger Calibrated Questions"
    },
    {
      transcript: "How would this integrate with our existing systems?",
      expectedToolId: 6,
      expectedToolName: "Calibrated Questions - What or How",
      sentiment: "neutral",
      stage: 5,
      description: "How question - should trigger Calibrated Questions"
    },

    // Tool 10: Buy-In
    {
      transcript: "I'm interested in learning more about this approach",
      expectedToolId: 10,
      expectedToolName: "Buy-In",
      sentiment: "positive",
      stage: 5,
      description: "Interested - should trigger Buy-In"
    },
    {
      transcript: "This sounds promising for our team",
      expectedToolId: 10,
      expectedToolName: "Buy-In",
      sentiment: "positive",
      stage: 4,
      description: "Promising - should trigger Buy-In"
    },

    // Tool 13: Take Away
    {
      transcript: "This is way too expensive for our budget",
      expectedToolId: 13,
      expectedToolName: "Take Away",
      sentiment: "negative",
      stage: 7,
      description: "Expensive - should trigger Take Away"
    },
    {
      transcript: "The cost is a major concern for us right now",
      expectedToolId: 13,
      expectedToolName: "Take Away",
      sentiment: "negative",
      stage: 8,
      description: "Cost concern - should trigger Take Away"
    },
    {
      transcript: "I don't think we have the budget for this",
      expectedToolId: 13,
      expectedToolName: "Take Away",
      sentiment: "negative",
      stage: 7,
      description: "Budget issue - should trigger Take Away"
    },
    {
      transcript: "Maybe we should think about this some more",
      expectedToolId: 13,
      expectedToolName: "Take Away",
      sentiment: "neutral",
      stage: 8,
      description: "Maybe later - should trigger Take Away"
    },
    {
      transcript: "Let's revisit this in a few months",
      expectedToolId: 13,
      expectedToolName: "Take Away",
      sentiment: "neutral",
      stage: 8,
      description: "Delay - should trigger Take Away"
    },

    // Edge cases - Complex objections
    {
      transcript: "We already have a solution that works fine",
      expectedToolId: 3,
      expectedToolName: "Empathy Questions",
      sentiment: "neutral",
      stage: 4,
      description: "Already have - should trigger Empathy Questions"
    },
    {
      transcript: "This seems complicated to set up",
      expectedToolId: 13,
      expectedToolName: "Take Away",
      sentiment: "negative",
      stage: 6,
      description: "Complicated - should trigger Take Away"
    },

    // Positive scenarios
    {
      transcript: "This could really help us solve our coordination issues",
      expectedToolId: 10,
      expectedToolName: "Buy-In",
      sentiment: "positive",
      stage: 6,
      description: "Could help - should trigger Buy-In"
    },
    {
      transcript: "I like the approach you're describing",
      expectedToolId: 10,
      expectedToolName: "Buy-In",
      sentiment: "positive",
      stage: 5,
      description: "Like - should trigger Buy-In"
    },

    // Neutral information gathering
    {
      transcript: "Can you tell me more about how this works?",
      expectedToolId: 6,
      expectedToolName: "Calibrated Questions - What or How",
      sentiment: "neutral",
      stage: 3,
      description: "Tell me more - information request"
    }
  ];

  // Run all tests
  const results: TestResult[] = [];
  let totalProcessingTime = 0;

  console.log(`\n📋 Running ${testCases.length} pattern matching tests...\n`);

  for (const testCase of testCases) {
    const startTime = performance.now();

    const context: MatchingContext = {
      transcript: testCase.transcript,
      sentiment: testCase.sentiment,
      stage: testCase.stage
    };

    const match = matcher.matchTool(context);
    const processingTime = performance.now() - startTime;
    totalProcessingTime += processingTime;

    const result: TestResult = {
      testCase,
      matched: match !== null && match.toolId === testCase.expectedToolId,
      actualToolId: match?.toolId || null,
      actualToolName: match?.toolName || null,
      confidence: match?.confidence || null,
      processingTime,
      matchType: match?.matchType || null,
      score: match?.score || null
    };

    results.push(result);
  }

  // Calculate statistics
  const passedTests = results.filter(r => r.matched).length;
  const failedTests = results.length - passedTests;
  const hitRate = (passedTests / results.length) * 100;
  const avgProcessingTime = totalProcessingTime / results.length;
  const maxProcessingTime = Math.max(...results.map(r => r.processingTime));
  const under50ms = results.filter(r => r.processingTime < 50).length;
  const performanceRate = (under50ms / results.length) * 100;

  // Print results
  console.log('\n📊 Test Results Summary\n');
  console.log('='.repeat(80));
  console.log(`Total Tests:           ${results.length}`);
  console.log(`✅ Passed:             ${passedTests} (${hitRate.toFixed(1)}%)`);
  console.log(`❌ Failed:             ${failedTests}`);
  console.log(`\n⚡ Performance:`);
  console.log(`Average Time:          ${avgProcessingTime.toFixed(2)}ms`);
  console.log(`Max Time:              ${maxProcessingTime.toFixed(2)}ms`);
  console.log(`Under 50ms:            ${under50ms}/${results.length} (${performanceRate.toFixed(1)}%)`);
  console.log('='.repeat(80));

  // Success criteria check
  console.log('\n✅ Success Criteria:\n');
  const hitRateTarget = hitRate >= 60;
  const performanceTarget = avgProcessingTime < 50;

  console.log(`Hit Rate ≥60%:         ${hitRateTarget ? '✅' : '❌'} (${hitRate.toFixed(1)}%)`);
  console.log(`Avg Time <50ms:        ${performanceTarget ? '✅' : '❌'} (${avgProcessingTime.toFixed(2)}ms)`);

  const overallSuccess = hitRateTarget && performanceTarget;
  console.log(`\nOverall Status:        ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);

  // Show failed tests
  const failedResults = results.filter(r => !r.matched);
  if (failedResults.length > 0) {
    console.log('\n\n❌ Failed Tests (Pattern Improvements Needed):\n');
    console.log('='.repeat(80));

    failedResults.forEach((result, idx) => {
      console.log(`\n${idx + 1}. ${result.testCase.description}`);
      console.log(`   Transcript: "${result.testCase.transcript}"`);
      console.log(`   Expected:   Tool ${result.testCase.expectedToolId} (${result.testCase.expectedToolName})`);
      console.log(`   Actual:     ${result.actualToolId ? `Tool ${result.actualToolId} (${result.actualToolName})` : 'No match'}`);
      console.log(`   Score:      ${result.score || 'N/A'}`);
      console.log(`   Time:       ${result.processingTime.toFixed(2)}ms`);
    });
  }

  // Show passed tests with details
  console.log('\n\n✅ Passed Tests:\n');
  console.log('='.repeat(80));

  const passedResults = results.filter(r => r.matched);
  passedResults.forEach((result, idx) => {
    console.log(`${idx + 1}. ${result.testCase.description}`);
    console.log(`   Tool ${result.actualToolId}: ${result.actualToolName}`);
    console.log(`   Confidence: ${result.confidence}, Score: ${result.score}, Time: ${result.processingTime.toFixed(2)}ms`);
  });

  // Pattern analysis
  console.log('\n\n📈 Pattern Matching Statistics:\n');
  console.log('='.repeat(80));

  const stats = matcher.getMatchingStats();
  console.log(`Total Tools:           ${stats.totalTools}`);
  console.log(`Tools with Keywords:   ${stats.toolsWithKeywords}`);
  console.log(`Tools with Regex:      ${stats.toolsWithRegex}`);
  console.log(`Tools with Sentiment:  ${stats.toolsWithSentimentBias}`);
  console.log(`Tools with Stage:      ${stats.toolsWithStageBias}`);

  // Tool usage distribution
  console.log('\n📊 Tool Match Distribution:\n');
  const toolCounts = new Map<number, number>();
  results.forEach(r => {
    if (r.actualToolId) {
      toolCounts.set(r.actualToolId, (toolCounts.get(r.actualToolId) || 0) + 1);
    }
  });

  Array.from(toolCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([toolId, count]) => {
      const toolName = engine.getTool(toolId)?.name || 'Unknown';
      const percentage = (count / results.length) * 100;
      console.log(`Tool ${toolId} (${toolName}): ${count} matches (${percentage.toFixed(1)}%)`);
    });

  console.log('\n' + '='.repeat(80));
  console.log('✅ Pattern Matching Integration Tests Complete\n');

  return {
    totalTests: results.length,
    passed: passedTests,
    failed: failedTests,
    hitRate,
    avgProcessingTime,
    maxProcessingTime,
    success: overallSuccess
  };
}

// Run tests
runPatternMatchingTests()
  .then(summary => {
    process.exit(summary.success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
