# Delete Post in Community - Immediate UI Update

- Epic: REACTIVE
- Priority: High
- Estimate: 1 day
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -

## Overview
When users delete a post from a community, the post doesn't immediately disappear from the feed. Users have to manually refresh to see the post removed, creating confusion about whether the delete action worked. Additionally, community admins deleting posts should see immediate feedback, and the post count should update accordingly.

## Business Value
- **User Trust**: Immediate feedback confirms the action was successful
- **Admin Experience**: Community moderators need reliable deletion tools
- **Data Integrity**: Proper cleanup of related data (likes, comments, saves)
- **Metric**: Target <200ms perceived response time for delete action

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Delete post from community
  As a community member or admin
  I want immediate visual confirmation when deleting a post
  So that I know the post was removed successfully

  Scenario: User deletes their own post
    Given I am viewing a community feed
    And I see my post in the feed
    When I tap the "..." menu on my post
    And I tap "Delete Post"
    And I confirm deletion
    Then the post disappears from the feed immediately
    And I see a subtle success toast
    And the community post count decrements by 1
    And the post is removed from database

  Scenario: Admin deletes another user's post
    Given I am a community admin
    And I am viewing the community feed
    When I tap "..." menu on a user's post
    And I tap "Delete Post"
    And I provide a reason for deletion
    Then the post disappears from feed immediately
    And the user receives a notification about the deletion
    And the post count updates

  Scenario: Delete fails due to network error
    Given I have initiated a delete action
    And the network fails during deletion
    Then I see an error message
    And the post reappears in the feed
    And I can retry the deletion

  Scenario: Delete post with active likes/comments
    Given a post has 50 likes and 10 comments
    When I delete the post
    Then all related engagement data is cleaned up
    And users who liked/commented see accurate counts
    And no orphaned data remains

  Scenario: Simultaneous deletion by user and admin
    Given a post exists in a community
    When the post author and admin both try to delete it
    Then only one deletion succeeds (idempotent)
    And both users see the post removed
    And no error is shown for duplicate deletion

  Scenario: Delete post while viewing post detail screen
    Given I am viewing the full post detail
    When I delete the post
    Then I am navigated back to the community feed
    And the post is removed from the feed
    And I see success confirmation
```

## Technical Implementation

### Root Causes Identified

1. **No Optimistic UI**: Currently delete calls API then waits for response before updating UI
2. **No Real-time Broadcast**: Other users viewing feed don't see post removed until refresh
3. **Incomplete Cleanup**: Related engagement data (likes, comments) may not cascade properly
4. **No Loading State**: Users don't know if delete is processing

### Components to Modify

#### 1. `app/add/community-detail.tsx` - Add Delete Handling

**Current State**: Lines 68-71 show modal state but implementation is incomplete

**Add Delete Handler**:
```typescript
const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

const handleDeletePost = async (postId: string, reason?: string) => {
  if (!postId) return;

  setDeletingPostId(postId);

  // Optimistic UI update - remove post from feed immediately
  const previousPosts = posts;
  setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));

  // Update post count optimistically
  if (community) {
    setCommunity({
      ...community,
      post_count: Math.max(0, (community.post_count || 0) - 1)
    });
  }

  // Add haptic feedback
  if (Platform.OS === 'ios') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  try {
    const result = await communityAdminService.deletePost(
      postId,
      community?.id || '',
      user?.id || '',
      reason
    );

    if (result.success) {
      ToastService.showSuccess('Post deleted');

      // Broadcast deletion to other users via real-time
      // (handled by service layer)
    } else {
      throw new Error(result.error || 'Failed to delete post');
    }
  } catch (error) {
    console.error('Error deleting post:', error);

    // Revert optimistic update
    setPosts(previousPosts);
    if (community) {
      setCommunity({
        ...community,
        post_count: (community.post_count || 0) + 1
      });
    }

    Alert.alert('Error', 'Failed to delete post. Please try again.');
  } finally {
    setDeletingPostId(null);
    setDeletePostModal({ visible: false, postId: '' });
  }
};
```

#### 2. `services/communityAdminService.ts` - Improve Delete Logic

**Current Implementation**: Likely just calls `supabase.from('posts').delete()`

**Enhanced Implementation**:
```typescript
export class CommunityAdminService {
  private static deletedPostsCache = new Set<string>();

  static async deletePost(
    postId: string,
    communityId: string,
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if already deleted (idempotency)
      if (this.deletedPostsCache.has(postId)) {
        return { success: true };
      }

      // Verify user has permission
      const hasPermission = await this.verifyDeletePermission(
        userId,
        postId,
        communityId
      );

      if (!hasPermission) {
        return {
          success: false,
          error: 'You do not have permission to delete this post'
        };
      }

      // Delete post (cascade will handle related data)
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }

      // Cache deletion to prevent duplicates
      this.deletedPostsCache.add(postId);
      setTimeout(() => this.deletedPostsCache.delete(postId), 5000);

      // Log moderation action if admin deleted
      if (reason) {
        await this.logModerationAction({
          community_id: communityId,
          moderator_id: userId,
          action: 'delete_post',
          target_id: postId,
          reason,
          created_at: new Date().toISOString()
        });
      }

      // Broadcast deletion event via Supabase real-time
      // (handled automatically by database DELETE event)

      return { success: true };
    } catch (error: any) {
      console.error('Error in deletePost:', error);
      return { success: false, error: error.message || 'Network error' };
    }
  }

  private static async verifyDeletePermission(
    userId: string,
    postId: string,
    communityId: string
  ): Promise<boolean> {
    // Check if user is post author
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (post?.user_id === userId) return true;

    // Check if user is community admin/moderator
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .single();

    return membership?.role === 'admin' || membership?.role === 'moderator';
  }
}
```

#### 3. Add Real-time Post Deletion Subscription

**File**: `app/add/community-detail.tsx`

```typescript
useEffect(() => {
  if (!community?.id) return;

  // Subscribe to post deletions
  const channel = supabase
    .channel(`community-posts-${community.id}`)
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'posts',
        filter: `community_id=eq.${community.id}`
      },
      (payload) => {
        // Remove deleted post from local state
        setPosts(prevPosts => prevPosts.filter(p => p.id !== payload.old.id));

        // Decrement post count
        setCommunity(prev => ({
          ...prev!,
          post_count: Math.max(0, (prev!.post_count || 1) - 1)
        }));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [community?.id]);
```

#### 4. `components/PostCard.tsx` - Add Delete Button Styling

**Update Delete Handler**:
```typescript
const handleDelete = () => {
  Alert.alert(
    'Delete Post',
    'Are you sure you want to delete this post? This action cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Call parent's onDelete callback
          onDelete?.(post.id);
        }
      }
    ]
  );
};

// Add loading state during deletion
{deletingPostId === post.id && (
  <View style={styles.deletingOverlay}>
    <ActivityIndicator size="small" color="#fff" />
  </View>
)}
```

### Database Changes

#### Ensure Cascade Deletes
**Migration**: `supabase/migrations/YYYYMMDD_ensure_post_cascade_deletes.sql`

```sql
-- Ensure all post-related tables cascade on delete

-- Post likes
ALTER TABLE post_likes
DROP CONSTRAINT IF EXISTS post_likes_post_id_fkey,
ADD CONSTRAINT post_likes_post_id_fkey
  FOREIGN KEY (post_id)
  REFERENCES posts(id)
  ON DELETE CASCADE;

-- Post comments
ALTER TABLE post_comments
DROP CONSTRAINT IF EXISTS post_comments_post_id_fkey,
ADD CONSTRAINT post_comments_post_id_fkey
  FOREIGN KEY (post_id)
  REFERENCES posts(id)
  ON DELETE CASCADE;

-- Post saves (if separate table)
ALTER TABLE post_saves
DROP CONSTRAINT IF EXISTS post_saves_post_id_fkey,
ADD CONSTRAINT post_saves_post_id_fkey
  FOREIGN KEY (post_id)
  REFERENCES posts(id)
  ON DELETE CASCADE;

-- Post media/attachments
ALTER TABLE post_media
DROP CONSTRAINT IF EXISTS post_media_post_id_fkey,
ADD CONSTRAINT post_media_post_id_fkey
  FOREIGN KEY (post_id)
  REFERENCES posts(id)
  ON DELETE CASCADE;

-- Create trigger to update community post count
CREATE OR REPLACE FUNCTION update_community_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE communities
    SET post_count = GREATEST(COALESCE(post_count, 1) - 1, 0)
    WHERE id = OLD.community_id;
  ELSIF TG_OP = 'INSERT' THEN
    UPDATE communities
    SET post_count = COALESCE(post_count, 0) + 1
    WHERE id = NEW.community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS community_post_count_trigger ON posts;
CREATE TRIGGER community_post_count_trigger
AFTER INSERT OR DELETE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_community_post_count();
```

### UI/UX Improvements

#### 1. Confirmation Dialog
```typescript
// For admin deletes, require reason
const showDeleteConfirmation = (postId: string, isOwnPost: boolean) => {
  if (isOwnPost) {
    // Simple confirmation for own posts
    Alert.alert(
      'Delete Post',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeletePost(postId) }
      ]
    );
  } else {
    // Reason modal for admin deletes
    setDeletePostModal({ visible: true, postId });
  }
};
```

#### 2. Deletion Animation
```typescript
// Slide-out animation before removing from DOM
const animatePostRemoval = (postId: string) => {
  Animated.timing(postOpacity, {
    toValue: 0,
    duration: 200,
    useNativeDriver: true
  }).start(() => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  });
};
```

### Analytics & Telemetry
Track:
- Delete success rate
- Time from delete tap to UI update
- Cascade cleanup success (no orphaned data)
- Admin vs user deletes
- Deletion reasons (for moderation insights)

### Error States and Retries
1. **Network Errors**: Show error, revert UI, allow retry
2. **Permission Errors**: Show clear message (e.g., "Only admins can delete this post")
3. **Already Deleted**: Treat as success (idempotent)
4. **Cascade Failures**: Alert user, provide support contact

## Definition of Done
- [ ] Post disappears from feed immediately on delete (<200ms)
- [ ] Success toast appears after deletion
- [ ] Community post count decrements immediately
- [ ] All related data (likes, comments) cascade delete properly
- [ ] Real-time broadcast removes post for all users viewing feed
- [ ] Deletion animation is smooth and polished
- [ ] Admin deletes require reason (logged for moderation)
- [ ] Unit tests for delete logic
- [ ] E2E tests for delete scenarios
- [ ] Analytics tracking implemented
- [ ] UX reviewed and approved

## Notes
### Related Files
- `app/add/community-detail.tsx` - Community feed screen
- `services/communityAdminService.ts` - Admin service
- `services/postService.ts` - Post service
- `components/PostCard.tsx` - Post card component
- `app/posts/edit/[id].tsx` - Post edit screen

### Edge Cases to Test
1. Delete post while it's being liked by another user
2. Delete post that's being commented on
3. Delete post while viewing post detail screen (should navigate back)
4. Admin and author both try to delete simultaneously
5. Delete post while offline (should queue and retry)

### References
- Reddit's post deletion UX
- Discord's message deletion
- [React Native: Animated API](https://reactnative.dev/docs/animated)
- [Supabase: Row Level Security for Deletes](https://supabase.com/docs/guides/auth/row-level-security)
