import { calculateCreatorPayout, getStripeClient } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { notificationService } from './notificationService';

const stripe = getStripeClient();

export interface PayoutResult {
  success: boolean;
  transferId?: string;
  transactionId?: string;
  error?: string;
}

/**
 * Process payout for an approved deliverable
 */
export async function processDeliverablePayout(
  deliverableId: string
): Promise<PayoutResult> {
  try {
    // Get deliverable details
    const { data: deliverable, error: deliverableError } = await supabase
      .from('campaign_deliverables')
      .select(`
        id,
        creator_id,
        campaign_id,
        campaign_application_id,
        payment_amount_cents,
        payment_status,
        creator_profiles!inner(user_id, stripe_account_id, stripe_onboarding_completed)
      `)
      .eq('id', deliverableId)
      .single();

    if (deliverableError || !deliverable) {
      return {
        success: false,
        error: 'Deliverable not found',
      };
    }

    // Check if already paid
    if (deliverable.payment_status === 'completed') {
      return {
        success: false,
        error: 'Deliverable already paid',
      };
    }

    // Check if deliverable is approved
    if (deliverable.status !== 'approved' && deliverable.status !== 'auto_approved') {
      return {
        success: false,
        error: 'Deliverable must be approved before payout',
      };
    }

    // Get campaign title for notifications
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('title')
      .eq('id', deliverable.campaign_id)
      .single();

    // Check if creator has Stripe account
    if (!deliverable.creator_profiles?.stripe_account_id) {
      // Update deliverable status to pending onboarding
      await supabase
        .from('campaign_deliverables')
        .update({
          payment_status: 'pending_onboarding',
        })
        .eq('id', deliverableId);

      // Send onboarding required notification
      if (campaign && deliverable.creator_profiles?.user_id) {
        await notificationService.createPayoutOnboardingRequiredNotification(
          deliverable.creator_profiles.user_id,
          deliverableId,
          deliverable.campaign_id,
          campaign.title
        );
      }

      return {
        success: false,
        error: 'Creator needs to complete Stripe onboarding',
      };
    }

    if (!deliverable.creator_profiles.stripe_onboarding_completed) {
      await supabase
        .from('campaign_deliverables')
        .update({
          payment_status: 'pending_onboarding',
        })
        .eq('id', deliverableId);

      // Send onboarding required notification
      if (campaign && deliverable.creator_profiles?.user_id) {
        await notificationService.createPayoutOnboardingRequiredNotification(
          deliverable.creator_profiles.user_id,
          deliverableId,
          deliverable.campaign_id,
          campaign.title
        );
      }

      return {
        success: false,
        error: 'Creator Stripe account not fully onboarded',
      };
    }

    // Get campaign payment to verify funds are available
    const { data: campaignPayment } = await supabase
      .from('campaign_payments')
      .select('creator_payout_cents, amount_cents')
      .eq('campaign_id', deliverable.campaign_id)
      .eq('status', 'succeeded')
      .single();

    if (!campaignPayment) {
      return {
        success: false,
        error: 'Campaign payment not found or not completed',
      };
    }

    // Calculate payout amount (use deliverable payment_amount_cents if set, otherwise calculate)
    const payoutAmountCents = deliverable.payment_amount_cents || 
      calculateCreatorPayout(campaignPayment.amount_cents);

    // Create Stripe Transfer to creator
    const transfer = await stripe.transfers.create({
      amount: payoutAmountCents,
      currency: 'usd',
      destination: deliverable.creator_profiles.stripe_account_id,
      description: `Payout for deliverable ${deliverableId}`,
      metadata: {
        deliverable_id: deliverableId,
        creator_id: deliverable.creator_id,
        campaign_id: deliverable.campaign_id,
      },
    });

    // Update deliverable payment status
    const { error: updateError } = await supabase
      .from('campaign_deliverables')
      .update({
        payment_status: 'processing',
        payment_transaction_id: transfer.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliverableId);

    if (updateError) {
      console.error('Error updating deliverable:', updateError);
      // Try to reverse the transfer if possible
      return {
        success: false,
        error: 'Failed to update deliverable payment status',
      };
    }

    // Get campaign and business info for transaction record
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('business_id')
      .eq('id', deliverable.campaign_id)
      .single();

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        campaign_id: deliverable.campaign_id,
        deliverable_id: deliverableId,
        creator_id: deliverable.creator_id,
        business_id: campaign?.business_id,
        stripe_transfer_id: transfer.id,
        amount_cents: payoutAmountCents,
        platform_fee_cents: 0, // Fee already deducted from campaign payment
        creator_amount_cents: payoutAmountCents,
        transaction_type: 'payout',
        status: 'processing',
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating transaction record:', transactionError);
    }

    // Send payout processing notification (will be updated to "received" when transfer completes)
    if (campaign && deliverable.creator_profiles?.user_id) {
      // Note: We'll send the "received" notification from the webhook handler
      // when transfer.paid event is received
    }

    return {
      success: true,
      transferId: transfer.id,
      transactionId: transaction?.id,
    };
  } catch (error) {
    console.error('Error processing payout:', error);
    
    // Update deliverable status to failed
    await supabase
      .from('campaign_deliverables')
      .update({
        payment_status: 'failed',
        payment_error: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliverableId);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process payout',
    };
  }
}

/**
 * Handle successful transfer (called from webhook)
 */
export async function handleTransferSuccess(transferId: string): Promise<void> {
  try {
    // Find deliverable by transfer ID
    const { data: deliverable } = await supabase
      .from('campaign_deliverables')
      .select(`
        id,
        creator_id,
        campaign_id,
        payment_amount_cents,
        creator_profiles!inner(user_id)
      `)
      .eq('payment_transaction_id', transferId)
      .single();

    if (deliverable) {
      await supabase
        .from('campaign_deliverables')
        .update({
          payment_status: 'completed',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliverable.id);

      // Get campaign title for notification
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('title')
        .eq('id', deliverable.campaign_id)
        .single();

      // Send payout received notification
      if (campaign && deliverable.creator_profiles?.user_id) {
        const payoutAmount = deliverable.payment_amount_cents || 0;
        await notificationService.createPayoutReceivedNotification(
          deliverable.creator_profiles.user_id,
          deliverable.id,
          deliverable.campaign_id,
          campaign.title,
          payoutAmount
        );
      }
    }

    // Update transaction record
    await supabase
      .from('payment_transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_transfer_id', transferId);
  } catch (error) {
    console.error('Error handling transfer success:', error);
  }
}

/**
 * Handle failed transfer
 */
export async function handleTransferFailure(transferId: string, errorMessage: string): Promise<void> {
  try {
    const { data: deliverable } = await supabase
      .from('campaign_deliverables')
      .select('id, payment_retry_count')
      .eq('payment_transaction_id', transferId)
      .single();

    if (deliverable) {
      const retryCount = (deliverable.payment_retry_count || 0) + 1;
      
      await supabase
        .from('campaign_deliverables')
        .update({
          payment_status: retryCount >= 3 ? 'failed' : 'processing',
          payment_error: errorMessage,
          payment_retry_count: retryCount,
          last_payment_retry_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliverable.id);
    }

    // Update transaction record
    await supabase
      .from('payment_transactions')
      .update({
        status: 'failed',
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_transfer_id', transferId);
  } catch (error) {
    console.error('Error handling transfer failure:', error);
  }
}

/**
 * Retry failed payout
 */
export async function retryFailedPayout(deliverableId: string): Promise<PayoutResult> {
  // Reset payment status and retry
  await supabase
    .from('campaign_deliverables')
    .update({
      payment_status: 'processing',
      payment_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deliverableId);

  return processDeliverablePayout(deliverableId);
}
