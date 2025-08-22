import React, { useState } from 'react';

/**
 * Browser Audio Test Component
 * Tests what audio capture capabilities are available in the current browser
 */
export function BrowserAudioTest() {
  const [capabilities, setCapabilities] = useState<any>({});
  const [testing, setTesting] = useState(false);
  
  const testBrowserCapabilities = async () => {
    setTesting(true);
    const caps: any = {};
    
    // Test 1: Check if mediaDevices API exists
    caps.hasMediaDevices = !!navigator.mediaDevices;
    
    // Test 2: Check if getDisplayMedia exists
    caps.hasGetDisplayMedia = !!(navigator.mediaDevices?.getDisplayMedia);
    
    // Test 3: Check if getUserMedia exists
    caps.hasGetUserMedia = !!(navigator.mediaDevices?.getUserMedia);
    
    // Test 4: Get browser info
    caps.userAgent = navigator.userAgent;
    caps.browser = getBrowserInfo();
    
    // Test 5: Try to enumerate devices
    if (navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        caps.audioInputs = devices.filter(d => d.kind === 'audioinput').length;
        caps.audioOutputs = devices.filter(d => d.kind === 'audiooutput').length;
        caps.videoInputs = devices.filter(d => d.kind === 'videoinput').length;
      } catch (err) {
        caps.enumerateError = err instanceof Error ? err.message : String(err);
      }
    }
    
    // Test 6: Test getDisplayMedia with audio
    if (navigator.mediaDevices?.getDisplayMedia) {
      try {
        // Create a test button click to trigger user gesture requirement
        const testCapture = async () => {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });
          
          const hasAudio = stream.getAudioTracks().length > 0;
          const hasVideo = stream.getVideoTracks().length > 0;
          
          // Clean up
          stream.getTracks().forEach(track => track.stop());
          
          return { hasAudio, hasVideo };
        };
        
        caps.displayMediaTest = 'Ready to test - click "Test Screen Capture"';
      } catch (err) {
        caps.displayMediaError = err instanceof Error ? err.message : String(err);
      }
    }
    
    setCapabilities(caps);
    setTesting(false);
  };
  
  const testScreenCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      
      const result = {
        hasAudio: audioTracks.length > 0,
        hasVideo: videoTracks.length > 0,
        audioTrackSettings: audioTracks[0]?.getSettings(),
        videoTrackSettings: videoTracks[0]?.getSettings()
      };
      
      // Clean up
      stream.getTracks().forEach(track => track.stop());
      
      setCapabilities((prev: any) => ({ ...prev, screenCaptureResult: result }));
    } catch (err: any) {
      setCapabilities((prev: any) => ({ ...prev, screenCaptureError: err.message }));
    }
  };
  
  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    return 'Unknown';
  };
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>🔍 Browser Audio Capabilities Test</h2>
      
      <button 
        onClick={testBrowserCapabilities}
        disabled={testing}
        style={{
          padding: '10px 20px',
          marginBottom: '20px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        {testing ? 'Testing...' : 'Test Browser Capabilities'}
      </button>
      
      {capabilities.browser && (
        <button 
          onClick={testScreenCapture}
          style={{
            padding: '10px 20px',
            marginLeft: '10px',
            marginBottom: '20px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Test Screen Capture with Audio
        </button>
      )}
      
      <pre style={{ 
        backgroundColor: '#f3f4f6', 
        padding: '15px', 
        borderRadius: '8px',
        overflow: 'auto'
      }}>
        {JSON.stringify(capabilities, null, 2)}
      </pre>
      
      {capabilities.browser && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e5e7eb', borderRadius: '8px' }}>
          <h3>Results:</h3>
          <ul>
            <li>Browser: <strong>{capabilities.browser}</strong></li>
            <li>Media Devices API: {capabilities.hasMediaDevices ? '✅' : '❌'}</li>
            <li>Screen Capture API: {capabilities.hasGetDisplayMedia ? '✅' : '❌'}</li>
            <li>Microphone API: {capabilities.hasGetUserMedia ? '✅' : '❌'}</li>
            <li>Audio Inputs: {capabilities.audioInputs || 0}</li>
            <li>Audio Outputs: {capabilities.audioOutputs || 0}</li>
          </ul>
          
          {capabilities.screenCaptureResult && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: capabilities.screenCaptureResult.hasAudio ? '#dcfce7' : '#fee2e2', borderRadius: '5px' }}>
              <strong>Screen Capture Test:</strong>
              <ul>
                <li>Audio Captured: {capabilities.screenCaptureResult.hasAudio ? '✅ YES' : '❌ NO'}</li>
                <li>Video Captured: {capabilities.screenCaptureResult.hasVideo ? '✅' : '❌'}</li>
              </ul>
              {!capabilities.screenCaptureResult.hasAudio && (
                <p style={{ color: '#dc2626', fontWeight: 'bold' }}>
                  ⚠️ No audio was captured! Make sure to check "Share audio" when selecting a source.
                </p>
              )}
            </div>
          )}
          
          {capabilities.screenCaptureError && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fee2e2', borderRadius: '5px', color: '#dc2626' }}>
              <strong>Screen Capture Error:</strong> {capabilities.screenCaptureError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}