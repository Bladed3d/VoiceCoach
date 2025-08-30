/**
 * Quick Settings Panel Validation for VoiceCoach V2
 * Simple validation script to verify Settings Panel functionality
 */

// Check if we're in the right environment
if (typeof window === 'undefined') {
    console.log('This script should be run in a browser environment with VoiceCoach V2 loaded.');
    process.exit(1);
}

// Quick validation functions
const SettingsValidator = {
    // Check if VoiceCoach V2 is loaded
    checkAppLoaded: function() {
        const indicators = [
            document.querySelector('.full-screen-app'), // Main app container
            document.querySelector('[title="Settings"]'), // Settings button
            document.title.includes('VoiceCoach') || document.querySelector('span:contains("VoiceCoach")')
        ];
        
        const loaded = indicators.some(indicator => indicator);
        console.log(loaded ? '✅ VoiceCoach V2 detected' : '❌ VoiceCoach V2 not found');
        return loaded;
    },
    
    // Find and validate Settings button
    findSettingsButton: function() {
        const settingsButton = document.querySelector('button[title="Settings"]') ||
                              document.querySelector('button svg[class*="w-4"][class*="h-4"]')?.closest('button');
        
        if (settingsButton) {
            console.log('✅ Settings button found in header');
            return settingsButton;
        } else {
            console.log('❌ Settings button not found - check if app loaded correctly');
            return null;
        }
    },
    
    // Test Settings modal opening
    testModalOpen: function() {
        const settingsButton = this.findSettingsButton();
        if (!settingsButton) return false;
        
        console.log('🔄 Clicking Settings button...');
        settingsButton.click();
        
        // Check if modal opened
        setTimeout(() => {
            const modal = document.querySelector('[class*="fixed"][class*="inset-0"]') ||
                         document.querySelector('[class*="bg-black/80"]');
            
            if (modal) {
                console.log('✅ Settings modal opened successfully');
                // Look for tabs
                const tabs = document.querySelectorAll('button[class*="flex"][class*="items-center"]');
                console.log(`✅ Found ${tabs.length} navigation tabs`);
                
                // Look for specific content
                const audioSettings = document.querySelector('[class*="space-y-6"]');
                if (audioSettings) {
                    console.log('✅ Settings content area found');
                }
                
                return true;
            } else {
                console.log('❌ Settings modal did not open');
                return false;
            }
        }, 500);
    },
    
    // Check for LED breadcrumb system
    checkLEDSystem: function() {
        // Override console to capture LEDs
        const originalLog = console.log;
        let ledCount = 0;
        
        console.log = function(...args) {
            const message = args.join(' ');
            if (message.includes('🎵 LED') || message.includes('LED')) {
                ledCount++;
            }
            originalLog.apply(console, args);
        };
        
        // Restore after brief period
        setTimeout(() => {
            console.log = originalLog;
            console.log(`🎵 LED system check: ${ledCount} LEDs detected`);
        }, 5000);
        
        console.log('🔍 Monitoring LED breadcrumbs for 5 seconds...');
    },
    
    // Run quick validation sequence
    runQuickValidation: function() {
        console.log('🎵 VoiceCoach V2 Settings Panel Quick Validation');
        console.log('=================================================');
        
        // Step 1: Check app loaded
        if (!this.checkAppLoaded()) {
            console.log('❌ Cannot continue - VoiceCoach V2 not detected');
            return false;
        }
        
        // Step 2: Find Settings button
        if (!this.findSettingsButton()) {
            console.log('❌ Cannot continue - Settings button not found');
            return false;
        }
        
        // Step 3: Start LED monitoring
        this.checkLEDSystem();
        
        // Step 4: Test modal
        setTimeout(() => {
            this.testModalOpen();
        }, 1000);
        
        // Final report
        setTimeout(() => {
            console.log('');
            console.log('🎯 Quick Validation Summary:');
            console.log('============================');
            console.log('✅ App Detection: PASSED');
            console.log('✅ Settings Button: PASSED');  
            console.log('✅ Modal Opening: TESTING...');
            console.log('✅ LED System: MONITORING...');
            console.log('');
            console.log('💡 Check console for LED messages when clicking Settings');
        }, 2000);
        
        return true;
    }
};

// Auto-run if in browser
if (typeof document !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => SettingsValidator.runQuickValidation(), 1000);
        });
    } else {
        setTimeout(() => SettingsValidator.runQuickValidation(), 1000);
    }
}

// Export for manual use
if (typeof window !== 'undefined') {
    window.SettingsValidator = SettingsValidator;
}