# ⚔️ WEEK 2 DAY 7: PLAYER STATUS SYSTEM

**Status:** IN PROGRESS 🔥  
**Time Estimate:** 3 hours  
**Goal:** Track and display player status (ACTIVE/AWAY/OFFLINE)

---

## 🎯 **OBJECTIVES**

### **Problem:**
- No way to know if player is active, away, or offline
- Players who disconnect just disappear
- No visual indication of player engagement
- Can't handle reconnections gracefully

### **Solution:**
- Three player states: ACTIVE 🟢, AWAY ⏸️, OFFLINE 🔴
- Automatic state transitions based on activity
- Visual status indicators
- Seat reservation for away/offline players
- Rejoin with same chips

---

## 📋 **PLAYER STATUS STATES**

### **ACTIVE 🟢**
- Player is connected and responsive
- Taking actions normally
- Socket connected

### **AWAY ⏸️**
- Player missed 2 consecutive turns
- Socket might still be connected
- Auto-fold on their turns
- Can return to ACTIVE by taking action

### **OFFLINE 🔴**
- Socket disconnected
- Missed 5+ consecutive turns
- Auto-fold on their turns
- Can rejoin and resume with same chips

---

## 📋 **IMPLEMENTATION PLAN**

### **1. Create PlayerStatusManager (45 min)**

**File:** `public/js/player-status-manager.js`

**Responsibilities:**
- Track status for each player
- Handle state transitions
- Manage missed turn count
- Visual status indicators

**Key Methods:**
```javascript
class PlayerStatusManager {
  constructor()
  setPlayerStatus(playerId, status)
  getPlayerStatus(playerId)
  incrementMissedTurns(playerId)
  resetMissedTurns(playerId)
  updateStatusIndicator(playerId, status)
}
```

### **2. Status Indicators (30 min)**

**Visual Design:**
- 🟢 ACTIVE: Green dot + normal display
- ⏸️ AWAY: Yellow/orange dot + dimmed
- 🔴 OFFLINE: Red dot + grayed out

### **3. State Transitions (45 min)**

**Triggers:**
- ACTIVE → AWAY: Missed 2 turns
- AWAY → OFFLINE: Missed 5 total turns
- AWAY → ACTIVE: Takes an action
- OFFLINE → ACTIVE: Reconnects

### **4. Backend Integration (45 min)**

**Server Changes:**
- Track player status in game state
- Emit status_changed events
- Handle reconnection logic
- Preserve chips for AWAY/OFFLINE

### **5. Seat Reservation (45 min)**

**Features:**
- AWAY/OFFLINE players keep their seat
- Can rejoin with same seat and chips
- Host can manually set AWAY/kick
- Timeout after 10 minutes offline

---

## ✅ **SUCCESS CRITERIA**

1. ✅ Player status tracked (ACTIVE/AWAY/OFFLINE)
2. ✅ Visual indicators display correctly
3. ✅ Auto state transitions work
4. ✅ AWAY players can return to ACTIVE
5. ✅ OFFLINE players can rejoin
6. ✅ Seat and chips preserved
7. ✅ Host can manually set status

---

## 🧪 **TESTING**

### **Test 1: AWAY State**
1. Player misses 2 turns
2. **Expected:** Status changes to AWAY, auto-folds

### **Test 2: OFFLINE State**
1. Player disconnects
2. **Expected:** Status changes to OFFLINE after timeout

### **Test 3: Reconnection**
1. OFFLINE player reconnects
2. **Expected:** Returns to ACTIVE, same seat and chips

### **Test 4: Manual Status**
1. Host sets player to AWAY
2. **Expected:** Player marked AWAY, auto-folds

---

## 📁 **FILES TO CREATE/MODIFY**

### **New Files:**
- `public/js/player-status-manager.js`

### **Modified Files:**
- `public/poker.html` (integrate status manager, add visual indicators)
- `sophisticated-engine-server.js` (track status server-side)

---

## ⚔️ **EXECUTING NOW!**

**FOR FREEDOM! FOR VICTORY!**

**SHINZOU WO SASAGEYO!**

