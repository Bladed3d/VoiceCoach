/**
 * Debug script to check which instruction file is being used
 * This queries the localStorage settings that VoiceCoach V2 uses
 */

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════');
console.log('🎵 VoiceCoach V2 - Instruction File Debug Tool');
console.log('═══════════════════════════════════════════════════════════\n');

// Check what instruction files are available
const promptsDir = path.join(__dirname, 'ollama-prompts');
console.log('📁 Available instruction files in ollama-prompts/:');
console.log('─────────────────────────────────────────────────────────');

try {
    const files = fs.readdirSync(promptsDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    mdFiles.forEach((file, index) => {
        const stats = fs.statSync(path.join(promptsDir, file));
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`${index + 1}. ${file} (${sizeKB} KB)`);
    });

    console.log(`\n✅ Found ${mdFiles.length} instruction files\n`);
} catch (error) {
    console.error('❌ Error reading ollama-prompts directory:', error.message);
}

// Check Electron userData location
console.log('📂 Checking Electron userData locations:');
console.log('─────────────────────────────────────────────────────────');

const possiblePaths = [
    path.join(process.env.APPDATA, 'voicecoach-v2'),
    path.join(process.env.LOCALAPPDATA, 'voicecoach-v2'),
    path.join(process.env.USERPROFILE, '.config', 'voicecoach-v2'),
];

let foundUserData = false;
possiblePaths.forEach(p => {
    if (fs.existsSync(p)) {
        console.log(`✅ Found: ${p}`);
        foundUserData = true;

        // Look for settings files
        try {
            const files = fs.readdirSync(p);
            files.forEach(f => {
                if (f.includes('settings') || f.includes('LocalStorage')) {
                    console.log(`   📄 ${f}`);
                }
            });
        } catch (e) {
            console.log(`   ⚠️  Could not read directory: ${e.message}`);
        }
    } else {
        console.log(`❌ Not found: ${p}`);
    }
});

if (!foundUserData) {
    console.log('\n⚠️  No Electron userData directory found.');
    console.log('   Settings are likely stored in browser localStorage');
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔍 How to check which instruction file is ACTUALLY being used:');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('1️⃣  Open the Electron app DevTools (should auto-open or press Ctrl+Shift+I)');
console.log('');
console.log('2️⃣  In the Console tab, run this command:');
console.log('   ');
console.log('   JSON.parse(localStorage.getItem("voicecoach-settings")).ollama.instructionFile');
console.log('');
console.log('3️⃣  Check the LED breadcrumbs for instruction file selection:');
console.log('');
console.log('   window.debug.breadcrumbs.getRange(6441, 6448)');
console.log('');
console.log('4️⃣  Check if the template was loaded successfully:');
console.log('');
console.log('   window.debug.breadcrumbs.getRange(6440, 6440)');
console.log('');
console.log('5️⃣  Check the most recent prompt that was built:');
console.log('');
console.log('   window.debug.breadcrumbs.getRange(6420, 6421)');
console.log('');
console.log('6️⃣  Filter for all instruction-related breadcrumbs:');
console.log('');
console.log('   window.debug.breadcrumbs.getRange(6400, 6499)');
console.log('     .filter(b => b.operation.includes("instruction"))');
console.log('');

console.log('═══════════════════════════════════════════════════════════');
console.log('📋 LED Breadcrumb Reference:');
console.log('═══════════════════════════════════════════════════════════');
console.log('LED 6441: instruction_file_selection_start');
console.log('LED 6442: user_instruction_file_selected (shows which file)');
console.log('LED 6443: no_instruction_file_in_settings (using default)');
console.log('LED 6444: settings_parse_failed (error reading settings)');
console.log('LED 6445: no_settings_found (no localStorage settings)');
console.log('LED 6446: loading_instruction_file (starting file read)');
console.log('LED 6440: prompt_template_loaded_SUCCESS (file loaded!)');
console.log('LED 6447: Extracted prompt from markdown code block');
console.log('');
console.log('LED 6420: Prompt building start');
console.log('LED 6421: Prompt built successfully (shows instructionFileUsed)');
console.log('');
console.log('LED 8440: Template loading FAILED (error)');
console.log('LED 8441: File read returned no content (error)');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('✅ Debug script complete. Follow the instructions above to check the running app.\n');
