# Voice Coach OpenRouter Coaching System with LED Breadcrumb Infrastructure

## 🎯 Overview

This is a comprehensive real-time voice coaching system that integrates:

- **OpenRouter API** for GPT-4 Turbo/Claude-3.5 Sonnet coaching prompts
- **RAG Knowledge System** with ChromaDB for contextual coaching guidance  
- **LED Breadcrumb Infrastructure** for instant debugging and performance monitoring
- **Tauri Integration** for React frontend communication
- **Real-time Transcription** with Faster-Whisper models
- **<2 Second Response Time** target with performance tracking

## 🔧 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Microphone    │───▶│   Transcription  │───▶│   Coaching      │
│   Audio Input   │    │   Pipeline       │    │   Context       │
└─────────────────┘    └──────────────────┘    │   Analysis      │
                                               └─────────────────┘
                                                        │
┌─────────────────┐    ┌──────────────────┐            ▼
│   Tauri React   │◀───│   WebSocket      │    ┌─────────────────┐
│   Frontend      │    │   Integration    │◀───│   OpenRouter    │
└─────────────────┘    └──────────────────┘    │   API Calls     │
                                               └─────────────────┘
                                                        │
┌─────────────────┐    ┌──────────────────┐            ▼
│   LED           │◀───│   RAG Knowledge  │    ┌─────────────────┐
│   Breadcrumbs   │    │   ChromaDB       │◀───│   Coaching      │
└─────────────────┘    └──────────────────┘    │   Prompts       │
                                               └─────────────────┘
```

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Python packages
pip install torch
pip install openai-whisper
pip install faster-whisper
pip install sentence-transformers
pip install chromadb
pip install fastapi
pip install uvicorn
pip install websockets
pip install aiohttp
pip install numpy
pip install pyaudio
pip install sounddevice
pip install customtkinter

# For Windows users - PyAudio may need special installation
pip install pyaudio
# If that fails, download wheel file from:
# https://www.lfd.uci.edu/~gohlke/pythonlibs/#pyaudio
```

### 2. Environment Setup

```bash
# Required: OpenRouter API Key
export OPENROUTER_API_KEY="your-openrouter-api-key-here"

# Optional configuration
export ENABLE_RAG="true"                    # Enable RAG knowledge system
export ENABLE_TAURI="true"                  # Enable Tauri integration
export RAG_DB_PATH="./chroma_coaching_db"   # ChromaDB persistence directory
export TAURI_HOST="127.0.0.1"              # Tauri WebSocket host
export TAURI_PORT="8765"                    # Tauri WebSocket port
export MAX_RESPONSE_TIME_MS="2000"         # Target response time
export TRANSCRIPTION_MODEL="distil-large-v3" # Whisper model
export POPULATE_KNOWLEDGE="true"           # Auto-populate default knowledge
```

### 3. Run the Complete System

```bash
# Start the complete coaching pipeline
python coaching_pipeline_main.py
```

### 4. Alternative: Run Individual Components

```bash
# Test OpenRouter coaching system only
python openrouter_coaching_system.py

# Test RAG knowledge system only  
python rag_knowledge_system.py

# Test Tauri integration only
python tauri_integration_system.py

# Test transcription pipeline only
python transcription_pipeline.py
```

## 💡 LED Breadcrumb System

### LED Number Ranges

| Range | System | Purpose |
|-------|--------|---------|
| 100-199 | Audio Capture | Microphone input, VAD, audio processing |
| 200-299 | AI Model Operations | Model loading, inference, GPU operations |
| 300-399 | Transcription Pipeline | Real-time transcription processing |
| 400-499 | Performance Monitoring | Latency, memory, throughput tracking |
| 500-599 | Speaker Identification | User/prospect channel separation |
| 600-699 | IPC Communication | Python-Tauri communication |
| 700-799 | OpenRouter API | API authentication, requests, responses |
| 800-899 | Coaching Context | Conversation analysis, intent detection |
| 900-999 | Coaching Prompts | Prompt generation, quality checks |
| 1000-1099 | RAG Knowledge | Vector search, knowledge retrieval |
| 1100-1199 | Tauri Integration | Frontend communication, UI updates |

### LED Debug Commands

```python
# In Python console or debugger:

# View all AI system performance
from ai_breadcrumb_system import print_ai_performance_summary
print_ai_performance_summary()

# View recent failures
from ai_breadcrumb_system import print_ai_recent_failures  
print_ai_recent_failures()

# View latency violations
from ai_breadcrumb_system import print_ai_latency_violations
print_ai_latency_violations()

# Export complete trace
from ai_breadcrumb_system import export_all_traces
files = export_all_traces("./debug_traces")
```

### Real-time LED Monitoring

LEDs light up in console with format:
```
💡 107 ✅ CONTEXT_ANALYSIS_START [OpenRouterCoaching] - analyzing_context (234.5ms)
💡 904 ✅ PROMPT_CLAUDE_SONNET_CALL [OpenRouterCoaching] - calling_anthropic_claude_3_5_sonnet (891.2ms) (conf: 0.85)
💡 1003 ✅ RAG_KNOWLEDGE_RETRIEVAL [RAGKnowledgeSystem] - knowledge_retrieved (45.1ms) | 3 documents found
```

## 🎯 Coaching Features

### Real-time Coaching Triggers

1. **Objection Detection**: Automatically detects when prospects raise objections
2. **Question Handling**: Provides guidance when prospects ask questions  
3. **Sentiment Analysis**: Monitors conversation sentiment and suggests rapport building
4. **Closing Opportunities**: Identifies and guides closing attempts
5. **Competition Mentions**: Provides differentiation strategies

### Coaching Prompt Types

- **objection_handling**: Strategies for overcoming specific objections
- **question_response**: How to answer prospect questions effectively
- **closing_guidance**: When and how to attempt closes
- **rapport_building**: Techniques for building stronger connections
- **general_guidance**: Overall conversation improvement tips

### RAG Knowledge Categories

- **objection_handling**: Proven objection response frameworks
- **product_info**: Product positioning and differentiation
- **pricing**: Value-based pricing conversations
- **competition**: Competitive differentiation strategies  
- **closing**: Trial closes and closing techniques

## 🔗 Tauri Frontend Integration

### WebSocket Connection

```javascript
// Connect to coaching backend
const ws = new WebSocket('ws://127.0.0.1:8765/coaching');

// Send transcription updates
ws.send(JSON.stringify({
  type: 'transcription_update',
  payload: {
    text: 'What is your pricing for the premium package?',
    speaker: 'prospect',
    timestamp: Date.now()
  }
}));

// Receive coaching prompts
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.message_type === 'coaching_prompt') {
    const prompt = message.payload.coaching_prompt;
    displayCoachingPrompt(prompt.prompt_text, prompt.coaching_type);
  }
};
```

### Available Endpoints

- `ws://127.0.0.1:8765/coaching` - Main WebSocket for real-time coaching
- `http://127.0.0.1:8765/health` - Health check endpoint
- `http://127.0.0.1:8765/performance` - Performance metrics endpoint

## 📊 Performance Monitoring

### Target Performance Metrics

- **Coaching Response Time**: <2 seconds from transcription to prompt
- **API Response Time**: <1 second for OpenRouter calls
- **RAG Retrieval Time**: <100ms for knowledge search
- **Transcription Latency**: <500ms for voice-to-text
- **End-to-End Latency**: <2.5 seconds total pipeline

### Performance Dashboard

```bash
# While system is running, press 'd' for dashboard:

📊 PIPELINE OVERVIEW:
   Status: 🟢 RUNNING
   Uptime: 1247.3 seconds
   Total Transcriptions: 89
   Total Coaching Prompts: 34
   Coaching Prompt Rate: 38.2%

🤖 OPENROUTER COACHING:
   Success Rate: 94.1%
   Avg Response Time: 1,234.5ms
   Under Target Rate: 87.3%

🧠 RAG KNOWLEDGE:
   Total Documents: 25
   Cache Hit Rate: 73.2%
   Avg Retrieval Time: 67.8ms

💡 LED BREADCRUMB SUMMARY:
   Total Operations: 2,847
   Success Rate: 96.8%
   Failed Operations: 91
```

## 🐛 Troubleshooting

### Common Issues

1. **OpenRouter API Key Error**
   ```
   LED 700 ❌ OPENROUTER_AUTH_INIT - missing_api_key
   ```
   Solution: Set `OPENROUTER_API_KEY` environment variable

2. **ChromaDB Initialization Failed**
   ```
   LED 1001 ❌ RAG_CHROMADB_QUERY - chromadb_init_failed
   ```
   Solution: Check write permissions for RAG database directory

3. **Transcription Model Loading Failed**
   ```
   LED 201 ❌ AI_MODEL_LOADING - model_download_failed
   ```
   Solution: Check internet connection and disk space for model downloads

4. **Tauri WebSocket Connection Failed**
   ```
   LED 1104 ❌ TAURI_IPC_RECEIVE - websocket_connection_failed
   ```
   Solution: Check port availability and firewall settings

### Debug Mode

```bash
# Enable detailed logging
export LOG_LEVEL="DEBUG"
python coaching_pipeline_main.py

# Export debug traces
python -c "
from ai_breadcrumb_system import export_all_traces
files = export_all_traces('./debug_export')
print(f'Debug traces exported to: {files}')
"
```

## 🔧 Customization

### Adding Custom Knowledge

```python
from rag_knowledge_system import get_rag_system

rag = get_rag_system()

# Add custom coaching knowledge
rag.add_knowledge_document(
    content="When prospects mention budget constraints, focus on ROI calculations and payment terms flexibility.",
    title="Budget Objection Handling", 
    category="objection_handling",
    tags=["budget", "roi", "payment_terms"]
)
```

### Custom Coaching Models

```python
from openrouter_coaching_system import OpenRouterCoachingSystem

# Configure different models
coaching_system = OpenRouterCoachingSystem(
    api_key="your-key",
    max_response_time_ms=1500
)

# Override model selection
coaching_system.coaching_models = {
    'primary': 'openai/gpt-4-turbo',
    'fallback': 'anthropic/claude-3.5-sonnet', 
    'fast': 'openai/gpt-3.5-turbo-16k'
}
```

### Custom LED Ranges

```python
from ai_breadcrumb_system import AILEDRanges

# Add custom LED ranges for your modules
class CustomLEDRanges(IntEnum):
    CUSTOM_MODULE_START = 1200
    CUSTOM_OPERATION_1 = 1201
    CUSTOM_OPERATION_2 = 1202
    # ... up to 1299
```

## 📈 Production Deployment

### System Requirements

- **CPU**: 4+ cores recommended for real-time processing
- **RAM**: 8GB+ recommended (4GB for models, 4GB for processing)
- **Storage**: 10GB+ for models and knowledge database
- **Network**: Stable internet for OpenRouter API calls
- **GPU**: Optional CUDA GPU for faster transcription

### Environment Variables for Production

```bash
export OPENROUTER_API_KEY="prod-api-key"
export RAG_DB_PATH="/var/lib/voice-coach/chroma_db"
export TAURI_HOST="0.0.0.0"  # Listen on all interfaces
export TAURI_PORT="8765"
export MAX_RESPONSE_TIME_MS="1500"  # Stricter production target
export LOG_LEVEL="INFO"
export ENABLE_RAG="true"
export ENABLE_TAURI="true"
```

### Docker Deployment

```dockerfile
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    portaudio19-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy application
COPY . /app
WORKDIR /app

# Install Python dependencies  
RUN pip install -r requirements.txt

# Expose WebSocket port
EXPOSE 8765

# Run coaching pipeline
CMD ["python", "coaching_pipeline_main.py"]
```

## 🏆 Success Metrics

### Key Performance Indicators

1. **Response Time Compliance**: >90% of prompts under 2 seconds
2. **Coaching Relevance**: User feedback scoring >4.0/5.0
3. **System Uptime**: >99.5% availability during business hours
4. **API Success Rate**: >95% successful OpenRouter calls
5. **Knowledge Retrieval Accuracy**: >80% relevant knowledge matches

### LED Breadcrumb Analytics

- Track operation success rates by LED range
- Identify performance bottlenecks by timing analysis
- Monitor system health through failure pattern detection
- Generate performance reports from breadcrumb data

---

**LED Infrastructure Complete**: All OpenRouter coaching operations now have comprehensive LED breadcrumb debugging for instant error location and performance monitoring. The system provides <2 second coaching response times with full traceability.