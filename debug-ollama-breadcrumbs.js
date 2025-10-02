// Debug script to analyze Ollama prompt generation LED patterns
// Run this in the VoiceCoach V2 Electron app console

console.log("🔍 VoiceCoach V2 - Ollama LED Breadcrumb Analysis");
console.log("================================================");

// Check if debug interface is available
if (window.debug && window.debug.breadcrumbs) {
  console.log("✅ Debug interface available");

  // 1. Get all breadcrumbs
  const allBreadcrumbs = window.debug.breadcrumbs.getAll();
  console.log(`📊 Total breadcrumbs: ${allBreadcrumbs.length}`);

  // 2. Check instruction loading range (6400-6403)
  console.log("\n🔸 Instruction Loading Analysis (LED 6400-6403):");
  const instructionLEDs = window.debug.breadcrumbs.getRange(6400, 6403);
  instructionLEDs.forEach(led => {
    const status = led.success ? "✅" : "❌";
    console.log(`${status} LED ${led.id}: ${led.name} - ${led.component} (${new Date(led.timestamp).toLocaleTimeString()})`);
    if (led.data) console.log(`   Data:`, led.data);
    if (led.error) console.log(`   Error: ${led.error}`);
  });

  // 3. Check instruction error range (8401-8405)
  console.log("\n🔸 Instruction Error Analysis (LED 8401-8405):");
  const instructionErrors = window.debug.breadcrumbs.getRange(8401, 8405);
  instructionErrors.forEach(led => {
    console.log(`❌ LED ${led.id}: ${led.name} - ${led.component}`);
    console.log(`   Error: ${led.error}`);
    if (led.stack) console.log(`   Stack: ${led.stack.substring(0, 200)}...`);
  });

  // 4. Check Ollama generation range (6100-6111)
  console.log("\n🔸 Ollama Generation Analysis (LED 6100-6111):");
  const ollamaLEDs = window.debug.breadcrumbs.getRange(6100, 6111);
  ollamaLEDs.forEach(led => {
    const status = led.success ? "✅" : "❌";
    console.log(`${status} LED ${led.id}: ${led.name} - ${led.component} (${new Date(led.timestamp).toLocaleTimeString()})`);
    if (led.data) console.log(`   Data:`, led.data);
    if (led.error) console.log(`   Error: ${led.error}`);
  });

  // 5. Check transcript from SessionManager (LED 6275)
  console.log("\n🔸 SessionManager Transcript Analysis (LED 6275):");
  const sessionManagerLEDs = window.debug.breadcrumbs.getRange(6275, 6275);
  sessionManagerLEDs.forEach(led => {
    const status = led.success ? "✅" : "❌";
    console.log(`${status} LED ${led.id}: ${led.name} - ${led.component} (${new Date(led.timestamp).toLocaleTimeString()})`);
    if (led.data) console.log(`   Data:`, led.data);
  });

  // 6. Get all failures
  console.log("\n🔸 All Failures:");
  const failures = window.debug.breadcrumbs.getFailures();
  failures.forEach(led => {
    console.log(`❌ LED ${led.id}: ${led.name} - ${led.component}`);
    console.log(`   Error: ${led.error}`);
  });

  // 7. Quality score
  const qualityScore = window.debug.breadcrumbs.getQualityScore();
  console.log(`\n🎯 Overall Quality Score: ${qualityScore}%`);

  // 8. Check range completeness
  console.log("\n🔸 Range Completeness Analysis:");
  const ranges = [
    { name: "Instruction Loading", start: 6400, end: 6403 },
    { name: "Ollama Generation", start: 6100, end: 6111 },
    { name: "Instruction Errors", start: 8401, end: 8405 }
  ];

  ranges.forEach(range => {
    const check = window.debug.breadcrumbs.checkRange(range.start, range.end);
    console.log(`${range.name} (${range.start}-${range.end}): ${check.passed ? "✅ COMPLETE" : "❌ INCOMPLETE"}`);
    if (check.missing.length > 0) console.log(`   Missing LEDs: ${check.missing.join(", ")}`);
    if (check.failed.length > 0) console.log(`   Failed LEDs: ${check.failed.join(", ")}`);
  });

} else {
  console.log("❌ Debug interface not available");
}

console.log("\n================================================");
console.log("🏁 Analysis complete. Review the patterns above.");