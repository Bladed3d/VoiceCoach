// VoiceCoach Simple Main - Focus on getting Vosk transcription working
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};
use log::{info, error};
use serde_json;
use chrono;

mod vosk_transcription;
use vosk_transcription::{
    start_vosk_transcription, stop_vosk_transcription, 
    get_vosk_status, test_vosk, initialize_vosk_model
};

// Simple initialization
#[tauri::command]
async fn initialize_app() -> Result<String, String> {
    info!("Initializing VoiceCoach with Vosk transcription...");
    
    // Initialize Vosk with small English model
    // When running with tauri dev, the working dir is voicecoach-app/src-tauri
    let model_path = if std::path::Path::new("../models/vosk-model-small-en-us-0.15").exists() {
        "../models/vosk-model-small-en-us-0.15"
    } else if std::path::Path::new("models/vosk-model-small-en-us-0.15").exists() {
        "models/vosk-model-small-en-us-0.15"
    } else {
        "../../models/vosk-model-small-en-us-0.15"
    };
    
    match initialize_vosk_model(model_path) {
        Ok(_) => {
            info!("✅ Vosk initialized successfully");
            Ok("VoiceCoach initialized with Vosk transcription".into())
        }
        Err(e) => {
            error!("❌ Failed to initialize Vosk: {}", e);
            Err(format!("Vosk initialization failed: {}. Please ensure model is downloaded to {}", e, model_path))
        }
    }
}

// Stub for initialize_voicecoach (frontend expects this)
#[tauri::command]
async fn initialize_voicecoach() -> Result<String, String> {
    initialize_app().await
}

// Stub for audio status (frontend expects this)
#[tauri::command]
async fn get_audio_status() -> Result<serde_json::Value, String> {
    let is_recording = get_vosk_status().await.unwrap_or(false);
    
    // Return the complete status object that frontend expects
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

// Stub for audio devices
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

// Stub for audio levels (frontend expects this)
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

// Stub for start_recording (maps to Vosk)
#[tauri::command]
async fn start_recording(app: tauri::AppHandle) -> Result<String, String> {
    // Determine model path dynamically
    let model_path = if std::path::Path::new("../models/vosk-model-small-en-us-0.15").exists() {
        "../models/vosk-model-small-en-us-0.15"
    } else if std::path::Path::new("models/vosk-model-small-en-us-0.15").exists() {
        "models/vosk-model-small-en-us-0.15"
    } else {
        "../../models/vosk-model-small-en-us-0.15"
    };
    
    start_vosk_transcription(
        app, 
        model_path.to_string()
    ).await
}

// Stub for stop_recording
#[tauri::command]
async fn stop_recording() -> Result<String, String> {
    stop_vosk_transcription().await
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
    // Initialize logging
    env_logger::init();
    info!("Starting VoiceCoach with Vosk transcription...");

    tauri::Builder::default()
        .system_tray(create_system_tray())
        .on_system_tray_event(handle_system_tray_event)
        .setup(|app| {
            info!("VoiceCoach setup starting...");
            
            if let Some(window) = app.get_window("main") {
                let _ = window.set_title("VoiceCoach - Vosk Transcription");
                
                #[cfg(debug_assertions)]
                window.open_devtools();
            }
            
            info!("VoiceCoach setup completed");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            initialize_app,
            initialize_voicecoach,
            get_audio_status,
            get_audio_devices,
            get_audio_levels,
            start_recording,
            stop_recording,
            start_vosk_transcription,
            stop_vosk_transcription,
            get_vosk_status,
            test_vosk
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}