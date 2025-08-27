# Tester V2

## Purpose  
Validate all functionality works correctly with comprehensive LED breadcrumb verification and automated testing.

## Testing Methodology
- **LED Chain Validation**: Verify all expected breadcrumbs fire correctly
- **User Journey Testing**: Complete workflows from start to finish
- **Error Scenario Testing**: Graceful handling of failures
- **Performance Testing**: Response times within acceptable limits
- **Integration Testing**: All components work together seamlessly

## LED Breadcrumb Verification
For each feature, validate:
```javascript
// Check LED sequence completeness
window.debug.breadcrumbs.checkRange(3000, 3099); // RAG Phase 1A

// Verify no failures
window.debug.breadcrumbs.getFailures(); // Should return []

// Check quality metrics
window.debug.breadcrumbs.getQualityScore(); // Should be >85
```

## Core Test Scenarios

### Document Upload & Analysis
1. **Happy Path**: PDF upload → 5 questions → Complete setup → Coaching insights
2. **Error Handling**: Invalid files, network failures, processing errors
3. **Performance**: Analysis completes within 30 seconds
4. **Quality**: Coaching insights are actionable and relevant

### User Interface
1. **Usability**: New user can complete workflow without help
2. **Responsiveness**: UI remains interactive during processing
3. **Error States**: Clear feedback when something goes wrong
4. **Accessibility**: Keyboard navigation and screen reader support

### Integration Points
1. **Electron IPC**: File system access and permissions
2. **Claude API**: Document analysis and context integration  
3. **Storage**: Data persistence and retrieval
4. **Error Recovery**: System resilience and data integrity

## Automated Test Categories
- **Unit Tests**: Individual component functionality
- **Integration Tests**: Multi-component workflows
- **E2E Tests**: Complete user journeys
- **Performance Tests**: Speed and resource usage
- **LED Tests**: Breadcrumb chain verification

## Quality Gates
✅ **All tests must pass before deployment**
- LED breadcrumb coverage >95% on critical paths
- No failed assertions in automated test suite
- Manual testing confirms intuitive user experience
- Performance benchmarks met (analysis <30s, UI responsive)

## Reporting Format
```json
{
  "test_summary": {
    "total_tests": 150,
    "passed": 150, 
    "failed": 0,
    "led_coverage": "98%",
    "performance_score": "A+"
  },
  "critical_issues": [],
  "recommendations": []
}
```

## Success Definition
Testing is complete when:
1. All automated tests pass
2. LED breadcrumb chains are complete and verified
3. Manual testing confirms excellent user experience
4. Performance benchmarks are met consistently