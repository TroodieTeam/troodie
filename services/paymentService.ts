import { supabase } from '@/lib/supabase';
import { notificationService } from './notificationService';

// Client-safe version - Stripe SDK operations should be done via Edge Functions
// This file provides database-only operations for React Native client

export interface PaymentIntentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  error?: string;
}

export interface PaymentConfirmationResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

/**
 * Create a payment intent for a campaign
 * NOTE: This should be called via Edge Function, not directly from client
 * Client should call: supabase.functions.invoke('stripe-create-payment-intent', {...})
 */
export async function createCampaignPaymentIntent(
  campaignId: string,
  businessId: string,
  amountCents: number
): Promise<PaymentIntentResult> {
  // This function requires Stripe SDK - should be moved to Edge Function
  // For now, call Edge Function
  try {
    console.log('[paymentService] Calling stripe-create-payment-intent Edge Function...', {
      campaignId,
      businessId,
      amountCents,
    });

    // Ensure we have a valid session before calling Edge Function
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session) {
      console.error('[paymentService] ❌ No valid session:', sessionError);
      return {
        success: false,
        error: 'Authentication session missing. Please sign in again.',
      };
    }

    console.log('[paymentService] ✅ Session validated, calling Edge Function...');

    const { data, error } = await supabase.functions.invoke('stripe-create-payment-intent', {
      body: {
        campaignId,
        businessId,
        amountCents,
      },
    });

    if (error) {
      console.error('[paymentService] ❌ Edge Function error:', {
        message: error.message,
        name: error.name,
        status: (error as any)?.status,
        context: (error as any)?.context,
      });
      return {
        success: false,
        error: error.message || 'Failed to create payment intent',
      };
    }

    console.log('[paymentService] ✅ Edge Function response:', {
      success: data?.success,
      paymentIntentId: data?.paymentIntentId,
      hasClientSecret: !!data?.clientSecret,
      error: data?.error,
    });

    return {
      success: data?.success || false,
      paymentIntentId: data?.paymentIntentId,
      clientSecret: data?.clientSecret,
      error: data?.error,
    };
  } catch (error) {
    console.error('[paymentService] ❌ Exception creating payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment intent',
    };
  }
}

/**
 * Handle successful payment (called from webhook/Edge Function)
 * NOTE: This should only be called server-side (Edge Functions)
 */
export async function handlePaymentSuccess(
  paymentIntentId: string
): Promise<PaymentConfirmationResult> {
  // This function requires Stripe SDK - should only be called from Edge Functions
  // Webhook handler already handles this, so this is mainly for reference
  return {
    success: false,
    error: 'handlePaymentSuccess should only be called from Edge Functions/webhooks',
  };
}

/**
 * Handle failed payment
 */
export async function handlePaymentFailure(paymentIntentId: string): Promise<void> {
  try {
    const { data: payment } = await supabase
      .from('campaign_payments')
      .select('id, campaign_id, business_id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (payment) {
      await supabase
        .from('campaign_payments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      await supabase
        .from('campaigns')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.campaign_id);

      // Get campaign title for notification
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('title')
        .eq('id', payment.campaign_id)
        .single();

      // Send failure notification to business
      if (campaign) {
        await notificationService.createPaymentFailedNotification(
          payment.business_id,
          payment.campaign_id,
          campaign.title
        );
      }
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

/**
 * Get payment status for a campaign
 * Returns comprehensive payment information including verification status
 */
export async function getCampaignPaymentStatus(campaignId: string) {
  // Get payment record
  const { data: payment, error: paymentError } = await supabase
    .from('campaign_payments')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Get campaign payment status
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('payment_status, paid_at, payment_intent_id')
    .eq('id', campaignId)
    .single();

  // Get transaction record
  const { data: transaction } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('transaction_type', 'payment')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Determine verification status
  let verificationStatus: 'charged' | 'pending' | 'failed' | 'not_found' = 'not_found';
  let isCharged = false;

  if (payment) {
    if (payment.status === 'succeeded' && campaign?.payment_status === 'paid') {
      verificationStatus = 'charged';
      isCharged = true;
    } else if (payment.status === 'pending' || payment.status === 'processing') {
      verificationStatus = 'pending';
    } else if (payment.status === 'failed') {
      verificationStatus = 'failed';
    }
  }

  return {
    payment,
    campaign: campaign ? {
      payment_status: campaign.payment_status,
      paid_at: campaign.paid_at,
      payment_intent_id: campaign.payment_intent_id,
    } : null,
    transaction,
    verificationStatus,
    isCharged,
    error: paymentError || campaignError,
  };
}
