# VoiceCoach V2 Architecture

## System Overview
Modern desktop application providing AI-powered sales coaching through document analysis and real-time prompting.

## Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Desktop Runtime**: Electron (Windows/Mac/Linux)
- **AI Processing**: Claude API + 3-phase RAG system
- **Debugging**: LED Breadcrumb System
- **Storage**: localStorage + IndexedDB for large data
- **Build**: Vite + Electron Builder

## Application Architecture

### Core Components
```
App (Root)
├── DocumentUploader        # File handling and validation
├── ContextualQuestionnaire # 5-question user context form
├── ProcessingStatus        # Real-time progress and feedback
├── CoachingInsights        # Display processed knowledge
└── LiveCoachingPanel       # Real-time prompts during calls
```

### Data Flow
```
Document Upload → Validation → Contextual Questions → 3-Phase RAG → Knowledge Base → Live Coaching
```

## 3-Phase RAG System

### Phase 1A: Pure Document Analysis
- **Input**: Raw document content only
- **Process**: Extract ALL actionable sales content
- **Output**: Comprehensive knowledge extraction
- **LED Range**: 3000-3099

### Phase 1B: Contextual Analysis
- **Input**: Same document + user's 5 answers
- **Process**: Prioritize and score based on business context
- **Output**: User-specific coaching priorities  
- **LED Range**: 4000-4099

### Phase 1C: Synthesis & Preparation
- **Input**: Phase 1A + Phase 1B results
- **Process**: Merge, deduplicate, optimize for live coaching
- **Output**: Coaching-ready knowledge structure
- **LED Range**: 5000-5099

## LED Breadcrumb System

### Purpose
Provide complete visibility into system operations for debugging and quality assurance.

### Implementation Pattern
```typescript
const trail = new BreadcrumbTrail('ComponentName');
trail.light(ledId, { operation, data, timestamp: Date.now() });
```

### LED Ranges
- **1000-1099**: Application lifecycle
- **2000-2099**: File operations  
- **3000-5099**: RAG processing phases
- **6000-6099**: Live coaching
- **7000-7099**: UI interactions
- **8000-8099**: Error handling
- **9000-9099**: Testing/validation

## State Management

### Local State (useState)
- Component-specific UI state
- Form inputs and validation
- Local loading states

### Context State (React Context)
- User preferences and settings
- Authentication state (if added)
- Global application status

### Persistent State (localStorage)
- Processed document knowledge
- User questionnaire history
- Application settings

## Error Handling Strategy

### User-Facing Errors
- Clear, actionable error messages
- Suggested remediation steps
- Graceful degradation when possible

### System Errors
- Comprehensive LED breadcrumb logging
- Automatic error recovery where feasible
- Detailed error context for debugging

## Performance Considerations

### Document Processing
- Chunking for large documents
- Progress feedback during analysis
- Cancellable operations

### UI Responsiveness
- Async processing with loading states
- Optimistic UI updates where appropriate
- Efficient re-rendering with React.memo

### Memory Management
- Cleanup on component unmount
- Large data stored in IndexedDB vs memory
- Garbage collection friendly patterns

## Security Considerations

### File Handling
- Validate file types and sizes
- Sanitize file content before processing
- Secure temporary file handling

### External API Integration
- API key management (environment variables)
- Request/response validation
- Rate limiting and retry logic

### Data Storage
- No sensitive data in localStorage
- Encrypt stored documents if needed
- Clear data on uninstall option

## Development Guidelines

### Code Organization
- Single responsibility components
- Clear TypeScript interfaces
- Consistent naming conventions
- Comprehensive error handling

### Testing Strategy
- Unit tests for business logic
- Integration tests for workflows
- E2E tests for critical paths
- LED breadcrumb verification

### Performance Benchmarks
- Document analysis: <30 seconds
- UI interactions: <100ms response
- Application startup: <3 seconds
- Memory usage: <200MB typical