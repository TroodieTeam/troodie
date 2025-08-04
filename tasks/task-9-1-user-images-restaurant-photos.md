# Task 9.1: Add User Images to Restaurant Photos Tab When Posting

**Epic**: 9 - UI/UX Improvements and Content Integration  
**Priority**: High  
**Estimate**: 2 days  
**Status**: 🔴 Not Started

## Overview
When a user makes a post with a restaurant attached, automatically add the user's image within the photos tab of that restaurant to build a user-generated content gallery.

## Business Value
- Enriches restaurant profiles with real user-generated content
- Increases engagement and social proof for restaurants
- Creates more dynamic and visual restaurant pages
- Encourages users to post more content knowing it contributes to restaurant profiles

## Dependencies
- Post creation functionality must be working
- Restaurant photos tab must be implemented
- Image upload and storage system must be functional

## Blocks
- N/A

## Acceptance Criteria

```gherkin
Feature: User Images in Restaurant Photos
  As a user
  I want my post images to appear in restaurant photo galleries
  So that I can contribute to the restaurant's visual content

Scenario: User posts with restaurant attachment
  Given I am creating a post with an image
  And I select a restaurant to attach to the post
  When I publish the post
  Then the image should appear in the restaurant's Photos tab
  And the image should be attributed to me as the author

Scenario: Privacy settings respected
  Given I have privacy settings that limit photo sharing
  When I post with a restaurant attachment
  Then only photos I've allowed to be shared should appear in restaurant gallery

Scenario: Image quality optimization
  Given I upload a high-resolution image in my post
  When the image is added to restaurant photos
  Then it should be optimized for mobile viewing
  And maintain good visual quality
```

## Technical Implementation

### Frontend Changes
```typescript
// services/postService.ts
export const createPost = async (postData: CreatePostRequest) => {
  // ... existing post creation logic
  
  // Add image to restaurant photos if restaurant is attached
  if (postData.restaurantId && postData.images?.length > 0) {
    await addUserImagesToRestaurant(postData.restaurantId, postData.images, postData.userId);
  }
}

// services/restaurantImageService.ts
export const addUserImagesToRestaurant = async (
  restaurantId: string, 
  images: string[], 
  userId: string
) => {
  const { data, error } = await supabase
    .from('restaurant_images')
    .insert(
      images.map(imageUrl => ({
        restaurant_id: restaurantId,
        image_url: imageUrl,
        user_id: userId,
        source: 'user_post',
        created_at: new Date().toISOString()
      }))
    );
  
  if (error) throw error;
  return data;
};
```

### Database Schema
```sql
-- Add user attribution to restaurant_images table
ALTER TABLE restaurant_images 
ADD COLUMN user_id UUID REFERENCES auth.users(id),
ADD COLUMN source VARCHAR(50) DEFAULT 'upload',
ADD COLUMN post_id UUID REFERENCES posts(id);

-- Index for performance
CREATE INDEX idx_restaurant_images_user_id ON restaurant_images(user_id);
CREATE INDEX idx_restaurant_images_source ON restaurant_images(source);
```

### Restaurant Photos Tab Updates
```typescript
// components/RestaurantPhotos.tsx
const RestaurantPhotos = ({ restaurantId }: { restaurantId: string }) => {
  const [photos, setPhotos] = useState<RestaurantImage[]>([]);
  
  useEffect(() => {
    loadRestaurantPhotos();
  }, [restaurantId]);
  
  const loadRestaurantPhotos = async () => {
    const { data } = await supabase
      .from('restaurant_images')
      .select(`
        *,
        user_profiles(username, avatar_url)
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    
    setPhotos(data || []);
  };
  
  return (
    <ScrollView>
      {photos.map(photo => (
        <View key={photo.id} style={styles.photoContainer}>
          <Image source={{ uri: photo.image_url }} style={styles.photo} />
          {photo.user_id && (
            <View style={styles.attribution}>
              <Text>by @{photo.user_profiles?.username}</Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
};
```

## Definition of Done
- [ ] User post images automatically appear in restaurant Photos tab
- [ ] Images are properly attributed to the posting user
- [ ] Privacy settings are respected for photo sharing
- [ ] Image quality is optimized for mobile viewing
- [ ] Restaurant photos tab shows both official and user-generated content
- [ ] Performance is maintained with large photo galleries
- [ ] Error handling for failed image additions
- [ ] UI clearly distinguishes user-generated vs official photos

## Resources
- Restaurant Photos Tab implementation
- Post creation service documentation
- Image upload and storage service
- Privacy settings documentation

## Notes
- Consider implementing photo moderation for inappropriate content
- May need to add photo reporting functionality
- Should maintain performance with large numbers of user photos
- Consider caching strategies for photo galleries