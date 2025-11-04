# 🚀 PHASE 1 MVP - PATH FORWARD

**Status:** In Progress → Launch Ready  
**Target:** Feature-complete, polished poker platform ready for beta users  
**Timeline:** 3 sprints (~10-12 days)

---

## 📊 CURRENT STATE

**✅ WORKING:**
- Core poker engine (dealing, betting, hand evaluation)
- 10-player table with optimized positioning
- Host controls (blinds, chips, kick) with queuing
- Room creation/joining system
- Socket.IO real-time sync
- Guest + logged-in auth

**🚧 NEEDS WORK:**
- Action buttons are unstyled
- No player settings (non-hosts have nothing)
- Navbar inconsistent across pages
- No mobile responsiveness
- No username system (only nicknames)
- No friends/social features
- Debug logs everywhere
- Missing loading/error states

---

## 🎯 SPRINT 2: UI FOUNDATIONS (Days 1-4)

### 1. Action Buttons Overhaul
**Files:** `public/minimal-table.html`

**Changes:**
- Restyle FOLD/CALL/RAISE buttons to match login/signup aesthetic
  - Font: Courier New
  - Clean shadows, consistent hover effects
  - Color-coded: Red (fold), Teal (call), Orange (raise)
- Build raise modal/panel:
  - Quick preset buttons: 1/4 pot, 1/2 pot, 3/4 pot, pot, 2x pot, all-in
  - Custom slider (min bet → stack)
  - Direct numeric input with validation
  - Clear pot display and constraints

### 2. Player Settings Panel
**Files:** `public/minimal-table.html`

**New Settings:**
- Card back design selector (3-5 options)
- Chip color scheme
- Animation speed (fast/normal/slow)
- Auto-muck losing hands toggle
- Sound effects toggle
- Save to localStorage + DB for logged-in users

### 3. Unified Navbar
**Files:** `public/partials/navbar.html` (new), all HTML pages

**Structure:**
```
[Logo] | Home | How to Play | Leaderboard | [Guest: Login/Signup | Logged In: @username dropdown]
```

**Implementation:**
- Create reusable navbar partial
- Inject via JS into all pages
- Single `navbar.css` + `navbar.js`
- Dynamic rendering based on auth state

### 4. Mobile Responsiveness
**Files:** CSS in all pages

**Breakpoints:**
- Desktop: 1600px+ (current)
- Tablet: 768-1599px (scale table, stack controls)
- Mobile: <768px (portrait priority, fixed bottom toolbar)

---

## 🎯 SPRINT 3: IDENTITY & SOCIAL (Days 5-9)

### 5. Username System
**Files:** Migration SQL, `routes/auth.js`, profile pages

**Database:**
```sql
ALTER TABLE user_profiles 
  ADD COLUMN username VARCHAR(30) UNIQUE,
  ADD CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$');
CREATE INDEX idx_username ON user_profiles(username);
```

**UX Flow:**
- First login → prompt for username selection
- Validation: 3-20 chars, alphanumeric + underscore
- Show `@username` in navbar, `nickname` at table

### 6. Profile Modal
**Files:** `public/profile-modal.html` (component), `routes/stats.js` (new)

**Contents:**
- User info: @username, nickname, [Edit] [Logout]
- Stats: Games played, hands played, best hand, win rate, total chips won
- Achievements section (placeholder for now)
- Quick actions: Friends, History, Settings

**Backend:**
- Aggregate from `player_session_stats` table
- New endpoint: `GET /api/stats/summary/:userId`

### 7. Friends System
**Files:** Migration SQL, `routes/friends.js` (new), friends UI

**Database Schema:**
```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  friend_id UUID NOT NULL REFERENCES user_profiles(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  initiated_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
  CONSTRAINT no_self_friend CHECK (user_id != friend_id)
);
```

**API Endpoints:**
- `POST /api/friends/request` - Send friend request
- `GET /api/friends` - List friends (status=accepted)
- `GET /api/friends/requests` - Pending requests
- `POST /api/friends/accept/:friendshipId`
- `DELETE /api/friends/:friendshipId`

**UI:**
- Friends modal with tabs: Friends | Requests | Find
- Search by username
- Send/accept/decline/unfriend actions

### 8. Friend Invites
**Files:** `public/minimal-table.html`, Socket.IO events

**Flow:**
1. Host clicks "Invite Friends" in lobby
2. Modal shows online friends
3. Click friend → sends notification with room code
4. Friend gets popup: "Join @username's game?"

**Backend:**
- `POST /api/rooms/invite` - Send invite notification
- Socket event: `friend_game_invite`

### 9. Notifications System
**Files:** Migration SQL, `routes/notifications.js` (new), navbar

**Database:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  type VARCHAR(50) NOT NULL,
  from_user_id UUID REFERENCES user_profiles(id),
  room_code VARCHAR(10),
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**UI:**
- Bell icon in navbar with unread count badge
- Dropdown showing recent notifications
- Mark as read on view

---

## 🎯 SPRINT 4: POLISH & LAUNCH (Days 10-12)

### 10. Debug Cleanup
**Files:** All JS files

**Actions:**
- Remove/gate all `console.log` behind `DEBUG_MODE` flag
- Remove dev tools (positioning tool references)
- Keep only critical error logs

### 11. Loading States
**Files:** All pages with async operations

**Add Spinners For:**
- Room creation (prevent double-click)
- Joining room
- Action submission (bet/fold/raise)
- Loading profile/stats
- Loading friends list

### 12. Error Handling
**Files:** All fetch/socket listeners

**Graceful Failures:**
- Network timeout → reconnecting modal
- Invalid room code → clear error, don't crash
- Kicked from room → redirect with notification
- Out of sync → force reload button

### 13. Empty States
**Files:** All list/data pages

**Design For:**
- No friends yet → "Find friends to invite!"
- No game history → "Play your first hand"
- Lobby empty → "Share the room code"

### 14. Placeholder Pages
**Files:** New HTML pages

**Create:**
- `/leaderboard` → "Coming Soon" with description
- `/tournaments` → "Coming Soon"
- `/how-to-play` → Basic poker rules + platform guide

### 15. Mobile Testing
**Actions:**
- Test on real iPhone/Android
- Verify touch targets ≥44px
- No horizontal scroll
- Portrait orientation works
- Action buttons accessible

### 16. Final QA Checklist
- [ ] All core features work (create, join, play, leave)
- [ ] No console errors on any page
- [ ] Mobile responsive on 3+ devices
- [ ] Friends system fully functional
- [ ] Stats tracking accurately
- [ ] Loading states present everywhere
- [ ] Error messages clear and helpful
- [ ] 10 concurrent games stress test
- [ ] Guest → logged-in upgrade works
- [ ] No SQL injection vulnerabilities (parameterized queries)

---

## 🎯 DEFINITION OF DONE (PHASE 1)

### Must Ship:
✅ **Gameplay:** Stable 2-10 player Texas Hold'em  
✅ **Rooms:** Create/join with host controls  
✅ **Identity:** Username system + basic profile  
✅ **Social:** Friends + invites  
✅ **UI:** Responsive, polished, consistent  
✅ **Polish:** No bugs, loading states, error handling  

### Can Wait (Phase 2):
❌ Tournaments  
❌ Public leaderboards  
❌ Avatar uploads  
❌ Chat (text/voice)  
❌ Hand history viewer  
❌ Chip purchasing  
❌ Spectator mode enhancements  

---

## 📐 TECHNICAL ARCHITECTURE NOTES

### Database Tables Added:
1. `friendships` - Friend relationships
2. `notifications` - User notifications
3. `user_profiles.username` - Unique username column

### New Routes:
1. `/api/friends/*` - Friends management
2. `/api/stats/summary/:userId` - Profile stats
3. `/api/notifications/*` - Notification CRUD
4. `/api/rooms/invite` - Friend game invites

### Frontend Components:
1. `navbar.html` - Shared navbar
2. `profile-modal.html` - User profile popup
3. `friends-modal.html` - Friends management
4. `raise-modal.html` - Bet/raise interface

---

## 🚨 CRITICAL SUCCESS FACTORS

1. **No Breaking Changes:** Every commit must keep existing gameplay working
2. **Mobile First:** Test on mobile after every UI change
3. **Performance:** Page load <2s, action response <500ms
4. **Security:** Parameterized queries, input sanitization, rate limiting
5. **User Feedback:** Clear loading/error states everywhere

---

## 📊 LAUNCH METRICS

**Week 1 Goals:**
- 50+ unique users
- 20+ concurrent games
- <5% error rate
- No critical bugs

**Success = Phase 1 Complete, ready for Phase 2 planning**

