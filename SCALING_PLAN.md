# 🎯 SANDBOX → PRODUCTION SCALING PLAN

## 📊 CURRENT STATUS

**✅ Working:**
- Room management (create/join/codes)
- Seat claiming (real-time broadcast)
- Card dealing (real shuffle, private to each player)
- DB persistence (`game_states` JSONB)
- Host controls
- Both players see cards and action buttons

**❌ Not Working:**
- Action buttons (visible but no logic)
- Turn rotation
- Street progression (Flop/Turn/River)
- Winner determination
- Next hand

---

## 🛤️ SCALING STRATEGY

### **PHASE 2: MINIMAL ACTION LOGIC (THIS WEEKEND)**

**Goal:** Get a full hand playable start-to-finish in sandbox.

**Approach:** Simple JavaScript logic in `routes/minimal.js` (NO engine integration yet)

#### **Step 1: Wire Action Processing (2 hours)**
- [ ] Update `POST /api/minimal/action`
- [ ] Validate turn (reject if not your turn)
- [ ] Process FOLD/CALL/RAISE:
  - FOLD → mark `player.folded = true`
  - CALL → match `currentBet`, deduct chips, add to pot
  - RAISE → set new `currentBet`, deduct chips, add to pot
- [ ] Rotate turn to next active player
- [ ] Broadcast updated state to all players

**Test:** 2 players can FOLD/CALL/RAISE, turn rotates correctly

---

#### **Step 2: Betting Round Completion (1 hour)**
- [ ] Check if betting round complete:
  - All active players have acted
  - All active players match `currentBet` OR are all-in
- [ ] If complete, progress to next street

**Test:** After all players call, flop deals automatically

---

#### **Step 3: Street Progression (1 hour)**
- [ ] Deal flop (3 cards from deck)
- [ ] Reset bets to 0
- [ ] Reset turn to first active player after dealer
- [ ] Broadcast community cards

**Test:** Flop → Turn → River progression works

---

#### **Step 4: Showdown (1 hour)**
- [ ] After river betting complete, determine winner:
  - Use simple hand evaluator (can be basic for now)
  - Award pot to winner
- [ ] Broadcast results
- [ ] Mark hand as complete

**Test:** Full hand plays out, winner determined

---

#### **Step 5: Next Hand (30 min)**
- [ ] "NEXT HAND" button appears after showdown
- [ ] Rotate dealer button
- [ ] Reset players (un-fold, reset bets)
- [ ] Deal new cards

**Test:** Multiple hands in a row work

---

### **PHASE 3: ENGINE INTEGRATION (LATER - 1 WEEK)**

**Goal:** Replace simple logic with production engine.

**Approach:** Adapter pattern

#### **Step 1: Audit Engine (1 day)**
- [ ] Map engine state format vs sandbox format
- [ ] Identify missing fields
- [ ] Document conversion requirements

#### **Step 2: Build Adapter (2 days)**
- [ ] Create `src/adapters/sandbox-engine-adapter.js`
- [ ] `toEngineFormat(jsonbState)` → `GameStateModel`
- [ ] `toSandboxFormat(engineState)` → JSONB
- [ ] Unit tests for conversions

#### **Step 3: Swap Logic (2 days)**
- [ ] Replace `processActionSimple()` with engine calls
- [ ] Replace hand evaluator with `HandEvaluator`
- [ ] Replace street logic with `RoundManager`
- [ ] Extensive integration tests

#### **Step 4: Production Hardening (2 days)**
- [ ] Add error handling
- [ ] Add action validation
- [ ] Add timeout logic
- [ ] Add disconnection handling

---

### **PHASE 4: SCALE FEATURES (ONGOING)**

Once engine integrated:
- [ ] Multi-table support
- [ ] Tournament mode
- [ ] Spectators
- [ ] Chat
- [ ] Hand history
- [ ] Statistics tracking

---

## 🎯 DECISION: START WITH PHASE 2

**Why:**
- ✅ **Fast:** Get playable game THIS WEEKEND
- ✅ **Safe:** No risk to what's working
- ✅ **Testable:** Each step is small and verifiable
- ✅ **Momentum:** Shows progress every hour

**Why NOT jump to engine:**
- ❌ **Slow:** 10+ hours to bridge TypeScript → JSON
- ❌ **Risky:** Could break seat claiming, card dealing, etc.
- ❌ **Complex:** Engine uses Maps, classes, events
- ❌ **Blocking:** Can't test full flow until adapter done

---

## 📝 IMMEDIATE NEXT STEPS

1. **Accept this plan** ✅
2. **Implement Step 1** (action processing) → 2 hours
3. **Test with 2 browsers** → Players can fold/call/raise
4. **Implement Step 2** (betting round complete) → 1 hour
5. **Test flop dealing** → Flop appears after all call
6. **Continue through Phase 2**

---

## 🔥 PHILOSOPHY

**"Progress above all else."**

Get the game PLAYABLE first with simple logic.
Then refactor to production engine.

Don't let perfect be the enemy of done.

---

## 🎯 SUCCESS CRITERIA (THIS WEEKEND)

By end of weekend:
- [ ] 2 players can play a full hand start-to-finish
- [ ] Actions work (fold/call/raise)
- [ ] Streets progress (preflop → flop → turn → river)
- [ ] Winner determined
- [ ] Next hand button works

**If this works:** You have a PLAYABLE poker game (even if logic is simple)
**Then:** Refactor to engine for production robustness

---

**READY TO START PHASE 2, STEP 1?**

