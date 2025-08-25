\# File: LED-SYSTEM-CORE.md

\# Location: .claude/core/LED-SYSTEM-CORE.md



\# Master LED Breadcrumb System Guide with Automated Verification



\## 🎯 Core Philosophy



The LED Breadcrumb System transforms invisible code execution into visible, traceable, and \*\*verifiable\*\* operations. Every critical operation gets a numbered LED that not only logs what happened but can automatically verify correctness.



\## 📊 Master LED Numbering Scheme



\### Reserved Ranges by Category

```

0000-0099: System initialization and shutdown

0100-0199: User interactions and input events

0200-0299: API calls and external services  

0300-0399: State management and data transformations

0400-0499: UI rendering and display operations

0500-0599: Validation and data processing

0600-0699: Audio/media processing

0700-0799: AI/ML system operations

0800-0899: Business logic and domain operations

0900-0999: Performance metrics and analytics

1000-1999: Component-specific operations (subdivided by component)

2000-2999: Testing and verification operations

3000-3999: Platform-specific (Rust/Tauri, Python, etc.)

4000-4999: Error recovery and debugging

5000-9999: Reserved for future use

```



\## 🔧 Enhanced LED Implementation Pattern



\### Basic LED Structure with Verification



```typescript

// TypeScript/JavaScript Implementation

class VerifiableBreadcrumbTrail extends BreadcrumbTrail {

&nbsp; constructor(componentName: string) {

&nbsp;   super(componentName);

&nbsp;   this.assertions = \[];

&nbsp;   this.verificationMode = true;

&nbsp; }



&nbsp; // Enhanced light method with verification

&nbsp; lightWithVerification(

&nbsp;   ledId: number, 

&nbsp;   data: any,

&nbsp;   verification?: {

&nbsp;     expect: any,

&nbsp;     actual: any,

&nbsp;     validator?: (actual: any) => boolean

&nbsp;   }

&nbsp; ): boolean {

&nbsp;   // Standard LED lighting

&nbsp;   this.light(ledId, data);

&nbsp;   

&nbsp;   // Verification step

&nbsp;   if (verification) {

&nbsp;     const passed = verification.validator 

&nbsp;       ? verification.validator(verification.actual)

&nbsp;       : JSON.stringify(verification.expect) === JSON.stringify(verification.actual);

&nbsp;     

&nbsp;     if (!passed) {

&nbsp;       this.fail(ledId, new Error(

&nbsp;         `Verification failed: Expected ${JSON.stringify(verification.expect)}, ` +

&nbsp;         `got ${JSON.stringify(verification.actual)}`

&nbsp;       ));

&nbsp;       return false;

&nbsp;     }

&nbsp;     

&nbsp;     this.assertions.push({

&nbsp;       ledId,

&nbsp;       passed,

&nbsp;       expect: verification.expect,

&nbsp;       actual: verification.actual,

&nbsp;       timestamp: Date.now()

&nbsp;     });

&nbsp;   }

&nbsp;   

&nbsp;   return true;

&nbsp; }



&nbsp; // Checkpoint method for critical validations

&nbsp; checkpoint(

&nbsp;   ledId: number,

&nbsp;   checkpointName: string,

&nbsp;   validationFn: () => boolean,

&nbsp;   data?: any

&nbsp; ): boolean {

&nbsp;   const passed = validationFn();

&nbsp;   

&nbsp;   if (passed) {

&nbsp;     this.light(ledId, { 

&nbsp;       checkpoint: checkpointName, 

&nbsp;       status: 'PASSED',

&nbsp;       ...data 

&nbsp;     });

&nbsp;   } else {

&nbsp;     this.fail(ledId, new Error(`Checkpoint failed: ${checkpointName}`));

&nbsp;   }

&nbsp;   

&nbsp;   return passed;

&nbsp; }



&nbsp; // Get verification summary

&nbsp; getVerificationSummary(): VerificationReport {

&nbsp;   const failures = this.sequence.filter(led => !led.success);

&nbsp;   const assertions = this.assertions;

&nbsp;   

&nbsp;   return {

&nbsp;     totalLEDs: this.sequence.length,

&nbsp;     failures: failures.length,

&nbsp;     assertionsPassed: assertions.filter(a => a.passed).length,

&nbsp;     assertionsFailed: assertions.filter(a => !a.passed).length,

&nbsp;     failureRate: failures.length / Math.max(this.sequence.length, 1),

&nbsp;     criticalFailures: failures.filter(f => f.id >= 4000 \&\& f.id < 5000),

&nbsp;     verificationPassed: failures.length === 0 \&\& 

&nbsp;                         assertions.every(a => a.passed)

&nbsp;   };

&nbsp; }

}

```



\### Rust Implementation Pattern



```rust

// Rust macro with verification

macro\_rules! led\_verify {

&nbsp;   ($trail:expr, $id:expr, $data:expr, $condition:expr) => {

&nbsp;       if $condition {

&nbsp;           led\_light!($trail, $id, $data);

&nbsp;           true

&nbsp;       } else {

&nbsp;           led\_fail!($trail, $id, format!("Verification failed: {}", stringify!($condition)));

&nbsp;           false

&nbsp;       }

&nbsp;   };

}



// Usage example

led\_verify!(trail, 3230, {"operation": "stream\_creation"}, stream.is\_ok());

```



\## 📝 LED Usage Patterns for Common Operations



\### Pattern 1: Input Validation with LED

```typescript

function processUserInput(input: string): boolean {

&nbsp; const trail = new VerifiableBreadcrumbTrail('InputProcessor');

&nbsp; 

&nbsp; // LED 100: Input received

&nbsp; trail.light(100, { input, length: input.length });

&nbsp; 

&nbsp; // LED 501: Validation with verification

&nbsp; const isValid = input.length > 0 \&\& input.length < 1000;

&nbsp; trail.lightWithVerification(501, 

&nbsp;   { validation: 'input\_length' },

&nbsp;   {

&nbsp;     expect: { minLength: 1, maxLength: 1000 },

&nbsp;     actual: { length: input.length },

&nbsp;     validator: (actual) => actual.length > 0 \&\& actual.length < 1000

&nbsp;   }

&nbsp; );

&nbsp; 

&nbsp; if (!isValid) {

&nbsp;   trail.fail(501, new Error('Input validation failed'));

&nbsp;   return false;

&nbsp; }

&nbsp; 

&nbsp; // LED 502: Processing

&nbsp; trail.light(502, { status: 'processing\_started' });

&nbsp; 

&nbsp; return true;

}

```



\### Pattern 2: API Call with LED Verification

```typescript

async function fetchDataWithLED(url: string): Promise<any> {

&nbsp; const trail = new VerifiableBreadcrumbTrail('APIClient');

&nbsp; 

&nbsp; // LED 200: API call initiated

&nbsp; trail.light(200, { url, method: 'GET' });

&nbsp; 

&nbsp; try {

&nbsp;   const response = await fetch(url);

&nbsp;   

&nbsp;   // LED 201: Response received with verification

&nbsp;   trail.lightWithVerification(201,

&nbsp;     { status: response.status },

&nbsp;     {

&nbsp;       expect: { statusRange: \[200, 299] },

&nbsp;       actual: { status: response.status },

&nbsp;       validator: (actual) => actual.status >= 200 \&\& actual.status < 300

&nbsp;     }

&nbsp;   );

&nbsp;   

&nbsp;   const data = await response.json();

&nbsp;   

&nbsp;   // LED 202: Data parsed with structure verification

&nbsp;   trail.checkpoint(202, 'data\_structure\_valid', () => {

&nbsp;     return data !== null \&\& 

&nbsp;            typeof data === 'object' \&\&

&nbsp;            'required\_field' in data;

&nbsp;   }, { dataKeys: Object.keys(data) });

&nbsp;   

&nbsp;   return data;

&nbsp;   

&nbsp; } catch (error) {

&nbsp;   trail.fail(203, error);

&nbsp;   throw error;

&nbsp; }

}

```



\### Pattern 3: Document Processing Pipeline (Your RAG System)

```typescript

async function processDocumentForRAG(document: string): Promise<ProcessedDoc> {

&nbsp; const trail = new VerifiableBreadcrumbTrail('RAGProcessor');

&nbsp; 

&nbsp; // LED 800: Document received

&nbsp; trail.light(800, { 

&nbsp;   docLength: document.length,

&nbsp;   lineCount: document.split('\\n').length 

&nbsp; });

&nbsp; 

&nbsp; // LED 801: Chunking with size verification

&nbsp; const chunks = createChunks(document);

&nbsp; const allChunksValid = chunks.every(chunk => chunk.length < 4800 \* 4);

&nbsp; 

&nbsp; trail.lightWithVerification(801,

&nbsp;   { operation: 'chunking', chunkCount: chunks.length },

&nbsp;   {

&nbsp;     expect: { maxChunkSize: 4800 \* 4 },

&nbsp;     actual: { largestChunk: Math.max(...chunks.map(c => c.length)) },

&nbsp;     validator: () => allChunksValid

&nbsp;   }

&nbsp; );

&nbsp; 

&nbsp; if (!allChunksValid) {

&nbsp;   return { error: 'Chunks exceed Ollama token limit' };

&nbsp; }

&nbsp; 

&nbsp; // LED 802: Content preservation check

&nbsp; const originalWords = new Set(document.toLowerCase().split(/\\s+/));

&nbsp; const chunkedWords = new Set(chunks.join(' ').toLowerCase().split(/\\s+/));

&nbsp; const preservationRatio = 

&nbsp;   \[...originalWords].filter(w => chunkedWords.has(w)).length / originalWords.size;

&nbsp; 

&nbsp; trail.checkpoint(802, 'content\_preservation', 

&nbsp;   () => preservationRatio > 0.9,

&nbsp;   { preservationRatio }

&nbsp; );

&nbsp; 

&nbsp; // LED 803: JSON generation with validation

&nbsp; const jsonOutput = generateJSON(chunks);

&nbsp; trail.checkpoint(803, 'json\_structure\_valid', () => {

&nbsp;   return jsonOutput.hasOwnProperty('summary') \&\&

&nbsp;          jsonOutput.hasOwnProperty('chunks') \&\&

&nbsp;          jsonOutput.hasOwnProperty('key\_points') \&\&

&nbsp;          Array.isArray(jsonOutput.chunks);

&nbsp; }, { jsonKeys: Object.keys(jsonOutput) });

&nbsp; 

&nbsp; // LED 804: Final verification

&nbsp; const report = trail.getVerificationSummary();

&nbsp; trail.light(804, { 

&nbsp;   verificationPassed: report.verificationPassed,

&nbsp;   report 

&nbsp; });

&nbsp; 

&nbsp; return jsonOutput;

}

```



\## 🔍 Automated Verification Patterns



\### Pre-Execution Verification

```typescript

function preExecutionCheck(operation: string, requirements: any\[]): boolean {

&nbsp; const trail = new VerifiableBreadcrumbTrail('PreExecution');

&nbsp; 

&nbsp; // LED 2000: Pre-execution verification start

&nbsp; trail.light(2000, { operation, requirementCount: requirements.length });

&nbsp; 

&nbsp; let allPassed = true;

&nbsp; requirements.forEach((req, index) => {

&nbsp;   const ledId = 2001 + index;

&nbsp;   const passed = req.validator();

&nbsp;   

&nbsp;   trail.lightWithVerification(ledId,

&nbsp;     { requirement: req.name },

&nbsp;     {

&nbsp;       expect: true,

&nbsp;       actual: passed,

&nbsp;       validator: (actual) => actual === true

&nbsp;     }

&nbsp;   );

&nbsp;   

&nbsp;   allPassed = allPassed \&\& passed;

&nbsp; });

&nbsp; 

&nbsp; // LED 2050: Pre-execution summary

&nbsp; trail.light(2050, { 

&nbsp;   allRequirementsMet: allPassed,

&nbsp;   operation: allPassed ? 'PROCEED' : 'ABORT'

&nbsp; });

&nbsp; 

&nbsp; return allPassed;

}

```



\### Post-Execution Verification

```typescript

function postExecutionVerification(

&nbsp; input: any,

&nbsp; output: any,

&nbsp; expectedCriteria: any\[]

): boolean {

&nbsp; const trail = new VerifiableBreadcrumbTrail('PostExecution');

&nbsp; 

&nbsp; // LED 2100: Post-execution verification start

&nbsp; trail.light(2100, { 

&nbsp;   inputType: typeof input,

&nbsp;   outputType: typeof output,

&nbsp;   criteriaCount: expectedCriteria.length 

&nbsp; });

&nbsp; 

&nbsp; let allCriteriaMet = true;

&nbsp; 

&nbsp; expectedCriteria.forEach((criterion, index) => {

&nbsp;   const ledId = 2101 + index;

&nbsp;   const met = criterion.check(input, output);

&nbsp;   

&nbsp;   trail.checkpoint(ledId, criterion.name, () => met, {

&nbsp;     expected: criterion.expected,

&nbsp;     actual: criterion.extract(output)

&nbsp;   });

&nbsp;   

&nbsp;   allCriteriaMet = allCriteriaMet \&\& met;

&nbsp; });

&nbsp; 

&nbsp; // LED 2150: Final verdict

&nbsp; trail.light(2150, {

&nbsp;   verdict: allCriteriaMet ? 'PASSED' : 'FAILED',

&nbsp;   failedCriteria: expectedCriteria

&nbsp;     .filter((c, i) => !c.check(input, output))

&nbsp;     .map(c => c.name)

&nbsp; });

&nbsp; 

&nbsp; return allCriteriaMet;

}

```



\## 🤖 Integration with Claude Code



\### Required LED Implementation for New Code



When Claude writes new code, it MUST include these LED patterns:



```typescript

// MANDATORY LED TEMPLATE FOR NEW FUNCTIONS

function newFeature(input: any): any {

&nbsp; const trail = new VerifiableBreadcrumbTrail('NewFeature');

&nbsp; 

&nbsp; // LED XXX0: Function entry with input validation

&nbsp; trail.checkpoint(XXX0, 'input\_valid', () => {

&nbsp;   // MUST define what makes input valid

&nbsp;   return input !== null \&\& input !== undefined;

&nbsp; }, { input });

&nbsp; 

&nbsp; // LED XXX1-XXX8: Processing steps

&nbsp; // Each step MUST have verification

&nbsp; 

&nbsp; // LED XXX9: Output validation

&nbsp; trail.checkpoint(XXX9, 'output\_valid', () => {

&nbsp;   // MUST define what makes output valid

&nbsp;   return output !== null \&\& /\* specific checks \*/;

&nbsp; }, { output });

&nbsp; 

&nbsp; // MUST return verification summary for testing

&nbsp; if (global.VERIFICATION\_MODE) {

&nbsp;   global.lastVerification = trail.getVerificationSummary();

&nbsp; }

&nbsp; 

&nbsp; return output;

}

```



\## 📊 Debug Commands Enhanced



\### Core Debug Commands

```javascript

// Get verification report for last operation

window.debug.breadcrumbs.getLastVerification()



// Get all failures with verification context

window.debug.breadcrumbs.getVerificationFailures()



// Run automated test suite using LEDs

window.debug.breadcrumbs.runAutomatedTests()



// Generate test report

window.debug.breadcrumbs.generateTestReport()



// Check specific LED range

window.debug.breadcrumbs.checkRange(800, 850)

```



\### Automated Test Runner

```javascript

window.debug.breadcrumbs.runAutomatedTests = function() {

&nbsp; const tests = \[

&nbsp;   {

&nbsp;     name: 'Document Processing Pipeline',

&nbsp;     ledRange: \[800, 810],

&nbsp;     requiredLEDs: \[800, 801, 802, 803, 804],

&nbsp;     failureThreshold: 0

&nbsp;   },

&nbsp;   {

&nbsp;     name: 'Audio Capture',

&nbsp;     ledRange: \[100, 199],

&nbsp;     requiredLEDs: \[100, 101, 102],

&nbsp;     failureThreshold: 1  // Allow 1 failure

&nbsp;   }

&nbsp; ];

&nbsp; 

&nbsp; const results = tests.map(test => {

&nbsp;   const leds = window.debug.breadcrumbs.getGlobalTrail()

&nbsp;     .filter(led => led.id >= test.ledRange\[0] \&\& led.id <= test.ledRange\[1]);

&nbsp;   

&nbsp;   const failures = leds.filter(led => !led.success);

&nbsp;   const missing = test.requiredLEDs.filter(

&nbsp;     reqId => !leds.some(led => led.id === reqId)

&nbsp;   );

&nbsp;   

&nbsp;   return {

&nbsp;     test: test.name,

&nbsp;     passed: failures.length <= test.failureThreshold \&\& missing.length === 0,

&nbsp;     failures: failures.length,

&nbsp;     missing: missing,

&nbsp;     coverage: leds.length / test.requiredLEDs.length

&nbsp;   };

&nbsp; });

&nbsp; 

&nbsp; return {

&nbsp;   allPassed: results.every(r => r.passed),

&nbsp;   results

&nbsp; };

};

```



\## 🚀 Implementation Checklist for Claude



When implementing any new feature, Claude MUST:



\- \[ ] Assign LED range for the feature (check master list)

\- \[ ] Add entry LED with input validation

\- \[ ] Add checkpoint LEDs for each critical step

\- \[ ] Add verification LEDs with expected vs actual

\- \[ ] Add exit LED with output validation

\- \[ ] Include error LEDs in catch blocks

\- \[ ] Add performance LED if operation >100ms

\- \[ ] Document LED meanings in code comments

\- \[ ] Create test case that verifies all LEDs fire correctly

\- \[ ] Ensure verification summary is accessible



\## 🎯 Success Criteria



Code is considered VERIFIED when:

1\. All required LEDs fire in sequence

2\. No unexpected LED failures occur

3\. All checkpoint validations pass

4\. Input/output verification matches expectations

5\. Performance is within defined thresholds

6\. Verification summary shows 100% pass rate



\## 📝 Example: Complete Function with Full LED Coverage



```typescript

async function processDocumentWithFullLED(

&nbsp; documentPath: string

): Promise<{ success: boolean; result?: any; verification?: any }> {

&nbsp; const trail = new VerifiableBreadcrumbTrail('DocumentProcessor');

&nbsp; 

&nbsp; try {

&nbsp;   // LED 1000: Entry point

&nbsp;   trail.light(1000, { function: 'processDocument', documentPath });

&nbsp;   

&nbsp;   // LED 1001: Input validation

&nbsp;   const inputValid = trail.checkpoint(1001, 'input\_validation', () => {

&nbsp;     return documentPath \&\& documentPath.endsWith('.txt');

&nbsp;   }, { documentPath });

&nbsp;   

&nbsp;   if (!inputValid) {

&nbsp;     return { success: false, verification: trail.getVerificationSummary() };

&nbsp;   }

&nbsp;   

&nbsp;   // LED 1002: File reading

&nbsp;   trail.light(1002, { operation: 'reading\_file' });

&nbsp;   const content = await fs.readFile(documentPath, 'utf-8');

&nbsp;   

&nbsp;   // LED 1003: Content validation

&nbsp;   trail.lightWithVerification(1003,

&nbsp;     { operation: 'content\_validation' },

&nbsp;     {

&nbsp;       expect: { minLength: 100 },

&nbsp;       actual: { length: content.length },

&nbsp;       validator: (actual) => actual.length >= 100

&nbsp;     }

&nbsp;   );

&nbsp;   

&nbsp;   // LED 1004: Processing

&nbsp;   trail.light(1004, { operation: 'processing\_start' });

&nbsp;   const processed = await processContent(content);

&nbsp;   

&nbsp;   // LED 1005: Output verification

&nbsp;   trail.checkpoint(1005, 'output\_verification', () => {

&nbsp;     return processed \&\& 

&nbsp;            processed.chunks \&\& 

&nbsp;            processed.chunks.length > 0 \&\&

&nbsp;            processed.summary;

&nbsp;   }, { chunkCount: processed?.chunks?.length });

&nbsp;   

&nbsp;   // LED 1006: Success

&nbsp;   trail.light(1006, { 

&nbsp;     operation: 'complete',

&nbsp;     success: true 

&nbsp;   });

&nbsp;   

&nbsp;   const verification = trail.getVerificationSummary();

&nbsp;   

&nbsp;   return {

&nbsp;     success: verification.verificationPassed,

&nbsp;     result: processed,

&nbsp;     verification

&nbsp;   };

&nbsp;   

&nbsp; } catch (error) {

&nbsp;   // LED 1099: Error

&nbsp;   trail.fail(1099, error);

&nbsp;   

&nbsp;   return {

&nbsp;     success: false,

&nbsp;     verification: trail.getVerificationSummary()

&nbsp;   };

&nbsp; }

}

```



\## 🔴 Critical Rules for Claude



1\. \*\*NEVER\*\* write code without LED instrumentation

2\. \*\*NEVER\*\* claim code works without verification LEDs passing

3\. \*\*ALWAYS\*\* include checkpoint LEDs at critical points

4\. \*\*ALWAYS\*\* verify actual output matches expected output

5\. \*\*ALWAYS\*\* provide verification summary for testing

6\. \*\*NEVER\*\* skip LED documentation in comments

7\. \*\*ALWAYS\*\* test with actual data, not assumptions



This system transforms your code from "probably works" to "provably works" with numbered, traceable verification points.



\## MANDATORY: All agents MUST follow this LED system

\- Every function requires LED instrumentation

\- Every LED must include verification

\- No code is complete without passing LED verification

