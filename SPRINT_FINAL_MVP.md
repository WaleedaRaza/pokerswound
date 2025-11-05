# 🚀 FINAL MVP SPRINT - Complete Task List

**Date:** November 5, 2025  
**Goal:** Ship production-ready PokerGeek MVP  
**Status:** IN PROGRESS

---

## ✅ COMPLETED (Before This Sprint)
- [x] Action buttons redesign (outline style, smaller)
- [x] Raise modal with pot presets
- [x] Player settings expansion
- [x] Host control enhancements
- [x] Unified navbar across all pages
- [x] Username system with database validation
- [x] Profile modal with stats display
- [x] Friends database schema
- [x] Friends API (5 endpoints)
- [x] Basic friends UI
- [x] Notifications system (schema)
- [x] Username change functionality
- [x] Password reset functionality
- [x] Fixed database permissions (SERVICE_ROLE_KEY)
- [x] Avatar display in profile
- [x] Navbar auto-refresh after username change

---

## 🔴 CRITICAL PATH (Must Complete Before Launch)

### **PHASE 1: FOUNDATION & DATA ARCHITECTURE** (8-10 hours)

#### 1A. Auth Simplification (2 hours)
**Why:** Remove complexity, focus on Google + Guest only  
**Tasks:**
- [ ] Remove email/password signup route from `routes/auth.js`
- [ ] Remove email/password login route
- [ ] Remove username change limit (or set to 999)
- [ ] Update login modal UI (remove email/password option)
- [ ] Test: Google login works
- [ ] Test: Guest login works
- [ ] Test: Can change username unlimited times

**Files to modify:**
- `routes/auth.js` (delete endpoints)
- `public/index.html` or login modal (remove UI)
- `routes/social.js` line 166-172 (remove limit check)

---

#### 1B. Profile Stats Sync (4 hours)
**Why:** Profile shows 0 stats when `player_statistics` has real data  
**Tasks:**
- [ ] Create migration `03_sync_profile_stats.sql`
- [ ] Add trigger to auto-sync `player_statistics` → `user_profiles`
- [ ] Backfill existing user stats
- [ ] Test: Play a hand, check stats update
- [ ] Test: Profile modal shows correct stats
- [ ] Update `/api/social/profile/me` to read from correct tables

**SQL to write:**
```sql
CREATE TRIGGER update_profile_stats_trigger
AFTER INSERT OR UPDATE ON player_statistics
FOR EACH ROW EXECUTE FUNCTION sync_user_profile_stats();
```

**Files to create:**
- `migrations/03_sync_profile_stats.sql`

---

#### 1C. Room Limits & Privacy (2 hours)
**Why:** Prevent abuse, add basic privacy  
**Tasks:**
- [ ] Add schema: `rooms.is_private`, `rooms.room_code`
- [ ] Enforce max 5 active rooms per user
- [ ] Add "Private Room" toggle to create room UI
- [ ] Generate 6-char alphanumeric codes for private rooms
- [ ] Add "Join with Code" input to play page
- [ ] Test: Cannot create 6th room
- [ ] Test: Private rooms require code

**Files to modify:**
- `routes/rooms.js` (add room count check)
- `public/pages/play.html` (add private room UI)

---

### **PHASE 2: FRIENDS SYSTEM COMPLETION** (6-8 hours)

#### 2A. Friends UI Polish (3 hours)
**Why:** Basic UI exists but needs polish/testing  
**Current state:** 3 tabs exist (All Friends, Online, Requests) but may have bugs  
**Tasks:**
- [ ] Test all 3 tabs (All Friends, Online, Requests)
- [ ] Add "Recent Players" tab
- [ ] Add search functionality
- [ ] Fix any display bugs
- [ ] Add loading states to friend actions
- [ ] Add empty states ("No friends yet")
- [ ] Test friend request flow end-to-end
- [ ] Test accept/reject requests
- [ ] Test unfriend action

**Files to check/modify:**
- `public/pages/friends.html`
- `public/js/friends-page.js`
- `public/css/friends.css`

---

#### 2B. Friend Invites to Games (3 hours)
**Why:** Core social feature - invite friends to your poker room  
**Tasks:**
- [ ] Add "Invite Friends" button to room lobby
- [ ] Create invite modal with friend list
- [ ] Send invite notification to friend
- [ ] Friend receives notification with "Join Game" link
- [ ] Clicking link takes friend directly to room
- [ ] Test: Send invite → Friend receives → Friend joins
- [ ] Add API endpoint: `POST /api/rooms/:roomId/invite`
- [ ] Add notification type: `GAME_INVITE`

**New API endpoint:**
```javascript
POST /api/rooms/:roomId/invite
Body: { friendId: 'uuid' }
Response: { success: true, notificationId: 'uuid' }
```

**Files to create/modify:**
- `routes/rooms.js` (add invite endpoint)
- `public/minimal-table.html` (add invite button)
- Update notification handlers

---

#### 2C. Notifications System Polish (2 hours)
**Why:** Schema exists, need frontend integration  
**Tasks:**
- [ ] Add notification bell icon to navbar
- [ ] Show unread count badge
- [ ] Dropdown shows recent notifications
- [ ] Click notification → mark as read
- [ ] Click game invite → join game
- [ ] Add notification sound (optional)
- [ ] Test: Friend request notification
- [ ] Test: Game invite notification
- [ ] Test: Mark all as read

**Files to modify:**
- `public/js/navbar-template.js` (add bell icon)
- `public/css/pokergeek.css` (notification styles)
- Create `public/js/notifications.js`

---

### **PHASE 3: SERIALIZATION & DATA** (6 hours)

#### 3A. Hand Encoder Service (3 hours)
**Why:** Optimize storage, enable pattern queries  
**Tasks:**
- [ ] Create `services/hand-encoder.js`
- [ ] Implement `encode(gameState)` → PHE string
- [ ] Implement `decode(phe)` → reconstructed state
- [ ] Write unit tests (10+ test cases)
- [ ] Test edge cases (all-in, everyone folds, etc.)
- [ ] Validate losslessness (encode → decode = original)

**Test cases:**
1. Preflop all-in
2. Everyone folds preflop
3. Multi-way pot with side pots
4. Heads-up hand to showdown
5. 6-player hand with multiple streets

---

#### 3B. Schema Migration for PHE (1 hour)
**Why:** Add encoding columns without breaking anything  
**Tasks:**
- [ ] Create `04_add_phe_encoding.sql`
- [ ] Add `hand_history.phe_encoding` TEXT column
- [ ] Add `player_hand_history.phe_encoding` TEXT column
- [ ] Create indexes for pattern queries
- [ ] Create `hand_cache` table (decoded cache)
- [ ] Run migration in Supabase
- [ ] Verify no data loss

---

#### 3C. Integrate Encoder (2 hours)
**Why:** Start writing PHE alongside existing data  
**Tasks:**
- [ ] Update `fullGameRepository.completeHand()`
- [ ] Call `HandEncoder.encode()` after hand completes
- [ ] Write PHE to `hand_history.phe_encoding`
- [ ] Add validation (decode and compare)
- [ ] Log any encoding mismatches
- [ ] Test: Play 10 hands, check all have PHE
- [ ] Test: No encoding errors in logs

**Files to modify:**
- `src/services/database/repos/full-game.repo.ts`

---

### **PHASE 4: UI/UX POLISH** (8-10 hours)

#### 4A. Error Handling (2 hours)
**Why:** No cryptic errors, graceful failures  
**Tasks:**
- [ ] Wrap all API calls in try/catch
- [ ] Show user-friendly error messages
- [ ] Add backend validation (required fields, valid amounts)
- [ ] Test: Invalid action shows helpful error
- [ ] Test: Network failure shows "Connection lost"
- [ ] Test: No generic "500" errors visible to user

**Files to audit:**
- All API fetch calls in `public/pages/play.html`
- All API fetch calls in `public/js/*.js`

---

#### 4B. Loading States (2 hours)
**Why:** Show user something is happening  
**Tasks:**
- [ ] Add loading spinners to all action buttons
- [ ] Disable buttons during operations
- [ ] Add loading to: Fold, Check, Call, Raise, All-in
- [ ] Add loading to: Start Game, Deal Cards
- [ ] Add loading to: Friend Request, Accept/Reject
- [ ] Add loading to: Username Change, Profile Save
- [ ] Test: Can't double-click actions
- [ ] Test: Loading clears after response

**CSS to add:**
```css
.btn-loading { cursor: wait; opacity: 0.7; }
.btn-loading::after { /* spinner animation */ }
```

---

#### 4C. Empty States (2 hours)
**Why:** No blank white screens  
**Tasks:**
- [ ] Friends page: "No friends yet" with search button
- [ ] Lobby: "No rooms" with create button
- [ ] Notifications: "No notifications" message
- [ ] Profile: "No hands played yet" message
- [ ] Game history: "No games played" message
- [ ] Test all empty states render correctly

---

#### 4D. UI Consistency Audit (4 hours)
**Why:** MVP needs cohesive look  
**Tasks:**
- [ ] Audit all buttons (consistent sizing, colors)
- [ ] Audit all modals (consistent styling)
- [ ] Audit all forms (consistent input styles)
- [ ] Audit all cards/panels (consistent borders/shadows)
- [ ] Fix any styling inconsistencies
- [ ] Check dark mode consistency
- [ ] Mobile viewport test (basic responsive check)
- [ ] Create style guide document

**Pages to audit:**
1. `index.html` (home page)
2. `pages/play.html` (play page)
3. `pages/friends.html` (friends page)
4. `minimal-table.html` (poker table)
5. All modals (username, profile, settings)

---

### **PHASE 5: MOBILE & TESTING** (6-8 hours)

#### 5A. Mobile Responsiveness - Critical Pages (4 hours)
**Why:** 40%+ users will be on mobile  
**Priority pages:**
1. Home page (`index.html`)
2. Play page lobby (`pages/play.html`)
3. Friends page (`pages/friends.html`)
4. Poker table (basic playability on mobile)

**Tasks:**
- [ ] Add/verify viewport meta tag
- [ ] Make navbar mobile-friendly (hamburger menu?)
- [ ] Stack elements vertically on small screens
- [ ] Increase touch target sizes (min 44x44px)
- [ ] Test on iPhone simulator
- [ ] Test on Android simulator
- [ ] Test on real device if possible

**Note:** Full mobile poker table can be v2 - just need basic functionality

---

#### 5B. Host Controls End-to-End Testing (2 hours)
**Why:** These features exist but need validation  
**Test cases:**
1. [ ] Lock room → New players can't join
2. [ ] Kick player → Player removed, seat freed
3. [ ] Pause game → Actions disabled, timer stops
4. [ ] Force next hand → Current hand ends immediately
5. [ ] Reset stacks → All players back to starting chips
6. [ ] Action timer → Player auto-folds when time expires
7. [ ] End game → Game closes, players return to lobby

---

#### 5C. Critical User Flows (2 hours)
**Why:** Ensure core experience works  
**Test flows:**
1. [ ] Sign up with Google → Set username → Create room → Invite friend → Play hand
2. [ ] Guest login → Join room → Play hand → Register with Google → Keep stats
3. [ ] Create private room → Share code → Friend joins → Play game
4. [ ] Send friend request → Accept → Invite to game → Play together
5. [ ] View profile → Change username → See updated stats
6. [ ] Play 5 hands → Check profile shows correct hands played
7. [ ] Get disconnected → Refresh page → Rejoin game seamlessly

---

### **PHASE 6: LAUNCH PREP** (4 hours)

#### 6A. Debug Cleanup (1 hour)
**Tasks:**
- [ ] Remove or gate console.logs
- [ ] Add `window.DEBUG` flag
- [ ] Only log in dev (localhost)
- [ ] Remove commented-out code
- [ ] Remove unused imports

---

#### 6B. Documentation (2 hours)
**Tasks:**
- [ ] Create `README.md` with:
  - Setup instructions
  - Environment variables needed
  - How to run locally
  - How to deploy
- [ ] Create `DEPLOYMENT.md` with:
  - Supabase setup
  - Environment variables
  - Migration order
  - Post-deploy checklist
- [ ] Update `package.json` scripts

---

#### 6C. Pre-Launch Checklist (1 hour)
**Tasks:**
- [ ] All migrations run successfully
- [ ] All environment variables set
- [ ] Database permissions verified
- [ ] SSL/HTTPS enabled
- [ ] Error logging configured
- [ ] Analytics setup (optional)
- [ ] Social share image/metadata
- [ ] Final smoke test on production URL

---

## 📊 EFFORT BREAKDOWN

| Phase | Time Estimate | Dependencies |
|-------|---------------|--------------|
| Phase 1: Foundation | 8-10h | None (start here) |
| Phase 2: Friends | 6-8h | After Phase 1 |
| Phase 3: Serialization | 6h | Can parallel with 1-2 |
| Phase 4: UI Polish | 8-10h | Can parallel with 1-3 |
| Phase 5: Testing | 6-8h | After Phase 1-4 |
| Phase 6: Launch Prep | 4h | After everything |
| **TOTAL** | **38-44 hours** | |

---

## 🎯 TODAY'S EXECUTION PLAN (Aggressive - 12-14 hours)

### **Morning (4 hours):**
- Phase 1A: Auth Simplification (2h)
- Phase 1B: Profile Stats Sync (2h)

### **Midday (4 hours):**
- Phase 1C: Room Limits (1h)
- Phase 2A: Friends UI Polish (3h)

### **Afternoon (4 hours):**
- Phase 4A: Error Handling (2h)
- Phase 4B: Loading States (2h)

### **Evening (4 hours):**
- Phase 4C: Empty States (2h)
- Phase 4D: UI Audit (2h)

**Tomorrow if needed:**
- Phase 2B: Friend Invites (3h)
- Phase 3: Serialization (6h)
- Phase 5: Testing (6h)
- Phase 6: Launch Prep (4h)

---

## 🚨 CRITICAL NOTES

1. **Don't skip error handling** - production must be stable
2. **Test each phase** before moving to next
3. **Commit frequently** with clear messages
4. **Document as you go** - future you will thank you
5. **Mobile is MVP** - doesn't need to be perfect but must work
6. **Friends system is MVP** - core social feature
7. **Serialization can be v1.1** if time runs out - not blocking

---

## ✅ SUCCESS CRITERIA (MVP Launch Ready)

- [ ] User can sign up with Google or play as guest
- [ ] User can create/join rooms (public and private)
- [ ] User can play poker hands without bugs
- [ ] User can add friends and invite them to games
- [ ] User can view their profile with accurate stats
- [ ] User can change username and password
- [ ] All pages work on mobile (basic functionality)
- [ ] No critical errors or crashes
- [ ] All loading states and error messages work
- [ ] Empty states show helpful messages
- [ ] UI is consistent across all pages

**If all above pass → SHIP IT! 🚀**

