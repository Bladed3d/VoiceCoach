// WASAPI Loopback Audio Capture for Windows
// This module provides robust system audio capture without requiring Stereo Mix
// Works reliably on all Windows versions 10+

use anyhow::{Result, anyhow};
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::thread;
use std::time::Duration;
use crossbeam_channel::Sender;
use log::{info, error, warn};
use windows::{
    core::*,
    Win32::{
        Foundation::*,
        Media::Audio::*,
        System::Com::*,
    },
};
use crate::audio_thread::{AudioData, AudioSource};

// WASAPI audio capture implementation
pub struct WasapiCapture {
    is_capturing: Arc<AtomicBool>,
    data_tx: Option<Sender<AudioData>>,
}

impl WasapiCapture {
    pub fn new() -> Result<Self> {
        // Initialize COM for this thread
        unsafe {
            let hr = CoInitializeEx(None, COINIT_MULTITHREADED);
            if hr.is_err() && hr != CO_E_ALREADYINITIALIZED {
                return Err(anyhow!("Failed to initialize COM: {:?}", hr));
            }
        }
        
        Ok(Self {
            is_capturing: Arc::new(AtomicBool::new(false)),
            data_tx: None,
        })
    }
    
    pub fn start_loopback_capture(&mut self, data_tx: Sender<AudioData>) -> Result<()> {
        if self.is_capturing.load(Ordering::Relaxed) {
            return Ok(()); // Already capturing
        }
        
        self.data_tx = Some(data_tx.clone());
        self.is_capturing.store(true, Ordering::Relaxed);
        
        let is_capturing = self.is_capturing.clone();
        
        // Spawn capture thread
        thread::spawn(move || {
            info!("🎵 Starting WASAPI loopback capture thread");
            
            if let Err(e) = capture_loopback_audio(data_tx, is_capturing) {
                error!("WASAPI capture error: {}", e);
            }
            
            info!("🛑 WASAPI loopback capture thread stopped");
        });
        
        Ok(())
    }
    
    pub fn stop_capture(&mut self) {
        self.is_capturing.store(false, Ordering::Relaxed);
        self.data_tx = None;
    }
    
    pub fn is_capturing(&self) -> bool {
        self.is_capturing.load(Ordering::Relaxed)
    }
}

// Main WASAPI capture function
fn capture_loopback_audio(
    data_tx: Sender<AudioData>,
    is_capturing: Arc<AtomicBool>,
) -> Result<()> {
    unsafe {
        // Initialize COM for this thread
        let hr = CoInitializeEx(None, COINIT_MULTITHREADED);
        if hr.is_err() && hr != CO_E_ALREADYINITIALIZED {
            return Err(anyhow!("Failed to initialize COM: {:?}", hr));
        }
        
        // Create device enumerator
        let device_enumerator: IMMDeviceEnumerator = 
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
        
        // Get default audio endpoint for rendering (speakers)
        // We'll capture from this in loopback mode
        let device = device_enumerator.GetDefaultAudioEndpoint(
            eRender,
            eConsole
        )?;
        
        // Get device name for logging
        let props = device.OpenPropertyStore(STGM_READ)?;
        let device_name = get_device_friendly_name(&props).unwrap_or_else(|_| "Unknown".to_string());
        info!("📢 Capturing system audio from: {}", device_name);
        
        // Activate audio client
        let audio_client: IAudioClient = device.Activate(CLSCTX_ALL, None)?;
        
        // Get mix format
        let mix_format = audio_client.GetMixFormat()?;
        let format = &*mix_format;
        
        info!("🔊 Audio format: {} Hz, {} channels, {} bits",
            format.nSamplesPerSec,
            format.nChannels,
            format.wBitsPerSample
        );
        
        // Initialize audio client in loopback mode
        let buffer_duration = 10_000_000i64; // 1 second in 100-nanosecond units
        audio_client.Initialize(
            AUDCLNT_SHAREMODE_SHARED,
            AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
            buffer_duration,
            0,
            mix_format,
            None
        )?;
        
        // Get buffer size
        let buffer_size = audio_client.GetBufferSize()?;
        info!("Buffer size: {} frames", buffer_size);
        
        // Create event for audio data availability
        let event = CreateEventW(None, false, false, None)?;
        audio_client.SetEventHandle(event)?;
        
        // Get capture client
        let capture_client: IAudioCaptureClient = audio_client.GetService()?;
        
        // Start capturing
        audio_client.Start()?;
        info!("✅ WASAPI loopback capture started successfully!");
        
        // Capture loop
        while is_capturing.load(Ordering::Relaxed) {
            // Wait for audio data (with timeout)
            let wait_result = WaitForSingleObject(event, 100); // 100ms timeout
            
            if wait_result == WAIT_OBJECT_0.0 {
                // Audio data available
                loop {
                    let mut packet_size = 0u32;
                    capture_client.GetNextPacketSize(&mut packet_size)?;
                    
                    if packet_size == 0 {
                        break; // No more packets
                    }
                    
                    // Get the audio data
                    let mut buffer_ptr = std::ptr::null_mut();
                    let mut num_frames = 0u32;
                    let mut flags = 0u32;
                    
                    capture_client.GetBuffer(
                        &mut buffer_ptr,
                        &mut num_frames,
                        &mut flags,
                        None,
                        None
                    )?;
                    
                    if num_frames > 0 && !buffer_ptr.is_null() {
                        // Convert buffer to f32 samples
                        let samples = convert_audio_buffer(
                            buffer_ptr,
                            num_frames,
                            format.nChannels,
                            format.wBitsPerSample
                        );
                        
                        // Send audio data
                        if !samples.is_empty() {
                            let audio_data = AudioData {
                                source: AudioSource::SystemAudio,
                                samples,
                                timestamp: std::time::SystemTime::now(),
                            };
                            
                            if let Err(e) = data_tx.send(audio_data) {
                                warn!("Failed to send audio data: {}", e);
                            }
                        }
                    }
                    
                    // Release buffer
                    capture_client.ReleaseBuffer(num_frames)?;
                }
            }
        }
        
        // Stop capturing
        audio_client.Stop()?;
        CloseHandle(event)?;
        
        info!("✅ WASAPI loopback capture stopped cleanly");
        Ok(())
    }
}

// Convert audio buffer to f32 samples
unsafe fn convert_audio_buffer(
    buffer: *mut u8,
    num_frames: u32,
    channels: u16,
    bits_per_sample: u16,
) -> Vec<f32> {
    let mut samples = Vec::new();
    let total_samples = (num_frames * channels as u32) as usize;
    
    match bits_per_sample {
        32 => {
            // 32-bit float
            let float_buffer = buffer as *const f32;
            let slice = std::slice::from_raw_parts(float_buffer, total_samples);
            samples.extend_from_slice(slice);
        }
        16 => {
            // 16-bit integer
            let int_buffer = buffer as *const i16;
            let slice = std::slice::from_raw_parts(int_buffer, total_samples);
            for &sample in slice {
                samples.push(sample as f32 / i16::MAX as f32);
            }
        }
        24 => {
            // 24-bit integer (packed)
            let byte_buffer = buffer;
            for i in 0..total_samples {
                let offset = i * 3;
                let b1 = *byte_buffer.add(offset) as i32;
                let b2 = *byte_buffer.add(offset + 1) as i32;
                let b3 = *byte_buffer.add(offset + 2) as i32;
                
                // Combine bytes (little-endian)
                let sample = (b1 | (b2 << 8) | (b3 << 16)) << 8; // Shift to 32-bit
                samples.push(sample as f32 / i32::MAX as f32);
            }
        }
        _ => {
            warn!("Unsupported audio format: {} bits", bits_per_sample);
        }
    }
    
    samples
}

// Get device friendly name
unsafe fn get_device_friendly_name(props: &IPropertyStore) -> Result<String> {
    use windows::Win32::UI::Shell::PropertiesSystem::*;
    
    let mut prop_variant = PROPVARIANT::default();
    props.GetValue(&PKEY_Device_FriendlyName, &mut prop_variant)?;
    
    // Convert PROPVARIANT to string
    let name = if prop_variant.Anonymous.Anonymous.vt == VT_LPWSTR.0 as u16 {
        let pwstr = prop_variant.Anonymous.Anonymous.Anonymous.pwszVal;
        if !pwstr.is_null() {
            let len = (0..).take_while(|&i| *pwstr.add(i) != 0).count();
            let slice = std::slice::from_raw_parts(pwstr, len);
            String::from_utf16_lossy(slice)
        } else {
            "Unknown".to_string()
        }
    } else {
        "Unknown".to_string()
    };
    
    PropVariantClear(&mut prop_variant)?;
    Ok(name)
}

// Check if WASAPI loopback is available
pub fn check_wasapi_availability() -> bool {
    unsafe {
        // Try to initialize COM
        let hr = CoInitializeEx(None, COINIT_MULTITHREADED);
        if hr.is_err() && hr != CO_E_ALREADYINITIALIZED {
            return false;
        }
        
        // Try to create device enumerator
        if let Ok(device_enumerator) = CoCreateInstance::<_, IMMDeviceEnumerator>(
            &MMDeviceEnumerator,
            None,
            CLSCTX_ALL
        ) {
            // Try to get default render device
            if let Ok(_device) = device_enumerator.GetDefaultAudioEndpoint(eRender, eConsole) {
                return true;
            }
        }
        
        false
    }
}