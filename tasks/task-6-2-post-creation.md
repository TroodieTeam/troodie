# Task 6.2: Post Creation & Management

## Overview
Implement a comprehensive post creation and management system that allows users to create, edit, and manage posts about their restaurant experiences. This includes photo uploads, captions, restaurant tagging, engagement features, and post discovery.

## Business Value
- Enables user-generated content that drives engagement
- Creates social proof for restaurants through user experiences
- Builds community through shared dining experiences
- Provides content for the explore feed and activity streams
- Increases user retention through content creation and consumption

## Dependencies
- Task 2.2 (Restaurant Search & Discovery) - for restaurant selection
- Task 3.4 (User Profile Implementation) - for user context and achievements
- Task 4.1 (Board-Based Save System) - for board integration
- Task 6.1 (Restaurant Detail Screen) - for restaurant context

## Acceptance Criteria

### Gherkin Scenarios

**Scenario: Create a new post with photos and caption**
```
Given I am on the post creation screen
When I select photos from my gallery
And I write a caption about my experience
And I tag a restaurant
And I set privacy settings
Then I should be able to publish the post
And the post should appear in the explore feed
And I should receive engagement notifications
```

**Scenario: Edit existing post**
```
Given I have created a post
When I view my post
And I tap the edit button
Then I should be able to modify the caption
And I should be able to add/remove photos
And I should be able to change privacy settings
And the changes should be saved successfully
```

**Scenario: Post engagement (likes, comments, saves)**
```
Given I am viewing a post in the explore feed
When I tap the like button
Then the like count should increment
And the post should show as liked
And the post author should receive a notification
```

**Scenario: Post discovery and filtering**
```
Given I am on the explore screen
When I apply different filters (All, Friends, Trending, Nearby)
Then I should see relevant posts based on the filter
And the posts should be sorted by relevance/recency
```

**Scenario: Post management and deletion**
```
Given I have created multiple posts
When I view my profile posts tab
Then I should see all my posts
And I should be able to delete posts
And I should be able to change post privacy
And I should see post analytics
```

## Technical Implementation

### Files to Create/Modify

#### 1. Post Creation Flow
- **`app/add/create-post.tsx`** - Main post creation screen (new)
- **`app/add/post-preview.tsx`** - Post preview before publishing (new)
- **`app/add/post-success.tsx`** - Success screen after publishing (new)

#### 2. Post Management
- **`app/posts/[id].tsx`** - Individual post detail view (new)
- **`app/posts/edit/[id].tsx`** - Post editing screen (new)
- **`app/posts/index.tsx`** - User's posts list (new)

#### 3. Post Services
- **`services/postService.ts`** - Post CRUD operations (new)
- **`services/postEngagementService.ts`** - Like, comment, save functionality (new)
- **`services/postMediaService.ts`** - Photo upload and management (new)

#### 4. UI Components
- **`components/PostCard.tsx`** - Reusable post display component (new)
- **`components/PostCreationModal.tsx`** - Modal for quick post creation (new)
- **`components/PostEngagement.tsx`** - Like, comment, save buttons (new)
- **`components/PostComments.tsx`** - Comments section (new)

#### 5. Updated Components
- **`components/cards/ExplorePostCard.tsx`** - Update to use real post data
- **`app/(tabs)/explore.tsx`** - Update to fetch and display real posts
- **`app/(tabs)/profile.tsx`** - Update posts tab to show real posts

### Database Schema Updates

#### 1. Posts Table
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id VARCHAR(255) NOT NULL,
  caption TEXT,
  photos TEXT[], -- Array of photo URLs
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  visit_date DATE,
  price_range VARCHAR(10),
  visit_type VARCHAR(20) CHECK (visit_type IN ('dine_in', 'takeout', 'delivery')),
  tags TEXT[], -- Array of tags
  privacy VARCHAR(20) DEFAULT 'public' CHECK (privacy IN ('public', 'friends', 'private')),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(10, 8),
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  is_trending BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. Post Likes Table
```sql
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
```

#### 3. Post Comments Table
```sql
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. Post Saves Table
```sql
CREATE TABLE post_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id, board_id)
);
```

### Service Implementation

#### 1. PostService
```typescript
class PostService {
  async createPost(userId: string, postData: PostCreationData): Promise<Post>
  async getPost(postId: string): Promise<Post | null>
  async getUserPosts(userId: string, limit?: number): Promise<Post[]>
  async getExplorePosts(filters: ExploreFilters): Promise<Post[]>
  async updatePost(postId: string, updates: Partial<Post>): Promise<Post>
  async deletePost(postId: string): Promise<void>
  async getTrendingPosts(): Promise<Post[]>
  async searchPosts(query: string): Promise<Post[]>
}
```

#### 2. PostEngagementService
```typescript
class PostEngagementService {
  async likePost(postId: string, userId: string): Promise<void>
  async unlikePost(postId: string, userId: string): Promise<void>
  async commentOnPost(postId: string, userId: string, content: string): Promise<Comment>
  async savePost(postId: string, userId: string, boardId?: string): Promise<void>
  async unsavePost(postId: string, userId: string): Promise<void>
  async getPostLikes(postId: string): Promise<UserInfo[]>
  async getPostComments(postId: string): Promise<Comment[]>
}
```

#### 3. PostMediaService
```typescript
class PostMediaService {
  async uploadPostPhotos(photos: string[], userId: string): Promise<string[]>
  async deletePostPhoto(photoUrl: string): Promise<void>
  async compressPhoto(photoUri: string): Promise<string>
  async generatePhotoThumbnail(photoUri: string): Promise<string>
}
```

### UI Flow Implementation

#### 1. Post Creation Flow
```typescript
// app/add/create-post.tsx
const PostCreationScreen = () => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantInfo | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');

  const handlePhotoSelection = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    
    if (!result.canceled) {
      setPhotos([...photos, ...result.assets.map(asset => asset.uri)]);
    }
  };

  const handlePublish = async () => {
    try {
      const uploadedPhotos = await postMediaService.uploadPostPhotos(photos, userId);
      const post = await postService.createPost(userId, {
        caption,
        photos: uploadedPhotos,
        restaurantId: selectedRestaurant?.id,
        rating,
        privacy,
        visitDate: new Date(),
      });
      
      router.push(`/add/post-success?id=${post.id}`);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };
};
```

#### 2. Post Display Component
```typescript
// components/PostCard.tsx
const PostCard = ({ post, onLike, onComment, onSave }: PostCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleLike = async () => {
    try {
      if (isLiked) {
        await postEngagementService.unlikePost(post.id, userId);
      } else {
        await postEngagementService.likePost(post.id, userId);
      }
      setIsLiked(!isLiked);
      onLike?.(post.id, !isLiked);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  return (
    <View style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{post.user.name}</Text>
          <Text style={styles.postTime}>{post.time}</Text>
        </View>
      </View>

      {/* Post Content */}
      <Text style={styles.caption}>{post.caption}</Text>
      
      {/* Post Photos */}
      {post.photos.length > 0 && (
        <View style={styles.photoContainer}>
          <Image source={{ uri: post.photos[0] }} style={styles.mainPhoto} />
        </View>
      )}

      {/* Restaurant Info */}
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{post.restaurant.name}</Text>
        <Text style={styles.restaurantLocation}>{post.restaurant.location}</Text>
      </View>

      {/* Engagement Actions */}
      <View style={styles.engagementActions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Heart size={20} color={isLiked ? '#FF4444' : '#666'} fill={isLiked ? '#FF4444' : 'none'} />
          <Text style={styles.actionCount}>{post.engagement.likes}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => onComment?.(post.id)}>
          <MessageCircle size={20} color="#666" />
          <Text style={styles.actionCount}>{post.engagement.comments}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
          <Bookmark size={20} color={isSaved ? designTokens.colors.primaryOrange : '#666'} fill={isSaved ? designTokens.colors.primaryOrange : 'none'} />
          <Text style={styles.actionCount}>{post.engagement.saves}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

#### 3. Explore Feed Integration
```typescript
// app/(tabs)/explore.tsx
const ExploreScreen = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ExploreFilter>('All');

  const loadPosts = async () => {
    try {
      setLoading(true);
      const explorePosts = await postService.getExplorePosts({ filter });
      setPosts(explorePosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostCard 
            post={item}
            onLike={(postId, liked) => handlePostLike(postId, liked)}
            onComment={(postId) => router.push(`/posts/${postId}`)}
            onSave={(postId) => handlePostSave(postId)}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadPosts} />
        }
      />
    </SafeAreaView>
  );
};
```

## Definition of Done
- [ ] Complete post creation flow with photo upload and caption
- [ ] Post editing and deletion functionality
- [ ] Post engagement (likes, comments, saves) with real-time updates
- [ ] Post discovery and filtering in explore feed
- [ ] Post management in user profile
- [ ] Database schema for posts, likes, comments, and saves
- [ ] Post services with full CRUD operations
- [ ] Post display components with engagement features
- [ ] Integration with restaurant detail screens
- [ ] Photo upload and compression functionality
- [ ] Privacy settings and post visibility controls
- [ ] Post analytics and trending detection
- [ ] Comprehensive error handling and loading states
- [ ] Unit tests for post services
- [ ] Integration tests for post flows

## Notes
- Consider implementing post moderation and content filtering
- Plan for post performance optimization as user base grows
- Consider implementing post templates for common use cases
- Plan for post analytics and insights for creators
- Consider implementing post scheduling for future releases

## Related Files
- `app/add/create-post.tsx` - Post creation screen (new)
- `app/posts/[id].tsx` - Post detail view (new)
- `components/PostCard.tsx` - Post display component (new)
- `services/postService.ts` - Post service (new)
- `app/(tabs)/explore.tsx` - Updated to use real posts
- `app/(tabs)/profile.tsx` - Updated posts tab
- `components/cards/ExplorePostCard.tsx` - Updated to use real data 