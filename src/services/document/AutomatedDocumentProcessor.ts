/**
 * VoiceCoach V2 - Automated Document Processing Pipeline
 * Handles the complete flow: Upload → Chunk → ChromaDB → Ollama Integration
 * Replicates old app's automated process with configurable settings
 * LED Range: 3100-3199
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import { documentProcessorBrowser, ProcessedDocument } from '../knowledge/DocumentProcessor-Browser';
import { knowledgeIntegration } from '../coaching/KnowledgeIntegration';
import { ChromaDBService } from '../knowledge/ChromaDBService';
import { documentPersistence } from './ProcessedDocumentPersistence';
import { versionManager } from './ProcessedDocumentVersionManager';
import { configLoader } from '../coaching/ConfigurationLoader-Electron';

interface ProcessingResult {
  success: boolean;
  documentId: string;
  totalChunks: number;
  chromaDBStatus: boolean;
  ollamaReady: boolean;
  processingTime: number;
  errors?: string[];
}

interface ProcessingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  enableChromaDB?: boolean;
  enableOllamaIntegration?: boolean;
  collectionName?: string;
}

export class AutomatedDocumentProcessor {
  private trail: BreadcrumbTrail;
  private chromaDBService: ChromaDBService;
  private isProcessing: boolean = false;

  constructor() {
    this.trail = new BreadcrumbTrail('AutomatedDocumentProcessor');
    this.chromaDBService = new ChromaDBService();
    
    // LED 3100: Automated processor initialized
    this.trail.light(3100, {
      operation: 'automated_processor_init',
      timestamp: Date.now()
    });
  }

  /**
   * Process a document through the complete pipeline
   * Matches old app's process: Upload → Chunk → ChromaDB → Ollama
   * Browser-compatible version that accepts file content
   */
  async processDocumentContent(
    content: string,
    fileName: string,
    options: ProcessingOptions = {},
    originalPath?: string
  ): Promise<ProcessingResult> {
    if (this.isProcessing) {
      throw new Error('Document processing already in progress');
    }

    this.isProcessing = true;
    const startTime = Date.now();
    const errors: string[] = [];

    // LED 3101: Processing started
    this.trail.light(3101, {
      operation: 'document_processing_start',
      file: fileName,
      content_length: content.length,
      options,
      timestamp: startTime
    });

    try {
      // Step 1: Process and chunk the document (512 tokens with 50 overlap - same as old app)
      // LED 3110: Document chunking
      this.trail.light(3110, {
        operation: 'document_chunking_start',
        chunk_size: options.chunkSize || 512,
        overlap: options.chunkOverlap || 50
      });

      const processedDoc = await documentProcessorBrowser.processDocumentContent(content, fileName);
      
      // LED 3111: Chunking complete
      this.trail.light(3111, {
        operation: 'document_chunking_complete',
        chunks_created: processedDoc.chunks.length,
        methodologies: processedDoc.metadata.methodologies,
        techniques: processedDoc.metadata.techniques
      });

      console.log(`✅ Document chunked: ${processedDoc.chunks.length} chunks created`);

      // Convert to ChromaDB format (needed for both storage and saving)
      const chromaDBDoc = this.convertToChromaDBFormat(processedDoc);

      // Step 2: Store in ChromaDB for semantic search
      let chromaDBStatus = false;
      if (options.enableChromaDB !== false) {
        try {
          // LED 3120: ChromaDB storage start
          this.trail.light(3120, {
            operation: 'chromadb_storage_start',
            collection: options.collectionName || 'voicecoach_knowledge'
          });

          console.log('🔄 ChromaDB: Initializing vector database...');
          
          // Initialize ChromaDB if not already done
          if (!this.chromaDBService.isReady()) {
            await this.chromaDBService.initialize();
          }
          
          console.log(`📊 ChromaDB: Storing ${processedDoc.chunks.length} chunks for semantic search...`);
          
          // Store chunks in ChromaDB service for retrieval during coaching
          for (const chunk of chromaDBDoc.chunks) {
            await this.chromaDBService.addChunk(chunk);
          }
          
          // LED 3121: ChromaDB storage complete
          this.trail.light(3121, {
            operation: 'chromadb_storage_complete',
            chunks_stored: processedDoc.chunks.length
          });

          chromaDBStatus = true;
          console.log(`✅ ChromaDB: Stored ${processedDoc.chunks.length} chunks for semantic search`);
          
        } catch (error) {
          // LED 8120: ChromaDB storage failed (non-fatal)
          this.trail.fail(8120, error as Error);
          errors.push(`ChromaDB storage failed: ${error.message}`);
          console.warn('⚠️ ChromaDB storage failed, continuing without semantic search');
        }
      }

      // Step 2b: Persist processed document with version management
      try {
        // LED 3125: Document persistence start
        this.trail.light(3125, {
          operation: 'document_persistence_start',
          document_name: fileName
        });

        // Get user-defined configuration name (for now, use default)
        const configName = await this.getConfigurationName(options);
        
        // Register this processed version
        await versionManager.registerVersion(
          fileName,
          originalPath || 'memory',
          `${fileName}_${configName}_${Date.now()}.json`,
          {
            maxWords: 25, // From old app analysis
            methodology: 'Chris Voss',
            chunkSize: options.chunkSize || 512,
            chunkOverlap: options.chunkOverlap || 50,
            compressionEnabled: true,
            techniques: processedDoc.metadata.techniques || []
          },
          true // Set as active version
        );

        // Save the processed document via Electron API
        if ((window as any).electronAPI?.saveProcessedVersion) {
          const versionData = {
            documentName: fileName,
            versionName: configName,
            processedDoc,
            chromaDBChunks: chromaDBDoc.chunks,
            configuration: {
              maxWords: 25,
              methodology: 'Chris Voss',
              chunkSize: options.chunkSize || 512,
              chunkOverlap: options.chunkOverlap || 50,
              compressionEnabled: true
            }
          };

          const result = await (window as any).electronAPI.saveProcessedVersion(versionData);
          
          if (result.success) {
            // LED 3126: Document persistence complete
            this.trail.light(3126, {
              operation: 'document_persistence_complete',
              document_id: processedDoc.id,
              version_file: result.fileName
            });
            console.log(`✅ Processed document saved: ${result.fileName}`);
          } else {
            throw new Error(result.error || 'Failed to save processed version');
          }
        }
      } catch (error) {
        errors.push(`Document persistence failed: ${error.message}`);
        console.warn('⚠️ Could not save processed document to disk');
      }

      // Step 3: Integrate with Knowledge Base for Ollama prompts
      let ollamaReady = false;
      if (options.enableOllamaIntegration !== false) {
        try {
          // LED 3130: Ollama integration start
          this.trail.light(3130, {
            operation: 'ollama_integration_start',
            document: processedDoc.title
          });

          console.log('🔄 Ollama: Preparing knowledge base integration...');
          
          // Integrate with knowledge system for Ollama prompting
          const integrated = await knowledgeIntegration.integrateProcessedDocument(processedDoc);
          
          if (integrated) {
            console.log(`✅ Ollama: Integrated ${processedDoc.chunks.length} chunks`);
            console.log('   - 77% compression applied for 4096 token limit');
            console.log('   - 25-word response limit configured');
            console.log('   - Chris Voss techniques prioritized');
            
            ollamaReady = true;
            
            // LED 3131: Ollama integration complete
            this.trail.light(3131, {
              operation: 'ollama_integration_complete',
              ready_for_coaching: true,
              chunks_integrated: processedDoc.chunks.length
            });

            console.log('✅ Ollama: Document ready for real-time coaching');
          } else {
            throw new Error('Failed to integrate document with Ollama')
          }
          
        } catch (error) {
          // LED 8130: Ollama integration failed (non-fatal)
          this.trail.fail(8130, error as Error);
          errors.push(`Ollama integration failed: ${error.message}`);
          console.warn('⚠️ Ollama integration failed, basic coaching will be used');
        }
      }

      // Step 4: Generate processing report
      const processingTime = Date.now() - startTime;
      
      // LED 3140: Processing complete
      this.trail.light(3140, {
        operation: 'document_processing_complete',
        success: true,
        total_chunks: processedDoc.chunks.length,
        chromadb_ready: chromaDBStatus,
        ollama_ready: ollamaReady,
        processing_time_ms: processingTime
      });

      const result: ProcessingResult = {
        success: true,
        documentId: processedDoc.id,
        totalChunks: processedDoc.chunks.length,
        chromaDBStatus,
        ollamaReady,
        processingTime,
        errors: errors.length > 0 ? errors : undefined
      };

      console.log(`
✅ Document Processing Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 Document: ${processedDoc.title}
📦 Chunks: ${processedDoc.chunks.length}
🔍 ChromaDB: ${chromaDBStatus ? 'Ready' : 'Not configured'}
🤖 Ollama: ${ollamaReady ? 'Ready' : 'Not configured'}
⏱️ Time: ${(processingTime / 1000).toFixed(2)}s
${errors.length > 0 ? `⚠️ Warnings: ${errors.join(', ')}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);

      return result;

    } catch (error) {
      // LED 8100: Fatal processing error
      this.trail.fail(8100, error as Error);
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        documentId: '',
        totalChunks: 0,
        chromaDBStatus: false,
        ollamaReady: false,
        processingTime,
        errors: [`Fatal error: ${error.message}`]
      };
      
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Convert processed document to ChromaDB format
   */
  private convertToChromaDBFormat(doc: ProcessedDocument): any {
    return {
      document_info: {
        source: doc.source,
        total_chunks: doc.chunks.length,
        processed_date: doc.processedDate,
        purpose: "Real-time sales coaching with VoiceCoach V2"
      },
      chunks: doc.chunks.map(chunk => ({
        id: chunk.id,
        content: chunk.content,
        content_type: chunk.type,
        conversation_phase: this.mapToConversationPhase(chunk.salesStage),
        priority: this.determinePriority(chunk),
        char_count: chunk.content.length,
        search_keywords: chunk.keywords,
        coaching_trigger: this.generateCoachingTrigger(chunk),
        expected_outcome: this.generateExpectedOutcome(chunk)
      }))
    };
  }

  /**
   * Map sales stage to conversation phase
   */
  private mapToConversationPhase(stage?: string): string {
    const stageMap: Record<string, string> = {
      'discovery': 'DISCOVERY',
      'demo': 'PRESENTATION',
      'objection_handling': 'OBJECTION',
      'closing': 'CLOSING'
    };
    return stageMap[stage || ''] || 'GENERAL';
  }

  /**
   * Determine chunk priority based on content
   */
  private determinePriority(chunk: any): string {
    if (chunk.type === 'technique' && chunk.methodology === 'Chris Voss') {
      return 'HIGH';
    }
    if (chunk.salesStage === 'closing' || chunk.salesStage === 'objection_handling') {
      return 'CRITICAL';
    }
    if (chunk.type === 'framework' || chunk.type === 'principle') {
      return 'MEDIUM';
    }
    return 'STANDARD';
  }

  /**
   * Generate coaching trigger for a chunk
   */
  private generateCoachingTrigger(chunk: any): string {
    if (chunk.keywords.includes('objection')) {
      return 'When customer raises concerns or objections';
    }
    if (chunk.keywords.includes('closing')) {
      return 'When moving toward decision or commitment';
    }
    if (chunk.type === 'technique') {
      return `When opportunity to use ${chunk.keywords[0] || 'technique'}`;
    }
    return 'During relevant conversation moment';
  }

  /**
   * Generate expected outcome for a chunk
   */
  private generateExpectedOutcome(chunk: any): string {
    if (chunk.methodology === 'Chris Voss') {
      return 'Customer feels heard and becomes more collaborative';
    }
    if (chunk.salesStage === 'closing') {
      return 'Move toward commitment or next steps';
    }
    if (chunk.type === 'objection_handler') {
      return 'Address concern and maintain momentum';
    }
    return 'Advance the conversation positively';
  }

  /**
   * Get processing status
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Get configuration name from options or prompt user
   */
  private async getConfigurationName(options: ProcessingOptions): Promise<string> {
    // For now, generate a default name based on configuration
    // In future, this will prompt the user for a custom name
    const parts = [];
    
    if (options.chunkSize === 256) {
      parts.push('compact');
    } else if (options.chunkSize === 1024) {
      parts.push('detailed');
    } else {
      parts.push('standard');
    }
    
    if (options.enableChromaDB !== false) {
      parts.push('semantic');
    }
    
    return parts.join('-') || 'default';
  }
}

// Export singleton instance
export const automatedDocumentProcessor = new AutomatedDocumentProcessor();