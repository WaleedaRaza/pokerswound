# CURRENT STATE vs TARGET ARCHITECTURE

**Purpose:** Clear mapping of what exists vs what we're building toward  
**Updated:** Current Session

---

## 🎯 EXECUTIVE SUMMARY

**Current State:** Functional but chaotic - 4 sources of truth, multiple event streams, monolithic files  
**Target State:** Clean architecture - single state machine, event sourcing, stateless client, service separation  
**Gap:** Need to extract working code into proper architecture without breaking what works

---

## 📊 CURRENT STATE ANALYSIS

### What Works (Must Preserve)

**Game Logic:**
- ✅ Hand dealing (hole cards + community cards)
- ✅ Betting rounds (PREFLOP → FLOP → TURN → RIVER)
- ✅ Action processing (FOLD, CHECK, CALL, RAISE, ALL_IN)
- ✅ Showdown evaluation
- ✅ Side pot calculation
- ✅ Chip persistence

**Infrastructure:**
- ✅ PostgreSQL database (Supabase) with 15+ tables
- ✅ Socket.IO real-time communication
- ✅ Authentication (Google OAuth + Guest)
- ✅ Room creation and seat management
- ✅ Hand history extraction (PHE encoding)

**Files to Extract:**
- `src/adapters/game-logic.js` → Core game flow (597 lines)
- `src/adapters/betting-logic.js` → Action validation (348 lines)
- `src/adapters/pot-logic.js` → Pot calculation (228 lines)
- `src/adapters/turn-logic.js` → Turn rotation (481 lines)
- `src/adapters/rules-ranks.js` → Hand evaluation
- `src/adapters/simple-hand-evaluator.js` → Hand comparison
- `public/js/hand-encoder.js` → PHE encoding

### What's Broken (Must Fix)

**State Management:**
- ❌ **4 sources of truth:**
  1. Client-side derived state (action_processed → mutate chips/pot)
  2. Server-side transient state (in-memory Map)
  3. Database state (JSONB snapshots)
  4. UI/hydration recomputation (loadRoom(), renderSeats())

- ❌ **Multiple event streams:**
  - `action_processed`
  - `hand_complete`
  - `hand_started`
  - `hand_complete_lobby`
  - `phase_update`
  - `street_reveal`
  - `showdown_action`
  - `seat_update`
  - `blinds_updated`
  - `player_kicked`
  - `auto_start_failed`

- ❌ **Race conditions:**
  - Chip updates from multiple paths
  - Pot updates conflict with hand completion
  - Double renders during transitions

**Rendering:**
- ❌ **Double dealing:** Cards rendered multiple times
- ❌ **Pot display breaks:** DOM structure destroyed by overlays
- ❌ **Chip animation conflicts:** Pot decrements while chips increment separately
- ❌ **Transition glitches:** Hand end → hand start is choppy

**Code Organization:**
- ❌ **Monolithic files:**
  - `routes/game-engine-bridge.js` (2,989 lines)
  - `public/minimal-table.html` (9,622 lines)

- ❌ **Dead code:**
  - `dist/` (compiled TypeScript, not used)
  - 6 unused adapters (~1.4K lines)
  - Legacy HTML/JS files

- ❌ **Circular dependencies:**
  - `turn-logic.js` ↔ `game-logic.js`

---

## 🏗️ TARGET ARCHITECTURE (From Consultancy.txt)

### Core Principles

1. **Single State Machine** - One authoritative source of truth
2. **Event Sourcing** - All state changes emit events (for analytics)
3. **Stateless Client** - Renders from server state, no local computation
4. **Service Separation** - Game engine, social, analytics, AI/ML are separate
5. **Deterministic** - Same inputs → same outputs (no race conditions)

### Target Structure

```
PokerGeek/
├── core/
│   ├── game-engine/          # Pure deterministic state machine
│   │   ├── state-machine.ts  # Extracted from game-logic.js
│   │   ├── betting-engine.ts # Extracted from betting-logic.js
│   │   ├── pot-logic.ts      # Extracted from pot-logic.js
│   │   └── hand-evaluator.ts # Extracted from rules-ranks.js
│   ├── rng/                   # Provably fair RNG module
│   └── events/                # Event sourcing
│       ├── event-store.ts
│       └── event-types.ts
├── services/
│   ├── game-service/         # HTTP/Socket layer over game engine
│   │   ├── game-handler.ts   # Extracted from game-engine-bridge.js
│   │   └── socket-broadcaster.ts
│   ├── social-service/        # Friends, profiles, invites
│   ├── analytics-service/     # Consumes event logs, computes metrics
│   └── ai-service/            # LLM insights, hand analysis
├── client/
│   ├── renderer/              # Stateless rendering from state blob
│   │   ├── table-renderer.ts  # Extracted from minimal-table.html
│   │   └── phase-router.ts
│   ├── transition-controller/ # Hand transitions, animations
│   └── components/            # Reusable UI components
└── infrastructure/
    ├── database/              # Schema, migrations (keep existing)
    ├── redis/                 # Caching, sessions (keep existing)
    └── websocket/             # Socket.IO setup (keep existing)
```

### Key Architectural Changes

| Current | Target |
|--------|--------|
| 10+ socket events | 1 event: `game_state_update` |
| Implicit phases | Explicit phases (LOBBY, DEALING, PREFLOP, etc.) |
| Client computes diffs | Server sends complete state blob |
| State snapshots (JSONB) | Event log + state reconstruction |
| Mixed concerns | Service separation |
| Monolithic files | Modular structure |

---

## 🔄 MIGRATION STRATEGY

### Principle: Build Infrastructure First, Extract Later

**Why:** Don't break what works. Build new architecture alongside old, then migrate incrementally.

### Phases

1. **Stabilize Base** (Week 1)
   - Archive dead code
   - Fix critical UX bugs
   - Document current state machine

2. **Build Infrastructure** (Week 2-3)
   - Create core game engine structure
   - Create event sourcing infrastructure
   - Create single event emitter

3. **Migrate Client** (Week 4)
   - Create stateless renderer
   - Wire single event handler

4. **Migrate Server** (Week 5)
   - Replace adapter calls with new engine
   - Remove old adapters

5. **Build Analytics Pipeline** (Week 6)
   - Create analytics service
   - Migrate analytics page

6. **Polish & Deploy** (Week 7)
   - Testing
   - Documentation
   - Deployment prep

---

## 📋 EXTRACTION MAPPING

### Game Logic Extraction

| Current File | Target Location | Changes |
|-------------|----------------|---------|
| `src/adapters/game-logic.js` | `core/game-engine/state-machine.ts` | Pure functions, no side effects |
| `src/adapters/betting-logic.js` | `core/game-engine/betting-engine.ts` | Pure functions, no side effects |
| `src/adapters/pot-logic.js` | `core/game-engine/pot-logic.ts` | Pure functions, no side effects |
| `src/adapters/turn-logic.js` | `core/game-engine/turn-logic.ts` | Remove circular dependencies |
| `src/adapters/rules-ranks.js` | `core/game-engine/hand-evaluator.ts` | Pure functions |
| `src/adapters/simple-hand-evaluator.js` | `core/game-engine/hand-comparator.ts` | Pure functions |

### Service Extraction

| Current File | Target Location | Changes |
|-------------|----------------|---------|
| `routes/game-engine-bridge.js` | `services/game-service/game-handler.ts` | Extract HTTP handlers, use new engine |
| `routes/social.js` | `services/social-service/` | Keep as-is, organize better |
| `routes/auth.js` | `services/auth-service/` | Keep as-is, organize better |
| Hand history extraction | `services/analytics-service/` | Consume events, not state snapshots |

### Client Extraction

| Current File | Target Location | Changes |
|-------------|----------------|---------|
| `public/minimal-table.html` (rendering) | `client/renderer/table-renderer.ts` | Stateless, renders from state blob |
| `public/minimal-table.html` (transitions) | `client/transition-controller/` | Extract transition logic |
| `public/minimal-table.html` (socket handlers) | `client/renderer/phase-router.ts` | Single handler, routes by phase |

---

## 🎯 SUCCESS CRITERIA

### Must Achieve

- ✅ Single source of truth (state machine)
- ✅ Single event stream (`game_state_update`)
- ✅ No race conditions
- ✅ No double renders
- ✅ Smooth transitions
- ✅ Fast analytics (<500ms queries)
- ✅ Clean codebase (no monoliths >2K lines)

### Must Preserve

- ✅ Current game logic (it works)
- ✅ Database schema (don't break data)
- ✅ Authentication flow
- ✅ Room/seat management

---

## 🚨 RISK MITIGATION

### High-Risk Areas

1. **Server Migration (Phase 4)**
   - **Risk:** Breaking game logic
   - **Mitigation:** Extensive testing, keep old adapters as fallback

2. **Client Migration (Phase 3)**
   - **Risk:** Breaking UI
   - **Mitigation:** Keep old handlers until new works, test thoroughly

### Low-Risk Areas

1. **Archive Dead Code (Phase 1.1)**
   - **Risk:** Zero (doesn't touch runtime)

2. **Build Infrastructure (Phase 2)**
   - **Risk:** Low (new code, doesn't touch existing)

---

## 📝 NEXT STEPS

1. **Review this document** - Does it match your understanding?
2. **Start Phase 1.1** - Archive dead code (safest first step)
3. **Fix critical UX bugs** - Get current system stable
4. **Build infrastructure** - Create new architecture alongside old

**See `EXTRACTION_PLAN.md` for detailed step-by-step instructions.**

