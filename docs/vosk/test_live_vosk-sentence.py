#!/usr/bin/env python3

import queue
import sounddevice as sd
from vosk import Model, KaldiRecognizer
import sys
import json

'''This script processes live audio from the microphone and displays transcribed text in real-time (partials and finals).'''

# List all audio devices known to your system
print("Display input/output devices")
print(sd.query_devices())

# Get the samplerate - this is needed by the Kaldi recognizer
device_info = sd.query_devices(sd.default.device[0], 'input')
samplerate = int(device_info['default_samplerate'])

# Display the default input device
print("===> Initial Default Device Number: {} Description: {}".format(sd.default.device[0], device_info))

# Setup queue and callback function
q = queue.Queue()

def recordCallback(indata, frames, time, status):
    if status:
        print(status, file=sys.stderr)
    q.put(bytes(indata))

# Build the model and recognizer objects. This will take a few minutes.
print("===> Build the model and recognizer objects.")
model = Model(r"C:\Users\Administrator\Downloads\LLM\vosk-model-en-us-0.22-lgraph\vosk-model-en-us-0.22-lgraph")  # Update this to your actual model path
recognizer = KaldiRecognizer(model, samplerate)
recognizer.SetWords(False)  # Set to True if you want word timings in finals
recognizer.SetPartialWords(False)  # Reduces word-level fragmentation in partials

print("===> Begin recording. Speak into your microphone. Press Ctrl+C to stop.")
try:
    with sd.RawInputStream(dtype='int16',
                           channels=1,
                           callback=recordCallback):
        while True:
            data = q.get()
            if recognizer.AcceptWaveform(data):
                result = recognizer.Result()
                result_dict = json.loads(result)
                print("Final: " + result_dict.get("text", ""))  # Prints final on pause/silence
            
except KeyboardInterrupt:
    print('===> Finished Recording')
except Exception as e:
    print(str(e))