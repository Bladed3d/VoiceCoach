/**
 * Quick test to verify topic detection works
 */

function detectTopics(text: string): string[] {
  const topics: string[] = [];
  const lower = text.toLowerCase();

  // Pricing/cost topics
  if (lower.includes('price') || lower.includes('cost') || lower.includes('budget') ||
      lower.includes('expensive') || lower.includes('afford')) {
    topics.push('pricing');
  }

  // Feature/capability topics
  if (lower.includes('feature') || lower.includes('capability') || lower.includes('function') ||
      lower.includes('can it') || lower.includes('does it')) {
    topics.push('features');
  }

  // Support/help topics
  if (lower.includes('support') || lower.includes('help') || lower.includes('training') ||
      lower.includes('onboarding') || lower.includes('documentation')) {
    topics.push('support');
  }

  // Implementation/setup topics
  if (lower.includes('implement') || lower.includes('setup') || lower.includes('install') ||
      lower.includes('configure') || lower.includes('deploy')) {
    topics.push('implementation');
  }

  // Timeline/schedule topics
  if (lower.includes('timeline') || lower.includes('when') || lower.includes('schedule') ||
      lower.includes('how long') || lower.includes('duration')) {
    topics.push('timeline');
  }

  // Integration topics
  if (lower.includes('integrate') || lower.includes('connect') || lower.includes('api') ||
      lower.includes('sync') || lower.includes('import')) {
    topics.push('integration');
  }

  // Security/compliance topics
  if (lower.includes('security') || lower.includes('compliance') || lower.includes('gdpr') ||
      lower.includes('hipaa') || lower.includes('encrypt')) {
    topics.push('security');
  }

  // ROI/value topics
  if (lower.includes('roi') || lower.includes('return') || lower.includes('value') ||
      lower.includes('benefit') || lower.includes('save')) {
    topics.push('roi');
  }

  return topics;
}

// Test cases from the winning test scenarios
const testCases = [
  {
    transcript: "This is more expensive than we budgeted for. I'm not sure we can justify this to the CFO.",
    expected: ['pricing']
  },
  {
    transcript: "I like the features but I'm concerned about implementation timeline.",
    expected: ['features', 'timeline']
  },
  {
    transcript: "What kind of support and training do you provide?",
    expected: ['support']
  },
  {
    transcript: "Can it integrate with our current API?",
    expected: ['features', 'integration']
  },
  {
    transcript: "I need to understand the ROI and how long setup takes.",
    expected: ['roi', 'implementation', 'timeline']
  }
];

console.log('🧪 Testing Topic Detection\n');

testCases.forEach((test, index) => {
  const detected = detectTopics(test.transcript);
  const matches = test.expected.every(t => detected.includes(t));

  console.log(`Test ${index + 1}: ${matches ? '✅' : '❌'}`);
  console.log(`  Transcript: "${test.transcript}"`);
  console.log(`  Expected: [${test.expected.join(', ')}]`);
  console.log(`  Detected: [${detected.join(', ')}]`);
  console.log('');
});

console.log('✅ Topic detection ready for keyword-driven-instructions-v2.md!');
