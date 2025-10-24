# 🎮 PokerGeek - The Chess.com of Poker

**Revolutionary online poker platform with full data persistence, AI analysis, and community features.**

**Current Status:** MODULARIZATION COMPLETE ✅ (64% reduction, 48 endpoints extracted)  
**Next Phase:** Testing → Week 4 Features (Chat, History, Rebuy)  
**Target Launch:** 7-9 weeks to full MVP

---

## 🚀 **QUICK START**

### **For Developers (First Time Here):**

1. **Start Here:** Read `STRATEGIC_OVERVIEW_OCT24.md` ⭐ (10 min)
   - Where we are, where we're going
   - Complete roadmap and decision points
   - **THIS IS THE MAIN REFERENCE DOCUMENT**

2. **Then:** Skim `PROJECT_MASTER.md` (5 min)
   - Feature list and timeline
   - High-level architecture

3. **For Technical Deep Dive:** `ARCHITECTURE_MIGRATION_GUIDE.md` (30 min)
   - Implementation details
   - Code structure
   - Migration procedures

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

### **Core Documents (Read These):**

```
📖 README.md                          ← You are here
📖 STRATEGIC_OVERVIEW_OCT24.md        ⭐ MAIN REFERENCE (current status, roadmap, decisions)
📖 PROJECT_MASTER.md                  📋 Project roadmap, features, timeline
📖 ARCHITECTURE_MIGRATION_GUIDE.md   🏗️ Technical implementation details
```

### **Historical Documentation:**

```
archive/docs-history/
├── progress/         (Week 1-2 completion logs)
├── bugs/            (Auth fixes, bug resolutions)
├── modularization/  (Week 2 Day 4 extraction process)
├── decisions/       (Planning snapshots)
└── old/             (Deprecated documentation)
```

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

### **What's Next (Week 2 Days 5-7):**
- ⏳ Frontend state management (2 hours)
- ⏳ Action timer system (3 hours)
- ⏳ Player status system (3 hours)

**Progress:** Foundation 70%, Features 5%

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

### **Phase 1: Playable Game (Weeks 2-3) ← WE ARE HERE**
- ✅ URL routing, seats, refresh, modularization
- ⏳ Timers, status, room management
- **Target:** November 3

### **Phase 2: Feature Parity (Week 4)**
- Chat, show cards, rebuy
- Hand/game history
- **Target:** November 10

### **Phase 3: Competitive Advantage (Week 5)**
- Friend system, tournaments
- Public/private rooms
- **Target:** November 17

### **Phase 4: Platform Features (Weeks 6-10)**
- Scaling (Redis), post-game analysis
- Ranked system, clubs, learning, forum
- **Target:** December 22

**Full details:** See `STRATEGIC_OVERVIEW_OCT24.md`

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
1. Read `STRATEGIC_OVERVIEW_OCT24.md` for current status
2. Check Week 2-3 roadmap for next tasks
3. Follow modular architecture patterns
4. Test thoroughly before committing

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

**The chess.com of poker is within reach.**

**Week 2 Day 4 ✅ Modularization complete.**  
**Week 2 Days 5-7 ⏳ Timers & Status next.**

**For complete current status and next steps:**  
→ **Read `STRATEGIC_OVERVIEW_OCT24.md`** ⭐

---

**Last Updated:** October 24, 2025  
**Documentation Cleaned:** 62 → 4 core files ✅
