/**
 * VoiceCoach V2 - Phase Details Modal Component
 * Displays detailed results from individual RAG processing phases
 * Supports viewing, downloading, and deleting individual phase documents
 */
import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Trash2, 
  FileText, 
  Brain, 
  Target, 
  CheckCircle2,
  AlertTriangle,
  Copy,
  Eye
} from 'lucide-react';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

interface PhaseData {
  high_impact_techniques?: Array<{
    technique: string;
    impact_score: number;
    context: string;
    examples: string[];
  }>;
  document_summary?: {
    key_themes: string[];
    contextual_focus?: string;
    priority_insights: string[];
  };
  coaching_prompts?: {
    opening: string[];
    discovery: string[];
    objection_handling: string[];
    closing: string[];
  };
  metadata?: {
    processing_time_ms: number;
    confidence_score: number;
    techniques_found: number;
  };
}

interface PhaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  phaseId: '1A' | '1B' | '1C';
  phaseName: string;
  phaseData: PhaseData | null;
  documentName: string;
  onDownload: (phaseId: string, data: PhaseData) => void;
  onDelete: (phaseId: string) => void;
}

export const PhaseDetailsModal: React.FC<PhaseDetailsModalProps> = ({
  isOpen,
  onClose,
  phaseId,
  phaseName,
  phaseData,
  documentName,
  onDownload,
  onDelete
}) => {
  const trail = new BreadcrumbTrail('PhaseDetailsModal');
  const [activeTab, setActiveTab] = useState<'overview' | 'techniques' | 'prompts' | 'raw'>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || !phaseData) return null;

  const handleDownload = () => {
    trail.light(7001, { operation: 'phase_download', phaseId, documentName });
    onDownload(phaseId, phaseData);
  };

  const handleDelete = () => {
    trail.light(7002, { operation: 'phase_delete_confirm', phaseId, documentName });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    trail.light(7003, { operation: 'phase_delete_confirmed', phaseId, documentName });
    onDelete(phaseId);
    setShowDeleteConfirm(false);
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    trail.light(7004, { operation: 'content_copied', phaseId, length: text.length });
  };

  const getPhaseIcon = () => {
    switch (phaseId) {
      case '1A': return <FileText className="w-6 h-6 text-blue-400" />;
      case '1B': return <Brain className="w-6 h-6 text-purple-400" />;
      case '1C': return <Target className="w-6 h-6 text-green-400" />;
      default: return <FileText className="w-6 h-6 text-gray-400" />;
    }
  };

  const getPhaseDescription = () => {
    switch (phaseId) {
      case '1A': return 'Pure document analysis without user context';
      case '1B': return 'Contextual analysis incorporating user priorities';
      case '1C': return 'Synthesis and coaching prompt generation';
      default: return 'Phase analysis results';
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              {getPhaseIcon()}
              <div>
                <h2 className="text-2xl font-bold text-white">Phase {phaseId}: {phaseName}</h2>
                <p className="text-gray-400 text-sm">{documentName}</p>
                <p className="text-gray-500 text-xs">{getPhaseDescription()}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'overview' 
                  ? 'border-blue-400 text-blue-400' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('techniques')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'techniques' 
                  ? 'border-blue-400 text-blue-400' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Techniques ({phaseData.high_impact_techniques?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('prompts')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'prompts' 
                  ? 'border-blue-400 text-blue-400' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Coaching Prompts
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'raw' 
                  ? 'border-blue-400 text-blue-400' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Raw Data
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Metadata */}
                {phaseData.metadata && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-800 rounded-lg p-4">
                      <div className="text-2xl font-bold text-white">{phaseData.metadata.techniques_found || 0}</div>
                      <div className="text-sm text-gray-400">Techniques Found</div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-4">
                      <div className="text-2xl font-bold text-white">
                        {phaseData.metadata.confidence_score ? `${Math.round(phaseData.metadata.confidence_score * 100)}%` : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-400">Confidence Score</div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-4">
                      <div className="text-2xl font-bold text-white">
                        {phaseData.metadata.processing_time_ms ? `${(phaseData.metadata.processing_time_ms / 1000).toFixed(1)}s` : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-400">Processing Time</div>
                    </div>
                  </div>
                )}

                {/* Document Summary */}
                {phaseData.document_summary && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Document Summary</h3>
                    
                    {phaseData.document_summary.key_themes && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Key Themes:</h4>
                        <div className="flex flex-wrap gap-2">
                          {phaseData.document_summary.key_themes.map((theme, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                              {theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {phaseData.document_summary.contextual_focus && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Contextual Focus:</h4>
                        <p className="text-gray-400 text-sm bg-slate-800 rounded-lg p-3">
                          {phaseData.document_summary.contextual_focus}
                        </p>
                      </div>
                    )}

                    {phaseData.document_summary.priority_insights && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Priority Insights:</h4>
                        <ul className="space-y-2">
                          {phaseData.document_summary.priority_insights.map((insight, index) => (
                            <li key={index} className="text-gray-400 text-sm flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'techniques' && (
              <div className="space-y-4">
                {phaseData.high_impact_techniques?.map((technique, index) => (
                  <div key={index} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white">{technique.technique}</h3>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-sm">
                          Score: {technique.impact_score}/10
                        </span>
                        <button
                          onClick={() => copyToClipboard(technique.technique)}
                          className="p-1 hover:bg-slate-700 rounded transition-colors"
                        >
                          <Copy className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-3">{technique.context}</p>
                    
                    {technique.examples && technique.examples.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Examples:</h4>
                        <ul className="space-y-1">
                          {technique.examples.map((example, idx) => (
                            <li key={idx} className="text-gray-400 text-sm pl-4 border-l-2 border-slate-600">
                              {example}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}

                {!phaseData.high_impact_techniques || phaseData.high_impact_techniques.length === 0 && (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                    <p className="text-gray-400">No techniques found in this phase</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'prompts' && (
              <div className="space-y-6">
                {phaseData.coaching_prompts && Object.entries(phaseData.coaching_prompts).map(([category, prompts]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-lg font-semibold text-white capitalize">
                      {category.replace('_', ' ')} ({prompts.length})
                    </h3>
                    <div className="grid gap-3">
                      {prompts.map((prompt, index) => (
                        <div key={index} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                          <div className="flex items-start justify-between">
                            <p className="text-gray-300 text-sm flex-1">{prompt}</p>
                            <button
                              onClick={() => copyToClipboard(prompt)}
                              className="ml-3 p-1 hover:bg-slate-700 rounded transition-colors"
                            >
                              <Copy className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {!phaseData.coaching_prompts && (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                    <p className="text-gray-400">No coaching prompts available for this phase</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'raw' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Raw Phase Data</h3>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(phaseData, null, 2))}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    Copy All
                  </button>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <pre className="text-gray-300 text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(phaseData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-60">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-red-500/20">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h3 className="text-lg font-semibold text-white">Confirm Deletion</h3>
              </div>
              
              <p className="text-gray-400 text-sm mb-6">
                Are you sure you want to delete Phase {phaseId} results for "{documentName}"? 
                This action cannot be undone.
              </p>
              
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete Phase
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};