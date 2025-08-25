# Instruction Template System - PRD Overview

## Vision Statement
Create a flexible, profession-specific instruction template system that allows the VoiceCoach platform to serve life coaches, psychologists, sales professionals, therapists, and other communication-based professions with tailored AI coaching instructions.

## Core Problem
The current system uses hardcoded instructions designed primarily for sales coaching. Different professions require:
- Unique communication approaches and methodologies
- Profession-specific RAG documents and source materials
- Specialized terminology and techniques
- Industry-specific ethical considerations and best practices

## Proposed Solution
A dynamic instruction template system that:
1. **Templates Library**: Pre-built profession-specific instruction sets
2. **Dynamic Loading**: Switch between instruction templates based on user selection
3. **Customization Engine**: Allow users to modify templates for their specific needs
4. **Template Marketplace**: Community-driven template sharing and validation

## Key Components

### 1. Template Structure
```json
{
  "profession": "Life Coach",
  "version": "1.0",
  "base_instructions": "FUNCTION AS A 22 YEAR PROFESSIONAL LIFE COACH...",
  "specializations": ["Career Coaching", "Relationship Coaching", "Health Coaching"],
  "knowledge_base_types": ["psychology", "motivation", "goal_setting"],
  "ethical_guidelines": [...],
  "prohibited_actions": [...],
  "contextual_triggers": {...},
  "ready_questions": {...}
}
```

### 2. Profession Categories
- **Sales Professionals**: Negotiation, objection handling, closing techniques
- **Life Coaches**: Goal setting, motivation, personal development
- **Psychologists**: Therapeutic techniques, mental health approaches
- **Therapists**: Counseling methodologies, patient care
- **Business Consultants**: Strategic planning, problem solving
- **Executive Coaches**: Leadership development, performance improvement

### 3. Template Management System
- **Template Selector**: UI component for choosing active template
- **Template Editor**: Interface for customizing instructions
- **Template Validator**: Ensures templates meet safety and quality standards
- **Template Versioning**: Track changes and allow rollbacks

### 4. Integration Points
- **Knowledge Base Manager**: Template-specific document recommendations
- **Coaching Engine**: Dynamic instruction injection
- **Analytics System**: Template-specific performance metrics
- **User Profiles**: Save preferred templates and customizations

## Technical Architecture

### File-Based Template Storage
```
/templates/
  /sales/
    - negotiation_expert.json
    - enterprise_sales.json
    - inside_sales.json
  /life_coaching/
    - career_coach.json
    - wellness_coach.json
    - relationship_coach.json
  /psychology/
    - cognitive_behavioral.json
    - positive_psychology.json
    - clinical_assessment.json
```

### Template Loading Logic
1. User selects profession and specialization
2. System loads corresponding template file
3. Template instructions replace default coaching prompts
4. Knowledge base recommendations update accordingly
5. UI adapts to show relevant controls and metrics

## User Experience Flow

### Template Selection
1. **Profession Selector**: Dropdown with major categories
2. **Specialization Picker**: Sub-categories within chosen profession
3. **Template Preview**: Show sample instructions and capabilities
4. **Customization Options**: Modify key parameters and approaches
5. **Save & Activate**: Make template active for coaching sessions

### Template Customization
1. **Instruction Editor**: Rich text editor for modifying base instructions
2. **Trigger Configuration**: Set up contextual response triggers
3. **Question Library**: Customize ready-to-use questions
4. **Ethical Boundaries**: Define prohibited actions and responses
5. **Testing Mode**: Validate template with sample conversations

## Business Value

### Market Expansion
- **Addressable Market**: Expand from sales to all communication-based professions
- **Revenue Streams**: Premium templates, professional certifications, consulting services
- **Network Effects**: Community-driven template improvements and sharing

### Competitive Advantage
- **Profession-Specific**: Tailored AI coaching vs generic chatbots
- **Proven Architecture**: Leverage existing two-stage processing system
- **Community Platform**: User-generated content and templates

## Success Metrics
- **Template Adoption**: Number of active templates per profession
- **User Engagement**: Session frequency by template type
- **Quality Metrics**: User ratings and effectiveness scores
- **Community Growth**: Template submissions and downloads
- **Revenue Impact**: Premium template subscription rates

## Implementation Phases

### Phase 1: Foundation (MVP)
- Basic template file structure
- Template selector UI component
- Integration with existing coaching engine
- 3-5 core profession templates

### Phase 2: Enhancement
- Template editor and customization tools
- Advanced contextual triggers
- Performance analytics by template
- Community feedback system

### Phase 3: Platform
- Template marketplace
- Professional certification programs
- Advanced analytics and reporting
- Enterprise features and deployment

## Technical Considerations
- **Backward Compatibility**: Existing sales coaching continues to work
- **Performance**: Template loading should not impact real-time coaching
- **Security**: Validate templates to prevent malicious instructions
- **Scalability**: Support hundreds of templates and thousands of users

## Next Steps for PRD Development
1. Detailed user persona research for each target profession
2. Competitive analysis of profession-specific coaching tools
3. Technical specification for template engine architecture
4. UI/UX wireframes for template management interface
5. Business model validation and pricing strategy