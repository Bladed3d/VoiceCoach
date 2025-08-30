@echo off
echo Installing Python dependencies for VoiceCoach V2...
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
)

REM Install Python packages
echo Installing required Python packages...
pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python packages
    echo Please check your internet connection and try again
    pause
    exit /b 1
)

echo.
echo ✅ Python dependencies installed successfully!
echo.
echo Next steps:
echo 1. Run: npm install
echo 2. Run: npm run dev
echo 3. Click "Start Coaching Session" to test
echo.
pause