# Task 8.3: Display Profile and Post Images

## Header Information
- **Epic**: Epic 8 - UI/UX Improvements and Polish
- **Priority**: High
- **Estimate**: 2 days
- **Status**: 🔴 Not Started
- **Dependencies**: Task 1.1 (Supabase Setup), Storage configuration
- **Blocks**: Complete user experience
- **Assignee**: -

## Overview
Ensure that user profile images and post images are displayed correctly throughout the app, with proper loading states, error handling, and fallback placeholders.

## Business Value
- **Professional appearance**: Broken images harm credibility
- **User engagement**: Visual content drives interaction
- **Trust building**: Consistent image display builds confidence
- **Social proof**: Profile images personalize the experience

## Dependencies
- ✅ Task 1.1: Supabase Backend Setup (Completed)
- Storage bucket configuration for images
- CDN setup for image delivery

## Blocks
- Complete social experience
- User-generated content features
- Profile customization

## Acceptance Criteria

```gherkin
Feature: Display Profile and Post Images
  As a user
  I want to see images correctly displayed
  So that I have a rich visual experience

  Scenario: Profile image display with image
    Given a user has uploaded a profile image
    When I view their profile anywhere in the app
    Then I see their profile image at the correct size
    And the image loads progressively with a skeleton
    And the image is cached for subsequent views

  Scenario: Profile image display without image
    Given a user has not uploaded a profile image
    When I view their profile
    Then I see a default avatar placeholder
    And the placeholder shows their initials if name exists
    And the placeholder has a consistent background color

  Scenario: Post images display
    Given a post contains images
    When I view the post in any context
    Then images load with progressive enhancement
    And images maintain correct aspect ratios
    And I can tap to view images full screen
    
  Scenario: Image load failure
    Given an image fails to load
    When the error occurs
    Then a graceful error placeholder is shown
    And a retry option is available
    And the layout doesn't break
```

## Technical Implementation

### Image Component System

```typescript
// components/Avatar.tsx
interface AvatarProps {
  url?: string | null;
  name?: string;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  url, 
  name, 
  size = 'medium',
  onPress 
}) => {
  const [error, setError] = useState(false);
  const dimensions = avatarSizes[size];
  
  const initials = name
    ?.split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
    
  const backgroundColor = stringToColor(name || 'default');
  
  if (!url || error) {
    return (
      <TouchableOpacity 
        onPress={onPress}
        style={[
          styles.placeholder,
          { 
            width: dimensions,
            height: dimensions,
            backgroundColor 
          }
        ]}
      >
        <Text style={styles.initials}>{initials}</Text>
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity onPress={onPress}>
      <FastImage
        source={{ 
          uri: url,
          priority: FastImage.priority.normal,
          cache: FastImage.cacheControl.immutable
        }}
        style={[
          styles.image,
          { width: dimensions, height: dimensions }
        ]}
        onError={() => setError(true)}
      />
    </TouchableOpacity>
  );
};
```

### Post Image Gallery

```typescript
// components/PostImageGallery.tsx
export const PostImageGallery = ({ images }: { images: string[] }) => {
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>({});
  
  const renderImage = (uri: string, index: number) => {
    const isLoading = loadingStates[index] ?? true;
    
    return (
      <TouchableOpacity
        key={uri}
        onPress={() => openImageViewer(images, index)}
        style={styles.imageContainer}
      >
        {isLoading && (
          <Skeleton 
            width="100%" 
            height={200} 
            style={StyleSheet.absoluteFill}
          />
        )}
        <FastImage
          source={{ uri }}
          style={styles.image}
          onLoadStart={() => setLoadingStates(prev => ({ ...prev, [index]: true }))}
          onLoadEnd={() => setLoadingStates(prev => ({ ...prev, [index]: false }))}
          resizeMode={FastImage.resizeMode.cover}
        />
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.gallery}>
      {images.map(renderImage)}
    </View>
  );
};
```

### Image Utilities

```typescript
// utils/imageHelpers.ts
export const getImageUrl = (path: string | null, bucket: string): string | null => {
  if (!path) return null;
  
  // Handle full URLs
  if (path.startsWith('http')) return path;
  
  // Build Supabase storage URL
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
    
  return data?.publicUrl || null;
};

export const stringToColor = (str: string): string => {
  // Generate consistent color from string
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 50%)`;
};

export const preloadImages = async (urls: string[]) => {
  const promises = urls
    .filter(Boolean)
    .map(url => FastImage.preload([{ uri: url }]));
    
  await Promise.all(promises);
};
```

### Storage Configuration

```typescript
// config/storage.ts
export const storageBuckets = {
  profiles: 'profile-images',
  posts: 'post-photos',
} as const;

export const imageSizes = {
  thumbnail: { width: 150, height: 150 },
  medium: { width: 600, height: 600 },
  large: { width: 1200, height: 1200 },
};

// Supabase storage policies
const profileImagePolicy = `
  CREATE POLICY "Public profile images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'profile-images');
`;
```

## Definition of Done

- [ ] Avatar component handles all states (loaded, loading, error, placeholder)
- [ ] Profile images display consistently across all screens
- [ ] Post images support single and multiple image layouts
- [ ] Progressive image loading with skeleton states
- [ ] Image caching implemented for performance
- [ ] Fallback placeholders show initials with consistent colors
- [ ] Error states handled gracefully with retry option
- [ ] Full-screen image viewer for post images
- [ ] Proper aspect ratio maintenance
- [ ] Accessibility labels for all images
- [ ] Performance: Images lazy load in lists
- [ ] Memory management: Large images downsampled
- [ ] Cross-platform image display consistency

## Resources
- [React Native Fast Image](https://github.com/DylanVann/react-native-fast-image)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Image Optimization Best Practices](https://web.dev/fast/#optimize-your-images)

## Notes
- Consider implementing image compression on upload
- Monitor CDN costs for image delivery
- Add image format support (WebP for Android)
- Future: AI-powered image moderation
- Track image load performance metrics