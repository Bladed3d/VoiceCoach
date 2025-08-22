// Audio Format Diagnostic Test
// Tests different audio formats and conversion methods

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::{Arc, Mutex};
use std::time::Duration;

fn main() {
    println!("\n{}", "=".repeat(60));
    println!("AUDIO FORMAT DIAGNOSTIC TEST");
    println!("{}\n", "=".repeat(60));
    
    let host = cpal::default_host();
    let device = host.default_input_device().expect("No input device");
    let device_name = device.name().unwrap_or("Unknown".to_string());
    
    println!("🎤 Device: {}", device_name);
    println!("\n📊 Supported Configurations:");
    println!("{}", "-".repeat(40));
    
    // Check all supported configs
    if let Ok(configs) = device.supported_input_configs() {
        for (i, config) in configs.enumerate() {
            println!("\n[Config {}]", i);
            println!("  Channels: {}", config.channels());
            println!("  Sample Rate: {} Hz - {} Hz", 
                config.min_sample_rate().0, 
                config.max_sample_rate().0);
            println!("  Format: {:?}", config.sample_format());
            
            // Check if 16kHz is in range
            if config.min_sample_rate().0 <= 16000 && config.max_sample_rate().0 >= 16000 {
                println!("  ✅ Supports 16kHz natively");
            }
        }
    }
    
    // Test default config
    println!("\n📌 Default Configuration:");
    println!("{}", "-".repeat(40));
    
    if let Ok(config) = device.default_input_config() {
        println!("  Channels: {}", config.channels());
        println!("  Sample Rate: {} Hz", config.sample_rate().0);
        println!("  Format: {:?}", config.sample_format());
        println!("  Buffer Size: {:?}", config.buffer_size());
    }
    
    // Test different sample rates
    println!("\n🔬 Testing Sample Rates:");
    println!("{}", "-".repeat(40));
    
    for rate in [8000, 16000, 22050, 44100, 48000] {
        print!("  {} Hz: ", rate);
        
        let test_config = cpal::StreamConfig {
            channels: 1,
            sample_rate: cpal::SampleRate(rate),
            buffer_size: cpal::BufferSize::Default,
        };
        
        match device.build_input_stream(
            &test_config,
            |_: &[f32], _: &_| {},
            |_| {},
            None
        ) {
            Ok(stream) => {
                println!("✅ Supported");
                drop(stream);
            }
            Err(e) => println!("❌ Not supported - {}", e),
        }
    }
    
    // Test audio capture and conversion
    println!("\n🎙️ Testing Audio Capture (5 seconds):");
    println!("{}", "-".repeat(40));
    
    let stats = Arc::new(Mutex::new(AudioStats::default()));
    let stats_clone = stats.clone();
    
    // Try 16kHz first, fall back to 48kHz
    let (config, needs_resampling) = if let Ok(stream) = device.build_input_stream(
        &cpal::StreamConfig {
            channels: 1,
            sample_rate: cpal::SampleRate(16000),
            buffer_size: cpal::BufferSize::Fixed(800),
        },
        |_: &[f32], _: &_| {},
        |_| {},
        None
    ) {
        drop(stream);
        println!("  Using: 16000 Hz (native)");
        (cpal::StreamConfig {
            channels: 1,
            sample_rate: cpal::SampleRate(16000),
            buffer_size: cpal::BufferSize::Fixed(800),
        }, false)
    } else {
        println!("  Using: 48000 Hz (will resample to 16kHz)");
        (cpal::StreamConfig {
            channels: 1,
            sample_rate: cpal::SampleRate(48000),
            buffer_size: cpal::BufferSize::Fixed(2400),
        }, true)
    };
    
    let stream = device.build_input_stream(
        &config,
        move |data: &[f32], _: &_| {
            let mut stats = stats_clone.lock().unwrap();
            stats.samples_processed += data.len();
            
            // Check for clipping
            for &sample in data {
                if sample.abs() >= 0.99 {
                    stats.clipped_samples += 1;
                }
                stats.max_amplitude = stats.max_amplitude.max(sample.abs());
            }
            
            // Calculate RMS
            let sum_squares: f32 = data.iter().map(|x| x * x).sum();
            let rms = (sum_squares / data.len() as f32).sqrt();
            stats.total_rms += rms;
            stats.chunks += 1;
            
            // Test i16 conversion
            for &sample in data {
                let i16_sample = (sample * 32767.0) as i16;
                let back_to_f32 = i16_sample as f32 / 32767.0;
                let error = (sample - back_to_f32).abs();
                stats.conversion_error += error;
            }
        },
        |err| eprintln!("Stream error: {}", err),
        None
    ).expect("Failed to create stream");
    
    stream.play().expect("Failed to start stream");
    
    println!("  Recording...");
    std::thread::sleep(Duration::from_secs(5));
    
    drop(stream);
    
    // Show results
    let stats = stats.lock().unwrap();
    println!("\n📊 Audio Analysis Results:");
    println!("{}", "-".repeat(40));
    println!("  Total samples: {}", stats.samples_processed);
    println!("  Sample rate: {} Hz", config.sample_rate.0);
    println!("  Needs resampling: {}", needs_resampling);
    println!("  Max amplitude: {:.3}", stats.max_amplitude);
    println!("  Average RMS: {:.4}", stats.total_rms / stats.chunks as f32);
    println!("  Clipped samples: {} ({:.2}%)", 
        stats.clipped_samples,
        (stats.clipped_samples as f32 / stats.samples_processed as f32) * 100.0);
    println!("  f32→i16 conversion error: {:.6}", 
        stats.conversion_error / stats.samples_processed as f32);
    
    if stats.max_amplitude < 0.1 {
        println!("\n⚠️  WARNING: Very low audio levels detected!");
        println!("  - Check microphone gain settings");
        println!("  - Move closer to microphone");
    }
    
    if stats.clipped_samples > 0 {
        println!("\n⚠️  WARNING: Audio clipping detected!");
        println!("  - Reduce microphone gain");
    }
    
    if needs_resampling {
        println!("\n📌 Resampling Analysis:");
        println!("  Input: {} Hz → Output: 16000 Hz", config.sample_rate.0);
        println!("  Ratio: {}", config.sample_rate.0 / 16000);
        println!("  Method: Simple decimation (every 3rd sample)");
        
        // Test resampling quality
        println!("\n  Testing resampling quality:");
        let test_signal: Vec<f32> = (0..480)
            .map(|i| (i as f32 * 2.0 * std::f32::consts::PI / 48.0).sin() * 0.5)
            .collect();
        
        // Simple decimation
        let decimated: Vec<f32> = test_signal.iter()
            .step_by(3)
            .copied()
            .collect();
        
        println!("    Input: {} samples", test_signal.len());
        println!("    Output: {} samples", decimated.len());
        println!("    Expected: {} samples", test_signal.len() / 3);
    }
    
    println!("\n✅ Diagnostic complete!");
}

#[derive(Default)]
struct AudioStats {
    samples_processed: usize,
    clipped_samples: usize,
    max_amplitude: f32,
    total_rms: f32,
    chunks: usize,
    conversion_error: f32,
}