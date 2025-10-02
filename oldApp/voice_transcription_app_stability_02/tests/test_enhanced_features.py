import unittest
import os
import sys
from unittest.mock import MagicMock, patch
import numpy as np
import torch

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import modules to test
from transcription_pipeline import TranscriptionPipeline

class TestEnhancedFeatures(unittest.TestCase):
    """Test the enhanced features of the application"""
    
    @patch('whisper.load_model')
    def test_large_model_support(self, mock_load_model):
        """Test that large models are supported"""
        # Create a mock for the model
        mock_model = MagicMock()
        mock_model.transcribe.return_value = {"text": "Test transcription"}
        mock_load_model.return_value = mock_model
        
        # Create TranscriptionPipeline instance with large-v3 model
        pipeline = TranscriptionPipeline(
            model_name="large-v3", 
            beam_size=5,
            use_gpu=True,
            remove_repetitions=True
        )
        
        # Check that the model was loaded with the correct parameters
        mock_load_model.assert_called_once_with("large-v3", device="cpu")
        
        # Test the _transcribe_audio method
        audio_data = np.zeros(16000, dtype=np.float32)  # 1 second of silence
        result = pipeline._transcribe_audio(audio_data)
        
        # Check result
        self.assertEqual(result, "Test transcription")
        
        # Check that transcribe was called with the correct parameters
        mock_model.transcribe.assert_called_with(
            audio_data,
            language="en",
            beam_size=5,
            fp16=False,
            verbose=False
        )
    
    @patch('whisper.load_model')
    def test_beam_size_parameter(self, mock_load_model):
        """Test that beam size parameter is used"""
        # Create a mock for the model
        mock_model = MagicMock()
        mock_model.transcribe.return_value = {"text": "Test transcription"}
        mock_load_model.return_value = mock_model
        
        # Create TranscriptionPipeline instance with custom beam size
        pipeline = TranscriptionPipeline(
            model_name="tiny",
            beam_size=10,  # Custom beam size
            use_gpu=False,
            remove_repetitions=True
        )
        
        # Test the _transcribe_audio method
        audio_data = np.zeros(16000, dtype=np.float32)
        result = pipeline._transcribe_audio(audio_data)
        
        # Check that transcribe was called with the correct beam size
        mock_model.transcribe.assert_called_with(
            audio_data,
            language="en",
            beam_size=10,  # Should use our custom beam size
            fp16=False,
            verbose=False
        )
    
    def test_repetition_removal(self):
        """Test that repetitions are removed from text"""
        # Create TranscriptionPipeline instance
        pipeline = TranscriptionPipeline(model_name="tiny", remove_repetitions=True)
        
        # Test cases for repetition removal
        test_cases = [
            # Exact repeated phrases
            ("how do you how do you feel today", "how do you feel today"),
            ("I think I think we should go", "I think we should go"),
            ("the cat the cat sat on the mat", "the cat sat on the mat"),
            
            # Repeated single words
            ("the the cat", "the cat"),
            ("hello hello world", "hello world"),
            
            # Stuttering
            ("I- I think", "I think"),
            ("we- we are going", "we are going"),
            
            # Complex cases
            ("how do you how do you feel you did", "how do you feel you did"),
            ("I think I think we should we should go", "I think we should go"),
            
            # No repetitions (should remain unchanged)
            ("This sentence has no repetitions", "This sentence has no repetitions"),
            
            # Edge cases
            ("", ""),  # Empty string
            ("a", "a"),  # Single character
        ]
        
        for input_text, expected_output in test_cases:
            result = pipeline._remove_repetitions(input_text)
            self.assertEqual(result, expected_output, f"Failed for input: '{input_text}'")
    
    @patch('torch.cuda.is_available')
    @patch('whisper.load_model')
    def test_gpu_detection(self, mock_load_model, mock_cuda_available):
        """Test that GPU is detected and used if available"""
        # Mock GPU availability
        mock_cuda_available.return_value = True
        
        # Create a mock for the model
        mock_model = MagicMock()
        mock_model.transcribe.return_value = {"text": "Test transcription"}
        mock_load_model.return_value = mock_model
        
        # Create TranscriptionPipeline instance with GPU enabled
        pipeline = TranscriptionPipeline(
            model_name="tiny",
            use_gpu=True
        )
        
        # Check that the model was loaded with the correct device
        mock_load_model.assert_called_once_with("tiny", device="cuda")
        
        # Test the _transcribe_audio method
        audio_data = np.zeros(16000, dtype=np.float32)
        result = pipeline._transcribe_audio(audio_data)
        
        # Check that transcribe was called with fp16=True for GPU
        mock_model.transcribe.assert_called_with(
            audio_data,
            language="en",
            beam_size=5,
            fp16=True,  # Should use fp16 for GPU
            verbose=False
        )

if __name__ == '__main__':
    unittest.main()
