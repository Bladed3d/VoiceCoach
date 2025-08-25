@echo off
echo Setting up MinGW environment for Tauri...
set PATH=C:\msys64\mingw64\bin;%PATH%
cd voicecoach-app

echo Building Rust backend first...
cargo build --manifest-path src-tauri/Cargo.toml
if %ERRORLEVEL% NEQ 0 (
    echo Build failed! Check errors above.
    pause
    exit /b 1
)

echo Build successful! Starting Tauri app...
npm run tauri dev