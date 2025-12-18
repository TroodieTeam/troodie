# Testing Guide: Add Restaurant with Google Maps Images

This guide helps verify that restaurants added through the app properly save Google Maps images to prevent blank/placeholder images.

## Prerequisites

- ✅ `GOOGLE_MAPS_API_KEY` is set in Supabase edge function secrets
- ✅ Edge function `add-restaurant` has been deployed with latest changes
- ✅ App is running and connected to Supabase

## Implementation Summary

The system now has **three layers of image fallback**:

1. **Primary**: Google Places API photos from `placeDetails.photos` array (processed server-side)
2. **Fallback**: Pre-built photo URL sent from frontend (`image` field)
3. **Final Fallback**: Placeholder image (via `restaurantService.getRestaurantImage()`)

## Testing Steps

### Step 1: Add a Restaurant via App

1. Open the app
2. Navigate to the "Add Restaurant" flow (usually accessible from the Add tab or Create Post screen)
3. Search for a well-known restaurant that should have Google Maps photos:
   - Examples: "Starbucks", "McDonald's", "Olive Garden", "Chipotle"
   - Use a specific location (e.g., "Starbucks Charlotte")
4. Select the restaurant from the Google Places autocomplete results
5. Verify the restaurant details are displayed correctly
6. Click "Add Restaurant" or "Submit"

### Step 2: Check Edge Function Logs

1. Go to Supabase Dashboard → Edge Functions → `add-restaurant`
2. Click on "Logs" tab
3. Look for the most recent function invocation
4. Verify logs show:
   ```
   📍 Processing Google Places data for: [Restaurant Name]
   📸 Fallback image provided: Yes/No
   📷 Processing X photos, API key available: true
   ✅ Normalized X photos
   🖼️ Cover photo: Found
   ```

### Step 3: Verify Database Record

Run this SQL query in Supabase SQL Editor:

```sql
SELECT 
  id,
  name,
  cover_photo_url,
  array_length(photos, 1) as photo_count,
  photos[1] as first_photo,
  data_source,
  created_at
FROM restaurants
WHERE name ILIKE '%starbucks%'  -- Replace with your test restaurant
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- ✅ `cover_photo_url` should be a Google Places photo URL like:
  `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=...`
- ✅ `photo_count` should be > 0
- ✅ `first_photo` should match `cover_photo_url`

### Step 4: Verify Image Display in App

1. Navigate to the restaurant detail page (or wherever restaurants are displayed)
2. Check that:
   - ✅ The cover photo loads successfully (not a placeholder)
   - ✅ No error fallback to Unsplash default image
   - ✅ Image is from Google Maps (URL contains `maps.googleapis.com`)

### Step 5: Test Edge Cases

#### Test Case 1: Restaurant with No Photos
1. Try adding a very new or obscure restaurant
2. Verify it falls back to placeholder gracefully (no errors)

#### Test Case 2: API Key Missing (Should Not Happen)
If `GOOGLE_MAPS_API_KEY` is missing:
- Edge function logs should show: `⚠️ Photo reference found but no API key available`
- Frontend fallback image should be used
- Database should still have `cover_photo_url` populated (from frontend)

## Troubleshooting

### Issue: `cover_photo_url` is NULL

**Possible Causes:**
1. Google Places API didn't return photos for this restaurant
2. API key not available in edge function environment
3. Photo references failed to convert to URLs

**Check:**
- Edge function logs for photo processing messages
- Verify `GOOGLE_MAPS_API_KEY` secret exists: `supabase secrets list`
- Check if `placeDetails.photos` array exists in logs

**Solution:**
- If API key missing: `supabase secrets set GOOGLE_MAPS_API_KEY=your_key`
- Redeploy function: `supabase functions deploy add-restaurant`

### Issue: Images Load but Show 403 Error

**Possible Causes:**
1. Google API key restrictions (HTTP referrer restrictions)
2. API key doesn't have Places API enabled
3. Photo reference expired

**Check:**
- Google Cloud Console → APIs & Services → Credentials
- Verify Places API is enabled
- Check API key restrictions

**Solution:**
- Remove HTTP referrer restrictions for edge function domain
- Or add Supabase edge function domain to allowed referrers

### Issue: Images Show Placeholder Instead

**Possible Causes:**
1. `cover_photo_url` is NULL in database
2. Image URL failed to load (network error)
3. `GooglePhoto` component error handling triggered

**Check:**
- Database record (see Step 3)
- Browser/React Native network logs
- `GooglePhoto` component error state

**Solution:**
- Verify database has `cover_photo_url` populated
- Check image URL is accessible (try opening in browser)
- Review `GooglePhoto` component error handling

## Code Flow Reference

### Frontend (`AddRestaurantModal.tsx`)
```typescript
// Line 139-144: Build photo URL from Google Places
if (placeDetails.photos && placeDetails.photos.length > 0) {
  const photoReference = placeDetails.photos[0].photo_reference;
  photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${GOOGLE_API_KEY}`;
}

// Line 149-157: Send to edge function
supabase.functions.invoke('add-restaurant', {
  body: {
    restaurantName: placeDetails.name,
    address: placeDetails.formatted_address,
    placeId: placeDetails.place_id,
    placeDetails: placeDetails,  // Includes photos array
    image: photoUrl,  // Fallback image
  },
});
```

### Edge Function (`add-restaurant/index.ts`)
```typescript
// Line 488: Extract image from request
const { restaurantName, address, placeId, placeDetails, image } = await req.json();

// Line 546: Process with fallback
processedRestaurant = processGooglePlacesData(placeDetails, {
  restaurantName,
  address,
  placeId
}, image);  // Pass fallback image

// Line 374-391: normalizePhotos() converts photo_reference to URLs
// Line 392-395: getCoverPhoto() gets first photo
// Line 463: Uses fallback if getCoverPhoto() returns null
```

### Display (`restaurantService.ts`)
```typescript
// Line 90-120: getRestaurantImage() fallback chain
1. cover_photo_url (primary)
2. photos[0] (secondary)
3. getRestaurantPlaceholder(name) (tertiary)
```

## Quick Verification Query

Run this to check recent restaurant additions:

```sql
SELECT 
  name,
  created_at,
  cover_photo_url IS NOT NULL as has_cover_photo,
  CASE 
    WHEN cover_photo_url LIKE '%maps.googleapis.com%' THEN 'Google Maps'
    WHEN cover_photo_url LIKE '%placeholder%' THEN 'Placeholder'
    WHEN cover_photo_url IS NULL THEN 'NULL'
    ELSE 'Other'
  END as image_source,
  array_length(photos, 1) as photo_count,
  data_source
FROM restaurants
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;
```

## Success Criteria

✅ Restaurant added successfully  
✅ `cover_photo_url` populated in database  
✅ Image URL is from Google Maps (`maps.googleapis.com`)  
✅ Image displays correctly in app (not placeholder)  
✅ No errors in edge function logs  
✅ No errors in app console/logs  

## Next Steps After Testing

If all tests pass:
- ✅ Mark feature as complete
- ✅ Document any edge cases discovered
- ✅ Update user-facing documentation if needed

If issues found:
- ✅ Check edge function logs for specific errors
- ✅ Verify API key configuration
- ✅ Test with different restaurants to isolate issue
- ✅ Review code changes for any bugs
