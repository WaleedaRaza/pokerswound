# 🚀 POKER GAME EVOLUTION ROADMAP

## 🎯 CURRENT STATE (Where We Are)

### ✅ What Works:
- Room creation/joining with codes
- Seat claiming + WebSocket broadcasting
- Card dealing (2 hole cards per player)
- Betting actions (FOLD/CHECK/CALL/RAISE)
- Street progression (PREFLOP → FLOP → TURN → RIVER)
- Showdown evaluation (HandEvaluator)
- Winner determination
- Basic chip updates

### ❌ What's Broken:
- **Chip persistence doesn't work** (players still have $1000 after hand)
- **NEXT HAND just deals cards** (doesn't rotate dealer, reset properly)
- **No post-showdown period** (instant next hand)
- **No show/muck cards option**
- **Game doesn't end** (no elimination/last man standing)
- **Dealer doesn't rotate**
- **Blinds don't rotate**

---

## 📋 PHASE 1: FIX CORE HAND COMPLETION (CRITICAL)

### **GOAL:** Make one hand complete properly with correct chip awards

#### **TODO 1.1: Debug Chip Persistence** 🔴 CRITICAL
**Problem:** Chips update in gameState but not in reality
**Steps:**
1. Add console.log before/after room_seats UPDATE
2. Query room_seats after update to verify
3. Check if deal-cards reads from room_seats correctly
4. Verify UPDATE query isn't failing silently

**Expected Result:** After hand ends, query room_seats shows updated chips

#### **TODO 1.2: Fix Deal-Cards to Read Persisted Chips** 🔴 CRITICAL
**Problem:** New hand probably starts with hardcoded $1000
**Steps:**
1. Check `/api/minimal/deal-cards` endpoint
2. Ensure it reads `chips_in_play` from `room_seats` table
3. Use those chips as starting stack for new hand
4. Don't hardcode any chip values

**Expected Result:** Hand 2 starts with Hand 1's ending chips

#### **TODO 1.3: Add Post-Showdown Period** 🟡 HIGH
**Problem:** No delay between showdown and next hand
**Steps:**
1. After handleShowdown(), set `gameState.phase = 'POST_SHOWDOWN'`
2. Frontend detects this phase → shows 5-second countdown
3. During countdown:
   - Show final board
   - Show winner(s) with hand description
   - Show chip changes (+/- for each player)
   - Option to "SHOW CARDS" or "MUCK" (if folded earlier)
4. After 5 seconds, game enters 'COMPLETE' phase
5. Host can click "NEXT HAND"

**Expected Result:** 
- Winner announced with 5-second display
- Chips visibly awarded
- Players can show/muck
- Clean transition to next hand

#### **TODO 1.4: Implement Dealer Rotation** 🟡 HIGH
**Problem:** Dealer button doesn't move
**Steps:**
1. Track `dealer_position` in `rooms` table or `game_states`
2. On "NEXT HAND" click:
   - `dealer_position = (dealer_position + 1) % playerCount`
   - Recalculate SB, BB positions
   - Save to DB
3. Frontend displays dealer button chip on correct seat

**Expected Result:** Dealer button rotates clockwise each hand

#### **TODO 1.5: Implement Blind Rotation** 🟡 HIGH
**Problem:** Same players always post blinds
**Steps:**
1. Calculate SB/BB based on dealer position
2. 2-player: Dealer=SB, other=BB
3. 3+ players: Dealer → SB (next) → BB (next+1)
4. First actor post-flop = first after dealer
5. Blinds auto-deducted on deal

**Expected Result:** Blinds rotate with dealer, correct player acts first

---

## 📋 PHASE 2: MULTI-HAND GAME FLOW

### **GOAL:** Play continuous poker until elimination

#### **TODO 2.1: Track Hand Number** 🟢 MEDIUM
**Steps:**
1. Add `current_hand_number` to `rooms` table
2. Increment on each "NEXT HAND"
3. Display "Hand #5" in UI
4. Store in `game_states.hand_number`

**Expected Result:** UI shows "Hand #3" and increments

#### **TODO 2.2: Detect Elimination** 🟡 HIGH
**Problem:** Players with $0 can still play
**Steps:**
1. After showdown, check `player.chips <= 0`
2. If true, set `room_seats.status = 'ELIMINATED'`
3. Frontend shows seat as "ELIMINATED" (red/gray)
4. Player can spectate but not act
5. Don't deal cards to eliminated players

**Expected Result:** Player with $0 is eliminated, can't play

#### **TODO 2.3: Detect Game End (Last Man Standing)** 🟡 HIGH
**Problem:** Game never ends
**Steps:**
1. After each hand, count active players
2. If `activeCount === 1`:
   - Set `rooms.status = 'FINISHED'`
   - Broadcast `game_over` event
   - Show "🏆 Player X WINS!" alert
   - Display final standings (1st, 2nd, 3rd...)
   - Option to "START NEW GAME" (resets all chips)

**Expected Result:** Game ends when 1 player remains, shows winner

#### **TODO 2.4: Implement Sit Out / Return** 🟢 MEDIUM
**Steps:**
1. Add "SIT OUT NEXT HAND" button
2. Sets `room_seats.status = 'SITTING_OUT'`
3. Player keeps seat but doesn't get dealt cards
4. Chips preserved
5. Button changes to "I'M BACK"
6. Next hand, player is dealt in again

**Expected Result:** Players can sit out without losing seat

---

## 📋 PHASE 3: ADVANCED HAND FEATURES

### **GOAL:** Production-grade poker features

#### **TODO 3.1: Show Cards / Muck** 🟢 MEDIUM
**Steps:**
1. During POST_SHOWDOWN phase:
   - Players who folded can click "SHOW CARDS"
   - Broadcasts hole cards to all players
   - OR click "MUCK" (default after 5 sec)
2. At showdown:
   - Winning hand MUST be shown (auto)
   - Losing hands can muck (optional)
3. Store shown cards in hand history

**Expected Result:** Players can show/hide cards strategically

#### **TODO 3.2: All-In Side Pots** 🟡 HIGH
**Problem:** Currently doesn't handle side pots
**Steps:**
1. When player goes all-in with `chips < amountToCall`:
   - Create side pot
   - Main pot = all-in amount * players
   - Side pot = remaining bets
2. Track multiple pots: `[{ amount, eligiblePlayers }]`
3. At showdown, award each pot separately
4. Display "Main Pot: $100, Side Pot: $50"

**Expected Result:** Correct side pot handling with all-ins

#### **TODO 3.3: Minimum Bet Enforcement** 🟢 MEDIUM
**Steps:**
1. On RAISE, validate:
   - `raiseAmount >= currentBet * 2` (min raise = 2x current)
   - `raiseAmount >= bigBlind` (min raise = BB)
2. Show error if too low
3. Suggest minimum: "Minimum raise: $20"

**Expected Result:** Can't make tiny raises, enforces poker rules

#### **TODO 3.4: Pot Limit / No Limit Modes** 🟢 LOW
**Steps:**
1. Add `rooms.bet_limit` column: 'NO_LIMIT' | 'POT_LIMIT' | 'LIMIT'
2. NO_LIMIT: Any bet up to stack
3. POT_LIMIT: Max bet = pot size
4. LIMIT: Fixed bet sizes only
5. Enforce in action validation

**Expected Result:** Different game formats available

#### **TODO 3.5: Time Bank / Auto-Fold** 🟡 HIGH
**Steps:**
1. Add `actor_action_deadline` timestamp to gameState
2. Frontend shows countdown timer (30 seconds)
3. Backend job checks if deadline passed
4. If expired → auto-fold player
5. Broadcast fold action
6. Advance to next player

**Expected Result:** Games don't stall waiting for AFK players

---

## 📋 PHASE 4: MULTI-PLAYER SCALING

### **GOAL:** Support 3-9 players robustly

#### **TODO 4.1: 3-9 Player Support** 🟡 HIGH
**Currently:** Only tested with 2 players
**Steps:**
1. Test with 3, 6, 9 players
2. Fix dealer/blind rotation for 3+ players
3. Ensure turn order correct
4. Handle edge cases (all but one folds)
5. Test betting rounds with 9 players

**Expected Result:** Smooth gameplay with any player count

#### **TODO 4.2: Spectator Mode** 🟢 MEDIUM
**Steps:**
1. Allow users to join room without claiming seat
2. Set `role = 'SPECTATOR'`
3. See public game state (no hole cards)
4. Can chat (if chat implemented)
5. Can't act or interfere
6. Can claim seat between hands

**Expected Result:** Non-players can watch games

#### **TODO 4.3: Late Join (Between Hands)** 🟢 MEDIUM
**Steps:**
1. When room.status = 'WAITING', allow seat claims
2. When room.status = 'ACTIVE', block seat claims
3. Show "Game in progress, wait for next hand"
4. After hand ends, new player can join

**Expected Result:** Players join between hands, not mid-hand

#### **TODO 4.4: Disconnect Handling (Grace Period)** 🟡 HIGH
**Steps:**
1. On socket disconnect:
   - Set `room_seats.status = 'DISCONNECTED'`
   - Start 60-second grace timer
   - Auto-fold current action if their turn
2. If reconnect within 60s:
   - Restore player
   - Re-hydrate game state
3. If timeout:
   - Set status = 'LEFT'
   - Free seat after hand completes
   - Chips held in escrow for 5 minutes

**Expected Result:** Brief disconnects don't eliminate players

---

## 📋 PHASE 5: HAND HISTORY & STATISTICS

### **GOAL:** Track and display player performance

#### **TODO 5.1: Hand History Viewer** 🟢 MEDIUM
**Steps:**
1. Endpoint: `GET /api/history/:roomId`
2. Query `game_states` WHERE `status='completed'`
3. Return list: hand number, winner, pot, cards
4. Frontend: Modal with scrollable hand list
5. Click hand → see full replay

**Expected Result:** View past hands in a room

#### **TODO 5.2: Player Statistics** 🟢 MEDIUM
**Steps:**
1. Endpoint: `GET /api/stats/:userId/:roomId`
2. Calculate:
   - Hands played
   - Hands won
   - Total chips won/lost
   - Biggest pot
   - Win rate %
   - VPIP (voluntarily put $ in pot)
3. Display in UI

**Expected Result:** "You've won 12/50 hands (24%)"

#### **TODO 5.3: Hand Replay** 🟢 LOW
**Steps:**
1. Endpoint: `GET /api/replay/:gameId`
2. Return full `game_states.current_state` JSONB
3. Frontend: Step through each action
4. Show: "Player 1 raises to $20"
5. Animate cards being dealt

**Expected Result:** Watch hand play-by-play

#### **TODO 5.4: Export Hand History** 🟢 LOW
**Steps:**
1. Button: "Export to PokerTracker format"
2. Convert `game_states` to standard format
3. Download as .txt or .json
4. Compatible with analysis tools

**Expected Result:** Export for external analysis

---

## 📋 PHASE 6: TOURNAMENT MODE

### **GOAL:** Structured multi-table tournaments

#### **TODO 6.1: Tournament Creation** 🟡 HIGH
**Steps:**
1. New table: `tournaments`
   - id, name, buy_in, starting_chips, blind_schedule
   - status: 'REGISTERING' | 'ACTIVE' | 'FINISHED'
2. Endpoint: `POST /api/tournaments/create`
3. Players register (pay buy-in)
4. Auto-start when full or time limit

**Expected Result:** Create tournament with 20 players

#### **TODO 6.2: Blind Level Progression** 🟡 HIGH
**Steps:**
1. Store blind schedule: `[(5/10, 10min), (10/20, 10min), ...]`
2. Timer increases blinds every N minutes
3. Broadcast `blind_increase` event
4. Show "Blinds now 25/50" alert
5. Update `rooms.small_blind` and `big_blind`

**Expected Result:** Blinds automatically increase over time

#### **TODO 6.3: Prize Pool Distribution** 🟢 MEDIUM
**Steps:**
1. Calculate prize pool: `buy_in * playerCount * 0.9` (10% rake)
2. Distribute:
   - 1st: 50%
   - 2nd: 30%
   - 3rd: 20%
3. Award chips/money on tournament end
4. Update user balances

**Expected Result:** Winners get prize money

#### **TODO 6.4: Knockout Tracking** 🟢 LOW
**Steps:**
1. Track `eliminated_by_user_id` when player knocked out
2. Award bounties (if bounty tournament)
3. Show "Player 1 eliminated Player 5"
4. Leaderboard updates

**Expected Result:** Track who knocked out who

---

## 📋 PHASE 7: CHIP ECONOMY & MONETIZATION

### **GOAL:** Robust in-game economy

#### **TODO 7.1: User Chip Balance** 🟡 HIGH
**Steps:**
1. Add `user_profiles.chip_balance` column
2. Starting balance: 500 chips (free)
3. Buy-in deducts from balance
4. Winnings add to balance
5. Can't join game without chips

**Expected Result:** Persistent chip balance across games

#### **TODO 7.2: Free Chip Earning** 🟢 MEDIUM
**Steps:**
1. Watch ad → +100 chips (daily limit: 3)
2. Share link → +100 chips (track referrals)
3. Daily login bonus → +50 chips
4. Integrate ad provider (AdSense)

**Expected Result:** Players earn free chips

#### **TODO 7.3: Chip Purchases** 🟢 LOW
**Steps:**
1. Stripe integration
2. Packages:
   - $0.99 → 1,000 chips
   - $4.99 → 7,500 chips
   - $9.99 → 12,500 chips
3. Process payment → update balance
4. Transaction history

**Expected Result:** Players can buy chips

#### **TODO 7.4: Ranked Play Separation** 🟡 HIGH
**Steps:**
1. Two chip balances:
   - `play_chips` (casual, free)
   - `ranked_chips` (competitive, earned)
2. Ranked games use `ranked_chips` only
3. Can't transfer between balances
4. Separate leaderboards

**Expected Result:** Ranked play has separate economy

---

## 📋 PHASE 8: SOCIAL & COMMUNICATION

### **GOAL:** Players interact and form communities

#### **TODO 8.1: In-Game Chat** 🟢 MEDIUM
**Steps:**
1. WebSocket event: `chat_message`
2. Store in `chat_messages` table
3. Display in sidebar
4. Filter profanity
5. Mute option
6. Emojis / quick reactions

**Expected Result:** Players chat during games

#### **TODO 8.2: Friend System** 🟢 MEDIUM
**Steps:**
1. Table: `friendships` (user_id, friend_id, status)
2. Send friend request
3. Accept/decline
4. View friend list
5. See online status
6. Invite to game (direct link)

**Expected Result:** Add friends, see when online

#### **TODO 8.3: Clubs / Teams** 🟢 LOW
**Steps:**
1. Table: `clubs` (name, owner_id, members)
2. Create club
3. Invite members
4. Club-only games
5. Club leaderboard
6. Club chat

**Expected Result:** Groups play together regularly

#### **TODO 8.4: User Profiles** 🟡 HIGH
**Steps:**
1. Set username (unique)
2. Avatar upload
3. Bio / stats display
4. Hand history
5. Achievements
6. Settings (privacy, notifications)

**Expected Result:** Rich user profiles

---

## 📋 PHASE 9: RANKED & MATCHMAKING

### **GOAL:** Competitive ladder system

#### **TODO 9.1: ELO Rating System** 🟡 HIGH
**Steps:**
1. Add `user_profiles.elo_rating` (start: 1000)
2. After each ranked game:
   - Winner gains ELO
   - Loser loses ELO
   - Amount based on rating difference
3. Display rating in profile
4. Rank tiers: Bronze, Silver, Gold, Diamond

**Expected Result:** Players have skill ratings

#### **TODO 9.2: Auto-Matchmaking** 🟡 HIGH
**Steps:**
1. Button: "PLAY RANKED"
2. Enters matchmaking queue
3. Match with players ±100 ELO
4. Auto-create room + start game
5. Can't leave without penalty

**Expected Result:** Click → auto-matched with similar skill

#### **TODO 9.3: Leaderboards** 🟢 MEDIUM
**Steps:**
1. Global leaderboard (top 100)
2. Friends leaderboard
3. Club leaderboard
4. Filter by: ELO, chips won, hands played
5. Weekly/monthly/all-time

**Expected Result:** Competitive rankings

#### **TODO 9.4: Seasons & Rewards** 🟢 LOW
**Steps:**
1. 3-month seasons
2. End-of-season rewards:
   - Top 10: Exclusive avatar
   - Top 100: Chip bonus
3. Reset ELO with soft reset
4. Season history

**Expected Result:** Ongoing competitive cycle

---

## 📋 PHASE 10: POLISH & OPTIMIZATION

### **GOAL:** Production-ready performance

#### **TODO 10.1: Proper Hydration on Refresh** 🔴 CRITICAL
**Steps:**
1. On page load, fetch current game state
2. Render from server truth (not guessing)
3. WebSocket reconnect → re-join room
4. Verify seat still claimed
5. Show cards if hand active
6. Sync action buttons

**Expected Result:** Refresh works perfectly mid-hand

#### **TODO 10.2: Sequence Numbers for Idempotency** 🟡 HIGH
**Steps:**
1. Add `game_states.sequence_number`
2. Increment on every mutation
3. Client tracks `currentSeq`
4. Ignore broadcasts with `seq <= currentSeq`
5. Prevents race conditions

**Expected Result:** No stale state after refresh

#### **TODO 10.3: Server-Side Validation** 🟡 HIGH
**Steps:**
1. Validate every action:
   - Is it your turn?
   - Do you have enough chips?
   - Is the bet amount valid?
2. Return 400 errors for invalid actions
3. Don't trust client

**Expected Result:** No cheating possible

#### **TODO 10.4: Rate Limiting** 🟢 MEDIUM
**Steps:**
1. Limit API calls: 100/minute per user
2. WebSocket message limit
3. Prevent spam/DDOS
4. Return 429 if exceeded

**Expected Result:** Server protected from abuse

#### **TODO 10.5: Graceful Error Handling** 🟢 MEDIUM
**Steps:**
1. All endpoints have try/catch
2. Rollback DB on failure
3. Broadcast error events
4. Show user-friendly error messages
5. Log errors to Sentry

**Expected Result:** Errors don't crash games

---

## 📋 PHASE 11: ADVANCED FEATURES (LATER)

#### **TODO 11.1: Post-Game Analysis (LLM)** 🟢 LOW
- Analyze hand → get AI insights
- "You should have folded on the turn"
- Rate-limited (5/day free)

#### **TODO 11.2: GTO Solver Integration** 🟢 LOW
- Partner feature (outsourced)
- ML-driven optimal play

#### **TODO 11.3: Learning Hub** 🟢 LOW
- Poker strategy articles
- Video tutorials
- Interactive quizzes

#### **TODO 11.4: Forum & Community** 🟢 LOW
- Discussion boards
- Hand analysis posts
- News aggregation

---

## 🎯 PRIORITY ORDER (NEXT 10 TASKS)

1. **🔴 TODO 1.1: Debug Chip Persistence** (CRITICAL - fix now)
2. **🔴 TODO 1.2: Fix Deal-Cards to Read Persisted Chips** (CRITICAL)
3. **🟡 TODO 1.3: Add Post-Showdown Period** (5-second pause)
4. **🟡 TODO 1.4: Implement Dealer Rotation** (blinds move)
5. **🟡 TODO 1.5: Implement Blind Rotation** (correct positions)
6. **🟡 TODO 2.2: Detect Elimination** (kick out $0 players)
7. **🟡 TODO 2.3: Detect Game End** (last man standing)
8. **🟡 TODO 3.2: All-In Side Pots** (correct pot splitting)
9. **🟡 TODO 3.5: Time Bank / Auto-Fold** (prevent stalling)
10. **🔴 TODO 10.1: Proper Hydration on Refresh** (mid-hand refresh works)

---

## ✅ COMPLETION CRITERIA

### **PHASE 1 DONE WHEN:**
- ✅ Chips persist correctly between hands
- ✅ Dealer rotates
- ✅ Blinds rotate
- ✅ 5-second post-showdown period
- ✅ "NEXT HAND" works perfectly

### **PHASE 2 DONE WHEN:**
- ✅ Game ends when 1 player remains
- ✅ Winner announced
- ✅ Eliminated players can't play
- ✅ Can play 10 hands in a row without bugs

### **FULL MVP DONE WHEN:**
- ✅ Phases 1-4 complete
- ✅ 3-9 players works smoothly
- ✅ Hand history viewable
- ✅ No major bugs in 100 test hands
- ✅ Can run a full tournament

---

**TOTAL TASKS:** 50+
**CRITICAL PATH:** Phase 1 (5 tasks) → Phase 2 (4 tasks) → Phase 10.1 (1 task)

**ESTIMATED TIME:**
- Phase 1: 2-4 hours
- Phase 2: 2-3 hours  
- Phase 3-4: 4-6 hours
- Phase 5-11: 20+ hours

**LET'S START WITH PHASE 1, TASK 1.1 NOW.**

