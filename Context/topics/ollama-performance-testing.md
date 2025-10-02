# VoiceCoach V2 - Ollama Performance Testing Guide

## Overview
This guide helps you measure and compare Ollama model performance using timing data from the `--verbose` flag.

## Quick Start

### Windows
```bash
# Start Ollama with verbose timing
./scripts/start-ollama-verbose.bat
```

### Linux/Mac
```bash
# Make script executable
chmod +x ./scripts/start-ollama-verbose.sh

# Start Ollama with verbose timing
./scripts/start-ollama-verbose.sh
```

## Performance Testing Process

### 1. Baseline Test (Small Model)
```bash
# Pull and test a fast, small model
ollama pull llama3.2:3b

# In VoiceCoach V2, change model to: llama3.2:3b
# Run a coaching test and note timing from verbose output
```

### 2. Large Model Test
```bash
# Pull and test your target model
ollama pull qwen2.5:14b-instruct-q4_k_m

# In VoiceCoach V2, change model to: qwen2.5:14b-instruct-q4_k_m
# Run same coaching test and compare timing
```

### 3. Read Verbose Output
The `--verbose` flag shows timing like this:
```
time=2025-01-09T12:34:56.789Z level=INFO source=server.go:123 msg="request completed"
duration=2.345s tokens_per_second=45.2 prompt_tokens=156 completion_tokens=89
```

Key metrics to compare:
- **duration**: Total response time
- **tokens_per_second**: Generation speed
- **prompt_tokens**: Input size processed
- **completion_tokens**: Output generated

## Model Comparison Template

Create a performance log like this:

### Model: llama3.2:3b
- **First Load Time**: ___ seconds (model loading)
- **Average Response Time**: ___ seconds
- **Tokens/Second**: ___
- **Memory Usage**: ___ MB
- **Quality**: ___/10 (subjective coaching quality)

### Model: qwen2.5:14b-instruct-q4_k_m
- **First Load Time**: ___ seconds
- **Average Response Time**: ___ seconds
- **Tokens/Second**: ___
- **Memory Usage**: ___ MB
- **Quality**: ___/10 (subjective coaching quality)

### Performance Analysis
- **Speed Difference**: ___% slower/faster
- **Quality Difference**: Better/Same/Worse coaching suggestions
- **Trade-off Decision**: Use faster model for real-time, larger for quality?

## Testing Scenarios

### Test 1: Simple Coaching Request
Input transcript: "Hi, I'm interested but the price seems high"
- Measure response time
- Note coaching quality
- Compare across models

### Test 2: Complex Conversation Analysis
Input longer transcript with multiple objections
- Test how model handles complex context
- Measure performance degradation with longer inputs

### Test 3: Rapid-fire Testing
Send 5 requests in quick succession
- Test model performance under load
- See if caching improves subsequent requests

## Model Recommendations Based on Use Case

### Real-time Coaching (Speed Priority)
- **Fastest**: llama3.2:3b (~1-2s response)
- **Balanced**: qwen2.5:7b-instruct (~2-4s response)
- **Quality**: qwen2.5:14b-instruct (~4-8s response)

### Batch Processing (Quality Priority)
- Use largest model available
- Process documents offline
- Real-time uses pre-processed insights

## Configuration Options

### VoiceCoach V2 Settings
You can switch models in the app:
1. Go to Settings → Live Coaching
2. Change "Ollama Model" field
3. Click "Test Connection" to verify
4. Save settings

### Environment Variables
Set default model for testing:
```bash
export OLLAMA_DEFAULT_MODEL=llama3.2:3b
# or
export OLLAMA_DEFAULT_MODEL=qwen2.5:14b-instruct-q4_k_m
```

## Automated Performance Testing

### Script Template
```javascript
// test-model-performance.js
const models = ['llama3.2:3b', 'qwen2.5:14b-instruct-q4_k_m'];
const testTranscript = "Hi, I'm interested but the price seems high";

for (const model of models) {
  console.log(`Testing ${model}...`);
  const startTime = performance.now();

  // Make Ollama request with model
  // Record timing and quality metrics

  const endTime = performance.now();
  console.log(`${model}: ${endTime - startTime}ms`);
}
```

## Results Analysis

### Speed vs Quality Matrix
```
                Fast    Balanced    High Quality
Small Models    ⭐⭐⭐    ⭐⭐         ⭐
Medium Models   ⭐⭐      ⭐⭐⭐       ⭐⭐
Large Models    ⭐       ⭐⭐         ⭐⭐⭐
```

### Recommendation Engine
- **Real-time demos**: Use fastest model that gives acceptable coaching
- **Production coaching**: Balance speed vs quality based on user feedback
- **Training/Analysis**: Use highest quality model regardless of speed

## Monitoring in Production

### LED Breadcrumb Integration
The VoiceCoach V2 LED system already tracks Ollama performance:
- LED 6110: Coaching generation start
- LED 6111: Coaching generation complete
- Duration = LED 6111 timestamp - LED 6110 timestamp

### Performance Alerts
Set up alerts for:
- Response times > 5 seconds
- Tokens/second < 20
- Model load failures
- Memory usage spikes

## Best Practices

1. **Test with realistic data** - Use actual sales conversation transcripts
2. **Measure multiple runs** - Average performance over 10+ requests
3. **Test under load** - Simulate multiple concurrent users
4. **Monitor resource usage** - CPU, RAM, GPU utilization
5. **Document trade-offs** - Speed vs quality decisions with rationale

This verbose timing data will give you precise metrics to optimize your Ollama model selection based on your specific performance requirements.