# Task 2.3 – Post Enhancement & Engagement Features

**Epic:** 2 – New Features  
**Priority:** High  
**Estimate:** 3 days  
**Status:** 🔴 Not Started

---

## 1. Overview
Implement a full suite of engagement actions for posts—**Like**, **Comment**, **Save**, and **Share**—and ensure that each action is reflected consistently across the UI and integrated into the Activity Feed.

## 2. Business Value
Rich engagement boosts user retention and social proof, driving more time-in-app and organic growth through sharing.

## 3. Dependencies
- Activity Feed (Task 2.1) completed ✅
- Supabase real-time channels for posts table

## 4. Blocks / Enables
- Enables future engagement analytics (e.g., trending posts, recommendations).

## 5. Acceptance Criteria (Gherkin)
```gherkin
Feature: Post Engagement

  Scenario: User likes a post
    Given I am logged in and viewing a post
    When I click the like button
    Then the like button changes to an active state
    And the like count for the post increases by one
    And an entry appears in the activity feed showing I liked the post

  Scenario: User comments on a post
    Given I am viewing the post detail screen
    When I type a comment into the input field and submit it
    Then my new comment appears at the top of the comment list
    And the comment is visible to other users
    And an entry appears in the activity feed showing I commented on a post

  Scenario: User saves a post
    Given I am viewing a post
    When I click the save button
    Then the save button changes to an active state
    And the post is added to my personal "Saved Posts" collection
    And an entry appears in the activity feed showing I saved the post

  Scenario: User shares a post
    Given I am viewing a post
    When I click the share button
    Then a pop-up appears with options to share the post
    And I can copy a direct link to the post detail screen
```

## 6. Technical Implementation
### 6.1 Like / Unlike
1. **UI**: Add `LikeButton` to `PostCard` and `PostDetail` (heart icon).
2. **State**: Local optimistic update via `usePostEngagement` hook.
3. **API**: `POST /posts/{id}/like` and `DELETE /posts/{id}/like` (Supabase RPC). Table `post_likes(user_id, post_id, created_at)`.
4. **Activity**: Supabase trigger inserts into `activity_feed`.

### 6.2 Comment
1. `CommentSection` component with emoji-aware text input.
2. API endpoint `POST /posts/{id}/comment` inserts into `post_comments` table.
3. Real-time subscription for new comments.

### 6.3 Save / Bookmark
1. `SaveButton` (bookmark) component with filled/outline states.
2. `saved_posts(user_id, post_id)` table + `POST /posts/{id}/save` & `DELETE`.
3. Add “Saved Posts” list under user profile (future task).

### 6.4 Share
1. `ShareButton` utilises `Linking` + `Share` API (expo).
2. Generate deep-link URL: `troodie://post/{id}`; web fallback `/posts/{id}`.
3. Add copy-to-clipboard and native share-sheet options.

## 7. Definition of Done
- [ ] Like/unlike reflected instantly & persisted
- [ ] Comment creation is realtime & persists with user avatar/name
- [ ] Save button toggles state and persists in `saved_posts`
- [ ] Share sheet opens with working deep link
- [ ] Activity Feed shows entries for like, comment, save
- [ ] Accessibility labels & tests updated

## 8. Resources
- `components/post/PostCard.tsx`, `components/PostComments.tsx`
- Supabase SQL migration examples under `supabase/migrations/`

## 9. Notes
Estimate includes backend migrations + basic unit tests; analytics events to be added in separate task.

