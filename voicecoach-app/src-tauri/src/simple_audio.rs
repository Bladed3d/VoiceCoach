// Simple REAL audio capture that actually works
use anyhow::Result;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::Arc;
use parking_lot::Mutex;
use crossbeam_channel::{unbounded, Receiver, Sender};

pub struct SimpleAudioCapture {
    audio_sender: Sender<Vec<f32>>,
    audio_receiver: Receiver<Vec<f32>>,
    current_stream: Option<cpal::Stream>,
    is_recording: bool,
}

impl SimpleAudioCapture {
    pub fn new() -> Result<Self> {
        let (sender, receiver) = unbounded();
        Ok(Self {
            audio_sender: sender,
            audio_receiver: receiver,
            current_stream: None,
            is_recording: false,
        })
    }
    
    pub fn start_recording(&mut self) -> Result<()> {
        if self.is_recording {
            return Ok(()); // Already recording
        }
        
        log::info!("🎤 Starting REAL microphone capture...");
        
        // Get the default host
        let host = cpal::default_host();
        
        // Get the default input device (microphone)
        let device = host.default_input_device()
            .ok_or_else(|| anyhow::anyhow!("No input device available"))?;
            
        let device_name = device.name().unwrap_or_else(|_| "Unknown".to_string());
        log::info!("📢 Using audio device: {}", device_name);
        
        // Get the default config
        let config = device.default_input_config()?;
        log::info!("🔊 Audio config: {:?}", config);
        
        let sender = self.audio_sender.clone();
        
        // Build the input stream
        let stream = match config.sample_format() {
            cpal::SampleFormat::F32 => {
                device.build_input_stream(
                    &config.into(),
                    move |data: &[f32], _: &_| {
                        // Send audio data through channel
                        if let Err(e) = sender.send(data.to_vec()) {
                            log::error!("Failed to send audio data: {}", e);
                        }
                    },
                    |err| log::error!("Audio stream error: {}", err),
                    None
                )?
            }
            cpal::SampleFormat::I16 => {
                device.build_input_stream(
                    &config.into(),
                    move |data: &[i16], _: &_| {
                        // Convert i16 to f32
                        let float_data: Vec<f32> = data.iter()
                            .map(|&s| s as f32 / i16::MAX as f32)
                            .collect();
                        if let Err(e) = sender.send(float_data) {
                            log::error!("Failed to send audio data: {}", e);
                        }
                    },
                    |err| log::error!("Audio stream error: {}", err),
                    None
                )?
            }
            cpal::SampleFormat::U16 => {
                device.build_input_stream(
                    &config.into(),
                    move |data: &[u16], _: &_| {
                        // Convert u16 to f32
                        let float_data: Vec<f32> = data.iter()
                            .map(|&s| (s as f32 / u16::MAX as f32) * 2.0 - 1.0)
                            .collect();
                        if let Err(e) = sender.send(float_data) {
                            log::error!("Failed to send audio data: {}", e);
                        }
                    },
                    |err| log::error!("Audio stream error: {}", err),
                    None
                )?
            }
            _ => return Err(anyhow::anyhow!("Unsupported sample format"))
        };
        
        // Start the stream
        stream.play()?;
        log::info!("✅ Audio stream started successfully!");
        
        self.current_stream = Some(stream);
        self.is_recording = true;
        
        Ok(())
    }
    
    pub fn stop_recording(&mut self) -> Result<()> {
        if !self.is_recording {
            return Ok(()); // Not recording
        }
        
        log::info!("🛑 Stopping audio capture...");
        
        // Drop the stream to stop it
        self.current_stream = None;
        self.is_recording = false;
        
        // Clear any remaining audio data
        while self.audio_receiver.try_recv().is_ok() {}
        
        log::info!("✅ Audio capture stopped");
        Ok(())
    }
    
    pub fn is_recording(&self) -> bool {
        self.is_recording
    }
    
    pub fn get_audio_level(&self) -> f32 {
        // Try to get the latest audio chunk and calculate level
        let mut level = 0.0;
        let mut sample_count = 0;
        
        // Process up to 10 chunks to get a recent average
        for _ in 0..10 {
            if let Ok(chunk) = self.audio_receiver.try_recv() {
                for sample in chunk.iter() {
                    level += sample.abs();
                    sample_count += 1;
                }
            } else {
                break;
            }
        }
        
        if sample_count > 0 {
            // Convert to percentage (0-100)
            (level / sample_count as f32 * 100.0).min(100.0)
        } else {
            0.0
        }
    }
    
    pub fn list_devices() -> Vec<String> {
        let host = cpal::default_host();
        let mut devices = Vec::new();
        
        if let Ok(input_devices) = host.input_devices() {
            for device in input_devices {
                if let Ok(name) = device.name() {
                    devices.push(format!("Input: {}", name));
                }
            }
        }
        
        devices
    }
}