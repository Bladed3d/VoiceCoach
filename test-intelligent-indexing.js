/**
 * Manual test for intelligent indexing system
 * Run: node test-intelligent-indexing.js
 */

const fs = require('fs');
const path = require('path');

// Load the NeverSplit JSON document
const docPath = path.join(__dirname, 'rag', 'NeverSplit_Predictive_2025-01-03_12-30-00.json');
const ragDocument = JSON.parse(fs.readFileSync(docPath, 'utf-8'));

console.log('\n📚 DOCUMENT LOADED:');
console.log(`- Techniques: ${ragDocument.predictive_techniques?.length || 0}`);
console.log(`- Total paths: ${ragDocument.predictive_techniques?.reduce((sum, t) => sum + (t.conversation_paths?.length || 0), 0)}`);

// Simulate the indexing process
class SimpleIndexer {
  constructor() {
    this.techniqueIndex = new Map();
    this.triggerMap = new Map();
  }
  
  index(document) {
    const techniques = document.predictive_techniques || document.techniques || [];
    let totalPaths = 0;
    
    techniques.forEach(technique => {
      const paths = technique.conversation_paths || [];
      totalPaths += paths.length;
      
      // Extract keywords from triggers
      paths.forEach(path => {
        if (path.trigger) {
          const words = this.extractKeywords(path.trigger.toLowerCase());
          words.forEach(word => {
            if (!this.triggerMap.has(word)) {
              this.triggerMap.set(word, new Set());
            }
            this.triggerMap.get(word).add(technique.technique_name);
          });
        }
      });
      
      this.techniqueIndex.set(technique.technique_name, {
        name: technique.technique_name,
        paths: paths.slice(0, 5) // Keep top 5 paths
      });
    });
    
    return { 
      techniques: this.techniqueIndex.size,
      keywords: this.triggerMap.size,
      totalPaths 
    };
  }
  
  search(transcript) {
    const words = this.extractKeywords(transcript.toLowerCase());
    const scores = new Map();
    
    words.forEach(word => {
      const techniques = this.triggerMap.get(word);
      if (techniques) {
        techniques.forEach(name => {
          scores.set(name, (scores.get(name) || 0) + 1);
        });
      }
    });
    
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }
  
  extractKeywords(text) {
    const stopWords = new Set(['the', 'is', 'it', 'to', 'a', 'and', 'of', 'in']);
    return text
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }
}

// Test the indexer
console.log('\n🔨 INDEXING DOCUMENT...');
const indexer = new SimpleIndexer();
const stats = indexer.index(ragDocument);
console.log('✅ INDEXED:', stats);

// Test searches
const testTranscripts = [
  "This seems really expensive for our budget",
  "I need to think about it and talk to my partner",
  "We're not ready to make a decision yet",
  "The competitor offers a similar solution for less",
  "Can you send me more information?"
];

console.log('\n🔍 TESTING CONTEXT MATCHING:');
testTranscripts.forEach(transcript => {
  console.log(`\nTranscript: "${transcript}"`);
  const results = indexer.search(transcript);
  if (results.length > 0) {
    console.log('Matched techniques:');
    results.forEach(([technique, score]) => {
      console.log(`  - ${technique} (relevance: ${score})`);
    });
  } else {
    console.log('  No matches found');
  }
});

// Simulate prompt building
function buildPrompt(transcript, matches) {
  let prompt = 'RELEVANT TECHNIQUES:\n';
  matches.slice(0, 3).forEach(([name, score]) => {
    prompt += `- ${name} (score: ${score})\n`;
  });
  prompt += `\nTRANSCRIPT: ${transcript}\n`;
  return prompt;
}

console.log('\n📝 SAMPLE PROMPT:');
const sampleTranscript = testTranscripts[0];
const sampleMatches = indexer.search(sampleTranscript);
const samplePrompt = buildPrompt(sampleTranscript, sampleMatches);
console.log(samplePrompt);
console.log(`Prompt size: ${samplePrompt.length} bytes`);

// Compare to full document approach
const fullDocSize = JSON.stringify(ragDocument).length;
console.log('\n📊 SIZE COMPARISON:');
console.log(`Full document: ${(fullDocSize/1024).toFixed(2)}KB`);
console.log(`Smart prompt: ${(samplePrompt.length/1024).toFixed(2)}KB`);
console.log(`Reduction: ${((1 - samplePrompt.length/fullDocSize) * 100).toFixed(1)}%`);