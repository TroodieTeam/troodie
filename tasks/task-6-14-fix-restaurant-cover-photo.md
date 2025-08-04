# Task 6.14: Fix Restaurant Detail Screen to Use Cover Photos

## Overview
Fix the restaurant detail screen and related components to properly leverage the `cover_photo_url` field instead of using stock images or the first photo in the photos array. This includes updating the restaurant details screen, restaurant cards, and other components that display restaurant images to use the designated cover photo.

## Business Value
- **Better Visual Experience**: Users see actual restaurant photos instead of generic stock images
- **Improved Data Quality**: Proper use of cover photos ensures consistent, high-quality restaurant imagery
- **Enhanced User Trust**: Real photos build credibility and help users make informed decisions
- **Professional Appearance**: Consistent use of cover photos creates a more polished app experience
- **Better Restaurant Representation**: Each restaurant is properly represented with its actual imagery

## Dependencies
- Task 2.1 (Charlotte Restaurant Seeding) - for restaurant data structure
- Task 2.2 (Restaurant Search & Discovery) - for search functionality
- Existing database schema with `cover_photo_url` field

## Blocks
- Future restaurant detail improvements
- Enhanced restaurant discovery experience
- Better restaurant representation across the app

## Acceptance Criteria

### Gherkin Scenarios

**Scenario: Restaurant Detail Screen Shows Cover Photo**
```
Given I am viewing a restaurant detail screen
When the screen loads
Then I should see the restaurant's cover photo
And the photo should be the designated cover_photo_url
And not a stock image or first photo from the array
```

**Scenario: Restaurant Cards Display Cover Photos**
```
Given I am browsing restaurant cards
When I view restaurant listings
Then each restaurant should display its cover photo
And the photos should be consistent across all screens
And no stock images should be shown for restaurants with photos
```

**Scenario: Fallback to Stock Image Only When No Cover Photo**
```
Given a restaurant has no cover photo
When I view the restaurant details
Then a stock image should be shown as fallback
And the fallback should be clearly indicated
And the system should attempt to fetch a cover photo
```

**Scenario: Cover Photo Updates Across All Screens**
```
Given a restaurant's cover photo is updated
When I navigate between different screens
Then the updated cover photo should be displayed consistently
And the change should be reflected immediately
And no caching issues should occur
```

**Scenario: Photo Loading States**
```
Given I am loading restaurant data
When the cover photo is being fetched
Then a proper loading state should be shown
And the loading state should be appropriate for the context
And error states should be handled gracefully
```

**Scenario: Photo Quality and Performance**
```
Given restaurant cover photos are being displayed
When the photos load
Then they should be optimized for the display context
And loading should be fast and efficient
And memory usage should be reasonable
```

## Technical Implementation

### Files to Modify

#### 1. Restaurant Detail Screen (`app/add/restaurant-details.tsx`)
- **Image Source**: Update to use `cover_photo_url` with fallback logic
- **Loading States**: Add proper loading indicators for photo fetching
- **Error Handling**: Implement graceful error handling for missing photos

#### 2. Restaurant Cards and Components
- **`components/cards/RestaurantCard.tsx`** - Update image source logic
- **`components/cards/RestaurantCardWithSave.tsx`** - Update image source logic
- **`app/boards/[id].tsx`** - Update restaurant list image display
- **`app/add/board-assignment.tsx`** - Update restaurant selection images

#### 3. Restaurant Service Updates
- **`services/restaurantService.ts`** - Add cover photo handling logic
- **`services/postService.ts`** - Update restaurant transformation

#### 4. Search and Discovery Screens
- **`app/add/save-restaurant.tsx`** - Update search result images
- **`app/(tabs)/explore.tsx`** - Update restaurant item images
- **`app/add/create-post.tsx`** - Update restaurant selection modal

### Cover Photo Logic Implementation

#### 1. Primary Cover Photo Logic
```typescript
// Use cover_photo_url as primary, fallback to photos[0], then stock image
const getRestaurantImage = (restaurant: any): string => {
  if (restaurant.cover_photo_url) {
    return restaurant.cover_photo_url;
  }
  
  if (restaurant.photos && restaurant.photos.length > 0) {
    // Handle both string array and object array formats
    const firstPhoto = Array.isArray(restaurant.photos) 
      ? restaurant.photos[0] 
      : restaurant.photos[0]?.url;
    
    if (firstPhoto) {
      return firstPhoto;
    }
  }
  
  // Fallback to stock image
  return 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800';
};
```

#### 2. Restaurant Service Enhancement
```typescript
// Update restaurantService to handle cover photos
export const restaurantService = {
  // Enhanced transformation with cover photo logic
  transformRestaurantData(restaurant: any): RestaurantInfo {
    return {
      id: restaurant.id,
      name: restaurant.name,
      image: this.getRestaurantImage(restaurant),
      cuisine: restaurant.cuisine_types?.[0] || 'Restaurant',
      rating: restaurant.troodie_rating || restaurant.google_rating || 0,
      location: restaurant.address || `${restaurant.city}, ${restaurant.state}` || 'Location',
      priceRange: restaurant.price_range || '$$',
    };
  },

  // Dedicated method for getting restaurant image
  getRestaurantImage(restaurant: any): string {
    if (restaurant.cover_photo_url) {
      return restaurant.cover_photo_url;
    }
    
    if (restaurant.photos && restaurant.photos.length > 0) {
      const firstPhoto = Array.isArray(restaurant.photos) 
        ? restaurant.photos[0] 
        : restaurant.photos[0]?.url;
      
      if (firstPhoto) {
        return firstPhoto;
      }
    }
    
    return 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800';
  }
};
```

#### 3. Restaurant Detail Screen Update
```typescript
// Update restaurant details screen to use cover photo
const renderRestaurantInfo = () => (
  <View style={styles.restaurantInfo}>
    <Image 
      source={{ 
        uri: restaurantService.getRestaurantImage(restaurant) 
      }} 
      style={styles.restaurantImage} 
    />
    <View style={styles.restaurantDetails}>
      <Text style={styles.restaurantName}>{restaurant.name}</Text>
      <Text style={styles.restaurantAddress}>{restaurant.address}</Text>
      <Text style={styles.restaurantCuisine}>
        {restaurant.cuisine.join(' • ')}
      </Text>
    </View>
  </View>
);
```

### Database Schema Considerations

#### 1. Cover Photo Field Usage
- **Primary**: Use `cover_photo_url` as the main photo source
- **Fallback**: Use first photo from `photos` array if cover photo not available
- **Default**: Use stock image only when no photos are available

#### 2. Photo Data Structure
```typescript
// Handle both string arrays and object arrays
interface RestaurantPhoto {
  url: string;
  source?: 'google' | 'user' | 'stock';
  attribution?: string;
}

// Support both formats
photos: string[] | RestaurantPhoto[];
cover_photo_url: string | null;
```

### Performance Optimizations

#### 1. Image Caching
```typescript
// Implement proper image caching
import { Image } from 'react-native';

// Use FastImage for better performance
import FastImage from 'react-native-fast-image';

const RestaurantImage = ({ restaurant, style }) => (
  <FastImage
    source={{ 
      uri: restaurantService.getRestaurantImage(restaurant),
      priority: FastImage.priority.normal,
    }}
    style={style}
    resizeMode={FastImage.resizeMode.cover}
  />
);
```

#### 2. Loading States
```typescript
// Add loading states for images
const [imageLoading, setImageLoading] = useState(true);
const [imageError, setImageError] = useState(false);

const handleImageLoad = () => setImageLoading(false);
const handleImageError = () => {
  setImageLoading(false);
  setImageError(true);
};
```

### Error Handling

#### 1. Graceful Fallbacks
```typescript
// Implement comprehensive fallback logic
const getImageWithFallback = (restaurant: any): string => {
  try {
    // Try cover photo first
    if (restaurant.cover_photo_url) {
      return restaurant.cover_photo_url;
    }
    
    // Try photos array
    if (restaurant.photos && restaurant.photos.length > 0) {
      const firstPhoto = Array.isArray(restaurant.photos) 
        ? restaurant.photos[0] 
        : restaurant.photos[0]?.url;
      
      if (firstPhoto && firstPhoto !== '') {
        return firstPhoto;
      }
    }
    
    // Return stock image
    return 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800';
  } catch (error) {
    console.error('Error getting restaurant image:', error);
    return 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800';
  }
};
```

#### 2. Error States
```typescript
// Handle image loading errors
const RestaurantImageWithErrorHandling = ({ restaurant, style }) => {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) {
    return (
      <View style={[style, { backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#999', fontSize: 12 }}>No Image</Text>
      </View>
    );
  }
  
  return (
    <Image
      source={{ uri: restaurantService.getRestaurantImage(restaurant) }}
      style={style}
      onError={() => setHasError(true)}
    />
  );
};
```

## Definition of Done

### Functional Requirements
- [ ] Restaurant detail screen uses cover_photo_url as primary image source
- [ ] All restaurant cards display cover photos consistently
- [ ] Fallback logic works properly when cover photo is not available
- [ ] Loading states are implemented for image fetching
- [ ] Error handling works gracefully for missing or broken images

### Technical Implementation
- [ ] Restaurant service has proper cover photo logic
- [ ] All components use the centralized image logic
- [ ] Performance optimizations are implemented
- [ ] Image caching is properly configured
- [ ] No console errors related to image loading

### Data Quality
- [ ] Cover photos are properly prioritized over other photos
- [ ] Stock images are only used when no photos are available
- [ ] Photo data structure is handled correctly
- [ ] Database queries include cover_photo_url field

### User Experience
- [ ] Images load quickly and efficiently
- [ ] Loading states provide good user feedback
- [ ] Error states are informative and not jarring
- [ ] Image quality is appropriate for display context

### Testing
- [ ] All acceptance criteria scenarios pass
- [ ] Different photo data structures are handled correctly
- [ ] Performance is acceptable on various devices
- [ ] Error scenarios are properly handled

## Resources

### Database Schema
- `supabase/migrations/` - Database schema with cover_photo_url field
- `lib/supabase.ts` - TypeScript types for restaurant data

### Related Components
- `components/cards/RestaurantCard.tsx` - Restaurant card component
- `components/cards/RestaurantCardWithSave.tsx` - Save-enabled restaurant card
- `services/restaurantService.ts` - Restaurant data transformation

### Photo Management
- `supabase/functions/search-restaurants/` - Google Places photo fetching
- `scripts/seed-restaurants.ts` - Restaurant seeding with photo data

## Notes

### Current Issues Identified
1. **Restaurant Detail Screen**: Uses `restaurant.photos[0]` instead of `cover_photo_url`
2. **Restaurant Cards**: Inconsistent image source logic across components
3. **Fallback Logic**: Poor handling of missing or malformed photo data
4. **Performance**: No image caching or optimization

### Data Structure Considerations
- Some restaurants have `photos` as string arrays
- Some restaurants have `photos` as object arrays with `url` property
- `cover_photo_url` field exists but is not consistently used
- Stock image fallback is overused

### Performance Considerations
- Implement proper image caching to reduce network requests
- Use appropriate image sizes for different contexts
- Implement lazy loading for restaurant lists
- Optimize image compression and formats

### Future Enhancements
- Add photo upload functionality for user-contributed images
- Implement photo moderation and quality control
- Add photo gallery views for restaurants
- Consider implementing photo CDN for better performance

## Priority: High
**Estimate:** 2 days
**Assignee:** TBD
**Status:** 🔴 Not Started 