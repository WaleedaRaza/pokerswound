# PokerGeek - Multiplayer Poker Platform

**Status:** 80% technically complete, 40% experientially complete  
**Goal:** Production-ready MVP in 8-10 days

---

## 🚀 Quick Start for Next LLM

**Read this first:** [`START_HERE.md`](START_HERE.md)

Then follow the 8-10 day plan in [`MVP_TO_DEPLOYMENT.md`](MVP_TO_DEPLOYMENT.md)

---

## 📋 Essential Documentation

| Doc | Purpose | When to Read |
|-----|---------|--------------|
| **START_HERE.md** | Onboarding guide | First thing |
| **MVP_TO_DEPLOYMENT.md** | Complete 8-10 day plan | For full context |
| **SUCCESSION_BRIEF.md** | Quick reference guide | Daily |
| **TECHNICAL_ARCHITECTURE.md** | System documentation | For lookups |
| **CODEBASE_AUDIT.md** | Cleanup guide | When refactoring |
| **PLAN.md** | Task tracker | Update as you work |

---

## 🎯 Current Sprint: Day 1

**Task:** Fix Transition UX  
**Time:** 4-6 hours  
**Goal:** Smooth hand transitions, no glitches

**Files to create/modify:**
- `public/js/transition-controller.js` (NEW)
- `public/minimal-table.html` (wire it in)

See `MVP_TO_DEPLOYMENT.md` for details.

---

## 🏗️ Tech Stack

- **Backend:** Node.js, Express, PostgreSQL, Socket.IO
- **Frontend:** Vanilla JS, HTML, CSS
- **Auth:** Supabase
- **Hosting:** TBD (ready for deployment)

---

## 🧪 Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run migrations (in Supabase SQL editor)
# See database/migrations/

# Start server
npm start

# Open browser
# http://localhost:3000
```

---

## 📊 Project Status

### ✅ Complete
- Core game flow (deal, bet, showdown)
- Room creation, joining, seat claiming
- Authentication (Google + Guest)
- Database persistence
- WebSocket real-time updates
- PHE encoding (hand-encoder.js)
- Analytics page
- Two-tier logging

### 🔨 In Progress (Day 1)
- Transition UX (hand end → hand start)
- Pot/chip animations
- Card dealing animations

### ⏳ Queued (Days 2-10)
- Data river hardening
- Friend system verification
- Karate belt system
- Badges system
- Code cleanup & modularization
- Testing & polish

---

## 🎮 Features

### Gameplay
- Texas Hold'em (No-Limit)
- 2-10 players
- Real-time multiplayer
- Auto-start between hands
- All-in scenarios with side pots
- Chip conservation guaranteed

### Social
- Friend system (partial)
- Game invites (planned)
- Karate belt ranks (planned)
- Achievement badges (planned)

### Analytics
- Hand history tracking
- PHE encoding (80-90% storage reduction)
- Player statistics
- Hand replay (planned)

---

## 📁 Project Structure

```
PokerGeek/
├── sophisticated-engine-server.js    # Entry point
├── routes/                            # HTTP endpoints
│   ├── game-engine-bridge.js         # Main game logic (2.4K lines)
│   ├── rooms.js                      # Room management
│   ├── social.js                     # Friends, profile
│   └── ...
├── src/
│   ├── adapters/                     # Game engine modules
│   │   ├── minimal-engine-bridge.js  # Orchestrator
│   │   ├── game-logic.js             # Core game flow
│   │   ├── pot-logic.js              # Pot calculations
│   │   ├── betting-logic.js          # Betting validation
│   │   └── ...
│   └── utils/
│       └── action-logger.js          # Two-tier logging
├── public/
│   ├── minimal-table.html            # Main table UI (9.6K lines)
│   ├── js/
│   │   ├── hand-encoder.js           # PHE encoding
│   │   ├── auth-manager.js           # Authentication
│   │   └── ...
│   └── pages/
│       ├── analysis.html             # Analytics page
│       ├── friends.html              # Friends page
│       └── ...
├── database/
│   └── migrations/                   # SQL migrations
└── archive/                          # Historical docs
```

---

## 🚨 Critical Invariants

1. **Server is source of truth** - Clients hydrate before rendering
2. **One-writer model** - HTTP mutates, WebSocket broadcasts
3. **Game phase monotonic** - Never regress phases
4. **Seat/user constraint** - 1 seat per user, 1 user per seat
5. **Chip conservation** - `Σ(player_chips) + Σ(pots) = starting_total`

---

## 🧪 Testing

```bash
# Multi-browser test (3 windows)
# Host + 2 players, blinds 10/20

# Test scenarios:
# - Normal hand
# - All-in runout
# - Side pots
# - Manual/auto start
# - Friend requests
# - Badge awards
```

See `TEST_PLAN.md` for full test suite.

---

## 📝 Contributing

This is a solo project sprint to MVP. After deployment, contributions welcome.

---

## 📄 License

Proprietary - All rights reserved

---

## 🎯 Next Step

**Read [`START_HERE.md`](START_HERE.md) and begin Day 1: Fix Transition UX**
