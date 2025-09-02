# Ollama Instruction System - Quick Start Guide

## 🚀 How It Works

Your VoiceCoach V2 app now loads Ollama instructions from a simple markdown file instead of hardcoded prompts. This means you can change how Ollama responds WITHOUT touching any code!

## 📝 To Change Ollama's Behavior:

1. **Edit the instruction file**: 
   - Open `ollama-prompts/active-instructions.md`
   - Modify the text between ` ```prompt ` markers
   - Save the file

2. **That's it!** The app automatically uses your new instructions

## 🧪 Quick Test:

1. Start your app normally
2. Begin a coaching session
3. Say: "This seems really expensive"
4. Ollama should respond with Chris Voss techniques (labeling, mirroring, etc.)

## 📁 File Structure:

```
VoiceCoach-v2/
├── ollama-prompts/
│   ├── active-instructions.md    ← EDIT THIS FILE
│   └── README.md                  ← You're reading this
├── src/services/coaching/
│   └── OllamaInstructionLoader.ts ← Loads the MD file
```

## 🎯 What You Can Customize:

- **Response Format**: Change from JSON to plain text
- **Techniques**: Emphasize different sales methodologies
- **Priorities**: Adjust what's HIGH vs LOW priority
- **Context**: Add more variables like {COMPANY_NAME}
- **Examples**: Add your specific scenarios

## 💡 Example Changes:

### Want simpler responses?
Replace the JSON format with:
```
Just tell me what to say in one sentence.
```

### Want to focus on different methodology?
Replace Chris Voss techniques with SPIN Selling, MEDDIC, etc.

### Want more aggressive coaching?
Change "tactical empathy" focus to "direct closing techniques"

## 🔄 Variables Available:

These get replaced with actual values:
- `{TRANSCRIPT}` - Current conversation
- `{KNOWLEDGE_BASE}` - ChromaDB results  
- `{SALES_STAGE}` - discovery/demo/closing
- `{DURATION}` - Call duration in minutes
- `{OBJECTIONS}` - Detected objections
- `{TOPICS}` - Topics discussed
- `{SENTIMENT}` - Emotional tone

## ⚡ Pro Tips:

1. **Test changes immediately** - File reloads automatically on save
2. **Keep backups** - Copy working versions before major changes
3. **Be specific** - "Say exactly: ..." works better than "Be helpful"
4. **Include examples** - Show Ollama what you want
5. **Check console** - Look for "🔄 Instruction file changed, reloading..."

## 🎭 Different Instruction Templates:

You can create multiple instruction files and swap them:
- `active-instructions.md` - Currently active
- `aggressive-sales.md` - For hard closing
- `consultative.md` - For soft approach
- `technical-sales.md` - For complex products

Just rename the file you want to `active-instructions.md`

## 🐛 Troubleshooting:

**Ollama not using new instructions?**
- Check console for "✅ Ollama instructions loaded"
- Ensure you're editing between ` ```prompt ` markers
- Try restarting the coaching session

**Getting parse errors?**
- Make sure JSON format is valid if using JSON responses
- Check for unmatched quotes or brackets

**Want to revert?**
- Delete `active-instructions.md`
- App will create a fresh default on next start

## 🚦 Success Indicators:

You'll know it's working when:
- Console shows: "✅ Ollama instructions loaded from: ollama-prompts/active-instructions.md"
- Changes to the MD file immediately affect coaching responses
- Ollama uses the specific techniques you defined

---

**That's it!** You now have complete control over Ollama's coaching style without touching code. Edit the markdown file, save, and watch your coaching adapt instantly!