import numpy as np
import threading
import queue
import time
import torch
import re
import traceback
import logging
from audio_capture import MicrophoneCapture
from faster_whisper import WhisperModel
from huggingface_hub import hf_hub_download
from ai_breadcrumb_system import AIBreadcrumbTrail, AILEDRanges, get_ai_trail

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("TranscriptionPipeline")

class TranscriptionPipeline:
    """
    Real-time transcription pipeline using Faster-Whisper with Distil-Whisper models.
    """
    def __init__(self, model=None, device=None, model_name="distil-large-v3", language="en", sample_rate=16000, beam_size=5, 
                 use_gpu=True, remove_repetitions=True, vad_threshold=0.7, min_speech_duration_ms=300,
                 min_silence_duration_ms=500, confidence_threshold=0.6):
        """
        Initialize the transcription pipeline.
        
        Args:
            model (WhisperModel, optional): Preloaded WhisperModel instance
            device (str, optional): Device the model is loaded on ('cuda' or 'cpu')
            model_name (str): Model name ('tiny', 'base', 'small', 'medium', 'large', 'distil-large-v3')
            language (str): Language code (e.g., 'en' for English)
            sample_rate (int): Audio sample rate in Hz
            beam_size (int): Beam size for decoding (higher = more accurate but slower)
            use_gpu (bool): Whether to use GPU acceleration if available
            remove_repetitions (bool): Whether to apply post-processing to remove repetitions
            vad_threshold (float): Voice activity detection threshold (0.0-1.0, higher = stricter)
            min_speech_duration_ms (int): Minimum duration of speech to consider valid (milliseconds)
            min_silence_duration_ms (int): Minimum duration of silence to reset buffer (milliseconds)
            confidence_threshold (float): Minimum confidence score to accept transcription (0.0-1.0)
        """
        # Initialize AI breadcrumb trail for transcription pipeline
        self.trail = get_ai_trail("TranscriptionPipeline")
        self.trail.light(AILEDRanges.AI_MODEL_INIT, "pipeline_initialization", 
                        {'model_name': model_name, 'device': device, 'use_gpu': use_gpu})
        
        if model is not None and device is not None:
            self.trail.light(AILEDRanges.AI_MODEL_LOADED, "using_preloaded_model", 
                           {'device': device})
            self.model = model
            self.device = device
        else:
            self.device = "cuda" if torch.cuda.is_available() and use_gpu else "cpu"
            compute_type = "float16" if self.device == "cuda" else "float32"
            model_map = {
                "tiny": "tiny",
                "base": "base",
                "small": "small",
                "medium": "medium",
                "large": "large-v3",
                "large-v3": "large-v3",
                "distil-large-v3": "distil-whisper/distil-large-v3-ct2",
                "distil-large-v3.5": "distil-whisper/distil-large-v3.5-ct2"
            }
            try:
                if "distil" in model_name.lower():
                    logger.info(f"Loading Distil-Whisper model: {model_name} on {self.device}")
                    faster_whisper_model = model_map.get(model_name, "distil-whisper/distil-large-v3-ct2")
                    logger.info(f"Using model ID: {faster_whisper_model}")
                    self.model = WhisperModel(faster_whisper_model, device=self.device, compute_type=compute_type)
                else:
                    logger.info(f"Loading Faster-Whisper model: {model_name} on {self.device}")
                    faster_whisper_model = model_map.get(model_name, model_name)
                    self.model = WhisperModel(faster_whisper_model, device=self.device, compute_type=compute_type)
                
                if self.device == "cuda":
                    gpu_name = torch.cuda.get_device_name(0)
                    gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
                    logger.info(f"Using GPU: {gpu_name} with {gpu_memory:.2f} GB memory")
                
                logger.info(f"Model loaded successfully")
                
            except Exception as e:
                error_msg = f"Error loading model {model_name}: {str(e)}"
                logger.error(error_msg)
                logger.error(traceback.format_exc())
                
                try:
                    fallback_model = "distil-whisper/distil-large-v3-ct2"
                    logger.info(f"Attempting to load fallback model: {fallback_model}")
                    self.model = WhisperModel(fallback_model, device=self.device, compute_type=compute_type)
                    logger.info(f"Fallback model loaded successfully")
                except Exception as fallback_error:
                    logger.error(f"Fallback model failed: {str(fallback_error)}")
                    try:
                        small_fallback = "small"
                        logger.info(f"Attempting to load small fallback model: {small_fallback}")
                        self.model = WhisperModel(small_fallback, device=self.device, compute_type=compute_type)
                        logger.info(f"Small fallback model loaded successfully")
                    except Exception as small_error:
                        logger.error(f"Small fallback model failed: {str(small_error)}")
                        raise RuntimeError(f"Failed to load any model. Original error: {error_msg}")
        
        self.model_name = model_name
        self.language = language
        self.sample_rate = sample_rate
        self.beam_size = beam_size
        self.use_gpu = use_gpu
        self.remove_repetitions = remove_repetitions
        self.vad_threshold = vad_threshold
        self.min_speech_duration_ms = min_speech_duration_ms
        self.min_silence_duration_ms = min_silence_duration_ms
        self.confidence_threshold = confidence_threshold
        
        self.audio_queue = queue.Queue()
        self.result_queue = queue.Queue()
        self.running = False
        self.thread = None
        self.mic = None
        
        self.silence_start_time = None
        self.is_silence = True
        self.rms_threshold = 0.01
        
        self.phantom_words = {"thank you", "thanks", "yes", "yeah", "okay", "ok", "shit", "um", "uh"}

    def start(self):
        """
        Start the transcription pipeline.
        """
        try:
            if self.running:
                logger.info("Transcription pipeline is already running.")
                return
            
            self.running = True
            
            self.mic = MicrophoneCapture(sample_rate=self.sample_rate)
            self.mic.start()
            
            self.thread = threading.Thread(target=self._transcription_loop)
            self.thread.daemon = True
            self.thread.start()
            
            logger.info("Transcription pipeline started.")
        except Exception as e:
            self.running = False
            logger.error(f"Error starting transcription pipeline: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    def stop(self):
        """
        Stop the transcription pipeline.
        """
        try:
            if not self.running:
                logger.info("Transcription pipeline is not running.")
                return
            
            self.running = False
            
            if self.mic:
                self.mic.stop()
            
            if self.thread:
                self.thread.join(timeout=1.0)
            
            logger.info("Transcription pipeline stopped.")
        except Exception as e:
            logger.error(f"Error stopping transcription pipeline: {str(e)}")
            logger.error(traceback.format_exc())
    
    def _is_silence(self, audio_data, threshold=None):
        """
        Detect if audio segment is silence.
        
        Args:
            audio_data (numpy.ndarray): Audio data to check
            threshold (float): RMS threshold for silence detection (optional)
            
        Returns:
            bool: True if silence, False otherwise
        """
        if threshold is None:
            threshold = self.rms_threshold
            
        rms = np.sqrt(np.mean(np.square(audio_data)))
        return rms < threshold
    
    def _is_phantom_text(self, text):
        """
        Check if text is likely a phantom/hallucination.
        
        Args:
            text (str): Text to check
            
        Returns:
            bool: True if likely phantom, False otherwise
        """
        text = text.lower().strip()
        text = re.sub(r'[^\w\s]', '', text)
        
        if not text:
            return True
            
        if text in self.phantom_words:
            return True
            
        words = text.split()
        if len(words) <= 2 and any(word in self.phantom_words for word in words):
            return True
            
        return False
    
    def _transcription_loop(self):
        """
        Main transcription loop that processes audio chunks based on speech pauses.
        """
        try:
            audio_buffer = np.array([], dtype=np.float32)
            
            silence_duration_threshold = 0.5
            max_buffer_duration = 5.0
            max_buffer_samples = int(max_buffer_duration * self.sample_rate)
            
            is_silence = False
            silence_start_index = None
            
            while self.running:
                try:
                    audio_data = self.mic.get_audio(block=True, timeout=0.1)
                    
                    if audio_data is not None:
                        audio_data = audio_data.flatten() if audio_data.ndim > 1 else audio_data
                        
                        current_is_silence = self._is_silence(audio_data)
                        
                        if current_is_silence:
                            if not is_silence:
                                is_silence = True
                                silence_start_index = len(audio_buffer)
                        else:
                            is_silence = False
                            silence_start_index = None
                        
                        audio_buffer = np.append(audio_buffer, audio_data)
                        
                        if is_silence and silence_start_index is not None:
                            silence_samples = len(audio_buffer) - silence_start_index
                            silence_duration = silence_samples / self.sample_rate
                            
                            if silence_duration >= silence_duration_threshold:
                                if silence_start_index > 0:
                                    transcription_start_time = time.time()
                                    result, confidence = self._transcribe_audio(audio_buffer[:silence_start_index])
                                    latency = (time.time() - transcription_start_time) * 1000
                                    
                                    if result and confidence >= self.confidence_threshold and not self._is_phantom_text(result):
                                        self.result_queue.put((result, latency))
                                        logger.debug(f"Transcription: '{result}' (Confidence: {confidence:.2f}, Latency: {latency:.1f} ms)")
                                    else:
                                        logger.debug(f"Rejected transcription: '{result}' (Confidence: {confidence:.2f})")
                                
                                audio_buffer = np.array([], dtype=np.float32)
                                is_silence = False
                                silence_start_index = None
                        
                        if len(audio_buffer) > max_buffer_samples:
                            transcription_start_time = time.time()
                            result, confidence = self._transcribe_audio(audio_buffer)
                            latency = (time.time() - transcription_start_time) * 1000
                            
                            if result and confidence >= self.confidence_threshold and not self._is_phantom_text(result):
                                self.result_queue.put((result, latency))
                                logger.debug(f"Transcription: '{result}' (Confidence: {confidence:.2f}, Latency: {latency:.1f} ms)")
                            else:
                                logger.debug(f"Rejected transcription: '{result}' (Confidence: {confidence:.2f})")
                            
                            audio_buffer = np.array([], dtype=np.float32)
                            is_silence = False
                            silence_start_index = None
                    
                    time.sleep(0.01)
                except queue.Empty:
                    pass
                except Exception as e:
                    logger.error(f"Error in transcription loop: {str(e)}")
                    logger.error(traceback.format_exc())
                    time.sleep(0.5)
        except Exception as e:
            logger.critical(f"Critical error in transcription loop: {str(e)}")
            logger.critical(traceback.format_exc())
            self.running = False
    
    def _remove_repetitions(self, text):
        """
        Remove repetitions from transcribed text.
        
        Args:
            text (str): Original transcribed text
            
        Returns:
            str: Text with repetitions removed
        """
        if not text or not self.remove_repetitions:
            return text
            
        for phrase_len in range(5, 1, -1):
            pattern = r'\b(\w+(?:\s+\w+){' + str(phrase_len-1) + r'})\s+\1\b'
            text = re.sub(pattern, r'\1', text)
        
        text = re.sub(r'\b(\w+)\s+\1\b', r'\1', text)
        text = re.sub(r'\b(\w+)-\s+\1\b', r'\1', text)
        
        return text
    
    def _transcribe_audio(self, audio_data):
        """
        Transcribe audio data using Faster-Whisper model.
        
        Args:
            audio_data (numpy.ndarray): Audio data to transcribe
            
        Returns:
            tuple: (transcribed_text, confidence_score)
        """
        try:
            audio_data = audio_data / np.max(np.abs(audio_data)) if np.max(np.abs(audio_data)) > 0 else audio_data
            
            segments, info = self.model.transcribe(
                audio_data, 
                language=self.language,
                beam_size=self.beam_size,
                vad_filter=True,
                vad_parameters={
                    "threshold": self.vad_threshold,
                    "min_speech_duration_ms": self.min_speech_duration_ms,
                    "min_silence_duration_ms": self.min_silence_duration_ms
                },
                word_timestamps=False
            )
            
            segments_list = list(segments)
            
            if not segments_list:
                return "", 0.0
                
            total_confidence = sum(segment.avg_logprob for segment in segments_list)
            avg_confidence = total_confidence / len(segments_list) if segments_list else 0
            confidence_score = 1.0 + avg_confidence if avg_confidence <= 0 else 0.0
            
            text = " ".join([segment.text for segment in segments_list])
            text = text.strip()
            
            if self.remove_repetitions:
                text = self._remove_repetitions(text)
                
            return text, confidence_score
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            logger.error(traceback.format_exc())
            return "", 0.0
    
    def get_transcription(self, block=False, timeout=None):
        """
        Get transcription result and latency from the queue.
        
        Args:
            block (bool): Whether to block until data is available
            timeout (float): Timeout in seconds
            
        Returns:
            tuple: (transcribed_text, latency_ms) or (None, None) if queue is empty and block is False
        """
        try:
            return self.result_queue.get(block=block, timeout=timeout)
        except queue.Empty:
            return None, None
        except Exception as e:
            logger.error(f"Error getting transcription: {str(e)}")
            logger.error(traceback.format_exc())
            return None, None

if __name__ == "__main__":
    try:
        pipeline = TranscriptionPipeline(
            model_name="distil-large-v3", 
            beam_size=5, 
            use_gpu=True, 
            remove_repetitions=True,
            vad_threshold=0.7,
            min_speech_duration_ms=300,
            min_silence_duration_ms=500,
            confidence_threshold=0.6
        )
        
        pipeline.start()
        
        print("Speak into the microphone. Press Ctrl+C to stop.")
        
        try:
            while True:
                result, latency = pipeline.get_transcription(block=True, timeout=0.5)
                
                if result:
                    print(f"Transcription: {result} (Latency: {latency:.1f} ms)")
                
                time.sleep(0.1)
        except KeyboardInterrupt:
            print("\nStopping...")
        finally:
            pipeline.stop()
    except Exception as e:
        print(f"Critical error: {str(e)}")
        traceback.print_exc()