# 🎯 TEST THE MINIMAL TABLE NOW

**Status:** ✅ Server running on http://localhost:3001

## What We Built (Ready to Test)

✅ `public/minimal-table.html` - 300 lines, clean, no bloat
✅ `POST /api/rooms/:roomId/claim-seat` - Simple seat claiming
✅ Simplified WebSocket auth - No SessionService dependency
✅ TypeScript compiled successfully

---

## 🚀 TESTING PROCEDURE

### Option A: Use Existing Lobby (Recommended)

1. **Open the lobby:**
   ```
   http://localhost:3001/play
   ```

2. **Sign in** (or continue as guest)

3. **Create a room:**
   - Click "Create Room"
   - Set blinds (5/10)
   - Click "Create"
   - **Copy the room ID from the URL** (it'll look like: `?room=abc123...`)

4. **Open the minimal table:**
   ```
   http://localhost:3001/public/minimal-table.html?room=<PASTE_ROOM_ID_HERE>
   ```

5. **Expected:**
   - ✅ Room code displays
   - ✅ Socket connects (🟢 Connected)
   - ✅ 9 seats show as EMPTY
   - ✅ Each empty seat says "🪑 EMPTY / Click to claim"

6. **Click any seat** (e.g., Seat 0)
   - ✅ Alert: "Seat 0 claimed!"
   - ✅ Seat shows your username and $1,000
   - ✅ Seat border turns orange (YOU)

7. **Click "START HAND"** (appears after 2+ players seated)
   - ✅ Alert: "Hand started!"
   - ✅ "Your Hole Cards" section appears
   - ✅ 2 cards render

---

### Option B: Direct Room Access (If Auth Disabled)

**NOTE:** Currently auth is enabled, so use Option A.

---

## 🔍 What to Check

### Debug Console (Bottom of page)
- Look for these messages:
  ```
  [TIME] 🎬 Initializing minimal table...
  [TIME] ✅ Initialized { roomId: "...", userId: "..." }
  [TIME] 🔌 Connecting WebSocket...
  [TIME] ✅ Socket connected { socketId: "..." }
  [TIME] 🌊 Fetching room state...
  [TIME] ✅ Hydration received { ... }
  [TIME] 🎨 Rendering seats... { seatCount: 9 }
  [TIME] ✅ Seats rendered
  ```

### Browser Console (F12)
- Should see similar logs
- NO errors about SessionService
- NO 404s or failed requests

---

## 🎮 Multi-Player Test

1. Open minimal table in Browser 1
2. Open **same URL** in Incognito/Browser 2
3. Claim different seats in each browser
4. **Expected:** Both browsers see both seats update in real-time

---

## ✅ Success Criteria

| Test | Status |
|------|--------|
| Table loads without errors | ⏳ |
| Seats render (9 empty slots) | ⏳ |
| Can claim a seat | ⏳ |
| Seat shows username & chips | ⏳ |
| Real-time updates work | ⏳ |
| START HAND creates game | ⏳ |
| Cards render | ⏳ |

---

## 🐛 If Something Breaks

**Check server logs:**
```bash
tail -f /tmp/poker_server.log
```

**Common issues:**
1. **"No user ID found"** → Need to sign in via /play first
2. **Seats don't render** → Check browser console for hydration errors
3. **START HAND does nothing** → Need 2+ players seated

---

## 📊 Current Architecture

```
┌─────────────────┐
│ minimal-table   │ ← NEW (clean, simple, 300 lines)
│     .html       │
└────────┬────────┘
         │
         ├─→ WebSocket (simplified auth) ✅
         │
         ├─→ GET /api/rooms/:roomId/hydrate ✅
         │   (returns: room, seats, game, hand, my cards)
         │
         ├─→ POST /api/rooms/:roomId/claim-seat ✅
         │   (claims seat, broadcasts update)
         │
         └─→ POST /api/games/:gameId/start-hand ✅
             (deals cards, updates game state)
```

---

## 🎯 What This Proves

If all tests pass, we've proven:
1. **UI → Backend routing works**
2. **DB persistence works**
3. **WebSocket broadcasts work**
4. **Hydration (refresh recovery) works**
5. **Game engine integration works**

This is the **foundation** for scaling up to full features.

---

**Ready? Go test!** 🚀

