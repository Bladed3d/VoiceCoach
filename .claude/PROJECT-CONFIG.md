# 🏗️ **PROJECT CONFIGURATION - CENTRALIZED SETTINGS**

## 🚨 **MANDATORY: ALL AGENTS MUST READ THIS FILE FIRST** 🚨

**This file contains the authoritative project configuration that ALL agents must follow. Never work with hardcoded paths - always reference this file.**

---

## 📁 **CURRENT PROJECT SETTINGS**

### **Active Project**: Daily Actions 6 - Mobile Tap-to-Select System
### **Project Root**: `D:\Projects\Ai\Apps\Life-Designer\sub-projects\Lightwalker\`
### **Working Directory**: Base Lightwalker directory

---

## 🎯 **ABSOLUTE FILE PATH REQUIREMENTS**

### **✅ CORRECT PATHS (CLAUDE'S NATURAL STRUCTURE - USE THESE ONLY):**

```
D:\Projects\Ai\Apps\Life-Designer\sub-projects\Lightwalker\
├── .pipeline/                          # Project management docs
│   ├── plans/
│   ├── validation/
│   ├── agent-logs/
│   └── markers/                       # NEW: Filesystem coordination markers
│       ├── component-[name]-FUNCTIONAL.marker
│       ├── component-[name]-LED-READY.marker
│       └── component-[name]-TESTED.marker
├── src/
│   ├── app/
│   │   └── daily-actions6/            # CURRENT: Mobile functionality project
│   │       └── page.tsx               # Main page component (EXISTS)
│   ├── components/
│   │   └── daily-actions6/            # CURRENT: Component directory (EXISTS)
│   │       ├── GamelikeTimeline.tsx
│   │       ├── TarkovInventoryGrid.tsx
│   │       ├── CurrentActivityPanel.tsx
│   │       ├── UpNext.tsx
│   │       └── [mobile components]
│   ├── hooks/
│   │   └── useDeviceDetection.ts      # NEW: Device detection hook (EXISTS)
│   └── lib/
│       └── breadcrumb-system.ts       # LED infrastructure
├── docs/
│   └── mobile-deploy.md               # Implementation plan (EXISTS)
└── package.json                      # React Beautiful DND dependencies
```

### **📁 CLAUDE'S DIRECTORY CREATION PATTERN:**
**WORKING WITH EXISTING:** Daily Actions 6 folder structure already exists:
- ✅ `src/app/daily-actions6/` - Main page location (EXISTS)
- ✅ `src/components/daily-actions6/` - Component location (EXISTS)
- ✅ This is the current project structure - use existing paths

### **❌ PATHS TO AVOID:**
- Any path outside `D:\Projects\Ai\Apps\Life-Designer\sub-projects\Lightwalker\`
- Any `daily-actions4` or `daily-actions5` paths (old versions)
- Any subdirectory paths like `lightwalker5`

---

## 🎯 **SPECIFIC COMPONENT LOCATIONS (CLAUDE'S NATURAL PATHS)**

### **Daily Actions 5 Components - EXACT PATHS:**
- **Main Page**: `src/app/daily-actions5/page.tsx` ← Claude creates this structure automatically
- **Timeline**: `src/components/daily-actions5/GamelikeTimeline.tsx` ← Claude's natural subfolder pattern
- **Inventory Grid**: `src/components/daily-actions5/TarkovInventoryGrid.tsx` ← Expected location
- **Current Activity**: `src/components/daily-actions5/CurrentActivityPanel.tsx` ← Component grouping
- **Up Next Panel**: `src/components/daily-actions5/UpNext.tsx` ← Feature-specific folder
- **Activity Editor**: `src/components/daily-actions5/ActivityEditor.tsx` ← Related components together
- **LED System**: `src/lib/breadcrumb-system.ts` ← Shared utility location

### **Documentation Locations:**
- **Implementation Plans**: `.pipeline/plans/`
- **Validation Reports**: `.pipeline/validation/`
- **Agent Communication**: `.pipeline/agent-logs/`
- **Debugging Reports**: `.pipeline/validation/debugging-reports.md`

### **Filesystem Coordination (NEW):**
- **Agent Markers**: `.pipeline/markers/`
- **Component Status**: `.pipeline/markers/component-[name]-[status].marker`
- **Pipeline Communication**: Through marker files, not direct messaging

---

## 🔧 **DEVELOPMENT SETTINGS**

### **Technology Stack:**
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Drag & Drop**: @dnd-kit/core (mobile-compatible)
- **State Management**: React Context + useState
- **Debugging**: Custom LED breadcrumb system

### **Server Configuration:**
- **Local URL**: `http://localhost:3001/daily-actions5`
- **Port**: 3001
- **Build Command**: `npm run build`
- **Dev Command**: `npm run dev`

### **Mobile Requirements:**
- **Touch Sensor Delay**: 250ms
- **Touch Tolerance**: 5px
- **Target Performance**: 60fps desktop, 30fps mobile

---

## 📋 **PROJECT DOCUMENTS REFERENCE**

### **Primary Requirements Document:**
- **Location**: `DAILY-ACTIONS5-PRD.md` (in project root)
- **Status**: ✅ Current and complete
- **Last Updated**: Current session

### **Agent Instructions:**
- **Project Manager**: `.claude/project-manager2.md`
- **Lead Programmer**: `.claude/agents/lead_programmer.md`
- **Breadcrumbs Agent**: `.claude/agents/breadcrumbs-agent.md`
- **Debugging Agent**: `.claude/agents/debugging-agent.md`

---

## ⚡ **AGENT VERIFICATION PROTOCOL**

### **BEFORE ANY WORK, ALL AGENTS MUST:**

1. **Read this PROJECT-CONFIG.md file FIRST**
2. **Verify project root: `lightwalker5` directory**
3. **Accept Claude's natural directory structure** (daily-actions5 subfolders)
4. **Use .pipeline/markers/ for coordination**
5. **Create directories as needed - don't fight Claude's patterns**

### **WORKING WITH CLAUDE'S BEHAVIOR:**
```yaml
SMART APPROACH:
- Accept that Claude creates daily-actions5/ subfolders
- Work WITH Claude's natural directory patterns
- Focus on correct project root (lightwalker5)
- Use filesystem markers for agent coordination
- Don't waste time fighting directory structure
```

### **PATH VERIFICATION COMMAND:**
```bash
# Verify you're in correct project root
pwd
# Should output: /d/Projects/Ai/Apps/Life-Designer/sub-projects/Lightwalker/lightwalker5

# Create marker directory if needed
mkdir -p .pipeline/markers/
```

---

## 🔄 **UPDATE PROTOCOL**

### **When Project Paths Change:**
1. **Update ONLY this PROJECT-CONFIG.md file**
2. **All agents automatically use new paths**
3. **No need to edit individual agent instructions**
4. **Project Manager notifies all agents of config changes**

### **Configuration Change Format:**
```
PROJECT CONFIG UPDATED:
- New Project Root: [path]
- New Component Paths: [details]
- Effective Immediately: All agents use new config
```

---

## 🎯 **SUCCESS CRITERIA REFERENCE**

### **Current Project Goals:**
- ✅ Mobile drag-and-drop functionality using DnD Kit
- ✅ 100% feature parity with daily-actions4
- ✅ LED breadcrumb debugging system
- ✅ Autonomous error detection and resolution
- ✅ All work contained within project folder

---

**🚨 CRITICAL: This configuration is authoritative. All agents must reference this file for current project settings. Never use hardcoded paths in agent instructions.**