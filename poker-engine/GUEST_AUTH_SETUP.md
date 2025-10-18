# Guest/Anonymous Authentication Setup

## What Was Added
- Anonymous sign-in for guests who want to join games without Google account
- Automatic guest account creation when clicking "Join Game"
- Guest users get username like `Guest_abc123`

## How It Works
1. **Host** - Signs in with Google, creates game
2. **Guest** - Just clicks "Join Game", auto-creates anonymous account
3. Both can play together!

## Supabase Configuration Required

You need to enable anonymous sign-ins in your Supabase project:

### Steps:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Providers**
4. Scroll down to **Anonymous sign-ins**
5. Toggle it **ON**
6. Click **Save**

## Testing
1. **Browser 1 (Host)**: Sign in with Google → Create Game
2. **Browser 2 (Guest)**: Click "Join Game" → Enter code
3. Guest account is auto-created, no Google needed!

## User Experience
- **Google users**: Persistent account, can create games
- **Guest users**: Temporary account, can join games
- Both show up in `auth.users` table
- Both can play poker together

## Code Changes
- Added `signInAsGuest()` function using `supabase.auth.signInAnonymously()`
- Updated `showJoinGameModal()` to auto-create guest if not signed in
- Updated `checkAuthSession()` to handle anonymous users

