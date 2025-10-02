#!/usr/bin/env python3
"""
Enhanced Audio Capture for VoiceCoach
Supports dual-channel audio capture for user/prospect separation with optimized <50ms latency
"""

import sounddevice as sd
import numpy as np
import threading
import queue
import time
import logging
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass
from collections import deque

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("EnhancedAudioCapture")

@dataclass
class AudioDevice:
    """Audio device information"""
    index: int
    name: str
    channels: int
    sample_rate: float
    is_input: bool
    is_default: bool

@dataclass
class AudioMetrics:
    """Real-time audio metrics for monitoring"""
    timestamp: float
    user_level: float
    prospect_level: float
    latency_ms: float
    sample_rate: int
    buffer_health: float
    
class EnhancedAudioCapture:
    """
    Enhanced audio capture with dual-channel support for VoiceCoach
    Optimized for <50ms capture latency with real-time monitoring
    """
    
    def __init__(self, 
                 sample_rate: int = 16000,
                 chunk_size: int = 256,  # Smaller chunks for lower latency
                 channels: int = 2,      # Dual-channel by default
                 buffer_size: int = 4,   # Buffer size in chunks
                 target_latency_ms: float = 50.0):
        """
        Initialize enhanced audio capture
        
        Args:
            sample_rate: Audio sample rate in Hz
            chunk_size: Size of audio chunks (smaller = lower latency)
            channels: Number of audio channels (1=mono, 2=stereo/dual)
            buffer_size: Number of chunks to buffer (affects latency)
            target_latency_ms: Target capture latency in milliseconds
        """
        
        self.sample_rate = sample_rate
        self.chunk_size = chunk_size
        self.channels = channels
        self.buffer_size = buffer_size
        self.target_latency_ms = target_latency_ms
        
        # Calculate theoretical latency
        self.theoretical_latency_ms = (chunk_size / sample_rate) * 1000
        logger.info(f"Theoretical latency: {self.theoretical_latency_ms:.1f}ms (target: {target_latency_ms}ms)")
        
        # Audio streams and queues
        self.audio_queue = queue.Queue(maxsize=buffer_size)
        self.running = False
        self.stream = None
        
        # Performance monitoring
        self.latency_history = deque(maxlen=100)
        self.level_history_user = deque(maxlen=50)
        self.level_history_prospect = deque(maxlen=50)
        self.dropped_frames = 0
        self.total_frames = 0
        self.start_time = None
        
        # Audio level detection
        self.rms_smoothing = 0.9  # Smoothing factor for RMS calculation
        self.current_user_level = 0.0
        self.current_prospect_level = 0.0
        
        # Device management
        self.available_devices = []
        self.selected_device = None
        self._enumerate_devices()
        
        logger.info(f"Enhanced audio capture initialized - {channels} channels, {chunk_size} samples/chunk")

    def _enumerate_devices(self) -> None:
        """Enumerate available audio input devices"""
        
        try:
            devices = sd.query_devices()
            self.available_devices = []
            
            logger.info("Available audio devices:")
            
            for i, device in enumerate(devices):
                if device['max_input_channels'] > 0:  # Input device
                    audio_device = AudioDevice(
                        index=i,
                        name=device['name'],
                        channels=device['max_input_channels'],
                        sample_rate=device['default_samplerate'],
                        is_input=True,
                        is_default=(i == sd.default.device[0])
                    )
                    self.available_devices.append(audio_device)
                    
                    status = " [DEFAULT]" if audio_device.is_default else ""
                    logger.info(f"  {i}: {device['name']} ({audio_device.channels} ch){status}")
                    
        except Exception as e:
            logger.error(f"Error enumerating devices: {e}")
            self.available_devices = []

    def select_device(self, device_index: Optional[int] = None, device_name: Optional[str] = None) -> bool:
        """
        Select audio input device
        
        Args:
            device_index: Device index to select
            device_name: Device name to search for
            
        Returns:
            True if device selected successfully
        """
        
        try:
            if device_index is not None:
                # Select by index
                if 0 <= device_index < len(self.available_devices):
                    self.selected_device = self.available_devices[device_index]
                    logger.info(f"Selected device {device_index}: {self.selected_device.name}")
                    return True
                else:
                    logger.error(f"Invalid device index: {device_index}")
                    return False
                    
            elif device_name is not None:
                # Select by name (partial match)
                for device in self.available_devices:
                    if device_name.lower() in device.name.lower():
                        self.selected_device = device
                        logger.info(f"Selected device: {device.name}")
                        return True
                        
                logger.error(f"Device not found: {device_name}")
                return False
                
            else:
                # Select default device
                for device in self.available_devices:
                    if device.is_default:
                        self.selected_device = device
                        logger.info(f"Selected default device: {device.name}")
                        return True
                        
                # If no default found, use first available
                if self.available_devices:
                    self.selected_device = self.available_devices[0]
                    logger.info(f"Selected first available device: {self.selected_device.name}")
                    return True
                    
                logger.error("No audio input devices available")
                return False
                
        except Exception as e:
            logger.error(f"Error selecting device: {e}")
            return False

    def _audio_callback(self, indata: np.ndarray, frames: int, time_info, status) -> None:
        """
        Optimized audio callback for low-latency capture
        
        Args:
            indata: Input audio data
            frames: Number of frames
            time_info: Timing information
            status: Stream status
        """
        
        callback_start_time = time.time()
        
        if status:
            logger.warning(f"Audio callback status: {status}")
            
        try:
            # Convert to float32 if needed
            if indata.dtype != np.float32:
                indata = indata.astype(np.float32)
            
            # Calculate audio levels for monitoring
            if self.channels == 2 and indata.shape[1] == 2:
                # Dual-channel audio
                user_rms = np.sqrt(np.mean(indata[:, 0] ** 2))
                prospect_rms = np.sqrt(np.mean(indata[:, 1] ** 2))
                
                # Smooth the levels
                self.current_user_level = (self.rms_smoothing * self.current_user_level + 
                                         (1 - self.rms_smoothing) * user_rms)
                self.current_prospect_level = (self.rms_smoothing * self.current_prospect_level + 
                                             (1 - self.rms_smoothing) * prospect_rms)
                
                self.level_history_user.append(self.current_user_level)
                self.level_history_prospect.append(self.current_prospect_level)
                
            else:
                # Single-channel audio
                rms = np.sqrt(np.mean(indata.flatten() ** 2))
                self.current_user_level = (self.rms_smoothing * self.current_user_level + 
                                         (1 - self.rms_smoothing) * rms)
                self.level_history_user.append(self.current_user_level)
            
            # Calculate callback latency
            callback_latency_ms = (time.time() - callback_start_time) * 1000
            self.latency_history.append(callback_latency_ms)
            
            # Try to put audio data in queue (non-blocking)
            try:
                self.audio_queue.put_nowait(indata.copy())
                self.total_frames += 1
            except queue.Full:
                # Queue is full, drop oldest data
                try:
                    self.audio_queue.get_nowait()  # Remove oldest
                    self.audio_queue.put_nowait(indata.copy())  # Add new
                    self.dropped_frames += 1
                except queue.Empty:
                    pass
                    
        except Exception as e:
            logger.error(f"Error in audio callback: {e}")

    def start(self) -> bool:
        """
        Start enhanced audio capture
        
        Returns:
            True if started successfully
        """
        
        try:
            if self.running:
                logger.warning("Audio capture already running")
                return True
                
            # Select device if not already selected
            if not self.selected_device:
                if not self.select_device():
                    logger.error("No audio device available")
                    return False
            
            logger.info(f"Starting audio capture with device: {self.selected_device.name}")
            logger.info(f"Configuration: {self.sample_rate}Hz, {self.channels} channels, {self.chunk_size} samples/chunk")
            
            self.running = True
            self.start_time = time.time()
            self.dropped_frames = 0
            self.total_frames = 0
            
            # Create audio stream with optimal settings
            self.stream = sd.InputStream(
                device=self.selected_device.index,
                samplerate=self.sample_rate,
                blocksize=self.chunk_size,
                channels=self.channels,
                dtype=np.float32,
                callback=self._audio_callback,
                latency='low'  # Request low latency
            )
            
            # Start the stream
            self.stream.start()
            
            logger.info("Enhanced audio capture started successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start audio capture: {e}")
            self.running = False
            return False

    def stop(self) -> None:
        """Stop audio capture"""
        
        try:
            if not self.running:
                logger.info("Audio capture not running")
                return
                
            logger.info("Stopping audio capture...")
            self.running = False
            
            if self.stream:
                self.stream.stop()
                self.stream.close()
                self.stream = None
                
            # Log final statistics
            if self.total_frames > 0:
                drop_rate = (self.dropped_frames / self.total_frames) * 100
                uptime = time.time() - self.start_time if self.start_time else 0
                
                logger.info(f"Audio capture stopped - Uptime: {uptime:.1f}s")
                logger.info(f"Frame statistics: {self.total_frames} total, {self.dropped_frames} dropped ({drop_rate:.1f}%)")
                
                if self.latency_history:
                    avg_latency = np.mean(list(self.latency_history))
                    max_latency = np.max(list(self.latency_history))
                    logger.info(f"Latency: avg {avg_latency:.2f}ms, max {max_latency:.2f}ms")
                
        except Exception as e:
            logger.error(f"Error stopping audio capture: {e}")

    def get_audio(self, block: bool = True, timeout: Optional[float] = None) -> Optional[np.ndarray]:
        """
        Get audio data from capture queue
        
        Args:
            block: Whether to block until data available
            timeout: Timeout in seconds
            
        Returns:
            Audio data array or None if not available
        """
        
        try:
            return self.audio_queue.get(block=block, timeout=timeout)
        except queue.Empty:
            return None
        except Exception as e:
            logger.error(f"Error getting audio: {e}")
            return None

    def get_audio_levels(self) -> Tuple[float, float]:
        """
        Get current audio levels for user and prospect channels
        
        Returns:
            Tuple of (user_level, prospect_level) as RMS values 0.0-1.0
        """
        
        # Convert RMS to percentage (0-100) and clamp
        user_level = min(100.0, self.current_user_level * 100)
        prospect_level = min(100.0, self.current_prospect_level * 100)
        
        return user_level, prospect_level

    def get_metrics(self) -> AudioMetrics:
        """Get comprehensive audio capture metrics"""
        
        user_level, prospect_level = self.get_audio_levels()
        
        # Calculate buffer health (how full is the queue)
        buffer_health = (self.audio_queue.qsize() / self.buffer_size) * 100
        
        # Calculate average latency
        avg_latency = np.mean(list(self.latency_history)) if self.latency_history else 0.0
        
        return AudioMetrics(
            timestamp=time.time(),
            user_level=user_level,
            prospect_level=prospect_level,
            latency_ms=avg_latency,
            sample_rate=self.sample_rate,
            buffer_health=buffer_health
        )

    def get_performance_stats(self) -> Dict:
        """Get detailed performance statistics"""
        
        if not self.start_time:
            return {}
            
        uptime = time.time() - self.start_time
        drop_rate = (self.dropped_frames / max(1, self.total_frames)) * 100
        
        latencies = list(self.latency_history)
        
        return {
            "uptime_seconds": uptime,
            "total_frames": self.total_frames,
            "dropped_frames": self.dropped_frames,
            "drop_rate_percent": drop_rate,
            "average_latency_ms": np.mean(latencies) if latencies else 0.0,
            "max_latency_ms": np.max(latencies) if latencies else 0.0,
            "min_latency_ms": np.min(latencies) if latencies else 0.0,
            "target_latency_ms": self.target_latency_ms,
            "latency_target_met": np.mean(latencies) <= self.target_latency_ms if latencies else False,
            "buffer_size": self.buffer_size,
            "queue_size": self.audio_queue.qsize(),
            "sample_rate": self.sample_rate,
            "channels": self.channels,
            "chunk_size": self.chunk_size
        }

    def list_devices(self) -> List[AudioDevice]:
        """Get list of available audio devices"""
        return self.available_devices.copy()

# Test and demonstration
if __name__ == "__main__":
    """Test enhanced audio capture with dual-channel support"""
    
    try:
        print("🎙️ Enhanced Audio Capture Test")
        print("=" * 50)
        
        # Initialize capture
        capture = EnhancedAudioCapture(
            sample_rate=16000,
            chunk_size=256,  # Low latency
            channels=2,      # Dual-channel
            target_latency_ms=50.0
        )
        
        # List available devices
        devices = capture.list_devices()
        print(f"\n📱 Available Audio Devices ({len(devices)}):")
        for i, device in enumerate(devices):
            status = " [DEFAULT]" if device.is_default else ""
            print(f"  {i}: {device.name} ({device.channels} ch){status}")
        
        # Start capture
        if not capture.start():
            print("❌ Failed to start audio capture")
            exit(1)
            
        print(f"\n🎯 Target latency: {capture.target_latency_ms}ms")
        print("🔊 Monitoring audio levels and latency...")
        print("📊 Press Ctrl+C to stop and see final statistics\n")
        
        try:
            frame_count = 0
            last_report_time = time.time()
            
            while True:
                # Get audio data
                audio_data = capture.get_audio(block=True, timeout=1.0)
                
                if audio_data is not None:
                    frame_count += 1
                    
                    # Report every 2 seconds
                    if time.time() - last_report_time >= 2.0:
                        metrics = capture.get_metrics()
                        
                        # Format audio levels with visual indicators
                        user_bar = "█" * int(metrics.user_level / 5) + "░" * (20 - int(metrics.user_level / 5))
                        prospect_bar = "█" * int(metrics.prospect_level / 5) + "░" * (20 - int(metrics.prospect_level / 5))
                        
                        latency_status = "✅" if metrics.latency_ms <= capture.target_latency_ms else "⚠️"
                        
                        print(f"{latency_status} User:     [{user_bar}] {metrics.user_level:5.1f}%")
                        print(f"   Prospect: [{prospect_bar}] {metrics.prospect_level:5.1f}%")
                        print(f"   Latency: {metrics.latency_ms:.2f}ms | Buffer: {metrics.buffer_health:.0f}%")
                        print(f"   Frames: {frame_count} | Time: {time.time() - capture.start_time:.1f}s\n")
                        
                        last_report_time = time.time()
                        
        except KeyboardInterrupt:
            print("\n🛑 Stopping audio capture...")
            
        finally:
            capture.stop()
            
            # Final performance report
            stats = capture.get_performance_stats()
            
            print("\n📊 Final Performance Report:")
            print("=" * 50)
            print(f"⏱️  Uptime: {stats.get('uptime_seconds', 0):.1f} seconds")
            print(f"📦 Total frames: {stats.get('total_frames', 0)}")
            print(f"❌ Dropped frames: {stats.get('dropped_frames', 0)} ({stats.get('drop_rate_percent', 0):.2f}%)")
            print(f"⚡ Average latency: {stats.get('average_latency_ms', 0):.2f}ms")
            print(f"📈 Max latency: {stats.get('max_latency_ms', 0):.2f}ms")
            print(f"🎯 Target met: {'✅ Yes' if stats.get('latency_target_met', False) else '❌ No'}")
            
    except Exception as e:
        print(f"❌ Critical error: {e}")
        import traceback
        traceback.print_exc()