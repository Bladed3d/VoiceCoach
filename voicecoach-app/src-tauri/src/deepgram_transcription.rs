// Deepgram Real-time Transcription for VoiceCoach
// WebKit-quality cloud transcription with ultra-low latency

use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures_util::{StreamExt, SinkExt};
use serde::{Deserialize, Serialize};
use serde_json;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{AppHandle, Manager};
use log::{info, error, warn};
use anyhow::{Result, anyhow};
use std::sync::atomic::{AtomicBool, Ordering};

#[derive(Clone, Serialize, Deserialize)]
pub struct TranscriptionPayload {
    pub text: String,
    pub is_final: bool,
    pub timestamp: u64,
    pub is_user: bool,
}

#[derive(Deserialize, Debug)]
struct DeepgramResponse {
    channel: Option<Channel>,
    is_final: Option<bool>,
    speech_final: Option<bool>,
}

#[derive(Deserialize, Debug)]
struct Channel {
    alternatives: Vec<Alternative>,
}

#[derive(Deserialize, Debug)]
struct Alternative {
    transcript: String,
    confidence: f32,
}

// Global connection state
static IS_RUNNING: AtomicBool = AtomicBool::new(false);

// Start Deepgram real-time transcription
#[tauri::command]
pub async fn start_deepgram_transcription(
    app: AppHandle,
    api_key: String,
) -> Result<String, String> {
    if IS_RUNNING.load(Ordering::Relaxed) {
        return Ok("Transcription already running".into());
    }
    
    info!("Starting Deepgram real-time transcription...");
    
    // Deepgram WebSocket URL with parameters for best quality
    let ws_url = format!(
        "wss://api.deepgram.com/v1/listen?\
        encoding=linear16&\
        sample_rate=16000&\
        channels=1&\
        punctuate=true&\
        interim_results=true&\
        endpointing=300&\
        vad_turnoff=500"
    );
    
    // Create connection with auth
    let request = http::Request::builder()
        .uri(&ws_url)
        .header("Authorization", format!("Token {}", api_key))
        .header("Sec-WebSocket-Protocol", "websocket")
        .header("Sec-WebSocket-Version", "13")
        .body(())
        .map_err(|e| format!("Failed to build request: {}", e))?;
    
    // Connect to WebSocket
    let (ws_stream, _) = connect_async(request)
        .await
        .map_err(|e| format!("Failed to connect to Deepgram: {}. Check your API key.", e))?;
    
    info!("✅ Connected to Deepgram WebSocket");
    IS_RUNNING.store(true, Ordering::Relaxed);
    
    let (ws_sender, mut ws_receiver) = ws_stream.split();
    let ws_sender = Arc::new(Mutex::new(ws_sender));
    
    // Setup audio capture
    let host = cpal::default_host();
    let device = host.default_input_device()
        .ok_or("No input device available")?;
    
    info!("Using audio device: {}", device.name().unwrap_or_default());
    
    // 16kHz mono for Deepgram
    let config = cpal::StreamConfig {
        channels: 1,
        sample_rate: cpal::SampleRate(16000),
        buffer_size: cpal::BufferSize::Fixed(1600), // 100ms chunks for low latency
    };
    
    // Clone for audio callback
    let ws_sender_clone = ws_sender.clone();
    
    // Build audio stream
    let stream = device.build_input_stream(
        &config,
        move |data: &[f32], _: &cpal::InputCallbackInfo| {
            if !IS_RUNNING.load(Ordering::Relaxed) {
                return;
            }
            
            // Convert f32 to i16 (LINEAR16 format)
            let i16_data: Vec<i16> = data.iter()
                .map(|&sample| {
                    let clamped = sample.max(-1.0).min(1.0);
                    (clamped * 32767.0) as i16
                })
                .collect();
            
            // Convert to bytes
            let bytes: Vec<u8> = i16_data.iter()
                .flat_map(|&sample| sample.to_le_bytes())
                .collect();
            
            // Send to Deepgram
            let sender = ws_sender_clone.clone();
            tokio::spawn(async move {
                let mut sender = sender.lock().await;
                if let Err(e) = sender.send(Message::Binary(bytes)).await {
                    error!("Failed to send audio to Deepgram: {}", e);
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
        let mut last_transcript = String::new();
        
        while let Some(msg) = ws_receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Ok(response) = serde_json::from_str::<DeepgramResponse>(&text) {
                        if let Some(channel) = response.channel {
                            if let Some(alt) = channel.alternatives.first() {
                                let transcript = &alt.transcript;
                                
                                // Skip empty transcripts
                                if transcript.is_empty() {
                                    continue;
                                }
                                
                                // Determine if this is final or interim
                                let is_final = response.is_final.unwrap_or(false) || 
                                              response.speech_final.unwrap_or(false);
                                
                                // Only emit if text changed (avoid duplicates)
                                if transcript != &last_transcript {
                                    info!("{} transcript: {} (confidence: {:.2})", 
                                        if is_final { "Final" } else { "Interim" },
                                        transcript, alt.confidence);
                                    
                                    let payload = TranscriptionPayload {
                                        text: transcript.clone(),
                                        is_final,
                                        timestamp: chrono::Utc::now().timestamp_millis() as u64,
                                        is_user: true,
                                    };
                                    
                                    let _ = app_for_receiver.emit_all("voice_transcription", payload);
                                    last_transcript = transcript.clone();
                                }
                                
                                // Clear last transcript on final to prepare for next utterance
                                if is_final {
                                    last_transcript.clear();
                                }
                            }
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
        
        IS_RUNNING.store(false, Ordering::Relaxed);
    });
    
    // Keep stream alive
    std::mem::forget(stream);
    
    Ok("Deepgram transcription started successfully".into())
}

// Stop transcription
#[tauri::command]
pub async fn stop_deepgram_transcription() -> Result<String, String> {
    info!("Stopping Deepgram transcription...");
    IS_RUNNING.store(false, Ordering::Relaxed);
    Ok("Deepgram transcription stopped".into())
}

// Get status
#[tauri::command]
pub async fn get_deepgram_status() -> Result<bool, String> {
    Ok(IS_RUNNING.load(Ordering::Relaxed))
}

// Test Deepgram connection
#[tauri::command]
pub async fn test_deepgram(api_key: String) -> Result<String, String> {
    info!("Testing Deepgram API key...");
    
    // Simple test: try to connect and immediately close
    let ws_url = "wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000";
    
    let request = http::Request::builder()
        .uri(ws_url)
        .header("Authorization", format!("Token {}", api_key))
        .header("Sec-WebSocket-Protocol", "websocket")
        .header("Sec-WebSocket-Version", "13")
        .body(())
        .map_err(|e| format!("Failed to build request: {}", e))?;
    
    match connect_async(request).await {
        Ok((ws_stream, _)) => {
            // Close immediately
            let (mut sender, _) = ws_stream.split();
            let _ = sender.close().await;
            Ok("Deepgram API key is valid!".into())
        },
        Err(e) => {
            Err(format!("Invalid API key or connection failed: {}", e))
        }
    }
}