# 📦 POKEHER ARCHIVE - Complete File Reference

**Archive Created**: October 10, 2025  
**Purpose**: Organized collection of all UI, game logic, backend, and supporting files

---

## 📂 DIRECTORY STRUCTURE

```
archive/
├── ui/                  # All frontend/UI files
├── game-logic/          # Core poker game logic
├── backend/             # Server and API files
├── types/               # TypeScript type definitions
├── config/              # Configuration files
├── database/            # Database schemas and migrations
└── tests/               # Test files and scripts
```

---

## 🎨 UI FILES (`ui/`)

### **HTML Game Interfaces**
| File | Purpose | Status |
|------|---------|--------|
| `poker-test.html` | ⭐ **Main game UI** - Beautiful poker table interface | Production |
| `comprehensive-poker-test.html` | Extended test UI with additional features | Development |
| `simple-test.html` | Minimal test interface | Testing |
| `test-client.html` | WebSocket client test page | Testing |
| `poker-test-backup.html` | Backup of poker-test.html | Archive |

### **Card Assets**
| Directory/File | Contents | Count |
|----------------|----------|-------|
| `cards/` | High-quality PNG card images | 54 files |
| `card-images-base64.js` | Base64 encoded card images | Embedded |
| `base64-cards-inline.js` | Inline base64 cards for fast loading | Embedded |

**Card Images Include**:
- All 52 standard playing cards (Clubs, Diamonds, Hearts, Spades: 2-10, J, Q, K, A)
- 2 card backs (dark and light)

---

## 🎮 GAME LOGIC FILES (`game-logic/core/`)

### **Card System** (`card/`)
| File | Purpose | Key Classes/Functions |
|------|---------|----------------------|
| `card.ts` | Individual card representation | `Card` class |
| `deck.ts` | Deck management and shuffling | `Deck` class, `shuffle()` |
| `rank.ts` | Card rank enum and values | `Rank` enum (2-A) |
| `suit.ts` | Card suit enum | `Suit` enum (c,d,h,s) |
| `index.ts` | Card system exports | - |

### **Game Engine** (`engine/`)
| File | Purpose | Key Features |
|------|---------|-------------|
| `betting-engine.ts` | ⭐ Betting logic and validation | Bet validation, pot management |
| `hand-evaluator.ts` | ⭐ Hand ranking algorithm | 7-card best hand, tie-breaking |
| `enhanced-hand-evaluator.ts` | Advanced hand evaluation | Extended features |
| `pot-manager.ts` | Pot calculation and distribution | Main pot, side pots, splits |
| `game-state-machine.ts` | Game state transitions | Phase management |
| `round-manager.ts` | Round/street progression | Preflop→Flop→Turn→River |
| `turn-manager.ts` | Turn order management | Position tracking |
| `action-validator.ts` | Action validation | Legal move checking |
| `index.ts` | Engine exports | - |

### **Data Models** (`models/`)
| File | Purpose | Key Interfaces |
|------|---------|---------------|
| `game-state.ts` | Game state structure | `GameState`, `GameStatus` |
| `player.ts` | Player data model | `Player`, `PlayerStatus` |
| `table.ts` | Table configuration | `Table`, `TableConfig` |
| `index.ts` | Model exports | - |

### **Supporting Directories**
- `actions/` - Action types and handlers
- `betting/` - Betting round logic
- `evaluation/` - Hand evaluation utilities
- `flow/` - Game flow control
- `state/` - State management utilities

---

## 🖥️ BACKEND FILES (`backend/`)

### **Main Server Files**
| File | Purpose | Port | Status |
|------|---------|------|--------|
| `fixed-sophisticated-server.js` | ⭐ **Main production server** | 3000 | Active |
| `sophisticated-engine-server.js` | Alternative server implementation | 3000 | Development |
| `real-poker-server.js` | Real poker server variant | 3000 | Development |
| `production-server.ts` | TypeScript production server | 3000 | In Progress |
| `app.ts` | Express app configuration | - | Core |
| `auth-server.ts` | Authentication server | - | In Progress |
| `index.ts` | Main entry point | - | Core |

### **API Layer** (`api/`)
```
api/
├── controllers/
│   └── games.controller.ts    # Game management endpoints
├── routes/
│   └── games.routes.ts         # Game API routes
├── middleware/                  # API middleware (empty - to be added)
└── services/                    # API services (empty - to be added)
```

### **Services Layer** (`services/`)

#### **Authentication Services** (`auth/`)
| File | Purpose |
|------|---------|
| `auth-service.ts` | Main authentication logic |
| `jwt-service.ts` | JWT token generation/validation |
| `password-service.ts` | Password hashing/verification (bcrypt) |

#### **Database Services** (`database/`)
| File | Purpose |
|------|---------|
| `supabase.ts` | Supabase client configuration |
| `connection.ts` | Database connection management |
| `transaction-manager.ts` | Transaction handling |
| `concurrency-manager.ts` | Optimistic locking |

**Repositories** (`database/repos/`):
- `base.repo.ts` - Base repository class
- `games.repo.ts` - Game CRUD operations
- `players.repo.ts` - Player management
- `actions.repo.ts` - Action history
- `hands.repo.ts` - Hand tracking
- `pots.repo.ts` - Pot calculations
- `user-repository.ts` - User management

#### **Other Services**
- `game-service.ts` - Game coordination
- `entropy/` - Entropy collection (future)

### **WebSocket** (`websocket/`)
```
websocket/
├── server.ts              # Main WebSocket server
├── integration/           # Integration utilities
└── messages/              # Message type definitions
```

### **Middleware** (`middleware/`)
- `auth-middleware.ts` - JWT authentication middleware

### **Routes** (`routes/`)
- `auth.ts` - Authentication routes (login, register, etc.)

### **Utilities** (`utils/`)
- `constants.ts` - Application constants
- `helpers.ts` - Helper functions
- `validators.ts` - Input validation utilities
- `index.ts` - Utility exports

### **Supporting Directories**
- `bridge/` - Python bridge for poker library integration
- `demo/` - Demo/example files
- `monitoring/` - Monitoring utilities (to be implemented)
- `security/` - Security utilities (to be implemented)
- `validation/` - Validation logic (to be implemented)
- `dist/` - Compiled JavaScript (from TypeScript)

---

## 📝 TYPE DEFINITIONS (`types/`)

### **TypeScript Types**
| File | Purpose | Key Types |
|------|---------|-----------|
| `card.types.ts` | Card-related types | `Card`, `Suit`, `Rank`, `Hole2` |
| `game.types.ts` | Game state types | `GameStateSnapshot`, `TableSnapshot`, `Action` |
| `player.types.ts` | Player types | `PlayerSnapshot`, `PlayerStatus` |
| `common.types.ts` | Common utility types | `UUID`, `Chips`, `SeatIndex`, `Street`, `ActionType` |
| `index.ts` | Type exports | - |

**Important Enums**:
- `ActionType`: FOLD, CHECK, CALL, BET, RAISE, ALL_IN, SMALL_BLIND, BIG_BLIND, ANTE
- `Street`: PREFLOP, FLOP, TURN, RIVER, SHOWDOWN
- `GameStatus`: WAITING, IN_PROGRESS, PAUSED, COMPLETED
- `PlayerStatus`: ACTIVE, FOLDED, ALL_IN, SITTING_OUT, DISCONNECTED

---

## ⚙️ CONFIGURATION FILES (`config/`)

### **Core Configuration**
| File | Purpose | Key Settings |
|------|---------|-------------|
| `package.json` | ⭐ NPM dependencies and scripts | Dependencies, scripts, metadata |
| `tsconfig.json` | TypeScript compiler configuration | Target: ES2020, Module: commonjs |
| `test.env` | ⭐ Environment variables | Database URL, JWT secrets, ports |
| `env.example` | Environment template | Example configuration |
| `jest.config.js` | Jest testing configuration | Test settings |
| `nodemon.json` | Nodemon dev server config | Auto-reload settings |

### **Environment Configuration** (`src-config/`)
- `environment.ts` - Environment variable loader

**Key Environment Variables** (from `test.env`):
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://[supabase-connection-string]
JWT_SECRET=super-secret-jwt-key-for-development-only
SERVER_SECRET=super-secret-server-key-for-rng-seeding
DEFAULT_STARTING_CHIPS=1000
MAX_GAMES_PER_USER=5
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=http://localhost:3001
```

---

## 🗄️ DATABASE FILES (`database/`)

### **Database Connection**
- `connection.ts` - PostgreSQL connection management

### **Migration Scripts**
| File | Purpose |
|------|---------|
| `run-migration.js` | Execute database migrations |
| `verify-migration.js` | Verify migration success |
| `setup-supabase.js` | Initial Supabase setup |

### **SQL Migrations** (`migrations/`)
| File | Purpose | Tables Created |
|------|---------|----------------|
| `001_initial_schema.sql` | ⭐ Core database schema | users, rooms, sessions, chips, audit |
| `001_initial_schema_fixed.sql` | Fixed schema version | - |
| Additional migrations | Game-specific tables | games, hands, players, actions, pots |

**Database Tables** (from schema):
1. **Authentication & Users**
   - `users` - User accounts
   - `user_sessions` - Active sessions
   - `rejoin_tokens` - Reconnection tokens

2. **Rooms & Tables**
   - `rooms` - Poker tables/rooms
   - `room_seats` - Seat assignments
   - `room_spectators` - Observers

3. **Chip Economy**
   - `chips_transactions` - Immutable transaction ledger
   - `table_stakes` - Chips in play
   - `chips_pending` - Pending transactions

4. **Game State** (extended schema)
   - `games` - Game instances
   - `hands` - Individual hands
   - `players` - Players in game
   - `game_actions` - Action history
   - `pots` - Pot breakdown

5. **Audit & Security**
   - `audit_log` - Security audit trail

---

## 🧪 TEST FILES (`tests/`)

### **Unit Tests** (`tests/unit/`)
- `betting-engine.test.ts` - Betting logic tests
- `hand-evaluator.test.ts` - Hand ranking tests
- `pot-manager.test.ts` - Pot calculation tests
- Additional unit tests for core logic

### **Integration Tests** (`tests/integration/`)
- `bridge.test.ts` - Python bridge integration
- `db.test.ts` - Database integration
- Complete game flow tests

### **E2E Tests** (`tests/e2e/`)
- End-to-end game scenarios

### **Test Scripts** (root level)
| File | Purpose |
|------|---------|
| `test-engine.js` | ⭐ Quick engine test |
| `test-complete-functionality.js` | Full game flow test |
| `test-betting-actions.js` | Betting system test |
| `test-complete-poker-hand.js` | Complete hand test |
| `test-fixed-server.js` | Server functionality test |
| `test-base64-inline.js` | Card image loading test |
| `verify-engine.js` | Engine verification |
| `verify-migration.js` | Database migration verification |
| `minimal-test.js` | Minimal smoke test |
| `quick-test.js` | Quick validation test |
| `simple-db-test.js` | Database connection test |

### **Test Configuration**
- `setup.ts` - Test environment setup

---

## 🎯 CRITICAL FILES (MUST NOT LOSE)

### **🔴 Absolutely Critical**
1. **Game Logic**:
   - `game-logic/core/engine/betting-engine.ts` ⭐⭐⭐
   - `game-logic/core/engine/hand-evaluator.ts` ⭐⭐⭐
   - `game-logic/core/engine/pot-manager.ts` ⭐⭐⭐
   - `game-logic/core/card/` (entire directory) ⭐⭐⭐

2. **Backend**:
   - `backend/fixed-sophisticated-server.js` ⭐⭐⭐
   - `backend/services/database/` (all files) ⭐⭐⭐

3. **UI**:
   - `ui/poker-test.html` ⭐⭐⭐
   - `ui/cards/` (all 54 images) ⭐⭐⭐

4. **Configuration**:
   - `config/package.json` ⭐⭐⭐
   - `config/tsconfig.json` ⭐⭐⭐
   - `config/test.env` ⭐⭐

5. **Database**:
   - `database/migrations/001_initial_schema.sql` ⭐⭐⭐
   - `database/connection.ts` ⭐⭐

### **🟡 Important (Should Not Lose)**
- All type definitions (`types/`)
- API routes and controllers (`backend/api/`)
- Authentication services (`backend/services/auth/`)
- Test files (for verification)

### **🟢 Nice to Have (Can Regenerate)**
- Compiled `dist/` files (can rebuild with `npm run build`)
- Test backup HTML files
- Demo files

---

## 📊 FILE STATISTICS

```yaml
Total Directories: 7 main categories
Total Files: 200+

Breakdown:
  UI Files: 5 HTML + 54 card images + 2 base64 files = 61 files
  Game Logic: ~25 TypeScript files
  Backend: ~80+ TypeScript/JavaScript files
  Types: 5 TypeScript definition files
  Config: 7 configuration files
  Database: 3 scripts + 5 SQL migrations = 8 files
  Tests: ~40 test files and scripts

Languages:
  TypeScript: ~70%
  JavaScript: ~20%
  SQL: ~5%
  HTML: ~3%
  Python: ~2%
```

---

## 🔧 HOW TO USE THIS ARCHIVE

### **Restore Full Project**
```bash
# 1. Copy archive to new location
cp -r archive/ ../restored-pokeher/

# 2. Install dependencies
cd ../restored-pokeher
npm install

# 3. Set up environment
cp config/test.env .env

# 4. Build TypeScript
npm run build

# 5. Run migrations
node database/run-migration.js

# 6. Start server
node backend/fixed-sophisticated-server.js
```

### **Extract Specific Components**

**Just Game Logic**:
```bash
cp -r archive/game-logic/core/ ./src/core/
cp -r archive/types/ ./src/types/
```

**Just UI**:
```bash
cp archive/ui/poker-test.html ./
cp -r archive/ui/cards/ ./cards/
cp archive/ui/card-images-base64.js ./
```

**Just Backend**:
```bash
cp -r archive/backend/ ./src/
cp archive/config/package.json ./
```

---

## 🚀 QUICK START FROM ARCHIVE

### **Run the Game**
```bash
# Prerequisite: Node.js 18+ installed
cd archive

# Install dependencies (if package.json moved to root)
npm install

# Start server
node backend/fixed-sophisticated-server.js

# Open browser to:
# http://localhost:3000/test
```

### **Run Tests**
```bash
# Unit tests
npm test

# Quick engine test
node tests/test-engine.js

# Complete functionality test
node tests/test-complete-functionality.js
```

---

## 📚 DOCUMENTATION REFERENCES

For detailed documentation, refer to:
- `../poker-engine-docs/` - Complete technical documentation
- `../ROADMAP.md` - Development roadmap
- `../README.md` - Project overview
- `../POKER_GAME_ROADMAP.md` - Game-specific roadmap

---

## 🎓 KEY TECHNICAL DETAILS

### **Tech Stack**
```yaml
Backend: Node.js 18+ with TypeScript 5.0+
Framework: Express.js 4.18
Real-time: Socket.IO 4.8
Database: Supabase (PostgreSQL 15+)
Testing: Jest
Type Checking: TypeScript strict mode
```

### **Architecture**
- **Pattern**: Event-driven with immutable state
- **State Management**: Server-side authoritative
- **Real-time**: WebSocket (Socket.IO)
- **Database**: PostgreSQL with Row Level Security
- **Authentication**: JWT with bcrypt

### **Game Rules**
- **Game Type**: Texas Hold'em (No-Limit)
- **Players**: 2-10 per table
- **Blinds**: Configurable (default 1/2)
- **Deck**: Standard 52-card deck
- **Shuffle**: Cryptographically secure random

---

## ⚠️ IMPORTANT NOTES

1. **Database Credentials**: The `test.env` contains a real Supabase connection string. Keep secure!

2. **Secrets**: JWT_SECRET and SERVER_SECRET are development values. Change in production!

3. **Node Modules**: Not included in archive. Run `npm install` to restore.

4. **Build Required**: TypeScript files need compilation. Run `npm run build`.

5. **Migration Status**: Database migrations may need to be run. Check `database/migrations/`.

6. **Port Configuration**: Default port is 3000. Change in `test.env` if needed.

---

## 🔐 SECURITY CONSIDERATIONS

**Sensitive Files**:
- `config/test.env` - Contains database credentials and secrets
- `database/connection.ts` - Database connection logic
- `backend/services/auth/` - Authentication logic

**Best Practices**:
- Never commit `.env` files to version control
- Rotate JWT secrets regularly
- Use different secrets for dev/staging/production
- Keep Supabase credentials secure
- Enable Row Level Security in database

---

## 📞 ARCHIVE METADATA

```yaml
Archive Name: POKEHER Complete Archive
Created: October 10, 2025
Source: poker-engine/ directory
Purpose: Backup and organization of all critical files
Completeness: 100% (all UI, game logic, backend, config, database, tests)
Size: ~10MB (including card images)
Restoration: Fully restorable with npm install + npm run build
```

---

**✅ ARCHIVE COMPLETE - ALL FILES ACCOUNTED FOR**

*This archive contains everything needed to run, test, develop, and deploy the POKEHER poker platform.*


