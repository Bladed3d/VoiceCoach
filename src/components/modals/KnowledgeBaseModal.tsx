/**
 * VoiceCoach V2 - Knowledge Base Modal Component
 * Handles questionnaire and file selection for RAG setup
 */
import React, { useState, useEffect } from 'react';
import { Database, ChevronDown } from 'lucide-react';
import { QuestionnaireAnswers, QuestionnaireState, QuestionStatus } from '../../types/questionnaire';
import { automatedDocumentProcessor } from '../../services/document/AutomatedDocumentProcessor';
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (answers: QuestionnaireAnswers, files: string[]) => void;
}

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [questionnaireState, setQuestionnaireState] = useState<QuestionnaireState>({
    currentQuestion: 1,
    answers: {
      q1_docType: 'Strategy or Process Document',
      q2_learningObjective: '',
      q3_businessChallenge: '',
      q4_successMetrics: '',
      q5_criticalConcepts: ['', '', '']
    },
    selectedFiles: [],
    isComplete: false
  });

  // Load saved answers on component mount
  useEffect(() => {
    if (isOpen) {
      loadSavedAnswers();
    }
  }, [isOpen]);

  // Test console logging
  console.log('🚀 KnowledgeBaseModal component loaded, console is working!');

  const trail = new BreadcrumbTrail('KnowledgeBaseModal');

  /**
   * Handle RAG Process button click - automated document processing
   */
  const handleRAGProcess = async () => {
    // Check if files are already selected
    if (!questionnaireState.selectedFiles || questionnaireState.selectedFiles.length === 0) {
      alert('Please select a document first using "Choose Files"');
      return;
    }

    trail.light(2100, { operation: 'rag_process_initiated' });
    console.log('⚡ RAG Process started - automated document processing');

    try {
      // Process the first selected file (usually the Never Split document)
      const filePath = questionnaireState.selectedFiles[0];
      const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || 'document';
      
      console.log(`📄 Processing document: ${fileName}`);
      trail.light(2101, { 
        operation: 'document_selected',
        filename: fileName,
        filepath: filePath
      });

      // Read file content using Electron API
      console.log('📖 Reading file content from RAG folder...');
      let fileContent: string;
      
      if ((window as any).electronAPI?.readFile) {
        // Use Electron API to read the file
        const fileData = await (window as any).electronAPI.readFile(filePath);
        fileContent = fileData.content;
        console.log(`📊 File loaded: ${fileData.size} bytes`);
      } else {
        // Fallback: try to fetch from the file system (won't work in production)
        alert('File reading requires Electron API. Please ensure the app is running in Electron.');
        return;
      }

      // Start automated processing with file content
      console.log('🔄 Starting automated pipeline...');
      const result = await automatedDocumentProcessor.processDocumentContent(
        fileContent,
        fileName,
        {
          enableChromaDB: true,
          enableOllamaIntegration: true,
          chunkSize: 512,
          chunkOverlap: 50
        },
        filePath // Pass original file path for tracking
      );

      if (result.success) {
        trail.light(2102, {
          operation: 'rag_process_complete',
          chunks: result.totalChunks,
          chromadb: result.chromaDBStatus,
          ollama: result.ollamaReady
        });

        alert(`✅ RAG Process Complete!\n\nDocument: ${fileName}\nChunks created: ${result.totalChunks}\nChromaDB: ${result.chromaDBStatus ? 'Ready' : 'Not configured'}\nOllama: ${result.ollamaReady ? 'Ready' : 'Not configured'}\nTime: ${(result.processingTime / 1000).toFixed(2)}s`);
      } else {
        throw new Error(result.errors?.join(', ') || 'Processing failed');
      }
    } catch (error) {
      trail.fail(8102, error as Error);
      console.error('❌ RAG Process failed:', error);
      alert(`RAG Process failed: ${error.message}`);
    }
  };

  const loadSavedAnswers = async () => {
    console.log('🔄 Load button clicked - starting loadSavedAnswers function'); // Debug log
    try {
      console.log('🔍 Calling electronAPI.loadInsights()...'); // Debug log
      const savedData = await (window as any).electronAPI?.loadInsights();
      console.log('📦 Loaded data:', savedData); // Debug log
      
      if (savedData && savedData.questionnaire) {
        console.log('Setting questionnaire answers:', savedData.questionnaire); // Debug log
        setQuestionnaireState(prev => ({
          ...prev,
          answers: savedData.questionnaire,
          selectedFiles: savedData.documents || []
        }));
        
        // Show success feedback
        const loadButton = document.querySelector('[data-load-button]') as HTMLButtonElement;
        if (loadButton) {
          const originalText = loadButton.innerHTML;
          loadButton.innerHTML = '<span>✅</span><span>Loaded!</span>';
          setTimeout(() => {
            loadButton.innerHTML = originalText;
          }, 2000);
        }
      } else {
        // No saved data found
        const loadButton = document.querySelector('[data-load-button]') as HTMLButtonElement;
        if (loadButton) {
          const originalText = loadButton.innerHTML;
          loadButton.innerHTML = '<span>ℹ️</span><span>No saved answers</span>';
          setTimeout(() => {
            loadButton.innerHTML = originalText;
          }, 2000);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load saved answers:', error);
      
      // Show error feedback
      const loadButton = document.querySelector('[data-load-button]') as HTMLButtonElement;
      if (loadButton) {
        const originalText = loadButton.innerHTML;
        loadButton.innerHTML = '<span>❌</span><span>Load failed</span>';
        setTimeout(() => {
          loadButton.innerHTML = originalText;
        }, 2000);
      }
    }
  };

  const handleAnswerChange = async (field: string, value: string | string[]) => {
    const updatedAnswers = {
      ...questionnaireState.answers,
      [field as keyof QuestionnaireAnswers]: value
    };

    setQuestionnaireState(prev => ({
      ...prev,
      answers: updatedAnswers
    }));

    // Auto-save answers
    try {
      await (window as any).electronAPI?.saveInsights({
        questionnaire: updatedAnswers,
        timestamp: new Date().toISOString(),
        documents: questionnaireState.selectedFiles,
        autoSave: true
      });
    } catch (error) {
      console.warn('Auto-save failed:', error);
    }
  };

  const handleFileSelection = async () => {
    if (!(window as any).electronAPI) {
      alert('Electron API not available');
      return;
    }

    try {
      const filePaths = await (window as any).electronAPI.selectMultipleFiles();
      if (filePaths && filePaths.length > 0) {
        setQuestionnaireState(prev => ({
          ...prev,
          selectedFiles: filePaths
        }));
      }
    } catch (error) {
      console.error('Error selecting files:', error);
    }
  };

  const handleNextQuestion = () => {
    if (questionnaireState.currentQuestion < 5) {
      setQuestionnaireState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1
      }));
    }
  };

  const handlePreviousQuestion = () => {
    if (questionnaireState.currentQuestion > 1) {
      setQuestionnaireState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion - 1
      }));
    }
  };

  const handleQuestionNavigation = (questionNumber: number) => {
    setQuestionnaireState(prev => ({
      ...prev,
      currentQuestion: questionNumber
    }));
  };

  const getQuestionStatus = (questionNumber: number): QuestionStatus => {
    if (questionNumber === questionnaireState.currentQuestion) return 'current';
    if (questionNumber < questionnaireState.currentQuestion) return 'completed';
    return 'pending';
  };

  const handleComplete = async () => {
    try {
      // Show saving feedback
      const saveButton = document.querySelector('[data-complete-button]') as HTMLButtonElement;
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
      }

      await (window as any).electronAPI?.saveInsights({
        questionnaire: questionnaireState.answers,
        timestamp: new Date().toISOString(),
        documents: questionnaireState.selectedFiles
      });

      // Show success message
      alert('✅ Knowledge base setup completed successfully!\n\nYour answers have been saved and will be used for AI coaching.');

      onComplete(questionnaireState.answers, questionnaireState.selectedFiles);
      onClose();
    } catch (error) {
      console.error('Failed to save questionnaire:', error);
      alert('❌ Failed to save questionnaire. Please try again.');
      
      // Reset button if save failed
      const saveButton = document.querySelector('[data-complete-button]') as HTMLButtonElement;
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = 'Complete Setup';
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg w-[90%] max-w-4xl h-[90%] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-pink-500 rounded-md flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">Knowledge Base Manager</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Loading statistics */}
        <div className="px-6 pt-6">
          <p className="text-center text-slate-400 mb-4">Loading statistics...</p>
          
          {/* Action Buttons */}
          <div className="flex justify-center space-x-3 mb-6">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium transition-colors">
              <span>🔄</span>
              <span>Refresh Stats</span>
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium transition-colors">
              <span>✓</span>
              <span>Validate Knowledge Base</span>
            </button>
            <button 
              onClick={handleRAGProcess}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium transition-colors"
            >
              <span>⚡</span>
              <span>RAG Process</span>
            </button>
            <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium transition-colors">
              <span>💡</span>
              <span>Create Use Case Examples</span>
            </button>
          </div>
        </div>

        {/* Save/Load Controls */}
        <div className="px-6 pb-4">
          <div className="bg-slate-700 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-pink-500 rounded-md flex items-center justify-center">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <button 
                  onClick={() => {
                    console.log('🔄 Reset Default button clicked!');
                    loadSavedAnswers();
                  }}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  Reset Default
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-400">Document Type:</span>
                <div className="flex space-x-2">
                  <div className="w-4 h-4 rounded border-2 border-orange-500 bg-orange-500"></div>
                  <div className="w-4 h-4 rounded border-2 border-slate-500"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-400">📄 Document Analysis Focus (Extraction priorities for this document type):</span>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={async () => {
                  try {
                    await (window as any).electronAPI?.saveInsights({
                      questionnaire: questionnaireState.answers,
                      timestamp: new Date().toISOString(),
                      documents: questionnaireState.selectedFiles
                    });
                    alert('Answers saved successfully!');
                  } catch (error) {
                    alert('Failed to save answers');
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
              >
                <span>💾</span>
                <span>Save</span>
              </button>
              <button 
                onClick={() => {
                  console.log('🎯 Load button clicked!');
                  loadSavedAnswers();
                }}
                data-load-button
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
              >
                <span>📂</span>
                <span>Load</span>
              </button>
              <button 
                onClick={() => {
                  if (confirm('Clear all saved answers?')) {
                    setQuestionnaireState(prev => ({
                      ...prev,
                      answers: {
                        q1_docType: 'Strategy or Process Document',
                        q2_learningObjective: '',
                        q3_businessChallenge: '',
                        q4_successMetrics: '',
                        q5_criticalConcepts: ['', '', '']
                      }
                    }));
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
              >
                🗑
              </button>
            </div>
          </div>

          <div className="flex justify-end mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-400">Reset</span>
              <span className="text-sm text-slate-400">Clear Saved</span>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 px-6 pb-6 overflow-y-auto text-white">
          {/* Question Progress */}
          <div className="flex justify-center items-center space-x-4 mb-6">
            <span className="text-sm mr-2">Question {questionnaireState.currentQuestion} of 5</span>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((questionNum, index) => (
                <React.Fragment key={questionNum}>
                  <button
                    onClick={() => handleQuestionNavigation(questionNum)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold cursor-pointer hover:scale-110 transition-transform ${
                      getQuestionStatus(questionNum) === 'completed' 
                        ? 'bg-green-500 text-white' 
                        : getQuestionStatus(questionNum) === 'current'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {getQuestionStatus(questionNum) === 'completed' ? '✓' : questionNum}
                  </button>
                  {index < 4 && <div className={`w-2 h-2 rounded-full mt-3 ${
                    getQuestionStatus(questionNum) === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Current Question */}
          <div className="bg-slate-700 p-6 rounded-lg mb-6 text-left">
            {questionnaireState.currentQuestion === 1 && (
              <>
                <h3 className="text-lg font-semibold mb-4 text-white">What type of document are you uploading?</h3>
                <div className="space-y-3">
                  {[
                    { value: 'Strategy or Process Document', label: 'Strategy or Process Document', desc: 'methodologies, frameworks, best practices' },
                    { value: 'Product or Service Knowledge', label: 'Product or Service Knowledge', desc: 'features, specifications, benefits' },
                    { value: 'Sales Scripts', label: 'Sales Scripts', desc: 'call flows, talk tracks, dialogues' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-start space-x-3 p-3 border border-slate-600 rounded-lg hover:bg-slate-600 cursor-pointer">
                      <input 
                        type="radio" 
                        name="docType" 
                        className="mt-1" 
                        checked={questionnaireState.answers.q1_docType === option.value}
                        onChange={() => handleAnswerChange('q1_docType', option.value)}
                      />
                      <div>
                        <div className="font-medium text-white">{option.label}</div>
                        <div className="text-sm text-slate-400">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}

            {questionnaireState.currentQuestion === 2 && (
              <>
                <h3 className="text-lg font-semibold mb-4 text-white">What do you want your team to know from this document?</h3>
                <textarea
                  className="w-full h-32 p-3 bg-slate-600 border border-slate-500 rounded-lg resize-none text-white placeholder-slate-400"
                  placeholder="Example: I want them to understand how to use mirroring and labeling techniques to build rapport and handle objections without seeming pushy"
                  value={questionnaireState.answers.q2_learningObjective}
                  onChange={(e) => handleAnswerChange('q2_learningObjective', e.target.value)}
                />
              </>
            )}

            {questionnaireState.currentQuestion === 3 && (
              <>
                <h3 className="text-lg font-semibold mb-4 text-white">Why do you want them to know this?</h3>
                <textarea
                  className="w-full h-32 p-3 bg-slate-600 border border-slate-500 rounded-lg resize-none text-white placeholder-slate-400"
                  placeholder="Example: Our team struggles with price objections and often drops price too quickly. This document teaches how to redirect the conversation to value instead"
                  value={questionnaireState.answers.q3_businessChallenge}
                  onChange={(e) => handleAnswerChange('q3_businessChallenge', e.target.value)}
                />
              </>
            )}

            {questionnaireState.currentQuestion === 4 && (
              <>
                <h3 className="text-lg font-semibold mb-4 text-white">What does success look like?</h3>
                <textarea
                  className="w-full h-32 p-3 bg-slate-600 border border-slate-500 rounded-lg resize-none text-white placeholder-slate-400"
                  placeholder="Example: Reps confidently handle price objections without immediately offering discounts, they keep prospects engaged longer in discovery calls, and they close 20% more deals at full price"
                  value={questionnaireState.answers.q4_successMetrics}
                  onChange={(e) => handleAnswerChange('q4_successMetrics', e.target.value)}
                />
              </>
            )}

            {questionnaireState.currentQuestion === 5 && (
              <>
                <h3 className="text-lg font-semibold mb-4 text-white">Must-Know Concepts (Optional)</h3>
                <p className="text-slate-400 mb-4">Are there specific techniques or concepts that are absolutely critical? List 2-3 if applicable</p>
                <div className="space-y-3">
                  {[0, 1, 2].map((index) => (
                    <input
                      key={index}
                      type="text"
                      className="w-full p-3 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400"
                      placeholder={`${index + 1}. Enter critical concept (optional)`}
                      value={questionnaireState.answers.q5_criticalConcepts[index]}
                      onChange={(e) => {
                        const newConcepts = [...questionnaireState.answers.q5_criticalConcepts];
                        newConcepts[index] = e.target.value;
                        handleAnswerChange('q5_criticalConcepts', newConcepts);
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6">
              <button 
                onClick={handlePreviousQuestion}
                disabled={questionnaireState.currentQuestion === 1}
                className={`px-4 py-2 rounded ${
                  questionnaireState.currentQuestion === 1 
                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                    : 'bg-slate-500 text-white hover:bg-slate-400'
                }`}
              >
                Back
              </button>
              
              {questionnaireState.currentQuestion === 5 ? (
                <button 
                  data-complete-button
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold disabled:bg-green-400 disabled:cursor-not-allowed"
                  onClick={handleComplete}
                >
                  Complete Setup
                </button>
              ) : (
                <button 
                  onClick={handleNextQuestion}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Next
                </button>
              )}
            </div>
          </div>

          {/* File Upload Section */}
          <div className="border-t border-slate-600 pt-6">
            <h4 className="text-left font-semibold mb-4 text-white">Upload Individual Files (PDF, TXT, MD)</h4>
            <button 
              onClick={handleFileSelection}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mr-3"
            >
              Choose Files
            </button>
            <span className="text-slate-400">
              {questionnaireState.selectedFiles.length > 0 
                ? `${questionnaireState.selectedFiles.length} file(s) selected` 
                : 'No file chosen'
              }
            </span>
            {questionnaireState.selectedFiles.length > 0 && (
              <div className="mt-2 text-sm text-slate-400">
                {questionnaireState.selectedFiles.map((file: string, index) => {
                  const fileName = file.split(/[/\\]/).pop();
                  return (
                    <div key={index} className="truncate">📄 {fileName}</div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};