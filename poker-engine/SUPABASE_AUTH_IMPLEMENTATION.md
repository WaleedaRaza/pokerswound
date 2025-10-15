# 🔐 SUPABASE AUTHENTICATION - PROPER IMPLEMENTATION

## Current Status: ❌ INCOMPLETE

**Problem**: We built a basic JWT system, but we need **Supabase Auth** with OAuth providers for:
- ✅ Gmail/Google login
- ✅ Session persistence across refreshes
- ✅ Secure token management
- ✅ Built-in user management

---

## 🎯 What We Actually Need

### **1. Supabase Project Setup**

**Step 1: Create Supabase Project**
1. Go to https://supabase.com
2. Create new project: `pokeher-auth`
3. Copy credentials:
   - Project URL
   - Anon Key
   - Service Role Key

**Step 2: Enable Auth Providers**
In Supabase Dashboard → Authentication → Providers:
1. **Email** (already enabled)
2. **Google OAuth**:
   - Get OAuth credentials from Google Cloud Console
   - Add to Supabase
3. **Discord** (optional)
4. **GitHub** (optional)

### **2. Google OAuth Setup**

**Google Cloud Console**:
1. Go to https://console.cloud.google.com
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
5. Copy Client ID and Client Secret
6. Add to Supabase

### **3. Supabase Client Setup**

**Install Dependencies**:
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

**Create Supabase Client**:
```typescript
// src/lib/supabase-client.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
```

### **4. Auth Flow Implementation**

**Sign Up with Email**:
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      username: 'coolplayer',
      display_name: 'Cool Player'
    }
  }
})
```

**Sign In with Email**:
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})
```

**Sign In with Google**:
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
})
```

**Get Current User**:
```typescript
const { data: { user } } = await supabase.auth.getUser()
```

**Listen for Auth Changes**:
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session.user)
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out')
  }
})
```

### **5. Session Persistence**

**Automatic Session Management**:
```typescript
// Supabase automatically handles:
// - Token refresh
// - Session storage (localStorage)
// - Session restoration on page load
// - Token expiration

// Check if user is logged in
const { data: { session } } = await supabase.auth.getSession()
if (session) {
  console.log('User is logged in:', session.user)
}
```

### **6. Database Integration**

**Supabase automatically creates `auth.users` table**

**Extend with custom profile**:
```sql
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username VARCHAR(20) UNIQUE NOT NULL,
  display_name VARCHAR(50),
  avatar_url TEXT,
  total_chips BIGINT DEFAULT 1000,
  total_games_played INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### **7. Frontend Integration**

**Auth Context**:
```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) throw error
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signUp,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

**Auth UI Component**:
```typescript
// components/AuthModal.tsx
import { useAuth } from '@/contexts/AuthContext'

export const AuthModal = () => {
  const { signInWithGoogle, signInWithEmail, signUp } = useAuth()

  return (
    <div className="auth-modal">
      <h2>Sign In to PokerGeek</h2>
      
      {/* Google Sign In */}
      <button onClick={signInWithGoogle} className="btn-google">
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="divider">OR</div>

      {/* Email Sign In Form */}
      <form onSubmit={handleEmailSignIn}>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button type="submit">Sign In</button>
      </form>
    </div>
  )
}
```

### **8. WebSocket Integration**

**Authenticate WebSocket Connections**:
```typescript
// Server-side (sophisticated-engine-server.js)
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token
  
  if (!token) {
    return next(new Error('Authentication required'))
  }

  try {
    // Verify Supabase token
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !user) {
      return next(new Error('Invalid token'))
    }

    socket.userId = user.id
    socket.userEmail = user.email
    next()
  } catch (error) {
    next(new Error('Authentication failed'))
  }
})

// Client-side
const { data: { session } } = await supabase.auth.getSession()
const socket = io('http://localhost:3000', {
  auth: {
    token: session?.access_token
  }
})
```

---

## 🚀 Implementation Steps

### **Phase 1: Supabase Setup** (30 min)
1. [ ] Create Supabase project
2. [ ] Copy credentials to `.env`
3. [ ] Enable Google OAuth in Supabase
4. [ ] Set up Google Cloud OAuth credentials

### **Phase 2: Client Integration** (1 hour)
1. [ ] Install Supabase dependencies
2. [ ] Create Supabase client
3. [ ] Implement auth context
4. [ ] Create auth UI components

### **Phase 3: Database Schema** (30 min)
1. [ ] Create profiles table
2. [ ] Set up RLS policies
3. [ ] Create trigger for new users

### **Phase 4: WebSocket Auth** (1 hour)
1. [ ] Add Supabase admin client to server
2. [ ] Implement WebSocket auth middleware
3. [ ] Update client to send auth token

### **Phase 5: Testing** (30 min)
1. [ ] Test Google OAuth flow
2. [ ] Test email signup/login
3. [ ] Test session persistence
4. [ ] Test WebSocket authentication

**Total Time**: ~3-4 hours

---

## 📝 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Existing
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

---

## ✅ Benefits of Supabase Auth

1. **Built-in OAuth** - Google, GitHub, Discord, etc.
2. **Session Management** - Automatic token refresh
3. **Security** - Industry-standard security practices
4. **Persistence** - Sessions survive page refreshes
5. **User Management** - Built-in user dashboard
6. **Email Verification** - Automatic email workflows
7. **Password Reset** - Built-in password reset flow
8. **RLS Integration** - Row-level security with auth.uid()

---

## 🎯 Next Steps

**Ready to implement proper Supabase Auth?**

I'll:
1. Set up Supabase client properly
2. Implement Google OAuth
3. Add session persistence
4. Integrate with WebSocket
5. Create proper auth UI

**Should I start implementing this now?** 🚀
