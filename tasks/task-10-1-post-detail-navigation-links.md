# Task 10.1: Implement Navigation Links in Post Detail Screen

**Epic**: 10 - Enhanced Navigation and User Experience  
**Priority**: High  
**Estimate**: 1 day  
**Status**: 🔴 Not Started

## Overview
Add clickable navigation to usernames and restaurants in the post detail screen, allowing users to navigate to profile and restaurant pages respectively with proper touch targets and visual feedback.

## Business Value
- Improves user navigation and content discovery
- Increases engagement by making content more interconnected
- Provides expected social media interaction patterns
- Enhances overall user experience and app stickiness

## Dependencies
- Post detail screen must be implemented
- User profile pages must exist
- Restaurant detail pages must exist

## Blocks
- N/A

## Acceptance Criteria

```gherkin
Feature: Post Detail Navigation Links
  As a user
  I want to click on usernames and restaurants in posts
  So that I can easily navigate to related content

Scenario: Username is clickable and navigates to profile
  Given I am viewing a post detail screen
  When I tap on the username
  Then I should navigate to that user's profile page
  And the navigation should be smooth and immediate

Scenario: Restaurant name/image is clickable
  Given I am viewing a post with a restaurant attached
  When I tap on the restaurant name or image
  Then I should navigate to the restaurant detail page
  And see the full restaurant information

Scenario: Visual feedback for clickable elements
  Given I am on a post detail screen
  Then usernames should have visual indicators they are clickable
  And restaurant elements should show they are interactive
  And touch feedback should be immediate

Scenario: Accessibility support
  Given I am using screen reader or accessibility features
  When I focus on username or restaurant elements
  Then they should be announced as clickable buttons
  And have appropriate accessibility labels
```

## Technical Implementation

### Enhanced Post Detail Component
```typescript
// app/post/[id].tsx
import { router } from 'expo-router';
import { TouchableOpacity, Pressable } from 'react-native';

const PostDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);

  const handleUserPress = (userId: string, username: string) => {
    router.push(`/user/${userId}`);
  };

  const handleRestaurantPress = (restaurantId: string) => {
    router.push(`/restaurant/${restaurantId}`);
  };

  return (
    <ScrollView style={styles.container}>
      {post && (
        <View style={styles.postContent}>
          {/* Post Header with Clickable User Info */}
          <View style={styles.postHeader}>
            <Pressable 
              style={styles.userInfo}
              onPress={() => handleUserPress(post.user.id, post.user.username)}
              android_ripple={{ color: Colors.light.ripple }}
            >
              <Image 
                source={{ uri: post.user.avatarUrl }} 
                style={styles.userAvatar} 
              />
              <View style={styles.userDetails}>
                <Text style={styles.username}>@{post.user.username}</Text>
                <Text style={styles.timestamp}>
                  {formatTimeAgo(post.createdAt)}
                </Text>
              </View>
            </Pressable>
            
            <TouchableOpacity style={styles.moreButton}>
              <Icon name="more-vertical" size={20} />
            </TouchableOpacity>
          </View>

          {/* Post Content */}
          <Text style={styles.postText}>{post.content}</Text>

          {/* Post Images */}
          {post.images && post.images.length > 0 && (
            <ScrollView horizontal style={styles.imagesContainer}>
              {post.images.map((image, index) => (
                <Image 
                  key={index}
                  source={{ uri: image }}
                  style={styles.postImage}
                />
              ))}
            </ScrollView>
          )}

          {/* Restaurant Card - Clickable */}
          {post.restaurant && (
            <Pressable 
              style={styles.restaurantCard}
              onPress={() => handleRestaurantPress(post.restaurant.id)}
              android_ripple={{ color: Colors.light.ripple }}
            >
              <Image 
                source={{ uri: post.restaurant.coverImageUrl }} 
                style={styles.restaurantImage}
              />
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName}>{post.restaurant.name}</Text>
                <Text style={styles.restaurantDetails}>
                  {post.restaurant.category} • {post.restaurant.priceRange}
                </Text>
                <View style={styles.restaurantRating}>
                  <TrafficLightRating rating={post.restaurant.rating} size="small" />
                  <Text style={styles.ratingText}>
                    {post.restaurant.rating} ({post.restaurant.reviewCount} reviews)
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={20} color={Colors.light.textSecondary} />
            </Pressable>
          )}

          {/* Post Actions */}
          <View style={styles.postActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="heart" size={20} />
              <Text style={styles.actionText}>{post.likesCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="message-circle" size={20} />
              <Text style={styles.actionText}>{post.commentsCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="share" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};
```

### Styling for Interactive Elements
```typescript
// styles for post detail screen
const styles = StyleSheet.create({
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    padding: 8,
    borderRadius: 8,
    // Add visual feedback for interactivity
    backgroundColor: 'transparent',
  },
  
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary, // Use primary color to indicate clickability
  },
  
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    // Visual feedback for interactivity
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  
  // Hover/Press states
  userInfoPressed: {
    backgroundColor: Colors.light.cardBackground,
  },
  
  restaurantCardPressed: {
    backgroundColor: Colors.light.pressedBackground,
    transform: [{ scale: 0.98 }],
  },
});
```

### Accessibility Enhancements
```typescript
// Enhanced accessibility for clickable elements
const UserInfoButton = ({ user, onPress }: UserInfoButtonProps) => {
  return (
    <Pressable 
      style={({ pressed }) => [
        styles.userInfo,
        pressed && styles.userInfoPressed
      ]}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`View profile of ${user.username}`}
      accessibilityHint="Double tap to navigate to user profile"
    >
      <Image 
        source={{ uri: user.avatarUrl }} 
        style={styles.userAvatar}
        accessible={false} // Part of the button, don't read separately
      />
      <View style={styles.userDetails}>
        <Text style={styles.username}>@{user.username}</Text>
        <Text style={styles.timestamp}>
          {formatTimeAgo(post.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
};

const RestaurantCard = ({ restaurant, onPress }: RestaurantCardProps) => {
  return (
    <Pressable 
      style={({ pressed }) => [
        styles.restaurantCard,
        pressed && styles.restaurantCardPressed
      ]}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`View restaurant ${restaurant.name}`}
      accessibilityHint="Double tap to navigate to restaurant details"
    >
      {/* Restaurant card content */}
    </Pressable>
  );
};
```

### Navigation Error Handling
```typescript
// utils/navigationHelpers.ts
export const navigateToUser = (userId: string, username?: string) => {
  try {
    router.push(`/user/${userId}`);
  } catch (error) {
    console.error('Navigation to user failed:', error);
    showErrorToast('Unable to load user profile');
  }
};

export const navigateToRestaurant = (restaurantId: string, restaurantName?: string) => {
  try {
    router.push(`/restaurant/${restaurantId}`);
  } catch (error) {
    console.error('Navigation to restaurant failed:', error);
    showErrorToast('Unable to load restaurant details');
  }
};
```

### Haptic Feedback
```typescript
// Add haptic feedback for better user experience
import * as Haptics from 'expo-haptics';

const handleUserPress = (userId: string, username: string) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  navigateToUser(userId, username);
};

const handleRestaurantPress = (restaurantId: string) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  navigateToRestaurant(restaurantId);
};
```

## Definition of Done
- [ ] Usernames are clickable and navigate to profile pages
- [ ] Restaurant names/images navigate to restaurant detail pages
- [ ] Visual feedback indicates clickable elements clearly
- [ ] Touch targets are appropriately sized (minimum 44px)
- [ ] Accessibility labels and roles are properly implemented
- [ ] Navigation works smoothly without errors
- [ ] Haptic feedback provides good user experience
- [ ] Error handling works for failed navigation
- [ ] Performance is good with complex post layouts

## Resources
- React Navigation documentation
- Expo Router navigation patterns
- Accessibility guidelines for mobile apps
- Touch target size guidelines

## Notes
- Ensure touch targets meet accessibility guidelines (44x44 points minimum)
- Consider adding loading states for navigation
- May want to implement deep linking for sharing post links
- Should handle edge cases like deleted users or restaurants
- Consider caching user/restaurant data for faster navigation