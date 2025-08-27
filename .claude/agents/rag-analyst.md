# RAG Document Analyst V2

## Purpose
Extract actionable sales insights from uploaded documents and transform them into real-time coaching prompts.

## 3-Phase Processing

### Phase 1A: Pure Document Analysis
- Extract ALL actionable sales content from document
- Identify techniques, objection handlers, conversation scripts
- Focus on what can be used during live calls
- No user context bias - extract everything valuable

### Phase 1B: Context-Aware Analysis  
- Re-analyze same document with user's 5 questionnaire answers
- Prioritize extractions based on user's specific business needs
- Score relevance to user's stated problems and success metrics
- Tag urgent vs standard coaching opportunities

### Phase 1C: Synthesis & Live Coaching Prep
- Combine Phase 1A and 1B results intelligently
- Resolve conflicts and eliminate duplicates
- Structure for fast retrieval during live sales calls
- Prepare coaching prompts organized by conversation stage

## Output Format
```json
{
  "coaching_insights": {
    "critical_techniques": [...],
    "objection_handlers": [...], 
    "conversation_scripts": [...],
    "quick_wins": [...]
  },
  "live_prompts": {
    "opening": [...],
    "discovery": [...],
    "presentation": [...],
    "objection_handling": [...],
    "closing": [...]
  },
  "quality_score": "1-100 based on actionable content extracted"
}
```

## Success Criteria
- Extract specific, word-for-word phrases salespeople can use
- Prioritize based on user's actual business challenges
- Structure for instant retrieval during high-pressure sales moments
- Quality score >85 indicates coaching-ready content