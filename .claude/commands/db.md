Launch Prisma Studio for database browsing and editing:

## Database GUI Launch Process

Execute these steps to open Prisma Studio for database management:

### Step 1: Check Port 5555 Status
Use `netstat -ano | findstr :5555` to see if Prisma Studio is already running on port 5555.

### Step 2: Close Existing Process (if port is in use)
If port 5555 is in use:
- Find the PID from the netstat output
- Close it safely with `taskkill //F //PID [number]` (note: double forward slashes)
- This prevents system crashes from multiple ports opening

### Step 3: Launch Prisma Studio on Port 5555
Run `npx prisma studio` to start the database GUI on the now-available port 5555.

**Expected Result**: 
- Prisma Studio will start on http://localhost:5555
- Message: "Prisma Studio is up on http://localhost:5555"
- Browser will automatically open (or user can manually navigate to the URL)

### Step 4: Confirm Success
Inform the user that Prisma Studio is now available for:
- Browsing all database tables (Trait, SubTrait, RoleModel, etc.)
- Searching and filtering data
- Manual editing of records
- Viewing relationships between tables

### Troubleshooting:
- **NEVER let Prisma Studio auto-select ports** - Always close existing process and reuse port 5555 to prevent system crashes
- If database connection fails, check that DATABASE_URL is properly set in .env
- If schema errors occur, run `npx prisma generate` first
- If taskkill fails, the process may have already closed - proceed with launching Prisma Studio

### Natural Language Triggers:
This command responds to phrases like:
- "search the database"
- "browse the data" 
- "open database GUI"
- "look at the database"
- "I want to see what's in the database"

### Related Commands:
- `/data-explore` - For programmatic data exploration via API
- `/help-tasks` - For complete command reference