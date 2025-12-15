## Post comments modal: architecture + manual test guide

### What changed (high signal)
- **Canonical post detail route**: `app/posts/[id]/index.tsx`
- **Legacy compatibility route**: `app/post/[id].tsx` now redirects to `/posts/[id]`
- **New “Twitter-style” comments modal**: `app/posts/[id]/comments.tsx` (presentation: `modal`)
- **Comment count correctness**: DB now enforces **one** trigger path for `posts.comments_count`, and UI uses **realtime posts updates** (no manual increments).

---

## New app structure (files + responsibilities)

### Routes
- **Post detail**: `app/posts/[id]/index.tsx`
  - Shows post content + engagement row.
  - `open-comments-button` opens modal: `router.push(\`/posts/${post.id}/comments\`)`
  - Comment count displayed is from `usePostEngagement` realtime stats.

- **Comments modal**: `app/posts/[id]/comments.tsx`
  - Displays a compact post header (author + caption).
  - Shows **top-level comments** in a `FlatList`.
  - Supports **threaded replies** via `parent_comment_id`.
  - Composer is pinned to bottom (Twitter-ish), includes “Replying to @username” state.
  - Realtime keeps the comment list reactive.
  - TestIDs:
    - `comment-input`
    - `comment-send`
    - `close-comments-modal`

- **Legacy post route**: `app/post/[id].tsx`
  - `router.replace(\`/posts/${id}\`)`

### Services / data access
- **Comment CRUD**: `services/commentService.ts`
  - `listTopLevelComments({ postId, limit, cursorCreatedAt })`
  - `listReplies({ parentCommentId, limit })`
  - `createComment({ postId, userId, content, parentCommentId })`
  - `deleteComment(commentId)`
  - Notes:
    - Uses `post_comments` as the source of truth.
    - Hydrates user info via batched `users.in('id', ...)` (no per-comment N+1).

### Engagement + realtime
- **Post stats realtime**: `hooks/usePostEngagement.ts`
  - Subscribes to `posts` UPDATE and sets `likesCount/commentsCount/savesCount/shareCount`.
  - **No longer increments `commentsCount`** on `post_comments` INSERT (prevents double-count drift).
  - Does **not** ignore updates by `user.id` for `posts` (because `posts.user_id` is the post author, not the actor).

- **Realtime plumbing**: `services/realtimeManager.ts`
  - Shared subscription helper used by `usePostEngagement` and the comments modal.

### DB (comment count correctness)
- **Dedup migration**: `supabase/migrations/20251212_dedupe_post_comment_count_triggers.sql`
  - Drops any legacy/duplicate triggers on `post_comments`.
  - Recreates a single `update_post_comments_count_trigger`.
  - Recomputes `posts.comments_count` from `post_comments`.

---

## Manual test guide (no Maestro)

### Pre-req
- Use any authenticated account that can create posts and comments.
- If you’re validating DB trigger behavior, run migrations to ensure `20251212_dedupe_post_comment_count_triggers.sql` is applied on the environment you’re testing.

### 1) Open comments modal (UX sanity)
1. Open any post: `Explore` → tap a post card → you land on `app/posts/[id]/index.tsx`.
2. Tap the comment icon / count (button has testID `open-comments-button`).
3. Expect:
   - Modal slides in (presentation modal).
   - Title “Replies”.
   - Post header visible (author + caption).
   - Pinned composer at bottom (input + Reply button).

### 2) Create a top-level comment (optimistic + realtime count)
1. In the modal, type in the composer and tap **Reply**.
2. Expect immediately:
   - The new comment appears at the top of the list (optimistic).
   - It may show “sending” briefly.
3. Expect within a moment:
   - Optimistic comment is replaced by the real row (UUID id).
4. Close modal.
5. On post detail, expect:
   - Comment count increments **without refresh** (driven by realtime `posts` UPDATE).

### 3) Create a reply (threaded)
1. Re-open the modal.
2. Tap **Reply** on an existing top-level comment.
3. Expect:
   - “Replying to @username” appears above the composer with an “x” cancel.
4. Type reply and tap **Reply**.
5. Expect:
   - Replies section auto-expands for that thread.
   - Reply appears under the parent comment (optimistic then reconciled).
6. Close modal, verify post detail count increments (still one count for total comments including replies).

### 4) Delete comment / reply (count decrements, UI stays consistent)
1. In the modal, delete one of your own comments/replies.
2. Expect:
   - It disappears immediately (optimistic).
   - Post detail comment count decrements via realtime `posts` UPDATE (no manual refresh).

### 5) Multi-device realtime (if you want to be sure)
1. On device A, open a post detail screen.
2. On device B (different user), open same post and add a comment.
3. Expect on device A:
   - Comment count updates in real-time.
4. Open modal on device A:
   - Comment list includes the new comment (either via realtime subscription or reload).

---

## Debug checklist (when something looks off)

### Count is off
- Confirm only one trigger exists on `post_comments` updating `posts.comments_count`.
  - Apply `supabase/migrations/20251212_dedupe_post_comment_count_triggers.sql` to the environment.
- Confirm UI isn’t manually incrementing counts:
  - `hooks/usePostEngagement.ts` should not increment commentsCount on `post_comments` INSERT.
  - No `DeviceEventEmitter` “comment-added” increments (removed from Explore).

### Comment appears twice
- This usually means “optimistic + realtime INSERT echo” isn’t being deduped.
  - Comments modal currently dedupes by `id` (so duplicates should only happen if you insert twice).

### Modal scrolling feels bad
- Verify you’re using the modal (`/posts/[id]/comments`) and not trying to render comments inline.
  - Post detail no longer mounts a `PostComments` component; it delegates entirely to modal.



