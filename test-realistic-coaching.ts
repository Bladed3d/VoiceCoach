/**
 * Realistic Coaching Test - Uses ACTUAL app services
 *
 * This test uses the SAME code path as the app:
 * - OllamaPromptService (singleton)
 * - Same prompt building logic
 * - Same variable replacement
 * - Same Ollama API calls
 *
 * Run: npx tsx test-realistic-coaching.ts <instruction-file>
 * Example: npx tsx test-realistic-coaching.ts direct-coaching-prompt.md
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

// Import actual app services (THIS IS THE KEY - same code as app!)
import { ollamaPromptService } from './src/services/coaching/OllamaPromptService';

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
    reasoning: string;
    trigger_words: string[];
    expected_prompt_pattern: string;
  };
}

interface TestResult {
  scenario_id: number;
  scenario_name: string;
  transcript: string;
  expected_tool: number;
  expected_tool_name: string;
  actual_tool?: number;
  actual_tool_name?: string;
  actual_say_this?: string;
  tool_correct: boolean;
  prompt_quality: 'excellent' | 'good' | 'generic' | 'poor';
  response_time_ms: number;
  ollama_response: any;
  error?: string;
}

// Load test scenarios
const scenariosPath = path.join(__dirname, 'src/tests/realistic-coaching-scenarios.json');
const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8'));
const scenarios: TestScenario[] = [
  ...scenariosData.scenarios,
  ...scenariosData.casual_conversation_scenarios
];

/**
 * Assess prompt quality (not generic/template-based)
 */
function assessPromptQuality(sayThis: string, transcript: string, expectedPattern: string): 'excellent' | 'good' | 'generic' | 'poor' {
  if (!sayThis || sayThis.length < 5) return 'poor';

  // Generic template responses (BAD)
  const genericPhrases = [
    'working okay?',
    'timing?',
    'budget?',
    'tell me more',
    'sync up'
  ];

  const lowerSayThis = sayThis.toLowerCase();

  // Check if it's just copying a generic template
  if (genericPhrases.some(phrase => lowerSayThis === phrase || lowerSayThis === phrase + '.')) {
    return 'generic';
  }

  // Extract key words from transcript (excluding common words)
  const transcriptWords = transcript.toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 4 && !['about', 'could', 'would', 'should', 'their', 'there'].includes(w));

  // Check if response references specific words from transcript
  const referencesTranscript = transcriptWords.some(word => lowerSayThis.includes(word));

  // Check length (longer = more contextual usually)
  const isSubstantive = sayThis.length > 30;

  if (referencesTranscript && isSubstantive) return 'excellent';
  if (referencesTranscript || isSubstantive) return 'good';

  return 'generic';
}

/**
 * Parse Ollama response for tool selection
 */
function parseOllamaResponse(responseText: string): {
  tool_id?: number;
  tool_name?: string;
  say_this?: string;
  parsed: any;
} {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { parsed: null };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      tool_id: parsed.tool_id,
      tool_name: parsed.tool_name || parsed.tool,
      say_this: parsed.say_this,
      parsed
    };
  } catch (e) {
    return { parsed: null };
  }
}

/**
 * Run test with baseline instruction file (direct-coaching-prompt.md)
 */
async function runTest(instructionFile: string): Promise<void> {
  console.log('\\n🧪 Realistic Coaching Test (Using ACTUAL App Services)\\n');
  console.log('='.repeat(80));
  console.log(`\\n📂 Instruction file: ${instructionFile}`);

  // Step 1: Load instruction file into OllamaPromptService
  // This MODIFIES the singleton that the app uses!
  console.log('\\n🔄 Loading instruction file into OllamaPromptService...');

  // Initialize the service (loads the instruction file from mocked localStorage)
  const initialized = await ollamaPromptService.initialize();

  if (!initialized) {
    console.error('❌ Failed to initialize OllamaPromptService');
    return;
  }

  console.log('✅ OllamaPromptService initialized with', instructionFile);
  console.log('   Service status:', ollamaPromptService.getStatus());

  // Step 2: Run scenarios through ACTUAL app code
  const results: TestResult[] = [];
  let correctCount = 0;
  let excellentCount = 0;
  let goodCount = 0;
  let genericCount = 0;

  console.log(`\\n\\n🎯 Running ${scenarios.length} scenarios...\\n`);

  for (const scenario of scenarios) {
    const startTime = Date.now();

    try {
      // Call the ACTUAL app service (same code path as live coaching!)
      const result = await ollamaPromptService.generateCoaching({
        transcript: scenario.transcript,
        salesStage: scenario.context.stage.toString(),
        sentiment: scenario.context.sentiment,
        topics: scenario.context.topics,
        objections: scenario.context.objections
      });

      const responseTime = Date.now() - startTime;

      if (!result.success || !result.response) {
        results.push({
          scenario_id: scenario.id,
          scenario_name: scenario.name,
          transcript: scenario.transcript,
          expected_tool: scenario.expert_selection.primary_tool_id,
          expected_tool_name: scenario.expert_selection.primary_tool_name,
          tool_correct: false,
          prompt_quality: 'poor',
          response_time_ms: responseTime,
          ollama_response: null,
          error: result.error || 'No response from Ollama'
        });
        continue;
      }

      // Parse response
      const parsed = parseOllamaResponse(result.response);
      const toolCorrect = parsed.tool_id === scenario.expert_selection.primary_tool_id;
      const promptQuality = assessPromptQuality(
        parsed.say_this || '',
        scenario.transcript,
        scenario.expert_selection.expected_prompt_pattern
      );

      results.push({
        scenario_id: scenario.id,
        scenario_name: scenario.name,
        transcript: scenario.transcript,
        expected_tool: scenario.expert_selection.primary_tool_id,
        expected_tool_name: scenario.expert_selection.primary_tool_name,
        actual_tool: parsed.tool_id,
        actual_tool_name: parsed.tool_name,
        actual_say_this: parsed.say_this,
        tool_correct: toolCorrect,
        prompt_quality: promptQuality,
        response_time_ms: responseTime,
        ollama_response: parsed.parsed
      });

      if (toolCorrect) correctCount++;
      if (promptQuality === 'excellent') excellentCount++;
      if (promptQuality === 'good') goodCount++;
      if (promptQuality === 'generic') genericCount++;

      // Live progress
      const status = toolCorrect ? '✅' : '❌';
      const qualityEmoji = promptQuality === 'excellent' ? '🌟' :
                          promptQuality === 'good' ? '👍' :
                          promptQuality === 'generic' ? '⚠️' : '💀';
      console.log(`${status} ${qualityEmoji} Scenario ${scenario.id}: ${scenario.name.substring(0, 40)}... (${responseTime}ms)`);

    } catch (error) {
      results.push({
        scenario_id: scenario.id,
        scenario_name: scenario.name,
        transcript: scenario.transcript,
        expected_tool: scenario.expert_selection.primary_tool_id,
        expected_tool_name: scenario.expert_selection.primary_tool_name,
        tool_correct: false,
        prompt_quality: 'poor',
        response_time_ms: Date.now() - startTime,
        ollama_response: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Step 3: Display results
  console.log('\\n\\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS\\n');
  console.log(`Tool Selection Accuracy: ${correctCount}/${scenarios.length} (${Math.round(correctCount/scenarios.length*100)}%)`);
  console.log(`Prompt Quality:`);
  console.log(`  🌟 Excellent: ${excellentCount} (${Math.round(excellentCount/scenarios.length*100)}%)`);
  console.log(`  👍 Good: ${goodCount} (${Math.round(goodCount/scenarios.length*100)}%)`);
  console.log(`  ⚠️ Generic: ${genericCount} (${Math.round(genericCount/scenarios.length*100)}%)`);
  console.log(`  💀 Poor: ${scenarios.length - excellentCount - goodCount - genericCount}`);

  // Step 4: Show ALL prompts for review
  console.log(`\n\n📝 ALL GENERATED PROMPTS:\n`);
  console.log('='.repeat(80));

  for (const result of results) {
    const statusIcon = result.tool_correct ? '✅' : '❌';
    const qualityIcon = result.prompt_quality === 'excellent' ? '🌟' :
                       result.prompt_quality === 'good' ? '👍' :
                       result.prompt_quality === 'generic' ? '⚠️' : '💀';

    console.log(`\n${statusIcon} ${qualityIcon} Scenario ${result.scenario_id}: ${result.scenario_name}`);
    console.log(`\nProspect said: "${result.transcript}"`);
    console.log(`\nExpected Tool: ${result.expected_tool} (${result.expected_tool_name})`);
    console.log(`Got Tool: ${result.actual_tool || 'N/A'} (${result.actual_tool_name || 'N/A'})`);
    console.log(`\n💬 Generated Coaching Prompt:\n"${result.actual_say_this || 'NO PROMPT GENERATED'}"`);
    console.log(`\nQuality: ${result.prompt_quality} | Time: ${result.response_time_ms}ms`);
    console.log('-'.repeat(80));
  }

  // Step 5: Show summary of failures
  const failures = results.filter(r => !r.tool_correct || r.prompt_quality === 'generic' || r.prompt_quality === 'poor');

  if (failures.length > 0) {
    console.log(`\n\n⚠️  ATTENTION: ${failures.length} scenarios need improvement\n`);
  }

  // Step 6: Save detailed results
  const outputPath = path.join(__dirname, `test-results-${instructionFile.replace('.md', '')}.json`);
  fs.writeFileSync(outputPath, JSON.stringify({ results, summary: {
    total: scenarios.length,
    correct: correctCount,
    excellent: excellentCount,
    good: goodCount,
    generic: genericCount,
    poor: scenarios.length - excellentCount - goodCount - genericCount
  }}, null, 2));

  console.log(`\\n💾 Detailed results saved to: ${outputPath}`);
  console.log('\\n' + '='.repeat(80) + '\\n');
}

// Main
const instructionFile = process.argv[2] || 'direct-coaching-prompt.md';
runTest(instructionFile).catch(console.error);
