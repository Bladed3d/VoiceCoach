#!/usr/bin/env python3
"""
Enhanced Transcription Pipeline for VoiceCoach
Optimized Faster-Whisper distil-large-v3 with dual-channel support and <500ms latency target
"""

import numpy as np
import threading
import queue
import time
import torch
import re
import traceback
import logging
from typing import Tuple, Optional, Dict, List
from dataclasses import dataclass
from audio_capture import MicrophoneCapture
from faster_whisper import WhisperModel, BatchedInferencePipeline
import librosa
from scipy import signal as scipy_signal
from collections import deque

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("EnhancedTranscriptionPipeline")

@dataclass
class TranscriptionResult:
    """Enhanced transcription result with speaker identification and metadata"""
    text: str
    confidence: float
    latency_ms: float
    timestamp: int
    is_user: bool
    speaker_id: Optional[str] = None
    audio_channel: int = 0  # 0 = user, 1 = prospect
    vad_confidence: float = 0.0
    word_count: int = 0
    audio_quality: float = 0.0

@dataclass
class AudioSegment:
    """Audio segment with metadata for processing"""
    data: np.ndarray
    timestamp: float
    channel: int  # 0 = user, 1 = prospect  
    sample_rate: int
    rms_level: float
    is_speech: bool

class DualChannelProcessor:
    """Processes dual-channel audio for user/prospect separation"""
    
    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate
        self.user_levels = deque(maxlen=50)  # Rolling window for level tracking
        self.prospect_levels = deque(maxlen=50)
        
        # Speaker identification parameters
        self.channel_dominance_threshold = 0.7  # Threshold for channel dominance
        self.cross_correlation_window = 1024
        
    def separate_channels(self, stereo_audio: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Separate stereo audio into user and prospect channels
        
        Args:
            stereo_audio: Stereo audio data [samples, 2]
            
        Returns:
            Tuple of (user_audio, prospect_audio)
        """
        if stereo_audio.ndim == 1:
            # Mono audio - duplicate to both channels
            return stereo_audio, stereo_audio
            
        if stereo_audio.shape[1] != 2:
            # Multi-channel audio - take first two channels
            stereo_audio = stereo_audio[:, :2]
            
        left_channel = stereo_audio[:, 0]
        right_channel = stereo_audio[:, 1]
        
        # Calculate RMS levels for channel activity detection
        left_rms = np.sqrt(np.mean(left_channel ** 2))
        right_rms = np.sqrt(np.mean(right_channel ** 2))
        
        self.user_levels.append(left_rms)
        self.prospect_levels.append(right_rms)
        
        # Enhanced channel separation using spectral analysis
        user_audio = self._enhance_channel(left_channel, right_channel, is_primary=True)
        prospect_audio = self._enhance_channel(right_channel, left_channel, is_primary=True)
        
        return user_audio, prospect_audio
    
    def _enhance_channel(self, primary: np.ndarray, secondary: np.ndarray, is_primary: bool = True) -> np.ndarray:
        """
        Enhance channel separation using adaptive filtering
        
        Args:
            primary: Primary channel audio
            secondary: Secondary channel audio  
            is_primary: Whether this is the primary speaker channel
            
        Returns:
            Enhanced audio for the primary speaker
        """
        # Calculate cross-correlation to detect bleed-through
        if len(primary) >= self.cross_correlation_window and len(secondary) >= self.cross_correlation_window:
            correlation = np.corrcoef(
                primary[:self.cross_correlation_window], 
                secondary[:self.cross_correlation_window]
            )[0, 1]
            
            # If high correlation, apply noise reduction
            if abs(correlation) > 0.3:
                # Simple spectral subtraction for bleed-through reduction
                primary_fft = np.fft.fft(primary)
                secondary_fft = np.fft.fft(secondary)
                
                # Reduce secondary channel frequencies from primary
                reduction_factor = min(0.3, abs(correlation))
                enhanced_fft = primary_fft - (reduction_factor * secondary_fft)
                
                enhanced_audio = np.real(np.fft.ifft(enhanced_fft))
                return enhanced_audio.astype(np.float32)
        
        return primary.astype(np.float32)
    
    def identify_active_speaker(self, user_audio: np.ndarray, prospect_audio: np.ndarray) -> int:
        """
        Identify which channel has the active speaker
        
        Args:
            user_audio: User channel audio
            prospect_audio: Prospect channel audio
            
        Returns:
            0 for user, 1 for prospect
        """
        user_rms = np.sqrt(np.mean(user_audio ** 2))
        prospect_rms = np.sqrt(np.mean(prospect_audio ** 2))
        
        # Use recent level history for more stable detection
        avg_user_level = np.mean(list(self.user_levels)) if self.user_levels else 0
        avg_prospect_level = np.mean(list(self.prospect_levels)) if self.prospect_levels else 0
        
        # Weighted decision based on current and historical levels
        current_weight = 0.7
        historical_weight = 0.3
        
        user_score = (current_weight * user_rms) + (historical_weight * avg_user_level)
        prospect_score = (current_weight * prospect_rms) + (historical_weight * avg_prospect_level)
        
        # Return dominant speaker with confidence threshold
        if user_score > prospect_score * self.channel_dominance_threshold:
            return 0  # User
        elif prospect_score > user_score * self.channel_dominance_threshold:
            return 1  # Prospect
        else:
            # Return speaker with higher current activity
            return 0 if user_rms > prospect_rms else 1

class EnhancedTranscriptionPipeline:
    """
    Enhanced real-time transcription pipeline with dual-channel support
    Optimized for <500ms latency with Faster-Whisper distil-large-v3
    """
    
    def __init__(self, 
                 model_name: str = "distil-large-v3",
                 language: str = "en", 
                 sample_rate: int = 16000,
                 beam_size: int = 5,
                 use_gpu: bool = True,
                 batch_size: int = 8,
                 vad_threshold: float = 0.6,
                 latency_target_ms: float = 500.0,
                 enable_batching: bool = True,
                 dual_channel: bool = True):
        """
        Initialize enhanced transcription pipeline
        
        Args:
            model_name: Whisper model name 
            language: Language code
            sample_rate: Audio sample rate
            beam_size: Beam size for decoding
            use_gpu: Use GPU acceleration
            batch_size: Batch size for batched inference
            vad_threshold: Voice activity detection threshold
            latency_target_ms: Target latency in milliseconds  
            enable_batching: Enable batched inference pipeline
            dual_channel: Enable dual-channel processing
        """
        
        # Initialize model with optimized settings
        self.device = "cuda" if torch.cuda.is_available() and use_gpu else "cpu"
        self.compute_type = "float16" if self.device == "cuda" else "float32"
        
        logger.info(f"Initializing Enhanced Transcription Pipeline")
        logger.info(f"Target latency: {latency_target_ms}ms")
        logger.info(f"Device: {self.device}, Compute type: {self.compute_type}")
        
        # Load model with optimized configuration
        model_map = {
            "distil-large-v3": "distil-whisper/distil-large-v3-ct2",
            "distil-large-v3.5": "distil-whisper/distil-large-v3.5-ct2",
            "large-v3": "large-v3",
            "medium": "medium",
            "small": "small"
        }
        
        model_path = model_map.get(model_name, "distil-whisper/distil-large-v3-ct2")
        
        try:
            logger.info(f"Loading model: {model_path}")
            self.base_model = WhisperModel(
                model_path, 
                device=self.device, 
                compute_type=self.compute_type,
                cpu_threads=4 if self.device == "cpu" else None
            )
            
            # Initialize batched pipeline for higher throughput
            if enable_batching:
                logger.info("Initializing batched inference pipeline")
                self.model = BatchedInferencePipeline(
                    model=self.base_model,
                    use_cuda=self.device == "cuda"
                )
                self.batch_size = batch_size
            else:
                self.model = self.base_model
                self.batch_size = 1
                
            logger.info("Model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            # Fallback to smaller model
            logger.info("Loading fallback model: small")
            self.base_model = WhisperModel("small", device=self.device, compute_type=self.compute_type)
            self.model = self.base_model
            self.batch_size = 1
        
        # Configuration
        self.model_name = model_name
        self.language = language
        self.sample_rate = sample_rate
        self.beam_size = beam_size
        self.vad_threshold = vad_threshold
        self.latency_target_ms = latency_target_ms
        self.dual_channel = dual_channel
        self.enable_batching = enable_batching
        
        # Audio processing
        self.dual_processor = DualChannelProcessor(sample_rate) if dual_channel else None
        self.audio_queue = queue.Queue(maxsize=10)  # Prevent memory buildup
        self.result_queue = queue.Queue()
        
        # Threading
        self.running = False
        self.transcription_thread = None
        self.mic = None
        
        # Performance optimization
        self.chunk_duration_ms = 1000  # 1 second chunks for optimal latency
        self.samples_per_chunk = int(self.sample_rate * self.chunk_duration_ms / 1000)
        self.overlap_duration_ms = 200  # Overlap to prevent word cutting
        self.overlap_samples = int(self.sample_rate * self.overlap_duration_ms / 1000)
        
        # Buffers for dual-channel processing
        self.user_buffer = np.array([], dtype=np.float32)
        self.prospect_buffer = np.array([], dtype=np.float32)
        self.last_transcription_time = 0
        
        # Performance tracking
        self.latency_history = deque(maxlen=100)
        self.transcription_count = 0
        self.start_time = None
        
        # VAD parameters optimized for low latency
        self.vad_params = {
            "threshold": vad_threshold,
            "min_speech_duration_ms": 250,  # Reduced for faster response
            "min_silence_duration_ms": 300   # Reduced for faster chunking
        }
        
        logger.info(f"Enhanced pipeline initialized - Chunk duration: {self.chunk_duration_ms}ms")

    def start(self) -> None:
        """Start the enhanced transcription pipeline"""
        try:
            if self.running:
                logger.warning("Pipeline already running")
                return
                
            logger.info("Starting enhanced transcription pipeline...")
            self.running = True
            self.start_time = time.time()
            
            # Initialize microphone capture with dual-channel support
            self.mic = MicrophoneCapture(
                sample_rate=self.sample_rate,
                channels=2 if self.dual_channel else 1,
                chunk_size=self.samples_per_chunk // 4  # Smaller chunks for lower latency
            )
            self.mic.start()
            
            # Start transcription thread
            self.transcription_thread = threading.Thread(target=self._transcription_loop, daemon=True)
            self.transcription_thread.start()
            
            logger.info("Enhanced transcription pipeline started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start pipeline: {e}")
            self.running = False
            raise

    def stop(self) -> None:
        """Stop the transcription pipeline"""
        try:
            if not self.running:
                return
                
            logger.info("Stopping enhanced transcription pipeline...")
            self.running = False
            
            if self.mic:
                self.mic.stop()
                
            if self.transcription_thread:
                self.transcription_thread.join(timeout=2.0)
                
            logger.info("Enhanced transcription pipeline stopped")
            
        except Exception as e:
            logger.error(f"Error stopping pipeline: {e}")

    def _transcription_loop(self) -> None:
        """Enhanced transcription loop with dual-channel processing"""
        logger.info("Starting enhanced transcription loop")
        
        try:
            while self.running:
                try:
                    # Get audio data with timeout for responsiveness
                    audio_data = self.mic.get_audio(block=True, timeout=0.1)
                    
                    if audio_data is not None:
                        transcription_start_time = time.time()
                        
                        if self.dual_channel and audio_data.ndim == 2:
                            # Process dual-channel audio
                            self._process_dual_channel(audio_data, transcription_start_time)
                        else:
                            # Process single-channel audio
                            self._process_single_channel(audio_data, transcription_start_time)
                            
                except queue.Empty:
                    continue
                except Exception as e:
                    logger.error(f"Error in transcription loop: {e}")
                    time.sleep(0.1)
                    
        except Exception as e:
            logger.critical(f"Critical error in transcription loop: {e}")
        finally:
            logger.info("Transcription loop ended")

    def _process_dual_channel(self, audio_data: np.ndarray, start_time: float) -> None:
        """Process dual-channel audio for user/prospect separation"""
        
        # Separate channels
        user_audio, prospect_audio = self.dual_processor.separate_channels(audio_data)
        
        # Add to buffers
        self.user_buffer = np.append(self.user_buffer, user_audio)
        self.prospect_buffer = np.append(self.prospect_buffer, prospect_audio)
        
        # Check if we have enough audio for transcription
        if len(self.user_buffer) >= self.samples_per_chunk or len(self.prospect_buffer) >= self.samples_per_chunk:
            
            # Determine active speaker
            active_channel = self.dual_processor.identify_active_speaker(user_audio, prospect_audio)
            
            if active_channel == 0 and len(self.user_buffer) >= self.samples_per_chunk:
                # Process user channel
                chunk = self.user_buffer[:self.samples_per_chunk]
                self.user_buffer = self.user_buffer[self.samples_per_chunk - self.overlap_samples:]
                self._transcribe_chunk(chunk, start_time, is_user=True, channel=0)
                
            elif active_channel == 1 and len(self.prospect_buffer) >= self.samples_per_chunk:
                # Process prospect channel  
                chunk = self.prospect_buffer[:self.samples_per_chunk]
                self.prospect_buffer = self.prospect_buffer[self.samples_per_chunk - self.overlap_samples:]
                self._transcribe_chunk(chunk, start_time, is_user=False, channel=1)

    def _process_single_channel(self, audio_data: np.ndarray, start_time: float) -> None:
        """Process single-channel audio"""
        
        # Flatten if multi-dimensional
        if audio_data.ndim > 1:
            audio_data = audio_data.flatten()
            
        self.user_buffer = np.append(self.user_buffer, audio_data)
        
        # Check if we have enough audio for transcription
        if len(self.user_buffer) >= self.samples_per_chunk:
            chunk = self.user_buffer[:self.samples_per_chunk]
            self.user_buffer = self.user_buffer[self.samples_per_chunk - self.overlap_samples:]
            self._transcribe_chunk(chunk, start_time, is_user=True, channel=0)

    def _transcribe_chunk(self, audio_chunk: np.ndarray, start_time: float, is_user: bool, channel: int) -> None:
        """Transcribe audio chunk with performance optimization"""
        
        try:
            # Normalize audio
            if np.max(np.abs(audio_chunk)) > 0:
                audio_chunk = audio_chunk / np.max(np.abs(audio_chunk))
            
            # Quick silence detection
            rms = np.sqrt(np.mean(audio_chunk ** 2))
            if rms < 0.01:  # Very quiet audio
                return
                
            # Transcribe with optimized parameters for speed
            if self.enable_batching and hasattr(self.model, 'transcribe'):
                # Batched inference
                segments, info = self.model.transcribe(
                    audio_chunk,
                    language=self.language,
                    beam_size=self.beam_size,
                    batch_size=self.batch_size,
                    vad_filter=True,
                    vad_parameters=self.vad_params,
                    word_timestamps=False,  # Disabled for speed
                    condition_on_previous_text=False  # Disabled for independence
                )
            else:
                # Standard inference
                segments, info = self.base_model.transcribe(
                    audio_chunk,
                    language=self.language,
                    beam_size=self.beam_size,
                    vad_filter=True,
                    vad_parameters=self.vad_params,
                    word_timestamps=False,
                    condition_on_previous_text=False
                )
            
            # Process results
            segments_list = list(segments)
            
            if segments_list:
                # Calculate latency
                latency_ms = (time.time() - start_time) * 1000
                self.latency_history.append(latency_ms)
                self.transcription_count += 1
                
                # Combine text from all segments
                text = " ".join([segment.text.strip() for segment in segments_list])
                text = text.strip()
                
                if text and len(text) > 0:
                    # Calculate confidence
                    avg_confidence = sum(segment.avg_logprob for segment in segments_list) / len(segments_list)
                    confidence = max(0.0, min(1.0, 1.0 + avg_confidence))  # Convert logprob to 0-1 scale
                    
                    # Calculate audio quality metrics
                    audio_quality = min(1.0, rms * 10)  # Simple quality metric
                    
                    # Create enhanced result
                    result = TranscriptionResult(
                        text=text,
                        confidence=confidence,
                        latency_ms=latency_ms,
                        timestamp=int(time.time() * 1000),
                        is_user=is_user,
                        speaker_id="user" if is_user else "prospect",
                        audio_channel=channel,
                        vad_confidence=min(1.0, rms * 5),  # VAD confidence based on audio level
                        word_count=len(text.split()),
                        audio_quality=audio_quality
                    )
                    
                    # Add to result queue
                    try:
                        self.result_queue.put_nowait(result)
                        
                        # Log performance
                        if latency_ms <= self.latency_target_ms:
                            logger.debug(f"✅ Transcription: '{text}' | Latency: {latency_ms:.1f}ms | Speaker: {'User' if is_user else 'Prospect'}")
                        else:
                            logger.warning(f"⚠️ Transcription: '{text}' | Latency: {latency_ms:.1f}ms (Target: {self.latency_target_ms}ms)")
                            
                    except queue.Full:
                        logger.warning("Result queue full, dropping transcription")
                        
        except Exception as e:
            logger.error(f"Error transcribing chunk: {e}")

    def get_transcription(self, block: bool = False, timeout: Optional[float] = None) -> Tuple[Optional[TranscriptionResult], Optional[float]]:
        """
        Get enhanced transcription result
        
        Args:
            block: Whether to block until result available
            timeout: Timeout in seconds
            
        Returns:
            Tuple of (TranscriptionResult, latency_ms) or (None, None)
        """
        try:
            result = self.result_queue.get(block=block, timeout=timeout)
            return result, result.latency_ms
        except queue.Empty:
            return None, None
        except Exception as e:
            logger.error(f"Error getting transcription: {e}")
            return None, None

    def get_performance_metrics(self) -> Dict:
        """Get performance metrics for monitoring"""
        
        if not self.latency_history:
            return {
                "average_latency_ms": 0.0,
                "max_latency_ms": 0.0,
                "min_latency_ms": 0.0,
                "transcriptions_completed": 0,
                "target_latency_ms": self.latency_target_ms,
                "target_met_percentage": 0.0,
                "uptime_seconds": 0.0
            }
        
        latencies = list(self.latency_history)
        target_met = sum(1 for lat in latencies if lat <= self.latency_target_ms)
        
        uptime = time.time() - self.start_time if self.start_time else 0.0
        
        return {
            "average_latency_ms": np.mean(latencies),
            "max_latency_ms": np.max(latencies),
            "min_latency_ms": np.min(latencies),
            "transcriptions_completed": self.transcription_count,
            "target_latency_ms": self.latency_target_ms,
            "target_met_percentage": (target_met / len(latencies)) * 100,
            "uptime_seconds": uptime,
            "throughput_per_second": self.transcription_count / uptime if uptime > 0 else 0.0
        }

if __name__ == "__main__":
    """Test the enhanced transcription pipeline"""
    
    try:
        # Initialize enhanced pipeline
        pipeline = EnhancedTranscriptionPipeline(
            model_name="distil-large-v3",
            language="en",
            beam_size=5,
            use_gpu=True,
            batch_size=8,
            vad_threshold=0.6,
            latency_target_ms=500.0,
            enable_batching=True,
            dual_channel=True
        )
        
        pipeline.start()
        
        print("🎙️ Enhanced VoiceCoach Transcription Pipeline Started")
        print("💡 Speak into microphone for dual-channel transcription")
        print("🎯 Target latency: 500ms")
        print("⚡ Press Ctrl+C to stop and see performance metrics")
        
        try:
            transcription_count = 0
            
            while True:
                result, latency = pipeline.get_transcription(block=True, timeout=1.0)
                
                if result:
                    transcription_count += 1
                    speaker = "👤 User" if result.is_user else "👥 Prospect"
                    status = "✅" if result.latency_ms <= 500 else "⚠️"
                    
                    print(f"{status} {speaker}: {result.text}")
                    print(f"   📊 Latency: {result.latency_ms:.1f}ms | Confidence: {result.confidence:.2f} | Quality: {result.audio_quality:.2f}")
                    
                    # Show performance every 10 transcriptions
                    if transcription_count % 10 == 0:
                        metrics = pipeline.get_performance_metrics()
                        print(f"\n📈 Performance Metrics (last {transcription_count} transcriptions):")
                        print(f"   ⚡ Avg Latency: {metrics['average_latency_ms']:.1f}ms")
                        print(f"   🎯 Target Met: {metrics['target_met_percentage']:.1f}%")
                        print(f"   🔄 Throughput: {metrics['throughput_per_second']:.1f} transcriptions/sec\n")
                
        except KeyboardInterrupt:
            print("\n🛑 Stopping transcription pipeline...")
            
        finally:
            pipeline.stop()
            
            # Final performance report
            final_metrics = pipeline.get_performance_metrics()
            print("\n📊 Final Performance Report:")
            print(f"   🎯 Target Latency: {final_metrics['target_latency_ms']}ms")
            print(f"   ⚡ Average Latency: {final_metrics['average_latency_ms']:.1f}ms")
            print(f"   📈 Target Met: {final_metrics['target_met_percentage']:.1f}%")
            print(f"   🔢 Total Transcriptions: {final_metrics['transcriptions_completed']}")
            print(f"   ⏱️ Uptime: {final_metrics['uptime_seconds']:.1f}s")
            print(f"   🔄 Throughput: {final_metrics['throughput_per_second']:.1f} transcriptions/sec")
            
    except Exception as e:
        print(f"❌ Critical error: {e}")
        traceback.print_exc()