# ⚔️ ROUTER WIRING PLAN

**Status:** In Progress  
**Goal:** Connect all 3 routers to main server

---

## 📋 ROUTERS TO WIRE

1. **Rooms Router** (`routes/rooms.js`)
   - 11 endpoints
   - Mount at: `/api/rooms`
   - Needs: getDb, createRoom, getRoomByInvite, claimSeat, releaseSeat, authenticateToken

2. **Games Router** (`routes/games.js`)
   - 7 endpoints
   - Mount at: `/api/games`
   - Needs: All game engine dependencies (massive list)

3. **Auth Router** (`routes/auth.js`)
   - 3 endpoints
   - Mount at: `/api/auth`
   - Needs: getDb, bcrypt, jwt, JWT_SECRET

---

## 🎯 WIRING STEPS

### 1. **Import Routers** in `sophisticated-engine-server.js`
```javascript
const roomsRouter = require('./routes/rooms');
const gamesRouter = require('./routes/games');
const authRouter = require('./routes/auth');
```

### 2. **Setup app.locals** with ALL dependencies

### 3. **Mount Routers**
```javascript
app.use('/api/rooms', roomsRouter);
app.use('/api/games', gamesRouter);
app.use('/api/auth', authRouter);
```

### 4. **Apply Middleware** (validateGameAction for actions endpoint)

### 5. **Comment Out Old Code** (don't delete yet for safety)

---

## ⚔️ EXECUTING NOW!

