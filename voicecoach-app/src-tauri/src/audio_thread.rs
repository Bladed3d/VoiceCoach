// Dedicated audio thread implementation - solves the Send trait issue properly
// This is the production-grade solution for CPAL + Tauri integration

use anyhow::Result;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use crossbeam_channel::{unbounded, Receiver, Sender, TryRecvError};
use std::thread;
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use log::{info, warn, error};
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};

// Commands to control the audio thread
#[derive(Debug, Clone)]
pub enum AudioCommand {
    StartRecording,
    StopRecording,
    EnableMicrophone(bool),
    EnableSystemAudio(bool),
    Shutdown,
}

// Audio data with source identification
#[derive(Debug, Clone)]
pub struct AudioData {
    pub source: AudioSource,
    pub samples: Vec<f32>,
    pub timestamp: std::time::SystemTime,
}

// Serializable audio data for Tauri events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioEventData {
    pub source: String,
    pub samples: Vec<f32>,
    pub timestamp: u64,
    pub sample_rate: u32,
    pub channels: u8,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum AudioSource {
    Microphone,
    SystemAudio,
}

// Main audio controller that lives in the main thread
#[derive(Clone)]
pub struct AudioController {
    command_tx: Sender<AudioCommand>,
    data_rx: Receiver<AudioData>,
    is_recording: Arc<AtomicBool>,
    mic_enabled: Arc<AtomicBool>,
    system_enabled: Arc<AtomicBool>,
    app_handle: Option<AppHandle>,
}

impl AudioController {
    pub fn new() -> Result<Self> {
        let (command_tx, command_rx) = unbounded();
        let (data_tx, data_rx) = unbounded();
        
        let is_recording = Arc::new(AtomicBool::new(false));
        let mic_enabled = Arc::new(AtomicBool::new(true));
        let system_enabled = Arc::new(AtomicBool::new(true));
        
        let is_recording_clone = is_recording.clone();
        let mic_enabled_clone = mic_enabled.clone();
        let system_enabled_clone = system_enabled.clone();
        
        // Spawn the dedicated audio thread - ALL Stream objects live here
        thread::spawn(move || {
            info!("🎵 Audio thread started");
            
            // Run the audio thread logic
            if let Err(e) = run_audio_thread(
                command_rx,
                data_tx,
                is_recording_clone,
                mic_enabled_clone,
                system_enabled_clone,
            ) {
                error!("Audio thread error: {}", e);
            }
            
            info!("🛑 Audio thread stopped");
        });
        
        Ok(Self {
            command_tx,
            data_rx,
            is_recording,
            mic_enabled,
            system_enabled,
            app_handle: None,
        })
    }
    
    pub fn start_recording(&self) -> Result<()> {
        info!("💡 5020 ✅ RUST_AUDIO_THREAD_START_COMMAND [AudioThread]");
        info!("📢 Sending start recording command");
        self.command_tx.send(AudioCommand::StartRecording)?;
        info!("💡 5021 ✅ RUST_AUDIO_THREAD_COMMAND_SENT [AudioThread]");
        Ok(())
    }
    
    pub fn stop_recording(&self) -> Result<()> {
        info!("🛑 Sending stop recording command");
        self.command_tx.send(AudioCommand::StopRecording)?;
        Ok(())
    }
    
    pub fn set_mic_enabled(&self, enabled: bool) -> Result<()> {
        self.command_tx.send(AudioCommand::EnableMicrophone(enabled))?;
        Ok(())
    }
    
    pub fn set_system_enabled(&self, enabled: bool) -> Result<()> {
        self.command_tx.send(AudioCommand::EnableSystemAudio(enabled))?;
        Ok(())
    }
    
    pub fn get_audio_data(&self) -> Vec<AudioData> {
        let mut data = Vec::new();
        
        // Collect up to 100 chunks
        for _ in 0..100 {
            match self.data_rx.try_recv() {
                Ok(audio_data) => data.push(audio_data),
                Err(TryRecvError::Empty) => break,
                Err(TryRecvError::Disconnected) => {
                    error!("Audio thread disconnected!");
                    break;
                }
            }
        }
        
        data
    }
    
    pub fn get_audio_levels(&self) -> (f32, f32) {
        let data = self.get_audio_data();
        
        let mut mic_level = 0.0;
        let mut system_level = 0.0;
        let mut mic_samples = 0;
        let mut system_samples = 0;
        
        for audio_data in data {
            let level: f32 = audio_data.samples.iter().map(|s| s.abs()).sum();
            let count = audio_data.samples.len();
            
            match audio_data.source {
                AudioSource::Microphone => {
                    mic_level += level;
                    mic_samples += count;
                }
                AudioSource::SystemAudio => {
                    system_level += level;
                    system_samples += count;
                }
            }
        }
        
        // Calculate average levels as percentage
        let mic_percent = if mic_samples > 0 {
            (mic_level / mic_samples as f32 * 100.0).min(100.0)
        } else {
            0.0
        };
        
        let system_percent = if system_samples > 0 {
            (system_level / system_samples as f32 * 100.0).min(100.0)
        } else {
            0.0
        };
        
        (mic_percent, system_percent)
    }
    
    pub fn is_recording(&self) -> bool {
        self.is_recording.load(Ordering::Relaxed)
    }
    
    pub fn shutdown(&self) -> Result<()> {
        self.command_tx.send(AudioCommand::Shutdown)?;
        Ok(())
    }
    
    pub fn set_app_handle(&mut self, app_handle: AppHandle) {
        self.app_handle = Some(app_handle);
    }
    
    // Stream audio data to frontend for transcription
    pub fn stream_audio_to_frontend(&self) -> Result<()> {
        info!("💡 5100 ✅ RUST_TAURI_EVENT_STREAM_START [AudioThread]");
        if let Some(app_handle) = &self.app_handle {
            let audio_data = self.get_audio_data();
            info!("💡 5101 ✅ RUST_TAURI_EVENT_AUDIO_DATA_RETRIEVED [AudioThread] chunks: {}", audio_data.len());
            
            for data in audio_data {
                let event_data = AudioEventData {
                    source: match data.source {
                        AudioSource::Microphone => "microphone".to_string(),
                        AudioSource::SystemAudio => "system_audio".to_string(),
                    },
                    samples: data.samples,
                    timestamp: data.timestamp
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis() as u64,
                    sample_rate: 44100, // Default sample rate, should be configurable
                    channels: 1, // Mono for now
                };
                
                info!("💡 5102 ✅ RUST_TAURI_EVENT_EMIT [AudioThread] source: {}, samples: {}", event_data.source, event_data.samples.len());
                // Emit Tauri event for frontend to receive
                match app_handle.emit_all("audio-data", &event_data) {
                    Ok(_) => info!("💡 5103 ✅ RUST_TAURI_EVENT_EMIT_SUCCESS [AudioThread] source: {}", event_data.source),
                    Err(e) => warn!("💡 5102 ❌ RUST_TAURI_EVENT_EMIT_FAILED [AudioThread] source: {}, error: {}", event_data.source, e)
                }
            }
        } else {
            warn!("💡 5100 ❌ RUST_TAURI_EVENT_NO_APP_HANDLE [AudioThread]");
        }
        Ok(())
    }
}

// The audio thread function - ALL Stream objects live here
fn run_audio_thread(
    command_rx: Receiver<AudioCommand>,
    data_tx: Sender<AudioData>,
    is_recording: Arc<AtomicBool>,
    mic_enabled: Arc<AtomicBool>,
    system_enabled: Arc<AtomicBool>,
) -> Result<()> {
    let host = cpal::default_host();
    
    // Variables to hold our streams - they NEVER leave this thread
    let mut mic_stream: Option<cpal::Stream> = None;
    let mut system_stream: Option<cpal::Stream> = None;
    
    // Main command processing loop
    loop {
        match command_rx.recv() {
            Ok(AudioCommand::StartRecording) => {
                info!("💡 5030 ✅ RUST_AUDIO_THREAD_RECORDING_COMMAND_RECEIVED [AudioThread]");
                info!("🎤 Starting audio recording in thread");
                is_recording.store(true, Ordering::Relaxed);
                
                // Create microphone stream if enabled
                if mic_enabled.load(Ordering::Relaxed) && mic_stream.is_none() {
                    info!("💡 5031 ✅ RUST_AUDIO_THREAD_MIC_STREAM_CREATE [AudioThread]");
                    match create_mic_stream(&host, data_tx.clone()) {
                        Ok(stream) => {
                            stream.play()?;
                            mic_stream = Some(stream);
                            info!("💡 5032 ✅ RUST_AUDIO_THREAD_MIC_STREAM_STARTED [AudioThread]");
                            info!("✅ Microphone stream started");
                        }
                        Err(e) => {
                            warn!("💡 5031 ❌ RUST_AUDIO_THREAD_MIC_STREAM_FAILED [AudioThread]: {}", e);
                            warn!("Failed to create mic stream: {}", e);
                        }
                    }
                }
                
                // Create system audio stream if enabled
                if system_enabled.load(Ordering::Relaxed) && system_stream.is_none() {
                    info!("💡 5033 ✅ RUST_AUDIO_THREAD_SYSTEM_STREAM_CREATE [AudioThread]");
                    match create_system_stream(&host, data_tx.clone()) {
                        Ok(stream) => {
                            stream.play()?;
                            system_stream = Some(stream);
                            info!("💡 5034 ✅ RUST_AUDIO_THREAD_SYSTEM_STREAM_STARTED [AudioThread]");
                            info!("✅ System audio stream started");
                        }
                        Err(e) => {
                            warn!("💡 5033 ❌ RUST_AUDIO_THREAD_SYSTEM_STREAM_FAILED [AudioThread]: {}", e);
                            warn!("Failed to create system stream: {}", e);
                            warn!("💡 Enable 'Stereo Mix' in Windows Sound settings for system audio");
                        }
                    }
                }
            }
            
            Ok(AudioCommand::StopRecording) => {
                info!("🛑 Stopping audio recording in thread");
                is_recording.store(false, Ordering::Relaxed);
                
                // Drop streams to stop them
                mic_stream = None;
                system_stream = None;
            }
            
            Ok(AudioCommand::EnableMicrophone(enabled)) => {
                mic_enabled.store(enabled, Ordering::Relaxed);
                if !enabled {
                    mic_stream = None;
                }
            }
            
            Ok(AudioCommand::EnableSystemAudio(enabled)) => {
                system_enabled.store(enabled, Ordering::Relaxed);
                if !enabled {
                    system_stream = None;
                }
            }
            
            Ok(AudioCommand::Shutdown) => {
                info!("Shutting down audio thread");
                break;
            }
            
            Err(e) => {
                error!("Command channel error: {}", e);
                break;
            }
        }
    }
    
    Ok(())
}

// Create microphone input stream
fn create_mic_stream(host: &cpal::Host, data_tx: Sender<AudioData>) -> Result<cpal::Stream> {
    let device = host.default_input_device()
        .ok_or_else(|| anyhow::anyhow!("No input device available"))?;
        
    let device_name = device.name().unwrap_or_else(|_| "Unknown".to_string());
    info!("📢 Using microphone: {}", device_name);
    
    let config = device.default_input_config()?;
    info!("🔊 Mic config: {:?}", config);
    
    let stream = match config.sample_format() {
        cpal::SampleFormat::F32 => {
            device.build_input_stream(
                &config.into(),
                move |data: &[f32], _: &_| {
                    info!("💡 5040 ✅ RUST_AUDIO_CAPTURE_MIC_DATA [AudioThread] samples: {}", data.len());
                    let audio_data = AudioData {
                        source: AudioSource::Microphone,
                        samples: data.to_vec(),
                        timestamp: std::time::SystemTime::now(),
                    };
                    match data_tx.send(audio_data) {
                        Ok(_) => info!("💡 5041 ✅ RUST_AUDIO_CAPTURE_MIC_DATA_SENT [AudioThread]"),
                        Err(e) => warn!("💡 5040 ❌ RUST_AUDIO_CAPTURE_MIC_DATA_SEND_FAILED [AudioThread]: {}", e)
                    }
                },
                |err| error!("💡 5042 ❌ RUST_AUDIO_CAPTURE_MIC_STREAM_ERROR [AudioThread]: {}", err),
                None
            )?
        }
        cpal::SampleFormat::I16 => {
            device.build_input_stream(
                &config.into(),
                move |data: &[i16], _: &_| {
                    info!("💡 5043 ✅ RUST_AUDIO_CAPTURE_MIC_DATA_I16 [AudioThread] samples: {}", data.len());
                    let samples: Vec<f32> = data.iter()
                        .map(|&s| s as f32 / i16::MAX as f32)
                        .collect();
                    
                    let audio_data = AudioData {
                        source: AudioSource::Microphone,
                        samples,
                        timestamp: std::time::SystemTime::now(),
                    };
                    match data_tx.send(audio_data) {
                        Ok(_) => info!("💡 5044 ✅ RUST_AUDIO_CAPTURE_MIC_DATA_I16_SENT [AudioThread]"),
                        Err(e) => warn!("💡 5043 ❌ RUST_AUDIO_CAPTURE_MIC_DATA_I16_SEND_FAILED [AudioThread]: {}", e)
                    }
                },
                |err| error!("💡 5045 ❌ RUST_AUDIO_CAPTURE_MIC_STREAM_I16_ERROR [AudioThread]: {}", err),
                None
            )?
        }
        _ => return Err(anyhow::anyhow!("Unsupported sample format"))
    };
    
    Ok(stream)
}

// Create system audio loopback stream using WASAPI (Windows)
#[cfg(target_os = "windows")]
fn create_system_stream(_host: &cpal::Host, data_tx: Sender<AudioData>) -> Result<cpal::Stream> {
    use crate::wasapi_capture::WasapiCapture;
    
    info!("🎯 Initializing WASAPI loopback capture for system audio");
    
    // Create a dummy stream since we're using WASAPI directly
    // The actual capture happens in the WASAPI module
    static mut WASAPI_CAPTURE: Option<WasapiCapture> = None;
    
    unsafe {
        if WASAPI_CAPTURE.is_none() {
            match WasapiCapture::new() {
                Ok(capture) => {
                    WASAPI_CAPTURE = Some(capture);
                    info!("✅ WASAPI capture initialized");
                }
                Err(e) => {
                    error!("Failed to initialize WASAPI: {}", e);
                    return Err(anyhow::anyhow!("Failed to initialize WASAPI: {}", e));
                }
            }
        }
        
        if let Some(ref mut capture) = WASAPI_CAPTURE {
            capture.start_loopback_capture(data_tx)?;
            info!("✅ WASAPI loopback capture started - can capture YouTube, Google Meet, etc!");
        }
    }
    
    // Return a dummy stream that doesn't do anything
    // The actual capture is handled by WASAPI
    let host = cpal::default_host();
    let device = host.default_input_device()
        .ok_or_else(|| anyhow::anyhow!("No input device"))?;
    let config = device.default_input_config()?;
    
    let stream = device.build_input_stream(
        &config.into(),
        |_data: &[f32], _: &_| {
            // Dummy callback - actual capture happens in WASAPI
        },
        |_err| {},
        None
    )?;
    
    Ok(stream)
}

// Fallback for non-Windows systems
#[cfg(not(target_os = "windows"))]
fn create_system_stream(host: &cpal::Host, data_tx: Sender<AudioData>) -> Result<cpal::Stream> {
    Err(anyhow::anyhow!("System audio capture only supported on Windows"))
}

// Helper to check system audio availability
pub fn check_system_audio_availability() -> SystemAudioStatus {
    #[cfg(target_os = "windows")]
    {
        use crate::wasapi_capture::check_wasapi_availability;
        
        if check_wasapi_availability() {
            return SystemAudioStatus::Available("Windows Audio (WASAPI Loopback)".to_string());
        }
    }
    
    SystemAudioStatus::NotAvailable
}

#[derive(Debug)]
pub enum SystemAudioStatus {
    Available(String),
    NotAvailable,
}