// Migrate knowledge base from localStorage to Tauri backend
import { invoke } from '@tauri-apps/api/tauri';

export interface KnowledgeDocument {
  filename: string;
  content: string;
  chunks: string[];
  timestamp: number;
  type?: string;
  isAIGenerated: boolean;
}

export async function migrateKnowledgeBaseToBackend() {
  try {
    console.log('🔄 Starting knowledge base migration...');
    
    // Get documents from localStorage
    const stored = localStorage.getItem('voicecoach_knowledge_base');
    if (!stored) {
      console.log('No documents to migrate');
      return { migrated: 0, message: 'No documents found in localStorage' };
    }
    
    const documents = JSON.parse(stored) as KnowledgeDocument[];
    console.log(`Found ${documents.length} documents to migrate`);
    
    // Check if we're in Tauri environment
    if (!(window as any).__TAURI__) {
      console.log('Not in Tauri environment, skipping migration');
      return { migrated: 0, message: 'Not in desktop app' };
    }
    
    let migrated = 0;
    let failed = 0;
    
    // Process each document
    for (const doc of documents) {
      try {
        console.log(`Migrating: ${doc.filename}`);
        
        // Add document to backend
        await invoke('add_document_to_kb', {
          document: {
            filename: doc.filename,
            content: doc.content,
            chunks: doc.chunks || [],
            timestamp: doc.timestamp || Date.now(),
            type: doc.type,
            isAIGenerated: doc.isAIGenerated || false
          }
        });
        
        migrated++;
        console.log(`✅ Migrated: ${doc.filename}`);
      } catch (error) {
        console.error(`Failed to migrate ${doc.filename}:`, error);
        failed++;
      }
    }
    
    console.log(`✅ Migration complete: ${migrated} succeeded, ${failed} failed`);
    
    return {
      migrated,
      failed,
      total: documents.length,
      message: `Migrated ${migrated} of ${documents.length} documents`
    };
    
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      migrated: 0,
      message: `Migration failed: ${error}`
    };
  }
}

// Function to check if documents exist in backend
export async function checkBackendDocuments() {
  try {
    if (!(window as any).__TAURI__) {
      console.log('Not in Tauri environment');
      return [];
    }
    
    const documents = await invoke<KnowledgeDocument[]>('get_all_documents');
    console.log(`Backend has ${documents.length} documents`);
    return documents;
  } catch (error) {
    console.error('Failed to check backend documents:', error);
    return [];
  }
}

// Function to list all document filenames
export function listLocalDocuments() {
  const stored = localStorage.getItem('voicecoach_knowledge_base');
  if (!stored) {
    console.log('No documents in localStorage');
    return [];
  }
  
  try {
    const documents = JSON.parse(stored);
    const filenames = documents.map((d: any) => ({
      filename: d.filename,
      chunks: d.chunks?.length || 0,
      size: d.content?.length || 0,
      type: d.type || 'unknown',
      isAIGenerated: d.isAIGenerated || false
    }));
    
    console.table(filenames);
    return filenames;
  } catch (error) {
    console.error('Error parsing localStorage:', error);
    return [];
  }
}

// Auto-migrate on load if in Tauri environment
if ((window as any).__TAURI__) {
  // Check if migration is needed
  checkBackendDocuments().then(backendDocs => {
    const stored = localStorage.getItem('voicecoach_knowledge_base');
    if (stored) {
      const localDocs = JSON.parse(stored);
      if (localDocs.length > 0 && backendDocs.length === 0) {
        console.log('📦 Auto-migrating knowledge base to backend...');
        migrateKnowledgeBaseToBackend().then(result => {
          console.log('Migration result:', result);
        });
      } else {
        console.log(`📚 Backend: ${backendDocs.length} docs, Local: ${localDocs.length} docs`);
      }
    }
  });
}