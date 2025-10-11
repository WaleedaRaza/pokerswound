# 🗺️ COMPLETE FILE MAP - POKEHER PROJECT
## Every Single Important File Documented

---

## 📁 PROJECT ROOT STRUCTURE

```
pokeher/
├── poker-engine/              ⭐ MAIN BACKEND APPLICATION
├── poker-frontend/            🎨 NEXT.JS FRONTEND (IN DEVELOPMENT)
├── poker-engine-docs/         📚 COMPREHENSIVE DOCUMENTATION
├── poker-master/              📖 REFERENCE: Python poker library
└── PyPokerEngine-master/      📖 REFERENCE: Python poker engine
```

---

## 🎮 1. UI / FRONTEND FILES

### **CURRENT UI (HTML/CSS/JS)**
Location: `poker-engine/`

```
poker-test.html                    ⭐ PRIMARY UI - Beautiful poker table
  • Complete game interface
  • Player positions (1-10)
  • Card display (hole + community)
  • Action buttons (fold, check, call, raise)
  • Pot display
  • Betting controls
  • Real-time updates
  • Chat interface
  • Status: WORKING, PRODUCTION-READY

poker-test-backup.html             📦 BACKUP - Previous version
  • Backup of working UI
  • Use if main UI breaks

comprehensive-poker-test.html      🧪 ENHANCED UI - Extended features
  • Additional testing features
  • More detailed displays
  • Debug information

simple-test.html                   🔧 MINIMAL UI - Basic testing
  • Stripped down version
  • Quick testing only
  • No fancy features

test-client.html                   🔌 WEBSOCKET TEST CLIENT
  • Tests WebSocket connections
  • Real-time messaging
  • Connection debugging
```

### **FRONTEND ASSETS**
Location: `poker-engine/`

```
card-images-base64.js              🎴 CARD IMAGES - Base64 encoded
  • All 52 card images embedded
  • Fast loading (no HTTP requests)
  • Fallback for offline mode
  • Size: ~500KB

base64-cards-inline.js             🎴 ALTERNATIVE - Inline cards
  • Another encoding format
  • Backup option

cards/ (directory)                 🖼️ CARD IMAGE FILES
  • 54 PNG files (52 cards + 2 backs)
  • clubs_2.png through clubs_A.png
  • diamonds_2.png through diamonds_A.png
  • hearts_2.png through hearts_A.png
  • spades_2.png through spades_A.png
  • back_dark.png, back_light.png
  • High quality images
```

### **NEXT.JS FRONTEND (IN DEVELOPMENT)**
Location: `poker-frontend/`

```
app/
├── layout.tsx                     🏗️ ROOT LAYOUT
│   • App-wide layout
│   • Navigation structure
│   • Global providers
│
├── page.tsx                       🏠 HOME PAGE
│   • Landing page
│   • Entry point
│   • Initial user interface
│
├── globals.css                    🎨 GLOBAL STYLES
│   • Tailwind CSS
│   • App-wide styling
│   • Custom CSS variables
│
└── favicon.ico                    🔖 SITE ICON

next.config.ts                     ⚙️ NEXT.JS CONFIGURATION
  • Build settings
  • Route configuration
  • Environment setup

tsconfig.json                      📝 TYPESCRIPT CONFIG
  • Compiler options
  • Path aliases
  • Module resolution

package.json                       📦 DEPENDENCIES
  • React 18+
  • Next.js 14
  • Tailwind CSS
  • TypeScript

public/                            📁 STATIC ASSETS
  • SVG icons
  • Images
  • Public files
```

---

## 🎯 2. GAME LOGIC (CORE ENGINE)

### **CARD SYSTEM**
Location: `poker-engine/src/core/card/`

```
card.ts                            🎴 CARD CLASS
  • Card representation
  • Rank + Suit
  • Immutable card objects
  • Card comparison
  • Card validation
  • toString() methods

rank.ts                            🔢 RANK ENUM
  • Enum: 2, 3, 4, 5, 6, 7, 8, 9, T, J, Q, K, A
  • Rank validation
  • Rank comparison
  • Rank utilities

suit.ts                            ♠️ SUIT ENUM
  • Enum: Clubs, Diamonds, Hearts, Spades
  • Suit symbols
  • Suit colors (red/black)
  • Suit validation

deck.ts                            🃏 DECK CLASS
  • 52-card deck creation
  • Shuffling logic (crypto-secure)
  • Card dealing
  • Deck state management
  • Immutable operations
  • Deck validation

index.ts                           📤 EXPORTS
  • Re-exports all card types
```

### **GAME ENGINE**
Location: `poker-engine/src/core/engine/`

```
game-state-machine.ts              🎮 STATE MACHINE ⭐ CORE
  • Main game flow controller
  • State transitions
  • Phase management:
    - WAITING
    - DEALING
    - PREFLOP
    - FLOP
    - TURN
    - RIVER
    - SHOWDOWN
    - COMPLETE
  • Game lifecycle
  • State validation
  • Event emission

betting-engine.ts                  💰 BETTING LOGIC ⭐ CORE
  • Action validation:
    - FOLD, CHECK, CALL, BET, RAISE, ALL_IN
  • Bet amount validation
  • Minimum bet calculation
  • Maximum bet enforcement
  • Pot contribution tracking
  • Betting round completion
  • Side pot creation
  • All-in handling

hand-evaluator.ts                  🏆 HAND EVALUATION ⭐ CORE
  • Best 5-card hand from 7 cards
  • Hand rankings:
    1. Royal Flush
    2. Straight Flush
    3. Four of a Kind
    4. Full House
    5. Flush
    6. Straight
    7. Three of a Kind
    8. Two Pair
    9. Pair
    10. High Card
  • Kicker comparison
  • Tie breaking
  • Hand comparison
  • Winner determination
  • Optimized algorithms

enhanced-hand-evaluator.ts         🏆 ENHANCED EVALUATOR
  • Extended hand evaluation
  • Additional features
  • Performance optimizations
  • Advanced tie-breaking

pot-manager.ts                     💎 POT MANAGEMENT ⭐ CORE
  • Main pot calculation
  • Side pot creation
  • All-in player handling
  • Multi-way all-in scenarios
  • Pot distribution
  • Winner allocation
  • Chip splitting (odd chips)
  • Pot validation

round-manager.ts                   🔄 ROUND MANAGEMENT
  • Betting round control
  • Street progression
  • Dealer button rotation
  • Blind posting
  • Ante collection
  • Position management
  • Action order tracking

turn-manager.ts                    ⏱️ TURN MANAGEMENT
  • Turn order enforcement
  • Active player tracking
  • Timeout handling
  • Timebank system
  • Auto-fold logic
  • Turn rotation
  • Skip inactive players

action-validator.ts                ✅ ACTION VALIDATION
  • Legal action checking
  • Amount validation
  • Player eligibility
  • State-based validation
  • Error messages

index.ts                           📤 EXPORTS
  • Re-exports all engine components
```

### **DATA MODELS**
Location: `poker-engine/src/core/models/`

```
game-state.ts                      📊 GAME STATE MODEL ⭐ CRITICAL
  • GameState interface
  • Complete game state structure:
    - Game ID
    - Room ID
    - Players array
    - Table snapshot
    - Pot breakdown
    - Action history
    - Current street
    - Dealer position
    - Status
  • Immutable state design
  • State snapshot generation

player.ts                          👤 PLAYER MODEL
  • Player interface
  • Player properties:
    - UUID
    - Name
    - Stack (chips)
    - Seat index
    - Hole cards (private)
    - Status (active, folded, all-in)
    - Current bet
    - Total bet this hand
    - Last action
  • Player validation

table.ts                           🎰 TABLE MODEL
  • Table configuration
  • Table state:
    - Dealer position
    - Small blind position
    - Big blind position
    - Community cards
    - Current street
    - To act (active player)
  • Table validation

index.ts                           📤 EXPORTS
  • Re-exports all models
```

### **TYPE DEFINITIONS**
Location: `poker-engine/src/types/`

```
common.types.ts                    🔧 COMMON TYPES
  • UUID type
  • Chips type
  • SeatIndex type (0-9)
  • Timestamp type
  • ActionType enum
  • Street enum
  • GameStatus enum
  • PlayerStatus enum

card.types.ts                      🎴 CARD TYPES
  • Card interface
  • Suit enum
  • Rank enum
  • Hole2 type (2-card tuple)
  • CommunityCards type
  • Deck type

game.types.ts                      🎮 GAME TYPES
  • PlayerSnapshot interface
  • PotBreakdown interface
  • Action interface
  • TableSnapshot interface
  • GameStateSnapshot interface
  • Request/Response types

player.types.ts                    👤 PLAYER TYPES
  • Extended player types
  • Player state enums
  • Player action types
  • Player statistics (future)

index.ts                           📤 EXPORTS
  • Re-exports all types
  • Central type import point
```

---

## 🔧 3. BACKEND / SERVER FILES

### **MAIN SERVERS**
Location: `poker-engine/`

```
fixed-sophisticated-server.js      ⭐ MAIN SERVER - START HERE
  • Express.js server
  • Port 3000
  • API endpoints:
    - POST /api/games (create game)
    - GET /api/games/:id (get state)
    - POST /api/games/:id/join (join game)
    - POST /api/games/:id/start-hand (start hand)
    - POST /api/games/:id/actions (player action)
    - GET /api/games/:id/legal-actions
  • Static file serving
  • CORS configuration
  • Error handling
  • Game state management (in-memory)
  • HOT RELOADING
  • Status: PRODUCTION-READY

sophisticated-engine-server.js     🔄 ALTERNATIVE SERVER
  • Similar to fixed server
  • Different implementation
  • Backup option

real-poker-server.js               🎰 REAL-MONEY SERVER (FUTURE)
  • For real money games
  • Enhanced security
  • Transaction handling
  • Not currently used
```

### **API LAYER**
Location: `poker-engine/src/api/`

```
controllers/
└── games.controller.ts            🎮 GAME CONTROLLER
    • HTTP request handlers
    • Game CRUD operations
    • Action processing
    • State retrieval
    • Error handling
    • Response formatting

routes/
└── games.routes.ts                🛣️ GAME ROUTES
    • Express router
    • Route definitions
    • Middleware attachment
    • Validation
    • Route protection

middleware/
└── (empty - to be implemented)    🔒 MIDDLEWARE
    • Auth middleware (planned)
    • Rate limiting (planned)
    • Validation (planned)
```

### **AUTHENTICATION & SECURITY**
Location: `poker-engine/src/`

```
auth-server.ts                     🔐 AUTH SERVER
  • Authentication server
  • User login/registration
  • Token issuance
  • Session management
  • Separate from game server

middleware/auth-middleware.ts      🔒 AUTH MIDDLEWARE
  • JWT verification
  • Route protection
  • User identification
  • Token validation
  • Error handling

routes/auth.ts                     🛣️ AUTH ROUTES
  • /auth/register
  • /auth/login
  • /auth/logout
  • /auth/refresh
  • /auth/verify

services/auth/
├── auth-service.ts                🔑 AUTH SERVICE
│   • User authentication
│   • Credential validation
│   • Session creation
│   • Token management
│
├── jwt-service.ts                 🎫 JWT SERVICE
│   • Token generation (RS256)
│   • Token verification
│   • Token refresh
│   • Token revocation
│
└── password-service.ts            🔐 PASSWORD SERVICE
    • Password hashing (bcrypt)
    • Password verification
    • Password strength validation
    • Salt generation
```

### **DATABASE LAYER**
Location: `poker-engine/src/services/database/`

```
supabase.ts                        🗄️ SUPABASE CLIENT ⭐ CRITICAL
  • Supabase connection
  • Client initialization
  • Environment variables
  • Connection pooling
  • Error handling

connection.ts                      🔌 DATABASE CONNECTION
  • Raw PostgreSQL connection
  • Connection management
  • Query execution
  • Transaction support

transaction-manager.ts             💼 TRANSACTION MANAGER
  • BEGIN/COMMIT/ROLLBACK
  • Transaction isolation
  • Nested transactions
  • Error recovery
  • Atomic operations

concurrency-manager.ts             ⚡ CONCURRENCY MANAGER
  • Optimistic locking
  • Version control
  • Conflict detection
  • Retry logic
  • Race condition prevention

repositories/
└── user-repository.ts             👤 USER REPOSITORY
    • User CRUD operations
    • User queries
    • Profile management

repos/
├── base.repo.ts                   📦 BASE REPOSITORY
│   • Abstract repository
│   • Common CRUD methods
│   • Query helpers
│   • Error handling
│
├── games.repo.ts                  🎮 GAMES REPOSITORY
│   • Game CRUD
│   • Game state persistence
│   • Game queries
│   • Game updates
│
├── players.repo.ts                👥 PLAYERS REPOSITORY
│   • Player CRUD
│   • Player state
│   • Seat management
│   • Stack updates
│
├── hands.repo.ts                  🃏 HANDS REPOSITORY
│   • Hand creation
│   • Hand history
│   • Hand results
│   • Community cards
│
├── actions.repo.ts                ⚡ ACTIONS REPOSITORY
│   • Action logging
│   • Action history
│   • Action queries
│   • Sequence management
│
└── pots.repo.ts                   💰 POTS REPOSITORY
    • Pot tracking
    • Side pots
    • Pot distribution
    • Winner allocation
```

### **GAME SERVICE**
Location: `poker-engine/src/services/`

```
game-service.ts                    🎯 GAME SERVICE ⭐ ORCHESTRATOR
  • High-level game operations
  • Coordinates:
    - Game engine
    - Database
    - WebSocket
    - State management
  • Game lifecycle management
  • Player action processing
  • State synchronization
  • Error recovery
```

### **WEBSOCKET / REAL-TIME**
Location: `poker-engine/src/websocket/`

```
server.ts                          🔌 WEBSOCKET SERVER
  • Socket.IO server
  • Connection handling
  • Room management
  • Event broadcasting
  • Message routing
  • Heartbeat/ping-pong
  • Reconnection handling
  • Events:
    - game:state_update
    - game:action_taken
    - game:street_change
    - player:joined
    - player:left
    - player:turn
    - room:chat_message

integration/
└── (future)                       🔗 INTEGRATIONS
    • Third-party integrations
    • External APIs

messages/
└── (future)                       💬 MESSAGE TYPES
    • WebSocket message definitions
    • Message validation
    • Message serialization
```

### **CONFIGURATION**
Location: `poker-engine/src/config/`

```
environment.ts                     ⚙️ ENVIRONMENT CONFIG
  • Environment variable loading
  • Configuration validation
  • Defaults
  • Type-safe config access
  • Variables:
    - NODE_ENV
    - PORT
    - DATABASE_URL
    - JWT_SECRET
    - SERVER_SECRET
    - CORS_ORIGIN
    - Logging levels
    - Feature flags
```

### **UTILITIES**
Location: `poker-engine/src/utils/`

```
constants.ts                       📏 CONSTANTS
  • Game constants
  • Magic numbers
  • Default values
  • Timeouts
  • Limits

helpers.ts                         🛠️ HELPER FUNCTIONS
  • Utility functions
  • Common operations
  • Data transformations
  • Formatters

validators.ts                      ✅ VALIDATORS
  • Input validation
  • Data sanitization
  • Type guards
  • Validation rules

index.ts                           📤 EXPORTS
  • Re-exports utilities
```

---

## 🗄️ 4. DATABASE FILES

### **MIGRATIONS**
Location: `poker-engine/database/migrations/`

```
001_initial_schema.sql             🏗️ INITIAL SCHEMA ⭐ CRITICAL
  • Creates all core tables:
    - users (authentication, profiles)
    - user_sessions (refresh tokens)
    - rejoin_tokens (reconnection)
    - rooms (poker tables)
    - room_seats (player seats)
    - room_spectators (observers)
    - chips_transactions (ledger)
    - table_stakes (locked chips)
    - chips_pending (async transactions)
    - audit_log (security trail)
  • Functions and triggers
  • Indexes
  • Constraints
  • Initial data

001_initial_schema_fixed.sql       🔧 FIXED SCHEMA
  • Updated version
  • Bug fixes
  • Schema improvements

0002_state_extensions.sql          ➕ STATE EXTENSIONS
  • Additional game state tables
  • Extended columns
  • New relationships

0003_robustness_fixes.sql          🛡️ ROBUSTNESS FIXES
  • Performance indexes
  • Integrity constraints
  • Optimizations
```

### **MIGRATION TOOLS**
Location: `poker-engine/`

```
run-migration.js                   ▶️ RUN MIGRATION
  • Execute migrations
  • Migration runner
  • Apply schema changes
  • Database updates

verify-migration.js                ✅ VERIFY MIGRATION
  • Check migration status
  • Validate schema
  • Test database
  • Verification queries

setup-supabase.js                  🔧 SUPABASE SETUP
  • Initial Supabase setup
  • Configuration
  • Connection testing
  • Environment check
```

---

## 🧪 5. TESTING FILES

### **UNIT TESTS**
Location: `poker-engine/tests/unit/`

```
card.test.ts                       🎴 CARD TESTS
  • Card creation
  • Card validation
  • Card comparison
  • Card utilities

deck.test.ts                       🃏 DECK TESTS
  • Deck creation (52 cards)
  • Shuffle testing
  • Card dealing
  • Deck state

betting-engine.test.ts             💰 BETTING TESTS
  • Action validation
  • Bet amount checks
  • Pot calculation
  • Side pots
  • All-in scenarios

hand-evaluator.test.ts             🏆 HAND EVALUATION TESTS
  • All hand rankings
  • Tie breaking
  • Kicker comparison
  • Edge cases
  • Performance tests

player.test.ts                     👤 PLAYER TESTS
  • Player creation
  • Player state
  • Stack management
  • Action tracking

table.test.ts                      🎰 TABLE TESTS
  • Table configuration
  • Position management
  • Dealer button
  • Blinds

gameState.test.ts                  🎮 GAME STATE TESTS
  • State creation
  • State transitions
  • State validation
  • Immutability
```

### **INTEGRATION TESTS**
Location: `poker-engine/tests/integration/`

```
bridge.test.ts                     🌉 BRIDGE TESTS
  • Python-TypeScript bridge
  • Cross-language integration
  • API compatibility

db.test.ts                         🗄️ DATABASE TESTS
  • Database operations
  • CRUD operations
  • Transactions
  • Queries
```

### **E2E TESTS**
Location: `poker-engine/tests/e2e/`

```
(to be implemented)                🎯 E2E TESTS
  • Full game flow
  • User journeys
  • API testing
  • WebSocket testing
```

### **TEST CONFIGURATION**
Location: `poker-engine/tests/`

```
setup.ts                           ⚙️ TEST SETUP
  • Test environment
  • Mock configuration
  • Test utilities
  • Cleanup hooks

jest.config.js                     🃏 JEST CONFIG (root)
  • Jest configuration
  • Test paths
  • Coverage settings
  • Transform rules
```

---

## 🔬 6. MANUAL TEST FILES

### **QUICK TESTS**
Location: `poker-engine/`

```
test-engine.js                     🧪 ENGINE TEST
  • Quick engine test
  • Basic functionality
  • Manual validation
  • CLI output

test-complete-functionality.js     🎯 FULL FUNCTIONALITY TEST
  • Complete game flow
  • All features
  • End-to-end
  • Comprehensive test

test-betting-actions.js            💰 BETTING TEST
  • All betting actions
  • Action validation
  • Edge cases
  • Error handling

test-complete-poker-hand.js        🃏 FULL HAND TEST
  • Complete hand play
  • Deal to showdown
  • Winner determination
  • Pot distribution

verify-engine.js                   ✅ ENGINE VERIFICATION
  • Verify engine integrity
  • Check all components
  • Validation tests

test-fixed-server.js               🖥️ SERVER TEST
  • Test server endpoints
  • API validation
  • Request/response
  • Error cases

quick-test.js                      ⚡ QUICK TEST
  • Fast smoke test
  • Basic checks
  • Rapid validation

minimal-test.js                    🔍 MINIMAL TEST
  • Bare minimum test
  • Core functionality only
  • Fastest test

test-base64-inline.js              🎴 CARD IMAGE TEST
  • Test base64 cards
  • Image loading
  • Encoding validation

simple-db-test.js                  🗄️ DB TEST
  • Simple database test
  • Connection check
  • Query test
  • Quick validation
```

---

## 📚 7. DOCUMENTATION FILES

### **ROOT DOCUMENTATION**
Location: `pokeher/` (root)

```
README.md                          📖 MAIN README ⭐ START HERE
  • Project overview
  • Quick start guide
  • Features list
  • Architecture
  • Setup instructions
  • Contributing

ROADMAP.md                         🗺️ DEVELOPMENT ROADMAP
  • Phase-by-phase plan
  • Timeline
  • Milestones
  • Feature priorities

POKER_GAME_ROADMAP.md             🎮 GAME ROADMAP
  • Detailed game development
  • Technical requirements
  • Implementation plan
  • Success metrics

CONTRIBUTING.md                    🤝 CONTRIBUTION GUIDE
  • How to contribute
  • Code standards
  • PR process
  • Community guidelines

DEVELOPMENT_GUIDE.md               💻 DEV GUIDE
  • Development setup
  • Local environment
  • Debugging
  • Best practices

LICENSE                            ⚖️ LICENSE
  • MIT License
  • Usage terms
```

### **ENGINE DOCUMENTATION**
Location: `poker-engine/`

```
README.md                          📖 ENGINE README
  • Engine-specific docs
  • API documentation
  • Usage examples
  • File structure

COMPREHENSIVE_PROJECT_SPEC.md      📋 PROJECT SPEC ⭐ COMPLETE SPEC
  • Full project specification
  • 2500+ lines
  • Every detail documented
  • For project planners

COMPLETE_FILE_MAP.md              🗺️ THIS FILE
  • Maps every file
  • Complete reference
  • File descriptions
```

### **COMPREHENSIVE DOCS**
Location: `poker-engine-docs/`

```
README.md                          📚 DOCS INDEX
  • Documentation overview
  • Navigation guide
  • Topic index

roadmap.md                         🗺️ DOCS ROADMAP
  • Documentation plan
  • Topics to cover
  • Progress tracking

architecture/
└── (detailed architecture docs)   🏗️ ARCHITECTURE
    • System architecture
    • Component design
    • Data flow

game-logic/
└── (game logic documentation)     🎮 GAME LOGIC
    • Poker rules
    • Hand evaluation
    • Betting logic

implementation/
└── (implementation guides)        💻 IMPLEMENTATION
    • Code examples
    • Patterns
    • Best practices

database/
└── (database documentation)       🗄️ DATABASE
    • Schema documentation
    • Queries
    • Optimization

security/
└── (security documentation)       🔒 SECURITY
    • Security architecture
    • Best practices
    • Threat models

deployment/
└── (deployment guides)            🚀 DEPLOYMENT
    • Deployment process
    • Configuration
    • Monitoring

entropy/
└── (entropy system docs)          🎲 ENTROPY
    • Entropy collection
    • Shuffle algorithm
    • Verification

websocket/
└── (WebSocket protocol)           🔌 WEBSOCKET
    • Protocol specification
    • Message types
    • Examples

testing/
└── (testing documentation)        🧪 TESTING
    • Testing strategy
    • Test examples
    • Coverage
```

---

## ⚙️ 8. CONFIGURATION FILES

### **ROOT CONFIG**
Location: `poker-engine/`

```
package.json                       📦 NPM PACKAGE ⭐ DEPENDENCIES
  • All dependencies:
    - @supabase/supabase-js (database)
    - express (web server)
    - socket.io (WebSocket)
    - jsonwebtoken (auth)
    - bcryptjs (passwords)
    - cors (security)
    - dotenv (environment)
    - TypeScript (language)
    - Jest (testing)
  • Scripts:
    - npm run build
    - npm start
    - npm test
    - npm run dev
  • Metadata

package-lock.json                  🔒 DEPENDENCY LOCK
  • Locked versions
  • Dependency tree
  • Reproducible installs

tsconfig.json                      📝 TYPESCRIPT CONFIG
  • Compiler options
  • Target: ES2020
  • Module: commonjs
  • Strict mode (disabled)
  • Output directory
  • Source maps

jest.config.js                     🃏 JEST CONFIG
  • Test framework config
  • Test patterns
  • Coverage settings
  • Transform rules
  • Setup files

nodemon.json                       🔄 NODEMON CONFIG
  • Auto-reload config
  • Watch patterns
  • Ignore patterns
  • Delay settings

.eslintrc.js                       📏 ESLINT CONFIG
  • Linting rules
  • Code style
  • Error checking
  • TypeScript support

.gitignore                         🚫 GIT IGNORE
  • node_modules/
  • dist/
  • .env
  • logs/
  • Coverage reports
```

### **ENVIRONMENT FILES**
Location: `poker-engine/`

```
test.env                           🧪 TEST ENVIRONMENT ⭐ CURRENT
  • Development configuration
  • Database URL (Supabase)
  • JWT secrets
  • Server secrets
  • Port (3000)
  • CORS settings
  • Feature flags
  • Logging level

env.example                        📋 ENV TEMPLATE
  • Example .env file
  • Variable documentation
  • Default values
  • Setup guide
```

---

## 🎯 9. BUILD / DISTRIBUTION FILES

### **COMPILED OUTPUT**
Location: `poker-engine/dist/`

```
dist/                              📦 COMPILED JAVASCRIPT
  • Compiled TypeScript → JavaScript
  • Production-ready code
  • Source maps (optional)
  • Declaration files
  
  Structure mirrors src/:
  ├── core/
  │   ├── card/
  │   ├── engine/
  │   └── models/
  ├── services/
  ├── api/
  ├── types/
  └── index.js
```

---

## 🔗 10. BRIDGE / INTEGRATION FILES

### **PYTHON INTEGRATION**
Location: `poker-engine/src/bridge/`

```
poker-engine-bridge.ts             🌉 TYPESCRIPT BRIDGE
  • TypeScript side of bridge
  • Communication with Python
  • Type conversions
  • Error handling

poker_bridge.py                    🐍 PYTHON BRIDGE
  • Python side of bridge
  • Integration with poker-master
  • Data serialization
  • API wrapper
```

---

## 📊 11. REFERENCE IMPLEMENTATIONS

### **PYTHON POKER LIBRARIES**
Location: Root level (reference only)

```
poker-master/                      🐍 PYTHON POKER LIBRARY
  • Python poker implementation
  • Hand evaluation reference
  • Rule implementation
  • NOT USED IN PRODUCTION
  • Reference only

PyPokerEngine-master/              🐍 PYTHON POKER ENGINE
  • Another Python implementation
  • Game engine reference
  • AI examples
  • NOT USED IN PRODUCTION
  • Reference only
```

---

## 🎨 12. ASSETS & RESOURCES

### **CARD IMAGES**
Location: `poker-engine/cards/` and `playing-cards-master/`

```
cards/                             🎴 CARD IMAGES (54 files)
  • 52 card PNGs
  • 2 back designs
  • Format: suit_rank.png
  • Example: hearts_A.png
  • High quality images

playing-cards-master/              🎴 ORIGINAL CARD ASSETS
  • Source card designs
  • Sketch files
  • Various formats
  • Design resources
```

---

## 🚀 13. PRODUCTION / SERVER FILES

Location: `poker-engine/src/`

```
app.ts                             🚀 APP INITIALIZATION
  • Express app setup
  • Middleware registration
  • Route mounting
  • Error handlers
  • Server configuration

production-server.ts               🏭 PRODUCTION SERVER
  • Production-optimized server
  • Enhanced security
  • Performance tuning
  • Logging
  • Monitoring

index.ts                           📍 MAIN ENTRY POINT
  • Application entry
  • Server startup
  • Initialization
  • Export main app
```

---

## 📝 14. DEMO / EXAMPLE FILES

Location: `poker-engine/src/demo/`

```
poker-engine-demo.ts               🎮 ENGINE DEMO
  • Demonstrates engine usage
  • Example game flow
  • Code examples
  • Learning resource
```

---

## 📊 15. LOGS & MONITORING

Location: `poker-engine/logs/`

```
logs/                              📝 LOG DIRECTORY
  • Application logs
  • Error logs
  • Access logs
  • Debug logs
  • Rotated log files
  • (gitignored)
```

---

## 🎯 KEY FILE PRIORITIES

### **🔴 CRITICAL - Must Understand**

```
1. poker-engine/poker-test.html                    (UI)
2. poker-engine/fixed-sophisticated-server.js      (Server)
3. src/core/engine/game-state-machine.ts          (Game Flow)
4. src/core/engine/betting-engine.ts              (Betting)
5. src/core/engine/hand-evaluator.ts              (Hand Ranking)
6. src/core/engine/pot-manager.ts                 (Pots)
7. src/core/card/deck.ts                          (Cards)
8. src/types/game.types.ts                        (Types)
9. src/services/database/supabase.ts              (Database)
10. database/migrations/001_initial_schema.sql     (Schema)
```

### **🟠 IMPORTANT - Should Understand**

```
11. src/core/engine/round-manager.ts              (Rounds)
12. src/core/engine/turn-manager.ts               (Turns)
13. src/core/engine/action-validator.ts           (Validation)
14. src/services/game-service.ts                  (Service Layer)
15. src/api/controllers/games.controller.ts       (API)
16. src/api/routes/games.routes.ts                (Routes)
17. src/websocket/server.ts                       (Real-time)
18. src/services/auth/auth-service.ts             (Auth)
19. src/services/database/repos/*.repo.ts         (Data Access)
20. src/config/environment.ts                     (Config)
```

### **🟡 USEFUL - Good to Know**

```
21. src/utils/*.ts                                (Utilities)
22. src/middleware/auth-middleware.ts             (Middleware)
23. src/services/database/transaction-manager.ts  (Transactions)
24. tests/unit/*.test.ts                          (Tests)
25. All documentation files                       (Docs)
```

---

## 🗂️ FILE COUNT SUMMARY

```
Total Project Files: 200+

Breakdown:
├── Core Game Logic:          ~25 files
├── Backend/API:              ~20 files
├── Database:                 ~15 files
├── UI/Frontend:              ~10 files
├── Tests:                    ~15 files
├── Configuration:            ~10 files
├── Documentation:            ~20 files
├── Assets (cards):           ~60 files
├── Utility/Helper:           ~10 files
└── Reference/Other:          ~15 files
```

---

## 🎓 LEARNING PATH

### **For New Developers:**

```
Day 1: Understanding the Project
  1. Read: README.md
  2. Read: COMPREHENSIVE_PROJECT_SPEC.md
  3. Explore: poker-test.html (UI)
  4. Run: fixed-sophisticated-server.js
  5. Play: Test the game locally

Day 2: Core Game Logic
  1. Study: src/core/card/ (all files)
  2. Study: src/core/engine/hand-evaluator.ts
  3. Study: src/core/engine/betting-engine.ts
  4. Study: src/types/game.types.ts
  5. Read: tests/unit/hand-evaluator.test.ts

Day 3: Game State & Flow
  1. Study: src/core/engine/game-state-machine.ts
  2. Study: src/core/models/game-state.ts
  3. Study: src/core/engine/pot-manager.ts
  4. Study: src/core/engine/round-manager.ts
  5. Run: test-complete-functionality.js

Day 4: Backend & Database
  1. Study: database/migrations/001_initial_schema.sql
  2. Study: src/services/database/supabase.ts
  3. Study: src/services/database/repos/*.repo.ts
  4. Study: src/api/controllers/games.controller.ts
  5. Read: Database documentation

Day 5: Real-time & Integration
  1. Study: src/websocket/server.ts
  2. Study: src/services/game-service.ts
  3. Study: src/api/routes/games.routes.ts
  4. Study: fixed-sophisticated-server.js
  5. Test: WebSocket connections

Day 6-7: Advanced Topics
  1. Authentication system
  2. Transaction management
  3. Error handling
  4. Testing strategy
  5. Deployment process
```

---

## 🔍 QUICK FILE LOOKUP

### **Need to find a file? Use this reference:**

```
Authentication?              → src/services/auth/
Betting logic?              → src/core/engine/betting-engine.ts
Card handling?              → src/core/card/
Database queries?           → src/services/database/repos/
Game state?                 → src/core/models/game-state.ts
Hand evaluation?            → src/core/engine/hand-evaluator.ts
Pot management?             → src/core/engine/pot-manager.ts
Server startup?             → fixed-sophisticated-server.js
Type definitions?           → src/types/
UI/Frontend?                → poker-test.html
WebSocket?                  → src/websocket/server.ts

Need to:
- Add new feature?          → Start with game-state-machine.ts
- Fix bug?                  → Check relevant test file first
- Add API endpoint?         → api/routes/ & api/controllers/
- Modify database?          → database/migrations/
- Change UI?                → poker-test.html
- Add authentication?       → services/auth/
- Optimize performance?     → Check utils/ and repos/
```

---

## ✅ FILE MAP COMPLETE

**Total documented:** ~150+ individual files  
**Categories covered:** 15  
**Level of detail:** Comprehensive  
**Missing files:** None (all important files documented)

---

**Last Updated:** {{ current_date }}  
**Maintainer:** Development Team  
**Status:** Complete and up-to-date

---

*This file map is your complete reference guide to every important file in the POKEHER project. Use it to navigate the codebase, understand file purposes, and locate specific functionality quickly.*

