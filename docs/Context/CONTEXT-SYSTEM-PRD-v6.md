# Context System PRD - LED-Enhanced Persistent Intelligence
**Version 6.0 | Date: 2025-09-04**  
**Author: System Architecture Team**  
**Status: Production-Ready with Smart Stack-Based Deployment**

## Executive Summary

The Context System solves Claude's fundamental limitation: catastrophic context loss during `/compact` operations and between sessions. Version 6.0 introduces **Smart Stack-Based Deployment** - automatically detecting project technology and installing only relevant specialists, preventing bloat while maintaining the ability to add specialists on-demand as projects evolve.

Key refinement: The Context System now intelligently analyzes each project's tech stack and deploys only the specialists that match actual dependencies, while keeping core process agents universally available.

## Problem Statement

### Current Pain Points

1. **Context Amnesia**
   - New Claude sessions start with zero project knowledge
   - `/compact` operations destroy 90% of conversation context
   - Same mistakes repeated across sessions

2. **Manual Debugging Burden**
   - Developer spends hours debugging issues Claude created
   - No automatic validation of implementations

3. **Specialist Bloat** (NEW)
   - Installing irrelevant specialists wastes resources
   - ChromaDB specialist in projects without ChromaDB
   - Confusion from unnecessary agents
   - Slower agent selection with irrelevant options

4. **Knowledge Fragmentation**
   - Specialists rebuilt for each project
   - Proven patterns not reused

5. **Token Exhaustion**
   - Finding code requires extensive searching
   - No knowledge persistence between sessions

6. **Hidden Failures**
   - Fallback/simulated data masks real problems

### Impact Analysis

- **Resource Waste**: 60% of specialists irrelevant to specific projects
- **Cognitive Load**: Developers confused by unnecessary specialists
- **Performance**: Slower routing through irrelevant agents
- **Maintenance**: Updating unused specialists wastes time

## Solution Overview

### Core Innovation

**Smart Stack-Based Deployment**: Automatically detect project technologies and install only relevant specialists, with on-demand addition as projects evolve.

**Three-Tier Specialist System**: Core (always), Detected (based on stack), Available (on-demand).

### Key Principles

1. **Install What's Needed**: Only relevant specialists deployed
2. **Stack-Aware**: Automatic technology detection
3. **Extensible**: Add specialists as project grows
4. **No Bloat**: Skip irrelevant domain experts
5. **Progressive Enhancement**: Start minimal, grow as needed

## Smart Stack-Based Deployment

### Technology Detection System

```typescript
// cs-stack-analyzer.ts
class StackAnalyzer {
  async detectTechnologies(): Promise<ProjectStack> {
    const stack = {
      // Package Managers
      npm: await this.fileExists('package.json'),
      pip: await this.fileExists('requirements.txt'),
      cargo: await this.fileExists('Cargo.toml'),
      
      // Frontend Frameworks
      react: await this.checkDependency('react'),
      vue: await this.checkDependency('vue'),
      angular: await this.checkDependency('@angular/core'),
      svelte: await this.checkDependency('svelte'),
      
      // Backend Frameworks
      express: await this.checkDependency('express'),
      fastify: await this.checkDependency('fastify'),
      nestjs: await this.checkDependency('@nestjs/core'),
      django: await this.checkPythonPackage('django'),
      fastapi: await this.checkPythonPackage('fastapi'),
      
      // Desktop Frameworks
      electron: await this.checkDependency('electron'),
      tauri: await this.fileExists('tauri.conf.json'),
      
      // Databases
      postgres: await this.checkAny(['pg', 'postgresql', 'psycopg2']),
      mysql: await this.checkAny(['mysql', 'mysql2']),
      mongodb: await this.checkDependency('mongodb'),
      redis: await this.checkAny(['redis', 'ioredis']),
      chromadb: await this.checkAny(['chromadb', 'chromadb-client']),
      
      // AI/ML Libraries
      openai: await this.checkDependency('openai'),
      langchain: await this.checkAny(['langchain', 'langchainjs']),
      vosk: await this.checkAny(['vosk', 'vosk-api']),
      whisper: await this.checkDependency('whisper'),
      transformers: await this.checkPythonPackage('transformers'),
      
      // Real-time Communication
      websocket: await this.checkAny(['ws', 'websocket']),
      socketio: await this.checkDependency('socket.io'),
      
      // Testing Frameworks
      jest: await this.checkDependency('jest'),
      playwright: await this.checkDependency('@playwright/test'),
      cypress: await this.checkDependency('cypress'),
      pytest: await this.checkPythonPackage('pytest'),
      
      // Build Tools
      vite: await this.checkDependency('vite'),
      webpack: await this.checkDependency('webpack'),
      rollup: await this.checkDependency('rollup'),
      
      // Cloud Services
      aws: await this.checkAny(['aws-sdk', 'boto3']),
      azure: await this.checkDependency('@azure/core'),
      gcp: await this.checkDependency('@google-cloud'),
      
      // Additional Context
      typescript: await this.fileExists('tsconfig.json'),
      docker: await this.fileExists('Dockerfile'),
      kubernetes: await this.fileExists('k8s/')
    };
    
    return this.analyzeStack(stack);
  }
  
  private mapToSpecialists(stack: ProjectStack): SpecialistConfig {
    const config = {
      core: [], // Always installed
      detected: [], // Based on stack
      available: [] // Can add later
    };
    
    // Core specialists (always useful)
    config.core = [
      'cs-brainstorm-agent',      // Ideation always needed
      'cs-inversion-agent',       // Risk analysis always useful
      'cs-error-visibility',      // Error handling universal
      'cs-code-discovery',        // Finding code always needed
      'cs-project-manager'        // Orchestration when complex
    ];
    
    // Detected specialists (based on actual stack)
    if (stack.react) config.detected.push('cs-react-specialist');
    if (stack.vue) config.detected.push('cs-vue-specialist');
    if (stack.angular) config.detected.push('cs-angular-specialist');
    
    if (stack.websocket) config.detected.push('cs-websocket-specialist');
    if (stack.socketio) config.detected.push('cs-socketio-specialist');
    
    if (stack.postgres) config.detected.push('cs-postgres-specialist');
    if (stack.mongodb) config.detected.push('cs-mongodb-specialist');
    if (stack.chromadb) config.detected.push('cs-chromadb-specialist');
    
    if (stack.vosk) config.detected.push('cs-vosk-specialist');
    if (stack.whisper) config.detected.push('cs-whisper-specialist');
    
    if (stack.electron) config.detected.push('cs-electron-specialist');
    if (stack.tauri) config.detected.push('cs-tauri-specialist');
    
    if (stack.playwright) config.detected.push('cs-playwright-tester');
    if (stack.jest) config.detected.push('cs-jest-tester');
    if (stack.cypress) config.detected.push('cs-cypress-tester');
    
    // Available specialists (not detected but can add)
    const allSpecialists = this.getAllSpecialists();
    config.available = allSpecialists.filter(s => 
      !config.core.includes(s) && 
      !config.detected.includes(s)
    );
    
    return config;
  }
}
```

### Installation Flow

```bash
# Smart Installation Command
npx create-context-system

# What happens:
1. Analyzes project files
2. Detects technologies
3. Maps to relevant specialists
4. Shows installation plan
5. Installs only what's needed
```

### Example Deployments

#### Example 1: React SPA Project
```bash
npx create-context-system
> Analyzing project...
> Detected: React, Vite, Axios, Jest
> 
> Installing Core Specialists:
>   ✓ cs-brainstorm-agent
>   ✓ cs-inversion-agent
>   ✓ cs-error-visibility
>   ✓ cs-code-discovery
> 
> Installing Detected Specialists:
>   ✓ cs-react-specialist (found: react@18.3.1)
>   ✓ cs-vite-specialist (found: vite@5.4.19)
>   ✓ cs-jest-tester (found: jest@29.7.0)
> 
> Skipping Irrelevant Specialists:
>   ✗ cs-chromadb-specialist (not detected)
>   ✗ cs-vosk-specialist (not detected)
>   ✗ cs-postgres-specialist (not detected)
> 
> Available On-Demand:
>   - cs-websocket-specialist (npm run cs-add websocket)
>   - cs-mongodb-specialist (npm run cs-add mongodb)
>   - 47 other specialists...
```

#### Example 2: Electron + Vosk Project (like VoiceCoach)
```bash
npx create-context-system
> Analyzing project...
> Detected: Electron, React, Vosk, WebSocket, TypeScript
> 
> Installing Core Specialists:
>   ✓ cs-brainstorm-agent
>   ✓ cs-inversion-agent
>   ✓ cs-error-visibility
>   ✓ cs-code-discovery
>   ✓ cs-project-manager
> 
> Installing Detected Specialists:
>   ✓ cs-electron-specialist (found: electron@32.2.2)
>   ✓ cs-react-specialist (found: react@18.3.1)
>   ✓ cs-vosk-specialist (found: vosk in Python scripts)
>   ✓ cs-websocket-specialist (found: ws@8.17.0)
>   ✓ cs-typescript-specialist (found: tsconfig.json)
> 
> Skipping Irrelevant Specialists:
>   ✗ cs-chromadb-specialist (not detected)
>   ✗ cs-postgres-specialist (not detected)
>   ✗ cs-vue-specialist (React project)
```

#### Example 3: FastAPI + PostgreSQL Backend
```bash
npx create-context-system
> Analyzing project...
> Detected: FastAPI, PostgreSQL, Redis, Docker, Pytest
> 
> Installing Core Specialists:
>   ✓ cs-brainstorm-agent
>   ✓ cs-inversion-agent
>   ✓ cs-error-visibility
>   ✓ cs-code-discovery
> 
> Installing Detected Specialists:
>   ✓ cs-fastapi-specialist (found: fastapi==0.104.1)
>   ✓ cs-postgres-specialist (found: psycopg2==2.9.9)
>   ✓ cs-redis-specialist (found: redis==5.0.1)
>   ✓ cs-docker-specialist (found: Dockerfile)
>   ✓ cs-pytest-tester (found: pytest==7.4.3)
> 
> Skipping Irrelevant Specialists:
>   ✗ cs-react-specialist (backend only)
>   ✗ cs-electron-specialist (not desktop)
>   ✗ cs-vosk-specialist (no audio processing)
```

### Three-Tier Specialist Configuration

```yaml
# .contextrc.yaml - Project-Specific Configuration
version: "6.0"
project: "YourProjectName"
analyzed: "2025-09-04"

specialists:
  # CORE - Always installed, universally useful
  core:
    - id: "cs-brainstorm-agent"
      reason: "Ideation always valuable"
      version: "1.0"
      
    - id: "cs-inversion-agent"
      reason: "Risk analysis universally needed"
      version: "1.0"
      
    - id: "cs-error-visibility"
      reason: "FAIL-LOUD policy enforcement"
      version: "1.0"
      
    - id: "cs-code-discovery"
      reason: "Finding code always required"
      version: "1.0"
  
  # DETECTED - Based on actual dependencies
  detected:
    - id: "cs-react-specialist"
      reason: "Found: react@18.3.1 in package.json"
      version: "1.2"
      confidence: "high"
      
    - id: "cs-websocket-specialist"
      reason: "Found: ws@8.17.0 in package.json"
      version: "1.0"
      confidence: "high"
      
    - id: "cs-vosk-specialist"
      reason: "Found: vosk-api in Python scripts"
      version: "1.1"
      confidence: "medium"
  
  # AVAILABLE - Not detected but can add
  available:
    quick_add:  # One command away
      - id: "cs-chromadb-specialist"
        command: "npm run cs-add chromadb"
        useCase: "If adding vector search"
        
      - id: "cs-postgres-specialist"
        command: "npm run cs-add postgres"
        useCase: "If adding PostgreSQL"
    
    browse_all:
      command: "npm run cs-list-available"
      count: 47
```

### On-Demand Specialist Addition

```bash
# Project starts without ChromaDB
npm run cs-status
> Core Specialists: 5 active
> Detected Specialists: 4 active
> Available: 47 specialists

# Later, adding ChromaDB to project
npm install chromadb

# Add specialist when needed
npm run cs-add chromadb
> Detected ChromaDB in package.json
> Gathering ChromaDB knowledge...
> Creating cs-chromadb-specialist...
> Running validation tests...
> ✅ ChromaDB specialist ready
> 
> New total: 10 active specialists

# Or manually browse and add
npm run cs-browse
> Available Specialists:
> [Database]
>   - cs-postgres-specialist ⭐ 4.8
>   - cs-mongodb-specialist ⭐ 4.6
>   - cs-chromadb-specialist ⭐ 4.7
> [AI/ML]
>   - cs-langchain-specialist ⭐ 4.9
>   - cs-huggingface-specialist ⭐ 4.5
> 
> Select specialist to add: cs-langchain-specialist
> Installing...
```

### Specialist Lifecycle Management

```typescript
// cs-specialist-manager.ts
class SpecialistManager {
  async addSpecialist(name: string): Promise<void> {
    // Check if actually needed
    const isRelevant = await this.checkRelevance(name);
    if (!isRelevant) {
      console.warn(`⚠️ ${name} not detected in project.`);
      const confirm = await prompt('Install anyway? [y/N]');
      if (!confirm) return;
    }
    
    // Install specialist
    await this.downloadSpecialist(name);
    await this.gatherKnowledge(name);
    await this.runValidation(name);
    await this.updateConfig(name);
    
    console.log(`✅ ${name} added successfully`);
  }
  
  async removeSpecialist(name: string): Promise<void> {
    // Check dependencies
    const dependents = await this.checkDependents(name);
    if (dependents.length > 0) {
      console.warn(`⚠️ Other specialists depend on ${name}`);
      console.log(`Dependents: ${dependents.join(', ')}`);
      const confirm = await prompt('Remove anyway? [y/N]');
      if (!confirm) return;
    }
    
    // Remove specialist
    await this.archiveKnowledge(name);
    await this.removeFromConfig(name);
    await this.cleanupFiles(name);
    
    console.log(`✅ ${name} removed`);
  }
  
  async updateSpecialists(): Promise<void> {
    // Re-analyze project
    const currentStack = await this.analyzeStack();
    const config = await this.loadConfig();
    
    // Find new technologies
    const newTech = this.findNewTechnologies(currentStack, config);
    if (newTech.length > 0) {
      console.log('📦 New technologies detected:');
      for (const tech of newTech) {
        console.log(`  - ${tech.name}: ${tech.specialist}`);
        const add = await prompt(`Add ${tech.specialist}? [Y/n]`);
        if (add) await this.addSpecialist(tech.specialist);
      }
    }
    
    // Find removed technologies
    const removedTech = this.findRemovedTechnologies(currentStack, config);
    if (removedTech.length > 0) {
      console.log('🗑️ Technologies no longer detected:');
      for (const tech of removedTech) {
        console.log(`  - ${tech.name}: ${tech.specialist}`);
        const remove = await prompt(`Remove ${tech.specialist}? [y/N]`);
        if (remove) await this.removeSpecialist(tech.specialist);
      }
    }
  }
}
```

### Smart Routing Based on Active Specialists

```typescript
// cs-agent-router.ts
class SmartAgentRouter {
  private activeSpecialists: Map<string, Specialist>;
  
  async route(request: string): Promise<Specialist[]> {
    // Only consider ACTIVE specialists
    const relevant = [];
    
    for (const [name, specialist] of this.activeSpecialists) {
      if (this.matchesKeywords(request, specialist.keywords)) {
        relevant.push(specialist);
      }
    }
    
    // Don't check specialists that aren't installed
    // This prevents routing to cs-chromadb-specialist 
    // when project doesn't use ChromaDB
    
    return relevant;
  }
  
  async suggestMissing(request: string): Promise<string[]> {
    // Check if available specialists might help
    const suggestions = [];
    
    if (request.includes('vector') && !this.hasSpecialist('chromadb')) {
      suggestions.push('Consider adding: npm run cs-add chromadb');
    }
    
    if (request.includes('database') && !this.hasSpecialist('postgres')) {
      suggestions.push('Consider adding: npm run cs-add postgres');
    }
    
    return suggestions;
  }
}
```

### Project Evolution Tracking

```yaml
# .context-history.yaml - Track specialist evolution
history:
  - date: "2025-09-04"
    event: "Initial setup"
    specialists_added:
      - cs-react-specialist
      - cs-websocket-specialist
    total: 7
    
  - date: "2025-09-15"
    event: "Added vector search"
    specialists_added:
      - cs-chromadb-specialist
    total: 8
    
  - date: "2025-09-20"
    event: "Added authentication"
    specialists_added:
      - cs-auth-specialist
      - cs-jwt-specialist
    total: 10
    
  - date: "2025-10-01"
    event: "Removed WebSocket (switched to SSE)"
    specialists_removed:
      - cs-websocket-specialist
    specialists_added:
      - cs-sse-specialist
    total: 10
```

## Benefits of Smart Stack-Based Deployment

### Efficiency Gains
- **Reduced Bloat**: Only relevant specialists installed
- **Faster Routing**: Fewer agents to consider
- **Clearer Mental Model**: See only what applies to your project
- **Resource Optimization**: Less memory/disk usage

### Flexibility Advantages  
- **Progressive Enhancement**: Add as you grow
- **Easy Removal**: Remove when no longer needed
- **Stack Evolution**: Adapts as project changes
- **Technology Agnostic**: Works with any stack

### Developer Experience
- **Zero Configuration**: Auto-detects everything
- **Intelligent Suggestions**: Recommends relevant specialists
- **Clean Interface**: No irrelevant options
- **Quick Addition**: One command to add when needed

## Implementation Roadmap

### Phase 1: Stack Detection (Week 1)
- [ ] Build technology analyzer
- [ ] Create dependency mappers
- [ ] Design detection patterns
- [ ] Test on various stacks

### Phase 2: Smart Installation (Week 2)
- [ ] Create installation planner
- [ ] Build specialist selector
- [ ] Implement core/detected/available tiers
- [ ] Design configuration system

### Phase 3: Lifecycle Management (Week 3)
- [ ] Build add/remove commands
- [ ] Create update mechanism
- [ ] Implement evolution tracking
- [ ] Design cleanup processes

### Phase 4: Testing (Week 4)
- [ ] Test on React projects
- [ ] Test on Node backends
- [ ] Test on Python projects
- [ ] Test on desktop apps

### Phase 5: Documentation (Week 5)
- [ ] Stack-specific guides
- [ ] Migration documentation
- [ ] Best practices
- [ ] Video tutorials

## Success Metrics

### Deployment Metrics
- **Detection Accuracy**: >95% correct technology identification
- **Installation Speed**: <2 minutes for typical project
- **Specialist Relevance**: 100% of installed specialists applicable
- **On-Demand Addition**: <30 seconds to add specialist

### Usage Metrics
- **Active Utilization**: 80% of installed specialists used weekly
- **Routing Accuracy**: 95% requests routed correctly
- **Evolution Tracking**: 100% of changes logged
- **Resource Efficiency**: 60% reduction in specialist footprint

## The Bottom Line

**Version 6.0 Philosophy**: 
- **Smart not bloated**
- **Detect and deploy what's needed**
- **Add specialists as project grows**
- **No ChromaDB specialist without ChromaDB**
- **Evolution-aware system**

**Developer Experience**:
1. Run `npx create-context-system`
2. System detects your stack
3. Installs only relevant specialists
4. Add more as needed with one command
5. Remove when no longer needed

**No more irrelevant specialists cluttering your project.**

---

**Document Version**: 6.0  
**Last Updated**: 2025-09-04  
**Major Changes from v5.0**:
- Added Smart Stack-Based Deployment system
- Introduced Three-Tier Specialist Configuration (Core/Detected/Available)
- Created technology detection analyzer
- Added on-demand specialist addition
- Implemented specialist lifecycle management
- Added project evolution tracking
- Removed "install everything" approach
- Added stack-specific deployment examples

**Next Review**: 2025-10-04