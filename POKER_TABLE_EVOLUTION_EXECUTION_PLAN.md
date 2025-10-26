# 🎯 POKER TABLE EVOLUTION - EXECUTION BATTLE PLAN

**Purpose:** Blitz through implementation with zero ambiguity  
**Timeline:** 11 days to production  
**Priority:** Fix refresh bug FIRST, then enhance  

---

## 🚨 CRITICAL PATH - What Blocks Everything Else

### **Day 1: Database Foundation (Unblocks Everything)**

**Morning (4 hours):**
1. Create migration file `migrations/20251027_poker_table_evolution.sql`
   - Add columns to existing tables (non-breaking)
   - Create new tables (processed_actions, audit_log, rate_limits, etc.)
   - Add indexes for performance
   - Test rollback capability

2. Deploy migration to development database
   - Verify no breaking changes
   - Test existing endpoints still work
   - Document any data transformations needed

**Afternoon (4 hours):**
3. Create core database access layer
   - File: `src/db/poker-table-v2.ts`
   - Single module with all new queries
   - Connection pooling setup
   - Transaction helpers

4. Verify database changes
   - Write simple test script
   - Ensure all tables created
   - Test a few inserts/queries
   - Check indexes are used

**Deliverable:** Database ready for new features

---

### **Day 2: Sequence Numbers & Idempotency (Unblocks Refresh Fix)**

**Morning (4 hours):**
1. Implement sequence number system
   - Add `seq` to game_states table
   - Create increment function
   - Add to all mutation endpoints
   - Test sequence increases

2. Create idempotency middleware
   - File: `src/middleware/idempotency.ts`
   - Check/store processed actions
   - Add to existing endpoints
   - Test duplicate requests

**Afternoon (4 hours):**
3. Update WebSocket broadcasts
   - Add seq to all messages
   - Add message versioning
   - Update client to check seq
   - Test stale message rejection

4. Integration test
   - Send actions in wrong order
   - Verify client ignores old seq
   - Test idempotent requests
   - Measure performance impact

**Deliverable:** No more duplicate/stale updates

---

### **Day 3: Hydration Endpoint (FIXES REFRESH BUG)**

**Morning (4 hours):**
1. Build `/api/rooms/:id/hydrate` endpoint
   - Gather all state in one query
   - Include private data (hole cards)
   - Add rejoin token validation
   - Return with sequence number

2. Create rejoin token system
   - Generate on seat claim
   - Store hashed in database
   - Add expiry logic
   - Return to client

**Afternoon (4 hours):**
3. Client hydration implementation
   - Check for rejoin token on load
   - Call hydration endpoint
   - Restore full state
   - Skip lobby if active game

4. Test refresh recovery
   - 100 refreshes = 100 successes
   - Test mid-hand, mid-bet
   - Test with timers running
   - Verify no state loss

**Deliverable:** REFRESH BUG FIXED ✅

---

### **Day 4: Timer System Overhaul**

**Morning (4 hours):**
1. Server-side timer implementation
   - Store turn_started_at timestamp
   - Add timebank tracking
   - Create timeout checker
   - Auto-action on expire

2. Update action endpoints
   - Set timer on turn start
   - Clear timer on action
   - Handle pause/resume
   - Test edge cases

**Afternoon (4 hours):**
3. Client timer display
   - Calculate from timestamp
   - Show countdown
   - Warning at 10s, 5s
   - Timebank activation

4. Timer persistence test
   - Refresh with timer at 15s
   - Verify shows ~15s after
   - Test timebank usage
   - Test auto-fold

**Deliverable:** Timers survive refresh

---

### **Day 5: New UI Components (Parallel Track)**

**Morning (4 hours):**
1. Create `public/poker-table-v2.html`
   - Copy navbar/auth from existing
   - New table layout
   - Consistent CSS variables
   - Mobile responsive

2. Build seat components
   - Empty seat (claim button)
   - Occupied seat (player info)
   - Status indicators
   - Chip displays

**Afternoon (4 hours):**
3. Create host control panel
   - Floating panel design
   - Settings inputs
   - Player management list
   - Join request popup

4. Wire basic interactions
   - Seat claiming
   - Show/hide panels
   - Responsive layout
   - Accessibility basics

**Deliverable:** New UI shell ready

---

### **Day 6: Connect UI to Game Engine**

**Morning (4 hours):**
1. Route new table to v2 UI
   - Feature flag check
   - Gradual rollout logic
   - A/B test setup
   - Metrics collection

2. Connect WebSocket handlers
   - Listen for table_update
   - Handle private_cards
   - Process timer updates
   - Show notifications

**Afternoon (4 hours):**
3. Hook up game actions
   - Fold/Call/Raise buttons
   - Bet slider
   - Action validation
   - Optimistic updates

4. Test game flow
   - Start hand
   - Make bets
   - See cards
   - Complete hand

**Deliverable:** Playable poker table

---

### **Day 7: Host Controls Implementation**

**Morning (4 hours):**
1. Host-only endpoints
   - Adjust chips
   - Change settings
   - Pause/resume
   - Kick players

2. Permission checks
   - Verify host role
   - Audit logging
   - Rate limiting
   - Error handling

**Afternoon (4 hours):**
3. Wire host UI controls
   - Settings panel
   - Player management
   - Join approvals
   - Real-time updates

4. Test host features
   - Adjust blinds mid-game
   - Pause and resume
   - Kick and rejoin
   - Change timers

**Deliverable:** Full host control

---

### **Day 8: Mid-Game Features**

**Morning (4 hours):**
1. Mid-game join system
   - Request endpoint
   - Queue management
   - Host notifications
   - Spectator mode

2. Show cards feature
   - After showdown window
   - Reveal endpoint
   - Broadcast reveals
   - UI animations

**Afternoon (4 hours):**
3. Away/Sitting out
   - Status transitions
   - Missed turn tracking
   - Auto-away logic
   - Grace periods

4. Integration testing
   - Join mid-game flow
   - Spectate then play
   - Show folded cards
   - Away and return

**Deliverable:** Advanced features complete

---

### **Day 9: RNG & Security**

**Morning (4 hours):**
1. Provably fair RNG
   - Commitment system
   - SHA256 seeding
   - Fisher-Yates shuffle
   - Audit storage

2. Security hardening
   - Input validation
   - SQL injection prevention
   - XSS protection
   - CORS configuration

**Afternoon (4 hours):**
3. Rate limiting
   - Implement limits
   - Redis backend
   - Graceful degradation
   - Admin overrides

4. Security testing
   - Penetration tests
   - Load testing
   - Abuse scenarios
   - Fix vulnerabilities

**Deliverable:** Production-secure system

---

### **Day 10: Observability & Testing**

**Morning (4 hours):**
1. Logging infrastructure
   - Structured logging
   - Trace IDs
   - Log aggregation
   - Error tracking

2. Metrics dashboard
   - Refresh recovery rate
   - Hydration latency
   - Timeout frequency
   - Error rates

**Afternoon (4 hours):**
3. E2E test suite
   - Playwright tests
   - Critical user flows
   - Refresh scenarios
   - Performance tests

4. Load testing
   - 100 concurrent games
   - 1000 users
   - Measure latency
   - Find bottlenecks

**Deliverable:** Observable, tested system

---

### **Day 11: Production Rollout**

**Morning (4 hours):**
1. Shadow validation
   - Run v1 and v2 parallel
   - Compare outputs
   - Fix discrepancies
   - Verify parity

2. Gradual rollout
   - 1% of users
   - Monitor metrics
   - Check error rates
   - User feedback

**Afternoon (4 hours):**
3. Full deployment
   - Increase to 10%
   - Then 50%
   - Then 100%
   - Monitor continuously

4. Documentation
   - Update README
   - API documentation
   - Troubleshooting guide
   - Post-mortem

**Deliverable:** Production poker table

---

## 📋 CRITICAL SUCCESS FACTORS

### **1. Order Matters**
- Database MUST come first
- Sequence numbers enable everything
- Hydration fixes refresh bug
- UI can be parallel after Day 3

### **2. Test Continuously**
- After each component
- Don't accumulate bugs
- 100 refresh test daily
- Load test before deploy

### **3. Feature Flags**
- Every new feature flagged
- Gradual rollout
- Quick rollback ability
- A/B test everything

### **4. Don't Break Working Code**
- Keep v1 running
- New endpoints only
- Parallel development
- Shadow validation

---

## 🎯 KEY METRICS TO TRACK

1. **Refresh Recovery Rate**
   - Current: ~20%
   - Day 3 target: 95%
   - Final target: 99.9%

2. **Hydration Latency**
   - Target: <100ms p50
   - Target: <500ms p99

3. **Timer Accuracy**
   - Drift: <1s per minute
   - Refresh: maintains time

4. **Sequence Integrity**
   - 0 out-of-order updates
   - 0 duplicate actions

---

## 🚫 WHAT NOT TO DO

1. **Don't touch working poker.html** until v2 is proven
2. **Don't skip idempotency** - it prevents SO many bugs
3. **Don't implement features before infra** - infra first
4. **Don't deploy without metrics** - blind deploys fail
5. **Don't skip shadow validation** - catches edge cases

---

## 🏃 DAILY EXECUTION RHYTHM

**Morning Standup (15 min)**
- What's blocking progress?
- What's today's goal?
- Any overnight issues?

**Midday Check (5 min)**
- On track for day's goal?
- Any surprises?
- Need to adjust?

**End of Day (15 min)**
- What got DONE?
- Update metrics
- Plan tomorrow
- Commit all code

---

## 🎊 DEFINITION OF DONE

**The table is DONE when:**
1. ✅ 100 refreshes = 100 perfect recoveries
2. ✅ Host can control everything
3. ✅ Timers are server-authoritative
4. ✅ Mid-game joins work
5. ✅ Show cards works
6. ✅ Away mode works
7. ✅ RNG is provably fair
8. ✅ 99.9% uptime for 24 hours
9. ✅ <100ms hydration p50
10. ✅ Shadow validation shows 100% parity

---

## 💪 LET'S FUCKING GO

This is 11 days of focused execution. No scope creep. No perfectionism. Just systematic progress through each milestone.

**Day 1 starts NOW.** Database first. Everything else follows.

Remember: The consultant gave us the blueprint. This plan executes it. We know exactly what to build and in what order.

**Current blocker:** Database schema. **Fix:** Run migrations now.

GO! 🚀