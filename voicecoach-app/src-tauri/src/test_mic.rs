use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use std::time::Duration;
use std::thread;

#[tauri::command]
pub fn test_microphone_access() -> Result<String, String> {
    println!("Testing microphone access...");
    
    let host = cpal::default_host();
    
    // List all available input devices
    let mut device_info = String::new();
    device_info.push_str("Available input devices:\n");
    
    let input_devices = host.input_devices()
        .map_err(|e| format!("Failed to get input devices: {}", e))?;
    
    for (idx, device) in input_devices.enumerate() {
        let name = device.name().unwrap_or_else(|_| "Unknown".to_string());
        device_info.push_str(&format!("  {}. {}\n", idx, name));
    }
    
    // Get default input device
    let device = host.default_input_device()
        .ok_or("No input device available")?;
    
    let device_name = device.name().unwrap_or_else(|_| "Unknown".to_string());
    device_info.push_str(&format!("\nDefault device: {}\n", device_name));
    
    // Get default config
    let config = device.default_input_config()
        .map_err(|e| format!("Failed to get default config: {}", e))?;
    
    device_info.push_str(&format!("Sample rate: {} Hz\n", config.sample_rate().0));
    device_info.push_str(&format!("Channels: {}\n", config.channels()));
    device_info.push_str(&format!("Sample format: {:?}\n", config.sample_format()));
    
    // Try to create a stream to test access
    let sample_count = Arc::new(AtomicU32::new(0));
    let sample_count_clone = sample_count.clone();
    let max_amplitude = Arc::new(AtomicU32::new(0));
    let max_amplitude_clone = max_amplitude.clone();
    
    let stream = device.build_input_stream(
        &config.into(),
        move |data: &[f32], _: &cpal::InputCallbackInfo| {
            sample_count_clone.fetch_add(data.len() as u32, Ordering::Relaxed);
            
            // Find max amplitude
            let max = data.iter()
                .map(|&s| (s.abs() * 1000.0) as u32)
                .max()
                .unwrap_or(0);
            
            let current_max = max_amplitude_clone.load(Ordering::Relaxed);
            if max > current_max {
                max_amplitude_clone.store(max, Ordering::Relaxed);
            }
        },
        |err| eprintln!("Stream error: {}", err),
        None
    ).map_err(|e| format!("Failed to build stream: {}", e))?;
    
    // Start the stream
    stream.play().map_err(|e| format!("Failed to start stream: {}", e))?;
    
    // Record for 2 seconds
    device_info.push_str("\nRecording for 2 seconds...\n");
    thread::sleep(Duration::from_secs(2));
    
    let total_samples = sample_count.load(Ordering::Relaxed);
    let max_amp = max_amplitude.load(Ordering::Relaxed);
    
    device_info.push_str(&format!("Samples received: {}\n", total_samples));
    device_info.push_str(&format!("Max amplitude: {:.3}\n", max_amp as f32 / 1000.0));
    
    if total_samples == 0 {
        device_info.push_str("\n❌ NO AUDIO DATA RECEIVED - Microphone may be muted or permissions denied!");
    } else if max_amp < 5 {
        device_info.push_str("\n⚠️ Very low audio level - Check microphone volume");
    } else {
        device_info.push_str("\n✅ Microphone is working!");
    }
    
    Ok(device_info)
}