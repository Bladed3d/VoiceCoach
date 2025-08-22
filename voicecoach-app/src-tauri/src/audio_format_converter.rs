// Audio Format Converter for VoiceCoach - Task 1.4
// Converts CPAL audio format (48kHz stereo f32) to Vosk requirements (16kHz mono i16)

use anyhow::{Result, anyhow};
use log::{info, warn, debug};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

// LED Breadcrumb System
use crate::breadcrumb_system::BreadcrumbTrail;
use crate::{led_light, led_fail};

/// Audio format converter configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConverterConfig {
    pub input_sample_rate: u32,   // Source sample rate (48000 Hz)
    pub output_sample_rate: u32,  // Target sample rate (16000 Hz)
    pub input_channels: u16,      // Source channels (2 for stereo)
    pub output_channels: u16,     // Target channels (1 for mono)
    pub chunk_size: usize,        // Processing chunk size (320 samples = 20ms at 16kHz)
    pub enable_anti_aliasing: bool, // Enable anti-aliasing filter
}

impl Default for ConverterConfig {
    fn default() -> Self {
        Self {
            input_sample_rate: 48000,  // CPAL default
            output_sample_rate: 16000, // Vosk requirement
            input_channels: 2,         // Stereo input
            output_channels: 1,        // Mono output
            chunk_size: 320,           // 20ms at 16kHz for optimal Vosk performance
            enable_anti_aliasing: true,
        }
    }
}

/// Ring buffer for continuous audio stream processing
pub struct AudioRingBuffer {
    buffer: VecDeque<f32>,
    capacity: usize,
    trail: BreadcrumbTrail,
}

impl AudioRingBuffer {
    pub fn new(capacity: usize) -> Self {
        let trail = BreadcrumbTrail::new("AudioRingBuffer");
        led_light!(trail, 7050, serde_json::json!({
            "component": "audio_ring_buffer",
            "operation": "new",
            "capacity": capacity,
            "buffer_duration_ms": (capacity as f32 / 48000.0 * 1000.0) as u32
        }));
        
        Self {
            buffer: VecDeque::with_capacity(capacity),
            capacity,
            trail,
        }
    }
    
    pub fn push_samples(&mut self, samples: &[f32]) -> usize {
        let original_len = self.buffer.len();
        let samples_added = samples.len().min(self.capacity - self.buffer.len());
        
        // Add new samples
        for &sample in &samples[..samples_added] {
            self.buffer.push_back(sample);
        }
        
        // Remove old samples if buffer is full
        let overflow = self.buffer.len().saturating_sub(self.capacity);
        for _ in 0..overflow {
            self.buffer.pop_front();
        }
        
        led_light!(self.trail, 7051, serde_json::json!({
            "operation": "push_samples",
            "samples_added": samples_added,
            "buffer_utilization": (self.buffer.len() as f32 / self.capacity as f32) * 100.0,
            "overflow_samples": overflow
        }));
        
        samples_added
    }
    
    pub fn get_samples(&mut self, count: usize) -> Vec<f32> {
        let available = self.buffer.len().min(count);
        let mut result = Vec::with_capacity(available);
        
        for _ in 0..available {
            if let Some(sample) = self.buffer.pop_front() {
                result.push(sample);
            }
        }
        
        led_light!(self.trail, 7052, serde_json::json!({
            "operation": "get_samples",
            "requested": count,
            "returned": result.len(),
            "remaining_samples": self.buffer.len()
        }));
        
        result
    }
    
    pub fn available_samples(&self) -> usize {
        self.buffer.len()
    }
    
    pub fn is_full(&self) -> bool {
        self.buffer.len() >= self.capacity
    }
}

/// Main audio format converter for CPAL → Vosk pipeline
pub struct AudioFormatConverter {
    config: ConverterConfig,
    ring_buffer: AudioRingBuffer,
    trail: BreadcrumbTrail,
    
    // Performance metrics
    total_input_samples: std::sync::atomic::AtomicU64,
    total_output_samples: std::sync::atomic::AtomicU64,
    conversion_latency_ms: std::sync::atomic::AtomicU64,
    dropped_samples: std::sync::atomic::AtomicU64,
    
    // Anti-aliasing filter state (simple moving average)
    filter_buffer: Vec<f32>,
    filter_size: usize,
}

impl AudioFormatConverter {
    pub fn new(config: ConverterConfig) -> Result<Self> {
        let trail = BreadcrumbTrail::new("AudioFormatConverter");
        led_light!(trail, 7053, serde_json::json!({
            "component": "audio_format_converter",
            "operation": "new",
            "config": {
                "input_sample_rate": config.input_sample_rate,
                "output_sample_rate": config.output_sample_rate,
                "input_channels": config.input_channels,
                "output_channels": config.output_channels,
                "chunk_size": config.chunk_size,
                "anti_aliasing": config.enable_anti_aliasing
            }
        }));
        
        // Validate configuration
        if config.input_sample_rate == 0 || config.output_sample_rate == 0 {
            led_fail!(trail, 7054, "Invalid sample rate configuration");
            return Err(anyhow!("Sample rates must be greater than 0"));
        }
        
        if config.input_channels == 0 || config.output_channels == 0 {
            led_fail!(trail, 7055, "Invalid channel configuration");
            return Err(anyhow!("Channel count must be greater than 0"));
        }
        
        // Calculate ring buffer capacity (1 second of input audio)
        let buffer_capacity = (config.input_sample_rate * config.input_channels as u32) as usize;
        let ring_buffer = AudioRingBuffer::new(buffer_capacity);
        
        // Anti-aliasing filter size (simple moving average)
        let filter_size = if config.enable_anti_aliasing {
            (config.input_sample_rate / config.output_sample_rate) as usize
        } else {
            1
        };
        
        led_light!(trail, 7056, serde_json::json!({
            "initialization": "complete",
            "buffer_capacity": buffer_capacity,
            "filter_size": filter_size,
            "conversion_ratio": config.input_sample_rate as f32 / config.output_sample_rate as f32
        }));
        
        Ok(Self {
            config,
            ring_buffer,
            trail,
            total_input_samples: std::sync::atomic::AtomicU64::new(0),
            total_output_samples: std::sync::atomic::AtomicU64::new(0),
            conversion_latency_ms: std::sync::atomic::AtomicU64::new(0),
            dropped_samples: std::sync::atomic::AtomicU64::new(0),
            filter_buffer: Vec::with_capacity(filter_size),
            filter_size,
        })
    }
    
    /// Convert f32 samples to i16 PCM format
    pub fn f32_to_i16(&self, input: &[f32]) -> Vec<i16> {
        led_light!(self.trail, 7057, serde_json::json!({
            "operation": "f32_to_i16",
            "input_samples": input.len(),
            "input_bytes": input.len() * std::mem::size_of::<f32>(),
            "output_bytes": input.len() * std::mem::size_of::<i16>()
        }));
        
        let mut clipped_samples = 0;
        let result: Vec<i16> = input.iter().map(|&sample| {
            // Clamp to valid f32 range [-1.0, 1.0]
            let clamped = if sample > 1.0 {
                clipped_samples += 1;
                1.0
            } else if sample < -1.0 {
                clipped_samples += 1;
                -1.0
            } else {
                sample
            };
            
            // Convert to i16 range
            (clamped * i16::MAX as f32) as i16
        }).collect();
        
        if clipped_samples > 0 {
            led_light!(self.trail, 7058, serde_json::json!({
                "clipping_detected": true,
                "clipped_samples": clipped_samples,
                "clipping_percentage": (clipped_samples as f32 / input.len() as f32) * 100.0
            }));
        }
        
        result
    }
    
    /// Downsample from 48kHz to 16kHz (3:1 ratio) with anti-aliasing
    pub fn downsample_48_to_16(&mut self, input: &[f32]) -> Vec<f32> {
        led_light!(self.trail, 7059, serde_json::json!({
            "operation": "downsample_48_to_16",
            "input_samples": input.len(),
            "expected_output": input.len() / 3,
            "anti_aliasing": self.config.enable_anti_aliasing
        }));
        
        if input.is_empty() {
            return Vec::new();
        }
        
        let downsample_ratio = self.config.input_sample_rate / self.config.output_sample_rate;
        if downsample_ratio != 3 {
            led_fail!(self.trail, 7060, format!("Unsupported downsample ratio: {}", downsample_ratio));
            warn!("Downsample ratio {} not supported, expected 3:1", downsample_ratio);
        }
        
        let mut result = Vec::with_capacity(input.len() / downsample_ratio as usize);
        
        if self.config.enable_anti_aliasing {
            // Apply simple moving average filter + decimation
            for chunk in input.chunks(downsample_ratio as usize) {
                let average = chunk.iter().sum::<f32>() / chunk.len() as f32;
                result.push(average);
            }
            
            led_light!(self.trail, 7061, serde_json::json!({
                "downsampling": "complete_with_anti_aliasing",
                "output_samples": result.len(),
                "filter_type": "moving_average"
            }));
        } else {
            // Simple decimation without filtering
            for i in (0..input.len()).step_by(downsample_ratio as usize) {
                result.push(input[i]);
            }
            
            led_light!(self.trail, 7062, serde_json::json!({
                "downsampling": "complete_simple_decimation",
                "output_samples": result.len()
            }));
        }
        
        result
    }
    
    /// Convert stereo to mono by mixing left and right channels
    pub fn stereo_to_mono(&self, input: &[f32]) -> Vec<f32> {
        led_light!(self.trail, 7063, serde_json::json!({
            "operation": "stereo_to_mono",
            "input_samples": input.len(),
            "expected_output": input.len() / 2
        }));
        
        if input.len() % 2 != 0 {
            led_fail!(self.trail, 7064, format!("Invalid stereo input length: {}", input.len()));
            warn!("Stereo input has odd number of samples: {}", input.len());
        }
        
        let mut result = Vec::with_capacity(input.len() / 2);
        
        // Mix left and right channels (L+R)/2
        for chunk in input.chunks_exact(2) {
            let left = chunk[0];
            let right = chunk[1];
            let mono = (left + right) * 0.5; // Average of both channels
            result.push(mono);
        }
        
        led_light!(self.trail, 7065, serde_json::json!({
            "stereo_to_mono": "complete",
            "output_samples": result.len(),
            "mixing_method": "average"
        }));
        
        result
    }
    
    /// Complete conversion pipeline: 48kHz stereo f32 → 16kHz mono i16
    pub fn convert_for_vosk(&mut self, input: &[f32]) -> Result<Vec<i16>> {
        let start_time = std::time::Instant::now();
        
        led_light!(self.trail, 7066, serde_json::json!({
            "operation": "convert_for_vosk",
            "input_samples": input.len(),
            "input_format": "48kHz_stereo_f32",
            "output_format": "16kHz_mono_i16"
        }));
        
        if input.is_empty() {
            return Ok(Vec::new());
        }
        
        // Step 1: Convert stereo to mono
        let mono_samples = if self.config.input_channels == 2 {
            self.stereo_to_mono(input)
        } else {
            input.to_vec() // Already mono
        };
        
        // Step 2: Downsample from 48kHz to 16kHz
        let downsampled = self.downsample_48_to_16(&mono_samples);
        
        // Step 3: Convert f32 to i16
        let i16_samples = self.f32_to_i16(&downsampled);
        
        // Update performance metrics
        self.total_input_samples.fetch_add(input.len() as u64, std::sync::atomic::Ordering::Relaxed);
        self.total_output_samples.fetch_add(i16_samples.len() as u64, std::sync::atomic::Ordering::Relaxed);
        
        let latency = start_time.elapsed().as_millis() as u64;
        self.conversion_latency_ms.store(latency, std::sync::atomic::Ordering::Relaxed);
        
        led_light!(self.trail, 7067, serde_json::json!({
            "conversion_complete": true,
            "input_samples": input.len(),
            "output_samples": i16_samples.len(),
            "latency_ms": latency,
            "conversion_ratio": input.len() as f32 / i16_samples.len() as f32,
            "pipeline_steps": ["stereo_to_mono", "downsample_48_to_16", "f32_to_i16"]
        }));
        
        Ok(i16_samples)
    }
    
    /// Process audio in chunks optimized for Vosk (320 samples = 20ms at 16kHz)
    pub fn process_chunk(&mut self, input: &[f32]) -> Result<Vec<Vec<i16>>> {
        led_light!(self.trail, 7068, serde_json::json!({
            "operation": "process_chunk",
            "input_samples": input.len(),
            "target_chunk_size": self.config.chunk_size
        }));
        
        // Add to ring buffer
        let samples_added = self.ring_buffer.push_samples(input);
        if samples_added < input.len() {
            let dropped = input.len() - samples_added;
            self.dropped_samples.fetch_add(dropped as u64, std::sync::atomic::Ordering::Relaxed);
            led_light!(self.trail, 7069, serde_json::json!({
                "buffer_overflow": true,
                "dropped_samples": dropped,
                "total_dropped": self.dropped_samples.load(std::sync::atomic::Ordering::Relaxed)
            }));
        }
        
        let mut output_chunks = Vec::new();
        
        // Process chunks while we have enough data
        // We need chunk_size * 3 input samples to produce chunk_size output samples (3:1 downsampling)
        let required_input_samples = self.config.chunk_size * 3 * self.config.input_channels as usize;
        
        while self.ring_buffer.available_samples() >= required_input_samples {
            let input_chunk = self.ring_buffer.get_samples(required_input_samples);
            
            match self.convert_for_vosk(&input_chunk) {
                Ok(output_chunk) => {
                    output_chunks.push(output_chunk);
                    
                    led_light!(self.trail, 7070, serde_json::json!({
                        "chunk_processed": true,
                        "chunk_index": output_chunks.len() - 1,
                        "input_size": input_chunk.len(),
                        "output_size": output_chunks.last().unwrap().len()
                    }));
                }
                Err(e) => {
                    led_fail!(self.trail, 7071, format!("Chunk conversion failed: {}", e));
                    return Err(e);
                }
            }
        }
        
        Ok(output_chunks)
    }
    
    /// Get conversion performance metrics
    pub fn get_metrics(&self) -> serde_json::Value {
        led_light!(self.trail, 7072, serde_json::json!({
            "operation": "get_metrics"
        }));
        
        let total_input = self.total_input_samples.load(std::sync::atomic::Ordering::Relaxed);
        let total_output = self.total_output_samples.load(std::sync::atomic::Ordering::Relaxed);
        let dropped = self.dropped_samples.load(std::sync::atomic::Ordering::Relaxed);
        let latency = self.conversion_latency_ms.load(std::sync::atomic::Ordering::Relaxed);
        
        serde_json::json!({
            "performance": {
                "total_input_samples": total_input,
                "total_output_samples": total_output,
                "dropped_samples": dropped,
                "last_conversion_latency_ms": latency,
                "sample_efficiency": if total_input > 0 { 
                    (total_output as f64 / total_input as f64) * 100.0 
                } else { 0.0 },
                "drop_rate_percent": if total_input > 0 { 
                    (dropped as f64 / total_input as f64) * 100.0 
                } else { 0.0 }
            },
            "configuration": {
                "input_format": format!("{}Hz_{}ch_f32", self.config.input_sample_rate, self.config.input_channels),
                "output_format": format!("{}Hz_{}ch_i16", self.config.output_sample_rate, self.config.output_channels),
                "chunk_size": self.config.chunk_size,
                "anti_aliasing": self.config.enable_anti_aliasing
            },
            "buffer_status": {
                "available_samples": self.ring_buffer.available_samples(),
                "buffer_full": self.ring_buffer.is_full(),
                "buffer_utilization_percent": (self.ring_buffer.available_samples() as f32 / self.ring_buffer.capacity as f32) * 100.0
            }
        })
    }
    
    /// Reset performance metrics
    pub fn reset_metrics(&self) {
        led_light!(self.trail, 7073, serde_json::json!({
            "operation": "reset_metrics"
        }));
        
        self.total_input_samples.store(0, std::sync::atomic::Ordering::Relaxed);
        self.total_output_samples.store(0, std::sync::atomic::Ordering::Relaxed);
        self.dropped_samples.store(0, std::sync::atomic::Ordering::Relaxed);
        self.conversion_latency_ms.store(0, std::sync::atomic::Ordering::Relaxed);
    }
}

/// Benchmark the audio format converter performance
pub fn benchmark_converter() -> Result<serde_json::Value> {
    let trail = BreadcrumbTrail::new("ConverterBenchmark");
    led_light!(trail, 7074, serde_json::json!({
        "benchmark": "audio_format_converter",
        "status": "starting"
    }));
    
    let config = ConverterConfig::default();
    let mut converter = AudioFormatConverter::new(config)?;
    
    // Generate test audio: 1 second of 48kHz stereo f32 sine wave
    let duration_secs = 1.0;
    let sample_rate = 48000;
    let frequency = 440.0; // A4 note
    let samples_per_channel = (duration_secs * sample_rate as f32) as usize;
    
    let mut test_audio = Vec::with_capacity(samples_per_channel * 2);
    for i in 0..samples_per_channel {
        let t = i as f32 / sample_rate as f32;
        let sample = (2.0 * std::f32::consts::PI * frequency * t).sin() * 0.5;
        test_audio.push(sample); // Left channel
        test_audio.push(sample * 0.7); // Right channel (slightly different)
    }
    
    led_light!(trail, 7075, serde_json::json!({
        "test_audio_generated": true,
        "duration_secs": duration_secs,
        "input_samples": test_audio.len(),
        "frequency_hz": frequency
    }));
    
    // Benchmark conversion
    let start_time = std::time::Instant::now();
    let converted = converter.convert_for_vosk(&test_audio)?;
    let conversion_time = start_time.elapsed();
    
    // Calculate expected output size
    let expected_mono_samples = samples_per_channel; // Stereo to mono
    let expected_downsampled = expected_mono_samples / 3; // 48kHz to 16kHz
    
    let benchmark_results = serde_json::json!({
        "benchmark_results": {
            "input_samples": test_audio.len(),
            "output_samples": converted.len(),
            "expected_output": expected_downsampled,
            "conversion_time_ms": conversion_time.as_millis(),
            "samples_per_ms": test_audio.len() as f64 / conversion_time.as_millis() as f64,
            "real_time_factor": (duration_secs * 1000.0) / conversion_time.as_millis() as f32,
            "memory_efficiency": std::mem::size_of_val(&converted[..]) as f64 / std::mem::size_of_val(&test_audio[..]) as f64
        },
        "quality_metrics": {
            "conversion_ratio_actual": test_audio.len() as f32 / converted.len() as f32,
            "conversion_ratio_expected": 6.0, // 2 channels * 3 sample rate ratio
            "output_format_correct": converted.len() == expected_downsampled
        },
        "performance_rating": if conversion_time.as_millis() < 10 { "EXCELLENT" } 
                             else if conversion_time.as_millis() < 50 { "GOOD" }
                             else if conversion_time.as_millis() < 100 { "ACCEPTABLE" }
                             else { "NEEDS_OPTIMIZATION" }
    });
    
    led_light!(trail, 7076, serde_json::json!({
        "benchmark_complete": true,
        "performance_rating": benchmark_results["performance_rating"],
        "conversion_time_ms": conversion_time.as_millis()
    }));
    
    info!("Audio format converter benchmark completed in {}ms", conversion_time.as_millis());
    Ok(benchmark_results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_converter_creation() {
        let config = ConverterConfig::default();
        let converter = AudioFormatConverter::new(config);
        assert!(converter.is_ok());
    }

    #[test]
    fn test_f32_to_i16_conversion() {
        let config = ConverterConfig::default();
        let converter = AudioFormatConverter::new(config).unwrap();
        
        let input = vec![0.0, 0.5, -0.5, 1.0, -1.0];
        let output = converter.f32_to_i16(&input);
        
        assert_eq!(output.len(), input.len());
        assert_eq!(output[0], 0);
        assert_eq!(output[3], i16::MAX);
        assert_eq!(output[4], i16::MIN);
    }

    #[test]
    fn test_stereo_to_mono() {
        let config = ConverterConfig::default();
        let converter = AudioFormatConverter::new(config).unwrap();
        
        let input = vec![1.0, 0.0, 0.5, 0.5]; // 2 stereo samples
        let output = converter.stereo_to_mono(&input);
        
        assert_eq!(output.len(), 2);
        assert_eq!(output[0], 0.5); // (1.0 + 0.0) / 2
        assert_eq!(output[1], 0.5); // (0.5 + 0.5) / 2
    }

    #[test]
    fn test_downsample_48_to_16() {
        let config = ConverterConfig::default();
        let mut converter = AudioFormatConverter::new(config).unwrap();
        
        let input = vec![1.0; 48]; // 48 samples representing 1ms at 48kHz
        let output = converter.downsample_48_to_16(&input);
        
        assert_eq!(output.len(), 16); // Should be 16 samples at 16kHz
    }
}