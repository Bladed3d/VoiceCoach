/**
 * VoiceCoach V2 - Document Selector Modal
 * Allows selection of RAG documents for coaching session
 * LED Range: 7200-7209 for document selection operations
 */
import React, { useState, useEffect } from 'react';
import { X, FileText, Check, Database } from 'lucide-react';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

interface DocumentSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectionChange: (selectedDocs: string[]) => void;
  currentSelection: string[];
}

interface RagDocument {
  name: string;
  path: string;
  type: 'original' | 'processed' | 'json';
  size?: number;
}

const DocumentSelectorModal: React.FC<DocumentSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectionChange,
  currentSelection = []
}) => {
  const trail = new BreadcrumbTrail('DocumentSelectorModal');
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(currentSelection));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    try {
      trail.light(7200, { operation: 'loading_rag_documents' });
      setLoading(true);

      // Call IPC to list RAG documents
      if (window.electronAPI?.listRagDocuments) {
        const docs = await window.electronAPI.listRagDocuments();
        setDocuments(docs);
        trail.light(7201, { 
          operation: 'documents_loaded',
          count: docs.length 
        });
      } else {
        // Fallback for testing - hardcoded list
        const mockDocs: RagDocument[] = [
          { name: 'NeverSplitSummary_original.txt', path: 'rag/backup/NeverSplitSummary_2025-09-02_03_39_52_original.txt', type: 'original' },
          { name: 'NeverSplit-phase1a.json', path: 'rag/backup/NeverSplit-phase1a.json', type: 'json' },
          { name: 'NeverSplit_ChromaDB_Processed.json', path: 'rag/backup/NeverSplit_ChromaDB_Processed.json', type: 'processed' }
        ];
        setDocuments(mockDocs);
        trail.light(7202, { 
          operation: 'using_mock_documents',
          count: mockDocs.length 
        });
      }
    } catch (error) {
      trail.fail(8200, error as Error);
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDocument = (docName: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(docName)) {
      newSelected.delete(docName);
      trail.light(7203, { 
        operation: 'document_deselected',
        document: docName 
      });
    } else {
      newSelected.add(docName);
      trail.light(7204, { 
        operation: 'document_selected',
        document: docName 
      });
    }
    setSelected(newSelected);
  };

  const handleApply = () => {
    const selectedArray = Array.from(selected);
    trail.light(7205, { 
      operation: 'selection_applied',
      count: selectedArray.length,
      documents: selectedArray
    });
    onSelectionChange(selectedArray);
    onClose();
  };

  const getDocumentIcon = (type: string) => {
    switch(type) {
      case 'original':
        return <FileText className="w-4 h-4 text-blue-400" />;
      case 'processed':
        return <Database className="w-4 h-4 text-green-400" />;
      case 'json':
        return <FileText className="w-4 h-4 text-yellow-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-primary-400" />
            <h2 className="text-xl font-semibold text-white">Select RAG Documents</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {loading ? (
            <div className="text-center py-8 text-slate-400">
              Loading documents...
            </div>
          ) : documents.length > 0 ? (
            documents.map((doc) => (
              <div
                key={doc.name}
                onClick={() => toggleDocument(doc.name)}
                className={`
                  flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all
                  ${selected.has(doc.name) 
                    ? 'bg-primary-500/20 border border-primary-500/50' 
                    : 'bg-slate-800 border border-slate-700 hover:bg-slate-700'
                  }
                `}
              >
                {/* Checkbox */}
                <div className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center
                  ${selected.has(doc.name)
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-slate-500'
                  }
                `}>
                  {selected.has(doc.name) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>

                {/* Document Info */}
                <div className="flex-1 flex items-center space-x-2">
                  {getDocumentIcon(doc.type)}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">
                      {doc.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      Type: {doc.type}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400">
              No documents found in RAG folder
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-700">
          <div className="text-sm text-slate-400">
            {selected.size} document{selected.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Apply Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentSelectorModal;