import React, { useState, useEffect, useRef } from 'react';

export function AudioTestDebug() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Start recording with REAL audio level monitoring
  const startRecording = async () => {
    try {
      setError('');
      setTranscript(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting microphone...`]);
      
      // Get microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      
      setStream(mediaStream);
      setTranscript(prev => [...prev, `✅ Microphone access granted`]);
      
      // Create Web Audio API context for real audio levels
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      // Connect microphone to analyser
      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);
      
      // Create media recorder for potential transcription
      const mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setTranscript(prev => [...prev, `📦 Audio recorded: ${(blob.size / 1024).toFixed(2)}KB`]);
      };
      
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
      // Start monitoring audio levels
      monitorAudioLevels();
      
    } catch (err: any) {
      setError(`Failed to start recording: ${err.message}`);
      setTranscript(prev => [...prev, `❌ Error: ${err.message}`]);
    }
  };

  // Monitor real audio levels
  const monitorAudioLevels = () => {
    if (!analyserRef.current) return;
    
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let frameCount = 0;
    
    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      let max = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
        if (dataArray[i] > max) max = dataArray[i];
      }
      const average = sum / dataArray.length;
      const normalizedLevel = Math.min(100, (average / 128) * 100);
      
      // Debug every 30 frames (about once per second)
      frameCount++;
      if (frameCount % 30 === 0) {
        setTranscript(prev => [...prev, 
          `📊 Audio Data: avg=${average.toFixed(2)}, max=${max}, level=${normalizedLevel.toFixed(1)}%, samples=${dataArray.length}`
        ]);
        
        // Check if we're getting any data
        if (max === 0) {
          setTranscript(prev => [...prev, `⚠️ No audio data detected! Check microphone permissions.`]);
        }
      }
      
      setAudioLevel(normalizedLevel);
      
      if (isRecording) {
        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      }
    };
    
    checkAudioLevel();
  };

  // Stop recording
  const stopRecording = () => {
    setTranscript(prev => [...prev, `[${new Date().toLocaleTimeString()}] Stopping recording...`]);
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop media stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    setIsRecording(false);
    setAudioLevel(0);
    setTranscript(prev => [...prev, `✅ Recording stopped`]);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isRecording]);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#1e293b', color: '#e2e8f0', minHeight: '100vh' }}>
      <h1 style={{ color: '#60a5fa' }}>🔧 Audio Debug Test (Real Levels)</h1>
      
      {/* Status */}
      <div style={{
        padding: '10px',
        backgroundColor: isRecording ? '#065f46' : '#1e40af',
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        Status: {isRecording ? '🔴 RECORDING' : '⏸️ STOPPED'}
      </div>

      {/* Controls */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: isRecording ? '#dc2626' : '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {isRecording ? '⏹️ Stop' : '🎤 Start Microphone'}
        </button>
      </div>

      {/* Real Audio Level */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Real Audio Level: {audioLevel.toFixed(1)}%</h3>
        <div style={{
          width: '100%',
          height: '30px',
          backgroundColor: '#374151',
          borderRadius: '5px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${audioLevel}%`,
            height: '100%',
            backgroundColor: audioLevel > 70 ? '#ef4444' : audioLevel > 40 ? '#f59e0b' : '#10b981',
            transition: 'width 0.05s ease'
          }} />
        </div>
        <p style={{ fontSize: '12px', marginTop: '5px', color: '#9ca3af' }}>
          {audioLevel > 5 ? '🎤 Sound detected!' : '🔇 Silence (speak louder or check mic)'}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#7f1d1d',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Debug Log */}
      <div>
        <h3>Debug Log:</h3>
        <div style={{
          padding: '10px',
          backgroundColor: '#111827',
          borderRadius: '5px',
          height: '200px',
          overflowY: 'auto',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          {transcript.map((line, i) => (
            <div key={i} style={{ marginBottom: '2px' }}>{line}</div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#1f2937',
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        <h3>📋 What This Tests:</h3>
        <ul style={{ marginLeft: '20px' }}>
          <li>✅ Real microphone access (not mocked)</li>
          <li>✅ Web Audio API for actual audio levels</li>
          <li>✅ MediaRecorder API for recording</li>
          <li>✅ No Electron/Tauri dependencies</li>
        </ul>
        <p style={{ marginTop: '10px', color: '#fbbf24' }}>
          <strong>Expected:</strong> When you speak, the green bar should move with your voice.
        </p>
      </div>
    </div>
  );
}