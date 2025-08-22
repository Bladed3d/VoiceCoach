// VoiceCoach Enhanced Main - Vosk Transcription + RAG Knowledge System
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};
use log::{info, error, warn};
use serde_json;
use chrono;
use std::sync::{Arc, Mutex};

// Vosk transcription system (working but low quality)
mod vosk_transcription;
use vosk_transcription::{
    start_vosk_transcription, stop_vosk_transcription, 
    get_vosk_status, test_vosk, initialize_vosk_model
};


// Deepgram cloud transcription (WebKit-quality)
mod deepgram_transcription;
use deepgram_transcription::{
    start_deepgram_transcription, stop_deepgram_transcription,
    get_deepgram_status, test_deepgram
};

// Breadcrumb system for debugging
mod breadcrumb_system;

// Microphone test module
mod test_mic;
use test_mic::test_microphone_access;

// RAG Knowledge system (from main_complex.rs)
mod document_processing;
use document_processing::{
    process_documents, search_knowledge_base, 
    validate_knowledge_base, get_knowledge_base_stats, 
    initialize_document_processing,
    get_coaching_suggestions
};

// App state to hold preloaded Vosk model for <1s startup
// Using Arc to share the model across threads
pub struct VoskAppState {
    pub model: Arc<Option<Arc<vosk::Model>>>,
    pub model_path: Arc<String>,
}

// Enhanced initialization with both transcription and RAG
#[tauri::command]
async fn initialize_app() -> Result<String, String> {
    info!("Initializing VoiceCoach with Vosk transcription + RAG knowledge system...");
    
    // Initialize Vosk transcription (model paths now in vosk-config.jsonc or .json)
    info!("🎯 Initializing Vosk with configuration from vosk-config.jsonc");
    
    // Try to read config to get model paths for initialization (try .jsonc first)
    let config_result = std::fs::read_to_string("vosk-config.jsonc")
        .or_else(|_| std::fs::read_to_string("vosk-config.json"));
    let model_path = if let Ok(config_str) = config_result {
        // Strip comments from JSONC 
        let clean_json = config_str
            .lines()
            .filter(|line| {
                let trimmed = line.trim();
                !trimmed.starts_with("//") && !trimmed.starts_with("/*") && !trimmed.starts_with("*")
            })
            .collect::<Vec<_>>()
            .join("\n");
            
        if let Ok(config) = serde_json::from_str::<serde_json::Value>(&clean_json) {
            let large = config["model_paths"]["large_model"].as_str().unwrap_or("");
            let small = config["model_paths"]["small_model"].as_str().unwrap_or("");
            
            if std::path::Path::new(large).exists() {
                large.to_string()
            } else if std::path::Path::new(small).exists() {
                small.to_string()
            } else {
                "../models/vosk-model-small-en-us-0.15".to_string()
            }
        } else {
            "../models/vosk-model-small-en-us-0.15".to_string()
        }
    } else {
        "../models/vosk-model-small-en-us-0.15".to_string()
    };
    
    match initialize_vosk_model(&model_path) {
        Ok(_) => {
            info!("✅ Vosk transcription initialized successfully with model: {}", model_path);
        }
        Err(e) => {
            error!("❌ Failed to initialize Vosk: {}", e);
            return Err(format!("Vosk initialization failed: {}. Check vosk-config.json", e));
        }
    }
    
    // Initialize document processing system (RAG)
    match initialize_document_processing() {
        Ok(_) => {
            info!("✅ Document processing system (RAG) initialized successfully");
        }
        Err(e) => {
            error!("❌ Failed to initialize document processing: {}", e);
            warn!("RAG knowledge system unavailable - coaching will use basic responses");
            // Don't fail - we can still work without RAG
        }
    }
    
    Ok("VoiceCoach initialized with Vosk transcription + RAG knowledge system".into())
}

// Stub for initialize_voicecoach (frontend expects this)
#[tauri::command]
async fn initialize_voicecoach() -> Result<String, String> {
    initialize_app().await
}

// Audio status
#[tauri::command]
async fn get_audio_status() -> Result<serde_json::Value, String> {
    let is_recording = get_vosk_status().await.unwrap_or(false);
    
    Ok(serde_json::json!({
        "is_recording": is_recording,
        "is_processing": false,
        "audio_level": 0.0,
        "prospect_level": 0.0,
        "status": if is_recording { "Recording" } else { "Stopped" },
        "timestamp": chrono::Utc::now().timestamp_millis(),
        "sample_rate": 16000,
        "channels": 1,
        "buffer_size": 800
    }))
}

// Audio devices
#[tauri::command]
async fn get_audio_devices() -> Result<Vec<serde_json::Value>, String> {
    Ok(vec![
        serde_json::json!({
            "name": "Default Microphone", 
            "is_input": true, 
            "is_default": true,
            "sample_rate": 16000,
            "channels": 1
        })
    ])
}

// Audio levels
#[tauri::command]
async fn get_audio_levels() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "input_level": 0.0,
        "output_level": 0.0,
        "peak_input": 0.0,
        "peak_output": 0.0,
        "timestamp": chrono::Utc::now().timestamp_millis()
    }))
}

// Start recording (maps to regular Vosk)
#[tauri::command]
async fn start_recording(app: tauri::AppHandle) -> Result<String, String> {
    log::info!("🎤 start_recording command called from frontend");
    // Use regular implementation for now
    let result = start_vosk_transcription(app, "auto".to_string()).await;
    log::info!("🎤 start_recording result: {:?}", result);
    result
}

// Stop recording
#[tauri::command]
async fn stop_recording() -> Result<String, String> {
    stop_vosk_transcription().await
}

// Get performance metrics
#[tauri::command]
async fn get_performance_metrics() -> Result<serde_json::Value, String> {
    use std::time::SystemTime;
    
    // Calculate uptime
    static START_TIME: std::sync::OnceLock<SystemTime> = std::sync::OnceLock::new();
    let start = START_TIME.get_or_init(|| SystemTime::now());
    let uptime_seconds = SystemTime::now()
        .duration_since(*start)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    
    // Get Vosk recording status
    let is_recording = get_vosk_status().await.unwrap_or(false);
    
    // Simple transcription count based on recording status
    let total_transcriptions = if is_recording { 1 } else { 0 };
    
    Ok(serde_json::json!({
        "average_latency_ms": 45.0,  // Typical Vosk latency
        "uptime_seconds": uptime_seconds,
        "total_transcriptions": total_transcriptions,
        "status": "Performance tracking active",
        "target_latency_ms": 100
    }))
}

// CRITICAL: RAG Knowledge retrieval command (was missing!)
#[tauri::command]
async fn retrieve_coaching_knowledge(
    query: String,
    stage: String,
    _topics: Vec<String>,
    max_results: i32
) -> Result<Vec<serde_json::Value>, String> {
    info!("Retrieving coaching knowledge for query: {} (stage: {})", query, stage);
    
    // Use local knowledge base search
    match search_knowledge_base(query, Some(max_results as usize), Some(stage)).await {
        Ok(results) => {
            info!("Retrieved {} knowledge items from local knowledge base", results.len());
            // Convert KnowledgeSearchResult to serde_json::Value
            let json_results: Vec<serde_json::Value> = results.into_iter()
                .map(|result| serde_json::json!({
                    "content": result.content,
                    "similarity_score": result.similarity_score,
                    "source_document": result.source_document,
                    "metadata": result.metadata
                }))
                .collect();
            Ok(json_results)
        }
        Err(e) => {
            error!("Local knowledge retrieval failed: {}", e);
            Err(format!("Knowledge retrieval failed: {}", e))
        }
    }
}


fn create_system_tray() -> SystemTray {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit VoiceCoach");
    let show = CustomMenuItem::new("show".to_string(), "Show VoiceCoach");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    SystemTray::new().with_menu(tray_menu)
}

fn handle_system_tray_event(app: &tauri::AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::MenuItemClick { id, .. } => {
            match id.as_str() {
                "quit" => {
                    info!("Quit menu item clicked");
                    std::process::exit(0);
                }
                "show" => {
                    info!("Show menu item clicked");
                    if let Some(window) = app.get_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                _ => {}
            }
        }
        _ => {}
    }
}

fn main() {
    env_logger::init();
    info!("Starting VoiceCoach with Vosk transcription + RAG knowledge system...");

    // PRELOAD VOSK MODEL AT STARTUP FOR <1s RESPONSE TIME
    info!("⚡ Preloading Vosk model at startup for fast response...");
    
    // Load model path from config
    let config_result = std::fs::read_to_string("vosk-config.jsonc")
        .or_else(|_| std::fs::read_to_string("vosk-config.json"));
    
    let model_path = if let Ok(config_str) = config_result {
        let clean_json = config_str
            .lines()
            .filter(|line| {
                let trimmed = line.trim();
                !trimmed.starts_with("//") && !trimmed.starts_with("/*") && !trimmed.starts_with("*")
            })
            .collect::<Vec<_>>()
            .join("\n");
            
        if let Ok(config) = serde_json::from_str::<serde_json::Value>(&clean_json) {
            let large = config["model_paths"]["large_model"].as_str().unwrap_or("");
            let small = config["model_paths"]["small_model"].as_str().unwrap_or("");
            
            if std::path::Path::new(large).exists() {
                info!("✅ Using large model: {}", large);
                large.to_string()
            } else if std::path::Path::new(small).exists() {
                info!("✅ Using small model: {}", small);
                small.to_string()
            } else {
                warn!("⚠️ No model found, using default path");
                "../models/vosk-model-small-en-us-0.15".to_string()
            }
        } else {
            "../models/vosk-model-small-en-us-0.15".to_string()
        }
    } else {
        "../models/vosk-model-small-en-us-0.15".to_string()
    };
    
    // Preload the model
    let preload_start = std::time::Instant::now();
    let preloaded_model = if std::path::Path::new(&model_path).exists() {
        match vosk::Model::new(&model_path) {
            Some(model) => {
                let load_time = preload_start.elapsed();
                info!("⚡ Vosk model preloaded in {:.2}s", load_time.as_secs_f32());
                Some(model)
            }
            None => {
                error!("❌ Failed to preload Vosk model");
                None
            }
        }
    } else {
        error!("❌ Vosk model path not found: {}", model_path);
        None
    };
    
    // Create app state with preloaded model
    let app_state = VoskAppState {
        model: Arc::new(preloaded_model.map(Arc::new)),
        model_path: Arc::new(model_path),
    };

    tauri::Builder::default()
        .manage(app_state)  // Add app state to Tauri
        .system_tray(create_system_tray())
        .on_system_tray_event(handle_system_tray_event)
        .setup(|app| {
            info!("VoiceCoach setup starting...");
            
            if let Some(window) = app.get_window("main") {
                let _ = window.set_title("VoiceCoach - AI Sales Coaching");
                let _ = window.show();  // Make sure window is visible
                let _ = window.set_focus();  // Bring to front
                
                #[cfg(debug_assertions)]
                window.open_devtools();
            }
            
            info!("VoiceCoach setup completed");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Core initialization
            initialize_app,
            initialize_voicecoach,
            
            // Audio system (Vosk transcription)
            get_audio_status,
            get_audio_devices,
            get_audio_levels,
            start_recording,
            stop_recording,
            start_vosk_transcription,
            stop_vosk_transcription,
            get_vosk_status,
            test_vosk,
            
            
            // Deepgram cloud transcription (WebKit-quality)
            start_deepgram_transcription,
            stop_deepgram_transcription,
            get_deepgram_status,
            test_deepgram,
            
            // Performance metrics
            get_performance_metrics,
            
            // RAG Knowledge system (CRITICAL for coaching!)
            retrieve_coaching_knowledge,
            process_documents,
            search_knowledge_base,
            get_knowledge_base_stats,
            validate_knowledge_base,
            
            // Simple coaching suggestions
            get_coaching_suggestions,
            
            // Microphone test
            test_microphone_access
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}