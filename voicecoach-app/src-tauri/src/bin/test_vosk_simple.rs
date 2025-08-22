// Simple Vosk Transcription Test
// Run with: cargo run --bin test_vosk_simple

use std::fs;
use std::path::Path;
use vosk::{Model, Recognizer};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

fn main() {
    println!("\n{}", "=".repeat(60));
    println!("VOSK TRANSCRIPTION TEST UTILITY");
    println!("{}\n", "=".repeat(60));
    
    // Try to find and load the model
    let model_paths = vec![
        "../models/vosk-model-en-us-0.22-lgraph/vosk-model-en-us-0.22-lgraph",
        "models/vosk-model-en-us-0.22-lgraph/vosk-model-en-us-0.22-lgraph",
        "../models/vosk-model-small-en-us-0.15",
        "models/vosk-model-small-en-us-0.15",
    ];
    
    let mut model = None;
    for path in &model_paths {
        if Path::new(path).exists() {
            println!("✅ Found model at: {}", path);
            
            // Check model size
            let size = get_dir_size(path);
            println!("   Model size: {:.2} MB", size as f64 / 1024.0 / 1024.0);
            
            // Load model
            println!("   Loading model...");
            let start = Instant::now();
            if let Some(m) = Model::new(path.to_string()) {
                println!("✅ Model loaded in {:.2}s", start.elapsed().as_secs_f32());
                model = Some(m);
                break;
            } else {
                println!("❌ Failed to load model");
            }
        } else {
            println!("❌ Model not found at: {}", path);
        }
    }
    
    let model = match model {
        Some(m) => m,
        None => {
            println!("❌ No Vosk model found!");
            return;
        }
    };
    
    // Create recognizer with 16kHz sample rate
    let mut recognizer = Recognizer::new(&model, 16000.0).expect("Failed to create recognizer");
    recognizer.set_partial_words(false);
    recognizer.set_words(true);
    
    println!("\n📢 Audio Devices:");
    println!("{}", "-".repeat(40));
    
    // List audio devices
    let host = cpal::default_host();
    let devices: Vec<_> = host.input_devices().unwrap().collect();
    
    for (i, device) in devices.iter().enumerate() {
        if let Ok(name) = device.name() {
            println!("  [{}] {}", i, name);
            if let Ok(config) = device.default_input_config() {
                println!("      Sample rate: {} Hz", config.sample_rate().0);
                println!("      Channels: {}", config.channels());
            }
        }
    }
    
    // Use default device
    let device = host.default_input_device().expect("No input device found");
    let device_name = device.name().unwrap_or("Unknown".to_string());
    println!("\n🎤 Using device: {}", device_name);
    
    // Configure audio stream for 16kHz mono
    let config = cpal::StreamConfig {
        channels: 1,
        sample_rate: cpal::SampleRate(16000),
        buffer_size: cpal::BufferSize::Fixed(800), // 50ms at 16kHz
    };
    
    println!("   Sample rate: 16000 Hz");
    println!("   Channels: 1 (mono)");
    println!("   Buffer size: 800 samples (50ms)");
    
    // Shared state
    let recognizer = Arc::new(Mutex::new(recognizer));
    let stats = Arc::new(Mutex::new(Stats::default()));
    let is_running = Arc::new(Mutex::new(true));
    
    // Clone for stream
    let recognizer_clone = recognizer.clone();
    let stats_clone = stats.clone();
    let is_running_clone = is_running.clone();
    
    // Create audio stream
    let stream = device.build_input_stream(
        &config,
        move |data: &[f32], _: &_| {
            if !*is_running_clone.lock().unwrap() {
                return;
            }
            
            // Convert f32 to i16
            let samples: Vec<i16> = data.iter()
                .map(|&s| (s * 32767.0) as i16)
                .collect();
            
            // Process with Vosk
            let mut rec = recognizer_clone.lock().unwrap();
            let mut stats = stats_clone.lock().unwrap();
            
            stats.chunks_processed += 1;
            
            // Calculate audio level (RMS)
            let sum_squares: f32 = data.iter().map(|x| x * x).sum();
            let rms = (sum_squares / data.len() as f32).sqrt();
            let level = (rms * 100.0).min(100.0);
            stats.audio_level_sum += level;
            
            // Process audio with Vosk
            use vosk::DecodingState;
            match rec.accept_waveform(&samples) {
                Ok(DecodingState::Finalized) => {
                    // Final result
                    let result = rec.result();
                    if let Some(single_result) = result.single() {
                        let text = single_result.text;
                        if !text.is_empty() {
                            let words: Vec<&str> = text.split_whitespace().collect();
                            stats.total_words += words.len();
                            stats.final_results += 1;
                            
                            println!("\n✅ FINAL: {}", text);
                            println!("   [Words: {}, Total: {}]", words.len(), stats.total_words);
                        }
                    }
                }
                Ok(DecodingState::Running) => {
                    // Partial result
                    let partial = rec.partial_result();
                    if !partial.partial.is_empty() {
                        stats.partial_results += 1;
                        print!("\r⏳ PARTIAL: {:<60}", partial.partial);
                        use std::io::{self, Write};
                        io::stdout().flush().unwrap();
                    }
                }
                Ok(DecodingState::Failed) => {
                    eprintln!("Vosk decoding failed");
                }
                Err(e) => {
                    eprintln!("Error processing audio: {:?}", e);
                }
            }
            
            // Show audio level periodically
            if stats.chunks_processed % 20 == 0 {  // Every second at 16kHz
                let avg_level = stats.audio_level_sum / 20.0;
                stats.audio_level_sum = 0.0;
                let bar_len = (avg_level / 5.0) as usize;
                let bar = "█".repeat(bar_len);
                println!("\n📊 Audio Level: [{:<20}] {:.1}%", bar, avg_level);
            }
        },
        move |err| {
            eprintln!("❌ Audio stream error: {}", err);
        },
        None
    ).expect("Failed to create audio stream");
    
    stream.play().expect("Failed to start audio stream");
    
    // Record for 30 seconds
    let start_time = Instant::now();
    println!("\n{}", "=".repeat(60));
    println!("🎙️ RECORDING - Speak clearly into your microphone");
    println!("Recording for 30 seconds...");
    println!("{}\n", "=".repeat(60));
    
    std::thread::sleep(Duration::from_secs(30));
    
    // Stop recording
    println!("\n🛑 Stopping recording...");
    *is_running.lock().unwrap() = false;
    drop(stream);
    
    // Get final result
    let mut rec = recognizer.lock().unwrap();
    let final_result = rec.final_result();
    if let Some(single_result) = final_result.single() {
        let text = single_result.text;
        if !text.is_empty() {
            println!("\n📝 Final buffered text: {}", text);
        }
    }
    
    // Show statistics
    let duration = start_time.elapsed().as_secs_f32();
    let stats = stats.lock().unwrap();
    
    println!("\n{}", "=".repeat(60));
    println!("📊 TRANSCRIPTION STATISTICS");
    println!("{}", "=".repeat(60));
    println!("Duration: {:.1} seconds", duration);
    println!("Total chunks processed: {}", stats.chunks_processed);
    println!("Partial results: {}", stats.partial_results);
    println!("Final results: {}", stats.final_results);
    println!("Total words transcribed: {}", stats.total_words);
    println!("Words per minute: {:.1}", (stats.total_words as f32 / duration * 60.0));
    println!("Processing rate: {:.1} chunks/sec", stats.chunks_processed as f32 / duration);
    println!("{}\n", "=".repeat(60));
    
    println!("✅ Test complete!");
}

#[derive(Default)]
struct Stats {
    chunks_processed: usize,
    partial_results: usize,
    final_results: usize,
    total_words: usize,
    audio_level_sum: f32,
}

fn get_dir_size(path: &str) -> u64 {
    let mut size = 0;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    size += metadata.len();
                } else if metadata.is_dir() {
                    size += get_dir_size(&entry.path().to_string_lossy());
                }
            }
        }
    }
    size
}