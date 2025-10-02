#!/usr/bin/env python3
"""
MyUI ParaThinker App Launcher
Cleans up ports and processes before launching Streamlit app
"""

import subprocess
import socket
import time
import sys
import os

DEFAULT_PORT = 8501
APP_FILE = "myui-app.py"

def check_port_in_use(port):
    """Check if port is currently in use"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(1)
            result = sock.connect_ex(('localhost', port))
            return result == 0
    except Exception:
        return False

def cleanup_port(port):
    """Kill processes using the specified port"""
    print(f"[INFO] Cleaning up port {port}...")
    
    try:
        # Find processes using the port (Windows)
        netstat_cmd = f'netstat -ano | findstr :{port}'
        result = subprocess.run(netstat_cmd, shell=True, capture_output=True, text=True)
        
        if result.stdout:
            lines = result.stdout.strip().split('\n')
            pids = set()
            
            for line in lines:
                parts = line.split()
                if len(parts) >= 5 and f':{port}' in parts[1]:
                    pid = parts[-1]
                    if pid.isdigit():
                        pids.add(pid)
            
            if pids:
                print(f"[INFO] Found {len(pids)} process(es) using port {port}: {', '.join(pids)}")
                
                # Kill the processes
                for pid in pids:
                    try:
                        subprocess.run(f'taskkill /F /PID {pid}', shell=True, check=True, 
                                     capture_output=True)
                        print(f"[SUCCESS] Killed process PID {pid}")
                    except subprocess.CalledProcessError as e:
                        print(f"[WARNING] Could not kill process PID {pid}: {e}")
                
                # Wait for cleanup
                print("[INFO] Waiting for cleanup...")
                time.sleep(3)
                
                # Verify port is free
                if not check_port_in_use(port):
                    print(f"[SUCCESS] Port {port} is now available")
                else:
                    print(f"[WARNING] Port {port} may still be in use")
            else:
                print(f"[INFO] No processes found using port {port}")
        else:
            print(f"[INFO] Port {port} appears to be available")
            
    except Exception as e:
        print(f"[ERROR] Port cleanup failed: {e}")

def cleanup_old_streamlit_processes():
    """Kill any remaining Streamlit processes"""
    print("Cleaning up old Streamlit processes...")
    
    try:
        # Kill any streamlit processes
        subprocess.run('taskkill /F /IM streamlit.exe', shell=True, 
                      capture_output=True)
        subprocess.run('taskkill /F /IM python.exe /FI "COMMANDLINE eq *streamlit*"', 
                      shell=True, capture_output=True)
        print("[SUCCESS] Old Streamlit processes cleaned")
    except Exception as e:
        print(f"[INFO] No old Streamlit processes found: {e}")

def launch_app():
    """Launch the Streamlit app"""
    # Get the directory where this launcher script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    app_path = os.path.join(script_dir, APP_FILE)

    # Change to the script directory to ensure we're in the right location
    os.chdir(script_dir)

    if not os.path.exists(app_path):
        print(f"App file {app_path} not found!")
        return False
    
    print(f"Launching MyUI ParaThinker App...")
    print(f"Working Directory: {script_dir}")
    print(f"App File: {app_path}")
    print(f"Will be available at: http://localhost:{DEFAULT_PORT}")
    print("=" * 50)
    
    try:
        # Launch Streamlit with clean environment using absolute path
        subprocess.run([
            sys.executable, "-m", "streamlit", "run", app_path,
            "--server.port", str(DEFAULT_PORT),
            "--server.headless", "false",
            "--browser.gatherUsageStats", "false",
            "--server.address", "localhost"
        ], check=True)
        
    except KeyboardInterrupt:
        print("\nApp stopped by user")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to launch app: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False

def main():
    """Main launcher function"""
    print("MyUI ParaThinker App Launcher")
    print("=" * 40)
    
    # Step 1: Cleanup old processes
    cleanup_old_streamlit_processes()
    
    # Step 2: Cleanup port
    if check_port_in_use(DEFAULT_PORT):
        cleanup_port(DEFAULT_PORT)
    else:
        print(f"[SUCCESS] Port {DEFAULT_PORT} is available")
    
    # Step 3: Final verification
    time.sleep(1)
    if check_port_in_use(DEFAULT_PORT):
        print(f"Warning: Port {DEFAULT_PORT} still appears busy")
        response = input("Continue anyway? (y/N): ")
        if response.lower() != 'y':
            print("Launch cancelled")
            return
    
    # Step 4: Launch app
    print("\nEnvironment is clean. Starting app...")
    launch_app()

if __name__ == "__main__":
    main()