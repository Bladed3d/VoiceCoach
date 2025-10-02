# Real-time Voice Transcription App - Updated Version

This application transcribes your voice into text in real-time using locally installed models. It uses your microphone for voice input and displays the transcribed text on the screen.

## New Features

- **Adjustable Font Size**: Use the slider to change the font size throughout the application (range: 8pt to 32pt)
- **Real-time Latency Monitoring**: View the processing time for each transcription and the running average

## Original Features

- Real-time voice transcription using OpenAI's Whisper model
- Local processing (no internet required for transcription)
- Simple UI with start/stop controls
- Multiple model options (tiny, base, small, medium, large)
- Support for multiple languages
- 800x1200 window size

## Requirements

- Python 3.8+
- PyTorch
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

3. Install the required Python packages:
   ```
   pip install torch openai-whisper pyaudio sounddevice customtkinter
   ```

## Usage

1. Run the application:
   ```
   python main.py
   ```

2. Adjust the font size using the slider at the top of the application

3. Select the desired model and language from the dropdown menus
   - Smaller models (tiny, base) are faster but less accurate
   - Larger models (medium, large) are more accurate but slower and require more RAM
   - The latency monitor helps you compare performance between models

4. Click "Start Transcription" to begin capturing and transcribing audio
   - The first start may take some time as the model is downloaded and loaded

5. Speak into your microphone
   - Transcribed text will appear in the text area in real-time
   - The latency display will show processing time for each transcription

6. Click "Stop Transcription" when finished

7. Use "Clear Text" to reset the transcription text area

## Latency Monitoring

The latency display shows:
- Current transcription processing time in milliseconds
- Running average of the last 20 transcriptions

This helps you:
- Compare performance between different models
- Understand the impact of your hardware on transcription speed
- Optimize for your specific use case

## Files

- `main.py`: Main application entry point
- `app.py`: UI implementation with font size adjustment and latency monitoring
- `audio_capture.py`: Microphone audio capture functionality
- `transcription_pipeline.py`: Real-time transcription pipeline using Whisper
- `tests/`: Test files for components

## Troubleshooting

- If you encounter audio input issues, check your microphone settings and permissions
- For GPU acceleration, ensure you have CUDA installed and use the appropriate PyTorch version
- If the application crashes due to memory issues, try using a smaller model

## License

This project is open source and available under the MIT License.
