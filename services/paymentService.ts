import { calculateCreatorPayout, calculatePlatformFee, getStripeClient } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { notificationService } from './notificationService';

const stripe = getStripeClient();

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
 */
export async function createCampaignPaymentIntent(
  campaignId: string,
  businessId: string,
  amountCents: number
): Promise<PaymentIntentResult> {
  try {
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, restaurant_id, title')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return {
        success: false,
        error: 'Campaign not found',
      };
    }

    // Calculate fees
    const platformFeeCents = calculatePlatformFee(amountCents);
    const creatorPayoutCents = calculateCreatorPayout(amountCents);

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      metadata: {
        campaign_id: campaignId,
        business_id: businessId,
        restaurant_id: campaign.restaurant_id,
        platform_fee_cents: platformFeeCents.toString(),
        creator_payout_cents: creatorPayoutCents.toString(),
      },
      description: `Campaign: ${campaign.title}`,
    });

    // Store payment record
    const { error: insertError } = await supabase
      .from('campaign_payments')
      .insert({
        campaign_id: campaignId,
        business_id: businessId,
        restaurant_id: campaign.restaurant_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: amountCents,
        platform_fee_cents: platformFeeCents,
        creator_payout_cents: creatorPayoutCents,
        status: 'pending',
      });

    if (insertError) {
      console.error('Error storing payment:', insertError);
      return {
        success: false,
        error: 'Failed to store payment record',
      };
    }

    // Update campaign with payment intent ID
    await supabase
      .from('campaigns')
      .update({
        payment_intent_id: paymentIntent.id,
        payment_status: 'pending',
      })
      .eq('id', campaignId);

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || undefined,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment intent',
    };
  }
}

/**
 * Handle successful payment (called from webhook)
 */
export async function handlePaymentSuccess(
  paymentIntentId: string
): Promise<PaymentConfirmationResult> {
  try {
    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from('campaign_payments')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (paymentError || !payment) {
      return {
        success: false,
        error: 'Payment record not found',
      };
    }

    // Verify payment intent status with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return {
        success: false,
        error: `Payment not succeeded. Status: ${paymentIntent.status}`,
      };
    }

    // Update payment record
    const { error: updateError } = await supabase
      .from('campaign_payments')
      .update({
        status: 'succeeded',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return {
        success: false,
        error: 'Failed to update payment record',
      };
    }

    // Update campaign status
    await supabase
      .from('campaigns')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        status: 'active', // Activate campaign when payment succeeds
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.campaign_id);

    // Create transaction record
    await supabase
      .from('payment_transactions')
      .insert({
        campaign_id: payment.campaign_id,
        business_id: payment.business_id,
        stripe_payment_intent_id: paymentIntentId,
        amount_cents: payment.amount_cents,
        platform_fee_cents: payment.platform_fee_cents,
        creator_amount_cents: payment.creator_payout_cents,
        transaction_type: 'payment',
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

    // Get campaign title for notification
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('title')
      .eq('id', payment.campaign_id)
      .single();

    // Send success notification to business
    if (campaign) {
      await notificationService.createPaymentSuccessNotification(
        payment.business_id,
        payment.campaign_id,
        campaign.title,
        payment.amount_cents
      );
    }

    return {
      success: true,
      paymentId: payment.id,
    };
  } catch (error) {
    console.error('Error handling payment success:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to handle payment success',
    };
  }
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
 */
export async function getCampaignPaymentStatus(campaignId: string) {
  const { data } = await supabase
    .from('campaign_payments')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data;
}
