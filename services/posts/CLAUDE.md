# Post Services Documentation

Post services handle all operations related to user posts (reviews, photos, external content).

## Files

### postService.ts
Core post CRUD and feed queries.

**Key Functions:**
- `createPost()` - Create new post
- `getPostById()` - Get single post with details
- `getUserPosts()` - Get posts by user
- `getFollowingFeed()` - Get feed from followed users
- `updatePost()` - Edit post
- `deletePost()` - Delete post
- `getPostsForRestaurant()` - Restaurant-specific posts
- `searchPosts()` - Search posts by text

### postEngagementService.ts
Like, comment, and save operations.

**Key Functions:**
- `likePost()` - Like a post
- `unlikePost()` - Remove like
- `getPostLikes()` - Get all likes for post
- `addComment()` - Add comment to post
- `deleteComment()` - Remove comment
- `getPostComments()` - Get all comments
- `savePost()` - Save post to board
- `unsavePost()` - Remove save

### enhancedPostEngagementService.ts
Advanced engagement features.

**Additional Features:**
- Engagement analytics
- Trending posts
- Popular content

### postMediaService.ts
Handle post images and videos.

**Key Functions:**
- `uploadPostMedia()` - Upload images/videos
- `deletePostMedia()` - Remove media
- `getPostMedia()` - Retrieve media URLs

## Post Types

### 1. Restaurant Review Post
Standard post with restaurant reference:
```typescript
{
  user_id: 'uuid',
  restaurant_id: 'uuid',
  content: 'Text review',
  rating: 4.5,
  photos: ['url1', 'url2']
}
```

### 2. Simple Post
Text-only post without restaurant:
```typescript
{
  user_id: 'uuid',
  restaurant_id: null,
  content: 'Foodie thoughts...',
  rating: null
}
```

### 3. External Content Post
Link preview post:
```typescript
{
  user_id: 'uuid',
  restaurant_id: null,
  content: 'Check this out!',
  external_link: 'https://example.com',
  external_title: 'Article Title',
  external_description: 'Description',
  external_image_url: 'preview-image.jpg'
}
```

## Database Schema

### posts Table
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  content TEXT,
  rating DECIMAL(2,1),
  photos TEXT[],  -- Array of URLs

  -- External content fields
  external_link TEXT,
  external_title TEXT,
  external_description TEXT,
  external_image_url TEXT,

  -- Metadata
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,

  -- Engagement counts (denormalized for performance)
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0
);
```

### post_likes Table
```sql
CREATE TABLE post_likes (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ,
  UNIQUE(post_id, user_id)
);
```

### post_comments Table
```sql
CREATE TABLE post_comments (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ
);
```

### post_saves Table
```sql
CREATE TABLE post_saves (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  board_id UUID REFERENCES boards(id),
  created_at TIMESTAMPTZ,
  UNIQUE(post_id, user_id, board_id)
);
```

## Creating Posts

### Basic Restaurant Review
```typescript
import { postService } from '@/services/postService';

const post = await postService.createPost({
  userId: currentUser.id,
  restaurantId: restaurant.id,
  content: 'Amazing pasta! Best carbonara in the city.',
  rating: 4.5,
  photos: ['photo-url-1.jpg', 'photo-url-2.jpg']
});
```

### Simple Text Post
```typescript
const post = await postService.createPost({
  userId: currentUser.id,
  content: 'Who else loves trying new restaurants?',
  restaurantId: null,  // No restaurant reference
  rating: null
});
```

### External Link Post
```typescript
const post = await postService.createPost({
  userId: currentUser.id,
  content: 'Great article about food trends!',
  externalLink: 'https://foodblog.com/article',
  externalTitle: '2025 Food Trends',
  externalDescription: 'Top 10 trends...',
  externalImageUrl: 'thumbnail.jpg'
});
```

## Post Engagement

### Liking Posts
```typescript
import { postEngagementService } from '@/services/postEngagementService';

// Like
await postEngagementService.likePost(postId, userId);

// Unlike
await postEngagementService.unlikePost(postId, userId);

// Check if liked
const isLiked = await postEngagementService.isPostLiked(postId, userId);
```

### Comments
```typescript
// Add comment
const comment = await postEngagementService.addComment(
  postId,
  userId,
  'Great post!'
);

// Get comments
const comments = await postEngagementService.getPostComments(postId);

// Delete comment
await postEngagementService.deleteComment(commentId, userId);
```

### Saves
```typescript
// Save to board
await postEngagementService.savePost(postId, userId, boardId);

// Unsave
await postEngagementService.unsavePost(postId, userId, boardId);

// Check if saved
const isSaved = await postEngagementService.isPostSaved(postId, userId);
```

## Feed Generation

### Following Feed
```typescript
// Get posts from users you follow
const feed = await postService.getFollowingFeed(
  userId,
  50,  // limit
  0    // offset
);
```

### Restaurant Feed
```typescript
// Get all posts for a restaurant
const posts = await postService.getPostsForRestaurant(restaurantId);
```

### User Profile Feed
```typescript
// Get user's posts
const posts = await postService.getUserPosts(userId);
```

## Real-time Updates

Use `hooks/useRealtimeFeed.ts` for live feed updates:

```typescript
import { useRealtimeFeed } from '@/hooks/useRealtimeFeed';

function FeedScreen() {
  const { posts, loading } = useRealtimeFeed(user.id);

  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => <PostCard post={item} />}
    />
  );
}
```

## Media Upload

### Uploading Photos
```typescript
import { postMediaService } from '@/services/postMediaService';

// 1. Pick image
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  quality: 0.8
});

// 2. Upload
const photoUrl = await postMediaService.uploadPostMedia(
  result.uri,
  userId,
  'photo'
);

// 3. Create post with photo
const post = await postService.createPost({
  userId,
  restaurantId,
  content: 'Amazing food!',
  photos: [photoUrl]
});
```

## Cross-Posting to Communities

Posts can be shared to multiple communities:

```typescript
// Create post in communities
const post = await postService.createPost({
  userId,
  restaurantId,
  content: 'Great spot!',
  communityIds: ['community-1-id', 'community-2-id']
});
```

This creates records in `post_communities` junction table.

## Notification Triggers

Post actions automatically create notifications:

**Like:**
```typescript
// When user likes post, create notification for post owner
await notificationService.createLikeNotification(
  post.user_id,      // recipient
  liker.id,          // actor
  liker.name,
  restaurant.name,
  post.id
);
```

**Comment:**
```typescript
// When user comments, notify post owner
await notificationService.createCommentNotification(
  post.user_id,
  commenter.id,
  commenter.name,
  comment.content.substring(0, 50),
  post.id,
  comment.id
);
```

## RLS Policies

### Posts
```sql
-- Anyone can read public posts
CREATE POLICY "Anyone can read posts"
  ON posts FOR SELECT
  USING (true);

-- Users can create their own posts
CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can edit their own posts
CREATE POLICY "Users can edit their posts"
  ON posts FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own posts
CREATE POLICY "Users can delete their posts"
  ON posts FOR DELETE
  USING (user_id = auth.uid());
```

### Engagement
```sql
-- Users can like/unlike
CREATE POLICY "Users can manage likes"
  ON post_likes
  USING (user_id = auth.uid());

-- Users can comment
CREATE POLICY "Users can create comments"
  ON post_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete their comments"
  ON post_comments FOR DELETE
  USING (user_id = auth.uid());
```

## Performance Optimization

### Engagement Counts
Use denormalized counts for performance:

```sql
-- Trigger to update likes_count
CREATE TRIGGER update_likes_count
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();
```

### Indexes
```sql
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_restaurant_id ON posts(restaurant_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
```

### Feed Query Optimization
```typescript
// Use pagination
const posts = await postService.getFollowingFeed(
  userId,
  20,   // Small page size
  page * 20  // Offset
);

// Prefetch related data
const postsWithDetails = await supabase
  .from('posts')
  .select(`
    *,
    users!posts_user_id_fkey(id, name, avatar_url),
    restaurants!posts_restaurant_id_fkey(id, name, rating)
  `)
  .limit(20);
```

## Troubleshooting

### Post Not Appearing in Feed
- Check post was created (query DB)
- Verify user follows post author
- Check RLS policies
- Clear feed cache

### Images Not Loading
- Verify storage bucket permissions
- Check image URL format
- Test direct URL access
- Verify RLS on storage buckets

### Engagement Not Updating
- Check triggers are active
- Verify counts are being updated
- Test individual engagement actions
- Check for RLS blocking queries

## Related Files
- `app/(tabs)/index.tsx` - Feed screen
- `components/PostCard.tsx` - Post display
- `components/CommentsList.tsx` - Comments view
- `hooks/useRealtimeFeed.ts` - Real-time updates
- `types/post.ts` - TypeScript types
