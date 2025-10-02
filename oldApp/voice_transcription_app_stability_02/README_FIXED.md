# Real-time Voice Transcription App with Distil-Whisper and Faster-Whisper

This application transcribes your voice into text in real-time using locally installed models. It now uses Distil-Whisper large-v3 CT2 variant with Faster-Whisper for significantly better accuracy and lower latency.

## Important Update

The application has been updated to use the CT2 variant of Distil-Whisper models, which is fully compatible with Faster-Whisper. This resolves the model loading issue and provides optimal performance.

## New Features

- **Distil-Whisper large-v3 CT2**: Knowledge-distilled version of Whisper optimized for CTranslate2 backend
- **Faster-Whisper Backend**: Optimized implementation that significantly reduces latency compared to standard Whisper
- **Robust Model Loading**: Automatic fallback to alternative models if the primary model fails to load
- **Configurable Beam Size**: Adjust the beam size parameter to balance accuracy and latency
- **Repetition Removal**: Post-processing to automatically detect and remove common repetition patterns
- **Enhanced UI**: Improved interface with controls for all new features and real-time metrics

## Original Features

- Real-time voice transcription
- Adjustable font size (range: 8pt to 32pt)
- Real-time latency monitoring in seconds
- Simple UI with start/stop controls
- Multiple language support
- 800x1200 window size

## Requirements

- Python 3.8+
- PyTorch >= 2.1 with CUDA support (for GPU acceleration)
- Faster-Whisper
- Transformers
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
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
   ```

4. Install the other required Python packages:
   ```
   pip install faster-whisper transformers pyaudio sounddevice customtkinter
   ```

## Usage

1. Run the application:
   ```
   python main.py
   ```

2. Configure the application settings:
   - **Model**: Select "distil-large-v3" for best results (or other models for comparison)
   - **Language**: Choose your preferred language
   - **Beam Size**: Higher values (5-10) provide better accuracy but increase latency
   - **Remove Repetitions**: Enable to automatically remove repeated phrases
   - **Use GPU**: Enable to use your RTX 4090 for faster processing

3. Click "Start Transcription" to begin capturing and transcribing audio
   - The first start may take some time as the model is downloaded and loaded
   - Distil-Whisper large-v3 CT2 will provide the best balance of accuracy and speed

4. Speak into your microphone
   - Transcribed text will appear in the text area in real-time
   - The latency display will show processing time for each transcription

5. Click "Stop Transcription" when finished

## Optimizing for Your RTX 4090

Your RTX 4090 with 24GB of VRAM is ideal for running Distil-Whisper large-v3 CT2. For the best experience:

1. Ensure PyTorch >= 2.1 is installed with CUDA support
2. Use the "distil-large-v3" model for optimal accuracy and speed
3. Set beam size to 5-7 for a good balance
4. Enable GPU acceleration
5. Enable repetition removal

The combination of Distil-Whisper CT2 and Faster-Whisper should provide significantly better accuracy with lower latency compared to standard Whisper models.

## Troubleshooting

- If you encounter GPU memory issues, try reducing the beam size
- For best performance, ensure you have the latest NVIDIA drivers installed
- If the application crashes, check the console output for error messages
- Make sure PyTorch version is >= 2.1 with CUDA support
- If model loading fails, the application will automatically try alternative models

## Files

- `main.py`: Main application entry point with enhanced UI
- `audio_capture.py`: Microphone audio capture functionality
- `transcription_pipeline.py`: Enhanced transcription pipeline with Faster-Whisper and Distil-Whisper CT2
- `tests/`: Test files for components
