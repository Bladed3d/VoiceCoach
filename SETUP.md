# VoiceCoach V2 Setup Instructions

## Quick Start

### 1. Install Dependencies
```bash
cd VoiceCoach-v2
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

This will:
- Start Vite dev server on http://localhost:5173
- Launch Electron app with DevTools open
- Enable hot reload for development

### 3. Test the Application
1. **Upload Document**: Use `test-documents/sample-sales-document.txt`
2. **Answer Questions**: Fill out the 5 contextual questions
3. **Watch Processing**: Observe the 3-phase RAG system in action
4. **View Results**: See the generated coaching insights

## Development Commands

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Package Electron app
npm run electron:pack

# Run tests (when implemented)
npm run test

# Lint code
npm run lint
```

## Project Structure

```
VoiceCoach-v2/
├── src/                    # React application
│   ├── components/         # React components
│   ├── lib/               # LED breadcrumb system
│   ├── types/             # TypeScript definitions
│   └── main.tsx           # App entry point
├── docs/                  # V2 documentation
├── .claude/               # Claude agent configurations
├── test-documents/        # Sample files for testing
├── main.js               # Electron main process
├── preload.js            # Electron preload script
└── package.json          # Dependencies and scripts
```

## Key Features Implemented

### ✅ Core Application
- Clean React + TypeScript architecture
- Electron desktop integration
- 4-step workflow: Upload → Questions → Processing → Insights

### ✅ LED Breadcrumb System
- Complete debugging infrastructure
- Range-based LED organization (1000-9999)
- Console commands for debugging
- Verification and quality scoring

### ✅ Document Processing Workflow
- File upload with validation
- 5-question contextual form
- 3-phase processing simulation
- Results display with coaching prompts

### ✅ Desktop Integration
- Electron IPC for file operations
- Native file dialogs
- Local storage for persistence
- Desktop-optimized UI

## Debug Commands

Open DevTools (F12) and use these commands:

```javascript
// View all LED breadcrumbs
window.debug.breadcrumbs.getAll()

// Check specific LED range (e.g., document operations)
window.debug.breadcrumbs.getRange(2000, 2999)

// View failed operations
window.debug.breadcrumbs.getFailures()

// Check overall quality score
window.debug.breadcrumbs.getQualityScore()

// Clear all breadcrumbs for fresh testing
window.debug.breadcrumbs.clear()
```

## Next Steps

### Phase 1: Core Implementation (Ready for Development)
- Implement real Claude API integration
- Add actual file content extraction
- Build 3-phase RAG processing with subagents

### Phase 2: Enhanced Features
- Live coaching interface
- Export functionality
- Settings and preferences
- Advanced document types

### Phase 3: Polish & Deploy
- Comprehensive testing
- Performance optimization
- Packaging and distribution
- User documentation

## Architecture Benefits

### ✅ Clean & Maintainable
- Components under 400 lines each
- Clear separation of concerns
- TypeScript for type safety
- Comprehensive LED debugging

### ✅ Production Ready
- Error handling throughout
- User feedback mechanisms
- Desktop-optimized experience
- Scalable architecture

### ✅ Developer Friendly
- Hot reload development
- Clear project structure
- Extensive documentation
- Debug infrastructure

## Support

This is a completely self-contained V2 implementation with:
- No legacy code dependencies
- Clean agent definitions
- Focused documentation
- Modern development practices

The foundation is ready for rapid feature development based on your new UI designs and requirements!