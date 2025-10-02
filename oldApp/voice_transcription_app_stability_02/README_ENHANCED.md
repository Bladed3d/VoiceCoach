# Real-time Voice Transcription App - Enhanced Version

This application transcribes your voice into text in real-time using locally installed models. It now includes support for larger models and GPU acceleration to improve accuracy while maintaining reasonable latency.

## New Features

- **Support for Large Whisper Models**: Added support for larger models including `large-v3` which provides significantly better accuracy on your RTX 4090
- **GPU Acceleration**: Automatically detects and utilizes your RTX 4090 for faster processing
- **Configurable Beam Size**: Adjust the beam size parameter to balance accuracy and latency
- **Repetition Removal**: Post-processing to automatically detect and remove common repetition patterns
- **Enhanced UI**: Improved interface with controls for all new features and real-time metrics

## Original Features

- Real-time voice transcription using OpenAI's Whisper model
- Adjustable font size (range: 8pt to 32pt)
- Real-time latency monitoring in seconds
- Simple UI with start/stop controls
- Multiple language support
- 800x1200 window size

## Requirements

- Python 3.8+
- PyTorch with CUDA support (for GPU acceleration)
- OpenAI Whisper
- PyAudio
- SoundDevice
- CustomTkinter

## Installation

1. Ensure you have Python installed on your system
2. Install the required system dependencies:
   ```
   sudo apt-get install gcc portaudio19-dev python3-dev python3-tk
   ```
   
   For Windows, you may need to install PyAudio from a wheel file if pip installation fails.

3. Install PyTorch with CUDA support (for your RTX 4090):
   ```
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   ```

4. Install the other required Python packages:
   ```
   pip install openai-whisper pyaudio sounddevice customtkinter
   ```

## Usage

1. Run the application:
   ```
   python main.py
   ```

2. Configure the application settings:
   - **Model**: Select the model size (larger models are more accurate but slower)
   - **Language**: Choose your preferred language
   - **Beam Size**: Higher values (5-10) provide better accuracy but increase latency
   - **Remove Repetitions**: Enable to automatically remove repeated phrases
   - **Use GPU**: Enable to use your RTX 4090 for faster processing

3. Click "Start Transcription" to begin capturing and transcribing audio
   - The first start may take some time as the model is downloaded and loaded
   - Larger models like `large-v3` will take longer to load but provide better accuracy

4. Speak into your microphone
   - Transcribed text will appear in the text area in real-time
   - The latency display will show processing time for each transcription

5. Click "Stop Transcription" when finished

## Optimizing for Your RTX 4090

Your RTX 4090 with 24GB of VRAM is powerful enough to run even the largest Whisper models. For the best balance of accuracy and latency:

1. Use the `large-v3` model for highest accuracy
2. Keep beam size around 5-7 for a good balance
3. Enable GPU acceleration
4. Enable repetition removal

If you need faster responses, you can:
- Use the `medium` model with a beam size of 3-5
- This will be significantly faster while still providing good accuracy

## Troubleshooting

- If you encounter GPU memory issues with the largest models, try reducing the beam size
- For best performance, ensure you have the latest NVIDIA drivers installed
- If the application crashes, check the console output for error messages

## Files

- `main.py`: Main application entry point with enhanced UI
- `app.py`: UI implementation
- `audio_capture.py`: Microphone audio capture functionality
- `transcription_pipeline.py`: Enhanced transcription pipeline with large model support
- `tests/`: Test files for components
