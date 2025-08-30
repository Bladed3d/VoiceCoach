/**
 * VoiceCoach V2 - Knowledge Base Hub Component
 * Unified document management interface with LED breadcrumb instrumentation
 * Manages processed documents and launches new document processing workflow
 */
import React, { useState, useEffect } from 'react';
import { 
  Database, 
  FileText, 
  Download, 
  Trash2, 
  Plus, 
  AlertCircle,
  RefreshCw,
  X,
  Brain,
  Target,
  Zap
} from 'lucide-react';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';
import { KnowledgeBaseModal } from './modals/KnowledgeBaseModal';
// import { PhaseDetailsModal } from './modals/PhaseDetailsModal';
import ProcessingStatus from './ProcessingStatus';
import { QuestionnaireAnswers } from '../types/questionnaire';

interface PhaseFile {
  id: string;
  fileName: string;
  name: string; // Display name like "DocumentName - Phase 1A"
  originalDocument: string;
  phase: '1A' | '1B' | '1C' | 'ORIGINAL';
  status: 'completed' | 'error';
  insights: string;
  data: any;
  timestamp: string;
  size: number;
  type: 'json' | 'txt' | 'pdf' | 'docx' | string;
}

interface KnowledgeBaseHubProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeBaseHub: React.FC<KnowledgeBaseHubProps> = ({
  isOpen,
  onClose
}) => {
  const trail = new BreadcrumbTrail('KnowledgeBaseHub');
  
  // State management
  const [phaseFiles, setPhaseFiles] = useState<PhaseFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [showProcessingStatus, setShowProcessingStatus] = useState(false);
  const [processingDocument, setProcessingDocument] = useState<any>(null);
  const [processingQuestionnaire, setProcessingQuestionnaire] = useState<any>(null);
  const [completionProcessed, setCompletionProcessed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      trail.light(2001, { operation: 'hub_opened', timestamp: Date.now() });
      loadPhaseFiles();
    }
  }, [isOpen]);

  const loadPhaseFiles = async () => {
    try {
      trail.light(2002, { operation: 'load_phase_files_start' });
      setIsLoading(true);

      // Load phase files from persistent storage
      const savedPhaseFiles = await (window as any).electronAPI?.loadProcessedDocuments();
      const realPhaseFiles: PhaseFile[] = savedPhaseFiles || [];
      
      setPhaseFiles(realPhaseFiles);
      trail.light(2023, { operation: 'ui_state_updated', phase_files_set: realPhaseFiles.length });
      
      trail.light(2003, { 
        operation: 'load_phase_files_success', 
        count: realPhaseFiles.length,
        completed: realPhaseFiles.filter(f => f.status === 'completed').length,
        phase_breakdown: {
          phase1A: realPhaseFiles.filter(f => f.phase === '1A').length,
          phase1B: realPhaseFiles.filter(f => f.phase === '1B').length,
          phase1C: realPhaseFiles.filter(f => f.phase === '1C').length
        },
        file_names: realPhaseFiles.map(f => f.fileName)
      });

    } catch (error) {
      trail.fail(2004, error instanceof Error ? error : new Error('Failed to load phase files'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessNewDocument = () => {
    trail.light(2005, { operation: 'process_new_document_clicked' });
    setShowProcessingModal(true);
  };

  const handleKnowledgeBaseComplete = async (answers: QuestionnaireAnswers, files: string[]) => {
    trail.light(2006, { operation: 'new_document_processing_start', files: files.length });
    
    if (files.length === 0) {
      trail.fail(2007, new Error('No files provided for processing'));
      return;
    }
    
    // Create document object from uploaded files
    const document = {
      name: files[0].split('/').pop() || 'Unknown Document',
      size: 0,
      content: `Document: ${files[0]}`,
      path: files[0]
    };
    
    // Store processing data and show processing status
    setProcessingDocument(document);
    setProcessingQuestionnaire(answers);
    setShowProcessingModal(false);
    setShowProcessingStatus(true);
    setCompletionProcessed(false); // Reset completion flag for new processing
    
    trail.light(2008, { operation: 'processing_status_launched', document: document.name });
  };

  const handleProcessingComplete = async (insights: any) => {
    // Prevent duplicate completion handling
    if (completionProcessed) {
      trail.light(2022, { operation: 'completion_already_processed', document: processingDocument?.name });
      return;
    }
    
    setCompletionProcessed(true);
    trail.light(2009, { operation: 'processing_completed', insights: Object.keys(insights).length });
    
    // Create new document entry for saving
    const completionTimestamp = new Date().toISOString();
    const uploadTimestamp = processingDocument?.uploadDate || new Date(Date.now() - 30000).toISOString();
    const newDocument = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      name: processingDocument?.name || 'New Document',
      type: 'txt',
      uploadDate: uploadTimestamp,
      completedDate: completionTimestamp,
      status: 'completed',
      phases: {
        phase1A: { 
          status: 'completed', 
          insights: `Found ${insights.phase1A_results?.high_impact_techniques?.length || 0} techniques`,
          data: insights.phase1A_results 
        },
        phase1B: { 
          status: 'completed', 
          insights: `Contextual analysis with ${insights.phase1B_results?.high_impact_techniques?.length || 0} priority techniques`,
          data: insights.phase1B_results 
        },
        phase1C: { 
          status: 'completed', 
          insights: `Generated ${insights.phase1C_results?.coaching_prompts?.length || 0} coaching prompts`,
          data: insights.phase1C_results 
        }
      },
      size: processingDocument?.size || 0,
      path: processingDocument?.path
    };

    // Save document to persistent storage (creates 3 phase files)
    try {
      await (window as any).electronAPI?.saveProcessedDocument(newDocument);
      trail.light(2015, { operation: 'document_saved_to_disk', documentId: newDocument.id });
    } catch (error) {
      trail.fail(2016, error instanceof Error ? error : new Error('Failed to save document to disk'));
    }

    // Reload phase files to show the new ones
    await loadPhaseFiles();
    
    // Reset processing state
    setShowProcessingStatus(false);
    setProcessingDocument(null);
    setProcessingQuestionnaire(null);
    setCompletionProcessed(false);
    
    trail.light(2010, { operation: 'phase_files_reloaded' });
  };

  const handleDeletePhaseFile = (phaseFileId: string) => {
    trail.light(2011, { operation: 'delete_phase_file_start', phaseFileId });
    
    const phaseFile = phaseFiles.find(f => f.id === phaseFileId);
    setDeleteTarget({
      id: phaseFileId,
      name: phaseFile?.name || 'this phase file'
    });
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      trail.light(2016, { operation: 'delete_confirmation_accepted', phaseFileId: deleteTarget.id });
      
      // Delete from persistent storage
      try {
        await (window as any).electronAPI?.deleteProcessedDocument(deleteTarget.id);
        trail.light(2017, { operation: 'phase_file_deleted_from_disk', phaseFileId: deleteTarget.id });
      } catch (error) {
        trail.fail(2018, error instanceof Error ? error : new Error('Failed to delete phase file from disk'));
        // Continue with local deletion even if disk deletion fails
      }
      
      // Remove from local state
      setPhaseFiles(prev => prev.filter(f => f.id !== deleteTarget.id));
      
      trail.light(2012, { operation: 'delete_phase_file_success', phaseFileId: deleteTarget.id });
      
      // Close the confirmation modal but DON'T close the Knowledge Base Hub
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      
      trail.light(2019, { operation: 'delete_modal_closed_successfully', remainingFiles: phaseFiles.length - 1 });
      
    } catch (error) {
      trail.fail(2013, error instanceof Error ? error : new Error('Failed to delete phase file'));
      // Close confirmation modal even on error
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  const handleCancelDelete = () => {
    if (deleteTarget) {
      trail.light(2014, { operation: 'delete_phase_file_cancelled', phaseFileId: deleteTarget.id });
    }
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const handleDownloadPhaseFile = (phaseFile: PhaseFile) => {
    trail.light(2014, { operation: 'download_phase_file', phaseFileId: phaseFile.id, name: phaseFile.name });
    
    try {
      const dataStr = JSON.stringify({
        documentName: phaseFile.originalDocument,
        phase: phaseFile.phase,
        status: phaseFile.status,
        insights: phaseFile.insights,
        data: phaseFile.data,
        timestamp: phaseFile.timestamp
      }, null, 2);
      
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = phaseFile.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      trail.light(2018, { operation: 'download_phase_file_success', phaseFileId: phaseFile.id });
    } catch (error) {
      trail.fail(2019, error instanceof Error ? error : new Error('Failed to download phase file'));
    }
  };


  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case '1A': return <FileText className="w-5 h-5 text-blue-400" />;
      case '1B': return <Brain className="w-5 h-5 text-purple-400" />;
      case '1C': return <Target className="w-5 h-5 text-green-400" />;
      case 'ORIGINAL': return <Database className="w-5 h-5 text-orange-400" />;
      default: return <Zap className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case '1A': return 'Pure Analysis';
      case '1B': return 'Contextual Analysis';
      case '1C': return 'Synthesis & Coaching';
      case 'ORIGINAL': return 'Original Document';
      default: return `Phase ${phase}`;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Knowledge Base Hub Modal */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Knowledge Base Hub</h2>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                {phaseFiles.length} files
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={loadPhaseFiles}
                disabled={isLoading}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <button
              onClick={handleProcessNewDocument}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Process New Document
            </button>
          </div>

          {/* Phase Files List */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mr-3" />
                <span className="text-gray-400">Loading phase files...</span>
              </div>
            ) : phaseFiles.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No phase files yet</h3>
                <p className="text-gray-500 mb-6">Process your first document to generate phase files</p>
                <button
                  onClick={handleProcessNewDocument}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Process First Document
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {phaseFiles.map((phaseFile) => (
                  <div
                    key={phaseFile.id}
                    className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {getPhaseIcon(phaseFile.phase)}
                        <div className="flex-1">
                          <h3 className="text-white font-medium">{phaseFile.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                            <span>{getPhaseLabel(phaseFile.phase)}</span>
                            <span>•</span>
                            <span>{new Date(phaseFile.timestamp).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{(phaseFile.size / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span className="text-green-400">{phaseFile.insights}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadPhaseFile(phaseFile)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDeletePhaseFile(phaseFile.id)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Processing New Document Modal */}
      {showProcessingModal && (
        <KnowledgeBaseModal
          isOpen={showProcessingModal}
          onClose={() => setShowProcessingModal(false)}
          onComplete={handleKnowledgeBaseComplete}
        />
      )}

      {/* RAG Processing Status Modal */}
      {showProcessingStatus && processingDocument && processingQuestionnaire && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4">
            <ProcessingStatus
              document={processingDocument}
              questionnaire={processingQuestionnaire}
              onCompleted={handleProcessingComplete}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-60">
          <div 
            className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <h3 className="text-xl font-semibold text-white">Confirm Delete</h3>
            </div>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete <span className="font-medium text-white">"{deleteTarget.name}"</span>?
            </p>
            
            <p className="text-gray-400 text-sm mb-6">
              This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Yes, Delete
              </button>
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};