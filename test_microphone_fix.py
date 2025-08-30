#!/usr/bin/env python3
"""
Test microphone access with specific device selection
"""
import sounddevice as sd
import numpy as np

print('Testing microphone access for VoiceCoach V2...')

# Find available input devices
input_devices = []
devices = sd.query_devices()
for i, device in enumerate(devices):
    if device['max_input_channels'] > 0:
        print(f'Input device {i}: {device["name"]} (channels: {device["max_input_channels"]})')
        input_devices.append(i)

if not input_devices:
    print('[ERROR] No input devices found')
    exit(1)

# Try to use the first available input device
test_device = input_devices[0]
print(f'Testing with device {test_device}...')

try:
    # Test recording with specific device
    def test_callback(indata, frames, time, status):
        if status:
            print(f'Audio callback status: {status}')
        # Just consume the audio data
        volume_norm = np.linalg.norm(indata) * 10
        print(f'Audio level: {volume_norm:.1f}', end='\r')

    print(f'[SUCCESS] Starting audio test with device {test_device}...')
    print('(Speak into microphone for 3 seconds)')
    
    with sd.RawInputStream(
        samplerate=16000,
        channels=1,
        dtype=np.float32,
        device=test_device,
        callback=test_callback
    ):
        sd.sleep(3000)  # 3 seconds
    
    print('\n[SUCCESS] Microphone test completed successfully!')
    print(f'Recommended device for VoiceCoach V2: {test_device}')
    
except Exception as e:
    print(f'\n[ERROR] Microphone test failed: {e}')
    print('Try another device or check permissions')