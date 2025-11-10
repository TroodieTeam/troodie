# Implement Status Change Notifications

- Epic: PS (Pending State)
- Priority: Medium
- Estimate: 2 days
- Status: 🟡 Needs Review
- Assignee: -
- Dependencies: PS-006

## Overview
Implement email and push notifications for status changes in restaurant claims and creator applications, ensuring users are informed of review decisions.

## Business Value
- Immediate user communication on status changes
- Reduced support inquiries about application status
- Better user engagement and retention
- Professional communication of decisions

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Status Change Notifications
  As a user with pending submissions
  I want to be notified of status changes
  So that I can take appropriate action

  Scenario: Email notification on approval
    Given my submission is approved
    When the admin approves it
    Then I should receive an email notification
    And it should include next steps
    And a link to access new features

  Scenario: Email notification on rejection
    Given my submission is rejected
    When the admin rejects it
    Then I should receive an email notification
    And it should include the rejection reason
    And guidance on resubmission if allowed

  Scenario: Push notification for mobile users
    Given I have push notifications enabled
    When my submission status changes
    Then I should receive a push notification
    And tapping it should open the status page

  Scenario: In-app notification
    Given I am using the app
    When my submission status changes
    Then I should see an in-app notification
    And it should persist until viewed
```

## Technical Implementation

### Email Templates

1. **Approval Email Template**:
```tsx
// emails/templates/StatusApproved.tsx
interface ApprovalEmailProps {
  userName: string;
  type: 'restaurant_claim' | 'creator_application';
  restaurantName?: string;
  actionUrl: string;
}

export function StatusApprovedEmail({
  userName,
  type,
  restaurantName,
  actionUrl
}: ApprovalEmailProps) {
  return (
    <Email>
      <Head />
      <Preview>
        {type === 'restaurant_claim'
          ? `Your restaurant claim has been approved!`
          : `Welcome to the Troodie Creator Program!`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img
              src="https://troodie.com/logo.png"
              width="150"
              height="50"
              alt="Troodie"
            />
          </Section>

          {/* Success Icon */}
          <Section style={iconSection}>
            <div style={successIcon}>✓</div>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={heading}>
              {type === 'restaurant_claim'
                ? 'Restaurant Claim Approved!'
                : 'Creator Application Approved!'}
            </Heading>

            <Text style={paragraph}>
              Hi {userName},
            </Text>

            <Text style={paragraph}>
              Great news! {type === 'restaurant_claim'
                ? `Your claim for ${restaurantName} has been approved. You now have full access to manage your restaurant on Troodie.`
                : `Your creator application has been approved! Welcome to the Troodie Creator Program.`}
            </Text>

            {/* What's Next Section */}
            <Section style={nextStepsSection}>
              <Heading as="h3" style={subheading}>
                What you can do now:
              </Heading>
              {type === 'restaurant_claim' ? (
                <ul style={list}>
                  <li>Update your restaurant profile and menu</li>
                  <li>Respond to customer reviews</li>
                  <li>Create promotional campaigns</li>
                  <li>View analytics and insights</li>
                </ul>
              ) : (
                <ul style={list}>
                  <li>Browse available campaigns</li>
                  <li>Apply to restaurant partnerships</li>
                  <li>Create content for brands</li>
                  <li>Track your earnings</li>
                </ul>
              )}
            </Section>

            {/* CTA Button */}
            <Section style={buttonSection}>
              <Button href={actionUrl} style={button}>
                {type === 'restaurant_claim'
                  ? 'Manage Your Restaurant'
                  : 'Go to Creator Dashboard'}
              </Button>
            </Section>

            <Text style={footer}>
              If you have any questions, feel free to reply to this email or
              visit our help center.
            </Text>

            <Text style={footer}>
              Best regards,
              <br />
              The Troodie Team
            </Text>
          </Section>
        </Container>
      </Body>
    </Email>
  );
}
```

2. **Rejection Email Template**:
```tsx
// emails/templates/StatusRejected.tsx
interface RejectionEmailProps {
  userName: string;
  type: 'restaurant_claim' | 'creator_application';
  rejectionReason: string;
  canResubmit: boolean;
  supportUrl: string;
}

export function StatusRejectedEmail({
  userName,
  type,
  rejectionReason,
  canResubmit,
  supportUrl
}: RejectionEmailProps) {
  return (
    <Email>
      <Head />
      <Preview>
        Update on your {type === 'restaurant_claim' ? 'restaurant claim' : 'creator application'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img src="https://troodie.com/logo.png" width="150" height="50" alt="Troodie" />
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={heading}>
              Update on Your {type === 'restaurant_claim' ? 'Restaurant Claim' : 'Creator Application'}
            </Heading>

            <Text style={paragraph}>
              Hi {userName},
            </Text>

            <Text style={paragraph}>
              Thank you for your {type === 'restaurant_claim' ? 'restaurant claim' : 'creator application'}.
              After careful review, we're unable to approve it at this time.
            </Text>

            {/* Reason Section */}
            <Section style={reasonSection}>
              <Heading as="h3" style={subheading}>Reason:</Heading>
              <Text style={reasonText}>{rejectionReason}</Text>
            </Section>

            {/* Next Steps */}
            {canResubmit ? (
              <Section style={nextStepsSection}>
                <Heading as="h3" style={subheading}>What you can do:</Heading>
                <ul style={list}>
                  <li>Review the feedback above</li>
                  <li>Address the issues mentioned</li>
                  <li>Resubmit your {type === 'restaurant_claim' ? 'claim' : 'application'} after 30 days</li>
                </ul>
              </Section>
            ) : (
              <Text style={paragraph}>
                Unfortunately, we cannot accept resubmissions for this {
                  type === 'restaurant_claim' ? 'restaurant' : 'application'
                } at this time.
              </Text>
            )}

            {/* Support Link */}
            <Section style={buttonSection}>
              <Button href={supportUrl} style={secondaryButton}>
                Contact Support
              </Button>
            </Section>

            <Text style={footer}>
              We appreciate your interest in Troodie and encourage you to
              {canResubmit ? ' try again after addressing the feedback.' : ' explore other opportunities on our platform.'}
            </Text>

            <Text style={footer}>
              Best regards,
              <br />
              The Troodie Team
            </Text>
          </Section>
        </Container>
      </Body>
    </Email>
  );
}
```

### Notification Service

```typescript
// services/notificationService.ts
export class NotificationService {
  // Send email notification
  async sendEmailNotification(params: {
    userId: string;
    type: 'approval' | 'rejection';
    submissionType: 'restaurant_claim' | 'creator_application';
    details: Record<string, any>;
  }) {
    const user = await getUserById(params.userId);

    if (params.type === 'approval') {
      await sendEmail({
        to: user.email,
        subject: params.submissionType === 'restaurant_claim'
          ? '🎉 Your Restaurant Claim Has Been Approved!'
          : '🎉 Welcome to the Troodie Creator Program!',
        template: 'status-approved',
        data: {
          userName: user.name,
          type: params.submissionType,
          ...params.details
        }
      });
    } else {
      await sendEmail({
        to: user.email,
        subject: `Update on Your ${
          params.submissionType === 'restaurant_claim'
            ? 'Restaurant Claim'
            : 'Creator Application'
        }`,
        template: 'status-rejected',
        data: {
          userName: user.name,
          type: params.submissionType,
          ...params.details
        }
      });
    }
  }

  // Send push notification
  async sendPushNotification(params: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, any>;
  }) {
    const tokens = await getUserPushTokens(params.userId);

    if (tokens.length === 0) return;

    const message = {
      notification: {
        title: params.title,
        body: params.body
      },
      data: {
        ...params.data,
        click_action: 'OPEN_STATUS_PAGE'
      },
      tokens
    };

    await admin.messaging().sendMulticast(message);
  }

  // Create in-app notification
  async createInAppNotification(params: {
    userId: string;
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
  }) {
    await supabase.from('notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      action_url: params.actionUrl,
      read: false,
      created_at: new Date().toISOString()
    });

    // Trigger real-time update
    await supabase
      .from('notification_counts')
      .upsert({
        user_id: params.userId,
        unread_count: supabase.sql`unread_count + 1`
      });
  }

  // Send all notification types
  async notifyStatusChange(params: {
    userId: string;
    submissionId: string;
    submissionType: 'restaurant_claim' | 'creator_application';
    newStatus: 'approved' | 'rejected';
    rejectionReason?: string;
    restaurantName?: string;
  }) {
    const { userId, submissionType, newStatus, rejectionReason, restaurantName } = params;

    // Email notification
    await this.sendEmailNotification({
      userId,
      type: newStatus === 'approved' ? 'approval' : 'rejection',
      submissionType,
      details: {
        restaurantName,
        rejectionReason,
        canResubmit: newStatus === 'rejected',
        actionUrl: `https://troodie.com/my-submissions/${params.submissionId}`
      }
    });

    // Push notification
    const pushTitle = newStatus === 'approved'
      ? '🎉 Application Approved!'
      : 'Application Update';

    const pushBody = newStatus === 'approved'
      ? submissionType === 'restaurant_claim'
        ? 'Your restaurant claim has been approved!'
        : 'Welcome to the Creator Program!'
      : 'Your submission has been reviewed. Tap to see details.';

    await this.sendPushNotification({
      userId,
      title: pushTitle,
      body: pushBody,
      data: {
        submissionId: params.submissionId,
        type: submissionType,
        status: newStatus
      }
    });

    // In-app notification
    await this.createInAppNotification({
      userId,
      type: `${submissionType}_${newStatus}`,
      title: pushTitle,
      message: newStatus === 'approved'
        ? `Your ${submissionType === 'restaurant_claim' ? 'restaurant claim' : 'creator application'} has been approved!`
        : `Your submission was not approved. ${rejectionReason || 'Please check your email for details.'}`,
      actionUrl: `/my-submissions/${params.submissionId}`
    });
  }
}
```

### In-App Notification Component

**NOTE:** The notification UI components below must align with the design patterns in `docs/v1_component_reference.html`. Pay special attention to:
- Notification badge styling (color, size, positioning)
- Dropdown menu patterns and animations
- Toast notification appearance and behavior
- Icon usage and sizing standards

```tsx
// components/NotificationBell.tsx
export function NotificationBell() {
  const { data: unreadCount } = useUnreadNotifications();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900"
      >
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <NotificationDropdown
          onClose={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
```

## Definition of Done
- [ ] Email templates created and tested
- [ ] Email service integrated
- [ ] Push notification service configured
- [ ] In-app notifications working
- [ ] Real-time notification updates
- [ ] Notification preferences honored
- [ ] Unread count badge functional
- [ ] Mobile push notifications tested
- [ ] Email deliverability verified
- [ ] Notification history viewable

## Notes
- Consider adding SMS notifications for critical updates
- May want to batch notifications to prevent spam
- Future: Add notification preferences management UI