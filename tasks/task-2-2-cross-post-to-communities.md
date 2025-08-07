# Task 2.2 – Enable Cross-Posting to Communities

**Epic:** 2 – New Features  
**Priority:** High  
**Estimate:** 1.5 days  
**Status:** 🔴 Not Started

---

## 1. Overview
Allow users to select one or more communities during the post creation flow so that the post is automatically shared in those community feeds in addition to the user profile.

## 2. Business Value
Cross-posting amplifies content reach, drives community engagement, and incentivizes users to join relevant communities.

## 3. Dependencies
- Community membership data must be accurate (communityService).

## 4. Blocks / Enables
- Unlocks future features like community-specific analytics & notifications on cross-posts.

## 5. Acceptance Criteria (Gherkin)
```gherkin
Feature: Cross-Post Content to Communities
  Scenario: Creating a post with community selection
    Given I am on the post creation screen
    When I select one or more communities during the post setup
    Then the post is shared to those communities upon posting
    And it appears in both my profile and the selected community feeds
```

## 6. Technical Implementation
1. **UI**: Add “Select communities” step in `app/add/create-post.tsx` wizard – multiselect modal listing joined communities.
2. **DB**: Posts table already has `community_id` FK; for multi-community, create join table `post_communities (post_id, community_id)`.
3. **API**: Update `postService.createPost` to insert into join table and trigger supabase function to fan-out notifications.
4. **Feeds**: Extend `useRealtimeCommunity` to include posts from `post_communities` join.

## 7. Definition of Done
- [ ] User can select ≥1 community before posting
- [ ] Post appears in each selected community feed within 2s
- [ ] DB schema migration applied & tested
- [ ] Unit tests for service + SQL trigger

## 8. Resources
- `services/postService.ts`
- `supabase/migrations/*` examples for join tables.

## 9. Notes
Consider limit of max 3 communities per post to avoid spam.
