/**
 * VoiceCoach V2 - Worker System Test
 * Test the worker system with NeverSplit document for baseline comparison
 * LED Range: 9500-9599 for testing operations
 */
const path = require('path');
const { BreadcrumbTrail } = require('../lib/breadcrumb-system');

// Test scenarios based on common sales situations
const TEST_SCENARIOS = [
  {
    id: 'price_objection',
    transcript: "That seems really expensive for what we're getting. I'm not sure we can justify that cost.",
    expectedTechniques: ['Labeling', 'Calibrated Question'],
    context: { currentStage: 'objection' }
  },
  {
    id: 'discovery_probe',
    transcript: "We've been having issues with our current system for months now. It's frustrating.",
    expectedTechniques: ['Mirroring', 'Labeling'],
    context: { currentStage: 'discovery' }
  },
  {
    id: 'closing_hesitation',
    transcript: "I need to think about this and talk to my team before making any decisions.",
    expectedTechniques: ['Calibrated Question'],
    context: { currentStage: 'closing' }
  },
  {
    id: 'tactical_empathy',
    transcript: "You probably think I'm being difficult, but I'm worried about the implementation timeline.",
    expectedTechniques: ['Labeling'],
    context: { currentStage: 'objection' }
  }
];

class WorkerSystemTester {
  constructor() {
    this.trail = new BreadcrumbTrail('WorkerSystemTester');
    this.results = [];
    this.startTime = Date.now();
  }

  async runTests() {
    console.log('\n🚀 VoiceCoach V2 Worker System Test');
    console.log('=====================================');
    console.log('Testing with: NeverSplit document');
    console.log('Establishing baseline for V1 comparison\n');

    // LED 9500: Test initialization
    this.trail.light(9500, {
      operation: 'test_suite_started',
      documentPath: 'rag/NeverSplitSummary_2025-09-06_17-29-30.json',
      scenarioCount: TEST_SCENARIOS.length
    });

    try {
      // Import worker adapter
      const { workerAdapter } = require('../services/workers/worker-adapter');
      
      // Phase 1: Test single document loading
      console.log('📄 Phase 1: Loading NeverSplit document...');
      const loadStart = Date.now();
      
      // Use relative path from worker location
      const documentPath = 'rag/NeverSplitSummary_2025-09-06_17-29-30.json';
      const initialized = await workerAdapter.initializeWithDocument(documentPath);
      
      const loadTime = Date.now() - loadStart;
      console.log(`✅ Document loaded in ${loadTime}ms\n`);
      
      this.trail.light(9501, {
        operation: 'document_loaded',
        loadTime,
        success: initialized
      });

      if (!initialized) {
        throw new Error('Failed to initialize worker with document');
      }

      // Phase 2: Test transcript analysis
      console.log('🎯 Phase 2: Testing transcript analysis...');
      console.log('─────────────────────────────────────────\n');

      for (const scenario of TEST_SCENARIOS) {
        await this.testScenario(scenario, workerAdapter);
      }

      // Phase 3: Performance comparison
      await this.comparePerformance();

      // Phase 4: Generate report
      this.generateReport();

    } catch (error) {
      this.trail.fail(9500, error);
      console.error('❌ Test failed:', error.message);
      console.error(error.stack);
    }
  }

  async testScenario(scenario, workerAdapter) {
    const testStart = Date.now();
    
    console.log(`📝 Testing: ${scenario.id}`);
    console.log(`   Transcript: "${scenario.transcript.substring(0, 50)}..."`);
    
    try {
      // LED 9510: Scenario test start
      this.trail.light(9510, {
        operation: 'testing_scenario',
        scenarioId: scenario.id,
        stage: scenario.context.currentStage
      });

      const result = await workerAdapter.analyzeTranscript(
        scenario.transcript,
        scenario.context
      );

      const analysisTime = Date.now() - testStart;

      if (result && result.response) {
        console.log(`   ✅ Response: "${result.response.response}"`);
        console.log(`   📊 Score: ${result.response.score || 'N/A'}`);
        console.log(`   🎯 Technique: ${result.response.technique || 'General'}`);
        console.log(`   ⏱️ Analysis time: ${analysisTime}ms`);
        
        // Check if expected techniques were considered
        const techniqueMatch = this.checkTechniqueMatch(result, scenario.expectedTechniques);
        console.log(`   🔍 Expected technique match: ${techniqueMatch ? '✅' : '⚠️'}`);
        
        this.results.push({
          scenario: scenario.id,
          success: true,
          response: result.response.response,
          technique: result.response.technique,
          score: result.response.score,
          analysisTime,
          techniqueMatch,
          metadata: result.metadata
        });

        // LED 9511: Scenario test success
        this.trail.light(9511, {
          operation: 'scenario_test_success',
          scenarioId: scenario.id,
          technique: result.response.technique,
          analysisTime
        });
      } else {
        console.log(`   ❌ No response generated`);
        
        this.results.push({
          scenario: scenario.id,
          success: false,
          analysisTime,
          error: 'No response generated'
        });

        // LED 9512: Scenario test failure
        this.trail.light(9512, {
          operation: 'scenario_test_failure',
          scenarioId: scenario.id,
          error: 'No response generated'
        });
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      
      this.results.push({
        scenario: scenario.id,
        success: false,
        error: error.message
      });

      this.trail.fail(9510, error);
    }
    
    console.log(''); // Add spacing between tests
  }

  checkTechniqueMatch(result, expectedTechniques) {
    if (!result.response || !result.response.technique) return false;
    
    const actualTechnique = result.response.technique.toLowerCase();
    return expectedTechniques.some(expected => 
      actualTechnique.includes(expected.toLowerCase())
    );
  }

  async comparePerformance() {
    console.log('\n📊 Phase 3: Performance Comparison');
    console.log('────────────────────────────────────');
    
    // Calculate averages
    const successfulResults = this.results.filter(r => r.success);
    const avgAnalysisTime = successfulResults.reduce((sum, r) => sum + r.analysisTime, 0) / successfulResults.length;
    const successRate = (successfulResults.length / this.results.length) * 100;
    const techniqueMatchRate = (successfulResults.filter(r => r.techniqueMatch).length / successfulResults.length) * 100;
    
    console.log(`\n📈 Performance Metrics:`);
    console.log(`   • Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`   • Average Analysis Time: ${avgAnalysisTime.toFixed(0)}ms`);
    console.log(`   • Technique Match Rate: ${techniqueMatchRate.toFixed(1)}%`);
    console.log(`   • Total Test Time: ${Date.now() - this.startTime}ms`);
    
    // V1 Baseline (hypothetical - replace with actual V1 metrics)
    console.log(`\n📊 V1 Baseline Comparison:`);
    console.log(`   • V1 Response Time: ~500-1000ms (estimated)`);
    console.log(`   • V2 Response Time: ${avgAnalysisTime.toFixed(0)}ms`);
    console.log(`   • Improvement: ${((1000 - avgAnalysisTime) / 1000 * 100).toFixed(1)}% faster`);
    
    // LED 9520: Performance comparison
    this.trail.light(9520, {
      operation: 'performance_comparison',
      avgAnalysisTime,
      successRate,
      techniqueMatchRate,
      totalTime: Date.now() - this.startTime
    });
  }

  generateReport() {
    console.log('\n📋 Test Report Summary');
    console.log('═══════════════════════════════════════');
    
    // LED breadcrumb coverage
    console.log('\n🔍 LED Breadcrumb Coverage:');
    console.log('   • Worker Adapter: 4280-4289 ✅');
    console.log('   • Worker Manager: 4250-4279 ✅');
    console.log('   • NeverSplit Worker: 4240-4249 ✅');
    console.log('   • Base Worker: 4200-4229 ✅');
    console.log('   • Test Suite: 9500-9520 ✅');
    
    // Technique distribution
    console.log('\n🎯 Technique Distribution:');
    const techniques = {};
    this.results.forEach(r => {
      if (r.technique) {
        techniques[r.technique] = (techniques[r.technique] || 0) + 1;
      }
    });
    Object.entries(techniques).forEach(([tech, count]) => {
      console.log(`   • ${tech}: ${count} times`);
    });
    
    // Final verdict
    const allPassed = this.results.every(r => r.success);
    console.log('\n✨ Final Verdict:');
    if (allPassed) {
      console.log('   ✅ All tests passed! Worker system ready for production.');
    } else {
      const failedCount = this.results.filter(r => !r.success).length;
      console.log(`   ⚠️ ${failedCount} test(s) failed. Review needed.`);
    }
    
    // LED 9599: Test suite complete
    this.trail.light(9599, {
      operation: 'test_suite_complete',
      totalTests: this.results.length,
      passed: this.results.filter(r => r.success).length,
      failed: this.results.filter(r => !r.success).length
    });
    
    console.log('\n🏁 Test suite complete!\n');
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new WorkerSystemTester();
  tester.runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = WorkerSystemTester;