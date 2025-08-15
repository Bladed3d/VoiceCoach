# 🚨 CLAUDE CRITICAL RULES - CHECK FIRST, ALWAYS!

## ❌🚨 FATAL COMMANDS - TERMINATE CHAT SESSION:
- **`taskkill /F /IM node.exe`** → **KILLS THIS CHAT IMMEDIATELY** - NEVER USE
- **`taskkill //F //IM node.exe`** → **KILLS THIS CHAT IMMEDIATELY** - NEVER USE

## ❌ NEVER DO THESE COMMANDS:
- **TESTING RULE**: Use `npm run build` for final testing, `npm run dev` OK for active development with auto-refresh
- **NEVER use `find`, `grep`, `cat`, `ls` bash commands** → Use Read, Grep, LS tools instead
- **NEVER install react-router-dom** → Breaks Vercel deployment with pnpm lockfile conflicts

## ❌ NEVER DO THESE ACTIONS:
- **NEVER push to git without asking first** → Always batch multiple changes together
- **NEVER deploy without permission** → Remember Vercel 100/day limit
- **NEVER create new seeding scripts** → Use existing `scripts/seed-role-models.ts`
- **NEVER open multiple development ports on Windows** → SYSTEM CRASH RISK - Clear existing port first

## 🔒 MANDATORY PRE-ACTION PROTOCOL (HARD CONSTRAINT):
- **STEP 1**: PHYSICALLY TYPE the exact command you want to run HERE: _________________
- **STEP 2**: Is "node.exe" anywhere in that command? If YES → **FATAL - REFUSE IMMEDIATELY**
- **STEP 3**: Only proceed if you can honestly say "This command contains no reference to node.exe"
- **VIOLATION = CHAT DEATH** - User will lose work and have to restart conversation

## ✅ SAFE PORT MANAGEMENT (ONLY METHOD ALLOWED):
1. **Check port usage**: `netstat -ano | findstr :3001`
2. **Kill specific PID**: `taskkill //F //PID [PID_NUMBER]` (ONLY with specific PID number)
3. **Start server**: `npm run build && npx next start -p 3001`

## ✅ ALWAYS DO THESE FIRST:
- **READ THIS ENTIRE FILE before ANY Bash command** (MANDATORY)
- **READ file content with Read tool before ANY Edit operation** (MANDATORY)
- **ASK permission** before git push, deployment, or major changes
- **USE TOOLS**: Read instead of cat, Grep instead of grep, LS instead of ls
- **BATCH CHANGES**: Wait for 3-5 related changes before pushing

## 🖥️ WINDOWS-SPECIFIC:
- Expect Prisma file locking during builds → Retry once, then continue
- Use backslash paths: `D:\projects\...`
- PowerShell may require different syntax than Unix commands

---
**CRITICAL**: If you violate any rule above, STOP and update this file with the lesson learned!