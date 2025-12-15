# Industry-Standard Comment Count Design

## Problem with Stale Denormalized Data

**Bad Pattern (What we had):**
- Store `posts.comments_count` column
- Update via triggers
- Column can become stale
- Requires "fixing" stale data

**Why it's bad:**
- Data inconsistency
- Race conditions
- Maintenance overhead
- "Fixing" stale data is a code smell

## Industry Standard Approach (Twitter/Instagram)

**Single Source of Truth:**
- **Count is calculated from actual data** (`post_comments` table)
- **No denormalized columns** (or ignore them if they exist)
- **Realtime subscriptions** to actual data changes
- **Calculate on read** for accuracy

## Our Implementation

### 1. **Reading Counts (Always Accurate)**

```typescript
// postService.getExplorePosts()
// Calculate counts from actual data, not columns
const { data: commentCountsData } = await supabase
  .from('post_comments')
  .select('post_id')
  .in('post_id', postIds);

// Count comments per post
const commentCountsMap = new Map<string, number>();
commentCountsData.forEach((c) => {
  commentCountsMap.set(c.post_id, (commentCountsMap.get(c.post_id) || 0) + 1);
});

// Override with calculated values
postsData.forEach((post) => {
  post.comments_count = commentCountsMap.get(post.id) || 0;
});
```

### 2. **Realtime Updates (Subscribe to Actual Data)**

```typescript
// usePostEngagement hook
// Subscribe to post_comments table INSERT/DELETE events
realtimeManager.subscribe(
  `post-comments-${postId}`,
  {
    table: 'post_comments',
    event: '*', // INSERT and DELETE
    filter: `post_id=eq.${postId}`
  },
  (comment, eventType) => {
    if (eventType === 'INSERT') {
      setCommentsCount(prev => prev + 1);
    } else if (eventType === 'DELETE') {
      setCommentsCount(prev => Math.max(prev - 1, 0));
    }
  }
);
```

### 3. **Benefits**

✅ **Always Accurate** - Count matches actual data  
✅ **No Stale Data** - No need to "fix" counts  
✅ **Simple** - Single source of truth  
✅ **Reactive** - Realtime updates work correctly  
✅ **Industry Standard** - How Twitter/Instagram do it  

### 4. **Performance**

- **Indexes**: `CREATE INDEX idx_post_comments_post_id ON post_comments(post_id)`
- **Batch Counting**: Count all posts in one query
- **Caching**: Can add Redis/cache layer later if needed

## Migration Path

1. ✅ Calculate counts from `post_comments` table (done)
2. ✅ Subscribe to `post_comments` INSERT/DELETE events (done)
3. ⏳ Remove triggers (optional - they're harmless but unnecessary)
4. ⏳ Remove `comments_count` column (optional - can keep for backward compatibility)

## Key Principle

**"The count is the number of rows in `post_comments` table, not a stored value."**
