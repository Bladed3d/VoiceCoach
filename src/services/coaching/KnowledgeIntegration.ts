/**
 * Knowledge Integration Service
 * Connects document knowledge with real-time coaching prompts
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { documentProcessorBrowser, ProcessedDocument, DocumentChunk } from '../knowledge/DocumentProcessor-Browser';
import { configurablePromptBuilder, PromptContext } from './ConfigurablePromptBuilder';

export class KnowledgeIntegration {
  private trail: BreadcrumbTrail;
  private isInitialized: boolean = false;
  private neverSplitPath?: string;
  private integratedDocument?: ProcessedDocument;
  
  constructor() {
    this.trail = new BreadcrumbTrail('KnowledgeIntegration');
  }
  
  /**
   * Initialize with Never Split the Difference document
   */
  async initializeWithNeverSplit(documentPath: string): Promise<boolean> {
    try {
      this.trail.light(6500, {
        operation: 'knowledge_integration_init',
        document: documentPath
      });
      
      // Process the document
      // Read file content using Electron API for desktop app
      const fileData = await (window as any).electronAPI?.readFile(documentPath);
      if (!fileData) {
        throw new Error('Failed to read document file');
      }
      const processedDoc = await documentProcessorBrowser.processDocumentContent(fileData.content, documentPath);
      
      this.trail.light(6501, {
        operation: 'document_processed',
        title: processedDoc.title,
        chunks: processedDoc.chunks.length,
        techniques: processedDoc.metadata.techniques
      });
      
      console.log(`✅ Processed "${processedDoc.title}"`);
      console.log(`📦 Created ${processedDoc.chunks.length} knowledge chunks`);
      console.log(`🎯 Found techniques: ${processedDoc.metadata.techniques.join(', ')}`);
      
      this.neverSplitPath = documentPath;
      this.isInitialized = true;
      
      return true;
      
    } catch (error) {
      this.trail.fail(8500, error as Error);
      console.error('Failed to initialize knowledge:', error);
      return false;
    }
  }
  
  /**
   * Integrate a processed document for Ollama prompting
   */
  async integrateProcessedDocument(processedDoc: ProcessedDocument): Promise<boolean> {
    try {
      this.trail.light(6504, {
        operation: 'integrate_processed_document',
        document_id: processedDoc.id,
        chunks: processedDoc.chunks.length
      });
      
      // Store the processed document for use in coaching
      this.integratedDocument = processedDoc;
      
      // Make chunks available through document processor for retrieval
      // This allows getRelevantChunks to work during coaching
      documentProcessorBrowser.clearDocuments();
      // Store directly in the knowledge store (internal Map)
      (documentProcessorBrowser as any).knowledgeStore.set(processedDoc.id, processedDoc);
      
      // Mark as initialized
      this.isInitialized = true;
      
      this.trail.light(6505, {
        operation: 'document_integrated',
        title: processedDoc.title,
        chunks: processedDoc.chunks.length,
        techniques: processedDoc.metadata.techniques
      });
      
      console.log(`✅ Integrated "${processedDoc.title}" for Ollama prompting`);
      console.log(`   - ${processedDoc.chunks.length} chunks ready`);
      console.log(`   - Techniques: ${processedDoc.metadata.techniques.join(', ')}`);
      
      return true;
      
    } catch (error) {
      this.trail.fail(8501, error as Error);
      console.error('Failed to integrate document:', error);
      return false;
    }
  }
  
  /**
   * Get coaching suggestion with knowledge integration
   */
  async getCoachingSuggestion(transcriptText: string, conversationHistory?: string[]): Promise<any> {
    if (!this.isInitialized) {
      console.warn('Knowledge not initialized. Call initializeWithNeverSplit first.');
    }
    
    try {
      this.trail.light(6502, {
        operation: 'get_coaching_suggestion',
        text_length: transcriptText.length,
        has_knowledge: this.isInitialized
      });
      
      // Get relevant knowledge chunks from browser-based processor
      const relevantChunks = this.integratedDocument 
        ? documentProcessorBrowser.getRelevantChunks(transcriptText, 3)
        : [];
      
      // Combine knowledge into a string
      const relevantKnowledge = relevantChunks
        .map(chunk => {
          // Prioritize Chris Voss techniques
          if (chunk.methodology === 'Chris Voss' && chunk.type === 'technique') {
            return `[${chunk.keywords.join(', ')}]: ${chunk.content}`;
          }
          return chunk.content;
        })
        .join('\n\n');
      
      this.trail.light(6503, {
        operation: 'knowledge_retrieved',
        chunks_found: relevantChunks.length,
        knowledge_length: relevantKnowledge.length
      });
      
      // Build context for prompt builder
      const context: PromptContext = {
        currentText: transcriptText,
        conversationHistory,
        relevantKnowledge,
        detectedStage: this.detectStageFromTranscript(transcriptText)
      };
      
      // Build optimized prompt
      const compressedPrompt = await configurablePromptBuilder.buildPrompt(context);
      
      this.trail.light(6504, {
        operation: 'prompt_built',
        prompt_length: compressedPrompt.prompt.length,
        token_estimate: compressedPrompt.tokenEstimate,
        compression_ratio: compressedPrompt.compressionRatio,
        fallback_used: compressedPrompt.fallbackUsed
      });
      
      // Here you would call Ollama with the prompt
      // For now, return the prompt and a sample response
      return {
        prompt: compressedPrompt.prompt,
        promptStats: {
          length: compressedPrompt.prompt.length,
          tokens: compressedPrompt.tokenEstimate,
          compressionRatio: compressedPrompt.compressionRatio,
          knowledgeUsed: relevantChunks.length > 0
        },
        // Sample response format
        suggestion: {
          urgency: 'medium',
          suggestion: 'Use tactical empathy to acknowledge their concern',
          reasoning: 'Builds trust before addressing objection',
          next_action: 'It sounds like price is a real concern for you'
        }
      };
      
    } catch (error) {
      this.trail.fail(8501, error as Error);
      throw error;
    }
  }
  
  /**
   * Simple stage detection from transcript
   */
  private detectStageFromTranscript(text: string): string {
    const textLower = text.toLowerCase();
    
    // Closing indicators
    if (textLower.includes('next steps') || 
        textLower.includes('move forward') ||
        textLower.includes('get started')) {
      return 'closing';
    }
    
    // Objection indicators
    if (textLower.includes('expensive') ||
        textLower.includes('concern') ||
        textLower.includes('not sure') ||
        textLower.includes('think about it')) {
      return 'objection_handling';
    }
    
    // Demo indicators
    if (textLower.includes('how does') ||
        textLower.includes('show me') ||
        textLower.includes('features')) {
      return 'demo';
    }
    
    // Discovery indicators
    if (textLower.includes('tell me') ||
        textLower.includes('challenge') ||
        textLower.includes('problem')) {
      return 'discovery';
    }
    
    return 'unknown';
  }
  
  /**
   * Get statistics about loaded knowledge
   */
  getKnowledgeStats(): any {
    const documents = documentProcessorBrowser.getAllDocuments();
    
    if (documents.length === 0) {
      return {
        loaded: false,
        documents: 0,
        totalChunks: 0,
        techniques: []
      };
    }
    
    const stats = {
      loaded: true,
      documents: documents.length,
      totalChunks: 0,
      techniques: new Set<string>(),
      methodologies: new Set<string>()
    };
    
    documents.forEach(doc => {
      stats.totalChunks += doc.chunks.length;
      doc.metadata.techniques.forEach(t => stats.techniques.add(t));
      doc.metadata.methodologies.forEach(m => stats.methodologies.add(m));
    });
    
    return {
      ...stats,
      techniques: Array.from(stats.techniques),
      methodologies: Array.from(stats.methodologies)
    };
  }
  
  /**
   * Clear all knowledge
   */
  clearKnowledge(): void {
    documentProcessorBrowser.clearDocuments();
    this.isInitialized = false;
    this.neverSplitPath = undefined;
    
    this.trail.light(6505, {
      operation: 'knowledge_cleared'
    });
  }
}

// Export singleton instance
export const knowledgeIntegration = new KnowledgeIntegration();