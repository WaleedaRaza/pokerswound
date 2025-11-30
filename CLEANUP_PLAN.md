# 🧹 CODEBASE CLEANUP PLAN
**Purpose:** Archive/delete unused files before new architecture  
**Goal:** Keep runtime working perfectly, remove dead code

---

## ✅ ACTIVE RUNTIME FILES (KEEP)

### **Backend Entry Point:**
- `sophisticated-engine-server.js` ✅ ACTIVE

### **Routes (JavaScript - ACTIVE):**
- `routes/game-engine-bridge.js` ✅ ACTIVE (2,989 lines - primary game API)
- `routes/rooms.js` ✅ ACTIVE (room management)
- `routes/games.js` ✅ ACTIVE (game endpoints)
- `routes/auth.js` ✅ ACTIVE (authentication)
- `routes/social.js` ✅ ACTIVE (social features)
- `routes/pages.js` ✅ ACTIVE (page serving)
- `routes/v2.js` ✅ ACTIVE (API v2)
- `routes/sandbox.js` ✅ ACTIVE (sandbox mode)

### **Game Logic Adapters (JavaScript - ACTIVE):**
- `src/adapters/minimal-engine-bridge.js` ✅ ACTIVE (orchestrator)
- `src/adapters/game-logic.js` ✅ ACTIVE (game flow)
- `src/adapters/betting-logic.js` ✅ ACTIVE (action validation)
- `src/adapters/pot-logic.js` ✅ ACTIVE (pot calculation)
- `src/adapters/turn-logic.js` ✅ ACTIVE (turn rotation)
- `src/adapters/seat-manager.js` ✅ ACTIVE (seat management)
- `src/adapters/state-machine.js` ✅ ACTIVE (state transitions)
- `src/adapters/rules-ranks.js` ✅ ACTIVE (hand evaluation)
- `src/adapters/simple-hand-evaluator.js` ✅ ACTIVE (hand comparison)

### **Utilities (ACTIVE):**
- `src/utils/action-logger.js` ✅ ACTIVE (logging)
- `src/middleware/idempotency.js` ✅ ACTIVE (idempotency)
- `src/services/timer-service.js` ✅ ACTIVE (timer system)
- `src/db/poker-table-v2.js` ✅ ACTIVE (database helpers)

### **Services (ACTIVE):**
- `services/session-service.js` ✅ ACTIVE (session management)
- `services/player-identity-service.js` ✅ ACTIVE (player IDs)
- `services/game-state-hydrator.js` ⚠️ REDUNDANT (functionality moved to routes)

### **Config & Middleware (ACTIVE):**
- `config/redis.js` ✅ ACTIVE (Redis client)
- `middleware/session.js` ✅ ACTIVE (session middleware)

### **WebSocket (ACTIVE):**
- `websocket/socket-handlers.js` ✅ ACTIVE (Socket.IO handlers)

### **Frontend (ACTIVE):**
- `public/minimal-table.html` ✅ ACTIVE (9,622 lines - main table UI)
- `public/pages/index.html` ✅ ACTIVE (landing page)
- `public/pages/play.html` ✅ ACTIVE (play page)
- `public/pages/friends.html` ✅ ACTIVE (friends page)
- `public/pages/analysis.html` ✅ ACTIVE (analytics page)
- `public/pages/poker-today.html` ✅ ACTIVE
- `public/pages/learning.html` ✅ ACTIVE
- `public/pages/ai-solver.html` ✅ ACTIVE

### **Frontend JS Modules (ACTIVE):**
- `public/js/auth-manager.js` ✅ ACTIVE (authentication)
- `public/js/nav-shared.js` ✅ ACTIVE (navbar)
- `public/js/navbar-template.js` ✅ ACTIVE (navbar template)
- `public/js/social-modals.js` ✅ ACTIVE (social modals)
- `public/js/username-styling.js` ✅ ACTIVE (username colors)
- `public/js/liquid-glass-controller.js` ✅ ACTIVE (liquid glass effects)
- `public/js/global-animations.js` ✅ ACTIVE (falling animations)
- `public/js/hand-encoder.js` ✅ ACTIVE (PHE encoding)
- `public/js/sequence-tracker.js` ✅ ACTIVE (sequence tracking)
- `public/js/analytics-*.js` ✅ ACTIVE (analytics pages)
- `public/js/friends-page.js` ✅ ACTIVE (friends page)
- `public/js/empty-states.js` ✅ ACTIVE (empty states)
- `public/js/loading-states.js` ✅ ACTIVE (loading states)
- `public/js/timer-display.js` ✅ ACTIVE (timer display)

### **Frontend CSS (ACTIVE):**
- `public/css/pokergeek.css` ✅ ACTIVE (main styles)
- `public/css/design-tokens.css` ✅ ACTIVE (design tokens)
- `public/css/index-modern.css` ✅ ACTIVE (landing page)
- `public/css/play-modern.css` ✅ ACTIVE (play page)
- `public/css/friends-modern.css` ✅ ACTIVE (friends page)
- `public/css/analytics-modern.css` ✅ ACTIVE (analytics page)
- `public/css/social-modals.css` ✅ ACTIVE (social modals)
- `public/css/rank-styling.css` ✅ ACTIVE (rank colors)
- `public/css/hand-history.css` ✅ ACTIVE (hand history)
- `public/css/analytics-live.css` ✅ ACTIVE (live analytics)
- `public/css/empty-states.css` ✅ ACTIVE (empty states)
- `public/css/loading-states.css` ✅ ACTIVE (loading states)
- `public/css/timer-display.css` ✅ ACTIVE (timer display)
- `public/css/social-features.css` ✅ ACTIVE (social features)

### **Database (ACTIVE):**
- `database/migrations/*.sql` ✅ ACTIVE (all 44 migrations)

### **Scripts (ACTIVE):**
- `scripts/run-migration.js` ✅ ACTIVE (migration runner)
- `scripts/check-db-state.js` ✅ ACTIVE (DB checker)
- `scripts/check-game-states.js` ✅ ACTIVE (game state checker)

---

## ❌ LEGACY/UNUSED FILES (ARCHIVE/DELETE)

### **TypeScript Source (COMPILED BUT NOT USED BY RUNTIME):**
- `src/**/*.ts` ⚠️ KEEP SOURCE (for compilation) but `dist/` is NOT used by runtime
- `dist/` ❌ ARCHIVE - Compiled TypeScript, but runtime uses JavaScript adapters

**Note:** Server imports from `dist/` but those imports are NOT actually used. Runtime uses `src/adapters/*.js` instead.

### **Legacy HTML Tables (UNUSED):**
- `public/poker-table-zoom-lock.html` ❌ ARCHIVE (legacy)
- `public/poker-table-v2.html` ❌ ARCHIVE (legacy)
- `public/poker-table-v3.html` ❌ ARCHIVE (legacy)
- `public/poker-table-grid.html` ❌ ARCHIVE (legacy)
- `public/poker-table-production.html` ❌ ARCHIVE (legacy)
- `public/poker-table-final.html` ❌ ARCHIVE (legacy)

### **Legacy Frontend JS (UNUSED):**
- `public/js/TableRenderer.js` ❌ ARCHIVE (legacy component)
- `public/js/game-state-client.js` ❌ ARCHIVE (legacy client)
- `public/js/game-state-manager.js` ❌ ARCHIVE (legacy manager)
- `public/js/poker-table-v2.js` ❌ ARCHIVE (legacy table v2)
- `public/js/poker-table-production.js` ❌ ARCHIVE (legacy production)
- `public/js/poker-table-grid.js` ❌ ARCHIVE (legacy grid)
- `public/js/components/*.js` ❌ ARCHIVE (unused components)
- `public/js/action-timer-manager.js` ❌ ARCHIVE (unused)
- `public/js/player-status-manager.js` ❌ ARCHIVE (unused)
- `public/js/seat-positioning-tool.js` ❌ ARCHIVE (unused)
- `public/js/username-helper.js` ❌ ARCHIVE (unused)
- `public/js/username-modal.js` ❌ ARCHIVE (unused)
- `public/js/error-handler.js` ❌ ARCHIVE (unused)

### **Legacy CSS (UNUSED):**
- `public/css/poker-table-grid.css` ❌ ARCHIVE (legacy)
- `public/css/poker-table-production.css` ❌ ARCHIVE (legacy)
- `public/css/poker-table-v2.css` ❌ ARCHIVE (legacy)
- `public/css/poker-table-v3.css` ❌ ARCHIVE (legacy)
- `public/css/style.css` ❌ ARCHIVE (legacy base styles)

### **Old Project Folder:**
- `pokeher/` ❌ ARCHIVE (old project folder)

### **Test Files (KEEP FOR NOW):**
- `tests/` ⚠️ KEEP (testing infrastructure)
- `test-*.js` ⚠️ KEEP (test files)

### **Documentation (ORGANIZE):**
- Root markdown files: KEEP essential, archive rest
- `archive/` ✅ ALREADY ARCHIVED

### **Misc Unused Files:**
- `sophisticated-engine-server.backup.js` ❌ DELETE (backup)
- `fix-domain-events.js` ❌ ARCHIVE (one-off fix)
- `check-schema.js` ❌ ARCHIVE (one-off check)
- `POSITIONING_TOOL.js` ❌ ARCHIVE (one-off tool)
- `fix-avatar-overwrite.sql` ❌ ARCHIVE (one-off SQL)
- `HOTFIX_*.sql` ❌ ARCHIVE (one-off hotfixes)
- `WIPE_LEGACY_DATA.sql` ❌ ARCHIVE (one-off wipe)
- `diagnostic-check.sql` ❌ ARCHIVE (one-off diagnostic)
- `run-*.js` (root level) ❌ ARCHIVE (one-off migration runners)
- `test.env` ❌ DELETE (test file)
- `*.txt` (root level chat/context files) ❌ ARCHIVE
- `*.png` (screenshots) ❌ ARCHIVE
- `*.svg` (chip SVGs - keep if used, archive if not) ⚠️ CHECK

---

## 📋 CLEANUP ACTIONS

### **Phase 1: Archive Legacy Frontend (SAFE)**
```bash
# Create archive directories
mkdir -p archive/legacy-frontend/tables
mkdir -p archive/legacy-frontend/js
mkdir -p archive/legacy-frontend/css

# Move legacy HTML tables
mv public/poker-table-*.html archive/legacy-frontend/tables/

# Move legacy JS
mv public/js/TableRenderer.js archive/legacy-frontend/js/
mv public/js/game-state-*.js archive/legacy-frontend/js/
mv public/js/poker-table-*.js archive/legacy-frontend/js/
mv public/js/components/ archive/legacy-frontend/js/
mv public/js/action-timer-manager.js archive/legacy-frontend/js/
mv public/js/player-status-manager.js archive/legacy-frontend/js/
mv public/js/seat-positioning-tool.js archive/legacy-frontend/js/
mv public/js/username-helper.js archive/legacy-frontend/js/
mv public/js/username-modal.js archive/legacy-frontend/js/
mv public/js/error-handler.js archive/legacy-frontend/js/

# Move legacy CSS
mv public/css/poker-table-*.css archive/legacy-frontend/css/
mv public/css/style.css archive/legacy-frontend/css/
```

### **Phase 2: Archive Dist/ (SAFE - NOT USED BY RUNTIME)**
```bash
# Archive compiled TypeScript (not used by runtime)
mkdir -p archive/dist-legacy
mv dist/ archive/dist-legacy/
```

### **Phase 3: Archive Old Project (SAFE)**
```bash
# Archive old pokeher project
mv pokeher/ archive/old-project/
```

### **Phase 4: Archive One-Off Scripts (SAFE)**
```bash
mkdir -p archive/one-off-scripts
mv fix-domain-events.js archive/one-off-scripts/
mv check-schema.js archive/one-off-scripts/
mv POSITIONING_TOOL.js archive/one-off-scripts/
mv run-*.js archive/one-off-scripts/  # Root level migration runners
mv test-*.js archive/one-off-scripts/  # Root level test files
mv verify-migration.js archive/one-off-scripts/
```

### **Phase 5: Archive One-Off SQL (SAFE)**
```bash
mkdir -p archive/one-off-sql
mv fix-avatar-overwrite.sql archive/one-off-sql/
mv HOTFIX_*.sql archive/one-off-sql/
mv WIPE_LEGACY_DATA.sql archive/one-off-sql/
mv diagnostic-check.sql archive/one-off-sql/
```

### **Phase 6: Archive Documentation & Misc (SAFE)**
```bash
mkdir -p archive/misc
mv chat.txt archive/misc/
mv chat2.txt archive/misc/
mv chatcontext.txt archive/misc/
mv context.txt archive/misc/
mv logs.txt archive/misc/
mv output.txt archive/misc/
mv pokerlogic.txt archive/misc/
mv quotes.txt archive/misc/
mv project-tree.txt archive/misc/
mv Schemasnapshot.txt archive/misc/
mv endpoint-audit.txt archive/misc/
mv CONTRIBUTION_TEST.txt archive/misc/
mv 2025-10-29*.png archive/misc/  # Screenshots
mv test.env archive/misc/
mv sophisticated-engine-server.backup.js archive/misc/
```

### **Phase 7: Archive Redundant Service (SAFE)**
```bash
# game-state-hydrator.js is redundant (functionality moved to routes)
mv services/game-state-hydrator.js archive/unused-adapters/
```

### **Phase 8: Check SVG Usage (VERIFY FIRST)**
```bash
# Check if chip SVGs are used before archiving
# If not used, archive them
mkdir -p archive/assets
# mv *.svg archive/assets/  # Only if not used
```

---

## ⚠️ CRITICAL: DO NOT DELETE

### **Essential Runtime Files:**
- `sophisticated-engine-server.js` ✅ KEEP
- `routes/*.js` ✅ KEEP ALL
- `src/adapters/*.js` ✅ KEEP ALL
- `public/minimal-table.html` ✅ KEEP
- `public/pages/*.html` ✅ KEEP ALL
- `public/js/*.js` ✅ KEEP ACTIVE ONES (see list above)
- `public/css/*.css` ✅ KEEP ACTIVE ONES (see list above)
- `database/migrations/*.sql` ✅ KEEP ALL
- `config/redis.js` ✅ KEEP
- `middleware/session.js` ✅ KEEP
- `services/session-service.js` ✅ KEEP
- `services/player-identity-service.js` ✅ KEEP
- `websocket/socket-handlers.js` ✅ KEEP
- `package.json` ✅ KEEP
- `nodemon.json` ✅ KEEP
- `tsconfig.json` ✅ KEEP (for TypeScript compilation)

### **Essential Documentation:**
- `README.md` ✅ KEEP
- `START_HERE.md` ✅ KEEP
- `MVP_TO_DEPLOYMENT.md` ✅ KEEP
- `SUCCESSION_BRIEF.md` ✅ KEEP
- `TECHNICAL_ARCHITECTURE.md` ✅ KEEP
- `CODEBASE_AUDIT.md` ✅ KEEP
- `CODEBASE_INDEX.md` ✅ KEEP
- `FEATURE_DIRECTORY.md` ✅ KEEP
- `CONSULTANT_COMPLETE_MAP.md` ✅ KEEP
- `COMPLETE_CODEBASE_MAP.md` ✅ KEEP
- `PLAN.md` ✅ KEEP
- `TEST_PLAN.md` ✅ KEEP

---

## 🎯 EXECUTION ORDER

1. **Test current runtime** - Ensure everything works
2. **Phase 1-3** - Archive legacy frontend, dist/, old project (SAFE)
3. **Phase 4-6** - Archive one-off scripts/SQL/docs (SAFE)
4. **Phase 7** - Archive redundant service (SAFE)
5. **Phase 8** - Check SVG usage (VERIFY FIRST)
6. **Test runtime again** - Ensure nothing broke
7. **Update imports** - Remove any broken imports from archived files

---

## 📊 EXPECTED RESULTS

**Before:**
- ~200+ files in root
- Legacy files mixed with active
- Confusing structure

**After:**
- Clean root directory
- Only active runtime files
- Legacy archived safely
- Easy to understand structure

---

**Ready to execute cleanup? Start with Phase 1 (safest).**

