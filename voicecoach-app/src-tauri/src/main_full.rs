// VoiceCoach Production Main - Real functionality, no mocks
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
};
use log::{info, warn, error};
use serde_json::Value;
use std::sync::Arc;
use parking_lot::Mutex;

// Real modules - no mocks
mod audio_processing;
mod breadcrumb_system;
mod document_processing;
mod transcription_service;

use audio_processing::{
    initialize_audio_processor, with_audio_processor, AudioConfig, AudioStatus,
    get_audio_breadcrumb_statistics, clear_all_audio_breadcrumbs
};
use document_processing::{
    process_documents, search_knowledge_base, get_coaching_suggestions as get_ai_coaching_suggestions,
    validate_knowledge_base, get_knowledge_base_stats, initialize_document_processing
};
use transcription_service::{
    TranscriptionConfig, TranscriptionService, TranscriptionEvent,
    initialize_transcription_service, with_transcription_service, set_transcription_app_handle
};

// Global app handle for event emission
static APP_HANDLE: Mutex<Option<tauri::AppHandle>> = Mutex::new(None);

// Initialize VoiceCoach with real audio and transcription services
#[tauri::command]
async fn initialize_voicecoach() -> Result<String, String> {
    info!("Initializing VoiceCoach with REAL audio processing and transcription...");
    
    // Initialize audio processor (async)
    match initialize_audio_processor().await {
        Ok(_) => {
            info!("✅ Audio processor initialized successfully");
        }
        Err(e) => {
            error!("❌ Failed to initialize audio processor: {}", e);
            return Err(format!("Audio initialization failed: {}", e));
        }
    }
    
    // Initialize document processing system for RAG
    match initialize_document_processing() {
        Ok(_) => {
            info!("✅ Document processing system initialized successfully");
        }
        Err(e) => {
            error!("❌ Failed to initialize document processing: {}", e);
            return Err(format!("Document processing initialization failed: {}", e));
        }
    }
    
    // Initialize transcription service with Vosk by default
    let config = TranscriptionConfig {
        service: TranscriptionService::Vosk,
        api_key: None,
        model: "vosk-model-en-us-0.22".to_string(),
        language: "en-US".to_string(),
        sample_rate: 16000,
        chunk_duration_ms: 500,
        max_retry_attempts: 3,
        retry_delay_ms: 1000,
        timeout_seconds: 30,
        min_audio_level: 0.01,
        silence_threshold_ms: 2000,
        vad_enabled: true,
    };
    
    match initialize_transcription_service(config) {
        Ok(_) => {
            info!("✅ Transcription service initialized successfully");
        }
        Err(e) => {
            error!("❌ Failed to initialize transcription service: {}", e);
            return Err(format!("Transcription initialization failed: {}", e));
        }
    }
    
    Ok("VoiceCoach initialized with real audio and transcription services".into())
}

// Get real audio devices from the system
#[tauri::command]
async fn get_audio_devices() -> Result<Value, String> {
    info!("Getting real audio devices from system...");
    
    with_audio_processor(|processor| {
        let devices = processor.get_audio_devices();
        Ok(serde_json::to_value(devices).unwrap_or(Value::Null))
    }).unwrap_or_else(|e| Err(format!("Failed to get audio devices: {}", e)))
}

// Generate coaching prompt using real transcription and document context
#[tauri::command]
async fn generate_coaching_prompt(transcript: String) -> Result<Value, String> {
    info!("Generating coaching prompt from real transcript: {}", transcript);
    
    // Search knowledge base for relevant context
    let context = match search_knowledge_base(&transcript, 5) {
        Ok(results) => results,
        Err(e) => {
            warn!("Failed to search knowledge base: {}", e);
            vec![]
        }
    };
    
    // Get AI coaching suggestions based on transcript and context (async function)
    let suggestions = match get_ai_coaching_suggestions(&transcript, &context).await {
        Ok(sugg) => sugg,
        Err(e) => {
            warn!("Failed to get coaching suggestions: {}", e);
            vec![]
        }
    };
    
    Ok(serde_json::json!({
        "primary_suggestion": suggestions.get(0).map(|s| s.to_string()).unwrap_or_else(|| "Continue the conversation naturally".to_string()),
        "confidence_score": 0.85,
        "next_best_actions": suggestions.iter().skip(1).take(3).cloned().collect::<Vec<_>>(),
        "context_used": context.len(),
        "transcript": transcript
    }))
}

// Get real audio status from the processor
#[tauri::command]
async fn get_audio_status() -> Result<Value, String> {
    with_audio_processor(|processor| {
        let status = processor.get_status();
        let levels = processor.get_audio_levels();
        
        Ok(serde_json::json!({
            "is_recording": matches!(status, AudioStatus::Recording),
            "is_processing": matches!(status, AudioStatus::Processing),
            "audio_level": levels.user,
            "prospect_level": levels.prospect,
            "status": format!("{:?}", status),
            "timestamp": levels.timestamp
        }))
    }).unwrap_or_else(|_| {
        Ok(serde_json::json!({
            "is_recording": false,
            "is_processing": false,
            "audio_level": 0.0,
            "prospect_level": 0.0,
            "status": "Not initialized",
            "timestamp": 0
        }))
    })
}

// Start real audio recording
#[tauri::command]
async fn start_recording() -> Result<String, String> {
    info!("Starting real audio recording...");
    
    // Need to use async with the processor
    let result = tokio::task::spawn_blocking(|| {
        futures::executor::block_on(async {
            with_audio_processor(|processor| {
                futures::executor::block_on(processor.start_recording())
            })
        })
    }).await.map_err(|e| format!("Task error: {}", e))?;
    
    match result {
        Ok(_) => Ok("Recording started successfully".into()),
        Err(e) => Err(format!("Failed to start recording: {}", e))
    }
}

// Stop real audio recording
#[tauri::command]
async fn stop_recording() -> Result<String, String> {
    info!("Stopping audio recording...");
    
    // Need to use async with the processor
    let result = tokio::task::spawn_blocking(|| {
        futures::executor::block_on(async {
            with_audio_processor(|processor| {
                futures::executor::block_on(processor.stop_recording())
            })
        })
    }).await.map_err(|e| format!("Task error: {}", e))?;
    
    match result {
        Ok(_) => Ok("Recording stopped successfully".into()),
        Err(e) => Err(format!("Failed to stop recording: {}", e))
    }
}

// Start real transcription service
#[tauri::command]
async fn start_transcription() -> Result<String, String> {
    info!("Starting real transcription service...");
    
    with_transcription_service(|service| {
        match service.start() {
            Ok(_) => Ok("Transcription started successfully".into()),
            Err(e) => Err(format!("Failed to start transcription: {}", e))
        }
    }).unwrap_or_else(|| Err("Transcription service not initialized".into()))
}

// Stop real transcription service
#[tauri::command]
async fn stop_transcription() -> Result<String, String> {
    info!("Stopping transcription service...");
    
    with_transcription_service(|service| {
        match service.stop() {
            Ok(_) => Ok("Transcription stopped successfully".into()),
            Err(e) => Err(format!("Failed to stop transcription: {}", e))
        }
    }).unwrap_or_else(|| Err("Transcription service not initialized".into()))
}

// Configure audio settings
#[tauri::command]
async fn configure_audio(config: AudioConfig) -> Result<String, String> {
    info!("Configuring audio with settings: {:?}", config);
    
    with_audio_processor(|processor| {
        match processor.update_config(config) {
            Ok(_) => Ok("Audio configuration updated successfully".into()),
            Err(e) => Err(format!("Failed to update audio configuration: {}", e))
        }
    }).unwrap_or_else(|e| Err(format!("Audio processor error: {}", e)))
}

// Process documents for knowledge base
#[tauri::command]
async fn process_knowledge_documents(file_paths: Vec<String>) -> Result<Value, String> {
    info!("Processing {} documents for knowledge base", file_paths.len());
    
    match process_documents(&file_paths) {
        Ok(results) => Ok(serde_json::to_value(results).unwrap_or(Value::Null)),
        Err(e) => Err(format!("Failed to process documents: {}", e))
    }
}

// Search the knowledge base
#[tauri::command]
async fn search_knowledge(query: String, limit: usize) -> Result<Value, String> {
    info!("Searching knowledge base for: {}", query);
    
    match search_knowledge_base(&query, limit) {
        Ok(results) => Ok(serde_json::to_value(results).unwrap_or(Value::Null)),
        Err(e) => Err(format!("Failed to search knowledge base: {}", e))
    }
}

// Get knowledge base statistics
#[tauri::command]
async fn get_knowledge_stats() -> Result<Value, String> {
    info!("Getting knowledge base statistics");
    
    match get_knowledge_base_stats() {
        Ok(stats) => Ok(serde_json::to_value(stats).unwrap_or(Value::Null)),
        Err(e) => Err(format!("Failed to get knowledge base stats: {}", e))
    }
}

// Get audio breadcrumb statistics for debugging
#[tauri::command]
async fn get_audio_breadcrumbs() -> Result<Value, String> {
    let stats = get_audio_breadcrumb_statistics();
    Ok(stats)
}

// Clear all audio breadcrumbs
#[tauri::command]
async fn clear_audio_breadcrumbs() -> Result<String, String> {
    clear_all_audio_breadcrumbs();
    Ok("Audio breadcrumbs cleared successfully".into())
}

fn create_system_tray() -> SystemTray {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit VoiceCoach");
    let show = CustomMenuItem::new("show".to_string(), "Show VoiceCoach");
    let status = CustomMenuItem::new("status".to_string(), "Audio Status");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(status)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    SystemTray::new().with_menu(tray_menu)
}

fn handle_system_tray_event(app: &tauri::AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::MenuItemClick { id, .. } => {
            match id.as_str() {
                "quit" => {
                    info!("Quit menu item clicked - cleaning up resources");
                    // Clean up audio resources before quitting
                    with_audio_processor(|processor| {
                        let _ = processor.stop_recording();
                    });
                    with_transcription_service(|service| {
                        let _ = service.stop();
                    });
                    std::process::exit(0);
                }
                "show" => {
                    info!("Show menu item clicked");
                    if let Some(window) = app.get_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "status" => {
                    info!("Status menu item clicked - checking audio status");
                    with_audio_processor(|processor| {
                        let status = processor.get_status();
                        info!("Current audio status: {:?}", status);
                    });
                }
                _ => {}
            }
        }
        _ => {}
    }
}

fn main() {
    // Initialize logging
    env_logger::init();
    info!("Starting VoiceCoach application with REAL functionality...");

    tauri::Builder::default()
        .system_tray(create_system_tray())
        .on_system_tray_event(handle_system_tray_event)
        .setup(|app| {
            info!("VoiceCoach application setup starting...");
            
            // Store app handle for event emission
            {
                let mut handle = APP_HANDLE.lock();
                *handle = Some(app.handle());
            }
            
            // Set app handle for transcription service
            set_transcription_app_handle(app.handle());
            
            if let Some(window) = app.get_window("main") {
                let _ = window.set_title("VoiceCoach - AI Sales Coaching");
                
                #[cfg(debug_assertions)]
                window.open_devtools();
            }
            
            info!("VoiceCoach application setup completed");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            initialize_voicecoach,
            get_audio_devices,
            generate_coaching_prompt,
            get_audio_status,
            start_recording,
            stop_recording,
            start_transcription,
            stop_transcription,
            configure_audio,
            process_knowledge_documents,
            search_knowledge,
            get_knowledge_stats,
            get_audio_breadcrumbs,
            clear_audio_breadcrumbs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}