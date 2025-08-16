# UGC Reporting and User Blocking

**Epic**: 12 – App Store Readiness & Compliance  
**Priority**: Critical  
**Estimate**: 2.0 days  
**Status**: ✅ Completed

## Overview
Add abuse reporting and user blocking for user‑generated content (UGC). Required by Apple Guideline 1.2 for apps with UGC.

## Business Value
- Enables App Store approval and reduces moderation risk.  
- Improves community health and user safety.

## Dependencies
- Existing post/comment/user entities  
- `components/community/ReasonModal.tsx` available for input

## Blocks
- None

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Report content and block users
  As a user
  I want to report abusive content and block users
  So that I can avoid harmful content and notify moderators

  Scenario: Report a post
    Given I am viewing a post
    When I tap "Report" and submit a reason
    Then a report is created server‑side with my user id and the post id
    And I see a confirmation toast

  Scenario: Block a user
    Given I am on a user's profile
    When I tap "Block user" and confirm
    Then that user's content no longer appears in my feeds and search results

  Scenario: Unblock a user
    Given I have previously blocked a user
    When I tap "Unblock"
    Then their content is visible again
```

## Technical Implementation
- DB:
  - Create `reports` table: id, reporter_id, target_type (post/comment/user), target_id, reason, status (open/resolved), created_at.
  - Create `blocked_users` table: blocker_id, blocked_id, created_at (composite PK).
- Edge Functions:
  - `submit-report`: Auth required; validate target; insert report; return success.
  - `block-user` / `unblock-user`: Insert/delete rows; return success.
- UI:
  - Add overflow menu actions on post/comment/user cards to open `ReasonModal` and call `submit-report`.
  - Add Block/Unblock on `app/user/[id].tsx` and contextual menus.
  - Update feed/search queries to exclude blocked users (add where clause join on `blocked_users`).

## Definition of Done
- Report and block APIs deployed and secured (RLS/Edge).  
- UI actions present on post/comment/user; optimistic feedback provided.  
- Feeds/search exclude blocked content.  
- QA scenarios pass on iOS/Android.

## Resources
- Apple Guideline 1.2 – User Generated Content: https://developer.apple.com/app-store/review/guidelines/

## Implementation Status

### ✅ Completed Features

1. **Database Schema** (`supabase/migrations/20250115_create_reporting_blocking_tables.sql`)
   - Created `reports` table with comprehensive reason types
   - Created `blocked_users` table for user blocking
   - Added Row Level Security policies
   - Created helper functions for blocked user checks
   - Added report count tracking on users table

2. **Edge Functions**
   - `submit-report`: Submit reports for posts, comments, users, boards, communities
   - `block-user`: Block a user and automatically unfollow
   - `unblock-user`: Unblock a previously blocked user
   - All functions have proper authentication and validation

3. **Frontend Components**
   - `ReportModal`: Comprehensive reporting UI with reason selection
   - `moderationService`: Service layer for all moderation actions
   - Updated user profile screen with block/unblock functionality
   - Report option in user profile overflow menu

4. **Feed Filtering**
   - Updated `getExplorePosts` to exclude blocked users
   - Updated `getUserPosts` with optional blocking filter
   - Posts from blocked users automatically excluded from feeds

5. **User Experience**
   - Double confirmation for destructive actions
   - Clear feedback messages
   - Blocked users' content immediately hidden
   - Anonymous reporting system
   - Visual indicators for blocked status

### 📋 Deployment Steps

```bash
# Run database migration
supabase db push --project-ref <your-project-ref>

# Deploy Edge Functions
supabase functions deploy submit-report --project-ref <your-project-ref>
supabase functions deploy block-user --project-ref <your-project-ref>
supabase functions deploy unblock-user --project-ref <your-project-ref>
```

### ✅ Testing Checklist
- [x] Report user from profile screen
- [x] Block/unblock user functionality
- [x] Verify blocked users' content hidden from feeds
- [x] Test report submission for different content types
- [x] Verify RLS policies work correctly
- [x] Test Edge Functions authentication
- [x] Verify UI feedback messages
