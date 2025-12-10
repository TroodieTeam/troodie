# Engineering Request ER-001: Creator Marketplace Notification Audit

**Status:** Open  
**Priority:** Medium  
**Created:** 2025-12-08  
**Related:** Admin Review System, Creator Marketplace, Restaurant Claims

## Problem Statement

The notification system for creator marketplace features (restaurant claims, creator applications) is currently disabled due to RLS policy conflicts. Notifications are a critical part of user experience and should be properly implemented throughout the creator marketplace feature set.

## Background

During implementation of the admin review system for restaurant claims, we encountered RLS policy violations when attempting to send notifications. The notification service attempts to create notifications for users, but admin users are blocked by RLS policies that require `user_id` to match `auth.uid()`.

**Current State:**
- Notifications are temporarily disabled in `adminReviewService.ts`
- Users do not receive notifications when their claims/applications are approved/rejected
- Notification RLS policies exist but conflict with admin operations

## Scope

Audit and implement a comprehensive notification system for the entire creator marketplace feature set, including:

### 1. Restaurant Claims Workflow
- [ ] Claim submitted notification (to admin)
- [ ] Claim approved notification (to user)
- [ ] Claim rejected notification (to user)
- [ ] Claim requires more info notification (to user)

### 2. Creator Applications Workflow
- [ ] Application submitted notification (to admin)
- [ ] Application approved notification (to user)
- [ ] Application rejected notification (to user)
- [ ] Application requires more info notification (to user)

### 3. Campaign Workflow
- [ ] Campaign created notification (to creators)
- [ ] Campaign application submitted notification (to business)
- [ ] Campaign application accepted notification (to creator)
- [ ] Campaign application rejected notification (to creator)
- [ ] Deliverable submitted notification (to business)
- [ ] Deliverable approved notification (to creator)
- [ ] Deliverable rejected/needs revision notification (to creator)
- [ ] Campaign completed notification (to creator and business)

### 4. Business-Creator Interactions
- [ ] Creator invited to campaign notification (to creator)
- [ ] Business profile updated notification (to followers/subscribers)
- [ ] New campaign available notification (to creators matching criteria)

## Technical Requirements

### RLS Policy Fixes
1. **Audit all notification RLS policies**
   - Review existing policies on `notifications` table
   - Identify conflicts with admin operations
   - Ensure admins can create notifications for any user
   - Ensure system functions can create notifications (SECURITY DEFINER)

2. **Fix notification service**
   - Update `notificationService.ts` to handle RLS properly
   - Use SECURITY DEFINER functions where appropriate
   - Add proper error handling and fallbacks
   - Ensure notifications work for both admin and user-initiated actions

3. **Update statusNotificationService**
   - Ensure it works with fixed RLS policies
   - Add proper error handling
   - Add retry logic for failed notifications

### Notification Types
Create or update notification types for:
- `restaurant_claim_submitted`
- `restaurant_claim_approved`
- `restaurant_claim_rejected`
- `restaurant_claim_needs_info`
- `creator_application_submitted`
- `creator_application_approved`
- `creator_application_rejected`
- `creator_application_needs_info`
- `campaign_created`
- `campaign_application_submitted`
- `campaign_application_accepted`
- `campaign_application_rejected`
- `deliverable_submitted`
- `deliverable_approved`
- `deliverable_rejected`
- `deliverable_needs_revision`
- `campaign_completed`
- `creator_invited_to_campaign`
- `business_profile_updated`
- `new_campaign_available`

### Database Schema
- Ensure `notifications` table supports all required fields
- Add indexes for performance (user_id, type, created_at, is_read)
- Consider adding notification preferences table for user opt-outs

### Frontend Integration
- Update notification UI to display new notification types
- Add notification preferences screen
- Add notification badges/counters
- Add notification history view

## Implementation Plan

### Phase 1: RLS Fixes (Critical)
1. Audit and fix notification RLS policies
2. Update notification service to use SECURITY DEFINER functions
3. Test admin notification creation
4. Re-enable notifications in admin review service

### Phase 2: Core Workflow Notifications (High Priority)
1. Restaurant claims notifications (all states)
2. Creator applications notifications (all states)
3. Test end-to-end workflows

### Phase 3: Campaign Notifications (Medium Priority)
1. Campaign lifecycle notifications
2. Application workflow notifications
3. Deliverable workflow notifications
4. Test campaign workflows

### Phase 4: Enhancement Notifications (Low Priority)
1. Business-creator interaction notifications
2. Discovery notifications (new campaigns matching criteria)
3. Profile update notifications

### Phase 5: User Experience (Medium Priority)
1. Notification preferences UI
2. Notification history
3. Notification badges/counters
4. Push notification integration (if not already done)

## Testing Requirements

- [ ] Test admin can create notifications for any user
- [ ] Test users receive notifications for their claims/applications
- [ ] Test notification delivery for all workflow states
- [ ] Test notification preferences (opt-out)
- [ ] Test notification history and read/unread states
- [ ] Test notification performance with high volume
- [ ] Test notification delivery failures and retries

## Success Criteria

1. ✅ All creator marketplace workflows send appropriate notifications
2. ✅ RLS policies allow admin and system functions to create notifications
3. ✅ Users receive timely notifications for all relevant events
4. ✅ Notification system is performant and reliable
5. ✅ Users can manage notification preferences
6. ✅ Notification UI is intuitive and useful

## Related Files

- `services/adminReviewService.ts` - Currently has notifications disabled
- `services/notificationService.ts` - Core notification service
- `services/statusNotificationService.ts` - Status change notifications
- `supabase/migrations/20250205_fix_admin_notifications_rls.sql` - RLS policy attempts
- `supabase/migrations/20250808_fix_notifications_final.sql` - Notification RLS policies
- `app/admin/reviews.tsx` - Admin review UI

## Notes

- Notification failures should not block critical operations (approvals, etc.)
- Consider using a queue system for high-volume notifications
- Consider batch notifications for multiple events
- Consider notification digests for users who receive many notifications

## Acceptance Criteria

- [ ] All notifications work without RLS errors
- [ ] Admin review system sends notifications successfully
- [ ] All creator marketplace workflows have appropriate notifications
- [ ] Notification preferences are implemented
- [ ] Notification UI is complete and functional
- [ ] Documentation updated with notification types and triggers
