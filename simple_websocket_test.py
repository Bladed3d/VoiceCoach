#!/usr/bin/env python3
"""
VoiceCoach V2 WebSocket Connection Test - Simple Version
Tests the start button functionality end-to-end
"""
import socketio
import time
import sys

print('VoiceCoach V2 WebSocket Connection Test')
print('=' * 50)

# Test state tracking
connection_successful = False
status_received = False
transcription_started = False
transcription_stopped = False
error_messages = []

# Create Socket.IO client with same config as frontend
sio = socketio.Client(logger=False, engineio_logger=False)

@sio.event
def connect():
    global connection_successful
    connection_successful = True
    print('[LED 7011] WebSocket connected successfully')
    print('[SUCCESS] Connection established to VoiceCoach V2 server')

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
        print('[LED 6020] Start transcription acknowledged')
        print('[SUCCESS] Transcription started successfully')
    elif status == 'stopped':
        transcription_stopped = True
        print('[LED 6021] Stop transcription acknowledged')
        print('[SUCCESS] Transcription stopped successfully')
    
@sio.event
def transcription(data):
    print('[LED 7020] Transcript received')
    print('[SUCCESS] Transcription data:', data.get('text', 'No text'))

@sio.event
def coaching_suggestion(data):
    print('[LED 7021] Coaching suggestion received')
    print('[SUCCESS] Coaching:', data.get('suggestion', 'No suggestion'))

@sio.event
def connect_error(data):
    global error_messages
    error_message = str(data)
    error_messages.append(error_message)
    print('[LED 8011 FAILED] WebSocket connection error')
    print('[ERROR] Error details:', error_message)

@sio.event
def error(data):
    global error_messages
    error_message = data.get('message', str(data))
    error_messages.append(error_message)
    print('[LED 8022 FAILED] Server error received')
    print('[ERROR] Server error:', error_message)

def main():
    """Main test execution"""
    print('Starting VoiceCoach V2 Start Button Test Simulation')
    
    SERVER_URL = 'http://localhost:5000'
    
    try:
        print('[LED 7010] Starting connection test to', SERVER_URL)
        print('[LED 7009] Initializing Socket.IO with polling + websocket transports')
        
        # Connect with same transports as frontend
        sio.connect(SERVER_URL, transports=['polling', 'websocket'])
        
        # Wait for connection
        print('Waiting for connection establishment...')
        start_time = time.time()
        while not connection_successful and (time.time() - start_time) < 5:
            time.sleep(0.1)
            
        if not connection_successful:
            print('[LED 8010 FAILED] Connection timeout after 5 seconds')
            return False
            
        # Wait for initial status
        print('Waiting for server status...')
        time.sleep(2)
        
        # Test start transcription (simulating start button click)
        print('[LED 7030] Sending start transcription command')
        sio.emit('start_transcription')
        
        # Wait for transcription to start
        time.sleep(2)
        
        # Test stop transcription
        print('[LED 7031] Sending stop transcription command')
        sio.emit('stop_transcription')
        
        # Wait for transcription to stop
        time.sleep(2)
        
        # Disconnect cleanly
        print('[LED 7050] Disconnecting cleanly')
        sio.disconnect()
        
        print()
        print('=' * 50)
        print('VoiceCoach V2 Test Results Summary')
        print('=' * 50)
        
        print('Connection Established:', '[YES]' if connection_successful else '[NO]')
        print('Server Status Received:', '[YES]' if status_received else '[NO]')
        print('Transcription Started:', '[YES]' if transcription_started else '[NO]')
        print('Transcription Stopped:', '[YES]' if transcription_stopped else '[NO]')
        print('Errors Encountered:', len(error_messages))
        
        if error_messages:
            print()
            print('Error Details:')
            for i, error in enumerate(error_messages, 1):
                print(f'  {i}. {error}')
        
        # LED Chain Validation
        print()
        print('LED Chain Validation:')
        led_chain_complete = (
            connection_successful and 
            status_received and 
            transcription_started and 
            transcription_stopped and
            len(error_messages) == 0
        )
        
        if led_chain_complete:
            print('[SUCCESS] Complete LED chain: 7010 -> 7011 -> 7022 -> 7030 -> 6020 -> 7031 -> 6021')
            print('[SUCCESS] Start button functionality: OPERATIONAL')
        else:
            print('[FAILED] Incomplete LED chain detected')
            print('[FAILED] Start button functionality: FAILED')
        
        # Production readiness assessment
        test_success = led_chain_complete
        print()
        print('Production Ready:', '[YES]' if test_success else '[NO]')
        
        if test_success:
            print('[SUCCESS] All critical WebSocket functionality working')
            print('[SUCCESS] Start button should work reliably in production')
            return True
        else:
            print('[ERROR] Critical issues detected - not production ready')
            print('[ERROR] Start button functionality requires fixes')
            return False
        
    except Exception as e:
        print('[LED 8010 FAILED] Exception during connection test')
        print('[ERROR] Exception:', str(e))
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)