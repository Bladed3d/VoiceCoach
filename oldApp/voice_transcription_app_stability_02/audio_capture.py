import sounddevice as sd
import numpy as np
import threading
import queue
from ai_breadcrumb_system import AIBreadcrumbTrail, AILEDRanges, get_ai_trail

class MicrophoneCapture:
    """
    Class to handle real-time microphone audio capture.
    """
    def __init__(self, sample_rate=16000, chunk_size=1024, channels=1):
        """
        Initialize the microphone capture.
        
        Args:
            sample_rate (int): Sample rate in Hz
            chunk_size (int): Number of frames per buffer
            channels (int): Number of audio channels (1 for mono, 2 for stereo)
        """
        # Initialize AI breadcrumb trail for audio capture
        self.trail = get_ai_trail("AudioCapture")
        self.trail.light(AILEDRanges.AUDIO_CAPTURE_START, "audio_capture_init", 
                        {'sample_rate': sample_rate, 'chunk_size': chunk_size, 'channels': channels})
        
        self.sample_rate = sample_rate
        self.chunk_size = chunk_size
        self.channels = channels
        self.audio_queue = queue.Queue()
        self.running = False
        self.stream = None
        self.thread = None
    
    def callback(self, indata, frames, time, status):
        """
        Callback function for the audio stream.
        
        Args:
            indata: Input audio data
            frames: Number of frames
            time: Time info
            status: Status flag
        """
        if status:
            self.trail.light(AILEDRanges.AUDIO_CAPTURE_CHUNK + 1, "audio_status_warning", {'status': str(status)})
            print(f"Status: {status}")
        
        # Track audio chunk processing
        chunk_data = {
            'frames': frames,
            'shape': indata.shape,
            'dtype': str(indata.dtype),
            'max_amplitude': float(np.max(np.abs(indata))) if indata.size > 0 else 0
        }
        
        self.trail.light(AILEDRanges.AUDIO_CAPTURE_CHUNK, "audio_chunk_received", chunk_data)
        
        # Convert to float32 if not already
        if indata.dtype != np.float32:
            indata = indata.astype(np.float32)
        
        # Put the audio data in the queue
        self.audio_queue.put(indata.copy())
        self.trail.light(AILEDRanges.AUDIO_CAPTURE_QUEUE, "audio_queued", 
                        {'queue_size': self.audio_queue.qsize()})
    
    def start(self):
        """
        Start capturing audio from the microphone.
        """
        if self.running:
            print("Microphone capture is already running.")
            return
        
        self.running = True
        
        # Start the audio stream
        self.stream = sd.InputStream(
            samplerate=self.sample_rate,
            blocksize=self.chunk_size,
            channels=self.channels,
            dtype=np.float32,
            callback=self.callback
        )
        self.stream.start()
        print("Microphone capture started.")
    
    def stop(self):
        """
        Stop capturing audio from the microphone.
        """
        if not self.running:
            print("Microphone capture is not running.")
            return
        
        self.running = False
        
        # Stop the audio stream
        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None
        
        print("Microphone capture stopped.")
    
    def get_audio(self, block=True, timeout=None):
        """
        Get audio data from the queue.
        
        Args:
            block (bool): Whether to block until data is available
            timeout (float): Timeout in seconds
            
        Returns:
            numpy.ndarray: Audio data or None if queue is empty and block is False
        """
        try:
            return self.audio_queue.get(block=block, timeout=timeout)
        except queue.Empty:
            return None

# Test the microphone capture
if __name__ == "__main__":
    import time
    
    # Create a microphone capture instance
    mic = MicrophoneCapture()
    
    # Start capturing
    mic.start()
    
    print("Recording for 5 seconds...")
    
    # Record for 5 seconds
    start_time = time.time()
    while time.time() - start_time < 5:
        audio_data = mic.get_audio(block=True, timeout=0.1)
        if audio_data is not None:
            print(f"Received audio chunk: shape={audio_data.shape}, max={np.max(audio_data)}, min={np.min(audio_data)}")
    
    # Stop capturing
    mic.stop()
    
    print("Recording stopped.")
