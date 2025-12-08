# Task CM-16: Implement Creator Rating System

**Priority:** 🟡 P2 - Medium
**Severity:** Medium
**Feature:** CM-9 (Browse Creators), Campaign Completion Flow
**Estimated Effort:** 1-2 days
**Status:** Not Started
**Related Audit:** `.tasks/creator-marketplace-audit-findings.md` - Issue #9

---

## Problem Statement

Currently, creator ratings are completely fake/random:
```typescript
const rating = completedCampaigns > 0 ? 4.5 + Math.random() * 0.5 : 0;
```

This provides no value to businesses trying to evaluate creators and creates a false sense of quality. We need a real rating system where businesses can rate creators after campaign completion.

---

## Current State

**Location:** `app/(tabs)/business/creators/browse.tsx:90`

**Current Implementation:**
- Ratings are randomly generated between 4.5-5.0
- No actual rating data collected
- No way for businesses to rate creators
- Ratings displayed but meaningless

---

## Technical Requirements

### 1. Database Schema

**Option A: Add rating column to `campaign_applications` table**

```sql
-- Migration: supabase/migrations/YYYYMMDD_add_creator_ratings.sql

-- Add rating column to campaign_applications
ALTER TABLE campaign_applications
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) CHECK (rating >= 1.0 AND rating <= 5.0),
ADD COLUMN IF NOT EXISTS rating_comment TEXT,
ADD COLUMN IF NOT EXISTS rated_at TIMESTAMP WITH TIME ZONE;

-- Add index for rating queries
CREATE INDEX IF NOT EXISTS idx_campaign_applications_rating 
ON campaign_applications(creator_id, rating) 
WHERE rating IS NOT NULL;

-- Add comment
COMMENT ON COLUMN campaign_applications.rating IS
'Business rating of creator performance (1.0-5.0), set after campaign completion';
```

**Why this approach:**
- Rating is tied to a specific campaign completion
- One rating per completed campaign
- Can calculate average rating per creator
- Simple to query and aggregate

### 2. Rating UI for Businesses

**File:** `app/(tabs)/business/campaigns/[id]/index.tsx` or new rating modal

**When to show:**
- After campaign is completed
- When viewing completed campaign details
- One-time rating (can't change once submitted)

**UI Components:**
```tsx
// Rating Modal
<Modal visible={showRatingModal}>
  <Text>Rate Creator Performance</Text>
  <StarRating 
    value={rating} 
    onChange={setRating}
    maxStars={5}
  />
  <TextInput
    placeholder="Optional feedback..."
    value={comment}
    onChangeText={setComment}
    multiline
  />
  <Button onPress={submitRating}>Submit Rating</Button>
</Modal>
```

### 3. Update Service Layer

**File:** `services/campaignService.ts` or new `ratingService.ts`

```typescript
export async function rateCreator(
  applicationId: string,
  rating: number,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  // Validate rating
  if (rating < 1 || rating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5' };
  }

  // Check application is completed
  const { data: application } = await supabase
    .from('campaign_applications')
    .select('status, rating')
    .eq('id', applicationId)
    .single();

  if (application?.status !== 'completed') {
    return { success: false, error: 'Can only rate completed campaigns' };
  }

  if (application?.rating) {
    return { success: false, error: 'Rating already submitted' };
  }

  // Update rating
  const { error } = await supabase
    .from('campaign_applications')
    .update({
      rating,
      rating_comment: comment || null,
      rated_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getCreatorRating(creatorId: string): Promise<number | null> {
  const { data } = await supabase
    .from('campaign_applications')
    .select('rating')
    .eq('creator_id', creatorId)
    .eq('status', 'completed')
    .not('rating', 'is', null);

  if (!data || data.length === 0) return null;

  const avgRating = data.reduce((sum, app) => sum + app.rating, 0) / data.length;
  return Math.round(avgRating * 10) / 10; // Round to 1 decimal
}
```

### 4. Update Browse Creators

**File:** `app/(tabs)/business/creators/browse.tsx`

Replace random rating with actual rating:
```typescript
// Get actual rating
const { data: ratingData } = await supabase
  .from('campaign_applications')
  .select('rating')
  .eq('creator_id', creator.id)
  .eq('status', 'completed')
  .not('rating', 'is', null);

const avgRating = ratingData && ratingData.length > 0
  ? ratingData.reduce((sum, r) => sum + r.rating, 0) / ratingData.length
  : null;
```

### 5. Update Creator Profile View

**File:** `app/creator/[id]/index.tsx`

Already shows rating from CM-14, but needs to fetch actual rating:
```typescript
// In getCreatorProfile service
const { data: ratingData } = await supabase
  .from('campaign_applications')
  .select('rating')
  .eq('creator_id', creatorId)
  .eq('status', 'completed')
  .not('rating', 'is', null);

const avgRating = ratingData && ratingData.length > 0
  ? ratingData.reduce((sum, r) => sum + r.rating, 0) / ratingData.length
  : undefined;
```

---

## UI/UX Design

### Rating Modal

```
┌─────────────────────────────────────┐
│ Rate Creator Performance      [X]   │
├─────────────────────────────────────┤
│                                     │
│ How would you rate this creator?    │
│                                     │
│     ⭐⭐⭐⭐⭐ (5 stars)              │
│                                     │
│ Optional Feedback:                  │
│ ┌─────────────────────────────────┐ │
│ │ Great work! Very professional...│ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │        Submit Rating             │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Rating Display

- **With Rating:** Show star icon + "4.8" (1 decimal place)
- **No Rating:** Show "—" (already implemented in CM-14)
- **New Creator:** Show "New" badge instead of rating

---

## Logic Flow

### Rating Collection Flow

1. Campaign application status changes to `completed`
2. Business views completed campaign
3. System checks if rating already submitted
4. If not rated, show "Rate Creator" button/modal
5. Business submits rating (1-5 stars + optional comment)
6. Rating saved to `campaign_applications.rating`
7. Creator's average rating recalculated
8. Rating displayed in browse creators and profile views

### Rating Calculation

- Average of all completed campaign ratings
- Only count campaigns with ratings (exclude null)
- Round to 1 decimal place
- Cache in creator_profiles table (optional optimization)

---

## Testing Requirements

### Unit Tests

1. Rating validation (1-5 range)
2. Can only rate completed campaigns
3. Can't rate twice
4. Average calculation correct
5. Null handling (no ratings = null)

### Integration Tests

1. Business rates creator after completion
2. Rating appears in browse creators
3. Rating appears in creator profile
4. Average updates correctly
5. Rating persists after refresh

### Edge Cases

1. Creator with 0 completed campaigns (no rating)
2. Creator with completed campaigns but no ratings (null)
3. Creator with 1 rating (shows that rating)
4. Creator with multiple ratings (shows average)
5. Rating submission failure handling

---

## Acceptance Criteria

- [ ] Database migration adds rating columns
- [ ] Rating modal/UI implemented
- [ ] Businesses can rate creators after completion
- [ ] Ratings can't be changed once submitted
- [ ] Average rating calculated correctly
- [ ] Ratings display in browse creators (replaces random)
- [ ] Ratings display in creator profile
- [ ] Service layer functions implemented
- [ ] All tests pass
- [ ] No TypeScript errors

---

## Related Files

- `app/(tabs)/business/campaigns/[id]/index.tsx` - Campaign detail (where rating happens)
- `app/(tabs)/business/creators/browse.tsx` - Browse creators (display rating)
- `app/creator/[id]/index.tsx` - Creator profile (display rating)
- `services/campaignService.ts` - Rating service functions
- `supabase/migrations/` - Rating schema migration

---

## Notes

- Rating is optional - businesses don't have to rate
- Rating is one-way (business rates creator, not vice versa)
- Can add creator-to-business rating in future if needed
- Consider adding rating reminders/notifications
- May want to add rating analytics (average rating trends)

---

## Future Enhancements

- Rating breakdown (5 stars, 4 stars, etc.)
- Rating trends over time
- Rating requirements (minimum rating to appear in browse)
- Creator response to ratings
- Rating disputes/moderation



