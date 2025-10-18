# PokerUI Migration - Testing Guide

## 🚀 Quick Start

1. **Start the server**:
```bash
cd poker-engine
node sophisticated-engine-server.js
```

2. **Open browser**: Navigate to `http://localhost:3000/`

---

## ✅ Test Checklist

### 1. Landing Page (`/`)
- [ ] Page loads with PokerGeek.ai branding
- [ ] Liquid glass effects and animations work
- [ ] Navbar shows "Log In" and "Sign Up" buttons
- [ ] Click "Play Now" → redirects to `/play`
- [ ] Click "Add Friends" → redirects to `/friends`
- [ ] No console errors

### 2. Authentication (Index Page)
- [ ] Click "Log In" button → modal opens
- [ ] Click "Sign in with Google" → redirects to Google OAuth
- [ ] After OAuth → redirected back to `/` with session
- [ ] Navbar updates to show user profile (username + avatar)
- [ ] User profile persists on page refresh
- [ ] Click user avatar → settings menu appears
- [ ] Click "Logout" → session cleared, navbar resets

**Alternative: Anonymous Auth**
- [ ] Enter email/password in login form
- [ ] Click "Log In" → anonymous Supabase session created
- [ ] Navbar shows username from email

### 3. Play Page (`/play`)
- [ ] Navigate to `/play` from navbar
- [ ] Page shows three game sections: Quick Play, Create Room, Tournaments
- [ ] Click "Create Room" → modal opens
- [ ] Modal shows form with:
  - Small Blind input (default: 5)
  - Big Blind input (default: 10)
  - Max Players input (default: 6)
- [ ] Fill in custom values
- [ ] Click "Create Room" button
- [ ] Success: Redirected to `/game?room=<room_id>`
- [ ] Error: Notification shows error message

### 4. Game Table (`/game`)
- [ ] After creating room, game table loads
- [ ] Room ID visible in URL
- [ ] WebSocket connects (check console for connection message)
- [ ] Table displays with seats
- [ ] User can claim a seat
- [ ] Multiple players can join (test with incognito window)
- [ ] Game can start when 2+ players seated
- [ ] Cards deal correctly
- [ ] Betting actions work (fold, call, raise)

### 5. Friends Page (`/friends`)
- [ ] Navigate to `/friends` from navbar
- [ ] Page loads with friends UI
- [ ] Search bar visible
- [ ] Friend list displays (mock data for now)
- [ ] No console errors
- [ ] Navbar still shows logged-in state

### 6. Other Pages
- [ ] `/ai-solver` loads correctly
- [ ] `/analysis` loads correctly
- [ ] `/learning` loads correctly
- [ ] `/poker-today` loads correctly
- [ ] All pages share consistent navbar
- [ ] All pages maintain auth state

### 7. Cross-Page Auth Persistence
- [ ] Login on index page
- [ ] Navigate to `/play` → still logged in
- [ ] Navigate to `/friends` → still logged in
- [ ] Navigate to `/ai-solver` → still logged in
- [ ] Refresh any page → session persists
- [ ] Logout from `/play` → logged out on all pages

### 8. Multi-Player Game Flow
- [ ] Player 1: Create room on `/play`
- [ ] Player 1: Claim seat at table
- [ ] Player 2: Open incognito window, navigate to same room URL
- [ ] Player 2: Claim different seat
- [ ] Player 1: Start game
- [ ] Both players: See cards dealt
- [ ] Both players: Can take actions
- [ ] Game progresses through betting rounds
- [ ] Winner determined correctly

---

## 🐛 Common Issues & Fixes

### Issue: Port 3000 already in use
```bash
# Windows
taskkill /F /IM node.exe

# Mac/Linux
killall node
```

### Issue: CSS not loading
- Check browser console for 404 errors
- Verify `/css/pokergeek.css` exists
- Clear browser cache (Ctrl+Shift+R)

### Issue: "Cannot find module"
```bash
cd poker-engine
npm install
```

### Issue: Database connection error
- Check `.env` file has `DATABASE_URL`
- Verify Supabase credentials
- Test database connection:
```bash
node test-database.ts
```

### Issue: Google OAuth not working
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Add redirect URL: `http://localhost:3000/`

### Issue: Anonymous auth fails
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable "Anonymous sign-ins"

---

## 📊 Expected Console Output

### Server Startup
```
✅ Supabase auth initialized
✅ Database connected
✅ Event sourcing initialized
✅ WebSocket server started
🚀 SOPHISTICATED Poker Engine running on http://localhost:3000
```

### Client (Browser Console)
```
✅ Supabase client initialized
✅ Auth session loaded
✅ WebSocket connected
👤 User authenticated: <user_id>
```

---

## 🎯 Success Criteria

**Phase 1 Complete** if:
- ✅ All pages load without errors
- ✅ Navigation works across all pages
- ✅ CSS and animations display correctly
- ✅ Auth state persists across pages

**Phase 2 Complete** if:
- ✅ Google OAuth works end-to-end
- ✅ Anonymous auth works as fallback
- ✅ User profile displays in navbar
- ✅ Logout clears session

**Phase 3 Complete** if:
- ✅ Create Room modal opens and closes
- ✅ Room creation API call succeeds
- ✅ Redirect to game table works
- ✅ Game table loads with room data

**Phase 4 Complete** if:
- ✅ 2+ players can join same room
- ✅ Game can start and progress
- ✅ All player actions work
- ✅ WebSocket updates in real-time

---

## 📝 Test Results Log

**Date**: _____________  
**Tester**: _____________

| Test | Status | Notes |
|------|--------|-------|
| Landing page loads | ⬜ | |
| Google OAuth works | ⬜ | |
| Anonymous auth works | ⬜ | |
| Create room works | ⬜ | |
| Game table loads | ⬜ | |
| Multi-player game | ⬜ | |
| Auth persists | ⬜ | |
| All pages accessible | ⬜ | |

**Overall Status**: ⬜ Pass / ⬜ Fail  
**Blockers**: _____________________________________________

---

## 🔄 Next Steps After Testing

1. **If all tests pass**:
   - Move to Phase 5: Friends system integration
   - Wire `/api/friends/*` endpoints
   - Implement real-time friend status

2. **If tests fail**:
   - Document specific failures
   - Check server logs
   - Verify database state
   - Fix issues before proceeding

3. **Performance testing**:
   - Test with 10 concurrent players
   - Monitor WebSocket latency
   - Check database query performance
   - Optimize if needed

---

## 📞 Support

If you encounter issues:
1. Check this document for common fixes
2. Review `POKERUI_MIGRATION_COMPLETE.md` for implementation details
3. Check server logs for errors
4. Verify `.env` configuration
5. Test database connection separately

**Ready to test!** 🎉

