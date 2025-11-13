# Avatar Overwrite Bug - FIXED

## The Problem

Your custom avatar was being overwritten by Google's profile picture every time you logged in. This happened because:

1. **Database Trigger**: The `sync_auth_user()` trigger runs on every Supabase auth update
2. **Overwrites Avatar**: It was setting `avatar_url = NEW.raw_user_meta_data->>'avatar_url'` (Google's picture)
3. **Every Login**: Every time you log in, Supabase updates `auth.users`, triggering the sync
4. **Result**: Your custom avatar gets replaced with Google's default picture

## The Fix

The trigger now **preserves existing avatars**:
- ✅ On INSERT (new users): Uses Google avatar if available
- ✅ On UPDATE (existing users): **Keeps your custom avatar**, only uses Google's if you don't have one

## How to Apply the Fix

### Option 1: Run Migration (Recommended)
```bash
node run-migration.js database/migrations/019_fix_avatar_trigger.sql
```

### Option 2: Run SQL Directly
Copy and paste the contents of `fix-avatar-overwrite.sql` into:
- Supabase SQL Editor (Dashboard → SQL Editor)
- pgAdmin query tool
- psql command line

### Option 3: Quick SQL Fix
```sql
CREATE OR REPLACE FUNCTION sync_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, username, display_name, avatar_url, created_at, updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    display_name = COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    -- ✅ PRESERVE existing avatar_url
    avatar_url = COALESCE(
      (SELECT avatar_url FROM public.user_profiles WHERE id = NEW.id),
      NEW.raw_user_meta_data->>'avatar_url'
    ),
    updated_at = NEW.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Testing After Fix

1. **Set your custom avatar** (if you haven't already)
2. **Log out and log back in**
3. **Check avatar persists** - should still be your custom one
4. **Hard refresh** (Cmd+Shift+R) - should still be your custom one
5. **Check different device** - should show your custom avatar

## Verification

Run in browser console:
```javascript
// Check database value
const profile = await fetch(`/api/auth/profile/${window.authManager.user.id}`).then(r => r.json())
console.log('Database avatar_url:', profile.avatar_url)

// Check memory
console.log('Memory avatar_url:', window.authManager.user.avatar_url)

// Check localStorage
console.log('Cache avatar_url:', JSON.parse(localStorage.getItem('pokerUser')).avatar_url)
```

All three should match your custom avatar URL!

## What Changed

**Before:**
```sql
avatar_url = NEW.raw_user_meta_data->>'avatar_url'  -- Always overwrites!
```

**After:**
```sql
avatar_url = COALESCE(
  (SELECT avatar_url FROM public.user_profiles WHERE id = NEW.id),  -- Keep existing
  NEW.raw_user_meta_data->>'avatar_url'  -- Only if NULL
)
```

This means:
- If you have a custom avatar → it stays
- If you don't have one → uses Google's (on first login)

