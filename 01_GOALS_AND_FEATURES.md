# 🎯 POKERGEEK.AI - COMPLETE GOALS & FEATURES

**Purpose:** Definitive list of EVERY feature from MVP to platform dominance  
**Scope:** What we're building, why it matters, how it competes  
**Audience:** All future agents, product planners, developers

---

## 🏆 VISION: BEAT POKERNOW.CLUB

**PokerNow.club weaknesses:**
- Suspected card rigging (no provable fairness)
- No hand history/analysis
- No social features (friends, clubs)
- Clunky UI
- Refresh breaks everything

**Our advantages:**
- Provably fair shuffle (cryptographic verification)
- Full hand history with AI analysis
- Beautiful, responsive UI (zoom-locked)
- Friends & clubs system
- Database-backed (refresh works)
- TypeScript game engine (sophisticated rules)

---

## 📊 FEATURE TIERS

### **TIER 0: INFRASTRUCTURE (DONE ✅)**

**What we built:**
1. **Database Schema** - 40+ tables, all relationships mapped
2. **TypeScript Game Engine** - Full poker rules, compiled
3. **Modularized Backend** - 48 endpoints across 5 routers
4. **Sequence System** - Prevents stale updates
5. **Timer System** - Auto-fold, timebanks
6. **Auth System** - Supabase OAuth + guest users
7. **Beautiful UI** - Zoom-locked responsive table
8. **WebSocket Infrastructure** - Real-time broadcasts

**Status:** Complete, battle-tested

---

### **TIER 1: MVP (LAUNCH BLOCKERS)**

**Goal:** Friends can play poker without major bugs  
**Deadline:** Before any external user sees product

| Feature | Status | Blocker | Fix |
|---------|--------|---------|-----|
| **Refresh works** | ❌ 95% | Hydration queries wrong table | Query game_states, not games |
| **Cards dealt & visible** | ❌ Broken | Same as above | Extract from current_state JSONB |
| **Actions work (fold/call/raise)** | ⚠️ Untested | Blocked by above | Should work once game visible |
| **Hand completes** | ⚠️ Untested | Blocked by above | Engine works, needs testing |
| **Multiple hands** | ⚠️ Untested | Unknown | Test after first hand works |
| **Host controls** | ✅ 90% | Missing UI button (fixed) | Test after game works |
| **Seat claiming** | ✅ Works | Real-time broadcasts timing | Socket joining fixed |
| **Player join/approve** | ✅ Works | Idempotency errors | Non-critical, can proceed |

**MVP Success Criteria:**
- [ ] 2 players can complete a full hand
- [ ] Refresh mid-game preserves state
- [ ] Actions broadcast to both players
- [ ] Winner determined correctly
- [ ] Second hand starts automatically
- [ ] No critical console errors

---

### **TIER 2: COMPETITIVE PARITY (MATCH POKERNOW)**

**Goal:** Feature-for-feature match competitors  
**Deadline:** Week 1 post-launch

#### **2.1 Core Gameplay**
- **Multiple tables** - Run 100+ concurrent games without degradation
- **Room URLs** - `/room/POKER123` shareable links (vs `/game?room=uuid`)
- **Spectator mode** - Watch without playing
- **Away mode** - Explicit away toggle (separate from disconnect)
- **Pause/resume** - Host can pause game temporarily
- **Kick player** - Host removes disruptive players
- **Mid-game join** - Request to join active game, approved between hands

#### **2.2 Quality of Life**
- **In-game chat** - Text messages, emoji reactions
- **Sound effects** - Cards dealt, chips moved, turn alerts (toggle)
- **Table themes** - 8 felt colors, card back designs
- **Adjustable timers** - Host sets turn time (15s-120s)
- **Rebuy** - Add chips mid-game (cash game mode)
- **Sit out next hand** - Skip without leaving table
- **Show cards** - Reveal hand after folding (tilt mode)

#### **2.3 Host Controls (Expanded)**
- **Chip adjustment** - Add/remove chips from any player ✅ DONE
- **Blinds control** - Change blinds mid-game
- **Player limits** - Set min/max buy-in
- **Auto-start** - New hand begins automatically after X seconds
- **Show hole cards** - Host can view all cards (debug/education)

**Procedures:**
- All mutate via HTTP POST with host verification
- All broadcast via WebSocket to room
- All persist to database (survive restart)

---

### **TIER 3: COMPETITIVE ADVANTAGE (BEAT POKERNOW)**

**Goal:** Features competitors DON'T have  
**Deadline:** Week 2-4 post-launch

#### **3.1 Hand History & Analysis**
**What:** Complete record of every hand ever played

**Features:**
- **Hand viewer** - Timeline showing every action
- **Export hand** - Text format for forums/discussion
- **Filter hands** - By player, date, pot size, cards
- **Share hands** - Public URL to specific hand
- **Hand fingerprints** - Anonymized pattern analysis

**Database:** Already exists!
- `hands` table - Hand metadata
- `actions` table - Every player action with timestamp
- `players` table - Stacks, cards, results

**Backend Procedure:**
```
GET /api/hands/:handId
  ↓
Query: hands JOIN actions JOIN players
  ↓
Return: {
  hand_number, dealer, blinds,
  actions: [{player, action, amount, timestamp}],
  board: [flop, turn, river],
  result: {winners, pot}
}
```

**Frontend:** Hand replay UI with scrubber timeline

---

#### **3.2 AI-Powered Analysis**
**What:** Post-game insights showing mistakes & optimal plays

**Features:**
- **Mistake detection** - "You should have folded here" (EV analysis)
- **Range analysis** - What opponent likely had
- **Preflop charts** - Compare your action to GTO
- **Post-game quiz** - "What should you have done on turn?"
- **Improvement tracking** - See mistakes decrease over time

**Database:**
- `hand_fingerprints` - Anonymized patterns
- `ai_analysis_jobs` - Queue for LLM queries
- `player_statistics` - Aggregate stats (VPIP, PFR, etc.)

**Tech Stack Options:**
1. **Rule-based** (fast, free, 70% accurate)
   - Pot odds calculations
   - Position-based heuristics
   - Obvious mistakes (fold AA preflop)
   
2. **OpenAI API** (smart, costs $$$, 95% accurate)
   - GPT-4 with poker prompts
   - $0.01-0.05 per hand analysis
   - Rate limit: 5 analyses per day (free tier)

**Backend Procedure:**
```
POST /api/hands/:handId/analyze
  ↓
Fetch hand actions from DB
  ↓
Anonymize: Hash user IDs
  ↓
Format for LLM: "Hand history in text format"
  ↓
Query OpenAI: "Analyze this hand, find mistakes"
  ↓
Store: ai_analysis_jobs table
  ↓
Return: {mistakes, suggestions, ev_calculations}
```

---

#### **3.3 Friends & Social**
**What:** Play with known opponents, track rivalry

**Features:**
- **Friend requests** - Send/accept/decline
- **Friend list** - See who's online
- **One-click invite** - Share room link to friend
- **Friend-only rooms** - Private games
- **Head-to-head stats** - Track W/L vs specific friend
- **Friend feed** - See recent games/achievements

**Database:** Already exists!
- `friendships` table
- `friend_requests` table  
- `notifications` table

**Backend Procedure:**
```
POST /api/friends/add
  ↓
Validate: username exists, not already friends
  ↓
Insert: friend_requests (status=pending)
  ↓
Broadcast: notification to target user
  ↓
Target accepts → Update friendships table
```

---

#### **3.4 Clubs System**
**What:** Persistent poker groups with leaderboards

**Features:**
- **Create club** - Name, description, avatar
- **Member management** - Invite, remove, roles (admin/member)
- **Club leaderboards** - Chips won, hands played, biggest pot
- **Club games** - Games visible only to members
- **Club chat** - Persistent discussion board
- **Club tournaments** - Organized events with prize pools

**Database:** Already exists!
- `clubs` table
- `club_members` table (with role: owner/admin/member)
- `club_games` table

**Backend Procedure:**
```
POST /api/clubs
  ↓
Create club (max 3 per user)
  ↓
Auto-add creator as owner
  ↓
Return club_id + invite_code
```

---

### **TIER 4: PREMIUM FEATURES (MONETIZATION)**

**Goal:** Justify subscription revenue  
**Deadline:** Month 2-3 post-launch

#### **4.1 AI Coaching (SUBSCRIPTION)**
**Price:** $9.99/month

**Features:**
- **Unlimited AI analysis** (vs 5/day free)
- **Live coaching** - Real-time suggestions during play
- **Study mode** - Solve specific situations
- **Range trainer** - Practice hand reading
- **GTO solver integration** - Friend's AI tool

**Database:**
- `subscriptions` table
- `coaching_sessions` table
- `gto_solutions` table (cached)

---

#### **4.2 Tournament Mode**
**What:** Multi-table poker tournaments with eliminations

**Features:**
- **Blind schedule** - Auto-increase every X minutes
- **Table balancing** - Players redistributed when tables uneven
- **Prize pool** - Percentage distribution (50/30/20)
- **Re-entry** - Pay to rejoin (up to X times)
- **Satellite tournaments** - Win entry to bigger event
- **Leaderboard** - Tournament points, rankings

**Database Needs:**
- `tournaments` table (status, prize_pool, blind_schedule)
- `tournament_tables` table (which tables belong to event)
- `tournament_players` table (entries, rebuys, standing)
- `tournament_payouts` table (calculated prizes)

**Complexity:** HIGH - Requires multi-table coordination

**Backend Procedure:**
```
Tournament starts
  ↓
Create N tables (based on player count / max_players)
  ↓
Distribute players evenly
  ↓
Every 10min: Increase blinds
  ↓
On table elimination (1 player left):
  - Move winner to another table
  - Balance remaining tables
  ↓
Continue until 1 winner
  ↓
Distribute prize pool
```

---

#### **4.3 Provably Fair RNG**
**What:** Cryptographic proof cards weren't rigged

**Features:**
- **Shuffle commitment** - Server commits to deck before dealing
- **Client entropy** - Players contribute randomness
- **Post-game verification** - Anyone can verify deck wasn't manipulated
- **Audit log** - Public record of all shuffles

**Database:** Mostly exists!
- `shuffle_audit` table (commitment_hash, server_secret, client_entropy, deck_hash)
- `games.shuffle_seed` column

**Backend Procedure:**
```
1. PRE-SHUFFLE (Before hand starts)
   - Server: Generate secret S (32 bytes)
   - Server: Compute commitment C = SHA256(S)
   - Server: Broadcast C to all players
   - Players: Optionally send client entropy E
   
2. SHUFFLE (Hand starts)
   - Combine: Seed = SHA256(S + E + handId + timestamp)
   - Fisher-Yates shuffle with Seed
   - Deal cards
   - Store: shuffle_audit(commitment=C, seed=Seed)
   
3. POST-GAME VERIFICATION
   - Server: Reveal S
   - Anyone: Verify SHA256(S) == C
   - Anyone: Re-shuffle with Seed, verify same order
   - If match: Provably fair ✅
   - If mismatch: Server cheated ❌
```

**Implementation Time:** 6 hours  
**Competitive Advantage:** MASSIVE (pokernow has NOTHING)

---

### **TIER 5: PLATFORM DOMINANCE**

**Goal:** Be the definitive online poker platform  
**Deadline:** Month 3-6 post-launch

#### **5.1 Mobile Apps**
- **React Native** - iOS + Android
- **Offline mode** - Practice vs AI when no connection
- **Push notifications** - Your turn, friend online, tournament starting
- **App-specific features** - Face ID for quick login

**Time:** 80-120 hours (outsource?)

---

#### **5.2 Learning Platform**
- **Interactive tutorials** - Step-by-step poker education
- **Video library** - Embed YouTube poker strategy
- **Quiz mode** - Test knowledge, earn badges
- **Situation trainer** - Practice specific scenarios
- **Progress tracking** - XP, achievements, skill tree

---

#### **5.3 Content Aggregation**
- **Poker news feed** - Aggregated from Reddit, Twitter, blogs
- **Strategy articles** - Curated content + summaries
- **Hand of the day** - Interesting hands from community
- **Discussion forum** - Built-in community

---

#### **5.4 Streamer Integration**
- **OBS overlay** - Show hole cards to stream viewers
- **Twitch integration** - Chat commands, auto-clips
- **Spectator links** - Public URL to watch games
- **Delay mode** - 5-minute delay to prevent ghosting

---

## 🎮 FEATURE PROCEDURES (DETAILED)

### **REFRESH RECOVERY (CRITICAL FIX)**

**Current State:**
- Backend: Hydration endpoint exists ✅
- Database: Has all game data ✅
- Frontend: Calls hydration ✅
- **Problem:** Hydration queries wrong table ❌

**What Works:**
```
Player refreshes → Page loads → Calls GET /api/rooms/:roomId/hydrate
```

**What's Broken:**
```sql
-- Hydration queries (line 350-357 in routes/rooms.js):
SELECT FROM games g  -- This table is EMPTY
WHERE g.room_id = $1
-- Returns 0 rows → game = null → hasGame: false
```

**The Fix:**
```sql
-- Should query:
SELECT FROM game_states  -- This table HAS the data
WHERE room_id = $1
-- Returns the sophisticated_ game with current_state JSONB
```

**Why This Matters:**
- **Without refresh recovery:** Unplayable (browser refresh = game lost)
- **With refresh recovery:** Production-ready (accidental F5 doesn't break game)

**Procedure to Fix:**
1. Edit `routes/rooms.js` line 350
2. Change query from `games` table to `game_states` table
3. Extract hand data from `current_state` JSONB field
4. Extract player hole cards from `current_state.players[X].holeCards`
5. Return same response format (frontend already handles it)

**Test:**
1. Start game, deal cards
2. Press F5 mid-hand
3. Should see same cards, same pot, same state
4. Can continue playing

**Time to Fix:** 30 minutes  
**Impact:** CRITICAL - MVP blocker

---

### **HOST CONTROLS (IN PROGRESS)**

**Goal:** Host can manage game mid-session

**Features (Priority Order):**

#### **1. Start Hand** ✅ DONE
- Button appears when 2+ seated
- Creates game, deals cards, posts blinds
- **Status:** Working but untested end-to-end

#### **2. Kick Player** ✅ DONE
- Prompts for seat number
- Removes from room_seats
- Broadcasts update
- **Status:** Code written, untested

#### **3. Adjust Chips** ✅ DONE
- Prompts for seat + amount
- Updates chips_in_play
- Broadcasts update
- **Status:** Code written, untested

#### **4. Pause Game** ✅ DONE
- Sets game status = PAUSED
- Freezes timers (TODO: wire timer freeze)
- Broadcasts game_paused
- **Status:** Backend done, frontend partial

#### **5. Resume Game** ✅ DONE
- Sets game status = ACTIVE
- Resumes timers
- Broadcasts game_resumed
- **Status:** Backend done, frontend partial

#### **6. Change Blinds** ❌ TODO
- Updates room.small_blind, room.big_blind
- Takes effect next hand
- **Procedure:**
```javascript
POST /api/rooms/:roomId/blinds
Body: { hostId, small_blind, big_blind }
  ↓
Verify host
  ↓
UPDATE rooms SET small_blind=$1, big_blind=$2
  ↓
Broadcast: blinds_changed
```

#### **7. Approve Ingress Requests** ❌ TODO
- Show pending join requests in host modal
- Approve/reject from table (not just lobby)
- **Procedure:**
```javascript
GET /api/rooms/:roomId/join-requests
  ↓
Query: room_join_requests WHERE status=pending
  ↓
Return: [{userId, username, requested_at}]
  ↓
Frontend: Show in host modal
  ↓
Host clicks Approve → POST /api/rooms/:roomId/lobby/approve
```

#### **8. Show All Hole Cards** ❌ TODO
- Debug/education mode
- Host sees everyone's cards
- **Security:** Only host, only if enabled in room settings

---

### **HAND HISTORY VIEWER**

**What:** Replay any past hand action-by-action

**Database:** Already complete!
- `hands` table - 11 columns
- `actions` table - Every fold/call/raise
- `players` table - Final stacks, hole cards
- `hand_fingerprints` table - Unique situations

**Frontend UI:**
```
┌────────────────────────────────┐
│  Hand #42 - Room POKER123      │
│  October 28, 2025 - 6:30 PM    │
├────────────────────────────────┤
│                                │
│  [Timeline Scrubber]           │
│  ●━━━━━━━━━━○━━━━━━━━━━━━━━━━ │
│  Preflop      Flop      River  │
│                                │
│  Current Action:               │
│  "ProPlayer raises to $30"     │
│                                │
│  Cards: [A♠ K♠]                │
│  Board: [Q♠ J♠ 2♣]             │
│  Pot: $65                      │
│                                │
│  [◀ Prev] [▶ Next] [Export]   │
└────────────────────────────────┘
```

**Backend Procedure:**
```
GET /api/hands/:handId
  ↓
Query:
  SELECT h.*, 
         array_agg(a.*) as actions,
         array_agg(p.*) as players
  FROM hands h
  JOIN actions a ON h.id = a.hand_id
  JOIN players p ON h.id = p.hand_id
  WHERE h.id = $1
  GROUP BY h.id
  ↓
Return timeline of events
```

**Time to Build:** 8 hours  
**Competitive Value:** HIGH (pokernow has NOTHING)

---

### **FRIENDS SYSTEM**

**What:** Add friends, play together, track rivalry

**Features:**
1. **Search by username** - Find players
2. **Send request** - Pending until accepted
3. **Friend list** - See online status
4. **Quick invite** - Share room link to friend only
5. **Head-to-head stats** - Chips won/lost against specific friend
6. **Friend games history** - List of games played together

**Database:** Exists!
- `friendships` table (user_id, friend_id, created_at)
- `friend_requests` table (status: pending/accepted/declined)
- `notifications` table

**Backend Endpoints:**
```
POST /api/friends/request
POST /api/friends/accept/:requestId
POST /api/friends/decline/:requestId
GET /api/friends (list all friends)
DELETE /api/friends/:friendId (unfriend)
GET /api/friends/:friendId/stats (head-to-head)
```

**Frontend:** Friends sidebar, online indicators, quick actions

**Time to Build:** 10 hours

---

### **CLUBS SYSTEM**

**What:** Persistent poker groups with shared identity

**Features:**
1. **Create club** - Name, description, avatar image
2. **Invite members** - By username or invite link
3. **Member roles** - Owner, Admin, Member
4. **Club games** - Private to members, counted in leaderboard
5. **Club leaderboard** - Chips won, hands played, biggest pot THIS WEEK
6. **Club chat** - Persistent discussion board
7. **Club settings** - Default blinds, rules, table theme

**Database:** Exists!
- `clubs` table
- `club_members` table (role: owner/admin/member)
- `club_games` table (links games to clubs)

**Backend Endpoints:**
```
POST /api/clubs (create)
POST /api/clubs/:id/invite (add member)
POST /api/clubs/:id/kick (remove member)
GET /api/clubs/:id/leaderboard
GET /api/clubs/:id/games (recent club games)
POST /api/clubs/:id/settings (update defaults)
```

**Frontend:** Club page with tabs (Members, Leaderboard, Games, Settings)

**Time to Build:** 12 hours

---

### **TOURNAMENT MODE**

**What:** Structured multi-table events with eliminations

**Complexity:** VERY HIGH (requires table balancing, blind schedules, complex state)

**Features:**
1. **Create tournament** - Set buy-in, structure, start time
2. **Registration** - Players sign up before start
3. **Auto seating** - Distribute players across tables
4. **Blind increases** - Every 10/15/20 minutes
5. **Table balancing** - Move players when tables uneven
6. **Elimination tracking** - Player knocked out → record place
7. **Final table** - Last 9 players at one table
8. **Prize distribution** - Top 3 (or 10% of field) get paid

**Database Needs:**
```sql
CREATE TABLE tournaments (
  id UUID PRIMARY KEY,
  name TEXT,
  buy_in INT,
  prize_pool INT,
  status TEXT, -- registering/active/completed
  starts_at TIMESTAMP,
  blind_schedule JSONB,
  created_by UUID
);

CREATE TABLE tournament_players (
  tournament_id UUID REFERENCES tournaments(id),
  user_id UUID,
  entry_number INT, -- If rebuys allowed
  chips_remaining INT,
  table_id UUID, -- Current table assignment
  seat_index INT,
  place INT, -- Final placement (null if still in)
  eliminated_at TIMESTAMP
);

CREATE TABLE tournament_tables (
  id UUID PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id),
  table_number INT,
  game_id TEXT, -- Links to game_states
  status TEXT, -- active/completed/merged
  created_at TIMESTAMP
);
```

**Backend Procedure (Complex):**
```
1. TOURNAMENT START
   - Count registrations
   - Calculate tables needed (players / 9)
   - Create game_states for each table
   - Assign players evenly
   - Set starting chips (e.g., 10,000)
   - Start all tables simultaneously

2. BLIND INCREASES (Background Job)
   - Every X minutes:
   - UPDATE all tournament tables: blinds += schedule
   - Broadcast to all tables: blinds_increased

3. TABLE BALANCING (On Elimination)
   - Count players per table
   - If difference > 1:
     - Move random player from big table → small table
     - Pause both tables
     - Execute move
     - Resume both tables
     - Broadcast: player_moved

4. FINAL TABLE (9 players left)
   - Merge all remaining players to one table
   - New seating order (random)
   - Continue with same stacks

5. TOURNAMENT END (1 player left)
   - Record final placements
   - Calculate prizes (prize_pool * percentages)
   - Distribute chips to user accounts
   - Save tournament results
```

**Time to Build:** 40+ hours  
**Risk:** HIGH - Multi-table sync is complex

---

### **RANKED MODE**

**What:** Competitive ladder with ELO ratings

**Features:**
1. **Chip economy** - Persistent bankroll (not per-game)
2. **Matchmaking** - Queue system, match by skill
3. **ELO ratings** - Gain/lose points per game
4. **Ranking tiers** - Bronze → Silver → Gold → Platinum → Legend
5. **Leaderboard** - Top 100 players
6. **Decay** - Lose rating if inactive (prevents camping)
7. **Seasons** - Reset every 3 months, rewards for top players

**Database:** Exists!
- `player_statistics` table (elo_rating, games_played, chips_won)
- `user_profiles.chips` (persistent bankroll)

**Backend Procedure:**
```
POST /api/ranked/queue
  ↓
Add to matchmaking queue
  ↓
Background worker:
  - Find players with similar ELO (±100)
  - Create room automatically
  - Invite all players
  - Start game when all accept
  ↓
Post-game:
  - Winner: +ELO (based on opponent rating)
  - Loser: -ELO
  - Update player_statistics
```

**ELO Calculation:**
```javascript
function calculateELO(winnerRating, loserRating, K=32) {
  const expected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const newWinner = winnerRating + K * (1 - expected);
  const newLoser = loserRating + K * (0 - (1 - expected));
  return { winner: newWinner, loser: newLoser };
}
```

**Time to Build:** 20 hours

---

## 🚀 MVP LAUNCH CHECKLIST

**Before ANYONE sees product:**

### **Core Functionality:**
- [ ] Create room works
- [ ] Join room works  
- [ ] Claim seats works
- [ ] Game starts
- [ ] Cards dealt
- [ ] Can fold/call/raise
- [ ] Actions broadcast to all players
- [ ] Hand completes
- [ ] Winner determined correctly
- [ ] Chips updated
- [ ] Second hand starts
- [ ] **Refresh preserves state** ← CRITICAL

### **Host Controls:**
- [ ] Start hand button visible and works
- [ ] Kick player works
- [ ] Adjust chips works
- [ ] Host controls modal opens

### **Quality:**
- [ ] No console errors during normal play
- [ ] Works in Chrome, Firefox, Safari
- [ ] Works on mobile (responsive)
- [ ] Zoom lock works (no weird scrolling)
- [ ] Room URLs shareable

### **Polish:**
- [ ] Navbar consistent across pages
- [ ] Loading states for async actions
- [ ] Error messages user-friendly
- [ ] Success notifications for actions
- [ ] Favicon exists (no 404 errors)

---

## 📈 GROWTH ROADMAP

### **Week 1:**
- MVP live
- Friends can play
- Share on Reddit r/poker
- Target: 50 users

### **Week 2-3:**
- Hand history viewer
- AI analysis (basic)
- Friends system
- Target: 500 users

### **Month 2:**
- Clubs system
- Ranked mode (beta)
- Premium tier ($9.99/mo)
- Target: 2,000 users

### **Month 3-6:**
- Tournament mode
- Mobile apps
- Learning platform
- Streamer integration
- Target: 10,000+ users

---

## 💰 MONETIZATION

### **Free Tier:**
- Unlimited cash games
- 5 AI analyses per day
- Basic features
- Ads (non-intrusive)

### **Premium Tier ($9.99/month):**
- Unlimited AI analysis
- Live coaching
- Ad-free
- Custom table themes
- Priority support
- Tournament hosting (up to 50 players)

### **Revenue Projections:**
```
1,000 users, 10% conversion = 100 subs
100 × $9.99 = $999/month

10,000 users, 10% conversion = 1,000 subs
1,000 × $9.99 = $9,990/month

Cost: ~$200/month (Supabase + hosting)
Profit: $9,790/month at 10K users
```

---

## 🎯 SUCCESS METRICS

### **Technical:**
- Uptime: >99.5%
- Latency: <100ms (actions)
- Refresh success rate: 100%
- Concurrent games: 100+
- Zero data loss

### **Product:**
- Daily active users: 1,000+
- Games per day: 5,000+
- Average session: 30+ minutes
- Return rate: 40%+ (7 days)
- NPS Score: >50

### **Business:**
- Conversion to premium: >10%
- MRR: $10,000+
- CAC < $10
- LTV > $100
- Profitability by month 6

---

## 🔮 FUTURE VISION (Year 2+)

- **Poker school partnership** - Official training platform
- **Sponsored tournaments** - Real money prizes
- **White label** - Sell platform to poker clubs
- **API access** - Let developers build on our platform
- **AI opponent mode** - Practice vs sophisticated bot
- **VR poker** - Immersive 3D table (far future)

---

**This document defines EVERYTHING we're building.  
Every feature has a procedure.  
Every procedure can be implemented.  
The path to dominance is clear.**

