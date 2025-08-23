# Migration Instructions: Fix Post/Review Distinction

## Issue Fixed
The activity feed was incorrectly labeling all posts as "created a review" even when they were simple posts without ratings.

## What Changed

### 1. Database Migration (`supabase/migrations/20250130_fix_post_review_distinction.sql`)
- Updated the `activity_feed` view to distinguish between reviews and posts based on the presence of a rating
- Posts with ratings show as "wrote a review"
- Posts without ratings show as "shared a post"
- Also updated likes and comments to show appropriate text

### 2. Service Layer (`services/activityFeedService.ts`)
- Updated `transformPostToActivity()` to check if post has rating
- Updated `transformLikeToActivity()` to distinguish between review and post likes
- Updated `transformCommentToActivity()` to distinguish between review and post comments

## How to Apply the Migration

Since this is a production Supabase project, you need to manually apply the migration:

1. **Go to Supabase Dashboard**: 
   - Navigate to: https://app.supabase.com/project/cacrjcekanesymdzpjtt

2. **Open SQL Editor**:
   - Click on "SQL Editor" in the left sidebar

3. **Run the Migration**:
   - Copy the entire contents of `/supabase/migrations/20250130_fix_post_review_distinction.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the migration

4. **Verify the Changes**:
   - The migration will:
     - Drop and recreate the `activity_feed` view
     - Drop and recreate the `get_activity_feed` function
     - Grant necessary permissions
   - You should see "Success" message after running

## Testing

After applying the migration:

1. Create a new post WITHOUT a rating
2. Create a new post WITH a rating
3. Check the activity feed - you should see:
   - Posts without ratings: "shared a post"
   - Posts with ratings: "wrote a review"

## Rollback (if needed)

If you need to rollback, you can re-run the original migration from:
`/supabase/migrations/20250808_fix_schema_issues_with_view.sql`

## Notes

- The frontend code has already been updated to handle the new action text
- The changes are backward compatible - existing activities will display correctly
- Real-time updates will also show the correct distinction