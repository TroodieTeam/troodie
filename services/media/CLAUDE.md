# Media Services Documentation

Media services handle image/video uploads, storage, and retrieval across the app.

## Files Overview

### imageUploadService.ts (Legacy)
Original base64 image upload service.

**Status:** Deprecated, use V2 for new code

**Issues:**
- Base64 encoding increases file size
- Memory intensive for large images
- Slower upload times

### imageUploadServiceV2.ts (Current)
Modern image upload using blob/FormData.

**Key Functions:**
- `uploadImage()` - Upload single image
- `uploadMultipleImages()` - Batch upload
- `deleteImage()` - Remove from storage
- `getImageUrl()` - Get public URL

**Supported Formats:**
- JPEG/JPG
- PNG
- WebP
- HEIC (auto-converted)

### imageUploadServiceFormData.ts
Alternative FormData implementation.

### storageService.ts
Low-level Supabase Storage operations.

**Key Functions:**
- `upload()` - Generic file upload
- `download()` - Get file
- `delete()` - Remove file
- `getPublicUrl()` - Generate public URL
- `list()` - List files in bucket

### intelligentCoverPhotoService.ts
AI-powered cover photo selection for boards.

**Key Functions:**
- `selectBestCoverPhoto()` - Auto-select from restaurant photos
- `scorePhoto()` - Rate photo quality
- `getCoverPhotoSuggestions()` - Get ranked suggestions

**Scoring Criteria:**
- Image resolution
- Aspect ratio (landscape preferred)
- File size (quality indicator)
- Recency

## Storage Buckets

### Configuration
```typescript
const STORAGE_BUCKETS = {
  avatars: 'avatars',
  restaurantPhotos: 'restaurant-photos',
  boardCovers: 'board-covers',
  postPhotos: 'post-photos',
  communityImages: 'community-images'
};
```

### Bucket Policies (RLS)

**avatars:**
```sql
-- Anyone can read
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Users can upload their own
CREATE POLICY "Users can upload their avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

**restaurant-photos:**
```sql
-- Public read
CREATE POLICY "Anyone can view restaurant photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'restaurant-photos');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'restaurant-photos' AND
    auth.role() = 'authenticated'
  );
```

**post-photos:**
```sql
-- Public read
CREATE POLICY "Anyone can view post photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-photos');

-- Users upload to their folder
CREATE POLICY "Users upload to their folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

## Image Upload Flow

### 1. Pick Image (Expo)
```typescript
import * as ImagePicker from 'expo-image-picker';

const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.8,  // Compress to 80%
});

if (!result.canceled) {
  const imageUri = result.assets[0].uri;
  // Proceed to upload
}
```

### 2. Compress/Resize (Optional)
```typescript
import * as ImageManipulator from 'expo-image-manipulator';

const manipulatedImage = await ImageManipulator.manipulateAsync(
  imageUri,
  [{ resize: { width: 1200 } }],  // Max width 1200px
  { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
);
```

### 3. Upload to Storage
```typescript
import { imageUploadServiceV2 } from '@/services/imageUploadServiceV2';

const photoUrl = await imageUploadServiceV2.uploadImage(
  manipulatedImage.uri,
  'post-photos',
  `${userId}/${Date.now()}.jpg`
);
```

### 4. Save URL to Database
```typescript
await supabase
  .from('posts')
  .insert({
    user_id: userId,
    photos: [photoUrl],  // Array of URLs
    // ... other fields
  });
```

## Upload Patterns

### Avatar Upload
```typescript
// 1. Pick and crop
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [1, 1],  // Square for avatar
  quality: 0.8
});

// 2. Upload to avatars bucket
const avatarUrl = await imageUploadServiceV2.uploadImage(
  result.assets[0].uri,
  'avatars',
  `${userId}/avatar.jpg`
);

// 3. Update user profile
await supabase
  .from('users')
  .update({ avatar_url: avatarUrl })
  .eq('id', userId);
```

### Post Photos (Multiple)
```typescript
// 1. Pick multiple images
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsMultipleSelection: true,
  selectionLimit: 5,
  quality: 0.8
});

// 2. Upload all
const uploadPromises = result.assets.map(asset =>
  imageUploadServiceV2.uploadImage(
    asset.uri,
    'post-photos',
    `${userId}/${Date.now()}_${Math.random()}.jpg`
  )
);

const photoUrls = await Promise.all(uploadPromises);

// 3. Create post
await postService.createPost({
  userId,
  photos: photoUrls,
  // ... other fields
});
```

### Board Cover Photo
```typescript
// Option 1: User uploads custom cover
const coverUrl = await imageUploadServiceV2.uploadImage(
  imageUri,
  'board-covers',
  `${userId}/${boardId}.jpg`
);

// Option 2: AI selects from restaurant photos
const coverUrl = await intelligentCoverPhotoService.selectBestCoverPhoto(
  boardId,
  restaurantIds
);

// Update board
await boardService.updateBoard(boardId, {
  cover_photo_url: coverUrl
});
```

## File Naming Conventions

### Pattern: `{userId}/{timestamp}_{random}.{ext}`

**Examples:**
```
avatars/550e8400-e29b-41d4-a716-446655440000/avatar.jpg
post-photos/550e8400-e29b-41d4-a716-446655440000/1704067200000_0.123.jpg
board-covers/550e8400-e29b-41d4-a716-446655440000/board-abc123.jpg
restaurant-photos/resto-xyz789/photo-1.jpg
```

### Why This Pattern?
- **userId folder**: Organizes by user, enables user-level policies
- **timestamp**: Prevents name collisions, enables sorting
- **random**: Additional uniqueness
- **extension**: Preserves format

## Image Optimization

### Before Upload
```typescript
// Resize to reasonable dimensions
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;

let manipulations = [];

if (width > MAX_WIDTH || height > MAX_HEIGHT) {
  manipulations.push({
    resize: {
      width: width > height ? MAX_WIDTH : undefined,
      height: height > width ? MAX_HEIGHT : undefined
    }
  });
}

const optimized = await ImageManipulator.manipulateAsync(
  uri,
  manipulations,
  {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG
  }
);
```

### Storage Best Practices
- **Compress**: 0.8 quality for photos, 1.0 for graphics
- **Resize**: Max 1920px for display, 300px for thumbnails
- **Format**: JPEG for photos, PNG for transparency
- **Progressive**: Use progressive JPEG for web

## CDN and Caching

Supabase Storage provides CDN:

```typescript
// Get public URL (CDN cached)
const url = supabase.storage
  .from('post-photos')
  .getPublicUrl(filePath);

// URL format:
// https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[path]
```

### Cache Headers
- Storage responses include cache headers
- CDN caches for 1 year by default
- Update filename to bust cache

## Deleting Images

### Delete from Storage
```typescript
await storageService.delete('post-photos', `${userId}/photo.jpg`);
```

### Cascade Delete Pattern
```sql
-- Delete post cascade deletes images
CREATE OR REPLACE FUNCTION delete_post_photos()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all photos from storage
  PERFORM storage.delete_object('post-photos', photo)
  FROM unnest(OLD.photos) AS photo;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_delete_photos
BEFORE DELETE ON posts
FOR EACH ROW
EXECUTE FUNCTION delete_post_photos();
```

## Intelligent Cover Photo Selection

### Usage
```typescript
import { intelligentCoverPhotoService } from '@/services/intelligentCoverPhotoService';

// Get board's restaurant IDs
const board = await boardService.getBoardWithRestaurants(boardId);
const restaurantIds = board.restaurants.map(r => r.id);

// Auto-select best cover
const coverUrl = await intelligentCoverPhotoService.selectBestCoverPhoto(
  boardId,
  restaurantIds
);

// Or get ranked suggestions
const suggestions = await intelligentCoverPhotoService.getCoverPhotoSuggestions(
  restaurantIds,
  5  // Top 5
);
```

### Scoring Algorithm
```typescript
function scorePhoto(photo) {
  let score = 0;

  // Resolution (0-40 points)
  const pixels = photo.width * photo.height;
  score += Math.min(40, (pixels / 1000000) * 40);

  // Aspect ratio (0-30 points)
  const aspectRatio = photo.width / photo.height;
  if (aspectRatio >= 1.3 && aspectRatio <= 1.8) {
    score += 30;  // Ideal landscape
  }

  // Recency (0-20 points)
  const daysOld = (Date.now() - photo.created_at) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 20 - daysOld / 10);

  // File size as quality indicator (0-10 points)
  score += Math.min(10, photo.size / 100000);

  return score;
}
```

## Troubleshooting

### Upload Fails
1. Check bucket exists
2. Verify RLS policies allow upload
3. Check file size limits (50MB default)
4. Validate file format
5. Test with direct storage API call

### Images Not Displaying
1. Verify URL format
2. Check bucket is public or user has access
3. Test URL in browser
4. Check for CORS issues
5. Verify RLS policies allow read

### Slow Uploads
1. Compress images before upload
2. Reduce resolution
3. Use batch upload for multiple images
4. Check network connection
5. Monitor upload progress

### Storage Full
1. Check storage quota
2. Implement image cleanup for deleted items
3. Use lifecycle policies to delete old files
4. Consider image optimization

## Related Files
- `components/ImagePicker.tsx` - Image picker UI
- `components/ImageGallery.tsx` - Display multiple images
- `hooks/useImagePicker.ts` - Image picker hook
- `lib/imageUtils.ts` - Image utility functions
- Storage migrations in `supabase/migrations/`
