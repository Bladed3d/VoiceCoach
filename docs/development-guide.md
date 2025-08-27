# VoiceCoach V2 Development Guide

## Quick Start

### Setup
```bash
cd VoiceCoach-v2
npm install
npm run dev  # Launches Electron app with DevTools
```

### Development Workflow
1. Create feature branch
2. Implement with LED breadcrumbs
3. Write tests
4. Manual testing
5. Code review
6. Deploy

## Component Development

### Creating New Components
```typescript
// Template for new component
import { useState } from 'react';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

interface ComponentProps {
  // Define props with TypeScript
}

export const MyComponent: React.FC<ComponentProps> = ({ prop1 }) => {
  const trail = new BreadcrumbTrail('MyComponent');
  
  // LED on component mount
  useEffect(() => {
    trail.light(7001, { operation: 'component_mount', props: { prop1 } });
  }, []);

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
```

### LED Breadcrumb Guidelines
- **Always**: Add LEDs to critical operations
- **Entry Points**: Log when functions/components start
- **State Changes**: Log significant state updates  
- **API Calls**: Log request start/complete/error
- **User Actions**: Log button clicks, form submissions
- **Exit Points**: Log when operations complete

### Error Handling Pattern
```typescript
try {
  trail.light(2001, { operation: 'file_upload_start' });
  const result = await uploadFile(file);
  trail.light(2002, { operation: 'file_upload_complete', fileSize: result.size });
  return result;
} catch (error) {
  trail.fail(2003, error);
  throw new Error('File upload failed: ' + error.message);
}
```

## Testing Guidelines

### Unit Tests
```typescript
// Test individual functions and components
describe('DocumentProcessor', () => {
  it('should extract sales content from PDF', () => {
    const result = extractSalesContent(mockPDF);
    expect(result.techniques.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests  
```typescript
// Test component interactions
describe('Document Analysis Workflow', () => {
  it('should complete full analysis pipeline', async () => {
    render(<App />);
    // Upload file
    // Answer questions
    // Verify results
  });
});
```

### LED Verification
```typescript
// Verify breadcrumb chains
describe('LED Breadcrumbs', () => {
  it('should fire all expected LEDs during analysis', () => {
    const leds = window.debug.breadcrumbs.getRange(3000, 3099);
    expect(leds).toHaveLength(expectedCount);
    expect(leds.every(led => led.success)).toBe(true);
  });
});
```

## Code Quality Standards

### TypeScript Usage
- Strict mode enabled
- No `any` types (use `unknown` if needed)
- Interface definitions for all props/data
- Proper type guards for runtime validation

### Component Rules
- Maximum 400 lines per component
- Single responsibility principle
- Clear prop interfaces
- Comprehensive error handling

### Performance Guidelines  
- Use React.memo for expensive renders
- Debounce user input handlers
- Lazy load heavy components
- Optimize large list rendering

## Integration Patterns

### Electron IPC
```typescript
// In main process
ipcMain.handle('upload-document', async (event, filePath) => {
  // Handle file processing
});

// In renderer process
const result = await window.electronAPI.uploadDocument(filePath);
```

### Claude API Integration
```typescript
// With proper error handling and retries
const analyzeDocument = async (content: string, context: UserContext) => {
  const trail = new BreadcrumbTrail('ClaudeAPI');
  
  try {
    trail.light(4001, { operation: 'claude_request_start' });
    const response = await callClaude(content, context);
    trail.light(4002, { operation: 'claude_request_complete', tokens: response.usage });
    return response;
  } catch (error) {
    trail.fail(4003, error);
    // Implement retry logic or fallback
    throw error;
  }
};
```

### Local Storage
```typescript
// Typed storage operations
interface StoredDocument {
  id: string;
  content: ProcessedContent;
  timestamp: number;
}

const storeDocument = (doc: StoredDocument) => {
  localStorage.setItem(`doc_${doc.id}`, JSON.stringify(doc));
};
```

## Debugging Tools

### LED Breadcrumb Commands
```javascript
// In DevTools console
window.debug.breadcrumbs.getAll()           // All LEDs
window.debug.breadcrumbs.getRange(3000, 3099) // Specific range
window.debug.breadcrumbs.getFailures()      // Failed LEDs only
window.debug.breadcrumbs.clear()            // Reset for testing
```

### Performance Profiling
```javascript
// Monitor performance
window.debug.performance.startProfile();
// ... perform operations ...
window.debug.performance.endProfile();
```

## Common Patterns

### Loading States
```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleSubmit = async () => {
  setIsLoading(true);
  setError(null);
  try {
    await processDocument();
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

### Form Handling
```typescript
const [formData, setFormData] = useState(initialState);
const [validation, setValidation] = useState<ValidationErrors>({});

const validateForm = (data: FormData): ValidationErrors => {
  // Return validation errors object
};

const handleSubmit = (e: FormEvent) => {
  e.preventDefault();
  const errors = validateForm(formData);
  if (Object.keys(errors).length === 0) {
    // Submit form
  } else {
    setValidation(errors);
  }
};
```

## Deployment

### Build Process
```bash
npm run build    # Build React app
npm run electron-pack  # Package Electron app
```

### Quality Checklist Before Deploy
- [ ] All tests pass
- [ ] LED breadcrumb coverage >95%
- [ ] Manual testing complete
- [ ] Performance benchmarks met
- [ ] Error handling tested
- [ ] Documentation updated