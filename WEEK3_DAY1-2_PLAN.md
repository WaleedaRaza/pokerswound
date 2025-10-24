# WEEK 3 DAYS 1-2: HOST CONTROLS

**Goal:** Give hosts full control over their games
**Time:** 2-3 hours
**Status:** IN PROGRESS

---

## OBJECTIVES

### What We're Building:
1. **Kick Player** - Host can remove any player from room/game
2. **Set AWAY** - Host can manually mark players as away
3. **Change Capacity** - Adjust max players mid-game
4. **UI Controls** - Clean interface for host actions

---

## BACKEND ENDPOINTS

### 1. POST /api/rooms/:roomId/kick
**Body:** `{ hostId, targetPlayerId }`
**Logic:**
- Verify requester is host
- Remove player from room_seats
- Remove player from game (if active)
- Broadcast `player_kicked` event
- Return updated player list

### 2. POST /api/rooms/:roomId/set-away
**Body:** `{ hostId, targetPlayerId }`
**Logic:**
- Verify requester is host
- Use PlayerStatusManager to set AWAY
- Broadcast `player_status_changed` event
- Auto-fold on player's turns

### 3. POST /api/rooms/:roomId/capacity
**Body:** `{ hostId, newCapacity }`
**Logic:**
- Verify requester is host
- Validate capacity (2-10 players)
- Update room max_seats
- If reducing: don't kick existing players
- Broadcast `capacity_changed` event

---

## FRONTEND UI

### Host Control Panel
**Location:** In-game overlay (visible only to host)

**Components:**
```
[Player List]
- Player 1 (YOU) - Host
- Player 2 [Kick] [Set Away]
- Player 3 [Kick] [Set Away]

[Room Settings]
Max Players: [2-10 dropdown]
```

**Design:**
- Small collapsible panel on right side
- Only visible to host
- Confirmation dialogs for kick
- Visual feedback on actions

---

## INTEGRATION WITH EXISTING SYSTEMS

### Week 2 Systems:
- **PlayerStatusManager** - Already handles AWAY state
- **GameStateManager** - Will reflect kicked players
- **ActionTimer** - Works with AWAY status

### Updates Needed:
- Socket events for host actions
- UI shows host controls conditionally
- Game engine handles mid-game player removal

---

## IMPLEMENTATION ORDER

**Phase 1: Backend (30 min)**
1. Create kick endpoint
2. Create set-away endpoint
3. Create capacity endpoint
4. Test with curl/Postman

**Phase 2: Socket Integration (15 min)**
1. Add socket event handlers
2. Broadcast to all players
3. Update game state

**Phase 3: Frontend UI (45 min)**
1. Create HostControlPanel component
2. Add to poker.html (conditional render)
3. Wire up API calls
4. Add confirmation dialogs

**Phase 4: Testing (30 min)**
1. Test kick during game
2. Test set away
3. Test capacity changes
4. Test edge cases

---

## SUCCESS CRITERIA

- [ ] Host can kick any player
- [ ] Kicked player removed from game
- [ ] Host can set player to AWAY
- [ ] AWAY players auto-fold
- [ ] Host can change room capacity
- [ ] UI only visible to host
- [ ] All actions broadcast to all players
- [ ] No crashes or edge case bugs

---

## FILES TO MODIFY

**Backend:**
- `routes/rooms.js` - Add 3 new endpoints
- `sophisticated-engine-server.js` - Socket event handlers

**Frontend:**
- `public/poker.html` - Add host control panel
- `public/js/player-status-manager.js` - Integration

---

## EXECUTING NOW

