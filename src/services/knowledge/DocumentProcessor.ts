/**
 * Document Processor for VoiceCoach V2
 * Processes sales knowledge documents into chunks for real-time coaching
 * Based on the successful old VoiceCoach chunking strategy
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import fs from 'fs';
import path from 'path';

export interface DocumentChunk {
  id: string;
  content: string;
  type: 'technique' | 'principle' | 'example' | 'framework' | 'general';
  keywords: string[];
  salesStage?: string;
  methodology?: string;
  source: string;
  chunkIndex: number;
  totalChunks: number;
}

export interface ProcessedDocument {
  id: string;
  title: string;
  source: string;
  processedDate: string;
  chunks: DocumentChunk[];
  metadata: {
    totalChunks: number;
    methodologies: string[];
    techniques: string[];
    avgChunkSize: number;
  };
}

export class DocumentProcessor {
  private trail: BreadcrumbTrail;
  private knowledgeStore: Map<string, ProcessedDocument> = new Map();
  private chunkSize: number = 512; // tokens (~2048 chars)
  private chunkOverlap: number = 50; // tokens (~200 chars)
  
  // Chris Voss / Never Split keywords for special handling
  private chrisVossKeywords = [
    'tactical empathy',
    'mirroring',
    'labeling',
    'calibrated questions',
    'accusation audit',
    'black swan',
    'no is the start',
    'that\'s right',
    'how am i supposed to',
    'late night fm dj voice',
    'rule of three',
    '7-38-55 rule',
    'bending their reality'
  ];
  
  constructor() {
    this.trail = new BreadcrumbTrail('DocumentProcessor');
    
    this.trail.light(3000, {
      operation: 'document_processor_initialized',
      chunk_size: this.chunkSize,
      overlap: this.chunkOverlap
    });
  }
  
  /**
   * Process a document file into chunks
   */
  async processDocument(filePath: string): Promise<ProcessedDocument> {
    this.trail.light(3001, {
      operation: 'document_processing_start',
      file: filePath
    });
    
    try {
      // Read document content
      const content = await this.readFile(filePath);
      const fileName = path.basename(filePath, path.extname(filePath));
      
      // Clean and prepare content
      const cleanedContent = this.cleanContent(content);
      
      // Extract metadata
      const metadata = this.extractMetadata(cleanedContent);
      
      // Create intelligent chunks
      const chunks = this.createChunks(cleanedContent, fileName);
      
      // Build processed document
      const processedDoc: ProcessedDocument = {
        id: this.generateId(fileName),
        title: fileName,
        source: filePath,
        processedDate: new Date().toISOString(),
        chunks,
        metadata: {
          totalChunks: chunks.length,
          methodologies: metadata.methodologies,
          techniques: metadata.techniques,
          avgChunkSize: chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length
        }
      };
      
      // Store in memory
      this.knowledgeStore.set(processedDoc.id, processedDoc);
      
      this.trail.light(3002, {
        operation: 'document_processing_complete',
        document_id: processedDoc.id,
        total_chunks: chunks.length,
        methodologies: metadata.methodologies.length
      });
      
      return processedDoc;
      
    } catch (error) {
      this.trail.fail(8000, error as Error);
      throw error;
    }
  }
  
  /**
   * Create intelligent chunks with overlap
   */
  private createChunks(content: string, source: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    
    // Split into sections first (by headers or double newlines)
    const sections = this.splitIntoSections(content);
    
    let globalChunkIndex = 0;
    
    for (const section of sections) {
      // Determine section type and keywords
      const sectionType = this.detectSectionType(section);
      const keywords = this.extractKeywords(section);
      const salesStage = this.detectSalesStage(section);
      const methodology = this.detectMethodology(section);
      
      // If section is small enough, keep as single chunk
      if (section.length <= this.chunkSize * 4) {
        chunks.push({
          id: `${source}_chunk_${globalChunkIndex}`,
          content: section.trim(),
          type: sectionType,
          keywords,
          salesStage,
          methodology,
          source,
          chunkIndex: globalChunkIndex++,
          totalChunks: -1 // Will be set later
        });
      } else {
        // Split large sections into overlapping chunks
        const sectionChunks = this.splitWithOverlap(section);
        for (const chunk of sectionChunks) {
          chunks.push({
            id: `${source}_chunk_${globalChunkIndex}`,
            content: chunk.trim(),
            type: sectionType,
            keywords: this.extractKeywords(chunk),
            salesStage,
            methodology,
            source,
            chunkIndex: globalChunkIndex++,
            totalChunks: -1
          });
        }
      }
    }
    
    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });
    
    return chunks;
  }
  
  /**
   * Split content into logical sections
   */
  private splitIntoSections(content: string): string[] {
    // Split by headers (# ## ###) or double newlines
    const sections: string[] = [];
    const lines = content.split('\n');
    let currentSection = '';
    
    for (const line of lines) {
      // Check if line is a header
      if (line.match(/^#{1,3}\s+/)) {
        if (currentSection.trim()) {
          sections.push(currentSection.trim());
        }
        currentSection = line + '\n';
      } else {
        currentSection += line + '\n';
      }
      
      // Also split on double newlines for long sections
      if (currentSection.includes('\n\n\n')) {
        const parts = currentSection.split('\n\n\n');
        sections.push(parts[0].trim());
        currentSection = parts[1] || '';
      }
    }
    
    if (currentSection.trim()) {
      sections.push(currentSection.trim());
    }
    
    return sections;
  }
  
  /**
   * Split text with overlap for context preservation
   */
  private splitWithOverlap(text: string): string[] {
    const chunks: string[] = [];
    const words = text.split(/\s+/);
    const wordsPerChunk = Math.floor(this.chunkSize / 4); // Rough estimate
    const overlapWords = Math.floor(this.chunkOverlap / 4);
    
    for (let i = 0; i < words.length; i += wordsPerChunk - overlapWords) {
      const chunk = words.slice(i, i + wordsPerChunk).join(' ');
      if (chunk.trim()) {
        chunks.push(chunk);
      }
    }
    
    return chunks;
  }
  
  /**
   * Detect section type based on content
   */
  private detectSectionType(content: string): DocumentChunk['type'] {
    const contentLower = content.toLowerCase();
    
    // Check for technique indicators
    if (contentLower.includes('technique') || 
        contentLower.includes('method') ||
        contentLower.includes('how to')) {
      return 'technique';
    }
    
    // Check for principle indicators
    if (contentLower.includes('principle') || 
        contentLower.includes('rule') ||
        contentLower.includes('always') ||
        contentLower.includes('never')) {
      return 'principle';
    }
    
    // Check for example indicators
    if (contentLower.includes('example') || 
        contentLower.includes('for instance') ||
        contentLower.includes('case study') ||
        contentLower.includes('scenario')) {
      return 'example';
    }
    
    // Check for framework indicators
    if (contentLower.includes('framework') || 
        contentLower.includes('process') ||
        contentLower.includes('step by step') ||
        contentLower.includes('system')) {
      return 'framework';
    }
    
    return 'general';
  }
  
  /**
   * Extract relevant keywords from content
   */
  private extractKeywords(content: string): string[] {
    const keywords: string[] = [];
    const contentLower = content.toLowerCase();
    
    // Check for Chris Voss specific techniques
    this.chrisVossKeywords.forEach(keyword => {
      if (contentLower.includes(keyword)) {
        keywords.push(keyword);
      }
    });
    
    // Check for general sales keywords
    const salesKeywords = [
      'objection', 'close', 'discovery', 'rapport',
      'value', 'pain point', 'decision', 'commitment',
      'price', 'budget', 'timeline', 'authority'
    ];
    
    salesKeywords.forEach(keyword => {
      if (contentLower.includes(keyword)) {
        keywords.push(keyword);
      }
    });
    
    return [...new Set(keywords)]; // Remove duplicates
  }
  
  /**
   * Detect which sales stage this content relates to
   */
  private detectSalesStage(content: string): string | undefined {
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('discovery') || 
        contentLower.includes('understand') ||
        contentLower.includes('explore')) {
      return 'discovery';
    }
    
    if (contentLower.includes('demo') || 
        contentLower.includes('present') ||
        contentLower.includes('show')) {
      return 'demo';
    }
    
    if (contentLower.includes('objection') || 
        contentLower.includes('concern') ||
        contentLower.includes('pushback')) {
      return 'objection_handling';
    }
    
    if (contentLower.includes('close') || 
        contentLower.includes('commitment') ||
        contentLower.includes('decision')) {
      return 'closing';
    }
    
    return undefined;
  }
  
  /**
   * Detect sales methodology
   */
  private detectMethodology(content: string): string | undefined {
    const contentLower = content.toLowerCase();
    
    // Chris Voss / Never Split
    if (this.chrisVossKeywords.some(kw => contentLower.includes(kw)) ||
        contentLower.includes('never split') ||
        contentLower.includes('chris voss')) {
      return 'Chris Voss';
    }
    
    // Other methodologies
    if (contentLower.includes('spin')) return 'SPIN';
    if (contentLower.includes('challenger')) return 'Challenger';
    if (contentLower.includes('sandler')) return 'Sandler';
    if (contentLower.includes('meddic')) return 'MEDDIC';
    
    return undefined;
  }
  
  /**
   * Extract metadata from content
   */
  private extractMetadata(content: string): {
    methodologies: string[];
    techniques: string[];
  } {
    const methodologies = new Set<string>();
    const techniques = new Set<string>();
    
    // Find methodologies
    if (content.toLowerCase().includes('chris voss') || 
        content.toLowerCase().includes('never split')) {
      methodologies.add('Chris Voss');
    }
    
    // Find techniques (Chris Voss specific)
    this.chrisVossKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) {
        techniques.add(keyword);
      }
    });
    
    return {
      methodologies: Array.from(methodologies),
      techniques: Array.from(techniques)
    };
  }
  
  /**
   * Clean content for processing
   */
  private cleanContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\t/g, '  ') // Replace tabs with spaces
      .replace(/\n{4,}/g, '\n\n\n') // Limit consecutive newlines
      .trim();
  }
  
  /**
   * Read file helper
   */
  private async readFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }
  
  /**
   * Generate unique ID
   */
  private generateId(source: string): string {
    return `doc_${source.replace(/\s+/g, '_')}_${Date.now()}`;
  }
  
  /**
   * Get all stored documents
   */
  getAllDocuments(): ProcessedDocument[] {
    return Array.from(this.knowledgeStore.values());
  }
  
  /**
   * Get relevant chunks for a query
   */
  getRelevantChunks(query: string, maxChunks: number = 5): DocumentChunk[] {
    const queryLower = query.toLowerCase();
    const allChunks: DocumentChunk[] = [];
    
    // Collect all chunks
    this.knowledgeStore.forEach(doc => {
      allChunks.push(...doc.chunks);
    });
    
    // Score chunks by relevance
    const scoredChunks = allChunks.map(chunk => {
      let score = 0;
      
      // Check for keyword matches
      chunk.keywords.forEach(keyword => {
        if (queryLower.includes(keyword) || keyword.includes(queryLower)) {
          score += 2;
        }
      });
      
      // Check content matches
      const contentLower = chunk.content.toLowerCase();
      const queryWords = queryLower.split(/\s+/);
      queryWords.forEach(word => {
        if (word.length > 3 && contentLower.includes(word)) {
          score += 1;
        }
      });
      
      // Boost Chris Voss techniques
      if (chunk.methodology === 'Chris Voss') {
        score += 1;
      }
      
      // Boost by type
      if (chunk.type === 'technique' || chunk.type === 'framework') {
        score += 0.5;
      }
      
      return { chunk, score };
    });
    
    // Sort by score and return top chunks
    scoredChunks.sort((a, b) => b.score - a.score);
    
    return scoredChunks
      .slice(0, maxChunks)
      .filter(item => item.score > 0)
      .map(item => item.chunk);
  }
  
  /**
   * Clear all stored documents
   */
  clearDocuments(): void {
    this.knowledgeStore.clear();
    this.trail.light(3003, {
      operation: 'knowledge_store_cleared'
    });
  }
}

// Export singleton instance
export const documentProcessor = new DocumentProcessor();