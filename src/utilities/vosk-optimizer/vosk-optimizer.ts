/**
 * VoiceCoach V2 - Vosk Parameter Optimizer
 * Automated testing system to find optimal Vosk transcription parameters
 */
import { BreadcrumbTrail } from '../../lib/breadcrumb-system';
import * as fs from 'fs';
import * as path from 'path';

export interface VoskParameters {
  // Audio processing
  sampleRate: number;
  chunkSize: number;
  
  // Recognition parameters  
  beamSize: number;
  maxActive: number;
  latticeBeam: number;
  acousticScale: number;
  
  // Silence detection
  silenceThreshold: number;
  minSilenceDuration: number;
  sentenceGap: number;
  
  // Feature flags
  partialWords: boolean;
  setWords: boolean;
  setPartialWords: boolean;
  
  // Performance
  minPhraseWords: number;
  partialTimeout: number;
}

export interface TestMetrics {
  wordAccuracy: number;      // Word Error Rate (WER) - lower is better
  characterAccuracy: number;  // Character Error Rate (CER)
  realTimeFactor: number;    // Processing speed relative to audio duration
  averageLatency: number;    // Average response time in ms
  cpuUsage: number;         // Average CPU usage during transcription
  memoryUsage: number;      // Peak memory usage in MB
}

export interface OptimizationConfig {
  audioFile: string;
  textFile: string;
  mode: 'quick' | 'comprehensive' | 'adaptive';
  targetMetric: 'accuracy' | 'speed' | 'balanced';
  cpuLoadSimulation: boolean;
  maxTestDuration: number; // minutes
}

export class VoskOptimizer {
  private trail: BreadcrumbTrail;
  private baselineParams: VoskParameters;
  private parameterGrid: Map<string, any[]>;
  private results: Map<string, TestMetrics>;
  private ws: WebSocket | null = null;
  
  constructor() {
    this.trail = new BreadcrumbTrail('VoskOptimizer');
    this.results = new Map();
    
    // Default baseline parameters
    this.baselineParams = {
      sampleRate: 16000,
      chunkSize: 8000,
      beamSize: 13,
      maxActive: 7000,
      latticeBeam: 6,
      acousticScale: 1.0,
      silenceThreshold: 0.5,
      minSilenceDuration: 0.5,
      sentenceGap: 0.5,
      partialWords: false,
      setWords: false,
      setPartialWords: true,
      minPhraseWords: 3,
      partialTimeout: 2
    };
    
    // Parameter search space
    this.parameterGrid = new Map([
      // Audio parameters - these have huge impact
      ['sampleRate', [8000, 16000, 22050]],
      ['chunkSize', [2000, 4000, 8000, 16000]],
      
      // Accuracy vs Speed tradeoff
      ['beamSize', [10, 13, 15, 20]], // Higher = more accurate but slower
      ['maxActive', [3000, 5000, 7000, 10000]], // Higher = more paths considered
      ['latticeBeam', [4, 6, 8]], // Pruning threshold
      
      // Silence detection - critical for conversation flow
      ['silenceThreshold', [0.3, 0.5, 0.7]],
      ['minSilenceDuration', [0.3, 0.5, 0.8]],
      ['sentenceGap', [0.3, 0.5, 0.75, 1.0]],
      
      // Feature flags
      ['partialWords', [true, false]],
      ['setWords', [true, false]],
      ['setPartialWords', [true, false]],
      
      // Partial recognition
      ['partialTimeout', [1, 2, 3]],
      ['minPhraseWords', [2, 3, 5]]
    ]);
    
    this.trail.light(7600, {
      operation: 'optimizer_initialized',
      parameter_combinations: this.calculateTotalCombinations()
    });
  }
  
  /**
   * Run optimization with given configuration
   */
  async optimize(config: OptimizationConfig): Promise<OptimizationResult> {
    this.trail.light(7601, {
      operation: 'optimization_started',
      mode: config.mode,
      target_metric: config.targetMetric
    });
    
    // Load reference text and audio
    const referenceText = await this.loadReferenceText(config.textFile);
    const audioDuration = await this.getAudioDuration(config.audioFile);
    
    // Get system profile
    const systemProfile = await this.getSystemProfile();
    
    // Generate test combinations based on mode
    const testCombinations = this.generateTestCombinations(config.mode);
    
    // Run tests
    const results: TestResult[] = [];
    let bestResult: TestResult | null = null;
    let bestScore = -Infinity;
    
    for (let i = 0; i < testCombinations.length; i++) {
      const params = testCombinations[i];
      
      // Update progress
      const progress = Math.round((i / testCombinations.length) * 100);
      this.onProgress?.(progress);
      
      try {
        // Start CPU load simulation if requested
        if (config.cpuLoadSimulation) {
          await this.startLoadSimulation();
        }
        
        // Test these parameters
        const metrics = await this.testParameters(
          params,
          config.audioFile,
          referenceText,
          audioDuration
        );
        
        // Calculate score based on target metric
        const score = this.calculateScore(metrics, config.targetMetric);
        
        results.push({ params, metrics, score });
        
        // Track best result
        if (score > bestScore) {
          bestScore = score;
          bestResult = { params, metrics, score };
          
          this.trail.light(7602, {
            operation: 'new_best_found',
            score,
            word_accuracy: metrics.wordAccuracy
          });
        }
        
        // Stop CPU load simulation
        if (config.cpuLoadSimulation) {
          await this.stopLoadSimulation();
        }
        
        // Adaptive mode: Skip similar combinations if this one performed poorly
        if (config.mode === 'adaptive' && score < bestScore * 0.7) {
          i += this.skipSimilarCombinations(params, testCombinations, i);
        }
        
      } catch (error) {
        this.trail.fail(8601, error as Error);
        console.error('Test failed for parameters:', params, error);
      }
      
      // Check timeout
      if (Date.now() - startTime > config.maxTestDuration * 60 * 1000) {
        console.log('Optimization timeout reached');
        break;
      }
    }
    
    // Analyze results
    const improvement = this.calculateImprovement(
      bestResult!.metrics,
      await this.testParameters(this.baselineParams, config.audioFile, referenceText, audioDuration)
    );
    
    this.trail.light(7603, {
      operation: 'optimization_completed',
      tests_run: results.length,
      best_score: bestScore,
      improvement
    });
    
    return {
      timestamp: new Date().toISOString(),
      parameters: bestResult!.params,
      metrics: bestResult!.metrics,
      improvement,
      systemProfile,
      allResults: results,
      baselineMetrics: await this.testParameters(this.baselineParams, config.audioFile, referenceText, audioDuration)
    };
  }
  
  /**
   * Test specific parameters and return metrics
   */
  private async testParameters(
    params: VoskParameters,
    audioFile: string,
    referenceText: string,
    audioDuration: number
  ): Promise<TestMetrics> {
    const startTime = Date.now();
    const startCpu = process.cpuUsage();
    const startMem = process.memoryUsage().heapUsed;
    
    // Configure Vosk with these parameters
    await this.configureVosk(params);
    
    // Run transcription
    const transcript = await this.transcribeAudio(audioFile, params);
    
    // Calculate metrics
    const endTime = Date.now();
    const endCpu = process.cpuUsage(startCpu);
    const endMem = process.memoryUsage().heapUsed;
    
    const processingTime = (endTime - startTime) / 1000; // seconds
    const cpuUsage = ((endCpu.user + endCpu.system) / 1000000) / processingTime * 100;
    const memoryUsage = (endMem - startMem) / (1024 * 1024); // MB
    
    return {
      wordAccuracy: this.calculateWordAccuracy(referenceText, transcript),
      characterAccuracy: this.calculateCharacterAccuracy(referenceText, transcript),
      realTimeFactor: processingTime / audioDuration,
      averageLatency: (endTime - startTime) / transcript.split(' ').length,
      cpuUsage,
      memoryUsage
    };
  }
  
  /**
   * Calculate Word Error Rate (WER) and convert to accuracy
   */
  private calculateWordAccuracy(reference: string, hypothesis: string): number {
    const refWords = reference.toLowerCase().split(/\s+/);
    const hypWords = hypothesis.toLowerCase().split(/\s+/);
    
    // Levenshtein distance for words
    const dp: number[][] = Array(refWords.length + 1)
      .fill(0)
      .map(() => Array(hypWords.length + 1).fill(0));
    
    // Initialize
    for (let i = 0; i <= refWords.length; i++) dp[i][0] = i;
    for (let j = 0; j <= hypWords.length; j++) dp[0][j] = j;
    
    // Fill DP table
    for (let i = 1; i <= refWords.length; i++) {
      for (let j = 1; j <= hypWords.length; j++) {
        if (refWords[i - 1] === hypWords[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,    // Deletion
            dp[i][j - 1] + 1,    // Insertion
            dp[i - 1][j - 1] + 1 // Substitution
          );
        }
      }
    }
    
    const errors = dp[refWords.length][hypWords.length];
    const wer = errors / refWords.length;
    return Math.max(0, (1 - wer) * 100);
  }
  
  /**
   * Calculate Character Error Rate (CER) and convert to accuracy
   */
  private calculateCharacterAccuracy(reference: string, hypothesis: string): number {
    const refChars = reference.toLowerCase().replace(/\s+/g, '');
    const hypChars = hypothesis.toLowerCase().replace(/\s+/g, '');
    
    // Similar to WER but for characters
    const errors = this.levenshteinDistance(refChars, hypChars);
    const cer = errors / refChars.length;
    return Math.max(0, (1 - cer) * 100);
  }
  
  /**
   * Calculate overall score based on target metric
   */
  private calculateScore(metrics: TestMetrics, targetMetric: string): number {
    switch (targetMetric) {
      case 'accuracy':
        // Prioritize accuracy over speed
        return metrics.wordAccuracy * 0.6 + 
               metrics.characterAccuracy * 0.3 +
               (100 - metrics.realTimeFactor * 100) * 0.1;
      
      case 'speed':
        // Prioritize speed over accuracy
        return (100 - metrics.realTimeFactor * 100) * 0.5 +
               (100 - metrics.averageLatency / 10) * 0.3 +
               metrics.wordAccuracy * 0.2;
      
      case 'balanced':
      default:
        // Balance between accuracy and speed
        return metrics.wordAccuracy * 0.35 +
               metrics.characterAccuracy * 0.25 +
               (100 - metrics.realTimeFactor * 100) * 0.2 +
               (100 - metrics.averageLatency / 10) * 0.1 +
               (100 - metrics.cpuUsage) * 0.1;
    }
  }
  
  /**
   * Generate test parameter combinations based on mode
   */
  private generateTestCombinations(mode: string): VoskParameters[] {
    switch (mode) {
      case 'quick':
        // Test only the most impactful parameters
        return this.generateQuickCombinations();
      
      case 'comprehensive':
        // Test all combinations (warning: can be thousands!)
        return this.generateAllCombinations();
      
      case 'adaptive':
        // Smart search using genetic algorithm
        return this.generateAdaptiveCombinations();
      
      default:
        return this.generateQuickCombinations();
    }
  }
  
  /**
   * Quick mode: Test ~20 most impactful combinations
   */
  private generateQuickCombinations(): VoskParameters[] {
    const combinations: VoskParameters[] = [];
    
    // Most impactful parameters
    const criticalParams = [
      { sampleRate: 16000, chunkSize: 4000, beamSize: 13 },
      { sampleRate: 16000, chunkSize: 8000, beamSize: 13 },
      { sampleRate: 16000, chunkSize: 4000, beamSize: 15 },
      { sampleRate: 8000, chunkSize: 4000, beamSize: 13 },
      { sampleRate: 22050, chunkSize: 8000, beamSize: 15 },
    ];
    
    for (const critical of criticalParams) {
      for (const silenceThreshold of [0.3, 0.5, 0.7]) {
        for (const setPartialWords of [true, false]) {
          combinations.push({
            ...this.baselineParams,
            ...critical,
            silenceThreshold,
            setPartialWords
          });
        }
      }
    }
    
    return combinations;
  }
  
  /**
   * Comprehensive mode: Test all combinations
   */
  private generateAllCombinations(): VoskParameters[] {
    // This could generate thousands of combinations
    // Implement with caution!
    const combinations: VoskParameters[] = [];
    
    // Recursive generation of all combinations
    const keys = Array.from(this.parameterGrid.keys());
    
    const generate = (index: number, current: any) => {
      if (index === keys.length) {
        combinations.push({ ...this.baselineParams, ...current });
        return;
      }
      
      const key = keys[index];
      const values = this.parameterGrid.get(key)!;
      
      for (const value of values) {
        generate(index + 1, { ...current, [key]: value });
      }
    };
    
    generate(0, {});
    return combinations;
  }
  
  /**
   * Adaptive mode: Use genetic algorithm for smart search
   */
  private generateAdaptiveCombinations(): VoskParameters[] {
    // Start with diverse initial population
    const population: VoskParameters[] = [];
    
    // Add baseline
    population.push(this.baselineParams);
    
    // Add some random variations
    for (let i = 0; i < 10; i++) {
      population.push(this.generateRandomParams());
    }
    
    // This will evolve as tests run
    return population;
  }
  
  /**
   * Simulate CPU load to match real-world conditions
   */
  private async startLoadSimulation(): Promise<void> {
    // Simulate Ollama processing
    this.loadSimulatorInterval = setInterval(() => {
      // CPU-intensive operation
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += Math.sqrt(i);
      }
    }, 100);
  }
  
  private async stopLoadSimulation(): Promise<void> {
    if (this.loadSimulatorInterval) {
      clearInterval(this.loadSimulatorInterval);
      this.loadSimulatorInterval = null;
    }
  }
  
  /**
   * Get system profile for context
   */
  private async getSystemProfile(): Promise<SystemProfile> {
    const os = require('os');
    
    return {
      cpuModel: os.cpus()[0].model,
      cpuCores: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)), // GB
      availableMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)), // GB
      platform: os.platform(),
      backgroundNoise: await this.detectBackgroundNoise()
    };
  }
  
  private calculateTotalCombinations(): number {
    let total = 1;
    for (const values of this.parameterGrid.values()) {
      total *= values.length;
    }
    return total;
  }
}