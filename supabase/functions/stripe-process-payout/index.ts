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
    // Parse request body
    const body = await req.json();
    const { deliverableId, creatorId, campaignId, amountCents, stripeAccountId } = body;

    // Validate required fields
    if (!deliverableId || !creatorId || !campaignId || !amountCents || !stripeAccountId) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required fields: deliverableId, creatorId, campaignId, amountCents, stripeAccountId' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate amount
    if (amountCents <= 0 || !Number.isInteger(amountCents)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid amount. Must be a positive integer in cents' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get campaign info for transaction record
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('business_id')
      .eq('id', campaignId)
      .single();

    // Create Stripe Transfer to creator
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: 'usd',
      destination: stripeAccountId,
      description: `Payout for deliverable ${deliverableId}`,
      metadata: {
        deliverable_id: deliverableId,
        creator_id: creatorId,
        campaign_id: campaignId,
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
      try {
        await stripe.transfers.createReversal(transfer.id, {
          amount: amountCents,
        });
      } catch (reversalError) {
        console.error('Error reversing transfer:', reversalError);
      }
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to update deliverable payment status' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        campaign_id: campaignId,
        deliverable_id: deliverableId,
        creator_id: creatorId,
        business_id: campaign?.business_id,
        stripe_transfer_id: transfer.id,
        amount_cents: amountCents,
        platform_fee_cents: 0, // Fee already deducted from campaign payment
        creator_amount_cents: amountCents,
        transaction_type: 'payout',
        status: 'processing',
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating transaction record:', transactionError);
      // Don't fail the request, but log the error
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        transferId: transfer.id,
        transactionId: transaction?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing payout:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payout',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
