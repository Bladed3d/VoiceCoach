// Debug helper for knowledge base issues

export function debugKnowledgeBase() {
  console.log('🔍 Knowledge Base Debug Info:');
  
  // Check localStorage
  const stored = localStorage.getItem('voicecoach_knowledge_base');
  if (!stored) {
    console.log('❌ No documents in localStorage');
    return;
  }
  
  try {
    const docs = JSON.parse(stored);
    console.log(`✅ Found ${docs.length} documents in localStorage:`);
    
    docs.forEach((doc: any, index: number) => {
      console.log(`\n📄 Document ${index + 1}:`);
      console.log(`  - Filename: ${doc.filename}`);
      console.log(`  - Content length: ${doc.content?.length || 0} chars`);
      console.log(`  - Chunks: ${doc.chunks?.length || 0}`);
      console.log(`  - Type: ${doc.type || 'unknown'}`);
      console.log(`  - AI Generated: ${doc.isAIGenerated || false}`);
      
      // Search for "calibrated" in this document
      const contentHasCalibrated = doc.content?.toLowerCase().includes('calibrated');
      const chunksWithCalibrated = doc.chunks?.filter((chunk: string) => 
        chunk.toLowerCase().includes('calibrated')
      ).length || 0;
      
      if (contentHasCalibrated || chunksWithCalibrated > 0) {
        console.log(`  ✅ Contains "calibrated": ${chunksWithCalibrated} chunks`);
      }
      
      // Show first chunk as sample
      if (doc.chunks && doc.chunks.length > 0) {
        console.log(`  - First chunk preview: "${doc.chunks[0].substring(0, 100)}..."`);
      }
    });
    
    // Test search functionality
    console.log('\n🔍 Testing search for "calibrated":');
    const results = searchLocalKnowledge('calibrated');
    console.log(`Found ${results.length} results`);
    results.forEach((result: any, i: number) => {
      console.log(`Result ${i + 1}: ${result.content.substring(0, 200)}...`);
    });
    
  } catch (error) {
    console.error('Error parsing localStorage:', error);
  }
}

function searchLocalKnowledge(query: string) {
  const stored = localStorage.getItem('voicecoach_knowledge_base');
  if (!stored) return [];
  
  try {
    const documents = JSON.parse(stored);
    const results: any[] = [];
    const queryLower = query.toLowerCase();
    
    documents.forEach((doc: any) => {
      // Check if document has proper structure
      if (!doc.chunks || !Array.isArray(doc.chunks)) {
        console.warn(`Document ${doc.filename} has no chunks array`);
        
        // If no chunks but has content, search in content
        if (doc.content && doc.content.toLowerCase().includes(queryLower)) {
          results.push({
            content: doc.content.substring(0, 500),
            source: doc.filename,
            type: 'content'
          });
        }
      } else {
        // Search in chunks
        doc.chunks.forEach((chunk: string) => {
          if (chunk.toLowerCase().includes(queryLower)) {
            results.push({
              content: chunk,
              source: doc.filename,
              type: 'chunk'
            });
          }
        });
      }
    });
    
    return results;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

// Auto-run on load
if (typeof window !== 'undefined') {
  (window as any).debugKB = debugKnowledgeBase;
  console.log('💡 Run debugKB() in console to debug knowledge base');
}