// Knowledge Base Hook - Connects frontend to Tauri backend
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { readTextFile } from '@tauri-apps/api/fs';

export interface KnowledgeDocument {
  filename: string;
  content: string;
  chunks: string[];
  timestamp: number;
  type?: string;
  isAIGenerated: boolean;
}

export interface KnowledgeBaseStats {
  total_documents: number;
  total_chunks: number;
  collection_size: number;
  last_updated: string;
  health_status: string;
}

export interface ProcessingStats {
  total_documents: number;
  total_chunks: number;
  processing_time_ms: number;
  success_rate: number;
  knowledge_base_size: number;
}

export const useKnowledgeBase = () => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load documents and stats on mount
  useEffect(() => {
    loadDocuments();
    loadStats();
  }, []);

  // Load all documents from backend
  const loadDocuments = async () => {
    try {
      console.log('📚 Loading documents from backend...');
      const docs = await invoke<KnowledgeDocument[]>('get_all_documents');
      setDocuments(docs);
      console.log(`✅ Loaded ${docs.length} documents`);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError(String(err));
    }
  };

  // Load knowledge base statistics
  const loadStats = async () => {
    try {
      const kbStats = await invoke<KnowledgeBaseStats>('get_kb_stats');
      setStats(kbStats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  // Select and process files
  const selectAndProcessFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Open file dialog
      const selected = await invoke<string[]>('select_files');
      if (!selected || selected.length === 0) {
        console.log('No files selected');
        return;
      }

      console.log(`📂 Selected ${selected.length} files`);
      
      // Process each file
      for (const filePath of selected) {
        console.log(`Processing: ${filePath}`);
        const doc = await invoke<KnowledgeDocument>('process_single_file', {
          filePath
        });
        console.log(`✅ Processed: ${doc.filename}`);
      }
      
      // Reload documents and stats
      await loadDocuments();
      await loadStats();
      
    } catch (err) {
      console.error('File processing failed:', err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Select and process directory
  const selectAndProcessDirectory = async (recursive: boolean = true) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Open directory dialog
      const directory = await invoke<string>('select_directory');
      if (!directory) {
        console.log('No directory selected');
        return;
      }

      console.log(`📁 Selected directory: ${directory}`);
      
      // Process directory
      const stats = await invoke<ProcessingStats>('process_documents_batch', {
        directoryPath: directory,
        recursive
      });
      
      console.log(`✅ Processed ${stats.total_documents} documents`);
      
      // Reload documents and stats
      await loadDocuments();
      await loadStats();
      
      return stats;
      
    } catch (err) {
      console.error('Directory processing failed:', err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Process text content directly
  const processTextContent = async (filename: string, content: string, docType?: string) => {
    try {
      setIsLoading(true);
      
      const doc = await invoke<KnowledgeDocument>('process_text_content', {
        filename,
        content,
        docType
      });
      
      console.log(`✅ Processed text content: ${filename}`);
      
      // Reload documents
      await loadDocuments();
      await loadStats();
      
      return doc;
      
    } catch (err) {
      console.error('Text processing failed:', err);
      setError(String(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Search knowledge base
  const searchKnowledge = async (query: string, maxResults: number = 5) => {
    try {
      console.log(`🔍 Searching for: ${query}`);
      
      const results = await invoke<[string, number][]>('search_knowledge', {
        query,
        maxResults
      });
      
      console.log(`Found ${results.length} results`);
      return results.map(([content, score]) => ({
        content,
        similarity_score: score,
        source_document: 'Knowledge Base',
        metadata: {}
      }));
      
    } catch (err) {
      console.error('Search failed:', err);
      setError(String(err));
      return [];
    }
  };

  // Remove document
  const removeDocument = async (filename: string) => {
    try {
      const removed = await invoke<boolean>('remove_document_from_kb', {
        filename
      });
      
      if (removed) {
        console.log(`🗑️ Removed: ${filename}`);
        await loadDocuments();
        await loadStats();
      }
      
      return removed;
      
    } catch (err) {
      console.error('Remove failed:', err);
      setError(String(err));
      return false;
    }
  };

  // Clear all documents
  const clearKnowledgeBase = async () => {
    try {
      await invoke('clear_knowledge_base');
      console.log('🗑️ Knowledge base cleared');
      await loadDocuments();
      await loadStats();
    } catch (err) {
      console.error('Clear failed:', err);
      setError(String(err));
    }
  };

  return {
    documents,
    stats,
    isLoading,
    error,
    loadDocuments,
    loadStats,
    selectAndProcessFiles,
    selectAndProcessDirectory,
    processTextContent,
    searchKnowledge,
    removeDocument,
    clearKnowledgeBase
  };
};