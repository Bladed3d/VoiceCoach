fn main() {
    // Link Vosk library
    println!("cargo:rustc-link-search=D:/Projects/Ai/VoiceCoach/vosk-win64-0.3.45");
    println!("cargo:rustc-link-lib=static=libvosk");
    
    tauri_build::build()
}