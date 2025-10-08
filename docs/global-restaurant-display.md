# Global Restaurant Display Update

## Changes Made

Updated the app to display restaurants from all locations, not just Charlotte.

### 1. Restaurant Service Updates (`/services/restaurantService.ts`)

#### New Method Added
```typescript
async getAllRestaurants(limit: number = 50): Promise<Restaurant[]>
```
- Fetches restaurants from all locations
- Orders by Google rating (highest first)
- Configurable limit parameter

### 2. Explore Page Updates (`/app/(tabs)/explore.tsx`)

#### Changed Restaurant Loading
- **Before**: `restaurantService.getRestaurantsByCity('Charlotte', 50)`
- **After**: `restaurantService.getAllRestaurants(100)`
- Increased limit to 100 to show more restaurants
- Added state and address to search filters

### 3. Save Restaurant Screen Updates (`/app/add/save-restaurant.tsx`)

#### Updated Restaurant Loading
- **Before**: `getRestaurantsByCity('Charlotte', 100)`
- **After**: `getAllRestaurants(200)`
- Increased limit to 200 for better search results

#### Removed City Filter from Search
- **Before**: Search was filtered to Charlotte
- **After**: Searches all restaurants globally

#### Updated Placeholder Text
- **Before**: "Search Charlotte restaurants..."
- **After**: "Search restaurants..."

### 4. User Experience Improvements

Users can now:
- See restaurants from all locations on the Explore page
- Search for any restaurant globally when saving
- Add and discover restaurants from anywhere in the world

### 5. Performance Considerations

- Increased limits to ensure good coverage
- Maintains existing caching and retry logic
- Still uses randomization on Explore page for variety

### Testing

1. Go to Explore tab - should see restaurants from various cities
2. Try searching for restaurants from different locations
3. Verify newly added restaurants appear in explore and search
4. Check that filtering by city/state/address works correctly