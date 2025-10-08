# Share Feature Usage Examples

## 1. Using ShareButton in a Post Card

```tsx
import { ShareButton } from '@/components/ShareButton';
import ShareService from '@/services/shareService';

// In your PostCard component:
<ShareButton
  content={{
    type: 'post',
    id: post.id,
    title: post.restaurant?.name,
    description: post.content,
    image: post.photos?.[0],
    tags: post.tags
  }}
  variant="icon"
  size="medium"
  showCount={true}
  shareCount={post.shares_count || 0}
  onShareComplete={(result) => {
    // Update local state or refetch data
    console.log('Share completed:', result);
  }}
/>
```

## 2. Using ShareButton in a Board Screen

```tsx
import { ShareButton } from '@/components/ShareButton';

// In your BoardScreen component header:
<ShareButton
  content={{
    type: 'board',
    id: board.id,
    title: board.name,
    description: board.description,
    image: board.cover_photo_url,
    count: board.restaurants?.length
  }}
  variant="button"
  size="medium"
  style={{ marginRight: 16 }}
/>
```

## 3. Using ShareService Directly

```tsx
import ShareService from '@/services/shareService';

// Share a restaurant
const shareRestaurant = async (restaurant: Restaurant) => {
  const result = await ShareService.share({
    type: 'restaurant',
    id: restaurant.id,
    title: restaurant.name,
    description: `${restaurant.cuisine.join(', ')} • ${restaurant.price_range}`,
    image: restaurant.photos?.[0]
  });
  
  if (result.success) {
    console.log('Shared via:', result.action);
  }
};

// Share to specific platform
const shareToTwitter = async (post: Post) => {
  const result = await ShareService.shareToTwitter({
    type: 'post',
    id: post.id,
    title: post.restaurant?.name,
    description: post.content
  });
};

// Copy link to clipboard
const copyShareLink = async (boardId: string) => {
  const result = await ShareService.copyLink({
    type: 'board',
    id: boardId
  });
  
  if (result.success) {
    showToast('Link copied to clipboard!', 'success');
  }
};
```

## 4. Profile Share Implementation

```tsx
import { ShareButton } from '@/components/ShareButton';

// In your ProfileScreen component:
<ShareButton
  content={{
    type: 'profile',
    id: user.id,
    username: user.username,
    title: user.full_name,
    description: user.bio,
    image: user.avatar_url
  }}
  variant="text"
  size="small"
/>
```

## 5. Custom Share Sheet Implementation

```tsx
import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, Text } from 'react-native';
import ShareService from '@/services/shareService';
import { Twitter, Instagram, Link, MessageCircle } from 'lucide-react-native';

const CustomShareSheet = ({ content, visible, onClose }) => {
  const [isSharing, setIsSharing] = useState(false);
  
  const handleShare = async (method: string) => {
    setIsSharing(true);
    
    let result;
    switch(method) {
      case 'twitter':
        result = await ShareService.shareToTwitter(content);
        break;
      case 'copy':
        result = await ShareService.copyLink(content);
        break;
      default:
        result = await ShareService.share(content);
    }
    
    setIsSharing(false);
    if (result.success) {
      onClose();
    }
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Share</Text>
          
          <View style={styles.options}>
            <TouchableOpacity 
              style={styles.option}
              onPress={() => handleShare('native')}
            >
              <MessageCircle size={24} />
              <Text>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.option}
              onPress={() => handleShare('twitter')}
            >
              <Twitter size={24} color="#1DA1F2" />
              <Text>Twitter</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.option}
              onPress={() => handleShare('copy')}
            >
              <Link size={24} />
              <Text>Copy Link</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
```

## 6. Analytics Dashboard Implementation

```tsx
import ShareService from '@/services/shareService';

// Get share statistics
const getShareStats = async (contentType: string, contentId: string) => {
  const stats = await ShareService.getShareStats(contentType, contentId);
  
  console.log('Total shares:', stats.total_shares);
  console.log('Share methods:', stats.methods);
  
  // Display in your analytics view
  return (
    <View>
      <Text>Total Shares: {stats.total_shares}</Text>
      <Text>Completion Rate: {(stats.completed / stats.initiated * 100).toFixed(1)}%</Text>
      {Object.entries(stats.methods).map(([method, count]) => (
        <Text key={method}>{method}: {count}</Text>
      ))}
    </View>
  );
};
```

## 7. Deep Link Handling

```tsx
// In your main App.tsx or navigation setup:
import * as Linking from 'expo-linking';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Handle initial URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });
    
    // Listen for URL changes
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });
    
    return () => subscription.remove();
  }, []);
  
  const handleDeepLink = (url: string) => {
    const { hostname, path, queryParams } = Linking.parse(url);
    
    // Parse the URL and navigate accordingly
    if (path?.startsWith('/boards/')) {
      const boardId = path.replace('/boards/', '');
      navigation.navigate('Board', { id: boardId });
    } else if (path?.startsWith('/posts/')) {
      const postId = path.replace('/posts/', '');
      navigation.navigate('Post', { id: postId });
    } else if (path?.startsWith('/restaurant/')) {
      const restaurantId = path.replace('/restaurant/', '');
      navigation.navigate('Restaurant', { id: restaurantId });
    } else if (path?.startsWith('/user/')) {
      const userId = path.replace('/user/', '');
      navigation.navigate('Profile', { id: userId });
    }
  };
  
  // ... rest of your app
}
```

## Notes

1. **Environment Variables**: Make sure to update the `EXPO_PUBLIC_SUPABASE_URL` in your `.env` file
2. **Permissions**: No special permissions needed for basic sharing
3. **Testing**: Use `npx uri-scheme` to test deep links in development
4. **Analytics**: Share analytics are automatically tracked to the `share_analytics` table
5. **Customization**: You can customize share messages, add more platforms, or create custom share flows