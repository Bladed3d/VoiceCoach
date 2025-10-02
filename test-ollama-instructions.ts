/**
 * Ollama Instruction File Tester
 * Tests instruction files against 39 realistic sales scenarios
 * Run with: npx tsx test-ollama-instructions.ts <instruction-file-path>
 */

import fs from 'fs';
import path from 'path';

interface TestScenario {
  id: number;
  tool_id: number;
  tool_name: string;
  stage: number;
  sentiment: string;
  prospect_statement: string;
  expected_tool: number;
  reasoning: string;
  expected_response: string;
  context: string;
  previous_response?: string;
  last_tool_used?: number;
}

interface OllamaResponse {
  tool?: string;
  tool_id?: number;
  say_this?: string;
  why?: string;
  reason?: string;
  confidence?: string;
}

interface TestResult {
  scenario_id: number;
  prospect_statement: string;
  expected_tool: number;
  expected_tool_name: string;
  actual_tool?: number;
  actual_tool_name?: string;
  correct: boolean;
  response_time_ms: number;
  valid_json: boolean;
  has_required_fields: boolean;
  ollama_response: any;
  error?: string;
}

// Load scenarios
const scenariosPath = path.join(__dirname, 'src/tests/test-scenarios-39-comprehensive.json');
const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8'));
const scenarios: TestScenario[] = scenariosData.scenarios;

// Load RAG tools
const ragPath = path.join(__dirname, 'rag/13ToolsRAG-01-condensed.json');
const ragTools = JSON.parse(fs.readFileSync(ragPath, 'utf-8'));

// Tool ID to name mapping
const toolMapping = ragTools.reduce((acc: any, tool: any) => {
  acc[tool.id] = tool.name;
  return acc;
}, {});

// Tool weights (based on oar/paddle metaphor - 1=gentle, 10=frantic)
const TOOL_WEIGHTS: Record<number, number> = {
  1: 2,   // Mirroring
  2: 4,   // Empathy Response
  3: 5,   // Empathy Questions
  4: 3,   // Summarizing
  5: 6,   // Labeling
  6: 4,   // Calibrated Questions
  7: 7,   // Negative Assumption (Accusation Audit)
  8: 3,   // Dynamic Silence
  9: 8,   // Black Swan
  10: 5,  // Buy-In
  11: 6,  // DJ Voice
  12: 7,  // Truth/No Means Yes
  13: 9   // Take Away
};

async function callOllama(prompt: string, model: string = 'qwen2.5:14b-instruct-q4_K_M'): Promise<any> {
  const startTime = Date.now();

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 200
      }
    })
  });

  const responseTime = Date.now() - startTime;

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    response: data.response,
    response_time: responseTime
  };
}

function detectObjections(transcript: string): string[] {
  const lower = transcript.toLowerCase();
  const objections: string[] = [];

  if (lower.includes('expensive') || lower.includes('cost') || lower.includes('budget')) {
    objections.push('price');
  }
  if (lower.includes('think about it') || lower.includes('not sure')) {
    objections.push('hesitation');
  }
  if (lower.includes('boss') || lower.includes('team') || lower.includes('approval')) {
    objections.push('authority');
  }

  return objections;
}

function detectTopics(transcript: string): string[] {
  const topics: string[] = [];
  const lower = transcript.toLowerCase();

  if (lower.includes('price') || lower.includes('cost')) topics.push('pricing');
  if (lower.includes('feature') || lower.includes('capability')) topics.push('features');
  if (lower.includes('support') || lower.includes('help')) topics.push('support');
  if (lower.includes('implement') || lower.includes('setup')) topics.push('implementation');
  if (lower.includes('timeline') || lower.includes('when')) topics.push('timeline');

  return topics;
}

function calculateEngagementDelta(previous: string, current: string): number {
  if (!previous) return 0;

  const prevLength = previous.split(' ').length;
  const currLength = current.split(' ').length;

  return currLength - prevLength;
}

function calculateTrajectoryScore(toolWeight: number, prevResponse: string, currResponse: string): number {
  if (!prevResponse) return 0;

  const prevLength = prevResponse.split(' ').length;
  const currLength = currResponse.split(' ').length;

  // Grok's formula: trajectory = (tool_weight * -0.5) + (length_delta / avg_length) + question_delta
  const lengthDelta = currLength - prevLength;
  const avgLength = (prevLength + currLength) / 2;
  const normalizedLengthDelta = avgLength > 0 ? lengthDelta / avgLength : 0;

  const prevQuestions = (prevResponse.match(/\?/g) || []).length;
  const currQuestions = (currResponse.match(/\?/g) || []).length;
  const questionDelta = currQuestions - prevQuestions;

  const trajectoryScore = (toolWeight * -0.5) + normalizedLengthDelta + questionDelta;

  return Math.round(trajectoryScore * 100) / 100; // Round to 2 decimals
}

function buildPrompt(instructionTemplate: string, scenario: TestScenario): string {
  const objections = detectObjections(scenario.prospect_statement);
  const topics = detectTopics(scenario.prospect_statement);

  // Calculate trajectory data using Grok's formula
  const lastToolUsed = scenario.last_tool_used || 0;
  const toolWeight = TOOL_WEIGHTS[lastToolUsed] || 0;
  const previousResponse = scenario.previous_response || '';
  const engagementDelta = calculateEngagementDelta(previousResponse, scenario.prospect_statement);
  const trajectoryScore = calculateTrajectoryScore(toolWeight, previousResponse, scenario.prospect_statement);

  // Determine trajectory trend based on score
  let trajectoryTrend = 'stable';
  if (trajectoryScore > 0.3) trajectoryTrend = 'improving';
  else if (trajectoryScore < -0.3) trajectoryTrend = 'declining';

  return instructionTemplate
    .replace(/\{\{TOOLS_JSON\}\}/g, JSON.stringify(ragTools, null, 2))
    .replace(/\{\{TRANSCRIPT\}\}/g, scenario.prospect_statement)
    .replace(/\{\{STAGE\}\}/g, String(scenario.stage))
    .replace(/\{\{SENTIMENT\}\}/g, scenario.sentiment)
    .replace(/\{\{TOPICS\}\}/g, topics.join(', ') || 'none detected')
    .replace(/\{\{OBJECTIONS\}\}/g, objections.join(', ') || 'none detected')
    .replace(/\{\{LAST_TOOL_USED\}\}/g, String(lastToolUsed))
    .replace(/\{\{TOOL_WEIGHT\}\}/g, String(toolWeight))
    .replace(/\{\{ENGAGEMENT_DELTA\}\}/g, String(engagementDelta))
    .replace(/\{\{TRAJECTORY_SCORE\}\}/g, String(trajectoryScore))
    .replace(/\{\{TRAJECTORY\}\}/g, trajectoryTrend);
}

function parseOllamaResponse(responseText: string): { parsed: any; valid: boolean } {
  try {
    // Try to extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { parsed: null, valid: false };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return { parsed, valid: true };
  } catch (e) {
    return { parsed: null, valid: false };
  }
}

function extractToolId(response: OllamaResponse): number | undefined {
  // Check for tool_id field
  if (response.tool_id) {
    return response.tool_id;
  }

  // Check for tool name and map to ID
  if (response.tool) {
    const toolEntry = ragTools.find((t: any) =>
      t.name.toLowerCase() === response.tool?.toLowerCase()
    );
    return toolEntry?.id;
  }

  return undefined;
}

function hasRequiredFields(response: OllamaResponse): boolean {
  const hasToolIdentifier = !!(response.tool || response.tool_id);
  const hasConfidence = !!response.confidence;
  const hasReason = !!(response.reason || response.why);

  return hasToolIdentifier && hasConfidence && hasReason;
}

async function runTest(instructionFile: string, outputFile?: string): Promise<void> {
  console.log('\n🧪 Ollama Instruction File Tester\n');
  console.log('='.repeat(80));

  // Load instruction file
  const instructionPath = path.join(__dirname, instructionFile);
  console.log(`\n📂 Loading instruction file: ${instructionFile}`);

  let instructionTemplate: string;
  try {
    const fileContent = fs.readFileSync(instructionPath, 'utf-8');

    // Extract from code block if present
    const codeBlockMatch = fileContent.match(/```prompt\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      instructionTemplate = codeBlockMatch[1].trim();
      console.log('✅ Extracted from ```prompt code block');
    } else {
      instructionTemplate = fileContent.trim();
      console.log('✅ Using full file content');
    }
  } catch (e) {
    console.error(`❌ Failed to load instruction file: ${e}`);
    process.exit(1);
  }

  console.log(`📊 Testing ${scenarios.length} scenarios...\n`);

  const results: TestResult[] = [];
  let correctCount = 0;
  let validJsonCount = 0;
  let requiredFieldsCount = 0;

  for (const scenario of scenarios) {
    process.stdout.write(`Testing scenario ${scenario.id}/${scenarios.length}... `);

    const prompt = buildPrompt(instructionTemplate, scenario);

    try {
      const { response, response_time } = await callOllama(prompt);
      const { parsed, valid } = parseOllamaResponse(response);

      const result: TestResult = {
        scenario_id: scenario.id,
        prospect_statement: scenario.prospect_statement,
        expected_tool: scenario.expected_tool,
        expected_tool_name: scenario.tool_name,
        correct: false,
        response_time_ms: response_time,
        valid_json: valid,
        has_required_fields: false,
        ollama_response: parsed || response
      };

      if (valid && parsed) {
        validJsonCount++;

        const actualToolId = extractToolId(parsed);
        result.actual_tool = actualToolId;
        result.actual_tool_name = actualToolId ? toolMapping[actualToolId] : undefined;
        result.has_required_fields = hasRequiredFields(parsed);

        if (result.has_required_fields) {
          requiredFieldsCount++;
        }

        if (actualToolId === scenario.expected_tool) {
          result.correct = true;
          correctCount++;
          console.log(`✅ ${response_time}ms`);
        } else {
          console.log(`❌ Got tool ${actualToolId} (${result.actual_tool_name}), expected ${scenario.expected_tool} (${scenario.tool_name})`);
        }
      } else {
        result.error = 'Invalid JSON response';
        console.log(`❌ Invalid JSON`);
      }

      results.push(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        scenario_id: scenario.id,
        prospect_statement: scenario.prospect_statement,
        expected_tool: scenario.expected_tool,
        expected_tool_name: scenario.tool_name,
        correct: false,
        response_time_ms: 0,
        valid_json: false,
        has_required_fields: false,
        ollama_response: null,
        error: errorMessage
      });
      console.log(`❌ Error: ${errorMessage}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Test Results Summary\n');

  const accuracy = (correctCount / scenarios.length * 100).toFixed(1);
  const jsonRate = (validJsonCount / scenarios.length * 100).toFixed(1);
  const fieldsRate = (requiredFieldsCount / scenarios.length * 100).toFixed(1);
  const avgTime = results.reduce((sum, r) => sum + r.response_time_ms, 0) / results.length;

  console.log(`✅ Correct Tool Selection: ${correctCount}/${scenarios.length} (${accuracy}%)`);
  console.log(`📝 Valid JSON Responses: ${validJsonCount}/${scenarios.length} (${jsonRate}%)`);
  console.log(`📋 Required Fields Present: ${requiredFieldsCount}/${scenarios.length} (${fieldsRate}%)`);
  console.log(`⏱️  Average Response Time: ${avgTime.toFixed(0)}ms`);

  // Failed scenarios
  const failures = results.filter(r => !r.correct);
  if (failures.length > 0) {
    console.log(`\n❌ Failed Scenarios (${failures.length}):\n`);
    failures.forEach(f => {
      console.log(`  ${f.scenario_id}. "${f.prospect_statement.substring(0, 60)}..."`);
      console.log(`     Expected: ${f.expected_tool_name} (#${f.expected_tool})`);
      console.log(`     Got: ${f.actual_tool_name || 'N/A'} (#${f.actual_tool || 'N/A'})`);
      if (f.error) {
        console.log(`     Error: ${f.error}`);
      }
      console.log('');
    });
  }

  // Save results to file
  const outputPath = outputFile || `test-results-${Date.now()}.json`;
  fs.writeFileSync(outputPath, JSON.stringify({
    instruction_file: instructionFile,
    timestamp: new Date().toISOString(),
    summary: {
      total_scenarios: scenarios.length,
      correct: correctCount,
      accuracy_percent: parseFloat(accuracy),
      valid_json: validJsonCount,
      json_rate_percent: parseFloat(jsonRate),
      required_fields: requiredFieldsCount,
      fields_rate_percent: parseFloat(fieldsRate),
      avg_response_time_ms: Math.round(avgTime)
    },
    results: results
  }, null, 2));

  console.log(`\n💾 Results saved to: ${outputPath}\n`);
}

// CLI
const instructionFile = process.argv[2];
const outputFile = process.argv[3];

if (!instructionFile) {
  console.error('Usage: npx tsx test-ollama-instructions.ts <instruction-file> [output-file]');
  console.error('Example: npx tsx test-ollama-instructions.ts ollama-prompts/direct-coaching-prompt.md');
  process.exit(1);
}

runTest(instructionFile, outputFile).catch(console.error);
