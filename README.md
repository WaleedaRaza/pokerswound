# 🎮 PokerGeek - The Chess.com of Poker

**Revolutionary online poker platform with full data persistence, AI analysis, and community features.**

**Current Status:** 85% Infrastructure, 20% Features  
**Next Phase:** Validate Refresh Recovery → Horizontal Scaling → Feature Velocity  
**Target Launch:** 8-12 weeks to MVP

---

## ⚠️ **START HERE**

**Read `PRODUCTION_BATTLEPLAN.md` ⭐ - Your ONLY strategic document**

This comprehensive battleplan contains:
- Complete ground truth (what actually works vs what's claimed)
- Critical path to production (Phase 0-4)
- Feature reality matrix (what exists vs what's implemented)
- Strategic positioning against competition
- Week-by-week execution plan

**All other planning docs have been archived. This is your single source of truth.**

---

## 🚀 **QUICK START**

### **For Developers (First Time Here):**

1. **Read:** `PRODUCTION_BATTLEPLAN.md` ⭐ (30 min)
   - Complete picture: infrastructure, features, timeline
   - Validated against actual code
   - Clear prioritization and success metrics

2. **For Database:** `Schemasnapshot.txt` (reference)
   - Complete schema with all 60+ tables
   - Use for query development

3. **For Config:** `.env.example`
   - Copy to `.env` and configure
   - Supabase credentials required

### **For Running the Server:**

```bash
# From project root
node sophisticated-engine-server.js

# Server runs on http://localhost:3000
# Game interface: http://localhost:3000/poker.html
```

### **Environment Setup:**

1. Copy `.env.example` to `.env`
2. Add your Supabase credentials
3. Configure PostgreSQL connection
4. Run: `node sophisticated-engine-server.js`

---

## 📚 **DOCUMENTATION STRUCTURE**

### **Core Documents (4 Files Only):**

```
📖 README.md                    ← You are here (quick start)
📖 PRODUCTION_BATTLEPLAN.md     ⭐ SINGLE SOURCE OF TRUTH (read this!)
📖 Schemasnapshot.txt           🗄️  Database schema reference
📖 .env.example                 ⚙️  Configuration template
```

### **Historical Documentation:**

```
archive/
├── history/          (All previous planning docs, handoffs, fix attempts)
├── completed/        (Completed work logs, summaries)
├── decisions/        (Architectural decisions, strategies)
└── docs-history/     (Legacy documentation from earlier phases)
```

**Note:** If you're reading anything other than `PRODUCTION_BATTLEPLAN.md`, it's historical context, not current strategy.

---

## 🎯 **PROJECT GOALS**

### **Mission:**
Build the **chess.com of poker** that destroys pokernow.club

### **Why We'll Win:**
1. **Full Data Persistence** - Hand history, game history, stats (competitors: NONE)
2. **Post-Game Analysis** - AI-powered insights (competitors: NONE)
3. **Superior UX** - No 90-hour bugs, modern UI (competitors: stuck in 2010)
4. **Complete Platform** - Friends, clubs, tournaments, learning (competitors: just tables)
5. **Provably Fair** - Transparent RNG (competitors: suspected rigged)

---

## 📊 **CURRENT STATUS**

### **What's Working:**
- ✅ Core poker engine (full Texas Hold'em)
- ✅ Lobby system (room creation, invites, approval)
- ✅ Authentication (Guest + Google OAuth)
- ✅ Database persistence (games survive restarts)
- ✅ Real-time WebSocket communication
- ✅ Security stack (rate limiting, validation, auth)
- ✅ **NEW: Modular router architecture (21 endpoints organized)**

### **What's ACTUALLY Built (Discovered!):**
- ✅ Frontend state management **COMPLETE** (game-state-manager.js - 364 lines)
- ✅ Action timer system **COMPLETE** (action-timer-manager.js - 258 lines)
- ✅ Player status system **COMPLETE** (player-status-manager.js - 284 lines)
- ⏳ **Need Integration:** Wire these into game flow (4 hours)

**Progress:** Foundation 85%, Features 10%, Overall 20%

---

## 🏗️ **TECH STACK**

### **Backend:**
- Node.js + Express
- TypeScript (sophisticated engine)
- PostgreSQL (Supabase)
- Socket.IO (real-time)

### **Frontend:**
- Vanilla JavaScript (for now)
- Socket.IO client
- Google OAuth

### **Architecture:**
- Modular router structure
- Dependency injection via app.locals
- Event sourcing + CQRS patterns
- Sophisticated game engine (GameStateMachine, BettingEngine, TurnManager)

---

## 🗺️ **ROADMAP OVERVIEW**

### **Phase 0: Validate Refresh Recovery** ⚠️ **START HERE** (2-4 hours)
- Test refresh flow end-to-end
- Verify Anton's 3 fix attempts actually work
- Document any remaining issues

### **Phase 1: Horizontal Scaling** (1-2 weeks)
- Room URL system (`/game/:roomId`)
- Redis session store
- Socket.IO Redis adapter
- Link-based session recovery

### **Phase 2: Integrate Built Managers** (4-6 hours)
- Action timer integration (auto-fold on timeout)
- Game state manager (localStorage persistence)
- Player status tracking (ACTIVE/AWAY/OFFLINE)

### **Phase 3: Feature Velocity** (2-3 weeks)
- Hand/game history endpoints
- In-game chat with rate limiting
- Nicknames & profiles
- Card reveal, rebuy, public rooms

### **Phase 4: Platform Differentiation** (3-4 weeks)
- Friend system & clubs
- Post-game analysis (chess.com style)
- Ranked matchmaking & chip economy
- Tournaments, AI analysis

**Full roadmap with weekly breakdowns:** See `PRODUCTION_BATTLEPLAN.md`

---

## 🎮 **FOR USERS**

### **How to Play:**
1. Visit http://localhost:3000
2. Sign in with Google or play as Guest
3. Create a room or join with invite code
4. Wait for host approval
5. Play Texas Hold'em poker!

### **Features Available Now:**
- Room creation with invite codes
- Player approval system
- Full Texas Hold'em gameplay
- Real-time updates via WebSocket
- Seat persistence (refresh keeps your seat)

### **Coming Soon:**
- Action timers (30s per turn)
- Away/Offline player status
- In-game chat
- Hand history tracking
- Post-game analysis with AI

---

## 🤝 **FOR CONTRIBUTORS**

### **Development Process:**
1. Read `PRODUCTION_BATTLEPLAN.md` for current status and priorities
2. Check Phase 0-4 roadmap for next tasks
3. Follow modular architecture patterns (see Code Structure below)
4. Test thoroughly before committing (90-hour bug lesson learned)

### **Code Structure:**
```
sophisticated-engine-server.js  (main server, now streamlined)
routes/
├── rooms.js   (11 endpoints for room management)
├── games.js   (7 endpoints for game logic)
└── auth.js    (3 endpoints for authentication)
src/
├── core/      (TypeScript game engine)
├── services/  (database, event sourcing)
└── types/     (TypeScript interfaces)
public/
├── poker.html (game interface)
├── play.html  (lobby interface)
└── js/        (frontend logic)
```

### **Testing:**
- Manual testing currently
- Automated tests planned for Week 6
- Test all endpoints after changes

---

## 📞 **CONTACT & LINKS**

**Project Lead:** Building towards freedom through creation  
**Target Market:** Non-gambling online poker players  
**Competition:** pokernow.club (we're better in every way)

---

## 🎯 **REMEMBER:**

**This project represents freedom. We stop at no cost.**

**The chess.com of poker is 8-12 weeks away.**

**Key Achievements:**
- ✅ Modularization complete: 64% reduction (2,886 → 1,046 lines)
- ✅ Week 2 Days 5-7 already built: 906 lines of managers ready to integrate
- ✅ Documentation consolidated: 12 docs → 1 battleplan

**Next Action:**  
→ **Phase 0: Validate refresh recovery (2-4 hours)**

**For everything else:**  
→ **Read `PRODUCTION_BATTLEPLAN.md`** ⭐

---

**Last Updated:** October 25, 2025 (Chat #6 - Mira)  
**Status:** Documentation overhaul complete. Ready for Phase 0 execution.  
**Progress:** 85% Infrastructure, 20% Features, MVP 8-12 weeks away
