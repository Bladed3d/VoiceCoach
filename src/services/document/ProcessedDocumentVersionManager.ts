/**
 * Processed Document Version Manager
 * Manages multiple processed versions with different configurations
 * Tracks active version and configuration used
 */

import { BreadcrumbTrail } from '../../lib/breadcrumb-system';

interface ProcessedVersion {
  id: string;
  fileName: string;
  originalPath: string;
  processedDate: string;
  configuration: {
    maxWords: number;
    methodology: string;
    chunkSize: number;
    chunkOverlap: number;
    compressionEnabled: boolean;
    techniques: string[];
  };
  isActive: boolean;
  description?: string;
}

interface VersionManifest {
  documentName: string;
  originalPath: string;
  versions: ProcessedVersion[];
  activeVersionId: string | null;
  lastModified: string;
}

export class ProcessedDocumentVersionManager {
  private trail: BreadcrumbTrail;
  private manifestPath = 'rag/processed/version-manifest.json';
  
  constructor() {
    this.trail = new BreadcrumbTrail('ProcessedDocumentVersionManager');
  }
  
  /**
   * Register a new processed version
   */
  async registerVersion(
    documentName: string,
    originalPath: string,
    processedFileName: string,
    configuration: any,
    setAsActive: boolean = true
  ): Promise<void> {
    try {
      this.trail.light(3300, {
        operation: 'register_version',
        document: documentName,
        set_active: setAsActive
      });
      
      // Load or create manifest
      const manifest = await this.loadManifest(documentName) || {
        documentName,
        originalPath,
        versions: [],
        activeVersionId: null,
        lastModified: new Date().toISOString()
      };
      
      // Create version entry
      const version: ProcessedVersion = {
        id: `v_${Date.now()}`,
        fileName: processedFileName,
        originalPath,
        processedDate: new Date().toISOString(),
        configuration: {
          maxWords: configuration.maxWords || 25,
          methodology: configuration.methodology || 'Chris Voss',
          chunkSize: configuration.chunkSize || 512,
          chunkOverlap: configuration.chunkOverlap || 50,
          compressionEnabled: configuration.compressionEnabled || true,
          techniques: configuration.techniques || []
        },
        isActive: false,
        description: this.generateDescription(configuration)
      };
      
      // Add to versions
      manifest.versions.push(version);
      
      // Set as active if requested
      if (setAsActive) {
        // Deactivate all other versions
        manifest.versions.forEach(v => v.isActive = false);
        version.isActive = true;
        manifest.activeVersionId = version.id;
      }
      
      manifest.lastModified = new Date().toISOString();
      
      // Save manifest
      await this.saveManifest(manifest);
      
      this.trail.light(3301, {
        operation: 'version_registered',
        version_id: version.id,
        is_active: version.isActive
      });
      
      console.log(`✅ Registered version: ${version.description}`);
      if (version.isActive) {
        console.log('   Set as ACTIVE version for live coaching');
      }
      
    } catch (error) {
      this.trail.fail(8300, error as Error);
      throw error;
    }
  }
  
  /**
   * Get the active version for a document
   */
  async getActiveVersion(documentName: string): Promise<ProcessedVersion | null> {
    try {
      const manifest = await this.loadManifest(documentName);
      if (!manifest) return null;
      
      return manifest.versions.find(v => v.isActive) || null;
      
    } catch (error) {
      console.error('Failed to get active version:', error);
      return null;
    }
  }
  
  /**
   * Switch active version
   */
  async switchActiveVersion(documentName: string, versionId: string): Promise<boolean> {
    try {
      this.trail.light(3302, {
        operation: 'switch_active_version',
        document: documentName,
        version_id: versionId
      });
      
      const manifest = await this.loadManifest(documentName);
      if (!manifest) return false;
      
      // Find the version
      const targetVersion = manifest.versions.find(v => v.id === versionId);
      if (!targetVersion) {
        console.error(`Version ${versionId} not found`);
        return false;
      }
      
      // Update active states
      manifest.versions.forEach(v => {
        v.isActive = (v.id === versionId);
      });
      manifest.activeVersionId = versionId;
      manifest.lastModified = new Date().toISOString();
      
      // Save changes
      await this.saveManifest(manifest);
      
      console.log(`✅ Switched to version: ${targetVersion.description}`);
      
      return true;
      
    } catch (error) {
      this.trail.fail(8301, error as Error);
      return false;
    }
  }
  
  /**
   * List all versions for a document
   */
  async listVersions(documentName: string): Promise<ProcessedVersion[]> {
    try {
      const manifest = await this.loadManifest(documentName);
      return manifest?.versions || [];
    } catch (error) {
      console.error('Failed to list versions:', error);
      return [];
    }
  }
  
  /**
   * Generate description for a configuration
   */
  private generateDescription(config: any): string {
    const parts = [];
    parts.push(`${config.maxWords || 25}w`);
    parts.push(config.methodology || 'Chris Voss');
    parts.push(`${config.chunkSize || 512}tok`);
    if (config.compressionEnabled) parts.push('compressed');
    return parts.join(' | ');
  }
  
  /**
   * Load manifest from storage
   */
  private async loadManifest(documentName: string): Promise<VersionManifest | null> {
    try {
      // LED 3340: Loading version manifest
      this.trail.light(3340, {
        operation: 'load_manifest',
        document: documentName
      });
      
      if ((window as any).electronAPI?.loadVersionManifest) {
        const result = await (window as any).electronAPI.loadVersionManifest(documentName);
        
        if (result.success && result.manifest) {
          // LED 3341: Manifest loaded successfully
          this.trail.light(3341, {
            operation: 'manifest_loaded',
            versions: result.manifest.versions.length
          });
          return result.manifest;
        }
      }
      
      // Fallback to localStorage for development
      const key = `version_manifest_${documentName}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
      
    } catch (error) {
      // LED 8340: Failed to load manifest
      this.trail.fail(8340, error as Error);
      console.error('Failed to load manifest:', error);
      return null;
    }
  }
  
  /**
   * Save manifest to storage
   */
  private async saveManifest(manifest: VersionManifest): Promise<void> {
    try {
      // LED 3350: Saving version manifest
      this.trail.light(3350, {
        operation: 'save_manifest',
        document: manifest.documentName,
        versions: manifest.versions.length
      });
      
      if ((window as any).electronAPI?.saveVersionManifest) {
        const result = await (window as any).electronAPI.saveVersionManifest(
          manifest.documentName,
          JSON.stringify(manifest, null, 2)
        );
        
        if (result.success) {
          // LED 3351: Manifest saved successfully
          this.trail.light(3351, {
            operation: 'manifest_saved',
            path: result.path
          });
        } else {
          throw new Error(result.error || 'Failed to save manifest');
        }
      } else {
        // Fallback to localStorage for development
        const key = `version_manifest_${manifest.documentName}`;
        localStorage.setItem(key, JSON.stringify(manifest));
      }
    } catch (error) {
      // LED 8350: Failed to save manifest
      this.trail.fail(8350, error as Error);
      console.error('Failed to save manifest:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const versionManager = new ProcessedDocumentVersionManager();