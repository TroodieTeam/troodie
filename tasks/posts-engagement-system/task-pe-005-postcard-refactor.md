# Task PE-005: PostCard Component Refactor

**Priority:** P2 - Medium
**Estimated Effort:** 2-3 days
**Dependencies:** PE-003 (Engagement State Machine)
**Blocks:** None

---

## Summary

Refactor the monolithic PostCard component (983 lines) into smaller, focused, reusable components following composition patterns used by Instagram and Twitter.

---

## Problem Statement

`PostCard.tsx` currently handles too many responsibilities:

### Current Responsibilities (All in one component!)

1. **User Header** - Avatar, name, verified badge, persona, navigation
2. **Timestamp** - Time formatting and display
3. **Menu** - Edit, delete, report, block options
4. **Content Type Badge** - External content / Discussion indicators
5. **Caption** - Text display with truncation
6. **External Content** - Preview for TikTok/Instagram embeds
7. **Photo Grid** - Single photo, multi-photo grid, overflow count
8. **Video Grid** - Video thumbnails with play overlay
9. **Restaurant Info** - Restaurant card with navigation
10. **Rating Display** - Traffic light AND star rating systems
11. **Visit Info** - Visit type icons and labels
12. **Tags** - Tag chips with overflow
13. **Action Buttons** - Like, comment, save, share with counts
14. **Image Viewer Modal** - Full-screen image viewing
15. **Video Viewer Modal** - Full-screen video playback
16. **Report Modal** - Report functionality
17. **State Management** - Engagement state via hook

### Impact

- 983 lines is too large to maintain
- Impossible to test individual pieces
- Can't reuse individual components elsewhere
- Performance concerns from large render function
- Hard to find bugs

---

## Solution Design

### New Component Structure

```
components/
  post/
    index.ts                      # Re-exports
    PostCard.tsx                  # ~150 lines - Composition root
    PostHeader.tsx                # User info + menu
    PostContent.tsx               # Caption + badges
    PostMedia/
      index.tsx                   # Media container
      PhotoGrid.tsx               # Photo display
      VideoGrid.tsx               # Video display
    PostRestaurantInfo.tsx        # Restaurant mini-card
    PostEngagementBar.tsx         # Like/comment/save/share
    PostMeta.tsx                  # Tags, visit info, rating
```

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PostCard                                 │
│  (Composition Root - ~150 lines)                                │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ PostHeader                                                  │ │
│  │ - UserInfo (avatar, name, verified)                        │ │
│  │ - Timestamp                                                │ │
│  │ - MenuButton                                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ PostContent                                                 │ │
│  │ - ContentTypeBadge (if external/discussion)                │ │
│  │ - Caption                                                  │ │
│  │ - ExternalContentPreview (if external)                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ PostMedia                                                   │ │
│  │ - PhotoGrid OR VideoGrid                                   │ │
│  │ - Handles tap to open viewer                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ PostRestaurantInfo (if restaurant post)                    │ │
│  │ - Restaurant mini-card                                     │ │
│  │ - Rating display                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ PostMeta                                                    │ │
│  │ - Tags                                                     │ │
│  │ - Visit info                                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ PostEngagementBar                                          │ │
│  │ - Like button + count                                      │ │
│  │ - Comment button + count                                   │ │
│  │ - Save button + count                                      │ │
│  │ - Share button + count                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Modals (Portal rendered)                                       │
│  - ImageViewer                                                  │
│  - VideoViewer                                                  │
│  - ReportModal                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// components/post/PostCard.tsx (~150 lines)

import { PostWithUser } from '@/types/post';
import { usePostEngagementState } from '@/hooks/usePostEngagementState';
import { PostHeader } from './PostHeader';
import { PostContent } from './PostContent';
import { PostMedia } from './PostMedia';
import { PostRestaurantInfo } from './PostRestaurantInfo';
import { PostMeta } from './PostMeta';
import { PostEngagementBar } from './PostEngagementBar';

interface PostCardProps {
  post: PostWithUser;
  onPress?: () => void;
  showActions?: boolean;
}

export function PostCard({ post, onPress, showActions = true }: PostCardProps) {
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showVideoViewer, setShowVideoViewer] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);

  // Single source of truth for engagement
  const engagement = usePostEngagementState(post.id);

  // Initialize engagement state
  useEffect(() => {
    engagement.initialize({
      likesCount: post.likes_count,
      commentsCount: post.comments_count,
      savesCount: post.saves_count,
      userLiked: post.is_liked_by_user,
      userSaved: post.is_saved_by_user,
    });
  }, [post.id]);

  const handleMediaPress = (index: number, type: 'photo' | 'video') => {
    setMediaIndex(index);
    if (type === 'photo') {
      setShowImageViewer(true);
    } else {
      setShowVideoViewer(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <PostHeader
          user={post.user}
          timestamp={post.created_at}
          isOwnPost={user?.id === post.user?.id}
          onReport={() => setShowReportModal(true)}
          onEdit={() => router.push(`/posts/edit/${post.id}`)}
          onDelete={() => handleDelete()}
          onBlock={() => handleBlock()}
        />

        <PostContent
          caption={post.caption}
          contentType={post.content_type}
          postType={post.post_type}
          externalContent={post}
        />

        <PostMedia
          photos={post.photos}
          videos={post.videos}
          contentType={post.content_type}
          onPhotoPress={(index) => handleMediaPress(index, 'photo')}
          onVideoPress={(index) => handleMediaPress(index, 'video')}
        />

        {post.restaurant && (
          <PostRestaurantInfo
            restaurant={post.restaurant}
            rating={post.rating}
          />
        )}

        <PostMeta
          tags={post.tags}
          visitType={post.visit_type}
          priceRange={post.price_range}
          rating={post.rating}
        />

        {showActions && (
          <PostEngagementBar
            postId={post.id}
            {...engagement}
          />
        )}
      </TouchableOpacity>

      {/* Modals */}
      <ImageViewer
        visible={showImageViewer}
        images={post.photos || []}
        initialIndex={mediaIndex}
        onClose={() => setShowImageViewer(false)}
      />

      <VideoViewer
        visible={showVideoViewer}
        videos={post.videos || []}
        initialIndex={mediaIndex}
        onClose={() => setShowVideoViewer(false)}
      />

      <ReportModal
        visible={showReportModal}
        contentType="post"
        contentId={post.id}
        onClose={() => setShowReportModal(false)}
      />
    </>
  );
}
```

### Individual Components

```typescript
// components/post/PostHeader.tsx (~100 lines)

interface PostHeaderProps {
  user: UserInfo;
  timestamp: string;
  isOwnPost: boolean;
  onReport: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onBlock: () => void;
}

export function PostHeader({
  user,
  timestamp,
  isOwnPost,
  onReport,
  onEdit,
  onDelete,
  onBlock,
}: PostHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => router.push(`/user/${user.id}`)}
      >
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
        <View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user.name}</Text>
            {user.verified && <VerifiedBadge />}
          </View>
          <Text style={styles.persona}>{user.persona}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.headerRight}>
        <Text style={styles.timestamp}>{formatTimeAgo(timestamp)}</Text>
        <PostMenu
          isOwnPost={isOwnPost}
          onReport={onReport}
          onEdit={onEdit}
          onDelete={onDelete}
          onBlock={onBlock}
        />
      </View>
    </View>
  );
}
```

```typescript
// components/post/PostEngagementBar.tsx (~80 lines)

interface PostEngagementBarProps {
  postId: string;
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  shareCount: number;
  isLiked: boolean;
  isSaved: boolean;
  optimisticLike: () => () => void;
  optimisticSave: () => () => void;
}

export function PostEngagementBar({
  postId,
  likesCount,
  commentsCount,
  savesCount,
  shareCount,
  isLiked,
  isSaved,
  optimisticLike,
  optimisticSave,
}: PostEngagementBarProps) {
  const router = useRouter();
  const { user } = useAuth();

  const handleLike = async () => {
    if (!user) return;
    const rollback = optimisticLike();
    try {
      await engagementService.likes.toggle(postId, user.id);
    } catch {
      rollback();
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const rollback = optimisticSave();
    try {
      await engagementService.saves.toggle(postId, user.id);
    } catch {
      rollback();
    }
  };

  return (
    <View style={styles.actions}>
      <EngagementButton
        icon={isLiked ? 'heart' : 'heart-outline'}
        count={likesCount}
        active={isLiked}
        activeColor="#FF4444"
        onPress={handleLike}
      />
      <EngagementButton
        icon="chatbubble-outline"
        count={commentsCount}
        onPress={() => router.push(`/posts/${postId}/comments`)}
      />
      <EngagementButton
        icon={isSaved ? 'bookmark' : 'bookmark-outline'}
        count={savesCount}
        active={isSaved}
        activeColor={designTokens.colors.primaryOrange}
        onPress={handleSave}
      />
      <EngagementButton
        icon="share-outline"
        count={shareCount}
        onPress={() => handleShare(postId)}
      />
    </View>
  );
}
```

---

## Benefits

1. **Maintainability** - Each component under 150 lines
2. **Testability** - Can test each piece in isolation
3. **Reusability** - Use PostHeader elsewhere, use EngagementBar elsewhere
4. **Performance** - Memoization at component boundaries
5. **Readability** - Clear separation of concerns

---

## Implementation Steps

### Step 1: Create Component Structure
1. Create `components/post/` directory
2. Create empty component files
3. Set up index.ts exports

### Step 2: Extract Components
1. Extract PostHeader
2. Extract PostContent
3. Extract PostMedia (PhotoGrid, VideoGrid)
4. Extract PostRestaurantInfo
5. Extract PostMeta
6. Extract PostEngagementBar

### Step 3: Create Composition Root
1. Create new PostCard that composes all pieces
2. Ensure all functionality preserved

### Step 4: Migration
1. Update imports across codebase
2. Run full test suite
3. Visual regression testing

### Step 5: Cleanup
1. Remove old PostCard.tsx
2. Remove unused styles
3. Update documentation

---

## Testing Requirements

### Unit Tests
- [ ] PostHeader renders correctly
- [ ] PostEngagementBar handles like/save
- [ ] PostMedia handles photo/video display
- [ ] PostRestaurantInfo navigates correctly

### Integration Tests
- [ ] Full PostCard renders all pieces
- [ ] Engagement actions work correctly
- [ ] Modals open/close correctly

### Visual Tests
- [ ] No visual regressions
- [ ] Responsive on different screen sizes

---

## Success Criteria

- [ ] No single component exceeds 200 lines
- [ ] All existing functionality preserved
- [ ] Components are reusable
- [ ] Tests cover each component
- [ ] Performance maintained or improved

---

## Files to Create

- `components/post/index.ts`
- `components/post/PostCard.tsx`
- `components/post/PostHeader.tsx`
- `components/post/PostContent.tsx`
- `components/post/PostMedia/index.tsx`
- `components/post/PostMedia/PhotoGrid.tsx`
- `components/post/PostMedia/VideoGrid.tsx`
- `components/post/PostRestaurantInfo.tsx`
- `components/post/PostMeta.tsx`
- `components/post/PostEngagementBar.tsx`
- `components/post/PostMenu.tsx`

## Files to Modify

- All imports of PostCard

## Files to Delete

- `components/PostCard.tsx` (after migration complete)
