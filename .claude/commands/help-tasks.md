Show comprehensive help for all available custom commands and voice triggers:

# 🚀 Lightwalker Custom Commands & Voice Triggers

This is your master reference for all available commands. Use either the slash command OR say the natural phrase.

## 🗄️ Database Commands
- **`/db`** or **`/database`** → Launch Prisma Studio for browsing/editing database
  - **Natural Speech**: "search the database", "browse data", "look at database", "open database GUI"
  - **What it does**: Checks if Prisma Studio is running, launches on available port (usually 5555)

## 🖥️ Development Commands  
- **`/server`** → Check port status and restart development server
  - **Natural Speech**: "start the server", "run the app", "restart development"
  - **What it does**: Checks port 3001, kills existing process safely, starts Next.js server

## 🔧 Debugging Commands
- **`/timeline-debug`** → Navigate to timeline page and diagnose common issues
  - **Natural Speech**: "fix the timeline", "timeline problems", "timeline not working"
  - **What it does**: Opens timeline page, checks for sync issues, validates time display

## 📊 Data Exploration Commands
- **`/data-explore`** → Run API endpoints to explore database content and structure
  - **Natural Speech**: "what's in the database", "show me the data", "explore attributes"
  - **What it does**: Calls /api/explore-attributes, displays traits, subtraits, and samples

## 📝 Session Management Commands (from claude-sessions)
- **`/project:session-start`** → Begin development session tracking
- **`/project:session-update`** → Log progress during development  
- **`/project:session-end`** → Complete session with summary
- **`/project:session-current`** → View current session status
- **`/project:session-list`** → List all past sessions

## 🆘 Help Commands
- **`/help-tasks`** → Show this comprehensive command list (you're reading it now!)
- **`/project:session-help`** → Show session management help

---

## 🎯 Quick Tips for Natural Speech:
- Say what you want to DO, not the technical details
- Examples: "I want to search the database" → Claude will run `/db`
- Examples: "Start the server" → Claude will run `/server`
- Examples: "What data do we have?" → Claude will run `/data-explore`

## ➕ Adding New Commands:
1. Create new `.md` file in `.claude/commands/`
2. Add entry to this help file
3. Include both slash command and natural language triggers
4. Test the new command

## 🔍 Command Template:
```markdown
## 📂 [Category] Commands
- **`/your-command`** → Brief description of what it does
  - **Natural Speech**: "phrase 1", "phrase 2", "phrase 3"
  - **What it does**: Detailed explanation of the process
```

---
*This file is automatically updated when new commands are added. Always check here if you forget a command!*