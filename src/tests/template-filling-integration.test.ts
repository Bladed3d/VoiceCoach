/**
 * VoiceCoach V2 - Template Filling Integration Test
 * Phase 9: Verify templates fill correctly with variables and produce high-quality prompts
 * Run: npx tsx src/tests/template-filling-integration.test.ts
 */

import { ToolTemplateEngine } from '../services/coaching/ToolTemplateEngine';
import * as path from 'path';

// Test results tracking
interface TestResult {
  toolId: number;
  toolName: string;
  transcript: string;
  variables: Record<string, string>;
  filledPrompt: string;
  hasPlaceholders: boolean;
  processingTime: number;
  quality: 'excellent' | 'good' | 'poor';
  notes: string;
}

const results: TestResult[] = [];
let passCount = 0;
let failCount = 0;

// Helper to check for unreplaced placeholders
function hasUnreplacedPlaceholders(text: string): boolean {
  return /\{\{[A-Z_]+\}\}/.test(text);
}

// Helper to assess output quality
function assessQuality(prompt: string, toolName: string): 'excellent' | 'good' | 'poor' {
  // Check for placeholders (instant fail)
  if (hasUnreplacedPlaceholders(prompt)) return 'poor';

  // Check for natural language
  const hasProperPunctuation = /[.?!]$/.test(prompt.trim());
  const notTooShort = prompt.length > 5;
  const notTooLong = prompt.length < 200;

  if (hasProperPunctuation && notTooShort && notTooLong) return 'excellent';
  if (notTooShort && notTooLong) return 'good';
  return 'poor';
}

// Test cases for all 13 tools
const testCases = [
  // Tool 1: Mirroring
  {
    toolId: 1,
    transcript: "This is way too expensive for our budget",
    expectedVariables: ['LAST_WORDS']
  },

  // Tool 2: Empathy Response (requires AI for variables)
  {
    toolId: 2,
    transcript: "I'm really frustrated with our current software",
    expectedVariables: ['EMOTION', 'SITUATION'],
    manualVariables: { EMOTION: 'frustrated', SITUATION: 'current software' }
  },

  // Tool 3: Labeling
  {
    toolId: 3,
    transcript: "We're worried about implementation time",
    expectedVariables: ['EMOTION_LABEL']
  },

  // Tool 4: Accusation Audit (complex, requires AI)
  {
    toolId: 4,
    transcript: "I'm concerned this won't work for our team",
    expectedVariables: ['CONCERNS'],
    manualVariables: { CONCERNS: "you're worried this solution won't fit your team's needs" }
  },

  // Tool 5: Negative Assumption
  {
    toolId: 5,
    transcript: "The price seems really high",
    expectedVariables: ['EMOTION_LABEL']
  },

  // Tool 6: Calibrated Questions (complex)
  {
    toolId: 6,
    transcript: "We need to reduce manual work",
    expectedVariables: ['DESIRED_OUTCOME', 'THEIR_SITUATION'],
    manualVariables: { DESIRED_OUTCOME: 'reducing manual work', THEIR_SITUATION: 'current operations' }
  },

  // Tool 7: Empathy Questions
  {
    toolId: 7,
    transcript: "This timeline feels rushed",
    expectedVariables: ['EMOTION'],
    manualVariables: { EMOTION: 'rushed' }
  },

  // Tool 8: Summarizing
  {
    toolId: 8,
    transcript: "We discussed pricing and timeline concerns",
    expectedVariables: ['KEY_POINTS'],
    manualVariables: { KEY_POINTS: 'pricing concerns and timeline worries' }
  },

  // Tool 9: DJ Voice (tone guidance, minimal variables)
  {
    toolId: 9,
    transcript: "I'm very upset about this situation",
    expectedVariables: [],
    manualVariables: {}
  },

  // Tool 10: Buy-In
  {
    toolId: 10,
    transcript: "That sounds promising for our goals",
    expectedVariables: ['SMALL_AGREEMENT']
  },

  // Tool 11: Dynamic Silence (no variables)
  {
    toolId: 11,
    transcript: "I need to think about this",
    expectedVariables: [],
    manualVariables: {}
  },

  // Tool 12: No Means Yes
  {
    toolId: 12,
    transcript: "Would you be opposed to a quick demo?",
    expectedVariables: ['QUESTION'],
    manualVariables: { QUESTION: 'seeing a quick demo of how this works' }
  },

  // Tool 13: Take Away
  {
    toolId: 13,
    transcript: "The cost is just too high for us right now",
    expectedVariables: ['OBJECTION', 'CONCERN']
  }
];

async function runTests() {
  console.log('\n🧪 VoiceCoach V2 - Template Filling Integration Test');
  console.log('================================================\n');

  // Initialize engine
  const configPath = path.resolve(__dirname, '../../rag/13ToolsRAG-01-templates.json');
  const engine = new ToolTemplateEngine(configPath);

  console.log('📁 Loading templates...');
  await engine.loadConfig();
  console.log(`✅ Loaded ${engine.getToolCount()} tools\n`);

  // Run tests for each tool
  for (const testCase of testCases) {
    const { toolId, transcript, expectedVariables, manualVariables } = testCase;

    const tool = engine.getTool(toolId);
    if (!tool) {
      console.log(`❌ Tool ${toolId} not found`);
      failCount++;
      continue;
    }

    console.log(`\n🔧 Testing Tool ${toolId}: ${tool.name}`);
    console.log(`   Transcript: "${transcript}"`);

    try {
      // Extract variables
      let variables: Record<string, string>;

      // Try simple extraction first
      const simpleVars = engine.extractSimpleVariables(toolId, transcript);

      if (simpleVars) {
        variables = simpleVars;
        console.log(`   ✅ Simple extraction (instant)`);
      } else if (manualVariables) {
        // Use manual variables (simulating AI extraction)
        variables = manualVariables;
        console.log(`   ⚙️  Manual variables (simulating AI)`);
      } else {
        console.log(`   ⚠️  No variables needed for this tool`);
        variables = {};
      }

      console.log(`   Variables:`, variables);

      // Fill template
      const startTime = performance.now();
      const result = engine.fillTemplate(toolId, variables);
      const processingTime = performance.now() - startTime;

      // Check for placeholders
      const hasPlaceholders = hasUnreplacedPlaceholders(result.filledPrompt);

      // Assess quality
      const quality = assessQuality(result.filledPrompt, tool.name);

      // Determine pass/fail
      const passed = !hasPlaceholders && quality !== 'poor' && processingTime < 5;

      if (passed) {
        passCount++;
        console.log(`   ✅ PASS`);
      } else {
        failCount++;
        console.log(`   ❌ FAIL`);
      }

      console.log(`   Filled: "${result.filledPrompt}"`);
      console.log(`   Quality: ${quality} | Time: ${processingTime.toFixed(2)}ms`);

      // Store result
      results.push({
        toolId,
        toolName: tool.name,
        transcript,
        variables,
        filledPrompt: result.filledPrompt,
        hasPlaceholders,
        processingTime,
        quality,
        notes: hasPlaceholders ? 'Contains unreplaced placeholders' : 'Clean'
      });

      // Check for issues
      if (hasPlaceholders) {
        console.log(`   ⚠️  WARNING: Unreplaced placeholders found!`);
      }
      if (processingTime > 5) {
        console.log(`   ⚠️  WARNING: Processing time exceeded 5ms target`);
      }

    } catch (error) {
      failCount++;
      console.log(`   ❌ ERROR: ${(error as Error).message}`);

      results.push({
        toolId,
        toolName: tool.name,
        transcript,
        variables: {},
        filledPrompt: 'ERROR',
        hasPlaceholders: true,
        processingTime: 0,
        quality: 'poor',
        notes: (error as Error).message
      });
    }
  }

  // Print summary
  console.log('\n\n📊 TEST SUMMARY');
  console.log('===============\n');
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`✅ Passed: ${passCount} (${((passCount / testCases.length) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failCount} (${((failCount / testCases.length) * 100).toFixed(1)}%)`);

  // Quality breakdown
  const excellent = results.filter(r => r.quality === 'excellent').length;
  const good = results.filter(r => r.quality === 'good').length;
  const poor = results.filter(r => r.quality === 'poor').length;

  console.log('\n📈 QUALITY BREAKDOWN');
  console.log('===================\n');
  console.log(`Excellent: ${excellent}`);
  console.log(`Good: ${good}`);
  console.log(`Poor: ${poor}`);

  // Performance stats
  const avgTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
  const maxTime = Math.max(...results.map(r => r.processingTime));

  console.log('\n⚡ PERFORMANCE STATS');
  console.log('===================\n');
  console.log(`Average Fill Time: ${avgTime.toFixed(3)}ms`);
  console.log(`Max Fill Time: ${maxTime.toFixed(3)}ms`);
  console.log(`Target: <5ms per fill`);
  console.log(maxTime < 5 ? '✅ Performance target met' : '❌ Performance target exceeded');

  // Issues found
  const withPlaceholders = results.filter(r => r.hasPlaceholders);
  if (withPlaceholders.length > 0) {
    console.log('\n⚠️  ISSUES FOUND');
    console.log('===============\n');
    withPlaceholders.forEach(r => {
      console.log(`Tool ${r.toolId} (${r.toolName}): ${r.notes}`);
    });
  }

  // Success criteria
  console.log('\n✅ SUCCESS CRITERIA');
  console.log('==================\n');
  console.log(`All placeholders replaced: ${withPlaceholders.length === 0 ? '✅' : '❌'}`);
  console.log(`Quality good or excellent: ${poor === 0 ? '✅' : '❌'}`);
  console.log(`Performance <5ms: ${maxTime < 5 ? '✅' : '❌'}`);
  console.log(`Pass rate ≥90%: ${passCount / testCases.length >= 0.9 ? '✅' : '❌'}`);

  // Final verdict
  const allCriteriaMet = withPlaceholders.length === 0 && poor === 0 && maxTime < 5 && passCount / testCases.length >= 0.9;

  console.log('\n' + '='.repeat(50));
  if (allCriteriaMet) {
    console.log('🎉 PHASE 9 COMPLETE - All criteria met!');
  } else {
    console.log('⚠️  PHASE 9 INCOMPLETE - Some criteria not met');
  }
  console.log('='.repeat(50) + '\n');

  process.exit(allCriteriaMet ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
