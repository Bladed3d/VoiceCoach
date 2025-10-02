# MyUI - Multi-AI Coding Interface

A custom coding interface that allows you to send prompts to multiple AI models simultaneously and compare their responses in real-time. Built as a modular component for the VoiceCoach V2 desktop application.

## 🌟 Features

### Core Functionality
- **Parallel AI Querying**: Send one prompt to 4-6 different AI models simultaneously
- **Real-time Comparison**: View responses side-by-side in dedicated panels
- **Intelligent Synthesis**: Automatic analysis and comparison of all responses
- **Project Context**: Include your codebase summary and context in queries
- **Cost Optimization**: Mix cheap and premium models for optimal cost/quality balance

### UI/UX Design
- **Big Screen Layout**: Optimized for large monitors with efficient space usage
- **Right-edge Prompt Input**: Keep your prompt visible while viewing responses
- **Responsive Panels**: 4 or 6-panel grid layout depending on your needs
- **Bottom Synthesis Window**: Comprehensive analysis of all responses
- **Dark Theme**: Coding-friendly dark interface with syntax highlighting

### Technical Features
- **Secure API Key Management**: Encrypted storage of API credentials
- **LED Breadcrumb Debugging**: Full instrumentation with ranges 7000-7099
- **TypeScript Support**: Full type safety and IntelliSense
- **Electron Integration**: Desktop app optimized for performance
- **Context Management**: Automatic project indexing and summarization

## 🏗️ Architecture

```
MyUI/
├── components/           # React components
│   ├── MyUI.tsx         # Main interface component
│   ├── MyUISettings.tsx # Configuration modal
│   └── *.css           # Component styles
├── hooks/               # Custom React hooks
│   └── useMultiAI.ts   # Main state management hook
├── services/            # Core business logic
│   ├── MultiAIService.ts       # Parallel AI querying
│   └── ProjectIndexService.ts  # Codebase analysis
├── types/               # TypeScript definitions
│   └── myui.types.ts   # Interface definitions
└── index.ts            # Module exports
```

## 🚀 Quick Start

### 1. Integration into VoiceCoach V2

```tsx
import { MyUI } from '../docs/MyUI';

// Add to your main app component
function App() {
  return (
    <div>
      {/* Your existing app */}
      <MyUI />
    </div>
  );
}
```

### 2. API Key Configuration

1. Click the settings gear icon in MyUI
2. Add your API keys for the providers you want to use:
   - **Anthropic (Claude)**: Premium model for synthesis and complex analysis
   - **OpenAI (GPT)**: Reliable general-purpose model
   - **DeepSeek**: Ultra-cheap model for exploration and simple tasks
   - **xAI (Grok)**: Alternative perspective model
   - **Google (Gemini)**: Google's AI model
   - **Mistral**: European AI model alternative

### 3. Project Context Setup

1. Click "🔄 Update Context" to scan your project
2. Enable "Include project context in queries" in settings
3. Context will be automatically included in all AI queries

## 💡 Usage Patterns

### Development Workflow

1. **Initial Exploration** (4-6 models)
   ```
   Prompt: "Review this React component for performance optimizations"
   Models: DeepSeek, GPT-4o-mini, Claude, Grok
   Result: Multiple perspectives on optimization strategies
   ```

2. **Architecture Decisions** (Premium focus)
   ```
   Prompt: "Design a scalable microservices architecture for this app"
   Models: Claude-3.5-Sonnet, GPT-4o, Mistral-Large
   Synthesis: Claude generates final recommendation
   ```

3. **Code Review** (Mixed approach)
   ```
   Prompt: "Find security vulnerabilities in this authentication code"
   Models: Mix of cheap (exploration) + premium (verification)
   ```

### Cost Optimization Strategy

- **Cheap Models (DeepSeek $0.14/M)**: Initial exploration, simple questions
- **Medium Models (GPT-4o-mini)**: Reliable general-purpose analysis  
- **Premium Models (Claude)**: Complex analysis, final recommendations, synthesis

## 🔧 Configuration Options

### Panel Layout
- **4 Panels**: Focused comparison, faster responses
- **6 Panels**: Broader perspective, more diverse viewpoints

### Auto-synthesis
- **Enabled**: Automatic analysis after all responses complete
- **Disabled**: Manual synthesis trigger for cost control

### Context Retention
- **Enabled**: Include project summary in all queries
- **Disabled**: Send only the prompt (faster, cheaper)

## 🛡️ Security & Privacy

- **Local API Key Storage**: All credentials encrypted and stored locally
- **No Cloud Dependencies**: Runs entirely within your desktop app
- **Direct API Communication**: No proxy servers or third-party services
- **Audit Trail**: Full LED breadcrumb logging for debugging

## 🎯 LED Breadcrumb Ranges

The MyUI system uses LED breadcrumbs for comprehensive debugging:

- **7000-7099**: MyUI system operations
- **7000-7009**: Service initialization
- **7010-7049**: Individual model queries  
- **7050-7069**: Error handling and recovery
- **7070-7079**: Response synthesis
- **7080-7099**: Project context management
- **7100-7149**: Hook state management
- **7200-7299**: UI interactions
- **7300-7399**: Settings and configuration

## 🔍 Troubleshooting

### Common Issues

1. **API Keys Not Working**
   - Verify key format matches provider requirements
   - Check key has sufficient credits/permissions
   - Ensure network connectivity to provider APIs

2. **Slow Responses**
   - Reduce panel count from 6 to 4
   - Disable context retention for faster queries
   - Use more cheap models, fewer premium models

3. **Context Not Loading**
   - Click "Update Context" to rescan project
   - Verify project files are accessible
   - Check Electron file permissions

4. **Synthesis Failures**
   - Ensure synthesis model API key is valid
   - Try different synthesis model
   - Check individual responses completed successfully

## 🏆 Best Practices

### Prompt Engineering
- **Be Specific**: Clear, detailed prompts get better responses
- **Include Context**: Reference specific files, frameworks, requirements
- **Ask for Comparisons**: "Compare approaches A vs B"
- **Request Examples**: "Provide code examples"

### Model Selection
- **Start Cheap**: Use DeepSeek for initial exploration
- **Verify Premium**: Use Claude/GPT for final decisions
- **Mix Perspectives**: Combine different providers for diversity
- **Optimize Synthesis**: Use your best model for final analysis

### Workflow Integration
- **Update Context Regularly**: Keep project index current
- **Save Important Results**: Copy/paste key insights to your notes
- **Iterate Prompts**: Refine questions based on initial responses
- **Use History**: Reference previous queries in new prompts

## 🔮 Future Enhancements

Planned features for MyUI v2:
- **Response History**: Save and search previous queries
- **Custom Model Configs**: Fine-tune parameters per model
- **Export Options**: Save results as markdown, PDF
- **Collaborative Features**: Share queries with team members
- **Integration APIs**: Connect with VS Code, IDEs
- **Prompt Templates**: Pre-built templates for common tasks

## 📄 License

Part of the VoiceCoach V2 project. See main project license for details.

---

Built for developers who want to escape VS Code's limitations and harness the power of multiple AI models in parallel. Welcome to the future of AI-assisted coding! 🚀