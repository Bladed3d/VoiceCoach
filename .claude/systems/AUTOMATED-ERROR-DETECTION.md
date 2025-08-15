# 🤖 **AUTOMATED ERROR DETECTION SYSTEM**

## 🎯 **OVERVIEW**
**Eliminate manual F12 console checking and trial-and-error debugging through automated browser monitoring and error correction.**

Inspired by the Claude Opus solution, this system monitors localhost:3001, captures console errors, and triggers autonomous fixes.

---

## 🔧 **CORE ARCHITECTURE**

### **1. Browser Automation Monitor**
```javascript
// scripts/error-monitor.js
const { chromium } = require('playwright');
const fs = require('fs').promises;

class AutomatedErrorDetector {
  constructor(config = {}) {
    this.url = config.url || 'http://localhost:3001';
    this.browser = null;
    this.page = null;
    this.errors = [];
    this.isMonitoring = false;
  }

  async startMonitoring() {
    console.log('🔍 Starting automated error detection...');
    
    this.browser = await chromium.launch({ 
      headless: process.env.NODE_ENV === 'production',
      devtools: true 
    });
    
    const context = await this.browser.newContext();
    this.page = await context.newPage();
    
    // Capture console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.captureError({
          type: 'console',
          message: msg.text(),
          location: msg.location(),
          timestamp: new Date().toISOString(),
          stackTrace: msg.stackTrace()
        });
      }
    });
    
    // Capture runtime errors
    this.page.on('pageerror', error => {
      this.captureError({
        type: 'runtime',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });
    
    // Capture network failures
    this.page.on('requestfailed', request => {
      this.captureError({
        type: 'network',
        url: request.url(),
        failure: request.failure(),
        timestamp: new Date().toISOString()
      });
    });
    
    // Inject breadcrumb monitoring
    await this.page.addInitScript(() => {
      // Monitor breadcrumb failures
      const checkBreadcrumbFailures = () => {
        if (window.breadcrumbFailures && window.breadcrumbFailures.length > 0) {
          window.breadcrumbFailures.forEach(failure => {
            console.error(`🍞 BREADCRUMB FAILURE: LED ${failure.id} - ${failure.error}`);
          });
        }
      };
      
      // Check every 2 seconds
      setInterval(checkBreadcrumbFailures, 2000);
    });
    
    this.isMonitoring = true;
  }

  captureError(errorData) {
    this.errors.push(errorData);
    
    console.error(`❌ Error detected: ${errorData.message}`);
    
    // Auto-trigger fix if error threshold reached
    if (this.errors.length >= 1) {
      this.triggerAutoFix();
    }
  }

  async testPage(path = '/') {
    try {
      console.log(`🧪 Testing: ${this.url}${path}`);
      
      await this.page.goto(`${this.url}${path}`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Wait for potential errors
      await this.page.waitForTimeout(3000);
      
      // Check for breadcrumb failures
      const breadcrumbFailures = await this.page.evaluate(() => {
        return window.breadcrumbFailures || [];
      });
      
      const report = {
        url: `${this.url}${path}`,
        hasErrors: this.errors.length > 0 || breadcrumbFailures.length > 0,
        consoleErrors: this.errors,
        breadcrumbFailures,
        timestamp: new Date().toISOString()
      };
      
      // Reset errors for next test
      this.errors = [];
      
      return report;
      
    } catch (error) {
      return {
        url: `${this.url}${path}`,
        hasErrors: true,
        navigationError: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async triggerAutoFix() {
    if (this.errors.length === 0) return;
    
    const errorReport = {
      errors: this.errors,
      url: this.page.url(),
      timestamp: new Date().toISOString()
    };
    
    console.log('🤖 Triggering automatic error correction...');
    
    // Save error report for debugging agent
    await fs.writeFile(
      'error-report.json', 
      JSON.stringify(errorReport, null, 2)
    );
    
    // Could trigger Claude CLI here
    // exec('claude --file error-report.json --output fix-response.md');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = AutomatedErrorDetector;
```

### **2. Continuous Monitoring Loop**
```javascript
// scripts/continuous-monitor.js
const AutomatedErrorDetector = require('./error-monitor');

class ContinuousMonitor {
  constructor() {
    this.detector = new AutomatedErrorDetector();
    this.isRunning = false;
  }

  async start() {
    console.log('🔄 Starting continuous error monitoring...');
    
    await this.detector.startMonitoring();
    this.isRunning = true;
    
    // Test pages every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.runTestCycle();
    }, 30000);
    
    // Initial test
    await this.runTestCycle();
  }

  async runTestCycle() {
    const testPages = [
      '/',
      '/daily-actions4',
      '/daily-actions5' // If it exists
    ];
    
    for (const page of testPages) {
      const report = await this.detector.testPage(page);
      
      if (report.hasErrors) {
        console.error(`❌ Errors found on ${page}:`, report);
        await this.handleErrors(report);
      } else {
        console.log(`✅ ${page} - No errors detected`);
      }
    }
  }

  async handleErrors(report) {
    // Auto-trigger debugging agent
    console.log('🚨 Errors detected - requesting automatic fix...');
    
    // Create debugging agent request
    const debugRequest = `
Automated Error Detection Report:

URL: ${report.url}
Console Errors: ${report.consoleErrors.length}
Breadcrumb Failures: ${report.breadcrumbFailures.length}

Details:
${JSON.stringify(report, null, 2)}

Please analyze and fix these errors autonomously.
    `;
    
    // Save for debugging agent
    await require('fs').promises.writeFile(
      'auto-debug-request.txt', 
      debugRequest
    );
  }

  stop() {
    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.detector.close();
  }
}

// Auto-start if run directly
if (require.main === module) {
  const monitor = new ContinuousMonitor();
  monitor.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping continuous monitoring...');
    monitor.stop();
    process.exit(0);
  });
}

module.exports = ContinuousMonitor;
```

### **3. Smart Error Analysis**
```javascript
// scripts/error-analyzer.js
class SmartErrorAnalyzer {
  constructor() {
    this.knownPatterns = {
      MISSING_IMPORT: {
        pattern: /Cannot resolve module|Module not found/,
        autoFix: 'Add missing import statement',
        confidence: 0.9
      },
      UNDEFINED_VARIABLE: {
        pattern: /is not defined|Cannot read property.*undefined/,
        autoFix: 'Define variable or add null check',
        confidence: 0.8
      },
      HOOK_VIOLATION: {
        pattern: /React Hook.*called conditionally/,
        autoFix: 'Move hook to component top level',
        confidence: 0.95
      },
      DND_ERROR: {
        pattern: /drag.*drop|DnD|Beautiful.*dnd/i,
        autoFix: 'Check DnD Kit integration and event handlers',
        confidence: 0.7
      },
      BREADCRUMB_FAILURE: {
        pattern: /LED.*failed|trail.*light/,
        autoFix: 'Check breadcrumb trail implementation',
        confidence: 0.85
      }
    };
  }

  analyzeErrors(errors) {
    return errors.map(error => {
      const analysis = this.classifyError(error.message);
      return {
        ...error,
        analysis,
        priority: this.calculatePriority(error, analysis),
        autoFixable: analysis.confidence > 0.7
      };
    });
  }

  classifyError(message) {
    for (const [type, config] of Object.entries(this.knownPatterns)) {
      if (config.pattern.test(message)) {
        return {
          type,
          autoFix: config.autoFix,
          confidence: config.confidence
        };
      }
    }
    
    return {
      type: 'UNKNOWN',
      autoFix: 'Manual investigation required',
      confidence: 0.1
    };
  }

  calculatePriority(error, analysis) {
    // High priority: page-breaking errors
    if (error.type === 'runtime' || analysis.type === 'HOOK_VIOLATION') {
      return 'HIGH';
    }
    
    // Medium priority: feature-breaking errors
    if (analysis.type === 'DND_ERROR' || analysis.type === 'BREADCRUMB_FAILURE') {
      return 'MEDIUM';
    }
    
    // Low priority: minor issues
    return 'LOW';
  }

  generateFixRecommendations(analyzedErrors) {
    const highPriority = analyzedErrors.filter(e => e.priority === 'HIGH');
    const autoFixable = analyzedErrors.filter(e => e.autoFixable);
    
    return {
      summary: {
        total: analyzedErrors.length,
        highPriority: highPriority.length,
        autoFixable: autoFixable.length
      },
      recommendations: autoFixable.map(error => ({
        error: error.message,
        fix: error.analysis.autoFix,
        confidence: error.analysis.confidence
      })),
      urgentFixes: highPriority.map(error => error.message)
    };
  }
}

module.exports = SmartErrorAnalyzer;
```

---

## 🔄 **INTEGRATION WITH EXISTING SYSTEM**

### **Package.json Scripts**
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:monitored": "concurrently \"npm run dev\" \"npm run monitor\"",
    "monitor": "node scripts/continuous-monitor.js",
    "test:errors": "node scripts/error-monitor.js",
    "fix:auto": "node scripts/auto-fix.js"
  }
}
```

### **Auto-Fix Integration**
```javascript
// scripts/auto-fix.js
const { exec } = require('child_process');
const util = require('util');
const SmartErrorAnalyzer = require('./error-analyzer');

const execPromise = util.promisify(exec);

class AutoFixSystem {
  async processErrorReport(reportPath) {
    const report = JSON.parse(await fs.readFile(reportPath));
    const analyzer = new SmartErrorAnalyzer();
    
    const analyzedErrors = analyzer.analyzeErrors(report.errors);
    const recommendations = analyzer.generateFixRecommendations(analyzedErrors);
    
    if (recommendations.autoFixable.length > 0) {
      await this.requestClaudeFix(recommendations);
    }
  }

  async requestClaudeFix(recommendations) {
    const fixPrompt = this.generateFixPrompt(recommendations);
    
    // Save prompt for Claude
    await fs.writeFile('auto-fix-prompt.txt', fixPrompt);
    
    console.log('🤖 Requesting automated fix from Claude...');
    
    // Call Claude CLI (adjust based on your setup)
    try {
      const result = await execPromise('claude --file auto-fix-prompt.txt');
      console.log('✅ Auto-fix completed:', result.stdout);
    } catch (error) {
      console.error('❌ Auto-fix failed:', error);
    }
  }

  generateFixPrompt(recommendations) {
    return `
You are debugging a React application. Auto-detected errors need fixing:

ERROR ANALYSIS:
${JSON.stringify(recommendations, null, 2)}

BREADCRUMB FAILURES:
Check window.breadcrumbFailures for LED trail context.

Please fix these errors and ensure:
1. All imports are present
2. Variables are defined before use
3. React hooks follow rules
4. Breadcrumb LED system is functional
5. No console errors remain

Provide corrected code with file paths.
    `;
  }
}

module.exports = AutoFixSystem;
```

---

## 🎯 **SIMPLIFIED LEAD PROGRAMMER INTEGRATION**

### **Updated Instructions for Lead Programmer:**
```markdown
## Error Detection Integration

After implementing any component:

1. Send to Breadcrumbs Agent:
   "Breadcrumbs Agent: Please verify LED infrastructure for [ComponentName]"

2. Breadcrumbs Agent will:
   - Automatically test the page
   - Monitor for console errors
   - Check breadcrumb trail functionality
   - Report any issues found

3. If errors detected:
   - Automated error analysis runs
   - Fix recommendations generated
   - Debugging agent called if needed
   - No manual F12 console checking required
```

---

## 🚀 **DEPLOYMENT STEPS**

### **Step 1: Install Dependencies**
```bash
npm install playwright concurrently --save-dev
```

### **Step 2: Create Monitoring Scripts**
```bash
mkdir -p scripts
# Copy the error-monitor.js, continuous-monitor.js, error-analyzer.js files
```

### **Step 3: Start Monitored Development**
```bash
npm run dev:monitored
# This starts both dev server and continuous error monitoring
```

### **Step 4: Validate System**
```bash
# Introduce an intentional error to test
# Should see automatic detection and fix request
```

---

## 🎉 **BENEFITS ACHIEVED**

### **Before This System:**
- Manual F12 console checking
- Trial-and-error debugging cycles  
- Time wasted on repetitive testing
- Errors discovered late by users
- Context switching between code and browser

### **After This System:**
- Automatic console error detection
- Breadcrumb LED failures captured immediately
- Smart error analysis and categorization
- Autonomous fix requests to debugging agents
- Continuous monitoring without human intervention
- Integration with existing breadcrumb system

### **Result:**
**User spends time on**: Creative vision, market analysis, feature ideation
**System handles**: Error detection, analysis, and automated fix requests
**Debugging time**: Reduced from hours to minutes

---

**This system implements the Claude Opus solution while integrating perfectly with the breadcrumb LED system, eliminating manual debugging and testing.**