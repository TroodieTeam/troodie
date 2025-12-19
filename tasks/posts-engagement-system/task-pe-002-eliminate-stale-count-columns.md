# Task PE-002: Eliminate Stale Count Columns

**Priority:** P0 - Critical
**Estimated Effort:** 2-3 days
**Dependencies:** PE-001 (Unified Engagement Service)
**Blocks:** None

---

## Summary

Remove the denormalized count columns (`likes_count`, `comments_count`, `saves_count`, `share_count`) from the `posts` table and related database triggers. Replace with on-demand calculation or cached counts.

---

## Problem Statement

The `posts` table currently has denormalized count columns that are maintained by database triggers. This approach has proven unreliable:

### Current Issues

1. **Triggers are unreliable**
   - Multiple migration files attempting to fix triggers:
     - `20250123_dedupe_post_comment_count_triggers.sql`
     - `20250123_fix_stale_comment_counts.sql`
     - `20251009_fix_like_count_triggers.sql`
   - Triggers can fail silently
   - Duplicate triggers have been created accidentally

2. **Performance overhead on writes**
   - Every like/comment/save requires trigger execution
   - Triggers add latency to user actions
   - Concurrent operations can cause race conditions

3. **Counts still need recalculation**
   - `postService.ts` calculates counts on EVERY read anyway:
   ```typescript
   const { commentCounts, likeCounts, saveCounts } = await this.calculateEngagementCounts([postId]);
   postData.comments_count = commentCounts.get(postId) || 0;
   ```
   - This defeats the purpose of having denormalized columns

4. **Debugging complexity**
   - When counts are wrong, is it the trigger? The calculation? The cache?
   - Multiple sources of "truth" make debugging nearly impossible

---

## Solution Design

### Approach: Query-Time Calculation with Caching

Remove the count columns entirely and calculate counts at query time using efficient SQL COUNT queries. Use client-side caching for repeat access.

### Why This Approach?

| Approach | Pros | Cons |
|----------|------|------|
| **Denormalized columns (current)** | Fast reads | Triggers unreliable, stale data |
| **Query-time calculation** | Always accurate | Slight read overhead |
| **Redis/external cache** | Fast & accurate | Infrastructure complexity |
| **Materialized views** | Fast & accurate | PostgreSQL refresh overhead |

For Troodie's scale (thousands of posts, not millions), query-time calculation with client caching is the sweet spot:
- Simple implementation
- Always accurate
- Acceptable performance
- No infrastructure changes

---

## Implementation Steps

### Step 1: Update Queries to Calculate Counts

#### Current Pattern (BAD)
```typescript
// Fetches posts, then separately calculates counts
const { data: postsData } = await supabase.from('posts').select('*');
const { commentCounts, likeCounts, saveCounts } = await this.calculateEngagementCounts(postIds);
```

#### New Pattern (GOOD)
```typescript
// Single query with count subqueries
const { data: postsData } = await supabase
  .from('posts')
  .select(`
    *,
    likes_count:post_likes(count),
    comments_count:post_comments(count),
    saves_count:post_saves(count)
  `)
  .eq('privacy', 'public');
```

Or use a database view:
```sql
CREATE VIEW posts_with_counts AS
SELECT
  p.*,
  (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
  (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count,
  (SELECT COUNT(*) FROM post_saves WHERE post_id = p.id) as saves_count
FROM posts p;
```

### Step 2: Database Migration

```sql
-- Migration: Remove count columns and triggers

-- Step 1: Create the view for backward compatibility during migration
CREATE OR REPLACE VIEW posts_with_engagement AS
SELECT
  p.id,
  p.user_id,
  p.restaurant_id,
  p.caption,
  p.photos,
  p.videos,
  p.rating,
  p.visit_date,
  p.price_range,
  p.visit_type,
  p.tags,
  p.privacy,
  p.created_at,
  p.updated_at,
  p.post_type,
  p.content_type,
  p.external_source,
  p.external_url,
  p.external_title,
  p.external_description,
  p.external_thumbnail,
  p.external_author,
  p.is_trending,
  p.location_lat,
  p.location_lng,
  COALESCE(likes.count, 0)::integer as likes_count,
  COALESCE(comments.count, 0)::integer as comments_count,
  COALESCE(saves.count, 0)::integer as saves_count,
  0::integer as share_count
FROM posts p
LEFT JOIN (
  SELECT post_id, COUNT(*) as count
  FROM post_likes
  GROUP BY post_id
) likes ON likes.post_id = p.id
LEFT JOIN (
  SELECT post_id, COUNT(*) as count
  FROM post_comments
  GROUP BY post_id
) comments ON comments.post_id = p.id
LEFT JOIN (
  SELECT post_id, COUNT(*) as count
  FROM post_saves
  GROUP BY post_id
) saves ON saves.post_id = p.id;

-- Step 2: Drop old triggers
DROP TRIGGER IF EXISTS update_post_likes_count ON post_likes;
DROP TRIGGER IF EXISTS update_post_comments_count ON post_comments;
DROP TRIGGER IF EXISTS update_post_saves_count ON post_saves;
DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON post_comments;
DROP TRIGGER IF EXISTS trg_update_post_comment_count ON post_comments;

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_post_likes_count();
DROP FUNCTION IF EXISTS update_post_comments_count();
DROP FUNCTION IF EXISTS update_post_saves_count();
DROP FUNCTION IF EXISTS fn_update_post_comment_count();

-- Step 3: Remove columns (AFTER confirming app works with view)
-- ALTER TABLE posts DROP COLUMN IF EXISTS likes_count;
-- ALTER TABLE posts DROP COLUMN IF EXISTS comments_count;
-- ALTER TABLE posts DROP COLUMN IF EXISTS saves_count;
-- ALTER TABLE posts DROP COLUMN IF EXISTS share_count;
```

### Step 3: Update TypeScript Types

```typescript
// types/post.ts

// Remove count columns from Post type
// They will come from the view or be calculated

export interface PostWithEngagement extends Post {
  // These come from the view or calculation
  likes_count: number;
  comments_count: number;
  saves_count: number;
  share_count: number;

  // User-specific
  is_liked_by_user?: boolean;
  is_saved_by_user?: boolean;
}
```

### Step 4: Update postService.ts

```typescript
class PostService {
  /**
   * Get posts with engagement counts
   * Uses the posts_with_engagement view for accurate counts
   */
  async getPostsWithEngagement(options: GetPostsOptions): Promise<PostWithEngagement[]> {
    const { data, error } = await supabase
      .from('posts_with_engagement') // Use view instead of posts table
      .select('*')
      .eq('privacy', 'public')
      .order('created_at', { ascending: false })
      .range(options.offset || 0, (options.offset || 0) + (options.limit || 20) - 1);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get single post with engagement
   */
  async getPost(postId: string): Promise<PostWithEngagement | null> {
    const { data, error } = await supabase
      .from('posts_with_engagement')
      .select('*')
      .eq('id', postId)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  // REMOVE calculateEngagementCounts() method entirely
  // It's no longer needed!
}
```

---

## Performance Considerations

### Indexing

Ensure proper indexes exist for count queries:

```sql
-- These should already exist, but verify:
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_saves_post_id ON post_saves(post_id);
```

### Query Performance

The view with COUNT subqueries may be slower than denormalized columns for very large datasets. Mitigation strategies:

1. **Client-side caching** (implemented in PE-001)
2. **Materialized view** (if needed in future):
   ```sql
   CREATE MATERIALIZED VIEW posts_engagement_mv AS
   SELECT ... (same as view)

   -- Refresh periodically
   REFRESH MATERIALIZED VIEW CONCURRENTLY posts_engagement_mv;
   ```

### Benchmark

Before/after benchmarks to run:
- Single post fetch
- Feed fetch (20 posts)
- Explore fetch (50 posts)
- Profile posts fetch

Expected: < 50ms overhead for typical queries.

---

## Migration Strategy

### Phase 1: Add View (No Breaking Changes)
1. Create `posts_with_engagement` view
2. Update services to use view
3. Keep columns and triggers active as backup

### Phase 2: Verify & Monitor
1. Deploy to staging
2. Run automated tests
3. Monitor performance
4. Verify counts match between view and columns

### Phase 3: Remove Old Infrastructure
1. Disable triggers
2. Remove trigger functions
3. Remove columns (after 1 week of monitoring)

---

## Rollback Plan

If issues occur:
1. Re-enable triggers
2. Revert services to use columns
3. Run count reconciliation script:
   ```sql
   UPDATE posts p SET
     likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id),
     comments_count = (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id),
     saves_count = (SELECT COUNT(*) FROM post_saves WHERE post_id = p.id);
   ```

---

## Testing Requirements

### Unit Tests
- [ ] View returns correct counts for post with likes
- [ ] View returns correct counts for post with comments
- [ ] View returns 0 for posts with no engagement
- [ ] Counts update in real-time (no caching issues)

### Integration Tests
- [ ] Full feed load performance
- [ ] Like/unlike updates count immediately
- [ ] Comment add/delete updates count immediately
- [ ] Concurrent operations don't cause issues

### Manual Tests
- [ ] Feed loads correctly
- [ ] Post detail shows correct counts
- [ ] Engagement actions reflect immediately
- [ ] No count mismatches observed

---

## Success Criteria

- [ ] Count columns removed from `posts` table
- [ ] All trigger functions removed
- [ ] Services use view or calculated counts
- [ ] No count mismatch bugs
- [ ] Performance acceptable (< 50ms overhead)
- [ ] Zero debugging docs needed for count issues

---

## Files to Modify

### Create
- `supabase/migrations/YYYYMMDD_add_posts_engagement_view.sql`
- `supabase/migrations/YYYYMMDD_remove_count_columns.sql`

### Modify
- `services/postService.ts` - Use view, remove calculateEngagementCounts
- `types/post.ts` - Update types

### Delete
- Debug docs about count mismatches
- Trigger fix migration files (after successful migration)
