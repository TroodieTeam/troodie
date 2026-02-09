# Restaurant Add Issue Triage

## Issue
User reported error: "Unable to add restaurant at this time. Please try again later." when attempting to add "Jay Bee's" restaurant.

## Root Causes Identified

### 1. **Poor Error Logging** (Fixed)
The error handling in `AddRestaurantModal.tsx` was catching errors but not logging enough detail to diagnose the issue. The generic error message was shown for any unhandled error.

**Fix**: Added comprehensive console logging at multiple points:
- Log full error objects with all properties
- Log error name, message, and context
- Log parsed error data from FunctionsHttpError responses
- Log full response data when errors occur

### 2. **Edge Function Query Issue** (Fixed)
The edge function was using `.single()` when checking for existing restaurants, which throws an error if no rows are found. This could cause the function to fail unexpectedly.

**Fix**: Changed to `.maybeSingle()` which returns `null` when no rows are found instead of throwing an error.

**Before**:
```typescript
const { data: existingRestaurant } = await supabase
  .from('restaurants')
  .select('id, name')
  .or(`google_place_id.eq.${placeId},...`)
  .single(); // ❌ Throws error if no rows found
```

**After**:
```typescript
const { data: existingRestaurant, error: checkError } = await supabase
  .from('restaurants')
  .select('id, name')
  .or(`google_place_id.eq.${placeId},...`)
  .maybeSingle(); // ✅ Returns null if no rows found
```

### 3. **Race Condition Handling** (Fixed)
Added better handling for duplicate key errors that might occur due to race conditions (multiple users adding the same restaurant simultaneously).

**Fix**: Added detection for duplicate key errors (code `23505`) and attempt to fetch the existing restaurant instead of failing.

## Error Flow Analysis

1. **User selects restaurant** → `handleSelectPlace()` fetches place details
2. **User clicks "Add Restaurant"** → `handleSubmit()` is called
3. **Edge function invoked** → `supabase.functions.invoke('add-restaurant', ...)`
4. **Edge function checks for existing** → Query with `.single()` could fail here
5. **Edge function inserts restaurant** → Database insert could fail here
6. **Response handling** → Client receives error response
7. **Error display** → Generic error message shown

## Potential Failure Points

1. **Authentication**: User not logged in (should show specific error)
2. **Network**: Connection issues (should show network error)
3. **Edge Function Config**: Missing SUPABASE_URL or SERVICE_ROLE_KEY
4. **Database**: RLS policies blocking insert (unlikely, uses service role)
5. **Duplicate Detection**: Race condition or query failure
6. **Data Validation**: Invalid restaurant data format
7. **Google Places API**: Missing or invalid place details

## Next Steps for Debugging

With the improved logging, when the error occurs again:

1. **Check console logs** in the app for detailed error information
2. **Check edge function logs** in Supabase dashboard:
   - Go to Edge Functions → add-restaurant → Logs
   - Look for error messages, especially around:
     - Supabase configuration check
     - Existing restaurant query
     - Database insertion
     - Verification query

3. **Verify edge function environment variables**:
   - `SUPABASE_URL` should be set
   - `SUPABASE_SERVICE_ROLE_KEY` should be set
   - `GOOGLE_MAPS_API_KEY` (optional, for photo URLs)

4. **Test the edge function directly**:
   ```bash
   curl -X POST https://[your-project].supabase.co/functions/v1/add-restaurant \
     -H "Authorization: Bearer [anon-key]" \
     -H "Content-Type: application/json" \
     -d '{
       "restaurantName": "Jay Bee'\''s",
       "address": "320 Mocksville Hwy, Statesville, NC 28625, USA",
       "placeId": "[place-id]",
       "placeDetails": {...}
     }'
   ```

## Files Modified

1. `components/AddRestaurantModal.tsx`
   - Added comprehensive error logging
   - Improved error message display (shows actual error when available)
   - Better handling of FunctionsHttpError responses

2. `supabase/functions/add-restaurant/index.ts`
   - Fixed `.single()` → `.maybeSingle()` for existing restaurant check
   - Added error handling for check query failures
   - Added race condition handling for duplicate key errors
   - Improved logging throughout

## Testing Recommendations

1. **Test adding a new restaurant** (not in database)
2. **Test adding a duplicate restaurant** (already exists)
3. **Test with invalid place details** (missing geometry)
4. **Test with network issues** (airplane mode)
5. **Test while logged out** (should show auth error)

## Monitoring

After deployment, monitor:
- Edge function logs for any new error patterns
- Console logs in the app for detailed error information
- User reports of the same error (should now have better context)
