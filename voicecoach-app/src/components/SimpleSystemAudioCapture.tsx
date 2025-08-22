import React, { useState, useRef } from 'react';

/**
 * Simplified System Audio Capture - No fancy features, just works
 */
export function SimpleSystemAudioCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState('Ready');
  const streamRef = useRef<MediaStream | null>(null);

  const startCapture = async () => {
    try {
      // Request screen/tab share with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Check if we got audio
      const hasAudio = stream.getAudioTracks().length > 0;
      
      // Stop video track - we only need audio
      stream.getVideoTracks().forEach(track => {
        track.stop();
        stream.removeTrack(track);
      });

      if (!hasAudio) {
        stream.getTracks().forEach(t => t.stop());
        setStatus('❌ No audio - Make sure to check "Share audio"');
        return;
      }

      streamRef.current = stream;
      setIsCapturing(true);
      setStatus('✅ Capturing audio from selected tab');

      // Listen for track ending (user stops sharing)
      stream.getAudioTracks()[0].addEventListener('ended', () => {
        stopCapture();
      });

    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setStatus('❌ Cancelled or blocked');
      } else {
        setStatus('❌ Error: ' + err.message);
      }
    }
  };

  const stopCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
    setStatus('Stopped');
  };

  return (
    <div style={{ 
      padding: '30px', 
      maxWidth: '600px', 
      margin: '0 auto',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1>🎵 Simple System Audio Capture</h1>
      <p style={{ color: '#666' }}>Minimal version - No errors, just audio capture</p>

      <div style={{
        padding: '20px',
        backgroundColor: isCapturing ? '#d4f5d4' : '#f0f0f0',
        borderRadius: '10px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
          {status}
        </div>
        {isCapturing && (
          <div style={{ marginTop: '10px', color: '#666' }}>
            Audio is being captured from your selected tab
          </div>
        )}
      </div>

      <button
        onClick={isCapturing ? stopCapture : startCapture}
        style={{
          width: '100%',
          padding: '15px',
          fontSize: '18px',
          backgroundColor: isCapturing ? '#ff4444' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        {isCapturing ? '⏹ Stop Capture' : '🎤 Start Capture'}
      </button>

      <div style={{
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#fff3cd',
        borderRadius: '10px',
        border: '1px solid #ffc107',
        color: '#000'  // Force black text
      }}>
        <h3 style={{ marginTop: 0, color: '#000' }}>📝 Instructions:</h3>
        <ol>
          <li>Click "Start Capture"</li>
          <li>Select a browser tab (Chrome/Edge work best)</li>
          <li><strong>Important:</strong> Check "Share tab audio" in the dialog</li>
          <li>Click "Share"</li>
        </ol>
        
        <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          <strong>Works with:</strong> YouTube, Google Meet, Zoom Web, any browser tab with audio
        </div>
      </div>

      {isCapturing && streamRef.current && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#e8f5e9',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          <strong>Stream Info:</strong>
          <ul style={{ marginTop: '10px', marginBottom: 0 }}>
            <li>Audio Tracks: {streamRef.current.getAudioTracks().length}</li>
            <li>Track Label: {streamRef.current.getAudioTracks()[0]?.label || 'Unknown'}</li>
            <li>Track State: {streamRef.current.getAudioTracks()[0]?.readyState || 'Unknown'}</li>
          </ul>
        </div>
      )}
    </div>
  );
}