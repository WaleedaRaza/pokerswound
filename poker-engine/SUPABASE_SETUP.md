# 🔧 SUPABASE SETUP GUIDE

## Step 1: Create Supabase Project

1. **Go to**: https://supabase.com
2. **Sign up** with GitHub/Google
3. **Create New Project**:
   - Name: `pokeher-auth`
   - Database Password: Generate strong password
   - Region: Choose closest to your users
4. **Wait** for project setup (2-3 minutes)

## Step 2: Get Project Credentials

In your Supabase dashboard:
1. Go to **Settings** → **API**
2. Copy these values:
   ```
   Project URL: https://your-project.supabase.co
   Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## Step 3: Configure Environment Variables

Add to your `.env` file:
```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Existing variables (keep these)
DATABASE_URL=postgresql://postgres...
JWT_SECRET=super-secret-jwt-key-for-development-only-change-in-production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
SERVER_SECRET=super-secret-server-key-for-rng-seeding-change-in-production
```

## Step 4: Enable Auth Providers

In Supabase Dashboard:
1. Go to **Authentication** → **Providers**
2. Enable **Email** provider:
   - ✅ Enable email confirmations
   - ✅ Enable email change confirmations
   - Set minimum password length: 8
3. Keep other providers disabled for now (we'll add them later)

## Step 5: Configure Email Templates

In **Authentication** → **Email Templates**:
1. **Confirm signup**: Customize welcome message
2. **Reset password**: Customize reset message
3. **Magic link**: Customize magic link message

## Step 6: Set up Custom SMTP (Optional)

For production, configure custom SMTP:
1. Go to **Authentication** → **SMTP Settings**
2. Add your email service (SendGrid, Mailgun, etc.)
3. Configure sender email and templates

## Step 7: Database Schema Setup

We'll create the user profiles table and auth-related tables in the next step.