# Create Admin Review Endpoints (Approve/Reject)

- Epic: PS (Pending State)
- Priority: Critical
- Estimate: 1.5 days
- Status: 🟡 Needs Review
- Assignee: -
- Dependencies: PS-001, PS-002, PS-003

## Overview
Create admin API endpoints for reviewing and processing pending restaurant claims and creator applications, including approval and rejection workflows.

## Business Value
- Enables manual review process for quality control
- Provides admin tools for efficient review management
- Ensures proper audit trail for all decisions
- Reduces fraud and maintains platform integrity

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Admin Review Endpoints
  As an admin
  I want to review and process pending items
  So that I can maintain platform quality

  Scenario: Approve restaurant claim
    Given I am an admin reviewing a pending claim
    When I approve the claim
    Then the claim status should change to "approved"
    And the restaurant should be linked to the user
    And the user should be notified
    And a review log should be created

  Scenario: Reject restaurant claim
    Given I am an admin reviewing a pending claim
    When I reject the claim with a reason
    Then the claim status should change to "rejected"
    And the rejection reason should be saved
    And the user should be notified with the reason
    And a review log should be created

  Scenario: Bulk review operations
    Given I am an admin with multiple pending items
    When I select multiple items for bulk action
    Then I can approve or reject them together
    And each item is processed individually
    And all users are notified

  Scenario: Review with notes
    Given I am reviewing an application
    When I add internal notes
    Then the notes should be saved
    But not visible to the user
    And visible in the audit trail
```

## Technical Implementation

### API Endpoints

1. **Get Pending Reviews Queue**:
```typescript
// GET /api/admin/reviews/pending
interface PendingReviewsRequest {
  type: 'restaurant_claim' | 'creator_application' | 'all';
  page?: number;
  limit?: number;
  sort_by?: 'submitted_at' | 'follower_count' | 'restaurant_name';
  order?: 'asc' | 'desc';
}

interface PendingReviewItem {
  id: string;
  type: 'restaurant_claim' | 'creator_application';
  user_name: string;
  user_email: string;
  submitted_at: string;
  priority: 'high' | 'medium' | 'low';
  details: Record<string, any>;
}

interface PendingReviewsResponse {
  items: PendingReviewItem[];
  total: number;
  page: number;
  total_pages: number;
}

export async function getPendingReviews(
  req: PendingReviewsRequest
): Promise<PendingReviewsResponse> {
  const admin = await requireAdmin();

  const limit = req.limit || 20;
  const offset = ((req.page || 1) - 1) * limit;

  let query = supabase
    .from('review_queue_view') // This would be a view combining claims and applications
    .select('*', { count: 'exact' })
    .eq('status', 'pending');

  if (req.type !== 'all') {
    query = query.eq('type', req.type);
  }

  const { data, count } = await query
    .order(req.sort_by || 'submitted_at', { ascending: req.order === 'asc' })
    .range(offset, offset + limit - 1);

  return {
    items: data.map(item => ({
      id: item.id,
      type: item.type,
      user_name: item.user_name,
      user_email: item.user_email,
      submitted_at: item.submitted_at,
      priority: calculatePriority(item),
      details: item.type === 'restaurant_claim'
        ? {
            restaurant_name: item.restaurant_name,
            ownership_proof_type: item.ownership_proof_type,
            business_email: item.business_email
          }
        : {
            follower_count: item.follower_count,
            platforms: getConnectedPlatforms(item),
            content_categories: item.content_categories
          }
    })),
    total: count,
    page: req.page || 1,
    total_pages: Math.ceil(count / limit)
  };
}
```

2. **Approve Item**:
```typescript
// POST /api/admin/reviews/:id/approve
interface ApproveRequest {
  review_notes?: string;
  auto_notify?: boolean; // Default true
}

interface ApproveResponse {
  success: boolean;
  message: string;
  processed_at: string;
}

export async function approveReview(
  reviewId: string,
  req: ApproveRequest
): Promise<ApproveResponse> {
  const admin = await requireAdmin();

  // Start transaction
  const { data: item } = await supabase
    .from('review_queue_view')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (!item) {
    throw new Error('Review item not found');
  }

  if (item.status !== 'pending') {
    throw new Error('Item is not pending review');
  }

  let updateResult;

  if (item.type === 'restaurant_claim') {
    // Update claim status
    await supabase
      .from('restaurant_claims')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
        review_notes: req.review_notes
      })
      .eq('id', reviewId);

    // Link restaurant to user
    await supabase
      .from('restaurants')
      .update({
        owner_id: item.user_id,
        claimed_at: new Date().toISOString()
      })
      .eq('id', item.restaurant_id);

    // Update user role
    await supabase
      .from('user_profiles')
      .update({
        is_restaurant_owner: true
      })
      .eq('user_id', item.user_id);

  } else if (item.type === 'creator_application') {
    // Update application status
    await supabase
      .from('creator_applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
        review_notes: req.review_notes
      })
      .eq('id', reviewId);

    // Grant creator privileges
    await supabase
      .from('user_profiles')
      .update({
        is_creator: true,
        creator_verified_at: new Date().toISOString()
      })
      .eq('user_id', item.user_id);

    // Create creator profile
    await supabase
      .from('creator_profiles')
      .insert({
        user_id: item.user_id,
        ...extractCreatorProfileData(item)
      });
  }

  // Log the action
  await logReviewAction({
    entity_type: item.type,
    entity_id: reviewId,
    action: 'approved',
    actor_id: admin.id,
    notes: req.review_notes
  });

  // Send notification
  if (req.auto_notify !== false) {
    await sendNotification({
      user_id: item.user_id,
      type: 'review_approved',
      title: item.type === 'restaurant_claim'
        ? 'Restaurant Claim Approved!'
        : 'Creator Application Approved!',
      message: item.type === 'restaurant_claim'
        ? 'Your restaurant claim has been approved. You can now manage your restaurant.'
        : 'Welcome to the Creator Program! Visit your dashboard to get started.'
    });
  }

  return {
    success: true,
    message: `${item.type === 'restaurant_claim' ? 'Claim' : 'Application'} approved successfully`,
    processed_at: new Date().toISOString()
  };
}
```

3. **Reject Item**:
```typescript
// POST /api/admin/reviews/:id/reject
interface RejectRequest {
  rejection_reason: string;
  review_notes?: string;
  allow_resubmit?: boolean; // Default true
  auto_notify?: boolean; // Default true
}

export async function rejectReview(
  reviewId: string,
  req: RejectRequest
): Promise<ReviewResponse> {
  const admin = await requireAdmin();

  if (!req.rejection_reason) {
    throw new Error('Rejection reason is required');
  }

  const { data: item } = await supabase
    .from('review_queue_view')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (!item) {
    throw new Error('Review item not found');
  }

  const table = item.type === 'restaurant_claim'
    ? 'restaurant_claims'
    : 'creator_applications';

  await supabase
    .from(table)
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
      rejection_reason: req.rejection_reason,
      review_notes: req.review_notes,
      can_resubmit: req.allow_resubmit !== false
    })
    .eq('id', reviewId);

  // Log the action
  await logReviewAction({
    entity_type: item.type,
    entity_id: reviewId,
    action: 'rejected',
    actor_id: admin.id,
    notes: req.review_notes,
    metadata: { rejection_reason: req.rejection_reason }
  });

  // Send notification
  if (req.auto_notify !== false) {
    await sendNotification({
      user_id: item.user_id,
      type: 'review_rejected',
      title: item.type === 'restaurant_claim'
        ? 'Restaurant Claim Update'
        : 'Creator Application Update',
      message: `Your submission was not approved. Reason: ${req.rejection_reason}${
        req.allow_resubmit !== false ? ' You may resubmit after addressing these issues.' : ''
      }`
    });
  }

  return {
    success: true,
    message: 'Review rejected successfully',
    processed_at: new Date().toISOString()
  };
}
```

4. **Bulk Review Actions**:
```typescript
// POST /api/admin/reviews/bulk
interface BulkReviewRequest {
  ids: string[];
  action: 'approve' | 'reject';
  rejection_reason?: string; // Required if action is reject
  review_notes?: string;
}

interface BulkReviewResponse {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

export async function bulkReviewAction(
  req: BulkReviewRequest
): Promise<BulkReviewResponse> {
  const admin = await requireAdmin();

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: []
  };

  for (const id of req.ids) {
    try {
      if (req.action === 'approve') {
        await approveReview(id, { review_notes: req.review_notes });
      } else {
        await rejectReview(id, {
          rejection_reason: req.rejection_reason!,
          review_notes: req.review_notes
        });
      }
      results.succeeded++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        id,
        error: error.message
      });
    }
    results.processed++;
  }

  return results;
}
```

### Helper Functions
```typescript
// utils/reviewHelpers.ts
export function calculatePriority(item: any): 'high' | 'medium' | 'low' {
  const daysSinceSubmission = daysSince(item.submitted_at);

  if (item.type === 'restaurant_claim') {
    if (item.restaurant_rating > 4.5) return 'high';
    if (daysSinceSubmission > 3) return 'high';
    return 'medium';
  }

  if (item.type === 'creator_application') {
    if (item.follower_count > 10000) return 'high';
    if (item.follower_count > 5000) return 'medium';
    return 'low';
  }

  return 'medium';
}

export async function requireAdmin(): Promise<User> {
  const user = await getAuthenticatedUser();

  if (!user.is_admin) {
    throw new Error('Admin access required');
  }

  return user;
}
```

## Definition of Done
- [ ] All review endpoints implemented
- [ ] Approval workflow complete
- [ ] Rejection workflow with reasons
- [ ] Bulk operations functional
- [ ] Review logging working
- [ ] Notifications sent on status change
- [ ] Transaction integrity ensured
- [ ] Admin authentication verified
- [ ] Error handling comprehensive
- [ ] API documentation complete

## Notes
- Consider adding review templates for common rejection reasons
- May want to add review assignment for load balancing
- Future: Add automated pre-screening before manual review