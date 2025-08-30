@echo off
REM Test Single Instance Enforcement
echo 🧪 Testing VoiceCoach V2 Single Instance Enforcement
echo ================================================

REM Clean start
echo 🔧 Cleaning any existing processes...
taskkill //F //IM electron.exe >nul 2>&1
taskkill //F //IM python.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo ✅ Starting first instance...
start "VoiceCoach-Instance-1" /MIN cmd /c "cd /d %~dp0 && npm run dev"

REM Wait for first instance to fully start
echo ⏱️  Waiting 8 seconds for first instance to initialize...
timeout /t 8 /nobreak >nul

REM Check if first instance is running
tasklist | findstr electron.exe >nul
if %ERRORLEVEL% == 0 (
    echo ✅ First instance is running
    
    echo 🧪 Starting second instance (should be blocked)...
    start "VoiceCoach-Instance-2" /MIN cmd /c "cd /d %~dp0 && npm run dev"
    
    REM Wait and check
    timeout /t 5 /nobreak >nul
    
    REM Count Electron processes
    for /f %%i in ('tasklist ^| findstr electron.exe ^| find /c /v ""') do set COUNT=%%i
    
    if %COUNT% GTR 5 (
        echo ❌ FAIL: Found %COUNT% Electron processes - Single instance NOT working
        echo 🔧 Multiple instances detected - this should NOT happen
    ) else (
        echo ✅ SUCCESS: Only found %COUNT% Electron processes - Single instance working!
        echo 🎯 Second instance was properly blocked
    )
    
    echo 🧹 Cleaning up test processes...
    taskkill //F //IM electron.exe >nul 2>&1
    
) else (
    echo ❌ FAIL: First instance failed to start
    echo 🔧 Check for startup errors
)

echo ================================================
echo 🧪 Single Instance Test Complete
echo Press any key to exit...
pause >nul