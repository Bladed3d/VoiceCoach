1
I want to add sales script tracking on the Splitview page above the Ai prompt and transcript windows. Horizontal graphic of steps derived from the sales script analysis.

2
Visually guide the user (salesman) toward a sale while providing predictive abilities to Ollama enabling it to give prompts that guide the discussion toward the next step by tracking the process

3
Current step info should be given to Ollama with the prompt instructions so Ollama can provide sales stage based prompts.

4
Create Code this as a modular as much as possible so that changes and improvement don't require core code editing or changes as much as possible

5
create a json format prompt for use here in the Parathinker app.


1 prompt

{
  "REQUIREMENT": {
    "feature": "Add sales script tracking visualization on Splitview page positioned above AI prompt and transcript windows. Display horizontal graphic representing steps derived from sales script analysis.",
    "purpose": "Visually guide sales representatives through the sales process while enabling predictive capabilities for Ollama to provide stage-appropriate prompts.",
    "technical_requirements": [
      "Track and display current sales process step visually",
      "Pass current step information to Ollama with prompt instructions",
      "Enable Ollama to generate sales stage-based guidance prompts",
      "Implement modular architecture to minimize core code changes"
    ]
  },
  "ANALYSIS_NEEDED": {
    "architectural_analysis": [
      "Identify optimal placement and integration points within Splitview page layout",
      "Design modular component structure for sales step tracking",
      "Define data flow between visualization component and Ollama integration",
      "Analyze state management approach for step progression tracking"
    ],
    "implementation_analysis": [
      "Determine visual representation format for sales steps (progress bar, step indicators, etc.)",
      "Note that Ollama is run locally for step information exchange with Ollama",
      "Define configuration structure for sales script step definitions",
      "Analyze event handling for step transitions and updates"
    ],
    "modularity_analysis": [
      "Identify abstraction layers needed for future changes",
      "Design configuration-driven step definition system",
      "Plan extension points for additional sales script types",
      "Define interface contracts between tracking component and core application"
    ]
  },
  "DELIVERABLE": {
    "format": "JSON structure containing",
    "required_sections": {
      "component_structure": "Modular component definition with props interface",
      "state_management": "Data flow and state handling specification",
      "ollama_integration": "API contract for step information passing",
      "configuration_schema": "JSON schema for sales script step definitions",
      "event_handling": "Transition and update event specifications"
    },
    "constraints": [
      "Must support dynamic step configuration without code changes",
      "Must provide clear interface boundaries with core application",
      "Must include error handling for invalid step states",
      "Must support real-time step progression updates"
    ]
  }
}

2

```json
{
  "prompt": {
    "REQUIREMENT": {
      "feature": "Sales Script Tracking Component",
      "description": "Add a horizontal sales script progress tracker above the AI prompt and transcript windows in the Splitview page",
      "key_elements": [
        "Visual step-by-step sales process representation",
        "Integration with Ollama for predictive prompting",
        "Current step awareness for context-aware AI responses",
        "Modular architecture for easy maintenance and updates"
      ],
      "functionality": [
        "Display sales script steps as a horizontal graphical interface",
        "Track and highlight current step in the sales process",
        "Provide current step information to Ollama with prompt instructions",
        "Enable Ollama to deliver sales stage-specific guidance",
        "Allow for dynamic script updates without core code changes"
      ]
    },
    "ANALYSIS_NEEDED": [
      "Determine optimal component architecture for modularity",
      "Design data structure for sales script steps and progression",
      "Define interface for communicating current step to Ollama",
      "Plan integration points with existing Splitview components",
      "Analyze state management approach for tracking progress",
      "Design visual representation of sales steps (progress bar, steps, etc.)",
      "Identify configuration requirements for different sales scripts",
      "Plan extensibility for future enhancements (analytics, customization, etc.)"
    ],
    "DELIVERABLE": {
      "format": "Implementation plan with code structure",
      "components": [
        "SalesScriptTracker component architecture",
        "Data model for script steps and progression",
        "Integration pattern with existing Splitview",
        "API/interface design for Ollama communication",
        "Configuration structure for sales scripts",
        "Styling approach for horizontal step visualization"
      ],
      "documentation_requirements": [
        "Component interface specifications",
        "Configuration options and examples",
        "Integration guide with existing system",
        "Extension points for future enhancements"
      ]
    }
  }
}
```

3

{
  "REQUIREMENT": {
    "Feature Description": "Add sales script tracking visualization on the Splitview page, positioned above the AI prompt and transcript windows. This should be a horizontal graphic representing steps derived from sales script analysis.",
    "Purpose": "Provide visual guidance to the user (salesman) to progress toward a sale. Enable predictive capabilities for Ollama by tracking the sales process, allowing it to generate prompts that guide the discussion to the next step.",
    "Key Requirements": [
      "Integrate current step information into Ollama's prompt instructions to enable sales stage-based prompt generation.",
      "Ensure the implementation is highly modular to facilitate changes and improvements without requiring edits to core code."
    ],
    "Constraints": "Prioritize modularity in design, such as using separate components, configurable modules, or plugins, to minimize impact on existing codebase during updates."
  },
  "ANALYSIS NEEDED": {
    "Tasks": [
      "Analyze the sales script to derive a sequence of steps (e.g., introduction, needs assessment, presentation, objection handling, closing). Define how these steps will be represented in a horizontal graphic (e.g., progress bar, icons, or timeline).",
      "Determine how to track the current sales step dynamically based on conversation analysis (e.g., via transcript processing or AI inference).",
      "Outline integration with Ollama: Specify how current step data is passed in prompts, including format and context for generating stage-specific guidance.",
      "Design modular architecture: Propose components like a 'SalesTracker' module, 'StepVisualizer' UI component, and 'PromptEnhancer' for Ollama integration. Ensure loose coupling to allow independent updates.",
      "Evaluate predictive elements: Describe how Ollama uses step tracking for predictive prompting (e.g., suggesting questions to advance to the next step).",
      "Consider edge cases: Handle scenarios like non-linear progress, script variations, or incomplete data.",
      "Ensure compatibility: Focus on implementation aspects that can adapt to various AI models for diverse perspectives, without assuming specific tech stack."
    ]
  },
  "DELIVERABLE": {
    "Expected Output Format": "Provide a comprehensive analysis report in JSON format, including:",
    "Sections": [
      "Executive Summary: High-level overview of the proposed solution.",
      "Detailed Design: Breakdown of components, data flow, and modular structure.",
      "Implementation Steps: Step-by-step guide for building the feature.",
      "Code Snippets: Pseudocode or high-level examples for key parts (e.g., UI rendering, Ollama prompt integration).",
      "Potential Improvements: Suggestions for extensibility and modularity enhancements.",
      "Risks and Mitigations: Identify any challenges and how to address them."
    ],
    "Guidelines": "Output must be valid JSON. Keep responses focused on analysis and implementation. Suitable for processing by multiple AI models to generate varied insights."
  }
}

4

# SALES SCRIPT TRACKING MODULE ANALYSIS PROMPT

## REQUIREMENT
Design and implement a modular sales script tracking system for the Splitview page that:
- Displays a horizontal progress indicator above AI prompt and transcript windows
- Visualizes sales script steps derived from automated sales script analysis
- Provides real-time step tracking to guide salespeople through the sales process
- Feeds current step context to Ollama for stage-appropriate prompt generation
- Maintains loose coupling with core application code for easy updates and modifications

## ANALYSIS NEEDED

### 1. ARCHITECTURE DESIGN
- Define modular component structure for sales tracking system
- Design data flow between sales tracker, UI components, and Ollama integration
- Specify configuration-driven approach for sales script definitions
- Create abstraction layers to minimize core code dependencies

### 2. SALES SCRIPT PROCESSING
- Analyze methods for extracting sales steps from script content
- Define data structure for representing sales stages, substeps, and transitions
- Design algorithm for automatic step progression detection based on conversation analysis
- Specify fallback mechanisms for manual step advancement

### 3. UI COMPONENT SPECIFICATION
- Design horizontal progress visualization component with step indicators
- Define responsive layout integration above existing prompt/transcript windows
- Specify visual states (completed, current, upcoming, optional steps)
- Create accessibility considerations for progress tracking display

### 4. OLLAMA INTEGRATION STRATEGY
- Design context injection mechanism for current step information
- Define prompt template system for stage-specific guidance
- Specify real-time step data formatting for AI consumption
- Create feedback loop for AI-suggested step transitions

### 5. CONFIGURATION SYSTEM
- Design JSON-based sales script configuration format
- Define hot-reload capability for script updates without code changes
- Specify validation rules for sales script definitions
- Create versioning strategy for script configurations

## DELIVERABLE

Provide a comprehensive JSON specification containing:

```json
{
  "component_architecture": {
    "modules": [],
    "dependencies": [],
    "interfaces": []
  },
  "sales_script_schema": {
    "structure": {},
    "validation_rules": [],
    "example_configuration": {}
  },
  "ui_specifications": {
    "component_design": {},
    "layout_integration": {},
    "visual_states": []
  },
  "ollama_integration": {
    "context_injection": {},
    "prompt_templates": {},
    "step_tracking_format": {}
  },
  "implementation_plan": {
    "development_phases": [],
    "testing_strategy": {},
    "deployment_considerations": []
  },
  "configuration_examples": {
    "sample_sales_scripts": [],
    "step_definitions": [],
    "transition_rules": []
  }
}
```

Focus on creating a plugin-like architecture that can be easily maintained, updated, and extended without requiring modifications to the core Parathinker application codebase.


