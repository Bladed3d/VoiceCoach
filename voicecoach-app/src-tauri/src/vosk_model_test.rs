#[cfg(test)]
mod tests {
    use super::vosk_model_manager::*;
    
    #[test]
    fn test_model_manager_creation() {
        // Test that the model manager can be created
        let result = VoskModelManager::new();
        assert!(result.is_ok(), "VoskModelManager should be created successfully");
        
        let manager = result.unwrap();
        assert_eq!(manager.get_default_model_name(), "vosk-model-small-en-us-0.15");
        
        let available_models = manager.get_available_models();
        assert!(!available_models.is_empty(), "Should have at least one available model");
        assert_eq!(available_models[0].name, "vosk-model-small-en-us-0.15");
        assert_eq!(available_models[0].size_mb, 40);
    }
    
    #[test]
    fn test_model_path_generation() {
        let manager = VoskModelManager::new().unwrap();
        let model_name = "vosk-model-small-en-us-0.15";
        let path = manager.get_model_path(model_name);
        
        assert!(path.to_string_lossy().contains("models"));
        assert!(path.to_string_lossy().contains(model_name));
    }
    
    #[test]
    fn test_model_availability_check() {
        let manager = VoskModelManager::new().unwrap();
        let model_name = "nonexistent-model";
        
        // This should return false for a non-existent model
        assert!(!manager.is_model_available(model_name));
    }
}