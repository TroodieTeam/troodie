import { supabase } from '@/lib/supabase';
import { notificationService } from './notificationService';

// Client-safe version - Stripe SDK operations should be done via Edge Functions
// This file provides database-only operations for React Native client

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
    console.log('[PayoutService] 🚀 Starting payout process', { deliverableId });
    
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
        status,
        creator_profiles!inner(user_id, stripe_account_id, stripe_onboarding_completed)
      `)
      .eq('id', deliverableId)
      .single();

    if (deliverableError || !deliverable) {
      console.error('[PayoutService] ❌ Deliverable not found:', deliverableError);
      return {
        success: false,
        error: 'Deliverable not found',
      };
    }

    // Extract creator profile data (Supabase joins can return arrays or objects)
    const deliverableData = deliverable as any;
    const creatorProfileData = deliverableData.creator_profiles;
    const creatorProfile = Array.isArray(creatorProfileData) 
      ? creatorProfileData[0] 
      : creatorProfileData;

    console.log('[PayoutService] 📋 Deliverable details:', {
      deliverable_id: deliverableData.id,
      status: deliverableData.status,
      payment_status: deliverableData.payment_status,
      payment_amount_cents: deliverableData.payment_amount_cents,
      has_stripe_account: !!creatorProfile?.stripe_account_id,
      onboarding_completed: creatorProfile?.stripe_onboarding_completed,
    });

    // Check if already paid
    if (deliverableData.payment_status === 'completed') {
      console.log('[PayoutService] ⏭️ Skipping - already paid');
      return {
        success: false,
        error: 'Deliverable already paid',
      };
    }

    // Check if deliverable is approved
    if (deliverableData.status !== 'approved' && deliverableData.status !== 'auto_approved') {
      console.error('[PayoutService] ❌ Deliverable not approved:', {
        deliverableId,
        status: deliverableData.status,
        expected: ['approved', 'auto_approved'],
      });
      return {
        success: false,
        error: `Deliverable must be approved before payout. Current status: ${deliverableData.status || 'unknown'}`,
      };
    }

    // Get campaign title and business_id for notifications and transaction record
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('title, business_id')
      .eq('id', deliverableData.campaign_id)
      .single();

    // Check if creator has Stripe account
    if (!creatorProfile?.stripe_account_id) {
      console.log('[PayoutService] ⏸️ Blocked - creator needs Stripe account');
      // Update deliverable status to pending onboarding
      await supabase
        .from('campaign_deliverables')
        .update({
          payment_status: 'pending_onboarding',
        })
        .eq('id', deliverableId);

      // Send onboarding required notification
      if (campaign && creatorProfile?.user_id) {
        await notificationService.createPayoutOnboardingRequiredNotification(
          creatorProfile.user_id,
          deliverableId,
          deliverableData.campaign_id,
          campaign.title
        );
      }

      return {
        success: false,
        error: 'Creator needs to complete Stripe onboarding',
      };
    }

    if (!creatorProfile.stripe_onboarding_completed) {
      console.log('[PayoutService] ⏸️ Blocked - creator onboarding not completed');
      await supabase
        .from('campaign_deliverables')
        .update({
          payment_status: 'pending_onboarding',
        })
        .eq('id', deliverableId);

      // Send onboarding required notification
      if (campaign && creatorProfile?.user_id) {
        await notificationService.createPayoutOnboardingRequiredNotification(
          creatorProfile.user_id,
          deliverableId,
          deliverableData.campaign_id,
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
      .eq('campaign_id', deliverableData.campaign_id)
      .eq('status', 'succeeded')
      .single();

    if (!campaignPayment) {
      return {
        success: false,
        error: 'Campaign payment not found or not completed',
      };
    }

    // Calculate payout amount
    // Priority: use deliverable.payment_amount_cents (set during approval) > campaign_payments.creator_payout_cents > campaign_payments.amount_cents
    let payoutAmountCents = deliverableData.payment_amount_cents;
    
    if (!payoutAmountCents || payoutAmountCents === 0) {
      // Fallback to campaign payment amounts if deliverable amount not set
      payoutAmountCents = campaignPayment.creator_payout_cents || campaignPayment.amount_cents;
    }
    
    // Validate we have a valid amount
    if (!payoutAmountCents || payoutAmountCents <= 0) {
      console.error('[PayoutService] ❌ Invalid payout amount:', {
        deliverable_id: deliverableId,
        deliverable_payment_amount_cents: deliverableData.payment_amount_cents,
        campaign_payment_creator_payout_cents: campaignPayment.creator_payout_cents,
        campaign_payment_amount_cents: campaignPayment.amount_cents,
      });
      return {
        success: false,
        error: 'Invalid payout amount: payment_amount_cents must be set and greater than 0',
      };
    }

    console.log('[PayoutService] ✅ All checks passed - invoking stripe-process-payout', {
      deliverable_id: deliverableId,
      amount_cents: payoutAmountCents,
      amount_dollars: payoutAmountCents / 100,
      stripe_account_id: creatorProfile.stripe_account_id,
    });

    // Call Edge Function to create Stripe Transfer
    const { data: transferResult, error: transferError } = await supabase.functions.invoke(
      'stripe-process-payout',
      {
        body: {
          deliverableId,
          creatorId: deliverableData.creator_id,
          campaignId: deliverableData.campaign_id,
          amountCents: payoutAmountCents,
          stripeAccountId: creatorProfile.stripe_account_id,
        },
      }
    );

    if (transferError || !transferResult?.success) {
      const errorMessage = transferResult?.error || transferError?.message || 'Failed to create transfer';
      const errorDetails = transferResult?.stripeError || transferResult?.details || transferResult?.hint;
      
      console.error('[PayoutService] ❌ Edge Function error:', {
        error: errorMessage,
        errorDetails,
        stripeError: transferResult?.stripeError,
        stripeCode: transferResult?.stripeCode,
        transferError: transferError ? {
          message: transferError.message,
          name: transferError.name,
          status: (transferError as any)?.status,
        } : null,
        transferResult,
      });
      
      return {
        success: false,
        error: errorDetails ? `${errorMessage} (${errorDetails})` : errorMessage,
      };
    }

    const transferId = transferResult.transferId;
    const transactionId = transferResult.transactionId;

    console.log('[PayoutService] ✅ Payout initiated successfully', {
      transfer_id: transferId,
      transaction_id: transactionId,
    });

    return {
      success: true,
      transferId,
      transactionId,
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
      const deliverableData = deliverable as any;
      const creatorProfileData = deliverableData.creator_profiles;
      const creatorProfile = Array.isArray(creatorProfileData) 
        ? creatorProfileData[0] 
        : creatorProfileData;

      await supabase
        .from('campaign_deliverables')
        .update({
          payment_status: 'completed',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliverableData.id);

      // Get campaign title for notification
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('title')
        .eq('id', deliverableData.campaign_id)
        .single();

      // Send payout received notification
      if (campaign && creatorProfile?.user_id) {
        const payoutAmount = deliverableData.payment_amount_cents || 0;
        await notificationService.createPayoutReceivedNotification(
          creatorProfile.user_id,
          deliverableData.id,
          deliverableData.campaign_id,
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
