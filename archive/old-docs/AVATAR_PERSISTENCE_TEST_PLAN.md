# Avatar Persistence - F150 Level Testing Plan

## Test Scenarios

### 1. Basic Persistence Tests
- [ ] Set avatar → Refresh page → Avatar persists
- [ ] Set avatar → Hard refresh (Cmd+Shift+R) → Avatar persists
- [ ] Set avatar → Close tab → Reopen → Avatar persists
- [ ] Set avatar → Close browser → Reopen → Avatar persists

### 2. Cache & Storage Tests
- [ ] Set avatar → Clear browser cache → Refresh → Avatar persists (from DB)
- [ ] Set avatar → Clear localStorage → Refresh → Avatar persists (from DB)
- [ ] Set avatar → Clear sessionStorage → Refresh → Avatar persists
- [ ] Set avatar → Inspect localStorage → Verify `avatar_url` in `pokerUser` object

### 3. Cross-Device Tests
- [ ] Set avatar on Device A → Check on Device B → Avatar appears
- [ ] Set avatar on Device B → Check on Device A → Avatar appears
- [ ] Set avatar on Desktop → Check on Mobile → Avatar appears
- [ ] Set avatar on Mobile → Check on Desktop → Avatar appears

### 4. Cross-Browser Tests
- [ ] Set avatar in Chrome → Check in Firefox → Avatar appears
- [ ] Set avatar in Firefox → Check in Safari → Avatar appears
- [ ] Set avatar in Safari → Check in Chrome → Avatar appears

### 5. Database Persistence Tests
- [ ] Set avatar → Check database `user_profiles.avatar_url` → Value correct
- [ ] Set avatar → Restart server → Avatar persists
- [ ] Set avatar → Database query directly → Value correct
- [ ] Set avatar → Multiple users → Each has correct avatar

### 6. Edge Cases
- [ ] Set avatar → Change to different avatar → New avatar persists
- [ ] Set avatar → Remove avatar (set to null) → Emoji fallback works
- [ ] Set invalid URL → Error handling works → Old avatar preserved
- [ ] Set avatar → Logout → Login → Avatar persists
- [ ] Set avatar → Switch accounts → Each account has correct avatar

### 7. Network Tests
- [ ] Set avatar → Go offline → Avatar still displays (from cache)
- [ ] Set avatar → Go offline → Go online → Avatar syncs
- [ ] Set avatar → Slow network → Avatar loads correctly
- [ ] Set avatar → Network error during save → Error handled gracefully

### 8. Concurrent Tests
- [ ] Set avatar in Tab 1 → Check Tab 2 → Avatar appears
- [ ] Set avatar in Tab 2 → Check Tab 1 → Avatar appears
- [ ] Set avatar → Multiple tabs open → All update correctly

### 9. UI Display Tests
- [ ] Avatar appears in navbar
- [ ] Avatar appears in dropdown menu
- [ ] Avatar appears in profile modal
- [ ] Avatar appears in friends list
- [ ] Avatar appears in game table (if applicable)
- [ ] Avatar fallback emoji works when no image

### 10. Performance Tests
- [ ] Set avatar → Page load time acceptable
- [ ] Set avatar → Multiple refreshes → No performance degradation
- [ ] Set avatar → Large image URL → Handles gracefully

## Test Execution Checklist

### Pre-Test Setup
1. Start server: `npm start` or `node server.js`
2. Open browser DevTools (Console + Network tabs)
3. Open Application tab → Local Storage
4. Have database access ready (pgAdmin, psql, or Supabase dashboard)

### Test Execution
Run each test scenario and mark as ✅ or ❌

### Post-Test Verification
1. Check browser console for errors
2. Check network tab for failed requests
3. Verify database values
4. Check localStorage contents

## Expected Results

✅ **All tests should pass** - Avatar should persist in ALL scenarios
❌ **If any test fails** - Document the failure and investigate

## Debugging Commands

### Check localStorage
```javascript
JSON.parse(localStorage.getItem('pokerUser')).avatar_url
```

### Check database
```sql
SELECT id, username, avatar_url FROM user_profiles WHERE id = 'YOUR_USER_ID';
```

### Force refresh from DB
```javascript
await window.authManager.checkAuth({ forceRefresh: true });
await window.navbarController.showUser(window.authManager.user);
```

### Clear everything and test
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

