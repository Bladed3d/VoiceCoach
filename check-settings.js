/**
 * Diagnostic: Check what instruction file is actually being used
 * Run in browser console while app is open
 */

console.log('=== INSTRUCTION FILE DIAGNOSTIC ===');

// 1. Check localStorage
const savedSettings = localStorage.getItem('voicecoach-settings');
if (savedSettings) {
  const settings = JSON.parse(savedSettings);
  console.log('📋 localStorage settings:', {
    instructionFile: settings.ollama?.instructionFile,
    fullOllamaSettings: settings.ollama
  });
} else {
  console.log('❌ No settings found in localStorage');
}

// 2. Check OllamaPromptService status
(async () => {
  const { ollamaPromptService } = await import('./src/services/coaching/OllamaPromptService.ts');
  console.log('🔧 OllamaPromptService status:', ollamaPromptService.getStatus());
})();

// 3. Check what template is actually loaded
console.log('💡 To check loaded template, look for LED breadcrumbs:');
console.log('   - LED 6442: Shows selected instruction file');
console.log('   - LED 6440: Shows successfully loaded file');
console.log('   - LED 6446: Shows template path being loaded');

console.log('\n🔍 Filter console for: LED 6440 or LED 6442 or LED 6446');
