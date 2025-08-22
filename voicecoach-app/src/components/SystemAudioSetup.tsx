import React from 'react';

export function SystemAudioSetup() {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#1e293b', 
      borderRadius: '12px',
      margin: '20px',
      border: '2px solid #3b82f6',
      color: '#e2e8f0'
    }}>
      <h2 style={{ color: '#3b82f6', marginBottom: '20px' }}>
        🎙️ Enable System Audio Capture (YouTube, Google Meet, etc.)
      </h2>
      
      <div style={{ 
        backgroundColor: '#10b981', 
        color: '#000', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px',
        fontWeight: 'bold'
      }}>
        ✅ Good News: You have NVIDIA Virtual Audio Device installed! This can capture system audio.
      </div>

      <div style={{ 
        backgroundColor: '#3b82f6', 
        color: '#fff', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <strong>Quick Setup for Your System:</strong>
        <ol style={{ marginTop: '10px' }}>
          <li>Open Windows Settings → System → Sound</li>
          <li>Under "Advanced", click "More sound settings"</li>
          <li>In Recording tab, look for:
            <ul>
              <li><strong>NVIDIA Virtual Audio Device</strong> (you have this!)</li>
              <li><strong>Stereo Mix</strong> (if available)</li>
              <li><strong>ASUS Utility</strong> (might work for capture)</li>
            </ul>
          </li>
          <li>Enable the device you want to use</li>
          <li>In VoiceCoach, select that device for recording</li>
        </ol>
      </div>

      <h3>Option 1: Enable Windows Stereo Mix</h3>
      
      <div style={{ 
        backgroundColor: '#312e81', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '15px'
      }}>
        <strong>For Windows 11:</strong>
      </div>
      <ol style={{ lineHeight: '1.8' }}>
        <li>Right-click the <strong>speaker icon</strong> in system tray and select <strong>"Sound settings"</strong></li>
        <li>Scroll down and click <strong>"More sound settings"</strong> (opens classic panel)</li>
        <li>In the Sound window, go to <strong>"Recording"</strong> tab</li>
        <li>Right-click anywhere in the empty white space</li>
        <li>Check both <strong>"Show Disconnected Devices"</strong> and <strong>"Show Disabled Devices"</strong></li>
        <li>Look for <strong>"Stereo Mix"</strong> (might be grayed out)</li>
        <li>If you see it:
          <ul>
            <li>Right-click "Stereo Mix" and select <strong>"Enable"</strong></li>
            <li>Right-click again and select <strong>"Set as Default Device"</strong></li>
          </ul>
        </li>
        <li>Click OK to save</li>
      </ol>

      <div style={{ 
        backgroundColor: '#4c1d95', 
        padding: '15px', 
        borderRadius: '8px',
        marginTop: '15px'
      }}>
        <strong>Alternative for Windows 10:</strong>
        <ol>
          <li>Press <strong>Win + X</strong> and select <strong>"System"</strong></li>
          <li>Click <strong>"Sound"</strong> in the right panel</li>
          <li>Click <strong>"Sound Control Panel"</strong> on the right</li>
          <li>Follow steps 3-8 above</li>
        </ol>
      </div>

      <div style={{ 
        backgroundColor: '#065f46', 
        padding: '15px', 
        borderRadius: '8px',
        marginTop: '20px',
        marginBottom: '20px'
      }}>
        <strong>✅ Once enabled:</strong> Your VoiceCoach app will automatically detect and use Stereo Mix to capture:
        <ul style={{ marginTop: '10px' }}>
          <li>YouTube videos</li>
          <li>Google Meet calls</li>
          <li>Zoom conferences</li>
          <li>Any audio playing on your computer</li>
        </ul>
      </div>

      <h3>Option 2: If Stereo Mix Doesn't Exist (Common on Laptops)</h3>
      <div style={{ 
        backgroundColor: '#7c2d12', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '15px'
      }}>
        <strong>⚠️ Important:</strong> Many modern laptops (especially with Realtek audio) don't have Stereo Mix at all, even when "Show Disabled Devices" is checked. This is normal - you'll need a virtual audio cable instead.
      </div>
      <p><strong>Use a Virtual Audio Cable (Free):</strong></p>
      <ol style={{ lineHeight: '1.8' }}>
        <li>Download <strong>VB-Audio Virtual Cable</strong> (free) from vb-audio.com</li>
        <li>Install it (requires restart)</li>
        <li>In Windows Sound settings:
          <ul>
            <li>Set <strong>Playback</strong> device to "CABLE Input"</li>
            <li>Set <strong>Recording</strong> device to "CABLE Output"</li>
          </ul>
        </li>
        <li>To hear audio yourself, use the included "Audio Repeater" tool</li>
      </ol>

      <h3>Option 3: Using OBS Studio (If You Already Have It)</h3>
      <div style={{ 
        backgroundColor: '#1e3a8a', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <p>If you have OBS Studio installed, it includes a virtual audio cable:</p>
        <ol>
          <li>Open OBS Studio</li>
          <li>Go to Tools → <strong>VirtualCam</strong></li>
          <li>Start Virtual Camera</li>
          <li>In Windows Sound settings, you'll see <strong>"OBS Virtual Audio"</strong></li>
          <li>Use that as your recording device</li>
        </ol>
      </div>

      <h3>Testing Your Setup</h3>
      <div style={{ 
        backgroundColor: '#1f2937', 
        padding: '15px', 
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <p><strong>To test if it's working:</strong></p>
        <ol>
          <li>Open Windows Sound settings → Recording tab</li>
          <li>Play a YouTube video</li>
          <li>You should see the level meter moving next to "Stereo Mix"</li>
          <li>In VoiceCoach, select "Stereo Mix" as your input device</li>
          <li>Start recording - it will capture the YouTube audio!</li>
        </ol>
      </div>

      <div style={{ 
        backgroundColor: '#7f1d1d', 
        padding: '15px', 
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <strong>Note:</strong> The Tauri backend compilation failed due to a Rust toolchain issue. 
        Once you enable Stereo Mix, the existing recording features will capture system audio. 
        To fix the Rust issue later, run: <code>rustup target add x86_64-pc-windows-gnu</code>
      </div>
    </div>
  );
}