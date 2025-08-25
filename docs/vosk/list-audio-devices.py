import sounddevice as sd

print("List of all audio devices (input and output):")
print(sd.query_devices())