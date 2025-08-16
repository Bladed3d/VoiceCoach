use std::process::{Command, Stdio, Child};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use crossbeam_channel::{bounded, unbounded, Receiver, Sender};
use parking_lot::RwLock;
use log::{info, warn, error, debug};
use serde::{Deserialize, Serialize};
use anyhow::{Result, anyhow};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, SampleRate, SupportedStreamConfig};

// LED Breadcrumb System
use crate::breadcrumb_system::{BreadcrumbTrail, led_light, led_fail, led_operation};

/// Audio processing configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioConfig {
    pub sample_rate: u32,
    pub channels: u16,
    pub buffer_size: u32,
    pub device_name: Option<String>,
    pub enable_preprocessing: bool,
    pub latency_target_ms: f32,
}

impl Default for AudioConfig {
    fn default() -> Self {
        Self {
            sample_rate: 16000,  // Optimal for Whisper
            channels: 1,         // Mono for transcription
            buffer_size: 1024,   // Balance between latency and stability
            device_name: None,   // Use system default
            enable_preprocessing: true,
            latency_target_ms: 50.0,
        }
    }
}

/// Real-time audio level data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioLevels {
    pub user: f32,     // User microphone level (0.0-100.0)
    pub prospect: f32, // System audio level (0.0-100.0)
    pub timestamp: u64, // Milliseconds since start
}

/// Transcription result from Python pipeline
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub text: String,
    pub confidence: f32,
    pub latency_ms: f32,
    pub timestamp: u64,
    pub is_user: bool, // true for user, false for prospect
}

/// Audio processing status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AudioStatus {
    Stopped,
    Starting,
    Recording,
    Processing,
    Error(String),
}

/// Main audio processing manager that bridges to Python pipeline
pub struct AudioProcessor {
    config: AudioConfig,
    status: Arc<RwLock<AudioStatus>>,
    audio_levels: Arc<RwLock<AudioLevels>>,
    
    // Python bridge
    python_process: Arc<Mutex<Option<Child>>>,
    
    // Communication channels
    transcription_rx: Arc<Mutex<Option<Receiver<TranscriptionResult>>>>,
    audio_levels_tx: Sender<AudioLevels>,
    audio_levels_rx: Receiver<AudioLevels>,
    
    // Audio capture
    audio_devices: Vec<AudioDevice>,
    active_streams: Arc<Mutex<Vec<cpal::Stream>>>,
    
    // Performance monitoring
    start_time: Arc<RwLock<Option<Instant>>>,
    total_latency: Arc<RwLock<Vec<f32>>>,
    
    // LED Breadcrumb Trail for debugging
    trail: BreadcrumbTrail,
}

#[derive(Debug, Clone)]
pub struct AudioDevice {
    pub name: String,
    pub is_input: bool,
    pub is_default: bool,
    pub sample_rate: u32,
    pub channels: u16,
}

impl AudioProcessor {
    pub fn new() -> Result<Self> {
        let trail = BreadcrumbTrail::new("AudioProcessor");
        led_light!(trail, 100, {"operation": "audio_processor_creation_start"});
        
        let (audio_levels_tx, audio_levels_rx) = unbounded();
        
        let initial_levels = AudioLevels {
            user: 0.0,
            prospect: 0.0,
            timestamp: 0,
        };

        led_light!(trail, 101, {"operation": "audio_processor_creation_complete", "config": "default"});

        Ok(Self {
            config: AudioConfig::default(),
            status: Arc::new(RwLock::new(AudioStatus::Stopped)),
            audio_levels: Arc::new(RwLock::new(initial_levels)),
            python_process: Arc::new(Mutex::new(None)),
            transcription_rx: Arc::new(Mutex::new(None)),
            audio_levels_tx,
            audio_levels_rx,
            audio_devices: Vec::new(),
            active_streams: Arc::new(Mutex::new(Vec::new())),
            start_time: Arc::new(RwLock::new(None)),
            total_latency: Arc::new(RwLock::new(Vec::new())),
            trail,
        })
    }

    /// Initialize audio devices and Python pipeline
    pub async fn initialize(&mut self) -> Result<()> {
        led_light!(self.trail, 102, {"operation": "initialize_start"});
        info!("Initializing VoiceCoach audio processor...");
        
        // Update status
        led_light!(self.trail, 103, {"status_change": "starting"});
        *self.status.write() = AudioStatus::Starting;
        
        // Enumerate audio devices
        led_light!(self.trail, 200, {"operation": "device_enumeration_start"});
        match self.enumerate_audio_devices() {
            Ok(_) => {
                led_light!(self.trail, 201, {"operation": "device_enumeration_complete", "device_count": self.audio_devices.len()});
            }
            Err(e) => {
                led_fail!(self.trail, 201, format!("Device enumeration failed: {}", e));
                return Err(e);
            }
        }
        
        // Test Python environment
        led_light!(self.trail, 400, {"operation": "python_environment_test_start"});
        match self.test_python_environment().await {
            Ok(_) => {
                led_light!(self.trail, 401, {"operation": "python_environment_test_complete"});
            }
            Err(e) => {
                led_fail!(self.trail, 401, format!("Python environment test failed: {}", e));
                return Err(e);
            }
        }
        
        led_light!(self.trail, 104, {"status_change": "stopped"});
        *self.status.write() = AudioStatus::Stopped;
        led_light!(self.trail, 105, {"operation": "initialize_complete"});
        info!("Audio processor initialized successfully");
        
        Ok(())
    }

    /// Enumerate available audio devices
    fn enumerate_audio_devices(&mut self) -> Result<()> {
        led_light!(self.trail, 202, {"operation": "wasapi_host_initialization"});
        info!("Enumerating audio devices...");
        
        let host = cpal::default_host();
        let mut devices = Vec::new();
        
        // Input devices
        led_light!(self.trail, 203, {"operation": "input_device_scan_start"});
        if let Ok(input_devices) = host.input_devices() {
            let mut input_count = 0;
            for device in input_devices {
                if let Ok(name) = device.name() {
                    if let Ok(config) = device.default_input_config() {
                        devices.push(AudioDevice {
                            name: name.clone(),
                            is_input: true,
                            is_default: name.contains("Default") || devices.is_empty(),
                            sample_rate: config.sample_rate().0,
                            channels: config.channels(),
                        });
                        input_count += 1;
                        led_light!(self.trail, 204, {"device_found": name.clone(), "type": "input", "sample_rate": config.sample_rate().0, "channels": config.channels()});
                        debug!("Found input device: {} ({}Hz, {} channels)", name, config.sample_rate().0, config.channels());
                    }
                }
            }
            led_light!(self.trail, 205, {"operation": "input_device_scan_complete", "input_devices_found": input_count});
        } else {
            led_fail!(self.trail, 203, "Failed to enumerate input devices");
        }
        
        // Output devices (for system audio capture)
        led_light!(self.trail, 206, {"operation": "output_device_scan_start"});
        if let Ok(output_devices) = host.output_devices() {
            let mut output_count = 0;
            for device in output_devices {
                if let Ok(name) = device.name() {
                    if let Ok(config) = device.default_output_config() {
                        devices.push(AudioDevice {
                            name: name.clone(),
                            is_input: false,
                            is_default: name.contains("Default"),
                            sample_rate: config.sample_rate().0,
                            channels: config.channels(),
                        });
                        output_count += 1;
                        led_light!(self.trail, 207, {"device_found": name.clone(), "type": "output", "sample_rate": config.sample_rate().0, "channels": config.channels()});
                        debug!("Found output device: {} ({}Hz, {} channels)", name, config.sample_rate().0, config.channels());
                    }
                }
            }
            led_light!(self.trail, 208, {"operation": "output_device_scan_complete", "output_devices_found": output_count});
        } else {
            led_fail!(self.trail, 206, "Failed to enumerate output devices");
        }
        
        self.audio_devices = devices;
        led_light!(self.trail, 209, {"operation": "device_enumeration_summary", "total_devices": self.audio_devices.len()});
        info!("Found {} audio devices", self.audio_devices.len());
        
        Ok(())
    }

    /// Test that Python transcription pipeline is available
    async fn test_python_environment(&self) -> Result<()> {
        led_light!(self.trail, 402, {"operation": "python_test_command_start"});
        info!("Testing Python transcription environment...");
        
        // Try to run the Python pipeline in test mode
        led_light!(self.trail, 403, {"command": "python dependency check", "modules": ["sys", "torch", "faster_whisper"]});
        let output = Command::new("python")
            .arg("-c")
            .arg("import sys; print('Python', sys.version); import torch; print('PyTorch available'); import faster_whisper; print('Faster-Whisper available')")
            .output();
            
        match output {
            Ok(result) => {
                if result.status.success() {
                    let output_str = String::from_utf8_lossy(&result.stdout);
                    led_light!(self.trail, 404, {"operation": "python_test_success", "output": output_str.trim()});
                    info!("Python environment test successful: {}", output_str.trim());
                    Ok(())
                } else {
                    let error_str = String::from_utf8_lossy(&result.stderr);
                    led_fail!(self.trail, 404, format!("Python environment test failed: {}", error_str));
                    Err(anyhow!("Python environment test failed: {}", error_str))
                }
            }
            Err(e) => {
                led_fail!(self.trail, 404, format!("Failed to run Python: {}", e));
                Err(anyhow!("Failed to run Python: {}", e))
            }
        }
    }

    /// Start real-time audio capture and transcription
    pub async fn start_recording(&mut self) -> Result<()> {
        led_light!(self.trail, 106, {"operation": "start_recording_begin"});
        info!("Starting audio recording and transcription...");
        
        // Update status
        led_light!(self.trail, 107, {"status_change": "starting"});
        *self.status.write() = AudioStatus::Starting;
        *self.start_time.write() = Some(Instant::now());
        
        // Start Python transcription pipeline
        led_light!(self.trail, 405, {"operation": "python_pipeline_start_begin"});
        match self.start_python_pipeline().await {
            Ok(_) => {
                led_light!(self.trail, 406, {"operation": "python_pipeline_start_complete"});
            }
            Err(e) => {
                led_fail!(self.trail, 406, format!("Python pipeline start failed: {}", e));
                return Err(e);
            }
        }
        
        // Start audio capture streams
        led_light!(self.trail, 300, {"operation": "audio_capture_start_begin"});
        match self.start_audio_capture().await {
            Ok(_) => {
                led_light!(self.trail, 301, {"operation": "audio_capture_start_complete"});
            }
            Err(e) => {
                led_fail!(self.trail, 301, format!("Audio capture start failed: {}", e));
                return Err(e);
            }
        }
        
        // Start real-time monitoring
        led_light!(self.trail, 500, {"operation": "monitoring_threads_start"});
        self.start_monitoring_threads();
        led_light!(self.trail, 501, {"operation": "monitoring_threads_complete"});
        
        led_light!(self.trail, 108, {"status_change": "recording"});
        *self.status.write() = AudioStatus::Recording;
        led_light!(self.trail, 109, {"operation": "start_recording_complete"});
        info!("Audio recording started successfully");
        
        Ok(())
    }

    /// Start the Python transcription pipeline as subprocess with enhanced configuration
    async fn start_python_pipeline(&mut self) -> Result<()> {
        led_light!(self.trail, 407, {"operation": "python_bridge_path_search"});
        info!("Starting enhanced Python transcription bridge...");
        
        // Find the Python bridge script
        let script_path = std::env::current_dir()?
            .parent()
            .ok_or_else(|| anyhow!("Cannot find parent directory"))?
            .join("voice_transcription_app_stability_02")
            .join("tauri_bridge.py");
            
        if !script_path.exists() {
            led_fail!(self.trail, 408, format!("Python bridge script not found at: {:?}", script_path));
            return Err(anyhow!("Python bridge script not found at: {:?}", script_path));
        }
        led_light!(self.trail, 408, {"operation": "python_bridge_script_found", "path": script_path.to_string_lossy()});
        
        // Start Python bridge process with enhanced IPC configuration
        led_light!(self.trail, 409, {"operation": "python_process_spawn", "config": {
            "sample_rate": self.config.sample_rate, 
            "model": "distil-large-v3",
            "latency_target_ms": self.config.latency_target_ms,
            "dual_channel": true,
            "batch_size": 8
        }});
        
        let mut child = Command::new("python")
            .arg(script_path)
            .arg("--mode").arg("ipc")
            .arg("--sample-rate").arg(self.config.sample_rate.to_string())
            .arg("--model").arg("distil-large-v3")
            .arg("--log-level").arg("INFO")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| {
                led_fail!(self.trail, 410, format!("Python process spawn failed: {}", e));
                e
            })?;
            
        let process_id = child.id();
        led_light!(self.trail, 410, {"operation": "python_process_spawned", "pid": process_id});
        info!("Enhanced Python transcription bridge started with PID: {}", process_id);
        
        // Send enhanced configuration to Python bridge
        led_light!(self.trail, 411, {"operation": "enhanced_config_send", "target_latency": self.config.latency_target_ms});
        if let Some(stdin) = child.stdin.as_mut() {
            use std::io::Write;
            let config_message = serde_json::json!({
                "type": "start_transcription",
                "data": {
                    "model": "distil-large-v3",
                    "language": "en",
                    "beam_size": 5,
                    "use_gpu": true,
                    "batch_size": 8,
                    "vad_threshold": 0.6,
                    "latency_target_ms": self.config.latency_target_ms,
                    "enable_batching": true,
                    "dual_channel": true
                }
            });
            
            if let Ok(config_str) = serde_json::to_string(&config_message) {
                let _ = writeln!(stdin, "{}", config_str);
                let _ = stdin.flush();
                led_light!(self.trail, 412, {"operation": "enhanced_config_sent", "config": config_str});
            }
        }
        
        // Start enhanced bridge monitoring thread
        led_light!(self.trail, 413, {"operation": "enhanced_bridge_monitoring_start"});
        self.start_bridge_monitoring_thread(child.stdout.take(), child.stderr.take());
        
        // Store the process
        *self.python_process.lock().unwrap() = Some(child);
        
        // Wait for enhanced bridge to initialize
        led_light!(self.trail, 414, {"operation": "enhanced_bridge_initialization_wait", "duration_ms": 2000});
        tokio::time::sleep(std::time::Duration::from_millis(2000)).await;
        led_light!(self.trail, 415, {"operation": "enhanced_bridge_initialization_complete"});
        
        Ok(())
    }
    
    /// Start monitoring thread for Python bridge communication
    fn start_bridge_monitoring_thread(&self, stdout: Option<std::process::ChildStdout>, stderr: Option<std::process::ChildStderr>) {
        let monitoring_trail = BreadcrumbTrail::new("PythonBridgeMonitoring");
        led_light!(monitoring_trail, 600, {"operation": "bridge_monitoring_thread_start"});
        
        // Monitor stdout for transcription results
        if let Some(stdout) = stdout {
            let trail = monitoring_trail.clone();
            thread::spawn(move || {
                use std::io::{BufRead, BufReader};
                led_light!(trail, 601, {"operation": "stdout_monitoring_start"});
                
                let reader = BufReader::new(stdout);
                for line in reader.lines() {
                    match line {
                        Ok(line_content) => {
                            led_light!(trail, 602, {"operation": "python_message_received", "length": line_content.len()});
                            
                            // Parse JSON message from Python bridge
                            if let Ok(message) = serde_json::from_str::<serde_json::Value>(&line_content) {
                                let msg_type = message.get("type").and_then(|t| t.as_str()).unwrap_or("unknown");
                                led_light!(trail, 603, {"operation": "python_message_parsed", "type": msg_type});
                                
                                match msg_type {
                                    "transcription_result" => {
                                        led_light!(trail, 604, {"operation": "transcription_result_received"});
                                        info!("Transcription result: {:?}", message.get("data"));
                                    }
                                    "performance_metrics" => {
                                        led_light!(trail, 605, {"operation": "performance_metrics_received"});
                                        debug!("Performance metrics: {:?}", message.get("data"));
                                    }
                                    "bridge_ready" => {
                                        led_light!(trail, 606, {"operation": "bridge_ready_received"});
                                        info!("Python bridge ready");
                                    }
                                    "error" => {
                                        led_fail!(trail, 607, format!("Python bridge error: {:?}", message.get("data")));
                                        warn!("Python bridge error: {:?}", message.get("data"));
                                    }
                                    _ => {
                                        led_light!(trail, 608, {"operation": "unknown_message_type", "type": msg_type});
                                    }
                                }
                            } else {
                                led_light!(trail, 609, {"operation": "invalid_json_message", "content": line_content});
                            }
                        }
                        Err(e) => {
                            led_fail!(trail, 610, format!("Error reading stdout: {}", e));
                            break;
                        }
                    }
                }
                led_light!(trail, 611, {"operation": "stdout_monitoring_ended"});
            });
        }
        
        // Monitor stderr for errors
        if let Some(stderr) = stderr {
            let trail = monitoring_trail.clone();
            thread::spawn(move || {
                use std::io::{BufRead, BufReader};
                led_light!(trail, 612, {"operation": "stderr_monitoring_start"});
                
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                    match line {
                        Ok(line_content) => {
                            led_light!(trail, 613, {"operation": "python_stderr_received", "content": line_content.clone()});
                            warn!("Python bridge stderr: {}", line_content);
                        }
                        Err(e) => {
                            led_fail!(trail, 614, format!("Error reading stderr: {}", e));
                            break;
                        }
                    }
                }
                led_light!(trail, 615, {"operation": "stderr_monitoring_ended"});
            });
        }
    }

    /// Start audio capture streams for dual-channel recording
    async fn start_audio_capture(&mut self) -> Result<()> {
        led_light!(self.trail, 302, {"operation": "audio_capture_initialization"});
        info!("Starting audio capture streams...");
        
        let host = cpal::default_host();
        let mut streams = Vec::new();
        
        // Find best input device (microphone)
        led_light!(self.trail, 210, {"operation": "input_device_selection_start"});
        let input_device = self.find_best_input_device(&host).map_err(|e| {
            led_fail!(self.trail, 210, format!("Input device selection failed: {}", e));
            e
        })?;
        let input_config = input_device.default_input_config().map_err(|e| {
            led_fail!(self.trail, 211, format!("Input device config failed: {}", e));
            anyhow!("Input device config failed: {}", e)
        })?;
        
        let device_name = input_device.name().unwrap_or_else(|_| "Unknown".to_string());
        led_light!(self.trail, 211, {"operation": "input_device_selected", "device": device_name.clone(), "sample_rate": input_config.sample_rate().0, "channels": input_config.channels()});
        info!("Using input device: {:?}", device_name);
        info!("Input config: {:?}", input_config);
        
        // Create user microphone stream
        led_light!(self.trail, 303, {"operation": "user_stream_creation_start"});
        let user_stream = self.create_audio_stream(&input_device, true, "user").await.map_err(|e| {
            led_fail!(self.trail, 303, format!("User stream creation failed: {}", e));
            e
        })?;
        streams.push(user_stream);
        led_light!(self.trail, 304, {"operation": "user_stream_created"});
        
        // Try to find system audio device (prospect)
        led_light!(self.trail, 212, {"operation": "system_audio_device_search"});
        if let Ok(output_device) = self.find_system_audio_device(&host) {
            led_light!(self.trail, 213, {"operation": "system_audio_device_found", "device": output_device.name().unwrap_or_else(|_| "Unknown".to_string())});
            
            led_light!(self.trail, 305, {"operation": "prospect_stream_creation_start"});
            match self.create_audio_stream(&output_device, false, "prospect").await {
                Ok(prospect_stream) => {
                    streams.push(prospect_stream);
                    led_light!(self.trail, 306, {"operation": "prospect_stream_created"});
                    info!("System audio capture enabled");
                }
                Err(e) => {
                    led_fail!(self.trail, 306, format!("Prospect stream creation failed: {}", e));
                    warn!("Failed to create prospect stream: {}", e);
                }
            }
        } else {
            led_light!(self.trail, 213, {"operation": "system_audio_device_not_found"});
            warn!("System audio capture not available - using microphone only");
        }
        
        // Store active streams
        led_light!(self.trail, 307, {"operation": "active_streams_storage", "stream_count": streams.len()});
        *self.active_streams.lock().unwrap() = streams;
        
        Ok(())
    }

    /// Find the best input device for microphone capture
    fn find_best_input_device(&self, host: &cpal::Host) -> Result<Device> {
        led_light!(self.trail, 214, {"operation": "default_input_device_check"});
        // Try default input device first
        if let Ok(device) = host.default_input_device() {
            let device_name = device.name().unwrap_or_else(|_| "Unknown".to_string());
            led_light!(self.trail, 215, {"operation": "default_input_device_found", "device": device_name});
            return Ok(device);
        }
        
        led_light!(self.trail, 216, {"operation": "fallback_input_device_search"});
        // Fall back to first available input device
        if let Ok(mut devices) = host.input_devices() {
            if let Some(device) = devices.next() {
                let device_name = device.name().unwrap_or_else(|_| "Unknown".to_string());
                led_light!(self.trail, 217, {"operation": "fallback_input_device_found", "device": device_name});
                return Ok(device);
            }
        }
        
        led_fail!(self.trail, 217, "No input devices available");
        Err(anyhow!("No input devices available"))
    }

    /// Try to find system audio loopback device (Windows specific)
    fn find_system_audio_device(&self, host: &cpal::Host) -> Result<Device> {
        led_light!(self.trail, 218, {"operation": "system_audio_device_search_start", "patterns": ["stereo mix", "what u hear", "loopback"]});
        
        // On Windows, look for "Stereo Mix" or loopback devices
        if let Ok(devices) = host.input_devices() {
            for device in devices {
                if let Ok(name) = device.name() {
                    let name_lower = name.to_lowercase();
                    led_light!(self.trail, 219, {"operation": "system_audio_device_check", "device": name.clone()});
                    
                    if name_lower.contains("stereo mix") || 
                       name_lower.contains("what u hear") ||
                       name_lower.contains("loopback") {
                        led_light!(self.trail, 220, {"operation": "system_audio_device_found", "device": name.clone(), "type": "loopback"});
                        info!("Found system audio device: {}", name);
                        return Ok(device);
                    }
                }
            }
        }
        
        led_fail!(self.trail, 220, "No system audio loopback device found");
        Err(anyhow!("No system audio loopback device found"))
    }

    /// Create an audio stream for real-time processing
    async fn create_audio_stream(&self, device: &Device, is_input: bool, channel_name: &str) -> Result<cpal::Stream> {
        led_light!(self.trail, 308, {"operation": "stream_config_start", "channel": channel_name, "is_input": is_input});
        
        let config = if is_input {
            device.default_input_config().map_err(|e| {
                led_fail!(self.trail, 309, format!("Input config failed for {}: {}", channel_name, e));
                anyhow!("Input config failed: {}", e)
            })?
        } else {
            // For system audio, we need input config even from output device
            device.default_input_config().or_else(|_| device.default_output_config()).map_err(|e| {
                led_fail!(self.trail, 309, format!("Config failed for {}: {}", channel_name, e));
                anyhow!("Config failed: {}", e)
            })?
        };
        
        led_light!(self.trail, 309, {"operation": "stream_config_complete", "channel": channel_name, "sample_format": format!("{:?}", config.sample_format()), "sample_rate": config.sample_rate().0, "channels": config.channels()});
        info!("Creating {} stream for {}: {:?}", 
              if is_input { "input" } else "output", channel_name, config);
        
        // Prepare for audio level calculation
        let levels_tx = self.audio_levels_tx.clone();
        let start_time = self.start_time.clone();
        let channel_name = channel_name.to_string();
        
        led_light!(self.trail, 310, {"operation": "stream_build_start", "channel": channel_name, "sample_format": format!("{:?}", config.sample_format())});
        let stream = match config.sample_format() {
            cpal::SampleFormat::F32 => {
                self.build_stream::<f32>(device, &config.into(), levels_tx, start_time, channel_name.clone(), is_input).map_err(|e| {
                    led_fail!(self.trail, 311, format!("F32 stream build failed for {}: {}", channel_name, e));
                    e
                })?
            }
            cpal::SampleFormat::I16 => {
                self.build_stream::<i16>(device, &config.into(), levels_tx, start_time, channel_name.clone(), is_input).map_err(|e| {
                    led_fail!(self.trail, 311, format!("I16 stream build failed for {}: {}", channel_name, e));
                    e
                })?
            }
            cpal::SampleFormat::U16 => {
                self.build_stream::<u16>(device, &config.into(), levels_tx, start_time, channel_name.clone(), is_input).map_err(|e| {
                    led_fail!(self.trail, 311, format!("U16 stream build failed for {}: {}", channel_name, e));
                    e
                })?
            }
        };
        
        led_light!(self.trail, 311, {"operation": "stream_build_complete", "channel": channel_name});
        
        led_light!(self.trail, 312, {"operation": "stream_play_start", "channel": channel_name});
        stream.play().map_err(|e| {
            led_fail!(self.trail, 312, format!("Stream play failed for {}: {}", channel_name, e));
            anyhow!("Stream play failed: {}", e)
        })?;
        led_light!(self.trail, 313, {"operation": "stream_play_complete", "channel": channel_name});
        
        Ok(stream)
    }

    /// Build typed audio stream
    fn build_stream<T>(
        &self,
        device: &Device,
        config: &cpal::StreamConfig,
        levels_tx: Sender<AudioLevels>,
        start_time: Arc<RwLock<Option<Instant>>>,
        channel_name: String,
        is_user: bool,
    ) -> Result<cpal::Stream>
    where
        T: cpal::Sample + Send + 'static,
        f32: From<T>,
    {
        // Create a trail for this specific audio stream
        let stream_trail = BreadcrumbTrail::new(&format!("AudioStream_{}", channel_name));
        led_light!(stream_trail, 314, {"operation": "audio_stream_callback_setup", "channel": channel_name, "is_user": is_user});
        
        let stream = device.build_input_stream(
            config,
            move |data: &[T], _: &cpal::InputCallbackInfo| {
                // LED 315: Audio data received
                if data.len() > 100 {  // Only log for significant audio data to avoid spam
                    led_light!(stream_trail, 315, {"operation": "audio_data_received", "samples": data.len(), "channel": channel_name});
                }
                
                // Calculate RMS level for visualization
                let rms = if !data.is_empty() {
                    let sum_squares: f32 = data.iter()
                        .map(|&sample| {
                            let float_sample: f32 = sample.into();
                            float_sample * float_sample
                        })
                        .sum();
                    (sum_squares / data.len() as f32).sqrt()
                } else {
                    0.0
                };
                
                // Convert to percentage (0-100)
                let level_percent = (rms * 100.0).min(100.0);
                
                // LED 316: Audio level calculated (only for significant levels)
                if level_percent > 1.0 {
                    led_light!(stream_trail, 316, {"operation": "audio_level_calculated", "level": level_percent, "channel": channel_name});
                }
                
                // Calculate timestamp
                let timestamp = start_time.read()
                    .map(|start| start.elapsed().as_millis() as u64)
                    .unwrap_or(0);
                
                // Send audio level update
                let levels = if is_user {
                    AudioLevels {
                        user: level_percent,
                        prospect: 0.0,  // Will be updated by prospect stream
                        timestamp,
                    }
                } else {
                    AudioLevels {
                        user: 0.0,      // Will be updated by user stream
                        prospect: level_percent,
                        timestamp,
                    }
                };
                
                // Non-blocking send
                match levels_tx.try_send(levels) {
                    Ok(_) => {
                        // LED 317: Audio levels sent successfully (only for significant levels)
                        if level_percent > 1.0 {
                            led_light!(stream_trail, 317, {"operation": "audio_levels_sent", "channel": channel_name, "level": level_percent});
                        }
                    }
                    Err(_) => {
                        // LED 318: Audio levels send failed (channel full)
                        led_light!(stream_trail, 318, {"operation": "audio_levels_send_failed", "channel": channel_name, "reason": "channel_full"});
                    }
                }
                
                // TODO: Send audio data to Python pipeline for transcription
                // This would require setting up a more sophisticated IPC mechanism
                // LED 319: Python pipeline send (placeholder)
                led_light!(stream_trail, 319, {"operation": "python_pipeline_send_placeholder", "channel": channel_name});
            },
            {
                let error_trail = stream_trail.clone();
                let error_channel = channel_name.clone();
                move |err| {
                    led_fail!(error_trail, 320, format!("Audio stream error in {}: {}", error_channel, err));
                    error!("Audio stream error in {}: {}", error_channel, err);
                }
            },
            None,
        )?;
        
        Ok(stream)
    }

    /// Start monitoring threads for audio levels and transcription
    fn start_monitoring_threads(&self) {
        let audio_levels = self.audio_levels.clone();
        let audio_levels_rx = self.audio_levels_rx.clone();
        
        // Create monitoring trail
        let monitoring_trail = BreadcrumbTrail::new("AudioMonitoring");
        led_light!(monitoring_trail, 502, {"operation": "monitoring_thread_spawn"});
        
        // Audio levels monitoring thread
        thread::spawn(move || {
            led_light!(monitoring_trail, 503, {"operation": "monitoring_thread_started"});
            let mut current_user_level = 0.0;
            let mut current_prospect_level = 0.0;
            let mut last_significant_update = std::time::Instant::now();
            
            while let Ok(new_levels) = audio_levels_rx.recv() {
                // LED 504: Audio levels received (only for significant changes or periodic updates)
                let should_log = new_levels.user > 1.0 || new_levels.prospect > 1.0 || 
                                last_significant_update.elapsed().as_secs() > 10;
                
                if should_log {
                    led_light!(monitoring_trail, 504, {"operation": "audio_levels_received", "user": new_levels.user, "prospect": new_levels.prospect, "timestamp": new_levels.timestamp});
                    last_significant_update = std::time::Instant::now();
                }
                
                // Merge levels from different streams
                if new_levels.user > 0.0 {
                    current_user_level = new_levels.user;
                }
                if new_levels.prospect > 0.0 {
                    current_prospect_level = new_levels.prospect;
                }
                
                // Update combined levels
                *audio_levels.write() = AudioLevels {
                    user: current_user_level,
                    prospect: current_prospect_level,
                    timestamp: new_levels.timestamp,
                };
                
                // LED 505: Combined levels updated (only for significant changes)
                if should_log {
                    led_light!(monitoring_trail, 505, {"operation": "combined_levels_updated", "user": current_user_level, "prospect": current_prospect_level});
                }
                
                // Gradually decay levels for visual smoothness
                current_user_level *= 0.95;
                current_prospect_level *= 0.95;
                
                thread::sleep(Duration::from_millis(16)); // ~60 FPS updates
            }
            
            led_light!(monitoring_trail, 506, {"operation": "monitoring_thread_ended"});
        });
    }

    /// Stop audio recording and clean up
    pub async fn stop_recording(&mut self) -> Result<()> {
        led_light!(self.trail, 110, {"operation": "stop_recording_begin"});
        info!("Stopping audio recording...");
        
        led_light!(self.trail, 111, {"status_change": "stopped"});
        *self.status.write() = AudioStatus::Stopped;
        
        // Stop audio streams
        led_light!(self.trail, 321, {"operation": "audio_streams_stop_start"});
        let stream_count = self.active_streams.lock().unwrap().len();
        self.active_streams.lock().unwrap().clear();
        led_light!(self.trail, 322, {"operation": "audio_streams_stopped", "stream_count": stream_count});
        
        // Stop Python process
        led_light!(self.trail, 415, {"operation": "python_process_stop_start"});
        if let Some(mut process) = self.python_process.lock().unwrap().take() {
            let process_id = process.id();
            led_light!(self.trail, 416, {"operation": "python_process_kill", "pid": process_id});
            
            match process.kill() {
                Ok(_) => {
                    led_light!(self.trail, 417, {"operation": "python_process_killed_successfully", "pid": process_id});
                }
                Err(e) => {
                    led_fail!(self.trail, 417, format!("Python process kill failed: {}", e));
                }
            }
            
            match process.wait() {
                Ok(status) => {
                    led_light!(self.trail, 418, {"operation": "python_process_wait_complete", "exit_status": format!("{:?}", status)});
                }
                Err(e) => {
                    led_fail!(self.trail, 418, format!("Python process wait failed: {}", e));
                }
            }
            
            info!("Python transcription pipeline stopped");
        } else {
            led_light!(self.trail, 416, {"operation": "python_process_already_stopped"});
        }
        
        // Reset timing
        led_light!(self.trail, 507, {"operation": "timing_reset"});
        *self.start_time.write() = None;
        
        led_light!(self.trail, 112, {"operation": "stop_recording_complete"});
        info!("Audio recording stopped");
        Ok(())
    }

    /// Get current audio levels for UI
    pub fn get_audio_levels(&self) -> AudioLevels {
        led_light!(self.trail, 508, {"operation": "get_audio_levels_request"});
        let levels = self.audio_levels.read().clone();
        led_light!(self.trail, 509, {"operation": "get_audio_levels_response", "user": levels.user, "prospect": levels.prospect});
        levels
    }

    /// Get current status
    pub fn get_status(&self) -> AudioStatus {
        led_light!(self.trail, 510, {"operation": "get_status_request"});
        let status = self.status.read().clone();
        led_light!(self.trail, 511, {"operation": "get_status_response", "status": format!("{:?}", status)});
        status
    }

    /// Get available audio devices
    pub fn get_audio_devices(&self) -> Vec<AudioDevice> {
        led_light!(self.trail, 221, {"operation": "get_audio_devices_request"});
        let devices = self.audio_devices.clone();
        led_light!(self.trail, 222, {"operation": "get_audio_devices_response", "device_count": devices.len()});
        devices
    }

    /// Get performance metrics
    pub fn get_performance_metrics(&self) -> serde_json::Value {
        led_light!(self.trail, 512, {"operation": "get_performance_metrics_request"});
        
        let latency_values = self.total_latency.read();
        let avg_latency = if !latency_values.is_empty() {
            latency_values.iter().sum::<f32>() / latency_values.len() as f32
        } else {
            0.0
        };
        
        let uptime = self.start_time.read()
            .map(|start| start.elapsed().as_secs())
            .unwrap_or(0);
        
        let metrics = serde_json::json!({
            "average_latency_ms": avg_latency,
            "uptime_seconds": uptime,
            "total_transcriptions": latency_values.len(),
            "status": format!("{:?}", self.get_status()),
            "target_latency_ms": self.config.latency_target_ms,
            "breadcrumb_statistics": crate::breadcrumb_system::get_global_statistics()
        });
        
        led_light!(self.trail, 513, {"operation": "get_performance_metrics_response", "avg_latency": avg_latency, "uptime": uptime, "transcriptions": latency_values.len()});
        
        metrics
    }

    /// Update configuration
    pub fn update_config(&mut self, config: AudioConfig) -> Result<()> {
        led_light!(self.trail, 113, {"operation": "update_config_start", "new_config": format!("{:?}", config)});
        info!("Updating audio configuration: {:?}", config);
        
        let old_config = self.config.clone();
        self.config = config;
        
        // If recording, restart with new config
        let current_status = *self.status.read();
        if matches!(current_status, AudioStatus::Recording) {
            led_light!(self.trail, 114, {"operation": "config_change_during_recording", "warning": "restart_required"});
            warn!("Configuration changed during recording - restart required for full effect");
        }
        
        led_light!(self.trail, 115, {"operation": "update_config_complete", "old_config": format!("{:?}", old_config), "new_config": format!("{:?}", self.config)});
        
        Ok(())
    }
    
    /// Get breadcrumb trail for debugging
    pub fn get_breadcrumb_trail(&self) -> Vec<crate::breadcrumb_system::Breadcrumb> {
        self.trail.get_sequence()
    }
    
    /// Clear breadcrumb trail
    pub fn clear_breadcrumb_trail(&self) {
        led_light!(self.trail, 600, {"operation": "breadcrumb_trail_clear_requested"});
        self.trail.clear();
    }
}
}

/// Global audio processor instance
static AUDIO_PROCESSOR: parking_lot::Mutex<Option<AudioProcessor>> = parking_lot::Mutex::new(None);

/// Initialize the global audio processor
pub fn initialize_audio_processor() -> Result<()> {
    let global_trail = BreadcrumbTrail::new("GlobalAudioProcessor");
    led_light!(global_trail, 116, {"operation": "global_audio_processor_init_start"});
    
    let mut processor = AudioProcessor::new().map_err(|e| {
        led_fail!(global_trail, 117, format!("Audio processor creation failed: {}", e));
        e
    })?;
    
    // Initialize in async context
    led_light!(global_trail, 117, {"operation": "tokio_runtime_creation"});
    let rt = tokio::runtime::Runtime::new().map_err(|e| {
        led_fail!(global_trail, 118, format!("Tokio runtime creation failed: {}", e));
        e
    })?;
    
    led_light!(global_trail, 118, {"operation": "async_initialization_start"});
    rt.block_on(async {
        processor.initialize().await
    }).map_err(|e| {
        led_fail!(global_trail, 119, format!("Async initialization failed: {}", e));
        e
    })?;
    
    led_light!(global_trail, 119, {"operation": "global_processor_storage"});
    *AUDIO_PROCESSOR.lock() = Some(processor);
    led_light!(global_trail, 120, {"operation": "global_audio_processor_init_complete"});
    Ok(())
}

/// Get reference to global audio processor
pub fn with_audio_processor<T, F>(f: F) -> Result<T>
where
    F: FnOnce(&mut AudioProcessor) -> Result<T>,
{
    let access_trail = BreadcrumbTrail::new("GlobalAudioProcessorAccess");
    led_light!(access_trail, 121, {"operation": "audio_processor_access_request"});
    
    let mut guard = AUDIO_PROCESSOR.lock();
    match guard.as_mut() {
        Some(processor) => {
            led_light!(access_trail, 122, {"operation": "audio_processor_access_granted"});
            let result = f(processor);
            led_light!(access_trail, 123, {"operation": "audio_processor_access_complete", "success": result.is_ok()});
            result
        }
        None => {
            led_fail!(access_trail, 122, "Audio processor not initialized");
            Err(anyhow!("Audio processor not initialized"))
        }
    }
}

/// Get global breadcrumb statistics for audio system
pub fn get_audio_breadcrumb_statistics() -> serde_json::Value {
    let stats_trail = BreadcrumbTrail::new("AudioBreadcrumbStats");
    led_light!(stats_trail, 514, {"operation": "breadcrumb_stats_request"});
    
    let stats = crate::breadcrumb_system::get_global_statistics();
    led_light!(stats_trail, 515, {"operation": "breadcrumb_stats_retrieved"});
    
    stats
}

/// Clear all audio system breadcrumb trails
pub fn clear_all_audio_breadcrumbs() {
    let clear_trail = BreadcrumbTrail::new("AudioBreadcrumbClear");
    led_light!(clear_trail, 601, {"operation": "clear_all_breadcrumbs_request"});
    
    crate::breadcrumb_system::clear_all_trails();
    led_light!(clear_trail, 602, {"operation": "clear_all_breadcrumbs_complete"});
}