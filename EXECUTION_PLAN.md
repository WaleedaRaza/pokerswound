# 🎯 EXECUTION PLAN - Data Tracking Completion

**Status:** In Progress  
**Goal:** Fix stats display + build Analytics Observatory  
**Approach:** Small iterative steps with testing between each

---

## ✅ **PHASE 0: Critical Fixes** (NOW)

### **Step 0.1: Fix biggest_pot extraction** 🔥
- [ ] Add `finalPotSize` capture in minimal-engine-bridge.js
- [ ] Update extraction to use `finalPotSize` in game-engine-bridge.js
- [ ] Test: Verify pot is captured before zeroing

### **Step 0.2: Run Migration 15** 🔥
- [ ] Execute Migration 15 in Supabase (merge columns)
- [ ] Verify: Check only `biggest_pot` exists
- [ ] Test: Query user_profiles for biggest_pot column

### **Step 0.3: Restart & Test Stats** 🔥
- [ ] Restart server
- [ ] Play 1 hand to completion
- [ ] Verify: All stats update (hands, wins, win_rate, biggest_pot, rooms_played, best_hand)
- [ ] Check server logs for data extraction

---

## ✅ **PHASE 1: Analytics Observatory** (NEXT)

### **Step 1.1: Add data extraction event emission**
- [ ] Add WebSocket emit in game-engine-bridge.js after data extraction
- [ ] Include: pot, winner, hand, extraction time
- [ ] Test: Check socket event fires

### **Step 1.2: Create analytics live data service**
- [ ] Create public/js/analytics-live.js
- [ ] Connect to WebSocket
- [ ] Listen for data_extracted events
- [ ] Store in local array

### **Step 1.3: Update Analytics page (minimal)**
- [ ] Add live data feed container
- [ ] Add health metrics display
- [ ] Initialize service on page load
- [ ] Test: Open Analytics page, play hand, see update

### **Step 1.4: Style & Polish**
- [ ] Add CSS for data feed items
- [ ] Add auto-scroll for new events
- [ ] Add timestamp formatting
- [ ] Test: Visual appearance

---

## ✅ **PHASE 2: Hand History Display** (FUTURE)

- [ ] Query hand_history table via API
- [ ] Display in table format
- [ ] Add pagination
- [ ] Test: Load history on page open

---

## 🎯 **SUCCESS CRITERIA PER PHASE:**

### **Phase 0:**
- ✅ Profile modal shows biggest_pot > $0
- ✅ Profile modal shows rooms_played > 0
- ✅ All 6 stats updating correctly
- ✅ No errors in console or logs

### **Phase 1:**
- ✅ Analytics page shows live data feed
- ✅ New hands appear automatically
- ✅ Health metrics update
- ✅ No performance issues

---

**Current Step:** 0.1 (Fix biggest_pot extraction)

