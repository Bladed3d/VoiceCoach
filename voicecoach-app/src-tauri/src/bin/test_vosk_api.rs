// Test file to understand Vosk API return types
use vosk::{Model, Recognizer};

fn main() {
    println!("Testing Vosk API types...");
    
    // Try to load model
    let model_path = "../models/vosk-model-small-en-us-0.15";
    let model = match Model::new(model_path) {
        Some(m) => {
            println!("Model loaded successfully");
            m
        }
        None => {
            println!("Failed to load model from: {}", model_path);
            return;
        }
    };
    
    // Create recognizer
    let mut recognizer = match Recognizer::new(&model, 16000.0) {
        Some(r) => {
            println!("Recognizer created");
            r
        }
        None => {
            println!("Failed to create recognizer");
            return;
        }
    };
    
    // Test with dummy audio
    let dummy_audio: Vec<i16> = vec![0; 1600]; // 100ms of silence at 16kHz
    
    // Test accept_waveform
    match recognizer.accept_waveform(&dummy_audio) {
        Ok(state) => {
            println!("accept_waveform returned: {:?}", state);
            
            // Test result() method
            let result = recognizer.result();
            println!("result() type: {}", std::any::type_name_of_val(&result));
            
            // Try to access result fields
            match result {
                vosk::CompleteResult::Single(single) => {
                    println!("Single result text: '{}'", single.text);
                }
                vosk::CompleteResult::Multiple(multi) => {
                    println!("Multiple results, count: {}", multi.alternatives.len());
                    for (i, alt) in multi.alternatives.iter().enumerate() {
                        println!("  Alternative {}: '{}'", i, alt.text);
                    }
                }
            }
            
            // Test partial_result() method
            let partial = recognizer.partial_result();
            println!("partial_result() type: {}", std::any::type_name_of_val(&partial));
            println!("partial.partial value: '{}'", partial.partial);
        }
        Err(e) => {
            println!("accept_waveform error: {:?}", e);
        }
    }
}