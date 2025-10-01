/**
 * VoiceCoach V2 - Model Selection Utilities
 * Utilities for managing Ollama model selection
 */

/**
 * Get the currently selected Ollama model from localStorage
 * Falls back to default if not set or invalid
 */
export function getSelectedModel(): string {
  console.log('🔍 getSelectedModel() called - checking both localStorage keys...');

  try {
    // First try the main settings object (used by SplitView dropdown)
    const savedSettings = localStorage.getItem('voicecoach-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        const modelFromSettings = settings.ollama?.model;
        if (modelFromSettings && modelFromSettings.trim().length > 0) {
          console.log('✅ Using model from voicecoach-settings:', modelFromSettings);
          return modelFromSettings;
        }
      } catch (e) {
        console.error('Failed to parse voicecoach-settings:', e);
      }
    }

    // Fallback to direct model key
    const savedModel = localStorage.getItem('voicecoach-selected-model');
    if (savedModel && savedModel.trim().length > 0) {
      console.log('✅ Using model from voicecoach-selected-model:', savedModel);
      return savedModel;
    }

    // Final fallback
    console.log('⚠️ No model found in localStorage, using default: qwen2.5:14b-instruct-q4_k_m');
    return 'qwen2.5:14b-instruct-q4_k_m';
  } catch (error) {
    console.error('❌ Model selection system error:', error);
    return 'qwen2.5:14b-instruct-q4_k_m';
  }
}

/**
 * Save the selected model to localStorage
 */
export function saveSelectedModel(modelName: string): void {
  try {
    localStorage.setItem('voicecoach-selected-model', modelName);
    console.log(`🎵 Model selection saved: ${modelName}`);
  } catch (error) {
    console.error('Failed to save selected model to localStorage:', error);
  }
}

/**
 * Get a display name for a model (removes version info for cleaner display)
 */
export function getModelDisplayName(modelName: string): string {
  if (!modelName) return 'Unknown';
  
  // Split by colon and take first two parts for display
  const parts = modelName.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return parts[0];
}