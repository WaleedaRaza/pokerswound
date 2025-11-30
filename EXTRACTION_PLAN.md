# EXTRACTION PLAN: Current State → Production Architecture

**Created:** Current Session  
**Purpose:** Incremental migration from messy codebase to production-ready architecture  
**Strategy:** Build infrastructure first, extract/adapt existing code incrementally

---

## 🎯 OBJECTIVE REALITY CHECK

### What Actually Works Right Now

**Core Game Engine:**
- ✅ Hand dealing (hole cards + community cards)
- ✅ Betting rounds (PREFLOP → FLOP → TURN → RIVER)
- ✅ Action processing (FOLD, CHECK, CALL, RAISE, ALL_IN)
- ✅ Showdown evaluation
- ✅ Side pot calculation
- ✅ Chip persistence to database

**Infrastructure:**
- ✅ PostgreSQL database (Supabase) with proper schema
- ✅ Socket.IO real-time communication
- ✅ Authentication (Google OAuth + Guest)
- ✅ Room creation and seat management
- ✅ Hand history extraction (PHE encoding)

**Frontend:**
- ✅ Table UI renders correctly
- ✅ Card animations (basic)
- ✅ Chip displays
- ✅ Action buttons

### What's Broken/Chaotic

**State Management:**
- ❌ **4 sources of truth** (client state, server memory, DB, Redis)
- ❌ **Multiple event streams** (action_processed, hand_complete, hand_started, phase_update, etc.)
- ❌ **Race conditions** (chip updates from multiple paths)
- ❌ **Phase ambiguity** (client infers phase instead of server declaring)

**Rendering:**
- ❌ **Double renders** (cards dealt multiple times)
- ❌ **Pot display breaks** (DOM structure destroyed by overlays)
- ❌ **Chip animation conflicts** (pot decrements while chips increment separately)
- ❌ **Transition glitches** (hand end → hand start is choppy)

**Code Organization:**
- ❌ **Monolithic files** (game-engine-bridge.js: 2.4K lines, minimal-table.html: 9.6K lines)
- ❌ **Dead code** (dist/, unused adapters, legacy HTML files)
- ❌ **Circular dependencies** (turn-logic ↔ game-logic)
- ❌ **Mixed concerns** (game logic + persistence + socket emissions in same file)

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
│   │   ├── state-machine.ts
│   │   ├── betting-engine.ts
│   │   ├── pot-logic.ts
│   │   └── hand-evaluator.ts
│   ├── rng/                   # Provably fair RNG module
│   │   └── shuffle.ts
│   └── events/                # Event sourcing
│       ├── event-store.ts
│       └── event-types.ts
├── services/
│   ├── game-service/         # HTTP/Socket layer over game engine
│   │   ├── game-handler.ts
│   │   └── socket-broadcaster.ts
│   ├── social-service/        # Friends, profiles, invites
│   ├── analytics-service/     # Consumes event logs, computes metrics
│   └── ai-service/            # LLM insights, hand analysis
├── client/
│   ├── renderer/              # Stateless rendering from state blob
│   ├── transition-controller/ # Hand transitions, animations
│   └── components/            # Reusable UI components
└── infrastructure/
    ├── database/              # Schema, migrations
    ├── redis/                 # Caching, sessions
    └── websocket/             # Socket.IO setup
```

### Key Architectural Changes

**1. Single Event Stream**
- **Current:** 10+ different socket events (action_processed, hand_complete, hand_started, etc.)
- **Target:** ONE event `game_state_update` with explicit phase

**2. State Machine Contract**
- **Current:** Implicit state transitions, client infers phase
- **Target:** Explicit phases (LOBBY, DEALING, PREFLOP, FLOP, TURN, RIVER, SHOWDOWN, PAYOUT, TRANSITION)

**3. Event Sourcing**
- **Current:** State snapshots in JSONB
- **Target:** Event log + state reconstruction

**4. Client Rendering**
- **Current:** Client computes diffs, animates independently
- **Target:** Server sends complete state blob, client renders from scratch

---

## 📋 INCREMENTAL EXTRACTION PLAN

### PHASE 1: Stabilize Base (Week 1)
**Goal:** Get current system working smoothly, archive dead code

#### Step 1.1: Archive Dead Code (Day 1, 2 hours)
**Risk:** Zero (archiving doesn't break runtime)

**Actions:**
- Move `dist/` to `archive/dist-legacy/`
- Move unused adapters to `archive/unused-adapters/`:
  - timer-logic.js
  - post-hand-logic.js
  - misdeal-detector.js
  - game-state-translator.js
  - game-state-schema.js
  - socket-event-builder.js
- Move legacy HTML files to `archive/legacy-frontend/`
- Move legacy JS files to `archive/legacy-frontend/js/`

**Verification:**
- Run `npm start` → Server starts
- Open `http://localhost:3000` → App loads
- Create room → Works
- Deal cards → Works

#### Step 1.2: Fix Critical UX Bugs (Day 2-3, 8 hours)
**Risk:** Low (fixing broken behavior)

**Actions:**
- Create `public/js/transition-controller.js`:
  - Handles hand end → hand start flow
  - Pot as dynamic island (expand/contract)
  - Card animations (fade + flip)
  - Countdown bar
  - Synchronized chip distribution
- Wire into `minimal-table.html`
- Fix pot display DOM preservation
- Fix double chip updates

**Verification:**
- Play 10 hands → No glitches
- Pot displays correctly throughout
- Chips update once per action
- Transitions are smooth

#### Step 1.3: Document Current State Machine (Day 4, 4 hours)
**Risk:** Zero (documentation only)

**Actions:**
- Map all state transitions in `src/adapters/game-logic.js`
- Document phases explicitly
- Create state diagram
- Document socket events and their triggers

**Output:** `docs/current-state-machine.md`

---

### PHASE 2: Build Infrastructure (Week 2-3)
**Goal:** Create new architecture alongside old, don't break existing

#### Step 2.1: Create Core Game Engine Structure (Day 5-6, 12 hours)
**Risk:** Low (new code, doesn't touch existing)

**Actions:**
- Create `core/game-engine/` directory
- Extract pure game logic from `src/adapters/`:
  - `core/game-engine/state-machine.ts` (from game-logic.js)
  - `core/game-engine/betting-engine.ts` (from betting-logic.js)
  - `core/game-engine/pot-logic.ts` (from pot-logic.js)
  - `core/game-engine/hand-evaluator.ts` (from rules-ranks.js)
- Make it deterministic (no side effects, pure functions)
- Add TypeScript types
- Write unit tests

**Verification:**
- Run tests → All pass
- Compare outputs with old adapters → Same results

#### Step 2.2: Create Event Sourcing Infrastructure (Day 7-8, 12 hours)
**Risk:** Low (new code, doesn't touch existing)

**Actions:**
- Create `core/events/` directory
- Define event types:
  - `HandStartedEvent`
  - `ActionProcessedEvent`
  - `StreetRevealedEvent`
  - `HandCompletedEvent`
- Create `event-store.ts` (writes to PostgreSQL)
- Create event replay system

**Verification:**
- Emit events → Stored in DB
- Replay events → Reconstructs state correctly

#### Step 2.3: Create Single Event Emitter (Day 9-10, 12 hours)
**Risk:** Medium (touches socket code)

**Actions:**
- Create `services/game-service/socket-broadcaster.ts`
- Replace all `io.emit()` calls with single `emitGameStateUpdate()`
- Event includes:
  - `phase` (explicit)
  - `gameState` (complete state blob)
  - `timestamp`
- Keep old events for backward compatibility (deprecate)

**Verification:**
- Old clients still work (backward compatible)
- New clients receive single event
- No duplicate events

---

### PHASE 3: Migrate Client (Week 4)
**Goal:** Client renders from single event stream

#### Step 3.1: Create Stateless Renderer (Day 11-12, 12 hours)
**Risk:** Medium (touches frontend)

**Actions:**
- Create `client/renderer/` directory
- Extract rendering logic from `minimal-table.html`:
  - `renderer/table-renderer.ts` (renders seats, cards, pot)
  - `renderer/phase-router.ts` (routes by phase)
- Make it stateless (takes state blob, renders)
- Remove all local state computation

**Verification:**
- Render from state blob → Matches current UI
- No local chip calculations
- No local pot calculations

#### Step 3.2: Wire Single Event Handler (Day 13-14, 12 hours)
**Risk:** Medium (changes socket handling)

**Actions:**
- Replace all `socket.on()` handlers with single handler:
  ```javascript
  socket.on('game_state_update', (payload) => {
    phaseRouter.route(payload.phase, payload.gameState);
  });
  ```
- Remove old event handlers (action_processed, hand_complete, etc.)
- Test thoroughly

**Verification:**
- All phases render correctly
- No missing updates
- No double renders

---

### PHASE 4: Migrate Server (Week 5)
**Goal:** Server uses new game engine, emits single events

#### Step 4.1: Replace Adapter Calls (Day 15-16, 12 hours)
**Risk:** High (touches core game logic)

**Actions:**
- Update `routes/game-engine-bridge.js`:
  - Replace `MinimalBettingAdapter.processAction()` with `GameEngine.processAction()`
  - Replace adapter calls with new engine calls
- Keep old adapters as fallback
- Test extensively

**Verification:**
- Game flow works identically
- No regressions
- Performance same or better

#### Step 4.2: Remove Old Adapters (Day 17, 4 hours)
**Risk:** Low (after verification)

**Actions:**
- Delete old adapters (after confirming new engine works)
- Update imports
- Clean up unused code

---

### PHASE 5: Build Analytics Pipeline (Week 6)
**Goal:** Analytics service consumes event logs

#### Step 5.1: Create Analytics Service (Day 18-19, 12 hours)
**Risk:** Low (new service)

**Actions:**
- Create `services/analytics-service/`
- Consume events from event store
- Compute metrics:
  - VPIP, PFR, aggression factor
  - Positional win rates
  - Hand strength distributions
- Store in analytics tables

**Verification:**
- Metrics match current analytics page
- Queries are fast (<500ms)

#### Step 5.2: Migrate Analytics Page (Day 20, 6 hours)
**Risk:** Low (frontend only)

**Actions:**
- Update analytics page to use analytics service
- Remove client-side metric computation
- Use precomputed metrics

---

### PHASE 6: Polish & Deploy (Week 7)
**Goal:** Production-ready, tested, documented

#### Step 6.1: Testing (Day 21-22, 12 hours)
**Risk:** Low (verification)

**Actions:**
- Multi-browser testing (Chrome, Firefox, Safari)
- Test all game flows
- Test edge cases (all-ins, disconnects, etc.)
- Performance testing

#### Step 6.2: Documentation (Day 23, 6 hours)
**Risk:** Zero

**Actions:**
- Update README
- Document new architecture
- Create migration guide
- Document API changes

#### Step 6.3: Deployment Prep (Day 24, 6 hours)
**Risk:** Low

**Actions:**
- Environment variables checklist
- Database migration scripts
- Deployment checklist
- Rollback plan

---

## 🎯 CRITICAL SUCCESS FACTORS

### Must Preserve
- ✅ Current game logic (it works, just needs cleanup)
- ✅ Database schema (don't break existing data)
- ✅ Authentication flow (users depend on it)
- ✅ Room/seat management (core feature)

### Must Fix
- ❌ Multiple sources of truth → Single state machine
- ❌ Multiple events → Single event stream
- ❌ Client-side computation → Server-side computation
- ❌ Implicit phases → Explicit phases

### Must Build
- 🆕 Event sourcing infrastructure
- 🆕 Analytics pipeline
- 🆕 Stateless client renderer
- 🆕 Service separation

---

## 📊 RISK ASSESSMENT

| Phase | Risk Level | Mitigation |
|-------|-----------|------------|
| Phase 1: Archive | Low | Archive, don't delete. Can restore if needed. |
| Phase 2: Infrastructure | Low | New code, doesn't touch existing. |
| Phase 3: Client Migration | Medium | Keep old handlers until new works. |
| Phase 4: Server Migration | High | Extensive testing, fallback to old adapters. |
| Phase 5: Analytics | Low | New service, doesn't affect game. |
| Phase 6: Polish | Low | Verification and documentation. |

---

## 🚀 IMMEDIATE NEXT STEPS

1. **Review this plan** - Does it match your vision?
2. **Start Phase 1.1** - Archive dead code (safest first step)
3. **Fix critical UX bugs** - Get current system stable
4. **Build infrastructure** - Create new architecture alongside old

---

## 📝 NOTES

- **Incremental:** Each phase builds on previous, doesn't break existing
- **Reversible:** Can rollback at any phase
- **Testable:** Each phase has verification steps
- **Documented:** Architecture decisions documented as we go

**Ready to start Phase 1.1?**

