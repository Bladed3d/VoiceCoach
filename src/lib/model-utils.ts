/**
 * VoiceCoach V2 - Model Selection Utilities
 * Utilities for managing Ollama model selection
 */

/**
 * Get the currently selected Ollama model from localStorage
 * Falls back to default if not set or invalid
 */
export function getSelectedModel(): string {
  const defaultModel = 'llama3.1:8b-instruct-q4_K_M';
  
  try {
    const savedModel = localStorage.getItem('voicecoach-selected-model');
    if (savedModel && savedModel.trim().length > 0) {
      return savedModel;
    }
  } catch (error) {
    console.warn('Failed to get selected model from localStorage:', error);
  }
  
  return defaultModel;
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