# MyUI - Multi-AI Coding Interface

A Python Streamlit application that allows you to query multiple AI models simultaneously and compare their responses. Built to escape VS Code's layout limitations and give you parallel access to different AI perspectives.

## 🚀 Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the app
streamlit run myui-app.py
```

The app will open at `http://localhost:8501`

## ✨ Features

### Core Functionality
- **Parallel AI Queries** - Send one prompt to 4-6 models simultaneously
- **Model Selection** - Choose different AI models for each panel
- **Real-time Comparison** - View responses side-by-side
- **Intelligent Synthesis** - AI-powered analysis of all responses
- **Cost Tracking** - Monitor spending per model and query

### Project Integration
- **Project Scanning** - Automatically analyze your codebase
- **Context Inclusion** - Include project summary in queries
- **Smart Filtering** - Only scan relevant file types
- **AI Summarization** - Use DeepSeek to create project context

### Productivity Features
- **Export to Markdown** - Save results for later reference
- **Query History** - Track and reload previous queries  
- **Adjustable Panels** - 4, 5, or 6 panel layouts
- **Cost Optimization** - Mix cheap and premium models

## 🔧 Setup

1. **Get OpenRouter API Key**
   - Visit [OpenRouter.ai](https://openrouter.ai/keys)
   - Create account and generate API key
   - This gives you access to all supported models

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Application**
   ```bash
   streamlit run myui_app.py
   ```

4. **Configure**
   - Enter your OpenRouter API key in the sidebar
   - Select models for each panel
   - Start querying!

## 💰 Supported Models & Costs (this is original data that has since been updated)

| Model | Provider | Cost per 1M tokens | Best For |
|-------|----------|-------------------|----------|
| **DeepSeek Chat** | DeepSeek | $0.14 | Exploration, quick questions |
| **GPT-4o Mini** | OpenAI | $0.15 | General purpose, reliable |
| **Gemini Pro** | Google | $0.50 | Alternative perspective |
| **Mistral Large** | Mistral | $2.00 | European AI approach |
| **Claude 3.5 Sonnet** | Anthropic | $3.00 | Complex analysis, synthesis |
| **Grok Beta** | xAI | $5.00 | Unique insights, creativity |

**Cost Optimization Strategy:**
- Use DeepSeek for initial exploration
- Mix with 1-2 premium models for quality
- Use Claude for synthesis (best at comparison)

## 🎯 Usage Examples

### 1. Code Review
```
Prompt: "Review this React component for performance issues and suggest optimizations: [paste code]"

Select: DeepSeek Chat, GPT-4o Mini, Claude 3.5 Sonnet
Synthesis: Claude 3.5 Sonnet
```

### 2. Architecture Design
```
Prompt: "Design a scalable microservices architecture for [describe your app]"

Select: Claude 3.5 Sonnet, GPT-4o Mini, Mistral Large, Gemini Pro  
Synthesis: Claude 3.5 Sonnet
```

### 3. Bug Investigation  
```
Prompt: "Debug this error: [error message and code context]"

Select: All 6 models for maximum perspective
Synthesis: Claude 3.5 Sonnet
```

## 🏗️ How It Works

1. **Input**: Enter prompt in sidebar
2. **Context**: Optionally scan project for context
3. **Selection**: Choose models for each panel
4. **Query**: Send requests in parallel via OpenRouter
5. **Display**: View responses side-by-side
6. **Synthesis**: Generate comprehensive analysis
7. **Export**: Save results to markdown

## 📁 Project Context

The app can scan your project and include context in queries:

- **File Scanning**: Uses `os.walk()` to find relevant files
- **Smart Filtering**: Only includes code files (.py, .js, .ts, etc.)
- **AI Summarization**: Uses DeepSeek to create project summary
- **Context Inclusion**: Automatically includes context in queries

This helps AI models understand your specific codebase and provide more relevant advice.

## 📊 Cost Management

Track your spending in real-time:

- **Per-Query Costs**: See cost for each model response
- **Running Total**: Monitor total spending
- **Model Comparison**: Choose cost-effective combinations
- **Export Data**: Keep records of what you're spending

## 💡 Pro Tips

### Effective Prompting
- Be specific about your context and requirements
- Ask for code examples when needed
- Request comparisons between approaches
- Include error messages and stack traces

### Model Selection Strategy
- **Quick Questions**: DeepSeek only (ultra-cheap)
- **Important Decisions**: Mix of cheap + premium models
- **Complex Analysis**: All premium models
- **Exploration**: All 6 models for maximum diversity

### Context Usage
- Keep project context updated
- Include context for architecture questions
- Skip context for general programming questions
- Use context when asking about specific files/patterns

## 🔍 Troubleshooting

**API Errors**
- Verify OpenRouter API key is correct
- Check you have credits/billing setup
- Some models may be temporarily unavailable

**No Responses**  
- Check internet connection
- Verify API key has access to selected models
- Try with fewer models first

**Context Issues**
- Make sure you're in a project directory
- Check file permissions for scanning
- Try without context first

## 📝 Files Created

The app creates these local files:
- `myui_config.json` - Your settings and API key
- `project_context.json` - Cached project analysis  
- `query_history.json` - Your query history
- `myui_export_*.md` - Exported results

## 🎪 Why This is Better Than Single AI

**Problem with single AI:**
- Limited to one perspective
- Prone to blind spots and biases  
- No way to validate responses
- Context resets lose continuity

**MyUI Solution:**
- Multiple perspectives on every question
- Cross-validation of responses
- Identify consensus vs unique insights
- Persistent context and history
- Cost optimization with model mixing

This gives you the collective intelligence of multiple AI systems while managing costs and maximizing insights.

## 🚀 Ready to Use

Your multi-AI coding interface is ready! This tool will transform how you approach coding problems by giving you access to diverse AI perspectives simultaneously.

Start with simple questions to get familiar, then tackle your complex coding challenges with the full power of multiple AI models working together.