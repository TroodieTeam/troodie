# Community Feature Migration Guide

## Overview
The Community feature requires database tables and functions to be created. If you're seeing errors like "Could not find the function public.create_community", you need to run the migration.

## How to Run the Migration

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of: `supabase/migrations/20250125_create_communities_match_schema.sql`
6. Click **Run** to execute the migration

**Note:** If you get an error about `created_by` column not existing, use the safe version of the migration which handles existing tables gracefully.

### Option 2: Via Supabase CLI
If you have Supabase CLI set up and linked to your project:
```bash
npx supabase db push
```

## What the Migration Creates

1. **Tables:**
   - `communities` - Stores community information
   - `community_members` - Tracks who belongs to which community
   - `community_posts` - For future community content
   - `community_invites` - Manages private community invitations

2. **Functions:**
   - `create_community()` - Creates a new community and adds the creator as owner
   - `join_community()` - Allows users to join public communities
   - `ensure_quick_saves_board()` - Helper function for Quick Saves feature

3. **Views:**
   - `community_details_view` - Aggregated view for easier querying

4. **Security:**
   - Row Level Security (RLS) policies for secure data access
   - Proper permissions for authenticated users

## Troubleshooting

### Error: "Community tables not found"
The migration hasn't been run yet. Follow the steps above to run it.

### Error: "permission denied for table communities"
Make sure you're using the correct Supabase credentials and that RLS policies are properly set up.

### Error: "foreign key constraint restaurant_id incompatible types"
This happens when restaurant_id is VARCHAR but restaurants.id is UUID. Run the fix migration:
```sql
-- In Supabase SQL Editor, run:
-- supabase/migrations/20250126_fix_restaurant_id_type.sql
```

### Error: "infinite recursion detected in policy for relation"
This occurs when RLS policies create circular references. Run the simple RLS migration:
```sql
-- In Supabase SQL Editor, run:
-- supabase/migrations/20250126_community_simple_rls.sql
```

### Fallback Mode
The community service includes a fallback mode that will attempt direct table inserts if the RPC functions aren't available. This allows basic functionality while you set up the proper migration.

## Verification
After running the migration, you can verify it worked by:
1. Going to Table Editor in Supabase Dashboard
2. Checking that these tables exist: `communities`, `community_members`, `community_posts`, `community_invites`
3. Creating a test community through the app