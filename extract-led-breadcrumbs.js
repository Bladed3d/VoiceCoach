/**
 * LED Breadcrumb Extractor for VoiceCoach V2
 *
 * Run this script in the Browser DevTools Console while VoiceCoach V2 is running
 * to extract all LED breadcrumbs related to instruction file loading.
 *
 * INSTRUCTIONS:
 * 1. Open VoiceCoach V2 app (http://localhost:5175)
 * 2. Open DevTools Console (F12 or Ctrl+Shift+I)
 * 3. Paste this entire script into the console
 * 4. Press Enter to run it
 * 5. The script will show you:
 *    - Which instruction file is saved in Settings
 *    - Which instruction file is actually being loaded
 *    - Any LED breadcrumbs showing the loading process
 */

(function() {
    console.log('%c========================================', 'color: #60a5fa; font-weight: bold;');
    console.log('%c🔍 LED Breadcrumb Extractor for Instruction Files', 'color: #60a5fa; font-weight: bold; font-size: 16px;');
    console.log('%c========================================', 'color: #60a5fa; font-weight: bold;');
    console.log('');

    // Step 1: Check localStorage for saved settings
    console.log('%c📋 STEP 1: Checking localStorage Settings', 'color: #22c55e; font-weight: bold;');
    console.log('');

    const settingsKey = 'voicecoach_settings';
    const settingsRaw = localStorage.getItem(settingsKey);

    if (settingsRaw) {
        try {
            const settings = JSON.parse(settingsRaw);
            console.log('✅ Settings found in localStorage');
            console.log('');

            if (settings.ollama && settings.ollama.instructionFile) {
                console.log('%c📂 Selected Instruction File (from Settings):', 'color: #fbbf24; font-weight: bold;');
                console.log(`   ${settings.ollama.instructionFile}`);
                console.log('');

                // Store this for comparison
                window.__EXPECTED_INSTRUCTION_FILE = settings.ollama.instructionFile;
            } else {
                console.log('%c⚠️ No ollama.instructionFile found in settings', 'color: #ef4444; font-weight: bold;');
                console.log('   Using default: active-instructions.md');
                console.log('');
            }

            console.log('Full Ollama Settings:');
            console.log(settings.ollama);
            console.log('');
        } catch (error) {
            console.error('❌ Error parsing settings:', error);
            console.log('Raw settings value:', settingsRaw);
            console.log('');
        }
    } else {
        console.log('%c⚠️ No settings found in localStorage', 'color: #ef4444; font-weight: bold;');
        console.log('   Key checked:', settingsKey);
        console.log('');
    }

    // Step 2: Search browser console history for LED breadcrumbs
    console.log('%c🔎 STEP 2: LED Breadcrumb Search Instructions', 'color: #22c55e; font-weight: bold;');
    console.log('');
    console.log('To find LED breadcrumbs, follow these steps:');
    console.log('');
    console.log('1. In DevTools Console, use the Filter box and search for:');
    console.log('   %cLED 644', 'background: #3b82f6; color: white; padding: 2px 6px; border-radius: 3px;');
    console.log('');
    console.log('2. Look for these specific breadcrumbs:');
    console.log('   • LED 6442: Shows which instruction file was selected from settings');
    console.log('   • LED 6446: Shows which instruction file is being loaded');
    console.log('   • LED 6440: Shows successful load with file path');
    console.log('');
    console.log('3. If no LED breadcrumbs appear:');
    console.log('   a) Trigger a coaching action in the app');
    console.log('   b) Or reload the app to trigger initialization');
    console.log('');

    // Step 3: Install console interceptor for future LED messages
    console.log('%c🎯 STEP 3: Installing LED Breadcrumb Monitor', 'color: #22c55e; font-weight: bold;');
    console.log('');
    console.log('Installing real-time monitor for LED 6440-6447...');
    console.log('');

    // Only install once
    if (!window.__LED_MONITOR_INSTALLED) {
        const originalConsoleLog = console.log;

        console.log = function(...args) {
            const message = args.join(' ');

            // Check for instruction file related LEDs
            if (message.includes('LED 644')) {
                console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #fbbf24;');
                console.log('%c🎵 INSTRUCTION FILE LED DETECTED!', 'color: #fbbf24; font-weight: bold; font-size: 14px;');

                // Extract instruction file name if present
                const fileMatch = message.match(/instructionFile['":\s]+([a-zA-Z0-9_\-\.]+\.md)/);
                if (fileMatch) {
                    const detectedFile = fileMatch[1];
                    console.log('%c📂 Detected File:', 'color: #60a5fa; font-weight: bold;');
                    console.log(`   ${detectedFile}`);

                    if (window.__EXPECTED_INSTRUCTION_FILE && detectedFile !== window.__EXPECTED_INSTRUCTION_FILE) {
                        console.log('%c⚠️ MISMATCH DETECTED!', 'color: #ef4444; font-weight: bold; font-size: 14px;');
                        console.log(`   Expected: ${window.__EXPECTED_INSTRUCTION_FILE}`);
                        console.log(`   Actually loading: ${detectedFile}`);
                    } else if (window.__EXPECTED_INSTRUCTION_FILE) {
                        console.log('%c✅ Matches expected file', 'color: #22c55e; font-weight: bold;');
                    }
                }

                console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #fbbf24;');
                console.log('');
            }

            originalConsoleLog.apply(console, args);
        };

        window.__LED_MONITOR_INSTALLED = true;
        console.log('✅ Monitor installed! Will alert when LED 6440-6447 appear.');
        console.log('');
    } else {
        console.log('ℹ️ Monitor already installed.');
        console.log('');
    }

    // Step 4: Provide next steps
    console.log('%c📝 NEXT STEPS', 'color: #22c55e; font-weight: bold;');
    console.log('');
    console.log('1. Trigger a coaching action to generate LED breadcrumbs');
    console.log('2. Watch this console for LED 644x messages');
    console.log('3. The monitor will automatically highlight any mismatches');
    console.log('');
    console.log('%c========================================', 'color: #60a5fa; font-weight: bold;');
    console.log('');

})();
