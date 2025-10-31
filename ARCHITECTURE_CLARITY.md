# 🏗️ ARCHITECTURE CLARITY - HOST CONTROLS VS ROOM MANAGEMENT

## 🎯 CRITICAL DISTINCTION

### 1️⃣ **HOST CONTROLS** (Sprint 1.2-1.4) 🎮
**Location:** IN-GAME / LOBBY (`/minimal-table.html`)
**Purpose:** Control the active game session
**Visibility:** Host only, while in a room

**Features:**
- ✅ Kick seated players (during lobby or game)
- ✅ Pause/resume game
- ✅ Update blinds (lobby only)
- ✅ Approve join requests (during active game)
- ✅ View current players & their chips
- ✅ Emergency controls (restart hand, etc)

**UI Location:**
```
┌─────────────────────────────────────┐
│   POKER TABLE (minimal-table.html)  │
├─────────────────────────────────────┤
│                                     │
│   [Room Code: ABC123]               │
│   [🎛️ HOST CONTROLS] ← Collapsible │
│                                     │
│   • Current Players (2/9)           │
│   • Kick Player                     │
│   • Update Blinds                   │
│   • Pause Game                      │
│                                     │
│   [START HAND] [SETTINGS]           │
│                                     │
│   🃏 Community Cards                │
│   ...                               │
└─────────────────────────────────────┘
```

---

### 2️⃣ **ROOM MANAGEMENT** (Future Feature) 📂
**Location:** SANDBOX TAB (`/sandbox.html` or new page)
**Purpose:** Manage ALL your created rooms
**Visibility:** Any user who created rooms

**Features:**
- View all rooms you've created
- Delete old/unused rooms
- Rejoin active rooms
- See room history
- Prevent spam (limit rooms per user)
- Archive completed games

**UI Location:**
```
┌─────────────────────────────────────┐
│   SANDBOX / MY ROOMS                │
├─────────────────────────────────────┤
│                                     │
│   📂 Your Rooms (3/10 max)         │
│                                     │
│   ┌─────────────────────────────┐  │
│   │ Room ABC123 - ACTIVE        │  │
│   │ 2 players • Started 5m ago  │  │
│   │ [REJOIN] [DELETE]           │  │
│   └─────────────────────────────┘  │
│                                     │
│   ┌─────────────────────────────┐  │
│   │ Room XYZ789 - WAITING       │  │
│   │ 0 players • Created 2h ago  │  │
│   │ [REJOIN] [DELETE]           │  │
│   └─────────────────────────────┘  │
│                                     │
│   [+ CREATE NEW ROOM]               │
│                                     │
└─────────────────────────────────────┘
```

---

## 📋 IMPLEMENTATION ORDER

### ✅ PHASE 1 (DONE)
- Player nicknames

### 🔥 PHASE 2 (NOW - Sprint 1.2-1.4)
Focus on **HOST CONTROLS** in-game:

**Sprint 1.2:** Build Host Controls Panel (UI)
- Collapsible panel above table
- Show current players
- Blinds controls
- Pause button

**Sprint 1.3:** Join Queue System
- Block seat claims during active hand
- Show "Waiting to join" state
- Auto-seat when hand ends

**Sprint 1.4:** Kick Player
- Host can remove players
- Player immediately removed from seat
- Chips returned (if in lobby)
- Block mid-hand kicks

### 🚀 PHASE 3 (LATER)
- Room Management on Sandbox tab
- Admin controls
- Provably fair shuffling
- Full table UI

---

## 🎯 CURRENT FOCUS: SPRINT 1.2

**Goal:** Add a collapsible host controls panel to `minimal-table.html` that allows:
1. View all seated players with nicknames
2. Kick players (with confirmation)
3. Update small/big blind amounts (lobby only)
4. Pause/resume game (host only)

**Implementation:**
1. Update `minimal-table.html` with host controls UI
2. Create `/api/host-controls/*` endpoints in `game-engine-bridge.js`
3. Add WebSocket broadcasts for host actions
4. Test with 2-3 players

**DO NOT:**
- Build sandbox room management (that's later)
- Create new pages/tabs
- Over-engineer

**DO:**
- Keep it simple and in-game
- Make it host-only
- Test thoroughly before moving on

