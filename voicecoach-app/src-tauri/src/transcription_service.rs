// Production-grade transcription service for VoiceCoach
// This module provides robust, scalable transcription with proper error handling

use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use parking_lot::Mutex;
use std::collections::VecDeque;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use log::{info, warn, error};
use crate::{led_light, led_fail};
use tauri::{AppHandle, Manager};
use crate::breadcrumb_system::BreadcrumbTrail;
use serde_json;

// Configuration for transcription services
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionConfig {
    pub service: TranscriptionService,
    pub api_key: Option<String>,
    pub model: String,
    pub language: String,
    pub sample_rate: u32,
    pub chunk_duration_ms: u32,
    pub max_retry_attempts: u32,
    pub retry_delay_ms: u64,
    pub timeout_seconds: u64,
    pub min_audio_level: f32,  // Minimum audio level to send for transcription
    pub silence_threshold_ms: u64,  // How long to wait before considering silence
    pub vad_enabled: bool,  // Voice Activity Detection
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TranscriptionService {
    Vosk,             // Vosk offline speech recognition
    WhisperLocal,     // Local Whisper model
    WhisperAPI,       // OpenAI Whisper API
    AssemblyAI,       // AssemblyAI service
    Deepgram,         // Deepgram service
    AzureSpeech,      // Azure Speech Services
    GoogleSpeech,     // Google Cloud Speech-to-Text
}

// Result from transcription service
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub text: String,
    pub confidence: f32,
    pub language: String,
    pub is_final: bool,
    pub timestamp: u64,
    pub duration_ms: u64,
    pub words: Vec<WordTiming>,
    pub speaker_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordTiming {
    pub word: String,
    pub start_ms: u64,
    pub end_ms: u64,
    pub confidence: f32,
}

// Event structure for frontend communication
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionEvent {
    pub text: String,
    pub is_final: bool,
    pub confidence: f32,
    pub timestamp: u64,
    pub is_user: bool,  // true for user speech, false for system audio
    pub event_id: String,  // unique identifier for this event
    pub chunk_id: u64,  // sequential chunk identifier
    pub session_id: String,  // session identifier for multi-session apps
}

// Audio buffer for managing chunks
struct AudioBuffer {
    samples: VecDeque<f32>,
    sample_rate: u32,
    chunk_size: usize,
    last_activity: Instant,
    total_samples_processed: u64,
}

impl AudioBuffer {
    fn new(sample_rate: u32, chunk_duration_ms: u32) -> Self {
        let chunk_size = ((sample_rate as f32 * chunk_duration_ms as f32) / 1000.0) as usize;
        Self {
            samples: VecDeque::with_capacity(chunk_size * 4), // Buffer up to 4 chunks
            sample_rate,
            chunk_size,
            last_activity: Instant::now(),
            total_samples_processed: 0,
        }
    }

    fn add_samples(&mut self, new_samples: &[f32]) {
        self.samples.extend(new_samples);
        
        // Prevent unbounded growth - keep max 10 seconds of audio
        let max_samples = self.sample_rate as usize * 10;
        while self.samples.len() > max_samples {
            self.samples.pop_front();
        }
    }

    fn get_chunk(&mut self) -> Option<Vec<f32>> {
        if self.samples.len() >= self.chunk_size {
            let chunk: Vec<f32> = self.samples.drain(..self.chunk_size).collect();
            self.total_samples_processed += chunk.len() as u64;
            Some(chunk)
        } else {
            None
        }
    }

    fn calculate_audio_level(samples: &[f32]) -> f32 {
        if samples.is_empty() {
            return 0.0;
        }
        
        let sum: f32 = samples.iter().map(|s| s.abs()).sum();
        sum / samples.len() as f32
    }

    fn detect_voice_activity(samples: &[f32], threshold: f32) -> bool {
        // Simple VAD based on energy threshold
        // In production, use WebRTC VAD or similar
        Self::calculate_audio_level(samples) > threshold
    }
}

// Main transcription manager
pub struct TranscriptionManager {
    config: TranscriptionConfig,
    audio_buffer: Arc<Mutex<AudioBuffer>>,
    is_active: Arc<Mutex<bool>>,
    http_client: reqwest::Client,
    last_transcription: Arc<Mutex<Option<TranscriptionResult>>>,
    error_count: Arc<Mutex<u32>>,
    success_count: Arc<Mutex<u64>>,
    app_handle: AppHandle,  // Tauri app handle for event emission
    session_id: String,  // Session identifier
    chunk_counter: Arc<Mutex<u64>>,  // Sequential chunk counter
}

impl TranscriptionManager {
    pub fn new(config: TranscriptionConfig, app_handle: AppHandle) -> Result<Self> {
        info!("🎯 Initializing TranscriptionManager with {:?}", config.service);
        
        // Validate configuration
        Self::validate_config(&config)?;
        
        // IMPORTANT: AudioBuffer uses CPAL's sample rate (48kHz), not Vosk's (16kHz)
        // We'll resample later in prepare_audio_data()
        let audio_buffer = AudioBuffer::new(48000, config.chunk_duration_ms);
        
        // Configure HTTP client with proper timeouts
        let http_client = reqwest::Client::builder()
            .timeout(Duration::from_secs(config.timeout_seconds))
            .connect_timeout(Duration::from_secs(10))
            .build()
            .context("Failed to create HTTP client")?;
        
        // Generate unique session ID
        let session_id = format!("session_{}", 
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis()
        );
        
        Ok(Self {
            config,
            audio_buffer: Arc::new(Mutex::new(audio_buffer)),
            is_active: Arc::new(Mutex::new(false)),
            http_client,
            last_transcription: Arc::new(Mutex::new(None)),
            error_count: Arc::new(Mutex::new(0)),
            success_count: Arc::new(Mutex::new(0)),
            app_handle,
            session_id,
            chunk_counter: Arc::new(Mutex::new(0)),
        })
    }

    fn validate_config(config: &TranscriptionConfig) -> Result<()> {
        // Validate API key if required
        match config.service {
            TranscriptionService::Vosk | TranscriptionService::WhisperLocal => {
                // No API key needed for local services
            }
            _ => {
                if config.api_key.is_none() || config.api_key.as_ref().unwrap().is_empty() {
                    return Err(anyhow::anyhow!(
                        "API key required for {:?} service", 
                        config.service
                    ));
                }
            }
        }
        
        // Validate audio parameters
        if config.sample_rate < 8000 || config.sample_rate > 48000 {
            return Err(anyhow::anyhow!(
                "Invalid sample rate: {}. Must be between 8000 and 48000 Hz", 
                config.sample_rate
            ));
        }
        
        if config.chunk_duration_ms < 100 || config.chunk_duration_ms > 30000 {
            return Err(anyhow::anyhow!(
                "Invalid chunk duration: {}ms. Must be between 100ms and 30s", 
                config.chunk_duration_ms
            ));
        }
        
        Ok(())
    }

    pub fn start(&self) -> Result<()> {
        let mut is_active = self.is_active.lock();
        if *is_active {
            return Ok(()); // Already running
        }
        
        *is_active = true;
        info!("✅ TranscriptionManager started");
        Ok(())
    }

    pub fn stop(&self) -> Result<()> {
        let mut is_active = self.is_active.lock();
        *is_active = false;
        info!("🛑 TranscriptionManager stopped");
        Ok(())
    }

    pub fn add_audio(&self, samples: Vec<f32>) -> Result<()> {
        if !*self.is_active.lock() {
            info!("TranscriptionManager: Ignoring audio - not active");
            return Ok(()); // Not active, ignore audio
        }
        
        let mut buffer = self.audio_buffer.lock();
        buffer.add_samples(&samples);
        info!("TranscriptionManager: Added {} audio samples to buffer", samples.len());
        
        // Process any complete chunks
        while let Some(chunk) = buffer.get_chunk() {
            // Check if chunk has sufficient audio level
            let level = AudioBuffer::calculate_audio_level(&chunk);
            info!("TranscriptionManager: Got chunk with {} samples, level: {}", chunk.len(), level);
            
            if level < self.config.min_audio_level {
                info!("TranscriptionManager: Skipping silent chunk (level {} < min {})", level, self.config.min_audio_level);
                continue; // Skip silent chunks
            }
            
            // Check VAD if enabled
            if self.config.vad_enabled {
                if !AudioBuffer::detect_voice_activity(&chunk, self.config.min_audio_level) {
                    info!("TranscriptionManager: VAD - no voice detected");
                    continue; // No voice detected
                }
            }
            
            info!("TranscriptionManager: Processing chunk with voice activity");
            
            // Process chunk asynchronously
            let manager = self.clone();
            let chunk_clone = chunk.clone();
            std::thread::spawn(move || {
                if let Err(e) = manager.process_chunk(chunk_clone) {
                    error!("Failed to process audio chunk: {}", e);
                    *manager.error_count.lock() += 1;
                }
            });
        }
        
        Ok(())
    }

    fn process_chunk(&self, chunk: Vec<f32>) -> Result<()> {
        info!("📝 Processing audio chunk with {} samples", chunk.len());
        
        // Convert audio format if needed
        let audio_data = self.prepare_audio_data(chunk)?;
        
        // Send to transcription service with retry logic
        let mut attempts = 0;
        let mut last_error = None;
        
        while attempts < self.config.max_retry_attempts {
            match self.send_to_service(&audio_data) {
                Ok(result) => {
                    info!("✅ Transcription successful: {}", result.text);
                    *self.last_transcription.lock() = Some(result.clone());
                    *self.success_count.lock() += 1;
                    
                    // Emit event to frontend (will implement)
                    self.emit_transcription_event(result)?;
                    return Ok(());
                }
                Err(e) => {
                    warn!("Transcription attempt {} failed: {}", attempts + 1, e);
                    last_error = Some(e);
                    attempts += 1;
                    
                    if attempts < self.config.max_retry_attempts {
                        std::thread::sleep(Duration::from_millis(
                            self.config.retry_delay_ms * attempts as u64
                        ));
                    }
                }
            }
        }
        
        Err(last_error.unwrap_or_else(|| anyhow::anyhow!("Transcription failed after {} attempts", attempts)))
    }

    fn prepare_audio_data(&self, samples: Vec<f32>) -> Result<Vec<u8>> {
        // CRITICAL: Resample audio if needed
        // CPAL captures at 48kHz but Vosk expects 16kHz
        let resampled = if self.config.sample_rate != 48000 {
            // Need to resample from 48kHz (CPAL) to target rate (16kHz for Vosk)
            self.resample_audio(&samples, 48000, self.config.sample_rate)?
        } else {
            samples
        };
        
        // Convert f32 samples to 16-bit PCM bytes
        let mut audio_data = Vec::with_capacity(resampled.len() * 2);
        
        for sample in resampled {
            // Clamp to prevent overflow
            let clamped = sample.max(-1.0).min(1.0);
            let sample_i16 = (clamped * i16::MAX as f32) as i16;
            audio_data.extend_from_slice(&sample_i16.to_le_bytes());
        }
        
        Ok(audio_data)
    }
    
    fn resample_audio(&self, samples: &[f32], from_rate: u32, to_rate: u32) -> Result<Vec<f32>> {
        if from_rate == to_rate {
            return Ok(samples.to_vec());
        }
        
        // Simple linear interpolation resampling
        // For 48kHz to 16kHz, we take every 3rd sample (48/16 = 3)
        let ratio = from_rate as f32 / to_rate as f32;
        let output_len = (samples.len() as f32 / ratio) as usize;
        let mut resampled = Vec::with_capacity(output_len);
        
        for i in 0..output_len {
            let src_idx = i as f32 * ratio;
            let idx = src_idx as usize;
            
            if idx + 1 < samples.len() {
                // Linear interpolation between samples
                let frac = src_idx - idx as f32;
                let sample = samples[idx] * (1.0 - frac) + samples[idx + 1] * frac;
                resampled.push(sample);
            } else if idx < samples.len() {
                resampled.push(samples[idx]);
            }
        }
        
        info!("Resampled audio: {} samples @ {}Hz → {} samples @ {}Hz", 
              samples.len(), from_rate, resampled.len(), to_rate);
        
        Ok(resampled)
    }

    fn send_to_service(&self, audio_data: &[u8]) -> Result<TranscriptionResult> {
        match self.config.service {
            TranscriptionService::Vosk => self.transcribe_with_vosk(audio_data),
            TranscriptionService::WhisperLocal => self.transcribe_with_local_whisper(audio_data),
            TranscriptionService::WhisperAPI => self.transcribe_with_whisper_api(audio_data),
            TranscriptionService::AssemblyAI => self.transcribe_with_assemblyai(audio_data),
            TranscriptionService::Deepgram => self.transcribe_with_deepgram(audio_data),
            TranscriptionService::AzureSpeech => self.transcribe_with_azure(audio_data),
            TranscriptionService::GoogleSpeech => self.transcribe_with_google(audio_data),
        }
    }

    fn transcribe_with_vosk(&self, audio_data: &[u8]) -> Result<TranscriptionResult> {
        // Implement Vosk following AI input notes with LED breadcrumbs
        use std::sync::OnceLock;
        use parking_lot::Mutex;
        
        // LED 8000: Vosk transcription started with detailed audio info
        let trail = BreadcrumbTrail::new("VoskTranscription");
        
        // Calculate audio characteristics for debugging
        let sample_count = audio_data.len() / 2; // 2 bytes per i16 sample
        let duration_ms = (sample_count as f32 / self.config.sample_rate as f32 * 1000.0) as u32;
        
        // Check audio level to see if we have real audio
        let samples_i16: Vec<i16> = audio_data
            .chunks_exact(2)
            .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]))
            .collect();
        
        let max_amplitude = samples_i16.iter().map(|&s| s.abs()).max().unwrap_or(0);
        let avg_amplitude = if !samples_i16.is_empty() {
            samples_i16.iter().map(|&s| s.abs() as i32).sum::<i32>() / samples_i16.len() as i32
        } else {
            0
        };
        
        led_light!(trail, 8000, serde_json::json!({
            "operation": "vosk_transcribe_start",
            "audio_bytes": audio_data.len(),
            "sample_count": sample_count,
            "duration_ms": duration_ms,
            "sample_rate": self.config.sample_rate,
            "max_amplitude": max_amplitude,
            "avg_amplitude": avg_amplitude,
            "has_audio": max_amplitude > 100
        }));
        
        // Static Vosk model and recognizer (initialized once)
        static VOSK_MODEL: OnceLock<Option<vosk::Model>> = OnceLock::new();
        static VOSK_RECOGNIZER: OnceLock<Mutex<Option<vosk::Recognizer>>> = OnceLock::new();
        
        // LED 8001: Initialize Vosk model if needed
        let model = VOSK_MODEL.get_or_init(|| {
            led_light!(trail, 8001, serde_json::json!({"operation": "vosk_model_init"}));
            
            // Model path relative to the app's working directory
            let model_path = "../models/vosk-model-small-en-us-0.15";
            info!("Loading Vosk model from: {}", model_path);
            
            match vosk::Model::new(model_path) {
                Some(m) => {
                    led_light!(trail, 8002, serde_json::json!({
                        "operation": "vosk_model_loaded",
                        "model_path": model_path,
                        "success": true
                    }));
                    info!("✅ Vosk model loaded successfully");
                    Some(m)
                }
                None => {
                    led_fail!(trail, 8002, "Failed to load Vosk model");
                    error!("Failed to load Vosk model from: {}", model_path);
                    None
                }
            }
        });
        
        let model = model.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Vosk model not available"))?;
        
        // LED 8003: Initialize Vosk recognizer if needed
        let recognizer_mutex = VOSK_RECOGNIZER.get_or_init(|| {
            led_light!(trail, 8003, serde_json::json!({"operation": "vosk_recognizer_init"}));
            
            match vosk::Recognizer::new(model, self.config.sample_rate as f32) {
                Some(mut r) => {
                    // Enable partial words for real-time feedback
                    r.set_words(true);
                    
                    led_light!(trail, 8004, serde_json::json!({
                        "operation": "vosk_recognizer_created",
                        "sample_rate": self.config.sample_rate,
                        "success": true
                    }));
                    info!("✅ Vosk recognizer created ({}Hz)", self.config.sample_rate);
                    Mutex::new(Some(r))
                }
                None => {
                    led_fail!(trail, 8004, "Failed to create Vosk recognizer");
                    error!("Failed to create Vosk recognizer");
                    Mutex::new(None)
                }
            }
        });
        
        let mut recognizer_guard = recognizer_mutex.lock();
        let recognizer = recognizer_guard.as_mut()
            .ok_or_else(|| anyhow::anyhow!("Vosk recognizer not available"))?;
        
        // LED 8005: Convert audio format (f32 to i16 as per AI input notes)
        led_light!(trail, 8005, serde_json::json!({
            "operation": "audio_format_conversion",
            "from": "u8_bytes",
            "to": "i16_samples",
            "byte_count": audio_data.len()
        }));
        
        // Audio data comes as bytes, we need to convert to i16 samples
        // Assuming audio_data is already in i16 format (2 bytes per sample)
        let samples: Vec<i16> = audio_data
            .chunks_exact(2)
            .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]))
            .collect();
        
        led_light!(trail, 8006, serde_json::json!({
            "operation": "samples_converted",
            "sample_count": samples.len(),
            "expected_duration_ms": (samples.len() as f32 / self.config.sample_rate as f32 * 1000.0) as u32
        }));
        
        // LED 8007: Feed audio to Vosk
        led_light!(trail, 8007, serde_json::json!({
            "operation": "feeding_audio_to_vosk",
            "sample_count": samples.len()
        }));
        
        // Accept waveform - Vosk will tell us if it has a final result
        let accept_result = recognizer.accept_waveform(&samples);
        
        // Check if we have a final result or partial
        let (is_final, text) = match accept_result {
            Ok(vosk::DecodingState::Finalized) => {
                // LED 8008: Final result available
                led_light!(trail, 8008, serde_json::json!({
                    "operation": "vosk_final_result_available",
                    "state": "finalized"
                }));
                
                // Get final result - returns CompleteResult enum
                let result = recognizer.result();
                
                // Extract text from CompleteResult
                let text = match result {
                    vosk::CompleteResult::Single(res) => {
                        led_light!(trail, 8009, serde_json::json!({
                            "operation": "vosk_final_single_result",
                            "has_text": !res.text.is_empty()
                        }));
                        res.text.to_string()
                    }
                    vosk::CompleteResult::Multiple(results) => {
                        // Multiple alternatives - take the first one
                        led_light!(trail, 8009, serde_json::json!({
                            "operation": "vosk_final_multi_result",
                            "alternatives": results.alternatives.len()
                        }));
                        results.alternatives.first()
                            .map(|alt| alt.text.to_string())
                            .unwrap_or_default()
                    }
                };
                
                (true, text)
            }
            Ok(vosk::DecodingState::Running) => {
                // LED 8010: Partial result
                led_light!(trail, 8010, serde_json::json!({
                    "operation": "vosk_partial_result",
                    "state": "running"
                }));
                
                // Get partial result - returns PartialResult struct
                let result = recognizer.partial_result();
                let text = result.partial.to_string();
                
                led_light!(trail, 8011, serde_json::json!({
                    "operation": "vosk_partial_text",
                    "text_length": text.len()
                }));
                
                (false, text)
            }
            Ok(vosk::DecodingState::Failed) | Err(_) => {
                led_fail!(trail, 8008, "Vosk decoding failed");
                return Err(anyhow::anyhow!("Vosk decoding failed"));
            }
        };
        
        // LED 8012: Check if we have text
        if text.is_empty() {
            led_light!(trail, 8012, serde_json::json!({
                "operation": "no_speech_detected",
                "skipping": true
            }));
            return Err(anyhow::anyhow!("No speech detected"));
        }
        
        // LED 8013: Transcription successful
        led_light!(trail, 8013, serde_json::json!({
            "operation": "vosk_transcription_success",
            "text_length": text.len(),
            "text_preview": text.chars().take(50).collect::<String>(),
            "is_final": is_final
        }));
        
        info!("🎙️ VOSK transcribed: '{}' (final: {})", text, is_final);
        
        Ok(TranscriptionResult {
            text,
            confidence: 0.95, // Vosk doesn't provide confidence scores
            is_final,
            language: "en".to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            duration_ms: self.config.chunk_duration_ms as u64,
            words: Vec::new(),
            speaker_id: Some("user".to_string()),
        })
    }
    
    fn transcribe_with_local_whisper(&self, audio_data: &[u8]) -> Result<TranscriptionResult> {
        // TODO: Implement local Whisper integration
        // This would use whisper.cpp or Python whisper via IPC
        Err(anyhow::anyhow!("Local Whisper not yet implemented"))
    }

    fn transcribe_with_whisper_api(&self, audio_data: &[u8]) -> Result<TranscriptionResult> {
        // TODO: Implement OpenAI Whisper API
        // Requires multipart form upload of audio file
        Err(anyhow::anyhow!("Whisper API not yet implemented"))
    }

    fn transcribe_with_assemblyai(&self, audio_data: &[u8]) -> Result<TranscriptionResult> {
        // TODO: Implement AssemblyAI integration
        // Requires upload then polling for results
        Err(anyhow::anyhow!("AssemblyAI not yet implemented"))
    }

    fn transcribe_with_deepgram(&self, audio_data: &[u8]) -> Result<TranscriptionResult> {
        // TODO: Implement Deepgram integration
        // Supports WebSocket streaming
        Err(anyhow::anyhow!("Deepgram not yet implemented"))
    }

    fn transcribe_with_azure(&self, audio_data: &[u8]) -> Result<TranscriptionResult> {
        // TODO: Implement Azure Speech Services
        Err(anyhow::anyhow!("Azure Speech not yet implemented"))
    }

    fn transcribe_with_google(&self, audio_data: &[u8]) -> Result<TranscriptionResult> {
        // TODO: Implement Google Cloud Speech-to-Text
        Err(anyhow::anyhow!("Google Speech not yet implemented"))
    }

    fn emit_transcription_event(&self, result: TranscriptionResult) -> Result<()> {
        let trail = BreadcrumbTrail::new("EmitTranscriptionEvent");
        
        // LED 7040: Task 2.1 - TranscriptionService Event Architecture - Event emission start
        led_light!(trail, 7040, serde_json::json!({
            "task": "2.1",
            "operation": "transcription_event_emission_start",
            "event": "transcription_emit",
            "text_length": result.text.len(),
            "is_final": result.is_final,
            "confidence": result.confidence,
            "service_type": format!("{:?}", self.config.service)
        }));
        
        info!("📡 Emitting transcription event for text: {}", &result.text[..result.text.len().min(50)]);
        
        // Generate unique event ID
        let event_id = format!("trans_{}_{}", 
            self.session_id,
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        );
        
        // Increment chunk counter
        let chunk_id = {
            let mut counter = self.chunk_counter.lock();
            *counter += 1;
            *counter
        };
        
        // LED 7041: Task 2.1 - Event ID generation and chunk tracking
        led_light!(trail, 7041, serde_json::json!({
            "task": "2.1",
            "operation": "transcription_event_id_generation",
            "event_id": &event_id[..20],  // truncated for readability
            "chunk_id": chunk_id,
            "session": &self.session_id[..20],  // truncated for readability
            "chunk_sequencing": "active"
        }));
        
        // Create transcription event for frontend
        let event = TranscriptionEvent {
            text: result.text.clone(),
            is_final: result.is_final,
            confidence: result.confidence,
            timestamp: result.timestamp,
            is_user: result.speaker_id.as_deref() == Some("user"), // Determine if it's user speech
            event_id,
            chunk_id,
            session_id: self.session_id.clone(),
        };
        
        // LED 7042: Task 2.1 - Event emission to frontend via Tauri event system
        led_light!(trail, 7042, serde_json::json!({
            "task": "2.1", 
            "operation": "tauri_event_emit_attempt",
            "event_name": "voice_transcription",
            "event_target": "all_frontend_listeners",
            "chunk_id": chunk_id
        }));
        
        // Emit event to frontend via Tauri's event system
        match self.app_handle.emit_all("voice_transcription", &event) {
            Ok(_) => {
                // LED 7043: Task 2.1 - Event emission success
                led_light!(trail, 7043, serde_json::json!({
                    "task": "2.1",
                    "operation": "transcription_event_emission_success",
                    "status": "event_emitted_successfully", 
                    "chunk_id": chunk_id,
                    "is_final": result.is_final,
                    "frontend_listeners": "notified"
                }));
                info!("✅ Transcription event emitted successfully (chunk_id: {}, is_final: {})", 
                     chunk_id, result.is_final);
                Ok(())
            }
            Err(e) => {
                // LED 7044: Task 2.1 - Event emission failure
                led_fail!(trail, 7044, format!("Task 2.1 - Failed to emit transcription event: {}", e));
                error!("❌ Failed to emit transcription event: {}", e);
                Err(anyhow::anyhow!("Failed to emit transcription event: {}", e))
            }
        }
    }

    pub fn get_statistics(&self) -> (u64, u32) {
        (*self.success_count.lock(), *self.error_count.lock())
    }

    pub fn get_last_transcription(&self) -> Option<TranscriptionResult> {
        self.last_transcription.lock().clone()
    }
    
    // Vosk-specific result processing and event emission
    pub fn process_vosk_result(&self, vosk_text: &str, is_final: bool, confidence: f32, is_user: bool) -> Result<()> {
        let trail = BreadcrumbTrail::new("ProcessVoskResult");
        // LED 7045: Task 2.1 - Vosk result processing (Event reception from transcription engine)
        led_light!(trail, 7045, serde_json::json!({
            "task": "2.1",
            "operation": "vosk_result_processing_start",
            "vosk_processing": "started",
            "text_length": vosk_text.len(),
            "is_final": is_final,
            "confidence": confidence,
            "is_user": is_user,
            "event_reception": "vosk_engine"
        }));
        
        info!("🎙️ Processing Vosk result: {} (final: {}, confidence: {:.2})", 
             &vosk_text[..vosk_text.len().min(50)], is_final, confidence);
        
        // Create timestamp
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        // Create transcription result from Vosk data
        let result = TranscriptionResult {
            text: vosk_text.to_string(),
            confidence,
            language: self.config.language.clone(),
            is_final,
            timestamp,
            duration_ms: self.config.chunk_duration_ms as u64,
            words: Vec::new(), // Vosk word timing would be added here in full implementation
            speaker_id: Some(if is_user { "user".to_string() } else { "system".to_string() }),
        };
        
        // Update last transcription if it's final
        if is_final {
            // LED 7046: Task 2.1 - Final result storage and statistics update
            led_light!(trail, 7046, serde_json::json!({
                "task": "2.1",
                "operation": "final_transcription_storage",
                "final_result": "storing_last_transcription",
                "text_preview": &vosk_text[..vosk_text.len().min(30)],
                "statistics_update": true
            }));
            *self.last_transcription.lock() = Some(result.clone());
            *self.success_count.lock() += 1;
        }
        
        // LED 7047: Task 2.1 - Event forwarding to frontend emission pipeline
        led_light!(trail, 7047, serde_json::json!({
            "task": "2.1",
            "operation": "event_forwarding_to_emission",
            "step": "emitting_event_to_frontend",
            "is_final": is_final,
            "pipeline_stage": "transcription_service_to_frontend"
        }));
        
        // Emit event to frontend
        self.emit_transcription_event(result)?;
        
        // LED 7048: Task 2.1 - Vosk result processing completion
        led_light!(trail, 7048, serde_json::json!({
            "task": "2.1",
            "operation": "vosk_result_processing_complete",
            "vosk_processing": "completed_successfully",
            "is_final": is_final,
            "event_pipeline": "transcription_engine_to_frontend_complete"
        }));
        
        Ok(())
    }
    
    // Process partial results from Vosk (non-final transcriptions)
    pub fn emit_partial_result(&self, partial_text: &str, confidence: f32, is_user: bool) -> Result<()> {
        let trail = BreadcrumbTrail::new("EmitPartialResult");
        led_light!(trail, 7047, serde_json::json!({
            "result_type": "partial",
            "text_length": partial_text.len(),
            "confidence": confidence,
            "is_user": is_user
        }));
        
        let result = self.process_vosk_result(partial_text, false, confidence, is_user);
        
        if result.is_ok() {
            led_light!(trail, 7048, serde_json::json!({
                "partial_result": "emitted_successfully"
            }));
        } else {
            led_fail!(trail, 7048, "Failed to emit partial result");
        }
        
        result
    }
    
    // Process final results from Vosk (complete transcriptions)  
    pub fn emit_final_result(&self, final_text: &str, confidence: f32, is_user: bool) -> Result<()> {
        let trail = BreadcrumbTrail::new("EmitFinalResult");
        led_light!(trail, 7049, serde_json::json!({
            "result_type": "final",
            "text_length": final_text.len(),
            "confidence": confidence,
            "is_user": is_user
        }));
        
        let result = self.process_vosk_result(final_text, true, confidence, is_user);
        
        if result.is_ok() {
            led_light!(trail, 7050, serde_json::json!({
                "final_result": "emitted_successfully",
                "text_preview": &final_text[..final_text.len().min(50)]
            }));
        } else {
            led_fail!(trail, 7050, "Failed to emit final result");
        }
        
        result
    }
}

// Make TranscriptionManager cloneable for async operations
impl Clone for TranscriptionManager {
    fn clone(&self) -> Self {
        Self {
            config: self.config.clone(),
            audio_buffer: self.audio_buffer.clone(),
            is_active: self.is_active.clone(),
            http_client: self.http_client.clone(),
            last_transcription: self.last_transcription.clone(),
            error_count: self.error_count.clone(),
            success_count: self.success_count.clone(),
            app_handle: self.app_handle.clone(),
            session_id: self.session_id.clone(),
            chunk_counter: self.chunk_counter.clone(),
        }
    }
}

// Configuration builder for easy setup
impl TranscriptionConfig {
    pub fn default_vosk() -> Self {
        Self {
            service: TranscriptionService::Vosk,
            api_key: None,
            model: "vosk-model-small-en-us-0.15".to_string(),  // Small English model
            language: "en".to_string(),
            sample_rate: 16000,  // Vosk works best with 16kHz
            chunk_duration_ms: 250,  // Smaller chunks for real-time transcription
            max_retry_attempts: 3,
            retry_delay_ms: 100,
            timeout_seconds: 5,
            min_audio_level: 0.005,  // More sensitive for voice detection
            silence_threshold_ms: 1000,
            vad_enabled: true,
        }
    }
    
    pub fn default_whisper_local() -> Self {
        Self {
            service: TranscriptionService::WhisperLocal,
            api_key: None,
            model: "base".to_string(),
            language: "en".to_string(),
            sample_rate: 16000,
            chunk_duration_ms: 1000,
            max_retry_attempts: 3,
            retry_delay_ms: 1000,
            timeout_seconds: 30,
            min_audio_level: 0.01,
            silence_threshold_ms: 2000,
            vad_enabled: true,
        }
    }

    pub fn default_deepgram(api_key: String) -> Self {
        Self {
            service: TranscriptionService::Deepgram,
            api_key: Some(api_key),
            model: "nova-2".to_string(),
            language: "en".to_string(),
            sample_rate: 16000,
            chunk_duration_ms: 500,  // Smaller chunks for streaming
            max_retry_attempts: 3,
            retry_delay_ms: 500,
            timeout_seconds: 10,
            min_audio_level: 0.01,
            silence_threshold_ms: 1500,
            vad_enabled: true,
        }
    }
}

// Global transcription service instance
static TRANSCRIPTION_SERVICE: once_cell::sync::Lazy<Arc<Mutex<Option<Arc<TranscriptionManager>>>>> = 
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(None)));

// Global app handle storage for transcription service
static APP_HANDLE_FOR_TRANSCRIPTION: once_cell::sync::Lazy<Arc<Mutex<Option<AppHandle>>>> = 
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(None)));

// Set the app handle for transcription service (call this during app setup)
pub fn set_transcription_app_handle(handle: AppHandle) {
    let mut stored_handle = APP_HANDLE_FOR_TRANSCRIPTION.lock();
    *stored_handle = Some(handle);
    info!("App handle stored for transcription service");
}

// Initialize the global transcription service
pub fn initialize_transcription_service(config: TranscriptionConfig) -> Result<()> {
    info!("Initializing global transcription service with {:?}", config.service);
    
    // Get the stored app handle
    let app_handle = {
        let handle_guard = APP_HANDLE_FOR_TRANSCRIPTION.lock();
        handle_guard.as_ref()
            .ok_or_else(|| anyhow::anyhow!("App handle not set for transcription service"))?
            .clone()
    };
    
    let manager = TranscriptionManager::new(config, app_handle)?;
    let manager_arc = Arc::new(manager);
    
    let mut service = TRANSCRIPTION_SERVICE.lock();
    *service = Some(manager_arc);
    
    info!("✅ Global transcription service initialized successfully");
    Ok(())
}

// Access the global transcription service
pub fn with_transcription_service<F, R>(f: F) -> Option<R>
where
    F: FnOnce(&Arc<TranscriptionManager>) -> R,
{
    let service = TRANSCRIPTION_SERVICE.lock();
    service.as_ref().map(|s| f(s))
}