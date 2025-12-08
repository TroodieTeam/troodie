# Migration Automation Improvements

## Problem

The migration process had too much back-and-forth when encountering duplicate key errors on the `schema_migrations` table. Users had to manually confirm each time a migration was already tracked.

## Solution

### 1. Improved Error Detection

The script now properly captures and detects duplicate key errors from multiple sources:
- `error.message`
- `error.stdout`
- `error.stderr`
- Combined error output

### 2. Auto-Continue Flag

Added `--auto-continue-duplicate-key` flag to automatically handle duplicate key errors:

```bash
npm run prod:migrate:cm -- --project-ref=xxx --auto-continue-duplicate-key
```

When this flag is used:
- Duplicate key errors are automatically treated as "migration already applied"
- Script continues with remaining migrations automatically
- No manual confirmation needed

### 3. Better Error Messages

The script now:
- Extracts migration version from error messages
- Provides clear guidance on what happened
- Suggests using the auto-continue flag

## Usage

### Standard Mode (with prompts)
```bash
npm run prod:migrate:cm -- --project-ref=your-project-ref
```

When duplicate key error occurs:
- Script detects it
- Asks: "Is the migration already applied and tracked?"
- If yes: Continues automatically
- If no: Provides resolution steps

### Auto-Continue Mode (no prompts)
```bash
npm run prod:migrate:cm -- --project-ref=your-project-ref --auto-continue-duplicate-key
```

When duplicate key error occurs:
- Script detects it
- Automatically treats as "already applied"
- Continues with remaining migrations
- No prompts needed

## How It Works

1. **Error Detection**: Script checks for:
   - "duplicate key" in error message
   - "23505" (PostgreSQL error code)
   - "schema_migrations" table reference
   - "version" column reference

2. **Version Extraction**: Extracts migration version (e.g., "006") from error message

3. **Auto-Handling**: If `--auto-continue-duplicate-key` flag is set:
   - Treats duplicate key as success
   - Continues with `supabase db push --linked` (without --include-all)
   - Handles multiple duplicate key errors recursively

4. **Fallback**: If remaining migrations also have duplicate keys:
   - Treats as success (migrations already applied)
   - Completes successfully

## Benefits

✅ **Less Back-and-Forth**: Auto-continue flag eliminates manual confirmations  
✅ **Better Error Detection**: Catches errors from all sources (stdout, stderr, message)  
✅ **Smarter Recovery**: Automatically continues with remaining migrations  
✅ **Clear Guidance**: Provides helpful messages and suggestions  

## When to Use Auto-Continue

Use `--auto-continue-duplicate-key` when:
- ✅ You're confident migrations were already applied
- ✅ You're re-running migrations after a partial failure
- ✅ You want a fully automated migration process
- ✅ You've verified migrations exist in Supabase Dashboard

Don't use it when:
- ❌ You're unsure if migrations were applied
- ❌ You want to review each conflict manually
- ❌ This is your first time running migrations

## Troubleshooting

If auto-continue doesn't work:

1. **Check Migration Status**:
   ```bash
   supabase migration list --linked
   ```

2. **Verify in Dashboard**:
   - Go to Supabase Dashboard → Database → Migrations
   - Check which migrations are listed

3. **Manual Resolution**:
   - If migration is listed: Safe to continue
   - If migration is not listed: May need manual application

4. **Run Without Auto-Continue**:
   ```bash
   npm run prod:migrate:cm -- --project-ref=xxx
   ```
   Then manually confirm each duplicate key error
