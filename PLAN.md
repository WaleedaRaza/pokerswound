# POKEHER - SPRINT TO SHAREABLE GAME

**Mode**: PLANNER  
**Goal**: Friends can join via link, pick seats, play poker with persistent profiles  
**Timeline**: 3-5 days focused sprint

---

## ✅ WHAT YOU ACTUALLY HAVE (Corrected Assessment)

### Backend is SOLID ✨
- ✅ **Complete auth system**: Register, login, JWT, sessions, password hashing
- ✅ **Game API controllers**: Create, join, start-hand, actions, get-state - ALL IMPLEMENTED
- ✅ **GameService**: ~475 lines orchestrating engine + database
- ✅ **Core engine**: State machine, hand evaluator, betting, pot management
- ✅ **Database schema**: Users, rooms, room_seats, chips_transactions, rejoin tokens
- ✅ **WebSocket integration**: Controllers broadcast events via Socket.io
- ✅ **Supabase repos**: All CRUD operations implemented

### Frontend is THERE 🎨
- ✅ **Beautiful poker UI**: `archive/ui/poker-test.html` (~1300 lines)
  - Massive poker table with 9 seats
  - Card displays with PNG assets
  - Player positions, chips, actions
  - Community cards, pot display
  - WebSocket client integration
  - Modern gradient design
- ✅ **Test client**: `poker-engine/test-client.html` (simpler version)

### What's Missing for YOUR Goal 🎯
- ❌ **Room invite system not wired up** (schema exists, no API endpoints)
- ❌ **UI not connected to auth system** (using test player IDs)
- ❌ **No shareable link generation**
- ❌ **Supabase database is empty** (migrations not run)
- ❌ **No profile page/persistence UI**
- ❌ **UI and backend are separate files, not integrated**

---

## 🎯 SPRINT GOAL BREAKDOWN

### Target User Experience:
1. You visit `https://your-app.com`
2. Sign up / log in (Google OAuth optional)
3. Click "Create Room"
4. Share link: `https://your-app.com/room/abc123xyz`
5. Friends click link → see poker table with 9 seats
6. Friends pick open seat → game starts when 2+ seated
7. Play poker → profile stats persist (hands played, chips won/lost)

---

## 📋 SPRINT TASKS

### **TASK 1: Fresh Supabase Setup** ⚡
**Time**: 1-2 hours  
**Goal**: Clean database with all tables ready

**Steps:**
- [ ] Create new Supabase project (or reset existing)
- [ ] Run `001_initial_schema.sql` migration
- [ ] Verify tables exist: users, rooms, room_seats, games, players, hands, actions
- [ ] Test connection from poker-engine with new credentials
- [ ] Update `.env` with fresh Supabase URL + keys
- [ ] Remove `test.env`, commit `.env.example` only

**Success Criteria:**
- Can create user via auth API
- Can query `users` table in Supabase dashboard
- Backend connects without errors

---

### **TASK 2: Room & Invite API Endpoints** 🚪
**Time**: 3-4 hours  
**Goal**: API for creating/joining rooms with invite codes

**Create New Files:**
```typescript
// poker-engine/src/api/controllers/rooms.controller.ts
- POST /api/rooms/create → creates room, returns invite code
- GET /api/rooms/:inviteCode → get room details by invite
- POST /api/rooms/:roomId/join → join room, pick seat
- GET /api/rooms/:roomId/seats → get available seats
- POST /api/rooms/:roomId/leave → leave room
```

**Update:**
```typescript
// poker-engine/src/api/routes/rooms.routes.ts (new file)
// poker-engine/src/app.ts → register rooms routes
```

**Database Logic:**
- Generate random 6-char invite code (e.g., `XYZ789`)
- Store in `rooms.invite_code`
- Insert seat assignment into `room_seats` table
- Validate seat availability

**Success Criteria:**
- Can create room via API, get invite code back
- Can fetch room by invite code
- Can join room and claim seat
- Room state persists in Supabase

---

### **TASK 3: Integrate Auth into UI** 🔐
**Time**: 4-5 hours  
**Goal**: Replace test dropdown with real login

**Convert HTML to React Components OR:**
**Option A**: Keep HTML, add auth via vanilla JS
**Option B**: Migrate to Next.js (poker-frontend)

**Recommended**: **Option A for speed** (convert to React later)

**Create:**
```html
<!-- poker-engine/public/index.html -->
- Login/Register modal
- User profile display (top-right corner)
- JWT stored in localStorage
- All API calls include Authorization header
```

**Update `poker-test.html`:**
- Remove test player dropdown
- Add login modal on page load if not authenticated
- Fetch user profile from `/api/auth/me`
- Display username, avatar, chip balance

**Success Criteria:**
- Can register/login from UI
- Token stored in browser
- UI shows logged-in user's name
- Cannot join game unless authenticated

---

### **TASK 4: Shareable Link Flow** 🔗
**Time**: 2-3 hours  
**Goal**: Create → Copy Link → Friends Join

**UI Changes:**
```html
1. Landing Page (/) → "Create Game" button
2. After create → Modal with shareable link
3. Copy to clipboard button
4. Navigate to game room automatically
```

**Create New Page:**
```html
<!-- poker-engine/public/room.html -->
URL: /room?code=XYZ789
- Fetch room details via API
- Show poker table with 9 seats
- Highlight available seats
- Click seat → claim it via API
- If 2+ players seated → "Start Game" button appears
```

**Backend:**
```typescript
// Update WebSocket server to handle room namespaces
io.of('/room/:code').on('connection', ...)
```

**Success Criteria:**
- Create room → get invite code
- Share link with code
- Friends open link → see room
- Friends pick seats → all see updates in real-time

---

### **TASK 5: Profile Persistence** 💾
**Time**: 2-3 hours  
**Goal**: Track stats across games

**Database Updates:**
Already in schema! Just need to update:
```sql
-- users table has:
- total_chips
- games_played (add via migration)
- hands_won (add via migration)
- total_winnings (add via migration)
```

**Backend Logic:**
```typescript
// After hand completes in GameService:
1. Update winner's total_chips
2. Increment hands_won
3. Add to total_winnings
4. Persist to users table
```

**UI Display:**
```html
<!-- Profile dropdown/modal -->
- Username, avatar
- Total chips: 15,240
- Games played: 42
- Hands won: 18
- Win rate: 42.9%
- Biggest pot: 3,500
```

**Success Criteria:**
- After playing hand, chips update in database
- Refresh page → stats persist
- Profile shows accurate totals

---

### **TASK 6: Connect UI to Real Game Flow** 🎮
**Time**: 4-5 hours  
**Goal**: End-to-end gameplay with auth

**Wire Up:**
1. **Room page** → calls `/api/games/create` (links room → game)
2. **Join seat** → calls `/api/games/:id/join` with userId
3. **Start game** → calls `/api/games/:id/start-hand`
4. **Player actions** → calls `/api/games/:id/actions` with JWT
5. **WebSocket events** → real-time updates to all players

**Update `poker-test.html` WebSocket handlers:**
```javascript
socket.on('HAND_STARTED', (data) => {
  // Update UI with new hand
  // Show hole cards to current player only
});

socket.on('PLAYER_ACTION', (data) => {
  // Update UI with action
  // Advance to next player
});

socket.on('HAND_COMPLETE', (data) => {
  // Show winners
  // Update chip counts
  // Button to start next hand
});
```

**Success Criteria:**
- Complete hand: join → deal → bet → showdown → winners
- All players see real-time updates
- Chips update correctly
- Can play multiple hands

---

### **TASK 7: Deployment** 🚀
**Time**: 2-3 hours  
**Goal**: Live URL friends can access

**Options:**
1. **Render** (backend) + **Vercel/Netlify** (static HTML)
2. **Railway** (full-stack)
3. **Fly.io** (backend) + **GitHub Pages** (frontend)

**Recommended: Render (easiest)**

**Steps:**
- [ ] Push to GitHub (create `.env.example`, never commit `.env`)
- [ ] Create Render web service
- [ ] Set environment variables in Render dashboard
- [ ] Deploy backend → get live URL
- [ ] Update CORS to allow frontend domain
- [ ] Deploy static HTML to Vercel/Netlify
- [ ] Test end-to-end

**Success Criteria:**
- Backend responds at `https://your-api.onrender.com/health`
- Frontend loads at `https://your-app.vercel.app`
- Can create room, share link, friends join, play game

---

## 🗓️ ESTIMATED TIMELINE

**Day 1** (6-8 hours):
- Task 1: Supabase setup
- Task 2: Room API endpoints
- Task 3: Auth integration (start)

**Day 2** (6-8 hours):
- Task 3: Auth integration (finish)
- Task 4: Shareable link flow

**Day 3** (6-8 hours):
- Task 5: Profile persistence
- Task 6: Connect UI to game flow

**Day 4** (4-6 hours):
- Task 6: Testing & bug fixes
- Task 7: Deployment

**Day 5** (Buffer):
- Polish, testing with friends, bug fixes

**Total**: 22-30 hours = 3-5 focused days

---

## 🔥 QUICK WINS FOR MOMENTUM

**Can Do in 1 Hour:**
1. Run Supabase migration → see tables
2. Test auth endpoints → create user successfully
3. Copy poker UI to `/public` folder → serve from Express

**Can Do in 2 Hours:**
4. Create room API endpoint → generate invite codes
5. Add login modal to poker UI

**Can Do in 3 Hours:**
6. Wire up seat selection → persist to database
7. Connect WebSocket → see real-time updates

---

## 🚨 CRITICAL PATH (Must Do In Order)

```
Task 1 (Supabase) → Task 2 (Room API) → Task 3 (Auth UI) → Task 4 (Links) → Task 6 (Game Flow)
                                                                ↓
                                                        Task 5 (Profiles)
                                                                ↓
                                                        Task 7 (Deploy)
```

**Can Parallelize:**
- Task 5 (Profiles) can happen anytime after Task 1

---

## 📦 FILE STRUCTURE (After Sprint)

```
poker-engine/
├── src/
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── games.controller.ts ✅ (exists)
│   │   │   ├── rooms.controller.ts ❌ (create)
│   │   │   └── users.controller.ts ❌ (create)
│   │   └── routes/
│   │       ├── games.routes.ts ✅
│   │       ├── rooms.routes.ts ❌ (create)
│   │       └── auth.routes.ts ✅
│   ├── services/
│   │   ├── auth/ ✅
│   │   ├── game-service.ts ✅
│   │   └── room-service.ts ❌ (create)
│   └── ...
├── public/
│   ├── index.html ❌ (landing page)
│   ├── room.html ❌ (game room page - copy from poker-test.html)
│   ├── assets/
│   │   └── cards/ ✅ (54 PNG files exist in archive)
│   └── js/
│       ├── auth.js ❌ (login/register logic)
│       ├── room.js ❌ (room/game logic)
│       └── websocket.js ❌ (WebSocket client)
├── .env (create from test.env)
├── package.json ✅
└── ...
```

---

## 💡 DESIGN DECISIONS

### 1. Keep HTML or Migrate to React?
**Recommendation**: **Keep HTML for MVP**, migrate to Next.js later

**Why:**
- You have beautiful working HTML
- React migration = 2-3 extra days
- Can always wrap in React components later
- HTML + vanilla JS = fastest path to shareable game

### 2. Room vs Game Separation
**Current Schema**: `rooms` (persistent) ↔ `games` (per-hand)

**Flow:**
1. Create **room** → persistent, has invite code
2. Players join room → claim seats
3. Room spawns **game** → temporary, one hand
4. Game ends → room persists, can start new game

### 3. Authentication Strategy
**Recommendation**: Use existing JWT system (don't add OAuth yet)

**Why:**
- JWT system is complete and working
- Google OAuth = 1 extra day
- Can add later without breaking anything

### 4. Deployment Strategy
**Recommendation**: Render (backend) + Netlify (frontend)

**Why:**
- Free tier handles 10-20 concurrent users
- Easy setup, no Docker needed
- Auto-deploy from GitHub
- Can scale later

---

## ⚠️ RISKS & MITIGATIONS

### Risk 1: WebSocket connections across different domains
**Mitigation**: Set proper CORS, test early with deployed URLs

### Risk 2: State synchronization (what if player disconnects?)
**Mitigation**: Use existing `rejoin_tokens` table, handle reconnect in WebSocket

### Risk 3: Multiple games running simultaneously
**Mitigation**: Room isolation via Socket.io namespaces (`/room/:code`)

### Risk 4: Cheating (players seeing each other's cards)
**Mitigation**: Server-side validation, never send opponent hole cards to client

---

## ✅ DEFINITION OF DONE

**Sprint is complete when:**
- [ ] You can send a friend a link: `https://your-app.com/room?code=ABC123`
- [ ] Friend opens link, sees poker table with 9 seats
- [ ] Friend picks seat #3, you see them appear in real-time
- [ ] You click "Start Game", cards are dealt
- [ ] You play a full hand: bet, fold, call, raise
- [ ] Winner determined, chips update
- [ ] Refresh page → still logged in, chips persisted
- [ ] Profile shows: hands played, chips won/lost
- [ ] Can play another hand without refreshing

---

## 🎯 EXECUTOR MODE READY

**Recommended Starting Point**: Task 1 (Supabase Setup)

This is the cleanest, most logical path to your goal. No detours, no over-engineering. Just:
1. Clean database
2. Room system
3. Auth + UI
4. Deploy
5. Play with friends

**Say "EXECUTOR" and I'll start with Task 1.**

Or if you want to adjust the plan, tell me what to change.

---

## 🔧 RECENT FIXES

### Race Condition Fix: Premature Winner Stack Update (Oct 12, 2025)

**Problem:** Winner's stack was updating to final amount prematurely during all-in animations, flickering from $0 → $1000 → $0 → $1000.

**Root Cause:** Animation context was being stored AFTER the `pot_update` WebSocket broadcast, creating a race condition where the frontend's HTTP `fetchGameState()` call would get the post-distribution state before the animation context existed.

**Solution:** Moved `gameAnimations.set()` to execute BEFORE any WebSocket events are emitted. This ensures HTTP GET requests return the display snapshot (stack = 0) during animations, and only return the logical state (stack = 1000) after animation completes.

**Files Modified:**
- `poker-engine/sophisticated-engine-server.js` - Reordered animation context storage
- `poker-engine/RACE_CONDITION_FIX.md` - Comprehensive documentation

**Commit:** `f4aaa63`

**Status:** ✅ Fixed - Animation context now stored before broadcasting, preventing race condition