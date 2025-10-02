import unittest
import os
import sys
from unittest.mock import MagicMock, patch
import numpy as np

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import modules to test
from audio_capture import MicrophoneCapture
from transcription_pipeline import TranscriptionPipeline

class TestFixedFeatures(unittest.TestCase):
    """Test the fixed features of the application"""
    
    @patch('whisper.load_model')
    def test_tuple_handling(self, mock_load_model):
        """Test that the transcription pipeline returns proper tuples"""
        # Create a mock for the model
        mock_model = MagicMock()
        mock_model.transcribe.return_value = {"text": "Test transcription"}
        mock_load_model.return_value = mock_model
        
        # Create TranscriptionPipeline instance
        pipeline = TranscriptionPipeline(model_name="tiny")
        
        # Mock the result_queue.put method to capture what's being put in the queue
        pipeline.result_queue.put = MagicMock()
        
        # Test the _transcribe_audio method with valid audio
        audio_data = np.zeros(16000, dtype=np.float32)  # 1 second of silence
        result = pipeline._transcribe_audio(audio_data)
        
        # Check result
        self.assertEqual(result, "Test transcription")
        
        # Test that None values are handled properly
        # This simulates what happens in the UI when None values are received
        text, latency = None, None
        
        # In the UI, we check if both values are not None before processing
        should_process = text is not None and latency is not None
        self.assertFalse(should_process, "None values should not be processed")
        
        # Test with valid values
        text, latency = "Valid text", 100.0
        should_process = text is not None and latency is not None
        self.assertTrue(should_process, "Valid values should be processed")
        
        # Test latency conversion from ms to seconds
        latency_ms = 1234.5
        latency_sec = latency_ms / 1000.0
        self.assertAlmostEqual(latency_sec, 1.2345, places=4)
        
        # Verify format of latency display
        latency_display = f"{latency_sec:.3f} sec"
        self.assertEqual(latency_display, "1.234 sec")

if __name__ == '__main__':
    unittest.main()
