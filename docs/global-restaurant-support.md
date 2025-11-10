# Global Restaurant Support Update

## Changes Made

The restaurant submission feature has been updated to accept restaurants from anywhere in the world, not just Charlotte, NC.

### 1. Client-Side Changes

#### AddRestaurantModal (`/components/AddRestaurantModal.tsx`)
- Removed Charlotte area validation check
- Users can now submit restaurants from any location

#### Google Places Service (`/services/googlePlacesService.ts`)
- Removed location and radius restrictions
- Now searches globally instead of limiting to Charlotte area
- Removed the hardcoded Charlotte coordinates

### 2. Edge Function Changes (`/supabase/functions/add-restaurant/index.ts`)

#### Validation Updates
- Removed the Charlotte area requirement from `validateRestaurantInput()`
- Now only validates that restaurant name and address are provided

#### Data Processing Improvements
- Added `extractState()` function to parse state from addresses
- Updated `extractCity()` to handle any city, not default to Charlotte
- Modified `processApifyData()` to dynamically extract state instead of hardcoding 'NC'

#### Import Fix
- Fixed ApifyClient import from named to default export
- Added specific version (2.9.0) for stability

### 3. User Experience

Users can now:
- Search for restaurants anywhere in the world
- Add restaurants from any city, state, or country
- See global search results in Google Places autocomplete

### 4. Testing

To test the changes:
1. Try adding a restaurant from New York, California, or any international location
2. Verify the state and city are correctly extracted from the address
3. Confirm duplicate detection still works across all locations

### 5. Deployment

Deploy the updated edge function:
```bash
supabase functions deploy add-restaurant
```

### 6. Notes

- The app now supports global restaurant discovery
- Address parsing intelligently extracts city and state from formatted addresses
- Google Place ID validation remains to ensure data quality
- All other features (duplicate checking, data enrichment, etc.) work globally