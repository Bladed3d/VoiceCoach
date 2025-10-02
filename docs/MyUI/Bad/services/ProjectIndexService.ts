/**
 * Project Index Service - Codebase Analysis & Summarization
 * Scans project files and creates context for AI queries
 */

import { ProjectContext, CodebaseIndex, FileEntry } from '../types/myui.types';
import { breadcrumb } from '../../../src/lib/breadcrumbs';

export class ProjectIndexService {
  private context: ProjectContext | null = null;
  private readonly CONTEXT_FILE = 'myui_project_context.json';

  constructor() {
    breadcrumb(7080, 'ProjectIndexService initialized');
    this.loadContext();
  }

  public async loadContext(): Promise<ProjectContext | null> {
    breadcrumb(7081, 'Loading project context');
    
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const contextData = await window.electronAPI.readFile(this.CONTEXT_FILE);
        if (contextData) {
          this.context = JSON.parse(contextData);
          breadcrumb(7082, 'Project context loaded successfully');
          return this.context;
        }
      } catch (error) {
        console.warn('Failed to load project context:', error);
      }
    }
    
    return null;
  }

  public async saveContext(context: ProjectContext): Promise<void> {
    breadcrumb(7083, 'Saving project context');
    
    this.context = context;
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        await window.electronAPI.writeFile(
          this.CONTEXT_FILE, 
          JSON.stringify(context, null, 2)
        );
        breadcrumb(7084, 'Project context saved successfully');
      } catch (error) {
        console.error('Failed to save project context:', error);
      }
    }
  }

  public async scanProjectDirectory(rootPath: string): Promise<CodebaseIndex> {
    breadcrumb(7090, `Scanning project directory: ${rootPath}`);
    
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const files = await window.electronAPI.scanDirectory(rootPath);
        const fileEntries = await this.processFiles(files);
        
        const index: CodebaseIndex = {
          files: fileEntries,
          summary: await this.generateCodebaseSummary(fileEntries),
          keyComponents: this.extractKeyComponents(fileEntries),
          lastScanned: Date.now()
        };

        breadcrumb(7091, `Project scan completed. Found ${fileEntries.length} files`);
        return index;
      } catch (error) {
        breadcrumb(7092, `Project scan failed: ${error.message}`);
        throw error;
      }
    }
    
    throw new Error('Electron API not available');
  }

  private async processFiles(filePaths: string[]): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    const relevantExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.md', '.json'];
    
    for (const filePath of filePaths) {
      const isRelevant = relevantExtensions.some(ext => filePath.endsWith(ext));
      if (!isRelevant || filePath.includes('node_modules') || filePath.includes('.git')) {
        continue;
      }

      try {
        const content = await window.electronAPI.readFile(filePath);
        const entry = await this.analyzeFile(filePath, content);
        entries.push(entry);
      } catch (error) {
        console.warn(`Failed to process file ${filePath}:`, error);
      }
    }

    return entries;
  }

  private async analyzeFile(filePath: string, content: string): Promise<FileEntry> {
    const type = this.determineFileType(filePath);
    const keyFunctions = this.extractKeyFunctions(content, type);
    const summary = this.generateFileSummary(filePath, content, type);

    return {
      path: filePath,
      type,
      summary,
      keyFunctions
    };
  }

  private determineFileType(filePath: string): FileEntry['type'] {
    if (filePath.includes('/components/')) return 'component';
    if (filePath.includes('/services/')) return 'service';
    if (filePath.includes('/types/') || filePath.endsWith('.d.ts')) return 'type';
    if (filePath.includes('config') || filePath.endsWith('.json')) return 'config';
    return 'other';
  }

  private extractKeyFunctions(content: string, type: FileEntry['type']): string[] {
    const functions: string[] = [];
    
    // Extract function/method names
    const functionRegex = /(?:function\s+|const\s+|let\s+|var\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[=:]?\s*(?:function|\(|async)/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      functions.push(match[1]);
    }

    // Extract class methods
    const methodRegex = /(?:public\s+|private\s+|protected\s+)?(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*[{:]/g;
    while ((match = methodRegex.exec(content)) !== null) {
      if (!['constructor', 'render'].includes(match[1])) {
        functions.push(match[1]);
      }
    }

    // React components
    if (type === 'component') {
      const componentRegex = /(?:export\s+(?:default\s+)?(?:const\s+|function\s+))([A-Z][a-zA-Z0-9_$]*)/g;
      while ((match = componentRegex.exec(content)) !== null) {
        functions.push(match[1]);
      }
    }

    return [...new Set(functions)].slice(0, 10); // Limit to top 10
  }

  private generateFileSummary(filePath: string, content: string, type: FileEntry['type']): string {
    const lines = content.split('\n').length;
    const fileName = filePath.split('/').pop();
    
    // Extract main purpose from comments or exports
    const commentMatch = content.match(/\/\*\*?\s*(.*?)\s*\*\//s);
    const comment = commentMatch ? commentMatch[1].split('\n')[0].trim() : '';
    
    let summary = `${fileName} (${lines} lines)`;
    if (comment) {
      summary += ` - ${comment}`;
    }
    
    switch (type) {
      case 'component':
        summary += ` - React component`;
        break;
      case 'service':
        summary += ` - Service class`;
        break;
      case 'type':
        summary += ` - Type definitions`;
        break;
    }
    
    return summary;
  }

  private extractKeyComponents(fileEntries: FileEntry[]): string[] {
    const components: string[] = [];
    
    for (const entry of fileEntries) {
      if (entry.type === 'component' || entry.type === 'service') {
        const fileName = entry.path.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '');
        if (fileName) {
          components.push(fileName);
        }
      }
    }
    
    return components.slice(0, 20); // Top 20 key components
  }

  private async generateCodebaseSummary(fileEntries: FileEntry[]): Promise<string> {
    const componentCount = fileEntries.filter(f => f.type === 'component').length;
    const serviceCount = fileEntries.filter(f => f.type === 'service').length;
    const typeCount = fileEntries.filter(f => f.type === 'type').length;
    const totalLines = fileEntries.reduce((sum, entry) => {
      const match = entry.summary.match(/\((\d+) lines\)/);
      return sum + (match ? parseInt(match[1]) : 0);
    }, 0);

    return `
VoiceCoach V2 codebase overview:
- ${fileEntries.length} files analyzed
- ${componentCount} components, ${serviceCount} services, ${typeCount} type definitions
- ~${totalLines.toLocaleString()} total lines of code
- Main technologies: Electron, React, TypeScript
- Architecture: Desktop app with main/renderer process separation

Key areas:
- Audio processing and WebSocket transcription
- Real-time coaching suggestions and analysis
- RAG-based document processing for sales coaching
- LED breadcrumb debugging system (ranges 1000-9099)
`.trim();
  }

  public async updateProjectContext(summary?: string): Promise<ProjectContext> {
    breadcrumb(7095, 'Updating project context');
    
    const rootPath = process.cwd();
    const codebaseIndex = await this.scanProjectDirectory(rootPath);
    
    const context: ProjectContext = {
      summary: summary || codebaseIndex.summary,
      lastUpdated: Date.now(),
      codebaseIndex
    };
    
    await this.saveContext(context);
    return context;
  }

  public getContext(): ProjectContext | null {
    return this.context;
  }

  public async generateContextForPrompt(): Promise<string> {
    if (!this.context) {
      await this.loadContext();
    }
    
    if (!this.context) {
      return '';
    }
    
    const { summary, codebaseIndex } = this.context;
    const keyFiles = codebaseIndex?.files
      .filter(f => f.type === 'component' || f.type === 'service')
      .slice(0, 10)
      .map(f => `- ${f.path}: ${f.summary}`)
      .join('\n') || '';
    
    return `
## Project Context

${summary}

### Key Files:
${keyFiles}

### Key Components: ${codebaseIndex?.keyComponents.join(', ') || 'None'}

Last updated: ${new Date(this.context.lastUpdated).toLocaleString()}
`.trim();
  }
}