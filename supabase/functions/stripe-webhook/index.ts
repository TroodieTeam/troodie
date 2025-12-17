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
  // Webhook endpoint - must be public (no auth required)
  // Stripe webhooks are authenticated via signature verification, not JWT
  console.log('[Webhook] Request received:', {
    method: req.method,
    hasStripeSignature: !!req.headers.get('stripe-signature'),
    userAgent: req.headers.get('user-agent'),
  });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('[Webhook] ❌ No Stripe signature header found');
      return new Response(JSON.stringify({ error: 'No signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      // Use constructEventAsync for Deno/Edge Functions (async context required)
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('[Webhook] ❌ Signature verification failed:', err);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Webhook] Processing webhook event: ${event.type}`, {
      eventId: event.id,
      eventType: event.type,
      created: event.created,
      livemode: event.livemode,
    });

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
  console.log('[Webhook] ✅ Payment succeeded:', {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    campaignId: paymentIntent.metadata.campaign_id,
    businessId: paymentIntent.metadata.business_id,
    status: paymentIntent.status,
  });

  // First, check if payment record exists
  console.log('[Webhook] Checking for existing payment record...');
  const { data: existingPayment, error: checkError } = await supabase
    .from('campaign_payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .maybeSingle();

  if (checkError) {
    console.error('[Webhook] ❌ Error checking for payment record:', checkError);
  }

  if (!existingPayment) {
    console.error('[Webhook] ❌ No payment record found for payment intent:', paymentIntent.id);
    console.log('[Webhook] Searching for any payment records with similar IDs...');
    // Try to find payment records for this campaign
    if (paymentIntent.metadata.campaign_id) {
      const { data: campaignPayments } = await supabase
        .from('campaign_payments')
        .select('id, stripe_payment_intent_id, campaign_id, status, created_at')
        .eq('campaign_id', paymentIntent.metadata.campaign_id)
        .order('created_at', { ascending: false })
        .limit(5);
      console.log('[Webhook] Recent payment records for campaign:', campaignPayments);
    }
    return;
  }

  console.log('[Webhook] Found payment record:', {
    id: existingPayment.id,
    campaignId: existingPayment.campaign_id,
    currentStatus: existingPayment.status,
    paymentIntentId: existingPayment.stripe_payment_intent_id,
  });

  // Update campaign payment status
  console.log('[Webhook] Updating campaign_payments table...');
  const { data: paymentRecord, error: updateError } = await supabase
    .from('campaign_payments')
    .update({
      status: 'succeeded',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .select('campaign_id')
    .single();

  if (updateError) {
    console.error('[Webhook] ❌ Error updating campaign_payments:', {
      error: updateError,
      code: updateError.code,
      message: updateError.message,
      details: updateError.details,
      hint: updateError.hint,
    });
    return;
  }

  console.log('[Webhook] ✅ Payment record updated:', paymentRecord);

  // Update campaign status
  const campaignId = paymentIntent.metadata.campaign_id || paymentRecord?.campaign_id;
  const businessId = paymentIntent.metadata.business_id;
  
  if (campaignId) {
    console.log('[Webhook] Activating campaign:', campaignId);
    const { error: campaignUpdateError } = await supabase
      .from('campaigns')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    if (campaignUpdateError) {
      console.error('[Webhook] ❌ Error updating campaign status:', campaignUpdateError);
    } else {
      console.log('[Webhook] ✅ Campaign activated:', campaignId);
    }

    // Create transaction record
    await supabase
      .from('payment_transactions')
      .insert({
        campaign_id: campaignId,
        business_id: businessId,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: paymentIntent.amount,
        platform_fee_cents: 0, // No platform fee - creators receive full amount
        creator_amount_cents: parseInt(paymentIntent.metadata.creator_payout_cents || paymentIntent.amount.toString()),
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
  console.log('[Webhook] Transfer created:', transfer.id);

  // Ensure payment_transactions record exists and is properly linked
  // This handles cases where the record might not have been created or needs updating
  const { data: existingTransaction } = await supabase
    .from('payment_transactions')
    .select('id, status, creator_id')
    .eq('stripe_transfer_id', transfer.id)
    .maybeSingle();

  if (!existingTransaction) {
    // Try to find deliverable by transfer ID in metadata
    const deliverableId = transfer.metadata?.deliverable_id;
    const creatorId = transfer.metadata?.creator_id;
    const campaignId = transfer.metadata?.campaign_id;

    if (deliverableId && creatorId && campaignId) {
      console.log('[Webhook] Creating missing payment_transactions record from transfer metadata');
      
      // Get campaign business_id
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('business_id')
        .eq('id', campaignId)
        .single();

      // Create the transaction record
      const { error: createError } = await supabase
        .from('payment_transactions')
        .insert({
          campaign_id: campaignId,
          deliverable_id: deliverableId,
          creator_id: creatorId,
          business_id: campaign?.business_id,
          stripe_transfer_id: transfer.id,
          amount_cents: transfer.amount,
          platform_fee_cents: 0,
          creator_amount_cents: transfer.amount,
          transaction_type: 'payout',
          status: 'processing',
        });

      if (createError) {
        console.error('[Webhook] ❌ Error creating payment_transactions record:', createError);
      } else {
        console.log('[Webhook] ✅ Created payment_transactions record for transfer:', transfer.id);
      }
    } else {
      console.warn('[Webhook] ⚠️ Transfer created but missing metadata (deliverable_id, creator_id, campaign_id)');
    }
  } else {
    // Ensure status is set to processing if it's not already
    if (existingTransaction.status !== 'processing' && existingTransaction.status !== 'completed') {
      await supabase
        .from('payment_transactions')
        .update({
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingTransaction.id);
      console.log('[Webhook] ✅ Updated payment_transactions status to processing');
    }
  }
}

async function handleTransferPaid(transfer: Stripe.Transfer) {
  console.log('[Webhook] Transfer paid:', transfer.id);

  // First, update the payment_transactions record
  const { data: transaction, error: transactionUpdateError } = await supabase
    .from('payment_transactions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_transfer_id', transfer.id)
    .select('deliverable_id, creator_id, campaign_id, creator_amount_cents')
    .single();

  if (transactionUpdateError) {
    console.error('[Webhook] ❌ Error updating payment_transactions:', transactionUpdateError);
  } else {
    console.log('[Webhook] ✅ Updated payment_transactions to completed:', transaction?.id);
  }

  // Update deliverable payment status
  // Try to find by payment_transaction_id first (most reliable)
  let deliverable = null;
  
  if (transaction?.deliverable_id) {
    // Use transaction's deliverable_id if available
    const { data } = await supabase
      .from('campaign_deliverables')
      .select(`
        id,
        creator_id,
        campaign_id,
        payment_amount_cents,
        creator_profiles!inner(user_id)
      `)
      .eq('id', transaction.deliverable_id)
      .single();
    deliverable = data;
  } else {
    // Fallback: find by payment_transaction_id field
    const { data } = await supabase
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
    deliverable = data;
  }

  if (deliverable) {
    await supabase
      .from('campaign_deliverables')
      .update({
        payment_status: 'completed',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliverable.id);

    console.log('[Webhook] ✅ Updated deliverable payment_status to completed:', deliverable.id);

    // Get campaign title for notification
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('title')
      .eq('id', deliverable.campaign_id)
      .single();

    // Send payout received notification
    if (campaign && deliverable.creator_profiles?.user_id) {
      const payoutAmount = deliverable.payment_amount_cents || transaction?.creator_amount_cents || transfer.amount;
      
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
      
      console.log('[Webhook] ✅ Sent payment received notification to creator');
    }
  } else {
    console.warn('[Webhook] ⚠️ Could not find deliverable for transfer:', transfer.id);
  }
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
  console.log('[Webhook] Account updated:', {
    accountId: account.id,
    detailsSubmitted: account.details_submitted,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    metadata: account.metadata,
  });

  // Update stripe_accounts table
  const { error: updateError } = await supabase
    .from('stripe_accounts')
    .update({
      stripe_account_status: account.details_submitted ? 'enabled' : 'pending',
      onboarding_completed: account.details_submitted || false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_account_id', account.id);

  if (updateError) {
    console.error('[Webhook] ❌ Error updating stripe_accounts:', updateError);
  } else {
    console.log('[Webhook] ✅ Updated stripe_accounts for account:', account.id);
  }

  // Update creator_profiles or business_profiles based on metadata
  const accountType = account.metadata?.account_type;
  const userId = account.metadata?.user_id;

  if (userId && accountType) {
    if (accountType === 'creator') {
      // Get creator profile ID first to check current state
      const { data: creatorProfileBefore } = await supabase
        .from('creator_profiles')
        .select('stripe_onboarding_completed')
        .eq('user_id', userId)
        .single();
      
      const wasCompleted = creatorProfileBefore?.stripe_onboarding_completed || false;
      
      const { error: creatorError } = await supabase
        .from('creator_profiles')
        .update({
          stripe_account_id: account.id,
          stripe_onboarding_completed: account.details_submitted || false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (creatorError) {
        console.error('[Webhook] ❌ Error updating creator_profiles:', creatorError);
      } else {
        console.log('[Webhook] ✅ Updated creator_profiles for user:', userId);
        
        // If onboarding just completed (wasn't completed before, but is now), retry payouts
        if (account.details_submitted && !wasCompleted) {
          console.log('[Webhook] Onboarding just completed - checking for pending payouts...');
          
          // Get creator profile ID
          const { data: creatorProfile } = await supabase
            .from('creator_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();
          
          if (creatorProfile) {
            // Find deliverables with pending_onboarding status
            const { data: pendingDeliverables } = await supabase
              .from('campaign_deliverables')
              .select('id, campaign_id')
              .eq('creator_id', creatorProfile.id)
              .eq('payment_status', 'pending_onboarding')
              .in('status', ['approved', 'auto_approved']);
            
            if (pendingDeliverables && pendingDeliverables.length > 0) {
              console.log(`[Webhook] Found ${pendingDeliverables.length} deliverables waiting for payout - triggering retry...`);
              
              // Trigger payout processing for each deliverable
              for (const deliverable of pendingDeliverables) {
                try {
                  const { data: payoutResult, error: payoutError } = await supabase.functions.invoke(
                    'stripe-process-payout',
                    {
                      body: {
                        deliverableId: deliverable.id,
                        creatorId: creatorProfile.id,
                        campaignId: deliverable.campaign_id,
                      },
                    }
                  );
                  
                  if (payoutError || !payoutResult?.success) {
                    console.error(`[Webhook] Failed to process payout for deliverable ${deliverable.id}:`, payoutError || payoutResult?.error);
                  } else {
                    console.log(`[Webhook] ✅ Payout triggered for deliverable ${deliverable.id}`);
                  }
                } catch (error) {
                  console.error(`[Webhook] Error triggering payout for deliverable ${deliverable.id}:`, error);
                }
              }
            } else {
              console.log('[Webhook] No pending deliverables found for payout retry');
            }
          }
        }
      }
    } else if (accountType === 'business') {
      const { error: businessError } = await supabase
        .from('business_profiles')
        .update({
          stripe_account_id: account.id,
          stripe_onboarding_completed: account.details_submitted || false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (businessError) {
        console.error('[Webhook] ❌ Error updating business_profiles:', businessError);
      } else {
        console.log('[Webhook] ✅ Updated business_profiles for user:', userId);
      }
    }
  } else {
    // Try to find user by stripe_account_id if metadata missing
    console.log('[Webhook] ⚠️ No metadata found, searching for user by stripe_account_id...');
    const { data: stripeAccount } = await supabase
      .from('stripe_accounts')
      .select('user_id, account_type')
      .eq('stripe_account_id', account.id)
      .single();

    if (stripeAccount) {
      const profileTable = stripeAccount.account_type === 'creator' ? 'creator_profiles' : 'business_profiles';
      
      // Check if onboarding was completed before update
      let wasCompleted = false;
      if (stripeAccount.account_type === 'creator') {
        const { data: profileBefore } = await supabase
          .from('creator_profiles')
          .select('stripe_onboarding_completed')
          .eq('user_id', stripeAccount.user_id)
          .single();
        wasCompleted = profileBefore?.stripe_onboarding_completed || false;
      }
      
      const { error: profileError } = await supabase
        .from(profileTable)
        .update({
          stripe_account_id: account.id,
          stripe_onboarding_completed: account.details_submitted || false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', stripeAccount.user_id);

      if (profileError) {
        console.error(`[Webhook] ❌ Error updating ${profileTable}:`, profileError);
      } else {
        console.log(`[Webhook] ✅ Updated ${profileTable} for user:`, stripeAccount.user_id);
        
        // If creator onboarding just completed, retry pending payouts
        if (stripeAccount.account_type === 'creator' && account.details_submitted && !wasCompleted) {
          console.log('[Webhook] Creator onboarding completed - checking for pending payouts...');
          
          const { data: creatorProfile } = await supabase
            .from('creator_profiles')
            .select('id')
            .eq('user_id', stripeAccount.user_id)
            .single();
          
          if (creatorProfile) {
            const { data: pendingDeliverables } = await supabase
              .from('campaign_deliverables')
              .select('id, campaign_id')
              .eq('creator_id', creatorProfile.id)
              .eq('payment_status', 'pending_onboarding')
              .in('status', ['approved', 'auto_approved']);
            
            if (pendingDeliverables && pendingDeliverables.length > 0) {
              console.log(`[Webhook] Found ${pendingDeliverables.length} deliverables - triggering payout retry...`);
              
              for (const deliverable of pendingDeliverables) {
                try {
                  const { data: payoutResult, error: payoutError } = await supabase.functions.invoke(
                    'stripe-process-payout',
                    {
                      body: {
                        deliverableId: deliverable.id,
                        creatorId: creatorProfile.id,
                        campaignId: deliverable.campaign_id,
                      },
                    }
                  );
                  
                  if (payoutError || !payoutResult?.success) {
                    console.error(`[Webhook] Payout retry failed for ${deliverable.id}:`, payoutError || payoutResult?.error);
                  } else {
                    console.log(`[Webhook] ✅ Payout retry triggered for ${deliverable.id}`);
                  }
                } catch (error) {
                  console.error(`[Webhook] Error retrying payout for ${deliverable.id}:`, error);
                }
              }
            }
          }
        }
      }
    }
  }
}
