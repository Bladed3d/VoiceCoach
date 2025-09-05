/**
 * VoiceCoach V2 - Vosk Optimizer IPC Handler
 * Handles communication between main process and optimization utility
 */
const { ipcMain, dialog, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const WebSocket = require('ws');

class VoskOptimizerHandler {
  constructor() {
    this.optimizerWindow = null;
    this.optimizationProcess = null;
    this.currentOptimization = null;
    this.setupIpcHandlers();
  }

  setupIpcHandlers() {
    // Handle optimizer launch
    ipcMain.handle('launch-vosk-optimizer', async (event, config) => {
      console.log('🎯 Launching Vosk Optimizer with config:', config);
      
      try {
        // Validate files exist
        const audioExists = await this.fileExists(config.audioFile);
        const textExists = await this.fileExists(config.textFile);
        
        if (!audioExists || !textExists) {
          throw new Error('Test files not found');
        }
        
        // Read reference text
        const referenceText = await fs.readFile(config.textFile, 'utf-8');
        
        // Start optimization process
        const result = await this.runOptimization(config, referenceText);
        
        return {
          success: true,
          data: result
        };
      } catch (error) {
        console.error('❌ Optimization failed:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Handle Vosk config updates
    ipcMain.handle('update-vosk-config', async (event, parameters) => {
      console.log('📝 Updating Vosk configuration:', parameters);
      
      try {
        // Save to config file
        const configPath = path.join(app.getPath('userData'), 'vosk-config.json');
        await fs.writeFile(configPath, JSON.stringify(parameters, null, 2));
        
        // Apply to running Vosk server if active
        if (global.voskServer) {
          await this.applyVoskParameters(parameters);
        }
        
        return { success: true };
      } catch (error) {
        console.error('❌ Failed to update Vosk config:', error);
        return { success: false, error: error.message };
      }
    });

    // Handle file dialog for test files
    ipcMain.handle('open-file-dialog', async (event, options) => {
      const result = await dialog.showOpenDialog(options);
      return result;
    });
  }

  async runOptimization(config, referenceText) {
    const startTime = Date.now();
    const results = [];
    
    // Define parameter combinations to test
    const parameterSets = this.generateParameterSets(config.optimizationMode);
    const totalTests = parameterSets.length;
    
    console.log(`🔬 Testing ${totalTests} parameter combinations...`);
    
    for (let i = 0; i < parameterSets.length; i++) {
      const params = parameterSets[i];
      
      // Update progress
      const progress = Math.round((i / totalTests) * 100);
      if (config.onProgress) {
        config.onProgress(progress);
      }
      
      // Send progress to renderer
      if (this.optimizerWindow) {
        this.optimizerWindow.webContents.send('optimization-progress', progress);
      }
      
      try {
        // Configure Vosk with test parameters
        await this.configureVoskForTest(params);
        
        // Run transcription test
        const testResult = await this.runTranscriptionTest(
          config.audioFile,
          referenceText,
          params
        );
        
        results.push({
          parameters: params,
          metrics: testResult.metrics,
          score: this.calculateScore(testResult.metrics, config.targetMetric || 'balanced')
        });
        
        console.log(`✅ Test ${i + 1}/${totalTests} complete:`, {
          accuracy: testResult.metrics.wordAccuracy.toFixed(1) + '%',
          latency: testResult.metrics.averageLatency + 'ms'
        });
        
      } catch (error) {
        console.error(`❌ Test ${i + 1} failed:`, error);
      }
    }
    
    // Find best result
    const bestResult = results.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    // Calculate improvement over baseline
    const baselineTest = await this.runTranscriptionTest(
      config.audioFile,
      referenceText,
      this.getBaselineParameters()
    );
    
    const improvement = Math.round(
      ((bestResult.metrics.wordAccuracy - baselineTest.metrics.wordAccuracy) / 
       baselineTest.metrics.wordAccuracy) * 100
    );
    
    return {
      timestamp: new Date().toISOString(),
      parameters: bestResult.parameters,
      metrics: bestResult.metrics,
      improvement,
      systemProfile: await this.getSystemProfile(),
      totalTestsRun: results.length,
      testDuration: Math.round((Date.now() - startTime) / 1000) // seconds
    };
  }

  async runTranscriptionTest(audioFile, referenceText, parameters) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const startCpu = process.cpuUsage();
      
      // Create test WebSocket connection
      const ws = new WebSocket('ws://127.0.0.1:5000');
      let transcript = '';
      let chunks = 0;
      
      ws.on('open', async () => {
        // Send config
        ws.send(JSON.stringify({
          type: 'config',
          config: {
            sample_rate: parameters.sampleRate,
            words: parameters.setWords,
            partial_words: parameters.setPartialWords,
            max_alternatives: 0
          }
        }));
        
        // Read and send audio file in chunks
        const audioBuffer = await fs.readFile(audioFile);
        const chunkSize = parameters.chunkSize || 8000;
        
        for (let i = 0; i < audioBuffer.length; i += chunkSize) {
          const chunk = audioBuffer.slice(i, i + chunkSize);
          ws.send(chunk);
          chunks++;
          
          // Small delay to simulate real-time streaming
          await new Promise(r => setTimeout(r, 50));
        }
        
        // Send EOF
        ws.send(JSON.stringify({ type: 'eof' }));
      });
      
      ws.on('message', (data) => {
        try {
          const result = JSON.parse(data.toString());
          if (result.text) {
            transcript += result.text + ' ';
          }
          if (result.type === 'final') {
            ws.close();
          }
        } catch (e) {
          // Binary data, ignore
        }
      });
      
      ws.on('close', () => {
        const endTime = Date.now();
        const endCpu = process.cpuUsage(startCpu);
        
        // Calculate metrics
        const processingTime = (endTime - startTime) / 1000;
        const cpuTime = (endCpu.user + endCpu.system) / 1000000;
        
        resolve({
          transcript: transcript.trim(),
          metrics: {
            wordAccuracy: this.calculateWordAccuracy(referenceText, transcript),
            characterAccuracy: this.calculateCharacterAccuracy(referenceText, transcript),
            realTimeFactor: processingTime / this.getAudioDuration(audioFile),
            averageLatency: Math.round((endTime - startTime) / chunks),
            cpuUsage: Math.round((cpuTime / processingTime) * 100),
            memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
          }
        });
      });
      
      ws.on('error', reject);
    });
  }

  calculateWordAccuracy(reference, hypothesis) {
    const refWords = reference.toLowerCase().trim().split(/\s+/);
    const hypWords = hypothesis.toLowerCase().trim().split(/\s+/);
    
    // Calculate Levenshtein distance
    const matrix = [];
    for (let i = 0; i <= refWords.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= hypWords.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= refWords.length; i++) {
      for (let j = 1; j <= hypWords.length; j++) {
        if (refWords[i - 1] === hypWords[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,     // deletion
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j - 1] + 1  // substitution
          );
        }
      }
    }
    
    const errors = matrix[refWords.length][hypWords.length];
    const accuracy = Math.max(0, 1 - (errors / refWords.length)) * 100;
    return accuracy;
  }

  calculateCharacterAccuracy(reference, hypothesis) {
    const refChars = reference.toLowerCase().replace(/\s+/g, '');
    const hypChars = hypothesis.toLowerCase().replace(/\s+/g, '');
    
    let matches = 0;
    const minLength = Math.min(refChars.length, hypChars.length);
    
    for (let i = 0; i < minLength; i++) {
      if (refChars[i] === hypChars[i]) {
        matches++;
      }
    }
    
    const accuracy = (matches / refChars.length) * 100;
    return accuracy;
  }

  generateParameterSets(mode) {
    const baseline = this.getBaselineParameters();
    
    switch (mode) {
      case 'quick':
        // Test 10-15 most impactful combinations
        return [
          { ...baseline },
          { ...baseline, sampleRate: 8000 },
          { ...baseline, sampleRate: 22050 },
          { ...baseline, chunkSize: 4000 },
          { ...baseline, chunkSize: 16000 },
          { ...baseline, beamSize: 10 },
          { ...baseline, beamSize: 15 },
          { ...baseline, maxActive: 5000 },
          { ...baseline, maxActive: 10000 },
          { ...baseline, silenceThreshold: 0.3 },
          { ...baseline, silenceThreshold: 0.7 },
          { ...baseline, setPartialWords: false },
          { ...baseline, setWords: true },
          { ...baseline, sampleRate: 16000, chunkSize: 4000, beamSize: 15 },
          { ...baseline, sampleRate: 8000, chunkSize: 8000, beamSize: 10 }
        ];
      
      case 'comprehensive':
        // Generate comprehensive grid search
        const parameters = [];
        const sampleRates = [8000, 16000, 22050];
        const chunkSizes = [2000, 4000, 8000, 16000];
        const beamSizes = [10, 13, 15];
        const silenceThresholds = [0.3, 0.5, 0.7];
        
        for (const sr of sampleRates) {
          for (const cs of chunkSizes) {
            for (const bs of beamSizes) {
              for (const st of silenceThresholds) {
                parameters.push({
                  ...baseline,
                  sampleRate: sr,
                  chunkSize: cs,
                  beamSize: bs,
                  silenceThreshold: st
                });
              }
            }
          }
        }
        return parameters;
      
      default:
        return [baseline];
    }
  }

  getBaselineParameters() {
    return {
      sampleRate: 16000,
      chunkSize: 8000,
      beamSize: 13,
      maxActive: 7000,
      latticeBeam: 6,
      silenceThreshold: 0.5,
      minSilenceDuration: 0.5,
      sentenceGap: 0.5,
      partialWords: false,
      setWords: false,
      setPartialWords: true,
      minPhraseWords: 3,
      partialTimeout: 2
    };
  }

  calculateScore(metrics, targetMetric) {
    switch (targetMetric) {
      case 'accuracy':
        return metrics.wordAccuracy * 0.7 + metrics.characterAccuracy * 0.3;
      
      case 'speed':
        return (100 - metrics.averageLatency / 10) * 0.6 + 
               (100 - metrics.realTimeFactor * 100) * 0.4;
      
      case 'balanced':
      default:
        return metrics.wordAccuracy * 0.4 +
               metrics.characterAccuracy * 0.2 +
               (100 - metrics.averageLatency / 10) * 0.2 +
               (100 - metrics.cpuUsage) * 0.2;
    }
  }

  async getSystemProfile() {
    const os = require('os');
    
    return {
      cpuModel: os.cpus()[0].model,
      cpuCores: os.cpus().length,
      availableMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)),
      platform: os.platform()
    };
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getAudioDuration(audioFile) {
    // Simplified - in production would use proper audio library
    const stats = await fs.stat(audioFile);
    // Rough estimate: assume 16kHz mono 16-bit
    return stats.size / (16000 * 2);
  }

  async configureVoskForTest(parameters) {
    // Apply parameters to Vosk server
    // This would communicate with your Python Vosk server
    return new Promise((resolve) => {
      // Simulate configuration time
      setTimeout(resolve, 100);
    });
  }

  async applyVoskParameters(parameters) {
    // Apply to running server
    if (global.voskWebSocket && global.voskWebSocket.readyState === WebSocket.OPEN) {
      global.voskWebSocket.send(JSON.stringify({
        type: 'update_config',
        config: parameters
      }));
    }
  }
}

module.exports = VoskOptimizerHandler;