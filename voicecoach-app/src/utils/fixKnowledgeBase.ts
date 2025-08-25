// Fix existing knowledge base documents to have proper chunks

export function fixExistingKnowledgeBase() {
  console.log('🔧 Fixing knowledge base documents...');
  
  const stored = localStorage.getItem('voicecoach_knowledge_base');
  if (!stored) {
    console.log('No documents to fix');
    return;
  }
  
  try {
    const documents = JSON.parse(stored);
    let fixed = 0;
    
    const updatedDocs = documents.map((doc: any) => {
      // Check if document needs fixing
      if (!doc.chunks || doc.chunks.length === 0 || 
          (doc.chunks.length === 1 && doc.chunks[0] === doc.content)) {
        
        console.log(`Fixing chunks for: ${doc.filename}`);
        
        // Create proper chunks
        const chunks = createIntelligentChunks(doc.content);
        fixed++;
        
        return {
          ...doc,
          chunks: chunks
        };
      }
      
      return doc;
    });
    
    // Save fixed documents back
    localStorage.setItem('voicecoach_knowledge_base', JSON.stringify(updatedDocs));
    
    console.log(`✅ Fixed ${fixed} documents`);
    console.log('Knowledge base updated with proper chunks');
    
    // Trigger reload event
    window.dispatchEvent(new Event('storage'));
    
    return updatedDocs;
    
  } catch (error) {
    console.error('Error fixing knowledge base:', error);
  }
}

function createIntelligentChunks(content: string): string[] {
  const chunkSize = 8000; // Conservative 8k characters per chunk
  
  if (!content || content.length <= chunkSize) {
    return [content];
  }
  
  const chunks: string[] = [];
  let startIndex = 0;
  
  while (startIndex < content.length) {
    let endIndex = Math.min(startIndex + chunkSize, content.length);
    
    // If not at the end, try to break at a good spot
    if (endIndex < content.length) {
      // Try to break at paragraph
      const lastDoubleNewline = content.lastIndexOf('\n\n', endIndex);
      if (lastDoubleNewline > startIndex + chunkSize * 0.5) {
        endIndex = lastDoubleNewline + 2;
      } else {
        // Try to break at sentence
        const lastPeriod = content.lastIndexOf('. ', endIndex);
        if (lastPeriod > startIndex + chunkSize * 0.5) {
          endIndex = lastPeriod + 2;
        } else {
          // Break at any whitespace
          const lastSpace = content.lastIndexOf(' ', endIndex);
          if (lastSpace > startIndex) {
            endIndex = lastSpace + 1;
          }
        }
      }
    }
    
    const chunk = content.substring(startIndex, endIndex).trim();
    if (chunk.length > 100) { // Only add substantial chunks
      chunks.push(chunk);
    }
    
    startIndex = endIndex;
  }
  
  console.log(`Created ${chunks.length} chunks from ${content.length} characters`);
  return chunks;
}

// Auto-run on load
if (typeof window !== 'undefined') {
  (window as any).fixKB = fixExistingKnowledgeBase;
  console.log('💡 Run fixKB() to fix existing documents with proper chunks');
}