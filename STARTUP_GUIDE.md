# Troodie Developer Startup Guide

Welcome to the Troodie project! This guide will help you get up and running with local development, including environment setup, building the app, and working with Supabase migrations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables Setup](#environment-variables-setup)
3. [Building a Local Version with Expo](#building-a-local-version-with-expo)
4. [Supabase Workflow & Migrations](#supabase-workflow--migrations)
5. [Verification & Testing](#verification--testing)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Expo CLI** (install globally: `npm install -g expo-cli`)
- **Supabase CLI** (install via Homebrew: `brew install supabase/tap/supabase`)
- **Git** (for version control)
- **iOS Simulator** (for macOS) or **Android Studio** (for Android development)

### Verify Installation

```bash
node --version    # Should be >= 18
npm --version     # Should be >= 9
expo --version    # Should show version number
supabase --version # Should show version number
```

---

## Environment Variables Setup

Troodie uses environment-specific configuration files. You'll need to create these files in the project root.

### Required Environment Files

The project uses three environment files based on build profiles:

- `.env.development` - For local development
- `.env.staging` - For staging/TestFlight builds
- `.env.production` - For production builds

### Step 1: Create Environment Files

Create `.env.development` in the project root:

```bash
# Copy from existing template (if available) or create new
touch .env.development
```

### Step 2: Required Environment Variables

Add the following variables to your `.env.development` file:

```bash
# Supabase Configuration (Required)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Google Maps API (Required for location features)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Cloudinary Configuration (Required for image/video uploads)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Build Profile (Automatically set, but can override)
EAS_BUILD_PROFILE=development
```

### Step 3: Get Your Credentials

#### Supabase Credentials

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project (or ask your team lead for project access)
3. Navigate to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

#### Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing one
3. Enable **Maps SDK for iOS** and **Maps SDK for Android**
4. Create credentials → API Key
5. Restrict the key to your app's bundle ID (optional but recommended)

#### Cloudinary Credentials

1. Sign up at [Cloudinary](https://cloudinary.com/)
2. Go to **Dashboard** → **Settings**
3. Copy:
   - **Cloud name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`

### Step 4: Verify Environment Variables

The app will validate required variables on startup. If you see errors, check:

```bash
# Verify file exists and has content
cat .env.development

# Check if variables are loaded (in app.config.js logs)
npm start
# Look for: "[app.config] Loaded X variables from .env.development"
```

### Important Notes

- **Never commit** `.env.*` files to version control (they're in `.gitignore`)
- Keep your `SUPABASE_SERVICE_ROLE_KEY` secret - it bypasses Row Level Security
- Use different Supabase projects for development vs production
- Ask your team lead for shared development credentials if available

---

## Building a Local Version with Expo

Troodie uses Expo for cross-platform development. You can run the app locally using Expo Go or a development build.

### Option 1: Expo Go (Quick Start - Limited Features)

Expo Go is the fastest way to get started, but has limitations (no custom native modules).

```bash
# Install dependencies
npm install

# Start the Expo development server
npm start
# or
expo start

# Scan QR code with:
# - iOS: Camera app (opens Expo Go)
# - Android: Expo Go app
```

**Limitations:**
- Some native modules may not work
- Video features may be limited
- Best for UI development only

### Option 2: Development Build (Recommended)

A development build includes all native modules and is closer to production.

#### Step 1: Install Dependencies

```bash
npm install
```

#### Step 2: Start Development Server

```bash
# For development environment (default)
npm start

# For staging environment
npm run start:staging

# For production environment (testing)
npm run start:production
```

#### Step 3: Build Development Client

**Using EAS Build (Cloud Build - Recommended):**

```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo
eas login

# Build for iOS simulator (development profile)
eas build --profile development --platform ios

# Build for Android (development profile)
eas build --profile development --platform android

# Build for physical device
eas build --profile development --platform ios --device
```

**Using Local Build:**

```bash
# iOS (requires Xcode)
npm run ios

# Android (requires Android Studio)
npm run android

# Web (for testing web features)
npm run web
```

#### Step 4: Run on Device/Simulator

After building:

1. **iOS Simulator:**
   ```bash
   # Start simulator
   open -a Simulator
   
   # Run app
   npm run ios
   ```

2. **Android Emulator:**
   ```bash
   # Start emulator from Android Studio
   # Then run:
   npm run android
   ```

3. **Physical Device:**
   - Install the development build (from EAS or local build)
   - Ensure device and computer are on same network
   - Run `npm start` and scan QR code

### Step 5: Development Workflow

Once running, you can:

- **Hot Reload**: Changes to JavaScript/TypeScript auto-reload
- **Fast Refresh**: React components update without losing state
- **Debug**: Use React Native Debugger or Chrome DevTools
- **View Logs**: Check terminal output or use `expo start --tunnel` for remote debugging

### Common Development Commands

```bash
# Start development server
npm start

# Clear cache and restart
expo start -c

# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm test

# Run E2E tests (requires Maestro)
npm run test:e2e
```

---

## Supabase Workflow & Migrations

Troodie uses Supabase for backend services (database, auth, storage). Understanding the migration workflow is essential for database changes.

### Prerequisites

1. **Install Supabase CLI:**
   ```bash
   # macOS
   brew install supabase/tap/supabase
   
   # Verify installation
   supabase --version
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   # Follow prompts to authenticate
   ```

### Project Setup

#### Step 1: Link Your Supabase Project

For **staging** (recommended for development):

```bash
# Link to staging project
npm run supabase:link-staging
# or manually:
supabase link --project-ref gyhuhywytzdxijvlfilf
```

For **local development** (if using local Supabase):

```bash
# Start local Supabase (requires Docker)
supabase start

# Link to local instance
supabase link --project-ref local
```

#### Step 2: Verify Connection

```bash
# Check project status
npm run supabase:status
# or
supabase status
```

You should see:
- Project reference
- API URL
- Database connection status

### Migration Workflow

#### Understanding Migrations

Migrations are SQL files in `supabase/migrations/` that modify the database schema. They're versioned by timestamp:

```
supabase/migrations/
├── 20240101000000_initial_schema.sql
├── 20240102000000_add_users_table.sql
└── 20240103000000_add_posts_table.sql
```

#### Creating a New Migration

1. **Create Migration File:**
   ```bash
   # Generate new migration file
   supabase migration new add_feature_name
   # Creates: supabase/migrations/YYYYMMDDHHMMSS_add_feature_name.sql
   ```

2. **Write Your SQL:**
   ```sql
   -- Example: supabase/migrations/20240101000000_add_feature_name.sql
   
   -- Create table
   CREATE TABLE IF NOT EXISTS feature_table (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   -- Enable RLS
   ALTER TABLE feature_table ENABLE ROW LEVEL SECURITY;
   
   -- Create policies
   CREATE POLICY "Users can view own features"
     ON feature_table
     FOR SELECT
     USING (auth.uid() = user_id);
   ```

3. **Test Locally First:**
   ```bash
   # Reset local database and apply all migrations
   supabase db reset
   
   # Or apply just new migrations
   supabase migration up
   ```

#### Applying Migrations

**To Staging (Linked Project):**

```bash
# Apply all pending migrations
npm run supabase:migrate
# or
supabase db push --linked

# Apply specific migration
supabase migration up --linked
```

**To Local Supabase:**

```bash
# Apply all migrations
supabase db reset  # Resets and applies all

# Or apply incrementally
supabase migration up
```

#### Verifying Migrations

After applying migrations, verify they worked:

```bash
# Check migration status
supabase migration list --linked

# Generate TypeScript types (updates types/supabase-staging.ts)
npm run supabase:types
# or
supabase gen types typescript --linked > types/supabase-staging.ts
```

### Testing Migrations

#### Step 1: Test Locally (Recommended)

```bash
# Start local Supabase (if not running)
supabase start

# Reset database (applies all migrations)
supabase db reset

# Verify tables exist
supabase db diff  # Shows differences from remote
```

#### Step 2: Test on Staging

```bash
# Link to staging
npm run supabase:link-staging

# Apply migrations
npm run supabase:migrate

# Verify in Supabase Dashboard
# Go to: https://supabase.com/dashboard/project/gyhuhywytzdxijvlfilf/editor
```

#### Step 3: Verify Migration Success

**Check Migration Status:**

```sql
-- Run in Supabase SQL Editor
SELECT 
  version,
  name,
  inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY inserted_at DESC
LIMIT 10;
```

**Verify Tables/Columns:**

```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'your_table_name';

-- Check columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'your_table_name';
```

**Verify RLS Policies:**

```sql
-- Check policies on a table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'your_table_name';
```

**Test Queries:**

```sql
-- Test SELECT policy
SELECT * FROM your_table_name LIMIT 1;

-- Test INSERT policy (if applicable)
INSERT INTO your_table_name (column1, column2) 
VALUES ('test', 'data')
RETURNING *;

-- Test UPDATE policy
UPDATE your_table_name 
SET column1 = 'updated' 
WHERE id = 'some-id'
RETURNING *;
```

### Common Migration Tasks

#### Adding a New Table

```sql
-- Create table
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own data"
  ON new_table FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
  ON new_table FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

#### Adding a Column

```sql
ALTER TABLE existing_table
ADD COLUMN new_column TEXT;
```

#### Modifying RLS Policies

```sql
-- Drop old policy
DROP POLICY IF EXISTS "old_policy_name" ON table_name;

-- Create new policy
CREATE POLICY "new_policy_name"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id AND some_condition);
```

#### Creating Functions

```sql
CREATE OR REPLACE FUNCTION function_name(param TEXT)
RETURNS TABLE(result_column TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT column_name FROM table_name WHERE condition = param;
END;
$$;
```

### Rollback Strategy

If a migration fails or needs to be rolled back:

```bash
# Check migration history
supabase migration list --linked

# Rollback last migration (if supported)
supabase migration down --linked

# Or manually fix in Supabase Dashboard SQL Editor
# Then create a new migration to fix issues
```

### Best Practices

1. **Always test locally first** before applying to staging/production
2. **Use transactions** in migrations when possible:
   ```sql
   BEGIN;
   -- Your migration SQL
   COMMIT;
   ```
3. **Include RLS policies** in the same migration as table creation
4. **Add indexes** for frequently queried columns
5. **Update TypeScript types** after migrations: `npm run supabase:types`
6. **Document breaking changes** in migration file comments
7. **Test with real data** after applying migrations

---

## Verification & Testing

### Verify Environment Setup

Run these checks to ensure everything is configured correctly:

```bash
# 1. Check Node/npm versions
node --version  # Should be >= 18
npm --version   # Should be >= 9

# 2. Verify dependencies installed
npm list --depth=0

# 3. Check environment variables loaded
npm start
# Look for: "[app.config] Loaded X variables from .env.development"

# 4. Verify Supabase connection
npm run supabase:status

# 5. Type check
npm run typecheck

# 6. Lint check
npm run lint
```

### Verify App Functionality

1. **Authentication:**
   - Can you log in?
   - Are sessions persisted?
   - Does logout work?

2. **Database Queries:**
   - Can you fetch data?
   - Are RLS policies working?
   - Do mutations work?

3. **Image Upload:**
   - Can you upload images?
   - Are they stored in Supabase Storage?
   - Do they display correctly?

4. **Location Features:**
   - Does location detection work?
   - Are restaurants loading nearby?

### Testing Migrations

Create a test checklist:

```bash
# 1. Apply migration
npm run supabase:migrate

# 2. Verify in SQL Editor
# Run: SELECT * FROM your_new_table LIMIT 1;

# 3. Test in app
# Try creating/reading data that uses new migration

# 4. Check RLS policies
# Test as different users if applicable

# 5. Verify TypeScript types updated
npm run supabase:types
# Check types/supabase-staging.ts has new types
```

---

## Troubleshooting

### Environment Variables Not Loading

**Problem:** App shows "Missing required Supabase configuration"

**Solutions:**
1. Verify `.env.development` exists in project root
2. Check file has correct variable names (no typos)
3. Restart Expo server: `npm start -c`
4. Check `app.config.js` logs for which file it's loading

### Supabase Connection Issues

**Problem:** "Failed to connect to Supabase"

**Solutions:**
1. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
2. Check Supabase project is active (not paused)
3. Verify network connection
4. Check Supabase dashboard for service status

### Migration Failures

**Problem:** Migration fails with error

**Solutions:**
1. **Check migration syntax:**
   ```bash
   # Test SQL in Supabase SQL Editor first
   ```

2. **Check for conflicts:**
   ```bash
   supabase db diff --linked
   ```

3. **Rollback and retry:**
   ```bash
   # Fix migration file
   # Then reset and reapply
   npm run staging:reset
   ```

4. **Common issues:**
   - Table already exists → Use `IF NOT EXISTS`
   - Policy conflicts → Drop old policies first
   - Foreign key violations → Check referenced tables exist

### Build Issues

**Problem:** EAS build fails

**Solutions:**
1. Check `eas.json` configuration
2. Verify environment variables in EAS dashboard
3. Check build logs for specific errors
4. Try local build first: `npm run ios` or `npm run android`

### TypeScript Type Errors

**Problem:** Types don't match database schema

**Solutions:**
1. Regenerate types: `npm run supabase:types`
2. Restart TypeScript server in your IDE
3. Check `types/supabase-staging.ts` was updated
4. Verify migration was applied successfully

### RLS Policy Issues

**Problem:** Queries return empty but data exists

**Solutions:**
1. Check user is authenticated: `auth.uid()` should not be null
2. Verify RLS policies allow the operation
3. Test query in Supabase SQL Editor with service role key
4. Check policy conditions match your use case

---

## Next Steps

Now that you're set up:

1. **Read the Codebase:**
   - Start with `QUICK_START.md`
   - Review `CLAUDE.md` for architecture overview
   - Explore `services/` directory

2. **Make Your First Change:**
   - Pick a small bug or feature
   - Follow existing patterns
   - Test thoroughly

3. **Join the Team:**
   - Ask questions in team channels
   - Review pull requests
   - Contribute to documentation

---

## Additional Resources

- **Expo Documentation:** https://docs.expo.dev/
- **Supabase Documentation:** https://supabase.com/docs
- **React Native Documentation:** https://reactnative.dev/docs/getting-started
- **Project Documentation:** See `docs/` directory

---

## Getting Help

If you're stuck:

1. Check this guide again
2. Review `QUICK_START.md` and `CLAUDE.md`
3. Search existing documentation in `docs/`
4. Ask your team lead or colleagues
5. Check Supabase/Expo community forums

---

**Welcome to Troodie! Happy coding! 🚀**

