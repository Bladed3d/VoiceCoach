// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
};
use log::{info, warn, error};
use serde_json::Value;

mod audio_processing;
mod breadcrumb_system;
mod document_processing;
mod openrouter_integration;
use audio_processing::{initialize_audio_processor, with_audio_processor, AudioConfig, get_audio_breadcrumb_statistics, clear_all_audio_breadcrumbs};
use document_processing::{
    process_documents, search_knowledge_base, get_coaching_suggestions as get_ai_coaching_suggestions,
    validate_knowledge_base, get_knowledge_base_stats, initialize_document_processing
};
use openrouter_integration::{initialize_openrouter_client, with_openrouter_client, CoachingContext};

// VoiceCoach backend commands with real audio processing integration
#[tauri::command]
async fn initialize_voicecoach() -> Result<String, String> {
    info!("Initializing VoiceCoach backend with real audio processing and document processing...");
    
    // Initialize audio processor
    match initialize_audio_processor() {
        Ok(_) => {
            info!("Audio processor initialized successfully");
        }
        Err(e) => {
            error!("Failed to initialize audio processor: {}", e);
            return Err(format!("Audio initialization failed: {}", e));
        }
    }
    
    // Initialize document processing system
    match initialize_document_processing() {
        Ok(_) => {
            info!("Document processing system initialized successfully");
        }
        Err(e) => {
            error!("Failed to initialize document processing: {}", e);
            return Err(format!("Document processing initialization failed: {}", e));
        }
    }
    
    // Initialize OpenRouter client (API key will be set via separate command)
    let default_api_key = std::env::var("OPENROUTER_API_KEY").unwrap_or_else(|_| "".to_string());
    if !default_api_key.is_empty() {
        match initialize_openrouter_client(default_api_key) {
            Ok(_) => {
                info!("OpenRouter client initialized successfully");
            }
            Err(e) => {
                warn!("OpenRouter client initialization failed: {}", e);
                // Don't fail the entire init - OpenRouter is optional
            }
        }
    } else {
        info!("OpenRouter API key not found in environment variables - will initialize when provided");
    }
    
    Ok("VoiceCoach backend with audio processing, document processing, and OpenRouter integration initialized successfully".into())
}

#[tauri::command]
async fn start_recording() -> Result<String, String> {
    info!("Starting real-time audio recording session...");
    
    match with_audio_processor(|processor| {
        let rt = tokio::runtime::Runtime::new()?;
        rt.block_on(async {
            processor.start_recording().await
        })
    }) {
        Ok(_) => {
            info!("Audio recording started successfully");
            Ok("Real-time audio recording session started with dual-channel capture".into())
        }
        Err(e) => {
            error!("Failed to start recording: {}", e);
            Err(format!("Recording start failed: {}", e))
        }
    }
}

#[tauri::command]
async fn stop_recording() -> Result<String, String> {
    info!("Stopping audio recording session...");
    
    match with_audio_processor(|processor| {
        let rt = tokio::runtime::Runtime::new()?;
        rt.block_on(async {
            processor.stop_recording().await
        })
    }) {
        Ok(_) => {
            info!("Audio recording stopped successfully");
            Ok("Recording session stopped and resources cleaned up".into())
        }
        Err(e) => {
            error!("Failed to stop recording: {}", e);
            Err(format!("Recording stop failed: {}", e))
        }
    }
}

#[tauri::command]
async fn get_audio_devices() -> Result<Value, String> {
    info!("Fetching real audio devices from system...");
    
    match with_audio_processor(|processor| {
        let devices = processor.get_audio_devices();
        Ok(serde_json::to_value(devices).unwrap())
    }) {
        Ok(devices) => {
            info!("Retrieved {} audio devices", devices.as_array().map(|a| a.len()).unwrap_or(0));
            Ok(devices)
        }
        Err(e) => {
            error!("Failed to get audio devices: {}", e);
            Err(format!("Audio device enumeration failed: {}", e))
        }
    }
}

#[tauri::command]
async fn get_audio_levels() -> Result<Value, String> {
    match with_audio_processor(|processor| {
        let levels = processor.get_audio_levels();
        Ok(serde_json::to_value(levels).unwrap())
    }) {
        Ok(levels) => Ok(levels),
        Err(e) => {
            error!("Failed to get audio levels: {}", e);
            Err(format!("Audio levels retrieval failed: {}", e))
        }
    }
}

#[tauri::command]
async fn get_audio_status() -> Result<Value, String> {
    match with_audio_processor(|processor| {
        let status = processor.get_status();
        Ok(serde_json::to_value(status).unwrap())
    }) {
        Ok(status) => Ok(status),
        Err(e) => {
            error!("Failed to get audio status: {}", e);
            Err(format!("Audio status retrieval failed: {}", e))
        }
    }
}

#[tauri::command]
async fn get_performance_metrics() -> Result<Value, String> {
    match with_audio_processor(|processor| {
        Ok(processor.get_performance_metrics())
    }) {
        Ok(metrics) => Ok(metrics),
        Err(e) => {
            error!("Failed to get performance metrics: {}", e);
            Err(format!("Performance metrics retrieval failed: {}", e))
        }
    }
}

#[tauri::command]
async fn update_audio_config(config: Value) -> Result<String, String> {
    info!("Updating audio configuration: {:?}", config);
    
    match serde_json::from_value::<AudioConfig>(config) {
        Ok(audio_config) => {
            match with_audio_processor(|processor| {
                processor.update_config(audio_config)
            }) {
                Ok(_) => Ok("Audio configuration updated successfully".into()),
                Err(e) => Err(format!("Failed to update audio config: {}", e))
            }
        }
        Err(e) => Err(format!("Invalid audio configuration: {}", e))
    }
}

// OpenRouter API Integration Commands for Real-Time Coaching

#[tauri::command]
async fn initialize_openrouter_api(api_key: String) -> Result<String, String> {
    info!("Initializing OpenRouter API client with provided key...");
    
    match initialize_openrouter_client(api_key) {
        Ok(_) => {
            info!("OpenRouter API client initialized successfully");
            Ok("OpenRouter API client initialized successfully".into())
        }
        Err(e) => {
            error!("Failed to initialize OpenRouter API client: {}", e);
            Err(format!("OpenRouter initialization failed: {}", e))
        }
    }
}

#[tauri::command]
async fn generate_ai_coaching_prompt(
    conversation_snippet: String,
    sales_stage: String,
    call_duration_minutes: i32,
    key_topics: Vec<String>,
    objections: Vec<String>,
    model: Option<String>,
    priority: Option<String>
) -> Result<Value, String> {
    info!("Generating AI coaching prompt via OpenRouter API...");
    
    // Create coaching context
    let mut participant_roles = std::collections::HashMap::new();
    participant_roles.insert("user".to_string(), "salesperson".to_string());
    participant_roles.insert("prospect".to_string(), "prospect".to_string());
    
    let context = CoachingContext {
        conversation_snippet,
        sales_stage,
        participant_roles,
        call_duration_minutes,
        key_topics_discussed: key_topics,
        objections_detected: objections,
        sentiment_analysis: None,
        company_context: None,
    };
    
    match with_openrouter_client(|client| {
        let rt = tokio::runtime::Runtime::new()?;
        rt.block_on(async {
            client.generate_coaching_prompt(context, model, priority).await
        })
    }) {
        Ok(prompt) => {
            info!("AI coaching prompt generated successfully with confidence: {}", prompt.confidence_score);
            Ok(serde_json::to_value(prompt).unwrap())
        }
        Err(e) => {
            error!("Failed to generate AI coaching prompt: {}", e);
            Err(format!("AI coaching prompt generation failed: {}", e))
        }
    }
}

#[tauri::command]
async fn analyze_conversation_stage(
    transcription_text: String,
    speaker: String,
    current_stage: String,
    conversation_history: String
) -> Result<Value, String> {
    info!("Analyzing conversation stage for speaker: {}", speaker);
    
    match with_openrouter_client(|client| {
        let rt = tokio::runtime::Runtime::new()?;
        rt.block_on(async {
            client.analyze_conversation(transcription_text, speaker, current_stage, conversation_history).await
        })
    }) {
        Ok(analysis) => {
            info!("Conversation analysis completed - stage: {}, confidence: {}", 
                  analysis.current_stage, analysis.confidence);
            Ok(serde_json::to_value(analysis).unwrap())
        }
        Err(e) => {
            error!("Failed to analyze conversation: {}", e);
            Err(format!("Conversation analysis failed: {}", e))
        }
    }
}

#[tauri::command]
async fn retrieve_coaching_knowledge(
    query: String,
    stage: String,
    topics: Vec<String>,
    max_results: i32
) -> Result<Vec<Value>, String> {
    info!("Retrieving coaching knowledge for query: {} (stage: {})", query, stage);
    
    match with_openrouter_client(|client| {
        let rt = tokio::runtime::Runtime::new()?;
        rt.block_on(async {
            client.retrieve_knowledge(query, stage, topics, max_results).await
        })
    }) {
        Ok(knowledge) => {
            info!("Retrieved {} knowledge items", knowledge.len());
            Ok(knowledge)
        }
        Err(e) => {
            error!("Failed to retrieve coaching knowledge: {}", e);
            Err(format!("Knowledge retrieval failed: {}", e))
        }
    }
}

#[tauri::command]
async fn get_openrouter_performance_stats() -> Result<Value, String> {
    match with_openrouter_client(|client| {
        Ok(client.get_performance_stats())
    }) {
        Ok(stats) => Ok(stats),
        Err(e) => {
            error!("Failed to get OpenRouter performance stats: {}", e);
            Err(format!("Performance stats retrieval failed: {}", e))
        }
    }
}

// Legacy compatibility command (now uses OpenRouter)
#[tauri::command]
async fn get_coaching_suggestions(transcript: String) -> Result<Vec<String>, String> {
    info!("Generating AI coaching suggestions for transcript: {}", transcript);
    
    // Use the new OpenRouter integration
    let context = CoachingContext {
        conversation_snippet: transcript,
        sales_stage: "discovery".to_string(),
        participant_roles: {
            let mut roles = std::collections::HashMap::new();
            roles.insert("user".to_string(), "salesperson".to_string());
            roles.insert("prospect".to_string(), "prospect".to_string());
            roles
        },
        call_duration_minutes: 5,
        key_topics_discussed: vec![],
        objections_detected: vec![],
        sentiment_analysis: None,
        company_context: None,
    };
    
    match with_openrouter_client(|client| {
        let rt = tokio::runtime::Runtime::new()?;
        rt.block_on(async {
            client.generate_coaching_prompt(context, None, Some("speed".to_string())).await
        })
    }) {
        Ok(prompt) => {
            let mut suggestions = vec![prompt.primary_suggestion];
            suggestions.extend(prompt.next_best_actions.into_iter().take(2));
            Ok(suggestions)
        }
        Err(_) => {
            // Fallback to simple suggestions if OpenRouter fails
            let suggestions = if transcript.contains("price") || transcript.contains("cost") {
                vec![
                    "Address pricing concerns by focusing on ROI and value".to_string(),
                    "Ask about their budget range to qualify the opportunity".to_string(),
                ]
            } else {
                vec![
                    "Ask open-ended questions to understand their pain points".to_string(),
                    "Listen for buying signals and qualification criteria".to_string(),
                ]
            };
            Ok(suggestions)
        }
    }
}

// LED Breadcrumb System Commands for debugging
#[tauri::command]
async fn get_breadcrumb_statistics() -> Result<Value, String> {
    info!("Retrieving breadcrumb trail statistics for debugging...");
    
    match get_audio_breadcrumb_statistics() {
        stats => {
            info!("Retrieved breadcrumb statistics with {} components", 
                  stats.get("global_statistics").and_then(|g| g.get("active_components")).unwrap_or(&Value::Number(0.into()));
            Ok(stats)
        }
    }
}

#[tauri::command]
async fn get_component_breadcrumbs(component: String) -> Result<Value, String> {
    info!("Retrieving breadcrumb trail for component: {}", component);
    
    match breadcrumb_system::get_component_trail(&component) {
        Some(trail) => {
            info!("Retrieved {} breadcrumbs for component {}", trail.len(), component);
            Ok(serde_json::to_value(trail).unwrap())
        }
        None => {
            warn!("No breadcrumb trail found for component: {}", component);
            Err(format!("Component '{}' not found in breadcrumb system", component))
        }
    }
}

#[tauri::command]
async fn get_all_breadcrumb_trails() -> Result<Value, String> {
    info!("Retrieving all breadcrumb trails for debugging...");
    
    let all_trails = breadcrumb_system::get_all_trails();
    info!("Retrieved breadcrumb trails for {} components", all_trails.len());
    Ok(serde_json::to_value(all_trails).unwrap())
}

#[tauri::command]
async fn get_breadcrumb_failures() -> Result<Value, String> {
    info!("Retrieving breadcrumb failures for error analysis...");
    
    let failures = breadcrumb_system::get_failures();
    info!("Retrieved {} breadcrumb failures", failures.len());
    Ok(serde_json::to_value(failures).unwrap())
}

#[tauri::command]
async fn clear_breadcrumb_trails() -> Result<String, String> {
    info!("Clearing all breadcrumb trails...");
    
    clear_all_audio_breadcrumbs();
    info!("All breadcrumb trails cleared successfully");
    Ok("All breadcrumb trails cleared successfully".to_string())
}

#[tauri::command]
async fn get_audio_processor_breadcrumbs() -> Result<Value, String> {
    info!("Retrieving audio processor specific breadcrumbs...");
    
    match with_audio_processor(|processor| {
        let trail = processor.get_breadcrumb_trail();
        Ok(serde_json::to_value(trail).unwrap())
    }) {
        Ok(breadcrumbs) => {
            info!("Retrieved audio processor breadcrumbs");
            Ok(breadcrumbs)
        }
        Err(e) => {
            error!("Failed to get audio processor breadcrumbs: {}", e);
            Err(format!("Audio processor breadcrumbs retrieval failed: {}", e))
        }
    }
}

fn create_system_tray() -> SystemTray {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit VoiceCoach");
    let show = CustomMenuItem::new("show".to_string(), "Show VoiceCoach");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide VoiceCoach");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    SystemTray::new().with_menu(tray_menu)
}

fn handle_system_tray_event(app: &tauri::AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::LeftClick {
            position: _,
            size: _,
            ..
        } => {
            info!("System tray left clicked");
        }
        SystemTrayEvent::RightClick {
            position: _,
            size: _,
            ..
        } => {
            info!("System tray right clicked");
        }
        SystemTrayEvent::DoubleClick {
            position: _,
            size: _,
            ..
        } => {
            info!("System tray double clicked");
            let window = app.get_window("main").unwrap();
            window.show().unwrap();
            window.set_focus().unwrap();
        }
        SystemTrayEvent::MenuItemClick { id, .. } => {
            match id.as_str() {
                "quit" => {
                    info!("Quit menu item clicked");
                    std::process::exit(0);
                }
                "show" => {
                    info!("Show menu item clicked");
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                "hide" => {
                    info!("Hide menu item clicked");
                    let window = app.get_window("main").unwrap();
                    window.hide().unwrap();
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
    info!("Starting VoiceCoach application...");

    tauri::Builder::default()
        .system_tray(create_system_tray())
        .on_system_tray_event(handle_system_tray_event)
        .setup(|app| {
            info!("VoiceCoach application setup completed");
            
            // Set window properties for full-screen coaching interface
            if let Some(window) = app.get_window("main") {
                window.set_title("VoiceCoach - AI Sales Coaching").unwrap();
                
                #[cfg(debug_assertions)]
                window.open_devtools();
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            initialize_voicecoach,
            start_recording,
            stop_recording,
            get_audio_devices,
            get_audio_levels,
            get_audio_status,
            get_performance_metrics,
            update_audio_config,
            get_coaching_suggestions,
            // OpenRouter API integration commands
            initialize_openrouter_api,
            generate_ai_coaching_prompt,
            analyze_conversation_stage,
            retrieve_coaching_knowledge,
            get_openrouter_performance_stats,
            get_breadcrumb_statistics,
            get_component_breadcrumbs,
            get_all_breadcrumb_trails,
            get_breadcrumb_failures,
            clear_breadcrumb_trails,
            get_audio_processor_breadcrumbs,
            // Document processing commands
            process_documents,
            search_knowledge_base,
            get_ai_coaching_suggestions,
            validate_knowledge_base,
            get_knowledge_base_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}