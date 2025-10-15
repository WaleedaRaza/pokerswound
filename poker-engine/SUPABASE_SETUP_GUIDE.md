# 🚀 SUPABASE AUTH SETUP - STEP-BY-STEP GUIDE

## Part 1: Create Supabase Project (5 minutes)

### Step 1: Sign Up for Supabase
1. Go to **https://supabase.com**
2. Click **"Start your project"**
3. Sign up with GitHub (recommended) or email
4. Verify your email if needed

### Step 2: Create New Project
1. Click **"New Project"**
2. Fill in:
   - **Name**: `pokeher-auth` (or any name you like)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to you (e.g., `US East` or `US West`)
   - **Pricing Plan**: Free tier is fine for now
3. Click **"Create new project"**
4. Wait 2-3 minutes for project to initialize ☕

### Step 3: Get Your Credentials
Once project is ready:

1. Go to **Settings** (gear icon in sidebar) → **API**
2. You'll see:
   ```
   Project URL: https://xxxxxxxxxxxxx.supabase.co
   anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **COPY THESE THREE VALUES** - we'll need them!

---

## Part 2: Set Up Google OAuth (10 minutes)

### Step 1: Go to Google Cloud Console
1. Go to **https://console.cloud.google.com**
2. Sign in with your Google account

### Step 2: Create New Project (or use existing)
1. Click project dropdown at top
2. Click **"New Project"**
3. Name it: `PokerGeek Auth`
4. Click **"Create"**
5. Wait for project to be created
6. Select the new project from dropdown

### Step 3: Enable Google+ API
1. In left sidebar, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google+ API"**
3. Click on it
4. Click **"Enable"**
5. Wait for it to enable

### Step 4: Create OAuth Consent Screen
1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** (unless you have Google Workspace)
3. Click **"Create"**
4. Fill in:
   - **App name**: `PokerGeek`
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **"Save and Continue"**
6. **Scopes**: Click **"Save and Continue"** (skip for now)
7. **Test users**: Click **"Save and Continue"** (skip for now)
8. Click **"Back to Dashboard"**

### Step 5: Create OAuth Credentials
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Choose **"Web application"**
4. Fill in:
   - **Name**: `PokerGeek Web Client`
   - **Authorized JavaScript origins**: (leave empty for now)
   - **Authorized redirect URIs**: 
     ```
     https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback
     ```
     ⚠️ **Replace `YOUR_SUPABASE_PROJECT_ID`** with your actual Supabase project URL!
     
     Example: If your Supabase URL is `https://abcdefgh.supabase.co`, use:
     ```
     https://abcdefgh.supabase.co/auth/v1/callback
     ```

5. Click **"Create"**
6. **COPY THESE TWO VALUES**:
   - **Client ID**: `xxxxx.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-xxxxx`

---

## Part 3: Configure Supabase Auth (5 minutes)

### Step 1: Enable Google Provider in Supabase
1. Go back to your **Supabase Dashboard**
2. Go to **Authentication** (in left sidebar) → **Providers**
3. Find **Google** in the list
4. Click to expand it
5. Toggle **"Enable Sign in with Google"** to ON
6. Fill in:
   - **Client ID**: Paste from Google Cloud Console
   - **Client Secret**: Paste from Google Cloud Console
7. Click **"Save"**

### Step 2: Configure Email Provider (optional but recommended)
1. Still in **Authentication** → **Providers**
2. Find **Email** in the list
3. Make sure it's enabled
4. Configure:
   - ✅ **Enable email confirmations** (recommended)
   - ✅ **Secure email change** (recommended)

---

## Part 4: Add Credentials to Your Project (2 minutes)

### Update Your `.env` File

1. Open `poker-engine/.env`
2. Add these lines (replace with YOUR actual values):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_SERVICE_KEY

# Google OAuth (for reference, not needed in code)
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-YOUR_SECRET

# Existing variables (keep these)
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

3. **Save the file**

---

## Part 5: Set Up Database Schema (5 minutes)

### Step 1: Create Profiles Table
1. In **Supabase Dashboard**, go to **SQL Editor** (in left sidebar)
2. Click **"New Query"**
3. Paste this SQL:

```sql
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username VARCHAR(20) UNIQUE NOT NULL,
  display_name VARCHAR(50),
  avatar_url TEXT,
  total_chips BIGINT DEFAULT 1000,
  total_games_played INTEGER DEFAULT 0,
  total_winnings BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

4. Click **"Run"** (or press Ctrl+Enter)
5. You should see **"Success. No rows returned"**

---

## Part 6: Verify Setup (2 minutes)

### Checklist
- [ ] Supabase project created
- [ ] Got Project URL, Anon Key, Service Role Key
- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] OAuth credentials created (Client ID + Secret)
- [ ] Google provider enabled in Supabase
- [ ] Credentials added to `.env` file
- [ ] Database schema created (profiles table)

---

## 🎉 You're Ready!

Once you've completed all steps above, tell me and I'll:
1. ✅ Install the Supabase client library
2. ✅ Create the auth context and hooks
3. ✅ Build the auth UI with Google sign-in
4. ✅ Integrate with WebSocket
5. ✅ Test the full flow

---

## ⚠️ Common Issues & Solutions

### Issue: "Invalid redirect URI"
**Solution**: Make sure the redirect URI in Google Cloud Console exactly matches:
```
https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
```

### Issue: "OAuth consent screen not configured"
**Solution**: Go back to Google Cloud Console → OAuth consent screen and complete setup

### Issue: "Profiles table not created"
**Solution**: Check SQL Editor for errors. Make sure you're in the correct project.

### Issue: "Can't find .env file"
**Solution**: Make sure you're editing `poker-engine/.env`, not the root `.env`

---

## 📞 Need Help?

If you get stuck on any step:
1. Take a screenshot of the error
2. Tell me which step you're on
3. I'll help you troubleshoot!

---

**Ready to start? Let me know when you've completed these steps!** 🚀
