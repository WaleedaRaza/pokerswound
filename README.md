# 🎰 PokerGeek.ai - Online Multiplayer Poker Platform

**Status:** MVP Ready (70% complete)  
**Tech Stack:** Node.js, Express, PostgreSQL (Supabase), Socket.IO, Vanilla JS  
**Last Updated:** November 5, 2025

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL (or Supabase account)
- Google OAuth credentials (for social login)

### Installation

```bash
# 1. Clone and install
git clone <your-repo>
cd PokerGeek
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your credentials (see below)

# 3. Run database migrations
# Open Supabase SQL Editor and run these in order:
# - migrations/02_identity_social_system_FIXED.sql
# - migrations/03_sync_profile_stats.sql
# - migrations/04_room_limits_privacy.sql

# 4. Start the server
npm start
# Server runs on http://localhost:3000
```

### Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Auth
JWT_SECRET=your_jwt_secret_here_minimum_32_chars

# Server
PORT=3000
NODE_ENV=development
```

---

## ✅ Features Implemented

### 🎮 Core Poker Game
- ✅ Texas Hold'em engine with full betting rounds
- ✅ Multi-player rooms (2-10 players)
- ✅ Chip management and pot calculations
- ✅ Community cards and showdown logic
- ✅ Real-time updates via Socket.IO

### 👥 Social Features
- ✅ Google OAuth + Guest login
- ✅ Friend system (add, remove, search)
- ✅ Game invites (invite friends to your poker room)
- ✅ User profiles with stats
- ✅ Notifications system

### 🏠 Room Management
- ✅ Create/join rooms with invite codes
- ✅ Private rooms (hidden from public list)
- ✅ Room limit (max 5 active rooms per user)
- ✅ Host controls (kick, pause, settings)
- ✅ Lobby system with player approval

### 🎨 UI/UX
- ✅ Modern glassmorphism design
- ✅ Unified navbar across all pages
- ✅ Error handling infrastructure
- ✅ Loading states system
- ✅ Empty states system
- ✅ Player/host settings modals
- ✅ Raise slider with pot presets

### 📊 Player Statistics
- ✅ Hands played, games played, total wins
- ✅ Win rate calculation
- ✅ Total winnings/losses
- ✅ Auto-sync from game engine to profile

---

## 📁 Project Structure

```
PokerGeek/
├── public/                    # Frontend
│   ├── index.html            # Home page
│   ├── pages/
│   │   ├── play.html         # Game lobby
│   │   ├── friends.html      # Friends management
│   │   └── minimal-table.html # Poker table
│   ├── css/
│   │   ├── pokergeek.css     # Global styles
│   │   ├── loading-states.css
│   │   ├── empty-states.css
│   │   └── social-modals.css
│   └── js/
│       ├── auth-manager.js    # Authentication
│       ├── error-handler.js   # Error handling
│       ├── loading-states.js  # Loading UI
│       ├── empty-states.js    # Empty state messages
│       ├── friends-page.js    # Friends system
│       └── social-modals.js   # Profile/username modals
├── routes/                    # Backend API routes
│   ├── auth.js               # Auth endpoints
│   ├── rooms.js              # Room management (1,072 lines)
│   ├── games.js              # Game logic
│   ├── social.js             # Friends & notifications
│   └── v2.js                 # V2 endpoints
├── src/                      # Core game engine
│   ├── engine/               # Poker logic
│   └── services/             # Database services
├── migrations/               # SQL migrations
├── sophisticated-engine-server.js # Main server (1,046 lines)
└── package.json
```

---

## 🎯 Core User Flows

### 1. Sign Up & Play
```
1. Visit homepage → Click "Play Now"
2. Choose Google Sign-In or Play as Guest
3. Set username (first time only)
4. Create or join room
5. Wait in lobby → Host starts game
6. Play poker hands!
```

### 2. Add Friends & Invite
```
1. Navigate to Friends page
2. Search for username
3. Send friend request → Friend accepts
4. Create poker room
5. Click "Invite Friends" button
6. Select friend → Friend receives notification
7. Friend joins game via notification
```

### 3. Host Controls
```
1. Create room (you're auto-host)
2. Configure blinds, buy-in, table color
3. Approve players in lobby
4. Start game when ready
5. Use host controls during game:
   - Kick player, Pause game, Reset stacks
   - Change capacity, Set action timer
   - End game
```

---

## 🔧 API Endpoints

### Authentication (`/api/auth`)
- `POST /sync-user` - Sync Supabase user to backend DB
- `GET /profile/:userId` - Get user profile

### Rooms (`/api/rooms`)
- `POST /` - Create room (max 5 per user)
- `GET /` - List active rooms
- `GET /invite/:code` - Get room by invite code
- `POST /:roomId/join` - Join room
- `POST /:roomId/invite` - Invite friend to game
- `POST /:roomId/kick` - Kick player (host only)
- `POST /:roomId/pause-game` - Pause game (host only)

### Social (`/api/social`)
- `GET /friends` - Get friends list
- `GET /friends/requests` - Get friend requests
- `POST /friends/request` - Send friend request
- `POST /friends/accept` - Accept request
- `DELETE /friends/:friendId` - Unfriend
- `GET /profile/me` - Get own profile
- `POST /username/set` - Set initial username
- `POST /username/change` - Change username (unlimited)
- `GET /username/check` - Check username availability

---

## 🗄️ Database Schema

### Key Tables
- **`user_profiles`** - User info, stats, settings
- **`rooms`** - Poker rooms (name, blinds, host, invite_code, is_private)
- **`game_states`** - Active game state (JSONB)
- **`player_statistics`** - Detailed game stats
- **`friendships`** - Friend relationships
- **`friend_requests`** - Pending friend requests
- **`notifications`** - User notifications
- **`hand_history`** - Completed hands
- **`username_changes`** - Username change log

### Auto-Sync Trigger
```sql
-- player_statistics → user_profiles
-- Automatically updates profile stats when game stats change
CREATE TRIGGER update_profile_stats_trigger
AFTER INSERT OR UPDATE ON player_statistics
FOR EACH ROW EXECUTE FUNCTION sync_user_profile_stats();
```

---

## 🚨 Important Notes

### Authentication
- **Frontend:** Uses `SUPABASE_ANON_KEY` for client auth
- **Backend:** Uses `SUPABASE_SERVICE_ROLE_KEY` for database writes
- **Mixed:** Frontend calls backend APIs with JWT bearer tokens

### Room Limits
- Each user can have max **5 active rooms**
- Enforced in `/api/rooms` POST endpoint
- Returns helpful error if limit exceeded

### Username Changes
- **Unlimited** (was limited to 3, now removed)
- All changes logged in `username_changes` table
- Auto-refreshes navbar after change

### Private Rooms
- Set `is_private: true` when creating room
- Generates 6-char alphanumeric `room_code`
- Only joinable via invite code (not in public list)

---

## 🧪 Testing Checklist

### Critical User Flows
- [ ] Google sign-up → Set username → Create room → Play hand
- [ ] Guest login → Join room → Play hand
- [ ] Send friend request → Accept → Invite to game
- [ ] View profile → Change username → Stats update
- [ ] Play 5 hands → Check stats are accurate

### Host Controls
- [ ] Lock room → New players can't join
- [ ] Kick player → Seat freed
- [ ] Pause game → Actions disabled
- [ ] Reset stacks → All players back to starting chips
- [ ] End game → Game closes properly

### Edge Cases
- [ ] Try to create 6th room → Get error
- [ ] Join with invalid code → Get error
- [ ] Change to taken username → Get error
- [ ] Disconnect mid-hand → Can rejoin
- [ ] Multiple tabs open → State syncs

---

## 📋 Migrations to Run

**Before first launch, run these in Supabase SQL Editor:**

1. **`migrations/02_identity_social_system_FIXED.sql`**
   - Creates friends, notifications, username tracking

2. **`migrations/03_sync_profile_stats.sql`**
   - Auto-syncs player_statistics to user_profiles
   - Adds trigger for real-time updates

3. **`migrations/04_room_limits_privacy.sql`**
   - Adds `is_private` and `room_code` columns to rooms

**Verify migrations:**
```sql
-- Check trigger exists
SELECT tgname FROM pg_trigger 
WHERE tgname = 'update_profile_stats_trigger';

-- Check columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'rooms' 
AND column_name IN ('is_private', 'room_code');
```

---

## 🎨 UI Systems

### Error Handling
```javascript
// Use safeFetch wrapper
const data = await safeFetch('/api/rooms', {
  method: 'POST',
  body: JSON.stringify({...})
}, 'Create room');

// Or use handleApiError
if (!response.ok) {
  await handleApiError(response, 'Join game');
}
```

### Loading States
```javascript
// Button loading
await withButtonLoading('#myButton', async () => {
  // Do async work
});

// Overlay loading
showLoadingOverlay('#mySection', 'Loading players...');
// ... do work ...
hideLoadingOverlay('#mySection');
```

### Empty States
```javascript
// Render empty state
element.innerHTML = createEmptyState('friends');
element.innerHTML = createEmptyState('rooms');
element.innerHTML = createEmptyState('notifications');
```

---

## 🚀 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Use strong `JWT_SECRET` (min 32 chars)
- [ ] Enable HTTPS/SSL
- [ ] Run all migrations
- [ ] Test OAuth redirect URIs
- [ ] Set up error logging (e.g., Sentry)
- [ ] Configure CORS for production domain
- [ ] Set up database backups
- [ ] Test Socket.IO with load balancer (if using)

### Environment-Specific Settings
```javascript
// In production, disable debug logs
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.debug = () => {};
}
```

---

## 📊 Current Status

**Completed:** 8/19 tasks (42%)

### ✅ Done
1. Auth simplification (Google + Guest only)
2. Profile stats sync (migration ready)
3. Room limits & privacy
4. Friends UI (3 tabs working)
5. Friend invites to games
6. Error handling infrastructure
7. Loading states infrastructure
8. Empty states infrastructure

### ⏳ TODO
- Notifications bell icon (nice-to-have)
- Hand serialization (PHE encoding - can defer to v1.1)
- UI consistency audit
- Mobile responsiveness (basic - critical)
- Host controls testing
- Critical user flow testing
- Debug cleanup
- Pre-launch smoke tests

---

## 🛠️ Development Tips

### Adding New Features
1. Backend: Add route in `routes/`
2. Frontend: Add UI in `public/`
3. Use error handler: `safeFetch()`
4. Use loading states: `withButtonLoading()`
5. Add empty states if needed
6. Test edge cases
7. Commit with clear message

### Debugging
- Server logs: Check console for `❌` errors
- Client logs: Open browser DevTools → Console
- Database: Use Supabase SQL Editor to query tables
- Socket.IO: Enable debug mode with `DEBUG=socket.io:*`

### Common Issues
- **"Permission denied for table X"**
  - Solution: Run `GRANT ALL ON X TO service_role;` in Supabase
- **"Username already taken" (but it's not)**
  - Solution: Backend uses `.maybeSingle()` not `.single()`
- **Profile stats not updating**
  - Solution: Run migration 03 to add trigger
- **Can't create 6th room**
  - Solution: This is intentional (5 room limit)

---

## 📝 License

[Your License Here]

## 🤝 Contributing

[Your Contributing Guidelines]

## 📧 Support

[Your Support Contact]

---

**Built with ❤️ for poker enthusiasts**
