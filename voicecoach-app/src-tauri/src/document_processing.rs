// VoiceCoach Document Processing Integration
// Rust-Python bridge for document ingestion and knowledge base management
// With LED breadcrumb debugging infrastructure

use std::process::Command;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};
use log::{info, error};

// LED breadcrumb trail for Rust operations
// Uses console output for debugging - Rust logs will be prefixed with [TAURI] in frontend
#[derive(Debug)]
pub struct RustBreadcrumbTrail {
    component_name: String,
    start_time: u64,
}

impl RustBreadcrumbTrail {
    pub fn new(component_name: &str) -> Self {
        let start_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        Self {
            component_name: component_name.to_string(),
            start_time,
        }
    }
    
    pub fn light(&self, led_id: u32, operation: &str, data: Option<&str>) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        let duration = now - self.start_time;
        
        let icon = match led_id {
            100..=199 => "🔴", // User interactions (handled in frontend)
            200..=299 => "🟢", // API operations (Tauri commands)
            300..=399 => "🟡", // State management
            400..=499 => "🟣", // UI operations (handled in frontend)
            500..=599 => "🔵", // Validation & processing
            _ => "💡",
        };
        
        info!(
            "{} {:03} ✅ {} [{}] {} ms {}",
            icon,
            led_id,
            operation,
            self.component_name,
            duration,
            data.unwrap_or("")
        );
    }
    
    pub fn fail(&self, led_id: u32, operation: &str, error: &str) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        let duration = now - self.start_time;
        
        error!(
            "💡 {:03} ❌ {} [{}] {} ms ERROR: {}",
            led_id,
            operation,
            self.component_name,
            duration,
            error
        );
    }
    
    pub fn performance_checkpoint(&self, led_id: u32, operation: &str, duration_ms: u64, metadata: Option<&str>) {
        let warning = match operation {
            "python_script_execution" if duration_ms > 5000 => {
                Some(format!("Python script execution slow: {}ms", duration_ms))
            },
            "document_processing" if duration_ms > 10000 => {
                Some(format!("Document processing exceeded 10s: {}ms", duration_ms))
            },
            "knowledge_search" if duration_ms > 2000 => {
                Some(format!("Knowledge search slow: {}ms", duration_ms))
            },
            _ => None,
        };
        
        let data_str = if let Some(warning) = warning {
            format!("{} WARNING: {}", metadata.unwrap_or(""), warning)
        } else {
            metadata.unwrap_or("").to_string()
        };
        
        self.light(led_id, operation, if data_str.is_empty() { None } else { Some(&data_str) });
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentProcessingStats {
    pub total_documents: usize,
    pub total_chunks: usize,
    pub processing_time_ms: u64,
    pub success_rate: f64,
    pub knowledge_base_size: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KnowledgeSearchResult {
    pub content: String,
    pub similarity_score: f64,
    pub source_document: String,
    pub metadata: std::collections::HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CoachingSuggestion {
    pub suggestion_type: String,
    pub confidence: f64,
    pub content: String,
    pub source_document: String,
    pub methodology: Option<String>,
}

// Tauri command for processing documents into knowledge base
#[tauri::command]
pub async fn process_documents(
    directory_path: String,
    recursive: bool
) -> Result<DocumentProcessingStats, String> {
    let trail = RustBreadcrumbTrail::new("TauriDocumentProcessor");
    
    // LED 201: Tauri command invocation start
    trail.light(201, "PROCESS_DOCUMENTS_COMMAND_START", Some(&format!("directory: {}", directory_path)));
    
    // LED 507: Directory validation
    trail.light(507, "DIRECTORY_VALIDATION_START", None);
    if directory_path.is_empty() {
        trail.fail(507, "DIRECTORY_VALIDATION_FAILED", "Empty directory path provided");
        return Err("Directory path cannot be empty".to_string());
    }
    trail.light(508, "DIRECTORY_VALIDATION_COMPLETE", None);
    
    // LED 220: Python script execution start
    trail.light(220, "PYTHON_SCRIPT_EXECUTE_START", Some("voicecoach_knowledge_integration.py"));
    
    let python_script = get_knowledge_integration_script().map_err(|e| {
        trail.fail(220, "PYTHON_SCRIPT_PATH_FAILED", &e);
        e
    })?;
    
    let mut cmd = Command::new("python");
    cmd.arg(&python_script)
        .arg("process-directory")
        .arg(&directory_path);
    
    if recursive {
        cmd.arg("--recursive");
    }
    
    let start_time = SystemTime::now();
    let output = cmd.output().map_err(|e| {
        trail.fail(220, "PYTHON_SCRIPT_EXECUTE_FAILED", &format!("Command execution failed: {}", e));
        format!("Failed to execute document processing: {}", e)
    })?;
    
    let execution_time = start_time.elapsed().unwrap().as_millis() as u64;
    
    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        trail.fail(220, "PYTHON_SCRIPT_EXECUTE_FAILED", &error_msg);
        return Err(format!("Document processing failed: {}", error_msg));
    }
    
    // LED 221: Python script execution complete
    trail.performance_checkpoint(221, "python_script_execution", execution_time, 
        Some(&format!("processed directory: {}", directory_path)));
    
    // LED 510: Data processing start
    trail.light(510, "DATA_PROCESSING_START", Some("parsing JSON response"));
    
    let result_str = String::from_utf8_lossy(&output.stdout);
    let stats: DocumentProcessingStats = serde_json::from_str(&result_str).map_err(|e| {
        trail.fail(510, "DATA_PROCESSING_FAILED", &format!("JSON parse failed: {}", e));
        format!("Failed to parse processing stats: {}", e)
    })?;
    
    // LED 511: Data processing complete
    trail.light(511, "DATA_PROCESSING_COMPLETE", 
        Some(&format!("docs: {}, chunks: {}", stats.total_documents, stats.total_chunks)));
    
    // LED 202: Tauri command completion
    trail.light(202, "PROCESS_DOCUMENTS_COMMAND_COMPLETE", 
        Some(&format!("success_rate: {:.2}", stats.success_rate)));
    
    Ok(stats)
}

// Tauri command for searching knowledge base
#[tauri::command]
pub async fn search_knowledge_base(
    query: String,
    max_results: Option<usize>,
    sales_stage: Option<String>
) -> Result<Vec<KnowledgeSearchResult>, String> {
    let trail = RustBreadcrumbTrail::new("TauriKnowledgeSearch");
    
    // LED 201: Tauri command invocation start
    trail.light(201, "SEARCH_KNOWLEDGE_BASE_COMMAND_START", 
        Some(&format!("query_length: {}", query.len())));
    
    // LED 503: Input validation
    trail.light(503, "SEARCH_INPUT_VALIDATION_START", None);
    if query.trim().is_empty() {
        trail.fail(503, "SEARCH_INPUT_VALIDATION_FAILED", "Empty search query provided");
        return Err("Search query cannot be empty".to_string());
    }
    trail.light(504, "SEARCH_INPUT_VALIDATION_COMPLETE", None);
    
    // LED 220: Python script execution start
    trail.light(220, "PYTHON_SCRIPT_EXECUTE_START", Some("search knowledge base"));
    
    let python_script = get_knowledge_integration_script().map_err(|e| {
        trail.fail(220, "PYTHON_SCRIPT_PATH_FAILED", &e);
        e
    })?;
    
    let mut cmd = Command::new("python");
    cmd.arg(&python_script)
        .arg("search")
        .arg("--query")
        .arg(&query);
    
    if let Some(max) = max_results {
        cmd.arg("--max-results").arg(max.to_string());
    }
    
    if let Some(stage) = sales_stage {
        cmd.arg("--sales-stage").arg(stage);
    }
    
    let start_time = SystemTime::now();
    let output = cmd.output().map_err(|e| {
        trail.fail(220, "PYTHON_SCRIPT_EXECUTE_FAILED", &format!("Command execution failed: {}", e));
        format!("Failed to execute knowledge search: {}", e)
    })?;
    
    let execution_time = start_time.elapsed().unwrap().as_millis() as u64;
    
    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        trail.fail(220, "PYTHON_SCRIPT_EXECUTE_FAILED", &error_msg);
        return Err(format!("Knowledge search failed: {}", error_msg));
    }
    
    // LED 221: Python script execution complete
    trail.performance_checkpoint(221, "knowledge_search", execution_time, 
        Some(&format!("query: {}", query.chars().take(50).collect::<String>())));
    
    // LED 510: Data processing start
    trail.light(510, "DATA_PROCESSING_START", Some("parsing search results JSON"));
    
    let result_str = String::from_utf8_lossy(&output.stdout);
    let results: Vec<KnowledgeSearchResult> = serde_json::from_str(&result_str).map_err(|e| {
        trail.fail(510, "DATA_PROCESSING_FAILED", &format!("JSON parse failed: {}", e));
        format!("Failed to parse search results: {}", e)
    })?;
    
    // LED 511: Data processing complete
    trail.light(511, "DATA_PROCESSING_COMPLETE", 
        Some(&format!("results_count: {}", results.len())));
    
    // LED 202: Tauri command completion
    trail.light(202, "SEARCH_KNOWLEDGE_BASE_COMMAND_COMPLETE", 
        Some(&format!("found {} results", results.len())));
    
    Ok(results)
}

// Tauri command for getting real-time coaching suggestions
#[tauri::command]
pub async fn get_coaching_suggestions(
    conversation_context: String,
    sales_stage: String
) -> Result<Vec<CoachingSuggestion>, String> {
    let trail = RustBreadcrumbTrail::new("TauriCoachingSuggestions");
    
    // LED 201: Tauri command invocation start
    trail.light(201, "GET_COACHING_SUGGESTIONS_COMMAND_START", 
        Some(&format!("stage: {}, context_length: {}", sales_stage, conversation_context.len())));
    
    // LED 503: Input validation
    trail.light(503, "COACHING_INPUT_VALIDATION_START", None);
    if conversation_context.trim().is_empty() || sales_stage.trim().is_empty() {
        trail.fail(503, "COACHING_INPUT_VALIDATION_FAILED", "Empty context or sales stage");
        return Err("Conversation context and sales stage cannot be empty".to_string());
    }
    trail.light(504, "COACHING_INPUT_VALIDATION_COMPLETE", None);
    
    // LED 220: Python script execution start
    trail.light(220, "PYTHON_SCRIPT_EXECUTE_START", Some("get coaching suggestions"));
    
    let python_script = get_knowledge_integration_script().map_err(|e| {
        trail.fail(220, "PYTHON_SCRIPT_PATH_FAILED", &e);
        e
    })?;
    
    let start_time = SystemTime::now();
    let cmd = Command::new("python")
        .arg(&python_script)
        .arg("get-coaching")
        .arg("--context")
        .arg(&conversation_context)
        .arg("--stage")
        .arg(&sales_stage)
        .output()
        .map_err(|e| {
            trail.fail(220, "PYTHON_SCRIPT_EXECUTE_FAILED", &format!("Command execution failed: {}", e));
            format!("Failed to execute coaching suggestions: {}", e)
        })?;
    
    let execution_time = start_time.elapsed().unwrap().as_millis() as u64;
    
    if !cmd.status.success() {
        let error_msg = String::from_utf8_lossy(&cmd.stderr);
        trail.fail(220, "PYTHON_SCRIPT_EXECUTE_FAILED", &error_msg);
        return Err(format!("Coaching suggestions failed: {}", error_msg));
    }
    
    // LED 221: Python script execution complete
    trail.performance_checkpoint(221, "python_script_execution", execution_time, 
        Some(&format!("coaching for stage: {}", sales_stage)));
    
    // LED 510: Data processing start
    trail.light(510, "DATA_PROCESSING_START", Some("parsing coaching suggestions JSON"));
    
    let result_str = String::from_utf8_lossy(&cmd.stdout);
    let suggestions: Vec<CoachingSuggestion> = serde_json::from_str(&result_str).map_err(|e| {
        trail.fail(510, "DATA_PROCESSING_FAILED", &format!("JSON parse failed: {}", e));
        format!("Failed to parse coaching suggestions: {}", e)
    })?;
    
    // LED 511: Data processing complete
    trail.light(511, "DATA_PROCESSING_COMPLETE", 
        Some(&format!("generated {} suggestions", suggestions.len())));
    
    // LED 202: Tauri command completion
    trail.light(202, "GET_COACHING_SUGGESTIONS_COMMAND_COMPLETE", 
        Some(&format!("suggestions_count: {}", suggestions.len())));
    
    Ok(suggestions)
}

// Tauri command for validating knowledge base integrity
#[tauri::command]
pub async fn validate_knowledge_base() -> Result<serde_json::Value, String> {
    let trail = RustBreadcrumbTrail::new("TauriKnowledgeValidation");
    
    // LED 201: Tauri command invocation start
    trail.light(201, "VALIDATE_KNOWLEDGE_BASE_COMMAND_START", None);
    
    // LED 220: Python script execution start
    trail.light(220, "PYTHON_SCRIPT_EXECUTE_START", Some("validate knowledge base"));
    
    let python_script = get_knowledge_integration_script().map_err(|e| {
        trail.fail(220, "PYTHON_SCRIPT_PATH_FAILED", &e);
        e
    })?;
    
    let start_time = SystemTime::now();
    let output = Command::new("python")
        .arg(&python_script)
        .arg("validate")
        .output()
        .map_err(|e| {
            trail.fail(220, "PYTHON_SCRIPT_EXECUTE_FAILED", &format!("Command execution failed: {}", e));
            format!("Failed to execute knowledge validation: {}", e)
        })?;
    
    let execution_time = start_time.elapsed().unwrap().as_millis() as u64;
    
    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        trail.fail(220, "PYTHON_SCRIPT_EXECUTE_FAILED", &error_msg);
        return Err(format!("Knowledge validation failed: {}", error_msg));
    }
    
    // LED 221: Python script execution complete
    trail.performance_checkpoint(221, "python_script_execution", execution_time, 
        Some("knowledge base validation"));
    
    // LED 510: Data processing start
    trail.light(510, "DATA_PROCESSING_START", Some("parsing validation results JSON"));
    
    let result_str = String::from_utf8_lossy(&output.stdout);
    let validation_result: serde_json::Value = serde_json::from_str(&result_str).map_err(|e| {
        trail.fail(510, "DATA_PROCESSING_FAILED", &format!("JSON parse failed: {}", e));
        format!("Failed to parse validation results: {}", e)
    })?;
    
    // LED 511: Data processing complete
    trail.light(511, "DATA_PROCESSING_COMPLETE", Some("validation results parsed"));
    
    // LED 560: Health check completion
    trail.light(560, "KNOWLEDGE_BASE_HEALTH_CHECK_COMPLETE", 
        Some(&format!("validation_status: {}", validation_result.get("is_valid").unwrap_or(&serde_json::Value::Bool(false)))));
    
    // LED 202: Tauri command completion
    trail.light(202, "VALIDATE_KNOWLEDGE_BASE_COMMAND_COMPLETE", None);
    
    Ok(validation_result)
}

// Tauri command for getting knowledge base statistics
#[tauri::command]
pub async fn get_knowledge_base_stats() -> Result<serde_json::Value, String> {
    let trail = RustBreadcrumbTrail::new("TauriKnowledgeStats");
    
    // LED 201: Tauri command invocation start
    trail.light(201, "GET_KNOWLEDGE_BASE_STATS_COMMAND_START", None);
    
    // LED 220: Python script execution start
    trail.light(220, "PYTHON_SCRIPT_EXECUTE_START", Some("get knowledge base stats"));
    
    let python_script = get_knowledge_integration_script().map_err(|e| {
        trail.fail(220, "PYTHON_SCRIPT_PATH_FAILED", &e);
        e
    })?;
    
    let start_time = SystemTime::now();
    let output = Command::new("python")
        .arg(&python_script)
        .arg("stats")
        .output()
        .map_err(|e| {
            trail.fail(220, "PYTHON_SCRIPT_EXECUTE_FAILED", &format!("Command execution failed: {}", e));
            format!("Failed to get knowledge stats: {}", e)
        })?;
    
    let execution_time = start_time.elapsed().unwrap().as_millis() as u64;
    
    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        trail.fail(220, "PYTHON_SCRIPT_EXECUTE_FAILED", &error_msg);
        return Err(format!("Knowledge stats failed: {}", error_msg));
    }
    
    // LED 221: Python script execution complete
    trail.performance_checkpoint(221, "python_script_execution", execution_time, 
        Some("retrieved knowledge base statistics"));
    
    // LED 510: Data processing start
    trail.light(510, "DATA_PROCESSING_START", Some("parsing stats JSON"));
    
    let result_str = String::from_utf8_lossy(&output.stdout);
    let stats: serde_json::Value = serde_json::from_str(&result_str).map_err(|e| {
        trail.fail(510, "DATA_PROCESSING_FAILED", &format!("JSON parse failed: {}", e));
        format!("Failed to parse knowledge stats: {}", e)
    })?;
    
    // LED 511: Data processing complete
    trail.light(511, "DATA_PROCESSING_COMPLETE", Some("stats JSON parsed successfully"));
    
    // LED 202: Tauri command completion
    trail.light(202, "GET_KNOWLEDGE_BASE_STATS_COMMAND_COMPLETE", None);
    
    Ok(stats)
}

// Helper function to get Python script path
fn get_python_script_path(script_name: &str) -> Result<PathBuf, String> {
    // Try to find the Python script in the voice_transcription_app_stability_02 directory
    let mut script_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get current executable path: {}", e))?;
    
    script_path.pop(); // Remove executable name
    script_path.pop(); // Remove target directory
    script_path.pop(); // Remove src-tauri directory
    script_path.pop(); // Remove voicecoach-app directory
    script_path.push("voice_transcription_app_stability_02");
    script_path.push(script_name);
    
    if !script_path.exists() {
        return Err(format!("Python script not found: {:?}", script_path));
    }
    
    Ok(script_path)
}

// Helper function to get the VoiceCoach knowledge integration script
fn get_knowledge_integration_script() -> Result<PathBuf, String> {
    get_python_script_path("voicecoach_knowledge_integration.py")
}

// Initialize document processing system
pub fn initialize_document_processing() -> Result<(), String> {
    info!("Initializing VoiceCoach document processing system...");
    
    // Verify Python dependencies
    let python_check = Command::new("python")
        .arg("-c")
        .arg("import chromadb, sentence_transformers; print('Dependencies OK')")
        .output()
        .map_err(|e| format!("Python dependency check failed: {}", e))?;
    
    if !python_check.status.success() {
        let error_msg = String::from_utf8_lossy(&python_check.stderr);
        return Err(format!("Python dependencies missing: {}", error_msg));
    }
    
    info!("Document processing system initialized successfully");
    Ok(())
}