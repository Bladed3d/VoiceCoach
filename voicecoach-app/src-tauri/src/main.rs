// Minimal VoiceCoach Tauri main.rs for IPC testing
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};
use log::{info, error};
use serde_json::Value;

mod audio_processing;
mod breadcrumb_system;

use audio_processing::{initialize_audio_processor, with_audio_processor};

// Minimal commands to test Tauri IPC functionality
#[tauri::command]
async fn initialize_voicecoach() -> Result<String, String> {
    info!("Initializing VoiceCoach with real audio processing...");
    
    match initialize_audio_processor() {
        Ok(_) => {
            info!("VoiceCoach audio processor initialized successfully");
            Ok("VoiceCoach initialized successfully with Faster-Whisper integration".into())
        }
        Err(e) => {
            error!("Failed to initialize audio processor: {}", e);
            Err(format!("Initialization failed: {}", e))
        }
    }
}

#[tauri::command]
async fn test_openrouter_connection() -> Result<String, String> {
    info!("Testing OpenRouter connection...");
    // Simulate successful connection for now
    Ok("OpenRouter connection test successful".into())
}

#[tauri::command]
async fn get_audio_devices() -> Result<Value, String> {
    info!("Getting mock audio devices...");
    let mock_devices = serde_json::json!([
        {"id": "default", "name": "Default Audio Device", "type": "input"},
        {"id": "speakers", "name": "Default Speakers", "type": "output"}
    ]);
    Ok(mock_devices)
}

#[tauri::command]
async fn start_recording() -> Result<String, String> {
    info!("Starting real audio recording with Faster-Whisper...");
    
    with_audio_processor(|processor| {
        tokio::runtime::Runtime::new()?.block_on(async {
            processor.start_recording().await
        })
    })
    .map_err(|e| format!("Recording start failed: {}", e))
    .map(|_| "Recording started successfully with voice transcription".into())
}

#[tauri::command]
async fn stop_recording() -> Result<String, String> {
    info!("Stopping real audio recording...");
    
    with_audio_processor(|processor| {
        tokio::runtime::Runtime::new()?.block_on(async {
            processor.stop_recording().await
        })
    })
    .map_err(|e| format!("Recording stop failed: {}", e))
    .map(|_| "Recording stopped successfully".into())
}

#[tauri::command]
async fn get_audio_status() -> Result<String, String> {
    info!("Getting real audio status...");
    
    with_audio_processor(|processor| {
        let status = processor.get_status();
        Ok(format!("{:?}", status))
    })
    .map_err(|e| format!("Status retrieval failed: {}", e))
}

#[tauri::command]
async fn get_audio_levels() -> Result<Value, String> {
    with_audio_processor(|processor| {
        let levels = processor.get_audio_levels();
        Ok(serde_json::json!({
            "user": levels.user,
            "prospect": levels.prospect,
            "timestamp": levels.timestamp
        }))
    })
    .map_err(|e| format!("Audio levels retrieval failed: {}", e))
}

#[tauri::command]
async fn generate_coaching_prompt(transcript: String) -> Result<Value, String> {
    info!("Generating coaching prompt for: {}", transcript);
    let mock_response = serde_json::json!({
        "primary_suggestion": "Focus on asking open-ended questions to understand the prospect's needs",
        "confidence_score": 0.85,
        "next_best_actions": [
            "Listen for buying signals",
            "Address any objections directly"
        ]
    });
    Ok(mock_response)
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
    info!("Starting minimal VoiceCoach application...");

    tauri::Builder::default()
        .system_tray(create_system_tray())
        .on_system_tray_event(handle_system_tray_event)
        .setup(|app| {
            info!("VoiceCoach minimal application setup completed");
            
            if let Some(window) = app.get_window("main") {
                let _ = window.set_title("VoiceCoach - AI Sales Coaching (Minimal)");
                
                #[cfg(debug_assertions)]
                window.open_devtools();
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            initialize_voicecoach,
            test_openrouter_connection,
            get_audio_devices,
            start_recording,
            stop_recording,
            get_audio_status,
            get_audio_levels,
            generate_coaching_prompt
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}