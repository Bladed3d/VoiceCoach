/**
 * Processed Document Persistence Service
 * Saves processed chunks and metadata to RAG folder for persistence
 * Keeps original documents external, only stores processed data
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { ProcessedDocument } from '../knowledge/DocumentProcessor-Browser';

interface PersistedDocument {
  id: string;
  originalPath: string;
  originalHash: string;
  processedDate: string;
  chunks: any[];
  metadata: any;
  embeddings?: any[];
}

export class ProcessedDocumentPersistence {
  private trail: BreadcrumbTrail;
  
  constructor() {
    this.trail = new BreadcrumbTrail('ProcessedDocumentPersistence');
  }
  
  /**
   * Save processed document to RAG folder
   * Original document stays in user's location
   */
  async saveProcessedDocument(
    processedDoc: ProcessedDocument,
    originalPath: string,
    embeddings?: any[]
  ): Promise<boolean> {
    try {
      this.trail.light(3200, {
        operation: 'save_processed_document_start',
        document_id: processedDoc.id,
        original_path: originalPath,
        chunks: processedDoc.chunks.length
      });
      
      // Prepare data for persistence
      const persistedDoc: PersistedDocument = {
        id: processedDoc.id,
        originalPath: originalPath, // Track where original came from
        originalHash: await this.calculateFileHash(originalPath),
        processedDate: processedDoc.processedDate,
        chunks: processedDoc.chunks,
        metadata: processedDoc.metadata,
        embeddings: embeddings
      };
      
      // Save to RAG folder using Electron API
      const fileName = this.generateFileName(processedDoc.title);
      const savePath = `rag/processed/${fileName}`;
      
      if ((window as any).electronAPI?.saveProcessedDocument) {
        const result = await (window as any).electronAPI.saveProcessedDocument(
          savePath,
          JSON.stringify(persistedDoc, null, 2)
        );
        
        if (result.success) {
          this.trail.light(3201, {
            operation: 'save_processed_document_success',
            saved_to: savePath,
            file_size: result.size
          });
          
          console.log(`✅ Saved processed document to: ${savePath}`);
          return true;
        }
      }
      
      // Fallback to localStorage for development
      localStorage.setItem(`rag_processed_${processedDoc.id}`, JSON.stringify(persistedDoc));
      console.log('⚠️ Saved to localStorage (Electron API not available)');
      return true;
      
    } catch (error) {
      this.trail.fail(8200, error as Error);
      console.error('Failed to save processed document:', error);
      return false;
    }
  }
  
  /**
   * Load previously processed documents from RAG folder
   */
  async loadProcessedDocuments(): Promise<PersistedDocument[]> {
    try {
      this.trail.light(3202, {
        operation: 'load_processed_documents_start'
      });
      
      if ((window as any).electronAPI?.loadProcessedDocuments) {
        const result = await (window as any).electronAPI.loadProcessedDocuments();
        
        if (result.success) {
          this.trail.light(3203, {
            operation: 'load_processed_documents_success',
            count: result.documents.length
          });
          
          return result.documents;
        }
      }
      
      // Fallback to localStorage
      const docs: PersistedDocument[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('rag_processed_')) {
          const doc = JSON.parse(localStorage.getItem(key) || '{}');
          docs.push(doc);
        }
      }
      
      return docs;
      
    } catch (error) {
      this.trail.fail(8201, error as Error);
      console.error('Failed to load processed documents:', error);
      return [];
    }
  }
  
  /**
   * Check if original document has changed since processing
   */
  async hasOriginalChanged(persistedDoc: PersistedDocument): Promise<boolean> {
    try {
      const currentHash = await this.calculateFileHash(persistedDoc.originalPath);
      return currentHash !== persistedDoc.originalHash;
    } catch (error) {
      console.error('Could not check if original changed:', error);
      return false;
    }
  }
  
  /**
   * Calculate file hash for change detection
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    if ((window as any).electronAPI?.calculateFileHash) {
      const result = await (window as any).electronAPI.calculateFileHash(filePath);
      return result.hash;
    }
    
    // Simple fallback - use file path and timestamp
    return `${filePath}_${Date.now()}`;
  }
  
  /**
   * Generate safe filename for processed document
   */
  private generateFileName(title: string): string {
    const safe = title.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
    
    return `${safe}-processed-${Date.now()}.json`;
  }
}

// Export singleton instance
export const documentPersistence = new ProcessedDocumentPersistence();