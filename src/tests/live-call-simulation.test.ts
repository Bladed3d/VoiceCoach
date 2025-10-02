/**
 * VoiceCoach V2 - Live Call Simulation Test
 * Phase 10 Preview: Simulate realistic prospect speech and track system response
 * Run: npx tsx src/tests/live-call-simulation.test.ts
 */

import { ToolTemplateEngine } from '../services/coaching/ToolTemplateEngine';
import { PatternMatchingLibrary, MatchingContext } from '../services/coaching/PatternMatchingLibrary';
import * as path from 'path';

interface SimulatedTurn {
  speaker: 'salesperson' | 'prospect';
  text: string;
  stage: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

interface CoachingResult {
  turn: number;
  prospectSaid: string;
  toolSelected: number;
  toolName: string;
  matchType: 'pattern' | 'ai-fallback';
  processingTime: number;
  coachingPrompt: string;
  confidence: 'high' | 'medium' | 'low';
}

// Realistic sales call simulation
const callScript: SimulatedTurn[] = [
  // Opening (Stage 1)
  { speaker: 'salesperson', text: "Hi, thanks for taking my call. I understand you're looking to improve your sales process?", stage: 1 },
  { speaker: 'prospect', text: "Yeah, we've been having some challenges with our current approach.", stage: 1, sentiment: 'neutral' },

  // Discovery (Stage 2-3)
  { speaker: 'salesperson', text: "I'd love to hear more about that.", stage: 2 },
  { speaker: 'prospect', text: "Well, our team is really struggling with follow-up and tracking leads.", stage: 2, sentiment: 'negative' },

  { speaker: 'salesperson', text: "That sounds frustrating. How long has this been an issue?", stage: 2 },
  { speaker: 'prospect', text: "About 6 months now. It's really impacting our revenue.", stage: 2, sentiment: 'negative' },

  // Pain Point Exploration (Stage 3)
  { speaker: 'salesperson', text: "Revenue impact is serious. Tell me more about that.", stage: 3 },
  { speaker: 'prospect', text: "We're losing deals because we can't respond fast enough to prospects.", stage: 3, sentiment: 'negative' },

  // Value Proposition (Stage 4)
  { speaker: 'salesperson', text: "I see. What if you could respond to prospects within 5 minutes automatically?", stage: 4 },
  { speaker: 'prospect', text: "That sounds interesting, but how would that work with our current system?", stage: 4, sentiment: 'positive' },

  // Objection Handling (Stage 5)
  { speaker: 'salesperson', text: "Great question. It integrates directly with your CRM.", stage: 5 },
  { speaker: 'prospect', text: "I'm worried about implementation time. We tried something similar before and it took 6 months.", stage: 5, sentiment: 'negative' },

  { speaker: 'salesperson', text: "I understand that concern completely.", stage: 5 },
  { speaker: 'prospect', text: "Plus, the cost is probably going to be way too high for our budget.", stage: 5, sentiment: 'negative' },

  // Price Discussion (Stage 6)
  { speaker: 'salesperson', text: "Let me show you some pricing options.", stage: 6 },
  { speaker: 'prospect', text: "I don't know, this is more expensive than I expected.", stage: 6, sentiment: 'negative' },

  // Closing (Stage 7-8)
  { speaker: 'salesperson', text: "I appreciate that transparency. What budget range were you thinking?", stage: 7 },
  { speaker: 'prospect', text: "I need to think about this and talk to my team first.", stage: 7, sentiment: 'neutral' },

  { speaker: 'salesperson', text: "Of course. When would be a good time to reconnect?", stage: 8 },
  { speaker: 'prospect', text: "Maybe in a few weeks? I'm not sure we're ready right now.", stage: 8, sentiment: 'negative' },
];

async function simulateCall() {
  console.log('\n🎬 VoiceCoach V2 - Live Call Simulation');
  console.log('='.repeat(70));
  console.log('Simulating realistic sales call with 18 exchanges\n');

  // Initialize system
  const configPath = path.resolve(__dirname, '../../rag/13ToolsRAG-01-templates.json');
  const templateEngine = new ToolTemplateEngine(configPath);
  await templateEngine.loadConfig();

  const patternMatcher = new PatternMatchingLibrary(templateEngine);

  const results: CoachingResult[] = [];
  const conversationHistory: any[] = [];
  let patternMatchCount = 0;
  let aiFallbackCount = 0;

  console.log('📊 REAL-TIME CALL MONITORING');
  console.log('='.repeat(70));

  // Process only prospect turns (those needing coaching)
  for (let i = 0; i < callScript.length; i++) {
    const turn = callScript[i];

    // Skip salesperson turns
    if (turn.speaker === 'salesperson') {
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`💼 You: "${turn.text}"`);
      continue;
    }

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`👤 Prospect: "${turn.text}"`);
    console.log(`   Stage: ${turn.stage} | Sentiment: ${turn.sentiment || 'neutral'}`);

    const startTime = performance.now();

    // Try pattern matching
    const context: MatchingContext = {
      transcript: turn.text,
      sentiment: turn.sentiment || 'neutral',
      stage: turn.stage,
      conversationHistory
    };

    const patternMatch = patternMatcher.matchTool(context);

    let toolId: number;
    let toolName: string;
    let matchType: 'pattern' | 'ai-fallback';
    let confidence: 'high' | 'medium' | 'low';

    if (patternMatch) {
      // Pattern match successful
      toolId = patternMatch.toolId;
      toolName = patternMatch.toolName;
      matchType = 'pattern';
      confidence = patternMatch.confidence;
      patternMatchCount++;

      console.log(`   ⚡ Pattern Match: Tool ${toolId} (${toolName}) [${patternMatch.matchType}]`);
    } else {
      // AI fallback (simulated)
      toolId = 1; // Default to Mirroring
      toolName = 'Mirroring';
      matchType = 'ai-fallback';
      confidence = 'medium';
      aiFallbackCount++;

      console.log(`   🤖 AI Fallback: Tool ${toolId} (${toolName})`);
    }

    // Extract variables and fill template
    let variables = templateEngine.extractSimpleVariables(toolId, turn.text);
    if (!variables) {
      // Simulate AI extraction for complex tools
      variables = { LAST_WORDS: turn.text.split(' ').slice(-3).join(' ') };
    }

    const templateResult = templateEngine.fillTemplate(toolId, variables);
    const processingTime = performance.now() - startTime;

    console.log(`   💡 Coaching: "${templateResult.filledPrompt}"`);
    console.log(`   ⏱️  Response Time: ${processingTime.toFixed(2)}ms`);

    // Store result
    results.push({
      turn: i + 1,
      prospectSaid: turn.text,
      toolSelected: toolId,
      toolName,
      matchType,
      processingTime,
      coachingPrompt: templateResult.filledPrompt,
      confidence
    });

    // Add to conversation history
    conversationHistory.push({
      speaker: 'prospect',
      text: turn.text,
      timestamp: new Date().toISOString()
    });
  }

  // Print summary
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 CALL SIMULATION SUMMARY');
  console.log('='.repeat(70));

  const avgTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
  const maxTime = Math.max(...results.map(r => r.processingTime));
  const minTime = Math.min(...results.map(r => r.processingTime));

  const prospectTurns = callScript.filter(t => t.speaker === 'prospect').length;

  console.log(`\n🎯 Performance Metrics:`);
  console.log(`   Total Prospect Turns: ${prospectTurns}`);
  console.log(`   Pattern Matches: ${patternMatchCount} (${((patternMatchCount/prospectTurns)*100).toFixed(1)}%)`);
  console.log(`   AI Fallbacks: ${aiFallbackCount} (${((aiFallbackCount/prospectTurns)*100).toFixed(1)}%)`);
  console.log(`\n⏱️  Response Times:`);
  console.log(`   Average: ${avgTime.toFixed(2)}ms`);
  console.log(`   Min: ${minTime.toFixed(2)}ms`);
  console.log(`   Max: ${maxTime.toFixed(2)}ms`);
  console.log(`   Target: <200ms for pattern, <400ms with AI`);

  // Performance assessment
  const patternMatchRate = (patternMatchCount / prospectTurns) * 100;
  const avgPerformanceGood = avgTime < 200;

  console.log(`\n✅ Success Criteria:`);
  console.log(`   Pattern Match Rate ≥60%: ${patternMatchRate >= 60 ? '✅' : '❌'} (${patternMatchRate.toFixed(1)}%)`);
  console.log(`   Avg Response <200ms: ${avgPerformanceGood ? '✅' : '❌'} (${avgTime.toFixed(2)}ms)`);
  console.log(`   No Errors: ✅`);

  // Tool usage breakdown
  console.log(`\n🔧 Tool Usage:`);
  const toolUsage = new Map<number, number>();
  results.forEach(r => {
    toolUsage.set(r.toolSelected, (toolUsage.get(r.toolSelected) || 0) + 1);
  });

  Array.from(toolUsage.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([toolId, count]) => {
      const tool = templateEngine.getTool(toolId);
      console.log(`   Tool ${toolId} (${tool?.name}): ${count}x`);
    });

  // Sample prompts
  console.log(`\n💬 Sample Coaching Prompts:`);
  results.slice(0, 3).forEach(r => {
    console.log(`\n   Turn ${r.turn}: "${r.prospectSaid.substring(0, 50)}..."`);
    console.log(`   → "${r.coachingPrompt}"`);
    console.log(`   (${r.toolName}, ${r.matchType}, ${r.processingTime.toFixed(2)}ms)`);
  });

  console.log('\n' + '='.repeat(70));
  const overallSuccess = patternMatchRate >= 60 && avgPerformanceGood;
  if (overallSuccess) {
    console.log('🎉 SIMULATION PASSED - System ready for live testing!');
  } else {
    console.log('⚠️  SIMULATION NEEDS REVIEW - Check performance or pattern matching');
  }
  console.log('='.repeat(70) + '\n');

  return {
    success: overallSuccess,
    results,
    metrics: {
      patternMatchRate,
      avgTime,
      maxTime,
      minTime,
      totalTurns: prospectTurns
    }
  };
}

// Run simulation
simulateCall().catch(error => {
  console.error('❌ Simulation failed:', error);
  process.exit(1);
});
