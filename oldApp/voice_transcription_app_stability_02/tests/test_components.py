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

class TestAudioCapture(unittest.TestCase):
    """Test the MicrophoneCapture class"""
    
    @patch('sounddevice.InputStream')
    def test_initialization(self, mock_stream):
        """Test that MicrophoneCapture initializes correctly"""
        mic = MicrophoneCapture()
        self.assertEqual(mic.sample_rate, 16000)
        self.assertEqual(mic.chunk_size, 1024)
        self.assertEqual(mic.channels, 1)
        self.assertFalse(mic.running)
        self.assertIsNone(mic.stream)
    
    @patch('sounddevice.InputStream')
    def test_start_stop(self, mock_stream):
        """Test that start and stop methods work correctly"""
        # Create a mock instance for the stream
        mock_stream_instance = MagicMock()
        mock_stream.return_value = mock_stream_instance
        
        # Create MicrophoneCapture instance
        mic = MicrophoneCapture()
        
        # Test start
        mic.start()
        self.assertTrue(mic.running)
        mock_stream.assert_called_once()
        mock_stream_instance.start.assert_called_once()
        
        # Test stop
        mic.stop()
        self.assertFalse(mic.running)
        mock_stream_instance.stop.assert_called_once()
        mock_stream_instance.close.assert_called_once()

class TestTranscriptionPipeline(unittest.TestCase):
    """Test the TranscriptionPipeline class"""
    
    @patch('whisper.load_model')
    def test_initialization(self, mock_load_model):
        """Test that TranscriptionPipeline initializes correctly"""
        # Create a mock for the model
        mock_model = MagicMock()
        mock_load_model.return_value = mock_model
        
        # Create TranscriptionPipeline instance
        pipeline = TranscriptionPipeline(model_name="tiny")
        
        # Check initialization
        self.assertEqual(pipeline.model_name, "tiny")
        self.assertEqual(pipeline.language, "en")
        self.assertEqual(pipeline.sample_rate, 16000)
        self.assertFalse(pipeline.running)
        mock_load_model.assert_called_once_with("tiny")

if __name__ == '__main__':
    unittest.main()
