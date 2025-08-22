import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { SystemAudioSetup } from './SystemAudioSetup';

interface AudioSource {
  id: string;
  name: string;
  source_type: string;
  is_default: boolean;
  is_available: boolean;
}

export function TauriSystemAudioTest() {
  const [sources, setSources] = useState<AudioSource[]>([]);
  const [selectedMode, setSelectedMode] = useState<string>('system');
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState('');

  // Load available audio sources
  const loadSources = async () => {
    try {
      setStatus('Loading audio sources...');
      const audioSources = await invoke<AudioSource[]>('get_system_audio_sources');
      setSources(audioSources);
      setStatus(`Found ${audioSources.length} audio sources`);
      setError('');
    } catch (err: any) {
      setError(`Failed to get sources: ${err}`);
      setStatus('Error');
    }
  };

  // Start capturing audio
  const startCapture = async () => {
    try {
      setStatus(`Starting ${selectedMode} capture...`);
      setError('');
      
      const result = await invoke<string>('start_system_audio_capture', { mode: selectedMode });
      
      setIsCapturing(true);
      setStatus(result);
    } catch (err: any) {
      setError(`Failed to start capture: ${err}`);
      setStatus('Error');
      setIsCapturing(false);
    }
  };

  // Stop capturing audio
  const stopCapture = async () => {
    try {
      setStatus('Stopping capture...');
      
      const result = await invoke<string>('stop_system_audio_capture');
      
      setIsCapturing(false);
      setStatus(result);
    } catch (err: any) {
      setError(`Failed to stop capture: ${err}`);
      setStatus('Error');
    }
  };

  // Load sources on mount
  useEffect(() => {
    loadSources();
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#0f172a', 
      color: '#e2e8f0', 
      minHeight: '100vh', 
      fontFamily: 'system-ui' 
    }}>
      <h1>🔊 Tauri System Audio Capture Test</h1>
      <p style={{ color: '#94a3b8' }}>
        Using Rust cpal with WASAPI for Windows system audio capture
      </p>
      
      {/* Status Display */}
      <div style={{
        padding: '10px',
        marginBottom: '20px',
        backgroundColor: isCapturing ? '#065f46' : '#1e293b',
        borderRadius: '8px',
        border: `1px solid ${isCapturing ? '#10b981' : '#334155'}`
      }}>
        <strong>Status:</strong> {status}
        {isCapturing && (
          <span style={{ marginLeft: '10px', color: '#10b981' }}>
            🔴 Recording...
          </span>
        )}
      </div>

      {/* Audio Sources */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Available Audio Sources:</h3>
        <div style={{
          backgroundColor: '#1e293b',
          padding: '10px',
          borderRadius: '8px',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {sources.length === 0 ? (
            <p style={{ color: '#64748b' }}>No sources found</p>
          ) : (
            sources.map(source => (
              <div key={source.id} style={{
                padding: '8px',
                marginBottom: '5px',
                backgroundColor: source.is_default ? '#1f2937' : 'transparent',
                borderRadius: '4px',
                border: source.is_default ? '1px solid #3b82f6' : 'none'
              }}>
                <strong>{source.name}</strong>
                <br />
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Type: {source.source_type} | 
                  {source.is_default && ' Default | '}
                  {source.is_available ? ' ✅ Available' : ' ❌ Unavailable'}
                </span>
              </div>
            ))
          )}
        </div>
        <button
          onClick={loadSources}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh Sources
        </button>
      </div>

      {/* Capture Mode Selection */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Capture Mode:</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="radio"
              value="system"
              checked={selectedMode === 'system'}
              onChange={(e) => setSelectedMode(e.target.value)}
              disabled={isCapturing}
            />
            System Audio (YouTube, Meet, etc.)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="radio"
              value="microphone"
              checked={selectedMode === 'microphone'}
              onChange={(e) => setSelectedMode(e.target.value)}
              disabled={isCapturing}
            />
            Microphone Only
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="radio"
              value="dual"
              checked={selectedMode === 'dual'}
              onChange={(e) => setSelectedMode(e.target.value)}
              disabled={isCapturing}
            />
            Both (Dual Capture)
          </label>
        </div>
      </div>

      {/* Capture Controls */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={isCapturing ? stopCapture : startCapture}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: isCapturing ? '#dc2626' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          {isCapturing ? '⏹ Stop Capture' : '🎵 Start Capture'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#7f1d1d',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          ⚠️ {error}
          
          {/* Show setup instructions if sources failed to load */}
          {error.includes('Failed to get sources') && (
            <SystemAudioSetup />
          )}
        </div>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#1e293b',
        borderRadius: '8px',
        border: '1px solid #3b82f6'
      }}>
        <h3>📋 How to Test:</h3>
        <ol style={{ marginLeft: '20px' }}>
          <li>Click "Start Capture" with "System Audio" selected</li>
          <li>Open YouTube in your browser and play a video</li>
          <li>The audio from YouTube will be captured directly from Windows</li>
          <li>This also works with Google Meet, Zoom, or any other application</li>
          <li>No virtual audio cable needed - using native Windows WASAPI!</li>
        </ol>
        <p style={{ marginTop: '10px', color: '#fbbf24' }}>
          <strong>Note:</strong> On Windows, this uses WASAPI loopback capture to get system audio directly.
          On macOS/Linux, you'll need a virtual audio device (BlackHole/PulseAudio loopback).
        </p>
      </div>

      {/* Technical Details */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#020617',
        borderRadius: '8px',
        border: '1px solid #334155'
      }}>
        <h3>🔧 Technical Details:</h3>
        <ul style={{ marginLeft: '20px', fontSize: '14px' }}>
          <li>Using Rust cpal library with WASAPI backend</li>
          <li>Direct system audio capture without virtual cables</li>
          <li>Low latency audio streaming (~50ms)</li>
          <li>Ready for real-time transcription with Whisper</li>
          <li>Cross-platform support (Windows/macOS/Linux)</li>
        </ul>
      </div>
    </div>
  );
}