# Debug Comment Count Issue

## Problem
PostCard shows 6 comments but database has 8 comments. Even after refresh, still shows 6.

## Data Flow

1. **Database Query** (`postService.getExplorePosts`)
   - Query: `SELECT * FROM posts WHERE privacy = 'public'`
   - Returns: `posts.comments_count` column
   - Location: `services/postService.ts:456`

2. **Initial State** (`PostCard` → `usePostEngagement`)
   - `PostCard` receives `post.comments_count` from query
   - Passes to `usePostEngagement` as `initialStats.comments_count`
   - Location: `components/PostCard.tsx:80-84`

3. **Realtime Updates** (`usePostEngagement`)
   - Subscribes to `posts` table UPDATE events
   - Should update `commentsCount` state when trigger fires
   - Location: `hooks/usePostEngagement.ts:131-170`

## Diagnostic Queries

Run these in Supabase SQL editor to verify:

```sql
-- 1. Check actual comment count in database
SELECT 
  p.id,
  p.caption,
  p.comments_count as db_count,
  COUNT(pc.id) as actual_count
FROM posts p
LEFT JOIN post_comments pc ON pc.post_id = p.id
WHERE p.caption LIKE '%Troodie post%'
GROUP BY p.id, p.caption, p.comments_count;

-- 2. Check if trigger exists and is enabled
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'post_comments'
  AND trigger_name LIKE '%comment%';

-- 3. Check trigger function
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'update_post_comments_count';

-- 4. Manually verify a specific post
SELECT 
  id,
  caption,
  comments_count,
  updated_at
FROM posts
WHERE caption LIKE '%Troodie post%'
ORDER BY created_at DESC
LIMIT 1;

-- 5. Count actual comments for that post
SELECT COUNT(*) as actual_comment_count
FROM post_comments
WHERE post_id = '<POST_ID_FROM_ABOVE>';
```

## Possible Issues

1. **Trigger not updating `updated_at`**
   - Fix: Migration `20250123_dedupe_post_comment_count_triggers.sql` should update `updated_at`
   - Verify: Check if migration was applied

2. **Trigger not firing**
   - Check: Run diagnostic query #2 above
   - Fix: Re-run migration if trigger is missing

3. **Database has stale `comments_count`**
   - Check: Compare `db_count` vs `actual_count` in query #1
   - Fix: Recalculate counts (see migration step 5)

4. **Query caching**
   - Check: No caching found in `postService.ts`
   - Verify: Query uses `.select('*')` which includes `comments_count`

5. **Realtime subscription not receiving updates**
   - Check: Look for `[usePostEngagement] Realtime update` logs
   - Fix: Ensure trigger updates `updated_at` (see issue #1)

## Fix Steps

1. **Verify database state:**
   ```sql
   -- Run query #1 above to see if counts match
   ```

2. **Recalculate counts if needed:**
   ```sql
   UPDATE posts 
   SET comments_count = (
     SELECT COUNT(*) 
     FROM post_comments 
     WHERE post_comments.post_id = posts.id
   );
   ```

3. **Verify trigger is working:**
   ```sql
   -- Insert a test comment and check if posts.comments_count increments
   INSERT INTO post_comments (post_id, user_id, content)
   VALUES ('<POST_ID>', '<USER_ID>', 'test');
   
   -- Check if count updated
   SELECT comments_count FROM posts WHERE id = '<POST_ID>';
   ```

4. **Check if migration was applied:**
   ```sql
   -- Should show trigger that updates updated_at
   SELECT prosrc FROM pg_proc WHERE proname = 'update_post_comments_count';
   -- Look for: SET updated_at = NOW()
   ```

