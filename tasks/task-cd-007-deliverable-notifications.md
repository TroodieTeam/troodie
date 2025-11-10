# Task: Deliverable Notification System

**Epic:** deliverable-submission
**Priority:** P1 - High
**Estimate:** 2 days
**Status:** 🔴 Not Started

---

## Overview

Implement comprehensive notification system for deliverable workflow events. Includes in-app notifications, push notifications, and email alerts for submission, approval, rejection, and payment events.

## Business Value

Keeps creators and restaurant owners informed about deliverable status changes. Critical for engagement, trust, and reducing response times.

## Acceptance Criteria

```gherkin
Feature: Deliverable Notifications

  Scenario: Restaurant notified of new deliverable
    Given a creator submits a deliverable
    When the submission is successful
    Then restaurant owner receives in-app notification
    And push notification if enabled
    And email notification

  Scenario: Creator notified of approval
    Given restaurant approves a deliverable
    When approval is processed
    Then creator receives in-app notification
    And push notification
    And includes payment amount and status

  Scenario: Creator notified of rejection
    Given restaurant rejects a deliverable
    When rejection is processed
    Then creator receives in-app notification
    And push notification
    And includes rejection reason

  Scenario: Creator notified of revision request
    Given restaurant requests revision
    When request is sent
    Then creator receives in-app notification
    And push notification
    And includes specific revision notes

  Scenario: Creator notified of auto-approval
    Given deliverable is auto-approved after 72 hours
    When auto-approval occurs
    Then creator receives in-app notification
    And push notification
    And payment processing notification

  Scenario: Creator notified of payment
    Given payment is successfully processed
    When payment completes
    Then creator receives in-app notification
    And push notification
    And includes transaction details

  Scenario: Restaurant notified of approaching auto-approval
    Given deliverable will auto-approve in 24 hours
    When check runs
    Then restaurant receives reminder notification
    And push notification
    And shows countdown timer
```

## Technical Implementation

### 1. Extend Notification Service (`services/deliverableNotificationService.ts`)

```typescript
import { supabase } from '@/lib/supabase';
import { notificationService } from '@/services/notificationService';
import { pushNotificationService } from '@/services/pushNotificationService';

class DeliverableNotificationService {
  /**
   * Notify restaurant of new deliverable submission
   */
  async notifyDeliverableSubmitted(deliverableId: string, restaurantId: string) {
    try {
      // Get restaurant owner user_id
      const { data: business } = await supabase
        .from('business_profiles')
        .select('user_id')
        .eq('restaurant_id', restaurantId)
        .single();

      if (!business) return;

      // Get deliverable details for notification
      const { data: deliverable } = await supabase
        .from('campaign_deliverables')
        .select(`
          id,
          campaigns!inner(name),
          creator_profiles!inner(display_name)
        `)
        .eq('id', deliverableId)
        .single();

      if (!deliverable) return;

      // Create in-app notification
      await notificationService.create({
        user_id: business.user_id,
        type: 'deliverable_submitted',
        title: 'New Deliverable Submitted',
        message: `${deliverable.creator_profiles.display_name} submitted content for "${deliverable.campaigns.name}"`,
        data: {
          deliverable_id: deliverableId,
          action: 'review_deliverable',
        },
        action_url: `/business/content/${deliverableId}`,
      });

      // Send push notification
      await pushNotificationService.sendToUser(business.user_id, {
        title: 'New Deliverable Submitted',
        body: `${deliverable.creator_profiles.display_name} submitted content - review within 72 hours`,
        data: { deliverable_id: deliverableId },
      });

      console.log('[DeliverableNotifications] Restaurant notified of submission');
    } catch (error) {
      console.error('[DeliverableNotifications] Error notifying restaurant:', error);
    }
  }

  /**
   * Notify creator of deliverable approval
   */
  async notifyDeliverableApproved(deliverableId: string, creatorUserId: string) {
    try {
      const { data: deliverable } = await supabase
        .from('campaign_deliverables')
        .select('payment_amount_cents, campaigns!inner(name)')
        .eq('id', deliverableId)
        .single();

      if (!deliverable) return;

      const paymentAmount = (deliverable.payment_amount_cents / 100).toFixed(2);

      await notificationService.create({
        user_id: creatorUserId,
        type: 'deliverable_approved',
        title: 'Deliverable Approved! 🎉',
        message: `Your content for "${deliverable.campaigns.name}" was approved. Payment of $${paymentAmount} is being processed.`,
        data: {
          deliverable_id: deliverableId,
          payment_amount_cents: deliverable.payment_amount_cents,
        },
        action_url: `/creator/deliverables/${deliverableId}`,
      });

      await pushNotificationService.sendToUser(creatorUserId, {
        title: 'Deliverable Approved!',
        body: `Payment of $${paymentAmount} is being processed`,
        data: { deliverable_id: deliverableId },
      });

      console.log('[DeliverableNotifications] Creator notified of approval');
    } catch (error) {
      console.error('[DeliverableNotifications] Error notifying creator:', error);
    }
  }

  /**
   * Notify creator of deliverable rejection
   */
  async notifyDeliverableRejected(
    deliverableId: string,
    creatorUserId: string,
    rejectionReason: string
  ) {
    try {
      const { data: deliverable } = await supabase
        .from('campaign_deliverables')
        .select('campaigns!inner(name)')
        .eq('id', deliverableId)
        .single();

      if (!deliverable) return;

      await notificationService.create({
        user_id: creatorUserId,
        type: 'deliverable_rejected',
        title: 'Deliverable Needs Improvement',
        message: `Your content for "${deliverable.campaigns.name}" was not approved. Reason: ${rejectionReason}`,
        data: {
          deliverable_id: deliverableId,
          rejection_reason: rejectionReason,
        },
        action_url: `/creator/deliverables/${deliverableId}`,
      });

      await pushNotificationService.sendToUser(creatorUserId, {
        title: 'Deliverable Rejected',
        body: 'Tap to see feedback and improve your content',
        data: { deliverable_id: deliverableId },
      });

      console.log('[DeliverableNotifications] Creator notified of rejection');
    } catch (error) {
      console.error('[DeliverableNotifications] Error notifying creator:', error);
    }
  }

  /**
   * Notify creator of revision request
   */
  async notifyRevisionRequested(
    deliverableId: string,
    creatorUserId: string,
    revisionNotes: string
  ) {
    try {
      const { data: deliverable } = await supabase
        .from('campaign_deliverables')
        .select('campaigns!inner(name)')
        .eq('id', deliverableId)
        .single();

      if (!deliverable) return;

      await notificationService.create({
        user_id: creatorUserId,
        type: 'revision_requested',
        title: 'Revision Requested',
        message: `Please revise your content for "${deliverable.campaigns.name}". ${revisionNotes}`,
        data: {
          deliverable_id: deliverableId,
          revision_notes: revisionNotes,
        },
        action_url: `/creator/deliverables/${deliverableId}`,
      });

      await pushNotificationService.sendToUser(creatorUserId, {
        title: 'Revision Requested',
        body: 'Restaurant provided feedback - tap to see details',
        data: { deliverable_id: deliverableId },
      });

      console.log('[DeliverableNotifications] Creator notified of revision request');
    } catch (error) {
      console.error('[DeliverableNotifications] Error notifying creator:', error);
    }
  }

  /**
   * Notify creator of auto-approval
   */
  async notifyAutoApproved(deliverableId: string, creatorUserId: string) {
    try {
      const { data: deliverable } = await supabase
        .from('campaign_deliverables')
        .select('payment_amount_cents, campaigns!inner(name)')
        .eq('id', deliverableId)
        .single();

      if (!deliverable) return;

      const paymentAmount = (deliverable.payment_amount_cents / 100).toFixed(2);

      await notificationService.create({
        user_id: creatorUserId,
        type: 'deliverable_auto_approved',
        title: 'Deliverable Auto-Approved ✨',
        message: `Your content for "${deliverable.campaigns.name}" was automatically approved. Payment of $${paymentAmount} is being processed.`,
        data: {
          deliverable_id: deliverableId,
          payment_amount_cents: deliverable.payment_amount_cents,
        },
        action_url: `/creator/deliverables/${deliverableId}`,
      });

      await pushNotificationService.sendToUser(creatorUserId, {
        title: 'Auto-Approved!',
        body: `$${paymentAmount} payment is being processed`,
        data: { deliverable_id: deliverableId },
      });

      console.log('[DeliverableNotifications] Creator notified of auto-approval');
    } catch (error) {
      console.error('[DeliverableNotifications] Error notifying creator:', error);
    }
  }

  /**
   * Notify creator of payment completion
   */
  async notifyPaymentCompleted(
    deliverableId: string,
    creatorUserId: string,
    transactionId: string
  ) {
    try {
      const { data: deliverable } = await supabase
        .from('campaign_deliverables')
        .select('payment_amount_cents')
        .eq('id', deliverableId)
        .single();

      if (!deliverable) return;

      const paymentAmount = (deliverable.payment_amount_cents / 100).toFixed(2);

      await notificationService.create({
        user_id: creatorUserId,
        type: 'payment_completed',
        title: 'Payment Received! 💰',
        message: `$${paymentAmount} has been deposited to your account`,
        data: {
          deliverable_id: deliverableId,
          transaction_id: transactionId,
          amount_cents: deliverable.payment_amount_cents,
        },
        action_url: `/creator/earnings`,
      });

      await pushNotificationService.sendToUser(creatorUserId, {
        title: 'Payment Received!',
        body: `$${paymentAmount} deposited to your account`,
        data: { deliverable_id: deliverableId },
      });

      console.log('[DeliverableNotifications] Creator notified of payment');
    } catch (error) {
      console.error('[DeliverableNotifications] Error notifying creator:', error);
    }
  }

  /**
   * Notify restaurant of approaching auto-approval (24h warning)
   */
  async notifyApproachingAutoApproval(deliverableId: string, restaurantUserId: string) {
    try {
      const { data: deliverable } = await supabase
        .from('campaign_deliverables')
        .select(`
          id,
          submitted_at,
          campaigns!inner(name),
          creator_profiles!inner(display_name)
        `)
        .eq('id', deliverableId)
        .single();

      if (!deliverable) return;

      const hoursRemaining = Math.floor(
        (72 - (Date.now() - new Date(deliverable.submitted_at).getTime()) /
        (1000 * 60 * 60))
      );

      await notificationService.create({
        user_id: restaurantUserId,
        type: 'auto_approval_warning',
        title: 'Deliverable Needs Review',
        message: `Content from ${deliverable.creator_profiles.display_name} will auto-approve in ${hoursRemaining} hours`,
        data: {
          deliverable_id: deliverableId,
          hours_remaining: hoursRemaining,
        },
        action_url: `/business/content/${deliverableId}`,
      });

      await pushNotificationService.sendToUser(restaurantUserId, {
        title: 'Urgent: Review Needed',
        body: `Content will auto-approve in ${hoursRemaining} hours`,
        data: { deliverable_id: deliverableId },
      });

      console.log('[DeliverableNotifications] Restaurant notified of approaching auto-approval');
    } catch (error) {
      console.error('[DeliverableNotifications] Error sending warning:', error);
    }
  }

  /**
   * Batch notify restaurants of approaching auto-approvals
   */
  async notifyAllApproachingAutoApprovals() {
    try {
      // Find deliverables that will auto-approve in < 24 hours
      const cutoff24h = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
      const cutoff72h = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72 hours ago

      const { data: approaching } = await supabase
        .from('campaign_deliverables')
        .select(`
          id,
          restaurant_id,
          business_profiles!inner(user_id)
        `)
        .eq('status', 'pending_review')
        .lt('submitted_at', cutoff24h.toISOString())
        .gt('submitted_at', cutoff72h.toISOString());

      if (!approaching) return;

      for (const deliverable of approaching) {
        await this.notifyApproachingAutoApproval(
          deliverable.id,
          deliverable.business_profiles.user_id
        );
      }

      console.log(`[DeliverableNotifications] Sent ${approaching.length} auto-approval warnings`);
    } catch (error) {
      console.error('[DeliverableNotifications] Error in batch warnings:', error);
    }
  }
}

export const deliverableNotificationService = new DeliverableNotificationService();
```

### 2. Integrate Notifications into Services

Update `deliverableService.ts`:

```typescript
import { deliverableNotificationService } from './deliverableNotificationService';

// In submitDeliverable:
await deliverableNotificationService.notifyDeliverableSubmitted(data.id, data.restaurant_id);

// In approveDeliverable:
await deliverableNotificationService.notifyDeliverableApproved(data.id, data.creator_id);

// In rejectDeliverable:
await deliverableNotificationService.notifyDeliverableRejected(data.id, data.creator_id, rejectionReason);

// In requestRevision:
await deliverableNotificationService.notifyRevisionRequested(data.id, data.creator_id, revisionNotes);
```

### 3. Add Auto-Approval Warning Cron

Create edge function for 24h warnings:

```typescript
// supabase/functions/auto-approval-warnings/index.ts
import { deliverableNotificationService } from './deliverableNotificationService';

serve(async (req) => {
  await deliverableNotificationService.notifyAllApproachingAutoApprovals();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Schedule to run every 6 hours.

## Files to Create/Modify

- ✅ `services/deliverableNotificationService.ts` - New notification service
- ✅ `services/deliverableService.ts` - Integrate notifications
- ✅ `services/paymentService.ts` - Add payment notifications
- ✅ `supabase/functions/auto-approval-warnings/index.ts` - Warning cron

## Dependencies

- ✅ task-cd-002-deliverable-submission-service.md (Service layer)
- ✅ Existing notification system
- ✅ Push notification infrastructure

## Definition of Done

- [ ] Notification service created with all methods
- [ ] Restaurant notified on deliverable submission
- [ ] Creator notified on approval
- [ ] Creator notified on rejection with reason
- [ ] Creator notified on revision request with notes
- [ ] Creator notified on auto-approval
- [ ] Creator notified on payment completion
- [ ] Restaurant notified 24h before auto-approval
- [ ] Push notifications work on iOS and Android
- [ ] In-app notifications displayed correctly
- [ ] Notification action URLs navigate correctly
- [ ] Tested all notification scenarios
- [ ] Notification preferences respected

## Testing Checklist

- [ ] Submit deliverable → verify restaurant notification
- [ ] Approve deliverable → verify creator notification
- [ ] Reject deliverable → verify creator gets reason
- [ ] Request revision → verify creator gets notes
- [ ] Auto-approve → verify creator notification
- [ ] Complete payment → verify creator notification
- [ ] Create deliverable 50h old → verify restaurant warning
- [ ] Test push notifications on device
- [ ] Test deep links from notifications

## Related Tasks

- task-cd-002-deliverable-submission-service.md (Integrates with)
- task-cd-005-auto-approval-cron.md (Auto-approval notifications)
- task-cd-006-payment-processing.md (Payment notifications)
