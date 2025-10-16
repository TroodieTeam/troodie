# Task: Payment Processing Integration

**Epic:** deliverable-submission
**Priority:** P0 - Critical
**Estimate:** 5 days
**Status:** 🔴 Not Started

---

## Overview

Integrate payment processing for approved campaign deliverables. Supports Stripe Connect for creator payouts, handles payment status tracking, and manages failed payments.

## Business Value

Core monetization feature - enables creators to get paid for approved deliverables. Critical for marketplace trust and creator retention.

## Acceptance Criteria

```gherkin
Feature: Payment Processing

  Scenario: Process payment for approved deliverable
    Given a deliverable with status "approved" or "auto_approved"
    And payment_status is "processing"
    When payment processing is triggered
    Then Stripe payment is created
    And payment_transaction_id is stored
    And payment_status changes to "completed"
    And paid_at timestamp is set
    And creator is notified

  Scenario: Handle failed payment
    Given a payment processing attempt
    When Stripe returns an error
    Then payment_status changes to "failed"
    And error message is logged
    And admin is notified
    And creator is notified

  Scenario: Creator onboarding to Stripe Connect
    Given a creator without Stripe Connect account
    When they submit their first deliverable
    Then they are prompted to complete Stripe onboarding
    And deliverable payment is held until onboarding complete

  Scenario: Batch payment processing
    Given 10 approved deliverables
    When batch payment job runs
    Then all eligible payments are processed
    And success/failure status tracked for each
    And summary report generated

  Scenario: Payment retry logic
    Given a failed payment
    When 24 hours have passed
    Then payment is automatically retried
    And retry count is incremented
    And after 3 failed attempts, admin is alerted
```

## Technical Implementation

### 1. Install Stripe SDK

```bash
npm install stripe @stripe/stripe-react-native
```

### 2. Create Payment Service (`services/paymentService.ts`)

```typescript
import { supabase } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export interface PaymentResult {
  success: boolean;
  transaction_id?: string;
  error?: string;
}

class PaymentService {
  /**
   * Process payment for an approved deliverable
   */
  async processDeliverablePayment(deliverableId: string): Promise<PaymentResult> {
    try {
      // Get deliverable details
      const { data: deliverable, error: fetchError } = await supabase
        .from('campaign_deliverables')
        .select(`
          id,
          payment_amount_cents,
          creator_id,
          creator_profiles!inner(user_id, stripe_account_id)
        `)
        .eq('id', deliverableId)
        .single();

      if (fetchError || !deliverable) {
        return { success: false, error: 'Deliverable not found' };
      }

      // Check if creator has Stripe Connect account
      if (!deliverable.creator_profiles.stripe_account_id) {
        console.log('[PaymentService] Creator needs Stripe onboarding');
        // Update to pending_onboarding status
        await supabase
          .from('campaign_deliverables')
          .update({ payment_status: 'pending_onboarding' })
          .eq('id', deliverableId);

        return { success: false, error: 'Creator needs to complete Stripe onboarding' };
      }

      // Create Stripe Transfer (platform → creator)
      const transfer = await stripe.transfers.create({
        amount: deliverable.payment_amount_cents,
        currency: 'usd',
        destination: deliverable.creator_profiles.stripe_account_id,
        description: `Payment for deliverable ${deliverableId}`,
        metadata: {
          deliverable_id: deliverableId,
          creator_id: deliverable.creator_id,
        },
      });

      // Update deliverable with payment info
      const { error: updateError } = await supabase
        .from('campaign_deliverables')
        .update({
          payment_status: 'completed',
          payment_transaction_id: transfer.id,
          paid_at: new Date().toISOString(),
        })
        .eq('id', deliverableId);

      if (updateError) {
        console.error('[PaymentService] Error updating payment status:', updateError);
        return { success: false, error: 'Failed to update payment status' };
      }

      // Send notification to creator
      await supabase.from('notifications').insert({
        user_id: deliverable.creator_profiles.user_id,
        type: 'payment_received',
        title: 'Payment Received',
        message: `You've received $${deliverable.payment_amount_cents / 100} for your deliverable`,
        data: { deliverable_id: deliverableId },
      });

      console.log(`[PaymentService] Payment completed: ${transfer.id}`);
      return { success: true, transaction_id: transfer.id };
    } catch (error) {
      console.error('[PaymentService] Payment error:', error);

      // Update deliverable to failed status
      await supabase
        .from('campaign_deliverables')
        .update({
          payment_status: 'failed',
          payment_error: error.message,
        })
        .eq('id', deliverableId);

      return { success: false, error: error.message };
    }
  }

  /**
   * Create Stripe Connect account for creator
   */
  async createConnectAccount(creatorId: string, email: string): Promise<string | null> {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        email,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: {
          creator_id: creatorId,
        },
      });

      // Store account ID in creator profile
      await supabase
        .from('creator_profiles')
        .update({ stripe_account_id: account.id })
        .eq('id', creatorId);

      return account.id;
    } catch (error) {
      console.error('[PaymentService] Error creating Connect account:', error);
      return null;
    }
  }

  /**
   * Generate Stripe Connect onboarding link
   */
  async createOnboardingLink(
    stripeAccountId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<string | null> {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink.url;
    } catch (error) {
      console.error('[PaymentService] Error creating onboarding link:', error);
      return null;
    }
  }

  /**
   * Check if creator's Stripe account is fully onboarded
   */
  async checkOnboardingStatus(stripeAccountId: string): Promise<boolean> {
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId);
      return account.charges_enabled && account.payouts_enabled;
    } catch (error) {
      console.error('[PaymentService] Error checking onboarding:', error);
      return false;
    }
  }

  /**
   * Batch process payments for multiple deliverables
   */
  async batchProcessPayments(deliverableIds: string[]): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    results: Array<{ id: string; success: boolean; error?: string }>;
  }> {
    const results = [];
    let succeeded = 0;
    let failed = 0;

    for (const id of deliverableIds) {
      const result = await this.processDeliverablePayment(id);
      results.push({ id, ...result });

      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    return {
      total: deliverableIds.length,
      succeeded,
      failed,
      results,
    };
  }

  /**
   * Get payment history for a creator
   */
  async getCreatorPayments(creatorId: string) {
    const { data, error } = await supabase
      .from('campaign_deliverables')
      .select(`
        id,
        payment_amount_cents,
        payment_status,
        payment_transaction_id,
        paid_at,
        campaigns!inner(name)
      `)
      .eq('creator_id', creatorId)
      .in('payment_status', ['completed', 'processing', 'failed'])
      .order('paid_at', { ascending: false });

    if (error) {
      console.error('[PaymentService] Error fetching payments:', error);
      return [];
    }

    return data;
  }
}

export const paymentService = new PaymentService();
```

### 3. Update Database Schema

Add Stripe fields to creator_profiles:

```sql
ALTER TABLE creator_profiles
  ADD COLUMN stripe_account_id VARCHAR(255),
  ADD COLUMN stripe_onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN stripe_onboarded_at TIMESTAMP WITH TIME ZONE;

-- Add payment error tracking
ALTER TABLE campaign_deliverables
  ADD COLUMN payment_error TEXT,
  ADD COLUMN payment_retry_count INTEGER DEFAULT 0,
  ADD COLUMN last_payment_retry_at TIMESTAMP WITH TIME ZONE;

-- Add new payment status
ALTER TABLE campaign_deliverables
  DROP CONSTRAINT IF EXISTS campaign_deliverables_payment_status_check;

ALTER TABLE campaign_deliverables
  ADD CONSTRAINT campaign_deliverables_payment_status_check
  CHECK (payment_status IN (
    'pending',
    'pending_onboarding',
    'processing',
    'completed',
    'failed',
    'disputed',
    'refunded'
  ));
```

### 4. Create Stripe Connect Onboarding UI (`app/creator/earnings/stripe-onboarding.tsx`)

```tsx
import { paymentService } from '@/services/paymentService';
import { useState } from 'react';

export default function StripeOnboardingScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleStartOnboarding = async () => {
    setLoading(true);

    try {
      // Get creator profile
      const { data: profile } = await supabase
        .from('creator_profiles')
        .select('id, stripe_account_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) {
        Alert.alert('Error', 'Creator profile not found');
        return;
      }

      let accountId = profile.stripe_account_id;

      // Create Stripe account if doesn't exist
      if (!accountId) {
        accountId = await paymentService.createConnectAccount(
          profile.id,
          user?.email || ''
        );
      }

      if (!accountId) {
        Alert.alert('Error', 'Failed to create payment account');
        return;
      }

      // Generate onboarding link
      const onboardingUrl = await paymentService.createOnboardingLink(
        accountId,
        'troodie://creator/earnings?onboarding=success',
        'troodie://creator/earnings?onboarding=refresh'
      );

      if (!onboardingUrl) {
        Alert.alert('Error', 'Failed to generate onboarding link');
        return;
      }

      // Open Stripe onboarding in browser
      await WebBrowser.openBrowserAsync(onboardingUrl);
    } catch (error) {
      console.error('Onboarding error:', error);
      Alert.alert('Error', 'Failed to start onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Up Payments</Text>
      <Text style={styles.description}>
        Connect your bank account to receive payments for your deliverables.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleStartOnboarding}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Connect with Stripe</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
```

### 5. Create Payment Retry Edge Function (`supabase/functions/retry-failed-payments/index.ts`)

```typescript
serve(async (req) => {
  // Find failed payments older than 24 hours
  const { data: failedPayments } = await supabase
    .from('campaign_deliverables')
    .select('id, payment_retry_count')
    .eq('payment_status', 'failed')
    .lt('payment_retry_count', 3)
    .or(
      `last_payment_retry_at.is.null,last_payment_retry_at.lt.${new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString()}`
    );

  for (const payment of failedPayments || []) {
    // Retry payment
    // Update retry count
    await supabase
      .from('campaign_deliverables')
      .update({
        payment_retry_count: payment.payment_retry_count + 1,
        last_payment_retry_at: new Date().toISOString(),
      })
      .eq('id', payment.id);
  }
});
```

## Files to Create/Modify

- ✅ `services/paymentService.ts` - New payment service
- ✅ `app/creator/earnings/stripe-onboarding.tsx` - Onboarding UI
- ✅ `supabase/functions/retry-failed-payments/index.ts` - Retry edge function
- ✅ `supabase/migrations/20251012_payment_stripe_fields.sql` - Schema updates
- ✅ Environment variables: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`

## Dependencies

- ✅ task-cd-001-deliverable-submission-schema.md (Database schema)
- ✅ Stripe account setup (production + test mode)
- 🔴 Notification system

## Definition of Done

- [ ] Stripe SDK installed and configured
- [ ] Payment service created with all methods
- [ ] Stripe Connect account creation works
- [ ] Onboarding link generation works
- [ ] Payment processing creates Stripe transfers
- [ ] Failed payments logged with error messages
- [ ] Payment retry logic implemented
- [ ] Creator onboarding UI completed
- [ ] Payment history display works
- [ ] Tested in Stripe test mode
- [ ] Environment variables configured
- [ ] Error handling robust
- [ ] Webhook handlers for Stripe events (optional Phase 2)

## Testing Checklist

- [ ] Create test Stripe Connect account
- [ ] Complete onboarding flow
- [ ] Process test payment
- [ ] Verify transaction ID stored
- [ ] Test failed payment scenario
- [ ] Test retry logic
- [ ] Check notification sent to creator
- [ ] Verify payment history displays correctly

## Related Tasks

- task-cd-001-deliverable-submission-schema.md (Prerequisites)
- task-cd-002-deliverable-submission-service.md (Integrates with)
- task-cd-005-auto-approval-cron.md (Triggers payment)
- task-cd-008-deliverable-notifications.md (Notifications)
