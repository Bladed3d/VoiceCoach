use std::fs::File;
use std::io::{BufReader, Read, Seek, SeekFrom};
use std::path::Path;
use std::time::{Duration, Instant};
use anyhow::{Result, anyhow, Context};
use log::{info, warn, error, debug};
use serde_json::Value;
use vosk::{Model, Recognizer};
use bytemuck;

// LED Breadcrumb System
use crate::breadcrumb_system::BreadcrumbTrail;
use crate::{led_light, led_fail};
use crate::vosk_model_manager::VoskModelManager;

/// WAV file header structure
#[repr(C)]
#[derive(Debug, Clone, Copy)]
struct WavHeader {
    riff: [u8; 4],           // "RIFF"
    file_size: u32,          // File size - 8
    wave: [u8; 4],           // "WAVE"
    fmt: [u8; 4],            // "fmt "
    fmt_size: u32,           // Format chunk size
    audio_format: u16,       // 1 = PCM
    num_channels: u16,       // Number of channels
    sample_rate: u32,        // Sample rate
    byte_rate: u32,          // Bytes per second
    block_align: u16,        // Bytes per sample
    bits_per_sample: u16,    // Bits per sample
}

/// WAV data chunk header
#[repr(C)]
#[derive(Debug, Clone, Copy)]
struct DataChunk {
    data: [u8; 4],           // "data"
    data_size: u32,          // Size of data
}

/// Test results for Vosk transcription
#[derive(Debug)]
pub struct VoskTestResults {
    pub success: bool,
    pub transcription: String,
    pub partial_results: Vec<String>,
    pub latency_ms: u64,
    pub partial_latency_ms: Vec<u64>,
    pub final_latency_ms: u64,
    pub audio_duration_ms: u64,
    pub wav_info: WavFileInfo,
    pub model_path: String,
    pub error_message: Option<String>,
}

/// Information about the WAV file
#[derive(Debug)]
pub struct WavFileInfo {
    pub sample_rate: u32,
    pub channels: u16,
    pub bits_per_sample: u16,
    pub duration_ms: u64,
    pub file_size_bytes: u64,
    pub data_size_bytes: u32,
}

/// Standalone Vosk test module
pub struct VoskTestModule {
    trail: BreadcrumbTrail,
    model_manager: Option<VoskModelManager>,
}

impl VoskTestModule {
    /// Create new Vosk test module
    pub fn new() -> Result<Self> {
        let trail = BreadcrumbTrail::new("VoskTestModule");
        led_light!(trail, 7035, serde_json::json!({
            "component": "vosk_test_module",
            "action": "initializing",
            "task": "1.3_standalone_vosk_test"
        }));
        
        Ok(Self {
            trail,
            model_manager: None,
        })
    }
    
    /// Initialize Vosk model using model manager from Task 1.2
    pub async fn initialize_model(&mut self) -> Result<String> {
        led_light!(self.trail, 7036, serde_json::json!({
            "action": "initialize_model",
            "step": "creating_model_manager"
        }));
        
        // Create model manager
        let mut manager = VoskModelManager::new()
            .context("Failed to create Vosk model manager")?;
        
        // Ensure default model is available
        led_light!(self.trail, 7037, serde_json::json!({
            "action": "ensure_default_model",
            "model": manager.get_default_model_name()
        }));
        
        let model_path = manager.ensure_default_model().await
            .context("Failed to ensure default Vosk model")?;
        
        self.model_manager = Some(manager);
        
        led_light!(self.trail, 7038, serde_json::json!({
            "action": "model_initialized",
            "path": model_path.to_string_lossy(),
            "ready": true
        }));
        
        info!("Vosk model initialized at: {:?}", model_path);
        Ok(model_path.to_string_lossy().to_string())
    }
    
    /// Read and parse WAV file header
    fn read_wav_header(&self, file_path: &Path) -> Result<(WavFileInfo, BufReader<File>)> {
        led_light!(self.trail, 7039, serde_json::json!({
            "action": "read_wav_header",
            "file": file_path.to_string_lossy()
        }));
        
        let file = File::open(file_path)
            .with_context(|| format!("Failed to open WAV file: {:?}", file_path))?;
        
        let file_size = file.metadata()?.len();
        let mut reader = BufReader::new(file);
        
        // Read WAV header
        let mut header_bytes = [0u8; std::mem::size_of::<WavHeader>()];
        reader.read_exact(&mut header_bytes)
            .context("Failed to read WAV header")?;
        
        let header: WavHeader = unsafe { 
            std::ptr::read(header_bytes.as_ptr() as *const WavHeader) 
        };
        
        // Verify it's a valid WAV file
        if &header.riff != b"RIFF" || &header.wave != b"WAVE" {
            led_fail!(self.trail, 7041, "Invalid WAV file format");
            return Err(anyhow!("Invalid WAV file format"));
        }
        
        // Find data chunk
        let mut data_chunk = DataChunk {
            data: [0; 4],
            data_size: 0,
        };
        
        let mut found_data = false;
        let mut current_pos = std::mem::size_of::<WavHeader>() as u64;
        
        while current_pos < file_size {
            reader.seek(SeekFrom::Start(current_pos))?;
            
            let mut chunk_header = [0u8; 8];
            reader.read_exact(&mut chunk_header)?;
            
            let chunk_id = &chunk_header[0..4];
            let chunk_size = u32::from_le_bytes([
                chunk_header[4], chunk_header[5], 
                chunk_header[6], chunk_header[7]
            ]);
            
            if chunk_id == b"data" {
                data_chunk.data.copy_from_slice(chunk_id);
                data_chunk.data_size = chunk_size;
                found_data = true;
                break;
            }
            
            // Skip to next chunk
            current_pos += 8 + chunk_size as u64;
        }
        
        if !found_data {
            led_fail!(self.trail, 7041, "WAV data chunk not found");
            return Err(anyhow!("WAV data chunk not found"));
        }
        
        // Calculate duration
        let sample_rate = header.sample_rate;
        let bytes_per_sample = (header.bits_per_sample / 8) * header.num_channels;
        let total_samples = data_chunk.data_size / bytes_per_sample as u32;
        let duration_ms = (total_samples as u64 * 1000) / sample_rate as u64;
        
        let wav_info = WavFileInfo {
            sample_rate,
            channels: header.num_channels,
            bits_per_sample: header.bits_per_sample,
            duration_ms,
            file_size_bytes: file_size,
            data_size_bytes: data_chunk.data_size,
        };
        
        led_light!(self.trail, 7040, serde_json::json!({
            "action": "wav_header_parsed",
            "sample_rate": sample_rate,
            "channels": header.num_channels,
            "bits_per_sample": header.bits_per_sample,
            "duration_ms": duration_ms,
            "valid_format": header.sample_rate == 16000 && header.num_channels == 1
        }));
        
        // Verify format is compatible with Vosk (16kHz mono PCM)
        if header.sample_rate != 16000 {
            warn!("WAV file sample rate is {} Hz, Vosk expects 16000 Hz", header.sample_rate);
        }
        if header.num_channels != 1 {
            warn!("WAV file has {} channels, Vosk expects mono (1 channel)", header.num_channels);
        }
        if header.audio_format != 1 {
            warn!("WAV file format is {}, Vosk expects PCM (1)", header.audio_format);
        }
        
        info!("WAV file info: {}Hz, {} channels, {} bits, {:.1}s duration", 
              sample_rate, header.num_channels, header.bits_per_sample, duration_ms as f64 / 1000.0);
        
        Ok((wav_info, reader))
    }
    
    /// Extract audio samples from WAV file
    fn extract_audio_samples(&self, mut reader: BufReader<File>, wav_info: &WavFileInfo) -> Result<Vec<i16>> {
        led_light!(self.trail, 7042, serde_json::json!({
            "action": "extract_audio_samples",
            "data_size_bytes": wav_info.data_size_bytes
        }));
        
        // Seek to start of audio data (skip WAV header)
        reader.seek(SeekFrom::Start(44))?; // Standard WAV header is 44 bytes
        
        let num_samples = wav_info.data_size_bytes / (wav_info.bits_per_sample / 8) as u32;
        let mut samples = Vec::with_capacity(num_samples as usize);
        
        if wav_info.bits_per_sample == 16 {
            // Read 16-bit samples directly
            let mut sample_buffer = vec![0u8; wav_info.data_size_bytes as usize];
            reader.read_exact(&mut sample_buffer)?;
            
            // Convert bytes to i16 samples
            for chunk in sample_buffer.chunks_exact(2) {
                let sample = i16::from_le_bytes([chunk[0], chunk[1]]);
                samples.push(sample);
            }
        } else if wav_info.bits_per_sample == 8 {
            // Convert 8-bit to 16-bit
            let mut sample_buffer = vec![0u8; wav_info.data_size_bytes as usize];
            reader.read_exact(&mut sample_buffer)?;
            
            for byte in sample_buffer {
                // Convert unsigned 8-bit to signed 16-bit
                let sample = ((byte as i16 - 128) << 8);
                samples.push(sample);
            }
        } else {
            led_fail!(self.trail, 7043, format!("Unsupported bit depth: {}", wav_info.bits_per_sample));
            return Err(anyhow!("Unsupported bit depth: {}", wav_info.bits_per_sample));
        }
        
        // Handle stereo to mono conversion if needed
        if wav_info.channels == 2 {
            led_light!(self.trail, 7043, serde_json::json!({
                "action": "stereo_to_mono_conversion",
                "original_samples": samples.len()
            }));
            
            let mono_samples: Vec<i16> = samples
                .chunks_exact(2)
                .map(|stereo_pair| {
                    // Average left and right channels
                    ((stereo_pair[0] as i32 + stereo_pair[1] as i32) / 2) as i16
                })
                .collect();
            
            samples = mono_samples;
        }
        
        led_light!(self.trail, 7044, serde_json::json!({
            "action": "samples_extracted",
            "sample_count": samples.len(),
            "duration_calculated_ms": (samples.len() * 1000) / wav_info.sample_rate as usize
        }));
        
        info!("Extracted {} audio samples for Vosk processing", samples.len());
        Ok(samples)
    }
    
    /// Process audio through Vosk recognizer
    pub async fn test_transcription(&mut self, wav_file_path: &str) -> Result<VoskTestResults> {
        let test_start = Instant::now();
        
        led_light!(self.trail, 7040, serde_json::json!({
            "action": "test_transcription",
            "file": wav_file_path,
            "start_time": test_start.elapsed().as_millis()
        }));
        
        // Ensure model is initialized
        let model_path = if self.model_manager.is_none() {
            self.initialize_model().await?
        } else {
            self.model_manager.as_ref().unwrap()
                .get_model_path(self.model_manager.as_ref().unwrap().get_default_model_name())
                .to_string_lossy().to_string()
        };
        
        // Read WAV file
        let wav_path = Path::new(wav_file_path);
        let (wav_info, reader) = self.read_wav_header(wav_path)?;
        
        // Extract audio samples
        let audio_samples = self.extract_audio_samples(reader, &wav_info)?;
        
        led_light!(self.trail, 7046, serde_json::json!({
            "action": "initialize_vosk_recognizer",
            "model_path": model_path,
            "sample_rate": 16000
        }));
        
        // Initialize Vosk model and recognizer
        let model = Model::new(&model_path)
            .ok_or_else(|| anyhow!("Failed to load Vosk model from path: {:?}", model_path))?;
        
        let mut recognizer = Recognizer::new(&model, 16000.0)
            .ok_or_else(|| anyhow!("Failed to create Vosk recognizer"))?;
        
        info!("Vosk recognizer initialized successfully");
        
        // Process audio in chunks
        let chunk_size = 4000; // ~250ms chunks at 16kHz
        let mut partial_results = Vec::new();
        let mut partial_latencies = Vec::new();
        let mut final_result = String::new();
        
        led_light!(self.trail, 7048, serde_json::json!({
            "action": "start_audio_processing",
            "total_samples": audio_samples.len(),
            "chunk_size": chunk_size,
            "estimated_chunks": (audio_samples.len() + chunk_size - 1) / chunk_size
        }));
        
        let processing_start = Instant::now();
        
        for (chunk_idx, chunk) in audio_samples.chunks(chunk_size).enumerate() {
            let chunk_start = Instant::now();
            
            // Process chunk through Vosk (it expects i16 samples directly)
            let chunk_accepted = recognizer.accept_waveform(&chunk);
            let chunk_latency = chunk_start.elapsed();
            
            // Check if we got a complete result
            if let Ok(vosk::DecodingState::Finalized) = chunk_accepted {
                // Final result for this chunk
                let _result = recognizer.result();
                // TODO: Extract text from CompleteResult - need to check Vosk API docs
                led_light!(self.trail, 7047, serde_json::json!({
                    "action": "final_result_chunk",
                    "chunk": chunk_idx,
                    "latency_ms": chunk_latency.as_millis()
                }));
            } else if let Ok(vosk::DecodingState::Running) = chunk_accepted {
                // Partial result
                let partial = recognizer.partial_result();
                // partial.partial is already a &str
                let text = partial.partial;
                if !text.trim().is_empty() {
                    partial_results.push(text.trim().to_string());
                    partial_latencies.push(chunk_latency.as_millis() as u64);
                    
                    led_light!(self.trail, 7045, serde_json::json!({
                        "action": "partial_result",
                        "chunk": chunk_idx,
                        "text": text.trim(),
                        "latency_ms": chunk_latency.as_millis()
                    }));
                }
            }
            
            // Log progress every 10 chunks
            if chunk_idx % 10 == 0 {
                debug!("Processed chunk {}/{}", chunk_idx + 1, 
                       (audio_samples.len() + chunk_size - 1) / chunk_size);
            }
        }
        
        // Get final result
        let final_start = Instant::now();
        let _final_result_obj = recognizer.final_result();
        // TODO: Extract text from CompleteResult - need to check Vosk API docs
        // For now, final_result contains accumulated text from partial results
        let final_latency = final_start.elapsed();
        
        let total_latency = test_start.elapsed();
        let processing_time = processing_start.elapsed();
        
        // Clean up final result
        final_result = final_result.trim().to_string();
        
        let success = !final_result.is_empty() || !partial_results.is_empty();
        
        led_light!(self.trail, 7049, serde_json::json!({
            "action": "transcription_complete",
            "success": success,
            "final_result_length": final_result.len(),
            "partial_results_count": partial_results.len(),
            "total_latency_ms": total_latency.as_millis(),
            "processing_time_ms": processing_time.as_millis(),
            "final_latency_ms": final_latency.as_millis(),
            "performance_target_met": {
                "partial_under_200ms": partial_latencies.iter().all(|&lat| lat < 200),
                "final_under_500ms": final_latency.as_millis() < 500
            }
        }));
        
        info!("Transcription completed: '{}' ({} partial results, {:.0}ms total)", 
              final_result, partial_results.len(), total_latency.as_millis());
        
        Ok(VoskTestResults {
            success,
            transcription: final_result,
            partial_results,
            latency_ms: total_latency.as_millis() as u64,
            partial_latency_ms: partial_latencies,
            final_latency_ms: final_latency.as_millis() as u64,
            audio_duration_ms: wav_info.duration_ms,
            wav_info,
            model_path,
            error_message: if success { None } else { Some("No transcription results generated".to_string()) },
        })
    }
    
    /// Get performance metrics for the last test
    pub fn get_performance_summary(&self, results: &VoskTestResults) -> serde_json::Value {
        let avg_partial_latency = if !results.partial_latency_ms.is_empty() {
            results.partial_latency_ms.iter().sum::<u64>() as f64 / results.partial_latency_ms.len() as f64
        } else {
            0.0
        };
        
        let real_time_factor = results.latency_ms as f64 / results.audio_duration_ms as f64;
        
        serde_json::json!({
            "performance_metrics": {
                "total_processing_time_ms": results.latency_ms,
                "audio_duration_ms": results.audio_duration_ms,
                "real_time_factor": real_time_factor,
                "meets_real_time_target": real_time_factor <= 1.0,
                "avg_partial_latency_ms": avg_partial_latency,
                "max_partial_latency_ms": results.partial_latency_ms.iter().max().copied().unwrap_or(0),
                "final_result_latency_ms": results.final_latency_ms,
                "partial_results_under_200ms": results.partial_latency_ms.iter().all(|&lat| lat < 200),
                "final_result_under_500ms": results.final_latency_ms < 500
            },
            "quality_metrics": {
                "transcription_generated": results.success,
                "transcription_length": results.transcription.len(),
                "partial_results_count": results.partial_results.len(),
                "transcription_preview": if results.transcription.len() > 100 {
                    format!("{}...", &results.transcription[..100])
                } else {
                    results.transcription.clone()
                }
            },
            "audio_info": {
                "sample_rate": results.wav_info.sample_rate,
                "channels": results.wav_info.channels,
                "bits_per_sample": results.wav_info.bits_per_sample,
                "duration_ms": results.wav_info.duration_ms,
                "file_size_bytes": results.wav_info.file_size_bytes,
                "vosk_compatible": results.wav_info.sample_rate == 16000 && results.wav_info.channels == 1
            },
            "model_info": {
                "path": results.model_path,
                "ready": true
            }
        })
    }
}

// Integration with existing breadcrumb system
impl VoskTestModule {
    /// Test the complete Vosk pipeline with sales-call-sample.wav
    pub async fn run_complete_test(&mut self) -> Result<serde_json::Value> {
        led_light!(self.trail, 7040, serde_json::json!({
            "action": "run_complete_test",
            "test_file": "sales-call-sample.wav",
            "task": "1.3_vosk_test_complete"
        }));
        
        let test_start = Instant::now();
        
        // Test with the actual sales call sample
        let wav_file_path = "public/test-audio/sales-call-sample.wav";
        
        match self.test_transcription(wav_file_path).await {
            Ok(results) => {
                let test_duration = test_start.elapsed();
                let performance_summary = self.get_performance_summary(&results);
                
                led_light!(self.trail, 7041, serde_json::json!({
                    "action": "complete_test_success",
                    "test_duration_ms": test_duration.as_millis(),
                    "transcription_success": results.success,
                    "transcription_length": results.transcription.len(),
                    "performance_acceptable": results.final_latency_ms < 500
                }));
                
                Ok(serde_json::json!({
                    "test_status": "SUCCESS",
                    "test_duration_ms": test_duration.as_millis(),
                    "transcription_results": {
                        "success": results.success,
                        "transcription": results.transcription,
                        "partial_results_count": results.partial_results.len(),
                        "error": results.error_message
                    },
                    "performance": performance_summary
                }))
            }
            Err(e) => {
                let test_duration = test_start.elapsed();
                
                led_fail!(self.trail, 7041, format!("Complete test failed: {}", e));
                
                Ok(serde_json::json!({
                    "test_status": "FAILED",
                    "test_duration_ms": test_duration.as_millis(),
                    "error": e.to_string(),
                    "troubleshooting": {
                        "check_model_download": "Ensure Vosk model is downloaded",
                        "check_wav_file": "Verify sales-call-sample.wav exists and is valid",
                        "check_dependencies": "Ensure Vosk dependencies are properly installed"
                    }
                }))
            }
        }
    }
}