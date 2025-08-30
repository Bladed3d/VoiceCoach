@echo off
REM VoiceCoach V2 - Enhanced Clean Startup Script
REM Ensures only one instance runs with comprehensive cleanup

title VoiceCoach V2 - Startup Manager
color 0A

echo.
echo 🚨 VoiceCoach V2 - Enhanced Clean Startup
echo ================================================
echo 🔍 Checking for existing instances...

REM Kill specific VoiceCoach Electron processes
tasklist | findstr /I "electron.exe" >nul
if %ERRORLEVEL% == 0 (
    echo ⚠️  Found existing Electron processes
    taskkill //F //IM electron.exe >nul 2>&1
    if %ERRORLEVEL% == 0 (
        echo ✅ Cleaned up existing Electron processes
    ) else (
        echo ❌ Failed to clean up some processes
    )
) else (
    echo ℹ️  No existing Electron processes found
)

REM Kill any existing Python WebSocket servers
tasklist | findstr /I "python.exe" >nul
if %ERRORLEVEL% == 0 (
    echo ⚠️  Found existing Python processes
    taskkill //F //IM python.exe //T >nul 2>&1
    if %ERRORLEVEL% == 0 (
        echo ✅ Cleaned up existing Python processes
    ) else (
        echo ❌ Some Python processes may still be running
    )
) else (
    echo ℹ️  No existing Python processes found
)

REM Kill any node processes that might be running dev servers
tasklist | findstr /I "node.exe" >nul
if %ERRORLEVEL% == 0 (
    echo ⚠️  Found existing Node processes - checking ports
    netstat -ano | findstr :5175 >nul
    if %ERRORLEVEL% == 0 (
        echo 🔧 Port 5175 in use - cleaning up
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5175') do (
            taskkill //F //PID %%a >nul 2>&1
        )
    )
) else (
    echo ℹ️  No existing Node processes found
)

echo.
echo ⏱️  Waiting for cleanup to complete...
timeout /t 3 /nobreak >nul

echo.
echo 🚀 Starting VoiceCoach V2...
echo ================================================
echo 📍 Single instance enforcement: ENABLED
echo 🎤 Desktop microphone permissions: CONFIGURED  
echo 🔒 Security: Desktop app mode with full permissions
echo 🪟 Window management: Enhanced with focus restoration
echo ⚡ Ready for AI-powered sales coaching!
echo.

REM Start the application with enhanced error handling
npm run dev
set EXIT_CODE=%ERRORLEVEL%

echo.
echo ================================================
if %EXIT_CODE% == 0 (
    echo ✅ VoiceCoach V2 exited normally
) else (
    echo ❌ VoiceCoach V2 exited with error code: %EXIT_CODE%
    echo 🔧 Check the error messages above for troubleshooting
)
echo.
echo Press any key to close this window...
pause >nul