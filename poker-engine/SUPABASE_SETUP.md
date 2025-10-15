# Supabase Setup Instructions

## Step 1: Create Project
1. Go to https://supabase.com
2. Sign up/login → "New Project"
3. Name: `poker-engine`
4. **SAVE YOUR DATABASE PASSWORD!**
5. Wait ~2 minutes for setup

## Step 2: Get Connection String
1. Settings → Database
2. Copy "Connection string"
3. Example: `postgresql://postgres.xxx:[PASSWORD]@xxx.supabase.co:5432/postgres`

## Step 3: Update test.env
Replace the DATABASE_URL line in `test.env` with your real Supabase URL:
```
DATABASE_URL=postgresql://postgres.xxx:[YOUR-PASSWORD]@xxx.supabase.co:5432/postgres
```

## Step 4: Run Migration
1. In Supabase → SQL Editor → "New query"
2. Copy and paste the ENTIRE contents of: `database/migrations/001_initial_schema.sql`
3. Click "Run" to create all tables

## Step 5: Test Connection
```bash
node simple-db-test.js
```

## Step 6: Start Production Server
```bash
npx tsc && node dist/production-server.js
```

## Verification
You should see:
- ✅ Database connection successful
- ✅ All required tables exist
- 🚀 Production server running on port 3000

## Get API Keys (Optional for later)
Settings → API → Copy:
- `anon` key (for frontend)
- `service_role` key (for backend admin)

## Default Admin Account
Created automatically:
- Email: `admin@poker.local`
- Password: `admin123` (CHANGE THIS!)
- 10M chips balance
