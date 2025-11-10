# Implement Pending State User UI

- Epic: PS (Pending State)
- Priority: High
- Estimate: 2 days
- Status: 🟡 Needs Review
- Assignee: -
- Dependencies: PS-004, PS-005

## Overview
Create user-facing UI components to show pending status after submitting restaurant claims or creator applications, including status tracking pages.

## Business Value
- Clear communication of review status to users
- Reduced support inquiries about application status
- Better user experience during wait period
- Transparency in the review process

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Pending State User Interface
  As a user who submitted a claim or application
  I want to see my submission status
  So that I know what to expect

  Scenario: Show pending state after submission
    Given I just submitted a claim or application
    When the submission is successful
    Then I should see a pending status screen
    And information about review timeline
    And next steps

  Scenario: Check status from profile
    Given I have a pending submission
    When I visit my profile
    Then I should see a status indicator
    And be able to click for more details

  Scenario: Status tracking page
    Given I have submitted items for review
    When I visit the status page
    Then I should see all my submissions
    And their current status
    And any feedback from reviewers

  Scenario: Handle rejection gracefully
    Given my submission was rejected
    When I view the status
    Then I should see the rejection reason
    And guidance on next steps
    And option to resubmit if allowed
```

## Technical Implementation

**IMPORTANT:** All UI components must follow the design system and patterns defined in `docs/v1_component_reference.html`. Review this file thoroughly before implementing any UI elements to ensure consistency with the existing Troodie design language, including:
- Color schemes and theming (use existing color variables)
- Typography and spacing standards
- Button styles and states (primary, secondary, disabled)
- Card layouts and shadows (match existing card patterns)
- Form input patterns and validation states
- Toast/notification styles
- Loading and empty states
- Mobile responsive breakpoints

Specifically reference the component library for:
- Status badges and indicators
- Success/error message formatting
- Card components for submission items
- Modal dialogs for detailed views

### Component Structure

1. **Pending Submission Success Screen**:
```tsx
// components/PendingSubmissionSuccess.tsx
interface PendingSubmissionSuccessProps {
  type: 'restaurant_claim' | 'creator_application';
  submissionId: string;
  estimatedReviewTime: string;
}

export function PendingSubmissionSuccess({
  type,
  submissionId,
  estimatedReviewTime
}: PendingSubmissionSuccessProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
            <ClockIcon className="w-10 h-10 text-yellow-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-2">
          {type === 'restaurant_claim'
            ? 'Claim Submitted Successfully!'
            : 'Application Submitted Successfully!'}
        </h1>

        {/* Status Badge */}
        <div className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium mb-4">
          <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse" />
          Pending Review
        </div>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          Your submission has been received and is currently under review by our team.
          We'll notify you once a decision has been made.
        </p>

        {/* Timeline Info */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center text-blue-700">
            <TimeIcon className="w-5 h-5 mr-2" />
            <span className="font-medium">
              Estimated review time: {estimatedReviewTime}
            </span>
          </div>
        </div>

        {/* What's Next */}
        <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-2">What happens next?</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <CheckIcon className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Our team will review your submission</span>
            </li>
            <li className="flex items-start">
              <CheckIcon className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>You'll receive an email notification with the decision</span>
            </li>
            <li className="flex items-start">
              <CheckIcon className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>
                {type === 'restaurant_claim'
                  ? 'Once approved, you can manage your restaurant'
                  : 'Once approved, you can access creator features'}
              </span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-3">
          <button
            onClick={() => router.push(`/my-submissions/${submissionId}`)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Track Status
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
```

2. **Status Tracking Page**:
```tsx
// app/my-submissions/page.tsx
export default function MySubmissionsPage() {
  const { data: submissions, loading } = useMySubmissions();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">My Submissions</h1>
      <p className="text-gray-600 mb-8">
        Track the status of your restaurant claims and creator applications
      </p>

      {loading ? (
        <LoadingSpinner />
      ) : submissions?.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="You haven't submitted any claims or applications"
          action={{
            label: 'Explore Opportunities',
            href: '/explore'
          }}
        />
      ) : (
        <div className="space-y-4">
          {submissions?.map(submission => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

3. **Submission Status Card**:
```tsx
// components/SubmissionCard.tsx
interface SubmissionCardProps {
  submission: {
    id: string;
    type: 'restaurant_claim' | 'creator_application';
    status: 'pending' | 'approved' | 'rejected';
    submitted_at: string;
    reviewed_at?: string;
    rejection_reason?: string;
    details: any;
  };
}

export function SubmissionCard({ submission }: SubmissionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(submission.status)}`}>
                {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
              </span>
              <span className="text-sm text-gray-500">
                Submitted {formatDate(submission.submitted_at)}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold mb-1">
              {submission.type === 'restaurant_claim'
                ? `Restaurant Claim: ${submission.details.restaurant_name}`
                : 'Creator Application'}
            </h3>

            {/* Status Message */}
            <StatusMessage
              status={submission.status}
              reviewedAt={submission.reviewed_at}
              rejectionReason={submission.rejection_reason}
            />

            {/* Expandable Details */}
            {expanded && (
              <div className="mt-4 pt-4 border-t">
                <SubmissionDetails
                  type={submission.type}
                  details={submission.details}
                  status={submission.status}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="ml-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-500 hover:text-gray-700"
            >
              {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        {submission.status === 'rejected' && (
          <div className="mt-4 pt-4 border-t">
            <RejectionActions
              submissionId={submission.id}
              type={submission.type}
              canResubmit={submission.can_resubmit}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

4. **Status Message Component**:
```tsx
// components/StatusMessage.tsx
function StatusMessage({ status, reviewedAt, rejectionReason }) {
  if (status === 'pending') {
    return (
      <div className="flex items-center text-sm text-gray-600 mt-2">
        <ClockIcon className="w-4 h-4 mr-2" />
        <span>Your submission is being reviewed. This typically takes 24-48 hours.</span>
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="flex items-center text-sm text-green-600 mt-2">
        <CheckCircleIcon className="w-4 h-4 mr-2" />
        <span>
          Approved on {formatDate(reviewedAt)}! You now have access to{' '}
          {submission.type === 'restaurant_claim'
            ? 'restaurant management features'
            : 'creator features'}.
        </span>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="mt-2">
        <div className="flex items-start text-sm text-red-600">
          <XCircleIcon className="w-4 h-4 mr-2 mt-0.5" />
          <div>
            <span>Rejected on {formatDate(reviewedAt)}</span>
            {rejectionReason && (
              <div className="mt-1 p-2 bg-red-50 rounded text-red-700">
                <strong>Reason:</strong> {rejectionReason}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
```

5. **Profile Status Indicator**:
```tsx
// components/ProfileStatusIndicator.tsx
export function ProfileStatusIndicator() {
  const { data: pendingItems } = usePendingSubmissions();

  if (!pendingItems?.length) return null;

  return (
    <Link
      href="/my-submissions"
      className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm hover:bg-yellow-200 transition"
    >
      <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse" />
      {pendingItems.length} Pending Review{pendingItems.length > 1 ? 's' : ''}
    </Link>
  );
}
```

### Hooks

```typescript
// hooks/useMySubmissions.ts
export function useMySubmissions() {
  return useQuery({
    queryKey: ['my-submissions'],
    queryFn: async () => {
      const [claims, applications] = await Promise.all([
        supabase
          .from('restaurant_claims')
          .select('*, restaurant:restaurants(name, address)')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false }),
        supabase
          .from('creator_applications')
          .select('*')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })
      ]);

      return [
        ...claims.data.map(claim => ({
          id: claim.id,
          type: 'restaurant_claim' as const,
          status: claim.status,
          submitted_at: claim.submitted_at,
          reviewed_at: claim.reviewed_at,
          rejection_reason: claim.rejection_reason,
          can_resubmit: claim.can_resubmit,
          details: {
            restaurant_name: claim.restaurant.name,
            restaurant_address: claim.restaurant.address,
            ownership_proof_type: claim.ownership_proof_type
          }
        })),
        ...applications.data.map(app => ({
          id: app.id,
          type: 'creator_application' as const,
          status: app.status,
          submitted_at: app.submitted_at,
          reviewed_at: app.reviewed_at,
          rejection_reason: app.rejection_reason,
          can_resubmit: app.can_resubmit,
          details: {
            follower_count: app.follower_count,
            platforms: getPlatforms(app)
          }
        }))
      ].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    }
  });
}
```

## Definition of Done
- [ ] Pending success screen implemented
- [ ] Status tracking page functional
- [ ] Submission cards with details
- [ ] Status indicators in profile
- [ ] Rejection handling with reasons
- [ ] Resubmission flow if allowed
- [ ] Real-time status updates
- [ ] Mobile responsive
- [ ] Loading states
- [ ] Error handling

## Notes
- Consider adding email/push notification preferences
- May want to add estimated position in queue
- Future: Add chat support for rejected submissions