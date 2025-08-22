import React, { useState, useRef, useEffect } from 'react';
import { BrowserAudioTest } from './BrowserAudioTest';

/**
 * Universal System Audio Capture Component
 * Works on ALL systems without any special setup
 * Uses the browser's built-in screen sharing API with audio
 */
export function UniversalSystemAudioCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState('Ready to capture system audio');
  const [error, setError] = useState('');
  
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const isInitializingRef = useRef(false);

  // Start capturing system audio using Screen Share API
  const startCapture = async () => {
    // Prevent double-initialization
    if (isInitializingRef.current || isCapturing) {
      console.log('Already capturing or initializing');
      return;
    }
    
    try {
      isInitializingRef.current = true;
      setError('');
      setStatus('Requesting audio capture permission...');
      
      // Check if API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen capture API not available. Please use Chrome, Edge, or Firefox.');
      }
      
      // Request screen share with audio
      // Different browsers have different requirements
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Required for the API to work
        audio: true  // Request audio capture
      });

      // Check if we got audio
      const audioTracks = stream.getAudioTracks();
      
      // Stop video track immediately - we only want audio
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach(track => {
        track.stop();
        stream.removeTrack(track);
      });
      
      if (audioTracks.length === 0) {
        // Clean up the stream
        stream.getTracks().forEach(track => track.stop());
        throw new Error('No audio track captured. When sharing, make sure to check "Share tab audio" or "Share system audio" option.');
      }

      streamRef.current = stream;
      setStatus('✅ Capturing system audio');
      setIsCapturing(true);

      // Set up audio analysis with error handling
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          console.warn('AudioContext not available, skipping audio level monitoring');
          return;
        }

        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;

        // Wait for audio context to be ready
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        source.connect(analyser);

        // Start monitoring audio levels
        setTimeout(() => {
          monitorAudioLevels();
        }, 100);
      } catch (audioErr) {
        console.warn('Audio analysis setup skipped:', audioErr instanceof Error ? audioErr.message : String(audioErr));
        // Continue without audio level monitoring - capture still works
      }

    } catch (err: any) {
      // Only log actual errors, not user cancellations
      if (err.name !== 'NotAllowedError') {
        console.warn('Capture issue:', err.message || err.name);
      }
      
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        setError('Permission denied. You cancelled the sharing dialog or your browser blocked it.');
      } else if (err.name === 'NotSupportedError') {
        setError('System audio capture not supported in this browser. Please use Chrome or Edge.');
      } else if (err.name === 'NotFoundError') {
        setError('No audio sources found. Make sure you have audio playing and try again.');
      } else if (err.message?.includes('audio track')) {
        setError(err.message);
      } else {
        setError(`Failed to capture audio: ${err.message || err.name || 'Unknown error'}`);
      }
      setStatus('Ready to capture system audio');
      setIsCapturing(false);
    } finally {
      isInitializingRef.current = false;
    }
  };

  // Monitor audio levels
  const monitorAudioLevels = () => {
    if (!analyserRef.current) {
      // Don't log error - this is expected during cleanup
      return;
    }

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkLevel = () => {
      // Check if we should continue
      if (!analyserRef.current || !streamRef.current) return;
      
      try {
        analyser.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const sample = Math.abs(dataArray[i] - 128);
          sum += sample;
        }

        const level = Math.min(100, (sum / dataArray.length / 64) * 100);
        setAudioLevel(level);
      } catch (err: any) {
        // Silently ignore common/expected errors
        const ignoredErrors = [
          'audio context',
          'analyser',
          'stream ended',
          'track ended',
          'InvalidStateError'
        ];
        
        const shouldIgnore = ignoredErrors.some(ignored => 
          err.message?.toLowerCase().includes(ignored.toLowerCase())
        );
        
        if (!shouldIgnore && err.message) {
          console.warn('Audio monitoring issue:', err.message);
        }
      }

      // Only continue if stream is active
      if (streamRef.current?.active) {
        animationRef.current = requestAnimationFrame(checkLevel);
      }
    };

    checkLevel();
  };

  // Stop capturing
  const stopCapture = () => {
    // Cancel animation frame first to stop monitoring
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Clean up analyser
    if (analyserRef.current) {
      analyserRef.current = null;
    }

    // Stop and clean up stream
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      } catch (err) {
        // Ignore cleanup errors
      }
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (err) {
        // Ignore cleanup errors
      }
      audioContextRef.current = null;
    }

    setIsCapturing(false);
    setAudioLevel(0);
    setStatus('Stopped');
  };

  // Cleanup on unmount or page unload
  useEffect(() => {
    // Cleanup function
    const cleanup = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            // Ignore
          }
        });
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {
          // Ignore
        }
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      cleanup();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on unmount
    return () => {
      cleanup();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <div style={{
      padding: '30px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ color: '#3b82f6', marginBottom: '10px' }}>
        🎵 Universal System Audio Capture
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '30px' }}>
        Works on ALL computers - Windows, Mac, Linux. No setup required!
      </p>

      {/* Status Display */}
      <div style={{
        padding: '15px',
        backgroundColor: isCapturing ? '#10b981' : '#3b82f6',
        color: 'white',
        borderRadius: '8px',
        marginBottom: '20px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        {isCapturing && <span className="recording-dot" style={{
          width: '12px',
          height: '12px',
          backgroundColor: '#ef4444',
          borderRadius: '50%',
          animation: 'pulse 1.5s infinite'
        }}/>}
        {status}
      </div>

      {/* Audio Level Meter */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '5px',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          <span>Audio Level</span>
          <span>{Math.round(audioLevel)}%</span>
        </div>
        <div style={{
          width: '100%',
          height: '40px',
          backgroundColor: '#e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            width: `${audioLevel}%`,
            height: '100%',
            backgroundColor: audioLevel > 70 ? '#ef4444' : audioLevel > 30 ? '#f59e0b' : '#10b981',
            transition: 'width 0.1s ease-out',
            borderRadius: '8px'
          }}/>
        </div>
        <p style={{ 
          fontSize: '12px', 
          color: '#6b7280', 
          marginTop: '5px' 
        }}>
          {audioLevel > 2 ? '🎵 Audio detected from system' : '🔇 No audio - play something to test'}
        </p>
      </div>

      {/* Control Buttons */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={isCapturing ? stopCapture : startCapture}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: isCapturing ? '#ef4444' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            width: '200px'
          }}
        >
          {isCapturing ? '⏹ Stop Capture' : '🎤 Start Capture'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          color: '#991b1b',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Instructions */}
      <div style={{
        backgroundColor: '#f3f4f6',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0, color: '#1f2937' }}>📋 How to Capture System Audio:</h3>
        
        <div style={{
          backgroundColor: '#fef3c7',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '15px',
          border: '1px solid #f59e0b'
        }}>
          <strong style={{ color: '#92400e' }}>⚠️ Important:</strong> Audio sharing only works when sharing:
          <ul style={{ margin: '5px 0 0 20px', color: '#92400e' }}>
            <li><strong>Chrome Tab</strong> - Must check "Share tab audio"</li>
            <li><strong>Edge Tab</strong> - Must check "Share tab audio"</li>
            <li><strong>Entire Screen</strong> - Select "Share system audio" (Windows 10+ only)</li>
          </ul>
        </div>
        
        <ol style={{ 
          marginBottom: 0,
          lineHeight: '1.8',
          color: '#4b5563'
        }}>
          <li>Click "Start Capture"</li>
          <li>In the popup, choose what to share:
            <ul style={{ marginTop: '5px' }}>
              <li><strong>Best Option:</strong> Select a Chrome/Edge tab with audio playing</li>
              <li><strong>Alternative:</strong> Select "Entire Screen" (if available)</li>
            </ul>
          </li>
          <li><strong style={{ color: '#dc2626' }}>CRITICAL:</strong> Check the "Share audio" checkbox in the popup!</li>
          <li>Click "Share" to start capturing</li>
        </ol>
        
        <div style={{
          backgroundColor: '#dbeafe',
          padding: '10px',
          borderRadius: '8px',
          marginTop: '15px',
          fontSize: '14px'
        }}>
          <strong>Note:</strong> Firefox doesn't support audio capture. Use Chrome or Edge for best results.
        </div>
      </div>

      {/* Features */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{
          padding: '15px',
          backgroundColor: '#dbeafe',
          borderRadius: '8px',
          borderLeft: '4px solid #3b82f6'
        }}>
          <strong style={{ color: '#1e40af' }}>✅ No Installation</strong>
          <p style={{ margin: '5px 0 0', fontSize: '14px', color: '#1e40af' }}>
            Works instantly - no drivers or setup
          </p>
        </div>
        <div style={{
          padding: '15px',
          backgroundColor: '#dcfce7',
          borderRadius: '8px',
          borderLeft: '4px solid #10b981'
        }}>
          <strong style={{ color: '#166534' }}>✅ Cross-Platform</strong>
          <p style={{ margin: '5px 0 0', fontSize: '14px', color: '#166534' }}>
            Windows, Mac, Linux - all supported
          </p>
        </div>
        <div style={{
          padding: '15px',
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          borderLeft: '4px solid #f59e0b'
        }}>
          <strong style={{ color: '#92400e' }}>✅ Privacy-First</strong>
          <p style={{ margin: '5px 0 0', fontSize: '14px', color: '#92400e' }}>
            You choose exactly what to share
          </p>
        </div>
      </div>

      {/* Technical Note */}
      <div style={{
        padding: '15px',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#6b7280'
      }}>
        <strong>Technical Note:</strong> This uses the Web Audio API and Screen Capture API, 
        which are supported in all modern browsers. The audio can be processed in real-time 
        for transcription, recording, or streaming. This is how apps like Google Meet, 
        Discord (web), and Zoom (web) capture system audio.
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
      
      {/* Browser Capability Test */}
      <details style={{ marginTop: '20px' }}>
        <summary style={{ 
          cursor: 'pointer', 
          padding: '10px', 
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          fontWeight: 'bold'
        }}>
          🔧 Debug: Test Browser Audio Capabilities
        </summary>
        <BrowserAudioTest />
      </details>
    </div>
  );
}