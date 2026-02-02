# Supabase Migration Guide for Staging

This guide shows how to set up and migrate your staging Supabase project using the Supabase CLI for a seamless workflow.

## Prerequisites

1. **Install Supabase CLI** (if not already installed):
   ```bash
   # macOS (recommended)
   brew install supabase/tap/supabase
   
   # Alternative methods:
   # npm install -g supabase (not recommended - global install issues)
   # curl -fsSL https://supabase.com/install.sh | sh (Linux/WSL)
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

## Project Setup

### 1. Link Staging Project

```bash
# Link to your staging project
supabase link --project-ref gyhuhywytzdxijvlfilf
```

This creates a `.supabase/config.toml` file with your project reference.

### 2. Verify Connection

```bash
# Check project status
supabase status

# List all projects (optional)
supabase projects list
```

## Migration Workflow

### 1. Apply All Migrations

```bash
# Apply all pending migrations to staging
supabase db push --linked

# Or apply specific migration
supabase migration up --linked
```

### 2. Reset Database (if needed)

```bash
# Reset staging database to clean state
supabase db reset --linked

# Then apply all migrations
supabase db push --linked
```

### 3. Generate Types

```bash
# Generate TypeScript types for staging
supabase gen types typescript --linked > types/supabase-staging.ts
```

## Package.json Scripts

Add these scripts to your `package.json` for easy migration management:

```json
{
  "scripts": {
    "supabase:link-staging": "supabase link --project-ref gyhuhywytzdxijvlfilf",
    "supabase:status": "supabase status",
    "supabase:migrate": "supabase db push --linked",
    "supabase:reset": "supabase db reset --linked",
    "supabase:types": "supabase gen types typescript --linked > types/supabase-staging.ts",
    "supabase:seed": "node scripts/seed-staging-data.js",
    "staging:setup": "npm run supabase:link-staging && npm run supabase:migrate && npm run supabase:types",
    "staging:reset": "npm run supabase:reset && npm run supabase:migrate && npm run supabase:types"
  }
}
```

## Migration Files

Your migration files are located in `supabase/migrations/`:

- `20251016_enhanced_deliverables_system.sql` - Main deliverables system
- `20250116_fix_campaign_deliverables_rls.sql` - RLS policies fix

## Step-by-Step Staging Setup

### 1. Initial Setup

```bash
# Link staging project
npm run supabase:link-staging

# Verify connection
npm run supabase:status
```

### 2. Apply Migrations

```bash
# Apply all migrations
npm run supabase:migrate
```

### 3. Generate Types

```bash
# Generate TypeScript types
npm run supabase:types
```

### 4. Seed Test Data (Optional)

```bash
# Run seeding script (when created)
npm run supabase:seed
```

## Troubleshooting

### Common Issues

1. **"Project not found"**:
   ```bash
   # Re-link project
   supabase link --project-ref gyhuhywytzdxijvlfilf
   ```

2. **"Migration failed"**:
   ```bash
   # Check migration status
   supabase migration list --linked
   
   # Reset and retry
   npm run staging:reset
   ```

3. **"RLS policy conflicts"**:
   ```bash
   # Check existing policies
   supabase db diff --linked
   
   # Apply specific migration
   supabase migration up --linked --target 20250116_fix_campaign_deliverables_rls
   ```

### Reset Everything

If you need to start completely fresh:

```bash
# Reset staging database
npm run staging:reset

# This will:
# 1. Reset database to clean state
# 2. Apply all migrations
# 3. Generate types
```

## Verification

After migrations, verify everything works:

1. **Check tables exist**:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. **Check RLS policies**:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies 
   WHERE tablename IN ('campaign_deliverables', 'campaign_deliverables_new')
   ORDER BY tablename, policyname;
   ```

3. **Test app connection**:
   - Build staging app: `eas build --profile staging --platform ios`
   - Test login and basic functionality

## Next Steps

1. **Seed realistic data** for stakeholder testing
2. **Build TestFlight** from staging profile
3. **Create stakeholder guide** for app testing
4. **Document any issues** found during migration

## Files Created/Modified

- `.supabase/config.toml` - Project configuration
- `types/supabase-staging.ts` - Generated TypeScript types
- `package.json` - Added migration scripts

## Security Notes

- Keep `.supabase/config.toml` in `.gitignore` (contains project refs)
- Use environment variables for sensitive data
- Never commit service role keys to version control
