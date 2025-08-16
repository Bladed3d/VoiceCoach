// Minimal VoiceCoach Tauri main.rs for IPC testing
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};
use log::{info, error};
use serde_json::Value;

// Minimal commands to test Tauri IPC functionality
#[tauri::command]
async fn initialize_voicecoach() -> Result<String, String> {
    info!("Initializing minimal VoiceCoach backend...");
    Ok("VoiceCoach minimal backend initialized successfully".into())
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
            generate_coaching_prompt
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}