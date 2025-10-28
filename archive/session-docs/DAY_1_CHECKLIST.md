# 📋 DAY 1 EXECUTION CHECKLIST
**Date:** October 27, 2025  
**Goal:** Database Foundation - Unblock Everything Else

---

## ✅ MORNING TASKS (4 hours)

### [ ] 1. Deploy Migration (1 hour)
- [ ] Review `database/migrations/20251027_poker_table_evolution.sql`
- [ ] Test on local database first
- [ ] Check no existing queries break
- [ ] Run migration on dev database
- [ ] Verify all tables created with: 
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('processed_actions', 'audit_log', 'rate_limits');
  ```

### [ ] 2. Test Rollback (30 min)
- [ ] Copy rollback script from migration comments
- [ ] Test rollback works cleanly
- [ ] Test re-applying migration after rollback
- [ ] Document any issues found

### [ ] 3. Verify Existing Code Still Works (1.5 hours)
- [ ] Start server with new database
- [ ] Create a room
- [ ] Join room and start game  
- [ ] Play a few hands
- [ ] Check no errors in logs

### [ ] 4. Create Database Test Script (1 hour)
- [ ] File: `scripts/test-db-migration.js`
- [ ] Test inserting into each new table
- [ ] Test new functions work
- [ ] Test indexes are used (EXPLAIN queries)

---

## ✅ AFTERNOON TASKS (4 hours)

### [ ] 5. Create Database Access Layer (2 hours)
- [ ] File: `src/db/poker-table-v2.ts` or `.js`
- [ ] Connection pool setup
- [ ] Transaction helper functions
- [ ] Queries for new tables:
  - [ ] `incrementSequence(roomId)`
  - [ ] `checkIdempotency(key, userId)`  
  - [ ] `storeIdempotency(key, result, userId)`
  - [ ] `auditLog(entry)`
  - [ ] `checkRateLimit(userId, action)`

### [ ] 6. Add to app.locals (30 min)
- [ ] In `sophisticated-engine-server.js`:
  ```javascript
  app.locals.dbV2 = require('./src/db/poker-table-v2');
  ```
- [ ] Test access from a route
- [ ] Ensure no conflicts with existing db

### [ ] 7. Write Integration Test (1 hour)
- [ ] File: `tests/db-integration.test.js`
- [ ] Test sequence increment is atomic
- [ ] Test idempotency storage/retrieval
- [ ] Test rate limit tracking
- [ ] Test audit logging

### [ ] 8. Performance Check (30 min)
- [ ] Insert 10,000 audit log entries
- [ ] Query with indexes - should be <10ms
- [ ] Check table sizes
- [ ] Plan cleanup job if needed

---

## 🎯 END OF DAY CHECKLIST

### Must Have:
- [ ] All migrations applied successfully
- [ ] Existing poker game still works
- [ ] Database access layer created
- [ ] Basic tests passing

### Nice to Have:  
- [ ] Performance benchmarks documented
- [ ] Cleanup job scheduled
- [ ] Migration runbook created

### Blockers Found:
- [ ] List any issues here
- [ ] Plan solutions for tomorrow

---

## 📊 METRICS

Record actual times:
- Migration deployment: _____ min
- Rollback test: _____ min
- Integration testing: _____ min
- Total Day 1: _____ hours

---

## 🚀 READY FOR DAY 2?

If all boxes checked: ✅ Database foundation complete!

Tomorrow: Sequence numbers & idempotency (the magic that enables everything else)

**Remember:** This foundation enables the refresh fix on Day 3. Stay focused!
