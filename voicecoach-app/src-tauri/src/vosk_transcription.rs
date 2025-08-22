// Simple, working Vosk transcription for VoiceCoach
// Based on the AI input recommendations for fast, accurate transcription

use vosk::{Model, Recognizer, CompleteResult};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::{Arc, Mutex};
use std::sync::Arc as StdArc;  // Explicit Arc for model sharing
use serde::{Serialize, Deserialize};
use tauri::{AppHandle, Manager};
use log::{info, error, warn};
use anyhow::{Result, anyhow};
use std::path::Path;
use std::fs;

// Import breadcrumb system for proper debugging
use crate::breadcrumb_system::BreadcrumbTrail;

// Configuration structure matching vosk-config.json
#[derive(Deserialize, Clone, Debug)]
struct VoskConfig {
    model_paths: ModelPaths,
    recognizer_settings: RecognizerSettings,
    audio_processing: AudioProcessing,
    behavior: BehaviorSettings,
    audio_device: AudioDeviceSettings,
    debugging: DebuggingSettings,
}

#[derive(Deserialize, Clone, Debug)]
struct ModelPaths {
    large_model: String,
    small_model: String,
}

#[derive(Deserialize, Clone, Debug)]
struct RecognizerSettings {
    sample_rate: u32,
    partial_words: bool,
    words: bool,
}

#[derive(Deserialize, Clone, Debug)]
struct AudioProcessing {
    min_buffer_size: usize,
    silence_threshold: f32,
    silence_buffers_for_pause: u32,
}

#[derive(Deserialize, Clone, Debug)]
struct BehaviorSettings {
    emit_partials: bool,
    reset_on_finalization: bool,
    force_finalize_on_silence: bool,
}

#[derive(Deserialize, Clone, Debug)]
struct AudioDeviceSettings {
    prefer_16khz_native: bool,
    enable_resampling: bool,
    resample_ratio: u32,
}

#[derive(Deserialize, Clone, Debug)]
struct DebuggingSettings {
    enable_breadcrumbs: bool,
    audio_level_log_frequency: u32,
    log_processing_stats: bool,
}

// Load configuration from file (supports both .json and .jsonc with comments)
fn load_config() -> Result<VoskConfig> {
    // Try .jsonc first (with comments), then .json
    let config_paths = ["vosk-config.jsonc", "vosk-config.json"];
    let mut config_str = None;
    let mut used_path = "";
    
    for path in &config_paths {
        if let Ok(content) = fs::read_to_string(path) {
            config_str = Some(content);
            used_path = path;
            info!("Loading config from: {}", path);
            break;
        }
    }
    
    let config_str = config_str.unwrap_or_else(|| {
        warn!("No config file found, using defaults");
        include_str!("../../vosk-config.json").to_string()
    });
    
    // Strip comments from JSONC by removing lines that start with // or /* */
    let clean_json = config_str
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            !trimmed.starts_with("//") && !trimmed.starts_with("/*") && !trimmed.starts_with("*")
        })
        .collect::<Vec<_>>()
        .join("\n");
    
    // Parse as VoskConfig
    let config: VoskConfig = serde_json::from_str(&clean_json)
        .map_err(|e| anyhow!("Failed to deserialize config: {}", e))?;
    
    info!("Loaded Vosk configuration from {}: {:?}", used_path, config);
    Ok(config)
}


#[derive(Clone, Serialize, Deserialize)]
pub struct TranscriptionPayload {
    pub text: String,
    pub is_final: bool,
    pub timestamp: u64,
    pub is_user: bool,  // Identify if transcription is from user (true) or prospect (false)
    pub led_number: u32,  // LED tracking number to identify event source
    pub source: String,   // Source identifier (e.g., "vosk_final", "vosk_partial")
}

// Global state for managing the transcription status (stream stored separately)
static TRANSCRIPTION_RUNNING: once_cell::sync::Lazy<Arc<Mutex<bool>>> = 
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(false)));

// Simple stream ID to prevent duplicates (working solution)
static CURRENT_STREAM_ID: once_cell::sync::Lazy<Arc<Mutex<u32>>> = 
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(0)));

// Audio buffer to accumulate samples before processing
static AUDIO_BUFFER: once_cell::sync::Lazy<Arc<Mutex<Vec<i16>>>> = 
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(Vec::new())));

// Track last partial result to avoid duplicates
static LAST_PARTIAL: once_cell::sync::Lazy<Arc<Mutex<String>>> = 
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(String::new())));

// Track silence for pause detection (counts consecutive silent buffers)
static SILENCE_COUNTER: once_cell::sync::Lazy<Arc<Mutex<u32>>> = 
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(0)));

// VAD state tracking for smooth transitions
static VAD_STATE: once_cell::sync::Lazy<Arc<Mutex<VadState>>> = 
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(VadState::new())));

// Voice Activity Detection state with smoothing
struct VadState {
    speech_frames: u32,      // Consecutive frames detected as speech
    silence_frames: u32,     // Consecutive frames detected as silence
    is_speaking: bool,       // Current speaking state
    hangover_frames: u32,    // Frames to wait before ending speech
}

impl VadState {
    fn new() -> Self {
        VadState {
            speech_frames: 0,
            silence_frames: 0,
            is_speaking: false,
            hangover_frames: 0,
        }
    }
    
    fn update(&mut self, is_speech: bool) -> bool {
        const SPEECH_START_FRAMES: u32 = 3;   // Need 3 frames of speech to start (47ms at 16kHz/250ms chunks)
        const SPEECH_END_FRAMES: u32 = 10;    // Need 10 frames of silence to end (625ms)
        const HANGOVER_FRAMES: u32 = 5;       // Extra frames after speech ends
        
        if is_speech {
            self.speech_frames += 1;
            self.silence_frames = 0;
            
            if !self.is_speaking && self.speech_frames >= SPEECH_START_FRAMES {
                self.is_speaking = true;
                self.hangover_frames = HANGOVER_FRAMES;
                info!("🎤 Speech started (after {} frames)", self.speech_frames);
            }
        } else {
            self.silence_frames += 1;
            self.speech_frames = 0;
            
            if self.is_speaking {
                if self.hangover_frames > 0 {
                    self.hangover_frames -= 1;
                } else if self.silence_frames >= SPEECH_END_FRAMES {
                    self.is_speaking = false;
                    info!("🔇 Speech ended (after {} silence frames)", self.silence_frames);
                }
            }
        }
        
        self.is_speaking
    }
}

// We'll manage the stream lifetime differently - just keep it running
// The stream will be dropped when the app closes

// Initialize Vosk model (call this once at app startup)
pub fn initialize_vosk_model(model_path: &str) -> Result<()> {
    info!("Initializing Vosk model from: {}", model_path);
    
    // Verify model path exists
    if !Path::new(model_path).exists() {
        return Err(anyhow!("Vosk model not found at: {}", model_path));
    }
    
    // Test that we can load the model
    let _model = Model::new(model_path).ok_or_else(|| anyhow!("Failed to load Vosk model at: {}", model_path))?;
    
    info!("✅ Vosk model initialized successfully");
    Ok(())
}

// Start real-time transcription with Vosk using PRELOADED MODEL
#[tauri::command]
pub async fn start_vosk_transcription(app: AppHandle, model_path: String) -> Result<String, String> {
    let trail = BreadcrumbTrail::new("VoskTranscription");
    
    // Load configuration
    let vosk_config = load_config().map_err(|e| format!("Failed to load config: {}", e))?;
    
    // LED 700: Vosk transcription start
    if vosk_config.debugging.enable_breadcrumbs {
        trail.light(700, Some(serde_json::json!({
            "operation": "VOSK_TRANSCRIPTION_START",
            "model_path": model_path,
            "config": "loaded from vosk-config.json"
        })));
    }
    
    info!("Starting Vosk transcription (using preloaded model for <1s startup)");
    
    // Increment stream ID to invalidate any existing streams
    let stream_id = {
        let mut id = CURRENT_STREAM_ID.lock().unwrap();
        *id += 1;
        info!("📌 Starting new transcription stream with ID: {}", *id);
        *id
    };
    
    // FAST STARTUP: Try to use preloaded model from app state first
    let model = if let Some(state) = app.try_state::<crate::VoskAppState>() {
        if let Some(ref model_arc) = *state.model {
            info!("⚡ Using preloaded Vosk model - instant startup!");
            // Clone the Arc reference to the model
            model_arc.clone()
        } else {
            info!("⚠️ No preloaded model, loading now (will be slower)...");
            // Fallback to loading model now
            let actual_model_path = if model_path == "auto" {
                if Path::new(&vosk_config.model_paths.large_model).exists() {
                    vosk_config.model_paths.large_model.clone()
                } else if Path::new(&vosk_config.model_paths.small_model).exists() {
                    vosk_config.model_paths.small_model.clone()
                } else {
                    return Err(format!("No model found at configured paths"));
                }
            } else {
                model_path.clone()
            };
            Arc::new(Model::new(&actual_model_path).ok_or_else(|| format!("Failed to load model at: {}", actual_model_path))?)
        }
    } else {
        info!("⚠️ No app state, loading model now (will be slower)...");
        // No app state, load model the old way
        let actual_model_path = if model_path == "auto" {
            if Path::new(&vosk_config.model_paths.large_model).exists() {
                vosk_config.model_paths.large_model.clone()
            } else if Path::new(&vosk_config.model_paths.small_model).exists() {
                vosk_config.model_paths.small_model.clone()
            } else {
                return Err(format!("No model found at configured paths"));
            }
        } else {
            model_path.clone()
        };
        Arc::new(Model::new(&actual_model_path).ok_or_else(|| format!("Failed to load model at: {}", actual_model_path))?)
    };
    
    // Create recognizer with configured sample rate
    let mut recognizer = Recognizer::new(&model, vosk_config.recognizer_settings.sample_rate as f32)
        .ok_or_else(|| "Failed to create recognizer".to_string())?;
    
    // Configure recognizer from config
    recognizer.set_partial_words(vosk_config.recognizer_settings.partial_words);
    recognizer.set_words(vosk_config.recognizer_settings.words);
    
    // Get audio input device
    let host = cpal::default_host();
    let device = host.default_input_device()
        .ok_or("No input device available")?;
    
    info!("Using audio device: {}", device.name().unwrap_or_default());
    
    // Log supported configurations
    if let Ok(configs) = device.supported_input_configs() {
        info!("Supported audio configurations:");
        for (i, config) in configs.enumerate() {
            info!("  Config {}: channels={}, sample_rate={}-{}", 
                i, 
                config.channels(),
                config.min_sample_rate().0,
                config.max_sample_rate().0
            );
        }
    }
    
    // CRITICAL: Force 16kHz mono PCM configuration for Vosk
    let config = cpal::StreamConfig {
        channels: 1,  // MUST be mono for Vosk
        sample_rate: cpal::SampleRate(16000),  // MUST be 16kHz for Vosk
        buffer_size: cpal::BufferSize::Fixed(4000),  // 250ms buffer at 16kHz
    };
    
    info!("Forcing optimal Vosk config: 16kHz mono PCM");
    
    // Test if device supports this config
    let test_stream = device.build_input_stream(
        &config,
        |_: &[f32], _: &_| {},
        |_| {},
        None
    );
    
    let needs_resampling = match test_stream {
        Ok(_) => {
            info!("✅ Device supports 16kHz mono natively!");
            false
        }
        Err(_) => {
            // Device doesn't support 16kHz, use default and resample
            warn!("Device doesn't support 16kHz, will use default rate and resample");
            true
        }
    };
    
    // If we need resampling, get the default config instead
    let config = if needs_resampling {
        let default_config = device.default_input_config()
            .map_err(|e| format!("Failed to get default config: {}", e))?;
        info!("Using device default: {} Hz, {} channels - will resample to 16kHz mono", 
            default_config.sample_rate().0, default_config.channels());
        
        // CRITICAL: Force mono - Vosk ONLY works with mono audio!
        // We were right the first time - force mono here
        cpal::StreamConfig {
            channels: 1,  // MUST be mono for Vosk
            sample_rate: default_config.sample_rate(),
            buffer_size: cpal::BufferSize::Default,
        }
    } else {
        config
    };
    let recognizer = Arc::new(Mutex::new(recognizer));
    let recognizer_clone = recognizer.clone();
    
    // Get the actual sample rate we're using
    let actual_sample_rate = config.sample_rate.0;
    let needs_resampling = actual_sample_rate != 16000;
    
    // Use configuration values
    let min_buffer_size = vosk_config.audio_processing.min_buffer_size;
    let silence_threshold = vosk_config.audio_processing.silence_threshold;
    let silence_buffers_for_pause = vosk_config.audio_processing.silence_buffers_for_pause;
    let emit_partials = vosk_config.behavior.emit_partials;
    let reset_on_finalization = vosk_config.behavior.reset_on_finalization;
    let force_finalize_on_silence = vosk_config.behavior.force_finalize_on_silence;
    let enable_breadcrumbs = vosk_config.debugging.enable_breadcrumbs;
    let audio_level_log_frequency = vosk_config.debugging.audio_level_log_frequency;
    let _log_processing_stats = vosk_config.debugging.log_processing_stats;
    
    // Clone for the audio callback
    let current_id = Arc::clone(&CURRENT_STREAM_ID);
    
    // Build the audio stream
    let stream = device.build_input_stream(
        &config,
        move |data: &[f32], _: &cpal::InputCallbackInfo| {
            // Log that we received audio data
            static CALLBACK_COUNT: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);
            let count = CALLBACK_COUNT.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            if count == 0 {
                info!("🎙️ AUDIO CALLBACK FIRST CALL - Stream is working! Data length: {}", data.len());
            }
            
            // Check if this is still the current stream
            {
                let current = current_id.lock().unwrap();
                if *current != stream_id {
                    return; // This stream has been superseded
                }
            }
            
            // Resample if needed (we're already in mono from the config)
            let samples = if needs_resampling {
                // Simple decimation for 48kHz -> 16kHz (ratio of 3:1)
                // This is what was working before!
                let ratio = actual_sample_rate / 16000;
                if ratio == 3 {
                    // Fast path for common 48kHz -> 16kHz conversion
                    let mut resampled = Vec::with_capacity(data.len() / 3);
                    for i in (0..data.len()).step_by(3) {
                        resampled.push(data[i]);
                    }
                    
                    // Log occasionally
                    use std::sync::atomic::{AtomicU32, Ordering};
                    static RESAMPLE_LOG_COUNTER: AtomicU32 = AtomicU32::new(0);
                    let count = RESAMPLE_LOG_COUNTER.fetch_add(1, Ordering::Relaxed);
                    if count % 100 == 0 {
                        info!("Decimated {} samples to {} samples (48kHz->16kHz)", 
                            data.len(), resampled.len());
                    }
                    resampled
                } else {
                    // Linear interpolation for other ratios
                    let ratio_f = actual_sample_rate as f32 / 16000.0;
                    let output_len = (data.len() as f32 / ratio_f) as usize;
                    let mut resampled = Vec::with_capacity(output_len);
                    
                    for i in 0..output_len {
                        let src_idx = i as f32 * ratio_f;
                        let idx_floor = src_idx.floor() as usize;
                        let idx_ceil = (idx_floor + 1).min(data.len() - 1);
                        let frac = src_idx - idx_floor as f32;
                        
                        let sample = if idx_floor < data.len() {
                            data[idx_floor] * (1.0 - frac) + data[idx_ceil] * frac
                        } else {
                            0.0
                        };
                        resampled.push(sample);
                    }
                    resampled
                }
            } else {
                data.to_vec()
            };
            
            // Calculate RMS for monitoring only
            let rms = (samples.iter().map(|&s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
            
            // DISABLED VAD - Process ALL audio like Python
            let is_silent = false;
            
            // LED 720: Audio level monitoring (configurable frequency)
            if enable_breadcrumbs {
                // Use atomic counter for thread safety and proper initialization
                use std::sync::atomic::{AtomicU32, Ordering};
                static AUDIO_COUNTER: AtomicU32 = AtomicU32::new(0);
                
                let count = AUDIO_COUNTER.fetch_add(1, Ordering::Relaxed);
                if count % audio_level_log_frequency == 0 {
                        let trail = BreadcrumbTrail::new("VoskAudio");
                        trail.light(720, Some(serde_json::json!({
                            "operation": "VOSK_AUDIO_LEVELS",
                            "rms": rms,
                            "silent": is_silent,
                            "threshold": silence_threshold,
                            "samples": samples.len()
                        })));
                }
            }
            
            // CRITICAL FIX: Proper f32 to i16 conversion with clamping to prevent clipping
            let i16_data: Vec<i16> = samples.iter()
                .map(|&sample| {
                    // Clamp to [-1.0, 1.0] range first to prevent overflow
                    let clamped = sample.max(-1.0).min(1.0);
                    // Scale to i16 range
                    (clamped * 32767.0) as i16
                })
                .collect();
            
            // TEMPORARILY DISABLED: Skip processing if VAD says no speech (save CPU)
            // if is_silent && LAST_PARTIAL.lock().unwrap().is_empty() {
            //     // No speech detected and no partial result to finalize - skip processing
            //     return;
            // }
            
            // MATCH PYTHON: Process immediately, no buffering!
            {
                // Log first audio reception
                use std::sync::Once;
                static FIRST_AUDIO: Once = Once::new();
                FIRST_AUDIO.call_once(|| {
                    info!("🎤 VOSK: First audio data received! Sample count: {}, RMS: {:.4}", i16_data.len(), rms);
                });
                
                // DIRECT PROCESSING LIKE PYTHON - NO BUFFERING
                // LED 730: Vosk processing 
                if enable_breadcrumbs && i16_data.len() % 100 == 0 {  // Log less frequently
                    let trail = BreadcrumbTrail::new("VoskProcessing");
                    trail.light(730, Some(serde_json::json!({
                        "operation": "VOSK_PROCESSING_AUDIO",
                        "samples": i16_data.len(),
                        "rms": rms
                    })));
                }
                
                // PYTHON-LIKE SIMPLE PROCESSING
                let mut rec = recognizer_clone.lock().unwrap();
                
                // Just call accept_waveform directly with the audio data - exactly like Python!
                match rec.accept_waveform(&i16_data) {
                        Ok(state) => {
                            use vosk::DecodingState;
                            
                            if state == DecodingState::Finalized {
                                // Get final result
                                let result = rec.final_result();
                        match result {
                            CompleteResult::Single(res) => {
                                if !res.text.is_empty() {
                                    // LED 740: Vosk final result
                                    if enable_breadcrumbs {
                                        let trail = BreadcrumbTrail::new("VoskResults");
                                        trail.light(740, Some(serde_json::json!({
                                            "operation": "VOSK_FINAL_RESULT",
                                            "text": res.text,
                                            "length": res.text.len()
                                        })));
                                    }
                                    
                                    let payload = TranscriptionPayload {
                                        text: res.text.to_string(),
                                        is_final: true,
                                        timestamp: chrono::Utc::now().timestamp_millis() as u64,
                                        is_user: true,  // Microphone input is always from user
                                        led_number: 8001,  // LED tracking for final transcriptions
                                        source: "vosk_final".to_string(),
                                    };
                                    
                                    // Clear last partial since we finalized
                                    LAST_PARTIAL.lock().unwrap().clear();
                                    
                                    // Emit to frontend with LED tracking
                                    info!("🎯 LED 8001 - VOSK EMITTING FINAL TRANSCRIPTION: '{}'", res.text);
                                    match app.emit_all("voice_transcription", payload) {
                                        Ok(_) => info!("✅ LED 8001 - Transcription event emitted successfully"),
                                        Err(e) => error!("❌ LED 8001 - Failed to emit transcription: {:?}", e),
                                    }
                                }
                            }
                            _ => {}
                        }
                        
                        // CRITICAL: Reset recognizer state after finalization (if configured)
                        // This ensures consistent behavior for subsequent speech
                        if reset_on_finalization {
                            rec.reset();
                        }
                    } else {
                        // Partial result - check if we should emit it
                        if emit_partials {
                            let partial = rec.partial_result();
                            let partial_text = partial.partial;
                            
                            let mut last_partial = LAST_PARTIAL.lock().unwrap();
                            if !partial_text.is_empty() && partial_text != *last_partial {
                                // LED 750: Vosk partial result
                                if enable_breadcrumbs {
                                    let trail = BreadcrumbTrail::new("VoskResults");
                                    trail.light(750, Some(serde_json::json!({
                                        "operation": "VOSK_PARTIAL_RESULT",
                                        "text": partial_text,
                                        "length": partial_text.len()
                                    })));
                                }
                                
                                let payload = TranscriptionPayload {
                                    text: partial_text.to_string(),
                                    is_final: false,
                                    timestamp: chrono::Utc::now().timestamp_millis() as u64,
                                    is_user: true,
                                    led_number: 8002,  // LED tracking for partial transcriptions
                                    source: "vosk_partial".to_string(),
                                };
                                
                                // Update last partial
                                *last_partial = partial_text.to_string();
                                
                                // Emit partial to frontend with LED tracking
                                info!("🎙️ LED 8002 - VOSK PARTIAL: '{}'", partial_text);
                                match app.emit_all("voice_transcription", payload) {
                                    Ok(_) => info!("✅ LED 8002 - Partial event emitted"),
                                    Err(e) => error!("❌ LED 8002 - Failed to emit partial: {:?}", e),
                            }
                        }
                    }
                    }
                },
                Err(e) => {
                    error!("Failed to accept waveform: {:?}", e);
                }
            }
        }
        },
        |err| {
            error!("Audio stream error: {:?}", err);
        },
        None
    ).map_err(|e| format!("Failed to build audio stream: {}", e))?;
    
    // Start the stream
    stream.play().map_err(|e| format!("Failed to start stream: {}", e))?;
    
    // Store running state
    {
        let mut running = TRANSCRIPTION_RUNNING.lock().unwrap();
        *running = true;
    }
    
    // Leak the stream to keep it alive (we'll recreate on stop/start)
    // This is a workaround for cpal::Stream not being Send+Sync
    std::mem::forget(stream);
    
    info!("✅ Vosk transcription started successfully");
    Ok("Transcription started".into())
}

// Stop transcription
#[tauri::command]
pub async fn stop_vosk_transcription() -> Result<String, String> {
    info!("Stopping Vosk transcription...");
    
    // Force stop all transcription processing
    {
        let mut running = TRANSCRIPTION_RUNNING.lock().unwrap();
        *running = false;
    }
    
    // Clear all state immediately
    {
        let mut buffer = AUDIO_BUFFER.lock().unwrap();
        buffer.clear();
        
        let mut last = LAST_PARTIAL.lock().unwrap();
        last.clear();
        
        let mut silence = SILENCE_COUNTER.lock().unwrap();
        *silence = 0;
    }
    
    // Give threads a moment to stop processing
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    
    info!("✅ Vosk transcription stopped");
    Ok("Transcription stopped".into())
}

// Get transcription status
#[tauri::command]
pub async fn get_vosk_status() -> Result<bool, String> {
    let running = TRANSCRIPTION_RUNNING.lock().unwrap();
    Ok(*running)
}

// Simple test command to verify Vosk is working
#[tauri::command]
pub async fn test_vosk() -> Result<String, String> {
    info!("Testing Vosk installation...");
    
    // Try to create a model - prefer the larger, more accurate model
    let test_model_path = if Path::new("../models/vosk-model-en-us-0.22-lgraph/vosk-model-en-us-0.22-lgraph").exists() {
        "../models/vosk-model-en-us-0.22-lgraph/vosk-model-en-us-0.22-lgraph"
    } else if Path::new("models/vosk-model-en-us-0.22-lgraph/vosk-model-en-us-0.22-lgraph").exists() {
        "models/vosk-model-en-us-0.22-lgraph/vosk-model-en-us-0.22-lgraph"
    } else if Path::new("../../models/vosk-model-en-us-0.22-lgraph/vosk-model-en-us-0.22-lgraph").exists() {
        "../../models/vosk-model-en-us-0.22-lgraph/vosk-model-en-us-0.22-lgraph"
    } else if Path::new("../models/vosk-model-small-en-us-0.15").exists() {
        "../models/vosk-model-small-en-us-0.15"
    } else if Path::new("models/vosk-model-small-en-us-0.15").exists() {
        "models/vosk-model-small-en-us-0.15"
    } else {
        "../../models/vosk-model-small-en-us-0.15"
    };
    
    if !Path::new(test_model_path).exists() {
        return Err(format!("Test model not found at: {}. Please download from https://alphacephei.com/vosk/models", test_model_path));
    }
    
    match Model::new(test_model_path) {
        Some(_) => Ok("Vosk is working correctly!".into()),
        None => Err(format!("Vosk test failed: Could not load model at {}", test_model_path))
    }
}