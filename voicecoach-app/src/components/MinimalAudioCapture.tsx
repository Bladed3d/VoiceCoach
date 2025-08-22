import React, { useState } from 'react';

export function MinimalAudioCapture() {
  const [status, setStatus] = useState('Not capturing');
  const [stream, setStream] = useState<MediaStream | null>(null);

  const start = () => {
    navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      .then(s => {
        setStream(s);
        setStatus('Capturing');
        // Auto-stop when user stops sharing
        s.getTracks()[0].onended = () => stop();
      })
      .catch(() => setStatus('Failed or cancelled'));
  };

  const stop = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setStatus('Stopped');
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', color: '#000', backgroundColor: '#fff' }}>
      <h1 style={{ color: '#000' }}>Minimal Audio Capture</h1>
      
      <div style={{ 
        padding: '20px', 
        margin: '20px 0', 
        border: '2px solid #000',
        backgroundColor: '#f0f0f0',
        color: '#000'
      }}>
        <strong>Status:</strong> {status}
      </div>
      
      <button 
        onClick={stream ? stop : start}
        style={{
          padding: '15px 30px',
          fontSize: '18px',
          backgroundColor: stream ? '#f00' : '#0f0',
          color: '#000',
          border: '2px solid #000',
          cursor: 'pointer'
        }}
      >
        {stream ? 'STOP' : 'START'}
      </button>
      
      <div style={{ 
        marginTop: '30px', 
        padding: '20px', 
        backgroundColor: '#ddd',
        color: '#000'
      }}>
        <strong style={{ color: '#000' }}>How to use:</strong>
        <ol style={{ color: '#000' }}>
          <li>Click START</li>
          <li>Pick a tab with audio</li>
          <li>Check "Share tab audio"</li>
          <li>Click Share</li>
        </ol>
      </div>
    </div>
  );
}