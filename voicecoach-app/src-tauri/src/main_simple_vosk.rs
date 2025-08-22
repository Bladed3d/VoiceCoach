// VoiceCoach Simple Main - Focus on getting Vosk transcription working
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};
use log::{info, error};

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
    let model_path = "./models/vosk-model-small-en-us-0.15";
    
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
            start_vosk_transcription,
            stop_vosk_transcription,
            get_vosk_status,
            test_vosk
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}