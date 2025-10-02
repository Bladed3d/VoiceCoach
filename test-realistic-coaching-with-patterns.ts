/**
 * Realistic Coaching Test WITH Pattern Matching
 *
 * Measures performance impact of pattern matching vs AI:
 * - Pattern Match: <5ms (instant)
 * - AI (Ollama): ~1000ms (slow)
 *
 * This test shows what percentage of scenarios can be handled instantly
 * vs requiring slow AI calls.
 *
 * Run: npx tsx test-realistic-coaching-with-patterns.ts <instruction-file>
 */

import fs from 'fs';
import path from 'path';
import http from 'http';

// Mock window.electronAPI for Node.js environment
(global as any).window = {
  electronAPI: {
    readFile: async (filePath: string) => {
      try {
        const fullPath = path.join(__dirname, filePath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        return { content };
      } catch (error) {
        console.error(`Failed to read file: ${filePath}`, error);
        return null;
      }
    },
    ollamaGenerate: async (payload: { prompt: string; model: string }) => {
      return new Promise((resolve) => {
        const data = JSON.stringify({
          model: payload.model,
          prompt: payload.prompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 300
          }
        });

        const options = {
          hostname: 'localhost',
          port: 11434,
          path: '/api/generate',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
          }
        };

        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', (chunk) => body += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              resolve({ success: true, response: parsed.response });
            } catch (e) {
              resolve({ success: false, error: 'Failed to parse Ollama response' });
            }
          });
        });

        req.on('error', (error) => {
          resolve({ success: false, error: error.message });
        });

        req.write(data);
        req.end();
      });
    }
  }
};

// Mock localStorage
(global as any).localStorage = {
  getItem: (key: string) => {
    if (key === 'voicecoach-settings') {
      return JSON.stringify({
        ollama: {
          instructionFile: process.argv[2] || 'direct-coaching-prompt.md'
        }
      });
    }
    return null;
  },
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null
};

// Mock performance for Node.js
if (typeof performance === 'undefined') {
  (global as any).performance = {
    now: () => Date.now()
  };
}

// Import actual app services
import { ollamaPromptService } from './src/services/coaching/OllamaPromptService';
import { ToolTemplateEngine } from './src/services/coaching/ToolTemplateEngine';
import { PatternMatchingLibrary, MatchingContext } from './src/services/coaching/PatternMatchingLibrary';

interface TestScenario {
  id: number;
  name: string;
  transcript: string;
  context: {
    sentiment: string;
    stage: number;
    topics: string[];
    objections: string[];
  };
  expert_selection: {
    primary_tool_id: number;
    primary_tool_name: string;
  };
}

interface TestResult {
  scenario_id: number;
  scenario_name: string;
  transcript: string;

  // Pattern matching results
  pattern_matched: boolean;
  pattern_tool_id?: number;
  pattern_tool_name?: string;
  pattern_time_ms: number;
  pattern_score?: number;

  // AI results (only if pattern failed)
  ai_tool_id?: number;
  ai_tool_name?: string;
  ai_say_this?: string;
  ai_time_ms?: number;

  // Combined
  total_time_ms: number;
  method_used: 'pattern' | 'ai';
  expected_tool: number;
  tool_correct: boolean;
}

// Load scenarios
const scenariosPath = path.join(__dirname, 'src/tests/realistic-coaching-scenarios.json');
const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8'));
const scenarios: TestScenario[] = [
  ...scenariosData.scenarios,
  ...scenariosData.casual_conversation_scenarios
];

async function runTest(instructionFile: string): Promise<void> {
  console.log('\\n🧪 Realistic Coaching Test WITH Pattern Matching\\n');
  console.log('='.repeat(80));
  console.log(`\\n📂 Instruction file: ${instructionFile}`);
  console.log('\\n🎯 Testing: Pattern Matching (instant) vs AI (slow)\\n');

  // Initialize services
  console.log('🔄 Loading services...');

  const initialized = await ollamaPromptService.initialize();
  if (!initialized) {
    console.error('❌ Failed to initialize OllamaPromptService');
    return;
  }

  // Load RAG tools and create pattern matcher
  // Use relative path since mock electronAPI will join with __dirname
  const templatePath = 'rag/13ToolsRAG-01-templates.json';

  const templateEngine = new ToolTemplateEngine(templatePath);
  await templateEngine.loadConfig(); // CRITICAL: Must load templates before using!

  const patternMatcher = new PatternMatchingLibrary(templateEngine);

  console.log('✅ Services initialized\\n');
  console.log(`🎯 Running ${scenarios.length} scenarios...\\n`);

  const results: TestResult[] = [];
  let patternHitCount = 0;
  let aiFallbackCount = 0;

  for (const scenario of scenarios) {
    const startTime = performance.now();

    try {
      // Step 1: Try pattern matching FIRST (like the app does)
      const patternStartTime = performance.now();

      const matchingContext: MatchingContext = {
        transcript: scenario.transcript,
        sentiment: scenario.context.sentiment as 'positive' | 'negative' | 'neutral',
        stage: scenario.context.stage,
        conversationHistory: []
      };

      const patternMatch = patternMatcher.matchTool(matchingContext);
      const patternTime = performance.now() - patternStartTime;

      if (patternMatch && patternMatch.score >= 60) {
        // Pattern match succeeded! (instant, <5ms)
        patternHitCount++;

        const totalTime = performance.now() - startTime;

        results.push({
          scenario_id: scenario.id,
          scenario_name: scenario.name,
          transcript: scenario.transcript,
          pattern_matched: true,
          pattern_tool_id: patternMatch.toolId,
          pattern_tool_name: patternMatch.toolName,
          pattern_time_ms: patternTime,
          pattern_score: patternMatch.score,
          total_time_ms: totalTime,
          method_used: 'pattern',
          expected_tool: scenario.expert_selection.primary_tool_id,
          tool_correct: patternMatch.toolId === scenario.expert_selection.primary_tool_id
        });

        console.log(`⚡ PATTERN: Scenario ${scenario.id} - ${patternMatch.toolName} (${Math.round(totalTime)}ms, score: ${patternMatch.score})`);

      } else {
        // Pattern failed, fallback to AI (slow, ~1000ms)
        aiFallbackCount++;

        const aiStartTime = performance.now();
        const aiResult = await ollamaPromptService.generateCoaching({
          transcript: scenario.transcript,
          salesStage: scenario.context.stage.toString(),
          sentiment: scenario.context.sentiment,
          topics: scenario.context.topics,
          objections: scenario.context.objections
        });
        const aiTime = performance.now() - aiStartTime;

        const totalTime = performance.now() - startTime;

        let aiToolId: number | undefined;
        let aiToolName: string | undefined;
        let aiSayThis: string | undefined;

        if (aiResult.success && aiResult.response) {
          const jsonMatch = aiResult.response.match(/\\{[\\s\\S]*\\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            aiToolId = parsed.tool_id;
            aiToolName = parsed.tool_name || parsed.tool;
            aiSayThis = parsed.say_this;
          }
        }

        results.push({
          scenario_id: scenario.id,
          scenario_name: scenario.name,
          transcript: scenario.transcript,
          pattern_matched: false,
          pattern_time_ms: patternTime,
          ai_tool_id: aiToolId,
          ai_tool_name: aiToolName,
          ai_say_this: aiSayThis,
          ai_time_ms: aiTime,
          total_time_ms: totalTime,
          method_used: 'ai',
          expected_tool: scenario.expert_selection.primary_tool_id,
          tool_correct: aiToolId === scenario.expert_selection.primary_tool_id
        });

        console.log(`🤖 AI: Scenario ${scenario.id} - ${aiToolName || 'N/A'} (${Math.round(totalTime)}ms)`);
      }

    } catch (error) {
      console.error(`❌ Error in scenario ${scenario.id}:`, error);
    }
  }

  // Calculate statistics
  const patternTimes = results.filter(r => r.method_used === 'pattern').map(r => r.total_time_ms);
  const aiTimes = results.filter(r => r.method_used === 'ai').map(r => r.total_time_ms);

  const avgPatternTime = patternTimes.length > 0 ? patternTimes.reduce((a, b) => a + b) / patternTimes.length : 0;
  const avgAiTime = aiTimes.length > 0 ? aiTimes.reduce((a, b) => a + b) / aiTimes.length : 0;

  // Display results
  console.log('\\n\\n' + '='.repeat(80));
  console.log('📊 PERFORMANCE RESULTS\\n');

  console.log(`⚡ Pattern Matching: ${patternHitCount}/${scenarios.length} scenarios (${Math.round(patternHitCount/scenarios.length*100)}%)`);
  console.log(`   Average time: ${Math.round(avgPatternTime)}ms`);
  console.log(`   Status: ${avgPatternTime < 5 ? '✅ INSTANT' : '⚠️ SLOW'}`);

  console.log(`\\n🤖 AI Fallback: ${aiFallbackCount}/${scenarios.length} scenarios (${Math.round(aiFallbackCount/scenarios.length*100)}%)`);
  console.log(`   Average time: ${Math.round(avgAiTime)}ms`);
  console.log(`   Status: ${avgAiTime < 400 ? '✅ FAST ENOUGH' : '⚠️ TOO SLOW (>${avgAiTime}ms)'}`);

  console.log(`\\n🎯 Overall Average: ${Math.round((patternHitCount * avgPatternTime + aiFallbackCount * avgAiTime) / scenarios.length)}ms`);
  console.log(`   Goal: <400ms`);

  // Show detailed breakdown
  console.log('\\n\\n' + '='.repeat(80));
  console.log('📝 DETAILED BREAKDOWN\\n');

  for (const result of results) {
    const icon = result.method_used === 'pattern' ? '⚡' : '🤖';
    const correctIcon = result.tool_correct ? '✅' : '❌';

    console.log(`${icon} ${correctIcon} Scenario ${result.scenario_id}: ${result.scenario_name}`);
    console.log(`   Method: ${result.method_used.toUpperCase()}`);
    console.log(`   Time: ${Math.round(result.total_time_ms)}ms`);

    if (result.method_used === 'pattern') {
      console.log(`   Tool: ${result.pattern_tool_name} (score: ${result.pattern_score})`);
    } else {
      console.log(`   Tool: ${result.ai_tool_name || 'N/A'}`);
      console.log(`   Prompt: "${result.ai_say_this?.substring(0, 60)}..."`);
    }
    console.log('');
  }

  // Save results
  const outputPath = path.join(__dirname, `test-results-with-patterns-${instructionFile.replace('.md', '')}.json`);
  fs.writeFileSync(outputPath, JSON.stringify({
    results,
    summary: {
      total: scenarios.length,
      pattern_hit_count: patternHitCount,
      pattern_hit_rate: Math.round(patternHitCount/scenarios.length*100),
      ai_fallback_count: aiFallbackCount,
      avg_pattern_time_ms: Math.round(avgPatternTime),
      avg_ai_time_ms: Math.round(avgAiTime),
      overall_avg_ms: Math.round((patternHitCount * avgPatternTime + aiFallbackCount * avgAiTime) / scenarios.length)
    }
  }, null, 2));

  console.log(`💾 Results saved to: ${outputPath}\\n`);
  console.log('='.repeat(80) + '\\n');
}

// Main
const instructionFile = process.argv[2] || 'direct-coaching-prompt.md';
runTest(instructionFile).catch(console.error);
