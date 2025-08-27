# Memory Keeper MCP Instructions for VoiceCoach V2

## Purpose
Maintain continuity across Claude sessions for VoiceCoach V2 development by automatically capturing and retrieving contextual information.

## Automatic Memory Capture
Save ALL of the following without being asked:

### Technical Implementation
- Code architecture decisions and reasoning
- Design patterns chosen for components
- LED breadcrumb numbering schemes and ranges
- TypeScript interfaces and type definitions
- Electron IPC handlers and their purposes
- File structure decisions and organization

### Development Process
- Bugs encountered, root causes, and solutions
- Performance optimizations and benchmarks
- Testing strategies and quality gates
- Code review feedback and improvements
- Refactoring decisions and outcomes

### Project Context
- User requirements and business objectives
- Feature priorities and roadmap decisions
- API integrations and external dependencies
- Configuration settings and environment variables
- Third-party service setup and authentication

### Quality Assurance
- Testing approaches and coverage decisions
- Error handling patterns established
- Security considerations and implementations
- Accessibility requirements and solutions
- Cross-platform compatibility notes

## Memory Categories for VoiceCoach V2

### `voicecoach-v2-core-architecture`
- Overall system design
- Component relationships
- State management approaches
- Data flow patterns

### `voicecoach-v2-rag-system`
- 3-phase processing implementation
- Claude API integration patterns
- Document analysis workflows
- Quality scoring mechanisms

### `voicecoach-v2-ui-components`
- Component design patterns
- User interaction flows
- Styling approaches and themes
- Responsive design decisions

### `voicecoach-v2-electron-integration`
- IPC communication patterns
- File system operations
- Native dialog usage
- Desktop-specific features

### `voicecoach-v2-led-debugging`
- Breadcrumb numbering schemes
- LED range assignments
- Debug command implementations
- Verification patterns

### `voicecoach-v2-testing-qa`
- Testing frameworks chosen
- Quality benchmarks
- Automated testing approaches
- Manual testing procedures

### `voicecoach-v2-deployment`
- Build configurations
- Packaging decisions
- Distribution strategies
- Environment setup

## Memory Behavior Rules

1. **Automatic Capture**: Save important information immediately without being prompted
2. **Memory Notation**: End responses with relevant information using: `[Saved to memory: topic]`
3. **Proactive Retrieval**: Check memories before answering questions to maintain consistency
4. **Context Building**: Reference previous decisions to avoid contradictions
5. **Pattern Recognition**: Identify and save recurring solutions and approaches

## Memory Usage Examples

### When Making Architectural Decisions
```
[Saved to memory: voicecoach-v2-core-architecture] 
Decision to use React Context for global state management rather than Redux due to app simplicity
```

### When Solving Technical Problems
```
[Saved to memory: voicecoach-v2-electron-integration]
Fixed file upload issue by using ipcMain.handle() instead of ipcMain.on() for proper async/await support
```

### When Establishing Patterns
```
[Saved to memory: voicecoach-v2-led-debugging]
LED numbering scheme: 1000-1999 for app lifecycle, 2000-2999 for file operations, 3000-3999 for RAG Phase 1A
```

## Session Continuity Benefits

- New Claude sessions can immediately understand project context
- Consistent technical decisions across development sessions
- Accumulated knowledge about what works and what doesn't
- Reduced time explaining previous decisions
- Better long-term architecture consistency

## Quality Standards

### What to Always Save
✅ Technical decisions with reasoning
✅ Solutions to complex problems
✅ Established patterns and conventions
✅ User feedback and requirements
✅ Performance metrics and optimizations

### What Not to Save
❌ Routine code changes without architectural impact
❌ Temporary debugging output
❌ Standard library usage
❌ Common troubleshooting steps
❌ Generic development advice

This memory system ensures every Claude session builds upon previous knowledge rather than starting from scratch.