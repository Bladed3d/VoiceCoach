# Lightwalker Project - Master Index

## 🚨 CRITICAL AGENT NAMING CLARIFICATION
**When using Task tool with custom agents**: Use the agent's **name** field from the .md file header, NOT the filename!
- Example: File `task-breakdown-agent.md` has `name: Task Breakdown Agent` 
- **USE**: `subagent_type: "Task Breakdown Agent"`
- **NOT**: `subagent_type: "task-breakdown-agent"`

## 🚨 MANDATORY SESSION START PROTOCOL

**EVERY conversation MUST begin by reading these files in order:**

1. **`CLAUDE-SOP-SYSTEM.md`** ← Complete Standard Operating Procedures
2. **`CLAUDE-CRITICAL-RULES.md`** ← Rules that MUST NEVER be violated  
3. **`CLAUDE-MISTAKES-LOG.md`** ← Every past failure documented with solutions
4. **`CLAUDE-SUCCESS-PATTERNS.md`** ← Proven approaches that work reliably
5. **`COMMANDS-LEARNED.md`** ← System-specific command database
6. **`CLAUDE-PROJECT-CONTEXT.md`** ← Current project status and next steps

**CORE PRINCIPLE**: "Mistakes or errors never happen twice if we resolve them after happening once."

**VALIDATION PROCESS**: Before executing ANY action:
- ✅ Check mistakes log for similar attempts
- ✅ Verify approach in success patterns  
- ✅ Confirm command in learned database
- ✅ If new/untested → ASK permission first
- ✅ Document outcome in appropriate file

---

## 🎯 CURRENT PROJECT FOCUS

**Lightwalker™**: AI personality companion system where users create ideal versions of themselves to copy behaviors from.

**Current Phase**: AI-Powered Character Creation ✅ LIVE IN PRODUCTION
**Main URL**: https://lightwalker-mvp.vercel.app/ai-character-creation-hybrid
**Status**: Web Research System Phase COMPLETED (July 30, 2025)

---

## 📁 DETAILED REFERENCE FILES

**Project Information:**
- **`CLAUDE-PROJECT-CONTEXT.md`** - Current development status, completed features, next priorities
- **`LIGHTWALKER-ARCHITECTURE.md`** - File locations, deployment info, production URLs

**Technical Specifications:**
- **`LIGHTWALKER-TECHNICAL-SPECS.md`** - Stack details, database schema, working commands
- **`LIGHTWALKER-BRANDING-RULES.md`** - Trademark requirements, interaction rules, content guidelines

**Operational Files** (Read during session startup):
- **`CLAUDE-SOP-SYSTEM.md`** - Complete procedures and protocols
- **`CLAUDE-CRITICAL-RULES.md`** - Commands/actions that must never be done
- **`CLAUDE-MISTAKES-LOG.md`** - Every documented failure with prevention rules
- **`CLAUDE-SUCCESS-PATTERNS.md`** - Proven working approaches
- **`COMMANDS-LEARNED.md`** - Windows-specific command database

---

## ⚡ QUICK REFERENCE

**Critical Commands** (Details in LIGHTWALKER-TECHNICAL-SPECS.md):
- `npm run build` ← ALWAYS use this (never `npm run dev`)
- Check `CLAUDE-CRITICAL-RULES.md` before ANY system command

**Deployment Rules** (Details in CLAUDE-CRITICAL-RULES.md):
- ALWAYS ask permission before git push or deployment
- Batch 3-5 changes together (Vercel 100/day limit)

**Development Stack**: Next.js 14, TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS

---

**IMPORTANT**: This master index provides entry points to detailed information. Read the specific reference files for complete context on any topic.

---

## 🔴 CRITICAL QUALITY PRINCIPLE - VOICECOACH PROJECT

**NEVER COMPROMISE QUALITY FOR SPEED**

The user has explicitly stated:
- "I never want to compromise quality for speed"
- "I want a great app that's working properly" 
- "Not at the expense of quality and proper robust design"
- "I am tired of Claude constantly suggesting short term fixes rather than robust and proper solutions"

**MANDATORY APPROACH FOR VOICECOACH:**
1. ✅ ALWAYS implement robust, production-ready solutions
2. ✅ ALWAYS think about error handling, edge cases, and sustainability
3. ✅ ALWAYS consider what happens when real users use the system
4. ✅ ALWAYS build with deployment and scale in mind
5. ❌ NEVER take shortcuts just to get something "working" quickly
6. ❌ NEVER implement quick fixes that will cause debugging problems later
7. ❌ NEVER use mock data or simulated functionality when real implementation is needed

**Example**: When implementing transcription:
- ❌ WRONG: "Let's just simulate transcription to test quickly"
- ✅ RIGHT: "Let's properly integrate a real transcription service (Whisper/AssemblyAI/Deepgram) with proper error handling, retry logic, and fallback mechanisms"

**The goal is a robust, sustainable app that works reliably for actual users, not a quick demo that appears to work but fails in production.**