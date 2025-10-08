# Restaurant Submission Error Fix

## Issue
The restaurant submission was failing with "Failed to add restaurant" error due to authentication and configuration issues.

## Root Causes
1. The direct fetch request to the edge function wasn't properly configured
2. The Supabase anon key wasn't accessible from the environment
3. Authentication headers weren't being passed correctly

## Solution Implemented
Changed from using direct fetch to Supabase's built-in `functions.invoke` method:

```typescript
// Before (problematic):
const response = await fetch('https://cacrjcekanesymdzpjtt.supabase.co/functions/v1/add-restaurant', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'apikey': supabaseAnonKey,
  },
  // ...
});

// After (working):
const { data, error } = await supabase.functions.invoke('add-restaurant', {
  body: {
    restaurantName: placeDetails.name,
    address: placeDetails.formatted_address,
    placeId: placeDetails.place_id,
    placeDetails: placeDetails,
  },
});
```

## Benefits of This Approach
1. **Automatic Authentication**: Supabase client handles auth tokens automatically
2. **Proper Configuration**: Uses the existing Supabase client configuration
3. **Better Error Handling**: Consistent error format from Supabase
4. **Simpler Code**: No need to manually manage headers and API keys

## Additional Improvements
1. Added better error logging for debugging
2. Improved error messages for users
3. Updated app.json to include Supabase configuration in the extra field

## Testing
After these changes, the restaurant submission should work properly:
1. Search for a restaurant using Google Places
2. Select the restaurant
3. Submit - should see success message
4. Check for proper duplicate detection
5. Verify the restaurant appears in searches

## Configuration Requirements
Ensure your `.env` file has:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_PLACES_API_KEY=your_google_places_api_key
```