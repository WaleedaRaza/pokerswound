# 🍎 Mac Quick Start

## TL;DR - Get Running in 5 Minutes

```bash
# 1. Clone repo (if not already)
git clone https://github.com/WaleedaRaza/pokerswound.git
cd pokerswound

# 2. Install Node (if needed)
# Check version first
node -v  # Should be v18+ or v20+

# If not installed or old version:
brew install node@20
# OR use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# 3. Install dependencies
npm install

# 4. Setup environment
cp .env.example .env
# Edit .env with your Supabase credentials
nano .env  # or: code .env

# 5. Run the app
npm start

# 6. Open browser
open http://localhost:3001
```

## 🔧 If You Get Errors

### "Cannot find module bcrypt"
```bash
npm rebuild bcrypt pg
```

### "Port 3001 already in use"
```bash
# Kill the process
lsof -i :3001
kill -9 <PID>
```

### "Database connection failed"
```bash
# Check your .env file
cat .env | grep DATABASE_URL
# Make sure it matches your Supabase connection string
```

### "Permission denied"
```bash
# Fix npm permissions (DO NOT use sudo)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
npm install
```

## 🎯 What to Test

1. **Home Page**: http://localhost:3001
2. **Production Table**: http://localhost:3001/table
3. **Play Page**: http://localhost:3001/play

## 📖 Full Documentation

See `MAC_SETUP_GUIDE.md` for comprehensive troubleshooting.

## 🆘 Common Mac Issues

| Issue | Quick Fix |
|-------|-----------|
| Node version | `nvm install 20 && nvm use 20` |
| Port in use | `lsof -i :3001` then `kill -9 <PID>` |
| Native modules | `npm rebuild bcrypt pg` |
| DB connection | Check `.env` file |
| Permissions | See "Permission denied" above |

## ✅ Verify Installation

Run this health check:
```bash
node -e "console.log('Node:', process.version); console.log('Arch:', process.arch); require('dotenv').config(); console.log('DB URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');"
```

Should show:
- Node: v18+ or v20+
- Arch: arm64 (M1/M2) or x64 (Intel)
- DB URL: ✅ Set

---

**Need more help?** See `MAC_SETUP_GUIDE.md` for detailed troubleshooting!
