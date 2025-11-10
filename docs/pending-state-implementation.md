# Pending State Implementation Guide

## Overview

The Pending State system manages the review workflow for restaurant claims and creator applications in the Troodie React Native app. This document details the implementation and integration points for mobile.

## Architecture

### Database Schema

#### Core Tables
- `restaurant_claims` - Stores restaurant ownership claims
- `creator_applications` - Stores creator program applications
- `review_logs` - Audit trail for all review actions
- `notifications` - In-app notifications
- `notification_emails` - Email queue
- `push_tokens` - Push notification tokens

#### Views
- `pending_review_queue` - Combined view of pending items
- `notification_counts` - Real-time unread counts

### Service Layer

#### Admin Review Service (`/services/adminReviewService.ts`)
- **Purpose**: Handles admin review operations
- **Key Methods**:
  - `getPendingReviews()` - Fetch pending items with filtering
  - `approveRestaurantClaim()` - Approve restaurant claims
  - `approveCreatorApplication()` - Approve creator applications
  - `rejectRestaurantClaim()` - Reject with reason
  - `rejectCreatorApplication()` - Reject with reason
  - `bulkApprove()` - Bulk approval operations
  - `bulkReject()` - Bulk rejection operations

#### Status Notification Service (`/services/statusNotificationService.ts`)
- **Purpose**: Handles all notification types for status changes
- **Key Methods**:
  - `notifyStatusChange()` - Send all notification types
  - `createInAppNotification()` - Create in-app notifications
  - `sendPushNotification()` - Send push notifications
  - `sendEmailNotification()` - Queue email notifications

## UI Components (React Native)

### Admin Interface

#### Review Queue (`/app/admin/reviews.tsx`)
- Admin review screen for mobile
- Features:
  - Pull-to-refresh with RefreshControl
  - Filter tabs (All/Restaurants/Creators)
  - Expandable queue items
  - Modal-based review interface
  - Native navigation with Expo Router

#### Review Components
- Inline review items with expand/collapse
- `ReviewModal` - Full-screen modal for review actions
- Filter tabs using ScrollView
- Native ActivityIndicator for loading states

### User Interface

#### Submission Tracking (`/app/my-submissions.tsx`)
- React Native screen for tracking submissions
- Features:
  - Pull-to-refresh functionality
  - Expandable cards with status badges
  - Native alerts for resubmission
  - Integration with Expo Router navigation

#### User Components
- `PendingSubmissionSuccessNative` - React Native success screen
- Inline submission cards with TouchableOpacity
- Expandable details within cards
- Native action buttons for resubmission

### Entry Points

#### More Tab (`/app/(tabs)/more.tsx`)
- **Admin Tools Section**: Review Queue access for admins
- **Growth Opportunities**:
  - "Become a Creator" → `/creator/onboarding`
  - "Claim Your Restaurant" → `/business/claim`
- **Account & Settings**: "My Submissions" for all users

## Workflow States

### Restaurant Claims
```
pending → approved (links restaurant, creates business profile)
        → rejected (with reason, optional resubmission)
```

### Creator Applications
```
pending → approved (grants creator access, creates profile)
        → rejected (with reason, 30-day cooldown)
```

## Integration Points

### Authentication
- Admin access verified via `account_type` or `is_verified` flag
- User authentication required for submissions

### Notifications
- In-app notifications created on status change
- Email notifications queued for processing
- Push notifications sent to registered devices

### Profile Updates
- Restaurant claims update `is_restaurant` flag
- Creator applications update `is_creator` flag
- Business/Creator profiles created on approval

## Service Integration

### Admin Review Service
- Service methods called directly from React Native screens
- No REST API layer - direct Supabase integration
- Methods:
  - `getPendingReviews()` - Fetches pending items
  - `approveRestaurantClaim()` - Approves claims
  - `approveCreatorApplication()` - Approves applications
  - `rejectRestaurantClaim()` - Rejects with reason
  - `rejectCreatorApplication()` - Rejects with reason

### User Services
- `restaurantClaimService.submitRestaurantClaim()`
- `creatorApplicationService.submitCreatorApplication()`
- Direct Supabase queries for fetching submissions

### Navigation Flow
```
More Tab
├── Admin Tools (if admin)
│   └── Review Queue → /admin/reviews
├── Growth Opportunities
│   ├── Become Creator → /creator/onboarding
│   └── Claim Restaurant → /business/claim
└── Account & Settings
    └── My Submissions → /my-submissions
```

## Security Considerations

### Row Level Security (RLS)
- Users can only view their own submissions
- Admin access required for review operations
- Notifications scoped to user

### Data Validation
- Rejection reasons required for rejections
- Email/phone validation for claims
- Follower count verification for creators

## Error Handling

### Common Scenarios
- Duplicate submissions prevented
- Invalid status transitions blocked
- Missing required fields validated
- Failed notifications don't block approval

### Recovery Procedures
- Failed emails retry automatically
- Notifications can be resent manually
- Bulk operations report individual failures

## Testing Checklist

### Admin Flow (Mobile)
- [ ] More tab shows "Admin Tools" section for admin users
- [ ] Review Queue loads with pull-to-refresh
- [ ] Filter tabs work (All/Restaurants/Creators)
- [ ] Queue items expand/collapse on tap
- [ ] Review modal opens with item details
- [ ] Approve action works with optional notes
- [ ] Reject action requires reason
- [ ] Success alerts show after action
- [ ] Queue refreshes after review

### User Flow (Mobile)
- [ ] "My Submissions" appears in More tab
- [ ] Claim flow navigates to success screen
- [ ] Creator application shows success screen
- [ ] Submissions list shows all user submissions
- [ ] Status badges display correctly
- [ ] Rejection reasons visible
- [ ] Resubmit button works when allowed
- [ ] Pull-to-refresh updates status

### Navigation Testing
- [ ] Back navigation works correctly
- [ ] Deep links to submissions work
- [ ] Modal dismissal handled properly
- [ ] Tab switching preserves state

## Monitoring

### Key Metrics
- Average review time
- Approval/rejection rates
- Notification delivery rates
- Queue backlog size

### Alerts
- Queue size exceeds threshold
- Review time exceeds SLA
- Notification failures spike
- Database errors

## Maintenance

### Regular Tasks
- Clean old notifications (30 days)
- Archive processed reviews (90 days)
- Update notification templates
- Monitor email delivery rates

### Database Maintenance
```sql
-- Clean up old notifications
SELECT cleanup_old_notifications();

-- Check queue health
SELECT COUNT(*), AVG(NOW() - submitted_at) as avg_wait
FROM pending_review_queue;
```

## Future Enhancements

### Planned Features
- AI-assisted review suggestions
- Review assignment and load balancing
- SMS notifications
- Review templates for common scenarios
- Analytics dashboard
- SLA tracking and reporting

### Technical Debt
- Implement proper email service integration
- Add comprehensive logging
- Improve error recovery mechanisms
- Add integration tests

## Related Documentation
- [Backend Design](./backend-design.md)
- [Testing Guide](./pending-state-testing-guide.md)
- [API Documentation](./api-docs.md)