import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'No signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer);
        break;

      case 'transfer.paid':
        await handleTransferPaid(event.data.object as Stripe.Transfer);
        break;

      case 'transfer.failed':
        await handleTransferFailed(event.data.object as Stripe.Transfer);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);

  // Update campaign payment status
  const { error: updateError } = await supabase
    .from('campaign_payments')
    .update({
      status: 'succeeded',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (updateError) {
    console.error('Error updating payment:', updateError);
    return;
  }

  // Update campaign status
  const campaignId = paymentIntent.metadata.campaign_id;
  const businessId = paymentIntent.metadata.business_id;
  
  if (campaignId) {
    await supabase
      .from('campaigns')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    // Create transaction record
    await supabase
      .from('payment_transactions')
      .insert({
        campaign_id: campaignId,
        business_id: businessId,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: paymentIntent.amount,
        platform_fee_cents: parseInt(paymentIntent.metadata.platform_fee_cents || '0'),
        creator_amount_cents: parseInt(paymentIntent.metadata.creator_payout_cents || '0'),
        transaction_type: 'payment',
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

    // Get campaign title for notification
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('title')
      .eq('id', campaignId)
      .single();

    // Send payment success notification to business
    if (campaign && businessId) {
      await supabase.rpc('create_notification', {
        p_user_id: businessId,
        p_type: 'system',
        p_title: 'Payment Successful',
        p_message: `Your payment of $${(paymentIntent.amount / 100).toFixed(2)} for "${campaign.title}" was successful. The campaign is now live!`,
        p_data: {
          campaignId,
          campaignTitle: campaign.title,
          amountCents: paymentIntent.amount,
          amountDollars: (paymentIntent.amount / 100).toFixed(2),
        },
        p_related_id: campaignId,
        p_related_type: 'campaign',
      });
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id);

  await supabase
    .from('campaign_payments')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  const campaignId = paymentIntent.metadata.campaign_id;
  const businessId = paymentIntent.metadata.business_id;
  
  if (campaignId) {
    await supabase
      .from('campaigns')
      .update({
        payment_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    // Get campaign title for notification
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('title')
      .eq('id', campaignId)
      .single();

    // Send payment failed notification to business
    if (campaign && businessId) {
      await supabase.rpc('create_notification', {
        p_user_id: businessId,
        p_type: 'system',
        p_title: 'Payment Failed',
        p_message: `Payment for "${campaign.title}" failed. Please update your payment method and try again.`,
        p_data: {
          campaignId,
          campaignTitle: campaign.title,
        },
        p_related_id: campaignId,
        p_related_type: 'campaign',
      });
    }
  }
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  console.log('Transfer created:', transfer.id);
  // Transfer created - status is already set to processing in payoutService
}

async function handleTransferPaid(transfer: Stripe.Transfer) {
  console.log('Transfer paid:', transfer.id);

  // Update deliverable payment status
  const { data: deliverable } = await supabase
    .from('campaign_deliverables')
    .select(`
      id,
      creator_id,
      campaign_id,
      payment_amount_cents,
      creator_profiles!inner(user_id)
    `)
    .eq('payment_transaction_id', transfer.id)
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
      const payoutAmount = deliverable.payment_amount_cents || transfer.amount;
      
      // Import notification service (using RPC call since we're in Edge Function)
      await supabase.rpc('create_notification', {
        p_user_id: deliverable.creator_profiles.user_id,
        p_type: 'system',
        p_title: 'Payment Received',
        p_message: `You received $${(payoutAmount / 100).toFixed(2)} for your work on "${campaign.title}"`,
        p_data: {
          deliverableId: deliverable.id,
          campaignId: deliverable.campaign_id,
          campaignTitle: campaign.title,
          amountCents: payoutAmount,
          amountDollars: (payoutAmount / 100).toFixed(2),
        },
        p_related_id: deliverable.id,
        p_related_type: 'deliverable',
      });
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
    .eq('stripe_transfer_id', transfer.id);
}

async function handleTransferFailed(transfer: Stripe.Transfer) {
  console.log('Transfer failed:', transfer.id);

  const { data: deliverable } = await supabase
    .from('campaign_deliverables')
    .select(`
      id,
      campaign_id,
      payment_retry_count,
      creator_profiles!inner(user_id)
    `)
    .eq('payment_transaction_id', transfer.id)
    .single();

  if (deliverable) {
    const retryCount = (deliverable.payment_retry_count || 0) + 1;
    const isFinalFailure = retryCount >= 3;

    await supabase
      .from('campaign_deliverables')
      .update({
        payment_status: isFinalFailure ? 'failed' : 'processing',
        payment_error: transfer.failure_message || 'Transfer failed',
        payment_retry_count: retryCount,
        last_payment_retry_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliverable.id);

    // Send failure notification if final failure
    if (isFinalFailure) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('title')
        .eq('id', deliverable.campaign_id)
        .single();

      if (campaign && deliverable.creator_profiles?.user_id) {
        await supabase.rpc('create_notification', {
          p_user_id: deliverable.creator_profiles.user_id,
          p_type: 'system',
          p_title: 'Payout Failed',
          p_message: `Payment for "${campaign.title}" failed. Our team has been notified and will resolve this shortly.`,
          p_data: {
            deliverableId: deliverable.id,
            campaignId: deliverable.campaign_id,
            campaignTitle: campaign.title,
            errorMessage: transfer.failure_message || 'Transfer failed',
          },
          p_related_id: deliverable.id,
          p_related_type: 'deliverable',
        });
      }
    }
  }

  // Update transaction record
  await supabase
    .from('payment_transactions')
    .update({
      status: 'failed',
      error_message: transfer.failure_message || 'Transfer failed',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_transfer_id', transfer.id);
}

async function handleAccountUpdated(account: Stripe.Account) {
  console.log('Account updated:', account.id);

  await supabase
    .from('stripe_accounts')
    .update({
      stripe_account_status: account.details_submitted ? 'enabled' : 'pending',
      onboarding_completed: account.details_submitted || false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_account_id', account.id);

  // Update creator_profiles or business_profiles based on metadata
  const accountType = account.metadata?.account_type;
  const userId = account.metadata?.user_id;

  if (userId && accountType) {
    if (accountType === 'creator') {
      await supabase
        .from('creator_profiles')
        .update({
          stripe_onboarding_completed: account.details_submitted || false,
        })
        .eq('user_id', userId);
    } else if (accountType === 'business') {
      await supabase
        .from('business_profiles')
        .update({
          stripe_onboarding_completed: account.details_submitted || false,
        })
        .eq('user_id', userId);
    }
  }
}
