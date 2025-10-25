# WEEK 3 DAYS 3-4: ROOM LIMITS & MANAGEMENT UI

**Goal:** Room management and user limits
**Time:** 2-3 hours
**Status:** IN PROGRESS

---

## OBJECTIVES

### What We're Building:
1. **5-Room Limit** - Users can't exceed 5 active rooms
2. **List User Rooms** - Endpoint to get all user's rooms
3. **Close Room** - Host can close/delete a room
4. **Abandon Room** - Guests can leave a room
5. **Manage Rooms UI** - Component to view/manage all rooms

---

## BACKEND FEATURES

### 1. Room Limit Validation
**Where:** `POST /api/rooms` (existing endpoint)
**Logic:**
- Before creating room, count user's active rooms
- If >= 5, reject with error
- Include count in error message

### 2. GET /api/rooms/my-rooms
**Query Params:** `userId`
**Logic:**
- Get all rooms where user is host OR in room_seats
- Group by hosted vs joined
- Include room status, player count
- Return structured data

### 3. POST /api/rooms/:roomId/close
**Body:** `{ hostId }`
**Logic:**
- Verify requester is host
- Set room status to 'closed'
- Remove all players from room_seats
- Delete associated game (if exists)
- Broadcast `room_closed` event
- Return success

### 4. POST /api/rooms/:roomId/abandon
**Body:** `{ userId }`
**Logic:**
- Verify user is not host
- Remove user from room_seats
- If last player, mark room inactive
- Broadcast `player_left` event
- Return success

---

## FRONTEND FEATURES

### Manage Rooms Component
**Location:** `public/pages/play.html`

**UI Structure:**
```
[Manage Rooms Panel]
├── Hosted Rooms (0/5)
│   ├── Room 1 [Close]
│   ├── Room 2 [Close]
│   └── ...
├── Joined Rooms
│   ├── Room A [Leave]
│   ├── Room B [Leave]
│   └── ...
└── [Create New Room] (disabled if >= 5)
```

**Design:**
- Modal or collapsible section
- Shows room code, player count
- Quick action buttons
- Visual feedback for limits

---

## IMPLEMENTATION ORDER

**Phase 1: Backend Limits (15 min)**
1. Add room count check to POST /api/rooms
2. Test with multiple room creations

**Phase 2: Backend Endpoints (45 min)**
1. Create GET /api/rooms/my-rooms
2. Create POST /api/rooms/:roomId/close
3. Create POST /api/rooms/:roomId/abandon
4. Test all endpoints

**Phase 3: Frontend UI (60 min)**
1. Create Manage Rooms modal in play.html
2. Add CSS styling
3. Wire up API calls
4. Add socket event listeners

**Phase 4: Integration (30 min)**
1. Test room limit enforcement
2. Test close/abandon
3. Test UI updates
4. Test edge cases

---

## SUCCESS CRITERIA

- [ ] Users can't create > 5 rooms
- [ ] Users can list all their rooms
- [ ] Hosts can close their rooms
- [ ] Guests can abandon rooms
- [ ] UI shows all rooms with status
- [ ] Create button disabled at limit
- [ ] Socket events update UI
- [ ] No memory leaks or orphan rooms

---

## FILES TO MODIFY

**Backend:**
- `routes/rooms.js` - Add 3 endpoints + validation

**Frontend:**
- `public/pages/play.html` - Add Manage Rooms UI

---

## EXECUTING NOW

