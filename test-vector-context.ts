/**
 * Vector Context Test - ChromaDB-based tool selection
 * Tests conversation-aware tool selection vs keyword matching
 */

import fs from 'fs';
import path from 'path';

interface ConversationTurn {
  turn: number;
  speaker: string;
  statement: string;
  context_to_store?: string;
  expected_tool?: number;
  expected_tool_name?: string;
  vector_context_available?: string;
}

interface Conversation {
  id: number;
  name: string;
  turns: ConversationTurn[];
}

interface VectorContext {
  conversation_id: number;
  turn: number;
  content: string;
  metadata: {
    emotions: string[];
    pain_points: string[];
    objections: string[];
    patterns: string[];
  };
}

interface TestResult {
  conversation_id: number;
  conversation_name: string;
  turn: number;
  prospect_statement: string;
  expected_tool?: number;
  expected_tool_name?: string;
  actual_tool?: number;
  actual_tool_name?: string;
  correct: boolean;
  has_vector_context: boolean;
  vector_context_used?: string;
  response_time_ms: number;
  valid_json: boolean;
  ollama_response: any;
  error?: string;
}

// Load conversations
const conversationsPath = path.join(__dirname, 'src/tests/test-scenarios-conversations.json');
const conversationsData = JSON.parse(fs.readFileSync(conversationsPath, 'utf-8'));
const conversations: Conversation[] = conversationsData.conversations;

// Load RAG tools
const ragPath = path.join(__dirname, 'rag/13ToolsRAG-01-condensed.json');
const ragTools = JSON.parse(fs.readFileSync(ragPath, 'utf-8'));

// Tool mapping
const toolMapping = ragTools.reduce((acc: any, tool: any) => {
  acc[tool.id] = tool.name;
  return acc;
}, {});

// In-memory vector store (simulating ChromaDB)
const vectorStore: Map<number, VectorContext[]> = new Map();

function storeContext(conversationId: number, turn: number, contextStr: string): void {
  if (!vectorStore.has(conversationId)) {
    vectorStore.set(conversationId, []);
  }

  // Parse context string
  const emotions: string[] = [];
  const painPoints: string[] = [];
  const objections: string[] = [];
  const patterns: string[] = [];

  const parts = contextStr.split(',').map(p => p.trim());
  parts.forEach(part => {
    if (part.includes('emotion:')) emotions.push(part.split(':')[1].trim());
    if (part.includes('pain_point:') || part.includes('pain:')) painPoints.push(part.split(':')[1].trim());
    if (part.includes('objection:')) objections.push(part.split(':')[1].trim());
    if (part.includes('pattern:')) patterns.push(part.split(':')[1].trim());
  });

  const context: VectorContext = {
    conversation_id: conversationId,
    turn,
    content: contextStr,
    metadata: { emotions, pain_points: painPoints, objections, patterns }
  };

  vectorStore.get(conversationId)!.push(context);
  console.log(`  📦 Stored context for conversation ${conversationId}, turn ${turn}`);
}

function getVectorContext(conversationId: number, currentTurn: number): string {
  const contexts = vectorStore.get(conversationId) || [];
  const priorContexts = contexts.filter(c => c.turn < currentTurn);

  if (priorContexts.length === 0) {
    return 'No prior context';
  }

  // Aggregate patterns
  const allEmotions = priorContexts.flatMap(c => c.metadata.emotions);
  const allPainPoints = priorContexts.flatMap(c => c.metadata.pain_points);
  const allObjections = priorContexts.flatMap(c => c.metadata.objections);
  const allPatterns = priorContexts.flatMap(c => c.metadata.patterns);

  // Build context summary
  const summary = [];
  if (allEmotions.length > 0) summary.push(`Emotions: ${[...new Set(allEmotions)].join(', ')}`);
  if (allPainPoints.length > 0) summary.push(`Pain Points: ${[...new Set(allPainPoints)].join(', ')}`);
  if (allObjections.length > 0) summary.push(`Objections: ${[...new Set(allObjections)].join(', ')}`);
  if (allPatterns.length > 0) summary.push(`Patterns: ${[...new Set(allPatterns)].join(', ')}`);

  return summary.join(' | ');
}

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

function buildPromptWithVectorContext(turn: ConversationTurn, vectorContext: string): string {
  return `You are a sales coach with conversation context.

AVAILABLE TOOLS:
${JSON.stringify(ragTools, null, 2)}

CONVERSATION CONTEXT (from previous turns):
${vectorContext}

CURRENT PROSPECT STATEMENT:
"${turn.statement}"

Based on the accumulated conversation context and current statement, select the most appropriate tool.

CRITICAL: Return ONLY valid JSON:
{
  "tool": "<tool_name>",
  "confidence": "high|medium|low",
  "reason": "<why this tool based on context>"
}`;
}

function parseOllamaResponse(responseText: string): { parsed: any; valid: boolean } {
  try {
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

function extractToolId(response: any): number | undefined {
  if (response.tool_id) return response.tool_id;
  if (response.tool) {
    const toolEntry = ragTools.find((t: any) =>
      t.name.toLowerCase() === response.tool?.toLowerCase()
    );
    return toolEntry?.id;
  }
  return undefined;
}

async function runVectorTest(outputFile: string = 'vector-test-results.json'): Promise<void> {
  console.log('\n🧪 Vector Context Test - ChromaDB Simulation\n');
  console.log('='.repeat(80));

  const results: TestResult[] = [];
  let correctCount = 0;
  let totalTestTurns = 0;

  for (const conversation of conversations) {
    console.log(`\n📞 Conversation ${conversation.id}: ${conversation.name}`);
    vectorStore.set(conversation.id, []); // Initialize conversation context

    for (const turn of conversation.turns) {
      // Store context from this turn (for future turns)
      if (turn.context_to_store) {
        storeContext(conversation.id, turn.turn, turn.context_to_store);
      }

      // Only test turns where we expect tool selection (prospect turns with expected_tool)
      if (!turn.expected_tool || turn.speaker !== 'prospect') {
        continue;
      }

      totalTestTurns++;
      const vectorContext = getVectorContext(conversation.id, turn.turn);
      const hasVectorContext = turn.vector_context_available !== undefined;

      process.stdout.write(`  Turn ${turn.turn}/${conversation.turns.length}... `);

      const prompt = buildPromptWithVectorContext(turn, vectorContext);

      try {
        const { response, response_time } = await callOllama(prompt);
        const { parsed, valid } = parseOllamaResponse(response);

        const result: TestResult = {
          conversation_id: conversation.id,
          conversation_name: conversation.name,
          turn: turn.turn,
          prospect_statement: turn.statement,
          expected_tool: turn.expected_tool,
          expected_tool_name: turn.expected_tool_name,
          correct: false,
          has_vector_context: hasVectorContext,
          vector_context_used: vectorContext,
          response_time_ms: response_time,
          valid_json: valid,
          ollama_response: parsed || response
        };

        if (valid && parsed) {
          const actualToolId = extractToolId(parsed);
          result.actual_tool = actualToolId;
          result.actual_tool_name = actualToolId ? toolMapping[actualToolId] : undefined;

          if (actualToolId === turn.expected_tool) {
            result.correct = true;
            correctCount++;
            console.log(`✅ ${response_time}ms (context: ${hasVectorContext ? 'yes' : 'no'})`);
          } else {
            console.log(`❌ Got ${result.actual_tool_name} (#${actualToolId}), expected ${turn.expected_tool_name} (#${turn.expected_tool})`);
          }
        } else {
          result.error = 'Invalid JSON response';
          console.log(`❌ Invalid JSON`);
        }

        results.push(result);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          conversation_id: conversation.id,
          conversation_name: conversation.name,
          turn: turn.turn,
          prospect_statement: turn.statement,
          expected_tool: turn.expected_tool,
          expected_tool_name: turn.expected_tool_name,
          correct: false,
          has_vector_context: hasVectorContext,
          response_time_ms: 0,
          valid_json: false,
          ollama_response: null,
          error: errorMessage
        });
        console.log(`❌ Error: ${errorMessage}`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Vector Test Results Summary\n');

  const accuracy = (correctCount / totalTestTurns * 100).toFixed(1);
  const avgTime = results.reduce((sum, r) => sum + r.response_time_ms, 0) / results.length;

  // Context-aware analysis
  const withContext = results.filter(r => r.has_vector_context);
  const withoutContext = results.filter(r => !r.has_vector_context);

  const contextAccuracy = withContext.length > 0
    ? (withContext.filter(r => r.correct).length / withContext.length * 100).toFixed(1)
    : 'N/A';
  const noContextAccuracy = withoutContext.length > 0
    ? (withoutContext.filter(r => r.correct).length / withoutContext.length * 100).toFixed(1)
    : 'N/A';

  console.log(`✅ Overall Accuracy: ${correctCount}/${totalTestTurns} (${accuracy}%)`);
  console.log(`📊 With Vector Context: ${withContext.filter(r => r.correct).length}/${withContext.length} (${contextAccuracy}%)`);
  console.log(`📊 Without Context (early turns): ${withoutContext.filter(r => r.correct).length}/${withoutContext.length} (${noContextAccuracy}%)`);
  console.log(`⏱️  Average Response Time: ${avgTime.toFixed(0)}ms`);

  // Save results
  fs.writeFileSync(outputFile, JSON.stringify({
    test_type: 'vector_context',
    timestamp: new Date().toISOString(),
    summary: {
      total_turns: totalTestTurns,
      correct: correctCount,
      accuracy_percent: parseFloat(accuracy),
      with_context_accuracy: parseFloat(contextAccuracy),
      without_context_accuracy: parseFloat(noContextAccuracy),
      avg_response_time_ms: Math.round(avgTime)
    },
    results: results
  }, null, 2));

  console.log(`\n💾 Results saved to: ${outputFile}\n`);
}

// CLI
const outputFile = process.argv[2] || 'vector-test-results.json';
runVectorTest(outputFile).catch(console.error);
