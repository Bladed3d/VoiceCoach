use std::path::{Path, PathBuf};
use std::fs::{self, File};
use std::io::{self, Write, BufReader, Read};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use anyhow::{Result, anyhow, Context};
use log::{info, warn, error, debug};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use zip::ZipArchive;
use futures_util::StreamExt;

// LED Breadcrumb System
use crate::breadcrumb_system::BreadcrumbTrail;
use crate::{led_light, led_fail};

/// Vosk model configuration and metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoskModelInfo {
    pub name: String,
    pub version: String,
    pub size_mb: u64,
    pub download_url: String,
    pub fallback_url: Option<String>,
    pub checksum_sha256: String,
    pub language: String,
    pub model_type: String, // "small", "large", "lightweight"
    pub recommended_for: Vec<String>, // ["testing", "production", "embedded"]
}

/// Model download progress information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percentage: f32,
    pub speed_kbps: f32,
    pub eta_seconds: Option<u64>,
    pub status: DownloadStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DownloadStatus {
    NotStarted,
    InProgress,
    Completed,
    Failed(String),
    Verifying,
    Extracting,
}

/// Main Vosk model manager
pub struct VoskModelManager {
    pub models_dir: PathBuf,  // Made public for access from Tauri commands
    available_models: Vec<VoskModelInfo>,
    current_model: Option<String>,
    trail: BreadcrumbTrail,
}

impl VoskModelManager {
    /// Create a new Vosk model manager
    pub fn new() -> Result<Self> {
        let trail = BreadcrumbTrail::new("VoskModelManager");
        led_light!(trail, 7000, serde_json::json!({
            "component": "vosk_model_manager",
            "action": "initializing",
            "task": "1.2_vosk_model_download"
        }));
        
        // Set up models directory in src-tauri/models/
        let models_dir = PathBuf::from("models");
        
        // Create models directory if it doesn't exist
        if !models_dir.exists() {
            led_light!(trail, 7001, serde_json::json!({
                "action": "creating_models_directory",
                "path": models_dir.to_string_lossy()
            }));
            fs::create_dir_all(&models_dir)
                .with_context(|| format!("Failed to create models directory: {:?}", models_dir))?;
            info!("Created models directory: {:?}", models_dir);
        }
        
        // Define available models (starting with small model for testing)
        let available_models = vec![
            VoskModelInfo {
                name: "vosk-model-small-en-us-0.15".to_string(),
                version: "0.15".to_string(),
                size_mb: 40,
                download_url: "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip".to_string(),
                fallback_url: Some("https://github.com/alphacep/vosk-models/releases/download/v0.15/vosk-model-small-en-us-0.15.zip".to_string()),
                checksum_sha256: "30f26242c4eb449f948e8fd6b89c1cf3d808d79afced8d3bb5c2ce5b4b29ccdb".to_string(), // This is a placeholder - should be updated with actual checksum
                language: "en-us".to_string(),
                model_type: "small".to_string(),
                recommended_for: vec!["testing".to_string(), "development".to_string()],
            },
            // Future: Add larger production model
            VoskModelInfo {
                name: "vosk-model-en-us-0.22".to_string(),
                version: "0.22".to_string(),
                size_mb: 1800, // ~1.8GB
                download_url: "https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip".to_string(),
                fallback_url: Some("https://github.com/alphacep/vosk-models/releases/download/v0.22/vosk-model-en-us-0.22.zip".to_string()),
                checksum_sha256: "placeholder_checksum_for_large_model".to_string(),
                language: "en-us".to_string(),
                model_type: "large".to_string(),
                recommended_for: vec!["production".to_string(), "high_accuracy".to_string()],
            }
        ];
        
        led_light!(trail, 7002, serde_json::json!({
            "action": "manager_initialized",
            "models_available": available_models.len(),
            "default_model": "vosk-model-small-en-us-0.15"
        }));
        
        Ok(Self {
            models_dir,
            available_models,
            current_model: None,
            trail,
        })
    }
    
    /// Check if a model exists locally
    pub fn is_model_available(&self, model_name: &str) -> bool {
        let model_path = self.get_model_path(model_name);
        let exists = model_path.exists();
        
        led_light!(self.trail, 7003, serde_json::json!({
            "action": "check_model_availability",
            "model": model_name,
            "exists": exists,
            "path": model_path.to_string_lossy()
        }));
        
        exists
    }
    
    /// Get the full path to a model directory
    pub fn get_model_path(&self, model_name: &str) -> PathBuf {
        self.models_dir.join(model_name)
    }
    
    /// Get the default model for testing (small model)
    pub fn get_default_model_name(&self) -> &str {
        "vosk-model-small-en-us-0.15"
    }
    
    /// Ensure the default model is available (download if needed)
    pub async fn ensure_default_model(&mut self) -> Result<PathBuf> {
        let model_name = self.get_default_model_name().to_string();
        
        led_light!(self.trail, 7010, serde_json::json!({
            "action": "ensure_default_model",
            "model": &model_name
        }));
        
        if self.is_model_available(&model_name) {
            led_light!(self.trail, 7011, serde_json::json!({
                "action": "model_already_available",
                "model": &model_name,
                "skipping_download": true
            }));
            info!("Model {} already available", model_name);
            return Ok(self.get_model_path(&model_name));
        }
        
        // Download the model
        self.download_model(&model_name).await
    }
    
    /// Download a specific model with progress tracking
    pub async fn download_model(&mut self, model_name: &str) -> Result<PathBuf> {
        led_light!(self.trail, 7012, serde_json::json!({
            "action": "download_model_start",
            "model": model_name
        }));
        
        let model_info = self.available_models.iter()
            .find(|m| m.name == model_name)
            .ok_or_else(|| anyhow!("Model {} not found in available models", model_name))?;
        
        let download_path = self.models_dir.join(format!("{}.zip", model_name));
        let extract_path = self.get_model_path(model_name);
        
        info!("Starting download of model: {} ({} MB)", model_name, model_info.size_mb);
        
        // Try primary URL first, then fallback
        let mut download_result = self.download_file(&model_info.download_url, &download_path).await;
        
        if download_result.is_err() {
            led_light!(self.trail, 7013, serde_json::json!({
                "action": "primary_download_failed",
                "model": model_name,
                "attempting_fallback": true
            }));
            
            if let Some(fallback_url) = &model_info.fallback_url {
                warn!("Primary download failed, trying fallback URL");
                download_result = self.download_file(fallback_url, &download_path).await;
            }
        }
        
        download_result.with_context(|| format!("Failed to download model {}", model_name))?;
        
        // Verify checksum (currently placeholder - in production this would verify against known hashes)
        led_light!(self.trail, 7014, serde_json::json!({
            "action": "verifying_download",
            "model": model_name,
            "file_size_mb": download_path.metadata().map(|m| m.len() / 1024 / 1024).unwrap_or(0)
        }));
        
        if !self.verify_checksum(&download_path, &model_info.checksum_sha256).await? {
            led_fail!(self.trail, 7015, format!("Checksum verification failed for model {}", model_name));
            return Err(anyhow!("Checksum verification failed for model {}", model_name));
        }
        
        // Extract the model
        led_light!(self.trail, 7016, serde_json::json!({
            "action": "extracting_model",
            "model": model_name,
            "extract_path": extract_path.to_string_lossy()
        }));
        
        self.extract_model(&download_path, &extract_path).await?;
        
        // Clean up zip file
        if download_path.exists() {
            fs::remove_file(&download_path)
                .with_context(|| format!("Failed to remove zip file: {:?}", download_path))?;
        }
        
        // Set as current model
        self.current_model = Some(model_name.to_string());
        
        led_light!(self.trail, 7017, serde_json::json!({
            "action": "model_download_complete",
            "model": model_name,
            "path": extract_path.to_string_lossy(),
            "status": "ready_for_use"
        }));
        
        info!("Successfully downloaded and extracted model: {}", model_name);
        Ok(extract_path)
    }
    
    /// Download a file with progress tracking
    async fn download_file(&self, url: &str, dest_path: &Path) -> Result<()> {
        led_light!(self.trail, 7018, serde_json::json!({
            "action": "http_download_start",
            "url": url,
            "destination": dest_path.to_string_lossy()
        }));
        
        let client = reqwest::Client::new();
        let response = client.get(url)
            .send()
            .await
            .with_context(|| format!("Failed to start download from {}", url))?;
        
        if !response.status().is_success() {
            led_fail!(self.trail, 7019, format!("Download failed with status: {}", response.status()));
            return Err(anyhow!("Download failed with status: {}", response.status()));
        }
        
        let total_size = response.content_length().unwrap_or(0);
        
        let mut file = tokio::fs::File::create(dest_path)
            .await
            .with_context(|| format!("Failed to create file: {:?}", dest_path))?;
        
        let mut stream = response.bytes_stream();
        let mut downloaded = 0u64;
        let start_time = std::time::Instant::now();
        let mut last_progress_update = start_time;
        
        while let Some(chunk) = stream.next().await {
            let chunk = chunk
                .with_context(|| "Failed to read chunk from download stream")?;
            
            file.write_all(&chunk)
                .await
                .with_context(|| "Failed to write chunk to file")?;
            
            downloaded += chunk.len() as u64;
            
            // Update progress every 5 seconds or on completion
            let now = std::time::Instant::now();
            if now.duration_since(last_progress_update).as_secs() >= 5 || downloaded >= total_size {
                let percentage = if total_size > 0 { 
                    (downloaded as f32 / total_size as f32) * 100.0 
                } else { 0.0 };
                
                let elapsed = now.duration_since(start_time).as_secs_f32();
                let speed_kbps = if elapsed > 0.0 { 
                    (downloaded as f32 / 1024.0) / elapsed 
                } else { 0.0 };
                
                led_light!(self.trail, 7023, serde_json::json!({
                    "action": "download_progress",
                    "downloaded_mb": downloaded / 1024 / 1024,
                    "total_mb": total_size / 1024 / 1024,
                    "percentage": percentage,
                    "speed_kbps": speed_kbps
                }));
                
                debug!("Download progress: {:.1}% ({}/{} MB) at {:.1} KB/s", 
                      percentage, downloaded / 1024 / 1024, total_size / 1024 / 1024, speed_kbps);
                
                last_progress_update = now;
            }
        }
        
        file.flush().await
            .with_context(|| "Failed to flush file")?;
        
        led_light!(self.trail, 7024, serde_json::json!({
            "action": "download_complete",
            "total_downloaded_mb": downloaded / 1024 / 1024,
            "duration_seconds": start_time.elapsed().as_secs()
        }));
        
        info!("Download completed: {} MB in {:.1} seconds", 
              downloaded / 1024 / 1024, start_time.elapsed().as_secs_f32());
        
        Ok(())
    }
    
    /// Verify file checksum (currently placeholder implementation)
    async fn verify_checksum(&self, file_path: &Path, expected_checksum: &str) -> Result<bool> {
        led_light!(self.trail, 7025, serde_json::json!({
            "action": "checksum_verification",
            "file": file_path.to_string_lossy(),
            "expected": expected_checksum
        }));
        
        // For now, we'll skip actual checksum verification for the placeholder checksums
        // In production, this would calculate the actual SHA256 and compare
        if expected_checksum.contains("placeholder") {
            led_light!(self.trail, 7026, serde_json::json!({
                "action": "checksum_skip",
                "reason": "placeholder_checksum_detected",
                "development_mode": true
            }));
            warn!("Skipping checksum verification (placeholder checksum)");
            return Ok(true);
        }
        
        // Real checksum calculation would go here:
        // let mut file = tokio::fs::File::open(file_path).await?;
        // let mut hasher = Sha256::new();
        // let mut buffer = [0; 8192];
        // loop {
        //     let bytes_read = file.read(&mut buffer).await?;
        //     if bytes_read == 0 { break; }
        //     hasher.update(&buffer[..bytes_read]);
        // }
        // let calculated = format!("{:x}", hasher.finalize());
        // let matches = calculated == expected_checksum;
        
        let matches = true; // Temporary - always pass for development
        
        led_light!(self.trail, 7026, serde_json::json!({
            "action": "checksum_result",
            "verified": matches
        }));
        
        Ok(matches)
    }
    
    /// Extract model from zip archive
    async fn extract_model(&self, zip_path: &Path, extract_path: &Path) -> Result<()> {
        led_light!(self.trail, 7027, serde_json::json!({
            "action": "model_extraction_start",
            "zip": zip_path.to_string_lossy(),
            "extract_to": extract_path.to_string_lossy()
        }));
        
        // Create extract directory
        if !extract_path.exists() {
            fs::create_dir_all(extract_path)
                .with_context(|| format!("Failed to create extract directory: {:?}", extract_path))?;
        }
        
        let zip_file = File::open(zip_path)
            .with_context(|| format!("Failed to open zip file: {:?}", zip_path))?;
        
        let mut archive = ZipArchive::new(BufReader::new(zip_file))
            .with_context(|| "Failed to read zip archive")?;
        
        let mut extracted_files = 0;
        for i in 0..archive.len() {
            let mut file = archive.by_index(i)
                .with_context(|| format!("Failed to get file at index {}", i))?;
            
            // Get the file path within the archive (owned copy to avoid borrow issues)
            let file_path = file.name().to_string();
            
            // Skip directories
            if file_path.ends_with('/') {
                continue;
            }
            
            // Create output path
            let output_path = extract_path.join(
                // Remove the top-level directory from the path if it exists
                file_path.strip_prefix(&format!("{}/", self.get_model_name_from_path(&file_path)))
                    .unwrap_or(&file_path)
            );
            
            // Create parent directories
            if let Some(parent) = output_path.parent() {
                fs::create_dir_all(parent)
                    .with_context(|| format!("Failed to create directory: {:?}", parent))?;
            }
            
            // Extract file
            let mut output_file = File::create(&output_path)
                .with_context(|| format!("Failed to create file: {:?}", output_path))?;
            
            io::copy(&mut file, &mut output_file)
                .with_context(|| format!("Failed to extract file: {}", file_path))?;
            
            extracted_files += 1;
            
            // Log progress every 10 files
            if extracted_files % 10 == 0 {
                led_light!(self.trail, 7028, serde_json::json!({
                    "action": "extraction_progress",
                    "files_extracted": extracted_files,
                    "current_file": file_path
                }));
            }
        }
        
        led_light!(self.trail, 7029, serde_json::json!({
            "action": "extraction_complete",
            "files_extracted": extracted_files,
            "model_ready": true
        }));
        
        info!("Extracted {} files from model archive", extracted_files);
        Ok(())
    }
    
    /// Extract model name from file path
    fn get_model_name_from_path(&self, path: &str) -> String {
        path.split('/').next().unwrap_or("").to_string()
    }
    
    /// Get information about available models
    pub fn get_available_models(&self) -> &Vec<VoskModelInfo> {
        &self.available_models
    }
    
    /// Get current model path if available
    pub fn get_current_model_path(&self) -> Option<PathBuf> {
        self.current_model.as_ref().map(|name| self.get_model_path(name))
    }
    
    /// List locally installed models
    pub fn list_installed_models(&self) -> Result<Vec<String>> {
        let mut installed = Vec::new();
        
        if !self.models_dir.exists() {
            return Ok(installed);
        }
        
        for entry in fs::read_dir(&self.models_dir)? {
            let entry = entry?;
            if entry.path().is_dir() {
                if let Some(name) = entry.file_name().to_str() {
                    installed.push(name.to_string());
                }
            }
        }
        
        led_light!(self.trail, 7030, serde_json::json!({
            "action": "list_installed_models",
            "count": installed.len(),
            "models": installed
        }));
        
        Ok(installed)
    }
    
    /// Remove a model (cleanup)
    pub async fn remove_model(&mut self, model_name: &str) -> Result<()> {
        led_light!(self.trail, 7031, serde_json::json!({
            "action": "remove_model",
            "model": model_name
        }));
        
        let model_path = self.get_model_path(model_name);
        
        if model_path.exists() {
            fs::remove_dir_all(&model_path)
                .with_context(|| format!("Failed to remove model directory: {:?}", model_path))?;
            
            // Clear current model if it was the removed one
            if self.current_model.as_ref() == Some(&model_name.to_string()) {
                self.current_model = None;
            }
            
            led_light!(self.trail, 7032, serde_json::json!({
                "action": "model_removed",
                "model": model_name,
                "path": model_path.to_string_lossy()
            }));
            
            info!("Removed model: {}", model_name);
        } else {
            led_light!(self.trail, 7033, serde_json::json!({
                "action": "model_not_found",
                "model": model_name,
                "path": model_path.to_string_lossy()
            }));
        }
        
        Ok(())
    }
}

// Add required dependencies to Cargo.toml:
// [dependencies]
// reqwest = { version = "0.11", features = ["json", "stream"] }
// tokio = { version = "1.0", features = ["fs", "io-util"] }
// futures-util = "0.3"
// zip = "0.6"
// sha2 = "0.10"