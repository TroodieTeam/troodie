# Production Backfill Guide: Restaurant Images

Complete step-by-step guide to backfill restaurant images in production.

## Prerequisites

- ✅ Access to Supabase production project
- ✅ `GOOGLE_MAPS_API_KEY` configured in Supabase secrets
- ✅ Supabase CLI configured for production
- ✅ Verified the backfill works in dev/staging

## Step 1: Apply Database Migration

Run the SQL migration to create the helper functions:

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/20251218_backfill_restaurant_images.sql`
3. Paste and execute in SQL Editor

**Option B: Via Supabase CLI**
```bash
# Make sure you're connected to production
supabase link --project-ref <your-production-project-ref>

# Apply the migration
supabase db push
```

**Verify the functions exist:**
```sql
SELECT proname 
FROM pg_proc 
WHERE proname IN ('backfill_restaurant_images', 'update_restaurant_images');
```

Expected output: Both function names should appear.

## Step 2: Deploy Edge Function

Deploy the backfill edge function to production:

```bash
# Make sure you're linked to production
supabase link --project-ref <your-production-project-ref>

# Deploy the function
supabase functions deploy backfill-restaurant-images

# Verify deployment
supabase functions list
```

**Verify function is deployed:**
- Go to Supabase Dashboard → Edge Functions
- Confirm `backfill-restaurant-images` appears in the list

## Step 3: Verify Configuration

Ensure required secrets are set:

```bash
# Check secrets (won't show values, just names)
supabase secrets list
```

Required secrets:
- ✅ `GOOGLE_MAPS_API_KEY` (or `GOOGLE_API_KEY`)
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

If missing, add them:
```bash
supabase secrets set GOOGLE_MAPS_API_KEY=your_key_here
```

## Step 4: Check Total Restaurants to Process

Run this query in Supabase SQL Editor:

```sql
SELECT COUNT(*) as total_restaurants_with_place_id
FROM restaurants
WHERE google_place_id IS NOT NULL
  AND google_place_id != ''
  AND google_place_id != 'null';
```

This tells you how many restaurants will be processed.

## Step 5: Test with Small Batch (Dry Run)

**First, test with dry run to verify everything works:**

```bash
curl -X POST https://<your-project-ref>.supabase.co/functions/v1/backfill-restaurant-images \
  -H "Authorization: Bearer <your-anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_size": 5,
    "dry_run": true
  }'
```

Or use Supabase Dashboard:
1. Go to Edge Functions → `backfill-restaurant-images`
2. Click "Invoke function"
3. Body:
   ```json
   {
     "batch_size": 5,
     "dry_run": true
   }
   ```

**Expected:** Should return success with 5 restaurants listed but no actual updates.

## Step 6: Process Restaurants in Batches

Process restaurants in batches of 100 (recommended for production):

### Batch 1 (Restaurants 1-100)
```json
{
  "batch_size": 100,
  "offset": 0
}
```

### Batch 2 (Restaurants 101-200)
```json
{
  "batch_size": 100,
  "offset": 100
}
```

### Batch 3 (Restaurants 201-300)
```json
{
  "batch_size": 100,
  "offset": 200
}
```

### Batch 4 (Restaurants 301-400)
```json
{
  "batch_size": 100,
  "offset": 300
}
```

### Batch 5 (Restaurants 401-500)
```json
{
  "batch_size": 100,
  "offset": 400
}
```

**Continue with increments of 100 until all restaurants are processed.**

## Step 7: Monitor Progress

After each batch, check progress:

```sql
-- Count restaurants that have been synced
SELECT 
  COUNT(*) as total,
  COUNT(last_google_sync) FILTER (WHERE last_google_sync IS NOT NULL) as synced,
  COUNT(*) FILTER (WHERE last_google_sync IS NULL) as remaining
FROM restaurants
WHERE google_place_id IS NOT NULL
  AND google_place_id != ''
  AND google_place_id != 'null';

-- Check recent updates
SELECT 
  name,
  cover_photo_url IS NOT NULL as has_image,
  array_length(photos, 1) as photo_count,
  last_google_sync
FROM restaurants
WHERE last_google_sync > NOW() - INTERVAL '1 hour'
ORDER BY last_google_sync DESC
LIMIT 20;
```

## Step 8: Handle Errors and Retries

If a batch fails or times out:

1. **Check function logs:**
   - Supabase Dashboard → Edge Functions → `backfill-restaurant-images` → Logs
   - Look for error messages

2. **Retry failed batch:**
   - Use the same `offset` value
   - The function will re-process those restaurants (safe to re-run)

3. **If API rate limits hit:**
   - Wait a few minutes
   - Reduce `batch_size` to 50
   - Continue with smaller batches

## Step 9: Verify Results

After processing, verify images are displaying:

```sql
-- Check image coverage
SELECT 
  COUNT(*) as total,
  COUNT(cover_photo_url) FILTER (WHERE cover_photo_url IS NOT NULL AND cover_photo_url != '') as with_images,
  COUNT(*) FILTER (WHERE cover_photo_url IS NULL OR cover_photo_url = '') as without_images,
  ROUND(100.0 * COUNT(cover_photo_url) FILTER (WHERE cover_photo_url IS NOT NULL AND cover_photo_url != '') / COUNT(*), 2) as coverage_percent
FROM restaurants
WHERE google_place_id IS NOT NULL
  AND google_place_id != '';
```

**Expected:** Coverage should be 80-95% (some restaurants legitimately don't have photos in Google Places).

## Step 10: Test in App

Verify images display correctly:
1. Open the app
2. Navigate to restaurants that were backfilled
3. Verify images load (not placeholders)
4. Check activity feed shows restaurant images

## Troubleshooting

### Function Times Out
- **Solution:** Reduce `batch_size` to 50 or 25

### API Rate Limits
- **Solution:** Increase delay in function (currently 100ms) or reduce batch size
- **Check:** Google Cloud Console → APIs & Services → Quotas

### No Photos Found for Many Restaurants
- **Normal:** Some restaurants don't have photos in Google Places
- **Check:** Verify `google_place_id` values are valid

### Images Not Displaying in App
- **Check:** Verify `cover_photo_url` contains full Google Maps URLs
- **Check:** Verify `GooglePhoto` component handles full URLs correctly
- **Check:** Browser/network console for image load errors

## Cost Estimate

For 1,000 restaurants:
- **Google Places API Details:** ~$17 (1,000 requests)
- **Google Places Photo API:** ~$7 (1,000 requests)
- **Total:** ~$24 per 1,000 restaurants

## Post-Deployment

After backfill completes:
1. ✅ All restaurants with `google_place_id` have images
2. ✅ New restaurants added via app automatically get images
3. ✅ Consider scheduling periodic sync for restaurants missing images

## Quick Reference: Request Bodies

**Small test batch:**
```json
{ "batch_size": 10, "offset": 0 }
```

**Production batch (recommended):**
```json
{ "batch_size": 100, "offset": 0 }
```

**Continue processing:**
```json
{ "batch_size": 100, "offset": 100 }
```

**Dry run (test without updating):**
```json
{ "batch_size": 10, "dry_run": true }
```
