// Knowledge Base Management Module
// Handles document upload, processing, chunking, and storage for RAG system

use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use log::{info, warn, error};
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeDocument {
    pub filename: String,
    pub content: String,
    pub chunks: Vec<String>,
    pub timestamp: i64,
    #[serde(rename = "type")]
    pub doc_type: Option<String>,
    #[serde(rename = "isAIGenerated")]
    pub is_ai_generated: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessingStats {
    pub total_documents: usize,
    pub total_chunks: usize,
    pub processing_time_ms: u64,
    pub success_rate: f32,
    pub knowledge_base_size: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KnowledgeBaseStats {
    pub total_documents: usize,
    pub total_chunks: usize,
    pub collection_size: usize,
    pub last_updated: String,
    pub health_status: String,
}

pub struct KnowledgeBaseManager {
    storage_path: PathBuf,
    knowledge_base: Vec<KnowledgeDocument>,
    max_chunk_size: usize,
}

impl KnowledgeBaseManager {
    pub fn new() -> Result<Self> {
        // Create storage directory in app data
        let app_dir = tauri::api::path::app_data_dir(&tauri::Config::default())
            .unwrap_or_else(|| PathBuf::from("./"));
        let storage_path = app_dir.join("voicecoach_knowledge");
        
        // Ensure directory exists
        fs::create_dir_all(&storage_path)?;
        
        info!("📁 LED 7001: Knowledge base storage initialized at {:?}", storage_path);
        
        let mut manager = Self {
            storage_path: storage_path.clone(),
            knowledge_base: Vec::new(),
            max_chunk_size: 8000, // Conservative chunk size for Ollama
        };
        
        // Load existing knowledge base
        manager.load_from_disk()?;
        
        Ok(manager)
    }
    
    /// Load knowledge base from disk
    fn load_from_disk(&mut self) -> Result<()> {
        let kb_file = self.storage_path.join("knowledge_base.json");
        
        if kb_file.exists() {
            info!("📖 LED 7002: Loading existing knowledge base from disk");
            let contents = fs::read_to_string(&kb_file)?;
            self.knowledge_base = serde_json::from_str(&contents)?;
            info!("✅ LED 7003: Loaded {} documents from disk", self.knowledge_base.len());
        } else {
            info!("📝 LED 7004: No existing knowledge base found, starting fresh");
        }
        
        Ok(())
    }
    
    /// Save knowledge base to disk
    pub fn save_to_disk(&self) -> Result<()> {
        let kb_file = self.storage_path.join("knowledge_base.json");
        
        info!("💾 LED 7010: Saving knowledge base to disk");
        let json = serde_json::to_string_pretty(&self.knowledge_base)?;
        fs::write(&kb_file, json)?;
        info!("✅ LED 7011: Saved {} documents to disk", self.knowledge_base.len());
        
        Ok(())
    }
    
    /// Process a single document file
    pub fn process_document_file(&mut self, file_path: &str) -> Result<KnowledgeDocument> {
        info!("📄 LED 7020: Processing document: {}", file_path);
        
        let path = Path::new(file_path);
        let filename = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown.txt")
            .to_string();
        
        // Read file content
        let content = fs::read_to_string(path)
            .context(format!("Failed to read file: {}", file_path))?;
        
        info!("📊 LED 7021: Document size: {} chars", content.len());
        
        // Create chunks
        let chunks = self.create_intelligent_chunks(&content);
        info!("✂️ LED 7022: Created {} chunks", chunks.len());
        
        let document = KnowledgeDocument {
            filename,
            content,
            chunks,
            timestamp: Utc::now().timestamp(),
            doc_type: Some("user_upload".to_string()),
            is_ai_generated: false,
        };
        
        Ok(document)
    }
    
    /// Process multiple files from a directory
    pub fn process_directory(&mut self, dir_path: &str, recursive: bool) -> Result<ProcessingStats> {
        info!("📁 LED 7030: Processing directory: {} (recursive: {})", dir_path, recursive);
        let start_time = std::time::Instant::now();
        
        let mut total_documents = 0;
        let mut total_chunks = 0;
        let mut successful = 0;
        
        // Collect all files to process
        let files = self.collect_files(dir_path, recursive)?;
        let total_files = files.len();
        
        info!("📋 LED 7031: Found {} files to process", total_files);
        
        for file_path in files {
            match self.process_document_file(&file_path) {
                Ok(doc) => {
                    total_chunks += doc.chunks.len();
                    self.add_document(doc)?;
                    successful += 1;
                    total_documents += 1;
                }
                Err(e) => {
                    error!("❌ LED 7032: Failed to process {}: {}", file_path, e);
                }
            }
        }
        
        // Save to disk after processing
        self.save_to_disk()?;
        
        let processing_time = start_time.elapsed().as_millis() as u64;
        let success_rate = if total_files > 0 {
            successful as f32 / total_files as f32
        } else {
            1.0
        };
        
        info!("✅ LED 7033: Processing complete. {} documents, {} chunks in {}ms", 
              total_documents, total_chunks, processing_time);
        
        Ok(ProcessingStats {
            total_documents,
            total_chunks,
            processing_time_ms: processing_time,
            success_rate,
            knowledge_base_size: self.knowledge_base.len(),
        })
    }
    
    /// Collect files from directory
    fn collect_files(&self, dir_path: &str, recursive: bool) -> Result<Vec<String>> {
        let mut files = Vec::new();
        let path = Path::new(dir_path);
        
        if !path.exists() {
            return Err(anyhow::anyhow!("Directory does not exist: {}", dir_path));
        }
        
        if path.is_file() {
            files.push(dir_path.to_string());
            return Ok(files);
        }
        
        // Supported file extensions
        let extensions = vec!["txt", "md", "pdf", "docx", "json"];
        
        if recursive {
            self.collect_files_recursive(path, &extensions, &mut files)?;
        } else {
            for entry in fs::read_dir(path)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_file() {
                    if let Some(ext) = path.extension() {
                        if extensions.contains(&ext.to_str().unwrap_or("")) {
                            files.push(path.to_str().unwrap_or("").to_string());
                        }
                    }
                }
            }
        }
        
        Ok(files)
    }
    
    /// Recursively collect files
    fn collect_files_recursive(&self, dir: &Path, extensions: &[&str], files: &mut Vec<String>) -> Result<()> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_dir() {
                self.collect_files_recursive(&path, extensions, files)?;
            } else if path.is_file() {
                if let Some(ext) = path.extension() {
                    if extensions.contains(&ext.to_str().unwrap_or("")) {
                        files.push(path.to_str().unwrap_or("").to_string());
                    }
                }
            }
        }
        Ok(())
    }
    
    /// Create intelligent chunks from document content
    pub fn create_intelligent_chunks(&self, content: &str) -> Vec<String> {
        let mut chunks = Vec::new();
        
        if content.len() <= self.max_chunk_size {
            // Document fits in single chunk
            chunks.push(content.to_string());
            return chunks;
        }
        
        // Split into chunks at natural boundaries
        let mut start_index = 0;
        
        while start_index < content.len() {
            let mut end_index = std::cmp::min(start_index + self.max_chunk_size, content.len());
            
            // If not at end, find good break point
            if end_index < content.len() {
                // Try to break at sentence
                if let Some(pos) = content[start_index..end_index].rfind(". ") {
                    end_index = start_index + pos + 1;
                }
                // Otherwise try paragraph
                else if let Some(pos) = content[start_index..end_index].rfind("\n\n") {
                    end_index = start_index + pos + 2;
                }
                // Otherwise break at any whitespace
                else if let Some(pos) = content[start_index..end_index].rfind(' ') {
                    end_index = start_index + pos;
                }
            }
            
            let chunk = content[start_index..end_index].trim().to_string();
            if chunk.len() > 100 {  // Only add substantial chunks
                chunks.push(chunk);
            }
            
            start_index = end_index;
        }
        
        chunks
    }
    
    /// Add document to knowledge base
    pub fn add_document(&mut self, document: KnowledgeDocument) -> Result<()> {
        info!("➕ LED 7040: Adding document {} to knowledge base", document.filename);
        
        // Remove existing document with same filename if it exists
        self.knowledge_base.retain(|d| d.filename != document.filename);
        
        // Add new document
        self.knowledge_base.push(document);
        
        Ok(())
    }
    
    /// Search knowledge base for relevant content
    pub fn search(&self, query: &str, max_results: usize) -> Vec<(String, f32)> {
        info!("🔍 LED 7050: Searching knowledge base for: {}", query);
        
        let query_lower = query.to_lowercase();
        let mut results = Vec::new();
        
        for doc in &self.knowledge_base {
            for chunk in &doc.chunks {
                let chunk_lower = chunk.to_lowercase();
                
                // Simple keyword matching (can be enhanced with embeddings)
                let score = self.calculate_relevance_score(&query_lower, &chunk_lower);
                
                if score > 0.1 {
                    results.push((chunk.clone(), score));
                }
            }
        }
        
        // Sort by score descending
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        
        // Return top N results
        results.truncate(max_results);
        
        info!("✅ LED 7051: Found {} relevant results", results.len());
        results
    }
    
    /// Calculate simple relevance score
    fn calculate_relevance_score(&self, query: &str, text: &str) -> f32 {
        let query_words: Vec<&str> = query.split_whitespace().collect();
        let mut matches = 0;
        
        for word in &query_words {
            if text.contains(word) {
                matches += 1;
            }
        }
        
        if query_words.is_empty() {
            return 0.0;
        }
        
        matches as f32 / query_words.len() as f32
    }
    
    /// Get knowledge base statistics
    pub fn get_stats(&self) -> KnowledgeBaseStats {
        let total_chunks: usize = self.knowledge_base.iter()
            .map(|d| d.chunks.len())
            .sum();
        
        let collection_size: usize = self.knowledge_base.iter()
            .map(|d| d.content.len())
            .sum();
        
        let last_updated = if let Some(latest) = self.knowledge_base.iter()
            .max_by_key(|d| d.timestamp) {
            chrono::DateTime::from_timestamp(latest.timestamp, 0)
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_else(|| "Unknown".to_string())
        } else {
            "Never".to_string()
        };
        
        KnowledgeBaseStats {
            total_documents: self.knowledge_base.len(),
            total_chunks,
            collection_size,
            last_updated,
            health_status: "healthy".to_string(),
        }
    }
    
    /// Get all documents
    pub fn get_documents(&self) -> &Vec<KnowledgeDocument> {
        &self.knowledge_base
    }
    
    /// Clear knowledge base
    pub fn clear(&mut self) -> Result<()> {
        info!("🗑️ LED 7060: Clearing knowledge base");
        self.knowledge_base.clear();
        self.save_to_disk()?;
        Ok(())
    }
    
    /// Remove document by filename
    pub fn remove_document(&mut self, filename: &str) -> Result<bool> {
        info!("🗑️ LED 7061: Removing document: {}", filename);
        
        let initial_len = self.knowledge_base.len();
        self.knowledge_base.retain(|d| d.filename != filename);
        let removed = self.knowledge_base.len() < initial_len;
        
        if removed {
            self.save_to_disk()?;
            info!("✅ LED 7062: Document removed successfully");
        } else {
            warn!("⚠️ LED 7063: Document not found: {}", filename);
        }
        
        Ok(removed)
    }
}

// Global knowledge base instance
use std::sync::Mutex;
use once_cell::sync::Lazy;

static KNOWLEDGE_BASE: Lazy<Mutex<Option<KnowledgeBaseManager>>> = Lazy::new(|| {
    Mutex::new(None)
});

/// Initialize knowledge base manager
pub fn initialize_knowledge_base() -> Result<()> {
    let manager = KnowledgeBaseManager::new()?;
    let mut kb = KNOWLEDGE_BASE.lock().unwrap();
    *kb = Some(manager);
    Ok(())
}

/// Get knowledge base manager instance
fn get_knowledge_base() -> Result<std::sync::MutexGuard<'static, Option<KnowledgeBaseManager>>> {
    Ok(KNOWLEDGE_BASE.lock().unwrap())
}

// ========== Tauri Commands ==========

#[tauri::command]
pub async fn select_files() -> Result<Vec<String>, String> {
    use tauri::api::dialog::blocking::FileDialogBuilder;
    
    info!("📂 LED 7090: Opening file selection dialog");
    
    let files = FileDialogBuilder::new()
        .set_title("Select Documents for Knowledge Base")
        .add_filter("Documents", &["txt", "md", "pdf", "docx", "json"])
        .add_filter("All Files", &["*"])
        .pick_files()
        .ok_or("No files selected")?;
    
    let paths: Vec<String> = files.iter()
        .filter_map(|p| p.to_str().map(|s| s.to_string()))
        .collect();
    
    info!("✅ LED 7091: Selected {} files", paths.len());
    Ok(paths)
}

#[tauri::command]
pub async fn select_directory() -> Result<String, String> {
    use tauri::api::dialog::blocking::FileDialogBuilder;
    
    info!("📁 LED 7092: Opening directory selection dialog");
    
    let dir = FileDialogBuilder::new()
        .set_title("Select Directory with Documents")
        .pick_folder()
        .ok_or("No directory selected")?;
    
    let path = dir.to_str()
        .ok_or("Invalid directory path")?
        .to_string();
    
    info!("✅ LED 7093: Selected directory: {}", path);
    Ok(path)
}

#[tauri::command]
pub fn process_single_file(file_path: String) -> Result<KnowledgeDocument, String> {
    info!("📤 LED 7100: Processing single file: {}", file_path);
    
    let mut kb = get_knowledge_base().map_err(|e| e.to_string())?;
    let manager = kb.as_mut().ok_or("Knowledge base not initialized")?;
    
    let doc = manager.process_document_file(&file_path)
        .map_err(|e| e.to_string())?;
    
    manager.add_document(doc.clone())
        .map_err(|e| e.to_string())?;
    
    manager.save_to_disk()
        .map_err(|e| e.to_string())?;
    
    Ok(doc)
}

#[tauri::command]
pub fn process_documents_batch(
    directory_path: String, 
    recursive: bool
) -> Result<ProcessingStats, String> {
    info!("📤 LED 7101: Processing directory: {} (recursive: {})", directory_path, recursive);
    
    let mut kb = get_knowledge_base().map_err(|e| e.to_string())?;
    let manager = kb.as_mut().ok_or("Knowledge base not initialized")?;
    
    manager.process_directory(&directory_path, recursive)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_knowledge(
    query: String,
    max_results: Option<usize>
) -> Result<Vec<(String, f32)>, String> {
    let kb = get_knowledge_base().map_err(|e| e.to_string())?;
    let manager = kb.as_ref().ok_or("Knowledge base not initialized")?;
    
    Ok(manager.search(&query, max_results.unwrap_or(5)))
}

#[tauri::command]
pub fn get_kb_stats() -> Result<KnowledgeBaseStats, String> {
    let kb = get_knowledge_base().map_err(|e| e.to_string())?;
    let manager = kb.as_ref().ok_or("Knowledge base not initialized")?;
    
    Ok(manager.get_stats())
}

#[tauri::command]
pub fn get_all_documents() -> Result<Vec<KnowledgeDocument>, String> {
    let kb = get_knowledge_base().map_err(|e| e.to_string())?;
    let manager = kb.as_ref().ok_or("Knowledge base not initialized")?;
    
    Ok(manager.get_documents().clone())
}

#[tauri::command]
pub fn add_document_to_kb(document: KnowledgeDocument) -> Result<(), String> {
    let mut kb = get_knowledge_base().map_err(|e| e.to_string())?;
    let manager = kb.as_mut().ok_or("Knowledge base not initialized")?;
    
    manager.add_document(document)
        .map_err(|e| e.to_string())?;
    
    manager.save_to_disk()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_document_from_kb(filename: String) -> Result<bool, String> {
    let mut kb = get_knowledge_base().map_err(|e| e.to_string())?;
    let manager = kb.as_mut().ok_or("Knowledge base not initialized")?;
    
    manager.remove_document(&filename)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_knowledge_base() -> Result<(), String> {
    let mut kb = get_knowledge_base().map_err(|e| e.to_string())?;
    let manager = kb.as_mut().ok_or("Knowledge base not initialized")?;
    
    manager.clear()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn process_text_content(
    filename: String,
    content: String,
    doc_type: Option<String>
) -> Result<KnowledgeDocument, String> {
    info!("📝 LED 7102: Processing text content: {}", filename);
    
    let mut kb = get_knowledge_base().map_err(|e| e.to_string())?;
    let manager = kb.as_mut().ok_or("Knowledge base not initialized")?;
    
    // Create chunks from content
    let chunks = manager.create_intelligent_chunks(&content);
    
    let document = KnowledgeDocument {
        filename,
        content,
        chunks,
        timestamp: Utc::now().timestamp(),
        doc_type,
        is_ai_generated: false,
    };
    
    manager.add_document(document.clone())
        .map_err(|e| e.to_string())?;
    
    manager.save_to_disk()
        .map_err(|e| e.to_string())?;
    
    Ok(document)
}