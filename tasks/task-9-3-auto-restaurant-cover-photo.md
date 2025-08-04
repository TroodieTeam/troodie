# Task 9.3: Auto-Set Restaurant Cover Photo from User Posts

**Epic**: 9 - UI/UX Improvements and Content Integration  
**Priority**: Medium  
**Estimate**: 1.5 days  
**Status**: 🔴 Not Started

## Overview
Restaurant detail pages should never have empty cover photos. When a user posts with a photo attached, that photo should become the cover image if none exists or only a default is used.

## Business Value
- Eliminates empty or generic cover photos on restaurant pages
- Utilizes user-generated content to improve visual appeal
- Creates more engaging and authentic restaurant profiles
- Reduces maintenance burden of manually setting cover photos

## Dependencies
- User post creation with images must be working
- Restaurant cover photo system must be implemented
- Image processing and optimization pipeline

## Blocks
- N/A

## Acceptance Criteria

```gherkin
Feature: Automatic Restaurant Cover Photo Assignment
  As a user
  I want restaurants to have attractive cover photos automatically
  So that restaurant pages are visually appealing

Scenario: Restaurant with no cover photo gets user image
  Given a restaurant has no cover photo set
  When a user posts an image featuring that restaurant
  Then the image should become the restaurant's cover photo
  And the image should be properly sized and optimized

Scenario: Default cover photo replaced by user content
  Given a restaurant only has a default/placeholder cover photo
  When a user posts a high-quality image of the restaurant
  Then the user's image should replace the default cover photo

Scenario: High-quality image prioritized
  Given a restaurant has a low-quality cover photo
  When a user posts a higher-quality image
  Then the system should evaluate and potentially replace the cover photo

Scenario: Multiple candidate images smart selection
  Given multiple users post images for the same restaurant
  When the system selects a cover photo
  Then it should choose the highest quality, most representative image
```

## Technical Implementation

### Cover Photo Selection Algorithm
```typescript
// services/restaurantCoverService.ts
interface CoverPhotoCandidate {
  imageUrl: string;
  userId: string;
  postId: string;
  uploadedAt: Date;
  dimensions?: { width: number; height: number };
  quality?: 'low' | 'medium' | 'high';
}

export const evaluateAndSetCoverPhoto = async (
  restaurantId: string, 
  newImageUrl: string, 
  userId: string, 
  postId: string
) => {
  // Get current cover photo info
  const currentCover = await getCurrentCoverPhoto(restaurantId);
  
  // Analyze new image quality
  const newImageQuality = await analyzeImageQuality(newImageUrl);
  
  // Determine if new image should replace current
  const shouldReplace = await shouldReplaceCurrentCover(
    currentCover, 
    {
      imageUrl: newImageUrl,
      userId,
      postId,
      uploadedAt: new Date(),
      quality: newImageQuality
    }
  );
  
  if (shouldReplace) {
    await updateRestaurantCoverPhoto(restaurantId, newImageUrl, userId, postId);
  }
};

const shouldReplaceCurrentCover = async (
  current: CoverPhotoInfo | null,
  candidate: CoverPhotoCandidate
): Promise<boolean> => {
  // No current cover - always replace
  if (!current || current.isDefault) {
    return true;
  }
  
  // Quality comparison
  if (candidate.quality === 'high' && current.quality !== 'high') {
    return true;
  }
  
  // Age factor - prefer newer high-quality images
  const daysSinceCurrent = (Date.now() - current.uploadedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCurrent > 30 && candidate.quality === 'high') {
    return true;
  }
  
  return false;
};
```

### Image Quality Analysis
```typescript
// utils/imageQualityAnalyzer.ts
export const analyzeImageQuality = async (imageUrl: string): Promise<'low' | 'medium' | 'high'> => {
  try {
    // Use Image.getSize to get dimensions
    const { width, height } = await getImageDimensions(imageUrl);
    
    const megapixels = (width * height) / 1000000;
    const aspectRatio = width / height;
    
    // Quality scoring based on resolution and aspect ratio
    let score = 0;
    
    // Resolution scoring
    if (megapixels >= 3) score += 3;
    else if (megapixels >= 1) score += 2;
    else score += 1;
    
    // Aspect ratio scoring (prefer landscape or square for covers)
    if (aspectRatio >= 1.3 && aspectRatio <= 2.0) score += 2;
    else if (aspectRatio >= 0.8) score += 1;
    
    // Determine quality level
    if (score >= 4) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
    
  } catch (error) {
    console.warn('Image quality analysis failed:', error);
    return 'medium'; // Default fallback
  }
};

const getImageDimensions = (uri: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, 
      (width, height) => resolve({ width, height }),
      reject
    );
  });
};
```

### Database Updates
```sql
-- Add cover photo tracking to restaurants table
ALTER TABLE restaurants 
ADD COLUMN cover_photo_url TEXT,
ADD COLUMN cover_photo_user_id UUID REFERENCES auth.users(id),
ADD COLUMN cover_photo_post_id UUID REFERENCES posts(id),
ADD COLUMN cover_photo_set_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN cover_photo_is_default BOOLEAN DEFAULT FALSE;

-- Function to update cover photo
CREATE OR REPLACE FUNCTION update_restaurant_cover_photo(
  p_restaurant_id UUID,
  p_image_url TEXT,
  p_user_id UUID,
  p_post_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE restaurants SET 
    cover_photo_url = p_image_url,
    cover_photo_user_id = p_user_id,
    cover_photo_post_id = p_post_id,
    cover_photo_set_at = NOW(),
    cover_photo_is_default = FALSE
  WHERE id = p_restaurant_id;
END;
$$ LANGUAGE plpgsql;
```

### Post Creation Integration
```typescript
// services/postService.ts - enhanced
export const createPost = async (postData: CreatePostRequest) => {
  // ... existing post creation logic
  
  const post = await savePost(postData);
  
  // Evaluate images for restaurant cover photo
  if (postData.restaurantId && postData.images?.length > 0) {
    for (const imageUrl of postData.images) {
      await evaluateAndSetCoverPhoto(
        postData.restaurantId, 
        imageUrl, 
        postData.userId, 
        post.id
      );
    }
  }
  
  return post;
};
```

## Definition of Done
- [ ] Restaurants never show empty cover photos
- [ ] User post images automatically become cover photos when appropriate
- [ ] Image quality analysis works reliably
- [ ] Smart selection algorithm prioritizes best images
- [ ] Default/placeholder photos are replaced by user content
- [ ] Cover photo updates don't interfere with app performance
- [ ] Proper attribution tracking for cover photos
- [ ] Error handling for image processing failures
- [ ] Database properly tracks cover photo metadata

## Resources
- Image processing utilities
- Restaurant photo management system
- Post creation service documentation
- Image quality standards and guidelines

## Notes
- Consider adding manual override capability for restaurant owners
- May need content moderation for inappropriate cover photos
- Should handle edge cases like corrupted or deleted images
- Consider caching optimized cover photo versions
- May want to notify users when their photo becomes a cover photo