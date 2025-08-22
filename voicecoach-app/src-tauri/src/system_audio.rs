use anyhow::{Result, anyhow};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, Stream, StreamConfig};
use crossbeam_channel::{bounded, Sender, Receiver};
use log::{info, warn, error, debug};
use parking_lot::RwLock;
use std::sync::Arc;
use std::thread;
use std::time::Duration;

// LED Breadcrumb System
use crate::breadcrumb_system::BreadcrumbTrail;
use crate::{led_light, led_fail};

// Windows-specific imports will be added when we use raw Windows APIs
// For now, we'll use cpal's built-in WASAPI support

/// System audio capture modes
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum AudioCaptureMode {
    MicrophoneOnly,
    SystemAudioOnly,
    MicrophoneAndSystem,
}

/// Audio source information
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AudioSource {
    pub id: String,
    pub name: String,
    pub source_type: String,  // "microphone", "system", "application"
    pub is_default: bool,
    pub is_available: bool,
}

/// System audio capture manager with comprehensive LED tracking
pub struct SystemAudioCapture {
    capture_mode: Arc<RwLock<AudioCaptureMode>>,
    audio_data_tx: Sender<Vec<f32>>,
    audio_data_rx: Receiver<Vec<f32>>,
    is_capturing: Arc<RwLock<bool>>,
    trail: BreadcrumbTrail,
}

impl SystemAudioCapture {
    pub fn new() -> Result<Self> {
        let trail = BreadcrumbTrail::new("SystemAudioCapture");
        led_light!(trail, 4100, serde_json::json!({
            "component": "system_audio_capture",
            "operation": "new",
            "channel_buffer_size": 100,
            "default_mode": "MicrophoneOnly"
        }));
        
        let (audio_data_tx, audio_data_rx) = bounded(100);
        
        led_light!(trail, 4101, serde_json::json!({
            "crossbeam_channel": "created_successfully",
            "tx_ready": true,
            "rx_ready": true
        }));
        
        Ok(Self {
            capture_mode: Arc::new(RwLock::new(AudioCaptureMode::MicrophoneOnly)),
            audio_data_tx,
            audio_data_rx,
            is_capturing: Arc::new(RwLock::new(false)),
            trail,
        })
    }

    /// Get available audio sources including system audio
    pub fn get_audio_sources(&self) -> Result<Vec<AudioSource>> {
        let mut sources = Vec::new();
        
        // Get CPAL host
        let host = cpal::default_host();
        info!("Using audio host: {:?}", host.id());
        
        // Add microphone sources
        if let Ok(devices) = host.input_devices() {
            for device in devices {
                if let Ok(name) = device.name() {
                    sources.push(AudioSource {
                        id: format!("mic_{}", name.replace(" ", "_").to_lowercase()),
                        name: name.clone(),
                        source_type: "microphone".to_string(),
                        is_default: false,
                        is_available: true,
                    });
                    debug!("Found microphone: {}", name);
                }
            }
        }
        
        // Add system audio source (always available on Windows with WASAPI)
        #[cfg(target_os = "windows")]
        {
            sources.push(AudioSource {
                id: "system_audio_wasapi".to_string(),
                name: "System Audio (All Desktop Audio)".to_string(),
                source_type: "system".to_string(),
                is_default: true,
                is_available: true,
            });
            info!("Added WASAPI system audio source");
        }
        
        // On other platforms, check for loopback devices
        #[cfg(not(target_os = "windows"))]
        {
            // Check for virtual audio devices (BlackHole on macOS, PulseAudio loopback on Linux)
            if let Ok(devices) = host.input_devices() {
                for device in devices {
                    if let Ok(name) = device.name() {
                        let name_lower = name.to_lowercase();
                        if name_lower.contains("blackhole") || 
                           name_lower.contains("loopback") ||
                           name_lower.contains("virtual") {
                            sources.push(AudioSource {
                                id: format!("system_{}", name.replace(" ", "_").to_lowercase()),
                                name: format!("{} (System Audio)", name),
                                source_type: "system".to_string(),
                                is_default: false,
                                is_available: true,
                            });
                            info!("Found virtual audio device: {}", name);
                        }
                    }
                }
            }
        }
        
        Ok(sources)
    }

    /// Start capturing system audio (Windows WASAPI implementation)
    #[cfg(target_os = "windows")]
    pub async fn start_system_audio_capture(&mut self) -> Result<()> {
        led_light!(self.trail, 4110, serde_json::json!({
            "operation": "start_system_audio_capture",
            "platform": "windows",
            "method": "wasapi_loopback"
        }));
        
        info!("Starting WASAPI system audio capture...");
        
        // Stop any existing capture
        led_light!(self.trail, 4111, serde_json::json!({"step": "stopping_existing_capture"}));
        self.stop_capture().await?;
        
        // Mark as capturing
        led_light!(self.trail, 4112, serde_json::json!({"step": "setting_capture_state"}));
        *self.is_capturing.write() = true;
        *self.capture_mode.write() = AudioCaptureMode::SystemAudioOnly;
        
        // Create WASAPI loopback capture in a separate thread
        let audio_tx = self.audio_data_tx.clone();
        let is_capturing = self.is_capturing.clone();
        let trail_clone = BreadcrumbTrail::new("WASAPILoopbackThread");
        
        led_light!(self.trail, 4113, serde_json::json!({
            "step": "spawning_wasapi_thread",
            "channel_cloned": true,
            "is_capturing_shared": true
        }));
        
        thread::spawn(move || {
            led_light!(trail_clone, 4114, serde_json::json!({
                "thread": "wasapi_loopback_thread_started",
                "thread_id": format!("{:?}", thread::current().id())
            }));
            
            if let Err(e) = Self::wasapi_loopback_capture(audio_tx, is_capturing, trail_clone) {
                error!("WASAPI loopback capture failed: {}", e);
            }
        });
        
        led_light!(self.trail, 4115, serde_json::json!({
            "wasapi_capture_setup": "complete",
            "async_thread_spawned": true,
            "ready_for_audio": true
        }));
        
        info!("WASAPI system audio capture started successfully");
        Ok(())
    }
    
    /// WASAPI loopback capture implementation with comprehensive LED tracking
    #[cfg(target_os = "windows")]
    fn wasapi_loopback_capture(
        audio_tx: Sender<Vec<f32>>,
        is_capturing: Arc<RwLock<bool>>,
        trail: BreadcrumbTrail,
    ) -> Result<()> {
        led_light!(trail, 4120, serde_json::json!({
            "operation": "wasapi_loopback_capture",
            "thread": "dedicated_capture_thread",
            "initialization": "starting"
        }));
        
        info!("WASAPI: Starting loopback capture");
        
        // Use cpal's WASAPI host with comprehensive host detection
        led_light!(trail, 4121, serde_json::json!({"step": "available_hosts_enumeration"}));
        let available_hosts = cpal::available_hosts();
        led_light!(trail, 4122, serde_json::json!({
            "available_hosts": available_hosts.iter().map(|h| h.name()).collect::<Vec<_>>(),
            "host_count": available_hosts.len()
        }));
        
        let host_id = available_hosts.into_iter()
            .find(|id| id.name().contains("WASAPI"))
            .unwrap_or_else(|| {
                led_light!(trail, 4123, serde_json::json!({
                    "warning": "wasapi_host_not_found",
                    "fallback": "using_default_host"
                }));
                cpal::available_hosts().into_iter().next().unwrap()
            });
        
        led_light!(trail, 4124, serde_json::json!({
            "selected_host": host_id.name(),
            "host_type": "wasapi"
        }));
        
        let host = cpal::host_from_id(host_id)
            .map_err(|e| {
                led_fail!(trail, 4124, format!("WASAPI host not available: {}", e));
                anyhow!("WASAPI host not available: {}", e)
            })?;
        
        // Try to get loopback device - this varies by system
        // First, try to find explicit loopback devices
        led_light!(trail, 4130, serde_json::json!({
            "step": "loopback_device_discovery",
            "search_method": "explicit_loopback_devices"
        }));
        
        let mut loopback_device = None;
        let mut devices_checked = 0;
        let mut potential_devices = Vec::new();
        
        // Check input devices for loopback options
        led_light!(trail, 4131, serde_json::json!({"step": "enumerating_input_devices_for_loopback"}));
        match host.input_devices() {
            Ok(devices) => {
                for device in devices {
                    devices_checked += 1;
                    
                    if let Ok(name) = device.name() {
                        led_light!(trail, 4132, serde_json::json!({
                            "checking_device": name.clone(),
                            "device_index": devices_checked
                        }));
                        
                        let name_lower = name.to_lowercase();
                        let is_loopback = name_lower.contains("stereo mix") || 
                                         name_lower.contains("what u hear") ||
                                         name_lower.contains("loopback") ||
                                         name_lower.contains("wave out mix") ||
                                         name_lower.contains("system audio");
                        
                        potential_devices.push(serde_json::json!({
                            "name": name.clone(),
                            "is_loopback": is_loopback
                        }));
                        
                        if is_loopback {
                            led_light!(trail, 4133, serde_json::json!({
                                "loopback_device_found": true,
                                "device_name": name.clone(),
                                "device_type": "dedicated_loopback"
                            }));
                            
                            info!("WASAPI: Found loopback device: {}", name);
                            loopback_device = Some(device);
                            break;
                        }
                    } else {
                        led_light!(trail, 4134, serde_json::json!({
                            "warning": "device_name_unavailable",
                            "device_index": devices_checked
                        }));
                    }
                }
                
                led_light!(trail, 4135, serde_json::json!({
                    "device_enumeration_complete": true,
                    "total_devices_checked": devices_checked,
                    "potential_devices": potential_devices,
                    "loopback_device_found": loopback_device.is_some()
                }));
            }
            Err(e) => {
                led_fail!(trail, 4131, format!("Failed to enumerate input devices: {}", e));
            }
        }
        
        // If no explicit loopback device, try default output as fallback
        let device = if let Some(dev) = loopback_device {
            led_light!(trail, 4140, serde_json::json!({
                "device_selection": "dedicated_loopback_device",
                "optimal_path": true
            }));
            dev
        } else {
            led_light!(trail, 4141, serde_json::json!({
                "device_selection": "fallback_to_default_input",
                "reason": "no_dedicated_loopback_found",
                "fallback_warning": true
            }));
            
            warn!("WASAPI: No loopback device found, trying default input");
            match host.default_input_device() {
                Some(device) => {
                    led_light!(trail, 4142, serde_json::json!({
                        "fallback_device": "default_input_available"
                    }));
                    device
                }
                None => {
                    led_fail!(trail, 4142, "No audio devices available");
                    return Err(anyhow!("No audio devices available"));
                }
            }
        };
        
        let device_name = match device.name() {
            Ok(name) => {
                led_light!(trail, 4143, serde_json::json!({
                    "device_name_retrieved": true,
                    "device_name": name.clone()
                }));
                name
            }
            Err(_) => {
                led_light!(trail, 4144, serde_json::json!({
                    "warning": "device_name_unavailable",
                    "fallback_name": "Unknown"
                }));
                "Unknown".to_string()
            }
        };
        
        info!("WASAPI: Using device: {}", device_name);
        
        // Get the device configuration
        led_light!(trail, 4145, serde_json::json!({
            "step": "retrieving_device_config",
            "device": device_name.clone()
        }));
        
        let config = device.default_input_config()
            .map_err(|e| {
                led_fail!(trail, 4145, format!("Failed to get device config: {}", e));
                anyhow!("Failed to get device config: {}", e)
            })?;
        
        led_light!(trail, 4146, serde_json::json!({
            "device_config": {
                "sample_rate": config.sample_rate().0,
                "channels": config.channels(),
                "sample_format": format!("{:?}", config.sample_format()),
                "buffer_size": format!("{:?}", config.buffer_size())
            }
        }));
        
        info!("WASAPI: Audio config - Sample rate: {}, Channels: {}", 
              config.sample_rate().0, config.channels());
        
        // Build the capture stream
        led_light!(trail, 4150, serde_json::json!({
            "step": "building_wasapi_stream",
            "sample_format": format!("{:?}", config.sample_format())
        }));
        
        let stream = match config.sample_format() {
            cpal::SampleFormat::F32 => {
                led_light!(trail, 4151, serde_json::json!({
                    "stream_type": "f32",
                    "precision": "32_bit_float"
                }));
                Self::build_loopback_stream::<f32>(&device, &config.into(), audio_tx.clone(), trail.clone())?
            }
            cpal::SampleFormat::I16 => {
                led_light!(trail, 4152, serde_json::json!({
                    "stream_type": "i16",
                    "precision": "16_bit_integer"
                }));
                Self::build_loopback_stream::<i16>(&device, &config.into(), audio_tx.clone(), trail.clone())?
            }
            cpal::SampleFormat::U16 => {
                led_light!(trail, 4153, serde_json::json!({
                    "stream_type": "u16",
                    "precision": "16_bit_unsigned"
                }));
                Self::build_loopback_stream::<u16>(&device, &config.into(), audio_tx.clone(), trail.clone())?
            }
            _ => {
                led_fail!(trail, 4154, format!("Unsupported sample format: {:?}", config.sample_format()));
                return Err(anyhow!("Unsupported sample format"));
            }
        };
        
        // Start the stream
        led_light!(trail, 4155, serde_json::json!({
            "step": "starting_wasapi_stream",
            "stream_built": true
        }));
        
        match stream.play() {
            Ok(_) => {
                led_light!(trail, 4156, serde_json::json!({
                    "wasapi_stream": "started_successfully",
                    "ready_for_audio_capture": true
                }));
                info!("WASAPI: Loopback stream started");
            }
            Err(e) => {
                led_fail!(trail, 4156, format!("Failed to start WASAPI stream: {}", e));
                return Err(anyhow!("Failed to start stream: {}", e));
            }
        }
        
        // Keep the stream alive while capturing with heartbeat logging
        led_light!(trail, 4157, serde_json::json!({
            "step": "entering_capture_loop",
            "heartbeat_interval_ms": 100
        }));
        
        let mut loop_iterations = 0;
        while *is_capturing.read() {
            loop_iterations += 1;
            thread::sleep(Duration::from_millis(100));
            
            // Log heartbeat every 10 seconds (100 iterations)
            if loop_iterations % 100 == 0 {
                led_light!(trail, 4158, serde_json::json!({
                    "wasapi_heartbeat": true,
                    "capture_active": true,
                    "loop_iterations": loop_iterations,
                    "uptime_seconds": loop_iterations / 10
                }));
            }
        }
        
        led_light!(trail, 4159, serde_json::json!({
            "step": "stopping_wasapi_capture",
            "total_loop_iterations": loop_iterations,
            "total_runtime_seconds": loop_iterations / 10
        }));
        
        info!("WASAPI: Stopping loopback capture");
        drop(stream);
        
        led_light!(trail, 4160, serde_json::json!({
            "wasapi_loopback_capture": "terminated_successfully",
            "stream_dropped": true
        }));
        
        Ok(())
    }
    
    /// Build loopback stream for WASAPI with comprehensive LED tracking
    #[cfg(target_os = "windows")]
    fn build_loopback_stream<T>(
        device: &Device,
        config: &StreamConfig,
        audio_tx: Sender<Vec<f32>>,
        trail: BreadcrumbTrail,
    ) -> Result<Stream>
    where
        T: cpal::Sample + cpal::SizedSample + Send + 'static,
        f32: From<T>,
    {
        led_light!(trail, 4170, serde_json::json!({
            "operation": "build_loopback_stream",
            "sample_type": std::any::type_name::<T>(),
            "config": {
                "sample_rate": config.sample_rate.0,
                "channels": config.channels,
                "buffer_size": format!("{:?}", config.buffer_size)
            }
        }));
        
        // Note: This is a workaround - ideally we'd use raw WASAPI APIs
        // to properly set up loopback capture with AUDCLNT_STREAMFLAGS_LOOPBACK
        led_light!(trail, 4171, serde_json::json!({
            "note": "using_cpal_wasapi_workaround",
            "ideal_implementation": "raw_wasapi_with_loopback_flags",
            "current_approach": "input_stream_on_output_device"
        }));
        
        let trail_clone = trail.clone();
        let error_trail = trail.clone();
        let mut sample_count = 0usize;
        let mut callback_count = 0usize;
        
        // Try to build an input stream from the output device
        // Some WASAPI implementations allow this for loopback
        led_light!(trail, 4172, serde_json::json!({"step": "building_input_stream"}));
        
        let stream = device.build_input_stream(
            config,
            move |data: &[T], _info: &cpal::InputCallbackInfo| {
                callback_count += 1;
                sample_count += data.len();
                
                // Log every 100th callback to avoid spam
                if callback_count % 100 == 0 {
                    led_light!(trail_clone, 4173, serde_json::json!({
                        "audio_callback": {
                            "callback_number": callback_count,
                            "samples_in_callback": data.len(),
                            "total_samples_processed": sample_count,
                            "timestamp": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos(),
                            "callback_frequency_estimate": "100_callbacks_processed"
                        }
                    }));
                }
                
                // Convert samples to f32
                let samples: Vec<f32> = data.iter()
                    .map(|&sample| sample.into())
                    .collect();
                
                // Send to processing thread
                match audio_tx.try_send(samples) {
                    Ok(_) => {
                        // Success - samples sent to processing thread
                    }
                    Err(_) => {
                        // Channel full or disconnected - log every 1000th failure to avoid spam
                        if callback_count % 1000 == 0 {
                            led_light!(trail_clone, 4174, serde_json::json!({
                                "warning": "audio_channel_send_failed",
                                "callback_number": callback_count,
                                "reason": "channel_full_or_disconnected",
                                "samples_dropped": data.len()
                            }));
                        }
                    }
                }
            },
            move |err| {
                led_fail!(error_trail, 4175, format!("Audio stream error: {}", err));
                error!("Audio stream error: {}", err);
            },
            None
        ).map_err(|e| {
            led_fail!(trail, 4172, format!("Failed to build input stream: {}", e));
            anyhow!("Failed to build input stream: {}", e)
        })?;
        
        led_light!(trail, 4176, serde_json::json!({
            "loopback_stream": "built_successfully",
            "stream_type": "cpal_input_stream",
            "ready_for_play": true
        }));
        
        Ok(stream)
    }

    /// Fallback implementation for non-Windows platforms
    #[cfg(not(target_os = "windows"))]
    pub async fn start_system_audio_capture(&mut self) -> Result<()> {
        info!("Starting system audio capture (non-Windows)...");
        
        // Stop any existing capture
        self.stop_capture().await?;
        
        // Mark as capturing
        *self.is_capturing.write() = true;
        *self.capture_mode.write() = AudioCaptureMode::SystemAudioOnly;
        
        // Try to find a virtual audio device
        let host = cpal::default_host();
        let mut found_device = None;
        
        if let Ok(devices) = host.input_devices() {
            for device in devices {
                if let Ok(name) = device.name() {
                    let name_lower = name.to_lowercase();
                    if name_lower.contains("blackhole") || 
                       name_lower.contains("loopback") ||
                       name_lower.contains("virtual") ||
                       name_lower.contains("soundflower") {
                        info!("Found virtual audio device: {}", name);
                        found_device = Some(device);
                        break;
                    }
                }
            }
        }
        
        let device = found_device.ok_or_else(|| {
            anyhow!("No virtual audio device found. Please install BlackHole (macOS) or configure PulseAudio loopback (Linux)")
        })?;
        
        // Get the device configuration
        let config = device.default_input_config()?;
        info!("Audio config - Sample rate: {}, Channels: {}", 
              config.sample_rate().0, config.channels());
        
        // Build and start the stream
        let audio_tx = self.audio_data_tx.clone();
        let stream = match config.sample_format() {
            cpal::SampleFormat::F32 => {
                Self::build_input_stream::<f32>(&device, &config.into(), audio_tx)?
            }
            cpal::SampleFormat::I16 => {
                Self::build_input_stream::<i16>(&device, &config.into(), audio_tx)?
            }
            cpal::SampleFormat::U16 => {
                Self::build_input_stream::<u16>(&device, &config.into(), audio_tx)?
            }
            _ => {
                return Err(anyhow!("Unsupported sample format: {:?}", config.sample_format()));
            }
        };
        
        stream.play()?;
        // Note: Stream will live in this thread scope - for production, we need better stream management
        std::mem::forget(stream); // Keep stream alive (temporary solution)
        
        info!("System audio capture started successfully");
        Ok(())
    }
    
    /// Build input stream for non-Windows platforms
    #[cfg(not(target_os = "windows"))]
    fn build_input_stream<T>(
        device: &Device,
        config: &StreamConfig,
        audio_tx: Sender<Vec<f32>>,
    ) -> Result<Stream>
    where
        T: cpal::Sample + cpal::SizedSample,
        f32: From<T>,
    {
        let stream = device.build_input_stream(
            config,
            move |data: &[T], _: &cpal::InputCallbackInfo| {
                // Convert samples to f32
                let samples: Vec<f32> = data.iter()
                    .map(|&sample| sample.into())
                    .collect();
                
                // Send to processing thread
                let _ = audio_tx.try_send(samples);
            },
            move |err| {
                error!("Audio stream error: {}", err);
            },
            None
        )?;
        
        Ok(stream)
    }

    /// Start capturing from both microphone and system audio
    pub async fn start_dual_capture(&mut self) -> Result<()> {
        info!("Starting dual audio capture (microphone + system)...");
        
        // Stop any existing capture
        self.stop_capture().await?;
        
        // Mark as capturing
        *self.is_capturing.write() = true;
        *self.capture_mode.write() = AudioCaptureMode::MicrophoneAndSystem;
        
        // Start microphone capture
        self.start_microphone_capture().await?;
        
        // Start system audio capture
        self.start_system_audio_capture().await?;
        
        info!("Dual audio capture started successfully");
        Ok(())
    }

    /// Start microphone capture
    pub async fn start_microphone_capture(&mut self) -> Result<()> {
        info!("Starting microphone capture...");
        
        let host = cpal::default_host();
        let device = host.default_input_device()
            .ok_or_else(|| anyhow!("No default input device found"))?;
        
        let config = device.default_input_config()?;
        info!("Microphone config - Sample rate: {}, Channels: {}", 
              config.sample_rate().0, config.channels());
        
        // Build and start the stream
        let audio_tx = self.audio_data_tx.clone();
        let stream = match config.sample_format() {
            cpal::SampleFormat::F32 => {
                Self::build_mic_stream::<f32>(&device, &config.into(), audio_tx)?
            }
            cpal::SampleFormat::I16 => {
                Self::build_mic_stream::<i16>(&device, &config.into(), audio_tx)?
            }
            cpal::SampleFormat::U16 => {
                Self::build_mic_stream::<u16>(&device, &config.into(), audio_tx)?
            }
            _ => {
                return Err(anyhow!("Unsupported sample format: {:?}", config.sample_format()));
            }
        };
        
        stream.play()?;
        // Note: Stream will live in this thread scope - for production, we need better stream management  
        std::mem::forget(stream); // Keep stream alive (temporary solution)
        
        info!("Microphone capture started successfully");
        Ok(())
    }
    
    /// Build microphone stream
    fn build_mic_stream<T>(
        device: &Device,
        config: &StreamConfig,
        audio_tx: Sender<Vec<f32>>,
    ) -> Result<Stream>
    where
        T: cpal::Sample + cpal::SizedSample,
        f32: From<T>,
    {
        let stream = device.build_input_stream(
            config,
            move |data: &[T], _: &cpal::InputCallbackInfo| {
                // Convert samples to f32
                let samples: Vec<f32> = data.iter()
                    .map(|&sample| sample.into())
                    .collect();
                
                // Send to processing thread
                let _ = audio_tx.try_send(samples);
            },
            move |err| {
                error!("Microphone stream error: {}", err);
            },
            None
        )?;
        
        Ok(stream)
    }

    /// Stop all audio capture
    pub async fn stop_capture(&mut self) -> Result<()> {
        info!("Stopping audio capture...");
        
        // Mark as not capturing
        *self.is_capturing.write() = false;
        
        // Clear any pending audio data
        while self.audio_data_rx.try_recv().is_ok() {}
        
        info!("Audio capture stopped");
        Ok(())
    }

    /// Get captured audio data
    pub fn get_audio_data(&self) -> Option<Vec<f32>> {
        self.audio_data_rx.try_recv().ok()
    }

    /// Check if currently capturing
    pub fn is_capturing(&self) -> bool {
        *self.is_capturing.read()
    }

    /// Get current capture mode
    pub fn get_capture_mode(&self) -> AudioCaptureMode {
        *self.capture_mode.read()
    }
}

