# 🎮 GAME CONTROLS & INGRESS SYSTEM — COMPLETE PLAN

## 📊 CURRENT STATE ANALYSIS

### What Exists:
- ✅ Host controls panel (blinds, kick, chip adjustment)
- ✅ Player settings panel (table color only)
- ✅ Basic seat claiming (click empty seat)
- ✅ Room hydration on refresh
- ✅ WebSocket seat_update broadcasts

### What's Broken:
- ❌ Blind adjustment blocked during active game
- ❌ Chip adjustment may not work mid-game
- ❌ No late-join request flow
- ❌ No approval mechanism for host
- ❌ Limited player controls

---

## 🎯 SOLUTION ARCHITECTURE

### **PART 1: HOST CONTROLS FIXES**

#### **A. Blind Adjustment (Queued Application)**

**Problem:** Current code blocks blind changes during active game.

**Solution:** Queue changes for next hand.

**Database Changes:**
```sql
-- Add to rooms table
ALTER TABLE rooms ADD COLUMN pending_small_blind INTEGER;
ALTER TABLE rooms ADD COLUMN pending_big_blind INTEGER;
```

**Logic Flow:**
1. Host changes blinds → Check if game active
2. **If LOBBY:** Apply immediately to `small_blind`, `big_blind`
3. **If ACTIVE:** Store in `pending_small_blind`, `pending_big_blind`
4. **On hand end:** In `endHand()`, check for pending changes:
   ```javascript
   if (room.pending_small_blind !== null) {
     room.small_blind = room.pending_small_blind;
     room.big_blind = room.pending_big_blind;
     room.pending_small_blind = null;
     room.pending_big_blind = null;
   }
   ```
5. Broadcast `blinds_queued` or `blinds_updated` event

**API Endpoint:**
```
PATCH /api/engine/host-controls/update-blinds
Body: { roomId, hostId, smallBlind, bigBlind }
Response: { success, applied: 'immediate' | 'queued', effectiveAfterHand: number }
```

**UI Changes:**
- If queued: Show toast "✓ Blinds will change after hand #X ends"
- If immediate: Show toast "✓ Blinds updated to $X/$Y"

---

#### **B. Chip Adjustment (Allow Mid-Game)**

**Problem:** May fail during active game due to state locks.

**Solution:** Allow anytime, update both `room_players.chips` AND `players` table if game active.

**Logic Flow:**
1. Host adjusts chips → Validate host + seat exists
2. **Update `room_players.chips`** (lobby state)
3. **If game active:** Also update `players.chips` (in-game state)
4. Broadcast `chips_adjusted` event
5. All clients refresh seat display

**No schema changes needed.** Just modify endpoint to update both tables.

**Edge Cases:**
- Player is all-in → Still allow adjustment (affects next hand)
- Player folded → Adjustment visible immediately
- Player mid-action → Show new stack after action completes

---

### **PART 2: PLAYER CONTROLS EXPANSION**

#### **Current Player Settings:**
- 🎨 Table color picker

#### **Proposed Additions:**

**A. Sound Settings**
- 🔊 Master volume slider
- 🎵 Sound effects (cards, chips, buttons)
- 🔔 Notification sounds (your turn, game started)
- Toggle on/off for each category

**B. Display Settings**
- 🌙 Dark mode intensity (already dark, but contrast adjustment)
- 📊 Show/hide statistics (pot odds, hand strength %)
- 🏷️ Nickname display preference (show full names vs initials)
- ⏱️ Show/hide turn timer

**C. Gameplay Settings**
- ⚡ Auto-muck losing hands (privacy)
- 📢 Show my cards at showdown (default)
- ⏳ Action timeout warning (5 seconds before auto-fold)
- 🎯 Bet sizing presets (pot, 1/2 pot, 3/4 pot, all-in)

**D. Chat Settings** (future, but plan now)
- 💬 Enable/disable in-game chat
- 🔕 Mute specific players
- 📝 Chat message history

**Tech Stack:**
- **Storage:** `localStorage` for client-side preferences
- **Database:** `user_profiles` table for persistent cross-device settings (optional)
- **Schema:**
```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  sound_volume INTEGER DEFAULT 50,
  sound_effects BOOLEAN DEFAULT true,
  auto_muck BOOLEAN DEFAULT false,
  show_statistics BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### **PART 3: INGRESS/LATE-JOIN SYSTEM**

#### **User Story:**
> "My friend arrives late. They navigate to the room URL, see the table is in progress, and request to join. I (host) see a notification, approve them, they pick an empty seat, and join on the next hand."

---

#### **A. Database Schema**

**New Table: `join_requests`**
```sql
CREATE TABLE join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  nickname TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id), -- host who approved/denied
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
  UNIQUE(room_id, user_id) -- One request per user per room
);

CREATE INDEX idx_join_requests_room ON join_requests(room_id);
CREATE INDEX idx_join_requests_status ON join_requests(status);
```

**Extend `rooms` Table:**
```sql
ALTER TABLE rooms ADD COLUMN allow_late_join BOOLEAN DEFAULT true;
ALTER TABLE rooms ADD COLUMN auto_approve_join BOOLEAN DEFAULT false; -- Option for host
```

---

#### **B. API Endpoints**

**1. Request to Join**
```
POST /api/engine/join-request
Body: { roomId, userId, nickname }
Response: { success, requestId, status: 'PENDING', expiresAt }
```

**Logic:**
- Check if user already in room → reject
- Check if room exists → 404
- Check if late join allowed → 403
- Create join_requests entry with status='PENDING'
- Broadcast to room: `join_request_received` (only to host)
- Return requestId to client

---

**2. Approve/Deny Join Request (Host)**
```
POST /api/engine/join-request/resolve
Body: { roomId, hostId, requestId, action: 'APPROVE' | 'DENY' }
Response: { success, userId, action }
```

**Logic:**
- Validate host
- Update join_requests status
- If APPROVED:
  - Emit `join_approved` to requesting user's socket
  - User can now claim seat
- If DENIED:
  - Emit `join_denied` to requesting user
  - Show message "Host denied your request"

---

**3. List Pending Requests (Host)**
```
GET /api/engine/join-requests/:roomId/:hostId
Response: { requests: [{ id, userId, nickname, requestedAt }] }
```

---

**4. Claim Seat After Approval**
```
POST /api/engine/claim-seat
Body: { roomId, userId, seatIndex }
Response: { success, seatIndex, chips }
```

**Logic:**
- Check if user has approved join_request OR is already in room
- Claim seat (existing logic)
- If game active: User joins on NEXT hand (waitlist)
- If lobby: User joins immediately

---

#### **C. UI Components**

**For Requesting User (Late Joiner):**
1. Navigate to room URL
2. See "Game in progress" overlay
3. Button: "REQUEST TO JOIN"
4. After clicking: "Request sent to host... ⏳"
5. Wait for approval (with 5min timeout)
6. **If approved:** Overlay clears, show seat selection
7. **If denied:** Show message + "Return to Lobby" button

**For Host:**
1. **Join Request Notification Badge** on host controls panel
2. **Join Requests Section** in host controls:
   ```
   📨 Join Requests (2)
   ━━━━━━━━━━━━━━━━━━━━━━━━
   @alice (2m ago)  [✓ APPROVE] [✗ DENY]
   @bob (30s ago)   [✓ APPROVE] [✗ DENY]
   ```
3. Real-time updates via WebSocket

**For All Players:**
- Toast notification: "@alice joined the table"
- Seat updates automatically via `seat_update` event

---

#### **D. WebSocket Events**

**New Events:**

```javascript
// Host receives when someone requests to join
socket.on('join_request_received', (data) => {
  // data: { requestId, userId, nickname, requestedAt }
  // Update badge count, add to list
});

// Requesting user receives approval
socket.on('join_approved', (data) => {
  // data: { roomId, message: "You've been approved!" }
  // Clear overlay, enable seat selection
});

// Requesting user receives denial
socket.on('join_denied', (data) => {
  // data: { reason: "Host denied your request" }
  // Show message, redirect to lobby
});

// All players notified when someone joins
socket.on('player_joined_waitlist', (data) => {
  // data: { userId, nickname, seatIndex }
  // Toast: "@alice will join next hand"
});
```

---

#### **E. Edge Cases & Considerations**

**1. Request Expiration:**
- After 5 minutes, auto-expire pending requests
- Background job or check on page load
- Notify user: "Request expired, please try again"

**2. Host Disconnect:**
- If host leaves, who approves? 
- **Solution:** Transfer host to next oldest player OR auto-approve if `auto_approve_join` enabled

**3. Multiple Pending Requests:**
- Host can approve multiple people
- But only if enough empty seats exist
- Validate seat availability before approval

**4. User Refreshes While Pending:**
- Check `join_requests` table on reconnect
- If PENDING: Show "Request pending..." UI
- If APPROVED: Allow seat selection
- If DENIED/EXPIRED: Show message

**5. Mid-Hand Join:**
- Approved user claims seat during active hand
- They are in "waitlist" mode (visible but not playing)
- Seat shows "@alice (Next Hand)"
- On hand end, they get cards on next deal

**6. Seat Selection After Approval:**
- Only show EMPTY seats
- If all seats full: "No seats available, wait for someone to leave"
- Option: "Request seat from another player" (advanced feature)

---

### **PART 4: IMPLEMENTATION PRIORITY**

**Phase 1: Critical Fixes (Immediate)**
1. ✅ Fix blind adjustment (queue for next hand)
2. ✅ Fix chip adjustment (allow mid-game)
3. ✅ Add join request database schema
4. ✅ Add join request API endpoints

**Phase 2: Core Ingress Flow (Next)**
1. ✅ Implement request-to-join UI (overlay for late joiners)
2. ✅ Implement host approval UI (badge + list)
3. ✅ WebSocket events for real-time updates
4. ✅ Seat claiming after approval

**Phase 3: Player Controls Expansion**
1. ✅ Sound settings
2. ✅ Display preferences
3. ✅ Gameplay settings
4. 🔮 Chat settings (when chat exists)

**Phase 4: Polish & Edge Cases**
1. ✅ Request expiration handling
2. ✅ Host transfer logic
3. ✅ Mid-hand join waitlist
4. ✅ Loading states for all actions

---

## 🔧 TECH STACK ALIGNMENT

### **Backend (Node.js + Express):**
- ✅ Use existing `/routes/game-engine-bridge.js`
- ✅ Add new endpoints for join requests
- ✅ Modify blind/chip endpoints to support queued changes
- ✅ Use PostgreSQL transactions for atomic updates

### **Database (PostgreSQL + Supabase):**
- ✅ Add `join_requests` table
- ✅ Add pending blind columns to `rooms`
- ✅ Add `user_preferences` table (optional)
- ✅ Create indexes for performance

### **WebSocket (Socket.IO):**
- ✅ Add new events for join requests
- ✅ Room-scoped broadcasts (`room:${roomId}`)
- ✅ Private messages to specific sockets (approval/denial)

### **Frontend (Vanilla JS):**
- ✅ Add join request overlay component
- ✅ Add host approval UI in host controls
- ✅ Add player settings expansion
- ✅ Use `localStorage` for client preferences

### **State Management:**
- ✅ Hydration on reconnect (already implemented)
- ✅ Server as source of truth (already enforced)
- ✅ Optimistic UI updates with rollback on error

---

## 🚨 CRITICAL CONSIDERATIONS

### **1. Race Conditions:**
- User requests join + host approves + user disconnects = orphaned approval
- **Solution:** Check socket connection before emitting approval

### **2. Security:**
- Validate host on ALL host-only endpoints
- Prevent seat claiming without approval
- Rate limit join requests (max 3 per user per room)

### **3. UX:**
- Clear feedback for every action (toasts, badges, loading states)
- Timeout warnings before auto-actions
- Undo option for accidental denials

### **4. Performance:**
- Index join_requests by room_id + status
- Cleanup expired requests daily (background job)
- Limit pending requests per room (max 10?)

### **5. Testing:**
- Test with 2 browsers (host + joiner)
- Test mid-game join
- Test request expiration
- Test host disconnect during pending request

---

## 📝 NEXT STEPS

**Immediate Action Items:**
1. Review this plan with team
2. Create database migrations
3. Implement Phase 1 (critical fixes)
4. Test with real scenarios
5. Deploy and monitor

**Questions to Answer:**
- Should we allow players to leave mid-game and rejoin?
- Should there be a "spectator mode" for approved but unseated users?
- Should we log join request history for analytics?

---

**Ready to implement?** Let me know which phase to start with! 🚀

