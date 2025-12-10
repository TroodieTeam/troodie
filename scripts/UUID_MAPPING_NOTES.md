# UUID Mapping Notes

## Issue
Supabase Admin API **cannot** create users with custom IDs. Test confirmed:
- ✅ Creating WITHOUT ID: Works
- ❌ Creating WITH ID: Fails with "Database error creating new user"

## Solution
Since users exist in `public.users` with specific UUIDs, but we need to create them in `auth.users`:

1. **Create users in auth WITHOUT ID** (let Supabase generate)
2. **UUIDs will be different** - the auth UUID will NOT match the public.users UUID
3. **Two options:**

### Option A: Update public.users to use auth UUID
After running the script, manually update `public.users` to use the generated auth UUIDs.
You'll need to handle foreign key references.

### Option B: Keep both records
- Auth user exists with generated UUID
- Public user exists with original UUID  
- You'll need to link them differently in your app

### Option C: Use SQL directly (Recommended)
Instead of using Admin API, create a SQL script that inserts directly into `auth.users` table.
This allows you to specify the exact UUID you want.

## Recommendation
Since the SQL file already tried to create users in `auth.users`, check:
1. Did the SQL insert succeed?
2. If not, what was the error?
3. Consider using SQL directly instead of Admin API for test users

