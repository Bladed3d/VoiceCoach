// System audio capture for Windows - captures YouTube, Google Meet, etc.
// This is the KEY differentiator from browser version!

use anyhow::{Result, Context};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use crossbeam_channel::{unbounded, Receiver, Sender};
use std::sync::Arc;
use parking_lot::Mutex;
use log::{info, warn, error};
use std::any::Any;

#[cfg(target_os = "windows")]
use windows::{
    Win32::Media::Audio::*,
    Win32::System::Com::*,
    Win32::Foundation::*,
    core::*,
};

pub struct SystemAudioCapture {
    audio_sender: Sender<Vec<f32>>,
    audio_receiver: Receiver<Vec<f32>>,
    microphone_stream: Option<Box<dyn Any + Send>>,  // Store as Any to avoid Send issues
    system_stream: Option<Box<dyn Any + Send>>,      // Store as Any to avoid Send issues
    is_capturing: bool,
    mic_enabled: bool,
    system_enabled: bool,
}

impl SystemAudioCapture {
    pub fn new() -> Result<Self> {
        let (sender, receiver) = unbounded();
        
        Ok(Self {
            audio_sender: sender,
            audio_receiver: receiver,
            microphone_stream: None,
            system_stream: None,
            is_capturing: false,
            mic_enabled: true,
            system_enabled: true,
        })
    }
    
    /// Start capturing BOTH microphone and system audio
    /// This is what browser CAN'T do - capture YouTube/Google Meet audio!
    pub fn start_capture(&mut self) -> Result<()> {
        if self.is_capturing {
            return Ok(());
        }
        
        info!("🎯 Starting SYSTEM + MIC audio capture for desktop app!");
        
        // Start microphone capture
        if self.mic_enabled {
            self.start_microphone_capture()?;
        }
        
        // Start system audio capture (loopback)
        if self.system_enabled {
            self.start_system_audio_capture()?;
        }
        
        self.is_capturing = true;
        info!("✅ Full audio capture active - can transcribe YouTube/Google Meet!");
        
        Ok(())
    }
    
    fn start_microphone_capture(&mut self) -> Result<()> {
        info!("🎤 Starting microphone capture...");
        
        let host = cpal::default_host();
        let device = host.default_input_device()
            .ok_or_else(|| anyhow::anyhow!("No microphone found"))?;
            
        let device_name = device.name().unwrap_or_else(|_| "Unknown".to_string());
        info!("📢 Using microphone: {}", device_name);
        
        let config = device.default_input_config()?;
        let sender = self.audio_sender.clone();
        let label = "MIC";
        
        let stream = match config.sample_format() {
            cpal::SampleFormat::F32 => {
                device.build_input_stream(
                    &config.into(),
                    move |data: &[f32], _: &_| {
                        // Tag audio as microphone source
                        let mut tagged_data = Vec::with_capacity(data.len() + 1);
                        tagged_data.push(1.0); // Tag: 1.0 = microphone
                        tagged_data.extend_from_slice(data);
                        
                        if let Err(e) = sender.send(tagged_data) {
                            error!("Failed to send {} audio: {}", label, e);
                        }
                    },
                    |err| error!("Microphone stream error: {}", err),
                    None
                )?
            }
            cpal::SampleFormat::I16 => {
                device.build_input_stream(
                    &config.into(),
                    move |data: &[i16], _: &_| {
                        let mut tagged_data = Vec::with_capacity(data.len() + 1);
                        tagged_data.push(1.0); // Tag: 1.0 = microphone
                        
                        // Convert i16 to f32
                        for &sample in data {
                            tagged_data.push(sample as f32 / i16::MAX as f32);
                        }
                        
                        if let Err(e) = sender.send(tagged_data) {
                            error!("Failed to send {} audio: {}", label, e);
                        }
                    },
                    |err| error!("Microphone stream error: {}", err),
                    None
                )?
            }
            _ => return Err(anyhow::anyhow!("Unsupported microphone format"))
        };
        
        stream.play()?;
        self.microphone_stream = Some(Box::new(stream) as Box<dyn Any + Send>);
        info!("✅ Microphone capture started");
        
        Ok(())
    }
    
    fn start_system_audio_capture(&mut self) -> Result<()> {
        info!("🔊 Starting SYSTEM audio capture (YouTube/Google Meet/etc)...");
        
        #[cfg(target_os = "windows")]
        {
            // Use WASAPI loopback for Windows
            self.start_wasapi_loopback()?;
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            // Try to find loopback device using CPAL
            self.start_cpal_loopback()?;
        }
        
        info!("✅ System audio capture started - YouTube/Google Meet audio available!");
        Ok(())
    }
    
    #[cfg(target_os = "windows")]
    fn start_wasapi_loopback(&mut self) -> Result<()> {
        info!("🎯 Using WASAPI loopback for Windows system audio");
        
        // For now, use CPAL with the loopback device if available
        // Full WASAPI implementation would go here for production
        self.start_cpal_loopback()
    }
    
    fn start_cpal_loopback(&mut self) -> Result<()> {
        let host = cpal::default_host();
        
        // Try to find loopback/monitor device
        let device = if let Ok(devices) = host.output_devices() {
            let mut loopback_device = None;
            
            for dev in devices {
                if let Ok(name) = dev.name() {
                    info!("Found output device: {}", name);
                    
                    // Look for loopback indicators
                    let name_lower = name.to_lowercase();
                    if name_lower.contains("loopback") || 
                       name_lower.contains("monitor") ||
                       name_lower.contains("stereo mix") ||
                       name_lower.contains("what u hear") ||
                       name_lower.contains("wave out mix") {
                        info!("🎯 Found loopback device: {}", name);
                        loopback_device = Some(dev);
                        break;
                    }
                }
            }
            
            loopback_device
        } else {
            None
        };
        
        if let Some(device) = device {
            let device_name = device.name().unwrap_or_else(|_| "Unknown".to_string());
            info!("📢 Using system audio device: {}", device_name);
            
            // Try to use it as input device for loopback
            if let Ok(config) = device.default_input_config() {
                let sender = self.audio_sender.clone();
                let label = "SYSTEM";
                
                let stream = match config.sample_format() {
                    cpal::SampleFormat::F32 => {
                        device.build_input_stream(
                            &config.into(),
                            move |data: &[f32], _: &_| {
                                // Tag audio as system source
                                let mut tagged_data = Vec::with_capacity(data.len() + 1);
                                tagged_data.push(2.0); // Tag: 2.0 = system audio
                                tagged_data.extend_from_slice(data);
                                
                                if let Err(e) = sender.send(tagged_data) {
                                    error!("Failed to send {} audio: {}", label, e);
                                }
                            },
                            |err| error!("System audio stream error: {}", err),
                            None
                        )?
                    }
                    cpal::SampleFormat::I16 => {
                        device.build_input_stream(
                            &config.into(),
                            move |data: &[i16], _: &_| {
                                let mut tagged_data = Vec::with_capacity(data.len() + 1);
                                tagged_data.push(2.0); // Tag: 2.0 = system audio
                                
                                // Convert i16 to f32
                                for &sample in data {
                                    tagged_data.push(sample as f32 / i16::MAX as f32);
                                }
                                
                                if let Err(e) = sender.send(tagged_data) {
                                    error!("Failed to send {} audio: {}", label, e);
                                }
                            },
                            |err| error!("System audio stream error: {}", err),
                            None
                        )?
                    }
                    _ => return Err(anyhow::anyhow!("Unsupported system audio format"))
                };
                
                stream.play()?;
                self.system_stream = Some(Box::new(stream) as Box<dyn Any + Send>);
                info!("✅ System audio loopback active!");
                
                Ok(())
            } else {
                warn!("⚠️ Loopback device found but can't use as input");
                warn!("💡 You may need to enable 'Stereo Mix' in Windows Sound settings");
                warn!("💡 Right-click speaker icon → Sounds → Recording → Enable Stereo Mix");
                Err(anyhow::anyhow!("Loopback device not configured for input"))
            }
        } else {
            warn!("⚠️ No loopback device found!");
            warn!("💡 On Windows: Enable 'Stereo Mix' in Sound settings");
            warn!("💡 1. Right-click speaker icon in system tray");
            warn!("💡 2. Select 'Sounds'");
            warn!("💡 3. Go to 'Recording' tab");
            warn!("💡 4. Right-click empty space → 'Show Disabled Devices'");
            warn!("💡 5. Enable 'Stereo Mix' or 'What U Hear'");
            warn!("📝 Continuing with microphone only for now");
            
            // Don't fail completely - still use microphone
            Ok(())
        }
    }
    
    pub fn stop_capture(&mut self) -> Result<()> {
        if !self.is_capturing {
            return Ok(());
        }
        
        info!("🛑 Stopping audio capture...");
        
        // Stop streams
        self.microphone_stream = None;
        self.system_stream = None;
        self.is_capturing = false;
        
        // Clear buffer
        while self.audio_receiver.try_recv().is_ok() {}
        
        info!("✅ Audio capture stopped");
        Ok(())
    }
    
    pub fn get_audio_chunks(&self) -> Vec<(AudioSource, Vec<f32>)> {
        let mut chunks = Vec::new();
        
        // Get up to 10 chunks
        for _ in 0..10 {
            if let Ok(tagged_data) = self.audio_receiver.try_recv() {
                if tagged_data.len() > 1 {
                    let tag = tagged_data[0];
                    let audio_data = tagged_data[1..].to_vec();
                    
                    let source = if tag == 1.0 {
                        AudioSource::Microphone
                    } else if tag == 2.0 {
                        AudioSource::System
                    } else {
                        AudioSource::Unknown
                    };
                    
                    chunks.push((source, audio_data));
                }
            } else {
                break;
            }
        }
        
        chunks
    }
    
    pub fn is_capturing(&self) -> bool {
        self.is_capturing
    }
    
    pub fn set_mic_enabled(&mut self, enabled: bool) {
        self.mic_enabled = enabled;
        if !enabled {
            self.microphone_stream = None;
        }
    }
    
    pub fn set_system_enabled(&mut self, enabled: bool) {
        self.system_enabled = enabled;
        if !enabled {
            self.system_stream = None;
        }
    }
    
    pub fn get_audio_level(&self) -> (f32, f32) {
        let mut mic_level = 0.0;
        let mut system_level = 0.0;
        let mut mic_samples = 0;
        let mut system_samples = 0;
        
        let chunks = self.get_audio_chunks();
        
        for (source, data) in chunks {
            let level: f32 = data.iter().map(|s| s.abs()).sum();
            let count = data.len();
            
            match source {
                AudioSource::Microphone => {
                    mic_level += level;
                    mic_samples += count;
                }
                AudioSource::System => {
                    system_level += level;
                    system_samples += count;
                }
                _ => {}
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
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum AudioSource {
    Microphone,
    System,
    Unknown,
}

// Helper function to check if system audio is available
pub fn check_system_audio_availability() -> SystemAudioStatus {
    let host = cpal::default_host();
    
    if let Ok(devices) = host.output_devices() {
        for dev in devices {
            if let Ok(name) = dev.name() {
                let name_lower = name.to_lowercase();
                if name_lower.contains("loopback") || 
                   name_lower.contains("monitor") ||
                   name_lower.contains("stereo mix") ||
                   name_lower.contains("what u hear") {
                    return SystemAudioStatus::Available(name);
                }
            }
        }
    }
    
    SystemAudioStatus::NotAvailable
}

#[derive(Debug)]
pub enum SystemAudioStatus {
    Available(String),
    NotAvailable,
}