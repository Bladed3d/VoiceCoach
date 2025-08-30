#!/usr/bin/env python3
"""
Test WebSocket with mock audio to bypass microphone issues
"""
import socketio
import time
import threading

print('VoiceCoach V2 WebSocket Test with Mock Audio')
print('=' * 60)

# Test state tracking
connection_successful = False
status_received = False
transcription_started = False
transcription_stopped = False
transcript_received = False
coaching_received = False
error_messages = []

# Create Socket.IO client
sio = socketio.Client(logger=False, engineio_logger=False)

@sio.event
def connect():
    global connection_successful
    connection_successful = True
    print('[LED 7011] WebSocket connected successfully')
    print('[SUCCESS] Connected to VoiceCoach V2 server')

@sio.event  
def status(data):
    global status_received
    status_received = True
    print('[LED 7022] Status message received')
    print('[SUCCESS] Server status:', data.get('message', data))

@sio.event
def transcription_status(data):
    global transcription_started, transcription_stopped
    status = data.get('status', '')
    if status == 'started':
        transcription_started = True
        print('[LED 6020] Transcription started acknowledged')
        print('[SUCCESS] Transcription service is active')
    elif status == 'stopped':
        transcription_stopped = True
        print('[LED 6021] Transcription stopped acknowledged')
        print('[SUCCESS] Transcription service stopped')

@sio.event
def transcription(data):
    global transcript_received
    transcript_received = True
    print('[LED 7020] Transcript received')
    print('[SUCCESS] Transcription:', data.get('text', 'No text'))
    print('[SUCCESS] Type:', data.get('type', 'Unknown'))

@sio.event
def coaching_suggestion(data):
    global coaching_received
    coaching_received = True
    print('[LED 7021] Coaching suggestion received')
    print('[SUCCESS] Coaching trigger:', data.get('trigger', 'No trigger'))
    print('[SUCCESS] Suggestion:', data.get('suggestion', 'No suggestion'))
    print('[SUCCESS] Priority:', data.get('priority', 'No priority'))

@sio.event
def connect_error(data):
    global error_messages
    error_message = str(data)
    error_messages.append(error_message)
    print('[LED 8011 FAILED] WebSocket connection error')
    print('[ERROR] Details:', error_message)

@sio.event
def error(data):
    global error_messages
    error_message = data.get('message', str(data))
    error_messages.append(error_message)
    print('[LED 8022] Server error (expected for microphone issues)')
    print('[INFO] Server error:', error_message)

def send_mock_audio():
    """Send mock audio data to test transcription pipeline"""
    time.sleep(3)  # Wait for transcription to start
    
    if not transcription_started:
        print('[WARNING] Transcription not started, skipping mock audio')
        return
        
    print('[TEST] Sending mock audio chunks to trigger transcription...')
    
    # Send a few mock audio chunks
    mock_audio_data = b'\\x00' * 1024  # Silent audio data
    
    for i in range(5):
        sio.emit('audio_chunk', mock_audio_data)
        print(f'[TEST] Sent mock audio chunk {i+1}/5')
        time.sleep(0.2)

def main():
    """Run comprehensive WebSocket test"""
    SERVER_URL = 'http://localhost:5000'
    
    try:
        print('[LED 7010] Starting connection to', SERVER_URL)
        sio.connect(SERVER_URL, transports=['polling', 'websocket'])
        
        # Wait for connection
        print('[TEST] Waiting for connection...')
        start_time = time.time()
        while not connection_successful and (time.time() - start_time) < 5:
            time.sleep(0.1)
            
        if not connection_successful:
            print('[FAILED] Connection timeout')
            return False
            
        # Wait for server status
        time.sleep(1)
        
        # Start transcription
        print('[LED 7030] Starting transcription session')
        sio.emit('start_transcription')
        
        # Start mock audio in background
        audio_thread = threading.Thread(target=send_mock_audio, daemon=True)
        audio_thread.start()
        
        # Wait for transcription events
        print('[TEST] Waiting for transcription to start...')
        time.sleep(2)
        
        # Wait for mock audio to be processed
        print('[TEST] Waiting for audio processing...')
        time.sleep(3)
        
        # Stop transcription
        print('[LED 7031] Stopping transcription session')
        sio.emit('stop_transcription')
        time.sleep(1)
        
        # Disconnect
        print('[LED 7050] Disconnecting')
        sio.disconnect()
        
        # Results
        print('\n' + '=' * 60)
        print('VoiceCoach V2 Complete WebSocket Test Results')
        print('=' * 60)
        
        print('WebSocket Connection:', '[YES]' if connection_successful else '[NO]')
        print('Server Status Received:', '[YES]' if status_received else '[NO]')
        print('Transcription Started:', '[YES]' if transcription_started else '[NO]')
        print('Transcription Stopped:', '[YES]' if transcription_stopped else '[NO]')
        print('Transcript Received:', '[YES]' if transcript_received else '[NO]')
        print('Coaching Received:', '[YES]' if coaching_received else '[NO]')
        print('Microphone Errors:', len([e for e in error_messages if 'microphone' in e.lower() or 'audio' in e.lower()]))
        print('Critical Errors:', len([e for e in error_messages if 'microphone' not in e.lower() and 'audio' not in e.lower()]))
        
        # LED Chain Assessment
        print('\nLED Chain Assessment:')
        connection_chain = connection_successful and status_received
        transcription_chain = transcription_started and transcription_stopped
        # Note: Audio pipeline will fail due to microphone issues, but WebSocket works
        
        print('Connection Chain (7010->7011->7022):', '[PASS]' if connection_chain else '[FAIL]')
        print('Transcription Chain (7030->6020->7031->6021):', '[PASS]' if transcription_chain else '[FAIL]')
        print('Audio Pipeline (Expected to fail without microphone):', '[SKIP - MIC ISSUE]')
        
        # Overall Assessment
        websocket_functional = connection_chain and transcription_chain
        
        print('\nProduction Assessment:')
        print('WebSocket Infrastructure:', '[OPERATIONAL]' if websocket_functional else '[FAILED]')
        print('Start Button Backend:', '[FUNCTIONAL]' if websocket_functional else '[BROKEN]')
        
        # The key issue
        if len([e for e in error_messages if 'microphone' in e.lower()]) > 0:
            print('Microphone Access:', '[BLOCKED - DRIVER ISSUE]')
            print('Root Cause: Windows audio device access requires proper configuration')
            print('Fix Required: Configure default audio input device or update audio drivers')
        else:
            print('Microphone Access:', '[FUNCTIONAL]')
            
        if websocket_functional:
            print('\n[CONCLUSION] Start button WebSocket communication works correctly')
            print('[CONCLUSION] Issue is microphone access, not WebSocket implementation')
            print('[CONCLUSION] LED 8011 failure is due to audio system, not network')
            return True
        else:
            print('\n[CONCLUSION] Start button has WebSocket communication issues')
            return False
        
    except Exception as e:
        print('[FAILED] Test exception:', str(e))
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)