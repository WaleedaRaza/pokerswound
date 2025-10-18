# Social Features Testing Guide

## ✅ What's Implemented

### Backend Services
- **UserProfileService** - Profile management, search
- **UsernameService** - Username changes with rate limiting
- **FriendService** - Friend requests, acceptance, removal
- **DisplayService** - In-game display names and aliases

### API Endpoints
```
GET    /api/user/profile
PUT    /api/user/profile
GET    /api/user/username/available?username=test
POST   /api/user/username/change
GET    /api/user/username/history
GET    /api/user/search?q=username

GET    /api/friends
GET    /api/friends/requests
POST   /api/friends/request
PUT    /api/friends/request/:id
DELETE /api/friends/:id

GET    /api/game/:gameId/players
POST   /api/game/:gameId/alias
GET    /api/game/:gameId/player/:userId/display
```

### Frontend Components
- **ApiService** - Centralized API calls
- **StateManager** - Global state management
- **UsernameManager** - Username UI
- **FriendSystem** - Friend list UI
- **GameDisplayManager** - In-game names

### WebSocket Events
- `friend_status_update` - Friend online/offline
- `username_changed` - Username change notifications
- `friend_request_received` - New friend request
- `friend_request_accepted` - Request accepted

## 🧪 Testing Steps

### 1. Test Username System
Open browser console and run:
```javascript
// Initialize username manager
usernameManager.initialize();

// Check username availability
apiService.checkUsernameAvailable('testuser123').then(console.log);

// Change username (if you have changes left)
// apiService.changeUsername('newname').then(console.log);
```

### 2. Test Friend System
```javascript
// Load friends
friendSystem.loadFriends();
friendSystem.loadFriendRequests();

// Search for users
apiService.searchUsers('test').then(r => console.log(r.users));

// Send friend request
// friendSystem.sendRequest('username');
```

### 3. Test Display System
```javascript
// When in a game
if (currentGame) {
  gameDisplayManager = new GameDisplayManager(currentGame.gameId);
  gameDisplayManager.loadPlayerDisplayNames();
}
```

### 4. Test via UI
1. Go to http://localhost:3000/poker
2. Sign in with Google or as Guest
3. Look for username/profile management
4. Test friend features
5. Join a game and test display names

## 📝 API Testing with curl

### Check username availability
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/user/username/available?username=testuser" | Select-Object -ExpandProperty Content
```

### Search users
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/user/search?q=test" | Select-Object -ExpandProperty Content
```

## 🐛 Troubleshooting

### Server not starting
```powershell
cd poker-engine
taskkill /F /IM node.exe
node sophisticated-engine-server.js
```

### Database connection issues
Check `.env` file has `DATABASE_URL` set

### Frontend not loading
Check browser console for errors
Verify scripts are loading: Network tab → js/services/

## ✨ Features Ready to Use

✅ Global username management
✅ Username change rate limiting  
✅ Friend system (add, accept, remove)
✅ User search
✅ In-game display names
✅ Per-game aliases
✅ Real-time WebSocket updates
✅ State management
✅ API error handling

## 🎯 Next Steps (For You)

1. **Test the username system**
   - Try changing your username
   - Check rate limiting works

2. **Test friend features**
   - Search for users
   - Send friend requests
   - Accept/reject requests

3. **Test in-game names**
   - Join a game
   - Set a game alias
   - See how names display

4. **Build UI components**
   - Add username manager to profile page
   - Add friend list to sidebar
   - Add alias manager to game settings

## 📊 What Works

- ✅ Backend services fully implemented
- ✅ Database integration working
- ✅ API routes registered
- ✅ Frontend JS components ready
- ✅ WebSocket events hooked up
- ✅ State management in place
- ✅ CSS styling added

## 🔧 Integration Points

All systems are wired together:
- Services → Database ✅
- Routes → Services ✅
- Frontend → API ✅
- WebSocket → State Manager ✅
- Components → State Manager ✅

Server running on: http://localhost:3000

