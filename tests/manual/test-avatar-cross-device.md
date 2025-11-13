# Cross-Device Avatar Persistence Test

## Prerequisites
- Two devices (or two browsers) with access to the app
- User account logged in on both devices
- Database access (optional, for verification)

## Test Procedure

### Step 1: Set Avatar on Device A
1. Log in on Device A
2. Open profile modal
3. Set avatar URL (e.g., `https://via.placeholder.com/150?text=DeviceA`)
4. Click "Save Avatar"
5. Verify avatar appears in navbar

### Step 2: Verify on Device B
1. Log in on Device B (same account)
2. **DO NOT** refresh - check if avatar appears
3. If not, refresh the page
4. Verify avatar from Device A appears

### Step 3: Change Avatar on Device B
1. On Device B, set a different avatar URL (e.g., `https://via.placeholder.com/150?text=DeviceB`)
2. Click "Save Avatar"
3. Verify avatar updates on Device B

### Step 4: Verify on Device A
1. Go back to Device A
2. Refresh the page (or wait for auto-refresh)
3. Verify avatar from Device B appears

### Step 5: Database Verification (Optional)
```sql
SELECT id, username, avatar_url, updated_at 
FROM user_profiles 
WHERE id = 'YOUR_USER_ID';
```

Verify:
- `avatar_url` matches the latest value
- `updated_at` reflects the most recent change

## Expected Results

✅ Avatar set on Device A appears on Device B after refresh
✅ Avatar set on Device B appears on Device A after refresh
✅ Database contains the latest avatar_url
✅ No console errors on either device

## Troubleshooting

### Avatar doesn't appear on Device B
1. Check browser console for errors
2. Verify database has the correct value
3. Try hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
4. Check network tab for failed requests

### Avatar appears but is wrong
1. Check localStorage: `JSON.parse(localStorage.getItem('pokerUser')).avatar_url`
2. Check database directly
3. Clear cache and refresh

### Avatar doesn't update after change
1. Check if API call succeeded (Network tab)
2. Verify `authManager.user.avatar_url` updated
3. Check if `saveToCache()` was called

## Quick Test Commands

### On Device A (Browser Console)
```javascript
// Set avatar
await testAvatarSet();

// Check current state
console.log(window.authManager.user.avatar_url);
console.log(JSON.parse(localStorage.getItem('pokerUser')).avatar_url);
```

### On Device B (Browser Console)
```javascript
// Refresh from database
await testAvatarRefresh();

// Check current state
console.log(window.authManager.user.avatar_url);
```

### Database Check (psql or Supabase)
```sql
SELECT id, username, avatar_url, updated_at 
FROM user_profiles 
WHERE username = 'YOUR_USERNAME';
```

