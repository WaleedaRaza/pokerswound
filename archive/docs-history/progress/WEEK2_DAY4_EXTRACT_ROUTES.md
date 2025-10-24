# ⚔️ WEEK 2 DAY 4 - EXTRACT REST ROUTES

**Date:** October 24, 2025  
**Status:** 🔥 **EXECUTING NOW**  
**Goal:** Move all REST endpoints from monolith to clean controllers

---

## 🎯 **OBJECTIVE**

**Before:**
```javascript
// sophisticated-engine-server.js (2,746 lines)
app.post('/api/rooms', async (req, res) => { /* 50 lines inline */ });
app.get('/api/rooms/:id', async (req, res) => { /* 30 lines inline */ });
// ... 15 more endpoints inline
```

**After:**
```typescript
// sophisticated-engine-server.js (~500 lines - wiring only)
app.use('/api/rooms', roomsRouter);
app.use('/api/games', gamesRouter);
app.use('/api/auth', authRouter);

// routes/rooms.controller.ts
export const roomsRouter = Router();
roomsRouter.post('/', createRoom);
roomsRouter.get('/:id', getRoom);
// ... clean separation
```

---

## 📋 **ENDPOINTS TO EXTRACT**

### **Rooms Endpoints (9 routes)**
```
POST   /api/rooms                    → createRoom
GET    /api/rooms/:id                → getRoom
GET    /api/rooms                    → listRooms
POST   /api/rooms/:id/lobby/join     → joinLobby
POST   /api/rooms/:id/lobby/approve  → approveLobby
POST   /api/rooms/:id/lobby/reject   → rejectLobby
POST   /api/rooms/:id/join           → claimSeat
POST   /api/rooms/:id/leave          → leaveSeat
GET    /api/rooms/:id/seats          → getSeats
GET    /api/rooms/:id/game           → getActiveGame
```

### **Games Endpoints (6 routes)**
```
POST   /api/games                    → createGame
GET    /api/games/:id                → getGame
POST   /api/games/:id/join           → joinGame
POST   /api/games/:id/start-hand     → startHand
POST   /api/games/:id/actions        → playerAction
GET    /api/games/:id/state          → getGameState
```

### **Auth Endpoints (3 routes)**
```
POST   /api/auth/sync-user           → syncUser
POST   /api/auth/register            → register
POST   /api/auth/login               → login
```

---

## 🗡️ **EXECUTION PLAN**

### **Step 1: Create Directory Structure**
```bash
mkdir -p routes
mkdir -p routes/controllers
```

### **Step 2: Create Rooms Controller**
```typescript
// routes/rooms.controller.ts
import { Router, Request, Response } from 'express';

export const roomsRouter = Router();

// POST /api/rooms - Create room
roomsRouter.post('/', async (req: Request, res: Response) => {
  // Move existing logic here
});

// GET /api/rooms/:id - Get room
roomsRouter.get('/:id', async (req: Request, res: Response) => {
  // Move existing logic here
});

// ... all other room routes
```

### **Step 3: Create Games Controller**
```typescript
// routes/games.controller.ts
import { Router, Request, Response } from 'express';

export const gamesRouter = Router();

// Move all game endpoints here
```

### **Step 4: Create Auth Controller**
```typescript
// routes/auth.controller.ts
import { Router, Request, Response } from 'express';

export const authRouter = Router();

// Move all auth endpoints here
```

### **Step 5: Update Main Server**
```typescript
// sophisticated-engine-server.js
import { roomsRouter } from './routes/rooms.controller';
import { gamesRouter } from './routes/games.controller';
import { authRouter } from './routes/auth.controller';

app.use('/api/rooms', roomsRouter);
app.use('/api/games', gamesRouter);
app.use('/api/auth', authRouter);

// Delete all inline endpoint definitions
```

---

## ✅ **SUCCESS CRITERIA**

**Code Metrics:**
- ✅ `sophisticated-engine-server.js` reduced from 2,746 lines to ~500 lines
- ✅ 18 endpoints extracted to 3 controllers
- ✅ Clean separation of concerns

**Functionality:**
- ✅ All endpoints still work
- ✅ No broken features
- ✅ Same API responses

**Architecture:**
- ✅ Easy to find endpoint logic (organized by domain)
- ✅ Easy to add new endpoints (just add to controller)
- ✅ Easy to test (controllers can be unit tested)

---

## 🧪 **TESTING PROTOCOL**

### **Test 1: Room Creation**
```bash
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"small_blind":5,"big_blind":10,"max_players":9}'
  
→ Should: Create room, return room data
```

### **Test 2: Join Lobby**
```bash
curl -X POST http://localhost:3000/api/rooms/<roomId>/lobby/join \
  -H "Content-Type: application/json" \
  -d '{"user_id":"...","username":"..."}'
  
→ Should: Join lobby, return success
```

### **Test 3: Full Game Flow**
```
1. Create room
2. Join lobby
3. Approve player
4. Claim seats
5. Start game
6. Take action

→ All should work exactly as before
```

---

## ⏱️ **TIME ESTIMATE**

**Total:** 6-8 hours

**Breakdown:**
- Create directory structure: 5 min
- Extract rooms endpoints: 2 hours
- Extract games endpoints: 2 hours
- Extract auth endpoints: 1 hour
- Update main server file: 1 hour
- Testing & debugging: 2 hours

---

## 🎯 **CURRENT STATUS**

```
✅ Planning complete
⏳ Execution starting now
🔨 Creating directory structure
🔨 Extracting rooms endpoints
🔨 Extracting games endpoints
🔨 Extracting auth endpoints
🔨 Wiring up main server
🔨 Testing all endpoints
```

---

## ⚔️ **LET'S EXECUTE!**

**MY SOLDIERS PUSH FORWARD!** 🗡️

