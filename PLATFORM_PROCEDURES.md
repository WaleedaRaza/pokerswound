# 🏛️ POKERGEEK.AI - COMPLETE PLATFORM PROCEDURES

**Purpose:** Comprehensive procedural roadmap for entire platform  
**Scope:** Present architecture → All features → Production scaling  
**Audience:** Current and future LLMs  
**Focus:** Procedures, not code. Breadth, not just depth.

---

## 📍 WHERE WE ARE (PRESENT STATE)

### **Foundation: COMPLETE**
- Database: 40+ tables supporting all features
- Backend: Modularized (48 endpoints, 5 routers)
- Game engine: TypeScript, compiled, working
- Auth: Supabase + guest users
- Infrastructure: Sequence numbers, timers, idempotency

### **MVP: 95% COMPLETE**
- Room creation: ✅ Works
- Lobby system: ✅ Works  
- Seat claiming: ✅ Works
- Game logic: ✅ Works
- Zoom-lock UI: ✅ Exists (beautiful)
- **Hydration: ✅ Backend ready, ❌ Frontend not wired**

### **The Gap:**
Frontend table (poker-table-zoom-lock.html) not connected to working backend.

---

## 🎯 FEATURE MAP - PRESENT TO FUTURE

### **Tier 1: MVP (Launch Blockers)**
**Deadline:** Before any user sees product

| Feature | DB Ready? | Backend Ready? | Frontend Ready? | Procedure |
|---------|-----------|----------------|-----------------|-----------|
| **Refresh works** | ✅ Yes | ✅ Yes | ❌ No | Wire zoom-lock to hydration endpoint |
| **Provably fair shuffle** | ✅ Yes (shuffle_seed column) | ❌ No | ❌ No | Implement SHA256 Fisher-Yates with commitment |
| **Room-based URLs** | ✅ Yes (invite_code) | Partial | ❌ No | Change routing from `/game?room=X` to `/room/CODE` |
| **Basic timers** | ✅ Yes | ✅ Yes | ❌ No | Wire timer-display.js to server timestamps |
| **Show cards after showdown** | ✅ Yes (card_reveals table) | ❌ No | ❌ No | 5-second reveal window endpoint + broadcast |

---

### **Tier 2: Competitive Parity (Match pokernow.club)**
**Deadline:** Week 1 post-launch

| Feature | DB Ready? | Backend Ready? | Frontend Ready? | Procedure |
|---------|-----------|----------------|-----------------|-----------|
| **In-game chat** | ✅ Yes (messages, conversations) | ❌ No | ❌ No | WebSocket chat events + message persistence |
| **Spectator mode** | ✅ Yes (room_spectators) | ❌ No | ❌ No | Mid-game join → spectator view → claim seat next hand |
| **Mid-game join requests** | ⚠️ Needs (join_requests table) | ❌ No | ❌ No | Host popup for approvals during active game |
| **Away mode** | ✅ Yes (player_status in room_seats) | Partial | ❌ No | Explicit away toggle (vs disconnect detection) |
| **Pause/resume** | ⚠️ Needs (paused_at timestamp) | ❌ No | ❌ No | Freeze timers, block actions, host control |
| **Host controls panel** | ✅ Yes (all columns exist) | Partial | ❌ No | UI panel + endpoints for runtime adjustments |

---

### **Tier 3: Competitive Advantage (Beat pokernow.club)**
**Deadline:** Week 2-3 post-launch

| Feature | DB Ready? | Backend Ready? | Frontend Ready? | Procedure |
|---------|-----------|----------------|-----------------|-----------|
| **Friends system** | ✅ Yes (friendships table) | ❌ No | ❌ No | Username-based search, requests, one-click invite |
| **Clubs** | ✅ Yes (clubs, club_members) | ❌ No | ❌ No | Club creation, member management, club games |
| **User profiles** | ✅ Yes (user_profiles) | Partial | ❌ No | Persistent settings, username, hand/game history view |
| **Hand history viewer** | ✅ Yes (hands, actions, players) | ❌ No | ❌ No | Timeline UI showing action-by-action replay |
| **Game history viewer** | ✅ Yes (player_game_history) | ❌ No | ❌ No | List of past games with stats |
| **In-game nicknames** | ✅ Yes (player_aliases) | ❌ No | ❌ No | Per-game aliases separate from global username |

---

### **Tier 4: Platform Features (Moat)**
**Deadline:** Month 1-2 post-launch

| Feature | DB Ready? | Backend Ready? | Frontend Ready? | Procedure |
|---------|-----------|----------------|-----------------|-----------|
| **Ranked mode** | ✅ Yes (player_statistics) | ❌ No | ❌ No | Chip economy, matchmaking queue, ranking tiers |
| **Post-game analysis** | ✅ Yes (hand_fingerprints, actions) | ❌ No | ❌ No | Anonymized insights, EV calculations, mistake detection |
| **LLM insights** | ✅ Yes (ai_analysis_jobs) | ❌ No | ❌ No | Langchain integration, preprompted queries, rate limiting |
| **Tournament mode** | ⚠️ Needs (tournaments table) | ❌ No | ❌ No | Multi-table coordination, blind schedule, prize pool |
| **Learning page** | ⚠️ Needs (content tables) | ❌ No | ❌ No | Text guides, video embeds, interactive trainers |
| **Forum aggregation** | ⚠️ Needs (forum tables) | ❌ No | ❌ No | News/content aggregation algo you wrote |
| **AI GTO solver** | ✅ Yes (gto_solutions) | ❌ No (friend dev) | ❌ No | R&D with friend, data pipeline integration |

---

## 🔧 DETAILED PROCEDURES BY FEATURE

### **1. PROVABLY FAIR SHUFFLE** (Pre-Launch Critical)

**Why:** Competitors suspected of rigging. This is trust differentiator.

**Procedure:**
1. **Entropy Collection**
   - Server generates random bytes: `crypto.randomBytes(32)`
   - Optional client entropy: Hash of timestamp + user mouse movements
   - Combine: `SHA256(serverRandom + clientHash + handId + timestamp)`
   - Store as `shuffle_seed` in `games` table

2. **Commitment Phase**
   - Before dealing: Publish `SHA256(shuffle_seed)` to all players
   - Store commitment in DB
   - Players can verify later seed matches commitment

3. **Deterministic Shuffle**
   - Use seeded PRNG: `seedrandom(shuffle_seed)`
   - Fisher-Yates shuffle with seeded RNG
   - Store deck order hash: `SHA256(JSON.stringify(deckOrder))`

4. **Verification Endpoint**
   - `GET /api/hands/:handId/verify-shuffle`
   - Returns: original commitment, actual seed, deck order
   - Players can replay shuffle with seed to verify fairness

**Database:**
- `games.shuffle_seed` (VARCHAR 64) - Already exists
- `games.entropy_source` (TEXT) - Already exists
- Add: `games.shuffle_commitment` (VARCHAR 64)

**Scaling Consideration:**
- Seed generation must be deterministic across multiple servers
- Use central seed service or database-generated seeds
- Never use `Math.random()` - always seeded PRNG

---

### **2. FRIENDS SYSTEM** (Competitive Advantage)

**Why:** Easy game creation with known players. Pokernow.club doesn't have this.

**Procedure:**
1. **Username System**
   - User sets `user_profiles.username` (unique, 3-50 chars)
   - Username search: `SELECT id, username FROM user_profiles WHERE username ILIKE '%search%'`
   - Usernames persist across games (global identity)

2. **Friend Requests**
   - Send: `POST /api/friends/request {targetUsername}`
   - Insert: `friendships` table (status='pending')
   - Notify: WebSocket event `friend_request_received`
   
3. **Friend Acceptance**
   - Approve: `POST /api/friends/accept {friendshipId}`
   - Update: `friendships.status = 'accepted'`
   - Broadcast: Both users get `friend_added` event

4. **Quick Game Invite**
   - Button: "Invite Friends to Game"
   - Select from friends list
   - Creates room: `POST /api/rooms {invitedFriendIds: [...]}`
   - Server sends: `game_invitation` WebSocket event to each friend
   - Friends click notification → auto-join room

**Database:**
- `friendships` table - Already exists ✅
- `user_profiles.username` - Already exists ✅

**UI Procedure:**
- Friends page: List friends, pending requests, search users
- Navbar: Friend count badge (e.g., "5 online")
- In-game: "Invite Friends" button in host controls

**Scaling Consideration:**
- Friend list cached in Redis for fast lookup
- WebSocket notifications use user-specific rooms: `io.to(user:${userId})`

---

### **3. CLUBS** (Social Feature)

**Why:** Group management for regular players. Pokernow.club doesn't have this.

**Procedure:**
1. **Club Creation**
   - `POST /api/clubs {name, description, isPrivate}`
   - Insert: `clubs` table (owner_id = creator)
   - Auto-join creator as owner role

2. **Member Management**
   - Invite: `POST /api/clubs/:id/invite {userIds}`
   - Join request: `POST /api/clubs/:id/request-join` (if public)
   - Approve: Club owner/admin approves via `POST /api/clubs/:id/approve-member`
   - Roles: member, moderator, admin, owner (in `club_members.role`)

3. **Club Games**
   - "Start Club Game" button
   - Auto-invites all online club members
   - Club leaderboard: aggregate stats from `player_game_history` filtered by club members

4. **Club Chat**
   - Persistent chat: `conversations` table (type='club')
   - All members can read/write
   - Moderation: Club admins can delete messages

**Database:**
- `clubs` - Already exists ✅
- `club_members` - Already exists ✅
- `conversations` - Already exists ✅

**UI Procedure:**
- Clubs page: List clubs, create club, manage members
- Club page: Chat, leaderboard, "Start Game" button
- Member list: Online status indicators

**Scaling Consideration:**
- Club chat messages cached in Redis (last 100 messages)
- Leaderboard computed daily, cached
- Large clubs (500+ members): pagination required

---

### **4. RANKED MODE** (Revenue & Retention)

**Why:** Chip economy creates engagement. Prevents multi-accounting in competitive play.

**Procedure:**

#### **4.1: Chip Economy**
1. **Initial Allocation**
   - New user: `user_profiles.chips = 500` (free starter chips)
   - Minimum ranked buy-in: 500 chips

2. **Earning Chips (Free)**
   - Share link: `POST /api/chips/share-reward` → +100 chips (once per unique share)
   - Watch ad: `POST /api/chips/ad-reward` → +100 chips (max 5 per day)
   - Track in: `chips_transactions` table (type='BONUS')

3. **Purchasing Chips (Future)**
   - $0.99 → 1,000 chips
   - $4.99 → 7,500 chips  
   - $9.99 → 12,500 chips
   - Payment via Stripe → `chips_pending` table → verified → `chips_transactions`

4. **Chip Separation**
   - `user_profiles.chips` (ranked chips, persistent)
   - `user_profiles.casual_chips` (separate pool for casual games)
   - Never mix pools

#### **4.2: Matchmaking**
1. **Ranking Tiers**
   - Bronze: 0-1,000 total winnings
   - Silver: 1,001-5,000
   - Gold: 5,001-25,000
   - Platinum: 25,000+
   - Stored in: `player_statistics.total_profit_loss`

2. **Queue System**
   - Click "Join Ranked"
   - `POST /api/ranked/queue {userId, tier}`
   - Server pools 6-10 players of similar tier
   - Auto-creates room when pool ready
   - Broadcasts: `ranked_game_ready` → all matched players

3. **Anti-Collusion**
   - Single-table restriction: Check `SELECT COUNT(*) FROM room_seats WHERE user_id = $1` (must be 0)
   - No multi-tabling ranked games
   - Track via `player_game_history` (ensure no overlap in `joined_at` to `left_at`)

4. **Broke Players**
   - Chips = 0 → Show "Earn Chips" modal
   - Options: Share link, watch ad
   - No ranked play until chips > 500

**Database:**
- All tables already exist ✅
- Add: `ranked_queue` table (user_id, tier, queued_at)

**Scaling Consideration:**
- Matchmaking queue in Redis (sorted set by MMR)
- Distribute matchmaking across servers (sharded by tier)
- Anti-collusion checks must be cross-server (Redis check)

---

### **5. POST-GAME ANALYSIS** (Killer Feature)

**Why:** Chess.com's main value. Competitors have NOTHING like this.

**Critical Constraint:** Anonymization to prevent opponent profiling.

**Procedure:**

#### **5.1: Hand Encoding & Storage**
1. **Serialization Algorithm**
   - Encode hand as numeric fingerprint:
     ```
     position(1-10) + hole_cards_hash(8 chars) + 
     community_cards_hash(10 chars) + 
     action_sequence_hash(16 chars) = 
     35-char unique fingerprint
     ```
   - Store in: `hand_fingerprints` table
   - Index for fast lookup

2. **Data Capture**
   - On hand completion: Extract from `actions` table
   - Calculate: VPIP, PFR, aggression, fold_equity
   - Store per-street actions (preflop, flop, turn, river)
   - Insert: `player_hand_history` with all metrics

#### **5.2: Anonymization Rules**
1. **What User CAN See:**
   - Their own hands (full detail)
   - Aggregate stats about opponents (VPIP%, aggression)
   - Anonymized "Player A" vs "Player B" comparisons
   - Community cards and betting patterns

2. **What User CANNOT See:**
   - Opponent hole cards (unless shown at table)
   - Opponent identity in analysis (only "Opponent 1, 2, 3")
   - Link between hand analysis and specific username

3. **Implementation**
   - Analysis query filters: `WHERE user_id = $requestingUser OR cards_revealed = true`
   - Opponent data aggregated: "Average opponent VPIP: 28%"
   - No reverse lookup from fingerprint to usernames

#### **5.3: LLM Insights**
1. **Preprompted Queries** (Langchain)
   - "Was this fold optimal?"
   - "What's my biggest leak?"
   - "Hand range analysis"
   - "Opponent likely had..."
   
2. **Rate Limiting**
   - Free: 5 queries per day (`user_profiles.daily_llm_queries`)
   - Premium: Unlimited
   - Reset daily via cron job

3. **Job Queue**
   - Insert: `ai_analysis_jobs` table (status='PENDING')
   - Worker: Process queue, call LLM API
   - Update: results in `ai_analysis_jobs.output_data`
   - Notify: WebSocket event when complete

**Database:**
- `hand_fingerprints` - Already exists ✅
- `player_hand_history` - Already exists ✅
- `ai_analysis_jobs` - Already exists ✅
- Add: `user_profiles.daily_llm_queries INT DEFAULT 0`
- Add: `user_profiles.llm_query_reset_at TIMESTAMP`

**Scaling Consideration:**
- LLM API calls expensive: Queue-based processing
- Cache common analyses (e.g., "optimal fold spots")
- Rate limiting must be cross-server (Redis counter)

---

### **6. RANKED CHIP ECONOMY** (Detailed)

**Procedure:**

#### **6.1: Initial Setup**
- New user registration: `user_profiles.chips = 500`
- Separate from casual chips (different column or flag)

#### **6.2: Earning Free Chips**

**Share Link:**
1. User clicks "Share PokerGeek"
2. Frontend generates unique share code: `{userId}-{timestamp}`
3. Copies link: `pokergeek.ai/join?ref={shareCode}`
4. Friend visits link → clicks "Sign Up"
5. Backend: `POST /api/chips/share-reward {shareCode}`
   - Verify: Share code valid, friend is new user
   - Award: +100 chips to sharer
   - Insert: `chips_transactions` (type='BONUS', amount=100)
   - Update: `user_profiles.chips += 100`
6. Limit: Max 10 successful shares per week (prevent spam)

**Watch Ad:**
1. User clicks "Watch Ad for Chips"
2. Frontend loads ad SDK (Google AdMob or similar)
3. Ad completes → SDK callback
4. Frontend: `POST /api/chips/ad-reward {userId, adSessionId}`
5. Backend verifies: Call ad SDK API to confirm view
6. Award: +100 chips
7. Limit: Max 5 ads per day (stored in `user_profiles` or separate rate_limits table)

#### **6.3: Purchasing Chips (Future)**
1. **Stripe Integration**
   - Prices: $0.99 (1K chips), $4.99 (7.5K chips), $9.99 (12.5K chips)
   - Checkout: Stripe hosted page
   - Webhook: `POST /webhooks/stripe`
   - Verify payment → Insert `chips_pending` → Process → Update chips

2. **Security**
   - Chips_pending (status='PENDING') until payment confirmed
   - Webhook signature validation
   - Idempotency keys on chip grants

#### **6.4: Broke Player Flow**
1. User chips = 0
2. Attempt ranked join → Blocked
3. Show modal: "You're broke! Earn chips:"
   - Button: "Share Link" (+100)
   - Button: "Watch Ad" (+100)
4. No ranked play until chips >= 500

**Database:**
- `user_profiles.chips` - Already exists ✅
- `chips_transactions` - Already exists ✅
- `chips_pending` - Already exists ✅

**Scaling Consideration:**
- Chip balance must be atomic (use DB transactions)
- Prevent race conditions: Row-level locking
- Ad reward verification must prevent double-spend

---

### **7. TOURNAMENT MODE** (Complex)

**Procedure:**

#### **7.1: Tournament Creation**
1. Host creates tournament: `POST /api/tournaments`
   - Settings: buy-in, prize pool %, blind schedule
   - Insert: `tournaments` table
2. Player registration: `POST /api/tournaments/:id/register`
   - Lock chips: `table_stakes` table
   - Insert: `tournament_players` table

#### **7.2: Multi-Table Coordination**
1. **Table Assignment**
   - Algorithm: Distribute players evenly across tables
   - Create tables: Insert `rooms` for each table
   - Link: `tournament_tables` (tournament_id, room_id)

2. **Table Balancing**
   - When player eliminated: Check table sizes
   - If imbalance > 1: Move player from large → small table
   - Procedure: `POST /api/tournaments/:id/balance-tables`
   - Move lowest-chip player to maintain fairness

3. **Blind Increases**
   - Scheduler: Every N minutes, increase blinds
   - Update all tournament tables: `UPDATE rooms SET small_blind = X, big_blind = Y WHERE id IN (...tournament tables)`
   - Broadcast: `blinds_increased` to all tables

4. **Final Table**
   - When 10 players remain: Consolidate to single table
   - Move all players to final table room
   - Continue with increased blinds

**Database Additions Needed:**
```sql
CREATE TABLE tournaments (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  buy_in BIGINT NOT NULL,
  prize_pool BIGINT DEFAULT 0,
  blind_schedule JSONB, -- [{duration_mins: 10, sb: 10, bb: 20}, ...]
  status VARCHAR CHECK (status IN ('REGISTERING', 'ACTIVE', 'COMPLETED')),
  started_at TIMESTAMP,
  ended_at TIMESTAMP
);

CREATE TABLE tournament_tables (
  id UUID PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id),
  room_id UUID REFERENCES rooms(id),
  table_number INT,
  status VARCHAR DEFAULT 'ACTIVE'
);

CREATE TABLE tournament_players (
  id UUID PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id),
  user_id UUID REFERENCES user_profiles(id),
  current_table_id UUID REFERENCES tournament_tables(id),
  chips BIGINT,
  placement INT, -- Final placement (1st, 2nd, etc.)
  prize_amount BIGINT DEFAULT 0,
  eliminated_at TIMESTAMP
);
```

**Scaling Consideration:**
- Tournament state must be centralized (one server coordinates)
- Or use distributed consensus (Raft/Paxos) for table balancing
- WebSocket broadcasts must reach all tables (Redis adapter required)

---

### **8. USER PROFILE** (UX Polish)

**Current State:** Login button disappears, username/email button appears.

**Desired State:** Click profile → full settings panel.

**Procedure:**

#### **8.1: Profile Modal UI**
1. **Trigger:** Click username button in navbar
2. **Modal Sections:**
   - Account: Username, email, password change
   - Stats: Total games, win rate, profit/loss
   - History: Links to hand history, game history
   - Settings: Auto-muck, sound, animations, theme
   - Chips: Current balance, earn/buy options

#### **8.2: Persistent Settings**
1. **Username Change**
   - `POST /api/profile/username {newUsername}`
   - Validate: Unique, 3-50 chars
   - Update: `user_profiles.username`
   - Track: `username_changes` table
   - Limit: 3 changes lifetime (`user_profiles.username_change_count`)

2. **Password (OAuth Users)**
   - Supabase handles password changes
   - Frontend: Call Supabase SDK `auth.updateUser({password})`

3. **Game Preferences**
   - Auto-muck, auto-show cards, sound, animations
   - Store: `user_profiles` columns (already exist)
   - Apply: Game respects these settings

#### **8.3: Hand/Game History Access**
1. **Hand History**
   - Tab: "My Hands" (last 100 hands)
   - Query: `SELECT * FROM player_hand_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`
   - Click hand → Open detailed replay viewer

2. **Game History**
   - Tab: "My Games" (last 50 games)
   - Query: `SELECT * FROM player_game_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`
   - Shows: Net result, duration, opponents (anonymized)

**Database:**
- All columns exist in `user_profiles` ✅
- History tables exist ✅

**Scaling Consideration:**
- History queries can be slow: Add indexes on `user_id + created_at`
- Cache recent history in Redis (invalidate on new game)

---

### **9. IN-GAME CHAT** (Essential Feature)

**Procedure:**

#### **9.1: Message Flow**
1. **Send Message**
   - User types in chat box
   - `POST /api/rooms/:roomId/chat {userId, message}`
   - Validate: Message length < 500 chars, no spam
   - Insert: `messages` table (conversation_id = room conversation)
   - Broadcast: WebSocket `chat_message` to all in room

2. **Message Types**
   - Table chat (all players + spectators)
   - Emoji reactions (store in `messages.meta`)
   - System messages (blinds posted, hand winner)

3. **Moderation**
   - Host can delete messages: `POST /api/rooms/:roomId/chat/:messageId/delete`
   - Flag inappropriate: `POST /api/chat/:messageId/flag` → inserts `message_flags`
   - Auto-moderation: Profanity filter before insert

#### **9.2: Chat Persistence**
1. **Storage**
   - All messages in `messages` table
   - Linked to room via `conversations` table (type='room')
   
2. **History**
   - Load last 50 messages on room join
   - Scroll up → Load more (pagination)

3. **Cleanup**
   - Archive messages when room closes
   - Delete after 30 days (GDPR compliance)

**Database:**
- `conversations` - Already exists ✅
- `messages` - Already exists ✅
- `message_flags` - Already exists ✅

**UI Procedure:**
- Chat panel: Right side of table or collapsible
- Input box: Enter to send, Shift+Enter for newline
- Emoji picker: Quick reactions

**Scaling Consideration:**
- Recent messages cached in Redis (per room)
- Old messages paginated from DB
- WebSocket broadcasts use room-scoped events

---

### **10. SPECTATOR MODE** (Engagement)

**Procedure:**

#### **10.1: Mid-Game Join**
1. User arrives at `/room/POKER123` (game already active)
2. Frontend: `POST /api/rooms/:roomId/request-spectate {userId}`
3. Host sees popup: "NewPlayer wants to watch. Allow?"
4. Host approves: `POST /api/rooms/:roomId/approve-spectator {userId}`
5. Insert: `room_spectators` table
6. Send user: `spectator_approved` WebSocket event

#### **10.2: Spectator View**
1. **What Spectators See:**
   - All community cards
   - All player actions (but NOT hole cards)
   - Pot size, chip stacks
   - Chat messages
   
2. **What Spectators Don't See:**
   - Any hole cards (even at showdown, unless player reveals)
   - Private player data
   
3. **UI State:**
   - Action buttons: Disabled
   - "Spectating" badge visible
   - "Claim Seat" button: Disabled (shows "Available next hand")

#### **10.3: Spectator → Player Transition**
1. **When Hand Ends:**
   - Broadcast: `hand_complete` event
   - Spectators receive: `can_claim_seats` event
   - Enable "Claim Seat" buttons

2. **Seat Claim:**
   - Normal flow: `POST /api/rooms/:roomId/join`
   - Remove from spectators: `UPDATE room_spectators SET left_at = NOW()`
   - Add to players: Next hand deals them in

**Database:**
- `room_spectators` - Already exists ✅

**Scaling Consideration:**
- Spectator broadcasts separate from player broadcasts
- Use Socket.IO namespaces: `room:${roomId}:spectators`
- Limit spectators per room (e.g., 50 max) to prevent DoS

---

### **11. ANALYSIS PAGE** (Platform Feature)

**Procedure:**

#### **11.1: Page Layout**
Tabs:
1. Hand History Viewer
2. Game History Viewer  
3. Statistics Dashboard
4. LLM Insights
5. Analytics (graphs, trends)

#### **11.2: Hand History Viewer**
1. **List View**
   - Query: Last 100 hands from `player_hand_history`
   - Display: Date, position, result (+/-), hand rank
   - Filter: By date range, result (win/loss), hand strength

2. **Replay View**
   - Click hand → Load full hand data
   - Show: Action-by-action timeline
   - Visual: Cards revealed at appropriate times
   - Query: `actions` table ordered by `sequence_number`

3. **Export**
   - Button: "Export Hand"
   - Format: Text (PokerStars format) or JSON
   - Uses: Hand fingerprint as filename

#### **11.3: Statistics Dashboard**
1. **Data Source:** `player_statistics` table
2. **Metrics:**
   - VPIP, PFR, aggression factor
   - Win rate (overall, by position)
   - Profit/loss graph (over time)
   - Biggest win/loss
   - Streaks (current, longest)

3. **Visualization:**
   - Chart.js for graphs
   - Real-time updates (WebSocket on new game completion)

#### **11.4: LLM Insights**
1. **Preprompted Buttons:**
   - "Analyze My Last 10 Hands"
   - "What's My Biggest Mistake?"
   - "Compare Me to Average Player"
   
2. **Query Submission:**
   - `POST /api/analysis/llm-query {userId, promptType, handIds}`
   - Check rate limit (5/day)
   - Insert: `ai_analysis_jobs`
   - Return: jobId
   
3. **Result Retrieval:**
   - Poll: `GET /api/analysis/jobs/:jobId/status`
   - Or: WebSocket event `analysis_complete`
   - Display in modal with copy button

**Scaling Consideration:**
- Statistics pre-computed daily (background job)
- Hand history paginated (50 per page)
- LLM jobs processed by worker queue (not in API request)
- Cache expensive analyses (dedup similar queries)

---

### **12. HOST CONTROLS** (UX Feature)

**Procedure:**

#### **12.1: Controls Panel UI**
Located: Floating panel (top-right of table)

**Sections:**
1. **Game Settings**
   - Small blind (input)
   - Big blind (input)
   - Turn timer (slider: 15-120 seconds)
   - Auto-start next hand (toggle)
   - Show undealt cards (toggle)

2. **Player Management**
   - List all seated players
   - Per player: Adjust chips button, kick button
   - Pending join requests (count badge)

3. **Game Controls**
   - Pause button (freezes game, timers)
   - Resume button
   - End game button (confirmation required)

#### **12.2: Runtime Adjustments**

**Adjust Player Chips:**
1. Host clicks "💰" next to player name
2. Modal: Input new chip amount
3. `POST /api/rooms/:roomId/adjust-chips {targetUserId, newAmount}`
4. Validate: Host is requester, game paused or between hands
5. Update: `players.stack = newAmount` (if in-game) or `room_seats.chips_in_play`
6. Broadcast: `chips_adjusted` event
7. Log: `chips_transactions` (type='ADMIN_ADJUST')

**Change Blinds:**
1. Host changes values in panel
2. `POST /api/rooms/:roomId/settings {smallBlind, bigBlind}`
3. Validate: Game not in progress (between hands)
4. Update: `rooms.small_blind, rooms.big_blind`
5. Broadcast: `settings_updated`
6. Next hand uses new blinds

**Pause Game:**
1. Host clicks "⏸️ Pause"
2. `POST /api/rooms/:roomId/pause`
3. Freeze: Current timer (`UPDATE rooms SET is_paused = true, paused_at = NOW()`)
4. Cancel: Timer service cancels pending timeout
5. Broadcast: `game_paused` → All players see "PAUSED" overlay
6. Enable: Host controls (can now adjust chips/settings safely)

**Resume:**
1. Host clicks "▶️ Resume"
2. `POST /api/rooms/:roomId/resume`
3. Calculate: Remaining time = original_time - (paused_at - turn_started_at)
4. Restart: Timer with remaining time
5. Broadcast: `game_resumed`

#### **12.3: Join Request Popup**
1. **Trigger:** Player requests to join mid-game
2. **Host Sees:** Popup notification
3. **Approval:**
   - `POST /api/rooms/:roomId/approve-spectator {userId}`
   - Player joins as spectator
   - Can claim seat next hand
4. **Denial:**
   - `POST /api/rooms/:roomId/deny-join {userId}`
   - Player shown "Request denied"

**Database Additions Needed:**
```sql
ALTER TABLE rooms ADD COLUMN
  is_paused BOOLEAN DEFAULT false,
  paused_at TIMESTAMP;

CREATE TABLE mid_game_join_requests (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),
  user_id UUID REFERENCES user_profiles(id),
  requested_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR CHECK (status IN ('pending', 'approved', 'denied')),
  processed_at TIMESTAMP
);
```

**Scaling Consideration:**
- Pause state must be in DB (not just in-memory)
- Timer adjustments must recalculate across server restarts
- Host controls authorized via room ownership check

---

### **13. LEARNING PAGE** (Platform Expansion)

**Procedure:**

#### **13.1: Content Management**

**Database Schema Needed:**
```sql
CREATE TABLE learning_content (
  id UUID PRIMARY KEY,
  title VARCHAR NOT NULL,
  slug VARCHAR UNIQUE,
  content_type VARCHAR CHECK (content_type IN ('article', 'video', 'interactive')),
  content_body TEXT, -- Markdown for articles
  video_url TEXT, -- YouTube embed for videos
  difficulty VARCHAR CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_time_minutes INT,
  view_count INT DEFAULT 0,
  published_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE learning_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  content_id UUID REFERENCES learning_content(id),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  UNIQUE(user_id, content_id)
);
```

#### **13.2: Content Types**

**Articles:**
- Markdown content stored in `content_body`
- Rendered client-side with markdown parser
- Topics: Hand rankings, position play, pot odds

**Videos:**
- YouTube embeds (store video_id)
- Progress tracking: Mark as watched

**Interactive Components:**
- Hand quiz: "What would you do?"
  - Show scenario (cards, pot, action to you)
  - User selects action
  - Show optimal play + explanation
- Range visualizer: Select hands, see percentage
- Pot odds calculator: Interactive tool

#### **13.3: Gamification**
1. Complete content → Track in `learning_progress`
2. Achievements: "Watched all beginner videos"
3. Unlock: Advanced content after basics complete

**Scaling Consideration:**
- Content served via CDN (static assets)
- Interactive components: Client-side only (no server calls)
- Progress tracking: Batch updates (not real-time)

---

### **14. FORUM PAGE** (Content Aggregation)

**Procedure:**

#### **14.1: Aggregation Algorithm** (You already wrote)
1. **Content Sources:**
   - Reddit: /r/poker top posts
   - YouTube: Poker strategy channels
   - News: Poker news sites (PokerNews, CardPlayer)
   - Twitter: Pro poker players

2. **Aggregation:**
   - Cron job: Every 6 hours
   - Fetch: APIs or RSS feeds
   - Score: Upvotes + comments + recency
   - Store: `forum_content` table

3. **Display:**
   - Top 20 items from last 7 days
   - Categories: Strategy, News, Videos, Discussions

**Database Schema Needed:**
```sql
CREATE TABLE forum_content (
  id UUID PRIMARY KEY,
  source VARCHAR NOT NULL, -- 'reddit', 'youtube', etc.
  source_id VARCHAR, -- Original post ID
  title VARCHAR NOT NULL,
  url TEXT NOT NULL,
  content_preview TEXT,
  category VARCHAR,
  score INT DEFAULT 0, -- Aggregated score
  published_at TIMESTAMP,
  fetched_at TIMESTAMP DEFAULT NOW()
);
```

**Scaling Consideration:**
- Aggregation runs on separate worker (not web server)
- Content cached in Redis (refresh every 6 hours)
- No user-generated content (curated only)

---

### **15. AI GTO PAGE** (Outsourced to Friend)

**Your Role:**
1. **Data Pipeline:**
   - Provide: Hand history export API
   - Format: `GET /api/gto/export-hands {userId, dateRange}`
   - Returns: JSON with all hand data for ML training

2. **Storage:**
   - `gto_solutions` table - Already exists ✅
   - Friend's ML model outputs stored here

3. **Integration:**
   - Friend provides API endpoint
   - You call it: `POST https://friend-gto-api.com/analyze {handData}`
   - Store result: `gto_solutions` table
   - Display: GTO page queries this table

**Procedure:**
- Focus on data export quality
- Ensure friend has access to anonymized hand data
- Integration happens after friend's R&D complete

---

## 🔧 INFRASTRUCTURE PROCEDURES (Production Scaling)

### **16. REDIS SESSION STORE** (Horizontal Scaling)

**Procedure:**
1. **Install Dependencies:**
   - `ioredis` (Redis client)
   - `connect-redis` (Express session store)
   - `@socket.io/redis-adapter` (Socket.IO adapter)

2. **Configure Redis:**
   - Use Upstash or self-hosted Redis
   - Connection: `REDIS_URL` in .env
   - Test connection on server start

3. **Express Sessions:**
   ```
   Initialize RedisStore
   → Pass to express-session middleware
   → Sessions persist across servers
   ```

4. **Socket.IO Adapter:**
   ```
   Create Redis pub/sub clients
   → Initialize adapter
   → Attach to io.adapter()
   → Broadcasts reach all servers
   ```

**Evidence of Success:**
- Server restart → Sessions persist
- Multiple servers → Broadcasts reach all clients
- Room state synchronized across instances

**Scaling Impact:**
- Enables multiple server instances
- Load balancer can distribute traffic
- No sticky sessions required

---

### **17. DATABASE OPTIMIZATION** (Performance)

**Procedure:**

#### **17.1: Indexing Strategy**
1. **Critical Indexes:**
   ```sql
   CREATE INDEX idx_room_seats_room_user ON room_seats(room_id, user_id);
   CREATE INDEX idx_players_game_user ON players(game_id, user_id);
   CREATE INDEX idx_actions_hand_seq ON actions(hand_id, sequence_number);
   CREATE INDEX idx_hands_game_current ON hands(game_id, status);
   CREATE INDEX idx_friendships_users ON friendships(requester_id, addressee_id);
   ```

2. **Partial Indexes** (for common queries):
   ```sql
   CREATE INDEX idx_active_games ON games(room_id) WHERE status = 'ACTIVE';
   CREATE INDEX idx_pending_friends ON friendships(addressee_id) WHERE status = 'pending';
   ```

#### **17.2: Query Optimization**
1. **Hydration Query:**
   - Currently: 4-5 separate queries
   - Optimize: Single query with JOINs
   - Cache: Redis cache for 1 second (prevents duplicate hydrations)

2. **Seat Update:**
   - Currently: Fetch all seats on every update
   - Optimize: Only fetch changed seats
   - Broadcast: Incremental updates, not full state

#### **17.3: Archival Strategy**
1. **Completed Games:**
   - After 7 days: Move to `games_archive` table
   - Keep: Hand history for analysis
   - Delete: `game_states.current_state` (no longer needed)

2. **Old Messages:**
   - After 30 days: Delete from `messages`
   - Option: Export to S3 before delete (GDPR compliance)

**Scaling Impact:**
- Faster queries (100ms → 10ms for hydration)
- Smaller table sizes (better cache hit rates)
- Lower storage costs (archive old data)

---

### **18. MONITORING & OBSERVABILITY** (Production Essential)

**Procedure:**

#### **18.1: Structured Logging**
1. **Log Format:**
   ```json
   {
     "timestamp": "2025-10-27T12:00:00Z",
     "level": "info",
     "context": "game_action",
     "roomId": "abc123",
     "gameId": "game456",
     "handId": "hand789",
     "userId": "user1",
     "seq": 42,
     "action": "FOLD",
     "duration_ms": 123
   }
   ```

2. **Critical Events to Log:**
   - Hydration requests (success/failure)
   - Action processing (with latency)
   - Sequence gaps detected
   - Timer timeouts
   - Broadcast failures

#### **18.2: Metrics to Track**
1. **Refresh Recovery Rate:**
   - Counter: Successful hydrations / total hydration attempts
   - Target: > 99%

2. **Action Latency:**
   - Histogram: Time from HTTP request to broadcast received
   - Target: p95 < 100ms

3. **Game Completion Rate:**
   - Counter: Games completed / games started
   - Target: > 95% (detect crashes)

4. **WebSocket Health:**
   - Gauge: Active connections
   - Counter: Disconnects, reconnects
   - Alert: Spike in disconnects (server issue)

#### **18.3: Tools**
- **Logging:** Winston or Pino (structured JSON logs)
- **Metrics:** Prometheus + Grafana
- **Errors:** Sentry (error tracking)
- **Tracing:** OpenTelemetry (distributed tracing)

**Scaling Impact:**
- Diagnose issues in minutes (not hours)
- Proactive alerts before users notice
- Performance optimization data-driven

---

### **19. MOBILE STRATEGY** (Platform Expansion)

**Procedure:**

#### **19.1: Phase 1 - Responsive Web** (Now)
1. **Zoom-Lock System:**
   - Already implemented in poker-table-zoom-lock.html ✅
   - Handles: Phone, tablet, desktop
   - Letterbox/pillarbox for aspect ratio

2. **Touch Optimization:**
   - Action buttons: Larger touch targets (44px minimum)
   - Swipe gestures: Bet slider
   - Haptic feedback: On action submission

3. **Performance:**
   - Lazy load: Card images
   - Optimize: Reduce WebSocket message size
   - PWA: Service worker for offline UI

#### **19.2: Phase 2 - Native Apps** (Future)
1. **React Native** (shared codebase iOS/Android)
2. **Same backend:** Use existing HTTP/WebSocket APIs
3. **Push notifications:** Firebase Cloud Messaging
4. **App store:** Launch when web proven

**Scaling Consideration:**
- Mobile uses same backend (no separate API)
- Push notifications replace WebSocket when app backgrounded
- Offline mode: Cache last game state, sync on reconnect

---

### **20. ANTI-CHEAT & FAIRNESS** (Trust System)

**Procedure:**

#### **20.1: Provably Fair RNG** (PRE-LAUNCH REQUIRED)

**Commitment Scheme:**
1. **Before Shuffle:**
   - Generate: `serverSeed = crypto.randomBytes(32).hex()`
   - Compute: `commitment = SHA256(serverSeed + handId)`
   - Broadcast: Commitment to all players BEFORE dealing
   - Store: `hands.shuffle_commitment`

2. **Shuffle:**
   - Use: `shuffle_seed = serverSeed` (already committed)
   - Algorithm: Fisher-Yates with seeded PRNG
   - Deal cards: Based on shuffled deck
   - Store: `hands.shuffle_seed` (revealed after hand)

3. **Verification:**
   - After hand: Reveal `shuffle_seed`
   - Players verify: `SHA256(shuffle_seed + handId) === commitment`
   - Endpoint: `GET /api/hands/:handId/verify-shuffle`
   - Returns: {commitment, seed, deckOrder, verification_passed}

**Optional Client Entropy:**
1. Player provides: Mouse movements, timestamp
2. Hash: `clientHash = SHA256(movements + timestamp)`
3. Submit: `POST /api/hands/:handId/client-entropy {hash}`
4. Server combines: `finalSeed = SHA256(serverSeed + clientHash)`
5. Privacy: Only hash sent (not raw movements)

**Hashed Audio/Visual Encoding:**
1. **Capture:** 1 second of microphone input (user permission required)
2. **Hash:** `SHA256(audioBuffer)` client-side
3. **Send:** Only hash to server (privacy-preserving)
4. **Combine:** Part of final shuffle seed
5. **Note:** Optional, not required (fallback to server-only seed)

**UI:**
- "🎲 Shuffle Verified" badge if client can verify
- "Verify This Hand" link → Shows commitment vs reveal

#### **20.2: Collusion Detection**
1. **Patterns to Detect:**
   - Players always folding to each other
   - Chip dumping (consistent losses to same player)
   - Coordinated all-ins

2. **Procedure:**
   - Background job: Analyze `actions` table
   - Flag: Suspicious patterns in `player_behavior_patterns`
   - Alert: Moderators via `moderation_queue`

3. **Action:**
   - Investigation: Manual review
   - Ban: `user_bans` table if confirmed
   - Refund: Affected players

#### **20.3: Multi-Accounting Prevention** (Ranked)
1. **IP Tracking:**
   - Store: `user_sessions.ip_address`
   - Flag: Multiple accounts from same IP in ranked queue

2. **Device Fingerprinting:**
   - Store: `user_sessions.device_info` (browser fingerprint)
   - Alert: Same device, different accounts

3. **Behavioral Analysis:**
   - Similar play patterns across accounts
   - Immediate chip transfers between accounts

**Scaling Consideration:**
- Shuffle verification must be fast (< 100ms)
- Collusion detection runs offline (daily batch job)
- Anti-cheat doesn't block normal gameplay

---

### **21. CONTENT DELIVERY** (Performance)

**Procedure:**

#### **21.1: CDN Strategy**
1. **Static Assets:**
   - Card images: `/public/cards/` → Cloudflare CDN
   - CSS/JS bundles: Minified + cached
   - Avatar images: User-uploaded → S3 + CloudFront

2. **Configuration:**
   - Cache headers: `Cache-Control: public, max-age=31536000` for cards
   - Immutable assets: Fingerprinted filenames (cards_v2.png)

#### **21.2: Code Splitting**
1. **Critical Path:**
   - Lobby: Minimal JS (room creation only)
   - Table: Load full game engine on demand
   
2. **Lazy Loading:**
   - Analysis page: Load Chart.js only when viewed
   - Profile modal: Load on first click

#### **21.3: WebSocket Optimization**
1. **Message Compression:**
   - Enable: `io.compression(true)`
   - Reduces: Bandwidth by ~60%

2. **Selective Broadcasting:**
   - Don't broadcast every chip change
   - Batch updates: Every 100ms, send accumulated changes

**Scaling Impact:**
- Faster page loads (better conversion)
- Lower bandwidth costs
- Better mobile experience

---

### **22. DEPLOYMENT PIPELINE** (DevOps)

**Procedure:**

#### **22.1: Environments**
1. **Development:** localhost
2. **Staging:** staging.pokergeek.ai (test with real users)
3. **Production:** pokergeek.ai

#### **22.2: CI/CD Pipeline**
1. **On git push:**
   - Run: Tests (Jest, Playwright)
   - Build: TypeScript compilation
   - Deploy: To staging (auto)

2. **On manual trigger:**
   - Run: Full test suite
   - Deploy: To production (requires approval)
   - Rollback: One-click revert

3. **Database Migrations:**
   - Run: Against staging first
   - Verify: Data integrity
   - Run: Against production (with rollback plan)

#### **22.3: Zero-Downtime Deploys**
1. **Blue-Green Deployment:**
   - Spin up: New server version (green)
   - Health check: Verify green is healthy
   - Switch: Load balancer to green
   - Keep: Blue running for 5 minutes (rollback option)
   - Shutdown: Blue if no issues

2. **Database Migrations:**
   - Backward-compatible: New code works with old schema
   - Deploy code first: Then run migration
   - Never: Breaking changes without version bump

**Scaling Impact:**
- No downtime for users
- Safe rollbacks if issues
- Confidence in frequent deploys

---

## 📊 FEATURE DEPENDENCY GRAPH

**What Must Be Built First:**

```
Refresh Fix (Tier 1)
    ↓
├─→ Room Management Polish
├─→ Host Controls
└─→ Timers Working
    ↓
├─→ Chat (Tier 2)
├─→ Spectators (Tier 2)
└─→ Mid-Game Joins (Tier 2)
    ↓
├─→ Friends System (Tier 3)
├─→ Clubs (Tier 3)
└─→ User Profiles (Tier 3)
    ↓
├─→ Hand History (Tier 3)
├─→ Game History (Tier 3)
└─→ Statistics (Tier 3)
    ↓
├─→ Ranked Mode (Tier 4)
├─→ Post-Game Analysis (Tier 4)
└─→ LLM Insights (Tier 4)
    ↓
Tournaments (Tier 4)
Learning Page (Tier 4)
Forum (Tier 4)
AI GTO (Tier 4 - Partner)
```

**Parallel Tracks:**
- **Infrastructure:** Redis, CDN, monitoring (alongside features)
- **Mobile:** Responsive web first, native apps later
- **Security:** Provably fair shuffle BEFORE launch

---

## 🎯 SCALING CHECKPOINTS

**At 100 Concurrent Games:**
- ✅ Single server sufficient
- ✅ PostgreSQL handles load
- ⚠️ Monitor: CPU, memory usage

**At 1,000 Concurrent Games:**
- ❌ Need: Multiple server instances
- ❌ Need: Redis session store
- ❌ Need: Socket.IO Redis adapter
- ❌ Need: Database read replicas

**At 10,000 Concurrent Games:**
- ❌ Need: Dedicated WebSocket servers
- ❌ Need: Database sharding (by room_id)
- ❌ Need: CDN for all static assets
- ❌ Need: Managed Redis cluster

**At 100,000 Concurrent Games:**
- ❌ Need: Microservices architecture
- ❌ Need: Event streaming (Kafka)
- ❌ Need: Global CDN (multi-region)
- ❌ Need: Dedicated data warehouse for analytics

---

## 📋 LAUNCH CHECKLIST (Pre-Release)

### **Security:**
- [ ] Provably fair shuffle implemented
- [ ] Rate limiting on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitize user inputs)
- [ ] CSRF tokens on state-changing requests
- [ ] Helmet.js security headers
- [ ] Supabase RLS policies enabled

### **Performance:**
- [ ] Database indexes on critical queries
- [ ] Redis caching for hot data
- [ ] CDN for static assets
- [ ] Gzip compression enabled
- [ ] WebSocket message compression

### **Reliability:**
- [ ] Refresh works 100% of time
- [ ] Graceful disconnects (5-minute grace)
- [ ] Server restart doesn't lose games
- [ ] Error handling on all endpoints
- [ ] Circuit breakers on external APIs

### **Observability:**
- [ ] Structured logging everywhere
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (New Relic or DataDog)
- [ ] Uptime monitoring (Pingdom)
- [ ] Alert on critical errors

### **Legal:**
- [ ] Terms of Service
- [ ] Privacy Policy (GDPR compliant)
- [ ] Age verification (13+)
- [ ] No real-money gambling disclaimers
- [ ] DMCA agent registration

### **UX:**
- [ ] Mobile responsive (zoom-lock)
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Loading states everywhere
- [ ] Error messages user-friendly

---

## 🏗️ ARCHITECTURAL SCALING PROCEDURES

### **Procedure: Add Second Server Instance**
1. **Prerequisites:**
   - Redis session store (see #16)
   - Socket.IO Redis adapter (see #16)
   - Shared database (already done)

2. **Steps:**
   - Clone server code to new instance
   - Point to same database
   - Point to same Redis
   - Configure load balancer (round-robin or least-connections)
   - Health check endpoint: `GET /health`

3. **Verification:**
   - Create room on server A
   - Join from client connected to server B
   - Verify: Room visible, can claim seat

### **Procedure: Shard Database by Room**
1. **When:** > 10,000 concurrent games
2. **Strategy:**
   - Partition key: `room_id`
   - Shard 1: Rooms A-L
   - Shard 2: Rooms M-Z
   
3. **Routing:**
   - Application layer routes queries to correct shard
   - Use: Vitess or Citus for Postgres sharding

### **Procedure: Separate WebSocket Servers**
1. **When:** WebSocket load > 50% CPU
2. **Architecture:**
   - API servers: Handle HTTP only
   - WS servers: Handle Socket.IO only
   - Redis: Coordinates broadcasts between them

3. **Configuration:**
   - Clients connect: `wss://ws.pokergeek.ai`
   - HTTP requests: `https://api.pokergeek.ai`
   - Redis pub/sub: Links the two

---

## 🎨 UI DESIGN PROCEDURES (Detail-Oriented)

### **Consistency Requirements:**

#### **Typography:**
- Headings: Inter font, weights 400/600/800 (already in zoom-lock)
- Monospace: JetBrains Mono (for chip counts, timers)
- Body: Inter 400

#### **Colors:**
- Background: `--bg: #0b0b12`
- Text: `--text: #e9eef7`
- Accent: `--accent: #ff5100`
- Success: `--teal: #00d4aa`
- Error: `--error: #ff3b3b`
- Felt: `--felt-current: #197a45` (customizable)

#### **Components:**
- Liquid glass tiles: All panels use `.liquid-glass-tile` class
- Buttons: Consistent padding, hover states
- Modals: Centered, backdrop blur
- Toasts: Top-right, 3-second auto-dismiss

### **Per-Feature UI Depth:**

#### **Friends Page:**
- Left sidebar: Friends list (online status indicators)
- Main: Friend activity feed (recent games, achievements)
- Right panel: Pending requests
- Search bar: Find by username
- Each friend card: Avatar, username, stats, "Invite to Game" button

#### **Clubs Page:**
- Header: Club name, description, member count
- Tabs: Chat, Leaderboard, Games, Members, Settings
- Leaderboard: Table with rank, username, profit/loss, games played
- "Start Club Game" button: Large, prominent
- Member list: Role badges (owner, admin, moderator)

#### **Analysis Page:**
- Top tabs: Hands, Games, Stats, Insights
- Hand viewer: Timeline scrubber, action annotations
- Stats: Card-based layout (VPIP card, PFR card, etc.)
- Insights: LLM responses in chat-like bubbles
- Export buttons: CSV, JSON, text formats

#### **Profile Modal:**
- Sections: Account, Stats, History, Settings
- Account: Edit username (with change counter), email, password
- Stats: Quick metrics (win rate, games, profit/loss)
- History: Links to full hand/game history pages
- Settings: Toggles for auto-muck, sound, animations, theme

#### **Tournament Lobby:**
- Header: Tournament name, buy-in, prize pool
- Player list: Registered players, chip counts
- Blind schedule: Table showing upcoming blind levels
- Timer: Countdown to next blind increase
- "Register" button: Locks chips, confirms entry

---

## 🔐 SECURITY PROCEDURES (Production-Grade)

### **Authentication Flow:**
1. **OAuth Users (Google):**
   - Supabase handles auth
   - JWT token in httpOnly cookie
   - Refresh token rotation

2. **Guest Users:**
   - Server mints: `guest_${uuid}`
   - Stored in: `user_profiles` (is_guest flag)
   - Limited: No ranked mode, profiles deletable

### **Authorization Checks:**
1. **Host Actions:** Verify `rooms.host_id === req.user.id`
2. **Player Actions:** Verify player in game + is their turn
3. **Admin Actions:** Verify `user_profiles.user_role = 'admin'`

### **Rate Limiting:**
1. **Endpoints:**
   - Room creation: 5 per 15 minutes
   - Friend requests: 20 per hour
   - Chat messages: 10 per minute
   - LLM queries: 5 per day (free tier)

2. **Implementation:**
   - express-rate-limit middleware
   - Store counts in Redis (cross-server)
   - Return 429 when exceeded

### **Input Validation:**
1. **All Inputs:**
   - Sanitize: DOMPurify for HTML inputs
   - Validate: Zod schemas on backend
   - Escape: SQL injection (use parameterized queries)

2. **File Uploads (Avatars):**
   - Size limit: 2MB
   - Format: PNG, JPG only
   - Virus scan: ClamAV
   - Storage: S3 with signed URLs

---

## 💾 DATA RETENTION PROCEDURES

### **Hand History:**
- **Keep:** All hands forever (small data, high value)
- **Storage:** ~1KB per hand
- **Access:** Query with indexes, cache recent in Redis

### **Chat Messages:**
- **Keep:** 30 days in hot storage
- **Archive:** S3 after 30 days (GDPR compliance)
- **Delete:** After 1 year (unless flagged)

### **Game States:**
- **Keep:** Active games in `game_states`
- **Archive:** Completed games → `game_states_archive` after 7 days
- **Delete:** `current_state` JSONB after archive (reduce size)

### **Analytics Data:**
- **Keep:** Aggregated stats forever
- **Raw Events:** 90 days
- **ML Training Data:** Anonymized, indefinite

---

## 🎯 PRIORITY MATRIX

### **Impact vs Effort:**

**High Impact, Low Effort** (Do First):
- Wire zoom-lock to backend (3 hours) ← **MVP BLOCKER**
- Provably fair shuffle (4 hours) ← **TRUST CRITICAL**
- Room-based URLs (2 hours) ← **UX ESSENTIAL**
- In-game chat (6 hours) ← **COMPETITIVE PARITY**

**High Impact, Medium Effort** (Do Soon):
- Friends system (16 hours) ← **COMPETITIVE ADVANTAGE**
- User profiles (12 hours) ← **USER RETENTION**
- Hand history viewer (16 hours) ← **COMPETITIVE ADVANTAGE**
- Spectator mode (8 hours) ← **ENGAGEMENT**

**High Impact, High Effort** (Do Later):
- Ranked mode (40 hours) ← **REVENUE DRIVER**
- Post-game analysis (60 hours) ← **MOAT FEATURE**
- Tournament mode (80 hours) ← **SCALABILITY TEST**
- AI GTO (120 hours) ← **PLATFORM DIFFERENTIATOR**

**Low Priority:**
- Learning page (content creation heavy)
- Forum aggregation (nice-to-have)

---

## 📐 MEASUREMENT PROCEDURES

### **Success Metrics:**

**Week 1:**
- [ ] 100 refreshes = 100 successful recoveries
- [ ] 0 security vulnerabilities
- [ ] < 100ms API latency (p95)

**Month 1:**
- [ ] 1,000 registered users
- [ ] 100 daily active users
- [ ] 10 concurrent games average
- [ ] < 1% error rate

**Month 3:**
- [ ] 10,000 registered users
- [ ] 1,000 daily active users
- [ ] 100 concurrent games average
- [ ] Positive unit economics

**Month 6:**
- [ ] 50,000 registered users
- [ ] 5,000 daily active users
- [ ] 500 concurrent games
- [ ] Platform break-even

---

## 🔄 CONTINUOUS PROCEDURES

### **Daily:**
- Monitor error rates (Sentry dashboard)
- Review user feedback (support tickets)
- Check server health (uptime, latency)

### **Weekly:**
- Review new feature requests
- Analyze user behavior (which features used most)
- Update this document (new procedures, learnings)

### **Monthly:**
- Performance review (optimize slow queries)
- Security audit (dependency updates)
- Cost analysis (optimize infrastructure spending)

### **Quarterly:**
- Architectural review (is system scaling well?)
- Competitor analysis (what features did they add?)
- Roadmap adjustment (based on user demand)

---

## 🎖️ SUMMARY FOR NEXT SESSION

**This Document Provides:**
1. ✅ Complete feature list (nothing missed)
2. ✅ Detailed procedures for each feature
3. ✅ Scaling considerations at each tier
4. ✅ Infrastructure procedures
5. ✅ Security, performance, deployment
6. ✅ UI consistency requirements
7. ✅ Measurement and continuous improvement

**Read This With:**
- `THE_TEN_COMMANDMENTS.md` (immutable truths)
- `CONTEXT.md` (current session state)
- `PLAN.md` (immediate tasks)

**Together, these four files give any LLM:**
- Present state (CONTEXT.md)
- Immutable rules (COMMANDMENTS.md)
- Immediate tasks (PLAN.md)  
- Future procedures (PLATFORM_PROCEDURES.md ← this file)

---

**OCTAVIAN - PROCEDURAL DOCUMENTATION COMPLETE** ⚔️

