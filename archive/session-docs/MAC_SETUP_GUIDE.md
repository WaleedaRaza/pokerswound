# 🍎 PokerGeek Mac Setup Guide

## 🚨 Common Mac Issues & Solutions

### Issue 1: Database Connection
**Symptom:** `ECONNREFUSED` or database connection errors

**Solution:**
```bash
# Make sure your Supabase connection string is correct in .env
# Mac may have different network settings than Windows

# Check if .env exists
ls -la .env

# If not, create it from template
cp .env.example .env

# Edit with your Supabase credentials
nano .env
```

**Your .env should have:**
```bash
DATABASE_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
PORT=3001
NODE_ENV=development
SESSION_SECRET=your-secret-key-here
```

---

### Issue 2: Node Version
**Symptom:** Errors during `npm install` or runtime errors

**Solution:**
```bash
# Check your Node version
node -v

# Should be v18+ or v20+
# If not, install nvm and update:

# Install nvm (if not installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal, then:
nvm install 20
nvm use 20
nvm alias default 20
```

---

### Issue 3: Port Already in Use
**Symptom:** `Error: listen EADDRINUSE :::3001`

**Solution:**
```bash
# Find what's using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use a different port in .env
PORT=3002
```

---

### Issue 4: PostgreSQL Native Bindings (bcrypt, pg)
**Symptom:** `Error: Cannot find module './binding/bcrypt_lib.node'`

**Solution:**
```bash
# Rebuild native modules for Mac
npm rebuild bcrypt
npm rebuild pg

# Or reinstall everything
rm -rf node_modules package-lock.json
npm install
```

---

### Issue 5: File Permissions
**Symptom:** `EACCES: permission denied`

**Solution:**
```bash
# Fix npm permissions (DO NOT use sudo)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'

# Add to your shell profile (~/.zshrc or ~/.bash_profile)
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc

# Then reinstall
npm install
```

---

### Issue 6: Case Sensitivity
**Symptom:** Module not found errors that work on Windows

**Note:** Mac filesystem is **case-insensitive** by default, but **case-sensitive** in some setups.

**Solution:**
```bash
# Check your filesystem
diskutil info / | grep "File System"

# If case-sensitive, ensure all imports match exact casing
# Example:
# ❌ require('./Routes/games.js')  # Wrong if file is routes/games.js
# ✅ require('./routes/games.js')  # Correct
```

---

## 🛠️ Fresh Mac Setup (Step-by-Step)

### 1. Install Homebrew (if needed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Node.js
```bash
# Via Homebrew
brew install node@20

# Or via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

### 3. Install Git (if needed)
```bash
brew install git
```

### 4. Clone the Repository
```bash
# If not already cloned
git clone <your-repo-url>
cd PokerGeek.AI
```

### 5. Install Dependencies
```bash
npm install
```

### 6. Setup Environment Variables
```bash
# Copy example
cp .env.example .env

# Edit with your values
nano .env
# Or use VS Code
code .env
```

### 7. Run Database Migrations
```bash
# If you have the migration scripts
node scripts/run-evolution-migration.js

# Verify database
node scripts/check-db-state.js
```

### 8. Start the Server
```bash
# Development mode (auto-restart)
npm run dev

# Or production mode
npm start
```

### 9. Test in Browser
```bash
# Open in default browser
open http://localhost:3001

# Or visit manually
# http://localhost:3001
# http://localhost:3001/table  (new production poker table)
```

---

## 🔍 Debugging on Mac

### Check Logs
```bash
# Server logs
tail -f logs/server.log

# Or run with verbose logging
DEBUG=* npm start
```

### Check Network
```bash
# See what ports are in use
lsof -i -P | grep LISTEN

# Check if database is reachable
nc -zv aws-0-us-west-1.pooler.supabase.com 6543
```

### Check Environment
```bash
# Print all env vars
printenv | grep -i poker

# Or check .env is loaded
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"
```

---

## 🚀 Performance on Mac

### Optimize for M1/M2 (Apple Silicon)
```bash
# If on Apple Silicon and having issues
arch -arm64 npm install

# Force ARM architecture
npm config set arch arm64
```

### Disable Rosetta (if using ARM)
```bash
# Make sure you're using native ARM Node
which node
# Should show: /opt/homebrew/bin/node (ARM)
# NOT: /usr/local/bin/node (Intel via Rosetta)
```

---

## 📝 Mac-Specific Scripts

Add to `package.json` if needed:

```json
{
  "scripts": {
    "start:mac": "NODE_ENV=development node sophisticated-engine-server.js",
    "dev:mac": "NODE_ENV=development nodemon sophisticated-engine-server.js",
    "clean:mac": "rm -rf node_modules package-lock.json && npm install",
    "rebuild:mac": "npm rebuild bcrypt pg && npm start"
  }
}
```

---

## ✅ Verification Checklist

Before running on Mac, verify:

- [ ] Node.js v18+ or v20+ installed (`node -v`)
- [ ] npm v9+ installed (`npm -v`)
- [ ] .env file exists and has correct values
- [ ] Database connection string is correct
- [ ] Port 3001 is available (`lsof -i :3001`)
- [ ] Dependencies installed (`ls node_modules`)
- [ ] No permission errors
- [ ] Native modules rebuilt if needed

---

## 🆘 Still Having Issues?

### Quick Health Check
```bash
# Run this one-liner to check everything
node -e "require('dotenv').config(); const pg = require('pg'); const pool = new pg.Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT NOW()', (err, res) => { if(err) console.error('❌ DB Error:', err.message); else console.log('✅ DB Connected:', res.rows[0].now); pool.end(); });"
```

### Common Error Messages

| Error | Solution |
|-------|----------|
| `ECONNREFUSED` | Database not reachable - check .env |
| `EADDRINUSE` | Port in use - kill process or change port |
| `Cannot find module` | Run `npm install` |
| `bcrypt_lib.node` | Run `npm rebuild bcrypt` |
| `EACCES` | Fix npm permissions (see Issue 5) |
| `symbol not found` | Rebuild native modules (see Issue 4) |

---

## 💡 Pro Tips for Mac Development

1. **Use iTerm2** instead of Terminal for better dev experience
2. **Install Oh My Zsh** for better shell experience
3. **Use VS Code** with these extensions:
   - ESLint
   - Prettier
   - GitLens
   - Error Lens
4. **Use Postman** or **Insomnia** for API testing
5. **Use TablePlus** for database GUI (better than pgAdmin on Mac)

---

## 🔄 Switching Between Mac and Windows

### Important Notes:
- ✅ **package.json scripts** work on both platforms
- ✅ **Path.join()** is cross-platform compatible
- ✅ **Environment variables** work the same way
- ✅ **Git line endings** are handled automatically
- ⚠️ **Native modules** need rebuilding when switching
- ⚠️ **File paths** are case-insensitive on Mac by default

### When Switching Platforms:
```bash
# Always rebuild native modules
rm -rf node_modules package-lock.json
npm install
npm rebuild

# Verify everything works
npm start
```

---

**Made with 🍎 for Mac developers**

If you encounter issues not covered here, check the main README or create an issue.
