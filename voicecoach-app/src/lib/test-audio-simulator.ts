/**
 * Test Audio Simulator - Generates fake transcriptions for testing
 * This allows automated testing without actual microphone input
 */

export class TestAudioSimulator {
  private isSimulating: boolean = false;
  private simulationInterval: NodeJS.Timeout | null = null;
  private transcriptionIndex: number = 0;
  
  // Realistic test conversation for sales coaching
  private testTranscriptions = [
    "Hello, thanks for taking my call today",
    "I wanted to discuss our new software solution",
    "I understand you're currently using competitor X",
    "What challenges are you facing with your current system",
    "Our solution can reduce costs by thirty percent",
    "We've helped similar companies in your industry",
    "Would you be interested in seeing a demo",
    "I can show you how it integrates with your existing tools",
    "What's your timeline for making a decision",
    "Who else would need to be involved in evaluating this",
    "I'll send you a follow up email with pricing",
    "Thanks for your time today"
  ];
  
  // Simulate audio levels (for visualizer)
  private generateAudioLevels() {
    return {
      user: Math.random() * 70 + 20, // 20-90 range
      prospect: Math.random() * 60 + 10, // 10-70 range
      timestamp: Date.now()
    };
  }
  
  // Start simulating transcriptions
  startSimulation(onTranscription: (text: string) => void, interval: number = 3000) {
    console.log('🎭 TEST MODE: Starting audio simulation for testing');
    this.isSimulating = true;
    this.transcriptionIndex = 0;
    
    // Simulate transcriptions at regular intervals
    this.simulationInterval = setInterval(() => {
      if (this.transcriptionIndex < this.testTranscriptions.length) {
        const text = this.testTranscriptions[this.transcriptionIndex];
        console.log(`🎭 Simulated transcription ${this.transcriptionIndex + 1}: "${text}"`);
        
        // Trigger transcription event
        const event = new CustomEvent('simulatedTranscription', {
          detail: {
            text,
            timestamp: Date.now(),
            speaker: 'user',
            confidence: 0.95
          }
        });
        window.dispatchEvent(event);
        
        // Also call callback directly
        onTranscription(text);
        
        this.transcriptionIndex++;
      } else {
        // Loop back to start
        this.transcriptionIndex = 0;
      }
    }, interval);
    
    // Also simulate audio levels
    setInterval(() => {
      const levels = this.generateAudioLevels();
      const event = new CustomEvent('simulatedAudioLevels', {
        detail: levels
      });
      window.dispatchEvent(event);
    }, 100);
  }
  
  stopSimulation() {
    console.log('🎭 TEST MODE: Stopping audio simulation');
    this.isSimulating = false;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }
  
  isActive() {
    return this.isSimulating;
  }
}

// Global instance for testing
export const testAudioSimulator = new TestAudioSimulator();

// Auto-enable in test mode
if (process.env.NODE_ENV === 'development' && window.location.search.includes('test=true')) {
  console.log('🎭 TEST MODE DETECTED - Audio simulation available');
  (window as any).testAudioSimulator = testAudioSimulator;
}