# Backfill Restaurant Images from Google Places API

This guide explains how to update existing restaurants in the database that are missing images by fetching them from Google Places API.

## Overview

The backfill process:
1. Finds restaurants with `google_place_id` but missing `cover_photo_url`
2. Fetches photos from Google Places API using the place ID
3. Updates the restaurant records with the fetched photos

## Prerequisites

- ✅ `GOOGLE_MAPS_API_KEY` configured in environment
- ✅ `SUPABASE_SERVICE_ROLE_KEY` configured in environment
- ✅ Migration `20251218_backfill_restaurant_images.sql` has been applied

## Step 1: Apply Migration

Run the migration to create the helper functions:

```bash
supabase db push
```

Or manually run the SQL in `supabase/migrations/20251218_backfill_restaurant_images.sql`

## Step 2: Check How Many Restaurants Have google_place_id

Run this SQL query in Supabase SQL Editor:

```sql
-- Count all restaurants with google_place_id (these will all be processed)
SELECT COUNT(*) as total_restaurants_with_place_id
FROM restaurants
WHERE google_place_id IS NOT NULL
  AND google_place_id != ''
  AND google_place_id != 'null';

-- Check current image status
SELECT 
  COUNT(*) as total,
  COUNT(cover_photo_url) FILTER (WHERE cover_photo_url IS NOT NULL AND cover_photo_url != '') as with_images,
  COUNT(*) FILTER (WHERE cover_photo_url IS NULL OR cover_photo_url = '') as without_images
FROM restaurants
WHERE google_place_id IS NOT NULL
  AND google_place_id != ''
  AND google_place_id != 'null';
```

## Step 3: Run Backfill

### Option A: Use Edge Function (Recommended)

```bash
# Install dependencies if needed
npm install

# Run with default settings (50 per batch, unlimited max)
npx tsx scripts/backfill-restaurant-images.ts

# Run with custom batch size
npx tsx scripts/backfill-restaurant-images.ts --batch-size=100

# Run with max limit (useful for testing)
npx tsx scripts/backfill-restaurant-images.ts --batch-size=50 --max=500
```

### Option B: Use Edge Function (Recommended for Production)

The edge function is already created at `supabase/functions/backfill-restaurant-images/index.ts`.

**Deploy the function:**
```bash
supabase functions deploy backfill-restaurant-images
```

**Trigger via HTTP request:**

```bash
# Basic request (processes 50 restaurants)
curl -X POST https://<your-project-ref>.supabase.co/functions/v1/backfill-restaurant-images \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{}'

# With custom parameters
curl -X POST https://<your-project-ref>.supabase.co/functions/v1/backfill-restaurant-images \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_size": 100,
    "max_restaurants": 500,
    "offset": 0,
    "dry_run": false
  }'

# Dry run (test without updating)
curl -X POST https://<your-project-ref>.supabase.co/functions/v1/backfill-restaurant-images \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true, "batch_size": 10}'
```

**Or use Supabase Dashboard:**
1. Go to Edge Functions → `backfill-restaurant-images`
2. Click "Invoke function"
3. Add JSON body with parameters:
   ```json
   {
     "batch_size": 50,
     "max_restaurants": 1000,
     "offset": 0,
     "dry_run": false
   }
   ```

**Parameters:**
- `batch_size` (default: 50) - Number of restaurants to process per request
- `max_restaurants` (default: null) - Maximum total restaurants to process
- `offset` (default: 0) - Starting offset for pagination
- `dry_run` (default: false) - If true, fetches data but doesn't update database

## Step 4: Monitor Progress

Check the progress by querying:

```sql
-- Count restaurants that have been synced recently
SELECT COUNT(*) as recently_synced
FROM restaurants
WHERE google_place_id IS NOT NULL
  AND last_google_sync > NOW() - INTERVAL '1 hour';

-- Check overall sync status
SELECT 
  COUNT(*) as total,
  COUNT(last_google_sync) FILTER (WHERE last_google_sync IS NOT NULL) as synced,
  COUNT(*) FILTER (WHERE last_google_sync IS NULL) as not_synced
FROM restaurants
WHERE google_place_id IS NOT NULL
  AND google_place_id != '';

-- Check recently updated restaurants
SELECT 
  name,
  cover_photo_url IS NOT NULL as has_cover_photo,
  array_length(photos, 1) as photo_count,
  last_google_sync
FROM restaurants
WHERE last_google_sync > NOW() - INTERVAL '1 hour'
ORDER BY last_google_sync DESC
LIMIT 20;
```

## Rate Limiting

The script includes a 100ms delay between requests to avoid hitting Google Places API rate limits:
- **Places API Details**: $17 per 1,000 requests
- **Photo API**: $7 per 1,000 requests

For 1,000 restaurants:
- Cost: ~$24 (details + photos)
- Time: ~2 minutes (with 100ms delay)

## Troubleshooting

### No Photos Found

Some restaurants may not have photos in Google Places. These will be skipped. You can identify them:

```sql
SELECT id, name, google_place_id
FROM restaurants
WHERE google_place_id IS NOT NULL
  AND cover_photo_url IS NULL
  AND last_google_sync IS NOT NULL;
```

### API Errors

If you encounter API errors:
1. Check your `GOOGLE_MAPS_API_KEY` is valid
2. Verify Places API and Places Photo API are enabled in Google Cloud Console
3. Check API quota limits
4. Increase delay between requests if hitting rate limits

### Partial Updates

If the script stops mid-way:
- It's safe to re-run - it will skip already-updated restaurants
- Or use `--max` to limit how many to process per run

## Alternative: One-Time SQL Update (Not Recommended)

If you have a small number of restaurants, you could manually update them, but this requires:
1. Fetching photos via Google Places API for each restaurant
2. Updating each record individually

The script approach is recommended as it handles:
- Rate limiting
- Error handling
- Progress tracking
- Batch processing

## Next Steps

After backfilling:
1. Verify images display correctly in the app
2. Monitor for new restaurants added without images
3. Consider adding a scheduled job to periodically sync images for restaurants missing them
