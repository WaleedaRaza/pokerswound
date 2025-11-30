## Codebase Audit – Baseline (Session 2025-11-15)

Purpose: capture the real layout of the runtime, highlight legacy trees, and call out candidates for modularization or removal. This will be the working document as we refactor.

---

### 1. Runtime Entry Points
| Layer | File | Notes |
| --- | --- | --- |
| Server bootstrap | `sophisticated-engine-server.js` (1,081 lines) | Mounts Express, Socket.IO, session middleware, and all routes. |
| Routes (HTTP) | `routes/` (8 files) | `game-engine-bridge.js` (≈2.4K lines, monolith), `rooms.js` (1,072), `games.js` (630), `auth.js`, `social.js`, `v2.js`, `pages.js`, `hand-history.js?` (verify). |
| Socket handlers | `websocket/socket-handlers.js` (≤200) | Joins/leaves rooms, authentication heartbeats. |
| Engine / adapters | `src/adapters/*.js` | `minimal-engine-bridge.js` delegates to `game-logic.js`, `betting-logic.js`, `pot-logic.js`, `turn-logic.js`, `rules-ranks.js`, `simple-hand-evaluator.js`. Need dependency map to delete unused adapters. |
| Frontend runtime | `public/minimal-table.html` (~9.6K lines) | Contains HTML, CSS, JS for the table. Also loads `public/js/auth-manager.js`, `social-modals.js`, etc. |

---

### 2. Legacy / Parallel Trees (not referenced by current runtime)
| Directory | Status | Notes |
| --- | --- | --- |
| `dist/` | Legacy build | Complete compiled JS mirror of routes/services; not used by current server (server imports from `/routes`). Candidate for archive/delete. |
| `pokeher/` | Historical project | Contains old TS/MD files. Verify nothing imports from here (likely safe to archive). |
| `archive/` | Docs/history | Already treated as historical reference. |
| `sophisticated-engine-server.backup.js` | Backup entry | Check if anyone runs it; otherwise remove. |
| `src/core/engine/*` (TypeScript) | Alternate engine | No evidence the runtime imports these; all HTTP routes pull from `src/adapters`. If unused, move to archive or document future plan. |

Action: confirm via `rg "require\('.*core/engine"` whether anything references the TS engine. None seen so far.

---

### 3. Backend Hotspots (need modularization)
1. **`routes/game-engine-bridge.js`**
   - Responsibilities: hydration, seat management, deal-cards, `/action`, auto-start timers, `/next-hand`, chip persistence, extraction, host controls.
   - Debt: >2K lines, direct DB queries everywhere, custom logging.
   - Plan: extract into service modules:
     - `phase-broadcaster.js` (already started with `emitPhaseUpdate`)
     - `hand-completion-service.js`
     - `next-hand-service.js`
     - `auto-start-scheduler.js`
     - `hydrate-service.js`

2. **`src/adapters/minimal-engine-bridge.js`** stack
   - `game-logic.js`, `betting-logic.js`, `pot-logic.js`, `turn-logic.js`, etc.
   - Need inventory to remove unused helpers (`state-machine.js`, `timer-logic.js`, `socket-event-builder.js`, `post-hand-logic.js`, `misdeal-detector.js`).

3. **Logging**
   - Several files still use `console.log` directly. Must migrate to `logActionSummary`/`logActionDetail` helper once the transition controller work begins.

---

### 4. Frontend Hotspots
1. **`public/minimal-table.html`**
   - 9,622 lines of interleaved HTML/CSS/JS.
   - Inline script handles:
     - Socket setup
     - Hydration
     - Rendering (pot, seats, cards)
     - Action handlers
     - Modals/settings
   - Plan:
     - Move JS into `public/js/` modules (`socket-controller.js`, `transition-controller.js`, `renderers/*`).
     - Keep HTML purely structural, load modules via `<script type="module">`.

2. **`public/js` directory**
   - Contains `game-state-client.js`, `TableRenderer.js`, `poker-table-v2.js`, etc. Need to confirm which ones are referenced by the minimal table vs. other pages (analysis, friends, etc.).

3. **Other pages**
   - `public/pages/analysis.html`, `friends.html`, etc. Some scripts might be unused due to navigation changes.

---

### 5. Quick Dependency Notes
- `routes/game-engine-bridge.js` requires:
  - `src/adapters/minimal-engine-bridge.js` (live)
  - `src/adapters/simple-hand-evaluator.js` (hand comparison)
  - `../database/index` (DB pool)
  - `../services/triggers`? (verify)
- `sophisticated-engine-server.js` mounts `routes/games.js`, but UI does not call it (per CODEBASE_INDEX). Confirm before removing.
- `public/js/auth-manager.js` is referenced by `minimal-table`; any cleanup there must preserve login state.

Action: run `node -p "require.resolve('...')"` for critical modules to confirm path accuracy when refactoring.

---

### 6. Candidate Deletions / Archives
| Item | Reason | Next Action |
| --- | --- | --- |
| `dist/` tree | Legacy compiled output | Verify no deployment script uses it; if not, move to `archive/` or delete. |
| `pokeher/` | Historic project | Confirm no current imports; archive. |
| `src/core/engine/*` | Unused TS engine | Decide whether to archive or document as future path. |
| Unreferenced adapters (state-machine, timer-logic, post-hand-logic, misdeal-detector, socket-event-builder) | Probably dead code | Confirm via `rg "require('./state-machine'` etc. If unused, delete or park in archive. |
| `routes/games.js` | Marked “inactive” in docs | Double-check if frontend ever hits `/api/games/*`. If not, consider removal after verifying no admin tools depend on it. |

---

### 7. Immediate Next Steps
1. **Complete dependency map:**
   - Script or manual table listing every `require`/`import` from runtime modules to confirm usage.
2. **Backend extraction:**
   - Create `/routes/game-engine/` (or `/services/game/`) and move chunks out of the bridge file.
3. **Frontend controller scaffolding:**
   - Start with `public/js/socket-controller.js` and `public/js/transition-controller.js`.
4. **Legacy cleanup:**
   - After dependency confirmation, move/delete `dist/`, `pokeher/`, and unused adapters.

This document will be updated as each section is audited or refactored.

---

### 8. Dependency Map (Initial Pass)

#### 8.1 Backend Module Dependencies
| Module | Direct `require()` calls | Notes |
| --- | --- | --- |
| `routes/game-engine-bridge.js` | `express`, `../src/utils/action-logger`, `../src/adapters/minimal-engine-bridge`, `axios`, `../src/adapters/pot-logic`, `../public/js/hand-encoder.js` | Primary route file; only adapter imports are `minimal-engine-bridge` and direct `pot-logic` (for persistence/extraction). |
| `src/adapters/minimal-engine-bridge.js` | `./game-logic`, `./pot-logic`, `./turn-logic`, `./betting-logic`, `./rules-ranks` | Thin adapter around the orchestrator/logic modules. |
| `src/adapters/game-logic.js` | `./betting-logic`, `./pot-logic`, `./turn-logic`, `./rules-ranks`, `./simple-hand-evaluator`, `../utils/action-logger`, `./state-machine` (multiple dynamic requires) | Uses `state-machine`, `turn-logic`, `pot-logic` multiple times; confirms these modules are still live. |
| `src/adapters/turn-logic.js` | `./seat-manager`, `./state-machine`, `./game-logic`, `./pot-logic` | Shows `seat-manager` and `state-machine` are active dependencies. |
| `src/adapters/betting-logic.js` | *(none)* | Self-contained; exports validation/apply helpers. |
| `src/adapters/pot-logic.js` | *(none)* | Self-contained pot calculations. |
| `src/adapters/simple-hand-evaluator.js` | (refs only standard libs) | Used by `game-logic` for rank comparisons. |

**Implication:** `seat-manager.js`, `state-machine.js`, `simple-hand-evaluator.js` are still used despite being suspected "legacy"; cannot delete without replacement.

**CONFIRMED UNUSED ADAPTERS (zero imports found):**
- `timer-logic.js` (178 lines) - Exports timer functions, never imported
- `post-hand-logic.js` (216 lines) - Created for roadmap, never integrated
- `misdeal-detector.js` (272 lines) - Validation module, never used
- `game-state-translator.js` (244 lines) - Translation layer, never imported
- `game-state-schema.js` (274 lines) - Schema validation, never used
- `socket-event-builder.js` (245 lines) - Event builder, never imported

**Action:** Move these 6 files to `archive/unused-adapters/` or delete after confirming no future plans.

#### 8.2 Frontend Script Dependencies

**Active Scripts (loaded by `minimal-table.html`):**
1. `/js/liquid-glass-controller.js` ✅
2. `/js/global-animations.js` ✅
3. `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` ✅
4. `/js/auth-manager.js` ✅
5. `/js/nav-shared.js` ✅
6. `/js/navbar-template.js` ✅
7. `/js/social-modals.js` ✅
8. `/js/username-styling.js` ✅
9. `/socket.io/socket.io.js` ✅

**Legacy/Unused Frontend JS (only referenced by legacy HTML files):**
- `game-state-client.js` - Only used by `poker-table-v2.html`, `poker-table-v3.html` (legacy)
- `TableRenderer.js` - Only used by legacy table HTML files
- `poker-table-v2.js` - Only used by `poker-table-v2.html`, `poker-table-v3.html` (legacy)
- `poker-table-production.js` - Only used by `poker-table-final.html` (legacy)
- `poker-table-grid.js` - No references found
- `game-state-manager.js` - Marked "unused" in docs, verify

**Action:** Archive legacy table HTML files and their associated JS to `archive/legacy-tables/` if not needed for reference.

#### 8.3 Dead Code Patterns

**Console.log Usage:**
- Multiple files still use `console.log`/`console.warn` directly instead of `action-logger`
- Files: `verify-migration.js`, `websocket/socket-handlers.js`, `test-*.js`, `dist/*` (legacy), and likely some adapters

**TODO/FIXME Comments:**
- `routes/game-engine-bridge.js`: 1 TODO (line 2599: `pendingRequests: [] // TODO: Sprint 1.3`)
- `public/minimal-table.html`: 2 TODOs (lines 7839, 8565, 8618) - timer/pause logic

**Mid-Migration Signals:**
- `routes/games.js` (630 lines) - **Used by legacy HTML files only** (`play.html`, `poker-table-zoom-lock.html`, `poker-table-v2.js`). NOT used by active `minimal-table.html`. Safe to archive if legacy tables are removed.
- `dist/` directory - Compiled output not used by runtime; likely from old build system
- Commented-out code blocks in `minimal-table.html` (e.g., chip SVGs, popup functions)

---

### 9. Confirmed Unused Modules (Ready for Removal)

| Module | Lines | Status | Action |
| --- | --- | --- | --- |
| `src/adapters/timer-logic.js` | 178 | ✅ Confirmed unused | Archive or delete |
| `src/adapters/post-hand-logic.js` | 216 | ✅ Confirmed unused | Archive or delete |
| `src/adapters/misdeal-detector.js` | 272 | ✅ Confirmed unused | Archive or delete |
| `src/adapters/game-state-translator.js` | 244 | ✅ Confirmed unused | Archive or delete |
| `src/adapters/game-state-schema.js` | 274 | ✅ Confirmed unused | Archive or delete |
| `src/adapters/socket-event-builder.js` | 245 | ✅ Confirmed unused | Archive or delete |
| **Total** | **1,429 lines** | | **~1.4K lines of dead code** |

---

### 10. Golden Path Runtime (What Actually Runs)

**Backend:**
1. `sophisticated-engine-server.js` → mounts routes
2. `routes/game-engine-bridge.js` → main game logic endpoint
3. `routes/rooms.js` → room management
4. `src/adapters/minimal-engine-bridge.js` → orchestrates game logic
5. `src/adapters/game-logic.js` → core game flow
6. `src/adapters/{betting,pot,turn,seat-manager,state-machine,simple-hand-evaluator,rules-ranks}.js` → supporting modules

**Frontend:**
1. `public/minimal-table.html` → single-page app (9,622 lines)
2. Loads 9 external scripts (auth, nav, animations, etc.)
3. Inline JS handles all game state, socket events, rendering

**Database:**
- `database/index.js` → PostgreSQL pool
- Tables: `rooms`, `room_seats`, `game_states`, `hand_history`, `player_statistics`, `user_profiles`, etc.

**WebSocket:**
- `websocket/socket-handlers.js` → join/leave rooms, auth heartbeats
- Socket.IO events: `action_processed`, `hand_complete`, `hand_started`, `phase_update`, etc.

---

### 11. Next Actions (Prioritized)

**📋 See `PRODUCTION_PATH.md` for the complete strategic order and rationale.**

**Quick Summary:**
1. ✅ **Archive unused adapters** (6 files, ~1.4K lines) → `archive/unused-adapters/` - **QUICK WIN, DO FIRST**
2. 🔨 **Fix transition controller UX** (2-3 hours) → **CRITICAL, BLOCKS PRODUCTION** - Extract `transition-controller.js`, wire into `minimal-table.html`
3. 🔨 **Polish chip distribution** (30 min) → Verify single-pass animations work
4. 🔨 **Card deal animations** (1 hour) → Smooth fade/flip transitions
5. ⏸️ **Test thoroughly** → Ensure UX is production-ready
6. 🔨 **Extract phase-broadcaster** (30 min) → Incremental backend modularization
7. 🔨 **Extract other services incrementally** → As needed, after UX works

**Key Principle:** Fix what's broken first, then extract what works. Don't refactor broken code.

**Full details:** See `PRODUCTION_PATH.md` for decision matrix, risk assessment, and step-by-step plan.


