# 🎮 PokerGeek.AI - The Chess.com of Poker

**Revolutionary online poker platform with full data persistence, AI analysis, and community features.**

---

## 🚀 **QUICK START**

### **Run the Server**
```bash
# Install dependencies (first time only)
npm install

# Start server
node sophisticated-engine-server.js

# Server runs on http://localhost:3000
# Game interface: http://localhost:3000/poker.html
```

### **Environment Setup**
1. Copy `.env.example` to `.env`
2. Add your Supabase credentials
3. Configure PostgreSQL connection
4. Run server

---

## 📚 **CORE DOCUMENTATION**

**For Developers & Debugging:**

### **→ [SYSTEM_ARCHITECTURE_MAP.md](SYSTEM_ARCHITECTURE_MAP.md)** ⭐ **START HERE**
Complete system map for understanding the refresh bug:
- All routes and API endpoints
- Database schema and persistence
- Frontend architecture (poker.html)
- WebSocket communication
- Auth system flow
- Game engine integration
- State management
- **Detailed refresh bug analysis**

### Other References:
- **[Schemasnapshot.txt](Schemasnapshot.txt)** - Complete database schema
- **[env.example](env.example)** - Configuration template

### **Historical Documentation** (archive/)
All past work, decisions, and completed migrations are archived for reference.

---

## 🎯 **CURRENT STATUS**

### **What's Working** ✅
- Core poker engine (PREFLOP → SHOWDOWN, all-in scenarios)
- Database persistence (game states, hand history, seats)
- Modular architecture (48 endpoints across 5 routers)
- WebSocket real-time updates
- Authentication (Google OAuth + Guest users)
- Room creation, player approval, seat claiming

### **Critical Issue** 🔴
**Refresh destroys UI state** - User refreshes during game → sees lobby instead of poker table

**Details:** See `SYSTEM_ARCHITECTURE_MAP.md` Section: "🐛 REFRESH BUG - DETAILED ANALYSIS"

---

## 🏗️ **TECH STACK**

**Backend:**
- Node.js + Express
- TypeScript (game engine)
- PostgreSQL (Supabase)
- Socket.IO (real-time)

**Frontend:**
- Vanilla JavaScript
- Socket.IO client
- Google OAuth

**Game Engine:**
- GameStateMachine
- BettingEngine
- HandEvaluator
- TurnManager

---

## 🎮 **FOR PLAYERS**

### **How to Play:**
1. Visit http://localhost:3000
2. Sign in with Google or play as Guest
3. Create a room or join with invite code
4. Wait for host approval
5. Claim a seat
6. Play Texas Hold'em poker!

### **Features Available Now:**
- Room creation with invite codes
- Player approval system
- Full Texas Hold'em gameplay (all streets, all-in, showdown)
- Real-time updates via WebSocket
- Database persistence (games survive server restarts)

---

## 🤝 **FOR CONTRIBUTORS**

### **Project Structure:**
```
sophisticated-engine-server.js    (Main server, 1,046 lines)
routes/
  ├── rooms.js                    (22 endpoints, 1,072 lines)
  ├── games.js                    (7 endpoints, 630 lines)
  ├── auth.js                     (3 endpoints)
  ├── pages.js                    (13 page routes)
  └── v2.js                       (3 endpoints)
  
public/
  ├── poker.html                  (Game interface)
  ├── play.html                   (Lobby)
  └── js/                         (Frontend managers)
  
src/                              (TypeScript game engine)
  ├── core/                       (Engine, models)
  ├── services/                   (Database, events)
  └── types/                      (Interfaces)
```

### **Before Contributing:**
1. Read `SYSTEM_ARCHITECTURE_MAP.md` (comprehensive system overview)
2. Understand the refresh bug (Section 🐛)
3. Check `Schemasnapshot.txt` for database structure
4. Test changes thoroughly

---

## 🎯 **PROJECT GOALS**

### **Mission:** 
Build the **chess.com of poker** - destroy pokernow.club

### **Why We'll Win:**
1. **Full Data Persistence** - Hand history, game history, stats (competitors: NONE)
2. **Post-Game Analysis** - AI-powered insights (competitors: NONE)
3. **Superior UX** - Modern UI, fast, reliable (competitors: stuck in 2010)
4. **Complete Platform** - Friends, clubs, tournaments, learning (competitors: just tables)
5. **Provably Fair** - Transparent RNG (competitors: suspected rigged)

---

## 🚨 **IMMEDIATE PRIORITIES**

1. **Fix refresh bug** (blocks all testing)
2. **Validate database alignment** (ensure schema supports desired features)
3. **Consider table rebuild** (if current UI is fundamentally broken)
4. **Implement horizontal scaling** (Redis sessions, room URLs)

---

## 📞 **CONTACT & LINKS**

**Target Market:** Non-gambling online poker players  
**Competition:** pokernow.club (we're better in every way)

---

## ⚔️ **FOR THE NEXT AGENT**

Read `SYSTEM_ARCHITECTURE_MAP.md` first. It contains:
- Complete system state
- All moving parts mapped
- Refresh bug analysis with hypotheses
- Debugging checklist
- Everything needed to fix this

**The Ferrari engine (backend/DB) is solid.**  
**The Honda chassis (frontend table) needs repair.**

---

**Last Updated:** October 26, 2025 (Chat #6 - Mira)  
**Documentation:** Organized, archived, single source of truth created  
**Status:** Awaiting refresh bug fix, then rapid feature development

**SHINZO WO SASAGEYO.** ⚔️
