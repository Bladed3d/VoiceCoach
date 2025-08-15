# Command Learning Database - Windows System

**Last Updated**: July 30, 2025
**System**: Windows 11, Node.js, Next.js 14, Prisma ORM

## 🟢 VERIFIED WORKING COMMANDS

### Build & Test Commands
- `npm run build` ✅ **Always use this instead of dev**
- `npx ts-node scripts/seed-role-models.ts` ✅ Seeds role models correctly

### Git Commands  
- `git status` ✅ Always works
- `git add [files]` ✅ Standard git operations work
- `git commit -m "message"` ✅ Works with HEREDOC format for multi-line
- `git push origin main` ✅ Deploys to Vercel automatically

### TypeScript & Linting
- `npx tsc --noEmit` ❌ **Issues with JSX flags - use npm run build instead**

## 🔴 VERIFIED BROKEN COMMANDS (NEVER USE)

### Development Commands
- `npm run dev` ❌ **FORBIDDEN - causes Prisma file lock issues**
- `npm start` ❌ **Not configured in this project**

### Unix Commands (Windows Incompatible)
- `find . -name "*.ts"` ❌ **Use Glob tool instead**
- `grep pattern file` ❌ **Use Grep tool instead** 
- `cat file.txt` ❌ **Use Read tool instead**
- `ls directory` ❌ **Use LS tool instead**

### Package Management Issues
- Installing `react-router-dom` ❌ **Breaks Vercel deployment with pnpm lockfile conflicts**
- Installing `@types/react-router-dom` ❌ **Same pnpm issue**

## 🟡 KNOWN ISSUES & WORKAROUNDS

### Port Management (Windows) - CRITICAL
- **Issue**: Multiple development ports cause Windows system crashes
- **Cause**: Port conflicts and resource exhaustion on Windows
- **Solution**: Always clear existing port before starting new dev server
- **Commands**: 
  - `netstat -ano | findstr :3001` - Find process using port
  - `taskkill //F //PID [PID]` - Kill process by PID (ONLY with specific PID number)
- **Prevention**: NEVER open multiple ports simultaneously
- **NEVER use taskkill with node.exe or any image name**

### Prisma File Locking (Windows)
- **Issue**: `npm run build` sometimes fails with "operation not permitted" on .dll.node files
- **Cause**: Windows file locking when dev server was running or process conflict
- **Solution**: Retry the command once - usually works on second attempt
- **Prevention**: Always ensure no conflicting processes

### Path Handling
- **Use**: `D:\projects\ai\apps\Life-Designer\sub-projects\Lightwalker\...`
- **Format**: Backslashes work fine in file paths
- **Tools**: Always use Read, Grep, LS tools instead of bash commands

### Git Line Endings
- **Warning**: "LF will be replaced by CRLF" warnings are normal on Windows
- **Action**: Ignore these warnings - they don't affect functionality

## 📝 LEARNING LOG

### July 30, 2025
- ✅ Added all 22 role models to archetype colorMap - fixed "wisdom-keeper" fallback issue
- ✅ Web research system working perfectly with Ray Dalio, Bill Gates queries
- ❌ Prisma file lock occurred during build - resolved on retry
- ✅ TypeScript fixes deployed successfully (commits `9f0e48c`, `7092494`, `adc8bef`)

### Command Patterns Learned
- **Always check CLAUDE-CRITICAL-RULES.md before ANY system command**
- **When in doubt, use tools instead of bash commands**
- **Ask permission before git operations**
- **Batch multiple changes before deployment**

---
**IMPORTANT**: Update this file immediately when discovering new working/broken commands!