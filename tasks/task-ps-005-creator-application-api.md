# Update Creator Application API for Pending State

- Epic: PS (Pending State)
- Priority: High
- Estimate: 1 day
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: PS-001, PS-003

## Overview
Update the creator application submission API to create applications in pending state, requiring admin approval before granting creator privileges.

## Business Value
- Ensures quality of creators on the platform
- Prevents spam or low-quality creator accounts
- Protects brand reputation
- Enables verification of creator authenticity

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Creator Application with Pending State
  As a user applying to be a creator
  I want my application to be reviewed
  So that the platform maintains quality standards

  Scenario: Submit creator application
    Given I am an authenticated user
    And I have connected my social accounts
    When I submit my creator application
    Then it should be created with "pending" status
    And I should see a review message
    And I should not have creator privileges yet

  Scenario: Prevent duplicate applications
    Given I have a pending creator application
    When I try to submit another application
    Then I should receive an error
    And no new application should be created

  Scenario: Check application status
    Given I have submitted an application
    When I check my application status
    Then I should see the current status
    And rejection reason if rejected
    And next steps based on status

  Scenario: Approved application grants access
    Given my application is approved
    When the approval is processed
    Then I should gain creator privileges
    And see the creator dashboard
    And receive a welcome notification
```

## Technical Implementation

### API Endpoints

1. **Submit Creator Application**:
```typescript
// POST /api/applications/creator
interface SubmitCreatorApplicationRequest {
  instagram_handle?: string;
  tiktok_handle?: string;
  youtube_handle?: string;
  twitter_handle?: string;
  follower_count: number;
  content_categories: string[];
  sample_content_urls: string[];
  bio: string;
  location: string;
  preferred_cuisine_types: string[];
  has_business_email: boolean;
  agrees_to_terms: boolean;
}

interface SubmitCreatorApplicationResponse {
  application_id: string;
  status: 'pending';
  submitted_at: string;
  estimated_review_time: string;
  message: string;
}

export async function submitCreatorApplication(
  req: SubmitCreatorApplicationRequest
): Promise<SubmitCreatorApplicationResponse> {
  const user = await getAuthenticatedUser();

  // Validate minimum requirements
  if (req.follower_count < 1000) {
    throw new Error('Minimum 1,000 followers required across platforms');
  }

  if (!req.agrees_to_terms) {
    throw new Error('You must agree to the creator terms and conditions');
  }

  // Check for existing applications
  const existingApp = await supabase
    .from('creator_applications')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['pending', 'approved'])
    .single();

  if (existingApp.data) {
    if (existingApp.data.status === 'pending') {
      throw new Error('You already have a pending application');
    }
    if (existingApp.data.status === 'approved') {
      throw new Error('You are already an approved creator');
    }
  }

  // Create pending application
  const application = await supabase
    .from('creator_applications')
    .insert({
      user_id: user.id,
      status: 'pending',
      instagram_handle: req.instagram_handle,
      tiktok_handle: req.tiktok_handle,
      youtube_handle: req.youtube_handle,
      twitter_handle: req.twitter_handle,
      follower_count: req.follower_count,
      content_categories: req.content_categories,
      sample_content_urls: req.sample_content_urls,
      bio: req.bio,
      location: req.location,
      preferred_cuisine_types: req.preferred_cuisine_types,
      has_business_email: req.has_business_email,
      submitted_at: new Date().toISOString()
    })
    .select()
    .single();

  // Log the action
  await logReviewAction({
    entity_type: 'creator_application',
    entity_id: application.data.id,
    action: 'created',
    actor_id: user.id
  });

  // Send notification to admins
  await notifyAdmins('new_creator_application', {
    application_id: application.data.id,
    user_name: user.name,
    follower_count: req.follower_count
  });

  return {
    application_id: application.data.id,
    status: 'pending',
    submitted_at: application.data.submitted_at,
    estimated_review_time: '48-72 hours',
    message: 'Your creator application has been submitted! We\'ll review it within 48-72 hours.'
  };
}
```

2. **Check Application Status**:
```typescript
// GET /api/applications/creator/status
interface ApplicationStatusResponse {
  application_id: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
  review_notes?: string;
  can_reapply: boolean;
  next_steps: string;
}

export async function getCreatorApplicationStatus(): Promise<ApplicationStatusResponse> {
  const user = await getAuthenticatedUser();

  const application = await supabase
    .from('creator_applications')
    .select('*')
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single();

  if (!application.data) {
    throw new Error('No application found');
  }

  const nextSteps = getNextSteps(application.data.status, application.data.rejection_reason);

  return {
    application_id: application.data.id,
    status: application.data.status,
    submitted_at: application.data.submitted_at,
    reviewed_at: application.data.reviewed_at,
    rejection_reason: application.data.rejection_reason,
    review_notes: application.data.review_notes,
    can_reapply: application.data.status === 'rejected' &&
                 daysSince(application.data.reviewed_at) > 30,
    next_steps: nextSteps
  };
}

function getNextSteps(status: string, rejection_reason?: string): string {
  switch (status) {
    case 'pending':
      return 'Your application is being reviewed. Check back in 48-72 hours.';
    case 'approved':
      return 'Congratulations! Visit your creator dashboard to start creating campaigns.';
    case 'rejected':
      if (rejection_reason?.includes('followers')) {
        return 'Grow your following to 1,000+ and reapply in 30 days.';
      }
      if (rejection_reason?.includes('content')) {
        return 'Improve your content quality and reapply in 30 days.';
      }
      return 'Review the feedback and reapply in 30 days.';
    default:
      return 'Please contact support for assistance.';
  }
}
```

3. **Application Metrics Endpoint**:
```typescript
// GET /api/applications/creator/metrics
interface ApplicationMetricsResponse {
  total_applications: number;
  pending_applications: number;
  approved_applications: number;
  rejected_applications: number;
  average_review_time_hours: number;
  approval_rate: number;
}

export async function getCreatorApplicationMetrics(): Promise<ApplicationMetricsResponse> {
  // Admin only endpoint
  const user = await getAuthenticatedUser();
  if (!user.is_admin) {
    throw new Error('Unauthorized');
  }

  const metrics = await supabase.rpc('get_creator_application_metrics');

  return {
    total_applications: metrics.data.total,
    pending_applications: metrics.data.pending,
    approved_applications: metrics.data.approved,
    rejected_applications: metrics.data.rejected,
    average_review_time_hours: metrics.data.avg_review_hours,
    approval_rate: metrics.data.approval_rate
  };
}
```

### Validation Rules
```typescript
// utils/creatorValidation.ts
export const CREATOR_REQUIREMENTS = {
  min_followers: 1000,
  min_content_samples: 3,
  max_content_samples: 10,
  required_platforms: 1, // At least one social platform
  min_bio_length: 100,
  max_bio_length: 500
};

export function validateCreatorApplication(data: any): string[] {
  const errors: string[] = [];

  if (data.follower_count < CREATOR_REQUIREMENTS.min_followers) {
    errors.push(`Minimum ${CREATOR_REQUIREMENTS.min_followers} followers required`);
  }

  if (data.sample_content_urls.length < CREATOR_REQUIREMENTS.min_content_samples) {
    errors.push(`Provide at least ${CREATOR_REQUIREMENTS.min_content_samples} content samples`);
  }

  const hasSocialHandle =
    data.instagram_handle ||
    data.tiktok_handle ||
    data.youtube_handle ||
    data.twitter_handle;

  if (!hasSocialHandle) {
    errors.push('At least one social media account required');
  }

  if (data.bio.length < CREATOR_REQUIREMENTS.min_bio_length) {
    errors.push('Bio too short. Tell us more about yourself');
  }

  return errors;
}
```

## Definition of Done
- [ ] API endpoints created and tested
- [ ] Validation rules implemented
- [ ] Pending state properly set
- [ ] Duplicate prevention working
- [ ] Status checking functional
- [ ] Next steps logic implemented
- [ ] Admin notifications working
- [ ] Error messages helpful

## Notes
- Consider adding social media verification via OAuth
- May want to add portfolio/media kit upload
- Future: Implement tiered creator levels based on performance