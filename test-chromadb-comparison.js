/**
 * Test Script: ChromaDB Semantic Search vs Keyword Matching
 * Compares how each method handles real sales conversations
 * Run: node test-chromadb-comparison.js
 */

const fs = require('fs');
const path = require('path');
const { ChromaClient } = require('chromadb');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Load your processed document
const docPath = path.join(__dirname, 'rag', 'NeverSplit_Processed_2025-01-02_12-45-00.json');
const doc = JSON.parse(fs.readFileSync(docPath, 'utf-8'));

// Test conversations - things prospects actually say that don't match keywords exactly
const testPhrases = [
  {
    phrase: "This seems really expensive",
    category: "EXACT MATCH - Should work with both"
  },
  {
    phrase: "That's quite an investment for us",
    category: "SEMANTIC - 'investment' means expensive"
  },
  {
    phrase: "It's a bit pricey don't you think?",
    category: "SEMANTIC - 'pricey' means expensive"
  },
  {
    phrase: "Our budget is pretty tight",
    category: "SEMANTIC - implies cost concern"
  },
  {
    phrase: "I need to run this by my boss",
    category: "SEMANTIC - authority concern like 'think about it'"
  },
  {
    phrase: "We're not ready to pull the trigger",
    category: "SEMANTIC - hesitation like 'need more time'"
  },
  {
    phrase: "What's the damage?",
    category: "SEMANTIC - slang for price"
  },
  {
    phrase: "This could be a stretch for us",
    category: "SEMANTIC - budget concern"
  }
];

// 1. KEYWORD MATCHING (Current Method)
function findByKeyword(transcript) {
  for (const technique of doc.techniques) {
    for (const scenario of technique.when_to_use) {
      // Simple keyword matching - check if trigger phrase is in transcript
      if (transcript.toLowerCase().includes(scenario.trigger.toLowerCase())) {
        return {
          technique: technique.technique_name,
          prompt: scenario.coach_prompt,
          response: scenario.salesperson_says
        };
      }
    }
  }
  return null;
}

// 2. CHROMADB SEMANTIC SEARCH (Proposed Method)
async function setupChromaDB() {
  console.log(`${colors.yellow}Setting up ChromaDB for semantic search...${colors.reset}\n`);
  
  const client = new ChromaClient();
  
  // Create or get collection
  let collection;
  try {
    collection = await client.createCollection({
      name: "voicecoach_techniques",
      metadata: { "hnsw:space": "cosine" }
    });
  } catch (e) {
    // Collection exists, delete and recreate for clean test
    await client.deleteCollection({ name: "voicecoach_techniques" });
    collection = await client.createCollection({
      name: "voicecoach_techniques",
      metadata: { "hnsw:space": "cosine" }
    });
  }

  // Prepare data for ChromaDB
  const documents = [];
  const metadatas = [];
  const ids = [];
  
  let idCounter = 0;
  for (const technique of doc.techniques) {
    for (const scenario of technique.when_to_use) {
      // Create document combining trigger and what prospect says
      // This helps ChromaDB understand context better
      const document = `${scenario.trigger}. ${scenario.prospect_says}`;
      
      documents.push(document);
      metadatas.push({
        technique: technique.technique_name,
        coach_prompt: scenario.coach_prompt,
        salesperson_says: scenario.salesperson_says,
        trigger: scenario.trigger
      });
      ids.push(`tech_${idCounter++}`);
    }
  }

  // Add to ChromaDB
  await collection.add({
    documents: documents,
    metadatas: metadatas,
    ids: ids
  });

  console.log(`${colors.green}✓ Loaded ${documents.length} coaching scenarios into ChromaDB${colors.reset}\n`);
  
  return collection;
}

async function findBySemantic(collection, transcript) {
  const results = await collection.query({
    queryTexts: [transcript],
    nResults: 1
  });

  if (results.metadatas[0] && results.metadatas[0].length > 0) {
    const match = results.metadatas[0][0];
    return {
      technique: match.technique,
      prompt: match.coach_prompt,
      response: match.salesperson_says,
      distance: results.distances[0][0] // How similar (0 = perfect match, 1 = different)
    };
  }
  return null;
}

// Run the comparison test
async function runComparison() {
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}  ChromaDB Semantic Search vs Keyword Matching Comparison Test${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  // Setup ChromaDB
  const collection = await setupChromaDB();

  console.log(`${colors.bright}Testing ${testPhrases.length} real sales phrases:${colors.reset}\n`);

  let keywordHits = 0;
  let semanticHits = 0;

  for (const test of testPhrases) {
    console.log(`${colors.bright}${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bright}Prospect says: "${test.phrase}"${colors.reset}`);
    console.log(`${colors.yellow}(${test.category})${colors.reset}\n`);

    // Test with keyword matching
    const keywordResult = findByKeyword(test.phrase);
    
    // Test with semantic search
    const semanticResult = await findBySemantic(collection, test.phrase);

    // Display results side by side
    console.log(`${colors.bright}1. KEYWORD MATCHING:${colors.reset}`);
    if (keywordResult) {
      keywordHits++;
      console.log(`   ${colors.green}✓ FOUND:${colors.reset} ${keywordResult.technique}`);
      console.log(`   ${colors.green}Coach:${colors.reset} ${keywordResult.prompt}`);
      console.log(`   ${colors.green}Say:${colors.reset} "${keywordResult.response}"`);
    } else {
      console.log(`   ${colors.red}✗ NO MATCH FOUND${colors.reset} - No coaching available`);
    }

    console.log();

    console.log(`${colors.bright}2. CHROMADB SEMANTIC:${colors.reset}`);
    if (semanticResult) {
      semanticHits++;
      const confidence = ((1 - semanticResult.distance) * 100).toFixed(1);
      console.log(`   ${colors.green}✓ FOUND:${colors.reset} ${semanticResult.technique} (${confidence}% confidence)`);
      console.log(`   ${colors.green}Coach:${colors.reset} ${semanticResult.prompt}`);
      console.log(`   ${colors.green}Say:${colors.reset} "${semanticResult.response}"`);
    } else {
      console.log(`   ${colors.red}✗ NO MATCH FOUND${colors.reset}`);
    }

    console.log();
  }

  // Summary
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}RESULTS SUMMARY:${colors.reset}\n`);
  
  const keywordPercent = ((keywordHits / testPhrases.length) * 100).toFixed(0);
  const semanticPercent = ((semanticHits / testPhrases.length) * 100).toFixed(0);
  
  console.log(`${colors.bright}Keyword Matching:${colors.reset}  ${keywordHits}/${testPhrases.length} hits (${keywordPercent}%)`);
  console.log(`${colors.bright}ChromaDB Semantic:${colors.reset} ${semanticHits}/${testPhrases.length} hits (${semanticPercent}%)`);
  
  console.log();
  
  if (semanticHits > keywordHits) {
    const improvement = ((semanticHits - keywordHits) / keywordHits * 100).toFixed(0);
    console.log(`${colors.green}${colors.bright}✓ ChromaDB provides ${improvement}% better coverage!${colors.reset}`);
    console.log(`${colors.green}  It understands meaning, not just exact words.${colors.reset}`);
  } else if (semanticHits === keywordHits) {
    console.log(`${colors.yellow}Both methods performed equally on this test set.${colors.reset}`);
  }

  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  // Cleanup
  await client.deleteCollection({ name: "voicecoach_techniques" });
}

// Check if ChromaDB is installed
try {
  require.resolve('chromadb');
  runComparison().catch(console.error);
} catch(e) {
  console.log(`${colors.red}ChromaDB not installed. Installing now...${colors.reset}\n`);
  console.log('Run: npm install chromadb\n');
  console.log('Then run this test again: node test-chromadb-comparison.js');
  
  // Still show keyword matching results
  console.log(`\n${colors.yellow}Showing keyword matching results only:${colors.reset}\n`);
  
  for (const test of testPhrases) {
    const result = findByKeyword(test.phrase);
    console.log(`"${test.phrase}"`);
    console.log(`  ${result ? '✓ Found: ' + result.prompt : '✗ No match'}\n`);
  }
}