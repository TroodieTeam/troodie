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

## Step 2: Check How Many Restaurants Need Backfill

Run this SQL query in Supabase SQL Editor:

```sql
SELECT COUNT(*) as restaurants_needing_images
FROM restaurants
WHERE google_place_id IS NOT NULL
  AND google_place_id != ''
  AND (
    cover_photo_url IS NULL 
    OR cover_photo_url = ''
    OR cover_photo_url LIKE '%placeholder%'
    OR cover_photo_url LIKE '%default%'
  );
```

## Step 3: Run Backfill Script

### Option A: Run via Node.js Script

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

### Option B: Create Edge Function (Recommended for Production)

Create a Supabase Edge Function that can be triggered on-demand:

```typescript
// supabase/functions/backfill-restaurant-images/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // Implementation similar to the script
  // Can be triggered via HTTP request or scheduled
});
```

## Step 4: Monitor Progress

Check the progress by querying:

```sql
-- Count remaining restaurants needing images
SELECT COUNT(*) as remaining
FROM restaurants
WHERE google_place_id IS NOT NULL
  AND google_place_id != ''
  AND (
    cover_photo_url IS NULL 
    OR cover_photo_url = ''
    OR cover_photo_url LIKE '%placeholder%'
    OR cover_photo_url LIKE '%default%'
  );

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
