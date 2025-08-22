// AssemblyAI Real-time Transcription for VoiceCoach
// Production-quality cloud-based transcription with <1s latency

use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures_util::{StreamExt, SinkExt};
use serde::{Deserialize, Serialize};
use serde_json;
use base64;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{AppHandle, Manager};
use log::{info, error, warn};
use anyhow::{Result, anyhow};

#[derive(Serialize, Deserialize)]
pub struct TranscriptionPayload {
    pub text: String,
    pub is_final: bool,
    pub timestamp: u64,
    pub is_user: bool,
}

#[derive(Deserialize)]
struct AssemblyAIMessage {
    message_type: String,
    text: Option<String>,
    audio_start: Option<i64>,
    audio_end: Option<i64>,
    confidence: Option<f32>,
    words: Option<Vec<Word>>,
}

#[derive(Deserialize)]
struct Word {
    text: String,
    start: i64,
    end: i64,
    confidence: f32,
}

// Global WebSocket connection state
static WS_CONNECTION: once_cell::sync::Lazy<Arc<Mutex<Option<AssemblyAIConnection>>>> = 
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(None)));

struct AssemblyAIConnection {
    is_connected: bool,
}

// Initialize AssemblyAI (just validates API key)
pub fn initialize_assemblyai(api_key: &str) -> Result<()> {
    if api_key.is_empty() {
        return Err(anyhow!("AssemblyAI API key is required"));
    }
    info!("✅ AssemblyAI initialized with API key");
    Ok(())
}

// Start real-time transcription with AssemblyAI
#[tauri::command]
pub async fn start_assemblyai_transcription(
    app: AppHandle,
    api_key: String,
) -> Result<String, String> {
    info!("Starting AssemblyAI real-time transcription...");
    
    // Connect to AssemblyAI WebSocket
    let ws_url = format!(
        "wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&encoding=pcm_s16le"
    );
    
    // Create connection with auth header
    let request = http::Request::builder()
        .uri(&ws_url)
        .header("Authorization", api_key.clone())
        .header("Sec-WebSocket-Protocol", "websocket")
        .header("Sec-WebSocket-Version", "13")
        .header("Sec-WebSocket-Key", base64::encode(rand::random::<[u8; 16]>()))
        .body(())
        .map_err(|e| format!("Failed to build request: {}", e))?;
    
    // Connect to WebSocket
    let (ws_stream, _) = connect_async(request)
        .await
        .map_err(|e| format!("Failed to connect to AssemblyAI: {}", e))?;
    
    info!("✅ Connected to AssemblyAI WebSocket");
    
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();
    
    // Store connection state
    {
        let mut conn = WS_CONNECTION.lock().await;
        *conn = Some(AssemblyAIConnection { is_connected: true });
    }
    
    // Setup audio capture
    let host = cpal::default_host();
    let device = host.default_input_device()
        .ok_or("No input device available")?;
    
    info!("Using audio device: {}", device.name().unwrap_or_default());
    
    // Force 16kHz mono for AssemblyAI
    let config = cpal::StreamConfig {
        channels: 1,
        sample_rate: cpal::SampleRate(16000),
        buffer_size: cpal::BufferSize::Fixed(3200), // 200ms chunks
    };
    
    // Clone app handle for the audio callback
    let app_clone = app.clone();
    let ws_sender = Arc::new(Mutex::new(ws_sender));
    let ws_sender_clone = ws_sender.clone();
    
    // Build audio stream
    let stream = device.build_input_stream(
        &config,
        move |data: &[f32], _: &cpal::InputCallbackInfo| {
            // Convert f32 to i16
            let i16_data: Vec<i16> = data.iter()
                .map(|&sample| {
                    let clamped = sample.max(-1.0).min(1.0);
                    (clamped * 32767.0) as i16
                })
                .collect();
            
            // Convert to bytes for WebSocket
            let bytes: Vec<u8> = i16_data.iter()
                .flat_map(|&sample| sample.to_le_bytes())
                .collect();
            
            // Send audio to AssemblyAI
            let sender = ws_sender_clone.clone();
            tokio::spawn(async move {
                let mut sender = sender.lock().await;
                let audio_message = serde_json::json!({
                    "audio_data": base64::encode(&bytes)
                });
                
                if let Err(e) = sender.send(Message::Text(audio_message.to_string())).await {
                    error!("Failed to send audio to AssemblyAI: {}", e);
                }
            });
        },
        |err| {
            error!("Audio stream error: {:?}", err);
        },
        None
    ).map_err(|e| format!("Failed to build audio stream: {}", e))?;
    
    stream.play().map_err(|e| format!("Failed to start audio stream: {}", e))?;
    
    // Handle incoming transcriptions
    let app_for_receiver = app.clone();
    tokio::spawn(async move {
        while let Some(msg) = ws_receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Ok(message) = serde_json::from_str::<AssemblyAIMessage>(&text) {
                        match message.message_type.as_str() {
                            "PartialTranscript" => {
                                if let Some(transcript_text) = message.text {
                                    if !transcript_text.is_empty() {
                                        let payload = TranscriptionPayload {
                                            text: transcript_text,
                                            is_final: false,
                                            timestamp: chrono::Utc::now().timestamp_millis() as u64,
                                            is_user: true,
                                        };
                                        let _ = app_for_receiver.emit_all("voice_transcription", payload);
                                    }
                                }
                            },
                            "FinalTranscript" => {
                                if let Some(transcript_text) = message.text {
                                    if !transcript_text.is_empty() {
                                        info!("Final transcript: {}", transcript_text);
                                        let payload = TranscriptionPayload {
                                            text: transcript_text,
                                            is_final: true,
                                            timestamp: chrono::Utc::now().timestamp_millis() as u64,
                                            is_user: true,
                                        };
                                        let _ = app_for_receiver.emit_all("voice_transcription", payload);
                                    }
                                }
                            },
                            "SessionBegins" => {
                                info!("✅ AssemblyAI session started successfully");
                            },
                            "SessionTerminated" => {
                                warn!("AssemblyAI session terminated");
                                break;
                            },
                            _ => {}
                        }
                    }
                },
                Ok(Message::Close(_)) => {
                    info!("WebSocket connection closed");
                    break;
                },
                Err(e) => {
                    error!("WebSocket error: {}", e);
                    break;
                },
                _ => {}
            }
        }
        
        // Update connection state
        let mut conn = WS_CONNECTION.lock().await;
        if let Some(c) = conn.as_mut() {
            c.is_connected = false;
        }
    });
    
    // Keep stream alive
    std::mem::forget(stream);
    
    Ok("AssemblyAI transcription started".into())
}

// Stop transcription
#[tauri::command]
pub async fn stop_assemblyai_transcription() -> Result<String, String> {
    info!("Stopping AssemblyAI transcription...");
    
    // Close WebSocket connection
    {
        let mut conn = WS_CONNECTION.lock().await;
        *conn = None;
    }
    
    Ok("AssemblyAI transcription stopped".into())
}

// Get transcription status
#[tauri::command]
pub async fn get_assemblyai_status() -> Result<bool, String> {
    let conn = WS_CONNECTION.lock().await;
    Ok(conn.as_ref().map(|c| c.is_connected).unwrap_or(false))
}