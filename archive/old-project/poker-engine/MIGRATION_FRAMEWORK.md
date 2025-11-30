# 🤖 AI-Assisted Migration Framework
**Purpose:** Foolproof instructions for AI assistants to execute migration tasks  
**Created:** October 21, 2025  
**Target:** Cursor AI, GitHub Copilot, ChatGPT, Claude

---

## 🎯 Core Principle: Predictable, Reversible, Testable

Every task follows this pattern:
```
1. CONTEXT: What exists now, what we're changing, why
2. CONSTRAINTS: What NOT to touch, what to preserve
3. INSTRUCTIONS: Step-by-step with exact file paths and line numbers
4. VALIDATION: How to verify it worked
5. ROLLBACK: How to undo if it breaks
```

---

## 📋 Task Taxonomy

### Task Levels
- **L1 - Single Function**: Modify one function in one file
- **L2 - Single File**: Modify multiple functions in one file
- **L3 - Multi-File**: Changes across 2-5 files
- **L4 - Subsystem**: Changes across a logical boundary (e.g., "auth layer")
- **L5 - Architecture**: Fundamental structural changes

### Task States
- `READY` - Can be executed now
- `BLOCKED` - Waiting for dependency
- `IN_PROGRESS` - Currently being worked on
- `TESTING` - Implementation done, needs validation
- `COMPLETE` - Validated and merged
- `FAILED` - Attempted but needs revision

---

## 🎯 Phase 1: Database Persistence Migration

### Task 1.1: Initialize Repository Infrastructure
**Level:** L3 (Multi-File)  
**Status:** READY  
**Dependencies:** None  
**Estimated Time:** 30 minutes

#### CONTEXT
```yaml
Current State:
  - Game state stored in JavaScript Map (line 84 in sophisticated-engine-server.js)
  - TypeScript GamesRepository exists in dist/services/database/repos/games.repo.js
  - Repository has methods: findById(), create(), updateGameStateAtomic()
  
Goal:
  - Add repository as alternative storage mechanism
  - Keep Map active as fallback during migration
  - Use feature flag to toggle between old and new

Why This Matters:
  - Cannot scale horizontally with in-memory state
  - Server restart loses all active games
  - Need database-backed persistence for production
```

#### CONSTRAINTS (DO NOT)
```yaml
❌ DO NOT remove the games Map yet (needed for rollback)
❌ DO NOT modify any endpoint logic yet (only infrastructure)
❌ DO NOT change any function signatures
❌ DO NOT modify any frontend code
❌ DO NOT alter any TypeScript source files in src/
❌ DO NOT change database schema
```

#### INSTRUCTIONS

**Step 1: Add feature flag system**

File: `sophisticated-engine-server.js`  
Location: After line 84 (where `const games = new Map()` exists)

Insert this code:
```javascript
// ============================================
// MIGRATION INFRASTRUCTURE - Added Oct 21, 2025
// Feature flags to toggle between old and new implementations
// ============================================

const MIGRATION_FLAGS = {
  // Database persistence (Phase 1)
  USE_DB_REPOSITORY: process.env.USE_DB_REPOSITORY === 'true',
  
  // Future flags (Phase 2+)
  USE_INPUT_VALIDATION: false,
  USE_AUTH_MIDDLEWARE: false,
  USE_EVENT_PERSISTENCE: false,
  
  // Debug mode
  LOG_MIGRATION_DECISIONS: process.env.NODE_ENV === 'development'
};

/**
 * Migration helper: Log which code path is being used
 * @param {string} operation - Name of the operation (e.g., "GET /api/games/:id")
 * @param {string} implementation - 'OLD' or 'NEW'
 * @param {object} metadata - Additional context
 */
function logMigration(operation, implementation, metadata = {}) {
  if (MIGRATION_FLAGS.LOG_MIGRATION_DECISIONS) {
    console.log(`🔄 [MIGRATION] ${operation} → ${implementation}`, metadata);
  }
}

// ============================================
// DUAL STORAGE INITIALIZATION
// Both old (Map) and new (Repository) exist during migration
// ============================================

// OLD: In-memory storage (existing code, unchanged)
const games = new Map();

// NEW: Database-backed storage (conditional initialization)
let gamesRepository = null;

if (MIGRATION_FLAGS.USE_DB_REPOSITORY) {
  try {
    const { GamesRepository } = require('./dist/services/database/repos/games.repo');
    const db = getDb(); // Use existing database connection
    
    if (!db) {
      console.warn('⚠️  Database not available, falling back to in-memory storage');
      MIGRATION_FLAGS.USE_DB_REPOSITORY = false;
    } else {
      gamesRepository = new GamesRepository(db);
      console.log('✅ GamesRepository initialized (NEW storage active)');
    }
  } catch (error) {
    console.error('❌ Failed to initialize GamesRepository:', error.message);
    console.warn('⚠️  Falling back to in-memory storage');
    MIGRATION_FLAGS.USE_DB_REPOSITORY = false;
  }
} else {
  console.log('📦 Using in-memory Map storage (OLD implementation)');
}

// Export for use in endpoints
module.exports.MIGRATION_FLAGS = MIGRATION_FLAGS;
module.exports.logMigration = logMigration;
module.exports.gamesRepository = gamesRepository;
```

**Step 2: Create storage adapter (abstraction layer)**

File: `sophisticated-engine-server.js`  
Location: After the code from Step 1

Insert this code:
```javascript
// ============================================
// STORAGE ADAPTER
// Unified interface that routes to old or new storage
// ============================================

const StorageAdapter = {
  /**
   * Get game state by ID
   * Routes to Map or Repository based on feature flag
   */
  async getGame(gameId) {
    if (MIGRATION_FLAGS.USE_DB_REPOSITORY) {
      logMigration('getGame', 'NEW', { gameId });
      return await gamesRepository.findById(gameId);
    } else {
      logMigration('getGame', 'OLD', { gameId });
      return games.get(gameId);
    }
  },
  
  /**
   * Save/update game state
   */
  async saveGame(gameId, gameState) {
    if (MIGRATION_FLAGS.USE_DB_REPOSITORY) {
      logMigration('saveGame', 'NEW', { gameId });
      await gamesRepository.updateGameStateAtomic(gameId, gameState.version, {
        status: gameState.status,
        current_state: gameState.toSnapshot(),
        hand_number: gameState.handState.handNumber,
        dealer_position: gameState.handState.dealerPosition,
        total_pot: gameState.pot.totalPot
      });
      return true;
    } else {
      logMigration('saveGame', 'OLD', { gameId });
      games.set(gameId, gameState);
      return true;
    }
  },
  
  /**
   * Delete game
   */
  async deleteGame(gameId) {
    if (MIGRATION_FLAGS.USE_DB_REPOSITORY) {
      logMigration('deleteGame', 'NEW', { gameId });
      // TODO: Implement soft delete in repository
      return true;
    } else {
      logMigration('deleteGame', 'OLD', { gameId });
      return games.delete(gameId);
    }
  },
  
  /**
   * List all games (for debugging)
   */
  async listGames() {
    if (MIGRATION_FLAGS.USE_DB_REPOSITORY) {
      logMigration('listGames', 'NEW');
      // TODO: Implement in repository
      return [];
    } else {
      logMigration('listGames', 'OLD');
      return Array.from(games.keys());
    }
  }
};

// Export adapter
module.exports.StorageAdapter = StorageAdapter;
```

**Step 3: Update .env.example**

File: `.env.example` or `env.example`  
Add this line:
```bash
# Migration Flags
USE_DB_REPOSITORY=false  # Set to 'true' to use database persistence
```

#### VALIDATION

Run these tests to verify the infrastructure works:

```bash
# Test 1: Server starts with OLD implementation (default)
node sophisticated-engine-server.js

# Expected output should include:
# "📦 Using in-memory Map storage (OLD implementation)"

# Test 2: Server starts with NEW implementation
USE_DB_REPOSITORY=true node sophisticated-engine-server.js

# Expected output should include:
# "✅ GamesRepository initialized (NEW storage active)"
# OR
# "⚠️  Database not available, falling back to in-memory storage"

# Test 3: StorageAdapter routes correctly
# In Node REPL:
node
> const { StorageAdapter, MIGRATION_FLAGS } = require('./sophisticated-engine-server.js')
> console.log(MIGRATION_FLAGS)
> // Should show USE_DB_REPOSITORY: false or true
```

#### ROLLBACK

If something breaks:

```bash
# Option 1: Disable via environment variable
USE_DB_REPOSITORY=false node sophisticated-engine-server.js

# Option 2: Comment out the entire section
# In sophisticated-engine-server.js, comment lines added in Steps 1-2:
# (Use /* */ around the code blocks)

# Option 3: Git revert
git diff sophisticated-engine-server.js  # Review changes
git checkout sophisticated-engine-server.js  # Discard changes
```

#### SUCCESS CRITERIA

- [ ] Server starts without errors (both with flag ON and OFF)
- [ ] `MIGRATION_FLAGS` object is accessible
- [ ] `StorageAdapter.getGame()` can be called without crashing
- [ ] Logs show which implementation is being used
- [ ] Existing game functionality still works (no regressions)

---

### Task 1.2: Migrate GET /api/games/:id Endpoint
**Level:** L2 (Single File)  
**Status:** BLOCKED (requires Task 1.1)  
**Dependencies:** Task 1.1 complete  
**Estimated Time:** 20 minutes

#### CONTEXT
```yaml
Current State:
  - GET /api/games/:id endpoint returns game state from Map
  - Located around line 1200-1250 in sophisticated-engine-server.js
  - Returns JSON with gameId, status, players, pot, etc.
  
Goal:
  - Route this endpoint through StorageAdapter
  - Preserve exact API response format
  - No changes to request/response contract

Why This Matters:
  - First read operation to test database integration
  - No data mutations (safe to test)
  - Critical endpoint for frontend polling
```

#### CONSTRAINTS (DO NOT)
```yaml
❌ DO NOT change the response format
❌ DO NOT modify any other endpoints yet
❌ DO NOT change authentication (none exists yet)
❌ DO NOT add new fields to response
❌ DO NOT alter error handling behavior
❌ DO NOT modify frontend code
```

#### INSTRUCTIONS

**Step 1: Locate the endpoint**

File: `sophisticated-engine-server.js`  
Search for: `app.get('/api/games/:id'`

Expected location: Approximately lines 1200-1250

**Step 2: Replace implementation**

**BEFORE (original code):**
```javascript
app.get('/api/games/:id', async (req, res) => {
  try {
    const gameId = req.params.id;
    const gameState = games.get(gameId);
    
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // ... rest of the response building
  } catch (error) {
    // ... error handling
  }
});
```

**AFTER (migrated code):**
```javascript
app.get('/api/games/:id', async (req, res) => {
  try {
    const gameId = req.params.id;
    
    // ============================================
    // MIGRATED: Using StorageAdapter (Task 1.2)
    // Routes to Map or Repository based on MIGRATION_FLAGS.USE_DB_REPOSITORY
    // ============================================
    const gameState = await StorageAdapter.getGame(gameId);
    
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // ============================================
    // Response building (unchanged)
    // ============================================
    const players = Array.from(gameState.players.values()).map((p) => ({
      id: p.uuid,
      name: p.name,
      stack: p.stack,
      seatIndex: p.seatIndex,
      isActive: p.isActive,
      hasFolded: p.hasFolded,
      isAllIn: p.isAllIn,
      betThisStreet: p.betThisStreet,
      holeCards: p.hole ? p.hole.map((c) => c.toString()) : []
    }));

    res.json({
      gameId,
      status: gameState.status,
      handNumber: gameState.handState.handNumber,
      street: gameState.currentStreet,
      communityCards: gameState.handState.communityCards.map(c => c.toString()),
      pot: gameState.pot.totalPot,
      currentBet: gameState.bettingRound.currentBet,
      toAct: gameState.toAct,
      canStartHand: gameState.canStartHand(),
      isHandComplete: gameState.isHandComplete(),
      isBettingRoundComplete: gameState.isBettingRoundComplete(),
      players: players
    });
  } catch (error) {
    console.error('❌ Error fetching game:', error);
    res.status(500).json({ 
      error: error.message,
      gameId: req.params.id
    });
  }
});
```

**Key changes:**
1. Changed `games.get(gameId)` → `await StorageAdapter.getGame(gameId)`
2. Added `await` keyword
3. Added inline comments explaining migration
4. Everything else unchanged

#### VALIDATION

**Test 1: Old implementation still works**
```bash
# Start server with OLD storage
USE_DB_REPOSITORY=false node sophisticated-engine-server.js

# In another terminal:
# First, create a game (use existing endpoint)
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -d '{"small_blind": 10, "big_blind": 20}'

# Note the gameId from response, then:
curl http://localhost:3000/api/games/YOUR_GAME_ID

# Expected: Full game state returned
# Should see in server logs: "🔄 [MIGRATION] getGame → OLD"
```

**Test 2: New implementation works**
```bash
# Start server with NEW storage
USE_DB_REPOSITORY=true node sophisticated-engine-server.js

# Repeat curl commands above
# Expected: Full game state returned (from database)
# Should see in server logs: "🔄 [MIGRATION] getGame → NEW"
```

**Test 3: Response format unchanged**
```bash
# Compare responses from both implementations
# They should be identical (same fields, same structure)

# Save old response:
curl http://localhost:3000/api/games/test-id > old_response.json

# Switch flag and save new response:
curl http://localhost:3000/api/games/test-id > new_response.json

# Compare:
diff old_response.json new_response.json
# Should show no differences (except maybe timestamps)
```

#### ROLLBACK

```bash
# Option 1: Use feature flag
USE_DB_REPOSITORY=false node sophisticated-engine-server.js

# Option 2: Git revert
git diff sophisticated-engine-server.js
git checkout sophisticated-engine-server.js

# Option 3: Manual revert
# Change this line back:
# const gameState = await StorageAdapter.getGame(gameId);
# TO:
# const gameState = games.get(gameId);
```

#### SUCCESS CRITERIA

- [ ] Endpoint responds with 200 OK for valid game IDs
- [ ] Response format identical to before
- [ ] Works with OLD storage (flag OFF)
- [ ] Works with NEW storage (flag ON)
- [ ] Frontend can still fetch game state
- [ ] No errors in server logs

---

### Task 1.3: Migrate POST /api/games Endpoint
**Level:** L2 (Single File)  
**Status:** BLOCKED (requires Task 1.2)  
**Estimated Time:** 25 minutes

#### CONTEXT
```yaml
Current State:
  - POST /api/games creates new game in Map
  - Uses GameStateModel to initialize state
  - Returns gameId in response
  
Goal:
  - Save game to database via StorageAdapter
  - Preserve game creation logic
  - Ensure frontend continues to work

Why This Matters:
  - First write operation to database
  - Tests that repository save methods work
  - Critical for game start flow
```

#### CONSTRAINTS
```yaml
❌ DO NOT change game initialization logic
❌ DO NOT modify GameStateModel constructor
❌ DO NOT alter request/response format
❌ DO NOT change validation (will do later)
```

#### INSTRUCTIONS

[Similar detailed structure as Task 1.2]

---

## 📦 Task Template (for AI to follow)

```markdown
### Task X.Y: [Task Name]
**Level:** L1-L5  
**Status:** READY/BLOCKED/IN_PROGRESS/TESTING/COMPLETE  
**Dependencies:** [List of task IDs]  
**Estimated Time:** X minutes

#### CONTEXT
```yaml
Current State:
  - [What exists now]
  - [File locations]
  - [Current behavior]
  
Goal:
  - [What we're changing]
  - [Expected outcome]

Why This Matters:
  - [Business/technical reason]
```

#### CONSTRAINTS (DO NOT)
```yaml
❌ [Thing to avoid]
❌ [Thing to preserve]
```

#### INSTRUCTIONS

**Step 1: [Action]**
File: `path/to/file.js`
Location: Line X or after "search term"

[Exact code to insert/change]

**Step 2: [Next action]**
[Continue...]

#### VALIDATION
[Tests to run]

#### ROLLBACK
[How to undo]

#### SUCCESS CRITERIA
- [ ] [Checkable outcome]
```

---

## 🎯 AI Prompt Templates

### For Starting a Task
```
I am working on Task X.Y from MIGRATION_FRAMEWORK.md.

Current context:
- I have completed Task X.(Y-1)
- All validation tests passed
- No regressions detected

Please execute Task X.Y following these steps:
1. Read the CONTEXT section to understand what we're changing
2. Review CONSTRAINTS to know what NOT to touch
3. Execute each step in INSTRUCTIONS sequentially
4. After each step, pause and confirm it worked
5. Run all VALIDATION tests
6. Confirm SUCCESS CRITERIA met

If any step fails:
- Stop immediately
- Execute ROLLBACK procedure
- Report the error with full context

Ready to proceed?
```

### For Continuing After Break
```
I was working on Phase X (Database Migration).

Last completed: Task X.Y - [name]
Current status: [describe where you are]

Please:
1. Read MIGRATION_FRAMEWORK.md to understand the overall plan
2. Check the task dependency graph for Task X.(Y+1)
3. Verify all dependencies are complete
4. If ready, execute next task following the template

Show me the next task to work on.
```

### For Debugging
```
Task X.Y failed during [step name].

Error message:
[paste error]

Context:
- MIGRATION_FLAGS.USE_DB_REPOSITORY = [true/false]
- Server version: [version]
- Database connected: [yes/no]

Please:
1. Analyze the error against Task X.Y CONSTRAINTS
2. Check if we violated any DO NOT rules
3. Suggest fix without breaking other tasks
4. Update inline comments if root cause found

DO NOT proceed to rollback without analysis.
```

---

## 📊 Migration Dashboard

File: `MIGRATION_STATUS.md` (auto-generated)

```markdown
# Migration Status Dashboard
Last updated: 2025-10-21 14:30:00

## Phase 1: Database Persistence (Week 1)
- [x] Task 1.1: Initialize Repository Infrastructure (COMPLETE)
- [x] Task 1.2: Migrate GET /api/games/:id (COMPLETE)
- [ ] Task 1.3: Migrate POST /api/games (IN_PROGRESS)
- [ ] Task 1.4: Migrate POST /api/games/:id/action (READY)
- [ ] Task 1.5: Remove in-memory Map (BLOCKED)

## Phase 2: Input Validation (Week 2)
- [ ] Task 2.1: Add Zod schemas (READY after 1.5)
- [ ] Task 2.2: Migrate POST /api/rooms (BLOCKED)
...

## Flags Status
USE_DB_REPOSITORY: true (since 2025-10-21 10:00)
USE_INPUT_VALIDATION: false
USE_AUTH_MIDDLEWARE: false

## Test Results
✅ All unit tests passing (47/47)
✅ Integration tests passing (12/12)
⚠️  E2E test flaky (game_flow_test.js) - investigating

## Rollback History
- 2025-10-21 09:15: Rolled back Task 1.3 (database timeout)
- 2025-10-21 10:00: Task 1.3 successful on retry
```

---

## 🔧 Inline Comment Standards

### For Migrated Code
```javascript
// ============================================
// MIGRATED: Task 1.2 (Oct 21, 2025)
// Changed from: games.get(gameId)
// Changed to: await StorageAdapter.getGame(gameId)
// Flag: MIGRATION_FLAGS.USE_DB_REPOSITORY
// Rollback: See MIGRATION_FRAMEWORK.md Task 1.2
// ============================================
const gameState = await StorageAdapter.getGame(gameId);
```

### For Preserved Code
```javascript
// ============================================
// PRESERVED: DO NOT MODIFY (Migration Constraint 1.2.C3)
// This response format is API contract with frontend
// Changing this breaks: poker.html line 1850, play.html line 920
// ============================================
res.json({
  gameId,
  status: gameState.status,
  // ... rest
});
```

### For Future Migration
```javascript
// ============================================
// TODO: MIGRATE IN TASK 2.3
// This needs input validation once Zod schemas added
// Current behavior: No validation (accepts any input)
// Target behavior: Validate with CreateRoomSchema
// ============================================
const { small_blind, big_blind } = req.body;
```

### For Known Issues
```javascript
// ============================================
// KNOWN ISSUE: Identified in Task 1.2 validation
// Problem: Response missing 'configuration' field
// Impact: Frontend defaults to 100 chips
// Fix planned: Task 1.6 (add configuration to response)
// Workaround: Frontend hardcodes default
// Ticket: #47
// ============================================
```

---

## 🚨 Emergency Procedures

### Full Rollback to Pre-Migration State

```bash
# Step 1: Stop all servers
pkill -f node

# Step 2: Set all flags to false
export USE_DB_REPOSITORY=false
export USE_INPUT_VALIDATION=false
export USE_AUTH_MIDDLEWARE=false

# Step 3: Restart with old code
node sophisticated-engine-server.js

# Step 4: Verify old behavior works
curl http://localhost:3000/health
# Should return 200 OK

# Step 5: Check data integrity
# If data loss occurred, restore from backup
psql $DATABASE_URL < database_backup_$(date +%Y%m%d).sql
```

### Partial Rollback (Single Phase)

```bash
# Example: Rollback Phase 2 but keep Phase 1
export USE_INPUT_VALIDATION=false  # Rollback Phase 2
export USE_DB_REPOSITORY=true      # Keep Phase 1

node sophisticated-engine-server.js
```

---

## 📝 Version Control Strategy

### Commit Message Format
```
[MIGRATION] Task X.Y: [Task Name]

Phase: [Phase number and name]
Level: [L1-L5]
Status: [COMPLETE/IN_PROGRESS]

Changes:
- [List of files changed]
- [Behavior changes]

Validation:
- [Tests run]
- [Results]

Rollback: See MIGRATION_FRAMEWORK.md Task X.Y

Co-authored-by: AI-Assistant <cursor@example.com>
```

### Branch Strategy
```
main (production)
  ├── migration/phase-1-database
  │   ├── migration/task-1.1-infrastructure
  │   ├── migration/task-1.2-get-endpoint
  │   └── migration/task-1.3-post-endpoint
  ├── migration/phase-2-validation
  └── migration/phase-3-auth
```

---

## 🎓 AI Assistant Competency Checklist

Before executing any task, AI should verify:

- [ ] I have read the full task description (CONTEXT, CONSTRAINTS, INSTRUCTIONS)
- [ ] I understand what NOT to touch (CONSTRAINTS section)
- [ ] I know how to test my changes (VALIDATION section)
- [ ] I know how to rollback if I break something (ROLLBACK section)
- [ ] I will add inline comments following the standards above
- [ ] I will update MIGRATION_STATUS.md after completion
- [ ] I will not proceed to next task until all SUCCESS CRITERIA met
- [ ] I will ask for human review if anything is ambiguous

---

**Document Version:** 1.0  
**Maintained By:** AI + Human Engineering Team  
**Next Review:** After Phase 1 completion

