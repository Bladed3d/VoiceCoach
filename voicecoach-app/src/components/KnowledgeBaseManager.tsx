import React, { useState, useEffect } from 'react';
import { smartInvoke } from '../lib/tauri-mock';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

interface DocumentProcessingStats {
  total_documents: number;
  total_chunks: number;
  processing_time_ms: number;
  success_rate: number;
  knowledge_base_size: number;
}

interface KnowledgeBaseStats {
  total_documents: number;
  total_chunks: number;
  collection_size: number;
  last_updated: string;
  health_status: 'healthy' | 'warning' | 'error';
}

interface KnowledgeSearchResult {
  content: string;
  similarity_score: number;
  source_document: string;
  metadata: Record<string, string>;
}

export const KnowledgeBaseManager: React.FC = () => {
  const trail = new BreadcrumbTrail('KnowledgeBaseManager');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStats, setProcessingStats] = useState<DocumentProcessingStats | null>(null);
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeBaseStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  useEffect(() => {
    // LED 401: Component initialization
    trail.light(401, { operation: 'component_mount', timestamp: Date.now() });
    loadKnowledgeBaseStats();
    
    // Load persisted uploaded files from localStorage
    try {
      const stored = localStorage.getItem('voicecoach_knowledge_base');
      if (stored) {
        const persistedKnowledge = JSON.parse(stored);
        // Convert back to File objects for display (metadata only)
        const fileList = persistedKnowledge.map((doc: any) => ({
          name: doc.filename,
          size: doc.content.length,
          type: 'text/plain',
          lastModified: doc.timestamp
        }));
        setUploadedFiles(fileList as File[]);
        trail.light(402, { 
          operation: 'loaded_persisted_files', 
          file_count: fileList.length 
        });
        console.log(`📁 Loaded ${fileList.length} persisted files for display`);
      }
    } catch (error) {
      console.warn('Failed to load persisted files for display:', error);
    }
  }, []);

  const loadKnowledgeBaseStats = async () => {
    try {
      // LED 207: Get stats API start
      trail.light(207, { operation: 'get_knowledge_base_stats_start' });
      
      const startTime = Date.now();
      const stats = await smartInvoke('get_knowledge_base_stats');
      const duration = Date.now() - startTime;
      
      // LED 208: Get stats API complete
      trail.light(208, { 
        operation: 'get_knowledge_base_stats_complete',
        duration_ms: duration,
        stats_retrieved: {
          documents: stats.total_documents || 0,
          chunks: stats.total_chunks || 0,
          health: stats.health_status || 'healthy'
        }
      });
      
      // LED 302: State update for knowledge stats
      trail.light(302, { operation: 'knowledge_stats_state_update' });
      setKnowledgeStats({
        total_documents: stats.total_documents || 0,
        total_chunks: stats.total_chunks || 0,
        collection_size: stats.collection_size || 0,
        last_updated: stats.last_updated || 'Never',
        health_status: stats.health_status || 'healthy'
      });
      
    } catch (error) {
      // LED 207: Get stats API failed
      trail.fail(207, error as Error);
      console.error('Failed to load knowledge base stats:', error);
    }
  };

  const selectDirectory = async () => {
    // File dialog temporarily disabled for browser compatibility
    console.log('File dialog would open here in desktop mode');
    setSelectedDirectory('/mock/path/for/browser/mode'); // Mock path for testing
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    trail.light(350, { operation: 'file_upload_start', file_count: files.length });
    
    const fileArray = Array.from(files);
    setUploadedFiles(prev => [...prev, ...fileArray]);
    
    // Process each file
    for (const file of fileArray) {
      try {
        const text = await file.text();
        trail.light(351, { 
          operation: 'file_content_extracted', 
          filename: file.name,
          size: file.size,
          type: file.type 
        });
        
        // For now, store in a simple in-memory knowledge base
        // Later this will be replaced with proper RAG processing
        const chunks = text.split('\n\n').filter(chunk => chunk.trim().length > 10);
        
        // Trigger coaching system update with new document
        const docEvent = new CustomEvent('documentUploaded', {
          detail: { 
            filename: file.name,
            content: text,
            chunks: chunks,
            timestamp: Date.now()
          }
        });
        window.dispatchEvent(docEvent);
        
        trail.light(352, { 
          operation: 'document_processed_to_chunks',
          filename: file.name,
          chunks_created: chunks.length
        });
        
      } catch (error) {
        trail.fail(351, error as Error);
        console.error(`Failed to process file ${file.name}:`, error);
      }
    }
    
    alert(`Successfully uploaded and processed ${fileArray.length} files!`);
  };

  const processDocuments = async () => {
    // Check if we have either directory or uploaded files
    if (!selectedDirectory && uploadedFiles.length === 0) {
      // LED 507: Directory validation failed
      trail.light(507, { operation: 'directory_validation_failed', reason: 'no_directory_or_files_selected' });
      alert('Please select a directory or upload files first');
      return;
    }

    // If files were uploaded, they're already processed - show success message
    if (uploadedFiles.length > 0 && !selectedDirectory) {
      trail.light(408, { operation: 'files_already_processed', file_count: uploadedFiles.length });
      alert(`✅ Your ${uploadedFiles.length} uploaded files are already processed and ready for coaching!`);
      return;
    }

    // LED 306: Processing state update
    trail.light(306, { operation: 'is_processing_state_update', processing: true });
    setIsProcessing(true);
    
    try {
      // LED 203: Process documents API start
      trail.light(203, { 
        operation: 'process_documents_api_start',
        directory_path: selectedDirectory,
        recursive: true
      });
      
      const startTime = Date.now();
      const stats = await smartInvoke('process_documents', {
        directoryPath: selectedDirectory,
        recursive: true
      });
      const duration = Date.now() - startTime;
      
      // LED 204: Process documents API complete
      trail.light(204, { 
        operation: 'process_documents_api_complete',
        duration_ms: duration,
        processing_stats: {
          total_documents: stats.total_documents,
          total_chunks: stats.total_chunks,
          success_rate: stats.success_rate,
          processing_time: stats.processing_time_ms
        }
      });
      
      // LED 301: Processing stats state update
      trail.light(301, { operation: 'processing_stats_state_update' });
      setProcessingStats(stats);
      
      // Refresh knowledge base stats after processing
      await loadKnowledgeBaseStats();
      
      // LED 407: Success message display
      trail.light(407, { 
        operation: 'success_message_display',
        message: `Processed ${stats.total_documents} documents into ${stats.total_chunks} chunks`
      });
      alert(`Successfully processed ${stats.total_documents} documents into ${stats.total_chunks} knowledge chunks!`);
      
    } catch (error) {
      // LED 203: Process documents API failed
      trail.fail(203, error as Error);
      
      // LED 406: Error message display
      trail.light(406, { operation: 'error_message_display', error: (error as Error).message });
      console.error('Document processing failed:', error);
      alert(`Document processing failed: ${error}`);
    } finally {
      // LED 306: Processing state update (complete)
      trail.light(306, { operation: 'is_processing_state_update', processing: false });
      setIsProcessing(false);
    }
  };

  const searchKnowledgeBase = async () => {
    if (!searchQuery.trim()) {
      // LED 503: Input validation failed
      trail.light(503, { operation: 'search_input_validation_failed', reason: 'empty_query' });
      return;
    }

    // LED 307: Searching state update
    trail.light(307, { operation: 'is_searching_state_update', searching: true });
    setIsSearching(true);
    
    try {
      // LED 205: Search knowledge API start
      trail.light(205, { 
        operation: 'search_knowledge_api_start',
        query: searchQuery.substring(0, 100), // Truncate for logging
        max_results: 5
      });
      
      const startTime = Date.now();
      const results = await smartInvoke('search_knowledge_base', {
        query: searchQuery,
        maxResults: 5,
        salesStage: null
      });
      const duration = Date.now() - startTime;
      
      // LED 206: Search knowledge API complete
      trail.light(206, { 
        operation: 'search_knowledge_api_complete',
        duration_ms: duration,
        results_count: results.length,
        query_processed: searchQuery.length
      });
      
      // LED 303: Search results state update
      trail.light(303, { 
        operation: 'search_results_state_update',
        results_count: results.length
      });
      setSearchResults(results);
      
      // LED 404: Search results display
      trail.light(404, { 
        operation: 'search_results_display',
        results_count: results.length,
        query: searchQuery.substring(0, 50)
      });
      
    } catch (error) {
      // LED 205: Search knowledge API failed
      trail.fail(205, error as Error);
      
      // LED 406: Error message display
      trail.light(406, { operation: 'error_message_display', error: (error as Error).message });
      console.error('Knowledge search failed:', error);
      alert(`Search failed: ${error}`);
    } finally {
      // LED 307: Searching state update (complete)
      trail.light(307, { operation: 'is_searching_state_update', searching: false });
      setIsSearching(false);
    }
  };

  const validateKnowledgeBase = async () => {
    try {
      // LED 209: Validate KB API start
      trail.light(209, { operation: 'validate_knowledge_base_api_start' });
      
      const startTime = Date.now();
      const validation = await smartInvoke('validate_knowledge_base');
      const duration = Date.now() - startTime;
      
      // LED 210: Validate KB API complete
      trail.light(210, { 
        operation: 'validate_knowledge_base_api_complete',
        duration_ms: duration,
        is_valid: validation.is_valid,
        errors_count: validation.errors?.length || 0,
        warnings_count: validation.warnings?.length || 0
      });
      
      if (validation.is_valid) {
        // LED 407: Success message display
        trail.light(407, { operation: 'success_message_display', message: 'Knowledge base validation passed' });
        alert('Knowledge base validation passed! ✅');
      } else {
        // LED 406: Error message display
        trail.light(406, { 
          operation: 'error_message_display',
          validation_errors: validation.errors
        });
        alert(`Knowledge base validation failed:\n${validation.errors.join('\n')}`);
      }
    } catch (error) {
      // LED 209: Validate KB API failed
      trail.fail(209, error as Error);
      
      // LED 406: Error message display
      trail.light(406, { operation: 'error_message_display', error: (error as Error).message });
      console.error('Knowledge base validation failed:', error);
      alert(`Validation failed: ${error}`);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        🧠 Knowledge Base Manager
      </h2>

      {/* Knowledge Base Stats */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Knowledge Base Statistics</h3>
        
        {knowledgeStats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{knowledgeStats.total_documents}</div>
              <div className="text-sm text-gray-600">Documents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{knowledgeStats.total_chunks}</div>
              <div className="text-sm text-gray-600">Knowledge Chunks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{knowledgeStats.collection_size}</div>
              <div className="text-sm text-gray-600">Collection Size</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getHealthStatusColor(knowledgeStats.health_status)}`}>
                {knowledgeStats.health_status.toUpperCase()}
              </div>
              <div className="text-sm text-gray-600">Health Status</div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">Loading statistics...</div>
        )}
        
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => {
              // LED 106: Refresh stats click
              trail.light(106, { operation: 'refresh_stats_button_click' });
              loadKnowledgeBaseStats();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Refresh Stats
          </button>
          <button
            onClick={() => {
              // LED 105: Validate button click
              trail.light(105, { operation: 'validate_knowledge_base_button_click' });
              validateKnowledgeBase();
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            ✅ Validate Knowledge Base
          </button>
        </div>
      </div>

      {/* Document Processing */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Process New Documents</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Directory with Sales Documents
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // LED 101: Directory select click
                  trail.light(101, { operation: 'directory_select_button_click' });
                  selectDirectory();
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                📁 Select Directory
              </button>
              {selectedDirectory && (
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm">
                  {selectedDirectory}
                </div>
              )}
            </div>
          </div>
          
          {/* File Upload Option */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or Upload Individual Files (PDF, TXT, MD)
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="file"
                multiple
                accept=".pdf,.txt,.md,.docx"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            {uploadedFiles.length > 0 && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-1">Uploaded Files:</h4>
                <ul className="text-sm text-blue-700">
                  {uploadedFiles.map((file, index) => (
                    <li key={index}>📄 {file.name} ({Math.round(file.size / 1024)}KB)</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <button
            onClick={() => {
              // LED 102: Process documents click
              trail.light(102, { 
                operation: 'process_documents_button_click',
                has_directory: !!selectedDirectory,
                is_processing: isProcessing
              });
              processDocuments();
            }}
            disabled={(!selectedDirectory && uploadedFiles.length === 0) || isProcessing}
            className="px-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isProcessing ? '⚙️ Processing Documents...' : '🚀 Process Documents'}
          </button>
          
          {processingStats && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Processing Completed Successfully!</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>📄 Documents Processed: <span className="font-bold">{processingStats.total_documents}</span></div>
                <div>🧠 Knowledge Chunks: <span className="font-bold">{processingStats.total_chunks}</span></div>
                <div>⏱️ Processing Time: <span className="font-bold">{processingStats.processing_time_ms}ms</span></div>
                <div>✅ Success Rate: <span className="font-bold">{(processingStats.success_rate * 100).toFixed(1)}%</span></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Knowledge Search */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Search Knowledge Base</h3>
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                // LED 103: Search input change
                trail.light(103, { 
                  operation: 'search_input_change',
                  query_length: e.target.value.length,
                  has_content: e.target.value.trim().length > 0
                });
                // LED 304: Search query state update
                trail.light(304, { operation: 'search_query_state_update' });
                setSearchQuery(e.target.value);
              }}
              placeholder="Search for sales knowledge, objection handling, product info..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  // LED 109: Search enter key
                  trail.light(109, { 
                    operation: 'search_enter_key_press',
                    query: searchQuery.substring(0, 50)
                  });
                  searchKnowledgeBase();
                }
              }}
            />
            <button
              onClick={() => {
                // LED 104: Search button click
                trail.light(104, { 
                  operation: 'search_button_click',
                  query: searchQuery.substring(0, 50),
                  is_searching: isSearching
                });
                searchKnowledgeBase();
              }}
              disabled={!searchQuery.trim() || isSearching}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSearching ? '🔍 Searching...' : '🔍 Search'}
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Search Results ({searchResults.length}):</h4>
              {searchResults.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm text-gray-600">
                      📄 {result.source_document}
                    </div>
                    <div className="text-sm font-semibold text-blue-600">
                      {(result.similarity_score * 100).toFixed(1)}% match
                    </div>
                  </div>
                  <div className="text-gray-800 mb-2">
                    {result.content}
                  </div>
                  {Object.keys(result.metadata).length > 0 && (
                    <div className="text-xs text-gray-500">
                      Metadata: {Object.entries(result.metadata).map(([key, value]) => 
                        `${key}: ${value}`
                      ).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {searchQuery && searchResults.length === 0 && !isSearching && (
            <div className="text-center text-gray-500 py-8">
              No results found for "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};