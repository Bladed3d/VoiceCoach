# VoiceCoach V2 - Ollama Live Coaching Setup

## 🎯 What You'll Get
- Real-time transcription of sales calls
- AI coaching suggestions based on your uploaded documents
- Objection handling prompts using your document insights
- Live conversation analysis powered by Ollama

## 📋 Prerequisites

### 1. Install Ollama
```bash
# Windows/Mac/Linux
# Download from: https://ollama.ai/download
```

### 2. Install Python Dependencies
```bash
pip install vosk websockets
```

### 3. Download Vosk Model
```bash
# Download English model for transcription
# https://alphacephei.com/vosk/models
# Extract to: C:\Users\Administrator\Downloads\LLM\vosk-model-en-us-0.22-lgraph\
```

## 🚀 Quick Start

### Step 1: Start Ollama
```bash
# Start Ollama server
ollama serve

# Pull the recommended model (in another terminal)
ollama pull qwen2.5:14b-instruct-q4_k_m
```

### Step 2: Start WebSocket Server
```bash
# In VoiceCoach V2 directory
python src/services/vosk-native-websocket-server.py
```

### Step 3: Test Integration
```bash
# Run the test script
node test-ollama-live-coaching.js
```

### Step 4: Use VoiceCoach V2
```bash
# Start the app
npm run dev
```

## 📄 Document Processing Flow

1. **Upload Document** → App saves to `/rag` folder
2. **Process Document** → Extracts techniques & objection handlers  
3. **JSON Analysis** → Creates structured coaching insights
4. **Load for Coaching** → Document insights available for live calls

## 🎙️ Live Coaching Flow

1. **Start Recording** → WebSocket captures audio
2. **Real-time Transcription** → Vosk converts speech to text
3. **Conversation Analysis** → Every 3 seconds, analyze transcript
4. **Coaching Generation** → Ollama generates suggestions using document insights
5. **Display Coaching** → Show suggestions in right panel

## 🔧 Configuration

### Ollama Settings (in app)
- **Base URL**: `http://localhost:11434`
- **Model**: `qwen2.5:14b-instruct-q4_k_m` (or your preferred model)
- **Temperature**: `0.7` (creativity level)

### WebSocket Settings
- **Server URL**: `ws://127.0.0.1:5000`
- **Audio Format**: 16kHz mono PCM (optimized for Vosk)

## 🧪 Testing Your Setup

### Check Ollama
```bash
curl http://localhost:11434/api/tags
```

### Check WebSocket
```javascript
// In browser console
const ws = new WebSocket('ws://127.0.0.1:5000');
ws.onopen = () => console.log('✅ WebSocket connected');
ws.onerror = (e) => console.log('❌ WebSocket failed:', e);
```

### Test Document Processing
1. Upload any sales document (.txt, .pdf, .md)
2. Answer the 5 questionnaire questions  
3. Wait for processing to complete
4. Check `/rag` folder for saved files

### Test Live Coaching
1. Load a processed document in the app
2. Click "Start Recording" 
3. Speak: "Hi, I'm interested but the price seems high"
4. Wait 3-5 seconds for coaching suggestion
5. Should see suggestion in coaching panel

## 🐛 Troubleshooting

### Ollama Issues
- **Connection refused**: Make sure `ollama serve` is running
- **Model not found**: Run `ollama pull qwen2.5:14b-instruct-q4_k_m`
- **Slow responses**: Try smaller model like `llama3.2:3b`

### WebSocket Issues  
- **Connection failed**: Check if Python server is running
- **No transcription**: Check microphone permissions
- **Poor accuracy**: Use good quality microphone, speak clearly

### Document Processing Issues
- **No insights generated**: Check document has meaningful sales content
- **Processing fails**: Ensure document is readable text format

## 💡 Tips for Best Results

### Document Preparation
- Include specific objection handling examples
- Add conversation starters and discovery questions
- Structure content with clear headers and examples

### Live Coaching
- Speak clearly and at normal pace
- Allow 3-5 seconds between statements for analysis
- Use the coaching suggestions as prompts, not scripts

### Performance Optimization
- Use SSD for faster model loading
- Minimum 8GB RAM for smooth operation  
- Close other resource-intensive applications

## 📁 File Locations

- **Original Documents**: `/rag/[filename]_[timestamp]_original.ext`
- **Processed JSON**: `/rag/[filename]_[timestamp]_phase1A.json`
- **App Settings**: Stored in localStorage
- **Vosk Model**: Configure path in WebSocket server

## 🔄 Workflow Summary

```
Document Upload → RAG Processing → JSON Insights → Live Call → Real-time Coaching
     ↓              ↓               ↓              ↓            ↓
   Save File    Extract Tech.   Structure      Transcribe   Generate
   to /rag      & Objections    Data for       Speech       Suggestions
                                Ollama         w/ Vosk      w/ Ollama
```

Ready to test! 🚀