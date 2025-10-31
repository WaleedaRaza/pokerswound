# Minimal Table Test Plan

**Goal:** Prove end-to-end flow from lobby → table → cards.

## What We Built

1. **`minimal-table.html`** (300 lines)
   - Clean, simple UI
   - No dependencies on SessionService
   - Direct API calls
   - Real-time WebSocket updates

2. **`POST /api/rooms/:roomId/claim-seat`**
   - Simple seat claiming
   - Validates seat availability
   - Broadcasts to room

3. **Simplified WebSocket Auth**
   - No SessionService dependency
   - Direct join to room

4. **Existing Hydration Endpoint**
   - Already returns seat array
   - Already extracts hole cards
   - Already handles game state

## Test Flow

### Step 1: Create a Room
```bash
curl -X POST http://localhost:3001/api/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Room",
    "small_blind": 5,
    "big_blind": 10,
    "min_buy_in": 100,
    "max_buy_in": 1000,
    "max_players": 9,
    "is_private": false,
    "user_id": "test-user-1"
  }'
```

Expected: `{"roomId": "...", "inviteCode": "..."}`

### Step 2: Open Minimal Table
```
http://localhost:3001/minimal-table.html?room=<ROOM_ID>
```

**Expected Result:**
- ✅ Room info shows (room code, IDs)
- ✅ Socket connects (🟢 Connected)
- ✅ 9 seats render as EMPTY with "Click to claim"
- ✅ Debug log shows: "Initialized", "Socket connected", "Hydration received"

### Step 3: Claim a Seat
- Click on "Seat 0" (or any empty seat)

**Expected Result:**
- ✅ Alert: "Seat 0 claimed!"
- ✅ Seat 0 changes to show your username and $1,000
- ✅ Seat border turns orange (YOU)
- ✅ Debug log shows: "Claim seat request", "Seat claimed successfully"
- ✅ Socket broadcast received (if multiple users)

### Step 4: Claim Another Seat (Open in Incognito)
- Open same URL in incognito/another browser
- Click "Seat 1"

**Expected Result:**
- ✅ Both browsers see both seats filled
- ✅ Real-time updates work

### Step 5: Start Hand
- As host (first user), click "START HAND" button

**Expected Result:**
- ✅ Alert: "Hand started! Cards being dealt..."
- ✅ "Your Hole Cards" section appears
- ✅ 2 card images render
- ✅ Debug log shows: "Starting hand...", "Game created", "Hand started"

## Success Criteria

✅ **All 7 tests pass**
✅ **No console errors**
✅ **Cards render correctly**
✅ **Real-time updates work**

---

## Quick Start Command

```bash
# 1. Create room and save roomId
ROOM_ID=$(curl -s -X POST http://localhost:3001/api/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Minimal Test",
    "small_blind": 5,
    "big_blind": 10,
    "min_buy_in": 100,
    "max_buy_in": 1000,
    "max_players": 9,
    "is_private": false,
    "user_id": "test-user-1"
  }' | grep -o '"roomId":"[^"]*"' | cut -d'"' -f4)

echo "Room created: $ROOM_ID"
echo "Open: http://localhost:3001/minimal-table.html?room=$ROOM_ID"
```

