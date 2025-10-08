# Edge Function Deployment Fix

## Issue Fixed
The edge function was failing with:
```
worker boot error: Uncaught SyntaxError: The requested module 'https://esm.sh/apify-client@2' does not provide an export named 'ApifyClient'
```

## Solution
Changed the import from named export to default export:
```typescript
// Before (incorrect):
import { ApifyClient } from 'https://esm.sh/apify-client@2';

// After (correct):
import ApifyClient from 'https://esm.sh/apify-client@2.9.0';
```

## Key Changes Made

1. **Fixed ApifyClient Import**: The apify-client module exports as default, not as a named export
2. **Updated Edge Function**: Now includes full production code with proper error handling
3. **Charlotte Validation**: Added client-side validation to prevent non-Charlotte restaurants
4. **Fallback Logic**: If Google Places data is available, it uses that; otherwise falls back to Apify or basic data

## Deployment Steps

1. Deploy the updated edge function:
```bash
supabase functions deploy add-restaurant
```

2. Ensure environment variables are set in Supabase dashboard:
   - `APIFY_API_TOKEN` (optional, for enhanced data)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Testing Instructions

1. Try adding a Charlotte restaurant:
   - Should validate location
   - Should check for duplicates
   - Should add successfully

2. Try adding a non-Charlotte restaurant:
   - Should show error: "Sorry, we only accept restaurants in the Charlotte, NC area."

3. Check console logs for debugging info

## Notes

- The edge function now handles three data sources:
  1. Google Places data (if provided from client)
  2. Apify scraping (if API token available)
  3. Basic data (fallback)

- All Charlotte validation happens both client-side and server-side
- Duplicate checking uses both Google Place ID and name/address matching