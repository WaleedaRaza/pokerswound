# 🐛 Profile Load Error - Debug Guide

## Current Issue
**Error:** "Failed to load profile"  
**Cause:** Migration not run yet - new columns don't exist

---

## ✅ Quick Fix

### **Step 1: Check if migration was run**

Run this query in Supabase SQL Editor:

```sql
-- Check if new columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN (
  'total_hands_played',
  'best_hand_rank', 
  'win_rate',
  'biggest_pot_won'
);
```

**Expected result:**
- If 0 rows → Migration NOT run (this is your issue)
- If 4 rows → Migration WAS run

---

### **Step 2: Check your current username**

```sql
-- Check if you already have a username
SELECT id, username, display_name, chips
FROM user_profiles
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'waleedraza1211@gmail.com'
);
```

**Expected result:**
- `username` column shows your current username (or NULL)
- Other columns show your profile data

---

### **Step 3: Run the migration**

1. Open: `migrations/02_identity_social_system_FIXED.sql`
2. Copy entire contents
3. Paste into Supabase SQL Editor
4. Click "Run"

---

### **Step 4: Refresh page**

After migration:
1. Hard refresh (Cmd+Shift+R)
2. Click profile badge again
3. Should work now!

---

## 🎯 Alternative: Temporary Fix (Skip migration for now)

If you want to test without running migration, temporarily disable the profile check:

**Comment out lines in `public/js/social-modals.js`:**

```javascript
// Auto-check on page load
if (document.readyState === 'loading') {
  // document.addEventListener('DOMContentLoaded', checkIfNeedsUsername);
} else {
  // checkIfNeedsUsername();
}
```

This will stop the profile check from running on page load.

---

## 📊 What Should Happen After Migration

1. ✅ Profile API returns data successfully
2. ✅ If `username` is NULL → Username modal appears
3. ✅ If `username` exists → Profile modal opens with stats
4. ✅ No more "Failed to load profile" error

---

## 🚨 If Migration Fails

Check error message for:
- **"column already exists"** → Safe to ignore
- **"table already exists"** → Safe to ignore  
- **"permission denied"** → Need admin access
- **Other errors** → Share the error message

---

## 💡 Pro Tip

You can check server logs for the actual error:
```bash
# In your terminal where server is running
# Look for errors after clicking "View Profile"
```

The error will show which column is missing.

