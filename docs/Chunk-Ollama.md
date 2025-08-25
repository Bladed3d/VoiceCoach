# Intelligent Document Chunking for Ollama Context Limits

## The Problem: Context Window Truncation

When processing large documents with Ollama, you may encounter this warning:
```
time=2025-08-15T21:24:29.824-06:00 level=WARN source=runner.go:128 msg="truncating input prompt" limit=4096 prompt=37114 keep=4 new=4096
```

**Translation:** Your 37,114-token document was cut down to only 4,096 tokens - losing 89% of the content!

## Why This Matters

### Impact on Analysis Quality
- **Incomplete processing** - AI only sees ~11% of your document
- **Missing key concepts** - Important sections get truncated
- **Poor results** - Analysis based on fragment, not full content
- **Wasted processing** - Time spent on incomplete analysis

### Real-World Example: Chris Voss Document
- **Original:** 2000-line negotiation methodology
- **Truncated:** Only first ~400 lines processed
- **Missing:** 7 out of 8 key principles never analyzed
- **Result:** Incomplete coaching system

## The Solution: Intelligent Chunking Strategy

### Phase 1: Smart Document Segmentation

Instead of arbitrary splits, break documents at natural boundaries:

```javascript
// Bad: Arbitrary chunking
const chunks = document.split(document.length / 4);

// Good: Intelligent boundaries  
const chunks = [
  extractSection(document, "Core Principles"),
  extractSection(document, "Advanced Techniques"),
  extractSection(document, "Application Examples"),
  extractSection(document, "Implementation Guide")
];
```

### Phase 2: Context-Preserving Processing

Each chunk maintains awareness of the broader document:

```javascript
const processChunk = async (chunk, chunkIndex, previousResults) => {
  const contextPrompt = `
    You are analyzing Part ${chunkIndex + 1} of a comprehensive methodology.
    Previous analysis revealed: ${previousResults.summary}
    
    Now analyze this section: ${chunk}
    
    Ensure your analysis:
    1. Connects to previous findings
    2. Maintains thematic consistency  
    3. Builds upon established concepts
  `;
  
  return await ollama.generate(contextPrompt);
};
```

### Phase 3: Synthesis Integration

Final pass combines all chunks into unified analysis:

```javascript
const synthesizeResults = async (allChunkResults) => {
  const synthesisPrompt = `
    Combine these individual analyses into a unified, coherent framework:
    ${allChunkResults.join('\n\n---\n\n')}
    
    Create a synthesis that:
    1. Eliminates redundancy
    2. Highlights interconnections
    3. Maintains comprehensive coverage
    4. Produces actionable insights
  `;
  
  return await ollama.generate(synthesisPrompt);
};
```

## Implementation Strategies

### Strategy A: Sequential Processing (Recommended)
- Process chunks in logical order
- Pass previous results as context to next chunk
- Build comprehensive understanding incrementally

### Strategy B: Parallel Processing + Synthesis
- Process all chunks simultaneously
- Combine results in final synthesis pass
- Faster but may miss inter-chunk connections

### Strategy C: Overlapping Windows
- Create chunks with 200-300 token overlap
- Ensures context continuity between sections
- Higher processing cost but maximum accuracy

## Practical Implementation

### Step 1: Document Analysis
```javascript
const analyzeDocumentStructure = (document) => {
  // Identify natural breakpoints
  const sections = document.match(/^#{1,3}\s+.*$/gm); // Headers
  const pageBreaks = document.split('\n\n\n'); // Paragraph groups
  const conceptBoundaries = identifyTopicTransitions(document);
  
  return createIntelligentChunks(sections, pageBreaks, conceptBoundaries);
};
```

### Step 2: Chunk Processing
```javascript
const processDocumentInChunks = async (document, analysisType) => {
  const chunks = analyzeDocumentStructure(document);
  const results = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const previousContext = results.length > 0 ? 
      summarizeResults(results) : null;
      
    const chunkResult = await processChunk(
      chunks[i], 
      i, 
      previousContext,
      analysisType
    );
    
    results.push(chunkResult);
  }
  
  return await synthesizeResults(results, analysisType);
};
```

### Step 3: Use Case Applications
```javascript
const createUseCases = async (principlesAnalysis, document) => {
  const chunks = analyzeDocumentStructure(document);
  const useCaseResults = [];
  
  for (const chunk of chunks) {
    const chunkUseCases = await generateUseCases(
      chunk,
      principlesAnalysis, // Full context from previous analysis
      useCaseResults      // Cumulative use cases
    );
    
    useCaseResults.push(chunkUseCases);
  }
  
  return await synthesizeUseCases(useCaseResults);
};
```

## Benefits of This Approach

### Quality Improvements
- **Complete coverage** - No content lost to truncation
- **Contextual awareness** - Maintains document coherence
- **Comprehensive analysis** - All principles and concepts included
- **Better synthesis** - Unified understanding across full document

### Performance Benefits
- **Reliable processing** - No truncation warnings
- **Efficient resource use** - Optimal token utilization
- **Scalable approach** - Works with documents of any size
- **Consistent results** - Reproducible analysis quality

### Use Case Enhancement
- **Complete methodology coverage** - All 8 principles included
- **Interconnected examples** - Use cases reference full framework
- **Practical application** - Real-world scenarios from entire document
- **Actionable insights** - Comprehensive guidance for implementation

## Best Practices

### 1. Chunk Size Optimization
- **Target:** 2000-3000 tokens per chunk
- **Buffer:** Leave 1000 tokens for context/instructions
- **Validation:** Test with sample content before full processing

### 2. Context Preservation
- **Summary method:** Include 200-300 token summary of previous chunks
- **Key concepts:** Maintain list of identified principles/themes
- **Connection points:** Explicitly link new content to previous analysis

### 3. Quality Validation
- **Completeness check:** Verify all source content was processed
- **Consistency review:** Ensure coherent analysis across chunks
- **Synthesis validation:** Confirm final result represents full document

## Error Handling

### Common Issues and Solutions
```javascript
// Handle chunk processing failures
const robustChunkProcessing = async (chunk, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await processChunk(chunk);
    } catch (error) {
      if (error.message.includes('context limit')) {
        // Further subdivide problematic chunk
        return await processSubChunks(chunk);
      }
      
      if (attempt === retries) throw error;
      
      // Exponential backoff for retries
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
};
```

## Performance Metrics

### Before Chunking
- **Content processed:** ~11% (4,096 / 37,114 tokens)
- **Analysis quality:** Poor (missing 89% of content)
- **Processing time:** Fast but useless
- **Error rate:** High (truncation warnings)

### After Chunking
- **Content processed:** 100% (all 37,114 tokens)
- **Analysis quality:** Excellent (complete coverage)
- **Processing time:** Longer but comprehensive
- **Error rate:** Zero (no truncation)

## Conclusion

Intelligent document chunking transforms Ollama from a limited tool that can only handle small documents into a powerful system capable of processing comprehensive methodologies while maintaining context and producing high-quality analysis.

This approach is essential for:
- **Large document analysis** (>4000 tokens)
- **Comprehensive methodologies** (multi-chapter books, manuals)
- **Knowledge base creation** (structured learning systems)
- **Real-time coaching systems** (like VoiceCoach)

The investment in chunking infrastructure pays dividends in analysis quality, system reliability, and user satisfaction.

---

**Key Takeaway:** Don't let context limits truncate your AI's potential. Intelligent chunking ensures complete, coherent analysis of any document size.