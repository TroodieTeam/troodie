import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const { campaignId, businessId, amountCents } = body;

    // Validate required fields
    if (!campaignId || !businessId || !amountCents) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: campaignId, businessId, amountCents' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate amount
    if (amountCents <= 0 || !Number.isInteger(amountCents)) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount. Must be a positive integer in cents' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify user owns the business
    if (user.id !== businessId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: user does not own this business' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get campaign details
    console.log('[stripe-create-payment-intent] Fetching campaign:', campaignId);
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, restaurant_id, title, owner_id')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('[stripe-create-payment-intent] Campaign query error:', campaignError);
      return new Response(
        JSON.stringify({ error: `Campaign not found: ${campaignError?.message || 'Unknown error'}` }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[stripe-create-payment-intent] Campaign found:', {
      id: campaign.id,
      owner_id: campaign.owner_id,
      businessId,
    });

    // Verify campaign belongs to the business (using owner_id)
    if (campaign.owner_id !== businessId) {
      console.error('[stripe-create-payment-intent] Owner mismatch:', {
        campaignOwnerId: campaign.owner_id,
        businessId,
      });
      return new Response(
        JSON.stringify({ error: 'Unauthorized: campaign does not belong to this business' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Creators receive full payment amount (no platform fee)
    const creatorPayoutCents = amountCents;

    console.log('[stripe-create-payment-intent] Creating Stripe Payment Intent...', {
      campaignId,
      businessId,
      amountCents,
      amountDollars: (amountCents / 100).toFixed(2),
    });

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      metadata: {
        campaign_id: campaignId,
        business_id: businessId,
        restaurant_id: campaign.restaurant_id || '',
        creator_payout_cents: creatorPayoutCents.toString(),
      },
      description: `Campaign: ${campaign.title}`,
    });

    console.log('[stripe-create-payment-intent] ✅ Payment Intent created:', {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
    });

    // Store payment record
    console.log('[stripe-create-payment-intent] Storing payment record in database...');
    const { data: paymentRecord, error: insertError } = await supabase
      .from('campaign_payments')
      .insert({
        campaign_id: campaignId,
        business_id: businessId,
        restaurant_id: campaign.restaurant_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: amountCents,
        platform_fee_cents: 0, // No platform fee
        creator_payout_cents: creatorPayoutCents,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[stripe-create-payment-intent] ❌ Error storing payment record:', insertError);
      // Try to cancel the payment intent if we can't store the record
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id);
      } catch (cancelError) {
        console.error('Error canceling payment intent:', cancelError);
      }
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to store payment record' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[stripe-create-payment-intent] ✅ Payment record stored:', {
      paymentRecordId: paymentRecord.id,
      campaignId: paymentRecord.campaign_id,
      status: paymentRecord.status,
    });

    // Update campaign with payment intent ID
    console.log('[stripe-create-payment-intent] Updating campaign with payment_intent_id...');
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        payment_intent_id: paymentIntent.id,
        payment_status: 'pending',
      })
      .eq('id', campaignId);

    if (updateError) {
      console.error('[stripe-create-payment-intent] ⚠️ Error updating campaign (non-fatal):', updateError);
      // Don't fail the request, but log the error
    } else {
      console.log('[stripe-create-payment-intent] ✅ Campaign updated with payment_intent_id');
    }

    // Return success response
    console.log('[stripe-create-payment-intent] ✅ Payment intent creation complete');
    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment intent',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
