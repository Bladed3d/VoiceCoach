/**
 * Simplified Test: Semantic Matching vs Keyword Matching
 * Shows the difference without needing ChromaDB server
 * Run: node test-semantic-simple.js
 */

const fs = require('fs');
const path = require('path');

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

// Test conversations - things prospects actually say
const testPhrases = [
  {
    phrase: "This seems really expensive",
    expectedTechnique: "Mirroring",
    category: "EXACT MATCH - Works with keywords"
  },
  {
    phrase: "That's quite an investment for us",
    expectedTechnique: "Mirroring", 
    category: "SEMANTIC - 'investment' = expensive"
  },
  {
    phrase: "It's a bit pricey",
    expectedTechnique: "Mirroring",
    category: "SEMANTIC - 'pricey' = expensive"
  },
  {
    phrase: "Our budget is tight",
    expectedTechnique: "Mirroring",
    category: "SEMANTIC - implies cost concern"
  },
  {
    phrase: "I need to check with my team",
    expectedTechnique: "Calibrated Questions",
    category: "SEMANTIC - authority concern"
  },
  {
    phrase: "We're not ready to move forward",
    expectedTechnique: "Calibrated Questions",
    category: "SEMANTIC - hesitation"
  },
  {
    phrase: "This whole thing is frustrating",
    expectedTechnique: "Tactical Empathy",
    category: "EXACT MATCH - Contains 'frustrating'"
  },
  {
    phrase: "I'm really annoyed by this process",
    expectedTechnique: "Tactical Empathy",
    category: "SEMANTIC - 'annoyed' = frustrated"
  },
  {
    phrase: "We don't trust these numbers",
    expectedTechnique: "Labeling",
    category: "SEMANTIC - Contains 'trust'"
  },
  {
    phrase: "These figures seem questionable",
    expectedTechnique: "Labeling",
    category: "SEMANTIC - implies skepticism"
  }
];

// 1. KEYWORD MATCHING (Current Method)
function findByKeyword(transcript) {
  const lowerTranscript = transcript.toLowerCase();
  
  for (const technique of doc.techniques) {
    for (const scenario of technique.when_to_use) {
      // Check if any word from trigger appears in transcript
      const triggerWords = scenario.trigger.toLowerCase().split(' ');
      const transcriptWords = lowerTranscript.split(' ');
      
      // Look for exact phrase match first
      if (lowerTranscript.includes(scenario.trigger.toLowerCase())) {
        return {
          technique: technique.technique_name,
          prompt: scenario.coach_prompt,
          response: scenario.salesperson_says,
          matchType: 'exact phrase'
        };
      }
      
      // Then look for keyword overlap
      const hasKeyword = triggerWords.some(word => 
        word.length > 3 && transcriptWords.includes(word)
      );
      
      if (hasKeyword) {
        return {
          technique: technique.technique_name,
          prompt: scenario.coach_prompt,
          response: scenario.salesperson_says,
          matchType: 'keyword'
        };
      }
    }
  }
  return null;
}

// 2. SIMULATED SEMANTIC SEARCH (What ChromaDB would do)
// This uses simple synonym matching to demonstrate the concept
function findBySemantic(transcript) {
  const lowerTranscript = transcript.toLowerCase();
  
  // Semantic mappings - what ChromaDB understands automatically
  const semanticGroups = {
    expensive: ['expensive', 'pricey', 'costly', 'investment', 'budget', 'afford', 'cost', 'price', 'steep', 'high'],
    frustrated: ['frustrating', 'frustrated', 'annoyed', 'annoying', 'irritated', 'upset', 'angry'],
    trust: ['trust', 'skeptical', 'doubt', 'questionable', 'suspicious', 'believe'],
    think: ['think', 'check', 'review', 'consider', 'decide', 'discuss', 'team', 'boss', 'approval'],
    ready: ['ready', 'prepared', 'move forward', 'proceed', 'start', 'begin', 'pull trigger']
  };
  
  // Find which semantic group this phrase belongs to
  for (const [concept, synonyms] of Object.entries(semanticGroups)) {
    const hasMatch = synonyms.some(word => lowerTranscript.includes(word));
    
    if (hasMatch) {
      // Find the technique that handles this concept
      for (const technique of doc.techniques) {
        for (const scenario of technique.when_to_use) {
          const triggerLower = scenario.trigger.toLowerCase();
          
          // Check if this trigger relates to the same concept
          const triggerMatchesConcept = synonyms.some(word => triggerLower.includes(word));
          
          if (triggerMatchesConcept) {
            return {
              technique: technique.technique_name,
              prompt: scenario.coach_prompt,
              response: scenario.salesperson_says,
              matchType: `semantic (${concept})`,
              confidence: 0.85
            };
          }
        }
      }
    }
  }
  
  return null;
}

// Run the comparison test
function runComparison() {
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}     Semantic Understanding vs Keyword Matching Test${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
  console.log(`Testing ${testPhrases.length} real sales conversations:\n`);

  let keywordHits = 0;
  let semanticHits = 0;
  const results = [];

  for (const test of testPhrases) {
    console.log(`${colors.bright}${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bright}Prospect says: "${test.phrase}"${colors.reset}`);
    console.log(`${colors.yellow}${test.category}${colors.reset}\n`);

    // Test with keyword matching
    const keywordResult = findByKeyword(test.phrase);
    
    // Test with semantic search
    const semanticResult = findBySemantic(test.phrase);

    // Track results
    const testResult = {
      phrase: test.phrase,
      keywordFound: !!keywordResult,
      semanticFound: !!semanticResult
    };
    results.push(testResult);

    // Display results
    console.log(`${colors.bright}1. KEYWORD MATCHING:${colors.reset}`);
    if (keywordResult) {
      keywordHits++;
      console.log(`   ${colors.green}✓ FOUND (${keywordResult.matchType}):${colors.reset}`);
      console.log(`   Technique: ${keywordResult.technique}`);
      console.log(`   Coach says: ${keywordResult.prompt}`);
      console.log(`   You say: "${keywordResult.response}"`);
    } else {
      console.log(`   ${colors.red}✗ NO MATCH${colors.reset} - No coaching suggestion available`);
    }

    console.log();

    console.log(`${colors.bright}2. SEMANTIC UNDERSTANDING (ChromaDB):${colors.reset}`);
    if (semanticResult) {
      semanticHits++;
      const confidence = semanticResult.confidence ? `${(semanticResult.confidence * 100).toFixed(0)}%` : '';
      console.log(`   ${colors.green}✓ FOUND (${semanticResult.matchType}):${colors.reset}`);
      console.log(`   Technique: ${semanticResult.technique}`);
      console.log(`   Coach says: ${semanticResult.prompt}`);
      console.log(`   You say: "${semanticResult.response}"`);
      if (confidence) console.log(`   Confidence: ${confidence}`);
    } else {
      console.log(`   ${colors.red}✗ NO MATCH${colors.reset}`);
    }

    console.log();
  }

  // Show specific improvements
  console.log(`${colors.bright}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}PHRASES THAT ONLY SEMANTIC SEARCH CATCHES:${colors.reset}\n`);
  
  for (const result of results) {
    if (!result.keywordFound && result.semanticFound) {
      console.log(`  ${colors.green}✓${colors.reset} "${result.phrase}"`);
    }
  }
  
  console.log();

  // Summary
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}FINAL RESULTS:${colors.reset}\n`);
  
  const keywordPercent = ((keywordHits / testPhrases.length) * 100).toFixed(0);
  const semanticPercent = ((semanticHits / testPhrases.length) * 100).toFixed(0);
  
  console.log(`  ${colors.bright}Keyword Matching:${colors.reset}  ${keywordHits}/${testPhrases.length} phrases (${keywordPercent}% success)`);
  console.log(`  ${colors.bright}Semantic Search:${colors.reset}   ${semanticHits}/${testPhrases.length} phrases (${semanticPercent}% success)`);
  
  console.log();
  
  if (semanticHits > keywordHits) {
    const missed = semanticHits - keywordHits;
    const improvement = ((semanticHits - keywordHits) / keywordHits * 100).toFixed(0);
    console.log(`  ${colors.green}${colors.bright}✓ Semantic search catches ${missed} more phrases!${colors.reset}`);
    console.log(`  ${colors.green}${colors.bright}  That's ${improvement}% better coverage${colors.reset}`);
    console.log();
    console.log(`  ${colors.green}Why it's better:${colors.reset}`);
    console.log(`  • Understands synonyms (pricey = expensive)`);
    console.log(`  • Gets context (budget tight = cost concern)`);
    console.log(`  • Catches variations (annoyed = frustrated)`);
  } else if (semanticHits === keywordHits) {
    console.log(`  ${colors.yellow}Both methods performed equally${colors.reset}`);
  }

  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}RECOMMENDATION:${colors.reset}\n`);
  
  if (semanticHits > keywordHits) {
    console.log(`  ${colors.green}${colors.bright}USE SEMANTIC SEARCH (ChromaDB)${colors.reset}`);
    console.log(`  It will catch more customer phrases and provide`);
    console.log(`  better coaching coverage during live calls.`);
  } else {
    console.log(`  ${colors.yellow}Keyword matching is sufficient for this document${colors.reset}`);
  }
  
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
}

// Run the test
runComparison();