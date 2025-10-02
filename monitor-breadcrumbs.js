/**
 * LED Breadcrumb Monitor for VoiceCoach V2
 * Connects to Electron app and monitors console for pattern matching LEDs
 */

const CDP = require('chrome-remote-interface');

const PATTERN_MATCHING_LEDS = {
  6601: 'Pattern matching start',
  6610: 'Keyword match found',
  6611: 'Tool scored',
  6612: 'All tools evaluated',
  6602: 'Pattern match found (success with score)',
  6604: 'No pattern match (AI fallback)',
  6252: 'Pattern match success in live coaching'
};

async function monitorBreadcrumbs() {
  console.log('🎯 VoiceCoach V2 LED Breadcrumb Monitor');
  console.log('📊 Watching for pattern matching activity...\n');
  console.log('Target LEDs:');
  Object.entries(PATTERN_MATCHING_LEDS).forEach(([led, desc]) => {
    console.log(`  LED ${led}: ${desc}`);
  });
  console.log('\n' + '='.repeat(80) + '\n');

  try {
    const client = await CDP({ port: 9222 });
    const { Runtime, Console } = client;

    await Runtime.enable();
    await Console.enable();

    Console.messageAdded(({ message }) => {
      const text = message.text || '';

      // Check for LED breadcrumbs
      const ledMatch = text.match(/LED\s+(\d+)/);
      if (ledMatch) {
        const ledNum = ledMatch[1];

        // Only show pattern matching related LEDs
        if (PATTERN_MATCHING_LEDS[ledNum]) {
          const timestamp = new Date().toLocaleTimeString();
          console.log(`[${timestamp}] 🔵 LED ${ledNum}: ${PATTERN_MATCHING_LEDS[ledNum]}`);
          console.log(`   Full message: ${text}`);
          console.log('');
        }
      }

      // Also catch tool scoring and matching info
      if (text.includes('tool') || text.includes('pattern') || text.includes('score')) {
        if (!text.includes('LED')) { // Don't duplicate LED messages
          const timestamp = new Date().toLocaleTimeString();
          console.log(`[${timestamp}] 📝 ${text}`);
          console.log('');
        }
      }
    });

    console.log('✅ Connected to Electron app. Monitoring console...');
    console.log('Press Ctrl+C to stop\n');

  } catch (error) {
    console.error('❌ Failed to connect to Electron app:', error.message);
    console.log('\n💡 Make sure Electron is running with remote debugging enabled:');
    console.log('   Add --remote-debugging-port=9222 to Electron launch args');
    process.exit(1);
  }
}

monitorBreadcrumbs();
