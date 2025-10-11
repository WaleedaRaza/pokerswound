# 🎰 POKEHER - COMPREHENSIVE PROJECT SPECIFICATION
## Extreme Detail for Advanced Project Planning

---

## 📋 EXECUTIVE SUMMARY

**Project Name**: POKEHER  
**Project Type**: Real-Time Multiplayer Online Poker Platform  
**Vision**: Build the world's most transparent and trusted online poker platform with provably random shuffling using real-world entropy sources  
**Current Stage**: MVP Core Engine Complete → Moving to Production Infrastructure  
**Target Launch**: 6-12 weeks to full MVP  
**Unique Value Proposition**: First poker platform with cryptographically verifiable, entropy-based shuffling from YouTube video frames

---

## 🎯 CORE VALUES & PRINCIPLES

### 1. **Transparency & Trust**
- **Provably Fair Gaming**: Every card shuffle can be independently verified
- **Public Audit Trail**: All game actions and entropy sources logged publicly
- **Open Algorithm**: Shuffling algorithm publicly documented and auditable
- **Community Verification**: CLI tools for players to verify shuffle fairness

### 2. **Security & Integrity**
- **Server-Side Authority**: Zero client-trusted data
- **Financial Integrity**: All chip transactions in atomic database operations
- **Anti-Cheat First**: Multi-layer cheat detection and prevention
- **Audit Everything**: Complete immutable log of all actions

### 3. **Performance & Reliability**
- **Sub-100ms Latency**: Real-time game state updates
- **99.9% Uptime Target**: Production-grade reliability
- **Graceful Degradation**: System recovers from failures automatically
- **Scalable Architecture**: Horizontal scaling for 1000+ concurrent games

### 4. **User Experience Excellence**
- **Beautiful UI**: Casino-quality visual design
- **Smooth Animations**: Professional card dealing and chip movements
- **Responsive Design**: Mobile-first, works everywhere
- **Intuitive Controls**: Clear, obvious player actions

### 5. **Developer Experience**
- **Type Safety**: Full TypeScript throughout
- **Immutable State**: Predictable state management
- **Comprehensive Testing**: Unit, integration, E2E coverage
- **Clear Documentation**: Every system fully documented

---

## 🏗️ SYSTEM ARCHITECTURE

### **Architecture Pattern**: Event-Driven Microservices with Monolithic Core

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  Next.js Frontend    │    React Native App    │   CLI Tools     │
│  (Web Browser)       │    (iOS/Android)       │   (Verifier)    │
└──────────────┬────────────────┬─────────────────────┬───────────┘
               │                │                     │
               │ HTTPS/WSS      │ HTTPS/WSS          │ HTTPS
               │                │                     │
┌──────────────▼────────────────▼─────────────────────▼───────────┐
│                    API GATEWAY LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  • Authentication Middleware (JWT Verification)                  │
│  • Rate Limiting (Per-user & Per-IP)                            │
│  • Request Validation & Sanitization                            │
│  • Load Balancing & Request Routing                             │
│  • CORS & Security Headers                                       │
└──────────────┬──────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────┐  ┌───────────────────┐                   │
│  │  REST API Server  │  │  WebSocket Server │                   │
│  │  (Express.js)     │  │  (Socket.IO)      │                   │
│  └─────────┬─────────┘  └─────────┬─────────┘                   │
│            │                      │                              │
│  ┌─────────▼──────────────────────▼─────────┐                   │
│  │         GAME COORDINATOR SERVICE          │                   │
│  │  • Orchestrates all game operations       │                   │
│  │  • Manages game lifecycle                 │                   │
│  │  • Coordinates cross-service operations   │                   │
│  └─────────┬─────────────────────────────────┘                   │
│            │                                                      │
│  ┌─────────▼─────────────────────────────────────┐               │
│  │           CORE GAME ENGINE                    │               │
│  ├───────────────────────────────────────────────┤               │
│  │  ┌────────────────┐  ┌─────────────────────┐ │               │
│  │  │ State Machine  │  │  Betting Engine     │ │               │
│  │  │ • Game phases  │  │  • Action validation│ │               │
│  │  │ • Transitions  │  │  • Pot management   │ │               │
│  │  └────────────────┘  └─────────────────────┘ │               │
│  │                                               │               │
│  │  ┌────────────────┐  ┌─────────────────────┐ │               │
│  │  │ Round Manager  │  │  Hand Evaluator     │ │               │
│  │  │ • Street logic │  │  • 7-card best hand │ │               │
│  │  │ • Dealer button│  │  • Tie breaking     │ │               │
│  │  └────────────────┘  └─────────────────────┘ │               │
│  └───────────────────────────────────────────────┘               │
│                                                                   │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│                    SERVICE LAYER                                   │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Auth Service │  │ User Service │  │  Entropy Service       │  │
│  │ • JWT tokens │  │ • Profiles   │  │  • YouTube API         │  │
│  │ • Sessions   │  │ • Friends    │  │  • Video processing    │  │
│  └──────────────┘  └──────────────┘  │  • Audio analysis      │  │
│                                       │  • Crypto shuffle      │  │
│  ┌──────────────┐  ┌──────────────┐  └────────────────────────┘  │
│  │ Room Service │  │ Chip Service │                               │
│  │ • Creation   │  │ • Balances   │  ┌────────────────────────┐  │
│  │ • Invites    │  │ • Transfers  │  │  Connection Manager    │  │
│  └──────────────┘  └──────────────┘  │  • Heartbeats          │  │
│                                       │  • Reconnection        │  │
│  ┌──────────────┐  ┌──────────────┐  │  • Session recovery    │  │
│  │ State Sync   │  │ Notification │  └────────────────────────┘  │
│  │ Service      │  │ Service      │                               │
│  └──────────────┘  └──────────────┘  ┌────────────────────────┐  │
│                                       │  Audit Service         │  │
│  ┌──────────────┐  ┌──────────────┐  │  • Action logging      │  │
│  │ Recovery Svc │  │ Monitoring   │  │  • Security events     │  │
│  │ • Cleanup    │  │ Service      │  └────────────────────────┘  │
│  └──────────────┘  └──────────────┘                               │
│                                                                    │
└───────────────────────────┬────────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────────┐
│                    DATA PERSISTENCE LAYER                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              SUPABASE (PostgreSQL)                          │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │    Users     │  │    Rooms     │  │      Games       │  │  │
│  │  │  • Auth      │  │  • Config    │  │  • State         │  │  │
│  │  │  • Profiles  │  │  • Seats     │  │  • Hands         │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │  │
│  │                                                             │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │    Players   │  │   Actions    │  │   Transactions   │  │  │
│  │  │  • Sessions  │  │  • History   │  │  • Chip ledger   │  │  │
│  │  │  • Stats     │  │  • Sequence  │  │  • Immutable     │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │  │
│  │                                                             │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │     Pots     │  │   Entropy    │  │   Audit Logs     │  │  │
│  │  │  • Main pot  │  │  • Sources   │  │  • All actions   │  │  │
│  │  │  • Side pots │  │  • Shuffles  │  │  • Security      │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              REDIS (Optional - Caching Layer)               │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  • Session cache                                            │  │
│  │  • Game state cache (hot games)                             │  │
│  │  • Presence/online status                                   │  │
│  │  • Rate limiting counters                                   │  │
│  │  • Pub/Sub for real-time events                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 💻 COMPLETE TECH STACK

### **Backend Core**
```yaml
Runtime: Node.js v18+
Language: TypeScript 5.0+
Framework: Express.js 4.18
Real-time: Socket.IO 4.8
Process Manager: PM2 (production)
Build Tool: TypeScript Compiler (tsc)
Package Manager: npm
```

### **Database & Storage**
```yaml
Primary Database: Supabase (PostgreSQL 15+)
  - Row Level Security (RLS) enabled
  - Real-time subscriptions
  - Connection pooling via pgBouncer
  
Caching (Optional): Redis 7+
  - Session storage
  - Hot game state
  - Presence system
  
File Storage: Supabase Storage
  - User avatars
  - Game replay data
  - Entropy audit files
```

### **Authentication & Security**
```yaml
Auth Provider: Supabase Auth
  - Email/Password
  - OAuth (Google, Discord)
  - Magic links
  
Token System: JWT (RS256)
  - Access tokens (15min expiry)
  - Refresh tokens (30 day expiry)
  - Session management
  
Password Hashing: bcrypt (12 rounds)
Encryption: 
  - TLS 1.3 for transport
  - AES-256 for sensitive data at rest
```

### **Frontend Stack**
```yaml
Web Framework: Next.js 14
  - App Router
  - Server Components
  - API Routes
  
UI Library: React 18+
State Management: Zustand + React Query
Styling: Tailwind CSS 3.4
UI Components: Shadcn/ui
Animation: Framer Motion
Real-time Client: Socket.IO Client
HTTP Client: Axios

Mobile:
  Framework: React Native
  Navigation: React Navigation
  State: Same as web (Zustand)
```

### **Development Tools**
```yaml
TypeScript: Full strict mode
Linting: ESLint with TypeScript plugin
Formatting: Prettier
Testing:
  - Unit: Jest
  - Integration: Jest + Supertest
  - E2E: Playwright/Cypress
Git Hooks: Husky + lint-staged
Version Control: Git
Monorepo Tool: Turborepo (future)
```

### **DevOps & Deployment**
```yaml
Backend Hosting: 
  - Primary: Render.com / Fly.io
  - Alternative: Railway / Heroku
  
Frontend Hosting: Vercel
  - Edge network
  - Automatic deployments
  - Preview environments
  
Database: Supabase Cloud
  - Auto-scaling
  - Automatic backups
  - Point-in-time recovery
  
CI/CD: GitHub Actions
  - Automated testing
  - Type checking
  - Deployment pipelines
  
Monitoring:
  - Error Tracking: Sentry
  - Logging: Supabase Logs + Winston
  - APM: Built-in metrics
  - Uptime: UptimeRobot
```

### **External APIs & Services**
```yaml
Entropy Collection:
  - YouTube Data API v3
  - Twitch API (future)
  - NOAA Weather API (future)
  
Communication:
  - Email: SendGrid / Postmark
  - SMS: Twilio (optional)
  - Push Notifications: Firebase Cloud Messaging
  
Analytics:
  - Mixpanel / PostHog
  - Google Analytics 4
```

---

## 🎮 COMPREHENSIVE FEATURE SET

### **PHASE 1: MVP CORE FEATURES** (Current + Next 6 weeks)

#### **1.1 User Management**
```typescript
Features:
  ✅ User registration (email/password)
  ✅ Email verification
  ✅ Login/Logout
  ✅ Password reset flow
  ✅ OAuth (Google, Discord)
  ✅ User profiles
  ✅ Avatar upload/selection
  ✅ Display name customization
  ✅ Account settings
  ✅ Session management
  ✅ Device tracking
  ✅ Account deletion

Technical Details:
  - JWT access tokens (15min expiry)
  - HTTP-only refresh tokens (30 day)
  - Secure session storage
  - Rate limiting on auth endpoints
  - CSRF protection
  - Password strength enforcement
  - Account lockout after failed attempts
```

#### **1.2 Friend System**
```typescript
Features:
  ✅ Add friends by username
  ✅ Friend requests
  ✅ Accept/Reject requests
  ✅ Remove friends
  ✅ Online status indicators
  ✅ Friend list with search
  ✅ Block/Unblock users
  ✅ Friend activity feed
  ❌ Direct messaging (future)
  ❌ Friend stats comparison (future)

Data Models:
  - friendships table
  - friend_requests table
  - blocked_users table
  - online_presence cache (Redis)
```

#### **1.3 Room Management**
```typescript
Features:
  ✅ Create poker rooms/tables
  ✅ Configurable settings:
     - Game type (Texas Hold'em, Omaha)
     - Blind structure (small blind, big blind, ante)
     - Buy-in limits (min/max)
     - Player count (2-10)
     - Turn time limit
     - Timebank allocation
     - Privacy (public/private/password)
  ✅ Shareable room links
  ✅ Unique invite codes (e.g., FRIDAY-NIGHT-POKER)
  ✅ QR code generation
  ✅ Room persistence
  ✅ Room favorites/bookmarks
  ✅ Spectator mode
  ✅ Waiting list for full tables
  ✅ Kick players (owner only)
  ✅ Room chat
  ✅ Room history

Room URL Format:
  - https://poker.app/room/INVITE-CODE
  - https://poker.app/r/ABC123 (short format)
```

#### **1.4 Core Poker Gameplay** ✅ COMPLETE
```typescript
Game Rules: Texas Hold'em (No-Limit)

Implemented Features:
  ✅ 2-10 players per table
  ✅ Deck management (standard 52-card deck)
  ✅ Card shuffling (crypto-secure random)
  ✅ Dealing (2 hole cards per player, 5 community)
  ✅ Betting rounds (preflop, flop, turn, river)
  ✅ All player actions:
     - Fold
     - Check
     - Call
     - Bet
     - Raise
     - All-in
  ✅ Blind posting (small blind, big blind)
  ✅ Ante support
  ✅ Dealer button rotation
  ✅ Position management
  ✅ Turn order enforcement
  ✅ Action validation
  ✅ Pot management:
     - Main pot
     - Side pots (multiple)
     - All-in scenarios
     - Split pots
  ✅ Hand evaluation:
     - All poker hand rankings
     - 7-card best hand selection
     - Kicker comparison
     - Tie breaking
  ✅ Winner determination
  ✅ Pot distribution
  ✅ Multi-way all-in handling
  ✅ Stack updates
  ✅ Auto-fold on disconnect (30s timeout)
  ✅ Timebank system

Hand Rankings (Implemented):
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
```

#### **1.5 Real-Time Communication**
```typescript
WebSocket Implementation:
  Protocol: Socket.IO (WebSocket + fallbacks)
  
Events (Server → Client):
  - game:state_update (full state)
  - game:action_taken (player action)
  - game:street_change (new card dealt)
  - game:pot_update (pot changes)
  - game:winner_declared (hand result)
  - player:joined (new player)
  - player:left (player disconnected)
  - player:turn (whose turn it is)
  - room:chat_message (chat)
  - system:notification (system messages)
  
Events (Client → Server):
  - game:join (join table)
  - game:leave (leave table)
  - game:action (player action)
  - game:sitout (sit out next hand)
  - game:sitin (sit in next hand)
  - room:chat_send (send chat)
  
Connection Management:
  - Automatic reconnection
  - Heartbeat/ping-pong
  - Session restoration
  - State resync on reconnect
  - Connection quality monitoring
  
Performance Targets:
  - Message latency: <50ms
  - State update: <100ms
  - Reconnection time: <2s
```

#### **1.6 Session & State Management**
```typescript
Features:
  ✅ Persistent sessions across browser sessions
  ✅ Multiple device support
  ✅ Session revocation
  ✅ "Remember me" functionality
  ✅ Automatic session refresh
  ✅ Graceful degradation on disconnect
  ✅ State recovery after crash
  ✅ Game state persistence
  ✅ Action history
  ✅ Replay capability

State Management:
  - Server is single source of truth
  - Immutable state transitions
  - Event sourcing for actions
  - State snapshots in database
  - State reconstruction from action log
  - Optimistic UI updates
```

---

### **PHASE 2: ADVANCED FEATURES** (Weeks 7-12)

#### **2.1 Entropy-Based Shuffling System** ⭐ UNIQUE FEATURE
```typescript
Overview:
  Revolutionary shuffling system using real-world entropy sources
  to generate provably random, auditable card shuffles.

Entropy Sources:
  
  1. YouTube Video Frames:
     - API: YouTube Data API v3
     - Process:
       a) Fetch trending videos (5-10 videos)
       b) Extract specific timestamp frames
       c) Generate SHA-256 hash of pixel data
       d) Combine hashes with XOR operation
     - Fallback: Use video metadata if frame access fails
     
  2. Audio Frequency Analysis:
     - Extract audio frequency spectrum
     - Analyze amplitude at specific frequencies
     - Generate entropy from frequency distribution
     - Use Web Audio API for browser-based verification
     
  3. Timestamp Microseconds:
     - High-resolution timestamp at shuffle moment
     - Nanosecond precision
     - Used as additional entropy mixing
     
  4. Server Entropy Pool:
     - Cryptographically secure random bytes
     - /dev/urandom on Linux
     - crypto.randomBytes() in Node.js
     
  5. Fallback Entropy Sources:
     - NOAA weather data API
     - Blockchain block hashes
     - Earthquake seismograph data
     - Stock market tick data

Shuffle Algorithm:
  
  Step 1: Entropy Collection
    - Collect from all available sources
    - Generate individual hashes (SHA-256)
    - Combine with bitwise XOR
    
  Step 2: Master Seed Generation
    - Input: Combined entropy + game ID + timestamp
    - Algorithm: HMAC-SHA256(entropy, game_id + timestamp)
    - Output: 256-bit master seed
    
  Step 3: Deterministic Shuffle
    - Algorithm: Fisher-Yates shuffle with seeded PRNG
    - PRNG: HMAC-DRBG (NIST SP 800-90A)
    - Input: Master seed
    - Output: Shuffled deck (52 card permutation)
    
  Step 4: Commit-Reveal Protocol
    - Commit: Hash of shuffled deck published before hand
    - Reveal: After hand, reveal deck + entropy sources
    - Verify: Players can reconstruct shuffle independently

Verification System:
  
  Players Can Verify:
    1. Download entropy sources (URLs, timestamps)
    2. Download shuffle proof (master seed, algorithm)
    3. Run verification CLI tool
    4. Reconstruct shuffle independently
    5. Compare with published shuffle
  
  Audit Trail:
    - All entropy sources logged
    - Timestamps recorded
    - API responses archived
    - Shuffle proofs stored permanently
    - Public verification page per hand

Implementation:
  
  Files to Create:
    src/services/entropy/
      ├── entropy-coordinator.ts       # Main orchestrator
      ├── youtube-entropy.ts           # YouTube API integration
      ├── audio-entropy.ts             # Audio analysis
      ├── timestamp-entropy.ts         # Timestamp entropy
      ├── fallback-entropy.ts          # Fallback sources
      └── entropy-combiner.ts          # Combine all sources
    
    src/services/shuffle/
      ├── hmac-drbg.ts                 # NIST-compliant DRBG
      ├── fisher-yates.ts              # Shuffle algorithm
      ├── shuffle-prover.ts            # Generate proofs
      └── shuffle-verifier.ts          # Verify shuffles
    
    src/api/routes/
      └── verification.routes.ts       # Public verification API
    
  External Tools:
    cli/shuffle-verifier/              # Standalone CLI verifier
      ├── verify.ts                    # Main verification logic
      ├── README.md                    # Usage instructions
      └── package.json                 # Dependencies

Database Schema:
  
  entropy_sources table:
    - id (uuid)
    - hand_id (uuid)
    - source_type (youtube|audio|timestamp|fallback)
    - source_url (text)
    - source_data (jsonb)
    - entropy_hash (text)
    - collected_at (timestamp)
  
  shuffle_proofs table:
    - id (uuid)
    - hand_id (uuid)
    - master_seed (text)
    - combined_entropy_hash (text)
    - deck_order_hash (text)
    - algorithm_version (text)
    - created_at (timestamp)
  
  shuffle_verifications table:
    - id (uuid)
    - hand_id (uuid)
    - verifier_user_id (uuid, nullable)
    - verified_at (timestamp)
    - verification_result (boolean)
    - verifier_ip (inet)
```

#### **2.2 Tournament System**
```typescript
Features:
  ❌ Sit & Go tournaments
  ❌ Multi-table tournaments (MTT)
  ❌ Tournament registration
  ❌ Buy-ins and prize pools
  ❌ Blind level progression
  ❌ Automatic table balancing
  ❌ Player elimination
  ❌ Final table
  ❌ Prize distribution
  ❌ Tournament history
  ❌ Leaderboards

Tournament Types:
  - Sit & Go (6-max, 9-max)
  - Scheduled MTT
  - Freerolls
  - Satellites
  - Bounty tournaments
  - Turbo/Hyper-turbo
```

#### **2.3 Advanced Statistics**
```typescript
Player Stats:
  - Hands played
  - Hands won
  - Win rate
  - Average pot size
  - Biggest win/loss
  - VPIP (Voluntarily Put in Pot)
  - PFR (Pre-Flop Raise)
  - Aggression factor
  - Showdown win rate
  - All-in win rate
  
Game Analytics:
  - Hand histories
  - Hand replays
  - Action breakdown
  - Position analysis
  - Range analysis
  - HUD (Heads-Up Display)
  
Charts & Graphs:
  - Bankroll graph
  - Win rate over time
  - Session history
  - Hourly rate
```

#### **2.4 Social Features**
```typescript
Features:
  ❌ Private messaging
  ❌ Group chat
  ❌ Player notes
  ❌ Player reporting
  ❌ Mute/Block
  ❌ Friend recommendations
  ❌ Activity feed
  ❌ Achievements/Badges
  ❌ Player profiles with stats
  ❌ Custom emojis/reactions
```

---

### **PHASE 3: ENTERPRISE FEATURES** (Future)

#### **3.1 Mobile Application**
- Native iOS app (React Native)
- Native Android app (React Native)
- Push notifications
- Offline mode (view stats)
- Mobile-optimized UI
- Touch gestures

#### **3.2 AI/Bot Detection**
- Behavioral analysis
- Timing patterns
- Action sequences
- Statistical anomalies
- Multi-account detection
- Collusion detection

#### **3.3 Administrative Tools**
- Admin dashboard
- User management
- Game monitoring
- Financial reports
- Support ticketing
- Moderation tools
- Ban management

---

## 📊 DATA MODELS & DATABASE SCHEMA

### **Complete Entity-Relationship Design**

```sql
-- ============================================
-- CORE DATABASE SCHEMA
-- ============================================

-- Users & Authentication
users (
  id uuid PRIMARY KEY,
  email varchar(255) UNIQUE NOT NULL,
  username varchar(50) UNIQUE NOT NULL,
  password_hash varchar(255) NOT NULL,
  display_name varchar(100),
  avatar_url varchar(500),
  total_chips bigint DEFAULT 1000,
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  role varchar(20) DEFAULT 'player',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login timestamptz,
  email_verified_at timestamptz
)

user_sessions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  refresh_token_hash varchar(255) NOT NULL,
  device_info jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_used timestamptz DEFAULT now(),
  is_revoked boolean DEFAULT false
)

-- Rooms & Tables
rooms (
  id uuid PRIMARY KEY,
  name varchar(100) NOT NULL,
  description text,
  owner_id uuid REFERENCES users(id),
  is_private boolean DEFAULT false,
  invite_code varchar(10) UNIQUE,
  password_hash varchar(255),
  game_type varchar(20) DEFAULT 'TEXAS_HOLDEM',
  small_blind integer NOT NULL,
  big_blind integer NOT NULL,
  ante integer DEFAULT 0,
  max_players integer DEFAULT 6,
  min_players integer DEFAULT 2,
  min_buy_in integer NOT NULL,
  max_buy_in integer NOT NULL,
  turn_time_limit integer DEFAULT 30,
  timebank_seconds integer DEFAULT 60,
  auto_muck_losing_hands boolean DEFAULT true,
  allow_rabbit_hunting boolean DEFAULT false,
  allow_spectators boolean DEFAULT true,
  status varchar(20) DEFAULT 'WAITING',
  current_game_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_at timestamptz
)

room_seats (
  id uuid PRIMARY KEY,
  room_id uuid REFERENCES rooms(id),
  user_id uuid REFERENCES users(id),
  seat_index integer NOT NULL,
  status varchar(20) DEFAULT 'SEATED',
  chips_in_play bigint DEFAULT 0,
  joined_at timestamptz DEFAULT now(),
  last_action_at timestamptz DEFAULT now(),
  left_at timestamptz,
  UNIQUE(room_id, seat_index),
  UNIQUE(room_id, user_id)
)

-- Games & Hands
games (
  id uuid PRIMARY KEY,
  room_id uuid REFERENCES rooms(id),
  game_number integer NOT NULL,
  dealer_position integer NOT NULL,
  small_blind integer NOT NULL,
  big_blind integer NOT NULL,
  ante integer DEFAULT 0,
  status varchar(20) DEFAULT 'WAITING',
  current_state jsonb DEFAULT '{}',
  entropy_seed text,
  hand_number integer DEFAULT 0,
  total_pot decimal(15,2) DEFAULT 0.00,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
)

hands (
  id uuid PRIMARY KEY,
  game_id uuid REFERENCES games(id),
  hand_number integer NOT NULL,
  dealer_position integer NOT NULL,
  small_blind_seat integer NOT NULL,
  big_blind_seat integer NOT NULL,
  current_street varchar(20) DEFAULT 'PREFLOP',
  community_cards jsonb DEFAULT '[]',
  pot_structure jsonb DEFAULT '{}',
  status varchar(20) DEFAULT 'IN_PROGRESS',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  UNIQUE(game_id, hand_number)
)

-- Players in Game
players (
  id uuid PRIMARY KEY,
  game_id uuid REFERENCES games(id),
  user_id uuid REFERENCES users(id),
  seat_index integer NOT NULL,
  stack bigint NOT NULL,
  hole_cards jsonb,
  status varchar(20) DEFAULT 'ACTIVE',
  current_bet decimal(15,2) DEFAULT 0.00,
  total_bet_this_hand decimal(15,2) DEFAULT 0.00,
  last_action varchar(20),
  last_action_amount decimal(15,2),
  last_action_time timestamptz,
  has_folded boolean DEFAULT false,
  is_all_in boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  UNIQUE(game_id, seat_index)
)

-- Actions & History
game_actions (
  id uuid PRIMARY KEY,
  hand_id uuid REFERENCES hands(id),
  game_id uuid REFERENCES games(id),
  player_id uuid REFERENCES players(id),
  user_id uuid REFERENCES users(id),
  street varchar(20) NOT NULL,
  action varchar(20) NOT NULL,
  amount decimal(15,2),
  resulting_pot decimal(15,2),
  resulting_stack decimal(15,2),
  seq integer NOT NULL,
  ip_address inet,
  user_agent text,
  timestamp timestamptz DEFAULT now(),
  UNIQUE(hand_id, seq)
)

-- Pots
pots (
  id uuid PRIMARY KEY,
  hand_id uuid REFERENCES hands(id),
  pot_type varchar(20) NOT NULL,
  amount decimal(15,2) NOT NULL,
  eligible_players jsonb NOT NULL,
  winners jsonb,
  amount_per_winner decimal(15,2),
  created_at timestamptz DEFAULT now(),
  distributed_at timestamptz
)

-- Chip Economy
chips_transactions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  transaction_type varchar(20) NOT NULL,
  amount bigint NOT NULL,
  balance_before bigint NOT NULL,
  balance_after bigint NOT NULL,
  room_id uuid REFERENCES rooms(id),
  game_id uuid REFERENCES games(id),
  hand_id uuid REFERENCES hands(id),
  description text,
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES users(id),
  ip_address inet,
  user_agent text,
  processed_at timestamptz DEFAULT now()
)

-- Entropy & Shuffling
entropy_sources (
  id uuid PRIMARY KEY,
  hand_id uuid REFERENCES hands(id),
  source_type varchar(50) NOT NULL,
  source_url text,
  source_data jsonb,
  entropy_hash varchar(64) NOT NULL,
  collected_at timestamptz DEFAULT now()
)

shuffle_proofs (
  id uuid PRIMARY KEY,
  hand_id uuid REFERENCES hands(id),
  master_seed varchar(64) NOT NULL,
  combined_entropy_hash varchar(64) NOT NULL,
  deck_order_hash varchar(64) NOT NULL,
  algorithm_version varchar(20) NOT NULL,
  proof_data jsonb,
  created_at timestamptz DEFAULT now()
)

-- Audit & Security
audit_log (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  action varchar(50) NOT NULL,
  resource_type varchar(50),
  resource_id uuid,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  success boolean NOT NULL,
  error_message text,
  created_at timestamptz DEFAULT now()
)

-- Indexes for Performance
CREATE INDEX idx_games_room_status ON games(room_id, status);
CREATE INDEX idx_hands_game_hand_number ON hands(game_id, hand_number);
CREATE INDEX idx_players_game_active ON players(game_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_actions_hand_seq ON game_actions(hand_id, seq);
CREATE INDEX idx_actions_timestamp ON game_actions(timestamp DESC);
CREATE INDEX idx_chips_user_processed ON chips_transactions(user_id, processed_at DESC);
CREATE INDEX idx_entropy_hand ON entropy_sources(hand_id);
CREATE INDEX idx_audit_user_action ON audit_log(user_id, action, created_at DESC);
```

### **TypeScript Type Definitions**

```typescript
// Core Types
export type UUID = string;
export type Chips = number;
export type SeatIndex = number; // 0-9
export type Timestamp = string; // ISO 8601

// Enums
export enum GameStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

export enum Street {
  PREFLOP = 'PREFLOP',
  FLOP = 'FLOP',
  TURN = 'TURN',
  RIVER = 'RIVER',
  SHOWDOWN = 'SHOWDOWN'
}

export enum ActionType {
  FOLD = 'FOLD',
  CHECK = 'CHECK',
  CALL = 'CALL',
  BET = 'BET',
  RAISE = 'RAISE',
  ALL_IN = 'ALL_IN',
  SMALL_BLIND = 'SMALL_BLIND',
  BIG_BLIND = 'BIG_BLIND',
  ANTE = 'ANTE'
}

export enum PlayerStatus {
  ACTIVE = 'ACTIVE',
  FOLDED = 'FOLDED',
  ALL_IN = 'ALL_IN',
  SITTING_OUT = 'SITTING_OUT',
  DISCONNECTED = 'DISCONNECTED'
}

// Card Types
export enum Suit {
  CLUBS = 'c',
  DIAMONDS = 'd',
  HEARTS = 'h',
  SPADES = 's'
}

export enum Rank {
  Two = '2', Three = '3', Four = '4', Five = '5',
  Six = '6', Seven = '7', Eight = '8', Nine = '9',
  Ten = 'T', Jack = 'J', Queen = 'Q', King = 'K', Ace = 'A'
}

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type Hole2 = readonly [Card, Card];
export type CommunityCards = readonly Card[];
export type Deck = readonly Card[];

// Game State
export interface PlayerSnapshot {
  uuid: UUID;
  name: string;
  stack: Chips;
  seatIndex: SeatIndex;
  hole?: Hole2;
  hasFolded: boolean;
  isAllIn: boolean;
  lastAction?: ActionType;
  betThisStreet: Chips;
  totalBetThisHand: Chips;
  status: PlayerStatus;
}

export interface PotBreakdown {
  main: Chips;
  sidePots: Array<{
    amount: Chips;
    eligiblePlayers: UUID[];
  }>;
}

export interface Action {
  player: UUID;
  type: ActionType;
  amount?: Chips;
  timestamp: Timestamp;
}

export interface TableSnapshot {
  dealerPosition: SeatIndex;
  smallBlindPosition: SeatIndex;
  bigBlindPosition: SeatIndex;
  community: CommunityCards;
  currentStreet: Street;
  toAct: UUID | null;
}

export interface GameStateSnapshot {
  id: UUID;
  roomId: UUID;
  handNumber: number;
  status: GameStatus;
  players: readonly PlayerSnapshot[];
  table: TableSnapshot;
  pot: PotBreakdown;
  actionHistory: readonly Action[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Hand Evaluation
export enum HandRanking {
  HighCard = 1,
  Pair = 2,
  TwoPair = 3,
  ThreeOfAKind = 4,
  Straight = 5,
  Flush = 6,
  FullHouse = 7,
  FourOfAKind = 8,
  StraightFlush = 9,
  RoyalFlush = 10
}

export interface HandRank {
  ranking: HandRanking;
  primaryRank: number;
  secondaryRank: number;
  kickers: number[];
  cards: Card[];
}

export interface WinnerResult {
  winners: UUID[];
  handRank: HandRank;
  description: string;
  potAmount: Chips;
}

// API Request/Response Types
export interface CreateGameRequest {
  roomId: UUID;
  smallBlind: Chips;
  bigBlind: Chips;
  ante?: Chips;
  maxPlayers?: number;
}

export interface JoinGameRequest {
  gameId: UUID;
  buyIn: Chips;
  seatIndex?: SeatIndex;
}

export interface PlayerActionRequest {
  gameId: UUID;
  action: ActionType;
  amount?: Chips;
}

export interface GameStateResponse {
  success: boolean;
  data: GameStateSnapshot;
  error?: string;
}

// WebSocket Message Types
export interface WSMessage {
  type: string;
  payload: unknown;
  timestamp: Timestamp;
}

export interface GameUpdateMessage extends WSMessage {
  type: 'game:state_update';
  payload: GameStateSnapshot;
}

export interface ActionTakenMessage extends WSMessage {
  type: 'game:action_taken';
  payload: {
    player: UUID;
    action: ActionType;
    amount?: Chips;
  };
}

export interface PlayerJoinedMessage extends WSMessage {
  type: 'player:joined';
  payload: {
    player: PlayerSnapshot;
  };
}

export interface TurnUpdateMessage extends WSMessage {
  type: 'player:turn';
  payload: {
    player: UUID;
    timeRemaining: number;
  };
}

// Entropy Types
export interface EntropySource {
  type: 'youtube' | 'audio' | 'timestamp' | 'fallback';
  url?: string;
  data: Record<string, unknown>;
  hash: string;
  collectedAt: Timestamp;
}

export interface ShuffleProof {
  handId: UUID;
  masterSeed: string;
  entropySources: EntropySource[];
  deckOrder: Card[];
  algorithmVersion: string;
  createdAt: Timestamp;
}

export interface ShuffleVerificationResult {
  valid: boolean;
  handId: UUID;
  verifiedAt: Timestamp;
  details: {
    entropySourcesValid: boolean;
    masterSeedValid: boolean;
    deckOrderValid: boolean;
  };
  error?: string;
}
```

---

## 🔒 SECURITY ARCHITECTURE

### **Multi-Layer Security Design**

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 1: PERIMETER SECURITY                   │
├─────────────────────────────────────────────────────────────────┤
│  • DDoS Protection (Cloudflare/AWS Shield)                       │
│  • Rate Limiting (per IP, per user, per endpoint)                │
│  • IP Whitelisting (admin endpoints)                             │
│  • Geo-blocking (suspicious regions)                             │
│  • Bot detection (reCAPTCHA)                                      │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────▼────────────────────────────────┐
│                   LAYER 2: TRANSPORT SECURITY                     │
├───────────────────────────────────────────────────────────────────┤
│  • TLS 1.3 mandatory                                              │
│  • Strong cipher suites only                                      │
│  • HTTP Strict Transport Security (HSTS)                          │
│  • Certificate pinning (mobile apps)                              │
└───────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────▼────────────────────────────────┐
│                  LAYER 3: APPLICATION SECURITY                    │
├───────────────────────────────────────────────────────────────────┤
│  • JWT Authentication (RS256)                                     │
│  • Refresh token rotation                                         │
│  • CSRF protection                                                │
│  • XSS prevention (CSP headers)                                   │
│  • SQL injection prevention (parameterized queries)               │
│  • Input validation & sanitization                                │
│  • Output encoding                                                │
└───────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────▼────────────────────────────────┐
│                   LAYER 4: BUSINESS LOGIC SECURITY                │
├───────────────────────────────────────────────────────────────────┤
│  • Server-side validation ONLY                                    │
│  • No client-trusted data                                         │
│  • State transitions validated                                    │
│  • Action authorization checks                                    │
│  • Financial operation double-verification                        │
└───────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────▼────────────────────────────────┐
│                    LAYER 5: DATA SECURITY                         │
├───────────────────────────────────────────────────────────────────┤
│  • Encryption at rest (AES-256)                                   │
│  • Sensitive data hashing (bcrypt)                                │
│  • Row Level Security (RLS)                                       │
│  • Database connection encryption                                 │
│  • Secrets management (environment variables)                     │
└───────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────▼────────────────────────────────┐
│                   LAYER 6: AUDIT & MONITORING                     │
├───────────────────────────────────────────────────────────────────┤
│  • Complete action logging                                        │
│  • Security event alerting                                        │
│  • Anomaly detection                                              │
│  • Regular security audits                                        │
│  • Penetration testing                                            │
└───────────────────────────────────────────────────────────────────┘
```

### **Authentication Flow**

```
User Registration:
1. User submits email + password
2. Server validates format & strength
3. Password hashed with bcrypt (12 rounds)
4. User created in database
5. Verification email sent
6. Email link clicked → account activated
7. Initial chips allocated (1000)

User Login:
1. User submits credentials
2. Server validates against database
3. If valid:
   a. Generate JWT access token (15min)
   b. Generate refresh token (30 days)
   c. Store refresh token in database
   d. Return tokens to client
4. Access token in Authorization header
5. Refresh token in HTTP-only cookie

Token Refresh:
1. Access token expires
2. Client sends refresh token
3. Server validates refresh token
4. If valid:
   a. Issue new access token
   b. Rotate refresh token (optional)
   c. Update last_used timestamp
5. Return new tokens

Session Revocation:
1. User logs out
2. Server marks refresh token as revoked
3. Optional: Delete all user sessions
4. Client discards all tokens
```

### **Anti-Cheat Measures**

```typescript
// 1. Action Validation
validateAction(player, action, gameState) {
  // Server-side only, never trust client
  - Verify player's turn
  - Validate action type is legal
  - Verify bet amount is valid
  - Check stack sufficient for action
  - Ensure game state allows action
  - Timestamp action for timing analysis
}

// 2. Timing Analysis
detectSuspiciousTiming() {
  - Track action response times
  - Flag instant responses (<100ms)
  - Flag perfectly consistent timing
  - Analyze decision patterns
  - Cross-reference with game situations
}

// 3. Multi-Account Detection
detectMultiAccounting() {
  - IP address correlation
  - Device fingerprinting
  - Behavior pattern matching
  - Similar play styles
  - Timing correlations
  - Never playing against each other
}

// 4. Collusion Detection
detectCollusion() {
  - Unusual folding patterns
  - Soft-playing between specific players
  - Chip dumping detection
  - Win/loss correlation between players
  - Communication pattern analysis
}

// 5. Bot Detection
detectBots() {
  - Superhuman reaction times
  - Perfect GTO play
  - Lack of variation in timing
  - No mouse movement patterns
  - Consistent bet sizing
  - Optical Character Recognition (OCR) patterns
}

// 6. Financial Auditing
auditFinancialIntegrity() {
  - All chip movements logged
  - Sum of all player stacks = constant
  - Pot calculations verified
  - No chips created/destroyed
  - Transaction atomicity
  - Double-entry accounting
}
```

---

## 🚀 DEPLOYMENT ARCHITECTURE

### **Production Infrastructure**

```
┌─────────────────────────────────────────────────────────────────┐
│                       USERS / CLIENTS                             │
│  • Web browsers                                                   │
│  • Mobile apps (iOS/Android)                                      │
│  • CLI verification tools                                         │
└────────────────────────┬──────────────────────────────────────────┘
                         │
                         │ HTTPS/WSS
                         │
┌────────────────────────▼──────────────────────────────────────────┐
│                     CDN / EDGE NETWORK                             │
│  • Cloudflare / Vercel Edge                                        │
│  • Static asset caching                                            │
│  • DDoS protection                                                 │
│  • SSL termination                                                 │
└────────────────────────┬──────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
┌────────▼─────────┐          ┌──────────▼─────────┐
│  FRONTEND        │          │  BACKEND           │
│  (Vercel)        │          │  (Render/Fly.io)   │
├──────────────────┤          ├────────────────────┤
│  Next.js App     │          │  Node.js Server    │
│  • SSR/SSG       │          │  • Express API     │
│  • API Routes    │          │  • Socket.IO       │
│  • Edge Runtime  │          │  • Game Engine     │
│                  │          │                    │
│  Regions:        │          │  Regions:          │
│  • US East       │          │  • US East         │
│  • US West       │          │  • US West         │
│  • Europe        │          │  • Europe          │
│  • Asia          │          │  • Asia            │
└──────────────────┘          └──────────┬─────────┘
                                         │
                         ┌───────────────┴───────────────┐
                         │                               │
              ┌──────────▼─────────┐         ┌──────────▼─────────┐
              │  SUPABASE          │         │  REDIS             │
              │  (Database)        │         │  (Cache/Session)   │
              ├────────────────────┤         ├────────────────────┤
              │  PostgreSQL 15     │         │  Redis 7.x         │
              │  • Row Level Sec   │         │  • Session cache   │
              │  • Real-time       │         │  • Game state      │
              │  • Auth service    │         │  • Presence        │
              │  • Storage         │         │  • Pub/Sub         │
              │                    │         │                    │
              │  Regions:          │         │  Regions:          │
              │  • Multi-AZ        │         │  • Co-located      │
              │  • Auto-scaling    │         │  • HA cluster      │
              │  • Daily backups   │         │  • Persistence     │
              └────────────────────┘         └────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  MONITORING & OBSERVABILITY                       │
├─────────────────────────────────────────────────────────────────┤
│  Error Tracking: Sentry                                           │
│  Logging: Winston → Supabase Logs                                │
│  Metrics: Custom + Prometheus                                     │
│  Uptime: UptimeRobot                                              │
│  APM: New Relic / DataDog (optional)                              │
└─────────────────────────────────────────────────────────────────┘
```

### **Environment Configuration**

```bash
# Development (.env.development)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/poker_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-production
CORS_ORIGIN=http://localhost:3001
ENABLE_DEBUG_LOGS=true

# Staging (.env.staging)
NODE_ENV=staging
PORT=3000
DATABASE_URL=postgresql://user:pass@staging-db.supabase.co/postgres
REDIS_URL=redis://staging-redis.com:6379
JWT_SECRET=staging-secret-from-vault
CORS_ORIGIN=https://staging.poker.app
ENABLE_DEBUG_LOGS=true
SENTRY_DSN=https://xxx@sentry.io/xxx

# Production (.env.production)
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@prod-db.supabase.co/postgres
REDIS_URL=redis://prod-redis.com:6379
JWT_SECRET=production-secret-from-vault
SERVER_SECRET=entropy-seed-secret
CORS_ORIGIN=https://poker.app
ENABLE_DEBUG_LOGS=false
SENTRY_DSN=https://xxx@sentry.io/xxx
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
YOUTUBE_API_KEY=xxx
```

### **Deployment Process**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Type check
        run: npm run type-check
      - name: Lint
        run: npm run lint
      - name: Test
        run: npm test
      - name: Build
        run: npm run build
  
  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Render
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
  
  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: |
          npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

---

## 📈 PERFORMANCE TARGETS

### **API Performance**
```yaml
Response Times (95th percentile):
  GET /api/games/:id: <100ms
  POST /api/games/:id/actions: <150ms
  GET /api/rooms: <50ms
  
Throughput:
  Requests per second: 1000+
  Concurrent connections: 10,000+
  Concurrent games: 1,000+
```

### **WebSocket Performance**
```yaml
Latency:
  Message delivery: <50ms
  State sync: <100ms
  Heartbeat interval: 5s
  
Reliability:
  Message loss rate: <0.01%
  Connection success rate: >99%
  Reconnection time: <2s
```

### **Database Performance**
```yaml
Query Times (95th percentile):
  Simple SELECT: <10ms
  Complex JOIN: <50ms
  INSERT/UPDATE: <20ms
  Transaction: <100ms
  
Connection Pool:
  Min connections: 10
  Max connections: 100
  Idle timeout: 30s
```

### **Scalability Targets**
```yaml
Users:
  Concurrent users: 10,000+
  Active games: 1,000+
  Database size: 100GB+
  
Growth:
  User growth: 20%+ MoM
  Game growth: 30%+ MoM
  Retention: 60%+ weekly
```

---

## 🧪 TESTING STRATEGY

### **Test Pyramid**

```
                      ╱╲
                     ╱  ╲
                    ╱ E2E ╲                 5%
                   ╱──────╲
                  ╱        ╲
                 ╱Integration╲              15%
                ╱────────────╲
               ╱              ╲
              ╱      Unit      ╲            80%
             ╱────────────────╲
            ╱                  ╲
           ╱____________________╲
```

### **Unit Tests**
```typescript
// Core logic testing
describe('BettingEngine', () => {
  test('validates bet amount within bounds', () => {
    // Arrange
    const engine = new BettingEngine();
    const player = createTestPlayer({ stack: 1000 });
    const gameState = createTestGameState({ bigBlind: 20 });
    
    // Act
    const result = engine.validateBet(player, 50, gameState);
    
    // Assert
    expect(result.valid).toBe(true);
  });
  
  test('rejects bet exceeding stack', () => {
    const engine = new BettingEngine();
    const player = createTestPlayer({ stack: 100 });
    const result = engine.validateBet(player, 150, gameState);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Insufficient stack');
  });
});

// Hand evaluator tests
describe('HandEvaluator', () => {
  test('correctly identifies royal flush', () => {
    const evaluator = new HandEvaluator();
    const cards = [
      { suit: 'h', rank: 'A' },
      { suit: 'h', rank: 'K' },
      // ... more cards
    ];
    const result = evaluator.evaluateHand(cards);
    expect(result.ranking).toBe(HandRanking.RoyalFlush);
  });
});

// Target: 80% code coverage
```

### **Integration Tests**
```typescript
// Full game flow testing
describe('Complete Hand Flow', () => {
  let server: Server;
  let db: Database;
  
  beforeAll(async () => {
    server = await startTestServer();
    db = await connectTestDatabase();
  });
  
  test('plays complete hand from deal to winner', async () => {
    // Create game
    const game = await createGame({ players: 3 });
    
    // Post blinds
    await postBlinds(game);
    
    // Deal cards
    await dealCards(game);
    
    // Betting round
    await performAction(game, player1, 'CALL');
    await performAction(game, player2, 'RAISE', 40);
    await performAction(game, player3, 'FOLD');
    await performAction(game, player1, 'CALL');
    
    // Flop
    await advanceStreet(game, 'FLOP');
    
    // More betting...
    
    // Verify winner
    const result = await getHandResult(game);
    expect(result.winners).toHaveLength(1);
    expect(result.potDistributed).toBe(true);
  });
});

// Target: All critical paths covered
```

### **E2E Tests**
```typescript
// User journey testing
describe('User Journey: Play Poker Game', () => {
  test('user can register, join game, and play hand', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Register
    await page.goto('https://poker.app/register');
    await page.fill('[name=email]', 'test@example.com');
    await page.fill('[name=password]', 'securePass123');
    await page.click('button[type=submit]');
    
    // Join game
    await page.goto('https://poker.app/rooms');
    await page.click('.room-card:first-child');
    await page.click('button:has-text("Sit Down")');
    
    // Play action
    await page.waitForSelector('.your-turn');
    await page.click('button:has-text("Call")');
    
    // Verify action taken
    await expect(page.locator('.action-taken')).toBeVisible();
  });
});

// Target: Critical user flows working end-to-end
```

### **Load Testing**
```typescript
// Artillery load test
config:
  target: 'https://poker.app'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 100
      name: "Sustained load"
    - duration: 60
      arrivalRate: 200
      name: "Spike"

scenarios:
  - name: "Play poker game"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "{{ $randomEmail() }}"
            password: "testPass123"
          capture:
            - json: "$.token"
              as: "authToken"
      
      - get:
          url: "/api/rooms"
          headers:
            Authorization: "Bearer {{ authToken }}"
      
      - post:
          url: "/api/games/join"
          json:
            roomId: "{{ roomId }}"
          headers:
            Authorization: "Bearer {{ authToken }}"

# Target: 1000+ concurrent users, <100ms p95 latency
```

---

## 📊 SUCCESS METRICS & KPIs

### **Technical Metrics**
```yaml
Performance:
  API Response Time (p95): <100ms
  WebSocket Latency (p95): <50ms
  Database Query Time (p95): <50ms
  Page Load Time (p95): <2s
  Uptime: >99.9%

Reliability:
  Error Rate: <0.1%
  Failed Requests: <0.5%
  Connection Failures: <1%
  Data Consistency: 100%

Scalability:
  Concurrent Users: 10,000+
  Concurrent Games: 1,000+
  Requests/Second: 1,000+
  Database Size: Unlimited
```

### **Business Metrics**
```yaml
User Acquisition:
  New Users/Day: 100+
  Growth Rate: 20%+ MoM
  Activation Rate: 60%+
  Cost Per Acquisition: <$5

User Engagement:
  Daily Active Users: 1,000+
  Monthly Active Users: 10,000+
  Session Duration: 45min+
  Sessions per User: 3+/day
  Retention (Day 7): 60%+
  Retention (Day 30): 40%+

Game Metrics:
  Hands Played/Day: 10,000+
  Average Players/Game: 6+
  Game Completion Rate: 90%+
  Average Game Duration: 30min
  Hands per Hour: 60+

Financial:
  Revenue: TBD (monetization model)
  Churn Rate: <5%/month
  Lifetime Value: TBD
```

### **Quality Metrics**
```yaml
Code Quality:
  Test Coverage: >80%
  Type Coverage: 100%
  Linting Errors: 0
  Build Warnings: 0
  Technical Debt Ratio: <5%

Security:
  Vulnerability Score: A+
  Security Incidents: 0
  Data Breaches: 0
  Penetration Test: Pass
  Audit Results: Pass
```

---

## 🎯 MVP DEFINITION

### **Minimum Viable Product Scope**

**MVP Goal**: Functional multiplayer poker platform where friends can play together in private rooms with provably fair shuffling.

**Core Features (Must Have)**:
✅ User registration and authentication
✅ User profiles with avatars
✅ Room creation with invite codes
✅ 2-10 player Texas Hold'em
✅ Complete poker rules (betting, hand evaluation)
✅ Real-time WebSocket gameplay
✅ Session persistence and reconnection
✅ Chip economy (buy-in, cash-out)
✅ Basic entropy-based shuffling
✅ Mobile-responsive UI

**Nice to Have** (Post-MVP):
❌ Friend system with social features
❌ Tournament support
❌ Player statistics
❌ Advanced entropy verification
❌ Mobile native apps
❌ AI opponents

**MVP Timeline**: 6 weeks
**MVP Team**: 1-2 developers
**MVP Budget**: Minimal (leverage free tiers)

---

## 🛣️ DEVELOPMENT ROADMAP SUMMARY

### **Week 1: Critical Robustness Fixes** 🚨
- Fix transaction management
- Implement concurrency control
- Add error recovery
- Comprehensive input validation
- Monitoring and health checks

### **Weeks 2-3: Core Game Logic**
- Game state machine
- Round management
- Action validation
- Showdown logic
- Full integration

### **Week 4: Player Management**
- Session management
- Authentication service
- Connection handling
- Disconnect/Reconnect
- Timebank system

### **Week 5: Real-Time Integration**
- WebSocket event system
- State synchronization
- Event broadcasting
- Testing and optimization

### **Week 6: Production Polish**
- Security hardening
- Performance optimization
- Load testing
- Documentation
- Deployment preparation

### **Weeks 7-12: Entropy System**
- YouTube API integration
- Audio analysis
- Cryptographic shuffle
- Verification system
- Public audit tools

---

## 💼 BUSINESS MODEL (Future)

### **Potential Monetization Strategies**
```yaml
Play Money (Free):
  - Core platform is free
  - Play with virtual chips
  - Full feature access
  - Ad-supported (optional)

Premium Features:
  - Custom avatars ($2.99)
  - Premium themes ($4.99)
  - Extended statistics ($9.99/month)
  - Priority support ($4.99/month)
  - Tournament access ($19.99/month)

Tournament Buy-Ins:
  - Freerolls (free entry)
  - Low stakes ($1-$5)
  - Medium stakes ($10-$50)
  - High stakes ($100+)
  - Platform takes 5-10% rake

Real Money (Requires Licensing):
  - Regulated markets only
  - Proper licensing
  - KYC/AML compliance
  - Rake on real money games
  - Tournament fees
```

---

## 📚 DOCUMENTATION REQUIREMENTS

### **Developer Documentation**
- README.md with quick start
- API documentation (OpenAPI/Swagger)
- Architecture diagrams
- Database schema documentation
- WebSocket protocol specification
- Contributing guidelines
- Code style guide

### **User Documentation**
- Player handbook
- Game rules
- FAQ
- Tutorial videos
- Shuffle verification guide
- Terms of service
- Privacy policy

### **Operational Documentation**
- Deployment guide
- Runbook for incidents
- Monitoring guide
- Backup and recovery procedures
- Scaling procedures
- Security incident response plan

---

## 🎓 KEY TECHNICAL DECISIONS

### **Why TypeScript?**
- Type safety prevents runtime errors
- Better IDE support and autocomplete
- Easier refactoring
- Self-documenting code
- Industry standard for Node.js projects

### **Why Supabase?**
- PostgreSQL with modern API
- Built-in authentication
- Real-time subscriptions
- Row Level Security
- Generous free tier
- Easy to use

### **Why Socket.IO?**
- Real-time bidirectional communication
- Automatic reconnection
- Room/namespace support
- Fallback to polling
- Battle-tested and reliable

### **Why Next.js?**
- Server-side rendering
- Built-in API routes
- Excellent performance
- Great developer experience
- Vercel deployment integration

### **Why Monolithic Architecture (Initially)?**
- Simpler to develop and debug
- Faster iteration
- Lower operational complexity
- Easier to understand
- Can split into microservices later

---

## 🔮 FUTURE VISION

### **Long-Term Goals (12-24 months)**
- **100,000+ active users**
- **Industry-leading shuffle transparency**
- **Mobile apps on iOS and Android**
- **Multi-language support**
- **Tournament platform**
- **Professional streaming integration**
- **Blockchain-based tournaments**
- **VR/AR poker experience**

### **Technical Evolution**
- Migrate to microservices architecture
- Implement GraphQL API
- Add machine learning for bot detection
- Quantum-resistant encryption
- Global CDN for assets
- Edge computing for game logic
- Blockchain audit trail integration

---

## ✅ PROJECT STATUS SUMMARY

**Current State**: MVP Core Engine Complete, Moving to Production Infrastructure  
**Code Quality**: Good foundation, needs robustness improvements  
**Documentation**: Comprehensive, well-maintained  
**Testing**: Partial coverage, needs expansion  
**Deployment**: Local development only, production deployment planned  
**Team**: Solo/Small team  
**Funding**: Bootstrapped  
**Timeline**: 6-12 weeks to full MVP  
**Risk Level**: Medium (technical complexity, scalability challenges)  
**Confidence Level**: High (strong foundation, clear roadmap)

---

## 📞 PROJECT CONTACTS

```yaml
Project Name: POKEHER
Repository: [GitHub URL]
Documentation: poker-engine-docs/
Live Demo: [Coming Soon]
Status Dashboard: [Coming Soon]
```

---

**Last Updated**: {{ current_date }}  
**Version**: 1.0.0  
**Status**: Active Development - Phase 0 (Robustness Fixes)  
**Next Milestone**: Production MVP in 6 weeks

---

*This comprehensive specification document is designed to provide maximum detail for advanced project planning, technical implementation, and strategic decision-making. All sections are based on actual project structure, codebase analysis, and documented roadmaps.*


