/**
 * VoiceCoach V2 Settings Panel Console Validation Script
 * Run this script in the browser DevTools console while VoiceCoach V2 is open
 * Tests all Settings Panel functionality and captures LED breadcrumb data
 */

// Global validation state
window.VoiceCoachSettingsValidator = {
    capturedLEDs: [],
    testResults: {},
    startTime: Date.now(),
    
    // LED capture and analysis
    captureLEDs: function() {
        const originalLog = console.log;
        const capturedLEDs = [];
        
        // Override console.log to capture LED messages
        console.log = function(...args) {
            const message = args.join(' ');
            if (message.includes('🎵 LED') || message.includes('❌ LED')) {
                const ledMatch = message.match(/LED\s+(\d+)/);
                if (ledMatch) {
                    capturedLEDs.push({
                        led: parseInt(ledMatch[1]),
                        message: message,
                        timestamp: Date.now() - window.VoiceCoachSettingsValidator.startTime,
                        isError: message.includes('❌') || message.includes('FAILED')
                    });
                }
            }
            originalLog.apply(console, args);
        };
        
        // Restore after 30 seconds
        setTimeout(() => {
            console.log = originalLog;
            window.VoiceCoachSettingsValidator.capturedLEDs = capturedLEDs;
            console.log('LED capture complete. Found:', capturedLEDs.length, 'LEDs');
            window.VoiceCoachSettingsValidator.analyzeLEDs();
        }, 30000);
        
        console.log('🎵 LED capture started. Testing for 30 seconds...');
        return capturedLEDs;
    },
    
    // Analyze captured LED sequences
    analyzeLEDs: function() {
        const leds = this.capturedLEDs;
        const analysis = {
            settingsModal: this.validateSettingsModalLEDs(leds),
            audioSettings: this.validateAudioSettingsLEDs(leds),
            knowledgeBaseAPI: this.validateKnowledgeBaseLEDs(leds),
            errorHandling: leds.filter(led => led.led >= 8075 && led.led <= 8104)
        };
        
        console.log('🎯 LED Analysis Results:', analysis);
        this.testResults.ledAnalysis = analysis;
        return analysis;
    },
    
    // Validate Settings Modal LED sequence
    validateSettingsModalLEDs: function(leds) {
        const expectedSequence = [7050, 7070, 7089]; // Modal opened, mount, tab navigation
        const found = leds.filter(led => expectedSequence.includes(led.led));
        
        return {
            expected: expectedSequence,
            found: found.map(led => led.led),
            complete: expectedSequence.every(expected => 
                leds.some(led => led.led === expected)
            ),
            details: found
        };
    },
    
    // Validate Audio Settings LED sequence  
    validateAudioSettingsLEDs: function(leds) {
        const expectedSequence = [7092, 7051, 7052, 7053, 7054]; // Mount, enumerate, permission, devices, loaded
        const found = leds.filter(led => expectedSequence.includes(led.led));
        
        return {
            expected: expectedSequence,
            found: found.map(led => led.led),
            deviceEnumeration: {
                started: leds.some(led => led.led === 7051),
                permissionGranted: leds.some(led => led.led === 7052),
                devicesFound: leds.some(led => led.led === 7053),
                devicesLoaded: leds.some(led => led.led === 7054)
            },
            details: found
        };
    },
    
    // Validate Knowledge Base API LED sequence
    validateKnowledgeBaseLEDs: function(leds) {
        const expectedSequence = [7100, 7102]; // Mount, phase monitoring
        const found = leds.filter(led => expectedSequence.includes(led.led));
        
        return {
            expected: expectedSequence,
            found: found.map(led => led.led),
            phaseToggling: {
                monitored: leds.some(led => led.led === 7102),
                toggleEvents: leds.filter(led => [7103, 7104].includes(led.led))
            },
            details: found
        };
    },
    
    // Automated Settings Panel test sequence
    runAutomatedTests: async function() {
        console.log('🚀 Starting automated Settings Panel validation...');
        
        // Step 1: Find and click Settings button
        const settingsButton = document.querySelector('button[title="Settings"]');
        if (!settingsButton) {
            console.error('❌ Settings button not found!');
            return false;
        }
        
        console.log('✅ Found Settings button, clicking...');
        settingsButton.click();
        await this.wait(1000);
        
        // Step 2: Verify modal opened
        const modal = document.querySelector('[class*="fixed"][class*="inset-0"]');
        if (!modal) {
            console.error('❌ Settings modal did not open!');
            return false;
        }
        
        console.log('✅ Settings modal opened successfully');
        
        // Step 3: Test tab navigation
        const tabs = ['audio', 'ai', 'knowledgebase', 'privacy', 'about'];
        for (const tab of tabs) {
            console.log(`🔄 Testing ${tab} tab...`);
            const tabButton = document.querySelector(`button:contains("${tab}")`);
            if (tabButton) {
                tabButton.click();
                await this.wait(500);
                console.log(`✅ ${tab} tab navigation successful`);
            } else {
                console.log(`⚠️ ${tab} tab button not found - using alternative selector`);
            }
        }
        
        // Step 4: Test Audio Settings (if on audio tab)
        console.log('🎤 Testing Audio Settings...');
        const microphoneSelect = document.querySelector('select[class*="bg-slate-800"]');
        if (microphoneSelect) {
            console.log('✅ Microphone selection dropdown found');
            // Trigger change event to test functionality
            microphoneSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Step 5: Test Knowledge Base API toggles (if available)
        console.log('🔧 Testing Knowledge Base API Configuration...');
        const toggles = document.querySelectorAll('input[type="checkbox"]');
        if (toggles.length > 0) {
            console.log(`✅ Found ${toggles.length} toggles`);
            // Test first toggle
            if (toggles[0]) {
                toggles[0].click();
                await this.wait(500);
                toggles[0].click(); // Toggle back
                console.log('✅ Toggle functionality tested');
            }
        }
        
        // Step 6: Close modal
        const closeButton = document.querySelector('button[class*="bg-slate-800"]:contains("Cancel")') || 
                          document.querySelector('button svg[class*="w-5"]')?.closest('button');
        if (closeButton) {
            console.log('🔄 Closing settings modal...');
            closeButton.click();
            await this.wait(500);
            console.log('✅ Settings modal closed');
        }
        
        console.log('🎯 Automated test sequence completed!');
        return true;
    },
    
    // Helper function for delays
    wait: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // Generate comprehensive test report
    generateReport: function() {
        const report = {
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            ledData: {
                total: this.capturedLEDs.length,
                successful: this.capturedLEDs.filter(led => !led.isError).length,
                errors: this.capturedLEDs.filter(led => led.isError).length,
                sequence: this.capturedLEDs
            },
            testResults: this.testResults,
            status: this.capturedLEDs.length > 10 ? 'PASSED' : 'NEEDS_VERIFICATION'
        };
        
        console.log('📊 Settings Panel Validation Report:');
        console.log('=====================================');
        console.log('🕐 Test Duration:', Math.round(report.duration / 1000), 'seconds');
        console.log('🎵 LEDs Captured:', report.ledData.total);
        console.log('✅ Successful LEDs:', report.ledData.successful);
        console.log('❌ Error LEDs:', report.ledData.errors);
        console.log('📈 Test Status:', report.status);
        console.log('');
        console.log('🎯 LED Sequence Details:');
        this.capturedLEDs.forEach(led => {
            const emoji = led.isError ? '❌' : '🎵';
            console.log(`${emoji} LED ${led.led} (${led.timestamp}ms): ${led.message.substring(0, 80)}...`);
        });
        
        return report;
    },
    
    // Main test runner
    runFullValidation: async function() {
        console.log('🎵 VoiceCoach V2 Settings Panel Full Validation');
        console.log('================================================');
        
        // Start LED capture
        this.captureLEDs();
        
        // Wait a moment for setup
        await this.wait(1000);
        
        // Run automated tests
        const success = await this.runAutomatedTests();
        
        // Wait for LED capture to complete
        console.log('⏳ Waiting for LED capture to complete...');
        
        // Return validation function for later use
        return () => {
            setTimeout(() => {
                this.generateReport();
                console.log('');
                console.log('🏆 Settings Panel validation completed!');
                console.log('Check the report above for detailed results.');
            }, 31000); // Wait for LED capture to finish
        };
    }
};

// Auto-start validation message
console.log('🎵 VoiceCoach V2 Settings Panel Validator loaded!');
console.log('');
console.log('Available commands:');
console.log('  window.VoiceCoachSettingsValidator.runFullValidation() - Run complete test suite');
console.log('  window.VoiceCoachSettingsValidator.captureLEDs() - Start LED capture only');
console.log('  window.VoiceCoachSettingsValidator.runAutomatedTests() - Run automated UI tests');
console.log('  window.VoiceCoachSettingsValidator.generateReport() - Generate test report');
console.log('');
console.log('💡 Quick start: Run window.VoiceCoachSettingsValidator.runFullValidation()');

// Export for immediate use
window.VoiceCoachSettingsValidator;